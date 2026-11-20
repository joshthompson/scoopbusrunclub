import { grid } from '../../draw/art/doll'
import { glyphRows } from './pixelArt'

/**
 * Red Light, Green Light's playground (see `minigames/redLightGreenLight`),
 * drawn in code: a huge painted wall right across the back, bunting along
 * its top and three painted panels on it, a rainbow, a grinning sun and a
 * moon among the stars; a round candy-floss tree and a tall thin one; and
 * what's painted on the floor, the start line and the finish line, with a
 * sign post at each. All at scale 2, a cell two pixels.
 */

const CELL = 2

/** The sand underfoot, and the packed sand of the path, each with its shade. */
export const PLAY_SAND = '#ecd29a'
export const PLAY_SAND_SHADE = '#dcbc7e'
export const PLAY_PATH = '#e2bd86'
export const PLAY_PATH_SHADE = '#cfa56c'
/** The sky, top and bottom: a bright, hazy afternoon. */
export const PLAY_SKY_TOP = '#78c4ee'
export const PLAY_SKY_BOTTOM = '#e4f4fb'

const WALL = '#f6e7b8'
const WALL_LIT = '#fff4d2'
const WALL_SHADE = '#e2cb94'
const WALL_DEEP = '#c9ad74'
const PILASTER = '#e9d29b'
const PANEL_SKY = '#bfe6f5'
const PANEL_PINK = '#ffd9de'
const PANEL_DUSK = '#cdc0f2'
const HILL = '#8ccf6a'
const HILL_SHADE = '#6fb552'
const CLOUD = '#ffffff'
const CLOUD_SHADE = '#e3f1f8'
const RAINBOW = [
	'#e8423f',
	'#f58a2a',
	'#f7d230',
	'#59be5a',
	'#3f8ce0',
	'#8a5cc8',
]
const SUN = '#ffd23a'
const SUN_LIT = '#fff08a'
const SUN_SHADE = '#f0a822'
const MOON = '#fff6c8'
const MOON_SHADE = '#e6d68e'
const STAR = '#ffe36a'
const INK = '#2b2722'
const CHEEK = '#f58a8a'
const FLAGS = ['#e8423f', '#f4c92a', '#2fb5b0', '#8a5cc8', '#f58a2a']

/** The wall: 480 cells across the screen, 170 tall, its foot on the path's back edge. */
export const WALL_CELLS_WIDE = 480
export const WALL_CELLS_HIGH = 170
export const WALL_WIDTH = WALL_CELLS_WIDE * CELL
export const WALL_HEIGHT = WALL_CELLS_HIGH * CELL

/** The three painted panels' left edges and their width, in cells. */
const PANELS = [10, 170, 330] as const
const PANEL_W = 140
const PANEL_TOP = 24
const PANEL_H = 120

