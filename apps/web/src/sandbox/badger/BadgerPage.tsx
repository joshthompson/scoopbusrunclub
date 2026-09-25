/**
 * Badger Badger Badger, with the club: twelve members pop up on the beat,
 * fika interrupts, and the snake is a race that parkrun insists it isn't.
 */
import { For, Show, createSignal, onCleanup } from 'solid-js'
import { BarePage } from '../shared/BarePage'
import { RunnerAnim } from '../shared/RunnerAnim'
import { BUS_WIDTH, ScoopBus } from '../shared/ScoopBus'
import { type SpriteMember, spriteMembers } from '../shared/sprites'
import { type StepEvent, createPlayer } from '../shared/synth'
import styles from './badger.module.css'
import {
	COFFEE,
	COFFEE_PALETTE,
	KANELBULLE,
	KANELBULLE_PALETTE,
	pixelArt,
} from './pixelart'
import { BADGER_SONG } from './song'

type Phase = 'badgers' | 'fika' | 'race' | 'notarace'

/** Twelve stage positions, back row to front, as percentages of the stage. */
const SLOTS = [
	{ x: 14, y: 62, h: 12 },
	{ x: 38, y: 60, h: 12 },
	{ x: 62, y: 60, h: 12 },
	{ x: 86, y: 62, h: 12 },
	{ x: 8, y: 77, h: 15 },
	{ x: 30, y: 75, h: 15 },
	{ x: 52, y: 75, h: 15 },
	{ x: 74, y: 77, h: 15 },
	{ x: 20, y: 92, h: 19 },
	{ x: 44, y: 90, h: 19 },
	{ x: 66, y: 90, h: 19 },
	{ x: 90, y: 92, h: 19 },
]

const RACE_WORDS = ['A race,', 'a race,', 'race,', 'a race,']

function shuffle<T>(items: T[]): T[] {
	const out = [...items]
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[out[i], out[j]] = [out[j], out[i]]
	}
	return out
}

