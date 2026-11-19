import { For, type JSX } from 'solid-js'
import { CoffeeLink } from '../ui/CoffeeLink'
import { Menu, Panel } from '../ui/Menu'

const CREDITS: { role: string; names: string[] }[] = [
	{ role: 'Made by', names: ['Josh Thompson'] },
	{
		role: 'Play Testing',
		names: [
			'Alisa Vasileva',
			'Olesia Vasileva',
			'Jack Thompson',
			'Owen Pickering',
			'Olga Drochkova',
			'Melvin Valster',
		],
	},
]

export function CreditsScreen(props: { onBack: () => void }) {
	return (
		<div style={styles.screen}>
			<Panel
				title="Credits"
				style={{ 'max-width': 'calc(100vw - 32px)', 'align-items': 'center' }}
			>
				<For each={CREDITS}>
					{(credit) => (
						<div style={styles.credit}>
							<div style={styles.role}>{credit.role}</div>
							<div
								style={{
									...styles.names,
									// A long list goes in two columns, to fit the screen's height.
									'grid-template-columns':
										credit.names.length > 2 ? 'repeat(2, auto)' : 'auto',
								}}
							>
								<For each={credit.names}>
									{(name) => <div style={styles.name}>{name}</div>}
								</For>
							</div>
						</div>
					)}
				</For>
				{/* Coffee over Back, the two as wide as each other. */}
				<div style={styles.buttons}>
					<CoffeeLink />
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
	buttons: {
		display: 'flex',
		'flex-direction': 'column',
		gap: '12px',
		'min-width': '200px',
		'margin-top': '6px',
	},
	credit: {
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		gap: '2px',
		'margin-bottom': '8px',
	},
	role: {
		'font-size': '16px',
		opacity: 0.75,
		'letter-spacing': '0.1em',
	},
	names: {
		display: 'grid',
		'column-gap': '36px',
		'row-gap': '2px',
		'justify-items': 'center',
	},
	name: {
		'font-size': '28px',
		'white-space': 'nowrap',
		color: 'white',
		'text-shadow': '3px 3px 0 var(--bus-red)',
	},
} satisfies Record<string, JSX.CSSProperties>
