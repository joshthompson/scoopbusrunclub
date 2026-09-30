import shadowAsset from '@/assets/runners/shadow.png'
import { RUNNER_SIZE } from '@/data/runners'
import { type Scene, createController, createObjectSignal } from '@/engine'
import { furbyAssets } from '@/utils/furbys'
import { css } from '@style/css'
import { addToPath } from './PathOrder'
import { type RunnerController, isStandingState } from './RunnerController'

const FURBY_TYPE = 'furby'
const SHADOW_TYPE = 'furby-shadow'

export const FURBY_LINK = 'https://www.forbifartspremiaren.se/'
const FURBY_LABEL = 'Furbyfartspremiären'

/** Enough to fill the path without it turning into a stampede. */
const FURBY_COUNT = Math.max(6, furbyAssets.length)
/** No more than one furby for every this many pixels of screen, rounded up. */
const FURBY_SPACING = 150
/**
 * They come out raining down from above the screen, this far apart, already
 * falling this fast when they come into view.
 */
const DROP_GAP_MS = 500
const DROP_SPEED = 24

/**
 * Where their feet land: across the lower half of the path, in front of the
 * runners' feet, so a furby is never stood on someone's head.
 */
const GROUND_MIN = 192
const GROUND_MAX = 212

/** A hop, in pixels per 40ms tick. How high it goes grows with the square of this. */
const HOP_SPEED_MIN = 9.8
const HOP_SPEED_MAX = 15.9
const HOP_DISTANCE_MIN = 20
const HOP_DISTANCE_MAX = 70
const GRAVITY = 1.3
/** Runners fall at this, and a scooped furby comes down alongside them. */
const SCOOPED_GRAVITY = 3

/** Ticks spent on each part of a hop. */
const REST_MIN = 12
const REST_MAX = 45
const CROUCH = 4
const LAND = 7
/** Ticks sat dazed after being scooped, before hopping again. */
const DAZED = 40

/** How far a furby squashes, as a share of its height. */
const CROUCH_SQUASH = 0.12
const LAND_SQUASH = 0.28
const SCOOPED_LAND_SQUASH = 0.4
/** How fast a scooped furby tumbles, in degrees per tick. */
const TUMBLE_SPEED = 24

/** How long a stomped runner sits, in ticks: as long as the bus knocks them down for. */
const KNOCKED_MIN = 30
const KNOCKED_MAX = 60
/** Only the middle fifth of a runner counts, as their art has room round the edges. */
const STOMP_INSET = 0.4
/** Off a runner's head: a little bounce, or as much as it takes to reach the next. */
const STOMP_BOUNCE_MIN = 6
const STOMP_BOUNCE_MAX = 10
/** How hard a furby will lean into a hop to reach a runner, in pixels per tick. */
const AIM_REACH = 5
/** How far over a runner's head a furby's feet get before coming down on it. */
const AIM_CLEARANCE = 6

/** Keep this far in from either edge when picking which way to hop. */
const EDGE_MARGIN = 40

type Phase = 'sky' | 'rest' | 'crouch' | 'air' | 'land'

/** A number somewhere in `[min, max]`. */
function between(min: number, max: number) {
	return min + Math.random() * (max - min)
}

/** The same things in a random order. */
function shuffled<T>(items: T[]) {
	return items
		.map((item) => ({ item, order: Math.random() }))
		.sort((a, b) => a.order - b.order)
		.map(({ item }) => item)
}

function middleOf({ data }: { data: { x(): number; width(): number } }) {
	return data.x() + data.width() / 2
}

type Column = { from: number; to: number }

/**
 * The stretch of screen a furby wants to be in. Every furby out gets an even
 * share of the width, left to right in the order they're stood in, reaching
 * half a share further on either side so neighbours overlap, and kept in off
 * the edges. Worked out afresh each time, so it follows furbies coming and
 * going and the screen changing size.
 */
