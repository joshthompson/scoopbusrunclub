import { paintedArt } from './pixelArt'
import { seeded } from './seeded'

/**
 * Paintings on the Caves' back wall, drawn in code: left by whoever ran
 * down here first, in red and yellow ochre, charcoal and chalk, each on a
 * patch of rock rubbed smooth for it, flaked and faded with age. Hands
 * blown round in ochre; a hunt; runners fleeing the bus; a mole digging; a
 * spider; the mine's people in their capes; a sun and its spirals; and,
 * by the bridge, a warning nobody reads.
 *
 * Each hangs up the wall: its bottom eight rows are empty, so it stands on
 * the path's back edge like the rest of the scenery but sits clear of it.
 */

/** The smoothed rock each is painted on: a shade or two up from the wall. */
export const SMOOTHED = '#3a2e26'
export const RED_OCHRE = '#9c3b26'
export const RED_OCHRE_FADED = '#6c3325'
export const YELLOW_OCHRE = '#bf8a3e'
export const YELLOW_OCHRE_FADED = '#84643a'
export const CHARCOAL = '#120d0b'
export const CHARCOAL_FADED = '#241b16'
export const CHALK = '#cdc2b0'
export const CHALK_FADED = '#8c8478'

/** Rows of empty wall under each, lifting it up off the path. */
const HANG = 8

/** Each paint, by its letter, and how it's faded. */
const PAINTS: Record<string, [string, string]> = {
	r: [RED_OCHRE, RED_OCHRE_FADED],
	y: [YELLOW_OCHRE, YELLOW_OCHRE_FADED],
	k: [CHARCOAL, CHARCOAL_FADED],
	w: [CHALK, CHALK_FADED],
}
/** Left bare inside a stencil: the rock, where a hand was held to it. */
const BARE = '_'

export interface CavePainting {
	name: string
	asset: string
	/** In cells, its empty rows at the bottom included. */
	width: number
	height: number
}

/** A patch of wall to paint on, `width` by `height` cells, a letter of paint each. */
class Wall {
	readonly cells: (string | undefined)[]
	constructor(
		readonly width: number,
		readonly height: number,
		readonly random: () => number,
	) {
		this.cells = new Array(width * height)
	}

	set(x: number, y: number, paint: string) {
		if (x >= 0 && y >= 0 && x < this.width && y < this.height)
			this.cells[y * this.width + x] = paint
	}

	get(x: number, y: number) {
		return this.cells[y * this.width + x]
	}

	/**
	 * A figure from rows of letters, its top left at `x`, `y`: `x` cells in
	 * `paint`, any other letter in its own paint, `.` left alone. Facing the
	 * other way, `flip`ped.
	 */
	stamp(rows: string[], x: number, y: number, paint = 'k', flip = false) {
		const across = Math.max(...rows.map((row) => row.length))
		rows.forEach((row, dy) => {
			;[...row].forEach((letter, dx) => {
				if (letter === '.') return
				this.set(
					flip ? x + across - 1 - dx : x + dx,
					y + dy,
					letter === 'x' ? paint : letter,
				)
			})
		})
	}

	/** A line of paint from one cell to another, a cell in every `every` along it. */
	line(
		x0: number,
		y0: number,
		x1: number,
		y1: number,
		paint: string,
		every = 1,
	) {
		const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
		for (let i = 0; i <= steps; i++) {
			if (i % every) continue
			const t = steps ? i / steps : 0
			this.set(
				Math.round(x0 + (x1 - x0) * t),
				Math.round(y0 + (y1 - y0) * t),
				paint,
			)
		}
	}

