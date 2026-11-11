import type { JSX } from 'solid-js'
import { COURSES } from '../courses'
import { RaceCanvas, createRaceScene } from '../draw/RaceView'
import { VIEW_HEIGHT, VIEW_WIDTH } from '../game/constants'
import {
	type Flyer,
	type Out,
	type Pacer,
	type World,
	createWorld,
} from '../game/world'
import { NOTHING_HELD } from '../input'
import { guests } from '../runners/guests'
import { DEFAULT_AVATAR } from '../runners/looks'
import {
	MEMBERS,
	type Playable,
	customPlayable,
	lookSprite,
} from '../runners/playable'
import { SKELETON_SPRITE } from '../runners/skeleton'
import { play } from '../sfx'
import { RoundHud } from './Round'
import {
	PUMPKIN_FLAG,
	type PacerIntro,
	type RaceFrame,
	type RaceStart,
	type RacerIntro,
} from './protocol'
import { CORGI_STATES, FLYER_STATES, FURBY_STATES } from './stream'

/**
 * A Remote Player's view of the race: the Host's, drawn from the frames it
 * sends (see `createRaceStream`). Nothing's worked out here: it's played
 * back a little behind the newest frame, smoothly in between them.
 */

/** Frames arrive here as they come, for the Mirror to play back. */
export interface Feed {
	frames: RaceFrame[]
}

/** How far behind the newest frame it plays: two frames, so there's always one to head for. */
const BEHIND_TICKS = 4
/** Further out than this and it jumps straight there, rather than catching up. */
const JUMP_TICKS = 40
/** How quickly it catches up, or drops back, a share a tick. */
const CATCH_UP = 0.05

function playableFor(intro: RacerIntro): Playable {
	if (intro.custom)
		return { ...customPlayable(intro.custom), id: intro.character }
	return (
		MEMBERS.find((m) => m.id === intro.character) ??
		// Nobody it knows: anyone at all, rather than nothing.
		MEMBERS[0]
	)
}

function pacerFrom(intro: PacerIntro): Pacer {
	const known =
		MEMBERS.find((m) => m.member === intro.member) ??
		guests().find((g) => g.id === intro.guest)
	return {
		id: intro.id,
		name: intro.name,
		skeleton: intro.skeleton,
		sprite: intro.skeleton
			? SKELETON_SPRITE
			: (known?.sprite ?? lookSprite(intro.look ?? DEFAULT_AVATAR)),
		x: -10_000,
		feetY: 0,
		vx: 0,
		vy: 0,
		grounded: true,
		pace: 0,
		dazed: 0,
		scooped: false,
		spin: 0,
	}
}

const OUTS: (Out | undefined)[] = [undefined, 'scooped', 'finished', 'fallen']

