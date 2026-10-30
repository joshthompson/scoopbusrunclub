import { onCleanup } from 'solid-js'

/**
 * How far off the screen something still counts as on it, so its animation is
 * already going by the time it's scrolled into view.
 */
const MARGIN = '200px'

let observer: IntersectionObserver | undefined

/**
 * For a decorative CSS animation that loops for ever: marks `element` with
 * `data-offscreen` while it's scrolled away, for its styles to pause whatever
 * animates in it with `animationPlayState`. Even an animation the browser runs
 * off the main thread costs it a style update every frame, seen or not.
 *
 * Use it as the element's `ref`. One observer looks after everything that asks.
 */
export function animateWhileOnScreen(element: Element) {
	observer ??= new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				entry.target.toggleAttribute('data-offscreen', !entry.isIntersecting)
			}
		},
		{ rootMargin: MARGIN },
	)
	observer.observe(element)
	onCleanup(() => observer?.unobserve(element))
}
