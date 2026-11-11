import busEmoji from '@/assets/emoji/bus.png'
import rockAsset from '@/assets/misc/rock1.png'
import { For, type JSX } from 'solid-js'
import mudAsset from '../assets/obstacles/mud.png'
import mummyAsset from '../assets/obstacles/mummy.png'
import { CollectableArt } from '../draw/art/collectable'
import type { Collectable } from '../game/collectables'
import { MEMBERS } from '../runners/playable'
import { Menu, Panel } from '../ui/Menu'
import { RunStrip } from '../ui/RunStrip'

const CONTROLS: { keys: string[]; does: string }[] = [
	{ keys: ['→', 'D'], does: 'Run' },
	{ keys: ['←', 'A'], does: 'Run back' },
	{ keys: ['↑', 'W', 'Space'], does: 'Jump (hold to go higher)' },
	{ keys: ['↓', 'S'], does: 'Duck, slide, drop down' },
	{ keys: ['Esc', 'P'], does: 'Pause' },
]

/** A few of a kind, side by side, to stand for all of them. */
function Examples(props: { children: JSX.Element; zoom?: number }) {
	return (
		<div style={{ ...styles.examples, zoom: props.zoom ?? 1 }}>
			{props.children}
		</div>
	)
}

/** Fika and rides, as they're seen on the course. */
function Pictures(props: { ids: Collectable[]; zoom?: number }) {
	return (
		<Examples zoom={props.zoom}>
			<For each={props.ids}>{(id) => <CollectableArt id={id} />}</For>
		</Examples>
	)
}

/**
 * How to play: the controls and what's on a course, in
 * kinds (Obstacles, Boosts, Rides) rather than one by one: there are too many
 * of each to go through.
 */
export function InstructionsScreen(props: { onBack: () => void }) {
	const member = MEMBERS[0]
	const course: { icon: JSX.Element; text: string }[] = [
		{
			icon: <img src={busEmoji} alt="" style={{ width: '48px' }} />,
			text: "The Scoop Bus is right behind you. Get caught, or fall down a gap, and you're out.",
		},
		{
			icon: (
				<Examples>
					<img src={rockAsset} alt="" style={{ height: '22px' }} />
					<img
						src={mudAsset}
						alt=""
						class="pixelated"
						style={{ height: '14px' }}
					/>
					{/* Its first frame: the sheet has two, side by side. */}
					<div
						style={{
							width: '27px',
							height: '43.5px',
							background: `url("${mummyAsset}") 0 0 / 54px 43.5px no-repeat`,
							'image-rendering': 'pixelated',
						}}
					/>
				</Examples>
			),
			text: 'Obstacles: jump over them or duck under them. Hit one and you stumble.',
		},
		{
			icon: <Pictures ids={['fika:kanelbulle']} />,
			text: 'Boosts, like fika, give you a burst of speed.',
		},
		{
			icon: (
				<Pictures ids={['ride:corgi', 'ride:goose', 'ride:llama']} zoom={0.6} />
			),
			text: 'Rides: run or jump into one to climb on. Duck to get off.',
		},
		{
			icon: member ? (
				<RunStrip
					frame={member.sprite.run[0] ?? ''}
					width={member.sprite.width}
					height={member.sprite.height}
					scale={1.4}
				/>
			) : (
				<span />
			),
			text: 'Runners: bounce on their heads.',
		},
	]

	return (
		<div style={styles.screen}>
			<Panel title="How to play" style={{ width: '880px' }}>
				<div style={styles.columns}>
					<div style={styles.column}>
						<div style={styles.heading}>Controls</div>
						<For each={CONTROLS}>
							{(control) => (
								<div style={styles.row}>
									<div style={styles.keys}>
										<For each={control.keys}>
											{(key) => <span style={styles.key}>{key}</span>}
										</For>
									</div>
									<span>{control.does}</span>
								</div>
							)}
						</For>
						<div style={styles.note}>
							Or a gamepad: stick to run, A to jump, B to duck.
						</div>
					</div>
					<div style={styles.column}>
						<div style={styles.heading}>On the course</div>
						<For each={course}>
							{(thing) => (
								<div style={styles.row}>
									<div style={styles.icon}>{thing.icon}</div>
									<span>{thing.text}</span>
								</div>
							)}
						</For>
					</div>
				</div>
				<div style={{ width: '200px', 'align-self': 'center' }}>
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
	columns: {
		display: 'grid',
		'grid-template-columns': '340px 1fr',
		gap: '28px',
	},
	column: {
		display: 'flex',
		'flex-direction': 'column',
		gap: '6px',
	},
	heading: {
		'font-size': '20px',
		color: '#ffd23f',
		'margin-bottom': '2px',
	},
	row: {
		display: 'flex',
		'align-items': 'center',
		gap: '14px',
		'min-height': '38px',
		'font-family': '"Cabin", sans-serif',
		'font-size': '16px',
		'line-height': 1.25,
	},
	keys: {
		display: 'flex',
		gap: '5px',
		width: '150px',
		'flex-shrink': 0,
	},
	key: {
		'min-width': '30px',
		padding: '6px 7px 3px',
		background: 'white',
		color: 'var(--ink)',
		'border-bottom': '4px solid #9aa3a8',
		'font-family': 'var(--font-pixel)',
		'font-size': '15px',
		'text-align': 'center',
	},
	note: {
		'font-family': '"Cabin", sans-serif',
		'font-size': '14px',
		opacity: 0.75,
	},
	icon: {
		width: '120px',
		'flex-shrink': 0,
		display: 'flex',
		'justify-content': 'center',
		'align-items': 'center',
		'image-rendering': 'pixelated',
	},
	examples: {
		display: 'flex',
		gap: '8px',
		'align-items': 'flex-end',
	},
} satisfies Record<string, JSX.CSSProperties>
