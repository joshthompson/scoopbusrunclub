import {
	type DrawPainting,
	createController,
	createObjectSignal,
} from 'scoopjs'
import type { JSX } from 'solid-js'
import {
	BEACH_FOAM,
	BEACH_SEA,
	BEACH_SHALLOWS,
	BEACH_WET_SAND,
	CRAB_FRAMES,
	CRAB_HEIGHT,
	CRAB_WIDTH,
	PALM_SHORT,
	PALM_SHORT_HEIGHT,
	PALM_SHORT_WIDTH,
	PALM_TALL,
	PALM_TALL_HEIGHT,
	PALM_TALL_WIDTH,
	SHELL,
	SHELL_HEIGHT,
	SHELL_WIDTH,
	STARFISH,
	STARFISH_HEIGHT,
	STARFISH_WIDTH,
} from '../courses/kit/beachScenery'
import {
	CAR_PARK_FIELD,
	CAR_PARK_FIELD_HEIGHT,
	CAR_PARK_FIELD_WIDTH,
	LAMP_POST,
	LAMP_POST_HEIGHT,
	LAMP_POST_WIDTH,
	PARKED_CAR,
	PARKED_CAR_HEIGHT,
	PARKED_CAR_WIDTH,
	TICKET_MACHINE,
	TICKET_MACHINE_HEIGHT,
	TICKET_MACHINE_WIDTH,
	TROLLEY,
	TROLLEY_HEIGHT,
	TROLLEY_WIDTH,
} from '../courses/kit/carParkScenery'
import {
	BALE,
	BALE_HEIGHT,
	BALE_WIDTH,
	FENCE,
	FENCE_LIT,
	FENCE_SHADE,
	HAY_STACK,
	HAY_STACK_HEIGHT,
	HAY_STACK_WIDTH,
	SHEEP,
	SHEEP_HEIGHT,
	SHEEP_WIDTH,
} from '../courses/kit/farmScenery'
import {
	BEACH_SNOWMAN,
	BEACH_SNOWMAN_HEIGHT,
	BEACH_SNOWMAN_WIDTH,
	FROZEN_DECKCHAIR,
	FROZEN_DECKCHAIR_HEIGHT,
	FROZEN_DECKCHAIR_WIDTH,
	SNOWY_BEACH_HUT,
	SNOWY_BEACH_HUT_HEIGHT,
	SNOWY_BEACH_HUT_WIDTH,
	SNOWY_PALM_SHORT,
	SNOWY_PALM_SHORT_HEIGHT,
	SNOWY_PALM_SHORT_WIDTH,
	SNOWY_PALM_TALL,
	SNOWY_PALM_TALL_HEIGHT,
	SNOWY_PALM_TALL_WIDTH,
} from '../courses/kit/frozenBeachScenery'
import {
	BARN,
	BARN_HEIGHT,
	BARN_WIDTH,
	SILO,
	SILO_HEIGHT,
	SILO_WIDTH,
	TULIPS_FRONT,
	TULIPS_FRONT_HEIGHT,
	TULIPS_FRONT_WIDTH,
	TULIP_FIELD,
	TULIP_FIELD_HEIGHT,
	TULIP_FIELD_WIDTH,
	WINDMILL,
	WINDMILL_HEIGHT,
	WINDMILL_WIDTH,
} from '../courses/kit/tulipScenery'
import {
	GROUND_Y,
	PATH_BACK,
	PATH_FRONT,
	START_X,
	VIEW_HEIGHT,
	VIEW_WIDTH,
} from '../game/constants'
import type { World } from '../game/world'
import { ARENA_LEFT } from '../minigames/arena'
import {
	FIELD_LEFT,
	FIELD_TOP,
	SEEN_WIDTH,
	groundY as fieldGround,
} from '../minigames/hungryGoose'
import { mixHex } from './art/hats'
import { cachedArt } from './canvasArt'
import { cellBatch, seeThrough } from './paint/cellBatch'
import { paintPicture } from './paint/picture'

