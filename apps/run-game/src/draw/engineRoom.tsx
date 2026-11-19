import { createController, createObjectSignal } from 'scoopjs'
import type { Secret, SecretLook } from '../courses/types'
import { PATH_BACK, PATH_FRONT, TICK_MS } from '../game/constants'
import { DRAWN_FROM } from '../game/groundColumns'
import { rampRise } from '../game/lifeboat'
import { underground, underside } from '../game/secret'
import type { World } from '../game/world'
import { COVER_FADE_MS } from './Backdrop'
import {
	LIFEBOAT_DRAUGHT,
	LIFEBOAT_RIDE_HEIGHT,
	LIFEBOAT_RIDE_WIDTH,
	RAMP_LIP,
	RAMP_TALL,
	RAMP_WATER,
	RAMP_WIDTH,
	lifeboatPicture,
	rampPicture,
} from './art/lifeboat'
import type { Painting } from './secret'

/**
 * Below decks on Scoop Cruises' ferry (see `Secret['stairs']`): the
 * passage on along under the stairs up to the shop, its carpet carrying on
 * from the cabins' corridor, to a steel door; and through it, the engine
 * rooms, hidden behind the hull till anyone gets to the door. Low under the
 * shop, tall under the sun deck: steel plate, girders, pipes along under
 * the deck over them, a chequer-plate floor, and a hole blown through the
 * floor and the hull under it, out to the sea, burning round its edges.
 * And the lifeboat on the water under it, and the plastic trick ramp it's
 * ridden up at the end.
 */

/**
 * The passage: its wall, cream like the stairwell's, a darker dado along
 * its foot, and a handrail; under the stairs, all of it in their shadow.
 */
const PASSAGE_WALL = '#d9d2c3'
const PASSAGE_SHADE = '#c4bcab'
const PASSAGE_DADO = '#8f8676'
const PASSAGE_RAIL = '#6b6357'
const PASSAGE_SHADOW = '#a99f8c'
const PASSAGE_DEEP = '#8c8372'
const PASSAGE_DADO_SHADOW = '#6f675b'
/** Cables along the passage's top, in their tray. */
const CABLE_TRAY = '#8d949b'
const CABLE_TRAY_SHADE = '#5d646b'
/** How far apart the posts holding the stairs up are. */
const STAIR_POST = 96
/** The stairs' underside: their stringer, its timber in shadow. */
const STRINGER = '#5b4f43'
const STRINGER_LIT = '#7a6c5c'
/** A deck's beam, over the passage on past the stairs. */
const BEAM = '#a69d8e'
const BEAM_SHADE = '#857c6e'
/** The cabins' corridor's carpet, and the white trim along its front. */
const CARPET = '#34558e'
const CARPET_DARK = '#26406c'
const CARPET_SHADE = '#2a4775'
const TRIM = '#f3f4f1'
const UNDER_TRIM = '#8a8278'
/** The engine rooms' plate, painted grey-green, its seams, and in shadow low down. */
const PLATE = '#6b7a73'
const PLATE_SHADE = '#5a6862'
const PLATE_SEAM = '#4a5651'
const PLATE_LIT = '#7a8982'
const PLATE_DARK = '#5f6d67'
const RIVET = '#88968f'
const RUST = '#8a6a4a'
const RUST_DARK = '#6a4a32'
/** How tall a plate is, and how far apart the girders' knees are. */
const PANEL_TALL = 56
const KNEE_EVERY = 128
/** How far apart the pipes' flanges are, and their hangers. */
const FLANGE_EVERY = 96
const HANGER_EVERY = 192
/** The catwalk up in the tall hall: how high, and its steel, dark, far back, and its rail. */
const CATWALK_UP = 196
const CATWALK = '#3f4743'
const CATWALK_LIT = '#5b6560'
const CATWALK_RAIL = '#a88a2a'
/** Girders along under the deck over them. */
const GIRDER = '#3f4743'
const GIRDER_LIT = '#5b6560'
/** Its floor: chequer plate, its treads catching the light. */
const STEEL = '#7d848b'
const STEEL_DARK = '#4f565c'
const TREAD = '#9aa1a8'
const STEEL_EDGE = '#3a4047'
/** A walkway's line painted along it; gratings let into it; hazard stripes. */
const WALKWAY_LINE = '#c9a227'
const GRATING = '#2a2f33'
const GRATING_BAR = '#5d646b'
const HAZARD_YELLOW = '#f0c419'
/** The hole: dark inside, charred round its edge, glowing, and the sea at the bottom of it. */
const BREACH = '#1a1311'
const CHAR = '#2e2622'
const EMBER = '#ff7a1a'
const EMBER_LIT = '#ffc44a'
const SEA_IN = '#2f6a91'
const SEA_IN_LIT = '#5b97c2'
/** The fire's light, and how far it reaches round the hole. */
const FIRELIGHT = '#ff8a2a'
const FIRELIGHT_REACH = 220

