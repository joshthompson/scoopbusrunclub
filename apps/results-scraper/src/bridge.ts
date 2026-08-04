/**
 * Content script on the admin origins: relays between the page and the worker.
 *
 * This is the only script that accepts instructions from a web page, so it is
 * deliberately narrow — it forwards four known message types and nothing else,
 * only from its own window, and it never touches the page's DOM.
 *
 * The page can't message the extension directly without knowing its ID, which
 * for an unpacked extension changes with its install path. Going through a
 * content script sidesteps that entirely.
 */
import {
	type ExtensionMessage,
	type PageMessage,
	isPageMessageType,
	readPageMessage,
	wrapForPage,
} from '@shared/scraper-protocol'
import { tagFromAdminPage } from './openAdmin'

// --- Page → worker ---

window.addEventListener('message', (event) => {
	// Only messages this page posted to itself; never another frame's.
	if (event.source !== window) return

	const message = readPageMessage(event.data)
	// Forwarded types come from the protocol module, so adding a message can't
	// leave the bridge silently dropping it.
	if (!message || !isPageMessageType(message.type)) return

	void (async () => {
		try {
			const reply = await chrome.runtime.sendMessage<
				PageMessage,
				ExtensionMessage
			>(tagFromAdminPage(message))
			if (reply) toPage(reply)
		} catch (error) {
			// The worker was unreachable — usually the extension was just reloaded.
			console.warn('[results-scraper] bridge could not reach the worker', error)
		}
	})()
})

// --- Worker → page ---

chrome.runtime.onMessage.addListener((message) => {
	toPage(message as ExtensionMessage)
	return undefined
})

function toPage(message: ExtensionMessage): void {
	window.postMessage(wrapForPage(message), window.location.origin)
}

// --- Announce ---

// The page enables its Scrape button on this, and asks for current state so a
// reload during a run picks the progress panel back up.
void (async () => {
	try {
		const hello = await chrome.runtime.sendMessage<
			PageMessage,
			ExtensionMessage
		>(tagFromAdminPage<PageMessage>({ type: 'ping' }))
		if (hello) toPage(hello)
	} catch {
		// Extension reloading; the page stays in its "not installed" state.
	}
})()
