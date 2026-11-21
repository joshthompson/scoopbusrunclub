import {
	CATWALK_DECK,
	CRATE,
	CRATE_HEIGHT,
	CRATE_WIDTH,
	DRUMS,
	DRUMS_HEIGHT,
	DRUMS_WIDTH,
	PALLET,
	PALLET_WIDTH,
	PLANK,
	PLANK_WIDTH,
	WAREHOUSE_SKY_BOTTOM,
	WAREHOUSE_SKY_TOP,
	YARD,
	YARD_PATH,
	YARD_PATH_SHADE,
	YARD_SHADE,
	catwalk,
} from '../courses/kit/warehouseScenery'
import type { PlatformDefinition } from '../courses/types'
import { BRISTLES_OVER_HEAD } from '../draw/art/hats'
import {
	GROUND_Y,
	RUNNER_SCALE,
	START_X,
	TICK_MS,
	VIEW_HEIGHT,
	VIEW_WIDTH,
} from '../game/constants'
import { platformAt } from '../game/platforms'
import type { Racer, World } from '../game/world'
import type { Controls } from '../input'
import { collect } from '../saved/collected'
import { play } from '../sfx'
import { type Arena, arenaCourse, inRandomOrder } from './arena'
import {
	IDLE,
	type Minigame,
	type MinigameFrame,
	type MinigameRun,
} from './types'

/**
 * Paintbrush: up against the wall of an abandoned warehouse, painted white
 * to cover up the last lot, seen zoomed out, the whole wall at once.
 * Everyone's in a paintbrush hat, its bristles loaded with paint in their
 * own colour, and wherever the bristles go, they paint the wall behind
 * them, over anyone else's paint. Steel catwalks up the wall, seven tiers
 * of them, a lift at either end, pallets on chain hoists, a crate and oil
 * drums in the yard.
 *
 * - Up over the wall, three old billboard panels, painted white too, each
 *   worth double: got to by a rotten plank that crumbles away under whoever
 *   stands on it. Once it's gone, nobody else is getting up there.
 * - Paint cans turn up about the place: pick one up for a big brush, 3
 *   seconds of it.
 * - Bounce on someone's head and they're sat down twice as long as anywhere
 *   else, painting nothing, and your paint bursts out where you landed.
 *
 * After a minute, whoever has the most of the wall in their colour wins.
 *
 * The wall's a grid of cells (`WALL_CELL` px square), painted one stroke
 * at a time, a stroke each Player a tick, from where their brush was to
 * where it is. Remote Players' screens are sent the strokes and paint them
 * just as the Host did, and now and then the whole wall, to catch up from.
 */

/** How long it goes on: a minute. */
export const PAINT_TICKS = Math.round(60_000 / TICK_MS)

// --- The arena ---------------------------------------------------------------
/** How far zoomed out it's seen: twice as wide, four times the wall. */
const ZOOM = 2
const SEEN_WIDTH = VIEW_WIDTH * ZOOM
/** The screen's left edge and its top, along and up the world: the start line in its middle, the yard at its bottom. */
export const PAINT_LEFT = START_X - SEEN_WIDTH / 2
export const PAINT_TOP = VIEW_HEIGHT * (1 - ZOOM)
/** Along the world, from across the screen. */
const along = (x: number) => PAINT_LEFT + x
const ARENA: Arena = {
	left: PAINT_LEFT,
	cameraY: 0,
	walls: { left: along(100), right: along(SEEN_WIDTH - 100) },
	zoom: ZOOM,
}
const { left: WALL_STOP_LEFT, right: WALL_STOP_RIGHT } = ARENA.walls

// --- The wall ----------------------------------------------------------------
/** Its brick piers' inner edges, across the screen: the white's between them. */
export const PIER = 96
export const WALL_LEFT = PIER
export const WALL_RIGHT = SEEN_WIDTH - PIER
/** The main wall's white, from just under its upper storey to its concrete foot, as low as a brush reaches, ducking. */
export const MAIN_TOP = -292
export const WALL_BOTTOM = 428
/**
 * The billboard panels up over it: across the screen, each `PANEL_WIDTH`
 * wide, from `PANEL_TOP` to `PANEL_BOTTOM`. Clear of the top right
 * corner, where the leaderboard is.
 */
export const PANELS = [200, 852, 1440]
export const PANEL_WIDTH = 200
export const PANEL_TOP = -456
export const PANEL_BOTTOM = -356
/** What a cell of a panel's worth, against one of the main wall's. */
export const PANEL_WORTH = 2
/** The grid of cells everything paintable's in: from the top of the panels to the wall's foot. */
export const WALL_TOP = PANEL_TOP
/** How big a cell of paint is, px square: a cell of the art's, twice over. */
export const WALL_CELL = 4
export const WALL_COLUMNS = (WALL_RIGHT - WALL_LEFT) / WALL_CELL
export const WALL_ROWS = (WALL_BOTTOM - WALL_TOP) / WALL_CELL
/** The grid's left edge, along the world. */
const WALL_X = along(WALL_LEFT)

/** How far either side of a brush's middle it paints, and up and down; a big brush, this much more. */
const BRUSH_ACROSS = 16
const BRUSH_UP = 14
const BIG = 2
/** How long a paint can's big brush lasts. */
const BIG_TICKS = Math.round(3000 / TICK_MS)
/** How far a head bounce's burst of paint reaches. */
export const SPLAT_REACH = 44
/** How long someone's sat down, bounced on: twice anywhere else's. */
const BONKED_TICKS = 36
/** How far down the head's top is from the top of the runner's sprite, as for Fruit Kebab's sword. */
const HEAD_DOWN = 2

/** The yard's floor. */
const GROUND = GROUND_Y
/** How high each tier of catwalks is over the last: a jump up. */
const TIER = 84

