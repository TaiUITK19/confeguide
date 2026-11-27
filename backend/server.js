/**
 * Điểm khởi chạy Backend ConfGuide (backend/server.js)
 * Node.js + Express:
 * - Xác thực Google ID Token (POST /auth/google)
 * - Tra cứu hồ sơ Google Scholar công khai + dự phòng OpenAlex (GET /api/scholar/*)
 * - Đọc / lưu danh sách lĩnh vực đã xác nhận theo email vào backend/data/fields.json (GET/PUT /api/fields)
 */

'use strict';

const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
require('dotenv').config();

const express = require('express');
const cors = require('cors');

const authRouter = require('./routes/auth');
const scholarRouter = require('./routes/scholar');
const fieldsRouter = require('./routes/fields');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const FRONTEND_ROOT = path.resolve(__dirname, '..');

/**
 * Phân tích danh sách origin hợp lệ từ biến môi trường FRONTEND_ORIGIN
 * (hỗ trợ một origin hoặc nhiều origin cách nhau bởi dấu phẩy).
 */
function parseAllowedOrigins() {
  const raw = String(process.env.FRONTEND_ORIGIN || '').trim();
  if (!raw) return [];
  return raw
    .split(',')
    .map(origin => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

const allowedOrigins = parseAllowedOrigins();

/**
 * Trích xuất host thực tế của request (hỗ trợ proxy Vercel x-forwarded-host) để cho phép cùng origin.
 * @param {import('express').Request} req
 * @returns {string}
 */
function getRequestHost(req) {
  return String(req.headers['x-forwarded-host'] || req.headers.host || '')
    .split(',')[0]
    .trim()
    .toLowerCase();
}

app.use(
  cors((req, callback) => {
    const origin = req.headers.origin;
    // Cho phép công cụ CLI (curl, Postman) không gửi header Origin
    if (!origin) {
      return callback(null, { origin: true });
    }

    const normalizedOrigin = origin.replace(/\/+$/, '');
    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, {
        origin: true,
        methods: ['GET', 'PUT', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Accept']
      });
    }

    // Tự động cho phép các yêu cầu cùng host (VD: triển khai đồng bộ frontend + backend trên Vercel hoặc cổng 3000)
    try {
      const originHost = new URL(normalizedOrigin).host.toLowerCase();
      const reqHost = getRequestHost(req);
      if (reqHost && originHost === reqHost) {
        return callback(null, {
          origin: true,
          methods: ['GET', 'PUT', 'POST', 'OPTIONS'],
          allowedHeaders: ['Content-Type', 'Accept']
        });
      }
    } catch {
      // Origin không hợp lệ sẽ bị từ chối bên dưới
    }

    const corsError = new Error(`Origin ${origin} không nằm trong danh sách FRONTEND_ORIGIN được phép.`);
    corsError.statusCode = 403;
    return callback(corsError);
  })
);

app.use(express.json({ limit: '256kb' }));

/** Endpoint kiểm tra trạng thái sống của backend */
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'confguide-backend',
    allowedOrigins
  });
});

app.use('/', authRouter);
app.use('/api/scholar', scholarRouter);
app.use('/api/fields', fieldsRouter);

// Chặn truy cập trực tiếp vào thư mục backend, tệp cấu hình và tài liệu nội bộ qua static server
app.use((req, res, next) => {
  const reqPath = decodeURIComponent(req.path || '').toLowerCase();
  const isBlocked = reqPath === '/backend'
    || reqPath.startsWith('/backend/')
    || reqPath === '/api'
    || reqPath.startsWith('/api/')
    || reqPath.startsWith('/.git')
    || reqPath.startsWith('/.env')
    || reqPath === '/agent.md'
    || reqPath === '/readme.md'
    || reqPath === '/.gitignore'
    || reqPath === '/.editorconfig'
    || reqPath === '/package.json'
    || reqPath === '/package-lock.json'
    || reqPath === '/vercel.json';
  if (isBlocked) {
    return res.status(404).json({
      error: 'NOT_FOUND',
      message: `Không tìm thấy đường dẫn ${req.method} ${req.originalUrl}`
    });
  }
  return next();
});

// Phục vụ tĩnh các trang frontend khi chạy cục bộ (trên Vercel do CDN phục vụ trực tiếp)
if (!process.env.VERCEL) {
  app.use(express.static(FRONTEND_ROOT, { extensions: ['html'] }));
}

/** Xử lý route không tồn tại */
app.use((req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Không tìm thấy đường dẫn ${req.method} ${req.originalUrl}`
  });
});

/** Bộ xử lý lỗi tập trung — không làm sập tiến trình và không lộ stack trace */
app.use((err, req, res, _next) => {
  const statusCode = (err && Number.isInteger(err.statusCode)) ? err.statusCode : 500;
  res.status(statusCode).json({
    error: (err && err.code) || 'INTERNAL_ERROR',
    message: (err && err.message) || 'Đã xảy ra lỗi xử lý trên máy chủ.'
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`ConfGuide backend đang chạy tại http://localhost:${PORT}`);
    if (allowedOrigins.length === 0) {
      console.warn('Cảnh báo: Chưa cấu hình FRONTEND_ORIGIN trong .env, mọi yêu cầu CORS từ trình duyệt sẽ bị chặn.');
    } else {
      console.log(`CORS cho phép FRONTEND_ORIGIN: ${allowedOrigins.join(', ')}`);
    }
  });
}

module.exports = app;
