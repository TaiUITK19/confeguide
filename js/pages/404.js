/**
 * ConfGuide — Logic Trang Báo lỗi 404 Not Found (js/pages/404.js)
 * Trang sử dụng: 404.html
 * Phụ thuộc: js/core/layout.js (window.ConfGuideUtils)
 * Chức năng:
 * - Phân tích ngữ cảnh lỗi (đường dẫn sai, liên kết hỏng, mã hội nghị sai hoặc thiếu ?id=).
 * - Gợi ý sửa lỗi gõ nhầm đường dẫn tới 9 trang hợp lệ của ConfGuide bằng Damerau-Levenshtein & alias.
 * - Tải dữ liệu hội nghị thực (fetch + fallback file:///) để gợi ý hội nghị gần khớp và 3 hội nghị tiêu biểu.
 * - Hỗ trợ tìm kiếm nhanh, quay lại an toàn và mở modal báo cáo liên kết hỏng.
 */

(function () {
  'use strict';

  /* ================= 1. HẰNG SỐ & DANH MỤC ĐỊNH TUYẾN HỢP LỆ ================= */

  const CONFERENCES_DATA_URL = 'data/conference_data.json';
  const RANK_ORDER = { 'A*': 0, A: 1, B: 2, C: 3 };

  /** Danh mục trang thật của ConfGuide phục vụ phát hiện gõ nhầm đường dẫn */
  const KNOWN_ROUTE_CATALOG = [
    { href: 'index.html', label: 'Trang chủ ConfGuide', aliases: ['home', 'trang-chu', 'trangchu', 'index', 'main'] },
    {
      href: 'search.html',
      label: 'Tra cứu hội nghị',
      aliases: ['search', 'tra-cuu', 'tracuu', 'tim-kiem', 'filter', 'conferences']
    },
    {
      href: 'detail.html',
      label: 'Chi tiết hội nghị',
      aliases: ['detail', 'details', 'chi-tiet', 'chitiet', 'conference']
    },
    {
      href: 'tracker.html',
      label: 'Theo dõi hội nghị',
      aliases: ['tracker', 'theo-doi', 'theodoi', 'saved', 'bookmark']
    },
    { href: 'profile.html', label: 'Hồ sơ cá nhân', aliases: ['profile', 'ho-so', 'hoso', 'account', 'tai-khoan'] },
    { href: 'about.html', label: 'Về chúng tôi', aliases: ['about', 've-chung-toi', 'gioi-thieu', 'info'] },
    { href: 'contact.html', label: 'Liên hệ & Đóng góp', aliases: ['contact', 'lien-he', 'lienhe', 'feedback'] },
    { href: 'login.html', label: 'Đăng nhập', aliases: ['login', 'signin', 'dang-nhap', 'dangnhap'] },
    { href: 'register.html', label: 'Đăng ký tài khoản', aliases: ['register', 'signup', 'dang-ky', 'dangky'] }
  ];

  /* ================= 2. HÀM TIỆN ÍCH CHUẨN HÓA & SO KHỚP MỜ ================= */

  /**
   * Lấy đối tượng tiện ích dùng chung từ window.ConfGuideUtils.
   * @returns {Object} Đối tượng ConfGuideUtils hoặc fallback an toàn.
   */
  function getNfUtils() {
    return window.ConfGuideUtils || {
      FALLBACK_CONFERENCES: [],
      escapeHtml: val => String(val ?? ''),
      slugify: text => String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      getConferenceId: c => String((c && c.id) || '').toLowerCase(),
      normalizeConference: c => c,
      extractConferenceRank: () => '',
      formatConferenceFee: () => 'Chưa cập nhật',
      formatConferenceEventDate: () => 'Chưa cập nhật',
      getNextDeadline: () => null,
      formatDeadlineVi: d => d || 'Chưa công bố'
    };
  }

  /**
   * Chuẩn hóa chuỗi thành dạng chữ thường không dấu để đối chiếu từ khóa và URL.
   * @param {string} rawText Chuỗi đầu vào.
   * @returns {string} Chuỗi đã bỏ dấu tiếng Việt và viết thường.
   */
  function normalizeCompareText(rawText) {
    return String(rawText || '')
      .toLowerCase()
      .replace(/đ/g, 'd')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Tính khoảng cách Damerau-Levenshtein tối ưu để gợi ý sửa lỗi gõ nhầm URL hoặc mã hội nghị.
   * @param {string} source Chuỗi nguồn đã chuẩn hóa.
   * @param {string} target Chuỗi đích đã chuẩn hóa.
   * @returns {number} Số bước biến đổi tối thiểu.
   */
  function damerauLevenshtein(source, target) {
    const a = String(source || '');
    const b = String(target || '');
    const m = a.length;
    const n = b.length;
    if (!m) return n;
    if (!n) return m;

    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        let best = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          best = Math.min(best, dp[i - 2][j - 2] + 1);
        }
        dp[i][j] = best;
      }
    }
    return dp[m][n];
  }

  /* ================= 3. PHÂN TÍCH NGỮ CẢNH LỖI & GỢI Ý KHÔI PHỤC ================= */

  /**
   * Trích xuất ngữ cảnh lỗi từ tham số URL (`reason`, `from`, `id`) hoặc chính đường dẫn hiện tại.
   * @returns {{ reason: string, badTarget: string, confId: string }} Ngữ cảnh lỗi đã làm sạch.
   */
  function resolveErrorContext() {
    const params = new URLSearchParams(window.location.search);
    const reason = (params.get('reason') || '').trim().toLowerCase();
    const rawFrom = (params.get('from') || '').trim();
    const confId = (params.get('id') || '').trim();

    let badTarget = rawFrom;
    if (!badTarget) {
      const pathname = window.location.pathname || '';
      const lastSeg = pathname.split('/').filter(Boolean).pop() || '';
      if (lastSeg && lastSeg.toLowerCase() !== '404.html') {
        badTarget = `${pathname}${window.location.search || ''}`;
      }
    }
    return { reason, badTarget, confId };
  }

  /**
   * Cập nhật tiêu đề, mô tả và nhãn đường dẫn bị lỗi theo từng tình huống cụ thể.
   * @param {{ reason: string, badTarget: string, confId: string }} ctx Ngữ cảnh lỗi.
   */
  function applyErrorContextText(ctx) {
    const pillEl = document.querySelector('.js-nf-pill');
    const titleEl = document.querySelector('.js-nf-title');
    const descEl = document.querySelector('.js-nf-desc');
    const pathWrapEl = document.querySelector('.js-nf-path-wrap');
    const pathEl = document.querySelector('.js-nf-path');

    if (ctx.reason === 'conference' || ctx.reason === 'missing-id') {
      if (pillEl) pillEl.textContent = '404 • Không tìm thấy hội nghị';
      if (titleEl) titleEl.textContent = 'Không tìm thấy hội nghị bạn đang tìm';
      if (descEl) {
        descEl.textContent = ctx.confId
          ? `Không có hội nghị nào khớp với mã "${ctx.confId}" trong danh mục ConfGuide. `
            + 'Hãy kiểm tra gợi ý bên dưới hoặc quay lại trang Tra cứu.'
          : 'Đường dẫn chi tiết chưa có mã hội nghị (?id=...). '
            + 'Vui lòng chọn một hội nghị cụ thể từ trang Tra cứu.';
      }
    } else if (ctx.reason === 'broken-link') {
      if (pillEl) pillEl.textContent = '404 • Liên kết không tồn tại';
      if (titleEl) titleEl.textContent = 'Liên kết hoặc trang đích không tồn tại';
      if (descEl) {
        descEl.textContent = 'Liên kết bạn vừa mở bị hỏng hoặc trỏ đến một trang không có trong hệ thống ConfGuide.';
      }
    } else if (ctx.reason === 'invalid-redirect') {
      if (pillEl) pillEl.textContent = '404 • Đường dẫn chuyển hướng lỗi';
      if (titleEl) titleEl.textContent = 'Trang chuyển hướng yêu cầu không tồn tại';
      if (descEl) {
        descEl.textContent = 'Đường dẫn quay lại sau đăng nhập không khớp trang hợp lệ nào trên hệ thống.';
      }
    }

    if (ctx.badTarget && pathWrapEl && pathEl) {
      pathEl.textContent = ctx.badTarget;
      pathWrapEl.hidden = false;
    }
  }

  /**
   * Tìm tối đa 2 trang thật gần giống nhất với chuỗi đường dẫn lỗi mà người dùng đã truy cập.
   * @param {string} rawTarget Chuỗi URL hoặc tên tệp lỗi.
   * @returns {Array<{ href: string, label: string }>} Danh sách trang gợi ý phù hợp.
   */
  function findMatchingRoutes(rawTarget) {
    if (!rawTarget) return [];
    const cleanPath = String(rawTarget).split('?')[0].split('#')[0];
    const lastSeg = cleanPath.split('/').filter(Boolean).pop() || '';
    const stem = normalizeCompareText(lastSeg.replace(/\.html?$/i, ''));
    if (!stem || stem === '404') return [];

    const scored = [];
    KNOWN_ROUTE_CATALOG.forEach(route => {
      if (route.href === 'detail.html') return;
      let bestDist = Infinity;
      route.aliases.forEach(alias => {
        const normAlias = normalizeCompareText(alias);
        if (normAlias === stem) bestDist = 0;
        else if (normAlias.includes(stem) || stem.includes(normAlias)) bestDist = Math.min(bestDist, 1);
        else bestDist = Math.min(bestDist, damerauLevenshtein(stem, normAlias));
      });
      const threshold = Math.max(2, Math.floor(stem.length * 0.45));
      if (bestDist <= threshold) {
        scored.push({ route, score: bestDist });
      }
    });

    scored.sort((a, b) => a.score - b.score);
    return scored.slice(0, 2).map(item => item.route);
  }

  /**
   * Tìm tối đa 3 hội nghị thật gần khớp với mã lỗi (?id=...) hoặc đoạn đường dẫn cuối.
   * @param {Array<Object>} conferences Danh sách hội nghị đã chuẩn hóa.
   * @param {{ confId: string, badTarget: string }} ctx Ngữ cảnh lỗi.
   * @param {Object} utils ConfGuideUtils.
   * @returns {Array<Object>} Danh sách hội nghị gợi ý.
   */
  function findMatchingConferences(conferences, ctx, utils) {
    const fallbackSeg = String(ctx.badTarget || '')
      .split('?')[0].split('/').filter(Boolean).pop();
    const querySeed = ctx.confId || fallbackSeg || '';
    const normSeed = normalizeCompareText(querySeed.replace(/\.html?$/i, ''));
    if (!normSeed || normSeed === '404' || normSeed.length < 2) return [];

    const scored = [];
    conferences.forEach(conf => {
      const id = utils.getConferenceId ? utils.getConferenceId(conf) : '';
      const nameNorm = normalizeCompareText(conf.name);
      const idNorm = normalizeCompareText(id);
      if (!nameNorm && !idNorm) return;

      let dist = Infinity;
      if (idNorm.includes(normSeed) || normSeed.includes(idNorm) || nameNorm.includes(normSeed)) {
        dist = 0;
      } else {
        const firstWord = nameNorm.split('-')[0];
        dist = Math.min(
          damerauLevenshtein(normSeed, idNorm),
          damerauLevenshtein(normSeed, firstWord)
        );
      }
      if (dist <= 2) {
        scored.push({ conf, score: dist });
      }
    });

    scored.sort((a, b) => a.score - b.score);
    return scored.slice(0, 3).map(item => item.conf);
  }

  /**
   * Kết xuất hộp gợi ý sửa lỗi thông minh (trang đích hoặc hội nghị gần đúng) vào `.js-nf-suggestion`.
   * @param {Array<{ href: string, label: string }>} routes Trang gợi ý.
   * @param {Array<Object>} confMatches Hội nghị gợi ý.
   * @param {Object} utils ConfGuideUtils.
   */
  function renderSmartSuggestions(routes, confMatches, utils) {
    const box = document.querySelector('.js-nf-suggestion');
    if (!box) return;

    const esc = utils.escapeHtml || (val => String(val ?? ''));
    const linksHtml = [];

    routes.forEach(r => {
      linksHtml.push(
        `<a class="nf-suggestion__link" href="${esc(r.href)}">${esc(r.label)} (${esc(r.href)}) &rarr;</a>`
      );
    });

    confMatches.forEach(c => {
      const cid = utils.getConferenceId ? utils.getConferenceId(c) : '';
      if (!cid) return;
      linksHtml.push(
        `<a class="nf-suggestion__link" href="detail.html?id=${encodeURIComponent(cid)}">`
          + `Hội nghị ${esc(c.name)} &rarr;</a>`
      );
    });

    if (linksHtml.length === 0) {
      box.hidden = true;
      box.innerHTML = '';
      return;
    }

    box.innerHTML = `
      <p class="nf-suggestion__title">Có phải bạn đang muốn truy cập:</p>
      <div class="nf-suggestion__list">${linksHtml.join('')}</div>
    `;
    box.hidden = false;
  }

  /* ================= 4. TẢI DỮ LIỆU THỰC & KẾT XUẤT GỢI Ý HỘI NGHỊ ================= */

  /**
   * Tải danh sách hội nghị từ JSON kèm dự phòng `FALLBACK_CONFERENCES` khi mở qua `file:///`.
   * @param {Object} utils ConfGuideUtils.
   * @returns {Promise<Array<Object>>} Danh sách hội nghị đã chuẩn hóa.
   */
  async function loadNormalizedConferences(utils) {
    const fallback = Array.isArray(utils.FALLBACK_CONFERENCES) ? utils.FALLBACK_CONFERENCES : [];
    const normalize = typeof utils.normalizeConference === 'function' ? utils.normalizeConference : item => item;

    try {
      const data = typeof utils.fetchJsonCached === 'function'
        ? await utils.fetchJsonCached(CONFERENCES_DATA_URL)
        : await fetch(CONFERENCES_DATA_URL).then(res => {
          if (!res.ok) throw new Error(res.status);
          return res.json();
        });
      if (Array.isArray(data) && data.length > 0) {
        return data.map(normalize).filter(Boolean);
      }
    } catch {
      // Dự phòng cục bộ khi chạy qua giao thức file:/// hoặc lỗi mạng
    }
    return fallback.map(normalize).filter(Boolean);
  }

  /**
   * Lấy trọng số sắp xếp của Rank CORE để ưu tiên hội nghị hạng cao hơn.
   * @param {Object} conf Dữ liệu hội nghị đã chuẩn hóa.
   * @param {Object} utils ConfGuideUtils.
   * @returns {number} Trọng số (nhỏ hơn đứng trước).
   */
  function getFeaturedRankWeight(conf, utils) {
    const raw = typeof utils.extractConferenceRank === 'function'
      ? utils.extractConferenceRank(conf.rank).toUpperCase()
      : '';
    return Object.prototype.hasOwnProperty.call(RANK_ORDER, raw) ? RANK_ORDER[raw] : 99;
  }

  /**
   * Tạo HTML cho một thẻ hội nghị tiêu biểu trên trang 404.
   * @param {Object} conf Dữ liệu hội nghị.
   * @param {Object} utils ConfGuideUtils.
   * @returns {string} Chuỗi HTML thẻ hội nghị.
   */
  function buildFeaturedCardHtml(conf, utils) {
    const esc = utils.escapeHtml || (val => String(val ?? ''));
    const confId = utils.getConferenceId ? utils.getConferenceId(conf) : '';
    const rawRank = typeof utils.extractConferenceRank === 'function'
      ? utils.extractConferenceRank(conf.rank).trim().toUpperCase()
      : '';
    const hasRank = Boolean(rawRank && !/^UNRANKED$/i.test(rawRank));
    const rankLabel = hasRank
      ? (/^(A\*|A|B|C)$/.test(rawRank) ? `Rank ${rawRank}` : rawRank)
      : 'Chưa xếp hạng';
    const rankModCls = hasRank ? '' : ' nf-conf-card__rank--unranked';
    const fullName = String(conf.fullName || conf.full_name || '').trim();
    const locationText = String(conf.location || '').trim() || 'Chưa cập nhật địa điểm';
    const eventDateText = typeof utils.formatConferenceEventDate === 'function'
      ? utils.formatConferenceEventDate(conf)
      : 'Chưa cập nhật';
    const feeText = typeof utils.formatConferenceFee === 'function'
      ? utils.formatConferenceFee(conf)
      : 'Chưa cập nhật';
    const fullNameHtml = fullName && fullName !== conf.name
      ? `<p class="nf-conf-card__fullname">${esc(fullName)}</p>`
      : '';

    return `
      <article class="nf-conf-card card-surface">
        <div>
          <div class="nf-conf-card__head">
            <h3 class="nf-conf-card__name">${esc(conf.name)}</h3>
            <span class="nf-conf-card__rank${rankModCls}">${esc(rankLabel)}</span>
          </div>
          ${fullNameHtml}
        </div>
        <div class="nf-conf-card__meta">
          <div class="nf-conf-card__meta-row">
            <span>Địa điểm: ${esc(locationText)}</span>
          </div>
          <div class="nf-conf-card__meta-row">
            <span>Thời gian: ${esc(eventDateText)}</span>
          </div>
          <div class="nf-conf-card__meta-row">
            <span>Lệ phí: ${esc(feeText)}</span>
          </div>
        </div>
        <a class="btn btn-secondary nf-conf-card__link"
          href="detail.html?id=${encodeURIComponent(confId)}">
          <span>Xem chi tiết &rarr;</span>
        </a>
      </article>
    `;
  }

  /**
   * Kết xuất 3 thẻ hội nghị thực có Rank CORE / hạn nộp mở gần nhất xuống `.js-nf-featured-section`.
   * @param {Array<Object>} conferences Danh sách hội nghị đã chuẩn hóa.
   * @param {Object} utils ConfGuideUtils.
   */
  function renderFeaturedConferences(conferences, utils) {
    const section = document.querySelector('.js-nf-featured-section');
    const grid = document.querySelector('.js-nf-featured-grid');
    if (!section || !grid || !Array.isArray(conferences) || conferences.length === 0) return;

    const ranked = conferences.slice().sort((a, b) => {
      const dlA = typeof utils.getNextDeadline === 'function' ? utils.getNextDeadline(a) : null;
      const dlB = typeof utils.getNextDeadline === 'function' ? utils.getNextDeadline(b) : null;
      const openA = dlA && !dlA.isPassed ? 0 : 1;
      const openB = dlB && !dlB.isPassed ? 0 : 1;
      if (openA !== openB) return openA - openB;

      const weightDiff = getFeaturedRankWeight(a, utils) - getFeaturedRankWeight(b, utils);
      if (weightDiff !== 0) return weightDiff;

      return String(a.name || '').localeCompare(String(b.name || ''), 'vi', { sensitivity: 'base' });
    }).slice(0, 3);

    grid.innerHTML = ranked.map(conf => buildFeaturedCardHtml(conf, utils)).join('');
    section.hidden = false;
  }

  /* ================= 5. GẮN SỰ KIỆN TƯƠNG TÁC TRÊN TRANG 404 ================= */

  /**
   * Gắn sự kiện kiểm tra rỗng và điều hướng cho form tìm kiếm nhanh trên trang 404.
   * @param {{ confId: string }} ctx Ngữ cảnh lỗi 404.
   */
  function bindQuickSearchForm(ctx) {
    const searchForm = document.querySelector('.js-nf-search-form');
    const searchInput = document.querySelector('.js-nf-search-input');
    const searchError = document.querySelector('.js-nf-search-error');
    if (!searchForm || !searchInput) return;

    if (ctx.confId && !searchInput.value) searchInput.value = ctx.confId;
    searchInput.addEventListener('input', () => {
      if (searchError) {
        searchError.textContent = '';
        searchError.hidden = true;
      }
      searchInput.removeAttribute('aria-invalid');
    });

    searchForm.addEventListener('submit', e => {
      e.preventDefault();
      const q = searchInput.value.trim();
      if (!q) {
        if (searchError) {
          searchError.textContent = 'Vui lòng nhập từ khóa tên hội nghị hoặc lĩnh vực muốn tìm.';
          searchError.hidden = false;
        }
        searchInput.setAttribute('aria-invalid', 'true');
        searchInput.focus();
        return;
      }
      const targetUrl = `search.html?q=${encodeURIComponent(q)}`;
      const pt = window.ConfGuidePageTransition;
      if (pt && typeof pt.navigate === 'function') {
        pt.navigate(targetUrl, { searchFocus: true });
      } else {
        window.location.href = targetUrl;
      }
    });
  }

  /**
   * Gắn sự kiện form tìm kiếm nhanh, nút quay lại và nút báo cáo liên kết hỏng.
   * @param {{ reason: string, badTarget: string, confId: string }} ctx Ngữ cảnh lỗi.
   * @param {Object} utils ConfGuideUtils.
   */
  function bindNotFoundInteractions(ctx, utils) {
    bindQuickSearchForm(ctx);

    const backBtn = document.querySelector('.js-nf-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.assign('index.html');
        }
      });
    }

    const reportBtn = document.querySelector('.js-nf-report-btn');
    if (reportBtn) {
      reportBtn.addEventListener('click', () => {
        if (typeof utils.openReportModal === 'function') {
          utils.openReportModal({
            category: 'Link website bị hỏng',
            confName: ctx.confId || '',
            title: 'Báo cáo lỗi đường dẫn 404 trên ConfGuide',
            description: ctx.badTarget
              ? `Gặp lỗi 404 khi truy cập đường dẫn: ${ctx.badTarget}`
              : `Gặp lỗi 404 tại: ${window.location.href}`
          });
        } else {
          window.location.assign('contact.html');
        }
      });
    }
  }

  /**
   * Điểm khởi chạy duy nhất cho trang 404 Not Found khi DOM sẵn sàng.
   */
  async function initNotFoundPage() {
    const utils = getNfUtils();
    const ctx = resolveErrorContext();

    applyErrorContextText(ctx);
    bindNotFoundInteractions(ctx, utils);

    const routeMatches = findMatchingRoutes(ctx.badTarget);
    const conferences = await loadNormalizedConferences(utils);
    const confMatches = findMatchingConferences(conferences, ctx, utils);

    renderSmartSuggestions(routeMatches, confMatches, utils);
    renderFeaturedConferences(conferences, utils);
  }

  document.addEventListener('DOMContentLoaded', initNotFoundPage);
})();
