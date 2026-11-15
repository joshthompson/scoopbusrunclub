import { type JSX, Show, onMount } from 'solid-js'
import { touchScreen } from '../input'
import type { Playable } from '../runners/playable'
import { play } from '../sfx'
import { RunStrip } from '../ui/RunStrip'
import { RunnerStage, nameSize } from '../ui/RunnerStage'

/**
 * A runner just unlocked, at the end of a course, before its summary: one
 * at a time, each its own screen, big, running, and what unlocked them.
 * Continue for the next, or, after the last, the summary.
 */
export function UnlockReveal(props: {
	runner: Playable
	/** Which this is, from 1, and of how many. */
	number: number
	count: number
	onContinue: () => void
}) {
	onMount(() => play('cheer'))
	const last = () => props.number === props.count
	return (
		<div style={styles.backdrop}>
			<div style={styles.panel}>
				<div style={styles.title}>New runner unlocked!</div>
				<Show when={props.count > 1}>
					<div style={styles.count}>
						{props.number} of {props.count}
					</div>
				</Show>
				<RunnerStage height={180}>
					<RunStrip
						frame={props.runner.sprite.run[0] ?? ''}
						width={props.runner.sprite.width}
						height={props.runner.sprite.height}
						scale={5}
						stride={0.4}
						style={{ position: 'relative', 'margin-bottom': '22px' }}
					/>
				</RunnerStage>
				<div
					style={{
						...styles.name,
						'font-size': `${nameSize(props.runner.name, [48, 38, 28])}px`,
					}}
				>
					{props.runner.name}
				</div>
				<Show when={props.runner.unlockedBy}>
					<div style={styles.why}>{props.runner.unlockedBy}</div>
				</Show>
				<div style={styles.hint}>Pick them on the runner screen</div>
				<button type="button" style={styles.go} onClick={props.onContinue}>
					{last() ? 'Continue' : 'Next unlock'}
					{touchScreen() ? ' ▶' : ' ↵'}
				</button>
			</div>
		</div>
	)
}

const styles = {
	backdrop: {
		position: 'absolute',
		inset: 0,
		display: 'grid',
		'place-items': 'center',
		background: 'rgba(15, 31, 41, 0.55)',
		'pointer-events': 'auto',
	},
	/** Gold-edged, popping in, and glowing on: not to be missed. */
	panel: {
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		gap: '8px',
		width: '420px',
		'box-sizing': 'border-box',
		padding: '18px 24px 20px',
		background: 'linear-gradient(#3a6aa8, #22406e)',
		color: 'white',
		border: '4px solid #ffd23f',
		animation:
			'new-runner-pop 0.5s ease-out both, new-runner-glow 1.4s ease-in-out 0.5s infinite',
	},
	title: { 'font-size': '30px', color: '#ffd23f', 'line-height': 1 },
	count: { 'font-size': '14px', opacity: 0.8 },
	name: {
		'margin-top': '4px',
		color: '#ffd23f',
		'white-space': 'nowrap',
		'line-height': 1,
		'text-shadow': '3px 3px 0 #b33a2a',
	},
	/** What unlocked them. */
	why: { 'font-size': '16px', color: '#7fe08a', 'text-align': 'center' },
	hint: {
		'font-family': '"Cabin", sans-serif',
		'font-size': '13px',
		opacity: 0.8,
	},
	go: {
		'margin-top': '6px',
		'min-width': '220px',
		padding: '10px 18px 6px',
		background: '#ffd23f',
		color: 'var(--ink)',
		border: '3px solid var(--ink)',
		'font-size': '22px',
		'box-shadow': '4px 4px 0 #b33a2a',
		animation: 'go-pulse 1.2s ease-in-out infinite',
	},
} satisfies Record<string, JSX.CSSProperties>
