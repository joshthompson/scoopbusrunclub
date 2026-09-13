import type { RecurrenceSource } from '@shared/calendar/recurrence'

const CONVEX_URL = (import.meta.env.VITE_CONVEX_URL as string) || ''

const TOKEN_KEY = 'sbrc:admin_token'

// ── Token management ────────────────────────────────────────────────

export function getAuthToken(): string | null {
	return localStorage.getItem(TOKEN_KEY)
}

export function setAuthToken(token: string): void {
	localStorage.setItem(TOKEN_KEY, token)
}

export function clearAuthToken(): void {
	localStorage.removeItem(TOKEN_KEY)
}

// ── Auth API ────────────────────────────────────────────────────────

export interface LoginResult {
	token?: string
	username?: string
	error?: string
}

export async function adminLogin(
	username: string,
	password: string,
): Promise<LoginResult> {
	const res = await fetch(`${CONVEX_URL}/api/admin/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ username, password }),
	})
	const data = await res.json()
	if (data.token) {
		setAuthToken(data.token)
	}
	return data
}

export async function adminLogout(): Promise<void> {
	const token = getAuthToken()
	if (token) {
		await fetch(`${CONVEX_URL}/api/admin/logout`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ token }),
		}).catch(() => {})
	}
	clearAuthToken()
}

export async function validateToken(): Promise<{
	username: string
	isSuperAdmin: boolean
} | null> {
	const token = getAuthToken()
	if (!token) return null
	try {
		const res = await fetch(
			`${CONVEX_URL}/api/admin/validate?token=${encodeURIComponent(token)}`,
		)
		if (!res.ok) return null
		const data = await res.json()
		return data.error ? null : data
	} catch {
		return null
	}
}

// ── Races API ───────────────────────────────────────────────────────

export interface RaceAttendee {
	runnerId: string
	position?: number
	time?: string // hh:mm:ss format
	distance?: number
	laps?: number
	scanned?: boolean
}

/** A non-club runner attending an event, referencing a row in the guests table */
export interface RaceGuest {
	guestId: string
	position?: number
	time?: string // hh:mm:ss format
	distance?: number
	laps?: number
}

export interface Race {
	_id: string
	date: string
	name: string
	website?: string
	/** Free-text address, shown on the calendar and in the .ics feed. */
	location?: string
	type?: string
	/** When it starts, "HH:MM" in the club's timezone. A whole day without one. */
	time?: string
	/** Turns the date into the first of a series. Null on an update clears it. */
	recurrence?: RecurrenceSource | null
	attendees: RaceAttendee[]
	guests?: RaceGuest[]
	majorEvent?: boolean
	public: boolean
	createdAt: number
	modifiedAt: number
	modifiedBy: string
}

export async function fetchRaces(includeOld = false): Promise<Race[]> {
	const token = getAuthToken()
	if (!token) return []
	const res = await fetch(
		`${CONVEX_URL}/api/admin/races?token=${encodeURIComponent(token)}&includeOld=${includeOld}`,
	)
	if (!res.ok) return []
	return res.json()
}

export async function createRace(
	data: Omit<Race, '_id' | 'createdAt' | 'modifiedAt' | 'modifiedBy'>,
): Promise<{ id?: string; error?: string }> {
	const token = getAuthToken()
	if (!token) return { error: 'Not authenticated' }
	const res = await fetch(`${CONVEX_URL}/api/admin/races`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ token, ...data }),
	})
	return res.json()
}

export async function updateRace(
	raceId: string,
	data: Partial<Omit<Race, '_id' | 'createdAt' | 'modifiedAt' | 'modifiedBy'>>,
): Promise<{ ok?: boolean; error?: string }> {
	const token = getAuthToken()
	if (!token) return { error: 'Not authenticated' }
	const res = await fetch(`${CONVEX_URL}/api/admin/races`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ token, raceId, ...data }),
	})
	return res.json()
}

export async function deleteRace(
	raceId: string,
): Promise<{ ok?: boolean; error?: string }> {
	const token = getAuthToken()
	if (!token) return { error: 'Not authenticated' }
	const res = await fetch(
		`${CONVEX_URL}/api/admin/races?token=${encodeURIComponent(token)}&id=${encodeURIComponent(raceId)}`,
		{ method: 'DELETE' },
	)
	return res.json()
}

export async function fetchTodayRaces(): Promise<Race[]> {
	const token = getAuthToken()
	if (!token) return []
	const res = await fetch(
		`${CONVEX_URL}/api/admin/races/today?token=${encodeURIComponent(token)}`,
	)
	if (!res.ok) return []
	return res.json()
}

// ── Users API ───────────────────────────────────────────────────────

export interface AdminUser {
	_id: string
	username: string
	isSuperAdmin: boolean
	createdAt: number
	createdBy?: string
	lastLogin?: number
	lastActivity?: number
}

export async function fetchAdminUsers(): Promise<AdminUser[]> {
	const token = getAuthToken()
	if (!token) return []
	const res = await fetch(
		`${CONVEX_URL}/api/admin/users?token=${encodeURIComponent(token)}`,
	)
	if (!res.ok) return []
	return res.json()
}

export async function createAdminUser(
	username: string,
	password: string,
	isSuperAdmin = false,
): Promise<{ ok?: boolean; error?: string }> {
	const token = getAuthToken()
	if (!token) return { error: 'Not authenticated' }
	const res = await fetch(`${CONVEX_URL}/api/admin/users`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ token, username, password, isSuperAdmin }),
	})
	return res.json()
}

export async function changeOwnPassword(
	currentPassword: string,
	newPassword: string,
): Promise<{ ok?: boolean; error?: string }> {
	const token = getAuthToken()
	if (!token) return { error: 'Not authenticated' }
	const res = await fetch(`${CONVEX_URL}/api/admin/account/password`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ token, currentPassword, newPassword }),
	})
	return res.json()
}

export async function updateAdminUser(
	userId: string,
	data: { username?: string; password?: string; isSuperAdmin?: boolean },
): Promise<{ ok?: boolean; error?: string }> {
	const token = getAuthToken()
	if (!token) return { error: 'Not authenticated' }
	const res = await fetch(`${CONVEX_URL}/api/admin/users`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ token, userId, ...data }),
	})
	return res.json()
}

// ── Admin Event Logs API ────────────────────────────────────────────

export interface AdminEventLog {
	_id: string
	username: string
	action: string
	detail?: string
	targetType?: string
	targetId?: string
	timestamp: number
}

export interface AdminEventLogsResult {
	logs: AdminEventLog[]
	hasMore: boolean
}

export async function fetchAdminLogs(opts?: {
	limit?: number
	cursor?: number
	username?: string
	action?: string
}): Promise<AdminEventLogsResult> {
	const token = getAuthToken()
	if (!token) return { logs: [], hasMore: false }
	const params = new URLSearchParams({ token })
	if (opts?.limit) params.set('limit', String(opts.limit))
	if (opts?.cursor) params.set('cursor', String(opts.cursor))
	if (opts?.username) params.set('username', opts.username)
	if (opts?.action) params.set('action', opts.action)
	const res = await fetch(`${CONVEX_URL}/api/admin/logs?${params.toString()}`)
	if (!res.ok) return { logs: [], hasMore: false }
	return res.json()
}

// ── Guests API ──────────────────────────────────────────────────────

export interface Guest {
	_id: string
	name: string
	extra?: string
	parkrunId?: string
	avatar?: Record<string, unknown>
	createdAt: number
	modifiedAt: number
}

export async function fetchAdminGuests(): Promise<Guest[]> {
	const token = getAuthToken()
	if (!token) return []
	const res = await fetch(
		`${CONVEX_URL}/api/admin/guests?token=${encodeURIComponent(token)}`,
	)
	if (!res.ok) return []
	return res.json()
}

export async function createGuest(data: {
	name: string
	extra?: string
	parkrunId?: string
	avatar?: Record<string, unknown>
}): Promise<{ id?: string; error?: string }> {
	const token = getAuthToken()
	if (!token) return { error: 'Not authenticated' }
	const res = await fetch(`${CONVEX_URL}/api/admin/guests`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ token, ...data }),
	})
	return res.json()
}

export async function updateGuest(
	guestId: string,
	data: {
		name?: string
		extra?: string
		parkrunId?: string
		avatar?: Record<string, unknown>
	},
): Promise<{ ok?: boolean; error?: string }> {
	const token = getAuthToken()
	if (!token) return { error: 'Not authenticated' }
	const res = await fetch(`${CONVEX_URL}/api/admin/guests`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ token, guestId, ...data }),
	})
	return res.json()
}

export async function deleteGuest(
	guestId: string,
): Promise<{ ok?: boolean; error?: string }> {
	const token = getAuthToken()
	if (!token) return { error: 'Not authenticated' }
	const res = await fetch(
		`${CONVEX_URL}/api/admin/guests?token=${encodeURIComponent(token)}&id=${encodeURIComponent(guestId)}`,
		{ method: 'DELETE' },
	)
	return res.json()
}

// ── Custom Racers API ───────────────────────────────────────────────

export type CustomRacerStatus = 'active' | 'pending' | 'hidden'

export interface AdminCustomRacer {
	_id: string
	name: string
	avatar: Record<string, unknown>
	speed: number
	/** Groups submissions from the same browser, even under different names. */
	secretId: string
	ip: string
	status: CustomRacerStatus
	/** Why the auto-block hid it — admin eyes only. */
	flagReason?: string
	editedByAdmin?: boolean
	createdAt: number
	expiresAt: number
}

export async function fetchAdminCustomRacers(): Promise<{
	racers: AdminCustomRacer[]
	approvalRequired: boolean
}> {
	const token = getAuthToken()
	if (!token) return { racers: [], approvalRequired: false }
	const res = await fetch(
		`${CONVEX_URL}/api/admin/custom-racers?token=${encodeURIComponent(token)}`,
	)
	if (!res.ok) return { racers: [], approvalRequired: false }
	return res.json()
}

export async function updateCustomRacer(
	racerId: string,
	data: { name?: string; status?: CustomRacerStatus },
): Promise<{ ok?: boolean; error?: string }> {
	const token = getAuthToken()
	if (!token) return { error: 'Not authenticated' }
	const res = await fetch(`${CONVEX_URL}/api/admin/custom-racers`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ token, racerId, ...data }),
	})
	return res.json()
}

export async function deleteCustomRacer(
	racerId: string,
): Promise<{ ok?: boolean; error?: string }> {
	const token = getAuthToken()
	if (!token) return { error: 'Not authenticated' }
	const res = await fetch(
		`${CONVEX_URL}/api/admin/custom-racers?token=${encodeURIComponent(token)}&id=${encodeURIComponent(racerId)}`,
		{ method: 'DELETE' },
	)
	return res.json()
}

/** Flip the "new racers wait for approval" switch, for if the feature gets abused. */
export async function setCustomRacerApproval(
	required: boolean,
): Promise<{ ok?: boolean; error?: string }> {
	const token = getAuthToken()
	if (!token) return { error: 'Not authenticated' }
	const res = await fetch(`${CONVEX_URL}/api/admin/custom-racers/approval`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ token, required }),
	})
	return res.json()
}

// ── Guest Results API ───────────────────────────────────────────────

export async function addGuestResult(data: {
	guestId: string
	event: string
	eventNumber: number
	position: number
	time: string
	date: string
}): Promise<{ ok?: boolean; error?: string }> {
	const token = getAuthToken()
	if (!token) return { error: 'Not authenticated' }
	const res = await fetch(`${CONVEX_URL}/api/admin/guest-result`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ token, ...data }),
	})
	return res.json()
}

export async function deleteGuestResult(
	resultId: string,
): Promise<{ ok?: boolean; error?: string }> {
	const token = getAuthToken()
	if (!token) return { error: 'Not authenticated' }
	const res = await fetch(
		`${CONVEX_URL}/api/admin/guest-result?token=${encodeURIComponent(token)}&id=${encodeURIComponent(resultId)}`,
		{ method: 'DELETE' },
	)
	return res.json()
}

// ── Admin Parkruns API ──────────────────────────────────────────────

export interface ParkrunEventItem {
	event: string
	eventName: string
	eventNumber: number
	date: string
	resultCount: number
	guestResults: {
		guestId: string
		guestName: string
		guestExtra?: string
		event: string
		eventNumber: number
		position: number
		time: string
		date: string
	}[]
}

export interface ParkrunEventsResult {
	items: ParkrunEventItem[]
	page: number
	totalPages: number
	total: number
}

export async function fetchAdminParkruns(
	page = 1,
	search = '',
): Promise<ParkrunEventsResult> {
	const token = getAuthToken()
	if (!token) return { items: [], page: 1, totalPages: 0, total: 0 }
	const params = new URLSearchParams({
		token,
		page: String(page),
		...(search ? { search } : {}),
	})
	const res = await fetch(`${CONVEX_URL}/api/admin/parkruns?${params}`)
	if (!res.ok) return { items: [], page: 1, totalPages: 0, total: 0 }
	return res.json()
}

// ── Notifications API ───────────────────────────────────────────────

export interface SentNotification {
	_id: string
	dedupeKey: string
	kind: string
	title: string | null
	body: string | null
	/** Devices that took it. Null while a send is still in flight. */
	sentCount: number | null
	sentAt: number
}

export interface ScheduledNotification {
	_id: string
	title: string
	body: string
	url: string
	sendAt: number
	status: 'scheduled' | 'sent' | 'cancelled'
	createdBy: string
	sentAt: number | null
	sentCount: number | null
}

export interface NotificationsOverview {
	sent: SentNotification[]
	hasMore: boolean
	scheduled: ScheduledNotification[]
	/** How many devices a send would reach right now. */
	subscribers: number
}

const EMPTY_OVERVIEW: NotificationsOverview = {
	sent: [],
	hasMore: false,
	scheduled: [],
	subscribers: 0,
}

export async function fetchNotifications(opts?: {
	limit?: number
	cursor?: number
}): Promise<NotificationsOverview> {
	const token = getAuthToken()
	if (!token) return EMPTY_OVERVIEW
	const params = new URLSearchParams({ token })
	if (opts?.limit) params.set('limit', String(opts.limit))
	if (opts?.cursor) params.set('cursor', String(opts.cursor))
	const res = await fetch(`${CONVEX_URL}/api/admin/notifications?${params}`)
	if (!res.ok) return EMPTY_OVERVIEW
	return res.json()
}

/** Shared shape for the three write calls, which all just report a problem. */
async function notificationPost(
	path: string,
	payload: Record<string, unknown>,
): Promise<{ error?: string }> {
	const token = getAuthToken()
	if (!token) return { error: 'Not signed in' }
	const res = await fetch(`${CONVEX_URL}${path}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ token, ...payload }),
	})
	const data = await res.json().catch(() => ({}))
	if (!res.ok) return { error: data?.error ?? `Failed (${res.status})` }
	return data
}

export function createNotification(input: {
	title: string
	body: string
	url?: string
	/** Epoch ms. Now, for an immediate send. */
	sendAt: number
}) {
	return notificationPost('/api/admin/notifications', input)
}

export function cancelNotification(id: string) {
	return notificationPost('/api/admin/notifications/cancel', { id })
}

/** Send the draft to this browser only, to see it before everyone does. */
export function previewNotification(input: {
	endpoint: string
	title: string
	body: string
	url?: string
}) {
	return notificationPost('/api/admin/notifications/preview', input)
}
