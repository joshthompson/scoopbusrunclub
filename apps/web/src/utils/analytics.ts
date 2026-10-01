import type { Mixpanel } from 'mixpanel-browser'

// Only the deploy workflow bakes a token in, so local dev sends nothing.
const MIXPANEL_TOKEN = (import.meta.env.VITE_MIXPANEL_TOKEN as string) || ''

let loaded: Promise<Mixpanel | undefined> | undefined

/**
 * Starts Mixpanel, fully anonymous: nothing is written to cookies or storage,
 * so each page load is a new visitor and there's nobody to identify. The core
 * build leaves out session replay, which would triple the download, and it's
 * fetched after render as it has no bearing on the page drawing.
 */
export function initAnalytics(): void {
	if (!MIXPANEL_TOKEN || loaded) return
	loaded = import('mixpanel-browser/src/loaders/loader-module-core')
		.then((module) => {
			// The core loader's types re-export everything but the default.
			const mixpanel = (module as unknown as { default: Mixpanel }).default
			mixpanel.init(MIXPANEL_TOKEN, {
				// The project has EU data residency; the SDK sends to the US servers by default.
				api_host: 'https://api-eu.mixpanel.com',
				// Enable debug mode in development
				debug: import.meta.env.DEV,
				// A page view on every route change, not just the first load
				track_pageview: 'url-with-path',
				// The distinct id lives in memory only — no cookie, no localStorage
				disable_persistence: true,
				// The batch queue is kept in localStorage even with persistence off
				batch_requests: false,
				// No geolocating visitors from their IP
				ip: false,
			})
			return mixpanel
		})
		.catch(() => undefined)
	trackLinkClicks()
}

/**
 * Sends an event, if analytics is running. Admin gets page views and nothing
 * else, so the shared components it uses (tables, links) stay quiet there.
 */
export function track(
	event: string,
	properties?: Record<string, unknown>,
	options?: { transport: 'sendBeacon' },
) {
	if (window.location.pathname.startsWith('/admin')) return
	loaded?.then((mixpanel) => mixpanel?.track(event, properties, options))
}

/**
 * Every link on the site from one listener, rather than a call on each `<a>`.
 * It listens in the capture phase so links that stop the click from bubbling
 * (the furby one in the header does) still count, and on `auxclick` for the
 * middle button, which opens a tab without a `click`. Mark a region with
 * `data-link-area` to tell its links apart from the page's own.
 */
function trackLinkClicks() {
	const onClick = (event: MouseEvent) => {
		if (event.type === 'auxclick' && event.button !== 1) return
		const link =
			event.target instanceof Element ? event.target.closest('a[href]') : null
		const href = link?.getAttribute('href')
		if (!link || !href) return

		const url = new URL(href, window.location.href)
		const isExternal = url.origin !== window.location.origin
		// Only the scheme of a mailto: or tel:, which would otherwise carry an
		// email address or phone number.
		const isContact = url.protocol === 'mailto:' || url.protocol === 'tel:'
		// innerText keeps the break between a link's title and its detail line,
		// which textContent runs together. SVG links only have the latter.
		const text =
			link.getAttribute('aria-label') ||
			(link instanceof HTMLElement ? link.innerText : link.textContent) ||
			link.querySelector('img')?.getAttribute('alt') ||
			''

		track(
			'link_clicked',
			{
				link_url: isContact
					? url.protocol
					: isExternal
						? url.href
						: url.pathname,
				link_text: text.replace(/\s+/g, ' ').trim().slice(0, 100),
				link_area:
					link.closest<HTMLElement>('[data-link-area]')?.dataset.linkArea ??
					'page',
				is_external: isExternal,
			},
			// A link off the site can unload the page before an ordinary request
			// is out; a beacon survives that.
			isExternal ? { transport: 'sendBeacon' } : undefined,
		)
	}
	document.addEventListener('click', onClick, true)
	document.addEventListener('auxclick', onClick, true)
}
