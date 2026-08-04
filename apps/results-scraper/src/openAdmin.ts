/**
 * Clicking the toolbar icon opens the Process Results page.
 *
 * Which origin that is depends on where the site is being served — localhost in
 * development, scoopbus.run in production — so the bridge records the origin it
 * last talked to and that's what gets opened. Falling back to a guess only when
 * we've never seen one.
 */

const ORIGIN_KEY = 'lastAdminOrigin'
const PAGE_PATH = '/admin/process-results'

/** Field the bridge adds to say a message came from an admin page. */
interface AdminPageTag {
	fromAdminPage?: true
}

/**
 * Tag a message as coming from the admin page. Called by the bridge only.
 *
 * The overlay content script sends `cancel`, `retry` and `skip` too — the same
 * types the admin page sends — so a message's type says nothing about where it
 * came from, and remembering the sender of *any* message meant the icon
 * "learned" parkrun.org.uk the moment a scrape started. The bridge runs on admin
 * origins and nowhere else, so its own tag is the dependable signal.
 *
 * Spread first so a page that puts `fromAdminPage` in its own message can't
 * unset it.
 */
export function tagFromAdminPage<T extends object>(
	message: T,
): T & AdminPageTag {
	return { ...message, fromAdminPage: true }
}

export function isFromAdminPage(message: unknown): boolean {
	return (
		typeof message === 'object' &&
		message !== null &&
		(message as AdminPageTag).fromAdminPage === true
	)
}

/**
 * Used only before the bridge has ever announced itself from a real page.
 *
 * Production first: on a fresh install the live site is the safe guess, and a
 * dev will have loaded localhost within seconds, after which the remembered
 * origin takes over. One build serves both — the manifest grants both origins.
 */
const FALLBACK_ORIGINS = ['https://scoopbus.run', 'http://localhost:3005']

/**
 * Remember where the admin page lives, from any message the bridge sends.
 *
 * Every admin page announces itself with a `ping` on load, so simply opening
 * localhost:3005 is enough to point the icon there, and opening the live site
 * points it back.
 */
export async function rememberAdminOrigin(
	senderUrl: string | undefined,
): Promise<void> {
	if (!senderUrl) return
	try {
		const { origin } = new URL(senderUrl)
		await chrome.storage.local.set({ [ORIGIN_KEY]: origin })
	} catch {
		// Not a URL we can use; keep whatever we had.
	}
}

async function knownAdminOrigin(): Promise<string | null> {
	const stored = await chrome.storage.local.get<{ lastAdminOrigin?: string }>(
		ORIGIN_KEY,
	)
	return stored.lastAdminOrigin ?? null
}

/**
 * Focus an existing Process Results tab if there is one, otherwise open it.
 *
 * Reusing the tab matters: a scrape's captured files are held by the page, so
 * opening a second copy would show an empty one next to the one doing the work.
 */
export async function openAdminPage(): Promise<void> {
	const origins = [await knownAdminOrigin(), ...FALLBACK_ORIGINS].filter(
		(origin): origin is string => !!origin,
	)

	for (const origin of origins) {
		const existing = await chrome.tabs
			.query({ url: `${origin}${PAGE_PATH}*` })
			.catch(() => [])

		const tab = existing.find((candidate) => candidate.id !== undefined)
		if (tab?.id !== undefined) {
			await chrome.tabs.update(tab.id, { active: true })
			if (tab.windowId !== undefined) {
				await chrome.windows.update(tab.windowId, { focused: true })
			}
			return
		}
	}

	const origin = origins[0]
	await chrome.tabs.create({ url: `${origin}${PAGE_PATH}`, active: true })
}
