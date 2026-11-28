/**
 * Dịch vụ lưu trữ và chuẩn hóa lĩnh vực nghiên cứu theo email (backend/services/fieldsStore.js)
 * Dùng chung jsonStore bất đồng bộ (cache RAM + hàng đợi ghi tuần tự + ghi nguyên tử file tạm).
 */

'use strict';

const path = require('node:path');
const config = require('../config/env');
const { createJsonFileStore } = require('../utils/jsonStore');
const {
  VALID_FIELD_KEYS,
  FIELD_LABEL_BY_KEY,
  resolveSystemField
} = require('./fieldMap');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FIELDS_PER_USER = 50;

const ALLOWED_FIELD_SOURCES = new Set([
  'serpapi',
  'orcid',
  'semantic_scholar',
  'confguide_saved',
  'manual',
  'custom',
  'scholar'
]);

/**
 * Chuẩn hóa email làm khóa lưu trữ an toàn (chống prototype pollution).
 * @param {*} rawEmail - Email đầu vào.
 * @returns {string} Email chữ thường đã trim hoặc chuỗi rỗng nếu không hợp lệ.
 */
function normalizeEmailKey(rawEmail) {
  const clean = String(rawEmail || '').trim().toLowerCase();
  if (!clean || clean.length > 254 || !EMAIL_REGEX.test(clean)) return '';
  if (clean === '__proto__' || clean === 'constructor' || clean === 'prototype') return '';
  return clean;
}

/**
 * Chuyển map dữ liệu thô thành đối tượng null-prototype an toàn theo từng email.
 * @param {*} rawData - Dữ liệu đọc từ JSON.
 * @returns {Object} Map chuẩn hóa.
 */
function sanitizeLoadedStore(rawData) {
  const safeMap = Object.create(null);
  if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
    return safeMap;
  }
  for (const [key, value] of Object.entries(rawData)) {
    const emailKey = normalizeEmailKey(key);
    if (emailKey && value && typeof value === 'object') {
      safeMap[emailKey] = value;
    }
  }
  return safeMap;
}

const fieldsJsonStore = createJsonFileStore({
  localFilePath: path.join(config.backendDataDir, 'fields.json'),
  vercelTempFileName: 'confguide-fields.json',
  isVercel: config.isVercel,
  createInitialValue: () => ({}),
  sanitizeLoaded: sanitizeLoadedStore
});

/**
 * Tải toàn bộ map dữ liệu lĩnh vực từ cache RAM hoặc `fields.json`.
 * @returns {Promise<Object>} Đối tượng null-prototype theo email.
 */
async function loadFieldsStore() {
  return fieldsJsonStore.load();
}

/**
 * Thực thi thao tác đọc-sửa-ghi tuần tự theo hàng đợi để tránh mất cập nhật khi có nhiều PUT đồng thời.
 * @param {(store: Object) => Promise<{ nextValue?: Object, returnValue?: *, skipSave?: boolean, value?: * }>|{ nextValue?: Object, returnValue?: *, skipSave?: boolean, value?: * }} mutatorFn
 * @returns {Promise<*>}
 */
function mutateFieldsStore(mutatorFn) {
  return fieldsJsonStore.update(mutatorFn, {
    toSerializable: map => {
      const plainObj = {};
      for (const key of Object.keys(map)) {
        plainObj[key] = map[key];
      }
      return plainObj;
    }
  });
}

/**
 * Chuẩn hóa một mục lĩnh vực để tương thích 1:1 với `researchDomains` ở frontend.
 * @param {string|Object} rawItem - Dữ liệu lĩnh vực thô.
 * @param {number} [idx=0] - Chỉ số dự phòng tạo ID.
 * @returns {Object|null} Bản ghi chuẩn hóa hoặc null nếu không hợp lệ.
 */
