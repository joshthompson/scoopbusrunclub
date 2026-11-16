import type { DrawPainting } from 'scoopjs'
import { VALVE } from '../../courses/kit/bodyScenery'
import { HEARTBEAT, beatAt, valveFlapped, valveOpen } from '../../game/body'
import { steamPuff } from '../../game/steam'
import { filterReach, filtered } from './css'
import { paintPicture } from './picture'
import { type SteamBit, paintSteam, steamReach } from './steam'

/**
 * Steam Vents, Bouncy Toadstools and Heart Valves, painted in their Draw
 * Hooks: everything that fires whoever's on it up into the air.
 */

/** A Steam Vent's clouds: each its own size, rising from its own place, one after another. */
const STEAM_CLOUDS = [
	{ x: -8, size: 14, delay: 0 },
	{ x: 6, size: 18, delay: 0.1 },
	{ x: -2, size: 22, delay: 0.2 },
	{ x: 8, size: 12, delay: 0.3 },
	{ x: -10, size: 16, delay: 0.4 },
]

/** A Steam Vent's grate, and where its clouds rise from: its middle, 8 px up from its bottom. */
export const STEAM_VENT_WIDTH = 44
export const STEAM_VENT_HEIGHT = 12
const RISING_FROM = { x: STEAM_VENT_WIDTH / 2, y: STEAM_VENT_HEIGHT - 8 }

const STEAM_BITS: SteamBit[] = STEAM_CLOUDS.map((cloud) => ({
	x: RISING_FROM.x + cloud.x - cloud.size / 2,
	y: RISING_FROM.y - cloud.size,
	width: cloud.size,
	height: cloud.size,
	colour: 'rgba(245, 245, 245, 0.85)',
	ring: { width: 3, colour: 'rgba(245, 245, 245, 0.4)' },
	delay: cloud.delay,
}))

/** How its steam rises: in 5 steps, over half a second. */
const STEAM_RISE = { seconds: 0.5, steps: 5 }

/**
 * The air always coming up off a Steam Vent, puffed or not: little wisps,
 * one after another, so it reads as something blowing up, to be stood on,
 * not something in the way.
 */
const AIR_WISPS = [
	{ x: -8, size: 8, delay: 0 },
	{ x: 6, size: 10, delay: 0.2 },
	{ x: -2, size: 8, delay: 0.4 },
	{ x: 9, size: 8, delay: 0.6 },
	{ x: -10, size: 10, delay: 0.8 },
	{ x: 2, size: 8, delay: 1 },
]
const AIR_BITS: SteamBit[] = AIR_WISPS.map((wisp) => ({
	x: RISING_FROM.x + wisp.x - wisp.size / 2,
	y: RISING_FROM.y - wisp.size,
	width: wisp.size,
	height: wisp.size,
	colour: 'rgba(245, 245, 245, 0.75)',
	delay: wisp.delay,
}))
/** How its air rises: each wisp in 10 steps, over 1.2 seconds, over and over. */
const AIR_RISE = { seconds: 1.2, steps: 10 }
/** Ticks the air's been going before the race starts: every wisp's on its way already. */
const AIR_LEAD = 72

/** How far a Steam Vent's clouds get out of its box, for its Draw Hook's `drawReach`. */
export const STEAM_VENT_REACH = steamReach(
	STEAM_VENT_WIDTH,
	STEAM_VENT_HEIGHT,
	{ bits: STEAM_BITS, steps: STEAM_RISE.steps },
	{ bits: AIR_BITS, steps: AIR_RISE.steps },
)

/**
 * A Steam Vent: its grate, air always rising off it, and once it's puffed,
 * at `puffed`, steam rising off it in clouds a while, from when it puffed,
 * as they're put on the page then. Its air's `offset` ticks along, so
 * vents side by side don't blow in step.
 */
