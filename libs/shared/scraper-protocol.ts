/**
 * The contract between the Process Results admin page and the results-scraper
 * Chrome extension.
 *
 * The page is the brain: it knows who we track, which pages are needed and which
 * courses we already have, and it builds the work list. The extension is the
 * executor: it navigates, captures raw HTML, and streams files back. Neither
 * side hardcodes the other's knowledge, so adding a runner or an event needs no
 * extension change.
 *
 * Messages travel page ↔ content script by window.postMessage (wrapped in an
 * envelope so we ignore everything else on the channel) and content script ↔
 * service worker by chrome.runtime messaging.
 */

export const SCRAPER_PROTOCOL_VERSION = 1

/** Envelope marker, so postMessage traffic from anything else is ignored. */
export const SCRAPER_ENVELOPE = 'scoopbus-results-scraper'

// ── Work list ───────────────────────────────────────────────────────

/** Which upload field a captured file belongs to. */
export type CaptureKind = 'athlete' | 'event' | 'clubs' | 'course'

/** The single form slot that holds the largest-clubs page. */
export const CLUBS_KEY = 'clubs'

export interface WorkItem {
	kind: CaptureKind
	/** Matches the form slot: parkrunId, eventId, or CLUBS_KEY. */
	key: string
	/** Human label for the progress UI, e.g. "Josh" or "Haga Full Results". */
	label: string
	url: string
}

export interface RunRequest {
	items: WorkItem[]
	/**
	 * Event IDs that already have course data. Anything an athlete page turns up
	 * that isn't in here gets its course page queued mid-run.
	 */
	knownCourseEventIds: string[]
	/** Skip the mid-run hunt for new course maps. */
	skipCourses?: boolean
}

// ── Run state ───────────────────────────────────────────────────────

export type ItemStatus =
	| 'pending'
	| 'active'
	/** Loaded, but blocked — usually a captcha or bot check awaiting the user. */
	| 'blocked'
	| 'captured'
	| 'failed'
	| 'skipped'

export interface ItemState extends WorkItem {
	status: ItemStatus
	/** One-line detail for the UI: what was parsed, or why it failed. */
	detail?: string
	/** How many times this page has been loaded, for stalls and retries. */
	attempts?: number
	/** Epoch ms when this item last changed, so a watchdog can spot a stall. */
	updatedAt?: number
	/**
	 * There's an interactive challenge on screen. Nothing may reload the page or
	 * time the item out while this is set — the person is mid-captcha.
	 */
	awaitUser?: boolean
}

export type RunStatus = 'idle' | 'running' | 'done' | 'cancelled' | 'error'

export interface RunState {
	status: RunStatus
	items: ItemState[]
	/** Key of the item being worked on, if any. */
	currentKey?: string
	message?: string
	startedAt?: number
	finishedAt?: number
}

export function emptyRunState(): RunState {
	return { status: 'idle', items: [] }
}

// ── Captured files ──────────────────────────────────────────────────

export interface CapturedFile {
	kind: CaptureKind
	key: string
	/** Filename handed to the form, so it reads like a normal upload. */
	name: string
	/** UTF-8 text for HTML pages. */
	text?: string
	/** Base64 for binary payloads (KMZ). */
	base64?: string
}

// ── Messages ────────────────────────────────────────────────────────

export type PageMessage =
	/** Is the extension installed? */
	| { type: 'ping' }
	| { type: 'start'; request: RunRequest }
	| { type: 'cancel' }
	/**
	 * Pick an interrupted run back up. Everything already captured is kept; only
	 * the pages that never landed are queued again.
	 */
	| { type: 'resume' }
	/** Reload the page we're stuck on. */
	| { type: 'retry' }
	/** Give up on the current page and move to the next. */
	| { type: 'skip' }
	/** Re-deliver everything captured so far (after a page reload). */
	| { type: 'resend' }
	/**
	 * Throw the run away. Sent once an upload has landed, so a reload doesn't
	 * resurrect a scrape whose data is already in the database.
	 */
	| { type: 'clear' }

export type ExtensionMessage =
	| { type: 'hello'; version: number; state: RunState }
	| { type: 'state'; state: RunState }
	| { type: 'file'; file: CapturedFile }
	| { type: 'finished'; state: RunState }

/**
 * Every message the page may send, as a runtime list.
 *
 * The bridge content script forwards only these, so it needs the set at runtime
 * — and it used to keep its own copy, which silently fell behind as messages
 * were added: `retry`, `skip`, `resume` and `clear` were all being dropped
 * without a trace. The exhaustiveness check below makes leaving one out a
 * compile error instead.
 */
export const PAGE_MESSAGE_TYPES = [
	'ping',
	'start',
	'resume',
	'retry',
	'skip',
	'cancel',
	'resend',
	'clear',
] as const

export type PageMessageType = (typeof PAGE_MESSAGE_TYPES)[number]

/** Fails to compile if PAGE_MESSAGE_TYPES and PageMessage drift apart. */
type AssertSameMessageTypes = PageMessage['type'] extends PageMessageType
	? PageMessageType extends PageMessage['type']
		? true
		: never
	: never
const _messageTypesMatch: AssertSameMessageTypes = true
void _messageTypesMatch

export function isPageMessageType(value: string): value is PageMessageType {
	return (PAGE_MESSAGE_TYPES as readonly string[]).includes(value)
}

export interface ScraperEnvelope<T> {
	channel: typeof SCRAPER_ENVELOPE
	direction: 'to-extension' | 'to-page'
	payload: T
}

export function wrapForExtension(
	payload: PageMessage,
): ScraperEnvelope<PageMessage> {
	return { channel: SCRAPER_ENVELOPE, direction: 'to-extension', payload }
}

export function wrapForPage(
	payload: ExtensionMessage,
): ScraperEnvelope<ExtensionMessage> {
	return { channel: SCRAPER_ENVELOPE, direction: 'to-page', payload }
}

function isEnvelope(data: unknown): data is ScraperEnvelope<unknown> {
	return (
		typeof data === 'object' &&
		data !== null &&
		(data as { channel?: unknown }).channel === SCRAPER_ENVELOPE
	)
}

export function readPageMessage(data: unknown): PageMessage | null {
	if (!isEnvelope(data) || data.direction !== 'to-extension') return null
	return data.payload as PageMessage
}

export function readExtensionMessage(data: unknown): ExtensionMessage | null {
	if (!isEnvelope(data) || data.direction !== 'to-page') return null
	return data.payload as ExtensionMessage
}
