/**
 * Danh mục hội nghị dùng chung cho các tính năng AI (backend/services/conferenceCatalog.js)
 * Đọc frontend/data/conference_data.json một lần và dựng bản tóm tắt dạng văn bản có chỉ số để đưa vào prompt.
 */

'use strict';

const CONFERENCES = require('../../frontend/data/conference_data.json');

const SHORT_SUMMARY_CHARS = 420;
const DETAILED_SUMMARY_CHARS = 300;

/**
 * Lấy ngày hôm nay dạng YYYY-MM-DD theo giờ Việt Nam (UTC+7).
 * @returns {string} Ngày ISO.
 */
function getTodayVnIso() {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * Tìm hạn nộp bài gần nhất còn hiệu lực của một hội nghị (bỏ qua mốc thông báo / camera-ready).
 * @param {Object} conf - Bản ghi hội nghị thô.
 * @param {string} todayIso - Ngày hôm nay.
 * @returns {string} Ngày hạn nộp hoặc chuỗi rỗng nếu đã hết hạn / không có.
 */
function findNextSubmissionDeadline(conf, todayIso) {
  const deadlines = Array.isArray(conf.deadlines) ? conf.deadlines : [];
  const upcoming = deadlines
    .filter(d => d && typeof d.date === 'string' && /submission|paper|abstract/i.test(d.name || '') && !/camera|notification/i.test(d.name || ''))
    .map(d => d.date.slice(0, 10))
    .filter(date => date >= todayIso)
    .sort();
  return upcoming[0] || '';
}

/**
 * Định dạng phân hạng CORE / CCF thành chuỗi ngắn.
 * @param {Object} conf - Bản ghi hội nghị thô.
 * @returns {string} VD: "CORE A*, CCF A" hoặc "unranked".
 */
function formatRank(conf) {
  const rank = conf.rank || {};
  const parts = [];
  if (rank.core) parts.push(`CORE ${rank.core}`);
  if (rank.ccf) parts.push(`CCF ${rank.ccf}`);
  return parts.length ? parts.join(', ') : 'unranked';
}

/**
 * Định dạng khoảng lệ phí đăng ký.
 * @param {Object} conf - Bản ghi hội nghị thô.
 * @returns {string} VD: "250-650 USD" hoặc "unknown".
 */
function formatFee(conf) {
  if (!Number.isFinite(conf.fee_min) && !Number.isFinite(conf.fee_max)) return 'unknown';
  const min = Number.isFinite(conf.fee_min) ? conf.fee_min : conf.fee_max;
  const max = Number.isFinite(conf.fee_max) ? conf.fee_max : conf.fee_min;
  return `${min === max ? min : `${min}-${max}`} ${conf.fee_currency || ''}`.trim();
}

/**
 * Tạo danh mục hội nghị rút gọn (mỗi dòng một hội nghị, có chỉ số) để đưa vào prompt.
 * @param {string} todayIso - Ngày hôm nay.
 * @param {{ detailed?: boolean }} [options] - `detailed` thêm địa điểm, thời gian, hình thức, lệ phí và toàn bộ mốc hạn.
 * @returns {string} Danh mục dạng văn bản.
 */
function buildCatalogText(todayIso, options = {}) {
  const detailed = Boolean(options.detailed);
  return CONFERENCES.map((conf, index) => {
    const summaryLimit = detailed ? DETAILED_SUMMARY_CHARS : SHORT_SUMMARY_CHARS;
    const summary = String(conf.summarization || '').replace(/\s+/g, ' ').trim().slice(0, summaryLimit);
    const nextDeadline = findNextSubmissionDeadline(conf, todayIso);
    const topics = Array.isArray(conf.topics) ? conf.topics.join(', ') : '';
    const fields = [`[${index}] ${conf.name}`, conf.full_name || '', `rank: ${formatRank(conf)}`, `topics: ${topics}`, `region: ${conf.region || conf.country || ''}`, `next submission deadline: ${nextDeadline || 'closed/unknown'}`];
    if (detailed) {
      const deadlines = (Array.isArray(conf.deadlines) ? conf.deadlines : []).filter(d => d && d.date).map(d => `${d.name} ${String(d.date).slice(0, 10)}`).join('; ');
      fields.push(`location: ${conf.location || conf.country || 'unknown'}`, `dates: ${conf.start_date || '?'} to ${conf.end_date || '?'}`, `mode: ${conf.attendance_mode || 'unknown'}`, `fee: ${formatFee(conf)}`, `all deadlines: ${deadlines || 'unknown'}`);
    }
    fields.push(`summary: ${summary}`);
    return fields.join(' | ');
  }).join('\n');
}

module.exports = { CONFERENCES, getTodayVnIso, findNextSubmissionDeadline, formatRank, buildCatalogText };
