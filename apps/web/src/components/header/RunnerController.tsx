import {
	RUNNER_SIZE,
	type RunnerState,
	findRunnerSignal,
	type runners,
} from '@/data/runners'
import { type Scene, createController, createObjectSignal } from '@/engine'
import { ZOMBIE_PACE, ZOMBIE_TINT, isHalloween } from '@/utils/halloween'
import { imageSize } from '@/utils/imageSize'
import { css } from '@style/css'
import type { Accessor, JSX } from 'solid-js'
import { createCameraFlashController } from './CameraFlashController'
import { createPumpkinController, pumpkinAt } from './PumpkinController'

export const RUNNER_LABEL_RENDER_DISTANCE = 50

const STANDING_STATES: RunnerState[] = [
	'scanner',
	'photographer',
	'run-director',
	'marshal',
	'number-checker',
]

export function isStandingState(state: RunnerState): boolean {
	return STANDING_STATES.includes(state)
}

/**
 * What a runner is doing in the header: their volunteer post from the latest
 * Saturday, except in Halloween mode, when everyone's out running — it's more
 * fun with the whole club in the zombie game.
 */
export function headerState(state: RunnerState | undefined): RunnerState {
	return isHalloween() ? 'run' : (state ?? 'run')
}

/** Find a random x position that doesn't overlap any other standing-state runners.
 *  When `groupWith` is provided (same-role runners), try to place adjacent to the cluster first. */
function findNonOverlappingX(
	canvasWidth: number,
	myWidth: number,
	others: { x: number; width: number }[],
	groupWith?: { x: number; width: number }[],
): number {
	const margin = 40
	const groupGap = 8 // tight spacing between grouped runners

	// 1. Must fit within 100% of the viewport
	const absStart = 0
	const absEnd = canvasWidth - myWidth

	// --- Try to cluster next to same-role runners first ---
	if (groupWith && groupWith.length > 0) {
		const clusterLeft = Math.min(...groupWith.map((o) => o.x))
		const clusterRight = Math.max(...groupWith.map((o) => o.x + o.width))

		// Candidate positions: immediately to the right or left of the cluster
		const candidates = [
			clusterRight + groupGap,
			clusterLeft - myWidth - groupGap,
		]

		const nonGroupOthers = others.filter(
			(o) => !groupWith.some((g) => g.x === o.x && g.width === o.width),
		)

		for (const candidate of candidates) {
			if (candidate < absStart || candidate > absEnd) continue
			const overlaps = nonGroupOthers.some(
				(o) =>
					candidate < o.x + o.width + margin &&
					candidate + myWidth + margin > o.x,
			)
			if (!overlaps) return candidate
		}
	}

	// 3. Preferred range: 35-55% of viewport
	const prefStart = Math.max(absStart, canvasWidth * 0.35)
	const prefEnd = Math.min(absEnd, canvasWidth * 0.55 - myWidth)

	// Try preferred range first, then fall back to full viewport
	const ranges =
		prefEnd > prefStart
			? [
					{ start: prefStart, end: prefEnd },
					{ start: absStart, end: absEnd },
				]
			: [{ start: absStart, end: absEnd }]

	for (const { start, end } of ranges) {
		if (end <= start) continue
		for (let attempts = 0; attempts < 50; attempts++) {
			const candidate = start + Math.random() * (end - start)
			// 2. Minimum 40px apart from others
			const overlaps = others.some(
				(o) =>
					candidate < o.x + o.width + margin &&
					candidate + myWidth + margin > o.x,
			)
			if (!overlaps) return candidate
		}
	}

	// Last resort: evenly distribute across the full viewport
	const totalCount = others.length + 1
	const slot = Math.round(canvasWidth / totalCount)
	const myIndex = others.length
	return Math.max(0, Math.min(absEnd, slot * myIndex + slot / 2 - myWidth / 2))
}

/** How far behind whoever they're tagging along with a follower runs. */
const FOLLOW_GAP = 28
/**
 * After being knocked apart: how much faster a follower runs to catch back up,
 * or slower to let their leader come back past.
 */
const CATCH_UP_PACE = 1.6
const WAIT_PACE = 0.4
/**
 * Further apart than this and one of them has gone round the loop off the
 * edge, so whoever looks behind is really ahead.
 */
