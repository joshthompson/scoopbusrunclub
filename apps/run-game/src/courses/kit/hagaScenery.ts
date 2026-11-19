import { type PixelRect, pixelArt } from './pixelArt'
import { seeded } from './seeded'

/**
 * Haga's own scenery, drawn in code, to go in among its oaks and pines:
 * Swedish birches, lilac bushes, the park's green benches and old lamps,
 * and Ekotemplet, the Echo Temple, Gustav III's open summer dining room on
 * the slope down to Brunnsviken. Drawn at scale 2.
 */

const LEAF = '#7fae4a'
const LEAF_LIT = '#a2c95f'
const LEAF_DARK = '#5a8a36'
const BIRCH = '#eeeae0'
const BIRCH_SHADE = '#c9c3b4'
const BIRCH_MARK = '#2f2b28'

/** A loose clump of leaves round (cx, cy), `r` across, lit from the top left. */
function clump(random: () => number, cx: number, cy: number, r: number) {
	const rects: PixelRect[] = []
	for (let y = -r; y <= r; y++)
		for (let x = -r; x <= r; x++) {
			const d = Math.hypot(x, y * 1.2) / r
			// Ragged at its edge, leaves missing here and there.
			if (d > 1 || (d > 0.7 && random() < 0.45)) continue
			const lit = x + y < -r * 0.4
			const shade = x + y > r * 0.6
			rects.push([
				cx + x,
				cy + y,
				1,
				1,
				lit ? LEAF_LIT : shade ? LEAF_DARK : random() < 0.2 ? LEAF_DARK : LEAF,
			])
		}
	return rects
}

/**
 * A silver birch: a slim white trunk with black marks, a little lean, and
 * airy clumps of light green leaves up it, drooping at their ends. 26 by
 * 60, from its own `seed`.
 */
function birch(seed: number, lean: number) {
	const random = seeded(seed)
	const W = 26
	const H = 60
	const rects: PixelRect[] = []
	const trunkAt = (y: number) => Math.round(12 + (lean * (H - y)) / H)
	// Its trunk, 3 wide at the foot, 2 up top.
	for (let y = 8; y < H; y++) {
		const x = trunkAt(y)
		const w = y > 40 ? 3 : 2
		rects.push([x, y, w, 1, BIRCH])
		rects.push([x + w - 1, y, 1, 1, BIRCH_SHADE])
		// Its black marks, in short dashes across it.
		if (random() < 0.22)
			rects.push([x, y, 1 + Math.round(random()), 1, BIRCH_MARK])
	}
	// Dark at the foot, as old birches go.
	rects.push([trunkAt(H - 1) - 1, H - 3, 5, 3, BIRCH_MARK])
	rects.push([trunkAt(H - 4), H - 6, 2, 2, BIRCH_MARK])
	// Thin branches out to the clumps.
	const clumps: [number, number, number][] = [
		[trunkAt(10), 7, 6],
		[trunkAt(18) - 6, 17, 5],
		[trunkAt(20) + 7, 20, 5],
		[trunkAt(28) - 5, 29, 5],
		[trunkAt(31) + 6, 32, 4],
		[trunkAt(38) - 3, 39, 3],
	]
	for (const [cx, cy] of clumps) {
		const tx = trunkAt(cy + 2)
		const from = Math.min(cx, tx)
		rects.push([from, cy + 2, Math.abs(cx - tx) + 1, 1, BIRCH_MARK])
	}
	for (const [cx, cy, r] of clumps) {
		rects.push(...clump(random, cx, cy, r))
		// Hanging twigs of leaves, a birch's droop.
		for (let i = 0; i < r; i++)
			if (random() < 0.6)
				rects.push([
					cx - r + Math.floor(random() * r * 2),
					cy + r,
					1,
					1 + Math.floor(random() * 3),
					LEAF_DARK,
				])
	}
	return pixelArt(
		W,
		H,
		rects.filter(([x, y]) => x >= 0 && x < W && y >= 0 && y < H),
	)
}

