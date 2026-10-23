/**
 * ConfGuide - Unified Conference Detail Script (js/detail.js)
 * Tải dữ liệu động theo tham số ?id=<slug> từ conference_data.json
 * Đồng bộ Bookmark, đếm ngược múi giờ AoE, xuất Google Calendar & .ics
 * Hoạt động trơn tru trên cả web server lẫn giao thức file:///
 */

(function () {
  'use strict';

  const STAR_PATH = "M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z";

  // Dữ liệu dự phòng chuẩn hóa 17 trường tương thích 100% với conference_data.json
  const FALLBACK_CONFERENCES = [
    {
      "id": "cvpr-2026",
      "name": "CVPR 2026",
      "fullName": "IEEE/CVF Conference on Computer Vision and Pattern Recognition",
      "rank": "A*",
      "region": "Quốc tế",
      "format": "in-person",
      "publisher": "IEEE / CVF",
      "indexing": ["Scopus", "DBLP", "IEEE Xplore"],
      "fields": ["computer vision", "deep learning", "multimodal ai", "pattern recognition"],
      "keywords": ["computer vision", "deep learning", "cvpr 2026"],
      "fee": "850 USD",
      "location": "Vancouver, Canada",
      "startDate": "2026-06-14",
      "endDate": "2026-06-19",
      "website": "https://cvpr.thecvf.com/",
      "deadlines": {
        "abstract": "2026-01-08",
        "fullPaper": "2026-01-15",
        "notification": "2026-03-25",
        "cameraReady": "2026-04-18"
      },
      "lastVerified": "2026-03-15",
      "summarization": "CVPR là hội nghị quốc tế uy tín hàng đầu thế giới về thị giác máy tính và nhận dạng mẫu (Computer Vision & Pattern Recognition). Hội nghị quy tụ các nghiên cứu tiên phong về Deep Learning, 3D Vision, Multimodal AI, và Generative Models.",
      "rating": 4.8,
      "rating_count": 142
    },
    {
      "id": "neurips-2026",
      "name": "NeurIPS 2026",
      "fullName": "Conference on Neural Information Processing Systems",
      "rank": "A*",
      "region": "Quốc tế",
      "format": "in-person",
      "publisher": "NeurIPS Foundation",
      "indexing": ["Scopus", "DBLP"],
      "fields": ["machine learning", "deep learning", "ai foundations", "reinforcement learning"],
      "keywords": ["neurips", "machine learning", "deep learning"],
      "fee": "900 USD",
      "location": "Sydney, Australia",
      "startDate": "2026-12-07",
      "endDate": "2026-12-13",
      "website": "https://neurips.cc/",
      "deadlines": {
        "abstract": "2026-05-15",
        "fullPaper": "2026-05-22",
        "notification": "2026-09-20",
        "cameraReady": "2026-10-15"
      },
      "lastVerified": "2026-03-15",
      "summarization": "Hội nghị học máy và khoa học thần kinh tính toán số 1 thế giới, nơi khởi nguồn của các mô hình nền tảng, AI an toàn và thuật toán tối ưu hóa hiện đại.",
      "rating": 4.9,
      "rating_count": 210
    },
    {
      "id": "iclr-2026",
      "name": "ICLR 2026",
      "fullName": "International Conference on Learning Representations",
      "rank": "A*",
      "region": "Quốc tế",
      "format": "hybrid",
      "publisher": "OpenReview / ICLR Foundation",
      "indexing": ["Scopus", "DBLP"],
      "fields": ["representation learning", "deep learning", "generative models", "transformers"],
      "keywords": ["iclr", "representation learning", "deep learning"],
      "fee": "750 USD",
      "location": "Singapore",
      "startDate": "2026-04-26",
      "endDate": "2026-04-30",
      "website": "https://iclr.cc/",
      "deadlines": {
        "abstract": "2025-09-21",
        "fullPaper": "2025-09-28",
        "notification": "2026-01-22",
        "cameraReady": "2026-02-15"
      },
      "lastVerified": "2026-03-15",
      "summarization": "Diễn đàn hàng đầu thế giới về biểu diễn học, mạng nơ-ron sâu và các kiến trúc mô hình ngôn ngữ lớn (Transformers).",
      "rating": 4.8,
      "rating_count": 135
    },
    {
      "id": "acl-2026",
      "name": "ACL 2026",
      "fullName": "Annual Meeting of the Association for Computational Linguistics",
      "rank": "A*",
      "region": "Quốc tế",
      "format": "hybrid",
      "publisher": "ACL",
      "indexing": ["Scopus", "DBLP", "ACL Anthology"],
      "fields": ["nlp", "language models", "computational linguistics", "llm"],
      "keywords": ["nlp", "natural language processing", "llm", "acl"],
      "fee": "780 USD",
      "location": "Vienna, Austria",
      "startDate": "2026-07-05",
      "endDate": "2026-07-10",
      "website": "https://2026.aclweb.org/",
      "deadlines": {
        "abstract": "2026-02-10",
        "fullPaper": "2026-02-18",
        "notification": "2026-05-15",
        "cameraReady": "2026-06-08"
      },
      "lastVerified": "2026-03-15",
      "summarization": "Diễn đàn quốc tế uy tín nhất về xử lý ngôn ngữ tự nhiên, ngôn ngữ học tính toán và các mô hình ngôn ngữ lớn.",
      "rating": 4.7,
      "rating_count": 98
    },
    {
      "id": "atc-2026",
      "name": "ATC 2026",
      "fullName": "International Conference on Advanced Technologies for Communications",
      "rank": "B",
      "region": "Việt Nam",
      "format": "in-person",
      "publisher": "IEEE ComSoc / REV",
      "indexing": ["Scopus", "IEEE Xplore"],
      "fields": ["communications", "wireless networks", "iot", "antenna"],
      "keywords": ["atc", "viễn thông", "wireless", "iot", "việt nam"],
      "fee": "4.500.000 VNĐ",
      "location": "Quy Nhơn, Việt Nam",
      "startDate": "2026-10-15",
      "endDate": "2026-10-17",
      "website": "https://atc-conf.org/",
      "deadlines": {
        "abstract": "2026-05-15",
        "fullPaper": "2026-05-30",
        "notification": "2026-07-30",
        "cameraReady": "2026-08-15"
      },
      "lastVerified": "2026-03-15",
      "summarization": "Hội nghị quốc tế thường niên về công nghệ truyền thông và viễn thông tại Việt Nam do Hội Vô tuyến Điện tử (REV) đồng tổ chức.",
      "rating": 4.2,
      "rating_count": 45
    },
    {
      "id": "soict-2026",
      "name": "SOICT 2026",
      "fullName": "The 15th International Symposium on Information and Communication Technology",
      "rank": "B",
      "region": "Việt Nam",
      "format": "in-person",
      "publisher": "ACM / Springer",
      "indexing": ["Scopus", "DBLP", "ACM Digital Library"],
      "fields": ["ai foundations", "big data", "cyber security", "multimedia"],
      "keywords": ["soict", "hust", "cntt", "cyber security", "việt nam"],
      "fee": "5.000.000 VNĐ",
      "location": "TP. Hồ Chí Minh, Việt Nam",
      "startDate": "2026-12-04",
      "endDate": "2026-12-05",
      "website": "https://soict.org/",
      "deadlines": {
        "abstract": "2026-09-20",
        "fullPaper": "2026-09-25",
        "notification": "2026-10-12",
        "cameraReady": "2026-10-23"
      },
      "lastVerified": "2026-03-15",
      "summarization": "Hội thảo quốc tế về CNTT quy tụ các hướng nghiên cứu hiện đại: Trí tuệ nhân tạo, An ninh mạng, Big Data.",
      "rating": 4.3,
      "rating_count": 52
    },
    {
      "id": "mapr-2026",
      "name": "MAPR 2026",
      "fullName": "International Conference on Multimedia Analysis and Pattern Recognition",
      "rank": "B",
      "region": "Việt Nam",
      "format": "in-person",
      "publisher": "IEEE",
      "indexing": ["Scopus", "IEEE Xplore"],
      "fields": ["multimedia", "pattern recognition", "computer vision", "healthcare ai"],
      "keywords": ["mapr", "uit", "pattern recognition", "multimedia", "đà nẵng"],
      "fee": "4.500.000 VNĐ",
      "location": "Đà Nẵng, Việt Nam",
      "startDate": "2026-10-08",
      "endDate": "2026-10-09",
      "website": "https://mapr.uit.edu.vn/",
      "deadlines": {
        "abstract": "2026-06-01",
        "fullPaper": "2026-06-15",
        "notification": "2026-08-10",
        "cameraReady": "2026-08-25"
      },
      "lastVerified": "2026-03-15",
      "summarization": "Hội nghị quốc tế chuyên sâu về Phân tích Đa phương tiện và Nhận dạng Mẫu do Trường Đại học Công nghệ Thông tin (ĐHQG-HCM) chủ trì.",
      "rating": 4.4,
      "rating_count": 48
    }
  ];

  let currentConference = null;
  let allConferences = [];

  // Helper lấy storage key cho Bookmark theo session người dùng
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

  // Tải dữ liệu hội nghị theo tham số ID
  async function loadConferenceDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const confId = (urlParams.get('id') || 'cvpr-2026').trim();

    // Nạp dữ liệu fallback trước
    const utilsFallback = (window.ConfGuideUtils && window.ConfGuideUtils.FALLBACK_CONFERENCES) || FALLBACK_CONFERENCES;
    allConferences = utilsFallback;

    try {
      const response = await fetch('data/conference_data.json');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          allConferences = data;
        }
      }
    } catch (e) {
      // Khi mở qua file:///, trình duyệt chặn fetch cục bộ -> dùng allConferences từ fallback
      console.info('Giao thức file:/// chặn fetch json, sử dụng bộ dữ liệu dự phòng chuẩn hóa.');
    }

    // Tìm kiếm theo id slug hoặc normalized name
    currentConference = allConferences.find(c => c.id === confId) ||
      allConferences.find(c => c.id === confId.toLowerCase()) ||
      allConferences.find(c => (c.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-') === confId.toLowerCase()) ||
      allConferences[0];

    populateData(currentConference);
    renderRelatedConferences(currentConference);
    setupReviews(currentConference);
    setupSaveButton(currentConference);
    setupUserStarRating(currentConference);
    setupExportAllIcsButton(currentConference);
  }

  // Đổ dữ liệu vào giao diện chi tiết
  function populateData(conf) {
    if (!conf) return;

    const utils = window.ConfGuideUtils || {
      daysLeft: () => null,
      getNextDeadline: () => null,
      getStatus: () => ({ label: 'Đang mở nộp bài', badgeClass: 'status-open' }),
      formatDateVi: (d) => d || '',
      formatRangeVi: (s, e) => s ? `${s} – ${e}` : '',
      getAoETimeRemaining: () => ({ days: 0, hours: 0, minutes: 0, seconds: 0, isPassed: true }),
      getGoogleCalendarUrl: () => '#',
      createIcsContent: () => '',
      downloadIcsFile: () => {},
      MILESTONE_DEFINITIONS: [
        { key: 'abstract', name: 'Tóm tắt (Abstract)', shortName: 'Nộp Abstract' },
        { key: 'fullPaper', name: 'Bài hoàn chỉnh (Full paper)', shortName: 'Nộp Full Paper' },
        { key: 'notification', name: 'Thông báo kết quả (Notification)', shortName: 'Thông báo' },
        { key: 'cameraReady', name: 'Bản in hoàn thiện (Camera-ready)', shortName: 'Camera-Ready' }
      ]
    };

    document.title = `${conf.name} - ConfGuide`;

    // 1. Navigation Bar: Status & Rank Badges
    const statusObj = utils.getStatus(conf);
    const statusBadge = document.getElementById('detailStatusBadge');
    if (statusBadge) {
      statusBadge.textContent = statusObj.label;
      statusBadge.className = `status-badge ${statusObj.badgeClass}`;
    }

    const rankBadge = document.getElementById('detailRankBadge');
    if (rankBadge) {
      rankBadge.textContent = `Rank ${conf.rank || 'A*'}`;
    }

    // 2. Hero Content
    const regionPill = document.getElementById('detailRegionPill');
    if (regionPill) regionPill.textContent = conf.region || 'Quốc tế';

    const titleEl = document.getElementById('detailTitle');
    if (titleEl) titleEl.textContent = conf.name;

    const fullEl = document.getElementById('detailFullName');
    if (fullEl) fullEl.textContent = conf.fullName || conf.full_name || conf.name;

    const descEl = document.getElementById('detailDesc');
    if (descEl) descEl.textContent = conf.summarization || 'Hội nghị khoa học uy tín dành cho cộng đồng nghiên cứu.';

    const tagsContainer = document.getElementById('detailTags');
    if (tagsContainer) {
      const tags = conf.fields || conf.tags || ['Khoa học máy tính'];
      tagsContainer.innerHTML = tags.map(t => `<span class="tag">${t}</span>`).join('');
    }

    // Hero Meta Grid
    const locEl = document.getElementById('detailLocation');
    if (locEl) locEl.textContent = conf.location || 'Chưa cập nhật';

    const dateEl = document.getElementById('detailDate');
    if (dateEl) {
      dateEl.textContent = utils.formatRangeVi(conf.startDate, conf.endDate) || conf.date_happen || 'Năm 2026';
    }

    const fmtMap = {
      'in-person': 'Trực tiếp (In-person)',
      'online': 'Trực tuyến (Online)',
      'hybrid': 'Kết hợp (Hybrid)'
    };
    const formatEl = document.getElementById('detailFormat');
    if (formatEl) formatEl.textContent = fmtMap[conf.format] || conf.mode || 'Trực tiếp';

    const feeEl = document.getElementById('detailFee');
    if (feeEl) feeEl.textContent = conf.fee || 'Đang cập nhật';

    // 3. Hero Countdown Card (Right Side)
    const nextMilestone = utils.getNextDeadline(conf);
    const nextNameEl = document.getElementById('detailNextMilestoneName');
    const countdownDaysEl = document.getElementById('detailCountdownDays');
    const deadlineExactEl = document.getElementById('detailDeadlineExact');
    const liveTickerText = document.getElementById('heroLiveTickerText');
    const btnCalGoogle = document.getElementById('btnCalGoogle');
    const btnCalIcs = document.getElementById('btnCalIcs');

    if (nextMilestone && !nextMilestone.isPassed) {
      if (nextNameEl) nextNameEl.textContent = nextMilestone.name;
      const leftDays = utils.daysLeft(nextMilestone.date);
      if (countdownDaysEl) {
        countdownDaysEl.textContent = `Còn ${Math.max(0, leftDays)} ngày`;
      }
      if (deadlineExactEl) {
        deadlineExactEl.textContent = `${utils.formatDateVi(nextMilestone.date)} (AoE 23:59)`;
      }

      // Live Ticker
      const updateTicker = () => {
        const rem = utils.getAoETimeRemaining(nextMilestone.date);
        if (liveTickerText && rem) {
          liveTickerText.textContent = `${rem.days} ngày ${rem.hours}h ${rem.minutes}m ${rem.seconds}s`;
        }
      };
      updateTicker();
      if (window._heroTickerInterval) clearInterval(window._heroTickerInterval);
      window._heroTickerInterval = setInterval(updateTicker, 1000);

      // Thêm vào Google Calendar & Tải .ics cho mốc tiếp theo
      if (btnCalGoogle) {
        btnCalGoogle.onclick = function () {
          const calTitle = `[ConfGuide] ${conf.name} - Hạn ${nextMilestone.shortName}`;
          const calDesc = `Hạn nộp ${nextMilestone.name} cho hội nghị ${conf.fullName || conf.name} theo chuẩn múi giờ AoE (UTC-12).\\nWebsite: ${conf.website || conf.website_url || ''}`;
          const calUrl = utils.getGoogleCalendarUrl(calTitle, calDesc, conf.location, nextMilestone.date);
          window.open(calUrl, '_blank');
        };
      }

      if (btnCalIcs) {
        btnCalIcs.onclick = function () {
          const calTitle = `[ConfGuide] ${conf.name} - Hạn ${nextMilestone.shortName}`;
          const calDesc = `Hạn nộp ${nextMilestone.name} cho hội nghị ${conf.fullName || conf.name} (AoE UTC-12). Website: ${conf.website || conf.website_url || ''}`;
          const icsContent = utils.createIcsContent([{
            title: calTitle,
            description: calDesc,
            location: conf.location,
            date: nextMilestone.date
          }]);
          utils.downloadIcsFile(`${conf.id}-${nextMilestone.key}.ics`, icsContent);
        };
      }
    } else if (nextMilestone && nextMilestone.isPassed) {
      if (nextNameEl) nextNameEl.textContent = 'Đã hết hạn nộp bài';
      if (countdownDaysEl) countdownDaysEl.textContent = 'Đã đóng đợt nộp';
      if (deadlineExactEl) deadlineExactEl.textContent = 'Hội nghị đã hoàn thành nhận bài';
      if (liveTickerText) liveTickerText.textContent = 'Đã kết thúc nhận bài';
      if (btnCalGoogle) btnCalGoogle.style.display = 'none';
      if (btnCalIcs) btnCalIcs.style.display = 'none';
    } else {
      if (nextNameEl) nextNameEl.textContent = 'Đang cập nhật mốc';
      if (countdownDaysEl) countdownDaysEl.textContent = 'Chưa công bố';
      if (deadlineExactEl) deadlineExactEl.textContent = 'Ban tổ chức chưa công bố ngày cụ thể';
      if (liveTickerText) liveTickerText.textContent = 'Chưa có mốc thời gian';
      if (btnCalGoogle) btnCalGoogle.style.display = 'none';
      if (btnCalIcs) btnCalIcs.style.display = 'none';
    }

    // 4. Render 4-Milestone Timeline
    renderTimeline(conf);

    // 5. Overview Description Card
    const overviewEl = document.getElementById('detailOverviewText');
    if (overviewEl) {
      overviewEl.innerHTML = `
        <p>${conf.summarization || conf.fullName || conf.full_name || 'Hội nghị khoa học uy tín.'}</p>
        <p>Hội nghị được tổ chức tại <strong>${conf.location || 'địa điểm cập nhật'}</strong>, quy tụ các nhà khoa học, giảng viên và sinh viên nghiên cứu hàng đầu. Diễn đàn thảo luận về các công trình nghiên cứu tiên tiến, tạo cơ hội hợp tác và công bố quốc tế.</p>
      `;
    }

    // Specifications
    const infoLoc = document.getElementById('infoLocation');
    if (infoLoc) infoLoc.textContent = conf.location || 'Chưa cập nhật';

    const infoFormat = document.getElementById('infoFormat');
    if (infoFormat) infoFormat.textContent = fmtMap[conf.format] || conf.mode || 'Trực tiếp';

    const infoRegion = document.getElementById('infoRegion');
    if (infoRegion) infoRegion.textContent = conf.region || 'Quốc tế';

    const infoDate = document.getElementById('infoDate');
    if (infoDate) infoDate.textContent = utils.formatRangeVi(conf.startDate, conf.endDate) || conf.date_happen || 'Năm 2026';

    const infoPub = document.getElementById('infoPublisher');
    if (infoPub) infoPub.textContent = conf.publisher || 'IEEE / ACM / Springer';

    const infoIndexing = document.getElementById('infoIndexing');
    if (infoIndexing) {
      const idxList = conf.indexing || ['Scopus', 'DBLP'];
      infoIndexing.textContent = Array.isArray(idxList) ? idxList.join(', ') : idxList;
    }

    const infoFee = document.getElementById('infoFee');
    if (infoFee) infoFee.textContent = conf.fee || 'Miễn phí';

    const infoFields = document.getElementById('infoFields');
    if (infoFields) infoFields.textContent = (conf.fields || []).join(', ');

    const infoRank = document.getElementById('infoRank');
    if (infoRank) infoRank.textContent = conf.rank || 'A*';

    const infoVerified = document.getElementById('infoVerified');
    if (infoVerified) infoVerified.textContent = utils.formatDateVi(conf.lastVerified || '2026-03-15');

    const infoDeadlines = document.getElementById('infoDeadlines');
    if (infoDeadlines && conf.deadlines) {
      if (typeof conf.deadlines === 'object' && !Array.isArray(conf.deadlines)) {
        infoDeadlines.innerHTML = utils.MILESTONE_DEFINITIONS.map(m => {
          const dVal = conf.deadlines[m.key];
          return dVal ? `<div style="margin-bottom: 4px;"><strong>${m.name}:</strong> ${utils.formatDateVi(dVal)} (AoE)</div>` : '';
        }).filter(Boolean).join('');
      } else if (Array.isArray(conf.deadlines)) {
        infoDeadlines.innerHTML = conf.deadlines.map(d => `
          <div style="margin-bottom: 4px;"><strong>${d.name}:</strong> ${utils.formatDateVi(d.date)}</div>
        `).join('');
      }
    }

    // Official Web link
    const webBtn = document.getElementById('webBtn');
    if (webBtn) {
      const targetWeb = conf.website || conf.website_url || '#';
      webBtn.href = targetWeb;
      if (!conf.website && !conf.website_url) {
        webBtn.style.opacity = '0.5';
        webBtn.style.pointerEvents = 'none';
      }
    }

    // Community Ratings
    const avgScoreEl = document.getElementById('avgScore');
    if (avgScoreEl) avgScoreEl.textContent = conf.rating ? Number(conf.rating).toFixed(1) : '—';

    const countTextEl = document.getElementById('reviewsCountText');
    if (countTextEl) countTextEl.textContent = conf.rating_count ? `Số liệu tham khảo trong dữ liệu (${conf.rating_count})` : 'Chưa có dữ liệu tổng hợp';

    if (conf.rating) renderStarScore(conf.rating);
    else {
      const starBox = document.getElementById('headerStars');
      if (starBox) starBox.replaceChildren();
    }
  }

  // Render Tiến trình 4 mốc Timeline chuẩn AoE
  function renderTimeline(conf) {
    const track = document.getElementById('timelineTrack');
    if (!track || !conf) return;

    const utils = window.ConfGuideUtils;
    const deadlines = conf.deadlines || {};
    const next = utils.getNextDeadline(conf);

    track.innerHTML = utils.MILESTONE_DEFINITIONS.map((m, idx) => {
      const dateVal = deadlines[m.key];
      const left = dateVal ? utils.daysLeft(dateVal) : null;
      const isPassed = left !== null && left < 0;
      const isActive = next && next.key === m.key && !next.isPassed;

      let stepClass = 'timeline-step';
      let statusText = '';
      let countdownLive = '';
      let addCalBtn = '';

      if (!dateVal) {
        stepClass += ' step-upcoming';
        statusText = 'Không áp dụng';
      } else if (isPassed) {
        stepClass += ' step-passed';
        statusText = `Đã qua (${utils.formatDateVi(dateVal)})`;
      } else if (isActive) {
        stepClass += ' step-active';
        const timeParts = utils.getAoETimeRemaining(dateVal);
        statusText = `Còn ${left} ngày`;
        countdownLive = `
          <div class="live-clock" id="liveClock-${m.key}" style="font-size: 11.5px; color: var(--primary); font-weight: 700; margin-top: 6px;">
            Đếm ngược: ${timeParts.days}d ${timeParts.hours}h ${timeParts.minutes}m ${timeParts.seconds}s
          </div>
        `;
        addCalBtn = `
          <button type="button" class="step-cal-mini-btn" data-mkey="${m.key}" title="Thêm mốc này vào Google Calendar">
            + Thêm vào lịch
          </button>
        `;
      } else {
        stepClass += ' step-upcoming';
        statusText = `Còn ${left} ngày`;
        addCalBtn = `
          <button type="button" class="step-cal-mini-btn" data-mkey="${m.key}" title="Thêm mốc này vào Google Calendar">
            + Thêm vào lịch
          </button>
        `;
      }

      return `
        <div class="${stepClass}">
          <div class="step-badge-num">${isPassed ? '✓' : (idx + 1)}</div>
          <div class="step-name">${m.name}</div>
          <div class="step-date">${dateVal ? utils.formatDateVi(dateVal) + ' (AoE)' : 'Chưa công bố'}</div>
          <div class="step-status-tag">${statusText}</div>
          ${countdownLive}
          ${addCalBtn}
        </div>
      `;
    }).join('');

    // Gắn sự kiện thêm vào lịch cho các nút con trong timeline
    track.querySelectorAll('.step-cal-mini-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        const mkey = this.getAttribute('data-mkey');
        const mDef = utils.MILESTONE_DEFINITIONS.find(m => m.key === mkey);
        const mDate = deadlines[mkey];
        if (mDef && mDate) {
          const calTitle = `[ConfGuide] ${conf.name} - Hạn ${mDef.shortName}`;
          const calDesc = `Hạn nộp ${mDef.name} cho hội nghị ${conf.fullName || conf.name} (AoE UTC-12).\\nWebsite: ${conf.website || conf.website_url || ''}`;
          const calUrl = utils.getGoogleCalendarUrl(calTitle, calDesc, conf.location, mDate);
          window.open(calUrl, '_blank');
        }
      });
    });

    // Thiết lập Interval cập nhật thời gian thực cho step active
    if (window._timelineInterval) clearInterval(window._timelineInterval);
    if (next && !next.isPassed && deadlines[next.key]) {
      const targetDate = deadlines[next.key];
      window._timelineInterval = setInterval(() => {
        const clockEl = document.getElementById(`liveClock-${next.key}`);
        const rem = utils.getAoETimeRemaining(targetDate);
        if (clockEl && rem) {
          clockEl.textContent = `Đếm ngược: ${rem.days}d ${rem.hours}h ${rem.minutes}m ${rem.seconds}s`;
        }
      }, 1000);
    }
  }

  // Render các ngôi sao hiển thị điểm số
  function renderStarScore(score) {
    const starBox = document.getElementById('headerStars');
    if (!starBox) return;

    let html = '';
    for (let i = 1; i <= 5; i++) {
      const isLit = i <= Math.round(score);
      html += `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="${isLit ? 'var(--gold)' : 'none'}" stroke="var(--gold)" stroke-width="1.5">
          <path d="${STAR_PATH}"/>
        </svg>
      `;
    }
    starBox.innerHTML = html;
  }

  // Setup nút Lưu hội nghị (Bookmark)
  function setupSaveButton(conf) {
    const saveBtn = document.getElementById('saveBtn');
    const saveText = document.getElementById('saveText');
    if (!saveBtn || !saveText) return;

    const confId = conf.id || 'conf';
    let savedList = getSavedList();
    const isSaved = savedList.includes(confId);

    updateSaveUi(isSaved);

    saveBtn.onclick = function () {
      let currentList = getSavedList();
      const nowSaved = currentList.includes(confId);
      if (nowSaved) {
        currentList = currentList.filter(id => id !== confId);
        setSavedList(currentList);
        updateSaveUi(false);
      } else {
        currentList.push(confId);
        setSavedList(currentList);
        updateSaveUi(true);
      }
    };

    function updateSaveUi(saved) {
      saveBtn.classList.toggle('on', saved);
      saveBtn.setAttribute('aria-pressed', saved);
      saveText.textContent = saved ? 'Đã lưu hội nghị' : 'Lưu hội nghị này';
      const svg = saveBtn.querySelector ? saveBtn.querySelector('svg') : null;
      if (svg) svg.setAttribute('fill', saved ? 'var(--gold)' : 'none');
    }
  }

  // Setup Xuất toàn bộ 4 mốc lịch ra file .ics
  function setupExportAllIcsButton(conf) {
    const btn = document.getElementById('btnExportAllIcs');
    if (!btn || !conf) return;

    btn.onclick = function () {
      const utils = window.ConfGuideUtils;
      if (!utils || !utils.createIcsContent || !utils.downloadIcsFile) return;

      const deadlines = conf.deadlines || {};
      const events = [];

      utils.MILESTONE_DEFINITIONS.forEach(m => {
        const dVal = deadlines[m.key];
        if (dVal) {
          events.push({
            title: `[ConfGuide] ${conf.name} - ${m.name}`,
            description: `Hạn mốc ${m.name} của hội nghị ${conf.fullName || conf.name} theo chuẩn AoE.\\nWebsite: ${conf.website || conf.website_url || ''}`,
            location: conf.location || '',
            date: dVal
          });
        }
      });

      if (events.length === 0) {
        alert('Hội nghị này chưa có mốc thời gian cụ thể để xuất lịch.');
        return;
      }

      const icsContent = utils.createIcsContent(events);
      utils.downloadIcsFile(`${conf.id}-all-deadlines.ics`, icsContent);
    };
  }

  // Setup hệ thống chấm sao người dùng
  function setupUserStarRating(conf) {
    const starsBox = document.getElementById('stars');
    const rateMsg = document.getElementById('rateMsg');
    if (!starsBox || !rateMsg) return;

    starsBox.innerHTML = '';
    const userRatingKey = `confguide_rating_${conf.id}`;
    let userRating = 0;
    try { userRating = Number(localStorage.getItem(userRatingKey)) || 0; } catch (_) {}

    for (let i = 1; i <= 5; i++) {
      const b = document.createElement('button');
      b.className = 'star-btn';
      b.setAttribute('aria-label', `${i} sao`);
      b.innerHTML = `<svg viewBox="0 0 24 24"><path d="${STAR_PATH}"/></svg><span>${i}</span>`;
      
      b.addEventListener('mouseenter', () => paint(i));
      b.addEventListener('click', () => {
        userRating = (userRating === i) ? 0 : i;
        try { localStorage.setItem(userRatingKey, userRating); } catch (_) {}
        paint(userRating);
        rateMsg.textContent = userRating ? `Bạn đã chấm ${userRating}/5 sao. Cảm ơn bạn!` : '';
      });
      starsBox.appendChild(b);
    }

    starsBox.addEventListener('mouseleave', () => paint(userRating));

    function paint(n) {
      [...starsBox.children].forEach((btn, idx) => {
        btn.classList.toggle('lit', idx < n);
      });
    }

    paint(userRating);
    if (userRating) rateMsg.textContent = `Bạn đã chấm ${userRating}/5 sao.`;
  }

  // Render Hội nghị liên quan
  function renderRelatedConferences(current) {
    const grid = document.getElementById('relGrid');
    if (!grid) return;

    const utils = window.ConfGuideUtils;
    const relatedList = allConferences.filter(c => c.id !== current.id).slice(0, 3);

    grid.innerHTML = relatedList.map(item => {
      const nextDl = utils ? utils.getNextDeadline(item) : null;
      let daysText = 'Sắp tới';
      if (nextDl) {
        daysText = nextDl.isPassed ? 'Đã đóng' : `Còn ${Math.max(0, nextDl.daysLeft)}d`;
      }
      const tags = (item.fields || ['AI']).slice(0, 2);
      const rankBadge = item.rank || 'A*';

      return `
        <article class="rc" data-id="${item.id}">
          <div class="thumb">
            <b>${item.name.replace(' ', '<br>')}</b>
          </div>
          <div class="body">
            <h5>${item.name}</h5>
            <div class="full" title="${item.fullName || item.name}">${item.fullName || item.name}</div>
            <div class="tg">${tags.map(t => `<span>${t}</span>`).join('')}</div>
            <div class="bottom">
              <a href="detail.html?id=${item.id}" class="save-sm">
                Xem chi tiết &rarr;
              </a>
              <span class="rank">${rankBadge}</span>
            </div>
          </div>
          <span class="days">${daysText}</span>
        </article>
      `;
    }).join('');
  }

  // Điều hướng và trang Review
  function setupReviews(conf) {
    const viewDetail = document.getElementById('viewDetail');
    const viewReviews = document.getElementById('viewReviews');
    const openBox = document.getElementById('openReviews');
    const backBtn = document.getElementById('backBtn');
    const backToDetailBtn = document.getElementById('backToDetailBtn');

    if (!viewDetail || !viewReviews || !openBox || !backBtn) return;

    function route() {
      const isRv = location.hash === '#danh-gia';
      viewDetail.hidden = isRv;
      viewReviews.hidden = !isRv;
      window.scrollTo(0, 0);
    }

    window.addEventListener('hashchange', route);

    openBox.addEventListener('click', () => {
      location.hash = '#danh-gia';
    });

    openBox.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        location.hash = '#danh-gia';
      }
    });

    if (backToDetailBtn) {
      backToDetailBtn.addEventListener('click', () => {
        location.hash = '';
      });
    }

    // Nút Back thông minh (hoạt động tốt trên cả file:///)
    backBtn.addEventListener('click', () => {
      if (location.hash === '#danh-gia') {
        location.hash = '';
      } else if (window.history.length > 1 && (document.referrer || window.history.state !== null)) {
        window.history.back();
      } else {
        window.location.assign('search.html');
      }
    });

    // Render nội dung trang review
    const rvPageTitle = document.getElementById('rvPageTitle');
    if (rvPageTitle) rvPageTitle.textContent = `Nhận xét hội nghị · ${conf.name}`;

    renderReviewsList(conf);
    const reviewForm = document.getElementById('reviewForm');
    const reviewText = document.getElementById('reviewText');
    const message = document.getElementById('reviewFormMessage');
    if (reviewForm && reviewText) reviewForm.addEventListener('submit', event => {
      event.preventDefault();
      const text = reviewText.value.trim();
      if (!text) { reviewText.focus(); return; }
      const key = `confguide_reviews_${conf.id}`;
      try {
        const saved = JSON.parse(localStorage.getItem(key) || '[]');
        const user = window.ConfGuideLayout?.getCurrentUser?.();
        saved.unshift({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, author: user?.name || user?.username || 'Người dùng ConfGuide', text, createdAt: new Date().toISOString() });
        localStorage.setItem(key, JSON.stringify(saved));
        reviewText.value = '';
        if (message) message.textContent = 'Đã lưu nhận xét trên trình duyệt này.';
        renderReviewsList(conf);
      } catch (_) {
        if (message) message.textContent = 'Không thể lưu nhận xét. Vui lòng kiểm tra bộ nhớ trình duyệt.';
      }
    });
  }

  function renderReviewsList(conf) {
    const rvList = document.getElementById('rvList');
    const rvStars = document.getElementById('rvStars');
    if (!rvList) return;

    // Stars lớn
    if (rvStars) {
      rvStars.innerHTML = [1, 2, 3, 4, 5].map(i => `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--gold)"><path d="${STAR_PATH}"/></svg>
      `).join('');
    }

    const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    let reviews = [];
    try { const parsed = JSON.parse(localStorage.getItem(`confguide_reviews_${conf.id}`) || '[]'); reviews = Array.isArray(parsed) ? parsed : []; } catch (_) {}
    const rvAvg = document.getElementById('rvAvg');
    const rvTotal = document.getElementById('rvTotal');
    const rvBars = document.getElementById('rvBars');
    if (rvAvg) rvAvg.textContent = conf.rating ? Number(conf.rating).toFixed(1) : '—';
    if (rvTotal) rvTotal.textContent = `${reviews.length} nhận xét trên trình duyệt này`;
    if (rvBars) rvBars.textContent = 'Điểm tham khảo từ dữ liệu hội nghị; nhận xét bên dưới chỉ lưu cục bộ.';
    rvList.innerHTML = reviews.length ? reviews.map(item => `
      <article class="card rv-card">
        <strong>${escape(item.author || 'Người dùng ConfGuide')}</strong>
        <small>${escape(item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '')}</small>
        <p>${escape(item.text)}</p>
      </article>`).join('') : '<p class="card rv-card">Chưa có nhận xét nào được lưu trên trình duyệt này. Bạn có thể gửi nhận xét đầu tiên.</p>';
  }

  // Khởi chạy khi DOM sẵn sàng
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadConferenceDetail);
  } else {
    loadConferenceDetail();
  }
})();
