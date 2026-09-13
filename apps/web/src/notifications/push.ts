/**
 * Talking to the browser's Push API, and to our own backend about it.
 *
 * Everything the site knows about push lives behind this module — the feature
 * detection, the service worker registration, the key juggling and the four
 * endpoints. Nothing else imports `PushManager` or `Notification`.
 *
 * The awkward part is iOS. Apple only delivers push to a web app that has been
 * added to the Home Screen; in an ordinary Safari tab, and in Chrome for iOS
 * (which is Safari underneath), the Push API is either absent or present and
 * useless. So `pushSupport()` reports not just whether push works but why it
 * doesn't, and the page says something helpful instead of showing a toggle that
 * can't be switched on.
 */

const CONVEX_URL = (import.meta.env.VITE_CONVEX_URL as string) || ''

/** Where the worker lives. Root scope, so it controls the whole site. */
const SERVICE_WORKER_URL = '/sw.js'

// ---------------------------------------------------------------------------
// What this browser can do
// ---------------------------------------------------------------------------

export type PushSupport =
	/** Push works here. */
	| { kind: 'supported' }
	/** iOS, but not installed to the Home Screen — it would work if it were. */
	| { kind: 'needsInstall'; browser: 'safari' | 'other' }
	/** This browser can't do push at all. */
	| { kind: 'unsupported' }

