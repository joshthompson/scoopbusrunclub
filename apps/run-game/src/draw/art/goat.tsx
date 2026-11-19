import type { JSX } from 'solid-js'
import { type PixelRect, pixelArt } from '../../courses/kit/pixelArt'
import { PixelArt } from '../PixelArt'
import { inkOutline } from '../paint/picture'
import type { CorgiPose } from './corgi'

/**
 * A mountain goat, Everest's Ride, side on and facing right, in cells twice
 * the size of a screen pixel, as the corgi is: a big, proud animal, bigger
 * than the rest of the Rides. Lying down on the rocks waiting, and the two
 * halves of a leap. Shaggy and white, a long beard and a ruff down its
 * chest, its great black horns sweeping up and back and curling down at
 * the tips, a hump of shoulders, its head held high, and a blanket striped
 * in prayer-flag colours over its back for riding on.
 */

const CELL = 2
const COLUMNS = 34
const ROWS = 34

export const GOAT_WIDTH = COLUMNS * CELL
export const GOAT_HEIGHT = ROWS * CELL
/** How tall it is to its back, stood up: what you land on to ride it. */
export const GOAT_BACK = 38
/** How far above its feet whoever's riding it sits. */
export const GOAT_SADDLE = 36

const COAT = '#f4f1e8'
const LIT = '#fffdf7'
const SHADE = '#cfc8b6'
const SHAG = '#b3ab97'
const HORN = '#2a2a2a'
const HORN_LIT = '#555050'
const HORN_FAR = '#463f3c'
const INK = '#1d1d1d'
const NOSE = '#3b3434'
/** Its blanket: a prayer flag's colours, in stripes, and its brown trim. */
const FLAGS = ['#2d6fd0', '#f3f3f3', '#d8342c', '#2f9b4a', '#f5c518']
const TRIM = '#8a6a3a'

/** `rects` moved `dx` cells over and `dy` down. */
const moved = (rects: PixelRect[], dx: number, dy: number): PixelRect[] =>
	rects.map(([x, y, w, h, c]): PixelRect => [x + dx, y + dy, w, h, c])

/**
 * One of its horns: a thick stroke, two cells wide, up from its brow, back
 * and over in an arc, and down in a curl at the tip, lit along its top and
 * ringed with growth rings. `points` are where each cell of it goes.
 */
const HORN_PATH: [number, number][] = [
	[11, 8],
	[10, 7],
	[10, 6],
	[9, 5],
	[8, 4],
	[7, 3],
	[5, 2],
	[3, 2],
	[2, 3],
	[1, 4],
	[1, 6],
	[2, 7],
]
const horn = (colour: string, lit: string, dx: number, dy: number) =>
	HORN_PATH.flatMap(([x, y], i): PixelRect[] => [
		[x + dx, y + dy, 2, 2, colour],
		[x + dx, y + dy, 2, 1, lit],
		// A ring round it every third step.
		...(i % 3 === 1
			? ([[x + dx + 1, y + dy + 1, 1, 1, INK]] as PixelRect[])
			: []),
	])

/** Its head, held high, with its horns, beard and ruff; `down` cells lower than stood up, from where the neck starts. */
const head = (down: number): PixelRect[] =>
	moved(
		[
			// Its far horn, a step behind the near one.
			...horn(HORN_FAR, HORN_FAR, 2, -1),
			// Its near horn, in front of it.
			...horn(HORN, HORN_LIT, 0, 0),
			// Its ear, flat back from under the horns.
			[7, 9, 4, 2, SHADE],
			[5, 10, 3, 1, SHAG],
			// Its skull and long face, to a squared nose.
			[11, 8, 6, 3, COAT],
			[12, 10, 8, 4, COAT],
			[17, 12, 3, 3, COAT],
			[11, 8, 5, 1, LIT],
			// A shade under its jaw, and its muzzle and nose.
			[13, 13, 5, 1, SHADE],
			[17, 14, 3, 1, SHADE],
			[19, 12, 1, 2, NOSE],
			// Its eye.
			[15, 10, 1, 1, INK],
			// Its beard, long and shaggy, hanging from its chin.
			[16, 15, 4, 2, COAT],
			[16, 17, 3, 2, SHAG],
			[17, 19, 2, 1, SHAG],
			[15, 16, 1, 2, SHADE],
			// Its neck, thick, with a ruff of shag down the front of it.
			[5, 10, 8, 9, COAT],
			[4, 12, 2, 5, COAT],
			[13, 14, 3, 5, COAT],
			[12, 17, 2, 2, SHAG],
			[8, 15, 4, 2, SHADE],
			[14, 18, 1, 1, SHAG],
		],
		14,
		down,
	)

