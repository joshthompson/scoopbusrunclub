import {
	ROCK,
	ROCK_DARK,
	ROCK_DARKER,
	ROCK_LIGHTEST,
	ROCK_LIT,
	SEAM,
} from './caveScenery'
import {
	type PixelRect,
	letterArt,
	paintedArt,
	pixelArt,
	pixelText,
	pixelTextWidth,
	svgUrl,
} from './pixelArt'

/**
 * Little things about the Caves' floor, drawn in code, to scatter between
 * the timbers and the lamps: bones, and the explorer they belonged to; the
 * mine's leftovers, its crates and rope, a cart on its side, its ore; a
 * fossil, a cobweb, a puddle dripped into, glow-worms and bats; a sign out;
 * and a jar of pickles somebody meant to come back for.
 *
 * Each stands with its feet on its bottom row, a cell a pixel, drawn at
 * scale 2 like the rest of the cave's scenery. `where` says where it goes:
 * `mine` for the mine's things, `tunnel` for what's low enough to sit in
 * one, `anywhere` for the rest.
 */

export const BONE = '#d9cfba'
export const BONE_SHADE = '#a39883'
export const INK = '#1d1612'
export const TIMBER = '#8a5a32'
export const TIMBER_DARK = '#5e3a1e'
export const TIMBER_LIT = '#b07a44'
export const IRON = '#3a3a3e'
export const STEEL = '#8e939b'
export const STEEL_LIT = '#c3c8cf'
export const LAMP = '#f2b13c'
export const LAMP_LIT = '#ffe9a0'
export const LAMP_GLOW = '#ffd76a'
export const ROPE = '#b89a64'
export const ROPE_SHADE = '#7f6844'
export const WATER = '#1f3a44'
export const WATER_LIT = '#3f6d78'
export const DRIP = '#9fd0e0'
export const GLOW_WORM = '#8ff0ff'
export const GLOW_WORM_DIM = '#3f8e9a'
export const THREAD = '#56747a'
export const COPPER_ORE = '#4f9a7a'
export const GOLD = '#f2c200'
export const GOLD_SHINE = '#fff1a8'
export const HARD_HAT = '#e8642c'
export const HARD_HAT_SHADE = '#b04a1f'
export const HARD_HAT_LIT = '#ff9460'
export const WEB = '#77706a'
export const BAT = '#4c3c46'
export const BAT_LIT = '#66525e'
export const FISH = '#f0dcd2'
export const FISH_SHADE = '#c4a69c'

export interface CaveDetail {
	name: string
	asset: string
	/** Animated: its frames, all its size, `asset` the first, each shown for `frameTicks`. */
	frames?: string[]
	frameTicks?: number
	/** In cells. */
	width: number
	height: number
	where: 'anywhere' | 'tunnel' | 'mine'
}

/** One that stands still, from rows of letters. */
function still(
	name: string,
	where: CaveDetail['where'],
	rows: string[],
	colours: Record<string, string>,
): CaveDetail {
	return {
		name,
		asset: letterArt(rows, colours),
		width: rows[0].length,
		height: rows.length,
		where,
	}
}

/** One that moves: a picture for each frame, every `frameTicks`. */
function animated(
	name: string,
	where: CaveDetail['where'],
	width: number,
	height: number,
	frameTicks: number,
	frames: string[],
): CaveDetail {
	return { name, asset: frames[0], frames, frameTicks, width, height, where }
}

/** The colours of the cave's rock, by letter, for a boulder's rows. */
const STONE = {
	L: ROCK_LIGHTEST,
	l: ROCK_LIT,
	r: ROCK,
	d: ROCK_DARK,
	D: ROCK_DARKER,
	s: SEAM,
}

/** A skull and a couple of bones, picked clean. */
const skullAndBones = still(
	'skull and bones',
	'anywhere',
	[
		'.BBBBB..........',
		'BBBBBBb.........',
		'BkkBkkb.........',
		'BBBkBbb......Bb.',
		'.BkBkb..Bb..Bb..',
		'.bbbbb..BbbbbbBb',
	],
	{ B: BONE, b: BONE_SHADE, k: INK },
)

/**
 * An explorer who never found the way out, sat against the wall: their
 * pith helmet still on, their lantern by them, long gone out.
 */
