import { type PixelRect, paintedArt, pixelArt } from './pixelArt'

/**
 * The haunted house's outside, and what's built into it, in world pixels:
 * its front door, the turret and chimney on its roof, the banister up its
 * stairs, the window out at the end of its upper floor, and the open grave
 * past it. Each is drawn at a cell to two world pixels, so half its size in
 * cells, in the house's own colours.
 */

// The house's colours (as `hauntedHouse.ts` has them).
const SIDING = '#3d3448'
const SIDING_LIT = '#4d4259'
const SIDING_SHADE = '#2c2535'
const SIDING_DARK = '#221c2a'
const TRIM = '#5b5068'
const TRIM_LIT = '#6d6280'
const FRAME = '#211b28'
const PANE = '#e9b23f'
const PANE_LIT = '#ffd56b'
const PANE_DARK = '#9c6a1e'
const SLATE = '#2a2233'
const SLATE_LIT = '#5a4b66'
const SLATE_SHADE = '#1a1520'
const STONE = '#4b4a52'
const STONE_LIT = '#5e5d66'
const STONE_SEAM = '#33323a'
// Old, dark wood: its doors, and its banister.
const WOOD = '#3a2723'
const WOOD_LIT = '#4e362e'
const WOOD_DARK = '#271a17'
const RAIL = '#2b1f19'
const RAIL_LIT = '#5a4234'
const RAIL_SHADE = '#1f1712'
// Wrought iron.
const IRON = '#3a3640'
const IRON_LIT = '#6a6476'
// Glass, in the moonlight.
const GLASS = '#a9c8d8'
const GLASS_LIT = '#e8f6ff'
const GLASS_SHADE = '#7f9fb2'
// The grave's earth, and the ground round it.
const EARTH = '#4a3628'
const EARTH_LIT = '#6a4e3a'
const EARTH_SHADE = '#33251c'
const HOLE = '#140d0c'
const GROUND = '#2c3427'
const GROUND_DARK = '#20271c'

/**
 * Whether a cell's in a pointed (gothic) arch: `half` wide either side of
 * `middle`, its sides straight up to `spring`, then curving in to a point,
 * each side an arc `radius` round, centred across the middle from it.
 */
function inArch(
	x: number,
	y: number,
	middle: number,
	half: number,
	radius: number,
	spring: number,
) {
	const dx = x - middle
	if (Math.abs(dx) >= half) return false
	if (y >= spring) return true
	const off = radius - half
	const dy = y - spring
	return (
		(dx - off) ** 2 + dy ** 2 < radius ** 2 &&
		(dx + off) ** 2 + dy ** 2 < radius ** 2
	)
}

/** A rough edge: how far in it's ragged at `i`, 0 to `depth`, the same each time. */
function ragged(i: number, depth: number, seed = 0) {
	const h = Math.sin((i + 1) * 12.9898 + seed * 78.233) * 43758.5453
	return Math.floor((h - Math.floor(h)) * (depth + 1))
}

/** Small letters, 3 cells by 5, for a hand-painted sign: `#` painted. */
const SMALL_GLYPHS: Record<string, string[]> = {
	K: ['#.#', '#.#', '##.', '#.#', '#.#'],
	E: ['###', '#..', '##.', '#..', '###'],
	P: ['##.', '#.#', '##.', '#..', '#..'],
	O: ['###', '#.#', '#.#', '#.#', '###'],
	U: ['#.#', '#.#', '#.#', '#.#', '###'],
	T: ['###', '.#.', '.#.', '.#.', '.#.'],
}

/** Whether a cell's painted in `text`, in small letters, a cell between them, from its top left. */
function inSmallText(text: string, x: number, y: number) {
	if (x < 0 || y < 0 || y >= 5) return false
	const char = text[Math.floor(x / 4)]
	return SMALL_GLYPHS[char]?.[y][x % 4] === '#'
}

/**
 * Its front door, from outside, on its siding, 64 by 100: a tall gothic
 * double door, dark planks under a pointed arch of trim, iron straps across
 * it, and an iron ring knocker on its right leaf. Over it, a little porch
 * canopy, pointed, in the roof's slate, on two brackets; under it, a stone
 * step on the path. Nailed across it, crooked, a plank, KEEP OUT on it in
 * red paint.
 */
