import pumpkin1Asset from '@/assets/halloween/pumpkin1.png'
import pumpkin2Asset from '@/assets/halloween/pumpkin2.png'
import pumpkin3Asset from '@/assets/halloween/pumpkin3.png'
import pumpkin4Asset from '@/assets/halloween/pumpkin4.png'
import pumpkin5Asset from '@/assets/halloween/pumpkin5.png'
import tombstoneAsset from '@/assets/halloween/tombstone.png'
import rockAsset from '@/assets/misc/rock1.png'
import { type RunnerName, runners } from '@/data/runners'
import { imageSize } from '@/utils/imageSize'
import {
	createConnectedController,
	createController,
	createObjectSignal,
} from 'scoopjs'
import { For, Index, type JSX, Show, createMemo, createSignal } from 'solid-js'
import barcodeAsset from '../assets/boosts/barcode.png'
// The website's bus, turned round to chase to the right.
import busBackAsset from '../assets/bus/bus-back.png'
import busAsset from '../assets/bus/bus.png'
import scoopAsset from '../assets/bus/scoop.png'
import wheel1Asset from '../assets/bus/wheel1.png'
import wheel2Asset from '../assets/bus/wheel2.png'
import wheel3Asset from '../assets/bus/wheel3.png'
import wheel4Asset from '../assets/bus/wheel4.png'
import windowAsset from '../assets/bus/windows.png'
import cyclist1Asset from '../assets/obstacles/cyclist-1.png'
import cyclist2Asset from '../assets/obstacles/cyclist-2.png'
import lowBranchLimbAsset from '../assets/obstacles/low-branch-limb.png'
import lowBranchTreeAsset from '../assets/obstacles/low-branch-tree.png'
import mudAsset from '../assets/obstacles/mud.png'
import mummyAsset from '../assets/obstacles/mummy.png'
import steamVentAsset from '../assets/obstacles/steam-vent.png'
import ventAsset from '../assets/rooftop/vent.png'
import purpleSignAsset from '../assets/signs/purple-sign.png'
import { GERM_FRAMES, GERM_POPPED, VALVE } from '../courses/kit/bodyScenery'
import { bouncyToadstool } from '../courses/kit/furbyScenery'
import { seeded } from '../courses/kit/seeded'
import { cone } from '../courses/kit/sewerScenery'
import type { CourseLook, Obstacle, PlatformDefinition } from '../courses/types'
import { boardOf } from '../game/boards'
import {
	GERM_SIZE,
	HEARTBEAT,
	beatAt,
	germHeight,
	valveOpen,
} from '../game/body'
import { inTunnel } from '../game/cave'
import {
	BARCODE_TALL,
	BARCODE_WIDTH,
	DEPTH_SLANT,
	HITBOX_HALF_WIDTH,
	LEFT_EDGE,
	PATH_BACK,
	PATH_FRONT,
	PX_PER_M,
	RUNNER_SCALE,
	SQUASHED,
	START_X,
	VERGE,
	VIEW_HEIGHT,
} from '../game/constants'
import { cyclistAt } from '../game/cyclists'
import { FIKA_SIZE } from '../game/fika'
import { FURBY_HEIGHT, FURBY_WIDTH, furbySquash } from '../game/furbies'
import { DRAWN_FROM } from '../game/groundColumns'
import type { Hat } from '../game/hats'
import { mummyAt } from '../game/mummies'
import { type PlatformAt, platformAt } from '../game/platforms'
import { heldLook } from '../game/portals'
import {
	BALLOON_HEIGHT,
	BALLOON_WIDTH,
	GULL_HEIGHT,
	GULL_WIDTH,
	RING_HEIGHT,
	RING_WIDTH,
	STORM_WIDTH,
	TURBINE_BLADE,
	balloonAt,
	gullsAt,
	stormAt,
	turbineAt,
	whaleAt,
} from '../game/sky'
import { steamPuff } from '../game/steam'
import { countdownWord, scoopFlight, stepWorld } from '../game/step'
import { tiltAt } from '../game/terrain'
import {
	TOWER_ARCH,
	TOWER_DOOR,
	TOWER_HEIGHT,
	TOWER_MERLON,
	TOWER_PIXEL,
	TOWER_WIDTH,
} from '../game/towers'
import type {
	Body,
	BoostState,
	Corgi,
	Flyer,
	Furby,
	ObstacleState,
	Pacer,
	Racer,
	TrickKind,
	World,
} from '../game/world'
import { ZOMBIE_SINK_GONE, zombieAt } from '../game/zombies'
import { customRunners } from '../runners/customRunners'
import { guests } from '../runners/guests'
import type { Playable } from '../runners/playable'
import { MEMBERS } from '../runners/playable'
import { zombieSprite } from '../runners/skeleton'
import { play } from '../sfx'
import { WallBricks } from './Backdrop'
import { Bubble } from './Bubble'
import { PixelArt } from './PixelArt'
import { Pixels } from './Pixels'
import { BusLegs, LEGS_HEIGHT, LEGS_OUT, LEGS_WIDTH } from './art/busLegs'
import { CONDOR_CELLS, condorFrame, condorFrames } from './art/condor'
import type { CorgiPose } from './art/corgi'
import { DRILL_AT, DRILL_HEIGHT, DRILL_POINT, DRILL_WIDTH } from './art/drill'
import { FikaArt } from './art/fika'
import { GEESE_HEIGHT, GeeseArt, geeseWidth } from './art/geese'
import {
	FACE_FRONT,
	FACE_HEIGHT,
	FACE_WIDTH,
	GiantFurbyFace,
} from './art/giantFurby'
import { BUS_GLIDER_HEIGHT, BUS_GLIDER_WIDTH, busGlider } from './art/glider'
import { HANDS_HEIGHT, HANDS_WIDTH, HandsArt } from './art/hands'
import { HatPicture, hatArt } from './art/hats'
import { KIDS_HEIGHT, KidsArt, kidsWidth } from './art/kids'
import { ROADBLOCK, ROADBLOCK_HEIGHT, ROADBLOCK_WIDTH } from './art/roadblock'
import {
	GIANT_VENT_HEIGHT,
	GIANT_VENT_WIDTH,
	GiantVentArt,
	SEWAGE_WIDTH,
	SWAMP_DRAWN,
	SWAMP_POOL_HEIGHT,
	SWAMP_POOL_WIDTH,
	SewageArt,
	SwampManArt,
} from './art/sewer'
import {
	BoardUnder,
	BusSpray,
	STOOD_HEIGHT,
	STOOD_WIDTH,
	StoodBoardArt,
	UNDER_LIFT,
} from './art/skis'
import {
	BalloonArt,
	GullArt,
	RingArt,
	StormArt,
	TurbineArt,
	WHALE_HEIGHT,
	WHALE_WIDTH,
	WhaleArt,
} from './art/sky'
import {
	GATE_HEIGHT,
	GATE_WIDTH,
	GateArt,
	RailArt,
	SNOWMAN_DRAWN,
	SNOWMAN_WIDTH,
	SnowmanArt,
} from './art/slopes'
import {
	SPLASH_HEIGHT,
	SPLASH_TICKS,
	SPLASH_UP,
	SPLASH_WIDTH,
	SplashArt,
} from './art/splash'
import {
	TOURISTS_DEPTH_ROOM,
	TOURISTS_HEIGHT,
	TouristsArt,
	touristsWidth,
} from './art/tourists'
import {
	HURDLE_LANES,
	HurdleArt,
	POTHOLE_ABOVE,
	POTHOLE_HEIGHT,
	PotholeArt,
	hurdleSize,
} from './art/track'
import { frontParapet, frontParapetCaps } from './battlements'
import { atSea, rideBus, startRide } from './busRide'
import { flyerLook } from './flyerLook'
import { headTop } from './heads'
import { PlatformArt, platformLook } from './platformArt'
import { rideLook } from './rideLook'

/**
 * Everything in the game is drawn by one of these: engine controllers, the
 * same as the header's runners and bus. None of them work anything out; they
 * draw what `stepWorld` decided, which the first of them runs every tick.
 */

/**
 * Runs the world: `step`s it, which is `stepWorld` unless it's someone else's
 * race being shown (see `Mirror`). Added first, so everything drawn after it
 * this tick is up to date.
 */
export function createGameController(
	world: World,
	step: (world: World) => void = stepWorld,
) {
	return createController({
		init: () => ({
			id: 'game',
			type: 'game',
			x: () => 0,
			y: () => 0,
			width: () => 0,
			height: () => 0,
		}),
		onEnterFrame: () => step(world),
	})
}

/** The size a single-image pose is drawn at: its own size, at runner scale. */
function poseSize(
	frame: string | undefined,
	fallback: { width: number; height: number },
) {
	const size = frame ? imageSize(frame) : undefined
	return {
		width: (size?.width ?? fallback.width) * RUNNER_SCALE,
		height: (size?.height ?? fallback.height) * RUNNER_SCALE,
	}
}

/** A member's volunteer pose, for cheering and run directing. They all face right. */
export function volunteerFrame(member: RunnerName) {
	const { frames } = runners[member][0]()
	return (
		frames.runDirector?.[0] ??
		frames.marshal?.[0] ??
		frames.photographer?.[0] ??
		frames.scanner?.[0] ??
		frames.volunteerGeneric?.[0]
	)
}

export function createPlayer(world: World, racer: Racer = world.racers[0]) {
	/** Up on a corgi's back, or a llama's, riding one. */
	const { saddle } = rideLook(world.course)
	/** Sat on a dragon's back, riding it, rather than hanging under a goose. */
	const seated = flyerLook(world.course).seat !== undefined
	const { sprite } = racer.runner
	const run = sprite.run
	const sit = sprite.sit
	const stand = sprite.stand
	const skiTuck = sprite.skiTuck
	const skiStance = sprite.ski
	const runSize = {
		width: sprite.width * RUNNER_SCALE,
		height: sprite.height * RUNNER_SCALE,
	}

	const { body } = racer
	/** On skis or a snowboard: which, if so. `body` isn't a signal: reading the tick keeps this up to date. */
	const board = createMemo(() => (world.ticks() >= 0 ? body.board : 0))
	/** Crouched on them: curled up in a trick, or in a heap, wiped out. */
	const crouched = (b: Body) => curled(b) || b.wipeout > 0
	// Sat down, ducking or riding a corgi; or crouched on skis. `body` isn't
	// a signal: reading the tick keeps this up to date.
	const ducking = () =>
		world.ticks() >= 0 &&
		(body.ducking ||
			body.mount > 0 ||
			(seated && body.carried > 0) ||
			(body.board > 0 && crouched(body))) &&
		!!sit
	/**
	 * Tucked down on skis, on the snow, or curled up in a trick: in their ski
	 * tuck, poles under their arms, if they've one. On a snowboard, ducked.
	 */
	const tucked = () =>
		world.ticks() >= 0 &&
		!!skiTuck &&
		body.board > 0 &&
		boardOf(body.board).kind === 'skis' &&
		body.wipeout === 0 &&
		(curled(body) || body.ducking)
	/** Stood up on skis, not a snowboard, in their ski pose, if they've one: poles in hand. */
	const onSkis = () =>
		world.ticks() >= 0 &&
		!!stanceOf(sprite, body.board) &&
		!tucked() &&
		!ducking()
	// Stood still, on their feet: on the start line, or stopped.
	const standing = () =>
		world.ticks() >= 0 &&
		!!stand &&
		!ducking() &&
		body.grounded &&
		body.carried === 0 &&
		racer.out !== 'scooped' &&
		Math.abs(body.vx) < STILL_SPEED
	// On a glider, lying along under its wing, head first, legs together:
	// the stand frame, turned over. On skis, stood up on them.
	const lying = () => world.ticks() >= 0 && (body.gliding || body.board > 0)
	/** How they're tipped, lying on a glider: nose up climbing, down diving. */
	let was = body.feetY
	let tilt = 0
	/** On skis in the air, how far they're pitched, nose up or down, smoothed. */
	let air = 0
	const [spray, setSpray] = createSignal(false)
	const [sparks, setSparks] = createSignal(false)
	/** The frame they're drawn in this tick, for where their head is in it. */
	const [shown, setShown] = createSignal<string>()
	/** Floating down in a propeller beanie: its propeller whirring. */
	const [floating, setFloating] = createSignal(false)
	/** The hat they've on, if any. `body` isn't a signal: reading the tick keeps this up to date. */
	const hat = createMemo(
		() => (world.ticks() >= 0 ? body.hat : undefined),
		undefined,
		{
			equals: (a, b) => a?.kind === b?.kind && a?.carving === b?.carving,
		},
	)

	return createController({
		frames: [
			...run,
			...(sit ? [sit] : []),
			...(stand ? [stand] : []),
			...(skiTuck ? [skiTuck] : []),
			...(skiStance ? [skiStance] : []),
			...(sprite.snowboard ? [sprite.snowboard] : []),
		],
		init() {
			const size = () =>
				// Stood, as tall and wide as a run frame: a custom runner's stand
				// is one frame of a strip, not a picture of its own.
				tucked()
					? poseSize(skiTuck, sprite)
					: ducking()
						? poseSize(sit, sprite)
						: onSkis()
							? poseSize(stanceOf(sprite, body.board), sprite)
							: runSize
			return {
				id: `player-${racer.id}`,
				type: 'player',
				...createObjectSignal(0, 'x'),
				...createObjectSignal(0, 'y'),
				width: () => size().width,
				height: () => size().height,
				frames: () =>
					tucked() && skiTuck
						? [skiTuck]
						: ducking() && sit
							? [sit]
							: onSkis()
								? [stanceOf(sprite, body.board) ?? stand ?? run[0]]
								: (standing() || lying()) && stand
									? [stand]
									: run,
				...createObjectSignal(undefined as number | undefined, 'frame'),
				// Run sprites face left, the way the header's runners run.
				...createObjectSignal(-1, 'xScale'),
				...createObjectSignal(0, 'rotation'),
				...createObjectSignal(100, 'frameInterval'),
				...createObjectSignal('pause' as 'play' | 'pause', 'state'),
				...createObjectSignal({} as JSX.CSSProperties, 'style'),
				// Their skis or snowboard, under their feet; and their hat, on
				// their head, wherever it is in the frame they're drawn in.
				children: () => (
					<>
						<Show when={board()}>
							{(on) => (
								<>
									<BoardUnder
										board={on()}
										width={size().width}
										spray={spray()}
										sparks={sparks()}
									/>
								</>
							)}
						</Show>
						<Show when={hat()}>
							{(on) => (
								<WornHat
									hat={on()}
									whirring={floating()}
									frame={shown()}
									width={size().width}
									height={size().height}
								/>
							)}
						</Show>
					</>
				),
			}
		},
		onEnterFrame({ $, $currentFrame }) {
			const { body } = racer
			const width = $.width()
			const frames = $.frames?.() ?? []
			setShown(frames[$currentFrame] ?? frames[0])
			setFloating(!!body.floating)
			$.setX(body.x - width / 2)
			// Up on a corgi's back, riding one; or on their skis.
			$.setY(
				body.feetY -
					$.height() -
					(body.mount > 0 ? saddle : 0) -
					(body.board > 0 ? UNDER_LIFT : 0),
			)

			if (racer.out === 'scooped') {
				$.setRotation(body.spin * 14)
				$.setState('pause')
				$.setStyle({ 'z-index': SCOOPED_OVER })
				return
			}
			const xScale = body.facing === 1 ? -1 : 1
			const dy = body.feetY - was
			was = body.feetY
			tilt += (Math.max(-12, Math.min(12, dy * 3)) - tilt) * 0.2
			if (body.board > 0) {
				const pose = skiPose(world, body, air)
				air = pose.air
				$.setXScale(xScale * pose.xScale)
				$.setRotation(pose.rotation)
				setSpray(pose.spray)
				setSparks(pose.sparks)
			} else {
				$.setXScale(xScale)
				$.setRotation(
					body.gliding ? GLIDING_LEAN + tilt : runnerLean(world, body),
				)
			}
			// Sat down, the one sit frame: switching to it from a run frame
			// would otherwise leave the engine on a frame it doesn't have. In
			// the air, legs out in one stride.
			const sitting =
				(body.ducking || body.mount > 0 || (seated && body.carried > 0)) &&
				!!sit
			// Stood still: the one stand frame.
			$.setFrame(
				sitting || standing() || (lying() && stand)
					? 0
					: body.grounded && !body.board
						? undefined
						: 1,
			)
			const speed = Math.abs(body.vx)
			$.setState(body.grounded && !body.board && speed > 0.3 ? 'play' : 'pause')
			$.setFrameInterval(Math.max(45, 190 - speed * 22))
			const { sea } = world.course
			$.setStyle({
				opacity: body.stumble > 0 && body.stumble % 8 < 4 ? '0.4' : '1',
				// Fallen into the sea: gone under.
				visibility:
					racer.out === 'fallen' && sea && body.feetY > sea.level + 30
						? 'hidden'
						: undefined,
				// Squashed by a furby: half as tall, from their feet.
				...(body.squashed > 0
					? {
							transform: `scale(${xScale}, ${SQUASHED})`,
							'transform-origin': '50% 100%',
						}
					: {}),
			})
			// In a Portal: shrinking, or growing as they're sneezed out, from
			// their feet; or out of sight, waiting their turn the other side.
			const portal = heldLook(world, racer)
			if (portal?.hidden) $.setStyle({ visibility: 'hidden' })
			else if (portal && portal.scale !== 1) {
				$.setX(portal.x - width / 2)
				$.setY(portal.feetY - $.height())
				$.setState('pause')
				$.setStyle({
					transform: `scale(${xScale * portal.scale}, ${portal.scale})`,
					'transform-origin': '50% 100%',
				})
			}
			// Where their head is, as they're drawn: for a hat knocked off it
			// to fly off from.
			const height = $.height()
			const frame = shown()
			const head = frame ? headTop(frame, width, height) : undefined
			const across = ((head?.x ?? width / 2) - width / 2) * $.xScale()
			const down = (head?.y ?? 0) - height / 2
			const turned = ($.rotation() * Math.PI) / 180
			headAt.set(body, {
				x:
					$.x() +
					width / 2 +
					across * Math.cos(turned) -
					down * Math.sin(turned),
				y:
					$.y() +
					height / 2 +
					across * Math.sin(turned) +
					down * Math.cos(turned),
			})
		},
	})
}