	/** A ring, or a disc if `filled`, round `cx`, `cy`. */
	circle(cx: number, cy: number, r: number, paint: string, filled = false) {
		for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++)
			for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) {
				const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy)
				if (filled ? d <= r : Math.abs(d - r) < 0.5) this.set(x, y, paint)
			}
	}

	/**
	 * A hand held to the wall and ochre blown round it: its shape left bare,
	 * the spray thick close round it and thinning out to specks.
	 */
	stencil(rows: string[], x: number, y: number, paint: string, flip = false) {
		const hand: [number, number][] = []
		const across = Math.max(...rows.map((row) => row.length))
		rows.forEach((row, dy) => {
			;[...row].forEach((letter, dx) => {
				if (letter !== '.')
					hand.push([flip ? x + across - 1 - dx : x + dx, y + dy])
			})
		})
		for (let cy = y - 4; cy < y + rows.length + 4; cy++)
			for (let cx = x - 4; cx < x + across + 4; cx++) {
				const d = Math.min(
					...hand.map(([hx, hy]) => Math.hypot(cx - hx, cy - hy)),
				)
				if (d === 0) this.set(cx, cy, BARE)
				else if (
					d <= 1.5 ||
					(d <= 2.3 && this.random() < 0.6) ||
					(d <= 3.2 && this.random() < 0.15)
				)
					this.set(cx, cy, paint)
			}
	}
}

/**
 * A painting, `width` by `height` cells (its empty rows under it
 * included): drawn by `draw` on a patch of smoothed rock, then aged, a
 * cell gone here and there, some faded, and a flake or two off it.
 */
function painting(
	name: string,
	width: number,
	height: number,
	seed: number,
	draw: (wall: Wall) => void,
	flakes = 2,
): CavePainting {
	const random = seeded(seed)
	const area = height - HANG
	const wall = new Wall(width, area, random)
	draw(wall)

	// Where it's painted, to rub the rock smooth round.
	let left = width
	let right = 0
	let top = area
	let bottom = 0
	for (let y = 0; y < area; y++)
		for (let x = 0; x < width; x++)
			if (wall.get(x, y)) {
				left = Math.min(left, x)
				right = Math.max(right, x + 1)
				top = Math.min(top, y)
				bottom = Math.max(bottom, y + 1)
			}
	const cx = (left + right) / 2
	const cy = (top + bottom) / 2
	const rx = Math.min((right - left) / 2 + 2, width / 2 - 0.5)
	const ry = Math.min((bottom - top) / 2 + 2, area / 2 - 0.5)
	const phases = [random() * 6, random() * 6, random() * 6]
	/** In the smoothed patch: a rounded slab, its edge wandering. */
	const smoothed = (x: number, y: number) => {
		const dx = (x - cx) / rx
		const dy = (y - cy) / ry
		const angle = Math.atan2(dy, dx)
		const edge =
			0.94 +
			0.05 * Math.sin(3 * angle + phases[0]) +
			0.04 * Math.sin(5 * angle + phases[1]) +
			0.03 * Math.sin(9 * angle + phases[2])
		return (Math.abs(dx) ** 3 + Math.abs(dy) ** 3) ** (1 / 3) < edge
	}
	/** Next to paint: the patch always reaches a cell past it. */
	const nearPaint = (x: number, y: number) => {
		for (let dy = -1; dy <= 1; dy++)
			for (let dx = -1; dx <= 1; dx++) {
				const nx = Math.floor(x) + dx
				const ny = Math.floor(y) + dy
				if (nx >= 0 && ny >= 0 && nx < width && ny < area && wall.get(nx, ny))
					return true
			}
		return false
	}

	// Its age: flakes off it, the paint faded in patches, a cell gone here and there.
	const flaked: [number, number, number][] = Array.from(
		{ length: flakes },
		() => [
			left + random() * (right - left),
			top + random() * (bottom - top),
			1.2 + random(),
		],
	)
	const aged = wall.cells.map((paint, i) => {
		if (!paint || paint === BARE) return undefined
		const x = (i % width) + 0.5
		const y = Math.floor(i / width) + 0.5
		if (flaked.some(([fx, fy, r]) => Math.hypot(x - fx, y - fy) < r))
			return undefined
		if (random() < 0.05) return undefined
		const [fresh, faded] = PAINTS[paint]
		const patch =
			Math.sin(x * 0.7 + phases[0]) +
			Math.sin(y * 0.9 + phases[1]) +
			Math.sin((x + y) * 0.45 + phases[2])
		return patch > 1.3 ? faded : fresh
	})

	const asset = paintedArt(width, height, (x, y) => {
		if (y >= area) return undefined
		const at = Math.floor(y) * width + Math.floor(x)
		if (aged[at]) return aged[at]
		return smoothed(x, y) || nearPaint(x, y) ? SMOOTHED : undefined
	})
	return { name, asset, width, height }
}

