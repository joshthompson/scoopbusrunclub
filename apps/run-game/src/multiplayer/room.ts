import { createSignal, onCleanup } from 'solid-js'
import { createStore, produce } from 'solid-js/store'
import { type Room, joinRoom } from 'trystero'
import { type CustomRunner, customRunners } from '../customRunners'
import {
	type Controls,
	NOTHING_HELD,
	gamepadControls,
	keyboardControls,
	touchControls,
	unpackControls,
} from '../input'
import { MEMBERS, type Playable, customPlayable } from '../playable'
import {
	APP_ID,
	type PadMessage,
	type PadMode,
	type PadView,
	type PlayerStatus,
	type RaceFrame,
	type RaceStart,
	type RoomStage,
	action,
	trysteroRoom,
} from './protocol'

/** At most this many Players in a Room. */
export const MAX_PLAYERS = 8

/** Players' colours, in the order seats get them. */
export const COLOURS = [
	'#e8423f',
	'#3f7fe8',
	'#f2c230',
	'#3fb950',
	'#a35de8',
	'#f28c28',
	'#ef6fb4',
	'#2fc6c0',
]

/**
 * How a Player plays: half of the Host's keyboard, one of its gamepads, its
 * touch screen (a phone hosting), or a phone of their own.
 */
export type SeatKind = 'wasd' | 'arrows' | 'gamepad' | 'touch' | 'phone'

/** A Player's place in the Room, kept from Round to Round. */
export interface Seat {
	id: string
	kind: SeatKind
	/** For a gamepad, which one. */
	gamepad?: number
	/** For a phone: the device, which gets the seat back if it drops out, and its trystero peer. */
	device?: string
	peer?: string
	/** For a phone: watching the big screen, or the race on the phone too. */
	mode?: PadMode
	colour: string
	/** Who they'll run as: a `Playable`'s id. */
	character?: string
	/** A phone's custom runner, which only it had until it picked it. */
	custom?: CustomRunner
	ready: boolean
	/** A phone that's dropped out, and when. Its seat's kept a while (see `LOST_SEAT_MS`). */
	lostAt?: number
	/** Their Standings: a point for each Player they've outlasted. */
	points: number
	/** Joined while a Round was on: in from the next. */
	waiting: boolean
}

/** How long a phone that drops out keeps its seat, for coming back. */
export const LOST_SEAT_MS = 60_000
/** How often phones are told what to show, even when nothing's changed. */
const VIEW_EVERY_MS = 250

/** Every member, then the Host's own custom runners: who a Local Player can be. */
export const localCharacters = (): Playable[] => [
	...customRunners().map(customPlayable).reverse(),
	...MEMBERS_BY_NAME,
]

export const MEMBERS_BY_NAME = [...MEMBERS].sort((a, b) =>
	a.name.localeCompare(b.name),
)

/** Who a seat's Player runs as, if they've picked. */
export function seatPlayable(seat: Seat): Playable | undefined {
	if (!seat.character) return undefined
	if (seat.custom) return { ...customPlayable(seat.custom), id: seat.character }
	return (
		MEMBERS.find((m) => m.id === seat.character) ??
		localCharacters().find((c) => c.id === seat.character)
	)
}

export const seatLabel = (seat: Seat) =>
	seat.kind === 'wasd'
		? 'WASD'
		: seat.kind === 'arrows'
			? '← ↑ →'
			: seat.kind === 'gamepad'
				? `Pad ${(seat.gamepad ?? 0) + 1}`
				: seat.kind === 'touch'
					? 'Touch'
					: seat.mode === 'remote'
						? 'Remote'
						: 'Phone'

/**
 * A Room, run by this device as its Host: who's in it, how they're playing,
 * and its Phone Controllers, over trystero. The Round itself is the Party's;
 * this only knows the seats, and tells phones what to show.
 */
