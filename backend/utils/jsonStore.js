/**
 * Tiện ích đọc/ghi tệp JSON bất đồng bộ an toàn (backend/utils/jsonStore.js)
 * - Giữ bản sao trong bộ nhớ (in-memory cache) để đọc nhanh.
 * - Tuần tự hóa hàng đợi ghi (serialized queue, phục hồi nếu một lần ghi lỗi).
 * - Ghi nguyên tử (atomic write: ghi file tạm duy nhất rồi rename) tránh hỏng dữ liệu khi ghi đồng thời.
 * - Tự động chuyển sang `os.tmpdir()` khi chạy trên Vercel read-only filesystem.
 */

'use strict';

const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

/**
 * Đọc JSON từ một đường dẫn bằng `fs/promises`, trả về `null` nếu tệp chưa tồn tại hoặc JSON hỏng.
 * @param {string} filePath - Đường dẫn tệp cần đọc.
 * @returns {Promise<*|null>} Dữ liệu đã parse hoặc null.
 */
async function tryReadJsonFile(filePath) {
  if (!filePath) return null;
  try {
    const raw = await fsp.readFile(filePath, 'utf8');
    if (!raw.trim()) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Tạo bộ quản lý lưu trữ JSON bất đồng bộ kèm cache RAM và ghi tuần tự nguyên tử.
 * @param {{
 *   localFilePath: string,
 *   vercelTempFileName: string,
 *   isVercel?: boolean,
 *   createInitialValue: () => *,
 *   sanitizeLoaded?: (raw: *) => *
 * }} options
 * @returns {{
 *   filePath: string,
 *   load: () => Promise<*>,
 *   getCached: () => *,
 *   setCached: (nextValue: *) => void,
 *   save: (nextValue: *, saveOpts?: { ignoreWriteErrors?: boolean }) => Promise<void>
 * }}
 */
function createJsonFileStore(options) {
  const isVercel = Boolean(options.isVercel);
  const localFilePath = options.localFilePath;
  const targetFilePath = isVercel
    ? path.join(os.tmpdir(), options.vercelTempFileName)
    : localFilePath;
  const targetDir = path.dirname(targetFilePath);

  let cachedValue = null;
  let loadPromise = null;
  let writeQueue = Promise.resolve();
  let writeSeq = 0;

  async function load() {
    if (cachedValue !== null) return cachedValue;
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
      await fsp.mkdir(targetDir, { recursive: true }).catch(() => {});

      let rawData = await tryReadJsonFile(targetFilePath);
      if (rawData === null && isVercel && localFilePath && localFilePath !== targetFilePath) {
        rawData = await tryReadJsonFile(localFilePath);
      }

      if (rawData === null) {
        const initial = options.createInitialValue();
        cachedValue = typeof options.sanitizeLoaded === 'function'
          ? options.sanitizeLoaded(initial)
          : initial;
        // Khởi tạo tệp rỗng ban đầu nếu chưa tồn tại (bỏ qua nếu môi trường chỉ đọc)
        await fsp.writeFile(targetFilePath, `${JSON.stringify(initial, null, 2)}\n`, 'utf8').catch(() => {});
        return cachedValue;
      }

      cachedValue = typeof options.sanitizeLoaded === 'function'
        ? options.sanitizeLoaded(rawData)
        : rawData;
      return cachedValue;
    })().finally(() => {
      loadPromise = null;
    });

    return loadPromise;
  }

  function getCached() {
    return cachedValue;
  }

  function setCached(nextValue) {
    cachedValue = nextValue;
  }

  function runSerialized(taskFn) {
    const run = writeQueue.then(taskFn);
    // Luôn phục hồi chuỗi hàng đợi để lỗi ở một lần thực thi không làm treo các lần sau
    writeQueue = run.catch(() => {});
    return run;
  }

  function save(nextValue, saveOpts = {}) {
    return runSerialized(async () => {
      const serializedData = typeof saveOpts.toSerializable === 'function'
        ? saveOpts.toSerializable(nextValue)
        : nextValue;

      await fsp.mkdir(targetDir, { recursive: true });
      writeSeq += 1;
      const tmpPath = `${targetFilePath}.${process.pid}.${writeSeq}.tmp`;
      try {
        await fsp.writeFile(tmpPath, `${JSON.stringify(serializedData, null, 2)}\n`, 'utf8');
        await fsp.rename(tmpPath, targetFilePath);
        cachedValue = nextValue;
      } catch (err) {
        await fsp.unlink(tmpPath).catch(() => {});
        if (!saveOpts.ignoreWriteErrors) throw err;
        cachedValue = nextValue;
      }
    });
  }

  /**
   * Thực hiện chu trình đọc -> biến đổi -> ghi tuần tự trong cùng hàng đợi để tránh xung đột cập nhật đồng thời.
   * @param {(currentValue: *) => Promise<*>|*} mutatorFn
   * @param {{ toSerializable?: (val: *) => *, ignoreWriteErrors?: boolean }} [saveOpts={}]
   * @returns {Promise<*>} Giá trị kết quả sau cập nhật.
   */
  function update(mutatorFn, saveOpts = {}) {
    return runSerialized(async () => {
      const current = await load();
      const result = await mutatorFn(current);
      if (result && result.skipSave) {
        return result.value;
      }
      const nextValue = result && Object.hasOwn(result, 'nextValue') ? result.nextValue : current;
      const serializedData = typeof saveOpts.toSerializable === 'function'
        ? saveOpts.toSerializable(nextValue)
        : nextValue;

      await fsp.mkdir(targetDir, { recursive: true });
      writeSeq += 1;
      const tmpPath = `${targetFilePath}.${process.pid}.${writeSeq}.tmp`;
      try {
        await fsp.writeFile(tmpPath, `${JSON.stringify(serializedData, null, 2)}\n`, 'utf8');
        await fsp.rename(tmpPath, targetFilePath);
        cachedValue = nextValue;
      } catch (err) {
        await fsp.unlink(tmpPath).catch(() => {});
        if (!saveOpts.ignoreWriteErrors) throw err;
        cachedValue = nextValue;
      }
      return result && Object.hasOwn(result, 'returnValue') ? result.returnValue : nextValue;
    });
  }

  return {
    filePath: targetFilePath,
    load,
    getCached,
    setCached,
    save,
    update
  };
}

module.exports = { createJsonFileStore };
