import type { JSX } from 'solid-js'
import { Menu, Panel } from '../ui/Menu'

export function CreditsScreen(props: { onBack: () => void }) {
	return (
		<div style={styles.screen}>
			<Panel
				title="Credits"
				style={{ width: '440px', 'align-items': 'center' }}
			>
				<div style={styles.role}>Made by</div>
				<div style={styles.name}>Josh Thompson</div>
				<div style={{ width: '200px', 'margin-top': '14px' }}>
					<Menu
						items={[{ label: 'Back', choose: props.onBack }]}
						onBack={props.onBack}
					/>
				</div>
			</Panel>
		</div>
	)
}

const styles = {
	screen: {
		position: 'absolute',
		inset: 0,
		display: 'grid',
		'place-items': 'center',
	},
	role: {
		'font-size': '16px',
		opacity: 0.75,
		'letter-spacing': '0.1em',
	},
	name: {
		'font-size': '40px',
		color: 'white',
		'text-shadow': '3px 3px 0 var(--bus-red)',
		animation: 'logo-bounce 2.6s ease-in-out infinite',
	},
} satisfies Record<string, JSX.CSSProperties>