/**
 * The minigames' sets: what's round each arena, so it's somewhere. Fruit
 * Kebab's beach, the sea coming in and going out over the sand, palms, and
 * a crab now and then; Potato Rain's clearing in a tulip field, a barn and
 * a windmill off behind it; Pogo Sticks' near-empty car park; Beach
 * Volleyball's beach in winter. Placed by where they are on the screen, which
 * never moves in an arena.
 */

/** A pixel, as everything's drawn: 2 px. */
const CELL = 2

/** A picture that never moves, its top left at `x`, `y` on the screen. */
function still(
	id: string,
	type: string,
	src: string,
	x: number,
	y: number,
	width: number,
	height: number,
) {
	return createController({
		init: () => ({
			id,
			type,
			...createObjectSignal(ARENA_LEFT + x, 'x'),
			...createObjectSignal(y, 'y'),
			...createObjectSignal({} as JSX.CSSProperties, 'style'),
			width: () => width,
			height: () => height,
		}),
		draw({ ctx, image }) {
			paintPicture(ctx, image, src, 0, 0, width, height)
		},
	})
}

/** The arena's set, drawn: whichever minigame it is. */
export function createArenaSet(world: World) {
	switch (world.minigame?.id) {
		case 'fruit-kebab':
			return createBeach(world)
		case 'potato-rain':
			return createTulipField(world)
		case 'pogo-sticks':
			return createCarPark(world)
		case 'beach-volleyball':
			return createFrozenBeach(world)
		case 'hungry-goose':
			return createFarm(world)
		default:
			return []
	}
}

// --- Fruit Kebab's beach -------------------------------------------------------------

/** Where the sea's near band ends, down the screen: the water's edge, the tide out. */
const SHORE = 334
/** How far up the sand the sea comes, at most, from there. */
const TIDE_IN = 26
/** How long the sea takes to come in and go out again, in ticks. */
const WAVE_TICKS = 260
/** How long a wave's wet sand takes to dry, as a share of a wave. */
const DRIES = 0.6
/** How far in from the left each palm's trunk stands, in px: they lean. */
const TALL_FOOT = 22 * CELL
const SHORT_FOOT = 12 * CELL
/** How often a crab comes by, at most, in ticks, and how fast it goes. */
const CRAB_EVERY = 1500
const CRAB_SPEED = 1.1
/** How long each step of its scuttle lasts. */
const CRAB_STEP = 6

/**
 * How far the sea's come in, `t` ticks in, 0 to 1: in quickly, a wave
 * washing up, and back out slowly.
 */
function tideAt(t: number) {
	const u = (((t % WAVE_TICKS) + WAVE_TICKS) % WAVE_TICKS) / WAVE_TICKS
	return u < 0.35
		? Math.sin((u / 0.35) * (Math.PI / 2))
		: Math.cos(((u - 0.35) / 0.65) * (Math.PI / 2))
}

/** The water's edge along `x`, wavy, stepped to whole cells. */
const edgeAlong = (x: number, t: number, reach: number) =>
	Math.round(
		(SHORE +
			reach +
			3 * Math.sin(x / 41 + t * 0.012) +
			2 * Math.sin(x / 17 + 1.3)) /
			CELL,
	) * CELL

