import { For, type JSX, Show, createSignal, onCleanup, onMount } from 'solid-js'
import type { Controls } from '../input'
import type { Playable } from '../runners/playable'
import { play } from '../sfx'
import type { Seat } from './room'

/** Run speed, in px a frame. */
const SPEED = 3.6
/** Pulled down by this much a frame, each frame. */
const GRAVITY = 0.55
/** A jump's start, up: enough to get from the ground onto the top step. */
const JUMP = 11.6
/** Let go of jump on the way up and it's cut to this: a tap's a hop. */
const JUMP_CUT = 4
const FALL_MOST = 14
/** How many frames each run frame's shown for. */
const STRIDE_FRAMES = 6
/** What the runners' frames are drawn at, as the engine has them: the offsets in their frames are at this scale. */
const ENGINE_SCALE = 2

/** One Player's runner, loose on the Podium. */
interface Body {
	seat: Seat
	runner: Playable
	controls: () => Controls
	scale: number
	/** Their middle, and their feet. */
	x: number
	feet: number
	vy: number
	grounded: boolean
	facing: 1 | -1
	moving: boolean
	ducking: boolean
	tick: number
	jumpHeld: boolean
}

/** Where a step is, within the screen. */
interface Block {
	left: number
	right: number
	top: number
}

/**
 * The Podium, played on: everyone's runner, the top three on their steps and
 * everyone else beside them, run about and jump with their own controls
 * (duck to sit down) until it's back to the lobby. Steps are solid: run into
 * one and it stops you, jump and you land on it.
 */
export function PodiumPlay(props: {
	/** Everyone on it, in the order they came: the first three start on the steps. */
	standings: Seat[]
	playableOf: (seat: Seat) => Playable | undefined
	controlsFor: (seat: Seat) => () => Controls
	/** Each of the top three's step, by their seat's id. */
	steps: () => Map<string, HTMLElement>
	/** The box the steps stand in, along the bottom of which is the ground. */
	ground: () => HTMLElement | undefined
	/** The whole screen, which they can't run off. */
	screen: () => HTMLElement | undefined
}) {
	const [bodies, setBodies] = createSignal<Body[]>([])
	/** Bumped each frame, for the bodies to be drawn where they've got to. */
	const [frame, setFrame] = createSignal(0)

	/** The steps' boxes, laid out (their rising animation's a transform, so ignored). */
	const blocks = (): Block[] =>
		[...props.steps().values()].map((step) => ({
			left: step.offsetLeft,
			right: step.offsetLeft + step.offsetWidth,
			top: step.offsetTop,
		}))
	const groundY = () => {
		const ground = props.ground()
		return ground ? ground.offsetTop + ground.offsetHeight : 0
	}

	function spawn(): Body[] | undefined {
		const ground = props.ground()
		if (!ground?.offsetHeight) return undefined
		const steps = props.steps()
		const floor = groundY()
		const made: Body[] = []
		// Those off the podium, either side of it in turn, outwards.
		let besideAt = 0
		for (const [place, seat] of props.standings.entries()) {
			const runner = props.playableOf(seat)
			if (!runner) continue
			const scale = place === 0 ? 3 : 2.5
			const step = place < 3 ? steps.get(seat.id) : undefined
			let x: number
			let feet: number
			if (step) {
				x = step.offsetLeft + step.offsetWidth / 2
				feet = step.offsetTop
			} else {
				const side = besideAt % 2 === 0 ? -1 : 1
				const out = Math.floor(besideAt / 2) + 1
				besideAt++
				const edge =
					side < 0 ? ground.offsetLeft : ground.offsetLeft + ground.offsetWidth
				x = edge + side * out * 56
				feet = floor
			}
			made.push({
				seat,
				runner,
				controls: props.controlsFor(seat),
				scale,
				x,
				feet,
				vy: 0,
				grounded: true,
				facing: 1,
				moving: false,
				ducking: false,
				tick: 0,
				// Held as it starts (the jump that finished the Round): not a jump.
				jumpHeld: true,
			})
		}
		return made
	}

	function step(body: Body, solid: Block[], floor: number, width: number) {
		const held = body.controls()
		const half = (body.runner.sprite.width * body.scale) / 4
		const dx = (held.right ? 1 : 0) - (held.left ? 1 : 0)
		body.ducking = held.down && body.grounded && !dx
		body.moving = !!dx
		if (dx) body.facing = dx > 0 ? 1 : -1
		body.tick++

		// Across, stopped by the steps' sides, and the screen's.
		if (dx) {
			body.x += dx * SPEED
			for (const b of solid) {
				const beside = body.feet > b.top + 1
				const into = body.x + half > b.left && body.x - half < b.right
				if (beside && into) body.x = dx > 0 ? b.left - half : b.right + half
			}
			body.x = Math.max(half, Math.min(width - half, body.x))
		}

		// Off an edge: falling.
		if (body.grounded) {
			const under =
				body.feet >= floor - 0.5 ||
				solid.some(
					(b) =>
						Math.abs(body.feet - b.top) < 1 &&
						body.x + half > b.left &&
						body.x - half < b.right,
				)
			if (!under) body.grounded = false
		}

		const jumping = held.up
		if (jumping && !body.jumpHeld && body.grounded) {
			body.vy = -JUMP
			body.grounded = false
			play('jump')
		}
		if (!jumping && body.vy < -JUMP_CUT) body.vy = -JUMP_CUT
		body.jumpHeld = jumping

		if (!body.grounded) {
			const was = body.feet
			body.vy = Math.min(FALL_MOST, body.vy + GRAVITY)
			body.feet += body.vy
			if (body.vy >= 0) {
				// Landing on whatever's highest that it's come down onto.
				let land = floor
				for (const b of solid)
					if (
						was <= b.top + 0.5 &&
						body.feet >= b.top &&
						body.x + half > b.left &&
						body.x - half < b.right
					)
						land = Math.min(land, b.top)
				if (body.feet >= land) {
					body.feet = land
					body.vy = 0
					body.grounded = true
				}
			}
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
			const solid = blocks()
			const floor = groundY()
			const width = props.screen()?.offsetWidth ?? 0
			for (; carry >= 1; carry--)
				for (const body of all) step(body, solid, floor, width)
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
	const current = () => {
		void props.frame
		const b = props.body
		const run = sprite().run
		if (b.ducking && sprite().sit) return { frame: sprite().sit, single: true }
		if (!b.grounded) return { frame: run[1] ?? run[0] }
		if (b.moving)
			return { frame: run[Math.floor(b.tick / STRIDE_FRAMES) % run.length] }
		return { frame: run[0] }
	}
	const place = () => {
		void props.frame
		return { x: props.body.x, feet: props.body.feet }
	}
	return (
		<div
			style={{
				position: 'absolute',
				left: `${place().x - width() / 2}px`,
				top: `${place().feet - height()}px`,
				width: `${width()}px`,
				height: `${height()}px`,
			}}
		>
			<div
				style={{
					...styles.chip,
					background: props.body.seat.colour,
				}}
			/>
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
	chip: {
		position: 'absolute',
		left: '50%',
		top: '-14px',
		width: '8px',
		height: '8px',
		'margin-left': '-6px',
		border: '2px solid white',
	},
} satisfies Record<string, JSX.CSSProperties>
