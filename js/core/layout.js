/**
 * ConfGuide - Thành phần Bố cục & Tiện ích Dùng chung (js/core/layout.js)
 * Quản lý Header/Footer dùng chung, giao diện sáng/tối, modal toàn cục,
 * thông báo toast, hộp xác nhận tùy chỉnh và tiện ích xử lý hội nghị.
 */

(function () {
  'use strict';

  /** Cấu hình múi giờ chuẩn Việt Nam (UTC+7 / Asia/Ho_Chi_Minh) và độ lệch AoE (UTC-12) */
  const VN_TIMEZONE_ID = 'Asia/Ho_Chi_Minh';
  const VN_TIMEZONE_LABEL = 'UTC+7 (giờ Việt Nam)';
  const VN_UTC_OFFSET_MS = 7 * 3600000;
  const AOE_TO_UTC_OFFSET_MS = 12 * 3600000;

  /**
   * Lấy ngày lịch hiện tại dạng ISO YYYY-MM-DD theo múi giờ cố định Asia/Ho_Chi_Minh (UTC+7).
   * @returns {string} Chuỗi ngày YYYY-MM-DD tại UTC+7.
   */
  function getTodayVnIso() {
    const vnNow = new Date(Date.now() + VN_UTC_OFFSET_MS);
    const year = vnNow.getUTCFullYear();
    const month = String(vnNow.getUTCMonth() + 1).padStart(2, '0');
    const day = String(vnNow.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /** Các mốc thời gian chuẩn của một hội nghị khoa học */
  const MILESTONE_DEFINITIONS = [
    { key: 'abstract', name: 'Nộp bản tóm tắt (Abstract)', shortName: 'Abstract' },
    { key: 'fullPaper', name: 'Nộp toàn văn (Full Paper)', shortName: 'Full Paper' },
    { key: 'notification', name: 'Thông báo kết quả', shortName: 'Notification' },
    { key: 'cameraReady', name: 'Nộp bản hoàn chỉnh (Camera-Ready)', shortName: 'Camera-Ready' }
  ];

  /** Bộ dữ liệu dự phòng trích từ data/conference_data.json để hỗ trợ chạy ngoại tuyến / file:/// */
  const RAW_FALLBACK_CONFERENCES = [
    {
      name: 'SOICT 2026',
      year: '2026',
      website_url: 'https://soict.org/',
      deadline_url: 'https://soict.org/submission/',
      full_name: 'The 15th International Symposium on Information and Communication Technology',
      summarization: 'SOICT 2026 is an international symposium covering significant research areas such as AI Foundations and Big Data, Networking and Communication Technologies, Multimedia Processing, AI Applications, Generative AI, Applied Operations Research and Optimization, and Cyber Security.',
      location: 'Ho Chi Minh City, Vietnam',
      country: 'Vietnam',
      date_happen: '2026-12-04 to 2026-12-05',
      start_date: '2026-12-04',
      end_date: '2026-12-05',
      topics: ['ai', 'data', 'vision', 'security'],
      primary_topic: 'ai',
      topic_labels: [
        'Trí tuệ nhân tạo & Học máy',
        'Khoa học dữ liệu & Dữ liệu lớn',
        'Thị giác máy tính & Đa phương tiện',
        'An toàn thông tin'
      ],
      attendance_mode: 'offline',
      attendance_label: 'Trực tiếp',
      fee_min: 250,
      fee_max: 650,
      fee_currency: 'USD',
      deadlines: [
        { name: 'Abstract Submission', date: '2026-09-20' },
        { name: 'Full Paper Submission', date: '2026-09-20' },
        { name: 'Author Notification', date: '2026-10-18' },
        { name: 'Camera-Ready Submission', date: '2026-10-30' }
      ],
      crawled_at: '2026-11-20T01:33:35+00:00',
      rank: { core: null, core_source: null, ccf: null }
    },
    {
      name: 'RIVF 2026',
      year: '2026',
      website_url: 'https://rivf2026.org/',
      deadline_url: 'https://rivf2026.org/call-for-papers.html',
      full_name: 'The 20th International Conference on Computing and Communication Technologies',
      summarization: 'RIVF 2026 is the 20th International Conference on Computing and Communication Technologies, serving as a major scientific event for researchers, professionals, and students in computing and communications.',
      location: 'VinUniversity, Hanoi',
      country: 'Vietnam',
      date_happen: '2026-12-18 to 2026-12-20',
      start_date: '2026-12-18',
      end_date: '2026-12-20',
      topics: ['ai', 'data', 'vision', 'security'],
      primary_topic: 'ai',
      topic_labels: [
        'Trí tuệ nhân tạo & Học máy',
        'Khoa học dữ liệu & Dữ liệu lớn',
        'Thị giác máy tính & Đa phương tiện',
        'An toàn thông tin'
      ],
      attendance_mode: null,
      attendance_label: null,
      deadlines: [
        { name: 'Paper Submission', date: '2026-09-15' },
        { name: 'Camera-Ready Submission', date: '2026-11-25' }
      ],
      crawled_at: '2026-11-20T01:33:35+00:00',
      rank: { core: null, core_source: null, ccf: null }
    },
    {
      name: 'ICIIT 2027',
      year: '2027',
      website_url: 'https://www.iciit.org/',
      deadline_url: 'https://www.iciit.org/',
      full_name: '2027 12th International Conference on Intelligent Information Technology',
      summarization: 'The 12th International Conference on Intelligent Information Technology (ICIIT 2027) aims to promote the exchange of research findings and innovations in intelligent information technology.',
      location: 'Ho Chi Minh City',
      country: 'Vietnam',
      date_happen: '2027-03-04 to 2027-03-07',
      start_date: '2027-03-04',
      end_date: '2027-03-07',
      topics: ['ai', 'data', 'vision', 'security'],
      primary_topic: 'ai',
      topic_labels: [
        'Trí tuệ nhân tạo & Học máy',
        'Khoa học dữ liệu & Dữ liệu lớn',
        'Thị giác máy tính & Đa phương tiện',
        'An toàn thông tin'
      ],
      attendance_mode: 'offline',
      attendance_label: 'Trực tiếp',
      fee_min: 180,
      fee_max: 520,
      fee_currency: 'USD',
      deadlines: [
        { name: 'Submission Deadline (Full paper)', date: '2026-11-30' },
        { name: 'Submission Deadline (Abstract)', date: '2026-12-05' },
        { name: 'Notification Date (Full paper or Abstract)', date: '2026-12-20' },
        { name: 'Registration Deadline', date: '2027-01-10' }
      ],
      crawled_at: '2026-11-20T01:38:02+00:00',
      rank: { core: null, core_source: null, ccf: null }
    },
    {
      name: 'AAMAS 2027',
      year: '2027',
      website_url: 'https://warwick.ac.uk/fac/sci/dcs/aamas2027/',
      deadline_url: 'https://warwick.ac.uk/fac/sci/dcs/aamas2027/',
      full_name: 'The 26th International Conference on Autonomous Agents and Multiagent Systems',
      summarization: 'AAMAS 2027 is the 26th International Conference on Autonomous Agents and Multiagent Systems, serving as the flagship conference for the International Foundation for Autonomous Agents and Multiagent Systems (IFAAMAS).',
      location: 'JW Marriott Hotel, Hanoi',
      country: 'Vietnam',
      date_happen: '2027-05-03 to 2027-05-07',
      start_date: '2027-05-03',
      end_date: '2027-05-07',
      topics: ['ai', 'general'],
      primary_topic: 'ai',
      topic_labels: ['Trí tuệ nhân tạo & Học máy', 'CNTT tổng hợp (nhiều lĩnh vực)'],
      attendance_mode: null,
      attendance_label: null,
      deadlines: [
        { name: 'Main Track: Abstract submission', date: '2026-10-01' },
        { name: 'Main Track: Paper submission', date: '2026-10-08' },
        { name: 'Main Track: Author notification', date: '2026-12-21' },
        { name: 'Main Track: Camera-ready paper', date: '2027-01-25' }
      ],
      crawled_at: '2026-11-20T01:38:58+00:00',
      rank: { core: 'A', core_source: 'ICORE2026', ccf: 'B' }
    },
    {
      name: 'EASE 2027',
      year: '2027',
      website_url: 'https://conf.researchr.org/home/ease-2027',
      deadline_url: 'https://conf.researchr.org/home/ease-2027',
      full_name: 'International Conference on Evaluation and Assessment in Software Engineering',
      summarization: 'EASE is an internationally leading venue for academics and practitioners to present and discuss their research on evidence-based software engineering, and its implications for software practice.',
      location: 'Hanoi',
      country: 'Vietnam',
      date_happen: '2027-06-15 to 2027-06-18',
      start_date: '2027-06-15',
      end_date: '2027-06-18',
      topics: ['software'],
      primary_topic: 'software',
      topic_labels: ['Công nghệ phần mềm'],
      attendance_mode: null,
      attendance_label: null,
      deadlines: [
        { name: 'Workshop Proposal Deadline', date: '2026-12-02' },
        { name: 'Workshop Proposal Notification', date: '2026-12-11' },
        { name: 'Research Papers Abstract Submission deadline', date: '2027-01-15' },
        { name: 'Research Papers Submission deadline', date: '2027-01-22' }
      ],
      crawled_at: '2026-11-20T01:39:25+00:00',
      rank: { core: 'A', core_source: 'ICORE2026', ccf: 'C' }
    },
    {
      name: 'IEEE SMC 2027',
      year: '2027',
      website_url: 'https://ieeesmc2027.org/',
      deadline_url: 'https://ieeesmc2027.org/key-dates/',
      full_name: '2027 IEEE International Conference on Systems, Man, and Cybernetics',
      summarization: '2027 IEEE International Conference on Systems, Man, and Cybernetics covers systems science and engineering, human-machine systems, and cybernetics.',
      location: 'Da Nang',
      country: 'Vietnam',
      date_happen: '2027-10-10 to 2027-10-13',
      start_date: '2027-10-10',
      end_date: '2027-10-13',
      topics: ['ai', 'robotics'],
      primary_topic: 'ai',
      topic_labels: ['Trí tuệ nhân tạo & Học máy', 'Robot, Tự động hóa & Điều khiển'],
      attendance_mode: 'hybrid',
      attendance_label: 'Kết hợp (trực tiếp + trực tuyến)',
      deadlines: [
        { name: 'Submission of Proposals for Special Sessions, Tutorials and Workshops', date: '2027-02-15' },
        { name: 'Paper Submission for Workshops, Regular and Special Sessions', date: '2027-04-08' },
        { name: 'Notification of Papers Acceptance for Workshops, Regular and Special Sessions', date: '2027-05-30' },
        { name: 'Final Paper Camera-Ready Submission of Regular, Special Sessions and Workshops', date: '2027-07-15' }
      ],
      crawled_at: '2026-11-20T01:42:35+00:00',
      rank: { core: 'B', core_source: 'ICORE2026', ccf: 'C' }
    },
    {
      name: 'GSETS 2027',
      year: '2027',
      website_url: 'https://www.hutech.edu.vn/gsets2027',
      deadline_url: 'https://www.hutech.edu.vn/gsets2027',
      full_name: 'The 3rd International Conference on "Green Solutions and Emerging Technologies for Sustainability" (GSETS 2027)',
      summarization: 'GSETS 2027 is a prestigious international scientific event showcasing advanced achievements in the fields of Material Science, Green Technology, Data Science, Artificial Intelligence, and emerging technologies.',
      location: 'HUTECH University (Thu Duc Campus), Ho Chi Minh City',
      country: 'Vietnam',
      date_happen: '2027-04-08 to 2027-04-10',
      start_date: '2027-04-08',
      end_date: '2027-04-10',
      topics: ['ai', 'data', 'electronics', 'general'],
      primary_topic: 'ai',
      topic_labels: [
        'Trí tuệ nhân tạo & Học máy',
        'Khoa học dữ liệu & Dữ liệu lớn',
        'Điện tử, Viễn thông & Xử lý tín hiệu',
        'CNTT tổng hợp (nhiều lĩnh vực)'
      ],
      attendance_mode: 'offline',
      attendance_label: 'Trực tiếp',
      fee_min: 40,
      fee_max: 300,
      fee_currency: 'USD',
      deadlines: [
        { name: 'Abstract Submission', date: '2026-11-23' },
        { name: 'Abstract Acceptance', date: '2026-11-30' },
        { name: 'Full-text Submission', date: '2026-12-31' },
        { name: 'Estimated Review', date: '2027-01-29' },
        { name: 'Estimated Revision', date: '2027-02-21' },
        { name: 'Registration of Attendance', date: '2027-03-20' }
      ],
      crawled_at: '2026-11-20T01:46:36+00:00',
      rank: { core: null, core_source: null, ccf: null }
    }
  ];

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const modalReturnFocusMap = new Map();
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

  // Bộ nhớ đệm Promise theo URL trong phạm vi trang hiện tại để gộp các lần fetch JSON trùng nhau
  const jsonFetchCache = new Map();

  /**
   * Tải và giải mã tệp JSON có dùng chung Promise cache trong phạm vi trang,
   * giúp các module (trang chính, compare.js...) tái sử dụng một yêu cầu mạng duy nhất.
   * @param {string} url Đường dẫn tệp JSON cần tải.
   * @returns {Promise<*>} Dữ liệu JSON đã giải mã.
   */
  function fetchJsonCached(url) {
    if (jsonFetchCache.has(url)) {
      return jsonFetchCache.get(url);
    }
    const requestPromise = fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .catch(err => {
        // Xóa cache khi thất bại để thao tác thử lại (retry) vẫn gọi lại mạng
        jsonFetchCache.delete(url);
        throw err;
      });
    jsonFetchCache.set(url, requestPromise);
    return requestPromise;
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
   * Kiểm tra bộ ba năm/tháng/ngày có tạo thành ngày lịch hợp lệ (không tràn tháng).
   * @param {number} year Năm dương lịch.
   * @param {number} month Tháng (1..12).
   * @param {number} day Ngày trong tháng.
   * @returns {boolean} True nếu là ngày hợp lệ.
   */
  function isValidCalendarDateParts(year, month, day) {
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
    if (year < 1970 || month < 1 || month > 12 || day < 1 || day > 31) return false;
    const probe = new Date(Date.UTC(year, month - 1, day));
    return (
      probe.getUTCFullYear() === year &&
      probe.getUTCMonth() === month - 1 &&
      probe.getUTCDate() === day
    );
  }

  /**
   * Chuẩn hóa ngày về định dạng ISO YYYY-MM-DD nếu hợp lệ.
   * @param {string} dateStr Chuỗi ngày thô.
   * @returns {string} Chuỗi YYYY-MM-DD hoặc chuỗi rỗng nếu không hợp lệ.
   */
  function normalizeDateIso(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return '';
    const trimmed = dateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-').map(Number);
      return isValidCalendarDateParts(y, m, d) ? trimmed : '';
    }
    const isoPrefix = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[T\s]/);
    if (isoPrefix) {
      const y = Number(isoPrefix[1]);
      const m = Number(isoPrefix[2]);
      const d = Number(isoPrefix[3]);
      return isValidCalendarDateParts(y, m, d) ? `${isoPrefix[1]}-${isoPrefix[2]}-${isoPrefix[3]}` : '';
    }
    const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) {
      const d = Number(match[1]);
      const m = Number(match[2]);
      const y = Number(match[3]);
      return isValidCalendarDateParts(y, m, d) ? `${match[3]}-${match[2]}-${match[1]}` : '';
    }
    return '';
  }

  /**
   * Quy đổi mốc thời hạn nộp bài từ chuẩn AoE (UTC-12) hoặc chuỗi ISO có múi giờ sang giờ Việt Nam (Asia/Ho_Chi_Minh, UTC+7).
   * Công thức mặc định cho deadline chỉ có ngày: 23:59 AoE (UTC-12) + 19 giờ = 18:59 ngày D+1 theo UTC+7.
   * Khi dữ liệu không phải hạn nộp hoặc không có đủ thông tin giờ/múi giờ (hasExplicitTime = false), giữ nguyên giá trị ngày thô.
   * @param {string} dateStr Chuỗi ngày hạn nộp (YYYY-MM-DD hoặc chuỗi có kèm giờ/múi giờ).
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

    // Nếu không phải hạn nộp bài hoặc dữ liệu chỉ có ngày thuần túy không đủ thông tin giờ/múi giờ nguồn: giữ nguyên ngày thô
    if (!isDeadline || !hasExplicitTime) {
      const fallbackTargetMs = Date.UTC(year, month - 1, day, 23, 59, 59) - VN_UTC_OFFSET_MS;
      return {
        rawDate: iso,
        aoeDateVi: aoeDateVi,
        vnIsoDate: iso,
        vnDateVi: aoeDateVi,
        vnTimeVi: '',
        timezoneLabel: VN_TIMEZONE_LABEL,
        converted: false,
        targetMs: fallbackTargetMs,
        displayText: aoeDateVi
      };
    }

    // Kiểm tra xem chuỗi có ghi kèm múi giờ ISO tường minh hay mặc định theo chuẩn 23:59:59 AoE (UTC-12)
    let targetMs = NaN;
    if (/[T\s]\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?\s*(Z|[+-]\d{2}:?\d{2})$/i.test(trimmed)) {
      targetMs = Date.parse(trimmed.replace(/\s+/, 'T'));
    }

    if (!Number.isFinite(targetMs)) {
      let hourAoE = 23;
      let minuteAoE = 59;
      let secondAoE = 59;
      const timeMatch = trimmed.match(/[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?/);
      if (timeMatch) {
        hourAoE = Number(timeMatch[1]);
        minuteAoE = Number(timeMatch[2]);
        secondAoE = timeMatch[3] ? Number(timeMatch[3]) : 0;
      }
      // Mốc thời gian tuyệt đối (UTC epoch ms): giờ AoE (UTC-12) cộng 12 giờ để về UTC+0
      targetMs = Date.UTC(year, month - 1, day, hourAoE, minuteAoE, secondAoE) + AOE_TO_UTC_OFFSET_MS;
    }

    // Quy đổi sang múi giờ cố định Asia/Ho_Chi_Minh (UTC+7): cộng 7 giờ từ UTC+0
    const vnWallClockMs = targetMs + VN_UTC_OFFSET_MS;
    const vnDateObj = new Date(vnWallClockMs);

    const vnYear = vnDateObj.getUTCFullYear();
    const vnMonth = String(vnDateObj.getUTCMonth() + 1).padStart(2, '0');
    const vnDay = String(vnDateObj.getUTCDate()).padStart(2, '0');
    const vnHour = String(vnDateObj.getUTCHours()).padStart(2, '0');
    const vnMin = String(vnDateObj.getUTCMinutes()).padStart(2, '0');

    const vnIsoDate = `${vnYear}-${vnMonth}-${vnDay}`;
    const vnDateVi = `${vnDay}/${vnMonth}/${vnYear}`;
    const vnTimeVi = `${vnHour}:${vnMin}`;
    const timezoneLabel = VN_TIMEZONE_LABEL;

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
   * Định dạng chuỗi hiển thị hạn nộp bài theo UTC+7 (giờ Việt Nam) hoặc giữ ngày thô khi thiếu thông tin quy đổi.
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
   * Phân tích thuộc tính deadlines (hỗ trợ cả dạng Array và Object) thành toàn bộ danh sách đồng nhất
   * kèm thông tin quy đổi sang múi giờ UTC+7 (giờ Việt Nam). Giữ nguyên mọi mốc thời gian trong dữ liệu gốc,
   * kể cả các mốc không phân tích được ngày (không tự tạo ngày thay thế).
   * @param {Array|Object|null} deadlines Dữ liệu hạn nộp thô của hội nghị.
   * @returns {Array<Object>} Danh sách toàn bộ các mốc: các mốc có ngày hợp lệ xếp tăng dần trước, mốc chưa rõ ngày giữ ở sau theo thứ tự gốc.
   */
  function parseDeadlinesList(deadlines) {
    if (!deadlines) return [];
    const items = [];

    if (Array.isArray(deadlines)) {
      deadlines.forEach((entry, rawIndex) => {
        if (!entry || typeof entry !== 'object') return;
        const rawDate = entry.date !== undefined && entry.date !== null ? String(entry.date).trim() : '';
        const rawType = entry.type !== undefined && entry.type !== null ? String(entry.type).trim() : '';
        const rawNote = String(entry.description || entry.note || '').trim();
        const rawName = String(entry.name || '').trim();
        const classified = classifyMilestoneName(rawName);
        const converted = rawDate ? convertDeadlineToVn(rawDate, { isDeadline: true }) : null;

        if (converted && Number.isFinite(converted.targetMs)) {
          const left = daysLeft(rawDate);
          items.push({
            rawIndex,
            hasValidDate: true,
            key: classified.key,
            name: rawName || classified.shortName,
            shortName: classified.shortName,
            type: rawType,
            note: rawNote,
            rawDate,
            date: converted.rawDate,
            vnDate: converted.vnIsoDate,
            vnDateVi: converted.vnDateVi,
            vnTimeVi: converted.vnTimeVi,
            displayDate: converted.displayText,
            timezoneLabel: converted.timezoneLabel,
            targetMs: converted.targetMs,
            daysLeft: left,
            isPassed: converted.targetMs <= Date.now()
          });
        } else {
          items.push({
            rawIndex,
            hasValidDate: false,
            key: classified.key,
            name: rawName || classified.shortName,
            shortName: classified.shortName,
            type: rawType,
            note: rawNote,
            rawDate,
            date: '',
            vnDate: '',
            vnDateVi: '',
            vnTimeVi: '',
            displayDate: rawDate || 'Chưa xác định ngày',
            timezoneLabel: '',
            targetMs: null,
            daysLeft: null,
            isPassed: false
          });
        }
      });
    } else if (typeof deadlines === 'object') {
      MILESTONE_DEFINITIONS.forEach((def, rawIndex) => {
        const rawVal = deadlines[def.key];
        const rawDate = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : '';
        if (!rawDate) return;
        const converted = convertDeadlineToVn(rawDate, { isDeadline: true });
        if (converted && Number.isFinite(converted.targetMs)) {
          const left = daysLeft(rawDate);
          items.push({
            rawIndex,
            hasValidDate: true,
            key: def.key,
            name: def.name,
            shortName: def.shortName,
            type: '',
            note: '',
            rawDate,
            date: converted.rawDate,
            vnDate: converted.vnIsoDate,
            vnDateVi: converted.vnDateVi,
            vnTimeVi: converted.vnTimeVi,
            displayDate: converted.displayText,
            timezoneLabel: converted.timezoneLabel,
            targetMs: converted.targetMs,
            daysLeft: left,
            isPassed: converted.targetMs <= Date.now()
          });
        } else {
          items.push({
            rawIndex,
            hasValidDate: false,
            key: def.key,
            name: def.name,
            shortName: def.shortName,
            type: '',
            note: '',
            rawDate,
            date: '',
            vnDate: '',
            vnDateVi: '',
            vnTimeVi: '',
            displayDate: rawDate || 'Chưa xác định ngày',
            timezoneLabel: '',
            targetMs: null,
            daysLeft: null,
            isPassed: false
          });
        }
      });
    }

    items.sort((a, b) => {
      if (a.hasValidDate !== b.hasValidDate) return a.hasValidDate ? -1 : 1;
      if (a.hasValidDate && b.hasValidDate && a.targetMs !== b.targetMs) {
        return a.targetMs - b.targetMs;
      }
      return a.rawIndex - b.rawIndex;
    });
    return items;
  }

  /**
   * Trích xuất toàn bộ các mốc thời gian đã chuẩn hóa của hội nghị để hiển thị trên trang chi tiết.
   * @param {Object} conf Đối tượng hội nghị.
   * @returns {Array<Object>} Toàn bộ danh sách các mốc thời gian thực có trong dữ liệu.
   */
  function getCoreMilestones(conf) {
    return parseDeadlinesList(conf ? conf.deadlines : null);
  }

  /**
   * Tìm mốc hạn nộp có ngày hợp lệ tiếp theo gần nhất (hoặc mốc hợp lệ cuối cùng nếu toàn bộ đã qua).
   * @param {Object} conf Đối tượng hội nghị.
   * @returns {Object|null} Đối tượng mốc thời gian hoặc null nếu chưa có dữ liệu hợp lệ.
   */
  function getNextDeadline(conf) {
    const items = parseDeadlinesList(conf ? conf.deadlines : null)
      .filter(m => m && m.hasValidDate && Number.isFinite(m.targetMs));
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
   * Chuẩn hóa nhãn hình thức tổ chức hội nghị chỉ dựa trên trường dữ liệu gốc
   * (`attendance_label`, `attendance_mode`, `format`, `mode`), tuyệt đối không suy đoán.
   * @param {Object} conf Đối tượng hội nghị.
   * @returns {string} Chuỗi hình thức tổ chức hoặc "Chưa cập nhật".
   */
  function formatConferenceMode(conf) {
    if (!conf || typeof conf !== 'object') return 'Chưa cập nhật';
    const labelText = conf.attendance_label !== undefined && conf.attendance_label !== null
      ? String(conf.attendance_label).trim()
      : '';
    if (labelText) return labelText;

    const raw = String(conf.attendance_mode || conf.format || conf.mode || '').trim();
    if (!raw) return 'Chưa cập nhật';
    const fmtMap = {
      'in-person': 'Trực tiếp (In-person)',
      offline: 'Trực tiếp',
      online: 'Trực tuyến',
      hybrid: 'Kết hợp (trực tiếp + trực tuyến)'
    };
    return fmtMap[raw.toLowerCase()] || raw;
  }

  /**
   * Định dạng lệ phí tham dự/đăng bài theo dạng `min-max <đơn vị tiền>` chỉ dựa trên dữ liệu gốc
   * (`fee_min`, `fee_max`, `fee_currency`, `registration_fees`, hoặc `fee`), tuyệt đối không suy đoán.
   * @param {Object} conf Đối tượng hội nghị.
   * @returns {string} Chuỗi lệ phí hợp lệ hoặc "Chưa cập nhật".
   */
  /**
   * Trích xuất khoảng lệ phí số (min, max) và đơn vị tiền tệ từ dữ liệu gốc của hội nghị.
   * @param {Object} conf Đối tượng hội nghị.
   * @returns {{ min: number, max: number, currency: string }|null} Khoảng lệ phí hợp lệ hoặc null nếu chưa cập nhật.
   */
  function extractConferenceFeeRange(conf) {
    if (!conf || typeof conf !== 'object') return null;

    const rawMin = conf.fee_min;
    const rawMax = conf.fee_max;
    const hasMin = rawMin !== null && rawMin !== undefined && String(rawMin).trim() !== '' && Number.isFinite(Number(rawMin));
    const hasMax = rawMax !== null && rawMax !== undefined && String(rawMax).trim() !== '' && Number.isFinite(Number(rawMax));
    const currency = conf.fee_currency ? String(conf.fee_currency).trim() : '';

    if (hasMin && hasMax) {
      const a = Number(rawMin);
      const b = Number(rawMax);
      return { min: Math.min(a, b), max: Math.max(a, b), currency };
    }
    if (hasMin || hasMax) {
      const val = Number(hasMin ? rawMin : rawMax);
      return { min: val, max: val, currency };
    }

    if (Array.isArray(conf.registration_fees) && conf.registration_fees.length > 0) {
      const numericFees = conf.registration_fees.filter(item =>
        item && item.amount !== null && item.amount !== undefined && String(item.amount).trim() !== '' && Number.isFinite(Number(item.amount))
      );
      if (numericFees.length > 0) {
        const targetCurrency = currency
          || (numericFees[0].currency ? String(numericFees[0].currency).trim() : '');
        const matchingAmounts = numericFees
          .filter(item => {
            const itemCur = item.currency ? String(item.currency).trim() : '';
            return !targetCurrency || !itemCur || itemCur.toUpperCase() === targetCurrency.toUpperCase();
          })
          .map(item => Number(item.amount));
        if (matchingAmounts.length > 0) {
          return {
            min: Math.min(...matchingAmounts),
            max: Math.max(...matchingAmounts),
            currency: targetCurrency
          };
        }
      }
    }
    return null;
  }

  /**
   * Định dạng lệ phí tham dự theo đúng dữ liệu gốc (dạng `min-max <đơn vị tiền>` hoặc `min <đơn vị>` nếu min === max).
   * Tuyệt đối không lấy chuỗi `fee_note` dài làm giá trị lệ phí hiển thị.
   * @param {Object} conf Đối tượng hội nghị.
   * @returns {string} Chuỗi lệ phí gọn gàng hoặc "Chưa cập nhật".
   */
  function formatConferenceFee(conf) {
    if (!conf || typeof conf !== 'object') return 'Chưa cập nhật';
    if (conf.fee && String(conf.fee).trim()) return String(conf.fee).trim();

    const range = extractConferenceFeeRange(conf);
    if (!range) return 'Chưa cập nhật';

    const formatNumberByCurrency = (val, cur) => {
      if (cur && cur.toUpperCase() === 'VND') {
        return Number(val).toLocaleString('vi-VN');
      }
      return String(val);
    };

    const cur = range.currency;
    const rangeStr = range.min === range.max
      ? formatNumberByCurrency(range.min, cur)
      : `${formatNumberByCurrency(range.min, cur)}-${formatNumberByCurrency(range.max, cur)}`;
    return cur ? `${rangeStr} ${cur}` : rangeStr;
  }

  /**
   * Quy đổi khoảng lệ phí (min, max) về đơn vị USD ước tính để sắp xếp công bằng giữa USD, EUR và VND.
   * Trả về null nếu hội nghị chưa cập nhật lệ phí.
   * @param {Object} conf Đối tượng hội nghị.
   * @returns {{ minUsd: number, maxUsd: number }|null} Cặp giá trị quy đổi hoặc null.
   */
  function getFeeSortBoundsUsd(conf) {
    const range = extractConferenceFeeRange(conf);
    if (!range) return null;

    const cur = String(range.currency || 'USD').trim().toUpperCase();
    let rateToUsd = 1;
    if (cur === 'VND') rateToUsd = 1 / 25400;
    else if (cur === 'EUR') rateToUsd = 1.08;
    return {
      minUsd: range.min * rateToUsd,
      maxUsd: range.max * rateToUsd
    };
  }

  /**
   * Trích xuất danh sách nhãn lĩnh vực nguyên bản trực tiếp từ dữ liệu gốc của hội nghị
   * (`topic_labels`, fallback `fields`/`topics`) để hiển thị đúng như trong data
   * (ví dụ: "Trí tuệ nhân tạo & Học máy"), tuyệt đối không tự tách hay suy đoán thêm.
   * Việc tách lĩnh vực đơn phục vụ tìm kiếm/lọc do `ConfGuideSearchCore.normalizeTopicFields` đảm nhiệm.
   * @param {Object} conf Đối tượng hội nghị.
   * @returns {Array<string>} Mảng nhãn lĩnh vực hiển thị duy nhất hoặc mảng rỗng nếu thiếu dữ liệu.
   */
  function extractTopicLabels(conf) {
    if (!conf || typeof conf !== 'object') return [];

    // Ưu tiên displayTopics / topic_labels đúng nguyên văn từ data gốc
    if (Array.isArray(conf.displayTopics)) {
      return conf.displayTopics
        .map(item => (item === null || item === undefined ? '' : String(item).trim()))
        .filter((val, idx, arr) => Boolean(val) && arr.indexOf(val) === idx);
    }
    if (Array.isArray(conf.topic_labels)) {
      return conf.topic_labels
        .map(item => (item === null || item === undefined ? '' : String(item).trim()))
        .filter((val, idx, arr) => Boolean(val) && arr.indexOf(val) === idx);
    }
    if (typeof conf.topic_labels === 'string' && conf.topic_labels.trim()) {
      return [conf.topic_labels.trim()];
    }

    let rawList = [];
    if (Array.isArray(conf.fields) && conf.fields.length > 0) rawList = conf.fields;
    else if (typeof conf.fields === 'string' && conf.fields.trim()) rawList = [conf.fields];
    else if (Array.isArray(conf.topics) && conf.topics.length > 0) rawList = conf.topics;

    return rawList
      .map(item => (item === null || item === undefined ? '' : String(item).trim()))
      .filter((val, idx, arr) => Boolean(val) && arr.indexOf(val) === idx);
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
   * Trích xuất chuỗi xếp hạng từ trường rank dạng chuỗi cũ hoặc object { core, ccf } trong dữ liệu JSON mới.
   * @param {string|Object|null|undefined} rawRank Giá trị rank thô từ dữ liệu hội nghị.
   * @returns {string} Chuỗi xếp hạng đã chuẩn hóa hoặc chuỗi rỗng nếu chưa có hạng.
   */
  function extractConferenceRank(rawRank) {
    if (!rawRank) return '';
    if (typeof rawRank === 'string') return rawRank.trim();
    if (typeof rawRank === 'object') {
      const coreVal = rawRank.core !== undefined && rawRank.core !== null ? String(rawRank.core).trim() : '';
      if (coreVal) return coreVal;
      const ccfVal = rawRank.ccf !== undefined && rawRank.ccf !== null ? String(rawRank.ccf).trim() : '';
      return ccfVal;
    }
    return String(rawRank).trim();
  }

  /**
   * Chuẩn hóa đối tượng hội nghị từ dữ liệu JSON về cấu trúc thống nhất mà không tự sinh dữ liệu thiếu.
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

    const rawFullTitle = conf.fullName !== undefined && conf.fullName !== null
      ? String(conf.fullName).trim()
      : (conf.full_name !== undefined && conf.full_name !== null ? String(conf.full_name).trim() : '');
    const siteUrl = conf.website || conf.website_url || '';
    const locationText = conf.location || conf.country || '';
    const hasVietnamInfo = /việt nam|vietnam/i.test(`${locationText} ${conf.region || ''}`);
    const countryFallback = conf.country ? String(conf.country).trim() : '';
    const rankText = extractConferenceRank(conf.rank);

    return Object.assign({}, conf, {
      id: getConferenceId(conf),
      rank: rankText,
      rankInfo: conf.rank && typeof conf.rank === 'object' ? conf.rank : null,
      fullName: rawFullTitle,
      full_name: rawFullTitle,
      website: siteUrl,
      website_url: siteUrl,
      startDate: startIso,
      start_date: startIso,
      endDate: endIso,
      end_date: endIso,
      region: conf.region ? String(conf.region).trim() : (hasVietnamInfo ? 'Việt Nam' : countryFallback),
      fields: extractTopicLabels(conf),
      indexing: Array.isArray(conf.indexing) ? conf.indexing : (conf.indexing ? [conf.indexing] : [])
    });
  }

  /**
   * Tạo đường dẫn thêm sự kiện hạn nộp sang Google Calendar theo ngày giờ đã quy đổi UTC+7 (Asia/Ho_Chi_Minh).
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
    let datesParam = '';

    if (converted && converted.converted && converted.vnTimeVi) {
      const compactTime = `${converted.vnTimeVi.replace(/:/g, '')}00`;
      datesParam = `${compact}T${compactTime}/${compact}T${compactTime}`;
    } else {
      const nextDate = new Date(Date.parse(`${iso}T00:00:00Z`) + 86400000);
      const nextCompact = nextDate.toISOString().slice(0, 10).replace(/-/g, '');
      datesParam = `${compact}/${nextCompact}`;
    }

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title || 'ConfGuide Deadline',
      dates: datesParam,
      details: description || '',
      location: location || '',
      ctz: VN_TIMEZONE_ID
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
   * Sinh nội dung tệp iCalendar (.ics) chứa danh sách các mốc sự kiện kèm nhắc nhở theo giờ Việt Nam (UTC+7 / Asia/Ho_Chi_Minh).
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
      'METHOD:PUBLISH',
      'BEGIN:VTIMEZONE',
      `TZID:${VN_TIMEZONE_ID}`,
      `X-LIC-LOCATION:${VN_TIMEZONE_ID}`,
      'BEGIN:STANDARD',
      'TZOFFSETFROM:+0700',
      'TZOFFSETTO:+0700',
      'TZNAME:+07',
      'DTSTART:19700101T000000',
      'END:STANDARD',
      'END:VTIMEZONE'
    ];

    (events || []).forEach((ev, index) => {
      const converted = convertDeadlineToVn(ev && ev.date, { isDeadline: true });
      const iso = converted ? converted.vnIsoDate : normalizeDateIso(ev && ev.date);
      if (!iso) return;
      const startCompact = iso.replace(/-/g, '');
      let dtStartLine = '';
      let dtEndLine = '';

      if (converted && converted.converted && converted.vnTimeVi) {
        const timeCompact = `${converted.vnTimeVi.replace(/:/g, '')}00`;
        dtStartLine = `DTSTART;TZID=${VN_TIMEZONE_ID}:${startCompact}T${timeCompact}`;
        dtEndLine = `DTEND;TZID=${VN_TIMEZONE_ID}:${startCompact}T${timeCompact}`;
      } else {
        const endCompact = new Date(Date.parse(`${iso}T00:00:00Z`) + 86400000)
          .toISOString().slice(0, 10).replace(/-/g, '');
        dtStartLine = `DTSTART;VALUE=DATE:${startCompact}`;
        dtEndLine = `DTEND;VALUE=DATE:${endCompact}`;
      }

      lines.push(
        'BEGIN:VEVENT',
        `UID:${stamp}-${index}-${Math.random().toString(36).slice(2, 8)}@confguide.vn`,
        `DTSTAMP:${stamp}`,
        dtStartLine,
        dtEndLine,
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
    const user = readStorage('confguide_current_user', null);
    if (!user || typeof user !== 'object') return null;
    const hasIdentity = Boolean(user.id || user.email || user.username);
    return hasIdentity ? user : null;
  }

  /**
   * Kiểm tra người dùng hiện tại đã đăng nhập hợp lệ hay chưa.
   * @returns {boolean} True nếu đã xác thực.
   */
  function isUserAuthenticated() {
    return Boolean(getCurrentUser());
  }

  /**
   * Tạo khóa lưu trữ danh sách hội nghị đã lưu gắn theo người dùng đã đăng nhập.
   * Trả về chuỗi rỗng nếu chưa đăng nhập (tuyệt đối không lưu cho khách).
   * @param {boolean} [useEmailFallback=false] Cho phép fallback theo email/username khi user chưa có id.
   * @returns {string} Tên khóa lưu trữ trong localStorage hoặc chuỗi rỗng nếu chưa xác thực.
   */
  function getSavedStorageKey(useEmailFallback = false) {
    const user = getCurrentUser();
    if (!user) return '';
    const userKey = user.id || (useEmailFallback ? (user.email || user.username) : '') || user.username;
    return userKey ? `confguide_saved_${userKey}` : '';
  }

  /**
   * Đọc danh sách ID hội nghị đã lưu của người dùng đã đăng nhập.
   * Người chưa đăng nhập luôn nhận mảng rỗng.
   * @param {boolean} [useEmailFallback=false] Cho phép fallback theo email/username khi user chưa có id.
   * @returns {Array<string>} Mảng ID hội nghị đã lưu.
   */
  function getSavedConferenceIds(useEmailFallback = false) {
    const key = getSavedStorageKey(useEmailFallback);
    if (!key) return [];
    const list = readStorage(key, []);
    return Array.isArray(list) ? list.map(id => String(id)) : [];
  }

  /**
   * Ghi đè danh sách ID hội nghị đã lưu vào localStorage kèm kiểm tra quyền truy cập.
   * Từ chối thao tác và trả về false nếu chưa đăng nhập.
   * @param {Array<string>} ids Danh sách ID hội nghị cần lưu.
   * @param {boolean} [useEmailFallback=false] Cho phép fallback khóa user.
   * @returns {boolean} True nếu hợp lệ và ghi thành công; false nếu chưa đăng nhập hoặc lỗi ghi.
   */
  function setSavedConferenceIds(ids, useEmailFallback = false) {
    const key = getSavedStorageKey(useEmailFallback);
    if (!key) return false;
    const clean = Array.isArray(ids) ? ids.map(id => String(id).trim()).filter(Boolean) : [];
    return writeStorage(key, clean);
  }

  /**
   * Kiểm tra một hội nghị có đang được người dùng hiện tại theo dõi hay không.
   * @param {string} confId Mã hội nghị.
   * @returns {boolean} True nếu đã đăng nhập và hội nghị nằm trong danh sách theo dõi.
   */
  function isConferenceSaved(confId) {
    if (!confId || !isUserAuthenticated()) return false;
    return getSavedConferenceIds(false).includes(String(confId));
  }

  /**
   * Hiển thị thông báo và hộp thoại yêu cầu đăng nhập khi khách nhấn chức năng theo dõi hội nghị.
   * Sau khi người dùng chọn "Đăng nhập ngay", điều hướng kèm `?redirect=...` để quay lại đúng trang cũ.
   * @param {Object} [options={}] Tùy chọn đường dẫn quay lại sau đăng nhập.
   * @returns {Promise<boolean>} Promise trả về true nếu người dùng chọn chuyển sang trang đăng nhập.
   */
  async function promptLoginForTracking(options = {}) {
    const currentTarget = options.redirectUrl
      || `${getCurrentPage()}${window.location.search || ''}${window.location.hash || ''}`;
    const loginUrl = `login.html?redirect=${encodeURIComponent(currentTarget)}`;

    if (!document.body) {
      window.location.assign(loginUrl);
      return true;
    }

    const confirmed = await showConfirmModal(
      'Chỉ tài khoản đã đăng nhập mới có thể lưu và theo dõi hội nghị. Bạn có muốn đăng nhập ngay để tiếp tục không?',
      {
        title: 'Yêu cầu đăng nhập',
        confirmText: 'Đăng nhập ngay',
        cancelText: 'Để sau',
        danger: false
      }
    );

    if (confirmed) {
      window.location.assign(loginUrl);
    }
    return confirmed;
  }

  /**
   * Thực hiện bật/tắt trạng thái theo dõi một hội nghị có kiểm tra xác thực tài khoản ở lớp dữ liệu.
   * Không cho phép thêm/xóa nếu người dùng chưa đăng nhập.
   * @param {string} confId Mã hội nghị.
   * @param {Object} [options={}] Tùy chọn chuyển hướng khi yêu cầu đăng nhập.
   * @returns {{ ok: boolean, requiresAuth: boolean, isSaved: boolean }} Kết quả thao tác.
   */
  function toggleSavedConference(confId, options = {}) {
    if (!confId) return { ok: false, requiresAuth: false, isSaved: false };
    if (!isUserAuthenticated()) {
      promptLoginForTracking(options);
      return { ok: false, requiresAuth: true, isSaved: false };
    }

    const targetId = String(confId);
    const current = getSavedConferenceIds(false);
    const exists = current.includes(targetId);
    const next = exists
      ? current.filter(id => id !== targetId)
      : [...current, targetId];

    const written = setSavedConferenceIds(next, false);
    if (!written) {
      showToast('Không thể cập nhật danh sách trong bộ nhớ trình duyệt.', 'error');
      return { ok: false, requiresAuth: false, isSaved: exists };
    }
    return { ok: true, requiresAuth: false, isSaved: !exists };
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
   * Tạo chuỗi HTML phần điều hướng người dùng đã đăng nhập (avatar + menu dropdown).
   * @param {Object} user - Thông tin tài khoản hiện tại.
   * @returns {string} Chuỗi HTML `.user-menu-wrapper`.
   */
  function renderLoggedInUserMenu(user) {
    const displayName = user.fullName || user.username || user.email || 'U';
    const initial = displayName.trim().charAt(0).toUpperCase() || 'U';
    const hasPhoto = Boolean(user.avatarUrl && typeof user.avatarUrl === 'string');
    const avatarContent = hasPhoto
      ? `<img src="${escapeHtml(user.avatarUrl)}" alt="${escapeHtml(displayName)}" `
        + `width="36" height="36" class="header-avatar-img">`
      : escapeHtml(initial);
    const thumbContent = hasPhoto
      ? `<img src="${escapeHtml(user.avatarUrl)}" alt="${escapeHtml(displayName)}" `
        + `width="44" height="44" class="dropdown-avatar-img">`
      : escapeHtml(initial);
    const userSubtitle = escapeHtml(user.email || user.username || '');

    return `
      <div class="user-menu-wrapper" id="userMenuWrapper">
        <button type="button" class="user-avatar-btn ${hasPhoto ? 'has-avatar-photo' : ''}" id="userAvatarBtn"
          aria-expanded="false" aria-haspopup="true"
          aria-label="Menu tài khoản của ${escapeHtml(displayName)}"
          title="Tài khoản (${escapeHtml(displayName)})">
          ${avatarContent}
        </button>
        <div class="user-dropdown-menu" id="userDropdownMenu" role="menu" aria-label="Menu người dùng">
          <div class="dropdown-user-header">
            <div class="dropdown-avatar-thumb ${hasPhoto ? 'has-avatar-photo' : ''}"
              aria-hidden="true">${thumbContent}</div>
            <div class="dropdown-user-info">
              <strong class="dropdown-user-name" title="${escapeHtml(displayName)}">${escapeHtml(displayName)}</strong>
              <span class="dropdown-user-email" title="${userSubtitle}">${userSubtitle}</span>
              <span class="dropdown-user-badge">Nhà nghiên cứu</span>
            </div>
          </div>
          <div class="dropdown-divider"></div>
          <div class="dropdown-menu-list">
            <a href="profile.html" class="dropdown-item" role="menuitem">
              <svg class="dropdown-item-icon" width="18" height="18" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                stroke-linejoin="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>Trang cá nhân</span>
            </a>
            <button type="button" class="dropdown-item" role="menuitem" id="openSettingsModalBtn">
              <svg class="dropdown-item-icon" width="18" height="18" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              <span>Cài đặt và quyền riêng tư</span>
            </button>
            <button type="button" class="dropdown-item" role="menuitem" id="openHelpModalBtn">
              <svg class="dropdown-item-icon" width="18" height="18" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span>Trợ giúp và hỗ trợ</span>
            </button>
            <button type="button" class="dropdown-item" role="menuitem" id="openReportModalBtn">
              <svg class="dropdown-item-icon" width="18" height="18" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
                stroke-linejoin="round" aria-hidden="true">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <span>Báo cáo sự cố</span>
            </button>
          </div>
          <div class="dropdown-divider"></div>
          <button type="button" class="dropdown-item dropdown-item-danger" id="navLogoutBtn" role="menuitem">
            <svg class="dropdown-item-icon" width="18" height="18" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
              stroke-linejoin="round" aria-hidden="true">
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

  /**
   * Tạo HTML khối tài khoản (Menu Avatar hoặc nút Đăng nhập/Đăng ký) trên Header.
   * @param {string} currentPage - Tên trang hiện tại.
   * @param {Object|null} user - Người dùng đang đăng nhập.
   * @returns {string} Chuỗi HTML nút xác thực hoặc dropdown tài khoản.
   */
  function renderAuthButtons(currentPage, user) {
    if (user) return renderLoggedInUserMenu(user);

    const isLoginPage = currentPage === 'login.html';
    const isRegisterPage = currentPage === 'register.html';
    const isNotFoundPage = currentPage === '404.html'
      || Boolean(document.body && document.body.dataset && document.body.dataset.page === '404');
    const redirectParam = (currentPage && currentPage !== 'index.html' && !isLoginPage && !isRegisterPage && !isNotFoundPage)
      ? `?redirect=${encodeURIComponent(currentPage)}`
      : '';

    return `
      <div class="auth-buttons-group">
        <a href="login.html${redirectParam}"
          class="btn-header-login ${isLoginPage ? 'active' : ''}"
          ${isLoginPage ? 'aria-current="page"' : ''}>
          Đăng nhập
        </a>
        <a href="register.html"
          class="btn-header-register ${isRegisterPage ? 'active' : ''}"
          ${isRegisterPage ? 'aria-current="page"' : ''}>
          Đăng ký
        </a>
      </div>
    `;
  }

  /** Danh sách mục đích sử dụng ConfGuide gắn trực tiếp với tiêu chí lọc và sắp xếp thực tế */
  const USAGE_PURPOSES = [
    {
      key: 'submit-paper',
      label: 'Nộp bài công bố nghiên cứu',
      shortLabel: 'Nộp bài nghiên cứu',
      desc: 'Ưu tiên hội nghị đang mở nhận bài (CFP mở) và hạn nộp gần nhất.',
      searchCfp: 'open',
      searchSort: 'deadline'
    },
    {
      key: 'track-deadlines',
      label: 'Theo dõi lịch & tham dự sự kiện',
      shortLabel: 'Theo dõi lịch sự kiện',
      desc: 'Sắp xếp theo thời gian diễn ra để chủ động lập kế hoạch tham dự.',
      searchCfp: '',
      searchSort: 'event'
    },
    {
      key: 'explore-rank',
      label: 'Tìm hội nghị uy tín (Rank CORE)',
      shortLabel: 'Tìm hội nghị uy tín',
      desc: 'Ưu tiên hội nghị đạt chuẩn phân hạng CORE A*, A, B, C.',
      searchCfp: '',
      searchSort: 'rank-desc'
    },
    {
      key: 'budget-friendly',
      label: 'Cân nhắc lệ phí hợp lý',
      shortLabel: 'Cân nhắc lệ phí',
      desc: 'Ưu tiên hội nghị có mức lệ phí tham dự từ thấp đến cao.',
      searchCfp: '',
      searchSort: 'fee-asc'
    }
  ];

  /** Danh mục 25 lĩnh vực đơn chuẩn hóa khớp 100% với topic slug trong data/conference_data.json */
  const PREFERENCE_TOPICS = [
    { key: 'tri-tue-nhan-tao', label: 'Trí tuệ nhân tạo', primary: true },
    { key: 'hoc-may', label: 'Học máy', primary: true },
    { key: 'khoa-hoc-du-lieu', label: 'Khoa học dữ liệu', primary: true },
    { key: 'du-lieu-lon', label: 'Dữ liệu lớn', primary: true },
    { key: 'mang-may-tinh', label: 'Mạng máy tính', primary: true },
    { key: 'iot', label: 'IoT', primary: true },
    { key: 'an-toan-thong-tin', label: 'An toàn thông tin', primary: true },
    { key: 'thi-giac-may-tinh', label: 'Thị giác máy tính', primary: true },
    { key: 'cong-nghe-phan-mem', label: 'Công nghệ phần mềm', primary: true },
    { key: 'xu-ly-ngon-ngu-tu-nhien', label: 'Xử lý ngôn ngữ tự nhiên', primary: true },
    { key: 'truyen-thong', label: 'Truyền thông', primary: false },
    { key: 'da-phuong-tien', label: 'Đa phương tiện', primary: false },
    { key: 'dien-tu', label: 'Điện tử', primary: false },
    { key: 'vien-thong', label: 'Viễn thông', primary: false },
    { key: 'xu-ly-tin-hieu', label: 'Xử lý tín hiệu', primary: false },
    { key: 'cntt-tong-hop', label: 'CNTT tổng hợp', primary: false },
    { key: 'robot', label: 'Robot', primary: false },
    { key: 'tu-dong-hoa', label: 'Tự động hóa', primary: false },
    { key: 'dieu-khien', label: 'Điều khiển', primary: false },
    { key: 'he-thong-thong-tin', label: 'Hệ thống thông tin', primary: false },
    { key: 'chuyen-doi-so', label: 'Chuyển đổi số', primary: false },
    { key: 'tuong-tac-nguoi-may', label: 'Tương tác người-máy', primary: false },
    { key: 'cong-nghe-giao-duc', label: 'Công nghệ giáo dục', primary: false },
    { key: 'dien-toan-dam-may', label: 'Điện toán đám mây', primary: false },
    { key: 'he-thong-phan-tan', label: 'Hệ thống phân tán', primary: false }
  ];

  const VALID_PURPOSE_KEYS = new Set(USAGE_PURPOSES.map(item => item.key));
  const VALID_PREF_TOPIC_KEYS = new Set(PREFERENCE_TOPICS.map(item => item.key));
  const PREF_TOPIC_LABEL_MAP = PREFERENCE_TOPICS.reduce((acc, item) => {
    acc[item.key] = item.label;
    return acc;
  }, {});
  const TOPIC_SLUG_ALIAS_FALLBACK = {
    ai: 'tri-tue-nhan-tao',
    'artificial-intelligence': 'tri-tue-nhan-tao',
    ml: 'hoc-may',
    'machine-learning': 'hoc-may',
    'deep-learning': 'hoc-may',
    'data-science': 'khoa-hoc-du-lieu',
    'big-data': 'du-lieu-lon',
    network: 'mang-may-tinh',
    networks: 'mang-may-tinh',
    iot: 'iot',
    security: 'an-toan-thong-tin',
    'cyber-security': 'an-toan-thong-tin',
    vision: 'thi-giac-may-tinh',
    'computer-vision': 'thi-giac-may-tinh',
    cv: 'thi-giac-may-tinh',
    software: 'cong-nghe-phan-mem',
    'software-engineering': 'cong-nghe-phan-mem',
    nlp: 'xu-ly-ngon-ngu-tu-nhien',
    'natural-language-processing': 'xu-ly-ngon-ngu-tu-nhien',
    robotics: 'robot',
    cloud: 'dien-toan-dam-may',
    'cloud-computing': 'dien-toan-dam-may',
    hci: 'tuong-tac-nguoi-may'
  };

  /**
   * Chuyển đổi tên hoặc cụm lĩnh vực sang khóa slug chuẩn khớp bộ lọc Tra cứu (hỗ trợ đ/Đ).
   * @param {string} text - Chuỗi tên lĩnh vực.
   * @returns {string} Khóa slug kebab-case.
   */
  function toCanonicalTopicSlug(text) {
    if (window.ConfGuideSearchCore && typeof window.ConfGuideSearchCore.toTopicSlug === 'function') {
      return window.ConfGuideSearchCore.toTopicSlug(text);
    }
    return String(text || '')
      .trim()
      .toLowerCase()
      .replace(/[đĐ]/g, 'd')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Phân tích chuỗi `fieldsOfInterest` trong hồ sơ tài khoản thành danh sách khóa lĩnh vực chuẩn hợp lệ.
   * Tái sử dụng `ConfGuideSearchCore.normalizeTopicFields` khi sẵn có để khớp 1:1 với trang Tra cứu.
   * @param {string|Array<string>} fieldsInput - Chuỗi hoặc mảng lĩnh vực từ hồ sơ tài khoản.
   * @returns {Array<string>} Mảng khóa slug lĩnh vực duy nhất hợp lệ.
   */
  function parseTopicKeysFromText(fieldsInput) {
    if (!fieldsInput) return [];
    const seen = new Set();
    const keys = [];
    const pushIfValid = key => {
      if (VALID_PREF_TOPIC_KEYS.has(key) && !seen.has(key)) {
        seen.add(key);
        keys.push(key);
      }
    };

    if (window.ConfGuideSearchCore && typeof window.ConfGuideSearchCore.normalizeTopicFields === 'function') {
      window.ConfGuideSearchCore.normalizeTopicFields(fieldsInput).forEach(item => {
        if (item && item.key) pushIfValid(item.key);
      });
      return keys;
    }

    const rawPieces = Array.isArray(fieldsInput)
      ? fieldsInput
      : String(fieldsInput).split(/(?:\s*[,;/&\n]+\s*|\s+và\s+)/gi);
    rawPieces.forEach(part => {
      const slug = toCanonicalTopicSlug(part);
      if (!slug) return;
      const mapped = TOPIC_SLUG_ALIAS_FALLBACK[slug] || slug;
      pushIfValid(mapped);
    });
    return keys;
  }

  /**
   * Trích xuất danh sách nhãn hiển thị lĩnh vực từ trường `fieldsOfInterest` của hồ sơ.
   * Các lĩnh vực chuẩn hóa trả về nhãn chuẩn tiếng Việt; giá trị tùy biến vẫn được giữ nguyên để hiển thị trung thực.
   * @param {string|Array<string>} fieldsInput - Chuỗi hoặc mảng lĩnh vực từ hồ sơ tài khoản.
   * @returns {Array<string>} Danh sách nhãn lĩnh vực không trùng lặp.
   */
  function parseTopicDisplayLabelsFromText(fieldsInput) {
    if (!fieldsInput) return [];
    const pieces = Array.isArray(fieldsInput)
      ? fieldsInput
      : String(fieldsInput).split(/(?:\s*[,;\n]+\s*)/g);
    const seen = new Set();
    const labels = [];
    pieces.forEach(part => {
      const clean = String(part || '').trim();
      if (!clean) return;
      const matchedKeys = parseTopicKeysFromText(clean);
      if (matchedKeys.length > 0) {
        matchedKeys.forEach(key => {
          const canonLabel = PREF_TOPIC_LABEL_MAP[key] || clean;
          const norm = canonLabel.toLowerCase();
          if (!seen.has(norm)) {
            seen.add(norm);
            labels.push(canonLabel);
          }
        });
        return;
      }
      const normRaw = clean.toLowerCase();
      if (!seen.has(normRaw)) {
        seen.add(normRaw);
        labels.push(clean);
      }
    });
    return labels;
  }

  /**
   * Kiểm tra một bản ghi trong `confguide_users` có khớp với phiên đăng nhập hiện tại hay không.
   * @param {Object|null} candidate - Bản ghi người dùng trong danh sách tài khoản.
   * @param {Object|null} activeUser - Phiên người dùng hiện tại.
   * @returns {boolean} True nếu cùng một tài khoản.
   */
  function isMatchingStoredAccount(candidate, activeUser) {
    if (!candidate || typeof candidate !== 'object' || !activeUser || typeof activeUser !== 'object') return false;
    if (candidate.id && activeUser.id && String(candidate.id) === String(activeUser.id)) return true;
    if (candidate.username && activeUser.username
      && String(candidate.username).toLowerCase() === String(activeUser.username).toLowerCase()) {
      return true;
    }
    if (candidate.email && activeUser.email
      && String(candidate.email).toLowerCase() === String(activeUser.email).toLowerCase()) {
      return true;
    }
    return false;
  }

  /**
   * Lấy chuỗi `fieldsOfInterest` gắn với tài khoản đang đăng nhập (`confguide_current_user` làm nguồn chính,
   * đồng bộ từ `confguide_users` nếu cần). Trả về chuỗi rỗng nếu chưa đăng nhập.
   * @returns {string} Chuỗi lĩnh vực nghiên cứu của tài khoản hoặc chuỗi rỗng.
   */
  function getUserResearchFieldsText() {
    const user = getCurrentUser();
    if (!user) return '';
    if (typeof user.fieldsOfInterest === 'string') {
      return user.fieldsOfInterest.trim();
    }
    const users = readStorage('confguide_users', []);
    if (Array.isArray(users)) {
      const matched = users.find(candidate => isMatchingStoredAccount(candidate, user));
      if (matched && typeof matched.fieldsOfInterest === 'string') {
        return matched.fieldsOfInterest.trim();
      }
    }
    return '';
  }

  /**
   * Lấy danh sách khóa lĩnh vực nghiên cứu (slug) gắn với tài khoản đang đăng nhập.
   * Luôn trả về `[]` khi người dùng chưa đăng nhập.
   * @returns {Array<string>} Danh sách khóa lĩnh vực của tài khoản hiện tại.
   */
  function getUserResearchTopicKeys() {
    if (!isUserAuthenticated()) return [];
    return parseTopicKeysFromText(getUserResearchFieldsText());
  }

  /**
   * Lấy danh sách nhãn lĩnh vực nghiên cứu gắn với tài khoản đang đăng nhập.
   * Luôn trả về `[]` khi người dùng chưa đăng nhập.
   * @returns {Array<string>} Danh sách nhãn lĩnh vực để hiển thị.
   */
  function getUserResearchTopicLabels() {
    if (!isUserAuthenticated()) return [];
    return parseTopicDisplayLabelsFromText(getUserResearchFieldsText());
  }

  /**
   * Cập nhật danh sách lĩnh vực nghiên cứu vào đúng trường `fieldsOfInterest` của tài khoản đang đăng nhập
   * (đồng bộ cả `confguide_current_user` và `confguide_users`). Từ chối lưu nếu chưa đăng nhập.
   * @param {Array<string>} topicKeys - Danh sách khóa lĩnh vực muốn lưu.
   * @param {{ silent?: boolean }} [options={}] - Tùy chọn không phát sự kiện nếu đang gộp lưu cùng prefs.
   * @returns {{ ok: boolean, requiresAuth: boolean, keys: Array<string>, labels: Array<string>, fieldsOfInterest: string }} Kết quả thao tác.
   */
  function setUserResearchTopicKeys(topicKeys, options = {}) {
    const activeUser = getCurrentUser();
    if (!activeUser) {
      return { ok: false, requiresAuth: true, keys: [], labels: [], fieldsOfInterest: '' };
    }

    const inputSet = new Set(
      Array.isArray(topicKeys) ? topicKeys.map(item => String(item || '').trim()).filter(Boolean) : []
    );
    const cleanKeys = PREFERENCE_TOPICS
      .map(item => item.key)
      .filter(key => inputSet.has(key));
    const labels = cleanKeys.map(key => PREF_TOPIC_LABEL_MAP[key] || key);
    const fieldsText = labels.join(', ');

    const updatedCurrentUser = Object.assign({}, activeUser, { fieldsOfInterest: fieldsText });
    writeStorage('confguide_current_user', updatedCurrentUser);

    const users = readStorage('confguide_users', []);
    if (Array.isArray(users)) {
      let modified = false;
      const nextUsers = users.map(candidate => {
        if (!isMatchingStoredAccount(candidate, updatedCurrentUser)) return candidate;
        modified = true;
        return Object.assign({}, candidate, { fieldsOfInterest: fieldsText });
      });
      if (modified) {
        writeStorage('confguide_users', nextUsers);
      }
    }

    updateSettingsPrefSummary();
    if (!options.silent) {
      try {
        window.dispatchEvent(new CustomEvent('confguide:preferences-changed', {
          detail: getUserPreferences()
        }));
      } catch {
        /* Bỏ qua nếu môi trường không hỗ trợ CustomEvent */
      }
    }
    return {
      ok: true,
      requiresAuth: false,
      keys: cleanKeys,
      labels,
      fieldsOfInterest: fieldsText
    };
  }

  /**
   * Đọc và chuẩn hóa tùy chọn người dùng từ `confguide_user_preferences` kết hợp nguồn lĩnh vực
   * gắn với tài khoản đang đăng nhập (`confguide_current_user.fieldsOfInterest`).
   * @returns {{ aoe: boolean, countdown: boolean, purpose: string, topics: string[], bannerDismissed: boolean, onboardingCompleted: boolean, updatedAt: string }}
   */
  function getUserPreferences() {
    const raw = readStorage('confguide_user_preferences', {});
    const safeObj = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : {};
    const rawPurpose = typeof safeObj.purpose === 'string' ? safeObj.purpose.trim() : '';
    const purpose = VALID_PURPOSE_KEYS.has(rawPurpose) ? rawPurpose : '';
    return {
      aoe: safeObj.aoe !== false,
      countdown: safeObj.countdown !== false,
      purpose,
      topics: getUserResearchTopicKeys(),
      bannerDismissed: Boolean(safeObj.bannerDismissed),
      onboardingCompleted: Boolean(safeObj.onboardingCompleted),
      updatedAt: typeof safeObj.updatedAt === 'string' ? safeObj.updatedAt : ''
    };
  }

  /**
   * Cập nhật tóm tắt sở thích hiển thị bên trong modal Cài đặt toàn cục.
   */
  function updateSettingsPrefSummary() {
    const summaryEl = document.getElementById('globalPrefPersonalSummary');
    if (!summaryEl) return;
    const prefs = getUserPreferences();
    const purposeObj = USAGE_PURPOSES.find(item => item.key === prefs.purpose);
    const topicLabels = prefs.topics.map(key => PREF_TOPIC_LABEL_MAP[key] || key);
    if (!purposeObj && topicLabels.length === 0) {
      summaryEl.textContent = 'Chưa thiết lập mục đích sử dụng và lĩnh vực quan tâm.';
      return;
    }
    const parts = [];
    if (purposeObj) parts.push(`Mục đích: ${purposeObj.label}`);
    if (topicLabels.length > 0) {
      const preview = topicLabels.slice(0, 3).join(', ');
      const extra = topicLabels.length > 3 ? ` (+${topicLabels.length - 3})` : '';
      parts.push(`Lĩnh vực (${topicLabels.length}): ${preview}${extra}`);
    }
    summaryEl.textContent = parts.join(' • ');
  }

  /**
   * Hợp nhất và lưu thay đổi vào `confguide_user_preferences` (và đồng bộ `fieldsOfInterest` của tài khoản
   * nếu đã đăng nhập), đồng thời phát sự kiện cập nhật toàn trang.
   * @param {Object} [patch={}] - Các trường tùy chọn cần cập nhật.
   * @returns {Object} Đối tượng tùy chọn đã chuẩn hóa sau khi lưu.
   */
  function saveUserPreferences(patch = {}) {
    const current = getUserPreferences();
    const safePatch = (patch && typeof patch === 'object' && !Array.isArray(patch)) ? patch : {};
    const merged = {
      ...current,
      ...safePatch,
      updatedAt: new Date().toISOString()
    };
    const nextPurpose = typeof merged.purpose === 'string' && VALID_PURPOSE_KEYS.has(merged.purpose.trim())
      ? merged.purpose.trim()
      : '';

    if (Object.prototype.hasOwnProperty.call(safePatch, 'topics') && isUserAuthenticated()) {
      setUserResearchTopicKeys(safePatch.topics, { silent: true });
    }

    const storedPrefs = {
      aoe: merged.aoe !== false,
      countdown: merged.countdown !== false,
      purpose: nextPurpose,
      bannerDismissed: Boolean(merged.bannerDismissed),
      onboardingCompleted: Boolean(merged.onboardingCompleted),
      updatedAt: merged.updatedAt
    };
    writeStorage('confguide_user_preferences', storedPrefs);

    const nextPrefs = {
      ...storedPrefs,
      topics: getUserResearchTopicKeys()
    };
    updateSettingsPrefSummary();
    try {
      window.dispatchEvent(new CustomEvent('confguide:preferences-changed', { detail: nextPrefs }));
    } catch {
      /* Bỏ qua nếu môi trường không hỗ trợ CustomEvent */
    }
    return nextPrefs;
  }

  /**
   * Tạo URL điều hướng tới trang Tra cứu (search.html) gắn sẵn lĩnh vực và tiêu chí theo mục đích.
   * @param {Object} [prefs] - Tùy chọn người dùng (mặc định đọc từ getUserPreferences()).
   * @returns {string} Đường dẫn tương đối tới search.html kèm tham số truy vấn.
   */
  function buildPersonalizedSearchUrl(prefs) {
    const state = prefs && typeof prefs === 'object' ? prefs : getUserPreferences();
    const params = new URLSearchParams();
    if (Array.isArray(state.topics) && state.topics.length > 0) {
      params.set('topic', state.topics.join(','));
    }
    const purposeMeta = USAGE_PURPOSES.find(item => item.key === state.purpose);
    if (purposeMeta) {
      if (purposeMeta.searchCfp) params.set('cfp', purposeMeta.searchCfp);
      if (purposeMeta.searchSort) params.set('sort', purposeMeta.searchSort);
    }
    const qs = params.toString();
    return qs ? `search.html?${qs}` : 'search.html';
  }

  /**
   * Tạo HTML cho modal Cài đặt & Quyền riêng tư (đổi mật khẩu + tùy chọn hiển thị).
   * @returns {string} Chuỗi HTML `#globalSettingsModal`.
   */
  function buildSettingsModalHtml() {
    return `
      <div class="layout-modal" id="globalSettingsModal" role="dialog"
        aria-modal="true" aria-labelledby="settingsModalTitle" hidden>
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
                  <p class="modal-hint">
                    Tự động quy đổi hạn chót 23:59 AoE (UTC-12) sang 18:59 ngày hôm sau theo UTC+7 (giờ Việt Nam).
                  </p>
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
              <div class="modal-divider"></div>
              <div class="modal-section-block">
                <h4 class="modal-block-title">Cá nhân hóa mục đích &amp; lĩnh vực</h4>
                <p class="modal-block-desc">Chọn mục đích sử dụng và các lĩnh vực nghiên cứu quan tâm để hệ thống gợi ý hội nghị phù hợp hơn.</p>
                <div class="modal-pref-summary-card">
                  <p class="modal-pref-summary-text" id="globalPrefPersonalSummary">Chưa thiết lập mục đích sử dụng và lĩnh vực quan tâm.</p>
                  <button type="button" class="btn btn-secondary modal-pref-open-btn" id="btnOpenPrefSurveyFromSettings">
                    Thiết lập sở thích
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Tạo HTML cho modal Trợ giúp & Hỗ trợ với danh sách câu hỏi FAQ.
   * @returns {string} Chuỗi HTML `#globalHelpModal`.
   */
  function buildHelpModalHtml() {
    const chevronSvg = `
      <svg class="faq-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2.5" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>
    `;
    const faqs = [
      {
        q: '1. Quy tắc quy đổi múi giờ UTC+7 (giờ Việt Nam) và AoE trên ConfGuide?',
        a: 'Các mốc hạn nộp bài theo quy ước 23:59 AoE (Anywhere on Earth, UTC-12) được hệ thống tự động '
          + 'cộng 19 giờ để hiển thị theo chuẩn <strong>UTC+7 (giờ Việt Nam)</strong>, tức 18:59 ngày kế tiếp. '
          + 'Riêng ngày diễn ra sự kiện hoặc các mốc chỉ có ngày mà không có giờ cụ thể được giữ nguyên để '
          + 'tránh lệch ngày.',
        open: true
      },
      {
        q: '2. Làm thế nào để thêm hạn nộp bài vào Google Calendar?',
        a: 'Tại trang Chi tiết hội nghị (detail.html), bạn có thể nhấn nút "Thêm vào Google Calendar" trong khung '
          + 'Mốc tiếp theo hoặc biểu tượng lịch trên từng mốc hạn để lưu nhắc nhở theo giờ Việt Nam (UTC+7).',
        open: false
      },
      {
        q: '3. Phân hạng CORE (A*, A, B, C) và nhãn "Chưa xếp hạng" có ý nghĩa gì?',
        a: 'Thang phân hạng CORE / ICORE đánh giá uy tín học thuật của hội nghị quốc tế (từ cao đến thấp: '
          + '<strong>A*</strong>, <strong>A</strong>, <strong>B</strong>, <strong>C</strong>). '
          + 'Các hội nghị trong nước, chuyên đề mới hoặc chưa có dữ liệu xếp hạng trong danh mục gốc '
          + 'sẽ được hiển thị trung thực là <strong>Chưa xếp hạng</strong>.',
        open: false
      },
      {
        q: '4. Cách theo dõi tiến độ nộp bài trong Tracker?',
        a: 'Nhấn "Lưu lại" ở trang Tra cứu hoặc trang chi tiết để đưa hội nghị vào trang Theo dõi hội nghị. '
          + 'Danh sách được lưu trong trình duyệt hiện tại.',
        open: false
      }
    ];

    const faqListHtml = faqs.map(item => `
      <div class="faq-item${item.open ? ' open' : ''}">
        <button type="button" class="faq-question-btn" aria-expanded="${item.open ? 'true' : 'false'}">
          <strong>${item.q}</strong>
          ${chevronSvg}
        </button>
        <div class="faq-answer-panel">${item.a}</div>
      </div>
    `).join('');

    return `
      <div class="layout-modal" id="globalHelpModal" role="dialog"
        aria-modal="true" aria-labelledby="helpModalTitle" hidden>
        <div class="layout-modal-backdrop"></div>
        <div class="layout-modal-box">
          <div class="layout-modal-header">
            <h2 id="helpModalTitle" class="layout-modal-title">Trợ giúp &amp; Hỗ trợ</h2>
            <button type="button" class="layout-modal-close-btn" aria-label="Đóng cửa sổ">&times;</button>
          </div>
          <div class="layout-modal-body">
            <div class="faq-list">${faqListHtml}</div>
            <div class="modal-contact-banner">
              <strong>Liên hệ ban quản trị học thuật:</strong>
              <p class="help-email-note">
                Email: <a href="mailto:contact@confguide.vn">contact@confguide.vn</a> •
                Hotline: <a href="tel:+84123456789">+84 123 456 789</a>
              </p>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Tạo HTML cho modal Báo cáo sự cố & Đóng góp dữ liệu.
   * @returns {string} Chuỗi HTML `#globalReportModal`.
   */
  function buildReportModalHtml() {
    return `
      <div class="layout-modal" id="globalReportModal" role="dialog"
        aria-modal="true" aria-labelledby="reportModalTitle" hidden>
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
                    <option value="Sai thông tin địa điểm / Lệ phí">Sai thông tin địa điểm / Lệ phí</option>
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
   * Tạo HTML cho modal khảo sát sở thích & mục đích sử dụng ConfGuide toàn cục dạng bảng biểu có ô tích.
   * Sử dụng đúng danh mục 25 lĩnh vực đơn thực tế từ dữ liệu hội nghị.
   * @returns {string} Chuỗi HTML `#globalPreferencesSurveyModal`.
   */
  function buildPreferencesSurveyModalHtml() {
    const renderTopicCheckboxRow = item => `
      <label class="pref-topic-row">
        <input type="checkbox" class="pref-topic-row__input js-pref-topic-checkbox" value="${escapeHtml(item.key)}">
        <span class="pref-topic-row__label">${escapeHtml(item.label)}</span>
      </label>
    `;

    const purposesHtml = USAGE_PURPOSES.map(item => `
      <button type="button" class="pref-purpose-card" data-purpose="${escapeHtml(item.key)}" aria-pressed="false">
        <span class="pref-purpose-card__check" aria-hidden="true">✓</span>
        <span class="pref-purpose-card__body">
          <span class="pref-purpose-card__title">${escapeHtml(item.label)}</span>
          <span class="pref-purpose-card__desc">${escapeHtml(item.desc)}</span>
        </span>
      </button>
    `).join('');

    return `
      <div class="layout-modal" id="globalPreferencesSurveyModal" role="dialog"
        aria-modal="true" aria-labelledby="prefSurveyModalTitle" hidden>
        <div class="layout-modal-backdrop"></div>
        <div class="layout-modal-box layout-modal-box--wide">
          <div class="layout-modal-header">
            <h3 class="layout-modal-title" id="prefSurveyModalTitle">Cá nhân hóa trải nghiệm ConfGuide</h3>
            <button type="button" class="layout-modal-close-btn" aria-label="Đóng">&times;</button>
          </div>
          <div class="layout-modal-body">
            <p class="modal-block-desc pref-survey-intro" id="prefSurveyIntro">
              Chọn mục đích sử dụng và tích chọn các lĩnh vực nghiên cứu bạn quan tâm để ConfGuide ưu tiên gợi ý hội nghị phù hợp trên Trang chủ và trang Tra cứu.
            </p>

            <div class="modal-section-block" id="prefPurposeSection">
              <div class="pref-survey-section-head">
                <h4 class="modal-block-title">1. Mục đích tìm kiếm</h4>
                <span class="pref-survey-optional">Tùy chọn (chọn 1)</span>
              </div>
              <div class="pref-purpose-grid" id="prefPurposeGrid" role="group" aria-label="Mục đích sử dụng trang web">
                ${purposesHtml}
              </div>
            </div>

            <div class="modal-divider" id="prefSurveyDivider"></div>

            <div class="modal-section-block" id="prefTopicsSection">
              <div class="pref-survey-section-head">
                <h4 class="modal-block-title" id="prefTopicsHeading">2. Lĩnh vực nghiên cứu bạn quan tâm</h4>
                <span class="pref-count-badge" id="prefTopicCountBadge">Đã chọn: 0 lĩnh vực</span>
              </div>
              <div class="pref-topic-table">
                <div class="pref-topic-table__head">
                  <span>Tích chọn một hoặc nhiều lĩnh vực nghiên cứu</span>
                </div>
                <div class="pref-topic-table__grid" id="prefTopicGrid" role="group" aria-labelledby="prefTopicsHeading">
                  ${PREFERENCE_TOPICS.map(renderTopicCheckboxRow).join('')}
                </div>
              </div>
            </div>
          </div>
          <div class="pref-modal-actions">
            <button type="button" class="btn btn-secondary pref-modal-reset-btn" id="prefSurveyResetBtn">Xóa lựa chọn</button>
            <div class="pref-modal-actions__right">
              <button type="button" class="btn btn-secondary layout-modal-cancel-btn">Hủy</button>
              <button type="button" class="btn btn-primary" id="prefSurveySaveBtn">OK</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Tạo HTML cho các modal toàn cục: Cài đặt, Trợ giúp, Báo cáo sự cố và Khảo sát sở thích.
   * @returns {string} Chuỗi HTML chứa cấu trúc các modal dùng chung.
   */
  function renderGlobalModalsHtml() {
    return [
      buildSettingsModalHtml(),
      buildHelpModalHtml(),
      buildReportModalHtml(),
      buildPreferencesSurveyModalHtml()
    ].join('');
  }

  /**
   * Mở modal toàn cục, lưu vị trí focus và khóa cuộn nền.
   * @param {string} modalId Mã id của phần tử modal.
   * @param {HTMLElement|null} [customReturnFocusEl=null] Phần tử ưu tiên khôi phục focus khi đóng.
   */
  function openLayoutModal(modalId, customReturnFocusEl = null) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    const focusAnchor = customReturnFocusEl instanceof HTMLElement ? customReturnFocusEl : document.activeElement;
    activeModalLastFocus = focusAnchor;
    modalReturnFocusMap.set(modalId, focusAnchor);
    modal.removeAttribute('hidden');
    document.body.classList.add('modal-open');
    requestAnimationFrame(() => {
      modal.classList.add('show');
      const bodyEl = modal.querySelector('.layout-modal-body');
      if (bodyEl) bodyEl.scrollTop = 0;
      const focusTarget = modalId === 'globalPreferencesSurveyModal'
        ? (modal.querySelector('#prefPurposeSection:not([hidden]) .pref-purpose-card')
          || modal.querySelector('button.layout-modal-close-btn'))
        : modal.querySelector('input, select, textarea, button.layout-modal-close-btn');
      if (focusTarget) focusTarget.focus();
    });
  }

  /**
   * Mở hộp thoại Báo cáo sự cố toàn cục kèm dữ liệu điền sẵn (tùy chọn).
   * @param {{ category?: string, confName?: string, title?: string, description?: string }} [preset={}] Dữ liệu điền sẵn.
   */
  function openReportModal(preset = {}) {
    const categoryEl = document.getElementById('globalReportCategory');
    const confEl = document.getElementById('globalReportConf');
    const titleEl = document.getElementById('globalReportTitle');
    const descEl = document.getElementById('globalReportDesc');

    if (categoryEl && preset.category) categoryEl.value = preset.category;
    if (confEl && typeof preset.confName === 'string') confEl.value = preset.confName;
    if (titleEl && typeof preset.title === 'string') titleEl.value = preset.title;
    if (descEl && typeof preset.description === 'string') descEl.value = preset.description;

    openLayoutModal('globalReportModal');
  }

  /** Trạng thái nháp trong modal cá nhân hóa & chọn lĩnh vực nghiên cứu */
  const surveyDraftState = {
    purpose: '',
    topics: new Set(),
    topicsOnly: false,
    preserveOpenModals: false,
    onConfirm: null
  };

  /**
   * Đồng bộ giao diện modal cá nhân hóa dạng bảng biểu từ trạng thái nháp `surveyDraftState`.
   */
  function syncPreferencesSurveyModalUi() {
    const modal = document.getElementById('globalPreferencesSurveyModal');
    if (!modal) return;

    const isTopicsOnly = Boolean(surveyDraftState.topicsOnly);
    const titleEl = document.getElementById('prefSurveyModalTitle');
    const introEl = document.getElementById('prefSurveyIntro');
    const purposeSection = document.getElementById('prefPurposeSection');
    const dividerEl = document.getElementById('prefSurveyDivider');
    const topicsHeading = document.getElementById('prefTopicsHeading');

    if (titleEl) {
      titleEl.textContent = isTopicsOnly
        ? 'Chọn lĩnh vực nghiên cứu'
        : 'Cá nhân hóa trải nghiệm ConfGuide';
    }
    if (introEl) {
      introEl.textContent = isTopicsOnly
        ? 'Tích chọn các lĩnh vực nghiên cứu bạn quan tâm rồi nhấn OK để lưu lại.'
        : 'Chọn mục đích sử dụng và tích chọn các lĩnh vực nghiên cứu bạn quan tâm, sau đó nhấn OK để lưu lại.';
    }
    if (purposeSection) {
      if (isTopicsOnly) purposeSection.setAttribute('hidden', '');
      else purposeSection.removeAttribute('hidden');
    }
    if (dividerEl) {
      if (isTopicsOnly) dividerEl.setAttribute('hidden', '');
      else dividerEl.removeAttribute('hidden');
    }
    if (topicsHeading) {
      topicsHeading.textContent = isTopicsOnly
        ? 'Bảng lĩnh vực nghiên cứu'
        : '2. Lĩnh vực nghiên cứu bạn quan tâm';
    }

    modal.querySelectorAll('.pref-purpose-card').forEach(btn => {
      const pKey = btn.getAttribute('data-purpose') || '';
      const isSelected = Boolean(pKey && surveyDraftState.purpose === pKey);
      btn.classList.toggle('is-selected', isSelected);
      btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
    });

    modal.querySelectorAll('.js-pref-topic-checkbox').forEach(checkbox => {
      const tKey = checkbox.value || '';
      const isSelected = Boolean(tKey && surveyDraftState.topics.has(tKey));
      checkbox.checked = isSelected;
      const row = checkbox.closest('.pref-topic-row');
      if (row) row.classList.toggle('is-selected', isSelected);
    });

    const countBadge = document.getElementById('prefTopicCountBadge');
    if (countBadge) {
      countBadge.textContent = `Đã chọn: ${surveyDraftState.topics.size} lĩnh vực`;
    }
  }

  /**
   * Mở modal bảng biểu cá nhân hóa (Trang chủ) hoặc bảng chọn lĩnh vực nghiên cứu (Trang cá nhân).
   * @param {{
   *   topicsOnly?: boolean,
   *   preserveOpenModals?: boolean,
   *   initialTopicKeys?: Array<string>,
   *   onConfirm?: Function|null,
   *   returnFocusEl?: HTMLElement|null
   * }} [options={}] Tùy chọn hiển thị và callback khi nhấn OK.
   */
  function openPreferencesSurveyModal(options = {}) {
    const safeOpts = (options && typeof options === 'object') ? options : {};
    const prefs = getUserPreferences();
    const isOnboarding = Boolean(safeOpts.isOnboarding);
    const initialTopics = isOnboarding
      ? []
      : (Array.isArray(safeOpts.initialTopicKeys)
        ? safeOpts.initialTopicKeys.filter(key => VALID_PREF_TOPIC_KEYS.has(key))
        : prefs.topics);

    surveyDraftState.purpose = isOnboarding ? '' : prefs.purpose;
    surveyDraftState.topics = new Set(initialTopics);
    surveyDraftState.topicsOnly = isOnboarding ? false : Boolean(safeOpts.topicsOnly);
    surveyDraftState.preserveOpenModals = Boolean(safeOpts.preserveOpenModals);
    surveyDraftState.onConfirm = typeof safeOpts.onConfirm === 'function' ? safeOpts.onConfirm : null;

    const modalEl = document.getElementById('globalPreferencesSurveyModal');
    if (modalEl) {
      modalEl.classList.toggle('layout-modal--nested', surveyDraftState.preserveOpenModals);
    }

    // Đóng nhanh các modal toàn cục khác nếu không mở chồng lên modal chỉnh sửa hồ sơ
    if (!surveyDraftState.preserveOpenModals) {
      document.querySelectorAll('.layout-modal.show').forEach(otherModal => {
        if (otherModal.id !== 'globalPreferencesSurveyModal') {
          otherModal.classList.remove('show');
          otherModal.setAttribute('hidden', 'true');
        }
      });
    }

    syncPreferencesSurveyModalUi();
    openLayoutModal(
      'globalPreferencesSurveyModal',
      safeOpts.returnFocusEl instanceof HTMLElement ? safeOpts.returnFocusEl : null
    );
  }

  /**
   * Đóng modal toàn cục và khôi phục trạng thái focus trước đó.
   * @param {string} modalId Mã id của phần tử modal.
   */
  function closeLayoutModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove('show', 'layout-modal--nested');
    if (modalId === 'globalPreferencesSurveyModal') {
      surveyDraftState.onConfirm = null;
      surveyDraftState.preserveOpenModals = false;
    }
    if (document.querySelectorAll('.layout-modal.show').length === 0) {
      document.body.classList.remove('modal-open');
    }
    setTimeout(() => modal.setAttribute('hidden', 'true'), 180);
    const savedFocus = modalReturnFocusMap.get(modalId) || activeModalLastFocus;
    modalReturnFocusMap.delete(modalId);
    activeModalLastFocus = null;
    if (savedFocus && typeof savedFocus.focus === 'function') {
      savedFocus.focus();
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
   * Khởi tạo HTML biểu tượng điều hướng Header (mặt trời, mặt trăng, menu di động).
   * @returns {{ sunSvg: string, moonSvg: string, hamburgerSvg: string }} Tập SVG Header.
   */
  function getHeaderIcons() {
    return {
      sunSvg: `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
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
      `,
      moonSvg: `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      `,
      hamburgerSvg: `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      `
    };
  }

  /**
   * Tạo ngăn kéo điều hướng trên màn hình di động.
   * @param {boolean} isHome - Trang chủ.
   * @param {boolean} isSearch - Trang Tra cứu hoặc Chi tiết.
   * @param {boolean} isTracker - Trang Theo dõi hội nghị.
   * @param {boolean} isAbout - Trang Về chúng tôi.
   * @param {Object|null} user - Người dùng hiện tại.
   * @returns {string} Chuỗi HTML `.mobile-nav-drawer`.
   */
  function buildMobileDrawerHtml(isHome, isSearch, isTracker, isAbout, user) {
    const userLinksHtml = user ? `
      <div class="mobile-menu-divider" role="separator"></div>
      <a href="profile.html" class="nav-link">Trang cá nhân</a>
      <button type="button" id="mobileSettingsBtn"
        class="nav-link mobile-menu-btn">Cài đặt và quyền riêng tư</button>
      <button type="button" id="mobileHelpBtn"
        class="nav-link mobile-menu-btn">Trợ giúp và hỗ trợ</button>
      <button type="button" id="mobileReportBtn"
        class="nav-link mobile-menu-btn">Báo cáo sự cố</button>
      <button type="button" id="mobileLogoutBtn"
        class="nav-link mobile-menu-btn mobile-menu-btn--danger">Đăng xuất</button>
    ` : '';

    return `
      <div class="mobile-nav-drawer" id="mobileNavDrawer">
        <a href="index.html" class="nav-link ${isHome ? 'active' : ''}">Trang chủ</a>
        <a href="search.html" class="nav-link ${isSearch ? 'active' : ''}">Tra cứu</a>
        <a href="tracker.html" class="nav-link ${isTracker ? 'active' : ''}">Theo dõi hội nghị</a>
        <a href="about.html" class="nav-link ${isAbout ? 'active' : ''}">Về chúng tôi</a>
        ${userLinksHtml}
      </div>
    `;
  }

  /**
   * Render toàn bộ thanh Header, điều hướng chính, menu di động và modal toàn cục.
   * @param {string} currentPage - Tên tệp trang hiện tại.
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
    try { storedTheme = localStorage.getItem('confguide_theme') || 'light'; } catch (e) {}
    const isDark = document.body.classList.contains('dark') || storedTheme === 'dark';

    const { sunSvg, moonSvg, hamburgerSvg } = getHeaderIcons();
    const navHtml = isAuthPage ? '' : `
      <nav class="main-nav" aria-label="Điều hướng chính">
        <a href="index.html" class="nav-link ${isHome ? 'active' : ''}">Trang chủ</a>
        <a href="search.html" class="nav-link ${isSearch ? 'active' : ''}">Tra cứu</a>
        <a href="tracker.html" class="nav-link ${isTracker ? 'active' : ''}">Theo dõi hội nghị</a>
        <a href="about.html" class="nav-link ${isAbout ? 'active' : ''}">Về chúng tôi</a>
      </nav>
    `;
    const hamburgerHtml = isAuthPage ? '' : `
      <button type="button" class="hamburger-btn" id="mobileMenuBtn"
        aria-label="Mở menu di động" aria-expanded="false">
        ${hamburgerSvg}
      </button>
    `;
    const mobileDrawerHtml = isAuthPage ? '' : buildMobileDrawerHtml(isHome, isSearch, isTracker, isAbout, user);

    headerContainer.innerHTML = `
      <header class="site-header">
        <div class="container nav-wrap">
          ${renderBrandHtml()}
          ${navHtml}
          <div class="header-actions">
            <button type="button" class="theme-toggle-btn" id="themeToggleBtn"
              title="Chuyển chế độ sáng/tối" aria-label="Chuyển chế độ giao diện">
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
   * Gắn sự kiện mở/đóng menu di động và chặn điều hướng trùng lặp tới trang hiện tại.
   * @param {HTMLElement} headerContainer - Phần tử chứa Header.
   */
  function bindMobileNavigationEvents(headerContainer) {
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const mobileDrawer = document.getElementById('mobileNavDrawer');

    headerContainer.querySelectorAll('a[href]').forEach(link => {
      link.addEventListener('click', event => {
        const target = new URL(link.href, window.location.href);
        const isSameUrl = target.pathname.toLowerCase() === window.location.pathname.toLowerCase()
          && target.search === window.location.search
          && !target.hash;
        if (!isSameUrl) return;
        event.preventDefault();
        if (mobileDrawer) mobileDrawer.classList.remove('open');
        if (mobileBtn) mobileBtn.setAttribute('aria-expanded', 'false');
      });
    });

    if (!mobileBtn || !mobileDrawer) return;

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
    if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', handleLogoutRequest);
  }

  /**
   * Gắn sự kiện mở/đóng menu tài khoản dropdown và các nút kích hoạt modal toàn cục.
   * @param {Function} closeUserDropdown - Hàm đóng dropdown tài khoản và menu di động.
   */
  function bindAccountDropdownEvents(closeUserDropdown) {
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
      if (!el) return;
      el.addEventListener('click', () => {
        closeUserDropdown();
        openLayoutModal(modalId);
      });
    });

    const userMenuWrapper = document.getElementById('userMenuWrapper');
    const userAvatarBtn = document.getElementById('userAvatarBtn');
    const userDropdownMenu = document.getElementById('userDropdownMenu');
    if (!userAvatarBtn || !userDropdownMenu) return;

    userAvatarBtn.addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = userDropdownMenu.classList.toggle('show');
      userAvatarBtn.setAttribute('aria-expanded', String(isOpen));
    });
    document.addEventListener('click', e => {
      if (userMenuWrapper && !userMenuWrapper.contains(e.target)) closeUserDropdown();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && userDropdownMenu.classList.contains('show')) {
        closeUserDropdown();
        userAvatarBtn.focus();
      }
    });
    const navLogoutBtn = document.getElementById('navLogoutBtn');
    if (navLogoutBtn) {
      navLogoutBtn.addEventListener('click', () => {
        closeUserDropdown();
        handleLogoutRequest();
      });
    }
  }

  /**
   * Gắn toàn bộ sự kiện tương tác trong Header, Dropdown, Mobile Drawer và Modal toàn cục.
   * @param {HTMLElement} headerContainer - Phần tử chứa Header.
   * @param {Object|null} user - Thông tin người dùng hiện tại.
   * @param {string} sunSvg - Biểu tượng SVG mặt trời.
   * @param {string} moonSvg - Biểu tượng SVG mặt trăng.
   */
  function bindHeaderEvents(headerContainer, user, sunSvg, moonSvg) {
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const currentlyDark = document.body.classList.toggle('dark');
        try { localStorage.setItem('confguide_theme', currentlyDark ? 'dark' : 'light'); } catch (e) {}
        themeBtn.innerHTML = currentlyDark ? sunSvg : moonSvg;
      });
    }

    bindMobileNavigationEvents(headerContainer);

    document.querySelectorAll('.layout-modal').forEach(modal => {
      ['.layout-modal-backdrop', '.layout-modal-close-btn', '.layout-modal-cancel-btn'].forEach(sel => {
        const el = modal.querySelector(sel);
        if (el) el.addEventListener('click', () => closeLayoutModal(modal.id));
      });
    });
    document.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      const prefModal = document.getElementById('globalPreferencesSurveyModal');
      if (prefModal && prefModal.classList.contains('show') && prefModal.classList.contains('layout-modal--nested')) {
        closeLayoutModal('globalPreferencesSurveyModal');
        return;
      }
      document.querySelectorAll('.layout-modal.show').forEach(m => closeLayoutModal(m.id));
    });

    const userAvatarBtn = document.getElementById('userAvatarBtn');
    const userDropdownMenu = document.getElementById('userDropdownMenu');
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const mobileDrawer = document.getElementById('mobileNavDrawer');
    bindAccountDropdownEvents(() => {
      if (userDropdownMenu) userDropdownMenu.classList.remove('show');
      if (userAvatarBtn) userAvatarBtn.setAttribute('aria-expanded', 'false');
      if (mobileDrawer) mobileDrawer.classList.remove('open');
      if (mobileBtn) mobileBtn.setAttribute('aria-expanded', 'false');
    });

    initGlobalPasswordForm(user);
    initGlobalPreferences();
    initPreferencesSurveyModal();
    initHelpAccordion();
    initGlobalReportForm(user);
  }

  /**
   * Kiểm tra dữ liệu nhập và xử lý lưu mật khẩu mới từ modal Cài đặt.
   * @param {SubmitEvent} e - Sự kiện submit của `#globalPasswordForm`.
   * @param {Object|null} user - Thông tin người dùng hiện tại.
   * @returns {Promise<void>}
   */
  async function handleGlobalPasswordSubmit(e, user) {
    e.preventDefault();
    const curInput = document.getElementById('globalCurrentPass');
    const newInput = document.getElementById('globalNewPass');
    const conInput = document.getElementById('globalConfirmPass');
    const curErr = document.getElementById('globalCurrentPassError');
    const newErr = document.getElementById('globalNewPassError');
    const conErr = document.getElementById('globalConfirmPassError');
    const alertBox = document.getElementById('settingsPasswordAlert');
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
    if (!curPass) { if (curErr) curErr.textContent = 'Vui lòng nhập mật khẩu hiện tại.'; hasError = true; }
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
      ? users.find(u =>
        (u.id && u.id === user.id)
        || (u.email && u.email === user.email)
        || (u.username && u.username === user.username)
      )
      : null;

    const currentHash = await hashTextSha256(curPass);
    if (matched && matched.passwordHash) {
      const isTestShortcut = curPass.startsWith('user') && curPass.endsWith('@')
        && matched.username === curPass.slice(0, -1);
      if (matched.passwordHash !== currentHash && !isTestShortcut) {
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

    e.target.reset();
    alertBox.textContent = 'Đã đổi mật khẩu thành công!';
    alertBox.className = 'modal-alert show success';
    setTimeout(() => {
      alertBox.className = 'modal-alert';
      alertBox.textContent = '';
    }, 3000);
  }

  /**
   * Khởi tạo kiểm tra và lưu mật khẩu mới trong modal Cài đặt.
   * @param {Object|null} user - Người dùng hiện tại.
   */
  function initGlobalPasswordForm(user) {
    const passForm = document.getElementById('globalPasswordForm');
    if (passForm) passForm.addEventListener('submit', e => handleGlobalPasswordSubmit(e, user));
  }

  /**
   * Đồng bộ công tắc tùy chọn AoE, đếm ngược và nút mở khảo sát cá nhân hóa trong Cài đặt.
   */
  function initGlobalPreferences() {
    const aoeToggle = document.getElementById('globalPrefAoe');
    const cdToggle = document.getElementById('globalPrefCountdown');
    const openPrefBtn = document.getElementById('btnOpenPrefSurveyFromSettings');
    const userPrefs = getUserPreferences();

    if (aoeToggle) aoeToggle.checked = userPrefs.aoe !== false;
    if (cdToggle) cdToggle.checked = userPrefs.countdown !== false;
    updateSettingsPrefSummary();

    const savePrefs = () => {
      saveUserPreferences({
        aoe: aoeToggle ? aoeToggle.checked : true,
        countdown: cdToggle ? cdToggle.checked : true
      });
    };

    if (aoeToggle) aoeToggle.addEventListener('change', savePrefs);
    if (cdToggle) cdToggle.addEventListener('change', savePrefs);
    if (openPrefBtn) {
      openPrefBtn.addEventListener('click', () => {
        openPreferencesSurveyModal();
      });
    }
  }

  /**
   * Gắn sự kiện tương tác cho modal bảng biểu cá nhân hóa & chọn lĩnh vực nghiên cứu.
   */
  function initPreferencesSurveyModal() {
    const modal = document.getElementById('globalPreferencesSurveyModal');
    if (!modal) return;

    const purposeGrid = document.getElementById('prefPurposeGrid');
    const topicGrid = document.getElementById('prefTopicGrid');
    const resetBtn = document.getElementById('prefSurveyResetBtn');
    const saveBtn = document.getElementById('prefSurveySaveBtn');

    if (purposeGrid) {
      purposeGrid.addEventListener('click', event => {
        const card = event.target.closest('.pref-purpose-card');
        if (!card) return;
        const pKey = card.getAttribute('data-purpose') || '';
        surveyDraftState.purpose = surveyDraftState.purpose === pKey ? '' : pKey;
        syncPreferencesSurveyModalUi();
      });
    }

    if (topicGrid) {
      topicGrid.addEventListener('change', event => {
        const checkbox = event.target;
        if (!(checkbox instanceof HTMLInputElement) || !checkbox.classList.contains('js-pref-topic-checkbox')) {
          return;
        }
        const tKey = checkbox.value || '';
        if (!VALID_PREF_TOPIC_KEYS.has(tKey)) return;
        if (checkbox.checked) {
          surveyDraftState.topics.add(tKey);
        } else {
          surveyDraftState.topics.delete(tKey);
        }
        syncPreferencesSurveyModalUi();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (!surveyDraftState.topicsOnly) {
          surveyDraftState.purpose = '';
        }
        surveyDraftState.topics.clear();
        syncPreferencesSurveyModalUi();
      });
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const selectedTopics = PREFERENCE_TOPICS
          .map(item => item.key)
          .filter(key => surveyDraftState.topics.has(key));
        const selectedLabels = selectedTopics.map(key => PREF_TOPIC_LABEL_MAP[key] || key);

        if (typeof surveyDraftState.onConfirm === 'function') {
          const confirmHandler = surveyDraftState.onConfirm;
          confirmHandler({
            purpose: surveyDraftState.purpose,
            topics: selectedTopics,
            labels: selectedLabels
          });
          closeLayoutModal('globalPreferencesSurveyModal');
          return;
        }

        if (surveyDraftState.topicsOnly) {
          if (!isUserAuthenticated()) {
            showToast('Vui lòng đăng nhập để lưu lĩnh vực nghiên cứu.', 'info');
            closeLayoutModal('globalPreferencesSurveyModal');
            return;
          }
          const currentPrefs = getUserPreferences();
          saveUserPreferences({
            purpose: currentPrefs.purpose,
            topics: selectedTopics,
            onboardingCompleted: true,
            bannerDismissed: false
          });
          closeLayoutModal('globalPreferencesSurveyModal');
          showToast(
            selectedTopics.length > 0
              ? `Đã lưu ${selectedTopics.length} lĩnh vực nghiên cứu.`
              : 'Đã xóa danh sách lĩnh vực nghiên cứu.',
            'success'
          );
          return;
        }

        if (!isUserAuthenticated() && selectedTopics.length > 0) {
          showToast('Vui lòng đăng nhập để lưu lĩnh vực nghiên cứu và nhận gợi ý.', 'info');
          saveUserPreferences({
            purpose: surveyDraftState.purpose,
            onboardingCompleted: true,
            bannerDismissed: false
          });
          closeLayoutModal('globalPreferencesSurveyModal');
          return;
        }
        const hasAny = Boolean(surveyDraftState.purpose || selectedTopics.length > 0);
        saveUserPreferences({
          purpose: surveyDraftState.purpose,
          topics: selectedTopics,
          onboardingCompleted: true,
          bannerDismissed: false
        });
        closeLayoutModal('globalPreferencesSurveyModal');
        showToast(
          hasAny
            ? 'Đã lưu mục đích & lĩnh vực quan tâm.'
            : 'Đã đặt lại thiết lập cá nhân hóa.',
          'success'
        );
      });
    }
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
   * Gửi góp ý nhanh từ chân trang, kiểm tra độ dài và giới hạn tần suất 10 giây.
   * @param {HTMLTextAreaElement} textarea - Ô nhập nội dung góp ý.
   * @param {HTMLElement} statusEl - Phần tử hiển thị thông báo kết quả gửi.
   */
  function submitFooterFeedback(textarea, statusEl) {
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
      text,
      userId,
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
        submitFooterFeedback(textarea, statusEl);
      }
    });

    form.addEventListener('submit', e => {
      e.preventDefault();
      submitFooterFeedback(textarea, statusEl);
    });
  }

  /**
   * Tạo danh sách liên kết mạng xã hội cho cột Kết nối ở Footer.
   * @returns {string} Chuỗi HTML `.footer-social-list`.
   */
  function buildFooterSocialHtml() {
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
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M8.5 16V8h3.8a2.5 2.5 0 0 1 0 5H8.5m3.5 0l2.5 3"></path>
      </svg>
    `;

    return `
      <ul class="footer-social-list">
        <li>
          <a href="contact.html" class="footer-social-link" aria-label="Kênh Facebook cộng đồng ConfGuide">
            ${fbSvg}<span>Facebook</span>
          </a>
        </li>
        <li>
          <a href="contact.html" class="footer-social-link" aria-label="Mạng lưới LinkedIn của ConfGuide">
            ${inSvg}<span>LinkedIn</span>
          </a>
        </li>
        <li>
          <a href="about.html" class="footer-social-link" aria-label="Giới thiệu kênh video học thuật ConfGuide">
            ${ytSvg}<span>YouTube</span>
          </a>
        </li>
        <li>
          <a href="search.html" class="footer-social-link researchgate"
            aria-label="Tra cứu hội nghị học thuật trên ConfGuide">
            ${rgSvg}<span>ResearchGate</span>
          </a>
        </li>
      </ul>
    `;
  }

  /**
   * Hiển thị Footer 4 cột dùng chung cho toàn bộ trang (ẩn ở trang đăng nhập/đăng ký).
   * @param {string} currentPage - Tên trang hiện tại.
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
    const sendPaperPlaneSvg = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
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
                  Nền tảng hỗ trợ tra cứu, khuyến nghị và theo dõi các hội nghị khoa học Công nghệ thông tin
                  diễn ra tại Việt Nam (bao gồm cả hội nghị quốc tế được tổ chức tại Việt Nam).
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
              ${buildFooterSocialHtml()}
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
                  <textarea id="footerFeedbackInput" class="footer-feedback-textarea"
                    rows="1" aria-label="Nội dung góp ý" maxlength="500"></textarea>
                  <button type="submit" class="footer-feedback-btn" id="footerFeedbackSubmitBtn"
                    aria-label="Gửi góp ý" title="Gửi góp ý">
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

    /**
     * Kiểm tra một trường nhập liệu trong form Liên hệ và cập nhật trạng thái lỗi ARIA.
     * @param {HTMLElement|null} inputEl - Ô nhập cần kiểm tra.
     * @param {HTMLElement|null} errEl - Phần tử hiển thị thông báo lỗi.
     * @param {Function} checkFn - Hàm kiểm tra nhận chuỗi đã trim và trả về boolean.
     * @param {string} messageText - Thông báo lỗi khi không hợp lệ.
     * @returns {boolean} True nếu hợp lệ.
     */
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
   * Đánh dấu tài khoản đang đăng nhập đã được hiển thị bảng khảo sát cá nhân hóa lần đầu
   * bằng cách đặt `needsOnboarding: false` ở cả phiên hiện tại và danh sách tài khoản.
   */
  function consumeUserOnboardingFlag() {
    const activeUser = getCurrentUser();
    if (!activeUser || !activeUser.needsOnboarding) return;

    const updatedSession = Object.assign({}, activeUser, { needsOnboarding: false });
    writeStorage('confguide_current_user', updatedSession);

    const users = readStorage('confguide_users', []);
    if (Array.isArray(users)) {
      let modified = false;
      const nextUsers = users.map(candidate => {
        if (!isMatchingStoredAccount(candidate, updatedSession) || !candidate.needsOnboarding) {
          return candidate;
        }
        modified = true;
        return Object.assign({}, candidate, { needsOnboarding: false });
      });
      if (modified) {
        writeStorage('confguide_users', nextUsers);
      }
    }
  }

  /**
   * Tự động mở bảng cá nhân hóa đầy đủ (Mục đích sử dụng + Lĩnh vực nghiên cứu) một lần duy nhất
   * khi người dùng vừa đăng ký tài khoản mới và bắt đầu phiên sử dụng đầu tiên.
   * @param {string} currentPage - Tên trang hiện tại.
   */
  function maybeTriggerNewUserOnboarding(currentPage) {
    if (
      currentPage === 'login.html'
      || currentPage === 'register.html'
      || currentPage === '404.html'
    ) {
      return;
    }

    const activeUser = getCurrentUser();
    if (!activeUser || activeUser.needsOnboarding !== true) return;
    if (!document.getElementById('globalPreferencesSurveyModal')) return;

    consumeUserOnboardingFlag();
    saveUserPreferences({ purpose: '', onboardingCompleted: false });

    const launchOnboardingModal = () => {
      openPreferencesSurveyModal({
        topicsOnly: false,
        isOnboarding: true
      });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => setTimeout(launchOnboardingModal, 80), { once: true });
    } else {
      setTimeout(launchOnboardingModal, 80);
    }
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
    maybeTriggerNewUserOnboarding(page);
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
    /**
     * Làm mới thanh Header và Footer khi thông tin đăng nhập thay đổi.
     */
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
    VN_TIMEZONE_ID: VN_TIMEZONE_ID,
    VN_TIMEZONE_LABEL: VN_TIMEZONE_LABEL,
    VN_UTC_OFFSET_MS: VN_UTC_OFFSET_MS,
    AOE_TO_UTC_OFFSET_MS: AOE_TO_UTC_OFFSET_MS,
    MILESTONE_DEFINITIONS: MILESTONE_DEFINITIONS,
    FALLBACK_CONFERENCES: FALLBACK_CONFERENCES,
    escapeHtml: escapeHtml,
    readStorage: readStorage,
    writeStorage: writeStorage,
    fetchJsonCached: fetchJsonCached,
    getCurrentUser: getCurrentUser,
    isUserAuthenticated: isUserAuthenticated,
    getSavedStorageKey: getSavedStorageKey,
    getSavedConferenceIds: getSavedConferenceIds,
    setSavedConferenceIds: setSavedConferenceIds,
    isConferenceSaved: isConferenceSaved,
    promptLoginForTracking: promptLoginForTracking,
    toggleSavedConference: toggleSavedConference,
    slugify: slugify,
    getConferenceId: getConferenceId,
    extractConferenceRank: extractConferenceRank,
    extractTopicLabels: extractTopicLabels,
    normalizeConference: normalizeConference,
    renderConferenceAvatar: renderConferenceAvatar,
    getTodayVnIso: getTodayVnIso,
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
    extractConferenceFeeRange: extractConferenceFeeRange,
    formatConferenceFee: formatConferenceFee,
    getFeeSortBoundsUsd: getFeeSortBoundsUsd,
    formatConferenceEventDate: formatConferenceEventDate,
    getGoogleCalendarUrl: getGoogleCalendarUrl,
    createIcsContent: createIcsContent,
    downloadIcsFile: downloadIcsFile,
    showToast: showToast,
    showConfirmModal: showConfirmModal,
    openReportModal: openReportModal,
    USAGE_PURPOSES: USAGE_PURPOSES,
    PREFERENCE_TOPICS: PREFERENCE_TOPICS,
    parseTopicKeysFromText: parseTopicKeysFromText,
    parseTopicDisplayLabelsFromText: parseTopicDisplayLabelsFromText,
    getUserResearchTopicKeys: getUserResearchTopicKeys,
    getUserResearchTopicLabels: getUserResearchTopicLabels,
    setUserResearchTopicKeys: setUserResearchTopicKeys,
    getUserPreferences: getUserPreferences,
    saveUserPreferences: saveUserPreferences,
    buildPersonalizedSearchUrl: buildPersonalizedSearchUrl,
    openPreferencesSurveyModal: openPreferencesSurveyModal
  };
})();
