import { PATH_BACK, PATH_FRONT } from '../../game/constants'
import {
	DRAWN_FROM,
	GROUND_STEP,
	SMOOTH_COLUMNS,
	columnMiddle,
	columnTop,
	smoothedTop,
} from '../../game/groundColumns'
import type { Gap, Terrain } from '../../game/terrain'
import type { Scenery } from '../types'
import {
	type PixelRect,
	pixelCircle,
	rectsMarkup,
	svgUrl,
	tile,
} from './pixelArt'
import { seeded } from './seeded'

/**
 * The Great Wall's stonework and the hills it runs over: its face in grey
 * brick, weeds growing out of the joints; its walkway's paving; the bushes
 * crowding round its foot; and the wooded hillside behind it.
 */

/** The bricks' colours: grey, and here and there the yellow of the older stone. */
const BRICKS = [
	'#8f8778',
	'#968e7e',
	'#8a8273',
	'#9d9483',
	'#857d6f',
	'#a39478',
	'#9a8a70',
]

/**
 * The wall's face: courses of grey brick, each its own shade, their
 * joints dark, lit along their tops; now and then one crumbled away, a
 * dark hole; and weeds growing out of the joints. A pattern, opaque.
 */
const BRICK_TILE = (() => {
	const random = seeded(1368)
	const width = 384
	const height = 96
	const bricks = tile(width, height)
	const { rect } = bricks
	rect(0, 0, width, height, '#5f584c')
	const course = 8
	for (let y = 0; y < height; y += course) {
		let x = -Math.round(random() * 8) * 2
		while (x < width) {
			const w = Math.min(width - x, 14 + Math.round(random() * 5) * 2)
			const roll = random()
			if (roll < 0.03) {
				// Crumbled out: a dark hole.
				rect(x, y, w - 2, course - 2, '#4a443a')
			} else {
				const colour =
					BRICKS[Math.floor(random() * (roll < 0.25 ? 7 : 5)) % BRICKS.length]
				rect(x, y, w - 2, course - 2, colour)
				// Lit along its top, mostly; worn darker along its bottom, some.
				if (random() < 0.7) rect(x, y, w - 2, 2, 'rgba(255,250,232,0.14)')
				if (random() < 0.3)
					rect(x, y + course - 4, w - 2, 2, 'rgba(40,34,26,0.12)')
			}
			x += w
		}
	}
	// Streaks, where the rain's run down it.
	for (let i = 0; i < 7; i++) {
		const x = Math.round((random() * width) / 2) * 2
		const w = 4 + Math.round(random() * 3) * 2
		rect(x, 0, w, height, 'rgba(50,44,34,0.07)')
	}
	// Weeds, growing out of the joints: a tuft, hanging over the brick below.
	for (let i = 0; i < 9; i++) {
		const x = Math.round((random() * width) / 2) * 2
		const y = Math.floor(random() * (height / course)) * course + course - 2
		rect(x, y - 2, 6, 2, '#4f7a3a')
		rect(x - 2, y, 10, 2, '#3f6a30')
		rect(x + 2, y - 4, 2, 2, '#6d9a4a')
		if (random() < 0.5) rect(x + 2, y + 2, 4, 2, '#3f6a30')
	}
	return bricks
})()
export const GREAT_WALL_BRICKS = BRICK_TILE.pattern('great-wall-bricks')

/**
 * The walkway's paving: big stone slabs, their joints and the wear on
 * them, as a pattern laid over its colour. Mostly see-through.
 */
export const GREAT_WALL_PAVING = (() => {
	const random = seeded(1420)
	const width = 192
	const height = 36
	const { rect, pattern } = tile(width, height)
	for (let y = 0; y < height; y += 6) {
		let x = -Math.round(random() * 10) * 2
		while (x < width) {
			const w = 18 + Math.round(random() * 8) * 2
			rect(x, y, 2, 6, 'rgba(70,62,50,0.22)')
			if (random() < 0.6) rect(x + 2, y, w - 2, 2, 'rgba(255,252,240,0.18)')
			else if (random() < 0.3)
				rect(x + 2, y + 2, w - 2, 4, 'rgba(70,62,50,0.06)')
			x += w
		}
		rect(0, y + 4, width, 2, 'rgba(70,62,50,0.12)')
	}
	return pattern('great-wall-paving')
})()

