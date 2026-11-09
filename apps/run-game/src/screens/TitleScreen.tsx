import type { JSX } from 'solid-js'
import { Logo, Menu, OUTLINED, Panel } from '../ui/Menu'

export function TitleScreen(props: {
	onSinglePlayer: () => void
	onHighScores: () => void
	onInstructions: () => void
	onOptions: () => void
	onCredits: () => void
	/** The item to start on: whichever was last chosen. */
	initial: number
	onChange: (index: number) => void
}) {
	return (
		<div style={styles.screen}>
			<div
				style={{
					animation: 'title-in 0.7s cubic-bezier(0.2, 1.4, 0.4, 1) both',
				}}
			>
				<Logo size={76} />
			</div>
			<div style={styles.tagline}>Run for your life. Don't get scooped.</div>
			<Panel
				style={{ width: '360px', 'margin-top': '10px', padding: '14px 18px' }}
			>
				<Menu
					initial={props.initial}
					onChange={props.onChange}
					items={[
						{ label: 'Single Player', choose: props.onSinglePlayer },
						{ label: 'Multi Player', disabled: true, tag: 'Soon!' },
						{ label: 'High Scores', choose: props.onHighScores },
						{ label: 'Instructions', choose: props.onInstructions },
						{ label: 'Options', choose: props.onOptions },
						{ label: 'Credits', choose: props.onCredits },
					]}
				/>
			</Panel>
			<a
				href="https://scoopbus.run"
				target="_blank"
				rel="noopener noreferrer"
				style={styles.footer}
			>
				scoopbus.run
			</a>
		</div>
	)
}

const styles = {
	screen: {
		position: 'absolute',
		inset: 0,
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		'padding-top': '22px',
	},
	tagline: {
		...OUTLINED,
		'margin-top': '10px',
		'font-size': '20px',
		'white-space': 'nowrap',
	},
	footer: {
		...OUTLINED,
		position: 'absolute',
		right: '16px',
		bottom: '10px',
		'font-size': '14px',
		'text-decoration': 'none',
	},
} satisfies Record<string, JSX.CSSProperties>
