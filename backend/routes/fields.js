/**
 * Route đọc và lưu danh sách lĩnh vực nghiên cứu đã xác nhận theo email (backend/routes/fields.js)
 * Lưu trữ trong tệp backend/data/fields.json (key là email), đồng bộ kèm cache trong bộ nhớ.
 * Hỗ trợ thay thế toàn bộ danh sách hoặc thêm, xóa, sửa từng lĩnh vực.
 */

'use strict';

const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const express = require('express');
const {
  SYSTEM_FIELDS,
  VALID_FIELD_KEYS,
  FIELD_LABEL_BY_KEY,
  resolveSystemField
} = require('../services/fieldMap');

const router = express.Router();

const IS_VERCEL = Boolean(process.env.VERCEL);
const LOCAL_DATA_DIR = path.join(__dirname, '..', 'data');
const LOCAL_FIELDS_FILE_PATH = path.join(LOCAL_DATA_DIR, 'fields.json');
// Hệ thống tệp của Vercel Serverless là read-only (/var/task), nên ghi tạm vào /tmp khi chạy trên Vercel
const DATA_DIR = IS_VERCEL ? os.tmpdir() : LOCAL_DATA_DIR;
const FIELDS_FILE_PATH = IS_VERCEL
  ? path.join(os.tmpdir(), 'confguide-fields.json')
  : LOCAL_FIELDS_FILE_PATH;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Cache dữ liệu fields.json trong bộ nhớ để đọc nhanh */
let fieldsStoreCache = null;
/** Hàng đợi ghi file tuần tự tránh xung đột ghi đồng thời */
let writeQueue = Promise.resolve();

/**
 * Chuẩn hóa email làm khóa lưu trữ an toàn (chống prototype pollution).
 * @param {*} rawEmail - Email đầu vào.
 * @returns {string} Email chữ thường đã trim hoặc chuỗi rỗng nếu không hợp lệ.
 */
function normalizeEmailKey(rawEmail) {
  const clean = String(rawEmail || '').trim().toLowerCase();
  if (!EMAIL_REGEX.test(clean)) return '';
  if (clean === '__proto__' || clean === 'constructor' || clean === 'prototype') return '';
  return clean;
}

/**
 * Đọc toàn bộ map dữ liệu từ fields.json (ưu tiên cache trong bộ nhớ).
 * @returns {Promise<Object>} Đối tượng thuần (null prototype) key theo email.
 */
async function loadFieldsStore() {
  if (fieldsStoreCache) return fieldsStoreCache;

  await fsp.mkdir(DATA_DIR, { recursive: true });
  let parsed = {};
  const readSourcePath = fs.existsSync(FIELDS_FILE_PATH)
    ? FIELDS_FILE_PATH
    : (IS_VERCEL && fs.existsSync(LOCAL_FIELDS_FILE_PATH) ? LOCAL_FIELDS_FILE_PATH : '');

  if (readSourcePath) {
    try {
      const content = await fsp.readFile(readSourcePath, 'utf8');
      const rawObj = content.trim() ? JSON.parse(content) : {};
      if (rawObj && typeof rawObj === 'object' && !Array.isArray(rawObj)) {
        parsed = rawObj;
      }
    } catch {
      parsed = {};
    }
  } else {
    try {
      await fsp.writeFile(FIELDS_FILE_PATH, '{}\n', 'utf8');
    } catch {
      // Bỏ qua nếu môi trường chỉ đọc
    }
  }

  const safeMap = Object.create(null);
  for (const [key, value] of Object.entries(parsed)) {
    const emailKey = normalizeEmailKey(key);
    if (emailKey && value && typeof value === 'object') {
      safeMap[emailKey] = value;
    }
  }
  fieldsStoreCache = safeMap;
  return fieldsStoreCache;
}

/**
 * Ghi nguyên tử (atomic write qua file tạm) toàn bộ dữ liệu cache xuống backend/data/fields.json.
 * @param {Object} storeMap - Map dữ liệu theo email.
 * @returns {Promise<void>}
 */
