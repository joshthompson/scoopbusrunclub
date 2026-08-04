/**
 * Raw response-body capture via chrome.debugger.
 *
 * This is the only way an MV3 extension can read a navigation's *raw* HTML.
 * It matters because parkrun's cookie-consent script rewrites the DOM: course
 * pages lose the Google Maps iframe entirely, so a DOM scrape has no map id to
 * find (see apps/api/lib/map-scraper.ts). Athlete and event pages parse either
 * way, but there's no reason to have two code paths.
 *
 * Things that were tried and don't work:
 *  - `Page.getResourceContent` → "Content unavailable. Resource was not cached",
 *    even with the Network domain enabled.
 *  - Navigating to a `view-source:` URL → the tab does load, but script
 *    injection into it hangs forever, so the text can never be read back.
 *
 * What does work is watching Network events for the main-frame document and
 * asking for its body once it finishes loading. Document request IDs are written
 * to storage as they're seen, so a body can still be fetched after the service
 * worker has been restarted.
 */

const DEBUGGER_VERSION = '1.3'

const DOC_KEY = 'lastDocument'

export interface DocumentResponse {
	requestId: string
	url: string
	status: number
	/** True once loadingFinished has been seen, i.e. the body is available. */
	finished: boolean
	/**
	 * Set once this response has been captured. Both capture triggers can fire for
	 * the same load; without this the page is captured twice and the queue is
	 * advanced twice, which skips the next item.
	 */
	consumed?: boolean
}

export interface CapturedBody {
	url: string
	status: number
	body: string
	base64Encoded: boolean
}

// ── Attach / detach ─────────────────────────────────────────────────

/**
 * Attach and enable the Network domain, idempotently.
 *
 * Deliberately does *not* consult `chrome.debugger.getTargets()` to decide
 * whether to attach: its `attached` flag is true when *any* CDP client is
 * connected, including the user's DevTools and any automation driving the
 * browser. Trusting it means silently skipping our own attach and then capturing
 * nothing. Instead we always try, and let the follow-up command tell us whether
 * we really hold the session — if someone else does, `Network.enable` fails and
 * the error surfaces.
 */
export async function attach(tabId: number): Promise<void> {
	try {
		await chrome.debugger.attach({ tabId }, DEBUGGER_VERSION)
	} catch (error) {
		// "Already attached" is expected when it's our own session being reused.
		if (!/already attached/i.test(describeError(error))) throw error
	}

	// Network must be enabled for response bodies to be retained at all. This is
	// also the real test of whether the session is ours.
	await chrome.debugger.sendCommand({ tabId }, 'Network.enable')
}

export async function detach(tabId: number): Promise<void> {
	try {
		await chrome.debugger.detach({ tabId })
	} catch {
		// Already gone — the tab was closed, or Chrome detached us.
	}
}

/** Re-attach if a service worker restart or a detach lost the session. */
export async function ensureAttached(tabId: number): Promise<void> {
	try {
		await attach(tabId)
	} catch (error) {
		throw new Error(
			`Couldn't attach the debugger to the scrape tab: ${describeError(error)}. If DevTools is open on it, close them and press Scrape again.`,
		)
	}
}

// ── Tracking the main-frame document ────────────────────────────────

/**
 * Note a main-frame document response. Redirect chains produce several, so the
 * most recent one wins.
 */
export async function noteDocumentResponse(
	tabId: number,
	params: Record<string, unknown>,
): Promise<void> {
	if (params.type !== 'Document') return

	const response = params.response as { url?: string; status?: number }
	const requestId = params.requestId as string
	if (!requestId || !response?.url) return

	// Subframe documents (ads, embeds) also arrive here; only the main frame's
	// document has a frameId matching the tab's own top frame. `frameId` is
	// present on responseReceived, and the main frame's id equals the tab target,
	// which we can't compare directly — so filter on the loaderId instead: the
	// main-frame navigation is the one whose loaderId matches its own requestId.
	// Chrome sets these equal for main-frame document requests.
	if (params.loaderId && params.loaderId !== requestId) return

	await setLastDocument(tabId, {
		requestId,
		url: response.url,
		status: response.status ?? 0,
		finished: false,
	})
}

export async function noteLoadingFinished(
	tabId: number,
	params: Record<string, unknown>,
): Promise<DocumentResponse | null> {
	const last = await getLastDocument(tabId)
	if (!last || last.requestId !== params.requestId) return null

	const finished = { ...last, finished: true }
	await setLastDocument(tabId, finished)
	return finished
}

/**
 * True when `Network.getResponseBody` failed only because the body isn't there
 * yet, as opposed to being gone for good.
 *
 * Worth distinguishing because we also try to read bodies off `tabs.onUpdated`,
 * which can land marginally before the body is available. A "not ready" is
 * something to wait out; anything else means this attempt is spent.
 */
export function isBodyNotReady(error: unknown): boolean {
	return /no resource with given identifier|no data found/i.test(
		describeError(error),
	)
}

export async function getLastDocument(
	tabId: number,
): Promise<DocumentResponse | null> {
	const stored = await chrome.storage.local.get<
		Record<string, DocumentResponse>
	>(`${DOC_KEY}:${tabId}`)
	return stored[`${DOC_KEY}:${tabId}`] ?? null
}

async function setLastDocument(
	tabId: number,
	value: DocumentResponse,
): Promise<void> {
	await chrome.storage.local.set({ [`${DOC_KEY}:${tabId}`]: value })
}

/** Mark the current document as captured, so a second trigger is a no-op. */
export async function markDocumentConsumed(
	tabId: number,
	document: DocumentResponse,
): Promise<void> {
	await setLastDocument(tabId, { ...document, consumed: true })
}

export async function clearLastDocument(tabId: number): Promise<void> {
	await chrome.storage.local.remove(`${DOC_KEY}:${tabId}`)
}

// ── Reading the body ────────────────────────────────────────────────

export async function readBody(
	tabId: number,
	document: DocumentResponse,
): Promise<CapturedBody> {
	const result = await chrome.debugger.sendCommand<{
		body: string
		base64Encoded: boolean
	}>({ tabId }, 'Network.getResponseBody', { requestId: document.requestId })

	return {
		url: document.url,
		status: document.status,
		body: result.base64Encoded ? decodeBase64(result.body) : result.body,
		base64Encoded: result.base64Encoded,
	}
}

/** Chrome hands back base64 for anything it doesn't consider text. */
function decodeBase64(base64: string): string {
	const binary = atob(base64)
	const bytes = new Uint8Array(binary.length)
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
	return new TextDecoder().decode(bytes)
}

export function describeError(error: unknown): string {
	if (error instanceof Error) return error.message
	if (typeof error === 'string') return error
	return JSON.stringify(error)
}
