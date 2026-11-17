/**
 * ConfGuide - Kịch bản Trang Theo dõi Hội nghị (js/tracker.js)
 * Hiển thị danh sách hội nghị người dùng đã lưu, tính hạn nộp gần nhất
 * và cho phép xóa hội nghị khỏi danh sách theo dõi.
 */

(function () {
  'use strict';

  /**
   * Lấy tham chiếu tới tiện ích dùng chung window.ConfGuideUtils.
   * @returns {Object|null}
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
   * Lấy thông tin người dùng hiện tại.
   * @returns {Object|null}
   */
  function currentUser() {
    return read('confguide_current_user', null);
  }

  /**
   * Xác định khóa lưu danh sách hội nghị đã lưu của phiên hiện tại.
   * @returns {string}
   */
  function savedKey() {
    const user = currentUser();
    return user && (user.id || user.email) ? `confguide_saved_${user.id || user.email}` : 'confguide_saved_guest';
  }

  /**
   * Lấy mảng mã hội nghị đã lưu (hỗ trợ các khóa cũ để giữ tương thích).
   * @returns {Array<string>}
   */
  function getSaved() {
    const scoped = read(savedKey(), null);
    if (Array.isArray(scoped)) return scoped;
    const legacy = read('confguide_saved', null);
    if (Array.isArray(legacy)) return legacy;
    const old = read('savedConferences', []);
    return Array.isArray(old) ? old : [];
  }

  /**
   * Lưu lại danh sách hội nghị vào localStorage và thông báo qua Toast nếu lỗi.
   * @param {Array<string>} ids Danh sách mã hội nghị.
   */
  function setSaved(ids) {
    const utils = getUtils();
    const ok = utils && utils.writeStorage ? utils.writeStorage(savedKey(), ids) : false;
    if (!ok) {
      try {
        localStorage.setItem(savedKey(), JSON.stringify(ids));
      } catch (e) {
        if (utils && utils.showToast) {
          utils.showToast('Không thể cập nhật danh sách trong bộ nhớ trình duyệt.', 'error');
        }
      }
    }
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
      ? (daysLeft < 0 ? 'closed' : (daysLeft <= 14 ? 'urgent' : 'open'))
      : 'closed';
    return { date, remaining, status };
  }

  /**
   * Hiển thị bảng danh sách hội nghị đang theo dõi.
   */
  function render() {
    const tbody = document.getElementById('conferenceBody');
    const count = document.getElementById('totalCount');
    if (!tbody) return;

    const utils = getUtils();
    const esc = utils && utils.escapeHtml ? utils.escapeHtml : val => String(val ?? '');
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
      tbody.innerHTML = '<tr><td colspan="4" class="tracker-empty">Bạn chưa lưu hội nghị nào. Hãy tìm hội nghị phù hợp và nhấn “Lưu lại” để theo dõi tại đây.</td></tr>';
      return;
    }

    tbody.innerHTML = rows.map(conf => {
      const confId = utils && utils.getConferenceId ? utils.getConferenceId(conf) : String(conf.id || '');
      const fields = (conf.fields || []).slice(0, 3).map(f => `<span class="tag">${esc(f)}</span>`).join('');
      const badgeLabel = esc(conf.acronym || conf.short_name || (conf.name ? conf.name.slice(0, 4) : 'CG'));
      const nearest = getDeadlineSummary(conf);
      const compareBtnHtml = window.ConfGuideCompare ? window.ConfGuideCompare.renderToggleButton(conf) : '';
      const avatarHtml = utils && utils.renderConferenceAvatar
        ? utils.renderConferenceAvatar(conf, 'tracker-avatar')
        : `<div class="conf-badge-logo tracker-avatar" aria-hidden="true">${badgeLabel.toUpperCase()}</div>`;

      return `<tr>
        <td><div class="conference-name">${avatarHtml}<div class="name-text"><a href="detail.html?id=${encodeURIComponent(confId)}">${esc(conf.name || confId)}</a></div></div></td>
        <td><div class="tags">${fields || '<span class="tag">Chưa phân loại</span>'}</div></td>
        <td><div class="deadline-cell"><div class="deadline">${esc(nearest.date)}</div>${nearest.remaining ? `<div class="deadline-remaining deadline-remaining--${esc(nearest.status)}">${esc(nearest.remaining)}</div>` : ''}</div></td>
        <td><div class="actions">${compareBtnHtml}<button class="action-btn delete" type="button" data-remove="${esc(confId)}">Xóa</button></div></td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('[data-remove]').forEach(button => {
      button.addEventListener('click', () => {
        const targetId = button.dataset.remove;
        setSaved(getSaved().filter(item => String(item) !== targetId));
        render();
        if (utils && utils.showToast) {
          utils.showToast('Đã xóa hội nghị khỏi danh sách theo dõi.', 'info');
        }
      });
    });
  }

  /**
   * Nạp dữ liệu hội nghị từ JSON và khởi tạo sự kiện đồng bộ giữa các tab.
   */
  async function initTracker() {
    const tbody = document.getElementById('conferenceBody');
    if (!tbody) return;

    const utils = getUtils();
    const normalize = utils && utils.normalizeConference ? utils.normalizeConference : item => item;

    tbody.innerHTML = '<tr class="loading-row"><td colspan="4" class="loading-row">Đang tải dữ liệu hội nghị...</td></tr>';

    try {
      const response = await fetch('data/conference_data.json');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          window.ConfGuideTrackerConferences = data.map(normalize).filter(Boolean);
        }
      }
    } catch (e) {
      // Sử dụng dữ liệu dự phòng từ ConfGuideUtils khi chạy ngoại tuyến
    }

    render();

    window.addEventListener('storage', event => {
      if (event.key === savedKey()) render();
    });
  }

  document.addEventListener('DOMContentLoaded', initTracker);
})();