/** The catwalks on odd tiers (1, 3, 5, 7) and even ones (2, 4, 6): [across the screen, how wide]. Odd and even overlap a little, to jump straight up. */
const ODD: [number, number][] = [
	[216, 144],
	[560, 240],
	[1000, 240],
	[1440, 240],
]
const EVEN: [number, number][] = [
	[300, 240],
	[740, 156],
	[1180, 240],
	[1600, 120],
]
/**
 * The top tier's: kept well clear of the middle panel's ledge, so there's
 * no jumping up to it, only the lift.
 */
const TOP: [number, number][] = [
	[216, 144],
	[500, 180],
	[1200, 140],
	[1440, 240],
]
/** Catwalks that are a pallet swinging along instead: [tier, which]. */
const SWUNG: [number, number][] = [
	[4, 1],
	[5, 2],
]
/** What's left in the yard, to jump or stand on: [across the screen, its picture, how wide, how tall]. */
const JUNK: [number, typeof CRATE, number, number][] = [
	[420, DRUMS, DRUMS_WIDTH, DRUMS_HEIGHT],
	[640, CRATE, CRATE_WIDTH, CRATE_HEIGHT],
	[1080, DRUMS, DRUMS_WIDTH, DRUMS_HEIGHT],
	[1500, CRATE, CRATE_WIDTH, CRATE_HEIGHT],
]
/** Where the hoists' chains hang from: the rail under the roof's edge. */
export const HOIST_RAIL = PAINT_TOP + 42
/** How high the ledges under the panels are, and the rotten planks up to them: a jump up from the top tier, and another. */
const PLANK_HEIGHT = 8 * TIER
const LEDGE_HEIGHT = 9 * TIER
/** Where the side panels' rotten planks are, across the screen: over the top tier's catwalk, under the panel's ledge. */
const PLANKS = [260, 1500]
/** The middle panel's lift: up its shaft, cut through the catwalks, between the two halves of its ledge. */
const SHAFT = 904
const MIDDLE_LEDGE: [number, number][] = [
	[836, SHAFT - 836],
	[SHAFT + PALLET_WIDTH, 68],
]

/** A thing to stand on, in its place: a Platform. */
interface Piece {
	platform: PlatformDefinition
	/** A catwalk or a ledge: fixed, its deck in front of the wall, so not painted. */
	deck?: boolean
	/** A side panel's ledge: by which rotten plank's up to it. */
	ledge?: number
	/** Half the middle panel's ledge, got to by its lift. */
	middle?: boolean
	/** The middle panel's lift. */
	lift?: boolean
	/** A rotten plank: up to which panel's ledge. */
	plank?: number
}

const catwalkAt = (x: number, width: number, height: number): Piece => {
	const art = catwalk(width)
	return {
		deck: true,
		platform: {
			x: along(x),
			width,
			height,
			art: { asset: art.src, width: art.width, height: art.height, top: 0 },
		},
	}
}
const pallet = (
	x: number,
	height: number,
	move: NonNullable<PlatformDefinition['move']>,
): Piece => ({
	platform: {
		x: along(x),
		width: PALLET_WIDTH,
		height,
		move,
		hook: HOIST_RAIL,
		art: {
			asset: PALLET.src,
			width: PALLET.width,
			height: PALLET.height,
			top: 0,
		},
	},
})

const PIECES: Piece[] = [
	// Seven tiers of catwalks, but where a pallet swings along instead.
	...Array.from({ length: 7 }, (_, k) => k + 1).flatMap((tier) =>
		(tier === 7 ? TOP : tier % 2 ? ODD : EVEN).map(([x, width], which) => {
			const height = tier * TIER
			if (!SWUNG.some(([t, w]) => t === tier && w === which))
				return catwalkAt(x, width, height)
			// Along where the catwalk would be, and no further.
			return pallet(x, height, {
				x: width - PALLET_WIDTH,
				ticks: 300 + tier * 30,
				phase: tier / 7,
			})
		}),
	),
	// A lift at either end, up and down the wall.
	pallet(4 + PIER, 40, { y: 7 * TIER + 12, ticks: 720 }),
	pallet(WALL_RIGHT - PALLET_WIDTH - 4, 40, {
		y: 7 * TIER + 12,
		ticks: 720,
		phase: 0.5,
	}),
	// The junk in the yard, solid.
	...JUNK.map(
		([x, art, width, height]): Piece => ({
			platform: {
				x: along(x),
				width,
				height,
				solid: height,
				art: { asset: art.src, width, height, top: 0 },
			},
		}),
	),
	// Each side panel's ledge, and the rotten plank up to it.
	...[PANELS[0], PANELS[2]].map(
		(x, i): Piece => ({ ...catwalkAt(x, PANEL_WIDTH, LEDGE_HEIGHT), ledge: i }),
	),
	// The middle panel's ledge, in two halves either side of its lift's
	// shaft; and its lift, waiting in the yard for someone to stand on it,
	// then up to the ledge and back down.
	...MIDDLE_LEDGE.map(
		([x, width]): Piece => ({
			...catwalkAt(x, width, LEDGE_HEIGHT),
			middle: true,
		}),
	),
	{
		...pallet(SHAFT, 40, { y: LEDGE_HEIGHT - 40, ticks: 420, waits: 20 }),
		lift: true,
	},
	...PLANKS.map(
		(x, i): Piece => ({
			plank: i,
			platform: {
				x: along(x),
				width: PLANK_WIDTH,
				height: PLANK_HEIGHT,
				art: {
					asset: PLANK.src,
					width: PLANK.width,
					height: PLANK.height,
					top: 0,
				},
			},
		}),
	),
]
/** Which Platform each rotten plank is, by its index. */
const PLANK_INDEX = PIECES.flatMap((p, i) => (p.plank === undefined ? [] : [i]))
const LEDGE_INDEX = PIECES.flatMap((p, i) => (p.ledge === undefined ? [] : [i]))
const MIDDLE_INDEX = PIECES.flatMap((p, i) => (p.middle ? [i] : []))
const LIFT_INDEX = PIECES.findIndex((p) => p.lift)

