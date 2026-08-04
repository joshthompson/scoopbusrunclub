const CONVEX_URL = (import.meta.env.VITE_CONVEX_URL as string) || ''

// ---------- Cache infrastructure ----------

const CACHE_PREFIX = 'sbrc:'
const CACHE_VERSION = 4

/** The single metadata key that controls all cache validity */
const CACHE_META_KEY = `${CACHE_PREFIX}cache`

interface CacheMeta {
	version: number
	parkrunDataUpdatedAt: string | null
	scoopBusDataUpdatedAt: string | null
	guestDataUpdatedAt: string | null
	largestClubsUpdatedAt: string | null
}

/** Cache keys that belong to parkrun-scraped data */
const PARKRUN_EXACT_KEYS = ['runners', 'events', 'volunteers', 'celebrations']
const PARKRUN_PREFIX_KEYS = ['results:', 'course:']

/** Cache keys that belong to our own data */
const SCOOPBUS_EXACT_KEYS = ['races']

/** Cache keys that belong to guest data */
const GUEST_EXACT_KEYS = ['guests', 'guest-results']

/** Cache keys that belong to the largest-clubs league table */
const LARGEST_CLUBS_EXACT_KEYS = ['largest-clubs', 'largest-clubs-all']

// ---------- Cache meta read / write ----------

function getCacheMeta(): CacheMeta | null {
	try {
		const raw = localStorage.getItem(CACHE_META_KEY)
		if (!raw) return null
		const meta: CacheMeta = JSON.parse(raw)
		if (meta.version !== CACHE_VERSION) return null
		return meta
	} catch {
		return null
	}
}

function setCacheMeta(meta: CacheMeta): void {
	try {
		localStorage.setItem(CACHE_META_KEY, JSON.stringify(meta))
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
		if (!getCacheMeta()) return null // no valid meta → treat all cache as stale
		const raw = localStorage.getItem(CACHE_PREFIX + key)
		if (!raw) return null
		return JSON.parse(raw) as T
	} catch {
		return null
	}
}

export function setCache<T>(key: string, data: T): void {
	try {
		localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data))
	} catch {
		// localStorage full or unavailable — silently skip
	}
}

// ---------- Cache invalidation ----------

/** Remove specific cache entries related to parkrun data */
function purgeParkrunCache(): void {
	for (const key of PARKRUN_EXACT_KEYS) {
		localStorage.removeItem(CACHE_PREFIX + key)
	}
	// Also remove prefixed keys (results:*, course:*)
	for (let i = localStorage.length - 1; i >= 0; i--) {
		const fullKey = localStorage.key(i)
		if (!fullKey || !fullKey.startsWith(CACHE_PREFIX)) continue
		const key = fullKey.slice(CACHE_PREFIX.length)
		for (const prefix of PARKRUN_PREFIX_KEYS) {
			if (key.startsWith(prefix)) {
				localStorage.removeItem(fullKey)
				break
			}
		}
	}
}

/** Remove specific cache entries related to ScoopBus data */
function purgeScoopBusCache(): void {
	for (const key of SCOOPBUS_EXACT_KEYS) {
		localStorage.removeItem(CACHE_PREFIX + key)
	}
}

/** Remove specific cache entries related to guest data */
function purgeGuestCache(): void {
	for (const key of GUEST_EXACT_KEYS) {
		localStorage.removeItem(CACHE_PREFIX + key)
	}
}

/** Remove specific cache entries related to the largest-clubs league table */
function purgeLargestClubsCache(): void {
	for (const key of LARGEST_CLUBS_EXACT_KEYS) {
		localStorage.removeItem(CACHE_PREFIX + key)
	}
}

/**
 * Wipe all sbrc: keys from localStorage EXCEPT the admin auth token.
 * Used when migrating from the old cache scheme or on version mismatch.
 */
function wipeAllCache(): void {
	const keysToRemove: string[] = []
	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i)
		if (key?.startsWith(CACHE_PREFIX) && key !== `${CACHE_PREFIX}admin_token`) {
			keysToRemove.push(key)
		}
	}
	for (const key of keysToRemove) {
		localStorage.removeItem(key)
	}
}

// ---------- Cache validity check (runs once per page load) ----------

