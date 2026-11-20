import { TICK_MS } from '../game/constants'

/** Ticks as a clock: "0:42". Rounded to whole ticks first, so a minute's not "1:01". */
export function clock(ticks: number, round: 'up' | 'down' = 'up') {
	const ms = Math.round(ticks * TICK_MS)
	const seconds = round === 'up' ? Math.ceil(ms / 1000) : Math.floor(ms / 1000)
	return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