const explorer = still(
	'explorer',
	'anywhere',
	[
		'...HHHH...............',
		'..HHHHHH..............',
		'.hHHHHHHh.............',
		'...BBBB...............',
		'...kBkB...............',
		'...BBBb...............',
		'....bb................',
		'..BBBBBB..............',
		'..B.BB.B..............',
		'..B.BB..B.............',
		'..B.BB...B......ii....',
		'..B.BB....B....i..i...',
		'...BBBB...bb..iiiiii..',
		'...BBBBB.......iggi...',
		'....bb..BB.....iGgi...',
		'..........B....iggi...',
		'...........B...iggi...',
		'............B.iiiiii..',
		'............BB........',
	].map((row) => row.padEnd(22, '.')),
	{
		H: '#c9b07a',
		h: '#9a8458',
		B: BONE,
		b: BONE_SHADE,
		k: INK,
		i: IRON,
		g: '#5c6662',
		G: '#7d8a84',
	},
)

/**
 * Rock, in whatever shape `inside` says, lit as the cave's is: a lit cell
 * along its tops, shade along its undersides and its right, occasionally
 * a seam.
 */
function rock(
	width: number,
	height: number,
	inside: (x: number, y: number) => boolean,
): PixelRect[] {
	const at = (x: number, y: number) =>
		x >= 0 && y >= 0 && x < width && y < height && inside(x, y)
	const rects: PixelRect[] = []
	for (let y = 0; y < height; y++)
		for (let x = 0; x < width; x++) {
			if (!at(x, y)) continue
			const fill = !at(x, y - 1)
				? ROCK_LIT
				: !at(x, y + 1) || !at(x + 1, y)
					? ROCK_DARK
					: ((x * 73 + y * 151) ^ (x * y * 37)) % 31 === 0
						? SEAM
						: ROCK
			rects.push([x, y, 1, 1, fill])
		}
	return rects
}

