import { For, type JSX, Show } from 'solid-js'
import { type PixelRect, pixelArt } from '../../courses/kit/pixelArt'
import { type Board, boardOf } from '../../game/boards'
import { PixelArt } from '../PixelArt'

/**
 * The Slopes' skis and snowboards, in cells twice the size of a screen
 * pixel: stood up in the snow at the top, waiting to be taken; and under
 * whoever's riding them, side on. And snow sprayed off the bus's sleigh.
 */

const CELL = 2
const INK = '#1d1d1d'
const BINDING = '#3a3f46'
const METAL = '#c9ced4'

/** A colour, darker: the far ski of a pair, and edges. */
function darker(hex: string, by = 0.7) {
	const n = Number.parseInt(hex.slice(1), 16)
	const r = Math.round(((n >> 16) & 255) * by)
	const g = Math.round(((n >> 8) & 255) * by)
	const b = Math.round((n & 255) * by)
	return `rgb(${r},${g},${b})`
}

// --- Stood up in the snow, waiting --------------------------------------------

const STOOD_COLUMNS = 12
const STOOD_ROWS = 27
export const STOOD_WIDTH = STOOD_COLUMNS * CELL
export const STOOD_HEIGHT = STOOD_ROWS * CELL

/** A ski stood up on its tail, `x` its left, its tip curled over at the top. */
const stoodSki = (x: number, board: Board, shade = 1): PixelRect[] => {
	const colour = shade < 1 ? darker(board.colour, shade) : board.colour
	return [
		[x, 2, 2, 22, colour],
		// Its tip, curled back over.
		[x + 1, 0, 1, 2, colour],
		[x + 2, 0, 1, 1, colour],
		// A stripe down it, and its binding.
		[x + 1, 6, 1, 10, board.stripe],
		[x - 1, 13, 4, 2, BINDING],
		[x, 12, 2, 1, METAL],
	]
}

/** Skis stood up in the snow, a pair, poles crossed by them; or a snowboard. */
function stood(board: Board) {
	const rects: PixelRect[] =
		board.kind === 'skis'
			? [
					// Poles, leant against them, crossed.
					...[
						0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
						19,
					].map(
						(i): PixelRect => [Math.round(1 + i * 0.4), 5 + i, 1, 1, '#5d646d'],
					),
					[0, 4, 2, 1, INK],
					...stoodSki(3, board, 0.7),
					...stoodSki(6, board),
					...[
						0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
						19,
					].map(
						(i): PixelRect => [
							Math.round(10 - i * 0.4),
							5 + i,
							1,
							1,
							'#7d858f',
						],
					),
					[10, 4, 2, 1, INK],
				]
			: [
					// A snowboard: wide, rounded at either end, its bindings across it.
					[4, 1, 4, 23, board.colour],
					[5, 0, 2, 1, board.colour],
					[3, 2, 1, 21, darker(board.colour)],
					[5, 3, 2, 18, board.stripe],
					[3, 7, 6, 2, BINDING],
					[3, 15, 6, 2, BINDING],
					[4, 7, 4, 1, METAL],
					[4, 15, 4, 1, METAL],
				]
	return pixelArt(STOOD_COLUMNS, STOOD_ROWS, [
		...rects,
		// Stuck in a little heap of snow.
		[1, 23, 10, 4, '#f4f8fc'],
		[0, 25, 12, 2, '#e2ebf4'],
		[3, 22, 6, 1, '#ffffff'],
	])
}

const stoodArt = new Map<number, string>()

/** A pair of skis, or a snowboard, stood up in the snow at the top, the rack's `board`. */
export function StoodBoardArt(props: { board: number }) {
	const src = () => {
		let art = stoodArt.get(props.board)
		if (!art) {
			art = stood(boardOf(props.board))
			stoodArt.set(props.board, art)
		}
		return art
	}
	return <PixelArt src={src()} width={STOOD_WIDTH} height={STOOD_HEIGHT} />
}

// --- Under a rider, side on ---------------------------------------------------

/** Skis' size, side on, and a snowboard's: tips to the left, flipped to go right. */
const SKI_COLUMNS = 24
const BOARD_COLUMNS = 20
const UNDER_ROWS = 4
export const UNDER_HEIGHT = UNDER_ROWS * CELL
/**
 * How far up off the snow whoever's on them stands: on the board's plank,
 * its third row down, their boots in its bindings, the row over it; its
 * edge, the row under the plank, on the snow.
 */
export const UNDER_LIFT = 2
/** How far down the board's picture its plank is, that their feet are on. */
const PLANK_DOWN = 2 * CELL

