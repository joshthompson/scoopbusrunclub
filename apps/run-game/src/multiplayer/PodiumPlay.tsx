import { For, type JSX, Show, createSignal, onCleanup, onMount } from 'solid-js'
import {
	AIR_STEER,
	AIR_STEER_BACK,
	AIR_STEER_ON,
	COAST_KEEP,
	GRAVITY,
	JUMP_CUT,
	JUMP_SPEED,
	ROUND_MAX_SPEED,
	RUNNER_SCALE,
	RUN_GRIP,
	RUN_TOP_SPEED,
	SLIDE_KEEP,
	STOMP_BOOST,
	STOMP_BOUNCE,
	STOMP_BOUNCE_HELD,
} from '../game/constants'
import {
	HEAD_GIVE,
	HEAD_REACH,
	STOMPED_GUARD,
	STOMPED_TICKS,
} from '../game/pack'
import {
	CRAWL_GRIP,
	CRAWL_SPEED,
	DROP_TICKS,
	OVERSPEED_GRIP,
} from '../game/step'
import type { Controls } from '../input'
import type { Playable } from '../runners/playable'
import { play } from '../sfx'
import { NameTag, hatRise, tagOver } from './NameTag'
import { PODIUM_FRONT } from './PodiumScene'
import { Worn } from './Worn'
import { PODIUM_CELL, STEP_STAND } from './podiumArt'
import type { Seat } from './room'

/**
 * The race's own physics, as big as everyone's drawn here: the runners are
 * 2.5 times their pixel size on the Podium, not the race's 2, so every
 * distance and speed is this much bigger, and every jump and slide takes
 * just as long as it does in a race.
 */
const SIZE = 2.5 / RUNNER_SCALE
/** How long a frame is, in milliseconds: they're stepped 60 a second. */
const TICK_MS = 1000 / 60
/** How many frames a stride takes, however many run frames it's drawn in. */
const STRIDE_TICKS = 24
/** What the runners' frames are drawn at, as the engine has them: the offsets in their frames are at this scale. */
const ENGINE_SCALE = 2
/** How long a "Boing!" stays up, rising and fading, as a race's popups do. */
const POPUP_TICKS = 45
/** Going slower than this, they're stood still, not running. */
const STILL = 0.5 * SIZE

/** How far in from the screen's edges anyone stands to begin with. */
const BESIDE_CLEAR = 40

/** One Player's runner, loose on the Podium: a race's `Body`, what of it there's use for here. */
interface Body {
	seat: Seat
	runner: Playable
	controls: () => Controls
	scale: number
	/** On the Podium, a medal round their neck: 1st, 2nd or 3rd. */
	place?: 1 | 2 | 3
	/** Their middle, and their feet. */
	x: number
	feet: number
	vx: number
	vy: number
	grounded: boolean
	/** The step they're stood on, by its seat's id; on the ground, none. */
	on?: string
	/** Up off a jump of their own, held or let go of (see `JUMP_CUT`). */
	jumping: boolean
	wasUp: boolean
	/** How fast they took off, or last bounced: what steering in the air's from. */
	airBase?: number
	/** Ducked through a step: how much longer till they can land on it again. */
	dropping: number
	droppingFrom?: string
	facing: 1 | -1
	ducking: boolean
	/** Bounced on: stumbling, can't run, for this many more frames. */
	stumble: number
	/** And can't be bounced on again for this many. */
	stomped: number
	/** Heads bounced off since they last landed. */
	combo: number
	tick: number
	/** Where in their dance they started, so nobody's dancing in step. */
	danceStart: number
}

/** Where a step is, within the screen: its top's where they stand. */
interface Block {
	left: number
	right: number
	top: number
}

/** A "Boing!", over the head it came off. */
interface Popup {
	text: string
	x: number
	y: number
	born: number
}

/**
 * The Podium, played on: everyone's runner, the top three on their steps and
 * everyone else beside them, run about and jump with their own controls
 * until it's back to the lobby, just as they do in a race: the same run,
 * slide (duck, going along), jump, and bounce off each other's heads. The
 * steps stand at the back of the path, a race's Platforms: run along in
 * front of them, jump up onto them, duck to drop down through. Off one
 * side of the screen, and they're round and on again from the other.
 */
