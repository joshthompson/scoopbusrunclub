import type { CartState } from '../game/carts'
import { hatCode } from '../game/hats'
import {
	type CorgiState,
	type FlyerState,
	type FurbyState,
	type Pacer,
	TRICK_KINDS,
	type World,
} from '../game/world'
import { type Sound, overhear } from '../sfx'
import {
	HAT_FLAG,
	type PacerIntro,
	RACER_FLAGS,
	type RaceFrame,
	type RaceStart,
	type RacerState,
	skiState,
} from './protocol'

/**
 * The Host's side of Remote Play: the race, as frames for phones to draw it
 * from. The phones' side is `Mirror`.
 */

/** A frame every this many ticks: 30 a second. */
const FRAME_TICKS = 2

export const FURBY_STATES: FurbyState[] = [
	'hopping',
	'riding',
	'dazed',
	'scooped',
]
export const FLYER_STATES: FlyerState[] = ['flying', 'carrying', 'leaving']
export const CART_STATES: CartState[] = [
	'waiting',
	'ridden',
	'parked',
	'scooped',
]
export const CORGI_STATES: CorgiState[] = [
	'waiting',
	'ridden',
	'tired',
	'scooped',
]

/** To a tenth of a pixel, which is plenty, and keeps the frames small. */
const tenth = (n: number) => Math.round(n * 10) / 10

export const pacerIntro = (p: Pacer): PacerIntro => ({
	id: p.id,
	name: p.name,
	member: p.member,
	guest: p.guest,
	look: p.guest || p.member || p.skeleton ? undefined : p.look,
	skeleton: p.skeleton || undefined,
})

/** What a phone needs to draw Round `round`: who's racing, where, and who's in the pack. */
export function raceStart(world: World, round: number): RaceStart {
	return {
		round,
		...(world.baby ? { baby: true } : {}),
		course: world.course.id,
		racers: world.racers.map((r) => ({
			id: r.id,
			character: r.runner.id,
			custom: r.runner.custom,
			colour: r.colour ?? 'white',
			number: r.number ?? 0,
		})),
		pack: world.pack.map(pacerIntro),
	}
}

/**
 * The race, sent as a frame every `FRAME_TICKS` ticks it moves on (none
 * while it's paused), with whatever was heard in between.
 */
