import type { Room } from 'trystero'
import type { Phase } from '../game/world'
import type { CustomRunner } from '../runners/customRunners'
import type { Avatar } from '../runners/looks'
import type { Sound } from '../sfx'
import type { Placing } from './Results'
import type { Seat } from './room'

/**
 * What the Host and the phones in its Room say to each other, over trystero.
 * A phone only ever sends its Player's controls and choices; the Host tells
 * it what to show, and a phone playing remotely, the race itself. The Host
 * runs the only race (see docs/adr/0001-host-sends-state-not-inputs.md).
 */

/** The same as the 3D game's, so both games' Rooms are one family. */
export const APP_ID = 'scoopbus-run-club'

/** A Room's trystero room: its code, kept apart from the 3D game's. */
export const trysteroRoom = (code: string) => `run-game:${code}`

/** Room Codes: no I, L, O or 0 and 1, which get mixed up read off a screen. */
const CODE_LETTERS = 'ABCDEFGHJKMNPQRSTUVWXYZ'
export const CODE_LENGTH = 4

export function newRoomCode() {
	let code = ''
	for (let i = 0; i < CODE_LENGTH; i++)
		code += CODE_LETTERS[Math.floor(Math.random() * CODE_LETTERS.length)]
	return code
}

/** Tidied up as typed: upper case, and nothing that can't be in one. */
export const cleanCode = (typed: string) =>
	typed
		.toUpperCase()
		.split('')
		.filter((char) => CODE_LETTERS.includes(char))
		.join('')
		.slice(0, CODE_LENGTH)

/**
 * The link a phone opens to join the Room: this page's, or under
 * `pnpm dev:phones`, this computer's on the local network, so the Host can be
 * on localhost and phones still reach it.
 */
export const padLink = (code: string) =>
	`${import.meta.env.VITE_PHONE_ORIGIN ?? location.origin}${import.meta.env.BASE_URL}?pad=${code}`

/** The Room Code in a scanned QR code: a Room's link, or just the code. */
export function codeFromScan(text: string) {
	try {
		const code = new URL(text).searchParams.get('pad')
		if (code) return cleanCode(code)
	} catch {
		// Not a link.
	}
	const code = cleanCode(text.trim())
	return code.length === CODE_LENGTH ? code : ''
}

/**
 * How a phone plays:
 * - `controller`: a Phone Controller, the race on the big screen
 * - `remote`: a Remote Player, the race on the phone too
 */
export type PadMode = 'controller' | 'remote'

/**
 * How a Room goes, as its Starter chooses in the lobby. Its courses are
 * always chosen at random, and shuffled:
 * - `parkrun`: five of them
 * - `half`: a Half Marathon, ten of them
 * - `marathon`: every course, once
 * - `backyard`: a Backyard Ultra, every course and round again, till the
 *   Starter (or the Host) calls it after a Round
 */
export type RoomMode = 'parkrun' | 'half' | 'marathon' | 'backyard'

/** Phone → Host, on the `pad` action. Its controls go on `input`, as packed bits. */
export type PadMessage =
	/**
	 * Hello, or hello again: the same device gets the same seat back.
	 * `screen`: a computer, showing the Room just as the Host does, so it's
	 * sent the whole Room (see `RoomView`), not just its own Player.
	 */
	| { type: 'hello'; device: string; mode: PadMode; screen?: boolean }
	/** Switching between playing on the big screen and on the phone. */
	| { type: 'mode'; mode: PadMode }
	/** Who they'll run as. A custom runner comes with its look, which only the phone has. */
	| { type: 'pick'; character: string; custom?: CustomRunner }
	| { type: 'ready'; ready: boolean }
	| { type: 'leave' }
	/** The Starter, choosing how the Room goes. */
	| { type: 'roomMode'; mode: RoomMode }
	/** The Starter, starting the first Round. */
	| { type: 'start' }
	/** The Starter, stopping the countdown to it. */
	| { type: 'cancel' }
	/** The Starter, between Rounds of a Backyard Ultra: that's enough, to the Podium. */
	| { type: 'finish' }
	/** The Starter, at the Podium: back to the lobby for another go. */
	| { type: 'lobby' }

/**
 * Where the Room's got to:
 * - `lobby`: Players joining, and picking who they'll be
 * - `starting`: everyone's ready, and the first Round's about to start
 * - `round`: a Round's on
 * - `results`: between Rounds, the Standings up
 * - `podium`: all done, the top three on the Podium
 */
export type RoomStage = 'lobby' | 'starting' | 'round' | 'results' | 'podium'

/**
 * How a Player's doing, for their phone:
 * - `picking`: hasn't picked who they'll be yet
 * - `waiting`: joined while a Round was on, and in from the next
 */
export type PlayerStatus =
	| 'picking'
	| 'waiting'
	| 'ready'
	| 'racing'
	| 'scooped'
	| 'fallen'
	| 'finished'
	| 'won'

/** Host → Phone, on the `view` action: everything its screen shows, but the race. */
export interface PadView {
	/** The Room's full: there's no seat for them. */
	full?: boolean
	mode: PadMode
	/** Their Player number, from 1, and colour. */
	number: number
	colour: string
	character?: string
	ready: boolean
	/** Who's been picked by someone else. */
	taken: string[]
	stage: RoomStage
	status: PlayerStatus
	/** In the last Round, out of how many; at the Podium, overall. */
	place?: number
	of?: number
	/** Their Standings. */
	points: number
	paused: boolean
	course: string
	/** How the Room's set to go, for everyone to see. */
	roomMode: RoomMode
	/** Whether they're the Starter, whatever the stage. */
	isStarter: boolean
	/** Which Round the Room's on, or just had, and out of how many, unless it's a Backyard Ultra. */
	round: number
	rounds?: number
	/**
	 * In the lobby, if they're the Starter: how the Room's set to go, and
	 * whether it can start yet, and if not, why.
	 */
	starter?: { roomMode: RoomMode; canStart: boolean; why: string }
	/** If someone else is the Starter, their Player number. */
	starterNumber?: number
	/** Joined from a computer: the whole Room, to show it as the Host does. */
	room?: RoomView
}