/** A hand, fingers spread, palm down: 10 by 12. */
const HAND = [
	'....x.....',
	'..x.x.x...',
	'..x.x.x.x.',
	'..x.x.x.x.',
	'..x.x.x.x.',
	'..xxxxxxx.',
	'x.xxxxxxx.',
	'.xxxxxxxx.',
	'..xxxxxxx.',
	'..xxxxxx..',
	'...xxxxx..',
	'...xxxxx..',
]

/** Someone running for it, leant into it, facing right: 7 by 10. */
const RUNNER = [
	'.....xx',
	'.....xx',
	'....x..',
	'..xxxx.',
	'.x.x..x',
	'...x...',
	'..x.x..',
	'.x...x.',
	'x....x.',
	'.....xx',
]

/** Someone tiny, their hands up, fleeing: 5 by 7. */
const PANIC = ['x...x', 'x.x.x', '.xxx.', '..x..', '..x..', '.x.x.', 'x...x']

/** A hunter, arms out, facing right: 6 by 9. Their spear's drawn on after. */
const HUNTER = [
	'..xx..',
	'..xx..',
	'.xxxxx',
	'x..x..',
	'...x..',
	'...x..',
	'..x.x.',
	'.x...x',
	'x....x',
]

/** A cluster of hands, stencilled, blown round with red and yellow ochre. */
const handStencils = painting('hand stencils', 52, 34, 7, (wall) => {
	wall.stencil(HAND, 4, 4, 'r')
	wall.stencil(HAND, 16, 9, 'y', true)
	wall.stencil(HAND, 27, 3, 'r', true)
	wall.stencil(HAND, 39, 8, 'r')
	// A dot or two, dabbed on with a finger.
	for (const [x, y] of [
		[4, 21],
		[7, 22],
		[10, 21],
		[38, 2],
		[41, 3],
	])
		wall.set(x, y, 'y')
})

/** A hunt: three hunters, spears up, after a mammoth, one already in it. */
const hunt = painting('hunt', 66, 32, 23, (wall) => {
	// The mammoth, its hump and domed head, trunk hanging, tusks curling.
	wall.stamp(
		[
			'................xxxx.....',
			'.........xxx...xxxxxx....',
			'......xxxxxxxxxxxxxxxx...',
			'....xxxxxxxxxxxxxxxxxxx..',
			'...xxxxxxxxxxxxxxxxxkxxx.',
			'..xxxxxxxxxxxxxxxxxxxxxx.',
			'.xxxxxxxxxxxxxxxxxxxxxxx.',
			'xxxxxxxxxxxxxxxxxxxxx.xx.',
			'xxxxxxxxxxxxxxxxxxxx.w.xx',
			'.xxxxxxxxxxxxxxxxxxx.w..x',
			'..xxxxxxxxxxxxxxxxx...w.x',
			'..xxx.xxx...xxx.xxx...w.x',
			'..xx...xx...xx...xx..w..x',
			'..xx...xx...xx...xx......',
			'..xx...xx...xx...xx......',
		],
		38,
		5,
		'r',
	)
	// Hunters after it, spears up.
	for (const [x, y] of [
		[4, 11],
		[14, 9],
		[24, 12],
	]) {
		wall.stamp(HUNTER, x, y)
		wall.line(x + 1, y + 5, x + 10, y - 2, 'k')
	}
	// A spear already in it.
	wall.line(44, 2, 49, 7, 'k')
	// The ground they're running over.
	wall.line(2, 22, 63, 22, 'y', 3)
})

/**
 * Runners running for their lives, the Scoop Bus behind them: a yellow
 * box, its windows left bare, a chalk scoop on its front.
 */
