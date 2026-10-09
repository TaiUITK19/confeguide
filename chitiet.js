const STAR = "M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z";

/* ---- Lưu hội nghị: khung -> vàng ---- */
const saveBtn = document.getElementById('saveBtn');
saveBtn.addEventListener('click', () => {
  const on = saveBtn.classList.toggle('on');
  saveBtn.setAttribute('aria-pressed', on);
  document.getElementById('saveText').textContent = on ? 'Đã lưu hội nghị' : 'Lưu hội nghị này';
});

/* ---- Chấm điểm 5 sao ---- */
const starsBox = document.getElementById('stars');
const rateMsg = document.getElementById('rateMsg');
let rating = 0;
for (let i = 1; i <= 5; i++) {
  const b = document.createElement('button');
  b.className = 'star-btn';
  b.setAttribute('aria-label', i + ' sao');
  b.innerHTML = `<svg viewBox="0 0 24 24"><path d="${STAR}"/></svg><span>${i}</span>`;
  b.addEventListener('mouseenter', () => paint(i));
  b.addEventListener('click', () => {
    rating = (rating === i) ? 0 : i;
    paint(rating);
    rateMsg.textContent = rating ? `Bạn đã chấm ${rating}/5 sao. Cảm ơn bạn!` : '';
  });
  starsBox.appendChild(b);
}
starsBox.addEventListener('mouseleave', () => paint(rating));
function paint(n) {
  [...starsBox.children].forEach((b, idx) => b.classList.toggle('lit', idx < n));
}

/* ---- Hội nghị liên quan ---- */
const related = [
  {s:'ICCV 2025', n:'IEEE/CVF International Conference on Computer Vision', t:['computer vision','deep learning','3D vision'], d:45, r:'A', c:['#c9863f','#3b5f8f']},
  {s:'ECCV 2026', n:'European Conference on Computer Vision', t:['computer vision','representation learning','AI'], d:78, r:'A', c:['#b5651d','#5b86b5']},
  {s:'WACV 2026', n:'IEEE/CVF Winter Conference on Applications of Computer Vision', t:['computer vision','medical imaging','robotics'], d:112, r:'B', c:['#5f86b8','#c9d6e6']},
  {s:'NeurIPS 2026', n:'Conference on Neural Information Processing Systems', t:['machine learning','deep learning','AI'], d:60, r:'A', c:['#3a2f7d','#7a5cc4']},
  {s:'ICML 2026', n:'International Conference on Machine Learning', t:['machine learning','optimization','theory'], d:95, r:'A', c:['#1f6f6b','#4ab3a8']},
  {s:'AAAI 2027', n:'AAAI Conference on Artificial Intelligence', t:['artificial intelligence','reasoning','multimodal'], d:130, r:'A', c:['#8a2d4d','#d6728f']},
  {s:'BMVC 2026', n:'British Machine Vision Conference', t:['computer vision','pattern recognition','segmentation'], d:150, r:'B', c:['#2d4a8a','#7aa0d6']},
  {s:'ACCV 2026', n:'Asian Conference on Computer Vision', t:['computer vision','object detection','AI'], d:170, r:'B', c:['#a63a2b','#e59a6b']},
  {s:'MICCAI 2026', n:'Medical Image Computing and Computer Assisted Intervention', t:['medical imaging','deep learning','segmentation'], d:88, r:'A', c:['#1f5d8f','#6bb6d6']},
  {s:'ICLR 2027', n:'International Conference on Learning Representations', t:['representation learning','deep learning','generative'], d:105, r:'A', c:['#3d6b2e','#9bcf6a']},
  {s:'ICRA 2027', n:'IEEE International Conference on Robotics and Automation', t:['robotics','computer vision','control'], d:140, r:'A', c:['#555f6d','#a9b6c6']},
  {s:'ACM MM 2026', n:'ACM International Conference on Multimedia', t:['multimodal','video','retrieval'], d:72, r:'A', c:['#7a3d8f','#d68ad6']}
];
const grid = document.getElementById('relGrid');
grid.innerHTML = related.map((c, i) => `
  <article class="rc">
    <div class="thumb" style="background:linear-gradient(160deg,${c.c[1]},${c.c[0]})"><b>${c.s.replace(' ', '<br>')}</b></div>
    <div class="body">
      <h5>${c.s}</h5>
      <div class="full">${c.n}</div>
      <div class="tg">${c.t.map(x => `<span>${x}</span>`).join('')}</div>
      <div class="bottom">
        <button class="save-sm" data-i="${i}"><svg viewBox="0 0 24 24"><path d="${STAR}"/></svg>Lưu</button>
        <span class="rank">${c.r}</span>
      </div>
    </div>
    <span class="days">còn ${c.d}d</span>
  </article>`).join('');
grid.addEventListener('click', e => {
  const b = e.target.closest('.save-sm');
  if (!b) return;
  const on = b.classList.toggle('on');
  b.lastChild.textContent = on ? 'Đã lưu' : 'Lưu';
});

