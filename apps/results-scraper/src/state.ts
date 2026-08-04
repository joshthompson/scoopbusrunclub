/**
 * Run state and captured files, persisted in chrome.storage.local.
 *
 * Everything lives in storage rather than in module scope because an MV3 service
 * worker is terminated whenever it goes idle — which it will, repeatedly, across
 * a run that waits on page loads and captchas. Each wake-up reads state back and
 * carries on.
 *
 * `unlimitedStorage` is declared in the manifest: fifteen athlete pages is well
 * past chrome.storage.local's usual 10 MB cap.
 */
import type {
	CapturedFile,
	ItemState,
	ItemStatus,
	RunState,
} from '@shared/scraper-protocol'
import { emptyRunState } from '@shared/scraper-protocol'

const RUN_KEY = 'run'
const FILES_KEY = 'files'
const SESSION_KEY = 'session'

/** Bookkeeping the UI never sees. */
export interface RunSession {
	adminTabId?: number
	scrapeTabId?: number
	/** Event IDs that already had course data before the run started. */
	knownCourseEventIds: string[]
	/** Events found on athlete pages: eventId → base URL and display name. */
	discoveredEvents: Record<string, { name: string; url: string }>
	/** Set once the queue has been extended with course pages. */
	coursesQueued: boolean
	skipCourses: boolean
	/** Consecutive capture attempts for the current item, to stop loops. */
	attempts: number
}

function emptySession(): RunSession {
	return {
		knownCourseEventIds: [],
		discoveredEvents: {},
		coursesQueued: false,
		skipCourses: false,
		attempts: 0,
	}
}

// ── Run state ───────────────────────────────────────────────────────

export async function getRunState(): Promise<RunState> {
	const stored = await chrome.storage.local.get<{ run?: RunState }>(RUN_KEY)
	return stored.run ?? emptyRunState()
}

export async function setRunState(state: RunState): Promise<void> {
	await chrome.storage.local.set({ [RUN_KEY]: state })
}

/** Apply a change to the stored state and return what was written. */
export async function updateRunState(
	change: (state: RunState) => RunState,
): Promise<RunState> {
	const next = change(await getRunState())
	await setRunState(next)
	return next
}

export async function setItemStatus(
	key: string,
	status: ItemStatus,
	detail?: string,
	attempts?: number,
): Promise<RunState> {
	return updateRunState((state) => ({
		...state,
		items: state.items.map((item) =>
			item.key === key
				? {
						...item,
						status,
						detail,
						attempts: attempts ?? item.attempts,
						updatedAt: Date.now(),
					}
				: item,
		),
	}))
}

export async function appendItems(items: ItemState[]): Promise<RunState> {
	return updateRunState((state) => ({
		...state,
		items: [...state.items, ...items],
	}))
}

// ── Session ─────────────────────────────────────────────────────────

export async function getSession(): Promise<RunSession> {
	const stored = await chrome.storage.local.get<{ session?: RunSession }>(
		SESSION_KEY,
	)
	return stored.session ?? emptySession()
}

export async function setSession(session: RunSession): Promise<void> {
	await chrome.storage.local.set({ [SESSION_KEY]: session })
}

export async function updateSession(
	change: (session: RunSession) => RunSession,
): Promise<RunSession> {
	const next = change(await getSession())
	await setSession(next)
	return next
}

// ── Captured files ──────────────────────────────────────────────────

export async function getFiles(): Promise<CapturedFile[]> {
	const stored = await chrome.storage.local.get<{ files?: CapturedFile[] }>(
		FILES_KEY,
	)
	return stored.files ?? []
}

/** Store a captured file, replacing any earlier capture for the same slot. */
export async function putFile(file: CapturedFile): Promise<void> {
	const files = await getFiles()
	const existing = files.findIndex(
		(f) => f.kind === file.kind && f.key === file.key,
	)
	if (existing === -1) files.push(file)
	else files[existing] = file
	await chrome.storage.local.set({ [FILES_KEY]: files })
}

// ── Lifecycle ───────────────────────────────────────────────────────

export async function resetAll(): Promise<void> {
	await chrome.storage.local.remove([RUN_KEY, FILES_KEY, SESSION_KEY])
}
