/**
 * ConfGuide - Quản lý Chế độ Sáng / Tối (Theme Mode)
 * Tự động đồng bộ và lưu trạng thái vào localStorage
 */

(function () {
  // Áp dụng theme ngay lập tức để tránh nhấp nháy giao diện khi tải trang
  const savedTheme = localStorage.getItem('confguide-theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', initialTheme);

  // Hàm chuyển đổi theme
  window.setConfGuideTheme = function (theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('confguide-theme', theme);
    updateToggleButtons(theme);
  };

  // Cập nhật trạng thái các nút bấm trên giao diện
  function updateToggleButtons(theme) {
    const activeTheme = theme || document.documentElement.getAttribute('data-theme') || 'light';
    document.querySelectorAll('.theme-toggle').forEach(toggle => {
      const btns = toggle.querySelectorAll('.theme-btn');
      if (btns.length >= 2) {
        btns[0].classList.toggle('on', activeTheme === 'light');
        btns[1].classList.toggle('on', activeTheme === 'dark');
      }
    });

    // Cập nhật nút trong mobile drawer nếu có
    const mobileThemeText = document.getElementById('drawerThemeText');
    if (mobileThemeText) {
      mobileThemeText.textContent = activeTheme === 'dark' ? 'Chế độ tối: Bật' : 'Chế độ sáng: Bật';
    }
    const mobileThemeIcon = document.getElementById('drawerThemeIcon');
    if (mobileThemeIcon) {
      mobileThemeIcon.textContent = activeTheme === 'dark' ? '🌙' : '☀';
    }
  }

  // Đảm bảo nút toggle trong mobile drawer được tạo
  function ensureDrawerThemeToggle() {
    const navDrawer = document.querySelector('.nav-drawer');
    if (navDrawer && !document.getElementById('drawerThemeToggle')) {
      const drawerHeader = navDrawer.querySelector('.drawer-header');
      if (drawerHeader) {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
        const themeBtnGroup = document.createElement('div');
        themeBtnGroup.id = 'drawerThemeToggle';
        themeBtnGroup.style.display = 'flex';
        themeBtnGroup.style.alignItems = 'center';
        themeBtnGroup.style.gap = '8px';
        themeBtnGroup.style.padding = '8px 14px';
        themeBtnGroup.style.background = 'rgba(255, 255, 255, 0.12)';
        themeBtnGroup.style.borderRadius = '10px';
        themeBtnGroup.style.marginBottom = '6px';
        themeBtnGroup.style.cursor = 'pointer';
        themeBtnGroup.style.color = '#fff';
        themeBtnGroup.style.fontSize = '14px';
        themeBtnGroup.style.fontWeight = '600';
        themeBtnGroup.innerHTML = `
          <span id="drawerThemeIcon" style="font-size:16px">${currentTheme === 'dark' ? '🌙' : '☀'}</span>
          <span id="drawerThemeText" style="flex:1">${currentTheme === 'dark' ? 'Chế độ tối: Bật' : 'Chế độ sáng: Bật'}</span>
          <span style="font-size:11px;background:rgba(255,255,255,0.2);padding:2px 8px;border-radius:99px">Đổi</span>
        `;
        themeBtnGroup.addEventListener('click', function () {
          const nowTheme = document.documentElement.getAttribute('data-theme') || 'light';
          window.setConfGuideTheme(nowTheme === 'dark' ? 'light' : 'dark');
        });
        drawerHeader.insertAdjacentElement('afterend', themeBtnGroup);
      }
    }
  }

  window.updateConfGuideThemeToggleButtons = function () {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    updateToggleButtons(currentTheme);
    ensureDrawerThemeToggle();
  };

  // Event delegation: bắt sự kiện click cho mọi .theme-toggle và .theme-btn dù render lúc nào
  document.addEventListener('click', function (e) {
    const toggle = e.target.closest('.theme-toggle');
    if (!toggle) return;

    e.preventDefault();
    const btn = e.target.closest('.theme-btn');
    if (btn) {
      const btns = toggle.querySelectorAll('.theme-btn');
      if (btns.length >= 2) {
        if (btn === btns[0]) {
          window.setConfGuideTheme('light');
        } else {
          window.setConfGuideTheme('dark');
        }
      }
    } else {
      // Nhấp vào vùng đệm của cụm toggle
      const nowTheme = document.documentElement.getAttribute('data-theme') || 'light';
      window.setConfGuideTheme(nowTheme === 'dark' ? 'light' : 'dark');
    }
  });

  // Đồng bộ lại khi DOM sẵn sàng
  document.addEventListener('DOMContentLoaded', function () {
    window.updateConfGuideThemeToggleButtons();
  });
})();