/** Where each racer's head was last drawn, in the world: see `createPlayer`. */
const headAt = new WeakMap<Body, { x: number; y: number }>()

/**
 * A hat on someone's head: where the top of it is in the frame they're
 * drawn in, `width` by `height`, found from the frame itself (see
 * `headTop`); till that's known, the top of the frame. Inside their
 * sprite, so it leans, turns round and flips over with them.
 */
function WornHat(props: {
	hat: Hat
	whirring?: boolean
	frame?: string
	width: number
	height: number
}) {
	const head = () =>
		props.frame ? headTop(props.frame, props.width, props.height) : undefined
	const art = () => hatArt(props.hat)
	return (
		<HatPicture
			hat={props.hat}
			lit
			whirring={props.whirring}
			style={{
				left: `${(head()?.x ?? props.width / 2) - art().middle}px`,
				top: `${(head()?.y ?? 2) - art().crown}px`,
			}}
		/>
	)
}

/** How far over a glider's rider is turned, lying along under it, head first. */
const GLIDING_LEAN = 80

/** Tucked, faster than this, snow sprays off the back of them. */
const TUCK_SPRAY_SPEED = 3
/** Faster than this on skis, snow sprays off the back of them. */
const SPRAY_SPEED = 7
/** How far over someone wiped out lies, in a heap in the snow. */
const WIPEOUT_LEAN = 84

/**
 * How someone on skis or a snowboard is drawn, from how they're going:
 * along the snow under them, its slope; in the air, pitched with how
 * they're flying, smoothed from `air` as it was, and turned round in a
 * trick, flipped over or spun about (`xScale` through 0 and back);
 * wiped out, lying in the snow. Snow sprays off the back at speed, and
 * sparks off a rail.
 */
function skiPose(
	world: World,
	b: Pick<
		Body,
		| 'x'
		| 'vx'
		| 'vy'
		| 'grounded'
		| 'grind'
		| 'trick'
		| 'turn'
		| 'wipeout'
		| 'ducking'
	>,
	air: number,
) {
	// On a rail, grinding it; not along a roof.
	const grinding =
		b.grind !== undefined && world.course.rails?.[b.grind]?.look !== 'roof'
	const slope = (Math.atan(tiltAt(world.terrain, b.x)) * 180) / Math.PI
	const flying = Math.max(
		-30,
		Math.min(
			40,
			(Math.atan2(b.vy, Math.max(2, Math.abs(b.vx))) * 180) / Math.PI,
		),
	)
	const pitch = b.grounded ? slope : flying
	const smoothed = air + (pitch - air) * (b.grounded ? 0.5 : 0.15)
	const spinning = b.trick === 'spin'
	const turn = b.turn * (Math.PI / 180)
	const along = Math.cos(turn)
	return {
		air: smoothed,
		rotation:
			b.wipeout > 0
				? WIPEOUT_LEAN
				: smoothed +
					(b.trick === 'backflip' || b.trick === 'frontflip' ? b.turn : 0) +
					(b.trick === 'grab' ? -18 : 0),
		// Spun round: narrower, and through 0 to the other way, and back.
		xScale: spinning
			? Math.sign(along || 1) * Math.max(0.15, Math.abs(along))
			: 1,
		spray:
			b.grounded &&
			!grinding &&
			b.wipeout === 0 &&
			// Tucked down, sooner: snow flying off them, to see it.
			Math.abs(b.vx) > (b.ducking ? TUCK_SPRAY_SPEED : SPRAY_SPEED),
		sparks: b.grounded && grinding,
	}
}

/**
 * How someone stands on their `board`, in their own pose for it, if they've
 * one: their ski stance on skis, their snowboard stance on a snowboard.
 */
const stanceOf = (sprite: Playable['sprite'], board: number | undefined) =>
	board
		? boardOf(board).kind === 'skis'
			? sprite.ski
			: sprite.snowboard
		: undefined

/** Curled up in a trick, in the air: grabbing their board, or rolling forward. */
const curled = (b: { trick?: TrickKind }) =>
	b.trick === 'grab' || b.trick === 'frontflip'

/** Slower than this, on their feet, someone's stood still, not running. */
const STILL_SPEED = 0.3

/**
 * How far a runner leans with the hill, in degrees, running up or down it:
 * upright stood still, on a Platform, which is flat, and in the air.
 */
function runnerLean(world: World, body: Body) {
	return body.grounded &&
		body.on === undefined &&
		Math.abs(body.vx) >= STILL_SPEED
		? leanOn(world, body.x)
		: 0
}

/** The most a runner leans with a hill: up a mountain, into it, not over with it. */
const MOST_LEAN = 16

/** How far someone running up or down the hill at `x` leans with it, in degrees. */
const leanOn = (world: World, x: number) =>
	Math.max(
		-MOST_LEAN,
		Math.min(MOST_LEAN, (Math.atan(tiltAt(world.terrain, x)) * 180) / Math.PI),
	)

/**
 * Someone in the pack, drawn the way the runner is, and kept on the scene for
 * as long as they're in the pack (see `createPack`).
 */
function createPacer(world: World, p: Pacer) {
	const { sprite } = p
	const runSize = {
		width: sprite.width * RUNNER_SCALE,
		height: sprite.height * RUNNER_SCALE,
	}
	const sit = sprite.sit
	const stand = sprite.stand
	const skiTuck = sprite.skiTuck
	const skiStance = sprite.ski
	/**
	 * Curled up on skis, in a trick: in their ski tuck, poles under their
	 * arms, if they've one. `p` isn't a signal: reading the tick keeps this
	 * up to date.
	 */
	const tucked = () =>
		world.ticks() >= 0 &&
		!!skiTuck &&
		!!p.board &&
		boardOf(p.board).kind === 'skis' &&
		curled(p)
	/** Stood up on skis, not a snowboard, in their ski pose, if they've one: poles in hand. */
	const onSkis = () =>
		world.ticks() >= 0 && !!stanceOf(sprite, p.board) && !tucked()
	/** Ducked down, going through a Tunnel or under a branch, or curled up in a trick. `p` isn't a signal: reading the tick keeps this up to date. */
	const ducked = () =>
		world.ticks() >= 0 &&
		!!sit &&
		((p.grounded && (!!p.ducking || inTunnel(world, p.x, p.feetY))) ||
			(!!p.board && curled(p)) ||
			// Sat on a condor's back, carried down off a Leap.
			!!p.condorFrom)
	/** Stood still, on the start line or stopped. */
	const standing = () =>
		world.ticks() >= 0 &&
		!!stand &&
		!ducked() &&
		p.grounded &&
		!p.scooped &&
		Math.abs(p.vx) < STILL_SPEED
	const size = () =>
		tucked()
			? poseSize(skiTuck, sprite)
			: ducked()
				? poseSize(sit, sprite)
				: onSkis()
					? poseSize(stanceOf(sprite, p.board), sprite)
					: runSize
	/** On a glider, lying along under it, as a racer does; or stood up on skis. */
	const lying = () => world.ticks() >= 0 && (!!p.gliding || !!p.board)
	let was = p.feetY
	let tilt = 0
	/** On skis, which, and how they're pitched in the air; snow spraying, sparks flying. */
	const board = createMemo(() => (world.ticks() >= 0 ? (p.board ?? 0) : 0))
	let air = 0
	const [spray, setSpray] = createSignal(false)
	const [sparks, setSparks] = createSignal(false)
	const { sea } = world.course
	return createController({
		frames: [
			...sprite.run,
			...(sit ? [sit] : []),
			...(stand ? [stand] : []),
			...(skiTuck ? [skiTuck] : []),
			...(skiStance ? [skiStance] : []),
			...(sprite.snowboard ? [sprite.snowboard] : []),
		],
		randomStartFrame: true,
		init: () => ({
			id: `pacer-${p.id}`,
			type: 'pacer',
			...createObjectSignal(p.x - runSize.width / 2, 'x'),
			...createObjectSignal(p.feetY - runSize.height, 'y'),
			width: () => size().width,
			height: () => size().height,
			frames: () =>
				tucked() && skiTuck
					? [skiTuck]
					: ducked() && sit
						? [sit]
						: onSkis()
							? [stanceOf(sprite, p.board) ?? stand ?? sprite.run[0]]
							: (standing() || lying()) && stand
								? [stand]
								: sprite.run,
			...createObjectSignal(undefined as number | undefined, 'frame'),
			// Facing right, the way they're running.
			...createObjectSignal(0, 'rotation'),
			...createObjectSignal(150, 'frameInterval'),
			...createObjectSignal('pause' as 'play' | 'pause', 'state'),
			...createObjectSignal({} as JSX.CSSProperties, 'style'),
			...createObjectSignal(-1, 'xScale'),
			children: () => (
				<Show when={board()}>
					{(on) => (
						<>
							<BoardUnder
								board={on()}
								width={size().width}
								spray={spray()}
								sparks={sparks()}
							/>
						</>
					)}
				</Show>
			),
		}),
		onEnterFrame({ $ }) {
			$.setX(p.x - $.width() / 2)
			$.setY(p.feetY - $.height() - (p.board ? UNDER_LIFT : 0))
			if (p.scooped) {
				$.setRotation(p.spin * 14)
				$.setState('pause')
				$.setStyle({
					'z-index': SCOOPED_OVER,
				})
				return
			}
			if (p.board) {
				const pose = skiPose(
					world,
					{
						x: p.x,
						vx: p.vx,
						vy: p.vy,
						grounded: p.grounded,
						grind: p.grind,
						trick: p.trick,
						turn: p.turn ?? 0,
						wipeout: 0,
						ducking: false,
					},
					air,
				)
				air = pose.air
				$.setXScale(-pose.xScale)
				$.setRotation(pose.rotation)
				setSpray(pose.spray)
				setSparks(pose.sparks)
				$.setFrame(ducked() || (lying() && stand) ? 0 : 1)
				$.setState('pause')
				$.setStyle({
					opacity: p.dazed > 0 && p.dazed % 8 < 4 ? '0.4' : '1',
				})
				return
			}
			$.setXScale(-1)
			// Leaning with the hill, running; upright, stood still; lying
			// along under a glider, tipped as it climbs and dives.
			const dy = p.feetY - was
			was = p.feetY
			tilt += (Math.max(-12, Math.min(12, dy * 3)) - tilt) * 0.2
			$.setRotation(
				p.gliding
					? GLIDING_LEAN + tilt
					: p.grounded && !standing()
						? leanOn(world, p.x)
						: 0,
			)
			// Ducked through a Tunnel: the one sit frame. Stood still: the one stand frame.
			const down = ducked()
			$.setFrame(
				down || standing() || (lying() && stand)
					? 0
					: p.grounded
						? undefined
						: 1,
			)
			const speed = Math.abs(p.vx)
			$.setState(p.grounded && !down && speed > 0.3 ? 'play' : 'pause')
			$.setFrameInterval(Math.max(45, 190 - speed * 22))
			// Flashing while they're dazed, and can't be bounced on again.
			$.setStyle({
				opacity: p.dazed > 0 && p.dazed % 8 < 4 ? '0.4' : '1',
				// Off the cliff into the sea: gone under.
				visibility:
					sea && !p.scooped && p.feetY > sea.level + 30 ? 'hidden' : undefined,
			})
		},
	})
}

/**
 * The pack, on the scene: whoever's on the start line to begin with, and
 * then everyone joining and leaving it, added and taken away as they do.
 */
export function createPack(world: World) {
	const shown = new Set(world.pack.map((p) => p.id))
	const keeper = createController({
		init: () => ({
			id: 'pack',
			type: 'game',
			x: () => 0,
			y: () => 0,
			width: () => 0,
			height: () => 0,
		}),
		onEnterFrame({ $scene }) {
			for (const p of world.pack) {
				if (shown.has(p.id)) continue
				shown.add(p.id)
				$scene.addController(createPacer(world, p))
			}
			for (const id of shown) {
				if (world.pack.some((p) => p.id === id)) continue
				shown.delete(id)
				$scene.removeController(`pacer-${id}`)
			}
		},
	})
	return [keeper, ...world.pack.map((p) => createPacer(world, p))]
}

/** A goose flying over, kept on the scene for as long as it's about (see `createFlyers`). */
function createFlyer(world: World, goose: Flyer) {
	const {
		width: FLYING_GOOSE_WIDTH,
		height: FLYING_GOOSE_HEIGHT,
		Art,
	} = flyerLook(world.course)
	return createController({
		init: () => ({
			id: `flyer-${goose.id}`,
			type: 'flyer',
			...createObjectSignal(goose.x - FLYING_GOOSE_WIDTH / 2, 'x'),
			...createObjectSignal(goose.feetY - FLYING_GOOSE_HEIGHT, 'y'),
			width: () => FLYING_GOOSE_WIDTH,
			height: () => FLYING_GOOSE_HEIGHT,
			// `state` isn't a signal: reading the tick keeps it up to date.
			children: () => (
				<Art
					now={world.ticks() + goose.id * 3}
					carrying={world.ticks() >= 0 && goose.state === 'carrying'}
				/>
			),
		}),
		onEnterFrame({ $ }) {
			$.setX(goose.x - FLYING_GOOSE_WIDTH / 2)
			$.setY(goose.feetY - FLYING_GOOSE_HEIGHT)
		},
	})
}

/** Geese flying over, added to the scene as they come and taken away once they've gone. */
export function createFlyers(world: World) {
	const shown = new Set<number>()
	return createController({
		init: () => ({
			id: 'flyers',
			type: 'game',
			x: () => 0,
			y: () => 0,
			width: () => 0,
			height: () => 0,
		}),
		onEnterFrame({ $scene }) {
			for (const goose of world.flyers) {
				if (shown.has(goose.id)) continue
				shown.add(goose.id)
				$scene.addController(createFlyer(world, goose))
			}
			for (const id of shown) {
				if (world.flyers.some((goose) => goose.id === id)) continue
				shown.delete(id)
				$scene.removeController(`flyer-${id}`)
			}
		},
	})
}

/** A splash's height into the sea, under its surface, that anyone's feet go in at. */
const SPLASH_DEPTH = 14

/**
 * Splashes, as anyone goes into the sea: off the cliff with no glider, or
 * crashed into it on one. Seen from where they are, so the same on every
 * screen; each added as it happens, and gone once it's over.
 */
export function createSplashes(world: World) {
	const { sea } = world.course
	if (!sea) return []
	const line = sea.level + SPLASH_DEPTH
	/** Where everyone's feet were last tick. */
	const was = new Map<string, number>()
	const live: { id: string; at: number }[] = []
	let next = 0
	return [
		createController({
			init: () => ({
				id: 'splashes',
				type: 'game',
				x: () => 0,
				y: () => 0,
				width: () => 0,
				height: () => 0,
			}),
			onEnterFrame({ $scene }) {
				const now = world.ticks()
				/** Into the water, this tick, at `x`, not flying over it. */
				const into = (
					key: string,
					x: number,
					feetY: number,
					flying: boolean,
				) => {
					const before = was.get(key)
					was.set(key, feetY)
					if (flying || before === undefined || !atSea(world, x)) return
					if (before >= line || feetY < line) return
					const id = `splash-${next++}`
					live.push({ id, at: now })
					$scene.addController(createSplash(world, id, x, now))
				}
				for (const r of world.racers)
					into(
						r.id,
						r.body.x,
						r.body.feetY,
						r.body.gliding || r.out === 'scooped',
					)
				for (const p of world.pack)
					into(`pacer-${p.id}`, p.x, p.feetY, !!p.gliding || p.scooped)
				while (live.length && now - live[0].at > SPLASH_TICKS) {
					const done = live.shift()
					if (done) $scene.removeController(done.id)
				}
			},
		}),
	]
}

function createSplash(world: World, id: string, x: number, at: number) {
	const surface = world.course.sea?.level ?? world.terrain.groundY(x)
	return createController({
		init: () => ({
			id,
			type: 'flyer',
			x: () => x - SPLASH_WIDTH / 2,
			y: () => surface + 6 - SPLASH_UP,
			width: () => SPLASH_WIDTH,
			height: () => SPLASH_HEIGHT,
			children: () => <SplashArt age={world.ticks() - at} />,
		}),
	})
}

/** How near anyone gets to a Giant Furby's mouth before it opens wide. */
const GIANT_OPENS = 520
/** How often it blinks, and for how long. */
const GIANT_BLINKS = 230
const GIANT_BLINK = 9

/**
 * A Giant Furby's face, on the front of its head: its beak swung open as
 * anyone, or the bus, comes near its mouth, and shut again once they've
 * all gone through; its eye on whoever's nearest coming, blinking now and
 * then. All from where everyone is, so the same on every screen.
 */
export function createGiantFurby(world: World) {
	const giant = world.course.giantFurby
	if (!giant) return []
	const ground = world.terrain.groundY(giant.x)
	const [open, setOpen] = createSignal(0)
	const [blink, setBlink] = createSignal(false)
	const [look, setLook] = createSignal({ x: -1, y: 0 })
	let said = false
	return [
		createController({
			init: () => ({
				id: 'giant-furby',
				// Behind everyone going in at its mouth.
				type: 'scenery',
				x: () => giant.x - FACE_FRONT,
				y: () => Math.round(ground - FACE_HEIGHT),
				width: () => FACE_WIDTH,
				height: () => FACE_HEIGHT,
				children: () => (
					<GiantFurbyFace open={open()} blink={blink()} look={look()} />
				),
			}),
			onEnterFrame() {
				const now = Math.max(0, world.ticks())
				const coming = [
					...world.racers.filter((r) => !r.out).map((r) => r.body),
					...world.pack.filter((p) => !p.scooped),
				]
				const near =
					world.bus.frontX > giant.x - GIANT_OPENS &&
					world.bus.frontX < giant.to
				const anyone = coming.some(
					(b) => b.x > giant.x - GIANT_OPENS && b.x < giant.to,
				)
				const target = near || anyone ? 1 : 0
				const next = open() + (target - open()) * 0.12
				if (Math.abs(next - open()) > 0.001) setOpen(next)
				// Heard, opening up, the first time.
				if (!said && next > 0.5 && world.ticks() >= 0) {
					said = true
					play('furby')
				}
				setBlink(now % GIANT_BLINKS < GIANT_BLINK)
				// On whoever's nearest, coming.
				const watched = world.racers
					.filter((r) => !r.out && r.body.x < giant.x)
					.sort((a, b) => b.body.x - a.body.x)[0]?.body
				const dx = watched ? watched.x - giant.x : -400
				const dy = watched ? watched.feetY - (ground - 285) : 0
				setLook({
					x: Math.max(-1, Math.min(0.3, dx / 400)),
					y: Math.max(-0.6, Math.min(1, dy / 260)),
				})
			},
		}),
	]
}

