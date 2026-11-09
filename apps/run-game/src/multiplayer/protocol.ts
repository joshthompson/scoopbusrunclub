import type { Room } from 'trystero'
import type { CustomRunner } from '../customRunners'

/**
 * What the Host and its Phone Controllers say to each other, over trystero.
 * A phone only ever sends its Player's controls and choices; the Host tells
 * it what to show. Nothing else is shared: the Host runs the only race.
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

/** The link a phone opens to be a Phone Controller in the Room. */
export const padLink = (code: string) =>
	`${location.origin}${import.meta.env.BASE_URL}?pad=${code}`

/** Phone → Host, on the `pad` action. Its controls go on `input`, as packed bits. */
export type PadMessage =
	/** Hello, or hello again: the same device gets the same seat back. */
	| { type: 'hello'; device: string }
	/** Who they'll run as. A custom runner comes with its look, which only the phone has. */
	| { type: 'pick'; character: string; custom?: CustomRunner }
	| { type: 'ready'; ready: boolean }
	| { type: 'leave' }

/**
 * Where the Room's got to:
 * - `lobby`: Players joining, and picking who they'll be
 * - `starting`: everyone's ready, and the first Round's about to start
 * - `round`: a Round's on
 * - `results`: between Rounds, the Standings up
 */
export type RoomStage = 'lobby' | 'starting' | 'round' | 'results'

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
	| 'finished'
	| 'won'

/** Host → Phone, on the `view` action: everything its screen shows. */
export interface PadView {
	/** The Room's full: there's no seat for them. */
	full?: boolean
	/** Their Player number, from 1, and colour. */
	number: number
	colour: string
	character?: string
	ready: boolean
	/** Who's been picked by someone else. */
	taken: string[]
	stage: RoomStage
	status: PlayerStatus
	/** In the last Round, out of how many. */
	place?: number
	of?: number
	/** Their Standings. */
	points: number
	paused: boolean
	level: string
}

/**
 * One of a Room's kinds of message, typed: trystero's own types only take
 * plain JSON, which interfaces like these don't satisfy, though they are.
 */
export function action<T>(room: Room, name: string) {
	const [send, receive] = room.makeAction(name)
	return {
		send: (data: T, to?: string) => send(data as never, to),
		on: (handle: (data: T, peer: string) => void) =>
			receive((data, peer) => handle(data as T, peer)),
	}
}