export const birchLeft = birch(311, -2)
export const birchRight = birch(722, 3)

/** A birch that's young yet: a sapling by the path, 26 by 60, mostly trunk. */
export const birchTall = birch(1906, 0)

const LILAC = '#a585c9'
const LILAC_LIT = '#c7aee0'
const LILAC_DARK = '#7f62a6'

/** A lilac bush in flower, syren, in every Swedish park in June. 26 by 18. */
export const lilacBush = (() => {
	const random = seeded(1772)
	const rects: PixelRect[] = [
		...clump(random, 8, 10, 7),
		...clump(random, 17, 9, 8),
		...clump(random, 13, 6, 5),
	]
	// Its cones of flowers, poking up out of it.
	for (const [x, y] of [
		[5, 4],
		[11, 2],
		[16, 3],
		[21, 5],
		[8, 9],
		[19, 10],
		[14, 11],
	]) {
		rects.push([x, y, 2, 1, LILAC_LIT])
		rects.push([x, y + 1, 2, 2, LILAC])
		rects.push([x + 1, y + 2, 1, 1, LILAC_DARK])
	}
	return pixelArt(
		26,
		18,
		rects.filter(([x, y]) => x >= 0 && x < 26 && y >= 0 && y < 18),
	)
})()

const IRON = '#2f4a37'
const IRON_LIT = '#456b50'
const SLAT = '#3f6a48'
const SLAT_LIT = '#5d8c63'

/** A park bench: green slats on dark green cast iron legs and arms. 18 by 10. */
export const parkBench = pixelArt(18, 10, [
	// Its back, two slats.
	[2, 0, 14, 1, SLAT_LIT],
	[2, 1, 14, 1, SLAT],
	[2, 3, 14, 1, SLAT_LIT],
	[2, 4, 14, 1, SLAT],
	// Its seat.
	[1, 6, 16, 1, SLAT_LIT],
	[1, 7, 16, 1, SLAT],
	// Its iron ends: arms curled over, legs down.
	[1, 0, 1, 10, IRON],
	[16, 0, 1, 10, IRON],
	[0, 5, 2, 1, IRON_LIT],
	[16, 5, 2, 1, IRON_LIT],
	[0, 9, 2, 1, IRON],
	[16, 9, 2, 1, IRON],
	[8, 8, 2, 2, IRON],
])

const LAMP_GLASS = '#f6efc8'

/** One of the park's old lamps: a black post, a lantern on top. 7 by 36. */
export const parkLamp = pixelArt(7, 36, [
	// Its lantern.
	[3, 0, 1, 1, BIRCH_MARK],
	[1, 1, 5, 1, BIRCH_MARK],
	[0, 2, 7, 1, BIRCH_MARK],
	[1, 3, 5, 5, LAMP_GLASS],
	[1, 3, 1, 5, BIRCH_MARK],
	[5, 3, 1, 5, BIRCH_MARK],
	[3, 3, 1, 5, '#d8cc9a'],
	[1, 8, 5, 1, BIRCH_MARK],
	[2, 9, 3, 1, BIRCH_MARK],
	// Its post, a collar halfway, and a foot.
	[3, 10, 1, 24, BIRCH_MARK],
	[2, 20, 3, 1, BIRCH_MARK],
	[2, 33, 3, 2, BIRCH_MARK],
	[1, 35, 5, 1, BIRCH_MARK],
])

const TEMPLE = '#f1e3b6'
const TEMPLE_LIT = '#fbf2d4'
const TEMPLE_SHADE = '#d2bf8c'
const TEMPLE_DARK = '#8f7f58'
const DOME = '#6f9e93'
const DOME_LIT = '#8fbcae'
const DOME_DARK = '#4f7a70'

/**
 * Ekotemplet, the Echo Temple: an open half-round of pale yellow columns
 * under a shallow green copper dome, on a step of stone, and the shade
 * inside it. 64 by 50.
 */
