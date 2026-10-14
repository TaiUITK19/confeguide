/* =========================================================
   ConfGuide — Authentication System & User Management
   Hỗ trợ xác thực thật, SHA-256 Hashing, và Seed 20 tài khoản
   ========================================================= */

const AUTH_API_BASE_URL = "";
const REMEMBERED_EMAIL_KEY = "confGuideRememberedEmail";
const USERS_STORAGE_KEY = "confguide_users";
const CURRENT_USER_KEY = "confguide_current_user";

// 20 tài khoản thử nghiệm dự phòng (Fallback Seed)
const SEED_USERS = [
  { id: "usr_01", username: "user1", email: "user1@gmail.com", name: "User 1", role: "user", passwordHash: "b9e53582d056cfbd012e904a2d67180d7720b84894b1ef18d030fa3f16a448c5", createdAt: "2026-10-09T08:00:00.000Z" },
  { id: "usr_02", username: "user2", email: "user2@gmail.com", name: "User 2", role: "user", passwordHash: "9b914086e62359ca9d4e9ba7ec916d2b86997e636efd847e6da2c17ef7ce16fd", createdAt: "2026-10-09T08:00:00.000Z" },
  { id: "usr_03", username: "user3", email: "user3@gmail.com", name: "User 3", role: "user", passwordHash: "3735ea5ceff922e67d0a2b71bbe24b75634a89421b17889059876c3381851bc3", createdAt: "2026-10-09T08:00:00.000Z" },
  { id: "usr_04", username: "user4", email: "user4@gmail.com", name: "User 4", role: "user", passwordHash: "02ec675829326be7e15158cbc18758397d855d93de8cf3c50b5babcf6f2582a1", createdAt: "2026-10-09T08:00:00.000Z" },
  { id: "usr_05", username: "user5", email: "user5@gmail.com", name: "User 5", role: "user", passwordHash: "c2b7e250c5f202c542798fe7d969aff00303df57f4ed7fd5b4a78e1f45f82bd9", createdAt: "2026-10-09T08:00:00.000Z" },
  { id: "usr_06", username: "user6", email: "user6@gmail.com", name: "User 6", role: "user", passwordHash: "388691d520f7a5bc71891351c5d1ff3b421fa9a78d78b1899f58e4ef3f6d116a", createdAt: "2026-10-09T08:00:00.000Z" },
  { id: "usr_07", username: "user7", email: "user7@gmail.com", name: "User 7", role: "user", passwordHash: "fcd7cdbbd3e547439a97f12674f3f81c5317476a5dae078e3a6504cd7da96808", createdAt: "2026-10-09T08:00:00.000Z" },
  { id: "usr_08", username: "user8", email: "user8@gmail.com", name: "User 8", role: "user", passwordHash: "d025c7d135909d1a2264a2ecb39518ca606baee1ae2820cce05ba4fd5b85e4c0", createdAt: "2026-10-09T08:00:00.000Z" },
  { id: "usr_09", username: "user9", email: "user9@gmail.com", name: "User 9", role: "user", passwordHash: "7cb0e2366f20a782d3d347a979ad21aaaa0de742d0dab5c80201aee757941d48", createdAt: "2026-10-09T08:00:00.000Z" },
  { id: "usr_10", username: "user10", email: "user10@gmail.com", name: "User 10", role: "user", passwordHash: "154a2d7df356edea51c8907c1766bbd2af5a008160991f50204b0f9607101c95", createdAt: "2026-10-09T08:00:00.000Z" },
  { id: "usr_11", username: "user11", email: "user11@gmail.com", name: "User 11", role: "user", passwordHash: "c4bb150c5a9d7673562dfbf41aa7142cd7cb15a17037c839986e0dff83fe5eb6", createdAt: "2026-10-09T08:00:00.000Z" },
  { id: "usr_12", username: "user12", email: "user12@gmail.com", name: "User 12", role: "user", passwordHash: "f2beef4edc4f7b8ff4cebbe8ad078485b24e78da2f03c735c1a09ad1a00a8142", createdAt: "2026-10-09T08:00:00.000Z" },
  { id: "usr_13", username: "user13", email: "user13@gmail.com", name: "User 13", role: "user", passwordHash: "a71a22ff4d6acd04449bc0f5c6fb98f8e52d83b0b3d222c6db4c18d1bc667507", createdAt: "2026-10-09T08:00:00.000Z" },
  { id: "usr_14", username: "user14", email: "user14@gmail.com", name: "User 14", role: "user", passwordHash: "db3be5a7355742e116d555496a4b93f4604286f111dba53b49912d4e8b9c11c1", createdAt: "2026-10-09T08:00:00.000Z" },
  { id: "usr_15", username: "user15", email: "user15@gmail.com", name: "User 15", role: "user", passwordHash: "7c02f731eca21d4b16628e17b2aa49dc17f7ed801680ffa45806e98a83d331d1", createdAt: "2026-10-09T08:00:00.000Z" },
  { id: "usr_16", username: "user16", email: "user16@gmail.com", name: "User 16", role: "user", passwordHash: "a68a174404e2592f0760a63208ba7f60a8c37f303a49d0b3a55c28e8c1704a02", createdAt: "2026-10-09T08:00:00.000Z" },
  { id: "usr_17", username: "user17", email: "user17@gmail.com", name: "User 17", role: "user", passwordHash: "8fa601033122d4b66480de3f7dec1682b51f973f0eac7812e04285d7c3e107f8", createdAt: "2026-10-09T08:00:00.000Z" },
  { id: "usr_18", username: "user18", email: "user18@gmail.com", name: "User 18", role: "user", passwordHash: "99877aaa4ac9c5e63546dc8199f088422da61bef22da6ae0f2bcd8d3bbcfd93a", createdAt: "2026-10-09T08:00:00.000Z" },
  { id: "usr_19", username: "user19", email: "user19@gmail.com", name: "User 19", role: "user", passwordHash: "7b1e9939b47c8799f2e48f96e902b6522fdcf495cdc875fe76aac33c1679ebff", createdAt: "2026-10-09T08:00:00.000Z" },
  { id: "usr_20", username: "user20", email: "user20@gmail.com", name: "User 20", role: "user", passwordHash: "bade2b88e7c6c6b8c1634748bc33dafe948c67bdb7780858f74044da60875cb9", createdAt: "2026-10-09T08:00:00.000Z" }
];

