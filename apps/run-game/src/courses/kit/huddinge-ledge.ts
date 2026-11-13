import { PATH_BACK } from '../../game/constants'
import type { Terrain } from '../../game/terrain'
import type { PlatformDefinition } from '../types'
import { type PixelRect, pixelArt } from './pixelArt'
import { seeded } from './seeded'

/**
 * Huddinge's granite ledge, as pixel art: a boulder of the forest's grey
 * granite, rounded off, split by a crack or two, speckled, moss over its top
 * and down its face, and sat in the grass behind the path, its foot
 * following the ground's line under it.
 */

/** How big its pixels are, in the world's. */
const C = 2
/** How far it bulges out past the Platform's ends, either side. */
const BULGE = 6
/** How far its moss stands up over its top. */
const MOSS_OVER = 4
/** How far its top corners are rounded. */
const ROUND = 10

const GRANITE = {
	outline: '#36342f',
	lit: '#c4c0b2',
	top: '#a29e92',
	bands: ['#8e8a7f', '#837f74', '#77736a', '#6a675e', '#5d5a52'],
	shade: '#4f4c45',
	speckLight: '#b3afa2',
	speckDark: '#5a574f',
	crack: '#3e3c36',
	lichen: '#c9c79a',
}
const MOSS = { dark: '#3f6a30', mid: '#5f8a45', light: '#7fa95a' }
const GRASS = ['#3b6230', '#4d7a3c', '#28441f']

