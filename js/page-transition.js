/* ==========================================================================
   CONFGUIDE — MODULE ĐIỀU PHỐI HIỆU ỨNG CHUYỂN TRANG (js/page-transition.js)
   - Nhánh 1 (Native MPA View Transitions): Dùng pageswap / pagereveal xác định
     hướng trượt theo nav và biến hình thanh tìm kiếm (index.html <-> search.html).
   - Nhánh 2 (Fallback): Trình duyệt chưa hỗ trợ @view-transition hoặc file:///
     dùng class is-leaving / is-entering; tuyệt đối không chạy chồng hai nhánh.
   ========================================================================== */
(function () {
  'use strict';

  const STORAGE_META_KEY = 'confguide_vt_meta';
  const STORAGE_SEARCH_FOCUS_KEY = 'confguide_vt_search_focus';
  const MAX_META_AGE_MS = 8000;
  const FALLBACK_LEAVE_MS = 180;
  const FALLBACK_ENTER_CLEANUP_MS = 460;

  const TRANSIENT_CLASSES = [
    'vt-forward', 'vt-back', 'vt-fade', 'vt-search-morph',
    'vt-search-to-results', 'vt-disable-search-bar', 'is-entering', 'is-leaving'
  ];

  // Thứ tự trang theo thanh điều hướng (0 -> 4) để suy luận hướng trượt trái/phải
  const NAV_ORDER = {
    'index.html': 0,
    'search.html': 1,
    'detail.html': 2,
    'tracker.html': 3,
    'about.html': 4
  };

  const NON_HTML_EXT_RE = /\.(pdf|zip|rar|7z|ics|json|csv|xml|png|jpe?g|webp|gif|svg|ico|mp4|mp3|webm)$/i;

  const isFileProtocol = window.location.protocol === 'file:';
  const hasViewTransitionApi = typeof document.startViewTransition === 'function'
    && typeof CSS !== 'undefined'
    && typeof CSS.supports === 'function'
    && CSS.supports('view-transition-name', 'site-nav');

  // Kiểm tra hỗ trợ Cross-Document View Transitions (@view-transition + pageswap/pagereveal)
  const hasCrossDocViewTransition = !isFileProtocol
    && hasViewTransitionApi
    && typeof CSSViewTransitionRule !== 'undefined'
    && 'onpageswap' in window
    && 'onpagereveal' in window;

  const rootEl = document.documentElement;
  let cleanupTimerId = null;
  let fallbackLeaveTimerId = null;
  let isNavigating = false;

  const domReadyPromise = new Promise(resolve => {
    if (document.readyState !== 'loading') resolve();
    else document.addEventListener('DOMContentLoaded', resolve, { once: true });
  });

  /** Kiểm tra người dùng có bật giảm chuyển động hay không. */
  function prefersReducedMotion() {
    return typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /** Rút trích tên tệp HTML chuẩn hóa (chữ thường) từ chuỗi URL. */
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

  /** Kiểm tra hai trang có tạo cặp biến hình thanh tìm kiếm (index.html <-> search.html). */
  function isSearchMorphPair(fromPage, toPage) {
    return (fromPage === 'index.html' && toPage === 'search.html')
      || (fromPage === 'search.html' && toPage === 'index.html');
  }

  /** Xác định class hướng trượt ('vt-forward', 'vt-back' hoặc 'vt-fade'). */
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

  function readSessionJson(key) {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function writeSessionJson(key, value) {
    try { sessionStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }

  function removeSessionKey(key) {
    try { sessionStorage.removeItem(key); } catch (e) {}
  }

  function clearTransientClasses() {
    if (!rootEl) return;
    TRANSIENT_CLASSES.forEach(cls => rootEl.classList.remove(cls));
  }

  function scheduleCleanup(delayMs) {
    if (cleanupTimerId) window.clearTimeout(cleanupTimerId);
    cleanupTimerId = window.setTimeout(() => {
      clearTransientClasses();
      cleanupTimerId = null;
    }, delayMs);
  }

  /** Tiêu thụ cờ xác nhận điều hướng từ biểu mẫu tìm kiếm ở Trang chủ. */
  function consumeSearchFocusFlag() {
    const flag = readSessionJson(STORAGE_SEARCH_FOCUS_KEY);
    removeSessionKey(STORAGE_SEARCH_FOCUS_KEY);
    return Boolean(flag && typeof flag.ts === 'number' && (Date.now() - flag.ts) < MAX_META_AGE_MS);
  }

  /** Focus vào #searchInput trên search.html và đặt con trỏ về cuối từ khóa sau chuyển trang. */
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

  /** Gắn class hướng và biến hình thanh tìm kiếm khi vào trang mới. */
  function applyArrivalStateClasses(fromPage, toPage, dirClass) {
    clearTransientClasses();
    rootEl.classList.add(dirClass || 'vt-fade');
    if (isSearchMorphPair(fromPage, toPage)) {
      rootEl.classList.add('vt-search-morph');
      if (fromPage === 'index.html' && toPage === 'search.html') {
        rootEl.classList.add('vt-search-to-results');
      }
    } else if (toPage === 'index.html' || toPage === 'search.html') {
      rootEl.classList.add('vt-disable-search-bar');
    }
  }

  /** Đọc siêu dữ liệu chuyển trang vừa lưu trước đó nếu còn hiệu lực. */
  function readFreshTransitionMeta(currentPage) {
    const meta = readSessionJson(STORAGE_META_KEY);
    removeSessionKey(STORAGE_META_KEY);
    if (!meta || typeof meta.ts !== 'number' || (Date.now() - meta.ts) > MAX_META_AGE_MS) return null;
    if (meta.toPage && meta.toPage !== currentPage) return null;
    return meta;
  }

  function getNavigationType() {
    const entries = typeof performance !== 'undefined' && typeof performance.getEntriesByType === 'function'
      ? performance.getEntriesByType('navigation')
      : [];
    return entries.length > 0 ? entries[0].type : 'navigate';
  }

  /** Nhánh 1: Điều phối Cross-Document View Transitions qua pageswap / pagereveal. */
  function initNativeViewTransitions() {
    const currentPage = extractPageName(window.location.href);
    const navEntryType = getNavigationType();
    const earlyMeta = readFreshTransitionMeta(currentPage);

    if (navEntryType !== 'reload' && earlyMeta && !prefersReducedMotion()) {
      applyArrivalStateClasses(earlyMeta.fromPage, currentPage, earlyMeta.dirClass);
    }
    scheduleCleanup(520);

    window.addEventListener('pageswap', event => {
      if (!event.viewTransition) return;
      const act = event.activation || null;
      const fromPage = extractPageName(window.location.href);
      const toPage = extractPageName(act && act.entry ? act.entry.url : '');
      const navType = act ? act.navigationType : 'push';

      if (navType === 'reload' || prefersReducedMotion()) {
        removeSessionKey(STORAGE_META_KEY);
        clearTransientClasses();
        if (typeof event.viewTransition.skipTransition === 'function') event.viewTransition.skipTransition();
        return;
      }

      const fromIdx = act && act.from ? act.from.index : null;
      const toIdx = act && act.entry ? act.entry.index : null;
      const isBack = typeof fromIdx === 'number' && typeof toIdx === 'number' ? toIdx < fromIdx : null;
      const dirClass = computeDirectionClass(fromPage, toPage, navType, isBack);

      writeSessionJson(STORAGE_META_KEY, { fromPage, toPage, dirClass, navType, ts: Date.now() });
      clearTransientClasses();
      rootEl.classList.add(dirClass);

      if (isSearchMorphPair(fromPage, toPage)) {
        rootEl.classList.add('vt-search-morph');
      } else if (fromPage === 'index.html' || fromPage === 'search.html') {
        rootEl.classList.add('vt-disable-search-bar');
      }
    });

    window.addEventListener('pagereveal', event => {
      const toPage = extractPageName(window.location.href);
      const act = event.activation || null;
      const navType = act ? act.navigationType : navEntryType;
      const shouldFocusSearch = consumeSearchFocusFlag();

      if (!event.viewTransition || navType === 'reload' || prefersReducedMotion()) {
        clearTransientClasses();
        if (event.viewTransition && navType === 'reload' && typeof event.viewTransition.skipTransition === 'function') {
          event.viewTransition.skipTransition();
        }
        if (shouldFocusSearch && toPage === 'search.html') scheduleSearchInputFocus(Promise.resolve());
        return;
      }

      const fromUrl = act && act.from ? act.from.url : '';
      const fromPage = fromUrl ? extractPageName(fromUrl) : (earlyMeta ? earlyMeta.fromPage : '');
      const fromIdx = act && act.from ? act.from.index : null;
      const toIdx = act && act.entry ? act.entry.index : null;
      const isBack = typeof fromIdx === 'number' && typeof toIdx === 'number' ? toIdx < fromIdx : null;
      const dirClass = computeDirectionClass(fromPage, toPage, navType, isBack);

      applyArrivalStateClasses(fromPage, toPage, dirClass);
      const finishedPromise = event.viewTransition.finished.finally(clearTransientClasses);
      if (shouldFocusSearch && toPage === 'search.html') scheduleSearchInputFocus(finishedPromise);
      scheduleCleanup(550);
    });

    window.addEventListener('pageshow', event => {
      if (event.persisted) clearTransientClasses();
    });
  }

  /** Lọc liên kết nội bộ hợp lệ cho nhánh fallback (bỏ qua tab mới, tải tệp, #anchor, ngoại trang). */
  function getEligibleInternalUrl(link) {
    if (!link || link.hasAttribute('download')) return null;
    const targetAttr = (link.getAttribute('target') || '').trim().toLowerCase();
    if (targetAttr && targetAttr !== '_self') return null;

    const rawHref = (link.getAttribute('href') || '').trim();
    const lowerHref = rawHref.toLowerCase();
    if (!rawHref || rawHref.startsWith('#') || lowerHref.startsWith('mailto:') || lowerHref.startsWith('tel:') || lowerHref.startsWith('javascript:')) {
      return null;
    }

    let targetUrl;
    try {
      targetUrl = new URL(link.href, window.location.href);
    } catch (e) {
      return null;
    }

    if (isFileProtocol) {
      if (targetUrl.protocol !== 'file:') return null;
    } else if ((targetUrl.protocol !== 'http:' && targetUrl.protocol !== 'https:') || targetUrl.origin !== window.location.origin) {
      return null;
    }

    if (NON_HTML_EXT_RE.test(targetUrl.pathname)) return null;

    const samePath = extractPageName(targetUrl.href) === extractPageName(window.location.href)
      && targetUrl.pathname.replace(/\/index\.html$/i, '/') === window.location.pathname.replace(/\/index\.html$/i, '/');
    if (samePath && targetUrl.search === window.location.search) return null;

    return targetUrl;
  }

  /** Thực thi hiệu ứng rời trang (is-leaving) rồi điều hướng ở nhánh fallback. */
  function navigateWithFallback(targetHref, options) {
    if (isNavigating) return;
    isNavigating = true;

    const fromPage = extractPageName(window.location.href);
    const toPage = extractPageName(targetHref);
    const dirClass = computeDirectionClass(fromPage, toPage, 'push', null);

    if (options && options.searchFocus) writeSessionJson(STORAGE_SEARCH_FOCUS_KEY, { ts: Date.now() });
    writeSessionJson(STORAGE_META_KEY, { fromPage, toPage, dirClass, navType: 'push', ts: Date.now() });

    if (prefersReducedMotion()) {
      window.location.href = targetHref;
      return;
    }

    clearTransientClasses();
    rootEl.classList.add(dirClass, 'is-leaving');
    fallbackLeaveTimerId = window.setTimeout(() => {
      fallbackLeaveTimerId = null;
      window.location.href = targetHref;
    }, FALLBACK_LEAVE_MS);
  }

  /** Nhánh 2: Fallback is-leaving / is-entering cho trình duyệt chưa hỗ trợ View Transitions. */
  function initFallbackTransitions() {
    const currentPage = extractPageName(window.location.href);
    const isReload = getNavigationType() === 'reload';
    const meta = readFreshTransitionMeta(currentPage);
    const shouldFocusSearch = consumeSearchFocusFlag();
    let enterSettlePromise = Promise.resolve();

    if (!isReload && !prefersReducedMotion()) {
      clearTransientClasses();
      rootEl.classList.add('is-entering', meta ? meta.dirClass : 'vt-fade');
      if (meta && meta.fromPage === 'index.html' && currentPage === 'search.html') {
        rootEl.classList.add('vt-search-to-results');
      }

      enterSettlePromise = new Promise(resolve => {
        const hasStagger = rootEl.classList.contains('vt-search-to-results');
        scheduleCleanup(FALLBACK_ENTER_CLEANUP_MS);
        domReadyPromise.then(() => {
          const mainEl = document.querySelector('main');
          if (!mainEl) return;
          mainEl.addEventListener('animationend', event => {
            if (event.target === mainEl && !hasStagger) {
              if (cleanupTimerId) {
                window.clearTimeout(cleanupTimerId);
                cleanupTimerId = null;
              }
              clearTransientClasses();
              resolve();
            }
          }, { once: true });
        });
        window.setTimeout(resolve, hasStagger ? 400 : 300);
      });
    }

    if (shouldFocusSearch && currentPage === 'search.html') {
      scheduleSearchInputFocus(enterSettlePromise);
    }

    document.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target && typeof event.target.closest === 'function' ? event.target.closest('a[href]') : null;
      const targetUrl = getEligibleInternalUrl(anchor);
      if (!targetUrl) return;
      event.preventDefault();
      navigateWithFallback(targetUrl.href);
    });

    window.addEventListener('pageshow', event => {
      if (fallbackLeaveTimerId) {
        window.clearTimeout(fallbackLeaveTimerId);
        fallbackLeaveTimerId = null;
      }
      isNavigating = false;
      if (event.persisted) clearTransientClasses();
    });

    window.addEventListener('pagehide', () => { isNavigating = false; });
  }

  if (hasCrossDocViewTransition) {
    initNativeViewTransitions();
  } else {
    initFallbackTransitions();
  }

  // API dùng chung cho biểu mẫu tìm kiếm ở Trang chủ và điều hướng nội bộ bằng JS
  window.ConfGuidePageTransition = {
    hasNativeViewTransitions: hasCrossDocViewTransition,
    navigate: function (targetUrl, options) {
      if (!targetUrl) return;
      if (options && options.searchFocus) writeSessionJson(STORAGE_SEARCH_FOCUS_KEY, { ts: Date.now() });
      if (hasCrossDocViewTransition) window.location.href = targetUrl;
      else navigateWithFallback(targetUrl, options);
    }
  };
})();
