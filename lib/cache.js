/**
 * In-Memory Fast Cache with TTL and Key-Prefix Invalidation
 */
const store = new Map();

const cache = {
  get(key) {
    const item = store.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
      store.delete(key);
      return null;
    }
    return item.value;
  },

  set(key, value, ttlMs = 60000) {
    store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs
    });
  },

  invalidate(pattern) {
    if (!pattern) {
      store.clear();
      return;
    }
    for (const key of store.keys()) {
      if (key.includes(pattern)) {
        store.delete(key);
      }
    }
  },

  flush() {
    store.clear();
  }
};

module.exports = cache;
