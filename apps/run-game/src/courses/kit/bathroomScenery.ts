import { type PixelRect, pixelText, rectsMarkup, svgUrl } from './pixelArt'

/**
 * Jughead's public bathroom (see `minigames/jughead`): one screen of it,
 * badly kept. A high ceiling, water-stained, a thin grey pipe and a big
 * rusty one along it, joints, brackets, valves and spouts that drip.
 * Cream tiles gone grubby, a green band round them, some missing, some
 * cracked, rust run down them from the pipes, grimier lower down. On the
 * left, three urinals, the middle one hanging off the wall, its flush pipe
 * snapped; a mop and bucket in the corner. In the middle, two sinks, one
 * chipped, under a cracked mirror, and a paper towel box hanging open.
 * On the right, two stalls: one door hanging off its last hinge, OUT OF
 * ORDER taped to it; the other door gone, and the toilet in there. The
 * floor, stained tiles, a drain, puddles.
 *
 * One picture the whole screen, 480 cells by 270, a cell 2 px. Where its
 * spouts, sinks, urinal and toilet are is said here, in px across and
 * down the screen, for the water to come out of them.
 */

const CELL = 2
const COLUMNS = 480
const ROWS = 270
export const BATHROOM_WIDTH = COLUMNS * CELL
export const BATHROOM_HEIGHT = ROWS * CELL

// --- Where the water comes from, in px on the screen -------------------------

/** The spouts under the big pipe, across, in cells; and where the water leaves them, down. */
const SPOUT_CELLS = [60, 115, 170, 235, 300, 360, 420]
export const SPOUTS_X = SPOUT_CELLS.map((c) => c * CELL)
export const SPOUT_Y = 46 * CELL
/** The big pipe's underside, where it's leaking along a seam: dripping all along it. */
export const PIPE_UNDER_Y = 35 * CELL
/** The broken urinal's snapped flush pipe. */
const URINAL_CELLS = [62, 102, 142]
const BROKEN_URINAL = 1
export const URINAL_PIPE = {
	x: URINAL_CELLS[BROKEN_URINAL] * CELL,
	y: 184 * CELL,
}
/** The sinks' taps, where they'd spray from. */
const SINK_CELLS = [212, 264]
export const SINK_TAPS = SINK_CELLS.map((c) => ({
	x: (c - 3) * CELL,
	y: 188 * CELL,
}))
/** The toilet's bowl, where it'd erupt from. */
const TOILET_CELL = 403
export const TOILET_BOWL = { x: TOILET_CELL * CELL, y: 204 * CELL }
/** The flickering tube's middle, across, and its height, for the light (see `draw/jughead`). */
export const TUBE = { x: 470, y: 112, width: 150 }

// --- Colours -------------------------------------------------------------------

const CEILING = '#6e695c'
const CEILING_STAIN = '#5d5749'
const CORNICE = '#8c8676'
const PIPE = '#8a5a3a'
const PIPE_LIT = '#b07a50'
const PIPE_SHADE = '#5e3a24'
const FLANGE = '#6a4430'
const RUST = '#9a4e2a'
const SPOUT_HOLE = '#2e2219'
const PIPE_GREY = '#5a5d62'
const PIPE_GREY_LIT = '#7a7e84'
const VALVE = '#b8382b'
const VALVE_LIT = '#e06050'
const TILE = '#d6d1bd'
const TILE_GRIME = '#c4bda6'
const TILE_GRIMIER = '#b0a88f'
const GROUT = '#aaa48f'
const GROUT_GRIME = '#958e78'
const STRIPE = '#5f8a72'
const STRIPE_LIT = '#77a389'
const STRIPE_SHADE = '#4c705c'
const PLASTER = '#7a7062'
const PLASTER_DARK = '#5d5549'
const CRACK = '#6d6656'
const STAIN = '#b59d62'
const RUST_STREAK = '#a47452'
const PORCELAIN = '#ebe8dc'
const PORCELAIN_SHADE = '#c6c1ae'
const PORCELAIN_DARK = '#a19b86'
const CHROME = '#a7adb3'
const CHROME_LIT = '#d4d9de'
const CHROME_SHADE = '#6f757b'
const DARK = '#2b2722'
const MIRROR = '#9fb9bf'
const MIRROR_LIT = '#c9dde0'
const MIRROR_FRAME = '#4b4a44'
const MIRROR_CRACK = '#e9f2f3'
const MIRROR_CRACK_SHADE = '#6a8188'
const STALL = '#6f7f68'
const STALL_LIT = '#839479'
const STALL_SHADE = '#566352'
const STALL_INSIDE = '#4a463d'
const FLOOR = '#8e8877'
const FLOOR_ALT = '#9a9483'
const FLOOR_GROUT = '#77715f'
const FLOOR_DIRT = '#7d7564'
const BASEBOARD = '#5f594b'
const PUDDLE = '#7b95a6'
const PUDDLE_LIT = '#a9c3d0'
const SIGN = '#f1ede0'
const SIGN_RED = '#c0392b'
const TAPE = '#d8cfa8'
const BUCKET = '#e0b030'
const BUCKET_LIT = '#f2cd5c'
const BUCKET_SHADE = '#b08820'
const MOP = '#8a6a4a'
const MOP_HEAD = '#cfc6ae'
const MOP_HEAD_SHADE = '#a89e86'
const PAPER = '#f4f1e6'
const PAPER_SHADE = '#d6d1c0'
const COBWEB = '#a9a597'