const busChase = painting('bus chase', 68, 32, 101, (wall) => {
	wall.stamp(
		[
			'.yyyyyyyyyyyyyyyyyy........',
			'yyyyyyyyyyyyyyyyyyyy.......',
			'yy..yy..yy..yy..yy.yy......',
			'yy..yy..yy..yy..yy.yy......',
			'yyyyyyyyyyyyyyyyyyyyyyyy...',
			'yyyyyyyyyyyyyyyyyyyyyyyyy..',
			'yyyyyyyyyyyyyyyyyyyyyyyyy..',
			'yyyyyyyyyyyyyyyyyyyyyyyyy..',
			'.yyyyyyyyyyyyyyyyyyyyyyyy..',
			'..kkk..........kkk.........',
			'..kkk..........kkk.........',
		],
		2,
		7,
	)
	// Its scoop, out in front, low.
	wall.stamp(
		['xxx..', '...x.', '....x', '....x', '...x.', 'xxx..'],
		27,
		10,
		'w',
		true,
	)
	// The runners, strung out ahead, and the dust they're kicking up.
	for (const [x, y, paint] of [
		[37, 9, 'k'],
		[47, 7, 'r'],
		[57, 9, 'k'],
	] as const) {
		wall.stamp(RUNNER, x, y, paint)
		wall.line(x - 4, y + 3, x - 2, y + 3, 'k')
	}
	wall.line(2, 20, 65, 20, 'y', 3)
})

/** A mole, digging, its claws out, the way it's come dotted behind it. */
const mole = painting('mole', 50, 30, 59, (wall) => {
	// The ground, and its molehill where it went in.
	wall.line(2, 3, 47, 3, 'y', 2)
	wall.stamp(['..yyy..', '.yyyyy.', 'yyyyyyy'], 4, 1)
	// Its tunnel: dots down from the molehill, then along.
	const path: [number, number][] = [
		[7, 5],
		[8, 7],
		[9, 9],
		[11, 11],
		[13, 13],
		[16, 14],
		[19, 15],
		[22, 15],
		[25, 14],
		[28, 13],
	]
	for (const [x, y] of path) wall.set(x, y, 'r')
	// The mole, round, its snout and its chalk claws to the front.
	wall.stamp(
		[
			'.....xxxxxx.........',
			'...xxxxxxxxxx.......',
			'..xxxxxxxxxxxxx.....',
			'.xxxxxxxxxxxxxxxx...',
			'xxxxxxxxxxxxxwxxxxrr',
			'xxxxxxxxxxxxxxxxxx..',
			'.xxxxxxxxxxxxxxxw.w.',
			'..xxxxxxxxxxxxwwwww.',
			'...ww......xx.w.w.w.',
		],
		27,
		9,
	)
	// The earth it's thrown back.
	for (const [x, y] of [
		[47, 10],
		[48, 14],
		[46, 17],
	])
		wall.set(x, y, 'y')
})

/** A huge spider, down on its thread, and tiny people fleeing it both ways. */
const spider = painting('spider', 56, 34, 77, (wall) => {
	wall.line(28, 0, 28, 6, 'k')
	// Its body, its head, its eyes.
	wall.circle(28, 11.5, 5, 'k', true)
	wall.circle(28, 18, 2.6, 'k', true)
	wall.set(27, 19, 'r')
	wall.set(29, 19, 'r')
	// Eight legs, bent at the knee, four a side.
	for (const side of [-1, 1])
		for (const [y, kneeX, kneeY, footX, footY] of [
			[9, 9, 4, 14, 12],
			[12, 10, 8, 16, 18],
			[15, 9, 13, 14, 22],
			[18, 7, 17, 11, 24],
		]) {
			const knee = 28 + side * kneeX
			wall.line(28 + side * 4, y, knee, kneeY, 'k')
			wall.line(knee, kneeY, 28 + side * footX, footY, 'k')
		}
	// People, tiny, getting away.
	for (const [x, y, paint] of [
		[2, 17, 'r'],
		[8, 18, 'r'],
		[43, 18, 'y'],
		[49, 16, 'r'],
	] as const)
		wall.stamp(PANIC, x, y, paint)
})

/**
 * The mine's people, in a row: hard hats, wide stiff capes over their
 * shoulders and no arms to be seen, and in the middle two of them in
 * one cape, two heads on it.
 */
