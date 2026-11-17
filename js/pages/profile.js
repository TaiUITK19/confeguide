/**
 * ConfGuide — Quản lý Hồ sơ Nghiên cứu Cá nhân (js/pages/profile.js)
 * Hiển thị thông tin học thuật, chỉnh sửa hồ sơ, tải/nén ảnh đại diện,
 * và quản lý danh sách hội nghị đã lưu / xem trước Tracker qua LocalStorage.
 */

(function () {
  'use strict';

  const utils = window.ConfGuideUtils || {};

  /**
   * Thoát các ký tự HTML đặc biệt để phòng chống XSS khi render chuỗi động.
   * @param {string} str - Chuỗi đầu vào cần xử lý.
   * @returns {string} Chuỗi đã được mã hóa an toàn cho HTML.
   */
  function escapeHtml(str) {
    if (typeof utils.escapeHtml === 'function') {
      return utils.escapeHtml(str);
    }
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Đọc và giải mã dữ liệu JSON từ localStorage an toàn.
   * @param {string} key - Khóa lưu trữ trong localStorage.
   * @param {*} fallback - Giá trị mặc định khi không có hoặc lỗi phân tích JSON.
   * @returns {*} Dữ liệu đã giải mã hoặc giá trị dự phòng.
   */
  function readStorage(key, fallback) {
    if (typeof utils.readStorage === 'function') {
      return utils.readStorage(key, fallback);
    }
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  /**
   * Lưu dữ liệu xuống localStorage dưới dạng JSON có kiểm soát ngoại lệ.
   * @param {string} key - Khóa lưu trữ trong localStorage.
   * @param {*} value - Giá trị cần tuần tự hóa và lưu.
   * @returns {boolean} Trả về true nếu ghi thành công.
   */
  function writeStorage(key, value) {
    if (typeof utils.writeStorage === 'function') {
      return utils.writeStorage(key, value);
    }
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Kiểm tra liên kết URL có giao thức http:// hoặc https:// hợp lệ.
   * @param {string} url - Chuỗi URL cần kiểm tra.
   * @returns {boolean} True nếu URL an toàn và đúng định dạng web.
   */
  function isValidHttpUrl(url) {
    if (!url || typeof url !== 'string') return false;
    return /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(url.trim());
  }

  /**
   * Lấy thông tin người dùng đang đăng nhập từ localStorage.
   * @returns {Object|null} Đối tượng người dùng hoặc null nếu chưa đăng nhập.
   */
  function getCurrentUser() {
    const user = readStorage('confguide_current_user', null);
    return user && typeof user === 'object' ? user : null;
  }

  // Dữ liệu mặc định khi người dùng chưa cập nhật đầy đủ hồ sơ
  const DEFAULT_USER_DATA = {
    id: 'usr_01',
    username: 'user1',
    email: 'user1@gmail.com',
    fullName: 'Nhà nghiên cứu',
    academicTitle: 'Nghiên cứu sinh / Giảng viên',
    affiliation: 'Đại học Quốc gia TP.HCM',
    fieldsOfInterest: 'Trí tuệ nhân tạo, Thị giác máy tính, Xử lý ngôn ngữ tự nhiên, Khoa học dữ liệu',
    bio: 'Quan tâm đến các hội nghị khoa học uy tín thuộc xếp hạng CORE A*/A.',
    scholarUrl: 'https://scholar.google.com'
  };

  let currentUser = getCurrentUser() || { ...DEFAULT_USER_DATA };

  /**
   * Tạo khóa lưu trữ danh sách hội nghị đã lưu gắn theo từng người dùng.
   * @returns {string} Tên khóa lưu trữ trong localStorage.
   */
  function getSavedStorageKey() {
    return currentUser && currentUser.id
      ? `confguide_saved_${currentUser.id}`
      : 'confguide_saved_guest';
  }

  /**
   * Hiển thị thông báo trạng thái chung ở đầu trang Hồ sơ.
   * @param {string} message - Nội dung thông báo.
   * @param {string} [type='success'] - Loại thông báo ('success' hoặc 'error').
   * @param {number} [autoHideMs=4000] - Thời gian tự ẩn (ms); 0 để giữ nguyên.
   */
  function showPageAlert(message, type = 'success', autoHideMs = 4000) {
    const el = document.getElementById('pageAlert');
    if (!el) return;
    el.textContent = message;
    el.className = `profile-page-alert show ${type}`;
    if (autoHideMs > 0) {
      setTimeout(() => {
        if (el.textContent === message) {
          el.className = 'profile-page-alert';
          el.textContent = '';
        }
      }, autoHideMs);
    }
  }

  /**
   * Hiển thị thông báo trạng thái cho khu vực danh sách hội nghị đã lưu.
   * @param {string} message - Nội dung thông báo.
   * @param {string} [type='success'] - Loại thông báo ('success' hoặc 'error').
   * @param {number} [autoHideMs=3000] - Thời gian tự ẩn (ms).
   */
  function showSavedAlert(message, type = 'success', autoHideMs = 3000) {
    const el = document.getElementById('savedListAlert');
    if (!el) return;
    el.textContent = message;
    el.className = `profile-page-alert show ${type}`;
    if (autoHideMs > 0) {
      setTimeout(() => {
        if (el.textContent === message) {
          el.className = 'profile-page-alert';
          el.textContent = '';
        }
      }, autoHideMs);
    }
  }

  /* ================= 1. RENDER THÔNG TIN HỒ SƠ CÁ NHÂN ================= */

  /**
   * Cập nhật toàn bộ giao diện thẻ hồ sơ cá nhân và nạp sẵn dữ liệu vào modal chỉnh sửa.
   */
  function renderUserProfile() {
    currentUser = getCurrentUser() || currentUser;

    const fullName = currentUser.fullName || currentUser.name || DEFAULT_USER_DATA.fullName;
    const initial = fullName.trim().charAt(0).toUpperCase() || 'U';
    const academicTitle = currentUser.academicTitle || DEFAULT_USER_DATA.academicTitle;
    const affiliation = currentUser.affiliation || DEFAULT_USER_DATA.affiliation;
    const headline = `${academicTitle} • ${affiliation}`;
    const email = currentUser.email || DEFAULT_USER_DATA.email;
    const bio = currentUser.bio || DEFAULT_USER_DATA.bio;
    const scholarUrl = currentUser.scholarUrl || '';
    const fieldsRaw = currentUser.fieldsOfInterest || DEFAULT_USER_DATA.fieldsOfInterest;

    // Avatar lớn và ảnh xem trước trong modal (có kích thước rõ ràng để tránh layout shift)
    const avatarEl = document.getElementById('profileAvatarBig');
    if (avatarEl) {
      if (currentUser.avatarUrl && typeof currentUser.avatarUrl === 'string') {
        avatarEl.innerHTML = `<img src="${escapeHtml(currentUser.avatarUrl)}" alt="Ảnh đại diện của ${escapeHtml(fullName)}" width="104" height="104" class="profile-avatar-img-tag">`;
      } else {
        avatarEl.textContent = initial;
      }
    }

    const modalAvatarPreview = document.getElementById('modalAvatarPreview');
    if (modalAvatarPreview) {
      if (currentUser.avatarUrl && typeof currentUser.avatarUrl === 'string') {
        modalAvatarPreview.innerHTML = `<img src="${escapeHtml(currentUser.avatarUrl)}" alt="Xem trước ảnh đại diện của ${escapeHtml(fullName)}" width="64" height="64" class="modal-avatar-img-tag">`;
      } else {
        modalAvatarPreview.textContent = initial;
      }
    }

    const nameEl = document.getElementById('profileNameDisplay');
    if (nameEl) nameEl.textContent = fullName;

    const headlineEl = document.getElementById('profileTitleAffiliation');
    if (headlineEl) headlineEl.textContent = headline;

    const emailEl = document.getElementById('profileEmailDisplay');
    if (emailEl) emailEl.textContent = email;

    // Liên kết Google Scholar / ORCID: dùng class .is-hidden thay cho inline style
    const scholarLink = document.getElementById('profileScholarLink');
    if (scholarLink) {
      if (isValidHttpUrl(scholarUrl)) {
        scholarLink.href = scholarUrl.trim();
        scholarLink.classList.remove('is-hidden');
      } else {
        scholarLink.href = '#';
        scholarLink.classList.add('is-hidden');
      }
    }

    // Lĩnh vực nghiên cứu dạng thẻ nhãn
    const fieldsContainer = document.getElementById('profileFieldsChips');
    if (fieldsContainer) {
      const fieldList = fieldsRaw.split(',').map(f => f.trim()).filter(Boolean);
      if (fieldList.length > 0) {
        fieldsContainer.innerHTML = fieldList
          .map(f => `<span class="profile-field-pill">${escapeHtml(f)}</span>`)
          .join('');
      } else {
        fieldsContainer.innerHTML = '<span class="profile-field-pill">Khoa học máy tính</span>';
      }
    }

    // Giới thiệu bản thân
    const bioEl = document.getElementById('profileBioText');
    if (bioEl) bioEl.textContent = `"${bio}"`;

    // Điền sẵn dữ liệu vào các trường trong form chỉnh sửa
    const fieldValues = {
      editFullName: fullName,
      editEmail: email,
      editTitle: academicTitle,
      editAffiliation: affiliation,
      editScholar: scholarUrl,
      editFields: fieldsRaw,
      editBio: bio
    };
    Object.entries(fieldValues).forEach(([id, val]) => {
      const inputEl = document.getElementById(id);
      if (inputEl) inputEl.value = val;
    });
  }

  /* ================= 2. MODAL CHỈNH SỬA HỒ SƠ ================= */

  /**
   * Khởi tạo hộp thoại Chỉnh sửa hồ sơ, bao gồm khôi phục focus và kiểm tra hợp lệ từng trường bằng Regex.
   */
  function initEditProfileModal() {
    const modal = document.getElementById('editProfileModal');
    const openBtn = document.getElementById('openEditProfileBtn');
    const closeBtn = document.getElementById('closeEditProfileBtn');
    const cancelBtn = document.getElementById('cancelEditProfileBtn');
    const backdrop = document.getElementById('editProfileBackdrop');
    const form = document.getElementById('editProfileForm');
    const modalAlert = document.getElementById('editModalAlert');

    const fullNameInput = document.getElementById('editFullName');
    const emailInput = document.getElementById('editEmail');
    const scholarInput = document.getElementById('editScholar');
    const fullNameErr = document.getElementById('editFullNameError');
    const emailErr = document.getElementById('editEmailError');
    const scholarErr = document.getElementById('editScholarError');

    if (!modal) return;

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const NAME_REGEX = /^[\p{L}\p{N}\s.'-]{2,80}$/u;
    let lastFocusedElement = null;

    /**
     * Hiển thị hoặc xóa thông báo lỗi ngay dưới trường nhập trong modal hồ sơ.
     * @param {HTMLElement|null} inputEl - Phần tử input cần kiểm tra.
     * @param {HTMLElement|null} errEl - Phần tử hiển thị thông báo lỗi tương ứng.
     * @param {string} errorMessage - Chuỗi lỗi (rỗng nếu hợp lệ).
     * @returns {boolean} True nếu trường hợp lệ.
     */
    function setFieldValidation(inputEl, errEl, errorMessage) {
      if (errEl) errEl.textContent = errorMessage;
      if (inputEl) inputEl.setAttribute('aria-invalid', String(Boolean(errorMessage)));
      return !errorMessage;
    }

    /**
     * Xóa toàn bộ thông báo lỗi cũ trên form chỉnh sửa.
     */
    function clearValidationErrors() {
      setFieldValidation(fullNameInput, fullNameErr, '');
      setFieldValidation(emailInput, emailErr, '');
      setFieldValidation(scholarInput, scholarErr, '');
      if (modalAlert) {
        modalAlert.className = 'modal-alert';
        modalAlert.textContent = '';
      }
    }

    /**
     * Kiểm tra Họ và tên theo độ dài tối thiểu và ký tự hợp lệ.
     * @returns {boolean} True nếu hợp lệ.
     */
    function validateFullName() {
      if (!fullNameInput) return true;
      const val = fullNameInput.value.trim();
      let msg = '';
      if (!val) {
        msg = 'Vui lòng nhập Họ và tên.';
      } else if (!NAME_REGEX.test(val)) {
        msg = 'Họ và tên phải có từ 2–80 ký tự và không chứa ký tự đặc biệt lạ.';
      }
      return setFieldValidation(fullNameInput, fullNameErr, msg);
    }

    /**
     * Kiểm tra định dạng email liên hệ.
     * @returns {boolean} True nếu hợp lệ.
     */
    function validateEmail() {
      if (!emailInput) return true;
      const val = emailInput.value.trim();
      let msg = '';
      if (!val) {
        msg = 'Vui lòng nhập địa chỉ email.';
      } else if (!EMAIL_REGEX.test(val)) {
        msg = 'Địa chỉ email không đúng định dạng (ví dụ: ten@truong.edu.vn).';
      }
      return setFieldValidation(emailInput, emailErr, msg);
    }

    /**
     * Kiểm tra liên kết Google Scholar / ORCID (không bắt buộc; nếu nhập phải là http/https).
     * @returns {boolean} True nếu hợp lệ.
     */
    function validateScholarUrl() {
      if (!scholarInput) return true;
      const val = scholarInput.value.trim();
      const msg = val && !isValidHttpUrl(val)
        ? 'Liên kết phải bắt đầu bằng http:// hoặc https:// hợp lệ.'
        : '';
      return setFieldValidation(scholarInput, scholarErr, msg);
    }

    /**
     * Mở modal chỉnh sửa hồ sơ và đặt focus vào ô nhập đầu tiên.
     */
    function openModal() {
      lastFocusedElement = document.activeElement;
      renderUserProfile();
      clearValidationErrors();
      modal.removeAttribute('hidden');
      document.body.classList.add('modal-open');
      requestAnimationFrame(() => modal.classList.add('show'));
      if (fullNameInput) setTimeout(() => fullNameInput.focus(), 150);
    }

    /**
     * Đóng modal chỉnh sửa hồ sơ và trả focus về phần tử kích hoạt trước đó.
     */
    function closeModal() {
      modal.classList.remove('show');
      document.body.classList.remove('modal-open');
      setTimeout(() => {
        modal.setAttribute('hidden', 'true');
        if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
          lastFocusedElement.focus();
        }
      }, 180);
    }

    if (openBtn) openBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (backdrop) backdrop.addEventListener('click', closeModal);

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && modal.classList.contains('show')) {
        closeModal();
      }
    });

    if (fullNameInput) {
      fullNameInput.addEventListener('blur', validateFullName);
      fullNameInput.addEventListener('input', () => {
        if (fullNameInput.getAttribute('aria-invalid') === 'true') validateFullName();
      });
    }
    if (emailInput) {
      emailInput.addEventListener('blur', validateEmail);
      emailInput.addEventListener('input', () => {
        if (emailInput.getAttribute('aria-invalid') === 'true') validateEmail();
      });
    }
    if (scholarInput) {
      scholarInput.addEventListener('blur', validateScholarUrl);
      scholarInput.addEventListener('input', () => {
        if (scholarInput.getAttribute('aria-invalid') === 'true') validateScholarUrl();
      });
    }

    if (form) {
      form.addEventListener('submit', e => {
        e.preventDefault();
        if (modalAlert) {
          modalAlert.className = 'modal-alert';
          modalAlert.textContent = '';
        }

        const okName = validateFullName();
        const okEmail = validateEmail();
        const okScholar = validateScholarUrl();

        if (!okName || !okEmail || !okScholar) {
          const firstInvalid = form.querySelector('[aria-invalid="true"]');
          if (firstInvalid) firstInvalid.focus();
          return;
        }

        const fullName = fullNameInput ? fullNameInput.value.trim() : currentUser.fullName;
        const email = emailInput ? emailInput.value.trim() : currentUser.email;
        const titleEl = document.getElementById('editTitle');
        const affiliationEl = document.getElementById('editAffiliation');
        const fieldsEl = document.getElementById('editFields');
        const bioEl = document.getElementById('editBio');

        const title = titleEl ? titleEl.value.trim() : '';
        const affiliation = affiliationEl ? affiliationEl.value.trim() : '';
        const scholar = scholarInput ? scholarInput.value.trim() : '';
        const fields = fieldsEl ? fieldsEl.value.trim() : '';
        const bio = bioEl ? bioEl.value.trim() : '';

        currentUser.fullName = fullName;
        currentUser.name = fullName;
        currentUser.email = email;
        currentUser.academicTitle = title;
        currentUser.affiliation = affiliation;
        currentUser.scholarUrl = scholar;
        currentUser.fieldsOfInterest = fields;
        currentUser.bio = bio;

        writeStorage('confguide_current_user', currentUser);

        // Đồng bộ lại vào danh sách tài khoản cục bộ nếu tìm thấy người dùng tương ứng
        const users = readStorage('confguide_users', []);
        if (Array.isArray(users)) {
          const updatedUsers = users.map(u => {
            if ((u.id && u.id === currentUser.id) || (u.username && u.username === currentUser.username)) {
              return {
                ...u,
                fullName,
                name: fullName,
                email,
                academicTitle: title,
                affiliation,
                scholarUrl: scholar,
                fieldsOfInterest: fields,
                bio
              };
            }
            return u;
          });
          writeStorage('confguide_users', updatedUsers);
        }

        renderUserProfile();

        if (window.ConfGuideLayout && typeof window.ConfGuideLayout.update === 'function') {
          window.ConfGuideLayout.update();
        }

        closeModal();
        showPageAlert('Đã cập nhật thông tin hồ sơ nghiên cứu thành công!', 'success');
      });
    }
  }

  /* ================= 2B. XỬ LÝ TẢI VÀ NÉN ẢNH ĐẠI DIỆN ================= */

  /**
   * Đọc tệp ảnh người dùng chọn, cắt vuông ở giữa kích thước 200x200px và lưu nén JPEG.
   * @param {File} file - Tệp hình ảnh được chọn từ máy.
   */
  function processAndSaveAvatar(file) {
    if (!file) return;

    if (!file.type || !file.type.startsWith('image/')) {
      showPageAlert('Vui lòng chọn một tệp hình ảnh hợp lệ (PNG, JPG, WEBP, GIF).', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showPageAlert('Kích thước tệp quá lớn. Vui lòng chọn ảnh dưới 10MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 200;
          canvas.height = 200;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas 2D không khả dụng.');

          // Cắt vuông giữa ảnh để hiển thị tròn không bị méo tỉ lệ
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;

          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 200, 200);

          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          currentUser.avatarUrl = compressedDataUrl;
          writeStorage('confguide_current_user', currentUser);

          const users = readStorage('confguide_users', []);
          if (Array.isArray(users)) {
            const updated = users.map(u => {
              if ((u.id && u.id === currentUser.id) || (u.username && u.username === currentUser.username)) {
                return { ...u, avatarUrl: compressedDataUrl };
              }
              return u;
            });
            writeStorage('confguide_users', updated);
          }

          renderUserProfile();

          if (window.ConfGuideLayout && typeof window.ConfGuideLayout.update === 'function') {
            window.ConfGuideLayout.update();
          }

          showPageAlert('Đã tải và cập nhật ảnh đại diện thành công!', 'success');
        } catch {
          showPageAlert('Không thể xử lý ảnh. Vui lòng thử lại với ảnh khác.', 'error');
        }
      };
      img.onerror = function () {
        showPageAlert('Tệp hình ảnh bị lỗi hoặc không thể đọc được.', 'error');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  /**
   * Xóa ảnh đại diện tùy chỉnh (có hộp thoại xác nhận) và quay về chữ cái đầu.
   * @returns {Promise<void>}
   */
  async function removeAvatarPhoto() {
    if (!currentUser.avatarUrl) {
      showPageAlert('Tài khoản hiện đang sử dụng chữ cái đầu làm ảnh đại diện.', 'success', 2500);
      return;
    }

    let confirmed = false;
    if (typeof utils.showConfirmModal === 'function') {
      confirmed = await utils.showConfirmModal(
        'Bạn có chắc muốn xóa ảnh đại diện và quay về dùng chữ cái đầu?',
        {
          title: 'Xóa ảnh đại diện',
          confirmText: 'Xóa ảnh',
          cancelText: 'Hủy',
          danger: true
        }
      );
    }

    if (!confirmed) return;

    delete currentUser.avatarUrl;
    writeStorage('confguide_current_user', currentUser);

    const users = readStorage('confguide_users', []);
    if (Array.isArray(users)) {
      const updated = users.map(u => {
        if ((u.id && u.id === currentUser.id) || (u.username && u.username === currentUser.username)) {
          const copy = { ...u };
          delete copy.avatarUrl;
          return copy;
        }
        return u;
      });
      writeStorage('confguide_users', updated);
    }

    renderUserProfile();

    if (window.ConfGuideLayout && typeof window.ConfGuideLayout.update === 'function') {
      window.ConfGuideLayout.update();
    }

    showPageAlert('Đã xóa ảnh đại diện thành công.', 'success');
  }

  /**
   * Gắn sự kiện mở trình chọn ảnh và xóa ảnh đại diện trên giao diện và trong modal.
   */
  function initAvatarUpload() {
    const fileInput = document.getElementById('globalAvatarInput');
    const triggerBtn = document.getElementById('triggerAvatarUploadBtn');
    const modalUploadBtn = document.getElementById('modalUploadAvatarBtn');
    const modalRemoveBtn = document.getElementById('modalRemoveAvatarBtn');

    if (!fileInput) return;

    if (triggerBtn) {
      triggerBtn.addEventListener('click', () => {
        fileInput.click();
      });
    }

    if (modalUploadBtn) {
      modalUploadBtn.addEventListener('click', () => {
        fileInput.click();
      });
    }

    if (modalRemoveBtn) {
      modalRemoveBtn.addEventListener('click', () => {
        removeAvatarPhoto();
      });
    }

    fileInput.addEventListener('change', function () {
      if (this.files && this.files[0]) {
        processAndSaveAvatar(this.files[0]);
        this.value = '';
      }
    });
  }

  /* ================= 3. HỘI NGHỊ ĐÃ LƯU THEO DÕI ================= */
  let cachedConferencesData = [];

  /**
   * Tải danh mục hội nghị từ JSON (ưu tiên fetch, dự phòng khi mở qua file:///).
   * Chuẩn hóa dữ liệu bằng ConfGuideUtils.normalizeConference để khớp slug/ID và trường ngày.
   * @returns {Promise<Array<Object>>} Danh sách hội nghị đã chuẩn hóa.
   */
  async function fetchConferencesData() {
    if (cachedConferencesData.length > 0) return cachedConferencesData;

    try {
      const resp = await fetch('data/conferences.json');
      if (resp.ok) {
        const json = await resp.json();
        if (Array.isArray(json) && json.length > 0) {
          cachedConferencesData = typeof utils.normalizeConference === 'function'
            ? json.map(item => utils.normalizeConference(item)).filter(Boolean)
            : json;
        }
      }
    } catch {
      // Dự phòng khi trình duyệt chặn fetch trên giao thức file:///
    }

    if (cachedConferencesData.length === 0 && Array.isArray(utils.FALLBACK_CONFERENCES)) {
      cachedConferencesData = utils.FALLBACK_CONFERENCES;
    }

    return cachedConferencesData;
  }

  /**
   * Đọc danh sách hội nghị đã lưu của người dùng hiện tại từ localStorage.
   * @returns {Array<string>} Mảng ID/tên hội nghị đã lưu.
   */
  function getSavedList() {
    const key = getSavedStorageKey();
    let saved = readStorage(key, null);
    if (!saved) {
      const alt = readStorage('confguide_saved', null);
      saved = alt || readStorage('savedConferences', []);
    }
    return Array.isArray(saved) ? saved : [];
  }

  /**
   * Ghi đè danh sách hội nghị đã lưu của người dùng xuống localStorage.
   * @param {Array<string>} list - Mảng ID/tên hội nghị cần lưu.
   */
  function setSavedList(list) {
    const key = getSavedStorageKey();
    writeStorage(key, list);
    writeStorage('confguide_saved', list);
  }

  /**
   * Tra cứu thông tin chi tiết của một hội nghị đã lưu theo ID hoặc tên.
   * @param {string} item - ID hoặc tên hội nghị đã lưu.
   * @param {Array<Object>} allConfs - Danh sách đầy đủ các hội nghị.
   * @returns {Object} Đối tượng thông tin tóm tắt để hiển thị thẻ.
   */
  function resolveConferenceDetails(item, allConfs) {
    const itemStr = String(item).trim();
    const itemLower = itemStr.toLowerCase();

    const found = allConfs.find(c =>
      (c.id && c.id.toLowerCase() === itemLower) ||
      (c.name && c.name.toLowerCase() === itemLower)
    );

    if (found) {
      const acronym = found.name ? found.name.split(/[\s-]+/)[0].toUpperCase().slice(0, 6) : 'CONF';
      return {
        id: found.id || itemStr,
        name: found.name || itemStr,
        fullName: found.fullName || '',
        rank: found.rank || 'A',
        format: found.format || 'hybrid',
        location: found.location || '',
        acronym,
        slug: found.id || itemStr.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      };
    }

    const acronym = itemStr.split(/[\s-]+/)[0].toUpperCase().slice(0, 6);
    return {
      id: itemStr,
      name: itemStr,
      fullName: 'Hội nghị khoa học công nghệ thông tin',
      rank: 'A',
      format: 'hybrid',
      location: '',
      acronym: acronym || 'CONF',
      slug: itemStr.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    };
  }

  /**
   * Hiển thị danh sách hội nghị đã lưu kèm bộ lọc từ khóa.
   * @param {string} [filterKeyword=''] - Từ khóa lọc danh sách.
   * @returns {Promise<void>}
   */
  async function renderSavedConferences(filterKeyword = '') {
    const container = document.getElementById('savedConferencesList');
    if (container && cachedConferencesData.length === 0) {
      container.innerHTML = '<div class="loading-state-box">Đang tải danh sách hội nghị đã lưu...</div>';
    }

    const allConfs = await fetchConferencesData();
    const rawList = getSavedList();

    const statSavedNum = document.getElementById('statSavedNum');
    if (statSavedNum) statSavedNum.textContent = rawList.length;

    if (!container) return;

    let items = rawList.map(item => resolveConferenceDetails(item, allConfs));

    if (filterKeyword.trim()) {
      const q = filterKeyword.trim().toLowerCase();
      items = items.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.fullName.toLowerCase().includes(q) ||
        c.rank.toLowerCase().includes(q)
      );
    }

    if (items.length === 0) {
      if (rawList.length === 0) {
        container.innerHTML = `
          <div class="empty-state-box">
            <svg class="empty-state-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
            </svg>
            <h3 class="empty-state-title">Chưa có hội nghị nào được lưu</h3>
            <p class="empty-state-desc">
              Khám phá danh sách hội nghị khoa học công nghệ, bấm biểu tượng lưu để theo dõi thời gian nộp bài tại đây.
            </p>
            <a href="search.html" class="btn btn-primary btn--compact-md">
              <span>Khám phá danh mục hội nghị &rarr;</span>
            </a>
          </div>
        `;
      } else {
        container.innerHTML = `
          <div class="empty-state-box">
            <p class="empty-state-desc">
              Không tìm thấy hội nghị phù hợp với từ khóa "<strong>${escapeHtml(filterKeyword)}</strong>".
            </p>
          </div>
        `;
      }
      return;
    }

    container.innerHTML = items.map(c => {
      const avatarHtml = window.ConfGuideUtils && typeof window.ConfGuideUtils.renderConferenceAvatar === 'function'
        ? window.ConfGuideUtils.renderConferenceAvatar(c, 'saved-avatar')
        : `<div class="conf-badge-logo saved-avatar" aria-hidden="true">${escapeHtml((c.acronym || c.name || 'CG').slice(0, 4).toUpperCase())}</div>`;

      return `
      <div class="saved-card">
        <div class="saved-card-main">
          ${avatarHtml}
          <div class="saved-info">
            <div class="saved-title">
              <strong>${escapeHtml(c.name)}</strong>
              <span class="saved-badge-rank">Hạng ${escapeHtml(c.rank)}</span>
            </div>
            <div class="saved-meta-line">
              ${c.fullName ? `${escapeHtml(c.fullName)}` : 'Hội nghị khoa học công nghệ thông tin'}
              ${c.location ? ` • 📍 ${escapeHtml(c.location)}` : ''}
            </div>
          </div>
        </div>
        <div class="saved-actions">
          ${window.ConfGuideCompare ? window.ConfGuideCompare.renderToggleButton(c) : ''}
          <a href="detail.html?id=${encodeURIComponent(c.slug)}" class="btn btn-secondary btn--compact-sm">
            <span>Xem chi tiết &rarr;</span>
          </a>
          <button type="button" class="btn btn-secondary btn--compact-sm btn--danger-text js-remove-saved-btn" data-id="${escapeHtml(c.id)}" title="Bỏ lưu hội nghị">
            <span>Bỏ lưu</span>
          </button>
        </div>
      </div>
    `;
    }).join('');

    container.querySelectorAll('.js-remove-saved-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        const idToRemove = this.getAttribute('data-id') || '';
        const current = getSavedList().filter(
          item => String(item).trim().toLowerCase() !== idToRemove.trim().toLowerCase()
        );
        setSavedList(current);
        renderSavedConferences(filterKeyword);
        showSavedAlert('Đã bỏ lưu hội nghị khỏi danh sách theo dõi.');
      });
    });
  }

  /**
   * Khởi tạo bộ lọc tìm kiếm và nút Xóa tất cả cho khu vực hội nghị đã lưu.
   */
  function initSavedSection() {
    renderSavedConferences();

    const searchInput = document.getElementById('savedSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        renderSavedConferences(this.value);
      });
    }

    const clearAllBtn = document.getElementById('clearAllSavedBtn');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', async () => {
        const list = getSavedList();
        if (list.length === 0) return;

        let confirmed = false;
        if (typeof utils.showConfirmModal === 'function') {
          confirmed = await utils.showConfirmModal(
            'Bạn có chắc chắn muốn xóa tất cả hội nghị khỏi danh sách theo dõi?',
            {
              title: 'Xóa danh sách đã lưu',
              confirmText: 'Xóa tất cả',
              cancelText: 'Hủy',
              danger: true
            }
          );
        }

        if (confirmed) {
          setSavedList([]);
          renderSavedConferences();
          showSavedAlert('Đã làm trống toàn bộ danh sách hội nghị đã lưu.');
        }
      });
    }
  }

  /* ================= 4. XEM TRƯỚC BÀI BÁO TRACKER ================= */

  /**
   * Đọc danh sách bài báo đang theo dõi từ localStorage.
   * @returns {Array<Object>} Danh sách bài báo trong Tracker.
   */
  function getTrackerConferences() {
    const data = readStorage('confguides', []);
    return Array.isArray(data) ? data : [];
  }

  /**
   * Render tối đa 4 bài báo xem trước từ Tracker lên trang Hồ sơ.
   */
  function renderTrackerPreview() {
    const trackerList = getTrackerConferences();

    const statTrackerNum = document.getElementById('statTrackerNum');
    if (statTrackerNum) statTrackerNum.textContent = trackerList.length;

    const container = document.getElementById('trackerPreviewContainer');
    if (!container) return;

    if (trackerList.length === 0) {
      container.innerHTML = `
        <div class="empty-state-box empty-state-box--compact">
          <svg class="empty-state-icon" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          <h3 class="empty-state-title">Chưa có bài báo nào trong Tracker</h3>
          <p class="empty-state-desc">
            Sử dụng trang Theo dõi nộp bài để quản lý quy trình soạn thảo, nộp bài và phản biện các bài báo của bạn.
          </p>
          <a href="tracker.html" class="btn btn-primary btn--compact-sm">
            <span>Thêm bài báo vào Tracker &rarr;</span>
          </a>
        </div>
      `;
      return;
    }

    const previewItems = trackerList.slice(0, 4);

    container.innerHTML = `
      <div class="tracker-preview-grid">
        ${previewItems.map(item => {
          const name = item.name || 'Bài báo khoa học';
          // Mốc propDeadline từ form đề xuất chỉ có ngày (YYYY-MM-DD), không có giờ cụ thể nên giữ nguyên nhãn AoE
          const deadline = item.deadline
            ? (utils.formatDeadlineVi
                ? utils.formatDeadlineVi(item.deadline, { hasExplicitTime: false })
                : `${new Date(`${item.deadline}T00:00:00`).toLocaleDateString('vi-VN')} (AoE)`)
            : 'Chưa có hạn';
          const fieldsStr = Array.isArray(item.fields) ? item.fields.join(', ') : 'Công nghệ thông tin';

          return `
            <div class="tracker-card-item">
              <div class="tracker-card-top">
                <div class="tracker-paper-title">${escapeHtml(name)}</div>
                <span class="tracker-status-tag status-submitted">Đang theo dõi</span>
              </div>
              <div class="tracker-preview-hint">
                Lĩnh vực: <strong>${escapeHtml(fieldsStr)}</strong>
              </div>
              <div class="tracker-card-bottom">
                <span>Mốc nộp bài: <strong>${escapeHtml(deadline)}</strong></span>
                <a href="tracker.html" class="tracker-preview-link">Xem &rarr;</a>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  /* ================= 5. LỊCH MỐC HỘI NGHỊ & TRACKER ================= */

  /**
   * Nạp dữ liệu hội nghị đã lưu cùng Tracker và khởi tạo module Lịch trên trang Hồ sơ.
   * Tái sử dụng getSavedList, fetchConferencesData, getTrackerConferences và resolveConferenceDetails.
   * @returns {Promise<void>}
   */
  async function initCalendarSection() {
    const calendarContainer = document.getElementById('profileCalendarRoot');
    if (!calendarContainer || !window.ConfGuideCalendar) return;

    if (typeof window.ConfGuideCalendar.showLoading === 'function') {
      window.ConfGuideCalendar.showLoading(calendarContainer);
    }

    const allConfs = await fetchConferencesData();
    const rawSavedList = getSavedList();
    const trackerItems = getTrackerConferences();

    // Tái dùng resolveConferenceDetails để lấy slug chuẩn và ghép bản ghi hội nghị đầy đủ (tránh trùng ID)
    const seenKeys = new Set();
    const savedConferences = [];

    rawSavedList.forEach(item => {
      const details = resolveConferenceDetails(item, allConfs);
      const dedupKey = String(details.slug || details.id || item).trim().toLowerCase();
      if (!dedupKey || seenKeys.has(dedupKey)) return;
      seenKeys.add(dedupKey);

      const fullRecord = allConfs.find(c =>
        (c.id && details.id && c.id.toLowerCase() === details.id.toLowerCase()) ||
        (c.name && details.name && c.name.toLowerCase() === details.name.toLowerCase())
      ) || null;

      savedConferences.push({
        details,
        conference: fullRecord
      });
    });

    window.ConfGuideCalendar.init(calendarContainer, {
      savedConferences,
      trackerItems,
      hasAnySources: rawSavedList.length > 0 || trackerItems.length > 0
    });
  }

  /* ================= KHỞI TẠO HỒ SƠ ================= */

  /**
   * Điểm khởi chạy toàn bộ thành phần trên trang Hồ sơ cá nhân.
   */
  function init() {
    renderUserProfile();
    initEditProfileModal();
    initAvatarUpload();
    if (document.getElementById('savedConferencesList')) {
      initSavedSection();
    }
    if (document.getElementById('trackerPreviewContainer')) {
      renderTrackerPreview();
    }
    if (document.getElementById('profileCalendarRoot')) {
      initCalendarSection();
    }

    // Đồng bộ lại Lịch khi danh sách đã lưu hoặc Tracker thay đổi từ tab khác
    window.addEventListener('storage', event => {
      const watchKeys = [getSavedStorageKey(), 'confguide_saved', 'savedConferences', 'confguides', 'confguide_current_user'];
      if (!event.key || watchKeys.includes(event.key)) {
        if (document.getElementById('profileCalendarRoot')) {
          initCalendarSection();
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Xuất API làm mới hồ sơ khi dữ liệu phiên đăng nhập thay đổi
  window.ConfGuideProfile = {
    refresh: function () {
      renderUserProfile();
      if (document.getElementById('profileCalendarRoot')) {
        initCalendarSection();
      }
    }
  };
})();
