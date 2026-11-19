import { type PixelRect, pixelArt } from '../../courses/kit/pixelArt'
import { PixelArt } from '../PixelArt'

/**
 * Scoop Cruises' lifeboat, the one you can ride (see `SecretLifeboat`),
 * side on, its bow to the right, in cells twice the size of a screen
 * pixel: open, an orange hull with a white rubbing strake round its top,
 * a grab line looped along its side, and an outboard motor on its stern.
 * It sits in the water, the foam along its waterline in front of it, and
 * whoever's in it sits down inside it, the hull over their legs.
 *
 * And the water trick ramp at the end of its ride: up it, the boat's thrown.
 */

const CELL = 2
const COLUMNS = 48
const ROWS = 16

export const LIFEBOAT_RIDE_WIDTH = COLUMNS * CELL
export const LIFEBOAT_RIDE_HEIGHT = ROWS * CELL
/** How far its picture goes down under its waterline: to the foam's bottom. */
export const LIFEBOAT_DRAUGHT = 3 * CELL
/** How far up from its waterline whoever's in it sits: their feet on its floor, 12 down from its gunwale. */
export const LIFEBOAT_SEAT = 10

const HULL = '#f26a1b'
const HULL_LIT = '#ff9a55'
const HULL_SHADE = '#d1530f'
const HULL_DARK = '#a8400b'
const STRAKE = '#f3f4f1'
const STRAKE_SHADE = '#c9ced0'
const ROPE = '#e8dcc0'
const MOTOR = '#3a4047'
const MOTOR_LIT = '#6a7178'
const FOAM = '#eef7fb'
const FOAM_SHADE = '#b9dcec'

const BOAT: PixelRect[] = [
	// The outboard motor, on its stern, its leg down into the water.
	[0, 1, 4, 5, MOTOR],
	[0, 1, 4, 1, MOTOR_LIT],
	[1, 6, 2, 8, MOTOR],
	// Its rubbing strake, white, round its top, its bow rising to the right.
	[3, 3, 38, 2, STRAKE],
	[40, 2, 4, 2, STRAKE],
	[43, 1, 3, 2, STRAKE],
	[3, 4, 38, 1, STRAKE_SHADE],
	// Its hull, orange, its bow raked back to its keel.
	[3, 5, 40, 2, HULL],
	[42, 3, 3, 4, HULL],
	[3, 7, 39, 2, HULL],
	[4, 9, 36, 2, HULL],
	[5, 11, 33, 2, HULL],
	// Lit along under the strake; in shadow low down, towards its keel.
	[3, 5, 40, 1, HULL_LIT],
	[44, 2, 1, 4, HULL_LIT],
	[4, 10, 36, 1, HULL_SHADE],
	[5, 12, 33, 1, HULL_DARK],
	// Its grab line, looped along its side.
	...[7, 14, 21, 28, 35].flatMap((x): PixelRect[] => [
		[x, 6, 1, 2, ROPE],
		[x + 1, 8, 4, 1, ROPE],
		[x + 5, 6, 1, 2, ROPE],
	]),
]

/** Foam along its waterline, in front of its keel: only on the water, not hopping. */
const FOAM_RECTS: PixelRect[] = [
	[2, 13, 44, 1, FOAM],
	[0, 14, 6, 1, FOAM],
	[8, 14, 10, 1, FOAM_SHADE],
	[22, 14, 14, 1, FOAM_SHADE],
	[40, 14, 8, 1, FOAM],
	[4, 15, 4, 1, FOAM_SHADE],
	[30, 15, 6, 1, FOAM_SHADE],
]

const BOAT_ART = pixelArt(COLUMNS, ROWS, [...BOAT, ...FOAM_RECTS])
const BOAT_IN_AIR = pixelArt(COLUMNS, ROWS, BOAT)

/** The lifeboat's picture, for a Draw Hook to paint: on the water, foam along it, or not. */
export const lifeboatPicture = (onWater = true) =>
	onWater ? BOAT_ART : BOAT_IN_AIR

export function LifeboatArt() {
	return (
		<PixelArt
			src={BOAT_ART}
			width={LIFEBOAT_RIDE_WIDTH}
			height={LIFEBOAT_RIDE_HEIGHT}
		/>
	)
}

/** The water trick ramp: how big its picture is, where its toe and water line are, and the incline's run and rise. */
const RAMP_COLUMNS = 104
const RAMP_ROWS = 32
/** The column its toe starts at, and the row the sea's surface is at. */
const TOE = 4
const WATER_ROW = 22
const RUN = 75
const RISE = 23
export const RAMP_WIDTH = RAMP_COLUMNS * CELL
export const RAMP_TALL = RAMP_ROWS * CELL
/** From its picture's left to its lip, where the boat leaves it. */
export const RAMP_LIP = (TOE + RUN) * CELL
/** From its picture's top down to the water line. */
export const RAMP_WATER = WATER_ROW * CELL
export const RAMP_RUN = RUN * CELL
export const RAMP_RISE = RISE * CELL