/** A number from a cell's place, the same every time: for its ragged edge. */
const hash = (x: number, y: number) => {
	let h = Math.imul(x * 374761393 + y * 668265263, 1274126177)
	h ^= h >>> 13
	return ((h >>> 0) % 1000) / 1000
}

/**
 * What each cell of the grid is worth: 0 not paintable (brick, round the
 * main wall's ragged edge where the last coat stopped short, behind a
 * catwalk's deck), 1 the main wall, `PANEL_WORTH` a panel.
 */
export const WALL_WORTH = (() => {
	const worth = new Uint8Array(WALL_COLUMNS * WALL_ROWS)
	const decks = PIECES.filter((p) => p.deck).map(({ platform: p }) => [
		p.x - PAINT_LEFT,
		GROUND - p.height,
		p.width,
	])
	for (let r = 0; r < WALL_ROWS; r++)
		for (let c = 0; c < WALL_COLUMNS; c++) {
			const x = WALL_LEFT + c * WALL_CELL + WALL_CELL / 2
			const y = WALL_TOP + r * WALL_CELL + WALL_CELL / 2
			if (
				decks.some(
					([dx, dy, dw]) =>
						x > dx && x < dx + dw && y > dy && y < dy + CATWALK_DECK,
				)
			)
				continue
			const panel = PANELS.some(
				(px) =>
					x > px && x < px + PANEL_WIDTH && y > PANEL_TOP && y < PANEL_BOTTOM,
			)
			if (panel) {
				worth[r * WALL_COLUMNS + c] = PANEL_WORTH
				continue
			}
			if (y < MAIN_TOP) continue
			// Ragged: a cell or two short along the top and the sides.
			const n = hash(Math.floor(c / 2), Math.floor(r / 2))
			const row = Math.floor((y - MAIN_TOP) / WALL_CELL)
			if (row === 0 && n < 0.45) continue
			if (row === 1 && n < 0.15) continue
			if ((c === 0 || c === WALL_COLUMNS - 1) && n < 0.4) continue
			worth[r * WALL_COLUMNS + c] = 1
		}
	return worth
})()
/** What the whole wall's worth, painted. */
export const WALL_TOTAL = WALL_WORTH.reduce((n, w) => n + w, 0)

export const paintbrush: Minigame = {
	id: 'paintbrush',
	name: 'Paintbrush',
	blurb:
		'Your hat’s a paintbrush: wherever it goes, it paints the warehouse wall in your colour. Grab paint cans for a big brush, bounce on heads to splat, and climb to the panels up top before their planks crumble. Most of the wall after a minute wins!',
	tune: 'sewers',
	collectables: ['hat:paintbrush'],
	course: {
		...arenaCourse(
			'paintbrush',
			'Paintbrush',
			'Paint the wall in your colour. Most of it wins!',
			// Up against a warehouse wall, in its yard (see `draw/paintbrush`).
			{
				palette: {
					'--sky-blue-top': WAREHOUSE_SKY_TOP,
					'--sky-blue-bottom': WAREHOUSE_SKY_BOTTOM,
					'--grass-green': YARD,
					'--grass-dark-green': YARD_SHADE,
					'--grass-darker-green': YARD_SHADE,
					'--dirt-brown': YARD_PATH,
					'--dirt-dark-brown': YARD_PATH_SHADE,
					'--dirt-darker-brown': YARD_PATH_SHADE,
				},
				far: [],
				near: [],
				horizonTrees: false,
				platform: {
					top: '#b3bcc3',
					face: '#7b858d',
					edge: '#353c43',
					depth: CATWALK_DECK,
					cable: '#3a3f44',
				},
			},
		),
		platforms: PIECES.map((p) => p.platform),
	},
	arena: ARENA,
	start: startPaintbrush,
}

// --- Its state -----------------------------------------------------------------
/** A paint can, sat at `x` along the world, on something whose top's `y`, since `at`. */
export interface PaintCan {
	id: number
	x: number
	y: number
	at: number
}
/** A rotten plank: when it was first stood on, and when it crumbled away, by the world's ticks. */
export interface Crumble {
	index: number
	since?: number
	gone?: number
}
/** A burst of paint off a head bounce: whose, where (along and down the world), and when. */
export interface Splat {
	who: number
	x: number
	y: number
	at: number
}

/** What's to be drawn of a game of Paintbrush. */
export interface PaintShow {
	/** The wall, each cell's colour: 0 white, else whose, their place in the racers, from 1. */
	cells: Uint8Array
	/** What each racer's got of the wall, worth and all, by their place in the racers. */
	counts: number[]
	/** Each racer's colour, by their place in the racers. */
	colours: string[]
	/** Painted to, so far: the tick of the last strokes painted, on a Remote Player's screen. */
	paintedTo: number
	cans: PaintCan[]
	/** Till when each racer's got a big brush, by the world's ticks. */
	bigUntil: number[]
	planks: Crumble[]
	splats: Splat[]
}
const shows = new WeakMap<World, PaintShow>()
/** `world`'s game of Paintbrush, for drawing, if it's one. */
export const paintOf = (world: World) => shows.get(world)

/** How long a rotten plank holds, stood on, before it crumbles; and how long its bits take to fall. */
export const CRUMBLE_TICKS = 50
export const FALL_TICKS = 50
/** How long a head bounce's burst is seen flying. */
export const SPLAT_TICKS = 30
/** Paint cans: the first, how long between them (and how much later at random), how many at once, and how long one's left. */
const CAN_FIRST = 180
const CAN_EVERY = 300
const CAN_LATER = 180
const CANS_AT_ONCE = 2
const CAN_LASTS = 900
/** How near a can someone has to come to pick it up. */
const CAN_REACH = 20

