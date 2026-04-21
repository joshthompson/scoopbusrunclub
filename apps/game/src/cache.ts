/**
 * Unified localStorage cache for the game.
 *
 * All cached data lives under a single localStorage key as a JSON object:
 *   { [namespace:subkey]: { data, ts } }
 *
 * This keeps localStorage tidy and makes it easy to clear everything at once.
 */

const STORAGE_KEY = 'scoopbus_cache';
const TTL_MS = 24 * 60 * 60 * 1000; // 1 day

interface CacheEntry {
  data: unknown;
  ts: number;
}

type CacheStore = Record<string, CacheEntry>;

function loadStore(): CacheStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as CacheStore;
  } catch { /* corrupt */ }
  return {};
}

function saveStore(store: CacheStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch { /* storage full */ }
}

/**
 * Get a cached value. Returns `undefined` if missing or expired.
 */
export function cacheGet<T>(namespace: string, subkey: string): T | undefined {
  const store = loadStore();
  const entry = store[`${namespace}:${subkey}`];
  if (entry && Date.now() - entry.ts < TTL_MS) {
    return entry.data as T;
  }
  return undefined;
}

/**
 * Set a cached value with the current timestamp.
 */
export function cacheSet(namespace: string, subkey: string, data: unknown): void {
  const store = loadStore();
  store[`${namespace}:${subkey}`] = { data, ts: Date.now() };

  // Prune expired entries while we're here
  const now = Date.now();
  for (const key of Object.keys(store)) {
    if (now - store[key].ts > TTL_MS) {
      delete store[key];
    }
  }

  saveStore(store);
}

/**
 * Clear all cached data.
 */
export function cacheClear(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}
