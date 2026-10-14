/**
 * ConfGuide — Home Gateway Script (js/script.js)
 * Điều hướng tìm kiếm sang search.html, hiển thị tối đa 6 hội nghị sắp tới
 * Hoạt động tốt trên cả giao thức file:/// với cơ chế fallback dự phòng
 */

(function () {
  'use strict';

  // Dữ liệu dự phòng phong phú cho file:/// khi trình duyệt chặn fetch cục bộ
  const FALLBACK_CONFERENCES = [
    {
      "id": "cvpr-2026",
      "name": "CVPR 2026",
      "year": "2026",
      "full_name": "IEEE/CVF Conference on Computer Vision and Pattern Recognition",
      "summarization": "Hội nghị quốc tế uy tín số 1 thế giới về thị giác máy tính và nhận dạng mẫu.",
      "location": "Vancouver, Canada",
      "date_happen": "2026-06-14 to 2026-06-19",
      "rank": "A*",
      "rating": 4.8,
      "rating_count": 142,
      "publisher": "IEEE / CVF",
      "mode": "Trực tiếp",
      "fields": ["computer vision", "deep learning", "multimodal ai"],
      "deadlines": [
        { "name": "Paper Submission", "date": "2026-01-15" },
        { "name": "Author Notification", "date": "2026-03-25" }
      ]
    },
    {
      "id": "neurips-2026",
      "name": "NeurIPS 2026",
      "year": "2026",
      "full_name": "Conference on Neural Information Processing Systems",
      "summarization": "Hội nghị học máy và khoa học thần kinh tính toán hàng đầu thế giới.",
      "location": "Sydney, Australia",
      "date_happen": "2026-12-06 to 2026-12-12",
      "rank": "A*",
      "rating": 4.9,
      "rating_count": 210,
      "publisher": "NeurIPS Foundation",
      "mode": "Trực tiếp",
      "fields": ["machine learning", "deep learning", "ai"],
      "deadlines": [
        { "name": "Abstract Submission", "date": "2026-05-15" },
        { "name": "Full Paper Submission", "date": "2026-05-22" }
      ]
    },
    {
      "id": "iclr-2026",
      "name": "ICLR 2026",
      "year": "2026",
      "full_name": "International Conference on Learning Representations",
      "summarization": "Hội nghị hàng đầu về biểu diễn học và học sâu, quy tụ các công trình đột phá về AI.",
      "location": "Singapore",
      "date_happen": "2026-04-26 to 2026-04-30",
      "rank": "A*",
      "rating": 4.8,
      "rating_count": 135,
      "publisher": "ICLR",
      "mode": "Hybrid",
      "fields": ["deep learning", "representation learning", "ai"],
      "deadlines": [
        { "name": "Paper Submission", "date": "2025-10-22" },
        { "name": "Author Notification", "date": "2026-01-22" }
      ]
    },
    {
      "id": "atc-2026",
      "name": "ATC 2026",
      "year": "2026",
      "full_name": "International Conference on Advanced Technologies for Communications",
      "summarization": "Hội nghị quốc tế thường niên về công nghệ truyền thông và viễn thông tại Việt Nam.",
      "location": "Quy Nhơn, Việt Nam",
      "date_happen": "2026-10-15 to 2026-10-17",
      "rank": "B",
      "rating": 4.2,
      "rating_count": 45,
      "publisher": "IEEE ComSoc / REV",
      "mode": "Trực tiếp",
      "fields": ["communications", "wireless networks", "iot"],
      "deadlines": [
        { "name": "Paper Submission", "date": "2026-05-30" },
        { "name": "Author Notification", "date": "2026-07-30" }
      ]
    },
    {
      "id": "soict-2026",
      "name": "SOICT 2026",
      "year": "2026",
      "full_name": "The 15th International Symposium on Information and Communication Technology",
      "summarization": "Hội thảo quốc tế về CNTT quy tụ các hướng nghiên cứu hiện đại: AI, An ninh mạng, Big Data.",
      "location": "TP. Hồ Chí Minh, Việt Nam",
      "date_happen": "2026-12-04 to 2026-12-05",
      "rank": "B",
      "rating": 4.3,
      "rating_count": 52,
      "publisher": "ACM / Springer",
      "mode": "Trực tiếp",
      "fields": ["ai foundations", "big data", "cyber security"],
      "deadlines": [
        { "name": "Full Paper Submission", "date": "2026-09-25" },
        { "name": "Author Notification", "date": "2026-10-12" }
      ]
    },
    {
      "id": "mapr-2026",
      "name": "MAPR 2026",
      "year": "2026",
      "full_name": "International Conference on Multimedia Analysis and Pattern Recognition",
      "summarization": "Hội nghị quốc tế chuyên sâu về Phân tích Đa phương tiện và Nhận dạng Mẫu do UIT chủ trì.",
      "location": "Đà Nẵng, Việt Nam",
      "date_happen": "2026-10-08 to 2026-10-09",
      "rank": "B",
      "rating": 4.4,
      "rating_count": 48,
      "publisher": "IEEE",
      "mode": "Trực tiếp",
      "fields": ["multimedia", "pattern recognition", "computer vision"],
      "deadlines": [
        { "name": "Paper Submission", "date": "2026-06-15" },
        { "name": "Author Notification", "date": "2026-08-10" }
      ]
    }
  ];

  let allConferences = [];
  let currentTab = 'all';

  // 1. Khởi tạo điều hướng tìm kiếm
  function initSearchGateway() {
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');

    if (searchForm && searchInput) {
      searchForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const query = searchInput.value.trim();
        window.location.href = query ? `search.html?q=${encodeURIComponent(query)}` : 'search.html';
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

  // 2. Tải dữ liệu hội nghị
  async function loadData() {
    try {
      const response = await fetch('data/conference_data.json');
      if (!response.ok) throw new Error('Network error');
      const data = await response.json();
      allConferences = Array.isArray(data) && data.length > 0 ? data : FALLBACK_CONFERENCES;
    } catch (e) {
      console.warn('Fetch local json blocked or failed, using fallback dataset:', e);
      allConferences = FALLBACK_CONFERENCES;
    }

    renderFeaturedConferences();
  }

  // 3. Tính toán deadline gần nhất & số ngày còn lại
  function getNearestDeadline(deadlines) {
    if (!deadlines || !Array.isArray(deadlines) || deadlines.length === 0) return null;
    return deadlines[0];
  }

  function calculateDaysLeft(dateStr) {
    if (!dateStr) return null;
    const target = new Date(dateStr + 'T23:59:59');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  function formatDateVi(dateStr) {
    if (!dateStr) return 'Chưa cập nhật';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  // 4. Render danh sách tối đa 6 hội nghị sắp tới
  function renderFeaturedConferences() {
    const grid = document.getElementById('conferenceGrid');
    const emptyState = document.getElementById('emptyState');
    const resultsStatus = document.getElementById('resultsCount');
    const btnViewAll = document.getElementById('btnViewAll');

    if (!grid) return;

    if (btnViewAll) {
      btnViewAll.innerHTML = `
        <span>Xem tất cả ${allConferences.length} hội nghị trên hệ thống</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      `;
    }

    // Lọc hội nghị tương lai / sắp diễn ra (ẩn hội nghị đã kết thúc từ năm trước trừ khi cần)
    let filtered = allConferences.filter(c => {
      // Xác định khu vực theo tab
      const isVN = (c.location || '').toLowerCase().includes('việt nam') || (c.location || '').toLowerCase().includes('vietnam');
      if (currentTab === 'Việt Nam' && !isVN) return false;
      if (currentTab === 'Quốc tế' && isVN) return false;

      // Ưu tiên các hội nghị chưa diễn ra
      return true;
    });

    // Sắp xếp ưu tiên hội nghị 2026 và rank cao
    filtered.sort((a, b) => {
      const yearA = parseInt(a.year || '2026', 10);
      const yearB = parseInt(b.year || '2026', 10);
      if (yearB !== yearA) return yearB - yearA;
      return (b.rating || 0) - (a.rating || 0);
    });

    // Chỉ lấy tối đa 6 cards cho Landing Gateway
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

      const confId = item.id || encodeURIComponent(item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
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

  // 5. Gắn sự kiện chuyển tab
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