/** How wide a column's painted at a time, under stairs stepping up. */
const COLUMN = 4
/** How far apart the engine rooms' plates' seams are. */
const SEAM_EVERY = 96

/**
 * The top of all that's drawn below decks: just over the underside of the
 * highest deck over any of it.
 */
export function engineRoomTop(world: World) {
	const secret = world.course.secret
	if (!secret) return 0
	let top = secret.floor
	for (let x = secret.from; x < secret.to; x += COLUMN)
		top = Math.min(top, underside(world, x))
	return top - 4
}

/**
 * Runs of columns along `from` to `to` with the same roof over them, from
 * left to right: `[from, to, roof]`.
 */
function runs(from: number, to: number, roofAt: (x: number) => number) {
	const out: [number, number, number][] = []
	let start = from
	let roof = roofAt(from + COLUMN / 2)
	for (let x = from + COLUMN; x < to; x += COLUMN) {
		const at = roofAt(x + COLUMN / 2)
		if (at === roof) continue
		out.push([start, x, roof])
		start = x
		roof = at
	}
	out.push([start, to, roof])
	return out
}

export function paintEngineRoom(painting: Painting, art: SecretLook) {
	const { world, secret, floor, rect } = painting
	// From the door's far side: the passage's wall on up over it.
	const door = art.door
		? Math.round(art.door.x + art.door.shut.width / 2)
		: secret.from
	const hole = secret.lifeboat?.hole
	const back = floor - PATH_BACK
	const roofAt = (x: number) => underside(world, x)
	const all = runs(secret.from, secret.to, roofAt)
	/** The runs of the engine rooms, past the door, and of the passage, before it. */
	const engine = clip(all, door, secret.to)
	const passage = clip(all, secret.from, door)

	for (const run of passage) paintPassage(painting, run, back)
	for (const run of engine) paintPlate(painting, run, back)
	paintPanels(painting, engine, back)
	paintCatwalk(painting, engine, back, hole)
	paintPipes(painting, engine, back)
	// The far end: a bulkhead, past the hole.
	const end = roofAt(secret.to - 6)
	rect(secret.to - 12, end, 12, back - end, GIRDER)
	rect(secret.to - 12, end, 2, back - end, GIRDER_LIT)

	// The floor: the corridor's carpet, on along under the stairs, the
	// stairs over it (see `draw/stairs.tsx`); chequer plate, past the door;
	// none over the hole.
	const front = floor + PATH_FRONT
	for (const [from, to, roof] of passage) {
		const w = to - from
		// In the stairs' shadow, darker.
		const under = from < secret.gap.to
		rect(from, back, w, 5, CARPET_DARK)
		rect(from, back + 5, w, front - back - 5, under ? CARPET_SHADE : CARPET)
		rect(from, front, w, 2, TRIM)
		rect(from, front + 2, w, 2, UNDER_TRIM)
	}
	const solid = (from: number, to: number) => {
		if (to <= from) return
		rect(from, back, to - from, 5, STEEL_DARK)
		rect(from, back + 5, to - from, PATH_BACK + PATH_FRONT - 5, STEEL)
		rect(from, back + 8, to - from, 2, WALKWAY_LINE)
		// Its treads, in rows.
		for (let x = from + 4; x < to - 6; x += 12)
			for (let row = 0; row < 3; row++)
				rect(x + (row % 2) * 6, back + 14 + row * 7, 4, 2, TREAD)
		rect(from, front, to - from, 2, STEEL_EDGE)
	}
	solid(door, hole ? hole.from : secret.to)
	if (hole) solid(hole.to, secret.to)
	// Gratings let into it, here and there, dark down through them.
	for (let x = door + 260; x < (hole?.from ?? secret.to) - 180; x += 420) {
		rect(x, back + 11, 56, 24, GRATING)
		for (let gx = x + 2; gx < x + 56; gx += 6)
			rect(gx, back + 11, 2, 24, GRATING_BAR)
		rect(x, back + 11, 56, 2, STEEL_EDGE)
	}
	// Hazard stripes up to the hole, yellow and black.
	if (hole)
		for (let x = hole.from - 48; x < hole.from - 2; x += 8)
			rect(x, back + 11, 4, 24, HAZARD_YELLOW)

	if (hole) paintHole(painting, hole)
}

