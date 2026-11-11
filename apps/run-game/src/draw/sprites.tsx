import pumpkin1Asset from '@/assets/halloween/pumpkin1.png'
import pumpkin2Asset from '@/assets/halloween/pumpkin2.png'
import pumpkin3Asset from '@/assets/halloween/pumpkin3.png'
import pumpkin4Asset from '@/assets/halloween/pumpkin4.png'
import pumpkin5Asset from '@/assets/halloween/pumpkin5.png'
import tombstoneAsset from '@/assets/halloween/tombstone.png'
import rockAsset from '@/assets/misc/rock1.png'
import { type RunnerName, runners } from '@/data/runners'
import {
	createConnectedController,
	createController,
	createObjectSignal,
} from '@/engine'
import { imageSize } from '@/utils/imageSize'
import { For, type JSX, Show, createSignal } from 'solid-js'
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
import { seeded } from '../courses/kit/seeded'
import type { Obstacle } from '../courses/types'
import { inTunnel } from '../game/cave'
import {
	BARCODE_TALL,
	BARCODE_WIDTH,
	DEPTH_SLANT,
	PATH_BACK,
	PATH_FRONT,
	PX_PER_M,
	RUNNER_SCALE,
	SQUASHED,
	START_X,
	VIEW_HEIGHT,
} from '../game/constants'
import { cyclistAt } from '../game/cyclists'
import { FIKA_SIZE } from '../game/fika'
import { FURBY_HEIGHT, FURBY_WIDTH, furbySquash } from '../game/furbies'
import { mummyAt } from '../game/mummies'
import { platformAt } from '../game/platforms'
import { steamPuff } from '../game/steam'
import { countdownWord, scoopFlight, stepWorld } from '../game/step'
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
	World,
} from '../game/world'
import { ZOMBIE_SINK_GONE, zombieAt } from '../game/zombies'
import { customRunners } from '../runners/customRunners'
import { guests } from '../runners/guests'
import { MEMBERS } from '../runners/playable'
import { SKELETON_FILTER, zombieSprite } from '../runners/skeleton'
import { Bubble } from './Bubble'
import { PixelArt } from './PixelArt'
import { Pixels } from './Pixels'
import type { CorgiPose } from './art/corgi'
import { FikaArt } from './art/fika'
import { GEESE_HEIGHT, GeeseArt, geeseWidth } from './art/geese'
import { KIDS_HEIGHT, KidsArt, kidsWidth } from './art/kids'
import { TouristsArt, touristsWidth } from './art/tourists'
import {
	HURDLE_LANES,
	HurdleArt,
	POTHOLE_ABOVE,
	POTHOLE_HEIGHT,
	PotholeArt,
	hurdleSize,
} from './art/track'
import { frontParapet } from './battlements'
import { rideBus, startRide } from './busRide'
import { flyerLook } from './flyerLook'
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
	const runSize = {
		width: sprite.width * RUNNER_SCALE,
		height: sprite.height * RUNNER_SCALE,
	}

	const { body } = racer
	// Sat down, ducking or riding a corgi. `body` isn't a signal: reading
	// the tick keeps this up to date.
	const ducking = () =>
		world.ticks() >= 0 &&
		(body.ducking || body.mount > 0 || (seated && body.carried > 0)) &&
		!!sit
	// Stood still, on their feet: on the start line, or stopped.
	const standing = () =>
		world.ticks() >= 0 &&
		!!stand &&
		!ducking() &&
		body.grounded &&
		body.carried === 0 &&
		racer.out !== 'scooped' &&
		Math.abs(body.vx) < STILL_SPEED

	return createController({
		frames: [...run, ...(sit ? [sit] : []), ...(stand ? [stand] : [])],
		init() {
			const size = () =>
				// Stood, as tall and wide as a run frame: a custom runner's stand
				// is one frame of a strip, not a picture of its own.
				ducking() ? poseSize(sit, sprite) : runSize
			return {
				id: `player-${racer.id}`,
				type: 'player',
				...createObjectSignal(0, 'x'),
				...createObjectSignal(0, 'y'),
				width: () => size().width,
				height: () => size().height,
				frames: () =>
					ducking() && sit ? [sit] : standing() && stand ? [stand] : run,
				...createObjectSignal(undefined as number | undefined, 'frame'),
				// Run sprites face left, the way the header's runners run.
				...createObjectSignal(-1, 'xScale'),
				...createObjectSignal(0, 'rotation'),
				...createObjectSignal(100, 'frameInterval'),
				...createObjectSignal('pause' as 'play' | 'pause', 'state'),
				...createObjectSignal({} as JSX.CSSProperties, 'style'),
			}
		},
		onEnterFrame({ $ }) {
			const { body } = racer
			const width = $.width()
			$.setX(body.x - width / 2)
			// Up on a corgi's back, riding one.
			$.setY(body.feetY - $.height() - (body.mount > 0 ? saddle : 0))

			if (racer.out === 'scooped') {
				$.setRotation(body.spin * 14)
				$.setState('pause')
				return
			}
			const xScale = body.facing === 1 ? -1 : 1
			$.setXScale(xScale)
			$.setRotation(runnerLean(world, body))
			// Sat down, the one sit frame: switching to it from a run frame
			// would otherwise leave the engine on a frame it doesn't have. In
			// the air, legs out in one stride.
			const sitting =
				(body.ducking || body.mount > 0 || (seated && body.carried > 0)) &&
				!!sit
			// Stood still: the one stand frame.
			$.setFrame(sitting || standing() ? 0 : body.grounded ? undefined : 1)
			const speed = Math.abs(body.vx)
			$.setState(body.grounded && speed > 0.3 ? 'play' : 'pause')
			$.setFrameInterval(Math.max(45, 190 - speed * 22))
			$.setStyle({
				opacity: body.stumble > 0 && body.stumble % 8 < 4 ? '0.4' : '1',
				// Squashed by a furby: half as tall, from their feet.
				...(body.squashed > 0
					? {
							transform: `scale(${xScale}, ${SQUASHED})`,
							'transform-origin': '50% 100%',
						}
					: {}),
			})
		},
	})
}

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
		? (Math.atan(world.terrain.slope(body.x)) * 180) / Math.PI
		: 0
}

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
	/** Ducked down, going through a Tunnel. `p` isn't a signal: reading the tick keeps this up to date. */
	const ducked = () =>
		world.ticks() >= 0 && !!sit && p.grounded && inTunnel(world, p.x, p.feetY)
	/** Stood still, on the start line or stopped. */
	const standing = () =>
		world.ticks() >= 0 &&
		!!stand &&
		!ducked() &&
		p.grounded &&
		!p.scooped &&
		Math.abs(p.vx) < STILL_SPEED
	const size = () => (ducked() ? poseSize(sit, sprite) : runSize)
	return createController({
		frames: [...sprite.run, ...(sit ? [sit] : []), ...(stand ? [stand] : [])],
		randomStartFrame: true,
		init: () => ({
			id: `pacer-${p.id}`,
			type: 'pacer',
			...createObjectSignal(p.x - runSize.width / 2, 'x'),
			...createObjectSignal(p.feetY - runSize.height, 'y'),
			width: () => size().width,
			height: () => size().height,
			frames: () =>
				ducked() && sit ? [sit] : standing() && stand ? [stand] : sprite.run,
			...createObjectSignal(undefined as number | undefined, 'frame'),
			// Facing right, the way they're running.
			xScale: () => -1,
			...createObjectSignal(0, 'rotation'),
			...createObjectSignal(150, 'frameInterval'),
			...createObjectSignal('pause' as 'play' | 'pause', 'state'),
			...createObjectSignal({} as JSX.CSSProperties, 'style'),
		}),
		onEnterFrame({ $ }) {
			$.setX(p.x - $.width() / 2)
			$.setY(p.feetY - $.height())
			if (p.scooped) {
				$.setRotation(p.spin * 14)
				$.setState('pause')
				return
			}
			// Leaning with the hill, running; upright, stood still.
			$.setRotation(
				p.grounded && !standing()
					? (Math.atan(world.terrain.slope(p.x)) * 180) / Math.PI
					: 0,
			)
			// Ducked through a Tunnel: the one sit frame. Stood still: the one stand frame.
			const down = ducked()
			$.setFrame(down || standing() ? 0 : p.grounded ? undefined : 1)
			const speed = Math.abs(p.vx)
			$.setState(p.grounded && !down && speed > 0.3 ? 'play' : 'pause')
			$.setFrameInterval(Math.max(45, 190 - speed * 22))
			// Flashing while they're dazed, and can't be bounced on again.
			$.setStyle({
				opacity: p.dazed > 0 && p.dazed % 8 < 4 ? '0.4' : '1',
				filter: p.skeleton ? SKELETON_FILTER : undefined,
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

/** The course's corgis, if it has any. */
export function createCorgis(world: World) {
	return world.corgis.map((c) => createCorgi(world, c))
}

function createCorgi(world: World, c: Corgi) {
	const {
		width: CORGI_WIDTH,
		height: CORGI_HEIGHT,
		Art,
		call,
	} = rideLook(world.course)
	const [pose, setPose] = createSignal<CorgiPose>('sit')
	const [facing, setFacing] = createSignal<1 | -1>(c.facing)
	const [barking, setBarking] = createSignal(false)
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
					<Art pose={pose()} />
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
			// Barking on and off, rather than one long bark.
			setBarking(c.barking && world.ticks() % 50 < 30)
			setPose(
				c.state === 'scooped'
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
					: (Math.atan(world.terrain.slope(c.x)) * 180) / Math.PI,
			)
		},
	})
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
			})
		},
	})
}