/**
 * Its body, `down` cells lower than stood up: a great hump at its
 * shoulders, a stub of a tail, its coat hanging in long shag underneath,
 * and the blanket on its back.
 */
const body = (down: number): PixelRect[] =>
	moved(
		[
			// Its back and flanks, rising to a hump over the shoulders.
			[5, 13, 21, 8, COAT],
			[5, 12, 7, 1, COAT],
			[17, 11, 9, 2, COAT],
			[19, 10, 5, 1, COAT],
			[19, 10, 5, 1, LIT],
			[5, 12, 7, 1, LIT],
			[17, 11, 9, 1, LIT],
			// Its tail, a stub, cocked up.
			[3, 12, 2, 3, COAT],
			[2, 11, 1, 2, SHADE],
			// Shade down its flank and under its belly, and its shag hanging long.
			[6, 19, 19, 1, SHADE],
			[5, 20, 20, 1, SHAG],
			[6, 21, 2, 1, SHAG],
			[10, 21, 3, 1, SHAG],
			[15, 21, 2, 1, SHAG],
			[19, 21, 3, 1, SHAG],
			[7, 22, 1, 1, SHAG],
			[11, 22, 1, 1, SHAG],
			[20, 22, 1, 1, SHAG],
			// The blanket, in stripes.
			...FLAGS.map((colour, i): PixelRect => [9 + i * 2, 12, 2, 5, colour]),
			[9, 17, 10, 1, TRIM],
			[9, 18, 1, 1, FLAGS[4]],
			[12, 18, 1, 1, FLAGS[2]],
			[15, 18, 1, 1, FLAGS[3]],
			[18, 18, 1, 1, FLAGS[0]],
		],
		0,
		down,
	)

/** A leg, 2 cells wide, from `x` at the body down `length` to a black hoof, leaning `lean` cells over it: shaded at the top, shag at the knee. */
const leg = (
	x: number,
	top: number,
	length: number,
	lean: number,
): PixelRect[] => {
	const cells: PixelRect[] = []
	for (let i = 0; i < length; i++) {
		const at = x + Math.round((lean * i) / length)
		cells.push([at, top + i, 2, 1, i < 2 ? SHADE : i < 4 ? SHAG : COAT])
	}
	const foot = cells[cells.length - 1]
	cells.push([foot[0], foot[1], 2, 1, INK])
	return cells
}

/** Lying down, legs folded under it, head held high, chewing, waiting. */
const SIT = pixelArt(COLUMNS, ROWS, [
	...moved(head(0), 0, 10),
	...body(11),
	// Its forelegs folded out in front of it, hooves at the ends, and its hind leg's hock.
	[21, 30, 9, 2, COAT],
	[21, 30, 9, 1, SHADE],
	[28, 31, 2, 1, INK],
	[6, 30, 6, 2, SHAG],
	[8, 32, 3, 1, SHAG],
	[24, 33, 6, 1, SHAG],
])

/** Gathered, mid-leap: its legs bunched under it. */
const CROUCH = pixelArt(COLUMNS, ROWS, [
	...head(0),
	...body(4),
	...leg(6, 24, 9, 3),
	...leg(10, 24, 9, 1),
	...leg(19, 24, 9, -1),
	...leg(23, 24, 9, -3),
])

/** Stretched out, mid-leap: its forelegs tucked, ready to land, its hind legs pushing off. */
const LEAP = pixelArt(COLUMNS, ROWS, [
	...head(0),
	...body(3),
	...leg(4, 24, 9, -7),
	...leg(8, 24, 9, -5),
	...leg(21, 23, 8, 5),
	...leg(24, 23, 8, 7),
])

const ART: Record<CorgiPose, string> = { sit: SIT, crouch: CROUCH, leap: LEAP }

/** An ink outline round it, as the corgi has, so it stands out against the snow. */
export const GOAT_OUTLINE = inkOutline('#2b2b2b')
const OUTLINE: JSX.CSSProperties = { filter: GOAT_OUTLINE.filter }

/** Its picture in `pose`, for a Draw Hook to paint, outlined. */
export const goatPicture = (pose: CorgiPose) => ART[pose]

export function GoatArt(props: { pose: CorgiPose }) {
	return (
		<div style={OUTLINE}>
			<PixelArt src={ART[props.pose]} width={GOAT_WIDTH} height={GOAT_HEIGHT} />
		</div>
	)
}
