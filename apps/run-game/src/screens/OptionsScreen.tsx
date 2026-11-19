import { type JSX, Match, Show, Switch, createSignal } from 'solid-js'
import { menuTunePicked, tryTune, untryTune } from '../music/music'
import { PLAYLIST, RANDOM_TUNE, tuneName } from '../music/playlist'
import { identity } from '../saved/identity'
import {
	busArtwork,
	clearLocalData,
	effectsOn,
	menuTune,
	musicOn,
	setBusArtwork,
	setEffectsOn,
	setMenuTune,
	setMusicOn,
} from '../saved/settings'
import { play } from '../sfx'
import { Menu, Panel } from '../ui/Menu'
import { IdentityEditor } from './IdentityEditor'

export function OptionsScreen(props: { onBack: () => void }) {
	const [confirming, setConfirming] = createSignal(false)
	const [naming, setNaming] = createSignal(false)
	const [cleared, setCleared] = createSignal(false)
	const [tuning, setTuning] = createSignal(false)
	/** Where they were in the menu, for coming back to it from the tunes or a name. */
	const [at, setAt] = createSignal(0)

	return (
		<div style={styles.screen}>
			<Switch>
				<Match when={tuning()}>
					<MenuMusic onDone={() => setTuning(false)} />
				</Match>
				<Match when={naming()}>
					<IdentityEditor
						onSave={() => setNaming(false)}
						onCancel={() => setNaming(false)}
					/>
				</Match>
				<Match when={!confirming()}>
					<Panel title="Options" style={{ width: '440px' }}>
						<Menu
							initial={at()}
							onChange={setAt}
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
									label: 'Menu music',
									value: tuneName(menuTune() ?? 'menu'),
									choose: () => setTuning(true),
								},
								{
									label: 'Bus',
									value: busArtwork() === 'classic' ? 'Classic Bus' : 'New Bus',
									choose: () =>
										setBusArtwork(
											busArtwork() === 'classic' ? 'new' : 'classic',
										),
								},
								{
									label: 'High score name',
									value: identity().name ?? 'Not set',
									choose: () => setNaming(true),
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
							you've got in Endless, your high scores and your high score name,
							in this browser. It can't be undone.
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

/**
 * Picking the menus' music: Random, or any tune in the game, each with
 * where it's from. Each is tried out as it's moved on to; going back puts
 * on what was on before.
 */
function MenuMusic(props: { onDone: () => void }) {
	const options = [
		{ id: RANDOM_TUNE, name: 'Random', from: 'A new one each time' },
		...PLAYLIST,
	]
	const current = options.findIndex((t) => t.id === (menuTune() ?? 'menu'))
	let list: HTMLDivElement | undefined
	const back = () => {
		untryTune()
		props.onDone()
	}
	return (
		<Panel title="Menu music" style={{ width: '860px' }}>
			<div ref={list} style={styles.tunes}>
				<Menu
					initial={Math.max(0, current)}
					onChange={(i) => {
						// Kept in sight, and heard (Random's, whatever's on).
						list
							?.querySelectorAll('button')
							[i]?.scrollIntoView({ block: 'nearest' })
						const tune = options[i]
						if (tune && tune.id !== RANDOM_TUNE) tryTune(tune.id)
					}}
					items={options.map((tune) => ({
						label: tune.name,
						value: tune.from,
						choose: () => {
							setMenuTune(tune.id)
							menuTunePicked()
							props.onDone()
						},
					}))}
					onBack={back}
				/>
			</div>
			<Menu items={[{ label: 'Back', choose: back }]} active={false} />
		</Panel>
	)
}

const styles = {
	/** Every tune: more than fit, so scrolled, the one picked kept in sight. */
	tunes: {
		'max-height': '330px',
		'overflow-y': 'auto',
		'scrollbar-width': 'thin',
	},
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
