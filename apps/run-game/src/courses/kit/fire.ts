import type { SecretProp } from '../types'
import { type PixelRect, pixelArt } from './pixelArt'

/**
 * Fire, drawn in code, a cell at a time: flames licking up out of their
 * foot, ragged, tongues of it breaking off at the top, white-hot at the
 * heart and down low, yellow, orange, then red at the tips, going to smoke;
 * and embers rising off it. A heat field, from noise scrolling up through
 * it and shaped narrower the higher up, cut into bands of colour: so it
 * moves like fire, every frame different, looping back round to the first
 * without a jump.
 */

const CELL = 2

/** Hottest to coolest, and how hot a cell has to be to be each. */
const BANDS: [number, string][] = [
	[0.97, '#fff8dc'],
	[0.8, '#ffe066'],
	[0.63, '#ffb22e'],
	[0.47, '#ff7a1a'],
	[0.35, '#e8461c'],
	[0.27, '#b02a12'],
]
/** Its smoke, off its tips: thicker, and thinner, only up over its foot. */
const SMOKE: [number, string][] = [
	[0.2, 'rgba(48,38,34,0.55)'],
	[0.15, 'rgba(60,52,48,0.3)'],
]
const SMOKE_FROM = 0.7
const EMBER = ['#ffe066', '#ffb22e', '#ff7a1a']

/** A hash of a lattice point, 0 to 1. */
const hash = (x: number, y: number, z: number, seed: number) => {
	const n =
		Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 19.3) * 43758.5453
	return n - Math.floor(n)
}
const smooth = (t: number) => t * t * (3 - 2 * t)
const mix = (a: number, b: number, t: number) => a + (b - a) * t
const wrap = (n: number, period: number) => ((n % period) + period) % period

/**
 * Value noise, 0 to 1, repeating every `period` up `y`: so scrolling it up
 * a whole period over a loop's frames comes back round to where it was.
 */
function noise(x: number, y: number, z: number, period: number, seed: number) {
	const [ix, iy, iz] = [Math.floor(x), Math.floor(y), Math.floor(z)]
	const [fx, fy, fz] = [smooth(x - ix), smooth(y - iy), smooth(z - iz)]
	const at = (dx: number, dy: number, dz: number) =>
		hash(ix + dx, wrap(iy + dy, period), iz + dz, seed)
	const plane = (dz: number) =>
		mix(
			mix(at(0, 0, dz), at(1, 0, dz), fx),
			mix(at(0, 1, dz), at(1, 1, dz), fx),
			fy,
		)
	return mix(plane(0), plane(1), fz)
}

export interface FireShape {
	/** Its size, in cells. */
	columns: number
	rows: number
	/** How wide its foot is, out of its width; and how high it reaches, out of its height. */
	foot?: number
	reach?: number
	/** Leaning off to the side as it goes up, cells right for the full height (less than none, left). */
	lean?: number
	/** How many embers rise off it. */
	embers?: number
	/** A different fire for each. */
	seed: number
}

/** How many frames a fire's loop is, and how long each is up. */
export const FIRE_FRAMES = 8
export const FIRE_FRAME_MS = 80

/** A fire's frames, as image URLs. */
export function fireFrames(shape: FireShape): string[] {
	const { columns, rows, seed, foot = 0.8, reach = 0.85, lean = 0 } = shape
	const embers = shape.embers ?? Math.round(columns / 6)
	/** How far up the noise repeats, in noise cells, scrolled through once a loop. */
	const period = 4
	const scale = period / rows
	return Array.from({ length: FIRE_FRAMES }, (_, frame) => {
		const t = frame / FIRE_FRAMES
		const rects: PixelRect[] = []
		for (let row = 0; row < rows; row++) {
			/** How far up it, 0 at its foot to 1 at the top of the picture. */
			const v = (rows - 1 - row) / (rows - 1)
			let run: { from: number; colour: string } | undefined
			const flush = (x: number) => {
				if (run) rects.push([run.from, row, x - run.from, 1, run.colour])
				run = undefined
			}
			for (let x = 0; x < columns; x++) {
				const middle = columns / 2 + lean * v
				// Narrower the higher up, as it burns out.
				const half = (columns / 2) * foot * (1 - v / reach) ** 0.7
				const across = half > 0 ? Math.abs(x + 0.5 - middle) / half : 9
				const body = Math.max(0, 1 - across ** 2) * Math.max(0, 1 - v / reach)
				// Round it, a little way out, flickering out of it: no further.
				const near = Math.max(0, 1 - across ** 2 * 0.45)
				// Noise rising through it: coarse, licking, and fine, flickering.
				const y = (rows - row) * scale - t * period
				const swirl = Math.sin(t * Math.PI * 2) * 0.6
				const coarse = noise(x * scale * 1.4, y, swirl, period, seed)
				const fine = noise(
					x * scale * 3.2,
					y * 2,
					swirl + 3,
					period * 2,
					seed + 7,
				)
				const heat =
					body * 0.95 +
					((coarse - 0.5) * 0.8 + (fine - 0.5) * (0.3 + v * 0.3)) * near -
					v * 0.1
				const band =
					BANDS.find(([least]) => heat >= least) ??
					(v > SMOKE_FROM && across < 0.6
						? SMOKE.find(([least]) => heat >= least)
						: undefined)
				const colour = band?.[1]
				if (colour !== run?.colour) {
					flush(x)
					if (colour) run = { from: x, colour }
				}
			}
			flush(columns)
		}
		// Embers, each rising up through it at its own pace, a loop or two a loop.
		for (let i = 0; i < embers; i++) {
			const x0 = hash(i, 1, 2, seed) * columns
			const speed = 1 + Math.floor(hash(i, 3, 4, seed) * 2)
			const up = wrap(hash(i, 5, 6, seed) + t * speed, 1)
			const row = Math.round(rows * (1 - (0.35 + up * 0.65)))
			const x = Math.round(x0 + Math.sin((up + i) * 6) * 2 + lean * up)
			if (x < 0 || x >= columns || row < 0) continue
			rects.push([x, row, 1, 1, EMBER[i % EMBER.length]])
		}
		return pixelArt(columns, rows, rects)
	})
}

/** A fire as something below decks: its frames, its size, flickering fast, and its light. */
export function fireProp(
	shape: FireShape,
	more: Partial<SecretProp> = {},
): SecretProp {
	const width = shape.columns * CELL
	const height = shape.rows * CELL
	const hung = more.hung ?? 0
	return {
		frames: fireFrames(shape),
		width,
		height,
		frameMs: FIRE_FRAME_MS,
		glow: {
			x: 0,
			y: hung + Math.round(height * 0.35),
			reach: Math.round(width * 1.6 + 30),
			colour: '#ff8a2a',
			flicker: true,
		},
		...more,
	}
}