function normalizeFieldEntry(rawItem, idx = 0) {
  if (!rawItem) return null;

  if (typeof rawItem === 'string') {
    const resolved = resolveSystemField(rawItem);
    if (!resolved) return null;
    return {
      id: `dom_${resolved.key}_${idx}`,
      key: resolved.key,
      label: resolved.label,
      priority: 'normal',
      source: 'manual',
      originalInterest: '',
      updatedAt: new Date().toISOString()
    };
  }

  if (typeof rawItem !== 'object') return null;

  let key = String(rawItem.key || '').trim();
  if (!VALID_FIELD_KEYS.has(key)) {
    const resolved = resolveSystemField(rawItem.key || rawItem.label || '');
    key = resolved ? resolved.key : '';
  }
  if (!key || !VALID_FIELD_KEYS.has(key)) return null;

  const rawLabel = String(rawItem.label || '').trim().slice(0, 120);
  const label = rawLabel || FIELD_LABEL_BY_KEY[key] || key;
  const priority = rawItem.priority === 'primary' ? 'primary' : 'normal';
  const rawSource = String(rawItem.source || '').trim().toLowerCase();
  const source = ALLOWED_FIELD_SOURCES.has(rawSource) ? rawSource : 'manual';
  const safeId = String(rawItem.id || `dom_${key}_${Date.now()}_${idx}`).trim().slice(0, 100)
    || `dom_${key}_${Date.now()}_${idx}`;

  return {
    id: safeId,
    key,
    label,
    priority,
    source,
    originalInterest: String(rawItem.originalInterest || '').trim().slice(0, 200),
    updatedAt: typeof rawItem.updatedAt === 'string' && rawItem.updatedAt
      ? rawItem.updatedAt.slice(0, 64)
      : new Date().toISOString()
  };
}

/**
 * Chuẩn hóa, khử trùng và sắp xếp danh sách lĩnh vực (ưu tiên chính lên trước).
 * @param {Array<string|Object>} rawList - Danh sách thô.
 * @returns {Array<Object>} Danh sách đã chuẩn hóa (tối đa MAX_FIELDS_PER_USER).
 */
function normalizeFieldsList(rawList) {
  const list = Array.isArray(rawList) ? rawList : [];
  const cleanList = [];
  const seenPairs = new Set();
  const seenIds = new Set();

  list.forEach((item, idx) => {
    if (cleanList.length >= MAX_FIELDS_PER_USER) return;
    const normalized = normalizeFieldEntry(item, idx);
    if (!normalized) return;

    const pairKey = `${normalized.key}::${normalized.label.toLowerCase()}`;
    if (seenPairs.has(pairKey)) return;
    seenPairs.add(pairKey);

    let safeId = normalized.id;
    while (seenIds.has(safeId)) {
      safeId = `${normalized.id}_${idx}`.slice(0, 100);
    }
    seenIds.add(safeId);
    cleanList.push({ ...normalized, id: safeId });
  });

  cleanList.sort((a, b) => Number(b.priority === 'primary') - Number(a.priority === 'primary'));
  return cleanList;
}

/**
 * Tạo dữ liệu phản hồi thống nhất cho API `/api/fields`.
 * @param {string} email - Email người dùng.
 * @param {Object|null} record - Bản ghi đã lưu.
 * @returns {Object} Phản hồi JSON chuẩn.
 */
function buildFieldsResponse(email, record) {
  const fields = record && Array.isArray(record.fields) ? record.fields : [];
  const keys = [];
  const seenKeys = new Set();
  const labels = [];
  const seenLabels = new Set();

  for (const item of fields) {
    if (item.key && !seenKeys.has(item.key)) {
      seenKeys.add(item.key);
      keys.push(item.key);
    }
    const lowLabel = String(item.label || '').toLowerCase();
    if (lowLabel && !seenLabels.has(lowLabel)) {
      seenLabels.add(lowLabel);
      labels.push(item.label);
    }
  }

  return {
    ok: true,
    email,
    name: (record && record.name) || '',
    scholarId: (record && record.scholarId) || '',
    source: (record && record.source) || '',
    fields,
    keys,
    labels,
    updatedAt: (record && record.updatedAt) || ''
  };
}

module.exports = {
  MAX_FIELDS_PER_USER,
  normalizeEmailKey,
  loadFieldsStore,
  mutateFieldsStore,
  normalizeFieldEntry,
  normalizeFieldsList,
  buildFieldsResponse
};
