/**
 * ConfGuide — Shared Utility Module (js/utils.js)
 * Cung cấp các hàm tính toán Deadline chuẩn AoE, Huy hiệu trạng thái, và Xuất Lịch
 * Tương thích Vanilla JS và hoạt động trên file:///
 */

(function () {
  'use strict';

  // Quy ước múi giờ AoE (Anywhere on Earth, UTC-12)
  // Deadline ngày YYYY-MM-DD kết thúc lúc 23:59:59 UTC-12
  function parseAoEDate(dateStr) {
    if (!dateStr) return null;
    // Chuẩn hóa định dạng YYYY-MM-DD
    const cleanDate = String(dateStr).trim().split('T')[0];
    const aoeIso = `${cleanDate}T23:59:59-12:00`;
    const d = new Date(aoeIso);
    return isNaN(d.getTime()) ? null : d;
  }

  // Số ngày còn lại tính theo ngày thực tế đến hạn AoE
  function daysLeft(dateStr) {
    const aoeTarget = parseAoEDate(dateStr);
    if (!aoeTarget) return null;
    const now = new Date();
    const diffMs = aoeTarget.getTime() - now.getTime();
    if (diffMs >= 0) {
      return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    } else {
      return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    }
  }

  // Lấy chi tiết đếm ngược (ngày, giờ, phút, giây) cho ticker
  function getAoETimeRemaining(dateStr) {
    const aoeTarget = parseAoEDate(dateStr);
    if (!aoeTarget) return null;
    const now = new Date();
    const diffMs = aoeTarget.getTime() - now.getTime();

    if (diffMs <= 0) {
      return { totalMs: diffMs, days: 0, hours: 0, minutes: 0, seconds: 0, isPassed: true };
    }

    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return { totalMs: diffMs, days, hours, minutes, seconds, isPassed: false };
  }

  // Định dạng ngày hiển thị dd/mm/yyyy
  function formatDateVi(dateStr) {
    if (!dateStr) return 'Chưa công bố';
    const clean = String(dateStr).split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  function formatRangeVi(startDate, endDate) {
    if (!startDate) return 'Đang cập nhật';
    if (!endDate || startDate === endDate) return formatDateVi(startDate);
    return `${formatDateVi(startDate)} – ${formatDateVi(endDate)}`;
  }

  // Khai báo 4 mốc timeline chuẩn
  const MILESTONE_DEFINITIONS = [
    { key: 'abstract', name: 'Tóm tắt (Abstract)', shortName: 'Nộp Abstract' },
    { key: 'fullPaper', name: 'Bài hoàn chỉnh (Full paper)', shortName: 'Nộp Full Paper' },
    { key: 'notification', name: 'Thông báo kết quả (Notification)', shortName: 'Thông báo' },
    { key: 'cameraReady', name: 'Bản in hoàn thiện (Camera-ready)', shortName: 'Camera-Ready' }
  ];

  // Tìm mốc deadline tiếp theo gần nhất
  function getNextDeadline(conf) {
    if (!conf || !conf.deadlines) return null;

    const deadlines = conf.deadlines;
    const candidates = [];

    MILESTONE_DEFINITIONS.forEach(m => {
      const dateVal = deadlines[m.key];
      if (dateVal) {
        const left = daysLeft(dateVal);
        candidates.push({
          key: m.key,
          name: m.name,
          shortName: m.shortName,
          date: dateVal,
          daysLeft: left,
          isPassed: left !== null && left < 0
        });
      }
    });

    if (candidates.length === 0) return null;

    // Sắp xếp theo ngày tăng dần
    candidates.sort((a, b) => a.date.localeCompare(b.date));

    // Tìm mốc đầu tiên chưa qua
    const upcoming = candidates.find(c => !c.isPassed);
    if (upcoming) return upcoming;

    // Nếu đã qua hết, trả về mốc cuối cùng với isPassed = true
    return candidates[candidates.length - 1];
  }

  // Xác định trạng thái hội nghị:
  // "Đã diễn ra", "Đã đóng", "Sắp hết hạn", "Đang mở"
  function getStatus(conf) {
    if (!conf) return { code: 'unknown', label: 'Chưa rõ', badgeClass: 'status-closed', iconSvg: '' };

    const now = new Date();
    // 1. Kiểm tra đã diễn ra chưa
    const endAoE = parseAoEDate(conf.endDate || conf.startDate);
    if (endAoE && now.getTime() > endAoE.getTime()) {
      return {
        code: 'ended',
        label: 'Đã diễn ra',
        badgeClass: 'status-ended',
        iconSvg: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/></svg>`
      };
    }

    // 2. Kiểm tra mốc nộp bài (submission deadlines)
    const nextDeadline = getNextDeadline(conf);
    const submissionDeadline = conf.deadlines?.fullPaper || conf.deadlines?.abstract;
    const subLeft = submissionDeadline ? daysLeft(submissionDeadline) : (nextDeadline ? nextDeadline.daysLeft : null);

    // Nếu các mốc nộp bài đều đã qua nhưng hội nghị chưa kết thúc
    if (subLeft !== null && subLeft < 0) {
      return {
        code: 'closed',
        label: 'Đã đóng nộp bài',
        badgeClass: 'status-closed',
        iconSvg: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`
      };
    }

    // 3. Sắp hết hạn (mốc nộp bài gần nhất còn <= 14 ngày)
    if (subLeft !== null && subLeft >= 0 && subLeft <= 14) {
      return {
        code: 'urgent',
        label: 'Sắp hết hạn',
        badgeClass: 'status-urgent',
        iconSvg: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
      };
    }

    // 4. Đang mở nộp bài
    return {
      code: 'open',
      label: 'Đang mở nộp bài',
      badgeClass: 'status-open',
      iconSvg: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="20 6 9 17 4 12"/></svg>`
    };
  }

  // ================= TẠO LỊCH (GOOGLE CALENDAR & ICS) =================
  // Định dạng ngày cho Google Calendar: YYYYMMDDTHHmmssZ
  function toGCalDateTime(dateStr) {
    const aoe = parseAoEDate(dateStr);
    if (!aoe) return '';
    // Format YYYYMMDDTHHmmssZ theo UTC
    return aoe.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  }

  function getGoogleCalendarUrl(title, details, location, dateStr) {
    const startIso = toGCalDateTime(dateStr);
    // Thời lượng mặc định 1 giờ
    const aoe = parseAoEDate(dateStr);
    const endIso = aoe ? new Date(aoe.getTime() + 3600000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z' : startIso;

    const base = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
    const params = new URLSearchParams({
      text: title,
      dates: `${startIso}/${endIso}`,
      details: details || '',
      location: location || ''
    });
    return `${base}&${params.toString()}`;
  }

  // Tạo nội dung file .ics với 2 cảnh báo nhắc trước (7 ngày và 1 ngày)
  function createIcsContent(events) {
    const nowIso = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ConfGuide//Academic Conference Deadlines//VI',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];

    events.forEach((ev, idx) => {
      const dtStart = toGCalDateTime(ev.date);
      const dtEnd = dtStart;
      const uid = `confguide-${Date.now()}-${idx}@confguide.uit.edu.vn`;

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${uid}`);
      lines.push(`DTSTAMP:${nowIso}`);
      lines.push(`DTSTART:${dtStart}`);
      lines.push(`DTEND:${dtEnd}`);
      lines.push(`SUMMARY:${escapeIcsText(ev.title)}`);
      lines.push(`DESCRIPTION:${escapeIcsText(ev.description || '')}`);
      lines.push(`LOCATION:${escapeIcsText(ev.location || '')}`);

      // Alarm nhắc trước 7 ngày (-P7D)
      lines.push('BEGIN:VALARM');
      lines.push('TRIGGER:-P7D');
      lines.push('ACTION:DISPLAY');
      lines.push(`DESCRIPTION:Nhắc nhở: 7 ngày nữa đến hạn ${escapeIcsText(ev.title)}`);
      lines.push('END:VALARM');

      // Alarm nhắc trước 1 ngày (-P1D)
      lines.push('BEGIN:VALARM');
      lines.push('TRIGGER:-P1D');
      lines.push('ACTION:DISPLAY');
      lines.push(`DESCRIPTION:Khẩn cấp: 1 ngày nữa đến hạn ${escapeIcsText(ev.title)} (AoE)`);
      lines.push('END:VALARM');

      lines.push('END:VEVENT');
    });

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  function escapeIcsText(text) {
    return String(text || '')
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }

  function downloadIcsFile(filename, icsContent) {
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function escapeHtml(value) {
    if (!value) return '';
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  // Dữ liệu dự phòng chuẩn hóa theo Schema mới
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
      "keywords": ["computer vision", "cvpr", "deep learning", "generative ai", "image processing"],
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
      "summarization": "Hội nghị quốc tế uy tín số 1 thế giới về thị giác máy tính và nhận dạng mẫu.",
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
      "fields": ["machine learning", "deep learning", "ai", "reinforcement learning"],
      "keywords": ["machine learning", "neurips", "deep learning", "foundation models", "ai safety"],
      "fee": "900 USD",
      "location": "Sydney, Australia",
      "startDate": "2026-12-06",
      "endDate": "2026-12-12",
      "website": "https://neurips.cc/",
      "deadlines": {
        "abstract": "2026-05-15",
        "fullPaper": "2026-05-22",
        "notification": "2026-09-20",
        "cameraReady": "2026-10-25"
      },
      "lastVerified": "2026-03-15",
      "summarization": "Hội nghị học máy và khoa học thần kinh tính toán hàng đầu thế giới.",
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
      "publisher": "ICLR Foundation",
      "indexing": ["Scopus", "DBLP"],
      "fields": ["deep learning", "representation learning", "ai"],
      "keywords": ["iclr", "representation learning", "deep learning", "transformers", "llm"],
      "fee": "750 USD",
      "location": "Singapore",
      "startDate": "2026-04-26",
      "endDate": "2026-04-30",
      "website": "https://iclr.cc/",
      "deadlines": {
        "abstract": "2025-10-15",
        "fullPaper": "2025-10-22",
        "notification": "2026-01-20",
        "cameraReady": "2026-03-05"
      },
      "lastVerified": "2026-03-15",
      "summarization": "Hội nghị hàng đầu về biểu diễn học và học sâu.",
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
      "keywords": ["nlp", "natural language processing", "llm", "acl", "linguistics"],
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
      "summarization": "Diễn đàn quốc tế uy tín nhất về xử lý ngôn ngữ tự nhiên và các mô hình ngôn ngữ lớn.",
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
      "summarization": "Hội nghị quốc tế thường niên về công nghệ truyền thông và viễn thông tại Việt Nam.",
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
      "summarization": "Hội thảo quốc tế về CNTT quy tụ các hướng nghiên cứu hiện đại: AI, An ninh mạng, Big Data.",
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
      "summarization": "Hội nghị quốc tế chuyên sâu về Phân tích Đa phương tiện và Nhận dạng Mẫu do UIT chủ trì.",
      "rating": 4.4,
      "rating_count": 48
    }
  ];

  const root = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this);
  root.ConfGuideUtils = {
    parseAoEDate,
    daysLeft,
    getAoETimeRemaining,
    formatDateVi,
    formatRangeVi,
    getNextDeadline,
    getStatus,
    MILESTONE_DEFINITIONS,
    getGoogleCalendarUrl,
    createIcsContent,
    downloadIcsFile,
    escapeHtml,
    FALLBACK_CONFERENCES
  };
})();
