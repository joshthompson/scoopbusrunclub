import { DEPTH_SLANT, PATH_BACK, PATH_FRONT } from '../../game/constants'
import { paintedArt } from './pixelArt'

/**
 * City Rooftop's air vents: a roof's air-conditioning unit, a squat metal
 * box right across the path, to jump. Its front, louvred, just in from the
 * path's near edge; its top going back most of the way across, at the slant
 * everything going back is drawn at (`DEPTH_SLANT` along for the path's
 * depth up), a fan's grille in it; and its side in shade. Drawn a pixel a
 * cell, for an Obstacle at twice that. At the path's middle, where
 * everyone runs, it's as wide and as high as what's run into.
 */

const LIT = '#cfd3db'
const TOP = '#b4b8c2'
const FRONT = '#8c919c'
const SIDE = '#6d727c'
const SHADE = '#5a5e67'
const SLAT = '#4a4e57'

/** Its front, how wide and how tall. */
const FRONT_WIDTH = 18
const FRONT_HEIGHT = 13
/**
 * How deep it is, up, in cells: a little short of the path's depth, so its
 * foot's in from the roof's front edge; and how far along it leans going
 * back that deep, at the slant everything does.
 */
const DEPTH = 12
const SLANT = Math.round((DEPTH * DEPTH_SLANT) / (PATH_BACK + PATH_FRONT))
/** How far in front of the line everyone runs along its foot is, in px: half its depth. */
export const ROOFTOP_VENT_FRONT = DEPTH

export const ROOFTOP_VENT_WIDTH = FRONT_WIDTH + SLANT
export const ROOFTOP_VENT_HEIGHT = FRONT_HEIGHT + DEPTH

export const rooftopVent = paintedArt(
	ROOFTOP_VENT_WIDTH,
	ROOFTOP_VENT_HEIGHT,
	(px, py) => {
		// Its cell, from the middle of it that `paintedArt` asks about.
		const x = Math.floor(px)
		const y = Math.floor(py)
		// Its front: a lip in shade under its top, louvres, and a dark foot.
		if (py >= DEPTH && px < FRONT_WIDTH) {
			const row = y - DEPTH
			if (row === 0) return SHADE
			if (row === FRONT_HEIGHT - 1) return SLAT
			if (x < 2) return SIDE
			if (
				row % 2 === 0 &&
				x >= 4 &&
				x < FRONT_WIDTH - 3 &&
				row < FRONT_HEIGHT - 2
			)
				return SLAT
			return FRONT
		}
		// Its top, `back` of the way across the path, `along` its width.
		const back = (DEPTH - py) / DEPTH
		const along = px - back * SLANT
		if (back >= 0 && back <= 1 && along >= 0 && along <= FRONT_WIDTH) {
			if (y === DEPTH - 1) return LIT
			// The fan's grille, round, seen from above: a ring, its blades
			// behind, the hub in the middle.
			const dx = (along - FRONT_WIDTH / 2) / (FRONT_WIDTH * 0.36)
			const dy = (back - 0.5) / 0.36
			const r = Math.hypot(dx, dy)
			if (r < 0.28) return FRONT
			if (r < 0.8) return SLAT
			if (r < 1) return SHADE
			return TOP
		}
		// Its side, going back from its front's right edge, in shade.
		const u = (px - FRONT_WIDTH) / SLANT
		if (u >= 0 && u <= 1) {
			const top = DEPTH - u * DEPTH
			if (py >= top && py <= top + FRONT_HEIGHT)
				return py > top + FRONT_HEIGHT - 1 ? SLAT : SIDE
		}
		return undefined
	},
)
