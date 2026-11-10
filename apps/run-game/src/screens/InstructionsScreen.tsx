import busEmoji from '@/assets/emoji/bus.png'
import rockAsset from '@/assets/misc/rock1.png'
import { For, type JSX } from 'solid-js'
import branchIcon from '../assets/icons/branch.png'
import mudIcon from '../assets/icons/mud.png'
import { PixelArt } from '../draw/PixelArt'
import { FikaArt } from '../draw/art/fika'
import { GooseIcon } from '../draw/art/geese'
import { volunteerFrame } from '../draw/sprites'
import { FIKA_ITEMS } from '../game/fika'
import { MEMBERS } from '../runners/playable'
import { Menu, Panel } from '../ui/Menu'
import { RunStrip } from '../ui/RunStrip'

const CONTROLS: { keys: string[]; does: string }[] = [
	{ keys: ['→', 'D'], does: 'Run' },
	{ keys: ['←', 'A'], does: 'Run back' },
	{ keys: ['↑', 'W', 'Space'], does: 'Jump' },
	{ keys: ['↓', 'S'], does: 'Duck and slide' },
	{ keys: ['Esc', 'P'], does: 'Pause' },
]

export function InstructionsScreen(props: { onBack: () => void }) {
	const marshal = volunteerFrame('rick')
	const member = MEMBERS[0]
	const course: { icon: JSX.Element; text: string }[] = [
		{
			icon: <img src={busEmoji} alt="" style={{ width: '48px' }} />,
			text: 'The Scoop Bus is coming. Stay ahead of it!',
		},
		{
			icon: <img src={rockAsset} alt="" style={{ height: '26px' }} />,
			text: 'Rocks trip you up. Jump them.',
		},
		{
			icon: <PixelArt src={branchIcon} width={44} height={22} />,
			text: 'Low branches. Duck under them.',
		},
		{
			icon: <PixelArt src={mudIcon} width={44} height={10} />,
			text: 'Mud bogs you down. Jump over it.',
		},
		{
			icon: <GooseIcon />,
			text: 'Geese! Jump the ones on the path. Jump into flying ones for a lift.',
		},
		{
			icon: (
				<div style={{ display: 'flex', gap: '4px', 'align-items': 'flex-end' }}>
					<For each={FIKA_ITEMS.slice(0, 3)}>
						{(item) => <FikaArt item={item} />}
					</For>
				</div>
			),
			text: 'Fika! Grab it for a burst of speed.',
		},
		{
			icon: marshal ? (
				<img
					src={marshal}
					alt=""
					class="pixelated"
					style={{ height: '48px' }}
				/>
			) : (
				<span />
			),
			text: 'Volunteers cheer you on as you pass.',
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
			text: 'Runners! Bounce on their heads for points.',
		},
	]

	return (
		<div style={styles.screen}>
			<Panel title="How to play" style={{ width: '860px' }}>
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
		'grid-template-columns': '320px 1fr',
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
		'min-height': '34px',
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
	icon: {
		width: '84px',
		'flex-shrink': 0,
		display: 'flex',
		'justify-content': 'center',
		'align-items': 'center',
		'image-rendering': 'pixelated',
	},
} satisfies Record<string, JSX.CSSProperties>
