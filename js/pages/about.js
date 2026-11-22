/**
 * ConfGuide — Trang Giới thiệu Dự án & Đề xuất Hội nghị (js/pages/about.js)
 * Tải nội dung giới thiệu từ data/about.json (kèm fallback khi mở offline file:///),
 * render 6 khu vực thông tin học thuật và quản lý modal Đề xuất hội nghị mới.
 */

(function () {
  'use strict';

  const utils = window.ConfGuideUtils || {};

  /** Mục định hướng thiết kế tương lai bổ sung vào lộ trình trang About */
  const LIQUID_GLASS_ROADMAP_FEATURE =
    'Thiết kế lại giao diện theo phong cách Liquid Glass (hiệu ứng kính lỏng kiểu iOS 26)';

  // Dữ liệu dự phòng tương thích với data/about.json khi chạy offline hoặc file:///
  const FALLBACK_ABOUT_DATA = {
    hero: {
      eyebrow: 'VỀ CHÚNG TÔI',
      title: 'Nền tảng Tra cứu & Khuyến nghị Hội nghị Khoa học CNTT tại Việt Nam',
      description: 'ConfGuide được nghiên cứu và phát triển nhằm hỗ trợ sinh viên, giảng viên và các nhóm nghiên cứu dễ dàng tra cứu, đối chiếu uy tín và quản lý các mốc thời hạn công bố tại các hội nghị khoa học Công nghệ thông tin diễn ra tại Việt Nam (bao gồm cả hội nghị quốc tế tổ chức tại Việt Nam). Hệ thống giải quyết các rào cản phổ biến trong tiếp cận thông tin học thuật, hướng tới trở thành công cụ hỗ trợ tin cậy cho cộng đồng nghiên cứu.',
      contextTitle: 'Bối cảnh thực tế & Sứ mệnh',
      contextChallenges: [
        {
          title: 'Thông tin phân tán',
          desc: 'Các thông báo kêu gọi nộp bài (Call for Papers) nằm rải rác trên nhiều website ban tổ chức và diễn đàn khác nhau, gây mất nhiều thời gian thu thập và đối chiếu.'
        },
        {
          title: 'Khó đối chiếu phân hạng',
          desc: 'Các tiêu chuẩn phân hạng học thuật (như CORE Rankings, Scopus) chưa được tổng hợp tập trung, khiến người làm nghiên cứu khó đánh giá độ phù hợp của diễn đàn.'
        },
        {
          title: 'Lệch chuẩn múi giờ nộp bài',
          desc: 'Thời hạn nộp bài thường công bố theo múi giờ Anywhere on Earth (AoE, UTC-12), nếu không quy đổi sang giờ Việt Nam (UTC+7) rất dễ gây sai sót và lỡ hẹn nộp bài.'
        }
      ],
      mission: 'Sứ mệnh của ConfGuide là chuẩn hóa, quy tụ và minh bạch hóa thông tin các hội nghị khoa học Công nghệ thông tin diễn ra tại Việt Nam (bao gồm cả hội nghị quốc tế được tổ chức tại Việt Nam) trên một nền tảng thống nhất, hỗ trợ sinh viên và nghiên cứu sinh chủ động lộ trình công bố.'
    },
    coreValues: [
      {
        id: 'ranking',
        icon: 'award',
        title: 'Chuẩn hóa phân hạng học thuật',
        description: 'Đối chiếu trực quan các bảng xếp hạng học thuật uy tín gồm CORE Rankings (từ hạng A* đến C) và phân loại Scopus (Q1 đến Q4), hỗ trợ người nghiên cứu định vị chính xác chất lượng học thuật của từng hội nghị.'
      },
      {
        id: 'deadline',
        icon: 'clock',
        title: 'Đếm ngược Deadline theo giờ Việt Nam (UTC+7)',
        description: 'Tự động đồng bộ và quy đổi thời hạn từ mốc 23:59 Anywhere on Earth (AoE, UTC-12) sang 18:59 ngày kế tiếp theo giờ Việt Nam (UTC+7), đi kèm đồng hồ đếm ngược thời gian thực giúp quản lý tiến độ nộp bài.'
      },
      {
        id: 'filter',
        icon: 'filter',
        title: 'Bộ lọc đa tiêu chí theo tiểu ngành CNTT',
        description: 'Hệ thống lọc thông minh theo chuyên ngành hẹp như Trí tuệ nhân tạo, Thị giác máy tính, Xử lý ngôn ngữ tự nhiên, Khoa học dữ liệu, An toàn thông tin và Kỹ thuật phần mềm.'
      }
    ],
    transparencyAndTech: {
      dataSources: {
        title: 'Nguồn dữ liệu',
        updateFrequency: 'Định kỳ hàng tháng và kiểm tra cập nhật trước mỗi kỳ Call for Papers',
        sources: [
          {
            name: 'CORE (Computing Research & Education)',
            purpose: 'Chuẩn hóa phân hạng học thuật uy tín (A*, A, B, C) dành riêng cho các hội nghị Khoa học Máy tính.'
          },
          {
            name: 'DBLP Computer Science Bibliography',
            purpose: 'Tra cứu thông tin xuất bản, kỷ yếu (proceedings) và lịch sử lưu trữ các kỳ hội nghị đã tổ chức.'
          },
          {
            name: 'WikiCFP',
            purpose: 'Theo dõi thông tin kêu gọi nộp bài (Call for Papers) và các mốc deadline quan trọng từ cộng đồng học thuật.'
          },
          {
            name: 'Scopus (Elsevier)',
            purpose: 'Đối chiếu chỉ mục trích dẫn học thuật và phân nhóm phân hạng ấn phẩm khoa học.'
          }
        ]
      },
      techStack: {
        title: 'Công nghệ phát triển',
        items: [
          {
            name: 'Semantic HTML5',
            purpose: 'Xây dựng cấu trúc tài liệu ngữ nghĩa chuẩn mực, nâng cao trải nghiệm người dùng và đáp ứng tiêu chuẩn tiếp cận WCAG AA.'
          },
          {
            name: 'CSS3 Grid & Flexbox',
            purpose: 'Bố cục lưới đa chiều responsive mượt mà, phân bổ màu theo quy tắc 60:30:10 và hỗ trợ Dark Mode tự nhiên qua CSS Variables.'
          },
          {
            name: 'ES6+ JavaScript',
            purpose: 'Xử lý logic tương tác, bộ lọc đa điều kiện, đếm ngược thời gian thực và quản lý dữ liệu hiệu năng cao với kiến trúc Zero-build.'
          },
          {
            name: 'REST API Architecture',
            purpose: 'Thiết kế cấu trúc dữ liệu JSON module hóa, sẵn sàng mở rộng và kết nối với các dịch vụ máy chủ tương lai.'
          }
        ]
      }
    },
    teamAndAdvisor: {
      advisor: {
        name: 'ThS. Võ Tấn Khoa',
        unit: 'Khoa Khoa học và Kỹ thuật Thông tin',
        organization: 'Trường Đại học Công nghệ Thông tin (ĐHQG-HCM)',
        role: 'Cố vấn chuyên môn'
      },
      members: [
        { name: 'Nguyễn Tài', role: 'Thành viên phát triển', mssv: '24521566' },
        { name: 'Lê Hữu Thắng', role: 'Thành viên phát triển', mssv: '24521566' },
        { name: 'Dương Nhất Tâm', role: 'Thành viên phát triển', mssv: '24521566' },
        { name: 'Nguyễn Chí Nhân', role: 'Thành viên phát triển', mssv: '24521566' },
        { name: 'Nguyễn Nhã Quân', role: 'Thành viên phát triển', mssv: '24521566' }
      ]
    },
    roadmap: {
      title: 'Lộ trình phát triển',
      milestones: [
        {
          id: 'current',
          badge: 'Hiện tại',
          title: 'MVP môn học IE104',
          status: 'active',
          features: [
            'Tra cứu đa chiều với bộ lọc Accordion theo Rank, Địa điểm, Hình thức và Lĩnh vực',
            'Đồng bộ liên kết tra cứu hai chiều qua URL Query Parameters',
            'Theo dõi tiến độ nộp bài và đếm ngược deadline thời gian thực theo múi giờ UTC+7 (giờ Việt Nam)',
            'Lưu trữ danh sách hội nghị quan tâm theo tài khoản cá nhân'
          ]
        },
        {
          id: 'future',
          badge: 'Tương lai',
          title: 'Mở rộng tính năng thông minh',
          status: 'planned',
          features: [
            'Khuyến nghị hội nghị bằng AI dựa trên nội dung tóm tắt (Abstract) của bài báo',
            'Đồng bộ tự động các mốc deadline vào Google Calendar và Outlook',
            'Thông báo đẩy (Push Notifications) khi ban tổ chức công bố đợt nhận bài mới',
            LIQUID_GLASS_ROADMAP_FEATURE
          ]
        }
      ]
    },
    community: {
      title: 'Mã nguồn & Đóng góp cộng đồng',
      callToAction: 'ConfGuide là một dự án học thuật mở. Chúng tôi luôn trân trọng mọi đóng góp về mã nguồn, đề xuất cải tiến trải nghiệm và thông tin các hội nghị khoa học mới từ cộng đồng nghiên cứu.',
      githubRepoUrl: '#',
      githubLabel: 'GitHub Repository',
      proposeLabel: 'Đề xuất hội nghị mới'
    }
  };

  /**
   * Tạo thẻ SVG nội tuyến chuẩn hóa thuộc tính nét vẽ và `aria-hidden="true"`.
   * @param {number} size - Kích thước chiều rộng/cao (px).
   * @param {string} body - Nội dung các thẻ hình học bên trong `<svg>`.
   * @param {number} [strokeWidth=2] - Độ dày nét vẽ.
   * @returns {string} Chuỗi HTML phần tử `<svg>`.
   */
  function svgIcon(size, body, strokeWidth = 2) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" `
      + `stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" `
      + `stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  }

  // Biểu tượng SVG nội tuyến dùng chung
  const ICONS = {
    award: svgIcon(
      24,
      '<circle cx="12" cy="8" r="7"></circle>'
        + '<polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>'
    ),
    clock: svgIcon(
      24,
      '<circle cx="12" cy="12" r="10"></circle>'
        + '<polyline points="12 6 12 12 16 14"></polyline>'
    ),
    filter: svgIcon(24, '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>'),
    check: svgIcon(18, '<polyline points="20 6 9 17 4 12"></polyline>', 2.5),
    database: svgIcon(
      20,
      '<ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>'
        + '<path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>'
        + '<path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>'
    ),
    code: svgIcon(
      20,
      '<polyline points="16 18 22 12 16 6"></polyline>'
        + '<polyline points="8 6 2 12 8 18"></polyline>'
    ),
    advisor: svgIcon(
      28,
      '<path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>'
        + '<path d="M6 12v5c3 3 9 3 12 0v-5"></path>'
    ),
    idCard: svgIcon(
      14,
      '<rect x="3" y="4" width="18" height="16" rx="2"></rect>'
        + '<circle cx="9" cy="10" r="2"></circle>'
        + '<line x1="15" y1="8" x2="17" y2="8"></line>'
        + '<line x1="15" y1="12" x2="17" y2="12"></line>'
        + '<line x1="7" y1="16" x2="17" y2="16"></line>'
    ),
    info: svgIcon(
      18,
      '<circle cx="12" cy="12" r="10"></circle>'
        + '<line x1="12" y1="16" x2="12" y2="12"></line>'
        + '<line x1="12" y1="8" x2="12.01" y2="8"></line>'
    )
  };

  /** Thoát ký tự HTML đặc biệt (tái sử dụng ConfGuideUtils.escapeHtml). */
  function escapeHtml(str) {
    if (typeof utils.escapeHtml === 'function') return utils.escapeHtml(str);
    const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(str || '').replace(/[&<>"']/g, ch => entities[ch]);
  }

  /** Đọc JSON từ localStorage an toàn (tái sử dụng ConfGuideUtils.readStorage). */
  function readStorage(key, fallback) {
    if (typeof utils.readStorage === 'function') return utils.readStorage(key, fallback);
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
  }

  /** Ghi JSON vào localStorage an toàn (tái sử dụng ConfGuideUtils.writeStorage). */
  function writeStorage(key, value) {
    if (typeof utils.writeStorage === 'function') return utils.writeStorage(key, value);
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
  }

  /**
   * Sinh ký tự viết tắt (Monogram initials) từ Họ tên tiếng Việt.
   * @param {string} fullName - Họ và tên đầy đủ.
   * @returns {string} Hai chữ cái đầu viết hoa.
   */
  function getInitials(fullName) {
    if (!fullName) return 'U';
    const parts = String(fullName).trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /**
   * Chuẩn hóa chuỗi văn bản từ data/about.json trong bộ nhớ RAM (không sửa file JSON gốc)
   * để đồng bộ định hướng hội nghị CNTT tại Việt Nam (gồm cả hội nghị quốc tế tổ chức tại Việt Nam)
   * và nhãn múi giờ UTC+7 (giờ Việt Nam).
   * @param {string} text - Chuỗi văn bản đầu vào.
   * @returns {string} Chuỗi văn bản đã chuẩn hóa theo định hướng dự án.
   */
  const ABOUT_HERO_DESC_OLD_RE = new RegExp(
    'quản lý các mốc thời hạn công bố khoa học\\. Hệ thống giải quyết các rào cản phổ biến '
      + 'trong tiếp cận thông tin học thuật, hướng tới trở thành công cụ hỗ trợ tin cậy '
      + 'cho cộng đồng nghiên cứu tại Việt Nam\\.',
    'g'
  );
  const ABOUT_MISSION_OLD_RE = new RegExp(
    'minh bạch hóa thông tin hội nghị khoa học công nghệ thông tin '
      + 'trên một nền tảng thống nhất',
    'g'
  );

  function normalizeAboutText(text) {
    if (typeof text !== 'string') return text;
    return text
      .replace(/Lệch chuẩn múi giờ quốc tế/g, 'Lệch chuẩn múi giờ nộp bài')
      .replace(
        /Đếm ngược Deadline theo múi giờ quốc tế/g,
        'Đếm ngược Deadline theo giờ Việt Nam (UTC+7)'
      )
      .replace(
        /múi giờ chuẩn quốc tế Anywhere on Earth \(AoE, UTC-12\) sang giờ Việt Nam \(ICT, UTC\+7\)/g,
        'mốc 23:59 Anywhere on Earth (AoE, UTC-12) sang 18:59 ngày kế tiếp theo giờ Việt Nam (UTC+7)'
      )
      .replace(
        /múi giờ quốc tế Anywhere on Earth \(AoE, UTC-12\) hoặc giờ địa phương của nước chủ nhà/g,
        'múi giờ Anywhere on Earth (AoE, UTC-12) khi chưa quy đổi sang giờ Việt Nam (UTC+7)'
      )
      .replace(
        /đếm ngược deadline thời gian thực chuẩn AoE/g,
        'đếm ngược deadline thời gian thực theo múi giờ UTC+7 (giờ Việt Nam)'
      )
      .replace(/\s*quốc tế/gi, '')
      .replace(
        /^Nền tảng Tra cứu & Theo dõi Hội nghị Khoa học$/g,
        'Nền tảng Tra cứu & Khuyến nghị Hội nghị Khoa học CNTT tại Việt Nam'
      )
      .replace(
        ABOUT_HERO_DESC_OLD_RE,
        'quản lý các mốc thời hạn công bố tại các hội nghị khoa học Công nghệ thông tin '
          + 'diễn ra tại Việt Nam (bao gồm cả hội nghị quốc tế tổ chức tại Việt Nam). '
          + 'Hệ thống giải quyết các rào cản phổ biến trong tiếp cận thông tin học thuật, '
          + 'hướng tới trở thành công cụ hỗ trợ tin cậy cho cộng đồng nghiên cứu.'
      )
      .replace(
        ABOUT_MISSION_OLD_RE,
        'minh bạch hóa thông tin các hội nghị khoa học Công nghệ thông tin diễn ra tại Việt Nam '
          + '(bao gồm cả hội nghị quốc tế được tổ chức tại Việt Nam) trên một nền tảng thống nhất'
      );
  }

  /**
   * Áp dụng chuẩn hóa đệ quy lên đối tượng dữ liệu About nạp từ data/about.json
   * và bổ sung định hướng Liquid Glass (iOS 26) vào giai đoạn Tương lai của lộ trình.
   * @param {*} node - Nút dữ liệu JSON cần chuẩn hóa.
   * @returns {*} Dữ liệu đã chuẩn hóa trong bộ nhớ.
   */
  function normalizeAboutDataForDisplay(node) {
    if (typeof node === 'string') return normalizeAboutText(node);
    if (Array.isArray(node)) return node.map(normalizeAboutDataForDisplay);
    if (node && typeof node === 'object') {
      const out = {};
      Object.keys(node).forEach(k => {
        out[k] = normalizeAboutDataForDisplay(node[k]);
      });
      if (out.id === 'future' && Array.isArray(out.features)) {
        const hasLiquidGlass = out.features.some(item => /liquid\s*glass/i.test(String(item || '')));
        if (!hasLiquidGlass) {
          out.features = [...out.features, LIQUID_GLASS_ROADMAP_FEATURE];
        }
      }
      return out;
    }
    return node;
  }

  /**
   * Tải dữ liệu trang Giới thiệu từ data/about.json (kèm trạng thái loading) và render toàn trang.
   * @returns {Promise<void>}
   */
  async function initAboutPage() {
    let data = FALLBACK_ABOUT_DATA;
    const descEl = document.getElementById('aboutHeroDesc');
    const challengesEl = document.getElementById('aboutChallengesGrid');

    if (descEl) descEl.setAttribute('aria-busy', 'true');
    if (challengesEl && !challengesEl.children.length) {
      challengesEl.innerHTML = '<div class="loading-state-box">Đang tải nội dung giới thiệu...</div>';
    }

    try {
      const json = typeof utils.fetchJsonCached === 'function'
        ? await utils.fetchJsonCached('data/about.json')
        : await fetch('data/about.json').then(res => {
          if (!res.ok) throw new Error(res.status);
          return res.json();
        });
      if (json && json.hero) {
        data = normalizeAboutDataForDisplay(json);
      }
    } catch {
      // Dùng bộ dữ liệu dự phòng khi trình duyệt chặn fetch trên giao thức file:///
    } finally {
      if (descEl) descEl.setAttribute('aria-busy', 'false');
    }

    renderHero(data.hero);
    renderCoreValues(data.coreValues);
    renderTransparencyAndTech(data.transparencyAndTech);
    renderTeamAndAdvisor(data.teamAndAdvisor);
    renderRoadmap(data.roadmap);
    renderCommunity(data.community);

    setupProposalModal();
  }

  /**
   * Render phần Hero, bối cảnh thách thức và hộp sứ mệnh học thuật.
   * @param {Object} hero - Dữ liệu mục hero từ about.json.
   */
  function renderHero(hero) {
    if (!hero) return;

    const eyebrowEl = document.getElementById('aboutEyebrow');
    if (eyebrowEl && hero.eyebrow) eyebrowEl.textContent = hero.eyebrow;

    const titleEl = document.getElementById('aboutHeroTitle');
    if (titleEl && hero.title) titleEl.textContent = hero.title;

    const descEl = document.getElementById('aboutHeroDesc');
    if (descEl && hero.description) descEl.textContent = hero.description;

    const ctxTitleEl = document.getElementById('aboutContextTitle');
    if (ctxTitleEl && hero.contextTitle) {
      ctxTitleEl.innerHTML = `${ICONS.info} <span>${escapeHtml(hero.contextTitle)}</span>`;
    }

    const challengesEl = document.getElementById('aboutChallengesGrid');
    if (challengesEl && Array.isArray(hero.contextChallenges)) {
      challengesEl.innerHTML = hero.contextChallenges.map((c, i) => `
        <div class="about-challenge-item">
          <div class="about-challenge-num" aria-hidden="true">${i + 1}</div>
          <h3 class="about-challenge-title">${escapeHtml(c.title)}</h3>
          <p class="about-challenge-desc">${escapeHtml(c.desc)}</p>
        </div>
      `).join('');
    }

    const missionEl = document.getElementById('aboutMissionBox');
    if (missionEl && hero.mission) {
      missionEl.innerHTML = `
        <strong>Sứ mệnh học thuật</strong>
        <p>${escapeHtml(hero.mission)}</p>
      `;
    }
  }

  /**
   * Render lưới 3 trụ cột giá trị cốt lõi của nền tảng.
   * @param {Array<Object>} values - Danh sách các giá trị cốt lõi.
   */
  function renderCoreValues(values) {
    const grid = document.getElementById('aboutValuesGrid');
    if (!grid || !Array.isArray(values)) return;

    grid.innerHTML = values.map(v => {
      const iconSvg = ICONS[v.icon] || ICONS.award;
      return `
        <article class="about-value-card">
          <div class="about-value-icon" aria-hidden="true">
            ${iconSvg}
          </div>
          <h3 class="about-value-title">${escapeHtml(v.title)}</h3>
          <p class="about-value-desc">${escapeHtml(v.description)}</p>
        </article>
      `;
    }).join('');
  }

  /**
   * Tạo danh sách dòng mô tả dùng chung cho cột Nguồn dữ liệu và Công nghệ phát triển.
   * @param {Array<{ name: string, purpose: string }>} items - Danh sách mục.
   * @returns {string} Chuỗi HTML danh sách `.about-item-row`.
   */
  function renderAboutItemRows(items) {
    return (items || []).map(item => `
      <div class="about-item-row">
        <div class="about-item-name">
          <span class="dot" aria-hidden="true"></span>${escapeHtml(item.name)}
        </div>
        <p class="about-item-purpose">${escapeHtml(item.purpose)}</p>
      </div>
    `).join('');
  }

  /**
   * Render 2 cột Minh bạch nguồn dữ liệu và Công nghệ phát triển.
   * @param {Object} trans - Dữ liệu transparencyAndTech.
   */
  function renderTransparencyAndTech(trans) {
    if (!trans) return;

    const srcBox = document.getElementById('aboutDataSourcesCol');
    if (srcBox && trans.dataSources) {
      const ds = trans.dataSources;
      const sourcesListHtml = renderAboutItemRows(ds.sources);

      srcBox.innerHTML = `
        <h3 class="about-col-title">
          ${ICONS.database} <span>${escapeHtml(ds.title || 'Nguồn dữ liệu')}</span>
        </h3>
        <div class="about-items-list">
          ${sourcesListHtml}
        </div>
        ${ds.updateFrequency ? `
          <div class="about-update-frequency" role="note">
            ${ICONS.clock}
            <span><strong>Tần suất cập nhật:</strong> ${escapeHtml(ds.updateFrequency)}</span>
          </div>
        ` : ''}
      `;
    }

    const techBox = document.getElementById('aboutTechStackCol');
    if (techBox && trans.techStack) {
      const ts = trans.techStack;
      const techListHtml = renderAboutItemRows(ts.items);

      techBox.innerHTML = `
        <h3 class="about-col-title">
          ${ICONS.code} <span>${escapeHtml(ts.title || 'Công nghệ phát triển')}</span>
        </h3>
        <div class="about-items-list">
          ${techListHtml}
        </div>
      `;
    }
  }

  /**
   * Render thông tin Cố vấn chuyên môn và lưới thành viên thực hiện.
   * @param {Object} teamData - Dữ liệu teamAndAdvisor.
   */
  function renderTeamAndAdvisor(teamData) {
    if (!teamData) return;

    const advisorWrap = document.getElementById('aboutAdvisorWrap');
    if (advisorWrap && teamData.advisor) {
      const adv = teamData.advisor;
      advisorWrap.innerHTML = `
        <div class="about-advisor-card">
          <div class="about-advisor-badge-box" aria-hidden="true">
            ${ICONS.advisor}
          </div>
          <div class="about-advisor-info">
            <span class="about-advisor-tag">${escapeHtml(adv.role || 'Cố vấn chuyên môn')}</span>
            <h3 class="about-advisor-name">${escapeHtml(adv.name)}</h3>
            <div class="about-advisor-dept">
              ${escapeHtml(adv.unit)}${adv.organization ? ` — ${escapeHtml(adv.organization)}` : ''}
            </div>
          </div>
        </div>
      `;
    }

    const membersWrap = document.getElementById('aboutMembersWrap');
    if (membersWrap && Array.isArray(teamData.members)) {
      membersWrap.innerHTML = teamData.members.map(m => {
        const initials = getInitials(m.name);
        return `
          <article class="about-member-card">
            <div class="about-member-initials" aria-hidden="true">${escapeHtml(initials)}</div>
            <h3 class="about-member-name">${escapeHtml(m.name)}</h3>
            ${m.role ? `<span class="about-member-role">${escapeHtml(m.role)}</span>` : ''}
            ${m.mssv ? `
              <div class="about-member-mssv">
                ${ICONS.idCard}
                <span>MSSV: ${escapeHtml(m.mssv)}</span>
              </div>
            ` : ''}
          </article>
        `;
      }).join('');
    }
  }

  /**
   * Render lộ trình phát triển 2 giai đoạn của dự án ConfGuide.
   * @param {Object} roadmap - Dữ liệu lộ trình gồm mảng milestones.
   */
  function renderRoadmap(roadmap) {
    const container = document.getElementById('aboutRoadmapContainer');
    if (!container || !roadmap || !Array.isArray(roadmap.milestones)) return;

    container.innerHTML = roadmap.milestones.map(m => {
      const isCurrent = m.status === 'active';
      const featuresHtml = (m.features || []).map(f => `
        <li>${ICONS.check} <span>${escapeHtml(f)}</span></li>
      `).join('');

      return `
        <div class="about-milestone-card ${isCurrent ? 'milestone-current' : 'milestone-future'}">
          <div class="about-milestone-header">
            <span class="about-milestone-badge">${escapeHtml(m.badge)}</span>
          </div>
          <h3 class="about-milestone-title">${escapeHtml(m.title)}</h3>
          <ul class="about-milestone-features">
            ${featuresHtml}
          </ul>
        </div>
      `;
    }).join('');
  }

  /**
   * Render lời kêu gọi đóng góp cộng đồng và liên kết repository GitHub.
   * @param {Object} comm - Dữ liệu mục community.
   */
  function renderCommunity(comm) {
    if (!comm) return;

    const ctaEl = document.getElementById('aboutCommunityCta');
    if (ctaEl && comm.callToAction) ctaEl.textContent = comm.callToAction;

    const ghBtn = document.getElementById('aboutGithubBtn');
    if (ghBtn) {
      const rawUrl = typeof comm.githubRepoUrl === 'string' ? comm.githubRepoUrl.trim() : '';
      const safeUrl = /^https?:\/\/.+/i.test(rawUrl) ? rawUrl : '#';
      ghBtn.href = safeUrl;
      if (safeUrl === '#') {
        ghBtn.title = 'Repository sẽ sớm được công khai';
      }
    }
  }

  /**
   * Xóa toàn bộ trạng thái báo lỗi trên form đề xuất hội nghị.
   * @param {HTMLFormElement} form - Biểu mẫu đề xuất hội nghị.
   */
  function clearProposalErrors(form) {
    form.querySelectorAll('.about-form-input').forEach(inp => {
      inp.classList.remove('invalid');
      inp.setAttribute('aria-invalid', 'false');
    });
    form.querySelectorAll('.about-field-error').forEach(err => {
      err.textContent = '';
      err.classList.remove('show');
    });
  }

  /**
   * Gắn thông báo lỗi cho một trường nhập liệu trong form đề xuất.
   * @param {string} fieldId - ID của ô nhập.
   * @param {string} errorMsg - Nội dung lỗi.
   */
  function setProposalFieldError(fieldId, errorMsg) {
    const input = document.getElementById(fieldId);
    const errorEl = document.getElementById(`${fieldId}Error`);
    if (input) {
      input.classList.add('invalid');
      input.setAttribute('aria-invalid', 'true');
    }
    if (errorEl) {
      errorEl.textContent = errorMsg;
      errorEl.classList.add('show');
    }
  }

  /**
   * Kiểm tra tính hợp lệ của một trường trong modal đề xuất bằng Regex.
   * @param {string} fieldId - ID của trường cần kiểm tra.
   * @returns {boolean} True nếu hợp lệ.
   */
  function validateProposalField(fieldId) {
    const input = document.getElementById(fieldId);
    if (!input) return true;

    const val = input.value.trim();
    const errorEl = document.getElementById(`${fieldId}Error`);

    let errorMessage = '';
    if (fieldId === 'propName') {
      if (!val) errorMessage = 'Vui lòng nhập tên hội nghị.';
      else if (val.length < 2) errorMessage = 'Tên hội nghị quá ngắn (tối thiểu 2 ký tự).';
    } else if (fieldId === 'propUrl') {
      if (!val) errorMessage = 'Vui lòng cung cấp liên kết website chính thức.';
      else if (!/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(val)) {
        errorMessage = 'Website phải bắt đầu bằng http:// hoặc https:// hợp lệ.';
      }
    } else if (fieldId === 'propEmail' && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      errorMessage = 'Email liên hệ không đúng định dạng.';
    }

    if (errorMessage) {
      setProposalFieldError(fieldId, errorMessage);
      return false;
    }

    input.classList.remove('invalid');
    input.setAttribute('aria-invalid', 'false');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.remove('show');
    }
    return true;
  }

  /**
   * Giữ vòng lặp phím Tab nằm bên trong hộp thoại khi modal đề xuất đang mở.
   * @param {KeyboardEvent} e - Sự kiện bàn phím.
   * @param {HTMLElement} backdrop - Lớp nền modal đề xuất.
   * @param {HTMLElement|null} dialog - Khung hộp thoại chính.
   */
  function trapModalFocus(e, backdrop, dialog) {
    if (e.key !== 'Tab' || !backdrop.classList.contains('open') || !dialog) return;

    const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusables = Array.from(dialog.querySelectorAll(selector)).filter(
      el => !el.disabled && el.offsetParent !== null
    );
    if (focusables.length === 0) return;

    const firstEl = focusables[0];
    const lastEl = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === firstEl) {
      e.preventDefault();
      lastEl.focus();
    } else if (!e.shiftKey && document.activeElement === lastEl) {
      e.preventDefault();
      firstEl.focus();
    }
  }

  /**
   * Xử lý lưu đề xuất hội nghị mới vào localStorage và hiển thị thông báo thành công.
   * @param {SubmitEvent} e - Sự kiện submit của biểu mẫu đề xuất.
   * @param {HTMLFormElement} form - Biểu mẫu đề xuất hội nghị.
   * @param {HTMLElement|null} successBox - Hộp thông báo thành công.
   * @param {HTMLElement|null} closeSuccessBtn - Nút đóng trên hộp thành công.
   */
  function handleProposalSubmit(e, form, successBox, closeSuccessBtn) {
    e.preventDefault();
    clearProposalErrors(form);

    const validName = validateProposalField('propName');
    const validUrl = validateProposalField('propUrl');
    const validEmail = validateProposalField('propEmail');
    if (!validName || !validUrl || !validEmail) {
      const firstInvalid = form.querySelector('.about-form-input.invalid');
      if (firstInvalid) firstInvalid.focus();
      return;
    }

    const readVal = id => document.getElementById(id)?.value.trim() || '';
    const proposalData = {
      id: `prop_${Date.now()}`,
      name: readVal('propName'),
      website: readVal('propUrl'),
      field: readVal('propField'),
      deadline: document.getElementById('propDeadline')?.value || '',
      email: readVal('propEmail'),
      submittedAt: new Date().toISOString()
    };

    const existing = readStorage('confguide_proposals', []);
    const proposals = Array.isArray(existing) ? existing : [];
    proposals.push(proposalData);
    writeStorage('confguide_proposals', proposals);

    form.reset();
    form.classList.add('is-hidden');
    if (successBox) {
      successBox.classList.add('show');
      if (closeSuccessBtn) closeSuccessBtn.focus();
    }
  }

  /**
   * Gắn kiểm tra hợp lệ từng ô nhập và xử lý gửi biểu mẫu đề xuất hội nghị.
   * @param {HTMLFormElement} form - Biểu mẫu đề xuất.
   * @param {HTMLElement|null} successBox - Hộp thông báo thành công.
   * @param {HTMLElement|null} closeSuccessBtn - Nút đóng trên hộp thông báo.
   */
  function bindProposalFormEvents(form, successBox, closeSuccessBtn) {
    ['propName', 'propUrl', 'propEmail'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('blur', () => validateProposalField(id));
      el.addEventListener('input', () => {
        if (el.classList.contains('invalid')) validateProposalField(id);
      });
    });

    form.addEventListener('submit', e => handleProposalSubmit(e, form, successBox, closeSuccessBtn));
  }

  /**
   * Khởi tạo Modal Đề xuất Hội nghị mới với Focus Trap, Escape, validate Regex và lưu LocalStorage.
   */
  function setupProposalModal() {
    const openBtn = document.getElementById('openProposalModalBtn');
    const backdrop = document.getElementById('aboutProposalModal');
    const closeBtn = document.getElementById('aboutModalCloseBtn');
    const cancelBtn = document.getElementById('aboutModalCancelBtn');
    const dialog = document.getElementById('aboutModalDialog');
    const form = document.getElementById('proposalForm');
    const successBox = document.getElementById('proposalSuccessBox');
    const closeSuccessBtn = document.getElementById('proposalSuccessCloseBtn');

    if (!openBtn || !backdrop || !form) return;

    let lastFocusedElement = null;

    const openModal = () => {
      lastFocusedElement = document.activeElement;
      backdrop.removeAttribute('hidden');
      backdrop.classList.add('open');
      document.body.classList.add('about-modal-open');

      form.classList.remove('is-hidden');
      if (successBox) successBox.classList.remove('show');
      clearProposalErrors(form);

      const firstInput = document.getElementById('propName');
      if (firstInput) setTimeout(() => firstInput.focus(), 80);
    };

    const closeModal = () => {
      backdrop.classList.remove('open');
      document.body.classList.remove('about-modal-open');
      setTimeout(() => {
        backdrop.setAttribute('hidden', '');
        if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
          lastFocusedElement.focus();
        }
      }, 200);
    };

    openBtn.addEventListener('click', openModal);
    [closeBtn, cancelBtn, closeSuccessBtn].forEach(btn => {
      if (btn) btn.addEventListener('click', closeModal);
    });
    backdrop.addEventListener('click', e => {
      if (e.target === backdrop) closeModal();
    });
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && backdrop.classList.contains('open')) {
        e.preventDefault();
        closeModal();
      }
      trapModalFocus(e, backdrop, dialog);
    });

    bindProposalFormEvents(form, successBox, closeSuccessBtn);
  }

  // Khởi chạy trang Giới thiệu khi DOM đã sẵn sàng
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAboutPage);
  } else {
    initAboutPage();
  }
})();
