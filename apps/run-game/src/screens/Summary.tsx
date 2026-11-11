import { For, type JSX, Show } from 'solid-js'
import { flyerLook } from '../draw/flyerLook'
import { rideLook } from '../draw/rideLook'
import { PX_PER_M } from '../game/constants'
import type { BonusKind, Result, World } from '../game/world'
import { ONLINE, type Tally } from '../online/runScores'
import { identity } from '../saved/identity'
import { ScoreFace } from '../ui/ScoreFace'
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

/** Scores from the end of a course that would go on the online tables, and how sending them's going. */
export interface OnlineOffer {
	scores: {
		table: string
		/** The table's name: a course's, or Endless. */
		label: string
		score: number
		tally: Tally
		ticket: Promise<string | undefined>
	}[]
	state: 'ready' | 'sending' | 'sent' | 'failed'
	/** Where each came, by table, from 0. */
	ranks?: Record<string, number>
	problem?: string
}

/** A button on the summary: picked with the arrows, chosen with Enter. */
export interface SummaryAction {
	label: string
	choose: () => void
	/** Sending a score online, the first time: shown with the online note, not with the rest. */
	send?: boolean
}

const BONUS_LABELS: Record<BonusKind, string> = {
	heads: 'Heads bounced',
	fika: 'Fika',
	cheers: 'Cheers',
	corgis: 'Corgi rides',
	geese: 'Goose rides',
	pumpkins: 'Pumpkins',
	barcodes: 'Barcode',
	rings: 'Rings',
	speed: 'Speed',
	hazards: 'Hazards hit',
}

const number = (n: number) => n.toLocaleString('en')
const km = (px: number) => (Math.max(0, px) / PX_PER_M / 1000).toFixed(2)
const metres = (px: number) => `${Math.max(0, Math.round(px / PX_PER_M))} m`

/**
 * The end of a course, kept short: how it went, where its points came from,
 * two columns of them, the total, and what next: one big button for the
 * likeliest, and the rest small under it.
 */
export function Summary(props: {
	world: World
	mode: Mode
	result: Result
	placing: Placing | undefined
	online: OnlineOffer | undefined
	/** Still finding out whether there's anything to send online. */
	checkingOnline?: boolean
	actions: SummaryAction[]
	/** Which of them is picked. */
	picked: number
	onPick: (i: number) => void
}) {
	const { world } = props
	const finished = () => props.result.kind === 'finished'
	const endless = props.mode.kind === 'endless' ? props.mode : undefined

	/** Each line of the points: the distance, then each bonus had. */
	const lines = () => [
		{ label: 'Distance', points: world.metres() },
		...(Object.keys(BONUS_LABELS) as BonusKind[])
			.map((kind) => ({ kind, ...world.bonuses[kind] }))
			.filter((bonus) => bonus.count > 0)
			.map((bonus) => ({
				label:
					bonus.kind === 'speed'
						? `Speed · ${(world.finish.ahead / 60).toFixed(1)}s ahead`
						: `${
								bonus.kind === 'corgis'
									? rideLook(world.course).rides
									: bonus.kind === 'geese'
										? flyerLook(world.course).rides
										: BONUS_LABELS[bonus.kind]
							} ×${bonus.count}`,
				points: bonus.points,
			})),
	]

	/** This device's best on the course, beaten or not. */
	const best = () =>
		props.placing?.coursePlace === 0 ? (
			<span style={styles.newBest}>New best!</span>
		) : props.placing?.courseBestBefore ? (
			<span style={styles.best}>
				Best {number(props.placing.courseBestBefore)}
			</span>
		) : null

	/** The actions, by where they are in the list: the arrows go through them in order. */
	const indexed = () => props.actions.map((action, i) => ({ action, i }))
	const sendAction = () => indexed().find((a) => a.action.send)
	const rest = () => indexed().filter((a) => !a.action.send)
	const button = (
		{ action, i }: { action: SummaryAction; i: number },
		style: JSX.CSSProperties,
		on: JSX.CSSProperties,
	) => (
		<button
			type="button"
			style={{ ...style, ...(i === props.picked ? on : {}) }}
			onMouseEnter={() => props.onPick(i)}
			onClick={action.choose}
		>
			{action.label}
			{i === props.picked ? ' ↵' : ''}
		</button>
	)

	return (
		<div style={styles.backdrop}>
			<div style={styles.panel}>
				<div style={styles.heading}>
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
							{world.runner.name} beat the bus by {metres(props.result.busGap)}
						</Show>
					</div>
				</div>

				<div
					style={{
						...styles.points,
						// Just the distance: across the whole width, not half of it.
						...(lines().length === 1 ? { 'grid-template-columns': '1fr' } : {}),
					}}
				>
					<For each={lines()}>
						{(line) => (
							<div style={styles.line}>
								<span style={styles.lineLabel}>{line.label}</span>
								<span style={line.points < 0 ? styles.lost : undefined}>
									{line.label === 'Distance'
										? number(line.points)
										: `${line.points < 0 ? '-' : '+'}${number(Math.abs(line.points))}`}
								</span>
							</div>
						)}
					</For>
				</div>

				<div style={styles.totals}>
					<div style={styles.total}>
						<span>
							{world.course.name} {best()}
						</span>
						<span>{number(world.courseScore())} pts</span>
					</div>
					<Show when={endless}>
						<div style={styles.total}>
							<span>Endless</span>
							<span style={{ color: '#ffd23f' }}>
								{number(world.score())} pts
							</span>
						</div>
					</Show>
				</div>

				{/* Online, its line's always there, the same height, whatever it
				    turns out to say, or nothing: so the panel doesn't jump when
				    the tables answer. */}
				<Show when={ONLINE || props.online || props.placing?.unlocked}>
					<div style={styles.notes}>
						<Show when={ONLINE || props.online}>
							<div style={styles.onlineLine}>
								<Show
									when={props.online}
									fallback={
										<Show when={props.checkingOnline}>
											<span style={styles.checking}>
												Checking the online high scores…
											</span>
										</Show>
									}
								>
									{(online) => (
										<Online
											offer={online()}
											send={
												<Show when={sendAction()}>
													{(send) => button(send(), styles.send, styles.sendOn)}
												</Show>
											}
										/>
									)}
								</Show>
							</div>
						</Show>
						<Show when={props.placing?.unlocked}>
							{(name) => <div style={styles.unlocked}>{name()} unlocked!</div>}
						</Show>
					</div>
				</Show>

				<div style={styles.actions}>
					<Show when={rest()[0]}>
						{(first) => button(first(), styles.primary, styles.primaryOn)}
					</Show>
					<div style={styles.secondary}>
						<For each={rest().slice(1)}>
							{(a) => button(a, styles.link, styles.linkOn)}
						</For>
					</div>
				</div>
			</div>
		</div>
	)
}

