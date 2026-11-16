import {
	type PixelRect,
	pixelArt,
	pixelText,
	pixelTextWidth,
	rectsMarkup,
	svgUrl,
} from './pixelArt'

/**
 * Midnattsloppet's docks, along Hammarby kaj on Södermalm's side of the
 * water: bollards on the quay, boats moored along it, and a rock band
 * playing on a stage by the road, its speakers stacked up beside it. Each
 * a cell a pixel, drawn at 2, unless it says.
 *
 * It's midnight, so everything's dark and dim but what's lit: the stage's
 * lamps, and the boats' cabins.
 */

// --- Shared colours ---------------------------------------------------------

const INK = '#141418'
/** Black tolex, as speaker cabinets and amps are covered in, and its lit edge. */
const TOLEX = '#1a1b21'
const TOLEX_LIT = '#30323c'
const TOLEX_DARK = '#101115'
/** Their grille cloth, and its weave, a dot here and there. */
const GRILLE = '#24262e'
const WEAVE = '#30333d'
/** Steel: the scaffolding, the truss, a case's edges, in the dark. */
const STEEL = '#5a5e68'
const STEEL_LIT = '#7c818c'
const STEEL_DARK = '#3c3f48'

/** A disc, `r` across, round `cx`, `cy`: a row of cells a rect. */
function disc(cx: number, cy: number, r: number, fill: string): PixelRect[] {
	const rects: PixelRect[] = []
	for (let y = Math.floor(cy - r); y < cy + r; y++) {
		const dy = y + 0.5 - cy
		const half = Math.sqrt(Math.max(0, r * r - dy * dy))
		const left = Math.round(cx - half)
		const right = Math.round(cx + half)
		if (right > left) rects.push([left, y, right - left, 1, fill])
	}
	return rects
}

/** A speaker's cone, round `cx`, `cy`: its surround, the cone, and its dust cap, lit from above. */
function cone(cx: number, cy: number, r: number): PixelRect[] {
	return [
		...disc(cx, cy, r, '#2e3039'),
		...disc(cx, cy, r - 1, '#16171c'),
		...disc(cx, cy, r * 0.4, '#3a3d48'),
		[Math.round(cx - r * 0.3), Math.round(cy - r * 0.4), 2, 1, '#565a66'],
		[Math.round(cx - 2), Math.round(cy - r), 4, 1, '#454854'],
	]
}

// --- The band ----------------------------------------------------------------

const SKIN = '#d9a07a'
const SKIN_SHADE = '#b37c5a'
const SHOE = '#26262c'

interface Look {
	hair: string
	hairLit: string
	top: string
	topLit: string
	topShade: string
	legs: string
	legsShade: string
}

/**
 * Someone in the band, stood facing left (to the audience's side, as the
 * runners face), 9 by 28 from `x`, `y`: their head, body and legs, braced
 * apart. Their arms and whatever they're playing go on after.
 */
function player(x: number, y: number, look: Look): PixelRect[] {
	return [
		// Legs apart, and boots.
		[x + 1, y + 17, 2, 9, look.legs],
		[x + 6, y + 17, 2, 9, look.legsShade],
		[x + 2, y + 16, 5, 2, look.legs],
		[x + 0, y + 26, 3, 2, SHOE],
		[x + 6, y + 26, 3, 2, SHOE],
		// The body.
		[x + 2, y + 8, 6, 9, look.top],
		[x + 2, y + 8, 6, 1, look.topLit],
		[x + 7, y + 9, 1, 8, look.topShade],
		// The neck, and the head, its face to the left.
		[x + 3, y + 7, 3, 1, SKIN_SHADE],
		[x + 2, y + 1, 5, 6, SKIN],
		[x + 1, y + 4, 1, 1, SKIN],
		[x + 3, y + 6, 4, 1, SKIN_SHADE],
		[x + 5, y + 3, 1, 2, SKIN_SHADE],
		// Their hair, over the top and down the back.
		[x + 2, y + 0, 5, 2, look.hair],
		[x + 3, y + 0, 3, 1, look.hairLit],
		[x + 6, y + 1, 2, 4, look.hair],
		// An eye.
		[x + 2, y + 3, 1, 1, INK],
	]
}