/** The course's corgis, if it has any. */
export function createCorgis(world: World) {
	if (world.course.ride === 'glider')
		return world.corgis.map((c) => createGlider(world, c))
	if (world.course.ride === 'skis')
		return world.corgis.map((c) => createStoodBoard(world, c))
	return world.corgis.map((c) => createCorgi(world, c))
}

/**
 * A glider: parked on the cliff top, nose down; flying, over whoever's
 * hanging on under it, nose up climbing and down diving; or come down with
 * no one on it, off and away.
 */
function createGlider(world: World, c: Corgi) {
	const { width, height, Art } = rideLook(world.course)
	/** Where it was last tick, for which way it's going, and how far it's tipped. */
	let was = c.feetY
	let tilt = 0
	return createController({
		init: () => ({
			id: `corgi-${c.id}`,
			// In front of its rider, hanging on to its bar.
			type: 'flyer',
			...createObjectSignal(c.x - width / 2, 'x'),
			...createObjectSignal(c.feetY - height, 'y'),
			width: () => width,
			height: () => height,
			...createObjectSignal(0, 'rotation'),
			children: () => <Art pose="sit" />,
		}),
		onEnterFrame({ $ }) {
			$.setX(c.x - width / 2)
			$.setY(c.feetY - height)
			if (c.state === 'scooped') {
				$.setRotation(c.spin * 14)
				return
			}
			const dy = c.feetY - was
			was = c.feetY
			tilt += (Math.max(-12, Math.min(12, dy * 3)) - tilt) * 0.2
			$.setRotation(c.state === 'waiting' ? 6 : tilt)
		},
	})
}

/**
 * A pair of skis, or a snowboard, stood up in the snow at the top: gone
 * once someone's taken them, onto their feet; flying, scooped.
 */
function createStoodBoard(world: World, c: Corgi) {
	return createController({
		init: () => ({
			id: `corgi-${c.id}`,
			type: 'corgi',
			...createObjectSignal(c.x - STOOD_WIDTH / 2, 'x'),
			...createObjectSignal(c.feetY - STOOD_HEIGHT + 4, 'y'),
			width: () => STOOD_WIDTH,
			height: () => STOOD_HEIGHT,
			...createObjectSignal(0, 'rotation'),
			...createObjectSignal({} as JSX.CSSProperties, 'style'),
			children: () => <StoodBoardArt board={c.id + 1} />,
		}),
		onEnterFrame({ $ }) {
			$.setX(c.x - STOOD_WIDTH / 2)
			$.setY(c.feetY - STOOD_HEIGHT + 4)
			$.setRotation(c.state === 'scooped' ? c.spin * 14 : 0)
			$.setStyle({
				visibility: c.state === 'ridden' ? 'hidden' : 'visible',
				'z-index': c.state === 'scooped' ? SCOOPED_OVER : undefined,
			})
		},
	})
}

function createCorgi(world: World, c: Corgi) {
	const {
		width: CORGI_WIDTH,
		height: CORGI_HEIGHT,
		Art,
		call,
	} = rideLook(world.course)
	const { rare: rarer } = rideLook(world.course)
	const [pose, setPose] = createSignal<CorgiPose>('sit')
	const [facing, setFacing] = createSignal<1 | -1>(c.facing)
	const [barking, setBarking] = createSignal(false)
	/** The rarer one: on a Remote Player's screen, known once the Host says. */
	const [rare, setRare] = createSignal(!!c.rare)
	return createController({
		init: () => ({
			id: `corgi-${c.id}`,
			type: 'corgi',
			...createObjectSignal(c.x - CORGI_WIDTH / 2, 'x'),
			...createObjectSignal(c.feetY - CORGI_HEIGHT, 'y'),
			width: () => CORGI_WIDTH,
			height: () => CORGI_HEIGHT,
			// The art faces right.
			xScale: facing,
			...createObjectSignal(0, 'rotation'),
			children: () => (
				<>
					<Show when={rare() && rarer} fallback={<Art pose={pose()} />}>
						{(look) => {
							const RareArt = look().Art
							return <RareArt pose={pose()} />
						}}
					</Show>
					<Show when={barking()}>
						<Bubble size={16} mirrored={facing() === -1}>
							{call}
						</Bubble>
					</Show>
				</>
			),
		}),
		onEnterFrame({ $ }) {
			$.setX(c.x - CORGI_WIDTH / 2)
			$.setY(c.feetY - CORGI_HEIGHT)
			setFacing(c.facing)
			setRare(!!c.rare)
			// Barking on and off, rather than one long bark.
			setBarking(c.barking && world.ticks() % 50 < 30)
			/** Up off the ground: leaping, with someone on its back, or coming down after. */
			const floor =
				world.terrain.groundY(c.x) - (c.state === 'waiting' ? (c.up ?? 0) : 0)
			const airborne = c.feetY < floor - 2
			setPose(
				c.state === 'scooped' || airborne
					? 'leap'
					: c.state === 'ridden'
						? // Galloping.
							Math.floor(world.ticks() / 6) % 2
							? 'leap'
							: 'crouch'
						: 'sit',
			)
			$.setRotation(
				c.state === 'scooped'
					? c.spin * 14
					: airborne
						? 0
						: (Math.atan(tiltAt(world.terrain, c.x)) * 180) / Math.PI,
			)
		},
	})
}

/**
 * The rails, boxes and logs down The Slopes, to grind along: each along the
 * snow at its height, following it down, its legs into the snow.
 */
export function createRails(world: World) {
	const { groundY } = world.terrain
	// Roofs are drawn as what they're the roof of: see `createHut`.
	return (world.course.rails ?? []).flatMap((rail, i) => {
		if (rail.look === 'roof') return []
		const xs: number[] = []
		for (let x = rail.from; x < rail.to; x += 8) xs.push(x)
		xs.push(rail.to)
		const top = Math.min(...xs.map((x) => groundY(x) - rail.height)) - 4
		const bottom = Math.max(...xs.map((x) => groundY(x))) + 8
		const left = rail.from - 4
		const tops = xs.map((x): [number, number] => [
			x - left,
			groundY(x) - rail.height - top,
		])
		const feet = xs.map((x): [number, number] => [x - left, groundY(x) - top])
		const width = rail.to - rail.from + 8
		const height = bottom - top
		return createController({
			init: () => ({
				id: `rail-${i}`,
				type: 'platform',
				x: () => left,
				y: () => top,
				width: () => width,
				height: () => height,
				children: () => (
					<RailArt
						rail={rail}
						width={width}
						height={height}
						tops={tops}
						feet={feet}
					/>
				),
			}),
		})
	})
}

/**
 * The hut the course runs through, if it has one: its inside behind
 * whoever's in it, its front over them, lifted away while someone racing's
 * inside, under its roof, to see them in there (see `Hut`).
 */
export function createHut(world: World) {
	const hut = world.course.hut
	if (!hut) return []
	const width = hut.to - hut.from
	const height = hut.above + hut.height + PATH_FRONT
	const top = world.terrain.groundY(hut.from) - hut.height - hut.above
	/** Whether someone racing's inside it, in under its roof: not up on it. */
	const inside = () =>
		world.racers.some(
			({ body, out }) =>
				!out &&
				body.x > hut.from &&
				body.x < hut.to &&
				body.feetY > world.terrain.groundY(body.x) - hut.height + 2,
		)
	const part = (id: string, type: string, src: string, front: boolean) =>
		createController({
			init: () => ({
				id,
				type,
				x: () => hut.from,
				y: () => top,
				width: () => width,
				height: () => height,
				children: () => <PixelArt src={src} width={width} height={height} />,
				// Its front, lifted away while someone's inside. `inside` isn't
				// a signal: reading the tick keeps it up to date.
				style: front
					? () => ({
							opacity: world.ticks() >= 0 && inside() ? 0 : 1,
							transition: 'opacity 0.25s',
						})
					: undefined,
			}),
		})
	return [
		part('hut-back', 'platform', hut.back, false),
		part('hut-front', 'foreground', hut.front, true),
	]
}

/** The course's furbies, if it has any. */
export function createFurbies(world: World) {
	return world.furbies.map((f) => createFurby(world, f))
}

function createFurby(world: World, f: Furby) {
	const [squash, setSquash] = createSignal(0)
	const [facing, setFacing] = createSignal<1 | -1>(f.facing)
	return createController({
		init: () => ({
			id: `furby-${f.id}`,
			type: 'furby',
			...createObjectSignal(f.x - FURBY_WIDTH / 2, 'x'),
			...createObjectSignal(f.feetY - FURBY_HEIGHT, 'y'),
			width: () => FURBY_WIDTH,
			height: () => FURBY_HEIGHT,
			xScale: facing,
			...createObjectSignal(0, 'rotation'),
			...createObjectSignal({} as JSX.CSSProperties, 'style'),
			children: () => (
				<img
					src={f.asset}
					alt=""
					class="pixelated"
					style={{
						position: 'absolute',
						left: 0,
						bottom: 0,
						width: '100%',
						'transform-origin': 'bottom center',
						transform: `scale(${1 + squash() * 0.6}, ${1 - squash()})`,
					}}
				/>
			),
		}),
		onEnterFrame({ $ }) {
			$.setX(f.x - FURBY_WIDTH / 2)
			$.setY(f.feetY - FURBY_HEIGHT)
			setFacing(f.facing)
			setSquash(furbySquash(f))
			$.setRotation(f.state === 'scooped' ? f.spin * 14 : 0)
			// Flashing while dazed, and can't be bounced on again.
			$.setStyle({
				opacity: f.state === 'dazed' && f.timer % 8 < 4 ? '0.4' : '1',
				'z-index': f.state === 'scooped' ? SCOOPED_OVER : undefined,
			})
		},
	})
}

const BUS_WIDTH = 247
const BUS_HEIGHT = 127
/**
 * The sleigh, in place of the bus down a ski slope (see `BusLook['sleigh']`):
 * its size, and how far above the top of the bus it's drawn, so its runners
 * are where the bus's wheels touch the ground. As on the website.
 */
const SLEIGH_WIDTH = 312
const SLEIGH_HEIGHT = 148
const SLEIGH_Y = -6
/** How far down into the bus's roof its glider's struts' feet go. */
const BUS_GLIDER_ROOF = 10
/** The giant condor carrying the bus off a Leap: px a cell, and how far down the roof its talons grip. */
const BUS_CONDOR_CELL = 4
const BUS_CONDOR_ROOF = 16
/** How far past the edge it beats its wings, taking the bus's weight, before it soars. */
const BUS_CONDOR_BEATING = 260
/** How long it takes, once it's let go of the bus, to fly off up and away out of sight. */
const BUS_CONDOR_FLY_OFF = 150
/** The scoop's front edge, this far in from the bus's left. */
const SCOOP_FRONT = BUS_WIDTH + 22
/** How long a bit of rock takes to fly off the drill, and the bits: up and back over the roof, or down ahead onto the floor. */
const DIRT_SECONDS = 0.5
const DIRT = [
	{ to: { x: -90, y: -120 }, size: 8, shade: 0, delay: 0 },
	{ to: { x: -40, y: -96 }, size: 6, shade: 1, delay: 0.06 },
	{ to: { x: 26, y: 46 }, size: 6, shade: 2, delay: 0.12 },
	{ to: { x: -130, y: -110 }, size: 6, shade: 0, delay: 0.19 },
	{ to: { x: -64, y: -134 }, size: 8, shade: 1, delay: 0.25 },
	{ to: { x: 40, y: 40 }, size: 8, shade: 0, delay: 0.31 },
	{ to: { x: -110, y: -80 }, size: 6, shade: 2, delay: 0.38 },
	{ to: { x: -20, y: -118 }, size: 6, shade: 0, delay: 0.44 },
]
/** Where the drill's tip is, down from the top of the bus. */
const DRILL_TIP_DOWN = DRILL_AT.y + DRILL_POINT.y

/**
 * Rock flying off the drill as the bus bores through a Cave: bits flung up
 * and back over its roof, along the hole it's making, and a few dropping
 * ahead onto the floor, over and over, while there's rock in its way.
 */
export function createBusDirt(world: World) {
	const look = world.course.look
	const rock = look?.cave
	if (!look?.bus?.drill || !world.course.cave || !rock) return []
	const shades = [rock.edge, rock.rock, '#9a8270']
	return [
		createController({
			init: () => ({
				id: 'bus-dirt',
				type: 'bus-dirt',
				...createObjectSignal(0, 'x'),
				...createObjectSignal(0, 'y'),
				width: () => 0,
				height: () => 0,
				...createObjectSignal({} as JSX.CSSProperties, 'style'),
				children: () => (
					<For each={DIRT}>
						{(bit) => (
							<div
								style={{
									position: 'absolute',
									left: `${-bit.size / 2}px`,
									top: `${-bit.size / 2}px`,
									width: `${bit.size}px`,
									height: `${bit.size}px`,
									background: shades[bit.shade],
									'--dx': `${bit.to.x}px`,
									'--dy': `${bit.to.y}px`,
									animation: `dirt-fly ${DIRT_SECONDS}s steps(8) ${bit.delay}s infinite`,
								}}
							/>
						)}
					</For>
				),
			}),
			onEnterFrame({ $ }) {
				const ride = world.bus.ride
				const front = world.bus.frontX
				$.setX(front - 4)
				$.setY(
					(ride?.y ?? world.terrain.groundY(front)) -
						WHEEL_BOTTOM +
						DRILL_TIP_DOWN,
				)
				$.setStyle({
					visibility:
						world.ticks() >= 0 && drilling(world, front) ? 'visible' : 'hidden',
				})
			},
		}),
	]
}

/** Whether the drill, at `front`, is boring through rock: a Cave's, or a shelf in it, lower than the bus's roof. */
function drilling(world: World, front: number) {
	const { cave } = world.course
	if (!cave) return false
	const x = front - 6
	const terrain = world.terrain.groundY(x)
	const dug = world.course.busFloor?.(x)
	// Under the Ground, digging its own way.
	if (dug !== undefined && dug > terrain + 1) return true
	const ground = dug ?? terrain
	const roof = ground - BORE_HEIGHT
	const ceiling = cave.ceiling(x)
	if (ceiling !== undefined && ceiling > roof) return true
	return (world.course.platforms ?? []).some(
		(p) =>
			x >= p.x &&
			x < p.x + p.width &&
			world.terrain.groundY(p.x) - p.height + (p.depth ?? 0) > roof,
	)
}

/**
 * How much further out than a scoop a drill is: its point (see `DRILL_AT`
 * and `DRILL_POINT`) this far past the scoop's front.
 */
const DRILL_OUT = 25
/** Where the wheels touch the ground, from the top of the bus. */
const WHEEL_BOTTOM = 141

/** The bus's pictures: the course's own, or the yellow one. */
const busLook = (world: World) =>
	world.course.look?.bus ?? {
		body: busAsset,
		windows: windowAsset,
		scoop: scoopAsset,
	}

