import { For, type JSX, Show, createEffect, on } from 'solid-js'
import { COURSES } from '../courses'
import { ENDLESS_MEDAL_COURSES } from '../courses/endless'
import { SpecialGoalArt } from '../draw/art/goals'
import { MedalArt } from '../draw/art/medal'
import { flyerLook } from '../draw/flyerLook'
import { rideLook } from '../draw/rideLook'
import { PX_PER_M } from '../game/constants'
import { type Medal, medalScores } from '../game/medals'
import type { BonusKind, Result, World } from '../game/world'
import { ONLINE, type Tally } from '../online/runScores'
import type { Playable } from '../runners/playable'
import { identity } from '../saved/identity'
import { ScoreFace } from '../ui/ScoreFace'
import { onHover } from '../ui/hover'
import type { EndlessCourse, Mode } from './Game'

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
	/**
	 * Bonus runners just unlocked, for the first time: found on the way
	 * round, or for finishing every course. Most often none, now and then
	 * one, and two at once can happen. Shown off before this, one at a time
	 * (see `UnlockReveal`), not on it.
	 */
	newRunners: Playable[]
	/** The medal this go got, if any, and whether it's the course's best yet. */
	medal?: Medal
	newMedal?: boolean
	/** Whether this go did the course's special goal, and whether that's for the first time. */
	special?: boolean
	newSpecial?: boolean
	/**
	 * In Endless, its own goals: how many courses the run's got through,
	 * the medal that's worth, and whether it's its best yet.
	 */
	endless?: {
		cleared: number
		medal?: Medal
		newMedal?: boolean
	}
	/** In Endless, the run, over: each course's points, for its summary. */
	run?: { courses: EndlessCourse[] }
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
	carts: 'Mine cart rides',
	cones: 'Cones knocked over',
	football: 'Football to the finish',
	geese: 'Goose rides',
	pumpkins: 'Pumpkins',
	hats: 'Hats',
	barcodes: 'Barcode',
	rings: 'Rings',
	tricks: 'Tricks landed',
	grinds: 'Grinds',
	gates: 'Slalom gates',
	jumps: 'Ski jumps',
	speed: 'Speed',
	hazards: 'Hazards hit',
}

