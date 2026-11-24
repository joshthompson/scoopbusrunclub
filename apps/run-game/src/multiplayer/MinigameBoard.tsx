import { For, type JSX, Show, createMemo } from 'solid-js'
import type { World } from '../game/world'
import type { MinigameRun } from '../minigames/types'
import { Medal, ordinal } from './Medal'

/** How big it's shown, against the Podium's Standings: half, so it hides little of the game. */
const BOARD_SCALE = 0.5

/**
 * A minigame's leaderboard, up in the top right corner, as the Podium's
 * Standings are: everyone, best first, a medal for the top three, their
 * colour, their name and their chip ("34%"), and anyone done all there is
 * to do picked out in gold. For every minigame that hasn't a scoreboard
 * of its own (see `Minigame['pills']`).
 */
export function MinigameBoard(props: {
	world: World
	minigame: MinigameRun
	/** Text bigger or smaller, as the rest of the HUD's. */
	textScale?: number
	/** How far down from the top it starts: under a pause button. */
	top?: number
}) {
	const size = (px: number) => `${px * (props.textScale ?? 1)}px`
	/** Everyone, best first. Read with the tick, so it keeps up. */
	const ranked = createMemo(() => {
		props.world.ticks()
		const score = (r: World['racers'][number]) => props.minigame.score?.(r) ?? 0
		return [...props.world.racers]
			.sort((a, b) => score(b) - score(a))
			.map((racer) => ({
				racer,
				chip: props.minigame.chip(racer),
				done: props.minigame.done(racer),
			}))
	})
	return (
		<div
			style={{
				...styles.board,
				top: `${props.top ?? 14}px`,
				width: size(220),
				transform: `scale(${BOARD_SCALE})`,
			}}
		>
			<div style={{ ...styles.title, 'font-size': size(16) }}>Leaderboard</div>
			<For each={ranked()}>
				{(row, i) => (
					<div
						style={{
							...styles.row,
							height: size(24),
							'font-size': size(14),
							...(row.done ? styles.done : {}),
						}}
					>
						<span style={{ ...styles.rank, width: size(28) }}>
							<Show when={i() < 3} fallback={ordinal(i() + 1)}>
								<Medal
									place={(i() + 1) as 1 | 2 | 3}
									size={1.5 * (props.textScale ?? 1)}
								/>
							</Show>
						</span>
						<span
							style={{
								...styles.chip,
								background: row.racer.colour ?? 'var(--ink)',
							}}
						/>
						<span
							style={{
								...styles.name,
								color: props.minigame.nameColour?.(row.racer),
							}}
						>
							{row.racer.runner.name}
						</span>
						<span style={styles.score}>{row.chip}</span>
					</div>
				)}
			</For>
		</div>
	)
}

const styles = {
	board: {
		position: 'absolute',
		right: '16px',
		padding: '8px 12px 6px',
		'box-sizing': 'border-box',
		background: 'rgba(15, 31, 41, 0.88)',
		border: '3px solid white',
		'box-shadow': '0 0 0 3px var(--ink), 6px 6px 0 3px rgba(15, 31, 41, 0.35)',
		color: 'white',
		'z-index': 2,
		'transform-origin': 'top right',
	},
	title: {
		color: '#ffd23f',
		'text-align': 'center',
		'margin-bottom': '4px',
	},
	row: {
		display: 'flex',
		'align-items': 'center',
		gap: '6px',
		'white-space': 'nowrap',
	},
	rank: {
		display: 'flex',
		'justify-content': 'center',
		color: '#ffd23f',
	},
	chip: {
		display: 'inline-block',
		width: '10px',
		height: '10px',
		border: '2px solid white',
		'vertical-align': 'middle',
	},
	name: {
		flex: 1,
		overflow: 'hidden',
		'text-overflow': 'ellipsis',
	},
	score: { color: '#ffd23f' },
	/** Done all there is to do: picked out in gold, as their chip was. */
	done: {
		background: 'rgba(255, 210, 63, 0.25)',
		outline: '2px solid #ffd23f',
	},
} satisfies Record<string, JSX.CSSProperties>