/** In a boulder round `cx`, `cy`: for `rock`. */
const boulder =
	(cx: number, cy: number, rx: number, ry: number) => (x: number, y: number) =>
		((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1

/** Colours by letter, as a painter for `paintedArt`: rows of them, `.` clear, from `x`, `y`. */
function letters(
	rows: string[],
	colours: Record<string, string>,
	left = 0,
	top = 0,
) {
	return (x: number, y: number) => {
		const letter = rows[Math.floor(y) - top]?.[Math.floor(x) - left]
		return letter && letter !== '.' ? colours[letter] : undefined
	}
}

/** A drop gathering on a rock's lip, falling, and splashing into the puddle under it. */
const drippingPuddle = (() => {
	const width = 20
	const height = 16
	// The rock against the wall, its lip out over the floor, a point under its end.
	const stone = rock(
		width,
		height,
		(x, y) =>
			(y > 1 && x < 7 + Math.round(Math.sin(y * 0.8))) ||
			(y > 1 && y < 5 - Math.floor(x / 6) && x < 14) ||
			(x === 12 && y === 3),
	)
	/** Where the drop is, frame by frame; the last, it's hit the puddle. */
	const drops: PixelRect[][] = [
		[[12, 4, 1, 1, DRIP]],
		[[12, 7, 1, 2, DRIP]],
		[[12, 11, 1, 2, DRIP]],
		[
			[11, 13, 1, 1, DRIP],
			[13, 13, 1, 1, DRIP],
			[10, 12, 1, 1, DRIP],
			[14, 12, 1, 1, DRIP],
		],
	]
	const frames = drops.map((drop) =>
		pixelArt(width, height, [
			...stone,
			// The puddle, its far edge lit.
			[8, 15, 10, 1, WATER],
			[9, 14, 8, 1, WATER_LIT],
			...drop,
		]),
	)
	return animated('dripping puddle', 'anywhere', width, height, 12, frames)
})()

/**
 * Glow-worms' threads, hung under a lip of rock, beads of light down
 * each, twinkling: the rock up the wall on its left, the lip out over.
 */
const glowWorms = (() => {
	const width = 24
	const height = 30
	/** How far down the lip comes, along it. */
	const lip = (x: number) => 4 - (x > 18 ? 1 : 0) + (x % 7 === 3 ? 1 : 0)
	const stone = rock(
		width,
		height,
		(x, y) =>
			x < 6 + Math.round(Math.sin(y * 0.6)) ||
			(y < lip(x) && x < 23 - (y ? 0 : 2)),
	)
	/** Each thread: where it hangs, how long, and the beads down it. */
	const threads: [number, number, number[]][] = [
		[9, 12, [5, 9, 11]],
		[11, 17, [7, 12, 16]],
		[14, 9, [4, 8]],
		[16, 15, [6, 10, 14]],
		[19, 11, [5, 10]],
		[21, 6, [4]],
	]
	const frames = [0, 1, 2].map((frame) => {
		const rects: PixelRect[] = [...stone]
		threads.forEach(([x, length, beads], t) => {
			const top = lip(x)
			rects.push([x, top, 1, length, THREAD])
			beads.forEach((at, b) => {
				const lit = (t + b + frame) % 3 === 0
				if (lit) rects.push([x - 1, top + at - 1, 3, 3, `${GLOW_WORM}28`])
				rects.push([x, top + at, 1, 1, lit ? GLOW_WORM : GLOW_WORM_DIM])
			})
		})
		return pixelArt(width, height, rects)
	})
	return animated('glow-worms', 'tunnel', width, height, 20, frames)
})()

/** A pickaxe swung into a boulder and left there, stuck. */
const pickaxeInBoulder = still(
	'pickaxe in a boulder',
	'anywhere',
	[
		'..............t...',
		'.............t....',
		'............t.....',
		'...L.......t......',
		'...SL.....t.......',
		'....SSLLLLt.......',
		'.....SSSSSSSl.....',
		'....lllllllSsl....',
		'...lrrrrrrrrrrll..',
		'..lrrrrrrrrrrrrrl.',
		'.lrrrrdrrrrrrrrrrd',
		'lrrrrrrrrrrrrrdrrd',
		'rrrrrrrrrrrrrrrrdd',
		'dddddddddddddddd..',
	],
	{ ...STONE, t: TIMBER, S: STEEL, L: STEEL_LIT, s: SEAM },
)

/** The mine's stores: two crates, one on the other, and a barrel by them. */
const cratesAndBarrel = (() => {
	const crate = (x: number, y: number, w: number, h: number): PixelRect[] => [
		[x, y, w, h, TIMBER],
		[x, y, w, 1, TIMBER_LIT],
		[x, y + h - 1, w, 1, TIMBER_DARK],
		[x, y, 1, h, TIMBER_DARK],
		[x + w - 1, y, 1, h, TIMBER_DARK],
		// Its brace, corner to corner.
		...Array.from(
			{ length: w - 2 },
			(_, i): PixelRect => [
				x + 1 + i,
				y + h - 2 - Math.floor((i * (h - 3)) / (w - 3)),
				1,
				1,
				TIMBER_DARK,
			],
		),
	]
	return {
		name: 'crates and barrel',
		asset: pixelArt(30, 20, [
			...crate(0, 9, 13, 11),
			...crate(3, 0, 10, 9),
			// Stencilled on the bottom one: a pick.
			[4, 13, 4, 1, INK],
			[5, 12, 2, 1, INK],
			[6, 14, 1, 3, INK],
			// The barrel, hooped.
			[16, 6, 10, 14, TIMBER],
			[15, 8, 12, 10, TIMBER],
			[17, 6, 1, 14, TIMBER_LIT],
			[16, 7, 10, 1, IRON],
			[15, 12, 12, 1, IRON],
			[16, 17, 10, 1, IRON],
			[24, 7, 1, 12, TIMBER_DARK],
			[16, 6, 10, 1, TIMBER_DARK],
			// A lantern on it, out.
			[20, 2, 3, 4, IRON],
			[21, 3, 1, 2, '#5c6662'],
			[21, 1, 1, 1, IRON],
		]),
		width: 30,
		height: 20,
		where: 'mine',
	} satisfies CaveDetail
})()

/** A coil of rope, its end trailing, and a lantern by it, still lit. */
const ropeAndLantern = (() => {
	const coil = letters(
		[
			'....RRRRRR.......',
			'..RRrhhhhrRR.....',
			'.RrhhhhhhhhrR....',
			'.RRrrrrrrrrRR....',
			'rRRRRRRRRRRRRr...',
			'RrrrrrrrrrrrrR...',
			'rRRRRRRRRRRRRr...',
			'.rrrrrrrrrrrrrRRR',
		],
		{ R: ROPE, r: ROPE_SHADE, h: '#3e3224' },
		0,
		6,
	)
	const lantern = letters(
		[
			'..ii..',
			'.i..i.',
			'iiiiii',
			'iYyyYi',
			'iYyyYi',
			'iYyyYi',
			'iYYYYi',
			'iiiiii',
		],
		{ i: IRON, Y: LAMP, y: LAMP_LIT },
		16,
		6,
	)
	return {
		name: 'rope and lantern',
		asset: paintedArt(22, 14, (x, y) => {
			const d = Math.hypot(x - 19, y - 9.5) / 7
			const glow = d < 1 ? `${LAMP_GLOW}${d > 0.6 ? '14' : '28'}` : undefined
			return lantern(x, y) ?? coil(x, y) ?? glow
		}),
		width: 22,
		height: 14,
		where: 'mine',
	} satisfies CaveDetail
})()

/**
 * A mine cart tipped over on its side, its bottom to the left, its wheels
 * stuck out, its ore spilled out of it.
 */
const tippedCart = still(
	'tipped cart',
	'mine',
	[
		'.....JJJJJJJj...........',
		'.kkk.IiIIIIIj...........',
		'.kSkaIIIIIIIj...........',
		'.kkk.IiIIIIIj...........',
		'.....IIIIIIIj...........',
		'.....IjjjjjIj...........',
		'.....IIIIIIIj...........',
		'.....IIIIIIIj...........',
		'.kkk.IiIIIIIj...........',
		'.kSkaIIIIIIIj..lrl......',
		'.kkk.IiIIIIIj.lrGrrl..g.',
		'.....IIIIIIIjlrrgrrdrl.r',
		'....dddddddddddddddddddd',
	],
	{
		...STONE,
		J: '#787a82',
		I: '#5d5f66',
		i: '#44454b',
		j: '#44454b',
		k: IRON,
		S: STEEL,
		a: IRON,
		g: COPPER_ORE,
		G: GOLD,
	},
)

/** A heap of ore, copper green in it, gold glinting. */
const oreHeap = still(
	'ore heap',
	'mine',
	[
		'.........llW..........',
		'.......lllrrGl........',
		'.....llrrgrrrrl.......',
		'....lrrrrrrdrgrrl.....',
		'...lrrGrrrrrrrrrrl.l..',
		'..lrrrrrdrgrrrrdrrrrl.',
		'.lrrgrrrrrrrrrGrrrrrrl',
		'rrrrrrrdrrrrrrrrrdrgrr',
		'dddddddddddddddddddddd',
	],
	{ ...STONE, g: COPPER_ORE, G: GOLD, W: GOLD_SHINE },
)

/** An ammonite, a fossil coiled in a boulder broken open. */
const ammonite = (() => {
	const stone = rock(16, 12, boulder(8, 6.5, 8, 5.8))
	const fossil: PixelRect[] = []
	for (let y = 2; y < 11; y++)
		for (let x = 3; x < 13; x++) {
			const dx = x + 0.5 - 8
			const dy = y + 0.5 - 6.5
			const r = Math.hypot(dx, dy)
			if (r > 4.3) continue
			// Its coil: a groove round and round, in towards the middle.
			const turn = (Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2)
			const groove = (r / 2.1 + turn) % 1 < 0.42
			fossil.push([x, y, 1, 1, groove ? ROCK_DARKER : '#a08a72'])
		}
	return {
		name: 'ammonite',
		asset: pixelArt(16, 12, [...stone, ...fossil]),
		width: 16,
		height: 12,
		where: 'anywhere',
	} satisfies CaveDetail
})()

/** A cobweb strung from a rock down to the floor, thread by thread. */
const cobweb = (() => {
	const width = 26
	const height = 20
	const rects: PixelRect[] = rock(width, height, boulder(3, 13, 4.5, 8))
	const line = ([x0, y0]: number[], [x1, y1]: number[]) => {
		const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
		for (let i = 0; i <= steps; i++)
			rects.push([
				Math.round(x0 + ((x1 - x0) * i) / steps),
				Math.round(y0 + ((y1 - y0) * i) / steps),
				1,
				1,
				WEB,
			])
	}
	// Its spokes, out from the rock's shoulder to the floor, and its
	// threads strung across them.
	const hub = [7, 5]
	const ends = [
		[10, 19],
		[16, 19],
		[23, 17],
		[25, 10],
	]
	for (const end of ends) line(hub, end)
	for (const t of [0.45, 0.8]) {
		const at = ends.map(([x, y]) => [
			Math.round(hub[0] + (x - hub[0]) * t),
			Math.round(hub[1] + (y - hub[1]) * t),
		])
		at.forEach((point, i) => {
			if (i) line(at[i - 1], point)
		})
	}
	return {
		name: 'cobweb',
		asset: pixelArt(width, height, rects),
		width,
		height,
		where: 'tunnel',
	} satisfies CaveDetail
})()

/** A wooden ladder, leant up against the wall, a rung gone. */
const ladder = {
	name: 'ladder',
	asset: pixelArt(
		12,
		30,
		Array.from({ length: 30 }, (_, y): PixelRect[] => {
			const lean = Math.floor((29 - y) / 6)
			const rails: PixelRect[] = [
				[lean, y, 2, 1, TIMBER],
				[lean, y, 1, 1, TIMBER_LIT],
				[lean + 7, y, 2, 1, TIMBER],
				[lean + 8, y, 1, 1, TIMBER_DARK],
			]
			return y % 4 === 2 && y !== 14
				? [...rails, [lean + 2, y, 5, 1, TIMBER_DARK]]
				: rails
		}).flat(),
	),
	width: 12,
	height: 30,
	where: 'mine',
} satisfies CaveDetail

/** A signpost, its planks pointed to the right: UTGÅNG, the way out, and an arrow. */
const exitSign = (() => {
	const words = 'UTGÅNG'
	// The plank, a cell round its words, and its point, 3 cells more: 40 in all.
	const plank = pixelTextWidth(words, 1) + 2
	const width = plank + 3
	const height = 24
	const body = [
		`<rect x="6" y="9" width="2" height="15" fill="${TIMBER_DARK}"/>`,
		`<rect x="6" y="9" width="1" height="15" fill="${TIMBER}"/>`,
		`<rect x="0" y="0" width="${plank}" height="11" fill="${TIMBER}"/>`,
		// Its point, narrowing.
		`<rect x="${plank}" y="1" width="1" height="9" fill="${TIMBER}"/>`,
		`<rect x="${plank + 1}" y="3" width="1" height="5" fill="${TIMBER}"/>`,
		`<rect x="${plank + 2}" y="4" width="1" height="3" fill="${TIMBER_DARK}"/>`,
		`<rect x="0" y="0" width="${plank}" height="1" fill="${TIMBER_LIT}"/>`,
		`<rect x="0" y="10" width="${plank}" height="1" fill="${TIMBER_DARK}"/>`,
		pixelText(words, 1, 2, 1, '#2a1a0e'),
		// A little plank under it, nailed on too: an arrow, the way to go.
		`<rect x="5" y="12" width="12" height="9" fill="${TIMBER}"/>`,
		`<rect x="17" y="13" width="1" height="7" fill="${TIMBER}"/>`,
		`<rect x="18" y="15" width="1" height="3" fill="${TIMBER_DARK}"/>`,
		`<rect x="5" y="12" width="12" height="1" fill="${TIMBER_LIT}"/>`,
		`<rect x="5" y="20" width="12" height="1" fill="${TIMBER_DARK}"/>`,
		pixelText('→', 9, 13, 1, '#2a1a0e'),
		// Stones heaped round the post's foot.
		`<rect x="3" y="22" width="8" height="2" fill="${ROCK}"/>`,
		`<rect x="4" y="21" width="3" height="1" fill="${ROCK_LIT}"/>`,
		`<rect x="9" y="23" width="2" height="1" fill="${ROCK_DARK}"/>`,
	].join('')
	return {
		name: 'exit sign',
		asset: svgUrl(width, height, body),
		width,
		height,
		where: 'anywhere',
	} satisfies CaveDetail
})()

/** A jar of cave pickles, its lid gold, left on a rock to come back for. */
const picklesOnRock = still(
	'pickles on a rock',
	'anywhere',
	[
		'.....GGGGG......',
		'.....ggggg......',
		'....wbbbbbx.....',
		'....wPbbPbx.....',
		'....wpbPpbx.....',
		'....wpbppbx.....',
		'....wppbpPx.....',
		'.....bbbbx......',
		'..llllllllll....',
		'.lrrrrrrrrrrrl..',
		'lrrrrrdrrrrrrrd.',
		'rrrrrrrrrrrdrrrd',
		'ddddddddddddddd.',
	],
	{
		...STONE,
		G: '#f0c64a',
		g: '#b8862a',
		w: '#f2fbf6',
		b: '#c9d77a',
		x: '#a3b85a',
		p: '#4f7f24',
		P: '#7fb33f',
	},
)

/** Bats asleep, upside down, hung under a rock's overhang, wrapped in their wings. */
const sleepingBats = still(
	'sleeping bats',
	'tunnel',
	[
		'......lllllllll.........',
		'....llrrrrrrrrrll.......',
		'...lrrrrrrrrrrrrrll.....',
		'..lrrrrrrdrrrrrrrrrrl...',
		'.lrrrrrrrrrrrrrrrrrrrrl.',
		'.rrrrrsrrrrrrrrrrrrrrrrd',
		'rrrrrrrrrrrdddddddddddd.',
		'rrrrrrrrrdd..B...B...B..',
		'rrrrrrrrd...BBB.BBB.BBB.',
		'rrrrdrrrd...BbB.BbB.BbB.',
		'rrrrrrrrd...BbB.BbB.BbB.',
		'rrrrrrrrd...BBB.BBB..B..',
		'rrrrrrrrrd..B.B.B.B.....',
		'rlrrrrrrrd..............',
		'rrrrrsrrrrd.............',
		'ddddddddddd.............',
	],
	{ ...STONE, B: BAT, b: BAT_LIT },
)

/** A pool down in the dark, a pale blind fish in it, rings spreading over it. */
const blindFishPool = (() => {
	const width = 30
	const height = 8
	const rim: PixelRect[] = [
		// The rock round it, near and far.
		[0, 3, 4, 5, ROCK],
		[0, 3, 4, 1, ROCK_LIT],
		[26, 2, 4, 6, ROCK],
		[26, 2, 4, 1, ROCK_LIT],
		[28, 3, 2, 5, ROCK_DARK],
		[2, 7, 26, 1, ROCK_DARK],
		// The water.
		[4, 3, 22, 4, WATER],
		[4, 3, 22, 1, WATER_LIT],
		// The fish, pale, no eyes.
		[11, 5, 6, 1, FISH],
		[12, 4, 4, 1, FISH],
		[12, 6, 4, 1, FISH_SHADE],
		[9, 4, 2, 1, FISH],
		[9, 6, 2, 1, FISH_SHADE],
		[10, 5, 1, 1, FISH_SHADE],
	]
	const rings = [2, 4, 6].map((r): PixelRect[] => [
		[19 - r, 3, 1, 1, DRIP],
		[19 + r, 3, 1, 1, DRIP],
		[19 - r + 1, 3, 2 * r - 1, 1, WATER_LIT],
	])
	const frames = rings.map((ring) => pixelArt(width, height, [...rim, ...ring]))
	return animated('blind fish pool', 'anywhere', width, height, 15, frames)
})()

/** A hard hat, orange, its lamp on its front, dropped by one of the mine's people. */
const hardHat = still(
	'hard hat',
	'mine',
	[
		'...LLLLL...',
		'..LHHHHHH..',
		'.LHHHHHHHs.',
		'.HHHHHHsHsw',
		'sssssssssss',
		'..rrrrrrr..',
	],
	{ ...STONE, L: HARD_HAT_LIT, H: HARD_HAT, s: HARD_HAT_SHADE, w: '#e8e0cc' },
)

export const CAVE_DETAILS: CaveDetail[] = [
	skullAndBones,
	explorer,
	drippingPuddle,
	glowWorms,
	pickaxeInBoulder,
	cratesAndBarrel,
	ropeAndLantern,
	tippedCart,
	oreHeap,
	ammonite,
	cobweb,
	ladder,
	exitSign,
	picklesOnRock,
	sleepingBats,
	blindFishPool,
	hardHat,
]