/**
 * An electric guitar slung across someone at `x`, `y` (as `player`), its
 * neck up to the left and their hands on it: `long` for a bass.
 */
function guitar(
	x: number,
	y: number,
	body: string,
	bodyLit: string,
	bodyShade: string,
	sleeve: string,
	long = false,
): PixelRect[] {
	const neck = long ? 13 : 10
	const rects: PixelRect[] = [
		// The far arm, down to the strings.
		[x + 7, y + 9, 1, 5, sleeve],
		[x + 6, y + 13, 1, 2, sleeve],
		// The body, over the hip.
		[x + 1, y + 13, 7, 4, body],
		[x + 2, y + 12, 2, 1, body],
		[x + 5, y + 12, 2, 1, body],
		[x + 2, y + 17, 5, 1, bodyShade],
		[x + 2, y + 12, 2, 1, bodyLit],
		[x + 1, y + 13, 1, 1, bodyLit],
		// Its scratchplate and bridge.
		[x + 3, y + 14, 3, 2, '#d8d2c2'],
		[x + 4, y + 14, 1, 2, INK],
	]
	// Its neck, up and out to the left, a cell up every two along, and its head.
	for (let i = 0; i < neck; i++)
		rects.push([x + 1 - i, y + 14 - Math.floor(i / 2), 1, 1, '#8a6238'])
	const hx = x + 1 - neck
	const hy = y + 14 - Math.floor(neck / 2)
	rects.push(
		[hx - 1, hy - 1, 2, 2, INK],
		[hx - 1, hy - 1, 1, 1, '#4a4a52'],
		// The strumming hand, and the near arm out along the neck.
		[x + 5, y + 14, 2, 2, SKIN],
		[x + 2, y + 9, 1, 3, sleeve],
		[x - 1, y + 12, 3, 1, sleeve],
		[x - 3, y + 11, 2, 2, SKIN],
	)
	return rects
}

/** The singer, at the mic, from `x`, `y`: long fair hair, a black leather jacket over a red top, a fist up. */
function singer(x: number, y: number): PixelRect[] {
	const JACKET = '#2c2d36'
	return [
		...player(x, y, {
			hair: '#c9a64e',
			hairLit: '#e2c46e',
			top: JACKET,
			topLit: '#474a58',
			topShade: '#15161b',
			legs: '#2a3550',
			legsShade: '#1f2840',
		}),
		// The red top under the open jacket.
		[x + 3, y + 9, 2, 7, '#b8302e'],
		// Long hair, down past the shoulders.
		[x + 6, y + 5, 2, 5, '#c9a64e'],
		[x + 7, y + 9, 1, 2, '#a8873a'],
		// The mic stand, its foot, and the mic, up at the mouth.
		[x - 4, y + 6, 1, 21, STEEL],
		[x - 6, y + 27, 5, 1, STEEL_DARK],
		[x - 4, y + 5, 4, 1, STEEL],
		[x - 1, y + 4, 2, 2, INK],
		// A hand round the mic, the near arm up to it.
		[x + 2, y + 9, 1, 2, JACKET],
		[x + 0, y + 6, 2, 3, JACKET],
		[x + 0, y + 5, 2, 1, SKIN],
		// The other fist up in the air.
		[x + 7, y + 3, 1, 6, JACKET],
		[x + 8, y + 1, 1, 3, JACKET],
		[x + 8, y - 1, 2, 2, SKIN],
		// Singing: the mouth open.
		[x + 2, y + 5, 1, 1, '#6a2a2a'],
	]
}