/**
 * Everything the Host's own screens show, but the race and how to join:
 * for a computer that's joined, to show the same.
 */
export interface RoomView {
	/** Everyone in the Room, in seat order: all but which device and peer they are. */
	seats: Seat[]
	/** The Starter's seat. */
	starter?: string
	canStart: boolean
	/** Seconds until the first Round, once the Starter's started it. */
	startingIn?: number
	/** Why it isn't starting yet. */
	waitingFor: string
	/** The last Round's. */
	placings: Placing[]
	/** Between Rounds: what's next, and in how long. */
	next: string
	nextIn: number
	/** At the Podium: how long till it's back to the lobby. */
	lobbyIn: number
}

/**
 * One of a Room's kinds of message, typed: trystero's own types only take
 * plain JSON, which interfaces like these don't satisfy, though they are.
 */
export function action<T>(room: Room, name: string) {
	const [send, receive] = room.makeAction(name)
	return {
		send: (data: T, to?: string | string[]) => send(data as never, to),
		on: (handle: (data: T, peer: string) => void) =>
			receive((data, peer) => handle(data as T, peer)),
	}
}

/** A racer in a Round, for a remote phone to draw them. */
export interface RacerIntro {
	id: string
	/** A `Playable`'s id, and a custom runner's look, which the phone may not have. */
	character: string
	custom?: CustomRunner
	colour: string
	number: number
}

/** Someone in the pack: a club member, one of its guests, or anyone with a look. */
export interface PacerIntro {
	id: number
	name: string
	member?: string
	guest?: string
	look?: Avatar
	skeleton?: boolean
}

/**
 * Host → remote phones, on the `race` action: a Round's begun (or a phone's
 * joined it part way), and what it needs to draw it. The frames follow.
 */
export interface RaceStart {
	round: number
	/** The course's id. */
	course: string
	racers: RacerIntro[]
	/** Who's in the pack so far. Anyone joining later comes in a frame. */
	pack: PacerIntro[]
}

/** [x, feetY, vx, flags (see `RACER_FLAGS`), stumble, spin, out (0 running, 1 scooped, 2 finished, 3 fallen), outAt] */
export type RacerState = [
	number,
	number,
	number,
	number,
	number,
	number,
	number,
	number,
]
export const RACER_FLAGS = {
	grounded: 1,
	ducking: 2,
	mounted: 4,
	left: 8,
	carried: 16,
	/** Stood on a Platform, which is flat, rather than on the Ground. */
	platform: 32,
	/** Squashed by a furby. */
	squashed: 64,
	/** On a glider. */
	gliding: 128,
}
/** The Pumpkin a racer's wearing, by its carving, is the flags over this. */
export const PUMPKIN_FLAG = 256
/** [id, x, feetY, vx, flags (1 grounded, 2 scooped, 4 gliding), dazed, spin] */
export type PacerState = [
	number,
	number,
	number,
	number,
	number,
	number,
	number,
]
/** [x, feetY, facing, state, spin, landed, timer] */
export type FurbyStateFrame = [
	number,
	number,
	number,
	number,
	number,
	number,
	number,
]
/** [x, feetY, facing, state, barking, spin, rare (1 if it's the rarer one)] */
export type CorgiStateFrame = [
	number,
	number,
	number,
	number,
	number,
	number,
	number,
]
/** [id, x, feetY, state (0 flying, 1 carrying, 2 leaving)] */
export type FlyerFrame = [number, number, number, number]
/**
 * [index, used, flown (-1 if not), scooped at (-1 if not), scooped vx,
 * scooped where (a Zombie's), the rest flown (a gaggle's)]
 */
export type ObstacleFrame = [
	number,
	number,
	number,
	number,
	number,
	number?,
	number?,
]
/** [index, used, cheering, cheered] */
export type BoostFrame = [number, number, number, string]

/**
 * Host → remote phones, on the `frame` action, every other tick: where
 * everything is. Only what can be seen changing: the course itself the phone
 * already has.
 */
export interface RaceFrame {
	round: number
	ticks: number
	raceTicks: number
	phase: Phase
	camera: number
	/** How far up the camera's looking. */
	cameraY: number
	zoom: number
	/** [front, scooping, the Scoop Arm's reach] */
	bus: [number, number, number]
	/** In the same order as the `RaceStart`'s. */
	racers: RacerState[]
	pack: PacerState[]
	/** Who's joined the pack since the last frame. */
	joined: PacerIntro[]
	furbies: FurbyStateFrame[]
	corgis: CorgiStateFrame[]
	/** Geese flying over. */
	flyers: FlyerFrame[]
	/** Every obstacle that's been used, scooped or flown off. */
	obstacles: ObstacleFrame[]
	/** Every boost that's been had or is cheering. */
	boosts: BoostFrame[]
	popups: { id: number; text: string; x: number; y: number; born: number }[]
	/** Racers' ids in the order they came, once the Round's decided. */
	order?: string[]
	/** What was heard since the last frame. */
	sounds: Sound[]
}
