/**
 * ConfGuide - Kịch bản Trang chủ (js/script.js)
 * Xử lý thanh tìm kiếm nhanh, chip từ khóa gợi ý, nạp dữ liệu hội nghị
 * và hiển thị danh sách 6 hội nghị tiêu biểu trên index.html.
 */

(function () {
  'use strict';

  let allConferences = [];
  let currentTab = 'all';

  /**
   * Lấy đối tượng tiện ích dùng chung từ layout.js.
   * @returns {Object|null} Tham chiếu tới window.ConfGuideUtils.
   */
  function getUtils() {
    return window.ConfGuideUtils || null;
  }

  /**
   * Khởi tạo biểu mẫu tìm kiếm và các nút từ khóa gợi ý trên Hero Banner.
   */
  function initSearchGateway() {
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');

    if (searchForm && searchInput) {
      searchForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const query = searchInput.value.trim();
        window.location.href = query
          ? `search.html?q=${encodeURIComponent(query)}`
          : 'search.html';
      });
    }

    const chips = document.querySelectorAll('.js-chip-keyword');
    chips.forEach(chip => {
      chip.addEventListener('click', function () {
        const keyword = this.getAttribute('data-keyword');
        if (keyword) {
          window.location.href = `search.html?q=${encodeURIComponent(keyword)}`;
        }
      });
    });
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
   * @returns {Promise<void>}
   */
  async function loadData() {
    const utils = getUtils();
    const fallback = utils && Array.isArray(utils.FALLBACK_CONFERENCES) ? utils.FALLBACK_CONFERENCES : [];
    const normalize = utils && utils.normalizeConference ? utils.normalizeConference : item => item;

    setLoadingState(true);

    try {
      const response = await fetch('data/conference_data.json');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      allConferences = Array.isArray(data) && data.length > 0
        ? data.map(normalize).filter(Boolean)
        : fallback;
    } catch (e) {
      // Dự phòng sang dữ liệu cục bộ khi chạy qua giao thức file:/// hoặc lỗi kết nối
      allConferences = fallback;
    }

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

    grid.innerHTML = displayItems.map(item => {
      const nextDl = utils && utils.getNextDeadline ? utils.getNextDeadline(item) : null;
      let deadlineBadgeText = 'Chưa công bố';

      if (nextDl) {
        const formattedDl = utils && utils.formatDeadlineVi
          ? utils.formatDeadlineVi(nextDl.date)
          : (nextDl.displayDate || nextDl.date);
        if (!nextDl.isPassed) {
          deadlineBadgeText = `${nextDl.shortName}: ${formattedDl} (còn ${nextDl.daysLeft} ngày)`;
        } else {
          deadlineBadgeText = `${nextDl.shortName}: ${formattedDl} (Đã qua)`;
        }
      }

      const confId = utils && utils.getConferenceId ? utils.getConferenceId(item) : String(item.id || '');
      const rankBadge = item.rank ? `Rank ${item.rank}` : 'Rank A';
      const dateRange = utils && utils.formatRangeVi
        ? (utils.formatRangeVi(item.startDate, item.endDate) || item.date_happen || '2026')
        : (item.date_happen || '2026');
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
            <div class="conf-deadline-badge">
              <strong>${esc(deadlineBadgeText)}</strong>
            </div>
            <div class="conf-card-actions">
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
    initTabs();
    loadData();
  });
})();