/** The guitarist, from `x`, `y`: dark curls, a white T-shirt, a red guitar. */
function guitarist(x: number, y: number): PixelRect[] {
	const SHIRT = '#c8cbd2'
	return [
		...player(x, y, {
			hair: '#2a1d16',
			hairLit: '#46342a',
			top: SHIRT,
			topLit: '#e2e4ea',
			topShade: '#9ea2ac',
			legs: '#1e1f26',
			legsShade: '#15161b',
		}),
		// Curls, out over the ears.
		[x + 1, y + 0, 1, 3, '#2a1d16'],
		[x + 7, y + 2, 1, 3, '#2a1d16'],
		...guitar(x, y, '#b02c26', '#d2483c', '#7e1e1c', SKIN),
	]
}

/** The bassist, from `x`, `y`: a black beanie, a green check shirt, a blue bass, slung low. */
function bassist(x: number, y: number): PixelRect[] {
	const SHIRT = '#3d6a4a'
	return [
		...player(x, y, {
			hair: '#1c1c22',
			hairLit: '#33343c',
			top: SHIRT,
			topLit: '#548460',
			topShade: '#2c4e36',
			legs: '#3a4258',
			legsShade: '#2c3346',
		}),
		// The beanie, down to the eyebrows, and the check.
		[x + 2, y + 1, 6, 2, '#1c1c22'],
		[x + 3, y + 11, 1, 1, '#2c4e36'],
		[x + 5, y + 13, 1, 1, '#2c4e36'],
		...guitar(x, y + 1, '#2c5aa8', '#4a7acc', '#1e3e76', SHIRT, true),
	]
}

/**
 * The drummer, sat behind the kit on its riser, from `x`, `y` the kit's
 * top left, 34 by 26: a white vest, sticks up, the bass drum's head
 * facing out, toms, a snare, a hi-hat and a crash either side.
 */
function drums(x: number, y: number, hit = false): PixelRect[] {
	const SHELL = '#7a1f2a'
	const SHELL_LIT = '#a33442'
	const HEAD = '#cfcabd'
	const BRASS = '#b0893a'
	const BRASS_LIT = '#d8b25a'
	const VEST = '#d0d2d8'
	return [
		// The drummer: head, a vest, arms up, sticks.
		[x + 14, y + 0, 6, 6, SKIN],
		[x + 14, y + 0, 6, 2, '#5a3a24'],
		[x + 15, y + 0, 3, 1, '#7a5234'],
		[x + 14, y + 6, 6, 1, SKIN_SHADE],
		[x + 15, y + 3, 1, 1, INK],
		[x + 18, y + 3, 1, 1, INK],
		[x + 13, y + 7, 8, 8, VEST],
		[x + 13, y + 7, 8, 1, '#e8eaee'],
		...(hit
			? // Down on the toms: hands at them, sticks out and down.
				([
					[x + 11, y + 7, 2, 3, SKIN],
					[x + 21, y + 7, 2, 3, SKIN],
					[x + 10, y + 9, 2, 2, SKIN],
					[x + 22, y + 9, 2, 2, SKIN],
					[x + 8, y + 10, 2, 1, '#d8c49a'],
					[x + 7, y + 11, 1, 1, '#d8c49a'],
					[x + 24, y + 10, 2, 1, '#d8c49a'],
					[x + 26, y + 11, 1, 1, '#d8c49a'],
				] satisfies PixelRect[])
			: // Up, ready.
				([
					[x + 11, y + 6, 2, 5, SKIN],
					[x + 21, y + 6, 2, 5, SKIN],
					[x + 10, y + 4, 2, 2, SKIN],
					[x + 22, y + 4, 2, 2, SKIN],
					[x + 8, y + 1, 1, 3, '#d8c49a'],
					[x + 9, y + 3, 1, 1, '#d8c49a'],
					[x + 25, y + 1, 1, 3, '#d8c49a'],
					[x + 24, y + 3, 1, 1, '#d8c49a'],
				] satisfies PixelRect[])),
		// The crash, left, and the ride, right, on their stands.
		[x + 1, y + 7, 9, 1, BRASS],
		[x + 4, y + 6, 3, 1, BRASS_LIT],
		[x + 5, y + 8, 1, 17, STEEL],
		[x + 25, y + 9, 9, 1, BRASS],
		[x + 28, y + 8, 3, 1, BRASS_LIT],
		[x + 29, y + 10, 1, 15, STEEL],
		// The toms, over the bass drum.
		[x + 10, y + 12, 6, 4, SHELL],
		[x + 10, y + 11, 6, 1, HEAD],
		[x + 18, y + 12, 6, 4, SHELL],
		[x + 18, y + 11, 6, 1, HEAD],
		// The snare, left, and the floor tom, right.
		[x + 4, y + 17, 7, 3, '#8c9098'],
		[x + 4, y + 16, 7, 1, HEAD],
		[x + 24, y + 16, 8, 8, SHELL],
		[x + 24, y + 15, 8, 1, HEAD],
		[x + 24, y + 16, 1, 8, SHELL_LIT],
		[x + 25, y + 24, 1, 2, STEEL],
		[x + 30, y + 24, 1, 2, STEEL],
		// The bass drum, its head out to the audience, a scoop on it.
		...disc(x + 17, y + 20, 7, SHELL),
		...disc(x + 17, y + 20, 6, HEAD),
		[x + 14, y + 19, 6, 3, '#d3a54a'],
		[x + 15, y + 18, 4, 1, '#d3a54a'],
		[x + 19, y + 17, 2, 2, '#c7832c'],
		[x + 15, y + 22, 4, 1, '#b8893a'],
		[x + 12, y + 25, 2, 1, STEEL],
		[x + 21, y + 25, 2, 1, STEEL],
	]
}

