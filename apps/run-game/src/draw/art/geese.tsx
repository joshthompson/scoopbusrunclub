import type { DrawPainting } from 'scoopjs'
import { For } from 'solid-js'
import pecking from '../../assets/flyers/goose-pecking.png'
import standing from '../../assets/flyers/goose-standing.png'
import wingsDown from '../../assets/flyers/goose-wings-down.png'
import wingsUp from '../../assets/flyers/goose-wings-up.png'
import { PixelArt } from '../PixelArt'
import { filtered } from '../paint/css'
import { mirrored } from '../paint/picture'

/**
 * Geese on the path at Haga, by Brunnsviken: Canada geese, standing about
 * and pecking at the grass, facing whoever's coming. Run up to them and
 * they flap off, honking, up and away along the course: never in the way.
 */

const CELL = 2
const COLUMNS = 18
const ROWS = 16
const GOOSE_WIDTH = COLUMNS * CELL
/** How far apart they stand. */
const SPACING = 28
/** How tall they're drawn. */
export const GEESE_HEIGHT = ROWS * CELL

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

/**
 * How far a gaggle of `count`, flying off, gets past its box before it's
 * gone (`GEESE_FLIGHT_TICKS`), for the Draw Hook's `drawReach`: on along
 * the course and up. The last is the furthest along and the fastest and
 * steepest, so it gets furthest either way.
 */
export function geeseReach(count: number) {
	const last = count - 1
	const { x, y } = gooseFlight(last, GEESE_FLIGHT_TICKS)
	// Its top, flying, from the top of the box.
	const top = GEESE_HEIGHT - (last % 2) * 2 - FLYING_HEIGHT + y
	return { right: Math.ceil(x), top: Math.ceil(-top) }
}

/** A goose's own number, out of 1: the same on every screen, for where the gaggle's at `x`. */
const chance = (x: number, i: number) => {
	const n = Math.sin(x * 12.9898 + i * 78.233) * 43758.5453
	return n - Math.floor(n)
}

/**
 * When goose `i` takes off, if it has: a moment after they're disturbed,
 * each a little after the one before, and each its own way.
 */
export function gooseTakeoff(x: number, i: number, flown: number | undefined) {
	if (flown === undefined) return undefined
	return flown + Math.round(i * 3 + chance(x, i + 7) * 6)
}

/**
 * Goose `i` of a gaggle at `x`, at `now`, if it's still to be seen: its
 * pose, and how far it's flown, if it's taken off.
 */
function gooseAt(x: number, i: number, now: number, flown: number | undefined) {
	const at = gooseTakeoff(x, i, flown)
	const flownAt = at !== undefined && now >= at ? at : undefined
	if (flownAt === undefined)
		// Each on its own beat.
		return {
			pose: (now + i * 47) % PECK_EVERY < PECK_TICKS ? 'down' : 'up',
		} as const
	if (now - flownAt > GEESE_FLIGHT_TICKS) return undefined
	return {
		pose: Math.floor((now - flownAt) / 5) % 2 ? 'wingsDown' : 'wingsUp',
		flight: gooseFlight(i, now - flownAt),
	} as const
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
						const at = gooseTakeoff(props.x, i, props.flown)
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

/**
 * A goose flying, `now` ticks in, as it's drawn: flapping, faster carrying
 * someone. Facing left: turned round to fly on along the course.
 */
export const flyingGoosePicture = (now: number, carrying: boolean) =>
	Math.floor(now / (carrying ? 4 : 6)) % 2 ? wingsDown : wingsUp

/** One goose, for the instructions. */
export function GooseIcon() {
	return <PixelArt src={standing} width={GOOSE_WIDTH} height={GEESE_HEIGHT} />
}

/**
 * `count` geese at `x`, as `GeeseArt` draws them, painted in a Draw Hook:
 * through the course's `filter`, if it has one, recoloured once and kept,
 * since WebKit's canvas has no `filter`.
 */
export function paintGeese(
	ctx: CanvasRenderingContext2D,
	image: DrawPainting['image'],
	x: number,
	count: number,
	now: number,
	flown: number | undefined,
	filter: string | undefined,
) {
	for (let i = 0; i < count; i++) {
		const goose = gooseAt(x, i, now, flown)
		if (!goose) continue
		const { src, height } = POSES[goose.pose]
		const loaded = image(src)
		if (!loaded) continue
		const art = filtered(src, loaded, filter, GOOSE_WIDTH / loaded.width)
		// Not quite in a line.
		const left = i * SPACING
		const top = GEESE_HEIGHT - (i % 2) * 2 - height
		const paint = () =>
			ctx.drawImage(
				art.art,
				-art.pad,
				-art.pad,
				art.width + art.pad * 2,
				art.height + art.pad * 2,
			)
		ctx.save()
		ctx.translate(left, top)
		if (goose.flight) {
			// Flying off, turned round, along the course.
			ctx.translate(goose.flight.x, goose.flight.y)
			mirrored(ctx, GOOSE_WIDTH, paint)
		} else paint()
		ctx.restore()
	}
}