export const PLAYGROUND_WALL = (() => {
	const p = grid(WALL_CELLS_WIDE, WALL_CELLS_HIGH)
	// The plaster, its top row a cap lit along its top, a deep plinth at its foot.
	p.rect(0, 0, WALL_CELLS_WIDE, WALL_CELLS_HIGH, WALL)
	p.rect(0, 0, WALL_CELLS_WIDE, 3, WALL_LIT)
	p.rect(0, 3, WALL_CELLS_WIDE, 3, WALL_SHADE)
	p.rect(0, WALL_CELLS_HIGH - 14, WALL_CELLS_WIDE, 14, WALL_SHADE)
	p.rect(0, WALL_CELLS_HIGH - 14, WALL_CELLS_WIDE, 2, WALL_LIT)
	p.rect(0, WALL_CELLS_HIGH - 2, WALL_CELLS_WIDE, 2, WALL_DEEP)
	// Pilasters between the panels, and either end.
	for (const x of [0, 156, 316, 476]) {
		p.rect(x, 6, 4, WALL_CELLS_HIGH - 20, PILASTER)
		p.rect(x, 6, 1, WALL_CELLS_HIGH - 20, WALL_LIT)
		p.rect(x + 3, 6, 1, WALL_CELLS_HIGH - 20, WALL_DEEP)
	}

	/** A panel's frame and its flat ground, `from` cells in. */
	const panel = (from: number, ground: string) => {
		p.rect(from - 2, PANEL_TOP - 2, PANEL_W + 4, PANEL_H + 4, WALL_DEEP)
		p.rect(from - 1, PANEL_TOP - 1, PANEL_W + 2, PANEL_H + 2, WALL_LIT)
		p.rect(from, PANEL_TOP, PANEL_W, PANEL_H, ground)
	}
	/** Whatever's painted on a panel stays on it: `set`, trimmed to its edges. */
	const inPanel = (from: number) => (x: number, y: number, fill: string) => {
		if (
			x >= from &&
			x < from + PANEL_W &&
			y >= PANEL_TOP &&
			y < PANEL_TOP + PANEL_H
		)
			p.set(x, y, fill)
	}
	const cloud = (
		set: (x: number, y: number, c: string) => void,
		cx: number,
		cy: number,
		s: number,
	) => {
		for (const [dx, dy, r] of [
			[-6, 1, 5],
			[0, -2, 7],
			[7, 1, 5],
			[2, 3, 6],
		]) {
			const rr = Math.round(r * s)
			for (let y = -rr; y <= rr; y++)
				for (let x = -rr; x <= rr; x++)
					if (x * x + y * y <= rr * rr)
						set(
							cx + Math.round(dx * s) + x,
							cy + Math.round(dy * s) + y,
							y > rr * 0.3 ? CLOUD_SHADE : CLOUD,
						)
		}
	}

	// Panel one: a rainbow over green hills, a cloud at either foot.
	{
		const from = PANELS[0]
		const set = inPanel(from)
		panel(from, PANEL_SKY)
		const cx = from + PANEL_W / 2
		const cy = PANEL_TOP + 92
		for (let y = PANEL_TOP; y < PANEL_TOP + PANEL_H; y++)
			for (let x = from; x < from + PANEL_W; x++) {
				const d = Math.hypot(x + 0.5 - cx, (y + 0.5 - cy) * 1.05)
				const band = Math.floor((60 - d) / 4)
				if (d <= 60 && band >= 0 && band < RAINBOW.length)
					set(x, y, RAINBOW[band])
			}
		// Rolling hills across its foot.
		for (let x = from; x < from + PANEL_W; x++) {
			const top = PANEL_TOP + 100 + Math.round(5 * Math.sin((x - from) / 14))
			for (let y = top; y < PANEL_TOP + PANEL_H; y++)
				set(x, y, y > top + 8 ? HILL_SHADE : HILL)
		}
		cloud(set, from + 20, PANEL_TOP + 90, 1.1)
		cloud(set, from + PANEL_W - 22, PANEL_TOP + 92, 0.9)
		cloud(set, from + 100, PANEL_TOP + 24, 0.8)
	}

	// Panel two: a sun with a big grin, its rays all round.
	{
		const from = PANELS[1]
		const set = inPanel(from)
		panel(from, PANEL_PINK)
		const cx = from + PANEL_W / 2
		const cy = PANEL_TOP + 58
		for (let i = 0; i < 16; i++) {
			const a = (i / 16) * Math.PI * 2
			for (let r = 34; r < 50; r++) {
				const x = Math.round(cx + Math.cos(a) * r)
				const y = Math.round(cy + Math.sin(a) * r)
				for (const [w, h] of [
					[3, 3],
					[2, 2],
				]) {
					if (r - 34 < (i % 2 ? 9 : 16))
						for (let j = 0; j < h; j++)
							for (let k = 0; k < w; k++) set(x + k, y + j, SUN_SHADE)
				}
			}
		}
		for (let y = -30; y <= 30; y++)
			for (let x = -30; x <= 30; x++) {
				if (x * x + y * y > 30 * 30) continue
				const l = -(x * 0.6 + y * 0.8) / 30
				set(cx + x, cy + y, l > 0.5 ? SUN_LIT : l < -0.5 ? SUN_SHADE : SUN)
			}
		// Its face: two eyes, rosy cheeks, a wide smile.
		for (const ex of [-11, 9]) {
			for (let y = -2; y < 6; y++)
				for (let x = 0; x < 3; x++) set(cx + ex + x, cy - 8 + y, INK)
		}
		for (const ex of [-22, 18])
			for (let y = 0; y < 4; y++)
				for (let x = 0; x < 6; x++) set(cx + ex + x, cy + 4 + y, CHEEK)
		for (let x = -13; x <= 13; x++) {
			const y = Math.round(13 - (x * x) / 14)
			set(cx + x, cy + y, INK)
			set(cx + x, cy + y + 1, INK)
		}
		// A few small clouds low down.
		cloud(set, from + 20, PANEL_TOP + 104, 0.8)
		cloud(set, from + PANEL_W - 20, PANEL_TOP + 106, 0.7)
	}

	// Panel three: a moon among stars, dusk.
	{
		const from = PANELS[2]
		const set = inPanel(from)
		panel(from, PANEL_DUSK)
		const cx = from + 48
		const cy = PANEL_TOP + 42
		for (let y = -22; y <= 22; y++)
			for (let x = -22; x <= 22; x++) {
				if (x * x + y * y > 22 * 22) continue
				// A crescent: the same circle taken out of itself, shifted.
				if ((x - 10) * (x - 10) + (y + 4) * (y + 4) <= 19 * 19) continue
				set(cx + x, cy + y, x < -12 ? MOON : MOON_SHADE)
			}
		for (const [x, y, s] of [
			[from + 90, PANEL_TOP + 18, 3],
			[from + 112, PANEL_TOP + 40, 2],
			[from + 74, PANEL_TOP + 52, 2],
			[from + 20, PANEL_TOP + 14, 2],
			[from + 124, PANEL_TOP + 16, 2],
			[from + 100, PANEL_TOP + 70, 3],
			[from + 24, PANEL_TOP + 72, 2],
		]) {
			set(x, y - s, STAR)
			set(x, y + s, STAR)
			for (let i = -s; i <= s; i++) {
				set(x + i, y, STAR)
				if (Math.abs(i) < s) set(x, y + i, STAR)
			}
		}
		// A band of hills, deep blue-violet, at its foot.
		for (let x = from; x < from + PANEL_W; x++) {
			const top =
				PANEL_TOP + 104 + Math.round(4 * Math.sin((x - from) / 11 + 2))
			for (let y = top; y < PANEL_TOP + PANEL_H; y++) set(x, y, '#8d78c8')
		}
	}

	// Bunting along its top: a string in three swags, a flag every few cells.
	for (let x = 4; x < WALL_CELLS_WIDE - 4; x++) {
		const along = (x % 158) / 158
		const sag = Math.round(7 * Math.sin(along * Math.PI))
		const y = 8 + sag
		p.set(x, y, INK)
		if (x % 9 === 4) {
			const colour = FLAGS[Math.floor(x / 9) % FLAGS.length]
			for (let j = 0; j < 7; j++)
				for (let i = 0; i < 6 - j; i++)
					p.set(x - 2 + i + (j >> 1), y + 1 + j, colour)
		}
	}
	return p.url()
})()

