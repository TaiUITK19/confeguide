/**
 * Trợ lý hỏi đáp ConfGuide bằng AI (backend/services/chatAssistant.js)
 * Trả lời câu hỏi về website và các hội nghị trong data/conference_data.json, có thể đề xuất bộ lọc cho trang Tra cứu.
 */

'use strict';

const { requestJsonCompletion } = require('./aiClient');
const { CONFERENCES, getTodayVnIso, buildCatalogText } = require('./conferenceCatalog');

const MAX_REPLY_CHARS = 2500;
const MAX_LINKED_CONFERENCES = 6;
const FILTER_VALUES = {
  topics: ['ai', 'data', 'vision', 'nlp', 'security', 'network', 'software', 'cloud', 'robotics', 'hci', 'theory', 'infosys', 'electronics', 'health'],
  ranks: ['A*', 'A', 'B', 'C'],
  scopes: ['vietnam', 'international'],
  modes: ['online', 'offline', 'hybrid']
};

/** Kiến thức về website ConfGuide (tóm tắt từ README, data/about.json và các trang HTML) */
const SITE_GUIDE = `ConfGuide is a web platform (student project for course IE104, University of Information Technology - VNU-HCM, group 8) to discover, search, get recommendations and track submission deadlines of Computer Science / IT conferences in Vietnam and worldwide. All deadlines are converted from AoE (UTC-12) or local time to Vietnam time (UTC+7).
Pages:
- Trang chủ (index.html): introduction, featured and upcoming conferences, personalised suggestions by research field after login.
- Tra cứu (search.html): instant search with spelling suggestions; 7 filter groups (submission status, research field, scope Vietnam/International, location, event time, attendance mode online/offline/hybrid, CORE rank A*/A/B/C); 10 sort options; pagination; filters are kept in the URL. This chat assistant lives on this page and can apply filters to the list.
- Chi tiết hội nghị (detail.html?id=...): horizontal timeline of all deadlines in UTC+7, live countdown, academic info (rank, topics, fees, location, website), export to Google Calendar or .ics file, save/track button.
- Theo dõi (tracker.html): list of saved conferences with nearest deadlines and submission progress; compare up to 3 conferences side by side.
- Hồ sơ (profile.html): choose research fields (can import from Google Scholar / ORCID / Semantic Scholar profile), change avatar, monthly calendar of deadlines and event dates of saved conferences.
- Đăng nhập / Đăng ký (login.html, register.html): email + password account or Google Sign-In; saving and tracking conferences requires login.
- Về chúng tôi (about.html): mission, data sources, team. Liên hệ (contact.html): contact form and contributing conference data, email contact@confguide.vn.
Other features: light/dark mode toggle, responsive layout for mobile. Rankings shown are CORE (A*, A, B, C) and CCF; conference data is collected from official conference websites and updated periodically.
How to: save a conference = open its detail page and press the save/track (bookmark) button while logged in; compare = select conferences on Theo dõi page; add to calendar = button on detail page.`;

/**
 * Tạo chỉ dẫn hệ thống gồm vai trò, kiến thức website, danh mục hội nghị và định dạng JSON trả về.
 * @returns {string} Nội dung system prompt.
 */