export const FRONT_DOOR = {
	asset: paintedArt(32, 50, (px, py) => {
		const x = Math.floor(px)
		const y = Math.floor(py)
		const dx = px - 16

		// The plank, nailed across it crooked: down a cell between its second
		// and third letters, and again past its last.
		const col = x - 7
		const step = col < 9 ? 0 : col < 17 ? 1 : 2
		const row = y - 30 - step
		if (col >= 0 && col < 20 && row >= 0 && row < 13) {
			if (
				inSmallText('KEEP', col - 2, row - 1) ||
				inSmallText('OUT', col - 5, row - 7)
			)
				return '#7a1f1f'
			if ((col === 0 || col === 19) && (row === 2 || row === 10)) return FRAME
			if (row === 0) return '#a08866'
			if (row === 12 || (row === 6 && col % 7 > 4)) return '#5e4c38'
			return '#8a7356'
		}

		// The canopy: slate down both sides of a point, lit along its top,
		// the gable under it in shadow, and the beam across its foot.
		if (y < 10) {
			const out = 1.6 * py + 1
			const ax = Math.abs(dx)
			if (ax > out) return undefined
			if (ax > out - 1.2) return SLATE_LIT
			if (ax > out - 3.2) return SLATE
			if (ax > out - 4.2) return SLATE_SHADE
			return SIDING_DARK
		}
		if (y === 10 && x >= 1 && x < 31) return TRIM_LIT
		if (y === 11 && x >= 1 && x < 31) return FRAME
		// Its brackets, under the beam, against the wall.
		if (y >= 12 && y < 15) {
			const reach = 15 - y
			if ((x >= 2 && x < 2 + reach) || (x < 30 && x >= 30 - reach)) return FRAME
		}

		// The stone step it opens onto.
		if (y >= 46 && x >= 3 && x < 29)
			return y === 46 ? STONE_LIT : y === 49 ? STONE_SEAM : STONE
		if (y >= 46) return undefined

		const door = inArch(px, py, 16, 10, 13, 26)
		if (!door) {
			// The arch round it, trim, its far side in shade.
			if (inArch(px, py, 16, 12, 15, 26))
				return dx > 10 ? SIDING_LIT : dx < -10.5 ? TRIM_LIT : TRIM
			return undefined
		}
		// Under the arch, the top of the door in its shadow.
		if (!inArch(px, py - 1.5, 16, 10, 13, 26)) return WOOD_DARK

		// The knocker: a boss, and an iron ring hung from it.
		const ring: [number, number][] = [
			[19, 27],
			[22, 27],
			[19, 28],
			[22, 28],
			[20, 29],
			[21, 29],
		]
		if (y >= 23 && y < 26 && x >= 20 && x < 22)
			return y === 23 ? IRON_LIT : IRON
		if (ring.some(([rx, ry]) => rx === x && ry === y))
			return y === 27 ? IRON_LIT : IRON
		// Iron straps across both leaves, a nail every few cells.
		for (const top of [18, 41])
			if ((y === top || y === top + 1) && x !== 15)
				return y === top && x % 3 === 1 ? IRON_LIT : IRON

		// Where its leaves meet, and the planks of each.
		if (x === 15) return FRAME
		if (x === 6 || x === 16) return WOOD_LIT
		if (x === 9 || x === 12 || x === 19 || x === 22) return WOOD_DARK
		return WOOD
	}),
	width: 64,
	height: 100,
}

/**
 * A turret on its roof, its spire up off it: its foot's on the roof. 96 by
 * 176: a round tower in the house's siding, lit down its left and in shade
 * down its right, one narrow pointed window lit, a band of trim under its
 * eave; a conical spire of slate on it, in courses, its left edge lit; and
 * on its point an iron weathervane, an arrow over a ball.
 */
