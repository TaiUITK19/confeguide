/**
 * Route xác thực Google Sign-In (backend/routes/auth.js)
 * - POST /auth/google: Xác thực Google ID Token (`credential`) bằng OAuth2Client.verifyIdToken,
 *   chỉ trích xuất và trả về `{ name, email, picture }`. Không yêu cầu hay đọc Gmail.
 * - GET /api/auth/config: Cung cấp GOOGLE_CLIENT_ID công khai cho frontend khởi tạo nút Google Sign-In.
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const express = require('express');
const { OAuth2Client } = require('google-auth-library');

const router = express.Router();
const LOCAL_ENV_PATH = path.resolve(__dirname, '../.env');

/**
 * Làm sạch chuỗi Google Client ID (bỏ khoảng trắng và dấu ngoặc kép thừa khi dán vào .env/Vercel).
 * @param {*} rawValue - Giá trị thô từ biến môi trường.
 * @returns {string} Client ID sạch hoặc chuỗi rỗng.
 */
function sanitizeGoogleClientId(rawValue) {
  const cleaned = String(rawValue || '')
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .trim();
  if (!cleaned || cleaned.startsWith('your-google-client-id')) return '';
  return cleaned;
}

/**
 * Lấy Google Client ID hợp lệ từ biến môi trường; nếu chạy cục bộ và .env vừa được cập nhật,
 * đọc bổ sung từ backend/.env mà không cần buộc khởi động lại tiến trình Node.
 * @returns {string} Client ID hoặc chuỗi rỗng nếu chưa cấu hình.
 */
function getConfiguredGoogleClientId() {
  const fromEnv = sanitizeGoogleClientId(process.env.GOOGLE_CLIENT_ID);
  if (fromEnv) return fromEnv;

  if (!process.env.VERCEL) {
    try {
      if (fs.existsSync(LOCAL_ENV_PATH)) {
        const parsed = dotenv.parse(fs.readFileSync(LOCAL_ENV_PATH, 'utf8'));
        const fromFile = sanitizeGoogleClientId(parsed && parsed.GOOGLE_CLIENT_ID);
        if (fromFile) {
          process.env.GOOGLE_CLIENT_ID = fromFile;
          return fromFile;
        }
      }
    } catch {
      // Bỏ qua lỗi đọc tệp .env cục bộ
    }
  }
  return '';
}

/**
 * Endpoint phụ trợ cho frontend đọc GOOGLE_CLIENT_ID đã cấu hình trên backend.
 */
router.get('/api/auth/config', (req, res) => {
  res.set('Cache-Control', 'no-store');
  const googleClientId = getConfiguredGoogleClientId();
  res.json({
    ok: true,
    googleClientId,
    configured: Boolean(googleClientId)
  });
});

/**
 * POST /auth/google
 * Body: { credential: string }
 * Trả về: { name, email, picture }
 */
router.post('/auth/google', async (req, res) => {
  const googleClientId = getConfiguredGoogleClientId();
  if (!googleClientId) {
    return res.status(500).json({
      error: 'GOOGLE_CLIENT_ID_MISSING',
      message: 'Backend chưa cấu hình GOOGLE_CLIENT_ID trong tệp .env.'
    });
  }

  const credential = req.body && typeof req.body.credential === 'string'
    ? req.body.credential.trim()
    : '';
  if (!credential) {
    return res.status(400).json({
      error: 'MISSING_CREDENTIAL',
      message: 'Thiếu trường credential (Google ID token) trong phần thân yêu cầu.'
    });
  }

  try {
    const oauthClient = new OAuth2Client(googleClientId);
    const ticket = await oauthClient.verifyIdToken({
      idToken: credential,
      audience: googleClientId
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      return res.status(401).json({
        error: 'INVALID_GOOGLE_TOKEN',
        message: 'Token Google hợp lệ nhưng không chứa thông tin email.'
      });
    }

    if (payload.email_verified === false) {
      return res.status(401).json({
        error: 'EMAIL_NOT_VERIFIED',
        message: 'Email Google chưa được xác minh.'
      });
    }

    return res.json({
      name: String(payload.name || payload.given_name || payload.email.split('@')[0]).trim(),
      email: String(payload.email).trim().toLowerCase(),
      picture: String(payload.picture || '').trim()
    });
  } catch (err) {
    return res.status(401).json({
      error: 'INVALID_GOOGLE_TOKEN',
      message: 'Xác thực Google ID token thất bại hoặc token đã hết hạn.'
    });
  }
});

module.exports = router;
