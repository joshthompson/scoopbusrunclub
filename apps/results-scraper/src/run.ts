/**
 * The run: walk the work list, capture each page, discover new courses, finish.
 *
 * Driven entirely by events rather than a loop, because the service worker is
 * terminated between page loads. Every main-frame document load in the scrape
 * tab calls `handleDocumentLoaded`, which decides whether that was the page we
 * were waiting for. That's also how captchas resolve themselves: solving one
 * navigates again, which lands here again.
 */
import { extractEvents, parseRunResults } from '@shared/parkrun-parsers'
import { courseKmzUrl, coursePageUrl } from '@shared/parkrun-urls'
import type {
	CapturedFile,
	ItemState,
	RunRequest,
	RunState,
} from '@shared/scraper-protocol'
import {
	clearLastDocument,
	describeError,
	detach,
	ensureAttached,
	getLastDocument,
	isBodyNotReady,
	markDocumentConsumed,
	readBody,
} from './capture'
import { startKeepalive, stopKeepalive } from './keepalive'
import { notifyFile, notifyState } from './messaging'
import {
	appendItems,
	getFiles,
	getRunState,
	getSession,
	putFile,
	resetAll,
	setItemStatus,
	setRunState,
	setSession,
	updateRunState,
	updateSession,
} from './state'
import { extractMapMid, validate } from './validate'

/** Give up on an item after this many failed attempts at the same URL. */
const MAX_ATTEMPTS = 8

/**
 * A page that has been `active` this long without producing a capture has
 * almost certainly had its load events missed — reload it rather than hang.
 */
const STALL_TIMEOUT_MS = 20_000

/** How often the watchdog looks for a stalled page. */
const WATCHDOG_ALARM = 'watchdog'
const WATCHDOG_PERIOD_MINUTES = 0.5

function log(...args: unknown[]): void {
	console.log('[results-scraper]', ...args)
}

/**
 * How long a blocked page sits before we reload it ourselves.
 *
 * A Cloudflare interstitial reloads itself once its check passes, so those clear
 * without help. A flat 403 doesn't, and would otherwise wait forever. Long
 * enough not to yank the page out from under someone mid-captcha.
 */
const RETRY_ALARM = 'retry-blocked'
const RETRY_DELAY_MINUTES = 1

async function scheduleRetry(): Promise<void> {
	await chrome.alarms
		.create(RETRY_ALARM, { delayInMinutes: RETRY_DELAY_MINUTES })
		.catch(() => {})
}

async function cancelScheduledRetry(): Promise<void> {
	await chrome.alarms.clear(RETRY_ALARM).catch(() => {})
}

/** Reload whatever page the run is stuck on. */
export async function retryCurrent(): Promise<RunState> {
	const state = await getRunState()
	if (state.status !== 'running' || !state.currentKey) return state

	const item = state.items.find((i) => i.key === state.currentKey)
	const session = await getSession()
	if (!item || session.scrapeTabId === undefined) return state

	await cancelScheduledRetry()
	await clearLastDocument(session.scrapeTabId)

	try {
		await ensureAttached(session.scrapeTabId)
		await chrome.tabs.update(session.scrapeTabId, { url: item.url })
	} catch (error) {
		return failRun(describeError(error))
	}
	return state
}

/** Abandon the current page and carry on with the next one. */
export async function skipCurrent(): Promise<RunState> {
	const state = await getRunState()
	if (state.status !== 'running' || !state.currentKey) return state

	await cancelScheduledRetry()
	await setItemStatus(state.currentKey, 'skipped', 'Skipped.')
	await notifyState(await getRunState())
	return advance()
}

/**
 * The scrape tab finished loading but we have no captured body for it.
 *
 * That means the debugger's Network events for this navigation never reached us —
 * a worker that was asleep at the wrong moment, most often. There's no way to ask
 * for a body after the fact, so the only recovery is to load the page again with
 * the worker now demonstrably awake. Doing it here rather than leaving it to the
 * watchdog turns a 20-second stall into about a second.
 */