const LAPPED = 400
/** The random extra on each stride, as a share of their speed. */
const STRIDE_JITTER = 0.4

export function createRunnerController(
	id: string,
	runnerId: keyof typeof runners | string,
	yShift: number,
	scene: Scene,
	mousePosition: Accessor<{ x: number; y: number }>,
) {
	const [runner] = findRunnerSignal(runnerId) ?? []
	if (!runner) throw new Error(`Runner "${runnerId}" not found`)
	const runFrames = () => runner().frames.run ?? []
	const baseY = 124 + yShift
	let flashTriggered = false
	let flashCounter = 0
	let pace = 1
	let separated = false
	const FLASH_PROXIMITY = 60

	const controller = createController({
		frames: [...runFrames()],
		randomStartFrame: true,
		init() {
			const { x, setX } = createObjectSignal(
				scene.canvas.get().width() * Math.random(),
				'x',
			)
			const { y, setY } = createObjectSignal(baseY, 'y')
			const width = () => runner().width * RUNNER_SIZE
			const height = () => runner().height * RUNNER_SIZE
			// Whether they're drawn in their sit sprite, which puts their head
			// lower and further back than it is in all the others.
			const { seated, setSeated } = createObjectSignal(false, 'seated')
			const { activeState, setActiveState } = createObjectSignal(
				'run' as RunnerState,
				'activeState',
			)
			// Stood at a post in one of their volunteer sprites, which are drawn
			// facing right — the run and sit sprites all face left, the way they run.
			const standing = () => !seated() && isStandingState(activeState())
			const { frames, setFrames } = createObjectSignal(runFrames(), 'frames')
			// The size of the image they're drawn from when it's a single one,
			// sitting or at a volunteer post, rather than their run strip.
			const still = () => {
				const frame = frames()[0]
				return frame && !frame.includes('#') ? imageSize(frame) : undefined
			}
			// How far a single image drawn feet on the ground sits below the top
			// of their box, in the sprite's own pixels: a sit sprite's a row or
			// so shorter than their run frames.
			const drop = () => {
				const size = still()
				return size ? runner().height - size.height : 0
			}
			const { zombie, setZombie } = createObjectSignal(false, 'zombie')
			// How much of their usual speed they're managing.
			const undeadPace = () => (zombie() ? ZOMBIE_PACE : 1)
			return {
				id,
				type: 'runner',
				state: () => 'play',
				runnerId,
				// A slower runner's legs go round slower too, so they don't slide.
				frameInterval: () => runner().frameInterval / undeadPace(),
				x,
				setX,
				y,
				setY,
				...createObjectSignal(baseY, 'baseY'),
				...createObjectSignal(0, 'rotation'),
				...createObjectSignal(0, 'ySpeed'),
				...createObjectSignal(false, 'scooped'),
				frames,
				setFrames,
				...createObjectSignal(0, 'sitting'),
				seated,
				setSeated,
				activeState,
				setActiveState,
				// The middle of their head in whichever sprite they're drawn in, in
				// their sprite's own pixels, for anything worn on it.
				head: () => {
					const { sitHeadPoint, standHeadPoint, headPoint } = runner()
					// The first two are in their own images' pixels, which are drawn
					// feet on the ground, so they come down with them.
					const below = (point?: Vector) =>
						point && { x: point.x, y: point.y + drop() }
					if (seated()) return below(sitHeadPoint)
					if (standing()) return below(standHeadPoint) ?? headPoint
					return headPoint
				},
				// Which way they're facing, so anything worn on their head can too.
				facingRight: standing,
				// Whether a scoop has turned them into one of the undead. Only for as
				// long as Halloween lasts, and only for anyone drawn as a zombie. A
				// pumpkin cures them.
				zombie,
				setZombie,
				undeadPace,
				// The pumpkin they've picked up off the path, if they're wearing one.
				...createObjectSignal(undefined as string | undefined, 'wornPumpkin'),
				inner: {
					style: (): JSX.CSSProperties => {
						const size = still()
						return {
							// On the frame image alone, so their pumpkin stays orange.
							...(zombie() ? { filter: ZOMBIE_TINT } : {}),
							// A single image at its own size, feet on the ground, rather
							// than stretched to fill a box the size of their run frames.
							...(size
								? {
										'background-size': `${size.width * RUNNER_SIZE}px ${size.height * RUNNER_SIZE}px`,
										'background-position': 'left bottom',
										'background-repeat': 'no-repeat',
									}
								: {}),
						}
					},
				},
				// How far they run in a tick, on average: what a furby aims ahead by.
				step: () =>
					runner().speed * pace * undeadPace() * (1 + STRIDE_JITTER / 2),
				// Where their feet touch the path, however high they've been flung.
				ground: () => baseY + height(),
				width,
				height,
				children: () => {
					// A carved pumpkin under the mouse has the say, with its own name.
					const closest = pumpkinAt(scene, mousePosition())
						? undefined
						: scene
								.getControllersByType<RunnerController>('runner')
								.map((c) => ({
									id: c.data.id,
									dist: Math.hypot(
										c.data.x() + c.data.width() / 2 - mousePosition().x,
										c.data.y() + c.data.height() / 2 - mousePosition().y,
									),
								}))
								.filter(({ dist }) => dist < RUNNER_LABEL_RENDER_DISTANCE)
								.sort((a, b) => a.dist - b.dist)[0]

					const name = runner().name
					const parts: string[] = []
					if (runner().latestTime && runnerId !== 'link')
						// biome-ignore lint/style/noNonNullAssertion: value guaranteed by surrounding logic
						parts.push(runner().latestTime!)
					if (runner().volunteerRoles?.length)
						// biome-ignore lint/style/noNonNullAssertion: value guaranteed by surrounding logic
						parts.push(...runner().volunteerRoles!)
					const suffix = parts.length ? ` - ${parts.join(', ')}` : ''

					return (
						<div
							style={{
								display: closest?.id === id ? 'block' : 'none',
								transform:
									runnerId === 'lyra' || runnerId === 'link'
										? 'translate(-50%, -50%)'
										: 'translate(-50%, -150%)',
							}}
							class={css({
								position: 'absolute',
								background: 'var(--color-black)',
								left: '50%',
								color: 'var(--color-white)',
								fontFamily: '"Jersey 10", sans-serif',
								fontSize: '12px',
								p: '0px 8px',
								width: 'max-content',
								borderRadius: '3px',
								cornerShape: 'notch',
							})}
						>
							{name + suffix}
						</div>
					)
				},
			}
		},
		onEnterFrame({ $, $scene }) {
			const state = headerState(runner().runnerState)

			// Halloween's over: the undead are themselves again.
			if ($.zombie() && !isHalloween()) $.setZombie(false)

			// Transition into/out of standing states
			if (state !== $.activeState()) {
				$.setActiveState(state)

				if (isStandingState(state)) {
					// Position for standing: fixed y of 150, non-overlapping x
					const otherStanding = $scene
						.getControllersByType<RunnerController>('runner')
						.filter(
							(c) => c.data.id !== id && isStandingState(c.data.activeState()),
						)
						.map((c) => ({ x: c.data.x(), width: c.data.width() }))

					// Collect same-role runners so scanners (& timekeepers) cluster together
					const sameRole =
						state === 'scanner'
							? $scene
									.getControllersByType<RunnerController>('runner')
									.filter(
										(c) =>
											c.data.id !== id && c.data.activeState() === 'scanner',
									)
									.map((c) => ({ x: c.data.x(), width: c.data.width() }))
							: undefined

					$.setX(
						findNonOverlappingX(
							$scene.canvas.get().width(),
							$.width(),
							otherStanding,
							sameRole,
						),
					)
					$.setY(110)
					$.setScooped(false)
					$.setRotation(0)
				} else {
					// Returning to a moving state — reset y
					$.setY(baseY)
				}
			}

			// --- Standing states (scanner, photographer, etc.) ---
			if (isStandingState(state)) {
				let frames: string[] | undefined
				if (state === 'scanner') frames = runner().frames.scanner
				else if (state === 'photographer') frames = runner().frames.photographer
				else if (state === 'run-director') frames = runner().frames.runDirector
				else if (state === 'marshal') frames = runner().frames.marshal
				else if (state === 'number-checker')
					frames = runner().frames.numberChecker

				// Fall back to volunteerGeneric, then sit frame if no specific sprite
				if (!frames) frames = runner().frames.volunteerGeneric
				$.setSeated(!frames)
				if (!frames) frames = runner().frames.sit

				if (frames?.length) $.setFrames(runFrames().map(() => frames[0]))
				// No movement, no scooping — just render in place
				return
			}

			// --- Moving states (run, tail-walker) ---
			const isTailWalker = state === 'tail-walker'

			// If connected to another runner, follow them instead of running. With
			// either of them knocked down or flung by the bus, each is on their own
			// until both are back up; then the follower catches up, or eases off to
			// let them past, until they're running together again. A zombie
			// shambles along on its own until a pumpkin brings it back to its senses.
			pace = 1
			if (runner().connectedTo && !isStandingState(state)) {
				const leader = $scene
					.getControllersByType<RunnerController>('runner')
					.find(
						(controller) => controller.data.runnerId === runner().connectedTo,
					)?.data
				if (leader) {
					const spot = leader.x() + FOLLOW_GAP
					const behind = $.x() - spot
					if (
						$.sitting() > 0 ||
						$.scooped() ||
						$.zombie() ||
						leader.sitting() > 0 ||
						leader.scooped()
					) {
						separated = true
					} else if (!separated || Math.abs(behind) < runner().speed * 2) {
						separated = false
						$.setX(spot)
					} else {
						const lapped = Math.abs(behind) > LAPPED
						pace = behind > 0 !== lapped ? CATCH_UP_PACE : WAIT_PACE
					}
				}
			}

			// Sitting
			if ($.sitting() > 0) {
				$.setSitting($.sitting() - 1)
				const sitFrames =
					isTailWalker && runner().frames.tailSit
						? // biome-ignore lint/style/noNonNullAssertion: value guaranteed by surrounding logic
							runner().frames.tailSit!
						: runner().frames.sit
				if (sitFrames?.length) $.setFrames(runFrames().map(() => sitFrames[0]))
				$.setSeated(true)
			}

			// Running
			else if (!$.scooped()) {
				if ($.zombie()) {
					// biome-ignore lint/style/noNonNullAssertion: only set when they have them
					$.setFrames(runner().frames.zombie!)
				} else if (isTailWalker && runner().frames.tailWalk) {
					// biome-ignore lint/style/noNonNullAssertion: value guaranteed by surrounding logic
					$.setFrames(runner().frames.tailWalk!)
				} else {
					$.setFrames(runFrames())
				}
				$.setSeated(false)
				$.setX(
					$.x() -
						runner().speed *
							pace *
							$.undeadPace() *
							(1 + Math.random() * STRIDE_JITTER),
				)
				$.setRotation(Math.random() * 3 - 0.5)
			}

			// Scooped
			else {
				$.setY($.y() + $.ySpeed())
				$.setYSpeed($.ySpeed() + 3)

				// If hit the ground, reset
				if ($.y() >= $.baseY()) {
					$.setY($.baseY())
					$.setScooped(false)
					$.setSitting(Math.random() * 30 + 30)
					// Scooped during Halloween, they hit the ground undead.
					if (isHalloween() && runner().frames.zombie?.length) $.setZombie(true)
				}
			}

			if ($.x() < -100) {
				$.setX($scene.canvas.get().width() + 50 + Math.random() * 50)
				$.setY(baseY)
				flashTriggered = false
			}

			// Camera flash: when this runner passes a photographer, trigger a flash
			if (!flashTriggered && !$.scooped()) {
				const photographers = $scene
					.getControllersByType<RunnerController>('runner')
					.filter(
						(c) => c.data.id !== id && c.data.activeState() === 'photographer',
					)

				for (const photographer of photographers) {
					const dx = Math.abs(
						$.x() +
							$.width() / 2 -
							(photographer.data.x() + photographer.data.width() / 2),
					)
					if (dx < FLASH_PROXIMITY) {
						flashTriggered = true
						const flashX = photographer.data.x() + photographer.data.width() / 2
						const flashY =
							photographer.data.y() + photographer.data.height() * 0.3
						const flashId = `flash-${id}-${flashCounter++}`
						$scene.addController(
							createCameraFlashController(flashId, flashX, flashY),
						)
						break
					}
				}
			}
		},
	})

	// A pumpkin they've picked up goes on as part of them rather than as its own
	// thing in the scene, so it's drawn inside their box and moves and tips with
	// them without having to follow along.
	controller.attach(createPumpkinController(controller))

	return controller
}

export type RunnerController = ReturnType<typeof createRunnerController>
