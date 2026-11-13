import { For, type JSX, Show } from 'solid-js'
import { VIEW_HEIGHT } from '../game/constants'
import { onScreen } from '../game/step'
import type { World } from '../game/world'
import { touchScreen } from '../input'

/** How far the controls stay up for, once going, and how far on they've faded, in metres. */
const CONTROLS_SHOWN = 25
const CONTROLS_GONE = 45

/** Where the card goes in the sky, and about how tall it is. */
const SKY_TOP = 96
const CARD_HEIGHT = 112
/** How far either side of the middle of the screen it reaches, with a little to spare. */
const CARD_REACH = 260
/** Room kept over the path for the runners, the bus and the start's arch. */
const OVER_PATH = 150
/** How far under the path it goes, when there's no room over it. */
const UNDER_PATH = 70

/**
 * Where the card's top goes: up in the sky, unless the path's up there
 * too (as at the top of The Slopes, or over the sewers), then under it.
 */
function cardTop(world: World) {
	const ground: number[] = []
	for (let sx = 480 - CARD_REACH; sx <= 480 + CARD_REACH; sx += 20) {
		const x = world.camera() + sx * world.zoom()
		ground.push(onScreen(world, x, world.terrain.groundY(x)).y)
	}
	if (Math.min(...ground) - OVER_PATH >= SKY_TOP + CARD_HEIGHT) return SKY_TOP
	return Math.min(
		Math.max(...ground) + UNDER_PATH,
		VIEW_HEIGHT - CARD_HEIGHT - 12,
	)
}

/**
 * The controls, big, through the countdown and the first few metres: up
 * till they're off and running, however long that takes. The keys, or the
 * buttons on a touch screen. Kept off the path, wherever it is on screen.
 */
export function ControlsCard(props: { world: World }) {
	const { world } = props
	const touch = touchScreen()
	const opacity = () => {
		const phase = world.phase()
		if (phase === 'countdown') return 1
		if (phase !== 'running') return 0
		return Math.min(
			1,
			(CONTROLS_GONE - world.metres()) / (CONTROLS_GONE - CONTROLS_SHOWN),
		)
	}
	// Placed through the countdown, then left there: not chasing the path
	// up and down as they run off.
	let placed = SKY_TOP
	const top = () => {
		if (world.phase() === 'countdown') placed = cardTop(world)
		return placed
	}
	const control = (keys: string[], action: string, detail: string) => (
		<div style={styles.control}>
			<div style={styles.keys}>
				<For each={keys}>
					{(key) => (
						<span
							style={{
								...styles.key,
								...(key.length > 1 ? styles.wideKey : {}),
							}}
						>
							{key}
						</span>
					)}
				</For>
			</div>
			<div style={styles.action}>{action}</div>
			<div style={styles.detail}>{detail}</div>
		</div>
	)
	return (
		<Show when={opacity() > 0}>
			<div
				style={{ ...styles.controls, top: `${top()}px`, opacity: opacity() }}
			>
				{control(touch ? ['→'] : ['→', 'D'], 'Run', 'hold it down')}
				{control(
					touch ? ['↑'] : ['↑', 'W', 'Space'],
					'Jump',
					'hold for higher',
				)}
				{control(touch ? ['↓'] : ['↓', 'S'], 'Duck', 'slide under things')}
			</div>
		</Show>
	)
}

const styles = {
	controls: {
		position: 'absolute',
		left: '50%',
		transform: 'translateX(-50%)',
		display: 'flex',
		gap: '28px',
		padding: '14px 24px 10px',
		background: 'rgba(15, 31, 41, 0.78)',
		border: '3px solid white',
		color: 'white',
		'white-space': 'nowrap',
		'font-family': 'var(--font-pixel)',
		'line-height': 1,
		'pointer-events': 'none',
	},
	control: {
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		gap: '6px',
	},
	keys: { display: 'flex', gap: '6px' },
	key: {
		'min-width': '34px',
		height: '34px',
		padding: '6px 6px 0',
		'box-sizing': 'border-box',
		background: 'white',
		color: 'var(--ink)',
		'border-bottom': '4px solid #9a9a9a',
		'font-size': '20px',
		'text-align': 'center',
	},
	wideKey: { 'font-size': '14px', padding: '9px 8px 0' },
	action: { 'font-size': '22px' },
	detail: { 'font-size': '13px', opacity: 0.75 },
} satisfies Record<string, JSX.CSSProperties>
