import type { JSX } from 'solid-js'
import { type PixelRect, pixelArt } from '../../courses/kit/pixelArt'
import { PixelArt } from '../PixelArt'
import type { CorgiPose } from './corgi'

/**
 * A mountain goat, Everest's Ride, side on and facing right, in cells twice
 * the size of a screen pixel, as the corgi is: lying down on the rocks
 * waiting, and the two halves of a leap. Shaggy and white, its horns black,
 * curving back, a beard under its chin, a hump of shoulders, and a blanket
 * striped in prayer-flag colours over its back for riding on.
 */

const CELL = 2
const COLUMNS = 26
const ROWS = 24

export const GOAT_WIDTH = COLUMNS * CELL
export const GOAT_HEIGHT = ROWS * CELL
/** How tall it is to its back, stood up: what you land on to ride it. */
export const GOAT_BACK = 28
/** How far above its feet whoever's riding it sits. */
export const GOAT_SADDLE = 26

const COAT = '#f4f1e8'
const SHADE = '#cfc8b6'
const SHAG = '#b3ab97'
const HORN = '#2a2a2a'
const INK = '#1d1d1d'
const NOSE = '#3b3434'
/** Its blanket: a prayer flag's colours, in stripes. */
const FLAGS = ['#2d6fd0', '#f3f3f3', '#d8342c', '#2f9b4a', '#f5c518']

/** Its head, beard and horns, `down` cells lower than stood up. */
const head = (down: number): PixelRect[] =>
	(
		[
			// Its horns, black, curving back from its brow: the far one a
			// step behind the near one.
			[20, 1, 1, 1, '#4a4a4a'],
			[19, 2, 1, 1, '#4a4a4a'],
			[20, 0, 1, 1, HORN],
			[19, 1, 1, 1, HORN],
			[18, 2, 1, 1, HORN],
			[18, 3, 1, 1, HORN],
			// Its head, long, and its ear back.
			[18, 4, 5, 3, COAT],
			[22, 5, 3, 3, COAT],
			[17, 4, 1, 2, SHADE],
			[16, 5, 2, 1, SHADE],
			[20, 5, 1, 1, INK],
			[24, 7, 1, 1, NOSE],
			// Its beard, hanging under its chin.
			[21, 8, 3, 2, COAT],
			[22, 10, 2, 1, SHAG],
			// Its neck, thick, down to its shoulders.
			[16, 6, 5, 5, COAT],
			[19, 9, 2, 2, SHADE],
		] as PixelRect[]
	).map(([x, y, w, h, c]): PixelRect => [x, y + down, w, h, c])

/** Its body, `down` cells lower than stood up: a hump at its shoulders, its shaggy underside, a stub of a tail, and the blanket. */
const body = (down: number): PixelRect[] =>
	(
		[
			[4, 10, 15, 5, COAT],
			[14, 9, 5, 2, COAT],
			[3, 9, 2, 2, COAT],
			[2, 8, 2, 2, COAT],
			// Its shag, hanging long under it.
			[5, 15, 13, 1, SHAG],
			[5, 14, 13, 1, SHADE],
			[6, 16, 1, 1, SHAG],
			[9, 16, 1, 1, SHAG],
			[12, 16, 1, 1, SHAG],
			[15, 16, 1, 1, SHAG],
			// The blanket, in stripes.
			...FLAGS.map((colour, i): PixelRect => [7 + i, 9, 1, 4, colour]),
			[7, 13, 5, 1, '#8a6a3a'],
		] as PixelRect[]
	).map(([x, y, w, h, c]): PixelRect => [x, y + down, w, h, c])

/** A leg, from `x` at the body down `length` to a black hoof, leaning `lean` cells over it: shaded at the top. */
const leg = (
	x: number,
	top: number,
	length: number,
	lean: number,
): PixelRect[] => {
	const cells: PixelRect[] = []
	for (let i = 0; i < length; i++)
		cells.push([
			x + Math.round((lean * i) / length),
			top + i,
			1,
			1,
			i < 2 ? SHADE : COAT,
		])
	const foot = cells[cells.length - 1]
	cells.push([foot[0], foot[1], 1, 1, INK])
	return cells
}

/** Lying down, legs folded under it, head up, chewing, waiting. */
const SIT = pixelArt(COLUMNS, ROWS, [
	...head(7),
	...body(8),
	[5, 22, 13, 1, SHAG],
	[15, 21, 3, 1, INK],
])

/** Gathered, mid-leap: its legs bunched under it. */
const CROUCH = pixelArt(COLUMNS, ROWS, [
	...head(0),
	...body(1),
	...leg(5, 17, 6, 2),
	...leg(8, 17, 6, 1),
	...leg(15, 17, 6, -1),
	...leg(17, 17, 6, -2),
])

/** Stretched out, mid-leap: its forelegs tucked, ready to land, its hind legs pushing off. */
const LEAP = pixelArt(COLUMNS, ROWS, [
	...head(0),
	...body(0),
	...leg(4, 16, 6, -4),
	...leg(6, 16, 6, -3),
	...leg(16, 16, 5, 3),
	...leg(18, 16, 5, 4),
])

const ART: Record<CorgiPose, string> = { sit: SIT, crouch: CROUCH, leap: LEAP }

/** An ink outline round it, as the corgi has, so it stands out against the snow. */
const OUTLINE: JSX.CSSProperties = {
	filter: [
		'drop-shadow(2px 0 0 #2b2b2b)',
		'drop-shadow(-2px 0 0 #2b2b2b)',
		'drop-shadow(0 2px 0 #2b2b2b)',
		'drop-shadow(0 -2px 0 #2b2b2b)',
	].join(' '),
}

export function GoatArt(props: { pose: CorgiPose }) {
	return (
		<div style={OUTLINE}>
			<PixelArt src={ART[props.pose]} width={GOAT_WIDTH} height={GOAT_HEIGHT} />
		</div>
	)
}