/**
 * A guitar amp, 14 by 20 from `x`, `y`: a head on a four-by-twelve cab,
 * black tolex, its grille, a brass name plate, its knobs and its red light.
 */
function amp(x: number, y: number): PixelRect[] {
	const rects: PixelRect[] = [
		// The head.
		[x, y, 14, 5, TOLEX],
		[x, y, 14, 1, TOLEX_LIT],
		[x + 1, y + 2, 12, 2, '#b0893a'],
		[x + 1, y + 2, 12, 1, '#c8a456'],
		[x + 12, y + 2, 1, 1, '#ff3a2e'],
		// The cab, its grille, a weave dot here and there.
		[x, y + 5, 14, 15, TOLEX],
		[x, y + 5, 14, 1, TOLEX_LIT],
		[x + 1, y + 7, 12, 12, GRILLE],
		[x + 13, y + 6, 1, 14, TOLEX_DARK],
		[x + 5, y + 8, 4, 1, '#b8b4a8'],
	]
	for (let i = 0; i < 4; i++)
		rects.push([
			x + 3 + (i % 2) * 6,
			y + 11 + Math.floor(i / 2) * 4,
			1,
			1,
			WEAVE,
		])
	return rects
}

/**
 * How many ticks the stage holds each of its frames: half a beat of the
 * music, which is at 128 a minute, so the band plays along with it.
 */
export const STAGE_FRAME_TICKS = 14

/**
 * The rock band, on its stage by the road: a black deck up on scaffolding,
 * a truss over it on two towers, coloured lamps hung from it and shining
 * down through the smoke, a dark drape behind with MIDNATTSLOPPET across
 * it. In front of that, from the left: the guitarist, the singer at the
 * mic, the drummer up on a riser, the bassist; amps behind them, monitor
 * wedges at the front. 170 by 100, in four frames, playing: the drummer's
 * sticks coming down and the rest bouncing on the beat, the lamps changing
 * over every other one.
 */
