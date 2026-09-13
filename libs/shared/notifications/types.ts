/**
 * The contract between the Convex sender and the service worker.
 *
 * A push message is a few hundred bytes of JSON that has to survive a trip
 * through Google's or Apple's push service, so it carries only what the
 * notification needs to draw itself and where a tap should land — never the
 * data behind it, which the site fetches for itself once opened.
 */

/** The web app's own icon, as the brief asks for on every notification. */
export const NOTIFICATION_ICON = '/favicon-192x192.png'

/** The small monochrome mark Android puts in the status bar. */
export const NOTIFICATION_BADGE = '/favicon-96x96.png'

export interface PushPayload {
	title: string
	body: string
	/** Site-relative path a tap opens, e.g. `/member/josh`. */
	url: string
	/**
	 * Groups notifications that supersede one another. Two pushes sharing a tag
	 * collapse into one on the device, so each kind that could repeat carries a
	 * distinct one and the phone never stacks up duplicates.
	 */
	tag: string
}
