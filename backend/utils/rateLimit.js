/**
 * Middleware giới hạn tần suất gọi API theo IP trong bộ nhớ (backend/utils/rateLimit.js)
 */

'use strict';

const DEFAULT_WINDOW_MS = 60 * 1000;
const DEFAULT_MAX_REQUESTS = 60;
const DEFAULT_MAX_BUCKETS = 5000;

/**
 * Lấy địa chỉ IP ổn định của client (hỗ trợ proxy khi `trust proxy` đã bật).
 * @param {import('express').Request} req
 * @returns {string} Chuỗi IP đại diện.
 */
function getClientIp(req) {
  return String(req.ip || (req.socket && req.socket.remoteAddress) || 'unknown').trim();
}

/**
 * Tạo middleware giới hạn số lượt request theo cửa sổ thời gian cố định.
 * @param {{
 *   windowMs?: number,
 *   maxRequests?: number,
 *   maxBuckets?: number,
 *   message?: string
 * }} [options={}]
 * @returns {import('express').RequestHandler}
 */
function createRateLimiter(options = {}) {
  const windowMs = Number.isFinite(options.windowMs) && options.windowMs > 0
    ? options.windowMs
    : DEFAULT_WINDOW_MS;
  const maxRequests = Number.isInteger(options.maxRequests) && options.maxRequests > 0
    ? options.maxRequests
    : DEFAULT_MAX_REQUESTS;
  const maxBuckets = Number.isInteger(options.maxBuckets) && options.maxBuckets > 0
    ? options.maxBuckets
    : DEFAULT_MAX_BUCKETS;
  const message = options.message || 'Bạn gửi quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.';

  /** @type {Map<string, { count: number, resetAt: number }>} */
  const buckets = new Map();

  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of buckets.entries()) {
      if (now >= entry.resetAt) buckets.delete(key);
    }
  }, windowMs);
  if (typeof cleanupTimer.unref === 'function') {
    cleanupTimer.unref();
  }

  return function rateLimitMiddleware(req, res, next) {
    if (req.method === 'OPTIONS') return next();

    const now = Date.now();
    const ip = getClientIp(req);
    let entry = buckets.get(ip);

    if (!entry || now >= entry.resetAt) {
      if (!entry && buckets.size >= maxBuckets) {
        const oldestKey = buckets.keys().next().value;
        if (oldestKey !== undefined) buckets.delete(oldestKey);
      }
      entry = { count: 0, resetAt: now + windowMs };
    }

    entry.count += 1;
    // Cập nhật lại thứ tự để xóa LRU nếu đầy bộ nhớ
    buckets.delete(ip);
    buckets.set(ip, entry);

    const remaining = Math.max(0, maxRequests - entry.count);
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(remaining));

    if (entry.count > maxRequests) {
      const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        code: 'RATE_LIMIT_EXCEEDED',
        message
      });
    }

    return next();
  };
}

module.exports = { createRateLimiter };