export function PodiumPlay(props: {
	/** Everyone on it, in the order they came: the first three start on the steps. */
	standings: Seat[]
	playableOf: (seat: Seat) => Playable | undefined
	controlsFor: (seat: Seat) => () => Controls
	/** Each of the top three's step, by their seat's id. */
	steps: () => Map<string, HTMLElement>
	/** The box the steps stand in: everyone else starts either side of it. */
	ground: () => HTMLElement | undefined
	/** The whole screen, which they can't run off. */
	screen: () => HTMLElement | undefined
}) {
	const [bodies, setBodies] = createSignal<Body[]>([])
	/** Bumped each frame, for the bodies to be drawn where they've got to. */
	const [frame, setFrame] = createSignal(0)
	const [popups, setPopups] = createSignal<Popup[]>([])
	/** Frames stepped since it started: what a popup's age is counted in. */
	let ticks = 0

	/**
	 * Where `el` is laid out within the screen, however deep in it: its
	 * offsets added up through what it's in. Laid out, not as it's drawn,
	 * so a rising step's transform is ignored, as is the stage's scaling.
	 */
	const within = (el: HTMLElement) => {
		const screen = props.screen()
		let left = 0
		let top = 0
		for (
			let at: HTMLElement | null = el;
			at && at !== screen;
			at = at.offsetParent as HTMLElement | null
		) {
			left += at.offsetLeft
			top += at.offsetTop
		}
		return { left, top, width: el.offsetWidth, height: el.offsetHeight }
	}
	/**
	 * The steps, by their seat's id, laid out (their rising animation's a
	 * transform, so ignored): stood on a little way into their lit tops.
	 */
	const blocks = () =>
		new Map(
			[...props.steps()].map(([id, step]): [string, Block] => {
				const box = within(step)
				return [
					id,
					{
						left: box.left,
						right: box.left + box.width,
						top: box.top + STEP_STAND * PODIUM_CELL,
					},
				]
			}),
		)

	function spawn(): Body[] | undefined {
		const ground = props.ground()
		if (!ground?.offsetHeight) return undefined
		const steps = blocks()
		const made: Body[] = []
		// Those off the podium, either side of it in turn, outwards.
		let besideAt = 0
		const beside = Math.max(0, props.standings.length - 3)
		const width = props.screen()?.offsetWidth ?? 960
		for (const [place, seat] of props.standings.entries()) {
			const runner = props.playableOf(seat)
			if (!runner) continue
			const scale = place === 0 ? 3 : 2.5
			const step = place < 3 ? steps.get(seat.id) : undefined
			let x: number
			let feet: number
			if (step) {
				x = (step.left + step.right) / 2
				feet = step.top
			} else {
				const side = besideAt % 2 === 0 ? -1 : 1
				const out = Math.floor(besideAt / 2) + 1
				besideAt++
				const podium = within(ground)
				const edge = side < 0 ? podium.left : podium.left + podium.width
				// As far apart as there's room for, between it and the
				// screen's edge.
				const room =
					side < 0 ? podium.left - BESIDE_CLEAR : width - BESIDE_CLEAR - edge
				const each = Math.min(56, room / Math.ceil(beside / 2))
				x = edge + side * out * each
				feet = PODIUM_FRONT
			}
			made.push({
				seat,
				runner,
				controls: props.controlsFor(seat),
				scale,
				place: place < 3 ? ((place + 1) as 1 | 2 | 3) : undefined,
				x,
				feet,
				vx: 0,
				vy: 0,
				grounded: true,
				on: step ? seat.id : undefined,
				jumping: false,
				// Held as it starts (the jump that finished the Round): not a jump.
				wasUp: true,
				dropping: 0,
				facing: 1,
				ducking: false,
				stumble: 0,
				stomped: 0,
				combo: 0,
				tick: 0,
				danceStart: Math.floor(
					Math.random() * (runner.sprite.dance?.frames.length ?? 1),
				),
			})
		}
		return made
	}

	/** A frame of `body`'s, as `stepRunner` in `game/step.ts` has a racer's, on flat ground. */
	function step(body: Body, steps: Map<string, Block>, width: number) {
		const { left, right, up, down } = body.controls()
		body.tick++
		if (body.stomped > 0) body.stomped--
		if (body.dropping > 0) body.dropping--

		// Ducking on a step: down through it.
		if (body.grounded && body.on !== undefined && down) {
			body.droppingFrom = body.on
			body.dropping = DROP_TICKS
			body.on = undefined
			body.grounded = false
			body.vy = SIZE
		}

		if (body.grounded) {
			body.airBase = undefined
			body.ducking = down
			if (body.stumble > 0) body.stumble--
			const canDrive = body.stumble === 0
			if (body.ducking) {
				// A slide: hardly slows. Holding a way too: crawling along that
				// way, slowly, if they're not sliding any faster.
				body.vx *= SLIDE_KEEP
				const crawl = canDrive ? Number(right) - Number(left) : 0
				const crawlSpeed = CRAWL_SPEED * SIZE
				if (crawl && body.vx * crawl < crawlSpeed)
					body.vx += (crawl * crawlSpeed - body.vx) * CRAWL_GRIP
			} else {
				// Holding both is standing still.
				const drive = canDrive ? Number(right) - Number(left) : 0
				if (drive) {
					const top = RUN_TOP_SPEED * SIZE
					// Bounced past top speed the way they're going: let it last.
					const boosted = body.vx * drive > top
					body.vx +=
						(drive * top - body.vx) * (boosted ? OVERSPEED_GRIP : RUN_GRIP)
				} else body.vx *= COAST_KEEP
			}
			if (up && !body.wasUp) {
				body.vy = -JUMP_SPEED * SIZE
				body.jumping = true
				body.grounded = false
				body.ducking = false
				body.on = undefined
				play('jump')
			}
		} else {
			body.vy += GRAVITY * SIZE
			// Let go of jump on the way up: cut short, a hop. Held: the whole jump.
			if (body.jumping && !up && body.vy < -JUMP_CUT * SIZE)
				body.vy = -JUMP_CUT * SIZE
			if (body.vy >= 0) body.jumping = false
			// Steering, a little on or a good deal back, off how fast they took
			// off, the way they're facing.
			body.airBase ??= body.vx
			const forward = body.airBase < 0 ? -1 : 1
			const on = forward > 0 ? right && !left : left && !right
			const back = forward > 0 ? left && !right : right && !left
			const most = body.airBase + forward * AIR_STEER_ON * SIZE
			const least = body.airBase - forward * AIR_STEER_BACK * SIZE
			const steer = AIR_STEER * SIZE
			if (on)
				body.vx =
					forward > 0
						? Math.max(body.vx, Math.min(most, body.vx + steer))
						: Math.min(body.vx, Math.max(most, body.vx - steer))
			if (back)
				body.vx =
					forward > 0
						? Math.min(body.vx, Math.max(least, body.vx - steer))
						: Math.max(body.vx, Math.min(least, body.vx + steer))
		}
		body.wasUp = up
		if (body.vx > STILL) body.facing = 1
		else if (body.vx < -STILL) body.facing = -1
		const most = ROUND_MAX_SPEED * SIZE
		body.vx = Math.max(-most, Math.min(most, body.vx))

		body.x += body.vx
		// Off one side, right off it: round, and on again from the other.
		const half = (body.runner.sprite.width * body.scale) / 2
		if (body.x < -half) body.x += width + half * 2
		else if (body.x > width + half) body.x -= width + half * 2

		if (body.grounded) {
			// Run off the end of a step: falling.
			const on = body.on === undefined ? undefined : steps.get(body.on)
			if (
				body.on !== undefined &&
				(!on || body.x < on.left || body.x > on.right)
			) {
				body.on = undefined
				body.grounded = false
				body.vy = 0
			}
		}
		if (!body.grounded) {
			const was = body.feet
			body.feet += body.vy
			if (body.vy >= 0) {
				// Onto the highest step it's come down onto from above, its
				// middle over it; or the path, in front of them all.
				let landOn: string | undefined
				let land = PODIUM_FRONT
				for (const [id, b] of steps) {
					if (body.dropping > 0 && id === body.droppingFrom) continue
					if (body.x < b.left || body.x > b.right) continue
					if (was > b.top + 1 || body.feet < b.top || b.top >= land) continue
					land = b.top
					landOn = id
				}
				if (body.feet >= land) {
					body.feet = land
					body.on = landOn
					body.vy = 0
					body.grounded = true
					body.jumping = false
				}
			}
		}
	}

	/** How tall `body` is, to the top of their head: less, ducking. */
	const heightOf = (body: Body) =>
		body.runner.sprite.height * body.scale * (body.ducking ? 0.55 : 1)

	/**
	 * Coming down on someone's head: a bounce for them, faster, and a
	 * stumble for whoever it was, as `bounceOffHeads` in `game/pack.ts`.
	 */
	function bounceOffHeads(body: Body, all: Body[]) {
		const was = body.feet - body.vy
		for (const other of all) {
			if (other === body || other.stomped > 0) continue
			if (Math.abs(body.x - other.x) > HEAD_REACH * SIZE) continue
			const head = other.feet - heightOf(other) + HEAD_GIVE * SIZE
			if (was > head || body.feet < head) continue

			other.stomped = STOMPED_GUARD
			other.stumble = Math.max(other.stumble, STOMPED_TICKS)
			other.vx *= 0.5

			body.feet = head
			body.grounded = false
			body.on = undefined
			body.vy = -(body.controls().up ? STOMP_BOUNCE_HELD : STOMP_BOUNCE) * SIZE
			// A bounce, not a jump of their own: letting go doesn't cut it short.
			body.jumping = false
			const along = Math.max(0, body.vx * body.facing)
			body.vx =
				body.facing *
				Math.min(ROUND_MAX_SPEED * SIZE, along + STOMP_BOOST * SIZE)
			// Steering on from here, a bounce's own speed.
			body.airBase = body.vx
			body.combo++
			const text = body.combo > 1 ? `Boing! ×${body.combo}` : 'Boing!'
			setPopups((all) => [
				...all.filter((p) => ticks - p.born < POPUP_TICKS),
				{ text, x: other.x, y: head - 10, born: ticks },
			])
			play('stomp')
			// One head a frame.
			return
		}
	}

	onMount(() => {
		let raf = 0
		let last = performance.now()
		let carry = 0
		const loop = (now: number) => {
			raf = requestAnimationFrame(loop)
			let all = bodies()
			if (!all.length) {
				const made = spawn()
				if (!made) return
				setBodies(made)
				all = made
				last = now
			}
			// A fixed 60 a second, whatever the screen's rate.
			carry = Math.min(carry + (now - last) / (1000 / 60), 5)
			last = now
			if (carry < 1) return
			const steps = blocks()
			const width = props.screen()?.offsetWidth ?? 0
			for (; carry >= 1; carry--) {
				ticks++
				for (const body of all) step(body, steps, width)
				for (const body of all) bounceOffHeads(body, all)
				for (const body of all) if (body.grounded) body.combo = 0
			}
			if (popups().some((p) => ticks - p.born >= POPUP_TICKS))
				setPopups((all) => all.filter((p) => ticks - p.born < POPUP_TICKS))
			setFrame((n) => n + 1)
		}
		raf = requestAnimationFrame(loop)
		onCleanup(() => cancelAnimationFrame(raf))
	})

	return (
		<div style={styles.layer} aria-hidden="true">
			<For each={bodies()}>
				{(body) => <Runner body={body} frame={frame()} />}
			</For>
			<For each={popups()}>
				{(popup) => {
					const age = () => {
						void frame()
						return ticks - popup.born
					}
					return (
						<div
							style={{
								...styles.popup,
								left: `${popup.x}px`,
								top: `${popup.y - 24 - age() * 0.8}px`,
								opacity: Math.max(0, 1 - age() / POPUP_TICKS),
							}}
						>
							{popup.text}
						</div>
					)
				}}
			</For>
		</div>
	)
}

