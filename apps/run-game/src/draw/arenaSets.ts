import { createController, createObjectSignal } from 'scoopjs'
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
	PATH_BACK,
	PATH_FRONT,
	START_X,
	VIEW_HEIGHT,
	VIEW_WIDTH,
} from '../game/constants'
import type { World } from '../game/world'
import { ARENA_LEFT } from '../minigames/arena'
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