function createBeach(world: World) {
	const ground = world.terrain.groundY(START_X)
	const back = ground - PATH_BACK
	/** The sea, washing up the sand and back: shallows, foam and wet sand. */
	const surf = createController({
		init: () => ({
			id: 'beach-surf',
			type: 'scenery',
			...createObjectSignal(ARENA_LEFT, 'x'),
			...createObjectSignal(0, 'y'),
			...createObjectSignal({} as JSX.CSSProperties, 'style'),
			width: () => VIEW_WIDTH,
			height: () => VIEW_HEIGHT,
		}),
		draw({ ctx }) {
			const t = world.ticks()
			const reach = TIDE_IN * tideAt(t)
			// How far this wave's been, coming in: where it's left the sand wet.
			const u = (((t % WAVE_TICKS) + WAVE_TICKS) % WAVE_TICKS) / WAVE_TICKS
			const highest = TIDE_IN
			const wet = u < 0.35 ? 0 : Math.max(0, 1 - (u - 0.35) / DRIES)
			const STEP = 4
			// Each colour filled the once: as strips, side by side, they'd
			// show a hairline between each.
			const cells = cellBatch(ctx)
			const wetSand = seeThrough(BEACH_WET_SAND, 0.85 * wet)
			for (let x = 0; x < VIEW_WIDTH; x += STEP) {
				const edge = edgeAlong(x, t, reach)
				const mark = edgeAlong(x, t, highest)
				// Wet sand, from where it reached on down to where it is, drying.
				if (wet > 0 && mark > edge) {
					cells.fillStyle = wetSand
					cells.fillRect(x, edge, STEP, mark - edge + CELL)
				}
				// The shallows, deeper blue out where the sea is.
				cells.fillStyle = BEACH_SEA
				cells.fillRect(x, SHORE - CELL, STEP, CELL * 2)
				cells.fillStyle = BEACH_SHALLOWS
				cells.fillRect(x, SHORE, STEP, Math.max(0, edge - SHORE))
				// Foam along its edge, broken, thicker coming in.
				if ((x / STEP + Math.floor(t / 20)) % 7 !== 0) {
					cells.fillStyle = BEACH_FOAM
					cells.fillRect(x, edge - CELL, STEP, u < 0.35 ? CELL * 2 : CELL)
				}
			}
			cells.flush()
		},
	})
	/**
	 * A crab now and then, scuttling across in front of the path, one way
	 * then the other: when, by the tick, so every screen sees the same one.
	 */
	const crabY = ground + PATH_FRONT + 4
	const crab = createController({
		init: () => ({
			id: 'beach-crab',
			type: 'foreground',
			...createObjectSignal(-1000, 'x'),
			...createObjectSignal(crabY, 'y'),
			...createObjectSignal({} as JSX.CSSProperties, 'style'),
			width: () => CRAB_WIDTH,
			height: () => CRAB_HEIGHT,
		}),
		draw({ ctx, image }) {
			const step = Math.floor(world.ticks() / CRAB_STEP) % CRAB_FRAMES.length
			paintPicture(ctx, image, CRAB_FRAMES[step], 0, 0, CRAB_WIDTH, CRAB_HEIGHT)
		},
		onEnterFrame({ $ }) {
			const t = world.ticks()
			const pass = Math.floor(t / CRAB_EVERY)
			// Each pass a little later in its turn than the last, so it's not like clockwork.
			const startsAt = pass * CRAB_EVERY + ((pass * 397) % 500)
			const along = (t - startsAt) * CRAB_SPEED
			const across = VIEW_WIDTH + CRAB_WIDTH * 2
			if (along < 0 || along > across) return $.setX(-1000)
			const rightwards = pass % 2 === 0
			const x = rightwards
				? -CRAB_WIDTH + along
				: VIEW_WIDTH + CRAB_WIDTH - along
			$.setX(ARENA_LEFT + Math.round(x / CELL) * CELL)
		},
	})
	/** A palm, its trunk's foot at `x`, `foot`: they lean, so it's not their middle. */
	const palm = (
		id: string,
		src: string,
		width: number,
		height: number,
		x: number,
		foot: number,
	) =>
		still(
			id,
			'platform',
			src,
			x - (src === PALM_TALL ? TALL_FOOT : SHORT_FOOT),
			foot - height,
			width,
			height,
		)
	return [
		surf,
		// Palms along the back of the beach, clear of the cannons.
		palm(
			'palm-1',
			PALM_TALL,
			PALM_TALL_WIDTH,
			PALM_TALL_HEIGHT,
			150,
			back - 30,
		),
		palm(
			'palm-2',
			PALM_SHORT,
			PALM_SHORT_WIDTH,
			PALM_SHORT_HEIGHT,
			230,
			back - 18,
		),
		palm(
			'palm-3',
			PALM_TALL,
			PALM_TALL_WIDTH,
			PALM_TALL_HEIGHT,
			790,
			back - 24,
		),
		palm(
			'palm-4',
			PALM_SHORT,
			PALM_SHORT_WIDTH,
			PALM_SHORT_HEIGHT,
			560,
			back - 70,
		),
		// Shells and a starfish washed up on the sand.
		still(
			'shell-1',
			'platform',
			SHELL,
			340,
			back - 16,
			SHELL_WIDTH,
			SHELL_HEIGHT,
		),
		still(
			'shell-2',
			'platform',
			SHELL,
			690,
			back - 44,
			SHELL_WIDTH,
			SHELL_HEIGHT,
		),
		still(
			'starfish',
			'platform',
			STARFISH,
			470,
			back - 30,
			STARFISH_WIDTH,
			STARFISH_HEIGHT,
		),
		crab,
	]
}

