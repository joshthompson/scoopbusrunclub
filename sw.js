/**
 * The Scoop Bus service worker.
 *
 * It exists for one reason: a browser will only deliver a push message to a
 * service worker, so there has to be one. It deliberately does nothing else —
 * no caching, no offline page, no intercepting requests — because the site
 * fetches its own data and a worker that quietly served stale results would be
 * worse than no worker at all.
 *
 * Plain JavaScript, served straight out of `public/` rather than bundled, so it
 * sits at the site root and can therefore control every page on it.
 */

/** Take over from any previous worker straight away rather than on next visit. */
self.addEventListener('install', () => {
	self.skipWaiting()
})

self.addEventListener('activate', (event) => {
	event.waitUntil(self.clients.claim())
})

/**
 * A push has arrived.
 *
 * The permission was granted on the understanding that something would be
 * shown, and browsers enforce that — a push handled without showing a
 * notification counts against the site and can have permission revoked. So
 * anything unreadable still gets a notification, just a generic one.
 */
self.addEventListener('push', (event) => {
	let payload = {}
	try {
		payload = event.data ? event.data.json() : {}
	} catch {
		payload = {}
	}

	const title = payload.title || 'Scoop Bus Run Club'
	const options = {
		body: payload.body || '',
		icon: payload.icon || '/favicon-192x192.png',
		badge: payload.badge || '/favicon-96x96.png',
		// Notifications sharing a tag replace one another, so a second PB alert
		// doesn't sit under the first on the lock screen.
		tag: payload.tag || 'scoopbus',
		data: { url: payload.url || '/' },
	}

	event.waitUntil(self.registration.showNotification(title, options))
})

/**
 * A notification was tapped.
 *
 * An already-open Scoop Bus tab is navigated and focused rather than a second
 * one opened — finding two copies of the site after tapping a notification is
 * a small annoyance that happens every single time otherwise.
 */
self.addEventListener('notificationclick', (event) => {
	event.notification.close()

	const target = new URL(
		event.notification.data?.url || '/',
		self.location.origin,
	)

	event.waitUntil(
		self.clients
			.matchAll({ type: 'window', includeUncontrolled: true })
			.then((windowClients) => {
				for (const client of windowClients) {
					if (new URL(client.url).origin !== target.origin) continue
					if ('navigate' in client) {
						return client.navigate(target.href).then((c) => c?.focus())
					}
					return client.focus()
				}
				return self.clients.openWindow(target.href)
			}),
	)
})
