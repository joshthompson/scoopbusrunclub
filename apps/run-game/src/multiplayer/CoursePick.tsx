import {
	For,
	type JSX,
	Show,
	createEffect,
	createSignal,
	onCleanup,
} from 'solid-js'
import type { Controls } from '../input'
import { play } from '../sfx'
import { CoursePreview } from '../ui/CoursePreview'
import { OUTLINED, OUTLINED_FLAT, Panel } from '../ui/Menu'
import { onHover } from '../ui/hover'
import { PLAYS } from './plays'
import type { Choosing } from './protocol'
import { playedNote } from './roomModes'

/** How many courses to a row. */
const COLUMNS = 4
/** Holding left or right, how long before it starts going on by itself, and then how often, in ms. */
const REPEAT_AFTER = 320
const REPEAT_EVERY = 110

/**
 * Pick and Choose, on the big screen: whoever's picking the next course,
 * how long they've got, and every course, the one they're on with a look
 * at it. Picked with their own controls, if they're at the big screen
 * (`controls`): left and right to go through them, down a row, jump to
 * pick; or clicked. On a phone, they pick on it, and everyone watches here.
 */
export function CoursePick(props: {
	choosing: Choosing
	/** The course they're on. */
	cursor: number
	/** Moving on to another, picking here. */
	onCursor?: (course: number) => void
	/** Picking it, here: none, if it's not picked here. */
	onPick?: (course: number) => void
	/** Their controls, if they're picking with them here. */
	controls?: () => Controls
}) {
	/** What can be picked (see `Choosing['pool']`), and where the cursor is along it. */
	const pool = () => props.choosing.pool
	const at = () => Math.max(0, pool().indexOf(props.cursor))
	const move = (by: number) => {
		play('move')
		const count = pool().length
		props.onCursor?.(pool()[(((at() + by) % count) + count) % count])
	}
	const pick = (course: number) => {
		if (!props.onPick) return
		play('select')
		props.onPick(course)
	}

	// Their controls, read every frame: a press moves it, or picks; held,
	// it goes on by itself.
	let was: Controls | undefined
	let heldSince = 0
	let repeatedAt = 0
	let frame = requestAnimationFrame(function read(now) {
		frame = requestAnimationFrame(read)
		const held = props.controls?.()
		if (!held) return
		// Whatever was held as it opened, let go of first: the jump that
		// ended the last Round isn't a pick.
		was ??= held
		const by = held.right ? 1 : held.left ? -1 : held.down ? COLUMNS : 0
		const wasBy = was.right ? 1 : was.left ? -1 : was.down ? COLUMNS : 0
		if (by && by !== wasBy) {
			move(by)
			heldSince = now
			repeatedAt = now
		} else if (
			by &&
			now - heldSince > REPEAT_AFTER &&
			now - repeatedAt > REPEAT_EVERY
		) {
			move(by)
			repeatedAt = now
		}
		if (held.up && !was.up) pick(props.cursor)
		was = held
	})
	onCleanup(() => cancelAnimationFrame(frame))

	const played = (course: number) => playedNote(props.choosing.played, course)
	const [shown, setShown] = createSignal(props.cursor)
	// The look at it waits a moment as they go through them, so it's not
	// built afresh for every one passed on the way.
	let settle: number | undefined
	const showSoon = (course: number) => {
		window.clearTimeout(settle)
		settle = window.setTimeout(() => setShown(course), 180)
	}
	createEffect(() => showSoon(props.cursor))
	onCleanup(() => window.clearTimeout(settle))

	return (
		<div style={styles.screen}>
			<div style={styles.title}>
				<span style={{ ...styles.chip, background: props.choosing.colour }} />
				{props.choosing.name || `P${props.choosing.number}`}: pick the next
				course
				<span style={styles.clock}>{props.choosing.secondsLeft}</span>
			</div>
			<div style={styles.body}>
				<Panel style={styles.previewPanel}>
					<div style={styles.window}>
						<Show when={PLAYS[shown()]?.course} keyed>
							{(course) => (
								<CoursePreview course={course} width={300} height={169} />
							)}
						</Show>
					</div>
					<div style={styles.previewName}>
						{PLAYS[props.cursor]?.course.name}
					</div>
					<div style={styles.blurb}>
						{PLAYS[props.cursor]?.minigame?.blurb ??
							PLAYS[props.cursor]?.course.blurb}
					</div>
				</Panel>
				<div style={styles.grid}>
					<For each={pool()}>
						{(i) => (
							<button
								type="button"
								style={{
									...styles.card,
									...(i === props.cursor ? styles.cardOn : {}),
									...(played(i).dim ? styles.cardPlayed : {}),
									cursor: props.onPick ? 'pointer' : 'default',
								}}
								onMouseEnter={
									props.onPick ? onHover(() => props.onCursor?.(i)) : undefined
								}
								onClick={() => pick(i)}
							>
								<span style={styles.cardName}>{PLAYS[i].course.name}</span>
								<Show when={PLAYS[i].minigame}>
									<span style={styles.cardNote}>Minigame</span>
								</Show>
								<Show when={played(i).note}>
									{(note) => <span style={styles.cardNote}>{note()}</span>}
								</Show>
							</button>
						)}
					</For>
				</div>
			</div>
			<div style={styles.hint}>
				{props.onPick
					? '← → to choose · ↑ or jump to pick · or click one'
					: 'Picking on their phone…'}{' '}
				· one of the least raced, at random, if time runs out
			</div>
		</div>
	)
}

