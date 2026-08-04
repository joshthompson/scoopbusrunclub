/**
 * Service worker: the extension's only long-lived logic, except it isn't
 * long-lived at all — Chrome terminates it whenever it goes idle.
 *
 * Every listener below is registered synchronously at the top level. That's what
 * makes the run survive: a registered listener causes Chrome to *start* the
 * worker to deliver its event, so the debugger events and messages that drive a
 * run wake it back up. All state lives in chrome.storage (see state.ts), never
 * in module scope.
 */
import {
	type PageMessage,
	SCRAPER_PROTOCOL_VERSION,
} from '@shared/scraper-protocol'
import { detach, noteDocumentResponse, noteLoadingFinished } from './capture'
import {
	isFromAdminPage,
	openAdminPage,
	rememberAdminOrigin,
} from './openAdmin'
import {
	advance,
	cancelRun,
	checkForStall,
	forgetRun,
	handleDocumentLoaded,
	recoverMissedCapture,
	resendFiles,
	resumeRun,
	retryCurrent,
	retryIfStillBlocked,
	skipCurrent,
	startRun,
} from './run'
import { serial } from './serial'
import { getRunState, getSession, setRunState } from './state'

// ── Messages from content scripts ───────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	// Note where the admin page lives, so the toolbar icon can reopen it. Bridge
	// traffic only — the overlay's messages come from parkrun pages.
	if (isFromAdminPage(message)) {
		void rememberAdminOrigin(sender.url ?? sender.origin)
	}

	// Returning true keeps the response channel open for the async work below.
	handleMessage(message as PageMessage | { type: string }, sender)
		.then(sendResponse)
		.catch((error) => sendResponse({ error: String(error) }))
	return true
})

async function handleMessage(
	message: PageMessage | { type: string },
	sender: { tab?: { id?: number } },
): Promise<unknown> {
	switch (message.type) {
		case 'ping':
			return {
				type: 'hello',
				version: SCRAPER_PROTOCOL_VERSION,
				state: await getRunState(),
			}

		case 'state?':
			return { type: 'state', state: await getRunState() }

		case 'start': {
			const adminTabId = sender.tab?.id
			if (adminTabId === undefined) return { error: 'No calling tab' }
			const request = (message as Extract<PageMessage, { type: 'start' }>)
				.request
			const state = await startRun(request, adminTabId)
			return { type: 'state', state }
		}

		case 'resume': {
			const adminTabId = sender.tab?.id
			if (adminTabId === undefined) return { error: 'No calling tab' }
			return { type: 'state', state: await resumeRun(adminTabId) }
		}

		case 'cancel':
			return { type: 'state', state: await cancelRun() }

		case 'retry':
			return { type: 'state', state: await retryCurrent() }

		case 'skip':
			return { type: 'state', state: await skipCurrent() }

		case 'resend':
			await resendFiles()
			return { type: 'state', state: await getRunState() }

		case 'clear':
			await forgetRun()
			return { type: 'state', state: await getRunState() }

		default:
			return { error: `Unknown message: ${message.type}` }
	}
}

// ── Debugger events: how pages get captured ─────────────────────────

/**
 * Debugger events are handled strictly one at a time.
 *
 * `responseReceived` records the main document's request ID and
 * `loadingFinished` looks it up, both via async storage. Handled concurrently,
 * the lookup can run before the write lands — and because only the main
 * document's `loadingFinished` triggers a capture, missing that one event stalls
 * the run permanently with nothing to show why. The two events arrive within
 * microseconds of each other on a fast page, so this was losing races.
 */
chrome.debugger.onEvent.addListener((source, method, params) => {
	if (source.tabId === undefined || !params) return
	const tabId = source.tabId
	void serial(() => handleDebuggerEvent(tabId, method, params)).catch(
		(error) => {
			console.error('[results-scraper] event handling failed', method, error)
		},
	)
})

async function handleDebuggerEvent(
	tabId: number,
	method: string,
	params: Record<string, unknown>,
): Promise<void> {
	if (method === 'Network.responseReceived') {
		await noteDocumentResponse(tabId, params)
		return
	}

	if (method === 'Network.loadingFinished') {
		const document = await noteLoadingFinished(tabId, params)
		// Only the main-frame document produces a match here; everything else on
		// the page finishes loading too and is ignored.
		if (document) await handleDocumentLoaded(tabId)
	}
}

