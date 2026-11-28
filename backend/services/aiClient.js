/**
 * Gọi Google Gemini và nhận kết quả JSON (backend/services/aiClient.js)
 * Dùng chung cho gợi ý theo abstract và chatbox hỏi đáp qua API tương thích OpenAI của Gemini;
 * thử lần lượt từng model trong GEMINI_MODEL khi model trước quá tải, lỗi hoặc trả sai định dạng.
 */

'use strict';

const config = require('../config/env');
const { fetchWithTimeout } = require('../utils/http');
const { AppError } = require('../utils/errorHandler');

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const ATTEMPT_TIMEOUT_MS = 45 * 1000;
// Tổng thời gian tối đa cho mọi lần thử, nằm dưới giới hạn maxDuration 60 giây của Vercel
const TOTAL_BUDGET_MS = 55 * 1000;
const MIN_ATTEMPT_MS = 5 * 1000;
const DEFAULT_MAX_OUTPUT_TOKENS = 3000;
const RETRYABLE_STATUS = new Set([404, 429, 500, 502, 503, 504]);

/**
 * Tách đối tượng JSON đầu tiên trong phản hồi của mô hình (chịu được ```json ... ``` hoặc văn bản thừa).
 * @param {string} text - Nội dung trả về.
 * @returns {Object|null} Đối tượng JSON hoặc null.
 */
function extractJsonObject(text) {
  const raw = String(text || '').replace(/```(?:json)?/gi, '').trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * Lấy thông báo lỗi từ body lỗi của Gemini (dạng `[{ error }]` hoặc `{ error }`).
 * @param {*} body - Body JSON lỗi.
 * @returns {string} Thông báo lỗi ngắn.
 */
function readUpstreamError(body) {
  const item = Array.isArray(body) ? body[0] : body;
  return item && item.error && item.error.message ? String(item.error.message).slice(0, 200) : 'không có nội dung';
}

/**
 * Gọi một model Gemini và chuẩn hóa kết quả thành { data } hoặc { error, retryable }.
 * `reasoning_effort: 'low'` để model trả lời nhanh, không tiêu hết token cho "thinking".
 * @returns {Promise<{ model?: string, data?: Object, error?: AppError, retryable?: boolean }>}
 */
async function attemptCompletion(model, messages, options, timeoutMs) {
  const payload = { model, messages, temperature: options.temperature ?? 0.2, max_tokens: options.maxTokens || DEFAULT_MAX_OUTPUT_TOKENS, reasoning_effort: 'low', response_format: { type: 'json_object' } };
  let response;
  try {
    response = await fetchWithTimeout(GEMINI_URL, {
      method: 'POST',
      timeoutMs,
      headers: { 'Authorization': `Bearer ${config.geminiApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    const isTimeout = err && err.code === 'REQUEST_TIMEOUT';
    console.warn(`[AI] ${model} ${isTimeout ? 'quá thời gian' : 'lỗi kết nối'}.`);
    return { retryable: true, error: new AppError(isTimeout ? 'Mô hình AI phản hồi quá lâu, bạn thử lại sau nhé.' : 'Không kết nối được tới dịch vụ AI.', { statusCode: isTimeout ? 504 : 502, code: isTimeout ? 'AI_TIMEOUT' : 'AI_UPSTREAM_ERROR' }) };
  }

  const body = await response.json().catch(() => null);
  if (response.status === 401 || response.status === 403 || (response.status === 400 && /api key/i.test(readUpstreamError(body)))) {
    console.warn(`[AI] Gemini từ chối GEMINI_API_KEY (HTTP ${response.status}).`);
    return { retryable: false, error: new AppError('GEMINI_API_KEY không hợp lệ hoặc đã bị thu hồi.', { statusCode: 503, code: 'AI_NOT_CONFIGURED' }) };
  }
  if (!response.ok || !body) {
    console.warn(`[AI] ${model} lỗi HTTP ${response.status}: ${readUpstreamError(body)}`);
    const error = response.status === 429
      ? new AppError('Gemini đang quá tải hoặc đã hết lượt miễn phí, bạn thử lại sau ít phút.', { statusCode: 429, code: 'AI_RATE_LIMITED' })
      : new AppError('Dịch vụ AI đang gặp lỗi, bạn thử lại sau nhé.', { statusCode: 502, code: 'AI_UPSTREAM_ERROR' });
    return { retryable: RETRYABLE_STATUS.has(response.status), error };
  }

  const choice = body.choices && body.choices[0];
  const data = extractJsonObject(choice && choice.message && choice.message.content);
  if (!data) {
    console.warn(`[AI] ${model} trả nội dung không phải JSON (finish_reason=${choice ? choice.finish_reason : 'n/a'}).`);
    return { retryable: true, error: new AppError('Mô hình AI trả kết quả không đúng định dạng, bạn thử gửi lại nhé.', { statusCode: 502, code: 'AI_BAD_RESPONSE' }) };
  }
  return { model: body.model || model, data };
}

/**
 * Gửi hội thoại tới Gemini và trả về đối tượng JSON mô hình sinh ra.
 * @param {Array<{role: string, content: string}>} messages - Tin nhắn system/user/assistant.
 * @param {{ maxTokens?: number, temperature?: number }} [options]
 * @returns {Promise<{ model: string, data: Object }>} Tên model thực tế và JSON đã tách.
 */
async function requestJsonCompletion(messages, options = {}) {
  if (!config.geminiApiKey) {
    throw new AppError('Máy chủ chưa cấu hình GEMINI_API_KEY nên chưa dùng được trợ lý AI.', { statusCode: 503, code: 'AI_NOT_CONFIGURED' });
  }

  const deadline = Date.now() + TOTAL_BUDGET_MS;
  let lastError = null;
  for (const model of config.geminiModels) {
    const remaining = deadline - Date.now();
    if (remaining < MIN_ATTEMPT_MS) break;
    const result = await attemptCompletion(model, messages, options, Math.min(ATTEMPT_TIMEOUT_MS, remaining));
    if (result.data) return { model: result.model, data: result.data };
    lastError = result.error;
    if (!result.retryable) break;
  }
  throw lastError || new AppError('Dịch vụ AI đang gặp lỗi, bạn thử lại sau nhé.', { statusCode: 502, code: 'AI_UPSTREAM_ERROR' });
}

module.exports = { requestJsonCompletion, extractJsonObject };
