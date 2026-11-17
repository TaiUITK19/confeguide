/**
 * ConfGuide - Kịch bản Trang chủ (js/pages/index.js)
 * Quản lý Hero 2 cột cân đối (cột trái tìm kiếm nhanh; cột phải Hero Slider 3 slide:
 * Danh ngôn & Tóm tắt nhanh, Hội nghị nổi bật Rank A* & A, Sắp hết hạn UTC+7),
 * nạp dữ liệu hội nghị (fetch + fallback file:///) và hiển thị 6 hội nghị kèm nút Lưu.
 */

(function () {
  'use strict';

  /** Khoảng thời gian tự động chuyển slide (mili-giây) */
  const SLIDER_AUTOPLAY_MS = 6000;

  /** Ngưỡng kéo/vuốt ngang để chuyển slide trên thiết bị cảm ứng (px) */
  const SLIDER_SWIPE_THRESHOLD_PX = 40;

  /** Tổng số slide cố định trong Hero Slider */
  const SLIDER_TOTAL_SLIDES = 3;

  /** Trọng số xếp hạng CORE đồng bộ theo trang Tra cứu (js/pages/search.js) */
  const RANK_WEIGHT = { 'A*': 0, A: 1, B: 2, C: 3 };

  /** Tập hợp giá trị Rank CORE hợp lệ đồng bộ theo js/pages/search.js */
  const VALID_RANK_VALUES = new Set(['A*', 'A', 'B', 'C']);

  let allConferences = [];
  let currentTab = 'all';

  /** Trạng thái điều khiển của Hero Slider */
  const sliderState = {
    totalSlides: SLIDER_TOTAL_SLIDES,
    currentIndex: 0,
    autoplayTimer: null,
    isHovered: false,
    isFocusedWithin: false,
    isPageHidden: typeof document !== 'undefined' ? Boolean(document.hidden) : false,
    prefersReducedMotion: false,
    eventsBound: false
  };

  /**
   * Lấy đối tượng tiện ích dùng chung từ layout.js.
   * @returns {Object|null} Tham chiếu tới window.ConfGuideUtils.
   */
  function getUtils() {
    return window.ConfGuideUtils || null;
  }

  /** Đọc JSON từ localStorage an toàn (tái sử dụng ConfGuideUtils.readStorage). */
  function readStorageSafe(key, fallback) {
    const utils = getUtils();
    if (utils && typeof utils.readStorage === 'function') return utils.readStorage(key, fallback);
    try { const raw = window.localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch { return fallback; }
  }

  /** Ghi JSON vào localStorage an toàn (tái sử dụng ConfGuideUtils.writeStorage). */
  function writeStorageSafe(key, value) {
    const utils = getUtils();
    if (utils && typeof utils.writeStorage === 'function') return utils.writeStorage(key, value);
    try { window.localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
  }

  /** Chuẩn hóa chuỗi thành mã slug URL (tái sử dụng ConfGuideUtils.slugify). */
  function fallbackSlugify(text) {
    const utils = getUtils();
    if (utils && typeof utils.slugify === 'function') return utils.slugify(text);
    return String(text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
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
   * Lấy ngày lịch hiện tại (YYYY-MM-DD) theo múi giờ cố định UTC+7 (Việt Nam).
   * @returns {string} Chuỗi ngày ISO YYYY-MM-DD tại UTC+7.
   */
  function getTodayVnIso() {
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
   * Chuẩn hóa và kiểm tra tính hợp lệ của xếp hạng CORE từ dữ liệu hội nghị (khớp với js/pages/search.js).
   * @param {Object|null} conf Đối tượng hội nghị.
   * @returns {'A*'|'A'|'B'|'C'|''} Nhãn rank hợp lệ hoặc chuỗi rỗng nếu chưa có hạng.
   */
  function getNormalizedRank(conf) {
    const rawRank = String((conf && conf.rank) || '').trim().toUpperCase();
    return VALID_RANK_VALUES.has(rawRank) ? rawRank : '';
  }

  /**
   * Tính trọng số xếp hạng CORE của hội nghị để sắp xếp ưu tiên.
   * @param {Object} conf Đối tượng hội nghị.
   * @returns {number} Trọng số (0 = A*, 1 = A, 2 = B, 3 = C, 99 = chưa xếp hạng).
   */
  function getConferenceRankWeight(conf) {
    const rank = getNormalizedRank(conf);
    return rank && Object.prototype.hasOwnProperty.call(RANK_WEIGHT, rank) ? RANK_WEIGHT[rank] : 99;
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
   * Chọn cặp 2 hội nghị nổi bật cho Slide 2: ưu tiên 1 hội nghị Rank A* và 1 hội nghị Rank A.
   * Nếu thiếu A* hoặc A trong dữ liệu hiện tại, bù bằng hội nghị có rank cao nhất kế tiếp.
   * @param {Array<Object>} conferences Danh sách hội nghị đã chuẩn hóa.
   * @returns {Array<Object>} Tối đa 2 hội nghị tiêu biểu (không trùng lặp).
   */
  function selectFeaturedPair(conferences) {
    const validConfs = (conferences || []).filter(conf => {
      const id = resolveConferenceId(conf);
      return Boolean(id && conf && conf.name);
    });
    if (validConfs.length === 0) return [];

    const todayVnIso = getTodayVnIso();

    const getEventGroup = conf => {
      const startIso = normalizeDateIsoLocal(conf.startDate || conf.start_date);
      const endIso = normalizeDateIsoLocal(conf.endDate || conf.end_date) || startIso;
      if (!startIso) return { group: 3, sortDate: '9999-99-99' };
      if (startIso >= todayVnIso) return { group: 0, sortDate: startIso };
      if (endIso >= todayVnIso) return { group: 1, sortDate: endIso };
      return { group: 2, sortDate: startIso };
    };

    const hasCompleteMeta = conf => {
      const hasStart = Boolean(normalizeDateIsoLocal(conf.startDate || conf.start_date));
      const hasLocation = Boolean(String(conf.location || '').trim());
      return hasStart && hasLocation;
    };

    const sorted = validConfs.slice().sort((a, b) => {
      const rankDiff = getConferenceRankWeight(a) - getConferenceRankWeight(b);
      if (rankDiff !== 0) return rankDiff;

      // Trong cùng nhóm rank, ưu tiên hội nghị có đủ địa điểm và ngày diễn ra
      const completeDiff = Number(hasCompleteMeta(b)) - Number(hasCompleteMeta(a));
      if (completeDiff !== 0) return completeDiff;

      const evA = getEventGroup(a);
      const evB = getEventGroup(b);
      if (evA.group !== evB.group) return evA.group - evB.group;

      if (evA.group === 0 || evA.group === 1) {
        if (evA.sortDate !== evB.sortDate) return evA.sortDate.localeCompare(evB.sortDate);
      } else if (evA.group === 2) {
        if (evA.sortDate !== evB.sortDate) return evB.sortDate.localeCompare(evA.sortDate);
      }

      const ratingDiff = (b.rating || 0) - (a.rating || 0);
      if (ratingDiff !== 0) return ratingDiff;

      return String(a.name || '').localeCompare(String(b.name || ''), 'vi', { sensitivity: 'base' });
    });

    const selected = [];
    const usedIds = new Set();

    const pickByRank = targetRank => {
      const match = sorted.find(conf => {
        const id = resolveConferenceId(conf);
        return getNormalizedRank(conf) === targetRank && !usedIds.has(id);
      });
      if (match) {
        usedIds.add(resolveConferenceId(match));
        selected.push(match);
      }
    };

    pickByRank('A*');
    pickByRank('A');

    // Nếu thiếu A* hoặc A, bổ sung từ các hội nghị xếp hạng cao nhất còn lại để đủ 2 thẻ
    for (let i = 0; i < sorted.length && selected.length < 2; i++) {
      const conf = sorted[i];
      const id = resolveConferenceId(conf);
      if (!usedIds.has(id)) {
        usedIds.add(id);
        selected.push(conf);
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
    const rank = getNormalizedRank(conf);

    let rankModifier = ' hero-slide-card__rank--other';
    if (rank === 'A*') rankModifier = '';
    else if (rank === 'A') rankModifier = ' hero-slide-card__rank--a';

    const rankBadgeHtml = rank
      ? `<span class="hero-slide-card__rank${rankModifier}">Rank ${esc(rank)}</span>`
      : '<span class="hero-slide-card__rank hero-slide-card__rank--other">Đề xuất</span>';

    const fullName = String(conf.fullName || conf.full_name || '').trim();
    const showFullName = fullName && fullName !== conf.name;
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
   * Thu thập tối đa 2-3 hội nghị có mốc deadline gần nhất còn ở tương lai, sắp xếp tăng dần theo thời gian.
   * @param {Array<Object>} conferences Danh sách hội nghị đã chuẩn hóa.
   * @param {number} [limit=2] Số lượng hội nghị tối đa cần hiển thị.
   * @returns {Array<Object>} Danh sách mốc hạn nộp bài gần nhất ở tương lai.
   */
  function getNearestUpcomingDeadlines(conferences, limit = 2) {
    const utils = getUtils();
    const nowMs = Date.now();
    const candidates = [];

    (conferences || []).forEach(conf => {
      const confId = resolveConferenceId(conf);
      if (!confId || !conf || !conf.name) return;

      const futureDeadlines = parseDeadlinesSafe(conf).filter(
        dl => dl && !dl.isPassed && dl.targetMs > nowMs && Number.isFinite(dl.daysLeft) && dl.daysLeft >= 0
      );
      if (futureDeadlines.length === 0) return;

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
      const isUrgent = safeDays <= 7;
      candidates.push({
        id: confId,
        name: String(conf.name).trim(),
        milestoneName: String(nearest.name || nearest.shortName || 'Hạn nộp bài').trim(),
        rankWeight: getConferenceRankWeight(conf),
        targetMs: nearest.targetMs,
        datetimeAttr: (converted && converted.vnIsoDate) || nearest.vnDate || nearest.date,
        dateLabel: dateLabel,
        fullDateTitle: fullDateTitle,
        urgencyClass: isUrgent ? 'hero-slide-card__countdown--urgent' : 'hero-slide-card__countdown--normal',
        countdownText: isUrgent ? `Gấp · Còn ${safeDays} ngày` : `Đang mở · Còn ${safeDays} ngày`,
        locationText: String(conf.location || '').trim() || 'Chưa cập nhật địa điểm',
        detailUrl: `detail.html?id=${encodeURIComponent(confId)}`
      });
    });

    candidates.sort((a, b) => {
      if (a.targetMs !== b.targetMs) return a.targetMs - b.targetMs;
      if (a.rankWeight !== b.rankWeight) return a.rankWeight - b.rankWeight;
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
   * Dừng bộ đếm thời gian tự chuyển slide để tránh rò rỉ tài nguyên.
   */
  function stopSliderAutoplay() {
    if (sliderState.autoplayTimer !== null) {
      window.clearInterval(sliderState.autoplayTimer);
      sliderState.autoplayTimer = null;
    }
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
   * Đồng bộ bộ đếm thời gian tự động chuyển slide (6 giây/lần) theo hover, focus, tab ẩn và reduced-motion.
   */
  function syncSliderAutoplay() {
    stopSliderAutoplay();

    const canAutoplay =
      sliderState.totalSlides > 1 &&
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
   * Chuyển đến slide chỉ định, cập nhật vị trí track, chấm điều hướng và quản lý inert/tabindex.
   * @param {number} nextIndex Chỉ số slide đích.
   * @param {'init'|'auto'|'user'} [source='user'] Nguồn kích hoạt chuyển slide.
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
    if (viewportEl && viewportEl.scrollLeft !== 0) {
      viewportEl.scrollLeft = 0;
    }
    if (trackEl) {
      for (let i = 0; i < total; i++) {
        trackEl.classList.remove(`hero-slider__track--step-${i}`);
      }
      trackEl.classList.add(`hero-slider__track--step-${targetIndex}`);
    }

    slideEls.forEach((slideEl, idx) => {
      const isCurrent = idx === targetIndex;
      slideEl.classList.toggle('hero-slider__slide--active', isCurrent);
      slideEl.setAttribute('aria-hidden', isCurrent ? 'false' : 'true');

      if (isCurrent) {
        slideEl.removeAttribute('inert');
      } else {
        slideEl.setAttribute('inert', '');
      }

      // Dự phòng tabindex cho toàn bộ phần tử tương tác trong slide không hiển thị
      const focusables = slideEl.querySelectorAll('a, button, input, select, textarea');
      focusables.forEach(el => {
        if (isCurrent) {
          el.removeAttribute('tabindex');
        } else {
          el.setAttribute('tabindex', '-1');
        }
      });
    });

    const dotEls = sliderEl.querySelectorAll('.js-slider-dot');
    dotEls.forEach((dotEl, idx) => {
      const isActive = idx === targetIndex;
      dotEl.classList.toggle('hero-slider__dot--active', isActive);
      if (isActive) {
        dotEl.setAttribute('aria-current', 'true');
      } else {
        dotEl.removeAttribute('aria-current');
      }
    });

    updateSliderLiveMode(source);
  }

  /**
   * Đổ dữ liệu động vào các slide nổi bật và hạn nộp bài của Hero Slider sau khi tải JSON (hoặc fallback).
   */
  function renderHeroSlider() {
    const sliderEl = document.querySelector('.js-hero-slider');
    if (!sliderEl) return;

    renderFeaturedSliderCards(allConferences);
    renderDeadlineSliderCards(allConferences);

    const slideEls = sliderEl.querySelectorAll('.js-slider-slide');
    sliderState.totalSlides = slideEls.length || SLIDER_TOTAL_SLIDES;

    goToSlide(sliderState.currentIndex, 'init');
    syncSliderAutoplay();
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

    // Theo dõi tùy chọn giảm chuyển động của hệ điều hành
    const motionQuery = typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null;

    if (motionQuery) {
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

    // Ủy quyền click cho các chấm phân trang trong slider
    sliderEl.addEventListener('click', event => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const dotBtn = target.closest('.js-slider-dot');
      if (dotBtn) {
        const idx = Number.parseInt(dotBtn.getAttribute('data-slide-index') || '0', 10);
        if (Number.isFinite(idx)) {
          goToSlide(idx, 'user');
          syncSliderAutoplay();
        }
      }
    });

    // Tạm dừng khi rê chuột hoặc focus nằm trong khung slider
    sliderEl.addEventListener('mouseenter', () => {
      sliderState.isHovered = true;
      syncSliderAutoplay();
    });

    sliderEl.addEventListener('mouseleave', () => {
      sliderState.isHovered = false;
      syncSliderAutoplay();
    });

    sliderEl.addEventListener('focusin', () => {
      sliderState.isFocusedWithin = true;
      syncSliderAutoplay();
    });

    sliderEl.addEventListener('focusout', event => {
      const nextTarget = event.relatedTarget;
      if (nextTarget instanceof Node && sliderEl.contains(nextTarget)) return;
      sliderState.isFocusedWithin = false;
      syncSliderAutoplay();
    });

    // Hỗ trợ điều hướng bằng phím mũi tên trái/phải khi focus nằm trong slider
    sliderEl.addEventListener('keydown', event => {
      if (sliderState.totalSlides <= 1) return;
      const target = event.target;
      if (target instanceof Element && target.closest('input, textarea, select')) return;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goToSlide(sliderState.currentIndex - 1, 'user');
        syncSliderAutoplay();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goToSlide(sliderState.currentIndex + 1, 'user');
        syncSliderAutoplay();
      }
    });

    // Vuốt ngang trên thiết bị cảm ứng bằng Pointer Events
    const viewportEl = sliderEl.querySelector('.js-slider-viewport');
    if (viewportEl) {
      let activePointerId = null;
      let startX = 0;
      let startY = 0;

      viewportEl.addEventListener('pointerdown', event => {
        if (sliderState.totalSlides <= 1) return;
        if (event.pointerType === 'mouse' && event.button !== 0) return;
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

      viewportEl.addEventListener('pointercancel', () => {
        activePointerId = null;
      });
    }

    // Tạm dừng khi tab trình duyệt bị ẩn
    document.addEventListener('visibilitychange', () => {
      sliderState.isPageHidden = Boolean(document.hidden);
      syncSliderAutoplay();
    });

    // Dọn dẹp timer khi rời trang
    window.addEventListener('pagehide', stopSliderAutoplay);
    window.addEventListener('beforeunload', stopSliderAutoplay);

    goToSlide(0, 'init');
    syncSliderAutoplay();
  }

  /**
   * Xác định khóa localStorage lưu danh sách hội nghị đã lưu của người dùng hiện tại.
   * Đồng bộ tuyệt đối với js/pages/search.js và js/pages/detail.js (confguide_saved_${userId} hoặc confguide_saved_guest).
   * @returns {string} Khóa lưu trữ trong localStorage.
   */
  function getSavedStorageKey() {
    const utils = getUtils();
    if (utils && typeof utils.getSavedStorageKey === 'function') {
      return utils.getSavedStorageKey(false);
    }
    const user = readStorageSafe('confguide_current_user', null);
    return user && user.id ? `confguide_saved_${user.id}` : 'confguide_saved_guest';
  }

  /**
   * Đọc danh sách ID hội nghị đã lưu từ localStorage một cách an toàn.
   * @returns {Array<string>} Mảng ID hội nghị đã lưu.
   */
  function getSavedConferenceIds() {
    const list = readStorageSafe(getSavedStorageKey(), []);
    return Array.isArray(list) ? list.map(id => String(id)) : [];
  }

  /**
   * Lưu danh sách ID hội nghị vào localStorage an toàn.
   * @param {Array<string>} ids Mảng ID hội nghị cần lưu.
   * @returns {boolean} True nếu lưu thành công.
   */
  function setSavedConferenceIds(ids) {
    return writeStorageSafe(getSavedStorageKey(), Array.isArray(ids) ? ids : []);
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
   * Đồng bộ trạng thái sao vàng / sao khung cho toàn bộ nút .js-conf-save-btn trên trang chủ.
   */
  function syncSaveButtonsUi() {
    const grid = document.getElementById('conferenceGrid');
    if (!grid) return;

    const savedIds = getSavedConferenceIds();
    const buttons = grid.querySelectorAll('.js-conf-save-btn');
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
   * Xử lý bật/tắt trạng thái lưu hội nghị khi người dùng bấm nút sao trên thẻ.
   * @param {HTMLElement} btn Phần tử nút .js-conf-save-btn được bấm.
   */
  function handleSaveButtonClick(btn) {
    if (!btn) return;
    const confId = btn.getAttribute('data-conf-id') || '';
    if (!confId) return;

    const currentSaved = getSavedConferenceIds();
    const exists = currentSaved.includes(confId);
    const nextSaved = exists
      ? currentSaved.filter(id => id !== confId)
      : [...currentSaved, confId];

    if (!setSavedConferenceIds(nextSaved)) {
      announceSaveFeedback('Không thể lưu vào bộ nhớ trình duyệt.', 'error');
      return;
    }

    syncSaveButtonsUi();
    announceSaveFeedback(exists ? 'Đã bỏ lưu' : 'Đã lưu hội nghị', exists ? 'info' : 'success');
  }

  /**
   * Gắn sự kiện Event Delegation trên #conferenceGrid và lắng nghe đồng bộ từ pageshow / storage.
   */
  function initSaveConferences() {
    const grid = document.getElementById('conferenceGrid');
    if (grid) {
      grid.addEventListener('click', event => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const saveBtn = target.closest('.js-conf-save-btn');
        if (saveBtn) {
          event.preventDefault();
          handleSaveButtonClick(saveBtn);
        }
      });
    }

    window.addEventListener('pageshow', syncSaveButtonsUi);
    window.addEventListener('storage', event => {
      if (!event.key || event.key === getSavedStorageKey() || event.key === 'confguide_current_user') {
        syncSaveButtonsUi();
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
        ? await utils.fetchJsonCached('data/conferences.json')
        : await fetch('data/conferences.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
      allConferences = Array.isArray(data) && data.length > 0
        ? data.map(normalize).filter(Boolean)
        : fallback;
    } catch (e) {
      // Dự phòng sang dữ liệu cục bộ khi chạy qua giao thức file:/// hoặc lỗi kết nối
      allConferences = fallback;
    }

    renderHeroSlider();
    renderFeaturedConferences();
  }

  /**
   * Hiển thị tối đa 6 hội nghị tiêu biểu lên lưới trang chủ.
   */
  function renderFeaturedConferences() {
    const grid = document.getElementById('conferenceGrid');
    const emptyState = document.getElementById('emptyState');
    const resultsStatus = document.getElementById('resultsCount');
    const btnViewAll = document.getElementById('btnViewAll');
    const utils = getUtils();
    const esc = utils && utils.escapeHtml ? utils.escapeHtml : val => String(val ?? '');

    if (!grid) return;

    if (btnViewAll) {
      btnViewAll.innerHTML = `
        <span>Xem tất cả ${allConferences.length} hội nghị trên hệ thống</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      `;
    }

    // Danh sách hội nghị hiển thị
    const filtered = allConferences.slice();

    // Sắp xếp theo năm và điểm đánh giá
    filtered.sort((a, b) => {
      const yearA = parseInt(a.year || '2026', 10);
      const yearB = parseInt(b.year || '2026', 10);
      if (yearB !== yearA) return yearB - yearA;
      return (b.rating || 0) - (a.rating || 0);
    });

    const displayItems = filtered.slice(0, 6);

    if (resultsStatus) {
      resultsStatus.innerHTML = `Hiển thị <strong>${displayItems.length}</strong> hội nghị tiêu biểu`;
    }

    if (displayItems.length === 0) {
      grid.innerHTML = '';
      if (emptyState) emptyState.hidden = false;
      return;
    }

    if (emptyState) emptyState.hidden = true;

    const savedIds = getSavedConferenceIds();

    grid.innerHTML = displayItems.map(item => {
      const nextDl = utils && utils.getNextDeadline ? utils.getNextDeadline(item) : null;
      let deadlineBadgeText = 'Chưa công bố';
      let deadlineStatusMod = 'closed';

      if (nextDl) {
        const formattedDl = utils && utils.formatDeadlineVi
          ? utils.formatDeadlineVi(nextDl.date)
          : (nextDl.displayDate || nextDl.date);
        if (!nextDl.isPassed) {
          deadlineBadgeText = `${nextDl.shortName}: ${formattedDl} (còn ${nextDl.daysLeft} ngày)`;
          deadlineStatusMod = nextDl.daysLeft <= 14 ? 'urgent' : 'open';
        } else {
          deadlineBadgeText = `${nextDl.shortName}: ${formattedDl} (Đã qua)`;
          deadlineStatusMod = 'closed';
        }
      }

      const confId = resolveConferenceId(item);
      const confName = String(item.name || confId).trim();
      const isSaved = Boolean(confId && savedIds.includes(confId));
      const rankBadge = item.rank ? `Rank ${item.rank}` : 'Rank A';
      const dateRange = utils && utils.formatRangeVi
        ? (utils.formatRangeVi(item.startDate, item.endDate) || item.date_happen || '2026')
        : (item.date_happen || '2026');
      const saveBtnHtml = renderSaveButtonHtml(confId, confName, isSaved);
      const compareBtnHtml = window.ConfGuideCompare ? window.ConfGuideCompare.renderToggleButton(item) : '';
      const avatarHtml = utils && utils.renderConferenceAvatar
        ? utils.renderConferenceAvatar(item)
        : `<div class="conf-badge-logo" aria-hidden="true">${esc((item.name || 'CG').slice(0, 4).toUpperCase())}</div>`;

      return `
        <article class="conf-card card-surface" data-id="${esc(confId)}">
          <div>
            <div class="conf-top">
              ${avatarHtml}
              <div class="conf-title-wrap">
                <h3>${esc(item.name)}</h3>
                <span class="conf-rank">${esc(rankBadge)}</span>
              </div>
            </div>

            <p class="conf-desc">${esc(item.summarization || item.fullName || item.full_name || 'Hội nghị khoa học công nghệ thông tin uy tín.')}</p>

            <div class="conf-meta">
              <div class="conf-meta-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>${esc(item.location || 'Chưa xác định')}</span>
              </div>
              <div class="conf-meta-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                <span>${esc(dateRange)}</span>
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
    }).join('');
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

  document.addEventListener('DOMContentLoaded', function () {
    initSearchGateway();
    initHeroSliderEvents();
    initSaveConferences();
    initTabs();
    loadData();
  });
})();
