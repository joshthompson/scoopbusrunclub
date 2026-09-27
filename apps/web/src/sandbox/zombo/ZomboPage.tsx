/**
 * Welcome to Scoop Bus. This is Scoop Bus. Seven members orbit the bus on
 * pulsing discs while a lounge loop plays and the announcer promises that
 * anything is possible, forever, in the spirit of zombo.com (1999).
 */
import { For, Show, createSignal, onCleanup } from 'solid-js'
import { BarePage } from '../shared/BarePage'
import { RunnerAnim } from '../shared/RunnerAnim'
import { BUS_WIDTH, ScoopBus } from '../shared/ScoopBus'
import { type SpriteMember, spriteMembers } from '../shared/sprites'
import { createPlayer } from '../shared/synth'
import { SCRIPT } from './script'
import { ZOMBO_SONG } from './song'
import styles from './zombo.module.css'

const COLORS = [
	'#ff3b3b',
	'#ff9f1c',
	'#ffe600',
	'#3ddc5a',
	'#2ec4ff',
	'#5b5bff',
	'#e04bff',
]

/** Seconds one lap of the ring takes. */
const TURN = 9

function pick<T>(items: T[], n: number): T[] {
	const out = [...items]
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[out[i], out[j]] = [out[j], out[i]]
	}
	return out.slice(0, n)
}

export default function ZomboPage() {
	const members = spriteMembers()
	const [cast, setCast] = createSignal<SpriteMember[]>(
		pick(members, COLORS.length),
	)
	const [started, setStarted] = createSignal(false)
	const [caption, setCaption] = createSignal('')
	const [voice, setVoice] = createSignal(true)
	const [ring, setRing] = createSignal(320)

	const player = createPlayer(ZOMBO_SONG, { volume: 0.45 })
	const timeouts = new Set<ReturnType<typeof setTimeout>>()
	let speaking = false
	let line = 0
	let swaps = 0

	/** One disc hands over to a member who is not already on the ring. */
	const swapOne = () => {
		const onRing = new Set(cast())
		const waiting = members.filter((m) => !onRing.has(m))
		if (waiting.length === 0) return
		const disc = swaps++ % COLORS.length
		const next = waiting[Math.floor(Math.random() * waiting.length)]
		setCast((c) => c.map((m, i) => (i === disc ? next : m)))
	}

	const later = (seconds: number, fn: () => void) => {
		const id = setTimeout(() => {
			timeouts.delete(id)
			fn()
		}, seconds * 1000)
		timeouts.add(id)
	}

	/** Read the next line, then the next, then the next, then the next. */
	const announce = () => {
		if (!speaking) return
		const text = SCRIPT[line % SCRIPT.length]
		line++
		if (text === '') {
			setCaption('')
			later(1.6, announce)
			return
		}
		setCaption(text)
		swapOne()
		const fallback = 1.2 + text.length * 0.07
		if (voice() && 'speechSynthesis' in window) {
			const u = new SpeechSynthesisUtterance(text)
			u.rate = 0.82
			u.pitch = 0.75
			u.volume = 1
			let done = false
			const next = () => {
				if (done) return
				done = true
				later(0.9, announce)
			}
			u.onend = next
			u.onerror = next
			later(fallback + 3, next)
			speechSynthesis.speak(u)
		} else {
			later(fallback, announce)
		}
	}

	const start = () => {
		setStarted(true)
		player.start()
		speaking = true
		line = 0
		later(1.2, announce)
	}

	const stopAll = () => {
		speaking = false
		player.stop()
		for (const id of timeouts) clearTimeout(id)
		timeouts.clear()
		if ('speechSynthesis' in window) speechSynthesis.cancel()
	}

	const stop = () => {
		stopAll()
		setStarted(false)
		setCaption('')
	}

	onCleanup(stopAll)

	const observe = (el: HTMLDivElement) => {
		const ro = new ResizeObserver(() => setRing(el.clientWidth))
		ro.observe(el)
		onCleanup(() => ro.disconnect())
	}

	const disc = () => ring() * 0.24

	return (
		<BarePage title="Welcome to Scoop Bus" class={styles.page}>
			<h1 class={styles.title}>
				SCOOPBUS
				<small>this is scoop bus</small>
			</h1>

			<div
				ref={observe}
				class={styles.ringBox}
				style={{
					'--ring': 'min(72vw, 52vh)',
					'--disc': `${disc()}px`,
					'--turn': `${TURN}s`,
				}}
			>
				<div class={styles.ring}>
					<For each={cast()}>
						{(member, i) => (
							<div
								class={styles.disc}
								style={{ '--angle': `${(360 / COLORS.length) * i()}deg` }}
							>
								<div
									class={styles.pulse}
									style={{
										'--color': COLORS[i()],
										'--stagger': `${(-0.9 / COLORS.length) * i()}s`,
									}}
								>
									<div class={styles.upright}>
										<div class={styles.arrive}>
											<RunnerAnim
												member={member}
												height={disc() * 0.68}
												cycle={started() ? 0.5 : 0}
											/>
										</div>
									</div>
								</div>
							</div>
						)}
					</For>
				</div>
				<div class={styles.centre}>
					<div class={styles.breathe}>
						<ScoopBus scale={(ring() * 0.34) / BUS_WIDTH} rolling={started()} />
					</div>
				</div>
			</div>

			<div
				class={styles.caption}
				classList={{ [styles.captionOn]: caption() !== '' }}
			>
				{caption()}
			</div>

			<Show when={!started()}>
				<button type="button" class={styles.play} onClick={start}>
					<span class={styles.playIcon}>▶</span>
					<span>welcome to scoop bus</span>
					<small>(you can do anything here — click to enter, has sound)</small>
				</button>
			</Show>

			<div class={styles.bar}>
				<Show when={started()}>
					<button type="button" class={styles.barButton} onClick={stop}>
						■ stop
					</button>
				</Show>
				<label class={styles.barLabel}>
					<input
						type="checkbox"
						checked={voice()}
						onChange={(e) => setVoice(e.currentTarget.checked)}
					/>{' '}
					the announcer
				</label>
				<a href="/sandbox" class={styles.barLink}>
					← back to scoopbus.run
				</a>
			</div>
		</BarePage>
	)
}
