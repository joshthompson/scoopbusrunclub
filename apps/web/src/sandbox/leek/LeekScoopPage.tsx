/**
 * Leek Scoop: one member jogs in the middle of a peach sky twirling a leek
 * to a polka, edge to edge, and every sixteen bars they slide off to the
 * left so the next one can slide in from the right with a leek of their own.
 */
import { For, Show, createSignal, onCleanup } from 'solid-js'
import { BarePage } from '../shared/BarePage'
import { RunnerAnim } from '../shared/RunnerAnim'
import { type SpriteMember, spriteMembers } from '../shared/sprites'
import { type StepEvent, createPlayer } from '../shared/synth'
import styles from './leek.module.css'
import { LEEK_SONG } from './song'

/** Steps between one member leaving and the next arriving: eight bars. */
const SWAP_EVERY = 128

/** An Archimedean spiral as an SVG path, three turns in a 100 unit box. */
function spiralPath(): string {
	const pts: string[] = []
	for (let t = 0; t <= Math.PI * 6; t += 0.2) {
		const r = 2.4 * t
		pts.push(
			`${(50 + r * Math.cos(t)).toFixed(1)},${(50 + r * Math.sin(t)).toFixed(1)}`,
		)
	}
	return `M${pts.join(' L')}`
}

const SPIRAL = spiralPath()

interface Swirl {
	x: number
	y: number
	size: number
	dx: number
	dy: number
	drift: number
	delay: number
}

function swirls(n: number): Swirl[] {
	return Array.from({ length: n }, (_, i) => ({
		x: ((i % 4) * 25 + 4 + Math.random() * 16) % 100,
		y: (Math.floor(i / 4) * 32 + Math.random() * 20) % 100,
		size: 6 + Math.random() * 8,
		dx: (Math.random() - 0.5) * 12,
		dy: (Math.random() - 0.5) * 12,
		drift: 6 + Math.random() * 8,
		delay: -Math.random() * 10,
	}))
}

function Leek(props: { width: number }) {
	return (
		<svg
			class={styles.leek}
			viewBox="0 0 44 200"
			style={{ '--leek': `${props.width}px` }}
			aria-hidden="true"
		>
			<title>leek</title>
			{/* leaves */}
			<path
				d="M22 125 C 20 90, 6 60, 4 6 C 14 40, 20 80, 22 125 Z"
				fill="#2f8f3a"
			/>
			<path
				d="M22 125 C 24 85, 34 50, 42 14 C 36 60, 26 90, 22 125 Z"
				fill="#3aa646"
			/>
			<path
				d="M22 125 C 21 80, 20 40, 22 2 C 25 40, 24 80, 22 125 Z"
				fill="#48b954"
			/>
			{/* shaft */}
			<path d="M15 120 L29 120 L28 186 L16 186 Z" fill="#f4f7ec" />
			<path d="M15 120 L29 120 L28 140 L16 140 Z" fill="#cfe6b8" />
			{/* roots */}
			<path
				d="M17 186 l-4 10 M21 186 l-1 12 M25 186 l2 11 M28 186 l4 9"
				stroke="#d9ccb2"
				stroke-width="1.6"
				stroke-linecap="round"
				fill="none"
			/>
		</svg>
	)
}

