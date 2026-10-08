/**
 * ConfGuide – ui.js
 * Các hiệu ứng UI dùng chung: hamburger drawer toggle, mouse glow cursor, card glow.
 *
 * Cách dùng:
 *   <script src="js/ui.js"></script>
 *   Gọi initUI() sau khi DOM đã sẵn sàng (hoặc thêm vào DOMContentLoaded).
 *   js/nav.js đã gọi sẵn initUI() ở cuối nếu DOM ready; không cần gọi lại thủ công.
 */

/**
 * Khởi tạo tất cả UI interactions dùng chung.
 * Gọi sau khi renderHeader() đã chạy xong (DOM có header/drawer).
 */
function initUI() {
  initHamburger();
  initMouseGlow();
}

/** Hamburger ↔ mobile nav drawer */
function initHamburger() {
  const hamBtn = document.getElementById('hamburgerBtn');
  const navDrawer = document.getElementById('navDrawer');
  if (!hamBtn || !navDrawer) return;
  if (hamBtn.dataset.bound === 'true') return;
  hamBtn.dataset.bound = 'true';

  hamBtn.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = navDrawer.classList.toggle('open');
    hamBtn.classList.toggle('open', isOpen);
    hamBtn.setAttribute('aria-expanded', String(isOpen));
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('#hamburgerBtn') && !e.target.closest('#navDrawer')) {
      navDrawer.classList.remove('open');
      hamBtn.classList.remove('open');
      hamBtn.setAttribute('aria-expanded', 'false');
    }
  });
}

/** Mouse cursor glow effect (halo + core, chỉ chạy trên thiết bị có hover) */
function initMouseGlow() {
  if (window._mouseGlowInitialized) return;
  if (matchMedia('(hover: none)').matches) return;

  const halo = document.querySelector('.fx-halo');
  const core = document.querySelector('.fx-core');
  if (!halo || !core) return;
  window._mouseGlowInitialized = true;

  const body = document.body;
  const target = { x: innerWidth / 2, y: innerHeight / 2 };
  const pos = { halo: { ...target }, core: { ...target } };
  const TAU = { halo: 170, core: 65 };
  let raf = 0, last = 0, seen = false;

  function step(now) {
    const dt = Math.min(now - last, 50);
    last = now;
    let moving = false;

    for (const k in pos) {
      const p = pos[k];
      const a = 1 - Math.exp(-dt / TAU[k]);
      p.x += (target.x - p.x) * a;
      p.y += (target.y - p.y) * a;
      if (Math.abs(target.x - p.x) > 0.1 || Math.abs(target.y - p.y) > 0.1) moving = true;
    }

    halo.style.transform = `translate3d(${pos.halo.x}px,${pos.halo.y}px,0)`;
    core.style.transform = `translate3d(${pos.core.x}px,${pos.core.y}px,0)`;
    raf = moving ? requestAnimationFrame(step) : 0;
  }

  const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); } };

  addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    target.x = e.clientX;
    target.y = e.clientY;
    if (!seen) { seen = true; for (const k in pos) pos[k] = { x: target.x, y: target.y }; }
    body.classList.add('fx-on');
    kick();
  }, { passive: true });

  document.documentElement.addEventListener('mouseleave', () => body.classList.remove('fx-on'));
}

/**
 * Thêm hiệu ứng glow theo vị trí chuột cho các card trong container.
 * @param {string|Element} containerSelector - CSS selector hoặc Element chứa các .glow-card
 */
function initCardGlow(containerSelector) {
  const container = typeof containerSelector === 'string'
    ? document.querySelector(containerSelector)
    : containerSelector;
  if (!container) return;

  container.addEventListener('mousemove', e => {
    const card = e.target.closest('.glow-card');
    if (card) {
      const b = card.getBoundingClientRect();
      card.style.setProperty('--x', (e.clientX - b.left).toFixed(1) + 'px');
      card.style.setProperty('--y', (e.clientY - b.top).toFixed(1) + 'px');
    }
  });
}

/**
 * Hiển thị thông báo Toast nổi góc dưới bên phải màn hình.
 * @param {string} message - Nội dung thông báo
 * @param {'success'|'info'|'warning'|'danger'} type - Loại thông báo
 */
function showToast(message, type = 'success') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let iconSvg = '';
  if (type === 'success') {
    iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
  } else if (type === 'warning') {
    iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
  } else if (type === 'danger') {
    iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  } else {
    iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d5fd8" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
  }

  toast.innerHTML = `<span class="toast-icon">${iconSvg}</span><span>${message}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}
window.showToast = showToast;

// Auto-init sau khi DOM sẵn sàng
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUI);
} else {
  initUI();
}