export async function recoverMissedCapture(tabId: number): Promise<void> {
	const state = await getRunState()
	if (state.status !== 'running' || !state.currentKey) return

	const item = state.items.find((i) => i.key === state.currentKey)
	if (item?.status !== 'active') return

	// If a body is waiting, the normal path has it — nothing to recover.
	const document = await getLastDocument(tabId)
	if (document && !document.consumed) return

	const attempts = (item.attempts ?? 0) + 1
	if (attempts > MAX_ATTEMPTS) {
		await setItemStatus(
			item.key,
			'failed',
			`Page loaded but its response was never captured, after ${attempts} attempts.`,
			attempts,
		)
		await notifyState(await getRunState())
		await advance()
		return
	}

	log(
		`${item.label}: loaded but no response captured — reloading (attempt ${attempts})`,
	)
	await setItemStatus(
		item.key,
		'active',
		'Page loaded but the capture was missed — reloading.',
		attempts,
	)
	await notifyState(await getRunState())
	await retryCurrent()
}

/** Fired by the alarm: nudge a page that's still stuck. */
export async function retryIfStillBlocked(): Promise<void> {
	const state = await getRunState()
	if (state.status !== 'running' || !state.currentKey) return

	const item = state.items.find((i) => i.key === state.currentKey)
	if (item?.status !== 'blocked') return

	// Never reload a page the user is part-way through solving.
	if (item.awaitUser) {
		log(`${item.label}: still waiting for the user; not reloading`)
		return
	}

	const session = await getSession()
	if (session.attempts >= MAX_ATTEMPTS) {
		await setItemStatus(
			item.key,
			'failed',
			`${item.detail ?? 'Blocked.'} Gave up after ${session.attempts} attempts.`,
		)
		await notifyState(await getRunState())
		await advance()
		return
	}

	await retryCurrent()
}

// ── Starting and stopping ───────────────────────────────────────────

export async function startRun(
	request: RunRequest,
	adminTabId: number,
): Promise<RunState> {
	await resetAll()

	const items: ItemState[] = request.items.map((item) => ({
		...item,
		status: 'pending',
	}))

	if (items.length === 0) {
		const state: RunState = {
			status: 'error',
			items: [],
			message: 'Nothing to scrape.',
		}
		await setRunState(state)
		return state
	}

	// A dedicated tab keeps the admin page alive, so it can show progress and
	// take files as they arrive.
	const tab = await chrome.tabs.create({ url: 'about:blank', active: true })
	if (tab.id === undefined) throw new Error('Could not open a scrape tab')

	await setSession({
		adminTabId,
		scrapeTabId: tab.id,
		knownCourseEventIds: request.knownCourseEventIds,
		discoveredEvents: {},
		coursesQueued: false,
		skipCourses: request.skipCourses ?? false,
		attempts: 0,
	})

	const state: RunState = {
		status: 'running',
		items,
		startedAt: Date.now(),
	}
	await setRunState(state)

	try {
		await ensureAttached(tab.id)
	} catch (error) {
		return failRun(describeError(error))
	}

	await setBadge('…')
	startKeepalive()
	await chrome.alarms
		.create(WATCHDOG_ALARM, { periodInMinutes: WATCHDOG_PERIOD_MINUTES })
		.catch(() => {})
	log(`run started: ${items.length} items, scrape tab ${tab.id}`)
	return advance()
}

/**
 * Unstick a page whose load events never arrived.
 *
 * The debugger is the only source of capture events, and if the service worker
 * was asleep when they fired — or they were dropped — nothing else will ever
 * trigger. Reloading produces a fresh set.
 */