export function createRaceStream(
	world: World,
	round: number,
	send: (frame: RaceFrame) => void,
) {
	let sounds: Sound[] = []
	overhear((sound) => sounds.push(sound))
	let sentAt = Number.NEGATIVE_INFINITY
	/** The newest of the pack the phones have been told about. */
	let introduced = Math.max(-1, ...world.pack.map((p) => p.id))

	function frame(): RaceFrame {
		const joined = world.pack.filter((p) => p.id > introduced)
		for (const p of joined) introduced = Math.max(introduced, p.id)
		return {
			round,
			ticks: world.ticks(),
			raceTicks: world.raceTicks(),
			phase: world.phase(),
			camera: tenth(world.camera()),
			cameraY: tenth(world.cameraY()),
			zoom: Math.round(world.zoom() * 1000) / 1000,
			...(world.portal
				? {
						portal: [
							world.portal.index,
							world.portal.firstAt,
							world.portal.zappedAt ?? -1,
							world.portal.busGap,
							world.racers.flatMap((r, i): [number, number, number][] => {
								const held = world.portal?.held.get(r.id)
								return held ? [[i, held.at, held.slot]] : []
							}),
						] as NonNullable<RaceFrame['portal']>,
					}
				: {}),
			bus: [
				tenth(world.bus.frontX),
				world.bus.scooping,
				tenth(world.bus.reach),
			],
			racers: world.racers.map(
				({ body: b, out, outAt }): RacerState => [
					tenth(b.x),
					tenth(b.feetY),
					tenth(b.vx),
					(b.grounded ? RACER_FLAGS.grounded : 0) |
						(b.ducking ? RACER_FLAGS.ducking : 0) |
						(b.mount > 0 ? RACER_FLAGS.mounted : 0) |
						(b.facing === -1 ? RACER_FLAGS.left : 0) |
						(b.carried > 0 ? RACER_FLAGS.carried : 0) |
						(b.on !== undefined ? RACER_FLAGS.platform : 0) |
						(b.squashed > 0 ? RACER_FLAGS.squashed : 0) |
						(b.gliding ? RACER_FLAGS.gliding : 0) |
						(b.cart !== undefined ? RACER_FLAGS.cart : 0) |
						(hatCode(b.hat) * HAT_FLAG),
					b.stumble,
					b.spin,
					out === 'scooped'
						? 1
						: out === 'finished'
							? 2
							: out === 'fallen'
								? 3
								: 0,
					outAt,
					// On skis: their board, a trick, a grind.
					...(b.board
						? ([skiState(b, TRICK_KINDS), Math.round(b.turn)] as const)
						: ([] as const)),
				],
			),
			pack: world.pack.map((p) => [
				p.id,
				tenth(p.x),
				tenth(p.feetY),
				tenth(p.vx),
				(p.grounded ? 1 : 0) |
					(p.scooped ? 2 : 0) |
					(p.gliding ? 4 : 0) |
					(p.ducking ? 8 : 0),
				p.dazed,
				p.spin,
				...(p.board
					? ([skiState(p, TRICK_KINDS), Math.round(p.turn ?? 0)] as const)
					: ([] as const)),
			]),
			joined: joined.map(pacerIntro),
			furbies: world.furbies.map((f) => [
				tenth(f.x),
				tenth(f.feetY),
				f.facing,
				FURBY_STATES.indexOf(f.state),
				f.spin,
				f.landed,
				f.timer,
			]),
			corgis: world.corgis.map((c) => [
				tenth(c.x),
				tenth(c.feetY),
				c.facing,
				CORGI_STATES.indexOf(c.state),
				c.barking ? 1 : 0,
				c.spin,
				c.rare ? 1 : 0,
			]),
			...(world.carts.length
				? {
						carts: world.carts.map((c): [number, number, number, number] => [
							tenth(c.x),
							tenth(c.feetY),
							CART_STATES.indexOf(c.state),
							c.spin,
						]),
					}
				: {}),
			...(world.ball
				? {
						ball: [
							tenth(world.ball.x),
							tenth(world.ball.y),
							Math.round(world.ball.spin),
							world.ball.out === 'home'
								? 1
								: world.ball.out === 'scooped'
									? 2
									: 0,
						] as [number, number, number, number],
					}
				: {}),
			flyers: world.flyers.map((goose) => [
				goose.id,
				tenth(goose.x),
				tenth(goose.feetY),
				FLYER_STATES.indexOf(goose.state),
			]),
			obstacles: world.obstacles.flatMap((state, i) =>
				state.used ||
				state.scooped ||
				state.flown !== undefined ||
				state.flownAll !== undefined
					? [
							[
								i,
								state.used ? 1 : 0,
								state.flown ?? -1,
								state.scooped?.at ?? -1,
								tenth(state.scooped?.vx ?? 0),
								// Where a Zombie was scooped, and when the rest of a
								// gaggle took off, if they have.
								...(state.scooped?.x === undefined &&
								state.flownAll === undefined
									? []
									: [tenth(state.scooped?.x ?? 0)]),
								...(state.flownAll === undefined ? [] : [state.flownAll]),
							] as RaceFrame['obstacles'][number],
						]
					: [],
			),
			boosts: world.boosts.flatMap((state, i) =>
				state.used || state.cheering() > 0
					? [
							[
								i,
								state.used ? 1 : 0,
								state.cheering(),
								state.cheered,
							] as RaceFrame['boosts'][number],
						]
					: [],
			),
			popups: world.popups(),
			order: world.order()?.map((r) => r.id),
			sounds,
		}
	}

	return {
		/** Every tick: a frame, if it's time for one. */
		tick() {
			const now = world.ticks()
			if (now - sentAt < FRAME_TICKS) return
			sentAt = now
			send(frame())
			sounds = []
		},
		stop() {
			overhear(undefined)
		},
	}
}

export type RaceStream = ReturnType<typeof createRaceStream>