const minePeople = painting('mine people', 62, 30, 13, (wall) => {
	const head = ['..yyyy..', '.yyyyyy.', 'yyyyyyyy', '..xxxx..', '..xxxx..']
	const legs = (x: number, y: number) => {
		wall.line(x, y, x, y + 3, 'k')
		wall.line(x + 3, y, x + 3, y + 3, 'k')
	}
	/** A cape, `width` across, its top at `y`. */
	const cape = (x: number, y: number, across: number) => {
		wall.stamp(
			[
				`.${'x'.repeat(across - 2)}.`,
				...Array.from({ length: 7 }, () => 'x'.repeat(across)),
				`.${'x'.repeat(across - 2)}.`,
			],
			x,
			y,
			'r',
		)
	}
	for (const x of [1, 14]) {
		wall.stamp(head, x + 2, 2, 'w')
		cape(x, 7, 12)
		legs(x + 4, 16)
	}
	// The two in one cape.
	wall.stamp(head, 29, 1, 'w')
	wall.stamp(head, 39, 1, 'w')
	cape(27, 6, 22)
	legs(31, 15)
	legs(41, 15)
	// One more, smaller, at the end.
	wall.stamp(head, 51, 3, 'w')
	cape(50, 8, 10)
	legs(53, 17)
})

/** A sun, a spiral by it, rows of chalk dots and a charcoal zigzag. */
const sunAndSpirals = painting('sun and spirals', 44, 34, 5, (wall) => {
	// The sun: a disc, a ring round it, rays.
	wall.circle(9.5, 9.5, 3.2, 'y', true)
	wall.circle(9.5, 9.5, 5, 'y')
	for (let ray = 0; ray < 8; ray++) {
		const a = (ray / 8) * Math.PI * 2
		wall.line(
			Math.round(9 + Math.cos(a) * 7),
			Math.round(9 + Math.sin(a) * 7),
			Math.round(9 + Math.cos(a) * 9),
			Math.round(9 + Math.sin(a) * 9),
			'y',
		)
	}
	// The spiral, out from its middle.
	for (let t = 0; t < Math.PI * 6; t += 0.08) {
		const r = 0.4 + t * 0.4
		wall.set(
			Math.round(29 + Math.cos(t) * r),
			Math.round(9 + Math.sin(t) * r),
			'r',
		)
	}
	// A row of dots, and a zigzag under them.
	for (let x = 3; x < 41; x += 3) wall.set(x, 20, 'w')
	for (let x = 3; x < 39; x += 4) {
		wall.line(x, 24, x + 2, 22, 'k')
		wall.line(x + 2, 22, x + 4, 24, 'k')
	}
})

/**
 * Painted beside the rope bridge, for anyone who stops to look: someone on
 * a bridge, a big arrow down through it, and under it a cart and the loop
 * it goes round. Drop through, and there's a mine down there.
 */
export const DROP_HINT = painting('drop hint', 40, 34, 41, (wall) => {
	// The bridge: its posts, its rope sagging between them, its planks,
	// and the gap in them.
	wall.line(3, 2, 3, 9, 'k')
	wall.line(36, 2, 36, 9, 'k')
	wall.line(3, 3, 10, 6, 'k')
	wall.line(10, 6, 29, 6, 'k')
	wall.line(29, 6, 36, 3, 'k')
	for (let x = 4; x < 36; x += 2)
		if (x < 17 || x > 22) wall.line(x, 8, x, 9, 'k')
	// Someone on it, their hands up.
	wall.stamp(PANIC, 10, 1, 'r')
	// The arrow, down through the gap.
	wall.line(19, 0, 19, 11, 'y')
	wall.line(20, 0, 20, 11, 'y')
	wall.stamp(['xxxxxxxx', '.xxxxxx.', '..xxxx..', '...xx...'], 16, 11, 'y')
	// The cart it lands in, and the loop under it that it goes round.
	wall.stamp(
		[
			'xxxxxxxxxxxx',
			'xxxxxxxxxxxx',
			'.xxxxxxxxxx.',
			'.xxxxxxxxxx.',
			'..ww....ww..',
		],
		14,
		15,
		'k',
	)
	wall.circle(20, 22.5, 3, 'r')
	wall.line(4, 25, 17, 25, 'r')
	wall.line(23, 25, 35, 25, 'r')
})

export const CAVE_PAINTINGS: CavePainting[] = [
	handStencils,
	hunt,
	busChase,
	mole,
	spider,
	minePeople,
	sunAndSpirals,
	DROP_HINT,
]