export async function checkForStall(): Promise<void> {
	const state = await getRunState()
	if (state.status !== 'running' || !state.currentKey) return

	const item = state.items.find((i) => i.key === state.currentKey)
	if (item?.status !== 'active') return

	const age = Date.now() - (item.updatedAt ?? 0)
	if (age < STALL_TIMEOUT_MS) return

	const attempts = (item.attempts ?? 0) + 1
	if (attempts > MAX_ATTEMPTS) {
		log(`giving up on ${item.label} after ${attempts} attempts`)
		await setItemStatus(
			item.key,
			'failed',
			`No response after ${attempts} attempts — page never finished loading.`,
			attempts,
		)
		await notifyState(await getRunState())
		await advance()
		return
	}

	log(
		`${item.label} stalled for ${Math.round(age / 1000)}s — reloading (attempt ${attempts})`,
	)
	await setItemStatus(
		item.key,
		'active',
		`No response after ${Math.round(age / 1000)}s — reloading (attempt ${attempts}).`,
		attempts,
	)
	await notifyState(await getRunState())
	await retryCurrent()
}

/**
 * Wipe the run and its captured files.
 *
 * Called once the admin page has uploaded, so reopening the page doesn't offer
 * to re-deliver pages whose data is already in the database.
 */
export async function forgetRun(): Promise<void> {
	await cancelScheduledRetry()
	stopKeepalive()
	await chrome.alarms.clear(WATCHDOG_ALARM).catch(() => {})
	const session = await getSession()
	if (session.scrapeTabId !== undefined) {
		await detach(session.scrapeTabId)
		await clearLastDocument(session.scrapeTabId)
	}
	await resetAll()
	await setBadge('')
	log('run cleared')
}

/**
 * Pick up a run that stopped early — cancelled, tab closed, debugger detached,
 * browser restarted.
 *
 * Deliberately not a fresh `startRun`: that would wipe the captured pages and
 * re-fetch everything. Instead the captured and skipped items are left alone and
 * everything else goes back to pending, so a scrape interrupted at page 7 of 18
 * costs 11 more page loads, not 18.
 */
export async function resumeRun(adminTabId: number): Promise<RunState> {
	const previous = await getRunState()
	if (previous.items.length === 0) {
		return failRun('There is no run to resume.')
	}

	const items: ItemState[] = previous.items.map((item) =>
		item.status === 'captured' || item.status === 'skipped'
			? item
			: {
					...item,
					status: 'pending' as const,
					detail: undefined,
					attempts: 0,
					awaitUser: undefined,
					updatedAt: Date.now(),
				},
	)

	const outstanding = items.filter((item) => item.status === 'pending').length
	if (outstanding === 0) {
		return failRun('Every page in that run is already captured or skipped.')
	}

	const tab = await chrome.tabs.create({ url: 'about:blank', active: true })
	if (tab.id === undefined) throw new Error('Could not open a scrape tab')

	// The session carries the events discovered by athlete pages we already have,
	// so the course hunt still knows about them without re-parsing anything.
	await updateSession((session) => ({
		...session,
		adminTabId,
		scrapeTabId: tab.id,
		attempts: 0,
	}))

	await setRunState({
		...previous,
		status: 'running',
		currentKey: undefined,
		items,
		message: undefined,
		finishedAt: undefined,
	})

	try {
		await ensureAttached(tab.id)
	} catch (error) {
		return failRun(describeError(error))
	}

	await setBadge('…')
	startKeepalive()
	await chrome.alarms
		.create(WATCHDOG_ALARM, { periodInMinutes: WATCHDOG_PERIOD_MINUTES })
		.catch(() => {})
	log(`resuming: ${outstanding} of ${items.length} pages still needed`)
	return advance()
}

export async function cancelRun(): Promise<RunState> {
	await cancelScheduledRetry()
	stopKeepalive()
	await chrome.alarms.clear(WATCHDOG_ALARM).catch(() => {})

	const state = await getRunState()
	const cancelled: RunState = {
		...state,
		status: 'cancelled',
		currentKey: undefined,
		finishedAt: Date.now(),
		message: 'Cancelled.',
	}
	// Status first, then the tab — see finishRun.
	await setRunState(cancelled)
	await closeScrapeTab()
	await setBadge('')
	await focusAdminTab()
	await notifyState(cancelled)
	return cancelled
}

