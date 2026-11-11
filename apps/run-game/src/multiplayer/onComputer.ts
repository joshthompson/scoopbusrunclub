/**
 * A computer, not a phone: a mouse, and so most likely a keyboard and a big
 * screen. Joining a Room, it shows it just as the Host does, in the game
 * itself; a phone joins on its own pages, from the QR code's link.
 */
export const ON_COMPUTER = window.matchMedia(
	'(hover: hover) and (pointer: fine)',
).matches