function persistFieldsStore(storeMap) {
  writeQueue = writeQueue.then(async () => {
    await fsp.mkdir(DATA_DIR, { recursive: true });
    const plainObj = {};
    for (const key of Object.keys(storeMap)) {
      plainObj[key] = storeMap[key];
    }
    const tmpPath = `${FIELDS_FILE_PATH}.tmp`;
    await fsp.writeFile(tmpPath, `${JSON.stringify(plainObj, null, 2)}\n`, 'utf8');
    await fsp.rename(tmpPath, FIELDS_FILE_PATH);
  });
  return writeQueue;
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

  const rawLabel = String(rawItem.label || '').trim();
  const label = rawLabel || FIELD_LABEL_BY_KEY[key] || key;
  const priority = rawItem.priority === 'primary' ? 'primary' : 'normal';
  const rawSource = String(rawItem.source || '').trim().toLowerCase();
  const allowedSources = new Set([
    'serpapi',
    'openalex',
    'orcid',
    'semantic_scholar',
    'confguide_saved',
    'manual',
    'custom',
    'scholar'
  ]);
  const source = allowedSources.has(rawSource) ? rawSource : 'manual';

  return {
    id: String(rawItem.id || `dom_${key}_${Date.now()}_${idx}`).trim(),
    key,
    label,
    priority,
    source,
    originalInterest: String(rawItem.originalInterest || rawItem.openAlexTopicName || '').trim(),
    updatedAt: typeof rawItem.updatedAt === 'string' && rawItem.updatedAt
      ? rawItem.updatedAt
      : new Date().toISOString()
  };
}

/**
 * Chuẩn hóa, khử trùng và sắp xếp danh sách lĩnh vực (ưu tiên chính lên trước).
 * @param {Array<string|Object>} rawList - Danh sách thô.
 * @returns {Array<Object>} Danh sách đã chuẩn hóa.
 */
function normalizeFieldsList(rawList) {
  const list = Array.isArray(rawList) ? rawList : [];
  const cleanList = [];
  const seenPairs = new Set();
  const seenIds = new Set();

  list.forEach((item, idx) => {
    const normalized = normalizeFieldEntry(item, idx);
    if (!normalized) return;

    const pairKey = `${normalized.key}::${normalized.label.toLowerCase()}`;
    if (seenPairs.has(pairKey)) return;
    seenPairs.add(pairKey);

    let safeId = normalized.id;
    while (seenIds.has(safeId)) {
      safeId = `${normalized.id}_${idx}`;
    }
    seenIds.add(safeId);
    cleanList.push({ ...normalized, id: safeId });
  });

  cleanList.sort((a, b) => Number(b.priority === 'primary') - Number(a.priority === 'primary'));
  return cleanList;
}

/**
 * Tạo dữ liệu phản hồi thống nhất cho API /api/fields.
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

/**
 * GET /api/fields?email=...
 * Đọc danh sách lĩnh vực đã xác nhận của người dùng theo email.
 */