export const TURRET = {
	asset: paintedArt(48, 88, (px, py) => {
		const x = Math.floor(px)
		const y = Math.floor(py)
		const dx = px - 24

		// The weathervane: its rod, its ball, and its arrow.
		if (y < 9) {
			if (y >= 5 && y < 7 && x >= 22 && x < 26)
				return y === 5 && x < 24 ? IRON_LIT : IRON
			if (y === 2 && x >= 16 && x < 32) return x >= 30 ? IRON_LIT : IRON
			if ((y === 1 || y === 3) && (x === 16 || x === 17 || x === 30))
				return IRON
			if (x === 23 || x === 24) return IRON
			return undefined
		}

		// The spire: slate, in courses, out to its eave.
		if (y < 40) {
			const half = ((py - 8) / 32) * 19
			if (Math.abs(dx) > half) return undefined
			const across = (dx + half) / (2 * half)
			if (across < 0.12) return SLATE_LIT
			if (across > 0.8) return SLATE_SHADE
			return y % 4 === 3 ? SLATE_SHADE : SLATE
		}
		if (y === 40) return x >= 4 && x < 44 ? SLATE_LIT : undefined
		if (y === 41) return x >= 4 && x < 44 ? SLATE : undefined

		// The tower.
		if (Math.abs(dx) > 13) return undefined
		if (y === 42) return SLATE_SHADE
		if (y === 43) return TRIM_LIT
		if (y === 44) return TRIM

		// Its window: a frame, pointed, its panes lit, a sill under it.
		if (y === 72 && x >= 19 && x < 29) return TRIM_LIT
		if (inArch(px, py, 24, 4, 6, 56) && y < 72) {
			if (!inArch(px, py, 24, 3, 5, 57) || x === 23 || x === 24) return FRAME
			if (y === 71) return PANE_DARK
			return inArch(px, py - 1, 24, 3, 5, 57) ? PANE : PANE_LIT
		}

		// Clapboards, round the tower: lit on its left, shaded on its right.
		const across = (dx + 13) / 26
		const tones =
			across < 0.15
				? [SIDING_LIT, TRIM, SIDING]
				: across > 0.75
					? [SIDING_SHADE, SIDING, SIDING_DARK]
					: [SIDING, SIDING_LIT, SIDING_SHADE]
		const board = (y - 45) % 4
		return board === 0 ? tones[1] : board === 3 ? tones[2] : tones[0]
	}),
	width: 96,
	height: 176,
}

/**
 * A chimney on its roof, its foot sunk in it, 32 by 60: old brick, crooked,
 * leaning further over the higher it goes; a stone cap on it, a clay pot on
 * that, and a wisp of pale smoke drifting off.
 */
export const CHIMNEY = {
	asset: pixelArt(16, 30, [
		// The smoke, thinning as it drifts off to the right.
		[6, 4, 4, 2, 'rgba(206, 196, 218, 0.55)'],
		[8, 2, 4, 2, 'rgba(206, 196, 218, 0.4)'],
		[11, 0, 4, 2, 'rgba(206, 196, 218, 0.25)'],
		[7, 4, 2, 1, 'rgba(232, 226, 240, 0.5)'],
		// Its brick stack, in three stretches, each a cell further over.
		...(
			[
				[3, 22, 8],
				[4, 16, 6],
				[5, 12, 4],
			] as const
		).flatMap(([left, top, height]): PixelRect[] => [
			[left, top, 10, height, '#5c302b'],
			[left, top, 1, height, '#77423a'],
			[left + 8, top, 2, height, '#40221f'],
		]),
		// Its mortar, a course at a time, the joints staggered.
		...[14, 18, 21, 25, 28].map((y): PixelRect => {
			const left = y < 16 ? 5 : y < 22 ? 4 : 3
			return [left, y, 10, 1, '#2e1a18']
		}),
		...(
			[
				[8, 12],
				[11, 15],
				[7, 15],
				[9, 19],
				[6, 22],
				[10, 22],
				[8, 26],
				[5, 26],
				[11, 29],
			] as const
		).map(([x, y]): PixelRect => [x, y, 1, 2, '#2e1a18']),
		// Its cap, stone, and the pot on it.
		[4, 9, 12, 3, STONE],
		[4, 9, 12, 1, STONE_LIT],
		[4, 11, 12, 1, STONE_SEAM],
		[8, 6, 4, 3, '#6b3d2c'],
		[8, 6, 1, 3, '#875038'],
		[8, 6, 4, 1, '#875038'],
		[9, 6, 2, 1, '#1f1214'],
	]),
	width: 32,
	height: 60,
}

