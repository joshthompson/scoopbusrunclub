const CONVEX_URL = import.meta.env.VITE_CONVEX_URL as string || "";

// ---------- Cache infrastructure ----------

const CACHE_PREFIX = "sbrc:";
const CACHE_VERSION = 3;

/** The single metadata key that controls all cache validity */
const CACHE_META_KEY = `${CACHE_PREFIX}cache`;

interface CacheMeta {
  version: number;
  parkrunDataUpdatedAt: string | null;
  scoopBusDataUpdatedAt: string | null;
}

/** Cache keys that belong to parkrun-scraped data */
const PARKRUN_EXACT_KEYS = ["runners", "events", "volunteers", "celebrations"];
const PARKRUN_PREFIX_KEYS = ["results:", "course:"];

/** Cache keys that belong to our own data */
const SCOOPBUS_EXACT_KEYS = ["races"];

// ---------- Cache meta read / write ----------

function getCacheMeta(): CacheMeta | null {
  try {
    const raw = localStorage.getItem(CACHE_META_KEY);
    if (!raw) return null;
    const meta: CacheMeta = JSON.parse(raw);
    if (meta.version !== CACHE_VERSION) return null;
    return meta;
  } catch {
    return null;
  }
}

function setCacheMeta(meta: CacheMeta): void {
  try {
    localStorage.setItem(CACHE_META_KEY, JSON.stringify(meta));
  } catch {
    // localStorage full or unavailable — silently skip
  }
}

// ---------- Cache data read / write ----------

/**
 * Read a value from the localStorage cache.
 * Returns null if missing or if the cache meta version doesn't match.
 */
export function getCached<T>(key: string): T | null {
  try {
    if (!getCacheMeta()) return null; // no valid meta → treat all cache as stale
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setCache<T>(key: string, data: T): void {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable — silently skip
  }
}

// ---------- Cache invalidation ----------

/** Remove specific cache entries related to parkrun data */
function purgeParkrunCache(): void {
  for (const key of PARKRUN_EXACT_KEYS) {
    localStorage.removeItem(CACHE_PREFIX + key);
  }
  // Also remove prefixed keys (results:*, course:*)
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const fullKey = localStorage.key(i);
    if (!fullKey || !fullKey.startsWith(CACHE_PREFIX)) continue;
    const key = fullKey.slice(CACHE_PREFIX.length);
    for (const prefix of PARKRUN_PREFIX_KEYS) {
      if (key.startsWith(prefix)) {
        localStorage.removeItem(fullKey);
        break;
      }
    }
  }
}

/** Remove specific cache entries related to ScoopBus data */
function purgeScoopBusCache(): void {
  for (const key of SCOOPBUS_EXACT_KEYS) {
    localStorage.removeItem(CACHE_PREFIX + key);
  }
}

/**
 * Wipe all sbrc: keys from localStorage EXCEPT the admin auth token.
 * Used when migrating from the old cache scheme or on version mismatch.
 */
function wipeAllCache(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(CACHE_PREFIX) && key !== `${CACHE_PREFIX}admin_token`) {
      keysToRemove.push(key);
    }
  }
  for (const key of keysToRemove) {
    localStorage.removeItem(key);
  }
}

// ---------- Cache validity check (runs once per page load) ----------

let cacheValidityPromise: Promise<void> | null = null;

/**
 * Ensures cache validity has been checked against the server.
 * Returns a promise that resolves once the check is complete.
 * Safe to call multiple times — only the first call triggers the fetch.
 */
export function ensureCacheValidity(): Promise<void> {
  if (!cacheValidityPromise) {
    cacheValidityPromise = checkCacheValidity();
  }
  return cacheValidityPromise;
}

async function checkCacheValidity(): Promise<void> {
  try {
    const response = await fetch(`${CONVEX_URL}/api/cache-version`);
    if (!response.ok) return; // can't reach server — keep cached data as-is
    const server: { parkrunDataUpdatedAt: string | null; scoopBusDataUpdatedAt: string | null } =
      await response.json();

    const meta = getCacheMeta();

    // No valid meta → wipe everything (old scheme or version mismatch)
    if (!meta) {
      wipeAllCache();
      setCacheMeta({
        version: CACHE_VERSION,
        parkrunDataUpdatedAt: server.parkrunDataUpdatedAt,
        scoopBusDataUpdatedAt: server.scoopBusDataUpdatedAt,
      });
      return;
    }

    let metaChanged = false;

    // Compare parkrun data timestamp
    const serverParkrun = Number(server.parkrunDataUpdatedAt ?? "0");
    const clientParkrun = Number(meta.parkrunDataUpdatedAt ?? "0");
    if (serverParkrun > clientParkrun) {
      purgeParkrunCache();
      meta.parkrunDataUpdatedAt = server.parkrunDataUpdatedAt;
      metaChanged = true;
    }

    // Compare scoopbus data timestamp
    const serverScoopBus = Number(server.scoopBusDataUpdatedAt ?? "0");
    const clientScoopBus = Number(meta.scoopBusDataUpdatedAt ?? "0");
    if (serverScoopBus > clientScoopBus) {
      purgeScoopBusCache();
      meta.scoopBusDataUpdatedAt = server.scoopBusDataUpdatedAt;
      metaChanged = true;
    }

    if (metaChanged) {
      setCacheMeta(meta);
    }
  } catch {
    // Network error — keep cached data as-is
  }
}