function isIOS(): boolean {
	// iPadOS reports itself as a Mac, and is told apart by having a touchscreen.
	return (
		/iphone|ipad|ipod/i.test(navigator.userAgent) ||
		(navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
	)
}

/** True when running as an installed app rather than in a browser tab. */
export function isStandalone(): boolean {
	return (
		window.matchMedia('(display-mode: standalone)').matches ||
		// Safari's own, from before the standard one existed.
		(window.navigator as { standalone?: boolean }).standalone === true
	)
}

/**
 * Whether the visitor's browser could show a notification, and if not, whether
 * that's fixable by installing the app.
 */
export function pushSupport(): PushSupport {
	const hasApi =
		'serviceWorker' in navigator &&
		'PushManager' in window &&
		'Notification' in window

	if (isIOS() && !isStandalone()) {
		// Safari can install it; Chrome for iOS users need to switch browsers,
		// because what it installs doesn't reliably get push.
		const isSafari =
			!/crios|fxios|edgios|opios/i.test(navigator.userAgent) &&
			/safari/i.test(navigator.userAgent)
		return { kind: 'needsInstall', browser: isSafari ? 'safari' : 'other' }
	}

	return hasApi ? { kind: 'supported' } : { kind: 'unsupported' }
}

/** Whether the notifications link is worth showing at all. */
export function pushCouldWork(): boolean {
	return pushSupport().kind !== 'unsupported'
}

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

/**
 * The VAPID public key, as `PushManager.subscribe` wants it: raw bytes, not the
 * base64url string the server holds it as.
 */
function decodeVapidKey(base64: string): Uint8Array<ArrayBuffer> {
	const padded = base64.padEnd(
		base64.length + ((4 - (base64.length % 4)) % 4),
		'=',
	)
	const binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
	// Backed by an ArrayBuffer explicitly: `applicationServerKey` wants a
	// BufferSource, which a possibly-shared buffer doesn't satisfy.
	const bytes = new Uint8Array(new ArrayBuffer(binary.length))
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
	return bytes
}

/** Base64url, for handing the subscription's own keys back to the server. */
function encodeKey(buffer: ArrayBuffer | null): string {
	if (!buffer) return ''
	const bytes = new Uint8Array(buffer)
	let binary = ''
	for (const byte of bytes) binary += String.fromCharCode(byte)
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// ---------------------------------------------------------------------------
// The service worker
// ---------------------------------------------------------------------------

/**
 * Register the worker, or return the one already registered.
 *
 * Called on every page load (from `index.tsx`) so a returning visitor's
 * subscription keeps working, and again when subscribing.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
	if (!('serviceWorker' in navigator)) return null
	try {
		return await navigator.serviceWorker.register(SERVICE_WORKER_URL)
	} catch (error) {
		console.warn('Service worker registration failed', error)
		return null
	}
}

// ---------------------------------------------------------------------------
// The backend
// ---------------------------------------------------------------------------

async function api<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(`${CONVEX_URL}${path}`, init)
	if (!response.ok) {
		const detail = await response.json().catch(() => ({}))
		throw new Error(detail?.error ?? `Request failed (${response.status})`)
	}
	return (await response.json()) as T
}

async function fetchVapidPublicKey(): Promise<string> {
	const { publicKey } = await api<{ publicKey: string }>(
		'/api/notifications/vapid-public-key',
	)
	if (!publicKey) throw new Error('Push is not configured on the server')
	return publicKey
}

// ---------------------------------------------------------------------------
// Subscribing
// ---------------------------------------------------------------------------

/** The browser's existing subscription for this site, if it has one. */
async function currentSubscription(): Promise<PushSubscription | null> {
	const registration = await registerServiceWorker()
	if (!registration) return null
	return await registration.pushManager.getSubscription()
}

/**
 * This browser's push endpoint, or null when it isn't subscribed.
 *
 * The admin page needs it to send itself a preview — that's the only way the
 * backend can push to one device rather than all of them.
 */
export async function currentEndpoint(): Promise<string | null> {
	try {
		const subscription = await currentSubscription()
		return subscription?.endpoint ?? null
	} catch {
		return null
	}
}

/**
 * Whether notifications are on.
 *
 * Asks the backend rather than trusting the browser alone: a subscription the
 * server has forgotten — because the endpoint died, or the table was cleared —
 * would otherwise show as enabled while nothing arrived.
 */
export async function isEnabled(): Promise<boolean> {
	if (Notification.permission !== 'granted') return false

	const subscription = await currentSubscription()
	if (!subscription) return false

	try {
		const { subscribed } = await api<{ subscribed: boolean }>(
			`/api/notifications/status?endpoint=${encodeURIComponent(subscription.endpoint)}`,
		)
		return subscribed
	} catch {
		return false
	}
}

/**
 * Ask permission, subscribe, and tell the backend.
 *
 * Must be called from a user gesture — iOS refuses the permission prompt
 * otherwise, and every other browser holds it against the site.
 */
export async function enable(): Promise<void> {
	const registration = await registerServiceWorker()
	if (!registration) throw new Error('Notifications are not supported here')

	const permission = await Notification.requestPermission()
	if (permission !== 'granted') {
		throw new Error(
			permission === 'denied'
				? 'Notifications are blocked for this site. You can turn them back on in your browser settings.'
				: 'Notifications were not allowed',
		)
	}

	// An existing subscription is reused — re-subscribing would mint a new
	// endpoint and leave the old one on the server, pushing to nothing.
	const existing = await registration.pushManager.getSubscription()
	const subscription =
		existing ??
		(await registration.pushManager.subscribe({
			// Required to be true: a push must always be shown to the user.
			userVisibleOnly: true,
			applicationServerKey: decodeVapidKey(await fetchVapidPublicKey()),
		}))

	const keys = {
		p256dh: encodeKey(subscription.getKey('p256dh')),
		auth: encodeKey(subscription.getKey('auth')),
	}

	await api('/api/notifications/subscribe', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ endpoint: subscription.endpoint, keys }),
	})
}

/** Unsubscribe here and forget it on the server. */
export async function disable(): Promise<void> {
	const subscription = await currentSubscription()
	if (!subscription) return

	// The server first: if unsubscribing locally succeeded and this didn't, we'd
	// be left pushing at an endpoint nobody is listening to.
	await api('/api/notifications/unsubscribe', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ endpoint: subscription.endpoint }),
	})

	await subscription.unsubscribe()
}

/** Send this device the test notification. */
export async function sendTest(): Promise<void> {
	const subscription = await currentSubscription()
	if (!subscription) throw new Error('Notifications are not turned on')

	await api('/api/notifications/test', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ endpoint: subscription.endpoint }),
	})
}
