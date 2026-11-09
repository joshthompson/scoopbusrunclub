import type { JSX } from 'solid-js'
import { Pixels } from './Pixels'

/**
 * A corgi, saddled for riding, side on and facing right, in cells twice the
 * size of a screen pixel, the same as the runners: sat, and the two halves of
 * a gallop, gathered up and stretched out.
 */
export type CorgiPose = 'sit' | 'crouch' | 'leap'

const CELL = 2
/** The art's size, in cells. */
const COLUMNS = 22
const ROWS = 15

/** Its size on the screen. */
export const CORGI_WIDTH = COLUMNS * CELL
export const CORGI_HEIGHT = ROWS * CELL
/** How tall it is to the top of its head, not counting its ears: what you land on to ride it. */
export const CORGI_HEAD = 24

const FUR = '#e8892c'
const FUR_DARK = '#b5601b'
const CREAM = '#fff4e3'
const CREAM_DARK = '#e6d3bb'
const INK = '#0f1f29'
const PINK = '#ff7fa8'
const LEATHER = '#7a4222'
const LEATHER_DARK = '#4a2612'
const CLOTH = '#e0382f'
const TRIM = '#ffd23f'

type Cells = [number, number, number, number, string][]

/** Its head, ears up, with its nose at `x` + 9 and its chin at `y` + 8. */
const head = (x: number, y: number, tongue: boolean): Cells => [
	// Ears, the far one darker
	[x, y, 2, 4, FUR_DARK],
	[x + 3, y, 3, 4, FUR],
	[x + 4, y + 1, 1, 3, PINK],
	[x, y + 3, 7, 5, FUR],
	// The white stripe up its face, its muzzle and its nose
	[x + 5, y + 3, 1, 2, CREAM],
	[x + 4, y + 5, 1, 1, INK],
	[x + 5, y + 6, 4, 2, CREAM],
	[x + 8, y + 6, 1, 1, INK],
	...(tongue ? ([[x + 6, y + 8, 1, 2, PINK]] as Cells) : []),
]

/**
 * A saddle, for riding it: a red cloth with a gold edge over its back, the
 * seat on that, raised at either end, and a strap round under its belly.
 * `x` is the cloth's back end and `y` the top of its back.
 */
const saddle = (x: number, y: number): Cells => [
	[x, y - 1, 7, 3, CLOTH],
	[x, y + 2, 7, 1, TRIM],
	[x + 3, y + 2, 1, 3, LEATHER_DARK],
	[x + 1, y - 2, 5, 1, LEATHER],
	[x + 1, y - 3, 1, 1, LEATHER_DARK],
	[x + 5, y - 3, 1, 1, LEATHER_DARK],
]

/** Long and low, on its feet, with its head at the front: crouched, it's `drop` cells lower. */
const body = (drop: number, legs: Cells): Cells => [
	// Its fluffy back end, then the rest of it
	[1, 7 + drop, 2, 4, FUR],
	[1, 9 + drop, 2, 2, CREAM],
	[2, 7 + drop, 13, 5, FUR],
	[3, 7 + drop, 11, 1, FUR_DARK],
	[4, 11 + drop, 10, 1, CREAM],
	// Its chest
	[14, 8 + drop, 5, 4, CREAM],
	...legs,
	...saddle(5, 7 + drop),
	...head(13, drop, drop === 0),
]

const POSES: Record<CorgiPose, Cells> = {
	sit: [
		// Sat up, front legs straight, back end down
		[4, 10, 4, 4, FUR],
		[3, 14, 5, 1, CREAM],
		[6, 8, 7, 5, FUR],
		[6, 8, 6, 1, FUR_DARK],
		[12, 8, 6, 5, CREAM],
		[13, 12, 2, 3, CREAM],
		[16, 12, 2, 3, CREAM_DARK],
		...saddle(5, 8),
		...head(12, 0, true),
	],
	crouch: body(2, [
		[3, 14, 3, 1, FUR_DARK],
		[6, 14, 2, 1, FUR],
		[14, 14, 3, 1, CREAM],
		[17, 14, 2, 1, CREAM_DARK],
	]),
	leap: body(0, [
		// Back legs out behind, front legs reaching
		[0, 11, 3, 2, FUR],
		[0, 13, 2, 1, CREAM],
		[18, 11, 3, 2, CREAM],
		[20, 12, 2, 1, CREAM_DARK],
	]),
}

const scaled = (cells: Cells): Cells =>
	cells.map(([x, y, w, h, colour]) => [
		x * CELL,
		y * CELL,
		w * CELL,
		h * CELL,
		colour,
	])

const ART = {
	sit: scaled(POSES.sit),
	crouch: scaled(POSES.crouch),
	leap: scaled(POSES.leap),
}

/** An ink outline round it, so it stands out against Furby Fields. */
const OUTLINE: JSX.CSSProperties = {
	filter: [
		'drop-shadow(2px 0 0 #0f1f29)',
		'drop-shadow(-2px 0 0 #0f1f29)',
		'drop-shadow(0 2px 0 #0f1f29)',
		'drop-shadow(0 -2px 0 #0f1f29)',
	].join(' '),
}

export function CorgiArt(props: { pose: CorgiPose }) {
	return (
		<div style={OUTLINE}>
			<Pixels
				width={CORGI_WIDTH}
				height={CORGI_HEIGHT}
				rects={ART[props.pose]}
			/>
		</div>
	)
}
