import {
	Match,
	Switch,
	createEffect,
	createMemo,
	createSignal,
	onCleanup,
	untrack,
} from 'solid-js'
import { COURSES } from '../courses'
import type { Racer, RacerEntry, World } from '../game/world'
import { playMenu, playTune } from '../music/music'
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
	const order = COURSES.map((_, i) => i)
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
 * after Round, as the Host chose (see `RoomMode`), until they've all been
 * raced, or the Host goes back to the lobby or ends it.
 */
/**
 * How a Room goes, as the Host chooses in the lobby:
 * - `endless`: every course, shuffled, and round again, for ever
 * - `marathon`: every course, shuffled, once
 * - `half`: a Half Marathon, five of them, chosen at random, shuffled
 */
export type RoomMode = 'endless' | 'marathon' | 'half'

/** How many courses a Half Marathon is. */
const HALF_MARATHON = 5

export default function Party(props: { onLeave: () => void }) {
	const room = createRoom(newRoomCode())
	const [mode, setMode] = createSignal<RoomMode>('endless')
	/** The courses for a go in `mode`: every one, or five of them, shuffled. */
	const coursesFor = (mode: RoomMode, after?: number) => {
		const all = shuffledCourses(after)
		return mode === 'half' ? all.slice(0, HALF_MARATHON) : all
	}
	const [courses, setCourses] = createSignal(coursesFor('endless'))
	/** How far through `courses` the Room's got. */
	const [courseAt, setCourseAt] = createSignal(0)
	const courseIndex = () => courses()[courseAt()]
	/** Whether this is the last course of a Marathon or a Half Marathon. */
	const lastCourse = () =>
		mode() !== 'endless' && courseAt() + 1 >= courses().length
	/** The course after this one: the next in the shuffle, or the first of the next shuffle. */
	const advance = () => {
		if (courseAt() + 1 < courses().length) setCourseAt(courseAt() + 1)
		else {
			setCourses(coursesFor(mode(), courseIndex()))
			setCourseAt(0)
		}
	}
	const nextCourseIndex = () =>
		courseAt() + 1 < courses().length ? courses()[courseAt() + 1] : undefined
	/** The Host choosing how the Room goes, in the lobby: its courses chosen afresh. */
	const chooseMode = (next: RoomMode) => {
		setMode(next)
		setCourses(coursesFor(next))
		setCourseAt(0)
	}
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

	createEffect(() => room.setCourse(COURSES[courseIndex()].name))
	// The course's tune through its Round and its results; in the lobby, the
	// menus', till a course has been run, then whatever was last on.
	createEffect(() => {
		const stage = room.stage()
		if (stage === 'round' || stage === 'results')
			playTune(COURSES[courseIndex()].id)
		else playMenu()
	})

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
		room.setCourse(COURSES[courseIndex()].name)
		setRoundNumber(roundNumber() + 1)
		room.setStage('round')
	}

	/**
	 * Who's at the front of the line on the start, by where they are in it:
	 * someone at random to begin with, then the next along each Round, so
	 * everyone gets a go at the front.
	 */
	const firstAt = Math.floor(Math.random() * 1000)

	/**
	 * Everyone who's picked who they'll be, lined up for a Round in seat
	 * order, starting from whoever's turn it is to be at the front.
	 */
	const racersNow = () => {
		const racers = lineUpInSeatOrder()
		const front = racers.length ? (firstAt + roundNumber()) % racers.length : 0
		return [...racers.slice(front), ...racers.slice(0, front)]
	}
	const lineUpInSeatOrder = () =>
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
		// The last of a Marathon's, or a Half Marathon's, courses: back to the
		// lobby for another go.
		if (lastCourse()) return toLobby()
		advance()
		startRound()
	}

	function toLobby() {
		stopTimer()
		world = undefined
		stopStream()
		// A fresh shuffle for the next go.
		setCourses(coursesFor(mode(), roundNumber() ? courseIndex() : undefined))
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
					racer.out === 'scooped' || racer.out === 'fallen'
						? racer.out
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
						course={COURSES[courseIndex()]}
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
								course={COURSES[courseIndex()].name}
								nextCourse={
									lastCourse()
										? 'the lobby: that was the last'
										: nextCourseIndex() === undefined
											? 'a new shuffle'
											: COURSES[nextCourseIndex() as number].name
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
								mode={mode()}
								onMode={chooseMode}
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
