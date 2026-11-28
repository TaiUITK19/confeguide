/**
 * Gợi ý hội nghị phù hợp từ abstract bài báo bằng AI (backend/services/conferenceRecommender.js)
 * Chỉ dùng danh sách hội nghị có sẵn trong data/conference_data.json; mô hình chỉ được chọn theo chỉ số trong danh mục.
 */

'use strict';

const { requestJsonCompletion } = require('./aiClient');
const { CONFERENCES, getTodayVnIso, formatRank, buildCatalogText } = require('./conferenceCatalog');

const MAX_RECOMMENDATIONS = 5;
const MAX_REASON_CHARS = 400;

/**
 * Tạo bộ tin nhắn gửi mô hình: chỉ dẫn hệ thống + danh mục + abstract người dùng.
 * @param {string} abstract - Abstract bài báo.
 * @returns {Array<{role: string, content: string}>} Danh sách tin nhắn.
 */
function buildMessages(abstract) {
  const todayIso = getTodayVnIso();
  const system = [
    'You are an academic advisor who matches a research paper abstract to suitable conferences.',
    'You may ONLY choose conferences from the numbered catalog provided by the user. Never invent conferences.',
    'The score (0-100) measures ONLY how well the paper topic and method match the conference scope described in its summary and topics. A general computing conference is a weaker fit than one whose scope names the paper area.',
    'Use the submission deadline only to break ties between similar scores; say in the reason when the deadline is closed or unknown.',
    'Describe a conference rank only from its "rank" field; never call a conference top-tier or prestigious unless the rank field says CORE A* or A.',
    'Write Vietnamese with correct academic terms (e.g. computer vision = thị giác máy tính, machine learning = học máy).',
    `Return at most ${MAX_RECOMMENDATIONS} conferences. If nothing fits reasonably, return an empty list.`,
    'Reply with JSON only, no markdown, using exactly this shape:',
    '{"research_area": "<1 short sentence in Vietnamese describing the paper field>", "keywords": ["<3-6 English keywords>"], "recommendations": [{"index": <catalog number>, "score": <0-100 fit score>, "reason": "<1-2 sentences in Vietnamese explaining the fit>"}]}'
  ].join('\n');
  const user = `Today is ${todayIso}.\n\nCONFERENCE CATALOG:\n${buildCatalogText(todayIso)}\n\nPAPER ABSTRACT:\n"""\n${abstract}\n"""`;
  return [{ role: 'system', content: system }, { role: 'user', content: user }];
}

/**
 * Kiểm tra và chuẩn hóa kết quả mô hình: chỉ giữ chỉ số hợp lệ, bỏ trùng, giới hạn số lượng.
 * @param {Object} parsed - JSON đã tách.
 * @returns {{ researchArea: string, keywords: string[], recommendations: Array<Object> }}
 */
function normalizeResult(parsed) {
  const seen = new Set();
  const list = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
  const recommendations = [];
  for (const item of list) {
    const index = Number(item && item.index);
    if (!Number.isInteger(index) || index < 0 || index >= CONFERENCES.length || seen.has(index)) continue;
    seen.add(index);
    const conf = CONFERENCES[index];
    const score = Math.max(0, Math.min(100, Math.round(Number(item.score) || 0)));
    recommendations.push({ name: conf.name, fullName: conf.full_name || '', rank: formatRank(conf), score, reason: String(item.reason || '').trim().slice(0, MAX_REASON_CHARS) });
    if (recommendations.length >= MAX_RECOMMENDATIONS) break;
  }
  recommendations.sort((a, b) => b.score - a.score);
  const keywords = Array.isArray(parsed.keywords) ? parsed.keywords.map(k => String(k).trim()).filter(Boolean).slice(0, 6) : [];
  return { researchArea: String(parsed.research_area || '').trim().slice(0, 300), keywords, recommendations };
}

/**
 * Gợi ý hội nghị cho abstract.
 * @param {string} abstract - Abstract bài báo đã kiểm tra độ dài.
 * @returns {Promise<{ model: string, researchArea: string, keywords: string[], recommendations: Array<Object> }>}
 */
async function recommendConferences(abstract) {
  const { model, data } = await requestJsonCompletion(buildMessages(abstract));
  return { model, ...normalizeResult(data) };
}

module.exports = { recommendConferences, buildMessages, normalizeResult };