/**
 * The banister, up the stairs, from their foot (left) to their top (right),
 * 300 by 140, its bottom edge on the stairs' back edge at their foot: a
 * dark handrail, 34 up over the stairs and rising with them, levelling off
 * where it reaches the top; thin balusters down from it to the stairs every
 * 12; a newel post at the foot with a ball on it, and a short one at the
 * top. Under the stairs' line, nothing.
 */
export const BANISTER = {
	asset: (() => {
		// The stairs' back edge, rising 2 in every 5 across: 70 at the foot, 10 at the top.
		const stair = (x: number) => Math.round(70 - 0.4 * (x + 0.5))
		const rail = (x: number) => Math.max(3, stair(x) - 17)
		const rects: PixelRect[] = []
		// The rail, a column at a time, its top lit.
		for (let x = 6; x < 145; x++) {
			rects.push([x, rail(x), 1, 1, RAIL_LIT], [x, rail(x) + 1, 1, 1, RAIL])
		}
		// Balusters, from under the rail to the stairs.
		for (let x = 12; x < 145; x += 6) {
			rects.push([x, rail(x) + 2, 1, stair(x) - rail(x) - 2, RAIL])
		}
		rects.push(
			// The newel post at the foot: its base, its shaft, a ring
			// turned in it, its cap, and the ball on that.
			[0, 60, 6, 10, RAIL],
			[0, 60, 6, 1, RAIL_LIT],
			[0, 61, 1, 9, RAIL_LIT],
			[5, 61, 1, 9, RAIL_SHADE],
			[1, 48, 4, 12, RAIL],
			[1, 48, 1, 12, RAIL_LIT],
			[4, 48, 1, 12, RAIL_SHADE],
			[1, 53, 4, 1, RAIL_LIT],
			[0, 45, 6, 3, RAIL],
			[0, 45, 6, 1, RAIL_LIT],
			[2, 44, 2, 1, RAIL],
			[1, 40, 4, 4, RAIL],
			[2, 39, 2, 1, RAIL],
			[1, 40, 2, 2, RAIL_LIT],
			[2, 39, 1, 1, RAIL_LIT],
			// The post at the top, under its cap.
			[145, 2, 4, stair(147) - 2, RAIL],
			[145, 2, 1, stair(147) - 2, RAIL_LIT],
			[148, 2, 1, stair(147) - 2, RAIL_SHADE],
			[144, 0, 6, 2, RAIL],
			[144, 0, 6, 1, RAIL_LIT],
		)
		return pixelArt(150, 70, rects)
	})(),
	width: 300,
	height: 140,
}

/** The window's panes, top to bottom: from, and to, in cells. */
const WINDOW_PANES: [number, number][] = [
	[4, 14],
	[15, 27],
	[29, 41],
	[42, 52],
]

/** The window's frame, sill and lintel, and its glazing bars, whole or broken off. */
function windowFrame(broken: boolean): PixelRect[] {
	const bars: [number, number][] = [
		[14, 1],
		[27, 2],
		[41, 1],
	]
	return [
		[0, 0, 12, 2, TRIM],
		[0, 0, 12, 1, TRIM_LIT],
		[1, 2, 10, 2, FRAME],
		[1, 52, 10, 2, FRAME],
		[1, 2, 2, 52, FRAME],
		[9, 2, 2, 52, FRAME],
		[0, 54, 12, 2, TRIM],
		[0, 54, 12, 1, TRIM_LIT],
		...bars.flatMap(([y, h]): PixelRect[] =>
			broken
				? [
						[3, y, 2, h, FRAME],
						[8, y, 1, h, FRAME],
					]
				: [[3, y, 6, h, FRAME]],
		),
	]
}

/**
 * The window out, at the end of the upper floor, 24 by 112, its bottom on
 * the floor: a tall, narrow sash window, nearly edge on, its frame dark,
 * moonlit glass in it, a glint on each pane. Smashed, the same frame, its
 * glazing bars snapped off short, and nothing left of the glass but jagged
 * shards round the edges of each pane.
 */
