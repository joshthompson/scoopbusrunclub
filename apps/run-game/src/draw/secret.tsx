import { createController, createObjectSignal } from 'scoopjs'
import { seeded } from '../courses/kit/seeded'
import type { Secret, SecretLook } from '../courses/types'
import { VIEW_HEIGHT } from '../game/constants'
import { secretRoof } from '../game/secret'
import type { World } from '../game/world'
import { rectFiller } from './paint/snappedRect'

/**
 * A Secret (see `Secret`), drawn: the shaft down to it, and the cavern
 * under the course, in front of its rock and behind everyone in it. And
 * what's in it: on Everest, the Yetis' den, hollowed out of the ice, their
 * sofas, tellies and lamps, the family portrait on the wall, and the Yeti
 * at its far end, waiting to throw you back up out of it. Under Gamla
 * Stan, a tavern in an old cellar's brick vaults, down an open manhole,
 * and an air duct at its far end to blow you back up.
 */

/** Ice: the den's walls, lit, in shadow, and its seams. */
const ICE = '#3d6699'
const ICE_DARK = '#2b4c7a'
const ICE_LIT = '#5f86b8'
const ICE_SEAM = '#24406a'
const ICICLE = '#cfe4f7'
const ICICLE_SHADE = '#9cbde0'
/** Its floor: packed snow. */
const SNOW = '#e8f0f8'
const SNOW_SHADE = '#c5d6ea'
/**
 * The shaft down to it, as dark as any crevasse is at the bottom, so it
 * looks no different from the path; warmer in steps the nearer the den's
 * light.
 */
const SHAFT = '#090f1b'
const SHAFT_WARM = ['#0f1626', '#161f33', '#1f2a42']
/** The mountain's face under the den's floor, as deep down it as that: over the crevasse's pit, which goes on down. */
const FACE = '#c7cdd6'
/** Rugs, on the floor in front of the sofas. */
const RUGS = [
	['#c2453a', '#e07a4a'],
	['#3f7f6a', '#e8c25a'],
]
/** Fairy lights, strung along under the roof. */
const BULBS = ['#ffd76a', '#ff8a7a', '#9ad7ff', '#b6f08a']

/**
 * Under a street, for a cellar: the street's foot, as the Ground's bottom
 * layers are, then the earth under it all, stones in it, all the way
 * down and either side, as far as a Round's camera, zoomed out, looks.
 */
const STREET_FOOT = ['#857b70', '#5e564d']
const EARTH = '#3e3a37'
const EARTH_STONE = '#4d4844'
/** How far either side of a cellar the earth under the street goes. */
const UNDER_REACH = 4000
/** Its walls: whitewash, warm in the candlelight low down, and dim up in the vaults. */
const LIME = '#d9c9a8'
const LIME_LIT = '#ead9b3'
const LIME_DIM = '#b8a687'
/** Brick: its vaults' arches, its piers, and where the whitewash has come away. */
const BRICK = '#8f4630'
const BRICK_LIT = '#a85a40'
const BRICK_DARK = '#6a3022'
const MORTAR = '#b9a68a'
/** Its floor: old stone flags, worn, lit along the top. */
const FLAG = '#7d766d'
const FLAG_LIT = '#9a9288'
const FLAG_JOINT = '#5c564f'

/** A part of its drawing, from its top left: a block of colour, or a light's glow. */
type Part =
	| { x: number; y: number; width: number; height: number; fill: string }
	| { glow: [number, number]; reach: number; colour: string }

/** How far down under its floor it's drawn: off the bottom of the screen, looking at it. */
const DEEP = 400

/** How far back from the path, up the floor, its things stand: against the back wall. */
const SET_BACK = 6

/** How wide a cellar's bays are, between its piers, and how far down its vaults spring from. */
const BAY = 200
const SPRING = 60
const PIER = 20