// Hàm băm mật khẩu SHA-256 an toàn qua Web Crypto API
async function hashPassword(plainText) {
  if (!plainText) return "";
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(plainText);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  } catch (err) {
    console.warn("Web Crypto không khả dụng, dùng fallback hash:", err);
    // Dự phòng đơn giản nếu môi trường không hỗ trợ crypto.subtle
    let hash = 0;
    for (let i = 0; i < plainText.length; i++) {
      hash = (hash << 5) - hash + plainText.charCodeAt(i);
      hash |= 0;
    }
    return String(Math.abs(hash));
  }
}

// Nạp và Seed dữ liệu tài khoản mà KHÔNG ghi đè người dùng hiện có
async function loadAndSeedUsers() {
  let sourceList = [];
  try {
    const response = await fetch("data/users.json");
    if (response.ok) {
      sourceList = await response.json();
    }
  } catch {
    // Trường hợp chạy trực tiếp file:/// trình duyệt chặn fetch
  }

  if (!Array.isArray(sourceList) || !sourceList.length) {
    sourceList = SEED_USERS;
  }

  const existingUsers = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || "[]");
  let hasChanges = false;

  sourceList.forEach(seedUser => {
    // Kiểm tra xem đã tồn tại user theo email hoặc username chưa
    const exists = existingUsers.some(u => 
      (u.email && u.email.toLowerCase() === seedUser.email.toLowerCase()) ||
      (u.username && u.username.toLowerCase() === seedUser.username.toLowerCase())
    );
    // Nếu chưa tồn tại thì thêm vào, nếu đã có thì giữ nguyên dữ liệu hiện có
    if (!exists) {
      existingUsers.push(seedUser);
      hasChanges = true;
    }
  });

  if (hasChanges || !localStorage.getItem(USERS_STORAGE_KEY)) {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(existingUsers));
  }
}