export function createRoom(code: string) {
	const [seats, setSeats] = createStore<Seat[]>([])
	const [stage, setStage] = createSignal<RoomStage>('lobby')
	const [paused, setPaused] = createSignal(false)
	const [level, setLevel] = createSignal('')
	/** How each seat's doing in the Round, for their phone: the Party says. */
	let statusOf: (
		seat: Seat,
	) => { status: PlayerStatus; place?: number; of?: number } | undefined = () =>
		undefined

	/** What each phone's holding, as it last said. */
	const held = new Map<string, Controls>()

	const room: Room = joinRoom({ appId: APP_ID }, trysteroRoom(code))
	const view = action<PadView>(room, 'view')
	const pad = action<PadMessage>(room, 'pad')
	const input = action<number>(room, 'input')
	const race = action<RaceStart>(room, 'race')
	const frame = action<RaceFrame>(room, 'frame')
	/** Told when a phone starts watching on its own screen, to catch it up on the race. */
	let onWatch: (peer: string) => void = () => {}

	/** Phones playing remotely: the race is sent to them. Waiting ones too, to watch. */
	const watchers = () =>
		seats.flatMap((s) =>
			s.kind === 'phone' && s.mode === 'remote' && s.peer ? [s.peer] : [],
		)

	const seatOf = (peer: string) => seats.find((s) => s.peer === peer)
	const update = (id: string, change: (seat: Seat) => void) =>
		setSeats(
			(s) => s.id === id,
			produce((seat) => change(seat)),
		)

	const freeColour = () =>
		COLOURS.find((c) => !seats.some((s) => s.colour === c)) ?? COLOURS[0]

	/** Picked by anyone but `seat`. */
	const taken = (seat?: Seat) =>
		seats
			.filter((s) => s !== seat && s.character)
			.map((s) => s.character as string)

	function addSeat(
		seat: Omit<Seat, 'colour' | 'points' | 'ready' | 'waiting'>,
	) {
		if (seats.length >= MAX_PLAYERS) return undefined
		const added: Seat = {
			...seat,
			colour: freeColour(),
			points: 0,
			ready: false,
			waiting: stage() === 'round' || stage() === 'results',
		}
		setSeats(seats.length, added)
		return added
	}

	function removeSeat(id: string) {
		held.delete(id)
		setSeats((all) => all.filter((s) => s.id !== id))
	}

	/** `character` for `seat`, if nobody else has them. */
	function pick(id: string, character: string, custom?: CustomRunner) {
		const seat = seats.find((s) => s.id === id)
		if (!seat || taken(seat).includes(character)) return false
		update(id, (s) => {
			s.character = character
			s.custom = custom
			s.ready = false
		})
		return true
	}

	function setReady(id: string, ready: boolean) {
		update(id, (s) => {
			s.ready = ready && !!s.character
		})
	}

	pad.on((message, peer) => {
		if (message.type === 'hello') {
			const id = `phone:${message.device}`
			const back = seats.find((s) => s.id === id)
			if (back)
				update(id, (s) => {
					s.peer = peer
					s.lostAt = undefined
					s.mode = message.mode
				})
			else if (
				!addSeat({
					id,
					kind: 'phone',
					device: message.device,
					peer,
					mode: message.mode,
				})
			)
				void view.send(fullView(), peer)
			tellPhones()
			if (message.mode === 'remote' && seatOf(peer)) onWatch(peer)
			return
		}
		const seat = seatOf(peer)
		if (!seat) return
		if (message.type === 'pick') {
			// A custom runner's theirs: its id is the device's too, so two
			// phones' runners can't clash.
			const character = message.custom
				? `custom:${seat.device}:${message.custom.id}`
				: message.character
			pick(seat.id, character, message.custom)
		}
		if (message.type === 'mode') {
			update(seat.id, (s) => {
				s.mode = message.mode
			})
			if (message.mode === 'remote') onWatch(peer)
		}
		if (message.type === 'ready') setReady(seat.id, message.ready)
		if (message.type === 'leave') removeSeat(seat.id)
		tellPhones()
	})

	input.on((bits, peer) => {
		const seat = seatOf(peer)
		if (seat) held.set(seat.id, unpackControls(bits))
	})

	room.onPeerLeave((peer) => {
		const seat = seatOf(peer)
		if (!seat) return
		held.delete(seat.id)
		update(seat.id, (s) => {
			s.peer = undefined
			s.lostAt = Date.now()
		})
	})

	/** Gone too long: their seat's given up, unless a Round's on (see `dropLost`). */
	function dropLost(evenMidRound = false) {
		if (stage() === 'round' && !evenMidRound) return
		const now = Date.now()
		for (const seat of [...seats])
			if (seat.lostAt && now - seat.lostAt > LOST_SEAT_MS) removeSeat(seat.id)
	}

	const fullView = (): PadView => ({
		full: true,
		mode: 'controller',
		number: 0,
		colour: '#888',
		ready: false,
		taken: [],
		stage: stage(),
		status: 'picking',
		points: 0,
		paused: false,
		level: level(),
	})

	function viewFor(seat: Seat): PadView {
		const round = statusOf(seat)
		return {
			mode: seat.mode ?? 'controller',
			number: seats.indexOf(seat) + 1,
			colour: seat.colour,
			character: seat.character,
			ready: seat.ready,
			taken: taken(seat),
			stage: stage(),
			status:
				round?.status ??
				(!seat.character
					? 'picking'
					: seat.waiting
						? 'waiting'
						: seat.ready
							? 'ready'
							: 'picking'),
			place: round?.place,
			of: round?.of,
			points: seat.points,
			paused: paused(),
			level: level(),
		}
	}

	/** Every phone told what to show. */
	function tellPhones() {
		for (const seat of seats)
			if (seat.kind === 'phone' && seat.peer)
				void view.send(viewFor(seat), seat.peer)
	}
	const timer = window.setInterval(() => {
		dropLost()
		tellPhones()
	}, VIEW_EVERY_MS)

	function close() {
		window.clearInterval(timer)
		void room.leave()
	}
	onCleanup(close)

	/** What a seat's Player is holding, however they're playing. */
	function controlsFor(seat: Seat): () => Controls {
		switch (seat.kind) {
			case 'wasd':
			case 'arrows':
				return keyboardControls(seat.kind)
			case 'gamepad':
				return gamepadControls(seat.gamepad ?? 0)
			case 'touch':
				return touchControls
			case 'phone':
				return () => held.get(seat.id) ?? NOTHING_HELD
		}
	}

	return {
		code,
		seats,
		setSeats,
		update,
		stage,
		setStage(next: RoomStage) {
			setStage(next)
			tellPhones()
		},
		paused,
		setPaused(next: boolean) {
			setPaused(next)
			tellPhones()
		},
		level,
		setLevel,
		taken,
		addSeat,
		removeSeat,
		pick,
		setReady,
		dropLost,
		controlsFor,
		tellPhones,
		/** A Round's begun: told to every phone watching, or to `peer`, just started watching. */
		sendRace(start: RaceStart, peer?: string) {
			const to = peer ? [peer] : watchers()
			if (to.length) void race.send(start, to)
		},
		/** Where everything is in the Round, to every phone watching. */
		sendFrame(next: RaceFrame) {
			const to = watchers()
			if (to.length) void frame.send(next, to)
		},
		/** What to do when a phone starts watching. */
		setOnWatch(next: (peer: string) => void) {
			onWatch = next
		},
		/** Tells the Room how seats are doing in the Round, for their phones. */
		setStatusOf(next: typeof statusOf) {
			statusOf = next
		},
		close,
	}
}

export type HostRoom = ReturnType<typeof createRoom>