export function createBus(world: World) {
	const look = busLook(world)
	/** Whether it's got its drill on yet: from the start, or once it's got to where it goes on. */
	const drillOn = () =>
		!!look.drill &&
		(look.drillFrom === undefined || world.bus.frontX >= look.drillFrom)
	/** A drill reaches further out than a scoop: the bus is that much further back, its tip where it scoops. */
	const drillOut = () => (drillOn() ? DRILL_OUT : 0)
	/** Its floor's slope, at `x`: digging its own way, or the Ground's. */
	const slope = (x: number) => {
		const dug = world.course.busFloor
		const here = dug?.(x)
		if (here === undefined) return tiltAt(world.terrain, x)
		return ((dug?.(x + 4) ?? here) - (dug?.(x - 4) ?? here)) / 8
	}
	const bus = createController({
		// A sleigh has no back to see through its windows.
		frames: look.sleigh ? [] : [busBackAsset],
		init: () => ({
			id: 'bus',
			type: 'bus',
			width: () => BUS_WIDTH,
			height: () => BUS_HEIGHT,
			...createObjectSignal(world.bus.frontX - SCOOP_FRONT - drillOut(), 'x'),
			...createObjectSignal(0, 'y'),
			...createObjectSignal(0, 'rotation'),
		}),
		onEnterFrame({ $, $age }) {
			const middle = world.bus.frontX - SCOOP_FRONT - drillOut() + BUS_WIDTH / 2
			world.bus.ride ??= startRide(world, middle)
			const ride = world.bus.ride
			rideBus(world, ride, middle)
			$.setX(world.bus.frontX - SCOOP_FRONT - drillOut())
			// Off a Leap, hanging in a giant condor's talons: swaying a little,
			// nose a little down, not driving down the air.
			const { leap } = world.course
			const hanging =
				!!leap &&
				middle > leap.edge &&
				world.course.busFloor?.(middle) !== undefined
			// Its engine rumbling it about, a little; a sleigh glides, smooth.
			const rumbles = ride.grounded && !look.sleigh && !hanging
			$.setY(ride.y - WHEEL_BOTTOM + (rumbles ? Math.cos(10 + $age / 2) : 0))
			// Nose up as it jumps, down as it drops; with the hill, on it.
			$.setRotation(
				hanging
					? Math.max(
							-8,
							Math.min(8, (Math.atan(slope(middle)) * 180) / Math.PI / 5),
						) +
							Math.sin($age / 18) * 2.5
					: ride.grounded
						? (Math.atan(slope(middle)) * 180) / Math.PI +
							(rumbles ? (Math.random() - 0.5) * 0.8 : 0)
						: Math.max(-14, Math.min(14, ride.vy * 1.4)),
			)
		},
	})

	const part = (
		type: string,
		asset: string,
		width: number,
		height: number,
		offset: Vector,
		extra: Partial<Parameters<typeof createConnectedController>[0]> = {},
	) =>
		bus.attach(
			createConnectedController({
				type,
				base: bus,
				frames: [asset],
				width: () => width,
				height: () => height,
				offset,
				...extra,
			}),
		)

	const bounce =
		(phase: number) =>
		(_: unknown, $age: number): number =>
			Math.cos(10 + $age / 2 + phase) * -1

	/**
	 * Its legs, in place of its wheels, up a mountain: the far side's behind
	 * it, where its wheels go, and the near side's over it, once it's drawn.
	 * Stepping with every tick, so they're drawn again every tick.
	 */
	const legs = (type: string, far: boolean) => {
		if (!look.legs) return
		const legsLook = look.legs
		bus.attach(
			createConnectedController({
				type,
				base: bus,
				width: () => LEGS_WIDTH,
				height: () => LEGS_HEIGHT,
				offset: { x: -LEGS_OUT, y: 0 },
				init: () => ({
					children: () => (
						<BusLegs
							look={legsLook}
							far={far}
							ground={WHEEL_BOTTOM}
							travelled={() => {
								world.ticks()
								return world.bus.frontX
							}}
						/>
					),
				}),
			}),
		)
	}
	if (look.legs) legs('bus-legs-far', true)
	else if (!look.sleigh) {
		part(
			'bus-wheel1',
			wheel1Asset,
			34,
			38,
			{ x: 140, y: 105 },
			{ y: bounce(0) },
		)
		part(
			'bus-wheel2',
			wheel2Asset,
			34,
			38,
			{ x: 208, y: 103 },
			{ y: bounce(5) },
		)
		part(
			'bus-wheel3',
			wheel3Asset,
			19,
			23,
			{ x: 68, y: 105 },
			{ y: bounce(10) },
		)
		part(
			'bus-wheel4',
			wheel4Asset,
			26,
			30,
			{ x: 24, y: 102 },
			{ y: bounce(15) },
		)
	}
	if (!look.sleigh)
		part(
			'bus-window',
			look.windows,
			212,
			40,
			{ x: 9, y: 26 },
			{
				style: () => ({ opacity: 0.75 }),
			},
		)
	// A sleigh, in place of its body: wider and taller than the bus, level
	// with its front, and a little higher, its runners where its wheels touch.
	if (look.sleigh)
		part('bus-body', look.sleigh, SLEIGH_WIDTH, SLEIGH_HEIGHT, {
			x: BUS_WIDTH - SLEIGH_WIDTH,
			y: SLEIGH_Y,
		})
	else part('bus-body', look.body, BUS_WIDTH, BUS_HEIGHT, { x: 0, y: 0 })
	legs('bus-legs', false)
	// Snow sprayed off the back of its sleigh's runners, as it goes.
	if (look.sleigh)
		bus.attach(
			createConnectedController({
				type: 'bus-spray',
				base: bus,
				width: () => 0,
				height: () => 0,
				offset: { x: BUS_WIDTH - SLEIGH_WIDTH + 14, y: WHEEL_BOTTOM - 10 },
				init: () => ({
					children: () => (
						<div style={{ position: 'absolute', transform: 'scaleX(-1)' }}>
							<BusSpray />
						</div>
					),
				}),
			}),
		)
	// Its own glider, bolted to its roof, out over the sea.
	if (world.course.sea)
		part(
			'bus-glider',
			busGlider,
			BUS_GLIDER_WIDTH,
			BUS_GLIDER_HEIGHT,
			{
				x: (BUS_WIDTH - BUS_GLIDER_WIDTH) / 2 + 10,
				y: BUS_GLIDER_ROOF - BUS_GLIDER_HEIGHT,
			},
			{
				style: () => ({
					'image-rendering': 'pixelated',
					visibility:
						world.ticks() >= 0 &&
						atSea(world, world.bus.frontX - SCOOP_FRONT + BUS_WIDTH / 2)
							? 'visible'
							: 'hidden',
				}),
			},
		)
	// Off a Leap: carried down in a giant condor's talons, by its roof.
	const { leap } = world.course
	if (leap) {
		const middle = () => world.bus.frontX - SCOOP_FRONT + BUS_WIDTH / 2
		const carried = () =>
			world.ticks() >= 0 &&
			middle() > leap.edge &&
			world.course.busFloor?.(middle()) !== undefined
		const { width, height, body } = CONDOR_CELLS
		/**
		 * When it let go, the bus down on the valley floor, and how long
		 * since: flying off, up and away ahead, rather than gone at once.
		 */
		let letGoAt: number | undefined
		const flown = () => {
			const ticks = world.ticks()
			if (carried()) letGoAt = undefined
			else if (letGoAt === undefined && middle() > leap.edge) letGoAt = ticks
			return letGoAt === undefined ? undefined : ticks - letGoAt
		}
		const gripping = condorFrames(true)
		part(
			'bus-glider',
			gripping[0],
			width * BUS_CONDOR_CELL,
			height * BUS_CONDOR_CELL,
			{
				// Its talons on the middle of the roof.
				x: BUS_WIDTH / 2 - 45 * BUS_CONDOR_CELL,
				y: BUS_CONDOR_ROOF - (body + 19) * BUS_CONDOR_CELL,
			},
			{
				// Gripping the bus, then its talons drawn up, let go.
				frames: [...gripping, ...condorFrames(false)],
				// Beating its wings, just off the edge, taking the weight; then
				// soaring; then beating them again, climbing away.
				frame: () => {
					const since = flown()
					if (since !== undefined)
						return gripping.length + condorFrame(world.ticks(), true)
					return condorFrame(
						world.ticks(),
						middle() < leap.edge + BUS_CONDOR_BEATING,
					)
				},
				style: () => {
					const since = flown()
					const away = since !== undefined && since < BUS_CONDOR_FLY_OFF
					return {
						'image-rendering': 'pixelated',
						visibility: carried() || away ? 'visible' : 'hidden',
						// Up and on ahead of the bus, climbing steeper as it goes.
						...(away && {
							transform: `translate(${since * 4}px, ${-(since * 1.5 + since * since * 0.03)}px)`,
						}),
					}
				},
			},
		)
	}
	/**
	 * The scoop, or a drill in place of it, turning as it goes: `drill`, which
	 * this is. `scooping` and `reach` aren't signals: reading the tick redraws
	 * it every tick. Gone up the Scoop Arm while that's out.
	 */
	const front = (drill: boolean) =>
		part(
			'bus-scoop',
			look.scoop,
			drill ? DRILL_WIDTH : 88,
			drill ? DRILL_HEIGHT : 57,
			drill ? DRILL_AT : { x: 181, y: 94 },
			{
				...(drill &&
					look.drill && {
						frames: look.drill,
						frame: () => Math.floor(Math.max(0, world.ticks()) / 2) % 2,
					}),
				style: () => ({
					transition: 'transform 60ms linear',
					// Lifted about its top front corner.
					'transform-origin': `${drill ? DRILL_WIDTH : 88}px 0px`,
					visibility:
						world.ticks() >= 0 && (armOut(world) || drillOn() !== drill)
							? 'hidden'
							: 'visible',
					transform:
						world.ticks() >= 0 && world.bus.scooping > 0
							? 'translateY(-45px) rotate(-10deg)'
							: 'translateY(0px) rotate(0deg)',
				}),
			},
		)
	if (look.drill) front(true)
	// The scoop, till the drill goes on, if it doesn't from the start.
	if (!look.drill || look.drillFrom !== undefined) front(false)

	return bus
}

/** How high the bus bores its hole through a Cave's rock: as tall as it is, to its roof. */
const BORE_HEIGHT = 150

/**
 * The hole the bus bores through a Cave's rock, drilling through it, from
 * the Cave's mouth to just behind its drill: its back wall showing through,
 * shelves cut through, and a rough edge of broken rock along its top where
 * it's cut the rock back, bigger than the space was: not in a chamber.
 */
export function createBusBore(world: World) {
	const { cave } = world.course
	const look = world.course.look?.cave
	if (!cave || !look || look.bore === false) return []
	const { groundY } = world.terrain
	const { busFloor } = world.course
	const random = seeded(4404)
	const columns: { x: number; top: number; bottom: number; rim: boolean }[] = []
	/** From the Cave's mouth, or from where the drill goes on, if that's sooner. */
	const start = Math.min(
		cave.from,
		world.course.look?.bus?.drillFrom ?? cave.from,
	)
	for (let x = start; x < world.terrain.finishX; x += 4) {
		const ground = groundY(x)
		// Digging its own way, down under the Ground: through the street, and
		// the earth under it.
		const dug = busFloor?.(x)
		const under = dug !== undefined && dug > ground + 1
		if (!under && (x < cave.from || x >= cave.to)) continue
		const floor = under ? dug : ground
		const rough = Math.round((floor - BORE_HEIGHT + random() * 6) / 2) * 2
		// No higher than the rock goes: over a low hill, or the Sphinx's
		// haunches, the bus is out in the open, not boring a hole. Nor up
		// out of the street it's digging down through.
		const surface = under ? ground - PATH_BACK : cave.surface(x)
		const top = surface === undefined ? rough : Math.max(rough, surface + 2)
		const bottom = Math.round(under ? floor + 2 : ground - PATH_BACK + 1)
		if (top >= bottom) continue
		const ceiling = cave.ceiling(x)
		columns.push({
			x: x - start,
			top,
			bottom,
			// Only where it's cut the Cave's rock back: bigger than the space
			// was, and under the hill's top, not along it.
			rim: ceiling !== undefined && ceiling > top && top === rough,
		})
	}
	const highest = Math.min(...columns.map((c) => c.top)) - 4
	const lowest = Math.max(...columns.map((c) => c.bottom))
	const width = Math.max(...columns.map((c) => c.x)) + 4
	const band = (
		part: (c: (typeof columns)[number]) => [number, number] | undefined,
	) =>
		columns
			.map((c) => {
				const span = part(c)
				return span
					? `M${c.x},${span[0] - highest}h4V${span[1] - highest}h-4Z`
					: ''
			})
			.join('')
	const hole = band((c) => [c.top, c.bottom])
	const rim = band((c) => (c.rim ? [c.top - 4, c.top] : undefined))
	const [shown, setShown] = createSignal(0)
	return [
		createController({
			init: () => ({
				id: 'bus-bore',
				type: 'bus-bore',
				x: () => start,
				y: () => highest,
				width: () => shown(),
				height: () => lowest - highest,
				children: () => (
					<div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
						<svg
							width={width}
							height={lowest - highest}
							shape-rendering="crispEdges"
							aria-hidden="true"
							style={{ display: 'block' }}
						>
							{/* The Cave's back wall, through it: brick, its courses in
							    line with the wall's, where it's laid in brick. */}
							<Show when={look.bricks}>
								<defs>
									<WallBricks
										id="bus-bore-bricks"
										wall={look.wall}
										x={start}
										y={highest}
									/>
								</defs>
							</Show>
							<path
								d={hole}
								fill={look.bricks ? 'url(#bus-bore-bricks)' : look.wall}
							/>
							<path d={rim} fill={look.seam} />
						</svg>
					</div>
				),
			}),
			onEnterFrame() {
				setShown(Math.max(0, Math.min(width, world.bus.frontX - 40 - start)))
			},
		}),
	]
}

/** The Scoop Arm's out, reaching for someone up off the Ground's line. */
const armOut = (world: World) => Math.abs(world.bus.reach) > ARM_SHOWS

/** How far the arm has to reach before it's drawn at all. */
const ARM_SHOWS = 6
const SCOOP_WIDTH = 88
const SCOOP_HEIGHT = 57
/** The scoop's bottom edge, where it scoops from, from the top of its art. */
const SCOOP_LIP = 44
/**
 * How thick each section of the arm is, from the tip in: telescoping, so
 * each pokes out of the thicker one below it, and the thickest is drawn
 * last, over the others' feet.
 */
const ARM_SECTIONS = [6, 10, 14]

/**
 * The Scoop Arm: a telescoping pole out of the front of the bus, with the
 * scoop on the end of it, stretched up to whoever it's reaching for (or
 * down). It starts where the bus's own scoop would be, on the Ground's line.
 */
export function createScoopArm(world: World) {
	const { scoop } = busLook(world)
	const [reach, setReach] = createSignal(0)
	const [scooping, setScooping] = createSignal(false)
	const length = () => Math.abs(reach())
	const up = () => reach() >= 0
	return createController({
		init: () => ({
			id: 'bus-arm',
			type: 'bus-arm',
			...createObjectSignal(0, 'x'),
			...createObjectSignal(0, 'y'),
			width: () => SCOOP_WIDTH,
			height: () => length() + SCOOP_HEIGHT,
			children: () => (
				<Show when={length() > ARM_SHOWS}>
					<For each={ARM_SECTIONS}>
						{(thickness, i) => (
							<div
								style={{
									position: 'absolute',
									left: `${SCOOP_WIDTH / 2 - thickness / 2}px`,
									width: `${thickness}px`,
									height: `${(length() * (ARM_SECTIONS.length - i())) / ARM_SECTIONS.length}px`,
									// From the bus end, the bottom when reaching up.
									...(up()
										? { bottom: `${SCOOP_HEIGHT - SCOOP_LIP}px` }
										: { top: '0px' }),
									background:
										'repeating-linear-gradient(45deg, #f2c200 0 6px, #1d1d1d 6px 12px)',
									border: '2px solid #1d1d1d',
									'box-sizing': 'border-box',
								}}
							/>
						)}
					</For>
					<img
						src={scoop}
						alt=""
						style={{
							position: 'absolute',
							left: 0,
							...(up() ? { top: '0px' } : { bottom: '0px' }),
							width: `${SCOOP_WIDTH}px`,
							height: `${SCOOP_HEIGHT}px`,
							transform: scooping() ? 'rotate(20deg)' : 'none',
						}}
					/>
				</Show>
			),
		}),
		onEnterFrame({ $ }) {
			setReach(world.bus.reach)
			setScooping(world.bus.scooping > 0)
			/** The scoop's lip, with the arm in: where the bus's wheels are. */
			const lip = world.bus.ride?.y ?? world.terrain.groundY(world.bus.frontX)
			$.setX(world.bus.frontX - SCOOP_WIDTH + 8)
			$.setY(up() ? lip - reach() - SCOOP_LIP : lip - SCOOP_LIP)
		},
	})
}

/** How far over a girder its crane's hook hangs, its slings fanning out from it. */
const SLING_HEIGHT = 34

/** The course's Platforms, drawn where they are each tick. */
export function createPlatforms(world: World) {
	const look = platformLook(world.course)
	const { cave } = world.course
	/**
	 * How long a girder's cable is, `at` where it is: up out of sight, or in
	 * a Cave, up to its rock.
	 */
	const cableTo = (platform: PlatformDefinition, at: PlatformAt) => {
		const ceiling = cave?.ceiling(at.left + platform.width / 2)
		return ceiling === undefined
			? 1400
			: Math.max(0, at.top - SLING_HEIGHT - ceiling)
	}
	// A guard tower's roof is drawn as the tower.
	return world.platforms.flatMap((platform, i) => {
		if (platform.tower) return []
		const start = platformAt(world.terrain, platform, world.ticks())
		const [cable, setCable] = createSignal(cableTo(platform, start))
		return createController({
			init: () => ({
				id: `platform-${i}`,
				type: 'platform',
				...createObjectSignal(start.left, 'x'),
				...createObjectSignal(start.top, 'y'),
				width: () => platform.width,
				height: () => platform.depth ?? look.depth,
				children: () => (
					<>
						<Show
							when={platform.art}
							fallback={
								<PlatformArt
									look={look}
									solid={!!platform.solid}
									width={platform.width}
									depth={platform.depth ?? look.depth}
								/>
							}
						>
							{/* Its own picture: its top on the Platform's. */}
							{(art) => (
								<img
									src={art().asset}
									alt=""
									class="pixelated"
									width={art().width}
									height={art().height}
									style={{
										position: 'absolute',
										left: `${(platform.width - art().width) / 2}px`,
										top: `${-art().top}px`,
										'max-width': 'none',
									}}
								/>
							)}
						</Show>
						{/* Hung from a crane, out of sight above. */}
						<Show when={platform.move && look.cable}>
							{/* The crane's cable, down to its hook; from the hook, a
							    sling out to either end of the girder. */}
							<div
								style={{
									position: 'absolute',
									left: `${platform.width / 2 - 2}px`,
									bottom: `calc(100% + ${SLING_HEIGHT}px)`,
									width: '4px',
									height: `${cable()}px`,
									background: look.cable,
								}}
							/>
							<svg
								width={platform.width}
								height={SLING_HEIGHT + 6}
								aria-hidden="true"
								style={{
									position: 'absolute',
									left: 0,
									bottom: '100%',
									overflow: 'visible',
								}}
							>
								<polyline
									points={`6,${SLING_HEIGHT + 6} ${platform.width / 2},4 ${platform.width - 6},${SLING_HEIGHT + 6}`}
									fill="none"
									stroke={look.cable}
									stroke-width={3}
								/>
								<rect
									x={platform.width / 2 - 5}
									y={0}
									width={10}
									height={8}
									fill={look.cable}
								/>
							</svg>
						</Show>
					</>
				),
			}),
			onEnterFrame: platform.move
				? ({ $ }) => {
						const at = platformAt(world.terrain, platform, world.ticks())
						$.setX(at.left)
						$.setY(at.top)
						if (cave) setCable(cableTo(platform, at))
					}
				: undefined,
		})
	})
}

/** Something that stays put, drawn standing on the ground at `x`. */
function createFixture(options: {
	id: string
	type: string
	x: number
	/** How far its bottom goes into the ground. */
	sink?: number
	width: number
	height: number
	world: World
	frames?: string[]
	children?: () => JSX.Element
	style?: () => JSX.CSSProperties
	/** Pixels up from where it would stand, every tick. */
	lift?: (age: number) => number
	/** -1 to draw it turned round. */
	xScale?: number
}) {
	const ground = options.world.terrain.groundY(options.x)
	const top = ground - options.height + (options.sink ?? 0)
	return createController({
		frames: options.frames,
		init: () => ({
			id: options.id,
			type: options.type,
			x: () => options.x - options.width / 2,
			...createObjectSignal(top, 'y'),
			width: () => options.width,
			height: () => options.height,
			children: options.children,
			style: options.style,
			xScale: () => options.xScale ?? 1,
		}),
		onEnterFrame: options.lift
			? ({ $, $age }) => $.setY(top - (options.lift?.($age) ?? 0))
			: undefined,
	})
}

/**
 * How far back from the path the scenery stands, so the grass at a tree's foot
 * stays off it: they're only for looking at, nothing to run into.
 */
const SCENERY_SET_BACK = 10

/**
 * A Steam Vent: its grate, and once it's puffed, steam rising off it in
 * clouds a while. When it puffed isn't a signal: reading the tick keeps it
 * up to date.
 */
