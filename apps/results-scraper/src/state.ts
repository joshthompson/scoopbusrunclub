/**
 * Run state and captured files, persisted in chrome.storage.local.
 *
 * Everything lives in storage rather than in module scope because an MV3 service
 * worker is terminated whenever it goes idle — which it will, repeatedly, across
 * a run that waits on page loads and captchas. Each wake-up reads state back and
 * carries on.
 *
 * `unlimitedStorage` is declared in the manifest: fifteen athlete pages is well
 * past chrome.storage.local's usual 10 MB cap, and a volunteer backfill is
 * hundreds of event pages.
 */
import type {
	CapturedFile,
	ItemState,
	ItemStatus,
	RunState,
} from '@shared/scraper-protocol'
import { emptyRunState } from '@shared/scraper-protocol'

const RUN_KEY = 'run'
const SESSION_KEY = 'session'
/** Storage keys of the captured files, in capture order. */
const FILE_INDEX_KEY = 'fileKeys'
/** Where version 1 kept every file, in one array. Only ever removed now. */
const LEGACY_FILES_KEY = 'files'

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
	/** Rough wait between pages, from the run request. */
	pauseMs?: number
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
//
// One storage key per file. They used to share a single array, which meant
// rewriting every page captured so far on each capture — fine for twenty pages,
// quadratic for a few hundred.

function fileStorageKey(file: Pick<CapturedFile, 'kind' | 'key'>): string {
	return `file:${file.kind}:${file.key}`
}

async function getFileIndex(): Promise<string[]> {
	const stored = await chrome.storage.local.get<{ fileKeys?: string[] }>(
		FILE_INDEX_KEY,
	)
	return stored.fileKeys ?? []
}

export async function getFiles(): Promise<CapturedFile[]> {
	const index = await getFileIndex()
	if (index.length === 0) return []
	const stored =
		await chrome.storage.local.get<Record<string, CapturedFile | undefined>>(
			index,
		)
	return index.flatMap((key) => stored[key] ?? [])
}

/** Store a captured file, replacing any earlier capture for the same slot. */
export async function putFile(file: CapturedFile): Promise<void> {
	const storageKey = fileStorageKey(file)
	// The file before the index, so the index never names something missing.
	await chrome.storage.local.set({ [storageKey]: file })
	const index = await getFileIndex()
	if (!index.includes(storageKey)) {
		await chrome.storage.local.set({ [FILE_INDEX_KEY]: [...index, storageKey] })
	}
}

// ── Lifecycle ───────────────────────────────────────────────────────

export async function resetAll(): Promise<void> {
	await chrome.storage.local.remove([
		RUN_KEY,
		SESSION_KEY,
		FILE_INDEX_KEY,
		LEGACY_FILES_KEY,
		...(await getFileIndex()),
	])
}