export function huddingeLedgeArt(
	terrain: Terrain,
	ledge: PlatformDefinition,
): NonNullable<PlatformDefinition['art']> {
	const random = seeded(2117)
	const width = ledge.width + 2 * BULGE
	/** Its top, where it's stood on, in the world. */
	const top = terrain.groundY(ledge.x) - ledge.height
	/** Its foot under `x` (from its left), down from its top: the path's back edge there. */
	const footAt = (x: number) =>
		Math.max(
			ROUND * 2,
			Math.round(
				(terrain.groundY(ledge.x - BULGE + x) - (PATH_BACK - 2) - top) / C,
			) * C,
		)
	const deepest = Math.max(
		...Array.from({ length: width / C }, (_, i) => footAt(i * C)),
	)
	const height = MOSS_OVER + deepest + C

	/**
	 * Where it's split into blocks, top to bottom: a crack down it, jagged,
	 * a column for each of its rows.
	 */
	const seams = [0.34, 0.68].map((share) => {
		let x = Math.round((width * (share + (random() - 0.5) * 0.08)) / C) * C
		return Array.from({ length: deepest / C + 1 }, () => {
			if (random() < 0.4) x += random() < 0.5 ? C : -C
			return x
		})
	})
	const seamAt = (seam: number[], y: number) => seam[Math.floor(y / C)]

	/** Its outline: rounded off at the top corners, bulging out at the sides, notched where it's split. */
	const inside = (x: number, y: number) => {
		if (y < 0) return false
		const foot = footAt(x)
		if (y >= foot) return false
		// Widest a third of the way down; in at the top and foot.
		const t = y / foot
		const inset =
			Math.round((BULGE * (1 - Math.sin(Math.PI * Math.min(1, t * 1.5)))) / C) *
			C
		if (x < inset || x >= width - inset) return false
		if (y < C && seams.some((seam) => Math.abs(seam[0] - x) <= C)) return false
		// The top corners, rounded.
		const cx = Math.min(Math.max(x, inset + ROUND), width - inset - ROUND)
		const cy = Math.max(y, ROUND)
		return (x - cx) ** 2 + (y - cy) ** 2 <= ROUND ** 2 + C
	}

	/** Its cells, by row and then column: a later one over an earlier. */
	const grid = new Map<number, Map<number, string>>()
	const cell = (x: number, y: number, fill: string) => {
		const row = grid.get(y + MOSS_OVER) ?? new Map<number, string>()
		row.set(x, fill)
		grid.set(y + MOSS_OVER, row)
	}
	const { bands } = GRANITE
	const band = (i: number) => bands[Math.max(0, Math.min(bands.length - 1, i))]

	for (let x = 0; x < width; x += C) {
		const foot = footAt(x)
		for (let y = 0; y < foot; y += C) {
			if (!inside(x, y)) continue
			const edge =
				!inside(x - C, y) ||
				!inside(x + C, y) ||
				!inside(x, y - C) ||
				!inside(x, y + C)
			// The block it's in: from the seam before it to the one after.
			const cuts = [0, ...seams.map((seam) => seamAt(seam, y)), width]
			const block = cuts.findIndex((cut, i) => x >= cut && x < cuts[i + 1])
			const left = cuts[block]
			const right = cuts[block + 1]
			let fill: string
			if (edge && y + C < foot) fill = GRANITE.outline
			// The crack between two blocks.
			else if (block > 0 && x === left) fill = GRANITE.crack
			else if (y < C) fill = GRANITE.lit
			else if (y < C * 2) fill = GRANITE.top
			// The foot, in its own shadow in the grass.
			else if (y >= foot - C * 2) fill = GRANITE.shade
			// Each block lit down its near side, in shadow down its far one.
			else if (x - left <= C * 2 && block > 0) fill = GRANITE.speckLight
			else if (right - x <= C * 3)
				fill = block === seams.length ? GRANITE.shade : band(bands.length - 1)
			else {
				// Darker the further down; a lit face across each block's top
				// near corner, the sun's from up to the left.
				const down = Math.floor((y / foot) * bands.length)
				const lit = (x - left) * 0.6 + y < (right - left) * 0.45
				fill = band(down - (lit ? 2 : 0))
				const r = random()
				if (r < 0.025) fill = GRANITE.speckLight
				else if (r < 0.05) fill = GRANITE.speckDark
			}
			cell(x, y, fill)
		}
	}

	// Lichen, a few pale patches.
	for (let k = 0; k < 5; k++) {
		const x = Math.round((14 + random() * (width - 28)) / C) * C
		const y = Math.round((C * 4 + random() * 20) / C) * C
		for (const [dx, dy] of [
			[0, 0],
			[C, 0],
			[0, C],
			[-C, C],
			[C, C],
		])
			if (random() < 0.8 && inside(x + dx, y + dy))
				cell(x + dx, y + dy, GRANITE.lichen)
	}

	// Moss over its top in clumps, thick, tufts standing up out of it, and
	// down its face from some of them, where the rain runs.
	for (let x = ROUND / 2 + random() * 10; x < width - ROUND; ) {
		const from = Math.round(x / C) * C
		const to = Math.min(
			width - ROUND / 2,
			from + Math.round((14 + random() * 30) / C) * C,
		)
		for (let at = from; at < to; at += C) {
			const end = at === from || at + C >= to
			if (!end && random() < 0.4) cell(at, -C * 2, MOSS.mid)
			cell(at, -C, end ? MOSS.mid : random() < 0.5 ? MOSS.light : MOSS.mid)
			cell(at, 0, MOSS.mid)
			if (!end) cell(at, C, random() < 0.7 ? MOSS.dark : MOSS.mid)
			if (!end && random() < 0.3) cell(at, C * 2, MOSS.dark)
		}
		if (random() < 0.6) {
			let at = from + Math.round(((to - from) * random()) / C) * C
			const length = 4 + Math.round(random() * 10)
			for (let y = C * 2; y < C * (2 + length); y += C) {
				if (!inside(at, y) || y >= footAt(at) - C * 3) break
				cell(at, y, MOSS.dark)
				if (random() < 0.5) cell(at + C, y, MOSS.mid)
				if (random() < 0.2) at += random() < 0.5 ? C : -C
			}
		}
		x = to + 6 + random() * 26
	}

	// Grass up round its foot.
	for (let x = 0; x < width; x += C) {
		if (random() < 0.45) continue
		const foot = footAt(x)
		const blade = 1 + Math.floor(random() * 3)
		for (let k = 0; k < blade; k++)
			cell(x, foot - C * (k + 1), GRASS[Math.floor(random() * GRASS.length)])
	}

	// Each row's runs of one colour as one rect: a lot fewer of them.
	const rects: PixelRect[] = []
	for (const [y, row] of grid) {
		const xs = [...row.keys()].sort((a, b) => a - b)
		let from = 0
		for (let i = 1; i <= xs.length; i++) {
			const fill = row.get(xs[from]) as string
			if (i < xs.length && xs[i] === xs[i - 1] + C && row.get(xs[i]) === fill)
				continue
			rects.push([xs[from], y, xs[i - 1] - xs[from] + C, C, fill])
			from = i
		}
	}
	return {
		asset: pixelArt(width, height, rects),
		width,
		height,
		top: MOSS_OVER,
	}
}