export const STAGE_FRAMES = (() => {
	const W = 170
	const H = 100
	/** The deck's top, where the band stand. */
	const DECK = 62
	/** The truss, how far down, and how deep. */
	const TRUSS = 4
	const TRUSS_H = 6
	const rects: PixelRect[] = []

	// The drape, behind it all, its folds.
	rects.push([8, TRUSS + TRUSS_H, W - 16, DECK - TRUSS - TRUSS_H, '#0e1019'])
	for (let x = 12; x < W - 10; x += 7)
		rects.push([x, TRUSS + TRUSS_H, 1, DECK - TRUSS - TRUSS_H, '#151827'])

	// The banner on it, the race's blue, dimmed.
	const BANNER = 'MIDNATTSLOPPET'
	const bw = pixelTextWidth(BANNER, 1) + 8
	const bx = Math.round((W - bw) / 2)
	rects.push([bx, 18, bw, 11, '#14306e'], [bx, 18, bw, 1, '#1f4290'])

	// The lamps' beams, coloured, slanting down through the smoke to the deck.
	const LAMPS: [number, string, number][] = [
		[20, '255, 70, 200', 14],
		[38, '80, 220, 255', -6],
		[56, '255, 190, 70', 10],
		[74, '255, 70, 70', -12],
		[94, '120, 130, 255', 12],
		[112, '255, 70, 200', -10],
		[130, '80, 220, 255', 8],
		[148, '255, 190, 70', -14],
	]
	const LENS = TRUSS + TRUSS_H + 5
	/** What's behind the beams: the drape, the banner. */
	const behind = rects.splice(0)
	/** The beams, every other lamp's in turn, on the beat. */
	const beams: [PixelRect[], PixelRect[]] = [[], []]
	for (const [i, [lx, rgb, lean]] of LAMPS.entries())
		for (let y = LENS + 1; y < DECK; y++) {
			const t = (y - LENS) / (DECK - LENS)
			const middle = lx + 2 + lean * t
			const half = 1 + t * 4
			beams[i % 2].push([
				Math.round(middle - half),
				y,
				Math.round(half * 2),
				1,
				`rgba(${rgb}, 0.11)`,
			])
		}

	// The truss's towers, either end, down to the road: their lattice.
	for (const tx of [2, W - 8]) {
		rects.push([tx, TRUSS, 1, H - TRUSS, STEEL_LIT])
		rects.push([tx + 5, TRUSS, 1, H - TRUSS, STEEL_DARK])
		for (let y = TRUSS + TRUSS_H; y < H - 2; y += 6)
			for (let k = 0; k < 5; k++)
				rects.push([tx + 1 + Math.min(k, 3), y + k, 1, 1, STEEL])
		rects.push([tx - 2, H - 2, 10, 2, STEEL_DARK])
		rects.push([tx - 2, H - 2, 10, 1, STEEL])
	}
	// The truss across, its two chords and the zigzag between.
	rects.push([2, TRUSS, W - 4, 1, STEEL_LIT])
	rects.push([2, TRUSS + TRUSS_H - 1, W - 4, 1, STEEL_DARK])
	for (let x = 4; x < W - 4; x += 4)
		for (let k = 0; k < TRUSS_H - 2; k++)
			rects.push([x + Math.min(k, 3), TRUSS + 1 + k, 1, 1, STEEL])

	// The lamps, hung under it: a clamp, a can, and a lit lens, glowing.
	for (const [lx, rgb] of LAMPS) {
		const [r, g, b] = rgb.split(', ').map(Number)
		const lit = `rgb(${r}, ${g}, ${b})`
		rects.push(
			[lx + 1, TRUSS + TRUSS_H, 2, 1, STEEL_DARK],
			[lx, TRUSS + TRUSS_H + 1, 4, 4, '#22232a'],
			[lx, TRUSS + TRUSS_H + 1, 4, 1, '#3a3c46'],
			[lx - 2, LENS - 1, 8, 4, `rgba(${rgb}, 0.18)`],
			[lx - 1, LENS, 6, 2, `rgba(${rgb}, 0.3)`],
			[lx, LENS, 4, 1, lit],
			[lx + 1, LENS, 2, 1, '#fff6ea'],
		)
	}

	// The amps, behind the guitarist and the bassist.
	rects.push(...amp(14, DECK - 20), ...amp(141, DECK - 20))

	// The drum riser, and the drummer on it.
	rects.push([66, DECK - 8, 38, 8, '#16171d'], [66, DECK - 8, 38, 1, '#2c2e38'])
	/** What's behind the band: the truss, the lamps, the amps, the riser. */
	const middle = rects.splice(0)
	// The band, playing, on the beat: the drummer's sticks coming down,
	// and the three out front bouncing, the singer on the off-beat.
	const band = [false, true].map((on) =>
		rectsMarkup([
			...drums(68, DECK - 34, on),
			...guitarist(36, DECK - 28 - (on ? 1 : 0)),
			...singer(54, DECK - 28 - (on ? 0 : 1)),
			...bassist(116, DECK - 28 - (on ? 1 : 0)),
		]),
	)

	// Monitor wedges at the front of the deck, angled up at them.
	for (const mx of [30, 46, 120]) {
		rects.push([mx, DECK - 4, 10, 4, TOLEX])
		rects.push([mx + 3, DECK - 5, 7, 1, TOLEX_LIT])
		rects.push([mx + 1, DECK - 3, 7, 2, GRILLE])
	}

	// The deck, black, its front edge lit by the lamps.
	rects.push([6, DECK, W - 12, 5, '#17181e'])
	rects.push([6, DECK, W - 12, 1, '#3a3c4a'])
	rects.push([6, DECK + 4, W - 12, 1, '#0d0e12'])

	// The scaffolding it's up on: standards, ledgers, a brace in each bay.
	const LEGS = [12, 38, 64, 90, 116, 142, 157]
	for (const x of LEGS) rects.push([x, DECK + 5, 1, H - DECK - 6, STEEL])
	for (const y of [DECK + 13, DECK + 24])
		rects.push([12, y, 146, 1, STEEL_DARK])
	for (let i = 0; i < LEGS.length - 1; i++) {
		const from = LEGS[i] + 1
		const span = LEGS[i + 1] - from
		const top = DECK + 14
		for (let k = 0; k < 10; k++)
			rects.push([
				from + Math.floor((k * span) / 10),
				top + k,
				Math.ceil(span / 10),
				1,
				STEEL_DARK,
			])
	}
	for (const x of LEGS) rects.push([x - 1, H - 1, 3, 1, STEEL_DARK])

	// Four frames, two beats: the band on and off the beat, twice, and
	// the lamps' beams changing over between them.
	return [0, 1, 2, 3].map((frame) =>
		svgUrl(
			W,
			H,
			rectsMarkup(behind) +
				rectsMarkup(beams[frame >> 1]) +
				rectsMarkup(middle) +
				band[frame % 2] +
				rectsMarkup(rects) +
				pixelText(BANNER, bx + 4, 20, 1, '#a8b8e0'),
		),
	)
})()