function SteamVent(props: { world: World; state: ObstacleState }) {
	const puff = () => steamPuff(props.state.flown, props.world.ticks())
	return (
		<>
			<img
				src={steamVentAsset}
				alt=""
				class="pixelated"
				width={44}
				height={12}
				style={{ display: 'block' }}
			/>
			<Show when={puff() !== undefined}>
				<div
					style={{
						position: 'absolute',
						left: '50%',
						bottom: '8px',
						width: '0px',
						height: '0px',
					}}
				>
					<For each={STEAM_CLOUDS}>
						{(cloud) => (
							<div
								style={{
									position: 'absolute',
									left: `${cloud.x - cloud.size / 2}px`,
									bottom: '0px',
									width: `${cloud.size}px`,
									height: `${cloud.size}px`,
									background: 'rgba(245, 245, 245, 0.85)',
									'box-shadow': '0 0 0 3px rgba(245, 245, 245, 0.4)',
									animation: `steam-rise 0.5s steps(5) ${cloud.delay}s infinite`,
								}}
							/>
						)}
					</For>
				</div>
			</Show>
		</>
	)
}

/**
 * A bouncy toadstool, a Steam Vent's job: squashed flat as it fires
 * whoever's on it up, and springing back, wobbling. When it last fired
 * isn't a signal: reading the tick keeps it up to date.
 */
function Bouncer(props: { world: World; state: ObstacleState }) {
	const squash = () => {
		const puff = steamPuff(props.state.flown, props.world.ticks())
		if (puff === undefined) return 1
		// Down flat, then up past where it was, and settling.
		return 1 - 0.45 * Math.cos(puff * Math.PI * 3) * (1 - puff)
	}
	const own = props.world.course.look?.bouncer
	return (
		<img
			src={own?.asset ?? bouncyToadstool}
			alt=""
			class="pixelated"
			width={own?.width ?? 44}
			height={own?.height ?? 32}
			style={{
				display: 'block',
				transform: `scale(${2 - squash()}, ${squash()})`,
				'transform-origin': '50% 100%',
			}}
		/>
	)
}

/** A Steam Vent's clouds: each its own size, rising from its own place, one after another. */
const STEAM_CLOUDS = [
	{ x: -8, size: 14, delay: 0 },
	{ x: 6, size: 18, delay: 0.1 },
	{ x: -2, size: 22, delay: 0.2 },
	{ x: 8, size: 12, delay: 0.3 },
	{ x: -10, size: 16, delay: 0.4 },
]

/** A cyclist, riding towards you, or scooped and flying. */
function createCyclist(
	world: World,
	state: ObstacleState,
	o: Extract<Obstacle, { kind: 'cyclist' }>,
	id: string,
) {
	// Or the course's own: a hospital bed, wheeled along by a porter.
	const own = world.course.look?.cyclist
	const WIDTH = own?.width ?? 56
	const HEIGHT = own?.height ?? 48
	return createController({
		frames: own?.frames ?? [cyclist1Asset, cyclist2Asset],
		init: () => ({
			id,
			type: 'zombie',
			...createObjectSignal(o.x - WIDTH / 2, 'x'),
			...createObjectSignal(world.terrain.groundY(o.x) - HEIGHT, 'y'),
			width: () => WIDTH,
			height: () => HEIGHT,
			...createObjectSignal(0, 'rotation'),
			...createObjectSignal(110, 'frameInterval'),
			...createObjectSignal('pause' as 'play' | 'pause', 'state'),
			// Drawn riding left: turned round, riding the other way.
			...createObjectSignal(1, 'xScale'),
		}),
		onEnterFrame({ $ }) {
			const cyclist = cyclistAt(world, { ...state, obstacle: o })
			$.setXScale(-(cyclist.facing ?? -1))
			const ground = world.terrain.groundY(cyclist.x)
			if (state.scooped) {
				const flight = scoopFlight(state.scooped, world.ticks())
				$.setX(cyclist.x - WIDTH / 2 + flight.x)
				$.setY(ground - HEIGHT + flight.y)
				$.setRotation(flight.spin)
				$.setState('pause')
				return
			}
			$.setX(cyclist.x - WIDTH / 2)
			$.setY(ground - HEIGHT + 2)
			$.setState(cyclist.riding ? 'play' : 'pause')
		},
	})
}

/** How often something that hops does, and how high. */
const HOP_EVERY = 110
const HOP_TICKS = 18
const HOP_HEIGHT = 16

export function createScenery(world: World) {
	const { groundY } = world.terrain
	// Drawn at their own size (times `scale`), once it's known. Nothing
	// stands over a Gap. Names carved on any tombstones: runners', in a
	// shuffled order.
	const names = gravestoneNames()
	// Not stood over a Gap: but in front of the path, a bridge's near side,
	// can be, and what's meant to be, a breach in a wall.
	const standing = world.course.scenery.filter(
		({ x, front, overGap }) => front || overGap || !world.terrain.inGap(x),
	)
	let carvings = 0
	return standing.map((piece, i) => {
		const { x, asset, scale = 1, filter, hops, carved, footing } = piece
		const setBack = piece.setBack ?? (footing ? VERGE : SCENERY_SET_BACK)
		const name = carved ? names[carvings++ % names.length] : undefined
		const width = () => (imageSize(asset)?.width ?? 0) * scale
		const height = () => (imageSize(asset)?.height ?? 0) * scale
		/**
		 * The path's back edge at its highest under it, so a slope doesn't run
		 * into its foot; or on the floor, where its middle is. On a footing,
		 * all the way along, not just at its ends and middle, so no bump
		 * between them pokes up past its foot.
		 */
		const pathTop = () =>
			(piece.onFloor
				? groundY(x)
				: footing
					? highestUnder(groundY, x - width() / 2, x + width() / 2)
					: Math.min(
							groundY(x - width() / 2),
							groundY(x),
							groundY(x + width() / 2),
						)) - PATH_BACK
		const top = () => pathTop() - setBack - height()
		/** How steep the floor is under it, end to end, as an angle. */
		const floorLean = () => {
			const half = width() / 2
			return half
				? Math.atan((groundY(x + half) - groundY(x - half)) / (half * 2))
				: 0
		}
		/** Each hopper on its own beat. */
		const beat = (i * 37) % HOP_EVERY
		const [lift, setLift] = createSignal(0)
		return createController({
			frames: [asset],
			init: () => ({
				id: `scenery-${i}`,
				// A gateway's near side, over whoever's going through it.
				type: piece.front ? 'foreground' : 'scenery',
				children: carved
					? () => <Carved name={name ?? ''} panel={carved} scale={scale} />
					: footing
						? () => (
								<Footing
									groundY={groundY}
									x={x}
									width={width()}
									base={pathTop() - setBack}
								/>
							)
						: undefined,
				x: () => x - width() / 2,
				y: () => Math.round(top() - lift()),
				width,
				height,
				style: () => ({
					filter,
					'image-rendering': scale > 1 ? 'pixelated' : undefined,
					// Stood on the floor, leant with its slope, so both its feet
					// are on it, uphill and down.
					...(piece.onFloor && {
						transform: `skewY(${floorLean()}rad)`,
						'transform-origin': '50% 100%',
					}),
				}),
			}),
			// Only what hops needs anything doing every tick.
			onEnterFrame: hops
				? ({ $age }) => {
						const t = ($age + beat) % HOP_EVERY
						setLift(
							t < HOP_TICKS
								? Math.sin((t / HOP_TICKS) * Math.PI) * HOP_HEIGHT
								: 0,
						)
					}
				: undefined,
		})
	})
}

/** Volunteers stand at the back of the path, out of the runners' way. */
const VOLUNTEER_SINK = 4 - PATH_BACK

/**
 * The run director stands just past the start line, on the near edge of the
 * path, in front of everyone, so they're always seen, facing them, counting
 * down.
 */
const RUN_DIRECTOR_PAST = 90
const RUN_DIRECTOR_SINK = PATH_FRONT - 2

export function createRunDirector(world: World) {
	const member = world.runDirector
	const frame = volunteerFrame(member)
	const runner = runners[member][0]
	const size = poseSize(frame, runner())
	return createFixture({
		id: 'run-director',
		type: 'run-director',
		sink: RUN_DIRECTOR_SINK,
		x: START_X + RUN_DIRECTOR_PAST,
		width: size.width,
		height: size.height,
		world,
		frames: frame ? [frame] : [],
		// Turned round to face everyone on the line, the bubble turned back.
		xScale: -1,
		children: () => (
			<Show when={countdownWord(world)}>
				{(word) => (
					<Bubble size={word() === 'Go!' ? 30 : 26} mirrored>
						{word()}
					</Bubble>
				)}
			</Show>
		),
	})
}

/**
 * The course's purple sign by the start, the site's purple board (see
 * `TitleSign` in the web app) at twice its pixel size, lettered the same way:
 * gold, in Jersey 10.
 */
/**
 * The roadblock at the far left of the course: across the way, just where
 * anyone running the wrong way is stopped (`LEFT_EDGE`).
 */
export function createRoadblock(world: World) {
	return createFixture({
		id: 'roadblock',
		type: 'sign',
		x: LEFT_EDGE - HITBOX_HALF_WIDTH - ROADBLOCK_WIDTH / 2,
		width: ROADBLOCK_WIDTH,
		height: ROADBLOCK_HEIGHT,
		sink: 2,
		world,
		frames: [ROADBLOCK],
	})
}

export function createParkrunSign(world: World, x: number) {
	return createFixture({
		id: 'parkrun-sign',
		type: 'sign',
		x,
		// Just off the back of the path.
		sink: 4 - PATH_BACK,
		width: 140,
		height: 70,
		world,
		frames: [world.course.look?.sign ?? purpleSignAsset],
		children: () => (
			<div
				style={{
					position: 'absolute',
					// Just the board's face (x 1–56, y 1–32 of its 70 × 35 pixels, at
					// twice that), not its darker edge down the right or the shadow.
					inset: '2px 26px 4px 2px',
					'text-align': 'center',
					display: 'flex',
					'flex-direction': 'column',
					'align-items': 'center',
					'justify-content': 'center',
					color: world.course.look?.signInk ?? '#f8b832',
					'font-family': '"Jersey 10", sans-serif',
					'line-height': 0.8,
				}}
			>
				{/* Just its name: over two lines, if it's long. Two lines sit
				    a little lower than their middle: the board's an oval, its
				    top curving in over them where they're widest, with a thick
				    rim along its bottom. */}
				<span
					style={{
						'font-size': `${signLetters(world.course.name)}px`,
						'line-height': 0.85,
						'margin-top': signWraps(world.course.name) ? '6px' : 0,
					}}
				>
					{world.course.name}
				</span>
			</div>
		),
	})
}

/** How far along the course a banner's poles are either side of its line: its slant across the path. */
const BANNER_SLANT = DEPTH_SLANT
/**
 * Tall enough for the bus to drive under: the cloth's lowest, at the near
 * pole, is this less 50 px off the ground (it hangs 34 px from the pole's top,
 * which stands on the path's near edge, 16 px below the line everyone runs
 * along), and the bus's roof is 142 px up, bobbing.
 */
const POLE_HEIGHT = 200
const POLE_WIDTH = 6
const CLOTH_HEIGHT = 34

/**
 * A banner across the course, for the start and the finish: a pole either
 * side of the path, the far one a little further along, so it crosses the
 * path at a slant and still faces you. The near pole is drawn in front of the
 * runners, and everything else behind them, so you run through it, over its
 * line on the ground.
 */
export function createBanner(world: World, x: number, text: string) {
	const width = BANNER_SLANT * 2 + 8
	const height = POLE_HEIGHT + PATH_BACK + PATH_FRONT
	/** Where the poles stand, in the banner's own pixels: just inside the path's edges. */
	const near = { x: 4, foot: height - 2 }
	const far = { x: width - 4, foot: height - PATH_BACK - PATH_FRONT + 2 }
	const angle =
		(Math.atan2(near.foot - far.foot, far.x - near.x) * 180) / Math.PI

	// The line on the ground, from the path's far edge to its near one, in
	// steps a pixel (two of the screen's) high.
	const line: [number, number, number, number, string][] = []
	const top = height - PATH_BACK - PATH_FRONT
	for (let y = top; y < height; y += 2) {
		const t = (y - top) / (height - top)
		const middle = far.x + (near.x - far.x) * t
		line.push([Math.round(middle / 2) * 2 - 6, y, 12, 2, 'white'])
	}

	const across = createFixture({
		id: `banner-${text}`,
		type: 'banner',
		x,
		// Its bottom is the path's near edge.
		sink: PATH_FRONT,
		width,
		height,
		world,
		children: () => (
			<div style={{ position: 'relative', width: '100%', height: '100%' }}>
				<div style={{ position: 'absolute', inset: 0, opacity: 0.85 }}>
					<Pixels width={width} height={height} rects={line} />
				</div>
				<div
					style={{
						...POLE_STYLE,
						left: `${far.x - POLE_WIDTH / 2}px`,
						top: `${far.foot - POLE_HEIGHT}px`,
					}}
				/>
				<div
					style={{
						position: 'absolute',
						left: `${near.x}px`,
						top: `${near.foot - POLE_HEIGHT}px`,
						width: `${far.x - near.x}px`,
						height: `${CLOTH_HEIGHT}px`,
						'box-sizing': 'border-box',
						// Sloping up to the far pole's top.
						'transform-origin': '0 0',
						transform: `skewY(${-angle}deg)`,
						background:
							'repeating-conic-gradient(#0f1f29 0 25%, white 0 50%) 0 0 / 12px 12px',
						border: '3px solid #0f1f29',
						display: 'grid',
						'place-items': 'center',
					}}
				>
					<span
						style={{
							background: '#0f1f29',
							color: '#ffd23f',
							padding: '4px 8px 0',
							'font-size': '20px',
							'line-height': 1,
						}}
					>
						{text}
					</span>
				</div>
			</div>
		),
	})

	const nearPole = createFixture({
		id: `banner-${text}-pole`,
		type: 'banner-front',
		x: x - BANNER_SLANT,
		sink: PATH_FRONT - 2,
		width: POLE_WIDTH,
		height: POLE_HEIGHT,
		world,
		children: () => <div style={{ ...POLE_STYLE, left: 0, top: 0 }} />,
	})

	return [across, nearPole]
}

const POLE_STYLE: JSX.CSSProperties = {
	position: 'absolute',
	width: `${POLE_WIDTH}px`,
	height: `${POLE_HEIGHT}px`,
	'box-sizing': 'border-box',
	background: '#9aa3a8',
	'border-left': '2px solid #5f686d',
}

/**
 * Something the bus can scoop up: where it stands until then, and flying off,
 * spinning, after. `scooped` isn't a signal: reading the tick keeps it moving.
 */
function Scoopable(props: {
	world: World
	state: ObstacleState
	children: JSX.Element
	/** What it spins round, flying: its middle, unless it's somewhere else in its art. */
	spin?: string
}) {
	const flight = () => {
		const now = props.world.ticks()
		const { scooped } = props.state
		return scooped ? scoopFlight(scooped, now) : undefined
	}
	return (
		<div
			style={{
				'transform-origin': props.spin ?? 'center',
				transform: (() => {
					const f = flight()
					return f
						? `translate(${f.x}px, ${f.y}px) rotate(${f.spin}deg)`
						: 'none'
				})(),
			}}
		>
			{props.children}
		</div>
	)
}

