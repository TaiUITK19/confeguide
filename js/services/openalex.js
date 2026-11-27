/**
 * ConfGuide — Dịch vụ Tra cứu Tác giả OpenAlex (js/services/openalex.js)
 * Trang sử dụng: login.html, register.html, profile.html, index.html (qua modal Quản lý lĩnh vực)
 * Phụ thuộc: Không (gọi trực tiếp OpenAlex REST API hỗ trợ CORS qua Fetch API)
 * Chức năng: Tìm kiếm hồ sơ tác giả trên OpenAlex theo Tên hoặc ORCID, chuẩn hóa dữ liệu
 * cơ quan công tác, số công trình, trích dẫn và danh sách topics + topic_share.
 */

(function () {
  'use strict';

  /* ================= 1. HẰNG SỐ & CẤU HÌNH API ================= */

  const OPENALEX_API_BASE = 'https://api.openalex.org';
  const REQUEST_TIMEOUT_MS = 10000;
  const DEFAULT_PER_PAGE = 8;
  const OPENALEX_MAILTO = '';

  const ORCID_REGEX = /\b(\d{4}-\d{4}-\d{4}-\d{3}[\dX])\b/i;

  /* ================= 2. HÀM CHUẨN HÓA ĐẦU VÀO ================= */

  /**
   * Loại bỏ dấu tiếng Việt (bao gồm đ/Đ) để tìm kiếm tên tác giả quốc tế trên OpenAlex hiệu quả hơn.
   * @param {*} text - Chuỗi tên gốc.
   * @returns {string} Chuỗi ASCII không dấu đã rút gọn khoảng trắng.
   */
  function stripVietnameseDiacritics(text) {
    return String(text || '')
      .replace(/[đĐ]/g, ch => (ch === 'Đ' ? 'D' : 'd'))
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Trích xuất và chuẩn hóa mã ORCID dạng `0000-0000-0000-0000` từ chuỗi hoặc URL `https://orcid.org/...`.
   * @param {*} rawOrcid - Chuỗi ORCID thô hoặc liên kết ORCID.
   * @returns {string} Mã ORCID hợp lệ viết hoa chữ X cuối hoặc chuỗi rỗng nếu không hợp lệ.
   */
  function normalizeOrcid(rawOrcid) {
    if (!rawOrcid) return '';
    const match = String(rawOrcid).trim().match(ORCID_REGEX);
    return match ? match[1].toUpperCase() : '';
  }

  /**
   * Rút gọn URI OpenAlex (`https://openalex.org/A5023...` hoặc `T11235`) về mã ngắn (`A5023...`).
   * @param {*} rawId - URI hoặc mã OpenAlex thô.
   * @returns {string} Mã ngắn gọn.
   */
  function extractShortOpenAlexId(rawId) {
    const str = String(rawId || '').trim();
    if (!str) return '';
    const segments = str.split('/');
    return segments[segments.length - 1] || str;
  }

  /* ================= 3. HÀM CHUẨN HÓA DỮ LIỆU TÁC GIẢ ================= */

  /**
   * Chuẩn hóa danh sách cơ quan công tác của tác giả từ `last_known_institutions` hoặc `affiliations`.
   * @param {Object} rawAuthor - Bản ghi tác giả thô từ OpenAlex.
   * @returns {Array<{ name: string, countryCode: string, type: string }>} Danh sách cơ quan tối đa 3 đơn vị.
   */
  function extractInstitutions(rawAuthor) {
    const out = [];
    const seen = new Set();

    const pushInst = inst => {
      if (!inst || typeof inst !== 'object') return;
      const name = String(inst.display_name || '').trim();
      if (!name || seen.has(name.toLowerCase())) return;
      seen.add(name.toLowerCase());
      out.push({
        name,
        countryCode: String(inst.country_code || '').trim(),
        type: String(inst.type || '').trim()
      });
    };

    if (Array.isArray(rawAuthor.last_known_institutions)) {
      rawAuthor.last_known_institutions.forEach(pushInst);
    }
    if (out.length === 0 && rawAuthor.last_known_institution) {
      pushInst(rawAuthor.last_known_institution);
    }
    if (out.length === 0 && Array.isArray(rawAuthor.affiliations)) {
      rawAuthor.affiliations.forEach(entry => {
        if (entry && entry.institution) pushInst(entry.institution);
      });
    }

    return out.slice(0, 3);
  }

  /**
   * Chuẩn hóa đối tượng tác giả thô từ OpenAlex thành cấu trúc gọn, an toàn và đầy đủ `topics` + `topic_share`.
   * @param {Object|null} rawAuthor - Đối tượng tác giả trả về từ API OpenAlex.
   * @returns {Object|null} Bản ghi tác giả đã chuẩn hóa hoặc null nếu không hợp lệ.
   */
  function extractAuthorSummary(rawAuthor) {
    if (!rawAuthor || typeof rawAuthor !== 'object' || !rawAuthor.id) return null;

    const shareMap = new Map();
    if (Array.isArray(rawAuthor.topic_share)) {
      rawAuthor.topic_share.forEach(item => {
        if (!item || !item.id) return;
        const tId = extractShortOpenAlexId(item.id);
        const val = Number(item.value);
        if (tId && Number.isFinite(val)) {
          shareMap.set(tId, val);
        }
      });
    }

    const rawTopics = Array.isArray(rawAuthor.topics) ? rawAuthor.topics : [];
    const topics = rawTopics
      .filter(t => t && typeof t === 'object' && t.display_name)
      .map(t => {
        const shortTopicId = extractShortOpenAlexId(t.id);
        const shareVal = shareMap.has(shortTopicId) ? shareMap.get(shortTopicId) : null;
        return {
          id: shortTopicId,
          displayName: String(t.display_name || '').trim(),
          count: Number.isFinite(Number(t.count)) ? Number(t.count) : 0,
          score: Number.isFinite(Number(t.score)) ? Number(t.score) : null,
          share: shareVal,
          subfield: t.subfield && t.subfield.display_name ? String(t.subfield.display_name).trim() : '',
          field: t.field && t.field.display_name ? String(t.field.display_name).trim() : '',
          domain: t.domain && t.domain.display_name ? String(t.domain.display_name).trim() : ''
        };
      });

    const summaryStats = (rawAuthor.summary_stats && typeof rawAuthor.summary_stats === 'object')
      ? rawAuthor.summary_stats
      : {};
    const institutions = extractInstitutions(rawAuthor);
    const orcidNorm = normalizeOrcid(rawAuthor.orcid);

    return {
      id: String(rawAuthor.id),
      shortId: extractShortOpenAlexId(rawAuthor.id),
      displayName: String(rawAuthor.display_name || 'Chưa rõ tên').trim(),
      alternatives: Array.isArray(rawAuthor.display_name_alternatives)
        ? rawAuthor.display_name_alternatives.slice(0, 4).map(item => String(item).trim()).filter(Boolean)
        : [],
      orcid: orcidNorm,
      orcidUrl: orcidNorm ? `https://orcid.org/${orcidNorm}` : '',
      worksCount: Number.isFinite(Number(rawAuthor.works_count)) ? Number(rawAuthor.works_count) : 0,
      citedByCount: Number.isFinite(Number(rawAuthor.cited_by_count)) ? Number(rawAuthor.cited_by_count) : 0,
      hIndex: Number.isFinite(Number(summaryStats.h_index)) ? Number(summaryStats.h_index) : null,
      institutions,
      primaryAffiliation: institutions[0] ? institutions[0].name : '',
      topics,
      openAlexUrl: `https://openalex.org/${extractShortOpenAlexId(rawAuthor.id)}`
    };
  }

  /* ================= 4. GỌI API OPENALEX CÓ KIỂM SOÁT TIMEOUT ================= */

  /**
   * Thực thi yêu cầu GET tới OpenAlex kèm timeout an toàn và giải mã JSON.
   * @param {string} pathWithQuery - Đường dẫn tương đối kèm query string.
   * @returns {Promise<{ status: number, data: Object|null }>} Kết quả HTTP và dữ liệu JSON.
   */
  async function fetchOpenAlexJson(pathWithQuery) {
    const separator = pathWithQuery.includes('?') ? '&' : '?';
    const mailtoParam = OPENALEX_MAILTO ? `${separator}mailto=${encodeURIComponent(OPENALEX_MAILTO)}` : '';
    const url = `${OPENALEX_API_BASE}${pathWithQuery}${mailtoParam}`;

    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timeoutId = controller ? window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;

    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller ? controller.signal : undefined
      });

      if (response.status === 404) {
        return { status: 404, data: null };
      }
      if (response.status === 429) {
        const err = new Error('OpenAlex đang giới hạn tần suất truy cập từ IP hiện tại. Vui lòng thử lại sau ít phút hoặc chuyển sang chọn thủ công.');
        err.code = 'rate-limit';
        throw err;
      }
      if (!response.ok) {
        const err = new Error(`Máy chủ OpenAlex trả về lỗi HTTP ${response.status}.`);
        err.code = 'http-error';
        throw err;
      }

      const data = await response.json();
      return { status: response.status, data };
    } catch (err) {
      if (err && err.name === 'AbortError') {
        const timeoutErr = new Error('Quá thời gian kết nối tới OpenAlex (10 giây). Vui lòng thử lại.');
        timeoutErr.code = 'timeout';
        throw timeoutErr;
      }
      throw err;
    } finally {
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    }
  }

  /**
   * Tra cứu trực tiếp một tác giả trên OpenAlex bằng mã ORCID.
   * @param {string} orcidNorm - Mã ORCID chuẩn `0000-0000-0000-0000`.
   * @returns {Promise<Object|null>} Bản ghi tác giả đã chuẩn hóa hoặc null nếu không có.
   */
  async function fetchAuthorByOrcid(orcidNorm) {
    if (!orcidNorm) return null;
    const singleton = await fetchOpenAlexJson(`/authors/orcid:${encodeURIComponent(orcidNorm)}`);
    if (singleton.data && singleton.data.id) {
      return extractAuthorSummary(singleton.data);
    }

    const filtered = await fetchOpenAlexJson(
      `/authors?filter=orcid:${encodeURIComponent(orcidNorm)}&per-page=3`
    );
    const results = filtered.data && Array.isArray(filtered.data.results) ? filtered.data.results : [];
    return results.length > 0 ? extractAuthorSummary(results[0]) : null;
  }

  /**
   * Tìm kiếm danh sách tác giả trên OpenAlex theo tên hiển thị (tự động thử phiên bản không dấu nếu cần).
   * @param {string} rawName - Tên tác giả cần tìm.
   * @param {number} [perPage=DEFAULT_PER_PAGE] - Số kết quả tối đa.
   * @returns {Promise<{ authors: Array<Object>, queryUsed: string }>} Danh sách hồ sơ tác giả tìm được.
   */
  async function fetchAuthorsByName(rawName, perPage = DEFAULT_PER_PAGE) {
    const cleanName = String(rawName || '').replace(/\s+/g, ' ').trim();
    if (!cleanName) return { authors: [], queryUsed: '' };

    const safePerPage = Math.min(20, Math.max(1, Number(perPage) || DEFAULT_PER_PAGE));
    const fieldsSelect = [
      'id',
      'orcid',
      'display_name',
      'display_name_alternatives',
      'works_count',
      'cited_by_count',
      'summary_stats',
      'last_known_institutions',
      'affiliations',
      'topics',
      'topic_share'
    ].join(',');

    const firstRes = await fetchOpenAlexJson(
      `/authors?search=${encodeURIComponent(cleanName)}&per-page=${safePerPage}&select=${encodeURIComponent(fieldsSelect)}`
    );
    let results = firstRes.data && Array.isArray(firstRes.data.results) ? firstRes.data.results : [];
    let queryUsed = cleanName;

    // Nếu tên tiếng Việt có dấu chưa ra kết quả, tự động thử lại bằng tên không dấu chuẩn quốc tế
    const asciiName = stripVietnameseDiacritics(cleanName);
    if (results.length === 0 && asciiName && asciiName.toLowerCase() !== cleanName.toLowerCase()) {
      const retryRes = await fetchOpenAlexJson(
        `/authors?search=${encodeURIComponent(asciiName)}&per-page=${safePerPage}&select=${encodeURIComponent(fieldsSelect)}`
      );
      results = retryRes.data && Array.isArray(retryRes.data.results) ? retryRes.data.results : [];
      if (results.length > 0) queryUsed = asciiName;
    }

    const authors = results.map(extractAuthorSummary).filter(Boolean);
    return { authors, queryUsed };
  }

  /**
   * Tìm kiếm tác giả trên OpenAlex kết hợp ORCID (nếu có) và Tên hiển thị.
   * @param {{ name?: string, orcid?: string, perPage?: number }} [params={}] - Tham số tìm kiếm.
   * @returns {Promise<{
   *   ok: boolean,
   *   authors: Array<Object>,
   *   matchedBy: 'orcid'|'name'|'',
   *   queryUsed: string,
   *   errorCode: string,
   *   message: string
   * }>} Kết quả tìm kiếm chuẩn hóa cho UI.
   */
  async function searchAuthors(params = {}) {
    const rawName = String(params.name || '').trim();
    const rawOrcid = String(params.orcid || '').trim();
    const orcidNorm = normalizeOrcid(rawOrcid);

    if (rawOrcid && !orcidNorm) {
      return {
        ok: false,
        authors: [],
        matchedBy: '',
        queryUsed: '',
        errorCode: 'invalid-orcid',
        message: 'Mã ORCID không đúng định dạng (ví dụ: 0000-0002-1825-0097).'
      };
    }

    if (!orcidNorm && rawName.length < 2) {
      return {
        ok: false,
        authors: [],
        matchedBy: '',
        queryUsed: '',
        errorCode: 'empty-query',
        message: 'Vui lòng nhập tên tác giả (tối thiểu 2 ký tự) hoặc mã ORCID để tìm trên OpenAlex.'
      };
    }

    try {
      if (orcidNorm) {
        const byOrcid = await fetchAuthorByOrcid(orcidNorm);
        if (byOrcid) {
          return {
            ok: true,
            authors: [byOrcid],
            matchedBy: 'orcid',
            queryUsed: orcidNorm,
            errorCode: '',
            message: ''
          };
        }
      }

      if (rawName.length >= 2) {
        const { authors, queryUsed } = await fetchAuthorsByName(rawName, params.perPage);
        return {
          ok: true,
          authors,
          matchedBy: authors.length > 0 ? 'name' : '',
          queryUsed,
          errorCode: authors.length > 0 ? '' : 'not-found',
          message: authors.length > 0
            ? ''
            : 'Không tìm thấy hồ sơ tác giả phù hợp trên OpenAlex. Bạn có thể thử bỏ dấu/đảo thứ tự tên hoặc chọn lĩnh vực thủ công.'
        };
      }

      return {
        ok: true,
        authors: [],
        matchedBy: '',
        queryUsed: orcidNorm,
        errorCode: 'not-found',
        message: 'Không tìm thấy hồ sơ OpenAlex gắn với mã ORCID này.'
      };
    } catch (err) {
      const code = (err && err.code) || 'network';
      const fallbackMsg = 'Không thể kết nối tới OpenAlex lúc này. Bạn vẫn có thể chọn lĩnh vực thủ công.';
      return {
        ok: false,
        authors: [],
        matchedBy: '',
        queryUsed: '',
        errorCode: code,
        message: (err && err.message) || fallbackMsg
      };
    }
  }

  /**
   * Tra cứu chi tiết một hồ sơ tác giả OpenAlex theo ID (`A...` hoặc URI).
   * @param {string} openAlexId - Mã OpenAlex của tác giả.
   * @returns {Promise<Object|null>} Bản ghi tác giả đã chuẩn hóa hoặc null.
   */
  async function getAuthorById(openAlexId) {
    const shortId = extractShortOpenAlexId(openAlexId);
    if (!shortId) return null;
    try {
      const res = await fetchOpenAlexJson(`/authors/${encodeURIComponent(shortId)}`);
      return res.data ? extractAuthorSummary(res.data) : null;
    } catch {
      return null;
    }
  }

  window.ConfGuideOpenAlex = {
    stripVietnameseDiacritics,
    normalizeOrcid,
    extractShortOpenAlexId,
    extractAuthorSummary,
    searchAuthors,
    getAuthorById
  };
})();
