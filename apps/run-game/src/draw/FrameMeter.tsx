import { createSignal, onCleanup } from 'solid-js'

/**
 * Whether to show the frame meter: `?fps=1` in the page's address. Kept for
 * the whole visit, so going from screen to screen doesn't lose it.
 */
export const showFrameMeter = (() => {
	const value = new URLSearchParams(location.search).get('fps')
	try {
		if (value !== null) sessionStorage.setItem('frame-meter', value)
		return (value ?? sessionStorage.getItem('frame-meter')) === '1'
	} catch {
		return value === '1'
	}
})()

/**
 * The frame rate and frame time over the last second, in the corner, timed
 * with `requestAnimationFrame`: the mean, the slowest 5% and the slowest. For
 * measuring the race on a phone, with no DevTools to hand.
 */
export function FrameMeter() {
	const [text, setText] = createSignal('Measuring…')
	let times: number[] = []
	let last = performance.now()
	let shown = last
	let request = requestAnimationFrame(function frame(now) {
		times.push(now - last)
		last = now
		if (now - shown >= 1000) {
			const sorted = [...times].sort((a, b) => a - b)
			const mean = times.reduce((sum, t) => sum + t, 0) / times.length
			const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0
			const worst = sorted[sorted.length - 1] ?? 0
			setText(
				`${(1000 / mean).toFixed(0)} fps · ${mean.toFixed(1)} mean · ${p95.toFixed(1)} p95 · ${worst.toFixed(1)} worst ms`,
			)
			times = []
			shown = now
		}
		request = requestAnimationFrame(frame)
	})
	onCleanup(() => cancelAnimationFrame(request))
	return <div style={style}>{text()}</div>
}

const style = {
	position: 'fixed',
	top: '4px',
	left: '4px',
	'z-index': 1000,
	padding: '2px 6px',
	background: 'rgba(0, 0, 0, 0.7)',
	color: 'white',
	font: '11px ui-monospace, monospace',
	'pointer-events': 'none',
} as const
