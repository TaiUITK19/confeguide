/**
 * ConfGuide — Personal Research Profile Script (js/profile.js)
 * Quản lý hồ sơ nghiên cứu cá nhân, chỉnh sửa thông tin, hội nghị đã lưu và xem trước Tracker
 * Hoạt động 100% trên giao thức file:/// & LocalStorage
 */

(function () {
  'use strict';

  // Helper escape HTML chống XSS
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Lấy người dùng đăng nhập
  function getCurrentUser() {
    try {
      const data = localStorage.getItem('confguide_current_user');
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  // Mặc định cho profile nếu người dùng chưa điền đầy đủ
  const DEFAULT_USER_DATA = {
    id: 'usr_01',
    username: 'user1',
    email: 'user1@gmail.com',
    fullName: 'Nhà nghiên cứu',
    academicTitle: 'Nghiên cứu sinh / Giảng viên',
    affiliation: 'Đại học Quốc gia TP.HCM',
    fieldsOfInterest: 'Trí tuệ nhân tạo, Thị giác máy tính, Xử lý ngôn ngữ tự nhiên, Khoa học dữ liệu',
    bio: 'Quan tâm đến các hội nghị khoa học quốc tế uy tín thuộc xếp hạng CORE A*/A.',
    scholarUrl: 'https://scholar.google.com'
  };

  let currentUser = getCurrentUser() || DEFAULT_USER_DATA;

  function getSavedStorageKey() {
    return currentUser && currentUser.id ? `confguide_saved_${currentUser.id}` : 'confguide_saved_guest';
  }

  // Hiển thị thông báo trên trang
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
  function renderUserProfile() {
    currentUser = getCurrentUser() || currentUser;

    const fullName = currentUser.fullName || currentUser.name || currentUser.username || DEFAULT_USER_DATA.fullName;
    const initial = fullName.trim().charAt(0).toUpperCase() || 'U';
    const academicTitle = currentUser.academicTitle || DEFAULT_USER_DATA.academicTitle;
    const affiliation = currentUser.affiliation || DEFAULT_USER_DATA.affiliation;
    const headline = `${academicTitle} • ${affiliation}`;
    const email = currentUser.email || DEFAULT_USER_DATA.email;
    const username = currentUser.username || 'user';
    const bio = currentUser.bio || DEFAULT_USER_DATA.bio;
    const scholarUrl = currentUser.scholarUrl || '';
    const fieldsRaw = currentUser.fieldsOfInterest || DEFAULT_USER_DATA.fieldsOfInterest;

    // Avatar và tên hiển thị
    const avatarEl = document.getElementById('profileAvatarBig');
    if (avatarEl) {
      if (currentUser.avatarUrl && typeof currentUser.avatarUrl === 'string') {
        avatarEl.innerHTML = `<img src="${escapeHtml(currentUser.avatarUrl)}" alt="${escapeHtml(fullName)}" class="profile-avatar-img-tag">`;
      } else {
        avatarEl.textContent = initial;
      }
    }

    const modalAvatarPreview = document.getElementById('modalAvatarPreview');
    if (modalAvatarPreview) {
      if (currentUser.avatarUrl && typeof currentUser.avatarUrl === 'string') {
        modalAvatarPreview.innerHTML = `<img src="${escapeHtml(currentUser.avatarUrl)}" alt="${escapeHtml(fullName)}" class="modal-avatar-img-tag">`;
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

    const usernameEl = document.getElementById('profileUsernameDisplay');
    if (usernameEl) usernameEl.textContent = `@${username}`;

    // Google Scholar / ORCID
    const scholarLink = document.getElementById('profileScholarLink');
    if (scholarLink) {
      if (scholarUrl && scholarUrl.trim().length > 4) {
        scholarLink.href = scholarUrl;
        scholarLink.style.display = 'inline-flex';
      } else {
        scholarLink.style.display = 'none';
      }
    }

    // Lĩnh vực nghiên cứu dạng pills
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

    // Bio
    const bioEl = document.getElementById('profileBioText');
    if (bioEl) bioEl.textContent = `"${bio}"`;

    // Điền dữ liệu vào form chỉnh sửa modal
    const editFullName = document.getElementById('editFullName');
    if (editFullName) editFullName.value = fullName;

    const editUsername = document.getElementById('editUsername');
    if (editUsername) editUsername.value = username;

    const editEmail = document.getElementById('editEmail');
    if (editEmail) editEmail.value = email;

    const editTitle = document.getElementById('editTitle');
    if (editTitle) editTitle.value = academicTitle;

    const editAffiliation = document.getElementById('editAffiliation');
    if (editAffiliation) editAffiliation.value = affiliation;

    const editScholar = document.getElementById('editScholar');
    if (editScholar) editScholar.value = scholarUrl;

    const editFields = document.getElementById('editFields');
    if (editFields) editFields.value = fieldsRaw;

    const editBio = document.getElementById('editBio');
    if (editBio) editBio.value = bio;
  }

  /* ================= 2. MODAL CHỈNH SỬA HỒ SƠ ================= */
  function initEditProfileModal() {
    const modal = document.getElementById('editProfileModal');
    const openBtn = document.getElementById('openEditProfileBtn');
    const closeBtn = document.getElementById('closeEditProfileBtn');
    const cancelBtn = document.getElementById('cancelEditProfileBtn');
    const backdrop = document.getElementById('editProfileBackdrop');
    const form = document.getElementById('editProfileForm');
    const modalAlert = document.getElementById('editModalAlert');

    if (!modal) return;

    function openModal() {
      renderUserProfile(); // Đảm bảo nạp dữ liệu mới nhất vào form
      if (modalAlert) {
        modalAlert.className = 'modal-alert';
        modalAlert.textContent = '';
      }
      modal.removeAttribute('hidden');
      requestAnimationFrame(() => modal.classList.add('show'));
      const firstInput = document.getElementById('editFullName');
      if (firstInput) setTimeout(() => firstInput.focus(), 150);
    }

    function closeModal() {
      modal.classList.remove('show');
      setTimeout(() => modal.setAttribute('hidden', 'true'), 180);
    }

    if (openBtn) openBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (backdrop) backdrop.addEventListener('click', closeModal);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('show')) {
        closeModal();
      }
    });

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();

        const fullName = document.getElementById('editFullName').value.trim();
        const email = document.getElementById('editEmail').value.trim();
        const title = document.getElementById('editTitle').value.trim();
        const affiliation = document.getElementById('editAffiliation').value.trim();
        const scholar = document.getElementById('editScholar').value.trim();
        const fields = document.getElementById('editFields').value.trim();
        const bio = document.getElementById('editBio').value.trim();

        if (!fullName) {
          if (modalAlert) {
            modalAlert.textContent = 'Vui lòng nhập Họ và tên.';
            modalAlert.className = 'modal-alert show error';
          }
          return;
        }

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          if (modalAlert) {
            modalAlert.textContent = 'Địa chỉ email không hợp lệ.';
            modalAlert.className = 'modal-alert show error';
          }
          return;
        }

        // Cập nhật currentUser
        currentUser.fullName = fullName;
        currentUser.name = fullName;
        currentUser.email = email;
        currentUser.academicTitle = title;
        currentUser.affiliation = affiliation;
        currentUser.scholarUrl = scholar;
        currentUser.fieldsOfInterest = fields;
        currentUser.bio = bio;

        localStorage.setItem('confguide_current_user', JSON.stringify(currentUser));

        // Đồng bộ vào DB confguide_users
        try {
          const users = JSON.parse(localStorage.getItem('confguide_users') || '[]');
          const updatedUsers = users.map(u => {
            if ((u.id && u.id === currentUser.id) || (u.username && u.username === currentUser.username)) {
              return {
                ...u,
                fullName: fullName,
                name: fullName,
                email: email,
                academicTitle: title,
                affiliation: affiliation,
                scholarUrl: scholar,
                fieldsOfInterest: fields,
                bio: bio
              };
            }
            return u;
          });
          localStorage.setItem('confguide_users', JSON.stringify(updatedUsers));
        } catch (err) {}

        // Cập nhật giao diện
        renderUserProfile();

        // Cập nhật header avatar/name ngay lập tức nếu layout.js có hàm update
        if (window.ConfGuideLayout && typeof window.ConfGuideLayout.update === 'function') {
          window.ConfGuideLayout.update();
        }

        closeModal();
        showPageAlert('Đã cập nhật thông tin hồ sơ nghiên cứu thành công!', 'success');
      });
    }
  }

  /* ================= 2B. XỬ LÝ TẢI VÀ NÉN ẢNH ĐẠI DIỆN ================= */
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

          // Center-crop (object-fit: cover) để không bị méo tỉ lệ
          const minDim = Math.min(img.width, img.height);
          const sx = (img.width - minDim) / 2;
          const sy = (img.height - minDim) / 2;

          ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 200, 200);

          // Nén JPEG 85% chất lượng cao -> dung lượng cực nhẹ (~15-25KB)
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

          currentUser.avatarUrl = compressedDataUrl;
          localStorage.setItem('confguide_current_user', JSON.stringify(currentUser));

          // Đồng bộ vào DB confguide_users
          try {
            const users = JSON.parse(localStorage.getItem('confguide_users') || '[]');
            const updated = users.map(u => {
              if ((u.id && u.id === currentUser.id) || (u.username && u.username === currentUser.username)) {
                return { ...u, avatarUrl: compressedDataUrl };
              }
              return u;
            });
            localStorage.setItem('confguide_users', JSON.stringify(updated));
          } catch (err) {}

          renderUserProfile();

          // Đồng bộ ngay lập tức lên Header trên toàn bộ trang web
          if (window.ConfGuideLayout && typeof window.ConfGuideLayout.update === 'function') {
            window.ConfGuideLayout.update();
          }

          showPageAlert('Đã tải và cập nhật ảnh đại diện thành công!', 'success');
        } catch (err) {
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

  function removeAvatarPhoto() {
    if (!currentUser.avatarUrl) {
      showPageAlert('Tài khoản hiện đang sử dụng chữ cái đầu làm ảnh đại diện.', 'success', 2500);
      return;
    }

    if (!confirm('Bạn có chắc muốn xóa ảnh đại diện và quay về dùng chữ cái đầu?')) {
      return;
    }

    delete currentUser.avatarUrl;
    localStorage.setItem('confguide_current_user', JSON.stringify(currentUser));

    try {
      const users = JSON.parse(localStorage.getItem('confguide_users') || '[]');
      const updated = users.map(u => {
        if ((u.id && u.id === currentUser.id) || (u.username && u.username === currentUser.username)) {
          const copy = { ...u };
          delete copy.avatarUrl;
          return copy;
        }
        return u;
      });
      localStorage.setItem('confguide_users', JSON.stringify(updated));
    } catch (err) {}

    renderUserProfile();

    if (window.ConfGuideLayout && typeof window.ConfGuideLayout.update === 'function') {
      window.ConfGuideLayout.update();
    }

    showPageAlert('Đã xóa ảnh đại diện thành công.', 'success');
  }

  function initAvatarUpload() {
    const fileInput = document.getElementById('globalAvatarInput');
    const triggerBtn = document.getElementById('triggerAvatarUploadBtn');
    const modalUploadBtn = document.getElementById('modalUploadAvatarBtn');
    const modalRemoveBtn = document.getElementById('modalRemoveAvatarBtn');

    if (!fileInput) return;

    // Kích hoạt chọn file từ icon máy ảnh trên thẻ Hero Profile
    if (triggerBtn) {
      triggerBtn.addEventListener('click', () => {
        fileInput.click();
      });
    }

    // Kích hoạt chọn file từ modal Chỉnh sửa hồ sơ
    if (modalUploadBtn) {
      modalUploadBtn.addEventListener('click', () => {
        fileInput.click();
      });
    }

    // Xóa ảnh đại diện trong modal
    if (modalRemoveBtn) {
      modalRemoveBtn.addEventListener('click', () => {
        removeAvatarPhoto();
      });
    }

    // Xử lý khi người dùng chọn xong file ảnh
    fileInput.addEventListener('change', function () {
      if (this.files && this.files[0]) {
        processAndSaveAvatar(this.files[0]);
        this.value = ''; // Reset để có thể chọn lại cùng 1 file nếu muốn
      }
    });
  }

  /* ================= 3. HỘI NGHỊ ĐÃ LƯU THEO DÕI ================= */
  let cachedConferencesData = [];

  async function fetchConferencesData() {
    if (cachedConferencesData.length > 0) return cachedConferencesData;
    
    // Nạp từ window.ConfGuideUtils nếu có
    if (window.ConfGuideUtils && Array.isArray(window.ConfGuideUtils.FALLBACK_CONFERENCES)) {
      cachedConferencesData = window.ConfGuideUtils.FALLBACK_CONFERENCES;
    }

    try {
      const resp = await fetch('data/conference_data.json');
      if (resp.ok) {
        const json = await resp.json();
        if (Array.isArray(json) && json.length > 0) {
          cachedConferencesData = json;
        }
      }
    } catch (e) {
      // Offline file:/// fetch fallback
    }
    return cachedConferencesData;
  }

  function getSavedList() {
    const key = getSavedStorageKey();
    let saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (!saved) {
      saved = JSON.parse(localStorage.getItem('confguide_saved') || localStorage.getItem('savedConferences') || '[]');
    }
    return Array.isArray(saved) ? saved : [];
  }

  function setSavedList(list) {
    const key = getSavedStorageKey();
    localStorage.setItem(key, JSON.stringify(list));
    localStorage.setItem('confguide_saved', JSON.stringify(list));
  }

  function resolveConferenceDetails(item, allConfs) {
    const itemStr = String(item).trim();
    const itemLower = itemStr.toLowerCase();

    // Tìm theo ID hoặc Name
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
        acronym: acronym,
        slug: found.id || itemStr.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      };
    }

    // Trường hợp không tìm thấy trong metadata
    const acronym = itemStr.split(/[\s-]+/)[0].toUpperCase().slice(0, 6);
    return {
      id: itemStr,
      name: itemStr,
      fullName: 'Hội nghị khoa học quốc tế',
      rank: 'A',
      format: 'hybrid',
      location: '',
      acronym: acronym || 'CONF',
      slug: itemStr.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    };
  }

  async function renderSavedConferences(filterKeyword = '') {
    const allConfs = await fetchConferencesData();
    const rawList = getSavedList();
    
    // Cập nhật chỉ số Stats
    const statSavedNum = document.getElementById('statSavedNum');
    if (statSavedNum) statSavedNum.textContent = rawList.length;

    const container = document.getElementById('savedConferencesList');
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
            <svg class="empty-state-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
            </svg>
            <h3 style="font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 6px;">Chưa có hội nghị nào được lưu</h3>
            <p style="font-size: 13.5px; color: var(--text-muted); margin-bottom: 18px; max-width: 480px; margin-left: auto; margin-right: auto;">
              Khám phá danh sách hội nghị khoa học công nghệ, bấm biểu tượng lưu để theo dõi thời gian nộp bài tại đây.
            </p>
            <a href="search.html" class="btn btn-primary" style="font-size: 13.5px; padding: 8px 18px;">
              <span>Tra cứu hội nghị ngay &rarr;</span>
            </a>
          </div>
        `;
      } else {
        container.innerHTML = `
          <div class="empty-state-box">
            <p style="font-size: 14px; color: var(--text-muted);">
              Không tìm thấy hội nghị phù hợp với từ khóa "<strong>${escapeHtml(filterKeyword)}</strong>".
            </p>
          </div>
        `;
      }
      return;
    }

    container.innerHTML = items.map(c => `
      <div class="saved-card">
        <div class="saved-card-main">
          <div class="saved-avatar">${escapeHtml(c.acronym)}</div>
          <div class="saved-info">
            <div class="saved-title">
              <strong>${escapeHtml(c.name)}</strong>
              <span class="saved-badge-rank">Hạng ${escapeHtml(c.rank)}</span>
            </div>
            <div class="saved-meta-line">
              ${c.fullName ? `${escapeHtml(c.fullName)}` : 'Hội nghị khoa học quốc tế'}
              ${c.location ? ` • 📍 ${escapeHtml(c.location)}` : ''}
            </div>
          </div>
        </div>
        <div class="saved-actions">
          <a href="detail.html?id=${encodeURIComponent(c.slug)}" class="btn btn-secondary" style="font-size: 13px; padding: 7px 14px;">
            <span>Xem chi tiết &rarr;</span>
          </a>
          <button type="button" class="btn btn-secondary remove-saved-btn" data-id="${escapeHtml(c.id)}" style="font-size: 13px; padding: 7px 12px; color: var(--red);" title="Bỏ lưu hội nghị">
            <span>Bỏ lưu</span>
          </button>
        </div>
      </div>
    `).join('');

    // Gắn sự kiện Xóa từng hội nghị
    container.querySelectorAll('.remove-saved-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        const idToRemove = this.getAttribute('data-id');
        let current = getSavedList();
        current = current.filter(item => String(item).trim().toLowerCase() !== idToRemove.trim().toLowerCase());
        setSavedList(current);
        renderSavedConferences(filterKeyword);
        showSavedAlert('Đã bỏ lưu hội nghị khỏi danh sách theo dõi.');
      });
    });
  }

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
      clearAllBtn.addEventListener('click', function () {
        const list = getSavedList();
        if (list.length === 0) return;

        if (confirm('Bạn có chắc chắn muốn xóa tất cả hội nghị khỏi danh sách theo dõi?')) {
          setSavedList([]);
          renderSavedConferences();
          showSavedAlert('Đã làm trống toàn bộ danh sách hội nghị đã lưu.');
        }
      });
    }
  }

  /* ================= 4. XEM TRƯỚC BÀI BÁO TRACKER ================= */
  function getTrackerConferences() {
    try {
      const data = localStorage.getItem('confguides');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  function renderTrackerPreview() {
    const trackerList = getTrackerConferences();
    
    // Cập nhật chỉ số Stats
    const statTrackerNum = document.getElementById('statTrackerNum');
    if (statTrackerNum) statTrackerNum.textContent = trackerList.length;

    const container = document.getElementById('trackerPreviewContainer');
    if (!container) return;

    if (trackerList.length === 0) {
      container.innerHTML = `
        <div class="empty-state-box" style="padding: 32px 20px;">
          <svg class="empty-state-icon" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
          <h3 style="font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 4px;">Chưa có bài báo nào trong Tracker</h3>
          <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
            Sử dụng trang Theo dõi nộp bài để quản lý quy trình soạn thảo, nộp bài và phản biện các bài báo của bạn.
          </p>
          <a href="tracker.html" class="btn btn-primary" style="font-size: 13px; padding: 7px 16px;">
            <span>Thêm bài báo vào Tracker &rarr;</span>
          </a>
        </div>
      `;
      return;
    }

    // Hiển thị tối đa 4 mục
    const previewItems = trackerList.slice(0, 4);

    container.innerHTML = `
      <div class="tracker-preview-grid">
        ${previewItems.map(item => {
          const name = item.name || 'Bài báo khoa học';
          const deadline = item.deadline ? new Date(item.deadline + 'T00:00:00').toLocaleDateString('vi-VN') : 'Chưa có hạn';
          const fieldsStr = Array.isArray(item.fields) ? item.fields.join(', ') : 'Công nghệ thông tin';

          return `
            <div class="tracker-card-item">
              <div class="tracker-card-top">
                <div class="tracker-paper-title">${escapeHtml(name)}</div>
                <span class="tracker-status-tag status-submitted">Đang theo dõi</span>
              </div>
              <div style="font-size: 13px; color: var(--text-muted);">
                Lĩnh vực: <strong>${escapeHtml(fieldsStr)}</strong>
              </div>
              <div class="tracker-card-bottom">
                <span>Mốc nộp bài: <strong>${escapeHtml(deadline)}</strong></span>
                <a href="tracker.html" style="color: var(--primary); font-weight: 600; text-decoration: none;">Xem &rarr;</a>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  /* ================= KHỞI TẠO HỒ SƠ ================= */
  function init() {
    renderUserProfile();
    initEditProfileModal();
    initAvatarUpload();
    initSavedSection();
    renderTrackerPreview();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // API xuất toàn cục
  window.ConfGuideProfile = {
    refresh: function () {
      renderUserProfile();
      renderSavedConferences();
      renderTrackerPreview();
    }
  };
})();
