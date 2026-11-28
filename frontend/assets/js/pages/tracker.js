/**
 * ConfGuide — Kịch bản Trang Theo dõi Hội nghị (js/pages/tracker.js)
 * Trang sử dụng: tracker.html
 * Phụ thuộc: js/core/layout.js (window.ConfGuideUtils), js/components/compare.js
 * Chức năng: Nạp dữ liệu hội nghị, tính hạn nộp gần nhất theo UTC+7,
 * render bảng theo dõi cá nhân và xử lý xóa / đồng bộ giữa các tab.
 */

(function () {
  'use strict';

  /* ================= 1. HẰNG SỐ & CẤU HÌNH ================= */

  /** Đường dẫn tệp dữ liệu hội nghị tĩnh */
  const CONFERENCES_DATA_URL = 'data/conference_data.json';

  /** Ngưỡng số ngày đánh dấu trạng thái hạn nộp khẩn cấp */
  const URGENT_DEADLINE_DAYS = 14;

  /* ================= 2. HÀM HỖ TRỢ DỮ LIỆU & STORAGE ================= */

  /**
   * Lấy tham chiếu tới tiện ích dùng chung window.ConfGuideUtils.
   * @returns {Object|null} Đối tượng ConfGuideUtils hoặc null nếu chưa tải.
   */
  function getUtils() {
    return window.ConfGuideUtils || null;
  }

  /**
   * Đọc giá trị JSON từ localStorage kèm fallback an toàn.
   * @param {string} key Khóa lưu trữ.
   * @param {*} fallback Giá trị mặc định.
   * @returns {*} Dữ liệu đã parse hoặc fallback.
   */
  function read(key, fallback) {
    const utils = getUtils();
    if (utils && utils.readStorage) return utils.readStorage(key, fallback);
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch (e) {
      return fallback;
    }
  }

  /**
   * Lấy thông tin người dùng hiện tại đã xác thực.
   * @returns {Object|null} Đối tượng user hợp lệ hoặc null nếu chưa đăng nhập.
   */
  function currentUser() {
    const utils = getUtils();
    if (utils && typeof utils.getAuthenticatedUser === 'function') {
      return utils.getAuthenticatedUser();
    }
    const user = read('confguide_current_user', null);
    if (!user || typeof user !== 'object') return null;
    return (user.id || user.email || user.username) ? user : null;
  }

  /**
   * Xác định khóa lưu danh sách hội nghị đã lưu của người dùng đã đăng nhập.
   * Trả về chuỗi rỗng nếu chưa đăng nhập (không sử dụng khóa cho khách).
   * @returns {string} Khóa localStorage hoặc chuỗi rỗng.
   */
  function savedKey() {
    const utils = getUtils();
    if (utils && typeof utils.getSavedStorageKey === 'function') {
      return utils.getSavedStorageKey(true);
    }
    const user = currentUser();
    return user && (user.id || user.email || user.username)
      ? `confguide_saved_${user.id || user.email || user.username}`
      : '';
  }

  /**
   * Lấy mảng mã hội nghị đã lưu của người dùng hiện tại (luôn trả về [] nếu chưa đăng nhập).
   * @returns {Array<string>} Danh sách ID hội nghị đã lưu.
   */
  function getSaved() {
    const utils = getUtils();
    if (utils && typeof utils.getSavedConferenceIds === 'function') {
      return utils.getSavedConferenceIds(true);
    }
    const key = savedKey();
    if (!key) return [];
    const scoped = read(key, []);
    return Array.isArray(scoped) ? scoped : [];
  }

  /**
   * Lưu lại danh sách hội nghị vào localStorage kèm kiểm tra quyền truy cập.
   * Từ chối thao tác nếu người dùng chưa đăng nhập.
   * @param {Array<string>} ids Danh sách mã hội nghị.
   * @returns {boolean} True nếu cập nhật thành công.
   */
  function setSaved(ids) {
    const utils = getUtils();
    if (!currentUser()) {
      if (utils && typeof utils.promptLoginForTracking === 'function') {
        utils.promptLoginForTracking({ redirectUrl: 'tracker.html' });
      }
      return false;
    }
    if (utils && typeof utils.setSavedConferenceIds === 'function') {
      return utils.setSavedConferenceIds(ids, true);
    }
    const key = savedKey();
    if (!key) return false;
    const ok = utils && utils.writeStorage ? utils.writeStorage(key, ids) : false;
    if (!ok) {
      try {
        localStorage.setItem(key, JSON.stringify(ids));
        return true;
      } catch (e) {
        if (utils && utils.showToast) {
          utils.showToast('Không thể cập nhật danh sách trong bộ nhớ trình duyệt.', 'error');
        }
        return false;
      }
    }
    return true;
  }

  /**
   * Lấy tập dữ liệu hội nghị hiện có (từ JSON đã nạp hoặc fallback chuẩn hóa).
   * @returns {Array<Object>}
   */
  function allConferences() {
    const utils = getUtils();
    return window.ConfGuideTrackerConferences || (utils && utils.FALLBACK_CONFERENCES) || [];
  }

  /**
   * Trích xuất thông tin hạn nộp gần nhất cho từng dòng bảng theo dõi.
   * @param {Object} conf Đối tượng hội nghị.
   * @returns {{ date: string, remaining: string }}
   */
  function getDeadlineSummary(conf) {
    const utils = getUtils();
    const next = utils && utils.getNextDeadline ? utils.getNextDeadline(conf) : null;
    if (!next) return { date: 'Chưa cập nhật', remaining: '', status: 'closed' };

    const date = utils.formatDeadlineVi
      ? utils.formatDeadlineVi(next.date)
      : (utils.formatDateVi ? utils.formatDateVi(next.date) : next.date);
    const daysLeft = next.daysLeft === null || next.daysLeft === undefined ? NaN : Number(next.daysLeft);
    const remaining = Number.isFinite(daysLeft)
      ? (daysLeft >= 0 ? `Còn ${daysLeft} ngày` : `Đã quá hạn ${Math.abs(daysLeft)} ngày`)
      : '';
    const status = Number.isFinite(daysLeft)
      ? (daysLeft < 0 ? 'closed' : (daysLeft <= URGENT_DEADLINE_DAYS ? 'urgent' : 'open'))
      : 'closed';
    return { date, remaining, status };
  }

  /* ================= 3. HÀM RENDER & XỬ LÝ SỰ KIỆN ================= */

  /**
   * Tạo mã HTML cho một dòng hội nghị trong bảng theo dõi.
   * @param {Object} conf - Đối tượng hội nghị chuẩn hóa.
   * @param {Object|null} utils - Đối tượng ConfGuideUtils.
   * @returns {string} Chuỗi HTML thẻ `<tr>`.
   */
  function buildTrackerRowHtml(conf, utils) {
    const esc = utils && utils.escapeHtml ? utils.escapeHtml : val => String(val ?? '');
    const confId = utils && utils.getConferenceId ? utils.getConferenceId(conf) : String(conf.id || '');
    const topicList = utils && typeof utils.extractTopicLabels === 'function'
      ? utils.extractTopicLabels(conf)
      : (Array.isArray(conf.fields) ? conf.fields : []);
    const fields = topicList.slice(0, 3).map(f => `<span class="tag">${esc(f)}</span>`).join('');
    const badgeLabel = esc(conf.acronym || conf.short_name || (conf.name ? conf.name.slice(0, 4) : 'CG'));
    const nearest = getDeadlineSummary(conf);
    const compareBtnHtml = window.ConfGuideCompare ? window.ConfGuideCompare.renderToggleButton(conf) : '';
    const avatarHtml = utils && utils.renderConferenceAvatar
      ? utils.renderConferenceAvatar(conf, 'tracker-avatar')
      : `<div class="conf-badge-logo tracker-avatar" aria-hidden="true">${badgeLabel.toUpperCase()}</div>`;
    const remainingHtml = nearest.remaining
      ? `<div class="deadline-remaining deadline-remaining--${esc(nearest.status)}">${esc(nearest.remaining)}</div>`
      : '';

    return `<tr>
        <td>
          <div class="conference-name">
            ${avatarHtml}
            <div class="name-text">
              <a href="detail.html?id=${encodeURIComponent(confId)}">${esc(conf.name || confId)}</a>
            </div>
          </div>
        </td>
        <td><div class="tags">${fields || '<span class="tag">Chưa cập nhật</span>'}</div></td>
        <td><div class="deadline-cell"><div class="deadline">${esc(nearest.date)}</div>${remainingHtml}</div></td>
        <td>
          <div class="actions">
            ${compareBtnHtml}
            <button class="action-btn delete" type="button" data-remove="${esc(confId)}">Xóa</button>
          </div>
        </td>
      </tr>`;
  }

  /**
   * Hiển thị bảng danh sách hội nghị đang theo dõi hoặc thông báo yêu cầu đăng nhập nếu là khách.
   */
  function render() {
    const tbody = document.getElementById('conferenceBody');
    const count = document.getElementById('totalCount');
    if (!tbody) return;

    const user = currentUser();
    if (!user) {
      if (count) count.textContent = '0';
      tbody.innerHTML =
        '<tr><td colspan="4" class="tracker-empty">'
        + '<p class="tracker-auth-msg">'
        + 'Chỉ người dùng đã đăng nhập mới có thể theo dõi hội nghị'
        + ' và quản lý danh sách theo dõi.'
        + '</p>'
        + '<a class="primary-btn tracker-auth-btn"'
        + ' href="login.html?redirect=tracker.html">Đăng nhập để theo dõi</a>'
        + '</td></tr>';
      return;
    }

    const utils = getUtils();
    const ids = getSaved();
    const conferences = allConferences();

    const rows = ids.map(id => {
      const targetId = String(id);
      return conferences.find(c => {
        const cid = utils && utils.getConferenceId ? utils.getConferenceId(c) : String(c.id || '');
        return cid === targetId || c.name === targetId;
      }) || { id: targetId, name: targetId };
    });

    if (count) count.textContent = String(rows.length);

    if (!rows.length) {
      tbody.innerHTML =
        '<tr><td colspan="4" class="tracker-empty">'
        + 'Bạn chưa lưu hội nghị nào. Hãy tìm hội nghị phù hợp và nhấn “Lưu lại” để theo dõi tại đây.'
        + '</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(conf => buildTrackerRowHtml(conf, utils)).join('');
  }

  /**
   * Xử lý sự kiện nhấn nút Xóa khỏi danh sách theo dõi bằng Event Delegation trên `tbody`.
   * Kiểm tra xác thực trước khi cho phép xóa để người chưa đăng nhập không thể thao tác dữ liệu.
   * @param {MouseEvent} event - Sự kiện click trên bảng.
   * @param {HTMLElement} tbody - Phần tử `<tbody>` của bảng theo dõi.
   */
  function handleTrackerTableClick(event, tbody) {
    const btn = event.target instanceof Element ? event.target.closest('[data-remove]') : null;
    if (!btn || !tbody.contains(btn)) return;

    const utils = getUtils();
    if (!currentUser()) {
      if (utils && typeof utils.promptLoginForTracking === 'function') {
        utils.promptLoginForTracking({ redirectUrl: 'tracker.html' });
      }
      return;
    }

    const targetId = btn.dataset.remove;
    if (!setSaved(getSaved().filter(item => String(item) !== targetId))) return;
    render();

    if (utils && utils.showToast) {
      utils.showToast('Đã xóa hội nghị khỏi danh sách theo dõi.', 'info');
    }
  }

  /* ================= 4. KHỞI TẠO TRANG ================= */

  /**
   * Nạp dữ liệu hội nghị từ JSON và khởi tạo sự kiện đồng bộ giữa các tab.
   * @returns {Promise<void>}
   */
  async function initTracker() {
    const tbody = document.getElementById('conferenceBody');
    if (!tbody) return;

    const utils = getUtils();
    const normalize = utils && utils.normalizeConference ? utils.normalizeConference : item => item;

    // Event delegation một lần trên tbody thay vì gắn lại listener cho từng hàng sau mỗi lần render
    tbody.addEventListener('click', event => handleTrackerTableClick(event, tbody));

    tbody.innerHTML =
      '<tr class="loading-row"><td colspan="4" class="loading-row">'
      + 'Đang tải dữ liệu hội nghị...'
      + '</td></tr>';

    try {
      const data = utils && typeof utils.fetchJsonCached === 'function'
        ? await utils.fetchJsonCached(CONFERENCES_DATA_URL)
        : await fetch(CONFERENCES_DATA_URL).then(r => {
          if (!r.ok) throw new Error(r.status);
          return r.json();
        });
      if (Array.isArray(data) && data.length > 0) {
        window.ConfGuideTrackerConferences = data.map(normalize).filter(Boolean);
      }
    } catch (e) {
      // Sử dụng dữ liệu dự phòng từ ConfGuideUtils khi chạy ngoại tuyến
    }

    render();

    window.addEventListener('pageshow', render);
    window.addEventListener('storage', event => {
      if (!event.key || event.key === 'confguide_current_user' || event.key === savedKey()) render();
    });
  }

  document.addEventListener('DOMContentLoaded', initTracker);
})();