/** Everything a painter needs: where it is, and how to add a block of colour. */
interface Painting {
	secret: Secret
	roof: number
	floor: number
	top: number
	bottom: number
	random: () => number
	rect: (x: number, y: number, w: number, h: number, fill: string) => void
	glow: (x: number, y: number, reach: number, colour: string) => void
}

export function createSecret(world: World) {
	const secret = world.course.secret
	const art = world.course.look?.secret
	if (!secret || !art) return []
	const { furnishings } = art
	const { groundY } = world.terrain
	const { gap } = secret
	const roof = secretRoof(world)
	const floor = secret.floor
	// Ice goes all the way up its shaft, from under the crevasse's lip; a
	// cellar's earth from the bottom of the Ground, where the camera only
	// goes after someone down it, and on either side; its shafts are drawn
	// as they're used.
	const ice = art.walls === 'ice'
	const left = ice ? secret.from - 60 : secret.from - UNDER_REACH
	const right = ice ? secret.to + 60 : secret.to + UNDER_REACH
	const top = ice
		? Math.round(groundY(gap.from)) + 100
		: Math.min(VIEW_HEIGHT, roof - 60)
	const bottom = floor + DEEP
	const at = (x: number) => Math.round(x - left)
	const y = (value: number) => Math.round(value - top)

	const parts: Part[] = []
	const painting: Painting = {
		secret,
		roof,
		floor,
		top,
		bottom,
		random: seeded(2911),
		rect: (x, yy, w, h, fill) =>
			parts.push({
				x: at(x),
				y: y(yy),
				width: Math.round(w),
				height: Math.round(h),
				fill,
			}),
		glow: (x, yy, reach, colour) =>
			parts.push({ glow: [at(x), y(yy)], reach, colour }),
	}
	if (art.walls === 'ice') paintIce(painting)
	else paintVaults(painting, art)

	// A rug in front of whatever has one; and the lights' glow.
	let rug = 0
	for (const { x, prop } of furnishings) {
		if (!prop.rug) continue
		const [base, stripe] = RUGS[rug++ % RUGS.length]
		const w = prop.width + 40
		painting.rect(x - w / 2, floor + 2, w, 6, base)
		painting.rect(x - w / 2 + 4, floor + 4, w - 8, 2, stripe)
	}
	for (const { x, prop } of furnishings)
		if (prop.glow)
			painting.glow(
				x + prop.glow.x,
				floor - prop.glow.y,
				prop.glow.reach,
				prop.glow.colour,
			)

	const hollow = createController({
		init: () => ({
			id: 'secret',
			type: 'secret',
			x: () => left,
			y: () => top,
			width: () => right - left,
			height: () => bottom - top,
		}),
		draw: ({ ctx, $scene }) => {
			const view = $scene.canvas.get()
			paint(ctx, parts, view.x() - left, view.x() - left + view.width())
		},
	})

	const things = furnishings.map(({ x, prop }, i) =>
		createController({
			frames: prop.frames,
			init: () => ({
				id: `secret-prop-${i}`,
				type: 'secret-prop',
				x: () => Math.round(x - prop.width / 2),
				y: () => floor - SET_BACK - (prop.hung ?? 0) - prop.height,
				width: () => prop.width,
				height: () => prop.height,
				// A telly's screen or a candle flickering; anything else, as it is.
				...createObjectSignal(
					(prop.frames.length > 1 ? 'play' : 'pause') as 'play' | 'pause',
					'state',
				),
				...createObjectSignal(180, 'frameInterval'),
			}),
		}),
	)

	// Whoever's at its far end: the Yeti, down on one knee, his hands
	// cupped low for you to run into, right where you're thrown from; and
	// up on his feet, arms up, while whoever he's thrown is on their way up
	// out of it. Or the duct: its fan still, and blowing.
	const { launcher } = art
	const launcherX = secret.launch - launcher.hands.x
	const flying = () =>
		world.racers.some(
			(r) =>
				r.body.x > secret.launch - 30 &&
				r.body.x < secret.land + 200 &&
				r.body.feetY < floor - 40 &&
				r.body.feetY > groundY(r.body.x) - 900,
		)
	const thrower = createController({
		frames: [launcher.kneel, launcher.thrown],
		init: () => ({
			id: 'secret-launcher',
			type: 'secret-prop',
			x: () => launcherX,
			...createObjectSignal(floor - launcher.kneelHeight, 'y'),
			width: () => launcher.width,
			...createObjectSignal(launcher.kneelHeight, 'height'),
			...createObjectSignal(0, 'frame'),
			...createObjectSignal('pause' as 'play' | 'pause', 'state'),
		}),
		onEnterFrame({ $ }) {
			const up = flying()
			const height = up ? launcher.thrownHeight : launcher.kneelHeight
			$.setFrame(up ? 1 : 0)
			$.setHeight(height)
			$.setY(floor - height)
		},
	})

	return [
		hollow,
		...things,
		thrower,
		...createManhole(world, secret, art),
		...createDuct(world, secret, art),
	]
}