async function failRun(message: string): Promise<RunState> {
	stopKeepalive()
	const state = await getRunState()
	const failed: RunState = {
		...state,
		status: 'error',
		currentKey: undefined,
		finishedAt: Date.now(),
		message,
	}
	await setRunState(failed)
	await setBadge('!')
	await notifyState(failed)
	return failed
}

// ── Moving through the queue ────────────────────────────────────────

/** Navigate to the next pending item, or finish if there are none left. */
export async function advance(): Promise<RunState> {
	const state = await getRunState()
	if (state.status !== 'running') return state

	const next = state.items.find((item) => item.status === 'pending')

	if (!next) {
		// Athlete pages are done — is there course work to add before finishing?
		const queued = await queueNewCourses()
		if (queued) return advance()
		return finishRun()
	}

	const session = await getSession()
	if (session.scrapeTabId === undefined) {
		return failRun('The scrape tab is gone.')
	}

	await cancelScheduledRetry()
	await updateSession((s) => ({ ...s, attempts: 0 }))
	await clearLastDocument(session.scrapeTabId)

	const running: RunState = {
		...state,
		currentKey: next.key,
		items: state.items.map((item) =>
			item.key === next.key
				? {
						...item,
						status: 'active',
						detail: 'Loading…',
						attempts: 0,
						updatedAt: Date.now(),
					}
				: item,
		),
		message: undefined,
	}
	await setRunState(running)
	await notifyState(running)

	log(`→ ${next.label}: ${next.url}`)

	try {
		await ensureAttached(session.scrapeTabId)
		await chrome.tabs.update(session.scrapeTabId, { url: next.url })
	} catch (error) {
		return failRun(describeError(error))
	}

	return running
}

/**
 * Called for every finished main-frame document in the scrape tab.
 *
 * Ignores anything that isn't the page the current item asked for — parkrun
 * redirects, and a challenge page can navigate a few times before settling.
 */
export async function handleDocumentLoaded(tabId: number): Promise<void> {
	const state = await getRunState()
	if (state.status !== 'running' || !state.currentKey) return

	const session = await getSession()
	if (session.scrapeTabId !== tabId) return

	const item = state.items.find((i) => i.key === state.currentKey)
	if (!item) return

	// Deliberately not requiring `finished`: this runs from the debugger's
	// loadingFinished event *and* from tabs.onUpdated, because the debugger events
	// are not reliably delivered — a run would otherwise sit on "Loading…" until
	// the watchdog noticed. Whichever trigger arrives first with a readable body
	// wins, and a body that isn't ready yet is simply waited out.
	const document = await getLastDocument(tabId)
	if (!document || document.consumed) return

	let captured: Awaited<ReturnType<typeof readBody>>
	try {
		captured = await readBody(tabId, document)
	} catch (error) {
		if (isBodyNotReady(error)) return

		const attempts = (
			await updateSession((s) => ({ ...s, attempts: s.attempts + 1 }))
		).attempts
		log(`${item.label}: could not read body — ${describeError(error)}`)
		if (attempts >= MAX_ATTEMPTS) {
			await setItemStatus(item.key, 'failed', describeError(error), attempts)
			await notifyState(await getRunState())
			await advance()
		}
		return
	}

	const attempts = (
		await updateSession((s) => ({ ...s, attempts: s.attempts + 1 }))
	).attempts

	const verdict = validate(item.kind, item.key, captured.status, captured.body)
	log(
		`${item.label}: HTTP ${captured.status}, ${captured.body.length} bytes → ${verdict.outcome} (${verdict.detail})`,
	)

	if (verdict.outcome === 'blocked') {
		// A challenge with something on screen to solve: wait indefinitely, and
		// crucially do NOT reload — that would wipe out a half-finished captcha.
		// Solving it navigates the page, which brings us back here by itself.
		if (verdict.awaitUser) {
			log(`${item.label}: waiting for the user to clear a challenge`)
			await cancelScheduledRetry()
			await updateRunState((current) => ({
				...current,
				items: current.items.map((i) =>
					i.key === item.key
						? {
								...i,
								status: 'blocked' as const,
								detail: verdict.detail,
								attempts,
								awaitUser: true,
								updatedAt: Date.now(),
							}
						: i,
				),
			}))
			await notifyState(await getRunState())
			return
		}

		if (attempts >= MAX_ATTEMPTS) {
			await setItemStatus(
				item.key,
				'failed',
				`${verdict.detail} Gave up after ${attempts} attempts.`,
			)
			await notifyState(await getRunState())
			await advance()
			return
		}
		await setItemStatus(
			item.key,
			'blocked',
			`${verdict.detail} (attempt ${attempts} of ${MAX_ATTEMPTS}; retrying automatically)`,
			attempts,
		)
		await notifyState(await getRunState())
		await scheduleRetry()
		return
	}

	if (verdict.outcome === 'unusable') {
		await setItemStatus(item.key, 'failed', verdict.detail)
		await notifyState(await getRunState())
		await advance()
		return
	}

	// --- Captured something usable ---

	// Claim it before doing anything else, so the other trigger bows out.
	await markDocumentConsumed(tabId, document)

	if (item.kind === 'course') {
		await handleCoursePage(item, captured.body)
	} else {
		await deliver({
			kind: item.kind,
			key: item.key,
			name: fileNameFor(item.kind, item.key),
			text: captured.body,
		})
		if (item.kind === 'athlete') await recordEvents(captured.body)
		await setItemStatus(item.key, 'captured', verdict.detail)
	}

	await notifyState(await getRunState())
	await advance()
}

