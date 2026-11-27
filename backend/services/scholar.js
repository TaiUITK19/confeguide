/**
 * Dịch vụ tra cứu hồ sơ nghiên cứu đa tầng cho ConfGuide (backend/services/scholar.js)
 * Thứ tự tự động:
 * 1) SerpApi Google Scholar (`SERPAPI_API_KEY`): tìm ứng viên theo tên & lấy hồ sơ theo `scholarId`,
 *    cache 24 giờ theo tên và `scholarId`, đếm lượt gọi trong tháng và tự dừng trước ngưỡng 250 lượt.
 * 2) Dự phòng ORCID Public API (không cần key): tự tìm theo Tên / Email / ORCID iD, đọc từ khóa, tiểu sử và bài báo.
 * 3) Dự phòng Semantic Scholar Graph API (không cần key): tìm theo tên tác giả, đọc tiêu đề bài báo và chuyên ngành.
 * (Giữ nguyên selector CSS Google Scholar gom gọn tại một chỗ để tham chiếu/kiểm tra khi cần.)
 */

'use strict';

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const dotenv = require('dotenv');
const cheerio = require('cheerio');

/* ================= 1. GOM SELECTOR CSS GOOGLE SCHOLAR TẠI MỘT CHỖ ================= */

const SCHOLAR_SELECTORS = {
  candidates: {
    card: '.gsc_1usr, .gs_ai_chpr',
    nameLink: '.gs_ai_name a, h3.gs_ai_name a, a[href*="user="]',
    affiliation: '.gs_ai_aff',
    emailLine: '.gs_ai_eml',
    interestItem: '.gs_ai_one_int, .gs_ai_int a'
  },
  profile: {
    name: '#gsc_prf_in, #gsc_prf_inw #gsc_prf_in',
    affiliationLine: '#gsc_prf_inw .gsc_prf_il, .gsc_prf_il',
    interestItem: '#gsc_prf_int .gsc_prf_inta, .gsc_prf_inta'
  }
};

/* ================= 2. HẰNG SỐ MẠNG, CACHE 24H & GIỚI HẠN SERPAPI ================= */

const SERPAPI_BASE_URL = 'https://serpapi.com/search.json';
const SCHOLAR_BASE_URL = 'https://scholar.google.com/citations';
const ORCID_PUBLIC_BASE_URL = 'https://pub.orcid.org/v3.0';
const SEMANTIC_SCHOLAR_BASE_URL = 'https://api.semanticscholar.org/graph/v1';

const REQUEST_TIMEOUT_MS = 10 * 1000;
const RATE_LIMIT_INTERVAL_MS = 3 * 1000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CANDIDATES = 5;
const MAX_QUEUE_WAITERS = 5;

const SERPAPI_MONTHLY_LIMIT = 250;
// Dừng gọi trước khi chạm trần 250 lượt/tháng để giữ vùng an toàn
const SERPAPI_SAFE_STOP_LIMIT = 245;

const IS_VERCEL = Boolean(process.env.VERCEL);
const LOCAL_ENV_PATH = path.resolve(__dirname, '../.env');
const SERPAPI_USAGE_FILE = IS_VERCEL
  ? path.join(os.tmpdir(), 'confguide-serpapi-usage.json')
  : path.resolve(__dirname, '..', 'data', 'serpapi-usage.json');

const SCHOLAR_REQUEST_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
};

