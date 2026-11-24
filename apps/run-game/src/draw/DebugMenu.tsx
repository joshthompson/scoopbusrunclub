import { For, Show, createMemo, createSignal, onCleanup } from 'solid-js'
import { cheats } from '../game/cheats'
import { CAMERA_LEAD, PX_PER_M, START_X, VIEW_WIDTH } from '../game/constants'
import { droneOf } from '../game/drone'
import { interviewOf } from '../game/interview'
import type { World } from '../game/world'
import { showFrameMeter, toggleFrameMeter } from './FrameMeter'
import { setDebugMenuOpen } from './debugOpen'

/**
 * The debug menu, on the dev server only (see `RaceCanvas`): Esc twice,
 * quickly, in a race, and it's up, the game held still under it as the
 * first Esc paused it, the pause menu hidden (see `debugMenuOpen`). What's
 * going on, a tick at a time: the
 * course, the clock, where you are and how fast, the bus, the camera, and
 * any course's own goings-on (Kristineberg's drone and interview). And
 * things to do: put yourself so many metres along, the frame meter on or
 * off, the bus off or on, everyone off to the finish, and, on Kristineberg,
 * the long jump's replay shown again after the interview every time. Esc,
 * or Close, and it's gone, and the game's going again, if it was paused,
 * not back at the pause menu.
 *
 * While it's open, the game hears no keys: they're the menu's.
 */

/** How quickly the second Esc has to follow the first, in ms. */
const DOUBLE_TAP_MS = 350
/** How far behind someone put along the course the bus is kept, at least. */
const BUS_BEHIND = 600

/** `world`'s first racer (you, on this screen) put `metres` along the course, stood on the ground, the bus kept back. */
function putAt(world: World, metres: number) {
	const { terrain } = world
	let x = Math.round(START_X + metres * PX_PER_M)
	x = Math.max(START_X, Math.min(terrain.finishX - 10, x))
	// Not down a Gap: on to its far side.
	for (let i = 0; i < 50 && terrain.inGap(x); i++) x += 20
	const b = world.body
	b.x = x
	b.feetY = terrain.groundY(x)
	b.floor = b.feetY
	b.grounded = true
	b.on = undefined
	b.vx = 0
	b.vy = 0
	world.bus.frontX = Math.min(world.bus.frontX, x - BUS_BEHIND)
	world.setCamera(x - VIEW_WIDTH * CAMERA_LEAD)
}

/** A number, to so many places. */
const fixed = (n: number, places = 1) =>
	Number.isFinite(n) ? n.toFixed(places) : String(n)

