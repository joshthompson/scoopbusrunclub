import {
	Match,
	Switch,
	createEffect,
	createMemo,
	createSignal,
	onCleanup,
	untrack,
} from 'solid-js'
import type { Racer, RacerEntry, World } from '../game/world'
import { LEVELS } from '../levels'
import { MenuBackdrop } from '../ui/MenuBackdrop'
import { Stage } from '../ui/Stage'
import { Lobby } from './Lobby'
import { type Placing, Results } from './Results'
import { Round } from './Round'
import { newRoomCode } from './protocol'
import { createRoom, seatPlayable } from './room'
import { type RaceStream, createRaceStream, raceStart } from './stream'

/** How long the lobby counts down once everyone's ready, and the results stay up. */
const START_SECONDS = 3
const RESULTS_SECONDS = 8

/**
 * Two Players at least, for a Round to be worth having: one on their own,
 * for trying it out, in development or with `?solo` on the link.
 */
const MIN_PLAYERS =
	import.meta.env.DEV || new URLSearchParams(location.search).has('solo')
		? 1
		: 2

/**
 * Every course, in a random order: not starting with `after`, so the same
 * course isn't raced twice running when one shuffle follows another.
 */
function shuffledCourses(after?: number) {
	const order = LEVELS.map((_, i) => i)
	for (let i = order.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[order[i], order[j]] = [order[j], order[i]]
	}
	if (order.length > 1 && order[0] === after)
		order.push(order.shift() as number)
	return order
}

/**
 * Multi Player, hosted on this device: a Room, its lobby, and then Round
 * after Round, every course in a shuffled order and then shuffled again,
 * until the Host goes back to the lobby or ends it.
 */