export default function BadgerPage() {
	const members = spriteMembers()
	const bun = pixelArt(KANELBULLE, KANELBULLE_PALETTE, 8)
	const coffee = pixelArt(COFFEE, COFFEE_PALETTE, 8)

	const [started, setStarted] = createSignal(false)
	const [phase, setPhase] = createSignal<Phase>('badgers')
	const [cast, setCast] = createSignal<SpriteMember[]>(
		shuffle(members).slice(0, 12),
	)
	const [shown, setShown] = createSignal(0)
	const [word, setWord] = createSignal('')
	const [wordKey, setWordKey] = createSignal(0)
	const [beat, setBeat] = createSignal(0)
	const [busAcross, setBusAcross] = createSignal(false)
	const [voice, setVoice] = createSignal(true)
	const [stageHeight, setStageHeight] = createSignal(600)

	let stage!: HTMLDivElement
	const player = createPlayer(BADGER_SONG, { volume: 0.5 })
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

	const say = (text: string) => {
		if (!voice() || !('speechSynthesis' in window)) return
		speechSynthesis.cancel()
		const u = new SpeechSynthesisUtterance(text)
		u.rate = 1.35
		u.pitch = 1.1
		speechSynthesis.speak(u)
	}

	const flash = (text: string, speak = true) => {
		setWord(text)
		setWordKey((k) => k + 1)
		if (speak) say(text)
	}

	const onStep = (ev: StepEvent) => {
		if (ev.step % 2 !== 0) return
		const b = ev.step / 2
		later(ev.delay, () => {
			setBeat((n) => n + 1)
			switch (ev.sectionId) {
				case 'badgers':
				case 'badgers2': {
					if (b === 0) {
						setPhase('badgers')
						setCast(shuffle(members).slice(0, 12))
						setShown(0)
						setBusAcross(false)
					}
					setShown(b + 1)
					flash(cast()[b]?.data.name ?? '')
					break
				}
				case 'fika':
				case 'fika2': {
					if (b === 0) setPhase('fika')
					if (b === 0 || b === 2) flash('Fika,')
					break
				}
				case 'race': {
					if (b === 0) {
						setPhase('race')
						setBusAcross(false)
						requestAnimationFrame(() => setBusAcross(true))
					}
					if (b % 2 === 0) flash(RACE_WORDS[b / 2])
					break
				}
				case 'notarace': {
					if (b === 0) {
						setPhase('notarace')
						flash("parkrun's not a race!")
					}
					break
				}
			}
		})
	}

	const stopAll = () => {
		player.stop()
		for (const id of timeouts) clearTimeout(id)
		timeouts.clear()
		if ('speechSynthesis' in window) speechSynthesis.cancel()
	}

	const start = () => {
		setStarted(true)
		player.start()
	}

	const stop = () => {
		stopAll()
		setStarted(false)
		setShown(0)
		setPhase('badgers')
	}

	const unsubscribe = player.onStep(onStep)
	onCleanup(() => {
		unsubscribe()
		stopAll()
	})

	const beatSeconds = 60 / BADGER_SONG.bpm
	const raceSeconds = beatSeconds * 8

	const observe = (el: HTMLDivElement) => {
		stage = el
		const ro = new ResizeObserver(() => setStageHeight(stage.clientHeight))
		ro.observe(el)
		onCleanup(() => ro.disconnect())
	}

	return (
		<BarePage
			title="Badger Badger Badger (Scoop Bus edition)"
			class={styles.page}
		>
			<div class={styles.frame}>
				<div
					ref={observe}
					class={styles.stage}
					style={{ '--beat': `${beatSeconds}s`, '--race': `${raceSeconds}s` }}
					data-phase={phase()}
				>
					<div class={styles.sky} />
					<div class={styles.sun} />
					<svg
						class={styles.hills}
						viewBox="0 0 800 300"
						preserveAspectRatio="none"
						aria-hidden="true"
					>
						<path
							d="M0 120 Q 200 40 400 120 T 800 120 V300 H0 Z"
							fill="#4caf50"
						/>
						<path
							d="M0 190 Q 250 110 500 190 T 800 170 V300 H0 Z"
							fill="#43a047"
						/>
						<path d="M0 250 Q 300 200 800 250 V300 H0 Z" fill="#388e3c" />
					</svg>

					{/* The badgers */}
					<Show when={phase() === 'badgers'}>
						<For each={cast()}>
							{(member, i) => (
								<div
									class={styles.slot}
									classList={{ [styles.slotUp]: shown() > i() }}
									style={{
										left: `${SLOTS[i()].x}%`,
										top: `${SLOTS[i()].y}%`,
										'z-index': `${10 + i()}`,
									}}
								>
									<div
										class={styles.bob}
										style={{
											'animation-delay': `${(i() % 2) * -beatSeconds * 0.5}s`,
										}}
									>
										<RunnerAnim
											member={member}
											height={(SLOTS[i()].h / 100) * stageHeight()}
											flip={i() % 2 === 1}
											cycle={beatSeconds}
										/>
									</div>
								</div>
							)}
						</For>
					</Show>

					{/* Fika */}
					<Show when={phase() === 'fika'}>
						<img src={bun} alt="" class={`${styles.fika} ${styles.fikaLeft}`} />
						<img
							src={coffee}
							alt=""
							class={`${styles.fika} ${styles.fikaMid}`}
						/>
						<img
							src={bun}
							alt=""
							class={`${styles.fika} ${styles.fikaRight}`}
						/>
					</Show>

					{/* The race */}
					<Show when={phase() === 'race' || phase() === 'notarace'}>
						<div class={styles.finish}>
							<span>FINISH</span>
						</div>
						<ScoopBus
							scale={(stageHeight() * (4 / 3) * 0.42) / BUS_WIDTH}
							rolling={phase() === 'race'}
							class={styles.bus}
							classList={{
								[styles.busAcross]: busAcross() || phase() === 'notarace',
							}}
						/>
						<div
							class={styles.raceRunners}
							classList={{
								[styles.raceRunnersAcross]:
									busAcross() || phase() === 'notarace',
							}}
						>
							<For each={cast()}>
								{(member, i) => (
									<div
										style={{ 'animation-delay': `${i() * -0.1}s` }}
										class={styles.raceRunner}
									>
										<RunnerAnim
											member={member}
											height={(9 / 100) * stageHeight()}
											cycle={beatSeconds / 2}
										/>
									</div>
								)}
							</For>
						</div>
					</Show>

					<Show when={started()}>
						<div
							class={styles.word}
							classList={{
								[styles.wordBig]: phase() === 'notarace',
								[styles.wordFika]: phase() === 'fika',
							}}
							data-key={wordKey()}
						>
							{word()}
						</div>
					</Show>

					<Show when={!started()}>
						<button type="button" class={styles.play} onClick={start}>
							<span class={styles.playIcon}>▶</span>
							<span>badger badger badger</span>
							<small>(scoop bus edition — click to play, has sound)</small>
						</button>
					</Show>

					<div class={styles.beatDot} data-beat={beat() % 2} />
				</div>

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
						chant the names
					</label>
					<a href="/sandbox" class={styles.barLink}>
						← back to scoopbus.run
					</a>
				</div>
			</div>
		</BarePage>
	)
}