// ── Courses ─────────────────────────────────────────────────────────

/**
 * A course page only tells us the map id; the KMZ comes from Google, which
 * serves it to a plain fetch — no navigation, no cookies.
 */
async function handleCoursePage(item: ItemState, html: string): Promise<void> {
	const mid = extractMapMid(html)
	if (!mid) {
		await setItemStatus(item.key, 'failed', 'No map id on the course page.')
		return
	}

	try {
		const response = await fetch(courseKmzUrl(mid))
		if (!response.ok) throw new Error(`Google replied ${response.status}`)

		const bytes = new Uint8Array(await response.arrayBuffer())
		if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
			throw new Error('Downloaded file is not a KMZ archive')
		}

		await deliver({
			kind: 'course',
			key: item.key,
			name: `${item.key}.kmz`,
			base64: toBase64(bytes),
		})
		await setItemStatus(
			item.key,
			'captured',
			`KMZ downloaded (${Math.round(bytes.length / 1024)} KB)`,
		)
	} catch (error) {
		await setItemStatus(
			item.key,
			'failed',
			`Couldn't download the KMZ: ${describeError(error)}`,
		)
	}
}

/** Remember every event an athlete page mentions, for the course hunt. */
async function recordEvents(html: string): Promise<void> {
	const events = extractEvents(parseRunResults(html))
	if (events.length === 0) return

	await updateSession((session) => {
		const discovered = { ...session.discoveredEvents }
		for (const event of events) {
			if (!discovered[event.eventId]) {
				discovered[event.eventId] = { name: event.name, url: event.url }
			}
		}
		return { ...session, discoveredEvents: discovered }
	})
}

/**
 * Extend the queue with a course page per event that has no map yet. Runs once,
 * after the athlete pages, since that's when we know which events exist.
 */
async function queueNewCourses(): Promise<boolean> {
	const session = await getSession()
	if (session.coursesQueued || session.skipCourses) return false

	await updateSession((s) => ({ ...s, coursesQueued: true }))

	const known = new Set(session.knownCourseEventIds)
	const state = await getRunState()
	const alreadyQueued = new Set(
		state.items.filter((i) => i.kind === 'course').map((i) => i.key),
	)

	const items: ItemState[] = Object.entries(session.discoveredEvents)
		.filter(([eventId]) => !known.has(eventId) && !alreadyQueued.has(eventId))
		.map(([eventId, event]) => ({
			kind: 'course' as const,
			key: eventId,
			label: `${event.name} course map`,
			url: coursePageUrl(event.url),
			status: 'pending' as const,
		}))
		.sort((a, b) => a.label.localeCompare(b.label))

	if (items.length === 0) return false

	const next = await appendItems(items)
	await notifyState(next)
	return true
}

