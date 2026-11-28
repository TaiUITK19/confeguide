/**
 * Route tra cứu hồ sơ học thuật tự động & ánh xạ lĩnh vực (backend/routes/scholar.js)
 * - GET /api/scholar/status
 * - GET /api/scholar/candidates?name=...&email=...&orcid=...
 * - GET /api/scholar/profile?id=...
 * - GET /api/scholar/orcid?id=...
 * - POST /api/scholar/map-keywords
 */

'use strict';

const express = require('express');
const config = require('../config/env');
const {
  findCandidates,
  findProfileById,
  getOrcidProfile,
  loadSerpApiUsage,
  normalizeOrcidId,
  extractScholarIdFromInput
} = require('../services/scholar');
const { extractFieldsFromProfileSignals } = require('../services/fieldMap');
const { asyncHandler, redactSensitiveTokens } = require('../utils/errorHandler');

const router = express.Router();

const MAX_QUERY_NAME_LENGTH = 300;
const MAX_EMAIL_LENGTH = 254;
const MAX_ORCID_INPUT_LENGTH = 100;
const MAX_PROFILE_ID_LENGTH = 300;
const MAX_KEYWORDS_TEXT_LENGTH = 5000;
const MAX_BIO_LENGTH = 10000;
const MAX_AFFILIATION_LENGTH = 500;
const MAX_PAPER_TITLES = 20;
const MAX_PAPER_TITLE_LENGTH = 400;

/**
 * Chuẩn hóa tên nguồn dữ liệu hợp lệ.
 * @param {*} rawSource - Chuỗi nguồn thô.
 * @returns {'serpapi'|'orcid'|'semantic_scholar'|'confguide_saved'|'manual'} Nguồn hợp lệ.
 */
function normalizeSourceName(rawSource) {
  const low = String(rawSource || '').trim().toLowerCase();
  if (
    low === 'serpapi'
    || low === 'orcid'
    || low === 'semantic_scholar'
    || low === 'confguide_saved'
    || low === 'manual'
  ) {
    return low;
  }
  return 'manual';
}

/**
 * Hợp nhất kết quả đối chiếu từ `interests`, `biography`, `affiliation` và `paperTitles`.
 * @param {Object} profile - Hồ sơ ứng viên hoặc chi tiết tác giả.
 * @returns {{ matched: Array<Object>, unmatched: Array<string> }} Kết quả ánh xạ từ fieldMap.js.
 */
function mapProfileSignals(profile) {
  const safe = profile && typeof profile === 'object' ? profile : {};
  return extractFieldsFromProfileSignals({
    interests: Array.isArray(safe.interests) ? safe.interests : [],
    biography: safe.biography || '',
    affiliation: safe.affiliation || '',
    paperTitles: Array.isArray(safe.paperTitles) ? safe.paperTitles : []
  });
}

/**
 * Rút gọn bản ghi ứng viên / hồ sơ trả ra HTTP kèm ngữ cảnh tiểu sử & bài báo tác giả.
 * @param {Object} candidate - Dữ liệu ứng viên thô.
 * @param {string} fallbackSource - Nguồn dự phòng.
 * @returns {Object} Bản ghi sạch trả cho frontend.
 */
function formatCandidatePayload(candidate, fallbackSource) {
  const source = normalizeSourceName(candidate.source || fallbackSource);
  const rawBio = String(candidate.biography || '').trim();
  const bioPreview = rawBio.length > 260 ? `${rawBio.slice(0, 257)}...` : rawBio;
  const allPapers = Array.isArray(candidate.paperTitles) ? candidate.paperTitles : [];

  return {
    scholarId: candidate.scholarId || null,
    orcid: candidate.orcid || undefined,
    scholarUrl: candidate.scholarUrl || undefined,
    orcidUrl: candidate.orcidUrl || undefined,
    source,
    name: candidate.name,
    affiliation: candidate.affiliation || '',
    emailDomain: candidate.emailDomain || '',
    biography: bioPreview,
    interests: Array.isArray(candidate.interests) ? candidate.interests : [],
    paperTitles: allPapers.slice(0, 5),
    paperCount: Number(candidate.paperCount || allPapers.length || 0),
    mapped: mapProfileSignals(candidate)
  };
}

/**
 * Chuẩn hóa lỗi dịch vụ học thuật để giữ nguyên hợp đồng JSON của `/api/scholar/*` và tránh rò rỉ thông tin nhạy cảm.
 * @param {Error} err - Lỗi từ tầng service.
 * @param {string} defaultCode - Mã lỗi dự phòng.
 * @param {string} defaultMessage - Thông báo lỗi dự phòng.
 * @param {boolean} [includeCodeField=false] - Có kèm thuộc tính `code` ngoài `error` hay không.
 * @returns {Error} Lỗi đã gắn `statusCode`, `code`, `extra` cho middleware xử lý lỗi tập trung.
 */