export const echoTemple = (() => {
	const W = 64
	const H = 50
	const rects: PixelRect[] = []
	// Its dome, a shallow half ellipse, verdigris, lit from the left.
	for (let y = 0; y < 12; y++) {
		const half = Math.round(26 * Math.sqrt(1 - ((11 - y) / 12) ** 2))
		const from = 32 - half
		rects.push([from, 6 + y, half * 2, 1, DOME])
		rects.push([from, 6 + y, Math.max(1, Math.round(half * 0.5)), 1, DOME_LIT])
		rects.push([32 + half - 3, 6 + y, 3, 1, DOME_DARK])
	}
	// A ball and spike on top.
	rects.push([31, 2, 2, 4, TEMPLE_DARK], [30, 3, 4, 2, TEMPLE_SHADE])
	// Its cornice, all the way round.
	rects.push([4, 18, 56, 2, TEMPLE_LIT], [4, 20, 56, 3, TEMPLE])
	rects.push([4, 23, 56, 1, TEMPLE_SHADE])
	// The shade inside, behind the columns.
	rects.push([6, 24, 52, 21, '#5f5847'])
	rects.push([6, 24, 52, 3, '#4a4438'])
	// Its columns, the middle ones further off and narrower: a half-round.
	for (const [x, w] of [
		[6, 4],
		[15, 3],
		[23, 3],
		[31, 2],
		[38, 3],
		[46, 3],
		[54, 4],
	]) {
		rects.push([x, 24, w, 21, TEMPLE])
		rects.push([x, 24, 1, 21, TEMPLE_LIT])
		rects.push([x + w - 1, 24, 1, 21, TEMPLE_SHADE])
		// Capital and base.
		rects.push([x - 1, 24, w + 2, 1, TEMPLE_LIT])
		rects.push([x - 1, 44, w + 2, 1, TEMPLE_SHADE])
	}
	// Its steps.
	rects.push([2, 45, 60, 2, TEMPLE_SHADE], [2, 45, 60, 1, TEMPLE])
	rects.push([0, 47, 64, 3, TEMPLE_DARK], [0, 47, 64, 1, TEMPLE_SHADE])
	return pixelArt(W, H, rects)
})()

const BRICK = '#c26a4a'
const BRICK_LIT = '#d4805e'
const BRICK_LINE = '#a85638'
const ROOF = '#3a3d42'
const ROOF_LIT = '#55595f'
const STONE = '#b9b4a8'
const SHUTTER = '#3c4a3e'
const IRONWORK = '#e8ecef'
const IRONWORK_SHADE = '#b7bec4'
const GOLD = '#e0b228'
const GOLD_DARK = '#a87e14'

/** A gatehouse: brick-red walls in courses, a dark hipped roof, an arched shutter, on stone. 30 by 34. */
function gatehouse(x0: number, chimneyRight: boolean): PixelRect[] {
	const rects: PixelRect[] = [
		// Its roof, wider than it, sloping both ways.
		[x0 + 4, 4, 22, 2, ROOF],
		[x0 + 2, 6, 26, 2, ROOF],
		[x0, 8, 30, 2, ROOF],
		[x0 + 4, 4, 22, 1, ROOF_LIT],
		[x0, 10, 30, 1, '#2a2c30'],
		// Its gable, a pediment of lighter brick.
		[x0 + 9, 11, 12, 1, BRICK_LIT],
		[x0 + 6, 12, 18, 1, BRICK_LIT],
		[x0 + 3, 13, 24, 1, STONE],
		// Its chimney.
		[x0 + (chimneyRight ? 22 : 5), 0, 4, 5, ROOF],
		// Its walls.
		[x0 + 2, 14, 26, 16, BRICK],
		[x0 + 2, 14, 2, 16, BRICK_LIT],
	]
	// Courses of brick.
	for (let y = 17; y < 30; y += 3) rects.push([x0 + 2, y, 26, 1, BRICK_LINE])
	// The arched window, shuttered green.
	rects.push(
		[x0 + 11, 17, 8, 1, BRICK_LINE],
		[x0 + 10, 18, 10, 10, BRICK_LINE],
		[x0 + 12, 18, 6, 1, SHUTTER],
		[x0 + 11, 19, 8, 8, SHUTTER],
		[x0 + 15, 19, 1, 8, '#2a352c'],
	)
	// On stone.
	rects.push([x0 + 1, 30, 28, 4, STONE], [x0 + 1, 30, 28, 1, '#d2cec4'])
	return rects
}

