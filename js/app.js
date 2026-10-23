/**
 * ConfGuide - Advanced Search Application Script (js/app.js)
 * Bộ lọc đa chiều, đồng bộ URL parameters, chip tags hoạt động, bookmark theo người dùng
 */

(function () {
  'use strict';

  // Fallback dataset đầy đủ nếu chạy bằng file:/// và fetch bị chặn
  const FALLBACK_CONFERENCES = [
    {
      "id": "cvpr-2026",
      "name": "CVPR 2026",
      "year": "2026",
      "full_name": "IEEE/CVF Conference on Computer Vision and Pattern Recognition",
      "summarization": "Hội nghị quốc tế uy tín số 1 thế giới về thị giác máy tính và nhận dạng mẫu.",
      "location": "Vancouver, Canada",
      "date_happen": "2026-06-14 to 2026-06-19",
      "rank": "A*",
      "rating": 4.8,
      "rating_count": 142,
      "publisher": "IEEE / CVF",
      "mode": "Trực tiếp",
      "fields": ["computer vision", "deep learning", "multimodal ai"],
      "deadlines": [
        { "name": "Paper Submission", "date": "2026-01-15" },
        { "name": "Author Notification", "date": "2026-03-25" }
      ]
    },
    {
      "id": "neurips-2026",
      "name": "NeurIPS 2026",
      "year": "2026",
      "full_name": "Conference on Neural Information Processing Systems",
      "summarization": "Hội nghị học máy và khoa học thần kinh tính toán hàng đầu thế giới.",
      "location": "Sydney, Australia",
      "date_happen": "2026-12-06 to 2026-12-12",
      "rank": "A*",
      "rating": 4.9,
      "rating_count": 210,
      "publisher": "NeurIPS Foundation",
      "mode": "Trực tiếp",
      "fields": ["machine learning", "deep learning", "ai"],
      "deadlines": [
        { "name": "Abstract Submission", "date": "2026-05-15" },
        { "name": "Full Paper Submission", "date": "2026-05-22" }
      ]
    },
    {
      "id": "iclr-2026",
      "name": "ICLR 2026",
      "year": "2026",
      "full_name": "International Conference on Learning Representations",
      "summarization": "Hội nghị hàng đầu về biểu diễn học và học sâu, quy tụ các công trình đột phá về AI.",
      "location": "Singapore",
      "date_happen": "2026-04-26 to 2026-04-30",
      "rank": "A*",
      "rating": 4.8,
      "rating_count": 135,
      "publisher": "ICLR",
      "mode": "Hybrid",
      "fields": ["deep learning", "representation learning", "ai"],
      "deadlines": [
        { "name": "Paper Submission", "date": "2025-10-22" },
        { "name": "Author Notification", "date": "2026-01-22" }
      ]
    },
    {
      "id": "acl-2026",
      "name": "ACL 2026",
      "year": "2026",
      "full_name": "Annual Meeting of the Association for Computational Linguistics",
      "summarization": "Diễn đàn quốc tế uy tín nhất về xử lý ngôn ngữ tự nhiên (NLP) và mô hình ngôn ngữ lớn (LLM).",
      "location": "Vienna, Austria",
      "date_happen": "2026-07-05 to 2026-07-10",
      "rank": "A*",
      "rating": 4.7,
      "rating_count": 98,
      "publisher": "ACL",
      "mode": "Hybrid",
      "fields": ["nlp", "language models", "computational linguistics"],
      "deadlines": [
        { "name": "Paper Submission", "date": "2026-02-18" },
        { "name": "Author Notification", "date": "2026-05-15" }
      ]
    },
    {
      "id": "atc-2026",
      "name": "ATC 2026",
      "year": "2026",
      "full_name": "International Conference on Advanced Technologies for Communications",
      "summarization": "Hội nghị quốc tế thường niên về công nghệ truyền thông và viễn thông tại Việt Nam.",
      "location": "Quy Nhơn, Việt Nam",
      "date_happen": "2026-10-15 to 2026-10-17",
      "rank": "B",
      "rating": 4.2,
      "rating_count": 45,
      "publisher": "IEEE ComSoc / REV",
      "mode": "Trực tiếp",
      "fields": ["communications", "wireless networks", "iot"],
      "deadlines": [
        { "name": "Paper Submission", "date": "2026-05-30" },
        { "name": "Author Notification", "date": "2026-07-30" }
      ]
    },
    {
      "id": "soict-2026",
      "name": "SOICT 2026",
      "year": "2026",
      "full_name": "The 15th International Symposium on Information and Communication Technology",
      "summarization": "Hội thảo quốc tế về CNTT quy tụ các hướng nghiên cứu hiện đại: AI, An ninh mạng, Big Data.",
      "location": "TP. Hồ Chí Minh, Việt Nam",
      "date_happen": "2026-12-04 to 2026-12-05",
      "rank": "B",
      "rating": 4.3,
      "rating_count": 52,
      "publisher": "ACM / Springer",
      "mode": "Trực tiếp",
      "fields": ["ai foundations", "big data", "cyber security"],
      "deadlines": [
        { "name": "Full Paper Submission", "date": "2026-09-25" },
        { "name": "Author Notification", "date": "2026-10-12" }
      ]
    },
    {
      "id": "mapr-2026",
      "name": "MAPR 2026",
      "year": "2026",
      "full_name": "International Conference on Multimedia Analysis and Pattern Recognition",
      "summarization": "Hội nghị quốc tế chuyên sâu về Phân tích Đa phương tiện và Nhận dạng Mẫu do UIT chủ trì.",
      "location": "Đà Nẵng, Việt Nam",
      "date_happen": "2026-10-08 to 2026-10-09",
      "rank": "B",
      "rating": 4.4,
      "rating_count": 48,
      "publisher": "IEEE",
      "mode": "Trực tiếp",
      "fields": ["multimedia", "pattern recognition", "computer vision"],
      "deadlines": [
        { "name": "Paper Submission", "date": "2026-06-15" },
        { "name": "Author Notification", "date": "2026-08-10" }
      ]
    }
  ];

  let rawConferences = [];
  let filteredConferences = [];
  const PAGE_SIZE = 8;
  let currentPage = 1;

  // Helper lấy storage key của user hiện tại
  function getSavedStorageKey() {
    try {
      const userStr = localStorage.getItem('confguide_current_user');
      const user = userStr ? JSON.parse(userStr) : null;
      return user && user.id ? `confguide_saved_${user.id}` : 'confguide_saved_guest';
    } catch (e) {
      return 'confguide_saved_guest';
    }
  }

  function getSavedList() {
    try {
      const key = getSavedStorageKey();
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : [];
    } catch (e) {
      return [];
    }
  }

  function setSavedList(list) {
    try {
      const key = getSavedStorageKey();
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {}
  }

  // Khởi tạo các accordion đóng/mở
  function initAccordions() {
    const accordions = document.querySelectorAll('.filter-accordion');
    accordions.forEach(acc => {
      const head = acc.querySelector('.accordion-head');
      if (head) {
        head.addEventListener('click', () => {
          const isOpen = acc.classList.toggle('open');
          head.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });
      }
    });
  }

  // Render các lĩnh vực động vào sidebar
  function populateDynamicFields(data) {
    const container = document.getElementById('dynamicFieldsContainer');
    if (!container) return;

    const fieldsMap = new Map();
    data.forEach(conf => {
      if (Array.isArray(conf.fields)) {
        conf.fields.forEach(f => {
          const norm = f.trim().toLowerCase();
          if (norm) {
            fieldsMap.set(norm, (fieldsMap.get(norm) || 0) + 1);
          }
        });
      }
    });

    // Lấy top 12 fields phổ biến nhất
    const sortedFields = [...fieldsMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);

    container.innerHTML = sortedFields.map(([field, count]) => {
      const display = field.charAt(0).toUpperCase() + field.slice(1);
      return `
        <label class="check-row">
          <input type="checkbox" name="fields" value="${field}">
          <span>${display} (${count})</span>
        </label>
      `;
    }).join('');
  }

  // Đọc params từ URL
  function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      q: params.get('q') || '',
      rank: params.getAll('rank'),
      region: params.getAll('region'),
      mode: params.getAll('mode'),
      fields: params.getAll('fields'),
      publisher: params.getAll('publisher'),
      status: params.getAll('status'),
      from: params.get('from') || '',
      to: params.get('to') || '',
      past: params.get('past') === '1',
      sort: params.get('sort') || 'relevance'
    };
  }

  // Đồng bộ trạng thái UI từ params
  function setUiFromParams(params) {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = params.q;

    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) sortSelect.value = params.sort;

    const fromDate = document.getElementById('fromDate');
    if (fromDate) fromDate.value = params.from;

    const toDate = document.getElementById('toDate');
    if (toDate) toDate.value = params.to;

    const pastCheck = document.getElementById('includePastConferences');
    if (pastCheck) pastCheck.checked = params.past;

    // Checkbox groups
    const setCheckboxes = (name, values) => {
      document.querySelectorAll(`input[name="${name}"]`).forEach(cb => {
        cb.checked = values.includes(cb.value);
      });
    };

    setCheckboxes('rank', params.rank);
    setCheckboxes('region', params.region);
    setCheckboxes('mode', params.mode);
    setCheckboxes('fields', params.fields);
    setCheckboxes('publisher', params.publisher);
    setCheckboxes('status', params.status);
  }

  // Thu thập filter từ UI
  function getFiltersFromUi() {
    const getChecked = name => [...document.querySelectorAll(`input[name="${name}"]:checked`)].map(cb => cb.value);

    return {
      q: (document.getElementById('searchInput')?.value || '').trim(),
      rank: getChecked('rank'),
      region: getChecked('region'),
      mode: getChecked('mode'),
      fields: getChecked('fields'),
      publisher: getChecked('publisher'),
      status: getChecked('status'),
      from: document.getElementById('fromDate')?.value || '',
      to: document.getElementById('toDate')?.value || '',
      past: document.getElementById('includePastConferences')?.checked || false,
      sort: document.getElementById('sortSelect')?.value || 'relevance'
    };
  }

  // Đồng bộ URL với state hiện tại
  function syncUrl(filters) {
    const params = new URLSearchParams();
    if (filters.q) params.set('q', filters.q);
    filters.rank.forEach(v => params.append('rank', v));
    filters.region.forEach(v => params.append('region', v));
    filters.mode.forEach(v => params.append('mode', v));
    filters.fields.forEach(v => params.append('fields', v));
    filters.publisher.forEach(v => params.append('publisher', v));
    filters.status.forEach(v => params.append('status', v));
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.past) params.set('past', '1');
    if (filters.sort && filters.sort !== 'relevance') params.set('sort', filters.sort);

    const queryString = params.toString();
    const newRelativePathQuery = window.location.pathname + (queryString ? '?' + queryString : '');
    window.history.replaceState(null, '', newRelativePathQuery);
  }

  // Đếm ngược deadline & ngày
  function getNearestDeadline(deadlines) {
    if (!deadlines || !Array.isArray(deadlines) || deadlines.length === 0) return null;
    return deadlines[0];
  }

  function calculateDaysLeft(dateStr) {
    if (!dateStr) return null;
    const target = new Date(dateStr + 'T23:59:59');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  function formatDateVi(dateStr) {
    if (!dateStr) return 'Chưa cập nhật';
    const parts = dateStr.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  }

  // Lọc dữ liệu theo bộ lọc
  function applyFiltering() {
    const filters = getFiltersFromUi();
    currentPage = 1;
    syncUrl(filters);
    renderActiveChips(filters);

    filteredConferences = rawConferences.filter(conf => {
      // 1. Text Search (q)
      if (filters.q) {
        const query = filters.q.toLowerCase();
        const searchCorpus = [
          conf.name,
          conf.full_name,
          conf.summarization,
          conf.location,
          conf.publisher,
          conf.rank,
          ...(conf.fields || []),
          ...(conf.tags || [])
        ].filter(Boolean).join(' ').toLowerCase();

        if (!searchCorpus.includes(query)) return false;
      }

      // 2. Rank
      if (filters.rank.length > 0) {
        const confRank = (conf.rank || 'C').toUpperCase();
        const matchedRank = filters.rank.some(r => r.toUpperCase() === confRank);
        if (!matchedRank) return false;
      }

      // 3. Region
      if (filters.region.length > 0) {
        const loc = (conf.location || '').toLowerCase();
        const isVN = loc.includes('việt nam') || loc.includes('vietnam');
        const wantsVN = filters.region.includes('vietnam');
        const wantsIntl = filters.region.includes('international');

        if (wantsVN && !wantsIntl && !isVN) return false;
        if (wantsIntl && !wantsVN && isVN) return false;
      }

      // 4. Mode / Hình thức
      if (filters.mode.length > 0) {
        const confMode = (conf.mode || 'Trực tiếp').toLowerCase();
        const matchMode = filters.mode.some(m => confMode.includes(m.toLowerCase()));
        if (!matchMode) return false;
      }

      // 5. Fields
      if (filters.fields.length > 0) {
        const confFields = (conf.fields || []).map(f => f.toLowerCase());
        const matchField = filters.fields.some(f => confFields.includes(f.toLowerCase()));
        if (!matchField) return false;
      }

      // 6. Publisher & Index
      if (filters.publisher.length > 0) {
        const pubText = [conf.publisher, conf.full_name, conf.summarization].filter(Boolean).join(' ').toLowerCase();
        const matchPub = filters.publisher.some(p => pubText.includes(p.toLowerCase()));
        if (!matchPub) return false;
      }

      // 7. Status & Past Conferences
      const nearest = getNearestDeadline(conf.deadlines);
      const daysLeft = nearest ? calculateDaysLeft(nearest.date) : null;

      // Mặc định ẩn hội nghị đã diễn ra / hết hạn trừ khi filters.past = true
      if (!filters.past) {
        const confYear = parseInt(conf.year || '2026', 10);
        if (confYear < 2026) return false;
        if (daysLeft !== null && daysLeft < -60) return false;
      }

      // Lọc status
      if (filters.status.length > 0) {
        let isStatusMatched = false;
        if (filters.status.includes('open') && daysLeft !== null && daysLeft > 30) isStatusMatched = true;
        if (filters.status.includes('urgent') && daysLeft !== null && daysLeft >= 0 && daysLeft <= 30) isStatusMatched = true;
        if (filters.status.includes('closed') && (daysLeft !== null && daysLeft < 0)) isStatusMatched = true;
        if (!isStatusMatched) return false;
      }

      // 8. Date range
      if (filters.from || filters.to) {
        const deadlineDate = nearest ? nearest.date : '';
        if (filters.from && (!deadlineDate || deadlineDate < filters.from)) return false;
        if (filters.to && (!deadlineDate || deadlineDate > filters.to)) return false;
      }

      return true;
    });

    sortAndRender(filters.sort);
  }

  // Sắp xếp và Render danh sách kết quả
  function sortAndRender(sortType) {
    const list = [...filteredConferences];

    list.sort((a, b) => {
      if (sortType === 'deadline') {
        const deadA = getNearestDeadline(a.deadlines)?.date || '9999-99-99';
        const deadB = getNearestDeadline(b.deadlines)?.date || '9999-99-99';
        return deadA.localeCompare(deadB);
      }
      if (sortType === 'rating') {
        return (b.rating || 0) - (a.rating || 0);
      }
      if (sortType === 'date') {
        return (a.date_happen || a.year || '').localeCompare(b.date_happen || b.year || '');
      }
      if (sortType === 'name') {
        return a.name.localeCompare(b.name);
      }
      // relevance (default)
      const rankOrder = { 'A*': 4, 'A': 3, 'B': 2, 'C': 1 };
      const scoreA = (rankOrder[a.rank] || 1) * 10 + (a.rating || 0);
      const scoreB = (rankOrder[b.rank] || 1) * 10 + (b.rating || 0);
      return scoreB - scoreA;
    });

    renderConferenceCards(list);
  }

  // Render các active chips
  function renderActiveChips(filters) {
    const chipsBar = document.getElementById('activeChipsBar');
    const container = document.getElementById('activeChipsContainer');
    if (!chipsBar || !container) return;

    const chips = [];

    if (filters.q) {
      chips.push({ label: `Từ khóa: "${filters.q}"`, clear: () => { document.getElementById('searchInput').value = ''; } });
    }
    filters.rank.forEach(val => {
      chips.push({ label: `Rank: ${val}`, clear: () => uncheck('rank', val) });
    });
    filters.region.forEach(val => {
      chips.push({ label: `Khu vực: ${val === 'vietnam' ? 'Việt Nam' : 'Quốc tế'}`, clear: () => uncheck('region', val) });
    });
    filters.mode.forEach(val => {
      chips.push({ label: `Hình thức: ${val}`, clear: () => uncheck('mode', val) });
    });
    filters.fields.forEach(val => {
      chips.push({ label: `Lĩnh vực: ${val}`, clear: () => uncheck('fields', val) });
    });
    filters.publisher.forEach(val => {
      chips.push({ label: `NXB: ${val.toUpperCase()}`, clear: () => uncheck('publisher', val) });
    });
    filters.status.forEach(val => {
      const stMap = { open: 'Đang mở', urgent: 'Sắp hết hạn', closed: 'Đã đóng' };
      chips.push({ label: `Trạng thái: ${stMap[val] || val}`, clear: () => uncheck('status', val) });
    });
    if (filters.from || filters.to) {
      chips.push({
        label: `Thời hạn: ${filters.from || '...'} đến ${filters.to || '...'}`,
        clear: () => {
          document.getElementById('fromDate').value = '';
          document.getElementById('toDate').value = '';
        }
      });
    }
    if (filters.past) {
      chips.push({ label: 'Gồm cả hội nghị đã qua', clear: () => { document.getElementById('includePastConferences').checked = false; } });
    }

    if (chips.length === 0) {
      chipsBar.style.display = 'none';
      container.innerHTML = '';
      return;
    }

    chipsBar.style.display = 'flex';
    container.innerHTML = chips.map((c, idx) => `
      <span class="chip-item">
        <span>${c.label}</span>
        <button type="button" data-chip-idx="${idx}" aria-label="Xóa bộ lọc ${c.label}">&times;</button>
      </span>
    `).join('');

    container.querySelectorAll('button[data-chip-idx]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.chipIdx);
        if (chips[idx]) {
          chips[idx].clear();
          applyFiltering();
        }
      });
    });
  }

  function uncheck(name, value) {
    const cb = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (cb) cb.checked = false;
  }

  function resetAllFilters() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';

    const fromDate = document.getElementById('fromDate');
    if (fromDate) fromDate.value = '';

    const toDate = document.getElementById('toDate');
    if (toDate) toDate.value = '';

    const pastCheck = document.getElementById('includePastConferences');
    if (pastCheck) pastCheck.checked = false;

    document.querySelectorAll('#filtersSidebar input[type="checkbox"]').forEach(cb => {
      cb.checked = false;
    });

    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) sortSelect.value = 'relevance';

    applyFiltering();
  }

  // Render danh sách thẻ hội nghị
  function renderConferenceCards(list) {
    const container = document.getElementById('conferenceList');
    const resultCount = document.getElementById('resultCount');
    const emptyState = document.getElementById('emptyState');
    if (!container) return;

    if (resultCount) resultCount.textContent = list.length;

    if (list.length === 0) {
      container.innerHTML = '';
      const pagination = document.getElementById('pagination');
      if (pagination) pagination.innerHTML = '';
      if (emptyState) emptyState.classList.remove('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    const pageCount = Math.ceil(list.length / PAGE_SIZE);
    currentPage = Math.min(Math.max(1, currentPage), pageCount);
    const pageItems = list.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    const savedIds = getSavedList();

    container.innerHTML = pageItems.map(conf => {
      const utils = window.ConfGuideUtils;
      const nextDl = utils ? utils.getNextDeadline(conf) : null;

      let countdownClass = 'deadline-countdown';
      let countdownText = 'Chưa công bố';
      let deadlineHeader = 'Hạn nộp bài';

      if (nextDl) {
        deadlineHeader = `Mốc tiếp theo: ${nextDl.shortName}`;
        if (!nextDl.isPassed) {
          countdownText = `Còn ${nextDl.daysLeft} ngày`;
          if (nextDl.daysLeft <= 14) {
            countdownClass += ' urgent';
          }
        } else {
          countdownText = 'Đã qua đợt nộp';
        }
      }

      const confId = conf.id || encodeURIComponent(conf.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
      const isSaved = savedIds.includes(confId);

      let rankClass = 'rank-c';
      if (conf.rank === 'A*') rankClass = 'rank-a-star';
      else if (conf.rank === 'A') rankClass = 'rank-a';
      else if (conf.rank === 'B') rankClass = 'rank-b';

      const fieldsTags = (conf.fields || []).slice(0, 4).map(f => `
        <span class="tag-field">${f}</span>
      `).join('');

      return `
        <article class="search-conf-card" data-id="${confId}">
          <div class="card-main-col">
            <div class="card-title-row">
              <h3>${conf.name}</h3>
              <span class="card-rank-badge ${rankClass}">Rank ${conf.rank || 'C'}</span>
              <span class="tag-field">${conf.format || conf.mode || 'Trực tiếp'}</span>
            </div>

            <div class="card-full-name">${conf.fullName || conf.full_name || conf.name}</div>

            <div class="card-meta-row">
              <span class="card-meta-item">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg>
                <span>${conf.location || 'Chưa cập nhật'}</span>
              </span>
              <span class="card-meta-item">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                <span>${utils ? utils.formatRangeVi(conf.startDate, conf.endDate) : (conf.date_happen || '2026')}</span>
              </span>
              ${conf.rating ? `
                <span class="card-meta-item">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="#f5b301" stroke="#f5b301" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  <span>${conf.rating} / 5</span>
                </span>
              ` : ''}
            </div>

            <div class="card-tags">
              ${fieldsTags}
            </div>
          </div>

          <div class="card-action-col">
            <div class="deadline-indicator">
              <span class="deadline-label">${deadlineHeader}</span>
              <span class="deadline-val">${nextDl ? utils.formatDateVi(nextDl.date) : 'Đang cập nhật'}</span>
              <span class="${countdownClass}">${countdownText}</span>
            </div>

            <div class="card-buttons-group">
              <a href="detail.html?id=${confId}" class="btn-card-detail">
                Xem chi tiết &rarr;
              </a>
              <button type="button" class="btn-card-save ${isSaved ? 'saved' : ''}" data-save-id="${confId}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="${isSaved ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
                <span>${isSaved ? 'Đã lưu' : 'Lưu lại'}</span>
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Gắn sự kiện nút Lưu bookmark
    container.querySelectorAll('.btn-card-save').forEach(btn => {
      btn.addEventListener('click', () => {
        const confId = btn.dataset.saveId;
        toggleSaveConference(confId, btn);
      });
    });

    renderPagination(list.length);
  }

  function renderPagination(total) {
    const host = document.getElementById('pagination');
    if (!host) return;
    const pageCount = Math.ceil(total / PAGE_SIZE);
    if (pageCount <= 1) {
      host.innerHTML = '';
      return;
    }

    host.innerHTML = `
      <button type="button" class="pagination-button" data-page-step="-1" ${currentPage === 1 ? 'disabled' : ''} aria-label="Trang trước">‹</button>
      <label class="pagination-jump">Trang
        <input id="pageJump" type="number" inputmode="numeric" min="1" max="${pageCount}" value="${currentPage}" aria-label="Chuyển đến trang">
        <span>/ ${pageCount}</span>
      </label>
      <button type="button" class="pagination-button" data-page-step="1" ${currentPage === pageCount ? 'disabled' : ''} aria-label="Trang sau">›</button>
      <span class="pagination-total">${total} hội nghị</span>
    `;

    host.querySelectorAll('[data-page-step]').forEach(button => {
      button.addEventListener('click', () => goToPage(currentPage + Number(button.dataset.pageStep)));
    });
    const pageInput = document.getElementById('pageJump');
    const commitPage = () => goToPage(pageInput.value);
    pageInput.addEventListener('change', commitPage);
    pageInput.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        commitPage();
      }
    });
  }

  function goToPage(value) {
    const requested = Number.parseInt(value, 10);
    const pageCount = Math.ceil(filteredConferences.length / PAGE_SIZE);
    if (!Number.isFinite(requested) || pageCount < 1) return;
    currentPage = Math.min(pageCount, Math.max(1, requested));
    sortAndRender(document.getElementById('sortSelect')?.value || 'relevance');
    document.getElementById('pagination')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  // Xử lý bookmark
  function toggleSaveConference(confId, btn) {
    let saved = getSavedList();
    const isCurrentlySaved = saved.includes(confId);

    if (isCurrentlySaved) {
      saved = saved.filter(id => id !== confId);
      setSavedList(saved);
      btn.classList.remove('saved');
      btn.querySelector('span').textContent = 'Lưu lại';
      const svg = btn.querySelector('svg');
      if (svg) svg.setAttribute('fill', 'none');
      showToast('Đã xóa hội nghị khỏi danh sách đã lưu.');
    } else {
      saved.push(confId);
      setSavedList(saved);
      btn.classList.add('saved');
      btn.querySelector('span').textContent = 'Đã lưu';
      const svg = btn.querySelector('svg');
      if (svg) svg.setAttribute('fill', 'currentColor');
      showToast('Đã lưu hội nghị vào hồ sơ cá nhân.');
    }
  }

  function showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(window._toastTimeout);
    window._toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2500);
  }

  // Tải dữ liệu chính
  async function loadData() {
    try {
      const response = await fetch('data/conference_data.json');
      if (!response.ok) throw new Error('HTTP error');
      const data = await response.json();
      rawConferences = Array.isArray(data) && data.length > 0 ? data : FALLBACK_CONFERENCES;
    } catch (e) {
      console.warn('Fetch data failed, using fallback dataset:', e);
      rawConferences = FALLBACK_CONFERENCES;
    }

    populateDynamicFields(rawConferences);

    // Đọc URL parameters và áp dụng lên UI
    const params = getUrlParams();
    setUiFromParams(params);
    applyFiltering();
  }

  // Gắn các sự kiện form & bộ lọc
  function initEvents() {
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
      searchForm.addEventListener('submit', e => {
        e.preventDefault();
        applyFiltering();
      });
    }

    // Từ khóa gợi ý
    document.querySelectorAll('.keyword').forEach(btn => {
      btn.addEventListener('click', () => {
        const keyword = btn.dataset.keyword;
        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = keyword;
        applyFiltering();
      });
    });

    // Nút áp dụng bộ lọc
    const applyBtn = document.getElementById('applyFiltersBtn');
    if (applyBtn) applyBtn.addEventListener('click', applyFiltering);

    // Nút xóa tất cả
    const resetAllBtn = document.getElementById('btnResetAllFilters');
    if (resetAllBtn) resetAllBtn.addEventListener('click', resetAllFilters);

    const clearChipsBtn = document.getElementById('btnClearAllChips');
    if (clearChipsBtn) clearChipsBtn.addEventListener('click', resetAllFilters);

    const emptyResetBtn = document.getElementById('btnResetFromEmpty');
    if (emptyResetBtn) emptyResetBtn.addEventListener('click', resetAllFilters);

    // Sort select
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', () => {
        applyFiltering();
      });
    }

    // Tự động re-filter khi tick/untick checkbox hoặc thay đổi ngày
    const sidebar = document.getElementById('filtersSidebar');
    if (sidebar) {
      sidebar.addEventListener('change', e => {
        if (e.target.matches('input[type="checkbox"], input[type="date"]')) {
          applyFiltering();
        }
      });
    }
  }

  // Khởi chạy
  document.addEventListener('DOMContentLoaded', () => {
    initAccordions();
    initEvents();
    loadData();
  });
})();
