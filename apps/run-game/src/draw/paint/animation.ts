/**
 * An animation's progress, worked out from the time, with CSS's timing
 * functions: for art painted onto the canvas that moves.
 */

/** A CSS `cubic-bezier()` timing function, as a function of progress. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
	const at = (a: number, b: number, t: number) =>
		3 * a * (1 - t) ** 2 * t + 3 * b * (1 - t) * t ** 2 + t ** 3
	return (x: number) => {
		if (x <= 0) return 0
		if (x >= 1) return 1
		// The t whose x this is, halving the way to it.
		let lo = 0
		let hi = 1
		for (let i = 0; i < 20; i++) {
			const t = (lo + hi) / 2
			if (at(x1, x2, t) < x) lo = t
			else hi = t
		}
		return at(y1, y2, (lo + hi) / 2)
	}
}

/** `ease`, CSS's default, and `ease-in-out`. */
export const ease = cubicBezier(0.25, 0.1, 0.25, 1)
export const easeInOut = cubicBezier(0.42, 0, 0.58, 1)

/**
 * How far through its current go an animation `seconds` long is, `elapsed`
 * seconds in, if it starts `delay` seconds in: 0 to 1, or undefined before
 * it's started.
 */
export function cycle(elapsed: number, seconds: number, delay = 0) {
	const into = elapsed - delay
	if (into < 0) return undefined
	return (into % seconds) / seconds
}

/**
 * A value between keyframes, `[at, value]` from 0 to 1, at `progress`,
 * each step eased by `timing`.
 */
export function keyframed(
	frames: [at: number, value: number][],
	progress: number,
	timing: (t: number) => number = ease,
) {
	for (let i = 1; i < frames.length; i++) {
		const [to, b] = frames[i]
		if (progress > to) continue
		const [from, a] = frames[i - 1]
		const t = to === from ? 1 : (progress - from) / (to - from)
		return a + (b - a) * timing(t)
	}
	return frames[frames.length - 1][1]
}

/** `steps(n)` (jump-end): progress in `n` steps. */
export const steps = (n: number, progress: number) =>
	Math.min(n - 1, Math.floor(progress * n)) / n
