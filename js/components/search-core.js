/**
 * ConfGuide — Lõi Tìm kiếm, Lọc Đa chiều & Khớp Mờ (js/components/search-core.js)
 * Trang sử dụng: search.html
 * Phụ thuộc: Không bắt buộc (tự động tận dụng ConfGuideUtils.escapeHtml nếu có)
 * Chức năng: Cung cấp logic thuần túy (không truy cập DOM, URL hay Storage):
 * chuẩn hóa văn bản tiếng Việt, khoảng cách Damerau-Levenshtein, lập chỉ mục tìm kiếm,
 * tính điểm xếp hạng, phân đoạn từ khóa, đếm facet, gợi ý nới lỏng và yieldToMain.
 */

(function () {
  'use strict';

  /* ================= 1. HẰNG SỐ & CẤU HÌNH ================= */

  /** Trọng số xếp hạng các trường khi tìm kiếm theo từ khóa */
  const SEARCH_WEIGHTS = {
    acronym: 2,
    topics: 2,
    fullName: 1,
    summary: 0.5
  };

  /** Ngưỡng ngày tính trạng thái "Sắp hết hạn" */
  const CLOSING_SOON_DAYS = 14;

  /** Bản đồ chuẩn hóa tên lĩnh vực đơn & bí danh (khóa đã bỏ dấu/viết thường -> tên hiển thị chuẩn) */
  const TOPIC_ALIAS_MAP = {
    'tri tue nhan tao': 'Trí tuệ nhân tạo',
    ai: 'Trí tuệ nhân tạo',
    'ai foundations': 'Trí tuệ nhân tạo',
    'healthcare ai': 'Trí tuệ nhân tạo',
    'artificial intelligence': 'Trí tuệ nhân tạo',
    'hoc may': 'Học máy',
    'machine learning': 'Học máy',
    'deep learning': 'Học máy',
    'khoa hoc du lieu': 'Khoa học dữ liệu',
    'data science': 'Khoa học dữ liệu',
    data: 'Khoa học dữ liệu',
    'du lieu lon': 'Dữ liệu lớn',
    'big data': 'Dữ liệu lớn',
    'du lieu': 'Dữ liệu',
    'thi giac may tinh': 'Thị giác máy tính',
    'computer vision': 'Thị giác máy tính',
    vision: 'Thị giác máy tính',
    'pattern recognition': 'Thị giác máy tính',
    'da phuong tien': 'Đa phương tiện',
    multimedia: 'Đa phương tiện',
    'an toan thong tin': 'An toàn thông tin',
    'cyber security': 'An toàn thông tin',
    security: 'An toàn thông tin',
    privacy: 'An toàn thông tin',
    'mang may tinh': 'Mạng máy tính',
    network: 'Mạng máy tính',
    'wireless networks': 'Mạng máy tính',
    iot: 'IoT',
    'internet of things': 'IoT',
    'truyen thong': 'Truyền thông',
    communications: 'Truyền thông',
    robot: 'Robot',
    robotics: 'Robot',
    'tu dong hoa': 'Tự động hóa',
    'dieu khien': 'Điều khiển',
    'he thong thong tin': 'Hệ thống thông tin',
    infosys: 'Hệ thống thông tin',
    'knowledge engineering': 'Hệ thống thông tin',
    'chuyen doi so': 'Chuyển đổi số',
    'dien tu': 'Điện tử',
    electronics: 'Điện tử',
    'vien thong': 'Viễn thông',
    'xu ly tin hieu': 'Xử lý tín hiệu',
    'cong nghe phan mem': 'Công nghệ phần mềm',
    'ky thuat phan mem': 'Công nghệ phần mềm',
    'software engineering': 'Công nghệ phần mềm',
    software: 'Công nghệ phần mềm',
    'cntt tong hop': 'CNTT tổng hợp',
    general: 'CNTT tổng hợp',
    'xu ly ngon ngu tu nhien': 'Xử lý ngôn ngữ tự nhiên',
    nlp: 'Xử lý ngôn ngữ tự nhiên',
    'tuong tac nguoi-may': 'Tương tác người-máy',
    'tuong tac nguoi may': 'Tương tác người-máy',
    hci: 'Tương tác người-máy',
    'cong nghe giao duc': 'Công nghệ giáo dục',
    'dien toan dam may': 'Điện toán đám mây',
    'cloud computing': 'Điện toán đám mây',
    cloud: 'Điện toán đám mây',
    'he thong phan tan': 'Hệ thống phân tán',
    'high performance computing': 'Hệ thống phân tán'
  };

  /** Bảng mở rộng an toàn cho các khóa URL gộp cũ sang khóa lĩnh vực đơn tương ứng */
  const LEGACY_TOPIC_EXPANSIONS = {
    'ai-data': ['tri-tue-nhan-tao', 'hoc-may', 'khoa-hoc-du-lieu', 'du-lieu-lon'],
    'network-iot': ['mang-may-tinh', 'iot', 'truyen-thong', 'vien-thong'],
    electronics: ['dien-tu'],
    software: ['cong-nghe-phan-mem'],
    security: ['an-toan-thong-tin'],
    'cross-domain': ['cntt-tong-hop']
  };

  /* ================= 2. HÀM HỖ TRỢ CHUẨN HÓA & SO KHỚP CHUỖI ================= */

  /**
   * Chuẩn hóa chuỗi văn bản không dấu phục vụ so sánh và tìm kiếm:
   * chuyển chữ thường, tách tổ hợp NFD, xóa dấu tiếng Việt, đổi đ/Đ -> d/d,
   * giữ ánh xạ 1:1 theo từng ký tự gốc để hỗ trợ làm nổi từ khóa (<mark>).
   * @param {*} str - Chuỗi đầu vào.
   * @returns {string} Chuỗi ký tự ASCII thường đã chuẩn hóa.
   */
  function normalizeText(str) {
    if (str === null || str === undefined) return '';
    const src = String(str);
    let res = '';
    for (let i = 0; i < src.length; i++) {
      const ch = src[i];
      if (ch === 'đ' || ch === 'Đ') {
        res += 'd';
        continue;
      }
      const decomposed = ch.normalize('NFD');
      const base = decomposed.replace(/[\u0300-\u036f]/g, '').toLowerCase();
      res += base.length === 1 ? base : (base[0] || ' ');
    }
    return res;
  }

  /**
   * Khởi tạo ma trận 2 chiều phục vụ thuật toán Damerau-Levenshtein.
   * @param {number} len1 - Độ dài chuỗi thứ nhất.
   * @param {number} len2 - Độ dài chuỗi thứ hai.
   * @returns {Array<Array<number>>} Ma trận (len1 + 2) x (len2 + 2) đã gán biên.
   */
  function createEditMatrix(len1, len2) {
    const inf = len1 + len2;
    const matrix = Array.from({ length: len1 + 2 }, () => new Array(len2 + 2).fill(0));
    matrix[0][0] = inf;
    for (let i = 0; i <= len1; i++) {
      matrix[i + 1][0] = inf;
      matrix[i + 1][1] = i;
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j + 1] = inf;
      matrix[1][j + 1] = j;
    }
    return matrix;
  }

  /**
   * Tính khoảng cách Damerau-Levenshtein giữa 2 chuỗi
   * (cho phép chèn, xóa, thay thế và hoán vị hai ký tự kề nhau).
   * @param {string} a - Chuỗi thứ nhất.
   * @param {string} b - Chuỗi thứ hai.
   * @returns {number} Khoảng cách chỉnh sửa tối thiểu.
   */
  function damerauLevenshtein(a, b) {
    if (a === b) return 0;
    const s1 = String(a || '');
    const s2 = String(b || '');
    if (!s1.length) return s2.length;
    if (!s2.length) return s1.length;

    const da = {};
    const d = createEditMatrix(s1.length, s2.length);

    for (let i = 1; i <= s1.length; i++) {
      let db = 0;
      for (let j = 1; j <= s2.length; j++) {
        const i1 = da[s2[j - 1]] || 0;
        const j1 = db;
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        if (cost === 0) db = j;

        d[i + 1][j + 1] = Math.min(
          d[i][j + 1] + 1,
          d[i + 1][j] + 1,
          d[i][j] + cost,
          d[i1][j1] + (i - i1 - 1) + 1 + (j - j1 - 1)
        );
      }
      da[s1[i - 1]] = i;
    }

    return d[s1.length + 1][s2.length + 1];
  }

  /**
   * Phân đoạn từ khóa thô bằng `Intl.Segmenter` tiếng Việt (rơi về tách khoảng trắng nếu thiếu).
   * @param {string} text - Văn bản đầu vào đã trim.
   * @returns {Array<string>} Danh sách từ khóa thô chưa chuẩn hóa dấu.
   */
  function extractRawWordSegments(text) {
    if (typeof Intl === 'undefined' || typeof Intl.Segmenter !== 'function') {
      return text.split(/\s+/).filter(Boolean);
    }
    try {
      const segmenter = new Intl.Segmenter('vi', { granularity: 'word' });
      return Array.from(segmenter.segment(text))
        .filter(seg => seg.isWordLike)
        .map(seg => seg.segment);
    } catch (e) {
      return text.split(/\s+/).filter(Boolean);
    }
  }

  /**
   * Tách các từ khóa từ chuỗi truy vấn bằng Intl.Segmenter (có fallback sang split khoảng trắng).
   * @param {string} rawQuery - Chuỗi truy vấn.
   * @returns {Array<string>} Danh sách token đã chuẩn hóa.
   */
  function tokenizeQuery(rawQuery) {
    if (!rawQuery) return [];
    const text = String(rawQuery).trim();
    if (!text) return [];

    const tokens = [];
    extractRawWordSegments(text).forEach(tk => {
      const norm = normalizeText(tk).trim();
      if (norm && !tokens.includes(norm)) tokens.push(norm);
    });
    return tokens;
  }

  /**
   * Tạo khóa slug ASCII dạng kebab-case từ tên lĩnh vực đơn.
   * @param {string} label - Tên lĩnh vực đã chuẩn hóa.
   * @returns {string} Khóa slug ASCII kebab-case.
   */
  function toTopicSlug(label) {
    return normalizeText(label)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Chuẩn hóa tên một lĩnh vực đơn: cắt khoảng trắng, bỏ chú thích ngoặc thừa và thống nhất chữ hoa/dấu.
   * @param {string} rawPiece - Đoạn tên lĩnh vực sau khi tách theo dấu nối.
   * @returns {string} Tên lĩnh vực đơn chuẩn hóa hoặc chuỗi rỗng nếu không hợp lệ.
   */
  function normalizeSingleTopicLabel(rawPiece) {
    if (!rawPiece || typeof rawPiece !== 'string') return '';
    const cleaned = rawPiece
      .replace(/\s*\(nhiều lĩnh vực\)\s*/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!cleaned) return '';

    const normKey = normalizeText(cleaned);
    if (Object.prototype.hasOwnProperty.call(TOPIC_ALIAS_MAP, normKey)) {
      return TOPIC_ALIAS_MAP[normKey];
    }
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  /**
   * Trích xuất danh sách chuỗi lĩnh vực thô từ tham số truyền vào (chuỗi, mảng hoặc đối tượng hội nghị).
   * @param {string|Array<string>|Object|null|undefined} fieldInput - Dữ liệu lĩnh vực đầu vào.
   * @returns {Array<string>} Mảng chuỗi thô cần tách và chuẩn hóa.
   */
  function extractRawTopicSource(fieldInput) {
    if (!fieldInput) return [];
    if (typeof fieldInput === 'string') return [fieldInput];
    if (Array.isArray(fieldInput)) return fieldInput;
    if (typeof fieldInput === 'object') {
      if (Array.isArray(fieldInput.topic_labels) && fieldInput.topic_labels.length > 0) {
        return fieldInput.topic_labels;
      }
      if (typeof fieldInput.topic_labels === 'string' && fieldInput.topic_labels.trim()) {
        return [fieldInput.topic_labels];
      }
      if (Array.isArray(fieldInput.fields) && fieldInput.fields.length > 0) return fieldInput.fields;
      if (typeof fieldInput.fields === 'string' && fieldInput.fields.trim()) return [fieldInput.fields];
      if (Array.isArray(fieldInput.topics) && fieldInput.topics.length > 0) return fieldInput.topics;
    }
    return [];
  }

  /**
   * Chuẩn hóa và tách dữ liệu lĩnh vực của một hội nghị thành mảng các lĩnh vực đơn duy nhất:
   * cắt khoảng trắng, tách theo các dấu nối (",", ";", "/", "&", " và "), gộp trùng theo khóa kebab-case
   * và thống nhất cách viết hoa/thường, dấu tiếng Việt.
   * @param {string|Array<string>|Object|null|undefined} fieldInput - Chuỗi gộp, mảng chuỗi hoặc đối tượng hội nghị.
   * @returns {Array<{ key: string, label: string }>} Mảng các lĩnh vực đơn `{ key, label }`.
   */
  function normalizeTopicFields(fieldInput) {
    const rawItems = extractRawTopicSource(fieldInput);
    if (rawItems.length === 0) return [];

    const seenKeys = new Set();
    const result = [];

    rawItems.forEach(item => {
      if (item === null || item === undefined) return;
      const text = String(item).trim();
      if (!text) return;

      // Chỉ tách theo dấu nối liệt kê thực tế, không cắt cụm từ có nghĩa (ví dụ "Cơ sở dữ liệu")
      const pieces = text.split(/(?:\s*[,;/&\n]+\s*|\s+và\s+)/gi);
      pieces.forEach(piece => {
        const label = normalizeSingleTopicLabel(piece);
        if (!label) return;
        const key = toTopicSlug(label);
        if (!key || seenKeys.has(key)) return;
        seenKeys.add(key);
        result.push({ key, label });
      });
    });

    return result;
  }

  /**
   * Mở rộng danh sách tham số lọc lĩnh vực từ URL (hỗ trợ cả khóa đơn và khóa gộp cũ).
   * @param {Array<string>} rawChunks - Mảng chuỗi giá trị đọc từ tham số `topic` trên URL.
   * @returns {Array<string>} Mảng khóa lĩnh vực đơn duy nhất dạng kebab-case.
   */
  function expandTopicFilterValues(rawChunks) {
    if (!Array.isArray(rawChunks) || rawChunks.length === 0) return [];
    const slugs = [];
    const seen = new Set();

    const pushSlug = slug => {
      if (slug && !seen.has(slug)) {
        seen.add(slug);
        slugs.push(slug);
      }
    };

    rawChunks.forEach(chunk => {
      String(chunk || '')
        .split(',')
        .map(part => part.trim())
        .filter(Boolean)
        .forEach(token => {
          const lower = token.toLowerCase();
          if (Object.prototype.hasOwnProperty.call(LEGACY_TOPIC_EXPANSIONS, lower)) {
            LEGACY_TOPIC_EXPANSIONS[lower].forEach(pushSlug);
            return;
          }
          if (/^[a-z0-9-]+$/.test(lower)) {
            const spaceForm = lower.replace(/-/g, ' ');
            const aliasLabel = TOPIC_ALIAS_MAP[lower] || TOPIC_ALIAS_MAP[spaceForm];
            pushSlug(aliasLabel ? toTopicSlug(aliasLabel) : lower);
            return;
          }
          const normalized = normalizeTopicFields(token);
          if (normalized.length > 0) {
            normalized.forEach(item => pushSlug(item.key));
          } else {
            pushSlug(toTopicSlug(token));
          }
        });
    });

    return slugs;
  }

  /**
   * Xây dựng chỉ mục tìm kiếm tĩnh 1 lần cho danh sách hội nghị đã chuẩn hóa.
   * @param {Array<Object>} conferences Danh sách hội nghị.
   * @returns {Array<Object>} Danh sách kèm trường chỉ mục _searchIndex.
   */
  function buildIndex(conferences) {
    if (!Array.isArray(conferences)) return [];

    return conferences.map(conf => {
      if (!conf) return conf;

      const normName = normalizeText(conf.name || '');
      const normFullName = normalizeText(conf.full_name || conf.fullName || '');
      const normLocation = normalizeText(conf.location || '');
      const topicItems = normalizeTopicFields(conf);
      const normTopics = topicItems.map(item => normalizeText(item.label)).join(' ');
      const normSummary = normalizeText(conf.summarization || conf.summary || '');

      // Tách tập từ khóa của từng trường để so khớp nhanh
      const nameTokens = tokenizeQuery(normName);
      const fullNameTokens = tokenizeQuery(normFullName);
      const topicTokens = tokenizeQuery(normTopics);

      const searchBlob = `${normName} ${normFullName} ${normLocation} ${normTopics} ${normSummary}`;

      const indexed = Object.assign({}, conf, {
        _searchIndex: {
          normName,
          normFullName,
          normLocation,
          normTopics,
          normSummary,
          nameTokens,
          fullNameTokens,
          topicTokens,
          searchBlob
        }
      });

      return indexed;
    });
  }

  /**
   * Tìm khớp mờ Damerau-Levenshtein giữa token (>= 4 ký tự) với toàn chuỗi trường hoặc từng từ.
   * @param {string} token - Token truy vấn đã chuẩn hóa.
   * @param {string} targetField - Toàn bộ chuỗi trường đích.
   * @param {Array<string>} fieldTokens - Các token của trường đích.
   * @returns {{ matched: boolean, score: number, isExactOrSub: boolean }} Kết quả khớp mờ.
   */
  function matchFuzzyInField(token, targetField, fieldTokens) {
    const noMatch = { matched: false, score: 0, isExactOrSub: false };
    if (token.length < 4) return noMatch;

    const maxDist = token.length >= 6 ? 2 : 1;
    if (Math.abs(targetField.length - token.length) <= maxDist) {
      const dist = damerauLevenshtein(token, targetField);
      if (dist <= maxDist) {
        return { matched: true, score: 1 - dist * 0.25, isExactOrSub: false };
      }
    }

    for (let i = 0; i < fieldTokens.length; i++) {
      const fToken = fieldTokens[i];
      if (Math.abs(fToken.length - token.length) > maxDist) continue;
      const dist = damerauLevenshtein(token, fToken);
      if (dist <= maxDist) {
        return { matched: true, score: 0.8 - dist * 0.2, isExactOrSub: false };
      }
    }
    return noMatch;
  }

  /**
   * Kiểm tra mức độ khớp của 1 token với 1 trường và trả về điểm số:
   * Bằng hệt > Tiền tố > Chứa chuỗi > Khớp mờ (Damerau-Levenshtein).
   * @param {string} token - Từ khóa tìm kiếm (đã chuẩn hóa).
   * @param {string} targetField - Chuỗi trường đích (đã chuẩn hóa).
   * @param {Array<string>} [fieldTokens=[]] - Danh sách token của trường đích.
   * @param {boolean} [allowFuzzy=false] - Có cho phép khớp mờ không.
   * @returns {{ matched: boolean, score: number, isExactOrSub: boolean }} Kết quả khớp.
   */
  function matchTokenInField(token, targetField, fieldTokens = [], allowFuzzy = false) {
    if (!token || !targetField) {
      return { matched: false, score: 0, isExactOrSub: false };
    }
    if (targetField === token) return { matched: true, score: 4, isExactOrSub: true };
    if (fieldTokens.includes(token)) return { matched: true, score: 3.5, isExactOrSub: true };
    if (targetField.startsWith(token)) return { matched: true, score: 3, isExactOrSub: true };
    if (fieldTokens.some(tk => tk.startsWith(token))) return { matched: true, score: 2.5, isExactOrSub: true };
    if (targetField.includes(token)) return { matched: true, score: 2, isExactOrSub: true };

    return allowFuzzy
      ? matchFuzzyInField(token, targetField, fieldTokens)
      : { matched: false, score: 0, isExactOrSub: false };
  }

  /**
   * Tính điểm cao nhất của 1 token trên các trường tìm kiếm của hội nghị.
   * @param {string} token - Token truy vấn.
   * @param {Object} fields - Tập chuỗi & token của các trường đã chuẩn hóa.
   * @returns {number|null} Điểm cao nhất hoặc null nếu không trường nào khớp.
   */
  function scoreTokenAcrossFields(token, fields) {
    const candidates = [
      { res: matchTokenInField(token, fields.normName, fields.nameTokens, true), weight: SEARCH_WEIGHTS.acronym },
      { res: matchTokenInField(token, fields.normTopics, fields.topicTokens, true), weight: SEARCH_WEIGHTS.topics },
      {
        res: matchTokenInField(token, fields.normFullName, fields.fullNameTokens, true),
        weight: SEARCH_WEIGHTS.fullName
      },
      { res: matchTokenInField(token, fields.normSummary, [], false), weight: SEARCH_WEIGHTS.summary }
    ];

    let bestScore = 0;
    let matched = false;
    for (let i = 0; i < candidates.length; i++) {
      if (!candidates[i].res.matched) continue;
      matched = true;
      bestScore = Math.max(bestScore, candidates[i].res.score * candidates[i].weight);
    }
    return matched ? bestScore : null;
  }

  /**
   * Tính điểm xếp hạng tìm kiếm của một hội nghị theo câu truy vấn:
   * mọi token phải khớp (phép AND) và cộng điểm thưởng nếu khớp tên viết tắt.
   * @param {Object} conf - Hội nghị đã có _searchIndex.
   * @param {Array<string>} queryTokens - Danh sách token truy vấn.
   * @param {string} rawQuery - Chuỗi truy vấn gốc.
   * @returns {{ matched: boolean, score: number }} Kết quả khớp và tổng điểm.
   */
  function scoreConference(conf, queryTokens, rawQuery) {
    if (!queryTokens || queryTokens.length === 0) {
      return { matched: true, score: 0 };
    }

    const idx = conf._searchIndex || {};
    const fields = {
      normName: idx.normName !== undefined ? idx.normName : normalizeText(conf.name || ''),
      normFullName: idx.normFullName !== undefined
        ? idx.normFullName
        : normalizeText(conf.full_name || conf.fullName || ''),
      normTopics: idx.normTopics !== undefined
        ? idx.normTopics
        : normalizeTopicFields(conf).map(item => normalizeText(item.label)).join(' '),
      normSummary: idx.normSummary !== undefined
        ? idx.normSummary
        : normalizeText(conf.summarization || conf.summary || '')
    };
    fields.nameTokens = idx.nameTokens || tokenizeQuery(fields.normName);
    fields.fullNameTokens = idx.fullNameTokens || tokenizeQuery(fields.normFullName);
    fields.topicTokens = idx.topicTokens || tokenizeQuery(fields.normTopics);

    let totalScore = 0;
    for (let i = 0; i < queryTokens.length; i++) {
      const tokenScore = scoreTokenAcrossFields(queryTokens[i], fields);
      if (tokenScore === null) return { matched: false, score: 0 };
      totalScore += tokenScore;
    }

    // Thưởng điểm nếu acronym trùng hệt hoặc bắt đầu bằng cụm từ khóa chuẩn hóa
    const normQuery = normalizeText(rawQuery).trim();
    if (normQuery && fields.normName === normQuery) totalScore += 5;
    else if (normQuery && fields.normName.startsWith(normQuery)) totalScore += 2;

    return { matched: true, score: totalScore };
  }

  /* ================= 3. BỘ LỌC ĐA CHIỀU & FACET PRE-COUNTS ================= */

  const VALID_RANK_CODES = new Set(['A*', 'A', 'B', 'C']);

  /**
   * Chuẩn hóa khóa phân hạng CORE của hội nghị về `'A*'`, `'A'`, `'B'`, `'C'` hoặc `'unranked'`.
   * @param {Object|string} confOrRank - Đối tượng hội nghị hoặc chuỗi phân hạng.
   * @returns {'A*'|'A'|'B'|'C'|'unranked'} Khóa phân hạng chuẩn hóa.
   */
  function normalizeRankKey(confOrRank) {
    const rawSource = confOrRank && typeof confOrRank === 'object' && 'rank' in confOrRank
      ? (confOrRank.rank && typeof confOrRank.rank === 'object' ? confOrRank.rank.core : confOrRank.rank)
      : confOrRank;
    const upper = String(rawSource || '').trim().toUpperCase();
    return VALID_RANK_CODES.has(upper) ? upper : 'unranked';
  }

  /**
   * Chuẩn hóa khóa hình thức tổ chức thực tế từ JSON (`offline`, `hybrid`, `online`, `unknown`).
   * @param {Object|string} confOrMode - Đối tượng hội nghị hoặc giá trị mode.
   * @returns {'offline'|'hybrid'|'online'|'unknown'} Khóa hình thức tổ chức chuẩn hóa.
   */
  function normalizeModeKey(confOrMode) {
    const rawMode = confOrMode && typeof confOrMode === 'object'
      ? (confOrMode.modeKey || confOrMode.attendance_mode || confOrMode.attendanceMode || '')
      : confOrMode;
    const rawLabel = confOrMode && typeof confOrMode === 'object'
      ? (confOrMode.attendance_label || confOrMode.attendanceLabel || '')
      : '';
    const token = normalizeText(rawMode || rawLabel).trim();
    if (!token) return 'unknown';
    if (token === 'offline' || token === 'in-person' || token === 'inperson' || token.includes('truc tiep')) {
      if (token.includes('ket hop') || token.includes('hybrid') || token.includes('truc tuyen')) return 'hybrid';
      return 'offline';
    }
    if (token === 'hybrid' || token.includes('ket hop')) return 'hybrid';
    if (token === 'online' || token.includes('truc tuyen') || token.includes('virtual')) return 'online';
    return 'unknown';
  }

  /**
   * Kiểm tra giá trị trạng thái CFP của hội nghị có khớp lựa chọn lọc hay không.
   * @param {string} confCfp - Trạng thái CFP của hội nghị.
   * @param {string} targetVal - Giá trị lọc đang chọn.
   * @returns {boolean} True nếu khớp.
   */
  function isCfpValueMatch(confCfp, targetVal) {
    if (targetVal === 'open') {
      return confCfp === 'open' || confCfp === 'closingSoon';
    }
    return confCfp === targetVal;
  }

  /**
   * Kiểm tra hội nghị có thỏa mãn nhóm lọc Hạn nộp bài (CFP) hay không.
   * @param {Object} conf - Đối tượng hội nghị.
   * @param {string|Array<string>} cfpVal - Giá trị bộ lọc CFP.
   * @returns {boolean} True nếu thỏa mãn.
   */
  function matchesCfpGroup(conf, cfpVal) {
    const confCfp = conf.cfpStatus || 'unknown';
    if (Array.isArray(cfpVal)) {
      if (cfpVal.length === 0 || cfpVal.includes('all')) return true;
      return cfpVal.some(val => isCfpValueMatch(confCfp, val));
    }
    if (!cfpVal || cfpVal === 'all') return true;
    return isCfpValueMatch(confCfp, cfpVal);
  }

  /**
   * Kiểm tra hội nghị có khớp điều kiện Tháng diễn ra / Đang diễn ra hay không.
   * @param {Object} conf - Đối tượng hội nghị.
   * @param {Object} filterState - Trạng thái bộ lọc.
   * @returns {boolean} True nếu thỏa mãn.
   */
  function matchesMonthGroup(conf, filterState) {
    if (filterState.month && conf.eventMonth !== filterState.month) return false;
    if (filterState.ongoing && conf.eventPhase !== 'ongoing') return false;
    return true;
  }

  /**
   * Kiểm tra hội nghị có khớp khoảng ngày hạn nộp (`dateFrom` - `dateTo`) hay không.
   * @param {Object} conf - Đối tượng hội nghị.
   * @param {Object} filterState - Trạng thái bộ lọc.
   * @returns {boolean} True nếu thỏa mãn.
   */
  function matchesDateRangeGroup(conf, filterState) {
    if (!filterState.dateFrom && !filterState.dateTo) return true;

    const targetDeadline = conf.firstSubmissionDeadline || (Array.isArray(conf.submissionDeadlines) ? conf.submissionDeadlines[0] : null);
    if (!targetDeadline || !targetDeadline.date) return false;
    if (filterState.dateFrom && targetDeadline.date < filterState.dateFrom) return false;
    if (filterState.dateTo && targetDeadline.date > filterState.dateTo) return false;
    return true;
  }

  /**
   * Kiểm tra hội nghị có thỏa mãn nhóm lọc Địa điểm hay không.
   * @param {Object} conf - Đối tượng hội nghị.
   * @param {string|Array<string>} cityVal - Thành phố / nhóm thành phố được chọn.
   * @returns {boolean} True nếu thỏa mãn.
   */
  function matchesCityGroup(conf, cityVal) {
    const confCity = conf.cityKey || 'other';
    if (Array.isArray(cityVal)) {
      if (cityVal.length === 0 || cityVal.includes('all')) return true;
      return cityVal.includes(confCity);
    }
    if (!cityVal || cityVal === 'all') return true;
    return confCity === cityVal;
  }

  /**
   * Kiểm tra một hội nghị có thỏa mãn các bộ lọc đang chọn hay không.
   * Quy tắc: Trong cùng 1 nhóm là OR, giữa các nhóm khác nhau là AND.
   * @param {Object} conf - Hội nghị.
   * @param {Object} filterState - Trạng thái lọc.
   * @param {Object} [enabledGroups] - Cấu hình bật/tắt nhóm.
   * @returns {boolean} True nếu thỏa mãn tất cả nhóm đang bật.
   */
  function matchesFilters(
    conf,
    filterState,
    enabledGroups = { rank: true, month: true, cfp: true, mode: true, when: true, where: true, what: true }
  ) {
    if (!conf || !filterState) return false;

    if (enabledGroups.rank !== false && Array.isArray(filterState.ranks) && filterState.ranks.length > 0) {
      const confRankKey = conf.rankKey || normalizeRankKey(conf);
      if (!filterState.ranks.includes(confRankKey)) return false;
    }
    if (enabledGroups.month !== false && enabledGroups.when !== false && !matchesMonthGroup(conf, filterState)) {
      return false;
    }
    if (enabledGroups.cfp !== false) {
      if (!matchesCfpGroup(conf, filterState.cfp)) return false;
      if (enabledGroups.when !== false && !matchesDateRangeGroup(conf, filterState)) return false;
    }
    if (enabledGroups.mode !== false && Array.isArray(filterState.modes) && filterState.modes.length > 0) {
      const confModeKey = normalizeModeKey(conf);
      if (!filterState.modes.includes(confModeKey)) return false;
    }
    if (enabledGroups.where !== false && !matchesCityGroup(conf, filterState.city)) return false;

    if (enabledGroups.what !== false && Array.isArray(filterState.topics) && filterState.topics.length > 0) {
      const confTopics = Array.isArray(conf.topics)
        ? conf.topics
        : normalizeTopicFields(conf).map(item => item.key);
      if (!filterState.topics.some(tKey => confTopics.includes(tKey))) return false;
    }
    return true;
  }

  /**
   * Tạo bản sao trạng thái lọc đã bỏ nhóm tương ứng và hàm kiểm tra lựa chọn facet.
   * @param {string} groupPrefix - Tiền tố nhóm (`rank`, `cfp`, `ongoing`, `mode`, `city`, `topic`).
   * @param {string} optionValue - Giá trị tùy chọn của facet.
   * @param {Object} filterState - Trạng thái bộ lọc gốc.
   * @returns {{ subState: Object, matchesOption: Function|null }} Cấu hình đếm facet.
   */
  function buildFacetEvaluator(groupPrefix, optionValue, filterState) {
    const subState = Object.assign({}, filterState);
    if (groupPrefix === 'rank') {
      subState.ranks = [];
      return {
        subState,
        matchesOption: conf => (conf.rankKey || normalizeRankKey(conf)) === optionValue
      };
    }
    if (groupPrefix === 'cfp') {
      subState.cfp = 'all';
      return {
        subState,
        matchesOption: conf => optionValue === 'all' || isCfpValueMatch(conf.cfpStatus || 'unknown', optionValue)
      };
    }
    if (groupPrefix === 'ongoing') {
      subState.ongoing = false;
      return { subState, matchesOption: conf => conf.eventPhase === 'ongoing' };
    }
    if (groupPrefix === 'mode') {
      subState.modes = [];
      return {
        subState,
        matchesOption: conf => normalizeModeKey(conf) === optionValue
      };
    }
    if (groupPrefix === 'city') {
      subState.city = 'all';
      return {
        subState,
        matchesOption: conf => optionValue === 'all' || (conf.cityKey || 'other') === optionValue
      };
    }
    if (groupPrefix === 'topic') {
      subState.topics = [];
      return {
        subState,
        matchesOption: conf => {
          const confTopics = Array.isArray(conf.topics)
            ? conf.topics
            : normalizeTopicFields(conf).map(item => item.key);
          return confTopics.includes(optionValue);
        }
      };
    }
    return { subState, matchesOption: null };
  }

  /**
   * Tính số kết quả trước (Faceted Search Pre-counts) cho từng lựa chọn:
   * số lượng của lựa chọn O thuộc nhóm G = số hội nghị khớp mọi nhóm khác G và thỏa mãn O.
   * @param {Array<Object>} conferences - Danh sách hội nghị.
   * @param {Object} filterState - Trạng thái lọc hiện tại.
   * @param {Array<string>} allFacetKeys - Danh sách các khóa facet cần đếm.
   * @param {Array<string>} [queryTokens=[]] - Token tìm kiếm đang áp dụng (nếu có).
   * @param {string} [rawQuery=''] - Từ khóa thô.
   * @returns {Object<string, number>} Bản đồ `{ [facetKey]: count }`.
   */
  function computeFacetCounts(conferences, filterState, allFacetKeys, queryTokens = [], rawQuery = '') {
    const counts = {};
    allFacetKeys.forEach(k => { counts[k] = 0; });
    if (!Array.isArray(conferences) || conferences.length === 0) return counts;

    const baseList = queryTokens.length > 0
      ? conferences.filter(conf => scoreConference(conf, queryTokens, rawQuery).matched)
      : conferences;

    allFacetKeys.forEach(facetKey => {
      const [groupPrefix, ...rest] = facetKey.split(':');
      const optionValue = rest.join(':');
      const { subState, matchesOption } = buildFacetEvaluator(groupPrefix, optionValue, filterState);
      if (!matchesOption) return;

      let matchCount = 0;
      for (let i = 0; i < baseList.length; i++) {
        const conf = baseList[i];
        if (matchesFilters(conf, subState) && matchesOption(conf)) matchCount++;
      }
      counts[facetKey] = matchCount;
    });

    return counts;
  }

  /* ================= 4. GỢI Ý NỚI LỎNG & CHÍNH TẢ ================= */

  /**
   * Đếm số hội nghị thỏa mãn sau khi áp dụng bản vá nới lỏng một nhóm lọc.
   * @param {Array<Object>} conferences - Danh sách hội nghị.
   * @param {Object} filterState - Trạng thái lọc gốc.
   * @param {Object} patch - Trường cần đặt lại trên filterState.
   * @param {Array<string>} queryTokens - Token tìm kiếm hiện tại.
   * @param {string} currentQuery - Từ khóa hiện tại.
   * @returns {number} Số kết quả khớp sau nới lỏng.
   */
  function countRelaxedMatches(conferences, filterState, patch, queryTokens, currentQuery) {
    const stateWithout = Object.assign({}, filterState, patch);
    return conferences.filter(conf => {
      if (queryTokens.length > 0 && !scoreConference(conf, queryTokens, currentQuery).matched) {
        return false;
      }
      return matchesFilters(conf, stateWithout);
    }).length;
  }

  /**
   * Tìm từ khóa tên hội nghị gần nhất với từ khóa người dùng gõ sai chính tả.
   * @param {Array<Object>} conferences - Danh sách hội nghị.
   * @param {string} currentQuery - Chuỗi truy vấn thô.
   * @returns {string|null} Gợi ý tên hội nghị hoặc null nếu không có ứng viên phù hợp.
   */
  function findSpellingSuggestion(conferences, currentQuery) {
    const cleanQ = normalizeText(currentQuery).trim();
    if (cleanQ.length < 4) return null;

    let bestDist = Infinity;
    let bestCandidate = null;
    const maxDist = cleanQ.length >= 6 ? 2 : 1;

    const considerCandidate = (rawText, normText) => {
      if (!normText || Math.abs(normText.length - cleanQ.length) > maxDist) return;
      const dist = damerauLevenshtein(cleanQ, normText);
      if (dist > 0 && dist <= maxDist && dist < bestDist) {
        bestDist = dist;
        bestCandidate = rawText;
      }
    };

    for (let i = 0; i < conferences.length; i++) {
      const rawName = String(conferences[i].name || '').trim();
      const nameTokens = rawName.split(/\s+/);
      nameTokens.forEach(tk => {
        const normTk = normalizeText(tk);
        if (normTk.length >= 3) considerCandidate(tk, normTk);
      });
      considerCandidate(rawName, normalizeText(rawName));
    }
    return bestCandidate;
  }

  /**
   * Tính các gợi ý nới lỏng bộ lọc khi kết quả trả về bằng 0:
   * thử bỏ riêng từng nhóm đang bật, chọn tối đa 3 nhóm cho nhiều kết quả nhất,
   * đồng thời tìm gợi ý chính tả gần nhất bằng Damerau-Levenshtein.
   * @param {Array<Object>} conferences - Toàn bộ hội nghị.
   * @param {Object} filterState - Trạng thái lọc hiện tại.
   * @param {string} [currentQuery=''] - Từ khóa tìm kiếm hiện tại.
   * @returns {{ relaxations: Array<{groupKey: string, label: string, count: number}>, spellingSuggestion: string|null }}
   */
  function getRelaxSuggestions(conferences, filterState, currentQuery = '') {
    const relaxations = [];
    if (!Array.isArray(conferences) || conferences.length === 0) {
      return { relaxations, spellingSuggestion: null };
    }

    const queryTokens = tokenizeQuery(currentQuery);
    if (queryTokens.length > 0) {
      const countWithoutQuery = conferences.filter(conf => matchesFilters(conf, filterState)).length;
      if (countWithoutQuery > 0) {
        relaxations.push({
          groupKey: 'query',
          label: `từ khóa "${currentQuery.trim()}"`,
          count: countWithoutQuery
        });
      }
    }

    const hasArrayChoice = (val, ignoreAll) => (
      (Array.isArray(val) && val.length > 0 && (!ignoreAll || !val.includes('all')))
      || (ignoreAll && typeof val === 'string' && Boolean(val) && val !== 'all')
    );

    const candidates = [
      {
        active: Array.isArray(filterState.ranks) && filterState.ranks.length > 0,
        groupKey: 'rank',
        label: 'bộ lọc Phân hạng',
        patch: { ranks: [] }
      },
      {
        active: Boolean(filterState.month || filterState.ongoing),
        groupKey: 'month',
        label: 'bộ lọc Tháng diễn ra',
        patch: { month: '', ongoing: false }
      },
      {
        active: hasArrayChoice(filterState.cfp, true) || Boolean(filterState.dateFrom || filterState.dateTo),
        groupKey: 'cfp',
        label: 'bộ lọc Hạn nộp bài',
        patch: { cfp: 'all', dateFrom: '', dateTo: '' }
      },
      {
        active: Array.isArray(filterState.modes) && filterState.modes.length > 0,
        groupKey: 'mode',
        label: 'bộ lọc Hình thức tổ chức',
        patch: { modes: [] }
      },
      {
        active: hasArrayChoice(filterState.city, true),
        groupKey: 'where',
        label: 'bộ lọc Địa điểm',
        patch: { city: 'all' }
      },
      {
        active: Array.isArray(filterState.topics) && filterState.topics.length > 0,
        groupKey: 'what',
        label: 'bộ lọc Lĩnh vực nghiên cứu',
        patch: { topics: [] }
      }
    ];

    candidates.forEach(item => {
      if (!item.active) return;
      const count = countRelaxedMatches(conferences, filterState, item.patch, queryTokens, currentQuery);
      if (count > 0) relaxations.push({ groupKey: item.groupKey, label: item.label, count });
    });

    relaxations.sort((a, b) => b.count - a.count);
    return {
      relaxations: relaxations.slice(0, 3),
      spellingSuggestion: findSpellingSuggestion(conferences, currentQuery)
    };
  }

  /**
   * Tạo chuỗi HTML an toàn đã tô sáng từ khóa tìm kiếm khớp chính xác bằng <mark class="search-highlight">.
   * Tuyệt đối không chèn HTML thô của người dùng.
   * @param {*} rawText Văn bản gốc cần hiển thị.
   * @param {string} rawQuery Từ khóa tìm kiếm.
   * @returns {string} Chuỗi HTML đã thoát ký tự và bọc thẻ <mark>.
   */
  function highlightMatches(rawText, rawQuery) {
    if (rawText === null || rawText === undefined) return '';
    const source = String(rawText);
    if (!source) return '';

    const queryTokens = tokenizeQuery(rawQuery);
    if (queryTokens.length === 0) {
      return escapeHtml(source);
    }

    const normSource = normalizeText(source);
    const flags = new Array(source.length).fill(false);

    queryTokens.forEach(token => {
      if (!token) return;
      let pos = 0;
      while (pos < normSource.length) {
        const idx = normSource.indexOf(token, pos);
        if (idx === -1) break;
        const end = Math.min(source.length, idx + token.length);
        for (let k = idx; k < end; k++) {
          flags[k] = true;
        }
        pos = idx + token.length;
      }
    });

    if (!flags.some(Boolean)) {
      return escapeHtml(source);
    }

    let out = '';
    let i = 0;
    while (i < source.length) {
      const isMarked = flags[i];
      let j = i + 1;
      while (j < source.length && flags[j] === isMarked) {
        j++;
      }
      const chunk = escapeHtml(source.slice(i, j));
      out += isMarked ? `<mark class="search-highlight">${chunk}</mark>` : chunk;
      i = j;
    }

    return out;
  }

  /**
   * Thoát ký tự đặc biệt HTML chống XSS (tái sử dụng ConfGuideUtils.escapeHtml nếu sẵn có).
   * @param {*} val
   * @returns {string}
   */
  function escapeHtml(val) {
    if (typeof window !== 'undefined' && window.ConfGuideUtils && typeof window.ConfGuideUtils.escapeHtml === 'function') {
      return window.ConfGuideUtils.escapeHtml(val);
    }
    if (val === null || val === undefined) return '';
    return String(val)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Nhường luồng cho Main Thread bằng scheduler.yield() hoặc fallback sang MessageChannel / setTimeout.
   * @returns {Promise<void>}
   */
  async function yieldToMain() {
    if (typeof globalThis !== 'undefined' && globalThis.scheduler && typeof globalThis.scheduler.yield === 'function') {
      return await globalThis.scheduler.yield();
    }
    if (typeof MessageChannel !== 'undefined') {
      return new Promise(resolve => {
        const channel = new MessageChannel();
        channel.port1.onmessage = () => resolve();
        channel.port2.postMessage(null);
      });
    }
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  // Xuất module logic thuần ra đối tượng toàn cục
  window.ConfGuideSearchCore = {
    SEARCH_WEIGHTS,
    CLOSING_SOON_DAYS,
    normalizeText,
    damerauLevenshtein,
    tokenizeQuery,
    toTopicSlug,
    normalizeRankKey,
    normalizeModeKey,
    normalizeTopicFields,
    expandTopicFilterValues,
    buildIndex,
    scoreConference,
    matchesFilters,
    computeFacetCounts,
    getRelaxSuggestions,
    highlightMatches,
    escapeHtml,
    yieldToMain
  };
})();
