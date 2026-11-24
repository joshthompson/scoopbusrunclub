import { createController, createObjectSignal } from 'scoopjs'
import type { JSX } from 'solid-js'
import { glyphRows } from '../courses/kit/pixelArt'
import {
	RAIL_POST,
	RAIL_RED,
	RAIL_RED_LIT,
	RAIL_RED_SHADE,
	SKATE_ART_HEIGHT,
	SKATE_ART_WIDTH,
	SKATE_BEHIND,
	SKATE_RAMP,
} from '../courses/kit/skateJamScenery'
import { RUNNER_SCALE, VIEW_HEIGHT, VIEW_WIDTH } from '../game/constants'
import type { World } from '../game/world'
import {
	COMBO_TICKS,
	type Skater,
	pointsSaid,
	skateOf,
} from '../minigames/skateJam'
import {
	RAIL_FROM,
	RAIL_TO,
	RAIL_Y,
	RAMP_LEFT,
	rampSlope,
	rampY,
} from '../minigames/skateRamp'
import { paintPicture } from './paint/picture'

/** A pixel, as everything's drawn: 2 px. */
const CELL = 2
/** How tall someone stands on their board: their combo's said over that. */
const TALL = 29 * RUNNER_SCALE
/** How far over their head their combo's said: over their name tag. */
const COMBO_UP = 40
/** Sparks off the rail: how many at once, and how long each flies. */
const SPARKS = 7
const SPARK_TICKS = 12
const SPARK = ['#fff3a0', '#ffd23f', '#ff9a3a']
/** Lettering over heads: its ink outline, the combo's points, its times, and a white bar for how long it's got. */
const INK = '#2b2433'
const POINTS = '#ffd23f'
const TIMES = '#ff6fae'
const BAR = '#fbf8f2'

