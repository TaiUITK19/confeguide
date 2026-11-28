/**
 * Dịch vụ dự phòng Semantic Scholar Graph API (backend/services/semanticScholar.js)
 * Tìm tác giả theo tên và trích xuất tiêu đề bài báo + chuyên ngành (không bắt buộc API key).
 */

'use strict';

const config = require('../config/env');
const {
  fetchWithTimeout,
  safeReadJson,
  stripVietnameseDiacritics,
  hasReasonableNameOverlap
} = require('../utils/http');

const SEMANTIC_SCHOLAR_BASE_URL = 'https://api.semanticscholar.org/graph/v1';
const S2_TIMEOUT_MS = 5 * 1000;
const MAX_CANDIDATES = 5;

/**
 * Tìm tác giả trên Semantic Scholar Graph API (best-effort) để đọc bài báo và chuyên ngành.
 * @param {string} rawName - Tên tác giả.
 * @param {import('../utils/cache').MemoryCache} cache - Bộ nhớ đệm dùng chung.
 * @returns {Promise<Array<Object>>} Tối đa 5 ứng viên hoặc mảng rỗng nếu bị giới hạn 429/không thấy.
 */
async function searchSemanticScholarFallback(rawName, cache) {
  const asciiName = stripVietnameseDiacritics(rawName);
  if (!asciiName || asciiName.length < 2) return [];

  const cacheKey = `s2:candidates:${asciiName.toLowerCase()}`;
  return cache.getOrFetch(
    cacheKey,
    async () => {
      const headers = { Accept: 'application/json' };
      if (config.semanticScholarApiKey) {
        headers['x-api-key'] = config.semanticScholarApiKey;
      }

      const fields = 'name,url,affiliations,paperCount,citationCount,papers.title,papers.fieldsOfStudy,papers.s2FieldsOfStudy';
      const url = `${SEMANTIC_SCHOLAR_BASE_URL}/author/search?query=${encodeURIComponent(asciiName)}&fields=${encodeURIComponent(fields)}&limit=8`;

      let response;
      try {
        response = await fetchWithTimeout(url, {
          method: 'GET',
          headers,
          timeoutMs: S2_TIMEOUT_MS
        });
      } catch {
        return [];
      }

      if (!response || !response.ok) return [];
      const payload = await safeReadJson(response, null);
      if (!payload || typeof payload !== 'object') return [];

      const rows = Array.isArray(payload.data) ? payload.data : [];
      const filtered = rows
        .filter(a => a && a.authorId && a.name && hasReasonableNameOverlap(rawName, a.name))
        .sort((a, b) => Number(b.citationCount || 0) - Number(a.citationCount || 0))
        .slice(0, MAX_CANDIDATES);

      return filtered.map(author => {
        const papers = Array.isArray(author.papers) ? author.papers : [];
        const paperTitles = [];
        const seenT = new Set();
        const interests = [];
        const seenF = new Set();

        for (const p of papers.slice(0, 15)) {
          const t = String((p && p.title) || '').replace(/\s+/g, ' ').trim();
          if (t && !seenT.has(t.toLowerCase())) {
            seenT.add(t.toLowerCase());
            paperTitles.push(t);
          }
          const s2Fields = Array.isArray(p && p.s2FieldsOfStudy) ? p.s2FieldsOfStudy : [];
          for (const f of s2Fields) {
            const cat = String((f && f.category) || '').trim();
            if (cat && !seenF.has(cat.toLowerCase())) {
              seenF.add(cat.toLowerCase());
              interests.push(cat);
            }
          }
          const legacyFields = Array.isArray(p && p.fieldsOfStudy) ? p.fieldsOfStudy : [];
          for (const f of legacyFields) {
            const cat = String(f || '').trim();
            if (cat && !seenF.has(cat.toLowerCase())) {
              seenF.add(cat.toLowerCase());
              interests.push(cat);
            }
          }
        }

        const affList = Array.isArray(author.affiliations) ? author.affiliations : [];
        return {
          scholarId: String(author.authorId),
          name: String(author.name).trim(),
          affiliation: affList.map(x => String(x || '').trim()).filter(Boolean).join(', '),
          emailDomain: '',
          biography: '',
          interests,
          paperTitles,
          paperCount: Number(author.paperCount || paperTitles.length || 0),
          citedByCount: Number(author.citationCount || 0),
          scholarUrl: String(author.url || '').trim(),
          source: 'semantic_scholar'
        };
      });
    },
    { shouldCache: list => Array.isArray(list) && list.length > 0 }
  );
}

module.exports = { searchSemanticScholarFallback };
