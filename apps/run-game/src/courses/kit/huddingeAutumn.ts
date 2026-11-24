import { type PixelRect, pixelArt } from './pixelArt'
import { seeded } from './seeded'

/**
 * Huddinge in autumn, late September into October: the forest's deciduous
 * trees gone gold, orange and red under the spruces' unchanged dark green,
 * the forest floor's bracken and blueberry ris turned, leaves fallen. Same
 * hand and scale as `huddingeForest.ts`, drawn at scale 2. No fly agarics:
 * that's the bad mushroom, so the log's fungi are tan brackets.
 */

/** One foliage colour's tones: lit, base, shade and darkest. */
interface Tones {
	lit: string
	base: string
	shade: string
	dark: string
}

const LEMON: Tones = {
	lit: '#fbe66a',
	base: '#eebc32',
	shade: '#d08e22',
	dark: '#a2661c',
}
const AMBER: Tones = {
	lit: '#fcc654',
	base: '#f0a032',
	shade: '#d07a24',
	dark: '#a2561c',
}
const SCARLET: Tones = {
	lit: '#f0603a',
	base: '#c0302c',
	shade: '#96242a',
	dark: '#6c1a26',
}
const EMBER: Tones = {
	lit: '#f4883a',
	base: '#dd6a22',
	shade: '#b4481f',
	dark: '#843420',
}

const BIRCH_WHITE = '#f0eadd'
const BIRCH_SHADE = '#cdc6b8'
const BIRCH_MARK = '#38302c'
const BIRCH_FOOT = '#6a645e'
const BRANCH = '#a09a90'
const ASPEN_BARK = '#b4b8a2'
const ASPEN_SHADE = '#8e9482'
const ASPEN_MARK = '#4a4a40'
const ROWAN_BARK = '#6e5a4c'
const ROWAN_LIT = '#8c7462'
const ROWAN_SHADE = '#4e3e34'
const BERRY = '#d4281e'
const BERRY_LIT = '#f0583c'

/** Keeps a piece's rects inside its picture. */
const inside = (w: number, h: number, rects: PixelRect[]) =>
	rects.filter(([x, y]) => x >= 0 && x < w && y >= 0 && y < h)

/**
 * A crown of leaves, cell by cell inside an ellipse: lit top left, shaded
 * underneath and down its right, thinning to gaps (`airy`, 0 to 1) towards
 * its edge and its underside.
 */
function crown(
	rects: PixelRect[],
	random: () => number,
	cx: number,
	cy: number,
	rx: number,
	ry: number,
	tones: Tones[],
	airy: number,
) {
	for (let y = -ry; y <= ry; y++) {
		// Leaves in clumps a few cells wide, not single flecks.
		let x = -rx
		while (x <= rx) {
			const run = 1 + Math.floor(random() * 3)
			const d = (x / rx) ** 2 + (y / ry) ** 2
			const t = tones[Math.floor(random() * tones.length)]
			const light = (x / rx + y / ry) / 2
			const gap = random() < airy * (d * d + (y > 0 ? (y / ry) * 0.3 : 0))
			if (d <= 1 && !gap) {
				const colour =
					light < -0.3
						? t.lit
						: light > 0.25 || y / ry > 0.45
							? random() < 0.3
								? t.dark
								: t.shade
							: t.base
				const w = Math.min(run, rx - x + 1)
				for (let i = 0; i < w; i++)
					if (((x + i) / rx) ** 2 + (y / ry) ** 2 <= 1)
						rects.push([cx + x + i, cy + y, 1, 1, colour])
			}
			x += run
		}
	}
}

/**
 * A birch's trunk from `top` down to the ground at `H`, leaning a cell
 * every `lean` rows to the right going up, two cells wide: white lit,
 * shaded down its right, dark dashes across it, grey-dark at its foot.
 */