/**
 * The bushes round the wall's foot and on down the hill: clumps of leaves,
 * lit on top, in shadow under, a flower here and there. Laid over their
 * green, mostly see-through.
 */
const SHRUB_TILE = (() => {
	const random = seeded(1644)
	const width = 480
	const height = 320
	const shrubs = tile(width, height)
	const { rect } = shrubs
	const snap = (n: number) => Math.round(n / 2) * 2
	for (let i = 0; i < 300; i++) {
		const cx = snap(random() * width)
		const cy = snap(random() * height)
		const r = snap(5 + random() * 9)
		for (let y = -r; y <= r; y += 2) {
			const half = snap(Math.sqrt(Math.max(0, r * r - y * y)))
			if (half <= 0) continue
			rect(
				cx - half,
				cy + y,
				half * 2,
				2,
				y < -r / 3
					? 'rgba(160,215,110,0.12)'
					: y > r / 3
						? 'rgba(10,40,16,0.14)'
						: 'rgba(40,80,30,0.05)',
			)
		}
	}
	for (let i = 0; i < 18; i++)
		rect(
			snap(random() * width),
			snap(random() * height),
			2,
			2,
			i % 2 ? 'rgba(250,240,200,0.7)' : 'rgba(240,170,190,0.65)',
		)
	return shrubs
})()
export const GREAT_WALL_SHRUBS = SHRUB_TILE.pattern('great-wall-shrubs')

/** A hash of a whole number, 0 to 1: the same every time. */
const hash = (n: number) => {
	const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
	return s - Math.floor(s)
}

/** How far apart the bushes at the wall's foot grow, give or take. */
const BUSH_SPACING = 26

/**
 * The tops of the bushes at the wall's foot, `x` along: how far up from
 * where the hill meets the wall they reach, each bush a dome, now and then
 * a taller one climbing the wall. Negative, as it's up.
 */
export function wallBushes(x: number) {
	const cell = Math.floor(x / BUSH_SPACING)
	let reach = 0
	for (let c = cell - 2; c <= cell + 2; c++) {
		const tall = hash(c * 3 + 2) < 0.15
		const r = (tall ? 16 : 9) + hash(c * 3 + 1) * 10
		const cx = (c + hash(c * 3)) * BUSH_SPACING
		const dx = (x - cx) / r
		if (dx * dx >= 1) continue
		const height = r * (tall ? 1.6 : 1) * Math.sqrt(1 - dx * dx)
		reach = Math.max(reach, height)
	}
	return -reach
}

/** The wooded hillside behind the wall, below the far hills: one of the horizon's nearer bands. */
export function wallWoods(
	seed: number,
	colours: { leaves: string; lit: string; shade: string },
	base = 40,
) {
	const width = 960
	const height = 100
	const random = seeded(seed)
	const phases = [random(), random(), random()].map((p) => p * Math.PI * 2)
	const top = (x: number) =>
		base +
		6 * Math.sin((Math.PI * 2 * 3 * x) / width + phases[0]) +
		4 * Math.sin((Math.PI * 2 * 7 * x) / width + phases[1]) +
		2 * Math.sin((Math.PI * 2 * 13 * x) / width + phases[2])
	let body = ''
	// The hillside under the trees.
	for (let x = 0; x < width; x += 2) {
		const y = Math.round(top(x + 1) / 2) * 2 + 6
		body += `<rect x="${x}" y="${y}" width="2" height="${height - y}" fill="${colours.leaves}"/>`
	}
	// Treetops along its line, round, each lit on its upper left.
	const trees = Array.from({ length: 150 }, () => {
		const x = Math.round((random() * width) / 2) * 2
		const r = 6 + Math.round(random() * 5) * 2
		const y = Math.round((top(x) + r * 0.6 + random() * 24) / 2) * 2
		return { x, r, y }
	})
	// Furthest back first, so the nearer ones go over them.
	trees.sort((a, b) => a.y - b.y)
	for (const { x, r, y } of trees) {
		for (const shift of [-width, 0, width]) {
			if (x + shift + r < 0 || x + shift - r > width) continue
			body += pixelCircle(x + shift, y + 2, r, colours.shade)
			body += pixelCircle(x + shift, y, r, colours.leaves)
			body += pixelCircle(x + shift - 2, y - 2, r - 4, colours.lit)
			if (r > 6) body += pixelCircle(x + shift, y, r - 6, colours.leaves)
		}
	}
	return {
		asset: svgUrl(width, height, body),
		height,
		fill: colours.leaves,
	}
}

