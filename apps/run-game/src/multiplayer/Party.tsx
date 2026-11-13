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
import type { Hat } from '../game/hats'
import type { Racer, RacerEntry, World } from '../game/world'
import { playMenu, playTune } from '../music/music'
import { MenuBackdrop } from '../ui/MenuBackdrop'
import { Stage } from '../ui/Stage'
import { Lobby } from './Lobby'
import { Podium } from './Podium'
import { type Placing, Results, standingsOf } from './Results'
import { Round } from './Round'
import { type GameMode, type RoomMode, newRoomCode } from './protocol'
import { type Seat, createRoom, seatPlayable } from './room'
import { roomModeInfo } from './roomModes'
import { type RaceStream, createRaceStream, raceStart } from './stream'

/**
 * How long the lobby counts down once everyone's ready, the results stay up,
 * and the Podium.
 */
const START_SECONDS = 3
const RESULTS_SECONDS = 8
const PODIUM_SECONDS = 30

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
 * after Round, as its Starter chose (see `RoomMode`), until they've all been
 * raced, or a Backyard Ultra's called, and then the Podium. Or until the Host
 * goes back to the lobby or ends it.
 */
export type { RoomMode }

export default function Party(props: { onLeave: () => void }) {
	const room = createRoom(newRoomCode())
	const [mode, setMode] = createSignal<RoomMode>('backyard')
	/** How its Rounds are raced: with the bus, or in Baby Mode. */
	const [gameMode, setGameMode] = createSignal<GameMode>('scoop')
	const info = () => roomModeInfo(mode())
	/** The courses for a go in `mode`: so many of them at random, or every one, shuffled. */
	const coursesFor = (mode: RoomMode, after?: number) => {
		const all = shuffledCourses(after)
		const count = roomModeInfo(mode).courses
		return count ? all.slice(0, count) : all
	}
	const [courses, setCourses] = createSignal(coursesFor(mode()))
	/** How far through `courses` the Room's got. */
	const [courseAt, setCourseAt] = createSignal(0)
	const courseIndex = () => courses()[courseAt()]
	/** How many Rounds this go has, unless it's a Backyard Ultra. */
	const roundsOf = () => (info().repeats ? undefined : courses().length)
	/** Whether this is the last course of the go: never, in a Backyard Ultra. */
	const lastCourse = () => !info().repeats && courseAt() + 1 >= courses().length
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
	/** What's next, between Rounds. */
	const nextText = () => {
		const next = nextCourseIndex()
		return lastCourse()
			? 'That was the last! The Podium'
			: next === undefined
				? 'Next: a new shuffle'
				: `Next: ${COURSES[next].name}`
	}
	/** The Starter choosing how the Room goes, in the lobby: its courses chosen afresh. */
	const chooseMode = (next: RoomMode) => {
		setMode(next)
		setCourses(coursesFor(next))
		setCourseAt(0)
	}
	const [roundNumber, setRoundNumber] = createSignal(0)
	/** The hat each seat's Player had on at the end of the last Round: still on for the next. */
	const hats = new Map<string, Hat>()
	const [startingIn, setStartingIn] = createSignal<number>()
	const [placings, setPlacings] = createSignal<Placing[]>([])
	const [nextIn, setNextIn] = createSignal(RESULTS_SECONDS)
	const [lobbyIn, setLobbyIn] = createSignal(PODIUM_SECONDS)
	/**
	 * The Standings as they were at the end, for the Podium: fixed, so
	 * anyone leaving while it's up stays on it, and nobody else moves up.
	 */
	const [podium, setPodium] = createSignal<Seat[]>()
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
	/**
	 * Everyone but the Starter who's picked is ready, and so the Starter can
	 * start it: pressing Start is their being ready.
	 */
	const canStart = createMemo(() => {
		const starter = room.starter()
		return (
			!!starter?.character &&
			picked().length >= MIN_PLAYERS &&
			picked().every((s) => s.ready || s === starter)
		)
	})
	/** The Starter's pressed Start: counting down, unless someone changes their mind. */
	const [startPressed, setStartPressed] = createSignal(false)
	const waitingFor = () => {
		const short = MIN_PLAYERS - picked().length
		const starter = room.starter()
		if (!room.seats.length) return 'Waiting for Players to join…'
		if (short > 0)
			return `Waiting for ${short} more Player${short === 1 ? '' : 's'}…`
		const number = starter ? room.seats.indexOf(starter) + 1 : 0
		if (starter && !starter.character) return `Waiting for P${number} to pick…`
		if (starter && canStart())
			return starter.kind === 'phone'
				? `Waiting for P${number} to start…`
				: starter.kind === 'touch'
					? `P${number}: tap Start`
					: `P${number}: jump to start`
		return 'Waiting for everyone to be ready…'
	}
	// The Starter's phone: how the Room's set, and whether it can start.
	room.setLobby(() => ({
		roomMode: mode(),
		gameMode: gameMode(),
		canStart: canStart(),
		why: waitingFor(),
	}))
	room.setProgress(() => ({ round: roundNumber(), rounds: roundsOf() }))
	// Everything else its screens show, for computers that have joined.
	room.setScreenView(() => ({
		canStart: canStart(),
		startingIn: startingIn(),
		waitingFor: waitingFor(),
		placings: placings(),
		next: nextText(),
		nextIn: nextIn(),
		lobbyIn: lobbyIn(),
		podium: podium(),
	}))
	room.setOnStarter({
		start: () => {
			if (room.stage() !== 'lobby' || !canStart()) return false
			setStartPressed(true)
			return true
		},
		cancel: () => setStartPressed(false),
		roomMode: (next) => {
			if (room.stage() === 'lobby') chooseMode(next)
			room.tellPhones()
		},
		gameMode: (next) => {
			if (room.stage() === 'lobby') setGameMode(next)
			room.tellPhones()
		},
		finish: () => {
			if (room.stage() === 'results' && info().repeats) toPodium()
		},
		lobby: () => {
			if (room.stage() === 'podium') toLobby()
		},
	})

	/** One timer at a time: the lobby's countdown, or the results'. */
	let timer: number | undefined
	const stopTimer = () => {
		window.clearInterval(timer)
		timer = undefined
	}
	onCleanup(stopTimer)

	// The Starter pressing Start: counting down to the first Round. Anyone
	// changing their mind, or the Starter stopping it, stops it.
	createEffect(() => {
		const stage = room.stage()
		if (stage !== 'lobby' && stage !== 'starting') return
		if (!startPressed() || !canStart()) {
			untrack(() => {
				stopTimer()
				setStartingIn(undefined)
				setStartPressed(false)
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
		setStartPressed(false)
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
					hat: hats.get(seat.id),
				},
			]
		})

	function roundDone(order: Racer[]) {
		for (const racer of order)
			if (racer.body.hat) hats.set(racer.id, racer.body.hat)
			else hats.delete(racer.id)
		const count = order.length
		const baby = gameMode() === 'baby'
		const placed = order.map(
			(racer, i): Placing => ({
				seatId: racer.id,
				place: i + 1,
				// A point for everyone they outlasted, and one more for getting
				// round the course.
				points: count - 1 - i + (racer.out === 'finished' ? 1 : 0),
				how:
					racer.out === 'finished'
						? 'finished'
						: // The last one standing, scooped or not since, won it.
							i === 0 && !baby
							? 'won'
							: (racer.out ?? 'running'),
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
		// The last of the go's courses: on to the Podium.
		if (lastCourse()) return toPodium()
		advance()
		startRound()
	}

	/** All done: the top three on the Podium, then back to the lobby. */
	function toPodium() {
		stopTimer()
		setPodium(room.everyone().map((seat) => ({ ...seat })))
		room.setStage('podium')
		setLobbyIn(PODIUM_SECONDS)
		timer = window.setInterval(() => {
			setLobbyIn(lobbyIn() - 1)
			if (lobbyIn() <= 0) toLobby()
		}, 1000)
	}

	function toLobby() {
		stopTimer()
		world = undefined
		stopStream()
		// A fresh shuffle for the next go, and a fresh start to its Standings.
		setCourses(coursesFor(mode(), roundNumber() ? courseIndex() : undefined))
		setCourseAt(0)
		setRoundNumber(0)
		hats.clear()
		setPodium(undefined)
		room.resetDeparted()
		for (const seat of room.seats)
			room.update(seat.id, (s) => {
				s.ready = false
				s.waiting = false
				s.points = 0
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
				status: placing.how === 'running' ? 'racing' : placing.how,
				place: placing.place,
				of: placings().length,
			}
		}
		if (room.stage() === 'podium') {
			const standings = standingsOf(podium() ?? room.everyone(), placings())
			const place = standings.findIndex((s) => s.id === seat.id) + 1
			if (!place) return undefined
			return {
				status: place === 1 ? 'won' : 'finished',
				place,
				of: standings.length,
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
						baby={gameMode() === 'baby'}
						number={number}
						of={roundsOf()}
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
								of={roundsOf()}
								course={COURSES[courseIndex()].name}
								next={nextText()}
								nextLabel={lastCourse() ? 'To the Podium' : 'Go now'}
								placings={placings()}
								seats={room.everyone()}
								baby={gameMode() === 'baby'}
								nextIn={nextIn()}
								onNext={nextRound}
								onFinish={info().repeats ? toPodium : undefined}
								onLobby={toLobby}
							/>
						</Match>
						<Match when={room.stage() === 'podium'}>
							<Podium
								title={info().label}
								rounds={roundNumber()}
								seats={podium() ?? room.everyone()}
								placings={placings()}
								lobbyIn={lobbyIn()}
								onLobby={toLobby}
								onEnd={end}
								controlsFor={room.controlsFor}
							/>
						</Match>
						<Match when={true}>
							<Lobby
								room={room}
								mode={mode()}
								onMode={chooseMode}
								gameMode={gameMode()}
								onGameMode={setGameMode}
								canStart={canStart()}
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