export default function LeekScoopPage() {
	const members = spriteMembers()
	const random = (not?: SpriteMember) => {
		const pool = members.filter((m) => m !== not)
		return pool[Math.floor(Math.random() * pool.length)]
	}

	const [started, setStarted] = createSignal(false)
	const [current, setCurrent] = createSignal<SpriteMember>(random())
	const [leaving, setLeaving] = createSignal<SpriteMember | undefined>()
	const [entrances, setEntrances] = createSignal(0)
	const [stageSize, setStageSize] = createSignal({ w: 800, h: 600 })
	const [swirlSet] = createSignal(swirls(12))

	const player = createPlayer(LEEK_SONG, { volume: 0.45 })
	const timeouts = new Set<ReturnType<typeof setTimeout>>()

	const later = (delay: number, fn: () => void) => {
		const id = setTimeout(
			() => {
				timeouts.delete(id)
				fn()
			},
			Math.max(0, delay * 1000),
		)
		timeouts.add(id)
	}

	const swap = () => {
		const out = current()
		setLeaving(out)
		setCurrent(random(out))
		setEntrances((n) => n + 1)
	}

	const onStep = (ev: StepEvent) => {
		if (ev.absoluteStep === 0 || ev.absoluteStep % SWAP_EVERY !== 0) return
		later(ev.delay, swap)
	}

	const stopAll = () => {
		player.stop()
		for (const id of timeouts) clearTimeout(id)
		timeouts.clear()
	}

	const start = () => {
		setStarted(true)
		player.start()
	}

	const stop = () => {
		stopAll()
		setStarted(false)
		setLeaving(undefined)
	}

	const unsubscribe = player.onStep(onStep)
	onCleanup(() => {
		unsubscribe()
		stopAll()
	})

	const beatSeconds = 60 / LEEK_SONG.bpm

	const observe = (el: HTMLDivElement) => {
		const ro = new ResizeObserver(() =>
			setStageSize({ w: el.clientWidth, h: el.clientHeight }),
		)
		ro.observe(el)
		onCleanup(() => ro.disconnect())
	}

	/** Tall on a wide screen, but never so wide the leek leaves a phone. */
	const performerHeight = () =>
		Math.min(stageSize().h * 0.62, stageSize().w * 0.68)
	/** Sit a little below centre, whatever the screen's shape. */
	const performerBottom = () => (stageSize().h - performerHeight()) * 0.42

	return (
		<BarePage title="Leek Scoop" class={styles.page}>
			<div
				ref={observe}
				class={styles.stage}
				style={{ '--beat': `${beatSeconds}s` }}
			>
				<svg
					class={styles.spirals}
					viewBox="0 0 100 75"
					preserveAspectRatio="xMidYMid slice"
					aria-hidden="true"
				>
					<title>swirls</title>
					<For each={swirlSet()}>
						{(s) => (
							<g transform={`translate(${s.x} ${s.y * 0.75})`}>
								<g class={styles.bobber} style={{ '--delay': `${s.delay}s` }}>
									<g transform={`scale(${s.size / 100})`}>
										<path
											class={styles.spiral}
											d={SPIRAL}
											style={{
												'--dx': `${s.dx}px`,
												'--dy': `${s.dy}px`,
												'--drift': `${s.drift}s`,
												'--delay': `${s.delay}s`,
											}}
										/>
									</g>
								</g>
							</g>
						)}
					</For>
				</svg>

				<Show when={leaving()} keyed>
					{(member) => (
						<div
							class={`${styles.performer} ${styles.slideOut}`}
							style={{ bottom: `${performerBottom()}px` }}
							onAnimationEnd={() => setLeaving(undefined)}
						>
							<div class={styles.bob}>
								<RunnerAnim
									member={member}
									height={performerHeight()}
									cycle={beatSeconds * 2}
								/>
								<Leek width={performerHeight() * 0.22} />
							</div>
						</div>
					)}
				</Show>

				<Show when={current()} keyed>
					{(member) => (
						<div
							class={styles.performer}
							classList={{ [styles.slideIn]: entrances() > 0 }}
							style={{ bottom: `${performerBottom()}px` }}
						>
							<div class={styles.bob}>
								<RunnerAnim
									member={member}
									height={performerHeight()}
									cycle={started() ? beatSeconds * 2 : 0}
								/>
								<Leek width={performerHeight() * 0.22} />
							</div>
						</div>
					)}
				</Show>

				<Show when={!started()}>
					<button type="button" class={styles.play} onClick={start}>
						<span class={styles.playIcon}>▶</span>
						<span>leek scoop</span>
						<small>(scoop bus edition — click to play, has sound)</small>
					</button>
				</Show>
			</div>

			<div class={styles.bar}>
				<Show when={started()}>
					<button type="button" class={styles.barButton} onClick={stop}>
						■ stop
					</button>
				</Show>
				<a href="/sandbox" class={styles.barLink}>
					← back to scoopbus.run
				</a>
			</div>
		</BarePage>
	)
}