// --- Where it's crumbled away ------------------------------------------------------

/** The wall's stone: its parapets, the walkway, its face's coping. */
export const WALL = {
	stone: '#a59c8c',
	dark: '#7a7265',
	walkway: '#c2b9a8',
	coping: '#8f8676',
	shadow: '#6a6255',
	parapet: '#b0a795',
	/** Inside it: rammed earth and rubble. */
	core: '#75684f',
}
/** How far down the wall's face goes from the path's front edge, to the hill it stands on. */
export const WALL_FOOT = 96
/** And from how far down it, it's a little darker. */
export const WALL_DARKER = 44
/** The hill's green, round the wall's foot, and the line along the tops of its bushes. */
export const HILLSIDE = '#4a7440'
export const HILL_RIM = '#5c6a40'
/** Darker the further down the hill, from these far under the path's front edge. */
export const HILL_SHADE: [offset: number, fill: string][] = [
	[WALL_FOOT + 60, 'rgba(10, 36, 16, 0.12)'],
	[WALL_FOOT + 150, 'rgba(10, 36, 16, 0.14)'],
]
/** How far on down the hillside a breach's own goes, to cover someone falling down it. */
const HILL_DEPTH = 1400
/** How far down it its leaves go, before it's just its green: past the bottom of the screen. */
const LEAVES_DEPTH = 420

const snap = (n: number) => Math.round(n / 2) * 2

/**
 * Where the wall's crumbled away, over a Gap: a breach, V-shaped, its
 * broken brick stepping in from either side, its earth and rubble core
 * showing behind, the hill behind seen through it; and at the bottom, a
 * heap of fallen brick, the bushes grown up round it. Two pictures, lined
 * up with the Ground's columns and its brick to the pixel: what's behind
 * whoever falls in, and the near face and the hillside in front of them,
 * which they fall on down behind, out of sight.
 */