function columnOf(scene: Scene, id: string): Column {
	const furbies = scene
		.getControllersByType(FURBY_TYPE)
		.toSorted((a, b) => middleOf(a) - middleOf(b))
	const width = scene.canvas.get().width()
	const share = width / furbies.length
	const rank = Math.max(
		0,
		furbies.findIndex((furby) => furby.id === id),
	)
	return {
		from: Math.max(EDGE_MARGIN, (rank - 0.5) * share),
		to: Math.min(width - EDGE_MARGIN, (rank + 1.5) * share),
	}
}

/** The size each furby's art is drawn at, read off the image once it's loaded. */
const sizes = new Map<string, Promise<Vector>>()
function measure(src: string) {
	let size = sizes.get(src)
	if (!size) {
		size = new Promise((resolve) => {
			const img = new Image()
			img.onload = () =>
				resolve({
					x: img.naturalWidth * RUNNER_SIZE,
					y: img.naturalHeight * RUNNER_SIZE,
				})
			img.onerror = () => resolve({ x: 0, y: 0 })
			img.src = src
		})
		sizes.set(src, size)
	}
	return size
}

/**
 * Out on the path and upright, so fair game: not a volunteer, and not anyone
 * already sat down or flying off the bus.
 */
function isStompable({ data }: RunnerController) {
	return (
		!isStandingState(data.activeState()) &&
		!data.scooped() &&
		data.sitting() <= 0
	)
}

/** The runner whose head a furby's feet came down through this tick, if any. */
function stompedRunner(scene: Scene, middle: number, from: number, to: number) {
	return scene
		.getControllersByType<RunnerController>('runner')
		.find((runner) => {
			const { data } = runner
			const inset = data.width() * STOMP_INSET
			return (
				isStompable(runner) &&
				middle > data.x() + inset &&
				middle < data.x() + data.width() - inset &&
				from < data.y() &&
				to >= data.y()
			)
		})
}

/**
 * Ticks until feet at `feetY`, moving at `ySpeed`, come down through `line`,
 * stepped just as a hop is so an aim lands where it means to. Undefined if
 * they never get above it.
 */
function ticksToFall(feetY: number, ySpeed: number, line: number) {
	let y = feetY
	let speed = ySpeed
	for (let tick = 1; tick <= 100; tick++) {
		const from = y
		y += speed
		speed += GRAVITY
		if (y > from) {
			if (from >= line) return undefined
			if (y >= line) return tick
		}
	}
	return undefined
}

/**
 * Where a runner's middle will be when a furby comes down `ticks` from now.
 * They run on meanwhile, one stride fewer than that: the check that tick sees
 * them wherever this one does.
 */
function middleIn({ data }: RunnerController, ticks: number) {
	return data.x() + data.width() / 2 - data.step() * (ticks - 1)
}

/**
 * The nearest runner a furby could come down on from here, and how: pushing
 * off at somewhere between `minSpeed` and `maxSpeed`, and leaning sideways by
 * no more than it can reach. Only anyone who'll be in its own stretch of the
 * screen by then.
 */
function aim(
	scene: Scene,
	middle: number,
	feetY: number,
	minSpeed: number,
	maxSpeed: number,
	column: Column,
) {
	let best:
		| { runner: RunnerController; ySpeed: number; xSpeed: number }
		| undefined
	let nearest = Number.POSITIVE_INFINITY
	for (const runner of scene.getControllersByType<RunnerController>('runner')) {
		if (!isStompable(runner)) continue
		const head = runner.data.y()
		const rise = feetY - head + AIM_CLEARANCE
		const ySpeed = Math.max(
			minSpeed,
			Math.sqrt(2 * GRAVITY * Math.max(0, rise)),
		)
		if (ySpeed > maxSpeed) continue
		const ticks = ticksToFall(feetY, -ySpeed, head)
		if (!ticks) continue
		const landing = middleIn(runner, ticks)
		if (landing < column.from || landing > column.to) continue
		const xSpeed = (landing - middle) / ticks
		if (Math.abs(xSpeed) > AIM_REACH) continue
		if (Math.abs(landing - middle) >= nearest) continue
		nearest = Math.abs(landing - middle)
		best = { runner, ySpeed, xSpeed }
	}
	return best
}