/** A round candy-floss tree: 44 by 56 cells, a squat trunk and three puffs of leaves. */
const LEAF = '#58b85a'
const LEAF_LIT = '#86d66e'
const LEAF_SHADE = '#3a9248'
const TRUNK = '#9a6a3a'
const TRUNK_LIT = '#bd8c52'
const TRUNK_SHADE = '#6e4824'
const BLOSSOM = '#ff9fc4'

export const PLAY_TREE_WIDTH = 44
export const PLAY_TREE_HEIGHT = 58
export const PLAY_TREE = (() => {
	const p = grid(PLAY_TREE_WIDTH, PLAY_TREE_HEIGHT)
	// Its trunk, forking, lit on the left.
	p.rect(19, 36, 7, 22, TRUNK)
	p.rect(19, 36, 2, 22, TRUNK_LIT)
	p.rect(24, 36, 2, 22, TRUNK_SHADE)
	p.rect(15, 50, 15, 3, TRUNK)
	p.rect(16, 55, 13, 3, TRUNK_SHADE)
	p.rect(16, 50, 14, 1, TRUNK_LIT)
	// Its leaves: three puffs, lit from the top left.
	const puff = (cx: number, cy: number, r: number) =>
		p.oval(cx, cy, r, r * 0.9, (_x, _y, dx, dy) => {
			const l = -(dx * 0.6 + dy * 0.8)
			return l > 0.5 ? LEAF_LIT : l < -0.4 ? LEAF_SHADE : LEAF
		})
	puff(14, 28, 13)
	puff(31, 27, 13)
	puff(22, 15, 15)
	// Blossoms on it.
	for (const [x, y] of [
		[12, 20],
		[28, 12],
		[34, 26],
		[18, 32],
		[24, 22],
		[8, 31],
	]) {
		p.rect(x, y, 2, 2, BLOSSOM)
		p.set(x, y, '#ffd0e2')
	}
	return p.url()
})()