const BLOCK_HTML_REGEX =
  /unusual traffic|sorry\/index|solveSimpleChallenge|g-recaptcha|id=["']captcha["']|not a robot|automated queries/i;
const SCHOLAR_ID_REGEX = /^[a-zA-Z0-9_-]{4,40}$/;
const ORCID_REGEX = /\b(\d{4}-\d{4}-\d{4}-\d{3}[\dX])\b/i;

/** Cache trong bộ nhớ: key -> { expiresAt: number, data: any } */
const memoryCache = new Map();

/** Bộ đếm lượt gọi SerpApi trong tháng + khóa hàng đợi tránh vượt ngưỡng đồng thời */
let usageStoreCache = null;
let usageQueue = Promise.resolve();

/** Hàng đợi giới hạn tối đa 1 request mỗi 3 giây nếu fallback gọi trực tiếp Scholar */
let lastScholarRequestAt = 0;
let pendingWaiters = 0;
let rateLimitChain = Promise.resolve();

/**
 * Lỗi chuyên biệt khi Google Scholar trả về captcha / unusual traffic / HTTP 429.
 */
class ScholarBlockedError extends Error {
  constructor(message = 'Google Scholar đang chặn truy cập tự động (captcha hoặc HTTP 429).') {
    super(message);
    this.name = 'ScholarBlockedError';
    this.code = 'SCHOLAR_BLOCKED';
    this.statusCode = 503;
  }
}

/* ================= 3. TIỆN ÍCH ENV, CACHE 24H & ĐẾM QUOTA THÁNG ================= */

/**
 * Đọc và làm sạch khóa API từ biến môi trường (tự đọc lại backend/.env cục bộ nếu vừa cập nhật).
 * @param {string} envName - Tên biến môi trường (`SERPAPI_API_KEY`, `SEMANTIC_SCHOLAR_API_KEY`).
 * @returns {string} Giá trị key sạch hoặc chuỗi rỗng.
 */
function readEnvKey(envName) {
  const clean = val => String(val || '').trim().replace(/^['"]+|['"]+$/g, '').trim();
  const current = clean(process.env[envName]);
  if (current) return current;

  if (!IS_VERCEL) {
    try {
      if (fs.existsSync(LOCAL_ENV_PATH)) {
        const parsed = dotenv.parse(fs.readFileSync(LOCAL_ENV_PATH, 'utf8'));
        const fromFile = clean(parsed && parsed[envName]);
        if (fromFile) {
          process.env[envName] = fromFile;
          return fromFile;
        }
      }
    } catch {
      // Bỏ qua lỗi đọc tệp .env cục bộ
    }
  }
  return '';
}

/**
 * Lấy mã tháng hiện tại theo UTC dạng `YYYY-MM`.
 * @returns {string} Chuỗi YYYY-MM.
 */
function getCurrentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

/**
 * Xác định ngưỡng dừng gọi SerpApi (mặc định 245 < 250 lượt/tháng).
 * @returns {number} Ngưỡng tối đa cho phép gọi trước khi dừng.
 */
function getSerpApiStopThreshold() {
  const override = Number(process.env.SERPAPI_STOP_AT);
  if (Number.isInteger(override) && override >= 1 && override <= SERPAPI_MONTHLY_LIMIT) {
    return override;
  }
  return SERPAPI_SAFE_STOP_LIMIT;
}

/**
 * Đọc trạng thái sử dụng SerpApi trong tháng (tự reset sang 0 khi qua tháng mới).
 * @returns {Promise<{ month: string, count: number, limit: number, stopAt: number, remainingBeforeStop: number, stopped: boolean, updatedAt: string }>}
 */
async function loadSerpApiUsage() {
  const currentMonth = getCurrentMonthKey();
  const stopAt = getSerpApiStopThreshold();

  if (!usageStoreCache) {
    let parsed = null;
    try {
      if (fs.existsSync(SERPAPI_USAGE_FILE)) {
        const raw = await fsp.readFile(SERPAPI_USAGE_FILE, 'utf8');
        parsed = raw.trim() ? JSON.parse(raw) : null;
      }
    } catch {
      parsed = null;
    }

    if (parsed && parsed.month === currentMonth && Number.isFinite(Number(parsed.count))) {
      usageStoreCache = {
        month: currentMonth,
        count: Math.max(0, Math.floor(Number(parsed.count))),
        updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : ''
      };
    } else {
      usageStoreCache = {
        month: currentMonth,
        count: 0,
        updatedAt: new Date().toISOString()
      };
    }
  }

  if (usageStoreCache.month !== currentMonth) {
    usageStoreCache = {
      month: currentMonth,
      count: 0,
      updatedAt: new Date().toISOString()
    };
  }

  const count = usageStoreCache.count;
  return {
    month: currentMonth,
    count,
    limit: SERPAPI_MONTHLY_LIMIT,
    stopAt,
    remainingBeforeStop: Math.max(0, stopAt - count),
    stopped: count >= stopAt,
    updatedAt: usageStoreCache.updatedAt
  };
}

/**
 * Ghi an toàn thống kê lượt dùng SerpApi ra tệp JSON.
 * @param {{ month: string, count: number, updatedAt: string }} data
 * @returns {Promise<void>}
 */
async function persistSerpApiUsage(data) {
  try {
    await fsp.mkdir(path.dirname(SERPAPI_USAGE_FILE), { recursive: true });
    const tmpFile = `${SERPAPI_USAGE_FILE}.tmp`;
    await fsp.writeFile(tmpFile, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    await fsp.rename(tmpFile, SERPAPI_USAGE_FILE);
  } catch {
    // Không làm sập tiến trình nếu môi trường không cho ghi tệp thống kê
  }
}

/**
 * Tuần tự hóa việc kiểm tra ngưỡng 250 lượt và cấp phát 1 lượt gọi SerpApi.
 * Đảm bảo hai request đồng thời không vượt quá ngưỡng an toàn.
 * @returns {Promise<{ allowed: boolean, usage: Object }>}
 */
function reserveSerpApiCallSlot() {
  const run = usageQueue.then(async () => {
    const usage = await loadSerpApiUsage();
    if (usage.count >= usage.stopAt) {
      return { allowed: false, usage };
    }
    usageStoreCache = {
      month: usage.month,
      count: usage.count + 1,
      updatedAt: new Date().toISOString()
    };
    await persistSerpApiUsage(usageStoreCache);
    const nextUsage = await loadSerpApiUsage();
    return { allowed: true, usage: nextUsage };
  });

  usageQueue = run.catch(() => {});
  return run;
}

/**
 * Đọc dữ liệu còn hạn (24 giờ) từ cache bộ nhớ.
 * @param {string} cacheKey - Khóa cache.
 * @returns {*|null} Dữ liệu đã lưu hoặc null nếu hết hạn.
 */
function getCachedValue(cacheKey) {
  const entry = memoryCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() >= entry.expiresAt) {
    memoryCache.delete(cacheKey);
    return null;
  }
  return entry.data;
}

/**
 * Lưu dữ liệu vào cache bộ nhớ với thời gian sống 24 giờ.
 * @param {string} cacheKey - Khóa cache.
 * @param {*} data - Dữ liệu cần cache.
 */
function setCachedValue(cacheKey, data) {
  if (memoryCache.size > 500) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) memoryCache.delete(oldestKey);
  }
  memoryCache.set(cacheKey, {
    data,
    expiresAt: Date.now() + CACHE_TTL_MS
  });
}

/* ================= 4. PARSE SCHOLAR TRỰC TIẾP (CHỈ DÙNG KHI CẦN) ================= */

function scheduleScholarRequest(taskFn) {
  if (pendingWaiters >= MAX_QUEUE_WAITERS) {
    const err = new Error('Hệ thống đang có nhiều yêu cầu tra cứu Scholar. Vui lòng đợi vài giây rồi thử lại.');
    err.code = 'RATE_LIMIT_BUSY';
    err.statusCode = 429;
    return Promise.reject(err);
  }

  pendingWaiters += 1;
  const run = rateLimitChain.then(async () => {
    const elapsed = Date.now() - lastScholarRequestAt;
    if (lastScholarRequestAt > 0 && elapsed < RATE_LIMIT_INTERVAL_MS) {
      await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_INTERVAL_MS - elapsed));
    }
    lastScholarRequestAt = Date.now();
    return taskFn();
  });

  rateLimitChain = run.catch(() => {});
  return run.finally(() => {
    pendingWaiters = Math.max(0, pendingWaiters - 1);
  });
}