function createFurbyController(
	id: string,
	src: string,
	scene: Scene,
	/** Ticks spent waiting up above the screen before dropping in. */
	delay: number,
	/** Where across the screen it drops in. */
	middle: number,
) {
	const ground = between(GROUND_MIN, GROUND_MAX)

	// Nothing to draw until the art has loaded and told us its size, which is
	// also when it can be centred on where it's dropping in.
	const { size, setSize } = createObjectSignal({ x: 0, y: 0 } as Vector, 'size')
	measure(src).then((measured) => {
		setSize(measured)
		furby.data.setX(furby.data.x() - measured.x / 2)
	})

	let phase: Phase = 'sky'
	let timer = delay
	let landSquash = LAND_SQUASH
	let xSpeed = 0
	/**
	 * Whoever it's coming down on, and the chance the next head it lands on goes
	 * down: sure at first, half as likely after each one that does.
	 */
	let target: RunnerController | undefined
	let luck = 1

	const furby = createController({
		frames: [src],
		init() {
			// Tracked by feet rather than the top-left corner, so the squash can
			// be anchored to the ground.
			// Starting just out of sight above the screen.
			const { feetY, setFeetY } = createObjectSignal(0, 'feetY')
			const { x, setX } = createObjectSignal(middle, 'x')
			const { scooped, setScooped } = createObjectSignal(false, 'scooped')
			const { hovered, setHovered } = createObjectSignal(false, 'hovered')

			// Built once and handed back every frame: the sprite re-reads its
			// children whenever the furby moves, and a fresh link each tick would
			// lose the hover before anyone could click it.
			const link = (
				<a
					href={FURBY_LINK}
					target="_blank"
					rel="noopener noreferrer"
					tabIndex={-1}
					class={styles.link}
					onMouseEnter={() => setHovered(true)}
					onMouseLeave={() => setHovered(false)}
					// The header canvas navigates home on any click or touch that
					// reaches it, so keep this one to ourselves.
					onClick={(e) => e.stopPropagation()}
					onTouchStart={(e) => e.stopPropagation()}
					onTouchEnd={(e) => e.stopPropagation()}
				>
					<span class={styles.label}>{FURBY_LABEL}</span>
				</a>
			)

			return {
				id,
				type: FURBY_TYPE,
				ground: () => ground,
				x,
				setX,
				y: () => feetY() - size().y,
				feetY,
				setFeetY,
				width: () => size().x,
				height: () => size().y,
				scooped,
				setScooped,
				...createObjectSignal(0, 'ySpeed'),
				...createObjectSignal(1, 'xScale'),
				...createObjectSignal(1, 'yScale'),
				...createObjectSignal(0, 'rotation'),
				hovered,
				// Squashes sit on the ground, but a tumble spins round the middle.
				origin: () => ({
					x: size().x / 2,
					y: scooped() ? size().y / 2 : size().y,
				}),
				children: () => link,
			}
		},
		onEnterFrame({ $, $scene, $controller }) {
			// Scooped by the bus: fly, tumble, and come down with a thump.
			if ($.scooped()) {
				phase = 'air'
				$.setFeetY($.feetY() + $.ySpeed())
				$.setYSpeed($.ySpeed() + SCOOPED_GRAVITY)
				$.setRotation($.rotation() + TUMBLE_SPEED)
				$.setXScale(1)
				$.setYScale(1)
				if ($.feetY() >= ground) {
					$.setFeetY(ground)
					$.setScooped(false)
					$.setRotation(0)
					phase = 'land'
					timer = LAND
					landSquash = SCOOPED_LAND_SQUASH
					xSpeed = 0
				}
				return
			}

			timer--

			if (phase === 'sky') {
				// Waiting its turn to drop in, then falling like any hop does, and
				// onto whoever's underneath.
				if (timer > 0) return
				phase = 'air'
				$.setYSpeed(DROP_SPEED)
			}

			if (phase === 'rest') {
				// Held still under the cursor, so it can actually be clicked.
				if (timer > 0 || $.hovered()) return
				phase = 'crouch'
				timer = CROUCH
			}

			if (phase === 'crouch') {
				const t = 1 - timer / CROUCH
				$.setYScale(1 - CROUCH_SQUASH * t)
				$.setXScale(1 + CROUCH_SQUASH * 0.5 * t)
				if (timer > 0) return

				// Off it goes: at a runner if there's one in reach in its own
				// stretch of screen, otherwise wherever in it, or back towards it
				// if it's strayed out.
				const hop = between(HOP_SPEED_MIN, HOP_SPEED_MAX)
				const middle = middleOf($controller)
				const column = columnOf($scene, id)
				const aimed = aim($scene, middle, $.feetY(), hop, HOP_SPEED_MAX, column)
				target = aimed?.runner
				luck = 1
				if (aimed) {
					xSpeed = aimed.xSpeed
					$.setYSpeed(-aimed.ySpeed)
				} else {
					const distance = between(HOP_DISTANCE_MIN, HOP_DISTANCE_MAX)
					const inside = middle >= column.from && middle <= column.to
					let direction = inside
						? Math.random() < 0.5
							? -1
							: 1
						: middle < column.from
							? 1
							: -1
					// Turning back rather than hopping out of it.
					const landing = middle + direction * distance
					if (inside && (landing < column.from || landing > column.to))
						direction = -direction
					const airtime = (2 * hop) / GRAVITY
					xSpeed = (direction * distance) / airtime
					$.setYSpeed(-hop)
				}
				// Stretched on the way up.
				$.setYScale(1.12)
				$.setXScale(0.92)
				phase = 'air'
			}

			if (phase === 'air') {
				// Steering for whoever it's after, as they keep running.
				if (target && !isStompable(target)) target = undefined
				if (target) {
					const ticks = ticksToFall($.feetY(), $.ySpeed(), target.data.y())
					if (ticks) {
						const lean =
							(middleIn(target, ticks) - $.x() - $.width() / 2) / ticks
						xSpeed = Math.max(-AIM_REACH, Math.min(AIM_REACH, lean))
					} else {
						target = undefined
					}
				}

				const from = $.feetY()
				$.setX($.x() + xSpeed)
				$.setFeetY($.feetY() + $.ySpeed())
				$.setYSpeed($.ySpeed() + GRAVITY)
				// Easing back to round at the top of the hop.
				$.setYScale(1 + ($.yScale() - 1) * 0.8)
				$.setXScale(1 + ($.xScale() - 1) * 0.8)

				// Came down on someone's head: if it lands, sit them down and bounce
				// off onto the next in reach. If not, it carries on down to the path
				// past them, and that's the end of its run for this hop.
				const runner =
					luck > 0 &&
					$.feetY() > from &&
					stompedRunner($scene, $.x() + $.width() / 2, from, $.feetY())
				if (runner && Math.random() >= luck) {
					luck = 0
					target = undefined
				} else if (runner) {
					runner.data.setSitting(between(KNOCKED_MIN, KNOCKED_MAX))
					luck /= 2
					const next = aim(
						$scene,
						$.x() + $.width() / 2,
						$.feetY(),
						STOMP_BOUNCE_MIN,
						STOMP_BOUNCE_MAX,
						columnOf($scene, id),
					)
					target = next?.runner
					if (next) xSpeed = next.xSpeed
					$.setYSpeed(-(next?.ySpeed ?? STOMP_BOUNCE_MIN))
					$.setYScale(1.12)
					$.setXScale(0.92)
				}
				if ($.feetY() < ground) return

				$.setFeetY(ground)
				phase = 'land'
				timer = LAND
				landSquash = LAND_SQUASH
			}

			if (phase === 'land') {
				// Flattened on impact, then springing back up to round.
				const t = timer / LAND
				$.setYScale(1 - landSquash * t)
				$.setXScale(1 + landSquash * 0.7 * t)
				if (timer > 0) return

				$.setYScale(1)
				$.setXScale(1)
				phase = 'rest'
				timer = Math.round(
					landSquash === SCOOPED_LAND_SQUASH
						? DAZED
						: between(REST_MIN, REST_MAX),
				)
			}
		},
	})

	// A shadow that stays on the ground, shrinking and fading as the furby
	// leaves it.
	const lift = () => ground - furby.data.feetY()
	const shadow = createController({
		frames: [shadowAsset],
		init: () => ({
			id: `${id}-shadow`,
			type: SHADOW_TYPE,
			x: () => furby.data.x() + furby.data.width() * 0.15 + lift() * 0.05,
			y: () => ground - 6,
			width: () => Math.max(0, furby.data.width() * 0.7 - lift() * 0.1),
			height: () => 10,
			style: () => ({ opacity: Math.max(0, 1 - lift() / 150) }),
		}),
	})

	return [shadow, furby] as const
}