// ── Finishing ───────────────────────────────────────────────────────

async function finishRun(): Promise<RunState> {
	await cancelScheduledRetry()
	stopKeepalive()
	await chrome.alarms.clear(WATCHDOG_ALARM).catch(() => {})

	// Anything not in a terminal state at this point never completed; call it a
	// failure rather than quietly reporting success for a page we never got.
	const settled = await updateRunState((current) => ({
		...current,
		items: current.items.map((item) =>
			item.status === 'captured' ||
			item.status === 'failed' ||
			item.status === 'skipped'
				? item
				: {
						...item,
						status: 'failed' as const,
						detail: item.detail ?? 'Never completed.',
					},
		),
	}))

	const state = settled
	const captured = state.items.filter((i) => i.status === 'captured').length
	const failed = state.items.filter((i) => i.status === 'failed').length

	const done: RunState = {
		...state,
		status: 'done',
		currentKey: undefined,
		finishedAt: Date.now(),
		message: failed
			? `Captured ${captured} of ${state.items.length}; ${failed} failed.`
			: `Captured all ${captured} pages.`,
	}
	// The terminal status is written *before* the tab is closed. Closing it first
	// fires tabs.onRemoved while the run still reads as "running", and that handler
	// would overwrite this with "the scrape tab was closed" — reporting a finished
	// scrape as cancelled.
	await setRunState(done)
	await closeScrapeTab()
	await setBadge(failed ? String(failed) : '')
	await focusAdminTab()
	await notifyState(done)
	await notifyFinished(done)
	return done
}

/** Detach and close the scrape tab. Only call once a terminal status is stored. */
async function closeScrapeTab(): Promise<void> {
	const { scrapeTabId } = await getSession()
	if (scrapeTabId === undefined) return
	await detach(scrapeTabId)
	await clearLastDocument(scrapeTabId)
	await chrome.tabs.remove(scrapeTabId).catch(() => {})
}

/** The run is over — hand the admin page focus back. */
async function focusAdminTab(): Promise<void> {
	const { adminTabId } = await getSession()
	if (adminTabId === undefined) return
	try {
		const tab = await chrome.tabs.get(adminTabId)
		await chrome.tabs.update(adminTabId, { active: true })
		if (tab.windowId !== undefined) {
			await chrome.windows.update(tab.windowId, { focused: true })
		}
	} catch {
		// The admin tab was closed; files stay in storage for the next visit.
	}
}

async function notifyFinished(state: RunState): Promise<void> {
	const { adminTabId } = await getSession()
	if (adminTabId === undefined) return
	await chrome.tabs
		.sendMessage(adminTabId, { type: 'finished', state })
		.catch(() => {})
}

// ── Delivery ────────────────────────────────────────────────────────

/** Persist a captured file and push it to the admin page straight away. */
async function deliver(file: CapturedFile): Promise<void> {
	await putFile(file)
	await notifyFile(file)
}

/** Re-send everything captured so far, e.g. after the admin page reloaded. */
export async function resendFiles(): Promise<void> {
	for (const file of await getFiles()) await notifyFile(file)
}

function fileNameFor(kind: CapturedFile['kind'], key: string): string {
	switch (kind) {
		case 'athlete':
			return `athlete-${key}.html`
		case 'event':
			return `${key}-latest-results.html`
		case 'clubs':
			return 'largest-clubs.html'
		default:
			return `${key}.kmz`
	}
}

function toBase64(bytes: Uint8Array): string {
	let binary = ''
	// Chunked to stay well clear of the argument limit on large archives.
	for (let i = 0; i < bytes.length; i += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
	}
	return btoa(binary)
}

async function setBadge(text: string): Promise<void> {
	await chrome.action.setBadgeText({ text }).catch(() => {})
}
