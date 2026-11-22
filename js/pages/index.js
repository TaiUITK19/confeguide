/**
 * ConfGuide — Kịch bản Trang chủ (js/pages/index.js)
 * Trang sử dụng: index.html
 * Phụ thuộc: js/core/page-transition.js, js/core/layout.js (ConfGuideUtils), js/components/search-core.js, js/components/compare.js
 * Chức năng: Quản lý Hero 2 cột cân đối (cột trái tìm kiếm nhanh; cột phải Hero Slider 3 slide:
 * Slide 1 cá nhân hóa theo trạng thái đăng nhập và lĩnh vực quan tâm, Slide 2 hội nghị nổi bật,
 * Slide 3 sắp hết hạn UTC+7), modal Cá nhân hóa dạng bảng biểu, nạp dữ liệu conference_data.json
 * (fetch + fallback file:///) và hiển thị 6 hội nghị tiêu biểu kèm nút Lưu.
 */

(function () {
  'use strict';

  /* ================= 1. HẰNG SỐ & TRẠNG THÁI TRANG CHỦ ================= */

  /** Khoảng thời gian tự động chuyển slide (mili-giây) */
  const SLIDER_AUTOPLAY_MS = 6000;

  /** Khoảng thời gian tạm dừng tự chuyển slide sau khi người dùng vừa chọn/bỏ lĩnh vực (mili-giây) */
  const SLIDER_TEMP_PAUSE_MS = 10000;

  /** Ngưỡng kéo/vuốt ngang để chuyển slide trên thiết bị cảm ứng (px) */
  const SLIDER_SWIPE_THRESHOLD_PX = 40;

  /** Tổng số slide cố định trong Hero Slider */
  const SLIDER_TOTAL_SLIDES = 3;

  /** Số lượng hội nghị gợi ý tối đa hiển thị trong Slide 1 (Trạng thái C) */
  const HERO_RECOMMENDATION_LIMIT = 2;

  /** Số lượng hội nghị nổi bật tối đa trên lưới Trang chủ */
  const FEATURED_HOME_LIMIT = 6;

  /** Ngưỡng ngày đánh dấu hạn nộp khẩn cấp trên thẻ hội nghị và slider */
  const HOME_URGENT_DAYS = 14;
  const SLIDER_URGENT_DAYS = 7;

  /** Trọng số xếp hạng CORE đồng bộ theo trang Tra cứu (js/pages/search.js) */
  const RANK_WEIGHT = { 'A*': 0, A: 1, B: 2, C: 3 };
  const VALID_RANK_VALUES = new Set(['A*', 'A', 'B', 'C']);

  let allConferences = [];
  let isDataLoaded = false;
  let currentTab = 'all';

  /** Trạng thái điều khiển của Hero Slider */
  const sliderState = {
    totalSlides: SLIDER_TOTAL_SLIDES,
    currentIndex: 0,
    autoplayTimer: null,
    tempPauseTimer: null,
    isTemporarilyPaused: false,
    isHovered: false,
    isFocusedWithin: false,
    isPageHidden: typeof document !== 'undefined' ? Boolean(document.hidden) : false,
    prefersReducedMotion: false,
    eventsBound: false
  };

  /* ================= 2. HÀM HỖ TRỢ STORAGE, NGÀY THÁNG & XẾP HẠNG ================= */

  /**
   * Lấy đối tượng tiện ích dùng chung từ layout.js.
   * @returns {Object|null} Tham chiếu tới window.ConfGuideUtils.
   */
  function getUtils() {
    return window.ConfGuideUtils || null;
  }

  /**
   * Đọc JSON từ localStorage an toàn (tái sử dụng ConfGuideUtils.readStorage).
   * @param {string} key - Khóa cần đọc.
   * @param {*} fallback - Giá trị mặc định khi lỗi hoặc chưa lưu.
   * @returns {*} Dữ liệu đã giải mã hoặc fallback.
   */
  function readStorageSafe(key, fallback) {
    const utils = getUtils();
    if (utils && typeof utils.readStorage === 'function') return utils.readStorage(key, fallback);
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  /**
   * Ghi JSON vào localStorage an toàn (tái sử dụng ConfGuideUtils.writeStorage).
   * @param {string} key - Khóa lưu trữ.
   * @param {*} value - Giá trị cần lưu.
   * @returns {boolean} True nếu ghi thành công.
   */
  function writeStorageSafe(key, value) {
    const utils = getUtils();
    if (utils && typeof utils.writeStorage === 'function') return utils.writeStorage(key, value);
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Chuẩn hóa chuỗi thành mã slug URL (tái sử dụng ConfGuideUtils.slugify).
   * @param {string} text - Chuỗi đầu vào.
   * @returns {string} Chuỗi slug chữ thường an toàn cho URL.
   */
  function fallbackSlugify(text) {
    const utils = getUtils();
    if (utils && typeof utils.slugify === 'function') return utils.slugify(text);
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Chuẩn hóa và kiểm tra tính hợp lệ của xếp hạng CORE từ dữ liệu hội nghị.
   * @param {Object|null} conf - Đối tượng hội nghị.
   * @returns {'A*'|'A'|'B'|'C'|''} Nhãn rank hợp lệ hoặc chuỗi rỗng nếu chưa xếp hạng.
   */
  function getNormalizedRank(conf) {
    const utils = getUtils();
    const rawText = utils && typeof utils.extractConferenceRank === 'function'
      ? utils.extractConferenceRank(conf && conf.rank)
      : (conf && conf.rank && typeof conf.rank === 'object' ? String(conf.rank.core || '') : String((conf && conf.rank) || ''));
    const rawRank = rawText.trim().toUpperCase();
    return VALID_RANK_VALUES.has(rawRank) ? rawRank : '';
  }

  /**
   * Tính trọng số xếp hạng CORE của hội nghị để sắp xếp ưu tiên.
   * @param {Object|null} conf - Đối tượng hội nghị.
   * @returns {number} Trọng số tăng dần theo thứ hạng (99 nếu chưa xếp hạng).
   */
  function getConferenceRankWeight(conf) {
    const rank = getNormalizedRank(conf);
    return rank && Object.prototype.hasOwnProperty.call(RANK_WEIGHT, rank) ? RANK_WEIGHT[rank] : 99;
  }

  /**
   * Lấy mã định danh duy nhất của hội nghị đúng theo quy ước toàn hệ thống.
   * @param {Object|null} conf Đối tượng hội nghị.
   * @returns {string} Mã định danh slug.
   */
  function resolveConferenceId(conf) {
    if (!conf || typeof conf !== 'object') return '';
    const utils = getUtils();
    if (utils && typeof utils.getConferenceId === 'function') {
      return utils.getConferenceId(conf);
    }
    if (conf.id) return String(conf.id).trim();
    return fallbackSlugify(conf.name || conf.short_name || conf.fullName || conf.full_name || '');
  }

  /**
   * Lấy ngày lịch hiện tại (YYYY-MM-DD) theo múi giờ cố định UTC+7 (Việt Nam),
   * ưu tiên tái sử dụng ConfGuideUtils.getTodayVnIso dùng chung.
   * @returns {string} Chuỗi ngày ISO YYYY-MM-DD tại UTC+7.
   */
  function getTodayVnIso() {
    const utils = getUtils();
    if (utils && typeof utils.getTodayVnIso === 'function') {
      return utils.getTodayVnIso();
    }
    const vnNow = new Date(Date.now() + 7 * 3600000);
    const year = vnNow.getUTCFullYear();
    const month = String(vnNow.getUTCMonth() + 1).padStart(2, '0');
    const day = String(vnNow.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Chuẩn hóa chuỗi ngày về dạng ISO YYYY-MM-DD nếu hợp lệ.
   * @param {*} rawDate Chuỗi ngày thô.
   * @returns {string} Chuỗi YYYY-MM-DD hoặc chuỗi rỗng.
   */
  function normalizeDateIsoLocal(rawDate) {
    if (!rawDate || typeof rawDate !== 'string') return '';
    const trimmed = rawDate.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const prefixMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})[T\s]/);
    if (prefixMatch) return prefixMatch[1];
    return '';
  }

  /**
   * Chuẩn hóa danh sách các mốc hạn nộp bài của hội nghị theo múi giờ Việt Nam (UTC+7).
   * Tái sử dụng parseDeadlinesList từ layout.js khi sẵn có.
   * @param {Object|null} conf Đối tượng hội nghị.
   * @returns {Array<Object>} Danh sách các mốc deadline đã chuẩn hóa.
   */
  function parseDeadlinesSafe(conf) {
    const utils = getUtils();
    if (utils && typeof utils.parseDeadlinesList === 'function') {
      return utils.parseDeadlinesList(conf && conf.deadlines);
    }

    if (!conf || !Array.isArray(conf.deadlines)) return [];

    const nowMs = Date.now();
    return conf.deadlines
      .map(entry => {
        const iso = normalizeDateIsoLocal(entry && entry.date);
        if (!iso) return null;
        const [y, m, d] = iso.split('-').map(Number);
        // Fallback tính hết ngày lịch theo UTC+7 (23:59:59+07:00)
        const targetMs = Date.UTC(y, m - 1, d, 23, 59, 59) - 7 * 3600000;
        const diffDays = Math.floor((targetMs - nowMs) / 86400000);
        const [ty, tm, td] = iso.split('-');
        const label = String((entry && entry.name) || 'Hạn nộp bài').trim();
        return {
          key: 'deadline',
          name: label,
          shortName: label,
          date: iso,
          vnDate: iso,
          displayDate: `${td}/${tm}/${ty} (UTC+7)`,
          targetMs: targetMs,
          daysLeft: diffDays,
          isPassed: targetMs <= nowMs
        };
      })
      .filter(Boolean);
  }

  /**
   * Phân loại giai đoạn diễn ra hội nghị (0: sắp diễn ra, 1: đang diễn ra, 2: đã qua, 3: chưa rõ).
   * @param {Object} conf - Đối tượng hội nghị.
   * @param {string} todayVnIso - Ngày hiện tại YYYY-MM-DD (UTC+7).
   * @returns {{ group: number, sortDate: string }} Nhóm ưu tiên và khóa ngày sắp xếp.
   */
  function classifyEventGroup(conf, todayVnIso) {
    const startIso = normalizeDateIsoLocal(conf.startDate || conf.start_date);
    const endIso = normalizeDateIsoLocal(conf.endDate || conf.end_date) || startIso;
    if (!startIso) return { group: 3, sortDate: '9999-99-99' };
    if (startIso >= todayVnIso) return { group: 0, sortDate: startIso };
    if (endIso >= todayVnIso) return { group: 1, sortDate: endIso };
    return { group: 2, sortDate: startIso };
  }

  /**
   * So sánh thứ tự ưu tiên giữa hai hội nghị khi chọn cặp nổi bật cho Slide 2.
   * @param {Object} a - Hội nghị thứ nhất.
   * @param {Object} b - Hội nghị thứ hai.
   * @param {string} todayVnIso - Ngày hiện tại YYYY-MM-DD (UTC+7).
   * @returns {number} Giá trị âm/dương phục vụ Array.prototype.sort.
   */
  function compareFeaturedCandidates(a, b, todayVnIso) {
    const rankDiff = getConferenceRankWeight(a) - getConferenceRankWeight(b);
    if (rankDiff !== 0) return rankDiff;

    const hasCompleteMeta = conf => Boolean(
      normalizeDateIsoLocal(conf.startDate || conf.start_date) && String(conf.location || '').trim()
    );
    const completeDiff = Number(hasCompleteMeta(b)) - Number(hasCompleteMeta(a));
    if (completeDiff !== 0) return completeDiff;

    const evA = classifyEventGroup(a, todayVnIso);
    const evB = classifyEventGroup(b, todayVnIso);
    if (evA.group !== evB.group) return evA.group - evB.group;
    if ((evA.group === 0 || evA.group === 1) && evA.sortDate !== evB.sortDate) {
      return evA.sortDate.localeCompare(evB.sortDate);
    }
    if (evA.group === 2 && evA.sortDate !== evB.sortDate) {
      return evB.sortDate.localeCompare(evA.sortDate);
    }

    return String(a.name || '').localeCompare(String(b.name || ''), 'vi', { sensitivity: 'base' });
  }

  /**
   * Chọn cặp 2 hội nghị nổi bật cho Slide 2 theo mức độ đầy đủ thông tin và thời gian sắp diễn ra.
   * @param {Array<Object>} conferences - Danh sách hội nghị đã chuẩn hóa.
   * @returns {Array<Object>} Tối đa 2 hội nghị tiêu biểu (không trùng lặp).
   */
  function selectFeaturedPair(conferences) {
    const validConfs = (conferences || []).filter(conf => Boolean(conf && conf.name && resolveConferenceId(conf)));
    if (validConfs.length === 0) return [];

    const todayVnIso = getTodayVnIso();
    const sorted = validConfs.slice().sort((a, b) => compareFeaturedCandidates(a, b, todayVnIso));
    const selected = [];
    const usedIds = new Set();

    for (let i = 0; i < sorted.length && selected.length < 2; i++) {
      const id = resolveConferenceId(sorted[i]);
      if (!usedIds.has(id)) {
        usedIds.add(id);
        selected.push(sorted[i]);
      }
    }
    return selected;
  }

  /**
   * Tạo HTML cho 1 thẻ hội nghị nổi bật trong Slide 2.
   * @param {Object} conf Đối tượng hội nghị.
   * @returns {string} Chuỗi HTML của thẻ hội nghị.
   */
  function renderSlideFeaturedCardHtml(conf) {
    const utils = getUtils();
    const esc = utils && utils.escapeHtml ? utils.escapeHtml : val => String(val ?? '');
    const confId = resolveConferenceId(conf);

    const fullName = String(conf.fullName || conf.full_name || '').trim();
    const showFullName = fullName && fullName !== conf.name;
    const rank = getNormalizedRank(conf);
    let rankModifier = ' hero-slide-card__rank--other';
    if (rank === 'A*') rankModifier = '';
    else if (rank === 'A') rankModifier = ' hero-slide-card__rank--a';
    const rankBadgeHtml = rank
      ? `<span class="hero-slide-card__rank${rankModifier}">Rank ${esc(rank)}</span>`
      : '<span class="hero-slide-card__rank hero-slide-card__rank--other">Chưa xếp hạng</span>';

    const locationText = String(conf.location || '').trim() || 'Chưa cập nhật địa điểm';
    const eventDateText = utils && typeof utils.formatConferenceEventDate === 'function'
      ? utils.formatConferenceEventDate(conf)
      : (conf.date_happen || 'Chưa cập nhật ngày tổ chức');

    return `
      <article class="hero-slide-card">
        <div class="hero-slide-card__top">
          <h3 class="hero-slide-card__title">${esc(conf.name)}</h3>
          ${rankBadgeHtml}
        </div>
        ${showFullName ? `<p class="hero-slide-card__fullname" title="${esc(fullName)}">${esc(fullName)}</p>` : ''}
        <div class="hero-slide-card__footer">
          <div class="hero-slide-card__meta">
            <div class="hero-slide-card__meta-item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span class="hero-slide-card__meta-text" title="${esc(locationText)}">${esc(locationText)}</span>
            </div>
            <div class="hero-slide-card__meta-item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
              <span class="hero-slide-card__meta-text" title="${esc(eventDateText)}">${esc(eventDateText)}</span>
            </div>
          </div>
          <a href="detail.html?id=${encodeURIComponent(confId)}" class="btn btn-primary hero-slide-card__link">Xem chi tiết &rarr;</a>
        </div>
      </article>
    `;
  }

  /**
   * Đổ danh sách thẻ hội nghị nổi bật vào Slide 2.
   * @param {Array<Object>} conferences Danh sách hội nghị đã chuẩn hóa.
   */
  function renderFeaturedSliderCards(conferences) {
    const gridEl = document.querySelector('.js-slider-featured-grid');
    if (!gridEl) return;

    const featuredList = selectFeaturedPair(conferences);
    if (featuredList.length === 0) {
      gridEl.innerHTML = `
        <div class="hero-slider__empty">
          <p>Hiện chưa có dữ liệu hội nghị nổi bật để hiển thị.</p>
          <a href="search.html" class="btn btn-primary hero-slide-card__link">Khám phá toàn bộ hội nghị &rarr;</a>
        </div>
      `;
      return;
    }

    gridEl.innerHTML = featuredList.map(renderSlideFeaturedCardHtml).join('');
  }

  /**
   * Trích xuất thông tin mốc deadline gần nhất sắp tới của một hội nghị (phục vụ Slide 3).
   * @param {Object} conf - Đối tượng hội nghị chuẩn hóa.
   * @param {number} nowMs - Thời điểm hiện tại (UTC epoch ms).
   * @param {Object|null} utils - Đối tượng tiện ích ConfGuideUtils.
   * @returns {Object|null} Bản ghi hiển thị hoặc null nếu không còn hạn mở.
   */
  function buildUpcomingDeadlineCandidate(conf, nowMs, utils) {
    const confId = resolveConferenceId(conf);
    if (!confId || !conf || !conf.name) return null;

    const futureDeadlines = parseDeadlinesSafe(conf).filter(
      dl => dl && !dl.isPassed && dl.targetMs > nowMs && Number.isFinite(dl.daysLeft) && dl.daysLeft >= 0
    );
    if (futureDeadlines.length === 0) return null;

    futureDeadlines.sort((a, b) => a.targetMs - b.targetMs);
    const nearest = futureDeadlines[0];
    const converted = utils && typeof utils.convertDeadlineToVn === 'function'
      ? utils.convertDeadlineToVn(nearest.date, { isDeadline: true })
      : null;

    const dateLabel = converted
      ? `${converted.vnTimeVi ? `${converted.vnTimeVi} ` : ''}${converted.vnDateVi} (UTC+7)`
      : nearest.displayDate;
    const fullDateTitle = utils && typeof utils.formatDeadlineVi === 'function'
      ? utils.formatDeadlineVi(nearest.date, { includeAoEOrigin: true })
      : dateLabel;

    const safeDays = Math.max(0, nearest.daysLeft);
    const isUrgent = safeDays <= SLIDER_URGENT_DAYS;
    return {
      id: confId,
      name: String(conf.name).trim(),
      milestoneName: String(nearest.name || nearest.shortName || 'Hạn nộp bài').trim(),
      targetMs: nearest.targetMs,
      datetimeAttr: (converted && converted.vnIsoDate) || nearest.vnDate || nearest.date,
      dateLabel,
      fullDateTitle,
      urgencyClass: isUrgent ? 'hero-slide-card__countdown--urgent' : 'hero-slide-card__countdown--normal',
      countdownText: isUrgent ? `Gấp · Còn ${safeDays} ngày` : `Đang mở · Còn ${safeDays} ngày`,
      locationText: String(conf.location || '').trim() || 'Chưa cập nhật địa điểm',
      detailUrl: `detail.html?id=${encodeURIComponent(confId)}`
    };
  }

  /**
   * Thu thập tối đa 2-3 hội nghị có mốc deadline gần nhất còn ở tương lai, sắp xếp tăng dần theo thời gian.
   * @param {Array<Object>} conferences - Danh sách hội nghị đã chuẩn hóa.
   * @param {number} [limit=2] - Số lượng hội nghị tối đa cần hiển thị.
   * @returns {Array<Object>} Danh sách mốc hạn nộp bài gần nhất ở tương lai.
   */
  function getNearestUpcomingDeadlines(conferences, limit = 2) {
    const utils = getUtils();
    const nowMs = Date.now();
    const candidates = (conferences || [])
      .map(conf => buildUpcomingDeadlineCandidate(conf, nowMs, utils))
      .filter(Boolean);

    candidates.sort((a, b) => {
      if (a.targetMs !== b.targetMs) return a.targetMs - b.targetMs;
      return a.name.localeCompare(b.name, 'vi', { sensitivity: 'base' });
    });

    return candidates.slice(0, limit);
  }

  /**
   * Đổ danh sách mốc hạn nộp bài sắp tới vào Slide 3 hoặc hiển thị thông báo thân thiện khi hết hạn.
   * @param {Array<Object>} conferences Danh sách hội nghị đã chuẩn hóa.
   */
  function renderDeadlineSliderCards(conferences) {
    const gridEl = document.querySelector('.js-slider-deadlines-grid');
    if (!gridEl) return;

    const utils = getUtils();
    const esc = utils && utils.escapeHtml ? utils.escapeHtml : val => String(val ?? '');
    const items = getNearestUpcomingDeadlines(conferences, 2);

    if (items.length === 0) {
      gridEl.innerHTML = `
        <div class="hero-slider__empty">
          <p>Hiện chưa có mốc hạn nộp bài nào ở tương lai. Hãy tra cứu toàn bộ danh sách hội nghị để xem lịch trình các kỳ sắp mở.</p>
          <a href="search.html" class="btn btn-primary hero-slide-card__link">Tra cứu hội nghị ngay &rarr;</a>
        </div>
      `;
      return;
    }

    gridEl.innerHTML = items.map(item => `
      <article class="hero-slide-card">
        <div class="hero-slide-card__top">
          <h3 class="hero-slide-card__title">${esc(item.name)}</h3>
          <span class="hero-slide-card__countdown ${esc(item.urgencyClass)}">${esc(item.countdownText)}</span>
        </div>
        <p class="hero-slide-card__fullname" title="${esc(item.milestoneName)}">Mốc: ${esc(item.milestoneName)}</p>
        <div class="hero-slide-card__footer">
          <div class="hero-slide-card__meta">
            <div class="hero-slide-card__meta-item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <circle cx="12" cy="12" r="9"/>
                <polyline points="12 7 12 12 15 15"/>
              </svg>
              <time class="hero-slide-card__meta-text" datetime="${esc(item.datetimeAttr)}" title="${esc(item.fullDateTitle)}">${esc(item.dateLabel)}</time>
            </div>
            <div class="hero-slide-card__meta-item">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span class="hero-slide-card__meta-text" title="${esc(item.locationText)}">${esc(item.locationText)}</span>
            </div>
          </div>
          <a href="${esc(item.detailUrl)}" class="btn btn-primary hero-slide-card__link">Xem chi tiết &rarr;</a>
        </div>
      </article>
    `).join('');
  }

  /**
   * Lọc và xếp hạng danh sách hội nghị khuyến nghị theo các lĩnh vực nghiên cứu người dùng đã chọn (hàm thuần).
   * Tiêu chí so khớp lĩnh vực đồng nhất với `ConfGuideSearchCore.normalizeTopicFields` bên trang Tra cứu.
   * Thứ tự ưu tiên:
   * 1. Số lĩnh vực trùng nhiều hơn.
   * 2. Còn hạn nộp trước, hội nghị đã qua hạn xuống cuối.
   * 3. Bậc xếp hạng CORE cao hơn (A* > A > B > C > Chưa xếp hạng).
   * 4. Hạn nộp gần hơn.
   *
   * @param {Array<Object>} conferences - Danh sách hội nghị nguồn (không bị thay đổi).
   * @param {Array<string>} selectedTopicKeys - Mảng khóa lĩnh vực đơn (slug) đã chọn.
   * @returns {Array<Object>} Danh sách hội nghị phù hợp đã được sắp xếp theo thứ tự ưu tiên.
   */
  function rankRecommendedConferencesByTopics(conferences, selectedTopicKeys) {
    if (!Array.isArray(conferences) || conferences.length === 0) return [];
    const cleanKeys = Array.isArray(selectedTopicKeys)
      ? selectedTopicKeys
        .map(key => String(key || '').trim())
        .filter((key, idx, arr) => Boolean(key) && arr.indexOf(key) === idx)
      : [];
    if (cleanKeys.length === 0) return [];

    const utils = getUtils();
    const selectedSet = new Set(cleanKeys);

    const evaluated = conferences
      .filter(conf => Boolean(conf && conf.name && resolveConferenceId(conf)))
      .map(conf => {
        const confTopics = getConferenceTopicItems(conf, utils);
        const matchedCount = confTopics.reduce(
          (count, item) => (selectedSet.has(item.key) ? count + 1 : count),
          0
        );
        if (matchedCount === 0) return null;

        const nextDl = utils && typeof utils.getNextDeadline === 'function'
          ? utils.getNextDeadline(conf)
          : null;
        let deadlineGroup = 1;
        if (nextDl && !nextDl.isPassed) deadlineGroup = 0;
        else if (nextDl && nextDl.isPassed) deadlineGroup = 2;

        return {
          conf,
          matchedCount,
          deadlineGroup,
          rankWeight: getConferenceRankWeight(conf),
          targetMs: nextDl && Number.isFinite(nextDl.targetMs) ? nextDl.targetMs : Number.MAX_SAFE_INTEGER
        };
      })
      .filter(Boolean);

    evaluated.sort((a, b) => {
      if (b.matchedCount !== a.matchedCount) {
        return b.matchedCount - a.matchedCount;
      }
      if (a.deadlineGroup !== b.deadlineGroup) {
        return a.deadlineGroup - b.deadlineGroup;
      }
      if (a.rankWeight !== b.rankWeight) {
        return a.rankWeight - b.rankWeight;
      }
      if (a.deadlineGroup === 0 && b.deadlineGroup === 0 && a.targetMs !== b.targetMs) {
        return a.targetMs - b.targetMs;
      }
      if (a.deadlineGroup === 2 && b.deadlineGroup === 2 && a.targetMs !== b.targetMs) {
        return b.targetMs - a.targetMs;
      }
      return String(a.conf.name || '').localeCompare(String(b.conf.name || ''), 'vi', { sensitivity: 'base' });
    });

    return evaluated.map(entry => entry.conf);
  }

  /**
   * Tạo chuỗi URL sang trang Tra cứu (search.html) giữ nguyên bộ lọc lĩnh vực đang chọn.
   * @param {Array<string>} topicKeys - Mảng khóa lĩnh vực chuẩn.
   * @returns {string} Đường dẫn tương đối hợp lệ cho trang Tra cứu.
   */
  function buildTopicSearchUrl(topicKeys) {
    const clean = Array.isArray(topicKeys) ? topicKeys.filter(Boolean) : [];
    if (clean.length === 0) return 'search.html';
    const params = new URLSearchParams();
    params.set('topic', clean.join(','));
    return `search.html?${params.toString()}`;
  }

  /**
   * Tạo mã HTML một thẻ hội nghị khuyến nghị hiển thị trong Slide 1 (Trạng thái C).
   * Hiển thị nguyên văn các nhãn lĩnh vực trong dữ liệu, bậc CORE, hạn nộp + trạng thái, nút Xem chi tiết và nút Lưu.
   * @param {Object} conf - Đối tượng hội nghị chuẩn hóa.
   * @param {Array<string>} savedIds - Danh sách ID hội nghị đã lưu của tài khoản hiện tại.
   * @param {Object|null} utils - Đối tượng tiện ích ConfGuideUtils.
   * @returns {string} Chuỗi HTML thẻ `.hero-rec-card`.
   */
  function renderSlide1RecommendationCardHtml(conf, savedIds, utils) {
    const esc = utils && utils.escapeHtml ? utils.escapeHtml : val => String(val ?? '');
    const confId = resolveConferenceId(conf);
    const confName = String(conf.name || confId).trim();
    const fullName = String(conf.fullName || conf.full_name || confName).trim();
    const isSaved = Boolean(confId && savedIds.includes(confId));

    const rank = getNormalizedRank(conf);
    let rankModifier = ' hero-slide-card__rank--other';
    if (rank === 'A*') rankModifier = '';
    else if (rank === 'A') rankModifier = ' hero-slide-card__rank--a';
    const rankBadgeHtml = rank
      ? `<span class="hero-slide-card__rank${rankModifier}">Rank ${esc(rank)}</span>`
      : '<span class="hero-slide-card__rank hero-slide-card__rank--other">Chưa xếp hạng</span>';

    const rawTopicLabels = utils && typeof utils.extractTopicLabels === 'function'
      ? utils.extractTopicLabels(conf)
      : (Array.isArray(conf.fields) ? conf.fields : []);
    const visibleTopics = rawTopicLabels.slice(0, 2);
    const overflowCount = Math.max(0, rawTopicLabels.length - visibleTopics.length);
    const hiddenText = rawTopicLabels.slice(2).join(', ');
    const topicsHtml = rawTopicLabels.length > 0
      ? `
        <div class="hero-rec-card__topics" aria-label="Lĩnh vực của hội nghị">
          ${visibleTopics.map(lbl => `<span class="hero-rec-card__topic">${esc(lbl)}</span>`).join('')}
          ${overflowCount > 0 ? `<span class="hero-rec-card__topic hero-rec-card__topic--more" title="${esc(hiddenText)}">+${overflowCount}</span>` : ''}
        </div>
      `
      : '';

    const nextDl = utils && typeof utils.getNextDeadline === 'function' ? utils.getNextDeadline(conf) : null;
    let deadlineMod = 'hero-slide-card__countdown--closed';
    let deadlineLabel = 'Chưa công bố hạn nộp';
    let deadlineTitle = 'Chưa có thông tin hạn nộp bài';
    if (nextDl && nextDl.date) {
      const formattedShort = utils && typeof utils.formatDateVi === 'function'
        ? utils.formatDateVi(nextDl.vnDate || nextDl.date)
        : nextDl.date;
      deadlineTitle = utils && typeof utils.formatDeadlineVi === 'function'
        ? utils.formatDeadlineVi(nextDl.date, { includeAoEOrigin: true })
        : formattedShort;
      if (!nextDl.isPassed) {
        const isUrgent = Number.isFinite(nextDl.daysLeft) && nextDl.daysLeft <= HOME_URGENT_DAYS;
        deadlineMod = isUrgent ? 'hero-slide-card__countdown--urgent' : 'hero-slide-card__countdown--normal';
        const daysNum = Math.max(0, Number(nextDl.daysLeft) || 0);
        deadlineLabel = `${nextDl.shortName}: ${formattedShort} · Còn ${daysNum} ngày`;
      } else {
        deadlineLabel = `${nextDl.shortName}: Đã qua (${formattedShort})`;
      }
    }

    const saveBtnHtml = renderSaveButtonHtml(confId, confName, isSaved);

    return `
      <article class="hero-slide-card hero-rec-card" data-id="${esc(confId)}">
        <div class="hero-rec-card__head">
          <div class="hero-rec-card__title-wrap">
            <h3 class="hero-slide-card__title hero-rec-card__title" title="${esc(fullName)}">${esc(confName)}</h3>
            ${rankBadgeHtml}
          </div>
          ${saveBtnHtml}
        </div>
        ${topicsHtml}
        <div class="hero-rec-card__footer">
          <span class="hero-slide-card__countdown ${deadlineMod}" title="${esc(deadlineTitle)}">${esc(deadlineLabel)}</span>
          <a href="detail.html?id=${encodeURIComponent(confId)}" class="btn btn-primary hero-slide-card__link hero-rec-card__detail">
            Xem chi tiết
          </a>
        </div>
      </article>
    `;
  }

  /**
   * Phát thông báo polite cho trình đọc màn hình khi trạng thái Slide 1 thay đổi.
   * @param {string} message - Nội dung thông báo trạng thái.
   */
  function announceSlide1Status(message) {
    const liveEl = document.querySelector('.js-slide1-live-region');
    if (!liveEl || !message) return;
    liveEl.textContent = '';
    window.setTimeout(() => {
      liveEl.textContent = message;
    }, 30);
  }

  /**
   * Render nội dung Slide 1 của Hero Slider theo 3 trạng thái thực:
   * A (Chưa đăng nhập), B (Đã đăng nhập, chưa chọn lĩnh vực hoặc không có hội nghị khớp),
   * C (Đã đăng nhập và có lĩnh vực + danh sách khuyến nghị tối đa 2 thẻ).
   */
  function renderHeroSlide1() {
    const slide1El = document.querySelector('.js-hero-slide1');
    const contentEl = document.querySelector('.js-slide1-content');
    if (!slide1El || !contentEl) return;

    const utils = getUtils();
    const esc = utils && utils.escapeHtml ? utils.escapeHtml : val => String(val ?? '');
    const isAuthenticated = Boolean(utils && typeof utils.isUserAuthenticated === 'function'
      ? utils.isUserAuthenticated()
      : readStorageSafe('confguide_current_user', null));

    const introBlockHtml = `
      <div class="hero-slider__slide-head">
        <h2 class="hero-slider__slide-title">Khám phá &amp; Chọn đúng Hội nghị Khoa học</h2>
        <span class="hero-slider__slide-badge">Cá nhân hóa</span>
      </div>
      <p class="hero-slider__intro-desc">
        Tra cứu nhanh chóng, đánh giá uy tín và theo dõi thời hạn nộp bài theo giờ Việt Nam (UTC+7) cho các hội nghị khoa học Công nghệ thông tin tại Việt Nam.
      </p>
    `;

    // Trạng thái A: Chưa đăng nhập
    if (!isAuthenticated) {
      contentEl.innerHTML = `
        ${introBlockHtml}
        <div class="hero-slider__cta-box">
          <p class="hero-slider__cta-text">Đăng nhập để nhận gợi ý hội nghị theo lĩnh vực của bạn</p>
          <div class="hero-slider__cta-actions">
            <a href="login.html?redirect=index.html" class="btn btn-primary hero-slider__cta-btn js-slide1-login">Đăng nhập</a>
            <a href="register.html" class="btn btn-secondary hero-slider__cta-btn js-slide1-register">Đăng ký</a>
          </div>
        </div>
      `;
      syncSlideAccessibility(slide1El, sliderState.currentIndex === 0);
      return;
    }

    const selectedKeys = utils && typeof utils.getUserResearchTopicKeys === 'function'
      ? utils.getUserResearchTopicKeys()
      : [];
    const selectedLabels = utils && typeof utils.getUserResearchTopicLabels === 'function'
      ? utils.getUserResearchTopicLabels()
      : [];

    // Trạng thái B (chưa có lĩnh vực nào được chọn: đặt nút Thêm lĩnh vực vào giữa ô)
    if (selectedLabels.length === 0) {
      contentEl.innerHTML = `
        ${introBlockHtml}
        <div class="hero-slider__cta-box hero-slider__cta-box--centered">
          <div class="hero-slider__cta-actions">
            <button type="button" class="btn btn-primary hero-slider__cta-btn js-hero-choose-topics">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>Thêm lĩnh vực</span>
            </button>
          </div>
        </div>
      `;
      syncSlideAccessibility(slide1El, sliderState.currentIndex === 0);
      return;
    }

    // Đang nạp JSON hội nghị lần đầu
    if (!isDataLoaded) {
      contentEl.innerHTML = `
        <div class="hero-slider__slide-head">
          <h2 class="hero-slider__slide-title">Gợi ý dành cho bạn</h2>
          <span class="hero-slider__slide-badge">Đang đồng bộ</span>
        </div>
        <div class="hero-slider__loading" role="status" aria-live="polite">
          <span class="hero-slider__spinner" aria-hidden="true"></span>
          <span>Đang tìm hội nghị phù hợp với lĩnh vực của bạn...</span>
        </div>
      `;
      syncSlideAccessibility(slide1El, sliderState.currentIndex === 0);
      return;
    }

    const rankedMatches = rankRecommendedConferencesByTopics(allConferences, selectedKeys);

    // Trường hợp đã chọn lĩnh vực nhưng không có hội nghị nào trùng khớp
    if (rankedMatches.length === 0) {
      const chipsSummaryHtml = selectedLabels
        .slice(0, 4)
        .map(lbl => `<span class="hero-slider__topic-pill">${esc(lbl)}</span>`)
        .join('');
      const extraCount = Math.max(0, selectedLabels.length - 4);
      contentEl.innerHTML = `
        ${introBlockHtml}
        <div class="hero-slider__selected-topics" aria-label="Lĩnh vực đang chọn">
          ${chipsSummaryHtml}
          ${extraCount > 0 ? `<span class="hero-slider__topic-pill hero-slider__topic-pill--more">+${extraCount}</span>` : ''}
        </div>
        <div class="hero-slider__cta-box">
          <p class="hero-slider__cta-text">Chưa có hội nghị phù hợp với lĩnh vực đã chọn</p>
          <div class="hero-slider__cta-actions">
            <button type="button" class="btn btn-primary hero-slider__cta-btn js-hero-choose-topics">
              Đổi lĩnh vực
            </button>
          </div>
        </div>
      `;
      syncSlideAccessibility(slide1El, sliderState.currentIndex === 0);
      return;
    }

    // Trạng thái C: Đã đăng nhập + có lĩnh vực + có hội nghị phù hợp
    const visibleSelected = selectedLabels.slice(0, 4);
    const extraSelectedCount = Math.max(0, selectedLabels.length - visibleSelected.length);
    const hiddenLabelsTitle = selectedLabels.slice(4).join(', ');
    const chipsHtml = visibleSelected
      .map(lbl => `<span class="hero-slider__topic-pill">${esc(lbl)}</span>`)
      .join('')
      + (extraSelectedCount > 0
        ? `<span class="hero-slider__topic-pill hero-slider__topic-pill--more" title="${esc(hiddenLabelsTitle)}">+${extraSelectedCount}</span>`
        : '');

    const savedIds = getSavedConferenceIds();
    const topRecs = rankedMatches.slice(0, HERO_RECOMMENDATION_LIMIT);
    const cardsHtml = topRecs.map(conf => renderSlide1RecommendationCardHtml(conf, savedIds, utils)).join('');
    const searchUrl = buildTopicSearchUrl(selectedKeys);

    contentEl.innerHTML = `
      <div class="hero-slider__slide-head hero-slider__slide-head--rec">
        <h2 class="hero-slider__slide-title">Gợi ý dành cho bạn</h2>
        <span class="hero-slider__slide-badge">${rankedMatches.length} phù hợp</span>
        <div class="hero-slider__selected-topics" aria-label="Các lĩnh vực bạn đang chọn">
          ${chipsHtml}
        </div>
      </div>
      <div class="hero-slider__rec-list">
        ${cardsHtml}
      </div>
      <div class="hero-slider__rec-actions">
        <a href="${esc(searchUrl)}" class="hero-slider__rec-viewall js-slide1-viewall">
          Xem tất cả hội nghị phù hợp &rarr;
        </a>
        <button type="button" class="btn btn-secondary hero-slider__rec-change js-hero-choose-topics">
          Đổi lĩnh vực
        </button>
      </div>
    `;
    syncSlideAccessibility(slide1El, sliderState.currentIndex === 0);
  }

  /**
   * Dừng bộ đếm thời gian tự chuyển slide để tránh rò rỉ tài nguyên.
   */
  function stopSliderAutoplay() {
    if (sliderState.autoplayTimer !== null) {
      window.clearInterval(sliderState.autoplayTimer);
      sliderState.autoplayTimer = null;
    }
    if (sliderState.tempPauseTimer !== null) {
      window.clearTimeout(sliderState.tempPauseTimer);
      sliderState.tempPauseTimer = null;
      sliderState.isTemporarilyPaused = false;
    }
  }

  /**
   * Tạm dừng cơ chế tự chuyển slide trong một khoảng ngắn để người dùng xem gợi ý mới trên Slide 1.
   * @param {number} [durationMs=SLIDER_TEMP_PAUSE_MS] - Thời gian tạm dừng (mili-giây).
   */
  function pauseSliderAutoplayTemporarily(durationMs = SLIDER_TEMP_PAUSE_MS) {
    if (sliderState.tempPauseTimer !== null) {
      window.clearTimeout(sliderState.tempPauseTimer);
      sliderState.tempPauseTimer = null;
    }
    sliderState.isTemporarilyPaused = true;
    syncSliderAutoplay();
    sliderState.tempPauseTimer = window.setTimeout(() => {
      sliderState.tempPauseTimer = null;
      sliderState.isTemporarilyPaused = false;
      syncSliderAutoplay();
    }, durationMs);
  }

  /**
   * Cập nhật thuộc tính aria-live trên track dựa trên trạng thái tự chạy / tương tác.
   * @param {'init'|'auto'|'user'|'motion-change'} [source='init'] Nguồn kích hoạt cập nhật.
   */
  function updateSliderLiveMode(source = 'init') {
    const trackEl = document.querySelector('.js-slider-track');
    if (!trackEl) return;

    const shouldBePolite = sliderState.prefersReducedMotion || source === 'user';
    trackEl.setAttribute('aria-live', shouldBePolite ? 'polite' : 'off');
  }

  /**
   * Đồng bộ bộ đếm thời gian tự động chuyển slide (6 giây/lần) theo hover, focus, tab ẩn, tạm dừng và reduced-motion.
   */
  function syncSliderAutoplay() {
    if (sliderState.autoplayTimer !== null) {
      window.clearInterval(sliderState.autoplayTimer);
      sliderState.autoplayTimer = null;
    }

    const canAutoplay =
      sliderState.totalSlides > 1 &&
      !sliderState.isTemporarilyPaused &&
      !sliderState.isHovered &&
      !sliderState.isFocusedWithin &&
      !sliderState.isPageHidden &&
      !sliderState.prefersReducedMotion;

    if (!canAutoplay) return;

    sliderState.autoplayTimer = window.setInterval(() => {
      goToSlide(sliderState.currentIndex + 1, 'auto');
    }, SLIDER_AUTOPLAY_MS);
  }

  /**
   * Đồng bộ trạng thái active, inert và tabindex cho từng slide để tránh focus lọt vào slide ẩn.
   * @param {HTMLElement} slideEl - Phần tử DOM của một slide.
   * @param {boolean} isCurrent - True nếu slide đang được hiển thị.
   */
  function syncSlideAccessibility(slideEl, isCurrent) {
    slideEl.classList.toggle('hero-slider__slide--active', isCurrent);
    slideEl.setAttribute('aria-hidden', isCurrent ? 'false' : 'true');
    if (isCurrent) slideEl.removeAttribute('inert');
    else slideEl.setAttribute('inert', '');

    slideEl.querySelectorAll('a, button, input, select, textarea').forEach(el => {
      if (isCurrent) el.removeAttribute('tabindex');
      else el.setAttribute('tabindex', '-1');
    });
  }

  /**
   * Chuyển đến slide chỉ định, cập nhật vị trí track, chấm điều hướng và quản lý inert/tabindex.
   * @param {number} nextIndex - Chỉ số slide đích.
   * @param {'init'|'auto'|'user'} [source='user'] - Nguồn kích hoạt chuyển slide.
   */
  function goToSlide(nextIndex, source = 'user') {
    const sliderEl = document.querySelector('.js-hero-slider');
    if (!sliderEl) return;

    const slideEls = sliderEl.querySelectorAll('.js-slider-slide');
    const total = slideEls.length || sliderState.totalSlides;
    if (total === 0) return;

    sliderState.totalSlides = total;
    const targetIndex = ((nextIndex % total) + total) % total;
    sliderState.currentIndex = targetIndex;

    const trackEl = sliderEl.querySelector('.js-slider-track');
    const viewportEl = sliderEl.querySelector('.js-slider-viewport');
    if (viewportEl && viewportEl.scrollLeft !== 0) viewportEl.scrollLeft = 0;

    if (trackEl) {
      for (let i = 0; i < total; i++) trackEl.classList.remove(`hero-slider__track--step-${i}`);
      trackEl.classList.add(`hero-slider__track--step-${targetIndex}`);
    }

    slideEls.forEach((slideEl, idx) => syncSlideAccessibility(slideEl, idx === targetIndex));

    sliderEl.querySelectorAll('.js-slider-dot').forEach((dotEl, idx) => {
      const isActive = idx === targetIndex;
      dotEl.classList.toggle('hero-slider__dot--active', isActive);
      if (isActive) dotEl.setAttribute('aria-current', 'true');
      else dotEl.removeAttribute('aria-current');
    });

    updateSliderLiveMode(source);
  }

  /**
   * Đổ dữ liệu động vào Slide 1 (theo trạng thái cá nhân hóa), Slide 2 và Slide 3 của Hero Slider.
   */
  function renderHeroSlider() {
    const sliderEl = document.querySelector('.js-hero-slider');
    if (!sliderEl) return;

    renderHeroSlide1();
    renderFeaturedSliderCards(allConferences);
    renderDeadlineSliderCards(allConferences);

    const slideEls = sliderEl.querySelectorAll('.js-slider-slide');
    sliderState.totalSlides = slideEls.length || SLIDER_TOTAL_SLIDES;

    goToSlide(sliderState.currentIndex, 'init');
    syncSliderAutoplay();
  }

  /**
   * Lắng nghe tùy chọn `prefers-reduced-motion` của hệ thống cho Hero Slider.
   */
  function bindSliderReducedMotion() {
    const motionQuery = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;
    if (!motionQuery) return;

    sliderState.prefersReducedMotion = motionQuery.matches;
    const handleMotionChange = event => {
      sliderState.prefersReducedMotion = Boolean(event.matches);
      updateSliderLiveMode('motion-change');
      syncSliderAutoplay();
    };
    if (typeof motionQuery.addEventListener === 'function') {
      motionQuery.addEventListener('change', handleMotionChange);
    } else if (typeof motionQuery.addListener === 'function') {
      motionQuery.addListener(handleMotionChange);
    }
  }

  /**
   * Gắn sự kiện click dot, nút chọn/đổi lĩnh vực trong Slide 1, hover, focus và phím mũi tên cho slider.
   * @param {HTMLElement} sliderEl - Phần tử gốc `.js-hero-slider`.
   */
  function bindSliderNavigationEvents(sliderEl) {
    sliderEl.addEventListener('click', event => {
      if (!(event.target instanceof Element)) return;

      const chooseTopicsBtn = event.target.closest('.js-hero-choose-topics');
      if (chooseTopicsBtn) {
        event.preventDefault();
        pauseSliderAutoplayTemporarily();
        const utils = getUtils();
        if (utils && typeof utils.openPreferencesSurveyModal === 'function') {
          utils.openPreferencesSurveyModal({
            topicsOnly: true,
            returnFocusEl: chooseTopicsBtn
          });
        }
        return;
      }

      const dotBtn = event.target.closest('.js-slider-dot');
      if (!dotBtn) return;
      const idx = Number.parseInt(dotBtn.getAttribute('data-slide-index') || '0', 10);
      if (Number.isFinite(idx)) {
        goToSlide(idx, 'user');
        syncSliderAutoplay();
      }
    });

    sliderEl.addEventListener('mouseenter', () => { sliderState.isHovered = true; syncSliderAutoplay(); });
    sliderEl.addEventListener('mouseleave', () => { sliderState.isHovered = false; syncSliderAutoplay(); });
    sliderEl.addEventListener('focusin', () => { sliderState.isFocusedWithin = true; syncSliderAutoplay(); });
    sliderEl.addEventListener('focusout', event => {
      if (event.relatedTarget instanceof Node && sliderEl.contains(event.relatedTarget)) return;
      sliderState.isFocusedWithin = false;
      syncSliderAutoplay();
    });

    sliderEl.addEventListener('keydown', event => {
      if (sliderState.totalSlides <= 1) return;
      if (event.target instanceof Element && event.target.closest('input, textarea, select')) return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

      event.preventDefault();
      goToSlide(sliderState.currentIndex + (event.key === 'ArrowLeft' ? -1 : 1), 'user');
      syncSliderAutoplay();
    });
  }

  /**
   * Gắn sự kiện vuốt ngang cảm ứng bằng Pointer Events cho viewport slider.
   * @param {HTMLElement} sliderEl - Phần tử gốc `.js-hero-slider`.
   */
  function bindSliderSwipeEvents(sliderEl) {
    const viewportEl = sliderEl.querySelector('.js-slider-viewport');
    if (!viewportEl) return;

    let activePointerId = null;
    let startX = 0;
    let startY = 0;

    viewportEl.addEventListener('pointerdown', event => {
      if (sliderState.totalSlides <= 1 || (event.pointerType === 'mouse' && event.button !== 0)) return;
      activePointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
    });

    viewportEl.addEventListener('pointerup', event => {
      if (activePointerId === null || event.pointerId !== activePointerId) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      activePointerId = null;

      if (Math.abs(dx) >= SLIDER_SWIPE_THRESHOLD_PX && Math.abs(dx) > Math.abs(dy)) {
        goToSlide(sliderState.currentIndex + (dx < 0 ? 1 : -1), 'user');
        syncSliderAutoplay();
      }
    });

    viewportEl.addEventListener('pointercancel', () => { activePointerId = null; });
  }

  /**
   * Khởi tạo toàn bộ sự kiện chấm điều hướng, bàn phím, reduced-motion, visibility và vuốt cảm ứng cho slider.
   */
  function initHeroSliderEvents() {
    if (sliderState.eventsBound) return;
    const sliderEl = document.querySelector('.js-hero-slider');
    if (!sliderEl) return;

    sliderState.eventsBound = true;
    const slideEls = sliderEl.querySelectorAll('.js-slider-slide');
    sliderState.totalSlides = slideEls.length || SLIDER_TOTAL_SLIDES;

    bindSliderReducedMotion();
    bindSliderNavigationEvents(sliderEl);
    bindSliderSwipeEvents(sliderEl);

    document.addEventListener('visibilitychange', () => {
      sliderState.isPageHidden = Boolean(document.hidden);
      syncSliderAutoplay();
    });
    window.addEventListener('pagehide', stopSliderAutoplay);
    window.addEventListener('beforeunload', stopSliderAutoplay);

    goToSlide(0, 'init');
    syncSliderAutoplay();
  }

  /**
   * Xác định khóa localStorage lưu danh sách hội nghị đã lưu của người dùng đã đăng nhập.
   * Trả về chuỗi rỗng nếu chưa đăng nhập (không lưu cho khách).
   * @returns {string} Khóa lưu trữ trong localStorage hoặc chuỗi rỗng.
   */
  function getSavedStorageKey() {
    const utils = getUtils();
    if (utils && typeof utils.getSavedStorageKey === 'function') {
      return utils.getSavedStorageKey(false);
    }
    const user = readStorageSafe('confguide_current_user', null);
    return user && (user.id || user.username || user.email)
      ? `confguide_saved_${user.id || user.username || user.email}`
      : '';
  }

  /**
   * Đọc danh sách ID hội nghị đã lưu của người dùng đã đăng nhập (trả về [] nếu chưa đăng nhập).
   * @returns {Array<string>} Mảng ID hội nghị đã lưu.
   */
  function getSavedConferenceIds() {
    const utils = getUtils();
    if (utils && typeof utils.getSavedConferenceIds === 'function') {
      return utils.getSavedConferenceIds(false);
    }
    const key = getSavedStorageKey();
    if (!key) return [];
    const list = readStorageSafe(key, []);
    return Array.isArray(list) ? list.map(id => String(id)) : [];
  }

  /**
   * Ghi danh sách ID hội nghị đã lưu (chỉ khi đã đăng nhập).
   * @param {Array<string>} ids Mảng ID hội nghị cần lưu.
   * @returns {boolean} True nếu lưu thành công.
   */
  function setSavedConferenceIds(ids) {
    const utils = getUtils();
    if (utils && typeof utils.setSavedConferenceIds === 'function') {
      return utils.setSavedConferenceIds(ids, false);
    }
    const key = getSavedStorageKey();
    if (!key) return false;
    return writeStorageSafe(key, Array.isArray(ids) ? ids : []);
  }

  /**
   * Phát thông báo phản hồi khi lưu / bỏ lưu hội nghị qua toast dùng chung hoặc vùng aria-live.
   * @param {string} message Nội dung thông báo.
   * @param {'success'|'info'|'error'} [type='info'] Mức độ thông báo.
   */
  function announceSaveFeedback(message, type = 'info') {
    const utils = getUtils();
    if (utils && typeof utils.showToast === 'function') {
      utils.showToast(message, type);
      return;
    }

    let liveEl = document.querySelector('.js-save-live-region');
    if (!liveEl && document.body) {
      liveEl = document.createElement('div');
      liveEl.className = 'sr-only js-save-live-region';
      liveEl.setAttribute('role', 'status');
      liveEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(liveEl);
    }
    if (liveEl) {
      liveEl.textContent = '';
      window.setTimeout(() => {
        liveEl.textContent = message;
      }, 20);
    }
  }

  /**
   * Tạo chuỗi HTML nút biểu tượng "Lưu hội nghị" cho mỗi thẻ trong #conferenceGrid.
   * @param {string} confId Mã định danh slug của hội nghị.
   * @param {string} confName Tên hiển thị của hội nghị.
   * @param {boolean} isSaved Trạng thái đã lưu hiện tại.
   * @returns {string} Chuỗi HTML phần tử <button>.
   */
  function renderSaveButtonHtml(confId, confName, isSaved) {
    const utils = getUtils();
    const esc = utils && utils.escapeHtml ? utils.escapeHtml : val => String(val ?? '');
    const savedClass = isSaved ? ' conf-save-btn--saved' : '';
    const ariaLabel = isSaved ? `Bỏ lưu hội nghị ${confName}` : `Lưu hội nghị ${confName}`;
    const titleText = isSaved ? 'Bỏ lưu hội nghị' : 'Lưu hội nghị';

    return `
      <button
        type="button"
        class="conf-save-btn js-conf-save-btn${savedClass}"
        data-conf-id="${esc(confId)}"
        data-conf-name="${esc(confName)}"
        aria-pressed="${isSaved ? 'true' : 'false'}"
        aria-label="${esc(ariaLabel)}"
        title="${esc(titleText)}"
      >
        <svg class="conf-save-btn__icon" viewBox="0 0 24 24" aria-hidden="true">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      </button>
    `;
  }

  /**
   * Đồng bộ trạng thái sao vàng / sao khung cho toàn bộ nút .js-conf-save-btn trên Hero Slide 1 và lưới trang chủ.
   */
  function syncSaveButtonsUi() {
    const savedIds = getSavedConferenceIds();
    const buttons = document.querySelectorAll('.js-conf-save-btn');
    buttons.forEach(btn => {
      const confId = btn.getAttribute('data-conf-id') || '';
      const confName = btn.getAttribute('data-conf-name') || confId;
      const isSaved = Boolean(confId && savedIds.includes(confId));

      btn.classList.toggle('conf-save-btn--saved', isSaved);
      btn.setAttribute('aria-pressed', isSaved ? 'true' : 'false');
      btn.setAttribute('aria-label', isSaved ? `Bỏ lưu hội nghị ${confName}` : `Lưu hội nghị ${confName}`);
      btn.setAttribute('title', isSaved ? 'Bỏ lưu hội nghị' : 'Lưu hội nghị');
    });
  }

  /**
   * Xử lý bật/tắt trạng thái lưu hội nghị khi người dùng bấm nút sao trên thẻ (yêu cầu đăng nhập).
   * @param {HTMLElement} btn Phần tử nút .js-conf-save-btn được bấm.
   */
  function handleSaveButtonClick(btn) {
    if (!btn) return;
    const confId = btn.getAttribute('data-conf-id') || '';
    if (!confId) return;

    const utils = getUtils();
    if (!utils || typeof utils.toggleSavedConference !== 'function') {
      announceSaveFeedback('Vui lòng đăng nhập để sử dụng chức năng theo dõi hội nghị.', 'info');
      return;
    }

    const result = utils.toggleSavedConference(confId, { redirectUrl: 'index.html' });
    if (!result || result.requiresAuth || !result.ok) {
      return;
    }

    syncSaveButtonsUi();
    announceSaveFeedback(result.isSaved ? 'Đã lưu hội nghị' : 'Đã bỏ lưu', result.isSaved ? 'success' : 'info');
  }

  /**
   * Gắn sự kiện Event Delegation trên #conferenceGrid và .js-hero-slider; đồng bộ lại qua pageshow / storage.
   */
  function initSaveConferences() {
    const handleSaveDelegation = event => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const saveBtn = target.closest('.js-conf-save-btn');
      if (saveBtn) {
        event.preventDefault();
        event.stopPropagation();
        handleSaveButtonClick(saveBtn);
      }
    };

    const grid = document.getElementById('conferenceGrid');
    if (grid) {
      grid.addEventListener('click', handleSaveDelegation);
    }

    const heroSlider = document.querySelector('.js-hero-slider');
    if (heroSlider) {
      heroSlider.addEventListener('click', handleSaveDelegation);
    }

    const refreshAllDynamicViews = () => {
      renderHeroSlide1();
      syncSaveButtonsUi();
    };

    window.addEventListener('pageshow', refreshAllDynamicViews);
    window.addEventListener('storage', event => {
      if (!event.key || event.key === getSavedStorageKey() || event.key === 'confguide_current_user' || event.key === 'confguide_users') {
        refreshAllDynamicViews();
      }
    });
  }

  /**
   * Khởi tạo biểu mẫu tìm kiếm nhanh điều hướng sang trang Tra cứu (search.html?q=...).
   */
  function initSearchGateway() {
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');

    if (searchForm && searchInput) {
      searchForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const query = searchInput.value.trim();
        const targetUrl = query
          ? `search.html?q=${encodeURIComponent(query)}`
          : 'search.html';
        if (window.ConfGuidePageTransition && typeof window.ConfGuidePageTransition.navigate === 'function') {
          window.ConfGuidePageTransition.navigate(targetUrl, { searchFocus: true });
        } else {
          window.location.href = targetUrl;
        }
      });
    }
  }

  /**
   * Hiển thị trạng thái đang tải dữ liệu hội nghị trong vùng lưới kết quả.
   * @param {boolean} isLoading Trạng thái đang tải.
   */
  function setLoadingState(isLoading) {
    const grid = document.getElementById('conferenceGrid');
    if (!grid || !isLoading) return;
    grid.innerHTML = '<div class="loading-state-box" role="status" aria-live="polite">Đang tải danh sách hội nghị...</div>';
  }

  /**
   * Tải danh sách hội nghị từ JSON bằng fetch() hoặc dùng dữ liệu dự phòng khi chạy file:///.
   * Dùng chung kết quả cho cả slider hero lẫn lưới 6 hội nghị tiêu biểu (chỉ fetch 1 lần).
   * @returns {Promise<void>}
   */
  async function loadData() {
    const utils = getUtils();
    const fallback = utils && Array.isArray(utils.FALLBACK_CONFERENCES) ? utils.FALLBACK_CONFERENCES : [];
    const normalize = utils && utils.normalizeConference ? utils.normalizeConference : item => item;

    setLoadingState(true);

    try {
      const data = utils && typeof utils.fetchJsonCached === 'function'
        ? await utils.fetchJsonCached('data/conference_data.json')
        : await fetch('data/conference_data.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
      allConferences = Array.isArray(data) && data.length > 0
        ? data.map(normalize).filter(Boolean)
        : fallback;
    } catch (e) {
      // Dự phòng sang dữ liệu cục bộ khi chạy qua giao thức file:/// hoặc lỗi kết nối
      allConferences = fallback;
    }

    isDataLoaded = true;
    renderHeroSlider();
    renderFeaturedConferences();
  }

  /**
   * Lấy danh sách lĩnh vực đơn chuẩn hóa `{ key, label }` cho một hội nghị dựa trên dữ liệu gốc.
   * @param {Object} conf - Đối tượng hội nghị.
   * @param {Object|null} utils - Tiện ích dùng chung ConfGuideUtils.
   * @returns {Array<{ key: string, label: string }>} Danh sách lĩnh vực đơn.
   */
  function getConferenceTopicItems(conf, utils) {
    if (!conf || typeof conf !== 'object') return [];
    if (window.ConfGuideSearchCore && typeof window.ConfGuideSearchCore.normalizeTopicFields === 'function') {
      return window.ConfGuideSearchCore.normalizeTopicFields(conf);
    }
    const labels = utils && typeof utils.extractTopicLabels === 'function'
      ? utils.extractTopicLabels(conf)
      : [];
    return labels.map(label => ({ key: fallbackSlugify(label), label }));
  }

  /**
   * Đánh giá thông tin xếp hạng theo mục đích sử dụng trang web (chỉ dùng cho lưới hội nghị tiêu biểu).
   * @param {Object} conf - Đối tượng hội nghị chuẩn hóa.
   * @param {Object|null} utils - Tham chiếu `ConfGuideUtils`.
   * @param {string} todayIso - Ngày hiện tại dạng YYYY-MM-DD (UTC+7).
   * @returns {Object} Chỉ số xếp hạng theo mục đích.
   */
  function evaluateConferencePurposeMatch(conf, utils, todayIso) {
    const nextDl = utils && typeof utils.getNextDeadline === 'function'
      ? utils.getNextDeadline(conf)
      : null;
    const hasOpenCfp = Boolean(nextDl && !nextDl.isPassed);
    const startIso = normalizeDateIsoLocal(conf && conf.startDate);
    const isUpcomingEvent = Boolean(startIso && todayIso && startIso >= todayIso);
    const feeBounds = utils && typeof utils.getFeeSortBoundsUsd === 'function'
      ? utils.getFeeSortBoundsUsd(conf)
      : null;

    return {
      hasOpenCfp,
      daysLeft: nextDl ? nextDl.daysLeft : Number.MAX_SAFE_INTEGER,
      isUpcomingEvent,
      startIso,
      rankWeight: getConferenceRankWeight(conf),
      feeBounds
    };
  }

  /**
   * So sánh 2 hội nghị theo mục đích sử dụng trang web mà người dùng đã chọn.
   * @param {Object} a - Bản ghi kèm thông tin đánh giá `evalInfo`.
   * @param {Object} b - Bản ghi kèm thông tin đánh giá `evalInfo`.
   * @param {string} purpose - Khóa mục đích sử dụng.
   * @returns {number} Giá trị so sánh âm/dương/0.
   */
  function compareByUserPurpose(a, b, purpose) {
    const evalA = a.evalInfo;
    const evalB = b.evalInfo;
    if (purpose === 'submit-paper') {
      if (evalA.hasOpenCfp !== evalB.hasOpenCfp) return evalA.hasOpenCfp ? -1 : 1;
      if (evalA.hasOpenCfp && evalA.daysLeft !== evalB.daysLeft) return evalA.daysLeft - evalB.daysLeft;
    } else if (purpose === 'track-deadlines') {
      if (evalA.isUpcomingEvent !== evalB.isUpcomingEvent) return evalA.isUpcomingEvent ? -1 : 1;
      if (evalA.startIso && evalB.startIso && evalA.startIso !== evalB.startIso) {
        return evalA.startIso.localeCompare(evalB.startIso);
      }
      if (Boolean(evalA.startIso) !== Boolean(evalB.startIso)) return evalA.startIso ? -1 : 1;
    } else if (purpose === 'explore-rank') {
      if (evalA.rankWeight !== evalB.rankWeight) return evalA.rankWeight - evalB.rankWeight;
    } else if (purpose === 'budget-friendly') {
      if (Boolean(evalA.feeBounds) !== Boolean(evalB.feeBounds)) return evalA.feeBounds ? -1 : 1;
      if (evalA.feeBounds && evalB.feeBounds) {
        const diff = evalA.feeBounds.minUsd - evalB.feeBounds.minUsd;
        if (Math.abs(diff) > 1e-6) return diff;
      }
    }
    return 0;
  }

  /**
   * Tạo mã HTML một thẻ hội nghị nổi bật trên lưới Trang chủ.
   * @param {Object} item - Đối tượng hội nghị chuẩn hóa.
   * @param {Array<string>} savedIds - Mảng ID hội nghị đã lưu.
   * @param {Object|null} utils - Đối tượng tiện ích ConfGuideUtils.
   * @returns {string} Chuỗi HTML `<article class="conf-card card-surface">`.
   */
  function buildFeaturedConferenceCardHtml(item, savedIds, utils) {
    const esc = utils && utils.escapeHtml ? utils.escapeHtml : val => String(val ?? '');
    const nextDl = utils && utils.getNextDeadline ? utils.getNextDeadline(item) : null;
    let deadlineBadgeText = 'Chưa công bố';
    let deadlineStatusMod = 'closed';

    if (nextDl) {
      const formattedDl = utils && utils.formatDeadlineVi
        ? utils.formatDeadlineVi(nextDl.date)
        : (nextDl.displayDate || nextDl.date);
      if (!nextDl.isPassed) {
        deadlineBadgeText = `${nextDl.shortName}: ${formattedDl} (còn ${nextDl.daysLeft} ngày)`;
        deadlineStatusMod = nextDl.daysLeft <= HOME_URGENT_DAYS ? 'urgent' : 'open';
      } else {
        deadlineBadgeText = `${nextDl.shortName}: ${formattedDl} (Đã qua)`;
      }
    }

    const confId = resolveConferenceId(item);
    const confName = String(item.name || confId).trim();
    const isSaved = Boolean(confId && savedIds.includes(confId));
    const dateRange = utils && utils.formatRangeVi
      ? (utils.formatRangeVi(item.startDate, item.endDate) || item.date_happen || 'Chưa cập nhật')
      : (item.date_happen || 'Chưa cập nhật');
    const feeText = utils && typeof utils.formatConferenceFee === 'function'
      ? utils.formatConferenceFee(item)
      : 'Chưa cập nhật';
    const feeItemMod = feeText === 'Chưa cập nhật' ? ' conf-meta-item--muted' : ' conf-meta-item--fee';
    const descText = String(item.summarization || item.fullName || item.full_name || '').trim();
    const descHtml = descText
      ? `<p class="conf-desc">${esc(descText)}</p>`
      : '<p class="conf-desc">Chưa cập nhật mô tả</p>';
    const saveBtnHtml = renderSaveButtonHtml(confId, confName, isSaved);
    const compareBtnHtml = window.ConfGuideCompare ? window.ConfGuideCompare.renderToggleButton(item) : '';
    const avatarHtml = utils && utils.renderConferenceAvatar
      ? utils.renderConferenceAvatar(item)
      : `<div class="conf-badge-logo" aria-hidden="true">${esc((item.name || 'CG').slice(0, 4).toUpperCase())}</div>`;
    const rank = getNormalizedRank(item);
    const rankBadgeText = rank ? `Rank ${rank}` : 'Chưa xếp hạng';
    const rankModCls = rank ? '' : ' conf-rank--unranked';

    return `
      <article class="conf-card card-surface" data-id="${esc(confId)}">
        <div>
          <div class="conf-top">
            ${avatarHtml}
            <div class="conf-title-wrap">
              <h3>${esc(item.name)}</h3>
              <span class="conf-rank${rankModCls}">${esc(rankBadgeText)}</span>
            </div>
          </div>

          ${descHtml}

          <div class="conf-meta">
            <div class="conf-meta-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                aria-hidden="true">
                <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span>${esc(item.location || 'Chưa cập nhật')}</span>
            </div>
            <div class="conf-meta-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
              <span>${esc(dateRange)}</span>
            </div>
            <div class="conf-meta-item${feeItemMod}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              <span>Lệ phí: ${esc(feeText)}</span>
            </div>
          </div>
        </div>

        <div class="conf-footer">
          <div class="conf-deadline-badge conf-deadline-badge--${deadlineStatusMod}">
            <strong>${esc(deadlineBadgeText)}</strong>
          </div>
          <div class="conf-card-actions">
            ${saveBtnHtml}
            ${compareBtnHtml}
            <a href="detail.html?id=${encodeURIComponent(confId)}" class="btn-detail">
              Xem chi tiết &rarr;
            </a>
          </div>
        </div>
      </article>
    `;
  }

  /**
   * Hiển thị tối đa 6 hội nghị tiêu biểu lên lưới trang chủ (ưu tiên theo mục đích tìm kiếm nếu có; không hiển thị trùng khuyến nghị lĩnh vực của Slide 1).
   */
  function renderFeaturedConferences() {
    const grid = document.getElementById('conferenceGrid');
    const emptyState = document.getElementById('emptyState');
    const resultsStatus = document.getElementById('resultsCount');
    const btnViewAll = document.getElementById('btnViewAll');
    const utils = getUtils();

    if (!grid) return;

    if (btnViewAll) {
      btnViewAll.innerHTML = `
        <span>Xem tất cả ${allConferences.length} hội nghị trên hệ thống</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      `;
    }

    const prefs = utils && typeof utils.getUserPreferences === 'function'
      ? utils.getUserPreferences()
      : { purpose: '' };
    const activePurpose = typeof prefs.purpose === 'string' ? prefs.purpose : '';
    const purposes = utils && Array.isArray(utils.USAGE_PURPOSES) ? utils.USAGE_PURPOSES : [];
    const activePurposeObj = activePurpose ? purposes.find(item => item.key === activePurpose) : null;
    const todayIso = getTodayVnIso();

    const decorated = allConferences.map(conf => ({
      conf,
      evalInfo: activePurpose
        ? evaluateConferencePurposeMatch(conf, utils, todayIso)
        : { rankWeight: getConferenceRankWeight(conf) }
    }));

    decorated.sort((a, b) => {
      if (activePurpose) {
        const purposeDiff = compareByUserPurpose(a, b, activePurpose);
        if (purposeDiff !== 0) return purposeDiff;
      }
      const rankDiff = a.evalInfo.rankWeight - b.evalInfo.rankWeight;
      if (rankDiff !== 0) return rankDiff;
      const yearA = parseInt(a.conf.year || '2026', 10);
      const yearB = parseInt(b.conf.year || '2026', 10);
      return yearB !== yearA
        ? yearB - yearA
        : String(a.conf.name || '').localeCompare(String(b.conf.name || ''), 'vi', { sensitivity: 'base' });
    });

    const displayItems = decorated.slice(0, FEATURED_HOME_LIMIT);
    if (resultsStatus) {
      const purposeSuffix = activePurposeObj
        ? ` (ưu tiên: ${utils.escapeHtml ? utils.escapeHtml(activePurposeObj.shortLabel || activePurposeObj.label) : (activePurposeObj.shortLabel || activePurposeObj.label)})`
        : '';
      resultsStatus.innerHTML = `Hiển thị <strong>${displayItems.length}</strong> hội nghị tiêu biểu${purposeSuffix}`;
    }

    if (displayItems.length === 0) {
      grid.innerHTML = '';
      if (emptyState) emptyState.hidden = false;
      return;
    }

    if (emptyState) emptyState.hidden = true;
    const savedIds = getSavedConferenceIds();
    grid.innerHTML = displayItems
      .map(entry => buildFeaturedConferenceCardHtml(entry.conf, savedIds, utils))
      .join('');
  }

  /**
   * Lắng nghe sự kiện cập nhật cá nhân hóa từ modal để đồng bộ Slide 1 và danh sách hội nghị Trang chủ.
   */
  function initPersonalizationSync() {
    window.addEventListener('confguide:preferences-changed', () => {
      renderHeroSlide1();
      goToSlide(0, 'user');
      pauseSliderAutoplayTemporarily();
      const utils = getUtils();
      const selectedKeys = utils && typeof utils.getUserResearchTopicKeys === 'function'
        ? utils.getUserResearchTopicKeys()
        : [];
      const liveMsg = selectedKeys.length > 0
        ? `Đã cập nhật gợi ý trên Slide 1 cho ${selectedKeys.length} lĩnh vực đã chọn.`
        : 'Đã cập nhật thiết lập cá nhân hóa.';
      announceSlide1Status(liveMsg);
      if (allConferences.length > 0) {
        renderFeaturedConferences();
      }
    });
  }

  /**
   * Gắn sự kiện chuyển tab lọc khu vực nếu có trên DOM.
   */
  function initTabs() {
    const tabButtons = document.querySelectorAll('.filter-tabs .tab-btn');
    tabButtons.forEach(btn => {
      btn.addEventListener('click', function () {
        tabButtons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentTab = this.getAttribute('data-filter') || 'all';
        renderFeaturedConferences();
      });
    });
  }

  /* ================= 6. KHỞI TẠO TRANG CHỦ ================= */

  /**
   * Điểm khởi chạy duy nhất cho các module trên Trang chủ khi DOM sẵn sàng.
   */
  function initIndexPage() {
    initSearchGateway();
    initHeroSliderEvents();
    initSaveConferences();
    initPersonalizationSync();
    initTabs();
    loadData();
  }

  document.addEventListener('DOMContentLoaded', initIndexPage);
})();
