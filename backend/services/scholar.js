/**
 * Dịch vụ tra cứu hồ sơ nghiên cứu đa tầng cho ConfGuide (backend/services/scholar.js)
 * Thứ tự tự động:
 * 1) SerpApi Google Scholar (`SERPAPI_API_KEY`): tìm ứng viên theo tên & lấy hồ sơ theo `scholarId`,
 *    cache 24 giờ + gộp request trùng đang chạy, đếm lượt gọi trong tháng và tự dừng trước ngưỡng 250 lượt.
 * 2) Dự phòng ORCID Public API (backend/services/orcid.js).
 * 3) Dự phòng Semantic Scholar Graph API (backend/services/semanticScholar.js).
 */

'use strict';

const path = require('node:path');
const config = require('../config/env');
const { MemoryCache } = require('../utils/cache');
const { createJsonFileStore } = require('../utils/jsonStore');
const { fetchWithTimeout, safeReadJson } = require('../utils/http');
const { AppError, ScholarBlockedError } = require('../utils/errorHandler');
const {
  normalizeOrcidId,
  getOrcidProfile,
  searchOrcidByNameAndEmail
} = require('./orcid');
const { searchSemanticScholarFallback } = require('./semanticScholar');

/* ================= 1. HẰNG SỐ MẠNG, CACHE 24H & GIỚI HẠN SERPAPI ================= */

const SERPAPI_BASE_URL = 'https://serpapi.com/search.json';
const SCHOLAR_BASE_URL = 'https://scholar.google.com/citations';

const REQUEST_TIMEOUT_MS = 10 * 1000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CANDIDATES = 5;

const SERPAPI_MONTHLY_LIMIT = config.serpapiMonthlyLimit;
const SERPAPI_SAFE_STOP_LIMIT = config.serpapiStopAt;

const SCHOLAR_ID_REGEX = /^[a-zA-Z0-9_-]{4,40}$/;

/** Bộ nhớ đệm dùng chung cho SerpApi, ORCID và Semantic Scholar (TTL 24h, tối đa 500 mục) */
const scholarCache = new MemoryCache({ ttlMs: CACHE_TTL_MS, maxEntries: 500 });

/* ================= 2. ĐẾM QUOTA SERPAPI THEO THÁNG ================= */

/**
 * Lấy mã tháng hiện tại theo UTC dạng `YYYY-MM`.
 * @returns {string} Chuỗi YYYY-MM.
 */
function getCurrentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

const serpapiUsageStore = createJsonFileStore({
  localFilePath: path.join(config.backendDataDir, 'serpapi-usage.json'),
  vercelTempFileName: 'confguide-serpapi-usage.json',
  isVercel: config.isVercel,
  createInitialValue: () => ({
    month: getCurrentMonthKey(),
    count: 0,
    updatedAt: new Date().toISOString()
  }),
  sanitizeLoaded: raw => {
    const currentMonth = getCurrentMonthKey();
    if (raw && raw.month === currentMonth && Number.isFinite(Number(raw.count))) {
      return {
        month: currentMonth,
        count: Math.max(0, Math.floor(Number(raw.count))),
        updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : ''
      };
    }
    return {
      month: currentMonth,
      count: 0,
      updatedAt: new Date().toISOString()
    };
  }
});

/**
 * Định dạng đối tượng thống kê quota SerpApi nhất quán.
 * @param {string} month - Chuỗi tháng YYYY-MM.
 * @param {number} count - Số lượt đã dùng trong tháng.
 * @param {string} updatedAt - Thời điểm cập nhật ISO.
 */
function formatUsagePayload(month, count, updatedAt) {
  const stopAt = SERPAPI_SAFE_STOP_LIMIT;
  return {
    month,
    count,
    limit: SERPAPI_MONTHLY_LIMIT,
    stopAt,
    remainingBeforeStop: Math.max(0, stopAt - count),
    stopped: count >= stopAt,
    updatedAt: updatedAt || ''
  };
}

/**
 * Đọc trạng thái sử dụng SerpApi trong tháng (tự reset sang 0 khi qua tháng mới).
 * @returns {Promise<{ month: string, count: number, limit: number, stopAt: number, remainingBeforeStop: number, stopped: boolean, updatedAt: string }>}
 */
async function loadSerpApiUsage() {
  const currentMonth = getCurrentMonthKey();
  let state = await serpapiUsageStore.load();

  if (!state || state.month !== currentMonth) {
    state = {
      month: currentMonth,
      count: 0,
      updatedAt: new Date().toISOString()
    };
    serpapiUsageStore.setCached(state);
  }

  return formatUsagePayload(currentMonth, state.count, state.updatedAt);
}