export const WINDOW = {
	whole: pixelArt(12, 56, [
		...windowFrame(false),
		...WINDOW_PANES.flatMap(([top, bottom]): PixelRect[] => [
			[3, top, 6, bottom - top, GLASS],
			[3, top, 6, 1, GLASS_SHADE],
			[8, top, 1, bottom - top, GLASS_SHADE],
			[4, top + 4, 1, 2, GLASS_LIT],
			[5, top + 2, 1, 2, GLASS_LIT],
			[6, top + 1, 1, 1, GLASS_LIT],
		]),
	]),
	smashed: paintedArt(12, 56, (px, py) => {
		const x = Math.floor(px)
		const y = Math.floor(py)
		const frame = windowFrame(true).findLast(
			([fx, fy, fw, fh]) => x >= fx && x < fx + fw && y >= fy && y < fy + fh,
		)
		if (frame) return frame[4]
		const pane = WINDOW_PANES.findIndex(([t, b]) => y >= t && y < b)
		if (pane < 0 || x < 3 || x >= 9) return undefined
		const [top, bottom] = WINDOW_PANES[pane]
		// Shards, in from each edge of the pane, as far as it's ragged there.
		const shard =
			x - 3 < Math.max(0, ragged(y, 4, 1) - 2) ||
			8 - x < Math.max(0, ragged(y, 3, 2) - 1) ||
			y - top < Math.max(0, ragged(x + pane * 7, 5, 3) - 2) ||
			bottom - 1 - y < Math.max(0, ragged(x + pane * 7, 4, 4) - 2)
		if (!shard) return undefined
		return y - top < 1 || x - 3 < 1 ? GLASS_LIT : GLASS
	}),
	width: 24,
	height: 112,
}

/**
 * The open grave a ghost comes up out of, in front of the path: its lip
 * `lip` up over the path. 64 by 64: loose earth heaped either side of a
 * dark hole, the far side of it lit, the near lip lumpy, clods in it; and
 * under that, the earth giving way raggedly to the ground's, so the ghost's
 * bottom is hidden all the way down.
 */
export const GRAVE_MOUND = {
	asset: paintedArt(32, 32, (px, py) => {
		const x = Math.floor(px)
		const y = Math.floor(py)
		// Its top: heaped up level across the middle, falling away at its ends.
		const top = [6, 4, 2, 1, 1, 0][x] ?? [0, 0, 1, 2, 3, 5][x - 26] ?? 0
		if (y < top) return undefined
		// Its sides, ragged down into the ground.
		const side = y < 8 ? 0 : 1 + ragged(y, 3, 5)
		if (x < side || x > 31 - side) return undefined

		// The hole: its far side lit, its depths dark.
		const holeFrom = y === 1 ? 10 : 9
		const holeTo = y === 1 ? 22 : 23
		const lump = (x === 12 || x === 13 || x === 19) && y === 3
		if (y >= 1 && y <= 3 && x >= holeFrom && x < holeTo && !lump)
			return y === 1 ? EARTH_SHADE : HOLE
		// The earth: lit along its top (crumbly along the hole's far side),
		// clods in it.
		const earthTo = 11 + ragged(Math.floor(x / 2), 3, 6)
		if (y < earthTo) {
			if (y === 0 && x >= 10 && x < 22) return x % 4 === 1 ? EARTH_LIT : EARTH
			if (y === top || lump || (y === 4 && x >= 9 && x < 23)) return EARTH_LIT
			const clods: [number, number][] = [
				[4, 6],
				[14, 7],
				[24, 6],
				[9, 9],
				[19, 9],
				[27, 8],
				[6, 2],
				[25, 2],
			]
			if (clods.some(([cx, cy]) => cx === x && cy === y)) return EARTH_LIT
			if (clods.some(([cx, cy]) => cx === x && cy + 1 === y)) return EARTH_SHADE
			return y >= earthTo - 1 ? EARTH_SHADE : EARTH
		}
		// Then the ground, a few crumbs of earth in it.
		const crumbs: [number, number][] = [
			[5, 16],
			[17, 17],
			[24, 15],
			[11, 21],
		]
		if (crumbs.some(([cx, cy]) => cx === x && cy === y)) return EARTH_SHADE
		if (y === 26 && (x === 8 || x === 21)) return GROUND_DARK
		return GROUND
	}),
	width: 64,
	height: 64,
	lip: 10,
}