/** How far `racer`'s bristles are over their feet: up over their head, lower ducking. */
function brushOver(racer: Racer, ducking = racer.body.ducking) {
	const tall = racer.runner.sprite.height * RUNNER_SCALE
	return (ducking ? tall * 0.55 : tall) - HEAD_DOWN + BRISTLES_OVER_HEAD
}
/** Where `racer`'s bristles are, along and down the world. */
export const brushAt = (racer: Racer) => ({
	x: racer.body.x,
	y: racer.body.feetY - brushOver(racer),
})

/** A stroke of a brush: [tick, racer, x0, y0, x1, y1, kind (0 a brush, 1 a big brush, 2 a burst)]. */
type Stroke = NonNullable<MinigameFrame['strokes']>[number]

/** Racer `who`'s paint on a cell, `i`: theirs now, and counted. */
function paintCell(show: PaintShow, who: number, i: number) {
	const worth = WALL_WORTH[i]
	if (!worth) return
	const was = show.cells[i]
	if (was === who + 1) return
	if (was) show.counts[was - 1] -= worth
	show.counts[who] += worth
	show.cells[i] = who + 1
}

/** One dab of racer `who`'s brush, its middle `x`, `y` px across and down the grid. */
function dab(show: PaintShow, who: number, x: number, y: number, big: boolean) {
	const across = big ? BRUSH_ACROSS * BIG : BRUSH_ACROSS
	const up = big ? BRUSH_UP * BIG : BRUSH_UP
	const c0 = Math.floor((x - across) / WALL_CELL)
	const c1 = Math.floor((x + across - 1) / WALL_CELL)
	const r0 = Math.floor((y - up) / WALL_CELL)
	const r1 = Math.floor((y + up - 1) / WALL_CELL)
	if (c1 < 0 || r1 < 0 || c0 >= WALL_COLUMNS || r0 >= WALL_ROWS) return
	for (let r = Math.max(0, r0); r <= Math.min(WALL_ROWS - 1, r1); r++)
		for (let c = Math.max(0, c0); c <= Math.min(WALL_COLUMNS - 1, c1); c++) {
			// Its corners rounded off.
			if ((c === c0 || c === c1) && (r === r0 || r === r1)) continue
			paintCell(show, who, r * WALL_COLUMNS + c)
		}
}

/**
 * A burst of racer `who`'s paint at `x`, `y` on the grid: a blot, and
 * spatters flung out round it, the same on every screen for the tick.
 */
function burst(
	show: PaintShow,
	who: number,
	x: number,
	y: number,
	tick: number,
) {
	const reach = SPLAT_REACH / WALL_CELL
	const cx = x / WALL_CELL
	const cy = y / WALL_CELL
	for (let r = Math.floor(cy - reach); r <= cy + reach; r++)
		for (let c = Math.floor(cx - reach); c <= cx + reach; c++) {
			if (r < 0 || c < 0 || r >= WALL_ROWS || c >= WALL_COLUMNS) continue
			const d = Math.hypot(c - cx, r - cy) / reach
			// A solid blot in the middle, spikier further out.
			const spike = hash(Math.round(Math.atan2(r - cy, c - cx) * 4) + tick, who)
			if (d < 0.45 || d < 0.45 + spike * 0.6)
				paintCell(show, who, r * WALL_COLUMNS + c)
		}
}

/** A stroke, painted: dabs all along it, so a fast one leaves no gaps; or a burst. */
function paintStroke(show: PaintShow, s: Stroke) {
	const [tick, who, x0, y0, x1, y1, kind] = s
	if (kind === 2) {
		burst(show, who, x1, y1, tick)
		return
	}
	const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 3))
	for (let k = 0; k <= steps; k++)
		dab(
			show,
			who,
			Math.round(x0 + ((x1 - x0) * k) / steps),
			Math.round(y0 + ((y1 - y0) * k) / steps),
			kind === 1,
		)
}

/** The wall as letters: each run of one colour, its colour a letter, then how long it is, if more than one. */
function packWall(cells: Uint8Array) {
	let out = ''
	for (let i = 0; i < cells.length; ) {
		let j = i + 1
		while (j < cells.length && cells[j] === cells[i]) j++
		out += String.fromCharCode(97 + cells[i]) + (j - i > 1 ? j - i : '')
		i = j
	}
	return out
}
function unpackWall(packed: string, show: PaintShow) {
	show.counts.fill(0)
	let i = 0
	for (const [, letter, n] of packed.matchAll(/([a-z])(\d*)/g)) {
		const value = letter.charCodeAt(0) - 97
		const end = Math.min(show.cells.length, i + (n ? Number(n) : 1))
		show.cells.fill(value, i, end)
		if (value)
			for (let k = i; k < end; k++) show.counts[value - 1] += WALL_WORTH[k]
		i = end
	}
}

/** How long a stroke's kept, to send, and how often the whole wall's packed up for sending, and sent for. */
const STROKES_KEPT = 10
const WALL_EVERY = 240
const WALL_SENT_FOR = 6

