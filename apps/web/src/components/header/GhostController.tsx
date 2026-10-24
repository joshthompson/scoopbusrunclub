import { createController, createObjectSignal } from '@/engine'
import { ghostAssets, halloweenAssetSize, isHalloween } from '@/utils/halloween'

/**
 * The grass just behind the path, which is the floor a ghost rises up through
 * and sinks back into. Whatever of a ghost is below it isn't drawn, so it
 * emerges from the ground rather than appearing in front of it.
 */
const FLOOR_Y = 156

/** How low a ghost flying about the sky comes, by the top of its head. */
const SKY_BOTTOM = 70

/**
 * How see-through a ghost is, and how much that flickers. Faded in from
 * nothing as it comes up, and out again as it goes back down.
 */
const OPACITY = 0.65
const FLICKER = 0.12
const FLICKER_SPEED = 0.09

/** Speeds, in pixels a tick. */
const RISE_SPEED = 1.2
const SINK_SPEED = 1
const FLY_SPEED = 2.2
/** How quickly a ghost turns towards where it's heading: lower is swoopier. */
const STEER = 0.05
/** Inside this distance a ghost eases off, so it glides into a spot. */
const ARRIVE_DISTANCE = 40

/** The bob on top of wherever a ghost is going. */
const BOB = 3
const BOB_SPEED = 0.12
/** Sideways sway while it rises or sinks, so it doesn't go up like a lift. */
const SWAY = 5
const SWAY_SPEED = 0.08
/** How far it tips into the way it's flying, in degrees. */
const MAX_LEAN = 10

/**
 * In ticks (the scene ticks every 40ms). The first wait after Halloween mode
 * comes on is short, so there's a ghost about soon after the page loads; after
 * that they're only out occasionally.
 */
const FIRST_WAIT = [75, 300]
/** How much later each ghost after the first comes out the first time. */
const FIRST_STAGGER = 100
const WAIT = [450, 1250]
const FLIGHT = [200, 400]

type GhostState = 'waiting' | 'rising' | 'flying' | 'landing' | 'sinking'

/** A whole number of ticks somewhere in `[min, max]`. */
function between([min, max]: number[]) {
	return Math.round(min + Math.random() * (max - min))
}

/**
 * A ghost that every so often rises up through the grass behind the path,
 * swoops about the sky for a while, then glides back down and sinks into the
 * ground again. Only out in Halloween mode.
 *
 * The image faces left, trailing its tail behind it, so it's flipped to fly
 * right. Each ghost takes the next image in turn, so with two images two ghosts
 * look different.
 */