// --- Potato Rain's tulip field -------------------------------------------------------

function createTulipField(world: World) {
	const ground = world.terrain.groundY(START_X)
	const back = ground - PATH_BACK
	const fieldTop = back - TULIP_FIELD_HEIGHT
	return [
		// Off behind the field: a windmill far off, and the barn and its silo.
		still(
			'windmill',
			'scenery',
			WINDMILL,
			120,
			fieldTop + 24 - WINDMILL_HEIGHT,
			WINDMILL_WIDTH,
			WINDMILL_HEIGHT,
		),
		still(
			'silo',
			'scenery',
			SILO,
			630 + BARN_WIDTH - 6,
			fieldTop + 30 - SILO_HEIGHT,
			SILO_WIDTH,
			SILO_HEIGHT,
		),
		still(
			'barn',
			'scenery',
			BARN,
			630,
			fieldTop + 32 - BARN_HEIGHT,
			BARN_WIDTH,
			BARN_HEIGHT,
		),
		// The field, over their feet, its rows of tulips on down to the clearing.
		still(
			'tulip-field',
			'platform',
			TULIP_FIELD,
			0,
			fieldTop,
			TULIP_FIELD_WIDTH,
			TULIP_FIELD_HEIGHT,
		),
		// And tulips in front of the path.
		still(
			'tulips-front',
			'foreground',
			TULIPS_FRONT,
			0,
			ground + PATH_FRONT - 2,
			TULIPS_FRONT_WIDTH,
			TULIPS_FRONT_HEIGHT,
		),
	]
}

// --- Hungry Hungry Goose's farm ------------------------------------------------------

/** Where the farmland behind the field ends, down the world: the back of the field's path, and lower. */
const FARMLAND_BOTTOM = GROUND_Y
/** Where the far hills sit, the patchwork of fields runs back to, and the pasture starts, down the world. */
const HILLS_BASE = 170
const FIELDS_FROM = 196
const PASTURE_FROM = 300
/** Where the fields' boundaries all run back to: a point on the horizon, in the middle. */
const VANISH = { x: 960, y: 60 }
/** The patchwork's colours: grass, a paler grass, wheat, and ploughed earth. */
const PATCHES = ['#86bf5f', '#9ccb6e', '#78b356', '#d9c36a', '#a07a4c']
const HEDGE = '#4f7f45'
const HEDGE_LIT = '#5f9452'
const PASTURE = '#6eab4c'
const TUFT_DARK = '#5a9440'
const TUFT_LIT = '#84bf5e'

/** A number from a place, the same every time. */
const farmHash = (x: number, y: number) => {
	let h = Math.imul(x * 374761393 + y * 668265263, 1274126177)
	h ^= h >>> 13
	return ((h >>> 0) % 1000) / 1000
}

/**
 * The farmland behind the field, painted once, across the screen and down
 * from its top: the sky, paler down to the horizon, and the sun; two
 * ranges of hills, hazy blue-green far off; a patchwork of fields running
 * back to them, grass, wheat and ploughed earth, hedgerows between, a tree
 * here and there; and the sheep's pasture, its grass in tufts, on down
 * behind the field.
 */
