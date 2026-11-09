import { For } from 'solid-js'
import { Pixels } from './Pixels'

/**
 * Geese on the path at Haga, by Brunnsviken: Canada geese, standing about
 * and pecking at the grass, facing whoever's coming. Run into them and they
 * flap off, honking, up and away along the course.
 */

const CELL = 2
const COLUMNS = 18
const ROWS = 16
const GOOSE_WIDTH = COLUMNS * CELL
/** How far apart they stand. */
const SPACING = 28
/** How tall they're drawn. */
export const GEESE_HEIGHT = ROWS * CELL
/** How tall they are, for running into: their bodies, not their thin necks. */
export const GEESE_REACH_UP = 24

/** How wide a gaggle of `count` is. */
export const geeseWidth = (count: number) => (count - 1) * SPACING + GOOSE_WIDTH

/** How long they're drawn flying off for, before they're gone. */
export const GEESE_FLIGHT_TICKS = 240

const INK = '#1b1b1b'
const WHITE = '#f4f1ea'
const BODY = '#8b7b67'
const BACK = '#6a5c4c'
const BREAST = '#cbbda6'
const LEG = '#3a3a3a'

type Cells = [number, number, number, number, string][]

/** Body, wings, tail and legs, facing left: the same head up or down. */
const STOOD: Cells = [
	[4, 7, 11, 5, BODY],
	[6, 7, 8, 2, BACK],
	[12, 8, 4, 2, BACK],
	[3, 8, 4, 4, BREAST],
	[5, 12, 8, 1, BREAST],
	[15, 7, 2, 3, INK],
	[12, 11, 4, 1, WHITE],
	[8, 13, 1, 3, LEG],
	[10, 13, 1, 3, LEG],
	[7, 15, 2, 1, LEG],
	[9, 15, 2, 1, LEG],
]
const HEAD_UP: Cells = [
	[0, 2, 1, 1, INK],
	[1, 0, 3, 3, INK],
	[2, 2, 2, 1, WHITE],
	[3, 3, 2, 5, INK],
]
/** Pecking at the grass. */
const HEAD_DOWN: Cells = [
	[2, 8, 2, 3, INK],
	[0, 10, 3, 3, INK],
	[1, 12, 2, 1, WHITE],
	[0, 13, 1, 1, INK],
]

/** Flying, neck out in front. Drawn turned round, flying on along the course. */
const FLYING: Cells = [
	[0, 7, 1, 1, INK],
	[1, 6, 2, 2, INK],
	[2, 7, 1, 1, WHITE],
	[3, 6, 4, 2, INK],
	[7, 6, 8, 3, BODY],
	[6, 7, 3, 2, BREAST],
	[15, 6, 2, 2, INK],
	[13, 9, 3, 1, WHITE],
	[11, 9, 2, 1, LEG],
]
const WINGS_UP: Cells = [
	[8, 0, 3, 6, BACK],
	[10, 2, 3, 4, BACK],
]
const WINGS_DOWN: Cells = [
	[8, 9, 3, 5, BACK],
	[10, 9, 3, 3, BACK],
]

const scaled = (cells: Cells): Cells =>
	cells.map(([x, y, w, h, c]) => [x * CELL, y * CELL, w * CELL, h * CELL, c])

const POSES = {
	up: scaled([...STOOD, ...HEAD_UP]),
	down: scaled([...STOOD, ...HEAD_DOWN]),
	wingsUp: scaled([...FLYING, ...WINGS_UP]),
	wingsDown: scaled([...FLYING, ...WINGS_DOWN]),
}

/** How often each pecks, and for how long. */
const PECK_EVERY = 130
const PECK_TICKS = 34

/** Where goose `i` is, `t` ticks after taking off: up and away, each a little differently. */
export function gooseFlight(i: number, t: number) {
	const climb = 1.6 + i * 0.35
	return {
		x: t * (3.2 + i * 0.5),
		// Hopping into the air, then climbing steadily.
		y: -Math.min(t, 8) * 2.5 - t * climb,
	}
}

/** `count` geese, standing about until `flown`, the tick they took off, then flying off. */
export function GeeseArt(props: {
	count: number
	now: number
	flown: number | undefined
}) {
	const geese = Array.from({ length: props.count }, (_, i) => i)
	return (
		<div style={{ position: 'relative', height: `${GEESE_HEIGHT}px` }}>
			<For each={geese}>
				{(i) => {
					const pose = () => {
						const { flown, now } = props
						if (flown !== undefined)
							return Math.floor((now - flown) / 5) % 2 ? 'wingsDown' : 'wingsUp'
						// Each on its own beat.
						return (now + i * 47) % PECK_EVERY < PECK_TICKS ? 'down' : 'up'
					}
					const transform = () => {
						const { flown, now } = props
						if (flown === undefined) return 'none'
						const f = gooseFlight(i, now - flown)
						return `translate(${f.x}px, ${f.y}px) scaleX(-1)`
					}
					return (
						<div
							style={{
								position: 'absolute',
								left: `${i * SPACING}px`,
								// Not quite in a line.
								bottom: `${(i % 2) * 2}px`,
								transform: transform(),
								visibility:
									props.flown !== undefined &&
									props.now - props.flown > GEESE_FLIGHT_TICKS
										? 'hidden'
										: 'visible',
							}}
						>
							<Pixels
								width={GOOSE_WIDTH}
								height={GEESE_HEIGHT}
								rects={POSES[pose()]}
							/>
						</div>
					)
				}}
			</For>
		</div>
	)
}

/** A goose flying over, bigger than the ones on the path: it's carrying people. */
const FLYING_CELL = 4
export const FLYING_GOOSE_WIDTH = COLUMNS * FLYING_CELL
/** Down to the tips of its wings, flapped down. */
export const FLYING_GOOSE_HEIGHT = 14 * FLYING_CELL
const flying = (cells: Cells): Cells =>
	cells.map(([x, y, w, h, c]) => [
		x * FLYING_CELL,
		y * FLYING_CELL,
		w * FLYING_CELL,
		h * FLYING_CELL,
		c,
	])
const FLYING_POSES = {
	up: flying([...FLYING, ...WINGS_UP]),
	down: flying([...FLYING, ...WINGS_DOWN]),
}

/** A goose flying on along the course, flapping: faster, carrying someone. */
export function FlyingGooseArt(props: { now: number; carrying: boolean }) {
	const beat = () => (props.carrying ? 4 : 6)
	return (
		<div style={{ transform: 'scaleX(-1)' }}>
			<Pixels
				width={FLYING_GOOSE_WIDTH}
				height={FLYING_GOOSE_HEIGHT}
				rects={FLYING_POSES[Math.floor(props.now / beat()) % 2 ? 'down' : 'up']}
			/>
		</div>
	)
}

/** One goose, for the instructions. */
export function GooseIcon() {
	return <Pixels width={GOOSE_WIDTH} height={GEESE_HEIGHT} rects={POSES.up} />
}