export function createGhostController(id: string, index: number) {
	const asset = ghostAssets[index % ghostAssets.length]

	const size = () => (isHalloween() ? halloweenAssetSize(asset) : undefined)
	const width = () => size()?.width ?? 0
	const height = () => size()?.height ?? 0

	let state: GhostState = 'waiting'
	let wait = between(FIRST_WAIT) + index * FIRST_STAGGER
	let flight = 0
	let vx = 0
	let vy = 0
	let target = { x: 0, y: 0 }
	// Each ghost bobs and flickers out of step with the others.
	const phase = Math.random() * Math.PI * 2

	/** Head for `target`, slowing down to arrive rather than overshooting. */
	const steer = (x: number, y: number) => {
		const dx = target.x - x
		const dy = target.y - y
		const distance = Math.hypot(dx, dy) || 1
		const speed = FLY_SPEED * Math.min(1, distance / ARRIVE_DISTANCE)
		vx += ((dx / distance) * speed - vx) * STEER
		vy += ((dy / distance) * speed - vy) * STEER
		return distance
	}

	return createController({
		frames: [asset],
		init() {
			const { bob, setBob } = createObjectSignal(0, 'bob')
			const { ghostY, setGhostY } = createObjectSignal(FLOOR_Y, 'ghostY')
			const { opacity, setOpacity } = createObjectSignal(0, 'opacity')
			const { out, setOut } = createObjectSignal(false, 'out')
			// Where it's drawn, bob and all, which is what the floor cuts off.
			const y = () => ghostY() + bob()
			return {
				id,
				type: 'ghost',
				...createObjectSignal(0, 'x'),
				y,
				ghostY,
				setGhostY,
				bob,
				setBob,
				opacity,
				setOpacity,
				out,
				setOut,
				...createObjectSignal(1, 'xScale'),
				...createObjectSignal(0, 'rotation'),
				width,
				height,
				style: () => ({
					display: out() && size() ? 'block' : 'none',
					opacity: opacity(),
					'clip-path': `inset(0 0 ${Math.max(0, y() + height() - FLOOR_Y)}px 0)`,
				}),
			}
		},
		onEnterFrame({ $, $scene, $age }) {
			if (!isHalloween()) {
				if (state !== 'waiting') {
					state = 'waiting'
					wait = between(FIRST_WAIT) + index * FIRST_STAGGER
					$.setOut(false)
				}
				return
			}
			// Waiting on the image the first time round, to know how tall it is.
			if (!size()) return

			const sceneWidth = $scene.canvas.get().width()
			const skyPoint = () => ({
				x: Math.random() * Math.max(0, sceneWidth - width()),
				y: Math.random() * SKY_BOTTOM,
			})
			// The step this tick along a sway of `SWAY` either side.
			const sway = Math.cos($age * SWAY_SPEED + phase) * SWAY * SWAY_SPEED
			// Fully faded in once it's clear of the floor, and out again as it
			// goes back under.
			const emerged = Math.min(
				1,
				Math.max(0, (FLOOR_Y - $.ghostY()) / height()),
			)

			switch (state) {
				case 'waiting': {
					if (--wait > 0) return
					state = 'rising'
					$.setX(Math.random() * Math.max(0, sceneWidth - width()))
					$.setGhostY(FLOOR_Y)
					$.setRotation(0)
					$.setOut(true)
					break
				}

				case 'rising': {
					$.setGhostY($.ghostY() - RISE_SPEED)
					$.setX($.x() + sway)
					// Clear of the ground with a bit to spare: off into the sky.
					if ($.ghostY() + height() < FLOOR_Y - 12) {
						state = 'flying'
						flight = between(FLIGHT)
						vx = 0
						vy = -RISE_SPEED
						target = skyPoint()
					}
					break
				}

				case 'flying':
				case 'landing': {
					const distance = steer($.x(), $.ghostY())
					$.setX($.x() + vx)
					$.setGhostY($.ghostY() + vy)

					// Faces the way it's going, but only once it's really going
					// that way, so it doesn't flip back and forth on the spot.
					if (vx > 0.3) $.setXScale(-1)
					else if (vx < -0.3) $.setXScale(1)
					$.setRotation(
						Math.max(
							-MAX_LEAN,
							Math.min(MAX_LEAN, (vx / FLY_SPEED) * MAX_LEAN),
						),
					)

					if (state === 'flying') {
						if (--flight <= 0) {
							// Somewhere nearby to go back down, just above the floor.
							state = 'landing'
							target = {
								x: Math.max(
									0,
									Math.min(
										sceneWidth - width(),
										$.x() + (Math.random() - 0.5) * 300,
									),
								),
								y: FLOOR_Y - height() - 4,
							}
						} else if (distance < 20) {
							target = skyPoint()
						}
					} else if (distance < 4) {
						// Upright before it goes under, or the floor's edge would
						// cut it off at a slant.
						state = 'sinking'
						$.setRotation(0)
					}
					break
				}

				case 'sinking': {
					$.setGhostY($.ghostY() + SINK_SPEED)
					$.setX($.x() + sway)
					if ($.ghostY() >= FLOOR_Y) {
						state = 'waiting'
						wait = between(WAIT)
						$.setOut(false)
					}
					break
				}
			}

			$.setBob(
				state === 'flying' || state === 'landing'
					? Math.sin($age * BOB_SPEED + phase) * BOB
					: 0,
			)
			$.setOpacity(
				emerged * (OPACITY + Math.sin($age * FLICKER_SPEED + phase) * FLICKER),
			)
		},
	})
}

export type GhostController = ReturnType<typeof createGhostController>