/* ================= TRANG ĐÁNH GIÁ ================= */
const viewDetail = document.getElementById('viewDetail');
const viewReviews = document.getElementById('viewReviews');
const openBox = document.getElementById('openReviews');
const backBtn = document.getElementById('backBtn');

function route() {
  const isRv = location.hash === '#danh-gia';
  viewDetail.hidden = isRv;
  viewReviews.hidden = !isRv;
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);
openBox.addEventListener('click', () => { location.hash = '#danh-gia'; });
openBox.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); location.hash = '#danh-gia'; } });
backBtn.addEventListener('click', () => {
  if (location.hash === '#danh-gia') location.hash = ''; else history.back();
});

/* Dữ liệu 128 đánh giá (cố định, tạo bằng bộ random có seed) */
function mulberry(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rand = mulberry(2026);
const pick = arr => arr[Math.floor(rand() * arr.length)];

// 60+44+17+4+3 = 128 đánh giá, tổng 538 sao -> trung bình 4.2
const DIST = {5: 60, 4: 44, 3: 17, 2: 4, 1: 3};
const stars = [];
for (const s in DIST) for (let k = 0; k < DIST[s]; k++) stars.push(+s);
for (let i = stars.length - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [stars[i], stars[j]] = [stars[j], stars[i]];
}

const TEXT = {
  5: ['Hội nghị rất uy tín, nội dung chất lượng cao, rất đáng để gửi bài.',
      'Tổ chức chuyên nghiệp, nhiều bài keynote hay và cơ hội kết nối tốt.',
      'Phản hồi của reviewer công tâm và rất hữu ích cho bài báo của mình.',
      'Workshop và tutorial rất bổ ích, đặc biệt cho người mới bắt đầu.',
      'Chất lượng bài báo thuộc hàng top, học hỏi được rất nhiều.',
      'Chương trình sắp xếp hợp lý, địa điểm tổ chức tuyệt vời.'],
  4: ['Hội nghị tốt nhưng tỷ lệ chấp nhận khá thấp, cần chuẩn bị kỹ.',
      'Chương trình phong phú, tuy nhiên các phiên poster hơi đông.',
      'Nội dung hay, chi phí tham dự hơi cao với sinh viên.',
      'Quy trình nộp bài rõ ràng, thời gian phản hồi hơi lâu.',
      'Rất đáng tham dự, chỉ tiếc lịch trình khá dày.'],
  3: ['Chất lượng không đồng đều giữa các phiên báo cáo.',
      'Số lượng bài quá nhiều nên khó theo dõi hết.',
      'Nhận xét của reviewer đôi khi chưa thật sự chi tiết.',
      'Hội nghị ổn nhưng mình kỳ vọng cao hơn một chút.'],
  2: ['Phản hồi từ reviewer ngắn và chưa thuyết phục.',
      'Quá đông, khó trao đổi trực tiếp với tác giả.'],
  1: ['Bài bị từ chối mà nhận xét quá chung chung.',
      'Chi phí cao, trải nghiệm không như mong đợi.']
};
const TAIL = ['Mình sẽ tiếp tục theo dõi các kỳ tiếp theo.', 'Nên đăng ký sớm để có giá tốt.',
              'Phần networking khá thú vị.', 'Hy vọng năm sau tổ chức tốt hơn nữa.', '', '', ''];

const reviews = stars.map((s, i) => ({
  name: 'guestname' + (i + 1),
  stars: s,
  text: (pick(TEXT[s]) + ' ' + (s >= 3 ? pick(TAIL) : '')).trim(),
  likes: Math.floor(rand() * 40),
  dislikes: Math.floor(rand() * 6),
  vote: null            // null | 'like' | 'dislike'
}));

/* Tóm tắt */
const total = reviews.length;
const avg = reviews.reduce((a, r) => a + r.stars, 0) / total;
document.getElementById('rvAvg').textContent = avg.toFixed(1);
document.getElementById('rvTotal').textContent = `${total} đánh giá`;
document.getElementById('rvListTitle').textContent = `Tất cả đánh giá (${total})`;
document.getElementById('rvStars').innerHTML = [1, 2, 3, 4, 5].map(n => {
  const filled = n <= Math.round(avg);
  return `<svg width="24" height="24" viewBox="0 0 24 24"><path d="${STAR}" fill="${filled ? '#0b1f6b' : 'none'}" stroke="#0b1f6b" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
}).join('');
document.getElementById('rvBars').innerHTML = [5, 4, 3, 2, 1].map(s => {
  const n = reviews.filter(r => r.stars === s).length;
  return `<div class="bar-row"><span>${s} sao</span><div class="track"><div class="fill" style="width:${n / total * 100}%"></div></div><span class="n">${n}</span></div>`;
}).join('');

/* Danh sách 128 đánh giá */
const THUMB = 'M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-2z';
const rvList = document.getElementById('rvList');
rvList.innerHTML = reviews.map((r, i) => {
  const hue = (i * 47) % 360;
  const starsHtml = [1, 2, 3, 4, 5].map(n => `<svg viewBox="0 0 24 24" class="${n <= r.stars ? 'f' : ''}"><path d="${STAR}"/></svg>`).join('');
  return `
  <article class="rv" data-i="${i}">
    <div class="av" style="background:hsl(${hue},70%,90%);color:hsl(${hue},45%,28%)">G${i + 1}</div>
    <div class="rv-body">
      <div class="rv-top"><b>${r.name}</b><span class="rv-stars" aria-label="${r.stars} sao">${starsHtml}</span></div>
      <p>${r.text}</p>
      <div class="rv-act">
        <button class="vt like" data-act="like" aria-pressed="false" aria-label="Thích"><svg viewBox="0 0 24 24"><path d="${THUMB}"/></svg><span>${r.likes}</span></button>
        <button class="vt dislike" data-act="dislike" aria-pressed="false" aria-label="Không thích"><svg viewBox="0 0 24 24"><path d="${THUMB}"/></svg><span>${r.dislikes}</span></button>
      </div>
    </div>
  </article>`;
}).join('');

/* Like / Dislike: chỉ chọn được một trong hai */
rvList.addEventListener('click', e => {
  const btn = e.target.closest('.vt');
  if (!btn) return;
  const item = btn.closest('.rv');
  const r = reviews[+item.dataset.i];
  const act = btn.dataset.act;
  const key = a => (a === 'like' ? 'likes' : 'dislikes');

  if (r.vote === act) {            // bấm lại nút đang bật -> tắt
    r[key(act)]--; r.vote = null;
  } else {
    if (r.vote) r[key(r.vote)]--;  // tắt nút còn lại
    r[key(act)]++; r.vote = act;
  }
  ['like', 'dislike'].forEach(a => {
    const b = item.querySelector('.vt.' + a);
    b.classList.toggle('on', r.vote === a);
    b.setAttribute('aria-pressed', r.vote === a);
    b.querySelector('span').textContent = r[key(a)];
  });
});

/* ================= LUỒNG SÁNG CHẠY THEO CHUỘT ================= */
(() => {
  if (matchMedia('(hover: none)').matches) return;          // thiết bị cảm ứng: bỏ qua
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const halo = document.querySelector('.fx-halo');
  const core = document.querySelector('.fx-core');
  const hero = document.querySelector('.hero');
  const body = document.body;

  // Thời hằng làm mượt (ms): nhỏ = bám sát chuột, lớn = trôi chậm hơn.
  // Muốn mượt/chậm hơn thì tăng số; muốn nhanh hơn thì giảm số.
  const TAU = { halo: 170, core: 65, hero: 120 };

  const target = { x: innerWidth / 2, y: innerHeight / 2 };
  const pos = { halo: { ...target }, core: { ...target }, hero: { ...target } };
  let raf = 0, last = 0, seen = false;

  function step(now) {
    const dt = Math.min(now - last, 50);                    // chống nhảy vọt khi tab bị treo
    last = now;
    let moving = false;
    for (const k in pos) {
      const p = pos[k];
      const a = reduce ? 1 : 1 - Math.exp(-dt / TAU[k]);    // không phụ thuộc tần số quét màn hình
      p.x += (target.x - p.x) * a;
      p.y += (target.y - p.y) * a;
      if (Math.abs(target.x - p.x) > 0.1 || Math.abs(target.y - p.y) > 0.1) moving = true;
    }
    halo.style.transform = `translate3d(${pos.halo.x}px,${pos.halo.y}px,0)`;
    core.style.transform = `translate3d(${pos.core.x}px,${pos.core.y}px,0)`;
    const r = hero.getBoundingClientRect();
    hero.style.setProperty('--mx', (pos.hero.x - r.left).toFixed(1) + 'px');
    hero.style.setProperty('--my', (pos.hero.y - r.top).toFixed(1) + 'px');
    raf = moving ? requestAnimationFrame(step) : 0;         // đứng yên thì dừng vòng lặp, không tốn CPU
  }
  const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(step); } };

  addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    target.x = e.clientX; target.y = e.clientY;
    if (!seen) {                                            // lần đầu: đặt ngay tại chuột, không bay từ giữa màn hình
      seen = true;
      for (const k in pos) pos[k] = { x: target.x, y: target.y };
    }
    body.classList.add('fx-on');

    const h = hero.getBoundingClientRect();
    hero.classList.toggle('hero-on', e.clientX >= h.left && e.clientX <= h.right && e.clientY >= h.top && e.clientY <= h.bottom);

    const el = e.target.closest && e.target.closest('.card, .rc, .rv');
    if (el) {
      const b = el.getBoundingClientRect();
      el.style.setProperty('--x', (e.clientX - b.left).toFixed(1) + 'px');
      el.style.setProperty('--y', (e.clientY - b.top).toFixed(1) + 'px');
    }
    kick();
  }, { passive: true });

  document.documentElement.addEventListener('mouseleave', () => {
    body.classList.remove('fx-on');
    hero.classList.remove('hero-on');
  });
  addEventListener('scroll', kick, { passive: true });      // cuộn trang thì vị trí trong hero cũng cập nhật
})();

route();
