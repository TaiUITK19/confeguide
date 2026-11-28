/**
 * Route đọc và lưu danh sách lĩnh vực nghiên cứu đã xác nhận theo email (backend/routes/fields.js)
 * Chỉ tiếp nhận request, kiểm tra dữ liệu đầu vào và trả kết quả; logic lưu trữ nằm ở services/fieldsStore.js.
 */

'use strict';

const express = require('express');
const { SYSTEM_FIELDS } = require('../services/fieldMap');
const {
  MAX_FIELDS_PER_USER,
  normalizeEmailKey,
  loadFieldsStore,
  mutateFieldsStore,
  normalizeFieldEntry,
  normalizeFieldsList,
  buildFieldsResponse
} = require('../services/fieldsStore');
const { AppError, asyncHandler } = require('../utils/errorHandler');

const router = express.Router();

const MAX_NAME_LENGTH = 120;
const MAX_SCHOLAR_ID_LENGTH = 64;
const MAX_SOURCE_LENGTH = 40;
const MAX_FIELDS_PAYLOAD_BYTES = 32 * 1024;
const SCHOLAR_OR_ORCID_REGEX = /^[a-zA-Z0-9_-]{2,64}$/;

/**
 * Kiểm tra chuỗi `scholarId` tùy chọn (hỗ trợ Google Scholar ID, ORCID iD hoặc Semantic Scholar authorId).
 * @param {*} rawScholarId - Giá trị thô từ request body.
 * @returns {{ valid: boolean, value: string }} Kết quả kiểm tra.
 */
function validateOptionalScholarId(rawScholarId) {
  if (rawScholarId === undefined) return { valid: true, value: '' };
  if (typeof rawScholarId !== 'string') return { valid: false, value: '' };
  const trimmed = rawScholarId.trim();
  if (!trimmed) return { valid: true, value: '' };
  if (trimmed.length > MAX_SCHOLAR_ID_LENGTH || !SCHOLAR_OR_ORCID_REGEX.test(trimmed)) {
    return { valid: false, value: '' };
  }
  return { valid: true, value: trimmed };
}

/**
 * GET /api/fields?email=...
 * Đọc danh sách lĩnh vực đã xác nhận của người dùng theo email.
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
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
  })
);

/**
 * GET /api/fields/catalog
 * Trả về danh mục 25 lĩnh vực chuẩn trong hệ thống.
 */
router.get('/catalog', (req, res) => {
  res.json({ ok: true, fields: SYSTEM_FIELDS });
});

/**
 * PUT /api/fields
 * Lưu hoặc cập nhật (thêm, xóa, sửa) danh sách lĩnh vực đã xác nhận theo email.
 */
