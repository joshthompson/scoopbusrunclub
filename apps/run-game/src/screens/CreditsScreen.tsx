import { For, type JSX } from 'solid-js'
import { Menu, Panel } from '../ui/Menu'

const CREDITS: { role: string; names: string[] }[] = [
	{ role: 'Made by', names: ['Josh Thompson'] },
	{
		role: 'Play Testing',
		names: ['Alisa Vasileva', 'Olesia Vasileva', 'Jack Thompson'],
	},
]

export function CreditsScreen(props: { onBack: () => void }) {
	return (
		<div style={styles.screen}>
			<Panel
				title="Credits"
				style={{ width: '440px', 'align-items': 'center' }}
			>
				<For each={CREDITS}>
					{(credit) => (
						<div style={styles.credit}>
							<div style={styles.role}>{credit.role}</div>
							<For each={credit.names}>
								{(name) => <div style={styles.name}>{name}</div>}
							</For>
						</div>
					)}
				</For>
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
	credit: {
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		'margin-bottom': '10px',
	},
	role: {
		'font-size': '16px',
		opacity: 0.75,
		'letter-spacing': '0.1em',
	},
	name: {
		'font-size': '32px',
		color: 'white',
		'text-shadow': '3px 3px 0 var(--bus-red)',
	},
} satisfies Record<string, JSX.CSSProperties>
