export interface Size {
	width: number
	height: number
}

export interface Spot {
	x: number
	y: number
}

/** How many places to try a thing in before taking the highest that's free. */
const TRIES = 60

/**
 * How much lower than the highest free place a thing can still settle, so
 * the first few don't all line up along the top.
 */
const SLACK = 48

/**
 * Random numbers from a seed, the same run of them every time for the same
 * seed (mulberry32), so laying the same things out again comes out the same.
 */
export function seededRandom(seed: number): () => number {
	let state = seed >>> 0
	return () => {
		state = (state + 0x6d2b79f5) >>> 0
		let t = state
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

/**
 * Things of these sizes dropped at random across `width`, in order, none on
 * top of another or nearer than `gap` to it. Each tries a handful of random
 * places and keeps about the highest one that's free, so they settle in
 * loosely from the top, in no rows or columns; one that finds nowhere goes in
 * under the lot. Returns where each went, and how tall that all came out.
 */
export function scatter(
	sizes: Size[],
	width: number,
	gap: number,
	random: () => number,
): { spots: Spot[]; height: number } {
	const placed: (Spot & Size)[] = []
	let height = 0

	const free = (x: number, y: number, size: Size) =>
		placed.every(
			(other) =>
				x + size.width + gap <= other.x ||
				other.x + other.width + gap <= x ||
				y + size.height + gap <= other.y ||
				other.y + other.height + gap <= y,
		)

	const spots = sizes.map((size) => {
		const room = Math.max(0, width - size.width)
		let best: Spot | undefined
		let bestScore = Number.POSITIVE_INFINITY
		for (let i = 0; i < TRIES; i++) {
			const x = Math.round(random() * room)
			// Anywhere down to a bit below what's there, so gaps get filled.
			const y = Math.round(random() * (height + SLACK))
			const score = y + random() * SLACK
			if (score < bestScore && free(x, y, size)) {
				best = { x, y }
				bestScore = score
			}
		}
		const spot = best ?? {
			x: Math.round(random() * room),
			y: height && height + gap,
		}
		placed.push({ ...spot, ...size })
		height = Math.max(height, spot.y + size.height)
		return spot
	})

	return { spots, height }
}