function birchTrunk(
	rects: PixelRect[],
	random: () => number,
	x0: number,
	top: number,
	H: number,
	lean: number,
) {
	const at = (y: number) => x0 + Math.round((H - y) / lean)
	for (let y = top; y < H; y++) {
		const x = at(y)
		const foot = y >= H - 4
		rects.push([x, y, 1, 1, foot ? '#9a948a' : BIRCH_WHITE])
		rects.push([x + 1, y, 1, 1, foot ? BIRCH_FOOT : BIRCH_SHADE])
		if (!foot && random() < 0.17) {
			const wide = random() < 0.5
			rects.push([x, y, wide ? 2 : 1, 1, BIRCH_MARK])
		}
	}
	// Its foot, a little flared and dark.
	rects.push([at(H - 1) - 1, H - 1, 4, 1, BIRCH_FOOT])
	return at
}

/** A few bare twigs poking out of a crown's gaps, from the trunk's top. */
function branches(
	rects: PixelRect[],
	x: number,
	y: number,
	spans: [number, number, number][],
) {
	for (const [dx, dy, len] of spans)
		for (let i = 0; i < Math.abs(len); i++)
			rects.push([
				x + dx + i * Math.sign(len),
				y + dy - Math.floor(i / 2),
				1,
				1,
				BRANCH,
			])
}

/** A birch, one trunk up into an airy crown. */
function birch(
	seed: number,
	W: number,
	H: number,
	trunkX: number,
	lean: number,
	crownTones: Tones[],
	cx: number,
	cy: number,
	rx: number,
	ry: number,
) {
	const random = seeded(seed)
	const rects: PixelRect[] = []
	const at = birchTrunk(rects, random, trunkX, cy - 4, H, lean)
	const tx = at(cy)
	branches(rects, tx, cy + 2, [
		[-1, 0, -5],
		[2, -2, 6],
		[-1, 8, -4],
		[2, 7, 5],
	])
	crown(rects, random, cx, cy, rx, ry, crownTones, 0.8)
	// Leaves drooping off its lower edge.
	for (let i = 0; i < 7; i++) {
		const x = cx - rx + 2 + Math.floor(random() * (rx * 2 - 3))
		const t = crownTones[Math.floor(random() * crownTones.length)]
		rects.push([x, cy + ry - 1 + Math.floor(random() * 3), 1, 1, t.shade])
	}
	return pixelArt(W, H, inside(W, H, rects))
}

/**
 * A björk in autumn: a slender white trunk with dark dashes across it,
 * leaning a little, shaded down its right and grey-dark at its foot, and an
 * airy oval crown of yellow-gold leaves, thinning and drooping at its edge
 * so the branches show through. 26 by 64.
 */
export const goldenBirch = birch(
	5101,
	26,
	64,
	11,
	22,
	[LEMON, LEMON, AMBER],
	13,
	17,
	12,
	16,
)

/**
 * A second björk, taller and narrower, its crown a touch more orange-gold,
 * so a stand of them doesn't look like one tree. 22 by 70.
 */
export const goldenBirchB = birch(
	5167,
	22,
	70,
	9,
	28,
	[AMBER, LEMON, AMBER],
	11,
	18,
	10,
	17,
)

/**
 * An asp in autumn: a straight smooth pale grey-green trunk with dark eye
 * marks, and a rounded crown of scarlet and orange leaves, lit top left.
 * 26 by 60.
 */
export const aspen = (() => {
	const random = seeded(5233)
	const W = 26
	const H = 60
	const rects: PixelRect[] = [
		[12, 22, 2, 38, ASPEN_BARK],
		[13, 22, 1, 38, ASPEN_SHADE],
		[11, 58, 4, 2, ASPEN_SHADE],
		// A few boughs into the crown.
		[8, 24, 4, 1, ASPEN_SHADE],
		[14, 20, 4, 1, ASPEN_SHADE],
	]
	// Dark eye marks where its lower branches fell.
	for (let y = 30; y < 54; y += 3 + Math.floor(random() * 4))
		rects.push([12, y, random() < 0.5 ? 2 : 1, 1, ASPEN_MARK])
	crown(
		rects,
		random,
		13,
		15,
		12,
		14,
		[SCARLET, EMBER, SCARLET, EMBER, EMBER],
		0.25,
	)
	return pixelArt(W, H, inside(W, H, rects))
})()

