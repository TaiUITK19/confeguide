/**
 * ConfGuide — Module Điều phối Hiệu ứng Chuyển trang (js/core/page-transition.js)
 * Trang sử dụng: Mọi trang HTML (tải trực tiếp trong <head> trước khi render để tránh FOUC)
 * Phụ thuộc: Không (hoạt động độc lập; phối hợp với css/base/transition.css và #searchForm)
 * Chức năng:
 * - Nhánh 1 (Native Cross-Document View Transitions): Chỉ chạy cho cặp
 *   index.html <-> search.html (2 trang duy nhất khai báo @view-transition) để
 *   morph thanh tìm kiếm; khóa đứng yên site-nav và dọn class theo transition.finished.
 * - Nhánh 2 (WAAPI + CSS Keyframes): Cho toàn bộ các cặp trang còn lại, trình duyệt
 *   chưa hỗ trợ @view-transition (Firefox) và giao thức file:///. Thanh nav luôn giữ
 *   nguyên trong DOM sống nên backdrop-filter không bao giờ bị đóng băng hay mờ đục;
 *   chỉ <main> chạy animation ra ngắn (130ms, WAAPI) và vào (270ms, CSS keyframes).
 */
(function () {
  'use strict';

  /* ================= 1. HẰNG SỐ & TRẠNG THÁI MODULE ================= */

  const STORAGE_META_KEY = 'confguide_vt_meta';
  const STORAGE_SEARCH_FOCUS_KEY = 'confguide_vt_search_focus';
  const MAX_META_AGE_MS = 8000;
  const WAAPI_EXIT_MS = 130;
  const WAAPI_SAFETY_CAP_MS = 240;
  const ENTER_SETTLE_CAP_MS = 340;
  const VT_FAILSAFE_MS = 2000;

  const TRANSIENT_CLASSES = [
    'vt-forward', 'vt-back', 'vt-fade', 'vt-search-morph',
    'vt-search-to-results', 'vt-disable-search-bar', 'is-entering', 'is-leaving'
  ];

  // Thứ tự trang theo thanh điều hướng chính (0 -> 4) để suy luận hướng trượt trái/phải
  const NAV_ORDER = {
    'index.html': 0,
    'search.html': 1,
    'detail.html': 2,
    'tracker.html': 3,
    'about.html': 4
  };

  const NON_HTML_EXT_RE = /\.(pdf|zip|rar|7z|ics|json|csv|xml|png|jpe?g|webp|gif|svg|ico|mp4|mp3|webm)$/i;
  const isFileProtocol = window.location.protocol === 'file:';

  // Phát hiện đúng Cross-Document View Transitions theo PageRevealEvent / @view-transition
  // (không dùng document.startViewTransition vì chỉ đại diện cho SPA trong cùng tài liệu)
  const hasAtViewTransition = typeof CSS !== 'undefined'
    && typeof CSS.supports === 'function'
    && CSS.supports('at-rule(@view-transition)');

  const hasCrossDocViewTransition = !isFileProtocol
    && ('PageRevealEvent' in window || hasAtViewTransition)
    && 'onpageswap' in window
    && 'onpagereveal' in window;

  const rootEl = document.documentElement;
  let cleanupTimerId = null;
  let leaveTimerId = null;
  let activeLeaveAnim = null;
  let isNavigating = false;
  let entranceStarted = false;

  const domReadyPromise = new Promise(resolve => {
    if (document.readyState !== 'loading') resolve();
    else document.addEventListener('DOMContentLoaded', resolve, { once: true });
  });

  /* ================= 2. HÀM HỖ TRỢ URL, STORAGE & TRẠNG THÁI ================= */

  /**
   * Kiểm tra người dùng có bật tùy chọn giảm chuyển động hệ thống hay không.
   * @returns {boolean} True nếu `prefers-reduced-motion: reduce`.
   */
  function prefersReducedMotion() {
    return typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Rút trích tên tệp HTML chữ thường từ URL bất kỳ.
   * @param {string|URL} urlLike - Đường dẫn cần trích tên trang.
   * @returns {string} Tên tệp (ví dụ `index.html`, `search.html`).
   */
  function extractPageName(urlLike) {
    if (!urlLike) return '';
    try {
      const parsed = new URL(String(urlLike), window.location.href);
      const segments = parsed.pathname.split('/');
      return (segments[segments.length - 1] || 'index.html').toLowerCase();
    } catch (e) {
      return '';
    }
  }

  /**
   * Kiểm tra cặp trang có kích hoạt morph thanh tìm kiếm (`index.html <-> search.html`).
   * @param {string} fromPage - Trang nguồn.
   * @param {string} toPage - Trang đích.
   * @returns {boolean} True nếu là cặp tìm kiếm.
   */
  function isSearchMorphPair(fromPage, toPage) {
    return (fromPage === 'index.html' && toPage === 'search.html')
      || (fromPage === 'search.html' && toPage === 'index.html');
  }

  /**
   * Xác định class hướng trượt ('vt-forward', 'vt-back' hoặc 'vt-fade').
   * @param {string} fromPage - Tên trang nguồn.
   * @param {string} toPage - Tên trang đích.
   * @param {string} navType - Loại điều hướng ('push', 'traverse', 'reload').
   * @param {boolean|null} isHistoryBack - True nếu người dùng nhấn nút Back trên trình duyệt.
   * @returns {string} Tên class hướng chuyển trang.
   */
  function computeDirectionClass(fromPage, toPage, navType, isHistoryBack) {
    if (!fromPage || !toPage || fromPage === toPage) return 'vt-fade';
    const fromOrder = Object.prototype.hasOwnProperty.call(NAV_ORDER, fromPage) ? NAV_ORDER[fromPage] : -1;
    const toOrder = Object.prototype.hasOwnProperty.call(NAV_ORDER, toPage) ? NAV_ORDER[toPage] : -1;
    if (fromOrder !== -1 && toOrder !== -1) {
      if (toOrder > fromOrder) return 'vt-forward';
      if (toOrder < fromOrder) return 'vt-back';
    }
    if (navType === 'traverse' && typeof isHistoryBack === 'boolean') {
      return isHistoryBack ? 'vt-back' : 'vt-forward';
    }
    return 'vt-fade';
  }

  /**
   * Đọc đối tượng JSON từ sessionStorage một cách an toàn.
   * @param {string} key - Khóa lưu trữ trong sessionStorage.
   * @returns {Object|null} Dữ liệu đã parse hoặc null nếu lỗi.
   */
  function readSessionJson(key) {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Ghi đối tượng JSON vào sessionStorage một cách an toàn.
   * @param {string} key - Khóa lưu trữ.
   * @param {*} value - Giá trị cần tuần tự hóa JSON.
   */
  function writeSessionJson(key, value) {
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  /**
   * Xóa một khóa khỏi sessionStorage an toàn.
   * @param {string} key - Khóa cần xóa.
   */
  function removeSessionKey(key) {
    try { sessionStorage.removeItem(key); } catch (e) {}
  }

  /**
   * Gỡ toàn bộ class chuyển trang tạm thời và trạng thái will-change phát sinh.
   */
  function clearTransientClasses() {
    if (cleanupTimerId) {
      window.clearTimeout(cleanupTimerId);
      cleanupTimerId = null;
    }
    if (rootEl) {
      TRANSIENT_CLASSES.forEach(cls => rootEl.classList.remove(cls));
    }
  }

  /**
   * Hủy animation WAAPI đang chạy dở (nếu có) và đặt lại trạng thái điều hướng.
   */
  function resetNavigationState() {
    if (leaveTimerId) {
      window.clearTimeout(leaveTimerId);
      leaveTimerId = null;
    }
    if (activeLeaveAnim) {
      try { activeLeaveAnim.cancel(); } catch (e) {}
      activeLeaveAnim = null;
    }
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.style.opacity = '';
      mainEl.style.transform = '';
    }
    isNavigating = false;
  }

  /**
   * Đặt bộ đếm thời gian dự phòng để chắc chắn dọn sạch class chuyển trang nếu transition bị treo.
   * @param {number} delayMs - Độ trễ tối đa (ms).
   */
  function scheduleFailSafeCleanup(delayMs) {
    if (cleanupTimerId) window.clearTimeout(cleanupTimerId);
    cleanupTimerId = window.setTimeout(() => {
      cleanupTimerId = null;
      clearTransientClasses();
    }, delayMs);
  }

  /**
   * Thực thi callback ngay nếu tài liệu đang hiển thị, hoặc chờ kích hoạt từ prerender.
   * @param {Function} callback - Hàm thực thi khi trang thực sự kích hoạt.
   */
  function whenActivated(callback) {
    if (!document.prerendering) {
      callback();
      return;
    }
    document.addEventListener('prerenderingchange', callback, { once: true });
  }

  /**
   * Tiêu thụ cờ focus `#searchInput` sau khi nộp biểu mẫu tìm kiếm từ Trang chủ.
   * @returns {boolean} True nếu cờ hợp lệ và còn hạn sử dụng.
   */
  function consumeSearchFocusFlag() {
    const flag = readSessionJson(STORAGE_SEARCH_FOCUS_KEY);
    removeSessionKey(STORAGE_SEARCH_FOCUS_KEY);
    return Boolean(flag && typeof flag.ts === 'number' && (Date.now() - flag.ts) < MAX_META_AGE_MS);
  }

  /**
   * Đưa con trỏ vào cuối từ khóa trong `#searchInput` khi chuyển sang `search.html`.
   * @param {Promise<void>} settlePromise - Promise hoàn tất hiệu ứng vào trang.
   */
  function scheduleSearchInputFocus(settlePromise) {
    if (extractPageName(window.location.href) !== 'search.html') return;
    Promise.all([domReadyPromise, Promise.resolve(settlePromise).catch(() => {})]).then(() => {
      window.requestAnimationFrame(() => {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;
        try {
          searchInput.focus({ preventScroll: true });
          const len = searchInput.value ? searchInput.value.length : 0;
          if (typeof searchInput.setSelectionRange === 'function') {
            searchInput.setSelectionRange(len, len);
          }
        } catch (e) {}
      });
    });
  }

  /**
   * Đọc và tiêu thụ siêu dữ liệu chuyển trang còn hạn sử dụng từ sessionStorage.
   * @param {string} currentPage - Tên trang hiện tại để đối chiếu toPage.
   * @returns {Object|null} Siêu dữ liệu hợp lệ hoặc null.
   */
  function readFreshTransitionMeta(currentPage) {
    const meta = readSessionJson(STORAGE_META_KEY);
    removeSessionKey(STORAGE_META_KEY);
    if (!meta || typeof meta.ts !== 'number' || (Date.now() - meta.ts) > MAX_META_AGE_MS) return null;
    if (meta.toPage && meta.toPage !== currentPage) return null;
    return meta;
  }

  /**
   * Lấy loại điều hướng hiện tại qua Navigation Timing API ('navigate', 'reload', 'back_forward').
   * @returns {string} Loại điều hướng.
   */
  function getNavigationType() {
    const entries = typeof performance !== 'undefined' && typeof performance.getEntriesByType === 'function'
      ? performance.getEntriesByType('navigation')
      : [];
    return entries.length > 0 ? entries[0].type : 'navigate';
  }

  /**
   * Gắn class cho cặp View Transition thanh tìm kiếm (`index.html <-> search.html`).
   * @param {string} fromPage - Trang nguồn.
   * @param {string} toPage - Trang đích.
   * @param {string} dirClass - Class hướng trượt.
   */
  function applySearchMorphClasses(fromPage, toPage, dirClass) {
    clearTransientClasses();
    rootEl.classList.add(dirClass || 'vt-fade', 'vt-search-morph');
    if (fromPage === 'index.html' && toPage === 'search.html') {
      rootEl.classList.add('vt-search-to-results');
    }
  }

  /* ================= 3. SPECULATION RULES & BỘ LỌC LIÊN KẾT NỘI BỘ ================= */

  /**
   * Bơm Speculation Rules khi trình duyệt hỗ trợ (`prerender` moderate cho nav, `prefetch` cho trang khác).
   */
  function injectSpeculationRules() {
    if (isFileProtocol || !document.head) return;
    if (typeof HTMLScriptElement === 'undefined'
      || typeof HTMLScriptElement.supports !== 'function'
      || !HTMLScriptElement.supports('speculationrules')) {
      return;
    }
    if (document.querySelector('script[type="speculationrules"]')) return;

    const excludeSelector = [
      '.main-nav a[href]',
      'a[href*="profile.html"]',
      'a[href*="login.html"]',
      'a[href*="register.html"]',
      'a[target="_blank"]',
      'a[download]'
    ].join(', ');

    const rules = {
      prerender: [
        { where: { selector_matches: '.main-nav a[href]' }, eagerness: 'moderate' }
      ],
      prefetch: [
        {
          where: {
            and: [
              { selector_matches: 'a[href$=".html"], a[href*=".html?"]' },
              { not: { selector_matches: excludeSelector } }
            ]
          },
          eagerness: 'conservative'
        }
      ]
    };

    const scriptEl = document.createElement('script');
    scriptEl.type = 'speculationrules';
    scriptEl.textContent = JSON.stringify(rules);
    document.head.appendChild(scriptEl);
  }

  /**
   * Lọc liên kết nội bộ cùng origin hợp lệ để điều phối chuyển trang mượt.
   * @param {HTMLAnchorElement|null} link - Phần tử thẻ `<a>` vừa được nhấn.
   * @returns {URL|null} Đối tượng URL hợp lệ hoặc null nếu không áp dụng hiệu ứng.
   */
  function getEligibleInternalUrl(link) {
    if (!link || link.hasAttribute('download')) return null;
    const targetAttr = (link.getAttribute('target') || '').trim().toLowerCase();
    if (targetAttr && targetAttr !== '_self') return null;

    const rawHref = (link.getAttribute('href') || '').trim();
    const lowerHref = rawHref.toLowerCase();
    const isIgnoredScheme = !rawHref
      || rawHref.startsWith('#')
      || lowerHref.startsWith('mailto:')
      || lowerHref.startsWith('tel:')
      || lowerHref.startsWith('javascript:');
    if (isIgnoredScheme) return null;

    let targetUrl;
    try {
      targetUrl = new URL(link.href, window.location.href);
    } catch (e) {
      return null;
    }

    const validHttp = (targetUrl.protocol === 'http:' || targetUrl.protocol === 'https:')
      && targetUrl.origin === window.location.origin;
    if (isFileProtocol ? targetUrl.protocol !== 'file:' : !validHttp) return null;
    if (NON_HTML_EXT_RE.test(targetUrl.pathname)) return null;

    const stripIndex = p => p.replace(/\/index\.html$/i, '/');
    const samePath = extractPageName(targetUrl.href) === extractPageName(window.location.href)
      && stripIndex(targetUrl.pathname) === stripIndex(window.location.pathname);
    if (samePath && targetUrl.search === window.location.search) return null;

    return targetUrl;
  }

  /* ================= 4. ĐIỀU PHỐI HIỆU ỨNG RA / VÀO TRANG ================= */

  /**
   * Xác định transform đích khi rời trang theo hướng trượt.
   * @param {string} dirClass - Class hướng chuyển trang (`vt-forward`, `vt-back`, `vt-fade`).
   * @returns {string} Giá trị CSS `transform`.
   */
  function resolveExitTransform(dirClass) {
    if (dirClass === 'vt-forward') return 'translate3d(-18px, 0, 0)';
    if (dirClass === 'vt-back') return 'translate3d(18px, 0, 0)';
    return 'translate3d(0, -6px, 0)';
  }

  /**
   * Thực thi animation thoát trang ngắn trên `<main>` bằng Web Animations API
   * (nav không bao giờ vào snapshot hay bị gắn opacity/transform) rồi điều hướng.
   * @param {string} targetHref - URL đích cần điều hướng tới.
   * @param {Object} [options] - Tùy chọn thêm (`searchFocus`).
   */
  function navigateWithWaapiExit(targetHref, options) {
    if (isNavigating) return;
    isNavigating = true;

    const fromPage = extractPageName(window.location.href);
    const toPage = extractPageName(targetHref);
    const dirClass = computeDirectionClass(fromPage, toPage, 'push', null);

    if (options && options.searchFocus) writeSessionJson(STORAGE_SEARCH_FOCUS_KEY, { ts: Date.now() });
    writeSessionJson(STORAGE_META_KEY, { fromPage, toPage, dirClass, navType: 'push', ts: Date.now() });

    const mainEl = document.querySelector('main');
    if (prefersReducedMotion() || !mainEl || typeof mainEl.animate !== 'function') {
      window.location.href = targetHref;
      return;
    }

    clearTransientClasses();
    rootEl.classList.add(dirClass, 'is-leaving');

    let committed = false;
    const commitNavigation = () => {
      if (committed) return;
      committed = true;
      if (leaveTimerId) {
        window.clearTimeout(leaveTimerId);
        leaveTimerId = null;
      }
      window.location.href = targetHref;
    };

    try {
      activeLeaveAnim = mainEl.animate(
        [{ opacity: 1, transform: 'translate3d(0, 0, 0)' }, { opacity: 0, transform: resolveExitTransform(dirClass) }],
        { duration: WAAPI_EXIT_MS, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' }
      );
      activeLeaveAnim.finished.then(commitNavigation, commitNavigation);
    } catch (e) {
      commitNavigation();
      return;
    }

    // Timeout an toàn đảm bảo điều hướng không bao giờ bị kẹt nếu animation bị treo
    leaveTimerId = window.setTimeout(commitNavigation, WAAPI_SAFETY_CAP_MS);
  }

  /**
   * Chạy animation vào trang (`<main>` dùng CSS keyframes) cho nhánh không phải View Transition.
   */
  function startMainEntranceAnimation() {
    if (entranceStarted) return;
    entranceStarted = true;

    const currentPage = extractPageName(window.location.href);
    const isReload = getNavigationType() === 'reload';
    const meta = readFreshTransitionMeta(currentPage);
    const shouldFocusSearch = consumeSearchFocusFlag();

    if (isReload || prefersReducedMotion() || !meta) {
      clearTransientClasses();
      if (shouldFocusSearch && currentPage === 'search.html') scheduleSearchInputFocus(Promise.resolve());
      return;
    }

    clearTransientClasses();
    rootEl.classList.add('is-entering', meta.dirClass || 'vt-fade');

    const enterSettlePromise = new Promise(resolve => {
      let settled = false;
      const finishEnter = () => {
        if (settled) return;
        settled = true;
        clearTransientClasses();
        resolve();
      };

      scheduleFailSafeCleanup(ENTER_SETTLE_CAP_MS);
      window.setTimeout(finishEnter, ENTER_SETTLE_CAP_MS);

      domReadyPromise.then(() => {
        const mainEl = document.querySelector('main');
        if (!mainEl) return;
        mainEl.addEventListener('animationend', event => {
          if (event.target === mainEl) finishEnter();
        }, { once: true });
      });
    });

    if (shouldFocusSearch && currentPage === 'search.html') {
      scheduleSearchInputFocus(enterSettlePromise);
    }
  }

  /**
   * Suy luận có phải thao tác quay lại lịch sử duyệt web từ activation của View Transition không.
   * @param {Object|null} act - Đối tượng NavigationActivation.
   * @returns {boolean|null} True nếu quay lại, false nếu đi tới, null nếu không xác định.
   */
  function isHistoryTraverseBack(act) {
    const fromIdx = act && act.from ? act.from.index : null;
    const toIdx = act && act.entry ? act.entry.index : null;
    return typeof fromIdx === 'number' && typeof toIdx === 'number' ? toIdx < fromIdx : null;
  }

  /**
   * Xử lý sự kiện `pageswap` ngay trước khi rời tài liệu cũ trong Cross-Document View Transition.
   * @param {PageSwapEvent} event - Sự kiện `pageswap`.
   */
  function handlePageSwap(event) {
    if (!event.viewTransition) return;
    if (event.viewTransition.ready) event.viewTransition.ready.catch(() => {});
    if (event.viewTransition.finished) event.viewTransition.finished.catch(() => {});

    const act = event.activation || null;
    const fromPage = extractPageName(window.location.href);
    const toPage = extractPageName(act && act.entry ? act.entry.url : '');
    const navType = act ? act.navigationType : 'push';

    if (navType === 'reload' || prefersReducedMotion() || !isSearchMorphPair(fromPage, toPage)) {
      removeSessionKey(STORAGE_META_KEY);
      clearTransientClasses();
      if (typeof event.viewTransition.skipTransition === 'function') event.viewTransition.skipTransition();
      return;
    }

    const dirClass = computeDirectionClass(fromPage, toPage, navType, isHistoryTraverseBack(act));
    writeSessionJson(STORAGE_META_KEY, { fromPage, toPage, dirClass, navType, ts: Date.now() });
    clearTransientClasses();
    rootEl.classList.add(dirClass, 'vt-search-morph');
    if (event.viewTransition.types && typeof event.viewTransition.types.add === 'function') {
      event.viewTransition.types.add('search-morph');
    }
  }

  /**
   * Xử lý sự kiện `pagereveal` khi hiển thị tài liệu mới trong Cross-Document View Transition.
   * @param {PageRevealEvent} event - Sự kiện `pagereveal`.
   * @param {string} navEntryType - Loại điều hướng đọc được từ Navigation Timing.
   * @param {Object|null} earlyMeta - Siêu dữ liệu đọc sớm lúc `<head>` đang tải.
   */
  function handlePageReveal(event, navEntryType, earlyMeta) {
    const toPage = extractPageName(window.location.href);
    const act = event.activation || null;
    const navType = act ? act.navigationType : navEntryType;

    // Không phải Cross-Document VT (vd: đi từ trang khác sang): chạy hiệu ứng vào trang bằng keyframe
    if (!event.viewTransition) {
      whenActivated(startMainEntranceAnimation);
      return;
    }

    if (event.viewTransition.ready) event.viewTransition.ready.catch(() => {});
    const vtFinished = event.viewTransition.finished
      ? event.viewTransition.finished.catch(() => {})
      : Promise.resolve();

    const meta = readFreshTransitionMeta(toPage) || earlyMeta;
    const shouldFocusSearch = consumeSearchFocusFlag();
    const fromUrl = act && act.from ? act.from.url : '';
    const fromPage = fromUrl ? extractPageName(fromUrl) : (meta ? meta.fromPage : '');

    if (navType === 'reload' || prefersReducedMotion() || !isSearchMorphPair(fromPage, toPage)) {
      clearTransientClasses();
      if (typeof event.viewTransition.skipTransition === 'function') event.viewTransition.skipTransition();
      if (shouldFocusSearch && toPage === 'search.html') scheduleSearchInputFocus(Promise.resolve());
      return;
    }

    entranceStarted = true;
    const dirClass = computeDirectionClass(fromPage, toPage, navType, isHistoryTraverseBack(act));
    applySearchMorphClasses(fromPage, toPage, dirClass);
    if (event.viewTransition.types && typeof event.viewTransition.types.add === 'function') {
      event.viewTransition.types.add('search-morph');
    }

    // Chỉ dọn class sau khi event.viewTransition.finished giải quyết xong (không xóa non giữa chừng)
    const finishedPromise = vtFinished.finally(clearTransientClasses);
    if (shouldFocusSearch && toPage === 'search.html') {
      scheduleSearchInputFocus(finishedPromise);
    }
    scheduleFailSafeCleanup(VT_FAILSAFE_MS);
  }

  /**
   * Điều phối Cross-Document View Transitions cho cặp `index.html <-> search.html`.
   */
  function initViewTransitionEvents() {
    const currentPage = extractPageName(window.location.href);
    const navEntryType = getNavigationType();

    // Chỉ gán sớm class VT nếu không prerendering và meta xác nhận đúng cặp search morph
    let earlyMeta = null;
    if (!document.prerendering && navEntryType !== 'reload' && !prefersReducedMotion()) {
      const peek = readSessionJson(STORAGE_META_KEY);
      if (peek && typeof peek.ts === 'number' && (Date.now() - peek.ts) < MAX_META_AGE_MS
        && isSearchMorphPair(peek.fromPage, currentPage)
        && (!peek.toPage || peek.toPage === currentPage)) {
        earlyMeta = peek;
        applySearchMorphClasses(peek.fromPage, currentPage, peek.dirClass);
      }
    }

    window.addEventListener('pageswap', handlePageSwap);
    window.addEventListener('pagereveal', event => handlePageReveal(event, navEntryType, earlyMeta));
  }

  /**
   * Xử lý click vào liên kết nội bộ để quyết định dùng Cross-Document VT hoặc WAAPI exit.
   * @param {MouseEvent} event - Sự kiện click trên toàn tài liệu.
   */
  function handleInternalLinkClick(event) {
    const isModifiedClick = event.defaultPrevented || event.button !== 0
      || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    if (isModifiedClick) return;

    const anchor = event.target && typeof event.target.closest === 'function'
      ? event.target.closest('a[href]')
      : null;
    const targetUrl = getEligibleInternalUrl(anchor);
    if (!targetUrl) return;

    const toPage = extractPageName(targetUrl.href);
    const fromPage = extractPageName(window.location.href);

    // Chỉ để trình duyệt tự điều hướng cho @view-transition khi cả 2 đầu là cặp index <-> search
    if (hasCrossDocViewTransition && !prefersReducedMotion() && isSearchMorphPair(fromPage, toPage)) {
      return;
    }

    event.preventDefault();
    navigateWithWaapiExit(targetUrl.href);
  }

  /* ================= 5. KHỞI TẠO & XUẤT API TOÀN CỤC ================= */

  /**
   * Khởi tạo bộ điều phối hiệu ứng chuyển trang và gắn listener toàn cục.
   */
  function initPageTransitions() {
    const currentPage = extractPageName(window.location.href);
    if (hasCrossDocViewTransition) {
      initViewTransitionEvents();
    }

    const inSearchMorphSet = isSearchMorphPair(currentPage, 'search.html')
      || isSearchMorphPair(currentPage, 'index.html');
    if (!hasCrossDocViewTransition || !inSearchMorphSet) {
      whenActivated(startMainEntranceAnimation);
    } else if (!document.prerendering && getNavigationType() !== 'reload' && !prefersReducedMotion()) {
      // Trên index/search nhưng xuất phát từ một trang thứ ba (vd: about -> search), áp dụng entrance cho main
      const peek = readSessionJson(STORAGE_META_KEY);
      if (!peek || !isSearchMorphPair(peek.fromPage, currentPage)) {
        startMainEntranceAnimation();
      }
    }

    document.addEventListener('click', handleInternalLinkClick);

    // Khôi phục sạch trạng thái khi quay lại qua bfcache (Back/Forward) hoặc rời trang
    window.addEventListener('pageshow', event => {
      resetNavigationState();
      if (event.persisted) clearTransientClasses();
    });
    window.addEventListener('pagehide', resetNavigationState);

    whenActivated(() => {
      domReadyPromise.then(injectSpeculationRules);
    });
  }

  initPageTransitions();

  // API dùng chung cho biểu mẫu tìm kiếm ở Trang chủ (#searchForm)
  window.ConfGuidePageTransition = {
    hasNativeViewTransitions: hasCrossDocViewTransition,
    /**
     * Điều hướng có hiệu ứng tới một trang nội bộ (hỗ trợ giữ trạng thái focus vào #searchInput).
     * @param {string} targetUrl - URL trang đích.
     * @param {Object} [options] - Tùy chọn chuyển trang (`searchFocus`).
     */
    navigate: function (targetUrl, options) {
      if (!targetUrl) return;
      const fromPage = extractPageName(window.location.href);
      const toPage = extractPageName(targetUrl);
      if (options && options.searchFocus) {
        writeSessionJson(STORAGE_SEARCH_FOCUS_KEY, { ts: Date.now() });
      }
      if (hasCrossDocViewTransition && !prefersReducedMotion() && isSearchMorphPair(fromPage, toPage)) {
        window.location.href = targetUrl;
      } else {
        navigateWithWaapiExit(targetUrl, options);
      }
    }
  };
})();
