import type { GameMode, RoomMode } from './protocol'

/** One way a Room can go, as the lobby and the Starter's phone offer it. */
export interface RoomModeInfo {
	mode: RoomMode
	label: string
	/** How long it is, in a word or two, on the big screen. */
	note: string
	/** How long it is and what it's like, for the Starter choosing on their phone: so, to them. */
	about: string
	/** How many courses it's raced over, at random; every one, if not said. */
	courses?: number
	/** Whether it goes round again after every course, till it's called. */
	repeats?: boolean
	/**
	 * Pick and Choose: each Round's course picked before it, rather than
	 * shuffled, by the Starter, or someone at random, someone new each time.
	 */
	picks?: 'starter' | 'random'
}

/**
 * How a Room can go, shortest first. Kept clear of the courses themselves,
 * so a phone doesn't load them all for this.
 */
export const ROOM_MODES: RoomModeInfo[] = [
	{
		mode: 'parkrun',
		label: 'parkrun',
		note: '5 courses',
		about: '5 courses · a quick one',
		courses: 5,
	},
	{
		mode: 'half',
		label: 'Half Marathon',
		note: '10 courses',
		about: '10 courses · a good long go',
		courses: 10,
	},
	{
		mode: 'marathon',
		label: 'Marathon',
		note: 'Every course',
		about: 'Every course, once each',
	},
	{
		mode: 'backyard',
		label: 'Backyard Ultra',
		note: 'As long as you can go',
		about: 'Every course, round and round, till you call it',
		repeats: true,
	},
	{
		mode: 'pick',
		label: 'Pick and Choose',
		note: 'P1 picks each course',
		about: 'You pick each course, as long as you like',
		repeats: true,
		picks: 'starter',
	},
	{
		mode: 'pickAny',
		label: 'Pick and Choose',
		note: 'Anyone picks: turns at random',
		about: 'Someone at random picks each course, as long as you like',
		repeats: true,
		picks: 'random',
	},
]

export const roomModeInfo = (mode: RoomMode) =>
	ROOM_MODES.find((m) => m.mode === mode) ?? ROOM_MODES[0]

/** One way a Room's Rounds can be raced, as the lobby and the Starter's phone offer it. */
export interface GameModeInfo {
	mode: GameMode
	label: string
	/** What it's like, in a few words, on the big screen. */
	note: string
	/** What it's like, for the Starter choosing on their phone. */
	about: string
}

export const GAME_MODES: GameModeInfo[] = [
	{
		mode: 'scoop',
		label: 'Scoop Mode',
		note: 'The bus is coming',
		about: 'The bus is coming: last one standing wins',
	},
	{
		mode: 'baby',
		label: 'Baby Mode',
		note: 'No bus, no falling out',
		about: 'No bus, and nobody’s out: first over the line wins',
	},
]

export const gameModeInfo = (mode: GameMode) =>
	GAME_MODES.find((m) => m.mode === mode) ?? GAME_MODES[0]