export function createObstacle(world: World, state: ObstacleState, i: number) {
	const o = state.obstacle
	const id = `${o.kind}-${i}`
	switch (o.kind) {
		case 'rock': {
			// Or the course's own, in its place, taken in turn: those for where
			// it is, if they're only for some of the course.
			const own = world.course.look?.rocks?.filter(
				(r) =>
					o.x >= (r.from ?? Number.NEGATIVE_INFINITY) &&
					o.x < (r.to ?? Number.POSITIVE_INFINITY),
			)
			const art = own?.length
				? own[
						world.obstacles
							.filter((s) => s.obstacle.kind === 'rock')
							.indexOf(state) % own.length
					]
				: undefined
			return createFixture({
				id,
				type: 'hazard',
				x: o.x,
				sink: 3,
				width: art?.width ?? 56,
				height: art?.height ?? 29,
				world,
				children: () => (
					<Scoopable world={world} state={state}>
						<img
							src={art?.asset ?? rockAsset}
							alt=""
							class={art ? 'pixelated' : undefined}
							width={art?.width}
							height={art?.height}
							style={{ display: 'block', filter: world.course.look?.rock }}
						/>
					</Scoopable>
				),
			})
		}
		case 'cone': {
			// Knocked over: tipped forward onto its side, and skidding on a
			// little way. `flown` isn't a signal: reading the tick keeps it
			// up to date.
			const knocked = () =>
				world.ticks() >= 0 && state.used && !state.scooped
					? world.ticks() - (state.flown ?? world.ticks())
					: undefined
			return createFixture({
				id,
				type: 'hazard',
				x: o.x,
				// Up on a platform, if it's on one.
				sink: 1 - (o.height ?? 0),
				width: CONE_WIDTH,
				height: CONE_HEIGHT,
				world,
				children: () => (
					<Scoopable world={world} state={state}>
						<img
							src={cone}
							alt=""
							class="pixelated"
							width={CONE_WIDTH}
							height={CONE_HEIGHT}
							style={{
								display: 'block',
								'transform-origin': '100% 100%',
								transform: (() => {
									const since = knocked()
									if (since === undefined) return undefined
									const tip = Math.min(1, since / CONE_TIPS)
									const skid = Math.min(1, since / CONE_SKIDS)
									const slid = CONE_SKID * (1 - (1 - skid) ** 2)
									return `translateX(${Math.round(slid)}px) rotate(${Math.round(90 * tip)}deg)`
								})(),
							}}
						/>
					</Scoopable>
				),
			})
		}
		case 'branch': {
			// Sheared to the slope under it, so its limb lies across the path
			// on a hill too, its trunk still upright; and its row on the line
			// everyone runs along on the ground where the limb crosses it.
			const { groundY } = world.terrain
			const from = o.x - BRANCH_CROSS
			const to = from + BRANCH_TREE_WIDTH
			const slope = (groundY(to) - groundY(from)) / (to - from)
			const settle = groundY(o.x) - groundY(o.x + BRANCH_TREE_ALONG)
			const lie = `translateY(${settle}px) skewY(${Math.atan(slope)}rad)`
			const knocked = () => world.ticks() >= 0 && !!state.scooped
			// Jumping it: its near end's drawn behind you, not over you.
			const over = () =>
				world.ticks() >= 0 &&
				Math.abs(world.body.x - o.x) < BRANCH_OVER_REACH &&
				world.body.feetY < groundY(o.x) - BRANCH_LIMB_HEIGHT
			const part = (options: {
				suffix: string
				type: string
				src: string
				clip?: string
				shown: () => boolean
			}) =>
				createFixture({
					id: `${id}${options.suffix}`,
					type: options.type,
					x: o.x + BRANCH_TREE_ALONG,
					width: BRANCH_TREE_WIDTH,
					height: BRANCH_TREE_HEIGHT,
					sink: BRANCH_TREE_HEIGHT - BRANCH_LINE_ROW,
					world,
					children: () => (
						<Scoopable
							world={world}
							state={state}
							spin={`${BRANCH_CROSS}px ${BRANCH_LINE_ROW - BRANCH_LIMB_HEIGHT}px`}
						>
							<PixelArt
								src={options.src}
								width={BRANCH_TREE_WIDTH}
								height={BRANCH_TREE_HEIGHT}
							/>
						</Scoopable>
					),
					style: () => ({
						filter: world.course.look?.foliage,
						transform: lie,
						'transform-origin': `${BRANCH_CROSS}px ${BRANCH_LINE_ROW}px`,
						'clip-path': options.clip,
						visibility: options.shown() ? 'visible' : 'hidden',
					}),
				})
			const back = `inset(0 0 0 ${BRANCH_CROSS}px)`
			const near = `inset(0 ${BRANCH_TREE_WIDTH - BRANCH_CROSS}px 0 0)`
			return [
				// The tree, behind the path: behind everyone, the bus too.
				createFixture({
					id: `${id}-tree`,
					type: 'hazard',
					x: o.x + BRANCH_TREE_ALONG,
					width: BRANCH_TREE_WIDTH,
					height: BRANCH_TREE_HEIGHT,
					sink: BRANCH_TREE_HEIGHT - BRANCH_LINE_ROW,
					world,
					children: () => (
						<PixelArt
							src={lowBranchTreeAsset}
							width={BRANCH_TREE_WIDTH}
							height={BRANCH_TREE_HEIGHT}
						/>
					),
					style: () => ({
						filter: world.course.look?.foliage,
						transform: lie,
						'transform-origin': `${BRANCH_CROSS}px ${BRANCH_LINE_ROW}px`,
					}),
				}),
				// Its limb: the back of it behind everyone; its near end over a
				// runner under it, or behind one jumping it. Knocked off by the
				// bus, all of it, flying, in front.
				part({
					suffix: '-limb',
					type: 'hazard',
					src: lowBranchLimbAsset,
					clip: back,
					shown: () => !knocked(),
				}),
				part({
					suffix: '-limb-near',
					type: 'hazard-front',
					src: lowBranchLimbAsset,
					clip: near,
					shown: () => !knocked() && !over(),
				}),
				part({
					suffix: '-limb-near-behind',
					type: 'hazard',
					src: lowBranchLimbAsset,
					clip: near,
					shown: () => !knocked() && over(),
				}),
				part({
					suffix: '-limb-flying',
					type: 'hazard-front',
					src: lowBranchLimbAsset,
					shown: knocked,
				}),
			]
		}
		case 'hurdle':
			// One in each lane, across the track. Only the runner's own is run into.
			return HURDLE_LANES.map((lane, n) =>
				createFixture({
					id: `${id}-${n}`,
					type: lane.front ? 'hazard-front' : 'hazard',
					x: o.x + lane.along,
					sink: lane.sink,
					...hurdleSize(lane.depth, o.tall),
					world,
					children: () => <HurdleArt depth={lane.depth} tall={o.tall} />,
					// Knocked over: the runner's own once run into, or flattened by
					// the bus (which sets `used` too), and every other lane's as the
					// bus's scoop reaches it. Neither's a signal: reading the tick
					// keeps it up to date.
					style: () => ({
						'--knocked':
							world.ticks() >= 0 &&
							(lane.running
								? state.used
								: world.bus.frontX >= o.x + lane.along - 14)
								? 1
								: 0,
					}),
				}),
			)
		case 'kids':
			return createFixture({
				id,
				type: 'hazard',
				x: o.x,
				width: kidsWidth(o.count),
				height: KIDS_HEIGHT,
				world,
				children: () => (
					<Scoopable world={world} state={state}>
						<KidsArt count={o.count} />
					</Scoopable>
				),
			})
		case 'vent':
			return createFixture({
				id,
				type: 'hazard',
				x: o.x,
				sink: 2,
				width: VENT_WIDTH,
				height: VENT_HEIGHT,
				world,
				children: () => <VentArt />,
			})
		case 'steam':
			if (o.giant)
				return createFixture({
					id,
					type: 'hazard',
					x: o.x,
					sink: 10,
					width: GIANT_VENT_WIDTH,
					height: GIANT_VENT_HEIGHT,
					world,
					// When it puffed isn't a signal: reading the tick keeps it up to date.
					children: () => (
						<GiantVentArt
							now={() => Math.max(0, world.ticks())}
							puffed={() => (world.ticks() >= 0 ? state.flown : undefined)}
						/>
					),
				})
			// A bouncy toadstool, squashing as it fires whoever's on it up.
			if (world.course.look?.bouncers)
				return createFixture({
					id,
					type: 'hazard',
					x: o.x,
					sink: 2,
					width: world.course.look.bouncer?.width ?? 44,
					height: world.course.look.bouncer?.height ?? 32,
					world,
					children: () => <Bouncer world={world} state={state} />,
				})
			return createFixture({
				id,
				type: 'hazard',
				x: o.x,
				sink: 8,
				width: 44,
				height: 12,
				world,
				children: () => <SteamVent world={world} state={state} />,
			})
		case 'hands':
			// In front of whoever's on them: clutching their ankles.
			return createFixture({
				id,
				type: 'hazard-front',
				x: o.x,
				sink: CELL_SINK,
				width: HANDS_WIDTH,
				height: HANDS_HEIGHT,
				world,
				// When they grabbed isn't a signal: reading the tick keeps it up to date.
				children: () => (
					<HandsArt
						now={() => Math.max(0, world.ticks())}
						grabbed={() => (world.ticks() >= 0 ? state.flown : undefined)}
					/>
				),
			})
		case 'swampman':
			return createFixture({
				id,
				type: 'hazard',
				x: o.x,
				sink: SWAMP_POOL_HEIGHT / 2,
				width: SWAMP_POOL_WIDTH,
				height: SWAMP_DRAWN,
				world,
				children: () => (
					<SwampManArt x={o.x} now={() => Math.max(0, world.ticks())} />
				),
			})
		case 'sewage': {
			// From the street over it, down through the rock, to the floor.
			const floor = world.terrain.groundY(o.x)
			const ceiling = world.course.cave?.ceiling(o.x) ?? floor - 300
			const street = world.course.cave?.surface(o.x)
			const top = street === undefined ? ceiling - 60 : street + STREET_GRATE
			return createFixture({
				id,
				type: 'hazard',
				x: o.x,
				width: SEWAGE_WIDTH,
				height: floor - top,
				world,
				children: () => (
					<SewageArt
						x={o.x}
						now={() => Math.max(0, world.ticks())}
						ceiling={ceiling - top}
						floor={floor - top}
					/>
				),
			})
		}
		case 'tourists': {
			// Their feet on the path's middle, each on the ground where they are.
			const { groundY } = world.terrain
			const drop = (along: number) =>
				Math.round(groundY(o.x + along) - groundY(o.x))
			// Nearer, down the path, if the course has them so.
			const nearer = world.course.look?.touristsNearer ?? 0
			return createFixture({
				id,
				type: 'hazard',
				x: o.x,
				width: touristsWidth(o.count),
				height: TOURISTS_HEIGHT + TOURISTS_DEPTH_ROOM,
				sink: TOURISTS_DEPTH_ROOM - nearer,
				world,
				children: () => (
					<Scoopable world={world} state={state}>
						<TouristsArt x={o.x} count={o.count} drop={drop} />
					</Scoopable>
				),
			})
		}
		case 'cyclist':
			return createCyclist(world, state, o, id)
		case 'tombstone':
			return createFixture({
				id,
				type: 'hazard',
				x: o.x,
				sink: 4,
				width: 40,
				height: 67,
				world,
				children: () => (
					<Scoopable world={world} state={state}>
						<img src={tombstoneAsset} alt="" style={{ display: 'block' }} />
					</Scoopable>
				),
			})
		case 'zombie':
			return createZombie(world, state, o, id)
		case 'mummy':
			return createMummy(world, state, o, id)
		case 'geese':
			return createFixture({
				id,
				type: 'hazard',
				x: o.x,
				width: geeseWidth(o.count),
				height: GEESE_HEIGHT,
				world,
				// Neither `flown` nor the tick they peck by is a signal: reading
				// the tick keeps both up to date.
				children: () => (
					<GeeseArt
						filter={world.course.look?.geese}
						x={o.x}
						count={o.count}
						now={world.ticks()}
						flown={world.ticks() >= 0 ? state.flown : undefined}
						flownAll={world.ticks() >= 0 ? state.flownAll : undefined}
					/>
				),
			})
		case 'pothole':
			return createFixture({
				id,
				type: 'mud',
				x: o.x,
				width: o.width,
				height: POTHOLE_HEIGHT,
				// Into the track, around the line everyone runs along.
				sink: POTHOLE_HEIGHT - POTHOLE_ABOVE,
				world,
				children: () => (
					<PotholeArt width={o.width} look={world.course.look?.pothole} />
				),
			})
		case 'mud':
			return createFixture({
				id,
				type: 'mud',
				x: o.x,
				width: o.width,
				height: 40,
				world,
				sink: 20,
				children: () => <MudArt world={world} obstacle={o} />,
				style: () => ({ filter: world.course.look?.mud }),
			})
		case 'gulls':
		case 'balloon':
		case 'storm':
		case 'turbine':
		case 'whale':
			return createSkyThing(world, state, o, id)
		case 'germ':
			return createGerm(world, state, o, id)
		case 'valve':
			// Raised a little off the floor, flapping open on the beat, its
			// chevrons over it lighting up and leaping: stand here. The
			// tick's a signal: reading it keeps it beating.
			return createFixture({
				id,
				type: 'hazard',
				x: o.x,
				sink: VALVE_SINK,
				width: VALVE.width,
				height: VALVE.height,
				world,
				children: () => {
					const beat = () => beatAt(Math.max(0, world.ticks()))
					const open = () => valveOpen(Math.max(0, world.ticks()))
					return (
						<>
							<img
								src={open() ? VALVE.open : VALVE.shut}
								alt=""
								class="pixelated"
								width={VALVE.width}
								height={VALVE.height}
								style={{ display: 'block' }}
							/>
							<img
								src={VALVE.arrows}
								alt=""
								class="pixelated"
								width={VALVE_ARROWS}
								height={VALVE_ARROWS * (10 / 12)}
								style={{
									position: 'absolute',
									left: `${(VALVE.width - VALVE_ARROWS) / 2}px`,
									bottom: `${VALVE.height + 10 + (open() ? Math.round(Math.sin((beat() / 24) * Math.PI) * 16) : 0)}px`,
									opacity: open() ? 1 : 0.35 + 0.35 * (beat() / HEARTBEAT),
									filter: open() ? 'drop-shadow(0 0 4px #fff6a8)' : undefined,
								}}
							/>
						</>
					)
				},
			})
		case 'snowman':
			return createFixture({
				id,
				type: 'hazard',
				x: o.x,
				sink: 3,
				width: SNOWMAN_WIDTH,
				height: SNOWMAN_DRAWN,
				world,
				// Burst, flying apart, then a heap. Neither's a signal: reading
				// the tick keeps it up to date.
				children: () => (
					<Scoopable world={world} state={state}>
						<SnowmanArt
							since={
								world.ticks() >= 0 && state.flown !== undefined
									? world.ticks() - state.flown
									: undefined
							}
						/>
					</Scoopable>
				),
			})
	}
}

/** How far a heart valve sits down in the floor, its rim raised over it; and how wide its chevrons are. */
const VALVE_SINK = 10
const VALVE_ARROWS = 24

/** How long a popped Germ's burst is seen for. */
const GERM_BURST = 18

/**
 * A Germ, bobbing up and down where it floats, its spikes wriggling; popped,
 * a burst, and gone; scooped, flying. Drawn where `germHeight` says it is
 * by the tick, which is a signal: reading it keeps it bobbing.
 */
function createGerm(
	world: World,
	state: ObstacleState,
	o: Extract<Obstacle, { kind: 'germ' }>,
	id: string,
) {
	const ground = world.terrain.groundY(o.x)
	return createController({
		frames: [...GERM_FRAMES, GERM_POPPED],
		init: () => ({
			id,
			type: 'zombie',
			...createObjectSignal(o.x - GERM_SIZE / 2, 'x'),
			...createObjectSignal(ground - o.low - GERM_SIZE, 'y'),
			width: () => GERM_SIZE,
			height: () => GERM_SIZE,
			frames: () => GERM_FRAMES,
			...createObjectSignal(0, 'rotation'),
			...createObjectSignal(220, 'frameInterval'),
			...createObjectSignal('play' as 'play' | 'pause', 'state'),
			...createObjectSignal({} as JSX.CSSProperties, 'style'),
			children: () => (
				<Show when={popped()}>
					<img
						src={GERM_POPPED}
						alt=""
						class="pixelated"
						width={GERM_SIZE}
						height={GERM_SIZE}
						style={{
							position: 'absolute',
							inset: 0,
							transform: `scale(${1 + (popped() ?? 0) / GERM_BURST})`,
							opacity: 1 - (popped() ?? 0) / GERM_BURST,
						}}
					/>
				</Show>
			),
		}),
		onEnterFrame({ $ }) {
			const now = world.ticks()
			const bottom = ground - germHeight(o, Math.max(0, now))
			if (state.scooped) {
				const flight = scoopFlight(state.scooped, now)
				$.setX(o.x - GERM_SIZE / 2 + flight.x)
				$.setY(bottom - GERM_SIZE + flight.y)
				$.setRotation(flight.spin)
				return
			}
			$.setX(o.x - GERM_SIZE / 2)
			$.setY(bottom - GERM_SIZE)
			// Popped: its body gone, its burst going.
			$.setStyle(
				state.used && state.flown !== undefined
					? { 'background-image': 'none' }
					: {},
			)
		},
	})
	/** How long since it was popped, while its burst's still showing. */
	function popped() {
		const now = world.ticks()
		if (!state.used || state.flown === undefined || state.scooped) return
		const since = now - state.flown
		return since >= 0 && since < GERM_BURST ? since : undefined
	}
}

/** The sky's Obstacles' kinds, out over the sea: see `sky`. */
type SkyObstacle = Extract<
	Obstacle,
	{ kind: 'gulls' | 'balloon' | 'storm' | 'turbine' | 'whale' }
>

/**
 * Something in the sky over the sea, drawn where `sky` says it is by the
 * tick, which is a signal: reading it keeps it moving.
 */
function createSkyThing(
	world: World,
	state: ObstacleState,
	o: SkyObstacle,
	id: string,
) {
	const line = world.terrain.groundY(o.x)
	const now = () => Math.max(0, world.ticks())
	const at = (
		box: { x: number; y: number; width: number; height: number },
		children: () => JSX.Element,
		y?: () => number,
	) =>
		createController({
			init: () => ({
				id,
				type: 'hazard',
				x: () => box.x,
				...createObjectSignal(box.y, 'y'),
				width: () => box.width,
				height: () => box.height,
				children,
			}),
			onEnterFrame: y ? ({ $ }) => $.setY(y()) : undefined,
		})
	switch (o.kind) {
		case 'gulls': {
			// Room round them to wheel about in, and to scatter out of.
			const width = o.count * 34 + 80
			const left = o.x - width / 2
			const top = line - o.height - 60
			const gulls = () =>
				gullsAt(o, line, now(), world.ticks() >= 0 ? state.flown : undefined)
			return at({ x: left, y: top, width, height: 120 }, () => (
				<Index each={gulls()}>
					{(gull) => (
						<div
							style={{
								position: 'absolute',
								left: `${gull().x - left - GULL_WIDTH / 2}px`,
								top: `${gull().y - top - GULL_HEIGHT / 2}px`,
							}}
						>
							<GullArt up={gull().flap} />
						</div>
					)}
				</Index>
			))
		}
		case 'balloon':
			return at(
				{
					x: o.x - BALLOON_WIDTH / 2,
					y: balloonAt(o, line, 0).top,
					width: BALLOON_WIDTH,
					height: BALLOON_HEIGHT,
				},
				() => <BalloonArt x={o.x} />,
				() => balloonAt(o, line, now()).top,
			)
		case 'storm': {
			const { top, bottom } = stormAt(o, line, 0)
			const storm = () => stormAt(o, line, now())
			return at(
				{
					x: o.x - STORM_WIDTH / 2,
					y: top,
					width: STORM_WIDTH,
					height: line - top,
				},
				() => (
					<StormArt
						brewing={storm().brewing}
						striking={storm().striking}
						now={now()}
						reach={line - bottom + 18}
					/>
				),
			)
		}
		case 'turbine': {
			const reach = TURBINE_BLADE + 4
			return at(
				{
					x: o.x - reach,
					y: line - o.height - reach,
					width: reach * 2,
					height: reach + o.height,
				},
				() => (
					<TurbineArt
						angles={turbineAt(o, line, now()).angles}
						tall={o.height + 10}
					/>
				),
			)
		}
		case 'whale': {
			const whale = () => whaleAt(o, line, now())
			return at(
				{
					x: o.x - WHALE_WIDTH / 2,
					y: line - o.height,
					width: WHALE_WIDTH,
					height: o.height + WHALE_HEIGHT,
				},
				() => (
					<WhaleArt
						up={whale().up}
						spout={whale().spout}
						bubbling={whale().bubbling}
						height={o.height}
						now={now()}
					/>
				),
			)
		}
	}
}