/** `rects` drawn `k` times the size, each still on whole cells. */
function enlarged(rects: PixelRect[], k: number): PixelRect[] {
	return rects.map(([x, y, w, h, c]) => {
		const x0 = Math.round(x * k)
		const y0 = Math.round(y * k)
		return [
			x0,
			y0,
			Math.round((x + w) * k) - x0,
			Math.round((y + h) * k) - y0,
			c,
		]
	})
}

/**
 * One of Haga's gatehouses, either side of the way in: brick-red, a
 * pediment, a shuttered arched window, under a slate roof. Drawn half as
 * big again as `gatehouse`, to stand by a gate the bus fits through. 45
 * by 51.
 */
export const gatehouseLeft = pixelArt(
	45,
	51,
	enlarged(gatehouse(0, false), 1.5),
)
export const gatehouseRight = pixelArt(
	45,
	51,
	enlarged(gatehouse(0, true), 1.5),
)

/**
 * How Haga's gateway goes back across the path, in cells: its far post this
 * far along from its near one, and this far up, as everything going back
 * across the path is (`DEPTH_SLANT` px along for `PATH_BACK + PATH_FRONT`
 * up).
 */
const GATE_SLANT = 28
const GATE_DEPTH = 18
/** Its posts: how tall, to where the arch springs, and how thick. Tall enough for the bus. */
const POST_HEIGHT = 80
const POST = 4
/** How much higher the arch is in its middle than where it springs from the posts. */
const ARCH_RISE = 8
/** A gate leaf, swung open along the path's edge: how long and how tall. */
const LEAF_LENGTH = 16
const LEAF_HEIGHT = 20

/** A white wrought-iron post, on a stone plinth, a gold ball on top: its foot at `bottom`. */
function gatePost(bottom: number): PixelRect[] {
	const top = bottom - POST_HEIGHT
	return [
		[1, top, POST, POST_HEIGHT, IRONWORK],
		[1 + POST - 1, top, 1, POST_HEIGHT, IRONWORK_SHADE],
		// Rings round it, every so often.
		...[0.25, 0.5, 0.75].map(
			(t): PixelRect => [
				0,
				Math.round(top + POST_HEIGHT * t),
				POST + 2,
				1,
				IRONWORK_SHADE,
			],
		),
		// Its plinth.
		[0, bottom - 10, POST + 2, 10, STONE],
		[0, bottom - 10, POST + 2, 1, '#d2cec4'],
		[POST + 1, bottom - 9, 1, 9, '#9a9588'],
		// Its gold ball.
		[2, top - 3, 2, 1, GOLD],
		[1, top - 2, 4, 2, GOLD],
		[3, top - 2, 2, 2, GOLD_DARK],
	]
}

/** A gate leaf, swung open flat along the path's edge from a post at `x`, foot at `bottom`. */
function gateLeaf(x: number, bottom: number): PixelRect[] {
	const top = bottom - LEAF_HEIGHT
	const rects: PixelRect[] = [
		[x, top, LEAF_LENGTH, 1, IRONWORK],
		[x, top + 5, LEAF_LENGTH, 1, IRONWORK_SHADE],
		[x, bottom - 2, LEAF_LENGTH, 1, IRONWORK],
		[x + LEAF_LENGTH - 1, top, 1, LEAF_HEIGHT - 1, IRONWORK],
	]
	for (let bx = x; bx < x + LEAF_LENGTH; bx += 2) {
		rects.push([bx, top + 1, 1, LEAF_HEIGHT - 3, IRONWORK])
		// Spear points along its top.
		rects.push([bx, top - 1, 1, 1, IRONWORK_SHADE])
	}
	return rects
}