/**
 * Everest's den: the shaft on down from the crevasse, dark, its sides
 * ragged ice, warmer at the bottom, where the den's light comes up it; the
 * den hollowed out of the ice, its roof ragged, its ends rounded off, seams
 * across its back wall, icicles and fairy lights hanging from its roof;
 * and its floor, packed snow.
 */
function paintIce({ secret, roof, floor, top, random, rect, glow }: Painting) {
	const { gap } = secret
	for (let yy = top; yy < roof + 4; yy += 4) {
		const warmth = Math.floor((yy - (roof - 90)) / 30)
		rect(
			gap.from + 2,
			yy,
			gap.to - gap.from - 4,
			4,
			warmth < 0 ? SHAFT : SHAFT_WARM[Math.min(2, warmth)],
		)
		const inLeft = 2 + Math.round(random() * 2) * 2
		const inRight = 2 + Math.round(random() * 2) * 2
		rect(gap.from, yy, inLeft, 4, ICE_DARK)
		rect(gap.to - inRight, yy, inRight, 4, ICE_DARK)
	}

	const end = 60
	for (let x = secret.from; x < secret.to; x += 4) {
		const fromEnd = Math.min(x - secret.from, secret.to - x)
		const round = fromEnd < end ? ((end - fromEnd) / end) ** 2 * 90 : 0
		const under = gap.from < x + 4 && x < gap.to
		const ragged = Math.round(random() * 3) * 2
		const ceiling = under ? roof : roof + ragged + round
		rect(x, ceiling, 4, floor - ceiling, ICE)
		if (!under) rect(x, ceiling, 4, 2, ICE_DARK)
		// Lit low down, off the lamps and the snow.
		rect(x, floor - 26, 4, 26, ICE_LIT)
	}
	for (let i = 0; i < (secret.to - secret.from) / 70; i++) {
		const x = secret.from + 40 + random() * (secret.to - secret.from - 80)
		const yy = roof + 30 + random() * (secret.room - 90)
		rect(x, yy, 10 + Math.round(random() * 4) * 4, 2, ICE_SEAM)
	}
	for (let x = secret.from + 30; x < secret.to - 30; x += 18 + random() * 40) {
		if (x > gap.from - 10 && x < gap.to + 10) continue
		const long = 4 + Math.round(random() * 4) * 2
		const ceiling = roof + 4
		rect(x, ceiling, 4, long, ICICLE)
		rect(x + 2, ceiling, 2, long, ICICLE_SHADE)
		rect(x + 1, ceiling + long, 2, 2, ICICLE)
	}
	for (let x = secret.from + 50; x < secret.to - 50; x += 12) {
		if (x > gap.from - 20 && x < gap.to + 20) continue
		const swag =
			Math.round(Math.sin(((x - secret.from) / 96) * Math.PI) ** 2 * 5) * 2
		const yy = roof + 14 + swag
		rect(x, yy, 4, 2, '#2b2b2b')
		if ((x - secret.from) % 24 === 2) {
			const bulb = BULBS[Math.floor((x - secret.from) / 24) % BULBS.length]
			rect(x, yy + 2, 4, 4, bulb)
			glow(x + 2, yy + 4, 10, bulb)
		}
	}

	// Under the shaft, the floor's the mountain again, all the way down,
	// not the crevasse's pit going on under it.
	rect(gap.from - 4, floor, gap.to - gap.from + 8, DEEP, FACE)
	rect(secret.from, floor, secret.to - secret.from, 2, SNOW)
	rect(secret.from, floor + 2, secret.to - secret.from, 10, SNOW_SHADE)
}

