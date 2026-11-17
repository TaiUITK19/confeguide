/**
 * ConfGuide — Quản lý Hồ sơ Nghiên cứu Cá nhân (js/pages/profile.js)
 * Trang sử dụng: profile.html
 * Phụ thuộc: js/core/layout.js (ConfGuideUtils), js/components/compare.js, js/components/calendar.js
 * Chức năng: Hiển thị thông tin học thuật, chỉnh sửa hồ sơ, tải/nén ảnh đại diện,
 * quản lý hội nghị đã lưu, xem trước Tracker và khởi tạo lịch mốc thời hạn.
 */

(function () {
  'use strict';

  /* ================= 1. HẰNG SỐ & HÀM TIỆN ÍCH CƠ BẢN ================= */

  const utils = window.ConfGuideUtils || {};
  const MAX_AVATAR_BYTES = 10 * 1024 * 1024;
  const AVATAR_SIZE_PX = 200;
  const TRACKER_PREVIEW_LIMIT = 4;

  /**
   * Thoát ký tự HTML đặc biệt (tái sử dụng ConfGuideUtils.escapeHtml).
   * @param {*} str - Giá trị đầu vào cần thoát ký tự.
   * @returns {string} Chuỗi an toàn để chèn vào HTML.
   */
  function escapeHtml(str) {
    if (typeof utils.escapeHtml === 'function') return utils.escapeHtml(str);
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(str || '').replace(/[&<>"']/g, ch => map[ch]);
  }

  /**
   * Đọc JSON từ localStorage an toàn (tái sử dụng ConfGuideUtils.readStorage).
   * @param {string} key - Khóa lưu trữ.
   * @param {*} fallback - Giá trị mặc định khi không đọc được.
   * @returns {*} Dữ liệu đã giải mã hoặc giá trị mặc định.
   */
  function readStorage(key, fallback) {
    if (typeof utils.readStorage === 'function') return utils.readStorage(key, fallback);
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  /**
   * Ghi JSON vào localStorage an toàn (tái sử dụng ConfGuideUtils.writeStorage).
   * @param {string} key - Khóa lưu trữ.
   * @param {*} value - Dữ liệu cần lưu.
   * @returns {boolean} True nếu ghi thành công.
   */
  function writeStorage(key, value) {
    if (typeof utils.writeStorage === 'function') return utils.writeStorage(key, value);
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
  /**
   * Render ảnh đại diện hoặc chữ cái đầu vào khung hiển thị chỉ định.
   * @param {string} elementId - ID phần tử khung chứa ảnh đại diện.
   * @param {string|undefined} avatarUrl - URL dữ liệu ảnh đại diện nếu có.
   * @param {string} altText - Văn bản thay thế cho thẻ `<img>`.
   * @param {string} imgClass - Class CSS cho thẻ `<img>`.
   * @param {number} size - Kích thước rộng/cao cố định (px) để tránh CLS.
   * @param {string} initial - Ký tự đầu dự phòng khi chưa có ảnh.
   */
  function renderAvatarSlot(elementId, avatarUrl, altText, imgClass, size, initial) {
    const slotEl = document.getElementById(elementId);
    if (!slotEl) return;

    if (avatarUrl && typeof avatarUrl === 'string') {
      slotEl.innerHTML =
        `<img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(altText)}" `
        + `width="${size}" height="${size}" class="${imgClass}">`;
    } else {
      slotEl.textContent = initial;
    }
  }

  /**
   * Đồng bộ thay đổi của currentUser xuống localStorage (`confguide_current_user`,
   * `confguide_users`) và làm mới thanh điều hướng dùng chung.
   * @param {Function} updateFn - Hàm nhận bản ghi người dùng và trả về bản ghi sau cập nhật.
   */
  function syncCurrentUserRecord(updateFn) {
    currentUser = updateFn(currentUser);
    writeStorage('confguide_current_user', currentUser);

    const users = readStorage('confguide_users', []);
    if (Array.isArray(users)) {
      const updated = users.map(u => {
        const matches = (u.id && u.id === currentUser.id)
          || (u.username && u.username === currentUser.username);
        return matches ? updateFn({ ...u }) : u;
      });
      writeStorage('confguide_users', updated);
    }

    renderUserProfile();
    if (window.ConfGuideLayout && typeof window.ConfGuideLayout.update === 'function') {
      window.ConfGuideLayout.update();
    }
  }

  /**
   * Render toàn bộ thông tin hồ sơ người dùng lên giao diện và điền sẵn dữ liệu vào form chỉnh sửa.
   */
  function renderUserProfile() {
    currentUser = getCurrentUser() || currentUser;

    const fullName = currentUser.fullName || currentUser.name || DEFAULT_USER_DATA.fullName;
    const initial = fullName.trim().charAt(0).toUpperCase() || 'U';
    const academicTitle = currentUser.academicTitle || DEFAULT_USER_DATA.academicTitle;
    const affiliation = currentUser.affiliation || DEFAULT_USER_DATA.affiliation;
    const email = currentUser.email || DEFAULT_USER_DATA.email;
    const bio = currentUser.bio || DEFAULT_USER_DATA.bio;
    const scholarUrl = currentUser.scholarUrl || '';
    const fieldsRaw = currentUser.fieldsOfInterest || DEFAULT_USER_DATA.fieldsOfInterest;

    renderAvatarSlot(
      'profileAvatarBig',
      currentUser.avatarUrl,
      `Ảnh đại diện của ${fullName}`,
      'profile-avatar-img-tag',
      104,
      initial
    );
    renderAvatarSlot(
      'modalAvatarPreview',
      currentUser.avatarUrl,
      `Xem trước ảnh đại diện của ${fullName}`,
      'modal-avatar-img-tag',
      64,
      initial
    );

    const textBindings = {
      profileNameDisplay: fullName,
      profileTitleAffiliation: `${academicTitle} • ${affiliation}`,
      profileEmailDisplay: email,
      profileBioText: `"${bio}"`
    };
    Object.entries(textBindings).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    });

    const scholarLink = document.getElementById('profileScholarLink');
    if (scholarLink) {
      const hasValidScholar = isValidHttpUrl(scholarUrl);
      scholarLink.href = hasValidScholar ? scholarUrl.trim() : '#';
      scholarLink.classList.toggle('is-hidden', !hasValidScholar);
    }

    const fieldsContainer = document.getElementById('profileFieldsChips');
    if (fieldsContainer) {
      const fieldList = fieldsRaw.split(',').map(f => f.trim()).filter(Boolean);
      fieldsContainer.innerHTML = fieldList.length > 0
        ? fieldList.map(f => `<span class="profile-field-pill">${escapeHtml(f)}</span>`).join('')
        : '<span class="profile-field-pill">Khoa học máy tính</span>';
    }

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
   * Hiển thị hoặc xóa thông báo lỗi ngay dưới trường nhập trong modal hồ sơ.
   * @param {HTMLElement|null} inputEl - Phần tử input cần kiểm tra.
   * @param {HTMLElement|null} errEl - Phần tử hiển thị thông báo lỗi tương ứng.
   * @param {string} errorMessage - Chuỗi lỗi (rỗng nếu hợp lệ).
   * @returns {boolean} True nếu trường hợp lệ.
   */
  function setProfileFieldValidation(inputEl, errEl, errorMessage) {
    if (errEl) errEl.textContent = errorMessage;
    if (inputEl) inputEl.setAttribute('aria-invalid', String(Boolean(errorMessage)));
    return !errorMessage;
  }

  /**
   * Tạo bộ hàm kiểm tra hợp lệ cho các trường trong modal Chỉnh sửa hồ sơ.
   * @param {Object} els - Các phần tử input và phần tử hiển thị lỗi tương ứng.
   * @returns {Object} Bộ hàm kiểm tra và xóa lỗi form.
   */
  function createProfileFormValidators(els) {
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const NAME_REGEX = /^[\p{L}\p{N}\s.'-]{2,80}$/u;

    const validateFullName = () => {
      if (!els.fullNameInput) return true;
      const val = els.fullNameInput.value.trim();
      const msg = !val
        ? 'Vui lòng nhập Họ và tên.'
        : (!NAME_REGEX.test(val) ? 'Họ và tên phải có từ 2–80 ký tự và không chứa ký tự đặc biệt lạ.' : '');
      return setProfileFieldValidation(els.fullNameInput, els.fullNameErr, msg);
    };

    const validateEmail = () => {
      if (!els.emailInput) return true;
      const val = els.emailInput.value.trim();
      const msg = !val
        ? 'Vui lòng nhập địa chỉ email.'
        : (!EMAIL_REGEX.test(val) ? 'Địa chỉ email không đúng định dạng (ví dụ: ten@truong.edu.vn).' : '');
      return setProfileFieldValidation(els.emailInput, els.emailErr, msg);
    };

    const validateScholarUrl = () => {
      if (!els.scholarInput) return true;
      const val = els.scholarInput.value.trim();
      const msg = val && !isValidHttpUrl(val) ? 'Liên kết phải bắt đầu bằng http:// hoặc https:// hợp lệ.' : '';
      return setProfileFieldValidation(els.scholarInput, els.scholarErr, msg);
    };

    const clearAll = () => {
      setProfileFieldValidation(els.fullNameInput, els.fullNameErr, '');
      setProfileFieldValidation(els.emailInput, els.emailErr, '');
      setProfileFieldValidation(els.scholarInput, els.scholarErr, '');
      if (els.modalAlert) {
        els.modalAlert.className = 'modal-alert';
        els.modalAlert.textContent = '';
      }
    };

    return { validateFullName, validateEmail, validateScholarUrl, clearAll };
  }

  /**
   * Xử lý submit biểu mẫu chỉnh sửa hồ sơ và lưu vào bộ nhớ cục bộ.
   * @param {SubmitEvent} e - Sự kiện submit form.
   * @param {Object} ctx - Ngữ cảnh form gồm input, validators và closeModal.
   */
  function handleEditProfileSubmit(e, ctx) {
    e.preventDefault();
    const { form, fullNameInput, emailInput, scholarInput, modalAlert, validators, closeModal } = ctx;
    if (modalAlert) {
      modalAlert.className = 'modal-alert';
      modalAlert.textContent = '';
    }

    const isAllValid = [
      validators.validateFullName(),
      validators.validateEmail(),
      validators.validateScholarUrl()
    ].every(Boolean);

    if (!isAllValid) {
      const firstInvalid = form.querySelector('[aria-invalid="true"]');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    const readTrimmed = id => document.getElementById(id)?.value.trim() || '';
    const fullName = fullNameInput ? fullNameInput.value.trim() : currentUser.fullName;
    const email = emailInput ? emailInput.value.trim() : currentUser.email;
    const patch = {
      fullName,
      name: fullName,
      email,
      academicTitle: readTrimmed('editTitle'),
      affiliation: readTrimmed('editAffiliation'),
      scholarUrl: scholarInput ? scholarInput.value.trim() : '',
      fieldsOfInterest: readTrimmed('editFields'),
      bio: readTrimmed('editBio')
    };

    syncCurrentUserRecord(user => ({ ...user, ...patch }));
    closeModal();
    showPageAlert('Đã cập nhật thông tin hồ sơ nghiên cứu thành công!', 'success');
  }

  /**
   * Khởi tạo hộp thoại Chỉnh sửa hồ sơ, bao gồm khôi phục focus và kiểm tra hợp lệ từng trường bằng Regex.
   */
  function initEditProfileModal() {
    const modal = document.getElementById('editProfileModal');
    if (!modal) return;

    const form = document.getElementById('editProfileForm');
    const fullNameInput = document.getElementById('editFullName');
    const emailInput = document.getElementById('editEmail');
    const scholarInput = document.getElementById('editScholar');
    const modalAlert = document.getElementById('editModalAlert');

    const validators = createProfileFormValidators({
      fullNameInput,
      emailInput,
      scholarInput,
      modalAlert,
      fullNameErr: document.getElementById('editFullNameError'),
      emailErr: document.getElementById('editEmailError'),
      scholarErr: document.getElementById('editScholarError')
    });

    let lastFocusedElement = null;

    const openModal = () => {
      lastFocusedElement = document.activeElement;
      renderUserProfile();
      validators.clearAll();
      modal.removeAttribute('hidden');
      document.body.classList.add('modal-open');
      requestAnimationFrame(() => modal.classList.add('show'));
      if (fullNameInput) setTimeout(() => fullNameInput.focus(), 150);
    };

    const closeModal = () => {
      modal.classList.remove('show');
      document.body.classList.remove('modal-open');
      setTimeout(() => {
        modal.setAttribute('hidden', 'true');
        if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
          lastFocusedElement.focus();
        }
      }, 180);
    };

    const openBtn = document.getElementById('openEditProfileBtn');
    if (openBtn) openBtn.addEventListener('click', openModal);
    ['closeEditProfileBtn', 'cancelEditProfileBtn', 'editProfileBackdrop'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', closeModal);
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && modal.classList.contains('show')) closeModal();
    });

    [
      [fullNameInput, validators.validateFullName],
      [emailInput, validators.validateEmail],
      [scholarInput, validators.validateScholarUrl]
    ].forEach(([inputEl, validateFn]) => {
      if (!inputEl) return;
      inputEl.addEventListener('blur', validateFn);
      inputEl.addEventListener('input', () => {
        if (inputEl.getAttribute('aria-invalid') === 'true') validateFn();
      });
    });

    if (form) {
      form.addEventListener('submit', e => handleEditProfileSubmit(e, {
        form, fullNameInput, emailInput, scholarInput, modalAlert, validators, closeModal
      }));
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
    if (file.size > MAX_AVATAR_BYTES) {
      showPageAlert('Kích thước tệp quá lớn. Vui lòng chọn ảnh dưới 10MB.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = AVATAR_SIZE_PX;
          canvas.height = AVATAR_SIZE_PX;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas 2D không khả dụng.');

          // Cắt vuông giữa ảnh để hiển thị tròn không bị méo tỉ lệ
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;
          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, AVATAR_SIZE_PX, AVATAR_SIZE_PX);

          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          syncCurrentUserRecord(user => ({ ...user, avatarUrl: compressedDataUrl }));
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

    syncCurrentUserRecord(user => {
      const copy = { ...user };
      delete copy.avatarUrl;
      return copy;
    });
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
      const json = typeof utils.fetchJsonCached === 'function'
        ? await utils.fetchJsonCached('data/conferences.json')
        : await fetch('data/conferences.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
      if (Array.isArray(json) && json.length > 0) {
        cachedConferencesData = typeof utils.normalizeConference === 'function'
          ? json.map(item => utils.normalizeConference(item)).filter(Boolean)
          : json;
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
   * Tạo mã HTML trạng thái rỗng cho danh sách hội nghị đã lưu.
   * @param {boolean} hasAnySaved - True nếu người dùng đã lưu ít nhất 1 hội nghị (chỉ rỗng do lọc).
   * @param {string} filterKeyword - Từ khóa lọc hiện tại.
   * @returns {string} Chuỗi HTML `.empty-state-box`.
   */
  function buildSavedEmptyHtml(hasAnySaved, filterKeyword) {
    if (hasAnySaved) {
      return `
        <div class="empty-state-box">
          <p class="empty-state-desc">
            Không tìm thấy hội nghị phù hợp với từ khóa "<strong>${escapeHtml(filterKeyword)}</strong>".
          </p>
        </div>
      `;
    }
    return `
      <div class="empty-state-box">
        <svg class="empty-state-icon" width="48" height="48" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"
          stroke-linejoin="round" aria-hidden="true">
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
  }

  /**
   * Tạo mã HTML một thẻ hội nghị đã lưu trong tab Hồ sơ.
   * @param {Object} c - Thông tin hội nghị đã tổng hợp từ resolveConferenceDetails.
   * @returns {string} Chuỗi HTML `.saved-card`.
   */
  function buildSavedCardHtml(c) {
    const fallbackBadge =
      `<div class="conf-badge-logo saved-avatar" aria-hidden="true">`
      + `${escapeHtml((c.acronym || c.name || 'CG').slice(0, 4).toUpperCase())}</div>`;
    const avatarHtml = window.ConfGuideUtils && typeof window.ConfGuideUtils.renderConferenceAvatar === 'function'
      ? window.ConfGuideUtils.renderConferenceAvatar(c, 'saved-avatar')
      : fallbackBadge;

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
          <button type="button"
            class="btn btn-secondary btn--compact-sm btn--danger-text js-remove-saved-btn"
            data-id="${escapeHtml(c.id)}" title="Bỏ lưu hội nghị">
            <span>Bỏ lưu</span>
          </button>
        </div>
      </div>
    `;
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
    const trimmedKeyword = filterKeyword.trim().toLowerCase();
    if (trimmedKeyword) {
      items = items.filter(c =>
        c.name.toLowerCase().includes(trimmedKeyword)
        || c.fullName.toLowerCase().includes(trimmedKeyword)
        || c.rank.toLowerCase().includes(trimmedKeyword)
      );
    }

    if (items.length === 0) {
      container.innerHTML = buildSavedEmptyHtml(rawList.length > 0, filterKeyword);
      return;
    }

    container.innerHTML = items.map(buildSavedCardHtml).join('');
  }

  /**
   * Khởi tạo bộ lọc tìm kiếm và nút Xóa tất cả cho khu vực hội nghị đã lưu.
   */
  function initSavedSection() {
    const savedListEl = document.getElementById('savedConferencesList');
    const searchInput = document.getElementById('savedSearchInput');

    if (savedListEl) {
      // Event delegation một lần trên container thay vì gắn lại listener sau mỗi lần render
      savedListEl.addEventListener('click', event => {
        const btn = event.target instanceof Element ? event.target.closest('.js-remove-saved-btn') : null;
        if (!btn || !savedListEl.contains(btn)) return;
        const idToRemove = btn.getAttribute('data-id') || '';
        const current = getSavedList().filter(
          item => String(item).trim().toLowerCase() !== idToRemove.trim().toLowerCase()
        );
        setSavedList(current);
        renderSavedConferences(searchInput ? searchInput.value : '');
        showSavedAlert('Đã bỏ lưu hội nghị khỏi danh sách theo dõi.');
      });
    }

    renderSavedConferences();

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
   * Tạo mã HTML cho một thẻ xem trước bài báo Tracker trên trang Hồ sơ.
   * @param {Object} item - Bản ghi từ danh sách Tracker.
   * @returns {string} Chuỗi HTML `.tracker-card-item`.
   */
  function buildTrackerPreviewCardHtml(item) {
    const name = item.name || 'Bài báo khoa học';
    // Mốc propDeadline chỉ có ngày (YYYY-MM-DD), giữ nguyên nhãn AoE để không sai lệch giờ
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
          <svg class="empty-state-icon" width="42" height="42" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"
            stroke-linejoin="round" aria-hidden="true">
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

    const previewItems = trackerList.slice(0, TRACKER_PREVIEW_LIMIT);
    container.innerHTML = `
      <div class="tracker-preview-grid">
        ${previewItems.map(buildTrackerPreviewCardHtml).join('')}
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
    /**
     * Tải lại thông tin hồ sơ và lịch mốc hội nghị sau khi cập nhật dữ liệu phiên.
     */
    refresh: function () {
      renderUserProfile();
      if (document.getElementById('profileCalendarRoot')) {
        initCalendarSection();
      }
    }
  };
})();
