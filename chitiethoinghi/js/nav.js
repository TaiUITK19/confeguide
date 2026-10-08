/**
 * ConfGuide – nav.js (Dành riêng cho Trang Chi Tiết Hội Nghị Độc Lập)
 * Render header (topbar + mobile drawer) và footer điều hướng các mục của hội nghị.
 */

const LOGO_SVG = `<svg width="42" height="38" viewBox="0 0 48 42" aria-hidden="true" focusable="false"><defs><linearGradient id="confguide-mark-blue" x1="9" y1="20" x2="39" y2="38" gradientUnits="userSpaceOnUse"><stop stop-color="#4388ff"/><stop offset="1" stop-color="#1d5fd8"/></linearGradient></defs><path d="M24 3 2 14.2 24 25.5 46 14.2 24 3Z" fill="#10235a"/><path d="M8 18.1v10.2c0 2.3 1.2 4.4 3.1 5.8 3.4 2.4 7.9 3.7 12.9 3.7s9.5-1.3 12.9-3.7c1.9-1.4 3.1-3.5 3.1-5.8V18.1L24 26.4 8 18.1Z" fill="url(#confguide-mark-blue)"/><path d="M14 27.8c3.4-.8 6.8-.2 10 1.8 3.2-2 6.6-2.6 10-1.8" fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2"/><path d="M44 15v12" stroke="#f4b740" stroke-linecap="round" stroke-width="2.4"/><circle cx="44" cy="29" r="2" fill="#f4b740"/></svg>`;
const LOGO_SVG_SM = LOGO_SVG.replace('width="42" height="38"', 'width="34" height="31"');