/** How far down from its roof a cellar's vault is over `x`: down to `SPRING` at its piers, up to its roof between them. */
const vaultDrop = (from: number, x: number) => {
	const t = (((x - from) % BAY) + BAY) % BAY
	const across = (t / BAY) * 2 - 1
	return SPRING * (1 - Math.sqrt(Math.max(0, 1 - across * across)))
}

/**
 * Brick, in courses, `w` by `h` from `x`, `yy`: each brick lit along its
 * top, the mortar between them, every other course half a brick along.
 */
function brickwork(
	{ rect }: Painting,
	x: number,
	yy: number,
	w: number,
	h: number,
) {
	rect(x, yy, w, h, MORTAR)
	for (let row = 0; row * 6 < h; row++) {
		const ry = yy + row * 6
		const rh = Math.min(4, yy + h - ry)
		if (rh <= 0) continue
		for (let bx = row % 2 ? -8 : 0; bx < w; bx += 16) {
			const from = Math.max(0, bx)
			const to = Math.min(w, bx + 14)
			if (to <= from) continue
			rect(x + from, ry, to - from, rh, BRICK)
			rect(x + from, ry, to - from, 1, BRICK_LIT)
		}
	}
}

/**
 * A cellar under an old town: hollowed out of the bedrock, its back wall
 * whitewashed, the brick showing through where it's come away, under brick
 * vaults sprung from piers along it, a bay between each two; the shaft
 * down from its manhole coming in through its vault, and its duct going
 * up through it; and its floor, old stone flags.
 */
function paintVaults(painting: Painting, art: SecretLook) {
	const { secret, roof, floor, top, bottom, random, rect } = painting
	const { gap } = secret
	const left = secret.from - UNDER_REACH
	const right = secret.to + UNDER_REACH
	// The street's foot, and the earth under it, a stone here and there.
	rect(left, top, right - left, bottom - top, EARTH)
	STREET_FOOT.forEach((fill, i) =>
		rect(left, top + i * 8, right - left, 8, fill),
	)
	for (let i = 0; i < (right - left) / 12; i++) {
		const x = Math.round((left + random() * (right - left)) / 2) * 2
		const yy = Math.round((top + 20 + random() * (bottom - top - 20)) / 2) * 2
		const w = 6 + Math.round(random() * 4) * 2
		rect(x, yy, w, 4, EARTH_STONE)
	}
	// The manhole's shaft, down through the rock to the vault: the rest of
	// it's drawn while someone's in it.
	if (secret.manhole) {
		const shaft = art.manhole?.shaft
		rect(
			gap.from - 6,
			roof - 60,
			gap.to - gap.from + 12,
			100,
			shaft?.brick ?? BRICK_DARK,
		)
		rect(gap.from, roof - 60, gap.to - gap.from, 100, shaft?.dark ?? SHAFT)
	}

	// The room: whitewashed wall, up to its vaults.
	for (let x = secret.from; x < secret.to; x += 4) {
		const ceiling = roof + vaultDrop(secret.from, x)
		const under = secret.manhole && gap.from < x + 4 && x < gap.to
		const from = under ? roof : ceiling
		rect(x, from, 4, floor - from, LIME)
		// Dim up in the vault, lit low down, by the candles.
		rect(x, from, 4, Math.max(0, ceiling + 30 - from), LIME_DIM)
		rect(x, floor - 40, 4, 40, LIME_LIT)
		// The vault's arch, in brick, along under its curve.
		if (!under) {
			const voussoir = Math.floor((x - secret.from) / 8) % 2 === 0
			rect(x, ceiling, 4, 8, voussoir ? BRICK : BRICK_DARK)
			rect(x, ceiling + 8, 4, 2, MORTAR)
		}
	}
	// Brick showing through, where the whitewash has come away.
	for (let i = 0; i < (secret.to - secret.from) / 160; i++) {
		const x = secret.from + 40 + random() * (secret.to - secret.from - 120)
		const yy = roof + SPRING + 20 + random() * (secret.room - SPRING - 80)
		const w = 16 + Math.round(random() * 3) * 8
		const h = 12 + Math.round(random() * 2) * 6
		if (x < gap.to + 20 && x + w > gap.from - 20) continue
		brickwork(painting, Math.round(x / 2) * 2, Math.round(yy / 2) * 2, w, h)
	}
	// Its piers, between its bays, the vaults springing off them; and its
	// ends, brick walls.
	for (let x = secret.from + BAY; x < secret.to - BAY / 2; x += BAY)
		brickwork(
			painting,
			x - PIER / 2,
			roof + SPRING - 4,
			PIER,
			floor - roof - SPRING + 4,
		)
	brickwork(painting, secret.from, roof, 12, floor - roof)
	brickwork(painting, secret.to - 12, roof, 12, floor - roof)

	// Its floor: stone flags, their joints.
	rect(secret.from, floor, secret.to - secret.from, 2, FLAG_LIT)
	rect(secret.from, floor + 2, secret.to - secret.from, 12, FLAG)
	for (
		let x = secret.from + 20;
		x < secret.to;
		x += 30 + Math.round(random() * 4) * 6
	)
		rect(x, floor + 2, 2, 12, FLAG_JOINT)
	rect(secret.from, floor + 14, secret.to - secret.from, 2, FLAG_JOINT)
}