// --- The speaker stacks -------------------------------------------------------
//
// Beside the stage, to be stood on (Platforms): a tall stack, and a low
// flight case to get up onto it from. Each its top at the top of its
// picture, down to the road. In screen pixels.

/**
 * The PA, a column of four black cabinets, their corners capped in steel:
 * a horn on top, two cones, a cab with its grille on, and the sub at the
 * bottom, its big cone showing.
 */
export const SPEAKER_STACK = (() => {
	const W = 28
	const rects: PixelRect[] = []
	/** A cabinet, `h` tall from `y`: its tolex, a lit top, a shaded side and its corners. */
	const cab = (y: number, h: number) =>
		rects.push(
			[0, y, W, h, TOLEX],
			[0, y, W, 1, TOLEX_LIT],
			[W - 2, y + 1, 2, h - 1, TOLEX_DARK],
			[0, y + h - 1, W, 1, TOLEX_DARK],
			[0, y, 2, 2, STEEL],
			[W - 2, y, 2, 2, STEEL_DARK],
			[0, y + h - 2, 2, 2, STEEL_DARK],
			[W - 2, y + h - 2, 2, 2, STEEL_DARK],
			[0, y, 1, 1, STEEL_LIT],
		)
	// The top: its horn's mouth, flared.
	cab(0, 14)
	rects.push(
		[3, 3, 22, 8, GRILLE],
		[5, 4, 18, 6, '#111216'],
		[9, 5, 10, 4, '#0b0b0e'],
		[3, 3, 22, 1, '#2e3039'],
		[12, 6, 4, 2, '#3a3d48'],
	)
	// Two cones, side by side.
	cab(14, 16)
	rects.push(...cone(8, 22, 5), ...cone(20, 22, 5))
	// A cab with its grille on, the weave dotted, and a crew's stencil on it.
	cab(30, 18)
	rects.push([2, 32, 24, 14, GRILLE])
	for (let y = 34; y < 45; y += 4)
		for (let x = 4 + ((y / 2) % 2) * 2; x < 25; x += 6)
			rects.push([x, y, 1, 1, WEAVE])
	// The sub, its big cone.
	cab(48, 24)
	rects.push(...cone(14, 60, 9))
	return {
		asset: pixelArt(W, 72, rects),
		width: 56,
		height: 144,
	}
})()