export function paintSteamVent(
	ctx: CanvasRenderingContext2D,
	image: DrawPainting['image'],
	grate: string,
	now: number,
	puffed: number | undefined,
	offset = 0,
) {
	const loaded = image(grate)
	if (loaded)
		ctx.drawImage(loaded.image, 0, 0, STEAM_VENT_WIDTH, STEAM_VENT_HEIGHT)
	paintSteam(ctx, Math.max(0, now) + AIR_LEAD + offset, AIR_BITS, AIR_RISE)
	if (puffed === undefined || steamPuff(puffed, now) === undefined) return
	paintSteam(ctx, now - puffed, STEAM_BITS, STEAM_RISE)
}

/** How squashed a Bouncy Toadstool is, its height out of 1, `puff` out of 1 through firing someone up. */
function bouncerSquash(puff: number | undefined) {
	if (puff === undefined) return 1
	// Down flat, then up past where it was, and settling.
	return 1 - 0.45 * Math.cos(puff * Math.PI * 3) * (1 - puff)
}

/**
 * A Bouncy Toadstool, `width` by `height`: squashed flat as it fires
 * whoever's on it up, at `puffed`, and wider for it, about its foot.
 */
export function paintBouncer(
	ctx: CanvasRenderingContext2D,
	image: DrawPainting['image'],
	src: string,
	width: number,
	height: number,
	now: number,
	puffed: number | undefined,
) {
	const squash = bouncerSquash(steamPuff(puffed, now))
	ctx.translate(width / 2, height)
	ctx.scale(2 - squash, squash)
	ctx.translate(-width / 2, -height)
	paintPicture(ctx, image, src, 0, 0, width, height)
}

/** How wide a Heart Valve's chevrons are, and how tall. */
const VALVE_ARROWS = 24
const VALVE_ARROWS_HEIGHT = VALVE_ARROWS * (10 / 12)
/** The chevrons' glow, as the valve opens. */
const ARROWS_GLOW = 'drop-shadow(0 0 4px #fff6a8)'
/** How far they leap as it opens, and how far over it they are. */
const ARROWS_LEAP = 16
const ARROWS_OVER = 10

/**
 * How far a Heart Valve's chevrons get up out of its box, leaping and
 * glowing, for the Draw Hook's `drawReach`.
 */
export const VALVE_REACH = {
	top:
		ARROWS_OVER + ARROWS_LEAP + VALVE_ARROWS_HEIGHT + filterReach(ARROWS_GLOW),
}

/**
 * A Heart Valve, flapping open on the beat at `now`, and as it fires
 * someone up, at `flown`, its chevrons over it lighting up as the beat comes
 * round, and leaping, glowing, as it opens.
 */
export function paintValve(
	ctx: CanvasRenderingContext2D,
	image: DrawPainting['image'],
	now: number,
	flown?: number,
) {
	const flapped = valveFlapped(flown, now)
	const beat = flapped ?? beatAt(now)
	const open = flapped !== undefined || valveOpen(now)
	paintPicture(
		ctx,
		image,
		open ? VALVE.open : VALVE.shut,
		0,
		0,
		VALVE.width,
		VALVE.height,
	)
	const loaded = image(VALVE.arrows)
	if (!loaded) return
	const arrows = filtered(
		VALVE.arrows,
		loaded,
		open ? ARROWS_GLOW : undefined,
		VALVE_ARROWS / loaded.width,
	)
	const leap = open
		? Math.round(Math.sin((beat / 24) * Math.PI) * ARROWS_LEAP)
		: 0
	const left = (VALVE.width - VALVE_ARROWS) / 2
	const top = -(ARROWS_OVER + leap + VALVE_ARROWS_HEIGHT)
	ctx.globalAlpha *= open ? 1 : 0.35 + 0.35 * (beat / HEARTBEAT)
	ctx.drawImage(
		arrows.art,
		left - arrows.pad,
		top - arrows.pad,
		VALVE_ARROWS + arrows.pad * 2,
		VALVE_ARROWS_HEIGHT + arrows.pad * 2,
	)
}
