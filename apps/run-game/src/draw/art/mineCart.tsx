import { Show } from 'solid-js'
import { type PixelRect, pixelArt } from '../../courses/kit/pixelArt'
import { PixelArt } from '../PixelArt'

/**
 * A mine cart, side on, in cells twice the size of a screen pixel: an iron
 * tub gone rusty, riveted plates, a lip of bright steel round its top, on
 * four little wheels for the rails. Waiting, it's heaped with ore, a nugget
 * of gold in it; ridden, whoever's in it sits down inside, the tub over
 * their legs.
 */

const CELL = 2
const COLUMNS = 22
const ROWS = 14

export const CART_WIDTH = COLUMNS * CELL
export const CART_HEIGHT = ROWS * CELL

const RUST = '#8a4b2c'
const RUST_DARK = '#5e2f1b'
const RUST_LIT = '#a8603a'
const STEEL = '#8e939b'
const STEEL_LIT = '#c3c8cf'
const RIVET = '#d8bf93'
const IRON = '#2c2c30'
const HUB = '#a0a4ab'

const TUB: PixelRect[] = [
	// Its lip, bright steel.
	[0, 2, 22, 2, STEEL],
	[1, 2, 20, 1, STEEL_LIT],
	// The tub, narrowing to its bottom.
	[1, 4, 20, 2, RUST],
	[2, 6, 18, 2, RUST],
	[3, 8, 16, 2, RUST],
	[1, 4, 20, 1, RUST_LIT],
	// Its plates' seams, and their rivets.
	[7, 4, 1, 6, RUST_DARK],
	[14, 4, 1, 6, RUST_DARK],
	[3, 9, 16, 1, RUST_DARK],
	...[3, 5, 9, 12, 16, 18].map((x): PixelRect => [x, 5, 1, 1, RIVET]),
	// Under it, its frame and axles.
	[4, 10, 14, 1, IRON],
	// Its wheels, a hub in each.
	...[4, 14].flatMap((x): PixelRect[] => [
		[x + 1, 10, 2, 1, IRON],
		[x, 11, 4, 2, IRON],
		[x + 1, 13, 2, 1, IRON],
		[x + 1, 11, 2, 1, HUB],
	]),
]

/** Heaped with ore, over its lip: rock, and a nugget of gold. */
const ORE: PixelRect[] = [
	[3, 1, 5, 1, '#5a4639'],
	[2, 1, 1, 1, '#3f3129'],
	[6, 0, 4, 1, '#6e5848'],
	[9, 1, 6, 1, '#5a4639'],
	[13, 0, 3, 1, '#7a6150'],
	[15, 1, 4, 1, '#4b3a30'],
	[10, 0, 2, 1, '#f4cf47'],
	[11, 0, 1, 1, '#fff2a8'],
]

const EMPTY = pixelArt(COLUMNS, ROWS, TUB)
const LOADED = pixelArt(COLUMNS, ROWS, [...ORE, ...TUB])

export function MineCartArt(props: { loaded?: boolean }) {
	return (
		<Show
			when={props.loaded ?? true}
			fallback={
				<PixelArt src={EMPTY} width={CART_WIDTH} height={CART_HEIGHT} />
			}
		>
			<PixelArt src={LOADED} width={CART_WIDTH} height={CART_HEIGHT} />
		</Show>
	)
}