/** Round `start`, drawn from `feed`, as big as fits in `width` × `height`. */
export default function Mirror(props: {
	start: RaceStart
	feed: Feed
	width: number
	height: number
	/** How much bigger its words are than the Host's: on a phone, bigger the smaller it is. */
	textScale?: number
}) {
	const { start, feed } = props
	const course = COURSES.find((l) => l.id === start.course) ?? COURSES[0]
	const world = createWorld(
		course,
		start.racers.map((intro) => ({
			id: intro.id,
			runner: playableFor(intro),
			controls: () => NOTHING_HELD,
			colour: intro.colour,
			number: intro.number,
		})),
		{ round: true },
	)
	// Not this phone's own pack: the Host's.
	const intros = new Map(start.pack.map((p) => [p.id, p]))
	const pacers = new Map<number, Pacer>()
	world.pack.length = 0

	let playhead: number | undefined
	/** Sounds are played once each, as the playhead passes their frame. */
	let heardUpTo = Number.NEGATIVE_INFINITY

	function playBack(world: World) {
		const { frames } = feed
		const latest = frames[frames.length - 1]
		if (!latest) return
		const target = latest.ticks - BEHIND_TICKS
		if (playhead === undefined || Math.abs(target - playhead) > JUMP_TICKS)
			playhead = target
		else playhead += 1 + (target - playhead) * CATCH_UP
		playhead = Math.min(playhead, latest.ticks)

		// The newest frame it's passed, and the next.
		let at = 0
		while (at + 1 < frames.length && frames[at + 1].ticks <= playhead) at++
		for (const frame of frames.slice(0, at + 1)) {
			for (const p of frame.joined) intros.set(p.id, p)
			if (frame.ticks > heardUpTo) {
				for (const sound of frame.sounds) play(sound)
				heardUpTo = frame.ticks
			}
		}
		frames.splice(0, at)
		const a = frames[0]
		const b = frames[1] ?? a
		const share =
			b.ticks > a.ticks
				? Math.max(0, Math.min(1, (playhead - a.ticks) / (b.ticks - a.ticks)))
				: 0
		apply(world, a, b, share)
	}

	function apply(world: World, a: RaceFrame, b: RaceFrame, share: number) {
		const mix = (from: number, to: number) => from + (to - from) * share

		world.setTicks(Math.round(mix(a.ticks, b.ticks)))
		world.setRaceTicks(a.raceTicks)
		if (world.phase() !== a.phase) world.setPhase(a.phase)
		world.setCamera(mix(a.camera, b.camera))
		world.setCameraY(mix(a.cameraY, b.cameraY))
		world.setZoom(mix(a.zoom, b.zoom))
		world.bus.frontX = mix(a.bus[0], b.bus[0])
		world.bus.scooping = a.bus[1]
		world.bus.reach = mix(a.bus[2], b.bus[2])
		world.setBusX(world.bus.frontX)

		world.racers.forEach((racer, i) => {
			const from = a.racers[i]
			if (!from) return
			const to = b.racers[i] ?? from
			const body = racer.body
			body.x = mix(from[0], to[0])
			body.feetY = mix(from[1], to[1])
			body.vx = mix(from[2], to[2])
			const flags = from[3]
			body.grounded = !!(flags & 1)
			body.ducking = !!(flags & 2)
			body.mount = flags & 4 ? 1 : 0
			body.facing = flags & 8 ? -1 : 1
			body.carried = flags & 16 ? 1 : 0
			// Which one doesn't matter here: only that it's flat.
			body.on = flags & 32 ? 0 : undefined
			body.squashed = flags & 64 ? 1 : 0
			body.gliding = !!(flags & 128)
			// Knocked off since the last frame: flying.
			const pumpkin = Math.floor(flags / PUMPKIN_FLAG)
			if (body.pumpkin && !pumpkin)
				body.lostPumpkin = { carving: body.pumpkin, at: world.ticks() }
			body.pumpkin = pumpkin
			body.stumble = from[4]
			body.spin = mix(from[5], to[5])
			racer.out = OUTS[from[6]]
			racer.outAt = from[7]
		})

		const next = new Map(b.pack.map((p) => [p[0], p]))
		world.pack.length = 0
		for (const from of a.pack) {
			const id = from[0]
			let pacer = pacers.get(id)
			if (!pacer) {
				const intro = intros.get(id)
				if (!intro) continue
				pacer = pacerFrom(intro)
				pacers.set(id, pacer)
			}
			const to = next.get(id) ?? from
			pacer.x = mix(from[1], to[1])
			pacer.feetY = mix(from[2], to[2])
			pacer.vx = mix(from[3], to[3])
			pacer.grounded = !!(from[4] & 1)
			pacer.scooped = !!(from[4] & 2)
			pacer.gliding = !!(from[4] & 4)
			pacer.dazed = from[5]
			pacer.spin = mix(from[6], to[6])
			world.pack.push(pacer)
		}

		world.furbies.forEach((furby, i) => {
			const from = a.furbies[i]
			if (!from) return
			const to = b.furbies[i] ?? from
			furby.x = mix(from[0], to[0])
			furby.feetY = mix(from[1], to[1])
			furby.facing = from[2] === -1 ? -1 : 1
			furby.state = FURBY_STATES[from[3]] ?? 'hopping'
			furby.spin = mix(from[4], to[4])
			furby.landed = from[5]
			furby.timer = from[6]
		})
		world.corgis.forEach((corgi, i) => {
			const from = a.corgis[i]
			if (!from) return
			const to = b.corgis[i] ?? from
			corgi.x = mix(from[0], to[0])
			corgi.feetY = mix(from[1], to[1])
			corgi.facing = from[2] === -1 ? -1 : 1
			corgi.state = CORGI_STATES[from[3]] ?? 'waiting'
			corgi.barking = !!from[4]
			corgi.spin = mix(from[5], to[5])
			corgi.rare = !!from[6] || undefined
		})

		// The geese flying over: the same objects from frame to frame, for their sprites.
		const nextFlyers = new Map(b.flyers.map((f) => [f[0], f]))
		const flying = new Map(world.flyers.map((goose) => [goose.id, goose]))
		world.flyers.length = 0
		for (const from of a.flyers) {
			const id = from[0]
			const goose: Flyer = flying.get(id) ?? {
				id,
				x: from[1],
				feetY: from[2],
				cruise: from[2],
				altitude: 0,
				vy: 0,
				state: 'flying',
			}
			const to = nextFlyers.get(id) ?? from
			goose.x = mix(from[1], to[1])
			goose.feetY = mix(from[2], to[2])
			goose.state = FLYER_STATES[from[3]] ?? 'flying'
			world.flyers.push(goose)
		}

		for (const [
			i,
			used,
			flown,
			scoopedAt,
			scoopedVx,
			scoopedX,
			flownAll,
		] of a.obstacles) {
			const state = world.obstacles[i]
			if (!state) continue
			state.used = !!used
			state.flown = flown >= 0 ? flown : undefined
			state.flownAll = flownAll
			if (scoopedAt >= 0 && !state.scooped)
				state.scooped = { at: scoopedAt, vx: scoopedVx, x: scoopedX }
		}
		for (const [i, used, cheering, cheered] of a.boosts) {
			const state = world.boosts[i]
			if (!state) continue
			state.used = !!used
			if (state.cheering() !== cheering) state.setCheering(cheering)
			state.cheered = cheered
		}
		// Cheering that's run out isn't in the frame any more.
		const cheering = new Set(a.boosts.map((o) => o[0]))
		world.boosts.forEach((state, i) => {
			if (!cheering.has(i) && state.cheering() > 0) state.setCheering(0)
		})

		const popups = world.popups()
		if (
			popups.length !== a.popups.length ||
			popups.some((p, i) => p.id !== a.popups[i].id)
		)
			world.setPopups(a.popups)

		if (a.order && !world.order())
			world.setOrder(
				a.order.flatMap((id) => world.racers.filter((r) => r.id === id)),
			)
	}

	const scene = createRaceScene(world, playBack)

	const scale = () =>
		Math.min(props.width / VIEW_WIDTH, props.height / VIEW_HEIGHT)
	return (
		<div
			style={{
				...styles.frame,
				width: `${VIEW_WIDTH * scale()}px`,
				height: `${VIEW_HEIGHT * scale()}px`,
			}}
		>
			<div style={{ ...styles.stage, transform: `scale(${scale()})` }}>
				<RaceCanvas
					world={world}
					scene={scene}
					overlay={
						<RoundHud
							world={world}
							number={start.round}
							// Small on a phone: everything on it bigger.
							textScale={props.textScale ?? Math.min(2.2, 0.9 / scale())}
						/>
					}
				/>
			</div>
		</div>
	)
}

const styles = {
	frame: {
		position: 'relative',
		overflow: 'hidden',
		'flex-shrink': 0,
		'align-self': 'center',
		background: 'var(--sky-blue-top)',
	},
	stage: {
		position: 'absolute',
		left: 0,
		top: 0,
		width: `${VIEW_WIDTH}px`,
		height: `${VIEW_HEIGHT}px`,
		'transform-origin': '0 0',
	},
} satisfies Record<string, JSX.CSSProperties>
