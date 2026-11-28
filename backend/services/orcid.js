/**
 * Dịch vụ tra cứu ORCID Public API v3.0 (backend/services/orcid.js)
 * Không cần API key: tự tìm theo Tên / Email hoặc đọc chi tiết hồ sơ theo ORCID iD.
 */

'use strict';

const { AppError } = require('../utils/errorHandler');
const {
  fetchWithTimeout,
  safeReadJson,
  stripVietnameseDiacritics,
  hasReasonableNameOverlap
} = require('../utils/http');

const ORCID_PUBLIC_BASE_URL = 'https://pub.orcid.org/v3.0';
const ORCID_TIMEOUT_MS = 10 * 1000;
const ORCID_REGEX = /\b(\d{4}-\d{4}-\d{4}-\d{3}[\dX])\b/i;

/**
 * Chuẩn hóa chuỗi hoặc URL ORCID (`https://orcid.org/0000-0002-1825-0097`) về định dạng `0000-0002-1825-0097`.
 * @param {*} rawOrcid - Mã ORCID hoặc URL ORCID.
 * @returns {string} ORCID iD chuẩn hoặc chuỗi rỗng.
 */
function normalizeOrcidId(rawOrcid) {
  const match = String(rawOrcid || '').trim().match(ORCID_REGEX);
  return match ? match[1].toUpperCase() : '';
}

/**
 * Gọi một endpoint công khai của ORCID Public API v3.0 (không yêu cầu API key).
 * @param {string} relativePath - Đường dẫn sau `/v3.0`.
 * @returns {Promise<Object|null>} JSON trả về hoặc null nếu 404.
 */
