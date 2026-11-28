/**
 * Cấu hình tập trung và kiểm tra biến môi trường (backend/config/env.js)
 * Đọc biến môi trường một lần khi khởi động, làm sạch giá trị và cảnh báo rõ ràng nếu thiếu cấu hình.
 */

'use strict';

const path = require('node:path');
const dotenv = require('dotenv');

const BACKEND_ROOT = path.resolve(__dirname, '..');
const PROJECT_ROOT = path.resolve(BACKEND_ROOT, '..');
const BACKEND_ENV_PATH = path.join(BACKEND_ROOT, '.env');
const ROOT_ENV_PATH = path.join(PROJECT_ROOT, '.env');

// Đọc .env một lần duy nhất khi module cấu hình được nạp (ưu tiên backend/.env, bổ sung .env ở gốc)
dotenv.config({ path: BACKEND_ENV_PATH });
dotenv.config({ path: ROOT_ENV_PATH });

const GOOGLE_CLIENT_ID_PATTERN = /^[0-9]+-[a-zA-Z0-9_.-]+\.apps\.googleusercontent\.com$/;
const SERPAPI_MONTHLY_LIMIT = 250;
const DEFAULT_SERPAPI_STOP_AT = 245;

/**
 * Làm sạch chuỗi giá trị từ biến môi trường (loại bỏ khoảng trắng và dấu ngoặc kép bao quanh).
 * @param {*} rawValue - Giá trị thô từ process.env.
 * @returns {string} Chuỗi đã làm sạch.
 */
function cleanEnvString(rawValue) {
  return String(rawValue || '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .trim();
}

/**
 * Phân tích danh sách origin hợp lệ từ FRONTEND_ORIGIN (ngăn cách bởi dấu phẩy).
 * @param {*} rawValue - Giá trị thô của FRONTEND_ORIGIN.
 * @returns {{ origins: Array<string>, invalidOrigins: Array<string> }} Danh sách origin hợp lệ và không hợp lệ.
 */
function parseAllowedOrigins(rawValue) {
  const raw = cleanEnvString(rawValue);
  if (!raw) return { origins: [], invalidOrigins: [] };

  const origins = [];
  const invalidOrigins = [];
  const seen = new Set();

  for (const part of raw.split(',')) {
    const trimmed = part.trim().replace(/\/+$/, '');
    if (!trimmed) continue;
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        invalidOrigins.push(trimmed);
        continue;
      }
      const normalized = parsed.origin;
      if (!seen.has(normalized)) {
        seen.add(normalized);
        origins.push(normalized);
      }
    } catch {
      invalidOrigins.push(trimmed);
    }
  }

  return { origins, invalidOrigins };
}

/**
 * Đọc và kiểm tra cấu hình Google OAuth Web Client ID.
 * @param {*} rawValue - Giá trị thô của GOOGLE_CLIENT_ID.
 * @returns {{ value: string, status: 'ok'|'missing'|'placeholder'|'invalid' }}
 */
function parseGoogleClientId(rawValue) {
  const cleaned = cleanEnvString(rawValue);
  if (!cleaned) return { value: '', status: 'missing' };
  if (cleaned.startsWith('your-google-client-id')) return { value: '', status: 'placeholder' };
  if (!GOOGLE_CLIENT_ID_PATTERN.test(cleaned)) return { value: cleaned, status: 'invalid' };
  return { value: cleaned, status: 'ok' };
}

/**
 * Đọc cổng chạy server hợp lệ (1..65535), mặc định 3000.
 * @param {*} rawPort - Giá trị thô của PORT.
 * @returns {number} Số cổng hợp lệ.
 */
function parsePort(rawPort) {
  const trimmed = cleanEnvString(rawPort);
  if (!trimmed) return 3000;
  const num = Number(trimmed);
  if (Number.isInteger(num) && num >= 1 && num <= 65535) return num;
  return 3000;
}

/**
 * Đọc ngưỡng dừng gọi SerpApi trong tháng (1..250, mặc định 245).
 * @param {*} rawStopAt - Giá trị thô của SERPAPI_STOP_AT.
 * @returns {number} Ngưỡng dừng an toàn.
 */
function parseSerpApiStopAt(rawStopAt) {
  const num = Number(cleanEnvString(rawStopAt));
  if (Number.isInteger(num) && num >= 1 && num <= SERPAPI_MONTHLY_LIMIT) {
    return num;
  }
  return DEFAULT_SERPAPI_STOP_AT;
}

const isVercel = Boolean(process.env.VERCEL);
const port = parsePort(process.env.PORT);
const { origins: allowedOrigins, invalidOrigins } = parseAllowedOrigins(process.env.FRONTEND_ORIGIN);
const googleClientInfo = parseGoogleClientId(process.env.GOOGLE_CLIENT_ID);
const serpapiApiKey = cleanEnvString(process.env.SERPAPI_API_KEY);
const semanticScholarApiKey = cleanEnvString(process.env.SEMANTIC_SCHOLAR_API_KEY);
const serpapiStopAt = parseSerpApiStopAt(process.env.SERPAPI_STOP_AT);

/**
 * Kiểm tra cấu hình môi trường lúc khởi động và trả về danh sách cảnh báo rõ ràng (không in khóa bí mật).
 * @returns {Array<string>} Danh sách thông báo cần lưu ý.
 */
function validateStartupConfig() {
  const warnings = [];
  const rawPort = cleanEnvString(process.env.PORT);

  if (rawPort) {
    const numPort = Number(rawPort);
    if (!Number.isInteger(numPort) || numPort < 1 || numPort > 65535) {
      warnings.push('Biến môi trường PORT không hợp lệ (cần số nguyên 1..65535), tự động dùng mặc định 3000.');
    }
  }
  if (allowedOrigins.length === 0) {
    warnings.push('Thiếu biến môi trường FRONTEND_ORIGIN; trình duyệt khác origin sẽ bị CORS từ chối.');
  }
  if (invalidOrigins.length > 0) {
    warnings.push(`FRONTEND_ORIGIN chứa giá trị không hợp lệ đã bị bỏ qua (${invalidOrigins.length} mục).`);
  }
  if (googleClientInfo.status === 'missing' || googleClientInfo.status === 'placeholder') {
    warnings.push('Thiếu GOOGLE_CLIENT_ID hợp lệ trong .env; đăng nhập Google Sign-In sẽ trả lỗi cấu hình.');
  } else if (googleClientInfo.status === 'invalid') {
    warnings.push('GOOGLE_CLIENT_ID trong .env chưa đúng định dạng *.apps.googleusercontent.com.');
  }

  return warnings;
}

module.exports = {
  isVercel,
  port,
  frontendRoot: PROJECT_ROOT,
  backendDataDir: path.join(BACKEND_ROOT, 'data'),
  allowedOrigins,
  googleClientId: googleClientInfo.status === 'ok' ? googleClientInfo.value : '',
  googleClientIdRaw: googleClientInfo.value,
  googleClientIdStatus: googleClientInfo.status,
  serpapiApiKey,
  semanticScholarApiKey,
  serpapiMonthlyLimit: SERPAPI_MONTHLY_LIMIT,
  serpapiStopAt,
  validateStartupConfig
};
