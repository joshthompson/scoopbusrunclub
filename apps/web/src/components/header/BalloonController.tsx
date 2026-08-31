import black0Asset from '@/assets/balloons/black-0.png'
import black1Asset from '@/assets/balloons/black-1.png'
import purple2Asset from '@/assets/balloons/purple-2.png'
import purple5Asset from '@/assets/balloons/purple-5.png'
import red0Asset from '@/assets/balloons/red-0.png'
import red5Asset from '@/assets/balloons/red-5.png'
import { RUNNER_SIZE, findRunnerSignal } from '@/data/runners'
import { type Scene, createController, createObjectSignal } from '@/engine'
import { type RunnerController, isStandingState } from './RunnerController'

interface BalloonDigit {
	src: string
	/** Native art size, drawn at `RUNNER_SIZE` like the runners themselves. */
	width: number
	height: number
}

const DIGITS = {
	black0: { src: black0Asset, width: 22, height: 23 },
	black1: { src: black1Asset, width: 20, height: 21 },
	purple2: { src: purple2Asset, width: 18, height: 21 },
	purple5: { src: purple5Asset, width: 22, height: 23 },
	red0: { src: red0Asset, width: 22, height: 23 },
	red5: { src: red5Asset, width: 22, height: 23 },
} satisfies Record<string, BalloonDigit>

/**
 * The parkrun milestones we fly balloons for, each spelled out left to right in
 * the order the digits are read. Add a milestone here and the header picks it
 * up — the art it needs is `assets/balloons/{colour}-{digit}.png`.
 */
export const MILESTONE_BALLOONS: Record<number, BalloonDigit[]> = {
	10: [DIGITS.black1, DIGITS.black0],
	25: [DIGITS.purple2, DIGITS.purple5],
	50: [DIGITS.red5, DIGITS.red0],
	100: [DIGITS.black1, DIGITS.black0, DIGITS.black0],
}

/** Whether a run total is one we have balloons for. */
export function isBalloonMilestone(totalRuns: number | undefined): boolean {
	return totalRuns !== undefined && totalRuns in MILESTONE_BALLOONS
}

/** The controller types a bunch is made of, for clearing one out again. */
const BALLOON_TYPE = 'balloon'
const STRING_TYPE = 'balloon-string'
const BUNCH_TYPE = 'balloon-bunch'

const STRING_THICKNESS = 2
const STRING_COLOR = 'rgba(0, 0, 0, 0.55)'
/**
 * How far up the runner's hand a single string runs before it splits into one
 * per balloon — the way a real bunch is held.
 */
const SPLIT_FRACTION = 2 / 3
/** Straight runs per string. Three is enough to read as a curve at this scale. */
const STRING_SEGMENTS = 3
/** How far a string bows off straight, as a share of the gap it spans. */
const STRING_DROOP = 0.09
/** How much of that bow comes and goes, and how fast. */
const STRING_BREATH = 0.3
const STRING_BREATH_SPEED = 0.035

/** Where the balloons sit, relative to where the strings are held. */
const FLOAT_HEIGHT = 68 // straight up
const TRAIL_GAP = 16 // behind the runner, before the first balloon
const BALLOON_GAP = 4 // between balloons
/**
 * How much lower the second digit hangs than the ones either side of it. Packed
 * close enough to read as one number the digits would foul each other as they
 * lean, and dropping the middle one out of the way is what buys the space.
 */
const MIDDLE_DIGIT_DROP = 22

/**
 * The top of the path, from the header's own background. Nothing in a bunch is
 * allowed below it — a balloon down among the feet looks like a dropped one.
 */
const PATH_TOP = 158

/** Idle drift, so no two balloons — nor the runner — ever look pinned together. */
const DRIFT_X = 5
const DRIFT_Y = 6
const DRIFT_X_SPEED = 0.041
const DRIFT_Y_SPEED = 0.058

/**
 * The string, as a spring. Slack enough that the balloons stream out behind a
 * running runner, and slacker still mid-scoop so they're late following them up.
 */
