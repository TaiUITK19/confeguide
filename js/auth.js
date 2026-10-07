/* Frontend auth flows. Registration can connect to the REST endpoint below. */
const AUTH_API_BASE_URL = "";
const REMEMBERED_EMAIL_KEY = "confGuideRememberedEmail";

async function registerUser(name, email, password) {
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
  try { result = await response.json(); } catch { /* Map non-JSON failures to a friendly message. */ }
  if (!response.ok) {
    if (response.status === 409 || result.code === "EMAIL_ALREADY_EXISTS") throw new Error("Email này đã được sử dụng.");
    if (response.status >= 500) throw new Error("Máy chủ đang gặp sự cố. Vui lòng thử lại sau.");
    if (response.status === 400 || response.status === 422) throw new Error("Thông tin đăng ký chưa hợp lệ. Vui lòng kiểm tra lại các trường.");
    throw new Error("Không thể tạo tài khoản lúc này. Vui lòng thử lại.");
  }
  return result;
}

function initializeAuthPage() {
  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const rememberInput = document.getElementById("rememberMe");
    const submitButton = document.getElementById("loginSubmit");
    const message = document.getElementById("formMessage");
    const emailError = document.getElementById("emailError");
    const passwordError = document.getElementById("passwordError");
    const validateEmail = () => {
      const value = emailInput.value.trim();
      const error = !value ? "Vui lòng nhập email." : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? "Email không hợp lệ." : "";
      emailError.textContent = error;
      emailInput.setAttribute("aria-invalid", String(Boolean(error)));
      return !error;
    };
    const validatePassword = () => {
      const value = passwordInput.value;
      const error = !value ? "Vui lòng nhập mật khẩu." : value.length < 8 ? "Mật khẩu phải có ít nhất 8 ký tự." : "";
      passwordError.textContent = error;
      passwordInput.setAttribute("aria-invalid", String(Boolean(error)));
      return !error;
    };
    emailInput.addEventListener("input", () => { validateEmail(); message.textContent = ""; });
    emailInput.addEventListener("blur", validateEmail);
    passwordInput.addEventListener("input", () => { validatePassword(); message.textContent = ""; });
    passwordInput.addEventListener("blur", validatePassword);

    const rememberedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (rememberedEmail) { emailInput.value = rememberedEmail; rememberInput.checked = true; }
    document.getElementById("passwordToggle").addEventListener("click", event => {
      const button = event.currentTarget;
      const show = passwordInput.type === "password";
      passwordInput.type = show ? "text" : "password";
      button.setAttribute("aria-pressed", String(show));
      button.setAttribute("aria-label", show ? "Ẩn mật khẩu" : "Hiện mật khẩu");
    });
    loginForm.addEventListener("submit", event => {
      event.preventDefault();
      message.className = "form-message";
      message.textContent = "";
      if (!validateEmail()) { emailInput.focus(); return; }
      if (!validatePassword()) { passwordInput.focus(); return; }
      if (submitButton.disabled) return;
      if (rememberInput.checked) localStorage.setItem(REMEMBERED_EMAIL_KEY, emailInput.value.trim());
      else localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      submitButton.disabled = true;
      submitButton.setAttribute("aria-busy", "true");
      submitButton.querySelector(".button-label").textContent = "Đang đăng nhập...";
      // Frontend demo behavior: there is no auth server, so a valid form goes to the home page.
      window.location.assign("index.html");
    });
    document.getElementById("googleLogin").addEventListener("click", () => {
      message.className = "form-message";
      message.textContent = "Đăng nhập với Google chưa được cấu hình. Vui lòng sử dụng email và mật khẩu.";
    });
    document.getElementById("forgotPassword").addEventListener("click", () => {
      message.className = "form-message";
      message.textContent = "Tính năng khôi phục mật khẩu chưa được cấu hình.";
    });
    const notice = sessionStorage.getItem("confGuideRegistrationNotice");
    if (notice) {
      message.className = "form-message success";
      message.textContent = notice;
      sessionStorage.removeItem("confGuideRegistrationNotice");
    }
  }

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
      name: document.getElementById("nameError"), email: document.getElementById("registerEmailError"),
      password: document.getElementById("registerPasswordError"), confirm: document.getElementById("confirmPasswordError"),
      terms: document.getElementById("termsError")
    };
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRules = {
      length: value => value.length >= 8, upper: value => /[A-Z]/.test(value),
      lower: value => /[a-z]/.test(value), number: value => /[0-9]/.test(value)
    };
    const validName = value => {
      const words = value.trim().split(/\s+/u);
      return words.length >= 2 && words.every(word => /^(?:\p{L}\p{M}*)+(?:[-’'](?:\p{L}\p{M}*)+)*$/u.test(word));
    };
    const setError = (input, element, text) => {
      element.textContent = text;
      input.setAttribute("aria-invalid", String(Boolean(text)));
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
        item.querySelector("span").textContent = passed ? "✓" : "○";
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
      errors.terms.textContent = termsField.checked ? "" : "Vui lòng đồng ý với các điều khoản để tiếp tục.";
      updateButton();
      message.textContent = "";
    });
    document.querySelectorAll("[data-password-target]").forEach(button => button.addEventListener("click", () => {
      const target = document.getElementById(button.dataset.passwordTarget);
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
        await registerUser(nameField.value.trim(), emailField.value.trim(), passwordField.value);
        sessionStorage.setItem("confGuideRegistrationNotice", "Tài khoản đã được tạo. Vui lòng kiểm tra email để xác minh tài khoản.");
        await navigateAuthPage("login.html");
      } catch (error) {
        message.textContent = error.message || "Không thể tạo tài khoản lúc này. Vui lòng thử lại.";
        submitButton.removeAttribute("aria-busy");
        submitButton.querySelector(".button-label").textContent = "Tạo tài khoản";
        updateButton();
      }
    });
    updateButton();
  }
}

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

  // Keep the header, page shell, background, and marketing column in place.
  // Only the login/register card is replaced.
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

// Keep login/register switching inside this document; only the form content changes.
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

const themeToggle = document.getElementById("themeToggle");
function syncThemeButton() { themeToggle.setAttribute("aria-pressed", String(document.body.classList.contains("dark"))); }
if (localStorage.getItem("darkMode") === "true") document.body.classList.add("dark");
syncThemeButton();
themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem("darkMode", String(document.body.classList.contains("dark")));
  syncThemeButton();
});
