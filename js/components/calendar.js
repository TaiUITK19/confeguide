/**
 * ConfGuide — Module Lịch Các Mốc Hội nghị Cá nhân (js/components/calendar.js)
 * Chuẩn hóa 3 nguồn sự kiện (hạn nộp bài quy đổi UTC+7 từ AoE, ngày diễn ra hội nghị,
 * mốc Tracker từ localStorage 'confguides'), hiển thị lưới tháng 7 cột (T2..CN),
 * panel chi tiết theo ngày, danh sách 5 sự kiện sắp tới và hỗ trợ đầy đủ A11y / bàn phím.
 */

(function () {
  'use strict';

  const MAX_VISIBLE_DAY_EVENTS = 3;
  const MAX_EVENT_SPAN_DAYS = 60;
  const UPCOMING_LIMIT = 5;
  const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

  const EVENT_META = {
    deadline: {
      symbol: '◆',
      label: 'Deadline',
      legendLabel: 'Deadline (UTC+7)'
    },
    event: {
      symbol: '●',
      label: 'Hội nghị',
      legendLabel: 'Ngày diễn ra'
    },
    tracker: {
      symbol: '▲',
      label: 'Tracker',
      legendLabel: 'Mốc Tracker'
    }
  };

  const TYPE_PRIORITY = {
    deadline: 0,
    tracker: 1,
    event: 2
  };

  const containerStates = new WeakMap();

  /**
   * Lấy tập hàm tiện ích dùng chung từ window.ConfGuideUtils kèm dự phòng an toàn.
   * @returns {Object} Đối tượng tiện ích chuẩn hóa.
   */
  function getCalendarUtils() {
    return window.ConfGuideUtils || {};
  }

  /**
   * Thoát ký tự đặc biệt HTML để phòng chống XSS khi render dữ liệu động.
   * @param {*} value Giá trị đầu vào cần làm sạch.
   * @returns {string} Chuỗi an toàn cho HTML.
   */
  function escapeHtml(value) {
    const utils = getCalendarUtils();
    if (typeof utils.escapeHtml === 'function') {
      return utils.escapeHtml(value);
    }
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Định dạng năm, tháng, ngày thành chuỗi ISO YYYY-MM-DD.
   * @param {number} year Năm 4 chữ số.
   * @param {number} month Tháng (1..12).
   * @param {number} day Ngày trong tháng (1..31).
   * @returns {string} Chuỗi ngày định dạng YYYY-MM-DD.
   */
  function formatIsoDate(year, month, day) {
    const y = String(year).padStart(4, '0');
    const m = String(month).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  /**
   * Chuẩn hóa chuỗi ngày thô về định dạng YYYY-MM-DD nếu hợp lệ.
   * @param {*} rawDate Chuỗi ngày đầu vào.
   * @returns {string} Chuỗi YYYY-MM-DD hoặc chuỗi rỗng nếu không hợp lệ.
   */
  function normalizeIsoDate(rawDate) {
    if (!rawDate || typeof rawDate !== 'string') return '';
    const trimmed = rawDate.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const isoPrefix = trimmed.match(/^(\d{4}-\d{2}-\d{2})[T\s]/);
    if (isoPrefix) return isoPrefix[1];
    const viMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (viMatch) return `${viMatch[3]}-${viMatch[2]}-${viMatch[1]}`;
    return '';
  }

  /**
   * Phân tích chuỗi ISO YYYY-MM-DD thành các thành phần số nguyên hợp lệ.
   * @param {string} isoDate Chuỗi ngày YYYY-MM-DD.
   * @returns {{ year: number, month: number, day: number }|null} Thành phần ngày hoặc null.
   */
  function parseIsoParts(isoDate) {
    const iso = normalizeIsoDate(isoDate);
    if (!iso) return null;
    const parts = iso.split('-');
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return { year, month, day };
  }

  /**
   * Định dạng chuỗi ISO YYYY-MM-DD sang DD/MM/YYYY theo thói quen Việt Nam.
   * @param {string} isoDate Chuỗi ngày YYYY-MM-DD.
   * @returns {string} Chuỗi DD/MM/YYYY hoặc chuỗi rỗng nếu không hợp lệ.
   */
  function formatDateVi(isoDate) {
    const utils = getCalendarUtils();
    const iso = normalizeIsoDate(isoDate);
    if (!iso) return '';
    if (typeof utils.formatDateVi === 'function') {
      return utils.formatDateVi(iso);
    }
    const parts = iso.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  /**
   * Lấy ngày hiện tại cố định theo múi giờ Việt Nam (UTC+7), đồng bộ với ConfGuideUtils.
   * @returns {{ year: number, month: number, day: number, iso: string, nowMs: number }} Thông tin ngày hôm nay.
   */
  function getVnTodayInfo() {
    const nowMs = Date.now();
    const vnNow = new Date(nowMs + 7 * 3600000);
    const year = vnNow.getUTCFullYear();
    const month = vnNow.getUTCMonth() + 1;
    const day = vnNow.getUTCDate();
    return {
      year,
      month,
      day,
      iso: formatIsoDate(year, month, day),
      nowMs
    };
  }

  /**
   * Cộng/trừ số ngày cho chuỗi ISO YYYY-MM-DD theo lịch UTC thuần (tránh lệch múi giờ cục bộ).
   * @param {string} isoDate Ngày gốc YYYY-MM-DD.
   * @param {number} offsetDays Số ngày dịch chuyển (âm hoặc dương).
   * @returns {string} Chuỗi ngày mới YYYY-MM-DD.
   */
  function addDaysIso(isoDate, offsetDays) {
    const parts = parseIsoParts(isoDate);
    if (!parts) return isoDate;
    const utcMs = Date.UTC(parts.year, parts.month - 1, parts.day) + offsetDays * 86400000;
    const d = new Date(utcMs);
    return formatIsoDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }

  /**
   * Tính số ngày trong một tháng dương lịch cụ thể.
   * @param {number} year Năm 4 chữ số.
   * @param {number} month Tháng (1..12).
   * @returns {number} Số ngày trong tháng (28..31).
   */
  function getDaysInMonth(year, month) {
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
  }

  /**
   * Quy đổi mốc thời hạn nộp bài từ AoE (UTC-12) sang ngày & giờ Việt Nam (UTC+7),
   * ưu tiên gọi ConfGuideUtils.convertDeadlineToVn để khớp tuyệt đối với trang detail.html.
   * Quy ước: mốc deadline hội nghị mặc định 23:59:59 AoE (+19h = 18:59 ngày D+1 UTC+7);
   * mốc không kèm giờ tường minh (hasExplicitTime: false) giữ nguyên ngày YYYY-MM-DD và nhãn (AoE).
   * @param {string} dateStr Chuỗi ngày/giờ hạn nộp thô.
   * @param {Object} [options={}] Tùy chọn ({ isDeadline, hasExplicitTime }).
   * @returns {Object|null} Thông tin đã quy đổi gồm vnIsoDate, displayText, targetMs hoặc null.
   */
  function convertDeadlineToVnHelper(dateStr, options = {}) {
    const utils = getCalendarUtils();
    if (typeof utils.convertDeadlineToVn === 'function') {
      return utils.convertDeadlineToVn(dateStr, options);
    }

    if (!dateStr || typeof dateStr !== 'string') return null;
    const trimmed = dateStr.trim();
    const parts = parseIsoParts(trimmed);
    if (!parts) return null;

    const iso = formatIsoDate(parts.year, parts.month, parts.day);
    const aoeDateVi = formatDateVi(iso);
    const isDeadline = options.isDeadline !== false;
    const hasExplicitTime = options.hasExplicitTime !== false;

    if (!isDeadline || !hasExplicitTime) {
      return {
        rawDate: iso,
        aoeDateVi,
        vnIsoDate: iso,
        vnDateVi: aoeDateVi,
        vnTimeVi: '',
        timezoneLabel: 'AoE',
        converted: false,
        targetMs: Date.UTC(parts.year, parts.month - 1, parts.day, 23, 59, 59) + 12 * 3600000,
        displayText: `${aoeDateVi} (AoE)`
      };
    }

    let hourAoE = 23;
    let minuteAoE = 59;
    let secondAoE = 59;
    const timeMatch = trimmed.match(/[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (timeMatch) {
      hourAoE = Number(timeMatch[1]);
      minuteAoE = Number(timeMatch[2]);
      secondAoE = timeMatch[3] ? Number(timeMatch[3]) : 0;
    }

    const targetMs = Date.UTC(parts.year, parts.month - 1, parts.day, hourAoE, minuteAoE, secondAoE) + 12 * 3600000;
    const vnDateObj = new Date(targetMs + 7 * 3600000);
    const vnIsoDate = formatIsoDate(
      vnDateObj.getUTCFullYear(),
      vnDateObj.getUTCMonth() + 1,
      vnDateObj.getUTCDate()
    );
    const vnDateVi = formatDateVi(vnIsoDate);
    const vnTimeVi = `${String(vnDateObj.getUTCHours()).padStart(2, '0')}:${String(vnDateObj.getUTCMinutes()).padStart(2, '0')}`;
    const timezoneLabel = 'UTC+7 (giờ Việt Nam)';

    return {
      rawDate: iso,
      aoeDateVi,
      vnIsoDate,
      vnDateVi,
      vnTimeVi,
      timezoneLabel,
      converted: true,
      targetMs,
      displayText: `${vnTimeVi} ${vnDateVi} — ${timezoneLabel}`
    };
  }

  /**
   * Trích xuất và chuẩn hóa danh sách các mốc deadline của một hội nghị đã lưu sang giờ Việt Nam (UTC+7).
   * Hỗ trợ cả deadlines dạng mảng (data/conferences.json) và object (FALLBACK_CONFERENCES).
   * @param {Object} conf Đối tượng hội nghị đầy đủ.
   * @param {Object} details Thông tin hội nghị trả về từ resolveConferenceDetails.
   * @param {number} nowMs Mốc thời gian hiện tại (UTC epoch ms).
   * @returns {Array<Object>} Danh sách sự kiện type='deadline'.
   */
  function extractDeadlineEvents(conf, details, nowMs) {
    if (!conf || !conf.deadlines) return [];
    const utils = getCalendarUtils();
    const events = [];
    const confTitle = (details && details.name) || conf.name || 'Hội nghị';
    const confSlug = (details && details.slug) ? String(details.slug) : null;

    if (typeof utils.parseDeadlinesList === 'function') {
      const parsed = utils.parseDeadlinesList(conf.deadlines);
      parsed.forEach(item => {
        if (!item || !item.vnDate) return;
        const isPast = Number.isFinite(item.targetMs) ? item.targetMs <= nowMs : Boolean(item.isPassed);
        events.push({
          date: item.vnDate,
          type: 'deadline',
          title: confTitle,
          subtitle: `${item.name || item.shortName || 'Deadline'} · ${item.displayDate}`,
          slug: confSlug,
          isPast
        });
      });
      return events;
    }

    // Dự phòng khi parseDeadlinesList không tồn tại
    if (Array.isArray(conf.deadlines)) {
      conf.deadlines.forEach(entry => {
        if (!entry || typeof entry !== 'object') return;
        const converted = convertDeadlineToVnHelper(entry.date, { isDeadline: true });
        if (!converted || !converted.vnIsoDate) return;
        const milestoneName = String(entry.name || 'Deadline').trim();
        events.push({
          date: converted.vnIsoDate,
          type: 'deadline',
          title: confTitle,
          subtitle: `${milestoneName} · ${converted.displayText}`,
          slug: confSlug,
          isPast: converted.targetMs <= nowMs
        });
      });
    } else if (typeof conf.deadlines === 'object') {
      const defs = Array.isArray(utils.MILESTONE_DEFINITIONS)
        ? utils.MILESTONE_DEFINITIONS
        : [
            { key: 'abstract', name: 'Abstract' },
            { key: 'fullPaper', name: 'Full Paper' },
            { key: 'notification', name: 'Notification' },
            { key: 'cameraReady', name: 'Camera-Ready' }
          ];
      defs.forEach(def => {
        const rawDate = conf.deadlines[def.key];
        const converted = convertDeadlineToVnHelper(rawDate, { isDeadline: true });
        if (!converted || !converted.vnIsoDate) return;
        events.push({
          date: converted.vnIsoDate,
          type: 'deadline',
          title: confTitle,
          subtitle: `${def.name} · ${converted.displayText}`,
          slug: confSlug,
          isPast: converted.targetMs <= nowMs
        });
      });
    }

    return events;
  }

  /**
   * Trích xuất các ngày diễn ra (start_date -> end_date) của hội nghị đã lưu, hiển thị ở mọi ngày trong khoảng.
   * Không cộng 19h vì đây là ngày diễn ra sự kiện tại địa điểm tổ chức.
   * @param {Object} conf Đối tượng hội nghị đầy đủ.
   * @param {Object} details Thông tin hội nghị trả về từ resolveConferenceDetails.
   * @param {string} todayIso Ngày hôm nay theo giờ Việt Nam (YYYY-MM-DD).
   * @returns {Array<Object>} Danh sách sự kiện type='event' cho từng ngày trong khoảng.
   */
  function extractConferenceRangeEvents(conf, details, todayIso) {
    if (!conf) return [];
    const utils = getCalendarUtils();
    let startIso = normalizeIsoDate(conf.start_date || conf.startDate);
    let endIso = normalizeIsoDate(conf.end_date || conf.endDate);

    if ((!startIso || !endIso) && typeof conf.date_happen === 'string') {
      const rawHappen = conf.date_happen.trim();
      if (rawHappen.includes(' to ')) {
        const parts = rawHappen.split(/\s+to\s+/i);
        if (!startIso) startIso = normalizeIsoDate(parts[0]);
        if (!endIso) endIso = normalizeIsoDate(parts[1]);
      } else if (!startIso) {
        startIso = normalizeIsoDate(rawHappen);
      }
    }

    if (!startIso) return [];
    if (!endIso || endIso < startIso) {
      endIso = startIso;
    }

    const startParts = parseIsoParts(startIso);
    const endParts = parseIsoParts(endIso);
    if (!startParts || !endParts) return [];

    const rangeLabel = typeof utils.formatRangeVi === 'function'
      ? utils.formatRangeVi(startIso, endIso)
      : (startIso === endIso ? formatDateVi(startIso) : `${formatDateVi(startIso)} – ${formatDateVi(endIso)}`);
    const locText = String(conf.location || (details && details.location) || '').trim();
    const confTitle = (details && details.name) || conf.name || 'Hội nghị';
    const confSlug = (details && details.slug) ? String(details.slug) : null;
    const subtitle = `Diễn ra hội nghị · ${rangeLabel}${locText ? ` · ${locText}` : ''}`;

    const events = [];
    const startUtc = Date.UTC(startParts.year, startParts.month - 1, startParts.day);
    const endUtc = Date.UTC(endParts.year, endParts.month - 1, endParts.day);
    const totalDays = Math.min(
      MAX_EVENT_SPAN_DAYS,
      Math.floor((endUtc - startUtc) / 86400000) + 1
    );

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startUtc + i * 86400000);
      const curIso = formatIsoDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
      events.push({
        date: curIso,
        type: 'event',
        title: confTitle,
        subtitle,
        slug: confSlug,
        isPast: curIso < todayIso
      });
    }

    return events;
  }

  /**
   * Trích xuất và chuẩn hóa các mốc trong Tracker cá nhân (localStorage 'confguides').
   * Mốc chỉ có ngày (YYYY-MM-DD) giữ nguyên quy ước { hasExplicitTime: false } như profile.js;
   * nếu chuỗi có kèm giờ cụ thể sẽ quy đổi sang UTC+7 (giờ Việt Nam).
   * @param {Array<Object>} trackerItems Mảng mục từ getTrackerConferences().
   * @param {Object} todayInfo Thông tin ngày giờ hiện tại theo UTC+7.
   * @returns {Array<Object>} Danh sách sự kiện type='tracker'.
   */
  function extractTrackerEvents(trackerItems, todayInfo) {
    if (!Array.isArray(trackerItems) || trackerItems.length === 0) return [];
    const events = [];

    trackerItems.forEach(item => {
      if (!item || typeof item !== 'object') return;
      const rawDeadline = item.deadline ? String(item.deadline).trim() : '';
      if (!rawDeadline) return;

      const hasExplicitTime = /[T\s]\d{1,2}:\d{2}/.test(rawDeadline);
      const converted = convertDeadlineToVnHelper(rawDeadline, {
        isDeadline: true,
        hasExplicitTime
      });
      if (!converted || !converted.vnIsoDate) return;

      const title = String(item.name || 'Bài báo khoa học').trim() || 'Bài báo khoa học';
      const fieldsStr = Array.isArray(item.fields) && item.fields.length > 0
        ? ` · ${item.fields.map(f => String(f || '').trim()).filter(Boolean).join(', ')}`
        : '';
      const isPast = Number.isFinite(converted.targetMs)
        ? converted.targetMs <= todayInfo.nowMs
        : converted.vnIsoDate < todayInfo.iso;

      events.push({
        date: converted.vnIsoDate,
        type: 'tracker',
        title,
        subtitle: `Mốc Tracker · ${converted.displayText}${fieldsStr}`,
        slug: null,
        isPast
      });
    });

    return events;
  }

  /**
   * Chuẩn hóa toàn bộ 3 nguồn dữ liệu về một mảng sự kiện thống nhất:
   * { date: 'YYYY-MM-DD', type: 'deadline'|'event'|'tracker', title, subtitle, slug|null, isPast }.
   * @param {Object} options Đầu vào gồm savedConferences và trackerItems.
   * @returns {Array<Object>} Mảng sự kiện đã chuẩn hóa và sắp xếp.
   */
  function normalizeEvents(options = {}) {
    const savedConferences = Array.isArray(options.savedConferences) ? options.savedConferences : [];
    const trackerItems = Array.isArray(options.trackerItems) ? options.trackerItems : [];
    const todayInfo = getVnTodayInfo();
    const events = [];

    savedConferences.forEach(entry => {
      if (!entry || typeof entry !== 'object') return;
      const conf = entry.conference || null;
      const details = entry.details || null;
      if (!conf) return;

      events.push(...extractDeadlineEvents(conf, details, todayInfo.nowMs));
      events.push(...extractConferenceRangeEvents(conf, details, todayInfo.iso));
    });

    events.push(...extractTrackerEvents(trackerItems, todayInfo));

    events.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.isPast !== b.isPast) return Number(a.isPast) - Number(b.isPast);
      const pa = TYPE_PRIORITY[a.type] ?? 9;
      const pb = TYPE_PRIORITY[b.type] ?? 9;
      if (pa !== pb) return pa - pb;
      return a.title.localeCompare(b.title, 'vi');
    });

    return events;
  }

  /**
   * Nhóm danh sách sự kiện theo khóa ngày YYYY-MM-DD để tra cứu nhanh từng ô lịch.
   * @param {Array<Object>} events Mảng sự kiện đã chuẩn hóa.
   * @returns {Map<string, Array<Object>>} Bản đồ ngày -> danh sách sự kiện.
   */
  function groupEventsByDate(events) {
    const map = new Map();
    (events || []).forEach(ev => {
      if (!ev || !ev.date) return;
      if (!map.has(ev.date)) {
        map.set(ev.date, []);
      }
      map.get(ev.date).push(ev);
    });
    return map;
  }

  /**
   * Lấy tối đa 5 sự kiện sắp tới gần nhất tính từ hôm nay (gộp hội nghị nhiều ngày thành 1 mục).
   * @param {Array<Object>} events Mảng sự kiện đã chuẩn hóa.
   * @param {string} todayIso Ngày hôm nay theo UTC+7.
   * @returns {Array<Object>} Tối đa 5 sự kiện sắp tới.
   */
  function getUpcomingEvents(events, todayIso) {
    const seenEventSpans = new Set();
    const upcoming = [];

    (events || []).forEach(ev => {
      if (!ev || ev.isPast || ev.date < todayIso) return;
      if (ev.type === 'event') {
        const spanKey = `${ev.slug || ev.title}|${ev.subtitle}`;
        if (seenEventSpans.has(spanKey)) return;
        seenEventSpans.add(spanKey);
      }
      upcoming.push(ev);
    });

    return upcoming.slice(0, UPCOMING_LIMIT);
  }

  /**
   * Tạo văn bản ngắn hiển thị trong chip trên ô ngày Desktop.
   * @param {Object} ev Đối tượng sự kiện đã chuẩn hóa.
   * @returns {string} Văn bản ngắn gọn cho ô ngày.
   */
  function buildChipLabel(ev) {
    if (!ev) return '';
    if (ev.type === 'deadline' && ev.subtitle) {
      const milestonePart = String(ev.subtitle).split('·')[0].trim();
      if (milestonePart) {
        return `${ev.title}: ${milestonePart}`;
      }
    }
    return ev.title || '';
  }

  /**
   * Định dạng tiêu đề ngày đầy đủ tiếng Việt (ví dụ: "Thứ Ba, 17/11/2026").
   * @param {string} isoDate Chuỗi ngày YYYY-MM-DD.
   * @returns {string} Chuỗi ngày tiếng Việt có thứ.
   */
  function formatFullDayHeadingVi(isoDate) {
    const parts = parseIsoParts(isoDate);
    if (!parts) return isoDate || '';
    const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
    const dayNames = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const weekday = dayNames[d.getUTCDay()] || '';
    return `${weekday}, ${formatDateVi(isoDate)}`;
  }

  /**
   * Tính danh sách 35 hoặc 42 ô ngày cho lưới tháng bắt đầu từ Thứ Hai (T2..CN).
   * @param {number} year Năm hiển thị.
   * @param {number} month Tháng hiển thị (1..12).
   * @returns {Array<{ iso: string, day: number, month: number, year: number, isOutside: boolean }>} Mảng ô ngày.
   */
  function buildMonthCells(year, month) {
    const firstUtc = new Date(Date.UTC(year, month - 1, 1));
    // Quy đổi getUTCDay() (0=CN..6=T7) sang tuần bắt đầu từ Thứ Hai (0=T2..6=CN)
    const startOffset = (firstUtc.getUTCDay() + 6) % 7;
    const daysInCurrent = getDaysInMonth(year, month);
    const totalCells = Math.ceil((startOffset + daysInCurrent) / 7) * 7;

    const firstCellUtcMs = Date.UTC(year, month - 1, 1) - startOffset * 86400000;
    const cells = [];

    for (let i = 0; i < totalCells; i++) {
      const d = new Date(firstCellUtcMs + i * 86400000);
      const cellYear = d.getUTCFullYear();
      const cellMonth = d.getUTCMonth() + 1;
      const cellDay = d.getUTCDate();
      cells.push({
        iso: formatIsoDate(cellYear, cellMonth, cellDay),
        day: cellDay,
        month: cellMonth,
        year: cellYear,
        isOutside: cellYear !== year || cellMonth !== month
      });
    }

    return cells;
  }

  /**
   * Tạo HTML cho nút "Xem chi tiết →" khi sự kiện có slug hợp lệ.
   * @param {Object} ev Đối tượng sự kiện đã chuẩn hóa.
   * @returns {string} Chuỗi HTML liên kết chi tiết hoặc chuỗi rỗng nếu slug=null.
   */
  function renderDetailLinkHtml(ev) {
    if (!ev || !ev.slug) return '';
    const href = `detail.html?id=${encodeURIComponent(String(ev.slug))}`;
    return `<a href="${href}" class="profile-calendar__detail-link">Xem chi tiết &rarr;</a>`;
  }

  /**
   * Render phần lưới ngày của tháng đang xem và cập nhật tiêu đề tháng trong vùng aria-live.
   * @param {HTMLElement} container Phần tử gốc chứa lịch.
   */
  function renderCalendarGrid(container) {
    const state = containerStates.get(container);
    if (!state) return;

    const monthTitleEl = container.querySelector('.js-calendar-month-title');
    const gridEl = container.querySelector('.js-calendar-grid');
    if (!gridEl) return;

    if (monthTitleEl) {
      monthTitleEl.textContent = `Tháng ${state.viewMonth}, ${state.viewYear}`;
    }

    const cells = buildMonthCells(state.viewYear, state.viewMonth);
    const activeFocusIso = cells.some(c => c.iso === state.focusedDate)
      ? state.focusedDate
      : (cells.some(c => c.iso === state.selectedDate)
          ? state.selectedDate
          : formatIsoDate(state.viewYear, state.viewMonth, 1));
    state.focusedDate = activeFocusIso;

    gridEl.innerHTML = cells.map(cell => {
      const dayEvents = state.eventsByDate.get(cell.iso) || [];
      const isToday = cell.iso === state.todayInfo.iso;
      const isSelected = cell.iso === state.selectedDate;
      const tabIndex = cell.iso === activeFocusIso ? '0' : '-1';

      const classes = ['profile-calendar__day', 'js-calendar-day'];
      if (cell.isOutside) classes.push('profile-calendar__day--outside');
      if (isToday) classes.push('profile-calendar__day--today');
      if (isSelected) classes.push('profile-calendar__day--selected');
      if (dayEvents.length > 0) classes.push('profile-calendar__day--has-events');

      const countText = dayEvents.length > 0
        ? `${dayEvents.length} sự kiện`
        : 'Không có sự kiện';
      const ariaLabel = `${cell.day} tháng ${cell.month}, ${cell.year}: ${countText}`;

      const visibleEvents = dayEvents.slice(0, MAX_VISIBLE_DAY_EVENTS);
      const hiddenCount = Math.max(0, dayEvents.length - MAX_VISIBLE_DAY_EVENTS);

      const chipsHtml = visibleEvents.map(ev => {
        const meta = EVENT_META[ev.type] || EVENT_META.deadline;
        const pastClass = ev.isPast ? ' profile-calendar__chip--past' : '';
        const chipText = buildChipLabel(ev);
        return `
          <span class="profile-calendar__chip profile-calendar__chip--${escapeHtml(ev.type)}${pastClass}" title="${escapeHtml(ev.title)} — ${escapeHtml(ev.subtitle)}">
            <span class="profile-calendar__chip-mark" aria-hidden="true">${meta.symbol}</span>
            <span class="profile-calendar__chip-text">${escapeHtml(chipText)}</span>
          </span>
        `;
      }).join('');

      const moreHtml = hiddenCount > 0
        ? `<span class="profile-calendar__more">+${hiddenCount}</span>`
        : '';

      return `
        <button
          type="button"
          class="${classes.join(' ')}"
          data-date="${escapeHtml(cell.iso)}"
          tabindex="${tabIndex}"
          aria-label="${escapeHtml(ariaLabel)}"
          aria-pressed="${isSelected ? 'true' : 'false'}"
          ${isToday ? 'aria-current="date"' : ''}
        >
          <span class="profile-calendar__day-top">
            <span class="profile-calendar__day-num">${cell.day}</span>
          </span>
          <span class="profile-calendar__day-events" aria-hidden="true">
            ${chipsHtml}
            ${moreHtml}
          </span>
        </button>
      `;
    }).join('');
  }

  /**
   * Render panel danh sách sự kiện của ngày đang chọn.
   * @param {HTMLElement} container Phần tử gốc chứa lịch.
   */
  function renderSelectedDayPanel(container) {
    const state = containerStates.get(container);
    const panelEl = container.querySelector('.js-calendar-panel-day');
    if (!state || !panelEl) return;

    const selectedIso = state.selectedDate || state.todayInfo.iso;
    const dayEvents = state.eventsByDate.get(selectedIso) || [];
    const headingText = formatFullDayHeadingVi(selectedIso);
    const isToday = selectedIso === state.todayInfo.iso;

    const listHtml = dayEvents.length > 0
      ? `
        <ul class="profile-calendar__event-list">
          ${dayEvents.map(ev => {
            const meta = EVENT_META[ev.type] || EVENT_META.deadline;
            const pastClass = ev.isPast ? ' profile-calendar__event-item--past' : '';
            const detailLinkHtml = renderDetailLinkHtml(ev);
            return `
              <li class="profile-calendar__event-item profile-calendar__event-item--${escapeHtml(ev.type)}${pastClass}">
                <div class="profile-calendar__event-badges">
                  <span class="profile-calendar__type-pill profile-calendar__type-pill--${escapeHtml(ev.type)}">
                    <span aria-hidden="true">${meta.symbol}</span>
                    <span>${escapeHtml(meta.label)}</span>
                  </span>
                  ${ev.isPast ? '<span class="profile-calendar__past-pill">Đã qua</span>' : ''}
                </div>
                <h4 class="profile-calendar__event-title">${escapeHtml(ev.title)}</h4>
                <p class="profile-calendar__event-subtitle">${escapeHtml(ev.subtitle)}</p>
                ${detailLinkHtml ? `<div class="profile-calendar__event-actions">${detailLinkHtml}</div>` : ''}
              </li>
            `;
          }).join('')}
        </ul>
      `
      : '<p class="profile-calendar__panel-empty">Không có sự kiện hoặc mốc nộp bài nào vào ngày này.</p>';

    panelEl.innerHTML = `
      <div class="profile-calendar__panel-head">
        <div>
          <h3 class="profile-calendar__panel-title">${escapeHtml(headingText)}</h3>
          <p class="profile-calendar__panel-subtitle">${isToday ? 'Hôm nay (UTC+7)' : 'Chi tiết mốc trong ngày'}</p>
        </div>
        <span class="profile-calendar__panel-count">${dayEvents.length} sự kiện</span>
      </div>
      ${listHtml}
    `;
  }

  /**
   * Render danh sách 5 sự kiện "Sắp tới" gần nhất tính từ hôm nay dưới panel chi tiết ngày.
   * @param {HTMLElement} container Phần tử gốc chứa lịch.
   */
  function renderUpcomingPanel(container) {
    const state = containerStates.get(container);
    const upcomingEl = container.querySelector('.js-calendar-panel-upcoming');
    if (!state || !upcomingEl) return;

    const upcoming = getUpcomingEvents(state.events, state.todayInfo.iso);

    const bodyHtml = upcoming.length > 0
      ? `
        <ul class="profile-calendar__upcoming-list">
          ${upcoming.map(ev => {
            const parts = parseIsoParts(ev.date);
            const dayNum = parts ? String(parts.day).padStart(2, '0') : '--';
            const monthLabel = parts ? `Th${parts.month}` : '';
            const meta = EVENT_META[ev.type] || EVENT_META.deadline;
            const detailLinkHtml = renderDetailLinkHtml(ev);

            return `
              <li class="profile-calendar__upcoming-item">
                <button type="button" class="profile-calendar__upcoming-jump js-calendar-jump" data-date="${escapeHtml(ev.date)}" aria-label="Xem ngày ${escapeHtml(formatDateVi(ev.date))}: ${escapeHtml(ev.title)}">
                  <span class="profile-calendar__upcoming-date" aria-hidden="true">
                    <span class="profile-calendar__upcoming-day">${escapeHtml(dayNum)}</span>
                    <span class="profile-calendar__upcoming-month">${escapeHtml(monthLabel)}</span>
                  </span>
                  <span class="profile-calendar__upcoming-body">
                    <span class="profile-calendar__upcoming-meta">
                      <span class="profile-calendar__type-pill profile-calendar__type-pill--${escapeHtml(ev.type)}">
                        <span aria-hidden="true">${meta.symbol}</span>
                        <span>${escapeHtml(meta.label)}</span>
                      </span>
                    </span>
                    <span class="profile-calendar__upcoming-title">${escapeHtml(ev.title)}</span>
                    <span class="profile-calendar__upcoming-sub">${escapeHtml(ev.subtitle)}</span>
                  </span>
                </button>
                ${detailLinkHtml ? `<div class="profile-calendar__upcoming-footer">${detailLinkHtml}</div>` : ''}
              </li>
            `;
          }).join('')}
        </ul>
      `
      : `
        <p class="profile-calendar__panel-empty">
          Chưa có sự kiện nào sắp diễn ra từ hôm nay.
          <a href="search.html" class="profile-calendar__panel-empty-link">Khám phá thêm hội nghị &rarr;</a>
        </p>
      `;

    upcomingEl.innerHTML = `
      <div class="profile-calendar__panel-head">
        <div>
          <h3 class="profile-calendar__panel-title">Sắp tới</h3>
          <p class="profile-calendar__panel-subtitle">${UPCOMING_LIMIT} mốc gần nhất từ hôm nay</p>
        </div>
        <span class="profile-calendar__panel-count">${upcoming.length}</span>
      </div>
      ${bodyHtml}
    `;
  }

  /**
   * Chuyển tháng hiển thị theo độ lệch delta (+1 hoặc -1), có thể giữ ngày focus hợp lệ.
   * @param {HTMLElement} container Phần tử gốc chứa lịch.
   * @param {number} monthDelta Độ lệch tháng (-1 hoặc +1).
   * @param {boolean} [shouldFocusDay=false] Có di chuyển focus bàn phím vào ngày tương ứng hay không.
   */
  function changeMonth(container, monthDelta, shouldFocusDay = false) {
    const state = containerStates.get(container);
    if (!state) return;

    const baseDate = new Date(Date.UTC(state.viewYear, state.viewMonth - 1 + monthDelta, 1));
    state.viewYear = baseDate.getUTCFullYear();
    state.viewMonth = baseDate.getUTCMonth() + 1;

    const currentFocusParts = parseIsoParts(state.focusedDate);
    const targetDay = currentFocusParts
      ? Math.min(currentFocusParts.day, getDaysInMonth(state.viewYear, state.viewMonth))
      : 1;
    state.focusedDate = formatIsoDate(state.viewYear, state.viewMonth, targetDay);

    renderCalendarGrid(container);

    if (shouldFocusDay) {
      const targetBtn = container.querySelector(`.js-calendar-day[data-date="${state.focusedDate}"]`);
      if (targetBtn instanceof HTMLElement) {
        targetBtn.focus();
      }
    }
  }

  /**
   * Chọn một ngày cụ thể, tự động chuyển tháng nếu ngày nằm ngoài tháng đang xem và cập nhật panel.
   * @param {HTMLElement} container Phần tử gốc chứa lịch.
   * @param {string} isoDate Ngày cần chọn (YYYY-MM-DD).
   * @param {boolean} [shouldFocus=false] Có đặt focus lên ô ngày sau khi chọn hay không.
   */
  function selectDate(container, isoDate, shouldFocus = false) {
    const state = containerStates.get(container);
    const parts = parseIsoParts(isoDate);
    if (!state || !parts) return;

    const monthChanged = state.viewYear !== parts.year || state.viewMonth !== parts.month;
    state.selectedDate = formatIsoDate(parts.year, parts.month, parts.day);
    state.focusedDate = state.selectedDate;

    if (monthChanged) {
      state.viewYear = parts.year;
      state.viewMonth = parts.month;
    }

    renderCalendarGrid(container);
    renderSelectedDayPanel(container);

    if (shouldFocus) {
      const btn = container.querySelector(`.js-calendar-day[data-date="${state.selectedDate}"]`);
      if (btn instanceof HTMLElement) {
        btn.focus();
      }
    }
  }

  /**
   * Di chuyển focus bàn phím đến một ngày mục tiêu (tự chuyển tháng nếu sang tháng khác).
   * @param {HTMLElement} container Phần tử gốc chứa lịch.
   * @param {string} targetIso Ngày đích (YYYY-MM-DD).
   */
  function focusDateCell(container, targetIso) {
    const state = containerStates.get(container);
    const parts = parseIsoParts(targetIso);
    if (!state || !parts) return;

    const normalizedIso = formatIsoDate(parts.year, parts.month, parts.day);
    const needMonthSwitch = state.viewYear !== parts.year || state.viewMonth !== parts.month;
    state.focusedDate = normalizedIso;

    if (needMonthSwitch) {
      state.viewYear = parts.year;
      state.viewMonth = parts.month;
      renderCalendarGrid(container);
    } else {
      container.querySelectorAll('.js-calendar-day').forEach(btn => {
        const isTarget = btn.getAttribute('data-date') === normalizedIso;
        btn.setAttribute('tabindex', isTarget ? '0' : '-1');
      });
    }

    const targetBtn = container.querySelector(`.js-calendar-day[data-date="${normalizedIso}"]`);
    if (targetBtn instanceof HTMLElement) {
      targetBtn.focus();
    }
  }

  /**
   * Gắn các bộ lắng nghe sự kiện ủy quyền (click và điều hướng bàn phím) một lần duy nhất trên container.
   * @param {HTMLElement} container Phần tử gốc chứa lịch.
   */
  function bindCalendarEvents(container) {
    if (!container || container.dataset.calendarBound === 'true') return;
    container.dataset.calendarBound = 'true';

    container.addEventListener('click', event => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      if (target.closest('.js-calendar-prev')) {
        changeMonth(container, -1, false);
        return;
      }

      if (target.closest('.js-calendar-next')) {
        changeMonth(container, 1, false);
        return;
      }

      if (target.closest('.js-calendar-today')) {
        const state = containerStates.get(container);
        if (!state) return;
        state.todayInfo = getVnTodayInfo();
        selectDate(container, state.todayInfo.iso, false);
        return;
      }

      const dayBtn = target.closest('.js-calendar-day');
      if (dayBtn) {
        const dateVal = dayBtn.getAttribute('data-date') || '';
        if (dateVal) {
          selectDate(container, dateVal, true);
        }
        return;
      }

      const jumpBtn = target.closest('.js-calendar-jump');
      if (jumpBtn) {
        const dateVal = jumpBtn.getAttribute('data-date') || '';
        if (dateVal) {
          selectDate(container, dateVal, true);
        }
      }
    });

    container.addEventListener('keydown', event => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const dayBtn = target.closest('.js-calendar-day');
      if (event.key === 'PageUp' || event.key === 'PageDown') {
        event.preventDefault();
        const delta = event.key === 'PageUp' ? -1 : 1;
        changeMonth(container, delta, Boolean(dayBtn));
        return;
      }

      if (!dayBtn) return;
      const currentIso = dayBtn.getAttribute('data-date') || '';
      if (!currentIso) return;

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          focusDateCell(container, addDaysIso(currentIso, -1));
          break;
        case 'ArrowRight':
          event.preventDefault();
          focusDateCell(container, addDaysIso(currentIso, 1));
          break;
        case 'ArrowUp':
          event.preventDefault();
          focusDateCell(container, addDaysIso(currentIso, -7));
          break;
        case 'ArrowDown':
          event.preventDefault();
          focusDateCell(container, addDaysIso(currentIso, 7));
          break;
        case 'Home': {
          event.preventDefault();
          const parts = parseIsoParts(currentIso);
          if (parts) {
            const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
            const weekdayOffset = (d.getUTCDay() + 6) % 7;
            focusDateCell(container, addDaysIso(currentIso, -weekdayOffset));
          }
          break;
        }
        case 'End': {
          event.preventDefault();
          const parts = parseIsoParts(currentIso);
          if (parts) {
            const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
            const weekdayOffset = (d.getUTCDay() + 6) % 7;
            focusDateCell(container, addDaysIso(currentIso, 6 - weekdayOffset));
          }
          break;
        }
        case 'Enter':
          event.preventDefault();
          selectDate(container, currentIso, true);
          break;
        default:
          break;
      }
    });
  }

  /**
   * Hiển thị trạng thái đang tải dữ liệu lịch trong khi fetch conferences.json.
   * @param {HTMLElement} container Phần tử gốc chứa lịch.
   */
  function showLoading(container) {
    if (!container) return;
    container.innerHTML = `
      <div class="profile-calendar__state profile-calendar__state--loading" role="status" aria-live="polite" aria-busy="true">
        Đang tải lịch các mốc hội nghị và Tracker...
      </div>
    `;
  }

  /**
   * Hiển thị trạng thái rỗng thân thiện kèm nút điều hướng sang search.html khi chưa có hội nghị lưu hay mục Tracker.
   * @param {HTMLElement} container Phần tử gốc chứa lịch.
   */
  function renderEmptyState(container) {
    if (!container) return;
    container.innerHTML = `
      <div class="profile-calendar__state">
        <svg class="profile-calendar__empty-icon" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
        <h3 class="profile-calendar__empty-title">Chưa có mốc hội nghị hoặc Tracker nào trên lịch</h3>
        <p class="profile-calendar__empty-desc">
          Bạn chưa lưu hội nghị nào và chưa có mục nào trong Tracker. Hãy khám phá danh mục hội nghị và bấm "Lưu lại" để tự động đồng bộ hạn nộp bài (UTC+7) và ngày diễn ra tại đây.
        </p>
        <div class="profile-calendar__empty-actions">
          <a href="search.html" class="btn btn-primary btn--compact-md">
            <span>Khám phá hội nghị &rarr;</span>
          </a>
        </div>
      </div>
    `;
  }

  /**
   * Dựng khung HTML chính của Lịch (thanh điều hướng, chú thích, lưới tháng T2..CN và panel bên cạnh).
   * @param {HTMLElement} container Phần tử gốc chứa lịch.
   * @param {boolean} showNoDatesNotice Hiển thị ghi chú nếu có hội nghị đã lưu nhưng chưa có ngày công bố.
   */
  function renderCalendarShell(container, showNoDatesNotice) {
    const weekdaysHtml = WEEKDAY_LABELS
      .map(label => `<span class="profile-calendar__weekday">${label}</span>`)
      .join('');

    const noticeHtml = showNoDatesNotice
      ? `
        <div class="profile-calendar__notice" role="status">
          <span>Các hội nghị hoặc mục Tracker hiện có chưa công bố ngày/mốc nộp bài cụ thể.</span>
          <a href="search.html" class="profile-calendar__notice-link">Tìm thêm hội nghị &rarr;</a>
        </div>
      `
      : '';

    container.innerHTML = `
      ${noticeHtml}
      <div class="profile-calendar__layout">
        <div class="profile-calendar__main">
          <div class="profile-calendar__toolbar">
            <div class="profile-calendar__heading" aria-live="polite">
              <h3 class="profile-calendar__month-title js-calendar-month-title"></h3>
            </div>
            <div class="profile-calendar__nav" role="group" aria-label="Điều hướng tháng">
              <button type="button" class="profile-calendar__nav-btn js-calendar-prev" aria-label="Tháng trước" title="Tháng trước (PageUp)">&lsaquo;</button>
              <button type="button" class="profile-calendar__today-btn js-calendar-today">Hôm nay</button>
              <button type="button" class="profile-calendar__nav-btn js-calendar-next" aria-label="Tháng sau" title="Tháng sau (PageDown)">&rsaquo;</button>
            </div>
          </div>

          <div class="profile-calendar__legend" aria-label="Chú thích các loại sự kiện">
            <span class="profile-calendar__legend-item">
              <span class="profile-calendar__legend-badge profile-calendar__legend-badge--deadline">
                <span aria-hidden="true">${EVENT_META.deadline.symbol}</span> ${EVENT_META.deadline.label}
              </span>
              <span>Hạn nộp (UTC+7)</span>
            </span>
            <span class="profile-calendar__legend-item">
              <span class="profile-calendar__legend-badge profile-calendar__legend-badge--event">
                <span aria-hidden="true">${EVENT_META.event.symbol}</span> ${EVENT_META.event.label}
              </span>
              <span>Ngày diễn ra</span>
            </span>
            <span class="profile-calendar__legend-item">
              <span class="profile-calendar__legend-badge profile-calendar__legend-badge--tracker">
                <span aria-hidden="true">${EVENT_META.tracker.symbol}</span> ${EVENT_META.tracker.label}
              </span>
              <span>Tracker của tôi</span>
            </span>
            <span class="profile-calendar__legend-item profile-calendar__legend-item--past">
              <span class="profile-calendar__legend-past-sample">Mờ</span>
              <span>Sự kiện đã qua</span>
            </span>
          </div>

          <div class="profile-calendar__weekdays" aria-hidden="true">
            ${weekdaysHtml}
          </div>
          <div class="profile-calendar__grid js-calendar-grid" role="group" aria-label="Lưới lịch các ngày trong tháng"></div>
        </div>

        <aside class="profile-calendar__panel" aria-label="Chi tiết sự kiện theo ngày và danh sách sắp tới">
          <div class="profile-calendar__panel-card js-calendar-panel-day" aria-live="polite"></div>
          <div class="profile-calendar__panel-card js-calendar-panel-upcoming"></div>
        </aside>
      </div>
    `;
  }

  /**
   * Khởi tạo hoặc cập nhật toàn bộ module Lịch trong container chỉ định.
   * @param {HTMLElement} container Phần tử DOM gốc (#profileCalendarRoot).
   * @param {Object} [data={}] Dữ liệu truyền vào từ profile.js ({ savedConferences, trackerItems, hasAnySources }).
   */
  function init(container, data = {}) {
    if (!container) return;

    const savedConferences = Array.isArray(data.savedConferences) ? data.savedConferences : [];
    const trackerItems = Array.isArray(data.trackerItems) ? data.trackerItems : [];
    const hasAnySources = typeof data.hasAnySources === 'boolean'
      ? data.hasAnySources
      : (savedConferences.length > 0 || trackerItems.length > 0);

    const events = normalizeEvents({ savedConferences, trackerItems });

    if (!hasAnySources && events.length === 0) {
      containerStates.delete(container);
      renderEmptyState(container);
      return;
    }

    const todayInfo = getVnTodayInfo();
    const prevState = containerStates.get(container);

    const state = {
      todayInfo,
      viewYear: prevState ? prevState.viewYear : todayInfo.year,
      viewMonth: prevState ? prevState.viewMonth : todayInfo.month,
      selectedDate: prevState ? prevState.selectedDate : todayInfo.iso,
      focusedDate: prevState ? prevState.focusedDate : todayInfo.iso,
      events,
      eventsByDate: groupEventsByDate(events)
    };

    containerStates.set(container, state);

    renderCalendarShell(container, hasAnySources && events.length === 0);
    renderCalendarGrid(container);
    renderSelectedDayPanel(container);
    renderUpcomingPanel(container);
    bindCalendarEvents(container);
  }

  window.ConfGuideCalendar = {
    init,
    showLoading,
    normalizeEvents,
    convertDeadlineToVnDate: function (dateStr, options) {
      const converted = convertDeadlineToVnHelper(dateStr, options);
      return converted ? converted.vnIsoDate : '';
    }
  };
})();
