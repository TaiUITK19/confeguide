(function () {
  let allConferences = [];
  let currentTab = 'all';

  // Tìm kiếm hội nghị
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

    // Gợi ý từ khóa
    const chips = document.querySelectorAll('.chip-keyword');
    chips.forEach(chip => {
      chip.addEventListener('click', function () {
        const keyword = this.getAttribute('data-keyword');
        if (keyword) {
          window.location.href = `search.html?q=${encodeURIComponent(keyword)}`;
        }
      });
    });
  }

  // Tải dữ liệu hội nghị
  async function loadData() {
    try {
      const response = await fetch('data/conference_data.json');
      if (!response.ok) {
        throw new Error('Network error');
      }
      const data = await response.json();
      allConferences = Array.isArray(data) && data.length > 0
        ? data
        : FALLBACK_CONFERENCES;
    } catch (e) {
      console.warn('Fetch local json blocked or failed, using fallback dataset:', e);
      allConferences = FALLBACK_CONFERENCES;
    }

    renderFeaturedConferences();
  }

  // Xử lý thời hạn nộp bài
  function getNearestDeadline(deadlines) {
    if (!deadlines || !Array.isArray(deadlines) || deadlines.length === 0) {
      return null;
    }
    return deadlines[0];
  }

  function calculateDaysLeft(dateStr) {
    if (!dateStr) {
      return null;
    }
    const target = new Date(dateStr + 'T23:59:59');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  function formatDateVi(dateStr) {
    if (!dateStr) {
      return 'Chưa cập nhật';
    }
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  // Hiển thị tối đa 6 hội nghị
  function renderFeaturedConferences() {
    const grid = document.getElementById('conferenceGrid');
    const emptyState = document.getElementById('emptyState');
    const resultsStatus = document.getElementById('resultsCount');
    const btnViewAll = document.getElementById('btnViewAll');

    if (!grid) {
      return;
    }

    if (btnViewAll) {
      btnViewAll.innerHTML = `
        <span>Xem tất cả ${allConferences.length} hội nghị trên hệ thống</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      `;
    }

    // Lọc hội nghị theo khu vực
    let filtered = allConferences.filter(c => {
      const isVN = (c.location || '').toLowerCase().includes('việt nam') ||
        (c.location || '').toLowerCase().includes('vietnam');
      if (currentTab === 'Việt Nam' && !isVN) {
        return false;
      }
      if (currentTab === 'Quốc tế' && isVN) {
        return false;
      }

      return true;
    });

    // Sắp xếp theo năm và điểm đánh giá
    filtered.sort((a, b) => {
      const yearA = parseInt(a.year || '2026', 10);
      const yearB = parseInt(b.year || '2026', 10);
      if (yearB !== yearA) {
        return yearB - yearA;
      }
      return (b.rating || 0) - (a.rating || 0);
    });

    // Lấy tối đa 6 hội nghị
    const displayItems = filtered.slice(0, 6);

    if (resultsStatus) {
      resultsStatus.innerHTML = `Hiển thị <strong>${displayItems.length}</strong> hội nghị tiêu biểu`;
    }

    if (displayItems.length === 0) {
      grid.innerHTML = '';
      if (emptyState) {
        emptyState.hidden = false;
      }
      return;
    }

    if (emptyState) {
      emptyState.hidden = true;
    }

    grid.innerHTML = displayItems.map(item => {
      const utils = window.ConfGuideUtils;
      const nextDl = utils ? utils.getNextDeadline(item) : null;
      let deadlineBadgeText = 'Chưa công bố';

      if (nextDl) {
        if (!nextDl.isPassed) {
          deadlineBadgeText = `Mốc tiếp theo: ${nextDl.shortName} – còn ${nextDl.daysLeft} ngày`;
        } else {
          deadlineBadgeText = `Mốc tiếp theo: ${nextDl.shortName} (Đã qua)`;
        }
      }

      const confId = item.id || encodeURIComponent(
        item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      );
      const rankBadge = item.rank ? `Rank ${item.rank}` : 'Rank A';

      return `
        <article class="conf-card card-surface" data-id="${confId}">
          <div>
            <div class="conf-top">
              <div class="conf-badge-logo">${item.name.slice(0, 4).toUpperCase()}</div>
              <div class="conf-title-wrap">
                <h3>${item.name}</h3>
                <span class="conf-rank">${rankBadge}</span>
              </div>
            </div>

            <p class="conf-desc">${item.summarization || item.fullName || item.full_name || 'Hội nghị khoa học uy tín quốc tế.'}</p>

            <div class="conf-meta">
              <div class="conf-meta-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>${item.location || 'Chưa xác định'}</span>
              </div>
              <div class="conf-meta-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                <span>${utils ? utils.formatRangeVi(item.startDate, item.endDate) : (item.date_happen || '2026')}</span>
              </div>
            </div>
          </div>

          <div class="conf-footer">
            <div class="conf-deadline-badge">
              <strong>${deadlineBadgeText}</strong>
            </div>
            <a href="detail.html?id=${confId}" class="btn-detail">
              Xem chi tiết &rarr;
            </a>
          </div>
        </article>
      `;
    }).join('');
  }

  // Chuyển tab hội nghị
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

  // Khởi chạy khi DOM sẵn sàng
  document.addEventListener('DOMContentLoaded', function () {
    initSearchGateway();
    initTabs();
    loadData();
  });
})();