/** A run of columns, `[from, to, roof]`. */
type Run = [number, number, number]

/** Of `all`, the parts between `from` and `to`. */
function clip(all: Run[], from: number, to: number): Run[] {
	return all.flatMap(([a, b, roof]): Run[] => {
		const l = Math.max(a, from)
		const r = Math.min(b, to)
		return r > l ? [[l, r, roof]] : []
	})
}

/**
 * The passage on under the stairs: cream, a dado along its foot and a
 * handrail; under the stairs themselves, in their shadow, their steel
 * stringer along their underside and posts down from it to the floor;
 * past them, under a deck's beam, a cable tray along the top.
 */
function paintPassage(
	{ secret, rect }: Painting,
	[from, to, roof]: Run,
	back: number,
) {
	if (back <= roof) return
	const w = to - from
	const under = from < secret.gap.to
	rect(from, roof, w, back - roof, under ? PASSAGE_SHADOW : PASSAGE_WALL)
	rect(from, roof, w, 10, under ? PASSAGE_DEEP : PASSAGE_SHADE)
	// Under the stairs, their stringer; past them, a deck's beam, and cables.
	rect(from, roof, w, 6, under ? STRINGER : BEAM_SHADE)
	rect(from, roof + 6, w, 2, under ? STRINGER_LIT : BEAM)
	if (!under && back - roof > 40) {
		rect(from, roof + 12, w, 4, CABLE_TRAY)
		rect(from, roof + 16, w, 2, CABLE_TRAY_SHADE)
	}
	// Posts holding the stairs up, from their stringer to the floor.
	if (under)
		for (
			let x = Math.ceil(from / STAIR_POST) * STAIR_POST;
			x < to;
			x += STAIR_POST
		) {
			rect(x, roof + 6, 4, back - roof - 6, STRINGER)
			rect(x, roof + 6, 1, back - roof - 6, STRINGER_LIT)
		}
	// A dado along its foot, and a handrail over it, where there's room.
	if (back - 40 > roof + 10) {
		rect(from, back - 34, w, 34, under ? PASSAGE_DADO_SHADOW : PASSAGE_DADO)
		rect(from, back - 40, w, 3, PASSAGE_RAIL)
	} else if (back - 12 > roof + 8)
		rect(from, back - 12, w, 12, under ? PASSAGE_DADO_SHADOW : PASSAGE_DADO)
}

/**
 * The engine rooms' wall: plate, darker up under the deck, a band of
 * shadow along its foot, and the deck's girders, knees under them.
 */
