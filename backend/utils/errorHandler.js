/**
 * Tiện ích & middleware xử lý lỗi tập trung (backend/utils/errorHandler.js)
 * - Giữ mã lỗi nghiệp vụ rõ ràng (ví dụ SCHOLAR_BLOCKED).
 * - Không lộ stack trace và tự động che khóa API / token nếu xuất hiện trong chuỗi lỗi.
 */

'use strict';

/**
 * Lỗi nghiệp vụ có mã HTTP và mã lỗi chuẩn hóa để trả cho client.
 */
class AppError extends Error {
  /**
   * @param {string} message - Thông báo lỗi an toàn cho người dùng.
   * @param {{ statusCode?: number, code?: string, extra?: Record<string, *> }} [options={}]
   */
  constructor(message, options = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = Number.isInteger(options.statusCode) ? options.statusCode : 500;
    this.code = options.code || 'INTERNAL_ERROR';
    this.extra = options.extra && typeof options.extra === 'object' ? options.extra : null;
  }
}

/**
 * Lỗi chuyên biệt khi Google Scholar / SerpApi bị chặn hoặc thiếu API key đọc hồ sơ Scholar.
 */
class ScholarBlockedError extends AppError {
  constructor(message = 'Google Scholar đang chặn truy cập tự động (captcha hoặc HTTP 429).') {
    super(message, { statusCode: 503, code: 'SCHOLAR_BLOCKED' });
    this.name = 'ScholarBlockedError';
  }
}

/**
 * Loại bỏ khóa API hoặc token nhạy cảm khỏi chuỗi thông báo lỗi trước khi trả ra HTTP/log.
 * @param {*} rawMessage - Chuỗi thông báo thô.
 * @returns {string} Chuỗi đã che thông tin nhạy cảm.
 */
function redactSensitiveTokens(rawMessage) {
  return String(rawMessage || '')
    .replace(/([?&](?:api_key|key|token|access_token|credential)=)[^&\s]+/gi, '$1[REDACTED]')
    .replace(/(Bearer\s+)[A-Za-z0-9._-]+/gi, '$1[REDACTED]')
    .replace(/(x-api-key\s*[:=]\s*)[^\s,;]+/gi, '$1[REDACTED]');
}

/**
 * Bọc handler async của Express để tự động đẩy lỗi vào middleware lỗi tập trung.
 * @param {Function} handler - Express async route handler.
 * @returns {import('express').RequestHandler}
 */
function asyncHandler(handler) {
  return function wrappedHandler(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

/**
 * Middleware xử lý đường dẫn không tồn tại (404).
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Không tìm thấy đường dẫn ${req.method} ${req.originalUrl}`
  });
}

/**
 * Middleware xử lý lỗi tập trung:
 * - Không lộ stack trace ra phản hồi JSON.
 * - Với lỗi 500 không tường minh (SyntaxError JSON body trừ khi là entity.parse.failed -> 400), trả thông báo chung.
 */
function errorHandler(err, req, res, _next) {
  // Lỗi body JSON không hợp lệ hoặc vượt quá giới hạn kích thước của express.json
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'INVALID_JSON_BODY',
      message: 'Dữ liệu JSON gửi lên không đúng cú pháp.'
    });
  }
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'PAYLOAD_TOO_LARGE',
      message: 'Kích thước dữ liệu gửi lên vượt quá giới hạn cho phép.'
    });
  }

  const statusCode = (err && Number.isInteger(err.statusCode) && err.statusCode >= 400 && err.statusCode < 600)
    ? err.statusCode
    : 500;
  const code = (err && typeof err.code === 'string' && err.code) || 'INTERNAL_ERROR';

  // Không trả thông điệp chi tiết của lỗi hệ thống 500 chưa kiểm soát
  const safeMessage = statusCode >= 500 && !(err instanceof AppError) && !(err && err.expose)
    ? 'Đã xảy ra lỗi xử lý trên máy chủ.'
    : redactSensitiveTokens((err && err.message) || 'Đã xảy ra lỗi xử lý trên máy chủ.');

  const payload = {
    error: code,
    message: safeMessage
  };
  if (err && err.extra) {
    Object.assign(payload, err.extra);
  }
  if (err && err.includeCodeField) {
    payload.code = code;
  }

  return res.status(statusCode).json(payload);
}

module.exports = {
  AppError,
  ScholarBlockedError,
  redactSensitiveTokens,
  asyncHandler,
  notFoundHandler,
  errorHandler
};