/**
 * The flight case at the stack's foot, to jump up onto it from: black
 * panels in steel edging, ball corners, butterfly catches and a handle,
 * SCOOP stencilled on it, on castors.
 */
export const MONITOR = (() => {
	const W = 36
	const H = 30
	const rects: PixelRect[] = [
		// Its panels.
		[0, 0, W, H - 3, TOLEX],
		[2, 2, W - 4, H - 7, '#1e1f26'],
		// The steel edging round it, and along the lid's join.
		[0, 0, W, 2, STEEL],
		[0, 0, W, 1, STEEL_LIT],
		[0, 2, 2, H - 5, STEEL],
		[W - 2, 2, 2, H - 5, STEEL_DARK],
		[0, H - 5, W, 2, STEEL_DARK],
		[0, 8, W, 1, STEEL],
		[0, 9, W, 1, STEEL_DARK],
		// Ball corners.
		[0, 0, 3, 3, STEEL_LIT],
		[W - 3, 0, 3, 3, STEEL],
		[0, H - 6, 3, 3, STEEL],
		[W - 3, H - 6, 3, 3, STEEL_DARK],
		// Butterfly catches over the join, and a handle.
		[7, 7, 4, 4, STEEL_LIT],
		[8, 8, 2, 2, STEEL_DARK],
		[W - 11, 7, 4, 4, STEEL_LIT],
		[W - 10, 8, 2, 2, STEEL_DARK],
		[14, 4, 8, 2, STEEL_DARK],
		[15, 4, 6, 1, STEEL],
		// Its castors.
		[3, H - 3, 5, 3, INK],
		[5, H - 2, 1, 1, STEEL],
		[W - 8, H - 3, 5, 3, INK],
		[W - 6, H - 2, 1, 1, STEEL],
	]
	return {
		asset: svgUrl(
			W,
			H,
			rectsMarkup(rects) +
				pixelText(
					'SCOOP',
					Math.floor((W - pixelTextWidth('SCOOP', 1)) / 2),
					13,
					1,
					'#9a9ca4',
				),
		),
		width: 72,
		height: 60,
	}
})()

// --- The quay ----------------------------------------------------------------

/**
 * A mooring bollard on the quay, cast iron, its cap over a waist, a loop of
 * rope round it: jumped as a rock. In screen pixels.
 */
export const BOLLARD = {
	asset: pixelArt(8, 10, [
		// Its body, flaring to its foot.
		[2, 3, 4, 3, '#2a2d34'],
		[1, 6, 6, 3, '#2a2d34'],
		[0, 9, 8, 1, '#1d1f25'],
		[5, 3, 1, 6, '#1d1f25'],
		[6, 6, 1, 3, '#1d1f25'],
		// Its cap, lit along the top.
		[0, 1, 8, 2, '#2a2d34'],
		[1, 0, 6, 1, '#4a4e5a'],
		[0, 1, 1, 1, '#3c4049'],
		[6, 2, 2, 1, '#1d1f25'],
		// The rope, round its waist.
		[1, 4, 6, 1, '#7c6e54'],
		[2, 4, 3, 1, '#968766'],
	]),
	width: 16,
	height: 20,
}

