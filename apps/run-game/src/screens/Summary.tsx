import { For, type JSX, Show } from 'solid-js'
import { flyerLook } from '../draw/flyerLook'
import { PX_PER_M } from '../game/constants'
import type { BonusKind, Result, World } from '../game/world'
import type { Mode } from './Game'

/** What the end of a course has to say about the high score tables. */
export interface Placing {
	/** Where this course's points came in its table, from 0, if they made it. */
	coursePlace?: number
	/** The course's top score before this go. */
	courseBestBefore: number
	/** In Endless, where the run so far comes in its table. */
	endlessPlace?: number
	/** A course just unlocked for practice, by finishing the one before it. */
	unlocked?: string
}

/** A button on the summary: picked with the arrows, chosen with Enter. */
export interface SummaryAction {
	label: string
	choose: () => void
}

const BONUS_LABELS: Record<BonusKind, string> = {
	heads: 'Heads bounced',
	fika: 'Fika',
	cheers: 'Cheers',
	corgis: 'Corgi rides',
	geese: 'Goose rides',
	pumpkins: 'Pumpkins',
	barcodes: 'Barcode',
	speed: 'Speed',
	hazards: 'Hazards hit',
}

const number = (n: number) => n.toLocaleString('en')
const km = (px: number) => (Math.max(0, px) / PX_PER_M / 1000).toFixed(2)
const metres = (px: number) => `${Math.max(0, Math.round(px / PX_PER_M))} m`

/**
 * The end of a course: how it went, where its points came from, and where
 * they put it in the high score tables.
 */
export function Summary(props: {
	world: World
	mode: Mode
	result: Result
	placing: Placing | undefined
	actions: SummaryAction[]
	/** Which of them is picked. */
	picked: number
	onPick: (i: number) => void
}) {
	const { world } = props
	const finished = () => props.result.kind === 'finished'
	const endless = props.mode.kind === 'endless' ? props.mode : undefined
	const bonuses = () =>
		(Object.keys(BONUS_LABELS) as BonusKind[])
			.map((kind) => ({ kind, ...world.bonuses[kind] }))
			.filter((bonus) => bonus.count > 0)

	/** Where it came in a table: top, somewhere in it, or not in it. */
	const place = (at: number | undefined, otherwise?: string) =>
		at === 0 ? (
			<span style={{ ...styles.place, ...styles.top }}>New best!</span>
		) : at !== undefined ? (
			<span style={styles.place}>#{at + 1}</span>
		) : otherwise ? (
			<span style={styles.otherwise}>{otherwise}</span>
		) : null

	return (
		<div style={styles.backdrop}>
			<div style={styles.panel}>
				<div
					style={{
						...styles.title,
						color: finished() ? '#ffd23f' : 'var(--bus-red)',
					}}
				>
					{finished()
						? endless
							? `${world.course.name} done!`
							: 'Finished!'
						: props.result.kind === 'fallen'
							? 'Fell!'
							: 'Scooped!'}
				</div>
				<div style={styles.subtitle}>
					<Show
						when={finished()}
						fallback={`${world.runner.name} made it ${km(props.result.distance)} km round ${world.course.name}`}
					>
						{world.runner.name} beat the bus round {world.course.name}, by{' '}
						{metres(props.result.busGap)}
					</Show>
				</div>

				<div style={styles.breakdown}>
					<div style={styles.row}>
						<span>Distance · {number(world.metres())} m</span>
						<span>{number(world.metres())}</span>
					</div>
					<For each={bonuses()}>
						{(bonus) => (
							<div style={styles.row}>
								<span>
									<Show
										when={bonus.kind === 'speed'}
										fallback={
											<>
												{bonus.kind === 'corgis' &&
												world.course.ride === 'llama'
													? 'Llama rides'
													: bonus.kind === 'geese'
														? flyerLook(world.course).rides
														: BONUS_LABELS[bonus.kind]}{' '}
												×{bonus.count}
											</>
										}
									>
										Speed · {(world.finish.ahead / 60).toFixed(1)}
										<span style={{ 'font-size': '0.75em' }}>s</span> ahead of
										the bus
									</Show>
								</span>
								<span style={bonus.points < 0 ? styles.lost : undefined}>
									{bonus.points < 0 ? '-' : '+'}
									{number(Math.abs(bonus.points))}
								</span>
							</div>
						)}
					</For>
					<div style={{ ...styles.row, ...styles.total }}>
						<span>
							{world.course.name}{' '}
							{place(
								props.placing?.coursePlace,
								props.placing?.courseBestBefore
									? `Best ${number(props.placing.courseBestBefore)}`
									: undefined,
							)}
						</span>
						<span>{number(world.courseScore())} pts</span>
					</div>
					<Show when={endless}>
						<div style={{ ...styles.row, ...styles.total }}>
							<span>Endless {place(props.placing?.endlessPlace)}</span>
							<span style={{ color: '#ffd23f' }}>
								{number(world.score())} pts
							</span>
						</div>
					</Show>
				</div>

				<Show when={props.placing?.unlocked}>
					{(name) => (
						<div style={styles.unlocked}>{name()} unlocked for practice!</div>
					)}
				</Show>

				<div style={styles.buttons}>
					<For each={props.actions}>
						{(action, i) => (
							<button
								type="button"
								style={{
									...styles.button,
									...(i() === props.picked ? {} : { background: 'white' }),
								}}
								onMouseEnter={() => props.onPick(i())}
								onClick={action.choose}
							>
								{action.label}
								{i() === props.picked ? ' ↵' : ''}
							</button>
						)}
					</For>
				</div>
			</div>
		</div>
	)
}