/**
 * A rönn in autumn: short, with two stems, its crown red-orange and
 * scattered with clusters of scarlet berries. 22 by 44.
 */
export const rowan = (() => {
	const random = seeded(5309)
	const W = 22
	const H = 44
	const rects: PixelRect[] = [
		// Two stems from one foot, leaning apart.
		[9, 26, 2, 18, ROWAN_BARK],
		[9, 26, 1, 18, ROWAN_LIT],
		[10, 32, 1, 12, ROWAN_SHADE],
		[12, 22, 2, 8, ROWAN_BARK],
		[13, 22, 1, 8, ROWAN_SHADE],
		[11, 28, 2, 1, ROWAN_BARK],
		[8, 42, 6, 2, ROWAN_SHADE],
		[5, 24, 4, 1, ROWAN_BARK],
	]
	crown(rects, random, 11, 14, 10, 12, [EMBER, SCARLET, EMBER, EMBER], 0.3)
	// Berry clusters, 2 by 2, each with a lit cell.
	for (const [x, y] of [
		[5, 9],
		[13, 6],
		[16, 13],
		[8, 17],
		[12, 20],
		[3, 15],
	]) {
		rects.push([x, y, 2, 2, BERRY], [x, y, 1, 1, BERRY_LIT])
	}
	return pixelArt(W, H, inside(W, H, rects))
})()

const BRACKEN = '#a8582a'
const BRACKEN_LIT = '#c8783a'
const BRACKEN_DARK = '#7e3e22'
const BRACKEN_DRY = '#d4a862'

/**
 * Örnbräken turned bronze and rust in autumn, its fronds arching out from
 * one foot, a few tips dried tan. 20 by 12.
 */
export const bracken = pixelArt(20, 12, [
	// Its foot and the stems.
	[9, 5, 2, 7, BRACKEN_DARK],
	[10, 6, 1, 6, BRACKEN],
	// Left fronds, arching up and over.
	[3, 4, 6, 1, BRACKEN],
	[1, 5, 3, 1, BRACKEN],
	[0, 6, 2, 1, BRACKEN_DRY],
	[4, 7, 5, 1, BRACKEN_DARK],
	[2, 8, 3, 1, BRACKEN_DARK],
	[5, 2, 4, 1, BRACKEN_LIT],
	[4, 3, 2, 1, BRACKEN],
	[3, 1, 2, 1, BRACKEN_DRY],
	// Right fronds.
	[11, 3, 6, 1, BRACKEN],
	[16, 4, 3, 1, BRACKEN],
	[18, 5, 2, 1, BRACKEN_DRY],
	[11, 6, 5, 1, BRACKEN_DARK],
	[15, 7, 3, 1, BRACKEN_DARK],
	[11, 1, 4, 1, BRACKEN_LIT],
	[13, 2, 3, 1, BRACKEN],
	[15, 0, 2, 1, BRACKEN_DRY],
	// Lit tips and a middle frond.
	[8, 3, 1, 1, BRACKEN_LIT],
	[9, 2, 2, 1, BRACKEN],
	[9, 1, 1, 1, BRACKEN_LIT],
	[6, 4, 1, 1, BRACKEN_LIT],
	[13, 3, 1, 1, BRACKEN_LIT],
])

const CRIMSON_RIS = ['#c0302c', '#a82a30', '#8a2236'] as const
const WINE = '#6c1a2c'
const BLUEBERRY = '#34408a'

/**
 * Blåbärsris in autumn: the same low bush, its leaves gone crimson and wine,
 * a couple of dark blue berries left. 16 by 8.
 */
