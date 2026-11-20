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
import type { Hat } from '../game/hats'
import type { Racer, RacerEntry, World } from '../game/world'
import { playableBy } from '../minigames'
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
	PLAYS,
	RACES,
	minigamesFor,
	playName,
	playTuneOf,
	poolFor,
} from './plays'
import {
	type Choosing,
	type GameMode,
	REACTIONS,
	type RoomMode,
	type RoundKind,
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
import { keepScreenAwake } from './wakeLock'

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
 * Every one of `pool` (courses, minigames: see `PLAYS`), in a random order,
 * but none of the `recent` ones (played lately, the latest last) till at
 * least `RESHUFFLE_GAP` others have been since it was: one shuffle
 * following another, nobody's racing the same course again straight away.
 * Fewer in the pool than that, as long as can be.
 */
function shuffled(pool: number[], recent: number[] = []) {
	const order = [...pool]
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
		const gap = Math.min(RESHUFFLE_GAP, pool.length - 1)
		const ok = order.findIndex((c) => since(c) + out.length >= gap)
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
 * The Rounds for a go: courses, minigames (those `players` can play), or a
 * race then a minigame, by turns, as `kind` says; so many of them, as
 * `mode` says, or every course (every minigame, in a go of only them).
 * Minigames go round again, as many times as it takes, there being fewer.
 */
function lineUpFor(
	kind: RoundKind,
	mode: RoomMode,
	players: number,
	recent: number[],
) {
	const count = roomModeInfo(mode).courses
	const races = shuffled(RACES, recent)
	const games = minigamesFor(players)
	const sized = (all: number[]) => (count ? all.slice(0, count) : all)
	if (kind === 'races') return sized(races)
	if (!games.length) return kind === 'mixup' ? sized(races) : []
	/** The next minigame, a fresh shuffle of them each time they've all been. */
	let deck: number[] = []
	const out: number[] = []
	const nextGame = () => {
		if (!deck.length) deck = shuffled(games, [...recent, ...out])
		return deck.shift() as number
	}
	if (kind === 'minigames') {
		if (!count) return shuffled(games, recent)
		while (out.length < count) out.push(nextGame())
		return out
	}
	for (const race of races) out.push(race, nextGame())
	return sized(out)
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
	// The big screen, kept awake: everyone's playing on their phones, and
	// nobody touches it for a whole Round, or the Standings.
	keepScreenAwake()
	/** Everyone who's picked who they'll be, and hasn't dropped out. */
	const picked = () => room.seats.filter((s) => s.character && !s.lostAt)
	const [mode, setMode] = createSignal<RoomMode>('backyard')
	/** How its Rounds are raced: with the bus, or in Baby Mode. */
	const [gameMode, setGameMode] = createSignal<GameMode>('scoop')
	/** What its Rounds are: races, minigames, or both by turns. */
	const [roundKind, setRoundKind] = createSignal<RoundKind>('races')
	const info = () => roomModeInfo(mode())
	/** Every course raced, in the order they were, the latest last: for the next shuffle to keep clear of. */
	const raced: number[] = []
	/**
	 * How many times each course has been raced this go, by its index:
	 * shown as they're picked from, in Pick and Choose, and one at random
	 * is one of the least raced. Afresh in the lobby.
	 */
	let played = PLAYS.map(() => 0)
	/**
	 * The Rounds for a go in `mode`, as `roundKind` says: so many of them at
	 * random, or every one, shuffled. By their place in `PLAYS`.
	 */
	const coursesFor = (mode: RoomMode, recent = raced) =>
		lineUpFor(roundKind(), mode, Math.max(1, untrack(picked).length), recent)
	const [courses, setCourses] = createSignal(coursesFor(mode()))
	/** How far through `courses` the Room's got. */
	const [courseAt, setCourseAt] = createSignal(0)
	/** The Round on, or next: a course, or a minigame. By its place in `PLAYS`. */
	const courseIndex = () => courses()[courseAt()] ?? RACES[0]
	const current = () => PLAYS[courseIndex()]
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
		// What's left of this one counts as raced already: it's asked for
		// as soon as the last of it's next, before it's been raced, and
		// would otherwise come round again straight after it.
		upcoming ??= coursesFor(mode(), [
			...raced,
			...untrack(courses).slice(untrack(courseAt)),
		])
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
		if (picks()) {
			const id = chooser()
			const seat = id ? seatById(id) : undefined
			const who = seat
				? seatPlayable(seat)?.name || `P${room.seats.indexOf(seat) + 1}`
				: undefined
			const ahead = pickedAhead()
			if (who && ahead !== undefined)
				return `Next: ${playName(PLAYS[ahead])} (${who}’s pick)`
			return who
				? `Next: ${who} picks the course`
				: 'Next: someone picks the course'
		}
		const next = nextCourseIndex()
		return lastCourse()
			? 'That was the last! The Podium'
			: next === undefined
				? 'Next: the Podium'
				: `Next: ${playName(PLAYS[next])}`
	}
	/** The Starter choosing how the Room goes, in the lobby: its courses chosen afresh. */
	const chooseMode = (next: RoomMode) => {
		setMode(next)
		resetCourses()
	}
	/** And what its Rounds are. */
	const chooseRoundKind = (next: RoundKind) => {
		setRoundKind(next)
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
	/**
	 * Pick and Choose: the next course, picked ahead by whoever's picking it
	 * (who's known from the start of the Round before), on their phone, as
	 * soon as they're done with that Round: out of it, over the line, or it's
	 * over. Theirs to change till the next Round starts.
	 */
	const [pickedAhead, setPickedAhead] = createSignal<number>()
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

	createEffect(() => room.setCourse(current().course.name))
	// The course's tune through its Round and its results; in the lobby, the
	// menus', till a course has been run, then whatever was last on.
	createEffect(() => {
		const stage = room.stage()
		if (stage === 'round' || stage === 'results')
			playTune(playTuneOf(current()))
		else playMenu()
	})

	/** Nothing to play: minigames only, and none for this many Players. */
	const nothingToPlay = () => poolFor(roundKind(), picked().length).length === 0
	/**
	 * Everyone but the Starter who's picked is ready, and so the Starter can
	 * start it: pressing Start is their being ready.
	 */
	const canStart = createMemo(() => {
		const starter = room.starter()
		return (
			!!starter?.character &&
			picked().length >= MIN_PLAYERS &&
			!nothingToPlay() &&
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
		if (nothingToPlay())
			return `No minigames for ${picked().length} Players: pick Races or Mixup`
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
		roundKind: roundKind(),
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
	/**
	 * Pick and Choose: whether whoever's picking the next course can pick it
	 * ahead, now, on their phone: done with the Round (out of it, over the
	 * line, or sat out), or it's over, the Standings up. At the big screen,
	 * the race is on it, so they pick once it's done with, as before.
	 */
	const canPickAhead = () => {
		const id = chooser()
		const seat = id ? seatById(id) : undefined
		if (!picks() || !seat || seat.kind !== 'phone' || seat.screen) return false
		const stage = room.stage()
		if (stage === 'results') return true
		if (stage !== 'round' || !world) return false
		const racer = world.racers.find((r) => r.id === seat.id)
		return (
			!racer || !!racer.out || !!world.minigame?.out(racer) || !!world.order()
		)
	}
	/** Pick and Choose: who's picking the next course, as everyone's shown. */
	const choosing = (): Choosing | undefined => {
		const id = chooser()
		const seat = id ? seatById(id) : undefined
		if (!seat) return undefined
		const now = room.stage() === 'choosing'
		if (!now && !canPickAhead()) return undefined
		return {
			seat: seat.id,
			number: room.seats.indexOf(seat) + 1,
			name: seatPlayable(seat)?.name ?? '',
			colour: seat.colour,
			...(now ? { secondsLeft: chooseIn() } : { ahead: true }),
			cursor: cursor(),
			played: [...played],
			pool: pickable(),
			...(!now && pickedAhead() !== undefined ? { picked: pickedAhead() } : {}),
		}
	}
	const seatById = (id: string) => room.seats.find((s) => s.id === id)
	/** Pick and Choose: what can be picked, as the Room's set, for however many are playing. */
	const pickable = () => poolFor(roundKind(), Math.max(1, picked().length))

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
		return !racer || !!racer.out || !!world.minigame?.out(racer)
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
		return now && { choosing: now, courses: PLAYS.map(playName) }
	})
	room.setOnChoose((id, course) => {
		if (id !== chooser() || !pickable().includes(course)) return
		if (room.stage() === 'choosing') choose(course)
		else if (canPickAhead()) setPickedAhead(course)
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
		roundKind: (next) => {
			if (room.stage() === 'lobby') chooseRoundKind(next)
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
		fitPlayers()
		raced.push(courseIndex())
		played[courseIndex()]++
		setPickedAhead(undefined)
		// Anyone who's still picking sits this one out.
		for (const seat of room.seats)
			room.update(seat.id, (s) => {
				s.waiting = !seatPlayable(s)
			})
		room.setPaused(false)
		room.setCourse(current().course.name)
		room.setMinigame(current().minigame?.name)
		// Pick and Choose: who picks the next one, known now, so they can
		// as soon as they're done with this one.
		setChooser(picks() ? nextChooser()?.id : undefined)
		setRoundNumber(roundNumber() + 1)
		room.setStage('round')
	}

	/**
	 * A minigame for fewer Players than are playing it now, someone having
	 * joined since it was lined up: another in its place, one they can, or
	 * if there's none, a course.
	 */
	function fitPlayers() {
		const { minigame } = current()
		const players = room.seats.filter((s) => seatPlayable(s)).length
		if (!minigame || playableBy(minigame, players)) return
		const instead = minigamesFor(players)
		const from = instead.length ? instead : RACES
		const next = [...courses()]
		next[courseAt()] = from[Math.floor(Math.random() * from.length)]
		setCourses(next)
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
		const game = world?.minigame
		// The hat they finished in, on for the next Round. Not a minigame's:
		// they go back into whatever they had on before it.
		if (!game)
			for (const racer of order)
				if (racer.body.hat) hats.set(racer.id, racer.body.hat)
				else hats.delete(racer.id)
		const count = order.length
		const baby = gameMode() === 'baby'
		const placed = order.map((racer, i): Placing => {
			// A minigame: a point for everyone they beat, and one more for
			// doing all there was to do in it.
			// Places shared, in a team game: a point for everyone placed
			// behind them.
			if (game) {
				const place = game.placeOf?.(racer) ?? i + 1
				const behind = game.placeOf
					? order.filter((o) => (game.placeOf?.(o) ?? 0) > place).length
					: count - 1 - i
				return {
					seatId: racer.id,
					place,
					points: behind + (game.done(racer) ? 1 : 0),
					how: place === 1 ? 'won' : 'played',
					note: game.note(racer),
				}
			}
			return {
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
			}
		})
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
		if (picks()) {
			// Picked ahead: straight on to it.
			const ahead = pickedAhead()
			const id = chooser()
			if (ahead === undefined || !id || !picked().some((s) => s.id === id))
				return toChoosing()
			lastChooser = id
			resetCourses([ahead])
			return startRound()
		}
		advance()
		startRound()
	}

	/** Pick and Choose: who picks next, someone at random (someone new, if there's anyone else). */
	function nextChooser() {
		const everyone = picked().filter((s) => !s.lostAt)
		const others = everyone.filter((s) => s.id !== lastChooser)
		const from = others.length ? others : everyone
		return from[Math.floor(Math.random() * from.length)]
	}

	/**
	 * Pick and Choose: someone's turn to pick the next course, whoever was
	 * told they're next at the start of the last Round, if they're still
	 * here, or someone at random, with `CHOOSE_SECONDS` to. Out of time,
	 * it's one at random of the least raced.
	 */
	function toChoosing() {
		stopTimer()
		setStartingIn(undefined)
		setStartPressed(false)
		const next = chooser()
		const seat =
			picked().find((s) => s.id === next && !s.lostAt) ?? nextChooser()
		if (!seat) return toLobby()
		lastChooser = seat.id
		setChooser(seat.id)
		const pool = pickable()
		setCursor(pool.includes(courseIndex()) ? courseIndex() : pool[0])
		setChooseIn(CHOOSE_SECONDS)
		room.setStage('choosing')
		timer = window.setInterval(() => {
			setChooseIn(chooseIn() - 1)
			sayCountdown(chooseIn())
			room.tellPhones()
			if (chooseIn() > 0) return
			choose(leastRaced())
		}, 1000)
	}

	/**
	 * Pick and Choose, a course at random: one of those raced the fewest
	 * times this go, and not the last one raced, if there's another.
	 */
	function leastRaced() {
		const last = raced[raced.length - 1]
		const pool = pickable()
		const fewest = Math.min(...pool.map((i) => played[i]))
		const least = pool.filter((i) => played[i] === fewest)
		const fresh = least.filter((i) => i !== last)
		const from = fresh.length ? fresh : least
		return from[Math.floor(Math.random() * from.length)]
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
		setPickedAhead(undefined)
		lastChooser = undefined
		played = PLAYS.map(() => 0)
		setRoundNumber(0)
		room.setMinigame(undefined)
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
			const place = order
				? (world.minigame?.placeOf?.(racer) ?? order.indexOf(racer) + 1)
				: undefined
			return {
				status:
					racer.out === 'scooped' || racer.out === 'fallen'
						? racer.out
						: racer.out === 'finished'
							? 'finished'
							: // A minigame decided: only its winner won it.
								order && world.minigame && place !== 1
								? 'finished'
								: order
									? 'won'
									: world.minigame?.out(racer)
										? 'out'
										: 'racing',
				place,
				of: world.racers.length,
			}
		}
		if (room.stage() === 'results') {
			const placing = placings().find((p) => p.seatId === seat.id)
			if (!placing) return undefined
			return {
				status:
					placing.how === 'running'
						? 'racing'
						: placing.how === 'played'
							? 'finished'
							: placing.how,
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
						course={current().course}
						minigame={current().minigame}
						baby={gameMode() === 'baby' && !current().minigame}
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
								course={current().course.name}
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
								roundKind={roundKind()}
								onRoundKind={chooseRoundKind}
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