/**
 * Chrome detaches us if the user opens DevTools on the scrape tab, or clicks
 * "cancel" on the debugging notice. Without the debugger there's no way to read
 * raw HTML, so the run can't continue.
 */
chrome.debugger.onDetach.addListener((source, reason) => {
	void handleDetach(source.tabId, reason)
})

async function handleDetach(tabId: number, reason: string): Promise<void> {
	const session = await getSession()
	if (session.scrapeTabId !== tabId) return

	const state = await getRunState()
	if (state.status !== 'running') return

	await setRunState({
		...state,
		status: 'error',
		currentKey: undefined,
		finishedAt: Date.now(),
		message: `Lost the debugger connection (${reason}).`,
	})
	await chrome.action.setBadgeText({ text: '!' }).catch(() => {})
}

// ── Tab closed mid-run ──────────────────────────────────────────────

chrome.tabs.onRemoved.addListener((tabId) => {
	// Serialised with the rest of the state machine: this used to race finishRun
	// and clobber a completed run's status.
	void serial(() => handleTabRemoved(tabId))
})

async function handleTabRemoved(tabId: number): Promise<void> {
	const session = await getSession()
	const state = await getRunState()
	if (state.status !== 'running') return

	if (session.scrapeTabId === tabId) {
		await detach(tabId)
		await setRunState({
			...state,
			status: 'cancelled',
			currentKey: undefined,
			finishedAt: Date.now(),
			message: 'The scrape tab was closed.',
		})
		await chrome.action.setBadgeText({ text: '' }).catch(() => {})
	}
}

// ── Recovery ────────────────────────────────────────────────────────

/**
 * If the browser restarted mid-run there's no tab and no debugger left, so the
 * run can't be resumed — but whatever was captured is still in storage and the
 * admin page can still ask for it.
 */
chrome.runtime.onStartup.addListener(() => {
	void (async () => {
		const state = await getRunState()
		if (state.status !== 'running') return
		await setRunState({
			...state,
			status: 'cancelled',
			currentKey: undefined,
			message: 'Interrupted when the browser closed.',
		})
	})()
})

/**
 * The scrape tab finished loading.
 *
 * This is the dependable trigger — unlike chrome.debugger events, tabs.onUpdated
 * is always delivered and always wakes the worker. It runs the same capture path,
 * so whichever signal arrives first with a readable body wins.
 */
chrome.tabs.onUpdated.addListener((tabId, info) => {
	if (info.status !== 'complete') return
	void (async () => {
		const state = await getRunState()
		if (state.status !== 'running') return

		const session = await getSession()
		if (session.scrapeTabId !== tabId) return

		// No current item means the worker died between items; pick the queue back up.
		if (!state.currentKey) {
			await serial(() => advance())
			return
		}

		await serial(() => handleDocumentLoaded(tabId))

		// The page is loaded. If that didn't produce a capture, its Network events
		// were lost and no amount of waiting will bring them back — reload now
		// rather than letting the watchdog notice in 20 seconds.
		await serial(() => recoverMissedCapture(tabId))
	})()
})

/**
 * A blocked page that nobody has cleared. Reload it — a flat 403 often passes on
 * a second try, and a challenge the user already solved will have navigated away
 * by now, in which case this does nothing.
 */
chrome.alarms.onAlarm.addListener((alarm) => {
	if (alarm.name === 'retry-blocked') {
		void serial(() => retryIfStillBlocked())
		return
	}
	// The watchdog: catches a page whose load events never arrived, which would
	// otherwise leave the run sitting on "Loading…" forever.
	if (alarm.name === 'watchdog') {
		void serial(() => checkForStall())
	}
})

// No default_popup in the manifest, so the icon click comes here.
chrome.action.onClicked.addListener(() => {
	void openAdminPage()
})

chrome.action.setBadgeBackgroundColor({ color: '#3f6d3a' }).catch(() => {})