/**
 * A Secret's manhole, if that's its way in: open in the street, the top of
 * its ladder poking up out of it; and, while anyone's on their way down
 * it, its shaft, brick, the ladder on down its far side. What's drawn goes
 * by where everyone is, so it's the same on every screen.
 */
function createManhole(world: World, secret: Secret, art: SecretLook) {
	const manhole = art.manhole
	if (!secret.manhole || !manhole) return []
	const { groundY } = world.terrain
	const { gap } = secret
	const middle = (gap.from + gap.to) / 2
	const street = Math.round(groundY(middle))
	const roof = secretRoof(world)
	const { hole, ladder, ladderAt, shaft } = manhole
	const holeLeft = Math.round(middle - hole.width / 2)
	/** Someone's on their way down it: between the street and the vault. */
	const open = () =>
		world.racers.some(
			({ body: b }) =>
				b.x > gap.from - 2 &&
				b.x < gap.to + 2 &&
				b.feetY > groundY(b.x) + 1 &&
				b.feetY < roof + 40,
		)

	const wide = gap.to - gap.from
	/** Where the ladder's rails are, down the shaft, from its left: under the ones poking up. */
	const rails = holeLeft + ladderAt - (gap.from - 6)
	const down = createController({
		init: () => ({
			id: 'manhole-shaft',
			type: 'secret',
			x: () => gap.from - 6,
			y: () => street + 2,
			width: () => wide + 12,
			height: () => roof + 40 - street - 2,
		}),
		draw: ({ ctx }) => {
			if (!open()) return
			const fill = rectFiller(ctx)
			const deep = roof + 40 - street - 2
			ctx.fillStyle = shaft.brick
			fill(0, 0, wide + 12, deep)
			ctx.fillStyle = shaft.mortar
			for (let yy = 0; yy < deep; yy += 6) {
				fill(0, yy, 6, 2)
				fill(wide + 6, yy, 6, 2)
			}
			ctx.fillStyle = shaft.dark
			fill(6, 0, wide, deep)
			// Its ladder, on down its far side.
			ctx.fillStyle = shaft.rung
			fill(rails + 2, 0, 4, deep)
			fill(rails + 10, 0, 4, deep)
			for (let yy = 8; yy < deep; yy += 10) fill(rails + 6, yy, 4, 2)
		},
	})

	/** Flat in the street, its middle on the line runners' feet are on. */
	const lying = street - 4
	const opening = createController({
		frames: [hole.asset],
		init: () => ({
			id: 'manhole',
			type: 'secret',
			x: () => holeLeft,
			y: () => lying,
			width: () => hole.width,
			height: () => hole.height,
		}),
	})
	const poking = createController({
		frames: [ladder.asset],
		init: () => ({
			id: 'manhole-ladder',
			type: 'secret-prop',
			x: () => holeLeft + ladderAt,
			// Its foot down in the hole.
			y: () => lying + hole.height - 4 - ladder.height,
			width: () => ladder.width,
			height: () => ladder.height,
		}),
	})

	return [down, opening, poking]
}

