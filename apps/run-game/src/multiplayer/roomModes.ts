import type { RoomMode } from './protocol'

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
		note: 'Till you call it',
		about: 'Every course, round and round, till you call it',
		repeats: true,
	},
]

export const roomModeInfo = (mode: RoomMode) =>
	ROOM_MODES.find((m) => m.mode === mode) ?? ROOM_MODES[0]