function isScholarBlockedResponse(response, html) {
  if (!response) return false;
  if (response.status === 429 || response.status === 403 || response.status === 503) return true;
  const finalUrl = String(response.url || '');
  if (/\/sorry\//i.test(finalUrl) || /accounts\.google\.com/i.test(finalUrl)) return true;
  return BLOCK_HTML_REGEX.test(String(html || ''));
}

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

function parseVerifiedEmailDomain(rawEmailText) {
  const clean = String(rawEmailText || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const atMatch = clean.match(/(?:at|tại)\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  if (atMatch) return atMatch[1].toLowerCase();
  const domainMatch = clean.match(/\b([a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+)\b/);
  return domainMatch ? domainMatch[1].toLowerCase() : clean;
}

function parseCandidatesHtml(html) {
  const $ = cheerio.load(String(html || ''));
  const sel = SCHOLAR_SELECTORS.candidates;
  const candidates = [];
  const seenIds = new Set();

  $(sel.card).each((_, el) => {
    if (candidates.length >= MAX_CANDIDATES) return false;
    const card = $(el);
    const linkEl = card.find(sel.nameLink).first();
    const name = linkEl.text().replace(/\s+/g, ' ').trim();
    const scholarId = extractScholarIdFromHref(linkEl.attr('href') || '');

    if (!name || !scholarId || seenIds.has(scholarId)) return;
    seenIds.add(scholarId);

    const affiliation = card.find(sel.affiliation).first().text().replace(/\s+/g, ' ').trim();
    const emailDomain = parseVerifiedEmailDomain(card.find(sel.emailLine).first().text());

    const interests = [];
    const seenInterests = new Set();
    card.find(sel.interestItem).each((__, intEl) => {
      const text = $(intEl).text().replace(/\s+/g, ' ').trim();
      if (text && !seenInterests.has(text.toLowerCase())) {
        seenInterests.add(text.toLowerCase());
        interests.push(text);
      }
    });

    candidates.push({
      scholarId,
      name,
      affiliation,
      emailDomain,
      interests,
      source: 'serpapi'
    });
  });

  return candidates;
}

function parseProfileHtml(html) {
  const $ = cheerio.load(String(html || ''));
  const sel = SCHOLAR_SELECTORS.profile;
  const name = $(sel.name).first().text().replace(/\s+/g, ' ').trim();

  let affiliation = '';
  $(sel.affiliationLine).each((_, el) => {
    if (affiliation) return false;
    const node = $(el);
    if (node.attr('id') === 'gsc_prf_ivh') return;
    const text = node.text().replace(/\s+/g, ' ').trim();
    if (text && !/^verified email/i.test(text)) {
      affiliation = text;
    }
  });

  const interests = [];
  const seenInterests = new Set();
  $(sel.interestItem).each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text && !seenInterests.has(text.toLowerCase())) {
      seenInterests.add(text.toLowerCase());
      interests.push(text);
    }
  });

  return { name, affiliation, interests };
}

/* ================= 5. PHƯƠNG ÁN 1: SERPAPI GOOGLE SCHOLAR ================= */

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
 * Gọi API JSON SerpApi (đã qua kiểm tra quota tháng) với timeout 10 giây.
 * @param {Record<string, string>} params - Tham số truy vấn SerpApi.
 * @param {string} apiKey - SERPAPI_API_KEY.
 * @returns {Promise<Object>} Đối tượng JSON từ SerpApi.
 */
async function fetchSerpApiJson(params, apiKey) {
  const reservation = await reserveSerpApiCallSlot();
  if (!reservation.allowed) {
    const quotaErr = new Error(
      `SerpApi đã đạt ngưỡng an toàn ${reservation.usage.count}/${reservation.usage.limit} lượt trong tháng ${reservation.usage.month}, tạm dừng gọi để không vượt hạn mức.`
    );
    quotaErr.code = 'SERPAPI_QUOTA_STOPPED';
    quotaErr.statusCode = 429;
    throw quotaErr;
  }

  const query = new URLSearchParams({
    ...params,
    api_key: apiKey
  });

  let response;
  try {
    response = await fetch(`${SERPAPI_BASE_URL}?${query.toString()}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
  } catch (err) {
    if (err && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
      const tErr = new Error('Quá thời gian kết nối tới SerpApi (10 giây).');
      tErr.code = 'SERPAPI_TIMEOUT';
      throw tErr;
    }
    const nErr = new Error('Không thể kết nối tới SerpApi.');
    nErr.code = 'SERPAPI_NETWORK_ERROR';
    throw nErr;
  }

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  const apiErrMsg = data && typeof data.error === 'string' ? data.error.trim() : '';
  if (apiErrMsg && /haven't returned any results|hasn't returned any results|no results/i.test(apiErrMsg)) {
    return { profiles: [], noResults: true };
  }

  if (!response.ok || apiErrMsg) {
    const err = new Error(apiErrMsg || `SerpApi trả về mã HTTP ${response.status}.`);
    err.code = (response.status === 429 || /run out of searches|quota|limit/i.test(apiErrMsg))
      ? 'SERPAPI_QUOTA_EXCEEDED'
      : 'SERPAPI_ERROR';
    err.statusCode = response.status >= 400 ? response.status : 502;
    throw err;
  }

  return data;
}

/**
 * Tìm tối đa 5 ứng viên Google Scholar theo tên qua SerpApi (`engine=google_scholar_profiles`), cache 24h.
 * @param {string} rawName - Tên tác giả cần tìm.
 * @returns {Promise<Array<Object>|null>} Danh sách ứng viên (hoặc null nếu chưa cấu hình SERPAPI_API_KEY).
 */
async function searchCandidatesViaSerpApi(rawName) {
  const apiKey = readEnvKey('SERPAPI_API_KEY');
  if (!apiKey) return null;

  const cleanName = String(rawName || '').replace(/\s+/g, ' ').trim();
  if (!cleanName) return [];

  const cacheKey = `serpapi:candidates:${cleanName.toLowerCase()}`;
  const cached = getCachedValue(cacheKey);
  if (cached) return cached;

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

  setCachedValue(cacheKey, candidates);
  return candidates;
}

/**
 * Lấy chi tiết hồ sơ Google Scholar theo `scholarId` qua SerpApi (`engine=google_scholar_author`), cache 24h.
 * @param {string} rawScholarId - Mã user Google Scholar.
 * @returns {Promise<Object|null>} Hồ sơ tác giả hoặc null nếu chưa có SERPAPI_API_KEY.
 */
async function getProfileViaSerpApi(rawScholarId) {
  const apiKey = readEnvKey('SERPAPI_API_KEY');
  if (!apiKey) return null;

  const scholarId = String(rawScholarId || '').trim();
  if (!SCHOLAR_ID_REGEX.test(scholarId)) {
    const err = new Error('Mã scholarId không hợp lệ.');
    err.code = 'INVALID_SCHOLAR_ID';
    err.statusCode = 400;
    throw err;
  }

  const cacheKey = `serpapi:profile:${scholarId}`;
  const cached = getCachedValue(cacheKey);
  if (cached) return cached;

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
    const notFoundErr = new Error('Không tìm thấy hồ sơ Google Scholar với mã tác giả này trên SerpApi.');
    notFoundErr.code = 'SCHOLAR_PROFILE_NOT_FOUND';
    notFoundErr.statusCode = 404;
    throw notFoundErr;
  }

  const paperTitles = (Array.isArray(data.articles) ? data.articles : [])
    .slice(0, 15)
    .map(article => String((article && article.title) || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const profile = {
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

  setCachedValue(cacheKey, profile);
  return profile;
}

/* ================= 6. TIỆN ÍCH CHUẨN HÓA CHUỖI TIẾNG VIỆT ================= */

/**
 * Loại bỏ dấu tiếng Việt để hỗ trợ tìm kiếm không dấu trên các nguồn học thuật quốc tế.
 * @param {string} text - Chuỗi đầu vào.
 * @returns {string} Chuỗi không dấu đã làm sạch khoảng trắng.
 */
function stripVietnameseDiacritics(text) {
  return String(text || '')
    .replace(/[đĐ]/g, ch => (ch === 'Đ' ? 'D' : 'd'))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ================= 7. PHƯƠNG ÁN 2B: ORCID PUBLIC API (KHÔNG CẦN KEY — TÌM TÊN/EMAIL, ĐỌC TIỂU SỬ & BÀI BÁO) ================= */

/**
 * Chuẩn hóa chuỗi hoặc URL ORCID (`https://orcid.org/0000-0002-1825-0097`) về định dạng `0000-0002-1825-0097`.
 * @param {*} rawOrcid - Mã ORCID hoặc URL ORCID.
 * @returns {string} ORCID iD chuẩn hoặc chuỗi rỗng.
 */
function normalizeOrcidId(rawOrcid) {
  const match = String(rawOrcid || '').trim().match(ORCID_REGEX);
  return match ? match[1].toUpperCase() : '';
}

/**
 * Gọi một endpoint công khai của ORCID Public API v3.0 (không yêu cầu API key).
 * @param {string} relativePath - Đường dẫn sau `/v3.0`.
 * @returns {Promise<Object|null>} JSON trả về hoặc null nếu 404.
 */
async function fetchOrcidPublicJson(relativePath) {
  const response = await fetch(`${ORCID_PUBLIC_BASE_URL}${relativePath}`, {
    method: 'GET',
    headers: { Accept: 'application/vnd.orcid+json, application/json;q=0.9' },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    const err = new Error(`ORCID Public API trả về mã HTTP ${response.status}.`);
    err.code = 'ORCID_HTTP_ERROR';
    err.statusCode = response.status >= 400 ? response.status : 502;
    throw err;
  }
  return response.json();
}

/**
 * Đọc hồ sơ ORCID công khai theo ORCID iD (tên, tiểu sử biography, cơ quan, keywords và danh sách bài báo works), cache 24h.
 * @param {string} rawOrcid - Mã ORCID iD.
 * @returns {Promise<Object|null>} Hồ sơ chuẩn hóa nguồn `orcid` hoặc null nếu không tồn tại.
 */
async function getOrcidProfile(rawOrcid) {
  const orcid = normalizeOrcidId(rawOrcid);
  if (!orcid) {
    const err = new Error('ORCID iD không đúng định dạng (ví dụ: 0000-0002-1825-0097).');
    err.code = 'INVALID_ORCID';
    err.statusCode = 400;
    throw err;
  }

  const cacheKey = `orcid:profile:v2:${orcid}`;
  const cached = getCachedValue(cacheKey);
  if (cached) return cached;

  const [personData, employmentsData, worksData] = await Promise.all([
    fetchOrcidPublicJson(`/${encodeURIComponent(orcid)}/person`),
    fetchOrcidPublicJson(`/${encodeURIComponent(orcid)}/employments`).catch(() => null),
    fetchOrcidPublicJson(`/${encodeURIComponent(orcid)}/works`).catch(() => null)
  ]);

  if (!personData) return null;

  const nameBlock = personData.name || {};
  const creditName = nameBlock['credit-name'] && nameBlock['credit-name'].value;
  const givenNames = nameBlock['given-names'] && nameBlock['given-names'].value;
  const familyName = nameBlock['family-name'] && nameBlock['family-name'].value;
  const fullName = String(creditName || [givenNames, familyName].filter(Boolean).join(' ') || orcid).trim();
  const biography = String((personData.biography && personData.biography.content) || '')
    .replace(/\s+/g, ' ')
    .trim();

  // Trích xuất cơ quan & bộ môn công tác
  let affiliation = '';
  if (employmentsData && typeof employmentsData === 'object') {
    const directList = Array.isArray(employmentsData['employment-summary'])
      ? employmentsData['employment-summary']
      : [];
    const groupList = Array.isArray(employmentsData['affiliation-group'])
      ? employmentsData['affiliation-group']
      : [];
    const firstSummary = directList[0]
      || (groupList[0] && Array.isArray(groupList[0].summaries) && groupList[0].summaries[0]
        ? groupList[0].summaries[0]['employment-summary']
        : null);
    if (firstSummary && firstSummary.organization && firstSummary.organization.name) {
      const orgName = String(firstSummary.organization.name).trim();
      const deptName = String(firstSummary['department-name'] || '').trim();
      affiliation = deptName ? `${orgName} (${deptName})` : orgName;
    }
  }

  const rawKeywords = personData.keywords && Array.isArray(personData.keywords.keyword)
    ? personData.keywords.keyword
    : [];
  const interests = [];
  const seen = new Set();
  for (const kw of rawKeywords) {
    const content = String((kw && kw.content) || '').trim();
    if (content && !seen.has(content.toLowerCase())) {
      seen.add(content.toLowerCase());
      interests.push(content);
    }
  }

  // Trích xuất tối đa 15 tiêu đề bài báo/công trình công khai của tác giả
  const rawGroups = worksData && Array.isArray(worksData.group) ? worksData.group : [];
  const paperTitles = [];
  const seenTitles = new Set();
  for (const grp of rawGroups) {
    if (paperTitles.length >= 15) break;
    const summary = Array.isArray(grp['work-summary']) ? grp['work-summary'][0] : null;
    const titleVal = summary && summary.title && summary.title.title && summary.title.title.value;
    const cleanTitle = String(titleVal || '').replace(/\s+/g, ' ').trim();
    if (cleanTitle && !seenTitles.has(cleanTitle.toLowerCase())) {
      seenTitles.add(cleanTitle.toLowerCase());
      paperTitles.push(cleanTitle);
    }
  }

  const profile = {
    scholarId: orcid,
    orcid,
    name: fullName,
    affiliation,
    emailDomain: '',
    biography,
    interests,
    paperTitles,
    orcidUrl: `https://orcid.org/${orcid}`,
    source: 'orcid'
  };

  setCachedValue(cacheKey, profile);
  return profile;
}

/**
 * Kiểm tra độ khớp tên (không dấu) để tránh nhận nhầm ứng viên khác hoàn toàn.
 * @param {string} queryName - Tên truy vấn.
 * @param {string} candidateName - Tên ứng viên trả về.
 * @returns {boolean} True nếu đủ độ tương đồng.
 */
function hasReasonableNameOverlap(queryName, candidateName) {
  const qTokens = stripVietnameseDiacritics(queryName).toLowerCase().split(/\s+/).filter(t => t.length >= 2);
  const cTokens = new Set(stripVietnameseDiacritics(candidateName).toLowerCase().split(/\s+/).filter(t => t.length >= 2));
  if (qTokens.length === 0 || cTokens.size === 0) return false;
  let overlap = 0;
  for (const t of qTokens) {
    if (cTokens.has(t)) overlap += 1;
  }
  const minRequired = qTokens.length === 1 ? 1 : (qTokens.length === 2 ? 2 : 2);
  return overlap >= minRequired;
}

/**
 * Tự động tìm kiếm tác giả trên ORCID Public API bằng Tên & Email (không cần API key),
 * rồi tải hồ sơ đầy đủ (tiểu sử + keywords + works) cho tối đa 3 ứng viên khớp nhất.
 * @param {string} rawName - Tên hiển thị người dùng.
 * @param {string} [rawEmail=''] - Email Google của người dùng (dùng so khớp email công khai trên ORCID).
 * @returns {Promise<Array<Object>>} Danh sách hồ sơ ORCID đã chuẩn hóa.
 */
async function searchOrcidByNameAndEmail(rawName, rawEmail = '') {
  const cleanName = String(rawName || '').replace(/\s+/g, ' ').trim();
  const cleanEmail = String(rawEmail || '').trim().toLowerCase();
  if (!cleanName && !cleanEmail) return [];

  const cacheKey = `orcid:search:${cleanName.toLowerCase()}::${cleanEmail}`;
  const cached = getCachedValue(cacheKey);
  if (cached) return cached;

  const queries = [];
  if (cleanEmail) {
    queries.push(`email:"${cleanEmail.replace(/"/g, '')}"`);
  }
  const asciiName = stripVietnameseDiacritics(cleanName);
  const nameTokens = asciiName.split(/\s+/).filter(Boolean);
  if (nameTokens.length >= 2) {
    const first = nameTokens[0].replace(/"/g, '');
    const last = nameTokens[nameTokens.length - 1].replace(/"/g, '');
    queries.push(`(given-names:${first}* AND family-name:${last}*) OR "${asciiName.replace(/"/g, '')}"`);
  } else if (asciiName.length >= 2) {
    queries.push(`"${asciiName.replace(/"/g, '')}"`);
  }

  const orQuery = queries.join(' OR ');
  if (!orQuery) return [];

  const searchData = await fetchOrcidPublicJson(
    `/expanded-search/?q=${encodeURIComponent(orQuery)}&rows=6`
  );
  const rows = searchData && Array.isArray(searchData['expanded-result'])
    ? searchData['expanded-result']
    : [];

  const matchedOrcids = [];
  const seen = new Set();
  for (const row of rows) {
    const oid = normalizeOrcidId(row && row['orcid-id']);
    if (!oid || seen.has(oid)) continue;
    const rowEmails = Array.isArray(row.email) ? row.email.map(e => String(e).toLowerCase()) : [];
    const emailMatched = Boolean(cleanEmail && rowEmails.includes(cleanEmail));
    const fullRowName = row['credit-name'] || [row['given-names'], row['family-names']].filter(Boolean).join(' ');
    if (!emailMatched && !hasReasonableNameOverlap(cleanName, fullRowName)) {
      continue;
    }
    seen.add(oid);
    matchedOrcids.push({ oid, emailMatched });
    if (matchedOrcids.length >= 3) break;
  }

  const hydrated = await Promise.all(
    matchedOrcids.map(item => getOrcidProfile(item.oid).catch(() => null))
  );
  const finalProfiles = hydrated.filter(Boolean);
  setCachedValue(cacheKey, finalProfiles);
  return finalProfiles;
}

/* ================= 7B. PHƯƠNG ÁN 2C: SEMANTIC SCHOLAR API (KHÔNG CẦN KEY, BEST-EFFORT) ================= */

/**
 * Tìm tác giả trên Semantic Scholar Graph API (không cần API key, tùy chọn SEMANTIC_SCHOLAR_API_KEY)
 * để trích xuất bài báo tác giả đã công bố khi SerpApi và ORCID chưa có kết quả.
 * @param {string} rawName - Tên tác giả.
 * @returns {Promise<Array<Object>>} Tối đa 5 ứng viên hoặc mảng rỗng nếu bị giới hạn 429/không thấy.
 */
async function searchSemanticScholarFallback(rawName) {
  const asciiName = stripVietnameseDiacritics(rawName);
  if (!asciiName || asciiName.length < 2) return [];

  const cacheKey = `s2:candidates:${asciiName.toLowerCase()}`;
  const cached = getCachedValue(cacheKey);
  if (cached) return cached;

  const headers = { Accept: 'application/json' };
  const s2Key = readEnvKey('SEMANTIC_SCHOLAR_API_KEY');
  if (s2Key) headers['x-api-key'] = s2Key;

  const fields = 'name,url,affiliations,paperCount,citationCount,papers.title,papers.fieldsOfStudy,papers.s2FieldsOfStudy';
  const url = `${SEMANTIC_SCHOLAR_BASE_URL}/author/search?query=${encodeURIComponent(asciiName)}&fields=${encodeURIComponent(fields)}&limit=8`;

  let response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(5000)
    });
  } catch {
    return [];
  }

  if (!response || !response.ok) return [];
  let payload = {};
  try {
    payload = await response.json();
  } catch {
    return [];
  }

  const rows = Array.isArray(payload.data) ? payload.data : [];
  const filtered = rows
    .filter(a => a && a.authorId && a.name && hasReasonableNameOverlap(rawName, a.name))
    .sort((a, b) => Number(b.citationCount || 0) - Number(a.citationCount || 0))
    .slice(0, MAX_CANDIDATES);

  const candidates = filtered.map(author => {
    const papers = Array.isArray(author.papers) ? author.papers : [];
    const paperTitles = [];
    const seenT = new Set();
    const interests = [];
    const seenF = new Set();

    for (const p of papers.slice(0, 15)) {
      const t = String((p && p.title) || '').replace(/\s+/g, ' ').trim();
      if (t && !seenT.has(t.toLowerCase())) {
        seenT.add(t.toLowerCase());
        paperTitles.push(t);
      }
      const s2Fields = Array.isArray(p && p.s2FieldsOfStudy) ? p.s2FieldsOfStudy : [];
      for (const f of s2Fields) {
        const cat = String((f && f.category) || '').trim();
        if (cat && !seenF.has(cat.toLowerCase())) {
          seenF.add(cat.toLowerCase());
          interests.push(cat);
        }
      }
      const legacyFields = Array.isArray(p && p.fieldsOfStudy) ? p.fieldsOfStudy : [];
      for (const f of legacyFields) {
        const cat = String(f || '').trim();
        if (cat && !seenF.has(cat.toLowerCase())) {
          seenF.add(cat.toLowerCase());
          interests.push(cat);
        }
      }
    }

    const affList = Array.isArray(author.affiliations) ? author.affiliations : [];
    return {
      scholarId: String(author.authorId),
      name: String(author.name).trim(),
      affiliation: affList.map(x => String(x || '').trim()).filter(Boolean).join(', '),
      emailDomain: '',
      biography: '',
      interests,
      paperTitles,
      paperCount: Number(author.paperCount || paperTitles.length || 0),
      citedByCount: Number(author.citationCount || 0),
      scholarUrl: String(author.url || '').trim(),
      source: 'semantic_scholar'
    };
  });

  if (candidates.length > 0) {
    setCachedValue(cacheKey, candidates);
  }
  return candidates;
}

/* ================= 8. ĐIỀU PHỐI TỰ ĐỘNG ĐA TẦNG ================= */

/**
 * Tìm ứng viên tự động sau khi đăng nhập Google theo thứ tự:
 * 1) SerpApi Google Scholar (`SERPAPI_API_KEY`, cache 24h, dừng trước 250 lượt/tháng)
 * 2) ORCID Public API tự tìm theo Tên & Email hoặc ORCID iD (không cần key — đọc tiểu sử, keywords & bài báo)
 * 3) Semantic Scholar Graph API (không cần key — đọc tiêu đề bài báo & chuyên ngành)
 * 4) Nếu vẫn không có hồ sơ công khai -> trả `source: 'manual'` để người dùng quét mô tả hồ sơ / chọn tay.
 * @param {string} name - Tên tác giả, link Google Scholar hoặc ORCID iD.
 * @param {{ orcid?: string, email?: string, allowFallback?: boolean }} [options={}]
 * @returns {Promise<{ source: string, scholarBlocked: boolean, candidates: Array<Object>, serpapiUsage: Object, trace: Array<Object>, fallbackReason: string, message: string }>}
 */
async function findCandidates(name, options = {}) {
  const allowFallback = options.allowFallback !== false;
  const cleanName = String(name || '').replace(/\s+/g, ' ').trim();
  const cleanEmail = String(options.email || '').trim().toLowerCase();
  const explicitOrcid = normalizeOrcidId(options.orcid || cleanName);
  const explicitScholarId = extractScholarIdFromInput(cleanName);
  const trace = [];
  let serpapiUsage = await loadSerpApiUsage();

  // Nếu người dùng nhập trực tiếp ORCID iD -> tra thẳng ORCID Public API
  if (options.orcid && explicitOrcid) {
    try {
      const orcidProfile = await getOrcidProfile(explicitOrcid);
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

  // Nếu người dùng nhập link hồ sơ Google Scholar trực tiếp (?user=...)
  if (explicitScholarId) {
    const serpKeyDirect = readEnvKey('SERPAPI_API_KEY');
    if (serpKeyDirect) {
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
      scholarBlocked: !serpKeyDirect,
      candidates: [],
      serpapiUsage,
      trace,
      fallbackReason: !serpKeyDirect ? 'serpapi-not-configured' : 'scholar-link-not-resolved',
      message: !serpKeyDirect
        ? 'Máy chủ chưa cấu hình SERPAPI_API_KEY và Google Scholar chặn cào trực tiếp (CAPTCHA/429). Bạn có thể dán nhanh mô tả/chuyên ngành từ hồ sơ để AI tự chọn lĩnh vực.'
        : `Không đọc được hồ sơ Google Scholar cho mã ${explicitScholarId}. Bạn có thể dán nhanh mô tả/chuyên ngành để AI tự chọn lĩnh vực.`
    };
  }

  // Tầng 1: SerpApi Google Scholar
  const serpKey = readEnvKey('SERPAPI_API_KEY');
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

  // Tầng 2: ORCID Public API — tự tìm bằng Tên & Email hoặc ORCID iD (không cần API key)
  if (explicitOrcid) {
    try {
      const orcidProfile = await getOrcidProfile(explicitOrcid);
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
      const orcidByName = await searchOrcidByNameAndEmail(cleanName, cleanEmail);
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

  // Tầng 3: Semantic Scholar Graph API (không cần API key, đọc tiêu đề bài báo & lĩnh vực)
  try {
    const s2Candidates = await searchSemanticScholarFallback(cleanName);
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

  // Tầng 4: Tài khoản chưa có hồ sơ công khai trên SerpApi / ORCID / Semantic Scholar
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

  // Nếu là ORCID iD -> gọi ORCID Public API (không cần key)
  const orcid = normalizeOrcidId(cleanId);
  if (orcid && allowFallback) {
    const orcidProfile = await getOrcidProfile(orcid);
    if (orcidProfile) return orcidProfile;
    const notFound = new Error(`Không tìm thấy hồ sơ ORCID công khai (${orcid}).`);
    notFound.code = 'ORCID_NOT_FOUND';
    notFound.statusCode = 404;
    throw notFound;
  }

  // Mặc định: gọi SerpApi Google Scholar Author (cache 24h, dừng trước 250 lượt/tháng)
  const serpProfile = await getProfileViaSerpApi(cleanId);
  if (serpProfile) return serpProfile;

  const missingKeyErr = new Error('Backend chưa cấu hình SERPAPI_API_KEY để đọc chi tiết hồ sơ Google Scholar.');
  missingKeyErr.code = 'SCHOLAR_BLOCKED';
  missingKeyErr.statusCode = 503;
  throw missingKeyErr;
}

module.exports = {
  SCHOLAR_SELECTORS,
  SERPAPI_MONTHLY_LIMIT,
  SERPAPI_SAFE_STOP_LIMIT,
  ScholarBlockedError,
  isScholarBlockedResponse,
  extractScholarIdFromHref,
  extractScholarIdFromInput,
  parseVerifiedEmailDomain,
  parseCandidatesHtml,
  parseProfileHtml,
  normalizeOrcidId,
  loadSerpApiUsage,
  searchCandidatesViaSerpApi,
  getProfileViaSerpApi,
  getOrcidProfile,
  searchOrcidByNameAndEmail,
  searchSemanticScholarFallback,
  findCandidates,
  findProfileById
};
