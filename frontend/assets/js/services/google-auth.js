/**
 * ConfGuide — Dịch vụ Xác thực Google phía Client (js/services/google-auth.js)
 * Trang sử dụng: login.html, register.html
 * Phụ thuộc: Không (hoạt động độc lập; hỗ trợ Google Identity Services trên HTTP/HTTPS và fallback file:///)
 * Chức năng: Quản lý cấu hình Google OAuth Client ID, tải Google Identity Services (gsi/client)
 * khi chạy qua HTTP/HTTPS, kích hoạt popup đăng nhập Gmail để lấy tên, email và ảnh đại diện.
 */

(function () {
  'use strict';

  /* ================= 1. CẤU HÌNH & HẰNG SỐ ================= */

  /**
   * Dán Google OAuth 2.0 Web Client ID mặc định của dự án tại đây nếu muốn áp dụng cho mọi trình duyệt.
   * Ví dụ: '1234567890-abcdefg.apps.googleusercontent.com'
   * Nếu để trống, người dùng có thể nhập trực tiếp Client ID trong modal Google trên trình duyệt (lưu localStorage).
   */
  const DEFAULT_GOOGLE_CLIENT_ID = '';
  const DEFAULT_BACKEND_API_BASE = 'http://localhost:3000';

  const CLIENT_ID_STORAGE_KEY = 'confguide_google_client_id';
  const BACKEND_URL_STORAGE_KEY = 'confguide_backend_url';
  const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
  const CLIENT_ID_PATTERN = /^[0-9]+-[a-zA-Z0-9_.-]+\.apps\.googleusercontent\.com$/;

  let gisLoadPromise = null;
  let initializedIdClientId = '';
  let latestIdSuccess = null;
  let latestIdError = null;
  let backendGoogleClientId = '';
  let backendConfigPromise = null;

  /* ================= 2. QUẢN LÝ CẤU HÌNH CLIENT ID & MÔI TRƯỜNG ================= */

  /**
   * Làm sạch chuỗi Google OAuth Client ID (bỏ khoảng trắng và dấu ngoặc kép thừa).
   * @param {*} rawId - Giá trị Client ID thô.
   * @returns {string} Chuỗi Client ID đã làm sạch.
   */
  function cleanClientIdValue(rawId) {
    return String(rawId || '')
      .trim()
      .replace(/^['"]+|['"]+$/g, '')
      .trim();
  }

  /**
   * Lấy URL gốc của backend Express (cùng origin trên Vercel hoặc cổng 3000, ngược lại trỏ sang cổng 3000 cục bộ).
   * @returns {string} URL backend không có dấu gạch chéo cuối.
   */
  function getBackendBaseUrl() {
    if (typeof window !== 'undefined' && typeof window.CONFGUIDE_API_BASE === 'string' && window.CONFGUIDE_API_BASE.trim()) {
      return window.CONFGUIDE_API_BASE.trim().replace(/\/+$/, '');
    }
    if (typeof window !== 'undefined' && window.location) {
      const { protocol, hostname, port, origin } = window.location;
      const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
      try {
        const saved = window.localStorage.getItem(BACKEND_URL_STORAGE_KEY);
        if (saved && saved.trim()) {
          const cleanSaved = saved.trim().replace(/\/+$/, '');
          const savedIsLocal = /^https?:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(cleanSaved);
          if (isLocalHost || !savedIsLocal) return cleanSaved;
        }
      } catch {
        // Bỏ qua lỗi đọc localStorage
      }
      if (protocol === 'http:' || protocol === 'https:') {
        // Khi chạy frontend qua Live Server / server tĩnh cục bộ (5500, 8000...), trỏ về backend cổng 3000
        const staticDevPorts = new Set(['5500', '5501', '5502', '8000', '8080', '4173', '5173']);
        if (isLocalHost && port && staticDevPorts.has(port)) {
          const apiHost = hostname === '[::1]' ? 'localhost' : hostname;
          return `http://${apiHost}:3000`;
        }
        // Khi chạy trên Vercel hoặc mở trực tiếp từ backend Express (cổng 3000 hoặc PORT tùy chỉnh), gọi API cùng origin
        return origin.replace(/\/+$/, '');
      }
    }
    try {
      const saved = window.localStorage.getItem(BACKEND_URL_STORAGE_KEY);
      if (saved && saved.trim()) return saved.trim().replace(/\/+$/, '');
    } catch {
      // Bỏ qua lỗi đọc localStorage
    }
    return DEFAULT_BACKEND_API_BASE;
  }

  /**
   * Kiểm tra trang có đang chạy qua giao thức HTTP hoặc HTTPS (hỗ trợ Google OAuth) hay không.
   * @returns {boolean} True nếu chạy trên http:// hoặc https://.
   */
  function isSupportedWebOrigin() {
    const protocol = typeof window !== 'undefined' && window.location ? window.location.protocol : '';
    return protocol === 'http:' || protocol === 'https:';
  }

  /**
   * Đọc Google OAuth Client ID hiện hành (ưu tiên giá trị lưu trong localStorage, hằng mặc định, rồi backend .env).
   * @returns {string} Chuỗi Client ID đã trim hoặc chuỗi rỗng nếu chưa cấu hình.
   */
  function getClientId() {
    try {
      const saved = window.localStorage.getItem(CLIENT_ID_STORAGE_KEY);
      if (saved && saved.trim()) return saved.trim();
    } catch {
      // Bỏ qua lỗi đọc localStorage
    }
    return String(DEFAULT_GOOGLE_CLIENT_ID || backendGoogleClientId || '').trim();
  }

  /**
   * Tải GOOGLE_CLIENT_ID công khai từ endpoint GET /api/auth/config của backend (không cache kết quả lỗi/rỗng).
   * @returns {Promise<{ ok: boolean, googleClientId: string, backendReachable: boolean, errorDetail?: string }>}
   */
  function fetchBackendAuthConfig() {
    if (!isSupportedWebOrigin()) {
      return Promise.resolve({
        ok: false,
        googleClientId: '',
        rawGoogleClientId: '',
        clientIdValidFormat: false,
        backendReachable: false
      });
    }
    if (backendGoogleClientId) {
      return Promise.resolve({
        ok: true,
        googleClientId: backendGoogleClientId,
        rawGoogleClientId: backendGoogleClientId,
        clientIdValidFormat: isValidClientIdFormat(backendGoogleClientId),
        backendReachable: true
      });
    }
    if (backendConfigPromise) return backendConfigPromise;

    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timeoutId = controller ? window.setTimeout(() => controller.abort(), 10000) : null;

    backendConfigPromise = fetch(`${getBackendBaseUrl()}/api/auth/config`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: controller ? controller.signal : undefined
    })
      .then(async res => {
        if (!res.ok) {
          return {
            ok: false,
            googleClientId: '',
            rawGoogleClientId: '',
            clientIdValidFormat: false,
            backendReachable: true
          };
        }
        const data = await res.json();
        const id = data && typeof data.googleClientId === 'string'
          ? cleanClientIdValue(data.googleClientId)
          : '';
        const validFormat = Boolean(id && isValidClientIdFormat(id));
        if (validFormat) {
          backendGoogleClientId = id;
        }
        return {
          ok: true,
          googleClientId: backendGoogleClientId,
          rawGoogleClientId: id,
          clientIdValidFormat: validFormat,
          backendReachable: true
        };
      })
      .catch(err => ({
        ok: false,
        googleClientId: '',
        rawGoogleClientId: '',
        clientIdValidFormat: false,
        backendReachable: false,
        errorDetail: err && err.message ? err.message : ''
      }))
      .finally(() => {
        if (timeoutId !== null) window.clearTimeout(timeoutId);
        // Xóa promise đang chạy để lần bấm sau luôn kiểm tra lại nếu backend vừa khởi động hoặc mới cập nhật .env
        backendConfigPromise = null;
      });

    return backendConfigPromise;
  }

  /**
   * Gửi ID Token JWT (`credential`) về backend POST /auth/google để xác thực bằng OAuth2Client.verifyIdToken.
   * Nếu backend chưa bật (lỗi mạng), fallback sang giải mã JWT cục bộ để không vỡ chế độ tĩnh.
   * @param {string} credential - Chuỗi JWT credential từ Google Sign-In.
   * @returns {Promise<Object>} Hồ sơ `{ name, email, picture, ... }`.
   */
  async function verifyCredentialWithBackend(credential) {
    const cleanToken = String(credential || '').trim();
    if (!cleanToken) {
      throw new Error('Thiếu mã xác thực Google (credential).');
    }

    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timeoutId = controller ? window.setTimeout(() => controller.abort(), 8000) : null;

    try {
      const response = await fetch(`${getBackendBaseUrl()}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ credential: cleanToken }),
        signal: controller ? controller.signal : undefined
      });

      let data = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (!response.ok) {
        throw new Error(data.message || `Backend từ chối xác thực Google (HTTP ${response.status}).`);
      }

      const normalized = normalizeGoogleProfile({
        name: data.name,
        email: data.email,
        picture: data.picture,
        email_verified: true
      });
      if (!normalized) {
        throw new Error('Backend không trả về thông tin Google hợp lệ.');
      }
      return Object.assign({}, normalized, {
        fullName: normalized.name,
        avatarUrl: normalized.picture,
        credential: cleanToken,
        verifiedByBackend: true
      });
    } catch (err) {
      // Nếu lỗi đến từ phản hồi backend (400/401/500), báo đúng lỗi; chỉ fallback khi không kết nối được mạng
      const isNetworkFailure = !err || err.name === 'TypeError' || err.name === 'AbortError';
      if (!isNetworkFailure) {
        throw err;
      }
      const payload = parseGoogleJwt(cleanToken);
      const fallbackProfile = normalizeGoogleProfile(payload);
      if (!fallbackProfile) {
        throw new Error('Không thể kết nối backend xác thực và không đọc được JWT Google.');
      }
      return Object.assign({}, fallbackProfile, {
        fullName: fallbackProfile.name,
        avatarUrl: fallbackProfile.picture,
        credential: cleanToken,
        verifiedByBackend: false
      });
    } finally {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    }
  }

  /**
   * Kiểm tra chuỗi Client ID có đúng định dạng Google OAuth Web Client ID hay không.
   * @param {string} rawId - Chuỗi Client ID cần kiểm tra.
   * @returns {boolean} True nếu hợp lệ.
   */
  function isValidClientIdFormat(rawId) {
    return CLIENT_ID_PATTERN.test(String(rawId || '').trim());
  }

  /**
   * Kiểm tra xem Google Sign-In thật có sẵn sàng hoạt động ở môi trường hiện tại hay không.
   * @returns {{ supportedOrigin: boolean, hasClientId: boolean, ready: boolean, origin: string }}
   */
  function getEnvironmentStatus() {
    const supportedOrigin = isSupportedWebOrigin();
    const clientId = getClientId();
    const hasClientId = Boolean(clientId);
    const origin = supportedOrigin && window.location ? window.location.origin : 'file://';
    return {
      supportedOrigin,
      hasClientId,
      ready: supportedOrigin && hasClientId,
      origin,
      clientId
    };
  }

  /* ================= 3. TẢI GOOGLE IDENTITY SERVICES & GIẢI MÃ HỒ SƠ ================= */

  /**
   * Nạp bất đồng bộ script Google Identity Services một lần duy nhất (chỉ chạy trên HTTP/HTTPS khi có Client ID).
   * @returns {Promise<boolean>} True nếu đối tượng `window.google.accounts` sẵn sàng.
   */
  function ensureGisLoaded() {
    if (!isSupportedWebOrigin()) {
      return Promise.resolve(false);
    }
    if (!getClientId()) {
      return Promise.resolve(false);
    }
    if (window.google && window.google.accounts && (window.google.accounts.id || window.google.accounts.oauth2)) {
      return Promise.resolve(true);
    }
    if (gisLoadPromise) return gisLoadPromise;

    gisLoadPromise = new Promise(resolve => {
      const finish = ok => {
        if (!ok) gisLoadPromise = null;
        resolve(ok);
      };

      const existing = document.querySelector(`script[src="${GIS_SCRIPT_URL}"]`);
      if (existing) {
        const state = existing.getAttribute('data-gis-state');
        if (state === 'loaded') {
          finish(Boolean(window.google && window.google.accounts && window.google.accounts.id));
          return;
        }
        if (state === 'error') {
          existing.remove();
        } else {
          const fallbackTimer = window.setTimeout(() => {
            finish(Boolean(window.google && window.google.accounts && window.google.accounts.id));
          }, 10000);
          existing.addEventListener('load', () => {
            window.clearTimeout(fallbackTimer);
            finish(Boolean(window.google && window.google.accounts && window.google.accounts.id));
          }, { once: true });
          existing.addEventListener('error', () => {
            window.clearTimeout(fallbackTimer);
            finish(false);
          }, { once: true });
          return;
        }
      }

      const script = document.createElement('script');
      script.src = GIS_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.setAttribute('data-gis-state', 'loading');

      const timeoutId = window.setTimeout(() => {
        script.setAttribute('data-gis-state', 'error');
        finish(Boolean(window.google && window.google.accounts && window.google.accounts.id));
      }, 10000);

      script.onload = () => {
        window.clearTimeout(timeoutId);
        script.setAttribute('data-gis-state', 'loaded');
        finish(Boolean(window.google && window.google.accounts && (window.google.accounts.id || window.google.accounts.oauth2)));
      };
      script.onerror = () => {
        window.clearTimeout(timeoutId);
        script.setAttribute('data-gis-state', 'error');
        finish(false);
      };
      document.head.appendChild(script);
    });

    return gisLoadPromise;
  }

  /**
   * Giải mã payload JWT (ID Token) trả về từ Google Sign-In bằng Base64URL sang đối tượng JSON.
   * @param {string} token - Chuỗi JWT `credential`.
   * @returns {Object|null} Payload chứa `sub`, `name`, `email`, `picture` hoặc null nếu lỗi.
   */
  function parseGoogleJwt(token) {
    if (!token || typeof token !== 'string') return null;
    try {
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      const binary = window.atob(padded);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const jsonText = new TextDecoder('utf-8').decode(bytes);
      return JSON.parse(jsonText);
    } catch {
      return null;
    }
  }

  /**
   * Chuẩn hóa hồ sơ Google Account nhận được từ JWT hoặc API `/oauth2/v3/userinfo`.
   * @param {Object|null} rawProfile - Dữ liệu thô từ Google.
   * @returns {{ sub: string, name: string, email: string, picture: string, emailVerified: boolean }|null}
   */
  function normalizeGoogleProfile(rawProfile) {
    if (!rawProfile || typeof rawProfile !== 'object') return null;
    const email = String(rawProfile.email || '').trim();
    const name = String(rawProfile.name || rawProfile.given_name || email.split('@')[0] || 'Người dùng Google').trim();
    const picture = String(rawProfile.picture || '').trim();
    if (!email && !name) return null;

    return {
      sub: String(rawProfile.sub || '').trim(),
      name,
      email,
      picture: /^https?:\/\//i.test(picture) ? picture : '',
      emailVerified: Boolean(rawProfile.email_verified)
    };
  }

  /* ================= 4. RENDER NÚT GOOGLE SIGN-IN CHÍNH THỨC ================= */

  /**
   * Render nút "Sign in with Google" chính thức (ID Token JWT) vào một phần tử DOM nếu GIS sẵn sàng.
   * @param {HTMLElement|null} containerEl - Phần tử chứa nút Google chính thức.
   * @param {(profile: Object) => void} onSuccess - Callback nhận hồ sơ Google đã giải mã từ JWT.
   * @param {(error: Error) => void} [onError] - Callback khi giải mã thất bại.
   * @returns {Promise<boolean>} True nếu render thành công.
   */
  async function renderOfficialGoogleButton(containerEl, onSuccess, onError) {
    if (!containerEl) return false;
    const status = getEnvironmentStatus();
    if (!status.ready) {
      containerEl.innerHTML = '';
      return false;
    }

    const loaded = await ensureGisLoaded();
    if (!loaded || !window.google || !window.google.accounts || !window.google.accounts.id) {
      return false;
    }

    try {
      latestIdSuccess = typeof onSuccess === 'function' ? onSuccess : null;
      latestIdError = typeof onError === 'function' ? onError : null;
      if (initializedIdClientId !== status.clientId) {
        window.google.accounts.id.initialize({
          client_id: status.clientId,
          callback: async response => {
            try {
              const credential = response && response.credential;
              if (!credential) {
                throw new Error('Google không trả về ID token (credential).');
              }
              const verifiedProfile = await verifyCredentialWithBackend(credential);
              if (typeof latestIdSuccess === 'function') latestIdSuccess(verifiedProfile);
            } catch (err) {
              if (typeof latestIdError === 'function') {
                latestIdError(err instanceof Error ? err : new Error('Không thể xác thực tài khoản Google.'));
              }
            }
          }
        });
        initializedIdClientId = status.clientId;
      }
      containerEl.innerHTML = '';
      const buttonWidth = Math.min(280, Math.max(220, Math.floor(containerEl.clientWidth) || 280));
      window.google.accounts.id.renderButton(containerEl, {
        theme: document.body.classList.contains('dark') ? 'filled_black' : 'outline',
        size: 'large',
        type: 'standard',
        shape: 'rectangular',
        text: 'continue_with',
        locale: 'vi',
        width: buttonWidth
      });
      return true;
    } catch (err) {
      if (typeof onError === 'function') {
        onError(err instanceof Error ? err : new Error('Không thể khởi tạo nút đăng nhập Google.'));
      }
      return false;
    }
  }

  window.ConfGuideGoogleAuth = {
    getBackendBaseUrl,
    fetchBackendAuthConfig,
    verifyCredentialWithBackend,
    getClientId,
    isValidClientIdFormat,
    isSupportedWebOrigin,
    getEnvironmentStatus,
    renderOfficialGoogleButton,
    parseGoogleJwt,
    normalizeGoogleProfile
  };
})();
