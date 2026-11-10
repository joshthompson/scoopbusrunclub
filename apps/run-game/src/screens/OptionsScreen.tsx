import { type JSX, Match, Show, Switch, createSignal } from 'solid-js'
import {
	clearLocalData,
	effectsOn,
	musicOn,
	setEffectsOn,
	setMusicOn,
} from '../saved/settings'
import { play } from '../sfx'
import { Menu, Panel } from '../ui/Menu'

export function OptionsScreen(props: { onBack: () => void }) {
	const [confirming, setConfirming] = createSignal(false)
	const [cleared, setCleared] = createSignal(false)

	return (
		<div style={styles.screen}>
			<Switch>
				<Match when={!confirming()}>
					<Panel title="Options" style={{ width: '440px' }}>
						<Menu
							items={[
								{
									label: 'Sound effects',
									value: effectsOn() ? 'On' : 'Off',
									choose: () => {
										setEffectsOn(!effectsOn())
										// Let them hear it's back on.
										play('select')
									},
								},
								{
									label: 'Music',
									value: musicOn() ? 'On' : 'Off',
									choose: () => setMusicOn(!musicOn()),
								},
								{
									label: 'Clear local data',
									choose: () => setConfirming(true),
								},
								{ label: 'Back', choose: props.onBack },
							]}
							onBack={props.onBack}
						/>
						<Show when={cleared()}>
							<div style={styles.note}>All cleared.</div>
						</Show>
					</Panel>
				</Match>
				<Match when={confirming()}>
					<Panel title="Clear local data?" style={{ width: '480px' }}>
						<p style={styles.warning}>
							This forgets every runner you've made, your options, how far
							you've got in Endless and your high scores, in this browser. It
							can't be undone.
						</p>
						<Menu
							items={[
								{ label: 'No, keep them', choose: () => setConfirming(false) },
								{
									label: 'Yes, clear it all',
									choose: () => {
										clearLocalData()
										setCleared(true)
										setConfirming(false)
									},
								},
							]}
							onBack={() => setConfirming(false)}
						/>
					</Panel>
				</Match>
			</Switch>
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
	warning: {
		margin: '0 0 6px',
		'font-family': '"Cabin", sans-serif',
		'font-size': '17px',
		'line-height': 1.35,
		'text-align': 'center',
	},
	note: {
		'text-align': 'center',
		color: '#ffd23f',
		'font-size': '16px',
		animation: 'blink 1s steps(2) 3',
	},
} satisfies Record<string, JSX.CSSProperties>