export default function Party(props: { onLeave: () => void }) {
	const room = createRoom(newRoomCode())
	const [courses, setCourses] = createSignal(shuffledCourses())
	/** How far through `courses` the Room's got. */
	const [courseAt, setCourseAt] = createSignal(0)
	const levelIndex = () => courses()[courseAt()]
	/** The course after this one: the next in the shuffle, or the first of the next shuffle. */
	const advance = () => {
		if (courseAt() + 1 < courses().length) setCourseAt(courseAt() + 1)
		else {
			setCourses(shuffledCourses(levelIndex()))
			setCourseAt(0)
		}
	}
	const nextLevelIndex = () =>
		courseAt() + 1 < courses().length ? courses()[courseAt() + 1] : undefined
	const [roundNumber, setRoundNumber] = createSignal(0)
	const [startingIn, setStartingIn] = createSignal<number>()
	const [placings, setPlacings] = createSignal<Placing[]>([])
	const [nextIn, setNextIn] = createSignal(RESULTS_SECONDS)
	let world: World | undefined
	/** The Round, as it's sent to phones playing remotely. */
	let stream: RaceStream | undefined
	const stopStream = () => {
		stream?.stop()
		stream = undefined
	}
	onCleanup(stopStream)
	/** A Round's being shown on the big screen: phones playing remotely are sent it too. */
	function streamRound(made: World) {
		world = made
		stopStream()
		stream = createRaceStream(made, roundNumber(), room.sendFrame)
		room.sendRace(raceStart(made, roundNumber()))
	}
	// A phone joining part way through, or switching to playing remotely,
	// is caught up: the Round so far, then the frames like everyone else.
	room.setOnWatch((peer) => {
		if (room.stage() === 'round' && world)
			room.sendRace(raceStart(world, roundNumber()), peer)
	})

	createEffect(() => room.setLevel(LEVELS[levelIndex()].name))

	/** Everyone who's picked who they'll be, and hasn't dropped out. */
	const picked = () => room.seats.filter((s) => s.character && !s.lostAt)
	const everyoneReady = createMemo(
		() => picked().length >= MIN_PLAYERS && picked().every((s) => s.ready),
	)
	const waitingFor = () => {
		const short = MIN_PLAYERS - picked().length
		if (!room.seats.length) return 'Waiting for Players to join…'
		if (short > 0)
			return `Waiting for ${short} more Player${short === 1 ? '' : 's'}…`
		return 'Waiting for everyone to be ready…'
	}

	/** One timer at a time: the lobby's countdown, or the results'. */
	let timer: number | undefined
	const stopTimer = () => {
		window.clearInterval(timer)
		timer = undefined
	}
	onCleanup(stopTimer)

	// Everyone ready: counting down to the first Round. Anyone changing their
	// mind stops it.
	createEffect(() => {
		const stage = room.stage()
		if (stage !== 'lobby' && stage !== 'starting') return
		if (!everyoneReady()) {
			untrack(() => {
				stopTimer()
				setStartingIn(undefined)
				if (stage === 'starting') room.setStage('lobby')
			})
			return
		}
		untrack(() => {
			stopTimer()
			setStartingIn(START_SECONDS)
			room.setStage('starting')
			timer = window.setInterval(() => {
				const left = (startingIn() ?? 1) - 1
				setStartingIn(left)
				if (left <= 0) startRound()
			}, 1000)
		})
	})

	function startRound() {
		stopTimer()
		setStartingIn(undefined)
		// Anyone who's still picking sits this one out.
		for (const seat of room.seats)
			room.update(seat.id, (s) => {
				s.waiting = !seatPlayable(s)
			})
		room.setPaused(false)
		room.setLevel(LEVELS[levelIndex()].name)
		setRoundNumber(roundNumber() + 1)
		room.setStage('round')
	}

	/** Everyone who's picked who they'll be, lined up for a Round in seat order. */
	const racersNow = () =>
		room.seats.flatMap((seat, i): RacerEntry[] => {
			const runner = seatPlayable(seat)
			if (!runner || seat.waiting) return []
			return [
				{
					id: seat.id,
					runner,
					controls: room.controlsFor(seat),
					colour: seat.colour,
					number: i + 1,
				},
			]
		})

	function roundDone(order: Racer[]) {
		const count = order.length
		const placed = order.map(
			(racer, i): Placing => ({
				seatId: racer.id,
				place: i + 1,
				// A point for everyone they outlasted.
				points: count - 1 - i,
				how: !racer.out ? 'won' : racer.out,
			}),
		)
		for (const placing of placed)
			room.update(placing.seatId, (s) => {
				s.points += placing.points
			})
		setPlacings(placed)
		world = undefined
		stopStream()
		room.setStage('results')
		setNextIn(RESULTS_SECONDS)
		stopTimer()
		timer = window.setInterval(() => {
			setNextIn(nextIn() - 1)
			if (nextIn() <= 0) nextRound()
		}, 1000)
	}

	function nextRound() {
		stopTimer()
		room.dropLost()
		if (picked().length < MIN_PLAYERS) return toLobby()
		advance()
		startRound()
	}

	function toLobby() {
		stopTimer()
		world = undefined
		stopStream()
		// A fresh shuffle for the next go.
		setCourses(shuffledCourses(roundNumber() ? levelIndex() : undefined))
		setCourseAt(0)
		for (const seat of room.seats)
			room.update(seat.id, (s) => {
				s.ready = false
				s.waiting = false
			})
		room.setPaused(false)
		room.setStage('lobby')
	}

	function end() {
		stopTimer()
		room.close()
		props.onLeave()
	}

	// How each Player's doing, for their phone.
	room.setStatusOf((seat) => {
		if (room.stage() === 'round' && world) {
			const racer = world.racers.find((r) => r.id === seat.id)
			if (!racer) return undefined
			const order = world.order()
			const place = order ? order.indexOf(racer) + 1 : undefined
			return {
				status:
					racer.out === 'scooped'
						? 'scooped'
						: racer.out === 'finished'
							? 'finished'
							: order
								? 'won'
								: 'racing',
				place,
				of: world.racers.length,
			}
		}
		if (room.stage() === 'results') {
			const placing = placings().find((p) => p.seatId === seat.id)
			if (!placing) return undefined
			return {
				status: placing.how,
				place: placing.place,
				of: placings().length,
			}
		}
		return undefined
	})

	return (
		<Switch>
			<Match when={room.stage() === 'round' && roundNumber()} keyed>
				{(number) => (
					<Round
						level={LEVELS[levelIndex()]}
						number={number}
						racers={untrack(racersNow)}
						onWorld={streamRound}
						onTick={() => stream?.tick()}
						onPause={room.setPaused}
						onOver={roundDone}
						onLobby={toLobby}
						onEnd={end}
					/>
				)}
			</Match>
			<Match when={room.stage() !== 'round'}>
				<Stage>
					<MenuBackdrop />
					<Switch>
						<Match when={room.stage() === 'results'}>
							<Results
								round={roundNumber()}
								level={LEVELS[levelIndex()].name}
								nextLevel={
									nextLevelIndex() === undefined
										? 'a new shuffle'
										: LEVELS[nextLevelIndex() as number].name
								}
								placings={placings()}
								seats={room.seats}
								nextIn={nextIn()}
								onNext={nextRound}
								onLobby={toLobby}
							/>
						</Match>
						<Match when={true}>
							<Lobby
								room={room}
								startingIn={startingIn()}
								waitingFor={waitingFor()}
								onLeave={end}
							/>
						</Match>
					</Switch>
				</Stage>
			</Match>
		</Switch>
	)
}