function paintFarmland(ctx: CanvasRenderingContext2D) {
	ctx.translate(0, -FIELD_TOP)
	const cells = cellBatch(ctx)
	const rect = (x: number, y: number, w: number, h: number, c: string) => {
		cells.fillStyle = c
		cells.fillRect(x, y, w, h)
	}
	const W = SEEN_WIDTH
	// The sky, in steps, paler to the horizon.
	const steps = 10
	for (let k = 0; k < steps; k++) {
		const top = FIELD_TOP + ((HILLS_BASE - FIELD_TOP) * k) / steps
		rect(
			0,
			Math.round(top / CELL) * CELL,
			W,
			Math.ceil((HILLS_BASE - FIELD_TOP) / steps / CELL) * CELL + CELL,
			mixHex('#78c4ee', '#d6efff', k / (steps - 1)),
		)
	}
	cells.flush()
	// The sun, and its glow.
	for (let y = -64; y <= 64; y += CELL)
		for (let x = -64; x <= 64; x += CELL) {
			const d = Math.hypot(x, y)
			if (d < 40) rect(1640 + x, -400 + y, CELL, CELL, '#fff3b0')
			else if (d < 52 && (x + y) % 4 === 0)
				rect(1640 + x, -400 + y, CELL, CELL, '#fff7cc')
		}
	cells.flush()
	// The hills: far, hazy; then nearer, greener, a tree or two along them.
	const hills = (
		base: number,
		high: (x: number) => number,
		colour: string,
		trees: string | undefined,
	) => {
		for (let x = 0; x < W; x += CELL) {
			const top = Math.round((base - high(x)) / CELL) * CELL
			rect(x, top, CELL, FIELDS_FROM + 40 - top, colour)
			if (trees && farmHash(x, base) < 0.03) {
				rect(x - 4, top - 10, 10, 10, trees)
				rect(x, top - 4, 2, 6, trees)
			}
		}
		cells.flush()
	}
	hills(
		HILLS_BASE,
		(x) => 70 + 28 * Math.sin(x / 260) + 14 * Math.sin(x / 97 + 1),
		'#b3d3c0',
		undefined,
	)
	hills(
		HILLS_BASE + 26,
		(x) => 46 + 22 * Math.sin(x / 190 + 2) + 9 * Math.sin(x / 61),
		'#93c48c',
		'#7aab6e',
	)

	// The patchwork of fields, in rows, deeper the nearer, each cut up
	// by boundaries running back to the horizon, hedgerows along them.
	const rows = [FIELDS_FROM, 210, 228, 252, 282, PASTURE_FROM]
	/** Where boundary `bx` (where it reaches the pasture) is at `y`, running back to the horizon. */
	const along = (bx: number, y: number) =>
		VANISH.x + ((bx - VANISH.x) * (y - VANISH.y)) / (PASTURE_FROM - VANISH.y)
	const bounds: number[] = []
	for (let bx = -700; bx < W + 700; bx += 220 + farmHash(bx, 3) * 220)
		bounds.push(bx)
	for (let r = 0; r < rows.length - 1; r++) {
		for (let y = rows[r]; y < rows[r + 1]; y += CELL) {
			for (let k = 0; k < bounds.length - 1; k++) {
				const from = Math.round(along(bounds[k], y) / CELL) * CELL
				const to = Math.round(along(bounds[k + 1], y) / CELL) * CELL
				if (to < 0 || from > W) continue
				const patch = PATCHES[Math.floor(farmHash(k, r) * PATCHES.length)]
				// Ploughed earth in furrows, wheat in rows: a darker line every so often.
				const furrow =
					(patch === '#a07a4c' || patch === '#d9c36a') &&
					(y - rows[r]) % 6 === 4
				rect(
					from,
					y,
					to - from,
					CELL,
					furrow ? mixHex(patch, '#000000', 0.15) : patch,
				)
				// The hedge along its side.
				rect(from, y, CELL * (1 + Math.floor(r / 2)), CELL, HEDGE)
			}
		}
		// The hedge along its back, and a tree in it now and then.
		rect(0, rows[r], W, CELL * (1 + Math.floor(r / 2)), HEDGE)
		for (let x = 0; x < W; x += CELL * 4)
			if (farmHash(x, r + 10) < 0.02) {
				const size = 8 + r * 4
				rect(x, rows[r] - size, size, size, HEDGE)
				rect(x + 2, rows[r] - size, size - 4, CELL, HEDGE_LIT)
				rect(x + size / 2 - 1, rows[r] - 2, 2, 4, '#6b4f30')
			}
		cells.flush()
	}

	// The pasture, on down to the back of the field's path, up and down
	// its lumps, and no further: its grass in tufts.
	const backOf = (x: number) =>
		Math.round((fieldGround(FIELD_LEFT + x) - PATH_BACK) / CELL) * CELL
	for (let x = 0; x < W; x += CELL)
		rect(x, PASTURE_FROM, CELL, backOf(x) - PASTURE_FROM, PASTURE)
	rect(0, PASTURE_FROM, W, CELL * 2, HEDGE)
	cells.flush()
	for (let y = PASTURE_FROM + 6; y < FARMLAND_BOTTOM; y += CELL * 3)
		for (let x = (y / CELL) % 2 ? 0 : CELL * 2; x < W; x += CELL * 4) {
			if (y + CELL * 2 > backOf(x)) continue
			const n = farmHash(x, y)
			if (n < 0.1) rect(x, y, CELL, CELL * 2, TUFT_DARK)
			else if (n < 0.14) {
				rect(x, y, CELL, CELL * 2, TUFT_DARK)
				rect(x + CELL, y - CELL, CELL, CELL * 2, TUFT_DARK)
			} else if (n < 0.19) rect(x, y, CELL, CELL, TUFT_LIT)
		}
	cells.flush()
}

