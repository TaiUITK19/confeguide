/**
 * Bộ nhớ đệm trong RAM có TTL, giới hạn số phần tử, dọn định kỳ và gộp request trùng đang chạy (backend/utils/cache.js)
 */

'use strict';

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_MAX_ENTRIES = 500;
const DEFAULT_CLEANUP_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Lớp Cache trong bộ nhớ kèm hàng đợi gộp các promise giống hệt nhau đang chạy dở (in-flight coalescing).
 */
class MemoryCache {
  /**
   * @param {{ ttlMs?: number, maxEntries?: number, cleanupIntervalMs?: number }} [options={}]
   */
  constructor(options = {}) {
    this.ttlMs = Number.isFinite(options.ttlMs) && options.ttlMs > 0 ? options.ttlMs : DEFAULT_TTL_MS;
    this.maxEntries = Number.isInteger(options.maxEntries) && options.maxEntries > 0
      ? options.maxEntries
      : DEFAULT_MAX_ENTRIES;
    this.cleanupIntervalMs = Number.isFinite(options.cleanupIntervalMs) && options.cleanupIntervalMs > 0
      ? options.cleanupIntervalMs
      : DEFAULT_CLEANUP_INTERVAL_MS;

    /** @type {Map<string, { data: *, expiresAt: number }>} */
    this.store = new Map();
    /** @type {Map<string, Promise<*>>} */
    this.inFlight = new Map();

    // Dọn dẹp định kỳ các khóa đã hết hạn; unref() để không giữ tiến trình Node khi shutdown
    this.cleanupTimer = setInterval(() => this.pruneExpired(), this.cleanupIntervalMs);
    if (typeof this.cleanupTimer.unref === 'function') {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Đọc dữ liệu còn hạn từ cache (làm mới thứ tự LRU nhẹ bằng cách đưa lên cuối Map).
   * @param {string} key - Khóa cache.
   * @returns {*|null} Giá trị đã lưu hoặc null nếu không có / đã hết hạn.
   */
  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.data;
  }

  /**
   * Ghi giá trị vào cache kèm TTL và tự đẩy phần tử cũ nhất nếu vượt quá `maxEntries`.
   * @param {string} key - Khóa cache.
   * @param {*} data - Dữ liệu cần lưu.
   * @param {number} [ttlMs] - Thời gian sống tùy chỉnh (mili-giây).
   */
  set(key, data, ttlMs = this.ttlMs) {
    if (this.store.has(key)) {
      this.store.delete(key);
    } else {
      while (this.store.size >= this.maxEntries) {
        const oldestKey = this.store.keys().next().value;
        if (oldestKey === undefined) break;
        this.store.delete(oldestKey);
      }
    }
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlMs
    });
  }

  /**
   * Đọc cache hoặc gộp các request giống hệt đang chạy dở để chỉ gọi `loaderFn` một lần.
   * @param {string} key - Khóa cache.
   * @param {() => Promise<*>} loaderFn - Hàm bất đồng bộ lấy dữ liệu gốc.
   * @param {{ shouldCache?: (value: *) => boolean, ttlMs?: number }} [options={}]
   * @returns {Promise<*>} Kết quả từ cache hoặc từ `loaderFn`.
   */
  async getOrFetch(key, loaderFn, options = {}) {
    const cached = this.get(key);
    if (cached !== null) return cached;

    if (this.inFlight.has(key)) {
      return this.inFlight.get(key);
    }

    const promise = (async () => {
      try {
        const result = await loaderFn();
        const shouldCache = typeof options.shouldCache === 'function'
          ? options.shouldCache(result)
          : (result !== null && result !== undefined);
        if (shouldCache) {
          this.set(key, result, options.ttlMs);
        }
        return result;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  /**
   * Xóa toàn bộ phần tử đã hết hạn khỏi bộ nhớ.
   * @returns {number} Số phần tử đã dọn.
   */
  pruneExpired() {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.expiresAt) {
        this.store.delete(key);
        removed += 1;
      }
    }
    return removed;
  }
}

module.exports = { MemoryCache };
