/**
 * Tiện ích gọi HTTP dùng chung có timeout bằng AbortController và chuẩn hóa tên tác giả (backend/utils/http.js)
 */

'use strict';

const DEFAULT_TIMEOUT_MS = 10 * 1000;

/**
 * Gọi `fetch` kèm giới hạn thời gian bằng `AbortController` và dọn timer an toàn.
 * @param {string} url - URL đích.
 * @param {RequestInit & { timeoutMs?: number }} [options={}] - Tùy chọn fetch và `timeoutMs`.
 * @returns {Promise<Response>} Đối tượng Response.
 */
async function fetchWithTimeout(url, options = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal: externalSignal, ...fetchOptions } = options;
  const controller = new AbortController();
  let timedOut = false;

  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }
  }

  const timerId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    });
  } catch (err) {
    if (timedOut) {
      const timeoutErr = new Error(`Quá thời gian kết nối (${Math.round(timeoutMs / 1000)} giây).`);
      timeoutErr.name = 'TimeoutError';
      timeoutErr.code = 'REQUEST_TIMEOUT';
      timeoutErr.statusCode = 504;
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timerId);
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}

/**
 * Đọc JSON an toàn từ HTTP Response mà không ném lỗi parse.
 * @param {Response|null|undefined} response - Đối tượng Response.
 * @param {*} [fallback={}] - Giá trị mặc định nếu body rỗng hoặc không phải JSON.
 * @returns {Promise<*>} Dữ liệu JSON hoặc fallback.
 */
async function safeReadJson(response, fallback = {}) {
  if (!response) return fallback;
  try {
    return await response.json();
  } catch {
    return fallback;
  }
}

/**
 * Loại bỏ dấu tiếng Việt để hỗ trợ tìm kiếm không dấu trên các nguồn học thuật quốc tế.
 * @param {*} text - Chuỗi đầu vào.
 * @returns {string} Chuỗi không dấu đã làm sạch khoảng trắng.
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
 * Kiểm tra độ khớp tên (không dấu) để tránh nhận nhầm ứng viên khác hoàn toàn.
 * @param {string} queryName - Tên truy vấn.
 * @param {string} candidateName - Tên ứng viên trả về.
 * @returns {boolean} True nếu đủ độ tương đồng.
 */
function hasReasonableNameOverlap(queryName, candidateName) {
  const qTokens = stripVietnameseDiacritics(queryName).toLowerCase().split(/\s+/).filter(t => t.length >= 2);
  const cTokens = new Set(
    stripVietnameseDiacritics(candidateName).toLowerCase().split(/\s+/).filter(t => t.length >= 2)
  );
  if (qTokens.length === 0 || cTokens.size === 0) return false;
  let overlap = 0;
  for (const token of qTokens) {
    if (cTokens.has(token)) overlap += 1;
  }
  const minRequired = qTokens.length === 1 ? 1 : 2;
  return overlap >= minRequired;
}

module.exports = {
  DEFAULT_TIMEOUT_MS,
  fetchWithTimeout,
  safeReadJson,
  stripVietnameseDiacritics,
  hasReasonableNameOverlap
};
