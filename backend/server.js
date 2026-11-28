/**
 * Điểm khởi chạy Backend ConfGuide (backend/server.js)
 * Chỉ khởi tạo Express app, middleware (CORS, JSON limit, rate limit), gắn route và listen.
 */

'use strict';

const express = require('express');
const cors = require('cors');

const config = require('./config/env');
const authRouter = require('./routes/auth');
const scholarRouter = require('./routes/scholar');
const fieldsRouter = require('./routes/fields');
const recommendRouter = require('./routes/recommend');
const chatRouter = require('./routes/chat');
const { createRateLimiter } = require('./utils/rateLimit');
const { AppError, notFoundHandler, errorHandler } = require('./utils/errorHandler');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

/**
 * Trích xuất host thực tế của request (hỗ trợ proxy Vercel `x-forwarded-host`) để cho phép cùng origin.
 * @param {import('express').Request} req
 * @returns {string} Host chữ thường.
 */
function getRequestHost(req) {
  const rawHost = config.isVercel
    ? (req.headers['x-forwarded-host'] || req.headers.host || '')
    : (req.headers.host || '');
  return String(rawHost)
    .split(',')[0]
    .trim()
    .toLowerCase();
}

/**
 * Tạo middleware CORS cho phép `FRONTEND_ORIGIN`, cùng host (localhost:3000 / Vercel) và CLI không gửi `Origin`.
 */
function buildCorsMiddleware() {
  return cors((req, callback) => {
    const origin = req.headers.origin;
    if (!origin) {
      return callback(null, { origin: true });
    }

    const normalizedOrigin = origin.replace(/\/+$/, '');
    const corsOptions = {
      origin: true,
      methods: ['GET', 'PUT', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Accept']
    };

    if (config.allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, corsOptions);
    }

    try {
      const originHost = new URL(normalizedOrigin).host.toLowerCase();
      const reqHost = getRequestHost(req);
      if (reqHost && originHost === reqHost) {
        return callback(null, corsOptions);
      }
    } catch {
      // Origin không hợp lệ sẽ bị từ chối bên dưới
    }

    return callback(
      new AppError('Origin không nằm trong danh sách FRONTEND_ORIGIN được phép.', {
        statusCode: 403,
        code: 'CORS_ORIGIN_FORBIDDEN'
      })
    );
  });
}

/**
 * Chặn truy cập trực tiếp vào mã nguồn backend, thư mục phụ thuộc và tệp cấu hình qua static server.
 */
function blockInternalPaths(req, res, next) {
  let reqPath = '';
  try {
    reqPath = decodeURIComponent(req.path || '').toLowerCase();
  } catch {
    return notFoundHandler(req, res);
  }

  const isBlocked = reqPath === '/backend'
    || reqPath.startsWith('/backend/')
    || reqPath === '/api'
    || reqPath.startsWith('/api/')
    || reqPath === '/node_modules'
    || reqPath.startsWith('/node_modules/')
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
    return notFoundHandler(req, res);
  }
  return next();
}

app.use(buildCorsMiddleware());
app.use(express.json({ limit: '64kb' }));

// Giới hạn tần suất cho API và xác thực Google
app.use('/api', createRateLimiter({ windowMs: 60 * 1000, maxRequests: 60 }));
app.use('/auth', createRateLimiter({ windowMs: 60 * 1000, maxRequests: 30 }));

/** Endpoint kiểm tra trạng thái sống của backend */
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'confguide-backend',
    allowedOrigins: config.allowedOrigins
  });
});

app.use('/', authRouter);
app.use('/api/scholar', scholarRouter);
app.use('/api/fields', fieldsRouter);
app.use('/api/recommend', recommendRouter);
app.use('/api/chat', chatRouter);

app.use(blockInternalPaths);

// Phục vụ tĩnh các trang frontend khi chạy cục bộ (trên Vercel do CDN phục vụ trực tiếp)
if (!config.isVercel) {
  app.use(express.static(config.frontendRoot, { extensions: ['html'] }));
}

app.use(notFoundHandler);
app.use(errorHandler);

if (require.main === module) {
  const startupWarnings = config.validateStartupConfig();
  for (const warning of startupWarnings) {
    console.warn(`[Cảnh báo cấu hình] ${warning}`);
  }

  app.listen(config.port, () => {
    console.log(`ConfGuide backend đang chạy tại http://localhost:${config.port}`);
    if (config.allowedOrigins.length > 0) {
      console.log(`CORS cho phép FRONTEND_ORIGIN: ${config.allowedOrigins.join(', ')}`);
    }
  });
}

module.exports = app;