export interface Runner {
  parkrunId: string;
  name: string;
  totalRuns: number;
  totalJuniorRuns?: number;
  lastUpdated: number;
}

export interface RunResultItem {
  parkrunId: string;
  runnerName: string;
  event: string; // eventId, e.g. "haga"
  eventName: string; // resolved display name, e.g. "Haga"
  eventNumber: number;
  position: number;
  time: string;
  ageGrade: string;
  date: string; // YYYY-MM-DD
}

export async function fetchRecentResults(sinceDate: string): Promise<RunResultItem[]> {
  await ensureCacheValidity();
  const cacheKey = `results:${sinceDate}`;
  const cached = getCached<RunResultItem[]>(cacheKey);
  if (cached) return cached;

  const url = `${CONVEX_URL}/api/results?since=${encodeURIComponent(sinceDate)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data: RunResultItem[] = await response.json();
  setCache(cacheKey, data);
  return data;
}

export async function fetchAllResults(): Promise<RunResultItem[]> {
  await ensureCacheValidity();
  const cacheKey = "results:all";
  const cached = getCached<RunResultItem[]>(cacheKey);
  if (cached) return cached;

  const url = `${CONVEX_URL}/api/results`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data: RunResultItem[] = await response.json();
  setCache(cacheKey, data);
  return data;
}

export async function fetchRunners(): Promise<Runner[]> {
  await ensureCacheValidity();
  const cacheKey = "runners";
  const cached = getCached<Runner[]>(cacheKey);
  if (cached) return cached;

  const url = `${CONVEX_URL}/api/runners`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data: Runner[] = await response.json();
  setCache(cacheKey, data);
  return data;
}

export interface RaceAttendee {
  runnerId: string;
  position?: number;
  time?: string;
  distance?: number;
  laps?: number;
  scanned?: boolean;
}

export interface RaceItem {
  _id: string;
  date: string;
  name: string;
  website?: string;
  type?: string;
  attendees: RaceAttendee[];
  majorEvent?: boolean;
  public: boolean;
}

export async function fetchPublicRaces(): Promise<RaceItem[]> {
  await ensureCacheValidity();
  const cacheKey = "races";
  const cached = getCached<RaceItem[]>(cacheKey);
  if (cached) return cached;

  const url = `${CONVEX_URL}/api/races`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data: RaceItem[] = await response.json();
  setCache(cacheKey, data);
  return data;
}

export interface EventItem {
  eventId: string;
  name: string;
  url: string;
  country: string;
}

export async function fetchEvents(): Promise<EventItem[]> {
  await ensureCacheValidity();
  const cacheKey = "events";
  const cached = getCached<EventItem[]>(cacheKey);
  if (cached) return cached;

  const url = `${CONVEX_URL}/api/events`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data: EventItem[] = await response.json();
  setCache(cacheKey, data);
  return data;
}

export interface VolunteerItem {
  parkrunId: string;
  volunteerName: string;
  event: string;       // eventId, e.g. "haga"
  eventName: string;   // resolved display name, e.g. "Haga"
  eventNumber: number;
  roles: string[];
  date: string;        // YYYY-MM-DD
}

export async function fetchVolunteers(): Promise<VolunteerItem[]> {
  await ensureCacheValidity();
  const cacheKey = "volunteers";
  const cached = getCached<VolunteerItem[]>(cacheKey);
  if (cached) return cached;

  const url = `${CONVEX_URL}/api/volunteers`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data: VolunteerItem[] = await response.json();
  setCache(cacheKey, data);
  return data;
}

export interface CoursePoint {
  name: string;
  coordinates: number[];
}

export interface CourseData {
  eventId: string;
  coordinates: number[][]; // [[lon, lat, alt], ...]
  points: CoursePoint[]; // [{ name: "Start", coordinates: [lon, lat, alt] }, ...]
}

export async function fetchCourse(eventId: string): Promise<CourseData | null> {
  await ensureCacheValidity();
  const cacheKey = `course:${eventId}`;
  const cached = getCached<CourseData>(cacheKey);
  if (cached) return cached;

  const url = `${CONVEX_URL}/api/course?eventId=${encodeURIComponent(eventId)}`;
  const response = await fetch(url);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data: CourseData = await response.json();
  setCache(cacheKey, data);
  return data;
}