/** Where the wall starts, under the ceiling's cornice; and stops, at the floor. */
const WALL_TOP = 29
const FLOOR_TOP = 232
/** Where the wall meets the floor, down the screen, in px: the flood's far edge. */
export const WALL_FOOT_Y = FLOOR_TOP * CELL
/** How big a wall tile is, grout and all. */
const TILE_SIZE = 9

function bathroom(): string {
	const r: PixelRect[] = []
	const extra: string[] = []
	// The ceiling, high, stained; its cornice; a cobweb in the corner.
	r.push([0, 0, COLUMNS, WALL_TOP, CEILING])
	for (const [x, y, w, h] of [
		[40, 4, 26, 8],
		[52, 10, 14, 5],
		[208, 2, 34, 9],
		[220, 9, 18, 6],
		[352, 6, 22, 7],
	])
		r.push([x, y, w, h, CEILING_STAIN])
	r.push([0, WALL_TOP - 1, COLUMNS, 1, CORNICE])
	for (let i = 0; i < 12; i++) {
		r.push([i, 0, 1, 12 - i, i % 3 === 0 ? COBWEB : CEILING])
		r.push([0, i, 12 - i, 1, i % 4 === 0 ? COBWEB : CEILING])
	}
	r.push([2, 2, 6, 1, COBWEB])
	r.push([2, 2, 1, 6, COBWEB])
	// The wall: tiles, grubbier the lower, a green band round it.
	r.push([0, WALL_TOP, COLUMNS, FLOOR_TOP - WALL_TOP, TILE])
	r.push([0, 196, COLUMNS, 22, TILE_GRIME])
	r.push([0, 218, COLUMNS, FLOOR_TOP - 218, TILE_GRIMIER])
	r.push([0, 140, COLUMNS, 6, STRIPE])
	r.push([0, 140, COLUMNS, 1, STRIPE_LIT])
	r.push([0, 145, COLUMNS, 1, STRIPE_SHADE])
	for (let y = WALL_TOP + TILE_SIZE - 1; y < FLOOR_TOP; y += TILE_SIZE)
		if (y < 140 || y > 145)
			r.push([0, y, COLUMNS, 1, y > 200 ? GROUT_GRIME : GROUT])
	for (let x = 4; x < COLUMNS; x += TILE_SIZE) {
		r.push([x, WALL_TOP, 1, 140 - WALL_TOP, GROUT])
		r.push([x, 146, 1, FLOOR_TOP - 146, GROUT_GRIME])
	}
	// Tiles fallen off, the plaster behind; and cracked ones.
	const tileAt = (col: number, row: number) => ({
		x: 5 + col * TILE_SIZE,
		y: WALL_TOP + row * TILE_SIZE,
	})
	for (const [col, row] of [
		[3, 2],
		[4, 2],
		[3, 3],
		[22, 6],
		[30, 1],
		[31, 1],
		[45, 3],
		[46, 9],
		[12, 18],
		[38, 17],
		[51, 13],
	]) {
		const { x, y } = tileAt(col, row)
		r.push([x, y, TILE_SIZE - 1, TILE_SIZE - 1, PLASTER])
		r.push([x, y, TILE_SIZE - 1, 1, PLASTER_DARK])
		r.push([x, y, 1, TILE_SIZE - 1, PLASTER_DARK])
	}
	for (const [col, row] of [
		[8, 4],
		[27, 3],
		[40, 7],
		[17, 15],
		[49, 4],
	]) {
		const { x, y } = tileAt(col, row)
		for (let i = 0; i < 7; i++)
			r.push([x + 1 + i, y + (i % 2 ? i - 1 : i), 1, 2, CRACK])
	}
	// Grime: damp patches up high, mould in the corners, dirt splashed up
	// off the floor.
	for (const [x, y, w, h, c] of [
		[100, 60, 18, 10, TILE_GRIME],
		[106, 70, 8, 6, TILE_GRIME],
		[284, 52, 24, 12, TILE_GRIME],
		[292, 64, 10, 8, TILE_GRIME],
		[420, 90, 20, 14, TILE_GRIME],
		[0, WALL_TOP, 10, 30, PLASTER],
		[0, WALL_TOP + 30, 5, 18, PLASTER],
		[470, WALL_TOP, 10, 22, PLASTER],
		[150, 206, 24, 8, TILE_GRIMIER],
		[290, 210, 18, 8, TILE_GRIMIER],
	] as const)
		r.push([x, y, w, h, c])
	// The big rusty pipe along the top, a thin grey one over it, brackets up
	// to the ceiling, joints along it, rust run down the wall under it.
	r.push([0, 18, COLUMNS, 2, PIPE_GREY])
	r.push([0, 18, COLUMNS, 1, PIPE_GREY_LIT])
	r.push([0, 30, COLUMNS, 5, PIPE])
	r.push([0, 30, COLUMNS, 1, PIPE_LIT])
	r.push([0, 34, COLUMNS, 1, PIPE_SHADE])
	for (let x = 26; x < COLUMNS; x += 56) {
		r.push([x, 29, 4, 7, FLANGE])
		r.push([x, 29, 4, 1, PIPE_LIT])
		r.push([x + 1, 20, 1, 9, PIPE_GREY])
		r.push([x + 1, 36, 1, 1, RUST])
	}
	for (const [x, long] of [
		[44, 40],
		[88, 22],
		[150, 60],
		[198, 30],
		[268, 46],
		[330, 26],
		[392, 54],
		[446, 34],
	]) {
		r.push([x, 35, 1, long, RUST_STREAK])
		r.push([x + 1, 35, 1, Math.round(long * 0.6), RUST_STREAK])
	}
	// The spouts down off it, where the water comes out, a valve on some.
	SPOUT_CELLS.forEach((c, i) => {
		r.push([c - 2, 35, 4, 9, PIPE])
		r.push([c - 2, 35, 1, 9, PIPE_LIT])
		r.push([c + 1, 35, 1, 9, PIPE_SHADE])
		r.push([c - 3, 43, 6, 2, FLANGE])
		r.push([c - 2, 45, 4, 1, SPOUT_HOLE])
		if (i % 2 === 0) {
			r.push([c - 4, 38, 9, 1, VALVE])
			r.push([c, 36, 1, 5, VALVE])
			r.push([c - 4, 38, 2, 1, VALVE_LIT])
		}
	})
	// The urinals: porcelain, a flush pipe up from each; the middle one
	// hanging off the wall, its pipe snapped, the plaster where it was.
	URINAL_CELLS.forEach((cx, i) => {
		const broken = i === BROKEN_URINAL
		r.push([cx, 150, 1, broken ? 34 : 34, CHROME])
		r.push([cx - 1, 172, 3, 2, CHROME_SHADE])
		if (broken) {
			// Where it hung, bolt holes, the snapped pipe's jagged end.
			r.push([cx - 7, 186, 14, 20, PLASTER])
			r.push([cx - 7, 186, 14, 1, PLASTER_DARK])
			for (const [bx, by] of [
				[-5, 189],
				[4, 189],
				[-5, 200],
				[4, 200],
			])
				r.push([cx + bx, by, 1, 1, DARK])
			r.push([cx - 1, 183, 1, 2, CHROME_SHADE])
			r.push([cx + 1, 184, 1, 1, CHROME_SHADE])
		}
		const top = broken ? 198 : 184
		// Hanging off, it's slumped down and leant over, a row at a time.
		const lean = (row: number) => (broken ? Math.floor(row / 6) : 0)
		const rows: [number, number][] = [
			[0, 12],
			[1, 14],
			[2, 14],
			[3, 14],
			[4, 14],
			[5, 14],
			[6, 14],
			[7, 14],
			[8, 14],
			[9, 14],
			[10, 14],
			[11, 14],
			[12, 14],
			[13, 13],
			[14, 13],
			[15, 12],
			[16, 12],
			[17, 11],
			[18, 10],
			[19, 9],
			[20, 8],
			[21, 7],
			[22, 6],
		]
		for (const [row, wide] of rows) {
			const x = cx - Math.floor(wide / 2) + lean(row)
			r.push([x, top + row, wide, 1, PORCELAIN])
			r.push([x + wide - 2, top + row, 2, 1, PORCELAIN_SHADE])
			// The bowl in it, shaded.
			if (row >= 3 && row <= 17)
				r.push([x + 3, top + row, wide - 7, 1, PORCELAIN_SHADE])
		}
		r.push([cx - 1 + lean(16), top + 16, 3, 1, DARK])
		r.push([cx - 6 + lean(0), top, 4, 1, CHROME_LIT])
		// Stained, under it.
		if (!broken) r.push([cx - 4, top + 24, 8, 3, STAIN])
	})
	// A mop and bucket in the corner.
	r.push([8, 216, 16, 16, BUCKET])
	r.push([8, 216, 16, 2, BUCKET_LIT])
	r.push([20, 218, 4, 14, BUCKET_SHADE])
	r.push([7, 215, 18, 1, BUCKET_SHADE])
	r.push([18, 160, 2, 58, MOP])
	r.push([13, 212, 12, 6, MOP_HEAD])
	r.push([13, 216, 12, 2, MOP_HEAD_SHADE])
	// The mirror over the sinks, its glass cracked out from a point.
	r.push([196, 114, 88, 58, MIRROR_FRAME])
	r.push([198, 116, 84, 54, MIRROR])
	for (let i = 0; i < 18; i++) {
		r.push([206 + i * 2, 160 - i * 2, 6, 2, MIRROR_LIT])
		r.push([246 + i, 168 - i * 2, 2, 2, MIRROR_LIT])
	}
	const crackFrom = { x: 258, y: 132 }
	for (const [dx, dy] of [
		[1, 0],
		[1, 1],
		[0, 1],
		[-1, 1],
		[-1, 0],
		[-1, -1],
		[1, -1],
	])
		for (let i = 1; i < 14; i++) {
			const x = crackFrom.x + dx * i * 2 + (i % 3 === 0 ? dy : 0)
			const y = crackFrom.y + dy * i + (i % 4 === 0 ? dx : 0)
			if (x < 198 || x > 281 || y < 116 || y > 169) break
			r.push([x, y, 2, 1, MIRROR_CRACK])
			r.push([x, y + 1, 2, 1, MIRROR_CRACK_SHADE])
		}
	// A paper towel box, its front hanging open, paper spilling out.
	r.push([176, 150, 14, 18, CHROME])
	r.push([176, 150, 14, 1, CHROME_LIT])
	r.push([176, 168, 14, 3, CHROME_SHADE])
	r.push([178, 170, 6, 14, PAPER])
	r.push([182, 178, 4, 10, PAPER_SHADE])
	// The sinks, on pedestals, their taps; the right one chipped.
	SINK_CELLS.forEach((cx, i) => {
		r.push([cx - 11, 190, 22, 2, PORCELAIN])
		r.push([cx - 10, 192, 20, 6, PORCELAIN])
		r.push([cx - 10, 196, 20, 2, PORCELAIN_SHADE])
		r.push([cx + 6, 192, 4, 6, PORCELAIN_SHADE])
		r.push([cx - 3, 198, 6, FLOOR_TOP - 198, PORCELAIN])
		r.push([cx + 1, 198, 2, FLOOR_TOP - 198, PORCELAIN_SHADE])
		r.push([cx - 3, 184, 2, 6, CHROME])
		r.push([cx - 6, 186, 5, 2, CHROME])
		r.push([cx - 6, 186, 5, 1, CHROME_LIT])
		r.push([cx + 3, 187, 3, 2, CHROME_SHADE])
		if (i === 1) {
			r.push([cx + 6, 190, 5, 4, TILE_GRIMIER])
			r.push([cx + 5, 192, 2, 2, PORCELAIN_DARK])
			for (let k = 0; k < 5; k++)
				r.push([cx - 2 + k * 2, 192 + (k % 2), 2, 1, CRACK])
		}
	})
	// The stalls: partitions up off the floor on chrome feet; the left
	// one's door hanging off its last hinge, a sign on it; the right one's
	// door gone, and its toilet.
	const partitions = [312, 372, 434]
	r.push([315, 136, 57, 88, STALL_INSIDE])
	r.push([375, 136, 59, 88, TILE_GRIME])
	for (let y = 136 + TILE_SIZE - 3; y < 224; y += TILE_SIZE)
		r.push([375, y, 59, 1, GROUT_GRIME])
	for (const x of partitions) {
		r.push([x, 134, 3, 90, STALL])
		r.push([x, 134, 1, 90, STALL_LIT])
		r.push([x + 2, 134, 1, 90, STALL_SHADE])
		r.push([x, 133, 3, 1, CHROME])
		r.push([x + 1, 224, 1, 8, CHROME])
	}
	// The toilet, in the open stall, front on: its tank on the wall, lid
	// gone; its seat up against it, a ring; its bowl, wide, and the base.
	const tc = TOILET_CELL
	r.push([tc - 9, 172, 18, 14, PORCELAIN])
	r.push([tc - 9, 172, 18, 2, PORCELAIN_SHADE])
	r.push([tc + 6, 174, 3, 12, PORCELAIN_SHADE])
	r.push([tc - 7, 176, 3, 1, CHROME])
	r.push([tc - 8, 188, 16, 15, PORCELAIN])
	r.push([tc - 5, 191, 10, 9, STALL_INSIDE])
	r.push([tc + 5, 188, 3, 15, PORCELAIN_SHADE])
	r.push([tc - 11, 203, 22, 3, PORCELAIN])
	r.push([tc - 11, 203, 22, 1, CHROME_LIT])
	r.push([tc - 7, 204, 14, 1, DARK])
	r.push([tc - 10, 206, 20, 7, PORCELAIN])
	r.push([tc + 6, 206, 4, 7, PORCELAIN_SHADE])
	r.push([tc - 6, 213, 12, 4, PORCELAIN])
	r.push([tc - 5, 217, 10, 7, PORCELAIN])
	r.push([tc + 2, 213, 4, 11, PORCELAIN_SHADE])
	r.push([tc - 7, 224, 14, 2, PORCELAIN_DARK])
	r.push([tc - 9, 226, 18, 3, STAIN])
	// The hanging door: slumped off its top hinge, leant out a cell every
	// few rows, a gap at its top where it's come away.
	for (let row = 0; row < 84; row++) {
		const shift = Math.floor(row / 12)
		const x = 316 + shift
		const wide = 54 - Math.floor(row / 30)
		r.push([x, 142 + row, wide, 1, STALL])
		r.push([x, 142 + row, 1, 1, STALL_LIT])
		r.push([x + wide - 1, 142 + row, 1, 1, STALL_SHADE])
	}
	r.push([316, 142, 54, 1, STALL_LIT])
	r.push([314, 210, 3, 4, CHROME])
	r.push([314, 150, 3, 2, CHROME_SHADE])
	r.push([352, 176, 4, 3, CHROME])
	// OUT OF ORDER, on paper, taped to it.
	r.push([322, 156, 40, 22, SIGN])
	r.push([322, 156, 40, 1, PAPER_SHADE])
	r.push([320, 155, 5, 3, TAPE])
	r.push([359, 155, 5, 3, TAPE])
	extra.push(pixelText('OUT OF', 325, 159, 1, SIGN_RED))
	extra.push(pixelText('ORDER', 328, 168, 1, SIGN_RED))
	// The floor: stained tiles, a drain, dirt, puddles, its baseboard.
	r.push([0, FLOOR_TOP - 2, COLUMNS, 2, BASEBOARD])
	r.push([0, FLOOR_TOP, COLUMNS, ROWS - FLOOR_TOP, FLOOR])
	for (let y = FLOOR_TOP; y < ROWS; y += 6)
		for (let x = ((y - FLOOR_TOP) / 6) % 2 ? 0 : 6; x < COLUMNS; x += 12)
			r.push([x, y, 6, 6, FLOOR_ALT])
	for (let y = FLOOR_TOP; y < ROWS; y += 6)
		r.push([0, y, COLUMNS, 1, FLOOR_GROUT])
	for (const [x, y, w, h] of [
		[60, 236, 30, 6],
		[150, 250, 40, 8],
		[300, 240, 26, 5],
		[388, 254, 44, 6],
	])
		r.push([x, y, w, h, FLOOR_DIRT])
	r.push([236, 244, 12, 6, DARK])
	for (let x = 237; x < 248; x += 2) r.push([x, 245, 1, 4, CHROME_SHADE])
	for (const [x, y, w] of [
		[96, 240, 28],
		[390, 236, 30],
		[200, 258, 22],
	]) {
		r.push([x + 3, y, w - 6, 1, PUDDLE_LIT])
		r.push([x, y + 1, w, 2, PUDDLE])
		r.push([x + 3, y + 3, w - 6, 1, PUDDLE])
	}
	return rectsMarkup(r) + extra.join('')
}

/** The whole bathroom, the screen of it, as an image's URL. */
export const BATHROOM = svgUrl(COLUMNS, ROWS, bathroom())