router.put(
  '/',
  asyncHandler(async (req, res) => {
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({
        error: 'INVALID_JSON_BODY',
        message: 'Phần thân yêu cầu phải là đối tượng JSON hợp lệ.'
      });
    }

    const body = req.body;
    const email = normalizeEmailKey(body.email);
    if (!email) {
      return res.status(400).json({
        error: 'INVALID_EMAIL',
        message: 'Vui lòng cung cấp email hợp lệ.'
      });
    }

    if (body.name !== undefined && (typeof body.name !== 'string' || body.name.trim().length > MAX_NAME_LENGTH)) {
      return res.status(400).json({
        error: 'INVALID_NAME',
        message: `Tên người dùng không hợp lệ hoặc vượt quá ${MAX_NAME_LENGTH} ký tự.`
      });
    }

    const scholarCheck = validateOptionalScholarId(body.scholarId);
    if (!scholarCheck.valid) {
      return res.status(400).json({
        error: 'INVALID_SCHOLAR_ID',
        message: 'Định dạng scholarId không hợp lệ.'
      });
    }

    if (body.source !== undefined && (typeof body.source !== 'string' || body.source.trim().length > MAX_SOURCE_LENGTH)) {
      return res.status(400).json({
        error: 'INVALID_SOURCE',
        message: `Trường source không hợp lệ hoặc vượt quá ${MAX_SOURCE_LENGTH} ký tự.`
      });
    }

    const action = typeof body.action === 'string' ? body.action.trim().toLowerCase() : '';
    if (!['', 'add', 'update', 'remove'].includes(action)) {
      return res.status(400).json({
        error: 'INVALID_ACTION',
        message: 'Hành động không hợp lệ (chỉ hỗ trợ add, update hoặc remove).'
      });
    }

    if (!action) {
      if (!Array.isArray(body.fields)) {
        return res.status(400).json({
          error: 'INVALID_FIELDS_ARRAY',
          message: 'Trường fields phải là một mảng (hoặc truyền action: add/update/remove).'
        });
      }
      if (body.fields.length > MAX_FIELDS_PER_USER) {
        return res.status(400).json({
          error: 'FIELDS_LIMIT_EXCEEDED',
          message: `Danh sách lĩnh vực không được vượt quá ${MAX_FIELDS_PER_USER} phần tử.`
        });
      }
      if (Buffer.byteLength(JSON.stringify(body.fields), 'utf8') > MAX_FIELDS_PAYLOAD_BYTES) {
        return res.status(400).json({
          error: 'FIELDS_PAYLOAD_TOO_LARGE',
          message: 'Kích thước mảng lĩnh vực vượt quá giới hạn cho phép.'
        });
      }
    }

    const updatedRecord = await mutateFieldsStore(store => {
      const existing = Object.hasOwn(store, email)
        ? store[email]
        : { email, name: '', scholarId: '', source: '', fields: [], updatedAt: '' };
      const currentFields = Array.isArray(existing.fields) ? existing.fields.slice() : [];
      let nextFields = currentFields;

      if (action === 'add') {
        const candidate = normalizeFieldEntry(body.field || body, currentFields.length);
        if (!candidate) {
          throw new AppError('Thông tin lĩnh vực thêm mới không hợp lệ hoặc không khớp danh mục hệ thống.', {
            statusCode: 400,
            code: 'INVALID_FIELD'
          });
        }
        if (currentFields.length >= MAX_FIELDS_PER_USER) {
          throw new AppError(`Mỗi hồ sơ chỉ lưu tối đa ${MAX_FIELDS_PER_USER} mục lĩnh vực.`, {
            statusCode: 400,
            code: 'FIELDS_LIMIT_EXCEEDED'
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
          throw new AppError('Không tìm thấy lĩnh vực cần sửa trong hồ sơ.', {
            statusCode: 404,
            code: 'FIELD_NOT_FOUND'
          });
        }
        nextFields = normalizeFieldsList(mapped);
      } else if (action === 'remove') {
        const targetId = String(body.id || '').trim();
        const targetKey = String(body.key || '').trim();
        const targetLabel = String(body.label || '').trim().toLowerCase();
        if (!targetId && !targetKey && !targetLabel) {
          throw new AppError('Cần truyền id, key hoặc label để xóa lĩnh vực.', {
            statusCode: 400,
            code: 'MISSING_TARGET'
          });
        }
        nextFields = currentFields.filter(item => {
          if (targetId && item.id === targetId) return false;
          if (targetKey && item.key === targetKey) return false;
          if (targetLabel && String(item.label || '').toLowerCase() === targetLabel) return false;
          return true;
        });
      } else {
        nextFields = normalizeFieldsList(body.fields);
      }

      const nextRecord = {
        email,
        name: typeof body.name === 'string' && body.name.trim()
          ? body.name.trim()
          : (existing.name || ''),
        scholarId: typeof body.scholarId === 'string'
          ? scholarCheck.value
          : (existing.scholarId || ''),
        source: typeof body.source === 'string' && body.source.trim()
          ? body.source.trim()
          : (existing.source || 'manual'),
        fields: nextFields,
        updatedAt: new Date().toISOString()
      };

      const nextStore = Object.assign(Object.create(null), store, { [email]: nextRecord });
      return {
        nextValue: nextStore,
        returnValue: nextRecord
      };
    });

    return res.json(buildFieldsResponse(email, updatedRecord));
  })
);

module.exports = router;