const number = (n: number) => n.toLocaleString('en')
const MEDAL_NAMES: Record<Medal, string> = {
	bronze: 'Bronze',
	silver: 'Silver',
	gold: 'Gold',
}
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
	/** At the end of an Endless run, its table of each course's points, open. */
	breakdown?: boolean
}) {
	const { world } = props
	const finished = () => props.result.kind === 'finished'
	/** What its silver and gold take. */
	const targets = medalScores(world.course)
	const endless = props.mode.kind === 'endless' ? props.mode : undefined

	/**
	 * Each line of the points: the distance, then each bonus had. Not in
	 * Endless, the run over: its courses, in their own table (see `run`).
	 */
	const lines = () => (endless ? [] : courseLines())
	/** In Endless, the run over, each of its courses. */
	const run = () => (endless ? (props.placing?.run?.courses ?? []) : [])
	const newBests = () => run().filter((course) => course.newBest).length
	const courseLines = () => [
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
										: bonus.kind === 'jumps' && world.course.longJump
											? 'Long jump'
											: bonus.kind === 'gates' && world.course.look?.gate
												? world.course.look.gate.name
												: bonus.kind === 'cones' && world.course.look?.cone
													? `${world.course.look.cone.name} ${world.course.look.cone.crumbled ? 'flattened' : 'knocked over'}`
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
	/** The buttons, by index, to scroll to: see below. */
	const buttons: HTMLButtonElement[] = []
	// The panel scrolls, with a lot on it: a button picked with the arrows
	// is scrolled to, if it's out of sight. Not to begin with, though: the
	// top, how it went, is what's to see first.
	createEffect(
		on(
			() => props.picked,
			(i) => buttons[i]?.scrollIntoView({ block: 'nearest' }),
			{ defer: true },
		),
	)
	const button = (
		{ action, i }: { action: SummaryAction; i: number },
		style: JSX.CSSProperties,
		picked: JSX.CSSProperties,
	) => (
		<button
			ref={(el) => {
				buttons[i] = el
			}}
			type="button"
			style={{ ...style, ...(i === props.picked ? picked : {}) }}
			onMouseEnter={onHover(() => props.onPick(i))}
			onClick={action.choose}
		>
			{action.label}
			{i === props.picked ? ' ↵' : ''}
		</button>
	)

	return (
		<div style={styles.backdrop}>
			<div
				style={{
					...styles.panel,
					// The courses' table open: it scrolls, in what room's left,
					// and nothing else does.
					...(props.breakdown && endless ? styles.panelFixed : {}),
				}}
			>
				<div style={styles.heading}>
					<div
						style={{
							...styles.title,
							color: finished() ? '#ffd23f' : 'var(--bus-red)',
						}}
					>
						{finished()
							? endless
								? 'Every course done!'
								: 'Finished!'
							: props.result.kind === 'fallen'
								? 'Fell!'
								: 'Scooped!'}
					</div>
					<div style={styles.subtitle}>
						<Show
							when={!endless}
							fallback={`${world.runner.name} got through ${props.placing?.endless?.cleared ?? 0} of ${COURSES.length} courses`}
						>
							<Show
								when={finished()}
								fallback={`${world.runner.name} made it ${km(props.result.distance)} km round ${world.course.name}`}
							>
								{world.runner.name} beat the bus by{' '}
								{metres(props.result.busGap)}
							</Show>
						</Show>
					</div>
					{/* The medal it got: or a shadow of one, and what it'd take.
					    Not in Endless, the run over: its own, under. */}
					<Show when={!endless}>
						<div style={styles.medal}>
							<MedalArt medal={props.placing?.medal} scale={3} />
							<div style={styles.medalText}>
								<span style={styles.medalName}>
									{props.placing?.medal
										? `${MEDAL_NAMES[props.placing.medal]} medal!${props.placing.newMedal ? ' New best' : ''}`
										: 'No medal'}
								</span>
								<span style={styles.medalTargets}>
									Bronze {number(targets.bronze)} · Silver{' '}
									{number(targets.silver)} · Gold {number(targets.gold)}
								</span>
							</div>
						</div>
					</Show>
					{/* In Endless, its own medal too: for how many courses the run's
					    got through, and what each takes. */}
					<Show when={props.placing?.endless}>
						{(run) => (
							<div style={styles.medal}>
								<MedalArt medal={run().medal} scale={3} />
								<div style={styles.medalText}>
									<span style={styles.medalName}>
										{run().medal
											? `${MEDAL_NAMES[run().medal as Medal]} medal!${run().newMedal ? ' New best' : ''}`
											: 'No medal'}
									</span>
									<span style={styles.medalTargets}>
										{`Bronze ${ENDLESS_MEDAL_COURSES.bronze} · Silver ${ENDLESS_MEDAL_COURSES.silver} · Gold ${ENDLESS_MEDAL_COURSES.gold} courses`}
									</span>
								</div>
							</div>
						)}
					</Show>
					{/* Its special goal, if it has one: done this go, or not. Not in
					    Endless's summary of the whole run. */}
					<Show when={!endless && world.course.special}>
						{(special) => (
							<div style={styles.medal}>
								<SpecialGoalArt
									course={world.course.id}
									done={props.placing?.special}
								/>
								<span
									style={{
										...styles.medalTargets,
										'font-size': '14px',
										...(props.placing?.special
											? { color: '#ffd23f', opacity: 1 }
											: {}),
									}}
								>
									{special().goal}
									{props.placing?.special
										? `${
												// After a goal that's said with a "!" already, a new sentence.
												/[!?.]$/.test(special().goal) ? ' Done!' : ': done!'
											}${props.placing.newSpecial ? ' First time!' : ''}`
										: ''}
								</span>
							</div>
						)}
					</Show>
				</div>

				<Show when={!endless}>
					<div
						style={{
							...styles.points,
							// Just the distance: across the whole width, not half of it.
							...(lines().length === 1
								? { 'grid-template-columns': '1fr' }
								: {}),
						}}
					>
						<For each={lines()}>
							{(line) => (
								<div style={styles.line}>
									<span style={styles.lineLabel}>{line.label}</span>
									<span
										style={{
											...styles.linePoints,
											...(line.points < 0 ? styles.lost : {}),
										}}
									>
										{line.label === 'Distance'
											? number(line.points)
											: `${line.points < 0 ? '-' : '+'}${number(Math.abs(line.points))}`}
									</span>
								</div>
							)}
						</For>
					</div>
				</Show>
				{/* In Endless, the run over: how many courses, and how many of
				    them a best; opened, each course's points, in a table. */}
				<Show when={endless}>
					<div style={styles.runLine}>
						<span>
							{run().length} {run().length === 1 ? 'course' : 'courses'} run
						</span>
						<Show when={newBests()}>
							<span style={styles.newBest}>
								{newBests()} new {newBests() === 1 ? 'best' : 'bests'}
							</span>
						</Show>
					</div>
					<Show when={props.breakdown}>
						<div style={styles.tableWrap}>
							<table style={styles.table}>
								<thead>
									<tr>
										<th style={styles.th}>#</th>
										<th style={styles.thName}>Course</th>
										<th style={styles.th} />
										<th style={styles.th}>Points</th>
										<th style={styles.th}>Best</th>
									</tr>
								</thead>
								<tbody>
									<For each={run()}>
										{(course, i) => (
											<tr>
												<td style={styles.td}>{i() + 1}</td>
												<td style={styles.tdName}>{course.name}</td>
												<td style={styles.tdMedal}>
													<Show when={course.medal}>
														<MedalArt medal={course.medal} scale={1} />
													</Show>
												</td>
												<td style={styles.td}>{number(course.score)}</td>
												<td style={styles.td}>
													<Show
														when={course.newBest}
														fallback={
															<span style={styles.bestBefore}>
																{course.bestBefore
																	? number(course.bestBefore)
																	: '-'}
															</span>
														}
													>
														<span style={styles.newBest}>New best!</span>
													</Show>
												</td>
											</tr>
										)}
									</For>
								</tbody>
							</table>
						</div>
					</Show>
				</Show>

				<div style={styles.totals}>
					<Show when={!endless}>
						<div style={styles.total}>
							<span>
								{world.course.name} {best()}
							</span>
							<span>{number(world.courseScore())} pts</span>
						</div>
					</Show>
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
		// Scrolled, with more on it than fits: a special goal and a great
		// many bonuses at once. New runners aren't on it (see `UnlockReveal`).
		'overflow-y': 'auto',
		'box-sizing': 'border-box',
		padding: '18px 24px',
		background: 'var(--ink)',
		color: 'white',
		border: '4px solid white',
	},
	/** Not scrolled: the courses' table in it is (see `tableWrap`). */
	panelFixed: { 'overflow-y': 'hidden' },
	heading: { 'text-align': 'center', 'flex-shrink': 0 },
	title: { 'font-size': '40px', 'line-height': 1 },
	subtitle: { 'margin-top': '6px', 'font-size': '16px', opacity: 0.85 },
	medal: {
		display: 'flex',
		'align-items': 'center',
		'justify-content': 'center',
		gap: '10px',
		'margin-top': '8px',
	},
	medalText: {
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'flex-start',
		gap: '2px',
	},
	medalName: { 'font-size': '18px', color: '#ffd23f' },
	medalTargets: { 'font-size': '12px', opacity: 0.75 },
	/** The points, in two columns. */
	points: {
		display: 'grid',
		// Each half the width, whatever's in it: a long label wraps, rather
		// than pushing its column wider, off the panel.
		'grid-template-columns': 'repeat(2, minmax(0, 1fr))',
		gap: '4px 20px',
		'font-size': '14px',
	},
	line: {
		display: 'flex',
		'justify-content': 'space-between',
		'align-items': 'baseline',
		gap: '8px',
	},
	lineLabel: { opacity: 0.75, 'min-width': 0 },
	/** The points: on one line, however long its label. */
	linePoints: { 'white-space': 'nowrap' },
	/** Points taken off, for hazards. */
	lost: { color: '#ff8a80' },
	totals: {
		'flex-shrink': 0,
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
		padding: '2px 6px',
		background: 'var(--bus-red)',
		'font-size': '12px',
		'vertical-align': 'middle',
	},
	best: {
		'margin-left': '6px',
		'font-size': '12px',
		opacity: 0.6,
	},
	/** In Endless, the run over: how many courses, and new bests. */
	runLine: {
		'flex-shrink': 0,
		display: 'flex',
		'justify-content': 'center',
		'align-items': 'center',
		gap: '8px',
		'font-size': '14px',
	},
	/** Each course's points, in a table: scrolled, in whatever room the panel has left. */
	tableWrap: {
		// As much of what's left as it needs, scrolled past that.
		flex: '0 1 auto',
		'min-height': '60px',
		'overflow-y': 'auto',
		border: '2px solid rgba(255, 255, 255, 0.25)',
	},
	table: {
		width: '100%',
		'border-collapse': 'collapse',
		'font-size': '13px',
	},
	/** Its headings, kept at the top as it scrolls. */
	th: {
		position: 'sticky',
		top: 0,
		padding: '4px 8px',
		background: 'var(--ink)',
		'text-align': 'right',
		'font-weight': 'normal',
		// Its words dimmed, not it: solid, over the rows scrolling under it.
		color: 'rgba(255, 255, 255, 0.7)',
		'border-bottom': '2px solid rgba(255, 255, 255, 0.25)',
	},
	td: {
		padding: '3px 8px',
		'text-align': 'right',
		'white-space': 'nowrap',
		'border-bottom': '1px solid rgba(255, 255, 255, 0.08)',
	},
	/** Each course's medal: room for it, however wide its name is. */
	tdMedal: {
		padding: '3px 4px',
		width: '20px',
		'min-width': '20px',
		'text-align': 'center',
		'border-bottom': '1px solid rgba(255, 255, 255, 0.08)',
	},
	/** Each course's name, and its heading, along the left. */
	tdName: {
		padding: '3px 8px',
		'text-align': 'left',
		'white-space': 'nowrap',
		'border-bottom': '1px solid rgba(255, 255, 255, 0.08)',
		width: '100%',
	},
	thName: {
		position: 'sticky',
		top: 0,
		padding: '4px 8px',
		background: 'var(--ink)',
		'text-align': 'left',
		'font-weight': 'normal',
		// Its words dimmed, not it: solid, over the rows scrolling under it.
		color: 'rgba(255, 255, 255, 0.7)',
		'border-bottom': '2px solid rgba(255, 255, 255, 0.25)',
	},
	/** A course's best, not beaten this run. */
	bestBefore: { opacity: 0.6 },
	notes: {
		'flex-shrink': 0,
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
		padding: '3px 8px',
		background: 'white',
		color: 'var(--ink)',
		border: '2px solid white',
		'font-size': '13px',
	},
	sendOn: { background: '#ffd23f' },
	actions: {
		'flex-shrink': 0,
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		gap: '8px',
	},
	/** The likeliest next thing: big. */
	primary: {
		'min-width': '240px',
		padding: '8px 18px',
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
		padding: '3px 8px',
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