// Xử lý gửi API đăng ký (nếu có backend)
async function registerUser(name, email, password) {
  if (!AUTH_API_BASE_URL) return null;
  let response;
  try {
    response = await fetch(`${AUTH_API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({ name, email, password })
    });
  } catch {
    throw new Error("Không thể kết nối đến máy chủ. Vui lòng thử lại sau.");
  }
  let result = {};
  try { result = await response.json(); } catch { /* Ignore */ }
  if (!response.ok) {
    if (response.status === 409 || result.code === "EMAIL_ALREADY_EXISTS") throw new Error("Email này đã được sử dụng.");
    if (response.status >= 500) throw new Error("Máy chủ đang gặp sự cố. Vui lòng thử lại sau.");
    if (response.status === 400 || response.status === 422) throw new Error("Thông tin đăng ký chưa hợp lệ. Vui lòng kiểm tra lại các trường.");
    throw new Error("Không thể tạo tài khoản lúc này. Vui lòng thử lại.");
  }
  return result;
}

// Khởi tạo các trang Login và Register
function initializeAuthPage() {
  // Đảm bảo dữ liệu tài khoản đã được nạp
  loadAndSeedUsers();

  /* ================= TRANG ĐĂNG NHẬP (login.html) ================= */
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const rememberInput = document.getElementById("rememberMe");
    const submitButton = document.getElementById("loginSubmit");
    const message = document.getElementById("formMessage");
    const emailError = document.getElementById("emailError");
    const passwordError = document.getElementById("passwordError");

    const validateIdentifier = () => {
      const value = emailInput.value.trim();
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      const isUsername = /^[a-zA-Z0-9_]{3,}$/.test(value);
      const error = !value ? "Vui lòng nhập email hoặc tên đăng nhập." : (!isEmail && !isUsername) ? "Email hoặc tên đăng nhập không hợp lệ." : "";
      emailError.textContent = error;
      emailInput.setAttribute("aria-invalid", String(Boolean(error)));
      return !error;
    };

    const validatePassword = () => {
      const value = passwordInput.value;
      const error = !value ? "Vui lòng nhập mật khẩu." : value.length < 6 ? "Mật khẩu phải có ít nhất 6 ký tự." : "";
      passwordError.textContent = error;
      passwordInput.setAttribute("aria-invalid", String(Boolean(error)));
      return !error;
    };

    emailInput.addEventListener("input", () => { validateIdentifier(); message.textContent = ""; });
    emailInput.addEventListener("blur", validateIdentifier);
    passwordInput.addEventListener("input", () => { validatePassword(); message.textContent = ""; });
    passwordInput.addEventListener("blur", validatePassword);

    const rememberedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (rememberedEmail) {
      emailInput.value = rememberedEmail;
      if (rememberInput) rememberInput.checked = true;
    }

    const toggleBtn = document.getElementById("passwordToggle");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", event => {
        const button = event.currentTarget;
        const show = passwordInput.type === "password";
        passwordInput.type = show ? "text" : "password";
        button.setAttribute("aria-pressed", String(show));
        button.setAttribute("aria-label", show ? "Ẩn mật khẩu" : "Hiện mật khẩu");
      });
    }

    // Xử lý Submit Đăng Nhập Xác Thực Thật
    loginForm.addEventListener("submit", async event => {
      event.preventDefault();
      message.className = "form-message";
      message.textContent = "";

      if (!validateIdentifier()) { emailInput.focus(); return; }
      if (!validatePassword()) { passwordInput.focus(); return; }
      if (submitButton.disabled) return;

      submitButton.disabled = true;
      submitButton.setAttribute("aria-busy", "true");
      submitButton.querySelector(".button-label").textContent = "Đang kiểm tra...";

      const identifier = emailInput.value.trim().toLowerCase();
      const rawPassword = passwordInput.value;
      const hashedInput = await hashPassword(rawPassword);

      // Đọc danh sách người dùng từ localStorage
      const users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || "[]");
      const matchedUser = users.find(u => 
        (u.email && u.email.toLowerCase() === identifier) ||
        (u.username && u.username.toLowerCase() === identifier)
      );

      // Kiểm tra mật khẩu (hỗ trợ hash SHA-256 hoặc định dạng test userX@)
      const isPasswordValid = matchedUser && (
        matchedUser.passwordHash === hashedInput ||
        (rawPassword.startsWith("user") && rawPassword.endsWith("@") && matchedUser.username === rawPassword.slice(0, -1))
      );

      if (matchedUser && isPasswordValid) {
        // Ghi nhớ email nếu được chọn
        if (rememberInput && rememberInput.checked) {
          localStorage.setItem(REMEMBERED_EMAIL_KEY, matchedUser.email);
        } else {
          localStorage.removeItem(REMEMBERED_EMAIL_KEY);
        }

        // Lưu thông tin phiên đăng nhập
        const sessionUser = {
          id: matchedUser.id,
          username: matchedUser.username,
          email: matchedUser.email,
          name: matchedUser.name,
          role: matchedUser.role || "user",
          loggedInAt: new Date().toISOString()
        };
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(sessionUser));

        message.className = "form-message success";
        message.textContent = `Đăng nhập thành công! Xin chào ${matchedUser.name}.`;
        submitButton.querySelector(".button-label").textContent = "Đang chuyển hướng...";

        setTimeout(() => {
          const redirectParam = new URLSearchParams(window.location.search).get("redirect");
          const targetUrl = redirectParam ? decodeURIComponent(redirectParam) : "index.html";
          window.location.assign(targetUrl);
        }, 500);
      } else {
        message.className = "form-message";
        message.style.color = "#d93838";
        message.textContent = "Email/Tên đăng nhập hoặc mật khẩu không chính xác.";
        submitButton.disabled = false;
        submitButton.removeAttribute("aria-busy");
        submitButton.querySelector(".button-label").textContent = "Đăng nhập";
      }
    });

    const googleBtn = document.getElementById("googleLogin");
    if (googleBtn) {
      googleBtn.addEventListener("click", () => {
        message.className = "form-message";
        message.style.color = "#1268c9";
        message.textContent = "Gợi ý: Bạn có thể đăng nhập thử bằng user1@gmail.com (Mật khẩu: User1@2026 hoặc user1@).";
      });
    }

    const forgotBtn = document.getElementById("forgotPassword");
    if (forgotBtn) {
      forgotBtn.addEventListener("click", () => {
        message.className = "form-message";
        message.style.color = "#555";
        message.textContent = "Mật khẩu thử nghiệm là User1@2026 (hoặc user1@) tương ứng cho tài khoản user1 đến user20.";
      });
    }

    const notice = sessionStorage.getItem("confGuideRegistrationNotice");
    if (notice) {
      message.className = "form-message success";
      message.textContent = notice;
      sessionStorage.removeItem("confGuideRegistrationNotice");
    }
  }

  /* ================= TRANG ĐĂNG KÝ (register.html) ================= */
  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    const nameField = document.getElementById("fullName");
    const emailField = document.getElementById("registerEmail");
    const passwordField = document.getElementById("registerPassword");
    const confirmField = document.getElementById("confirmPassword");
    const termsField = document.getElementById("termsAccepted");
    const submitButton = document.getElementById("registerSubmit");
    const message = document.getElementById("registerMessage");
    const errors = {
      name: document.getElementById("nameError"),
      email: document.getElementById("registerEmailError"),
      password: document.getElementById("registerPasswordError"),
      confirm: document.getElementById("confirmPasswordError"),
      terms: document.getElementById("termsError")
    };

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRules = {
      length: value => value.length >= 8,
      upper: value => /[A-Z]/.test(value),
      lower: value => /[a-z]/.test(value),
      number: value => /[0-9]/.test(value)
    };

    const validName = value => {
      const words = value.trim().split(/\s+/u);
      return words.length >= 2 && words.every(word => /^(?:\p{L}\p{M}*)+(?:[-’'](?:\p{L}\p{M}*)+)*$/u.test(word));
    };

    const setError = (input, element, text) => {
      if (element) element.textContent = text;
      if (input) input.setAttribute("aria-invalid", String(Boolean(text)));
      return !text;
    };

    const validateName = () => setError(nameField, errors.name,
      !nameField.value.trim() ? "Vui lòng nhập họ và tên." : !validName(nameField.value) ? "Vui lòng nhập họ và tên hợp lệ (ít nhất 2 từ)." : "");

    const validateEmail = () => setError(emailField, errors.email,
      !emailField.value.trim() ? "Vui lòng nhập email." : !emailPattern.test(emailField.value.trim()) ? "Email không hợp lệ." : "");

    const validatePassword = () => {
      const value = passwordField.value;
      const valid = Object.values(passwordRules).every(rule => rule(value));
      setError(passwordField, errors.password, !value ? "Vui lòng nhập mật khẩu." : !valid ? "Mật khẩu chưa đáp ứng đủ các yêu cầu." : "");
      document.querySelectorAll("[data-rule]").forEach(item => {
        const passed = passwordRules[item.dataset.rule](value);
        item.classList.toggle("passed", passed);
        const iconSpan = item.querySelector("span");
        if (iconSpan) iconSpan.textContent = passed ? "✓" : "○";
      });
      return valid;
    };

    const validateConfirm = () => setError(confirmField, errors.confirm,
      !confirmField.value ? "Vui lòng xác nhận mật khẩu." : confirmField.value !== passwordField.value ? "Mật khẩu xác nhận không khớp." : "");

    const updateButton = () => {
      const valid = validName(nameField.value) && emailPattern.test(emailField.value.trim())
        && Object.values(passwordRules).every(rule => rule(passwordField.value))
        && Boolean(confirmField.value) && confirmField.value === passwordField.value && termsField.checked;
      submitButton.disabled = !valid;
    };

    [[nameField, validateName], [emailField, validateEmail], [passwordField, validatePassword], [confirmField, validateConfirm]].forEach(([input, validate]) => {
      input.addEventListener("input", () => {
        validate();
        if (input === passwordField && confirmField.value) validateConfirm();
        updateButton();
        message.textContent = "";
      });
      input.addEventListener("blur", () => { validate(); updateButton(); });
    });

    termsField.addEventListener("change", () => {
      if (errors.terms) errors.terms.textContent = termsField.checked ? "" : "Vui lòng đồng ý với các điều khoản để tiếp tục.";
      updateButton();
      message.textContent = "";
    });

    document.querySelectorAll("[data-password-target]").forEach(button => button.addEventListener("click", () => {
      const target = document.getElementById(button.dataset.passwordTarget);
      if (!target) return;
      const show = target.type === "password";
      target.type = show ? "text" : "password";
      button.setAttribute("aria-pressed", String(show));
      button.setAttribute("aria-label", show ? "Ẩn mật khẩu" : "Hiện mật khẩu");
    }));

    registerForm.addEventListener("submit", async event => {
      event.preventDefault();
      if (submitButton.disabled) return;
      message.textContent = "";
      submitButton.disabled = true;
      submitButton.setAttribute("aria-busy", "true");
      submitButton.querySelector(".button-label").textContent = "Đang tạo tài khoản...";

      try {
        const emailTrimmed = emailField.value.trim().toLowerCase();
        const users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || "[]");

        // Kiểm tra trùng email
        if (users.some(u => u.email && u.email.toLowerCase() === emailTrimmed)) {
          throw new Error("Email này đã được sử dụng. Vui lòng chọn email khác.");
        }

        if (AUTH_API_BASE_URL) {
          await registerUser(nameField.value.trim(), emailTrimmed, passwordField.value);
        } else {
          // Lưu vào database người dùng cục bộ
          const hashed = await hashPassword(passwordField.value);
          const rawUsername = emailTrimmed.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "");
          const newUser = {
            id: `usr_${Date.now()}`,
            username: rawUsername || `user_${users.length + 1}`,
            email: emailField.value.trim(),
            name: nameField.value.trim(),
            role: "user",
            passwordHash: hashed,
            createdAt: new Date().toISOString()
          };
          users.push(newUser);
          localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
        }

        sessionStorage.setItem("confGuideRegistrationNotice", "Tài khoản đã được tạo thành công! Bạn có thể đăng nhập ngay bây giờ.");
        await navigateAuthPage("login.html");
      } catch (error) {
        message.className = "form-message";
        message.style.color = "#d93838";
        message.textContent = error.message || "Không thể tạo tài khoản lúc này. Vui lòng thử lại.";
        submitButton.disabled = false;
        submitButton.removeAttribute("aria-busy");
        submitButton.querySelector(".button-label").textContent = "Tạo tài khoản";
        updateButton();
      }
    });

    updateButton();
  }
}

// Chuyển đổi mềm giữa login và register
async function navigateAuthPage(target, { replace = false } = {}) {
  const url = new URL(target, window.location.href);
  if (url.origin !== window.location.origin || !/\/(?:login|register)\.html$/.test(url.pathname)) return;
  const activeLink = document.querySelector(".auth-nav-link.active");
  const activePath = activeLink ? new URL(activeLink.href, window.location.href).pathname : "";
  if (url.pathname === activePath && !url.search && !url.hash) return;
  const response = await fetch(url.href);
  if (!response.ok) throw new Error("Không tải được trang tài khoản.");
  const html = await response.text();
  const nextDocument = new DOMParser().parseFromString(html, "text/html");
  const nextCard = nextDocument.querySelector("main.auth-main .login-card");
  const currentCard = document.querySelector("main.auth-main .login-card");
  if (!nextCard || !currentCard) throw new Error("Không tìm thấy khung tài khoản.");

  currentCard.replaceWith(document.importNode(nextCard, true));
  document.title = nextDocument.title;
  document.querySelectorAll(".auth-nav-link").forEach(link => {
    const active = new URL(link.href, window.location.href).pathname === url.pathname;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  if (replace) history.replaceState({ authPage: true }, "", url.href);
  else history.pushState({ authPage: true }, "", url.href);
  initializeAuthPage();
}

initializeAuthPage();

document.addEventListener("click", event => {
  const link = event.target.closest("a[href]");
  if (!link || !link.matches(".auth-nav-link, .register-prompt a")) return;
  const url = new URL(link.href, window.location.href);
  if (!/\/(?:login|register)\.html$/.test(url.pathname)) return;
  event.preventDefault();
  navigateAuthPage(url.href).catch(() => {
    const message = document.querySelector("#formMessage, #registerMessage");
    if (message) message.textContent = "Không thể chuyển trang lúc này. Hãy mở ConfGuide qua Live Server rồi thử lại.";
  });
});

window.addEventListener("popstate", () => {
  if (/\/(?:login|register)\.html$/.test(window.location.pathname)) {
    navigateAuthPage(window.location.href, { replace: true }).catch(() => {
      const activeLink = document.querySelector(".auth-nav-link.active");
      if (activeLink) history.replaceState({ authPage: true }, "", activeLink.href);
      const message = document.querySelector("#formMessage, #registerMessage");
      if (message) message.textContent = "Không thể chuyển trang lúc này. Hãy mở ConfGuide qua Live Server rồi thử lại.";
    });
  }
});

// Đồng bộ Dark mode
const themeToggle = document.getElementById("themeToggle");
if (themeToggle) {
  function syncThemeButton() { themeToggle.setAttribute("aria-pressed", String(document.body.classList.contains("dark"))); }
  if (localStorage.getItem("darkMode") === "true" || localStorage.getItem("confguide_theme") === "dark") {
    document.body.classList.add("dark");
  }
  syncThemeButton();
  themeToggle.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark");
    localStorage.setItem("darkMode", String(isDark));
    localStorage.setItem("confguide_theme", isDark ? "dark" : "light");
    syncThemeButton();
  });
}
