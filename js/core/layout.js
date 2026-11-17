/**
 * ConfGuide - Thành phần Bố cục & Tiện ích Dùng chung (js/core/layout.js)
 * Quản lý Header/Footer dùng chung, giao diện sáng/tối, modal toàn cục,
 * thông báo toast, hộp xác nhận tùy chỉnh và tiện ích xử lý hội nghị.
 */

(function () {
  'use strict';

  /** Các mốc thời gian chuẩn của một hội nghị khoa học */
  const MILESTONE_DEFINITIONS = [
    { key: 'abstract', name: 'Nộp bản tóm tắt (Abstract)', shortName: 'Abstract' },
    { key: 'fullPaper', name: 'Nộp toàn văn (Full Paper)', shortName: 'Full Paper' },
    { key: 'notification', name: 'Thông báo kết quả', shortName: 'Notification' },
    { key: 'cameraReady', name: 'Nộp bản hoàn chỉnh (Camera-Ready)', shortName: 'Camera-Ready' }
  ];

  /** Bộ dữ liệu dự phòng gồm 7 hội nghị khoa học CNTT tại Việt Nam để hỗ trợ chạy ngoại tuyến / file:/// */
  const RAW_FALLBACK_CONFERENCES = [
    {
      id: 'soict-2026',
      name: 'SOICT 2026',
      fullName: 'Hội nghị Khoa học về Công nghệ Thông tin và Truyền thông (SOICT)',
      rank: 'B',
      region: 'Việt Nam',
      format: 'in-person',
      publisher: 'ACM / Springer',
      indexing: ['Scopus', 'DBLP', 'ACM Digital Library'],
      fields: ['ai foundations', 'big data', 'cyber security', 'multimedia'],
      keywords: ['soict', 'hust', 'cntt', 'cyber security', 'việt nam'],
      fee: '5.000.000 VNĐ',
      location: 'TP. Hồ Chí Minh, Việt Nam',
      startDate: '2026-12-04',
      endDate: '2026-12-05',
      website: 'https://soict.org/',
      deadlines: {
        abstract: '2026-09-20',
        fullPaper: '2026-09-25',
        notification: '2026-10-12',
        cameraReady: '2026-10-23'
      },
      lastVerified: '2026-03-15',
      summarization: 'Hội nghị khoa học uy tín về CNTT quy tụ các hướng nghiên cứu hiện đại: Trí tuệ nhân tạo, An ninh mạng, Khoa học dữ liệu và Xử lý đa phương tiện.',
      rating: 4.5,
      rating_count: 82
    },
    {
      id: 'rivf-2026',
      name: 'RIVF 2026',
      fullName: 'Hội nghị Nghiên cứu, Đổi mới và Tầm nhìn Tương lai về Công nghệ Tính toán và Truyền thông (RIVF)',
      rank: 'B',
      region: 'Việt Nam',
      format: 'in-person',
      publisher: 'IEEE',
      indexing: ['Scopus', 'DBLP', 'IEEE Xplore'],
      fields: ['machine learning', 'computer vision', 'nlp', 'communications'],
      keywords: ['rivf', 'ieee', 'machine learning', 'việt nam'],
      fee: '4.800.000 VNĐ',
      location: 'TP. Hồ Chí Minh, Việt Nam',
      startDate: '2026-11-21',
      endDate: '2026-11-23',
      website: 'https://rivf2026.org/',
      deadlines: {
        abstract: '2026-07-01',
        fullPaper: '2026-07-15',
        notification: '2026-09-10',
        cameraReady: '2026-10-01'
      },
      lastVerified: '2026-03-15',
      summarization: 'Diễn đàn khoa học lớn về công nghệ tính toán, trí tuệ nhân tạo, xử lý ngôn ngữ tự nhiên và hệ thống truyền thông thông minh tại Việt Nam.',
      rating: 4.6,
      rating_count: 95
    },
    {
      id: 'kse-2026',
      name: 'KSE 2026',
      fullName: 'Hội nghị Khoa học về Kỹ thuật Tri thức và Hệ thống (KSE)',
      rank: 'B',
      region: 'Việt Nam',
      format: 'hybrid',
      publisher: 'IEEE',
      indexing: ['Scopus', 'DBLP', 'IEEE Xplore'],
      fields: ['knowledge engineering', 'deep learning', 'data science', 'software engineering'],
      keywords: ['kse', 'knowledge engineering', 'deep learning', 'hà nội'],
      fee: '4.500.000 VNĐ',
      location: 'Hà Nội, Việt Nam',
      startDate: '2026-11-12',
      endDate: '2026-11-14',
      website: 'https://kse-conf.org/',
      deadlines: {
        abstract: '2026-06-20',
        fullPaper: '2026-07-05',
        notification: '2026-08-30',
        cameraReady: '2026-09-20'
      },
      lastVerified: '2026-03-15',
      summarization: 'Diễn đàn học thuật chuyên sâu về kỹ thuật tri thức, học máy, khai phá dữ liệu và phát triển các hệ thống phần mềm thông minh.',
      rating: 4.4,
      rating_count: 68
    },
    {
      id: 'fdse-2026',
      name: 'FDSE 2026',
      fullName: 'Hội nghị Khoa học về Dữ liệu Tương lai và Kỹ thuật Bảo mật (FDSE)',
      rank: 'B',
      region: 'Việt Nam',
      format: 'hybrid',
      publisher: 'Springer LNCS',
      indexing: ['Scopus', 'DBLP'],
      fields: ['cyber security', 'big data', 'privacy', 'cloud computing'],
      keywords: ['fdse', 'springer', 'cyber security', 'big data'],
      fee: '4.500.000 VNĐ',
      location: 'Bình Dương, Việt Nam',
      startDate: '2026-11-26',
      endDate: '2026-11-28',
      website: 'https://fdse.vn/',
      deadlines: {
        abstract: '2026-06-30',
        fullPaper: '2026-07-20',
        notification: '2026-09-15',
        cameraReady: '2026-10-05'
      },
      lastVerified: '2026-03-15',
      summarization: 'Hội nghị khoa học tập trung vào an toàn thông tin, mật mã học, bảo mật dữ liệu lớn và điện toán đám mây thế hệ mới.',
      rating: 4.3,
      rating_count: 54
    },
    {
      id: 'atc-2026',
      name: 'ATC 2026',
      fullName: 'Hội nghị Khoa học về Công nghệ Tiên tiến trong Truyền thông (ATC)',
      rank: 'B',
      region: 'Việt Nam',
      format: 'in-person',
      publisher: 'IEEE ComSoc / REV',
      indexing: ['Scopus', 'IEEE Xplore'],
      fields: ['communications', 'wireless networks', 'iot', 'antenna'],
      keywords: ['atc', 'viễn thông', 'wireless', 'iot', 'việt nam'],
      fee: '4.500.000 VNĐ',
      location: 'Quy Nhơn, Việt Nam',
      startDate: '2026-10-15',
      endDate: '2026-10-17',
      website: 'https://atc-conf.org/',
      deadlines: {
        abstract: '2026-05-15',
        fullPaper: '2026-05-30',
        notification: '2026-07-30',
        cameraReady: '2026-08-15'
      },
      lastVerified: '2026-03-15',
      summarization: 'Hội nghị khoa học thường niên về công nghệ truyền thông, mạng không dây và viễn thông tại Việt Nam do Hội Vô tuyến Điện tử (REV) đồng tổ chức.',
      rating: 4.2,
      rating_count: 45
    },
    {
      id: 'acomp-2026',
      name: 'ACOMP 2026',
      fullName: 'Hội nghị Khoa học về Tính toán Tiên tiến và Ứng dụng (ACOMP)',
      rank: 'C',
      region: 'Việt Nam',
      format: 'in-person',
      publisher: 'IEEE CPS',
      indexing: ['Scopus', 'DBLP', 'IEEE Xplore'],
      fields: ['high performance computing', 'software engineering', 'iot', 'ai foundations'],
      keywords: ['acomp', 'hiệu năng cao', 'iot', 'tp hcm'],
      fee: '4.200.000 VNĐ',
      location: 'TP. Hồ Chí Minh, Việt Nam',
      startDate: '2026-11-25',
      endDate: '2026-11-27',
      website: 'https://acomp.hcmut.edu.vn/',
      deadlines: {
        abstract: '2026-07-10',
        fullPaper: '2026-07-25',
        notification: '2026-09-18',
        cameraReady: '2026-10-10'
      },
      lastVerified: '2026-03-15',
      summarization: 'Hội nghị khoa học về tính toán hiệu năng cao, kỹ thuật phần mềm, hệ thống nhúng và các ứng dụng trí tuệ nhân tạo.',
      rating: 4.2,
      rating_count: 41
    },
    {
      id: 'mapr-2026',
      name: 'MAPR 2026',
      fullName: 'Hội nghị Khoa học về Phân tích Đa phương tiện và Nhận dạng Mẫu (MAPR)',
      rank: 'B',
      region: 'Việt Nam',
      format: 'in-person',
      publisher: 'IEEE',
      indexing: ['Scopus', 'IEEE Xplore'],
      fields: ['multimedia', 'pattern recognition', 'computer vision', 'healthcare ai'],
      keywords: ['mapr', 'uit', 'pattern recognition', 'multimedia', 'đà nẵng'],
      fee: '4.500.000 VNĐ',
      location: 'Đà Nẵng, Việt Nam',
      startDate: '2026-10-08',
      endDate: '2026-10-09',
      website: 'https://mapr.uit.edu.vn/',
      deadlines: {
        abstract: '2026-06-01',
        fullPaper: '2026-06-15',
        notification: '2026-08-10',
        cameraReady: '2026-08-25'
      },
      lastVerified: '2026-03-15',
      summarization: 'Hội nghị khoa học chuyên sâu về Phân tích Đa phương tiện và Nhận dạng Mẫu do Trường Đại học Công nghệ Thông tin (ĐHQG-HCM) phối hợp tổ chức.',
      rating: 4.4,
      rating_count: 48
    }
  ];

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  let activeModalLastFocus = null;
  let lastFeedbackSubmitTime = 0;
  let layoutInitialized = false;

  /**
   * Mã hóa ký tự đặc biệt HTML nhằm phòng tránh lỗ hổng XSS khi chèn chuỗi vào DOM.
   * @param {*} str Chuỗi đầu vào cần làm sạch.
   * @returns {string} Chuỗi đã được escape an toàn.
   */
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Đọc dữ liệu JSON từ localStorage an toàn kèm giá trị mặc định.
   * @param {string} key Khóa lưu trữ trong localStorage.
   * @param {*} fallback Giá trị trả về khi không có dữ liệu hoặc lỗi parse JSON.
   * @returns {*} Dữ liệu đã parse hoặc giá trị fallback.
   */
  function readStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  /**
   * Ghi dữ liệu JSON vào localStorage với xử lý ngoại lệ đầy đủ.
   * @param {string} key Khóa lưu trữ.
   * @param {*} value Giá trị cần tuần tự hóa thành JSON.
   * @returns {boolean} True nếu lưu thành công, false nếu trình duyệt chặn/hết dung lượng.
   */
  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Chuyển đổi tên hội nghị thành định danh slug chuẩn URL.
   * @param {string} text Chuỗi tên hoặc nhãn bất kỳ.
   * @returns {string} Chuỗi slug chữ thường, nối bằng dấu gạch ngang.
   */
  function slugify(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Lấy hoặc sinh mã định danh duy nhất cho một hội nghị.
   * @param {Object|null} conf Đối tượng hội nghị.
   * @returns {string} Mã định danh hội nghị.
   */
  function getConferenceId(conf) {
    if (!conf || typeof conf !== 'object') return '';
    if (conf.id) return String(conf.id).trim();
    return slugify(conf.name || conf.short_name || conf.fullName || conf.full_name || '');
  }

  /**
   * Chuẩn hóa ngày về định dạng ISO YYYY-MM-DD nếu hợp lệ.
   * @param {string} dateStr Chuỗi ngày thô.
   * @returns {string} Chuỗi YYYY-MM-DD hoặc chuỗi rỗng nếu không hợp lệ.
   */
  function normalizeDateIso(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return '';
    const trimmed = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const isoPrefix = trimmed.match(/^(\d{4}-\d{2}-\d{2})[T\s]/);
    if (isoPrefix) return isoPrefix[1];
    const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) return `${match[3]}-${match[2]}-${match[1]}`;
    return '';
  }

  /**
   * Quy đổi mốc thời hạn nộp bài từ chuẩn AoE (UTC-12) sang giờ Việt Nam cố định (Asia/Ho_Chi_Minh, UTC+7).
   * Công thức: AoE (UTC-12) + 19 giờ = UTC+7 (ví dụ 23:59 AoE ngày D thành 18:59 ngày D+1 theo UTC+7).
   * Giữ nguyên AoE khi dữ liệu không phải hạn nộp có giờ chuẩn hoặc khi tùy chọn hasExplicitTime = false.
   * @param {string} dateStr Chuỗi ngày hạn nộp (YYYY-MM-DD hoặc chuỗi có kèm giờ).
   * @param {Object} [options={}] Tùy chọn quy đổi ({ isDeadline: boolean, hasExplicitTime: boolean }).
   * @returns {Object|null} Thông tin mốc thời gian đã quy đổi kèm nhãn múi giờ rõ ràng hoặc null nếu không hợp lệ.
   */
  function convertDeadlineToVn(dateStr, options) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const opts = options || {};
    const isDeadline = opts.isDeadline !== false;
    const hasExplicitTime = opts.hasExplicitTime !== false;

    const trimmed = dateStr.trim();
    const iso = normalizeDateIso(trimmed);
    if (!iso) return null;

    const [yStr, mStr, dStr] = iso.split('-');
    const year = Number(yStr);
    const month = Number(mStr);
    const day = Number(dStr);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;

    const aoeDateVi = `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;

    // Nếu không phải hạn nộp bài hoặc dữ liệu chỉ có ngày thuần túy không kèm quy ước giờ AoE (như ngày người dùng tự nhập)
    if (!isDeadline || !hasExplicitTime) {
      const fallbackTargetMs = Date.UTC(year, month - 1, day, 23, 59, 59) + 12 * 3600000;
      return {
        rawDate: iso,
        aoeDateVi: aoeDateVi,
        vnIsoDate: iso,
        vnDateVi: aoeDateVi,
        vnTimeVi: '',
        timezoneLabel: 'AoE',
        converted: false,
        targetMs: fallbackTargetMs,
        displayText: `${aoeDateVi} (AoE)`
      };
    }

    // Kiểm tra xem chuỗi có ghi giờ cụ thể hay áp dụng quy ước 23:59:59 AoE (UTC-12) của hạn nộp hội nghị
    let hourAoE = 23;
    let minuteAoE = 59;
    let secondAoE = 59;
    const timeMatch = trimmed.match(/[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?/);
    if (timeMatch) {
      hourAoE = Number(timeMatch[1]);
      minuteAoE = Number(timeMatch[2]);
      secondAoE = timeMatch[3] ? Number(timeMatch[3]) : 0;
    }

    // Mốc thời gian tuyệt đối (UTC epoch ms): giờ AoE (UTC-12) tương đương cộng 12 giờ để về UTC+0
    const targetMs = Date.UTC(year, month - 1, day, hourAoE, minuteAoE, secondAoE) + 12 * 3600000;

    // Quy đổi sang múi giờ cố định Asia/Ho_Chi_Minh (UTC+7): cộng đúng 7 giờ từ UTC+0 (tức AoE + 19 giờ)
    const vnWallClockMs = targetMs + 7 * 3600000;
    const vnDateObj = new Date(vnWallClockMs);

    const vnYear = vnDateObj.getUTCFullYear();
    const vnMonth = String(vnDateObj.getUTCMonth() + 1).padStart(2, '0');
    const vnDay = String(vnDateObj.getUTCDate()).padStart(2, '0');
    const vnHour = String(vnDateObj.getUTCHours()).padStart(2, '0');
    const vnMin = String(vnDateObj.getUTCMinutes()).padStart(2, '0');

    const vnIsoDate = `${vnYear}-${vnMonth}-${vnDay}`;
    const vnDateVi = `${vnDay}/${vnMonth}/${vnYear}`;
    const vnTimeVi = `${vnHour}:${vnMin}`;
    const timezoneLabel = 'UTC+7 (giờ Việt Nam)';

    return {
      rawDate: iso,
      aoeDateVi: aoeDateVi,
      vnIsoDate: vnIsoDate,
      vnDateVi: vnDateVi,
      vnTimeVi: vnTimeVi,
      timezoneLabel: timezoneLabel,
      converted: true,
      targetMs: targetMs,
      displayText: `${vnTimeVi} ${vnDateVi} — ${timezoneLabel}`
    };
  }

  /**
   * Định dạng chuỗi hiển thị hạn nộp bài kèm nhãn múi giờ rõ ràng ("UTC+7 (giờ Việt Nam)" hoặc "AoE").
   * @param {string} dateStr Chuỗi ngày hạn nộp.
   * @param {Object} [options={}] Tùy chọn ({ isDeadline: boolean, hasExplicitTime: boolean, includeAoEOrigin: boolean }).
   * @returns {string} Chuỗi ngày giờ kèm nhãn múi giờ minh bạch.
   */
  function formatDeadlineVi(dateStr, options) {
    const info = convertDeadlineToVn(dateStr, options);
    if (!info) return dateStr ? String(dateStr) : 'Chưa công bố';
    if (options && options.includeAoEOrigin && info.converted) {
      return `${info.displayText} (gốc 23:59 ${info.aoeDateVi} AoE)`;
    }
    return info.displayText;
  }

  /**
   * Tính thời gian còn lại tới mốc hạn nộp bài (so sánh trên cùng timestamp tuyệt đối).
   * @param {string} dateStr Ngày hạn nộp định dạng YYYY-MM-DD.
   * @returns {Object|null} Đối tượng { totalMs, days, hours, minutes, seconds, isPassed } hoặc null.
   */
  function getAoETimeRemaining(dateStr) {
    const info = convertDeadlineToVn(dateStr, { isDeadline: true });
    if (!info || !Number.isFinite(info.targetMs)) return null;

    const diffMs = info.targetMs - Date.now();
    const isPassed = diffMs <= 0;
    const absMs = Math.abs(diffMs);

    return {
      totalMs: diffMs,
      days: Math.floor(absMs / 86400000),
      hours: Math.floor((absMs % 86400000) / 3600000),
      minutes: Math.floor((absMs % 3600000) / 60000),
      seconds: Math.floor((absMs % 60000) / 1000),
      isPassed
    };
  }

  /**
   * Tính số ngày nguyên còn lại đến hạn nộp bài (âm nếu đã quá hạn).
   * @param {string} dateStr Ngày hạn nộp định dạng YYYY-MM-DD.
   * @returns {number|null} Số ngày còn lại hoặc null nếu ngày không hợp lệ.
   */
  function daysLeft(dateStr) {
    const info = convertDeadlineToVn(dateStr, { isDeadline: true });
    if (!info || !Number.isFinite(info.targetMs)) return null;
    return Math.floor((info.targetMs - Date.now()) / 86400000);
  }

  /**
   * Xác định khóa giai đoạn chuẩn từ tên mốc thời gian tiếng Anh hoặc tiếng Việt.
   * @param {string} name Tên mốc thời gian gốc.
   * @returns {{ key: string, shortName: string }} Khóa chuẩn hóa và nhãn ngắn.
   */
  function classifyMilestoneName(name) {
    const text = String(name || '').trim();
    const lower = text.toLowerCase();

    if (/abstract|tóm tắt/.test(lower)) {
      return { key: 'abstract', shortName: 'Abstract' };
    }
    if (/camera|final version|final paper|hoàn chỉnh/.test(lower)) {
      return { key: 'cameraReady', shortName: 'Camera-Ready' };
    }
    if (/notification|decision|acceptance|thông báo/.test(lower)) {
      return { key: 'notification', shortName: 'Notification' };
    }
    if (/full[- ]?paper|paper submission|submission deadline|regular paper|toàn văn/.test(lower)) {
      return { key: 'fullPaper', shortName: 'Full Paper' };
    }
    if (/registration|đăng ký/.test(lower)) {
      return { key: 'registration', shortName: 'Registration' };
    }

    const fallbackShort = text.length > 26 ? `${text.slice(0, 24)}...` : (text || 'Deadline');
    return { key: slugify(text) || 'milestone', shortName: fallbackShort };
  }

  /**
   * Phân tích thuộc tính deadlines (hỗ trợ cả dạng Array và Object) thành danh sách đồng nhất
   * kèm thông tin quy đổi sang múi giờ UTC+7 (giờ Việt Nam).
   * @param {Array|Object|null} deadlines Dữ liệu hạn nộp thô của hội nghị.
   * @returns {Array<Object>} Danh sách các mốc đã chuẩn hóa và sắp xếp tăng dần theo timestamp tuyệt đối.
   */
  function parseDeadlinesList(deadlines) {
    if (!deadlines) return [];
    const items = [];

    if (Array.isArray(deadlines)) {
      deadlines.forEach(entry => {
        if (!entry || typeof entry !== 'object') return;
        const converted = convertDeadlineToVn(entry.date, { isDeadline: true });
        if (!converted) return;
        const classified = classifyMilestoneName(entry.name);
        const left = daysLeft(entry.date);
        items.push({
          key: classified.key,
          name: String(entry.name || classified.shortName).trim(),
          shortName: classified.shortName,
          date: converted.rawDate,
          vnDate: converted.vnIsoDate,
          displayDate: converted.displayText,
          timezoneLabel: converted.timezoneLabel,
          targetMs: converted.targetMs,
          daysLeft: left,
          isPassed: converted.targetMs <= Date.now()
        });
      });
    } else if (typeof deadlines === 'object') {
      MILESTONE_DEFINITIONS.forEach(def => {
        const converted = convertDeadlineToVn(deadlines[def.key], { isDeadline: true });
        if (!converted) return;
        const left = daysLeft(deadlines[def.key]);
        items.push({
          key: def.key,
          name: def.name,
          shortName: def.shortName,
          date: converted.rawDate,
          vnDate: converted.vnIsoDate,
          displayDate: converted.displayText,
          timezoneLabel: converted.timezoneLabel,
          targetMs: converted.targetMs,
          daysLeft: left,
          isPassed: converted.targetMs <= Date.now()
        });
      });
    }

    items.sort((a, b) => a.targetMs - b.targetMs);
    return items;
  }

  /**
   * Trích xuất tối đa 4 mốc chính đại diện cho thanh tiến trình trên trang chi tiết.
   * @param {Object} conf Đối tượng hội nghị.
   * @returns {Array<Object>} Danh sách 4 mốc tiêu biểu.
   */
  function getCoreMilestones(conf) {
    const all = parseDeadlinesList(conf ? conf.deadlines : null);
    if (!all.length) return [];

    // Nếu là dạng object chuẩn 4 mốc thì trả về đúng thứ tự chuẩn
    if (conf && !Array.isArray(conf.deadlines)) {
      return MILESTONE_DEFINITIONS.map(def => {
        const found = all.find(m => m.key === def.key);
        return found || {
          key: def.key,
          name: def.name,
          shortName: def.shortName,
          date: '',
          daysLeft: null,
          isPassed: false
        };
      });
    }

    // Dạng mảng từ crawl: ưu tiên ghép vào 4 giai đoạn chuẩn nếu khớp
    const picked = [];
    const usedIndices = new Set();
    MILESTONE_DEFINITIONS.forEach(def => {
      const idx = all.findIndex((item, i) => !usedIndices.has(i) && item.key === def.key);
      if (idx !== -1) {
        usedIndices.add(idx);
        picked.push(all[idx]);
      }
    });

    // Bổ sung các mốc còn lại nếu chưa đủ 4 thẻ hiển thị
    for (let i = 0; i < all.length && picked.length < 4; i++) {
      if (!usedIndices.has(i)) {
        usedIndices.add(i);
        picked.push(all[i]);
      }
    }

    return picked.slice(0, 4).sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Tìm mốc hạn nộp tiếp theo gần nhất (hoặc mốc cuối cùng nếu toàn bộ đã qua).
   * @param {Object} conf Đối tượng hội nghị.
   * @returns {Object|null} Đối tượng mốc thời gian hoặc null nếu chưa có dữ liệu.
   */
  function getNextDeadline(conf) {
    const items = parseDeadlinesList(conf ? conf.deadlines : null);
    if (!items.length) return null;

    const upcoming = items.find(m => !m.isPassed);
    if (upcoming) return upcoming;

    return items[items.length - 1];
  }

  /**
   * Xác định trạng thái nhận bài và nhãn hiển thị cho hội nghị.
   * @param {Object} conf Đối tượng hội nghị.
   * @returns {{ code: string, label: string, badgeClass: string }} Thông tin trạng thái.
   */
  function getStatus(conf) {
    const next = getNextDeadline(conf);
    const endDate = conf ? normalizeDateIso(conf.endDate || conf.end_date) : '';
    const endLeft = endDate ? daysLeft(endDate) : null;

    if (endLeft !== null && endLeft < 0) {
      return { code: 'ended', label: 'Đã kết thúc', badgeClass: 'status-ended' };
    }
    if (!next) {
      return { code: 'open', label: 'Đang cập nhật', badgeClass: 'status-open' };
    }
    if (next.isPassed) {
      return { code: 'closed', label: 'Đã hết hạn nộp', badgeClass: 'status-closed' };
    }
    if (next.daysLeft !== null && next.daysLeft <= 14) {
      return { code: 'urgent', label: 'Sắp hết hạn', badgeClass: 'status-urgent' };
    }
    return { code: 'open', label: 'Đang nhận bài', badgeClass: 'status-open' };
  }

  /**
   * Định dạng ngày ISO YYYY-MM-DD sang DD/MM/YYYY theo thói quen Việt Nam.
   * @param {string} dateStr Chuỗi ngày ISO.
   * @returns {string} Ngày đã định dạng hoặc "Chưa cập nhật".
   */
  function formatDateVi(dateStr) {
    const iso = normalizeDateIso(dateStr);
    if (!iso) return dateStr ? String(dateStr) : 'Chưa cập nhật';
    const parts = iso.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  /**
   * Định dạng khoảng thời gian diễn ra hội nghị sang tiếng Việt ngắn gọn.
   * @param {string} startDate Ngày bắt đầu ISO.
   * @param {string} endDate Ngày kết thúc ISO.
   * @returns {string} Chuỗi khoảng ngày đã định dạng hoặc chuỗi rỗng.
   */
  function formatRangeVi(startDate, endDate) {
    const startIso = normalizeDateIso(startDate);
    const endIso = normalizeDateIso(endDate);
    if (!startIso && !endIso) return '';
    if (startIso && (!endIso || startIso === endIso)) {
      return formatDateVi(startIso);
    }
    if (!startIso) return formatDateVi(endIso);

    const [sy, sm, sd] = startIso.split('-');
    const [ey, em, ed] = endIso.split('-');
    if (sy === ey && sm === em) {
      return `${sd} – ${ed}/${em}/${ey}`;
    }
    return `${sd}/${sm}/${sy} – ${ed}/${em}/${ey}`;
  }

  /**
   * Chuẩn hóa nhãn hình thức tổ chức hội nghị sang tiếng Việt rõ nghĩa.
   * @param {Object} conf Đối tượng hội nghị.
   * @returns {string} Chuỗi hình thức tổ chức hoặc "Chưa cập nhật".
   */
  function formatConferenceMode(conf) {
    if (!conf) return 'Chưa cập nhật';
    const raw = String(conf.format || conf.mode || '').trim();
    if (!raw) return 'Chưa cập nhật';
    const fmtMap = {
      'in-person': 'Trực tiếp (In-person)',
      'offline': 'Trực tiếp (In-person)',
      'online': 'Trực tuyến (Online)',
      'hybrid': 'Kết hợp (Hybrid)'
    };
    return fmtMap[raw.toLowerCase()] || raw;
  }

  /**
   * Chuẩn hóa chuỗi thời gian diễn ra hội nghị (không cộng 19h vì là ngày sự kiện).
   * @param {Object} conf Đối tượng hội nghị.
   * @returns {string} Chuỗi khoảng ngày diễn ra hoặc "Chưa cập nhật".
   */
  function formatConferenceEventDate(conf) {
    if (!conf) return 'Chưa cập nhật';
    const rangeVi = formatRangeVi(conf.startDate || conf.start_date, conf.endDate || conf.end_date);
    if (rangeVi) return rangeVi;
    if (conf.date_happen && String(conf.date_happen).trim()) {
      return String(conf.date_happen).trim();
    }
    return 'Chưa cập nhật';
  }

  /**
   * Chuẩn hóa đối tượng hội nghị từ dữ liệu JSON/crawler về cấu trúc thống nhất.
   * @param {Object} conf Dữ liệu hội nghị thô.
   * @returns {Object|null} Bản sao đã chuẩn hóa các trường định danh, ngày và liên kết.
   */
  function normalizeConference(conf) {
    if (!conf || typeof conf !== 'object') return null;

    let startIso = normalizeDateIso(conf.startDate || conf.start_date);
    let endIso = normalizeDateIso(conf.endDate || conf.end_date);
    if ((!startIso || !endIso) && typeof conf.date_happen === 'string' && conf.date_happen.includes(' to ')) {
      const parts = conf.date_happen.split(/\s+to\s+/i);
      if (!startIso) startIso = normalizeDateIso(parts[0]);
      if (!endIso) endIso = normalizeDateIso(parts[1]);
    }

    const fullTitle = conf.fullName || conf.full_name || conf.name || '';
    const siteUrl = conf.website || conf.website_url || '';
    const locationText = conf.location || conf.country || '';
    const isVietnam = /việt nam|vietnam/i.test(`${locationText} ${conf.region || ''}`);

    return Object.assign({}, conf, {
      id: getConferenceId(conf),
      fullName: fullTitle,
      full_name: fullTitle,
      website: siteUrl,
      website_url: siteUrl,
      startDate: startIso,
      start_date: startIso,
      endDate: endIso,
      end_date: endIso,
      region: conf.region || (isVietnam ? 'Việt Nam' : 'Việt Nam'),
      fields: Array.isArray(conf.fields) ? conf.fields : [],
      indexing: Array.isArray(conf.indexing) ? conf.indexing : (conf.indexing ? [conf.indexing] : [])
    });
  }

  /**
   * Tạo đường dẫn thêm sự kiện hạn nộp sang Google Calendar (theo ngày đã quy đổi UTC+7).
   * @param {string} title Tiêu đề sự kiện.
   * @param {string} description Nội dung mô tả chi tiết.
   * @param {string} location Địa điểm tổ chức.
   * @param {string} dateStr Ngày hạn nộp ISO.
   * @returns {string} URL Google Calendar hợp lệ.
   */
  function getGoogleCalendarUrl(title, description, location, dateStr) {
    const converted = convertDeadlineToVn(dateStr, { isDeadline: true });
    const iso = converted ? converted.vnIsoDate : normalizeDateIso(dateStr);
    if (!iso) return 'https://calendar.google.com/calendar/render';
    const compact = iso.replace(/-/g, '');
    const nextDate = new Date(Date.parse(`${iso}T00:00:00Z`) + 86400000);
    const nextCompact = nextDate.toISOString().slice(0, 10).replace(/-/g, '');

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title || 'ConfGuide Deadline',
      dates: `${compact}/${nextCompact}`,
      details: description || '',
      location: location || '',
      ctz: 'Asia/Ho_Chi_Minh'
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  /**
   * Làm sạch chuỗi văn bản theo chuẩn iCalendar (.ics).
   * @param {string} value Văn bản thô.
   * @returns {string} Chuỗi đã escape đúng chuẩn RFC 5545.
   */
  function escapeIcsText(value) {
    return String(value || '')
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');
  }

  /**
   * Sinh nội dung tệp iCalendar (.ics) chứa danh sách các mốc sự kiện kèm nhắc nhở theo giờ Việt Nam (UTC+7).
   * @param {Array<Object>} events Danh sách sự kiện { title, description, location, date }.
   * @returns {string} Chuỗi nội dung file .ics.
   */
  function createIcsContent(events) {
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ConfGuide//Academic Conference Deadlines//VI',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];

    (events || []).forEach((ev, index) => {
      const converted = convertDeadlineToVn(ev && ev.date, { isDeadline: true });
      const iso = converted ? converted.vnIsoDate : normalizeDateIso(ev && ev.date);
      if (!iso) return;
      const startCompact = iso.replace(/-/g, '');
      const endCompact = new Date(Date.parse(`${iso}T00:00:00Z`) + 86400000)
        .toISOString().slice(0, 10).replace(/-/g, '');

      lines.push(
        'BEGIN:VEVENT',
        `UID:${stamp}-${index}-${Math.random().toString(36).slice(2, 8)}@confguide.vn`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${startCompact}`,
        `DTEND;VALUE=DATE:${endCompact}`,
        `SUMMARY:${escapeIcsText(ev.title || 'ConfGuide Deadline')}`,
        `DESCRIPTION:${escapeIcsText(ev.description || '')}`,
        `LOCATION:${escapeIcsText(ev.location || '')}`,
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        'DESCRIPTION:Nhắc nhở hạn nộp bài ConfGuide (trước 7 ngày)',
        'TRIGGER:-P7D',
        'END:VALARM',
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        'DESCRIPTION:Nhắc nhở hạn nộp bài ConfGuide (trước 1 ngày)',
        'TRIGGER:-P1D',
        'END:VALARM',
        'END:VEVENT'
      );
    });

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  /**
   * Kích hoạt tải xuống file .ics trên trình duyệt mà không mở trang mới.
   * @param {string} filename Tên tệp tin tải về.
   * @param {string} content Nội dung định dạng .ics.
   */
  function downloadIcsFile(filename, content) {
    const safeName = String(filename || 'confguide-deadlines.ics').replace(/[^a-zA-Z0-9._-]/g, '-');
    const blob = new Blob([content || ''], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = safeName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /**
   * Hiển thị thông báo nổi (Toast) không chặn giao diện, thay thế window.alert().
   * @param {string} message Nội dung thông báo cho người dùng.
   * @param {'info'|'success'|'error'} [type='info'] Mức độ thông báo.
   */
  function showToast(message, type = 'info') {
    if (!document.body || !message) return;
    let container = document.getElementById('cgToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'cgToastContainer';
      container.className = 'cg-toast-container';
      container.setAttribute('aria-live', 'polite');
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `cg-toast cg-toast--${type}`;
    toast.setAttribute('role', 'status');
    toast.textContent = String(message);
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('is-visible'));
    setTimeout(() => {
      toast.classList.remove('is-visible');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 220);
    }, 3200);
  }

  /**
   * Hiển thị hộp thoại xác nhận tùy chỉnh thay thế window.confirm().
   * Hỗ trợ đóng bằng nút Hủy, click ra vùng overlay hoặc phím Escape và khôi phục focus.
   * @param {string} message Nội dung câu hỏi xác nhận.
   * @param {Object} [options] Tùy chọn tiêu đề và nhãn nút bấm.
   * @returns {Promise<boolean>} Promise trả về true nếu xác nhận, false nếu hủy.
   */
  function showConfirmModal(message, options = {}) {
    if (!document.body) return Promise.resolve(false);
    const titleText = options.title || 'Xác nhận thao tác';
    const confirmLabel = options.confirmText || 'Xác nhận';
    const cancelLabel = options.cancelText || 'Hủy';
    const isDanger = options.danger !== false;

    return new Promise(resolve => {
      const previousFocus = document.activeElement;
      const backdrop = document.createElement('div');
      backdrop.className = 'cg-confirm-backdrop';
      backdrop.setAttribute('role', 'dialog');
      backdrop.setAttribute('aria-modal', 'true');
      backdrop.setAttribute('aria-labelledby', 'cgConfirmTitle');

      backdrop.innerHTML = `
        <div class="cg-confirm-dialog">
          <h2 id="cgConfirmTitle" class="cg-confirm-title">${escapeHtml(titleText)}</h2>
          <p class="cg-confirm-message">${escapeHtml(message)}</p>
          <div class="cg-confirm-actions">
            <button type="button" class="btn btn-secondary js-confirm-cancel">${escapeHtml(cancelLabel)}</button>
            <button type="button" class="btn ${isDanger ? 'btn-danger' : 'btn-primary'} js-confirm-ok">${escapeHtml(confirmLabel)}</button>
          </div>
        </div>
      `;

      const cancelBtn = backdrop.querySelector('.js-confirm-cancel');
      const okBtn = backdrop.querySelector('.js-confirm-ok');

      function cleanup(result) {
        document.removeEventListener('keydown', onKeyDown);
        document.body.classList.remove('modal-open');
        if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
        if (previousFocus && typeof previousFocus.focus === 'function') {
          previousFocus.focus();
        }
        resolve(result);
      }

      function onKeyDown(event) {
        if (event.key === 'Escape') {
          event.preventDefault();
          cleanup(false);
        }
      }

      backdrop.addEventListener('click', event => {
        if (event.target === backdrop) cleanup(false);
      });
      if (cancelBtn) cancelBtn.addEventListener('click', () => cleanup(false));
      if (okBtn) okBtn.addEventListener('click', () => cleanup(true));

      document.addEventListener('keydown', onKeyDown);
      document.body.classList.add('modal-open');
      document.body.appendChild(backdrop);
      if (okBtn) okBtn.focus();
    });
  }

  /** Danh sách 7 hội nghị dự phòng đã chuẩn hóa */
  const FALLBACK_CONFERENCES = RAW_FALLBACK_CONFERENCES.map(normalizeConference);

  /**
   * Đồng bộ trạng thái giao diện Sáng / Tối từ localStorage.
   */
  function initTheme() {
    let savedTheme = 'light';
    try {
      savedTheme = localStorage.getItem('confguide_theme') || 'light';
    } catch (e) {}

    const targetEl = document.body || document.documentElement;
    if (!targetEl) return;
    targetEl.classList.toggle('dark', savedTheme === 'dark');
  }

  /**
   * Trích xuất tên tệp HTML hiện tại từ đường dẫn trình duyệt.
   * @returns {string} Tên file trang hiện tại (mặc định index.html).
   */
  function getCurrentPage() {
    const pathname = window.location.pathname.replace(/\\/g, '/');
    const filename = pathname.split('/').pop().toLowerCase();
    return filename || 'index.html';
  }

  /**
   * Đọc phiên đăng nhập hiện tại từ localStorage.
   * @returns {Object|null} Thông tin người dùng hoặc null nếu chưa đăng nhập.
   */
  function getCurrentUser() {
    return readStorage('confguide_current_user', null);
  }

  /**
   * Bảo vệ các trang yêu cầu đăng nhập; điều hướng về login.html nếu chưa xác thực.
   * @param {string} currentPage Tên trang hiện tại.
   * @returns {boolean} True nếu được phép truy cập trang.
   */
  function checkAuthGuard(currentPage) {
    const protectedPages = ['profile.html'];
    if (protectedPages.includes(currentPage) && !getCurrentUser()) {
      const redirectParam = encodeURIComponent(currentPage + window.location.search);
      window.location.replace(`login.html?redirect=${redirectParam}`);
      return false;
    }
    return true;
  }

  /**
   * Tạo HTML logo thương hiệu ConfGuide dùng chung cho Header và Footer.
   * @param {string} [extraClass=''] Lớp CSS bổ sung.
   * @returns {string} Chuỗi HTML thẻ <a> thương hiệu.
   */
  function renderBrandHtml(extraClass = '') {
    const gradCapSvg = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
        <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
      </svg>
    `;

    return `
      <a href="index.html" class="brand ${escapeHtml(extraClass)}" title="Về trang chủ ConfGuide">
        <div class="brand-icon-box" aria-hidden="true">
          ${gradCapSvg}
        </div>
        <div class="brand-copy">
          <strong>ConfGuide</strong>
          <small>Find the Right Place for Your Research</small>
        </div>
      </a>
    `;
  }

  /**
   * Tạo HTML khối tài khoản (Menu Avatar hoặc nút Đăng nhập/Đăng ký) trên Header.
   * @param {string} currentPage Tên trang hiện tại.
   * @param {Object|null} user Người dùng đang đăng nhập.
   * @returns {string} Chuỗi HTML nút xác thực hoặc dropdown tài khoản.
   */
  function renderAuthButtons(currentPage, user) {
    if (user) {
      const displayName = user.fullName || user.username || user.email || 'U';
      const initial = displayName.trim().charAt(0).toUpperCase() || 'U';
      const avatarContent = (user.avatarUrl && typeof user.avatarUrl === 'string')
        ? `<img src="${escapeHtml(user.avatarUrl)}" alt="${escapeHtml(displayName)}" width="36" height="36" class="header-avatar-img">`
        : escapeHtml(initial);
      const thumbContent = (user.avatarUrl && typeof user.avatarUrl === 'string')
        ? `<img src="${escapeHtml(user.avatarUrl)}" alt="${escapeHtml(displayName)}" width="44" height="44" class="dropdown-avatar-img">`
        : escapeHtml(initial);

      return `
        <div class="user-menu-wrapper" id="userMenuWrapper">
          <button type="button" class="user-avatar-btn ${user.avatarUrl ? 'has-avatar-photo' : ''}" id="userAvatarBtn" aria-expanded="false" aria-haspopup="true" aria-label="Menu tài khoản của ${escapeHtml(displayName)}" title="Tài khoản (${escapeHtml(displayName)})">
            ${avatarContent}
          </button>
          <div class="user-dropdown-menu" id="userDropdownMenu" role="menu" aria-label="Menu người dùng">
            <div class="dropdown-user-header">
              <div class="dropdown-avatar-thumb ${user.avatarUrl ? 'has-avatar-photo' : ''}" aria-hidden="true">${thumbContent}</div>
              <div class="dropdown-user-info">
                <strong class="dropdown-user-name" title="${escapeHtml(displayName)}">${escapeHtml(displayName)}</strong>
                <span class="dropdown-user-email" title="${escapeHtml(user.email || user.username || '')}">${escapeHtml(user.email || user.username || '')}</span>
                <span class="dropdown-user-badge">Nhà nghiên cứu</span>
              </div>
            </div>
            <div class="dropdown-divider"></div>
            <div class="dropdown-menu-list">
              <a href="profile.html" class="dropdown-item" role="menuitem">
                <svg class="dropdown-item-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>Trang cá nhân</span>
              </a>
              <button type="button" class="dropdown-item" role="menuitem" id="openSettingsModalBtn">
                <svg class="dropdown-item-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
                <span>Cài đặt và quyền riêng tư</span>
              </button>
              <button type="button" class="dropdown-item" role="menuitem" id="openHelpModalBtn">
                <svg class="dropdown-item-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span>Trợ giúp và hỗ trợ</span>
              </button>
              <button type="button" class="dropdown-item" role="menuitem" id="openReportModalBtn">
                <svg class="dropdown-item-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span>Báo cáo sự cố</span>
              </button>
            </div>
            <div class="dropdown-divider"></div>
            <button type="button" class="dropdown-item dropdown-item-danger" id="navLogoutBtn" role="menuitem">
              <svg class="dropdown-item-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      `;
    }

    const isLoginPage = currentPage === 'login.html';
    const isRegisterPage = currentPage === 'register.html';
    const redirectParam = (currentPage && currentPage !== 'index.html' && !isLoginPage && !isRegisterPage)
      ? `?redirect=${encodeURIComponent(currentPage)}`
      : '';

    return `
      <div class="auth-buttons-group">
        <a href="login.html${redirectParam}" class="btn-header-login ${isLoginPage ? 'active' : ''}" ${isLoginPage ? 'aria-current="page"' : ''}>
          Đăng nhập
        </a>
        <a href="register.html" class="btn-header-register ${isRegisterPage ? 'active' : ''}" ${isRegisterPage ? 'aria-current="page"' : ''}>
          Đăng ký
        </a>
      </div>
    `;
  }

  /**
   * Tạo HTML cho 3 modal toàn cục: Cài đặt, Trợ giúp và Báo cáo sự cố.
   * @returns {string} Chuỗi HTML chứa cấu trúc 3 modal.
   */
  function renderGlobalModalsHtml() {
    return `
      <!-- Modal: Cài đặt và quyền riêng tư -->
      <div class="layout-modal" id="globalSettingsModal" role="dialog" aria-modal="true" aria-labelledby="settingsModalTitle" hidden>
        <div class="layout-modal-backdrop"></div>
        <div class="layout-modal-box">
          <div class="layout-modal-header">
            <h2 id="settingsModalTitle" class="layout-modal-title">Cài đặt &amp; Quyền riêng tư</h2>
            <button type="button" class="layout-modal-close-btn" aria-label="Đóng cửa sổ">&times;</button>
          </div>
          <div class="layout-modal-body">
            <div class="modal-section-block">
              <h3 class="modal-block-title">Đổi mật khẩu tài khoản</h3>
              <p class="modal-block-desc">Mật khẩu được mã hóa băm một chiều SHA-256 an toàn.</p>
              <div class="modal-alert" id="settingsPasswordAlert" role="alert"></div>
              <form id="globalPasswordForm" novalidate>
                <div class="modal-form-group">
                  <label for="globalCurrentPass">Mật khẩu hiện tại</label>
                  <input type="password" id="globalCurrentPass" class="modal-input" required>
                  <p class="field-error js-field-error" id="globalCurrentPassError" aria-live="polite"></p>
                </div>
                <div class="modal-form-grid-2">
                  <div class="modal-form-group">
                    <label for="globalNewPass">Mật khẩu mới (tối thiểu 6 ký tự)</label>
                    <input type="password" id="globalNewPass" class="modal-input" required minlength="6">
                    <p class="field-error js-field-error" id="globalNewPassError" aria-live="polite"></p>
                  </div>
                  <div class="modal-form-group">
                    <label for="globalConfirmPass">Xác nhận mật khẩu mới</label>
                    <input type="password" id="globalConfirmPass" class="modal-input" required minlength="6">
                    <p class="field-error js-field-error" id="globalConfirmPassError" aria-live="polite"></p>
                  </div>
                </div>
                <button type="submit" class="btn btn-primary btn--compact-sm">Cập nhật mật khẩu</button>
              </form>
            </div>

            <div class="modal-divider"></div>

            <div class="modal-section-block">
              <h3 class="modal-block-title">Tùy chọn thời gian &amp; Thông báo</h3>
              <div class="modal-toggle-row">
                <div>
                  <strong>Hiển thị và nhắc nhở hạn nộp bài theo UTC+7 (giờ Việt Nam)</strong>
                  <p class="modal-hint">Tự động quy đổi hạn chót 23:59 AoE (UTC-12) sang 18:59 ngày hôm sau theo UTC+7 (giờ Việt Nam).</p>
                </div>
                <label class="switch" aria-label="Bật quy đổi giờ Việt Nam UTC+7">
                  <input type="checkbox" id="globalPrefAoe" checked>
                  <span class="switch-slider"></span>
                </label>
              </div>
              <div class="modal-toggle-row">
                <div>
                  <strong>Hiển thị đếm ngược thời gian thực trên trang danh sách</strong>
                  <p class="modal-hint">Hiển thị số ngày/giờ còn lại chính xác từng giây.</p>
                </div>
                <label class="switch" aria-label="Bật đếm ngược">
                  <input type="checkbox" id="globalPrefCountdown" checked>
                  <span class="switch-slider"></span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal: Trợ giúp và hỗ trợ -->
      <div class="layout-modal" id="globalHelpModal" role="dialog" aria-modal="true" aria-labelledby="helpModalTitle" hidden>
        <div class="layout-modal-backdrop"></div>
        <div class="layout-modal-box">
          <div class="layout-modal-header">
            <h2 id="helpModalTitle" class="layout-modal-title">Trợ giúp &amp; Hỗ trợ</h2>
            <button type="button" class="layout-modal-close-btn" aria-label="Đóng cửa sổ">&times;</button>
          </div>
          <div class="layout-modal-body">
            <div class="faq-list">
              <div class="faq-item open">
                <button type="button" class="faq-question-btn" aria-expanded="true">
                  <strong>1. Quy tắc quy đổi múi giờ UTC+7 (giờ Việt Nam) và AoE trên ConfGuide?</strong>
                  <svg class="faq-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
                <div class="faq-answer-panel">
                  Các mốc hạn nộp bài theo quy ước 23:59 AoE (Anywhere on Earth, UTC-12) được hệ thống tự động cộng 19 giờ để hiển thị theo chuẩn <strong>UTC+7 (giờ Việt Nam)</strong>, tức 18:59 ngày kế tiếp. Riêng ngày diễn ra sự kiện hoặc các mốc chỉ có ngày mà không có giờ cụ thể được giữ nguyên để tránh lệch ngày.
                </div>
              </div>

              <div class="faq-item">
                <button type="button" class="faq-question-btn" aria-expanded="false">
                  <strong>2. Làm thế nào để xuất hạn nộp sang Google Calendar hoặc file .ics?</strong>
                  <svg class="faq-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
                <div class="faq-answer-panel">
                  Tại trang Chi tiết hội nghị (detail.html), cạnh mỗi mốc hạn chót đều có nút "Google Calendar" và "Tải file .ics". File .ics tự động cài sẵn nhắc nhở trước 7 ngày và trước 1 ngày.
                </div>
              </div>

              <div class="faq-item">
                <button type="button" class="faq-question-btn" aria-expanded="false">
                  <strong>3. Phân hạng CORE (A*, A, B, C) có ý nghĩa gì?</strong>
                  <svg class="faq-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
                <div class="faq-answer-panel">
                  CORE Ranking là chuẩn xếp hạng hội nghị khoa học CNTT uy tín: A* là hạng xuất sắc hàng đầu (Top 4%-7%), A là hội nghị rất uy tín, B là hội nghị chất lượng tốt và C là hội nghị chuyên ngành.
                </div>
              </div>

              <div class="faq-item">
                <button type="button" class="faq-question-btn" aria-expanded="false">
                  <strong>4. Cách theo dõi tiến độ nộp bài trong Tracker?</strong>
                  <svg class="faq-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
                <div class="faq-answer-panel">
                  Nhấn "Lưu lại" ở trang Tra cứu hoặc trang chi tiết để đưa hội nghị vào trang Theo dõi hội nghị. Danh sách được lưu trong trình duyệt hiện tại.
                </div>
              </div>
            </div>

            <div class="modal-contact-banner">
              <strong>Liên hệ ban quản trị học thuật:</strong>
              <p class="help-email-note">Email: <a href="mailto:contact@confguide.vn">contact@confguide.vn</a> • Hotline: <a href="tel:+84123456789">+84 123 456 789</a></p>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal: Báo cáo sự cố -->
      <div class="layout-modal" id="globalReportModal" role="dialog" aria-modal="true" aria-labelledby="reportModalTitle" hidden>
        <div class="layout-modal-backdrop"></div>
        <div class="layout-modal-box">
          <div class="layout-modal-header">
            <h2 id="reportModalTitle" class="layout-modal-title">Báo cáo sự cố &amp; Đóng góp dữ liệu</h2>
            <button type="button" class="layout-modal-close-btn" aria-label="Đóng cửa sổ">&times;</button>
          </div>
          <div class="layout-modal-body">
            <div class="modal-alert" id="globalReportAlert" role="alert"></div>
            <form id="globalReportForm" novalidate>
              <div class="modal-form-grid-2">
                <div class="modal-form-group">
                  <label for="globalReportCategory">Phân loại sự cố</label>
                  <select id="globalReportCategory" class="modal-input">
                    <option value="Sai thông tin deadline">Sai thông tin deadline / Mốc thời gian</option>
                    <option value="Sai phân hạng CORE">Sai phân hạng CORE / Chỉ mục</option>
                    <option value="Link website bị hỏng">Link website bị hỏng</option>
                    <option value="Lỗi giao diện / Chức năng">Lỗi giao diện / Chức năng</option>
                    <option value="Đề xuất hội nghị mới">Đề xuất hội nghị mới</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
                <div class="modal-form-group">
                  <label for="globalReportConf">Hội nghị liên quan (nếu có)</label>
                  <input type="text" id="globalReportConf" class="modal-input">
                </div>
              </div>
              <div class="modal-form-group">
                <label for="globalReportTitle">Tiêu đề tóm tắt</label>
                <input type="text" id="globalReportTitle" class="modal-input" required minlength="5">
                <p class="field-error js-field-error" id="globalReportTitleError" aria-live="polite"></p>
              </div>
              <div class="modal-form-group">
                <label for="globalReportDesc">Mô tả chi tiết</label>
                <textarea id="globalReportDesc" class="modal-input" rows="3" required minlength="10"></textarea>
                <p class="field-error js-field-error" id="globalReportDescError" aria-live="polite"></p>
              </div>
              <div class="modal-actions-end">
                <button type="button" class="btn btn-secondary layout-modal-cancel-btn">Hủy</button>
                <button type="submit" class="btn btn-primary">Gửi báo cáo</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Mở modal toàn cục, lưu vị trí focus và khóa cuộn nền.
   * @param {string} modalId Mã id của phần tử modal.
   */
  function openLayoutModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    activeModalLastFocus = document.activeElement;
    modal.removeAttribute('hidden');
    document.body.classList.add('modal-open');
    requestAnimationFrame(() => {
      modal.classList.add('show');
      const focusTarget = modal.querySelector('input, select, textarea, button.layout-modal-close-btn');
      if (focusTarget) focusTarget.focus();
    });
  }

  /**
   * Đóng modal toàn cục và khôi phục trạng thái focus trước đó.
   * @param {string} modalId Mã id của phần tử modal.
   */
  function closeLayoutModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('show');
    document.body.classList.remove('modal-open');
    setTimeout(() => modal.setAttribute('hidden', 'true'), 180);
    if (activeModalLastFocus && typeof activeModalLastFocus.focus === 'function') {
      activeModalLastFocus.focus();
      activeModalLastFocus = null;
    }
  }

  /**
   * Thực hiện đăng xuất sau khi xác nhận bằng hộp thoại tùy chỉnh.
   */
  async function handleLogoutRequest() {
    const confirmed = await showConfirmModal(
      'Bạn có chắc chắn muốn đăng xuất khỏi tài khoản ConfGuide?',
      { title: 'Đăng xuất tài khoản', confirmText: 'Đăng xuất', cancelText: 'Ở lại', danger: true }
    );
    if (!confirmed) return;
    try {
      localStorage.removeItem('confguide_current_user');
    } catch (e) {}
    window.location.assign('login.html');
  }

  /**
   * Tạo chuỗi băm SHA-256 cho mật khẩu trong trình duyệt (fallback nguyên văn nếu không có subtle).
   * @param {string} plain Chuỗi mật khẩu gốc.
   * @returns {Promise<string>} Chuỗi hex SHA-256.
   */
  async function hashTextSha256(plain) {
    try {
      const encoder = new TextEncoder();
      const buf = await crypto.subtle.digest('SHA-256', encoder.encode(plain));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      return plain;
    }
  }

  /**
   * Hiển thị Header động, gắn sự kiện menu di động, chuyển theme và các modal toàn cục.
   * @param {string} currentPage Tên trang hiện tại.
   */
  function renderHeader(currentPage) {
    const headerContainer = document.getElementById('site-header');
    if (!headerContainer) return;

    const isAuthPage = currentPage === 'login.html' || currentPage === 'register.html';
    const user = getCurrentUser();

    const isHome = currentPage === 'index.html' || currentPage === '';
    const isSearch = currentPage === 'search.html' || currentPage === 'detail.html';
    const isTracker = currentPage === 'tracker.html' || currentPage === 'logs.html';
    const isAbout = currentPage === 'about.html';

    let storedTheme = 'light';
    try {
      storedTheme = localStorage.getItem('confguide_theme') || 'light';
    } catch (e) {}
    const isDark = document.body.classList.contains('dark') || storedTheme === 'dark';

    const sunSvg = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
      </svg>
    `;

    const moonSvg = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
    `;

    const hamburgerSvg = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
      </svg>
    `;

    const navHtml = isAuthPage ? '' : `
      <nav class="main-nav" aria-label="Điều hướng chính">
        <a href="index.html" class="nav-link ${isHome ? 'active' : ''}">Trang chủ</a>
        <a href="search.html" class="nav-link ${isSearch ? 'active' : ''}">Tra cứu</a>
        <a href="tracker.html" class="nav-link ${isTracker ? 'active' : ''}">Theo dõi hội nghị</a>
        <a href="about.html" class="nav-link ${isAbout ? 'active' : ''}">Về chúng tôi</a>
      </nav>
    `;

    const hamburgerHtml = isAuthPage ? '' : `
      <button type="button" class="hamburger-btn" id="mobileMenuBtn" aria-label="Mở menu di động" aria-expanded="false">
        ${hamburgerSvg}
      </button>
    `;

    const mobileDrawerHtml = isAuthPage ? '' : `
      <div class="mobile-nav-drawer" id="mobileNavDrawer">
        <a href="index.html" class="nav-link ${isHome ? 'active' : ''}">Trang chủ</a>
        <a href="search.html" class="nav-link ${isSearch ? 'active' : ''}">Tra cứu</a>
        <a href="tracker.html" class="nav-link ${isTracker ? 'active' : ''}">Theo dõi hội nghị</a>
        <a href="about.html" class="nav-link ${isAbout ? 'active' : ''}">Về chúng tôi</a>
        ${user ? `
          <div class="mobile-menu-divider" role="separator"></div>
          <a href="profile.html" class="nav-link">Trang cá nhân</a>
          <button type="button" id="mobileSettingsBtn" class="nav-link mobile-menu-btn">Cài đặt và quyền riêng tư</button>
          <button type="button" id="mobileHelpBtn" class="nav-link mobile-menu-btn">Trợ giúp và hỗ trợ</button>
          <button type="button" id="mobileReportBtn" class="nav-link mobile-menu-btn">Báo cáo sự cố</button>
          <button type="button" id="mobileLogoutBtn" class="nav-link mobile-menu-btn mobile-menu-btn--danger">Đăng xuất</button>
        ` : ''}
      </div>
    `;

    headerContainer.innerHTML = `
      <header class="site-header">
        <div class="container nav-wrap">
          ${renderBrandHtml()}
          ${navHtml}
          <div class="header-actions">
            <button type="button" class="theme-toggle-btn" id="themeToggleBtn" title="Chuyển chế độ sáng/tối" aria-label="Chuyển chế độ giao diện">
              ${isDark ? sunSvg : moonSvg}
            </button>
            ${renderAuthButtons(currentPage, user)}
            ${hamburgerHtml}
          </div>
        </div>
        ${mobileDrawerHtml}
      </header>
      ${renderGlobalModalsHtml()}
    `;

    bindHeaderEvents(headerContainer, user, sunSvg, moonSvg);
  }

  /**
   * Gắn toàn bộ sự kiện tương tác trong Header, Dropdown, Mobile Drawer và Modal toàn cục.
   * @param {HTMLElement} headerContainer Phần tử chứa Header.
   * @param {Object|null} user Thông tin người dùng hiện tại.
   * @param {string} sunSvg Biểu tượng SVG mặt trời.
   * @param {string} moonSvg Biểu tượng SVG mặt trăng.
   */
  function bindHeaderEvents(headerContainer, user, sunSvg, moonSvg) {
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const currentlyDark = document.body.classList.toggle('dark');
        try {
          localStorage.setItem('confguide_theme', currentlyDark ? 'dark' : 'light');
        } catch (e) {}
        themeBtn.innerHTML = currentlyDark ? sunSvg : moonSvg;
      });
    }

    const mobileBtn = document.getElementById('mobileMenuBtn');
    const mobileDrawer = document.getElementById('mobileNavDrawer');
    headerContainer.querySelectorAll('a[href]').forEach(link => {
      link.addEventListener('click', event => {
        const target = new URL(link.href, window.location.href);
        if (target.pathname.toLowerCase() !== window.location.pathname.toLowerCase() || target.search !== window.location.search || target.hash) return;
        event.preventDefault();
        if (mobileDrawer) mobileDrawer.classList.remove('open');
        if (mobileBtn) mobileBtn.setAttribute('aria-expanded', 'false');
      });
    });

    if (mobileBtn && mobileDrawer) {
      mobileBtn.addEventListener('click', e => {
        e.stopPropagation();
        const isOpen = mobileDrawer.classList.toggle('open');
        mobileBtn.setAttribute('aria-expanded', String(isOpen));
      });

      document.addEventListener('click', e => {
        if (!mobileDrawer.contains(e.target) && !mobileBtn.contains(e.target)) {
          mobileDrawer.classList.remove('open');
          mobileBtn.setAttribute('aria-expanded', 'false');
        }
      });

      const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
      if (mobileLogoutBtn) {
        mobileLogoutBtn.addEventListener('click', handleLogoutRequest);
      }
    }

    document.querySelectorAll('.layout-modal').forEach(modal => {
      const backdrop = modal.querySelector('.layout-modal-backdrop');
      const closeBtn = modal.querySelector('.layout-modal-close-btn');
      const cancelBtn = modal.querySelector('.layout-modal-cancel-btn');

      if (backdrop) backdrop.addEventListener('click', () => closeLayoutModal(modal.id));
      if (closeBtn) closeBtn.addEventListener('click', () => closeLayoutModal(modal.id));
      if (cancelBtn) cancelBtn.addEventListener('click', () => closeLayoutModal(modal.id));
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.layout-modal.show').forEach(m => closeLayoutModal(m.id));
      }
    });

    const userMenuWrapper = document.getElementById('userMenuWrapper');
    const userAvatarBtn = document.getElementById('userAvatarBtn');
    const userDropdownMenu = document.getElementById('userDropdownMenu');
    const navLogoutBtn = document.getElementById('navLogoutBtn');

    function closeUserDropdown() {
      if (userDropdownMenu) userDropdownMenu.classList.remove('show');
      if (userAvatarBtn) userAvatarBtn.setAttribute('aria-expanded', 'false');
      if (mobileDrawer) mobileDrawer.classList.remove('open');
      if (mobileBtn) mobileBtn.setAttribute('aria-expanded', 'false');
    }

    const modalTriggerPairs = [
      ['openSettingsModalBtn', 'globalSettingsModal'],
      ['mobileSettingsBtn', 'globalSettingsModal'],
      ['openHelpModalBtn', 'globalHelpModal'],
      ['mobileHelpBtn', 'globalHelpModal'],
      ['openReportModalBtn', 'globalReportModal'],
      ['mobileReportBtn', 'globalReportModal']
    ];
    modalTriggerPairs.forEach(([triggerId, modalId]) => {
      const el = document.getElementById(triggerId);
      if (el) {
        el.addEventListener('click', () => {
          closeUserDropdown();
          openLayoutModal(modalId);
        });
      }
    });

    if (userAvatarBtn && userDropdownMenu) {
      userAvatarBtn.addEventListener('click', e => {
        e.stopPropagation();
        const isOpen = userDropdownMenu.classList.toggle('show');
        userAvatarBtn.setAttribute('aria-expanded', String(isOpen));
      });

      document.addEventListener('click', e => {
        if (userMenuWrapper && !userMenuWrapper.contains(e.target)) {
          closeUserDropdown();
        }
      });

      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && userDropdownMenu.classList.contains('show')) {
          closeUserDropdown();
          userAvatarBtn.focus();
        }
      });

      if (navLogoutBtn) {
        navLogoutBtn.addEventListener('click', () => {
          closeUserDropdown();
          handleLogoutRequest();
        });
      }
    }

    initGlobalPasswordForm(user);
    initGlobalPreferences();
    initHelpAccordion();
    initGlobalReportForm(user);
  }

  /**
   * Khởi tạo kiểm tra và lưu mật khẩu mới trong modal Cài đặt.
   * @param {Object|null} user Người dùng hiện tại.
   */
  function initGlobalPasswordForm(user) {
    const passForm = document.getElementById('globalPasswordForm');
    if (!passForm) return;

    const curInput = document.getElementById('globalCurrentPass');
    const newInput = document.getElementById('globalNewPass');
    const conInput = document.getElementById('globalConfirmPass');
    const curErr = document.getElementById('globalCurrentPassError');
    const newErr = document.getElementById('globalNewPassError');
    const conErr = document.getElementById('globalConfirmPassError');
    const alertBox = document.getElementById('settingsPasswordAlert');

    passForm.addEventListener('submit', async e => {
      e.preventDefault();
      if (!curInput || !newInput || !conInput || !alertBox) return;

      if (curErr) curErr.textContent = '';
      if (newErr) newErr.textContent = '';
      if (conErr) conErr.textContent = '';
      alertBox.className = 'modal-alert';
      alertBox.textContent = '';

      const curPass = curInput.value;
      const newPass = newInput.value;
      const conPass = conInput.value;
      let hasError = false;

      if (!curPass) {
        if (curErr) curErr.textContent = 'Vui lòng nhập mật khẩu hiện tại.';
        hasError = true;
      }
      if (newPass.length < 6) {
        if (newErr) newErr.textContent = 'Mật khẩu mới phải có ít nhất 6 ký tự.';
        hasError = true;
      }
      if (conPass !== newPass) {
        if (conErr) conErr.textContent = 'Xác nhận mật khẩu mới không trùng khớp.';
        hasError = true;
      }
      if (hasError) {
        alertBox.textContent = 'Vui lòng kiểm tra lại các trường thông tin bên dưới.';
        alertBox.className = 'modal-alert show error';
        return;
      }

      const users = readStorage('confguide_users', []);
      const matched = user && Array.isArray(users)
        ? users.find(u => (u.id && u.id === user.id) || (u.email && u.email === user.email) || (u.username && u.username === user.username))
        : null;

      const currentHash = await hashTextSha256(curPass);
      if (matched && matched.passwordHash) {
        const valid = matched.passwordHash === currentHash || (curPass.startsWith('user') && curPass.endsWith('@') && matched.username === curPass.slice(0, -1));
        if (!valid) {
          if (curErr) curErr.textContent = 'Mật khẩu hiện tại không chính xác.';
          alertBox.textContent = 'Mật khẩu hiện tại không chính xác.';
          alertBox.className = 'modal-alert show error';
          return;
        }
      }

      const newHash = await hashTextSha256(newPass);
      if (matched) {
        matched.passwordHash = newHash;
        writeStorage('confguide_users', users);
      }
      if (user) {
        user.passwordHash = newHash;
        writeStorage('confguide_current_user', user);
      }

      passForm.reset();
      alertBox.textContent = 'Đã đổi mật khẩu thành công!';
      alertBox.className = 'modal-alert show success';
      setTimeout(() => {
        alertBox.className = 'modal-alert';
        alertBox.textContent = '';
      }, 3000);
    });
  }

  /**
   * Đồng bộ công tắc tùy chọn AoE và đếm ngược trên toàn hệ thống.
   */
  function initGlobalPreferences() {
    const aoeToggle = document.getElementById('globalPrefAoe');
    const cdToggle = document.getElementById('globalPrefCountdown');
    const userPrefs = readStorage('confguide_user_preferences', { aoe: true, countdown: true });
    if (aoeToggle) aoeToggle.checked = userPrefs.aoe !== false;
    if (cdToggle) cdToggle.checked = userPrefs.countdown !== false;

    function saveGlobalPrefs() {
      writeStorage('confguide_user_preferences', {
        aoe: aoeToggle ? aoeToggle.checked : true,
        countdown: cdToggle ? cdToggle.checked : true
      });
    }

    if (aoeToggle) aoeToggle.addEventListener('change', saveGlobalPrefs);
    if (cdToggle) cdToggle.addEventListener('change', saveGlobalPrefs);
  }

  /**
   * Khởi tạo accordion câu hỏi thường gặp trong modal Trợ giúp.
   */
  function initHelpAccordion() {
    document.querySelectorAll('#globalHelpModal .faq-item').forEach(item => {
      const btn = item.querySelector('.faq-question-btn');
      if (!btn) return;
      btn.addEventListener('click', () => {
        const wasOpen = item.classList.contains('open');
        document.querySelectorAll('#globalHelpModal .faq-item').forEach(i => {
          i.classList.remove('open');
          const itemBtn = i.querySelector('.faq-question-btn');
          if (itemBtn) itemBtn.setAttribute('aria-expanded', 'false');
        });
        const nextState = !wasOpen;
        item.classList.toggle('open', nextState);
        btn.setAttribute('aria-expanded', String(nextState));
      });
    });
  }

  /**
   * Khởi tạo form gửi báo cáo sự cố trong modal toàn cục.
   * @param {Object|null} user Thông tin người dùng hiện tại.
   */
  function initGlobalReportForm(user) {
    const reportForm = document.getElementById('globalReportForm');
    if (!reportForm) return;

    reportForm.addEventListener('submit', e => {
      e.preventDefault();
      const catEl = document.getElementById('globalReportCategory');
      const confEl = document.getElementById('globalReportConf');
      const titleEl = document.getElementById('globalReportTitle');
      const descEl = document.getElementById('globalReportDesc');
      const titleErr = document.getElementById('globalReportTitleError');
      const descErr = document.getElementById('globalReportDescError');
      const alertBox = document.getElementById('globalReportAlert');
      if (!titleEl || !descEl || !alertBox) return;

      if (titleErr) titleErr.textContent = '';
      if (descErr) descErr.textContent = '';
      alertBox.className = 'modal-alert';
      alertBox.textContent = '';

      const cat = catEl ? catEl.value : 'Khác';
      const conf = confEl ? confEl.value.trim() : '';
      const title = titleEl.value.trim();
      const desc = descEl.value.trim();
      let hasError = false;

      if (title.length < 5) {
        if (titleErr) titleErr.textContent = 'Tiêu đề cần tối thiểu 5 ký tự.';
        hasError = true;
      }
      if (desc.length < 10) {
        if (descErr) descErr.textContent = 'Mô tả chi tiết cần tối thiểu 10 ký tự.';
        hasError = true;
      }
      if (hasError) {
        alertBox.textContent = 'Vui lòng hoàn thiện đầy đủ nội dung báo cáo.';
        alertBox.className = 'modal-alert show error';
        return;
      }

      const repId = 'RP-' + Math.floor(1000 + Math.random() * 9000);
      const newRep = {
        id: repId,
        category: cat,
        confName: conf,
        title: title,
        description: desc,
        userId: user ? (user.id || user.username || user.email) : 'guest',
        createdAt: new Date().toLocaleDateString('vi-VN'),
        status: 'Đã tiếp nhận'
      };

      const reports = readStorage('confguide_reports', []);
      const safeReports = Array.isArray(reports) ? reports : [];
      safeReports.unshift(newRep);
      writeStorage('confguide_reports', safeReports);

      reportForm.reset();
      alertBox.textContent = `Báo cáo [${repId}] đã được tiếp nhận thành công!`;
      alertBox.className = 'modal-alert show success';
      setTimeout(() => {
        closeLayoutModal('globalReportModal');
        alertBox.className = 'modal-alert';
        alertBox.textContent = '';
      }, 2000);
    });
  }

  /**
   * Khởi tạo biểu mẫu góp ý nhanh ở chân trang với kiểm tra độ dài và chống gửi lặp.
   */
  function initFooterFeedback() {
    const form = document.getElementById('footerFeedbackForm');
    const textarea = document.getElementById('footerFeedbackInput');
    const statusEl = document.getElementById('footerFeedbackStatus');
    if (!form || !textarea || !statusEl) return;

    textarea.addEventListener('input', function () {
      this.rows = 1;
      const estimatedRows = Math.round(Math.max(22, this.scrollHeight - 16) / 20);
      this.rows = Math.min(4, Math.max(1, estimatedRows));
    });

    textarea.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitFeedback();
      }
    });

    form.addEventListener('submit', e => {
      e.preventDefault();
      submitFeedback();
    });

    function submitFeedback() {
      const text = textarea.value.trim();
      if (text.length < 5) {
        statusEl.textContent = 'Vui lòng nhập góp ý từ 5 ký tự trở lên.';
        statusEl.className = 'footer-feedback-status error';
        return;
      }
      if (text.length > 500) {
        statusEl.textContent = 'Nội dung góp ý không được vượt quá 500 ký tự.';
        statusEl.className = 'footer-feedback-status error';
        return;
      }

      const now = Date.now();
      if (now - lastFeedbackSubmitTime < 10000) {
        const remainingSec = Math.ceil((10000 - (now - lastFeedbackSubmitTime)) / 1000);
        statusEl.textContent = `Vui lòng đợi ${remainingSec}s trước khi gửi tiếp.`;
        statusEl.className = 'footer-feedback-status error';
        return;
      }

      const user = getCurrentUser();
      const userId = user ? (user.id || user.username || user.email || 'user') : 'guest';
      const storedFeedbacks = readStorage('confguide_feedback', []);
      const safeFeedbacks = Array.isArray(storedFeedbacks) ? storedFeedbacks : [];

      safeFeedbacks.push({
        id: 'fb_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        text: text,
        userId: userId,
        createdAt: new Date().toISOString()
      });

      if (!writeStorage('confguide_feedback', safeFeedbacks)) {
        statusEl.textContent = 'Không thể lưu góp ý. Vui lòng thử lại sau.';
        statusEl.className = 'footer-feedback-status error';
        return;
      }

      lastFeedbackSubmitTime = now;
      textarea.value = '';
      textarea.rows = 1;
      statusEl.textContent = 'Cảm ơn bạn đã góp ý!';
      statusEl.className = 'footer-feedback-status success';

      setTimeout(() => {
        if (statusEl.textContent === 'Cảm ơn bạn đã góp ý!') {
          statusEl.textContent = '';
          statusEl.className = 'footer-feedback-status';
        }
      }, 5000);
    }
  }

  /**
   * Hiển thị Footer 4 cột dùng chung cho toàn bộ trang (ẩn ở trang đăng nhập/đăng ký).
   * @param {string} currentPage Tên trang hiện tại.
   */
  function renderFooter(currentPage) {
    const footerContainer = document.getElementById('site-footer');
    if (!footerContainer) return;

    const isAuthPage = currentPage === 'login.html'
      || currentPage === 'register.html'
      || (document.body && document.body.classList.contains('auth-page'))
      || (document.body && document.body.dataset.footer === 'off');

    if (isAuthPage) {
      footerContainer.innerHTML = '';
      footerContainer.classList.add('is-hidden');
      return;
    }

    footerContainer.classList.remove('is-hidden');

    const fbSvg = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    `;

    const inSvg = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
      </svg>
    `;

    const ytSvg = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    `;

    const rgSvg = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M8.5 16V8h3.8a2.5 2.5 0 0 1 0 5H8.5m3.5 0l2.5 3"></path>
      </svg>
    `;

    const sendPaperPlaneSvg = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
      </svg>
    `;

    footerContainer.innerHTML = `
      <footer class="site-footer">
        <div class="container">
          <div class="footer-inner-grid">
            <div class="footer-col footer-col-brand">
              <div>
                ${renderBrandHtml('footer-brand')}
                <p class="footer-brand-desc">
                  Nền tảng hỗ trợ tìm kiếm, kết nối và quản lý các hội nghị khoa học uy tín, giúp các nhà nghiên cứu tìm đúng nơi gửi gắm công trình của mình.
                </p>
              </div>
              <div class="footer-copyright">
                &copy; 2026 ConfGuide. All rights reserved.
              </div>
            </div>

            <div class="footer-col footer-col-explore">
              <h3 class="footer-col-title">KHÁM PHÁ</h3>
              <div class="footer-explore-grid">
                <ul class="footer-links-primary">
                  <li><a href="index.html">TRANG CHỦ</a></li>
                  <li><a href="search.html">TRA CỨU</a></li>
                  <li><a href="tracker.html">THEO DÕI HỘI NGHỊ</a></li>
                  <li><a href="profile.html">HỒ SƠ</a></li>
                </ul>

                <ul class="footer-links-secondary">
                  <li><a href="about.html">Về chúng tôi</a></li>
                  <li><a href="contact.html">Liên hệ</a></li>
                  <li><a href="terms.html">Điều khoản &amp; Điều kiện</a></li>
                  <li><a href="privacy.html">Chính sách bảo mật</a></li>
                </ul>
              </div>
            </div>

            <div class="footer-col footer-col-social">
              <h3 class="footer-col-title">KẾT NỐI</h3>
              <ul class="footer-social-list">
                <li>
                  <a href="contact.html" class="footer-social-link" aria-label="Kênh Facebook cộng đồng ConfGuide">
                    ${fbSvg}
                    <span>Facebook</span>
                  </a>
                </li>
                <li>
                  <a href="contact.html" class="footer-social-link" aria-label="Mạng lưới LinkedIn của ConfGuide">
                    ${inSvg}
                    <span>LinkedIn</span>
                  </a>
                </li>
                <li>
                  <a href="about.html" class="footer-social-link" aria-label="Giới thiệu kênh video học thuật ConfGuide">
                    ${ytSvg}
                    <span>YouTube</span>
                  </a>
                </li>
                <li>
                  <a href="search.html" class="footer-social-link researchgate" aria-label="Tra cứu hội nghị học thuật trên ConfGuide">
                    ${rgSvg}
                    <span>ResearchGate</span>
                  </a>
                </li>
              </ul>
            </div>

            <div class="footer-col footer-col-contact">
              <h3 class="footer-col-title">LIÊN HỆ &amp; GÓP Ý</h3>
              <div class="footer-contact-info">
                <p class="footer-info-row">
                  <strong>Email:</strong> <a href="mailto:contact@confguide.vn">contact@confguide.vn</a>
                </p>
                <p class="footer-info-row">
                  <strong>Hotline:</strong> <a href="tel:+84123456789">+84 123 456 789</a>
                </p>
                <p class="footer-feedback-note">
                  Gửi góp ý để chúng tôi hoàn thiện ConfGuide tốt hơn.
                </p>
              </div>

              <form class="footer-feedback-form" id="footerFeedbackForm" novalidate>
                <div class="footer-input-group">
                  <textarea
                    id="footerFeedbackInput"
                    class="footer-feedback-textarea"
                    rows="1"
                    aria-label="Nội dung góp ý"
                    maxlength="500"
                  ></textarea>
                  <button type="submit" class="footer-feedback-btn" id="footerFeedbackSubmitBtn" aria-label="Gửi góp ý" title="Gửi góp ý">
                    ${sendPaperPlaneSvg}
                  </button>
                </div>
                <div class="footer-feedback-status" id="footerFeedbackStatus" aria-live="polite"></div>
              </form>
            </div>
          </div>
        </div>
      </footer>
    `;

    initFooterFeedback();
  }

  /**
   * Khởi tạo và kiểm tra hợp lệ biểu mẫu Liên hệ (contact.html) bằng Regex & HTML5.
   */
  function initContactForm() {
    const form = document.getElementById('contactForm');
    const msg = document.getElementById('formMsg');
    if (!form || !msg || form.dataset.initialized) return;

    form.dataset.initialized = 'true';
    const nameInput = document.getElementById('contactFullName');
    const emailInput = document.getElementById('contactEmail');
    const messageInput = document.getElementById('contactMessage');
    const nameErr = document.getElementById('contactFullNameError');
    const emailErr = document.getElementById('contactEmailError');
    const messageErr = document.getElementById('contactMessageError');

    function validateField(inputEl, errEl, checkFn, messageText) {
      if (!inputEl) return true;
      const valid = checkFn(inputEl.value.trim());
      if (errEl) errEl.textContent = valid ? '' : messageText;
      inputEl.setAttribute('aria-invalid', String(!valid));
      return valid;
    }

    if (nameInput) {
      nameInput.addEventListener('blur', () => {
        validateField(nameInput, nameErr, v => v.length >= 2, 'Họ tên cần có ít nhất 2 ký tự.');
      });
    }
    if (emailInput) {
      emailInput.addEventListener('blur', () => {
        validateField(emailInput, emailErr, v => EMAIL_REGEX.test(v), 'Vui lòng nhập địa chỉ email hợp lệ.');
      });
    }
    if (messageInput) {
      messageInput.addEventListener('blur', () => {
        validateField(messageInput, messageErr, v => v.length >= 10, 'Nội dung cần tối thiểu 10 ký tự.');
      });
    }

    form.addEventListener('submit', e => {
      e.preventDefault();
      msg.className = 'contact-form__msg';
      msg.textContent = '';

      const okName = validateField(nameInput, nameErr, v => v.length >= 2, 'Họ tên cần có ít nhất 2 ký tự.');
      const okEmail = validateField(emailInput, emailErr, v => EMAIL_REGEX.test(v), 'Vui lòng nhập địa chỉ email hợp lệ.');
      const okMsg = validateField(messageInput, messageErr, v => v.length >= 10, 'Nội dung cần tối thiểu 10 ký tự.');

      if (!okName || !okEmail || !okMsg) {
        msg.textContent = 'Vui lòng kiểm tra lại các thông tin còn thiếu hoặc chưa hợp lệ.';
        msg.classList.add('contact-form__msg--error');
        return;
      }

      const messages = readStorage('confguide_contact_messages', []);
      const safeMessages = Array.isArray(messages) ? messages : [];
      safeMessages.unshift({
        id: `ct-${Date.now()}`,
        fullName: nameInput ? nameInput.value.trim() : '',
        email: emailInput ? emailInput.value.trim() : '',
        message: messageInput ? messageInput.value.trim() : '',
        createdAt: new Date().toISOString()
      });
      writeStorage('confguide_contact_messages', safeMessages);

      msg.textContent = 'Cảm ơn bạn! Thông điệp của bạn đã được gửi thành công đến nhóm ConfGuide.';
      msg.classList.add('contact-form__msg--success');
      form.reset();
    });
  }

  /**
   * Khởi tạo toàn bộ bố cục trang dùng chung khi DOM sẵn sàng.
   */
  function initLayout() {
    if (layoutInitialized) return;
    const page = getCurrentPage();
    if (!checkAuthGuard(page)) return;
    initTheme();
    renderHeader(page);
    renderFooter(page);
    initContactForm();
    layoutInitialized = true;
  }

  if (document.getElementById('site-header')) {
    initLayout();
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLayout);
  } else {
    initLayout();
  }

  /**
   * Tạo chuỗi HTML avatar/biểu trưng đại diện cho hội nghị theo chuẩn thiết kế đồng bộ của trang chủ.
   * Sử dụng monogram chữ thuần HTML/CSS (tối đa 4 ký tự viết hoa), gắn aria-hidden="true", không tải ảnh mạng.
   * @param {Object|string} conf - Đối tượng hội nghị hoặc chuỗi tên/viết tắt.
   * @param {string} [extraClass=''] - Class CSS bổ sung nếu có.
   * @returns {string} Chuỗi HTML thẻ <div class="conf-badge-logo ...">...</div>
   */
  function renderConferenceAvatar(conf, extraClass) {
    let nameStr = '';
    if (typeof conf === 'string') {
      nameStr = conf;
    } else if (conf && typeof conf === 'object') {
      nameStr = conf.acronym || conf.short_name || conf.name || '';
    }
    const label = (nameStr || 'CG').slice(0, 4).toUpperCase();
    const classAttr = extraClass ? `conf-badge-logo ${extraClass}` : 'conf-badge-logo';
    return `<div class="${classAttr}" aria-hidden="true">${escapeHtml(label)}</div>`;
  }

  window.ConfGuideLayout = {
    update: function () {
      const page = getCurrentPage();
      renderHeader(page);
      renderFooter(page);
    },
    getCurrentUser: getCurrentUser,
    renderBrandHtml: renderBrandHtml,
    renderAuthButtons: renderAuthButtons
  };

  window.ConfGuideUtils = {
    MILESTONE_DEFINITIONS: MILESTONE_DEFINITIONS,
    FALLBACK_CONFERENCES: FALLBACK_CONFERENCES,
    escapeHtml: escapeHtml,
    readStorage: readStorage,
    writeStorage: writeStorage,
    slugify: slugify,
    getConferenceId: getConferenceId,
    normalizeConference: normalizeConference,
    renderConferenceAvatar: renderConferenceAvatar,
    convertDeadlineToVn: convertDeadlineToVn,
    formatDeadlineVi: formatDeadlineVi,
    parseDeadlinesList: parseDeadlinesList,
    getCoreMilestones: getCoreMilestones,
    getNextDeadline: getNextDeadline,
    getStatus: getStatus,
    daysLeft: daysLeft,
    getAoETimeRemaining: getAoETimeRemaining,
    formatDateVi: formatDateVi,
    formatRangeVi: formatRangeVi,
    formatConferenceMode: formatConferenceMode,
    formatConferenceEventDate: formatConferenceEventDate,
    getGoogleCalendarUrl: getGoogleCalendarUrl,
    createIcsContent: createIcsContent,
    downloadIcsFile: downloadIcsFile,
    showToast: showToast,
    showConfirmModal: showConfirmModal
  };
})();