/** Letters the pixel font hasn't got: 5 cells by 7, `#` lit. */
const EXTRA_GLYPHS: Record<string, string[]> = {
	'+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
	'×': ['.....', '.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
	',': ['.....', '.....', '.....', '.....', '.....', '..#..', '.#...'],
}

/**
 * Skate Jam, drawn. Behind it all, the park: the town and Globen against
 * the sunset, the graffiti wall, the floodlights. Then the ramp and its
 * rail. In front: sparks off the rail, and over each skater's head their
 * combo going, and how long it's got. Nothing, if the world's not a game
 * of it.
 */
export function createSkateJam(world: World) {
	const show = skateOf(world)
	if (!show) return []
	/** One picture over the whole screen: `type` says what it's in front of. */
	const layer = (
		id: string,
		type: string,
		paint: (
			ctx: CanvasRenderingContext2D,
			image: Parameters<typeof paintPicture>[1],
			now: number,
		) => void,
	) =>
		createController({
			init: () => ({
				id,
				type,
				...createObjectSignal(RAMP_LEFT, 'x'),
				...createObjectSignal(0, 'y'),
				...createObjectSignal({} as JSX.CSSProperties, 'style'),
				width: () => VIEW_WIDTH,
				height: () => VIEW_HEIGHT,
			}),
			draw({ ctx, image }) {
				// Read the tick, so it's painted again every one.
				paint(ctx, image, world.ticks())
			},
		})
	const across = (x: number) => Math.round(x - RAMP_LEFT)

	const park = layer('skate-park', 'scenery', (ctx, image) => {
		paintPicture(
			ctx,
			image,
			SKATE_BEHIND,
			0,
			0,
			SKATE_ART_WIDTH,
			SKATE_ART_HEIGHT,
		)
	})

	const ramp = layer('skate-ramp', 'platform', (ctx, image, now) => {
		paintPicture(
			ctx,
			image,
			SKATE_RAMP,
			0,
			0,
			SKATE_ART_WIDTH,
			SKATE_ART_HEIGHT,
		)
		paintRail(ctx, across(RAIL_FROM), across(RAIL_TO), RAIL_Y, rampY(RAIL_FROM))
	})

	const over = layer('skate-over', 'furby', (ctx, image, now) => {
		for (const s of show.skaters.values()) {
			if (s.grind !== undefined) paintSparks(ctx, across(s.x), RAIL_Y, s, now)
		}
		for (const s of show.skaters.values()) {
			paintCombo(ctx, image, across(s.x), s, now)
			if (s.manual) paintBalance(ctx, across(s.x), s)
		}
	})

	return [park, ramp, over]
}

/** The grind rail along the flat, from `left` to `right`, its top at `top`, on two posts down to `floor`. */
function paintRail(
	ctx: CanvasRenderingContext2D,
	left: number,
	right: number,
	top: number,
	floor: number,
) {
	ctx.fillStyle = RAIL_POST
	for (const x of [left + 10, right - 14])
		ctx.fillRect(x, top, CELL * 2, floor - top)
	// Its feet, flat on the ramp.
	for (const x of [left + 6, right - 18])
		ctx.fillRect(x, floor - CELL, CELL * 6, CELL)
	ctx.fillStyle = RAIL_RED
	ctx.fillRect(left, top, right - left, CELL * 3)
	ctx.fillStyle = RAIL_RED_LIT
	ctx.fillRect(left, top, right - left, CELL)
	ctx.fillStyle = RAIL_RED_SHADE
	ctx.fillRect(left, top + CELL * 2, right - left, CELL)
	// Its ends, capped.
	ctx.fillRect(left, top, CELL, CELL * 3)
	ctx.fillRect(right - CELL, top, CELL, CELL * 3)
}

/** Sparks flying off the rail back the way `s` came, as they grind it. */
function paintSparks(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	s: Skater,
	now: number,
) {
	const back = s.v > 0 ? -1 : 1
	for (let i = 0; i < SPARKS; i++) {
		const t = (now + i * 5) % SPARK_TICKS
		const out = 1.4 + ((i * 7) % 5) * 0.5
		const sx = x + back * t * out
		const sy = y - t * (1.2 + (i % 3) * 0.4) + t * t * 0.18
		ctx.fillStyle = SPARK[(i + Math.floor(t / 4)) % SPARK.length]
		ctx.fillRect(Math.round(sx) & ~1, Math.round(sy) & ~1, CELL, CELL)
	}
}

/** A manual's balance meter: how tall, how far out to the side of them, and its needle's colours, steady to all but over. */
const METER_TALL = 40
const METER_OUT = 18
const STEADY = '#7ee07a'
const WOBBLY = '#ffd23f'
const TIPPING = '#ff5a4e'

/**
 * Beside `s`, in a manual: its balance, a meter up and down, a line
 * across its middle and the needle where they are on it, going from green
 * to red as it tips towards either end, where they're over.
 */
function paintBalance(ctx: CanvasRenderingContext2D, x: number, s: Skater) {
	const m = s.manual
	if (!m) return
	const left = Math.round((x + METER_OUT) / CELL) * CELL
	const top = Math.round((s.y - TALL + 4) / CELL) * CELL
	ctx.fillStyle = INK
	ctx.fillRect(left - CELL, top - CELL, CELL * 5, METER_TALL + CELL * 2)
	ctx.fillStyle = '#4a4356'
	ctx.fillRect(left + CELL, top, CELL, METER_TALL)
	// Its middle: level.
	ctx.fillStyle = BAR
	ctx.fillRect(left, top + METER_TALL / 2 - CELL / 2, CELL * 3, CELL)
	const off = Math.min(1, Math.abs(m.balance))
	const half = METER_TALL / 2 - CELL * 2
	const needle =
		Math.round((top + METER_TALL / 2 - m.balance * half) / CELL) * CELL - CELL
	ctx.fillStyle = off < 0.5 ? STEADY : off < 0.8 ? WOBBLY : TIPPING
	ctx.fillRect(left - CELL, needle, CELL * 5, CELL * 2)
}

/** Pixel lettering on a canvas, `cell` px a cell, its top left at `x`, `y`, outlined in ink. */
function paintText(
	ctx: CanvasRenderingContext2D,
	text: string,
	x: number,
	y: number,
	fill: string,
) {
	const chars = [...text]
	const paint = (colour: string, ox: number, oy: number) => {
		ctx.fillStyle = colour
		chars.forEach((char, i) => {
			const rows = EXTRA_GLYPHS[char] ?? glyphRows(char)
			rows.forEach((row, r) => {
				for (let c = 0; c < row.length; c++)
					if (row[c] === '#')
						ctx.fillRect(
							x + (i * 6 + c) * CELL + ox,
							y + r * CELL + oy,
							CELL,
							CELL,
						)
			})
		})
	}
	for (const [ox, oy] of [
		[-CELL, 0],
		[CELL, 0],
		[0, -CELL],
		[0, CELL],
		[CELL, CELL],
	])
		paint(INK, ox, oy)
	paint(fill, 0, 0)
}
const textWidth = (text: string) => ([...text].length * 6 - 1) * CELL

/**
 * Over `s`'s head: their combo going, its points and how many times
 * over, and a bar for how long it's got, once they're down.
 */
function paintCombo(
	ctx: CanvasRenderingContext2D,
	image: Parameters<typeof paintPicture>[1],
	x: number,
	s: Skater,
	now: number,
) {
	const head = Math.round(s.y - TALL - COMBO_UP)
	if (s.pot <= 0) return
	const points = pointsSaid(s.pot)
	const times = s.combo > 1 ? ` ×${s.combo}` : ''
	const width = textWidth(points + times)
	const left = Math.round((x - width / 2) / CELL) * CELL
	paintText(ctx, points, left, head, POINTS)
	if (times)
		paintText(ctx, times, left + [...points].length * 6 * CELL, head, TIMES)
	// How long it's got, down on the ramp.
	if (!s.air && s.grind === undefined) {
		const share = Math.max(0, 1 - (now - s.landedAt) / COMBO_TICKS)
		const full = Math.max(width, 24)
		ctx.fillStyle = INK
		ctx.fillRect(left - CELL, head + 16, full + CELL * 2, CELL * 3)
		ctx.fillStyle = BAR
		ctx.fillRect(
			left,
			head + 18,
			Math.round((full * share) / CELL) * CELL,
			CELL,
		)
	}
}