function startPaintbrush(world: World): MinigameRun {
	const { racers } = world
	const solo = racers.length === 1
	const show: PaintShow = {
		cells: new Uint8Array(WALL_COLUMNS * WALL_ROWS),
		counts: racers.map(() => 0),
		colours: racers.map((r) => r.colour ?? '#e8423f'),
		paintedTo: 0,
		cans: [],
		bigUntil: racers.map(() => -1),
		planks: PLANK_INDEX.map((index) => ({ index })),
		splats: [],
	}
	shows.set(world, show)
	// The rotten planks: this game's own, to crumble away, not the course's.
	for (const index of PLANK_INDEX)
		world.platforms[index] = { ...world.platforms[index], broken: undefined }

	/** Strokes lately painted, to send. */
	let strokes: Stroke[] = []
	let packed: [number, string] | undefined
	/** When the first stroke was painted, by the world's ticks. */
	let firstStroke: number | undefined
	/** Where each racer's brush was last tick, px across and down the grid: none, sat down. */
	const last: ([number, number] | undefined)[] = racers.map(() => undefined)
	/** How long each racer's been guarded from another bounce, last tick: up, they've just been bounced on. */
	const guarded = racers.map(() => 0)
	let nextCan = CAN_FIRST
	let canId = 0

	// Everyone in a paintbrush hat, spread along the yard, clear of the junk, facing in.
	const { left, right } = ARENA.walls
	inRandomOrder(racers).forEach((racer, i) => {
		const b = racer.body
		b.hat = { kind: 'paintbrush' }
		b.celebrating = false
		let x = left + 180 + ((right - left - 360) * (i + 0.5)) / racers.length
		for (const [jx, , w] of JUNK)
			if (x > along(jx) - 14 && x < along(jx) + w + 14) x = along(jx) - 16
		b.x = Math.round(x)
		b.feetY = world.terrain.groundY(b.x)
		b.floor = b.feetY
		b.facing = x < (left + right) / 2 ? 1 : -1
	})
	// Found, by playing it: not by watching its preview.
	if (!world.preview) collect('hat:paintbrush')

	const ticksLeft = () => Math.max(0, PAINT_TICKS - world.raceTicks())
	const share = (racer: Racer) =>
		(show.counts[racers.indexOf(racer)] ?? 0) / WALL_TOTAL
	/** "34%". */
	const percent = (racer: Racer) => `${Math.round(share(racer) * 100)}%`
	const done = (racer: Racer) => world.order()?.[0] === racer
	const isBig = (i: number) => world.ticks() < show.bigUntil[i]

	/** Where `racer`'s bristles are, px across and down the grid. */
	const brushOf = (racer: Racer): [number, number] => [
		Math.round(racer.body.x - WALL_X),
		Math.round(racer.body.feetY - brushOver(racer) - WALL_TOP),
	]

	function stroke(s: Stroke) {
		paintStroke(show, s)
		strokes.push(s)
		firstStroke ??= s[0]
	}

	function paint() {
		const now = world.ticks()
		const n = racers.length
		// Taking turns at who goes first, so nobody's always painted over.
		for (let k = 0; k < n; k++) {
			const i = (now + k) % n
			// Sat down, bounced on: painting nothing.
			if (racers[i].body.knockedDown > 0) {
				last[i] = undefined
				continue
			}
			const to = brushOf(racers[i])
			const from = last[i] ?? to
			stroke([now, i, from[0], from[1], to[0], to[1], isBig(i) ? 1 : 0])
			last[i] = to
		}
		strokes = strokes.filter((s) => s[0] > now - STROKES_KEPT)
	}

	/**
	 * Anyone bounced on since last tick: sat down twice as long, and a burst
	 * of paint for whoever came down on them, where they did.
	 */
	function bonks() {
		racers.forEach((racer, i) => {
			const o = racer.body
			const bounced = o.stomped > guarded[i]
			guarded[i] = o.stomped
			if (!bounced) return
			o.knockedDown = Math.max(o.knockedDown, BONKED_TICKS)
			o.stumble = Math.max(o.stumble, BONKED_TICKS)
			const head = o.feetY - brushOver(racer, false) + BRISTLES_OVER_HEAD
			let by: number | undefined
			let nearest = Number.POSITIVE_INFINITY
			racers.forEach((other, j) => {
				const b = other.body
				if (j === i || b.vy >= 0 || Math.abs(b.x - o.x) > 30) return
				const off = Math.abs(b.feetY - head)
				if (off < nearest) {
					nearest = off
					by = j
				}
			})
			if (by === undefined || nearest > 40) return
			const x = Math.round(o.x - WALL_X)
			const y = Math.round(head - WALL_TOP)
			stroke([world.ticks(), by, x, y, x, y, 2])
			show.splats.push({ who: by, x: o.x, y: head, at: world.ticks() })
			play('squelch')
		})
	}

	/** Each rotten plank: crumbling once it's stood on, and soon gone. */
	function crumble() {
		const now = world.ticks()
		for (const plank of show.planks) {
			if (plank.gone !== undefined) continue
			if (plank.since === undefined) {
				const on = racers.some(
					(r) => r.body.grounded && r.body.on === plank.index,
				)
				if (on) {
					plank.since = now
					play('rubble')
				}
				continue
			}
			if (now - plank.since < CRUMBLE_TICKS) continue
			plank.gone = now
			const p = world.platforms[plank.index]
			world.platforms[plank.index].broken = { x: p.x + p.width / 2, at: now }
			play('stalactite')
		}
	}

	/** Somewhere to stand to put a paint can: the yard, or a catwalk, at random. */
	function dropCan() {
		const now = world.ticks()
		const spots = PIECES.filter(
			(p) => p.deck && p.ledge === undefined && !p.middle,
		).map((p) => p.platform)
		const on =
			Math.random() < 0.25
				? undefined
				: spots[Math.floor(Math.random() * spots.length)]
		const from = on ? on.x + 20 : left + 40
		const to = on ? on.x + on.width - 20 : right - 40
		show.cans.push({
			id: canId++,
			x: Math.round(from + Math.random() * (to - from)),
			y: on ? GROUND - on.height : GROUND,
			at: now,
		})
	}

	function cans() {
		const now = world.ticks()
		show.cans = show.cans.filter((c) => now - c.at < CAN_LASTS)
		if (world.raceTicks() >= nextCan) {
			if (show.cans.length < CANS_AT_ONCE) dropCan()
			nextCan =
				world.raceTicks() + CAN_EVERY + Math.round(Math.random() * CAN_LATER)
		}
		for (let c = show.cans.length - 1; c >= 0; c--) {
			const can = show.cans[c]
			const i = racers.findIndex(
				(r) =>
					r.body.knockedDown === 0 &&
					Math.abs(r.body.x - can.x) < CAN_REACH &&
					r.body.feetY > can.y - 40 &&
					r.body.feetY < can.y + 4,
			)
			if (i < 0) continue
			show.cans.splice(c, 1)
			show.bigUntil[i] = now + BIG_TICKS
			world.popup('Big brush!', can.x, can.y - 70)
			play('fika')
		}
	}

	function decide() {
		if (world.order() || ticksLeft() > 0) return
		const order = [...racers].sort((a, b) => share(b) - share(a))
		world.setOrder(order)
		world.decidedAt = world.ticks()
		const winner = order[0]
		world.popup(
			solo ? `${percent(winner)}!` : `${winner.runner.name} wins!`,
			winner.body.x,
			winner.body.feetY - 120,
		)
		play('finished')
	}

	// --- The bot --------------------------------------------------------------
	/** Somewhere to stand: the yard (index -1), or a Platform, where it is now. */
	interface Surface {
		left: number
		right: number
		top: number
		index: number
		solid: boolean
		/** Swinging along, or a lift: no use to plan a way by, where it is now. */
		moving: boolean
	}
	/** Where a bot's going: onto `index`, at `x`, till `until`. */
	interface Plan {
		x: number
		index: number
		until: number
	}
	/** How to get from one surface to the next: jump up at `x`, drop through at `x`, run off at `x`, or jump across from `x`. */
	interface Hop {
		to: number
		how: 'up' | 'drop' | 'off' | 'across' | 'lift'
		x: number
	}
	const plans = new Map<string, Plan>()
	const jumps = new Map<string, number>()
	const stuck = new Map<string, { x: number; ticks: number }>()
	/** Which way each bot's sweeping along, if it's got where it was going. */
	const sweeping = new Map<string, number>()
	const ducks = new Map<string, number>()
	/** Where each bot was last heading for, steered for in the air. */
	const aims = new Map<string, number>()

	/** Whether ledge `l`'s still to be got to: its plank's not gone. */
	const reachable = (l: number) => show.planks[l].gone === undefined

	/** What there is to stand on now: the yard, and every platform where it is, but what's gone or can't be got to. */
	function surfaces(b: Racer['body']): Surface[] {
		const now = world.ticks()
		return [
			{ left, right, top: GROUND, index: -1, solid: false, moving: false },
			...world.platforms.flatMap((p, index) => {
				if (p.broken) return []
				const ledge = LEDGE_INDEX.indexOf(index)
				if (ledge >= 0 && !reachable(ledge) && b.on !== index) return []
				return [
					{
						...platformAt(world.terrain, p, now),
						index,
						solid: !!p.solid,
						moving: !!p.move,
					},
				]
			}),
		]
	}

	/** The surface someone falling from `top` at `x` comes down on: the highest under them. */
	const landsOn = (all: Surface[], top: number, x: number) =>
		all
			.filter((s) => s.top > top + 4 && x > s.left - 2 && x < s.right + 2)
			.reduce<Surface | undefined>(
				(best, s) => (!best || s.top < best.top ? s : best),
				undefined,
			)

	/** Every way off surface `a`: a jump up, a drop, a run off either end, a jump across. */
	function hops(all: Surface[], a: Surface): Hop[] {
		const out: Hop[] = []
		for (const s of all) {
			if (s === a || s.moving) continue
			const from = Math.max(a.left, s.left)
			const to = Math.min(a.right, s.right)
			const rise = a.top - s.top
			// Up: a jump straight up onto it, from under where they overlap.
			if (rise >= 16 && rise <= 92 && to - from >= 24 && !s.solid)
				out.push({ to: s.index, how: 'up', x: (from + to) / 2 })
			// Up onto something solid in the yard: run at it and jump.
			if (rise >= 16 && rise <= 92 && s.solid && a.index < 0)
				out.push({ to: s.index, how: 'across', x: (s.left + s.right) / 2 })
			// Across: about as high, a short gap between.
			if (Math.abs(rise) < 16 && a.index >= 0) {
				const gap = s.left >= a.right ? s.left - a.right : a.left - s.right
				if (gap >= 0 && gap < 70)
					out.push({
						to: s.index,
						how: 'across',
						x: s.left >= a.right ? a.right - 10 : a.left + 10,
					})
			}
		}
		// From the yard, the middle panel's lift, up to either half of its ledge.
		if (a.index < 0) {
			for (const to of MIDDLE_INDEX)
				out.push({ to, how: 'lift', x: along(SHAFT + PALLET_WIDTH / 2) })
			return out
		}
		// Down: off either end, or through it, ducking, where it's over something.
		for (const x of [a.left - 14, a.right + 14]) {
			const s = landsOn(all, a.top, x)
			if (s) out.push({ to: s.index, how: 'off', x })
		}
		if (!a.solid)
			for (let x = a.left + 16; x < a.right - 16; x += 40) {
				const s = landsOn(all, a.top, x)
				if (s && !out.some((h) => h.to === s.index && h.how === 'drop'))
					out.push({ to: s.index, how: 'drop', x })
			}
		return out
	}

	/** Every surface there's a way to from `from`, and how many hops it is. */
	function reachableFrom(all: Surface[], from: Surface) {
		const byIndex = new Map(all.map((s) => [s.index, s]))
		const seen = new Map([[from.index, 0]])
		const queue = [from.index]
		while (queue.length) {
			const at = queue.shift() as number
			const s = byIndex.get(at)
			if (!s) continue
			for (const hop of hops(all, s))
				if (!seen.has(hop.to)) {
					seen.set(hop.to, (seen.get(at) ?? 0) + 1)
					queue.push(hop.to)
				}
		}
		return seen
	}

	/** The surface `b`'s stood on, if they're stood on one. */
	const standingOn = (all: Surface[], b: Racer['body']) =>
		!b.grounded
			? undefined
			: b.on !== undefined
				? all.find((s) => s.index === b.on)
				: all[0]

	/** The first hop on the way from surface `from` to surface `to`, if there's a way. */
	function route(all: Surface[], from: Surface, to: number): Hop | undefined {
		const byIndex = new Map(all.map((s) => [s.index, s]))
		const first = new Map<number, Hop>()
		const queue = [from.index]
		const seen = new Set(queue)
		while (queue.length) {
			const at = queue.shift() as number
			if (at === to) return first.get(at)
			const s = byIndex.get(at)
			if (!s) continue
			for (const hop of hops(all, s)) {
				if (seen.has(hop.to)) continue
				seen.add(hop.to)
				first.set(hop.to, first.get(at) ?? hop)
				queue.push(hop.to)
			}
		}
		return undefined
	}

	/** How much there is for racer `who` to paint stood at `x` on a surface `top`, jumping: what's not theirs about there. */
	function worth(who: number, over: number, x: number, top: number) {
		const c0 = Math.floor((x - WALL_X - 80) / WALL_CELL)
		const c1 = Math.floor((x - WALL_X + 80) / WALL_CELL)
		const low = top - over + BRUSH_UP - WALL_TOP
		const r1 = Math.floor(low / WALL_CELL)
		const r0 = Math.floor((low - 100) / WALL_CELL)
		let n = 0
		for (let r = Math.max(0, r0); r <= Math.min(WALL_ROWS - 1, r1); r += 3)
			for (
				let c = Math.max(0, c0);
				c <= Math.min(WALL_COLUMNS - 1, c1);
				c += 4
			) {
				const i = r * WALL_COLUMNS + c
				if (show.cells[i] !== who + 1)
					n += WALL_WORTH[i] * (show.cells[i] ? 1 : 1.2)
			}
		return n
	}

	function choose(racer: Racer): Plan {
		const b = racer.body
		const who = racers.indexOf(racer)
		const over = brushOver(racer, false)
		let best = {
			x: b.x,
			index: -1,
			top: GROUND,
			score: Number.NEGATIVE_INFINITY,
		}
		const score = (x: number, top: number) =>
			-0.04 * Math.abs(x - b.x) -
			0.02 * Math.abs(b.feetY - top) +
			Math.random() * 20
		const all = surfaces(b)
		const here = standingOn(all, b)
		const ways = here && reachableFrom(all, here)
		for (const s of all) {
			if (s.solid || s.right - s.left < 40 || (ways && !ways.has(s.index)))
				continue
			const step = s.index < 0 ? 80 : 48
			const far = (ways?.get(s.index) ?? 0) * 8
			for (let x = s.left + 16; x <= s.right - 16; x += step) {
				const value = worth(who, over, x, s.top) + score(x, s.top) - far
				if (value > best.score)
					best = { x, index: s.index, top: s.top, score: value }
			}
		}
		// A paint can, not too far off: well worth going for.
		for (const can of show.cans) {
			const on = all.find(
				(s) =>
					Math.abs(s.top - can.y) < 2 && can.x >= s.left && can.x <= s.right,
			)
			const value = 140 + score(can.x, can.y) * 2
			if (on && (!ways || ways.has(on.index)) && value > best.score)
				best = { x: can.x, index: on.index, top: on.top, score: value }
		}
		// Long enough to get there, climbing.
		return {
			x: best.x,
			index: best.index,
			until:
				world.ticks() +
				90 +
				Math.random() * 60 +
				Math.min(
					420,
					Math.abs(best.x - b.x) * 0.3 + Math.abs(best.top - b.feetY) * 1.2,
				),
		}
	}

	function bot(racer: Racer): Controls {
		if (world.order()) return IDLE
		const b = racer.body
		const now = world.ticks()
		let plan = plans.get(racer.id)
		if (!plan || now >= plan.until) {
			sweeping.delete(racer.id)
			plan = choose(racer)
			plans.set(racer.id, plan)
		}
		const jump = () => {
			if (b.grounded && now > (jumps.get(racer.id) ?? 0) + 3)
				jumps.set(racer.id, now + 22 + Math.floor(Math.random() * 6))
		}
		const all = surfaces(b)
		const here = standingOn(all, b)
		let aim: number | undefined
		let down = false
		const target = all.find((s) => s.index === plan.index)
		if (
			here?.index === LIFT_INDEX &&
			target &&
			MIDDLE_INDEX.includes(plan.index)
		) {
			// Riding the lift up to the middle panel: stood still on it till
			// it's there, then off onto the ledge.
			aim =
				Math.abs(here.top - target.top) < 8
					? (target.left + target.right) / 2
					: b.x
		} else if (here && here.index !== plan.index) {
			const hop = route(all, here, plan.index)
			if (!hop) plan.until = now
			else if (hop.how === 'lift') {
				// Onto the lift while it's down; beside its shaft till it is.
				const lift = all.find((s) => s.index === LIFT_INDEX)
				const waiting = !!lift && lift.top > GROUND - 60
				aim = waiting ? hop.x : hop.x + (b.x < hop.x ? -80 : 80)
				if (waiting && Math.abs(hop.x - b.x) < 30) jump()
			} else if (hop.how === 'up') {
				// Stopped under it, then up: running, they'd sail past it.
				aim = hop.x
				if (Math.abs(hop.x - b.x) < 14 && Math.abs(b.vx) < 2.5) jump()
			} else if (hop.how === 'drop') {
				aim = hop.x
				if (Math.abs(hop.x - b.x) < 12) down = true
			} else if (hop.how === 'off') aim = hop.x
			else {
				// Across: a running jump, off the end, or at the junk.
				const to = all.find((s) => s.index === hop.to)
				aim = to ? (to.left + to.right) / 2 : hop.x
				if (
					Math.abs(hop.x - b.x) < 30 ||
					(here.index < 0 && Math.abs(aim - b.x) < 60)
				)
					jump()
			}
		} else if (here) {
			// There: sweeping along it, whichever way has more to paint,
			// jumping as they go, to the end of it; then off somewhere else.
			let way = sweeping.get(racer.id)
			if (way === undefined) {
				const over = brushOver(racer, false)
				const who = racers.indexOf(racer)
				way =
					worth(who, over, Math.max(here.left, b.x - 120), here.top) >
					worth(who, over, Math.min(here.right, b.x + 120), here.top)
						? -1
						: 1
				sweeping.set(racer.id, way)
			}
			aim = way < 0 ? here.left + 14 : here.right - 14
			if (Math.abs(aim - b.x) < 12) {
				sweeping.delete(racer.id)
				plan.until = now
			} else if (Math.random() < 0.25) jump()
			// Down low, on the yard, now and then: the bottom of the wall.
			if (here.index < 0 && Math.random() < 0.01)
				ducks.set(racer.id, now + 25 + Math.floor(Math.random() * 25))
		}
		if (now < (ducks.get(racer.id) ?? 0)) down = true
		// In the air: still steering for where they were going; and
		// braking for it, near it, going fast.
		if (aim === undefined) aim = aims.get(racer.id) ?? b.x
		else aims.set(racer.id, aim)
		const dx = aim - b.x
		const go =
			Math.abs(dx) <= 6
				? 0
				: Math.abs(dx) < Math.abs(b.vx) * 6 && Math.sign(b.vx) === Math.sign(dx)
					? -Math.sign(dx)
					: Math.sign(dx)
		// Up against something: over it.
		const was = stuck.get(racer.id)
		if (go && was && Math.abs(b.x - was.x) < 0.5) {
			was.ticks++
			if (was.ticks > 8) jump()
		} else stuck.set(racer.id, { x: b.x, ticks: 0 })
		if (was) was.x = b.x
		return {
			left: go < 0,
			right: go > 0,
			up: now < (jumps.get(racer.id) ?? 0),
			down,
		}
	}

	/** The planks, as they've gone, on a Remote Player's screen. */
	function setPlanks() {
		for (const plank of show.planks) {
			const p = world.platforms[plank.index]
			p.broken =
				plank.gone === undefined
					? undefined
					: { x: p.x + p.width / 2, at: plank.gone }
		}
	}

	return {
		id: 'paintbrush',
		ticksLeft,
		chip: percent,
		score: share,
		note: (racer) => `${percent(racer)} of the wall`,
		timeNote: (racer) => `${percent(racer)} of the wall`,
		done,
		out: () => false,
		bot,
		step() {
			if (world.phase() !== 'running') return
			for (const racer of racers) {
				const b = racer.body
				if (b.x < WALL_STOP_LEFT) {
					b.x = WALL_STOP_LEFT
					b.vx = Math.max(0, b.vx)
				} else if (b.x > WALL_STOP_RIGHT) {
					b.x = WALL_STOP_RIGHT
					b.vx = Math.min(0, b.vx)
				}
				b.celebrating = done(racer)
			}
			const now = world.ticks()
			if (!world.order()) {
				bonks()
				crumble()
				cans()
				paint()
			}
			show.splats = show.splats.filter((s) => now - s.at < SPLAT_TICKS)
			if (now % WALL_EVERY === 0) packed = [now, packWall(show.cells)]
			show.paintedTo = now
			decide()
		},
		frame(): MinigameFrame {
			const now = world.ticks()
			const from = now - STROKES_KEPT + 1
			return {
				paintAt: now,
				// From the very start, if it has every stroke there's been.
				strokesFrom:
					firstStroke === undefined || from <= firstStroke ? 0 : from,
				strokes: [...strokes],
				...(packed && now - packed[0] < WALL_SENT_FOR ? { wall: packed } : {}),
				paintCans: show.cans.map((c) => [c.id, Math.round(c.x), c.y, c.at]),
				bigUntil: [...show.bigUntil],
				planks: show.planks.map((p) => [p.since ?? -1, p.gone ?? -1]),
				splats: show.splats.map((s) => [
					s.who,
					Math.round(s.x),
					Math.round(s.y),
					s.at,
				]),
			}
		},
		apply(a) {
			const at = a.paintAt ?? 0
			// The whole wall, if it's newer than what's here.
			if (a.wall && a.wall[0] > show.paintedTo) {
				unpackWall(a.wall[1], show)
				show.paintedTo = a.wall[0]
			}
			// The strokes since, if none have been missed; or wait for the whole wall.
			if (at > show.paintedTo && (a.strokesFrom ?? 0) <= show.paintedTo + 1) {
				for (const s of a.strokes ?? [])
					if (s[0] > show.paintedTo) paintStroke(show, s)
				show.paintedTo = at
			}
			show.cans = (a.paintCans ?? []).map(([id, x, y, at]) => ({
				id,
				x,
				y,
				at,
			}))
			show.bigUntil = a.bigUntil ?? show.bigUntil
			;(a.planks ?? []).forEach(([since, gone], i) => {
				show.planks[i].since = since < 0 ? undefined : since
				show.planks[i].gone = gone < 0 ? undefined : gone
			})
			setPlanks()
			show.splats = (a.splats ?? []).map(([who, x, y, at]) => ({
				who,
				x,
				y,
				at,
			}))
			for (const racer of racers) racer.body.celebrating = done(racer)
		},
	}
}
