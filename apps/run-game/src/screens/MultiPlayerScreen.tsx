import type { JSX } from 'solid-js'
import { Menu, OUTLINED, Panel } from '../ui/Menu'

/**
 * Multi Player: hosting a Room on this screen, or joining someone else's
 * from this phone, with its QR code or Room Code.
 */
export function MultiPlayerScreen(props: {
	onHost: () => void
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
							// The phone's side of a Room, where its QR code would take it.
							choose: () => location.assign(`${import.meta.env.BASE_URL}?pad`),
						},
						{ label: 'Back', choose: props.onBack },
					]}
					onBack={props.onBack}
				/>
			</Panel>
			<div style={styles.hint}>
				Host on the big screen. Join with a phone, as its controller or to play
				on it.
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