router.get('/', async (req, res, next) => {
  try {
    const email = normalizeEmailKey(req.query.email);
    if (!email) {
      return res.status(400).json({
        error: 'INVALID_EMAIL',
        message: 'Vui lòng cung cấp tham số email hợp lệ.'
      });
    }

    const store = await loadFieldsStore();
    const record = Object.hasOwn(store, email) ? store[email] : null;
    return res.json(buildFieldsResponse(email, record));
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/fields/catalog
 * Trả về danh mục 25 lĩnh vực chuẩn trong hệ thống (tiện kiểm tra/đối chiếu).
 */
router.get('/catalog', (req, res) => {
  res.json({ ok: true, fields: SYSTEM_FIELDS });
});

/**
 * PUT /api/fields
 * Lưu hoặc cập nhật (thêm, xóa, sửa) danh sách lĩnh vực đã xác nhận theo email.
 * Hỗ trợ:
 * 1. Ghi đè danh sách: { email, name?, scholarId?, source?, fields: [...] }
 * 2. Thao tác từng mục: { email, action: 'add' | 'update' | 'remove', field?, id?, key?, label? }
 */
router.put('/', async (req, res, next) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const email = normalizeEmailKey(body.email);
    if (!email) {
      return res.status(400).json({
        error: 'INVALID_EMAIL',
        message: 'Vui lòng cung cấp email hợp lệ.'
      });
    }

    const store = await loadFieldsStore();
    const existing = Object.hasOwn(store, email)
      ? store[email]
      : { email, name: '', scholarId: '', source: '', fields: [], updatedAt: '' };
    const currentFields = Array.isArray(existing.fields) ? existing.fields.slice() : [];
    const action = typeof body.action === 'string' ? body.action.trim().toLowerCase() : '';

    let nextFields = currentFields;

    if (action === 'add') {
      const candidate = normalizeFieldEntry(body.field || body, currentFields.length);
      if (!candidate) {
        return res.status(400).json({
          error: 'INVALID_FIELD',
          message: 'Thông tin lĩnh vực thêm mới không hợp lệ hoặc không khớp danh mục hệ thống.'
        });
      }
      nextFields = normalizeFieldsList([...currentFields, candidate]);
    } else if (action === 'update') {
      const targetId = String(body.id || (body.field && body.field.id) || '').trim();
      const targetKey = String(body.key || '').trim();
      const patch = body.field && typeof body.field === 'object' ? body.field : body;
      let found = false;

      const mapped = currentFields.map((item, idx) => {
        const isMatch = (targetId && item.id === targetId) || (!targetId && targetKey && item.key === targetKey);
        if (!isMatch) return item;
        found = true;
        return normalizeFieldEntry(
          {
            ...item,
            key: patch.key || item.key,
            label: patch.label || item.label,
            priority: patch.priority || item.priority,
            source: patch.source || item.source,
            id: item.id,
            updatedAt: new Date().toISOString()
          },
          idx
        ) || item;
      });

      if (!found) {
        return res.status(404).json({
          error: 'FIELD_NOT_FOUND',
          message: 'Không tìm thấy lĩnh vực cần sửa trong hồ sơ.'
        });
      }
      nextFields = normalizeFieldsList(mapped);
    } else if (action === 'remove') {
      const targetId = String(body.id || '').trim();
      const targetKey = String(body.key || '').trim();
      const targetLabel = String(body.label || '').trim().toLowerCase();
      if (!targetId && !targetKey && !targetLabel) {
        return res.status(400).json({
          error: 'MISSING_TARGET',
          message: 'Cần truyền id, key hoặc label để xóa lĩnh vực.'
        });
      }
      nextFields = currentFields.filter(item => {
        if (targetId && item.id === targetId) return false;
        if (targetKey && item.key === targetKey) return false;
        if (targetLabel && String(item.label || '').toLowerCase() === targetLabel) return false;
        return true;
      });
    } else {
      if (!Array.isArray(body.fields)) {
        return res.status(400).json({
          error: 'INVALID_FIELDS_ARRAY',
          message: 'Trường fields phải là một mảng (hoặc truyền action: add/update/remove).'
        });
      }
      nextFields = normalizeFieldsList(body.fields);
    }

    const updatedRecord = {
      email,
      name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : (existing.name || ''),
      scholarId: typeof body.scholarId === 'string' ? body.scholarId.trim() : (existing.scholarId || ''),
      source: typeof body.source === 'string' && body.source.trim() ? body.source.trim() : (existing.source || 'manual'),
      fields: nextFields,
      updatedAt: new Date().toISOString()
    };

    store[email] = updatedRecord;
    await persistFieldsStore(store);

    return res.json(buildFieldsResponse(email, updatedRecord));
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
