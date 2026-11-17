/**
 * ConfGuide — Kịch bản Trang Tra cứu & Lọc Hội nghị (js/pages/search.js)
 * Trang sử dụng: search.html
 * Phụ thuộc: js/core/page-transition.js, js/core/layout.js, js/components/search-core.js, js/components/compare.js
 * Chức năng: Quản lý trạng thái lọc phản ứng (`filterState` Proxy) theo kiến trúc một chiều,
 * tích hợp lõi tìm kiếm `ConfGuideSearchCore` (chuẩn hóa, khớp mờ Levenshtein, facet pre-counts),
 * combobox gợi ý W3C APG, ngăn kéo bộ lọc di động (draft state), kết xuất `DocumentFragment`
 * chống giật INP, thanh chip quản lý focus bàn phím và đồng bộ URL 2 chiều an toàn.
 */

(function () {
  'use strict';

  /* ================= 1. HẰNG CẤU HÌNH HỆ THỐNG ================= */

  /** Cấu hình bật/tắt các nhóm bộ lọc hiển thị trên thanh bên */
  const ENABLED_FILTER_GROUPS = {
    rank: true,
    cfp: true,
    when: true,
    where: true,
    what: true,
    mode: false,
    publisher: false
  };

  /** Hiển thị đầy đủ mọi hội nghị, kể cả hội nghị thiếu dữ liệu */
  const HIDE_EMPTY_RECORDS = false;

  /** Ngưỡng ngày tính trạng thái "Sắp hết hạn" */
  const CLOSING_SOON_DAYS = 14;

  /** Số lượng chủ đề hiển thị mặc định trước khi thu gọn */
  const TOPIC_VISIBLE_LIMIT = 4;

  /** Số lượng bản ghi trên một trang kết quả */
  const PAGE_SIZE = 9;

  /** Thời gian trễ debounce (mili-giây) */
  const DEBOUNCE_SEARCH_MS = 150;
  const DEBOUNCE_URL_MS = 300;
  const DEBOUNCE_STATUS_MS = 500;

  /** Danh sách tên bản ghi thô bị trùng lặp (đã gỡ bỏ để hiển thị đủ 100% bản ghi) */
  const DUPLICATE_RAW_NAMES = new Set([]);

  /** Ghi đè phân loại mốc hạn nộp (kind) cho các trường hợp đặc thù */
  const DEADLINE_KIND_OVERRIDES = {
    'IEEE SMC 2027|Paper Submission for Workshops, Regular and Special Sessions': 'submission',
    'MobiSys 2027|Abstract Registration': 'submission'
  };

  /** Quy tắc biểu thức chính quy phân loại chủ đề nghiên cứu (topics[]) */
  const TOPIC_RULES = [
    {
      key: 'ai-data',
      label: 'Trí tuệ nhân tạo & Dữ liệu',
      regex: /\b(ai|artificial intelligence|machine learning|data science|computational intelligence|intelligent|autonomous|generative)\b|\bagent|tri tue nhan tao/
    },
    {
      key: 'network-iot',
      label: 'Mạng, Viễn thông & IoT',
      regex: /\b(iot|edge|cloud)\b|\b(network|communicat|wireless|mobile|internet of things)|truyen thong/
    },
    {
      key: 'electronics',
      label: 'Điện tử, Vi mạch & Nhúng',
      regex: /\b(electronic|electrical|circuit|mechatronic|embedded|robotic)|dien tu/
    },
    {
      key: 'software',
      label: 'Kỹ thuật phần mềm',
      regex: /software engineering/
    },
    {
      key: 'security',
      label: 'An toàn thông tin',
      regex: /\b(security|cyber)|an toan thong tin/
    },
    {
      key: 'cross-domain',
      label: 'Liên ngành & Ứng dụng',
      regex: /\b(business|tourism|energy|infrastructure|emergency|rescue|economics)|kinh doanh|du lich/
    }
  ];

  const TOPIC_LABEL_MAP = TOPIC_RULES.reduce((acc, item) => {
    acc[item.key] = item.label;
    return acc;
  }, {});

  const CFP_LABEL_MAP = {
    all: 'Tất cả',
    open: 'Đang mở',
    closingSoon: 'Sắp hết hạn (≤ 14 ngày)',
    closed: 'Đã đóng',
    unknown: 'Chưa rõ'
  };

  const CITY_LABEL_MAP = {
    all: 'Tất cả',
    'ha-noi': 'Hà Nội',
    'ho-chi-minh': 'Hồ Chí Minh',
    other: 'Khu vực khác'
  };

  const RANK_VALUES = ['A*', 'A', 'B', 'C'];
  const VALID_RANK_VALUES = new Set(RANK_VALUES);
  const RANK_WEIGHT = { 'A*': 0, A: 1, B: 2, C: 3 };

  const VALID_CFP_VALUES = new Set(['all', 'open', 'closingSoon', 'closed', 'unknown']);
  const VALID_CITY_VALUES = new Set(['all', 'ha-noi', 'ho-chi-minh', 'other']);
  const VALID_TOPIC_VALUES = new Set(TOPIC_RULES.map(item => item.key));
  const VALID_SORT_VALUES = new Set([
    'deadline',
    'deadline-desc',
    'rank-desc',
    'rank-asc',
    'event',
    'event-desc',
    'name',
    'name-desc',
    'relevance'
  ]);

  /** Tập hợp mọi khóa facet cần tính toán số kết quả trước */
  const ALL_FACET_KEYS = [
    'rank:A*',
    'rank:A',
    'rank:B',
    'rank:C',
    'cfp:all',
    'cfp:open',
    'cfp:closingSoon',
    'cfp:closed',
    'cfp:unknown',
    'ongoing:1',
    'city:all',
    'city:ha-noi',
    'city:ho-chi-minh',
    'city:other'
  ].concat(TOPIC_RULES.map(rule => `topic:${rule.key}`));

  /* ================= 2. BIẾN TRẠNG THÁI TOÀN CỤC MODULE ================= */

  let allNormalizedConferences = [];
  let baseSearchConferences = [];
  let indexedConferences = [];
  let filteredConferences = [];
  let validMonthValues = new Set(['unknown']);
  let hiddenEmptyCount = 0;
  let isDataLoaded = false;
  let dataLoadError = null;

  let isFilterDrawerOpen = false;
  let draftFilterState = null;
  let isTopicsExpanded = false;

  let searchDebounceTimer = null;
  let urlSyncTimer = null;
  let statusAnnounceTimer = null;
  let toastTimer = null;

  let activeComboboxIndex = -1;
  let comboboxSuggestions = [];
  let lastRenderedConferenceIds = null;
  let updateScheduled = false;
  let renderToken = 0;

  /**
   * Đối tượng trạng thái lọc thô ban đầu (nguồn chân lý duy nhất).
   */
  const rawFilterState = {
    q: '',
    ranks: [],
    cfp: 'all',
    month: '',
    ongoing: false,
    dateFrom: '',
    dateTo: '',
    city: 'all',
    topics: [],
    sort: 'deadline',
    page: 1
  };

  /**
   * Trạng thái lọc phản ứng bọc bởi Proxy:
   * Mọi thao tác gán giá trị đều kích hoạt microtask batching để lọc và vẽ lại giao diện đúng 1 lần.
   */
  const filterState = new Proxy(rawFilterState, {
    set(target, prop, value) {
      if (target[prop] === value) return true;
      target[prop] = value;
      scheduleRender();
      return true;
    }
  });

  /**
   * Lên lịch cập nhật giao diện trong microtask tiếp theo (chống lặp và gom nhiều thao tác gán).
   */
  function scheduleRender() {
    if (updateScheduled) return;
    updateScheduled = true;
    queueMicrotask(async () => {
      updateScheduled = false;
      await executePipeline();
    });
  }

  /* ================= 3. HÀM TIỆN ÍCH CƠ BẢN & NGÀY THÁNG ================= */

  /**
   * Lấy tham chiếu tới đối tượng tiện ích window.ConfGuideUtils.
   * @returns {Object|null}
   */
  function getUtils() {
    return window.ConfGuideUtils || null;
  }

  /**
   * Lấy tham chiếu tới đối tượng lõi tìm kiếm window.ConfGuideSearchCore.
   * @returns {Object}
   */
  function getCore() {
    return window.ConfGuideSearchCore || {
      normalizeText: str => String(str || '').toLowerCase().trim(),
      tokenizeQuery: str => String(str || '').toLowerCase().split(/\s+/).filter(Boolean),
      buildIndex: list => list,
      scoreConference: () => ({ matched: true, score: 0 }),
      matchesFilters: () => true,
      computeFacetCounts: () => ({}),
      getRelaxSuggestions: () => ({ relaxations: [], spellingSuggestion: null }),
      highlightMatches: (txt) => escapeHtml(txt),
      escapeHtml: val => escapeHtml(val),
      yieldToMain: async () => {}
    };
  }

  /** Thoát ký tự đặc biệt HTML chống XSS (tái sử dụng ConfGuideUtils.escapeHtml). */
  function escapeHtml(val) {
    const utils = getUtils();
    if (utils && typeof utils.escapeHtml === 'function') return utils.escapeHtml(val);
    return String(val ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[ch]));
  }

  /**
   * Lấy ngày hiện tại dạng ISO YYYY-MM-DD theo giờ địa phương (UTC+7).
   * @returns {string}
   */
  function getTodayIso() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Kiểm tra định dạng ngày chuẩn ISO YYYY-MM-DD.
   * @param {*} dateStr
   * @returns {string|null}
   */
  function normalizeIsoDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const trimmed = dateStr.trim();
    const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const y = Number(match[1]);
    const m = Number(match[2]);
    const d = Number(match[3]);
    if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1970) return null;
    return trimmed;
  }

  /**
   * Tính số ngày lịch chênh lệch giữa 2 mốc ngày ISO bằng Date.UTC (không phụ thuộc múi giờ máy).
   * @param {string|null} targetIso
   * @param {string|null} baseIso
   * @returns {number|null}
   */
  function diffCalendarDays(targetIso, baseIso) {
    const cleanTarget = normalizeIsoDate(targetIso);
    const cleanBase = normalizeIsoDate(baseIso);
    if (!cleanTarget || !cleanBase) return null;

    const [ty, tm, td] = cleanTarget.split('-').map(Number);
    const [by, bm, bd] = cleanBase.split('-').map(Number);
    const targetUtcMs = Date.UTC(ty, tm - 1, td);
    const baseUtcMs = Date.UTC(by, bm - 1, bd);
    return Math.round((targetUtcMs - baseUtcMs) / 86400000);
  }

  /**
   * Cộng ngày lịch nguyên vào chuỗi ngày ISO.
   * @param {string} baseIso
   * @param {number} days
   * @returns {string}
   */
  function addDaysToIso(baseIso, days) {
    const clean = normalizeIsoDate(baseIso);
    if (!clean || !Number.isFinite(days)) return '';
    const [y, m, d] = clean.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + days));
    const yy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(dt.getUTCDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  }

  /**
   * Cộng tháng lịch vào chuỗi ngày ISO, kẹp an toàn vào ngày cuối tháng.
   * @param {string} baseIso
   * @param {number} months
   * @returns {string}
   */
  function addMonthsToIso(baseIso, months) {
    const clean = normalizeIsoDate(baseIso);
    if (!clean || !Number.isFinite(months)) return '';
    const [y, m, d] = clean.split('-').map(Number);
    const targetMonthIndex = (m - 1) + months;
    const targetYear = y + Math.floor(targetMonthIndex / 12);
    const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
    const lastDayOfMonth = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
    const clampedDay = Math.min(d, lastDayOfMonth);
    const dt = new Date(Date.UTC(targetYear, normalizedMonth, clampedDay));
    const yy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(dt.getUTCDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  }

  /**
   * Lấy khoảng ngày định sẵn cho chip chọn nhanh trong nhóm Thời gian & Hạn nộp.
   * @param {'7d'|'30d'|'3m'} presetKey
   * @returns {{from: string, to: string}|null}
   */
  function getDatePresetRange(presetKey) {
    const today = getTodayIso();
    if (presetKey === '7d') return { from: today, to: addDaysToIso(today, 7) };
    if (presetKey === '30d') return { from: today, to: addDaysToIso(today, 30) };
    if (presetKey === '3m') return { from: today, to: addMonthsToIso(today, 3) };
    return null;
  }

  /**
   * Định dạng chuỗi ISO YYYY-MM-DD sang định dạng dd/mm/yyyy.
   * @param {string|null} isoStr
   * @returns {string}
   */
  function formatIsoToDdMmYyyy(isoStr) {
    const clean = normalizeIsoDate(isoStr);
    if (!clean) return '';
    const [y, m, d] = clean.split('-');
    return `${d}/${m}/${y}`;
  }

  /**
   * Định dạng khoảng ngày diễn ra hội nghị từ startDate đến endDate.
   * @param {string|null} startIso
   * @param {string|null} endIso
   * @returns {string}
   */
  function formatEventDateRange(startIso, endIso) {
    const s = normalizeIsoDate(startIso);
    const e = normalizeIsoDate(endIso);
    if (!s && !e) return 'Chưa công bố ngày diễn ra';
    if (s && (!e || s === e)) return formatIsoToDdMmYyyy(s);
    if (!s) return formatIsoToDdMmYyyy(e);
    return `${formatIsoToDdMmYyyy(s)} – ${formatIsoToDdMmYyyy(e)}`;
  }

  /**
   * Định dạng chuỗi tháng YYYY-MM sang "Tháng MM/YYYY".
   * @param {string} monthKey
   * @returns {string}
   */
  function formatMonthLabel(monthKey) {
    if (!monthKey || monthKey === 'unknown') return 'Chưa có ngày';
    const match = String(monthKey).match(/^(\d{4})-(\d{2})$/);
    if (!match) return String(monthKey);
    return `Tháng ${match[2]}/${match[1]}`;
  }

  /* ================= 4. CHUẨN HÓA DỮ LIỆU BẢN GHI (1 LẦN DUY NHẤT) ================= */

  /**
   * Tạo slug mã định danh hội nghị dự phòng khi chưa có layout.js.
   * @param {string} text
   * @returns {string}
   */
  function fallbackSlugify(text) {
    const core = getCore();
    return core.normalizeText(text)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Xác định mã ID định danh hội nghị duy nhất (tương thích toàn bộ bookmark).
   * @param {Object} raw
   * @returns {string}
   */
  function resolveConferenceId(raw) {
    const utils = getUtils();
    if (utils && typeof utils.getConferenceId === 'function') {
      return utils.getConferenceId(raw);
    }
    if (raw && raw.id) return String(raw.id).trim();
    return fallbackSlugify(raw && (raw.name || raw.short_name || raw.full_name || raw.fullName || ''));
  }

  /**
   * Phân loại thành phố/khu vực tổ chức thành 3 nhóm: 'ha-noi' | 'ho-chi-minh' | 'other'
   * Mọi địa điểm ngoài Hà Nội và TP.HCM (kể cả thiếu dữ liệu) đều rơi vào 'other' (Khu vực khác).
   * @param {string|null} rawLocation
   * @returns {'ha-noi'|'ho-chi-minh'|'other'}
   */
  function extractCityKey(rawLocation) {
    if (!rawLocation || String(rawLocation).trim() === '') return 'other';
    const core = getCore();
    const normalized = core.normalizeText(rawLocation);
    if (/\b(ha noi|hanoi)\b/.test(normalized)) return 'ha-noi';
    if (/\b(ho chi minh|hcm|saigon|sai gon)\b/.test(normalized)) return 'ho-chi-minh';
    return 'other';
  }

  /**
   * Trích xuất các chủ đề nghiên cứu đa nhãn từ tên, mô tả của hội nghị.
   * @param {Object} raw
   * @returns {Array<string>}
   */
  function extractTopics(raw) {
    const core = getCore();
    const combined = core.normalizeText([
      raw.name || '',
      raw.full_name !== undefined ? raw.full_name : (raw.fullName || ''),
      raw.summarization || ''
    ].join(' '));

    if (!combined) return [];
    return TOPIC_RULES
      .filter(rule => rule.regex.test(combined))
      .map(rule => rule.key);
  }

  /**
   * Phân loại kind của mốc deadline.
   * @param {string} confName
   * @param {string} deadlineName
   * @returns {'cameraReady'|'notification'|'registration'|'submission'|'other'}
   */
  function classifyDeadlineKind(confName, deadlineName) {
    const cleanConf = String(confName || '').trim();
    const cleanDl = String(deadlineName || '').trim();
    const overrideKey = `${cleanConf}|${cleanDl}`;

    if (Object.prototype.hasOwnProperty.call(DEADLINE_KIND_OVERRIDES, overrideKey)) {
      return DEADLINE_KIND_OVERRIDES[overrideKey];
    }

    const core = getCore();
    const norm = core.normalizeText(cleanDl);
    if (/camera|final/.test(norm)) return 'cameraReady';
    if (/notif|decision|rejection|reviewer|rebuttal|acceptance/.test(norm)) return 'notification';
    if (/regist|payment|invitation/.test(norm)) return 'registration';
    if (/proposal|nomination|tutorial|demonstration|fast track|blue sky|poster|oral|pitching|workshop/.test(norm)) {
      return 'other';
    }
    if (/submission|submit|abstract|paper/.test(norm)) return 'submission';
    return 'other';
  }

  /**
   * Chuẩn hóa mảng mốc deadline của hội nghị.
   * @param {Object} raw
   * @returns {Array<{name: string, date: string, kind: string}>}
   */
  function normalizeDeadlinesArray(raw) {
    if (!raw || !raw.deadlines) return [];
    const confName = raw.name || '';
    let rawList = [];

    if (Array.isArray(raw.deadlines)) {
      rawList = raw.deadlines;
    } else if (typeof raw.deadlines === 'object') {
      const legacyMap = [
        { prop: 'abstract', name: 'Abstract Submission' },
        { prop: 'fullPaper', name: 'Full Paper Submission' },
        { prop: 'notification', name: 'Author Notification' },
        { prop: 'cameraReady', name: 'Camera-Ready Submission' }
      ];
      legacyMap.forEach(item => {
        if (raw.deadlines[item.prop]) {
          rawList.push({ name: item.name, date: raw.deadlines[item.prop] });
        }
      });
    }

    return rawList
      .filter(d => d && typeof d === 'object')
      .map(d => ({
        name: String(d.name || 'Deadline').trim(),
        date: String(d.date || '').trim(),
        kind: classifyDeadlineKind(confName, d.name)
      }));
  }

  /**
   * Chuẩn hóa một bản ghi hội nghị đầy đủ các thuộc tính camelCase một lần duy nhất.
   * @param {Object} raw
   * @returns {Object|null}
   */
  /**
   * Đánh giá trạng thái CFP (open, closingSoon, closed, unknown) và mốc hạn nộp tiếp theo/cuối cùng.
   * @param {Array<Object>} submissionDeadlines - Danh sách các mốc nộp bài đã sắp xếp tăng dần.
   * @returns {{ cfpStatus: string, nextDeadline: Object|null, lastDeadline: Object|null }}
   */
  function evaluateSubmissionStatus(submissionDeadlines) {
    if (!submissionDeadlines.length) {
      return { cfpStatus: 'unknown', nextDeadline: null, lastDeadline: null };
    }
    const last = submissionDeadlines[submissionDeadlines.length - 1];
    const lastDeadline = { name: last.name, date: last.date, daysLeft: last.daysLeft };
    const upcoming = submissionDeadlines.find(d => d.daysLeft >= 0) || null;
    if (!upcoming) {
      return { cfpStatus: 'closed', nextDeadline: null, lastDeadline };
    }
    const nextDeadline = { name: upcoming.name, date: upcoming.date, daysLeft: upcoming.daysLeft };
    const cfpStatus = upcoming.daysLeft <= CLOSING_SOON_DAYS ? 'closingSoon' : 'open';
    return { cfpStatus, nextDeadline, lastDeadline };
  }

  /**
   * Suy luận giai đoạn diễn ra của hội nghị (`upcoming`, `ongoing`, `ended`, `unknown`).
   * @param {string} startDate - Ngày bắt đầu ISO YYYY-MM-DD.
   * @param {string} endDate - Ngày kết thúc ISO YYYY-MM-DD.
   * @param {string} todayIso - Ngày hiện tại ISO YYYY-MM-DD.
   * @returns {string} Giai đoạn diễn ra hội nghị.
   */
  function resolveEventPhase(startDate, endDate, todayIso) {
    if (!startDate || !endDate) return 'unknown';
    if (todayIso < startDate) return 'upcoming';
    if (todayIso > endDate) return 'ended';
    return 'ongoing';
  }

  /**
   * Chuẩn hóa một bản ghi hội nghị đầy đủ các thuộc tính camelCase một lần duy nhất.
   * @param {Object} raw - Dữ liệu thô một hội nghị từ JSON.
   * @returns {Object|null} Bản ghi đã chuẩn hóa hoặc null nếu không hợp lệ.
   */
  function normalizeConference(raw) {
    if (!raw || typeof raw !== 'object') return null;

    const todayIso = getTodayIso();
    const id = resolveConferenceId(raw);
    const rawName = String(raw.name || '').trim();
    const dataQuality = (raw.full_name === null && !raw.fullName)
      ? 'empty'
      : (raw.status === 'partial' ? 'partial' : 'full');

    const fullNameText = raw.full_name !== undefined && raw.full_name !== null
      ? String(raw.full_name).trim()
      : String(raw.fullName || '').trim();

    const deadlinesWithKind = normalizeDeadlinesArray(raw);
    const submissionDeadlines = deadlinesWithKind
      .map(d => ({ name: d.name, date: d.date, kind: d.kind, daysLeft: diffCalendarDays(d.date, todayIso) }))
      .filter(d => d.kind === 'submission' && d.daysLeft !== null)
      .sort((a, b) => a.date.localeCompare(b.date));

    const { cfpStatus, nextDeadline, lastDeadline } = evaluateSubmissionStatus(submissionDeadlines);
    const startDate = normalizeIsoDate(raw.start_date || raw.startDate);
    const endDate = normalizeIsoDate(raw.end_date || raw.endDate) || startDate;
    const rawRank = String(raw.rank || '').trim().toUpperCase();

    return Object.assign({}, raw, {
      id,
      rank: VALID_RANK_VALUES.has(rawRank) ? rawRank : '',
      fullName: fullNameText || rawName,
      website: raw.website_url || raw.website || '',
      startDate,
      endDate,
      eventMonth: startDate ? startDate.slice(0, 7) : 'unknown',
      isDuplicate: DUPLICATE_RAW_NAMES.has(rawName),
      dataQuality,
      cityKey: extractCityKey(raw.location),
      topics: extractTopics(raw),
      deadlines: deadlinesWithKind,
      submissionDeadlines,
      cfpStatus,
      nextDeadline,
      lastDeadline,
      eventPhase: resolveEventPhase(startDate, endDate, todayIso)
    });
  }

  /* ================= 5. LƯU TRỮ BOOKMARK NGƯỜI DÙNG ================= */

  /**
   * Lấy khóa localStorage lưu hội nghị đã lưu.
   * @returns {string}
   */
  function getSavedStorageKey() {
    const utils = getUtils();
    if (utils && typeof utils.getSavedStorageKey === 'function') {
      return utils.getSavedStorageKey(false);
    }
    const user = utils && utils.readStorage
      ? utils.readStorage('confguide_current_user', null)
      : null;
    return user && user.id ? `confguide_saved_${user.id}` : 'confguide_saved_guest';
  }

  /**
   * Đọc danh sách ID hội nghị đã lưu.
   * @returns {Array<string>}
   */
  function getSavedList() {
    const utils = getUtils();
    const list = utils && utils.readStorage
      ? utils.readStorage(getSavedStorageKey(), [])
      : [];
    return Array.isArray(list) ? list : [];
  }

  /**
   * Ghi danh sách ID hội nghị đã lưu vào localStorage.
   * @param {Array<string>} list
   */
  function setSavedList(list) {
    const utils = getUtils();
    if (utils && utils.writeStorage) {
      utils.writeStorage(getSavedStorageKey(), list);
    }
  }

  /**
   * Đảo trạng thái lưu/bỏ lưu của một hội nghị.
   * @param {string} confId
   * @param {HTMLElement} btn
   */
  function toggleSaveConference(confId, btn) {
    if (!confId || !btn) return;
    let saved = getSavedList();
    const isCurrentlySaved = saved.includes(confId);
    const labelSpan = btn.querySelector('span');
    const svg = btn.querySelector('svg');

    if (isCurrentlySaved) {
      saved = saved.filter(id => id !== confId);
      setSavedList(saved);
      btn.classList.remove('saved');
      btn.setAttribute('aria-pressed', 'false');
      if (labelSpan) labelSpan.textContent = 'Lưu lại';
      if (svg) svg.setAttribute('fill', 'none');
      showToast('Đã xóa hội nghị khỏi danh sách đã lưu.');
    } else {
      saved.push(confId);
      setSavedList(saved);
      btn.classList.add('saved');
      btn.setAttribute('aria-pressed', 'true');
      if (labelSpan) labelSpan.textContent = 'Đã lưu';
      if (svg) svg.setAttribute('fill', 'currentColor');
      showToast('Đã lưu hội nghị vào danh sách theo dõi.');
    }
  }

  /**
   * Hiển thị thông báo nhanh dạng toast.
   * @param {string} message
   */
  function showToast(message) {
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = message;
      toast.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        toast.classList.remove('show');
      }, 2500);
      return;
    }
    const utils = getUtils();
    if (utils && typeof utils.showToast === 'function') {
      utils.showToast(message, 'success');
    }
  }

  /* ================= 6. ĐỒNG BỘ TRẠNG THÁI URL (AN TOÀN & DEBOUNCE) ================= */

  /**
   * Đặt lại các giá trị trong filterState về mặc định.
   */
  function resetFilterStateValues() {
    rawFilterState.q = '';
    rawFilterState.ranks = [];
    rawFilterState.cfp = 'all';
    rawFilterState.month = '';
    rawFilterState.ongoing = false;
    rawFilterState.dateFrom = '';
    rawFilterState.dateTo = '';
    rawFilterState.city = 'all';
    rawFilterState.topics = [];
    rawFilterState.sort = 'deadline';
    rawFilterState.page = 1;
  }

  /**
   * Đọc tham số URL an toàn vào filterState khi khởi tạo.
   */
  /**
   * Trích xuất và lọc danh sách giá trị đa chọn (phân tách dấu phẩy) từ URLSearchParams.
   * @param {URLSearchParams} params - Tập tham số truy vấn URL hiện tại.
   * @param {string} paramName - Tên tham số (`rank` hoặc `topic`).
   * @param {Set<string>} validSet - Tập giá trị hợp lệ được phép nhận.
   * @param {boolean} [toUpper=false] - Có chuyển chữ hoa trước khi kiểm tra hay không.
   * @returns {Array<string>} Danh sách giá trị duy nhất hợp lệ.
   */
  function parseMultiUrlParam(params, paramName, validSet, toUpper = false) {
    const parsed = [];
    params.getAll(paramName).forEach(chunk => {
      String(chunk || '')
        .split(',')
        .map(item => (toUpper ? item.trim().toUpperCase() : item.trim()))
        .forEach(val => {
          if (validSet.has(val) && !parsed.includes(val)) parsed.push(val);
        });
    });
    return parsed;
  }

  /**
   * Đọc tham số URL an toàn vào filterState khi khởi tạo.
   */
  function readUrlIntoFilterState() {
    resetFilterStateValues();
    const params = new URLSearchParams(window.location.search);

    const rawQ = params.get('q');
    if (rawQ && rawQ.trim()) rawFilterState.q = rawQ.trim().slice(0, 100);
    if (ENABLED_FILTER_GROUPS.rank) rawFilterState.ranks = parseMultiUrlParam(params, 'rank', VALID_RANK_VALUES, true);

    if (ENABLED_FILTER_GROUPS.cfp) {
      const rawCfp = (params.get('cfp') || '').trim();
      if (VALID_CFP_VALUES.has(rawCfp)) rawFilterState.cfp = rawCfp;
    }

    if (ENABLED_FILTER_GROUPS.when) {
      const rawMonth = (params.get('month') || '').trim();
      if (rawMonth === 'unknown' || /^\d{4}-\d{2}$/.test(rawMonth)) rawFilterState.month = rawMonth;

      const rawOngoing = (params.get('ongoing') || '').trim().toLowerCase();
      if (rawOngoing === '1' || rawOngoing === 'true') rawFilterState.ongoing = true;

      const rawFrom = normalizeIsoDate(params.get('from') || params.get('dateFrom') || '');
      if (rawFrom) rawFilterState.dateFrom = rawFrom;

      const rawTo = normalizeIsoDate(params.get('to') || params.get('dateTo') || '');
      if (rawTo) rawFilterState.dateTo = rawTo;
    }

    if (ENABLED_FILTER_GROUPS.where) {
      let rawCity = (params.get('city') || '').trim();
      if (rawCity === 'da-nang' || rawCity === 'unknown') rawCity = 'other';
      if (VALID_CITY_VALUES.has(rawCity)) rawFilterState.city = rawCity;
    }

    if (ENABLED_FILTER_GROUPS.what) rawFilterState.topics = parseMultiUrlParam(params, 'topic', VALID_TOPIC_VALUES, false);

    const rawSort = (params.get('sort') || '').trim();
    if (VALID_SORT_VALUES.has(rawSort)) rawFilterState.sort = rawSort;

    const rawPage = Number.parseInt(params.get('page') || '1', 10);
    if (Number.isFinite(rawPage) && rawPage >= 1) rawFilterState.page = rawPage;
  }

  /**
   * Đồng bộ filterState lên URL với debounce 300ms và các lớp bảo vệ an toàn.
   */
  function syncUrlDebounced() {
    if (typeof window === 'undefined' || window.location.protocol === 'file:') return;
    if (urlSyncTimer) clearTimeout(urlSyncTimer);

    urlSyncTimer = setTimeout(() => {
      try {
        const params = new URLSearchParams();
        if (filterState.q) params.set('q', filterState.q);
        if (ENABLED_FILTER_GROUPS.rank && Array.isArray(filterState.ranks) && filterState.ranks.length > 0) {
          params.set('rank', filterState.ranks.join(','));
        }
        if (ENABLED_FILTER_GROUPS.cfp && filterState.cfp && filterState.cfp !== 'all') {
          params.set('cfp', filterState.cfp);
        }
        if (ENABLED_FILTER_GROUPS.when) {
          if (filterState.month) params.set('month', filterState.month);
          if (filterState.ongoing) params.set('ongoing', '1');
          if (filterState.dateFrom) params.set('from', filterState.dateFrom);
          if (filterState.dateTo) params.set('to', filterState.dateTo);
        }
        if (ENABLED_FILTER_GROUPS.where && filterState.city && filterState.city !== 'all') {
          params.set('city', filterState.city);
        }
        if (ENABLED_FILTER_GROUPS.what && filterState.topics.length > 0) {
          params.set('topic', filterState.topics.join(','));
        }
        if (filterState.sort && filterState.sort !== 'deadline') {
          params.set('sort', filterState.sort);
        }
        if (filterState.page > 1) {
          params.set('page', String(filterState.page));
        }

        const qs = params.toString();
        const nextSearch = qs ? `?${qs}` : '';
        if (window.location.search !== nextSearch) {
          window.history.replaceState(null, '', `${window.location.pathname}${nextSearch}`);
        }
      } catch (e) {
        // Bỏ qua lỗi replaceState hạn chế tần suất của trình duyệt
      }
    }, DEBOUNCE_URL_MS);
  }

  /* ================= 7. KIỂM TRA TÍNH HỢP LỆ & ĐẾM BỘ LỌC ĐANG BẬT ================= */

  /**
   * Kiểm tra khoảng ngày (Từ ngày <= Đến ngày) và hiển thị thông báo lỗi.
   * @param {Object} state
   * @returns {boolean}
   */
  function validateDateRange(state) {
    const fromEl = document.getElementById('fromDate');
    const toEl = document.getElementById('toDate');
    const errorEl = document.getElementById('dateRangeError');

    const isInvalid = Boolean(
      state.dateFrom &&
      state.dateTo &&
      state.dateFrom > state.dateTo
    );

    if (fromEl) fromEl.setAttribute('aria-invalid', isInvalid ? 'true' : 'false');
    if (toEl) toEl.setAttribute('aria-invalid', isInvalid ? 'true' : 'false');
    if (errorEl) {
      if (isInvalid) {
        errorEl.textContent = 'Ngày bắt đầu (Từ) phải nhỏ hơn hoặc bằng ngày kết thúc (Đến).';
        errorEl.removeAttribute('hidden');
      } else {
        errorEl.textContent = '';
        errorEl.setAttribute('hidden', '');
      }
    }

    return !isInvalid;
  }

  /**
   * Đếm số bộ lọc đang chọn theo từng nhóm bộ lọc.
   * @param {Object} state
   * @returns {{rank: number, cfp: number, when: number, where: number, what: number, total: number}}
   */
  function getGroupActiveCounts(state) {
    const rankCount = (ENABLED_FILTER_GROUPS.rank && Array.isArray(state.ranks)) ? state.ranks.length : 0;
    const cfpCount = (ENABLED_FILTER_GROUPS.cfp && state.cfp && state.cfp !== 'all') ? 1 : 0;
    let whenCount = 0;
    if (ENABLED_FILTER_GROUPS.when) {
      if (state.month) whenCount += 1;
      if (state.ongoing) whenCount += 1;
      if (state.dateFrom || state.dateTo) whenCount += 1;
    }
    const whereCount = (ENABLED_FILTER_GROUPS.where && state.city && state.city !== 'all') ? 1 : 0;
    const whatCount = (ENABLED_FILTER_GROUPS.what && Array.isArray(state.topics)) ? state.topics.length : 0;

    return {
      rank: rankCount,
      cfp: cfpCount,
      when: whenCount,
      where: whereCount,
      what: whatCount,
      total: rankCount + cfpCount + whenCount + whereCount + whatCount
    };
  }

  /**
   * Danh sách các chip bộ lọc đang áp dụng.
   * @param {Object} state
   * @returns {Array<{id: string, groupKey: string, label: string, clear: Function}>}
   */
  /**
   * Tạo đối tượng mô tả một chip bộ lọc đang áp dụng kèm hàm xóa tương ứng.
   * @param {string} id - Mã định danh chip.
   * @param {string} groupKey - Khóa nhóm bộ lọc.
   * @param {string} label - Nhãn hiển thị của chip.
   * @param {Function} resetFn - Hàm đặt lại trường trạng thái tương ứng.
   * @returns {{ id: string, groupKey: string, label: string, clear: Function }}
   */
  function createActiveChip(id, groupKey, label, resetFn) {
    return {
      id,
      groupKey,
      label,
      clear: () => {
        resetFn();
        filterState.page = 1;
      }
    };
  }

  /**
   * Danh sách các chip bộ lọc đang áp dụng.
   * @param {Object} state - Trạng thái bộ lọc hiện tại.
   * @returns {Array<{id: string, groupKey: string, label: string, clear: Function}>}
   */
  function getActiveFilterChips(state) {
    const chips = [];

    if (state.q) {
      chips.push(createActiveChip('q', 'query', `Từ khóa: "${state.q}"`, () => {
        const input = document.getElementById('searchInput');
        if (input) input.value = '';
        filterState.q = '';
      }));
    }

    if (Array.isArray(state.ranks)) {
      state.ranks.forEach(rVal => {
        chips.push(createActiveChip(`rank:${rVal}`, 'rank', `Phân hạng: ${rVal}`, () => {
          filterState.ranks = filterState.ranks.filter(item => item !== rVal);
        }));
      });
    }

    if (state.cfp && state.cfp !== 'all') {
      chips.push(createActiveChip(`cfp:${state.cfp}`, 'cfp', `Hạn nộp: ${CFP_LABEL_MAP[state.cfp] || state.cfp}`, () => {
        filterState.cfp = 'all';
      }));
    }

    if (state.month) {
      chips.push(createActiveChip(`month:${state.month}`, 'when', `Tháng: ${formatMonthLabel(state.month)}`, () => {
        filterState.month = '';
      }));
    }

    if (state.ongoing) {
      chips.push(createActiveChip('ongoing', 'when', 'Đang diễn ra', () => {
        filterState.ongoing = false;
      }));
    }

    if (state.dateFrom || state.dateTo) {
      const fromText = state.dateFrom ? formatIsoToDdMmYyyy(state.dateFrom) : '...';
      const toText = state.dateTo ? formatIsoToDdMmYyyy(state.dateTo) : '...';
      chips.push(createActiveChip('dateRange', 'when', `Hạn nộp: ${fromText} – ${toText}`, () => {
        filterState.dateFrom = '';
        filterState.dateTo = '';
      }));
    }

    if (state.city && state.city !== 'all') {
      chips.push(createActiveChip(`city:${state.city}`, 'where', `Địa điểm: ${CITY_LABEL_MAP[state.city] || state.city}`, () => {
        filterState.city = 'all';
      }));
    }

    if (Array.isArray(state.topics)) {
      state.topics.forEach(tKey => {
        chips.push(createActiveChip(`topic:${tKey}`, 'what', `Chủ đề: ${TOPIC_LABEL_MAP[tKey] || tKey}`, () => {
          filterState.topics = filterState.topics.filter(item => item !== tKey);
        }));
      });
    }

    return chips;
  }

  /* ================= 8. TIÊU CHÍ SO SÁNH SẮP XẾP ================= */

  /**
   * So sánh theo hạn nộp bài (gần nhất hoặc xa nhất), luôn đẩy nhóm chưa rõ xuống cuối.
   * @param {Object} a
   * @param {Object} b
   * @param {boolean} [isDesc=false]
   * @returns {number}
   */
  function compareByDeadline(a, b, isDesc = false) {
    const groupRank = conf => {
      if (conf.cfpStatus === 'open' || conf.cfpStatus === 'closingSoon') return 0;
      if (conf.cfpStatus === 'closed') return 1;
      return 2;
    };

    const rankA = groupRank(a);
    const rankB = groupRank(b);
    if (rankA !== rankB) return rankA - rankB;

    if (rankA === 0) {
      const daysA = a.nextDeadline ? a.nextDeadline.daysLeft : Number.MAX_SAFE_INTEGER;
      const daysB = b.nextDeadline ? b.nextDeadline.daysLeft : Number.MAX_SAFE_INTEGER;
      if (daysA !== daysB) return isDesc ? (daysB - daysA) : (daysA - daysB);
    } else if (rankA === 1) {
      const closedA = a.lastDeadline ? a.lastDeadline.daysLeft : -Number.MAX_SAFE_INTEGER;
      const closedB = b.lastDeadline ? b.lastDeadline.daysLeft : -Number.MAX_SAFE_INTEGER;
      if (closedA !== closedB) return isDesc ? (closedA - closedB) : (closedB - closedA);
    }

    const startA = a.startDate || '9999-99-99';
    const startB = b.startDate || '9999-99-99';
    if (startA !== startB) return startA.localeCompare(startB);

    return compareByName(a, b, false);
  }

  /**
   * So sánh theo phân hạng CORE (A* -> C hoặc ngược lại), đồng hạng xếp theo hạn nộp.
   * @param {Object} a
   * @param {Object} b
   * @param {boolean} [isAsc=false] False = cao nhất trước (A* -> C), True = C -> A*.
   * @returns {number}
   */
  function compareByRank(a, b, isAsc = false) {
    const weightA = Object.prototype.hasOwnProperty.call(RANK_WEIGHT, a.rank) ? RANK_WEIGHT[a.rank] : 99;
    const weightB = Object.prototype.hasOwnProperty.call(RANK_WEIGHT, b.rank) ? RANK_WEIGHT[b.rank] : 99;

    // Hội nghị chưa có hạng luôn xếp cuối dù tăng hay giảm
    if (weightA === 99 || weightB === 99) {
      if (weightA !== weightB) return weightA - weightB;
    } else if (weightA !== weightB) {
      return isAsc ? (weightB - weightA) : (weightA - weightB);
    }

    return compareByDeadline(a, b, false);
  }

  /**
   * So sánh theo ngày diễn ra sự kiện (sớm nhất hoặc muộn nhất), thiếu ngày luôn xếp cuối.
   * @param {Object} a
   * @param {Object} b
   * @param {boolean} [isDesc=false]
   * @returns {number}
   */
  function compareByEventDate(a, b, isDesc = false) {
    const hasStartA = Boolean(a.startDate);
    const hasStartB = Boolean(b.startDate);
    if (hasStartA !== hasStartB) return hasStartA ? -1 : 1;

    if (!isDesc) {
      const phaseRank = conf => {
        if (conf.eventPhase === 'ongoing' || conf.eventPhase === 'upcoming') return 0;
        if (conf.eventPhase === 'ended') return 1;
        return 2;
      };
      const pA = phaseRank(a);
      const pB = phaseRank(b);
      if (pA !== pB) return pA - pB;
    }

    const startA = a.startDate || '';
    const startB = b.startDate || '';
    if (startA !== startB) {
      return isDesc ? startB.localeCompare(startA) : startA.localeCompare(startB);
    }

    return compareByName(a, b, false);
  }

  /**
   * So sánh theo tên viết tắt hội nghị (A–Z hoặc Z–A).
   * @param {Object} a
   * @param {Object} b
   * @param {boolean} [isDesc=false]
   * @returns {number}
   */
  function compareByName(a, b, isDesc = false) {
    const cmp = String(a.name || '').localeCompare(String(b.name || ''), 'vi', { sensitivity: 'base' });
    return isDesc ? -cmp : cmp;
  }

  /** Bảng ánh xạ các bộ so sánh sắp xếp hợp lệ */
  const SORT_COMPARATORS = {
    deadline: (a, b) => compareByDeadline(a, b, false),
    'deadline-desc': (a, b) => compareByDeadline(a, b, true),
    'rank-desc': (a, b) => compareByRank(a, b, false),
    'rank-asc': (a, b) => compareByRank(a, b, true),
    event: (a, b) => compareByEventDate(a, b, false),
    'event-desc': (a, b) => compareByEventDate(a, b, true),
    name: (a, b) => compareByName(a, b, false),
    'name-desc': (a, b) => compareByName(a, b, true),
    relevance: (a, b) => compareByDeadline(a, b, false)
  };

  /* ================= 9. LUỒNG THỰC THI CHÍNH (PIPELINE) ================= */

  /**
   * Kiểm tra một hội nghị có thỏa mãn từ khóa + bộ lọc hiện tại và lưu điểm số nếu khớp.
   * @param {Object} conf - Đối tượng hội nghị.
   * @param {Object} effectiveState - Trạng thái bộ lọc đang áp dụng.
   * @param {Array<string>} queryTokens - Token tìm kiếm.
   * @param {Map<string, number>} scoreMap - Bảng lưu điểm số theo ID hội nghị.
   * @param {Object} core - Tham chiếu window.ConfGuideSearchCore.
   * @returns {boolean} True nếu hội nghị thỏa mãn tất cả điều kiện.
   */
  function matchesPipelineConference(conf, effectiveState, queryTokens, scoreMap, core) {
    if (queryTokens.length > 0) {
      const matchRes = core.scoreConference(conf, queryTokens, effectiveState.q);
      if (!matchRes.matched) return false;
      scoreMap.set(conf.id, matchRes.score);
    }
    return core.matchesFilters(conf, effectiveState, ENABLED_FILTER_GROUPS);
  }

  /**
   * Lọc toàn bộ tập hội nghị (chia lô 200 kèm yieldToMain nếu > 500 bản ghi để giữ INP mượt).
   * @param {Object} effectiveState - Trạng thái lọc đang áp dụng.
   * @param {Array<string>} queryTokens - Danh sách token tìm kiếm.
   * @param {Map<string, number>} scoreMap - Bản đồ điểm xếp hạng.
   * @param {boolean} isDateValid - Cờ hợp lệ của khoảng ngày lọc.
   * @param {number} currentToken - Mã lượt render hiện tại để hủy nếu có thay đổi mới.
   * @param {Object} core - Tham chiếu ConfGuideSearchCore.
   * @returns {Promise<Array<Object>|null>} Danh sách hội nghị khớp hoặc null nếu lượt bị hủy.
   */
  async function filterConferencesForPipeline(
    effectiveState,
    queryTokens,
    scoreMap,
    isDateValid,
    currentToken,
    core
  ) {
    if (!isDateValid) return [];
    if (baseSearchConferences.length <= 500) {
      return baseSearchConferences.filter(conf =>
        matchesPipelineConference(conf, effectiveState, queryTokens, scoreMap, core)
      );
    }

    const filtered = [];
    const BATCH_SIZE = 200;
    for (let i = 0; i < baseSearchConferences.length; i += BATCH_SIZE) {
      if (currentToken !== renderToken) return null;
      const chunk = baseSearchConferences.slice(i, i + BATCH_SIZE);
      chunk.forEach(conf => {
        if (matchesPipelineConference(conf, effectiveState, queryTokens, scoreMap, core)) {
          filtered.push(conf);
        }
      });
      if (i + BATCH_SIZE < baseSearchConferences.length) {
        await core.yieldToMain();
      }
    }
    return currentToken === renderToken ? filtered : null;
  }

  /**
   * Sắp xếp kết quả lọc theo tiêu chí đã chọn, kết hợp điểm liên quan khi có từ khóa.
   * @param {Array<Object>} list - Danh sách hội nghị sau khi lọc.
   * @param {Object} effectiveState - Trạng thái lọc hiện tại.
   * @param {Array<string>} queryTokens - Token từ khóa.
   * @param {Map<string, number>} scoreMap - Bảng điểm tìm kiếm theo ID.
   */
  function sortConferencesForPipeline(list, effectiveState, queryTokens, scoreMap) {
    const comparator = SORT_COMPARATORS[effectiveState.sort] || SORT_COMPARATORS.deadline;
    const prioritizeScoreFirst = queryTokens.length > 0
      && (effectiveState.sort === 'relevance' || effectiveState.sort === 'deadline');

    list.sort((a, b) => {
      if (prioritizeScoreFirst) {
        const scoreDiff = (scoreMap.get(b.id) || 0) - (scoreMap.get(a.id) || 0);
        if (scoreDiff !== 0) return scoreDiff;
      }
      const primaryCmp = comparator(a, b);
      if (primaryCmp !== 0) return primaryCmp;
      if (queryTokens.length > 0 && !prioritizeScoreFirst) {
        return (scoreMap.get(b.id) || 0) - (scoreMap.get(a.id) || 0);
      }
      return 0;
    });
  }

  /**
   * Luồng xử lý một chiều tập trung:
   * lọc -> tính facet pre-counts -> render danh sách -> render chips -> cập nhật status -> sync URL.
   * Hỗ trợ nhường luồng yieldToMain khi chỉ mục > 500 bản ghi (lọc theo lô 200).
   */
  async function executePipeline() {
    if (!isDataLoaded) return;

    renderToken++;
    const currentToken = renderToken;
    const core = getCore();
    const effectiveState = isFilterDrawerOpen && draftFilterState ? draftFilterState : filterState;

    const isDateValid = validateDateRange(effectiveState);
    const queryTokens = core.tokenizeQuery(effectiveState.q);
    const scoreMap = new Map();

    const filtered = await filterConferencesForPipeline(
      effectiveState,
      queryTokens,
      scoreMap,
      isDateValid,
      currentToken,
      core
    );
    if (!filtered || currentToken !== renderToken) return;

    filteredConferences = filtered;
    sortConferencesForPipeline(filteredConferences, effectiveState, queryTokens, scoreMap);

    const facetCounts = core.computeFacetCounts(
      baseSearchConferences,
      effectiveState,
      ALL_FACET_KEYS,
      queryTokens,
      effectiveState.q
    );

    syncSidebarInputsFromState(effectiveState);
    updateSidebarUI(effectiveState, facetCounts);

    // Khi đang mở drawer trên di động thì chỉ cập nhật bộ đếm nháp, chưa vẽ lại danh sách nền
    if (isFilterDrawerOpen) {
      updateDraftButtonCount();
      return;
    }

    renderFilterChipsUI(getActiveFilterChips(effectiveState));

    const totalCount = baseSearchConferences.length;
    const matchCount = filteredConferences.length;
    const summaryTextEl = document.getElementById('resultsSummaryText');
    const resultCountEl = document.getElementById('resultCount');
    const totalCountEl = document.getElementById('totalCount');
    if (resultCountEl) resultCountEl.textContent = String(matchCount);
    if (totalCountEl) totalCountEl.textContent = String(totalCount);
    if (summaryTextEl) {
      summaryTextEl.innerHTML =
        `Hiển thị <strong id="resultCount">${matchCount}</strong>`
        + ` / <span id="totalCount">${totalCount}</span> hội nghị`;
    }

    await renderConferenceListUI(filteredConferences, currentToken);
    announceStatusDebounced(matchCount);
    syncUrlDebounced();
  }

  /* ================= 10. KẾT XUẤT GIAO DIỆN THANH BÊN (SIDEBAR) ================= */

  /**
   * Cập nhật số đếm kết quả trước (facet count) và trạng thái vô hiệu hóa cho từng lựa chọn lọc.
   * @param {Object<string, number>} facetCounts - Bản đồ số đếm theo khóa facet.
   * @param {number} total - Tổng số hội nghị trong chỉ mục hiện hành.
   */
  function updateSidebarOptionRows(facetCounts, total) {
    document.querySelectorAll('.js-option-row').forEach(row => {
      const key = row.getAttribute('data-option-key') || '';
      const inputEl = row.querySelector('.js-filter-input');
      const countEl = row.querySelector('.js-filter-count');
      const isChecked = Boolean((inputEl && inputEl.checked) || row.getAttribute('aria-pressed') === 'true');

      if (key.endsWith(':all')) {
        const allCount = facetCounts[key] !== undefined ? facetCounts[key] : total;
        if (countEl) countEl.textContent = `(${allCount})`;
        row.classList.remove('is-empty', 'is-disabled');
        if (inputEl) inputEl.disabled = false;
        return;
      }

      const countVal = facetCounts[key] !== undefined ? facetCounts[key] : 0;
      if (countEl) countEl.textContent = `(${countVal})`;

      const shouldDisable = countVal === 0 && !isChecked;
      row.classList.toggle('is-empty', shouldDisable);
      row.classList.toggle('is-disabled', shouldDisable);
      if (inputEl) inputEl.disabled = shouldDisable;
      else if (row instanceof HTMLButtonElement) row.disabled = shouldDisable;
    });
  }

  /**
   * Cập nhật nhãn số lượng lựa chọn đang bật theo từng nhóm và nút Xóa nhóm / Đặt lại.
   * @param {Object} state - Trạng thái bộ lọc.
   * @param {Object} groupCounts - Kết quả từ `getGroupActiveCounts(state)`.
   */
  function updateSidebarGroupCounters(state, groupCounts) {
    document.querySelectorAll('.js-group-selected-count').forEach(badge => {
      const count = groupCounts[badge.getAttribute('data-group-count') || ''] || 0;
      badge.textContent = count > 0 ? `(${count})` : '';
      if (count > 0) badge.removeAttribute('hidden');
      else badge.setAttribute('hidden', '');
    });

    document.querySelectorAll('.js-clear-group').forEach(btn => {
      const count = groupCounts[btn.getAttribute('data-clear-group') || ''] || 0;
      if (count > 0) btn.removeAttribute('hidden');
      else btn.setAttribute('hidden', '');
    });

    document.querySelectorAll('.js-panel-filter-count').forEach(badge => {
      badge.textContent = String(groupCounts.total);
      if (groupCounts.total > 0) badge.removeAttribute('hidden');
      else badge.setAttribute('hidden', '');
    });

    const hasAnyActive = groupCounts.total > 0 || Boolean(state.q);
    document.querySelectorAll('.js-filter-reset').forEach(btn => {
      btn.disabled = !hasAnyActive;
      btn.classList.toggle('is-active', hasAnyActive);
    });
  }

  /**
   * Cập nhật số đếm trước, trạng thái vô hiệu hóa và nhãn cho toàn bộ thanh bên.
   * @param {Object} state - Trạng thái bộ lọc hiện tại.
   * @param {Object} facetCounts - Bản đồ số đếm kết quả trước theo khóa facet.
   */
  function updateSidebarUI(state, facetCounts) {
    updateSidebarOptionRows(facetCounts, baseSearchConferences.length);

    const groupCounts = getGroupActiveCounts(state);
    updateSidebarGroupCounters(state, groupCounts);

    document.querySelectorAll('.js-date-preset').forEach(chip => {
      const range = getDatePresetRange(chip.getAttribute('data-preset') || '');
      const isPresetActive = Boolean(range && state.dateFrom === range.from && state.dateTo === range.to);
      chip.classList.toggle('is-active', isPresetActive);
      chip.setAttribute('aria-pressed', isPresetActive ? 'true' : 'false');
    });

    syncTopicOverflowToggle();

    const mobileFilterLabel = document.getElementById('mobileFilterBtnLabel');
    if (mobileFilterLabel) mobileFilterLabel.textContent = `Bộ lọc (${groupCounts.total})`;
  }

  /**
   * Lấy phần tử ô nhập từ khóa tìm kiếm trên trang Tra cứu.
   * @returns {HTMLInputElement|null}
   */
  function getSearchInputEl() {
    return document.querySelector('.js-search-input') || document.getElementById('searchInput');
  }

  /**
   * Đồng bộ giá trị ô nhập từ khóa tìm kiếm theo trạng thái lọc hiện tại,
   * tránh ghi đè khi người dùng đang gõ trực tiếp trong ô nhập.
   * @param {Object} state
   */
  function syncSearchInputFromState(state) {
    const searchInput = getSearchInputEl();
    if (!searchInput) return;

    const nextQ = state && typeof state.q === 'string' ? state.q : '';
    const isFocused = document.activeElement === searchInput;
    if (!isFocused || searchInput.value.trim() !== nextQ) {
      searchInput.value = nextQ;
    }
  }

  /**
   * Đồng bộ giá trị của ô tìm kiếm, các phần tử input và nút trên sidebar theo một đối tượng state.
   * @param {Object} state
   */
  function syncSidebarInputsFromState(state) {
    syncSearchInputFromState(state);

    document.querySelectorAll('.js-filter-rank').forEach(btn => {
      const rVal = btn.getAttribute('data-rank') || '';
      const isSelected = Array.isArray(state.ranks) && state.ranks.includes(rVal);
      btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
      btn.classList.toggle('is-selected', isSelected);
    });

    document.querySelectorAll('.js-filter-cfp').forEach(cb => {
      const isChecked = cb.value === 'all' ? state.cfp === 'all' : state.cfp === cb.value;
      cb.checked = isChecked;
      const row = cb.closest('.js-option-row');
      if (row) row.classList.toggle('is-selected', isChecked);
    });

    const monthSelect = document.getElementById('monthSelect');
    if (monthSelect) monthSelect.value = state.month;

    const ongoingCheck = document.getElementById('ongoingCheck');
    if (ongoingCheck) {
      ongoingCheck.checked = Boolean(state.ongoing);
      const row = ongoingCheck.closest('.js-option-row');
      if (row) row.classList.toggle('is-selected', ongoingCheck.checked);
    }

    const fromDate = document.getElementById('fromDate');
    if (fromDate) fromDate.value = state.dateFrom;

    const toDate = document.getElementById('toDate');
    if (toDate) toDate.value = state.dateTo;

    document.querySelectorAll('.js-filter-city').forEach(cb => {
      const isChecked = cb.value === 'all' ? state.city === 'all' : state.city === cb.value;
      cb.checked = isChecked;
      const row = cb.closest('.js-option-row');
      if (row) row.classList.toggle('is-selected', isChecked);
    });

    document.querySelectorAll('.js-filter-topic').forEach(cb => {
      const isChecked = Array.isArray(state.topics) && state.topics.includes(cb.value);
      cb.checked = isChecked;
      const row = cb.closest('.js-option-row');
      if (row) row.classList.toggle('is-selected', isChecked);
    });

    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) sortSelect.value = state.sort;
  }

  /**
   * Đồng bộ trạng thái xem thêm/thu gọn cho danh sách chủ đề.
   */
  function syncTopicOverflowToggle() {
    const container = document.getElementById('dynamicFieldsContainer');
    const toggleBtn = document.getElementById('btnToggleMoreTopics');
    if (!container || !toggleBtn) return;

    const topicRows = [...container.querySelectorAll('.js-option-row')];
    if (topicRows.length <= TOPIC_VISIBLE_LIMIT) {
      topicRows.forEach(row => row.classList.remove('is-topic-collapsed'));
      toggleBtn.hidden = true;
      toggleBtn.setAttribute('aria-expanded', 'false');
      return;
    }

    let hiddenCount = 0;
    topicRows.forEach((row, index) => {
      const inputEl = row.querySelector('input');
      const isChecked = Boolean(inputEl && inputEl.checked);
      const shouldCollapse = !isTopicsExpanded && index >= TOPIC_VISIBLE_LIMIT && !isChecked;
      row.classList.toggle('is-topic-collapsed', shouldCollapse);
      if (shouldCollapse) hiddenCount += 1;
    });

    if (!isTopicsExpanded && hiddenCount === 0) {
      toggleBtn.hidden = true;
      return;
    }

    toggleBtn.hidden = false;
    toggleBtn.setAttribute('aria-expanded', isTopicsExpanded ? 'true' : 'false');
    toggleBtn.textContent = isTopicsExpanded ? 'Thu gọn' : `Xem thêm (${hiddenCount})`;
  }

  /**
   * Đóng hoặc mở một accordion thanh bên.
   * @param {HTMLElement} acc
   * @param {boolean} shouldOpen
   */
  function setAccordionOpen(acc, shouldOpen) {
    if (!acc) return;
    acc.classList.toggle('open', Boolean(shouldOpen));
    const toggle = acc.querySelector('.js-filter-toggle');
    const panel = acc.querySelector('.filter-group__panel');
    if (toggle) toggle.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
    if (panel) {
      if (shouldOpen) panel.removeAttribute('hidden');
      else panel.setAttribute('hidden', '');
    }
  }

  /**
   * Khởi tạo trạng thái mở accordion:
   * Desktop mở các nhóm chính (thu gọn nhóm Thời gian & Hạn nộp trừ khi đang có bộ lọc);
   * Mobile mở Phân hạng, Hạn nộp bài và các nhóm đang có bộ lọc.
   */
  function syncInitialAccordionStates() {
    const isMobile = window.innerWidth <= 767;
    const groupCounts = getGroupActiveCounts(filterState);
    document.querySelectorAll('.js-filter-accordion').forEach((acc, idx) => {
      const groupKey = acc.getAttribute('data-group') || '';
      const hasActive = (groupCounts[groupKey] || 0) > 0;
      const shouldOpen = isMobile
        ? (idx <= 1 || hasActive)
        : (groupKey !== 'when' || hasActive);
      setAccordionOpen(acc, shouldOpen);
    });
  }

  /**
   * Xóa toàn bộ lựa chọn của một nhóm bộ lọc (tương thích cả chế độ bản nháp di động).
   * @param {string} groupKey
   */
  function clearFilterGroup(groupKey) {
    const targetState = (isFilterDrawerOpen && draftFilterState) ? draftFilterState : filterState;
    if (groupKey === 'rank') {
      targetState.ranks = [];
    } else if (groupKey === 'cfp') {
      targetState.cfp = 'all';
    } else if (groupKey === 'when') {
      targetState.month = '';
      targetState.ongoing = false;
      targetState.dateFrom = '';
      targetState.dateTo = '';
    } else if (groupKey === 'where') {
      targetState.city = 'all';
    } else if (groupKey === 'what') {
      targetState.topics = [];
    }
    targetState.page = 1;
    syncSidebarInputsFromState(targetState);
    if (isFilterDrawerOpen) {
      const core = getCore();
      const qTokens = core.tokenizeQuery(targetState.q);
      const counts = core.computeFacetCounts(baseSearchConferences, targetState, ALL_FACET_KEYS, qTokens, targetState.q);
      updateSidebarUI(targetState, counts);
      updateDraftButtonCount();
    }
  }

  /* ================= 11. KẾT XUẤT THẺ CHIP & QUẢN LÝ FOCUS ================= */

  /**
   * Render các chip bộ lọc vào container #activeFilterChips.
   * @param {Array<Object>} chips
   */
  function renderFilterChipsUI(chips) {
    const wrapper = document.getElementById('filterChipsWrapper');
    const container = document.getElementById('activeFilterChips');
    if (!wrapper || !container) return;

    if (chips.length === 0) {
      wrapper.setAttribute('hidden', '');
      container.innerHTML = '';
      return;
    }

    wrapper.removeAttribute('hidden');
    const fragment = document.createDocumentFragment();

    chips.forEach((chip, index) => {
      const li = document.createElement('li');
      li.className = 'filter-chip';
      li.innerHTML = `
        <span class="filter-chip__label">${escapeHtml(chip.label)}</span>
        <button type="button" class="filter-chip__remove js-remove-chip" data-chip-index="${index}" aria-label="Bỏ bộ lọc ${escapeHtml(chip.label)}">&times;</button>
      `;
      fragment.appendChild(li);
    });

    container.replaceChildren(fragment);
  }

  /**
   * Xử lý gỡ bỏ một chip và quản lý chuyển dịch tiêu điểm (focus management).
   * @param {number} chipIndex
   */
  function handleChipRemove(chipIndex) {
    const currentChips = getActiveFilterChips(filterState);
    const targetChip = currentChips[chipIndex];
    if (!targetChip) return;

    targetChip.clear();

    queueMicrotask(() => {
      const remainingButtons = document.querySelectorAll('#activeFilterChips .js-remove-chip');
      if (remainingButtons.length > 0) {
        if (chipIndex < remainingButtons.length) {
          remainingButtons[chipIndex].focus();
        } else {
          remainingButtons[remainingButtons.length - 1].focus();
        }
      } else {
        const heading = document.getElementById('searchResultsHeading');
        if (heading) heading.focus();
      }
    });
  }

  /**
   * Xóa toàn bộ bộ lọc và chuyển tiêu điểm về tiêu đề kết quả.
   */
  async function clearAllFilters() {
    if (isFilterDrawerOpen && draftFilterState) {
      draftFilterState.q = '';
      draftFilterState.ranks = [];
      draftFilterState.cfp = 'all';
      draftFilterState.month = '';
      draftFilterState.ongoing = false;
      draftFilterState.dateFrom = '';
      draftFilterState.dateTo = '';
      draftFilterState.city = 'all';
      draftFilterState.topics = [];
      draftFilterState.page = 1;
      syncSidebarInputsFromState(draftFilterState);
      const core = getCore();
      const counts = core.computeFacetCounts(baseSearchConferences, draftFilterState, ALL_FACET_KEYS, [], '');
      updateSidebarUI(draftFilterState, counts);
      updateDraftButtonCount();
      return;
    }

    resetFilterStateValues();
    const input = document.getElementById('searchInput');
    if (input) input.value = '';

    syncSidebarInputsFromState(filterState);
    await executePipeline();

    queueMicrotask(() => {
      const heading = document.getElementById('searchResultsHeading');
      if (heading) heading.focus();
    });
  }

  /* ================= 12. KẾT XUẤT THẺ HỘI NGHỊ (DOCUMENT FRAGMENT & INP) ================= */

  /**
   * Tạo HTML cho badge trạng thái CFP đạt chuẩn WCAG 1.4.1.
   * @param {Object} conf
   * @returns {string}
   */
  function renderCfpBadgeHtml(conf) {
    if (conf.cfpStatus === 'closingSoon') {
      return `
        <span class="conference-card__badge conference-card__badge--closing-soon">
          <svg class="conference-card__badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" aria-hidden="true">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          <span>Sắp hết hạn</span>
        </span>
      `;
    }
    if (conf.cfpStatus === 'open') {
      return `
        <span class="conference-card__badge conference-card__badge--open">
          <svg class="conference-card__badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>Đang mở nộp bài</span>
        </span>
      `;
    }
    if (conf.cfpStatus === 'closed') {
      return `
        <span class="conference-card__badge conference-card__badge--closed">
          <svg class="conference-card__badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
            <rect x="3" y="11" width="18" height="11" rx="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <span>Đã đóng</span>
        </span>
      `;
    }
    return `
      <span class="conference-card__badge conference-card__badge--unknown">
        <svg class="conference-card__badge-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <span>Chưa rõ hạn nộp</span>
      </span>
    `;
  }

  /**
   * Tạo chuỗi HTML thẻ hội nghị hoàn chỉnh.
   * @param {Object} conf
   * @param {Array<string>} savedIds
   * @param {string} rawQuery
   * @returns {string}
   */
  /**
   * Trích xuất thông tin tiêu đề, ngày và nhãn đếm ngược hạn nộp bài cho thẻ kết quả tìm kiếm.
   * @param {Object} conf - Đối tượng hội nghị chuẩn hóa.
   * @returns {{ deadlineHeader: string, deadlineDateHtml: string, countdownText: string, countdownClass: string }}
   */
  function resolveCardDeadlineSummary(conf) {
    if ((conf.cfpStatus === 'open' || conf.cfpStatus === 'closingSoon') && conf.nextDeadline) {
      const formattedNext = formatIsoToDdMmYyyy(conf.nextDeadline.date);
      return {
        deadlineHeader: conf.nextDeadline.name || 'Hạn nộp tiếp theo',
        deadlineDateHtml:
          `Hạn: <time datetime="${escapeHtml(conf.nextDeadline.date)}">${escapeHtml(formattedNext)}</time>`,
        countdownText: `Còn ${conf.nextDeadline.daysLeft} ngày`,
        countdownClass: conf.cfpStatus === 'closingSoon' ? 'deadline-countdown urgent' : 'deadline-countdown'
      };
    }

    if (conf.cfpStatus === 'closed' && conf.lastDeadline) {
      const formattedLast = formatIsoToDdMmYyyy(conf.lastDeadline.date);
      const passedDays = Math.abs(conf.lastDeadline.daysLeft || 0);
      return {
        deadlineHeader: conf.lastDeadline.name || 'Hạn nộp cuối',
        deadlineDateHtml:
          `Đã đóng ngày <time datetime="${escapeHtml(conf.lastDeadline.date)}">${escapeHtml(formattedLast)}</time>`,
        countdownText: passedDays > 0 ? `Đã qua ${passedDays} ngày` : 'Đã qua hạn nộp bài',
        countdownClass: 'deadline-countdown closed'
      };
    }

    return {
      deadlineHeader: 'Hạn nộp bài',
      deadlineDateHtml: '<span>Chưa công bố hạn nộp</span>',
      countdownText: 'Chưa công bố hạn nộp',
      countdownClass: 'deadline-countdown closed'
    };
  }

  /**
   * Tạo chuỗi HTML phần đầu thẻ hội nghị (avatar, tên, nhãn Rank / CFP / giai đoạn).
   * @param {Object} conf - Đối tượng hội nghị chuẩn hóa.
   * @param {Object} core - Tham chiếu window.ConfGuideSearchCore.
   * @param {string} rawQuery - Từ khóa tìm kiếm thô để tô sáng.
   * @returns {string} Chuỗi HTML `.conference-card__head`.
   */
  function buildCardHeadHtml(conf, core, rawQuery) {
    const fallbackBadge =
      `<div class="conf-badge-logo conference-card__avatar" aria-hidden="true">`
      + `${escapeHtml((conf.name || 'CG').slice(0, 4).toUpperCase())}</div>`;
    const avatarHtml = window.ConfGuideUtils && typeof window.ConfGuideUtils.renderConferenceAvatar === 'function'
      ? window.ConfGuideUtils.renderConferenceAvatar(conf, 'conference-card__avatar')
      : fallbackBadge;

    const rankSlugMap = { 'A*': 'astar', A: 'a', B: 'b', C: 'c' };
    const rankMod = conf.rank ? rankSlugMap[conf.rank] : '';
    const rankBadgeCls = `conference-card__badge conference-card__badge--rank conference-card__badge--rank-${rankMod}`;
    const rankBadgeHtml = conf.rank && rankMod
      ? `<span class="${rankBadgeCls}">Rank ${escapeHtml(conf.rank)}</span>`
      : '';

    const cfpBadgeHtml = renderCfpBadgeHtml(conf);
    let phaseBadgeHtml = '';
    if (conf.eventPhase === 'ongoing') {
      phaseBadgeHtml = '<span class="conference-card__badge conference-card__badge--ongoing">Đang diễn ra</span>';
    } else if (conf.eventPhase === 'ended') {
      phaseBadgeHtml = '<span class="conference-card__badge conference-card__badge--ended">Đã kết thúc</span>';
    }

    const fullTitleText = conf.fullName || conf.name || 'Chưa cập nhật';
    return `
      <div class="conference-card__head">
        ${avatarHtml}
        <div class="conference-card__title-block">
          <div class="card-title-row">
            <h3>
              <a href="detail.html?id=${encodeURIComponent(conf.id)}">${core.highlightMatches(conf.name, rawQuery)}</a>
            </h3>
            <div class="conference-card__badges">
              ${rankBadgeHtml}
              ${cfpBadgeHtml}
              ${phaseBadgeHtml}
            </div>
          </div>
          <div class="card-full-name" title="${escapeHtml(fullTitleText)}">
            ${core.highlightMatches(fullTitleText, rawQuery)}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Tạo chuỗi HTML thẻ hội nghị hoàn chỉnh.
   * @param {Object} conf - Đối tượng hội nghị chuẩn hóa.
   * @param {Array<string>} savedIds - Danh sách ID hội nghị đã lưu.
   * @param {string} rawQuery - Từ khóa tìm kiếm thô để tô sáng khớp từ khóa.
   * @returns {string} Chuỗi HTML `<article class="conference-card ...">`.
   */
  function renderCardMarkup(conf, savedIds, rawQuery) {
    const core = getCore();
    const confId = conf.id;
    const isSaved = savedIds.includes(confId);
    const cfpModifierMap = { open: 'open', closingSoon: 'closing-soon', closed: 'closed', unknown: 'unknown' };
    const cfpMod = cfpModifierMap[conf.cfpStatus] || 'unknown';
    const deadlineMeta = resolveCardDeadlineSummary(conf);

    const topicsHtml = Array.isArray(conf.topics) && conf.topics.length > 0
      ? conf.topics.map(tKey => {
          const topicLabel = TOPIC_LABEL_MAP[tKey] || tKey;
          return `<span class="tag-field conference-card__topic">${core.highlightMatches(topicLabel, rawQuery)}</span>`;
        }).join('')
      : '<span class="tag-field conference-card__topic">Chưa phân loại chủ đề</span>';

    const locationText = conf.location && String(conf.location).trim() !== ''
      ? String(conf.location).trim()
      : 'Chưa rõ';
    const eventDateText = formatEventDateRange(conf.startDate, conf.endDate);
    const compareBtnHtml = window.ConfGuideCompare && typeof window.ConfGuideCompare.renderToggleButton === 'function'
      ? window.ConfGuideCompare.renderToggleButton(conf)
      : '';

    return `
      <article class="conference-card search-conf-card conference-card--cfp-${cfpMod}" data-id="${escapeHtml(confId)}">
        <div class="card-main-col">
          ${buildCardHeadHtml(conf, core, rawQuery)}

          <div class="card-meta-row">
            <span class="card-meta-item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" aria-hidden="true">
                <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span>${core.highlightMatches(locationText, rawQuery)}</span>
            </span>
            <span class="card-meta-item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2"></rect>
                <path d="M16 2v4M8 2v4M3 10h18"></path>
              </svg>
              <span>${escapeHtml(eventDateText)}</span>
            </span>
          </div>

          <div class="card-tags">${topicsHtml}</div>
        </div>

        <div class="card-action-col">
          <div class="deadline-indicator">
            <span class="deadline-label" title="${escapeHtml(deadlineMeta.deadlineHeader)}">
              ${escapeHtml(deadlineMeta.deadlineHeader)}
            </span>
            <span class="deadline-val">${deadlineMeta.deadlineDateHtml}</span>
            <span class="${deadlineMeta.countdownClass}">${escapeHtml(deadlineMeta.countdownText)}</span>
          </div>

          <div class="card-buttons-group">
            <a href="detail.html?id=${encodeURIComponent(confId)}" class="btn-card-detail">
              Xem chi tiết &rarr;
            </a>
            <button type="button" class="btn-card-save js-card-save ${isSaved ? 'saved' : ''}"
              data-save-id="${escapeHtml(confId)}" aria-pressed="${isSaved ? 'true' : 'false'}">
              <svg width="14" height="14" viewBox="0 0 24 24"
                fill="${isSaved ? 'currentColor' : 'none'}" stroke="currentColor"
                stroke-width="2" aria-hidden="true">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              </svg>
              <span>${isSaved ? 'Đã lưu' : 'Lưu lại'}</span>
            </button>
            ${compareBtnHtml}
          </div>
        </div>
      </article>
    `;
  }

  /**
   * Kết xuất các thẻ hội nghị vào DocumentFragment theo lô (chống giật khi danh sách > 60 thẻ).
   * @param {Array<Object>} pageItems - Các hội nghị trong trang hiện tại.
   * @param {Array<string>} savedIds - ID các hội nghị đã lưu.
   * @param {number} currentToken - Mã lượt render hiện hành.
   * @returns {Promise<DocumentFragment|null>} Fragment chứa các thẻ hoặc null nếu lượt bị hủy.
   */
  async function buildConferenceCardsFragment(pageItems, savedIds, currentToken) {
    const fragment = document.createDocumentFragment();
    const batchTemplate = document.createElement('template');
    const BATCH_RENDER = 60;

    if (pageItems.length <= BATCH_RENDER) {
      if (currentToken !== renderToken) return null;
      batchTemplate.innerHTML = pageItems.map(conf => renderCardMarkup(conf, savedIds, filterState.q).trim()).join('');
      fragment.appendChild(batchTemplate.content);
      return fragment;
    }

    for (let i = 0; i < pageItems.length; i += BATCH_RENDER) {
      if (currentToken !== renderToken) return null;
      const batch = pageItems.slice(i, i + BATCH_RENDER);
      batchTemplate.innerHTML = batch.map(conf => renderCardMarkup(conf, savedIds, filterState.q).trim()).join('');
      fragment.appendChild(batchTemplate.content);
      if (i + BATCH_RENDER < pageItems.length) {
        await getCore().yieldToMain();
      }
    }
    return fragment;
  }

  /**
   * Kết xuất danh sách thẻ hội nghị hoặc trạng thái rỗng không ngõ cụt.
   * Hỗ trợ nhường luồng yieldToMain khi số lượng thẻ > 60 (vẽ theo lô 60).
   * @param {Array<Object>} conferences - Danh sách hội nghị đã lọc và sắp xếp.
   * @param {number} currentToken - Mã lượt render hiện hành.
   * @returns {Promise<void>}
   */
  async function renderConferenceListUI(conferences, currentToken) {
    const container = document.getElementById('conferenceList');
    const emptyState = document.getElementById('emptyState');
    const pagination = document.getElementById('pagination');
    if (!container) return;

    if (conferences.length === 0) {
      lastRenderedConferenceIds = null;
      container.replaceChildren();
      container.setAttribute('hidden', '');
      if (pagination) pagination.setAttribute('hidden', '');
      renderEmptyStateUI();
      return;
    }

    if (emptyState) emptyState.setAttribute('hidden', '');
    container.removeAttribute('hidden');
    container.setAttribute('aria-busy', 'false');

    const pageCount = Math.ceil(conferences.length / PAGE_SIZE);
    filterState.page = Math.min(Math.max(1, filterState.page), pageCount);
    const startIdx = (filterState.page - 1) * PAGE_SIZE;
    const pageItems = conferences.slice(startIdx, startIdx + PAGE_SIZE);

    // Tối ưu INP: bỏ qua dựng lại DOM nếu danh sách ID hiển thị không đổi
    const currentIds = pageItems.map(c => c.id).join(',');
    if (currentIds !== lastRenderedConferenceIds) {
      lastRenderedConferenceIds = currentIds;
      const fragment = await buildConferenceCardsFragment(pageItems, getSavedList(), currentToken);
      if (fragment && currentToken === renderToken) {
        container.replaceChildren(fragment);
      }
    }

    if (window.ConfGuideCompare && typeof window.ConfGuideCompare.syncAllUi === 'function') {
      window.ConfGuideCompare.syncAllUi();
    }

    if (pagination) {
      if (pageCount <= 1) {
        pagination.setAttribute('hidden', '');
        pagination.innerHTML = '';
      } else {
        pagination.removeAttribute('hidden');
        renderPaginationUI(pagination, conferences.length, pageCount);
      }
    }
  }

  /**
   * Kết xuất trạng thái rỗng không ngõ cụt: nguyên nhân, nới lỏng, gợi ý chính tả và liên kết đề xuất.
   */
  function renderEmptyStateUI() {
    const emptyState = document.getElementById('emptyState');
    const causeEl = document.getElementById('emptyStateCause');
    const suggestionsEl = document.getElementById('emptyStateSuggestions');
    const spellingWrapper = document.getElementById('emptySpellingSuggestion');
    const spellingBtn = document.getElementById('btnSpellingSuggestion');
    if (!emptyState) return;

    emptyState.removeAttribute('hidden');
    const core = getCore();
    const groupCounts = getGroupActiveCounts(filterState);
    const hasQuery = Boolean(filterState.q);
    const hasFilters = groupCounts.total > 0;

    // 1. Nguyên nhân
    if (causeEl) {
      if (hasQuery && hasFilters) {
        causeEl.textContent = `Không tìm thấy hội nghị nào khớp với từ khóa "${filterState.q}" và tổ hợp các bộ lọc đang chọn.`;
      } else if (hasQuery) {
        causeEl.textContent = `Không tìm thấy hội nghị nào khớp với từ khóa "${filterState.q}".`;
      } else {
        causeEl.textContent = 'Tổ hợp các bộ lọc đang chọn quá hẹp, không có hội nghị nào thỏa mãn tất cả tiêu chí.';
      }
    }

    // 2. Gợi ý nới lỏng
    const relaxData = core.getRelaxSuggestions(baseSearchConferences, filterState, filterState.q);
    if (suggestionsEl) {
      if (relaxData.relaxations.length > 0) {
        const fragment = document.createDocumentFragment();
        relaxData.relaxations.forEach(item => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'empty-state__suggestion-btn js-relax-filter';
          btn.dataset.groupKey = item.groupKey;
          btn.innerHTML = `<span>Bỏ ${escapeHtml(item.label)} &rarr; còn <strong>${item.count}</strong> hội nghị</span>`;
          fragment.appendChild(btn);
        });
        suggestionsEl.replaceChildren(fragment);
        suggestionsEl.removeAttribute('hidden');
      } else {
        suggestionsEl.innerHTML = '';
        suggestionsEl.setAttribute('hidden', '');
      }
    }

    // 3. Gợi ý chính tả (Damerau-Levenshtein)
    if (spellingWrapper && spellingBtn) {
      if (relaxData.spellingSuggestion) {
        spellingBtn.textContent = relaxData.spellingSuggestion;
        spellingBtn.dataset.suggestion = relaxData.spellingSuggestion;
        spellingWrapper.removeAttribute('hidden');
      } else {
        spellingWrapper.setAttribute('hidden', '');
      }
    }
  }

  /**
   * Kết xuất thanh phân trang.
   * @param {HTMLElement} host
   * @param {number} total
   * @param {number} pageCount
   */
  function renderPaginationUI(host, total, pageCount) {
    const cur = filterState.page;
    host.innerHTML = `
      <button type="button" class="pagination-button js-page-step" data-page-step="-1" ${cur === 1 ? 'disabled' : ''} aria-label="Trang trước">&lsaquo;</button>
      <label class="pagination-jump" for="pageJump">Trang
        <input id="pageJump" class="js-page-jump" type="number" inputmode="numeric" min="1" max="${pageCount}" value="${cur}" aria-label="Chuyển đến trang">
        <span>/ ${pageCount}</span>
      </label>
      <button type="button" class="pagination-button js-page-step" data-page-step="1" ${cur === pageCount ? 'disabled' : ''} aria-label="Trang sau">&rsaquo;</button>
      <span class="pagination-total">${total} hội nghị</span>
    `;
  }

  /**
   * Chuyển đến trang chỉ định và cuộn nhẹ lên đầu danh sách.
   * @param {number|string} pageNum
   */
  function goToPage(pageNum) {
    const req = Number.parseInt(pageNum, 10);
    const pageCount = Math.ceil(filteredConferences.length / PAGE_SIZE);
    if (!Number.isFinite(req) || pageCount < 1) return;
    filterState.page = Math.min(pageCount, Math.max(1, req));

    const listEl = document.getElementById('conferenceList');
    if (listEl) {
      listEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  /**
   * Thông báo trạng thái kết quả tra cứu tới trình đọc màn hình với debounce 500ms.
   * @param {number} count
   */
  function announceStatusDebounced(count) {
    if (statusAnnounceTimer) clearTimeout(statusAnnounceTimer);
    statusAnnounceTimer = setTimeout(() => {
      const statusEl = document.querySelector('.js-search-status');
      if (statusEl) {
        if (count > 0) {
          statusEl.textContent = `Đã tìm thấy ${count} hội nghị phù hợp.`;
        } else {
          statusEl.textContent = 'Không tìm thấy hội nghị phù hợp.';
        }
      }
    }, DEBOUNCE_STATUS_MS);
  }

  /* ================= 13. COMBOBOX TÌM KIẾM THEO CHUẨN W3C APG ================= */

  /**
   * Thu thập tối đa 8 gợi ý (chủ đề + hội nghị) khớp với chuỗi nhập trong combobox.
   * @param {string} trimmed - Từ khóa người dùng đã trim.
   * @param {Object} core - Tham chiếu window.ConfGuideSearchCore.
   * @returns {Array<Object>} Danh sách gợi ý để hiển thị trong danh sách thả xuống.
   */
  function collectComboboxSuggestions(trimmed, core) {
    const normQ = core.normalizeText(trimmed);
    const qTokens = core.tokenizeQuery(trimmed);

    const confMatches = [];
    indexedConferences.forEach(conf => {
      const res = core.scoreConference(conf, qTokens, trimmed);
      if (res.matched) {
        confMatches.push({
          type: 'conference',
          name: conf.name,
          fullName: conf.fullName || '',
          score: res.score
        });
      }
    });
    confMatches.sort((a, b) => b.score - a.score);

    const topicMatches = TOPIC_RULES
      .filter(rule => core.normalizeText(rule.label).includes(normQ) || rule.key.includes(normQ))
      .map(rule => ({ type: 'topic', key: rule.key, label: rule.label }));

    return [...topicMatches, ...confMatches].slice(0, 8);
  }

  /**
   * Cập nhật danh sách gợi ý của combobox khi người dùng gõ từ khóa.
   * @param {string} rawInput - Chuỗi văn bản thô trong ô tìm kiếm.
   */
  function updateComboboxSuggestions(rawInput) {
    const listEl = document.getElementById('searchComboboxList');
    const inputEl = document.getElementById('searchInput');
    const statusEl = document.querySelector('.js-combobox-status');
    if (!listEl || !inputEl) return;

    const trimmed = (rawInput || '').trim();
    if (trimmed.length < 2) {
      closeCombobox();
      return;
    }

    const core = getCore();
    comboboxSuggestions = collectComboboxSuggestions(trimmed, core);
    if (comboboxSuggestions.length === 0) {
      closeCombobox();
      return;
    }

    activeComboboxIndex = -1;
    inputEl.removeAttribute('aria-activedescendant');
    inputEl.setAttribute('aria-expanded', 'true');

    const fragment = document.createDocumentFragment();
    comboboxSuggestions.forEach((item, idx) => {
      const li = document.createElement('li');
      li.id = `combobox-opt-${idx}`;
      li.className = 'search-combobox__item js-combobox-item';
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');
      li.dataset.index = String(idx);

      li.innerHTML = item.type === 'conference'
        ? `<span class="search-combobox__name">${core.highlightMatches(item.name, trimmed)}</span>`
          + `<span class="search-combobox__sub">${escapeHtml(item.fullName)}</span>`
        : `<span class="search-combobox__tag">Chủ đề:</span>`
          + `<span class="search-combobox__name">${core.highlightMatches(item.label, trimmed)}</span>`;
      fragment.appendChild(li);
    });

    listEl.replaceChildren(fragment);
    listEl.removeAttribute('hidden');
    if (statusEl) statusEl.textContent = `Có ${comboboxSuggestions.length} gợi ý`;
  }

  /**
   * Đóng combobox gợi ý và xóa activedescendant.
   */
  function closeCombobox() {
    const listEl = document.getElementById('searchComboboxList');
    const inputEl = document.getElementById('searchInput');
    const statusEl = document.querySelector('.js-combobox-status');

    if (listEl) {
      listEl.setAttribute('hidden', '');
      listEl.replaceChildren();
    }
    if (inputEl) {
      inputEl.setAttribute('aria-expanded', 'false');
      inputEl.removeAttribute('aria-activedescendant');
    }
    if (statusEl) {
      statusEl.textContent = '';
    }
    activeComboboxIndex = -1;
    comboboxSuggestions = [];
  }

  /**
   * Làm nổi bật một mục trong combobox và cập nhật aria-activedescendant.
   * @param {number} index
   */
  function highlightComboboxItem(index) {
    const listEl = document.getElementById('searchComboboxList');
    const inputEl = document.getElementById('searchInput');
    if (!listEl || !inputEl || comboboxSuggestions.length === 0) return;

    const items = listEl.querySelectorAll('.js-combobox-item');
    items.forEach((item, idx) => {
      const isActive = idx === index;
      item.classList.toggle('is-active', isActive);
      item.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    if (index >= 0 && index < items.length) {
      activeComboboxIndex = index;
      inputEl.setAttribute('aria-activedescendant', items[index].id);
      items[index].scrollIntoView({ block: 'nearest' });
    } else {
      activeComboboxIndex = -1;
      inputEl.removeAttribute('aria-activedescendant');
    }
  }

  /**
   * Chọn mục gợi ý trong combobox.
   * @param {number} index
   */
  function selectComboboxItem(index) {
    const item = comboboxSuggestions[index];
    if (!item) return;

    const inputEl = document.getElementById('searchInput');
    if (item.type === 'conference') {
      if (inputEl) inputEl.value = item.name;
      filterState.q = item.name;
    } else if (item.type === 'topic') {
      if (inputEl) inputEl.value = '';
      filterState.q = '';
      filterState.topics = [item.key];
    }
    filterState.page = 1;
    closeCombobox();
  }

  /* ================= 14. NGĂN KÉO BỘ LỌC DI ĐỘNG (MOBILE DRAWER) ================= */

  /**
   * Mở ngăn kéo bộ lọc trên thiết bị di động (<= 767px).
   */
  function openFiltersDrawer() {
    isFilterDrawerOpen = true;
    const sidebar = document.getElementById('filtersSidebar');
    const backdrop = document.getElementById('filtersBackdrop');
    const triggerBtn = document.getElementById('btnOpenFiltersDrawer');
    const closeBtn = document.getElementById('btnCloseFiltersDrawer');

    // Tạo bản nháp trạng thái lọc độc lập
    draftFilterState = {
      q: filterState.q,
      ranks: [...filterState.ranks],
      cfp: filterState.cfp,
      month: filterState.month,
      ongoing: filterState.ongoing,
      dateFrom: filterState.dateFrom,
      dateTo: filterState.dateTo,
      city: filterState.city,
      topics: [...filterState.topics],
      sort: filterState.sort,
      page: 1
    };

    if (sidebar) {
      sidebar.classList.add('is-drawer-open');
      sidebar.setAttribute('role', 'dialog');
      sidebar.setAttribute('aria-modal', 'true');
      sidebar.setAttribute('aria-labelledby', 'filtersDrawerTitle');
    }
    if (backdrop) backdrop.removeAttribute('hidden');
    document.body.classList.add('has-filter-drawer', 'is-filter-drawer-open');
    if (triggerBtn) triggerBtn.setAttribute('aria-expanded', 'true');

    togglePageInert(true);
    updateDraftButtonCount();

    if (closeBtn) closeBtn.focus();
  }

  /**
   * Đóng ngăn kéo bộ lọc di động (áp dụng bản nháp hoặc hủy bỏ).
   * @param {boolean} applyChanges
   */
  function closeFiltersDrawer(applyChanges = false) {
    if (!isFilterDrawerOpen) return;
    isFilterDrawerOpen = false;

    const sidebar = document.getElementById('filtersSidebar');
    const backdrop = document.getElementById('filtersBackdrop');
    const triggerBtn = document.getElementById('btnOpenFiltersDrawer');

    if (applyChanges && draftFilterState) {
      // Gán một lần các trường từ bản nháp vào filterState
      filterState.q = draftFilterState.q;
      filterState.ranks = [...draftFilterState.ranks];
      filterState.cfp = draftFilterState.cfp;
      filterState.month = draftFilterState.month;
      filterState.ongoing = draftFilterState.ongoing;
      filterState.dateFrom = draftFilterState.dateFrom;
      filterState.dateTo = draftFilterState.dateTo;
      filterState.city = draftFilterState.city;
      filterState.topics = [...draftFilterState.topics];
      filterState.page = 1;
    } else {
      // Hủy bỏ: khôi phục giao diện sidebar về đúng filterState thực
      syncSidebarInputsFromState(filterState);
      const core = getCore();
      const qTokens = core.tokenizeQuery(filterState.q);
      const counts = core.computeFacetCounts(
        baseSearchConferences,
        filterState,
        ALL_FACET_KEYS,
        qTokens,
        filterState.q
      );
      updateSidebarUI(filterState, counts);
    }

    draftFilterState = null;

    if (sidebar) {
      sidebar.classList.remove('is-drawer-open');
      sidebar.removeAttribute('role');
      sidebar.removeAttribute('aria-modal');
      sidebar.removeAttribute('aria-labelledby');
    }
    if (backdrop) backdrop.setAttribute('hidden', '');
    document.body.classList.remove('has-filter-drawer', 'is-filter-drawer-open');
    if (triggerBtn) triggerBtn.setAttribute('aria-expanded', 'false');

    togglePageInert(false);

    if (triggerBtn) triggerBtn.focus();
  }

  /**
   * Bật/tắt thuộc tính inert cho các phần tử ngoài drawer.
   * @param {boolean} isInert
   */
  function togglePageInert(isInert) {
    const targets = [
      document.getElementById('site-header'),
      document.querySelector('.search-hero'),
      document.querySelector('.results'),
      document.getElementById('site-footer'),
      document.getElementById('toast')
    ];
    targets.forEach(el => {
      if (el) {
        if (isInert) el.setAttribute('inert', '');
        else el.removeAttribute('inert');
      }
    });
  }

  /**
   * Cập nhật số kết quả trên nút "Áp dụng (N kết quả)" theo bản nháp.
   */
  function updateDraftButtonCount() {
    if (!draftFilterState) return;
    const core = getCore();
    const qTokens = core.tokenizeQuery(draftFilterState.q);
    const count = baseSearchConferences.filter(conf => {
      if (qTokens.length > 0 && !core.scoreConference(conf, qTokens, draftFilterState.q).matched) {
        return false;
      }
      return core.matchesFilters(conf, draftFilterState, ENABLED_FILTER_GROUPS);
    }).length;

    const label = document.querySelector('.js-apply-filters-label');
    if (label) {
      label.textContent = `Áp dụng (${count} kết quả)`;
    }
  }

  /* ================= 15. GẮN SỰ KIỆN TĨNH & EVENT DELEGATION ================= */

  /**
   * Đồng bộ số đếm trước và nút Áp dụng nháp khi ngăn kéo bộ lọc di động đang mở.
   * @param {Object} targetState - Trạng thái bộ lọc đang thao tác.
   */
  function refreshDrawerDraftUI(targetState) {
    if (!isFilterDrawerOpen) return;
    const core = getCore();
    const qTokens = core.tokenizeQuery(targetState.q);
    const counts = core.computeFacetCounts(
      baseSearchConferences,
      targetState,
      ALL_FACET_KEYS,
      qTokens,
      targetState.q
    );
    updateSidebarUI(targetState, counts);
    updateDraftButtonCount();
  }

  /**
   * Điều phối các phím điều hướng ARIA Combobox trên `#searchInput`.
   * @param {KeyboardEvent} event - Sự kiện bàn phím.
   * @param {HTMLInputElement} searchInput - Ô nhập tìm kiếm.
   */
  function handleComboboxKeydown(event, searchInput) {
    const isExpanded = searchInput.getAttribute('aria-expanded') === 'true';
    const len = comboboxSuggestions.length;
    if (event.key === 'ArrowDown') {
      if (!isExpanded) updateComboboxSuggestions(searchInput.value);
      else { event.preventDefault(); highlightComboboxItem((activeComboboxIndex + 1) % len); }
    } else if (event.key === 'ArrowUp' && isExpanded) {
      event.preventDefault();
      highlightComboboxItem(activeComboboxIndex <= 0 ? len - 1 : activeComboboxIndex - 1);
    } else if (event.key === 'Home' && isExpanded && activeComboboxIndex >= 0) {
      event.preventDefault();
      highlightComboboxItem(0);
    } else if (event.key === 'End' && isExpanded && activeComboboxIndex >= 0) {
      event.preventDefault();
      highlightComboboxItem(len - 1);
    } else if (event.key === 'Enter' && isExpanded && activeComboboxIndex >= 0) {
      event.preventDefault();
      selectComboboxItem(activeComboboxIndex);
    } else if (event.key === 'Escape' && isExpanded) {
      event.preventDefault();
      closeCombobox();
    }
  }

  /**
   * Gắn sự kiện ô tìm kiếm, combobox gợi ý và chip từ khóa gợi ý nhanh.
   */
  function bindSearchComboboxEvents() {
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');
    const comboboxList = document.getElementById('searchComboboxList');

    if (searchForm) {
      searchForm.addEventListener('submit', event => {
        event.preventDefault();
        if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
        filterState.q = searchInput ? searchInput.value.trim() : '';
        filterState.page = 1;
        closeCombobox();
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
          updateComboboxSuggestions(searchInput.value);
          filterState.q = searchInput.value.trim();
          filterState.page = 1;
        }, DEBOUNCE_SEARCH_MS);
      });
      searchInput.addEventListener('keydown', event => handleComboboxKeydown(event, searchInput));
    }

    if (comboboxList) {
      comboboxList.addEventListener('click', event => {
        const itemEl = event.target.closest('.js-combobox-item');
        const idx = itemEl ? Number.parseInt(itemEl.dataset.index, 10) : NaN;
        if (Number.isFinite(idx)) selectComboboxItem(idx);
      });
    }

    document.addEventListener('click', event => {
      if (searchForm && !searchForm.contains(event.target)) closeCombobox();
    });

    document.querySelectorAll('.js-search-keyword').forEach(btn => {
      btn.addEventListener('click', () => {
        const kw = (btn.getAttribute('data-keyword') || '').trim();
        const nextQ = filterState.q.toLowerCase() === kw.toLowerCase() ? '' : kw;
        if (searchInput) searchInput.value = nextQ;
        filterState.q = nextQ;
        filterState.page = 1;
      });
    });
  }

  /**
   * Xử lý thay đổi điều khiển đầu vào (checkbox, select, date) bên trong thanh bên bộ lọc.
   * @param {Event} event - Sự kiện change từ `#filtersSidebar`.
   * @param {HTMLElement} sidebar - Phần tử `#filtersSidebar`.
   */
  function handleSidebarChangeEvent(event, sidebar) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const targetState = isFilterDrawerOpen && draftFilterState ? draftFilterState : filterState;

    if (target.classList.contains('js-filter-cfp') && target instanceof HTMLInputElement) {
      targetState.cfp = target.value === 'all' ? 'all' : (target.checked ? target.value : 'all');
    } else if (target.classList.contains('js-filter-month') && target instanceof HTMLSelectElement) {
      targetState.month = target.value;
    } else if (target.classList.contains('js-filter-ongoing') && target instanceof HTMLInputElement) {
      targetState.ongoing = target.checked;
    } else if (target.classList.contains('js-date-from') && target instanceof HTMLInputElement) {
      targetState.dateFrom = normalizeIsoDate(target.value) || '';
    } else if (target.classList.contains('js-date-to') && target instanceof HTMLInputElement) {
      targetState.dateTo = normalizeIsoDate(target.value) || '';
    } else if (target.classList.contains('js-filter-city') && target instanceof HTMLInputElement) {
      targetState.city = target.value === 'all' ? 'all' : (target.checked ? target.value : 'all');
    } else if (target.classList.contains('js-filter-topic') && target instanceof HTMLInputElement) {
      targetState.topics = [...sidebar.querySelectorAll('.js-filter-topic:checked')]
        .map(cb => cb.value)
        .filter(v => VALID_TOPIC_VALUES.has(v));
    } else {
      return;
    }

    targetState.page = 1;
    syncSidebarInputsFromState(targetState);
    refreshDrawerDraftUI(targetState);
  }

  /**
   * Xử lý click accordion, nút Rank, preset ngày, xóa nhóm và điều khiển drawer trên thanh bên.
   * @param {MouseEvent} event - Sự kiện click từ `#filtersSidebar`.
   */
  function handleSidebarClickEvent(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const toggleBtn = target.closest('.js-filter-toggle');
    if (toggleBtn) {
      const accGroup = toggleBtn.closest('.js-filter-accordion');
      if (accGroup) setAccordionOpen(accGroup, !accGroup.classList.contains('open'));
      return;
    }

    const clearBtn = target.closest('.js-clear-group');
    if (clearBtn) { clearFilterGroup(clearBtn.getAttribute('data-clear-group') || ''); return; }

    const rankBtn = target.closest('.js-filter-rank');
    if (rankBtn instanceof HTMLButtonElement) {
      if (rankBtn.disabled) return;
      const rankVal = rankBtn.getAttribute('data-rank') || '';
      if (!VALID_RANK_VALUES.has(rankVal)) return;
      const targetState = isFilterDrawerOpen && draftFilterState ? draftFilterState : filterState;
      const currentSet = new Set(Array.isArray(targetState.ranks) ? targetState.ranks : []);
      if (currentSet.has(rankVal)) currentSet.delete(rankVal);
      else currentSet.add(rankVal);
      targetState.ranks = RANK_VALUES.filter(r => currentSet.has(r));
      targetState.page = 1;
      syncSidebarInputsFromState(targetState);
      refreshDrawerDraftUI(targetState);
      return;
    }

    const presetBtn = target.closest('.js-date-preset');
    if (presetBtn) {
      const range = getDatePresetRange(presetBtn.getAttribute('data-preset') || '');
      if (!range) return;
      const targetState = isFilterDrawerOpen && draftFilterState ? draftFilterState : filterState;
      const isActive = targetState.dateFrom === range.from && targetState.dateTo === range.to;
      targetState.dateFrom = isActive ? '' : range.from;
      targetState.dateTo = isActive ? '' : range.to;
      targetState.page = 1;
      syncSidebarInputsFromState(targetState);
      refreshDrawerDraftUI(targetState);
      return;
    }

    if (target.closest('.js-toggle-more-topics')) {
      isTopicsExpanded = !isTopicsExpanded;
      syncTopicOverflowToggle();
      return;
    }
    if (target.closest('.js-filter-reset')) { clearAllFilters(); return; }
    if (target.closest('.js-close-filters-drawer')) { closeFiltersDrawer(false); return; }
    if (target.closest('.js-apply-filters')) closeFiltersDrawer(true);
  }

  /**
   * Gắn sự kiện mở/đóng và tự thu hồi drawer bộ lọc khi đổi kích thước màn hình trên di động.
   */
  function bindFilterDrawerLifecycleEvents() {
    const openDrawerBtn = document.getElementById('btnOpenFiltersDrawer');
    if (openDrawerBtn) openDrawerBtn.addEventListener('click', openFiltersDrawer);

    const drawerBackdrop = document.getElementById('filtersBackdrop');
    if (drawerBackdrop) drawerBackdrop.addEventListener('click', () => closeFiltersDrawer(false));

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && isFilterDrawerOpen) {
        event.preventDefault();
        closeFiltersDrawer(false);
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth >= 768 && isFilterDrawerOpen) closeFiltersDrawer(false);
    }, { passive: true });
  }

  /**
   * Gắn sự kiện trên thanh chip, danh sách thẻ hội nghị, trạng thái rỗng, phân trang và sắp xếp.
   */
  function bindResultsAreaDelegation() {
    const chipsWrapper = document.getElementById('filterChipsWrapper');
    if (chipsWrapper) {
      chipsWrapper.addEventListener('click', event => {
        const target = event.target instanceof HTMLElement ? event.target : null;
        if (!target) return;
        const removeBtn = target.closest('.js-remove-chip');
        if (removeBtn) handleChipRemove(Number.parseInt(removeBtn.getAttribute('data-chip-index') || '0', 10));
        else if (target.closest('.js-filter-reset')) clearAllFilters();
      });
    }

    const confList = document.getElementById('conferenceList');
    if (confList) {
      confList.addEventListener('click', event => {
        const saveBtn = event.target instanceof HTMLElement ? event.target.closest('.js-card-save') : null;
        if (saveBtn) toggleSaveConference(saveBtn.getAttribute('data-save-id') || '', saveBtn);
      });
    }

    const emptyState = document.getElementById('emptyState');
    if (emptyState) {
      emptyState.addEventListener('click', event => {
        const target = event.target instanceof HTMLElement ? event.target : null;
        if (!target) return;
        const relaxBtn = target.closest('.js-relax-filter');
        if (relaxBtn) {
          if (relaxBtn.dataset.groupKey === 'query') {
            const input = document.getElementById('searchInput');
            if (input) input.value = '';
            filterState.q = '';
          } else {
            clearFilterGroup(relaxBtn.dataset.groupKey);
          }
          return;
        }
        const spellBtn = target.closest('.js-spelling-suggestion');
        if (spellBtn) {
          const sug = spellBtn.dataset.suggestion || spellBtn.textContent;
          const input = document.getElementById('searchInput');
          if (input) input.value = sug;
          filterState.q = sug;
          return;
        }
        if (target.closest('.js-filter-reset')) clearAllFilters();
      });
    }

    const pagination = document.getElementById('pagination');
    if (pagination) {
      pagination.addEventListener('click', event => {
        const stepBtn = event.target instanceof HTMLElement ? event.target.closest('.js-page-step') : null;
        if (stepBtn) goToPage(filterState.page + Number.parseInt(stepBtn.getAttribute('data-page-step') || '0', 10));
      });
      pagination.addEventListener('change', event => {
        if (event.target instanceof HTMLInputElement && event.target.classList.contains('js-page-jump')) {
          goToPage(event.target.value);
        }
      });
      pagination.addEventListener('keydown', event => {
        if (event.key === 'Enter'
          && event.target instanceof HTMLInputElement
          && event.target.classList.contains('js-page-jump')) {
          event.preventDefault();
          goToPage(event.target.value);
        }
      });
    }

    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        filterState.sort = VALID_SORT_VALUES.has(sortSelect.value) ? sortSelect.value : 'deadline';
        filterState.page = 1;
      });
    }

    const retryBtn = document.getElementById('btnRetryLoad');
    if (retryBtn) retryBtn.addEventListener('click', loadData);
  }

  /**
   * Khởi tạo toàn bộ sự kiện của trang bằng kỹ thuật Event Delegation trên các phần tử tĩnh.
   */
  function initStaticEvents() {
    bindSearchComboboxEvents();

    const sidebar = document.getElementById('filtersSidebar');
    if (sidebar) {
      sidebar.addEventListener('change', event => handleSidebarChangeEvent(event, sidebar));
      sidebar.addEventListener('click', handleSidebarClickEvent);
    }

    bindFilterDrawerLifecycleEvents();
    bindResultsAreaDelegation();
  }

  /* ================= 16. NẠP DỮ LIỆU & KHỞI TẠO HỆ THỐNG ================= */

  /**
   * Tạo khung skeleton khi đang tải dữ liệu.
   * @returns {string}
   */
  function renderSkeletonCardsHtml() {
    const single = `
      <article class="conference-card search-conf-card conference-card--skeleton" aria-hidden="true">
        <div class="card-main-col">
          <div class="conference-card__head">
            <span class="skeleton-box skeleton-box--thumb"></span>
            <div class="conference-card__title-block">
              <span class="skeleton-box skeleton-box--title"></span>
              <span class="skeleton-box skeleton-box--subtitle"></span>
            </div>
          </div>
          <span class="skeleton-box skeleton-box--meta"></span>
          <span class="skeleton-box skeleton-box--tags"></span>
        </div>
        <div class="card-action-col">
          <span class="skeleton-box skeleton-box--deadline"></span>
          <div class="card-buttons-group">
            <span class="skeleton-box skeleton-box--btn"></span>
            <span class="skeleton-box skeleton-box--btn"></span>
          </div>
        </div>
      </article>
    `;
    return single.repeat(3);
  }

  /**
   * Tải dữ liệu hội nghị từ data/conferences.json kèm try/catch fallback về FALLBACK_CONFERENCES.
   */
  async function loadData() {
    const utils = getUtils();
    const core = getCore();
    const fallbackList = utils && Array.isArray(utils.FALLBACK_CONFERENCES) ? utils.FALLBACK_CONFERENCES : [];
    const container = document.getElementById('conferenceList');
    const errorState = document.getElementById('searchErrorState');

    isDataLoaded = false;
    dataLoadError = null;

    if (container) {
      container.removeAttribute('hidden');
      container.setAttribute('aria-busy', 'true');
      container.innerHTML = renderSkeletonCardsHtml();
    }
    if (errorState) errorState.setAttribute('hidden', '');

    let rawList = [];
    try {
      const utils = getUtils();
      const data = utils && typeof utils.fetchJsonCached === 'function'
        ? await utils.fetchJsonCached('data/conferences.json')
        : await fetch('data/conferences.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
      if (!Array.isArray(data) || data.length === 0) throw new Error('Dữ liệu trống');
      rawList = data;
      isDataLoaded = true;
    } catch (e) {
      if (fallbackList.length > 0) {
        rawList = fallbackList;
        isDataLoaded = true;
      } else {
        dataLoadError = 'Không thể nạp dữ liệu hội nghị. Vui lòng thử lại hoặc kiểm tra kết nối mạng.';
        isDataLoaded = false;
        const msg = document.getElementById('searchErrorMessage');
        if (msg) msg.textContent = dataLoadError;
        if (container) container.setAttribute('hidden', '');
        if (errorState) errorState.removeAttribute('hidden');
        return;
      }
    }

    // 1. Chuẩn hóa bản ghi 1 lần duy nhất
    allNormalizedConferences = rawList.map(item => normalizeConference(item)).filter(Boolean);

    // 2. Sử dụng toàn bộ 100% bản ghi hội nghị (kể cả bản ghi chưa đủ dữ liệu)
    hiddenEmptyCount = 0;
    baseSearchConferences = allNormalizedConferences;

    // 4. Xây dựng chỉ mục tìm kiếm và khớp mờ 1 lần duy nhất bằng ConfGuideSearchCore
    indexedConferences = core.buildIndex(baseSearchConferences);
    baseSearchConferences = indexedConferences;

    // 5. Điền danh sách tùy chọn Tháng diễn ra
    populateMonthOptions();

    // 6. Đồng bộ trạng thái hiển thị ô tìm kiếm, sidebar & accordions
    syncSidebarInputsFromState(filterState);
    syncInitialAccordionStates();

    // 7. Kích hoạt luồng lọc và vẽ giao diện
    await executePipeline();
  }

  /**
   * Tạo các phần tử <option> cho thẻ select Tháng diễn ra theo dữ liệu thực.
   */
  function populateMonthOptions() {
    const monthSelect = document.getElementById('monthSelect');
    if (!monthSelect) return;

    const monthMap = new Map();
    baseSearchConferences.forEach(conf => {
      const m = conf.eventMonth || 'unknown';
      monthMap.set(m, (monthMap.get(m) || 0) + 1);
    });

    const sortedMonths = [...monthMap.entries()]
      .filter(([key, count]) => key !== 'unknown' && count > 0)
      .sort((a, b) => a[0].localeCompare(b[0]));

    const unknownCount = monthMap.get('unknown') || 0;
    validMonthValues = new Set(sortedMonths.map(([k]) => k));
    if (unknownCount > 0) validMonthValues.add('unknown');

    let html = `<option value="">Tất cả các tháng (${baseSearchConferences.length})</option>`;
    sortedMonths.forEach(([mKey, count]) => {
      html += `<option value="${escapeHtml(mKey)}">${escapeHtml(formatMonthLabel(mKey))} (${count})</option>`;
    });
    if (unknownCount > 0) {
      html += `<option value="unknown">Chưa có ngày (${unknownCount})</option>`;
    }

    monthSelect.innerHTML = html;
  }

  // Khởi tạo khi DOM đã sẵn sàng
  document.addEventListener('DOMContentLoaded', () => {
    readUrlIntoFilterState();
    syncSearchInputFromState(filterState);
    initStaticEvents();
    loadData();
  });
})();