export function breach(
	terrain: Terrain,
	gap: Gap,
	seed: number,
): [back: Scenery, front: Scenery] {
	const random = seeded(seed)
	// The Ground's columns over it, which it leaves out.
	const first = Math.ceil(
		(gap.from - GROUND_STEP / 2 - DRAWN_FROM) / GROUND_STEP,
	)
	const last =
		Math.ceil((gap.to - GROUND_STEP / 2 - DRAWN_FROM) / GROUND_STEP) - 1
	const left = DRAWN_FROM + first * GROUND_STEP
	const right = DRAWN_FROM + (last + 1) * GROUND_STEP
	const span = right - left
	// Its tops either side, and smoothed, as the hill's drawn, deep under the path.
	const from = first - SMOOTH_COLUMNS - 1
	const tops = Array.from(
		{ length: last - first + SMOOTH_COLUMNS * 2 + 3 },
		(_, k) => columnTop(terrain, from + k),
	)
	const near = tops[first - 1 - from] ?? snap(terrain.groundY(gap.from - 1))
	const far = tops[last + 1 - from] ?? snap(terrain.groundY(gap.to))
	const nearHill = smoothedTop(tops, first - 1 - from) ?? near
	const farHill = smoothedTop(tops, last + 1 - from) ?? far
	/** The hill's line in column `i`, across from one side to the other. */
	const hill = (i: number) =>
		snap(
			nearHill + ((farHill - nearHill) * (i - first + 1)) / (last - first + 2),
		)
	const columns = Array.from({ length: last - first + 1 }, (_, k) => first + k)

	/**
	 * A side's broken edge, every 2 px down from `top` to `bottom`: how far
	 * it reaches in, from none to `reach` of the way across, give or take,
	 * a brick's course at a time.
	 */
	const brokenEdge = (top: number, bottom: number, reach: number) => {
		const jag = new Map<number, number>()
		const rows: [y: number, out: number][] = []
		for (let y = top; y < bottom; y += 2) {
			// A brick's course at a time, so it steps in, brick by brick.
			const course = Math.floor(y / 8)
			if (!jag.has(course)) jag.set(course, random() * 14)
			const down = Math.max(0, (course * 8 - top) / (bottom - top))
			const out = snap(2 + down * reach * span + (jag.get(course) ?? 0))
			rows.push([y, Math.min(out, span / 2 - 2)])
		}
		return rows
	}
	const sides = [
		{ side: 'near' as const, line: near },
		{ side: 'far' as const, line: far },
	]
	/** A row's rect, out from its side, in a picture from `left`, `top`. */
	const row = (
		side: 'near' | 'far',
		y: number,
		out: number,
		top: number,
		at = 0,
		w = out - at,
	): PixelRect =>
		side === 'near'
			? [at, y - top, w, 2, '']
			: [span - at - w, y - top, w, 2, '']
	const fill = (r: PixelRect, colour: string): PixelRect => [
		r[0],
		r[1],
		r[2],
		r[3],
		colour,
	]

	// --- Behind: the back half of the wall, its core, and the heap -----------------
	const backTop = snap(Math.min(near, far) - PATH_BACK - 12)
	const backBottom = Math.max(near, far) + PATH_FRONT + WALL_FOOT + 12
	const back: PixelRect[] = []
	for (const { side, line } of sides) {
		const top = line - PATH_BACK - 10
		for (const [y, out] of brokenEdge(top, backBottom, 0.5)) {
			const depth = y - line
			const colour =
				depth < -PATH_BACK - 4
					? WALL.dark
					: depth < -PATH_BACK
						? WALL.stone
						: depth < -PATH_BACK + 4
							? WALL.walkway
							: WALL.core
			back.push(fill(row(side, y, out, backTop), colour))
			if (depth >= -PATH_BACK + 4) {
				// Stones in the earth, and darker the deeper.
				if (y % 6 === 0)
					for (
						let x = snap(random() * 6);
						x < out - 6;
						x += 8 + snap(random() * 8)
					)
						back.push(
							fill(
								row(side, y, out, backTop, x, 4 + snap(random() * 4)),
								random() < 0.5
									? 'rgba(255,240,210,0.14)'
									: 'rgba(30,24,16,0.2)',
							),
						)
				back.push(
					fill(
						row(side, y, out, backTop),
						`rgba(16,12,8,${Math.min(0.5, (depth + PATH_BACK) / 220).toFixed(2)})`,
					),
				)
			}
			// Its broken end, in shadow, or catching the light.
			back.push(
				fill(
					row(side, y, out, backTop, out - 2, 2),
					side === 'near' ? 'rgba(0,0,0,0.2)' : 'rgba(255,250,235,0.14)',
				),
			)
		}
	}
	// The heap of fallen brick at the bottom, in the middle.
	const middleHill =
		hill(Math.round((first + last) / 2)) + PATH_FRONT + WALL_FOOT
	const heapTall = 42
	const heapBase = middleHill + 8
	for (let y = heapBase - heapTall; y < heapBase; y += 4) {
		const up = (heapBase - y) / heapTall
		const half = snap((span / 2 - 4) * Math.sqrt(Math.max(0, 1 - up * up)))
		let x = span / 2 - half + snap(random() * 4)
		while (x < span / 2 + half) {
			const w = Math.min(span / 2 + half - x, 6 + snap(random() * 6))
			back.push([
				x,
				y - backTop,
				w - 2,
				4,
				BRICKS[Math.floor(random() * BRICKS.length)],
			])
			back.push([x, y - backTop, w - 2, 2, 'rgba(255,250,232,0.16)'])
			back.push([x + w - 2, y - backTop, 2, 4, '#4f493f'])
			x += w
		}
	}

	// --- In front: the near face's broken brick, and the hillside -------------------
	const frontTop = snap(Math.min(near, far) + PATH_FRONT - 14)
	const frontBottom = Math.max(near, far) + PATH_FRONT + WALL_FOOT + HILL_DEPTH
	const face: PixelRect[] = []
	/** Where the face is brick, to tile its brick over, cut to it. */
	const brickClip: PixelRect[] = []
	const lit: PixelRect[] = []
	for (const { side, line } of sides) {
		const top = line + PATH_FRONT - 12
		let before = 0
		for (const [y, reach] of brokenEdge(
			top + 8,
			line + PATH_FRONT + WALL_FOOT + 4,
			0.36,
		)) {
			const depth = y - line
			const out = depth < PATH_FRONT - 4 ? Math.min(reach, 6) : reach
			const r = row(side, y, out, frontTop)
			if (depth < PATH_FRONT + 8) face.push(fill(r, WALL.dark))
			else if (depth < PATH_FRONT + 12) face.push(fill(r, WALL.coping))
			else if (depth < PATH_FRONT + 14) face.push(fill(r, WALL.shadow))
			else brickClip.push(r)
			if (depth >= PATH_FRONT + WALL_DARKER)
				lit.push(fill(r, 'rgba(40,34,26,0.08)'))
			// The top of each step, catching the light; its broken end, in shadow.
			if (out > before)
				lit.push(
					fill(
						row(side, y, out, frontTop, before, out - before),
						'rgba(255,250,232,0.28)',
					),
				)
			lit.push(
				fill(row(side, y, out, frontTop, out - 2, 2), 'rgba(30,26,20,0.22)'),
			)
			before = out
		}
		// The parapet's broken end, crumbling: a stub or two.
		for (let y = top; y < top + 8; y += 2)
			face.push(fill(row(side, y, snap(random() * 6), frontTop), WALL.parapet))
	}
	// The hillside, its bushes' tops ragged, as the Ground draws it either side.
	const hillside: PixelRect[] = []
	const leaves: PixelRect[] = []
	for (const i of columns) {
		const x = DRAWN_FROM + i * GROUND_STEP - left
		const line = hill(i) + PATH_FRONT
		const rim =
			line + WALL_FOOT - 4 + snap(wallBushes(columnMiddle(i))) - frontTop
		hillside.push([x, rim, GROUND_STEP, 2, HILL_RIM])
		hillside.push([
			x,
			rim + 2,
			GROUND_STEP,
			frontBottom - frontTop - rim - 2,
			HILLSIDE,
		])
		leaves.push([x, rim + 2, GROUND_STEP, LEAVES_DEPTH, ''])
		for (const [offset, shade] of HILL_SHADE) {
			const y = line + offset - frontTop
			hillside.push([x, y, GROUND_STEP, frontBottom - frontTop - y, shade])
		}
	}
	/** A tile's rects, over this picture, lined up with the Ground's. */
	const tiled = (
		pattern: typeof BRICK_TILE,
		x0: number,
		y0: number,
		x1: number,
		y1: number,
	) =>
		pattern
			.over(
				left - DRAWN_FROM + x0,
				frontTop + y0,
				left - DRAWN_FROM + x1,
				frontTop + y1,
			)
			.map(
				([x, y, w, h, colour]): PixelRect => [
					x - (left - DRAWN_FROM),
					y - frontTop,
					w,
					h,
					colour,
				],
			)
	const bounds = (rects: PixelRect[]) => [
		Math.min(...rects.map((r) => r[1])),
		Math.max(...rects.map((r) => r[1] + r[3])),
	]
	const [brickFrom, brickTo] = bounds(brickClip)
	const [leavesFrom, leavesTo] = bounds(leaves)
	const clip = (id: string, rects: PixelRect[]) =>
		`<clipPath id="${id}">${rectsMarkup(rects.map((r) => fill(r, '#000')))}</clipPath>`
	const frontHeight = frontBottom - frontTop
	// The face's broken brick, then the bushes round its foot, in front of it.
	const frontSvg = svgUrl(
		span,
		frontHeight,
		`<defs>${clip('brick', brickClip)}${clip('leaves', leaves)}</defs>${rectsMarkup(face)}<g clip-path="url(#brick)">${rectsMarkup(tiled(BRICK_TILE, 0, brickFrom, span, brickTo))}</g>${rectsMarkup(lit)}${rectsMarkup(hillside)}<g clip-path="url(#leaves)">${rectsMarkup(tiled(SHRUB_TILE, 0, leavesFrom, span, leavesTo))}</g>`,
	)
	const backHeight = backBottom - backTop
	const backSvg = svgUrl(span, backHeight, rectsMarkup(back))

	/** Stood so its top's at `top`, as Scenery's placed: up from the path's back edge, at its highest under it. */
	const x = (left + right) / 2
	const pathTop =
		Math.min(
			terrain.groundY(left),
			terrain.groundY(x),
			terrain.groundY(right),
		) - PATH_BACK
	return [
		{
			x,
			asset: backSvg,
			overGap: true,
			setBack: pathTop - backTop - backHeight,
		},
		{
			x,
			asset: frontSvg,
			front: true,
			setBack: pathTop - frontTop - frontHeight,
		},
	]
}
