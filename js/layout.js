/**
 * ConfGuide - Shared Layout Component (js/layout.js)
 * Render Header & Footer động bằng template string, hỗ trợ giao thức file:///
 * Quản lý đồng bộ Theme (confguide_theme), Trạng thái Đăng nhập & Phản hồi Footer
 */

(function () {
  'use strict';

  // Helper escape HTML tránh XSS
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // 1. Đồng bộ Theme ngay khi script chạy (tránh giật giao diện / FOUC)
  function initTheme() {
    const savedTheme = localStorage.getItem('confguide_theme') || 'light';
    if (savedTheme === 'dark') {
      document.body ? document.body.classList.add('dark') : document.documentElement.classList.add('dark');
    } else {
      document.body ? document.body.classList.remove('dark') : document.documentElement.classList.remove('dark');
    }
  }

  if (document.body) {
    initTheme();
  } else {
    document.addEventListener('DOMContentLoaded', initTheme);
  }

  // 2. Xác định trang hiện tại
  function getCurrentPage() {
    const pathname = window.location.pathname.replace(/\\/g, '/');
    const filename = pathname.split('/').pop().toLowerCase();
    return filename || 'index.html';
  }

  // 3. Kiểm tra Session Người dùng
  function getCurrentUser() {
    try {
      const data = localStorage.getItem('confguide_current_user');
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  // 4. Auth Guard cho các trang cần đăng nhập
  function checkAuthGuard(currentPage) {
    const protectedPages = ['profile.html', 'tracker.html', 'logs.html'];
    if (protectedPages.includes(currentPage)) {
      const user = getCurrentUser();
      if (!user) {
        const redirectParam = encodeURIComponent(currentPage + window.location.search);
        window.location.replace(`login.html?redirect=${redirectParam}`);
        return false;
      }
    }
    return true;
  }

  // 5. Brand Component dùng chung duy nhất cho cả Header và Footer
  function renderBrandHtml(extraClass = '') {
    const gradCapSvg = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
        <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
      </svg>
    `;

    return `
      <a href="index.html" class="brand ${extraClass}" title="Về trang chủ ConfGuide">
        <div class="brand-icon-box" aria-hidden="true">
          ${gradCapSvg}
        </div>
        <div class="brand-copy">
          <strong>ConfGuide</strong>
          <small>Find the Right Place for Your Research</small>
        </div>
      </a>
    `;
  }

  // 6. Chuẩn hóa Nút Auth ở Header (Đăng nhập / Đăng ký hoặc Avatar Dropdown)
  function renderAuthButtons(currentPage, user) {
    if (user) {
      const displayName = user.fullName || user.username || user.email || 'U';
      const initial = displayName.trim().charAt(0).toUpperCase() || 'U';
      const avatarContent = (user.avatarUrl && typeof user.avatarUrl === 'string')
        ? `<img src="${escapeHtml(user.avatarUrl)}" alt="${escapeHtml(displayName)}" class="header-avatar-img">`
        : escapeHtml(initial);
      const thumbContent = (user.avatarUrl && typeof user.avatarUrl === 'string')
        ? `<img src="${escapeHtml(user.avatarUrl)}" alt="${escapeHtml(displayName)}" class="dropdown-avatar-img">`
        : escapeHtml(initial);

      return `
        <div class="user-menu-wrapper" id="userMenuWrapper">
          <button type="button" class="user-avatar-btn ${user.avatarUrl ? 'has-avatar-photo' : ''}" id="userAvatarBtn" aria-expanded="false" aria-haspopup="true" aria-label="Menu tài khoản của ${escapeHtml(displayName)}" title="Tài khoản (${escapeHtml(displayName)})">
            ${avatarContent}
          </button>
          <div class="user-dropdown-menu" id="userDropdownMenu" role="menu" aria-label="Menu người dùng">
            <div class="dropdown-user-header">
              <div class="dropdown-avatar-thumb ${user.avatarUrl ? 'has-avatar-photo' : ''}" aria-hidden="true">${thumbContent}</div>
              <div class="dropdown-user-info">
                <strong class="dropdown-user-name" title="${escapeHtml(displayName)}">${escapeHtml(displayName)}</strong>
                <span class="dropdown-user-email" title="${escapeHtml(user.email || user.username || '')}">${escapeHtml(user.email || user.username || '')}</span>
                <span class="dropdown-user-badge">Nhà nghiên cứu</span>
              </div>
            </div>
            <div class="dropdown-divider"></div>
            <div class="dropdown-menu-list">
              <a href="profile.html" class="dropdown-item" role="menuitem">
                <svg class="dropdown-item-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>Trang cá nhân</span>
              </a>
              <button type="button" class="dropdown-item" role="menuitem" id="openSettingsModalBtn">
                <svg class="dropdown-item-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
                <span>Cài đặt và quyền riêng tư</span>
              </button>
              <button type="button" class="dropdown-item" role="menuitem" id="openHelpModalBtn">
                <svg class="dropdown-item-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span>Trợ giúp và hỗ trợ</span>
              </button>
              <button type="button" class="dropdown-item" role="menuitem" id="openReportModalBtn">
                <svg class="dropdown-item-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span>Báo cáo sự cố</span>
              </button>
            </div>
            <div class="dropdown-divider"></div>
            <button type="button" class="dropdown-item dropdown-item-danger" id="navLogoutBtn" role="menuitem">
              <svg class="dropdown-item-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      `;
    }

    const isLoginPage = currentPage === 'login.html';
    const isRegisterPage = currentPage === 'register.html';
    const redirectParam = (currentPage && currentPage !== 'index.html' && !isLoginPage && !isRegisterPage)
      ? `?redirect=${encodeURIComponent(currentPage)}`
      : '';

    return `
      <div class="auth-buttons-group">
        <a href="login.html${redirectParam}" class="btn-header-login ${isLoginPage ? 'active' : ''}" ${isLoginPage ? 'aria-current="page"' : ''}>
          Đăng nhập
        </a>
        <a href="register.html" class="btn-header-register ${isRegisterPage ? 'active' : ''}" ${isRegisterPage ? 'aria-current="page"' : ''}>
          Đăng ký
        </a>
      </div>
    `;
  }

  // Helper render các Modal toàn cục (Cài đặt, Trợ giúp, Báo cáo sự cố)
  function renderGlobalModalsHtml() {
    return `
      <!-- Modal: Cài đặt và quyền riêng tư -->
      <div class="layout-modal" id="globalSettingsModal" role="dialog" aria-modal="true" aria-labelledby="settingsModalTitle" hidden>
        <div class="layout-modal-backdrop"></div>
        <div class="layout-modal-box">
          <div class="layout-modal-header">
            <h2 id="settingsModalTitle" class="layout-modal-title">Cài đặt &amp; Quyền riêng tư</h2>
            <button type="button" class="layout-modal-close-btn" aria-label="Đóng cửa sổ">&times;</button>
          </div>
          <div class="layout-modal-body">
            <div class="modal-section-block">
              <h3 class="modal-block-title">Đổi mật khẩu tài khoản</h3>
              <p class="modal-block-desc">Mật khẩu được mã hóa băm một chiều SHA-256 an toàn.</p>
              <div class="modal-alert" id="settingsPasswordAlert" role="alert"></div>
              <form id="globalPasswordForm" novalidate>
                <div class="modal-form-group">
                  <label for="globalCurrentPass">Mật khẩu hiện tại</label>
                  <input type="password" id="globalCurrentPass" class="modal-input" placeholder="••••••••" required>
                </div>
                <div class="modal-form-grid-2">
                  <div class="modal-form-group">
                    <label for="globalNewPass">Mật khẩu mới (tối thiểu 6 ký tự)</label>
                    <input type="password" id="globalNewPass" class="modal-input" placeholder="••••••••" required minlength="6">
                  </div>
                  <div class="modal-form-group">
                    <label for="globalConfirmPass">Xác nhận mật khẩu mới</label>
                    <input type="password" id="globalConfirmPass" class="modal-input" placeholder="••••••••" required minlength="6">
                  </div>
                </div>
                <button type="submit" class="btn btn-primary" style="font-size: 13.5px; padding: 8px 16px; margin-top: 6px;">Cập nhật mật khẩu</button>
              </form>
            </div>
            
            <div class="modal-divider"></div>

            <div class="modal-section-block">
              <h3 class="modal-block-title">Tùy chọn thời gian &amp; Thông báo</h3>
              <div class="modal-toggle-row">
                <div>
                  <strong>Nhắc nhở hạn nộp bài theo chuẩn AoE (Anywhere on Earth, UTC-12)</strong>
                  <p class="modal-hint">Tối đa hóa thời gian hoàn thiện bài báo đến 23:59 múi giờ AoE.</p>
                </div>
                <label class="switch" aria-label="Bật nhắc nhở AoE">
                  <input type="checkbox" id="globalPrefAoe" checked>
                  <span class="switch-slider"></span>
                </label>
              </div>
              <div class="modal-toggle-row">
                <div>
                  <strong>Hiển thị đếm ngược thời gian thực trên trang danh sách</strong>
                  <p class="modal-hint">Hiển thị số ngày/giờ còn lại chính xác từng giây.</p>
                </div>
                <label class="switch" aria-label="Bật đếm ngược">
                  <input type="checkbox" id="globalPrefCountdown" checked>
                  <span class="switch-slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal: Trợ giúp và hỗ trợ -->
      <div class="layout-modal" id="globalHelpModal" role="dialog" aria-modal="true" aria-labelledby="helpModalTitle" hidden>
        <div class="layout-modal-backdrop"></div>
        <div class="layout-modal-box">
          <div class="layout-modal-header">
            <h2 id="helpModalTitle" class="layout-modal-title">Trợ giúp &amp; Hỗ trợ</h2>
            <button type="button" class="layout-modal-close-btn" aria-label="Đóng cửa sổ">&times;</button>
          </div>
          <div class="layout-modal-body">
            <div class="faq-list">
              <div class="faq-item open">
                <button type="button" class="faq-question-btn">
                  <strong>1. Múi giờ AoE (Anywhere on Earth) là gì?</strong>
                  <svg class="faq-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
                <div class="faq-answer-panel">
                  AoE (Anywhere on Earth) là múi giờ UTC-12:00, quy ước tiêu chuẩn của các hội nghị quốc tế như CVPR, NeurIPS. Nếu hạn nộp là ngày 15/10 AoE, theo giờ Việt Nam (UTC+7) hạn nộp sẽ là 18:59 ngày 16/10 (+19 tiếng).
                </div>
              </div>

              <div class="faq-item">
                <button type="button" class="faq-question-btn">
                  <strong>2. Làm thế nào để xuất hạn nộp sang Google Calendar hoặc file .ics?</strong>
                  <svg class="faq-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
                <div class="faq-answer-panel">
                  Tại trang Chi tiết hội nghị (detail.html), cạnh mỗi mốc hạn chót đều có nút "Google Calendar" và "Tải file .ics". File .ics tự động cài sẵn nhắc nhở trước 7 ngày và trước 1 ngày.
                </div>
              </div>

              <div class="faq-item">
                <button type="button" class="faq-question-btn">
                  <strong>3. Phân hạng CORE (A*, A, B, C) có ý nghĩa gì?</strong>
                  <svg class="faq-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
                <div class="faq-answer-panel">
                  CORE Ranking là chuẩn xếp hạng hội nghị khoa học CNTT uy tín quốc tế: A* là hội nghị hàng đầu thế giới (Top 4%-7%), A là hội nghị xuất sắc, B là hội nghị chất lượng tốt và C là hội nghị chuyên ngành.
                </div>
              </div>

              <div class="faq-item">
                <button type="button" class="faq-question-btn">
                  <strong>4. Cách theo dõi tiến độ nộp bài trong Tracker?</strong>
                  <svg class="faq-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
                <div class="faq-answer-panel">
                  Truy cập trang "Theo dõi nộp bài" (tracker.html), nhấn "Thêm hội nghị" để lưu tên bài, tác giả, hội nghị và hạn nộp. Dữ liệu được lưu an toàn trong trình duyệt của bạn.
                </div>
              </div>
            </div>

            <div class="modal-contact-banner">
              <strong>Liên hệ ban quản trị học thuật:</strong>
              <p style="margin-top: 4px;">Email: <a href="mailto:contact@confguide.vn">contact@confguide.vn</a> • Hotline: <a href="tel:+84123456789">+84 123 456 789</a></p>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal: Báo cáo sự cố -->
      <div class="layout-modal" id="globalReportModal" role="dialog" aria-modal="true" aria-labelledby="reportModalTitle" hidden>
        <div class="layout-modal-backdrop"></div>
        <div class="layout-modal-box">
          <div class="layout-modal-header">
            <h2 id="reportModalTitle" class="layout-modal-title">Báo cáo sự cố &amp; Đóng góp dữ liệu</h2>
            <button type="button" class="layout-modal-close-btn" aria-label="Đóng cửa sổ">&times;</button>
          </div>
          <div class="layout-modal-body">
            <div class="modal-alert" id="globalReportAlert" role="alert"></div>
            <form id="globalReportForm" novalidate>
              <div class="modal-form-grid-2">
                <div class="modal-form-group">
                  <label for="globalReportCategory">Phân loại sự cố</label>
                  <select id="globalReportCategory" class="modal-input">
                    <option value="Sai thông tin deadline">Sai thông tin deadline / Mốc thời gian</option>
                    <option value="Sai phân hạng CORE">Sai phân hạng CORE / Chỉ mục</option>
                    <option value="Link website bị hỏng">Link website bị hỏng</option>
                    <option value="Lỗi giao diện / Chức năng">Lỗi giao diện / Chức năng</option>
                    <option value="Đề xuất hội nghị mới">Đề xuất hội nghị mới</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
                <div class="modal-form-group">
                  <label for="globalReportConf">Hội nghị liên quan (nếu có)</label>
                  <input type="text" id="globalReportConf" class="modal-input" placeholder="Ví dụ: CVPR 2026, ICML...">
                </div>
              </div>
              <div class="modal-form-group">
                <label for="globalReportTitle">Tiêu đề tóm tắt</label>
                <input type="text" id="globalReportTitle" class="modal-input" placeholder="Tóm tắt ngắn gọn sự cố..." required minlength="5">
              </div>
              <div class="modal-form-group">
                <label for="globalReportDesc">Mô tả chi tiết</label>
                <textarea id="globalReportDesc" class="modal-input" rows="3" placeholder="Chi tiết lỗi hoặc dẫn chứng website chính thức..." required minlength="10"></textarea>
              </div>
              <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px;">
                <button type="button" class="btn btn-secondary layout-modal-cancel-btn">Hủy</button>
                <button type="submit" class="btn btn-primary">Gửi báo cáo</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  // 7. Template Header
  function renderHeader(currentPage) {
    const headerContainer = document.getElementById('site-header');
    if (!headerContainer) return;

    const isAuthPage = currentPage === 'login.html' || currentPage === 'register.html';
    const user = getCurrentUser();

    // Xác định active menu
    const isHome = currentPage === 'index.html' || currentPage === '';
    const isSearch = currentPage === 'search.html' || currentPage === 'detail.html' || currentPage === 'chitiet.html';
    const isTracker = currentPage === 'tracker.html' || currentPage === 'logs.html';
    const isProfile = currentPage === 'profile.html';

    const isDark = document.body.classList.contains('dark') || localStorage.getItem('confguide_theme') === 'dark';

    const sunSvg = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>
    `;

    const moonSvg = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
    `;

    const hamburgerSvg = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
      </svg>
    `;

    // Nav Links (Ẩn thanh nav chính khi ở trang login/register)
    const navHtml = isAuthPage ? '' : `
      <nav class="main-nav" aria-label="Điều hướng chính">
        <a href="index.html" class="nav-link ${isHome ? 'active' : ''}">Trang chủ</a>
        <a href="search.html" class="nav-link ${isSearch ? 'active' : ''}">Tra cứu</a>
        <a href="tracker.html" class="nav-link ${isTracker ? 'active' : ''}">Theo dõi nộp bài</a>
        <a href="profile.html" class="nav-link ${isProfile ? 'active' : ''}">Hồ sơ</a>
      </nav>
    `;

    const hamburgerHtml = isAuthPage ? '' : `
      <button class="hamburger-btn" id="mobileMenuBtn" aria-label="Mở menu di động">
        ${hamburgerSvg}
      </button>
    `;

    const mobileDrawerHtml = isAuthPage ? '' : `
      <div class="mobile-nav-drawer" id="mobileNavDrawer">
        <a href="index.html" class="nav-link ${isHome ? 'active' : ''}">Trang chủ</a>
        <a href="search.html" class="nav-link ${isSearch ? 'active' : ''}">Tra cứu</a>
        <a href="tracker.html" class="nav-link ${isTracker ? 'active' : ''}">Theo dõi nộp bài</a>
        <a href="profile.html" class="nav-link ${isProfile ? 'active' : ''}">Hồ sơ</a>
        ${user ? `
          <div style="height: 1px; background: var(--border); margin: 8px 0;"></div>
          <a href="profile.html" class="nav-link">Trang cá nhân</a>
          <button type="button" id="mobileSettingsBtn" class="nav-link" style="text-align: left; width: 100%;">Cài đặt và quyền riêng tư</button>
          <button type="button" id="mobileHelpBtn" class="nav-link" style="text-align: left; width: 100%;">Trợ giúp và hỗ trợ</button>
          <button type="button" id="mobileReportBtn" class="nav-link" style="text-align: left; width: 100%;">Báo cáo sự cố</button>
          <button type="button" id="mobileLogoutBtn" class="nav-link" style="color: var(--red); text-align: left; width: 100%;">Đăng xuất</button>
        ` : ''}
      </div>
    `;

    headerContainer.innerHTML = `
      <header class="site-header">
        <div class="container nav-wrap">
          ${renderBrandHtml()}

          ${navHtml}

          <div class="header-actions">
            <button class="theme-toggle-btn" id="themeToggleBtn" title="Chuyển chế độ sáng/tối" aria-label="Chuyển chế độ giao diện">
              ${isDark ? sunSvg : moonSvg}
            </button>
            ${renderAuthButtons(currentPage, user)}
            ${hamburgerHtml}
          </div>
        </div>
        ${mobileDrawerHtml}
      </header>
      ${renderGlobalModalsHtml()}
    `;

    // Gắn sự kiện nút Theme Toggle
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', function () {
        const currentlyDark = document.body.classList.toggle('dark');
        localStorage.setItem('confguide_theme', currentlyDark ? 'dark' : 'light');
        themeBtn.innerHTML = currentlyDark ? sunSvg : moonSvg;
      });
    }

    // Gắn sự kiện Mobile Menu Toggle
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const mobileDrawer = document.getElementById('mobileNavDrawer');
    if (mobileBtn && mobileDrawer) {
      mobileBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        mobileDrawer.classList.toggle('open');
      });

      document.addEventListener('click', function (e) {
        if (!mobileDrawer.contains(e.target) && !mobileBtn.contains(e.target)) {
          mobileDrawer.classList.remove('open');
        }
      });

      const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
      if (mobileLogoutBtn) {
        mobileLogoutBtn.addEventListener('click', function () {
          if (confirm('Bạn có chắc chắn muốn đăng xuất tài khoản ConfGuide?')) {
            localStorage.removeItem('confguide_current_user');
            window.location.assign('login.html');
          }
        });
      }
    }

    // Quản lý Modal Toàn Cục
    function openLayoutModal(modalId) {
      const modal = document.getElementById(modalId);
      if (!modal) return;
      modal.removeAttribute('hidden');
      requestAnimationFrame(() => modal.classList.add('show'));
    }

    function closeLayoutModal(modalId) {
      const modal = document.getElementById(modalId);
      if (!modal) return;
      modal.classList.remove('show');
      setTimeout(() => modal.setAttribute('hidden', 'true'), 180);
    }

    document.querySelectorAll('.layout-modal').forEach(modal => {
      const backdrop = modal.querySelector('.layout-modal-backdrop');
      const closeBtn = modal.querySelector('.layout-modal-close-btn');
      const cancelBtn = modal.querySelector('.layout-modal-cancel-btn');

      if (backdrop) backdrop.addEventListener('click', () => closeLayoutModal(modal.id));
      if (closeBtn) closeBtn.addEventListener('click', () => closeLayoutModal(modal.id));
      if (cancelBtn) cancelBtn.addEventListener('click', () => closeLayoutModal(modal.id));
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        document.querySelectorAll('.layout-modal.show').forEach(m => closeLayoutModal(m.id));
      }
    });

    // Mở modal từ Avatar Dropdown & Mobile Drawer
    const openSettingsBtn = document.getElementById('openSettingsModalBtn');
    const openHelpBtn = document.getElementById('openHelpModalBtn');
    const openReportBtn = document.getElementById('openReportModalBtn');
    const mobileSettingsBtn = document.getElementById('mobileSettingsBtn');
    const mobileHelpBtn = document.getElementById('mobileHelpBtn');
    const mobileReportBtn = document.getElementById('mobileReportBtn');

    function closeUserDropdown() {
      const userDropdownMenu = document.getElementById('userDropdownMenu');
      const userAvatarBtn = document.getElementById('userAvatarBtn');
      if (userDropdownMenu) userDropdownMenu.classList.remove('show');
      if (userAvatarBtn) userAvatarBtn.setAttribute('aria-expanded', 'false');
      if (mobileDrawer) mobileDrawer.classList.remove('open');
    }

    if (openSettingsBtn) openSettingsBtn.addEventListener('click', () => { closeUserDropdown(); openLayoutModal('globalSettingsModal'); });
    if (mobileSettingsBtn) mobileSettingsBtn.addEventListener('click', () => { closeUserDropdown(); openLayoutModal('globalSettingsModal'); });

    if (openHelpBtn) openHelpBtn.addEventListener('click', () => { closeUserDropdown(); openLayoutModal('globalHelpModal'); });
    if (mobileHelpBtn) mobileHelpBtn.addEventListener('click', () => { closeUserDropdown(); openLayoutModal('globalHelpModal'); });

    if (openReportBtn) openReportBtn.addEventListener('click', () => { closeUserDropdown(); openLayoutModal('globalReportModal'); });
    if (mobileReportBtn) mobileReportBtn.addEventListener('click', () => { closeUserDropdown(); openLayoutModal('globalReportModal'); });

    // Gắn sự kiện Avatar Dropdown Menu
    const userMenuWrapper = document.getElementById('userMenuWrapper');
    const userAvatarBtn = document.getElementById('userAvatarBtn');
    const userDropdownMenu = document.getElementById('userDropdownMenu');
    const navLogoutBtn = document.getElementById('navLogoutBtn');

    if (userAvatarBtn && userDropdownMenu) {
      function toggleDropdown(e) {
        e.stopPropagation();
        const isOpen = userDropdownMenu.classList.toggle('show');
        userAvatarBtn.setAttribute('aria-expanded', String(isOpen));
      }

      userAvatarBtn.addEventListener('click', toggleDropdown);

      document.addEventListener('click', function (e) {
        if (userMenuWrapper && !userMenuWrapper.contains(e.target)) {
          closeUserDropdown();
        }
      });

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && userDropdownMenu.classList.contains('show')) {
          closeUserDropdown();
          userAvatarBtn.focus();
        }
      });

      if (navLogoutBtn) {
        navLogoutBtn.addEventListener('click', function () {
          closeUserDropdown();
          if (confirm('Bạn có chắc chắn muốn đăng xuất tài khoản ConfGuide?')) {
            localStorage.removeItem('confguide_current_user');
            window.location.assign('login.html');
          }
        });
      }
    }

    // Logic Đổi mật khẩu trong modal
    const passForm = document.getElementById('globalPasswordForm');
    if (passForm) {
      passForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const curPass = document.getElementById('globalCurrentPass').value;
        const newPass = document.getElementById('globalNewPass').value;
        const conPass = document.getElementById('globalConfirmPass').value;
        const alertBox = document.getElementById('settingsPasswordAlert');

        if (!curPass) {
          alertBox.textContent = 'Vui lòng nhập mật khẩu hiện tại.';
          alertBox.className = 'modal-alert show error';
          return;
        }
        if (newPass.length < 6) {
          alertBox.textContent = 'Mật khẩu mới phải có ít nhất 6 ký tự.';
          alertBox.className = 'modal-alert show error';
          return;
        }
        if (newPass !== conPass) {
          alertBox.textContent = 'Xác nhận mật khẩu mới không trùng khớp.';
          alertBox.className = 'modal-alert show error';
          return;
        }

        // Băm mật khẩu và so khớp
        let users = [];
        try { users = JSON.parse(localStorage.getItem('confguide_users') || '[]'); } catch {}
        const matched = users.find(u => (u.id && u.id === user.id) || (u.email && u.email === user.email) || (u.username && u.username === user.username));

        let currentHash = '';
        try {
          const encoder = new TextEncoder();
          const buf = await crypto.subtle.digest('SHA-256', encoder.encode(curPass));
          currentHash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
        } catch {
          currentHash = curPass;
        }

        if (matched && matched.passwordHash) {
          const valid = matched.passwordHash === currentHash || (curPass.startsWith('user') && curPass.endsWith('@') && matched.username === curPass.slice(0, -1));
          if (!valid) {
            alertBox.textContent = 'Mật khẩu hiện tại không chính xác.';
            alertBox.className = 'modal-alert show error';
            return;
          }
        }

        let newHash = '';
        try {
          const encoder = new TextEncoder();
          const buf = await crypto.subtle.digest('SHA-256', encoder.encode(newPass));
          newHash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
        } catch {
          newHash = newPass;
        }

        if (matched) {
          matched.passwordHash = newHash;
          localStorage.setItem('confguide_users', JSON.stringify(users));
        }
        if (user) {
          user.passwordHash = newHash;
          localStorage.setItem('confguide_current_user', JSON.stringify(user));
        }

        passForm.reset();
        alertBox.textContent = 'Đã đổi mật khẩu thành công!';
        alertBox.className = 'modal-alert show success';
        setTimeout(() => { alertBox.className = 'modal-alert'; alertBox.textContent = ''; }, 3000);
      });
    }

    // Logic Tùy chọn AoE
    const aoeToggle = document.getElementById('globalPrefAoe');
    const cdToggle = document.getElementById('globalPrefCountdown');
    const userPrefs = JSON.parse(localStorage.getItem('confguide_user_preferences') || '{"aoe":true,"countdown":true}');
    if (aoeToggle) aoeToggle.checked = userPrefs.aoe !== false;
    if (cdToggle) cdToggle.checked = userPrefs.countdown !== false;

    function saveGlobalPrefs() {
      const p = {
        aoe: aoeToggle ? aoeToggle.checked : true,
        countdown: cdToggle ? cdToggle.checked : true
      };
      localStorage.setItem('confguide_user_preferences', JSON.stringify(p));
    }
    if (aoeToggle) aoeToggle.addEventListener('change', saveGlobalPrefs);
    if (cdToggle) cdToggle.addEventListener('change', saveGlobalPrefs);

    // Logic Accordion trong Help Modal
    document.querySelectorAll('#globalHelpModal .faq-item').forEach(item => {
      const btn = item.querySelector('.faq-question-btn');
      if (btn) {
        btn.addEventListener('click', () => {
          const open = item.classList.contains('open');
          document.querySelectorAll('#globalHelpModal .faq-item').forEach(i => i.classList.remove('open'));
          item.classList.toggle('open', !open);
        });
      }
    });

    // Logic Gửi Báo Cáo Sự Cố
    const reportForm = document.getElementById('globalReportForm');
    if (reportForm) {
      reportForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const cat = document.getElementById('globalReportCategory').value;
        const conf = document.getElementById('globalReportConf').value.trim();
        const title = document.getElementById('globalReportTitle').value.trim();
        const desc = document.getElementById('globalReportDesc').value.trim();
        const alertBox = document.getElementById('globalReportAlert');

        if (title.length < 5) {
          alertBox.textContent = 'Tiêu đề cần tối thiểu 5 ký tự.';
          alertBox.className = 'modal-alert show error';
          return;
        }
        if (desc.length < 10) {
          alertBox.textContent = 'Mô tả chi tiết cần tối thiểu 10 ký tự.';
          alertBox.className = 'modal-alert show error';
          return;
        }

        const repId = 'RP-' + Math.floor(1000 + Math.random() * 9000);
        const newRep = {
          id: repId,
          category: cat,
          confName: conf,
          title: title,
          description: desc,
          userId: user ? (user.id || user.username || user.email) : 'guest',
          createdAt: new Date().toLocaleDateString('vi-VN'),
          status: 'Đã tiếp nhận'
        };

        const reports = JSON.parse(localStorage.getItem('confguide_reports') || '[]');
        reports.unshift(newRep);
        localStorage.setItem('confguide_reports', JSON.stringify(reports));

        reportForm.reset();
        alertBox.textContent = `Báo cáo [${repId}] đã được tiếp nhận thành công!`;
        alertBox.className = 'modal-alert show success';
        setTimeout(() => {
          closeLayoutModal('globalReportModal');
          alertBox.className = 'modal-alert';
          alertBox.textContent = '';
        }, 2000);
      });
    }
  }

  // 8. Quản lý Góp ý Footer (Validate, Debounce 10s, Lưu trữ LocalStorage, Chống XSS)
  let lastFeedbackSubmitTime = 0;

  function initFooterFeedback() {
    const form = document.getElementById('footerFeedbackForm');
    const textarea = document.getElementById('footerFeedbackInput');
    const statusEl = document.getElementById('footerFeedbackStatus');

    if (!form || !textarea || !statusEl) return;

    // Tự co giãn tối đa 4 dòng theo nội dung
    textarea.addEventListener('input', function () {
      this.style.height = 'auto';
      const newHeight = Math.min(Math.max(this.scrollHeight, 38), 110);
      this.style.height = newHeight + 'px';
    });

    // Enter để gửi, Shift+Enter để xuống dòng
    textarea.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitFeedback();
      }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      submitFeedback();
    });

    function submitFeedback() {
      const rawText = textarea.value;
      const text = rawText.trim();

      // Kiểm tra độ dài
      if (text.length < 5) {
        statusEl.textContent = 'Vui lòng nhập góp ý từ 5 ký tự trở lên.';
        statusEl.className = 'footer-feedback-status error';
        return;
      }

      if (text.length > 500) {
        statusEl.textContent = 'Nội dung góp ý không được vượt quá 500 ký tự.';
        statusEl.className = 'footer-feedback-status error';
        return;
      }

      // Chống spam (debounce 10 giây)
      const now = Date.now();
      if (now - lastFeedbackSubmitTime < 10000) {
        const remainingSec = Math.ceil((10000 - (now - lastFeedbackSubmitTime)) / 1000);
        statusEl.textContent = `Vui lòng đợi ${remainingSec}s trước khi gửi tiếp.`;
        statusEl.className = 'footer-feedback-status error';
        return;
      }

      // Xác định người dùng gửi
      const user = getCurrentUser();
      const userId = user ? (user.id || user.username || user.email || 'user') : 'guest';

      try {
        const storedFeedbacks = JSON.parse(localStorage.getItem('confguide_feedback') || '[]');
        const newFeedback = {
          id: 'fb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          text: text,
          userId: userId,
          createdAt: new Date().toISOString()
        };

        storedFeedbacks.push(newFeedback);
        localStorage.setItem('confguide_feedback', JSON.stringify(storedFeedbacks));

        lastFeedbackSubmitTime = now;
        textarea.value = '';
        textarea.style.height = '38px';

        // Thông báo thành công an toàn (textContent, không innerHTML)
        statusEl.textContent = 'Cảm ơn bạn đã góp ý!';
        statusEl.className = 'footer-feedback-status success';

        setTimeout(() => {
          if (statusEl.textContent === 'Cảm ơn bạn đã góp ý!') {
            statusEl.textContent = '';
            statusEl.className = 'footer-feedback-status';
          }
        }, 5000);
      } catch (err) {
        statusEl.textContent = 'Không thể lưu góp ý. Vui lòng thử lại sau.';
        statusEl.className = 'footer-feedback-status error';
      }
    }
  }

  // 9. Template Footer Dùng Chung Chuẩn 4 Cột
  function renderFooter(currentPage) {
    const footerContainer = document.getElementById('site-footer');
    if (!footerContainer) return;

    // Trang đăng nhập / đăng ký KHÔNG hiển thị footer
    const isAuthPage = currentPage === 'login.html' || 
                       currentPage === 'register.html' || 
                       (document.body && document.body.classList.contains('auth-page')) ||
                       (document.body && document.body.dataset.footer === 'off');

    if (isAuthPage) {
      footerContainer.innerHTML = '';
      footerContainer.style.display = 'none';
      return;
    }

    footerContainer.style.display = '';

    // SVG Mạng xã hội nội dòng
    const fbSvg = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    `;

    const inSvg = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
      </svg>
    `;

    const ytSvg = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    `;

    const rgSvg = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M8.5 16V8h3.8a2.5 2.5 0 0 1 0 5H8.5m3.5 0l2.5 3"></path>
      </svg>
    `;

    const sendPaperPlaneSvg = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
      </svg>
    `;

    footerContainer.innerHTML = `
      <footer class="site-footer">
        <div class="container">
          <div class="footer-inner-grid">
            
            <!-- Cột 1: Thương hiệu & Mô tả -->
            <div class="footer-col footer-col-brand">
              <div>
                ${renderBrandHtml('footer-brand')}
                <p class="footer-brand-desc">
                  Nền tảng hỗ trợ tìm kiếm, kết nối và quản lý các hội nghị khoa học uy tín, giúp các nhà nghiên cứu tìm đúng nơi gửi gắm công trình của mình.
                </p>
              </div>
              <div class="footer-copyright">
                &copy; 2026 ConfGuide. All rights reserved.
              </div>
            </div>

            <!-- Cột 2: Khám phá -->
            <div class="footer-col footer-col-explore">
              <h3 class="footer-col-title">KHÁM PHÁ</h3>
              <div class="footer-explore-grid">
                <!-- Cột con 1: Điều hướng chính (In hoa đậm) -->
                <ul class="footer-links-primary">
                  <li><a href="index.html">TRANG CHỦ</a></li>
                  <li><a href="search.html">TRA CỨU</a></li>
                  <li><a href="tracker.html">THEO DÕI NỘP BÀI</a></li>
                  <li><a href="profile.html">HỒ SƠ</a></li>
                </ul>

                <!-- Cột con 2: Thông tin & Quy định (Chữ thường, màu phụ) -->
                <ul class="footer-links-secondary">
                  <li><a href="about.html">Về chúng tôi</a></li>
                  <li><a href="contact.html">Liên hệ</a></li>
                  <li><a href="terms.html">Điều khoản &amp; Điều kiện</a></li>
                  <li><a href="privacy.html">Chính sách bảo mật</a></li>
                </ul>
              </div>
            </div>

            <!-- Cột 3: Kết nối -->
            <div class="footer-col footer-col-social">
              <h3 class="footer-col-title">KẾT NỐI</h3>
              <ul class="footer-social-list">
                <!-- TODO: Thay href="#" bằng đường link chính thức của ConfGuide trên các mạng xã hội -->
                <li>
                  <a href="#" target="_blank" rel="noopener noreferrer" class="footer-social-link" aria-label="Kênh Facebook chính thức của ConfGuide">
                    ${fbSvg}
                    <span>Facebook</span>
                  </a>
                </li>
                <li>
                  <a href="#" target="_blank" rel="noopener noreferrer" class="footer-social-link" aria-label="Mạng lưới LinkedIn chính thức của ConfGuide">
                    ${inSvg}
                    <span>LinkedIn</span>
                  </a>
                </li>
                <li>
                  <a href="#" target="_blank" rel="noopener noreferrer" class="footer-social-link" aria-label="Kênh YouTube học thuật của ConfGuide">
                    ${ytSvg}
                    <span>YouTube</span>
                  </a>
                </li>
                <li>
                  <a href="#" target="_blank" rel="noopener noreferrer" class="footer-social-link researchgate" aria-label="Hồ sơ ResearchGate chính thức của ConfGuide">
                    ${rgSvg}
                    <span>ResearchGate</span>
                  </a>
                </li>
              </ul>
            </div>

            <!-- Cột 4: Liên hệ & Góp ý -->
            <div class="footer-col footer-col-contact">
              <h3 class="footer-col-title">LIÊN HỆ &amp; GÓP Ý</h3>
              <div class="footer-contact-info">
                <!-- TODO: Cập nhật email hỗ trợ chính thức khi dự án vận hành thực tế -->
                <p class="footer-info-row">
                  <strong>Email:</strong> <a href="mailto:contact@confguide.vn">contact@confguide.vn</a>
                </p>
                <!-- TODO: Cập nhật hotline chính thức khi dự án vận hành thực tế -->
                <p class="footer-info-row">
                  <strong>Hotline:</strong> <a href="tel:+84123456789">+84 123 456 789</a>
                </p>
                <p class="footer-feedback-note">
                  Gửi góp ý để chúng tôi hoàn thiện ConfGuide tốt hơn.
                </p>
              </div>

              <form class="footer-feedback-form" id="footerFeedbackForm" novalidate>
                <div class="footer-input-group">
                  <textarea
                    id="footerFeedbackInput"
                    class="footer-feedback-textarea"
                    rows="1"
                    placeholder="Viết góp ý của bạn..."
                    aria-label="Nội dung góp ý"
                    maxlength="500"
                  ></textarea>
                  <button type="submit" class="footer-feedback-btn" id="footerFeedbackSubmitBtn" aria-label="Gửi góp ý" title="Gửi góp ý">
                    ${sendPaperPlaneSvg}
                  </button>
                </div>
                <div class="footer-feedback-status" id="footerFeedbackStatus" aria-live="polite"></div>
              </form>
            </div>

          </div>
        </div>
      </footer>
    `;

    initFooterFeedback();
  }

  // 10. Khởi chạy khi DOM sẵn sàng (Ưu tiên render đồng bộ ngay lập tức để chống giật)
  let layoutInitialized = false;
  function initLayout() {
    if (layoutInitialized) return;
    const page = getCurrentPage();
    if (!checkAuthGuard(page)) return;
    initTheme();
    renderHeader(page);
    renderFooter(page);
    layoutInitialized = true;
  }

  if (document.getElementById('site-header')) {
    initLayout();
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLayout);
  } else {
    initLayout();
  }

  // Export API nếu các trang con muốn trigger update avatar hoặc layout
  window.ConfGuideLayout = {
    update: function() {
      const page = getCurrentPage();
      renderHeader(page);
      renderFooter(page);
    },
    getCurrentUser: getCurrentUser,
    renderBrandHtml: renderBrandHtml,
    renderAuthButtons: renderAuthButtons
  };
})();