const styles = {
	screen: {
		position: 'absolute',
		inset: 0,
		display: 'flex',
		'flex-direction': 'column',
		'align-items': 'center',
		padding: '16px 20px 12px',
		'box-sizing': 'border-box',
		gap: '10px',
	},
	title: {
		...OUTLINED,
		display: 'flex',
		'align-items': 'center',
		gap: '10px',
		'font-size': '30px',
	},
	chip: {
		width: '18px',
		height: '18px',
		border: '3px solid white',
		'flex-shrink': 0,
	},
	clock: {
		'margin-left': '8px',
		padding: '2px 10px',
		background: 'rgba(15, 31, 41, 0.9)',
		border: '3px solid white',
		color: '#ffd23f',
		'text-shadow': 'none',
		'font-size': '26px',
	},
	body: {
		display: 'flex',
		gap: '14px',
		flex: 1,
		'min-height': 0,
		width: '100%',
	},
	previewPanel: {
		width: '330px',
		'flex-shrink': 0,
		gap: '6px',
		padding: '12px',
	},
	window: {
		position: 'relative',
		width: '300px',
		height: '169px',
		overflow: 'hidden',
		border: '3px solid white',
		'flex-shrink': 0,
	},
	previewName: { 'font-size': '22px', color: '#ffd23f' },
	blurb: { 'font-size': '13px', 'line-height': 1.3, opacity: 0.9 },
	grid: {
		flex: 1,
		display: 'grid',
		'grid-template-columns': `repeat(${COLUMNS}, 1fr)`,
		'grid-auto-rows': '1fr',
		gap: '6px',
		'min-height': 0,
	},
	card: {
		display: 'flex',
		'flex-direction': 'column',
		'justify-content': 'center',
		'align-items': 'flex-start',
		gap: '2px',
		padding: '4px 10px',
		background: 'rgba(15, 31, 41, 0.9)',
		color: 'white',
		border: '3px solid white',
		'font-family': 'var(--font-pixel)',
		'text-align': 'left',
		'min-height': 0,
	},
	cardOn: { background: '#ffd23f', color: 'var(--ink)' },
	cardPlayed: { opacity: 0.6 },
	cardName: { 'font-size': '15px', 'line-height': 1.1 },
	cardNote: { 'font-size': '11px' },
	hint: { ...OUTLINED_FLAT, 'font-size': '16px' },
} satisfies Record<string, JSX.CSSProperties>
