import type { RoomMode } from './protocol'

/**
 * How a Room can go, as the lobby and the Starter's phone offer them. Kept
 * clear of the courses themselves, so a phone doesn't load them all for this.
 */
export const ROOM_MODES: { mode: RoomMode; label: string; note: string }[] = [
	{ mode: 'endless', label: 'Endless', note: 'Round and round' },
	{ mode: 'marathon', label: 'Marathon', note: 'Every course, once' },
	{ mode: 'half', label: 'Half Marathon', note: '5 at random' },
]