/** The sheep in the pasture: [across the screen, down the world, how big, how far they wander]. */
const FLOCK: [number, number, number, number][] = [
	[180, 342, 0.8, 60],
	[300, 380, 1, 90],
	[420, 330, 0.75, 50],
	[560, 400, 1.1, 80],
	[640, 352, 0.85, 70],
	[1250, 410, 1.1, 90],
	[1380, 346, 0.8, 60],
	[1540, 392, 1, 70],
	[1700, 360, 0.9, 80],
	[1820, 420, 1.15, 50],
]
/** How long a sheep's round of grazing and wandering takes, and how much of it's walking. */
const GRAZING = 600
const WALKING = 140

/**
 * A field on a farm, seen zoomed out: the farmland behind it (see
 * `paintFarmland`); the red barn and its silo, and a stack of hay bales by
 * them; a flock of sheep in the pasture, grazing, now and then wandering
 * a little way; and a wooden fence along the back of the field, up and
 * down its lumps, round bales against it here and there.
 */
function createFarm(world: World) {
	/** Across the screen, from the arena's left edge, as `still` places things: the field's twice as wide. */
	const across = (x: number) => FIELD_LEFT - ARENA_LEFT + x
	/** The fence's foot, along the back of the field, across the screen. */
	const footAt = (x: number) =>
		Math.round((world.terrain.groundY(FIELD_LEFT + x) - PATH_BACK) / CELL) *
		CELL
	const view = (
		id: string,
		draw: (
			ctx: CanvasRenderingContext2D,
			image: DrawPainting['image'],
			now: number,
		) => void,
	) =>
		createController({
			init: () => ({
				id,
				type: 'scenery',
				...createObjectSignal(FIELD_LEFT, 'x'),
				...createObjectSignal(FIELD_TOP, 'y'),
				...createObjectSignal({} as JSX.CSSProperties, 'style'),
				width: () => SEEN_WIDTH,
				height: () => FARMLAND_BOTTOM - FIELD_TOP + PATH_FRONT,
			}),
			draw({ ctx, image }) {
				const now = world.ticks()
				ctx.save()
				ctx.translate(0, -FIELD_TOP)
				draw(ctx, image, now)
				ctx.restore()
			},
		})
	const farmland = view('farmland', (ctx) => {
		const height = FARMLAND_BOTTOM - FIELD_TOP
		ctx.drawImage(
			cachedArt('farmland', SEEN_WIDTH, height, paintFarmland, 1),
			0,
			FIELD_TOP,
			SEEN_WIDTH,
			height,
		)
	})
	const sheep = view('farm-sheep', (ctx, image, now) => {
		FLOCK.forEach(([x0, y, size, wander], i) => {
			// Grazing most of the time; now and then a few steps, one way, then
			// the next time, back.
			const t = (now + i * 137) % GRAZING
			const round = Math.floor((now + i * 137) / GRAZING)
			const way = round % 2 ? -1 : 1
			const walked = Math.min(t, WALKING) / WALKING
			const from = round % 2 ? wander : 0
			const x = x0 + from + way * walked * wander
			const walking = t < WALKING
			const src = walking ? SHEEP.walk[Math.floor(now / 8) % 2] : SHEEP.graze
			const w = SHEEP_WIDTH * size * 1.4
			const h = SHEEP_HEIGHT * size * 1.4
			ctx.save()
			ctx.translate(Math.round(x), Math.round(y - h))
			// Walking right, turned round: their pictures face left.
			if (walking ? way > 0 : (round + i) % 2 === 0) {
				ctx.scale(-1, 1)
				ctx.translate(-w, 0)
			}
			paintPicture(ctx, image, src, 0, 0, w, h)
			ctx.restore()
		})
	})
	const fence = view('farm-fence', (ctx, image) => {
		// Bales first, against it, then the fence in front of them.
		for (const x of [300, 820, 1480, 1760]) {
			const foot = footAt(x + BALE_WIDTH)
			paintPicture(
				ctx,
				image,
				BALE,
				x,
				foot - BALE_HEIGHT * 2 + 8,
				BALE_WIDTH * 2,
				BALE_HEIGHT * 2,
			)
		}
		const cells = cellBatch(ctx)
		// Its two rails, stepping up and down with the ground, and its posts.
		for (let x = 0; x < SEEN_WIDTH; x += CELL * 2) {
			const foot = footAt(x)
			for (const up of [22, 44]) {
				cells.fillStyle = FENCE
				cells.fillRect(x, foot - up - 6, CELL * 2, 6)
				cells.fillStyle = FENCE_LIT
				cells.fillRect(x, foot - up - 6, CELL * 2, CELL)
			}
		}
		for (let x = 8; x < SEEN_WIDTH; x += 96) {
			const foot = footAt(x)
			cells.fillStyle = FENCE_SHADE
			cells.fillRect(x, foot - 56, 10, 56)
			cells.fillStyle = FENCE
			cells.fillRect(x, foot - 56, 6, 56)
			cells.fillStyle = FENCE_LIT
			cells.fillRect(x, foot - 56, CELL, 56)
		}
		cells.flush()
	})
	// Seen from twice as far: the barn and the rest drawn twice the size, to look as big.
	return [
		farmland,
		still(
			'farm-silo',
			'scenery',
			SILO,
			across(1060 + BARN_WIDTH * 2 - 12),
			336 - SILO_HEIGHT * 2,
			SILO_WIDTH * 2,
			SILO_HEIGHT * 2,
		),
		still(
			'farm-barn',
			'scenery',
			BARN,
			across(1060),
			340 - BARN_HEIGHT * 2,
			BARN_WIDTH * 2,
			BARN_HEIGHT * 2,
		),
		still(
			'farm-hay',
			'scenery',
			HAY_STACK,
			across(1430),
			356 - HAY_STACK_HEIGHT * 2,
			HAY_STACK_WIDTH * 2,
			HAY_STACK_HEIGHT * 2,
		),
		sheep,
		fence,
	]
}