function paintPlate({ rect }: Painting, [from, to, roof]: Run, back: number) {
	if (back <= roof) return
	const w = to - from
	rect(from, roof, w, back - roof, PLATE)
	rect(from, roof, w, Math.min(40, back - roof), PLATE_DARK)
	rect(from, back - 24, w, 24, PLATE_SHADE)
	rect(from, back - 26, w, 2, PLATE_SEAM)
	// The girders along under the deck over them, and their knees.
	rect(from, roof, w, 10, GIRDER)
	rect(from, roof + 10, w, 2, GIRDER_LIT)
	for (
		let x = Math.ceil(from / KNEE_EVERY) * KNEE_EVERY;
		x < to;
		x += KNEE_EVERY
	)
		for (let k = 0; k < 4; k++)
			rect(x - 8 + k * 2, roof + 12 + k * 2, 16 - k * 4, 2, GIRDER)
}

/**
 * The plates' seams, across and up, rivets along them, each plate lit a
 * little along its top; and rust run down from a rivet, here and there.
 */
function paintPanels({ rect, random }: Painting, engine: Run[], back: number) {
	for (const [from, to, roof] of engine) {
		const w = to - from
		for (let y = back - 26 - PANEL_TALL; y > roof + 46; y -= PANEL_TALL) {
			rect(from, y, w, 2, PLATE_SEAM)
			rect(from, y + 2, w, 2, PLATE_LIT)
			for (let x = Math.ceil(from / 8) * 8; x < to; x += 8)
				rect(x, y - 4, 2, 2, RIVET)
		}
		for (
			let x = Math.ceil(from / SEAM_EVERY) * SEAM_EVERY;
			x < to;
			x += SEAM_EVERY
		) {
			rect(x, roof + 40, 2, back - 26 - roof - 40, PLATE_SEAM)
			for (let y = back - 30; y > roof + 44; y -= 8) rect(x + 4, y, 2, 2, RIVET)
		}
	}
	// Rust, in streaks down the plates: seeded, so the same on every screen.
	for (const [from, to, roof] of engine)
		for (let x = from + 30; x < to - 10; x += 70 + Math.round(random() * 60)) {
			if (back - roof < 80) continue
			const y = roof + 50 + Math.round((random() * (back - roof - 90)) / 2) * 2
			const long = 8 + Math.round(random() * 8) * 2
			rect(Math.round(x / 2) * 2, y, 2, long, RUST)
			rect(Math.round(x / 2) * 2, y, 2, 4, RUST_DARK)
		}
}

/** Pipes along the walls, level, `up` from the floor: as far as the deck over them lets them. */
const PIPES = [
	{ up: 100, tall: 8, fill: '#b8322b', lit: '#d9574d', shade: '#8f1f1b' },
	{ up: 88, tall: 6, fill: '#d8a62a', lit: '#f0c64e', shade: '#a87e18' },
	{ up: 250, tall: 6, fill: '#4f8a4a', lit: '#74ad6c', shade: '#356632' },
	{ up: 274, tall: 8, fill: '#3f6fa8', lit: '#6a96c8', shade: '#2c5282' },
	{ up: 300, tall: 12, fill: '#9aa1a8', lit: '#c3c8cd', shade: '#7d848b' },
]

/**
 * The engine rooms' pipes: each at its height, under the deck, flanged,
 * hung from the girders by rods; cut off where the deck comes down over
 * them, as if on up through it.
 */
function paintPipes({ floor, rect }: Painting, engine: Run[], back: number) {
	for (const pipe of PIPES) {
		const y = floor - pipe.up
		for (const [from, to, roof] of engine) {
			if (y < roof + 14 || y + pipe.tall > back - 30) continue
			const w = to - from
			rect(from, y, w, pipe.tall, pipe.fill)
			rect(from, y, w, 2, pipe.lit)
			rect(from, y + pipe.tall - 2, w, 2, pipe.shade)
			for (
				let x = Math.ceil(from / FLANGE_EVERY) * FLANGE_EVERY;
				x < to - 2;
				x += FLANGE_EVERY
			) {
				rect(x, y - 2, 4, pipe.tall + 4, pipe.shade)
				rect(x, y - 2, 4, 2, pipe.lit)
			}
			// Hung from the girders.
			if (y - roof > 24)
				for (
					let x = Math.ceil(from / HANGER_EVERY) * HANGER_EVERY + 20;
					x < to;
					x += HANGER_EVERY
				)
					rect(x, roof + 12, 2, y - roof - 12, GIRDER)
		}
	}
}

