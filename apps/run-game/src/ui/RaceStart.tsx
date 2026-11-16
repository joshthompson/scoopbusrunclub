import type { Scene } from 'scoopjs'
import {
	For,
	type JSX,
	Show,
	createEffect,
	createSignal,
	onCleanup,
	untrack,
} from 'solid-js'
import { prepareRace } from '../draw/prepare'
import type { World } from '../game/world'
import type { Controls } from '../input'
import { keyDown, touchScreen } from '../input'
import { play } from '../sfx'
import { Panel } from './Menu'

/**
 * - `loading`: covered, while the race is got ready to draw (see `prepareRace`)
 * - `waiting`: on the start screen, for whoever starts it to say go
 * - `go`: under way, the countdown first
 */
export type StartStage = 'loading' | 'waiting' | 'go'

/**
 * How a race starts: held, covered, while it's got ready to draw; then, the
 * first time a course is raced, held on its start screen till whoever
 * starts it presses jump (Enter, or a click, too), or any key (see
 * `startsOn`); then off, the countdown
 * first. Gone again straight away, it starts the countdown as soon as it's
 * ready: a restart. While it's held, `holding` says so: the world's not to
 * be stepped, so the countdown doesn't start, though the Scene ticks on,
 * everything on it placed and drawn.
 */
export function createRaceStart(options: {
	world: World
	scene: Scene
	/** The start screen, to begin with: not on a restart. */
	intro: boolean
	/** Whoever starts it: their controls, for pressing jump. */
	starter: () => Controls
	/**
	 * Started by any key pressed fresh, instead of by jump, if this says it
	 * does: any but the pause menu's, say, and none while it's paused.
	 */
	startsOn?: (event: KeyboardEvent) => boolean
	/** Off, once under way: the jump that started it's not a jump in the race too. */
	onGo?: () => void
}) {
	const [stage, setStage] = createSignal<StartStage>('loading')
	const [progress, setProgress] = createSignal(0)
	let gone = false
	/** A key, pressed fresh, not a key held down repeating, nor Cmd-Tab and the like. */
	const onKey = (event: KeyboardEvent) => {
		if (stage() !== 'waiting' || event.repeat) return
		if (event.metaKey || event.ctrlKey || event.altKey) return
		if (MODIFIERS.includes(event.key)) return
		if (options.startsOn?.(event)) {
			event.preventDefault()
			go()
		}
	}
	if (options.startsOn) window.addEventListener('keydown', onKey)
	onCleanup(() => {
		gone = true
		window.removeEventListener('keydown', onKey)
	})

	const go = () => {
		if (stage() !== 'waiting') return
		play('select')
		setStage('go')
		options.onGo?.()
	}

	prepareRace(options.world, options.scene, setProgress).then(() => {
		if (gone) return
		if (!options.intro) {
			setStage('go')
			options.onGo?.()
			return
		}
		setStage('waiting')
		// Any key: see `onKey`.
		if (options.startsOn) return
		// Jump pressed: not held already when it came up, from picking the
		// course, say, but pressed fresh. Or Enter.
		let held = true
		const poll = () => {
			if (gone || stage() !== 'waiting') return
			const up = options.starter().up || keyDown('Enter')
			if (up && !held) return go()
			held = up
			requestAnimationFrame(poll)
		}
		requestAnimationFrame(poll)
	})

	return {
		stage,
		progress,
		holding: () => stage() !== 'go',
		go,
	}
}

/**
 * Over the race as it starts: a cover while it's got ready, then its start
 * screen, its name, `children` under it (the controls, say), and `prompt`,
 * how to start it, blinking. Clicked, it starts it.
 */
