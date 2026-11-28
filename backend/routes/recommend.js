/**
 * Route gợi ý hội nghị theo abstract bài báo bằng AI (backend/routes/recommend.js)
 * Chỉ kiểm tra dữ liệu đầu vào và trả kết quả; logic gọi mô hình nằm ở services/conferenceRecommender.js.
 */

'use strict';

const express = require('express');
const { recommendConferences } = require('../services/conferenceRecommender');
const { createRateLimiter } = require('../utils/rateLimit');
const { asyncHandler } = require('../utils/errorHandler');

const router = express.Router();

const MIN_ABSTRACT_CHARS = 80;
const MAX_ABSTRACT_CHARS = 5000;

// Model miễn phí có hạn mức thấp nên giới hạn chặt hơn mức chung của /api
router.use(createRateLimiter({ windowMs: 60 * 1000, maxRequests: 5, message: 'Bạn gửi abstract quá nhanh. Vui lòng đợi khoảng 1 phút rồi thử lại.' }));

/**
 * POST /api/recommend
 * Body: { abstract: string } -> danh sách hội nghị phù hợp kèm lý do.
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const abstract = typeof (req.body && req.body.abstract) === 'string' ? req.body.abstract.replace(/\s+/g, ' ').trim() : '';
    if (abstract.length < MIN_ABSTRACT_CHARS) {
      return res.status(400).json({ error: 'ABSTRACT_TOO_SHORT', message: `Abstract cần tối thiểu ${MIN_ABSTRACT_CHARS} ký tự để AI phân tích chính xác.` });
    }
    if (abstract.length > MAX_ABSTRACT_CHARS) {
      return res.status(400).json({ error: 'ABSTRACT_TOO_LONG', message: `Abstract tối đa ${MAX_ABSTRACT_CHARS} ký tự.` });
    }
    const result = await recommendConferences(abstract);
    return res.json({ ok: true, ...result });
  })
);

module.exports = router;