/** A frame, `url#left,top,…`, drawn as the engine does, at `scale`. */
function frameStyle(
	frame: string | undefined,
	scale: number,
): JSX.CSSProperties {
	const [src, at] = (frame ?? '').split('#')
	const [left] = (at ?? '0').split(',').map(Number)
	return {
		background: `url("${src}") ${((left || 0) * scale) / ENGINE_SCALE}px 0 / auto 100% repeat-x`,
	}
}

function Runner(props: { body: Body; frame: number }) {
	const sprite = () => props.body.runner.sprite
	const width = () => sprite().width * props.body.scale
	const height = () => sprite().height * props.body.scale
	/** Stood about, on their feet: dancing, if they've a dance. */
	const dance = () => {
		void props.frame
		const b = props.body
		const moves = sprite().dance
		return b.grounded && Math.abs(b.vx) < STILL && !b.ducking
			? moves
			: undefined
	}
	const current = () => {
		void props.frame
		const b = props.body
		const run = sprite().run
		const dancing = dance()
		if (dancing) {
			const step = Math.floor((b.tick * TICK_MS) / dancing.interval)
			return {
				frame: dancing.frames[(b.danceStart + step) % dancing.frames.length],
			}
		}
		if (b.ducking && sprite().sit) return { frame: sprite().sit, single: true }
		if (!b.grounded) return { frame: run[1] ?? run[0] }
		if (Math.abs(b.vx) >= STILL)
			return {
				frame:
					run[Math.floor((b.tick * run.length) / STRIDE_TICKS) % run.length],
			}
		return { frame: run[0] }
	}
	/** The box their frame's drawn in: a dance frame's a little taller, on the same feet. */
	const frameWidth = () => (dance()?.width ?? sprite().width) * props.body.scale
	const frameHeight = () =>
		(dance()?.height ?? sprite().height) * props.body.scale
	const place = () => {
		void props.frame
		const b = props.body
		return { x: b.x, feet: b.feet, stumble: b.stumble }
	}
	return (
		<div
			style={{
				position: 'absolute',
				left: `${place().x - width() / 2}px`,
				top: `${place().feet - height()}px`,
				width: `${width()}px`,
				height: `${height()}px`,
				// Bounced on, stumbling: flickering, as in a race.
				opacity: place().stumble > 0 && place().stumble % 8 < 4 ? 0.4 : 1,
			}}
		>
			<NameTag
				colour={props.body.seat.colour}
				size={11}
				style={tagOver(
					hatRise(props.body.runner, props.body.seat.hat, props.body.scale),
				)}
			>
				{props.body.runner.name}
			</NameTag>
			<div
				style={{
					position: 'absolute',
					left: `${(width() - frameWidth()) / 2}px`,
					bottom: 0,
					width: `${frameWidth()}px`,
					height: `${frameHeight()}px`,
				}}
			>
				<Show
					when={current().single}
					fallback={
						<div
							class="pixelated"
							style={{
								width: '100%',
								height: '100%',
								...frameStyle(current().frame, props.body.scale),
								// Drawn facing left.
								transform: props.body.facing === 1 ? 'scaleX(-1)' : undefined,
							}}
						/>
					}
				>
					<img
						src={current().frame}
						alt=""
						class="pixelated"
						style={{
							position: 'absolute',
							bottom: 0,
							left: '50%',
							// At its own size, as big as the rest of them.
							zoom: props.body.scale,
							transform: `translateX(-50%)${props.body.facing === 1 ? ' scaleX(-1)' : ''}`,
						}}
					/>
				</Show>
				{/* Their hat, and their medal round their neck, with them wherever
			    they go. */}
				<Worn
					frame={current().frame}
					single={current().single}
					width={frameWidth()}
					height={frameHeight()}
					scale={props.body.scale}
					flipped={props.body.facing === 1}
					hat={props.body.seat.hat}
					place={props.body.place}
					sprite={sprite()}
				/>
			</div>
		</div>
	)
}

const styles = {
	layer: {
		position: 'absolute',
		inset: 0,
		'pointer-events': 'none',
		'z-index': 1,
	},
	/** As a race's popups are (see `screens/Game.tsx`). */
	popup: {
		position: 'absolute',
		transform: 'translateX(-50%)',
		color: 'white',
		'font-size': '22px',
		'text-shadow':
			'2px 0 var(--ink), -2px 0 var(--ink), 0 2px var(--ink), 0 -2px var(--ink)',
		'white-space': 'nowrap',
	},
} satisfies Record<string, JSX.CSSProperties>