/**
 * A Secret's duct, if that's its way out: the grate in the street over it,
 * and, while anyone's being blown up it, its shaft, up from the vault
 * through the rock to the grate, air streaming up it.
 */
function createDuct(world: World, secret: Secret, art: SecretLook) {
	const duct = art.duct
	if (!secret.duct || !duct) return []
	const { groundY } = world.terrain
	const street = Math.round(groundY(secret.launch))
	const roof = secretRoof(world)
	const left = Math.round(secret.launch - duct.width / 2)
	const blowing = () =>
		world.racers.some(
			({ body: b }) =>
				Math.abs(b.x - secret.launch) < duct.width / 2 &&
				b.feetY > groundY(b.x) + 4 &&
				b.feetY < secret.floor - 20,
		)
	const shaft = createController({
		init: () => ({
			id: 'duct-shaft',
			type: 'secret',
			x: () => left,
			y: () => street + 4,
			width: () => duct.width,
			height: () => roof - street,
		}),
		draw: ({ ctx }) => {
			if (!blowing()) return
			const fill = rectFiller(ctx)
			const tall = roof - street
			ctx.fillStyle = duct.steel
			fill(0, 0, duct.width, tall)
			ctx.fillStyle = duct.lit
			fill(0, 0, 4, tall)
			ctx.fillStyle = duct.shade
			fill(duct.width - 4, 0, 4, tall)
			ctx.fillStyle = duct.seam
			for (let yy = 24; yy < tall; yy += 32) fill(0, yy, duct.width, 2)
			// Air, streaming up it, by the tick.
			ctx.fillStyle = duct.air
			const shift = (world.ticks() * 12) % 48
			for (let yy = tall - shift; yy > -40; yy -= 48)
				for (const x of [10, 20, 30]) fill(x, yy + (x % 20), 2, 24)
		},
	})
	const grate = createController({
		frames: [duct.grate.asset],
		init: () => ({
			id: 'duct-grate',
			type: 'secret-prop',
			x: () => Math.round(secret.launch - duct.grate.width / 2),
			y: () => street - 4,
			width: () => duct.grate.width,
			height: () => duct.grate.height,
		}),
	})
	return [shaft, grate]
}

/** The Secret, painted from `left` to `right` along it. */
function paint(
	ctx: CanvasRenderingContext2D,
	parts: Part[],
	left: number,
	right: number,
) {
	const fillRect = rectFiller(ctx)
	for (const part of parts) {
		if ('fill' in part) {
			if (part.x > right || part.x + part.width < left) continue
			ctx.fillStyle = part.fill
			fillRect(part.x, part.y, part.width, part.height)
			continue
		}
		const [cx, cy] = part.glow
		if (cx - part.reach > right || cx + part.reach < left) continue
		const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, part.reach)
		glow.addColorStop(0, `${part.colour}66`)
		glow.addColorStop(1, `${part.colour}00`)
		ctx.fillStyle = glow
		ctx.beginPath()
		ctx.arc(cx, cy, part.reach, 0, Math.PI * 2)
		ctx.fill()
	}
}