async function fetchOrcidPublicJson(relativePath) {
  const response = await fetchWithTimeout(`${ORCID_PUBLIC_BASE_URL}${relativePath}`, {
    method: 'GET',
    headers: { Accept: 'application/vnd.orcid+json, application/json;q=0.9' },
    timeoutMs: ORCID_TIMEOUT_MS
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new AppError(`ORCID Public API trả về mã HTTP ${response.status}.`, {
      statusCode: response.status >= 400 ? response.status : 502,
      code: 'ORCID_HTTP_ERROR'
    });
  }
  return safeReadJson(response, null);
}

/**
 * Trích xuất cơ quan & bộ môn công tác đầu tiên từ phản hồi `/employments` của ORCID.
 * @param {Object|null} employmentsData - Dữ liệu employments từ ORCID.
 * @returns {string} Tên cơ quan (kèm bộ môn nếu có).
 */
function extractAffiliation(employmentsData) {
  if (!employmentsData || typeof employmentsData !== 'object') return '';

  const directList = Array.isArray(employmentsData['employment-summary'])
    ? employmentsData['employment-summary']
    : [];
  const groupList = Array.isArray(employmentsData['affiliation-group'])
    ? employmentsData['affiliation-group']
    : [];
  const firstSummary = directList[0]
    || (groupList[0] && Array.isArray(groupList[0].summaries) && groupList[0].summaries[0]
      ? groupList[0].summaries[0]['employment-summary']
      : null);

  if (firstSummary && firstSummary.organization && firstSummary.organization.name) {
    const orgName = String(firstSummary.organization.name).trim();
    const deptName = String(firstSummary['department-name'] || '').trim();
    return deptName ? `${orgName} (${deptName})` : orgName;
  }
  return '';
}

/**
 * Đọc hồ sơ ORCID công khai theo ORCID iD (tên, tiểu sử, cơ quan, từ khóa và tối đa 15 bài báo), có cache + gộp request.
 * @param {string} rawOrcid - Mã ORCID iD.
 * @param {import('../utils/cache').MemoryCache} cache - Bộ nhớ đệm dùng chung.
 * @returns {Promise<Object|null>} Hồ sơ chuẩn hóa nguồn `orcid` hoặc null nếu không tồn tại.
 */
async function getOrcidProfile(rawOrcid, cache) {
  const orcid = normalizeOrcidId(rawOrcid);
  if (!orcid) {
    throw new AppError('ORCID iD không đúng định dạng (ví dụ: 0000-0002-1825-0097).', {
      statusCode: 400,
      code: 'INVALID_ORCID'
    });
  }

  const cacheKey = `orcid:profile:v2:${orcid}`;
  return cache.getOrFetch(
    cacheKey,
    async () => {
      const [personData, employmentsData, worksData] = await Promise.all([
        fetchOrcidPublicJson(`/${encodeURIComponent(orcid)}/person`),
        fetchOrcidPublicJson(`/${encodeURIComponent(orcid)}/employments`).catch(() => null),
        fetchOrcidPublicJson(`/${encodeURIComponent(orcid)}/works`).catch(() => null)
      ]);

      if (!personData) return null;

      const nameBlock = personData.name || {};
      const creditName = nameBlock['credit-name'] && nameBlock['credit-name'].value;
      const givenNames = nameBlock['given-names'] && nameBlock['given-names'].value;
      const familyName = nameBlock['family-name'] && nameBlock['family-name'].value;
      const fullName = String(creditName || [givenNames, familyName].filter(Boolean).join(' ') || orcid).trim();
      const biography = String((personData.biography && personData.biography.content) || '')
        .replace(/\s+/g, ' ')
        .trim();

      const rawKeywords = personData.keywords && Array.isArray(personData.keywords.keyword)
        ? personData.keywords.keyword
        : [];
      const interests = [];
      const seen = new Set();
      for (const kw of rawKeywords) {
        const content = String((kw && kw.content) || '').trim();
        if (content && !seen.has(content.toLowerCase())) {
          seen.add(content.toLowerCase());
          interests.push(content);
        }
      }

      const rawGroups = worksData && Array.isArray(worksData.group) ? worksData.group : [];
      const paperTitles = [];
      const seenTitles = new Set();
      for (const grp of rawGroups) {
        if (paperTitles.length >= 15) break;
        const summary = Array.isArray(grp['work-summary']) ? grp['work-summary'][0] : null;
        const titleVal = summary && summary.title && summary.title.title && summary.title.title.value;
        const cleanTitle = String(titleVal || '').replace(/\s+/g, ' ').trim();
        if (cleanTitle && !seenTitles.has(cleanTitle.toLowerCase())) {
          seenTitles.add(cleanTitle.toLowerCase());
          paperTitles.push(cleanTitle);
        }
      }

      return {
        scholarId: orcid,
        orcid,
        name: fullName,
        affiliation: extractAffiliation(employmentsData),
        emailDomain: '',
        biography,
        interests,
        paperTitles,
        orcidUrl: `https://orcid.org/${orcid}`,
        source: 'orcid'
      };
    },
    { shouldCache: profile => Boolean(profile) }
  );
}

/**
 * Tự động tìm kiếm tác giả trên ORCID Public API bằng Tên & Email (không cần API key),
 * rồi tải hồ sơ đầy đủ cho tối đa 3 ứng viên khớp nhất.
 * @param {string} rawName - Tên hiển thị người dùng.
 * @param {string} rawEmail - Email Google của người dùng.
 * @param {import('../utils/cache').MemoryCache} cache - Bộ nhớ đệm dùng chung.
 * @returns {Promise<Array<Object>>} Danh sách hồ sơ ORCID đã chuẩn hóa.
 */
async function searchOrcidByNameAndEmail(rawName, rawEmail, cache) {
  const cleanName = String(rawName || '').replace(/\s+/g, ' ').trim();
  const cleanEmail = String(rawEmail || '').trim().toLowerCase();
  if (!cleanName && !cleanEmail) return [];

  const cacheKey = `orcid:search:${cleanName.toLowerCase()}::${cleanEmail}`;
  return cache.getOrFetch(
    cacheKey,
    async () => {
      const queries = [];
      if (cleanEmail) {
        queries.push(`email:"${cleanEmail.replace(/"/g, '')}"`);
      }
      const asciiName = stripVietnameseDiacritics(cleanName);
      const nameTokens = asciiName.split(/\s+/).filter(Boolean);
      if (nameTokens.length >= 2) {
        const first = nameTokens[0].replace(/"/g, '');
        const last = nameTokens[nameTokens.length - 1].replace(/"/g, '');
        queries.push(`(given-names:${first}* AND family-name:${last}*) OR "${asciiName.replace(/"/g, '')}"`);
      } else if (asciiName.length >= 2) {
        queries.push(`"${asciiName.replace(/"/g, '')}"`);
      }

      const orQuery = queries.join(' OR ');
      if (!orQuery) return [];

      const searchData = await fetchOrcidPublicJson(
        `/expanded-search/?q=${encodeURIComponent(orQuery)}&rows=6`
      );
      const rows = searchData && Array.isArray(searchData['expanded-result'])
        ? searchData['expanded-result']
        : [];

      const matchedOrcids = [];
      const seen = new Set();
      for (const row of rows) {
        const oid = normalizeOrcidId(row && row['orcid-id']);
        if (!oid || seen.has(oid)) continue;
        const rowEmails = Array.isArray(row.email) ? row.email.map(e => String(e).toLowerCase()) : [];
        const emailMatched = Boolean(cleanEmail && rowEmails.includes(cleanEmail));
        const fullRowName = row['credit-name']
          || [row['given-names'], row['family-names']].filter(Boolean).join(' ');
        if (!emailMatched && !hasReasonableNameOverlap(cleanName, fullRowName)) {
          continue;
        }
        seen.add(oid);
        matchedOrcids.push({ oid, emailMatched });
        if (matchedOrcids.length >= 3) break;
      }

      const hydrated = await Promise.all(
        matchedOrcids.map(item => getOrcidProfile(item.oid, cache).catch(() => null))
      );
      return hydrated.filter(Boolean);
    },
    { shouldCache: list => Array.isArray(list) }
  );
}

module.exports = {
  normalizeOrcidId,
  getOrcidProfile,
  searchOrcidByNameAndEmail
};
