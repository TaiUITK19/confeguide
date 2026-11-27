/**
 * Route tra cứu hồ sơ học thuật tự động & ánh xạ lĩnh vực (backend/routes/scholar.js)
 * - GET /api/scholar/status: trạng thái SerpApi quota tháng, OpenAlex, ORCID & Semantic Scholar
 * - GET /api/scholar/candidates?name=...&email=...&orcid=...: tự tìm theo thứ tự
 *   SerpApi -> OpenAlex -> ORCID (tìm theo tên & email, đọc tiểu sử + keywords + bài báo) -> Semantic Scholar -> Manual
 * - GET /api/scholar/profile?id=...: đọc chi tiết hồ sơ (lĩnh vực, tiểu sử, bài báo là tác giả)
 * - GET /api/scholar/orcid?id=...: tra cứu trực tiếp ORCID Public API
 * - POST /api/scholar/map-keywords: phân tích từ khóa / tiểu sử / tiêu đề bài báo qua fieldMap.js (nguồn manual)
 */

'use strict';

const express = require('express');
const {
  findCandidates,
  findProfileById,
  getOrcidProfile,
  loadSerpApiUsage,
  normalizeOrcidId
} = require('../services/scholar');
const {
  mapResearchInterests,
  extractFieldsFromProfileSignals
} = require('../services/fieldMap');

const router = express.Router();

/**
 * Chuẩn hóa tên nguồn dữ liệu hợp lệ.
 * @param {*} rawSource - Chuỗi nguồn thô.
 * @returns {'serpapi'|'openalex'|'orcid'|'semantic_scholar'|'confguide_saved'|'manual'} Nguồn hợp lệ.
 */
function normalizeSourceName(rawSource) {
  const low = String(rawSource || '').trim().toLowerCase();
  if (
    low === 'serpapi'
    || low === 'openalex'
    || low === 'orcid'
    || low === 'semantic_scholar'
    || low === 'confguide_saved'
    || low === 'manual'
  ) {
    return low;
  }
  if (low === 'openalex_fallback') return 'openalex';
  return 'manual';
}

/**
 * Hợp nhất kết quả đối chiếu từ `interests` (hoặc `openAlexTopics`), `biography`, `affiliation` và `paperTitles`.
 * @param {Object} profile - Hồ sơ ứng viên hoặc chi tiết tác giả.
 * @returns {{ matched: Array<Object>, unmatched: Array<string> }} Kết quả ánh xạ từ fieldMap.js.
 */
function mapProfileSignals(profile) {
  const safe = profile && typeof profile === 'object' ? profile : {};
  const openAlexMapped = Array.isArray(safe.openAlexTopics) && safe.openAlexTopics.length > 0
    ? mapResearchInterests(safe.openAlexTopics)
    : null;
  const signalMapped = extractFieldsFromProfileSignals({
    interests: Array.isArray(safe.interests) ? safe.interests : [],
    biography: safe.biography || '',
    affiliation: safe.affiliation || '',
    paperTitles: Array.isArray(safe.paperTitles) ? safe.paperTitles : []
  });

  if (!openAlexMapped) return signalMapped;

  const mergedByKey = new Map();
  for (const item of openAlexMapped.matched) {
    mergedByKey.set(item.key, {
      ...item,
      matchedFrom: ['interests']
    });
  }
  for (const item of signalMapped.matched) {
    const existing = mergedByKey.get(item.key);
    if (!existing) {
      mergedByKey.set(item.key, item);
      continue;
    }
    const interests = [...new Set([...(existing.matchedInterests || []), ...(item.matchedInterests || [])])];
    const terms = [...new Set([...(existing.matchedTerms || []), ...(item.matchedTerms || [])])];
    const from = [...new Set([...(existing.matchedFrom || []), ...(item.matchedFrom || [])])];
    mergedByKey.set(item.key, {
      ...existing,
      matchedInterests: interests,
      matchedTerms: terms,
      matchedFrom: from
    });
  }

  return {
    matched: Array.from(mergedByKey.values()),
    unmatched: openAlexMapped.unmatched
  };
}

/**
 * Rút gọn bản ghi ứng viên / hồ sơ trả ra HTTP kèm đủ ngữ cảnh tiểu sử & bài báo tác giả.
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
    openAlexId: candidate.openAlexId || undefined,
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
 * GET /api/scholar/status
 * Trả về trạng thái cấu hình và bộ đếm lượt dùng SerpApi trong tháng (giới hạn dừng < 250).
 */