const styles = {
	backdrop: {
		position: 'absolute',
		inset: 0,
		display: 'grid',
		'place-items': 'center',
		background: 'rgba(15, 31, 41, 0.45)',
		'pointer-events': 'auto',
	},
	panel: {
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		gap: '10px',
		padding: '22px 32px 22px',
		background: 'var(--ink)',
		color: 'white',
		border: '4px solid white',
		'text-align': 'center',
	},
	title: {
		'font-size': '50px',
	},
	subtitle: {
		'font-size': '19px',
	},
	breakdown: {
		display: 'flex',
		'flex-direction': 'column',
		gap: '6px',
		width: '440px',
		'margin-top': '4px',
		padding: '10px 14px 8px',
		border: '3px solid rgba(255, 255, 255, 0.35)',
		'font-size': '17px',
	},
	row: {
		display: 'flex',
		'justify-content': 'space-between',
		'align-items': 'center',
		gap: '12px',
	},
	/** Points taken off, for hazards. */
	lost: {
		color: '#ff8a80',
	},
	total: {
		'padding-top': '6px',
		'border-top': '2px solid rgba(255, 255, 255, 0.25)',
		'font-size': '20px',
	},
	place: {
		display: 'inline-flex',
		'align-items': 'center',
		height: '18px',
		'margin-left': '6px',
		// The pixel font sits low in its line: a little more room under it
		// than over it puts it in the middle.
		padding: '0 6px 4px',
		'box-sizing': 'border-box',
		background: 'white',
		color: 'var(--ink)',
		'font-size': '13px',
		'line-height': 1,
		'vertical-align': 'middle',
	},
	top: {
		background: 'var(--bus-red)',
		color: 'white',
	},
	otherwise: {
		'margin-left': '6px',
		'font-size': '13px',
		opacity: 0.65,
	},
	unlocked: {
		padding: '6px 10px 2px',
		background: 'var(--bus-red)',
		border: '2px solid white',
		'font-size': '16px',
		transform: 'rotate(-2deg)',
	},
	buttons: {
		display: 'flex',
		gap: '12px',
		'margin-top': '8px',
	},
	button: {
		background: '#ffd23f',
		color: 'var(--ink)',
		border: '3px solid white',
		padding: '10px 14px 6px',
		'font-size': '20px',
	},
} satisfies Record<string, JSX.CSSProperties>