function prepareScholarRouteError(err, defaultCode, defaultMessage, includeCodeField = false) {
  if (err && err.code === 'SCHOLAR_BLOCKED') {
    err.statusCode = 503;
    err.includeCodeField = true;
    err.extra = { source: 'manual' };
    return err;
  }

  const normalized = err instanceof Error ? err : new Error(defaultMessage);
  normalized.statusCode = (err && Number.isInteger(err.statusCode)) ? err.statusCode : 502;
  normalized.code = (err && err.code) || defaultCode;
  normalized.message = redactSensitiveTokens((err && err.message) || defaultMessage);
  normalized.expose = true;
  normalized.includeCodeField = includeCodeField;
  normalized.extra = { source: 'manual' };
  return normalized;
}

/**
 * GET /api/scholar/status
 */
router.get(
  '/status',
  asyncHandler(async (req, res) => {
    const serpapiUsage = await loadSerpApiUsage();
    return res.json({
      ok: true,
      serpapiConfigured: Boolean(config.serpapiApiKey),
      orcidAvailable: true,
      semanticScholarAvailable: true,
      serpapiUsage
    });
  })
);

/**
 * GET /api/scholar/candidates?name=...&email=...&orcid=...
 */
router.get(
  '/candidates',
  asyncHandler(async (req, res, next) => {
    const name = String(req.query.name || '').replace(/\s+/g, ' ').trim();
    const email = String(req.query.email || '').trim().toLowerCase();
    const orcidParam = String(req.query.orcid || '').trim();

    if (
      name.length > MAX_QUERY_NAME_LENGTH
      || email.length > MAX_EMAIL_LENGTH
      || orcidParam.length > MAX_ORCID_INPUT_LENGTH
    ) {
      return res.status(400).json({
        error: 'INVALID_QUERY',
        source: 'manual',
        message: `Tham số tìm kiếm vượt quá độ dài cho phép (name <= ${MAX_QUERY_NAME_LENGTH} ký tự).`
      });
    }

    const normalizedOrcid = normalizeOrcidId(orcidParam || name);
    const explicitScholarId = extractScholarIdFromInput(name);

    if (name.length < 2 && !normalizedOrcid && !email && !explicitScholarId) {
      return res.status(400).json({
        error: 'INVALID_QUERY',
        source: 'manual',
        message: 'Vui lòng truyền tham số name (tối thiểu 2 ký tự), link Google Scholar, email hoặc mã ORCID hợp lệ.'
      });
    }

    const allowFallback = req.query.fallback !== 'false';

    try {
      const result = await findCandidates(name, { allowFallback, orcid: orcidParam, email });
      const source = normalizeSourceName(result.source);
      const candidates = (result.candidates || [])
        .slice(0, 5)
        .map(candidate => formatCandidatePayload(candidate, source));

      return res.json({
        source,
        scholarBlocked: Boolean(result.scholarBlocked),
        query: name || normalizedOrcid || email,
        candidates,
        fallbackReason: result.fallbackReason || '',
        message: result.message || '',
        serpapiUsage: result.serpapiUsage || null,
        trace: Array.isArray(result.trace) ? result.trace : []
      });
    } catch (err) {
      return next(
        prepareScholarRouteError(err, 'SCHOLAR_ERROR', 'Không thể tra cứu hồ sơ học thuật lúc này.', true)
      );
    }
  })
);

/**
 * GET /api/scholar/orcid?id=<orcidId>
 */
router.get(
  '/orcid',
  asyncHandler(async (req, res, next) => {
    const rawId = String(req.query.id || '').trim();
    if (!rawId || rawId.length > MAX_ORCID_INPUT_LENGTH) {
      return res.status(400).json({
        error: 'MISSING_ORCID',
        source: 'orcid',
        message: 'Vui lòng nhập mã ORCID iD hợp lệ (ví dụ: 0000-0002-1825-0097).'
      });
    }

    try {
      const profile = await getOrcidProfile(rawId);
      if (!profile) {
        return res.status(404).json({
          error: 'ORCID_NOT_FOUND',
          source: 'manual',
          message: `Không tìm thấy hồ sơ ORCID công khai cho mã ${rawId}.`
        });
      }

      return res.json(formatCandidatePayload(profile, 'orcid'));
    } catch (err) {
      return next(
        prepareScholarRouteError(err, 'ORCID_ERROR', 'Không thể tra cứu ORCID Public API lúc này.', false)
      );
    }
  })
);

/**
 * GET /api/scholar/profile?id=<id>
 */
router.get(
  '/profile',
  asyncHandler(async (req, res, next) => {
    const id = String(req.query.id || '').trim();
    if (!id || id.length > MAX_PROFILE_ID_LENGTH) {
      return res.status(400).json({
        error: 'MISSING_SCHOLAR_ID',
        source: 'manual',
        message: 'Vui lòng truyền tham số id hợp lệ (scholarId, link Google Scholar hoặc ORCID).'
      });
    }

    const allowFallback = req.query.fallback !== 'false';

    try {
      const profile = await findProfileById(id, { allowFallback });
      const formatted = formatCandidatePayload(profile, profile.source);
      return res.json({
        ...formatted,
        serpapiUsage: await loadSerpApiUsage()
      });
    } catch (err) {
      return next(
        prepareScholarRouteError(err, 'SCHOLAR_PROFILE_ERROR', 'Không thể đọc chi tiết hồ sơ học thuật lúc này.', true)
      );
    }
  })
);