let cacheValidityPromise: Promise<void> | null = null

/**
 * Ensures cache validity has been checked against the server.
 * Returns a promise that resolves once the check is complete.
 * Safe to call multiple times — only the first call triggers the fetch.
 */
export function ensureCacheValidity(): Promise<void> {
	if (!cacheValidityPromise) {
		cacheValidityPromise = checkCacheValidity()
	}
	return cacheValidityPromise
}

async function checkCacheValidity(): Promise<void> {
	try {
		const response = await fetch(`${CONVEX_URL}/api/cache-version`)
		if (!response.ok) return // can't reach server — keep cached data as-is
		const server: {
			parkrunDataUpdatedAt: string | null
			scoopBusDataUpdatedAt: string | null
			guestDataUpdatedAt: string | null
			largestClubsUpdatedAt: string | null
		} = await response.json()

		const meta = getCacheMeta()

		// No valid meta → wipe everything (old scheme or version mismatch)
		if (!meta) {
			wipeAllCache()
			setCacheMeta({
				version: CACHE_VERSION,
				parkrunDataUpdatedAt: server.parkrunDataUpdatedAt,
				scoopBusDataUpdatedAt: server.scoopBusDataUpdatedAt,
				guestDataUpdatedAt: server.guestDataUpdatedAt,
				largestClubsUpdatedAt: server.largestClubsUpdatedAt,
			})
			return
		}

		let metaChanged = false

		// Compare parkrun data timestamp
		const serverParkrun = Number(server.parkrunDataUpdatedAt ?? '0')
		const clientParkrun = Number(meta.parkrunDataUpdatedAt ?? '0')
		if (serverParkrun > clientParkrun) {
			purgeParkrunCache()
			meta.parkrunDataUpdatedAt = server.parkrunDataUpdatedAt
			metaChanged = true
		}

		// Compare scoopbus data timestamp
		const serverScoopBus = Number(server.scoopBusDataUpdatedAt ?? '0')
		const clientScoopBus = Number(meta.scoopBusDataUpdatedAt ?? '0')
		if (serverScoopBus > clientScoopBus) {
			purgeScoopBusCache()
			meta.scoopBusDataUpdatedAt = server.scoopBusDataUpdatedAt
			metaChanged = true
		}

		// Compare guest data timestamp
		const serverGuest = Number(server.guestDataUpdatedAt ?? '0')
		const clientGuest = Number(meta.guestDataUpdatedAt ?? '0')
		if (serverGuest > clientGuest) {
			purgeGuestCache()
			meta.guestDataUpdatedAt = server.guestDataUpdatedAt
			metaChanged = true
		}

		// Compare largest-clubs data timestamp
		const serverLargestClubs = Number(server.largestClubsUpdatedAt ?? '0')
		const clientLargestClubs = Number(meta.largestClubsUpdatedAt ?? '0')
		if (serverLargestClubs > clientLargestClubs) {
			purgeLargestClubsCache()
			meta.largestClubsUpdatedAt = server.largestClubsUpdatedAt
			metaChanged = true
		}

		if (metaChanged) {
			setCacheMeta(meta)
		}
	} catch {
		// Network error — keep cached data as-is
	}
}

export interface Runner {
	parkrunId: string
	name: string
	totalRuns: number
	totalJuniorRuns?: number
	lastUpdated: number
}

export interface RunResultItem {
	parkrunId: string
	runnerName: string
	event: string // eventId, e.g. "haga"
	eventName: string // resolved display name, e.g. "Haga"
	eventNumber: number
	position: number
	time: string
	ageGrade: string
	date: string // YYYY-MM-DD
}

export async function fetchRecentResults(
	sinceDate: string,
): Promise<RunResultItem[]> {
	await ensureCacheValidity()
	const cacheKey = `results:${sinceDate}`
	const cached = getCached<RunResultItem[]>(cacheKey)
	if (cached) return cached

	const url = `${CONVEX_URL}/api/results?since=${encodeURIComponent(sinceDate)}`
	const response = await fetch(url)
	if (!response.ok) throw new Error(`API error: ${response.status}`)
	const data: RunResultItem[] = await response.json()
	setCache(cacheKey, data)
	return data
}

