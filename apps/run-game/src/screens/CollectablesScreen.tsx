import { For, type JSX, Show } from 'solid-js'
import { CollectableArt } from '../draw/art/collectable'
import {
	COLLECTABLES,
	COLLECTABLE_NAMES,
	type Collectable,
} from '../game/collectables'
import { hasCollected, timesCollected } from '../saved/collected'
import { Menu, Panel } from '../ui/Menu'

/**
 * Everything there is to collect, all in one grid: fika, rides, a pumpkin and
 * a parkrun barcode. What's been had,
 * with its name and how many times; what hasn't, a shadow of it and "???".
 */
export function CollectablesScreen(props: { onBack: () => void }) {
	const found = () => COLLECTABLES.filter(hasCollected).length
	return (
		<div style={styles.screen}>
			<Panel
				title="Collectables"
				style={{ width: '860px', padding: '14px 18px' }}
			>
				<div style={styles.tally}>
					{found()} of {COLLECTABLES.length} found
				</div>
				<div style={styles.grid}>
					<For each={COLLECTABLES}>{(id) => <Card id={id} />}</For>
				</div>
				<div style={{ width: '200px', margin: '6px auto 0' }}>
					<Menu
						items={[{ label: 'Back', choose: props.onBack }]}
						onBack={props.onBack}
					/>
				</div>
			</Panel>
		</div>
	)
}

function Card(props: { id: Collectable }) {
	const got = () => hasCollected(props.id)
	return (
		<div style={styles.card}>
			<div
				style={{
					...styles.art,
					// Not had yet: a shadow of it.
					filter: got() ? undefined : 'brightness(0) opacity(0.35)',
				}}
			>
				<CollectableArt id={props.id} />
			</div>
			<div style={styles.name}>
				{got() ? COLLECTABLE_NAMES[props.id] : '???'}
			</div>
			<Show when={got()}>
				<div style={styles.count}>× {timesCollected(props.id)}</div>
			</Show>
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
	tally: {
		'text-align': 'center',
		'font-size': '15px',
		opacity: 0.8,
		'margin-top': '-10px',
	},
	grid: {
		display: 'grid',
		'grid-template-columns': 'repeat(7, 1fr)',
		gap: '6px',
		'max-height': '320px',
		'overflow-y': 'auto',
	},
	card: {
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		gap: '2px',
		padding: '6px 2px 4px',
		background: 'rgba(255, 255, 255, 0.08)',
		border: '2px solid rgba(255, 255, 255, 0.18)',
	},
	art: {
		height: '40px',
		display: 'flex',
		'align-items': 'center',
		'justify-content': 'center',
	},
	name: {
		'font-size': '12px',
		'text-align': 'center',
		'line-height': 1.1,
	},
	count: {
		'font-size': '11px',
		opacity: 0.7,
	},
} satisfies Record<string, JSX.CSSProperties>