function buildSystemPrompt() {
  const todayIso = getTodayVnIso();
  return [
    'You are "Trợ lý ConfGuide", a friendly assistant inside the ConfGuide website. Always answer in Vietnamese (use correct academic terms), concise (normally under 150 words), helpful and polite.',
    'Answer questions about: (1) the ConfGuide website and how to use it, (2) the conferences in the catalog below (deadlines, rank, location, dates, fees, topics, comparisons), (3) general advice on choosing a conference or preparing a submission.',
    'For any fact about a conference use ONLY the catalog. If the information is missing, say ConfGuide has no data and suggest opening the conference detail page or its official website. Never invent conferences, dates, ranks or fees.',
    'If the question is unrelated to research, conferences or the website, politely say you only support those topics.',
    'If the user wants to find or list conferences matching criteria, also return "filters" so the website can filter its list. Allowed values: ' + JSON.stringify(FILTER_VALUES) + '. Rank filter "B trở lên" = ["A*","A","B"]. Leave "filters" null when not searching.',
    'Put the catalog numbers of conferences you mention (most relevant first, max 6) in "conferences" so the website can link them.',
    'If the user pastes a paper abstract, suggest the best matching conferences from the catalog and explain why.',
    'Formatting inside "reply": plain text, you may use **bold** and lines starting with "- " for bullet lists. No tables, no headings, no links.',
    `Today is ${todayIso} (Vietnam time). "Còn hạn nộp" means the next submission deadline is on or after today.`,
    'Reply with JSON only, exactly this shape: {"reply": "<answer>", "conferences": [<catalog numbers>], "filters": null or {"topics": [], "ranks": [], "scopes": [], "modes": []}}',
    '',
    'WEBSITE GUIDE:',
    SITE_GUIDE,
    '',
    'CONFERENCE CATALOG:',
    buildCatalogText(todayIso, { detailed: true })
  ].join('\n');
}

/**
 * Lọc một mảng giá trị theo danh sách cho phép (bỏ trùng).
 * @param {*} values - Giá trị thô từ mô hình.
 * @param {string[]} allowed - Danh sách hợp lệ.
 * @returns {string[]} Giá trị hợp lệ.
 */
function pickAllowed(values, allowed) {
  return Array.isArray(values) ? [...new Set(values.map(v => String(v).trim()).filter(v => allowed.includes(v)))] : [];
}

/**
 * Chuẩn hóa kết quả mô hình: cắt độ dài câu trả lời, giữ chỉ số hội nghị hợp lệ và bộ lọc hợp lệ.
 * @param {Object} parsed - JSON mô hình trả về.
 * @returns {{ reply: string, conferences: Array<{name: string}>, filters: Object|null }}
 */
function normalizeChatResult(parsed) {
  const reply = String(parsed.reply || '').trim().slice(0, MAX_REPLY_CHARS);
  const indices = Array.isArray(parsed.conferences) ? parsed.conferences.map(Number) : [];
  const conferences = [...new Set(indices.filter(i => Number.isInteger(i) && i >= 0 && i < CONFERENCES.length))].slice(0, MAX_LINKED_CONFERENCES).map(i => ({ name: CONFERENCES[i].name }));
  let filters = null;
  if (parsed.filters && typeof parsed.filters === 'object') {
    const picked = { topics: pickAllowed(parsed.filters.topics, FILTER_VALUES.topics), ranks: pickAllowed(parsed.filters.ranks, FILTER_VALUES.ranks), scopes: pickAllowed(parsed.filters.scopes, FILTER_VALUES.scopes).slice(0, 1), modes: pickAllowed(parsed.filters.modes, FILTER_VALUES.modes) };
    if (Object.values(picked).some(list => list.length)) filters = picked;
  }
  return { reply: reply || 'Xin lỗi, mình chưa trả lời được câu này. Bạn thử hỏi lại theo cách khác nhé.', conferences, filters };
}

/**
 * Trả lời tin nhắn mới nhất dựa trên lịch sử hội thoại.
 * @param {Array<{role: 'user'|'assistant', content: string}>} history - Lịch sử đã kiểm tra, tin cuối là của người dùng.
 * @returns {Promise<{ model: string, reply: string, conferences: Array<{name: string}>, filters: Object|null }>}
 */
async function answerChat(history) {
  const messages = [{ role: 'system', content: buildSystemPrompt() }, ...history];
  const { model, data } = await requestJsonCompletion(messages, { maxTokens: 2000, temperature: 0.3 });
  return { model, ...normalizeChatResult(data) };
}

module.exports = { answerChat, buildSystemPrompt, normalizeChatResult };
