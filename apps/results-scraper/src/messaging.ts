/**
 * Pushing updates out of the service worker.
 *
 * Progress goes to two places: the admin tab (which draws the panel that
 * replaced the form) and whatever page is currently in the scrape tab (which
 * shows the floating overlay). Both are best-effort — a tab with no content
 * script loaded yet just isn't listening, and that's fine, because both also
 * read the current state from storage when they start up.
 */
import type { CapturedFile, RunState } from '@shared/scraper-protocol'
import { getSession } from './state'

export async function notifyState(state: RunState): Promise<void> {
	const session = await getSession()
	const message = { type: 'state' as const, state }

	for (const tabId of [session.adminTabId, session.scrapeTabId]) {
		if (tabId === undefined) continue
		await chrome.tabs.sendMessage(tabId, message).catch(() => {})
	}
}

export async function notifyFile(file: CapturedFile): Promise<void> {
	const { adminTabId } = await getSession()
	if (adminTabId === undefined) return
	await chrome.tabs
		.sendMessage(adminTabId, { type: 'file' as const, file })
		.catch(() => {})
}
