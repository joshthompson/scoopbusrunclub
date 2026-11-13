/**
 * Picking things in menus by hovering over them, as long as it's the mouse
 * that's being used. Going through a list with the keys scrolls it under
 * a mouse that hasn't moved, and the browser says the mouse has entered
 * whatever's scrolled under it: that's not someone pointing at it, and it
 * mustn't take the pick away from the keys. A key pressed, it's the keys
 * being used, till the mouse really moves again.
 */
let usingKeys = false
/** Where the mouse last was, to tell a real move from the browser's own. */
let at = { x: Number.NaN, y: Number.NaN }

/** Whether the mouse is somewhere new: a real move, not the browser's own after a scroll. */
const moved = (event: MouseEvent) =>
	event.clientX !== at.x || event.clientY !== at.y

if (typeof window !== 'undefined') {
	window.addEventListener('keydown', () => {
		usingKeys = true
	})
	window.addEventListener('mousemove', (event) => {
		if (moved(event)) usingKeys = false
		at = { x: event.clientX, y: event.clientY }
	})
}

/**
 * `pick`, as a hover's handler: only if the mouse is what's being used.
 * The mouse moving onto something is told before the move itself is, so
 * it's judged from where the mouse is, too.
 */
export const onHover =
	(pick: () => void) =>
	(event: MouseEvent): void => {
		if (moved(event)) {
			usingKeys = false
			at = { x: event.clientX, y: event.clientY }
		}
		if (!usingKeys) pick()
	}
