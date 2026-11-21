/**
 * ConfGuide — Kịch bản Trang Tra cứu & Lọc Hội nghị (js/pages/search.js)
 * Trang sử dụng: search.html
 * Phụ thuộc: js/core/page-transition.js, js/core/layout.js, js/components/search-core.js, js/components/compare.js
 * Chức năng: Quản lý trạng thái lọc phản ứng (`filterState` Proxy) theo kiến trúc một chiều,
 * tích hợp lõi tìm kiếm `ConfGuideSearchCore` (chuẩn hóa, khớp mờ Levenshtein, facet pre-counts),
 * tìm kiếm trực tiếp theo từ khóa, ngăn kéo bộ lọc di động (draft state), kết xuất `DocumentFragment`
 * chống giật INP, thanh chip quản lý focus bàn phím và đồng bộ URL 2 chiều an toàn.
 */

(function () {
  'use strict';

  /* ================= 1. HẰNG CẤU HÌNH HỆ THỐNG ================= */

  /** Cấu hình bật/tắt các nhóm bộ lọc hiển thị trên thanh bên */
  const ENABLED_FILTER_GROUPS = {
    rank: true,
    month: true,
    cfp: true,
    mode: true,
    when: true,
    where: true,
    what: true,
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

  const CFP_LABEL_MAP = {
    all: 'Tất cả trạng thái',
    open: 'Đang mở nộp bài',
    closingSoon: 'Sắp hết hạn (≤ 14 ngày)',
    closed: 'Đã đóng đợt nộp',
    unknown: 'Chưa rõ hạn nộp'
  };

  const CITY_LABEL_MAP = {
    all: 'Tất cả địa điểm',
    'ha-noi': 'Hà Nội',
    'ho-chi-minh': 'TP. Hồ Chí Minh',
    other: 'Tỉnh / thành khác'
  };

  const RANK_CATALOG_DEFS = [
    { key: 'A*', label: 'Rank A*' },
    { key: 'A', label: 'Rank A' },
    { key: 'B', label: 'Rank B' },
    { key: 'C', label: 'Rank C' },
    { key: 'unranked', label: 'Chưa xếp hạng' }
  ];
  const RANK_LABEL_MAP = RANK_CATALOG_DEFS.reduce((acc, item) => {
    acc[item.key] = item.label;
    return acc;
  }, {});
  const RANK_VALUES = ['A*', 'A', 'B', 'C'];
  const VALID_RANK_VALUES = new Set(RANK_VALUES);
  const ALL_RANK_KEYS = new Set(RANK_CATALOG_DEFS.map(item => item.key));
  const RANK_WEIGHT = { 'A*': 0, A: 1, B: 2, C: 3 };

  const MODE_CATALOG_DEFS = [
    { key: 'offline', label: 'Trực tiếp' },
    { key: 'hybrid', label: 'Khác' },
    { key: 'online', label: 'Trực tuyến' },
    { key: 'unknown', label: 'Chưa cập nhật' }
  ];
  const MODE_LABEL_MAP = MODE_CATALOG_DEFS.reduce((acc, item) => {
    acc[item.key] = item.label;
    return acc;
  }, {});
  const MODE_ORDER = MODE_CATALOG_DEFS.map(item => item.key);
  const ALL_MODE_KEYS = new Set(MODE_ORDER);

  const VALID_CFP_VALUES = new Set(['all', 'open', 'closingSoon', 'closed', 'unknown']);
  const VALID_CITY_VALUES = new Set(['all', 'ha-noi', 'ho-chi-minh', 'other']);
  const VALID_SORT_VALUES = new Set([
    'deadline',
    'deadline-desc',
    'event',
    'event-desc',
    'fee-asc',
    'fee-desc',
    'rank-desc',
    'rank-asc',
    'name',
    'name-desc'
  ]);

  /** Tập hợp các khóa facet cố định của các nhóm tĩnh */
  const BASE_FACET_KEYS = [
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
  ];

  /* ================= 2. BIẾN TRẠNG THÁI TOÀN CỤC MODULE ================= */

  let rankCatalog = [];
  let validRankKeys = new Set();
  let modeCatalog = [];
  let validModeKeys = new Set();
  let topicCatalog = [];
  let topicLabelMap = {};
  let validTopicValues = new Set();
  let allFacetKeys = [...BASE_FACET_KEYS];

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

  let lastRenderedConferenceIds = null;
  let updateScheduled = false;
  let renderToken = 0;
  let isSearchPrefsBannerDismissed = false;
  let hasSearchPrefsAppliedSortOnly = false;

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
    modes: [],
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
      toTopicSlug: str => String(str || '').toLowerCase().trim(),
      normalizeTopicFields: () => [],
      expandTopicFilterValues: list => (Array.isArray(list) ? list : []),
      buildIndex: list => list,
      scoreConference: () => ({ matched: true, score: 0 }),
      matchesFilters: () => true,
      computeFacetCounts: () => ({}),
      getRelaxSuggestions: () => ({ relaxations: [], spellingSuggestion: null }),
      highlightMatches: txt => escapeHtml(txt),
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
   * Lấy ngày hiện tại dạng ISO YYYY-MM-DD theo múi giờ cố định UTC+7 (Asia/Ho_Chi_Minh).
   * Tái sử dụng ConfGuideUtils.getTodayVnIso khi sẵn có.
   * @returns {string}
   */
  function getTodayIso() {
    const utils = getUtils();
    if (utils && typeof utils.getTodayVnIso === 'function') {
      return utils.getTodayVnIso();
    }
    const offsetMs = (utils && utils.VN_UTC_OFFSET_MS) || 7 * 3600000;
    const vnNow = new Date(Date.now() + offsetMs);
    const year = vnNow.getUTCFullYear();
    const month = String(vnNow.getUTCMonth() + 1).padStart(2, '0');
    const day = String(vnNow.getUTCDate()).padStart(2, '0');
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
   * Kết xuất dùng chung danh sách checkbox bộ lọc (Phân hạng, Hình thức, Lĩnh vực) vào một `<fieldset>`.
   * @param {string} fieldsetId - ID phần tử `<fieldset>`.
   * @param {string} legendText - Nhãn `<legend class="sr-only">` cho trình đọc màn hình.
   * @param {Array<{ key: string, label: string, count: number }>} catalog - Danh sách tùy chọn thực có trong dữ liệu.
   * @param {{ group: string, prefix: string, inputClass: string, inputName: string }} config - Cấu hình định danh nhóm & thuộc tính.
   */
  function renderCheckboxFieldset(fieldsetId, legendText, catalog, config) {
    const fieldset = document.getElementById(fieldsetId);
    if (!fieldset) return;

    const fragment = document.createDocumentFragment();
    const legend = document.createElement('legend');
    legend.className = 'sr-only';
    legend.textContent = legendText;
    fragment.appendChild(legend);

    catalog.forEach(item => {
      const optionKey = `${config.prefix}:${item.key}`;
      const labelEl = document.createElement('label');
      labelEl.className = 'filter-option js-filter-option check-row js-option-row';
      labelEl.setAttribute('data-option-key', optionKey);

      const inputEl = document.createElement('input');
      inputEl.type = 'checkbox';
      inputEl.className = `filter-option__input js-filter-input ${config.inputClass}`;
      inputEl.setAttribute('data-group', config.group);
      inputEl.name = config.inputName;
      inputEl.value = item.key;

      const textSpan = document.createElement('span');
      textSpan.className = 'filter-option__text check-row__label';
      textSpan.textContent = item.label;

      const countSpan = document.createElement('span');
      countSpan.className = 'filter-option__count check-row__count js-filter-count';
      countSpan.setAttribute('data-count-for', optionKey);
      countSpan.textContent = `(${item.count})`;

      labelEl.append(inputEl, textSpan, countSpan);
      fragment.appendChild(labelEl);
    });

    fieldset.replaceChildren(fragment);
  }

  /**
   * Tổng hợp danh mục Phân hạng, Hình thức tổ chức và Lĩnh vực đơn duy nhất thực sự có trong JSON
   * (bỏ qua mọi lựa chọn 0 kết quả ở tập gốc theo dữ liệu thực).
   * @param {Array<Object>} conferences - Danh sách hội nghị đã chuẩn hóa.
   */
  function buildFilterCatalogs(conferences) {
    const list = Array.isArray(conferences) ? conferences : [];
    const rankCounts = new Map();
    const modeCounts = new Map();
    const topicMap = new Map();

    list.forEach(conf => {
      const rKey = conf.rankKey || 'unranked';
      rankCounts.set(rKey, (rankCounts.get(rKey) || 0) + 1);

      const mKey = conf.modeKey || 'unknown';
      modeCounts.set(mKey, (modeCounts.get(mKey) || 0) + 1);

      const items = Array.isArray(conf && conf.topicItems) ? conf.topicItems : [];
      items.forEach(item => {
        if (!item || !item.key || !item.label) return;
        const existing = topicMap.get(item.key);
        if (existing) existing.count += 1;
        else topicMap.set(item.key, { key: item.key, label: item.label, count: 1 });
      });
    });

    rankCatalog = RANK_CATALOG_DEFS
      .map(def => ({ key: def.key, label: def.label, count: rankCounts.get(def.key) || 0 }))
      .filter(item => item.count > 0);
    validRankKeys = new Set(rankCatalog.map(item => item.key));

    modeCatalog = MODE_CATALOG_DEFS
      .map(def => ({ key: def.key, label: def.label, count: modeCounts.get(def.key) || 0 }))
      .filter(item => item.count > 0);
    validModeKeys = new Set(modeCatalog.map(item => item.key));

    topicCatalog = [...topicMap.values()].sort(
      (a, b) => (b.count - a.count) || a.label.localeCompare(b.label, 'vi')
    );
    topicLabelMap = topicCatalog.reduce((acc, item) => {
      acc[item.key] = item.label;
      return acc;
    }, {});
    validTopicValues = new Set(topicCatalog.map(item => item.key));

    allFacetKeys = BASE_FACET_KEYS
      .concat(rankCatalog.map(item => `rank:${item.key}`))
      .concat(modeCatalog.map(item => `mode:${item.key}`))
      .concat(topicCatalog.map(item => `topic:${item.key}`));
  }

  /**
   * Kết xuất các lựa chọn bộ lọc Phân hạng, Hình thức và Lĩnh vực từ dữ liệu thật;
   * đồng thời ẩn các tùy chọn tĩnh có 0 bản ghi trong toàn tập dữ liệu gốc (ví dụ: Đang diễn ra khi = 0).
   */
  function renderDynamicFilterOptions(conferences) {
    renderCheckboxFieldset('rankFieldset', 'Chọn phân hạng CORE của hội nghị', rankCatalog, {
      group: 'rank',
      prefix: 'rank',
      inputClass: 'js-filter-rank',
      inputName: 'rank'
    });
    renderCheckboxFieldset('modeFieldset', 'Chọn hình thức tổ chức hội nghị', modeCatalog, {
      group: 'mode',
      prefix: 'mode',
      inputClass: 'js-filter-mode',
      inputName: 'mode'
    });
    renderCheckboxFieldset('topicFieldset', 'Chọn một hoặc nhiều lĩnh vực nghiên cứu', topicCatalog, {
      group: 'what',
      prefix: 'topic',
      inputClass: 'js-filter-topic',
      inputName: 'topic'
    });

    const core = getCore();
    const emptyState = {
      q: '',
      ranks: [],
      cfp: 'all',
      month: '',
      ongoing: false,
      dateFrom: '',
      dateTo: '',
      modes: [],
      city: 'all',
      topics: []
    };
    const baseCounts = core.computeFacetCounts(conferences, emptyState, BASE_FACET_KEYS, [], '');
    document.querySelectorAll('#accBodyCfp .js-option-row, #cityFieldset .js-option-row, #ongoingOptionRow').forEach(row => {
      const key = row.getAttribute('data-option-key') || '';
      if (!key || key.endsWith(':all')) {
        row.hidden = false;
        return;
      }
      const totalForOption = baseCounts[key] !== undefined ? baseCounts[key] : 0;
      if (totalForOption <= 0) row.setAttribute('hidden', '');
      else row.removeAttribute('hidden');
    });
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
   * Chuẩn hóa mảng mốc deadline của hội nghị (giữ nguyên toàn bộ trường dữ liệu gốc, không làm mất mốc nào).
   * @param {Object} raw Đối tượng hội nghị thô.
   * @returns {Array<Object>} Danh sách mốc thời gian đã gắn loại (`kind`) và chỉ số gốc (`rawIndex`).
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
      .map((d, rawIndex) => Object.assign({}, d, {
        rawIndex,
        name: String(d.name || 'Deadline').trim(),
        date: d.date !== undefined && d.date !== null ? String(d.date).trim() : '',
        kind: classifyDeadlineKind(confName, d.name)
      }));
  }

  /**
   * Đánh giá trạng thái CFP (open, closingSoon, closed, unknown) và trích xuất mốc deadline nộp bài đầu tiên theo UTC+7.
   * Không tự tạo deadline giả nếu hội nghị không có mốc nộp bài hợp lệ.
   * @param {Array<Object>} submissionDeadlines - Danh sách các mốc nộp bài đã quy đổi UTC+7 và sắp xếp tăng dần.
   * @returns {{ cfpStatus: string, firstSubmissionDeadline: Object|null, nextDeadline: Object|null, lastDeadline: Object|null }}
   */
  function evaluateSubmissionStatus(submissionDeadlines) {
    if (!submissionDeadlines.length) {
      return {
        cfpStatus: 'unknown',
        firstSubmissionDeadline: null,
        nextDeadline: null,
        lastDeadline: null
      };
    }

    const first = submissionDeadlines[0];
    const firstSubmissionDeadline = {
      name: first.name,
      rawDate: first.rawDate || first.date,
      date: first.date,
      vnTime: first.vnTime || '',
      targetMs: Number.isFinite(first.targetMs) ? first.targetMs : null,
      daysLeft: first.daysLeft
    };
    const cfpStatus = first.daysLeft < 0
      ? 'closed'
      : (first.daysLeft <= CLOSING_SOON_DAYS ? 'closingSoon' : 'open');

    return {
      cfpStatus,
      firstSubmissionDeadline,
      nextDeadline: first.daysLeft >= 0 ? firstSubmissionDeadline : null,
      lastDeadline: firstSubmissionDeadline
    };
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
   * Chỉ sử dụng dữ liệu thực có từ JSON, không suy luận thêm thuộc tính bị thiếu.
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
      : (raw.fullName !== undefined && raw.fullName !== null ? String(raw.fullName).trim() : '');

    const utils = getUtils();
    const hasConverter = Boolean(utils && typeof utils.convertDeadlineToVn === 'function');
    const hasDaysLeft = Boolean(utils && typeof utils.daysLeft === 'function');
    const deadlinesWithKind = normalizeDeadlinesArray(raw);
    // Chỉ lọc các mốc thuộc loại nộp bài (submission) có ngày hợp lệ và sắp xếp tăng dần để lấy mốc nộp bài đầu tiên
    const submissionDeadlines = deadlinesWithKind
      .map(d => {
        const converted = hasConverter && d.date ? utils.convertDeadlineToVn(d.date, { isDeadline: true }) : null;
        const vnDate = (converted && converted.vnIsoDate) || normalizeIsoDate(d.date);
        const daysLeftVal = d.date
          ? (hasDaysLeft ? utils.daysLeft(d.date) : (vnDate ? diffCalendarDays(vnDate, todayIso) : null))
          : null;
        return {
          rawIndex: d.rawIndex,
          name: d.name,
          rawDate: d.date,
          date: vnDate || '',
          vnTime: converted ? (converted.vnTimeVi || '') : '',
          targetMs: converted && Number.isFinite(converted.targetMs) ? converted.targetMs : null,
          kind: d.kind,
          daysLeft: daysLeftVal
        };
      })
      .filter(d => d.kind === 'submission' && Boolean(d.date) && d.daysLeft !== null)
      .sort((a, b) => {
        if (Number.isFinite(a.targetMs) && Number.isFinite(b.targetMs) && a.targetMs !== b.targetMs) {
          return a.targetMs - b.targetMs;
        }
        const dateCmp = String(a.date).localeCompare(String(b.date));
        return dateCmp !== 0 ? dateCmp : (a.rawIndex - b.rawIndex);
      });

    const { cfpStatus, firstSubmissionDeadline, nextDeadline, lastDeadline } = evaluateSubmissionStatus(submissionDeadlines);
    const startDate = normalizeIsoDate(raw.start_date || raw.startDate);
    const endDate = normalizeIsoDate(raw.end_date || raw.endDate) || startDate;
    const rawRankText = utils && typeof utils.extractConferenceRank === 'function'
      ? utils.extractConferenceRank(raw.rank)
      : (raw.rank && typeof raw.rank === 'object' ? String(raw.rank.core || '') : String(raw.rank || ''));
    const rawRank = rawRankText.trim().toUpperCase();

    const core = getCore();
    const topicItems = core.normalizeTopicFields(raw);
    const displayTopics = utils && typeof utils.extractTopicLabels === 'function'
      ? utils.extractTopicLabels(raw)
      : (Array.isArray(raw.topic_labels) ? raw.topic_labels.map(t => String(t || '').trim()).filter(Boolean) : topicItems.map(item => item.label));
    const rankKey = VALID_RANK_VALUES.has(rawRank) ? rawRank : 'unranked';
    const modeKey = typeof core.normalizeModeKey === 'function' ? core.normalizeModeKey(raw) : 'unknown';

    return Object.assign({}, raw, {
      id,
      rank: VALID_RANK_VALUES.has(rawRank) ? rawRank : '',
      rankKey,
      modeKey,
      rankInfo: raw.rank && typeof raw.rank === 'object' ? raw.rank : null,
      fullName: fullNameText,
      website: raw.website_url || raw.website || '',
      startDate,
      endDate,
      eventMonth: startDate ? startDate.slice(0, 7) : 'unknown',
      isDuplicate: DUPLICATE_RAW_NAMES.has(rawName),
      dataQuality,
      cityKey: extractCityKey(raw.location),
      topics: topicItems.map(item => item.key),
      topicItems,
      displayTopics,
      deadlines: deadlinesWithKind,
      submissionDeadlines,
      firstSubmissionDeadline,
      cfpStatus,
      nextDeadline,
      lastDeadline,
      eventPhase: resolveEventPhase(startDate, endDate, todayIso)
    });
  }

  /* ================= 5. LƯU TRỮ BOOKMARK NGƯỜI DÙNG ================= */

  /**
   * Lấy khóa localStorage lưu hội nghị đã lưu của người dùng đã đăng nhập (trống nếu chưa xác thực).
   * @returns {string} Khóa lưu trữ hoặc chuỗi rỗng.
   */
  function getSavedStorageKey() {
    const utils = getUtils();
    if (utils && typeof utils.getSavedStorageKey === 'function') {
      return utils.getSavedStorageKey(false);
    }
    try {
      const user = JSON.parse(localStorage.getItem('confguide_current_user') || 'null');
      return user && (user.id || user.username || user.email)
        ? `confguide_saved_${user.id || user.username || user.email}`
        : '';
    } catch {
      return '';
    }
  }

  /**
   * Đọc danh sách ID hội nghị đã lưu của người dùng đã đăng nhập (trả về [] nếu chưa đăng nhập).
   * @returns {Array<string>}
   */
  function getSavedList() {
    const utils = getUtils();
    if (utils && typeof utils.getSavedConferenceIds === 'function') {
      return utils.getSavedConferenceIds(false);
    }
    const key = getSavedStorageKey();
    if (!key || !utils || !utils.readStorage) return [];
    const list = utils.readStorage(key, []);
    return Array.isArray(list) ? list : [];
  }

  /**
   * Đảo trạng thái lưu/bỏ lưu của một hội nghị (yêu cầu đăng nhập; khách sẽ nhận thông báo yêu cầu đăng nhập).
   * @param {string} confId
   * @param {HTMLElement} btn
   */
  function toggleSaveConference(confId, btn) {
    if (!confId || !btn) return;
    const utils = getUtils();
    if (!utils || typeof utils.toggleSavedConference !== 'function') {
      showToast('Vui lòng đăng nhập để sử dụng chức năng theo dõi hội nghị.');
      return;
    }

    const result = utils.toggleSavedConference(confId, {
      redirectUrl: `search.html${window.location.search || ''}`
    });
    if (!result || result.requiresAuth || !result.ok) {
      return;
    }

    const labelSpan = btn.querySelector('span');
    const svg = btn.querySelector('svg');
    if (result.isSaved) {
      btn.classList.add('saved');
      btn.setAttribute('aria-pressed', 'true');
      if (labelSpan) labelSpan.textContent = 'Đã lưu';
      if (svg) svg.setAttribute('fill', 'currentColor');
      showToast('Đã lưu hội nghị vào danh sách theo dõi.');
    } else {
      btn.classList.remove('saved');
      btn.setAttribute('aria-pressed', 'false');
      if (labelSpan) labelSpan.textContent = 'Lưu lại';
      if (svg) svg.setAttribute('fill', 'none');
      showToast('Đã xóa hội nghị khỏi danh sách đã lưu.');
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
    rawFilterState.modes = [];
    rawFilterState.city = 'all';
    rawFilterState.topics = [];
    rawFilterState.sort = 'deadline';
    rawFilterState.page = 1;
  }

  /**
   * Trích xuất và lọc danh sách giá trị đa chọn (phân tách dấu phẩy) từ URLSearchParams.
   * @param {URLSearchParams} params - Tập tham số truy vấn URL hiện tại.
   * @param {string} paramName - Tên tham số (`rank`, `mode` hoặc `topic`).
   * @param {Set<string>} validSet - Tập giá trị hợp lệ được phép nhận.
   * @param {Function} [normalizeFn] - Hàm chuẩn hóa giá trị trước khi kiểm tra hợp lệ.
   * @returns {Array<string>} Danh sách giá trị duy nhất hợp lệ.
   */
  function parseMultiUrlParam(params, paramName, validSet, normalizeFn = null) {
    const parsed = [];
    params.getAll(paramName).forEach(chunk => {
      String(chunk || '')
        .split(',')
        .map(item => (normalizeFn ? normalizeFn(item.trim()) : item.trim()))
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
    if (ENABLED_FILTER_GROUPS.rank) {
      rawFilterState.ranks = parseMultiUrlParam(
        params,
        'rank',
        ALL_RANK_KEYS,
        val => (val.toLowerCase() === 'unranked' ? 'unranked' : val.toUpperCase())
      );
    }

    if (ENABLED_FILTER_GROUPS.cfp) {
      const rawCfp = (params.get('cfp') || '').trim();
      if (VALID_CFP_VALUES.has(rawCfp)) rawFilterState.cfp = rawCfp;

      const rawFrom = normalizeIsoDate(params.get('from') || params.get('dateFrom') || '');
      if (rawFrom) rawFilterState.dateFrom = rawFrom;

      const rawTo = normalizeIsoDate(params.get('to') || params.get('dateTo') || '');
      if (rawTo) rawFilterState.dateTo = rawTo;
    }

    if (ENABLED_FILTER_GROUPS.month) {
      const rawMonth = (params.get('month') || '').trim();
      if (rawMonth === 'unknown' || /^\d{4}-\d{2}$/.test(rawMonth)) rawFilterState.month = rawMonth;

      const rawOngoing = (params.get('ongoing') || '').trim().toLowerCase();
      if (rawOngoing === '1' || rawOngoing === 'true') rawFilterState.ongoing = true;
    }

    if (ENABLED_FILTER_GROUPS.mode) {
      rawFilterState.modes = parseMultiUrlParam(
        params,
        'mode',
        ALL_MODE_KEYS,
        val => val.toLowerCase()
      );
    }

    if (ENABLED_FILTER_GROUPS.where) {
      let rawCity = (params.get('city') || '').trim();
      if (rawCity === 'da-nang' || rawCity === 'unknown') rawCity = 'other';
      if (VALID_CITY_VALUES.has(rawCity)) rawFilterState.city = rawCity;
    }

    if (ENABLED_FILTER_GROUPS.what) {
      rawFilterState.topics = getCore().expandTopicFilterValues(params.getAll('topic'));
    }

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
        if (ENABLED_FILTER_GROUPS.month) {
          if (filterState.month) params.set('month', filterState.month);
          if (filterState.ongoing) params.set('ongoing', '1');
        }
        if (ENABLED_FILTER_GROUPS.cfp) {
          if (filterState.cfp && filterState.cfp !== 'all') params.set('cfp', filterState.cfp);
          if (filterState.dateFrom) params.set('from', filterState.dateFrom);
          if (filterState.dateTo) params.set('to', filterState.dateTo);
        }
        if (ENABLED_FILTER_GROUPS.mode && Array.isArray(filterState.modes) && filterState.modes.length > 0) {
          params.set('mode', filterState.modes.join(','));
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
   * @returns {{rank: number, month: number, cfp: number, mode: number, where: number, what: number, total: number}}
   */
  function getGroupActiveCounts(state) {
    const rankCount = (ENABLED_FILTER_GROUPS.rank && Array.isArray(state.ranks)) ? state.ranks.length : 0;
    let monthCount = 0;
    if (ENABLED_FILTER_GROUPS.month) {
      if (state.month) monthCount += 1;
      if (state.ongoing) monthCount += 1;
    }
    let cfpCount = (ENABLED_FILTER_GROUPS.cfp && state.cfp && state.cfp !== 'all') ? 1 : 0;
    if (ENABLED_FILTER_GROUPS.cfp && (state.dateFrom || state.dateTo)) cfpCount += 1;
    const modeCount = (ENABLED_FILTER_GROUPS.mode && Array.isArray(state.modes)) ? state.modes.length : 0;
    const whereCount = (ENABLED_FILTER_GROUPS.where && state.city && state.city !== 'all') ? 1 : 0;
    const whatCount = (ENABLED_FILTER_GROUPS.what && Array.isArray(state.topics)) ? state.topics.length : 0;

    return {
      rank: rankCount,
      month: monthCount,
      cfp: cfpCount,
      mode: modeCount,
      where: whereCount,
      what: whatCount,
      total: rankCount + monthCount + cfpCount + modeCount + whereCount + whatCount
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

    if (ENABLED_FILTER_GROUPS.rank && Array.isArray(state.ranks)) {
      state.ranks.forEach(rVal => {
        chips.push(createActiveChip(`rank:${rVal}`, 'rank', `Phân hạng: ${RANK_LABEL_MAP[rVal] || rVal}`, () => {
          filterState.ranks = filterState.ranks.filter(item => item !== rVal);
        }));
      });
    }

    if (state.month) {
      chips.push(createActiveChip(`month:${state.month}`, 'month', `Tháng: ${formatMonthLabel(state.month)}`, () => {
        filterState.month = '';
      }));
    }

    if (state.ongoing) {
      chips.push(createActiveChip('ongoing', 'month', 'Đang diễn ra', () => {
        filterState.ongoing = false;
      }));
    }

    if (state.cfp && state.cfp !== 'all') {
      chips.push(createActiveChip(`cfp:${state.cfp}`, 'cfp', `Hạn nộp: ${CFP_LABEL_MAP[state.cfp] || state.cfp}`, () => {
        filterState.cfp = 'all';
      }));
    }

    if (state.dateFrom || state.dateTo) {
      const fromText = state.dateFrom ? formatIsoToDdMmYyyy(state.dateFrom) : '...';
      const toText = state.dateTo ? formatIsoToDdMmYyyy(state.dateTo) : '...';
      chips.push(createActiveChip('dateRange', 'cfp', `Khoảng hạn nộp: ${fromText} – ${toText}`, () => {
        filterState.dateFrom = '';
        filterState.dateTo = '';
      }));
    }

    if (ENABLED_FILTER_GROUPS.mode && Array.isArray(state.modes)) {
      state.modes.forEach(mVal => {
        chips.push(createActiveChip(`mode:${mVal}`, 'mode', `Hình thức: ${MODE_LABEL_MAP[mVal] || mVal}`, () => {
          filterState.modes = filterState.modes.filter(item => item !== mVal);
        }));
      });
    }

    if (state.city && state.city !== 'all') {
      chips.push(createActiveChip(`city:${state.city}`, 'where', `Địa điểm: ${CITY_LABEL_MAP[state.city] || state.city}`, () => {
        filterState.city = 'all';
      }));
    }

    if (Array.isArray(state.topics)) {
      state.topics.forEach(tKey => {
        chips.push(createActiveChip(`topic:${tKey}`, 'what', `Lĩnh vực: ${topicLabelMap[tKey] || tKey}`, () => {
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

    const dlA = a.firstSubmissionDeadline || a.nextDeadline || a.lastDeadline;
    const dlB = b.firstSubmissionDeadline || b.nextDeadline || b.lastDeadline;

    if (rankA === 0) {
      const targetA = dlA && Number.isFinite(dlA.targetMs)
        ? dlA.targetMs
        : (dlA ? dlA.daysLeft : Number.MAX_SAFE_INTEGER);
      const targetB = dlB && Number.isFinite(dlB.targetMs)
        ? dlB.targetMs
        : (dlB ? dlB.daysLeft : Number.MAX_SAFE_INTEGER);
      if (targetA !== targetB) return isDesc ? (targetB - targetA) : (targetA - targetB);
    } else if (rankA === 1) {
      const closedA = dlA && Number.isFinite(dlA.targetMs)
        ? dlA.targetMs
        : (dlA ? dlA.daysLeft : -Number.MAX_SAFE_INTEGER);
      const closedB = dlB && Number.isFinite(dlB.targetMs)
        ? dlB.targetMs
        : (dlB ? dlB.daysLeft : -Number.MAX_SAFE_INTEGER);
      if (closedA !== closedB) return isDesc ? (closedA - closedB) : (closedB - closedA);
    }

    const startA = a.startDate || '9999-99-99';
    const startB = b.startDate || '9999-99-99';
    if (startA !== startB) return startA.localeCompare(startB);

    return compareByName(a, b, false);
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

  /**
   * So sánh theo phân hạng CORE (A* -> C hoặc C -> A*), luôn đẩy hội nghị "Chưa xếp hạng" xuống cuối.
   * @param {Object} a
   * @param {Object} b
   * @param {boolean} [isAsc=false] - False: cao đến thấp (A* -> C), True: thấp đến cao (C -> A*).
   * @returns {number}
   */
  function compareByRank(a, b, isAsc = false) {
    const hasA = Boolean(a.rank && Object.prototype.hasOwnProperty.call(RANK_WEIGHT, a.rank));
    const hasB = Boolean(b.rank && Object.prototype.hasOwnProperty.call(RANK_WEIGHT, b.rank));
    if (hasA !== hasB) return hasA ? -1 : 1;
    if (hasA && hasB && RANK_WEIGHT[a.rank] !== RANK_WEIGHT[b.rank]) {
      return isAsc
        ? (RANK_WEIGHT[b.rank] - RANK_WEIGHT[a.rank])
        : (RANK_WEIGHT[a.rank] - RANK_WEIGHT[b.rank]);
    }
    return compareByDeadline(a, b, false);
  }

  /**
   * Quy đổi khoảng lệ phí (min, max) về đơn vị USD ước tính để sắp xếp công bằng giữa USD, EUR và VND.
   * Trả về null nếu hội nghị chưa cập nhật lệ phí.
   * @param {Object} conf
   * @returns {{ minUsd: number, maxUsd: number }|null}
   */
  function resolveFeeSortBoundsUsd(conf) {
    const utils = getUtils();
    if (utils && typeof utils.getFeeSortBoundsUsd === 'function') {
      return utils.getFeeSortBoundsUsd(conf);
    }
    return null;
  }

  /**
   * So sánh theo lệ phí tham dự (Thấp -> Cao hoặc Cao -> Thấp), luôn đẩy hội nghị chưa cập nhật lệ phí xuống cuối.
   * @param {Object} a
   * @param {Object} b
   * @param {boolean} [isDesc=false] - False: thấp đến cao, True: cao đến thấp.
   * @returns {number}
   */
  function compareByFee(a, b, isDesc = false) {
    const feeA = resolveFeeSortBoundsUsd(a);
    const feeB = resolveFeeSortBoundsUsd(b);
    if (Boolean(feeA) !== Boolean(feeB)) return feeA ? -1 : 1;
    if (feeA && feeB) {
      const primaryDiff = isDesc ? (feeB.maxUsd - feeA.maxUsd) : (feeA.minUsd - feeB.minUsd);
      if (Math.abs(primaryDiff) > 1e-6) return primaryDiff;
      const secondaryDiff = isDesc ? (feeB.minUsd - feeA.minUsd) : (feeA.maxUsd - feeB.maxUsd);
      if (Math.abs(secondaryDiff) > 1e-6) return secondaryDiff;
    }
    return compareByDeadline(a, b, false);
  }

  /** Bảng ánh xạ các bộ so sánh sắp xếp hợp lệ */
  const SORT_COMPARATORS = {
    deadline: (a, b) => compareByDeadline(a, b, false),
    'deadline-desc': (a, b) => compareByDeadline(a, b, true),
    event: (a, b) => compareByEventDate(a, b, false),
    'event-desc': (a, b) => compareByEventDate(a, b, true),
    'fee-asc': (a, b) => compareByFee(a, b, false),
    'fee-desc': (a, b) => compareByFee(a, b, true),
    'rank-desc': (a, b) => compareByRank(a, b, false),
    'rank-asc': (a, b) => compareByRank(a, b, true),
    name: (a, b) => compareByName(a, b, false),
    'name-desc': (a, b) => compareByName(a, b, true)
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
    const prioritizeScoreFirst = queryTokens.length > 0 && effectiveState.sort === 'deadline';

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
      allFacetKeys,
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

    const activeChips = getActiveFilterChips(effectiveState);
    renderFilterChipsUI(activeChips);
    renderSearchPreferencesPrompt(effectiveState, activeChips);

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

    syncTopicOverflowToggle();

    const mobileFilterLabel = document.getElementById('mobileFilterBtnLabel');
    if (mobileFilterLabel) mobileFilterLabel.textContent = `Bộ lọc (${groupCounts.total})`;

    if (!isFilterDrawerOpen) {
      const applyLabel = document.querySelector('.js-apply-filters-label');
      if (applyLabel) applyLabel.textContent = 'Áp dụng bộ lọc';
    }
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

    document.querySelectorAll('.js-filter-rank').forEach(el => {
      const rVal = el instanceof HTMLInputElement
        ? (el.value || '')
        : (el.getAttribute('data-rank') || '');
      const isSelected = Array.isArray(state.ranks) && state.ranks.includes(rVal);
      if (el instanceof HTMLInputElement) {
        el.checked = isSelected;
      } else {
        el.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
        el.classList.toggle('is-selected', isSelected);
      }
      const row = el.closest('.js-option-row');
      if (row) row.classList.toggle('is-selected', isSelected);
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

    document.querySelectorAll('.js-filter-mode').forEach(cb => {
      const isChecked = Array.isArray(state.modes) && state.modes.includes(cb.value);
      cb.checked = isChecked;
      const row = cb.closest('.js-option-row');
      if (row) row.classList.toggle('is-selected', isChecked);
    });

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
    const fieldset = document.getElementById('topicFieldset');
    const toggleBtn = document.getElementById('btnToggleMoreTopics');
    if (!container || !toggleBtn) return;

    const topicRows = [...container.querySelectorAll('.js-option-row')];
    if (topicRows.length <= TOPIC_VISIBLE_LIMIT) {
      topicRows.forEach(row => row.classList.remove('is-topic-collapsed'));
      if (fieldset) fieldset.classList.remove('is-expanded');
      toggleBtn.hidden = true;
      toggleBtn.setAttribute('aria-expanded', 'false');
      return;
    }

    if (fieldset) fieldset.classList.toggle('is-expanded', isTopicsExpanded);

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
   * Desktop mở cả 6 nhóm bộ lọc theo bố cục cổ điển;
   * Mobile mở 2 nhóm đầu tiên và các nhóm đang có bộ lọc.
   */
  function syncInitialAccordionStates() {
    const isMobile = window.innerWidth <= 767;
    const groupCounts = getGroupActiveCounts(filterState);
    document.querySelectorAll('.js-filter-accordion').forEach((acc, idx) => {
      const groupKey = acc.getAttribute('data-group') || '';
      const hasActive = (groupCounts[groupKey] || 0) > 0;
      const shouldOpen = isMobile ? (idx <= 1 || hasActive) : true;
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
    } else if (groupKey === 'month' || groupKey === 'when') {
      targetState.month = '';
      targetState.ongoing = false;
      if (groupKey === 'when') {
        targetState.dateFrom = '';
        targetState.dateTo = '';
      }
    } else if (groupKey === 'cfp') {
      targetState.cfp = 'all';
      targetState.dateFrom = '';
      targetState.dateTo = '';
    } else if (groupKey === 'mode') {
      targetState.modes = [];
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
      const counts = core.computeFacetCounts(baseSearchConferences, targetState, allFacetKeys, qTokens, targetState.q);
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
      draftFilterState.modes = [];
      draftFilterState.city = 'all';
      draftFilterState.topics = [];
      draftFilterState.page = 1;
      syncSidebarInputsFromState(draftFilterState);
      const core = getCore();
      const counts = core.computeFacetCounts(baseSearchConferences, draftFilterState, allFacetKeys, [], '');
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
   * Trích xuất thông tin tiêu đề, ngày và nhãn đếm ngược theo mốc deadline nộp bài đầu tiên trên trang tra cứu.
   * @param {Object} conf - Đối tượng hội nghị chuẩn hóa.
   * @returns {{ deadlineHeader: string, deadlineDateHtml: string, countdownText: string, countdownClass: string }}
   */
  function resolveCardDeadlineSummary(conf) {
    const firstDeadline = conf.firstSubmissionDeadline || conf.nextDeadline || conf.lastDeadline;
    if (firstDeadline && firstDeadline.date) {
      const formattedDate = formatIsoToDdMmYyyy(firstDeadline.date);
      const timePrefix = firstDeadline.vnTime ? `${firstDeadline.vnTime} ` : '';
      const dateLabel = `${timePrefix}${formattedDate} (UTC+7)`;
      if (firstDeadline.daysLeft >= 0) {
        return {
          deadlineHeader: firstDeadline.name || 'Hạn nộp bài đầu tiên',
          deadlineDateHtml:
            `Hạn: <time datetime="${escapeHtml(firstDeadline.date)}">${escapeHtml(dateLabel)}</time>`,
          countdownText: `Còn ${firstDeadline.daysLeft} ngày`,
          countdownClass: firstDeadline.daysLeft <= CLOSING_SOON_DAYS
            ? 'deadline-countdown urgent'
            : 'deadline-countdown'
        };
      }

      const passedDays = Math.abs(firstDeadline.daysLeft || 0);
      return {
        deadlineHeader: firstDeadline.name || 'Hạn nộp bài đầu tiên',
        deadlineDateHtml:
          `Đã đóng ngày <time datetime="${escapeHtml(firstDeadline.date)}">${escapeHtml(dateLabel)}</time>`,
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
    const rankMod = conf.rank ? (rankSlugMap[conf.rank] || '') : '';
    const rankBadgeHtml = conf.rank && rankMod
      ? `<span class="conference-card__badge conference-card__badge--rank conference-card__badge--rank-${rankMod}">Rank ${escapeHtml(conf.rank)}</span>`
      : '<span class="conference-card__badge conference-card__badge--rank conference-card__badge--rank-unranked">Chưa xếp hạng</span>';

    const cfpBadgeHtml = renderCfpBadgeHtml(conf);
    let phaseBadgeHtml = '';
    if (conf.eventPhase === 'ongoing') {
      phaseBadgeHtml = '<span class="conference-card__badge conference-card__badge--ongoing">Đang diễn ra</span>';
    } else if (conf.eventPhase === 'ended') {
      phaseBadgeHtml = '<span class="conference-card__badge conference-card__badge--ended">Đã kết thúc</span>';
    }

    const fullTitleText = conf.fullName && conf.fullName !== conf.name ? conf.fullName : '';
    const fullNameHtml = fullTitleText
      ? `<div class="card-full-name" title="${escapeHtml(fullTitleText)}">${core.highlightMatches(fullTitleText, rawQuery)}</div>`
      : '';
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
          ${fullNameHtml}
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

    const utils = getUtils();
    const displayTopics = Array.isArray(conf.displayTopics)
      ? conf.displayTopics
      : (utils && typeof utils.extractTopicLabels === 'function'
        ? utils.extractTopicLabels(conf)
        : (Array.isArray(conf.topicItems) ? conf.topicItems.map(item => item.label) : []));
    const hiddenLabels = displayTopics.slice(2);
    const hiddenLabelsText = hiddenLabels.join(', ');
    const overflowCount = hiddenLabels.length;

    const tagsListHtml = displayTopics.map((label, idx) => {
      const extraModifier = idx >= 2 ? ' conference-card__topic--mobile-extra' : '';
      return `<span class="tag-field conference-card__topic${extraModifier}">${core.highlightMatches(label, rawQuery)}</span>`;
    }).join('');
    const overflowTagHtml = overflowCount > 0
      ? `<span class="tag-field conference-card__topic conference-card__topic--more"`
        + ` title="${escapeHtml(`Các lĩnh vực khác: ${hiddenLabelsText}`)}"`
        + ` aria-label="${escapeHtml(`Còn ${overflowCount} lĩnh vực khác: ${hiddenLabelsText}`)}">`
        + `+${overflowCount}</span>`
      : '';
    const cardTagsHtml = displayTopics.length > 0
      ? `<div class="card-tags">${tagsListHtml}${overflowTagHtml}</div>`
      : '';
    const locationText = conf.location && String(conf.location).trim() !== ''
      ? String(conf.location).trim()
      : 'Chưa rõ';
    const eventDateText = formatEventDateRange(conf.startDate, conf.endDate);
    const feeText = utils && typeof utils.formatConferenceFee === 'function'
      ? utils.formatConferenceFee(conf)
      : 'Chưa cập nhật';
    const feeMetaMod = feeText !== 'Chưa cập nhật' ? ' card-meta-item--fee' : '';
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
            <span class="card-meta-item${feeMetaMod}">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
              <span>Lệ phí: ${escapeHtml(feeText)}</span>
            </span>
          </div>

          ${cardTagsHtml}
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

    // Tối ưu INP: bỏ qua dựng lại DOM nếu danh sách ID và từ khóa tô sáng không đổi
    const currentRenderKey = `${pageItems.map(c => c.id).join(',')}|q=${filterState.q || ''}`;
    if (currentRenderKey !== lastRenderedConferenceIds) {
      lastRenderedConferenceIds = currentRenderKey;
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
      modes: [...filterState.modes],
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
      filterState.modes = [...draftFilterState.modes];
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
        allFacetKeys,
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
      allFacetKeys,
      qTokens,
      targetState.q
    );
    updateSidebarUI(targetState, counts);
    updateDraftButtonCount();
  }

  /**
   * Gắn sự kiện ô tìm kiếm trực tiếp và chip từ khóa gợi ý nhanh.
   */
  function bindSearchInputEvents() {
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');

    if (searchForm) {
      searchForm.addEventListener('submit', event => {
        event.preventDefault();
        if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
        filterState.q = searchInput ? searchInput.value.trim() : '';
        filterState.page = 1;
      });
    }

    if (searchInput) {
      searchInput.addEventListener('input', () => {
        if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
          filterState.q = searchInput.value.trim();
          filterState.page = 1;
        }, DEBOUNCE_SEARCH_MS);
      });
    }

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

    if (target.classList.contains('js-filter-rank') && target instanceof HTMLInputElement) {
      const selectedRanks = new Set(
        [...sidebar.querySelectorAll('.js-filter-rank:checked')]
          .map(cb => cb.value)
          .filter(v => validRankKeys.has(v))
      );
      targetState.ranks = rankCatalog.map(item => item.key).filter(r => selectedRanks.has(r));
    } else if (target.classList.contains('js-filter-cfp') && target instanceof HTMLInputElement) {
      targetState.cfp = target.value === 'all' ? 'all' : (target.checked ? target.value : 'all');
    } else if (target.classList.contains('js-filter-month') && target instanceof HTMLSelectElement) {
      targetState.month = target.value;
    } else if (target.classList.contains('js-filter-ongoing') && target instanceof HTMLInputElement) {
      targetState.ongoing = target.checked;
    } else if (target.classList.contains('js-date-from') && target instanceof HTMLInputElement) {
      targetState.dateFrom = normalizeIsoDate(target.value) || '';
    } else if (target.classList.contains('js-date-to') && target instanceof HTMLInputElement) {
      targetState.dateTo = normalizeIsoDate(target.value) || '';
    } else if (target.classList.contains('js-filter-mode') && target instanceof HTMLInputElement) {
      const selectedModes = new Set(
        [...sidebar.querySelectorAll('.js-filter-mode:checked')]
          .map(cb => cb.value)
          .filter(v => validModeKeys.has(v))
      );
      targetState.modes = modeCatalog.map(item => item.key).filter(m => selectedModes.has(m));
    } else if (target.classList.contains('js-filter-city') && target instanceof HTMLInputElement) {
      targetState.city = target.value === 'all' ? 'all' : (target.checked ? target.value : 'all');
    } else if (target.classList.contains('js-filter-topic') && target instanceof HTMLInputElement) {
      targetState.topics = [...sidebar.querySelectorAll('.js-filter-topic:checked')]
        .map(cb => cb.value)
        .filter(v => validTopicValues.has(v));
    } else {
      return;
    }

    targetState.page = 1;
    syncSidebarInputsFromState(targetState);
    refreshDrawerDraftUI(targetState);
  }

  /**
   * Xử lý click accordion, xóa nhóm, xem thêm chủ đề và nút Áp dụng / Đặt lại trên thanh bên.
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

    if (target.closest('.js-toggle-more-topics')) {
      isTopicsExpanded = !isTopicsExpanded;
      syncTopicOverflowToggle();
      return;
    }
    if (target.closest('.js-filter-reset')) { clearAllFilters(); return; }
    if (target.closest('.js-close-filters-drawer')) { closeFiltersDrawer(false); return; }
    if (target.closest('.js-apply-filters')) {
      if (isFilterDrawerOpen) {
        closeFiltersDrawer(true);
      } else {
        executePipeline().then(() => {
          const resultsHead = document.querySelector('.results-head');
          if (resultsHead && typeof resultsHead.scrollIntoView === 'function') {
            resultsHead.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
          showToast(`Đã áp dụng bộ lọc (${filteredConferences.length} hội nghị phù hợp).`);
        });
      }
    }
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
        if (filterState.sort === 'deadline') hasSearchPrefsAppliedSortOnly = false;
        filterState.page = 1;
      });
    }

    const retryBtn = document.getElementById('btnRetryLoad');
    if (retryBtn) retryBtn.addEventListener('click', loadData);
  }

  /**
   * Kết xuất thanh gợi ý cá nhân hóa (lĩnh vực & mục đích sử dụng) trên trang Tra cứu.
   * @param {Object} state - Trạng thái bộ lọc hiện tại.
   * @param {Array} [activeChips] - Danh sách chip bộ lọc đang kích hoạt (nếu đã tính trước).
   */
  function renderSearchPreferencesPrompt(state, activeChips = getActiveFilterChips(state)) {
    const banner = document.getElementById('searchPrefsPrompt');
    const utils = getUtils();
    if (!banner || !utils || typeof utils.getUserPreferences !== 'function') return;

    const urlParams = new URLSearchParams(window.location.search);
    const hasExplicitSortUrl = urlParams.has('sort') && state.sort !== 'deadline';
    if (
      isSearchPrefsBannerDismissed
      || activeChips.length > 0
      || hasSearchPrefsAppliedSortOnly
      || hasExplicitSortUrl
    ) {
      banner.setAttribute('hidden', '');
      banner.innerHTML = '';
      return;
    }

    const prefs = utils.getUserPreferences();
    const purposes = Array.isArray(utils.USAGE_PURPOSES) ? utils.USAGE_PURPOSES : [];
    const prefTopics = Array.isArray(utils.PREFERENCE_TOPICS) ? utils.PREFERENCE_TOPICS : [];
    const prefTopicLabels = prefTopics.reduce((acc, item) => {
      acc[item.key] = item.label;
      return acc;
    }, {});
    const hasPrefs = Boolean(prefs.purpose || prefs.topics.length > 0);

    banner.removeAttribute('hidden');
    if (!hasPrefs) {
      banner.className = 'search-prefs-banner search-prefs-banner--neutral js-search-prefs-banner';
      banner.innerHTML = `
        <div class="search-prefs-banner__info">
          <p class="search-prefs-banner__title">Lọc nhanh hơn theo lĩnh vực &amp; mục đích của bạn</p>
          <p class="search-prefs-banner__desc">Cho ConfGuide biết mục đích tìm kiếm và hướng nghiên cứu để tự động đề xuất bộ lọc phù hợp.</p>
        </div>
        <div class="search-prefs-banner__actions">
          <button type="button" class="search-prefs-banner__btn search-prefs-banner__btn--primary js-search-open-prefs">
            Thiết lập sở thích
          </button>
          <button type="button" class="search-prefs-banner__dismiss js-search-dismiss-prefs" aria-label="Ẩn gợi ý">
            &times;
          </button>
        </div>
      `;
      return;
    }

    const purposeObj = purposes.find(item => item.key === prefs.purpose);
    const chipsHtml = [];
    if (purposeObj) {
      chipsHtml.push(`<span class="search-prefs-chip search-prefs-chip--purpose">Mục đích: ${escapeHtml(purposeObj.shortLabel || purposeObj.label)}</span>`);
    }
    prefs.topics.slice(0, 3).forEach(tKey => {
      const label = topicLabelMap[tKey] || prefTopicLabels[tKey] || tKey;
      chipsHtml.push(`<span class="search-prefs-chip">${escapeHtml(label)}</span>`);
    });
    if (prefs.topics.length > 3) {
      chipsHtml.push(`<span class="search-prefs-chip">+${prefs.topics.length - 3} lĩnh vực</span>`);
    }

    banner.className = 'search-prefs-banner js-search-prefs-banner';
    banner.innerHTML = `
      <div class="search-prefs-banner__info">
        <p class="search-prefs-banner__title">Bạn đã thiết lập sở thích tìm kiếm trước đó:</p>
        <div class="search-prefs-banner__chips">${chipsHtml.join('')}</div>
      </div>
      <div class="search-prefs-banner__actions">
        <button type="button" class="search-prefs-banner__btn search-prefs-banner__btn--primary js-search-apply-prefs" id="btnApplySavedPrefsSearch">
          Áp dụng gợi ý
        </button>
        <button type="button" class="search-prefs-banner__btn search-prefs-banner__btn--secondary js-search-open-prefs" id="btnEditSavedPrefsSearch">
          Thay đổi
        </button>
        <button type="button" class="search-prefs-banner__dismiss js-search-dismiss-prefs" aria-label="Ẩn gợi ý">
          &times;
        </button>
      </div>
    `;
  }

  /**
   * Áp dụng mục đích và lĩnh vực người dùng đã lưu vào `filterState` hiện tại.
   */
  function applySavedPreferencesToSearch() {
    const utils = getUtils();
    if (!utils || typeof utils.getUserPreferences !== 'function') return;
    const prefs = utils.getUserPreferences();
    const purposes = Array.isArray(utils.USAGE_PURPOSES) ? utils.USAGE_PURPOSES : [];
    const purposeObj = purposes.find(item => item.key === prefs.purpose);

    const validSelectedTopics = Array.isArray(prefs.topics)
      ? prefs.topics.filter((tKey, idx, arr) => validTopicValues.has(tKey) && arr.indexOf(tKey) === idx)
      : [];

    filterState.topics = validSelectedTopics;
    if (purposeObj && purposeObj.searchCfp && VALID_CFP_VALUES.has(purposeObj.searchCfp)) {
      filterState.cfp = purposeObj.searchCfp;
    } else {
      filterState.cfp = 'all';
    }
    if (purposeObj && purposeObj.searchSort && VALID_SORT_VALUES.has(purposeObj.searchSort)) {
      filterState.sort = purposeObj.searchSort;
    } else {
      filterState.sort = 'deadline';
    }
    filterState.page = 1;
    hasSearchPrefsAppliedSortOnly = Boolean(
      purposeObj && !purposeObj.searchCfp && validSelectedTopics.length === 0
    );

    showToast('Đã áp dụng sở thích cá nhân hóa vào bộ lọc.');
  }

  /**
   * Gắn sự kiện tương tác cho thanh gợi ý cá nhân hóa trên trang Tra cứu.
   */
  function initSearchPreferencesIntegration() {
    const banner = document.getElementById('searchPrefsPrompt');
    if (banner) {
      banner.addEventListener('click', event => {
        const utils = getUtils();
        if (event.target.closest('.js-search-apply-prefs')) {
          applySavedPreferencesToSearch();
          return;
        }
        if (event.target.closest('.js-search-open-prefs')) {
          if (utils && typeof utils.openPreferencesSurveyModal === 'function') {
            utils.openPreferencesSurveyModal();
          }
          return;
        }
        if (event.target.closest('.js-search-dismiss-prefs')) {
          isSearchPrefsBannerDismissed = true;
          banner.setAttribute('hidden', '');
          banner.innerHTML = '';
        }
      });
    }

    window.addEventListener('confguide:preferences-changed', () => {
      isSearchPrefsBannerDismissed = false;
      hasSearchPrefsAppliedSortOnly = false;
      renderSearchPreferencesPrompt(filterState);
    });
  }

  /**
   * Khởi tạo toàn bộ sự kiện của trang bằng kỹ thuật Event Delegation trên các phần tử tĩnh.
   */
  function initStaticEvents() {
    bindSearchInputEvents();

    const sidebar = document.getElementById('filtersSidebar');
    if (sidebar) {
      sidebar.addEventListener('change', event => handleSidebarChangeEvent(event, sidebar));
      sidebar.addEventListener('click', handleSidebarClickEvent);
    }

    bindFilterDrawerLifecycleEvents();
    bindResultsAreaDelegation();
    initSearchPreferencesIntegration();
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
   * Tải dữ liệu hội nghị từ data/conference_data.json kèm try/catch fallback về FALLBACK_CONFERENCES.
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
        ? await utils.fetchJsonCached('data/conference_data.json')
        : await fetch('data/conference_data.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
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

    // 3. Xây dựng danh mục Phân hạng, Hình thức, Lĩnh vực đơn thực có từ dữ liệu & lọc lại khóa URL an toàn
    buildFilterCatalogs(baseSearchConferences);
    renderDynamicFilterOptions(baseSearchConferences);
    rawFilterState.ranks = rawFilterState.ranks.filter((key, idx, arr) =>
      validRankKeys.has(key) && arr.indexOf(key) === idx
    );
    rawFilterState.modes = rawFilterState.modes.filter((key, idx, arr) =>
      validModeKeys.has(key) && arr.indexOf(key) === idx
    );
    rawFilterState.topics = rawFilterState.topics.filter((key, idx, arr) =>
      validTopicValues.has(key) && arr.indexOf(key) === idx
    );

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

  /**
   * Đồng bộ trạng thái đã lưu cho toàn bộ nút `.js-card-save` đang hiển thị.
   */
  function syncSearchSaveButtonsUi() {
    const savedIds = getSavedList();
    document.querySelectorAll('.js-card-save').forEach(btn => {
      const confId = btn.getAttribute('data-save-id') || '';
      const isSaved = Boolean(confId && savedIds.includes(confId));
      const labelSpan = btn.querySelector('span');
      const svg = btn.querySelector('svg');
      btn.classList.toggle('saved', isSaved);
      btn.setAttribute('aria-pressed', isSaved ? 'true' : 'false');
      if (labelSpan) labelSpan.textContent = isSaved ? 'Đã lưu' : 'Lưu lại';
      if (svg) svg.setAttribute('fill', isSaved ? 'currentColor' : 'none');
    });
  }

  // Khởi tạo khi DOM đã sẵn sàng
  document.addEventListener('DOMContentLoaded', () => {
    readUrlIntoFilterState();
    syncSearchInputFromState(filterState);
    initStaticEvents();
    loadData();
  });

  window.addEventListener('pageshow', syncSearchSaveButtonsUi);
  window.addEventListener('storage', event => {
    if (!event.key || event.key === 'confguide_current_user' || event.key === getSavedStorageKey()) {
      syncSearchSaveButtonsUi();
    }
  });
})();
