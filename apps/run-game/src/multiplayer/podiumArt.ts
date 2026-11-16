import { pixelText, pixelTextWidth, svgUrl } from '../courses/kit/pixelArt'

/**
 * The Podium's steps, drawn as pixel art: stone blocks stood on the
 * ground, each its top lit and its front in shade, its edges square (no
 * slanting corners), a plaque with its place on it ("#1"), a trophy on the
 * winner's, and the points they got along its foot. Drawn a cell to
 * `PODIUM_CELL` screen pixels, as big as the runners stood on them.
 */

export const PODIUM_CELL = 3
/** How wide a step is, and how tall each is, 1st to 3rd, in cells. */
export const STEP_COLUMNS = 50
export const STEP_ROWS = [44, 34, 28] as const

const TOP = '#eef1f4'
const TOP_SHADE = '#cfd5dc'
const EDGE = '#8e959f'
const STONE = '#b9c0c9'
const STONE_LIT = '#cdd3da'
const STONE_SHADE = '#959ca7'
const MORTAR = '#a3aab4'
const FOOT = '#7d848e'
const FOOT_SHADE = '#666d77'
const PLAQUE = '#262a31'
const PLAQUE_RIM = '#4a505a'
const LETTERS = '#ffffff'
const GOLD = '#ffd23f'
const GOLD_SHADE = '#c9921a'
const GOLD_LIT = '#fff3b0'

const rect = (x: number, y: number, w: number, h: number, fill: string) =>
	`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`

/** A trophy, gold, a cup on a stem on a base, 14 by 13, its top left at `x`, `y`. */
function trophy(x: number, y: number) {
	return [
		// Its handles.
		rect(x, y + 1, 2, 4, GOLD_SHADE),
		rect(x + 12, y + 1, 2, 4, GOLD_SHADE),
		rect(x + 1, y + 1, 1, 1, PLAQUE),
		rect(x + 12, y + 1, 1, 1, PLAQUE),
		// Its cup, lit down its left.
		rect(x + 2, y, 10, 6, GOLD),
		rect(x + 3, y + 6, 8, 1, GOLD),
		rect(x + 4, y + 7, 6, 1, GOLD_SHADE),
		rect(x + 3, y + 1, 2, 4, GOLD_LIT),
		rect(x + 10, y + 1, 2, 5, GOLD_SHADE),
		// Its stem and base.
		rect(x + 6, y + 8, 2, 2, GOLD_SHADE),
		rect(x + 4, y + 10, 6, 1, GOLD),
		rect(x + 3, y + 11, 8, 2, GOLD_SHADE),
		rect(x + 4, y + 11, 3, 1, GOLD_LIT),
	].join('')
}

/** `text` in pixel letters, in the middle of a step, `y` down. */
const centred = (text: string, y: number, fill: string) =>
	pixelText(
		text,
		Math.floor((STEP_COLUMNS - pixelTextWidth(text, 1)) / 2),
		y,
		1,
		fill,
	)

/**
 * The step for `place`, its top edge in the colour of whoever's on it, and
 * their `points` along its foot: as an image's URL.
 */
export function podiumStep(place: 1 | 2 | 3, points: number, colour: string) {
	const rows = STEP_ROWS[place - 1]
	const w = STEP_COLUMNS
	const parts: string[] = []
	// Its front, stone, lit down its left, in shade down its right, a
	// course of mortar every so often, the joints staggered.
	parts.push(rect(0, 4, w, rows - 4, STONE))
	parts.push(rect(0, 4, 2, rows - 4, STONE_LIT))
	parts.push(rect(w - 3, 4, 3, rows - 4, STONE_SHADE))
	for (let y = 12, course = 0; y < rows - 5; y += 7, course++) {
		parts.push(rect(2, y, w - 5, 1, MORTAR))
		for (let x = course % 2 ? 9 : 17; x < w - 4; x += 16)
			parts.push(rect(x, y + 1, 1, 6, MORTAR))
	}
	// Its top, lit, its front edge, and a strip of their colour along it.
	parts.push(rect(0, 0, w, 3, TOP))
	parts.push(rect(0, 2, w, 1, TOP_SHADE))
	parts.push(rect(0, 3, w, 1, colour))
	parts.push(rect(0, 4, w, 1, EDGE))
	// Its plaque, near the top: its place.
	const label = `#${place}`
	const plaqueWide = pixelTextWidth(label, 1) + 8
	const plaqueLeft = Math.floor((w - plaqueWide) / 2)
	parts.push(rect(plaqueLeft - 1, 6, plaqueWide + 2, 11, PLAQUE_RIM))
	parts.push(rect(plaqueLeft, 7, plaqueWide, 9, PLAQUE))
	parts.push(centred(label, 8, place === 1 ? GOLD : LETTERS))
	// The winner's: a trophy, under the plaque.
	if (place === 1) parts.push(trophy(Math.floor((w - 14) / 2), 18))
	// Its foot, darker, and the points on a plaque along it.
	parts.push(rect(0, rows - 4, w, 4, FOOT))
	parts.push(rect(0, rows - 1, w, 1, FOOT_SHADE))
	const score = `${points} PTS`
	const scoreWide = pixelTextWidth(score, 1) + 6
	const scoreLeft = Math.floor((w - scoreWide) / 2)
	parts.push(rect(scoreLeft, rows - 12, scoreWide, 10, PLAQUE_RIM))
	parts.push(rect(scoreLeft + 1, rows - 11, scoreWide - 2, 8, PLAQUE))
	parts.push(centred(score, rows - 10, GOLD))
	return svgUrl(w, rows, parts.join(''))
}
