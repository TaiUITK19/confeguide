/**
 * ConfGuide — Kịch bản Trang Chi tiết Hội nghị (js/pages/detail.js)
 * Trang sử dụng: detail.html
 * Phụ thuộc: js/core/layout.js (ConfGuideUtils), js/components/compare.js
 * Chức năng: Quản lý tải dữ liệu hội nghị theo `?id=<slug>`, hiển thị bố cục ưu tiên hành động chính,
 * đếm ngược mốc tiếp theo (1 bộ `setInterval` duy nhất), timeline đầy đủ mốc hạn múi giờ UTC+7/AoE,
 * thông tin học thuật (Xếp hạng, Lĩnh vực nghiên cứu, Xác minh lần cuối) và thêm lịch Google Calendar.
 */

(function () {
  'use strict';

  /* ================= 1. HẰNG SỐ & TRẠNG THÁI MODULE ================= */

  const CONFERENCES_DATA_URL = 'data/conference_data.json';
  const DETAIL_URGENT_DAYS = 14;
  const COUNTDOWN_TICK_MS = 1000;

  let currentConference = null;
  let allConferences = [];
  let coreMilestonesCache = [];
  let countdownTimer = null;

  /* ================= 2. HÀM TIỆN ÍCH CƠ BẢN & STORAGE ================= */

  /**
   * Lấy đối tượng tiện ích dùng chung window.ConfGuideUtils kèm dự phòng an toàn.
   * @returns {Object} Đối tượng tiện ích chuẩn hóa.
   */
  function getDetailUtils() {
    return window.ConfGuideUtils || {
      MILESTONE_DEFINITIONS: [],
      FALLBACK_CONFERENCES: [],
      escapeHtml: val => String(val ?? ''),
      readStorage: (key, fb) => fb,
      writeStorage: () => false,
      slugify: text => String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      getConferenceId: c => (c && c.id) || '',
      normalizeConference: c => c,
      convertDeadlineToVn: d => (d ? {
        rawDate: d,
        aoeDateVi: d,
        vnIsoDate: d,
        vnDateVi: d,
        vnTimeVi: '18:59',
        timezoneLabel: 'UTC+7 (giờ Việt Nam)',
        converted: true,
        targetMs: Date.now(),
        displayText: `18:59 ${d} — UTC+7 (giờ Việt Nam)`
      } : null),
      formatDeadlineVi: d => (d ? `${d} — UTC+7 (giờ Việt Nam)` : 'Chưa công bố'),
      parseDeadlinesList: () => [],
      getCoreMilestones: () => [],
      getNextDeadline: () => null,
      getStatus: () => ({ code: 'open', label: 'Đang cập nhật', badgeClass: 'status-open' }),
      daysLeft: () => null,
      formatDateVi: d => d || 'Chưa cập nhật',
      formatRangeVi: s => s || '',
      formatConferenceMode: () => 'Chưa cập nhật',
      formatConferenceEventDate: () => 'Chưa cập nhật',
      extractTopicLabels: c => (c && Array.isArray(c.topic_labels) ? c.topic_labels : (c && Array.isArray(c.fields) ? c.fields : [])),
      extractConferenceRank: r => (r && typeof r === 'object' ? String(r.core || r.ccf || '').trim() : String(r || '').trim()),
      getAoETimeRemaining: () => ({ days: 0, hours: 0, minutes: 0, seconds: 0, isPassed: true }),
      getGoogleCalendarUrl: () => 'https://calendar.google.com/calendar/render',
      showToast: () => {}
    };
  }

  /**
   * Dừng và giải phóng bộ đếm ngược thời gian thực duy nhất trên trang.
   */
  function stopCountdownTimer() {
    if (countdownTimer !== null) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }

  /**
   * Xác định khóa localStorage lưu danh sách hội nghị đã lưu của người dùng đã đăng nhập.
   * @returns {string} Khóa lưu trữ trong localStorage hoặc chuỗi rỗng nếu chưa đăng nhập.
   */
  function getSavedStorageKey() {
    const utils = getDetailUtils();
    if (typeof utils.getSavedStorageKey === 'function') {
      return utils.getSavedStorageKey(false);
    }
    const user = utils.readStorage('confguide_current_user', null);
    return user && (user.id || user.username || user.email)
      ? `confguide_saved_${user.id || user.username || user.email}`
      : '';
  }

  /**
   * Đọc mảng mã hội nghị đã lưu từ localStorage (chỉ khi đã đăng nhập).
   * @returns {Array<string>} Danh sách ID hội nghị đã lưu.
   */
  function getSavedList() {
    const utils = getDetailUtils();
    if (typeof utils.getSavedConferenceIds === 'function') {
      return utils.getSavedConferenceIds(false);
    }
    const key = getSavedStorageKey();
    if (!key) return [];
    const list = utils.readStorage(key, []);
    return Array.isArray(list) ? list : [];
  }

  /**
   * Chuyển đổi trạng thái hiển thị chính của trang (đang tải, lỗi không tìm thấy, hoặc nội dung).
   * @param {'loading'|'error'|'content'} state Trạng thái cần hiển thị.
   * @param {string} [errorMessage] Thông điệp chi tiết khi ở trạng thái lỗi.
   */
  function setPageState(state, errorMessage) {
    const root = document.querySelector('.js-detail-root');
    if (!root) return;

    const loadingEl = root.querySelector('.js-loading-state');
    const errorEl = root.querySelector('.js-error-state');
    const errorDescEl = root.querySelector('.js-error-desc');
    const viewDetailEl = root.querySelector('.js-view-detail');

    if (loadingEl) loadingEl.hidden = state !== 'loading';
    if (errorEl) errorEl.hidden = state !== 'error';

    if (state === 'error') {
      stopCountdownTimer();
      if (errorDescEl && errorMessage) {
        errorDescEl.textContent = errorMessage;
      }
      if (viewDetailEl) viewDetailEl.hidden = true;
      document.title = 'Không tìm thấy hội nghị - ConfGuide';
      return;
    }

    if (state === 'content') {
      if (viewDetailEl) viewDetailEl.hidden = false;
      window.scrollTo(0, 0);
    } else {
      if (viewDetailEl) viewDetailEl.hidden = true;
    }
  }

  /**
   * Hiển thị hoặc ẩn thanh thông báo tình trạng tải dữ liệu JSON trên giao diện.
   * @param {string} message Nội dung thông báo (để trống nếu muốn ẩn).
   */
  function setFetchNotice(message) {
    const noticeEl = document.querySelector('.js-fetch-notice');
    if (!noticeEl) return;
    if (message) {
      noticeEl.textContent = message;
      noticeEl.hidden = false;
    } else {
      noticeEl.textContent = '';
      noticeEl.hidden = true;
    }
  }

  /**
   * Tạo chuỗi SVG biểu tượng từ kho SVG Sprite trong detail.html.
   * @param {string} iconId Mã symbol (ví dụ: 'icon-star', 'icon-calendar').
   * @param {number} [size=16] Kích thước chiều rộng và chiều cao.
   * @param {string} [extraClass=''] Class CSS bổ sung.
   * @returns {string} Chuỗi HTML thẻ <svg><use></use></svg>.
   */
  function renderSpriteIcon(iconId, size = 16, extraClass = '') {
    const cls = extraClass ? ` class="${extraClass}"` : '';
    return `<svg${cls} width="${size}" height="${size}" aria-hidden="true"><use href="#${iconId}"></use></svg>`;
  }

  /**
   * Tạo đối tượng dữ liệu sự kiện lịch chuẩn hóa cho một mốc hạn nộp của hội nghị (DRY).
   * @param {Object} conf Đối tượng hội nghị hiện tại.
   * @param {Object} milestone Đối tượng mốc hạn nộp ({ key, name, shortName, date }).
   * @returns {{ title: string, description: string, location: string, date: string, fileSlug: string }|null}
   */
  function buildCalendarEvent(conf, milestone) {
    if (!conf || !milestone || !milestone.date || milestone.hasValidDate === false) return null;
    const utils = getDetailUtils();
    const confId = utils.getConferenceId(conf) || 'confguide';
    const dlText = utils.formatDeadlineVi
      ? utils.formatDeadlineVi(milestone.date, { includeAoEOrigin: true })
      : milestone.date;
    const label = milestone.shortName || milestone.name || 'Deadline';
    const site = conf.website || conf.website_url || '';

    return {
      title: `[ConfGuide] ${conf.name} - Hạn ${label}`,
      description: `Hạn mốc ${milestone.name || label} của hội nghị ${conf.fullName || conf.name}: ${dlText}.${site ? `\nWebsite: ${site}` : ''}`,
      location: conf.location || '',
      date: milestone.date
    };
  }

  /**
   * Xử lý thao tác thêm mốc thời gian vào Google Calendar.
   * @param {'google'} actionType Loại thao tác lịch.
   * @param {Object} conf Đối tượng hội nghị.
   * @param {Object|null} [milestone=null] Mốc thời gian cụ thể.
   */
  function handleCalendarAction(actionType, conf, milestone = null) {
    if (!conf || actionType !== 'google') return;
    const utils = getDetailUtils();
    const eventObj = buildCalendarEvent(conf, milestone);
    if (!eventObj) {
      utils.showToast('Mốc thời gian này chưa được công bố ngày cụ thể.', 'info');
      return;
    }

    const calUrl = utils.getGoogleCalendarUrl(
      eventObj.title,
      eventObj.description,
      eventObj.location,
      eventObj.date
    );
    window.open(calUrl, '_blank', 'noopener,noreferrer');
  }

  /**
   * Cập nhật trạng thái nút Lưu hội nghị trên Header.
   * @param {boolean} isSaved True nếu hội nghị đã nằm trong danh sách theo dõi.
   */
  function updateSaveButtonUi(isSaved) {
    const saveBtn = document.querySelector('.js-save-btn');
    const saveText = document.querySelector('.js-save-text');
    if (!saveBtn || !saveText) return;

    saveBtn.classList.toggle('is-saved', Boolean(isSaved));
    saveBtn.setAttribute('aria-pressed', String(Boolean(isSaved)));
    saveText.textContent = isSaved ? 'Đã lưu hội nghị' : 'Lưu hội nghị';
  }

  /**
   * Đảo trạng thái lưu/bỏ lưu hội nghị hiện tại trong localStorage (chỉ cho phép khi đã đăng nhập).
   */
  function toggleSaveCurrentConference() {
    if (!currentConference) return;
    const utils = getDetailUtils();
    const confId = utils.getConferenceId(currentConference);
    if (!confId) return;

    if (typeof utils.toggleSavedConference !== 'function') {
      utils.showToast('Vui lòng đăng nhập để sử dụng chức năng theo dõi hội nghị.', 'info');
      return;
    }

    const result = utils.toggleSavedConference(confId, {
      redirectUrl: `detail.html${window.location.search || ''}`
    });
    if (!result || result.requiresAuth || !result.ok) {
      return;
    }

    updateSaveButtonUi(result.isSaved);
    utils.showToast(
      result.isSaved ? 'Đã lưu hội nghị vào danh sách theo dõi.' : 'Đã bỏ lưu hội nghị khỏi danh sách theo dõi.',
      result.isSaved ? 'success' : 'info'
    );
  }

  /**
   * Cập nhật nhãn phân hạng CORE, nhãn trạng thái và thẻ lĩnh vực ở đầu trang Chi tiết.
   * @param {HTMLElement} root - Phần tử gốc `.js-detail-root`.
   * @param {Object} conf - Đối tượng hội nghị chuẩn hóa.
   * @param {Object} utils - Tập tiện ích ConfGuideUtils.
   */
  function renderHeaderBadgesAndTags(root, conf, utils) {
    const rankBadge = root.querySelector('.js-rank-badge');
    const rawRank = typeof utils.extractConferenceRank === 'function'
      ? utils.extractConferenceRank(conf.rank)
      : (conf && conf.rank && typeof conf.rank === 'object' ? String(conf.rank.core || '') : String((conf && conf.rank) || ''));
    const realRank = String(rawRank || '').trim().toUpperCase();
    if (rankBadge) {
      if (realRank && !/^UNRANKED$/i.test(realRank)) {
        rankBadge.textContent = /^(A\*|A|B|C)$/i.test(realRank) ? `Rank ${realRank}` : realRank;
        rankBadge.classList.remove('conf-badge--rank-unranked');
        const sourceName = conf && conf.rank && typeof conf.rank === 'object' ? String(conf.rank.core_source || '').trim() : '';
        if (sourceName) rankBadge.title = `Nguồn xếp hạng: ${sourceName}`;
        else rankBadge.removeAttribute('title');
      } else {
        rankBadge.textContent = 'Chưa xếp hạng';
        rankBadge.classList.add('conf-badge--rank-unranked');
        rankBadge.removeAttribute('title');
      }
      rankBadge.hidden = false;
    }

    const statusObj = utils.getStatus(conf);
    const statusBadge = root.querySelector('.js-status-badge');
    if (statusBadge) {
      statusBadge.textContent = statusObj.label;
      statusBadge.className = `conf-badge conf-badge--status js-status-badge ${statusObj.badgeClass}`;
    }

    const tagsEl = root.querySelector('.js-conf-tags');
    const realFields = typeof utils.extractTopicLabels === 'function'
      ? utils.extractTopicLabels(conf)
      : (Array.isArray(conf.fields) ? conf.fields.map(f => String(f).trim()).filter(Boolean) : []);
    if (tagsEl) {
      tagsEl.innerHTML = realFields.length > 0
        ? realFields.map(tag => `<span class="conf-header__tag">${utils.escapeHtml(tag)}</span>`).join('')
        : '';
      tagsEl.hidden = realFields.length === 0;
    }
  }

  /**
   * Cập nhật 4 thông tin nhanh và nút Website chính thức trên Header hội nghị.
   * @param {HTMLElement} root - Phần tử gốc `.js-detail-root`.
   * @param {Object} conf - Đối tượng hội nghị chuẩn hóa.
   * @param {Object} utils - Tập tiện ích ConfGuideUtils.
   */
  function renderHeaderFactsAndWebsite(root, conf, utils) {
    const webBtn = root.querySelector('.js-web-btn');
    if (webBtn) {
      const targetWeb = (conf.website || conf.website_url || '').trim();
      webBtn.href = targetWeb || '#';
      webBtn.classList.toggle('conf-btn--disabled', !targetWeb);
      if (targetWeb) webBtn.removeAttribute('aria-disabled');
      else webBtn.setAttribute('aria-disabled', 'true');
    }

    const locParts = [conf.location, conf.country].map(v => String(v || '').trim()).filter(Boolean);
    const uniqueLoc = [...new Set(locParts)].join(', ');
    const feeText = typeof utils.formatConferenceFee === 'function'
      ? utils.formatConferenceFee(conf)
      : (conf.fee ? String(conf.fee).trim() : 'Chưa cập nhật');
    const factMap = {
      '.js-fact-date': utils.formatConferenceEventDate(conf),
      '.js-fact-location': uniqueLoc || 'Chưa cập nhật',
      '.js-fact-format': utils.formatConferenceMode(conf),
      '.js-fact-fee': feeText
    };
    Object.entries(factMap).forEach(([sel, val]) => {
      const el = root.querySelector(sel);
      if (el) el.textContent = val || 'Chưa cập nhật';
    });
    const feeEl = root.querySelector('.js-fact-fee');
    if (feeEl) {
      const feeNoteText = conf.fee_note ? String(conf.fee_note).trim() : '';
      if (feeNoteText) feeEl.setAttribute('title', feeNoteText);
      else feeEl.removeAttribute('title');
    }
  }

  /**
   * Render phần Header hội nghị: Rank (nếu có), Trạng thái, Tên (h1), Lĩnh vực, Nút Lưu/Website và 4 thông tin nhanh.
   * @param {Object} conf - Đối tượng hội nghị đã chuẩn hóa.
   */
  function renderHeader(conf) {
    const root = document.querySelector('.js-detail-root');
    if (!root || !conf) return;

    const utils = getDetailUtils();
    const confId = utils.getConferenceId(conf);
    document.title = `${conf.name || 'Chi tiết hội nghị'} - ConfGuide`;

    renderHeaderBadgesAndTags(root, conf, utils);

    const titleEl = root.querySelector('.js-conf-title');
    if (titleEl) titleEl.textContent = conf.name || 'Hội nghị khoa học';

    const fullEl = root.querySelector('.js-conf-fullname');
    const fullNameText = (conf.fullName || conf.full_name || '').trim();
    if (fullEl) {
      fullEl.textContent = fullNameText && fullNameText !== conf.name ? fullNameText : '';
    }

    updateSaveButtonUi(getSavedList().includes(confId));
    renderHeaderFactsAndWebsite(root, conf, utils);
  }

  /**
   * Gắn class trạng thái màu (open/urgent/closed) lên thẻ số ngày và khung đếm ngược.
   * @param {HTMLElement|null} daysEl - Phần tử hiển thị số ngày còn lại.
   * @param {HTMLElement|null} tickerBox - Khung đồng hồ đếm ngược thời gian thực.
   * @param {'open'|'urgent'|'closed'} status - Trạng thái hạn nộp.
   */
  function applyCountdownStatusClasses(daysEl, tickerBox, status) {
    if (daysEl) {
      daysEl.classList.remove(
        'next-deadline-card__days--open',
        'next-deadline-card__days--urgent',
        'next-deadline-card__days--closed'
      );
      daysEl.classList.add(`next-deadline-card__days--${status}`);
    }
    if (tickerBox) {
      tickerBox.classList.remove(
        'next-deadline-card__ticker--open',
        'next-deadline-card__ticker--urgent'
      );
      if (status === 'open' || status === 'urgent') {
        tickerBox.classList.add(`next-deadline-card__ticker--${status}`);
      }
    }
  }

  /**
   * Render thẻ "Mốc tiếp theo" ở cột phải khi hội nghị vẫn còn hạn nộp ở tương lai.
   * @param {Object} els - Các phần tử DOM trong thẻ đếm ngược.
   * @param {Object} nextMilestone - Thông tin mốc deadline kế tiếp.
   * @param {Object} utils - Tập tiện ích ConfGuideUtils.
   */
  function renderActiveNextDeadline(els, nextMilestone, utils) {
    const { nameEl, daysEl, exactEl, tickerBox, tickerText, calGroup } = els;
    if (nameEl) nameEl.textContent = nextMilestone.name;

    const leftDays = utils.daysLeft(nextMilestone.date);
    const statusMod = leftDays !== null && leftDays <= DETAIL_URGENT_DAYS ? 'urgent' : 'open';
    if (daysEl) daysEl.textContent = `Còn ${Math.max(0, leftDays ?? 0)} ngày`;
    applyCountdownStatusClasses(daysEl, tickerBox, statusMod);

    const converted = utils.convertDeadlineToVn
      ? utils.convertDeadlineToVn(nextMilestone.date, { isDeadline: true })
      : null;

    if (exactEl) {
      if (converted) {
        const textFormatted = utils.formatDeadlineVi
          ? utils.formatDeadlineVi(nextMilestone.date, { includeAoEOrigin: true })
          : converted.displayText;
        exactEl.innerHTML =
          `<time datetime="${utils.escapeHtml(converted.vnIsoDate)}">`
          + `${utils.escapeHtml(textFormatted)}</time>`;
      } else {
        exactEl.textContent = nextMilestone.date;
      }
    }

    if (tickerBox) tickerBox.hidden = false;
    if (calGroup) calGroup.hidden = false;

    const updateLiveTicker = () => {
      const rem = utils.getAoETimeRemaining(nextMilestone.date);
      if (!tickerText || !rem) return;
      if (rem.isPassed) {
        tickerText.textContent = 'Đã hết thời gian nhận bài';
        applyCountdownStatusClasses(daysEl, tickerBox, 'closed');
        stopCountdownTimer();
        return;
      }
      tickerText.textContent = `Đếm ngược: ${rem.days} ngày ${rem.hours}h ${rem.minutes}m ${rem.seconds}s`;
    };

    updateLiveTicker();
    countdownTimer = window.setInterval(updateLiveTicker, COUNTDOWN_TICK_MS);
  }

  /**
   * Render thẻ "Mốc tiếp theo" ở cột phải (nơi duy nhất chạy đồng hồ đếm ngược setInterval).
   * @param {Object} conf - Đối tượng hội nghị.
   */
  function renderNextDeadlineCard(conf) {
    const root = document.querySelector('.js-detail-root');
    if (!root || !conf) return;

    stopCountdownTimer();
    const utils = getDetailUtils();
    const els = {
      nameEl: root.querySelector('.js-next-milestone-name'),
      daysEl: root.querySelector('.js-countdown-days'),
      exactEl: root.querySelector('.js-deadline-exact'),
      tickerBox: root.querySelector('.js-live-ticker-box'),
      tickerText: root.querySelector('.js-live-ticker-text'),
      calGroup: root.querySelector('.js-next-cal-group')
    };

    const nextMilestone = utils.getNextDeadline(conf);
    if (nextMilestone && !nextMilestone.isPassed) {
      renderActiveNextDeadline(els, nextMilestone, utils);
      return;
    }

    applyCountdownStatusClasses(els.daysEl, els.tickerBox, 'closed');
    if (els.tickerBox) els.tickerBox.hidden = true;
    if (els.calGroup) els.calGroup.hidden = true;

    if (nextMilestone && nextMilestone.isPassed) {
      if (els.nameEl) els.nameEl.textContent = 'Đã hết hạn nộp bài';
      if (els.daysEl) els.daysEl.textContent = 'Đã đóng đợt nộp';
      if (els.exactEl) {
        const lastFormatted = utils.formatDeadlineVi ? utils.formatDeadlineVi(nextMilestone.date) : nextMilestone.date;
        els.exactEl.textContent = `Mốc cuối: ${lastFormatted}`;
      }
    } else {
      if (els.nameEl) els.nameEl.textContent = 'Chưa công bố mốc';
      if (els.daysEl) els.daysEl.textContent = 'Chưa cập nhật';
      if (els.exactEl) els.exactEl.textContent = 'Ban tổ chức chưa công bố lịch nộp bài cụ thể.';
    }
  }

  /**
   * Tạo mã HTML một bước trong danh sách toàn bộ các mốc deadline của hội nghị.
   * Giữ nguyên tên, loại, nội dung và ngày tháng theo dữ liệu gốc; không tự tạo ngày thay thế khi thiếu/lỗi.
   * @param {Object} milestone - Dữ liệu mốc deadline đã phân tích.
   * @param {number} idx - Chỉ số thứ tự mốc (0..N-1).
   * @param {Object|null} next - Mốc hợp lệ sắp tới gần nhất để đánh dấu active.
   * @param {Object} utils - Tập tiện ích ConfGuideUtils.
   * @returns {string} Chuỗi HTML `.deadline-timeline__step`.
   */
  function buildTimelineStepHtml(milestone, idx, next, utils) {
    const esc = utils.escapeHtml;
    const rawDate = milestone.rawDate !== undefined && milestone.rawDate !== null
      ? String(milestone.rawDate).trim()
      : String(milestone.date || '').trim();
    const dateVal = milestone.hasValidDate === false ? '' : (milestone.date || '');
    const converted = dateVal && utils.convertDeadlineToVn
      ? utils.convertDeadlineToVn(dateVal, { isDeadline: true })
      : null;
    const hasValidDate = Boolean(milestone.hasValidDate !== false && dateVal && converted);
    const left = hasValidDate ? utils.daysLeft(dateVal) : null;
    const isPassed = hasValidDate && left !== null && left < 0;
    const isActive = Boolean(
      hasValidDate
      && next
      && !next.isPassed
      && Number.isFinite(next.targetMs)
      && next.targetMs === milestone.targetMs
      && next.name === milestone.name
    );

    let modifierClass = 'deadline-timeline__step--upcoming';
    let statusLabel = hasValidDate ? `Sắp tới · Còn ${Math.max(0, left ?? 0)} ngày` : 'Chưa xác định ngày';
    let badgeContent = String(idx + 1);

    if (!hasValidDate) {
      modifierClass = 'deadline-timeline__step--undated';
      statusLabel = rawDate ? 'Không thể phân tích ngày' : 'Chưa công bố ngày';
    } else if (isPassed) {
      modifierClass = 'deadline-timeline__step--passed';
      statusLabel = 'Đã qua';
      badgeContent = renderSpriteIcon('icon-check', 14);
    } else if (isActive) {
      const mod = left !== null && left <= DETAIL_URGENT_DAYS ? 'urgent' : 'open';
      modifierClass = `deadline-timeline__step--active deadline-timeline__step--${mod}`;
      statusLabel = `Mốc tiếp theo · Còn ${Math.max(0, left)} ngày`;
    }

    const timeDisplay = hasValidDate
      ? (converted.vnTimeVi ? `${converted.vnTimeVi} ${converted.vnDateVi}` : converted.vnDateVi)
      : (rawDate || 'Chưa có ngày hợp lệ');
    const rawDateHtml = hasValidDate && rawDate
      ? `<span class="deadline-timeline__raw-date">Ngày gốc: ${esc(rawDate)}</span>`
      : '';
    const tzHtml = hasValidDate
      ? `<span class="deadline-timeline__tz">${esc(converted.timezoneLabel)}</span>`
      : '';
    const typeHtml = milestone.type
      ? `<span class="deadline-timeline__type">${esc(milestone.type)}</span>`
      : '';
    const noteHtml = milestone.note
      ? `<p class="deadline-timeline__note">${esc(milestone.note)}</p>`
      : '';
    const datetimeAttr = hasValidDate ? converted.vnIsoDate : '';

    const calButtonHtml = hasValidDate && !isPassed
      ? `
        <button
          type="button"
          class="deadline-timeline__cal-btn js-step-cal-btn"
          data-milestone-index="${idx}"
          aria-label="Thêm mốc ${esc(milestone.name)} vào Google Calendar"
          title="Thêm vào Google Calendar"
        >
          ${renderSpriteIcon('icon-calendar-plus', 15)}
        </button>
      `
      : '';

    return `
      <div class="deadline-timeline__step ${modifierClass} timeline-step">
        <div class="deadline-timeline__step-top">
          <span class="deadline-timeline__badge" aria-hidden="true">${badgeContent}</span>
          ${calButtonHtml}
        </div>
        ${typeHtml}
        <h3 class="deadline-timeline__name">${esc(milestone.name)}</h3>
        ${noteHtml}
        ${datetimeAttr
          ? `<time class="deadline-timeline__time" datetime="${esc(datetimeAttr)}">${esc(timeDisplay)}</time>`
          : `<span class="deadline-timeline__time">${esc(timeDisplay)}</span>`}
        ${rawDateHtml}
        ${tzHtml}
        <span class="deadline-timeline__status">${esc(statusLabel)}</span>
      </div>
    `;
  }

  /**
   * Render toàn bộ danh sách các mốc deadline từ dữ liệu gốc (không giới hạn 4 mốc),
   * sắp xếp tăng dần các mốc có ngày hợp lệ và giữ nguyên các mốc chưa xác định ngày.
   * @param {Object} conf - Đối tượng hội nghị.
   */
  function renderTimeline(conf) {
    const track = document.querySelector('.js-timeline-track');
    const countBadge = document.querySelector('.js-timeline-count');
    if (!track || !conf) return;

    const utils = getDetailUtils();
    const milestones = utils.parseDeadlinesList(conf.deadlines);
    const next = utils.getNextDeadline(conf);
    coreMilestonesCache = milestones;

    track.classList.toggle('deadline-timeline__track--many', milestones.length > 4);
    track.classList.toggle('deadline-timeline__track--scrollable', milestones.length > 8);

    if (countBadge) {
      countBadge.textContent = milestones.length > 0 ? `${milestones.length} mốc` : '';
      countBadge.hidden = milestones.length === 0;
    }

    if (!milestones.length) {
      track.innerHTML = `
        <div class="deadline-timeline__step deadline-timeline__step--undated timeline-step">
          <div class="deadline-timeline__step-top">
            <span class="deadline-timeline__badge">1</span>
          </div>
          <h3 class="deadline-timeline__name">Đang cập nhật mốc nộp bài</h3>
          <span class="deadline-timeline__tz">Ban tổ chức chưa công bố lịch trình chi tiết trong dữ liệu gốc.</span>
          <span class="deadline-timeline__status">Chưa cập nhật</span>
        </div>
      `;
      return;
    }

    track.innerHTML = milestones.map((m, idx) => buildTimelineStepHtml(m, idx, next, utils)).join('');
  }

  /**
   * Render phần Giới thiệu hội nghị: chỉ hiển thị nội dung thật từ dữ liệu, không ghép câu mẫu cố định.
   * @param {Object} conf Đối tượng hội nghị.
   */
  function renderOverview(conf) {
    const overviewEl = document.querySelector('.js-overview-text');
    if (!overviewEl || !conf) return;

    const utils = getDetailUtils();
    const esc = utils.escapeHtml;
    const rawSummary = String(conf.summarization || conf.description || '').trim();

    if (rawSummary) {
      overviewEl.innerHTML = `<p>${esc(rawSummary)}</p>`;
    } else {
      overviewEl.innerHTML = '<p class="conf-overview__empty">Chưa cập nhật mô tả chi tiết cho hội nghị này.</p>';
    }
  }

  /**
   * Chuẩn hóa chuỗi hiển thị xếp hạng học thuật từ đối tượng `rankInfo` (CORE/ICORE, CCF) hoặc chuỗi `rank`.
   * @param {Object} conf Đối tượng hội nghị chuẩn hóa.
   * @param {Object} utils Tập tiện ích ConfGuideUtils.
   * @returns {string} Chuỗi xếp hạng dễ đọc hoặc "Chưa xếp hạng" / "Chưa cập nhật".
   */
  function formatAcademicRankValue(conf, utils) {
    if (!conf || typeof conf !== 'object') return 'Chưa cập nhật';

    const rankObj = conf.rankInfo && typeof conf.rankInfo === 'object'
      ? conf.rankInfo
      : (conf.rank && typeof conf.rank === 'object' ? conf.rank : null);

    if (rankObj) {
      const parts = [];
      const coreVal = rankObj.core !== undefined && rankObj.core !== null ? String(rankObj.core).trim() : '';
      const coreSource = rankObj.core_source !== undefined && rankObj.core_source !== null ? String(rankObj.core_source).trim() : '';
      const ccfVal = rankObj.ccf !== undefined && rankObj.ccf !== null ? String(rankObj.ccf).trim() : '';

      if (coreVal && !/^unranked$/i.test(coreVal)) {
        const coreLabel = /^(a\*|a|b|c)$/i.test(coreVal) ? `CORE ${coreVal.toUpperCase()}` : coreVal;
        parts.push(coreSource ? `${coreLabel} (${coreSource})` : coreLabel);
      }
      if (ccfVal && !/^unranked$/i.test(ccfVal)) {
        parts.push(/^ccf\b/i.test(ccfVal) ? ccfVal : `CCF ${ccfVal.toUpperCase()}`);
      }

      if (parts.length > 0) return parts.join(' · ');
      return 'Chưa xếp hạng';
    }

    const rawRank = typeof utils.extractConferenceRank === 'function'
      ? utils.extractConferenceRank(conf.rank)
      : String(conf.rank || '').trim();
    if (!rawRank) return 'Chưa cập nhật';
    if (/^unranked$/i.test(rawRank)) return 'Chưa xếp hạng';
    return /^(a\*|a|b|c)$/i.test(rawRank) ? `CORE ${rawRank.toUpperCase()}` : rawRank;
  }

  /**
   * Render phần Thông tin học thuật với 3 mục: Xếp hạng, Lĩnh vực nghiên cứu và Xác minh lần cuối.
   * @param {Object} conf Đối tượng hội nghị chuẩn hóa.
   */
  function renderAcademicInfo(conf) {
    const root = document.querySelector('.js-detail-root');
    if (!root || !conf) return;

    const utils = getDetailUtils();
    const esc = utils.escapeHtml;

    const rankEl = root.querySelector('.js-spec-rank');
    if (rankEl) {
      rankEl.textContent = formatAcademicRankValue(conf, utils);
    }

    const fieldsEl = root.querySelector('.js-spec-fields');
    const realFields = typeof utils.extractTopicLabels === 'function'
      ? utils.extractTopicLabels(conf)
      : (Array.isArray(conf.fields) ? conf.fields.map(f => String(f).trim()).filter(Boolean) : []);
    if (fieldsEl) {
      fieldsEl.textContent = realFields.length > 0 ? realFields.join(', ') : 'Chưa cập nhật';
    }

    const verifiedEl = root.querySelector('.js-spec-verified');
    const rawVerified = String(
      conf.lastVerified
      || conf.last_verified
      || (conf.crawled_at ? String(conf.crawled_at).slice(0, 10) : '')
    ).trim();
    if (verifiedEl) {
      if (rawVerified) {
        const formattedVerified = utils.formatDateVi(rawVerified);
        verifiedEl.innerHTML = `<time datetime="${esc(rawVerified)}">${esc(formattedVerified)}</time>`;
      } else {
        verifiedEl.textContent = 'Chưa cập nhật';
      }
    }
  }

  /**
   * Hàm dùng chung dựng thẻ hội nghị dạng Grid (mỗi thẻ là <article> có đúng 1 thẻ <a> phủ ::after, hiển thị hạn nộp UTC+7).
   * Được đăng ký vào window.ConfGuideUtils.renderGridConferenceCard để tái sử dụng.
   * @param {Object} item Đối tượng hội nghị đã chuẩn hóa.
   * @param {Object} [customUtils] Đối tượng tiện ích tùy chọn.
   * @returns {string} Chuỗi HTML thẻ <article class="related-card">.
   */
  function renderGridConferenceCard(item, customUtils) {
    const utils = customUtils || getDetailUtils();
    const esc = utils.escapeHtml;
    const itemId = utils.getConferenceId(item);
    const nextDl = utils.getNextDeadline(item);

    let deadlineText = 'Chưa công bố hạn nộp';
    if (nextDl && nextDl.date) {
      const formattedDl = utils.formatDeadlineVi
        ? utils.formatDeadlineVi(nextDl.date)
        : nextDl.date;
      deadlineText = nextDl.isPassed
        ? `${nextDl.shortName}: Đã qua (${formattedDl})`
        : `${nextDl.shortName}: ${formattedDl}`;
    }

    const monogram = String(item.name || 'CG').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'CONF';
    const dateRange = utils.formatConferenceEventDate(item);
    const locationText = item.location || 'Chưa cập nhật';
    const feeText = typeof utils.formatConferenceFee === 'function'
      ? utils.formatConferenceFee(item)
      : 'Chưa cập nhật';
    const feeModifier = feeText !== 'Chưa cập nhật' ? ' related-card__meta-item--fee' : '';
    const compareBtnHtml = window.ConfGuideCompare ? window.ConfGuideCompare.renderToggleButton(item) : '';
    const avatarHtml = utils && typeof utils.renderConferenceAvatar === 'function'
      ? utils.renderConferenceAvatar(item, 'related-card__monogram')
      : `<div class="conf-badge-logo related-card__monogram" aria-hidden="true">${esc(monogram)}</div>`;

    return `
      <article class="related-card">
        <div>
          <div class="related-card__top">
            <div class="related-card__brand">
              ${avatarHtml}
              <h3 class="related-card__title">
                <a class="related-card__link" href="detail.html?id=${encodeURIComponent(itemId)}">
                  ${esc(item.name)}
                </a>
              </h3>
            </div>
          </div>

          <p class="related-card__fullname">${esc(item.fullName || item.full_name || item.summarization || '')}</p>

          <div class="related-card__meta">
            <span class="related-card__meta-item">
              ${renderSpriteIcon('icon-location', 14)}
              <span>${esc(locationText)}</span>
            </span>
            <span class="related-card__meta-item">
              ${renderSpriteIcon('icon-calendar', 14)}
              <span>${esc(dateRange)}</span>
            </span>
            <span class="related-card__meta-item${feeModifier}">
              ${renderSpriteIcon('icon-fee', 14)}
              <span>Lệ phí: ${esc(feeText)}</span>
            </span>
          </div>
        </div>

        <div class="related-card__footer">
          <span class="related-card__deadline">${esc(deadlineText)}</span>
          <div class="related-card__actions">
            ${compareBtnHtml}
            <span class="related-card__cta" aria-hidden="true">Chi tiết &rarr;</span>
          </div>
        </div>
      </article>
    `;
  }

  // Đăng ký hàm render thẻ Grid dùng chung vào window.ConfGuideUtils nếu có
  if (window.ConfGuideUtils && !window.ConfGuideUtils.renderGridConferenceCard) {
    window.ConfGuideUtils.renderGridConferenceCard = renderGridConferenceCard;
  }

  /**
   * Render tối đa 3 hội nghị liên quan theo mức độ trùng khớp lĩnh vực nghiên cứu.
   * @param {Object} current Đối tượng hội nghị đang xem.
   */
  function renderRelated(current) {
    const sectionEl = document.querySelector('.js-related-section');
    const gridEl = document.querySelector('.js-related-grid');
    if (!gridEl || !current) return;

    const utils = getDetailUtils();
    const currentId = utils.getConferenceId(current);
    const getTopicSet = item => (
      typeof utils.extractTopicLabels === 'function'
        ? utils.extractTopicLabels(item)
        : (Array.isArray(item && item.fields) ? item.fields : [])
    ).map(f => String(f).toLowerCase());
    const curFields = getTopicSet(current);

    const relatedList = allConferences
      .filter(c => utils.getConferenceId(c) !== currentId)
      .sort((a, b) => {
        const aMatch = getTopicSet(a).filter(f => curFields.includes(f)).length;
        const bMatch = getTopicSet(b).filter(f => curFields.includes(f)).length;
        return bMatch - aMatch;
      })
      .slice(0, 3);

    if (!relatedList.length) {
      if (sectionEl) sectionEl.hidden = true;
      gridEl.innerHTML = '';
      return;
    }

    if (sectionEl) sectionEl.hidden = false;
    const cardRenderer = (window.ConfGuideUtils && window.ConfGuideUtils.renderGridConferenceCard) || renderGridConferenceCard;
    gridEl.innerHTML = relatedList.map(item => cardRenderer(item, utils)).join('');
  }

  /**
   * Điều hướng nút "Quay lại": giữ nguyên bộ lọc và chế độ xem của trang danh sách trước đó.
   */
  function navigateBackFromDetail() {
    if (document.referrer) {
      try {
        const refUrl = new URL(document.referrer);
        if (refUrl.origin === window.location.origin && !/detail\.html$/i.test(refUrl.pathname)) {
          window.location.href = refUrl.href;
          return;
        }
      } catch (e) {
        // Bỏ qua nếu document.referrer không phải URL hợp lệ
      }
    }

    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.assign('search.html');
  }

  /**
   * Xử lý các tương tác click trên `.js-detail-root` (lưu, quay lại, xuất lịch).
   * @param {MouseEvent} event - Sự kiện click ủy quyền.
   */
  function handleDetailRootClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (target.closest('.js-back-btn')) { navigateBackFromDetail(); return; }
    if (target.closest('.js-save-btn')) { toggleSaveCurrentConference(); return; }

    const calActionBtn = target.closest('.js-cal-action');
    if (calActionBtn && currentConference) {
      if (calActionBtn.getAttribute('data-cal-action') === 'google-next') {
        handleCalendarAction('google', currentConference, getDetailUtils().getNextDeadline(currentConference));
      }
      return;
    }

    const stepCalBtn = target.closest('.js-step-cal-btn');
    if (stepCalBtn && currentConference) {
      const milestone = coreMilestonesCache[Number(stepCalBtn.getAttribute('data-milestone-index'))];
      if (milestone) handleCalendarAction('google', currentConference, milestone);
    }
  }

  /**
   * Thiết lập Event Delegation tập trung trên gốc `.js-detail-root` và các sự kiện vòng đời cửa sổ.
   */
  function setupEventDelegation() {
    const root = document.querySelector('.js-detail-root');
    if (!root) return;

    root.addEventListener('click', handleDetailRootClick);

    window.addEventListener('pagehide', stopCountdownTimer);
    window.addEventListener('beforeunload', stopCountdownTimer);
  }

  /**
   * Chuẩn hóa và tải toàn bộ danh sách hội nghị (fetch JSON kèm fallback cục bộ).
   * @param {Object} utils - Tập tiện ích ConfGuideUtils.
   * @returns {Promise<Array<Object>>} Danh sách hội nghị đã chuẩn hóa.
   */
  async function loadNormalizedConferences(utils) {
    const fallbackList = Array.isArray(utils.FALLBACK_CONFERENCES) ? utils.FALLBACK_CONFERENCES : [];
    const mapFallback = () => fallbackList.map(c => utils.normalizeConference(c)).filter(Boolean);

    try {
      const data = typeof utils.fetchJsonCached === 'function'
        ? await utils.fetchJsonCached(CONFERENCES_DATA_URL)
        : await fetch(CONFERENCES_DATA_URL).then(r => {
          if (!r.ok) throw new Error(r.status);
          return r.json();
        });
      if (Array.isArray(data) && data.length > 0) {
        return data.map(c => utils.normalizeConference(c)).filter(Boolean);
      }
    } catch (err) {
      const fallbackConfs = mapFallback();
      if (fallbackConfs.length > 0) {
        setFetchNotice(
          'Không thể kết nối tệp dữ liệu máy chủ (data/conference_data.json). '
          + 'Hệ thống đang hiển thị từ dữ liệu dự phòng cục bộ.'
        );
      }
      return fallbackConfs;
    }

    return mapFallback();
  }

  /**
   * Tải dữ liệu hội nghị theo `?id=<slug>` và khởi tạo toàn bộ các phần trên trang Chi tiết.
   * Báo lỗi rõ ràng khi thiếu `?id`, không tìm thấy hội nghị hoặc khi fetch dữ liệu gặp sự cố.
   * @returns {Promise<void>}
   */
  async function initDetailPage() {
    setupEventDelegation();

    const utils = getDetailUtils();
    const urlParams = new URLSearchParams(window.location.search);
    const requestedId = (urlParams.get('id') || '').trim().toLowerCase();

    if (!requestedId) {
      const fromParam = encodeURIComponent(`detail.html${window.location.search || ''}`);
      window.location.replace(`404.html?reason=missing-id&from=${fromParam}`);
      return;
    }

    setPageState('loading');
    setFetchNotice('');
    allConferences = await loadNormalizedConferences(utils);

    currentConference = allConferences.find(c => utils.getConferenceId(c).toLowerCase() === requestedId)
      || allConferences.find(c => utils.slugify && utils.slugify(c.name) === requestedId)
      || null;

    if (!currentConference) {
      const fromParam = encodeURIComponent(`detail.html${window.location.search || ''}`);
      window.location.replace(`404.html?reason=conference&id=${encodeURIComponent(requestedId)}&from=${fromParam}`);
      return;
    }

    renderHeader(currentConference);
    renderTimeline(currentConference);
    renderOverview(currentConference);
    renderAcademicInfo(currentConference);
    renderNextDeadlineCard(currentConference);
    renderRelated(currentConference);

    setPageState('content');
  }

  // Dọn dẹp bộ đếm ngược khi rời trang và khôi phục nếu người dùng quay lại qua bfcache
  window.addEventListener('pagehide', stopCountdownTimer);
  window.addEventListener('pageshow', event => {
    if (currentConference) {
      updateSaveButtonUi(getSavedList().includes(getDetailUtils().getConferenceId(currentConference)));
    }
    if (event.persisted && currentConference) {
      renderNextDeadlineCard(currentConference);
    }
  });
  window.addEventListener('storage', event => {
    if (!currentConference) return;
    if (!event.key || event.key === 'confguide_current_user' || event.key === getSavedStorageKey()) {
      updateSaveButtonUi(getSavedList().includes(getDetailUtils().getConferenceId(currentConference)));
    }
  });

  document.addEventListener('DOMContentLoaded', initDetailPage);
})();