export async function fetchAllResults(): Promise<RunResultItem[]> {
	await ensureCacheValidity()
	const cacheKey = 'results:all'
	const cached = getCached<RunResultItem[]>(cacheKey)
	if (cached) return cached

	const url = `${CONVEX_URL}/api/results`
	const response = await fetch(url)
	if (!response.ok) throw new Error(`API error: ${response.status}`)
	const data: RunResultItem[] = await response.json()
	setCache(cacheKey, data)
	return data
}

export async function fetchRunners(): Promise<Runner[]> {
	await ensureCacheValidity()
	const cacheKey = 'runners'
	const cached = getCached<Runner[]>(cacheKey)
	if (cached) return cached

	const url = `${CONVEX_URL}/api/runners`
	const response = await fetch(url)
	if (!response.ok) throw new Error(`API error: ${response.status}`)
	const data: Runner[] = await response.json()
	setCache(cacheKey, data)
	return data
}

export interface RaceAttendee {
	runnerId: string
	position?: number
	time?: string
	distance?: number
	laps?: number
	scanned?: boolean
}

export interface RaceItem {
	_id: string
	date: string
	name: string
	website?: string
	type?: string
	attendees: RaceAttendee[]
	majorEvent?: boolean
	public: boolean
}

export async function fetchPublicRaces(): Promise<RaceItem[]> {
	await ensureCacheValidity()
	const cacheKey = 'races'
	const cached = getCached<RaceItem[]>(cacheKey)
	if (cached) return cached

	const url = `${CONVEX_URL}/api/races`
	const response = await fetch(url)
	if (!response.ok) throw new Error(`API error: ${response.status}`)
	const data: RaceItem[] = await response.json()
	setCache(cacheKey, data)
	return data
}

export interface EventItem {
	eventId: string
	name: string
	url: string
	country: string
}

export async function fetchEvents(): Promise<EventItem[]> {
	await ensureCacheValidity()
	const cacheKey = 'events'
	const cached = getCached<EventItem[]>(cacheKey)
	if (cached) return cached

	const url = `${CONVEX_URL}/api/events`
	const response = await fetch(url)
	if (!response.ok) throw new Error(`API error: ${response.status}`)
	const data: EventItem[] = await response.json()
	setCache(cacheKey, data)
	return data
}

export interface VolunteerItem {
	parkrunId: string
	volunteerName: string
	event: string // eventId, e.g. "haga"
	eventName: string // resolved display name, e.g. "Haga"
	eventNumber: number
	roles: string[]
	date: string // YYYY-MM-DD
}

export async function fetchVolunteers(): Promise<VolunteerItem[]> {
	await ensureCacheValidity()
	const cacheKey = 'volunteers'
	const cached = getCached<VolunteerItem[]>(cacheKey)
	if (cached) return cached

	const url = `${CONVEX_URL}/api/volunteers`
	const response = await fetch(url)
	if (!response.ok) throw new Error(`API error: ${response.status}`)
	const data: VolunteerItem[] = await response.json()
	setCache(cacheKey, data)
	return data
}

export interface CoursePoint {
	name: string
	coordinates: number[]
}

export interface CourseData {
	eventId: string
	coordinates: number[][] // [[lon, lat, alt], ...]
	points: CoursePoint[] // [{ name: "Start", coordinates: [lon, lat, alt] }, ...]
}

export async function fetchCourse(eventId: string): Promise<CourseData | null> {
	await ensureCacheValidity()
	const cacheKey = `course:${eventId}`
	const cached = getCached<CourseData>(cacheKey)
	if (cached) return cached

	const url = `${CONVEX_URL}/api/course?eventId=${encodeURIComponent(eventId)}`
	const response = await fetch(url)
	if (response.status === 404) return null
	if (!response.ok) throw new Error(`API error: ${response.status}`)
	const data: CourseData = await response.json()
	setCache(cacheKey, data)
	return data
}

/**
 * Event IDs that already have course map data. Deliberately uncached — this
 * decides which courses the Process Results flow asks to be uploaded, so it has
 * to reflect the database as it is right now.
 */
export async function fetchCourseEventIds(): Promise<string[]> {
	const response = await fetch(`${CONVEX_URL}/api/courses`)
	if (!response.ok) throw new Error(`API error: ${response.status}`)
	return response.json()
}