export function RaceStartOverlay(props: {
	start: ReturnType<typeof createRaceStart>
	title: string
	/** Over its name: "Round 2 of 5", say. */
	kicker?: string
	prompt: string
	children?: JSX.Element
}) {
	// The prompt blinking, so it's seen.
	const [shown, setShown] = createSignal(true)
	createEffect(() => {
		if (props.start.stage() !== 'waiting') return
		const blink = window.setInterval(() => setShown((s) => !s), 600)
		onCleanup(() => window.clearInterval(blink))
	})
	return (
		<>
			<Show when={props.start.stage() === 'loading'}>
				<div style={styles.cover}>
					<div style={styles.loadingTitle}>Loading {props.title}…</div>
					<div style={styles.bar}>
						<div
							style={{
								...styles.barFill,
								width: `${Math.round(props.start.progress() * 100)}%`,
							}}
						/>
					</div>
				</div>
			</Show>
			<Show when={props.start.stage() === 'waiting'}>
				<div
					style={styles.shade}
					onClick={() => untrack(props.start.go)}
					onKeyDown={() => {}}
				>
					<Panel style={styles.panel}>
						<Show when={props.kicker}>
							<div style={styles.kicker}>{props.kicker}</div>
						</Show>
						<div style={styles.title}>{props.title}</div>
						{props.children}
						<div style={{ ...styles.prompt, opacity: shown() ? 1 : 0.25 }}>
							{props.prompt}
						</div>
					</Panel>
				</div>
			</Show>
		</>
	)
}

/** Keys that are only ever held with another: not "any key". */
const MODIFIERS = ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Fn']

/** How to start it, on the start screen: any key, or tap it. */
export const startPrompt = () =>
	touchScreen() ? 'Tap to start' : 'Press any key to start'

/**
 * The controls, big, for the start screen: the keys, or the buttons on a
 * touch screen.
 */
export function ControlKeys() {
	const touch = touchScreen()
	const control = (keys: string[], action: string, detail: string) => (
		<div style={styles.control}>
			<div style={styles.keys}>
				<For each={keys}>
					{(key) => (
						<span
							style={{
								...styles.key,
								...(key.length > 1 ? styles.wideKey : {}),
							}}
						>
							{key}
						</span>
					)}
				</For>
			</div>
			<div style={styles.action}>{action}</div>
			<div style={styles.detail}>{detail}</div>
		</div>
	)
	return (
		<div style={styles.controls}>
			{control(touch ? ['→'] : ['→', 'D'], 'Run', 'hold it down')}
			{control(touch ? ['↑'] : ['↑', 'W', 'Space'], 'Jump', 'hold for higher')}
			{control(touch ? ['↓'] : ['↓', 'S'], 'Duck', 'slide under things')}
		</div>
	)
}

const styles = {
	cover: {
		position: 'absolute',
		inset: 0,
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		'justify-content': 'center',
		gap: '18px',
		background: 'var(--ink)',
		color: 'white',
		'font-family': 'var(--font-pixel)',
		'pointer-events': 'auto',
	},
	loadingTitle: { 'font-size': '32px' },
	bar: {
		width: '320px',
		height: '14px',
		border: '3px solid white',
		padding: '2px',
	},
	barFill: { height: '100%', background: 'white' },
	shade: {
		position: 'absolute',
		inset: 0,
		display: 'grid',
		'place-items': 'center',
		background: 'var(--overlay-black-50)',
		'pointer-events': 'auto',
		cursor: 'pointer',
	},
	panel: {
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		gap: '18px',
		padding: '22px 32px 20px',
		'line-height': 1,
	},
	kicker: { 'font-size': '18px', opacity: 0.8 },
	title: { 'font-size': '40px', color: '#ffd23f' },
	prompt: { 'font-size': '22px', transition: 'opacity 0.15s' },
	controls: {
		display: 'flex',
		gap: '28px',
		color: 'white',
		'white-space': 'nowrap',
	},
	control: {
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		gap: '6px',
	},
	keys: { display: 'flex', gap: '6px' },
	key: {
		'min-width': '34px',
		height: '34px',
		padding: '6px 6px 0',
		'box-sizing': 'border-box',
		background: 'white',
		color: 'var(--ink)',
		'border-bottom': '4px solid #9a9a9a',
		'font-size': '20px',
		'text-align': 'center',
	},
	wideKey: { 'font-size': '14px', padding: '9px 8px 0' },
	action: { 'font-size': '22px' },
	detail: { 'font-size': '13px', opacity: 0.75 },
} satisfies Record<string, JSX.CSSProperties>
