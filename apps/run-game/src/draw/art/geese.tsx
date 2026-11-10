import { For } from 'solid-js'
import pecking from '../../assets/flyers/goose-pecking.png'
import standing from '../../assets/flyers/goose-standing.png'
import wingsDown from '../../assets/flyers/goose-wings-down.png'
import wingsUp from '../../assets/flyers/goose-wings-up.png'
import { PixelArt } from '../PixelArt'

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

/** How tall one flying is, down to the tips of its wings, flapped down. */
const FLYING_HEIGHT = 14 * CELL

/** How long they're drawn flying off for, before they're gone. */
export const GEESE_FLIGHT_TICKS = 240

/** Each pose, facing left: stood with its head up or down to peck, or flying, its wings up or down. */
const POSES = {
	up: { src: standing, height: GEESE_HEIGHT },
	down: { src: pecking, height: GEESE_HEIGHT },
	wingsUp: { src: wingsUp, height: FLYING_HEIGHT },
	wingsDown: { src: wingsDown, height: FLYING_HEIGHT },
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

/** A goose's own number, out of 1: the same on every screen, for where the gaggle's at `x`. */
const chance = (x: number, i: number) => {
	const n = Math.sin(x * 12.9898 + i * 78.233) * 43758.5453
	return n - Math.floor(n)
}

/**
 * Whether goose `i` of a gaggle is one that flies off when it's first
 * disturbed: the one nearest whoever's coming, and about half the rest.
 * Disturbed again, or by the bus, the rest go too.
 */
const fliesFirst = (x: number, i: number) => i === 0 || chance(x, i) < 0.5

/**
 * When goose `i` takes off, if it has: a moment after it's disturbed, each
 * a little after the one before, and each its own way.
 */
export function gooseTakeoff(
	x: number,
	i: number,
	flown: number | undefined,
	flownAll: number | undefined,
) {
	const delay = Math.round(i * 5 + chance(x, i + 7) * 10)
	if (flown !== undefined && fliesFirst(x, i)) return flown + delay
	if (flownAll !== undefined) return flownAll + delay
	return undefined
}

/** Which of a gaggle of `count` at `x` are still on the path, by index: none disturbed yet, or not those. */
export const geeseLeft = (
	x: number,
	count: number,
	flown: number | undefined,
	flownAll: number | undefined,
) =>
	Array.from({ length: count }, (_, i) => i).filter(
		(i) => flownAll === undefined && !(flown !== undefined && fliesFirst(x, i)),
	)

/** Where goose `i` of a gaggle of `count` at `x` stands, side to side. */
export const gooseSpan = (x: number, count: number, i: number) => {
	const left = x - geeseWidth(count) / 2 + i * SPACING
	return { left, right: left + GOOSE_WIDTH }
}

/**
 * `count` geese at `x`, standing about until each takes off (see
 * `gooseTakeoff`), then flying off.
 */
export function GeeseArt(props: {
	x: number
	count: number
	now: number
	flown: number | undefined
	flownAll?: number
	/** A CSS filter over them: grey, for pigeons. */
	filter?: string
}) {
	const geese = Array.from({ length: props.count }, (_, i) => i)
	return (
		<div
			style={{
				position: 'relative',
				height: `${GEESE_HEIGHT}px`,
				filter: props.filter,
			}}
		>
			<For each={geese}>
				{(i) => {
					/** When this one took off, if it has yet. */
					const flownAt = () => {
						const at = gooseTakeoff(props.x, i, props.flown, props.flownAll)
						return at !== undefined && props.now >= at ? at : undefined
					}
					const pose = () => {
						const { now } = props
						const flown = flownAt()
						if (flown !== undefined)
							return Math.floor((now - flown) / 5) % 2 ? 'wingsDown' : 'wingsUp'
						// Each on its own beat.
						return (now + i * 47) % PECK_EVERY < PECK_TICKS ? 'down' : 'up'
					}
					const transform = () => {
						const { now } = props
						const flown = flownAt()
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
								visibility: (() => {
									const flown = flownAt()
									return flown !== undefined &&
										props.now - flown > GEESE_FLIGHT_TICKS
										? 'hidden'
										: 'visible'
								})(),
							}}
						>
							<PixelArt
								src={POSES[pose()].src}
								width={GOOSE_WIDTH}
								height={POSES[pose()].height}
							/>
						</div>
					)
				}}
			</For>
		</div>
	)
}

/** A goose flying over: the same size as the ones on the path. */
export const FLYING_GOOSE_WIDTH = GOOSE_WIDTH
export const FLYING_GOOSE_HEIGHT = FLYING_HEIGHT

/** A goose flying on along the course, flapping: faster, carrying someone. */
export function FlyingGooseArt(props: { now: number; carrying: boolean }) {
	const beat = () => (props.carrying ? 4 : 6)
	return (
		<div style={{ transform: 'scaleX(-1)' }}>
			<PixelArt
				src={Math.floor(props.now / beat()) % 2 ? wingsDown : wingsUp}
				width={FLYING_GOOSE_WIDTH}
				height={FLYING_GOOSE_HEIGHT}
			/>
		</div>
	)
}

/** One goose, for the instructions. */
export function GooseIcon() {
	return <PixelArt src={standing} width={GOOSE_WIDTH} height={GEESE_HEIGHT} />
}