/**
 * Up in the tall hall, a catwalk along its back wall, dark, far back:
 * its grating, its railing, and the brackets it hangs off.
 */
function paintCatwalk(
	{ floor, rect }: Painting,
	engine: Run[],
	back: number,
	hole: { from: number; to: number } | undefined,
) {
	const y = floor - CATWALK_UP
	for (const [from, raw, roof] of engine) {
		const to = Math.min(raw, (hole?.from ?? raw) - 40)
		if (to <= from || y - roof < 70 || back - y < 60) continue
		const w = to - from
		rect(from, y, w, 6, CATWALK)
		for (let x = from; x < to; x += 6) rect(x, y + 2, 2, 2, CATWALK_LIT)
		rect(from, y + 6, w, 2, GIRDER)
		rect(from, y - 26, w, 2, CATWALK_RAIL)
		rect(from, y - 13, w, 2, CATWALK)
		for (let x = Math.ceil(from / 32) * 32; x < to; x += 32) {
			rect(x, y - 26, 2, 26, CATWALK)
			// A bracket under it, back to the wall.
			for (let k = 0; k < 4; k++)
				rect(x - 6 + k, y + 8 + k * 2, 8 - k * 2, 2, GIRDER)
		}
	}
}

/**
 * The hole blown in the floor and through the hull under it: ragged, dark
 * inside, charred and glowing round its edge, the floor's plates torn
 * back, and the sea at the bottom of it.
 */
function paintHole(
	{ secret, floor, random, rect }: Painting,
	hole: { from: number; to: number },
) {
	const water = secret.lifeboat?.water ?? floor + 100
	const middle = (hole.from + hole.to) / 2
	const half = (hole.to - hole.from) / 2
	const top = floor - PATH_BACK
	// Row by row, down from the floor's back edge to the sea: as wide as the
	// hole through the floor, bulging out round the hull's, ragged.
	for (let y = top; y < water; y += 4) {
		const u = (y - top) / (water - top)
		const bulge = 1 + 0.3 * Math.sin(u * Math.PI)
		const ragged = Math.round((random() - 0.5) * 8)
		const w = Math.round(half * bulge * (1 - 0.25 * u * u) + ragged)
		const left = Math.round((middle - w) / 2) * 2
		const right = Math.round((middle + w) / 2) * 2
		rect(left - 6, y, 6, 4, CHAR)
		rect(right, y, 6, 4, CHAR)
		rect(left, y, right - left, 4, BREACH)
		// Embers, glowing along its edge.
		if (random() < 0.5)
			rect(left - 2, y, 2, 2, random() < 0.5 ? EMBER : EMBER_LIT)
		if (random() < 0.5)
			rect(right, y + 2, 2, 2, random() < 0.5 ? EMBER : EMBER_LIT)
	}
	// The sea, at the bottom of it.
	const w = Math.round(half * 0.8)
	rect(middle - w, water - 8, 2 * w, 8, SEA_IN)
	rect(middle - w, water - 8, 2 * w, 2, SEA_IN_LIT)
	// The floor's plates, torn back either side.
	for (const [edge, dir] of [
		[hole.from, -1],
		[hole.to, 1],
	] as const) {
		for (let i = 0; i < 4; i++) {
			const x = edge + dir * (2 + i * 6) - (dir < 0 ? 6 : 0)
			const down = 4 + Math.round(random() * 3) * 4
			rect(x, floor + PATH_FRONT - 2, 6, down, STEEL_DARK)
			rect(x, floor + PATH_FRONT - 2, 6, 2, CHAR)
		}
	}
}