export function createBoost(world: World, state: BoostState, i: number) {
	const o = state.boost
	const id = `${o.kind}-${i}`
	switch (o.kind) {
		case 'fika': {
			const art = FIKA_SIZE[o.item]
			return createFixture({
				id,
				type: 'boost',
				x: o.x,
				width: art.width,
				height: art.height,
				sink: -o.height,
				world,
				lift: (age) => Math.round(Math.sin(age / 9) * 3),
				children: () => <FikaArt item={o.item} />,
				// Picked up: gone. `used` isn't a signal, so this reads the tick.
				style: () => ({
					visibility: world.ticks() >= 0 && state.used ? 'hidden' : 'visible',
				}),
			})
		}
		case 'barcode':
			return createFixture({
				id,
				type: 'boost',
				x: o.x,
				width: BARCODE_WIDTH,
				height: BARCODE_TALL,
				sink: -o.height,
				world,
				lift: (age) => Math.round(Math.sin(age / 9) * 3),
				frames: [barcodeAsset],
				// Scanned: gone. `used` isn't a signal, so this reads the tick.
				style: () => ({
					visibility: world.ticks() >= 0 && state.used ? 'hidden' : 'visible',
				}),
			})
		case 'pumpkin':
			return createFixture({
				id,
				type: 'boost',
				x: o.x,
				sink: 1,
				width: PUMPKIN_WIDTH,
				height: PUMPKIN_HEIGHT,
				world,
				frames: [PUMPKINS[o.carving - 1] ?? pumpkin1Asset],
				// Picked up: gone, onto someone's head.
				style: () => ({
					visibility: world.ticks() >= 0 && state.used ? 'hidden' : 'visible',
				}),
			})
		case 'hat': {
			// Bobbing, glowing, plainly something to have.
			const art = hatArt({ kind: o.hat })
			return createFixture({
				id,
				type: 'boost',
				x: o.x,
				width: art.width,
				height: art.height,
				sink: -o.height,
				world,
				lift: (age) => Math.round(Math.sin(age / 9) * 3),
				children: () => (
					<>
						<div style={HAT_GLOW} />
						<HatPicture hat={{ kind: o.hat }} />
					</>
				),
				// Picked up: gone, onto someone's head.
				style: () => ({
					visibility: world.ticks() >= 0 && state.used ? 'hidden' : 'visible',
				}),
			})
		}
		case 'cheer': {
			const frame = volunteerFrame(o.member)
			const runner = runners[o.member][0]
			const size = poseSize(frame, runner())
			// Marshals' signs point left, the way the header's runners go. Turned
			// round, they point on along the course, and face the runner coming.
			const turned = frame === runner().frames.marshal?.[0]
			return createFixture({
				id,
				type: 'cheerer',
				sink: VOLUNTEER_SINK,
				x: o.x,
				width: size.width,
				height: size.height,
				world,
				frames: frame ? [frame] : [],
				xScale: turned ? -1 : 1,
				children: () => (
					<Show when={state.cheering() > 0}>
						<Bubble size={18} mirrored={turned}>
							Go {state.cheered || world.runner.name}!
						</Bubble>
					</Show>
				),
			})
		}
		case 'gate':
			// At the edge of the piste, red at its back, behind whoever goes
			// past it, blue at its front, in front of them: in turn, so the
			// course weaves past them. Flapping, gone past.
			return createFixture({
				id,
				type: o.colour === 'red' ? 'banner' : 'banner-front',
				x: o.x,
				sink: o.colour === 'red' ? 4 - PATH_BACK : PATH_FRONT - 4,
				width: GATE_WIDTH,
				height: GATE_HEIGHT,
				world,
				children: () => (
					<GateArt colour={o.colour} flapping={state.cheering() > 0} />
				),
			})
		case 'ring': {
			// Its far half behind whoever's going through it, its near half in
			// front of them; lit up, as someone does.
			const half = (side: 'near' | 'far') =>
				createFixture({
					id: `${id}-${side}`,
					type: side === 'near' ? 'hazard-front' : 'boost',
					x: o.x,
					width: RING_WIDTH,
					height: RING_HEIGHT,
					sink: RING_HEIGHT / 2 - o.height,
					world,
					children: () => <RingArt half={side} lit={state.cheering() > 0} />,
				})
			return [half('far'), half('near')]
		}
	}
}

/**
 * A tree with one low branch reaching back over the path, at head height:
 * 56 px off the ground at its lowest, so duck under it. Its trunk stands at
 * the back of the path (the art's foot, 258, is the middle of it), so the
 * runner goes past it, not through it.
 */

/** A puddle of mud, following the ground under it. */
/**
 * Mud's art, `assets/obstacles/mud.png`: its left end, a middle that repeats,
 * and its right end, side by side, in cells twice the size of a screen pixel.
 */
const MUD_CAP = 24
const MUD_TILE = 32
const MUD_ART_HEIGHT = 28

/**
 * A muddy puddle across the path: its art, a column 4 px wide at a time,
 * each on the Ground under it, so the puddle lies along the slope. Its
 * ends, and as much of its middle as it takes between them. Drawn onto one
 * canvas, so it's scaled as one picture, without seams between the columns.
 */
function MudArt(props: {
	world: World
	obstacle: Extract<Obstacle, { kind: 'mud' }>
}) {
	const { obstacle: o, world } = props
	const width = Math.max(2 * MUD_CAP, Math.round(o.width / 4) * 4)
	const left = o.x - width / 2
	const top = world.terrain.groundY(o.x) - 20
	const canvas = (
		<canvas
			width={width}
			height={40 + MUD_ART_HEIGHT}
			style={{
				display: 'block',
				'margin-top': `${-MUD_ART_HEIGHT / 2}px`,
				'image-rendering': 'pixelated',
			}}
		/>
	) as HTMLCanvasElement
	const art = new Image()
	art.onload = () => {
		const context = canvas.getContext('2d')
		if (!context) return
		context.imageSmoothingEnabled = false
		for (let x = 0; x < width; x += 4) {
			const from =
				x < MUD_CAP
					? x
					: x >= width - MUD_CAP
						? MUD_CAP + MUD_TILE + x - (width - MUD_CAP)
						: MUD_CAP + ((x - MUD_CAP) % MUD_TILE)
			// Its middle row on the Ground's line, the canvas starting half the art higher.
			const ground = Math.round(world.terrain.groundY(left + x + 2) - top)
			// The art's in cells of 2 px: half as many of its own pixels.
			context.drawImage(
				art,
				from / 2,
				0,
				2,
				MUD_ART_HEIGHT / 2,
				x,
				ground,
				4,
				MUD_ART_HEIGHT,
			)
		}
	}
	art.src = mudAsset
	return canvas
}

const PUMPKINS = [
	pumpkin1Asset,
	pumpkin2Asset,
	pumpkin3Asset,
	pumpkin4Asset,
	pumpkin5Asset,
]
const PUMPKIN_WIDTH = 29
const PUMPKIN_HEIGHT = 23
/** A glow round a hat sat waiting, so it's plain it's there to have. */
const HAT_GLOW: JSX.CSSProperties = {
	position: 'absolute',
	inset: '-10px',
	background:
		'radial-gradient(closest-side, rgba(255, 244, 190, 0.55), rgba(255, 244, 190, 0))',
}
/** A traffic cone's size, drawn; and knocked over, how long it takes to tip, how far it skids, and for how long. */
const CONE_WIDTH = 16
const CONE_HEIGHT = 22
const CONE_TIPS = 6
const CONE_SKID = 40
const CONE_SKIDS = 18
/** How long a knocked-off hat's seen flying. */
const HAT_FLIES = 50

/**
 * Hats knocked off racers' heads, one for each racer: up and away behind
 * them, from where their head was, spinning and fading. (A hat on someone's
 * head is drawn with them: see `WornHat`.)
 */
export function createHats(world: World) {
	return world.racers.map((racer) => {
		const [flying, setFlying] = createSignal<Hat>()
		/** Where it came off. */
		let from = { x: 0, y: 0 }
		let lostAt = -1
		return createController({
			init: () => ({
				id: `hat-${racer.id}`,
				type: 'hat',
				...createObjectSignal(0, 'x'),
				...createObjectSignal(0, 'y'),
				...createObjectSignal(0, 'rotation'),
				...createObjectSignal({} as JSX.CSSProperties, 'style'),
				width: () => (flying() ? hatArt(flying() as Hat).width : 0),
				height: () => (flying() ? hatArt(flying() as Hat).height : 0),
				children: () => (
					<Show when={flying()}>{(hat) => <HatPicture hat={hat()} />}</Show>
				),
			}),
			onEnterFrame({ $ }) {
				const { body } = racer
				const lost = body.lostHat
				const since = lost ? world.ticks() - lost.at : HAT_FLIES
				if (!lost || since >= HAT_FLIES || since < 0) {
					if (flying()) setFlying(undefined)
					return
				}
				if (lost.at !== lostAt) {
					lostAt = lost.at
					const art = hatArt(lost.hat)
					const head = headAt.get(body) ?? {
						x: body.x,
						y: body.feetY - racer.runner.sprite.height * RUNNER_SCALE,
					}
					from = { x: head.x - art.middle, y: head.y - art.crown }
					setFlying(lost.hat)
				}
				const flight = scoopFlight(
					{ at: lost.at, vx: -2 * body.facing },
					world.ticks(),
				)
				$.setX(from.x + flight.x)
				$.setY(from.y + flight.y * 0.6)
				$.setRotation(flight.spin)
				$.setStyle({ opacity: String(1 - since / HAT_FLIES) })
			},
		})
	})
}

/**
 * A Zombie: a club member, gone green and glowing, or now and then a
 * skeleton, coming the wrong way, slowly. Into an open grave, it sinks out of
 * sight; scooped, it flies off like anyone else.
 */
function createZombie(
	world: World,
	state: ObstacleState,
	o: Extract<Obstacle, { kind: 'zombie' }>,
	id: string,
) {
	const { sprite, filter } = zombieSprite(o)
	const ZOMBIE_WIDTH = sprite.width * RUNNER_SCALE
	const ZOMBIE_HEIGHT = sprite.height * RUNNER_SCALE
	return createController({
		frames: sprite.run,
		randomStartFrame: true,
		init: () => ({
			id,
			type: 'zombie',
			...createObjectSignal(o.x - ZOMBIE_WIDTH / 2, 'x'),
			...createObjectSignal(world.terrain.groundY(o.x) - ZOMBIE_HEIGHT, 'y'),
			width: () => ZOMBIE_WIDTH,
			height: () => ZOMBIE_HEIGHT,
			...createObjectSignal(0, 'rotation'),
			// A shamble: a run, slowed right down.
			...createObjectSignal(o.skeleton ? 220 : 300, 'frameInterval'),
			...createObjectSignal('play' as 'play' | 'pause', 'state'),
			...createObjectSignal({} as JSX.CSSProperties, 'style'),
		}),
		onEnterFrame({ $ }) {
			const zombie = zombieAt(world, { ...state, obstacle: o })
			const ground = world.terrain.groundY(zombie.x)
			if (state.scooped) {
				const flight = scoopFlight(state.scooped, world.ticks())
				$.setX(zombie.x - ZOMBIE_WIDTH / 2 + flight.x)
				$.setY(ground - ZOMBIE_HEIGHT + flight.y)
				$.setRotation(flight.spin)
				$.setState('pause')
				return
			}
			$.setX(zombie.x - ZOMBIE_WIDTH / 2)
			$.setY(ground - ZOMBIE_HEIGHT + zombie.sunk)
			// Not walking until it's woken, nor once in the grave.
			$.setState(zombie.walking && !zombie.sunk ? 'play' : 'pause')
			$.setStyle({
				filter,
				// Below the ground, it's in the grave.
				'clip-path': `inset(0 0 ${Math.min(ZOMBIE_HEIGHT, zombie.sunk)}px 0)`,
				visibility: zombie.sunk >= ZOMBIE_SINK_GONE ? 'hidden' : 'visible',
			})
		},
	})
}

/** A Mummy's frames: two, side by side, in cells twice the size of a screen pixel. */
const MUMMY_CELLS = { width: 18, height: 29 }
const MUMMY_WIDTH = MUMMY_CELLS.width * 2
const MUMMY_DRAWN = MUMMY_CELLS.height * 2
/** How many ticks each of its shuffling frames lasts. */
const MUMMY_STEP = 22

/** A Mummy, shuffling to and fro in its tomb, or scooped and flying. */
function createMummy(
	world: World,
	state: ObstacleState,
	o: Extract<Obstacle, { kind: 'mummy' }>,
	id: string,
) {
	const [frame, setFrame] = createSignal(0)
	return createController({
		init: () => ({
			id,
			type: 'zombie',
			...createObjectSignal(o.x - MUMMY_WIDTH / 2, 'x'),
			...createObjectSignal(world.terrain.groundY(o.x) - MUMMY_DRAWN, 'y'),
			width: () => MUMMY_WIDTH,
			height: () => MUMMY_DRAWN,
			...createObjectSignal(0, 'rotation'),
			...createObjectSignal(1, 'xScale'),
			children: () => (
				<div
					style={{
						width: '100%',
						height: '100%',
						background: `url("${mummyAsset}") ${-frame() * MUMMY_WIDTH}px 0 / ${MUMMY_WIDTH * 2}px ${MUMMY_DRAWN}px no-repeat`,
						'image-rendering': 'pixelated',
					}}
				/>
			),
		}),
		onEnterFrame({ $ }) {
			const mummy = mummyAt(world, { ...state, obstacle: o })
			const floor = world.terrain.groundY(mummy.x)
			if (state.scooped) {
				const flight = scoopFlight(state.scooped, world.ticks())
				$.setX(mummy.x - MUMMY_WIDTH / 2 + flight.x)
				$.setY(floor - MUMMY_DRAWN + flight.y)
				$.setRotation(flight.spin)
				return
			}
			$.setX(mummy.x - MUMMY_WIDTH / 2)
			$.setY(floor - MUMMY_DRAWN)
			// Drawn facing left: turned round, going right.
			$.setXScale(mummy.facing === 1 ? -1 : 1)
			setFrame(Math.floor(world.ticks() / MUMMY_STEP) % 2)
		},
	})
}

/** How far Hands' earth sinks into the path, so they poke up out of it. */
const CELL_SINK = 4

/** How far down from the top of a street over a Cave a Sewage Drain's grate is: in the road. */
const STREET_GRATE = 26

const VENT_WIDTH = 40
const VENT_HEIGHT = 30
/** An air vent on a roof: a grey box with a grille, and its cowl on top. */
const VentArt = () => (
	<PixelArt src={ventAsset} width={VENT_WIDTH} height={VENT_HEIGHT} />
)

/**
 * Everyone whose name could be on a tombstone: the club's members and
 * guests, and this browser's own custom runners, shuffled.
 */
function gravestoneNames() {
	const names = [
		...MEMBERS.map((m) => m.name),
		...guests().map((g) => g.name),
		...customRunners().map((r) => r.name),
	]
	for (let i = names.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[names[i], names[j]] = [names[j], names[i]]
	}
	return names.length ? names : ['Scoop']
}

/**
 * A name carved in a tombstone's panel, as on the website's tombstone sign:
 * dark, lit along each letter's bottom edge, smaller the longer it is.
 */
/** The highest the ground gets (the least `groundY`) between `from` and `to`. */
function highestUnder(
	groundY: (x: number) => number,
	from: number,
	to: number,
) {
	let highest = groundY(to)
	for (let at = from; at < to; at += 4) highest = Math.min(highest, groundY(at))
	return highest
}

/** How far past either end of it a footing's grass runs on down the slope. */
const FOOTING_SHOULDER = 60
/** How far into the verge a footing's grass goes, so no sky shows between them. */
const FOOTING_OVERLAP = 4

/**
 * The field made up under something wide on a hill, from its foot down to
 * the verge wherever the ground falls away under it, and sloping off past
 * its ends: the Copper Tents, levelled on the top of Haga's hill. In the
 * verge's green, so it's all one field. `base` is its foot, in the world.
 */
function Footing(props: {
	groundY: (x: number) => number
	x: number
	width: number
	base: number
}) {
	const columns = () => {
		const { groundY, x, width } = props
		const base = Math.round(props.base)
		const rects: string[] = []
		let deepest = 0
		for (let at = -FOOTING_SHOULDER; at < width + FOOTING_SHOULDER; at += 2) {
			const top = at < 0 ? -at / 2 : at > width ? (at - width) / 2 : 0
			const verge = groundY(x - width / 2 + at + 1) - PATH_BACK - VERGE
			const bottom = Math.round(verge - base) + FOOTING_OVERLAP
			if (bottom <= top) continue
			rects.push(`M${at + FOOTING_SHOULDER} ${Math.round(top)}h2V${bottom}h-2Z`)
			deepest = Math.max(deepest, bottom)
		}
		return { path: rects.join(''), deepest }
	}
	return (
		<svg
			aria-hidden="true"
			width={props.width + FOOTING_SHOULDER * 2}
			height={columns().deepest}
			shape-rendering="crispEdges"
			style={{
				position: 'absolute',
				left: `${-FOOTING_SHOULDER}px`,
				top: '100%',
				'pointer-events': 'none',
			}}
		>
			<path d={columns().path} fill="var(--grass-green)" />
		</svg>
	)
}

function Carved(props: {
	name: string
	panel: [number, number, number, number]
	scale: number
}) {
	const [x, y, width, height] = props.panel.map((n) => n * props.scale)
	const longest = Math.max(...props.name.split(' ').map((w) => w.length))
	return (
		<div
			style={{
				position: 'absolute',
				left: `${x}px`,
				top: `${y}px`,
				width: `${width}px`,
				height: `${height}px`,
				display: 'flex',
				'align-items': 'center',
				'justify-content': 'center',
				'text-align': 'center',
				color: '#383838',
				'text-shadow': '0 1px 0 #a6a6a6',
				'font-family': 'var(--font-pixel)',
				'font-size': `${longest > 6 ? 9 : longest > 4 ? 11 : 13}px`,
				'line-height': 0.95,
				'text-transform': 'uppercase',
				'overflow-wrap': 'anywhere',
			}}
		>
			{props.name}
		</div>
	)
}

/**
 * A low-branch tree, `assets/obstacles/low-branch-tree.png`, and its limb,
 * `low-branch-limb.png`, over it: its trunk behind the path, its limb
 * reaching forward across it, crossing the line everyone runs along
 * `BRANCH_CROSS` px into its art and on its row `BRANCH_LINE_ROW`, at `x`,
 * `BRANCH_LIMB_HEIGHT` up. Its art's middle is `BRANCH_TREE_ALONG` past that
 * `x`. Jumping over its limb, within `BRANCH_OVER_REACH` of `x`, it's drawn
 * behind you.
 */