/**
 * POST /api/scholar/map-keywords
 */
router.post('/map-keywords', (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({
      error: 'INVALID_JSON_BODY',
      source: 'manual',
      message: 'Phần thân yêu cầu phải là đối tượng JSON hợp lệ.'
    });
  }

  const body = req.body;
  const rawKeywords = body.keywords !== undefined ? body.keywords : (body.interests || '');
  const rawBio = body.biography || body.description || body.profileText || '';
  if (typeof rawKeywords === 'string' && rawKeywords.trim().length > MAX_KEYWORDS_TEXT_LENGTH) {
    return res.status(400).json({
      error: 'INPUT_TOO_LONG',
      source: 'manual',
      message: `Chuỗi từ khóa vượt quá ${MAX_KEYWORDS_TEXT_LENGTH} ký tự.`
    });
  }
  if (Array.isArray(rawKeywords) && rawKeywords.length > 50) {
    return res.status(400).json({
      error: 'INPUT_TOO_LONG',
      source: 'manual',
      message: 'Mảng từ khóa không được vượt quá 50 phần tử.'
    });
  }
  if (typeof rawBio === 'string' && rawBio.trim().length > MAX_BIO_LENGTH) {
    return res.status(400).json({
      error: 'INPUT_TOO_LONG',
      source: 'manual',
      message: `Mô tả hồ sơ vượt quá ${MAX_BIO_LENGTH} ký tự.`
    });
  }
  if (typeof body.affiliation === 'string' && body.affiliation.trim().length > MAX_AFFILIATION_LENGTH) {
    return res.status(400).json({
      error: 'INPUT_TOO_LONG',
      source: 'manual',
      message: `Tên cơ quan công tác vượt quá ${MAX_AFFILIATION_LENGTH} ký tự.`
    });
  }
  if (Array.isArray(body.paperTitles) && body.paperTitles.length > 50) {
    return res.status(400).json({
      error: 'INPUT_TOO_LONG',
      source: 'manual',
      message: 'Danh sách tiêu đề bài báo gửi lên vượt quá giới hạn cho phép.'
    });
  }

  const biography = typeof rawBio === 'string' ? rawBio.trim() : '';
  const affiliation = typeof body.affiliation === 'string' ? body.affiliation.trim() : '';
  const paperTitles = Array.isArray(body.paperTitles)
    ? body.paperTitles
      .slice(0, MAX_PAPER_TITLES)
      .map(t => String(t || '').trim().slice(0, MAX_PAPER_TITLE_LENGTH))
      .filter(Boolean)
    : [];

  let keywordTokens = [];
  let extraProse = '';
  if (Array.isArray(rawKeywords)) {
    keywordTokens = rawKeywords
      .slice(0, 50)
      .map(item => String(item || '').trim().slice(0, 200))
      .filter(Boolean);
  } else if (typeof rawKeywords === 'string' && rawKeywords.trim()) {
    const cleanStr = rawKeywords.trim().slice(0, MAX_KEYWORDS_TEXT_LENGTH);
    const parts = cleanStr.split(/[,;\n\r|]+/).map(item => item.trim()).filter(Boolean);
    const wordCount = cleanStr.split(/\s+/).length;
    const looksLikeProse = parts.length <= 2 && wordCount >= 4;
    if (looksLikeProse && !biography) {
      return res.json({
        ok: true,
        source: 'manual',
        rawKeywords: [],
        mapped: extractFieldsFromProfileSignals({
          interests: parts,
          biography: cleanStr,
          affiliation,
          paperTitles
        })
      });
    }
    if (parts.some(p => p.split(/\s+/).length >= 4)) {
      extraProse = cleanStr;
    }
    keywordTokens = parts;
  }

  if (keywordTokens.length === 0 && !biography && !affiliation && paperTitles.length === 0) {
    return res.status(400).json({
      error: 'MISSING_KEYWORDS',
      source: 'manual',
      message: 'Vui lòng nhập từ khóa, mô tả hồ sơ hoặc tiêu đề bài báo để phân tích.'
    });
  }

  const uniqueTokens = [];
  const seen = new Set();
  for (const t of keywordTokens) {
    const low = t.toLowerCase();
    if (!seen.has(low)) {
      seen.add(low);
      uniqueTokens.push(t);
    }
  }

  const mapped = extractFieldsFromProfileSignals({
    interests: uniqueTokens.slice(0, 40),
    biography: biography || extraProse,
    affiliation,
    paperTitles
  });

  return res.json({
    ok: true,
    source: 'manual',
    rawKeywords: uniqueTokens.slice(0, 40),
    mapped
  });
});

module.exports = router;
