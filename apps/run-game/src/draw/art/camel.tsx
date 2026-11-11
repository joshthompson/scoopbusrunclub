import type { JSX } from 'solid-js'
import crouch from '../../assets/rides/camel-crouch.png'
import leap from '../../assets/rides/camel-leap.png'
import sit from '../../assets/rides/camel-sit.png'
import { type PixelRect, pixelArt } from '../../courses/kit/pixelArt'
import { PixelArt } from '../PixelArt'
import { BACTRIAN_GRIDS } from './bactrianGrids'
import type { CorgiPose } from './corgi'

/**
 * A camel, the Pyramids' Ride, side on and facing right, in cells twice the
 * size of a screen pixel, as the corgi and the llama are: knelt down waiting,
 * its legs folded under it, and the two halves of a stride. A striped
 * blanket over its hump, for riding on.
 */

const CELL = 2
const COLUMNS = 30
const ROWS = 30

export const CAMEL_WIDTH = COLUMNS * CELL
export const CAMEL_HEIGHT = ROWS * CELL
/** How tall it is to its hump, stood up: what you land on to ride it. */
export const CAMEL_BACK = 48
/** How far above its feet whoever's riding it sits: down in the blanket, on its hump. */
export const CAMEL_SADDLE = 42

const ART: Record<CorgiPose, string> = { sit, crouch, leap }

/** An ink outline round it, as the corgi has, so it stands out. */
const OUTLINE: JSX.CSSProperties = {
	filter: [
		'drop-shadow(2px 0 0 #2b2b2b)',
		'drop-shadow(-2px 0 0 #2b2b2b)',
		'drop-shadow(0 2px 0 #2b2b2b)',
		'drop-shadow(0 -2px 0 #2b2b2b)',
	].join(' '),
}

export function CamelArt(props: { pose: CorgiPose }) {
	return (
		<div style={OUTLINE}>
			<PixelArt
				src={ART[props.pose]}
				width={CAMEL_WIDTH}
				height={CAMEL_HEIGHT}
			/>
		</div>
	)
}

/** The Bactrian camel's coat: darker and shaggier than the camel's, and its colours by letter. */
const BACTRIAN_COLOURS: Record<string, string> = {
	A: '#8a5a2b',
	B: '#f2c200',
	C: '#2b2b2b',
	D: '#c0392b',
	E: '#5e3a1a',
	F: '#2a6fdb',
	G: '#4a2e14',
	// The cloths over its humps: deep red, royal blue diamonds, white tassels.
	R: '#9e1b32',
	P: '#2a4fb8',
	W: '#f3f1ea',
}

/** A grid of letters as pixel art: a run of one colour along a row, a rect. */
function fromGrid(rows: readonly string[]) {
	const rects: PixelRect[] = []
	rows.forEach((row, y) => {
		let x = 0
		while (x < row.length) {
			const c = row[x]
			let end = x + 1
			while (end < row.length && row[end] === c) end++
			if (c !== '.') rects.push([x, y, end - x, 1, BACTRIAN_COLOURS[c]])
			x = end
		}
	})
	return pixelArt(COLUMNS, ROWS, rects)
}

const BACTRIAN: Record<CorgiPose, string> = {
	sit: fromGrid(BACTRIAN_GRIDS.sit),
	crouch: fromGrid(BACTRIAN_GRIDS.crouch),
	leap: fromGrid(BACTRIAN_GRIDS.leap),
}

/**
 * A Bactrian camel, now and then one of the Pyramids' camels: two great
 * shaggy humps, a fine cloth over each, a saddle in the dip between them,
 * a darker, shaggier coat. Ridden the same as any.
 */
export function BactrianArt(props: { pose: CorgiPose }) {
	return (
		<div style={OUTLINE}>
			<PixelArt
				src={BACTRIAN[props.pose]}
				width={CAMEL_WIDTH}
				height={CAMEL_HEIGHT}
			/>
		</div>
	)
}