export function DebugMenu(props: {
	world: World
	/** The race's Scene: paused, it's got a modal. */
	scene: { modal: { get: () => unknown } }
}) {
	const [open, setOpenSignal] = createSignal(false)
	const setOpen = (next: boolean) => {
		setOpenSignal(next)
		setDebugMenuOpen(next)
	}
	onCleanup(() => setDebugMenuOpen(false))
	const [metres, setMetres] = createSignal('')
	const [busOff, setBusOff] = createSignal(cheats.busOff)
	const [encore, setEncore] = createSignal(cheats.alwaysEncore)
	/** Changed, to show it again: paused, the clock's not ticking to. */
	const [poked, setPoked] = createSignal(0)
	let panel: HTMLDivElement | undefined
	let input: HTMLInputElement | undefined
	let lastEsc = 0

	/** Paused, under it: the first Esc of the two paused the game. */
	const paused = () => !!props.scene.modal.get()
	/** Gone; and the game going again, if it's paused, an Esc sent on to it, as if it was pressed there. */
	const close = () => {
		setOpen(false)
		if (!paused()) return
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
		lastEsc = 0
	}
	const show = () => {
		const world = props.world
		setMetres(String(Math.round((world.body.x - START_X) / PX_PER_M)))
		setBusOff(cheats.busOff)
		setOpen(true)
		queueMicrotask(() => input?.select())
	}

	// Before anything else hears it: the second Esc of two, quickly, opens it
	// (and nobody else hears that one); open, Esc closes it, and keys not
	// typed into it are kept from the game.
	const onKey = (event: KeyboardEvent) => {
		if (open()) {
			if (event.key === 'Escape') {
				event.preventDefault()
				// Gone, and the game hears it, paused: going again.
				setOpen(false)
				if (!paused()) event.stopImmediatePropagation()
				return
			}
			if (!panel?.contains(event.target as Node))
				event.stopImmediatePropagation()
			return
		}
		if (event.key !== 'Escape' || event.repeat) return
		const now = performance.now()
		if (now - lastEsc < DOUBLE_TAP_MS) {
			lastEsc = 0
			event.preventDefault()
			event.stopImmediatePropagation()
			show()
		} else lastEsc = now
	}
	window.addEventListener('keydown', onKey, true)
	onCleanup(() => window.removeEventListener('keydown', onKey, true))

	/** What's going on, as of this tick. */
	const info = createMemo(() => {
		if (!open()) return []
		poked()
		const world = props.world
		const now = world.ticks()
		const racer = world.racers[0]
		const b = world.body
		const { course, terrain } = world
		const along = (b.x - START_X) / PX_PER_M
		const lines: [string, string][] = [
			['Course', `${course.name} (${course.id})`],
			['Phase', `${world.phase()}${world.round ? ' · Round' : ''}`],
			['Ticks', `${now} · race ${world.raceTicks()}`],
			[
				'You',
				`${racer?.runner.name ?? '?'}${racer?.out ? ` · ${racer.out}` : ''}`,
			],
			[
				'Distance',
				`${fixed(along, 0)} m of ${fixed(terrain.length / PX_PER_M, 0)} m`,
			],
			['Position', `x ${fixed(b.x, 0)} · feet ${fixed(b.feetY, 0)}`],
			[
				'Speed',
				`vx ${fixed(b.vx)} · vy ${fixed(b.vy)}${b.grounded ? ' · grounded' : ' · in the air'}`,
			],
			[
				'Bus',
				cheats.busOff
					? 'off'
					: `${fixed((b.x - world.bus.frontX) / PX_PER_M, 0)} m behind`,
			],
			[
				'Camera',
				`x ${fixed(world.camera(), 0)} · y ${fixed(world.cameraY(), 0)} · zoom ${fixed(world.zoom(), 2)}`,
			],
			['Racers', `${world.racers.length}`],
		]
		if (world.minigame) lines.push(['Minigame', world.minigame.id])
		const drone = droneOf(world)
		if (drone)
			lines.push([
				'Drone',
				`${drone.state}${drone.jump ? ` · jump ${drone.jump.metres} m` : ''}`,
			])
		const interview = interviewOf(world)
		if (interview?.winner)
			lines.push([
				'Interview',
				`${interview.winner.runner.name}${interview.arrivedAt === undefined ? ' · reporter on the way' : ''}`,
			])
		return lines
	})

	const go = () => {
		const value = Number(metres())
		if (!Number.isFinite(value)) return
		putAt(props.world, value)
		setPoked((n) => n + 1)
	}

	return (
		<Show when={open()}>
			<div
				ref={panel}
				style={styles.panel}
				on:keydown={(event) => {
					// Typed into it: the menu's, not the game's. Bar Esc, which
					// closes it, and goes on to the game if it's paused, to go again.
					if (event.key !== 'Escape') event.stopPropagation()
					if (event.key === 'Enter' && event.target === input) go()
				}}
			>
				<div style={styles.title}>Debug</div>
				<div style={styles.grid}>
					<For each={info()}>
						{([label, value]) => (
							<>
								<span style={styles.label}>{label}</span>
								<span>{value}</span>
							</>
						)}
					</For>
				</div>
				<div style={styles.row}>
					<label style={styles.label} for="debug-metres">
						Go to
					</label>
					<input
						id="debug-metres"
						ref={input}
						style={styles.input}
						type="number"
						step="10"
						value={metres()}
						onInput={(event) => setMetres(event.currentTarget.value)}
					/>
					<span>m</span>
					<button type="button" style={styles.button} onClick={go}>
						Go
					</button>
				</div>
				<div style={styles.row}>
					<button
						type="button"
						style={styles.button}
						onClick={toggleFrameMeter}
					>
						FPS overlay: {showFrameMeter() ? 'on' : 'off'}
					</button>
					<button
						type="button"
						style={styles.button}
						onClick={() => {
							cheats.busOff = !cheats.busOff
							setBusOff(cheats.busOff)
						}}
					>
						Bus: {busOff() ? 'off' : 'on'}
					</button>
					<button
						type="button"
						style={styles.button}
						onClick={() => {
							cheats.toFinish = true
						}}
					>
						To the finish
					</button>
					<Show when={props.world.course.look?.bigScreen}>
						<button
							type="button"
							style={styles.button}
							onClick={() => {
								cheats.alwaysEncore = !cheats.alwaysEncore
								setEncore(cheats.alwaysEncore)
							}}
						>
							Replay again: {encore() ? 'always' : 'sometimes'}
						</button>
					</Show>
				</div>
				<div style={styles.row}>
					<span style={styles.hint}>Esc to close</span>
					<button type="button" style={styles.button} onClick={close}>
						Close
					</button>
				</div>
			</div>
		</Show>
	)
}

const styles = {
	panel: {
		position: 'fixed',
		top: '12px',
		right: '12px',
		width: '340px',
		'z-index': 2000,
		padding: '10px 12px',
		background: 'rgba(15, 31, 41, 0.94)',
		border: '2px solid #ffd23f',
		color: 'white',
		font: '12px ui-monospace, monospace',
		cursor: 'auto',
		'pointer-events': 'auto',
		display: 'flex',
		'flex-direction': 'column',
		gap: '8px',
	},
	title: { color: '#ffd23f', 'font-weight': 'bold', 'font-size': '13px' },
	grid: {
		display: 'grid',
		'grid-template-columns': 'auto 1fr',
		gap: '2px 10px',
	},
	label: { color: '#9fb3c2' },
	row: {
		display: 'flex',
		gap: '6px',
		'align-items': 'center',
		'flex-wrap': 'wrap',
	},
	input: {
		width: '80px',
		font: 'inherit',
		padding: '2px 4px',
		color: '#0f1f29',
		background: 'white',
		border: '1px solid #9fb3c2',
	},
	button: {
		font: 'inherit',
		padding: '3px 8px',
		cursor: 'pointer',
		color: 'white',
		background: '#2b4a5e',
		border: '1px solid #9fb3c2',
		'border-radius': '3px',
	},
	hint: { color: '#9fb3c2', 'margin-right': 'auto' },
} as const