const DECK = '#f1dfa0'
const DECK_LIT = '#fff7d4'
const DECK_SHADE = '#d4b866'
const PANEL = '#ffc61a'
const PANEL_LIT = '#ffe066'
const PANEL_SHADE = '#d99a0c'
const PANEL_DARK = '#a97508'
const STRIPE = '#2a6fd0'
const FRAME = '#6b7480'
const FRAME_SHADE = '#4a525c'
const FLOAT = '#2f7be0'
const FLOAT_LIT = '#6aa8f4'
const FLOAT_BAND = '#f3f4f1'
const FLOAT_UNDER = '#23508f'
const LINE = '#e8dcc0'
const BUOY = '#f26a1b'

/** The row of its riding surface at a column in from its toe: a straight incline, `RISE` up over `RUN`. */
const surface = (x: number) => WATER_ROW + 3 - Math.round((RISE * x) / RUN)

const RAMP: PixelRect[] = (() => {
	const out: PixelRect[] = []
	const water = WATER_ROW
	const edge = (x: number) => Math.min(surface(x) + 8, water + 3)
	// Its frame first, behind: struts down from under its side panel to the floats.
	for (const x of [38, 50, 62, 72]) {
		const c = TOE + x
		out.push([c, surface(x) + 8, 2, water - surface(x) - 6, FRAME])
		out.push([c + 1, surface(x) + 8, 1, water - surface(x) - 6, FRAME_SHADE])
	}
	// Its back, past the lip, dropping to the water: a plain shaded wall.
	out.push([TOE + RUN, surface(RUN), 4, water - surface(RUN) + 1, PANEL_SHADE])
	out.push([
		TOE + RUN + 2,
		surface(RUN),
		2,
		water - surface(RUN) + 1,
		PANEL_DARK,
	])
	// Its pontoon floats: a long blue one under its middle, a shorter one behind, each banded.
	const pontoon = (x0: number, x1: number) => {
		const w = x1 - x0
		out.push([x0 + 1, water - 5, w - 2, 1, FLOAT_LIT])
		out.push([x0, water - 4, w, 4, FLOAT])
		out.push([x0 + 1, water, w - 2, 1, FLOAT])
		out.push([x0, water + 1, w, 3, FLOAT_UNDER])
		out.push([x0 + 1, water + 4, w - 2, 1, FLOAT_UNDER])
		for (let x = x0 + 4; x < x1 - 3; x += 8) {
			out.push([x, water - 4, 2, 5, FLOAT_BAND])
			out.push([x, water + 1, 2, 3, FLOAT_UNDER])
		}
	}
	pontoon(TOE + 32, TOE + 56)
	pontoon(TOE + 58, TOE + 84)
	// Its deck, in plastic, and under it its thick coloured side panel.
	for (let x = 0; x <= RUN; x++) {
		const c = TOE + x
		const s = surface(x)
		out.push([c, s, 1, 3, DECK])
		out.push([c, s, 1, 1, DECK_LIT])
		out.push([c, s + 2, 1, 1, DECK_SHADE])
		// Grip ribs across its deck.
		if (x % 5 === 2 && x > 6) out.push([c, s + 1, 1, 1, DECK_SHADE])
		const bottom = Math.min(edge(x), water + 2)
		const top = s + 3
		if (bottom > top) {
			out.push([c, top, 1, bottom - top, PANEL])
			out.push([c, top, 1, 1, PANEL_LIT])
			out.push([c, bottom - 1, 1, 1, PANEL_SHADE])
			// Bold blue chevron stripes across the panel.
			for (let y = top + 1; y < bottom - 1; y++)
				if ((x + y) % 10 < 3) out.push([c, y, 1, 1, STRIPE])
		}
	}
	// A wet sheen streak along its deck, broken up.
	for (let x = 6; x < RUN - 2; x++)
		if (x % 14 < 9) out.push([TOE + x, surface(x) + 1, 1, 1, DECK_LIT])
	// Its lip, a little thicker, its end rounded.
	out.push([TOE + RUN, surface(RUN), 1, 3, DECK_SHADE])
	// Foam where it dips in at the toe and along the floats' waterline.
	out.push([0, water + 1, TOE + 14, 1, FOAM])
	out.push([2, water + 2, TOE + 10, 1, FOAM_SHADE])
	out.push([TOE + 4, water - 1, 8, 1, FOAM])
	out.push([TOE + 12, water - 2, 4, 1, FOAM])
	out.push([TOE + 30, water, TOE + 58, 1, FOAM])
	out.push([TOE + 32, water + 5, 20, 1, FOAM_SHADE])
	out.push([TOE + 60, water + 5, 20, 1, FOAM_SHADE])
	// Its tow line, off the back, sagging along the water to a little buoy.
	out.push([TOE + 84, water - 3, 4, 1, LINE])
	out.push([TOE + 88, water - 2, 4, 1, LINE])
	out.push([TOE + 92, water - 1, 6, 1, LINE])
	out.push([TOE + 98, water - 2, 1, 1, LINE])
	out.push([TOE + 96, water - 1, 4, 3, BUOY])
	out.push([TOE + 96, water - 1, 4, 1, FOAM])
	return out
})()

/** A plastic water trick ramp, the sort you'd ski off: a pale deck with a wet sheen and grip ribs, up a straight incline from its toe (dipping in the sea in a froth) to its lip; a thick yellow side panel striped blue under it; its frame down to two blue banded pontoons, floating half under; and a tow line off its back. The boat's ridden up it and thrown off its lip. */
export const rampPicture = pixelArt(RAMP_COLUMNS, RAMP_ROWS, RAMP)