/** How near the door, along, someone down there has to get to open it. */
const DOOR_NEAR = 80
/** How far back up the floor the door stands: against the back wall, as what else is down there does. */
const DOOR_BACK = 6

/**
 * A Secret's door (see `SecretLook['door']`): shut, till anyone down there
 * gets to it; then open, for good. And the hull, over all that's past it,
 * till then: the engine rooms, hidden, and then, as the door opens, there.
 * Who's got to it goes by where everyone is, so it's the same on every
 * screen.
 */
export function createEngineDoor(
	world: World,
	secret: Secret,
	art: SecretLook,
) {
	const door = art.door
	if (!door) return []
	const { floor } = secret
	/** The tick it opened on, as a Cave's cover fades: held, paused. */
	let openedAt: number | undefined
	const opened = () => {
		if (openedAt !== undefined) return true
		const there = world.racers.some(
			({ body }) => underground(world, body) && body.x > door.x - DOOR_NEAR,
		)
		if (there) openedAt = Math.max(0, world.ticks())
		return there
	}
	const width = Math.max(door.shut.width, door.open.width)
	const doorLeft = Math.round(door.x - door.shut.width / 2)
	const doorway = createController({
		frames: [door.shut.asset, door.open.asset],
		init: () => ({
			id: 'secret-door',
			type: 'secret-cover',
			x: () => doorLeft,
			y: () => floor - DOOR_BACK - door.shut.height,
			width: () => width,
			height: () => door.shut.height,
			...createObjectSignal(0, 'frame'),
			...createObjectSignal('pause' as 'play' | 'pause', 'state'),
		}),
		onEnterFrame({ $ }) {
			$.setFrame(opened() ? 1 : 0)
		},
	})

	// The hull over everything past the door, up to the deck over it, and
	// down to the floor's front edge: the hole in its side, under that,
	// there to see all along.
	const tile = world.course.look?.cave?.tiles?.front
	const from = doorLeft + door.shut.width
	// And on along the hull past it, as far as the fire's light reaches,
	// so there's none on it till then.
	const to = secret.to + FIRELIGHT_REACH
	const top = engineRoomTop(world)
	const bottom = floor + PATH_FRONT + 4
	const shape = new Path2D()
	for (const [a, b, roof] of runs(from, to, (x) => underside(world, x)))
		shape.rect(a - from, roof - 2 - top, b - a, bottom - roof + 2)
	const cover = createController({
		init: () => ({
			id: 'secret-hull',
			type: 'secret-cover',
			x: () => from,
			y: () => top,
			width: () => to - from,
			height: () => bottom - top,
		}),
		draw: ({ ctx, image }) => {
			opened()
			const shown =
				openedAt === undefined
					? 1
					: 1 -
						((Math.max(0, world.ticks()) - openedAt) * TICK_MS) / COVER_FADE_MS
			if (shown <= 0) return
			const picture = tile && image(tile.asset)
			const fill = picture && ctx.createPattern(picture.image, 'repeat')
			// Lined up with the hull's own, drawn from `DRAWN_FROM`, from y 0.
			fill?.setTransform(new DOMMatrix().translate(DRAWN_FROM - from, -top))
			ctx.save()
			ctx.globalAlpha = shown
			ctx.fillStyle = fill || world.course.look?.cave?.rock || '#f3f4f1'
			ctx.fill(shape)
			ctx.restore()
		},
	})
	// Firelight round the hole, flickering, behind the hull till then.
	const hole = secret.lifeboat?.hole
	const light = hole
		? [
				createFirelight(world, {
					x: (hole.from + hole.to) / 2,
					y: floor - 10,
					reach: FIRELIGHT_REACH,
					colour: FIRELIGHT,
					seed: 99,
				}),
			]
		: []
	return [...light, doorway, cover]
}

/**
 * Firelight: a glow round a fire, `reach` round (`x`, `y`), brighter and
 * dimmer and a little bigger and smaller as the fire flickers, by the
 * tick, so the same on every screen; each with its own `seed`, out of
 * step with the rest.
 */
