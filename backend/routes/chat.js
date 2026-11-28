/**
 * Route chatbox hỏi đáp AI về website và hội nghị (backend/routes/chat.js)
 * Chỉ kiểm tra lịch sử hội thoại gửi lên và trả kết quả; logic gọi mô hình nằm ở services/chatAssistant.js.
 */

'use strict';

const express = require('express');
const { answerChat } = require('../services/chatAssistant');
const { createRateLimiter } = require('../utils/rateLimit');
const { asyncHandler } = require('../utils/errorHandler');

const router = express.Router();

const MAX_HISTORY_MESSAGES = 10;
const MAX_MESSAGE_CHARS = 5000;
const MAX_HISTORY_CHARS = 16000;

// Model miễn phí có hạn mức thấp nên giới hạn chặt hơn mức chung của /api
router.use(createRateLimiter({ windowMs: 60 * 1000, maxRequests: 10, message: 'Bạn hỏi hơi nhanh rồi. Vui lòng đợi khoảng 1 phút rồi hỏi tiếp nhé.' }));

/**
 * Làm sạch lịch sử hội thoại: chỉ nhận role user/assistant, cắt độ dài, giữ tối đa 10 tin gần nhất.
 * @param {*} rawMessages - Giá trị `messages` từ request body.
 * @returns {Array<{role: string, content: string}>} Lịch sử hợp lệ (có thể rỗng).
 */
function sanitizeHistory(rawMessages) {
  if (!Array.isArray(rawMessages)) return [];
  const cleaned = rawMessages
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content.trim().slice(0, MAX_MESSAGE_CHARS) }))
    .filter(m => m.content)
    .slice(-MAX_HISTORY_MESSAGES);
  // Bỏ bớt tin cũ nhất khi tổng độ dài vượt ngưỡng
  while (cleaned.length > 1 && cleaned.reduce((sum, m) => sum + m.content.length, 0) > MAX_HISTORY_CHARS) cleaned.shift();
  while (cleaned.length && cleaned[0].role !== 'user') cleaned.shift();
  return cleaned;
}

/**
 * POST /api/chat
 * Body: { messages: [{ role: 'user'|'assistant', content: string }] } -> { reply, conferences, filters }.
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const history = sanitizeHistory(req.body && req.body.messages);
    if (!history.length || history[history.length - 1].role !== 'user') {
      return res.status(400).json({ error: 'INVALID_MESSAGES', message: 'Cần gửi ít nhất một câu hỏi của người dùng.' });
    }
    const result = await answerChat(history);
    return res.json({ ok: true, ...result });
  })
);

module.exports = router;
