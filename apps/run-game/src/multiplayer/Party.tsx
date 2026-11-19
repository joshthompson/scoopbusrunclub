import {
	type JSX,
	Match,
	Show,
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
import { effectsOn, musicOn, setEffectsOn, setMusicOn } from '../saved/settings'
import { play } from '../sfx'
import { MenuBackdrop } from '../ui/MenuBackdrop'
import { Stage } from '../ui/Stage'
import { CoursePick } from './CoursePick'
import { JoinBadge } from './JoinBadge'
import { Lobby } from './Lobby'
import { Podium } from './Podium'
import { type Placing, Results, standingsOf } from './Results'
import { Round } from './Round'
import {
	type GameMode,
	REACTIONS,
	type RoomMode,
	type ShownReaction,
	newRoomCode,
} from './protocol'
import {
	LiveReactionsLayer,
	MOST_REACTIONS,
	REACTION_GAP_MS,
	REACTION_TICKS,
	REACTION_TICK_MS,
} from './reactions'
import { type Seat, createRoom, seatPlayable } from './room'
import { roomModeInfo } from './roomModes'
import { type RaceStream, createRaceStream, raceStart } from './stream'

/**
 * How long the lobby counts down once everyone's ready, the results stay
 * up, and in Pick and Choose, whoever's picking has to pick the next
 * course. The Podium stays up as long as everyone likes.
 */
const START_SECONDS = 3
const RESULTS_SECONDS = 8
const CHOOSE_SECONDS = 20

/**
 * A countdown's last seconds said out loud, as a Round's are: a beep for
 * each of "3", "2", "1", and a higher one for "Go!" as it runs out.
 */
function sayCountdown(left: number) {
	if (left === 0) play('go')
	else if (left > 0 && left <= 3) play('count')
}

/** At least how many other courses are raced before one comes round again, from one shuffle to the next. */
const RESHUFFLE_GAP = 5

/**
 * Two Players at least, for a Round to be worth having: one on their own,
 * for trying it out, in development or with `?solo` on the link.
 */
const MIN_PLAYERS =
	import.meta.env.DEV || new URLSearchParams(location.search).has('solo')
		? 1
		: 2

/**
 * Every course, in a random order, but none of the `recent` ones (raced
 * lately, the latest last) till at least `RESHUFFLE_GAP` others have been
 * raced since it was: one shuffle following another, nobody's racing the
 * same course again straight away.
 */
function shuffledCourses(recent: number[] = []) {
	const order = COURSES.map((_, i) => i)
	for (let i = order.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[order[i], order[j]] = [order[j], order[i]]
	}
	/** How many have been raced since `course` was, if it has lately: none since, the last raced. */
	const since = (course: number) => {
		const at = recent.lastIndexOf(course)
		return at < 0 ? Number.POSITIVE_INFINITY : recent.length - 1 - at
	}
	const out: number[] = []
	while (order.length) {
		const ok = order.findIndex((c) => since(c) + out.length >= RESHUFFLE_GAP)
		// None of them can go here yet: the one raced longest ago, then.
		const at =
			ok >= 0
				? ok
				: order.reduce(
						(best, c, i) => (since(c) > since(order[best]) ? i : best),
						0,
					)
		out.push(...order.splice(at, 1))
	}
	return out
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
	/** Every course raced, in the order they were, the latest last: for the next shuffle to keep clear of. */
	const raced: number[] = []
	/** The courses for a go in `mode`: so many of them at random, or every one, shuffled. */
	const coursesFor = (mode: RoomMode) => {
		const all = shuffledCourses(raced)
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
	/**
	 * The shuffle after this one, going round again, made as soon as it's
	 * asked for, so what's next can be said before it's got to.
	 */
	let upcoming: number[] | undefined
	const nextShuffle = () => {
		upcoming ??= coursesFor(mode())
		return upcoming
	}
	/** Its courses chosen afresh: `next`, or a new shuffle. */
	const resetCourses = (next = coursesFor(mode())) => {
		upcoming = undefined
		setCourses(next)
		setCourseAt(0)
	}
	/** The course after this one: the next in the shuffle, or the first of the next shuffle. */
	const advance = () => {
		if (courseAt() + 1 < courses().length) setCourseAt(courseAt() + 1)
		else resetCourses(nextShuffle())
	}
	const nextCourseIndex = () =>
		courseAt() + 1 < courses().length
			? courses()[courseAt() + 1]
			: info().repeats
				? nextShuffle()[0]
				: undefined
	/** Pick and Choose: who picks each course, if it's that. */
	const picks = () => info().picks
	/** What's next, between Rounds. */
	const nextText = () => {
		if (picks()) return 'Next: someone picks the course'
		const next = nextCourseIndex()
		return lastCourse()
			? 'That was the last! The Podium'
			: next === undefined
				? 'Next: the Podium'
				: `Next: ${COURSES[next].name}`
	}
	/** The Starter choosing how the Room goes, in the lobby: its courses chosen afresh. */
	const chooseMode = (next: RoomMode) => {
		setMode(next)
		resetCourses()
	}
	const [roundNumber, setRoundNumber] = createSignal(0)
	/** The hat each seat's Player had on at the end of the last Round: still on for the next. */
	const hats = new Map<string, Hat>()
	const [startingIn, setStartingIn] = createSignal<number>()
	const [placings, setPlacings] = createSignal<Placing[]>([])
	const [nextIn, setNextIn] = createSignal(RESULTS_SECONDS)
	/** Pick and Choose: whose turn it is to pick the next course, by their seat's id; how long they've got; and which they're on. */
	const [chooser, setChooser] = createSignal<string>()
	const [chooseIn, setChooseIn] = createSignal(CHOOSE_SECONDS)
	const [cursor, setCursor] = createSignal(0)
	/** Who picked last, so someone at random picking isn't them again. */
	let lastChooser: string | undefined
	/** Pausing the Round on, or carrying on: the Round says how. */
	let pauseRound: ((paused: boolean) => void) | undefined
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
		setReactions([])
		stopStream()
		stream = createRaceStream(made, roundNumber(), room.sendFrame, reactions)
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
		podium: podium(),
		...(between() && reactions().length ? { reactions: reactions() } : {}),
	}))
	/** Pick and Choose: who's picking the next course, as everyone's shown. */
	const choosing = () => {
		const id = chooser()
		const seat = id && room.stage() === 'choosing' && seatById(id)
		if (!seat) return undefined
		return {
			seat: seat.id,
			number: room.seats.indexOf(seat) + 1,
			name: seatPlayable(seat)?.name ?? '',
			colour: seat.colour,
			secondsLeft: chooseIn(),
			cursor: cursor(),
			recent: raced.slice(-RESHUFFLE_GAP),
		}
	}
	const seatById = (id: string) => room.seats.find((s) => s.id === id)

	/** Reactions on their way up the screen, from whoever's watching the Round. */
	const [reactions, setReactions] = createSignal<ShownReaction[]>([])
	let reactionId = 0
	/** When each seat last sent one, so nobody fills the screen. */
	const reactedAt = new Map<string, number>()
	/** Between Rounds: the Standings up, or someone picking the next course. */
	const between = () =>
		room.stage() === 'results' || room.stage() === 'choosing'
	/**
	 * Who can send a reaction up the screen. In a Round, whoever's watching it
	 * and not in it: joined while it was on, or out of it while others race
	 * on; not once it's decided, while it's paused, or on its start screen.
	 * Between Rounds, anyone, but whoever's picking the next course.
	 */
	const watching = (seatId: string) => {
		if (between()) return seatId !== chooser()
		if (
			room.stage() !== 'round' ||
			!world ||
			world.order() ||
			room.paused() ||
			room.waitingForStarter() !== undefined
		)
			return false
		const racer = world.racers.find((r) => r.id === seatId)
		return !racer || !!racer.out
	}
	room.setCanReact(watching)
	room.setOnReact((seatId, reaction) => {
		const seat = seatById(seatId)
		if (!seat || !REACTIONS.includes(reaction)) return
		if (!watching(seatId)) return
		const now = Date.now()
		if (now - (reactedAt.get(seatId) ?? 0) < REACTION_GAP_MS) return
		reactedAt.set(seatId, now)
		// In a Round, by its ticks, so they stop with it when it's paused;
		// between Rounds, by the clock.
		const ticks =
			room.stage() === 'round' && world
				? world.ticks()
				: Math.floor(performance.now() / REACTION_TICK_MS)
		setReactions((shown) =>
			[
				...shown.filter((r) => ticks - r.born < REACTION_TICKS),
				{
					id: ++reactionId,
					reaction,
					colour: seat.colour,
					name: seat.name || seatPlayable(seat)?.name || '',
					born: ticks,
					across: Math.random(),
				},
			].slice(-MOST_REACTIONS),
		)
	})
	room.setChoosing(() => {
		const now = choosing()
		return now && { choosing: now, courses: COURSES.map((c) => c.name) }
	})
	room.setOnChoose((id, course) => {
		if (id === chooser() && COURSES[course]) choose(course)
	})
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
		next: () => {
			if (room.stage() === 'results') nextRound()
		},
		pause: (paused) => {
			if (room.stage() === 'round') pauseRound?.(paused)
		},
		menu: (item) => {
			if (room.stage() !== 'round') return
			if (item === 'effects') {
				setEffectsOn(!effectsOn())
				play('select')
			}
			if (item === 'music') setMusicOn(!musicOn())
			if (item === 'lobby') toLobby()
			if (item === 'end') end()
			room.tellPhones()
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
			sayCountdown(START_SECONDS)
			room.setStage('starting')
			timer = window.setInterval(() => {
				const left = (startingIn() ?? 1) - 1
				setStartingIn(left)
				sayCountdown(left)
				if (left <= 0) picks() ? toChoosing() : startRound()
			}, 1000)
		})
	})

	function startRound() {
		stopTimer()
		setStartingIn(undefined)
		setStartPressed(false)
		setChooser(undefined)
		raced.push(courseIndex())
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

	/** The Starter, who starts each Round from its start screen: see `Round`. */
	const starterNow = () => {
		const seat = room.starter()
		const runner = seat && seatPlayable(seat)
		if (!seat) return undefined
		return {
			number: room.seats.indexOf(seat) + 1,
			colour: seat.colour,
			name: runner?.name ?? '',
			controls: room.controlsFor(seat),
		}
	}

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
		// Between Rounds, by the clock: the Round's own are done with.
		setReactions([])
		world = undefined
		stopStream()
		room.setStage('results')
		setNextIn(RESULTS_SECONDS)
		stopTimer()
		timer = window.setInterval(() => {
			setNextIn(nextIn() - 1)
			sayCountdown(nextIn())
			if (nextIn() <= 0) nextRound()
		}, 1000)
	}

	function nextRound() {
		stopTimer()
		room.dropLost()
		if (picked().length < MIN_PLAYERS) return toLobby()
		// The last of the go's courses: on to the Podium.
		if (lastCourse()) return toPodium()
		if (picks()) return toChoosing()
		advance()
		startRound()
	}

	/**
	 * Pick and Choose: someone's turn to pick the next course, someone at
	 * random (someone new, if there's anyone else), with
	 * `CHOOSE_SECONDS` to. Out of time, it's one at random.
	 */
	function toChoosing() {
		stopTimer()
		setStartingIn(undefined)
		setStartPressed(false)
		const everyone = picked().filter((s) => !s.lostAt)
		const others = everyone.filter((s) => s.id !== lastChooser)
		const from = others.length ? others : everyone
		const seat = from[Math.floor(Math.random() * from.length)]
		if (!seat) return toLobby()
		lastChooser = seat.id
		setChooser(seat.id)
		setCursor(raced.length ? courseIndex() : 0)
		setChooseIn(CHOOSE_SECONDS)
		room.setStage('choosing')
		timer = window.setInterval(() => {
			setChooseIn(chooseIn() - 1)
			sayCountdown(chooseIn())
			room.tellPhones()
			if (chooseIn() > 0) return
			// Out of time: one at random, not the last one raced.
			const last = raced[raced.length - 1]
			const any = COURSES.map((_, i) => i).filter((i) => i !== last)
			choose(any[Math.floor(Math.random() * any.length)])
		}, 1000)
	}

	/** Pick and Choose: the next Round's course picked, and off it goes. */
	function choose(course: number) {
		if (room.stage() !== 'choosing') return
		resetCourses([course])
		startRound()
	}

	/** Whoever's picking, if they're at the big screen: their controls, to pick with. */
	const chooserControls = () => {
		const id = chooser()
		const seat = id ? seatById(id) : undefined
		return seat && seat.kind !== 'phone' ? room.controlsFor(seat) : undefined
	}

	/**
	 * All done: the top three on the Podium, everyone running about on it as
	 * long as they like, till the Host or the Starter goes back to the lobby.
	 */
	function toPodium() {
		stopTimer()
		// Each in the hat they finished the last Round in.
		setPodium(
			room.everyone().map((seat) => ({ ...seat, hat: hats.get(seat.id) })),
		)
		room.setStage('podium')
	}

	function toLobby() {
		stopTimer()
		world = undefined
		stopStream()
		// A fresh shuffle for the next go, and a fresh start to its Standings.
		resetCourses()
		setChooser(undefined)
		lastChooser = undefined
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
		room.end()
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
						starter={starterNow()}
						onWaiting={(waiting) =>
							room.setWaitingForStarter(
								waiting ? starterNow()?.number : undefined,
							)
						}
						onWorld={streamRound}
						onTick={() => stream?.tick()}
						reactions={reactions()}
						onPause={room.setPaused}
						pauseWith={(pause) => {
							pauseRound = pause
						}}
						onOver={roundDone}
						onLobby={toLobby}
						onEnd={end}
						corner={<JoinBadge code={room.code} />}
					/>
				)}
			</Match>
			<Match when={room.stage() !== 'round'}>
				<Stage>
					<MenuBackdrop />
					{/* The lobby shows how to join big; after it, in the corner. */}
					<Show when={room.stage() === 'results' || room.stage() === 'podium'}>
						<JoinBadge code={room.code} style={styles.corner} />
					</Show>
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
						<Match when={room.stage() === 'choosing' && choosing()}>
							{(now) => (
								<CoursePick
									choosing={now()}
									cursor={cursor()}
									onCursor={chooserControls() ? setCursor : undefined}
									onPick={chooserControls() ? choose : undefined}
									controls={chooserControls()}
								/>
							)}
						</Match>
						<Match when={room.stage() === 'podium'}>
							<Podium
								title={info().label}
								rounds={roundNumber()}
								seats={podium() ?? room.everyone()}
								placings={placings()}
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
					<Show when={between()}>
						<LiveReactionsLayer reactions={reactions()} />
					</Show>
				</Stage>
			</Match>
		</Switch>
	)
}

const styles = {
	/** How to join, in the top left corner, over whatever's on. */
	corner: {
		position: 'absolute',
		top: '10px',
		left: '10px',
		'z-index': 3,
	},
} satisfies Record<string, JSX.CSSProperties>