/**
 * A boat moored along the quay, bow to the right: an old wooden
 * archipelago boat, its white hull dim in the dark, its cabin's windows
 * lit, a masthead light, the Swedish flag at its stern and its line down
 * to the quay. 90 by 30.
 */
export const mooredBoat = (() => {
	const HULL = '#767c88'
	const HULL_LIT = '#9096a2'
	const HULL_SHADE = '#5a5f6a'
	const CABIN = '#6e5a46'
	const CABIN_LIT = '#86705a'
	const ROOF = '#9aa0aa'
	const WINDOW = '#ffcf6e'
	const GLOW = 'rgba(255, 210, 110, 0.12)'
	const rects: PixelRect[] = []

	// The hull: its sheer rising to the bow, its stem raked back under it,
	// its stern tucked in at the bottom.
	const SHEER: Record<number, number> = { 14: 84, 15: 80, 16: 74, 17: 66 }
	for (let y = 14; y < 30; y++) {
		const left = SHEER[y] ?? 3 + Math.max(0, Math.floor((y - 26) * 1.5))
		const right = 88 - Math.floor(Math.max(0, y - 16) ** 1.5 / 2)
		rects.push([left, y, right - left, 1, HULL])
		const litTo = y === 14 ? right : SHEER[y - 1]
		if (litTo) rects.push([left, y, litTo - left, 1, HULL_LIT])
	}
	// A rubbing strake, the waterline's dark stripe, and the hull's shade.
	rects.push([3, 19, 82, 1, '#5a4636'])
	rects.push([3, 27, 70, 1, '#3e2a2a'])
	rects.push([3, 28, 68, 2, HULL_SHADE])
	// Fenders hung over the side.
	for (const fx of [16, 36, 56])
		rects.push([fx, 20, 3, 5, '#3a3c44'], [fx, 20, 3, 1, '#565a64'])

	// The cabin: varnished wood, its roof, its windows lit.
	rects.push([14, 8, 44, 8, CABIN])
	rects.push([14, 8, 44, 1, CABIN_LIT])
	rects.push([12, 6, 48, 2, ROOF])
	rects.push([12, 6, 48, 1, '#b4bac2'])
	for (const wx of [17, 26, 35, 44]) {
		rects.push([wx - 1, 9, 8, 6, GLOW])
		rects.push([wx, 10, 6, 4, WINDOW])
		rects.push([wx, 10, 6, 1, '#ffe6a8'])
		rects.push([wx + 3, 10, 1, 4, CABIN])
	}
	// The wheelhouse, forward, its windscreen dark but for a lit dial.
	rects.push([58, 3, 12, 13, CABIN])
	rects.push([58, 3, 12, 1, CABIN_LIT])
	rects.push([57, 1, 14, 2, ROOF])
	rects.push([60, 5, 9, 4, '#2c3446'])
	rects.push([60, 5, 9, 1, '#3c4660'])
	rects.push([62, 7, 1, 1, '#9cf0b0'])
	// The mast over it, and its white light at the top.
	rects.push([64, 0, 1, 1, '#fffbe8'])
	rects.push([62, 0, 5, 1, 'rgba(255, 250, 230, 0.15)'])

	// The flag at the stern: Sweden's, dimmed by the dark.
	rects.push([4, 4, 1, 13, '#b8a274'])
	rects.push([5, 4, 7, 5, '#2a5490'])
	rects.push([7, 4, 1, 5, '#c8a83a'])
	rects.push([5, 6, 7, 1, '#c8a83a'])

	// Its line, from the bow down to the quay.
	for (let k = 0; k < 6; k++) rects.push([84 + k, 18 + k * 2, 1, 2, '#8a7c5e'])
	return pixelArt(90, 30, rects)
})()