function under(board: Board) {
	if (board.kind === 'skis') {
		const ski = (dx: number, colour: string): PixelRect[] => [
			[dx + 2, 2, 20, 1, colour],
			// Its tip, curled up, at the front.
			[dx + 1, 1, 1, 1, colour],
			[dx, 0, 1, 1, colour],
			// Its tail, a little up.
			[dx + 22, 1, 1, 1, colour],
		]
		return pixelArt(SKI_COLUMNS, UNDER_ROWS, [
			// The far ski, a step behind, in shade.
			...ski(1, darker(board.colour)),
			...ski(0, board.colour),
			// Its edge, steel, and a stripe along it.
			[3, 3, 18, 1, '#4a4f57'],
			[5, 2, 4, 1, board.stripe],
			[15, 2, 3, 1, board.stripe],
			// The binding, under their boot.
			[10, 1, 4, 1, BINDING],
		])
	}
	return pixelArt(BOARD_COLUMNS, UNDER_ROWS, [
		[2, 2, 16, 1, board.colour],
		[1, 1, 1, 1, board.colour],
		[18, 1, 1, 1, board.colour],
		[0, 0, 1, 1, darker(board.colour)],
		[19, 0, 1, 1, darker(board.colour)],
		[3, 3, 14, 1, darker(board.colour, 0.5)],
		[4, 2, 12, 1, board.stripe],
		[5, 2, 1, 1, board.colour],
		[14, 2, 1, 1, board.colour],
		// Its bindings, a boot in each.
		[5, 1, 3, 1, BINDING],
		[12, 1, 3, 1, BINDING],
	])
}

const underArt = new Map<number, string>()

/**
 * Whoever's riding `board`'s skis or snowboard, under their feet, side on,
 * its tips to the left: their sprite's flipped to face right, and it with
 * them. Snow sprayed off it at speed, and sparks off a rail grinding.
 */
export function BoardUnder(props: {
	board: number
	/** The rider's box's width: it's in the middle of it. */
	width: number
	spray: boolean
	sparks: boolean
}) {
	const board = () => boardOf(props.board)
	const columns = () => (board().kind === 'skis' ? SKI_COLUMNS : BOARD_COLUMNS)
	const src = () => {
		let art = underArt.get(props.board)
		if (!art) {
			art = under(board())
			underArt.set(props.board, art)
		}
		return art
	}
	const width = () => columns() * CELL
	return (
		<div
			style={{
				position: 'absolute',
				left: `${(props.width - width()) / 2}px`,
				// Its plank's top at their feet.
				bottom: `${PLANK_DOWN - UNDER_HEIGHT}px`,
				width: `${width()}px`,
				height: `${UNDER_HEIGHT}px`,
			}}
		>
			<PixelArt src={src()} width={width()} height={UNDER_HEIGHT} />
			<Show when={props.spray}>
				<Bits colours={SPRAY} from={width() - 4} />
			</Show>
			<Show when={props.sparks}>
				<Bits colours={SPARKS} from={width() / 2} />
			</Show>
		</div>
	)
}

const SPRAY = ['#ffffff', '#e8f1fa', '#ffffff', '#cfdff0']
const SPARKS = ['#ffe36b', '#ff9f1c', '#fff4c2', '#ff6a1c']
/** Where each bit flies to, from the back of the board, and when. */
const BITS = [
	{ x: 18, y: -16, delay: 0 },
	{ x: 28, y: -8, delay: 0.07 },
	{ x: 12, y: -22, delay: 0.14 },
	{ x: 24, y: -20, delay: 0.21 },
	{ x: 32, y: -12, delay: 0.28 },
]

/** Bits of snow, or sparks, flung off the back of it, over and over. */
function Bits(props: { colours: string[]; from: number }) {
	return (
		<For each={BITS}>
			{(bit, i) => (
				<div
					style={{
						position: 'absolute',
						left: `${props.from}px`,
						top: '2px',
						width: '4px',
						height: '4px',
						background: props.colours[i() % props.colours.length],
						'--dx': `${bit.x}px`,
						'--dy': `${bit.y}px`,
						animation: `dirt-fly 0.35s steps(6) ${bit.delay}s infinite`,
					}}
				/>
			)}
		</For>
	)
}

// --- The bus's ----------------------------------------------------------------

/** Snow sprayed off the back of the bus's sleigh, as it goes. */
export function BusSpray(): JSX.Element {
	return <Bits colours={SPRAY} from={0} />
}