/** How sending a score to the online tables is going: one line. */
function Online(props: { offer: OnlineOffer; send?: JSX.Element }) {
	const tables = () => props.offer.scores.map((s) => s.label).join(' and ')
	const ranks = () =>
		props.offer.scores
			.filter((s) => props.offer.ranks?.[s.table] !== undefined)
			.map((s) => `#${(props.offer.ranks?.[s.table] ?? 0) + 1} ${s.label}`)
			.join(' · ')
	return (
		<div style={styles.online}>
			<Show when={props.offer.state === 'ready'}>
				<span>New online high score: {tables()}!</span>
				{props.send}
			</Show>
			<Show when={props.offer.state === 'sending'}>
				<span>Sending to the high scores…</span>
			</Show>
			<Show when={props.offer.state === 'sent'}>
				<ScoreFace icon={identity().icon} />
				<span>
					{identity().name} · online {ranks()}
				</span>
			</Show>
			<Show when={props.offer.problem}>
				<span style={styles.problem}>{props.offer.problem}</span>
			</Show>
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
		'align-items': 'stretch',
		gap: '10px',
		width: '500px',
		'max-height': 'calc(100% - 40px)',
		'box-sizing': 'border-box',
		padding: '18px 24px',
		background: 'var(--ink)',
		color: 'white',
		border: '4px solid white',
	},
	heading: { 'text-align': 'center' },
	title: { 'font-size': '40px', 'line-height': 1 },
	subtitle: { 'margin-top': '6px', 'font-size': '16px', opacity: 0.85 },
	/** The points, in two columns. */
	points: {
		display: 'grid',
		'grid-template-columns': '1fr 1fr',
		gap: '4px 20px',
		'font-size': '14px',
	},
	line: {
		display: 'flex',
		'justify-content': 'space-between',
		gap: '8px',
		'white-space': 'nowrap',
	},
	lineLabel: { opacity: 0.75, overflow: 'hidden', 'text-overflow': 'ellipsis' },
	/** Points taken off, for hazards. */
	lost: { color: '#ff8a80' },
	totals: {
		display: 'flex',
		'flex-direction': 'column',
		gap: '4px',
		'padding-top': '8px',
		'border-top': '2px solid rgba(255, 255, 255, 0.25)',
	},
	total: {
		display: 'flex',
		'justify-content': 'space-between',
		'align-items': 'center',
		'font-size': '20px',
	},
	newBest: {
		'margin-left': '6px',
		padding: '1px 6px 3px',
		background: 'var(--bus-red)',
		'font-size': '12px',
		'vertical-align': 'middle',
	},
	best: {
		'margin-left': '6px',
		'font-size': '12px',
		opacity: 0.6,
	},
	notes: {
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		gap: '4px',
		'font-size': '14px',
	},
	/** As tall as the tallest it holds: a face, or the send button. */
	onlineLine: {
		display: 'flex',
		'align-items': 'center',
		'justify-content': 'center',
		'min-height': '30px',
		'align-self': 'stretch',
	},
	checking: {
		opacity: 0.6,
		'font-family': '"Cabin", sans-serif',
		'font-size': '13px',
	},
	online: {
		display: 'flex',
		'align-items': 'center',
		'justify-content': 'center',
		gap: '8px',
		'flex-wrap': 'wrap',
		color: '#ffd23f',
	},
	problem: {
		color: '#ff8a80',
		'font-family': '"Cabin", sans-serif',
		'font-size': '13px',
	},
	unlocked: { color: '#7fe08a' },
	/** Sending, the first time: a small button by the note. */
	send: {
		padding: '4px 8px 2px',
		background: 'white',
		color: 'var(--ink)',
		border: '2px solid white',
		'font-size': '13px',
	},
	sendOn: { background: '#ffd23f' },
	actions: {
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		gap: '8px',
	},
	/** The likeliest next thing: big. */
	primary: {
		'min-width': '240px',
		padding: '10px 18px 6px',
		background: 'white',
		color: 'var(--ink)',
		border: '3px solid white',
		'font-size': '20px',
	},
	primaryOn: { background: '#ffd23f' },
	/** The rest: small, in a row. */
	secondary: {
		display: 'flex',
		gap: '6px',
		'justify-content': 'center',
		'flex-wrap': 'wrap',
	},
	link: {
		padding: '4px 8px 2px',
		background: 'transparent',
		color: 'white',
		border: '2px solid rgba(255, 255, 255, 0.35)',
		'font-size': '14px',
	},
	linkOn: {
		background: '#ffd23f',
		color: 'var(--ink)',
		'border-color': '#ffd23f',
	},
} satisfies Record<string, JSX.CSSProperties>