/**
 * Haga's gate, the way in off the road near the start, going back across
 * the path, the bus and all through it: in two pictures, as a gateway is.
 * `front`, over whoever's going through: its near post, its gate leaf
 * swung open along the path's near edge, and the arch of white scrollwork
 * going back from it over the path to the far post, the gold crown and
 * Gustav III's monogram at its top. `back`, behind the path: the far post,
 * its gate leaf swung open along the path's back edge, and a barrel of
 * flowers. Each post's middle `POST_X` cells in from its picture's left.
 */
export const HAGA_GATE = (() => {
	const fw = GATE_SLANT + POST + 2
	const fh = POST_HEIGHT + GATE_DEPTH / 2 + ARCH_RISE + 24
	const middle = 3
	const front: PixelRect[] = [...gatePost(fh), ...gateLeaf(POST + 1, fh)]
	// The arch: two curves of scrollwork going back across the path,
	// rising as they go over it, with curls between them.
	const steps = GATE_SLANT * 3
	for (let i = 0; i <= steps; i++) {
		const t = i / steps
		const x = Math.round(middle + t * GATE_SLANT)
		const y = Math.round(
			fh - POST_HEIGHT - t * GATE_DEPTH - ARCH_RISE * Math.sin(Math.PI * t),
		)
		front.push([x - 1, y - 1, 2, 2, IRONWORK], [x - 1, y - 6, 2, 2, IRONWORK])
		if (i % 6 === 0) front.push([x - 1, y - 4, 2, 3, IRONWORK_SHADE])
		else if (i % 6 === 3) front.push([x, y - 3, 1, 1, IRONWORK_SHADE])
	}
	// The crown, and the monogram's medallion under it, at the arch's top.
	const cx = middle + GATE_SLANT / 2
	const cy = Math.round(fh - POST_HEIGHT - GATE_DEPTH / 2 - ARCH_RISE) - 7
	const crown: PixelRect[] = [
		[0, 0, 8, 1, GOLD],
		[0, 1, 1, 2, GOLD],
		[3, 1, 2, 2, GOLD],
		[7, 1, 1, 2, GOLD],
		[0, 3, 8, 2, GOLD],
		[0, 4, 8, 1, GOLD_DARK],
		[1, 6, 6, 1, GOLD],
		[0, 7, 8, 4, GOLD],
		[1, 11, 6, 1, GOLD],
		[2, 8, 4, 2, '#2c3c56'],
	]
	for (const [x, y, w, h, c] of crown)
		front.push([x + cx - 4, y + cy - 11, w, h, c])

	const bw = POST + 2 + LEAF_LENGTH + 8
	const bh = POST_HEIGHT + 3
	const back: PixelRect[] = [...gatePost(bh), ...gateLeaf(POST + 1, bh)]
	// A barrel of flowers, inside the gate.
	const bx = POST + 2 + LEAF_LENGTH + 1
	back.push([bx, bh - 6, 5, 6, '#7a5a3a'], [bx, bh - 4, 5, 1, '#4e3a26'])
	back.push(
		[bx - 1, bh - 10, 7, 4, LEAF_DARK],
		[bx, bh - 11, 2, 2, LEAF],
		[bx + 2, bh - 10, 2, 1, '#f3f0f5'],
		[bx + 4, bh - 11, 1, 1, LILAC],
	)
	return {
		front: pixelArt(fw, fh, front),
		back: pixelArt(bw, bh, back),
		frontWidth: fw * 2,
		backWidth: bw * 2,
		/** How far in from each picture's left its post's middle is, in px. */
		post: middle * 2,
		/** How far along the far post is from the near one, in px. */
		across: GATE_SLANT * 2,
	}
})()
