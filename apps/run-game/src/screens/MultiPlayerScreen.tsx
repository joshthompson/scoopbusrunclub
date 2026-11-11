import type { JSX } from 'solid-js'
import { ON_COMPUTER } from '../multiplayer/onComputer'
import { Menu, OUTLINED, Panel } from '../ui/Menu'

/**
 * Multi Player: hosting a Room on this screen, or joining someone else's:
 * from a computer, to see it here just as the Host does; from a phone, on
 * the phone's own pages, with the QR code or the Room Code.
 */
export function MultiPlayerScreen(props: {
	onHost: () => void
	/** Joining from this computer. */
	onJoin: () => void
	onBack: () => void
}) {
	return (
		<div style={styles.screen}>
			<div style={styles.title}>Multi Player</div>
			<Panel style={{ width: '420px', padding: '14px 18px' }}>
				<Menu
					items={[
						{ label: 'Create Game', choose: props.onHost },
						{
							label: 'Join Game',
							// A phone's side of a Room is its own, where the QR code takes it.
							choose: ON_COMPUTER
								? props.onJoin
								: () => location.assign(`${import.meta.env.BASE_URL}?pad`),
						},
						{ label: 'Back', choose: props.onBack },
					]}
					onBack={props.onBack}
				/>
			</Panel>
			<div style={styles.hint}>
				Create one on the big screen, and join it from another computer, or with
				a phone as your controller.
			</div>
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
		'justify-content': 'center',
		gap: '18px',
	},
	title: { ...OUTLINED, 'font-size': '40px' },
	hint: {
		...OUTLINED,
		'font-size': '18px',
		'max-width': '520px',
		'text-align': 'center',
	},
} satisfies Record<string, JSX.CSSProperties>