const SPRING = 0.1
const SCOOPED_SPRING = 0.022
const DAMPING = 0.86

/**
 * Past this much sideways jump the runner has wrapped around the header rather
 * than run anywhere. Sideways only — a scooped runner is flung hundreds of
 * pixels up over the top of the scene, and their balloons should be left
 * trailing after them rather than teleported along.
 */
const SNAP_DISTANCE = 400
/**
 * How much of the string's angle the balloon takes on. Helium keeps it mostly
 * upright, so being towed only tips it — it never lies along its own string.
 */
const LEAN_FACTOR = 0.25
const MAX_LEAN = 16 // degrees
const WOBBLE = 3 // degrees of sway on top of the pull
const TILT = 5 // degrees each balloon hangs off true, one from the next

/**
 * Whether this runner is stood at a post rather than running. Read off the
 * runner's own data rather than the controller's `activeState`, which only
 * catches up on the first frame.
 */
function isStanding(runner: RunnerController) {
	const [data] = findRunnerSignal(runner.data.runnerId) ?? []
	return isStandingState(data?.().runnerState ?? 'run')
}

/** A number somewhere in `[centre - spread, centre + spread]`. */
function vary(centre: number, spread: number) {
	return centre + (Math.random() * 2 - 1) * spread
}

/** One straight run of string, drawn between two points that both move. */
function createStringSegment(
	id: string,
	from: () => Vector,
	to: () => Vector,
	onFrame?: (age: number) => void,
) {
	return createController({
		onEnterFrame: onFrame ? ({ $age }) => onFrame($age) : undefined,
		init: () => ({
			id,
			type: STRING_TYPE,
			x: () => from().x,
			y: () => from().y,
			width: () => Math.hypot(to().x - from().x, to().y - from().y),
			height: () => STRING_THICKNESS,
			// Laid along the line between its two ends, so it stays tied to both
			// however far the balloon lags behind.
			rotation: () => {
				const start = from()
				const end = to()
				return (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI
			},
			origin: () => ({ x: 0, y: STRING_THICKNESS / 2 }),
			style: () => ({ background: STRING_COLOR }),
		}),
	})
}

/**
 * A length of string as a few straight runs along a curve, since string doesn't
 * hang in straight lines. The bow is vertical, so a string pulled taut and
 * upright barely shows one and a shallow, trailing one droops — and it breathes,
 * so a bunch being towed along never looks wired together.
 */
function createStringControllers(
	idPrefix: string,
	from: () => Vector,
	to: () => Vector,
) {
	const droop = vary(STRING_DROOP, STRING_DROOP * 0.3)
	const breathSpeed = vary(STRING_BREATH_SPEED, STRING_BREATH_SPEED * 0.3)
	const phase = Math.random() * Math.PI * 2
	let tick = 0

	// The Bézier control point: the midpoint of the two ends, pulled down by a
	// share of how far apart they are.
	const point = (t: number): Vector => {
		const start = from()
		const end = to()
		const sag =
			Math.hypot(end.x - start.x, end.y - start.y) *
			droop *
			(1 + Math.sin(tick * breathSpeed + phase) * STRING_BREATH)
		const cx = (start.x + end.x) / 2
		const cy = (start.y + end.y) / 2 + sag
		const u = 1 - t
		return {
			x: u * u * start.x + 2 * u * t * cx + t * t * end.x,
			y: u * u * start.y + 2 * u * t * cy + t * t * end.y,
		}
	}

	// The first segment carries the clock for the whole string. It doesn't need
	// to be a signal: every point the string draws from moves each frame anyway,
	// so the breath is recomputed along with them.
	return Array.from({ length: STRING_SEGMENTS }, (_, i) =>
		createStringSegment(
			`${idPrefix}-${i}`,
			() => point(i / STRING_SEGMENTS),
			() => point((i + 1) / STRING_SEGMENTS),
			i === 0
				? (age) => {
						tick = age
					}
				: undefined,
		),
	)
}

function createBalloon(
	id: string,
	runner: RunnerController,
	anchor: () => Vector,
	digit: BalloonDigit,
	restX: () => number,
	restY: number,
	phase: number,
) {
	const width = digit.width * RUNNER_SIZE
	const height = digit.height * RUNNER_SIZE

	// Where the string meets the balloon. The balloon hangs off this point and
	// pivots around it, so it's the one bit of state the bunch works from.
	const start = anchor()
	const { knotX, setKnotX } = createObjectSignal(start.x + restX(), 'knotX')
	const { knotY, setKnotY } = createObjectSignal(
		Math.min(start.y + restY, PATH_TOP),
		'knotY',
	)
	let vx = 0
	let vy = 0
	// The lean's own clock. It doesn't need to be a signal: the lean recomputes
	// off the knot regardless, and that moves every frame.
	let tick = 0

	// No two balloons are inflated, tied or filled quite alike, so each gets its
	// own hang, sway and give against the string.
	const tilt = vary(0, TILT)
	const wobble = vary(WOBBLE, WOBBLE * 0.4)
	const wobbleSpeed = vary(DRIFT_X_SPEED, DRIFT_X_SPEED * 0.3)
	const leanFactor = vary(LEAN_FACTOR, LEAN_FACTOR * 0.2)
	const driftX = vary(DRIFT_X, DRIFT_X * 0.3)
	const driftY = vary(DRIFT_Y, DRIFT_Y * 0.3)

	const controller = createController({
		frames: [digit.src],
		init: () => ({
			id,
			type: BALLOON_TYPE,
			x: () => knotX() - width / 2,
			y: () => knotY() - height,
			width: () => width,
			height: () => height,
			// Tip the balloon towards wherever its string is heading, so being towed
			// leans it back and being scooped swings it over.
			rotation: () => {
				const held = anchor()
				const stringAngle =
					(Math.atan2(knotX() - held.x, held.y - knotY()) * 180) / Math.PI
				const lean = Math.max(
					-MAX_LEAN,
					Math.min(MAX_LEAN, stringAngle * leanFactor),
				)
				return lean + tilt + Math.sin(tick * wobbleSpeed + phase) * wobble
			},
			origin: () => ({ x: width / 2, y: height }),
		}),
		onEnterFrame({ $age }) {
			tick = $age
			const held = anchor()
			const targetX =
				held.x + restX() + Math.sin($age * wobbleSpeed + phase) * driftX
			const targetY = Math.min(
				held.y + restY + Math.sin($age * DRIFT_Y_SPEED + phase * 1.7) * driftY,
				PATH_TOP,
			)

			// A runner who ran off the left edge is put back out beyond the right
			// one; drag the balloons across with them rather than across the header.
			if (Math.abs(targetX - knotX()) > SNAP_DISTANCE) {
				setKnotX(targetX)
				setKnotY(targetY)
				vx = 0
				vy = 0
				return
			}

			const spring = runner.data.scooped() ? SCOOPED_SPRING : SPRING
			vx = (vx + (targetX - knotX()) * spring) * DAMPING
			vy = (vy + (targetY - knotY()) * spring) * DAMPING
			setKnotX(knotX() + vx)

			// Coming back down off a scoop, a balloon carries enough speed to end up
			// among the runners' feet. Stop it at the path and drop the speed with it,
			// so it settles back up to the bunch rather than bouncing off the ground.
			const y = knotY() + vy
			if (y > PATH_TOP) vy = 0
			setKnotY(Math.min(y, PATH_TOP))
		},
	})

	return {
		controller,
		knot: () => ({ x: knotX(), y: knotY() }),
		/** The balloon's right edge, for working out when a bunch has left. */
		right: () => knotX() + width / 2,
	}
}

/**
 * Balloons for a runner who has just run a milestone, on a single string out of
 * their hand that splits into one per balloon. Strings come first so all of them
 * are drawn behind the bunch.
 */
export function createBalloonControllers(
	runner: RunnerController,
	milestone: number,
) {
	const digits = MILESTONE_BALLOONS[milestone]
	if (!digits) return []

	const [runnerData] = findRunnerSignal(runner.data.runnerId) ?? []

	// Strings are held at the middle of the runner, which for the sprites drawn
	// at an odd size — a child, or a parent behind a pram — is not the middle of
	// the sprite box they're drawn in.
	const held = (): Vector => {
		const centre = runnerData?.().centerPoint
		return {
			x:
				runner.data.x() +
				(centre ? centre.x * RUNNER_SIZE : runner.data.width() / 2),
			y:
				runner.data.y() +
				(centre ? centre.y * RUNNER_SIZE : runner.data.height() / 2),
		}
	}

	// The point the bunch is actually tied to. It follows the runner, except
	// through the wrap below, where it carries on off the edge without them.
	const first = held()
	const { anchorX, setAnchorX } = createObjectSignal(first.x, 'anchorX')
	const { anchorY, setAnchorY } = createObjectSignal(first.y, 'anchorY')
	const anchor = (): Vector => ({ x: anchorX(), y: anchorY() })

	// The digits always read left to right, but which side of the runner the row
	// sits on doesn't: a runner tows their balloons behind them, while someone
	// stood at their post is just holding a bunch, and that reads better on the
	// other side. Reversed, the strings run the other way too, so every balloon
	// leans the other way along with them.
	const rowWidth = digits.reduce(
		(total, digit, i) =>
			total + digit.width * RUNNER_SIZE + (i ? BALLOON_GAP : 0),
		0,
	)
	const rowStart = () =>
		isStanding(runner) ? -TRAIL_GAP - rowWidth : TRAIL_GAP

	let alongRow = 0
	const balloons = digits.map((digit, i) => {
		const width = digit.width * RUNNER_SIZE
		const centreOfRow = alongRow + width / 2
		alongRow += width + BALLOON_GAP
		return createBalloon(
			`${runner.data.id}-balloon${i}`,
			runner,
			anchor,
			digit,
			() => rowStart() + centreOfRow,
			-FLOAT_HEIGHT + (i === 1 ? MIDDLE_DIGIT_DROP : 0),
			// Spread the digits' drift apart, and each runner's bunch apart from the
			// next, so nothing in the header ever bobs in step.
			i * 1.9 + Math.random() * Math.PI * 2,
		)
	})

	/**
	 * A runner who reaches the left edge is put straight back out beyond the
	 * right one. Their balloons shouldn't be dragged across the header after
	 * them, so the tie-point keeps sailing left at the pace it was going and only
	 * re-joins the runner once the last balloon is over the edge — by which time
	 * the runner is still out beyond the right, and the bunch comes back in
	 * behind them the way it left.
	 */
	let step = -1
	let sailing = false
	const bunch = createController({
		init: () => ({
			id: `${runner.data.id}-bunch`,
			type: BUNCH_TYPE,
			x: anchorX,
			y: anchorY,
			width: () => 0,
			height: () => 0,
		}),
		onEnterFrame() {
			const runnerAt = held()

			if (sailing) {
				setAnchorX(anchorX() + step)
				if (balloons.every((balloon) => balloon.right() < 0)) {
					sailing = false
					setAnchorX(runnerAt.x)
					setAnchorY(runnerAt.y)
				}
				return
			}

			if (runnerAt.x - anchorX() > SNAP_DISTANCE) {
				sailing = true
				return
			}

			// Always leftward, so a bunch can never be left sailing on the spot.
			step = Math.min(runnerAt.x - anchorX(), -1)
			setAnchorX(runnerAt.x)
			setAnchorY(runnerAt.y)
		},
	})

	// Where the one string becomes several: partway along the run from the hand
	// out to the middle of the bunch, so the split travels with the balloons.
	const split = (): Vector => {
		const held = anchor()
		const bunchX =
			balloons.reduce((sum, b) => sum + b.knot().x, 0) / balloons.length
		const bunchY =
			balloons.reduce((sum, b) => sum + b.knot().y, 0) / balloons.length
		return {
			x: held.x + (bunchX - held.x) * SPLIT_FRACTION,
			y: held.y + (bunchY - held.y) * SPLIT_FRACTION,
		}
	}

	return [
		// The tie-point goes first: it draws nothing, but every other part of the
		// bunch reads the position it sets.
		bunch,
		...createStringControllers(`${runner.data.id}-string`, anchor, split),
		...balloons.flatMap((balloon, i) =>
			createStringControllers(
				`${runner.data.id}-string${i}`,
				split,
				balloon.knot,
			),
		),
		...balloons.map((balloon) => balloon.controller),
	]
}

declare global {
	interface Window {
		setBalloons: (runnerId?: string, milestone?: number) => string
	}
}

/** Every part of one runner's bunch, so it can be cleared without the others. */
function isBunchPart(type: string, id: string, ownerId?: string) {
	if (type !== BALLOON_TYPE && type !== STRING_TYPE && type !== BUNCH_TYPE) {
		return false
	}
	return ownerId === undefined || id.startsWith(`${ownerId}-`)
}

/**
 * `setBalloons('josh', 50)` from the browser console flies that milestone's
 * balloons behind that runner. `setBalloons('josh')` takes them off again, and
 * `setBalloons()` clears the header and lists who's out there. A milestone only
 * comes round every few months, so this is the only way to see them in between.
 * Art for a milestone nobody has hit isn't preloaded, so it may pop in a frame
 * late.
 */
export function registerBalloonConsoleHook(scene: Scene) {
	if (typeof window === 'undefined') return

	const runners = () => scene.getControllersByType<RunnerController>('runner')
	const clear = (ownerId?: string) => {
		for (const { id, controller } of scene.controllers.get()) {
			if (isBunchPart(controller.type, id, ownerId)) scene.removeController(id)
		}
	}

	window.setBalloons = (runnerId, milestone) => {
		if (!runnerId) {
			clear()
			return `balloons: cleared — setBalloons(runnerId, milestone) with one of ${runners()
				.map((runner) => runner.data.runnerId)
				.join(', ')}`
		}

		// This used to take the milestone on its own, so say so rather than throwing
		// on the old call.
		if (typeof runnerId !== 'string') {
			return `setBalloons takes a runner first now — setBalloons(runnerId, ${runnerId})`
		}

		const runner = runners().find(
			({ data }) => data.runnerId.toLowerCase() === runnerId.toLowerCase(),
		)
		if (!runner) return `no runner "${runnerId}" — try setBalloons()`

		// Checked before anything is cleared, so a typo doesn't take away the bunch
		// you were looking at.
		if (milestone && !MILESTONE_BALLOONS[milestone]) {
			const known = Object.keys(MILESTONE_BALLOONS).join(', ')
			return `no balloons for ${milestone} — we have ${known}`
		}

		// Whatever they were carrying goes first, so a second call swaps the
		// milestone over rather than piling another bunch on top of it.
		clear(runner.data.id)
		if (!milestone) return `balloons: none for ${runnerId}`

		// Slotted in at the depth the header would have put it — behind the bus and
		// every runner for someone stood at a post, in front of the bus for someone
		// running — rather than appended on top, which would have the preview lie
		// about the one thing hardest to get right.
		const added = createBalloonControllers(runner, milestone)
		for (const controller of added) controller.setGame(scene)

		const current = scene.controllers.get()
		const before = (type: string) =>
			current.findIndex((entry) => entry.controller.type === type)
		const at = isStanding(runner)
			? before('runner') // standing runners are the first ones added
			: before('bus') + 1
		const index = at <= 0 ? current.length : at
		scene.controllers.set([
			...current.slice(0, index),
			...added.map((controller) => ({ id: controller.id, controller })),
			...current.slice(index),
		])

		return `balloons: ${milestone} on ${runnerId}`
	}
}