/**
 * Tuần tự hóa việc kiểm tra ngưỡng 250 lượt và cấp phát 1 lượt gọi SerpApi.
 * Đảm bảo hai request đồng thời không vượt quá ngưỡng an toàn.
 * @returns {Promise<{ allowed: boolean, usage: Object }>}
 */
function reserveSerpApiCallSlot() {
  return serpapiUsageStore.update(
    state => {
      const currentMonth = getCurrentMonthKey();
      const baseCount = state && state.month === currentMonth ? state.count : 0;
      if (baseCount >= SERPAPI_SAFE_STOP_LIMIT) {
        return {
          skipSave: true,
          value: {
            allowed: false,
            usage: formatUsagePayload(currentMonth, baseCount, state && state.updatedAt)
          }
        };
      }
      const nextState = {
        month: currentMonth,
        count: baseCount + 1,
        updatedAt: new Date().toISOString()
      };
      return {
        nextValue: nextState,
        returnValue: {
          allowed: true,
          usage: formatUsagePayload(currentMonth, nextState.count, nextState.updatedAt)
        }
      };
    },
    { ignoreWriteErrors: true }
  );
}

/* ================= 3. TIỆN ÍCH TRÍCH XUẤT ID & DOMAIN GOOGLE SCHOLAR ================= */

/**
 * Tách `scholarId` từ URL hồ sơ Google Scholar (`?user=...`).
 * @param {*} href - Liên kết hoặc chuỗi truy vấn chứa tham số `user`.
 * @returns {string} Mã `scholarId` hợp lệ hoặc chuỗi rỗng.
 */
function extractScholarIdFromHref(href) {
  if (!href) return '';
  try {
    const parsed = new URL(href, 'https://scholar.google.com');
    const id = String(parsed.searchParams.get('user') || '').trim();
    return SCHOLAR_ID_REGEX.test(id) ? id : '';
  } catch {
    const match = String(href).match(/[?&]user=([a-zA-Z0-9_-]+)/);
    return match && SCHOLAR_ID_REGEX.test(match[1]) ? match[1] : '';
  }
}

/**
 * Tách `scholarId` nếu người dùng dán URL Google Scholar (`scholar.google.com/citations?user=...`).
 * @param {*} rawInput - Chuỗi nhập hoặc URL Google Scholar.
 * @returns {string} Mã `scholarId` hợp lệ hoặc chuỗi rỗng.
 */
function extractScholarIdFromInput(rawInput) {
  const clean = String(rawInput || '').trim();
  if (!clean) return '';
  if (/scholar\.google\.com/i.test(clean) || /[?&]user=/.test(clean)) {
    return extractScholarIdFromHref(clean);
  }
  return '';
}

/**
 * Rút gọn tên miền email xác minh từ chuỗi hiển thị trên hồ sơ Google Scholar.
 * @param {*} rawEmailText - Chuỗi email thô từ SerpApi.
 * @returns {string} Tên miền chữ thường hoặc chuỗi đã làm sạch.
 */