const DETAIL_NAV_ITEMS = [
  {
    key: 'detail',
    tab: 'detail',
    href: '#chi-tiet',
    label: 'Thông tin chi tiết',
    icon: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    iconLg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>`
  },
  {
    key: 'reviews',
    tab: 'reviews',
    href: '#danh-gia',
    label: 'Đánh giá (128)',
    icon: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    iconLg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`
  },
  {
    key: 'related',
    tab: 'related',
    href: '#lien-quan',
    label: 'Hội nghị liên quan (12)',
    icon: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
    iconLg: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`
  }
];

/**
 * Render Header vào đầu <body>
 */
function renderHeader() {
  const navLinks = DETAIL_NAV_ITEMS.map((item, idx) => `
    <a href="${item.href}" class="${idx === 0 ? 'active' : ''}" data-tab="${item.tab}" onclick="event.preventDefault(); switchDetailTab('${item.tab}', true);">
      ${item.icon}
      <span class="nav-label">${item.label}</span>
    </a>
  `).join('') + `
    <a href="https://cvpr.thecvf.com/" target="_blank" rel="noopener noreferrer">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      <span class="nav-label">Website hội nghị</span>
    </a>
  `;

  const drawerLinks = DETAIL_NAV_ITEMS.map((item, idx) => `
    <a href="${item.href}" class="${idx === 0 ? 'active' : ''}" data-tab="${item.tab}" onclick="event.preventDefault(); switchDetailTab('${item.tab}', true); document.getElementById('navDrawer')?.classList.remove('open'); document.getElementById('hamburgerBtn')?.classList.remove('open');">
      ${item.iconLg}
      <span>${item.label}</span>
    </a>
  `).join('') + `
    <a href="https://cvpr.thecvf.com/" target="_blank" rel="noopener noreferrer">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      <span>Website CVPR 2026</span>
    </a>
  `;

  const html = `
<div class="fx-halo" aria-hidden="true"></div>
<div class="fx-core" aria-hidden="true"></div>

<header class="topbar">
  <a href="index.html" class="logo" aria-label="ConfGuide - CVPR 2026">
    ${LOGO_SVG}
    <span><b>ConfGuide</b><i>Find the Right Place for Your Research</i></span>
  </a>

  <nav class="nav" aria-label="Điều hướng chính">
    ${navLinks}
  </nav>

  <div class="topbar-right">
    <div class="theme-toggle" aria-label="Giao diện sáng tối" title="Chuyển chế độ Sáng / Tối">
      <button class="theme-btn on" type="button" aria-label="Chế độ sáng">☀</button>
      <button class="theme-btn" type="button" aria-label="Chế độ tối">🌙</button>
    </div>
    <button class="btn-outline" type="button" id="headerShareBtn" style="padding:6px 12px;font-size:13px" onclick="if (navigator.clipboard) { navigator.clipboard.writeText(location.href); showToast('Đã sao chép liên kết hội nghị!', 'success'); } else { showToast('Đã sẵn sàng chia sẻ CVPR 2026', 'info'); }">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
      <span>Chia sẻ</span>
    </button>
    <div class="avatar" title="Người dùng khách">KH</div>
    <button class="hamburger" id="hamburgerBtn" type="button"
            aria-label="Mở menu điều hướng" aria-expanded="false" aria-controls="navDrawer">
      <span></span><span></span><span></span>
    </button>
  </div>
</header>

<nav class="nav-drawer" id="navDrawer" aria-label="Điều hướng di động">
  <div class="drawer-header">
    <b>CVPR 2026 · Chi tiết</b>
    <span style="font-size:12px;color:#cbdcf8">Vancouver, Canada</span>
  </div>
  ${drawerLinks}
  <div class="drawer-footer">
    <button type="button" class="drawer-btn login" onclick="document.getElementById('saveBtn')?.click();">Lưu hội nghị</button>
    <a href="https://cvpr.thecvf.com/" target="_blank" rel="noopener noreferrer" class="drawer-btn reg">Trang chủ CVPR</a>
  </div>
</nav>`;

  document.body.insertAdjacentHTML('afterbegin', html);

  if (typeof window.updateConfGuideThemeToggleButtons === 'function') {
    window.updateConfGuideThemeToggleButtons();
  }
  if (typeof initUI === 'function') {
    initUI();
  }
}

/**
 * Render Footer vào cuối <body>
 */
function renderFooter() {
  const html = `
<footer class="site-footer">
  <div class="footer-container">
    <!-- Cột 1: Thông tin thương hiệu -->
    <div class="footer-col footer-col-brand">
      <a href="index.html" class="footer-logo" aria-label="ConfGuide">
        ${LOGO_SVG_SM}
        <div>
          <b>ConfGuide</b>
          <i>Find the Right Place for Your Research</i>
        </div>
      </a>
      <p class="footer-desc">
        Nền tảng hỗ trợ tìm kiếm, kết nối và theo dõi các hội nghị khoa học quốc tế uy tín, giúp các nhà nghiên cứu tìm đúng nơi công bố công trình của mình.
      </p>
      <div class="footer-copy">
        &copy; 2026 ConfGuide · IEEE/CVF CVPR 2026 Detail Portal.
      </div>
    </div>

    <!-- Cột 2: Khám phá nội dung -->
    <div class="footer-col footer-col-explore">
      <h3 class="footer-title">Nội dung hội nghị &mdash;</h3>
      <div class="explore-grid">
        <ul class="footer-menu uppercase">
          <li><a href="#chi-tiet" onclick="event.preventDefault(); switchDetailTab('detail', true);">Thông tin</a></li>
          <li><a href="#danh-gia" onclick="event.preventDefault(); switchDetailTab('reviews', true);">Đánh giá</a></li>
          <li><a href="#lien-quan" onclick="event.preventDefault(); switchDetailTab('related', true);">Hội nghị khác</a></li>
          <li><a href="https://cvpr.thecvf.com/" target="_blank" rel="noopener noreferrer">Website CVPR</a></li>
        </ul>
        <ul class="footer-menu">
          <li><a href="#hero" onclick="window.scrollTo({top:0,behavior:'smooth'});">Về đầu trang</a></li>
          <li><a href="javascript:void(0)" onclick="if (typeof showToast==='function') showToast('ConfGuide là dự án mã nguồn mở hỗ trợ nhà nghiên cứu', 'info');">Giới thiệu</a></li>
          <li><a href="javascript:void(0)" onclick="if (typeof showToast==='function') showToast('Dữ liệu được cập nhật định kỳ từ IEEE và CVF', 'info');">Điều khoản</a></li>
          <li><a href="javascript:void(0)" onclick="if (typeof showToast==='function') showToast('Chính sách bảo mật thông tin người dùng được đảm bảo', 'info');">Bảo mật</a></li>
        </ul>
      </div>
    </div>

    <!-- Cột 3: Kết nối -->
    <div class="footer-col footer-col-social">
      <h3 class="footer-title">Kết nối</h3>
      <ul class="social-list">
        <li>
          <a href="https://facebook.com" class="social-link" target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            <span>Facebook</span>
          </a>
        </li>
        <li>
          <a href="https://linkedin.com" class="social-link" target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
            <span>LinkedIn</span>
          </a>
        </li>
        <li>
          <a href="https://youtube.com" class="social-link" target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            <span>YouTube</span>
          </a>
        </li>
        <li>
          <a href="https://researchgate.net" class="social-link" target="_blank" rel="noopener noreferrer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke-width="1.8"/>
              <path d="M7 16V8h3a2.5 2.5 0 0 1 0 5H7m2.8 0L12 16"/>
              <path d="M14 12h3v4h-3a2 2 0 0 1-2-2v0a2 2 0 0 1 2-2z"/>
            </svg>
            <span>ResearchGate</span>
          </a>
        </li>
      </ul>
    </div>

    <!-- Cột 4: Liên hệ & Đăng ký nhận tin -->
    <div class="footer-col footer-col-contact">
      <h3 class="footer-title">Liên hệ &amp; Nhận tin</h3>
      <div class="contact-info">
        <p>Email: <a href="mailto:contact@confguide.vn">contact@confguide.vn</a></p>
        <p>Hotline: <a href="tel:+84123456789">+84 123 456 789</a></p>
      </div>
      <p class="subscribe-text">
        Đăng ký nhận thông báo deadline và tin tức mới nhất về CVPR 2026.
      </p>
      <form class="footer-subscribe-form" onsubmit="event.preventDefault(); if (typeof showToast === 'function') { showToast('Đã đăng ký nhận tin về CVPR 2026 thành công!'); this.reset(); }">
        <input type="email" placeholder="Nhập email của bạn..." required aria-label="Địa chỉ email nhận tin">
        <button type="submit" aria-label="Gửi đăng ký">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </form>
    </div>
  </div>
</footer>`;

  document.body.insertAdjacentHTML('beforeend', html);
}
