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
    createSeedUser(20, 'bade2b88e7c6c6b8c1634748bc33dafe948c67bdb7780858f74044da60875cb9'),
    {
      id: 'usr_google_01',
      username: 'minhkhoa_ai',
      email: 'minhkhoa.ai@uit.edu.vn',
      name: 'Nguyễn Minh Khoa',
      fullName: 'TS. Nguyễn Minh Khoa',
      role: 'user',
      authProvider: 'google',
      academicTitle: 'Giảng viên Khoa Khoa học & Kỹ thuật Thông tin',
      affiliation: 'Trường Đại học Công nghệ Thông tin, ĐHQG-HCM',
      scholarUrl: 'https://scholar.google.com/citations?user=minhkhoa_uit',
      orcid: '0000-0002-1825-0097',
      openAlexId: 'A5023888391',
      bio: 'Nghiên cứu về mô hình ngôn ngữ lớn, học sâu đa phương thức và thị giác máy tính ứng dụng.',
      academicProfile: {
        sources: ['Google Profile', 'Google Scholar', 'ORCID', 'OpenAlex'],
        keywords: [
          'Artificial Intelligence',
          'Deep Learning',
          'Large Language Models',
          'Natural Language Processing',
          'Computer Vision'
        ],
        publications: [
          'Retrieval-Augmented Large Language Models for Vietnamese Question Answering',
          'Self-Supervised Vision Transformer for Medical Image Segmentation',
          'Deep Learning Architectures for Multimodal Representation Learning'
        ],
        jobInfo: 'Giảng viên nghiên cứu Trí tuệ nhân tạo, Học máy và Xử lý ngôn ngữ tự nhiên'
      },
      createdAt: '2026-11-20T08:00:00.000Z'
    },
    {
      id: 'usr_google_02',
      username: 'thuha_sec',
      email: 'thuha.sec@hcmut.edu.vn',
      name: 'Trần Thu Hà',
      fullName: 'ThS. Trần Thu Hà',
      role: 'user',
      authProvider: 'google',
      academicTitle: 'Nghiên cứu sinh An toàn thông tin & Hệ thống mạng',
      affiliation: 'Trường Đại học Bách khoa, ĐHQG-HCM',
      scholarUrl: 'https://orcid.org/0000-0003-4192-8821',
      orcid: '0000-0003-4192-8821',
      openAlexId: 'A5081920344',
      bio: 'Tập trung nghiên cứu phát hiện xâm nhập mạng, bảo mật hệ thống IoT công nghiệp và điện toán đám mây.',
      academicProfile: {
        sources: ['Google Profile', 'ORCID', 'OpenAlex'],
        keywords: [
          'Cyber Security',
          'Intrusion Detection',
          'Internet of Things',
          'Wireless Sensor Networks',
          'Cloud Computing'
        ],
        publications: [
          'Lightweight Intrusion Detection System for Industrial IoT Networks',
          'Zero-Trust Network Security Architecture in Multi-Cloud Computing'
        ],
        jobInfo: 'Nghiên cứu sinh chuyên ngành An toàn thông tin, Mạng máy tính và Điện toán đám mây'
      },
      createdAt: '2026-11-20T08:00:00.000Z'
    },
    {
      id: 'usr_google_03',
      username: 'hoangnam_se',
      email: 'hoangnam.se@gmail.com',
      name: 'Lê Hoàng Nam',
      fullName: 'KS. Lê Hoàng Nam',
      role: 'user',
      authProvider: 'google',
      academicTitle: 'Kỹ sư Nghiên cứu Phần mềm & Dữ liệu',
      affiliation: 'Phòng Thí nghiệm Hệ thống Phân tán & Dữ liệu lớn',
      scholarUrl: 'https://scholar.google.com/citations?user=hoangnam_se',
      orcid: '',
      openAlexId: 'A5049102771',
      bio: 'Phát triển kiến trúc hệ thống phân tán, kiểm thử phần mềm tự động và xử lý dữ liệu lớn.',
      academicProfile: {
        sources: ['Google Profile', 'Google Scholar', 'OpenAlex'],
        keywords: [
          'Software Engineering',
          'Distributed Systems',
          'Big Data',
          'Data Science',
          'Automated Software Testing'
        ],
        publications: [
          'Automated Fault Localization for Cloud-Native Distributed Systems',
          'Scalable Big Data Processing Pipeline for Data Science Analytics'
        ],
        jobInfo: 'Kỹ sư nghiên cứu Công nghệ phần mềm, Hệ thống phân tán và Khoa học dữ liệu'
      },
      createdAt: '2026-11-20T08:00:00.000Z'
    },
    {
      id: 'usr_google_04',
      username: 'giahuy_sv',
      email: 'giahuy.student@gmail.com',
      name: 'Phạm Gia Huy',
      fullName: 'Phạm Gia Huy',
      role: 'user',
      authProvider: 'google',
      academicTitle: 'Sinh viên năm hai',
      affiliation: 'Trường Đại học Công nghệ Thông tin, ĐHQG-HCM',
      scholarUrl: '',
      orcid: '',
      openAlexId: '',
      bio: 'Sinh viên mới bắt đầu tìm hiểu phương pháp nghiên cứu khoa học và công bố học thuật.',
      academicProfile: {
        sources: ['Google Profile'],
        keywords: [],
        publications: [],
        jobInfo: 'Sinh viên đại học mới tìm hiểu nghiên cứu khoa học'
      },
      createdAt: '2026-11-20T08:00:00.000Z'
    }
  ];

  let seedPromise = null;
  let googleModalLastFocus = null;
  let googleModalBound = false;

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
      const existingIdx = existingUsers.findIndex(u =>
        (u.email && seedUser.email && u.email.toLowerCase() === seedUser.email.toLowerCase()) ||
        (u.username && seedUser.username && u.username.toLowerCase() === seedUser.username.toLowerCase())
      );
      if (existingIdx === -1) {
        existingUsers.push(seedUser);
        hasChanges = true;
      } else if (seedUser.academicProfile && !existingUsers[existingIdx].academicProfile) {
        existingUsers[existingIdx] = Object.assign({}, seedUser, existingUsers[existingIdx], {
          academicProfile: seedUser.academicProfile,
          authProvider: existingUsers[existingIdx].authProvider || seedUser.authProvider
        });
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
      googleBtn.addEventListener('click', () => openGoogleAuthModal(googleBtn, message));
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

    const googleRegBtn = document.getElementById('googleRegister');
    if (googleRegBtn) {
      googleRegBtn.addEventListener('click', () => openGoogleAuthModal(googleRegBtn, message));
    }

    validators.updateButton();
  }

  /* ================= 5B. ĐĂNG NHẬP GOOGLE & TÌM TÁC GIẢ OPENALEX ================= */

  /** Danh mục 25 lĩnh vực chuẩn khớp 1:1 với PREFERENCE_TOPICS trong js/core/layout.js */
  const AUTH_CANONICAL_TOPICS = (window.ConfGuideUtils && Array.isArray(window.ConfGuideUtils.PREFERENCE_TOPICS))
    ? window.ConfGuideUtils.PREFERENCE_TOPICS
    : [
        { key: 'tri-tue-nhan-tao', label: 'Trí tuệ nhân tạo' },
        { key: 'hoc-may', label: 'Học máy' },
        { key: 'khoa-hoc-du-lieu', label: 'Khoa học dữ liệu' },
        { key: 'du-lieu-lon', label: 'Dữ liệu lớn' },
        { key: 'mang-may-tinh', label: 'Mạng máy tính' },
        { key: 'iot', label: 'IoT' },
        { key: 'an-toan-thong-tin', label: 'An toàn thông tin' },
        { key: 'thi-giac-may-tinh', label: 'Thị giác máy tính' },
        { key: 'cong-nghe-phan-mem', label: 'Công nghệ phần mềm' },
        { key: 'xu-ly-ngon-ngu-tu-nhien', label: 'Xử lý ngôn ngữ tự nhiên' },
        { key: 'truyen-thong', label: 'Truyền thông' },
        { key: 'da-phuong-tien', label: 'Đa phương tiện' },
        { key: 'dien-tu', label: 'Điện tử' },
        { key: 'vien-thong', label: 'Viễn thông' },
        { key: 'xu-ly-tin-hieu', label: 'Xử lý tín hiệu' },
        { key: 'cntt-tong-hop', label: 'CNTT tổng hợp' },
        { key: 'robot', label: 'Robot' },
        { key: 'tu-dong-hoa', label: 'Tự động hóa' },
        { key: 'dieu-khien', label: 'Điều khiển' },
        { key: 'he-thong-thong-tin', label: 'Hệ thống thông tin' },
        { key: 'chuyen-doi-so', label: 'Chuyển đổi số' },
        { key: 'tuong-tac-nguoi-may', label: 'Tương tác người-máy' },
        { key: 'cong-nghe-giao-duc', label: 'Công nghệ giáo dục' },
        { key: 'dien-toan-dam-may', label: 'Điện toán đám mây' },
        { key: 'he-thong-phan-tan', label: 'Hệ thống phân tán' }
      ];

  const AUTH_TOPIC_LABEL_BY_KEY = AUTH_CANONICAL_TOPICS.reduce((acc, item) => {
    acc[item.key] = item.label;
    return acc;
  }, {});

  /** Trạng thái nội bộ cho quy trình 3 bước Google -> Google Scholar -> Xác nhận lĩnh vực */
  const googleFlowState = {
    step: 1,
    consentState: 'pending',
    googleProfile: null,
    sampleAccount: null,
    scholarCandidates: [],
    candidateSource: '',
    selectedAuthor: null,
    mappingResult: null,
    selectedKeys: new Set(),
    customDomains: [],
    backendSavedFields: null
  };

  /**
   * Lấy URL gốc của backend Express (mặc định http://localhost:3000).
   * @returns {string} URL backend.
   */
  function getAuthBackendBaseUrl() {
    if (window.ConfGuideGoogleAuth && typeof window.ConfGuideGoogleAuth.getBackendBaseUrl === 'function') {
      return window.ConfGuideGoogleAuth.getBackendBaseUrl();
    }
    return 'http://localhost:3000';
  }

  /**
   * Thoát ký tự đặc biệt HTML để hiển thị an toàn thông tin tài khoản Google và OpenAlex trong modal.
   * @param {*} raw - Giá trị đầu vào cần làm sạch.
   * @returns {string} Chuỗi HTML an toàn.
   */
  function escapeAuthHtml(raw) {
    if (window.ConfGuideUtils && typeof window.ConfGuideUtils.escapeHtml === 'function') {
      return window.ConfGuideUtils.escapeHtml(raw);
    }
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(raw ?? '').replace(/[&<>"']/g, ch => map[ch]);
  }

  /**
   * Gắn bộ xử lý dự phòng khi ảnh đại diện Google tải thất bại trên `file:///` hoặc khi ngoại tuyến.
   * @param {HTMLElement|null} rootEl - Phần tử chứa ảnh avatar.
   */
  function bindAuthAvatarFallbacks(rootEl) {
    if (!rootEl) return;
    rootEl.querySelectorAll('img.js-auth-avatar-fallback').forEach(img => {
      const revert = () => {
        const parent = img.parentElement;
        if (!parent) return;
        parent.textContent = img.getAttribute('data-fallback-initial') || 'G';
      };
      img.addEventListener('error', revert, { once: true });
      if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) {
        revert();
      }
    });
  }

  /**
   * Tạo HTML hiển thị avatar (ảnh Google thật kèm `referrerpolicy="no-referrer"` hoặc chữ cái đầu).
   * @param {Object|null} profile - Hồ sơ người dùng Google.
   * @param {string} imgClass - Class CSS của thẻ `<img>`.
   * @param {number} size - Kích thước rộng/cao ảnh (px).
   * @returns {string} Chuỗi HTML nội dung thẻ avatar.
   */
  function buildGoogleAvatarHtml(profile, imgClass, size) {
    const displayName = (profile && (profile.fullName || profile.name)) || 'G';
    const initial = String(displayName).trim().charAt(0).toUpperCase() || 'G';
    const photoUrl = profile && (profile.avatarUrl || profile.picture);
    if (photoUrl && typeof photoUrl === 'string' && /^https?:\/\//i.test(photoUrl.trim())) {
      return `<img src="${escapeAuthHtml(photoUrl.trim())}" alt="${escapeAuthHtml(displayName)}" `
        + `width="${size}" height="${size}" class="${imgClass} js-auth-avatar-fallback" `
        + `referrerpolicy="no-referrer" data-fallback-initial="${escapeAuthHtml(initial)}">`;
    }
    return escapeAuthHtml(initial);
  }

  /**
   * Khởi tạo phần tử DOM `#googleAuthModal` (quy trình 3 bước Google -> Google Scholar -> Xác nhận lĩnh vực).
   * @returns {HTMLElement} Phần tử gốc của modal đăng nhập Google.
   */
  function ensureGoogleAuthModalDom() {
    let modal = document.getElementById('googleAuthModal');
    if (modal) return modal;

    const googleLogoSvg = `
      <svg class="google-auth-modal__logo" viewBox="0 0 48 48" width="22" height="22" aria-hidden="true">
        <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.7c3.9-3.6 6-8.8 6-15Z"/>
        <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.7-5.1c-1.9 1.3-4.1 2-6.8 2-5.2 0-9.6-3.5-11.2-8.2H5.9v5.3A20 20 0 0 0 24 44Z"/>
        <path fill="#FBBC05" d="M12.8 27.9a12 12 0 0 1 0-7.7v-5.3H5.9a20 20 0 0 0 0 18.3l6.9-5.3Z"/>
        <path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3.1l5.9-5.9A19.7 19.7 0 0 0 24 4 20 20 0 0 0 5.9 14.9l6.9 5.3C14.4 15.5 18.8 12 24 12Z"/>
      </svg>
    `;

    const categorySelectOptionsHtml = AUTH_CANONICAL_TOPICS.map(item =>
      `<option value="${escapeAuthHtml(item.key)}">${escapeAuthHtml(item.label)}</option>`
    ).join('');

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div class="layout-modal google-auth-modal" id="googleAuthModal" role="dialog"
        aria-modal="true" aria-labelledby="googleAuthModalTitle" hidden>
        <div class="layout-modal-backdrop js-google-modal-close"></div>
        <div class="layout-modal-box google-auth-modal__box">
          <div class="layout-modal-header">
            <div class="google-auth-modal__brand">
              ${googleLogoSvg}
              <h2 class="layout-modal-title" id="googleAuthModalTitle">Đăng nhập bằng Google &amp; Google Scholar</h2>
            </div>
            <button type="button" class="layout-modal-close-btn js-google-modal-close"
              id="googleAuthCloseBtn" aria-label="Đóng cửa sổ đăng nhập Google">&times;</button>
          </div>
          <div class="layout-modal-body google-auth-modal__body">
            <!-- Thanh tiến trình 3 bước -->
            <div class="google-steps" id="googleFlowSteps" aria-label="Các bước đăng nhập Google">
              <div class="google-steps__item is-active" data-step="1">
                <span class="google-steps__num">1</span>
                <span>Tài khoản Google</span>
              </div>
              <div class="google-steps__item" data-step="2">
                <span class="google-steps__num">2</span>
                <span>Google Scholar</span>
              </div>
              <div class="google-steps__item" data-step="3">
                <span class="google-steps__num">3</span>
                <span>Lĩnh vực của tôi</span>
              </div>
            </div>

            <!-- BƯỚC 1: ĐĂNG NHẬP GOOGLE CHÍNH THỨC (ID TOKEN -> POST /auth/google) -->
            <div class="google-step-pane" id="googleStepPane1">
              <div class="google-signin-panel">
                <p class="google-signin-panel__title">Xác thực bằng tài khoản Google của bạn</p>
                <p class="google-signin-panel__desc">
                  ConfGuide chỉ nhận tên hiển thị, email và ảnh đại diện để thiết lập hồ sơ nghiên cứu (không đọc Gmail).
                </p>
                <div class="google-real-box__gsi-slot google-real-box__gsi-slot--center" id="googleGsiButtonSlot"></div>
                <p class="google-env-banner" id="googleEnvBanner" role="status"></p>
                <p class="google-origin-note" id="googleOriginNote" hidden></p>
                <div class="google-setup-guide" id="googleSetupGuide" hidden></div>
                <button type="button" class="btn btn-secondary btn--compact-sm" id="googleRetryConfigBtn" hidden>
                  Kiểm tra lại kết nối
                </button>
              </div>
            </div>

            <!-- BƯỚC 2: XIN PHÉP TỰ ĐỘNG TÌM HỒ SƠ (SERPAPI -> OPENALEX -> ORCID -> SEMANTIC SCHOLAR) -->
            <div class="google-step-pane" id="googleStepPane2" hidden>
              <div class="google-identity-bar" id="googleIdentityBar2"></div>

              <div class="google-scholar-consent" id="googleScholarConsentBox">
                <p class="google-scholar-consent__title">Tự động tìm hồ sơ nghiên cứu công khai của bạn</p>
                <p class="google-scholar-consent__desc">
                  Sau khi bạn đồng ý, hệ thống sẽ tự động dò theo tên &amp; email Google trên Google Scholar (SerpApi), OpenAlex, ORCID (từ khóa, tiểu sử, bài báo là tác giả) và Semantic Scholar để tự điền sẵn lĩnh vực mà không cần nhập tay.
                </p>
                <div class="google-scholar-consent__actions">
                  <button type="button" class="btn btn-primary btn--compact-sm" id="googleScholarAgreeBtn">
                    Đồng ý &amp; Tự động tìm
                  </button>
                  <button type="button" class="btn btn-secondary btn--compact-sm" id="googleScholarSkipBtn">
                    Bỏ qua
                  </button>
                </div>
              </div>

              <div id="googleScholarLookupArea" hidden>
                <div class="google-oa-search">
                  <div class="google-oa-search__grid">
                    <div class="modal-form-group">
                      <label for="googleOaNameInput">Tên tác giả tìm tự động (nếu tên Google khác tên công bố, hãy sửa tại đây)</label>
                      <div class="google-oa-search__name-row">
                        <input type="text" id="googleOaNameInput" class="modal-input" placeholder="VD: Nguyen Minh Khoa">
                        <button type="button" class="btn btn-secondary btn--compact-sm" id="googleOaNoAccentBtn"
                          title="Loại bỏ dấu tiếng Việt">Bỏ dấu</button>
                      </div>
                    </div>
                    <button type="button" class="btn btn-primary btn--compact-sm" id="googleOaSearchBtn">
                      Tìm lại
                    </button>
                  </div>

                  <div class="google-oa-search__orcid-row">
                    <input type="text" id="googleOrcidInput" class="modal-input"
                      placeholder="Hoặc nhập chính xác ORCID iD nếu tên trùng nhiều (VD: 0000-0002-1825-0097)"
                      aria-label="ORCID iD dự phòng">
                    <button type="button" class="btn btn-secondary btn--compact-sm" id="googleOrcidSearchBtn">
                      Tìm ORCID
                    </button>
                    <a id="googleStep2ScholarLink" class="btn btn-secondary btn--compact-sm"
                      href="https://scholar.google.com/citations?hl=en" target="_blank" rel="noopener noreferrer">
                      Mở Google Scholar &#8599;
                    </a>
                  </div>
                </div>

                <p class="google-lookup-meta" id="googleLookupMetaBanner" hidden></p>
                <div class="google-oa-results" id="googleOaResultsList" aria-live="polite"></div>
              </div>

              <div class="google-step-footer">
                <button type="button" class="btn btn-secondary btn--compact-sm" id="googleBackToStep1Btn">
                  &larr; Đổi tài khoản
                </button>
                <div class="google-step-footer__right">
                  <button type="button" class="btn btn-secondary btn--compact-sm" id="googleUseSavedBtn" hidden>
                    Dùng lĩnh vực đã lưu
                  </button>
                  <button type="button" class="btn btn-secondary btn--compact-sm" id="googleSkipToManualBtn">
                    Không phải tôi (Chọn thủ công) &rarr;
                  </button>
                </div>
              </div>
            </div>

            <!-- BƯỚC 3: XÁC NHẬN LĨNH VỰC (FIELDMAP), NHẬP TIỂU SỬ/TỪ KHÓA HOẶC CHỌN THỦ CÔNG -->
            <div class="google-step-pane" id="googleStepPane3" hidden>
              <div class="google-identity-bar" id="googleIdentityBar3"></div>
              <div class="google-mapper-banner" id="googleMapperBanner"></div>

              <div class="google-paste-box" id="googleKeywordPasteBox">
                <div class="google-paste-box__head">
                  <label class="google-paste-box__label" for="googlePasteKeywordsInput">
                    Phân tích thêm từ tiểu sử, tên bài báo hoặc từ khóa của bạn (nếu muốn bổ sung)
                  </label>
                  <a id="googleStep3ScholarLink" class="google-setup-guide__link"
                    href="https://scholar.google.com/citations?hl=en" target="_blank" rel="noopener noreferrer">
                    Mở trang Google Scholar của bạn &#8599;
                  </a>
                </div>
                <div class="google-paste-box__row">
                  <textarea id="googlePasteKeywordsInput" class="modal-input google-paste-box__textarea" rows="2"
                    placeholder="Nhập ngắn gọn tiểu sử, tên bài báo hoặc lĩnh vực quan tâm (VD: Tôi nghiên cứu về Deep Learning, Computer Vision và IoT)..."></textarea>
                  <button type="button" class="btn btn-secondary btn--compact-sm" id="googleMapKeywordsBtn">
                    Phân tích tự động
                  </button>
                </div>
              </div>

              <div class="google-manual-quick-add">
                <input type="text" id="googleStep3CustomLabel" class="modal-input"
                  placeholder="Thêm lĩnh vực tùy chỉnh (VD: AI trong Y tế)..." aria-label="Tên lĩnh vực tùy chỉnh">
                <select id="googleStep3CustomCat" class="modal-input" aria-label="Nhóm hội nghị chuẩn">
                  <option value="">-- Nhóm chuẩn --</option>
                  ${categorySelectOptionsHtml}
                </select>
                <button type="button" class="btn btn-secondary btn--compact-sm" id="googleStep3AddCustomBtn">+ Thêm</button>
              </div>

              <div class="google-manual-grid" id="googleStep3TopicsGrid" role="group"
                aria-label="Xác nhận hoặc chọn thủ công lĩnh vực nghiên cứu"></div>

              <div class="google-step-footer">
                <button type="button" class="btn btn-secondary btn--compact-sm" id="googleBackToStep2Btn">
                  &larr; Chọn lại tác giả
                </button>
                <div class="google-step-footer__right">
                  <span class="pref-count-badge" id="googleStep3CountBadge">Đã chọn: 0 lĩnh vực</span>
                  <button type="button" class="btn btn-primary" id="googleConfirmFinishBtn">
                    Xác nhận &amp; Hoàn tất đăng nhập
                  </button>
                </div>
              </div>
            </div>

            <p class="form-message" id="googleModalStatus" role="status" aria-live="polite"></p>
          </div>
        </div>
      </div>
    `;
    modal = wrapper.firstElementChild;
    document.body.appendChild(modal);
    bindGoogleAuthModalEvents(modal);
    return modal;
  }

  /**
   * Đóng hộp thoại đăng nhập Google và trả lại tiêu điểm bàn phím cho nút kích hoạt trước đó.
   */
  function closeGoogleAuthModal() {
    const modal = document.getElementById('googleAuthModal');
    if (!modal || modal.hasAttribute('hidden')) return;
    modal.classList.remove('show');
    document.body.classList.remove('modal-open');
    setTimeout(() => {
      modal.setAttribute('hidden', 'true');
      if (googleModalLastFocus && typeof googleModalLastFocus.focus === 'function') {
        googleModalLastFocus.focus();
      }
      googleModalLastFocus = null;
    }, 180);
  }

  /**
   * Đặt thông báo trạng thái cho modal đăng nhập Google.
   * @param {string} text - Nội dung thông báo.
   * @param {'neutral'|'success'|'error'|'muted'} [tone='neutral'] - Kiểu trạng thái.
   */
  function setGoogleModalStatus(text, tone = 'neutral') {
    const statusEl = document.getElementById('googleModalStatus');
    if (!statusEl) return;
    if (!text) {
      statusEl.className = 'form-message';
      statusEl.textContent = '';
      return;
    }
    const cls = tone === 'success'
      ? 'form-message success'
      : (tone === 'error' ? 'form-message form-message--error' : 'form-message form-message--muted');
    statusEl.className = cls;
    statusEl.textContent = text;
  }

  /**
   * Tạo HTML hướng dẫn khắc phục nhanh khi cổng đăng nhập Google chưa sẵn sàng (thiếu Client ID hoặc sai origin).
   * @param {'file'|'offline'|'missing-id'|'invalid-id'|'gis-failed'} mode - Trạng thái lỗi hiện tại.
   * @param {string} currentOrigin - Origin hiện tại của trình duyệt.
   * @param {string} apiBase - URL gốc của backend đang gọi.
   * @returns {string} Chuỗi HTML an toàn để hiển thị trong `#googleSetupGuide`.
   */
  function buildGoogleSetupGuideHtml(mode, currentOrigin, apiBase) {
    const loc = window.location || {};
    const isIpLoopback = loc.hostname === '127.0.0.1' || loc.hostname === '[::1]';
    const localhostSamePort = isIpLoopback
      ? `http://localhost${loc.port ? `:${loc.port}` : ''}${loc.pathname || '/login.html'}`
      : '';
    const loopbackHint = isIpLoopback
      ? `<li>Bạn đang mở bằng IP <code class="google-setup-guide__code">${escapeAuthHtml(currentOrigin)}</code> — Google OAuth thường ưu tiên tên miền <code class="google-setup-guide__code">localhost</code>. Hãy thử mở trực tiếp qua <a class="google-setup-guide__link" href="${escapeAuthHtml(localhostSamePort)}">${escapeAuthHtml(localhostSamePort)}</a> hoặc <a class="google-setup-guide__link" href="http://localhost:3000/login.html">http://localhost:3000/login.html</a>.</li>`
      : '';

    if (mode === 'file') {
      return `
        <p class="google-setup-guide__title">Cách chạy cổng Google Sign-In đúng chuẩn:</p>
        <ol class="google-setup-guide__list">
          <li>Mở ConfGuide qua máy chủ web thay vì mở trực tiếp tệp <code class="google-setup-guide__code">file:///</code>.</li>
          <li>Chạy backend ở thư mục gốc (<code class="google-setup-guide__code">npm.cmd start</code>) rồi truy cập <a class="google-setup-guide__link" href="http://localhost:3000/login.html">http://localhost:3000/login.html</a>.</li>
        </ol>
      `;
    }

    if (mode === 'offline') {
      return `
        <p class="google-setup-guide__title">Kiểm tra kết nối Backend (${escapeAuthHtml(apiBase)}):</p>
        <ol class="google-setup-guide__list">
          <li>Nếu chạy trên máy cá nhân: mở terminal tại thư mục gốc dự án hoặc <code class="google-setup-guide__code">backend/</code> rồi chạy <code class="google-setup-guide__code">npm.cmd start</code>.</li>
          <li>Nếu đã đẩy lên Vercel: kiểm tra Deployment log của hàm <code class="google-setup-guide__code">/api/auth/config</code> và đảm bảo chưa ghi nhầm URL localhost vào bộ nhớ trình duyệt.</li>
          ${loopbackHint}
        </ol>
      `;
    }

    const originText = currentOrigin || 'http://localhost:3000';
    return `
      <p class="google-setup-guide__title">Hướng dẫn kích hoạt cổng Google Sign-In:</p>
      <ol class="google-setup-guide__list">
        <li>Tạo OAuth 2.0 Client ID (loại <strong>Web application</strong>) trên <strong>Google Cloud Console &rarr; Credentials</strong>.</li>
        <li>Trong mục <strong>Authorized JavaScript origins</strong>, thêm đúng origin hiện tại: <code class="google-setup-guide__code">${escapeAuthHtml(originText)}</code>${originText !== 'http://localhost:3000' ? ' và <code class="google-setup-guide__code">http://localhost:3000</code>' : ''} (không có dấu <code class="google-setup-guide__code">/</code> ở cuối).</li>
        <li>Dán Client ID vào biến <code class="google-setup-guide__code">GOOGLE_CLIENT_ID=...</code> trong <code class="google-setup-guide__code">backend/.env</code> (cục bộ) hoặc <strong>Project Settings &rarr; Environment Variables</strong> trên Vercel (rồi Redeploy), sau đó bấm <strong>Kiểm tra lại kết nối</strong>.</li>
        ${loopbackHint}
      </ol>
    `;
  }

  /**
   * Cập nhật trạng thái cấu hình Google OAuth Client ID và nút đăng nhập Google chính thức ở Bước 1.
   */
  async function refreshGoogleEnvironmentUi() {
    const bannerEl = document.getElementById('googleEnvBanner');
    const originNoteEl = document.getElementById('googleOriginNote');
    const guideEl = document.getElementById('googleSetupGuide');
    const gsiSlot = document.getElementById('googleGsiButtonSlot');
    const retryBtn = document.getElementById('googleRetryConfigBtn');
    const authSvc = window.ConfGuideGoogleAuth;

    if (!authSvc || !bannerEl || !gsiSlot) return;

    const showGuide = html => {
      if (!guideEl) return;
      if (html) {
        guideEl.innerHTML = html;
        guideEl.removeAttribute('hidden');
      } else {
        guideEl.innerHTML = '';
        guideEl.setAttribute('hidden', 'true');
      }
    };

    const setOriginNote = html => {
      if (!originNoteEl) return;
      if (html) {
        originNoteEl.innerHTML = html;
        originNoteEl.removeAttribute('hidden');
      } else {
        originNoteEl.innerHTML = '';
        originNoteEl.setAttribute('hidden', 'true');
      }
    };

    bannerEl.className = 'google-env-banner';
    bannerEl.textContent = 'Đang kiểm tra cấu hình backend và tải cổng đăng nhập Google...';
    gsiSlot.innerHTML = '';
    setOriginNote('');
    showGuide('');
    if (retryBtn) retryBtn.setAttribute('hidden', 'true');

    const cfgRes = typeof authSvc.fetchBackendAuthConfig === 'function'
      ? await authSvc.fetchBackendAuthConfig()
      : { backendReachable: false };
    const status = authSvc.getEnvironmentStatus();
    const apiBase = typeof authSvc.getBackendBaseUrl === 'function' ? authSvc.getBackendBaseUrl() : 'http://localhost:3000';
    const currentOrigin = status.origin || '';

    if (!status.supportedOrigin) {
      bannerEl.className = 'google-env-banner is-warning';
      bannerEl.textContent =
        'Đăng nhập Google yêu cầu mở qua HTTP/HTTPS (VD: http://localhost:3000/login.html hoặc Live Server), không chạy trực tiếp trên file:///.';
      showGuide(buildGoogleSetupGuideHtml('file', currentOrigin, apiBase));
      return;
    }

    if (!cfgRes.backendReachable && !status.hasClientId) {
      bannerEl.className = 'google-env-banner is-warning';
      bannerEl.textContent =
        `Không kết nối được tới backend (${apiBase}). Nếu chạy cục bộ, hãy mở terminal chạy "npm.cmd start" rồi bấm Kiểm tra lại.`;
      showGuide(buildGoogleSetupGuideHtml('offline', currentOrigin, apiBase));
      if (retryBtn) retryBtn.removeAttribute('hidden');
      return;
    }

    if (cfgRes.rawGoogleClientId && !cfgRes.clientIdValidFormat && !status.hasClientId) {
      bannerEl.className = 'google-env-banner is-warning';
      bannerEl.textContent =
        'Giá trị GOOGLE_CLIENT_ID trên backend chưa đúng định dạng Google OAuth Web Client ID (*.apps.googleusercontent.com).';
      showGuide(buildGoogleSetupGuideHtml('invalid-id', currentOrigin, apiBase));
      if (retryBtn) retryBtn.removeAttribute('hidden');
      return;
    }

    if (!status.hasClientId) {
      bannerEl.className = 'google-env-banner is-warning';
      bannerEl.textContent =
        `Đã kết nối backend (${apiBase}), nhưng GOOGLE_CLIENT_ID đang để trống nên nút đăng nhập Google chưa thể hiển thị.`;
      showGuide(buildGoogleSetupGuideHtml('missing-id', currentOrigin, apiBase));
      if (retryBtn) retryBtn.removeAttribute('hidden');
      return;
    }

    const rendered = await authSvc.renderOfficialGoogleButton(
      gsiSlot,
      realProfile => advanceToOpenAlexStep(realProfile, null),
      err => setGoogleModalStatus(err.message || 'Không thể đăng nhập Google.', 'error')
    );

    if (rendered) {
      bannerEl.className = 'google-env-banner is-ready';
      bannerEl.textContent = 'Nhấn nút Google ở trên để đăng nhập và chuyển sang bước xác nhận.';

      const loc = window.location || {};
      if (loc.hostname === '127.0.0.1' || loc.hostname === '[::1]') {
        const localhostAlt = `http://localhost${loc.port ? `:${loc.port}` : ''}${loc.pathname || '/login.html'}`;
        setOriginNote(
          `Nếu gặp <strong>Error 400: origin_mismatch</strong>: Origin hiện tại là <code class="google-setup-guide__code">${escapeAuthHtml(currentOrigin)}</code> `
          + `(Google Cloud Console thường yêu cầu dùng <code class="google-setup-guide__code">localhost</code>). `
          + `Hãy thêm <code class="google-setup-guide__code">${escapeAuthHtml(currentOrigin)}</code> hoặc chuyển sang `
          + `<a class="google-setup-guide__link" href="${escapeAuthHtml(localhostAlt)}">${escapeAuthHtml(localhostAlt)}</a> / `
          + `<a class="google-setup-guide__link" href="http://localhost:3000/login.html">http://localhost:3000/login.html</a> `
          + 'và khai báo các URL đó trong <strong>Authorized JavaScript origins</strong>.'
        );
      } else if (currentOrigin) {
        setOriginNote(
          `Origin trang hiện tại: <code class="google-setup-guide__code">${escapeAuthHtml(currentOrigin)}</code> `
          + '— nếu gặp <strong>Error 400: origin_mismatch</strong>, hãy kiểm tra chuỗi này đã có trong <strong>Authorized JavaScript origins</strong> của Google Cloud Console (không có dấu <code class="google-setup-guide__code">/</code> ở cuối).'
        );
      }
    } else {
      bannerEl.className = 'google-env-banner is-warning';
      bannerEl.textContent =
        'Không thể tải nút Google Sign-In từ accounts.google.com. Vui lòng kiểm tra kết nối mạng, trình chặn quảng cáo hoặc Authorized JavaScript origins.';
      showGuide(buildGoogleSetupGuideHtml('gis-failed', currentOrigin, apiBase));
      if (retryBtn) retryBtn.removeAttribute('hidden');
    }
  }

  /**
   * Đồng bộ giao diện hiển thị đúng bước hiện tại (1, 2 hoặc 3) và danh tính Google đã xác thực.
   */
  function syncGoogleWizardStepUi() {
    const stepNum = googleFlowState.step;
    document.querySelectorAll('#googleFlowSteps .google-steps__item').forEach(el => {
      const s = Number(el.getAttribute('data-step'));
      el.classList.toggle('is-active', s === stepNum);
      el.classList.toggle('is-done', s < stepNum);
    });

    [1, 2, 3].forEach(idx => {
      const pane = document.getElementById(`googleStepPane${idx}`);
      if (pane) {
        if (idx === stepNum) pane.removeAttribute('hidden');
        else pane.setAttribute('hidden', 'true');
      }
    });

    const profile = googleFlowState.googleProfile;
    if (profile && (stepNum === 2 || stepNum === 3)) {
      const displayName = profile.fullName || profile.name || 'Người dùng Google';
      const barHtml = `
        <div class="google-identity-bar__left">
          <div class="google-identity-bar__avatar" aria-hidden="true">
            ${buildGoogleAvatarHtml(profile, 'google-identity-bar__avatar-img', 44)}
          </div>
          <div class="google-identity-bar__info">
            <strong class="google-identity-bar__name">${escapeAuthHtml(displayName)}</strong>
            <span class="google-identity-bar__email">${escapeAuthHtml(profile.email || '')}</span>
          </div>
        </div>
        <span class="google-account-card__tag google-account-card__tag--saved">Google Gmail</span>
      `;
      ['googleIdentityBar2', 'googleIdentityBar3'].forEach(barId => {
        const barEl = document.getElementById(barId);
        if (barEl) {
          barEl.innerHTML = barHtml;
          bindAuthAvatarFallbacks(barEl);
        }
      });
    }
  }

  /**
   * Đồng bộ trạng thái hiển thị hộp xin phép tìm Scholar vs khung kết quả ứng viên tại Bước 2.
   */
  function syncStep2ConsentUi() {
    const consentBox = document.getElementById('googleScholarConsentBox');
    const lookupArea = document.getElementById('googleScholarLookupArea');
    const accepted = googleFlowState.consentState === 'accepted';
    if (consentBox) {
      if (accepted) consentBox.setAttribute('hidden', 'true');
      else consentBox.removeAttribute('hidden');
    }
    if (lookupArea) {
      if (accepted) lookupArea.removeAttribute('hidden');
      else lookupArea.setAttribute('hidden', 'true');
    }
  }

  /**
   * Kiểm tra xem email vừa đăng nhập đã có lĩnh vực lưu trên backend GET /api/fields hay chưa.
   * @param {string} email - Email người dùng.
   */
  async function checkBackendSavedFields(email) {
    const useSavedBtn = document.getElementById('googleUseSavedBtn');
    const protocol = window.location ? window.location.protocol : '';
    if (!email || (protocol !== 'http:' && protocol !== 'https:')) return;

    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timeoutId = controller ? window.setTimeout(() => controller.abort(), 2500) : null;
    try {
      const url = `${getAuthBackendBaseUrl()}/api/fields?email=${encodeURIComponent(email)}`;
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller ? controller.signal : undefined
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data && Array.isArray(data.fields) && data.fields.length > 0) {
        googleFlowState.backendSavedFields = data.fields;
        if (useSavedBtn) useSavedBtn.removeAttribute('hidden');
      }
    } catch {
      // Bỏ qua nếu backend chưa chạy
    } finally {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    }
  }

  /**
   * Chuẩn hóa tên nguồn dữ liệu hợp lệ (serpapi | openalex | orcid | semantic_scholar | confguide_saved | manual).
   * @param {*} rawSource - Chuỗi nguồn thô.
   * @returns {'serpapi'|'openalex'|'orcid'|'semantic_scholar'|'confguide_saved'|'manual'} Nguồn hợp lệ.
   */
  function normalizeResearchSource(rawSource) {
    const low = String(rawSource || '').trim().toLowerCase();
    if (
      low === 'serpapi'
      || low === 'openalex'
      || low === 'orcid'
      || low === 'semantic_scholar'
      || low === 'confguide_saved'
      || low === 'manual'
    ) {
      return low;
    }
    if (low === 'openalex_fallback') return 'openalex';
    if (low === 'scholar') return 'serpapi';
    return 'manual';
  }

  /**
   * Tạo nhãn mô tả nguồn kèm mã nguồn chuẩn.
   * @param {string} source - Mã nguồn chuẩn.
   * @returns {string} Chuỗi mô tả nguồn rõ ràng.
   */
  function formatResearchSourceLabel(source) {
    const norm = normalizeResearchSource(source);
    if (norm === 'serpapi') return 'Google Scholar via SerpApi (serpapi)';
    if (norm === 'openalex') return 'OpenAlex API (openalex)';
    if (norm === 'orcid') return 'ORCID Public API (orcid)';
    if (norm === 'semantic_scholar') return 'Semantic Scholar API (semantic_scholar)';
    if (norm === 'confguide_saved') return 'Hội nghị bạn đã quan tâm trên ConfGuide (confguide_saved)';
    return 'Thủ công / Phân tích tiểu sử & từ khóa (manual)';
  }

  /**
   * Tạo URL tìm hồ sơ tác giả trực tiếp trên Google Scholar theo tên.
   * @param {string} name - Tên nhà nghiên cứu.
   * @returns {string} URL Google Scholar công khai.
   */
  function buildScholarAuthorSearchUrl(name) {
    const clean = String(name || '').replace(/\s+/g, ' ').trim();
    if (!clean) return 'https://scholar.google.com/citations?hl=en';
    return `https://scholar.google.com/citations?view_op=search_authors&mauthors=${encodeURIComponent(clean)}&hl=en`;
  }

  /**
   * Đồng bộ liên kết mở Google Scholar ở cả Bước 2 và Bước 3 theo tên tác giả đang nhập.
   * @param {string} name - Tên tác giả hiện tại.
   */
  function syncScholarExternalLinks(name) {
    const url = buildScholarAuthorSearchUrl(name);
    ['googleStep2ScholarLink', 'googleStep3ScholarLink'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.setAttribute('href', url);
    });
  }

  /**
   * Hiển thị dải thông tin nguồn đang dùng và bộ đếm quota SerpApi trong tháng (giới hạn 250).
   * @param {string} text - Nội dung thông báo ngắn.
   */
  function setLookupMetaBanner(text) {
    const metaEl = document.getElementById('googleLookupMetaBanner');
    if (!metaEl) return;
    if (!text) {
      metaEl.textContent = '';
      metaEl.setAttribute('hidden', 'true');
      return;
    }
    metaEl.textContent = text;
    metaEl.removeAttribute('hidden');
  }

  /**
   * Tạo chuỗi tóm tắt bộ đếm SerpApi trong tháng từ phản hồi backend.
   * @param {Object|null} usage - Đối tượng serpapiUsage từ backend.
   * @returns {string} Chuỗi mô tả quota.
   */
  function formatSerpApiUsageNote(usage) {
    if (!usage || typeof usage !== 'object') return '';
    const count = Number(usage.count || 0);
    const limit = Number(usage.limit || 250);
    const stopAt = Number(usage.stopAt || 245);
    if (usage.stopped || count >= stopAt) {
      return `SerpApi tháng ${usage.month || ''}: ${count}/${limit} lượt (đã dừng trước trần ${limit} để bảo toàn quota)`;
    }
    return `SerpApi tháng ${usage.month || ''}: ${count}/${limit} lượt`;
  }

  /**
   * Kết xuất danh sách ứng viên ở Bước 2 kèm nhãn nguồn rõ ràng (serpapi / openalex / orcid).
   * @param {Array<Object>} candidates - Danh sách tối đa 5 ứng viên.
   * @param {string} topSource - Nguồn cấp dữ liệu chính của phản hồi.
   */
  function renderStep2CandidateCards(candidates, topSource) {
    const resultsEl = document.getElementById('googleOaResultsList');
    if (!resultsEl) return;

    resultsEl.innerHTML = candidates.map((cand, idx) => {
      const candSource = normalizeResearchSource(cand.source || topSource);
      const interestsList = Array.isArray(cand.interests) ? cand.interests : [];
      const paperList = Array.isArray(cand.paperTitles) ? cand.paperTitles : [];
      const bioText = String(cand.biography || '').trim();
      const matchedLabels = cand.mapped && Array.isArray(cand.mapped.matched)
        ? cand.mapped.matched.map(m => m.label).filter(Boolean)
        : [];
      const metaParts = [cand.affiliation || 'Chưa rõ cơ quan công tác'];
      if (cand.emailDomain) metaParts.push(`Email: ${cand.emailDomain}`);
      if (cand.orcid) metaParts.push(`ORCID: ${cand.orcid}`);
      metaParts.push(`Nguồn: ${candSource}`);

      return `
        <div class="google-oa-card">
          <div class="google-oa-card__info">
            <strong class="google-oa-card__name">${escapeAuthHtml(cand.name)}</strong>
            <span class="google-oa-card__meta">${escapeAuthHtml(metaParts.join(' · '))}</span>
            ${bioText
              ? `<span class="google-oa-card__topics">Tiểu sử: ${escapeAuthHtml(bioText)}</span>`
              : ''}
            ${interestsList.length > 0
              ? `<span class="google-oa-card__topics">Lĩnh vực công khai: ${escapeAuthHtml(interestsList.slice(0, 5).join(', '))}</span>`
              : ''}
            ${paperList.length > 0
              ? `<span class="google-oa-card__topics">Bài báo tác giả (${cand.paperCount || paperList.length}): ${escapeAuthHtml(paperList.slice(0, 2).join(' | '))}</span>`
              : ''}
            ${!bioText && interestsList.length === 0 && paperList.length === 0
              ? '<span class="google-oa-card__topics">Chưa công khai tiểu sử, bài báo hay danh sách lĩnh vực</span>'
              : ''}
            ${matchedLabels.length > 0
              ? `<span class="google-oa-card__mapped">Tự động nhận diện (fieldMap): ${escapeAuthHtml(matchedLabels.join(', '))}</span>`
              : ''}
          </div>
          <button type="button" class="btn btn-primary btn--compact-sm js-google-pick-author"
            data-author-idx="${idx}">
            Chọn hồ sơ này
          </button>
        </div>
      `;
    }).join('');
  }

  /**
   * Kết xuất thẻ dự phòng tại Bước 2 khi SerpApi và OpenAlex không có dữ liệu:
   * nhắc nhập ORCID iD, mở Google Scholar của bạn hoặc chuyển sang dán từ khóa / chọn thủ công.
   * @param {string} reasonMessage - Thông điệp giải thích lý do chưa có dữ liệu tự động.
   * @param {string} currentName - Tên hiện tại để tạo link Google Scholar.
   */
  function renderStep2NoDataFallback(reasonMessage, currentName) {
    const resultsEl = document.getElementById('googleOaResultsList');
    if (!resultsEl) return;
    const scholarUrl = buildScholarAuthorSearchUrl(currentName);

    resultsEl.innerHTML = `
      <div class="google-fallback-panel">
        <p>${escapeAuthHtml(reasonMessage)}</p>
        <div class="google-fallback-panel__actions">
          <a class="btn btn-secondary btn--compact-sm" href="${escapeAuthHtml(scholarUrl)}"
            target="_blank" rel="noopener noreferrer">
            Mở Google Scholar của bạn &#8599;
          </a>
          <button type="button" class="btn btn-primary btn--compact-sm js-google-go-step3-manual">
            Dán từ khóa / Chọn lĩnh vực thủ công &rarr;
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Gọi backend GET /api/scholar/candidates?name=...&orcid=... (3 tầng: SerpApi -> OpenAlex -> ORCID -> Manual).
   * @returns {Promise<void>}
   */
  async function runStep2ScholarSearch() {
    const nameInput = document.getElementById('googleOaNameInput');
    const orcidInput = document.getElementById('googleOrcidInput');
    const resultsEl = document.getElementById('googleOaResultsList');
    const searchBtn = document.getElementById('googleOaSearchBtn');
    if (!resultsEl) return;

    const name = nameInput ? nameInput.value.trim() : '';
    const orcid = orcidInput ? orcidInput.value.trim() : '';
    syncScholarExternalLinks(name);

    if (name.length < 2 && !orcid) {
      resultsEl.innerHTML = '<p class="modal-hint">Nhập tên tác giả (tối thiểu 2 ký tự) hoặc nhập ORCID iD rồi nhấn tìm.</p>';
      return;
    }

    if (searchBtn) searchBtn.setAttribute('disabled', 'true');
    setLookupMetaBanner('Đang tự động tìm: SerpApi Google Scholar → OpenAlex → ORCID (tiểu sử & bài báo) → Semantic Scholar...');
    setGoogleModalStatus('Đang tự động tìm hồ sơ nghiên cứu & bài báo công khai theo tài khoản Google...', 'muted');
    resultsEl.innerHTML = '<p class="modal-hint">Đang tra cứu ứng viên và trích xuất lĩnh vực...</p>';

    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timeoutId = controller ? window.setTimeout(() => controller.abort(), 16000) : null;

    try {
      const params = new URLSearchParams();
      if (name) params.set('name', name);
      if (orcid) params.set('orcid', orcid);
      const profileEmail = googleFlowState.googleProfile && googleFlowState.googleProfile.email
        ? googleFlowState.googleProfile.email.trim()
        : '';
      if (profileEmail) params.set('email', profileEmail);
      const url = `${getAuthBackendBaseUrl()}/api/scholar/candidates?${params.toString()}`;
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller ? controller.signal : undefined
      });
      let data = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }

      if (searchBtn) searchBtn.removeAttribute('disabled');
      if (googleFlowState.step !== 2) return;

      const source = normalizeResearchSource(data.source);
      const usageNote = formatSerpApiUsageNote(data.serpapiUsage);
      const metaParts = [`Nguồn hiện tại: ${source}`];
      if (usageNote) metaParts.push(usageNote);
      setLookupMetaBanner(metaParts.join(' · '));

      if (!response.ok) {
        googleFlowState.scholarCandidates = [];
        googleFlowState.candidateSource = 'manual';
        setGoogleModalStatus(data.message || 'Không tra cứu được hồ sơ tự động.', 'muted');
        renderStep2NoDataFallback(
          data.message || 'Không lấy được dữ liệu từ SerpApi / OpenAlex. Hãy nhập ORCID iD phía trên, mở Google Scholar để copy từ khóa, hoặc chuyển sang dán từ khóa / chọn thủ công.',
          name
        );
        return;
      }

      const candidates = Array.isArray(data.candidates) ? data.candidates.slice(0, 5) : [];
      googleFlowState.scholarCandidates = candidates;
      googleFlowState.candidateSource = source;

      if (candidates.length === 0) {
        setGoogleModalStatus(
          'Chưa có hồ sơ tự động từ SerpApi/OpenAlex. Bạn có thể nhập ORCID iD hoặc dán từ khóa.',
          'muted'
        );
        renderStep2NoDataFallback(
          data.message || 'Không tìm thấy hồ sơ qua SerpApi hoặc OpenAlex. Hãy nhập ORCID iD phía trên (không cần API key), mở Google Scholar của bạn để sao chép lĩnh vực, hoặc bấm nút bên dưới để dán từ khóa / chọn thủ công.',
          name
        );
        return;
      }

      setGoogleModalStatus(
        `Tìm thấy ${candidates.length} ứng viên từ ${formatResearchSourceLabel(source)}. Chọn đúng hồ sơ của bạn:`,
        'success'
      );
      renderStep2CandidateCards(candidates, source);
    } catch {
      if (searchBtn) searchBtn.removeAttribute('disabled');
      if (googleFlowState.step !== 2) return;
      googleFlowState.scholarCandidates = [];
      googleFlowState.candidateSource = 'manual';
      setLookupMetaBanner('Backend không phản hồi (chế độ tĩnh / ngoại tuyến) · Nguồn: manual');
      setGoogleModalStatus('Không kết nối được backend tra cứu tự động.', 'muted');
      renderStep2NoDataFallback(
        'Không kết nối được máy chủ backend. Bạn có thể mở Google Scholar của mình trên tab mới rồi chuyển sang dán từ khóa / chọn lĩnh vực thủ công.',
        name
      );
    } finally {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    }
  }

  /**
   * Tra cứu trực tiếp ORCID Public API (không cần key) qua GET /api/scholar/orcid?id=...
   * @returns {Promise<void>}
   */
  async function runStep2OrcidSearch() {
    const orcidInput = document.getElementById('googleOrcidInput');
    const nameInput = document.getElementById('googleOaNameInput');
    const orcidBtn = document.getElementById('googleOrcidSearchBtn');
    const resultsEl = document.getElementById('googleOaResultsList');
    if (!orcidInput || !resultsEl) return;

    const rawOrcid = orcidInput.value.trim();
    const currentName = nameInput ? nameInput.value.trim() : '';
    if (!rawOrcid) {
      setGoogleModalStatus('Vui lòng nhập ORCID iD (ví dụ: 0000-0002-1825-0097) trước khi tìm.', 'error');
      orcidInput.focus();
      return;
    }

    if (orcidBtn) orcidBtn.setAttribute('disabled', 'true');
    setGoogleModalStatus('Đang tra cứu ORCID Public API (không cần key)...', 'muted');
    resultsEl.innerHTML = '<p class="modal-hint">Đang đọc hồ sơ công khai từ pub.orcid.org...</p>';

    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timeoutId = controller ? window.setTimeout(() => controller.abort(), 12000) : null;

    try {
      const url = `${getAuthBackendBaseUrl()}/api/scholar/orcid?id=${encodeURIComponent(rawOrcid)}`;
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller ? controller.signal : undefined
      });
      let data = {};
      try {
        data = await response.json();
      } catch {
        data = {};
      }
      if (orcidBtn) orcidBtn.removeAttribute('disabled');
      if (googleFlowState.step !== 2) return;

      if (!response.ok) {
        googleFlowState.scholarCandidates = [];
        setLookupMetaBanner('Nguồn hiện tại: manual (ORCID chưa trả về kết quả)');
        setGoogleModalStatus(data.message || 'Không tìm thấy hồ sơ ORCID.', 'error');
        renderStep2NoDataFallback(
          data.message || 'Không đọc được hồ sơ ORCID. Bạn có thể mở Google Scholar hoặc dán từ khóa ở bước tiếp theo.',
          currentName
        );
        return;
      }

      const candidate = Object.assign({}, data, { source: 'orcid' });
      googleFlowState.scholarCandidates = [candidate];
      googleFlowState.candidateSource = 'orcid';
      setLookupMetaBanner(`Nguồn hiện tại: orcid · ORCID iD: ${candidate.orcid || rawOrcid}`);
      setGoogleModalStatus(
        'Đã đọc hồ sơ công khai từ ORCID Public API (orcid). Chọn hồ sơ bên dưới để đối chiếu qua fieldMap:',
        'success'
      );
      renderStep2CandidateCards([candidate], 'orcid');
    } catch {
      if (orcidBtn) orcidBtn.removeAttribute('disabled');
      if (googleFlowState.step !== 2) return;
      setGoogleModalStatus('Không kết nối được backend để tra cứu ORCID.', 'error');
      renderStep2NoDataFallback(
        'Không kết nối được backend ORCID. Bạn có thể mở Google Scholar trên tab mới rồi chuyển sang dán từ khóa / chọn thủ công.',
        currentName
      );
    } finally {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    }
  }

  /**
   * Tải chi tiết hồ sơ từ GET /api/scholar/profile?id=<id> (SerpApi / OpenAlex / ORCID)
   * rồi chuyển sang Bước 3 xác nhận checkbox lĩnh vực (đã đối chiếu qua fieldMap.js).
   * @param {number} idx - Chỉ số ứng viên trong googleFlowState.scholarCandidates.
   */
  async function handlePickScholarCandidate(idx) {
    const candidate = Number.isInteger(idx) ? googleFlowState.scholarCandidates[idx] : null;
    if (!candidate) return;

    const candSource = normalizeResearchSource(candidate.source || googleFlowState.candidateSource);
    const targetId = candidate.orcid || candidate.scholarId || candidate.openAlexId || '';
    if (!targetId) {
      advanceToDomainConfirmationStep(Object.assign({}, candidate, { source: candSource }));
      return;
    }

    setGoogleModalStatus(`Đang tải chi tiết lĩnh vực từ nguồn ${candSource}...`, 'muted');
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timeoutId = controller ? window.setTimeout(() => controller.abort(), 12000) : null;

    try {
      const url = `${getAuthBackendBaseUrl()}/api/scholar/profile?id=${encodeURIComponent(targetId)}`;
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller ? controller.signal : undefined
      });
      if (!response.ok) {
        if (candidate.mapped || (Array.isArray(candidate.interests) && candidate.interests.length > 0)) {
          advanceToDomainConfirmationStep(Object.assign({}, candidate, { source: candSource }));
        } else {
          advanceToDomainConfirmationStep(null, 'scholar-blocked');
        }
        return;
      }
      const profileData = await response.json();
      const merged = Object.assign({}, candidate, profileData, {
        source: normalizeResearchSource(profileData.source || candSource)
      });
      advanceToDomainConfirmationStep(merged);
    } catch {
      if (candidate.mapped || (Array.isArray(candidate.interests) && candidate.interests.length > 0)) {
        advanceToDomainConfirmationStep(Object.assign({}, candidate, { source: candSource }));
      } else {
        advanceToDomainConfirmationStep(null, 'backend-offline');
      }
    } finally {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    }
  }

  /**
   * Đưa danh sách từ khóa người dùng dán ở Bước 3 qua POST /api/scholar/map-keywords (fieldMap.js)
   * rồi tích sẵn các checkbox khớp để người dùng xác nhận trước khi lưu (nguồn: manual).
   * @returns {Promise<void>}
   */
  async function handleMapPastedKeywords() {
    const pasteEl = document.getElementById('googlePasteKeywordsInput');
    const mapBtn = document.getElementById('googleMapKeywordsBtn');
    if (!pasteEl) return;

    const rawKeywords = pasteEl.value.trim();
    if (!rawKeywords) {
      setGoogleModalStatus('Vui lòng dán từ khóa nghiên cứu trước khi phân tích.', 'error');
      pasteEl.focus();
      return;
    }

    if (mapBtn) mapBtn.setAttribute('disabled', 'true');
    setGoogleModalStatus('Đang đối chiếu từ khóa qua fieldMap...', 'muted');

    let matched = [];
    let unmatched = [];

    try {
      const controller = typeof AbortController === 'function' ? new AbortController() : null;
      const timeoutId = controller ? window.setTimeout(() => controller.abort(), 8000) : null;
      try {
        const res = await fetch(`${getAuthBackendBaseUrl()}/api/scholar/map-keywords`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ keywords: rawKeywords }),
          signal: controller ? controller.signal : undefined
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.mapped) {
            matched = Array.isArray(data.mapped.matched) ? data.mapped.matched : [];
            unmatched = Array.isArray(data.mapped.unmatched) ? data.mapped.unmatched : [];
          }
        }
      } finally {
        if (timeoutId !== null) window.clearTimeout(timeoutId);
      }
    } catch {
      // Dự phòng đối chiếu ngay trên client nếu backend ngoại tuyến
      const tokens = rawKeywords.split(/[,;\n\r|]+/).map(s => s.trim()).filter(Boolean);
      const seenK = new Set();
      tokens.forEach(tok => {
        const keys = (window.ConfGuideUtils && typeof window.ConfGuideUtils.parseTopicKeysFromText === 'function')
          ? window.ConfGuideUtils.parseTopicKeysFromText(tok)
          : [];
        if (keys.length === 0) {
          unmatched.push(tok);
        } else {
          keys.forEach(k => {
            if (seenK.has(k)) return;
            seenK.add(k);
            matched.push({
              key: k,
              label: AUTH_TOPIC_LABEL_BY_KEY[k] || k,
              matchedInterests: [tok]
            });
          });
        }
      });
    } finally {
      if (mapBtn) mapBtn.removeAttribute('disabled');
    }

    if (matched.length > 0) {
      matched.forEach(item => {
        if (item && item.key) googleFlowState.selectedKeys.add(item.key);
      });
      const prevMatched = (googleFlowState.mappingResult && Array.isArray(googleFlowState.mappingResult.matched))
        ? googleFlowState.mappingResult.matched
        : [];
      const mergedMatchedMap = new Map(prevMatched.map(m => [m.key, m]));
      matched.forEach(m => {
        if (m && m.key) mergedMatchedMap.set(m.key, m);
      });

      googleFlowState.mappingResult = {
        recognized: true,
        source: 'manual',
        authorName: (googleFlowState.googleProfile && googleFlowState.googleProfile.fullName) || 'Từ khóa người dùng dán',
        affiliation: '',
        matched: Array.from(mergedMatchedMap.values()),
        unmatched
      };
      setGoogleModalStatus(
        `Đã đối chiếu được ${matched.length} lĩnh vực (nguồn: manual). Hãy kiểm tra lại checkbox rồi bấm Xác nhận.`,
        'success'
      );
    } else {
      googleFlowState.mappingResult = {
        recognized: false,
        source: 'manual',
        authorName: '',
        affiliation: '',
        matched: [],
        unmatched,
        fallbackReason: 'no-matching-it-topics',
        customMessage: unmatched.length > 0
          ? `Các từ khóa "${unmatched.join(', ')}" chưa khớp trực tiếp 25 nhóm chuẩn — bạn có thể thêm bằng ô Tùy chỉnh hoặc tích chọn thủ công bên dưới.`
          : 'Không phân tích được từ khóa phù hợp.'
      };
      setGoogleModalStatus('Chưa khớp tự động lĩnh vực nào, hãy chọn thủ công bên dưới.', 'muted');
    }

    renderStep3ConfirmationUi();
  }

  /**
   * Chuyển sang Bước 2 sau khi đăng nhập Google: hỏi người dùng Đồng ý / Bỏ qua tìm hồ sơ công khai.
   * @param {Object} profile - Hồ sơ Google (`{ name, fullName, email, picture, avatarUrl }`).
   * @param {Object|null} [sampleAccount=null] - Bản ghi mẫu nếu đi từ nút dùng thử.
   */
  function advanceToOpenAlexStep(profile, sampleAccount = null) {
    if (!profile || !profile.email) return;

    const users = readJsonStorage(USERS_STORAGE_KEY, []);
    const emailLower = String(profile.email).trim().toLowerCase();
    const existingRecord = Array.isArray(users)
      ? users.find(u => u && u.email && u.email.toLowerCase() === emailLower)
      : null;

    googleFlowState.googleProfile = {
      sub: profile.sub || '',
      name: profile.name || profile.fullName || emailLower.split('@')[0],
      fullName: profile.fullName || profile.name || emailLower.split('@')[0],
      email: profile.email.trim(),
      avatarUrl: profile.avatarUrl || profile.picture || (existingRecord && existingRecord.avatarUrl) || '',
      orcid: profile.orcid || (existingRecord && existingRecord.orcid) || ''
    };
    googleFlowState.sampleAccount = sampleAccount || existingRecord || null;
    googleFlowState.consentState = 'pending';
    googleFlowState.scholarCandidates = [];
    googleFlowState.candidateSource = '';
    googleFlowState.selectedAuthor = null;
    googleFlowState.mappingResult = null;
    googleFlowState.selectedKeys = new Set();
    googleFlowState.customDomains = [];
    googleFlowState.backendSavedFields = null;
    googleFlowState.step = 2;

    const oaNameEl = document.getElementById('googleOaNameInput');
    const orcidEl = document.getElementById('googleOrcidInput');
    const resultsEl = document.getElementById('googleOaResultsList');
    const useSavedBtn = document.getElementById('googleUseSavedBtn');
    const hasExistingFields = Boolean(
      existingRecord && existingRecord.fieldsOfInterest && String(existingRecord.fieldsOfInterest).trim()
    );

    if (oaNameEl) oaNameEl.value = googleFlowState.googleProfile.name;
    if (orcidEl) orcidEl.value = googleFlowState.googleProfile.orcid || '';
    syncScholarExternalLinks(googleFlowState.googleProfile.name);
    setLookupMetaBanner('');
    if (resultsEl) resultsEl.innerHTML = '';
    if (useSavedBtn) {
      if (hasExistingFields) useSavedBtn.removeAttribute('hidden');
      else useSavedBtn.setAttribute('hidden', 'true');
    }

    setGoogleModalStatus('');
    syncGoogleWizardStepUi();
    syncStep2ConsentUi();
    checkBackendSavedFields(googleFlowState.googleProfile.email);
  }

  /**
   * Kết xuất Bước 3: hiển thị lĩnh vực gợi ý dạng checkbox (đã đối chiếu qua fieldMap.js) hoặc chế độ chọn thủ công.
   */
  function renderStep3ConfirmationUi() {
    const bannerEl = document.getElementById('googleMapperBanner');
    const gridEl = document.getElementById('googleStep3TopicsGrid');
    const countEl = document.getElementById('googleStep3CountBadge');
    const finishBtn = document.getElementById('googleConfirmFinishBtn');
    if (!bannerEl || !gridEl) return;

    const oaNameEl = document.getElementById('googleOaNameInput');
    syncScholarExternalLinks((oaNameEl && oaNameEl.value) || (googleFlowState.googleProfile && googleFlowState.googleProfile.name) || '');

    const rec = googleFlowState.mappingResult;
    const recSource = normalizeResearchSource(rec && rec.source);
    const matchedKeys = new Set(
      rec && Array.isArray(rec.matched) ? rec.matched.map(item => item.key) : []
    );

    if (rec && rec.recognized && Array.isArray(rec.matched) && rec.matched.length > 0) {
      bannerEl.className = 'google-mapper-banner is-success';
      const sourceLabel = formatResearchSourceLabel(recSource);
      const matchedLabels = rec.matched.map(t => t.label).join(' • ');
      const unmatchedList = Array.isArray(rec.unmatched) ? rec.unmatched : [];
      const unmatchedHtml = unmatchedList.length > 0
        ? `<p class="google-unmatched-note">Chưa tự động khớp (${unmatchedList.length}): ${escapeAuthHtml(unmatchedList.join(', '))} — bạn có thể thêm thủ công bên dưới.</p>`
        : '';
      const signalTags = new Set();
      rec.matched.forEach(item => {
        if (item && Array.isArray(item.matchedFrom)) {
          item.matchedFrom.forEach(tag => signalTags.add(tag));
        }
      });
      const signalNames = [];
      if (signalTags.has('interests')) signalNames.push('lĩnh vực công khai');
      if (signalTags.has('biography')) signalNames.push('tiểu sử hồ sơ');
      if (signalTags.has('papers')) signalNames.push('bài báo là tác giả');
      if (signalTags.has('affiliation')) signalNames.push('đơn vị công tác');
      if (signalTags.has('saved')) signalNames.push('hội nghị đã quan tâm');
      const signalNoteHtml = signalNames.length > 0
        ? `<p class="google-unmatched-note">Tín hiệu đã trích xuất tự động từ: <strong>${escapeAuthHtml(signalNames.join(', '))}</strong>.</p>`
        : '';

      bannerEl.innerHTML = `
        <div class="google-mapper-banner__head">
          <span class="google-mapper-banner__badge">Nguồn: ${escapeAuthHtml(sourceLabel)}</span>
          ${rec.authorName ? `<span>Hồ sơ: <strong>${escapeAuthHtml(rec.authorName)}</strong>${rec.affiliation ? ` · ${escapeAuthHtml(rec.affiliation)}` : ''}</span>` : ''}
        </div>
        <p class="pref-recognition__desc">
          Đã đối chiếu qua <strong>fieldMap</strong> và gợi ý: <strong>${escapeAuthHtml(matchedLabels)}</strong>.
          Tích chọn hoặc bỏ chọn bên dưới để xác nhận trước khi lưu vào <strong>Lĩnh vực của tôi</strong>.
        </p>
        ${signalNoteHtml}
        ${unmatchedHtml}
      `;
      if (finishBtn) finishBtn.textContent = 'Xác nhận & Hoàn tất đăng nhập';
    } else {
      let reason = 'Hãy nhập ngắn gọn tiểu sử/từ khóa ở ô bên trên hoặc tích chọn thủ công các lĩnh vực quan tâm.';
      if (rec) {
        if (rec.customMessage) {
          reason = rec.customMessage;
        } else if (rec.fallbackReason === 'scholar-blocked') {
          reason = 'Không lấy được dữ liệu tự động từ SerpApi / OpenAlex / ORCID. Hãy nhập tiểu sử ngắn gọn ở trên hoặc tích chọn thủ công.';
        } else if (rec.fallbackReason === 'backend-offline') {
          reason = 'Không kết nối được tới máy chủ backend. Bạn vẫn có thể phân tích tiểu sử/từ khóa hoặc chọn lĩnh vực thủ công bên dưới.';
        } else if (rec.fallbackReason === 'user-skipped') {
          reason = 'Bạn đã chọn bỏ qua bước tìm hồ sơ tự động.';
        } else if (rec.fallbackReason === 'not-me') {
          reason = 'Bạn đã chọn "Không phải tôi". Hãy mô tả tiểu sử ngắn hoặc chọn lĩnh vực thủ công bên dưới.';
        } else if (rec.fallbackReason === 'no-matching-it-topics') {
          reason = 'Các bài báo/lĩnh vực trên hồ sơ chưa khớp trực tiếp 25 nhóm CNTT của hệ thống — bạn có thể chọn thủ công hoặc thêm tùy chỉnh.';
        } else if (rec.fallbackReason === 'author-not-found') {
          reason = 'Chưa tìm thấy hồ sơ học thuật công khai phù hợp theo tài khoản Google này.';
        }
      }
      bannerEl.className = 'google-mapper-banner is-fallback';
      bannerEl.innerHTML = `
        <div class="google-mapper-banner__head">
          <span class="google-mapper-banner__badge">Nguồn: Thủ công / Tự mô tả (manual)</span>
        </div>
        <p class="pref-recognition__desc">
          ${escapeAuthHtml(reason)}
        </p>
      `;
      if (finishBtn) finishBtn.textContent = 'Xác nhận & Lưu vào Lĩnh vực của tôi';
    }

    const customTagsHtml = googleFlowState.customDomains.map((dom, idx) => `
      <label class="pref-topic-row is-selected">
        <input type="checkbox" class="pref-topic-row__input js-google-step3-custom-check"
          value="${idx}" checked>
        <span class="pref-topic-row__label">${escapeAuthHtml(dom.label)}</span>
        <span class="pref-topic-row__ai-tag">Tùy chỉnh</span>
      </label>
    `).join('');

    const canonicalHtml = AUTH_CANONICAL_TOPICS.map(item => {
      const checked = googleFlowState.selectedKeys.has(item.key);
      const isSuggested = matchedKeys.has(item.key);
      return `
        <label class="pref-topic-row${checked ? ' is-selected' : ''}">
          <input type="checkbox" class="pref-topic-row__input js-google-step3-check"
            value="${escapeAuthHtml(item.key)}"${checked ? ' checked' : ''}>
          <span class="pref-topic-row__label">${escapeAuthHtml(item.label)}</span>
          ${isSuggested ? '<span class="pref-topic-row__ai-tag">Gợi ý</span>' : ''}
        </label>
      `;
    }).join('');

    gridEl.innerHTML = customTagsHtml + canonicalHtml;

    const totalSelected = googleFlowState.selectedKeys.size + googleFlowState.customDomains.length;
    if (countEl) countEl.textContent = `Đã chọn: ${totalSelected} lĩnh vực`;
  }

  /**
   * Tự động suy ra lĩnh vực nghiên cứu từ các hội nghị người dùng đã lưu/quan tâm trên ConfGuide
   * và phần tiểu sử/công việc sẵn có trong tài khoản cục bộ (không bắt người dùng copy-paste).
   * @param {Object|null} baseAccount - Hồ sơ người dùng cục bộ hiện có (nếu có).
   * @returns {Array<{ key: string, label: string, matchedInterests: Array<string>, matchedFrom: Array<string> }>}
   */
  function inferSavedSignalsFromLocalState(baseAccount) {
    const utils = window.ConfGuideUtils;
    if (!utils) return [];

    const matchedByKey = new Map();
    const addMatch = (key, reasonText, fromTag) => {
      if (!key || !AUTH_TOPIC_LABEL_BY_KEY[key]) return;
      let entry = matchedByKey.get(key);
      if (!entry) {
        entry = {
          key,
          label: AUTH_TOPIC_LABEL_BY_KEY[key],
          matchedInterests: [],
          matchedFrom: []
        };
        matchedByKey.set(key, entry);
      }
      if (reasonText && !entry.matchedInterests.includes(reasonText)) {
        entry.matchedInterests.push(reasonText);
      }
      if (fromTag && !entry.matchedFrom.includes(fromTag)) {
        entry.matchedFrom.push(fromTag);
      }
    };

    // 1. Đọc hội nghị đã lưu quan tâm trên ConfGuide (khách + tài khoản trước đó)
    const savedIds = new Set();
    const keysToCheck = ['confguide_saved_guest'];
    if (baseAccount && baseAccount.id) keysToCheck.push(`confguide_saved_${baseAccount.id}`);
    keysToCheck.forEach(storageKey => {
      const list = readJsonStorage(storageKey, []);
      if (Array.isArray(list)) {
        list.forEach(id => {
          const clean = String(id || '').trim();
          if (clean) savedIds.add(clean);
        });
      }
    });

    if (savedIds.size > 0 && Array.isArray(utils.FALLBACK_CONFERENCES) && typeof utils.getConferenceId === 'function') {
      utils.FALLBACK_CONFERENCES.forEach(conf => {
        const confId = utils.getConferenceId(conf);
        if (!savedIds.has(confId)) return;
        const labelChunks = typeof utils.extractTopicLabels === 'function'
          ? utils.extractTopicLabels(conf)
          : [];
        const textPool = [
          conf.name || '',
          ...(Array.isArray(labelChunks) ? labelChunks : [])
        ].join(', ');
        if (typeof utils.parseTopicKeysFromText === 'function') {
          utils.parseTopicKeysFromText(textPool).forEach(k => {
            addMatch(k, `Quan tâm hội nghị ${conf.name || confId}`, 'saved');
          });
        }
      });
    }

    // 2. Đọc phần tiểu sử/công việc đã khai báo trong hồ sơ ConfGuide trước đó (nếu có)
    if (baseAccount && typeof utils.parseTopicKeysFromText === 'function') {
      const bioSource = [
        baseAccount.bio || '',
        baseAccount.affiliation || '',
        baseAccount.academicProfile && baseAccount.academicProfile.jobInfo ? baseAccount.academicProfile.jobInfo : ''
      ].join('. ');
      utils.parseTopicKeysFromText(bioSource).forEach(k => {
        addMatch(k, 'Tiểu sử hồ sơ ConfGuide', 'biography');
      });
    }

    return Array.from(matchedByKey.values());
  }

  /**
   * Chuyển sang Bước 3 với hồ sơ (SerpApi / OpenAlex / ORCID / Semantic Scholar) hoặc suy từ hội nghị quan tâm / thủ công.
   * @param {Object|null} author - Hồ sơ ứng viên đã chọn (có `mapped: { matched, unmatched }`) hoặc null.
   * @param {string} [fallbackReason='author-not-found'] - Lý do chuyển thủ công khi author = null.
   * @param {string} [customMessage=''] - Thông điệp bổ sung nếu có.
   */
  function advanceToDomainConfirmationStep(author, fallbackReason = 'author-not-found', customMessage = '') {
    googleFlowState.selectedAuthor = author || null;
    googleFlowState.selectedKeys.clear();
    googleFlowState.customDomains = [];

    const mapped = author && author.mapped && typeof author.mapped === 'object' ? author.mapped : null;
    const matched = mapped && Array.isArray(mapped.matched) ? mapped.matched : [];
    const unmatched = mapped && Array.isArray(mapped.unmatched) ? mapped.unmatched : [];
    const source = author
      ? normalizeResearchSource(author.source || googleFlowState.candidateSource)
      : 'manual';

    const pasteEl = document.getElementById('googlePasteKeywordsInput');
    if (pasteEl) {
      if (author && Array.isArray(author.interests) && author.interests.length > 0 && matched.length === 0) {
        pasteEl.value = author.interests.join(', ');
      } else {
        pasteEl.value = '';
      }
    }

    if (author && matched.length > 0) {
      matched.forEach(item => {
        if (item && item.key) googleFlowState.selectedKeys.add(item.key);
      });
      googleFlowState.mappingResult = {
        recognized: true,
        source,
        authorName: author.name || '',
        affiliation: author.affiliation || '',
        matched,
        unmatched
      };
      setGoogleModalStatus(
        `Đã gợi ý ${matched.length} lĩnh vực từ nguồn ${source} (${author.name}). Xác nhận trước khi lưu.`,
        'success'
      );
    } else {
      const localMatches = inferSavedSignalsFromLocalState(googleFlowState.sampleAccount);
      if (localMatches.length > 0) {
        localMatches.forEach(item => {
          if (item && item.key) googleFlowState.selectedKeys.add(item.key);
        });
        googleFlowState.mappingResult = {
          recognized: true,
          source: 'confguide_saved',
          authorName: (googleFlowState.googleProfile && googleFlowState.googleProfile.fullName) || '',
          affiliation: '',
          matched: localMatches,
          unmatched
        };
        setGoogleModalStatus(
          `Không có hồ sơ học thuật công khai, nhưng đã tự gợi ý ${localMatches.length} lĩnh vực từ các hội nghị bạn quan tâm trên ConfGuide.`,
          'success'
        );
      } else {
        googleFlowState.mappingResult = {
          recognized: false,
          source: 'manual',
          authorName: author ? author.name : '',
          affiliation: author ? author.affiliation : '',
          matched: [],
          unmatched,
          fallbackReason: author ? 'no-matching-it-topics' : fallbackReason,
          customMessage
        };
        setGoogleModalStatus('Chưa có hồ sơ công khai nào khớp — bạn có thể mô tả ngắn tiểu sử hoặc tích chọn lĩnh vực bên dưới.', 'muted');
      }
    }

    googleFlowState.step = 3;
    syncGoogleWizardStepUi();
    renderStep3ConfirmationUi();
  }

  /**
   * Lưu tài khoản Google + danh sách lĩnh vực đã xác nhận vào backend (PUT /api/fields -> data/fields.json)
   * và `localStorage`, sau đó chuyển hướng về trang ConfGuide.
   * @param {Array<Object>|null} [overrideDomains=null] - Danh sách lĩnh vực sẵn có khi giữ nguyên dữ liệu cũ.
   */
  async function finalizeGoogleWorkflowLogin(overrideDomains = null) {
    const profile = googleFlowState.googleProfile;
    if (!profile || !profile.email) return;

    const users = readJsonStorage(USERS_STORAGE_KEY, []);
    const safeUsers = Array.isArray(users) ? users : [];
    const emailLower = profile.email.trim().toLowerCase();
    const existingIdx = safeUsers.findIndex(u => u && u.email && u.email.toLowerCase() === emailLower);
    const existingRecord = existingIdx >= 0 ? safeUsers[existingIdx] : null;
    const baseAccount = googleFlowState.sampleAccount || existingRecord || {};

    const rec = googleFlowState.mappingResult;
    const recSource = normalizeResearchSource(rec && rec.source);

    let finalDomains = [];
    if (Array.isArray(overrideDomains)) {
      finalDomains = overrideDomains;
    } else {
      const matchedMap = new Map(
        (rec && Array.isArray(rec.matched)) ? rec.matched.map(item => [item.key, item]) : []
      );

      googleFlowState.customDomains.forEach((dom, idx) => {
        finalDomains.push({
          id: `dom_gcustom_${Date.now()}_${idx}`,
          key: dom.key,
          label: dom.label,
          priority: 'normal',
          source: 'custom',
          confidence: null,
          originalInterest: '',
          openAlexTopicName: '',
          updatedAt: new Date().toISOString()
        });
      });

      let assignedPrimary = false;
      AUTH_CANONICAL_TOPICS.forEach((topic, idx) => {
        if (!googleFlowState.selectedKeys.has(topic.key)) return;
        const matchInfo = matchedMap.get(topic.key);
        const origInterest = matchInfo && Array.isArray(matchInfo.matchedInterests)
          ? (matchInfo.matchedInterests[0] || '')
          : '';
        const isPrimary = !assignedPrimary;
        assignedPrimary = true;
        finalDomains.push({
          id: `dom_g_${topic.key}_${Date.now()}_${idx}`,
          key: topic.key,
          label: topic.label,
          priority: isPrimary ? 'primary' : 'normal',
          source: matchInfo ? recSource : 'manual',
          confidence: null,
          originalInterest: origInterest,
          openAlexTopicName: origInterest,
          updatedAt: new Date().toISOString()
        });
      });
    }

    finalDomains.sort((a, b) => Number(b.priority === 'primary') - Number(a.priority === 'primary'));
    const fieldsLabels = [];
    const seenLbl = new Set();
    finalDomains.forEach(item => {
      const low = String(item.label || '').trim().toLowerCase();
      if (low && !seenLbl.has(low)) {
        seenLbl.add(low);
        fieldsLabels.push(item.label.trim());
      }
    });
    const fieldsText = fieldsLabels.join(', ');

    const chosenAuthor = googleFlowState.selectedAuthor;
    const resolvedScholarId = (chosenAuthor && chosenAuthor.scholarId) || baseAccount.scholarId || '';
    const resolvedOrcid = (chosenAuthor && chosenAuthor.orcid) || profile.orcid || baseAccount.orcid || '';
    const resolvedScholarUrl = (chosenAuthor && chosenAuthor.scholarUrl)
      || (chosenAuthor && chosenAuthor.scholarId && recSource === 'serpapi'
        ? `https://scholar.google.com/citations?user=${encodeURIComponent(chosenAuthor.scholarId)}&hl=en`
        : (baseAccount.scholarUrl || ''));
    const resolvedAffiliation = baseAccount.affiliation
      || (chosenAuthor && chosenAuthor.affiliation)
      || 'Nhà nghiên cứu độc lập';
    const fieldsSource = finalDomains.some(d => d.source === 'serpapi')
      ? 'serpapi'
      : (finalDomains.some(d => d.source === 'openalex')
        ? 'openalex'
        : (finalDomains.some(d => d.source === 'orcid')
          ? 'orcid'
          : (finalDomains.some(d => d.source === 'semantic_scholar')
            ? 'semantic_scholar'
            : (finalDomains.some(d => d.source === 'confguide_saved') ? 'confguide_saved' : 'manual'))));

    // Gửi lưu danh sách lĩnh vực đã xác nhận về backend PUT /api/fields (data/fields.json)
    const syncStamp = new Date().toISOString();
    const protocol = window.location ? window.location.protocol : '';
    if (protocol === 'http:' || protocol === 'https:') {
      const controller = typeof AbortController === 'function' ? new AbortController() : null;
      const timeoutId = controller ? window.setTimeout(() => controller.abort(), 8000) : null;
      try {
        await fetch(`${getAuthBackendBaseUrl()}/api/fields`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          },
          body: JSON.stringify({
            email: profile.email.trim(),
            name: profile.fullName || profile.name,
            scholarId: resolvedScholarId,
            source: fieldsSource,
            fields: finalDomains
          }),
          signal: controller ? controller.signal : undefined
        });
      } catch {
        // Bỏ qua nếu backend chưa khởi chạy — vẫn lưu vào localStorage
      } finally {
        if (timeoutId !== null) window.clearTimeout(timeoutId);
      }
    }

    const mergedUser = Object.assign({}, baseAccount, {
      id: baseAccount.id || `usr_google_${Date.now()}`,
      username: baseAccount.username
        || emailLower.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '')
        || `guser_${Date.now()}`,
      email: profile.email.trim(),
      name: profile.name || baseAccount.name,
      fullName: profile.fullName || baseAccount.fullName || profile.name,
      avatarUrl: profile.avatarUrl || baseAccount.avatarUrl || '',
      role: 'user',
      authProvider: 'google',
      scholarId: resolvedScholarId,
      orcid: resolvedOrcid,
      fieldsSource,
      fieldsUpdatedAt: syncStamp,
      affiliation: resolvedAffiliation,
      scholarUrl: resolvedScholarUrl,
      researchDomains: finalDomains,
      fieldsOfInterest: fieldsText,
      needsOnboarding: false,
      pendingGoogleRecognition: null
    });

    if (existingIdx >= 0) {
      safeUsers[existingIdx] = mergedUser;
    } else {
      mergedUser.createdAt = new Date().toISOString();
      safeUsers.push(mergedUser);
    }
    writeTextStorage(localStorage, USERS_STORAGE_KEY, JSON.stringify(safeUsers));

    const { passwordHash: _omitHash, ...safeUser } = mergedUser;
    writeTextStorage(
      localStorage,
      CURRENT_USER_KEY,
      JSON.stringify(Object.assign({}, safeUser, { loggedInAt: new Date().toISOString() }))
    );

    // Đồng bộ confguide_user_preferences để không mở trùng onboarding sau khi chuyển trang
    const prevPrefs = readJsonStorage('confguide_user_preferences', {});
    const safePrev = (prevPrefs && typeof prevPrefs === 'object' && !Array.isArray(prevPrefs)) ? prevPrefs : {};
    writeTextStorage(
      localStorage,
      'confguide_user_preferences',
      JSON.stringify({
        aoe: safePrev.aoe !== false,
        countdown: safePrev.countdown !== false,
        bannerDismissed: false,
        onboardingCompleted: true,
        updatedAt: syncStamp
      })
    );

    const displayName = mergedUser.fullName || mergedUser.name;
    const statusText = `Đăng nhập Google thành công (${displayName}). Đang chuyển về ConfGuide...`;
    setGoogleModalStatus(statusText, 'success');

    const pageMessageEl = document.querySelector('#formMessage, #registerMessage');
    if (pageMessageEl) {
      pageMessageEl.className = 'form-message success';
      pageMessageEl.textContent = statusText;
    }

    setTimeout(() => {
      const redirectParam = new URLSearchParams(window.location.search).get('redirect');
      window.location.assign(resolveSafeRedirect(redirectParam));
    }, AUTH_REDIRECT_DELAY_MS);
  }

  /**
   * Gắn toàn bộ sự kiện cho `#googleAuthModal` (Google Sign-In -> Google Scholar -> Lĩnh vực của tôi).
   * @param {HTMLElement} modal - Phần tử `#googleAuthModal`.
   */
  function bindGoogleAuthModalEvents(modal) {
    if (googleModalBound) return;
    googleModalBound = true;

    modal.addEventListener('click', async event => {
      if (!(event.target instanceof Element)) return;

      if (event.target.closest('.js-google-modal-close')) {
        closeGoogleAuthModal();
        return;
      }

      if (event.target.closest('#googleRetryConfigBtn')) {
        setGoogleModalStatus('');
        await refreshGoogleEnvironmentUi();
        return;
      }

      if (event.target.closest('#googleBackToStep1Btn')) {
        googleFlowState.step = 1;
        setGoogleModalStatus('');
        syncGoogleWizardStepUi();
        refreshGoogleEnvironmentUi();
        return;
      }

      if (event.target.closest('#googleScholarAgreeBtn')) {
        googleFlowState.consentState = 'accepted';
        syncStep2ConsentUi();
        runStep2ScholarSearch();
        return;
      }

      if (event.target.closest('#googleScholarSkipBtn')) {
        googleFlowState.consentState = 'skipped';
        advanceToDomainConfirmationStep(null, 'user-skipped');
        return;
      }

      if (event.target.closest('#googleOaNoAccentBtn')) {
        const oaNameEl = document.getElementById('googleOaNameInput');
        if (oaNameEl) {
          oaNameEl.value = oaNameEl.value
            .replace(/[đĐ]/g, ch => (ch === 'Đ' ? 'D' : 'd'))
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
          oaNameEl.focus();
        }
        return;
      }

      if (event.target.closest('#googleOaSearchBtn')) {
        runStep2ScholarSearch();
        return;
      }

      if (event.target.closest('#googleOrcidSearchBtn')) {
        runStep2OrcidSearch();
        return;
      }

      if (event.target.closest('.js-google-go-step3-manual')) {
        advanceToDomainConfirmationStep(null, 'manual-fallback');
        return;
      }

      if (event.target.closest('#googleMapKeywordsBtn')) {
        handleMapPastedKeywords();
        return;
      }

      const pickAuthorBtn = event.target.closest('.js-google-pick-author');
      if (pickAuthorBtn) {
        const idx = Number(pickAuthorBtn.getAttribute('data-author-idx'));
        handlePickScholarCandidate(idx);
        return;
      }

      if (event.target.closest('#googleUseSavedBtn')) {
        const existing = googleFlowState.sampleAccount;
        const savedDomains = Array.isArray(googleFlowState.backendSavedFields) && googleFlowState.backendSavedFields.length > 0
          ? googleFlowState.backendSavedFields
          : (existing && Array.isArray(existing.researchDomains) && existing.researchDomains.length > 0
            ? existing.researchDomains
            : (window.ConfGuideUtils && typeof window.ConfGuideUtils.parseTopicKeysFromText === 'function'
              ? window.ConfGuideUtils.parseTopicKeysFromText(existing ? existing.fieldsOfInterest : '').map((k, idx) => ({
                  id: `dom_saved_${k}_${idx}`,
                  key: k,
                  label: AUTH_TOPIC_LABEL_BY_KEY[k] || k,
                  priority: idx === 0 ? 'primary' : 'normal',
                  source: 'manual'
                }))
              : []));
        finalizeGoogleWorkflowLogin(savedDomains);
        return;
      }

      if (event.target.closest('#googleSkipToManualBtn')) {
        const reason = googleFlowState.consentState === 'accepted' ? 'not-me' : 'user-skipped';
        advanceToDomainConfirmationStep(null, reason);
        return;
      }

      if (event.target.closest('#googleBackToStep2Btn')) {
        googleFlowState.step = 2;
        setGoogleModalStatus('');
        syncGoogleWizardStepUi();
        syncStep2ConsentUi();
        return;
      }

      if (event.target.closest('#googleStep3AddCustomBtn')) {
        const lblInput = document.getElementById('googleStep3CustomLabel');
        const catSelect = document.getElementById('googleStep3CustomCat');
        const label = lblInput ? lblInput.value.trim() : '';
        let catKey = catSelect ? catSelect.value.trim() : '';
        if (!catKey && label && window.ConfGuideUtils && typeof window.ConfGuideUtils.parseTopicKeysFromText === 'function') {
          catKey = window.ConfGuideUtils.parseTopicKeysFromText(label)[0] || '';
        }
        if (!label || !catKey) {
          setGoogleModalStatus('Vui lòng nhập tên lĩnh vực và chọn nhóm hội nghị chuẩn.', 'error');
          return;
        }
        googleFlowState.customDomains.push({ key: catKey, label });
        if (lblInput) lblInput.value = '';
        if (catSelect) catSelect.value = '';
        setGoogleModalStatus(`Đã thêm lĩnh vực "${label}".`, 'success');
        renderStep3ConfirmationUi();
        return;
      }

      if (event.target.closest('#googleConfirmFinishBtn')) {
        const finishBtn = event.target.closest('#googleConfirmFinishBtn');
        if (finishBtn.hasAttribute('disabled')) return;
        finishBtn.setAttribute('disabled', 'true');
        try {
          await finalizeGoogleWorkflowLogin(null);
        } finally {
          finishBtn.removeAttribute('disabled');
        }
      }
    });

    modal.addEventListener('change', event => {
      if (!(event.target instanceof HTMLInputElement)) return;
      if (event.target.classList.contains('js-google-step3-check')) {
        const key = event.target.value;
        if (event.target.checked) googleFlowState.selectedKeys.add(key);
        else googleFlowState.selectedKeys.delete(key);
        renderStep3ConfirmationUi();
        return;
      }
      if (event.target.classList.contains('js-google-step3-custom-check')) {
        const idx = Number(event.target.value);
        if (!event.target.checked && Number.isInteger(idx)) {
          googleFlowState.customDomains.splice(idx, 1);
          renderStep3ConfirmationUi();
        }
      }
    });

    modal.addEventListener('input', event => {
      if (event.target instanceof HTMLInputElement && event.target.id === 'googleOaNameInput') {
        syncScholarExternalLinks(event.target.value);
      }
    });

    modal.addEventListener('keydown', event => {
      if (event.key !== 'Enter' || !(event.target instanceof HTMLElement)) return;
      if (event.target.id === 'googleOaNameInput') {
        event.preventDefault();
        runStep2ScholarSearch();
      } else if (event.target.id === 'googleOrcidInput') {
        event.preventDefault();
        runStep2OrcidSearch();
      } else if (event.target.id === 'googleStep3CustomLabel') {
        event.preventDefault();
        const addBtn = document.getElementById('googleStep3AddCustomBtn');
        if (addBtn) addBtn.click();
      }
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !modal.hasAttribute('hidden')) {
        closeGoogleAuthModal();
      }
    });
  }

  /**
   * Mở hộp thoại đăng nhập Google 3 bước (Google -> Google Scholar -> Lĩnh vực của tôi).
   * @param {HTMLElement} triggerBtn - Nút `#googleLogin` hoặc `#googleRegister` vừa nhấn.
   * @param {HTMLElement|null} pageMessageEl - Phần tử thông báo của form hiện tại.
   * @returns {Promise<void>}
   */
  async function openGoogleAuthModal(triggerBtn, pageMessageEl) {
    if (seedPromise) await seedPromise;
    if (pageMessageEl) pageMessageEl.textContent = '';

    googleFlowState.step = 1;
    googleFlowState.consentState = 'pending';
    googleFlowState.googleProfile = null;
    googleFlowState.sampleAccount = null;
    googleFlowState.scholarCandidates = [];
    googleFlowState.candidateSource = '';
    googleFlowState.selectedAuthor = null;
    googleFlowState.mappingResult = null;
    googleFlowState.selectedKeys.clear();
    googleFlowState.customDomains = [];
    googleFlowState.backendSavedFields = null;

    const modal = ensureGoogleAuthModalDom();
    const pasteEl = document.getElementById('googlePasteKeywordsInput');
    const orcidEl = document.getElementById('googleOrcidInput');
    if (pasteEl) pasteEl.value = '';
    if (orcidEl) orcidEl.value = '';
    setLookupMetaBanner('');
    setGoogleModalStatus('');

    syncGoogleWizardStepUi();
    refreshGoogleEnvironmentUi();

    googleModalLastFocus = triggerBtn;
    modal.removeAttribute('hidden');
    document.body.classList.add('modal-open');
    requestAnimationFrame(() => {
      modal.classList.add('show');
      const closeBtn = modal.querySelector('#googleAuthCloseBtn');
      if (closeBtn) closeBtn.focus();
    });
  }

  /**
   * Khởi tạo logic kiểm tra hợp lệ và xử lý biểu mẫu cho trang Đăng nhập hoặc Đăng ký.
   */
  function initializeAuthPage() {
    seedPromise = loadAndSeedUsers();
    if (window.ConfGuideGoogleAuth && typeof window.ConfGuideGoogleAuth.fetchBackendAuthConfig === 'function') {
      window.ConfGuideGoogleAuth.fetchBackendAuthConfig();
    }
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