// --- Pogo Sticks' car park ------------------------------------------------------------

function createCarPark(world: World) {
	const ground = world.terrain.groundY(START_X)
	const back = ground - PATH_BACK
	/** Something stood on the tarmac, its middle at `x`, its foot at `foot`. */
	const prop = (
		id: string,
		src: string,
		width: number,
		height: number,
		x: number,
		foot: number,
	) => still(id, 'platform', src, x - width / 2, foot - height, width, height)
	return [
		// The tarmac, its bays marked out, back to the path.
		still(
			'car-park',
			'scenery',
			CAR_PARK_FIELD,
			0,
			back - CAR_PARK_FIELD_HEIGHT,
			CAR_PARK_FIELD_WIDTH,
			CAR_PARK_FIELD_HEIGHT,
		),
		// Almost empty: one car left, in a bay at the back, a trolley
		// someone didn't take back, the pay machine, and the lights.
		prop(
			'parked-car',
			PARKED_CAR,
			PARKED_CAR_WIDTH,
			PARKED_CAR_HEIGHT,
			700,
			back - 96,
		),
		prop('trolley', TROLLEY, TROLLEY_WIDTH, TROLLEY_HEIGHT, 330, back - 40),
		prop(
			'ticket-machine',
			TICKET_MACHINE,
			TICKET_MACHINE_WIDTH,
			TICKET_MACHINE_HEIGHT,
			470,
			back - 106,
		),
		prop('lamp-1', LAMP_POST, LAMP_POST_WIDTH, LAMP_POST_HEIGHT, 40, back - 6),
		prop('lamp-2', LAMP_POST, LAMP_POST_WIDTH, LAMP_POST_HEIGHT, 900, back - 6),
	]
}

