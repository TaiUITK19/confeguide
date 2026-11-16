/**
 * ConfGuide — Lõi Tìm kiếm, Lọc Đa chiều & Khớp Mờ (js/search-core.js)
 * Cung cấp logic thuần túy (không truy cập DOM, không đọc URL/Storage):
 * chuẩn hóa văn bản, khoảng cách Damerau-Levenshtein, lập chỉ mục tìm kiếm,
 * tính điểm xếp hạng, phân đoạn từ khóa, đếm facet kết quả trước,
 * gợi ý nới lỏng khi 0 kết quả và hàm nhường luồng yieldToMain.
 */

(function () {
  'use strict';

  /** Trọng số xếp hạng các trường khi tìm kiếm theo từ khóa */
  const SEARCH_WEIGHTS = {
    acronym: 2,
    topics: 2,
    fullName: 1,
    publisher: 1,
    summary: 0.5
  };

  /** Ngưỡng ngày tính trạng thái "Sắp hết hạn" */
  const CLOSING_SOON_DAYS = 14;

  /**
   * Chuẩn hóa chuỗi văn bản không dấu phục vụ so sánh và tìm kiếm:
   * chuyển chữ thường, tách tổ hợp NFD, xóa dấu tiếng Việt, đổi đ/Đ -> d/d,
   * giữ ánh xạ 1:1 theo từng ký tự gốc để hỗ trợ làm nổi từ khóa (<mark>).
   * @param {*} str Chuỗi đầu vào.
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
   * Tính khoảng cách Damerau-Levenshtein giữa 2 chuỗi (cho phép chèn, xóa, thay thế và hoán vị kề nhau).
   * @param {string} a Chuỗi thứ nhất.
   * @param {string} b Chuỗi thứ hai.
   * @returns {number} Khoảng cách chỉnh sửa.
   */
  function damerauLevenshtein(a, b) {
    if (a === b) return 0;
    const s1 = String(a || '');
    const s2 = String(b || '');
    const len1 = s1.length;
    const len2 = s2.length;
    if (len1 === 0) return len2;
    if (len2 === 0) return len1;

    // Bảng khoảng cách 2 chiều (len1 + 2) x (len2 + 2)
    const inf = len1 + len2;
    const da = {};
    const d = [];
    for (let i = 0; i <= len1 + 1; i++) {
      d[i] = new Array(len2 + 2).fill(0);
    }
    d[0][0] = inf;
    for (let i = 0; i <= len1; i++) {
      d[i + 1][0] = inf;
      d[i + 1][1] = i;
    }
    for (let j = 0; j <= len2; j++) {
      d[0][j + 1] = inf;
      d[1][j + 1] = j;
    }

    for (let i = 1; i <= len1; i++) {
      let db = 0;
      for (let j = 1; j <= len2; j++) {
        const i1 = da[s2[j - 1]] || 0;
        const j1 = db;
        let cost = 1;
        if (s1[i - 1] === s2[j - 1]) {
          cost = 0;
          db = j;
        }

        d[i + 1][j + 1] = Math.min(
          d[i][j + 1] + 1, // xóa
          d[i + 1][j] + 1, // chèn
          d[i][j] + cost,  // thay thế
          d[i1][j1] + (i - i1 - 1) + 1 + (j - j1 - 1) // hoán vị
        );
      }
      da[s1[i - 1]] = i;
    }

    return d[len1 + 1][len2 + 1];
  }

  /**
   * Tách các từ khóa từ chuỗi truy vấn bằng Intl.Segmenter (có fallback sang split khoảng trắng).
   * @param {string} rawQuery Chuỗi truy vấn.
   * @returns {Array<string>} Danh sách token đã chuẩn hóa.
   */
  function tokenizeQuery(rawQuery) {
    if (!rawQuery) return [];
    const text = String(rawQuery).trim();
    if (!text) return [];

    let rawTokens = [];
    if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
      try {
        const segmenter = new Intl.Segmenter('vi', { granularity: 'word' });
        for (const seg of segmenter.segment(text)) {
          if (seg.isWordLike) {
            rawTokens.push(seg.segment);
          }
        }
      } catch (e) {
        rawTokens = text.split(/\s+/).filter(Boolean);
      }
    } else {
      rawTokens = text.split(/\s+/).filter(Boolean);
    }

    const tokens = [];
    rawTokens.forEach(tk => {
      const norm = normalizeText(tk).trim();
      if (norm && !tokens.includes(norm)) {
        tokens.push(norm);
      }
    });

    return tokens;
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
      const topicsList = Array.isArray(conf.topics) ? conf.topics : [];
      const normTopics = topicsList.map(t => normalizeText(t)).join(' ');
      const normPublisher = normalizeText(conf.publisher || '');
      const normSummary = normalizeText(conf.summarization || conf.summary || '');

      // Tách tập từ khóa của từng trường để so khớp nhanh
      const nameTokens = tokenizeQuery(normName);
      const fullNameTokens = tokenizeQuery(normFullName);
      const topicTokens = tokenizeQuery(normTopics);

      const searchBlob = `${normName} ${normFullName} ${normLocation} ${normTopics} ${normPublisher} ${normSummary}`;

      const indexed = Object.assign({}, conf, {
        _searchIndex: {
          normName,
          normFullName,
          normLocation,
          normTopics,
          normPublisher,
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
   * Kiểm tra mức độ khớp của 1 token với 1 trường và trả về điểm số:
   * Bằng hệt > Tiền tố > Chứa chuỗi > Khớp mờ (Damerau-Levenshtein).
   * @param {string} token Từ khóa tìm kiếm (đã chuẩn hóa).
   * @param {string} targetField Chuỗi trường đích (đã chuẩn hóa).
   * @param {Array<string>} fieldTokens Danh sách token của trường đích.
   * @param {boolean} allowFuzzy Có cho phép khớp mờ không.
   * @returns {{ matched: boolean, score: number, isExactOrSub: boolean }}
   */
  function matchTokenInField(token, targetField, fieldTokens = [], allowFuzzy = false) {
    if (!token || !targetField) {
      return { matched: false, score: 0, isExactOrSub: false };
    }

    // 1. Khớp bằng hệt toàn bộ chuỗi trường
    if (targetField === token) {
      return { matched: true, score: 4, isExactOrSub: true };
    }

    // 2. Khớp bằng hệt một từ bên trong trường
    if (fieldTokens.includes(token)) {
      return { matched: true, score: 3.5, isExactOrSub: true };
    }

    // 3. Khớp tiền tố (bắt đầu bằng)
    if (targetField.startsWith(token)) {
      return { matched: true, score: 3, isExactOrSub: true };
    }
    if (fieldTokens.some(tk => tk.startsWith(token))) {
      return { matched: true, score: 2.5, isExactOrSub: true };
    }

    // 4. Khớp chứa chuỗi con
    if (targetField.includes(token)) {
      return { matched: true, score: 2, isExactOrSub: true };
    }

    // 5. Khớp mờ (Damerau-Levenshtein): chỉ áp dụng với token >= 4 ký tự
    if (allowFuzzy && token.length >= 4) {
      const maxDistance = token.length >= 6 ? 2 : 1;
      // Thử với toàn bộ trường (ví dụ acronym: SIOCT vs SOICT)
      if (Math.abs(targetField.length - token.length) <= maxDistance) {
        const dist = damerauLevenshtein(token, targetField);
        if (dist <= maxDistance) {
          return { matched: true, score: 1 - dist * 0.25, isExactOrSub: false };
        }
      }

      // Thử với từng từ trong trường
      for (let i = 0; i < fieldTokens.length; i++) {
        const fToken = fieldTokens[i];
        if (Math.abs(fToken.length - token.length) <= maxDistance) {
          const dist = damerauLevenshtein(token, fToken);
          if (dist <= maxDistance) {
            return { matched: true, score: 0.8 - dist * 0.2, isExactOrSub: false };
          }
        }
      }
    }

    return { matched: false, score: 0, isExactOrSub: false };
  }

  /**
   * Tính điểm xếp hạng tìm kiếm của một hội nghị theo câu truy vấn:
   * Mọi token phải khớp (phép AND); tính tổng điểm theo trọng số các trường.
   * @param {Object} conf Hội nghị đã có _searchIndex.
   * @param {Array<string>} queryTokens Danh sách token truy vấn.
   * @param {string} rawQuery Chuỗi truy vấn gốc.
   * @returns {{ matched: boolean, score: number }}
   */
  function scoreConference(conf, queryTokens, rawQuery) {
    if (!queryTokens || queryTokens.length === 0) {
      return { matched: true, score: 0 };
    }

    const idx = conf._searchIndex || {};
    const normName = idx.normName !== undefined ? idx.normName : normalizeText(conf.name || '');
    const normFullName = idx.normFullName !== undefined ? idx.normFullName : normalizeText(conf.full_name || conf.fullName || '');
    const normTopics = idx.normTopics !== undefined ? idx.normTopics : (Array.isArray(conf.topics) ? conf.topics.map(t => normalizeText(t)).join(' ') : '');
    const normPublisher = idx.normPublisher !== undefined ? idx.normPublisher : normalizeText(conf.publisher || '');
    const normSummary = idx.normSummary !== undefined ? idx.normSummary : normalizeText(conf.summarization || conf.summary || '');

    const nameTokens = idx.nameTokens || tokenizeQuery(normName);
    const fullNameTokens = idx.fullNameTokens || tokenizeQuery(normFullName);
    const topicTokens = idx.topicTokens || tokenizeQuery(normTopics);

    let totalScore = 0;

    for (let i = 0; i < queryTokens.length; i++) {
      const token = queryTokens[i];

      // Thử từng trường theo thứ tự ưu tiên
      const mAcronym = matchTokenInField(token, normName, nameTokens, true);
      const mTopics = matchTokenInField(token, normTopics, topicTokens, true);
      const mFullName = matchTokenInField(token, normFullName, fullNameTokens, true);
      const mPublisher = matchTokenInField(token, normPublisher, [], false);
      const mSummary = matchTokenInField(token, normSummary, [], false); // Không khớp mờ trên mô tả

      let bestTokenScore = 0;
      let tokenMatched = false;

      if (mAcronym.matched) {
        tokenMatched = true;
        bestTokenScore = Math.max(bestTokenScore, mAcronym.score * SEARCH_WEIGHTS.acronym);
      }
      if (mTopics.matched) {
        tokenMatched = true;
        bestTokenScore = Math.max(bestTokenScore, mTopics.score * SEARCH_WEIGHTS.topics);
      }
      if (mFullName.matched) {
        tokenMatched = true;
        bestTokenScore = Math.max(bestTokenScore, mFullName.score * SEARCH_WEIGHTS.fullName);
      }
      if (mPublisher.matched) {
        tokenMatched = true;
        bestTokenScore = Math.max(bestTokenScore, mPublisher.score * SEARCH_WEIGHTS.publisher);
      }
      if (mSummary.matched) {
        tokenMatched = true;
        bestTokenScore = Math.max(bestTokenScore, mSummary.score * SEARCH_WEIGHTS.summary);
      }

      if (!tokenMatched) {
        return { matched: false, score: 0 };
      }

      totalScore += bestTokenScore;
    }

    // Thưởng điểm nếu acronym trùng hệt hoặc bắt đầu bằng cụm từ khóa chuẩn hóa
    const normQuery = normalizeText(rawQuery).trim();
    if (normQuery && normName === normQuery) {
      totalScore += 5;
    } else if (normQuery && normName.startsWith(normQuery)) {
      totalScore += 2;
    }

    return { matched: true, score: totalScore };
  }

  /**
   * Kiểm tra một hội nghị có thỏa mãn các bộ lọc đang chọn hay không.
   * Quy tắc: Trong cùng 1 nhóm là OR, giữa các nhóm khác nhau là AND.
   * @param {Object} conf Hội nghị.
   * @param {Object} filterState Trạng thái lọc.
   * @param {Object} [enabledGroups] Cấu hình bật/tắt nhóm.
   * @returns {boolean} True nếu thỏa mãn tất cả nhóm đang bật.
   */
  function matchesFilters(conf, filterState, enabledGroups = { rank: true, cfp: true, when: true, where: true, what: true }) {
    if (!conf || !filterState) return false;

    // 0. Nhóm Phân hạng (Rank — phép OR trong nhóm)
    if (enabledGroups.rank !== false) {
      const ranks = Array.isArray(filterState.ranks) ? filterState.ranks : [];
      if (ranks.length > 0) {
        const confRank = String(conf.rank || '').trim().toUpperCase();
        if (!ranks.includes(confRank)) return false;
      }
    }

    // 1. Nhóm Hạn nộp bài (CFP)
    if (enabledGroups.cfp) {
      const cfpVal = filterState.cfp;
      if (Array.isArray(cfpVal) && cfpVal.length > 0 && !cfpVal.includes('all')) {
        const confCfp = conf.cfpStatus || 'unknown';
        const hasMatch = cfpVal.some(val => {
          if (val === 'open') {
            return confCfp === 'open' || confCfp === 'closingSoon';
          }
          return confCfp === val;
        });
        if (!hasMatch) return false;
      } else if (typeof cfpVal === 'string' && cfpVal && cfpVal !== 'all') {
        const confCfp = conf.cfpStatus || 'unknown';
        if (cfpVal === 'open') {
          if (confCfp !== 'open' && confCfp !== 'closingSoon') return false;
        } else if (confCfp !== cfpVal) {
          return false;
        }
      }
    }

    // 2. Nhóm Thời gian & Hạn nộp
    if (enabledGroups.when) {
      if (filterState.month && conf.eventMonth !== filterState.month) {
        return false;
      }
      if (filterState.ongoing && conf.eventPhase !== 'ongoing') {
        return false;
      }
      if (filterState.dateFrom || filterState.dateTo) {
        const subDeadlines = Array.isArray(conf.submissionDeadlines) ? conf.submissionDeadlines : [];
        const hasMatchingDate = subDeadlines.some(dl => {
          if (filterState.dateFrom && dl.date < filterState.dateFrom) return false;
          if (filterState.dateTo && dl.date > filterState.dateTo) return false;
          return true;
        });
        if (!hasMatchingDate) return false;
      }
    }

    // 3. Nhóm Địa điểm
    if (enabledGroups.where) {
      const cityVal = filterState.city;
      if (Array.isArray(cityVal) && cityVal.length > 0 && !cityVal.includes('all')) {
        const confCity = conf.cityKey || 'other';
        if (!cityVal.includes(confCity)) return false;
      } else if (typeof cityVal === 'string' && cityVal && cityVal !== 'all') {
        const confCity = conf.cityKey || 'other';
        if (confCity !== cityVal) return false;
      }
    }

    // 4. Nhóm Chủ đề nghiên cứu (phép OR trong nhóm)
    if (enabledGroups.what) {
      const topics = Array.isArray(filterState.topics) ? filterState.topics : [];
      if (topics.length > 0) {
        const confTopics = Array.isArray(conf.topics) ? conf.topics : [];
        const hasAnyTopic = topics.some(tKey => confTopics.includes(tKey));
        if (!hasAnyTopic) return false;
      }
    }

    return true;
  }

  /**
   * Tính số kết quả trước (Faceted Search Pre-counts) cho từng lựa chọn:
   * Số lượng của lựa chọn O thuộc nhóm G = số hội nghị khớp khi áp dụng MỌI nhóm khác (ngoại trừ nhóm G) cộng với O.
   * @param {Array<Object>} conferences Danh sách hội nghị.
   * @param {Object} filterState Trạng thái lọc hiện tại.
   * @param {Array<string>} allFacetKeys Danh sách các khóa facet cần đếm.
   * @param {Array<string>} [queryTokens] Token tìm kiếm đang áp dụng (nếu có).
   * @param {string} [rawQuery] Từ khóa thô.
   * @returns {Object<string, number>} Bản đồ { [facetKey]: count }.
   */
  function computeFacetCounts(conferences, filterState, allFacetKeys, queryTokens = [], rawQuery = '') {
    const counts = {};
    allFacetKeys.forEach(k => { counts[k] = 0; });

    if (!Array.isArray(conferences) || conferences.length === 0) {
      return counts;
    }

    // Lọc trước theo từ khóa tìm kiếm (nếu có)
    const baseList = queryTokens.length > 0
      ? conferences.filter(conf => scoreConference(conf, queryTokens, rawQuery).matched)
      : conferences;

    // Phân loại danh sách hội nghị thỏa mãn từng tập nhóm để tránh lặp O(N * M)
    allFacetKeys.forEach(facetKey => {
      const parts = facetKey.split(':');
      const groupPrefix = parts[0];
      const optionValue = parts.slice(1).join(':');

      // Tạo filterState giả định chỉ giữ các nhóm KHÁC nhóm hiện tại
      const subState = Object.assign({}, filterState);

      let matchesOption = null;

      if (groupPrefix === 'rank') {
        subState.ranks = [];
        matchesOption = conf => String(conf.rank || '').trim().toUpperCase() === optionValue;
      } else if (groupPrefix === 'cfp') {
        subState.cfp = 'all';
        matchesOption = conf => {
          if (optionValue === 'all') return true;
          if (optionValue === 'open') return conf.cfpStatus === 'open' || conf.cfpStatus === 'closingSoon';
          return conf.cfpStatus === optionValue;
        };
      } else if (groupPrefix === 'ongoing') {
        subState.ongoing = false;
        matchesOption = conf => conf.eventPhase === 'ongoing';
      } else if (groupPrefix === 'city') {
        subState.city = 'all';
        matchesOption = conf => {
          if (optionValue === 'all') return true;
          return (conf.cityKey || 'other') === optionValue;
        };
      } else if (groupPrefix === 'topic') {
        subState.topics = [];
        matchesOption = conf => Array.isArray(conf.topics) && conf.topics.includes(optionValue);
      }

      if (!matchesOption) {
        counts[facetKey] = 0;
        return;
      }

      let matchCount = 0;
      for (let i = 0; i < baseList.length; i++) {
        const conf = baseList[i];
        if (matchesFilters(conf, subState) && matchesOption(conf)) {
          matchCount++;
        }
      }
      counts[facetKey] = matchCount;
    });

    return counts;
  }

  /**
   * Tính các gợi ý nới lỏng bộ lọc khi kết quả trả về bằng 0:
   * Thử bỏ riêng từng nhóm đang bật, tính số kết quả N, chọn tối đa 3 nhóm có N > 0 lớn nhất.
   * Đồng thời tìm gợi ý chính tả hội nghị gần nhất bằng Damerau-Levenshtein.
   * @param {Array<Object>} conferences Toàn bộ hội nghị.
   * @param {Object} filterState Trạng thái lọc hiện tại.
   * @param {string} currentQuery Từ khóa tìm kiếm hiện tại.
   * @returns {{ relaxations: Array<{groupKey: string, label: string, count: number}>, spellingSuggestion: string|null }}
   */
  function getRelaxSuggestions(conferences, filterState, currentQuery = '') {
    const relaxations = [];
    if (!Array.isArray(conferences) || conferences.length === 0) {
      return { relaxations, spellingSuggestion: null };
    }

    const queryTokens = tokenizeQuery(currentQuery);

    // 1. Thử bỏ từ khóa tìm kiếm (nếu có)
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

    // 1b. Thử bỏ nhóm Phân hạng (Rank)
    if (Array.isArray(filterState.ranks) && filterState.ranks.length > 0) {
      const stateWithout = Object.assign({}, filterState, { ranks: [] });
      const c = conferences.filter(conf => {
        if (queryTokens.length > 0 && !scoreConference(conf, queryTokens, currentQuery).matched) return false;
        return matchesFilters(conf, stateWithout);
      }).length;
      if (c > 0) {
        relaxations.push({ groupKey: 'rank', label: 'bộ lọc Phân hạng', count: c });
      }
    }

    // 2. Thử bỏ nhóm Hạn nộp bài (CFP)
    const hasCfp = (Array.isArray(filterState.cfp) && filterState.cfp.length > 0 && !filterState.cfp.includes('all')) ||
                   (typeof filterState.cfp === 'string' && filterState.cfp && filterState.cfp !== 'all');
    if (hasCfp) {
      const stateWithout = Object.assign({}, filterState, { cfp: 'all' });
      const c = conferences.filter(conf => {
        if (queryTokens.length > 0 && !scoreConference(conf, queryTokens, currentQuery).matched) return false;
        return matchesFilters(conf, stateWithout);
      }).length;
      if (c > 0) {
        relaxations.push({ groupKey: 'cfp', label: 'bộ lọc Hạn nộp bài', count: c });
      }
    }

    // 3. Thử bỏ nhóm Thời gian & Hạn nộp
    const hasWhen = Boolean(filterState.month || filterState.ongoing || filterState.dateFrom || filterState.dateTo);
    if (hasWhen) {
      const stateWithout = Object.assign({}, filterState, {
        month: '',
        ongoing: false,
        dateFrom: '',
        dateTo: ''
      });
      const c = conferences.filter(conf => {
        if (queryTokens.length > 0 && !scoreConference(conf, queryTokens, currentQuery).matched) return false;
        return matchesFilters(conf, stateWithout);
      }).length;
      if (c > 0) {
        relaxations.push({ groupKey: 'when', label: 'bộ lọc Thời gian & Hạn nộp', count: c });
      }
    }

    // 4. Thử bỏ nhóm Địa điểm
    const hasCity = (Array.isArray(filterState.city) && filterState.city.length > 0 && !filterState.city.includes('all')) ||
                    (typeof filterState.city === 'string' && filterState.city && filterState.city !== 'all');
    if (hasCity) {
      const stateWithout = Object.assign({}, filterState, { city: 'all' });
      const c = conferences.filter(conf => {
        if (queryTokens.length > 0 && !scoreConference(conf, queryTokens, currentQuery).matched) return false;
        return matchesFilters(conf, stateWithout);
      }).length;
      if (c > 0) {
        relaxations.push({ groupKey: 'where', label: 'bộ lọc Địa điểm', count: c });
      }
    }

    // 5. Thử bỏ nhóm Chủ đề nghiên cứu
    if (Array.isArray(filterState.topics) && filterState.topics.length > 0) {
      const stateWithout = Object.assign({}, filterState, { topics: [] });
      const c = conferences.filter(conf => {
        if (queryTokens.length > 0 && !scoreConference(conf, queryTokens, currentQuery).matched) return false;
        return matchesFilters(conf, stateWithout);
      }).length;
      if (c > 0) {
        relaxations.push({ groupKey: 'what', label: 'bộ lọc Chủ đề', count: c });
      }
    }

    // Sắp xếp ưu tiên nhóm nới lỏng cho ra số kết quả lớn nhất
    relaxations.sort((a, b) => b.count - a.count);
    const topRelaxations = relaxations.slice(0, 3);

    // 6. Tìm gợi ý chính tả từ khóa nếu có từ khóa dài >= 4
    let spellingSuggestion = null;
    const cleanQ = normalizeText(currentQuery).trim();
    if (cleanQ.length >= 4) {
      let bestDist = Infinity;
      let bestCandidate = null;
      const maxAllowedDist = cleanQ.length >= 6 ? 2 : 1;

      for (let i = 0; i < conferences.length; i++) {
        const conf = conferences[i];
        const rawName = String(conf.name || '').trim();
        const normName = normalizeText(rawName);
        const nameTokens = rawName.split(/\s+/);

        // Kiểm tra từng từ trong tên viết tắt (ví dụ "SOICT" trong "SOICT 2026")
        for (let j = 0; j < nameTokens.length; j++) {
          const rawToken = nameTokens[j];
          const normToken = normalizeText(rawToken);
          if (normToken.length >= 3 && Math.abs(normToken.length - cleanQ.length) <= maxAllowedDist) {
            const dist = damerauLevenshtein(cleanQ, normToken);
            if (dist > 0 && dist <= maxAllowedDist && dist < bestDist) {
              bestDist = dist;
              bestCandidate = rawToken;
            }
          }
        }

        // Kiểm tra toàn bộ chuỗi tên nếu người dùng gõ cả năm
        if (normName && Math.abs(normName.length - cleanQ.length) <= maxAllowedDist) {
          const dist = damerauLevenshtein(cleanQ, normName);
          if (dist > 0 && dist <= maxAllowedDist && dist < bestDist) {
            bestDist = dist;
            bestCandidate = rawName;
          }
        }
      }

      if (bestCandidate) {
        spellingSuggestion = bestCandidate;
      }
    }

    return {
      relaxations: topRelaxations,
      spellingSuggestion
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
   * Thoát ký tự đặc biệt HTML chống XSS.
   * @param {*} val
   * @returns {string}
   */
  function escapeHtml(val) {
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
