/**
 * ConfGuide — Hệ thống Xác thực & Quản lý Người dùng (js/pages/auth.js)
 * Trang sử dụng: login.html, register.html
 * Phụ thuộc: Không (hoạt động độc lập; hỗ trợ đồng bộ với js/core/layout.js qua Storage)
 * Chức năng: Xử lý đăng nhập, đăng ký, băm mật khẩu SHA-256, nạp 20 tài khoản thử nghiệm
 * (fallback) và chuyển đổi mềm giữa login.html / register.html qua History API.
 */

(function () {
  'use strict';

  /* ================= 1. HẰNG SỐ & CẤU HÌNH ================= */

  const AUTH_API_BASE_URL = '';
  const REMEMBERED_EMAIL_KEY = 'confGuideRememberedEmail';
  const USERS_STORAGE_KEY = 'confguide_users';
  const CURRENT_USER_KEY = 'confguide_current_user';
  const REG_NOTICE_KEY = 'confGuideRegistrationNotice';
  const SEED_CREATED_AT = '2026-10-09T08:00:00.000Z';

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,}$/;
  const MIN_LOGIN_PASSWORD_LEN = 6;
  const AUTH_REDIRECT_DELAY_MS = 500;

  const PASSWORD_RULES = {
    length: value => value.length >= 8,
    upper: value => /[A-Z]/.test(value),
    lower: value => /[a-z]/.test(value),
    number: value => /[0-9]/.test(value)
  };

  /** Tạo bản ghi user thử nghiệm dạng gọn cho chế độ offline/static */
  const createSeedUser = (index, passwordHash) => {
    const padded = String(index).padStart(2, '0');
    return {
      id: `usr_${padded}`,
      username: `user${index}`,
      email: `user${index}@gmail.com`,
      name: `User ${index}`,
      role: 'user',
      passwordHash,
      createdAt: SEED_CREATED_AT
    };
  };

  // 20 tài khoản thử nghiệm dự phòng khi mở qua giao thức file:/// hoặc thiếu fetch
  const SEED_USERS = [
    createSeedUser(1, 'b9e53582d056cfbd012e904a2d67180d7720b84894b1ef18d030fa3f16a448c5'),
    createSeedUser(2, '9b914086e62359ca9d4e9ba7ec916d2b86997e636efd847e6da2c17ef7ce16fd'),
    createSeedUser(3, '3735ea5ceff922e67d0a2b71bbe24b75634a89421b17889059876c3381851bc3'),
    createSeedUser(4, '02ec675829326be7e15158cbc18758397d855d93de8cf3c50b5babcf6f2582a1'),
    createSeedUser(5, 'c2b7e250c5f202c542798fe7d969aff00303df57f4ed7fd5b4a78e1f45f82bd9'),
    createSeedUser(6, '388691d520f7a5bc71891351c5d1ff3b421fa9a78d78b1899f58e4ef3f6d116a'),
    createSeedUser(7, 'fcd7cdbbd3e547439a97f12674f3f81c5317476a5dae078e3a6504cd7da96808'),
    createSeedUser(8, 'd025c7d135909d1a2264a2ecb39518ca606baee1ae2820cce05ba4fd5b85e4c0'),
    createSeedUser(9, '7cb0e2366f20a782d3d347a979ad21aaaa0de742d0dab5c80201aee757941d48'),
    createSeedUser(10, '154a2d7df356edea51c8907c1766bbd2af5a008160991f50204b0f9607101c95'),
    createSeedUser(11, 'c4bb150c5a9d7673562dfbf41aa7142cd7cb15a17037c839986e0dff83fe5eb6'),
    createSeedUser(12, 'f2beef4edc4f7b8ff4cebbe8ad078485b24e78da2f03c735c1a09ad1a00a8142'),
    createSeedUser(13, 'a71a22ff4d6acd04449bc0f5c6fb98f8e52d83b0b3d222c6db4c18d1bc667507'),
    createSeedUser(14, 'db3be5a7355742e116d555496a4b93f4604286f111dba53b49912d4e8b9c11c1'),
    createSeedUser(15, '7c02f731eca21d4b16628e17b2aa49dc17f7ed801680ffa45806e98a83d331d1'),
    createSeedUser(16, 'a68a174404e2592f0760a63208ba7f60a8c37f303a49d0b3a55c28e8c1704a02'),
    createSeedUser(17, '8fa601033122d4b66480de3f7dec1682b51f973f0eac7812e04285d7c3e107f8'),
    createSeedUser(18, '99877aaa4ac9c5e63546dc8199f088422da61bef22da6ae0f2bcd8d3bbcfd93a'),
    createSeedUser(19, '7b1e9939b47c8799f2e48f96e902b6522fdcf495cdc875fe76aac33c1679ebff'),
    createSeedUser(20, 'bade2b88e7c6c6b8c1634748bc33dafe948c67bdb7780858f74044da60875cb9')
  ];

  let seedPromise = null;

  /* ================= 2. HÀM HỖ TRỢ STORAGE, BẢO MẬT & VALIDATE ================= */

  /**
   * Đọc giá trị JSON từ localStorage có bắt lỗi an toàn.
   * @param {string} key - Khóa cần đọc.
   * @param {*} fallback - Giá trị trả về khi không có hoặc JSON lỗi.
   * @returns {*} Dữ liệu đã giải mã hoặc giá trị mặc định.
   */
  function readJsonStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  /**
   * Đọc chuỗi thô từ một Storage (localStorage hoặc sessionStorage).
   * @param {Storage} storage - Đối tượng Storage.
   * @param {string} key - Khóa cần đọc.
   * @returns {string|null} Chuỗi đã lưu hoặc null.
   */
  function readTextStorage(storage, key) {
    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  }

  /**
   * Ghi chuỗi hoặc dữ liệu vào một Storage có kiểm soát ngoại lệ.
   * @param {Storage} storage - Đối tượng Storage.
   * @param {string} key - Khóa lưu trữ.
   * @param {string} value - Giá trị chuỗi cần lưu.
   */
  function writeTextStorage(storage, key, value) {
    try {
      storage.setItem(key, value);
    } catch {
      // Bỏ qua khi trình duyệt chặn ghi Storage (Private mode / quota)
    }
  }

  /**
   * Xóa một khóa khỏi Storage an toàn.
   * @param {Storage} storage - Đối tượng Storage.
   * @param {string} key - Khóa cần xóa.
   */
  function removeStorageKey(storage, key) {
    try {
      storage.removeItem(key);
    } catch {
      // Bỏ qua lỗi Storage
    }
  }

  const VALID_REDIRECT_PAGES = new Set([
    '', 'index.html', 'search.html', 'detail.html', 'tracker.html',
    'profile.html', 'about.html', 'contact.html'
  ]);

  /**
   * Kiểm tra và lọc đường dẫn chuyển hướng nội bộ sau khi đăng nhập để tránh open-redirect và kẹt lỗi 404.
   * @param {string|null} rawRedirect - Tham số redirect lấy từ query string.
   * @returns {string} Đường dẫn hợp lệ trên cùng nguồn (mặc định 'index.html').
   */
  function resolveSafeRedirect(rawRedirect) {
    if (!rawRedirect) return 'index.html';
    try {
      const decoded = decodeURIComponent(rawRedirect).trim();
      if (!decoded || /^(?:https?:)?\/\//i.test(decoded) || /^\s*javascript:/i.test(decoded)) {
        return 'index.html';
      }
      const parsed = new URL(decoded, window.location.href);
      const lastSeg = (parsed.pathname.split('/').pop() || 'index.html').toLowerCase();
      if (lastSeg === '404.html') return 'index.html';
      if (!VALID_REDIRECT_PAGES.has(lastSeg)) {
        return `404.html?reason=invalid-redirect&from=${encodeURIComponent(decoded)}`;
      }
      return decoded;
    } catch {
      return 'index.html';
    }
  }

  /**
   * Băm mật khẩu bằng SHA-256 thông qua Web Crypto API (kèm dự phòng khi môi trường không hỗ trợ).
   * @param {string} plainText - Mật khẩu dạng văn bản thuần.
   * @returns {Promise<string>} Chuỗi mã băm dạng hex hoặc chuỗi fallback.
   */
  async function hashPassword(plainText) {
    if (!plainText) return '';
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(plainText);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      // Web Crypto không khả dụng: dùng hàm băm dự phòng tương thích ngoại tuyến
      let hash = 0;
      for (let i = 0; i < plainText.length; i++) {
        hash = (hash << 5) - hash + plainText.charCodeAt(i);
        hash |= 0;
      }
      return String(Math.abs(hash));
    }
  }

  /**
   * Nạp dữ liệu tài khoản từ JSON (hoặc bộ fallback 20 user) vào localStorage mà không ghi đè user hiện có.
   * @returns {Promise<void>}
   */
  async function loadAndSeedUsers() {
    let sourceList = [];
    try {
      const response = await fetch('data/users.json');
      if (response.ok) {
        sourceList = await response.json();
      }
    } catch {
      // Trình duyệt chặn fetch khi chạy trực tiếp trên file:///
    }

    if (!Array.isArray(sourceList) || !sourceList.length) {
      sourceList = SEED_USERS;
    }

    const parsedUsers = readJsonStorage(USERS_STORAGE_KEY, []);
    const existingUsers = Array.isArray(parsedUsers) ? parsedUsers : [];
    let hasChanges = false;

    sourceList.forEach(seedUser => {
      const exists = existingUsers.some(u =>
        (u.email && seedUser.email && u.email.toLowerCase() === seedUser.email.toLowerCase()) ||
        (u.username && seedUser.username && u.username.toLowerCase() === seedUser.username.toLowerCase())
      );
      if (!exists) {
        existingUsers.push(seedUser);
        hasChanges = true;
      }
    });

    if (hasChanges || !readTextStorage(localStorage, USERS_STORAGE_KEY)) {
      writeTextStorage(localStorage, USERS_STORAGE_KEY, JSON.stringify(existingUsers));
    }
  }

  /**
   * Gửi yêu cầu đăng ký lên API máy chủ (chỉ chạy khi có AUTH_API_BASE_URL).
   * @param {string} name - Họ và tên người dùng.
   * @param {string} email - Địa chỉ email đăng ký.
   * @param {string} password - Mật khẩu người dùng nhập.
   * @returns {Promise<Object|null>} Kết quả phản hồi JSON hoặc null ở chế độ offline/static.
   */
  async function registerUser(name, email, password) {
    if (!AUTH_API_BASE_URL) return null;
    let response;
    try {
      response = await fetch(`${AUTH_API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
    } catch {
      throw new Error('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
    }
    let result = {};
    try {
      result = await response.json();
    } catch {
      result = {};
    }
    if (!response.ok) {
      if (response.status === 409 || result.code === 'EMAIL_ALREADY_EXISTS') {
        throw new Error('Email này đã được sử dụng.');
      }
      if (response.status >= 500) {
        throw new Error('Máy chủ đang gặp sự cố. Vui lòng thử lại sau.');
      }
      if (response.status === 400 || response.status === 422) {
        throw new Error('Thông tin đăng ký chưa hợp lệ. Vui lòng kiểm tra lại các trường.');
      }
      throw new Error('Không thể tạo tài khoản lúc này. Vui lòng thử lại.');
    }
    return result;
  }

  /* ================= 3. HÀM TIỆN ÍCH GIAO DIỆN FORM ================= */

  /**
   * Gắn trạng thái lỗi và `aria-invalid` cho một ô nhập biểu mẫu.
   * @param {HTMLElement|null} input - Ô nhập cần cập nhật.
   * @param {HTMLElement|null} element - Phần tử hiển thị thông báo lỗi.
   * @param {string} text - Nội dung lỗi (chuỗi rỗng nếu hợp lệ).
   * @returns {boolean} True nếu không có lỗi.
   */
  function setAuthFieldError(input, element, text) {
    if (element) element.textContent = text;
    if (input) input.setAttribute('aria-invalid', String(Boolean(text)));
    return !text;
  }

  /**
   * Bật/tắt chế độ hiển thị mật khẩu cho một nút điều khiển và ô nhập tương ứng.
   * @param {HTMLElement|null} button - Nút chuyển đổi hiển thị mật khẩu.
   * @param {HTMLInputElement|null} target - Ô nhập mật khẩu mục tiêu.
   */
  function bindPasswordToggleButton(button, target) {
    if (!button || !target) return;
    button.addEventListener('click', () => {
      const show = target.type === 'password';
      target.type = show ? 'text' : 'password';
      button.setAttribute('aria-pressed', String(show));
      button.setAttribute('aria-label', show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
    });
  }

  /**
   * Kiểm tra Họ và tên tiếng Việt/Unicode có ít nhất 2 từ hợp lệ.
   * @param {string} value - Chuỗi họ tên cần kiểm tra.
   * @returns {boolean} True nếu họ tên hợp lệ.
   */
  function isValidFullName(value) {
    const words = value.trim().split(/\s+/u);
    return words.length >= 2 && words.every(word => /^(?:\p{L}\p{M}*)+(?:[-’'](?:\p{L}\p{M}*)+)*$/u.test(word));
  }

  /**
   * Cập nhật trạng thái từng điều kiện độ mạnh mật khẩu trên trang Đăng ký.
   * @param {string} value - Giá trị mật khẩu hiện tại.
   */
  function updatePasswordChecklist(value) {
    document.querySelectorAll('[data-rule]').forEach(item => {
      const ruleFn = PASSWORD_RULES[item.dataset.rule];
      const passed = typeof ruleFn === 'function' ? ruleFn(value) : false;
      item.classList.toggle('passed', passed);
      const iconSpan = item.querySelector('span');
      if (iconSpan) iconSpan.textContent = passed ? '✓' : '○';
    });
  }

  /* ================= 4. LUỒNG XỬ LÝ ĐĂNG NHẬP ================= */

  /**
   * Tìm tài khoản khớp email/username và đối chiếu mật khẩu (SHA-256 hoặc tài khoản mẫu `userX@`).
   * @param {string} identifier - Email hoặc tên đăng nhập đã viết thường.
   * @param {string} rawPassword - Mật khẩu người dùng nhập.
   * @returns {Promise<Object|null>} Bản ghi người dùng nếu hợp lệ, ngược lại trả về null.
   */
  async function authenticateLocalUser(identifier, rawPassword) {
    const hashedInput = await hashPassword(rawPassword);
    const parsedUsers = readJsonStorage(USERS_STORAGE_KEY, []);
    const users = Array.isArray(parsedUsers) ? parsedUsers : [];
    const matchedUser = users.find(u =>
      (u.email && u.email.toLowerCase() === identifier) ||
      (u.username && u.username.toLowerCase() === identifier)
    );
    if (!matchedUser) return null;

    // Hỗ trợ khớp qua mã băm SHA-256 hoặc tài khoản thử nghiệm userX@
    const isDemoCred = rawPassword.startsWith('user')
      && rawPassword.endsWith('@')
      && matchedUser.username === rawPassword.slice(0, -1);
    const isPasswordValid = matchedUser.passwordHash === hashedInput || isDemoCred;
    return isPasswordValid ? matchedUser : null;
  }

  /**
   * Lưu phiên đăng nhập an toàn (đã lược bỏ passwordHash) và tùy chọn ghi nhớ email.
   * @param {Object} matchedUser - Bản ghi tài khoản vừa xác thực.
   * @param {boolean} shouldRemember - Có ghi nhớ email đăng nhập hay không.
   */
  function persistLoginSession(matchedUser, shouldRemember) {
    if (shouldRemember) {
      writeTextStorage(localStorage, REMEMBERED_EMAIL_KEY, matchedUser.email);
    } else {
      removeStorageKey(localStorage, REMEMBERED_EMAIL_KEY);
    }

    const { passwordHash: _omitPasswordHash, ...safeMatchedProfile } = matchedUser;
    const sessionUser = Object.assign({}, safeMatchedProfile, {
      id: matchedUser.id,
      username: matchedUser.username,
      email: matchedUser.email,
      name: matchedUser.name,
      role: matchedUser.role || 'user',
      needsOnboarding: Boolean(matchedUser.needsOnboarding),
      loggedInAt: new Date().toISOString()
    });
    writeTextStorage(localStorage, CURRENT_USER_KEY, JSON.stringify(sessionUser));
  }

  /**
   * Xử lý sự kiện gửi biểu mẫu Đăng nhập và xác thực người dùng.
   * @param {SubmitEvent} event - Sự kiện submit của form.
   * @param {Object} refs - Tập tham chiếu các phần tử DOM của form Đăng nhập.
   * @returns {Promise<void>}
   */
  async function handleLoginSubmit(event, refs) {
    event.preventDefault();
    const {
      emailInput, passwordInput, rememberInput,
      submitButton, message, validateIdentifier, validatePassword
    } = refs;

    message.className = 'form-message';
    message.textContent = '';

    if (!validateIdentifier()) { emailInput.focus(); return; }
    if (!validatePassword()) { passwordInput.focus(); return; }
    if (submitButton.disabled) return;

    const labelEl = submitButton.querySelector('.button-label');
    submitButton.disabled = true;
    submitButton.setAttribute('aria-busy', 'true');
    if (labelEl) labelEl.textContent = 'Đang kiểm tra...';

    if (seedPromise) await seedPromise;

    const identifier = emailInput.value.trim().toLowerCase();
    const matchedUser = await authenticateLocalUser(identifier, passwordInput.value);

    if (!matchedUser) {
      message.className = 'form-message form-message--error';
      message.textContent = 'Email/Tên đăng nhập hoặc mật khẩu không chính xác.';
      submitButton.disabled = false;
      submitButton.removeAttribute('aria-busy');
      if (labelEl) labelEl.textContent = 'Đăng nhập';
      return;
    }

    persistLoginSession(matchedUser, Boolean(rememberInput && rememberInput.checked));

    message.className = 'form-message success';
    message.textContent = `Đăng nhập thành công! Xin chào ${matchedUser.name}.`;
    if (labelEl) labelEl.textContent = 'Đang chuyển hướng...';

    setTimeout(() => {
      const redirectParam = new URLSearchParams(window.location.search).get('redirect');
      window.location.assign(resolveSafeRedirect(redirectParam));
    }, AUTH_REDIRECT_DELAY_MS);
  }

  /**
   * Tạo cặp hàm kiểm tra hợp lệ Email/Username và Mật khẩu cho form Đăng nhập.
   * @param {Object} els - Các phần tử input và error của form Đăng nhập.
   * @returns {{ validateIdentifier: Function, validatePassword: Function }}
   */
  function createLoginValidators({ emailInput, emailError, passwordInput, passwordError }) {
    const validateIdentifier = () => {
      const value = emailInput.value.trim();
      const error = !value
        ? 'Vui lòng nhập email hoặc tên đăng nhập.'
        : (!EMAIL_PATTERN.test(value) && !USERNAME_PATTERN.test(value))
          ? 'Email hoặc tên đăng nhập không hợp lệ.'
          : '';
      return setAuthFieldError(emailInput, emailError, error);
    };

    const validatePassword = () => {
      const value = passwordInput.value;
      const error = !value
        ? 'Vui lòng nhập mật khẩu.'
        : value.length < MIN_LOGIN_PASSWORD_LEN
          ? `Mật khẩu phải có ít nhất ${MIN_LOGIN_PASSWORD_LEN} ký tự.`
          : '';
      return setAuthFieldError(passwordInput, passwordError, error);
    };

    return { validateIdentifier, validatePassword };
  }

  /**
   * Khởi tạo validation, nhớ email, gợi ý đăng nhập và sự kiện submit cho trang login.html.
   */
  function initLoginForm() {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const rememberInput = document.getElementById('rememberMe');
    const submitButton = document.getElementById('loginSubmit');
    const message = document.getElementById('formMessage');
    if (!loginForm || !emailInput || !passwordInput || !submitButton || !message) return;

    const emailError = document.getElementById('emailError');
    const passwordError = document.getElementById('passwordError');
    const { validateIdentifier, validatePassword } = createLoginValidators({
      emailInput, emailError, passwordInput, passwordError
    });

    emailInput.addEventListener('input', () => { validateIdentifier(); message.textContent = ''; });
    emailInput.addEventListener('blur', validateIdentifier);
    passwordInput.addEventListener('input', () => { validatePassword(); message.textContent = ''; });
    passwordInput.addEventListener('blur', validatePassword);

    const rememberedEmail = readTextStorage(localStorage, REMEMBERED_EMAIL_KEY);
    if (rememberedEmail) {
      emailInput.value = rememberedEmail;
      if (rememberInput) rememberInput.checked = true;
    }

    bindPasswordToggleButton(document.getElementById('passwordToggle'), passwordInput);

    loginForm.addEventListener('submit', event => handleLoginSubmit(event, {
      emailInput, passwordInput, rememberInput,
      submitButton, message, validateIdentifier, validatePassword
    }));

    const googleBtn = document.getElementById('googleLogin');
    if (googleBtn) {
      googleBtn.addEventListener('click', () => {
        message.className = 'form-message form-message--info';
        message.textContent =
          'Gợi ý: Bạn có thể đăng nhập thử bằng user1@gmail.com (Mật khẩu: User1@2026 hoặc user1@).';
      });
    }

    const forgotBtn = document.getElementById('forgotPassword');
    if (forgotBtn) {
      forgotBtn.addEventListener('click', () => {
        message.className = 'form-message form-message--muted';
        message.textContent =
          'Mật khẩu thử nghiệm là User1@2026 (hoặc user1@) tương ứng cho tài khoản user1 đến user20.';
      });
    }

    const notice = readTextStorage(sessionStorage, REG_NOTICE_KEY);
    if (notice) {
      message.className = 'form-message success';
      message.textContent = notice;
      removeStorageKey(sessionStorage, REG_NOTICE_KEY);
    }
  }

  /* ================= 5. LUỒNG XỬ LÝ ĐĂNG KÝ ================= */

  /**
   * Xử lý sự kiện gửi biểu mẫu Đăng ký tài khoản mới.
   * @param {SubmitEvent} event - Sự kiện submit của form đăng ký.
   * @param {Object} refs - Tập tham chiếu DOM và hàm cập nhật nút submit.
   * @returns {Promise<void>}
   */
  async function handleRegisterSubmit(event, refs) {
    event.preventDefault();
    const { nameField, emailField, passwordField, submitButton, message, updateButton } = refs;
    if (submitButton.disabled) return;

    message.className = 'form-message';
    message.textContent = '';

    const labelEl = submitButton.querySelector('.button-label');
    submitButton.disabled = true;
    submitButton.setAttribute('aria-busy', 'true');
    if (labelEl) labelEl.textContent = 'Đang tạo tài khoản...';

    try {
      if (seedPromise) await seedPromise;

      const emailTrimmed = emailField.value.trim().toLowerCase();
      const parsedUsers = readJsonStorage(USERS_STORAGE_KEY, []);
      const users = Array.isArray(parsedUsers) ? parsedUsers : [];

      if (users.some(u => u.email && u.email.toLowerCase() === emailTrimmed)) {
        throw new Error('Email này đã được sử dụng. Vui lòng chọn email khác.');
      }

      if (AUTH_API_BASE_URL) {
        await registerUser(nameField.value.trim(), emailTrimmed, passwordField.value);
      } else {
        const hashed = await hashPassword(passwordField.value);
        const rawUsername = emailTrimmed.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
        users.push({
          id: `usr_${Date.now()}`,
          username: rawUsername || `user_${users.length + 1}`,
          email: emailField.value.trim(),
          name: nameField.value.trim(),
          role: 'user',
          passwordHash: hashed,
          needsOnboarding: true,
          createdAt: new Date().toISOString()
        });
        writeTextStorage(localStorage, USERS_STORAGE_KEY, JSON.stringify(users));
      }

      writeTextStorage(
        sessionStorage,
        REG_NOTICE_KEY,
        'Tài khoản đã được tạo thành công! Bạn có thể đăng nhập ngay bây giờ.'
      );
      await navigateAuthPage('login.html');
    } catch (error) {
      message.className = 'form-message form-message--error';
      message.textContent = (error && error.message) || 'Không thể tạo tài khoản lúc này. Vui lòng thử lại.';
      submitButton.disabled = false;
      submitButton.removeAttribute('aria-busy');
      if (labelEl) labelEl.textContent = 'Tạo tài khoản';
      updateButton();
    }
  }

  /**
   * Tạo bộ hàm kiểm tra hợp lệ các trường form Đăng ký và cập nhật trạng thái nút Submit.
   * @param {Object} els - Tham chiếu các phần tử input và lỗi của form Đăng ký.
   * @returns {Object} Bộ hàm validator cho từng trường và hàm cập nhật nút Submit.
   */
  function createRegisterValidators(els) {
    const validateName = () => setAuthFieldError(
      els.nameField,
      els.errors.name,
      !els.nameField.value.trim()
        ? 'Vui lòng nhập họ và tên.'
        : (!isValidFullName(els.nameField.value) ? 'Vui lòng nhập họ và tên hợp lệ (ít nhất 2 từ).' : '')
    );

    const validateEmail = () => setAuthFieldError(
      els.emailField,
      els.errors.email,
      !els.emailField.value.trim()
        ? 'Vui lòng nhập email.'
        : (!EMAIL_PATTERN.test(els.emailField.value.trim()) ? 'Email không hợp lệ.' : '')
    );

    const validatePassword = () => {
      const value = els.passwordField.value;
      const valid = Object.values(PASSWORD_RULES).every(rule => rule(value));
      setAuthFieldError(
        els.passwordField,
        els.errors.password,
        !value ? 'Vui lòng nhập mật khẩu.' : (!valid ? 'Mật khẩu chưa đáp ứng đủ các yêu cầu.' : '')
      );
      updatePasswordChecklist(value);
      return valid;
    };

    const validateConfirm = () => setAuthFieldError(
      els.confirmField,
      els.errors.confirm,
      !els.confirmField.value
        ? 'Vui lòng xác nhận mật khẩu.'
        : (els.confirmField.value !== els.passwordField.value ? 'Mật khẩu xác nhận không khớp.' : '')
    );

    const updateButton = () => {
      const valid = isValidFullName(els.nameField.value)
        && EMAIL_PATTERN.test(els.emailField.value.trim())
        && Object.values(PASSWORD_RULES).every(rule => rule(els.passwordField.value))
        && Boolean(els.confirmField.value)
        && els.confirmField.value === els.passwordField.value
        && els.termsField.checked;
      els.submitButton.disabled = !valid;
    };

    return { validateName, validateEmail, validatePassword, validateConfirm, updateButton };
  }

  /**
   * Gắn sự kiện input/blur theo thời gian thực cho các trường nhập trên form Đăng ký.
   * @param {Object} els - Các phần tử input, checkbox điều khoản và message thông báo.
   * @param {Object} validators - Các hàm kiểm tra hợp lệ trả về từ createRegisterValidators.
   */
  function bindRegisterFieldListeners(els, validators) {
    const { nameField, emailField, passwordField, confirmField, termsField, termsError, message } = els;
    const { validateName, validateEmail, validatePassword, validateConfirm, updateButton } = validators;

    [
      [nameField, validateName],
      [emailField, validateEmail],
      [passwordField, validatePassword],
      [confirmField, validateConfirm]
    ].forEach(([input, validate]) => {
      input.addEventListener('input', () => {
        validate();
        if (input === passwordField && confirmField.value) validateConfirm();
        updateButton();
        message.textContent = '';
      });
      input.addEventListener('blur', () => {
        validate();
        updateButton();
      });
    });

    termsField.addEventListener('change', () => {
      if (termsError) {
        termsError.textContent = termsField.checked ? '' : 'Vui lòng đồng ý với các điều khoản để tiếp tục.';
      }
      updateButton();
      message.textContent = '';
    });
  }

  /**
   * Khởi tạo validation thời gian thực, thanh quy tắc mật khẩu và sự kiện đăng ký cho register.html.
   */
  function initRegisterForm() {
    const registerForm = document.getElementById('registerForm');
    const nameField = document.getElementById('fullName');
    const emailField = document.getElementById('registerEmail');
    const passwordField = document.getElementById('registerPassword');
    const confirmField = document.getElementById('confirmPassword');
    const termsField = document.getElementById('termsAccepted');
    const submitButton = document.getElementById('registerSubmit');
    const message = document.getElementById('registerMessage');
    if (
      !registerForm || !nameField || !emailField || !passwordField
      || !confirmField || !termsField || !submitButton || !message
    ) {
      return;
    }

    const errors = {
      name: document.getElementById('nameError'),
      email: document.getElementById('registerEmailError'),
      password: document.getElementById('registerPasswordError'),
      confirm: document.getElementById('confirmPasswordError'),
      terms: document.getElementById('termsError')
    };

    const validators = createRegisterValidators({
      nameField, emailField, passwordField, confirmField, termsField, submitButton, errors
    });
    bindRegisterFieldListeners(
      { nameField, emailField, passwordField, confirmField, termsField, termsError: errors.terms, message },
      validators
    );

    document.querySelectorAll('[data-password-target]').forEach(button => {
      bindPasswordToggleButton(button, document.getElementById(button.dataset.passwordTarget));
    });

    registerForm.addEventListener('submit', event => handleRegisterSubmit(event, {
      nameField, emailField, passwordField, submitButton, message, updateButton: validators.updateButton
    }));

    validators.updateButton();
  }

  /**
   * Khởi tạo logic kiểm tra hợp lệ và xử lý biểu mẫu cho trang Đăng nhập hoặc Đăng ký.
   */
  function initializeAuthPage() {
    seedPromise = loadAndSeedUsers();
    initLoginForm();
    initRegisterForm();
  }

  /* ================= 6. CHUYỂN TRANG MỀM & KHỞI CHẠY ================= */

  /**
   * Chuyển đổi mềm không tải lại toàn trang giữa login.html và register.html qua History API.
   * @param {string} target - Đường dẫn đích (login.html hoặc register.html).
   * @param {Object} [options={}] - Tùy chọn chuyển trang.
   * @param {boolean} [options.replace=false] - Ghi đè lịch sử thay vì đẩy mới.
   * @returns {Promise<void>}
   */
  async function navigateAuthPage(target, { replace = false } = {}) {
    const url = new URL(target, window.location.href);
    if (url.origin !== window.location.origin || !/\/(?:login|register)\.html$/.test(url.pathname)) return;

    const response = await fetch(url.href);
    if (!response.ok) throw new Error('Không tải được trang tài khoản.');
    const html = await response.text();
    const nextDocument = new DOMParser().parseFromString(html, 'text/html');
    const nextCard = nextDocument.querySelector('main.auth-main .login-card');
    const currentCard = document.querySelector('main.auth-main .login-card');
    if (!nextCard || !currentCard) throw new Error('Không tìm thấy khung tài khoản.');

    currentCard.replaceWith(document.importNode(nextCard, true));
    document.title = nextDocument.title;
    if (replace) history.replaceState({ authPage: true }, '', url.href);
    else history.pushState({ authPage: true }, '', url.href);
    initializeAuthPage();
  }

  /**
   * Điểm khởi chạy các thành phần trang Xác thực khi DOM đã sẵn sàng.
   */
  function bootstrapAuth() {
    initializeAuthPage();

    document.addEventListener('click', event => {
      const link = event.target.closest('a[href]');
      if (!link || !link.matches('.register-prompt a')) return;
      const url = new URL(link.href, window.location.href);
      if (!/\/(?:login|register)\.html$/.test(url.pathname)) return;
      event.preventDefault();
      navigateAuthPage(url.href).catch(() => {
        window.location.assign(url.href);
      });
    });

    window.addEventListener('popstate', () => {
      if (/\/(?:login|register)\.html$/.test(window.location.pathname)) {
        navigateAuthPage(window.location.href, { replace: true }).catch(() => {
          const message = document.querySelector('#formMessage, #registerMessage');
          if (message) {
            message.className = 'form-message form-message--error';
            message.textContent = 'Không thể chuyển trang lúc này. Hãy mở ConfGuide qua Live Server rồi thử lại.';
          }
        });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapAuth);
  } else {
    bootstrapAuth();
  }
})();