// ---------- Guests ----------

export interface GuestItem {
	_id: string
	name: string
	extra?: string
	parkrunId?: string
	avatar?: Record<string, unknown>
	createdAt: number
	modifiedAt: number
}

export interface GuestResultItem {
	guestId: string
	guestName: string
	guestExtra?: string
	guestParkrunId?: string
	event: string
	eventName: string
	eventNumber: number
	position: number
	time: string
	date: string
}

export async function fetchGuests(): Promise<GuestItem[]> {
	await ensureCacheValidity()
	const cacheKey = 'guests'
	const cached = getCached<GuestItem[]>(cacheKey)
	if (cached) return cached

	const url = `${CONVEX_URL}/api/guests`
	const response = await fetch(url)
	if (!response.ok) throw new Error(`API error: ${response.status}`)
	const data: GuestItem[] = await response.json()
	setCache(cacheKey, data)
	return data
}

export async function fetchGuestResults(): Promise<GuestResultItem[]> {
	await ensureCacheValidity()
	const cacheKey = 'guest-results'
	const cached = getCached<GuestResultItem[]>(cacheKey)
	if (cached) return cached

	const url = `${CONVEX_URL}/api/guest-results`
	const response = await fetch(url)
	if (!response.ok) throw new Error(`API error: ${response.status}`)
	const data: GuestResultItem[] = await response.json()
	setCache(cacheKey, data)
	return data
}

// ---------- Largest clubs ----------

export interface LargestClub {
	name: string
	/** "Antal deltagare" — distinct club members who have run. */
	members: number
	/** "Antal starter" — total runs started by club members. */
	events: number
	/** Runs per week, averaged over the last 6 weeks of snapshots. */
	averageWeeklyEvents: number
	isScoopBus: boolean
	/** Weeks until this club passes Scoop Bus. Null for us, or if never. */
	weeksToOvertakeScoopBus: number | null
}

export interface LargestClubsSummary {
	/** Saturday of the most recent snapshot, YYYY-MM-DD. Null when no data. */
	week: string | null
	/** Weeks until Scoop Bus is the largest club. Null if already there or never. */
	estimatedWeeksToLargest: number | null
	clubs: LargestClub[]
}

export interface LargestClubSnapshot {
	week: string // YYYY-MM-DD (a Saturday)
	name: string
	clubId?: string
	members: number
	events: number
}

/**
 * Never throws — this drives a homepage block, so a missing or unreachable
 * endpoint should hide the block rather than break the page.
 */
export async function fetchLargestClubs(): Promise<LargestClubsSummary | null> {
	await ensureCacheValidity()
	const cacheKey = 'largest-clubs'
	const cached = getCached<LargestClubsSummary>(cacheKey)
	if (cached) return cached

	try {
		const url = `${CONVEX_URL}/api/largest-clubs`
		const response = await fetch(url)
		if (!response.ok) return null
		const data: LargestClubsSummary = await response.json()
		setCache(cacheKey, data)
		return data
	} catch {
		return null
	}
}

export async function fetchAllLargestClubs(): Promise<LargestClubSnapshot[]> {
	await ensureCacheValidity()
	const cacheKey = 'largest-clubs-all'
	const cached = getCached<LargestClubSnapshot[]>(cacheKey)
	if (cached) return cached

	const url = `${CONVEX_URL}/api/largest-clubs/all`
	const response = await fetch(url)
	if (!response.ok) throw new Error(`API error: ${response.status}`)
	const data: LargestClubSnapshot[] = await response.json()
	setCache(cacheKey, data)
	return data
}

// ---------- Weather ----------

export interface Weather {
	/** Epoch ms when the backend last refreshed from XWeather. */
	updatedAt: number
	/** Raw XWeather `response` payload for Haga Park. */
	data: unknown
}

/**
 * Fetch the current weather for Haga Park. The backend caches this for up to
 * an hour, so this is cheap to call on every page load. Not persisted in the
 * localStorage cache — weather is time-sensitive and served fresh each load.
 */
export async function fetchWeather(): Promise<Weather | null> {
	const url = `${CONVEX_URL}/api/weather`
	const response = await fetch(url)
	if (!response.ok) return null
	return (await response.json()) as Weather | null
}
