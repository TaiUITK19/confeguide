/**
 * ConfGuide – Chi Tiết Hội Nghị (chitiethoinghi.js)
 * Điều khiển toàn bộ logic tương tác: chuyển tab, lưu hội nghị, đánh giá 5 sao,
 * render hội nghị liên quan, render danh sách 128 đánh giá và hiệu ứng di chuột.
 */

const STAR_PATH = "M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z";
const THUMB_PATH = "M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z";

/* ---- Chuyển đổi Tab (Thông tin / Đánh giá / Liên quan) ---- */
function switchDetailTab(tabKey, shouldScroll = false) {
  const tabs = {
    detail: { btn: 'tabBtnDetail', panel: 'panelDetail', hash: '' },
    reviews: { btn: 'tabBtnReviews', panel: 'panelReviews', hash: '#danh-gia' },
    related: { btn: 'tabBtnRelated', panel: 'panelRelated', hash: '#lien-quan' }
  };

  if (!tabs[tabKey]) tabKey = 'detail';

  for (const k in tabs) {
    const isTarget = (k === tabKey);
    const b = document.getElementById(tabs[k].btn);
    const p = document.getElementById(tabs[k].panel);
    if (b) {
      b.classList.toggle('active', isTarget);
      b.setAttribute('aria-selected', String(isTarget));
    }
    if (p) {
      p.hidden = !isTarget;
    }
  }

  // Đồng bộ trạng thái active trên thanh menu điều hướng chính
  document.querySelectorAll('.topbar .nav a[data-tab]').forEach(link => {
    link.classList.toggle('active', link.dataset.tab === tabKey);
  });
  document.querySelectorAll('.nav-drawer a[data-tab]').forEach(link => {
    link.classList.toggle('active', link.dataset.tab === tabKey);
  });

  // Cuộn mượt đến phần nội dung tab nếu được yêu cầu
  if (shouldScroll) {
    const tabsEl = document.querySelector('.inpage-tabs');
    if (tabsEl) {
      tabsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Cập nhật URL Hash không reload trang
  const targetHash = tabs[tabKey].hash;
  if (targetHash) {
    history.replaceState(null, '', targetHash);
  } else {
    history.replaceState(null, '', location.pathname);
  }
}
window.switchDetailTab = switchDetailTab;

/* ---- Khởi tạo chức năng Lưu Hội Nghị ---- */
function initSaveConference() {
  const saveBtn = document.getElementById('saveBtn');
  const saveText = document.getElementById('saveText');
  if (!saveBtn) return;

  const storageKey = 'confguide_saved_cvpr2026';
  const isSaved = localStorage.getItem(storageKey) === 'true';

  if (isSaved) {
    saveBtn.classList.add('on');
    saveBtn.setAttribute('aria-pressed', 'true');
    if (saveText) saveText.textContent = 'Đã lưu hội nghị';
  }

  saveBtn.addEventListener('click', () => {
    const on = saveBtn.classList.toggle('on');
    saveBtn.setAttribute('aria-pressed', String(on));
    if (saveText) saveText.textContent = on ? 'Đã lưu hội nghị' : 'Lưu hội nghị này';
    localStorage.setItem(storageKey, String(on));

    if (typeof showToast === 'function') {
      showToast(
        on ? 'Đã lưu CVPR 2026 vào danh sách quan tâm' : 'Đã bỏ lưu CVPR 2026',
        on ? 'success' : 'info'
      );
    }
  });
}

/* ---- Khởi tạo widget Chấm Điểm 5 Sao ---- */
function initRatingWidget() {
  const starsBox = document.getElementById('stars');
  const rateMsg = document.getElementById('rateMsg');
  if (!starsBox) return;

  const storageKey = 'confguide_rating_cvpr2026';
  let rating = parseInt(localStorage.getItem(storageKey) || '0', 10);

  function paint(n) {
    [...starsBox.children].forEach((b, idx) => b.classList.toggle('lit', idx < n));
  }

  starsBox.innerHTML = '';
  for (let i = 1; i <= 5; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'star-btn' + (i <= rating ? ' lit' : '');
    b.setAttribute('aria-label', i + ' sao');
    b.innerHTML = `<svg viewBox="0 0 24 24"><path d="${STAR_PATH}"/></svg><span>${i}</span>`;

    b.addEventListener('mouseenter', () => paint(i));
    b.addEventListener('click', () => {
      rating = (rating === i) ? 0 : i;
      paint(rating);
      localStorage.setItem(storageKey, String(rating));
      if (rateMsg) {
        rateMsg.textContent = rating ? `Bạn đã chấm ${rating}/5 sao. Cảm ơn bạn!` : '';
      }
      if (rating > 0 && typeof showToast === 'function') {
        showToast(`Cảm ơn bạn đã chấm ${rating}/5 sao cho CVPR 2026!`, 'success');
      }
    });

    starsBox.appendChild(b);
  }

  starsBox.addEventListener('mouseleave', () => paint(rating));
  if (rating > 0 && rateMsg) {
    rateMsg.textContent = `Bạn đã chấm ${rating}/5 sao. Cảm ơn bạn!`;
  }
}

/* ---- Render Danh Sách Hội Nghị Liên Quan (12 hội nghị) ---- */
function renderRelatedConferences() {
  const grid = document.getElementById('relGrid');
  const list = typeof RELATED_CONFERENCES !== 'undefined' ? RELATED_CONFERENCES : (typeof window !== 'undefined' ? window.RELATED_CONFERENCES : null);
  if (!grid || !list) return;

  grid.innerHTML = list.map((c, i) => `
    <article class="rc glow-card">
      <div class="thumb" style="background:linear-gradient(160deg,${c.c[1]},${c.c[0]})">
        <b>${c.s.replace(' ', '<br>')}</b>
      </div>
      <div class="body">
        <h5>${c.s}</h5>
        <div class="full">${c.n}</div>
        <div class="tg">${c.t.map(x => `<span>${x}</span>`).join('')}</div>
        <div class="bottom">
          <button type="button" class="save-sm" data-i="${i}" aria-label="Lưu ${c.s}">
            <svg viewBox="0 0 24 24"><path d="${STAR_PATH}"/></svg>Lưu
          </button>
          <span class="rank">${c.r}</span>
        </div>
      </div>
      <span class="days">còn ${c.d}d</span>
    </article>
  `).join('');

  grid.addEventListener('click', e => {
    const b = e.target.closest('.save-sm');
    if (!b) return;
    const on = b.classList.toggle('on');
    b.lastChild.textContent = on ? 'Đã lưu' : 'Lưu';
    if (typeof showToast === 'function') {
      showToast(
        on ? 'Đã lưu hội nghị liên quan vào mục quan tâm' : 'Đã bỏ lưu hội nghị liên quan',
        on ? 'success' : 'info'
      );
    }
  });

  if (typeof initCardGlow === 'function') {
    initCardGlow(grid);
  }
}

/* ---- Render Thống Kê & 128 Đánh Giá Cộng Đồng ---- */
function renderReviewsSection() {
  const getReviews = typeof generateReviewsData === 'function' ? generateReviewsData : (typeof window !== 'undefined' ? window.generateReviewsData : null);
  if (!getReviews) return;

  const reviews = getReviews();
  const total = reviews.length;
  const avg = reviews.reduce((a, r) => a + r.stars, 0) / total;

  const rvAvg = document.getElementById('rvAvg');
  if (rvAvg) rvAvg.textContent = avg.toFixed(1);

  const rvTotal = document.getElementById('rvTotal');
  if (rvTotal) rvTotal.textContent = `${total} đánh giá`;

  const rvListTitle = document.getElementById('rvListTitle');
  if (rvListTitle) rvListTitle.textContent = `Tất cả đánh giá (${total})`;

  // Vẽ 5 sao tổng quan
  const rvStars = document.getElementById('rvStars');
  if (rvStars) {
    rvStars.innerHTML = [1, 2, 3, 4, 5].map(n => {
      const filled = n <= Math.round(avg);
      return `<svg width="22" height="22" viewBox="0 0 24 24"><path d="${STAR_PATH}" fill="${filled ? '#f5b301' : 'none'}" stroke="#f5b301" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
    }).join('');
  }

  // Vẽ các thanh phân bố sao (5 sao -> 1 sao)
  const rvBars = document.getElementById('rvBars');
  if (rvBars) {
    rvBars.innerHTML = [5, 4, 3, 2, 1].map(s => {
      const n = reviews.filter(r => r.stars === s).length;
      const pct = (n / total * 100).toFixed(1);
      return `
        <div class="bar-row">
          <span>${s} sao</span>
          <div class="track"><div class="fill" style="width:${pct}%"></div></div>
          <span class="n">${n}</span>
        </div>`;
    }).join('');
  }

  // Vẽ danh sách 128 reviews
  const rvList = document.getElementById('rvList');
  if (rvList) {
    rvList.innerHTML = reviews.map((r, i) => {
      const hue = (i * 47) % 360;
      const starsHtml = [1, 2, 3, 4, 5].map(n => `<svg viewBox="0 0 24 24" class="${n <= r.stars ? 'f' : ''}"><path d="${STAR_PATH}"/></svg>`).join('');
      return `
      <article class="rv glow-card" data-i="${i}">
        <div class="av" style="background:hsl(${hue},70%,90%);color:hsl(${hue},45%,28%)">G${i + 1}</div>
        <div class="rv-body">
          <div class="rv-top">
            <b>${r.name}</b>
            <span class="rv-stars" aria-label="${r.stars} sao">${starsHtml}</span>
          </div>
          <p>${r.text}</p>
          <div class="rv-act">
            <button type="button" class="vt like" data-act="like" aria-pressed="false" aria-label="Thích nhận xét này">
              <svg viewBox="0 0 24 24"><path d="${THUMB_PATH}"/></svg>
              <span>${r.likes}</span>
            </button>
            <button type="button" class="vt dislike" data-act="dislike" aria-pressed="false" aria-label="Không thích nhận xét này">
              <svg viewBox="0 0 24 24"><path d="${THUMB_PATH}"/></svg>
              <span>${r.dislikes}</span>
            </button>
          </div>
        </div>
      </article>`;
    }).join('');

    // Xử lý vote like / dislike
    rvList.addEventListener('click', e => {
      const btn = e.target.closest('.vt');
      if (!btn) return;
      const item = btn.closest('.rv');
      const r = reviews[+item.dataset.i];
      const act = btn.dataset.act;
      const key = a => (a === 'like' ? 'likes' : 'dislikes');

      if (r.vote === act) {
        r[key(act)]--;
        r.vote = null;
      } else {
        if (r.vote) r[key(r.vote)]--;
        r[key(act)]++;
        r.vote = act;
      }

      ['like', 'dislike'].forEach(a => {
        const b = item.querySelector('.vt.' + a);
        b.classList.toggle('on', r.vote === a);
        b.setAttribute('aria-pressed', String(r.vote === a));
        b.querySelector('span').textContent = r[key(a)];
      });

      if (typeof showToast === 'function' && r.vote) {
        showToast(r.vote === 'like' ? 'Đã thích nhận xét này' : 'Đã không thích nhận xét này', 'info');
      }
    });

    if (typeof initCardGlow === 'function') {
      initCardGlow(rvList);
    }
  }
}

/* ---- Hiệu ứng Mouse Glow trên Hero Banner ---- */
function initHeroGlow() {
  const hero = document.getElementById('hero');
  if (!hero) return;

  hero.addEventListener('mousemove', e => {
    const r = hero.getBoundingClientRect();
    hero.style.setProperty('--mx', (e.clientX - r.left).toFixed(1) + 'px');
    hero.style.setProperty('--my', (e.clientY - r.top).toFixed(1) + 'px');
    hero.classList.add('hero-on');
  });

  hero.addEventListener('mouseleave', () => hero.classList.remove('hero-on'));
}

/* ---- Khởi tạo khi DOM đã sẵn sàng ---- */
document.addEventListener('DOMContentLoaded', () => {
  // Render header & footer từ nav.js
  if (typeof renderHeader === 'function') renderHeader('chitiet');
  if (typeof renderFooter === 'function') renderFooter();

  // Khởi tạo các thành phần
  initSaveConference();
  initRatingWidget();
  renderRelatedConferences();
  renderReviewsSection();
  initHeroGlow();

  // Mở reviews khi nhấp vào box đánh giá ở sidebar
  const openBox = document.getElementById('openReviews');
  if (openBox) {
    openBox.addEventListener('click', () => switchDetailTab('reviews'));
    openBox.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        switchDetailTab('reviews');
      }
    });
  }

  // Đọc URL hash khi tải trang
  if (location.hash === '#danh-gia') {
    switchDetailTab('reviews');
  } else if (location.hash === '#lien-quan') {
    switchDetailTab('related');
  }
});
