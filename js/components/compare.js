/**
 * ConfGuide — Module So sánh Hội nghị Cạnh nhau (js/components/compare.js)
 * Quản lý chọn tối đa 3 hội nghị qua sessionStorage (confguide_compare_ids),
 * hiển thị thanh nổi dưới đáy màn hình (.compare-bar) và hộp thoại bảng đối chiếu
 * 2 chiều (.compare-dialog) theo 3 nhóm / 8 tiêu chí chuẩn múi giờ UTC+7.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'confguide_compare_ids';
  const MAX_COMPARE_ITEMS = 3;

  let memoryIdsFallback = [];
  let conferencesCache = null;
  let conferencesPromise = null;
  const knownNamesMap = new Map();
  const knownConfsMap = new Map();

  let barEl = null;
  let dialogEl = null;
  let lastTriggerEl = null;

  /**
   * Lấy tập hàm tiện ích dùng chung từ window.ConfGuideUtils kèm dự phòng an toàn.
   * @returns {Object} Đối tượng tiện ích chuẩn hóa.
   */
  function getCompareUtils() {
    return window.ConfGuideUtils || {
      MILESTONE_DEFINITIONS: [
        { key: 'abstract', name: 'Nộp tóm tắt (Abstract)', shortName: 'Abstract' },
        { key: 'fullPaper', name: 'Nộp toàn văn (Full Paper)', shortName: 'Full Paper' },
        { key: 'notification', name: 'Thông báo kết quả (Notification)', shortName: 'Notification' },
        { key: 'cameraReady', name: 'Bản hoàn thiện (Camera-Ready)', shortName: 'Camera-Ready' }
      ],
      FALLBACK_CONFERENCES: [],
      escapeHtml: val => String(val ?? ''),
      slugify: text => String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      getConferenceId: c => String((c && c.id) || '').trim().toLowerCase(),
      normalizeConference: c => c,
      convertDeadlineToVn: () => null,
      formatDeadlineVi: d => (d ? `${d} — UTC+7 (giờ Việt Nam)` : 'Chưa công bố'),
      parseDeadlinesList: () => [],
      getCoreMilestones: () => [],
      daysLeft: () => null,
      formatRangeVi: () => '',
      formatConferenceMode: () => 'Chưa cập nhật',
      formatConferenceEventDate: () => 'Chưa cập nhật',
      showToast: () => {}
    };
  }

  /**
   * Chuẩn hóa mã định danh hội nghị về chữ thường, loại bỏ khoảng trắng thừa.
   * @param {string} rawId Mã hội nghị đầu vào.
   * @returns {string} Mã hội nghị chuẩn hóa.
   */
  function normalizeId(rawId) {
    return String(rawId || '').trim().toLowerCase();
  }

  /**
   * Đọc danh sách ID hội nghị đang chọn từ sessionStorage (tối đa 3 ID không trùng).
   * @returns {Array<string>} Mảng ID hội nghị đã chọn.
   */
  function getSelectedIds() {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      const clean = [];
      parsed.forEach(item => {
        const id = normalizeId(item);
        if (id && !clean.includes(id) && clean.length < MAX_COMPARE_ITEMS) {
          clean.push(id);
        }
      });
      memoryIdsFallback = clean.slice();
      return clean;
    } catch (e) {
      return memoryIdsFallback.slice(0, MAX_COMPARE_ITEMS);
    }
  }

  /**
   * Lưu danh sách ID hội nghị đã chọn vào sessionStorage an toàn.
   * @param {Array<string>} ids Mảng ID hội nghị cần lưu.
   * @returns {Array<string>} Mảng ID sau khi chuẩn hóa và giới hạn tối đa 3 phần tử.
   */
  function saveSelectedIds(ids) {
    const clean = [];
    if (Array.isArray(ids)) {
      ids.forEach(item => {
        const id = normalizeId(item);
        if (id && !clean.includes(id) && clean.length < MAX_COMPARE_ITEMS) {
          clean.push(id);
        }
      });
    }
    memoryIdsFallback = clean.slice();
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    } catch (e) {
      // Giữ trong bộ nhớ tạm của trang nếu trình duyệt chặn sessionStorage
    }
    return clean;
  }

  /**
   * Kiểm tra một hội nghị có đang nằm trong danh sách so sánh hay không.
   * @param {string} confId Mã hội nghị.
   * @returns {boolean} True nếu đã được chọn.
   */
  function isSelected(confId) {
    const target = normalizeId(confId);
    if (!target) return false;
    return getSelectedIds().includes(target);
  }

  /**
   * Khởi tạo trước bản đồ tên hội nghị từ FALLBACK_CONFERENCES để thanh nổi luôn có tên hiển thị chuẩn.
   */
  function seedKnownConferencesFromFallback() {
    const utils = getCompareUtils();
    const fallback = Array.isArray(utils.FALLBACK_CONFERENCES) ? utils.FALLBACK_CONFERENCES : [];
    fallback.forEach(raw => {
      const norm = typeof utils.normalizeConference === 'function' ? utils.normalizeConference(raw) : raw;
      if (!norm) return;
      const id = normalizeId(utils.getConferenceId(norm));
      if (!id) return;
      if (!knownNamesMap.has(id) && norm.name) {
        knownNamesMap.set(id, String(norm.name).trim());
      }
      if (!knownConfsMap.has(id)) {
        knownConfsMap.set(id, norm);
      }
    });
  }

  /**
   * Lấy tên hiển thị ngắn gọn của hội nghị theo ID.
   * @param {string} confId Mã hội nghị.
   * @returns {string} Tên hội nghị (ví dụ "SOICT 2026").
   */
  function getDisplayNameById(confId) {
    const id = normalizeId(confId);
    if (knownNamesMap.has(id)) {
      return knownNamesMap.get(id);
    }
    const conf = knownConfsMap.get(id);
    if (conf && conf.name) {
      return String(conf.name).trim();
    }
    return id.toUpperCase();
  }

  /**
   * Sinh chuỗi HTML nút chọn "So sánh" / "Đã chọn" cho một thẻ hoặc hàng hội nghị.
   * Đọc trạng thái trực tiếp từ sessionStorage ngay thời điểm render.
   * @param {Object} conf Đối tượng hội nghị.
   * @returns {string} Chuỗi HTML phần tử <button class="compare-toggle js-compare-toggle">.
   */
  function renderToggleButton(conf) {
    if (!conf || typeof conf !== 'object') return '';
    const utils = getCompareUtils();
    const esc = utils.escapeHtml;
    const rawId = utils.getConferenceId ? utils.getConferenceId(conf) : (conf.id || '');
    const confId = normalizeId(rawId);
    if (!confId) return '';

    const confName = String(conf.name || confId).trim();
    knownNamesMap.set(confId, confName);
    if (conf.deadlines || conf.startDate || conf.start_date || conf.location) {
      const normalizedObj = typeof utils.normalizeConference === 'function' ? utils.normalizeConference(conf) : conf;
      if (normalizedObj) {
        knownConfsMap.set(confId, normalizedObj);
      }
    }

    const selected = getSelectedIds().includes(confId);
    const selectedClass = selected ? ' is-selected' : '';
    const labelText = selected ? 'Đã chọn' : 'So sánh';
    const iconSvg = selected
      ? '<polyline points="20 6 9 17 4 12"></polyline>'
      : '<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>';

    return `
      <button
        type="button"
        class="compare-toggle js-compare-toggle${selectedClass}"
        data-conf-id="${esc(confId)}"
        data-conf-name="${esc(confName)}"
        aria-pressed="${selected ? 'true' : 'false'}"
        aria-label="So sánh hội nghị ${esc(confName)}"
      >
        <svg class="compare-toggle__icon" viewBox="0 0 24 24" aria-hidden="true">${iconSvg}</svg>
        <span class="compare-toggle__label js-compare-toggle-label">${labelText}</span>
      </button>
    `;
  }

  /**
   * Phát thông báo cho trình đọc màn hình qua vùng live status trên thanh so sánh.
   * @param {string} message Nội dung thông báo.
   */
  function announceLiveStatus(message) {
    if (!barEl) return;
    const statusEl = barEl.querySelector('.js-compare-status');
    if (!statusEl) return;
    statusEl.textContent = '';
    window.setTimeout(() => {
      statusEl.textContent = message;
    }, 20);
  }

  /**
   * Đồng bộ trạng thái aria-pressed, class is-selected và nhãn cho toàn bộ nút .js-compare-toggle trên trang.
   */
  function syncToggleButtons() {
    const selectedIds = getSelectedIds();
    const buttons = document.querySelectorAll('.js-compare-toggle');
    buttons.forEach(btn => {
      const confId = normalizeId(btn.getAttribute('data-conf-id'));
      const confName = btn.getAttribute('data-conf-name');
      if (confId && confName) {
        knownNamesMap.set(confId, confName.trim());
      }
      const selected = Boolean(confId && selectedIds.includes(confId));
      btn.classList.toggle('is-selected', selected);
      btn.setAttribute('aria-pressed', selected ? 'true' : 'false');

      const labelEl = btn.querySelector('.js-compare-toggle-label');
      if (labelEl) {
        labelEl.textContent = selected ? 'Đã chọn' : 'So sánh';
      }

      const iconEl = btn.querySelector('.compare-toggle__icon');
      if (iconEl) {
        iconEl.innerHTML = selected
          ? '<polyline points="20 6 9 17 4 12"></polyline>'
          : '<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>';
      }
    });
  }

  /**
   * Khởi tạo phần tử DOM cho thanh nổi dưới đáy màn hình (.compare-bar) một lần duy nhất.
   */
  function ensureCompareBarDom() {
    if (barEl && document.body.contains(barEl)) return;
    barEl = document.querySelector('.js-compare-bar');
    if (barEl) return;

    const section = document.createElement('section');
    section.className = 'compare-bar js-compare-bar';
    section.setAttribute('aria-label', 'Thanh so sánh hội nghị');
    section.hidden = true;
    section.innerHTML = `
      <span class="sr-only js-compare-status" role="status" aria-live="polite"></span>
      <div class="container compare-bar__inner">
        <div class="compare-bar__summary">
          <span class="compare-bar__count js-compare-count">Đã chọn 0/3 hội nghị</span>
          <span class="compare-bar__hint js-compare-hint" hidden>Chọn thêm ít nhất 1 hội nghị</span>
        </div>
        <div class="compare-bar__chips js-compare-chips" aria-label="Danh sách hội nghị đang chọn để so sánh"></div>
        <div class="compare-bar__actions">
          <button type="button" class="compare-bar__clear js-compare-clear">Xóa tất cả</button>
          <button type="button" class="compare-bar__submit js-compare-open" disabled>So sánh ngay</button>
        </div>
      </div>
    `;

    const footerEl = document.getElementById('site-footer');
    if (footerEl && footerEl.parentNode) {
      footerEl.parentNode.insertBefore(section, footerEl);
    } else {
      document.body.appendChild(section);
    }
    barEl = section;
  }

  /**
   * Khởi tạo phần tử DOM cho hộp thoại bảng so sánh (<dialog class="compare-dialog">) một lần duy nhất.
   */
  function ensureCompareDialogDom() {
    if (dialogEl && document.body.contains(dialogEl)) return;
    dialogEl = document.querySelector('.js-compare-dialog');
    if (dialogEl) return;

    const dialog = document.createElement('dialog');
    dialog.className = 'compare-dialog js-compare-dialog';
    dialog.setAttribute('aria-labelledby', 'compareDialogTitle');
    dialog.innerHTML = `
      <div class="compare-dialog__box js-compare-dialog-box">
        <header class="compare-dialog__header">
          <div class="compare-dialog__heading">
            <h2 class="compare-dialog__title" id="compareDialogTitle">Bảng so sánh hội nghị cạnh nhau</h2>
            <p class="compare-dialog__subtitle js-compare-subtitle">Đối chiếu học thuật, thời hạn nộp bài (UTC+7) và thông tin tổ chức</p>
          </div>
          <button type="button" class="compare-dialog__close js-compare-close" aria-label="Đóng bảng so sánh">&times;</button>
        </header>

        <div class="compare-dialog__swipe-hint" aria-hidden="true">
          <span>&larr; Vuốt ngang để xem đủ các cột &rarr;</span>
        </div>

        <div class="compare-dialog__state js-compare-state" role="status" aria-live="polite" hidden></div>

        <div class="compare-dialog__scroll js-compare-scroll" tabindex="0" role="region" aria-label="Bảng đối chiếu hội nghị">
          <table class="compare-table js-compare-table"></table>
        </div>

        <footer class="compare-dialog__footer">
          <p class="compare-dialog__footnote">Lệ phí là thông tin ước tính theo dữ liệu hiện có, vui lòng đối chiếu trên website chính thức.</p>
        </footer>
      </div>
    `;

    document.body.appendChild(dialog);
    dialogEl = dialog;

    // Lắng nghe sự kiện đóng tự nhiên của <dialog> (bao gồm nhấn phím Escape)
    dialogEl.addEventListener('close', () => {
      document.body.classList.remove('is-compare-open');
      restoreFocusAfterDialogClose();
    });

    // Click ra vùng nền mờ (backdrop) bên ngoài .compare-dialog__box để đóng hộp thoại
    dialogEl.addEventListener('click', event => {
      if (event.target === dialogEl) {
        closeDialog();
      }
    });
  }

  /**
   * Trả focus về nút kích hoạt ban đầu sau khi đóng hộp thoại bảng so sánh.
   */
  function restoreFocusAfterDialogClose() {
    if (lastTriggerEl && document.body.contains(lastTriggerEl) && !lastTriggerEl.disabled) {
      try {
        lastTriggerEl.focus();
        return;
      } catch (e) {
        // Bỏ qua nếu phần tử không thể nhận focus
      }
    }
    const fallbackBtn = document.querySelector('.js-compare-toggle.is-selected, .js-compare-toggle');
    if (fallbackBtn instanceof HTMLElement) {
      try {
        fallbackBtn.focus();
      } catch (e) {
        // Bỏ qua
      }
    }
  }

  /**
   * Cập nhật giao diện thanh nổi dưới đáy màn hình dựa trên danh sách ID đang chọn.
   */
  function renderCompareBar() {
    ensureCompareBarDom();
    if (!barEl) return;

    const utils = getCompareUtils();
    const esc = utils.escapeHtml;
    const selectedIds = getSelectedIds();
    const count = selectedIds.length;

    if (count === 0) {
      barEl.hidden = true;
      document.body.classList.remove('has-compare-bar');
      return;
    }

    barEl.hidden = false;
    document.body.classList.add('has-compare-bar');

    const countEl = barEl.querySelector('.js-compare-count');
    if (countEl) {
      countEl.textContent = `Đã chọn ${count}/${MAX_COMPARE_ITEMS} hội nghị`;
    }

    const hintEl = barEl.querySelector('.js-compare-hint');
    if (hintEl) {
      hintEl.hidden = count >= 2;
      hintEl.textContent = 'Chọn thêm ít nhất 1 hội nghị';
    }

    const openBtn = barEl.querySelector('.js-compare-open');
    if (openBtn) {
      openBtn.disabled = count < 2;
    }

    const chipsEl = barEl.querySelector('.js-compare-chips');
    if (chipsEl) {
      chipsEl.innerHTML = selectedIds.map(id => {
        const name = getDisplayNameById(id);
        return `
          <span class="compare-bar__chip">
            <span class="compare-bar__chip-name">${esc(name)}</span>
            <button
              type="button"
              class="compare-bar__chip-remove js-compare-chip-remove"
              data-conf-id="${esc(id)}"
              aria-label="Bỏ chọn hội nghị ${esc(name)}"
              title="Bỏ chọn ${esc(name)}"
            >&times;</button>
          </span>
        `;
      }).join('');
    }
  }

  /**
   * Tải và chuẩn hóa danh sách hội nghị từ data/conferences.json (kèm dự phòng FALLBACK_CONFERENCES).
   * Tự động loại bỏ các ID trong sessionStorage không còn tồn tại trong dữ liệu.
   * @returns {Promise<Array<Object>>} Danh sách hội nghị đã chuẩn hóa.
   */
  async function ensureConferencesLoaded() {
    if (Array.isArray(conferencesCache) && conferencesCache.length > 0) {
      return conferencesCache;
    }
    if (conferencesPromise) {
      return conferencesPromise;
    }

    const utils = getCompareUtils();
    const fallbackList = Array.isArray(utils.FALLBACK_CONFERENCES) ? utils.FALLBACK_CONFERENCES : [];

    conferencesPromise = (async () => {
      let normalizedList = [];
      try {
        const rawData = typeof utils.fetchJsonCached === 'function'
          ? await utils.fetchJsonCached('data/conferences.json')
          : await fetch('data/conferences.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
        if (Array.isArray(rawData) && rawData.length > 0) {
          normalizedList = rawData
            .map(item => (typeof utils.normalizeConference === 'function' ? utils.normalizeConference(item) : item))
            .filter(Boolean);
        }
      } catch (e) {
        normalizedList = fallbackList
          .map(item => (typeof utils.normalizeConference === 'function' ? utils.normalizeConference(item) : item))
          .filter(Boolean);
      }

      if (!normalizedList.length && fallbackList.length) {
        normalizedList = fallbackList
          .map(item => (typeof utils.normalizeConference === 'function' ? utils.normalizeConference(item) : item))
          .filter(Boolean);
      }

      normalizedList.forEach(conf => {
        const id = normalizeId(utils.getConferenceId ? utils.getConferenceId(conf) : conf.id);
        if (!id) return;
        knownConfsMap.set(id, conf);
        if (conf.name) {
          knownNamesMap.set(id, String(conf.name).trim());
        }
      });

      conferencesCache = normalizedList;

      // Nếu ID trong sessionStorage không còn tồn tại trong tập dữ liệu đã tải, tự động loại bỏ
      if (normalizedList.length > 0) {
        const currentIds = getSelectedIds();
        const validIds = currentIds.filter(id => knownConfsMap.has(id));
        if (validIds.length !== currentIds.length) {
          saveSelectedIds(validIds);
          syncToggleButtons();
          renderCompareBar();
        } else if (currentIds.length > 0) {
          renderCompareBar();
        }
      }

      return normalizedList;
    })();

    return conferencesPromise;
  }

  /**
   * Chuẩn hóa chuỗi văn bản để đối chiếu sự khác biệt giữa các cột (trim, gộp khoảng trắng, chữ thường).
   * @param {string} val Chuỗi đầu vào.
   * @returns {string} Chuỗi đã chuẩn hóa.
   */
  function normalizeCompareValue(val) {
    return String(val || '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  /**
   * Tra cứu mốc "Nộp toàn văn (Full Paper)" từ MILESTONE_DEFINITIONS và getCoreMilestones.
   * Tuyệt đối không lấy mốc khác thay thế nếu hội nghị không công bố hạn nộp toàn văn.
   * @param {Object} conf Đối tượng hội nghị.
   * @returns {Object|null} Đối tượng mốc nộp toàn văn hoặc null.
   */
  function getFullPaperMilestone(conf) {
    if (!conf) return null;
    const utils = getCompareUtils();
    const defs = Array.isArray(utils.MILESTONE_DEFINITIONS) ? utils.MILESTONE_DEFINITIONS : [];
    const fullPaperDef = defs.find(d => d.key === 'fullPaper') || { key: 'fullPaper' };
    const targetKey = fullPaperDef.key;

    if (typeof utils.getCoreMilestones === 'function') {
      const coreMilestones = utils.getCoreMilestones(conf);
      const foundCore = coreMilestones.find(m => m && m.key === targetKey && m.date);
      if (foundCore) return foundCore;
    }

    if (typeof utils.parseDeadlinesList === 'function') {
      const allMilestones = utils.parseDeadlinesList(conf.deadlines);
      const foundParsed = allMilestones.find(m => m && m.key === targetKey && m.date);
      if (foundParsed) return foundParsed;
    }

    return null;
  }

  /**
   * Tạo cấu trúc dữ liệu 3 nhóm và 8 tiêu chí cố định theo đúng thứ tự yêu cầu cho các hội nghị được chọn.
   * @param {Array<Object>} confs Danh sách 2–3 đối tượng hội nghị.
   * @returns {Array<Object>} Danh sách nhóm tiêu chí và các dòng dữ liệu đã tính toán.
   */
  function buildComparisonGroups(confs) {
    const utils = getCompareUtils();
    const esc = utils.escapeHtml;

    // Tiền xử lý mốc nộp toàn văn và số ngày còn lại cho từng hội nghị
    const fullPaperList = confs.map(conf => getFullPaperMilestone(conf));
    const daysLeftList = fullPaperList.map(fp => {
      if (!fp || !fp.date || typeof utils.daysLeft !== 'function') return null;
      return utils.daysLeft(fp.date);
    });

    // Xác định cột có hạn nộp toàn văn gần nhất (khi có >= 2 cột còn hạn và số ngày khác nhau)
    const activeDays = daysLeftList.filter(d => d !== null && d >= 0);
    const uniqueActiveDays = new Set(activeDays);
    const shouldHighlightNearest = activeDays.length >= 2 && uniqueActiveDays.size > 1;
    const minActiveDays = shouldHighlightNearest ? Math.min(...activeDays) : null;

    return [
      {
        groupTitle: 'Học thuật',
        rows: [
          {
            label: 'Bậc CORE',
            cells: confs.map(conf => {
              const rawRank = String(conf.rank || '').trim();
              if (!rawRank || /^unranked$/i.test(rawRank)) {
                return {
                  html: '<span class="compare-table__muted">Chưa cập nhật</span>',
                  normVal: ''
                };
              }
              const displayRank = /^core\b/i.test(rawRank) ? rawRank : `CORE ${rawRank}`;
              return {
                html: `<span class="compare-table__rank-badge">${esc(displayRank)}</span>`,
                normVal: normalizeCompareValue(displayRank)
              };
            })
          },
          {
            label: 'Lĩnh vực nghiên cứu',
            cells: confs.map(conf => {
              const fields = Array.isArray(conf.fields)
                ? conf.fields.map(f => String(f || '').trim()).filter(Boolean)
                : [];
              if (!fields.length) {
                return {
                  html: '<span class="compare-table__muted">Chưa cập nhật</span>',
                  normVal: ''
                };
              }
              const itemsHtml = fields
                .map(field => `<li class="compare-table__tag">${esc(field)}</li>`)
                .join('');
              const comparable = fields.map(f => normalizeCompareValue(f)).sort().join('|');
              return {
                html: `<ul class="compare-table__tags">${itemsHtml}</ul>`,
                normVal: comparable
              };
            })
          },
          {
            label: 'Nhà xuất bản',
            cells: confs.map(conf => {
              const pub = String(conf.publisher || '').trim();
              if (!pub) {
                return {
                  html: '<span class="compare-table__muted">Chưa cập nhật</span>',
                  normVal: ''
                };
              }
              return {
                html: `<span>${esc(pub)}</span>`,
                normVal: normalizeCompareValue(pub)
              };
            })
          }
        ]
      },
      {
        groupTitle: 'Thời hạn (UTC+7)',
        rows: [
          {
            label: 'Hạn nộp toàn văn',
            cells: confs.map((conf, idx) => {
              const fp = fullPaperList[idx];
              if (!fp || !fp.date) {
                return {
                  html: '<span class="compare-table__muted">Chưa công bố</span>',
                  normVal: ''
                };
              }
              const converted = typeof utils.convertDeadlineToVn === 'function'
                ? utils.convertDeadlineToVn(fp.date, { isDeadline: true })
                : null;
              const formattedText = typeof utils.formatDeadlineVi === 'function'
                ? utils.formatDeadlineVi(fp.date)
                : (converted ? converted.displayText : fp.date);
              const datetimeAttr = converted && converted.vnIsoDate ? converted.vnIsoDate : fp.date;
              return {
                html: `<time datetime="${esc(datetimeAttr)}">${esc(formattedText)}</time>`,
                normVal: normalizeCompareValue(formattedText)
              };
            })
          },
          {
            label: 'Số ngày còn lại',
            cells: confs.map((conf, idx) => {
              const d = daysLeftList[idx];
              if (d === null || d === undefined) {
                return {
                  html: '<span class="compare-table__muted">Chưa công bố</span>',
                  normVal: ''
                };
              }
              if (d < 0) {
                return {
                  html: '<span class="compare-table__days compare-table__days--passed">Đã qua hạn</span>',
                  normVal: 'đã qua hạn'
                };
              }
              const isNearest = shouldHighlightNearest && d === minActiveDays;
              const nearestBadge = isNearest
                ? '<span class="compare-table__nearest-badge">Gần nhất</span>'
                : '';
              const textVal = `Còn ${d} ngày`;
              const statusMod = d <= 14 ? 'urgent' : 'open';
              return {
                html: `<div class="compare-table__days-wrap"><span class="compare-table__days compare-table__days--${statusMod}">${esc(textVal)}</span>${nearestBadge}</div>`,
                normVal: normalizeCompareValue(textVal)
              };
            })
          }
        ]
      },
      {
        groupTitle: 'Tổ chức',
        rows: [
          {
            label: 'Ngày tổ chức',
            cells: confs.map(conf => {
              const dateText = typeof utils.formatConferenceEventDate === 'function'
                ? utils.formatConferenceEventDate(conf)
                : 'Chưa cập nhật';
              if (!dateText || dateText === 'Chưa cập nhật') {
                return {
                  html: '<span class="compare-table__muted">Chưa cập nhật</span>',
                  normVal: ''
                };
              }
              return {
                html: `<span>${esc(dateText)}</span>`,
                normVal: normalizeCompareValue(dateText)
              };
            })
          },
          {
            label: 'Hình thức / địa điểm',
            cells: confs.map(conf => {
              const modeText = typeof utils.formatConferenceMode === 'function'
                ? utils.formatConferenceMode(conf)
                : 'Chưa cập nhật';
              const locParts = [conf.location, conf.country]
                .map(v => String(v || '').trim())
                .filter(Boolean);
              const uniqueLoc = [...new Set(locParts)].join(', ') || 'Chưa cập nhật';

              if (modeText === 'Chưa cập nhật' && uniqueLoc === 'Chưa cập nhật') {
                return {
                  html: '<span class="compare-table__muted">Chưa cập nhật</span>',
                  normVal: ''
                };
              }

              return {
                html: `
                  <span class="compare-table__mode">${esc(modeText)}</span>
                  <span class="compare-table__loc">${esc(uniqueLoc)}</span>
                `,
                normVal: normalizeCompareValue(`${modeText} | ${uniqueLoc}`)
              };
            })
          },
          {
            label: 'Lệ phí ước tính',
            cells: confs.map(conf => {
              const rawFee = String(conf.fee || '').trim();
              if (!rawFee) {
                return {
                  html: '<span class="compare-table__muted">Chưa cập nhật</span>',
                  normVal: ''
                };
              }
              return {
                html: `<span>${esc(rawFee)}</span>`,
                normVal: normalizeCompareValue(rawFee)
              };
            })
          }
        ]
      }
    ];
  }

  /**
   * Hiển thị trạng thái đang tải hoặc thông báo lỗi bên trong hộp thoại so sánh.
   * @param {'loading'|'error'|'table'} mode Chế độ hiển thị trong hộp thoại.
   * @param {string} [message=''] Thông điệp trạng thái.
   */
  function setDialogViewState(mode, message = '') {
    if (!dialogEl) return;
    const stateEl = dialogEl.querySelector('.js-compare-state');
    const scrollEl = dialogEl.querySelector('.js-compare-scroll');

    if (mode === 'table') {
      if (stateEl) {
        stateEl.hidden = true;
        stateEl.textContent = '';
        stateEl.classList.remove('compare-dialog__state--error');
      }
      if (scrollEl) scrollEl.hidden = false;
      return;
    }

    if (scrollEl) scrollEl.hidden = true;
    if (stateEl) {
      stateEl.hidden = false;
      stateEl.textContent = message;
      stateEl.classList.toggle('compare-dialog__state--error', mode === 'error');
    }
  }

  /**
   * Dựng bảng đối chiếu 2 chiều bên trong <dialog> theo danh sách hội nghị đang chọn.
   */
  async function renderDialogTable() {
    ensureCompareDialogDom();
    if (!dialogEl) return;

    const selectedIds = getSelectedIds();
    if (selectedIds.length < 2) {
      setDialogViewState('error', 'Cần chọn ít nhất 2 hội nghị để hiển thị bảng đối chiếu.');
      return;
    }

    if (!conferencesCache) {
      setDialogViewState('loading', 'Đang tải dữ liệu so sánh...');
    }

    await ensureConferencesLoaded();

    const validConfs = getSelectedIds()
      .map(id => knownConfsMap.get(id))
      .filter(Boolean);

    if (validConfs.length < 2) {
      setDialogViewState(
        'error',
        'Không tìm thấy đủ tối thiểu 2 hội nghị hợp lệ từ dữ liệu hiện có để đối chiếu.'
      );
      return;
    }

    const utils = getCompareUtils();
    const esc = utils.escapeHtml;
    const totalCols = validConfs.length + 1;
    const groups = buildComparisonGroups(validConfs);

    const headColsHtml = validConfs.map(conf => {
      const confId = normalizeId(utils.getConferenceId ? utils.getConferenceId(conf) : conf.id);
      const shortName = String(conf.name || confId).trim();
      const fullName = String(conf.fullName || conf.full_name || '').trim();
      return `
        <th scope="col" class="compare-table__conf-head">
          <div class="compare-table__conf-top">
            <a class="compare-table__conf-link" href="detail.html?id=${encodeURIComponent(confId)}">
              ${esc(shortName)}
            </a>
            <button
              type="button"
              class="compare-table__remove-btn js-compare-remove"
              data-conf-id="${esc(confId)}"
              aria-label="Bỏ hội nghị ${esc(shortName)} khỏi bảng so sánh"
            >
              Bỏ khỏi so sánh
            </button>
          </div>
          ${fullName && fullName !== shortName
            ? `<p class="compare-table__conf-fullname" title="${esc(fullName)}">${esc(fullName)}</p>`
            : ''}
        </th>
      `;
    }).join('');

    const tbodiesHtml = groups.map(group => {
      const rowsHtml = group.rows.map(row => {
        const allEmpty = row.cells.every(c => !c.normVal);
        const uniqueVals = new Set(row.cells.map(c => c.normVal || '__missing__'));
        const isDiff = !allEmpty && uniqueVals.size > 1;
        const rowClass = isDiff ? 'compare-table__row compare-table__row--diff' : 'compare-table__row';
        const diffBadgeHtml = isDiff
          ? '<span class="compare-table__diff-badge">Khác nhau</span>'
          : '';

        const cellsHtml = row.cells
          .map(cell => `<td class="compare-table__cell">${cell.html}</td>`)
          .join('');

        return `
          <tr class="${rowClass}">
            <th scope="row" class="compare-table__criterion">
              <div class="compare-table__criterion-wrap">
                <span>${esc(row.label)}</span>
                ${diffBadgeHtml}
              </div>
            </th>
            ${cellsHtml}
          </tr>
        `;
      }).join('');

      return `
        <tbody class="compare-table__group">
          <tr class="compare-table__group-row">
            <th colspan="${totalCols}">${esc(group.groupTitle)}</th>
          </tr>
          ${rowsHtml}
        </tbody>
      `;
    }).join('');

    const tableEl = dialogEl.querySelector('.js-compare-table');
    if (tableEl) {
      tableEl.innerHTML = `
        <caption class="sr-only">
          Bảng đối chiếu chi tiết ${validConfs.length} hội nghị khoa học theo các tiêu chí học thuật, thời hạn nộp bài (UTC+7) và tổ chức
        </caption>
        <thead>
          <tr>
            <th scope="col" class="compare-table__corner">Tiêu chí</th>
            ${headColsHtml}
          </tr>
        </thead>
        ${tbodiesHtml}
      `;
    }

    setDialogViewState('table');
  }

  /**
   * Mở hộp thoại bảng so sánh hội nghị cạnh nhau.
   * @param {HTMLElement|null} [triggerEl=null] Phần tử nút vừa kích hoạt mở hộp thoại.
   */
  async function openDialog(triggerEl = null) {
    const selectedIds = getSelectedIds();
    const utils = getCompareUtils();

    if (selectedIds.length < 2) {
      utils.showToast('Cần ít nhất 2 hội nghị để đối chiếu. Hãy chọn thêm hội nghị khác.', 'info');
      announceLiveStatus('Cần ít nhất 2 hội nghị để đối chiếu.');
      return;
    }

    ensureCompareDialogDom();
    if (!dialogEl) return;

    lastTriggerEl = triggerEl instanceof HTMLElement
      ? triggerEl
      : (document.activeElement instanceof HTMLElement ? document.activeElement : null);

    if (!dialogEl.open) {
      if (typeof dialogEl.showModal === 'function') {
        dialogEl.showModal();
      } else {
        dialogEl.setAttribute('open', '');
      }
    }
    document.body.classList.add('is-compare-open');

    await renderDialogTable();

    const closeBtn = dialogEl.querySelector('.js-compare-close');
    if (closeBtn instanceof HTMLElement) {
      closeBtn.focus();
    }
  }

  /**
   * Đóng hộp thoại bảng so sánh hội nghị.
   */
  function closeDialog() {
    if (!dialogEl) return;
    if (dialogEl.open) {
      if (typeof dialogEl.close === 'function') {
        dialogEl.close();
      } else {
        dialogEl.removeAttribute('open');
        document.body.classList.remove('is-compare-open');
        restoreFocusAfterDialogClose();
      }
    } else {
      document.body.classList.remove('is-compare-open');
    }
  }

  /**
   * Bật/tắt trạng thái chọn một hội nghị vào danh sách so sánh (tối đa 3 hội nghị).
   * @param {string} rawId Mã hội nghị.
   * @param {string} [optName=''] Tên hiển thị của hội nghị.
   * @returns {boolean} True nếu hội nghị đang ở trạng thái được chọn sau thao tác.
   */
  function toggleConference(rawId, optName = '') {
    const confId = normalizeId(rawId);
    if (!confId) return false;

    if (optName) {
      knownNamesMap.set(confId, String(optName).trim());
    }

    const utils = getCompareUtils();
    const current = getSelectedIds();
    const exists = current.includes(confId);
    const displayName = getDisplayNameById(confId);

    if (exists) {
      const next = current.filter(id => id !== confId);
      saveSelectedIds(next);
      syncAllUi();
      announceLiveStatus(`Đã bỏ chọn hội nghị ${displayName}. Đang chọn ${next.length} trên 3 hội nghị.`);
      return false;
    }

    if (current.length >= MAX_COMPARE_ITEMS) {
      const limitMsg = 'Chỉ có thể so sánh tối đa 3 hội nghị cùng lúc. Hãy bỏ bớt 1 hội nghị để chọn mới.';
      utils.showToast(limitMsg, 'info');
      announceLiveStatus(limitMsg);
      syncToggleButtons();
      return false;
    }

    const next = [...current, confId];
    saveSelectedIds(next);
    syncAllUi();
    announceLiveStatus(`Đã thêm hội nghị ${displayName} vào danh sách so sánh (${next.length}/3).`);
    return true;
  }

  /**
   * Xóa một hội nghị khỏi danh sách so sánh (từ chip trên thanh nổi hoặc nút trong bảng).
   * @param {string} rawId Mã hội nghị cần xóa.
   * @param {boolean} [fromInsideDialog=false] True nếu thao tác xóa diễn ra ngay trong bảng <dialog>.
   */
  function removeConference(rawId, fromInsideDialog = false) {
    const confId = normalizeId(rawId);
    if (!confId) return;

    const utils = getCompareUtils();
    const displayName = getDisplayNameById(confId);
    const next = getSelectedIds().filter(id => id !== confId);
    saveSelectedIds(next);
    syncToggleButtons();
    renderCompareBar();

    if (fromInsideDialog && dialogEl && dialogEl.open) {
      if (next.length < 2) {
        closeDialog();
        const minMsg = 'Cần ít nhất 2 hội nghị để đối chiếu. Hãy chọn thêm hội nghị khác.';
        utils.showToast(minMsg, 'info');
        announceLiveStatus(minMsg);
        return;
      }
      renderDialogTable().then(() => {
        if (dialogEl && dialogEl.open) {
          const closeBtn = dialogEl.querySelector('.js-compare-close');
          if (closeBtn instanceof HTMLElement) closeBtn.focus();
        }
      });
    }

    announceLiveStatus(`Đã bỏ hội nghị ${displayName} khỏi danh sách so sánh.`);
  }

  /**
   * Xóa toàn bộ hội nghị khỏi danh sách so sánh.
   */
  function clearAll() {
    saveSelectedIds([]);
    if (dialogEl && dialogEl.open) {
      closeDialog();
    }
    syncToggleButtons();
    renderCompareBar();
    announceLiveStatus('Đã xóa tất cả hội nghị khỏi thanh so sánh.');
  }

  /**
   * Đồng bộ toàn bộ giao diện (các nút trên thẻ, thanh nổi và bảng nếu đang mở).
   */
  function syncAllUi() {
    syncToggleButtons();
    renderCompareBar();
    if (dialogEl && dialogEl.open) {
      const current = getSelectedIds();
      if (current.length < 2) {
        closeDialog();
      } else {
        renderDialogTable();
      }
    }
  }

  /**
   * Thiết lập lắng nghe sự kiện ủy quyền (Event Delegation) trên toàn tài liệu.
   */
  function setupCompareEvents() {
    document.addEventListener('click', event => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      // 1. Bấm nút "So sánh" / "Đã chọn" trên thẻ hoặc hàng hội nghị
      const toggleBtn = target.closest('.js-compare-toggle');
      if (toggleBtn) {
        event.preventDefault();
        event.stopPropagation();
        const confId = toggleBtn.getAttribute('data-conf-id') || '';
        const confName = toggleBtn.getAttribute('data-conf-name') || '';
        toggleConference(confId, confName);
        return;
      }

      // 2. Bấm nút "×" trên chip của thanh nổi
      const chipRemoveBtn = target.closest('.js-compare-chip-remove');
      if (chipRemoveBtn) {
        event.preventDefault();
        const confId = chipRemoveBtn.getAttribute('data-conf-id') || '';
        removeConference(confId, false);
        return;
      }

      // 3. Bấm nút "Xóa tất cả" trên thanh nổi
      if (target.closest('.js-compare-clear')) {
        event.preventDefault();
        clearAll();
        return;
      }

      // 4. Bấm nút "So sánh ngay" trên thanh nổi
      const openBtn = target.closest('.js-compare-open');
      if (openBtn) {
        event.preventDefault();
        if (openBtn instanceof HTMLElement && !openBtn.disabled) {
          openDialog(openBtn);
        }
        return;
      }

      // 5. Bấm nút đóng hộp thoại bảng so sánh
      if (target.closest('.js-compare-close')) {
        event.preventDefault();
        closeDialog();
        return;
      }

      // 6. Bấm nút "Bỏ khỏi so sánh" ở đầu cột bên trong bảng <dialog>
      const colRemoveBtn = target.closest('.js-compare-remove');
      if (colRemoveBtn) {
        event.preventDefault();
        const confId = colRemoveBtn.getAttribute('data-conf-id') || '';
        removeConference(confId, true);
      }
    });

    // Đồng bộ lại trạng thái khi quay lại trang từ lịch sử duyệt web (bfcache)
    window.addEventListener('pageshow', () => {
      syncAllUi();
    });
  }

  /**
   * Khởi tạo module so sánh hội nghị khi DOM sẵn sàng.
   */
  function initCompareModule() {
    seedKnownConferencesFromFallback();
    ensureCompareBarDom();
    ensureCompareDialogDom();
    setupCompareEvents();
    syncAllUi();

    // Nếu đã có hội nghị lưu trong sessionStorage từ trang trước, nạp dữ liệu để đồng bộ tên và kiểm tra ID hợp lệ
    if (getSelectedIds().length > 0) {
      ensureConferencesLoaded();
    }
  }

  // Xuất API dùng chung để các trang render nút So sánh và đồng bộ trạng thái
  window.ConfGuideCompare = {
    renderToggleButton: renderToggleButton,
    getSelectedIds: getSelectedIds,
    isSelected: isSelected,
    toggleConference: toggleConference,
    removeConference: removeConference,
    clearAll: clearAll,
    openDialog: openDialog,
    closeDialog: closeDialog,
    syncAllUi: syncAllUi
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCompareModule);
  } else {
    initCompareModule();
  }
})();