function parseVerifiedEmailDomain(rawEmailText) {
  const clean = String(rawEmailText || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const atMatch = clean.match(/(?:at|tại)\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  if (atMatch) return atMatch[1].toLowerCase();
  const domainMatch = clean.match(/\b([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+)\b/);
  return domainMatch ? domainMatch[1].toLowerCase() : clean;
}

/* ================= 4. PHƯƠNG ÁN 1: SERPAPI GOOGLE SCHOLAR ================= */

/**
 * Chuẩn hóa danh sách chuỗi `interests` từ JSON của SerpApi.
 * @param {Array<Object|string>} rawInterests - Mảng interests từ SerpApi.
 * @returns {Array<string>} Danh sách tên lĩnh vực đã khử trùng.
 */
function normalizeSerpApiInterests(rawInterests) {
  const list = Array.isArray(rawInterests) ? rawInterests : [];
  const out = [];
  const seen = new Set();

  for (const item of list) {
    const text = String((item && typeof item === 'object' ? item.title || item.name : item) || '').trim();
    if (text && !seen.has(text.toLowerCase())) {
      seen.add(text.toLowerCase());
      out.push(text);
    }
  }
  return out;
}

/**
 * Gọi API JSON SerpApi (đã qua kiểm tra quota tháng) với timeout 10 giây bằng AbortController.
 * @param {Record<string, string>} params - Tham số truy vấn SerpApi.
 * @param {string} apiKey - SERPAPI_API_KEY.
 * @returns {Promise<Object>} Đối tượng JSON từ SerpApi.
 */
async function fetchSerpApiJson(params, apiKey) {
  const reservation = await reserveSerpApiCallSlot();
  if (!reservation.allowed) {
    throw new AppError(
      `SerpApi đã đạt ngưỡng an toàn ${reservation.usage.count}/${reservation.usage.limit} lượt trong tháng ${reservation.usage.month}, tạm dừng gọi để không vượt hạn mức.`,
      { statusCode: 429, code: 'SERPAPI_QUOTA_STOPPED' }
    );
  }

  const query = new URLSearchParams({
    ...params,
    api_key: apiKey
  });

  let response;
  try {
    response = await fetchWithTimeout(`${SERPAPI_BASE_URL}?${query.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      timeoutMs: REQUEST_TIMEOUT_MS
    });
  } catch (err) {
    if (err && (err.name === 'TimeoutError' || err.name === 'AbortError' || err.code === 'REQUEST_TIMEOUT')) {
      throw new AppError('Quá thời gian kết nối tới SerpApi (10 giây).', {
        statusCode: 504,
        code: 'SERPAPI_TIMEOUT'
      });
    }
    throw new AppError('Không thể kết nối tới SerpApi.', {
      statusCode: 502,
      code: 'SERPAPI_NETWORK_ERROR'
    });
  }

  const data = await safeReadJson(response, {});
  const apiErrMsg = data && typeof data.error === 'string' ? data.error.trim() : '';
  if (apiErrMsg && /haven't returned any results|hasn't returned any results|no results/i.test(apiErrMsg)) {
    return { profiles: [], noResults: true };
  }

  if (!response.ok || apiErrMsg) {
    const isQuotaExceeded = response.status === 429 || /run out of searches|quota|limit/i.test(apiErrMsg);
    throw new AppError(apiErrMsg || `SerpApi trả về mã HTTP ${response.status}.`, {
      statusCode: response.status >= 400 ? response.status : 502,
      code: isQuotaExceeded ? 'SERPAPI_QUOTA_EXCEEDED' : 'SERPAPI_ERROR'
    });
  }

  return data;
}

/**
 * Tìm tối đa 5 ứng viên Google Scholar theo tên qua SerpApi (`engine=google_scholar_profiles`), cache 24h + gộp request trùng.
 * @param {string} rawName - Tên tác giả cần tìm.
 * @returns {Promise<Array<Object>|null>} Danh sách ứng viên (hoặc null nếu chưa cấu hình SERPAPI_API_KEY).
 */
async function searchCandidatesViaSerpApi(rawName) {
  const apiKey = config.serpapiApiKey;
  if (!apiKey) return null;

  const cleanName = String(rawName || '').replace(/\s+/g, ' ').trim();
  if (!cleanName) return [];

  const cacheKey = `serpapi:candidates:${cleanName.toLowerCase()}`;
  return scholarCache.getOrFetch(cacheKey, async () => {
    const data = await fetchSerpApiJson(
      {
        engine: 'google_scholar_profiles',
        mauthors: cleanName,
        hl: 'en'
      },
      apiKey
    );

    const rawProfiles = Array.isArray(data.profiles) ? data.profiles : [];
    const candidates = [];
    const seenIds = new Set();

    for (const profile of rawProfiles) {
      if (candidates.length >= MAX_CANDIDATES) break;
      if (!profile || !profile.name) continue;
      const scholarId = String(profile.author_id || '').trim() || extractScholarIdFromHref(profile.link || '');
      if (!scholarId || seenIds.has(scholarId)) continue;
      seenIds.add(scholarId);

      candidates.push({
        scholarId,
        name: String(profile.name).trim(),
        affiliation: String(profile.affiliations || '').trim(),
        emailDomain: parseVerifiedEmailDomain(profile.email || ''),
        interests: normalizeSerpApiInterests(profile.interests),
        scholarUrl: String(profile.link || '').trim()
          || `${SCHOLAR_BASE_URL}?user=${encodeURIComponent(scholarId)}&hl=en`,
        citedByCount: Number(profile.cited_by || 0) || 0,
        source: 'serpapi'
      });
    }

    return candidates;
  });
}

/**
 * Lấy chi tiết hồ sơ Google Scholar theo `scholarId` qua SerpApi (`engine=google_scholar_author`), cache 24h + gộp request trùng.
 * @param {string} rawScholarId - Mã user Google Scholar.
 * @returns {Promise<Object|null>} Hồ sơ tác giả hoặc null nếu chưa có SERPAPI_API_KEY.
 */
async function getProfileViaSerpApi(rawScholarId) {
  const apiKey = config.serpapiApiKey;
  if (!apiKey) return null;

  const scholarId = String(rawScholarId || '').trim();
  if (!SCHOLAR_ID_REGEX.test(scholarId)) {
    throw new AppError('Mã scholarId không hợp lệ.', {
      statusCode: 400,
      code: 'INVALID_SCHOLAR_ID'
    });
  }

  const cacheKey = `serpapi:profile:${scholarId}`;
  return scholarCache.getOrFetch(cacheKey, async () => {
    const data = await fetchSerpApiJson(
      {
        engine: 'google_scholar_author',
        author_id: scholarId,
        hl: 'en'
      },
      apiKey
    );

    const author = data && data.author && typeof data.author === 'object' ? data.author : null;
    if (!author || !author.name) {
      throw new AppError('Không tìm thấy hồ sơ Google Scholar với mã tác giả này trên SerpApi.', {
        statusCode: 404,
        code: 'SCHOLAR_PROFILE_NOT_FOUND'
      });
    }

    const paperTitles = (Array.isArray(data.articles) ? data.articles : [])
      .slice(0, 15)
      .map(article => String((article && article.title) || '').replace(/\s+/g, ' ').trim())
      .filter(Boolean);

    return {
      scholarId,
      name: String(author.name).trim(),
      affiliation: String(author.affiliations || '').trim(),
      emailDomain: parseVerifiedEmailDomain(author.email || ''),
      biography: '',
      interests: normalizeSerpApiInterests(author.interests),
      paperTitles,
      scholarUrl: `${SCHOLAR_BASE_URL}?user=${encodeURIComponent(scholarId)}&hl=en`,
      source: 'serpapi'
    };
  });
}

/* ================= 5. ĐIỀU PHỐI TỰ ĐỘNG ĐA TẦNG ================= */

/**
 * Tìm ứng viên tự động sau khi đăng nhập Google theo thứ tự:
 * 1) SerpApi Google Scholar
 * 2) ORCID Public API
 * 3) Semantic Scholar Graph API
 * 4) Manual fallback
 * @param {string} name - Tên tác giả, link Google Scholar hoặc ORCID iD.
 * @param {{ orcid?: string, email?: string, allowFallback?: boolean }} [options={}]
 * @returns {Promise<Object>} Kết quả danh sách ứng viên kèm trace và trạng thái quota SerpApi.
 */
async function findCandidates(name, options = {}) {
  const allowFallback = options.allowFallback !== false;
  const cleanName = String(name || '').replace(/\s+/g, ' ').trim();
  const cleanEmail = String(options.email || '').trim().toLowerCase();
  const explicitOrcid = normalizeOrcidId(options.orcid || cleanName);
  const explicitScholarId = extractScholarIdFromInput(cleanName);
  const trace = [];
  let serpapiUsage = await loadSerpApiUsage();

  // Trường hợp 1: người dùng nhập trực tiếp ORCID iD -> tra thẳng ORCID Public API
  if (options.orcid && explicitOrcid) {
    try {
      const orcidProfile = await getOrcidProfile(explicitOrcid, scholarCache);
      if (orcidProfile) {
        trace.push({ step: 'orcid', status: 'ok', count: 1 });
        return {
          source: 'orcid',
          scholarBlocked: false,
          candidates: [orcidProfile],
          serpapiUsage,
          trace,
          fallbackReason: '',
          message: ''
        };
      }
      trace.push({ step: 'orcid', status: 'empty', message: `Không tìm thấy hồ sơ ORCID công khai ${explicitOrcid}.` });
    } catch (err) {
      trace.push({ step: 'orcid', status: 'error', code: err.code || 'ORCID_ERROR', message: err.message });
    }
    return {
      source: 'manual',
      scholarBlocked: false,
      candidates: [],
      serpapiUsage,
      trace,
      fallbackReason: 'orcid-not-found',
      message: `Không tìm thấy thông tin trên ORCID cho mã ${explicitOrcid}. Bạn có thể dán mô tả hồ sơ hoặc chọn thủ công.`
    };
  }

  // Trường hợp 2: người dùng dán link hồ sơ Google Scholar trực tiếp (?user=...)
  if (explicitScholarId) {
    const hasSerpKey = Boolean(config.serpapiApiKey);
    if (hasSerpKey) {
      try {
        const directProfile = await getProfileViaSerpApi(explicitScholarId);
        serpapiUsage = await loadSerpApiUsage();
        if (directProfile) {
          trace.push({ step: 'serpapi', status: 'ok', count: 1 });
          return {
            source: 'serpapi',
            scholarBlocked: false,
            candidates: [directProfile],
            serpapiUsage,
            trace,
            fallbackReason: '',
            message: ''
          };
        }
      } catch (err) {
        serpapiUsage = await loadSerpApiUsage();
        const errCode = (err && err.code) || 'SERPAPI_ERROR';
        trace.push({ step: 'serpapi', status: 'error', code: errCode, message: err.message });
      }
    } else {
      trace.push({ step: 'serpapi', status: 'skipped', reason: 'MISSING_SERPAPI_KEY' });
    }
    return {
      source: 'manual',
      scholarBlocked: !hasSerpKey,
      candidates: [],
      serpapiUsage,
      trace,
      fallbackReason: !hasSerpKey ? 'serpapi-not-configured' : 'scholar-link-not-resolved',
      message: !hasSerpKey
        ? 'Máy chủ chưa cấu hình SERPAPI_API_KEY và Google Scholar chặn cào trực tiếp (CAPTCHA/429). Bạn có thể dán nhanh mô tả/chuyên ngành từ hồ sơ để AI tự chọn lĩnh vực.'
        : `Không đọc được hồ sơ Google Scholar cho mã ${explicitScholarId}. Bạn có thể dán nhanh mô tả/chuyên ngành để AI tự chọn lĩnh vực.`
    };
  }

  // Tầng 1: SerpApi Google Scholar
  const serpKey = config.serpapiApiKey;
  let serpFailedReason = '';
  if (!serpKey) {
    trace.push({ step: 'serpapi', status: 'skipped', reason: 'MISSING_SERPAPI_KEY' });
    serpFailedReason = 'serpapi-not-configured';
  } else {
    try {
      const serpCandidates = await searchCandidatesViaSerpApi(cleanName);
      serpapiUsage = await loadSerpApiUsage();
      if (Array.isArray(serpCandidates) && serpCandidates.length > 0) {
        trace.push({ step: 'serpapi', status: 'ok', count: serpCandidates.length });
        return {
          source: 'serpapi',
          scholarBlocked: false,
          candidates: serpCandidates,
          serpapiUsage,
          trace,
          fallbackReason: '',
          message: ''
        };
      }
      trace.push({ step: 'serpapi', status: 'empty', count: 0 });
      serpFailedReason = 'author-not-found';
    } catch (err) {
      serpapiUsage = await loadSerpApiUsage();
      const errCode = (err && err.code) || 'SERPAPI_ERROR';
      trace.push({ step: 'serpapi', status: 'error', code: errCode, message: err.message });
      serpFailedReason = (errCode === 'SERPAPI_QUOTA_STOPPED' || errCode === 'SERPAPI_QUOTA_EXCEEDED')
        ? 'serpapi-quota'
        : 'serpapi-error';
    }
  }

  if (!allowFallback) {
    return {
      source: 'manual',
      scholarBlocked: serpFailedReason === 'serpapi-quota',
      candidates: [],
      serpapiUsage,
      trace,
      fallbackReason: serpFailedReason || 'author-not-found',
      message: 'Không có hồ sơ từ SerpApi Google Scholar.'
    };
  }

  // Tầng 2: ORCID Public API
  if (explicitOrcid) {
    try {
      const orcidProfile = await getOrcidProfile(explicitOrcid, scholarCache);
      if (orcidProfile) {
        trace.push({ step: 'orcid', status: 'ok', count: 1 });
        return {
          source: 'orcid',
          scholarBlocked: false,
          candidates: [orcidProfile],
          serpapiUsage,
          trace,
          fallbackReason: serpFailedReason,
          message: ''
        };
      }
      trace.push({ step: 'orcid', status: 'empty', count: 0 });
    } catch (err) {
      trace.push({ step: 'orcid', status: 'error', code: err.code || 'ORCID_ERROR', message: err.message });
    }
  } else {
    try {
      const orcidByName = await searchOrcidByNameAndEmail(cleanName, cleanEmail, scholarCache);
      if (Array.isArray(orcidByName) && orcidByName.length > 0) {
        trace.push({ step: 'orcid', status: 'ok', count: orcidByName.length });
        return {
          source: 'orcid',
          scholarBlocked: false,
          candidates: orcidByName,
          serpapiUsage,
          trace,
          fallbackReason: serpFailedReason,
          message: ''
        };
      }
      trace.push({ step: 'orcid', status: 'empty', count: 0 });
    } catch (err) {
      trace.push({ step: 'orcid', status: 'error', code: err.code || 'ORCID_ERROR', message: err.message });
    }
  }

  // Tầng 3: Semantic Scholar Graph API
  try {
    const s2Candidates = await searchSemanticScholarFallback(cleanName, scholarCache);
    if (Array.isArray(s2Candidates) && s2Candidates.length > 0) {
      trace.push({ step: 'semantic_scholar', status: 'ok', count: s2Candidates.length });
      return {
        source: 'semantic_scholar',
        scholarBlocked: false,
        candidates: s2Candidates,
        serpapiUsage,
        trace,
        fallbackReason: serpFailedReason,
        message: ''
      };
    }
    trace.push({ step: 'semantic_scholar', status: 'empty', count: 0 });
  } catch (err) {
    trace.push({ step: 'semantic_scholar', status: 'error', code: err.code || 'S2_ERROR', message: err.message });
  }

  // Tầng 4: Manual fallback
  let reasonMessage = `Chưa tìm thấy hồ sơ tác giả công khai nào khớp với "${cleanName || cleanEmail}" trên Google Scholar, ORCID hoặc Semantic Scholar.`;
  if (serpFailedReason === 'serpapi-quota') {
    reasonMessage = `SerpApi đã chạm ngưỡng an toàn (${serpapiUsage.count}/${serpapiUsage.limit} lượt tháng ${serpapiUsage.month}) và không tìm thấy hồ sơ trên ORCID / Semantic Scholar.`;
  } else if (!serpKey) {
    reasonMessage = `Đã tự động dò trên ORCID và Semantic Scholar theo "${cleanName || cleanEmail}" nhưng chưa có hồ sơ công khai khớp (máy chủ chưa cấu hình SERPAPI_API_KEY để quét trực tiếp Google Scholar).`;
  }

  return {
    source: 'manual',
    scholarBlocked: serpFailedReason === 'serpapi-quota',
    candidates: [],
    serpapiUsage,
    trace,
    fallbackReason: serpFailedReason || 'no-data',
    message: reasonMessage
  };
}

/**
 * Lấy chi tiết hồ sơ theo ID (hỗ trợ ORCID `0000-...`, Google Scholar `scholarId` hoặc link Scholar).
 * @param {string} id - Mã định danh ứng viên hoặc link Google Scholar.
 * @param {{ allowFallback?: boolean }} [options={}]
 * @returns {Promise<Object>} Hồ sơ chuẩn hóa kèm `source` (`serpapi` | `orcid`).
 */
async function findProfileById(id, options = {}) {
  const allowFallback = options.allowFallback !== false;
  const rawInput = String(id || '').trim();
  const parsedScholar = extractScholarIdFromInput(rawInput);
  const cleanId = parsedScholar || rawInput;

  const orcid = normalizeOrcidId(cleanId);
  if (orcid && allowFallback) {
    const orcidProfile = await getOrcidProfile(orcid, scholarCache);
    if (orcidProfile) return orcidProfile;
    throw new AppError(`Không tìm thấy hồ sơ ORCID công khai (${orcid}).`, {
      statusCode: 404,
      code: 'ORCID_NOT_FOUND'
    });
  }

  const serpProfile = await getProfileViaSerpApi(cleanId);
  if (serpProfile) return serpProfile;

  // Khi chưa cấu hình SERPAPI_API_KEY, vẫn kiểm tra định dạng scholarId trước khi báo SCHOLAR_BLOCKED
  if (!SCHOLAR_ID_REGEX.test(cleanId)) {
    throw new AppError('Mã scholarId không hợp lệ.', {
      statusCode: 400,
      code: 'INVALID_SCHOLAR_ID'
    });
  }

  throw new ScholarBlockedError('Backend chưa cấu hình SERPAPI_API_KEY để đọc chi tiết hồ sơ Google Scholar.');
}

module.exports = {
  extractScholarIdFromInput,
  normalizeOrcidId,
  loadSerpApiUsage,
  getOrcidProfile: rawOrcid => getOrcidProfile(rawOrcid, scholarCache),
  findCandidates,
  findProfileById
};