const BRANCH_TREE_WIDTH = 190
const BRANCH_TREE_HEIGHT = 260
const BRANCH_CROSS = 70
const BRANCH_LINE_ROW = 249
const BRANCH_TREE_ALONG = BRANCH_TREE_WIDTH / 2 - BRANCH_CROSS
const BRANCH_LIMB_HEIGHT = 50
const BRANCH_OVER_REACH = 80

/** How far down into the sea a km sign's buoy floats. */
const BUOY_SINK = 22
const BUOY_HEIGHT = 30

/** A km sign's buoy, out at sea: red and white, its post up out of it. */
function Buoy() {
	return (
		<div
			style={{
				position: 'absolute',
				left: `${KM_SIGN_WIDTH / 2 - 15}px`,
				bottom: 0,
				width: '30px',
				height: `${BUOY_HEIGHT}px`,
				background:
					'linear-gradient(to bottom, #e8473c 0 10px, #f6f7f8 10px 18px, #e8473c 18px)',
				border: '3px solid #1d1d1d',
				'border-radius': '6px 6px 2px 2px',
				'box-sizing': 'border-box',
			}}
		/>
	)
}

const KM_SIGN_WIDTH = 64
const KM_SIGN_HEIGHT = 84
const KM_BOARD_HEIGHT = 34

/**
 * A sign at each whole kilometre between the start and the finish, 1 km to
 * 4 km: a yellow board on a post, as the marshals' arrow signs are, at the
 * back of the path. Off a Gap, onto the Ground just past it; and out from
 * behind a low-branch tree, to whichever side is nearer, so it can be read.
 */
/** How deep a Tunnel's warning stripes are, along the edge of the rock over its way in. */
const WARNING_DEPTH = 10

/**
 * Yellow and black stripes along the edge of the rock over each Tunnel's way
 * in (see the Cave's `warnings`): following the Ceiling down, or level along
 * a shelf of rock's underside, in front of it.
 */
export function createWarnings(world: World) {
	const { cave } = world.course
	if (!cave?.warnings) return []
	return cave.warnings.map((warning, i) => {
		/** The rock's edge at `x`, a y. */
		const edge = (x: number) => warning.roof ?? cave.ceiling(x) ?? 0
		const xs: number[] = []
		for (let x = warning.from; x <= warning.to; x += 4) xs.push(x)
		const top = Math.min(...xs.map(edge)) - WARNING_DEPTH
		const bottom = Math.max(...xs.map(edge))
		const width = warning.to - warning.from
		// Its band, a column at a time, down to the edge.
		const band = xs
			.slice(0, -1)
			.map((x) => {
				const y = Math.round(edge(x + 2)) - top
				return `M${x - warning.from},${y - WARNING_DEPTH}h4v${WARNING_DEPTH}h-4Z`
			})
			.join('')
		return createController({
			init: () => ({
				id: `warning-${i}`,
				type: 'sign',
				x: () => warning.from,
				y: () => top,
				width: () => width,
				height: () => bottom - top,
				children: () => (
					<svg
						width={width}
						height={bottom - top}
						shape-rendering="crispEdges"
						aria-hidden="true"
						style={{ display: 'block', overflow: 'visible' }}
					>
						<defs>
							<pattern
								id={`warning-stripes-${i}`}
								patternUnits="userSpaceOnUse"
								width={16}
								height={16}
								patternTransform="rotate(45)"
							>
								<rect width={16} height={16} fill="#ffc21a" />
								<rect width={8} height={16} fill="#1d1d1d" />
							</pattern>
						</defs>
						<path d={band} fill={`url(#warning-stripes-${i})`} />
					</svg>
				),
			}),
		})
	})
}

export function createKmSigns(world: World) {
	const { terrain } = world
	const { sea } = world.course
	return [1, 2, 3, 4].map((km) => {
		let x = START_X + km * 1000 * PX_PER_M
		// Out at sea, on a buoy, bobbing.
		const afloat = !!sea && x > sea.from + 100 && x < sea.to - 200
		const gap = terrain.gaps.find((g) => x > g.from - 30 && x < g.to + 30)
		if (gap && !afloat) x = gap.to + 40
		const clear = (BRANCH_TREE_WIDTH + KM_SIGN_WIDTH) / 2 + 8
		const tree = world.course.obstacles.find(
			(o) =>
				o.kind === 'branch' && Math.abs(x - (o.x + BRANCH_TREE_ALONG)) < clear,
		)
		if (tree) {
			const middle = tree.x + BRANCH_TREE_ALONG
			x = x < middle ? middle - clear : middle + clear
		}
		return createFixture({
			id: `km-sign-${km}`,
			type: 'sign',
			x,
			sink: afloat ? BUOY_SINK : 4 - PATH_BACK,
			width: KM_SIGN_WIDTH,
			height: KM_SIGN_HEIGHT,
			world,
			lift: afloat
				? (age) => Math.round(Math.sin(age / 20 + km) * 3)
				: undefined,
			children: () => (
				<div style={{ position: 'relative', width: '100%', height: '100%' }}>
					<Show when={afloat}>
						<Buoy />
					</Show>
					<div
						style={{
							position: 'absolute',
							left: `${KM_SIGN_WIDTH / 2 - 3}px`,
							top: `${KM_BOARD_HEIGHT - 2}px`,
							width: '6px',
							bottom: 0,
							background: '#7a7f86',
							'border-left': '2px solid #565a60',
							'box-sizing': 'border-box',
						}}
					/>
					<div
						style={{
							position: 'absolute',
							left: 0,
							top: 0,
							width: '100%',
							height: `${KM_BOARD_HEIGHT}px`,
							display: 'flex',
							'align-items': 'center',
							'justify-content': 'center',
							gap: '3px',
							background: '#f7d117',
							border: '3px solid #1d1d1d',
							'box-sizing': 'border-box',
							color: '#1d1d1d',
							'font-family': 'var(--font-pixel)',
							'font-size': '18px',
							'line-height': 1,
							'padding-top': '2px',
						}}
					>
						{km}KM
						<span style={{ 'font-size': '14px' }}>→</span>
					</div>
				</div>
			),
		})
	})
}

/**
 * Scooped, flying off the bus: over everything on the course, the parapet
 * in front and guard towers too, all the way down, rather than going under
 * them as they fall back past. Every sprite's in one stacking context.
 */
const SCOOPED_OVER = '1'

/** A wall's battlements: its brick, darker; or its stone. */
const battlementFills = (
	stone: NonNullable<CourseLook['battlements']>,
): string[] =>
	stone.brick ? [stone.brick.fill, stone.brick.dim] : [stone.stone]

/**
 * In front of everyone: a wall's parapet along the path's near edge, with
 * its merlons, if the course has battlements. One picture, the whole course
 * long, drawn once.
 */
export function createForeground(world: World) {
	const stone = world.course.look?.battlements
	if (!stone) return []
	const { terrain } = world
	const from = DRAWN_FROM
	const to = terrain.finishX + 1600
	const width = to - from
	return [
		createController({
			init: () => ({
				id: 'foreground',
				type: 'foreground',
				x: () => from,
				y: () => 0,
				width: () => width,
				height: () => VIEW_HEIGHT,
				children: () => (
					<svg
						width={width}
						height={VIEW_HEIGHT}
						viewBox={`0 0 ${width} ${VIEW_HEIGHT}`}
						shape-rendering="crispEdges"
						aria-hidden="true"
						style={{ display: 'block', overflow: 'visible' }}
					>
						{/* Its fills can be the Ground's patterns: drawn from the
						    same place, they line up with its own. */}
						<For each={battlementFills(stone)}>
							{(fill) => (
								<path d={frontParapet(terrain, from, to, 4)} fill={fill} />
							)}
						</For>
						<Show when={stone.cap}>
							{(cap) => (
								<path
									d={frontParapetCaps(terrain, from, to, 4, 2)}
									fill={cap()}
								/>
							)}
						</Show>
					</svg>
				),
			}),
		}),
	]
}

/**
 * A guard tower over a wall's walkway, in two halves: its front, the
 * battlements along the front of its roof, and the near half of its side,
 * in front of everyone; the far half of its side, with the back of its
 * gateway, and its roof, with the rest of its battlements, behind them, so
 * anyone up on its roof stands on it. In through its left side out of sight, hidden behind its front a
 * moment, and out through the gateway in its right, past the back of it.
 */
function createTower(world: World, x: number, i: number) {
	const stone = world.course.look?.battlements ?? {
		stone: '#b0a795',
		shade: '#7a7265',
	}
	const depth = PATH_BACK + PATH_FRONT
	const S = DEPTH_SLANT
	const W = TOWER_WIDTH
	const H = TOWER_HEIGHT
	const M = TOWER_MERLON
	const width = W + S
	const height = H + depth + M
	/** Its foot, along the path's near edge. */
	const foot = world.terrain.groundY(x) + PATH_FRONT
	/** A point on its side: `u` of the way back, `v` up from its foot. */
	const side = (u: number, v: number) =>
		`${W + u * S},${M + depth + H - u * depth - v}`
	/**
	 * The foot of its side, going back, in steps a pixel wide, as pixel art,
	 * from `xa` to `xb` (either way): the points along it, each step's
	 * height where its middle is.
	 */
	const stepped = (xa: number, xb: number) => {
		const P = TOWER_PIXEL
		const footAt = (x: number) =>
			Math.round((M + depth + H - ((x - W) / S) * depth) / 2) * 2
		const lo = Math.min(xa, xb)
		const hi = Math.max(xa, xb)
		const points: string[] = []
		for (let x = lo; x < hi; ) {
			const next = Math.min(hi, (Math.floor(x / P) + 1) * P)
			const y = footAt((x + next) / 2)
			points.push(`${x},${y}`, `${next},${y}`)
			x = next
		}
		if (xa > xb) points.reverse()
		return points.map((p) => `L${p}`).join(' ')
	}
	/**
	 * The gateway through its side, from `u0` to `u1` of the way back (it
	 * runs from 0.14 to 0.86): its top an arch, drawn in steps, as pixels,
	 * its sides straight up, and its foot the floor, along the bottom of the
	 * wall it's cut out of, exactly, so nothing's left between them.
	 */
	const gateway = (u0: number, u1: number) => {
		const a0 = Math.max(u0, 0.14)
		const a1 = Math.min(u1, 0.86)
		const P = TOWER_PIXEL
		const snap = (n: number) => Math.round(n / P) * P
		// Out to whole pixels, but never past its wall's own edges: what's cut
		// out beyond them would be filled in instead.
		const x0 = Math.max(Math.floor((W + a0 * S) / P) * P, W + u0 * S)
		const x1 = Math.min(Math.ceil((W + a1 * S) / P) * P, W + u1 * S)
		/** Where the arch's top and its foot are, `x` along. */
		const at = (x: number) => {
			const u = (x - W) / S
			const t = (u - 0.14) / 0.72
			const foot = M + depth + H - u * depth
			return {
				top: snap(foot - TOWER_DOOR - Math.sin(Math.PI * t) * TOWER_ARCH),
			}
		}
		const tops: string[] = []
		for (let x = x0; x < x1; x += P) {
			const { top } = at(x + P / 2)
			tops.push(`${x},${top} ${x + P},${top}`)
		}
		return `M${tops.join(' ')} ${stepped(x1, x0)} Z`
	}
	/**
	 * Where its side's split into the half in front of everyone and the half
	 * behind: on a whole pixel, so the gateway's edges meet there exactly.
	 */
	/** How far the half behind reaches under the half in front, so no gap shows between. */
	const SEAM = 2 / S
	const SPLIT = (Math.round((W + S / 2) / TOWER_PIXEL) * TOWER_PIXEL - W) / S
	/** Its side from `u0` to `u1` of the way back, the gateway cut out of it. */
	const sidePart = (u0: number, u1: number) => {
		const wall = [side(u0, H), side(u1, H)]
		return `M${wall.join(' L')} ${stepped(W + u1 * S, W + u0 * S)} Z ${gateway(u0, u1)}`
	}
	const courses: number[] = []
	for (let y = M + depth + 10; y < height; y += 12) courses.push(y)
	/** Merlons along an edge of its roof, from one corner to the other. */
	const merlonsAlong = (
		[x0, y0]: [number, number],
		[x1, y1]: [number, number],
		count: number,
	) =>
		Array.from({ length: count }, (_, k) => {
			const t = (k + 0.5) / count
			// On whole pixels, so they're as crisp as everything else.
			return {
				x: Math.round((x0 + (x1 - x0) * t - M / 2) / 2) * 2,
				y: Math.round((y0 + (y1 - y0) * t - M) / 2) * 2,
			}
		})
	const nearLeft: [number, number] = [0, M + depth]
	const nearRight: [number, number] = [W, M + depth]
	const farLeft: [number, number] = [S, M]
	const farRight: [number, number] = [W + S, M]
	/**
	 * Its battlements along the back and down either side, behind whoever's
	 * up on its roof; along the front, in front of them.
	 */
	const backMerlons = [
		...merlonsAlong(farLeft, farRight, 7),
		...merlonsAlong(nearLeft, farLeft, 2),
		...merlonsAlong(nearRight, farRight, 2),
	]
	const frontMerlons = merlonsAlong(nearLeft, nearRight, 7)
	/** Its brick, or plain stone: in front; its side, in shade; its battlements, darker. */
	const { brick } = stone
	const frontFills = brick ? [brick.fill] : [stone.stone]
	const sideFills = brick ? [brick.fill, brick.shade] : [stone.shade]
	const merlonFills = battlementFills(stone)
	/** Merlons, filled, their tops catching the light. */
	const merlonRects = (list: { x: number; y: number }[]) => (
		<For each={list}>
			{(m) => (
				<>
					<For each={merlonFills}>
						{(fill) => (
							<rect x={m.x} y={m.y} width={M} height={M} fill={fill} />
						)}
					</For>
					<Show when={stone.cap}>
						{(cap) => (
							<rect x={m.x} y={m.y} width={M} height={2} fill={cap()} />
						)}
					</Show>
				</>
			)}
		</For>
	)
	const svg = (children: JSX.Element) => (
		<svg
			width={width}
			height={height}
			viewBox={`0 0 ${width} ${height}`}
			shape-rendering="crispEdges"
			aria-hidden="true"
			style={{ display: 'block' }}
		>
			{children}
		</svg>
	)
	const at = {
		x: () => x - W / 2,
		y: () => foot - height,
		width: () => width,
		height: () => height,
	}
	const back = createController({
		init: () => ({
			id: `tower-back-${i}`,
			type: 'tower-back',
			...at,
			children: () =>
				svg(
					<>
						{/* Inside it, through the gateway: dark, down to the
						    walkway's far edge. Under that, the walkway itself, the
						    Ground's, going on through it. */}
						<clipPath id={`tower-side-${i}`}>
							<path
								d={`M${[side(0, H), side(1, H)].join(' L')} ${stepped(W + S, W)} Z`}
							/>
						</clipPath>
						<clipPath id={`tower-inside-${i}`}>
							<rect x={0} y={0} width={width} height={height - depth} />
						</clipPath>
						{/* A little over the gateway's edges, so no sky shows round
						    them, zoomed: the side covers what's over. */}
						<g clip-path={`url(#tower-inside-${i})`}>
							<path
								d={gateway(0, 1)}
								fill="#3a342c"
								stroke="#3a342c"
								stroke-width={2}
								clip-path={`url(#tower-side-${i})`}
							/>
						</g>
						<For each={sideFills}>
							{(fill) => (
								<path
									d={sidePart(SPLIT - SEAM, 1)}
									fill={fill}
									fill-rule="evenodd"
								/>
							)}
						</For>
						{/* Its roof, going back, behind anyone stood up on it, and
						    the battlements round its back and sides. */}
						<polygon
							points={[nearLeft, farLeft, farRight, nearRight]
								.map((p) => p.join(','))
								.join(' ')}
							fill={stone.roof ?? stone.shade}
						/>
						{merlonRects(backMerlons)}
					</>,
				),
		}),
	})
	const front = createController({
		init: () => ({
			id: `tower-${i}`,
			type: 'tower',
			...at,
			children: () =>
				svg(
					<>
						<For each={sideFills}>
							{(fill) => (
								<path d={sidePart(0, SPLIT)} fill={fill} fill-rule="evenodd" />
							)}
						</For>
						{/* The battlements along the front of its roof. */}
						{merlonRects(frontMerlons)}
						{/* Its front, in brick, or in courses of stone. */}
						<For each={frontFills}>
							{(fill) => (
								<rect x={0} y={M + depth} width={W} height={H} fill={fill} />
							)}
						</For>
						<Show when={!brick}>
							<For each={courses}>
								{(y) => (
									<rect x={0} y={y} width={W} height={2} fill={stone.shade} />
								)}
							</For>
						</Show>
						<rect
							x={0}
							y={M + depth + 74}
							width={W}
							height={6}
							fill={stone.shade}
						/>
						{/* Arrow slits, upstairs and down. */}
						<For each={[28, 62, 96]}>
							{(sx) => (
								<>
									<rect
										x={sx}
										y={M + depth + 26}
										width={6}
										height={22}
										fill="#2b2722"
									/>
									<rect
										x={sx - 2}
										y={M + depth + 34}
										width={10}
										height={4}
										fill="#2b2722"
									/>
								</>
							)}
						</For>
						<For each={[34, 90]}>
							{(sx) => (
								<rect
									x={sx}
									y={M + depth + 102}
									width={6}
									height={20}
									fill="#2b2722"
								/>
							)}
						</For>
						{/* The front edge's merlons again, over the front. */}
						{merlonRects(merlonsAlong(nearLeft, nearRight, 7))}
					</>,
				),
		}),
	})
	return [back, front]
}

/** A course's guard towers, if it has any: see `createTower`. */
export function createTowers(world: World) {
	return (world.course.towers ?? []).flatMap((x, i) => createTower(world, x, i))
}

/**
 * How big a course's name is lettered on its sign: as big as fits, its
 * longest word across the flat middle of the board, and smaller for a name
 * that goes over two lines.
 */
/** Whether a course's name goes over two lines on its sign. */
const signWraps = (name: string) => name.length > 8 && name.includes(' ')

function signLetters(name: string) {
	const longest = Math.max(...name.split(' ').map((word) => word.length))
	return Math.min(name.length > 8 ? 22 : 32, Math.floor(84 / (longest * 0.36)))
}