router.get('/status', async (req, res, next) => {
  try {
    const serpapiUsage = await loadSerpApiUsage();
    return res.json({
      ok: true,
      serpapiConfigured: Boolean(String(process.env.SERPAPI_API_KEY || '').trim()),
      openalexConfigured: Boolean(String(process.env.OPENALEX_API_KEY || '').trim()),
      orcidAvailable: true,
      semanticScholarAvailable: true,
      serpapiUsage
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/scholar/candidates?name=...&email=...&orcid=...
 * Thứ tự tự động: SerpApi -> OpenAlex -> ORCID (tìm theo tên & email) -> Semantic Scholar -> Manual.
 */
router.get('/candidates', async (req, res) => {
  const name = String(req.query.name || '').replace(/\s+/g, ' ').trim();
  const email = String(req.query.email || '').trim().toLowerCase();
  const orcidParam = String(req.query.orcid || '').trim();
  const normalizedOrcid = normalizeOrcidId(orcidParam || name);

  if (name.length < 2 && !normalizedOrcid && !email) {
    return res.status(400).json({
      error: 'INVALID_QUERY',
      source: 'manual',
      message: 'Vui lòng truyền tham số name (tối thiểu 2 ký tự), email hoặc mã ORCID hợp lệ.'
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
    if (err && err.code === 'SCHOLAR_BLOCKED') {
      return res.status(503).json({
        error: 'SCHOLAR_BLOCKED',
        code: 'SCHOLAR_BLOCKED',
        source: 'manual',
        message: err.message
      });
    }

    const statusCode = (err && Number.isInteger(err.statusCode)) ? err.statusCode : 502;
    return res.status(statusCode).json({
      error: (err && err.code) || 'SCHOLAR_ERROR',
      code: (err && err.code) || 'SCHOLAR_ERROR',
      source: 'manual',
      message: (err && err.message) || 'Không thể tra cứu hồ sơ học thuật lúc này.'
    });
  }
});

/**
 * GET /api/scholar/orcid?id=<orcidId>
 * Tra cứu trực tiếp hồ sơ ORCID công khai (lấy từ khóa, tiểu sử biography & tiêu đề bài báo works).
 */
router.get('/orcid', async (req, res) => {
  const rawId = String(req.query.id || '').trim();
  if (!rawId) {
    return res.status(400).json({
      error: 'MISSING_ORCID',
      source: 'orcid',
      message: 'Vui lòng nhập mã ORCID iD (ví dụ: 0000-0002-1825-0097).'
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
    const statusCode = (err && Number.isInteger(err.statusCode)) ? err.statusCode : 502;
    return res.status(statusCode).json({
      error: (err && err.code) || 'ORCID_ERROR',
      source: 'manual',
      message: (err && err.message) || 'Không thể tra cứu ORCID Public API lúc này.'
    });
  }
});

/**
 * GET /api/scholar/profile?id=<id>
 * Trả về chi tiết hồ sơ (lĩnh vực công khai, tiểu sử, bài báo là tác giả) và ánh xạ qua fieldMap.js.
 */
router.get('/profile', async (req, res) => {
  const id = String(req.query.id || '').trim();
  if (!id) {
    return res.status(400).json({
      error: 'MISSING_SCHOLAR_ID',
      source: 'manual',
      message: 'Vui lòng truyền tham số id (scholarId, OpenAlex ID hoặc ORCID).'
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
    if (err && err.code === 'SCHOLAR_BLOCKED') {
      return res.status(503).json({
        error: 'SCHOLAR_BLOCKED',
        code: 'SCHOLAR_BLOCKED',
        source: 'manual',
        message: err.message
      });
    }

    const statusCode = (err && Number.isInteger(err.statusCode)) ? err.statusCode : 502;
    return res.status(statusCode).json({
      error: (err && err.code) || 'SCHOLAR_PROFILE_ERROR',
      code: (err && err.code) || 'SCHOLAR_PROFILE_ERROR',
      source: 'manual',
      message: (err && err.message) || 'Không thể đọc chi tiết hồ sơ học thuật lúc này.'
    });
  }
});

/**
 * POST /api/scholar/map-keywords
 * Body: { keywords?: string | string[], biography?: string, paperTitles?: string[] }
 * Phân tích đồng thời từ khóa, tiểu sử hoặc danh sách tiêu đề bài báo qua fieldMap.js (nguồn manual).
 */
router.post('/map-keywords', (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const rawKeywords = body.keywords !== undefined ? body.keywords : (body.interests || '');
  const biography = typeof body.biography === 'string' ? body.biography.trim() : '';
  const paperTitles = Array.isArray(body.paperTitles)
    ? body.paperTitles.map(t => String(t || '').trim()).filter(Boolean).slice(0, 20)
    : [];

  let keywordTokens = [];
  if (Array.isArray(rawKeywords)) {
    keywordTokens = rawKeywords.map(item => String(item || '').trim()).filter(Boolean);
  } else if (typeof rawKeywords === 'string' && rawKeywords.trim()) {
    // Nếu người dùng dán đoạn văn dài (tiểu sử / tóm tắt bài báo) chưa ngăn cách bằng dấu phẩy, xử lý như prose
    const cleanStr = rawKeywords.trim();
    const parts = cleanStr.split(/[,;\n\r|]+/).map(item => item.trim()).filter(Boolean);
    const looksLikeSentence = parts.length <= 2 && cleanStr.split(/\s+/).length >= 8;
    if (looksLikeSentence && !biography) {
      return res.json({
        ok: true,
        source: 'manual',
        rawKeywords: [],
        mapped: extractFieldsFromProfileSignals({
          interests: [],
          biography: cleanStr,
          paperTitles
        })
      });
    }
    keywordTokens = parts;
  }

  if (keywordTokens.length === 0 && !biography && paperTitles.length === 0) {
    return res.status(400).json({
      error: 'MISSING_KEYWORDS',
      source: 'manual',
      message: 'Vui lòng nhập từ khóa, đoạn tiểu sử hoặc tiêu đề bài báo để phân tích.'
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
    biography,
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
