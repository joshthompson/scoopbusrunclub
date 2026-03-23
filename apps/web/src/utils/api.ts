const CONVEX_URL = import.meta.env.VITE_CONVEX_URL as string || "";

const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const CACHE_TTL_SHORT_MS = 15 * 60 * 1000; // 15 minutes

/** Fixed MM-DD dates where caching should be skipped (add more as needed) */
const NO_CACHE_DATES: string[] = [
  "01-01", // New Year's Day
  "03-11", // Lithuania — Independence Restoration Day
  "04-27", // South Africa — Freedom Day
  "05-04", // Japan — Greenery Day
  "07-01", // Canada — Canada Day
  "08-09", // Singapore — National Day
  "09-16", // Malaysia — Malaysia Day
  "10-03", // Germany — German Unity Day
  "10-26", // Austria — National Day
  "12-25", // Christmas Day (AU, FR, IE, IT, NZ, UK)
  "12-26", // Boxing Day (PL)
];

// ---------- Dynamic date helpers ----------

/** Compute Easter Sunday for a given year (Anonymous Gregorian algorithm) */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/** Ascension Day — Easter + 39 days (DK, FI, NO, SE) */
function ascensionDay(year: number): string {
  const d = easterSunday(year);
  d.setDate(d.getDate() + 39);
  return toMMDD(d);
}

/** Whit Monday — Easter + 50 days (NL) */
function whitMonday(year: number): string {
  const d = easterSunday(year);
  d.setDate(d.getDate() + 50);
  return toMMDD(d);
}

/** US Thanksgiving — 4th Thursday of November */
function thanksgiving(year: number): string {
  const nov1 = new Date(year, 10, 1); // November
  const dayOfWeek = nov1.getDay(); // 0=Sun
  const firstThursday = dayOfWeek <= 4 ? 1 + (4 - dayOfWeek) : 1 + (11 - dayOfWeek);
  const fourthThursday = firstThursday + 21;
  return toMMDD(new Date(year, 10, fourthThursday));
}

function toMMDD(d: Date): string {
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Check if the given date is a special day (fixed or dynamic) */
function isSpecialDate(date: Date): boolean {
  const mmdd = toMMDD(date);
  if (NO_CACHE_DATES.includes(mmdd)) return true;

  const year = date.getFullYear();
  const dynamicDates = [
    ascensionDay(year),  // DK, FI, NO, SE — Ascension Day
    whitMonday(year),    // NL — Whit Monday
    thanksgiving(year),  // US — Thanksgiving
  ];
  return dynamicDates.includes(mmdd);
}

// ---------- Cache infrastructure ----------

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  version?: number;
}

const CACHE_PREFIX = "sbrc:";
const CACHE_VERSION = 2;

function activeCacheTTL(): number {
  const now = new Date();
  if (now.getDay() === 6 || isSpecialDate(now)) return CACHE_TTL_SHORT_MS;
  return CACHE_TTL_MS;
}

export function getCached<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (entry.version !== CACHE_VERSION || Date.now() - entry.timestamp > activeCacheTTL()) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function setCache<T>(key: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now(), version: CACHE_VERSION };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable — silently skip
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
  const url = `${CONVEX_URL}/api/races`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  const data: RaceItem[] = await response.json();
  return data;
}

export interface EventItem {
  eventId: string;
  name: string;
  url: string;
  country: string;
}

export async function fetchEvents(): Promise<EventItem[]> {
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