/**
 * Let the furbies out, or put them away again, keeping only as many out as the
 * screen has room for. Safe to call repeatedly, and again as the screen
 * changes size: it adds or takes away the difference, leaving the rest alone.
 */
export function syncFurbies(scene: Scene, on: boolean) {
	const current = scene.controllers.get()
	const out = current
		.map(({ controller }) => controller)
		.filter((controller) => controller.type === FURBY_TYPE)
	const room = Math.ceil(scene.canvas.get().width() / FURBY_SPACING)
	const wanted = on && furbyAssets.length ? Math.min(FURBY_COUNT, room) : 0

	if (out.length > wanted) {
		// The furthest right go first: when the screen narrows, they're the ones
		// left off the edge of it.
		const leaving = new Set(
			out
				.toSorted((a, b) => b.data.x() - a.data.x())
				.slice(0, out.length - wanted)
				.flatMap(({ id }) => [id, `${id}-shadow`]),
		)
		scene.controllers.set(current.filter(({ id }) => !leaving.has(id)))
		return
	}

	// Whichever aren't out yet, picked at random when there isn't room for all,
	// each raining down into a share of the screen nobody's in yet.
	const taken = new Set(out.map(({ id }) => id))
	const width = scene.canvas.get().width()
	const share = width / wanted
	const occupied = new Set(
		out.map((furby) => Math.floor(middleOf(furby) / share)),
	)
	const free = shuffled(
		Array.from({ length: wanted }, (_, slot) => slot).filter(
			(slot) => !occupied.has(slot),
		),
	)
	const joining = shuffled(
		Array.from({ length: FURBY_COUNT }, (_, i) => i).filter(
			(i) => !taken.has(`furby${i}`),
		),
	)
		.slice(0, wanted - out.length)
		.map((i, order) => {
			const slot = free[order] ?? Math.floor(Math.random() * wanted)
			return createFurbyController(
				`furby${i}`,
				furbyAssets[i % furbyAssets.length],
				scene,
				Math.round((order * DROP_GAP_MS) / (scene.options.frameRate ?? 40)),
				Math.min(
					width - EDGE_MARGIN,
					Math.max(EDGE_MARGIN, (slot + Math.random()) * share),
				),
			)
		})
	if (!joining.length) return

	// In among the runners by where they stand on the path, with every shadow
	// under every furby, so a hop never lands behind one.
	addToPath(
		scene,
		joining.map(([, furby]) => furby),
		joining.map(([shadow]) => shadow),
	)
}

const styles = {
	link: css({
		position: 'absolute',
		inset: 0,
		pointerEvents: 'auto',
		cursor: 'pointer',
	}),
	label: css({
		display: 'none',
		position: 'absolute',
		left: '50%',
		top: 0,
		transform: 'translate(-50%, -120%)',
		background: 'var(--color-black)',
		color: 'var(--color-white)',
		fontFamily: '"Jersey 10", sans-serif',
		fontSize: '12px',
		p: '0px 8px',
		width: 'max-content',
		borderRadius: '3px',
		cornerShape: 'notch',
		'a:hover > &': {
			display: 'block',
		},
	}),
}