const BUS_WIDTH = 247
const BUS_HEIGHT = 127
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
const DRILL_TIP_DOWN = 94 - 35 + 33

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
	const ground = world.terrain.groundY(x)
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

/** How much further out than a scoop a drill is, and how much higher: at the front, headlight high. */
const DRILL_OUT = 25
const DRILL_UP = 35
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
	/** A drill reaches further out than a scoop: the bus is that much further back, its tip where it scoops. */
	const drillOut = look.drill ? DRILL_OUT : 0
	const bus = createController({
		frames: [busBackAsset],
		init: () => ({
			id: 'bus',
			type: 'bus',
			width: () => BUS_WIDTH,
			height: () => BUS_HEIGHT,
			...createObjectSignal(world.bus.frontX - SCOOP_FRONT - drillOut, 'x'),
			...createObjectSignal(0, 'y'),
			...createObjectSignal(0, 'rotation'),
		}),
		onEnterFrame({ $, $age }) {
			const middle = world.bus.frontX - SCOOP_FRONT - drillOut + BUS_WIDTH / 2
			world.bus.ride ??= startRide(world, middle)
			const ride = world.bus.ride
			rideBus(world, ride, middle)
			$.setX(world.bus.frontX - SCOOP_FRONT - drillOut)
			$.setY(
				ride.y - WHEEL_BOTTOM + (ride.grounded ? Math.cos(10 + $age / 2) : 0),
			)
			// Nose up as it jumps, down as it drops; with the hill, on it.
			$.setRotation(
				ride.grounded
					? (Math.atan(world.terrain.slope(middle)) * 180) / Math.PI +
							(Math.random() - 0.5) * 0.8
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

	part('bus-wheel1', wheel1Asset, 34, 38, { x: 140, y: 105 }, { y: bounce(0) })
	part('bus-wheel2', wheel2Asset, 34, 38, { x: 208, y: 103 }, { y: bounce(5) })
	part('bus-wheel3', wheel3Asset, 19, 23, { x: 68, y: 105 }, { y: bounce(10) })
	part('bus-wheel4', wheel4Asset, 26, 30, { x: 24, y: 102 }, { y: bounce(15) })
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
	part('bus-body', look.body, BUS_WIDTH, BUS_HEIGHT, { x: 0, y: 0 })
	part(
		'bus-scoop',
		look.scoop,
		88,
		57,
		look.drill ? { x: 181 + DRILL_OUT, y: 94 - DRILL_UP } : { x: 181, y: 94 },
		{
			// A drill, in a Cave, turning as it goes.
			...(look.drill && {
				frames: look.drill,
				frame: () => Math.floor(Math.max(0, world.ticks()) / 2) % 2,
			}),
			// `scooping` and `reach` aren't signals: reading the tick redraws
			// it every tick. Gone up the Scoop Arm while that's out.
			style: () => ({
				transition: 'transform 60ms linear',
				// Lifted about its top front corner.
				'transform-origin': '88px 0px',
				visibility: world.ticks() >= 0 && armOut(world) ? 'hidden' : 'visible',
				transform:
					world.ticks() >= 0 && world.bus.scooping > 0
						? 'translateY(-45px) rotate(-10deg)'
						: 'translateY(0px) rotate(0deg)',
			}),
		},
	)

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
	if (!cave || !look) return []
	const { groundY } = world.terrain
	const random = seeded(4404)
	const columns: { x: number; top: number; bottom: number; rim: boolean }[] = []
	for (let x = cave.from; x < cave.to; x += 4) {
		const ground = groundY(x)
		const rough = Math.round((ground - BORE_HEIGHT + random() * 6) / 2) * 2
		// No higher than the rock goes: over a low hill, or the Sphinx's
		// haunches, the bus is out in the open, not boring a hole.
		const surface = cave.surface(x)
		const top = surface === undefined ? rough : Math.max(rough, surface + 2)
		const bottom = Math.round(ground - PATH_BACK + 1)
		if (top >= bottom) continue
		const ceiling = cave.ceiling(x)
		columns.push({
			x: x - cave.from,
			top,
			bottom: Math.round(ground - PATH_BACK + 1),
			// Only where it's cut the Cave's rock back: bigger than the space
			// was, and under the hill's top, not along it.
			rim: ceiling !== undefined && ceiling > top && top === rough,
		})
	}
	const highest = Math.min(...columns.map((c) => c.top)) - 4
	const lowest = Math.max(...columns.map((c) => c.bottom))
	const width = cave.to - cave.from
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
				x: () => cave.from,
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
							<path d={hole} fill={look.wall} />
							<path d={rim} fill={look.seam} />
						</svg>
					</div>
				),
			}),
			onEnterFrame() {
				setShown(
					Math.max(0, Math.min(width, world.bus.frontX - 40 - cave.from)),
				)
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
	return world.platforms.map((platform, i) => {
		const start = platformAt(world.terrain, platform, world.ticks())
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
						<PlatformArt look={look} />
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
									height: '1400px',
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
	const WIDTH = 56
	const HEIGHT = 48
	return createController({
		frames: [cyclist1Asset, cyclist2Asset],
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
		}),
		onEnterFrame({ $ }) {
			const cyclist = cyclistAt(world, { ...state, obstacle: o })
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
	const standing = world.course.scenery.filter(
		({ x }) => !world.terrain.inGap(x),
	)
	let carvings = 0
	return standing.map((piece, i) => {
		const { x, asset, scale = 1, filter, hops, carved } = piece
		const setBack = piece.setBack ?? SCENERY_SET_BACK
		const name = carved ? names[carvings++ % names.length] : undefined
		const width = () => (imageSize(asset)?.width ?? 0) * scale
		const height = () => (imageSize(asset)?.height ?? 0) * scale
		/**
		 * The path's back edge at its highest under it, so a slope doesn't run
		 * into its foot; or on the floor, where its middle is.
		 */
		const pathTop = () =>
			(piece.onFloor
				? groundY(x)
				: Math.min(
						groundY(x - width() / 2),
						groundY(x),
						groundY(x + width() / 2),
					)) - PATH_BACK
		const top = () => pathTop() - setBack - height()
		/** Each hopper on its own beat. */
		const beat = (i * 37) % HOP_EVERY
		const [lift, setLift] = createSignal(0)
		return createController({
			frames: [asset],
			init: () => ({
				id: `scenery-${i}`,
				type: 'scenery',
				children: carved
					? () => <Carved name={name ?? ''} panel={carved} scale={scale} />
					: undefined,
				x: () => x - width() / 2,
				y: () => Math.round(top() - lift()),
				width,
				height,
				style: () => ({
					filter,
					'image-rendering': scale > 1 ? 'pixelated' : undefined,
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
		case 'rock':
			return createFixture({
				id,
				type: 'hazard',
				x: o.x,
				sink: 3,
				width: 56,
				height: 29,
				world,
				children: () => (
					<Scoopable world={world} state={state}>
						<img
							src={rockAsset}
							alt=""
							style={{ display: 'block', filter: world.course.look?.rock }}
						/>
					</Scoopable>
				),
			})
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
		case 'tourists':
			return createFixture({
				id,
				type: 'hazard',
				x: o.x,
				width: touristsWidth(o.count),
				height: 60,
				world,
				children: () => (
					<Scoopable world={world} state={state}>
						<TouristsArt x={o.x} count={o.count} />
					</Scoopable>
				),
			})
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
				children: () => <PotholeArt width={o.width} />,
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
/** How far down onto a runner's head a Pumpkin sits. */
const PUMPKIN_ON = 9
/** How long a knocked-off Pumpkin's seen flying. */
const PUMPKIN_FLIES = 50

/**
 * The Pumpkins on racers' heads, one for each racer, worn until a stumble
 * knocks it off, flying.
 */
export function createHats(world: World) {
	return world.racers.map((racer) => {
		const { sprite } = racer.runner
		const [carving, setCarving] = createSignal(0)
		return createController({
			init: () => ({
				id: `hat-${racer.id}`,
				type: 'hat',
				...createObjectSignal(0, 'x'),
				...createObjectSignal(0, 'y'),
				...createObjectSignal(0, 'rotation'),
				...createObjectSignal({} as JSX.CSSProperties, 'style'),
				width: () => PUMPKIN_WIDTH,
				height: () => PUMPKIN_HEIGHT,
				children: () => (
					<Show when={carving()}>
						{(n) => (
							<img
								src={PUMPKINS[n() - 1]}
								alt=""
								style={{ display: 'block' }}
							/>
						)}
					</Show>
				),
			}),
			onEnterFrame({ $ }) {
				const { body } = racer
				const lost = body.lostPumpkin
				const since = lost ? world.ticks() - lost.at : PUMPKIN_FLIES
				setCarving(
					body.pumpkin || (since < PUMPKIN_FLIES ? (lost?.carving ?? 0) : 0),
				)
				if (!carving()) return
				const sitting = (body.ducking || body.mount > 0) && !!sprite.sit
				const height =
					(sitting
						? poseSize(sprite.sit, sprite).height
						: sprite.height * RUNNER_SCALE) * (body.squashed > 0 ? SQUASHED : 1)
				const feet =
					body.feetY - (body.mount > 0 ? rideLook(world.course).saddle : 0)
				// On their head as they lean with the hill, as the runner's drawn
				// (see `createPlayer`): leaning round their middle, or squashed,
				// round their feet.
				const lean = runnerLean(world, body)
				const pivot = body.squashed > 0 ? 0 : height / 2
				const reach = height - pivot
				const radians = (lean * Math.PI) / 180
				const headX = body.x + reach * Math.sin(radians)
				const headY = feet - pivot - reach * Math.cos(radians)
				const x = headX - PUMPKIN_WIDTH / 2
				const y = headY - PUMPKIN_HEIGHT + PUMPKIN_ON
				if (body.pumpkin) {
					$.setX(x)
					$.setY(y)
					$.setRotation(racer.out === 'scooped' ? body.spin * 14 : lean)
					$.setStyle({ opacity: 1 })
					return
				}
				// Knocked off: up and away behind them, spinning, fading.
				const flight = scoopFlight(
					{ at: lost?.at ?? 0, vx: -2 * body.facing },
					world.ticks(),
				)
				$.setX(x + flight.x)
				$.setY(y + flight.y * 0.6)
				$.setRotation(flight.spin)
				$.setStyle({ opacity: String(1 - since / PUMPKIN_FLIES) })
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

const KM_SIGN_WIDTH = 64
const KM_SIGN_HEIGHT = 84
const KM_BOARD_HEIGHT = 34

/**
 * A sign at each whole kilometre between the start and the finish, 1 km to
 * 4 km: a yellow board on a post, as the marshals' arrow signs are, at the
 * back of the path. Off a Gap, onto the Ground just past it; and out from
 * behind a low-branch tree, to whichever side is nearer, so it can be read.
 */
export function createKmSigns(world: World) {
	const { terrain } = world
	return [1, 2, 3, 4].map((km) => {
		let x = START_X + km * 1000 * PX_PER_M
		const gap = terrain.gaps.find((g) => x > g.from - 30 && x < g.to + 30)
		if (gap) x = gap.to + 40
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
			sink: 4 - PATH_BACK,
			width: KM_SIGN_WIDTH,
			height: KM_SIGN_HEIGHT,
			world,
			children: () => (
				<div style={{ position: 'relative', width: '100%', height: '100%' }}>
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
 * In front of everyone: a wall's parapet along the path's near edge, with
 * its merlons, if the course has battlements. One picture, the whole course
 * long, drawn once.
 */
export function createForeground(world: World) {
	const stone = world.course.look?.battlements
	if (!stone) return []
	const { terrain } = world
	const from = START_X - 1400
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
						<path d={frontParapet(terrain, from, to, 4)} fill={stone.stone} />
					</svg>
				),
			}),
		}),
	]
}

/**
 * A guard tower over a wall's walkway, in two halves: its front, its roof
 * with battlements all round, and the near half of its side, in front of
 * everyone; the far half of its side, with the back of its gateway, behind
 * them. In through its left side out of sight, hidden behind its front a
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
		/** The bottom of the wall, `x` along. */
		const floor = (x: number) => M + depth + H - ((x - W) / S) * depth
		return `M${tops.join(' ')} L${x1},${floor(x1)} L${x0},${floor(x0)} Z`
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
		const wall = [side(u0, 0), side(u0, H), side(u1, H), side(u1, 0)]
		return `M${wall.join(' L')} Z ${gateway(u0, u1)}`
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
			return { x: x0 + (x1 - x0) * t - M / 2, y: y0 + (y1 - y0) * t - M }
		})
	const nearLeft: [number, number] = [0, M + depth]
	const nearRight: [number, number] = [W, M + depth]
	const farLeft: [number, number] = [S, M]
	const farRight: [number, number] = [W + S, M]
	const merlons = [
		// Along the back and down the left first: behind the others.
		...merlonsAlong(farLeft, farRight, 7),
		...merlonsAlong(nearLeft, farLeft, 2),
		...merlonsAlong(nearRight, farRight, 2),
		...merlonsAlong(nearLeft, nearRight, 7),
	]
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
						{/* Inside it, through the gateway: dark, and the walkway's
						    floor going on through it, up to its far edge. */}
						<clipPath id={`tower-door-${i}`}>
							<path d={gateway(0, 1)} />
						</clipPath>
						<clipPath id={`tower-side-${i}`}>
							<path
								d={`M${[side(0, 0), side(0, H), side(1, H), side(1, 0)].join(' L')} Z`}
							/>
						</clipPath>
						{/* A little over the gateway's edges, so no sky shows round
						    them, zoomed: the side covers what's over. */}
						<path
							d={gateway(0, 1)}
							fill="#3a342c"
							stroke="#3a342c"
							stroke-width={2}
							clip-path={`url(#tower-side-${i})`}
						/>
						<rect
							x={0}
							y={height - depth}
							width={width}
							height={depth}
							fill={stone.floor ?? stone.stone}
							clip-path={`url(#tower-door-${i})`}
						/>
						<path
							d={sidePart(SPLIT - SEAM, 1)}
							fill={stone.shade}
							fill-rule="evenodd"
						/>
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
						<path
							d={sidePart(0, SPLIT)}
							fill={stone.shade}
							fill-rule="evenodd"
						/>
						{/* Its roof, going back, battlements all round it. */}
						<polygon
							points={[nearLeft, farLeft, farRight, nearRight]
								.map((p) => p.join(','))
								.join(' ')}
							fill={stone.shade}
						/>
						<For each={merlons}>
							{(m) => (
								<rect x={m.x} y={m.y} width={M} height={M} fill={stone.stone} />
							)}
						</For>
						{/* Its front, in courses of stone. */}
						<rect x={0} y={M + depth} width={W} height={H} fill={stone.stone} />
						<For each={courses}>
							{(y) => (
								<rect x={0} y={y} width={W} height={2} fill={stone.shade} />
							)}
						</For>
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
						<For each={merlonsAlong(nearLeft, nearRight, 7)}>
							{(m) => (
								<rect x={m.x} y={m.y} width={M} height={M} fill={stone.stone} />
							)}
						</For>
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