/** A tall thin tree, a cypress: 22 by 70 cells. */
export const PLAY_CYPRESS_WIDTH = 22
export const PLAY_CYPRESS_HEIGHT = 70
export const PLAY_CYPRESS = (() => {
	const p = grid(PLAY_CYPRESS_WIDTH, PLAY_CYPRESS_HEIGHT)
	p.rect(9, 60, 4, 10, TRUNK)
	p.rect(9, 60, 1, 10, TRUNK_LIT)
	p.rect(12, 60, 1, 10, TRUNK_SHADE)
	p.oval(11, 32, 10, 30, (_x, _y, dx, dy) => {
		const l = -(dx * 0.7 + dy * 0.3)
		return l > 0.5 ? LEAF_LIT : l < -0.3 ? LEAF_SHADE : LEAF
	})
	// Tufts across it.
	for (let y = 8; y < 58; y += 6) {
		p.rect(5 + ((y >> 1) % 3), y, 3, 1, LEAF_SHADE)
		p.rect(13 - ((y >> 1) % 2), y + 3, 3, 1, LEAF_LIT)
	}
	return p.url()
})()

/**
 * A sign on a post, standing on its foot: `text` in white on a board of
 * `colour`, a post `post` cells tall under it.
 */
function signArt(text: string, colour: string, post: number) {
	const w = text.length * 6 - 1 + 6
	const h = 11 + post
	const p = grid(w, h)
	p.rect(0, 0, w, 11, '#7a4f28')
	p.rect(1, 1, w - 2, 9, colour)
	p.rect(Math.floor(w / 2) - 1, 11, 3, post, '#7a4f28')
	p.rect(Math.floor(w / 2) - 1, 11, 1, post, '#a8713a')
	;[...text].forEach((char, i) => {
		glyphRows(char).forEach((row, r) => {
			for (let c = 0; c < row.length; c++)
				if (row[c] === '#') p.set(3 + i * 6 + c, 2 + r - 0, '#ffffff')
		})
	})
	return { src: p.url(), width: w, height: h }
}
export const START_SIGN = signArt('START', '#3f8ce0', 18)
export const FINISH_SIGN = signArt('FINISH', '#e8423f', 18)

/** The finish line across the path: two columns of black and white squares, 6 cells wide and the path's 18 tall. */
export const FINISH_LINE_WIDTH = 8
export const FINISH_LINE_HEIGHT = 18
export const FINISH_LINE = (() => {
	const p = grid(FINISH_LINE_WIDTH, FINISH_LINE_HEIGHT)
	for (let y = 0; y < FINISH_LINE_HEIGHT; y++)
		for (let x = 0; x < FINISH_LINE_WIDTH; x++) {
			const dark = (Math.floor(x / 2) + Math.floor(y / 2)) % 2 === 0
			p.set(x, y, dark ? '#2b2722' : '#fffaf0')
		}
	return p.url()
})()

/** The start line: a white stripe painted across the path, in dashes. */
export const START_LINE_WIDTH = 4
export const START_LINE = (() => {
	const p = grid(START_LINE_WIDTH, FINISH_LINE_HEIGHT)
	for (let y = 0; y < FINISH_LINE_HEIGHT; y++) {
		if (y % 6 >= 4) continue
		p.rect(0, y, START_LINE_WIDTH, 1, '#fffaf0')
		p.set(START_LINE_WIDTH - 1, y, '#e6dfcc')
	}
	return p.url()
})()
