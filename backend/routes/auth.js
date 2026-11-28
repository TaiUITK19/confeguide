/**
 * Route xác thực Google Sign-In (backend/routes/auth.js)
 * - POST /auth/google: Xác thực Google ID Token (`credential`) bằng OAuth2Client.verifyIdToken,
 *   chỉ trích xuất và trả về `{ name, email, picture }`.
 * - GET /api/auth/config: Cung cấp GOOGLE_CLIENT_ID công khai cho frontend khởi tạo nút Google Sign-In.
 */

'use strict';

const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const config = require('../config/env');
const { asyncHandler } = require('../utils/errorHandler');

const router = express.Router();
const MAX_CREDENTIAL_LENGTH = 8192;

let cachedOAuthClientId = '';
let cachedOAuthClient = null;

/**
 * Tái sử dụng một instance OAuth2Client theo `googleClientId` đã cấu hình.
 * @param {string} clientId - Google OAuth Client ID.
 * @returns {OAuth2Client} Instance OAuth2Client.
 */
function getOAuthClient(clientId) {
  if (!cachedOAuthClient || cachedOAuthClientId !== clientId) {
    cachedOAuthClient = new OAuth2Client(clientId);
    cachedOAuthClientId = clientId;
  }
  return cachedOAuthClient;
}

/**
 * GET /api/auth/config
 * Trả về GOOGLE_CLIENT_ID công khai đã cấu hình sẵn trên server.
 */
router.get('/api/auth/config', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    ok: true,
    googleClientId: config.googleClientId,
    configured: Boolean(config.googleClientId)
  });
});

/**
 * POST /auth/google
 * Body: { credential: string }
 * Trả về: { name, email, picture }
 */
router.post(
  '/auth/google',
  asyncHandler(async (req, res) => {
    const googleClientId = config.googleClientId;
    if (!googleClientId) {
      return res.status(500).json({
        error: 'GOOGLE_CLIENT_ID_MISSING',
        message: 'Backend chưa cấu hình GOOGLE_CLIENT_ID trong tệp .env.'
      });
    }

    const credential = req.body && typeof req.body.credential === 'string'
      ? req.body.credential.trim()
      : '';
    if (!credential || credential.length > MAX_CREDENTIAL_LENGTH) {
      return res.status(400).json({
        error: 'MISSING_CREDENTIAL',
        message: 'Thiếu trường credential (Google ID token) hợp lệ trong phần thân yêu cầu.'
      });
    }

    try {
      const oauthClient = getOAuthClient(googleClientId);
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
    } catch {
      return res.status(401).json({
        error: 'INVALID_GOOGLE_TOKEN',
        message: 'Xác thực Google ID token thất bại hoặc token đã hết hạn.'
      });
    }
  })
);

module.exports = router;
