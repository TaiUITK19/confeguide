/**
 * ConfGuide — Kịch bản Trang Chi tiết Hội nghị (js/pages/detail.js)
 * Quản lý tải dữ liệu hội nghị theo ?id=<slug>, hiển thị bố cục ưu tiên hành động chính,
 * đếm ngược mốc tiếp theo (1 bộ setInterval duy nhất), timeline 4 mốc kèm nhãn múi giờ UTC+7/AoE,
 * thông tin học thuật (<dl>), đánh giá & nhận xét hợp nhất (#danh-gia) và xuất lịch Google / .ics.
 */

(function () {
  'use strict';

  let currentConference = null;
  let allConferences = [];
  let coreMilestonesCache = [];
  let countdownTimer = null;

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
      getAoETimeRemaining: () => ({ days: 0, hours: 0, minutes: 0, seconds: 0, isPassed: true }),
      getGoogleCalendarUrl: () => 'https://calendar.google.com/calendar/render',
      createIcsContent: () => '',
      downloadIcsFile: () => {},
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
   * Xác định khóa localStorage lưu danh sách hội nghị đã lưu của người dùng hiện hành.
   * @returns {string} Khóa lưu trữ trong localStorage.
   */
  function getSavedStorageKey() {
    const utils = getDetailUtils();
    if (typeof utils.getSavedStorageKey === 'function') {
      return utils.getSavedStorageKey(false);
    }
    const user = utils.readStorage('confguide_current_user', null);
    return user && user.id ? `confguide_saved_${user.id}` : 'confguide_saved_guest';
  }

  /**
   * Đọc mảng mã hội nghị đã lưu từ localStorage.
   * @returns {Array<string>} Danh sách ID hội nghị đã lưu.
   */
  function getSavedList() {
    const list = getDetailUtils().readStorage(getSavedStorageKey(), []);
    return Array.isArray(list) ? list : [];
  }

  /**
   * Lưu mảng mã hội nghị vào localStorage.
   * @param {Array<string>} list Danh sách ID hội nghị.
   * @returns {boolean} Kết quả ghi vào bộ nhớ.
   */
  function setSavedList(list) {
    return getDetailUtils().writeStorage(getSavedStorageKey(), list);
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
    const viewReviewsEl = root.querySelector('.js-view-reviews');

    if (loadingEl) loadingEl.hidden = state !== 'loading';
    if (errorEl) errorEl.hidden = state !== 'error';

    if (state === 'error') {
      stopCountdownTimer();
      if (errorDescEl && errorMessage) {
        errorDescEl.textContent = errorMessage;
      }
      if (viewDetailEl) viewDetailEl.hidden = true;
      if (viewReviewsEl) viewReviewsEl.hidden = true;
      document.title = 'Không tìm thấy hội nghị - ConfGuide';
      return;
    }

    if (state === 'content') {
      syncHashRoute();
    } else {
      if (viewDetailEl) viewDetailEl.hidden = true;
      if (viewReviewsEl) viewReviewsEl.hidden = true;
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
    if (!conf || !milestone || !milestone.date) return null;
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
      date: milestone.date,
      fileSlug: `${confId}-${milestone.key || 'deadline'}.ics`
    };
  }

  /**
   * Xử lý tập trung mọi thao tác thêm vào Google Calendar hoặc tải file .ics (mốc lẻ & toàn bộ).
   * @param {'google'|'ics-single'|'ics-all'} actionType Loại thao tác lịch.
   * @param {Object} conf Đối tượng hội nghị.
   * @param {Object|null} [milestone=null] Mốc thời gian cụ thể (nếu thao tác trên 1 mốc).
   */
  function handleCalendarAction(actionType, conf, milestone = null) {
    if (!conf) return;
    const utils = getDetailUtils();

    if (actionType === 'ics-all') {
      const allMilestones = utils.parseDeadlinesList(conf.deadlines);
      const events = allMilestones
        .map(m => buildCalendarEvent(conf, m))
        .filter(Boolean);

      if (!events.length) {
        utils.showToast('Hội nghị này chưa có mốc thời gian cụ thể để xuất lịch.', 'info');
        return;
      }

      const confId = utils.getConferenceId(conf) || 'confguide';
      const icsContent = utils.createIcsContent(events);
      utils.downloadIcsFile(`${confId}-all-deadlines.ics`, icsContent);
      utils.showToast(`Đã xuất ${events.length} mốc thời gian sang file .ics.`, 'success');
      return;
    }

    const eventObj = buildCalendarEvent(conf, milestone);
    if (!eventObj) {
      utils.showToast('Mốc thời gian này chưa được công bố ngày cụ thể.', 'info');
      return;
    }

    if (actionType === 'google') {
      const calUrl = utils.getGoogleCalendarUrl(
        eventObj.title,
        eventObj.description,
        eventObj.location,
        eventObj.date
      );
      window.open(calUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (actionType === 'ics-single') {
      const icsContent = utils.createIcsContent([eventObj]);
      utils.downloadIcsFile(eventObj.fileSlug, icsContent);
      utils.showToast('Đã tải file lịch .ics cho mốc hạn nộp.', 'success');
    }
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
   * Đảo trạng thái lưu/bỏ lưu hội nghị hiện tại trong localStorage.
   */
  function toggleSaveCurrentConference() {
    if (!currentConference) return;
    const utils = getDetailUtils();
    const confId = utils.getConferenceId(currentConference);
    if (!confId) return;

    const currentList = getSavedList();
    const exists = currentList.includes(confId);
    const nextList = exists
      ? currentList.filter(id => id !== confId)
      : [...currentList, confId];

    if (setSavedList(nextList)) {
      updateSaveButtonUi(!exists);
      utils.showToast(
        exists ? 'Đã bỏ lưu hội nghị khỏi danh sách theo dõi.' : 'Đã lưu hội nghị vào danh sách theo dõi.',
        exists ? 'info' : 'success'
      );
    }
  }

  /**
   * Render phần Header hội nghị: Rank (nếu có thật), Trạng thái, Tên (h1), Lĩnh vực, Nút Lưu/Website và 4 thông tin nhanh.
   * @param {Object} conf Đối tượng hội nghị đã chuẩn hóa.
   */
  function renderHeader(conf) {
    const root = document.querySelector('.js-detail-root');
    if (!root || !conf) return;

    const utils = getDetailUtils();
    const esc = utils.escapeHtml;
    const confId = utils.getConferenceId(conf);

    document.title = `${conf.name || 'Chi tiết hội nghị'} - ConfGuide`;

    // 1. Nhãn phân hạng (chỉ hiện khi có dữ liệu thật) và Nhãn trạng thái
    const rankBadge = root.querySelector('.js-rank-badge');
    const realRank = conf.rank ? String(conf.rank).trim() : '';
    if (rankBadge) {
      if (realRank) {
        rankBadge.textContent = `Rank ${realRank}`;
        rankBadge.hidden = false;
      } else {
        rankBadge.textContent = '';
        rankBadge.hidden = true;
      }
    }

    const statusObj = utils.getStatus(conf);
    const statusBadge = root.querySelector('.js-status-badge');
    if (statusBadge) {
      statusBadge.textContent = statusObj.label;
      statusBadge.className = `conf-badge conf-badge--status js-status-badge ${statusObj.badgeClass}`;
    }

    // 2. Tên viết tắt (h1) & Tên đầy đủ
    const titleEl = root.querySelector('.js-conf-title');
    if (titleEl) titleEl.textContent = conf.name || 'Hội nghị khoa học';

    const fullEl = root.querySelector('.js-conf-fullname');
    const fullNameText = (conf.fullName || conf.full_name || '').trim();
    if (fullEl) {
      fullEl.textContent = fullNameText && fullNameText !== conf.name ? fullNameText : '';
    }

    // 3. Thẻ lĩnh vực nghiên cứu (chỉ hiển thị dữ liệu thật)
    const tagsEl = root.querySelector('.js-conf-tags');
    const realFields = Array.isArray(conf.fields)
      ? conf.fields.map(f => String(f).trim()).filter(Boolean)
      : [];
    if (tagsEl) {
      if (realFields.length > 0) {
        tagsEl.innerHTML = realFields
          .map(tag => `<span class="conf-header__tag">${esc(tag)}</span>`)
          .join('');
        tagsEl.hidden = false;
      } else {
        tagsEl.innerHTML = '';
        tagsEl.hidden = true;
      }
    }

    // 4. Nút Lưu hội nghị & Website chính thức
    updateSaveButtonUi(getSavedList().includes(confId));

    const webBtn = root.querySelector('.js-web-btn');
    if (webBtn) {
      const targetWeb = (conf.website || conf.website_url || '').trim();
      if (targetWeb) {
        webBtn.href = targetWeb;
        webBtn.classList.remove('conf-btn--disabled');
        webBtn.removeAttribute('aria-disabled');
      } else {
        webBtn.href = '#';
        webBtn.classList.add('conf-btn--disabled');
        webBtn.setAttribute('aria-disabled', 'true');
      }
    }

    // 5. Bốn thông tin nhanh duy nhất: Thời gian | Địa điểm | Hình thức | Lệ phí
    const dateEl = root.querySelector('.js-fact-date');
    if (dateEl) dateEl.textContent = utils.formatConferenceEventDate(conf);

    const locEl = root.querySelector('.js-fact-location');
    const locParts = [conf.location, conf.country]
      .map(v => String(v || '').trim())
      .filter(Boolean);
    const uniqueLoc = [...new Set(locParts)].join(', ');
    if (locEl) locEl.textContent = uniqueLoc || 'Chưa cập nhật';

    const formatEl = root.querySelector('.js-fact-format');
    if (formatEl) formatEl.textContent = utils.formatConferenceMode(conf);

    const feeEl = root.querySelector('.js-fact-fee');
    const realFee = conf.fee ? String(conf.fee).trim() : '';
    if (feeEl) feeEl.textContent = realFee || 'Chưa cập nhật';
  }

  /**
   * Render thẻ "Mốc tiếp theo" ở cột phải (nơi duy nhất chạy đồng hồ đếm ngược setInterval).
   * @param {Object} conf Đối tượng hội nghị.
   */
  function renderNextDeadlineCard(conf) {
    const root = document.querySelector('.js-detail-root');
    if (!root || !conf) return;

    stopCountdownTimer();

    const utils = getDetailUtils();
    const nextMilestone = utils.getNextDeadline(conf);
    const nameEl = root.querySelector('.js-next-milestone-name');
    const daysEl = root.querySelector('.js-countdown-days');
    const exactEl = root.querySelector('.js-deadline-exact');
    const tickerBox = root.querySelector('.js-live-ticker-box');
    const tickerText = root.querySelector('.js-live-ticker-text');
    const calGroup = root.querySelector('.js-next-cal-group');
    const exportAllBtn = root.querySelector('[data-cal-action="ics-all"]');

    const allMilestones = utils.parseDeadlinesList(conf.deadlines);
    if (exportAllBtn) {
      exportAllBtn.hidden = allMilestones.length === 0;
    }

    const applyCountdownStatus = (status) => {
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
    };

    if (nextMilestone && !nextMilestone.isPassed) {
      if (nameEl) nameEl.textContent = nextMilestone.name;

      const leftDays = utils.daysLeft(nextMilestone.date);
      const statusMod = (leftDays !== null && leftDays <= 14) ? 'urgent' : 'open';
      if (daysEl) daysEl.textContent = `Còn ${Math.max(0, leftDays ?? 0)} ngày`;
      applyCountdownStatus(statusMod);

      const converted = utils.convertDeadlineToVn
        ? utils.convertDeadlineToVn(nextMilestone.date, { isDeadline: true })
        : null;

      if (exactEl) {
        if (converted) {
          const textFormatted = utils.formatDeadlineVi
            ? utils.formatDeadlineVi(nextMilestone.date, { includeAoEOrigin: true })
            : converted.displayText;
          exactEl.innerHTML = `<time datetime="${utils.escapeHtml(converted.vnIsoDate)}">${utils.escapeHtml(textFormatted)}</time>`;
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
          applyCountdownStatus('closed');
          stopCountdownTimer();
          return;
        }
        tickerText.textContent = `Đếm ngược: ${rem.days} ngày ${rem.hours}h ${rem.minutes}m ${rem.seconds}s`;
      };

      updateLiveTicker();
      countdownTimer = window.setInterval(updateLiveTicker, 1000);
    } else if (nextMilestone && nextMilestone.isPassed) {
      if (nameEl) nameEl.textContent = 'Đã hết hạn nộp bài';
      if (daysEl) daysEl.textContent = 'Đã đóng đợt nộp';
      applyCountdownStatus('closed');
      if (exactEl) {
        const lastFormatted = utils.formatDeadlineVi
          ? utils.formatDeadlineVi(nextMilestone.date)
          : nextMilestone.date;
        exactEl.textContent = `Mốc cuối: ${lastFormatted}`;
      }
      if (tickerBox) tickerBox.hidden = true;
      if (calGroup) calGroup.hidden = true;
    } else {
      if (nameEl) nameEl.textContent = 'Chưa công bố mốc';
      if (daysEl) daysEl.textContent = 'Chưa cập nhật';
      applyCountdownStatus('closed');
      if (exactEl) exactEl.textContent = 'Ban tổ chức chưa công bố lịch nộp bài cụ thể.';
      if (tickerBox) tickerBox.hidden = true;
      if (calGroup) calGroup.hidden = true;
    }
  }

  /**
   * Render thanh tiến trình 4 mốc quan trọng kèm thẻ <time datetime>, nhãn múi giờ rõ ràng và nút icon thêm lịch.
   * @param {Object} conf Đối tượng hội nghị.
   */
  function renderTimeline(conf) {
    const track = document.querySelector('.js-timeline-track');
    if (!track || !conf) return;

    const utils = getDetailUtils();
    const esc = utils.escapeHtml;
    const milestones = utils.getCoreMilestones(conf);
    const next = utils.getNextDeadline(conf);
    coreMilestonesCache = milestones;

    if (!milestones.length) {
      track.innerHTML = `
        <div class="deadline-timeline__step deadline-timeline__step--upcoming timeline-step">
          <div class="deadline-timeline__step-top">
            <span class="deadline-timeline__badge">1</span>
          </div>
          <h3 class="deadline-timeline__name">Đang cập nhật mốc nộp bài</h3>
          <span class="deadline-timeline__tz">Ban tổ chức chưa công bố lịch trình chi tiết.</span>
          <span class="deadline-timeline__status">Chưa cập nhật</span>
        </div>
      `;
      return;
    }

    track.innerHTML = milestones.map((m, idx) => {
      const dateVal = m.date;
      const converted = dateVal && utils.convertDeadlineToVn
        ? utils.convertDeadlineToVn(dateVal, { isDeadline: true })
        : null;
      const left = dateVal ? utils.daysLeft(dateVal) : null;
      const isPassed = left !== null && left < 0;
      const isActive = Boolean(next && !next.isPassed && next.date === dateVal && next.key === m.key);

      let modifierClass = 'deadline-timeline__step--upcoming';
      let statusLabel = 'Sắp tới';
      let badgeContent = String(idx + 1);

      if (!dateVal || !converted) {
        statusLabel = 'Chưa công bố';
      } else if (isPassed) {
        modifierClass = 'deadline-timeline__step--passed';
        statusLabel = 'Đã qua';
        badgeContent = renderSpriteIcon('icon-check', 14);
      } else if (isActive) {
        const isUrgentActive = left !== null && left <= 14;
        modifierClass = isUrgentActive
          ? 'deadline-timeline__step--active deadline-timeline__step--urgent'
          : 'deadline-timeline__step--active deadline-timeline__step--open';
        statusLabel = `Mốc tiếp theo · Còn ${Math.max(0, left)} ngày`;
      } else {
        statusLabel = `Sắp tới · Còn ${Math.max(0, left)} ngày`;
      }

      const timeDisplay = converted
        ? (converted.vnTimeVi ? `${converted.vnTimeVi} ${converted.vnDateVi}` : converted.vnDateVi)
        : 'Chưa cập nhật';
      const tzLabel = converted ? converted.timezoneLabel : 'UTC+7 (giờ Việt Nam)';
      const datetimeAttr = converted ? converted.vnIsoDate : '';

      const calButtonHtml = dateVal && converted && !isPassed
        ? `
          <button
            type="button"
            class="deadline-timeline__cal-btn js-step-cal-btn"
            data-milestone-index="${idx}"
            aria-label="Thêm mốc ${esc(m.name)} vào Google Calendar"
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
          <h3 class="deadline-timeline__name">${esc(m.name)}</h3>
          ${datetimeAttr
            ? `<time class="deadline-timeline__time" datetime="${esc(datetimeAttr)}">${esc(timeDisplay)}</time>`
            : `<span class="deadline-timeline__time">${esc(timeDisplay)}</span>`}
          <span class="deadline-timeline__tz">${esc(tzLabel)}</span>
          <span class="deadline-timeline__status">${esc(statusLabel)}</span>
        </div>
      `;
    }).join('');
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
   * Render danh sách Thông tin học thuật (<dl>): chỉ hiển thị 5 thông số học thuật thật, không lặp lại với Header.
   * @param {Object} conf Đối tượng hội nghị.
   */
  function renderAcademicInfo(conf) {
    const root = document.querySelector('.js-detail-root');
    if (!root || !conf) return;

    const utils = getDetailUtils();
    const esc = utils.escapeHtml;

    const rankEl = root.querySelector('.js-spec-rank');
    const realRank = conf.rank ? String(conf.rank).trim() : '';
    if (rankEl) rankEl.textContent = realRank ? `CORE ${realRank}` : 'Chưa cập nhật';

    const pubEl = root.querySelector('.js-spec-publisher');
    const realPub = conf.publisher ? String(conf.publisher).trim() : '';
    if (pubEl) pubEl.textContent = realPub || 'Chưa cập nhật';

    const idxEl = root.querySelector('.js-spec-indexing');
    const realIdx = Array.isArray(conf.indexing)
      ? conf.indexing.map(i => String(i).trim()).filter(Boolean)
      : [];
    if (idxEl) idxEl.textContent = realIdx.length > 0 ? realIdx.join(', ') : 'Chưa cập nhật';

    const fieldsEl = root.querySelector('.js-spec-fields');
    const realFields = Array.isArray(conf.fields)
      ? conf.fields.map(f => String(f).trim()).filter(Boolean)
      : [];
    if (fieldsEl) fieldsEl.textContent = realFields.length > 0 ? realFields.join(', ') : 'Chưa cập nhật';

    const verifiedEl = root.querySelector('.js-spec-verified');
    const rawVerified = (conf.lastVerified || (conf.crawled_at ? String(conf.crawled_at).slice(0, 10) : '')).trim();
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
   * Sinh chuỗi HTML 5 ngôi sao tĩnh theo đúng điểm số truyền vào (tô sáng các sao <= Math.round(score)).
   * @param {number} score Điểm đánh giá (0 - 5).
   * @param {number} [size=18] Kích thước ngôi sao.
   * @returns {string} Chuỗi HTML 5 biểu tượng sao.
   */
  function renderStaticStarsHtml(score, size = 18) {
    const numScore = Number(score);
    const rounded = Number.isFinite(numScore) && numScore > 0 ? Math.round(numScore) : 0;
    let html = '';
    for (let i = 1; i <= 5; i++) {
      const litClass = i <= rounded ? ' is-lit' : '';
      html += `
        <svg class="conf-reviews__star-svg${litClass}" width="${size}" height="${size}" aria-hidden="true">
          <use href="#icon-star"></use>
        </svg>
      `;
    }
    return html;
  }

  /**
   * Cập nhật giao diện nhóm radio 5 sao chấm điểm của người dùng.
   * @param {number} activeRating Số sao đang được chọn hoặc tô sáng (0 - 5).
   * @param {number} savedRating Số sao đã lưu thực tế của người dùng (0 - 5).
   */
  function updateUserStarRadioGroup(activeRating, savedRating) {
    const starsBox = document.querySelector('.js-star-rating');
    if (!starsBox) return;

    const buttons = starsBox.querySelectorAll('.js-star-btn');
    buttons.forEach((btn, idx) => {
      const starVal = idx + 1;
      const isLit = starVal <= activeRating;
      const isChecked = savedRating > 0 ? starVal === savedRating : false;
      btn.classList.toggle('is-lit', isLit);
      btn.setAttribute('aria-checked', String(isChecked));
      btn.tabIndex = (savedRating > 0 ? starVal === savedRating : starVal === 1) ? 0 : -1;
    });
  }

  /**
   * Vẽ thanh phân bố tỷ lệ sao trong view #danh-gia nếu dữ liệu hội nghị có thông tin phân bố, ẩn nếu không có.
   * @param {Object} conf Đối tượng hội nghị.
   */
  function renderRatingDistributionBars(conf) {
    const barsEl = document.querySelector('.js-rv-bars');
    if (!barsEl) return;

    const dist = conf && (conf.rating_distribution || conf.ratingBreakdown);
    if (!dist || typeof dist !== 'object') {
      barsEl.innerHTML = '';
      barsEl.hidden = true;
      return;
    }

    const counts = [5, 4, 3, 2, 1].map(star => Number(dist[star] || 0));
    const total = counts.reduce((sum, val) => sum + val, 0);
    if (total <= 0) {
      barsEl.innerHTML = '';
      barsEl.hidden = true;
      return;
    }

    barsEl.hidden = false;
    barsEl.innerHTML = [5, 4, 3, 2, 1].map((star, idx) => {
      const pct = Math.round((counts[idx] / total) * 100);
      return `
        <div class="reviews-view__bar-row">
          <span>${star} sao</span>
          <progress class="reviews-view__bar-progress" value="${pct}" max="100" aria-label="Tỷ lệ ${star} sao">${pct}%</progress>
          <span class="reviews-view__bar-pct">${pct}%</span>
        </div>
      `;
    }).join('');
  }

  /**
   * Render khu vực Đánh giá & Nhận xét hợp nhất trên trang chi tiết và cập nhật danh sách ở view #danh-gia.
   * @param {Object} conf Đối tượng hội nghị.
   */
  function renderReviews(conf) {
    const root = document.querySelector('.js-detail-root');
    if (!root || !conf) return;

    const utils = getDetailUtils();
    const esc = utils.escapeHtml;
    const confId = utils.getConferenceId(conf) || 'conf';

    // 1. Điểm tham khảo từ dữ liệu hội nghị
    const hasRating = Number.isFinite(Number(conf.rating)) && Number(conf.rating) > 0;
    const ratingVal = hasRating ? Number(conf.rating) : 0;

    const avgScoreEl = root.querySelector('.js-avg-score');
    if (avgScoreEl) avgScoreEl.textContent = hasRating ? ratingVal.toFixed(1) : '—';

    const headerStarsEl = root.querySelector('.js-header-stars');
    if (headerStarsEl) {
      headerStarsEl.innerHTML = renderStaticStarsHtml(ratingVal, 17);
    }

    const countTextEl = root.querySelector('.js-reviews-count-text');
    if (countTextEl) {
      countTextEl.textContent = conf.rating_count
        ? `Số liệu tham khảo (${conf.rating_count} lượt)`
        : (hasRating ? 'Điểm tham khảo từ dữ liệu hội nghị' : 'Chưa có điểm tham khảo');
    }

    // 2. Nhóm radio 5 sao chấm điểm của người dùng
    const userRatingKey = `confguide_rating_${confId}`;
    const savedRating = Number(utils.readStorage(userRatingKey, 0)) || 0;
    const starsBox = root.querySelector('.js-star-rating');
    const rateMsgEl = root.querySelector('.js-rate-msg');

    if (starsBox) {
      starsBox.innerHTML = [1, 2, 3, 4, 5].map(star => `
        <button
          type="button"
          class="star-rating__btn js-star-btn"
          role="radio"
          aria-checked="${savedRating === star ? 'true' : 'false'}"
          aria-label="${star} sao"
          data-star="${star}"
        >
          <svg class="star-rating__svg" viewBox="0 0 24 24" aria-hidden="true">
            <use href="#icon-star"></use>
          </svg>
          <span>${star}</span>
        </button>
      `).join('');
      updateUserStarRadioGroup(savedRating, savedRating);
    }

    if (rateMsgEl) {
      rateMsgEl.textContent = savedRating ? `Bạn đã chấm ${savedRating}/5 sao.` : 'Nhấn vào ngôi sao để chấm điểm.';
    }

    // 3. Đồng bộ số lượng nhận xét cục bộ và view #danh-gia
    const reviewsKey = `confguide_reviews_${confId}`;
    const rawReviews = utils.readStorage(reviewsKey, []);
    const reviews = Array.isArray(rawReviews) ? rawReviews : [];

    const localSummaryEl = root.querySelector('.js-local-review-summary');
    if (localSummaryEl) {
      localSummaryEl.textContent = reviews.length > 0
        ? `Hiện có ${reviews.length} nhận xét được lưu trên trình duyệt này.`
        : 'Chưa có nhận xét nào trên trình duyệt này. Hãy chia sẻ nhận xét đầu tiên.';
    }

    const rvPageTitle = root.querySelector('.js-rv-page-title');
    if (rvPageTitle) rvPageTitle.textContent = `Nhận xét hội nghị · ${conf.name}`;

    const rvAvg = root.querySelector('.js-rv-avg');
    if (rvAvg) rvAvg.textContent = hasRating ? ratingVal.toFixed(1) : (savedRating ? savedRating.toFixed(1) : '—');

    const rvStars = root.querySelector('.js-rv-stars');
    if (rvStars) {
      const displayScore = hasRating ? ratingVal : savedRating;
      rvStars.innerHTML = renderStaticStarsHtml(displayScore, 20);
    }

    const rvTotal = root.querySelector('.js-rv-total');
    if (rvTotal) rvTotal.textContent = `${reviews.length} nhận xét lưu trên trình duyệt này`;

    renderRatingDistributionBars(conf);

    const rvList = root.querySelector('.js-rv-list');
    if (rvList) {
      if (reviews.length > 0) {
        rvList.innerHTML = reviews.map(item => {
          const createdIso = item.createdAt ? String(item.createdAt) : '';
          const createdVi = createdIso ? new Date(createdIso).toLocaleString('vi-VN') : '';
          return `
            <article class="reviews-view__item">
              <div class="reviews-view__item-head">
                <strong class="reviews-view__author">${esc(item.author || 'Người dùng ConfGuide')}</strong>
                ${createdIso
                  ? `<time class="reviews-view__time" datetime="${esc(createdIso)}">${esc(createdVi)}</time>`
                  : ''}
              </div>
              <p class="reviews-view__text">${esc(item.text || '')}</p>
            </article>
          `;
        }).join('');
      } else {
        rvList.innerHTML = '<p class="reviews-view__item">Chưa có nhận xét nào được lưu trên trình duyệt này. Bạn có thể gửi nhận xét đầu tiên ở biểu mẫu phía trên.</p>';
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
    const realRank = item.rank ? String(item.rank).trim() : '';
    const dateRange = utils.formatConferenceEventDate(item);
    const locationText = item.location || 'Chưa cập nhật';
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
            ${realRank ? `<span class="conf-badge conf-badge--rank">Rank ${esc(realRank)}</span>` : ''}
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
    const curFields = Array.isArray(current.fields)
      ? current.fields.map(f => String(f).toLowerCase())
      : [];

    const relatedList = allConferences
      .filter(c => utils.getConferenceId(c) !== currentId)
      .sort((a, b) => {
        const aMatch = (a.fields || []).filter(f => curFields.includes(String(f).toLowerCase())).length;
        const bMatch = (b.fields || []).filter(f => curFields.includes(String(f).toLowerCase())).length;
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
   * Đồng bộ chuyển đổi giữa View Chi tiết (#viewDetail) và View Nhận xét (#danh-gia).
   */
  function syncHashRoute() {
    const root = document.querySelector('.js-detail-root');
    if (!root || !currentConference) return;

    const viewDetail = root.querySelector('.js-view-detail');
    const viewReviews = root.querySelector('.js-view-reviews');
    const backLabel = root.querySelector('.js-back-btn-label');
    const isReviewsRoute = window.location.hash === '#danh-gia';

    if (viewDetail) viewDetail.hidden = isReviewsRoute;
    if (viewReviews) viewReviews.hidden = !isReviewsRoute;
    if (backLabel) {
      backLabel.textContent = isReviewsRoute ? 'Quay lại chi tiết hội nghị' : 'Quay lại danh sách';
    }
    window.scrollTo(0, 0);
  }

  /**
   * Điều hướng nút "Quay lại": giữ nguyên bộ lọc và chế độ xem của trang danh sách trước đó.
   */
  function navigateBackFromDetail() {
    if (window.location.hash === '#danh-gia') {
      history.replaceState(null, '', window.location.pathname + window.location.search);
      syncHashRoute();
      return;
    }

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
   * Lưu điểm số sao của người dùng cho hội nghị hiện tại.
   * @param {number} selectedStar Giá trị sao từ 1 đến 5.
   */
  function saveUserStarRating(selectedStar) {
    if (!currentConference) return;
    const utils = getDetailUtils();
    const confId = utils.getConferenceId(currentConference) || 'conf';
    const userRatingKey = `confguide_rating_${confId}`;
    const currentSaved = Number(utils.readStorage(userRatingKey, 0)) || 0;
    const nextRating = currentSaved === selectedStar ? 0 : selectedStar;

    utils.writeStorage(userRatingKey, nextRating);
    updateUserStarRadioGroup(nextRating, nextRating);

    const rateMsgEl = document.querySelector('.js-rate-msg');
    if (rateMsgEl) {
      rateMsgEl.textContent = nextRating
        ? `Bạn đã chấm ${nextRating}/5 sao. Cảm ơn đánh giá của bạn!`
        : 'Đã xóa điểm chấm của bạn.';
    }
  }

  /**
   * Kiểm tra hợp lệ và lưu nhận xét mới từ form tại view #danh-gia (kết hợp HTML5 + Regex).
   * @param {HTMLFormElement} formEl Phần tử form nhận xét.
   */
  function handleReviewFormSubmit(formEl) {
    if (!currentConference || !formEl) return;
    const utils = getDetailUtils();
    const confId = utils.getConferenceId(currentConference) || 'conf';

    const textarea = formEl.querySelector('.js-review-textarea');
    const errorEl = formEl.querySelector('.js-field-error');
    const msgEl = formEl.querySelector('.js-review-form-msg');
    if (!textarea) return;

    const rawText = textarea.value.trim();
    const validTextRegex = /^[\s\S]{8,1200}$/;
    const hasMeaningfulChars = /\S{2,}/.test(rawText);

    if (msgEl) msgEl.textContent = '';

    if (!validTextRegex.test(rawText) || !hasMeaningfulChars) {
      if (errorEl) {
        errorEl.textContent = 'Vui lòng nhập nội dung nhận xét hợp lệ từ 8 đến 1200 ký tự.';
      }
      textarea.setAttribute('aria-invalid', 'true');
      textarea.focus();
      return;
    }

    if (errorEl) errorEl.textContent = '';
    textarea.setAttribute('aria-invalid', 'false');

    const reviewsKey = `confguide_reviews_${confId}`;
    const existing = utils.readStorage(reviewsKey, []);
    const safeList = Array.isArray(existing) ? existing : [];
    const currentUser = window.ConfGuideLayout && typeof window.ConfGuideLayout.getCurrentUser === 'function'
      ? window.ConfGuideLayout.getCurrentUser()
      : null;

    safeList.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      author: (currentUser && (currentUser.fullName || currentUser.name || currentUser.username)) || 'Người dùng ConfGuide',
      text: rawText,
      createdAt: new Date().toISOString()
    });

    if (utils.writeStorage(reviewsKey, safeList)) {
      textarea.value = '';
      if (msgEl) msgEl.textContent = 'Đã lưu nhận xét trên trình duyệt này.';
      renderReviews(currentConference);
    } else if (msgEl) {
      msgEl.textContent = 'Không thể lưu nhận xét. Vui lòng kiểm tra dung lượng bộ nhớ trình duyệt.';
    }
  }

  /**
   * Thiết lập Event Delegation tập trung trên gốc .js-detail-root và các sự kiện vòng đời cửa sổ.
   */
  function setupEventDelegation() {
    const root = document.querySelector('.js-detail-root');
    if (!root) return;

    // 1. Ủy quyền sự kiện Click
    root.addEventListener('click', event => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      if (target.closest('.js-back-btn')) {
        navigateBackFromDetail();
        return;
      }

      if (target.closest('.js-back-to-detail-btn')) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
        syncHashRoute();
        return;
      }

      if (target.closest('.js-open-reviews')) {
        window.location.hash = '#danh-gia';
        return;
      }

      if (target.closest('.js-save-btn')) {
        toggleSaveCurrentConference();
        return;
      }

      const calActionBtn = target.closest('.js-cal-action');
      if (calActionBtn && currentConference) {
        const action = calActionBtn.getAttribute('data-cal-action');
        const nextMilestone = getDetailUtils().getNextDeadline(currentConference);
        if (action === 'google-next') {
          handleCalendarAction('google', currentConference, nextMilestone);
        } else if (action === 'ics-next') {
          handleCalendarAction('ics-single', currentConference, nextMilestone);
        } else if (action === 'ics-all') {
          handleCalendarAction('ics-all', currentConference, null);
        }
        return;
      }

      const stepCalBtn = target.closest('.js-step-cal-btn');
      if (stepCalBtn && currentConference) {
        const idx = Number(stepCalBtn.getAttribute('data-milestone-index'));
        const milestone = coreMilestonesCache[idx];
        if (milestone) {
          handleCalendarAction('google', currentConference, milestone);
        }
        return;
      }

      const starBtn = target.closest('.js-star-btn');
      if (starBtn) {
        const starVal = Number(starBtn.getAttribute('data-star'));
        if (starVal >= 1 && starVal <= 5) {
          saveUserStarRating(starVal);
        }
      }
    });

    // 2. Hiệu ứng rê chuột và điều hướng bàn phím mũi tên cho nhóm radio 5 sao
    root.addEventListener('mouseover', event => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const starBtn = target.closest('.js-star-btn');
      if (!starBtn || !currentConference) return;
      const hoverVal = Number(starBtn.getAttribute('data-star')) || 0;
      const confId = getDetailUtils().getConferenceId(currentConference) || 'conf';
      const savedRating = Number(getDetailUtils().readStorage(`confguide_rating_${confId}`, 0)) || 0;
      updateUserStarRadioGroup(hoverVal, savedRating);
    });

    root.addEventListener('mouseout', event => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const ratingBox = target.closest('.js-star-rating');
      if (!ratingBox || !currentConference) return;
      const related = event.relatedTarget;
      if (related instanceof Element && ratingBox.contains(related)) return;
      const confId = getDetailUtils().getConferenceId(currentConference) || 'conf';
      const savedRating = Number(getDetailUtils().readStorage(`confguide_rating_${confId}`, 0)) || 0;
      updateUserStarRadioGroup(savedRating, savedRating);
    });

    root.addEventListener('keydown', event => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const starBtn = target.closest('.js-star-btn');
      if (!starBtn) return;

      const currentStar = Number(starBtn.getAttribute('data-star')) || 1;
      let nextStar = null;
      if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
        nextStar = currentStar < 5 ? currentStar + 1 : 1;
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
        nextStar = currentStar > 1 ? currentStar - 1 : 5;
      }

      if (nextStar !== null) {
        event.preventDefault();
        saveUserStarRating(nextStar);
        const nextBtn = root.querySelector(`.js-star-btn[data-star="${nextStar}"]`);
        if (nextBtn instanceof HTMLElement) nextBtn.focus();
      }
    });

    // 3. Sự kiện nhập liệu & gửi biểu mẫu nhận xét
    root.addEventListener('input', event => {
      const target = event.target;
      if (!(target instanceof HTMLTextAreaElement) || !target.classList.contains('js-review-textarea')) return;
      if (target.value.trim().length >= 8) {
        const errEl = root.querySelector('.js-field-error');
        if (errEl) errEl.textContent = '';
        target.setAttribute('aria-invalid', 'false');
      }
    });

    root.addEventListener('submit', event => {
      const formEl = event.target;
      if (!(formEl instanceof HTMLFormElement) || !formEl.classList.contains('js-review-form')) return;
      event.preventDefault();
      handleReviewFormSubmit(formEl);
    });

    window.addEventListener('hashchange', syncHashRoute);
    window.addEventListener('pagehide', stopCountdownTimer);
    window.addEventListener('beforeunload', stopCountdownTimer);
  }

  /**
   * Tải dữ liệu hội nghị theo ?id=<slug> và khởi tạo toàn bộ các phần trên trang Chi tiết.
   * Báo lỗi rõ ràng khi thiếu ?id, không tìm thấy hội nghị hoặc khi fetch dữ liệu gặp sự cố.
   * @returns {Promise<void>}
   */
  async function initDetailPage() {
    setupEventDelegation();

    const utils = getDetailUtils();
    const urlParams = new URLSearchParams(window.location.search);
    const requestedId = (urlParams.get('id') || '').trim().toLowerCase();

    if (!requestedId) {
      setPageState(
        'error',
        'Đường dẫn chưa có tham số mã hội nghị (?id=...). Vui lòng chọn một hội nghị từ danh sách tra cứu.'
      );
      return;
    }

    setPageState('loading');
    setFetchNotice('');

    const fallbackList = Array.isArray(utils.FALLBACK_CONFERENCES) ? utils.FALLBACK_CONFERENCES : [];
    let loadedFromJson = false;

    try {
      const data = typeof utils.fetchJsonCached === 'function'
        ? await utils.fetchJsonCached('data/conferences.json')
        : await fetch('data/conferences.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
      if (Array.isArray(data) && data.length > 0) {
        allConferences = data.map(c => utils.normalizeConference(c)).filter(Boolean);
        loadedFromJson = true;
      }
    } catch (err) {
      allConferences = fallbackList.map(c => utils.normalizeConference(c)).filter(Boolean);
      if (allConferences.length > 0) {
        setFetchNotice('Không thể kết nối tệp dữ liệu máy chủ (data/conferences.json). Hệ thống đang hiển thị từ dữ liệu dự phòng cục bộ.');
      }
    }

    if (!loadedFromJson && allConferences.length === 0) {
      allConferences = fallbackList.map(c => utils.normalizeConference(c)).filter(Boolean);
    }

    currentConference = allConferences.find(c => utils.getConferenceId(c).toLowerCase() === requestedId)
      || allConferences.find(c => utils.slugify && utils.slugify(c.name) === requestedId)
      || null;

    if (!currentConference) {
      setPageState(
        'error',
        `Không tìm thấy hội nghị có mã "${requestedId}". Hội nghị có thể đã bị gỡ hoặc đường dẫn không chính xác.`
      );
      return;
    }

    renderHeader(currentConference);
    renderTimeline(currentConference);
    renderOverview(currentConference);
    renderAcademicInfo(currentConference);
    renderReviews(currentConference);
    renderNextDeadlineCard(currentConference);
    renderRelated(currentConference);

    setPageState('content');
  }

  // Dọn dẹp bộ đếm ngược khi rời trang và khôi phục nếu người dùng quay lại qua bfcache
  window.addEventListener('pagehide', stopCountdownTimer);
  window.addEventListener('pageshow', event => {
    if (event.persisted && currentConference) {
      renderNextDeadlineCard(currentConference);
    }
  });

  document.addEventListener('DOMContentLoaded', initDetailPage);
})();