export function createFirelight(
	world: World,
	light: { x: number; y: number; reach: number; colour: string; seed: number },
) {
	const { x, y, reach, colour, seed } = light
	const most = Math.round(reach * 1.1)
	return createController({
		init: () => ({
			id: `firelight-${seed}-${Math.round(x)}`,
			type: 'secret',
			x: () => Math.round(x - most),
			y: () => Math.round(y - most),
			width: () => most * 2,
			height: () => most * 2,
		}),
		draw: ({ ctx }) => {
			const t = Math.max(0, world.ticks()) + seed * 37
			const flicker =
				0.8 +
				0.12 * Math.sin(t * 0.31) +
				0.08 * Math.sin(t * 0.73 + seed) +
				0.06 * Math.sin(t * 1.9 + seed * 2)
			const r = reach * (0.94 + 0.06 * flicker)
			const alpha = Math.round(Math.max(0, Math.min(1, 0.42 * flicker)) * 255)
				.toString(16)
				.padStart(2, '0')
			const glow = ctx.createRadialGradient(most, most, 0, most, most, r)
			glow.addColorStop(0, `${colour}${alpha}`)
			glow.addColorStop(1, `${colour}00`)
			ctx.fillStyle = glow
			ctx.beginPath()
			ctx.arc(most, most, r, 0, Math.PI * 2)
			ctx.fill()
		},
	})
}

/**
 * The lifeboat (see `SecretLifeboat`): on the water, bobbing, waiting;
 * ridden, tipped up the ramp and hopping; thrown, and drifting. In front of
 * whoever's in it, sat down inside, its hull over their legs. And the great
 * plastic trick ramp it's ridden up at the end, floating on its pontoons.
 */
export function createLifeboatRide(world: World) {
	const boat = world.lifeboat
	const secret = world.course.secret
	if (!boat || !secret?.lifeboat) return []
	const water = secret.lifeboat.water
	const sprite = createController({
		init: () => ({
			id: 'lifeboat',
			type: 'cart',
			...createObjectSignal(boat.x - LIFEBOAT_RIDE_WIDTH / 2, 'x'),
			...createObjectSignal(
				boat.y + LIFEBOAT_DRAUGHT - LIFEBOAT_RIDE_HEIGHT,
				'y',
			),
			...createObjectSignal(0, 'rotation'),
			width: () => LIFEBOAT_RIDE_WIDTH,
			height: () => LIFEBOAT_RIDE_HEIGHT,
			origin: () => ({
				x: LIFEBOAT_RIDE_WIDTH / 2,
				y: LIFEBOAT_RIDE_HEIGHT - LIFEBOAT_DRAUGHT,
			}),
		}),
		draw: ({ ctx, image }) => {
			// Foam along it only on the water: not hopping, nor up the ramp.
			const picture = image(
				lifeboatPicture(!boat.air && rampRise(world, boat.x) === 0),
			)
			if (picture)
				ctx.drawImage(
					picture.image,
					0,
					0,
					LIFEBOAT_RIDE_WIDTH,
					LIFEBOAT_RIDE_HEIGHT,
				)
		},
		onEnterFrame({ $ }) {
			$.setX(Math.round(boat.x - LIFEBOAT_RIDE_WIDTH / 2))
			$.setY(Math.round(boat.y + LIFEBOAT_DRAUGHT - LIFEBOAT_RIDE_HEIGHT))
			$.setRotation(boat.tilt)
		},
	})
	const ramp = createController({
		init: () => ({
			id: 'lifeboat-ramp',
			type: 'secret-prop',
			x: () => Math.round(secret.launch - RAMP_LIP),
			y: () => water - RAMP_WATER,
			width: () => RAMP_WIDTH,
			height: () => RAMP_TALL,
		}),
		draw: ({ ctx, image }) => {
			const picture = image(rampPicture)
			if (picture) ctx.drawImage(picture.image, 0, 0, RAMP_WIDTH, RAMP_TALL)
		},
	})
	return [ramp, sprite]
}