export const autumnBlueberry = (() => {
	const random = seeded(5407)
	const rects: PixelRect[] = []
	for (let x = 0; x < 16; x++) {
		const h = 3 + Math.floor(random() * 5)
		rects.push([x, 8 - h, 1, h, CRIMSON_RIS[Math.floor(random() * 3)]])
		rects.push([x, 8 - 2, 1, 2, WINE])
		if (random() < 0.35) rects.push([x, 8 - h, 1, 1, '#e0502f'])
	}
	rects.push([4, 4, 1, 1, BLUEBERRY], [11, 3, 1, 1, BLUEBERRY])
	return pixelArt(16, 8, rects)
})()

const DRIFT = ['#d46a22', '#e0a42e', '#b53a24', '#7e4c28', '#eebc32'] as const

/**
 * A low drift of fallen leaves, orange, gold, red and brown flecks, ragged
 * along its top: for the feet of trees and along the path's back edge.
 * 24 by 4.
 */
export const leafDrift = (() => {
	const random = seeded(5503)
	const rects: PixelRect[] = []
	for (let x = 0; x < 24; x++) {
		// Highest in the middle, ragged.
		const mid = 1 - Math.abs(x - 11.5) / 12
		const h = Math.max(
			1,
			Math.min(4, Math.round(1 + mid * 2.4 + random() * 1.4 - 0.4)),
		)
		for (let y = 4 - h; y < 4; y++)
			if (y === 4 - h || random() < 0.75)
				rects.push([x, y, 1, 1, DRIFT[Math.floor(random() * DRIFT.length)]])
			else rects.push([x, y, 1, 1, '#7e4c28'])
	}
	return pixelArt(24, 4, rects)
})()

const LOG_CUT = '#e6d2a8'
const LOG_RING = '#b89a68'
const BRACKET = '#c8a26a'
const BRACKET_SHADE = '#8e6a3e'
const LOG_MOSS = '#6e9a3c'
const LOG_MOSS_LIT = '#8fb84e'

/**
 * A fallen birch log lying along the ground: white bark with dark marks, a
 * pale cut end with rings at its left, a little moss, and two tan bracket
 * fungi on it. 34 by 8.
 */
export const birchLog = (() => {
	const random = seeded(5603)
	const rects: PixelRect[] = [
		// Round, lying there: its top and bottom rows stepped in at the far
		// end, lit along its top, shaded under it and darkest where it
		// meets the ground.
		[2, 0, 30, 1, BIRCH_WHITE],
		[2, 1, 32, 4, BIRCH_WHITE],
		[2, 1, 32, 1, '#ffffff'],
		[2, 5, 32, 2, BIRCH_SHADE],
		[2, 7, 30, 1, BIRCH_FOOT],
		// The cut end, an oval, pale with rings, on the near side.
		[1, 0, 3, 1, LOG_CUT],
		[0, 1, 4, 6, LOG_CUT],
		[1, 7, 3, 1, LOG_RING],
		[1, 2, 2, 4, LOG_RING],
		[1, 3, 1, 2, LOG_CUT],
		[0, 6, 1, 1, LOG_RING],
	]
	// Dark marks across the bark.
	for (let x = 6; x < 33; x += 2 + Math.floor(random() * 4))
		rects.push([
			x,
			1 + Math.floor(random() * 5),
			1 + Math.floor(random() * 2),
			1,
			BIRCH_MARK,
		])
	// Moss along its top, in patches.
	rects.push(
		[12, 0, 5, 1, LOG_MOSS],
		[13, 0, 2, 1, LOG_MOSS_LIT],
		[25, 0, 3, 1, LOG_MOSS],
	)
	rects.push([13, 1, 3, 1, LOG_MOSS])
	// Bracket fungi, shelves with a shaded underside.
	rects.push(
		[20, 3, 4, 1, BRACKET],
		[20, 4, 4, 1, BRACKET_SHADE],
		[19, 4, 1, 1, BRACKET],
	)
	rects.push([28, 4, 3, 1, BRACKET], [28, 5, 3, 1, BRACKET_SHADE])
	return pixelArt(34, 8, rects)
})()