/**
 * Beach Volleyball's beach, in winter: palms with snow on their fronds
 * either end, a beach hut snowed in on one side, a snowman dressed for the
 * beach and a deckchair under snow on the other, the middle clear for the
 * net, the umpire and the scoreboard.
 */
function createFrozenBeach(world: World) {
	const back = world.terrain.groundY(START_X) - PATH_BACK
	/** A picture stood with its foot at `x` across (its middle, or a palm's trunk), `foot` down. */
	const stood = (
		id: string,
		src: string,
		width: number,
		height: number,
		x: number,
		foot: number,
		footAt = width / 2,
	) => still(id, 'platform', src, x - footAt, foot - height, width, height)
	return [
		stood(
			'snowy-palm-1',
			SNOWY_PALM_TALL,
			SNOWY_PALM_TALL_WIDTH,
			SNOWY_PALM_TALL_HEIGHT,
			110,
			back - 30,
			TALL_FOOT,
		),
		stood(
			'snowy-palm-2',
			SNOWY_PALM_SHORT,
			SNOWY_PALM_SHORT_WIDTH,
			SNOWY_PALM_SHORT_HEIGHT,
			780,
			back - 12,
			SHORT_FOOT,
		),
		stood(
			'snowy-hut',
			SNOWY_BEACH_HUT,
			SNOWY_BEACH_HUT_WIDTH,
			SNOWY_BEACH_HUT_HEIGHT,
			680,
			back - 26,
		),
		stood(
			'beach-snowman',
			BEACH_SNOWMAN,
			BEACH_SNOWMAN_WIDTH,
			BEACH_SNOWMAN_HEIGHT,
			610,
			back - 8,
		),
		stood(
			'frozen-deckchair',
			FROZEN_DECKCHAIR,
			FROZEN_DECKCHAIR_WIDTH,
			FROZEN_DECKCHAIR_HEIGHT,
			360,
			back - 10,
		),
		stood(
			'snowy-palm-3',
			SNOWY_PALM_TALL,
			SNOWY_PALM_TALL_WIDTH,
			SNOWY_PALM_TALL_HEIGHT,
			850,
			back - 24,
			TALL_FOOT,
		),
	]
}
