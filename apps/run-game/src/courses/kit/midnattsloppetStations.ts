import {
	type PixelRect,
	pixelArt,
	pixelText,
	pixelTextWidth,
	rectsMarkup,
	svgUrl,
} from './pixelArt'
import { seeded } from './seeded'

/**
 * What's laid on along Midnattsloppet's way: the drinks station, the
 * showers over the road, a korv kiosk, the banana stand and its dancing
 * bananas, what's dropped on the road past them, and Hornsgatan's crowds
 * behind the barriers. Each a cell a pixel, drawn at 2 (`scale: 2`),
 * unless it says.
 *
 * It's midnight: everything's dark and dulled but what gives off light,
 * the kiosk's hatch and its sign, a phone held up, bright, a faint halo
 * round each.
 */

// --- Shared colours ---------------------------------------------------------

const INK = '#1d1d1d'
/** Steel, under the street lamps: poles, table legs, barriers. */
const STEEL = '#6e7482'
const STEEL_LIT = '#8f95a2'
const STEEL_DARK = '#4c515e'
/** The race's blue, on its banners and cloths, dulled by the dark. */
const RACE_BLUE = '#1a48a8'
const RACE_BLUE_LIT = '#2a5cc4'
const RACE_BLUE_DARK = '#13357c'
/** Paper cups, white, grey in the dark. */
const CUP = '#c3c7d3'
const CUP_LIT = '#e1e4ec'
const CUP_SHADE = '#959aab'
/** Bananas, yellow, a bit duller at night; their ends and stalks. */
const BANANA = '#d2b530'
const BANANA_LIT = '#ead25a'
const BANANA_SHADE = '#a2861f'
const BANANA_END = '#4f3f1c'
/** Skin, and hair, in the half-light. */
const SKINS = ['#c99a7c', '#a87a5e', '#7a5440', '#d8b096']
const HAIRS = ['#2a2220', '#5a4632', '#9a8458', '#1d1d1d', '#6a3a26']

/** Rows of letters, a colour a letter, `.` empty, as rects: for small things. */
function letters(rows: string[], key: Record<string, string>): PixelRect[] {
	const rects: PixelRect[] = []
	rows.forEach((row, y) => {
		for (let x = 0; x < row.length; ) {
			const c = row[x]
			let end = x + 1
			while (row[end] === c) end++
			if (key[c]) rects.push([x, y, end - x, 1, key[c]])
			x = end
		}
	})
	return rects
}

// --- The drinks station -------------------------------------------------------

/** The volunteers' vests, yellow, a reflective band round them. */
const VEST = '#b9b83a'
const VEST_SHADE = '#94932c'
const REFLECTOR = '#d6dae2'
const TABLE = '#8d919e'
const TABLE_LIT = '#aeb2bd'
const TABLE_SHADE = '#5f6370'

/** A volunteer behind the table, from the waist up, `x` their left, holding a cup out or not. */
function volunteer(x: number, skin: string, hair: string, cup: boolean) {
	const rects: PixelRect[] = [
		// Their head, and hair.
		[x + 1, 11, 4, 4, skin],
		[x + 1, 10, 4, 2, hair],
		[x + 4, 12, 1, 2, hair],
		[x + 1, 13, 1, 1, INK],
		// Their vest, its band.
		[x, 15, 6, 6, VEST],
		[x + 5, 15, 1, 6, VEST_SHADE],
		[x, 18, 6, 1, REFLECTOR],
	]
	if (cup)
		rects.push(
			// An arm out over the table, a cup in its hand.
			[x - 4, 16, 4, 2, VEST],
			[x - 5, 16, 1, 2, skin],
			[x - 7, 14, 2, 3, CUP],
			[x - 7, 14, 2, 1, CUP_LIT],
		)
	return rects
}

/** The drinks station: a long table, paper cups lined up on it, a VATTEN banner over it. 80 by 30. */
export const drinksStation = svgUrl(
	80,
	30,
	rectsMarkup([
		// The banner's poles, either end.
		[1, 0, 2, 30, STEEL],
		[1, 0, 1, 30, STEEL_LIT],
		[77, 0, 2, 30, STEEL],
		[77, 0, 1, 30, STEEL_LIT],
		// The banner, the race's blue, strung between them.
		[3, 1, 74, 9, RACE_BLUE],
		[3, 1, 74, 1, RACE_BLUE_LIT],
		[3, 9, 74, 1, RACE_BLUE_DARK],
		// A drop of water either side of the word.
		...[13, 63].flatMap((x): PixelRect[] => [
			[x + 1, 3, 1, 1, '#9cc4ff'],
			[x, 4, 3, 3, '#9cc4ff'],
			[x, 4, 1, 1, '#d4e6ff'],
		]),
		// Two volunteers, behind it, one holding a cup out.
		...volunteer(30, SKINS[0], HAIRS[2], true),
		...volunteer(52, SKINS[2], HAIRS[0], false),
		// The table: its top, lit, its edge under, its folding legs.
		[4, 20, 72, 2, TABLE],
		[4, 20, 72, 1, TABLE_LIT],
		[4, 22, 72, 1, TABLE_SHADE],
		...[8, 70].flatMap((x): PixelRect[] => [
			[x, 23, 2, 7, STEEL_DARK],
			[x - 1, 29, 4, 1, STEEL_DARK],
		]),
		[9, 26, 62, 1, STEEL_DARK],
		// Cups, lined up along it, filled; a gap or two where one's been taken.
		...[6, 9, 12, 15, 18, 21, 27, 36, 39, 42, 45, 48, 58, 61, 64].flatMap(
			(x): PixelRect[] => [
				[x, 17, 2, 3, CUP],
				[x, 17, 2, 1, CUP_LIT],
				[x + 1, 18, 1, 2, CUP_SHADE],
			],
		),
		// A water cooler, at the end: blue, its tap.
		[67, 12, 7, 8, '#3d6a9a'],
		[67, 12, 7, 1, '#5a88b8'],
		[73, 12, 1, 8, '#2c4f76'],
		[69, 10, 3, 2, '#5a88b8'],
		[66, 16, 1, 2, STEEL_DARK],
	]) +
		pixelText(
			'VATTEN',
			40 - Math.ceil(pixelTextWidth('VATTEN', 1) / 2),
			2,
			1,
			'#e4e8f2',
		),
)

// --- The shower ---------------------------------------------------------------

const PIPE = '#7a808e'
const PIPE_LIT = '#a2a8b4'
const PIPE_DARK = '#525866'
/** Where the nozzles are, along the pipe, and the row they're on. */
const NOZZLES = [10, 16, 22, 28, 34]
const NOZZLE_ROW = 9
/** The front's rows, down from the back's: the path's width between them, in cells. */
const FRONT_DROP = 14

/**
 * Water spraying down, from the nozzles, onto the road: from each, three
 * streaks, fanning out as they fall, broken into drops, a brighter one at
 * the head of each.
 */
function spray(
	top: number,
	bottom: number,
	drop: number,
	alpha: number,
	seed: number,
	/** How far its dashes have fallen, in cells: for frames of it falling. */
	fall = 0,
) {
	const random = seeded(seed)
	const rects: PixelRect[] = []
	for (const nozzle of NOZZLES) {
		for (const lean of [-1, 0, 1]) {
			const phase = Math.floor(random() * 9)
			for (let y = top; y < bottom; y++) {
				/** How far it's fallen, in cells, from the nozzle. */
				const fallen = y + drop - NOZZLE_ROW - 1
				if (fallen < 0) continue
				// Dashes, falling, not a solid line.
				const along = (((y + drop + phase - fall) % 9) + 9) % 9
				if (along > 5) continue
				const x = Math.round(nozzle + 0.5 + lean * (0.5 + fallen * 0.06))
				rects.push([
					x,
					y,
					1,
					1,
					along === 5
						? `rgba(226, 240, 255, ${Math.min(1, alpha * 2.2)})`
						: `rgba(170, 206, 255, ${alpha})`,
				])
			}
		}
	}
	return rects
}

/** The spray's frames, falling a third of its dashes' length each, round and round. */
const FALLING = [0, 3, 6]

/**
 * A shower over the road, cooling runners down: a post at the roadside, a
 * pipe out over the road, water spraying down from it, falling: frames
 * of it (see `FALLING`). Its back, behind whoever's under it, and its
 * spray, in front of them. In screen pixels.
 */
export const SHOWER = {
	asset: FALLING.map((fall) =>
		svgUrl(
			40,
			60,
			rectsMarkup([
				// A mist of it, behind, from the nozzles to the road.
				[
					6,
					NOZZLE_ROW + 4,
					32,
					60 - NOZZLE_ROW - 4,
					'rgba(150, 190, 245, 0.08)',
				],
			]) +
				rectsMarkup(spray(NOZZLE_ROW + 1, 60, 0, 0.2, 3, fall)) +
				rectsMarkup([
					// The road under it, wet: a sheen.
					[4, 58, 36, 2, 'rgba(150, 190, 245, 0.22)'],
					// The post, at the roadside, its foot, and a hose to it.
					[3, 7, 3, 51, PIPE],
					[3, 7, 1, 51, PIPE_LIT],
					[5, 7, 1, 51, PIPE_DARK],
					[1, 57, 7, 3, PIPE_DARK],
					[1, 57, 7, 1, PIPE],
					[0, 59, 1, 1, '#2f5a3a'],
					[6, 44, 2, 3, '#a8322a'],
					[6, 44, 2, 1, '#c8483e'],
					// The pipe, bent over at the top and out across the road, a cap on its end.
					[4, 5, 3, 3, PIPE],
					[4, 5, 3, 1, PIPE_LIT],
					[6, 5, 32, 3, PIPE],
					[6, 5, 32, 1, PIPE_LIT],
					[6, 7, 32, 1, PIPE_DARK],
					[37, 4, 2, 5, PIPE_DARK],
					// Its nozzles, underneath.
					...NOZZLES.map((x): PixelRect => [x, 8, 2, 1, PIPE_DARK]),
					...NOZZLES.map((x): PixelRect => [x, NOZZLE_ROW, 2, 1, STEEL_DARK]),
					// A blue race sign, tied to the post.
					[0, 22, 9, 6, RACE_BLUE],
					[0, 22, 9, 1, RACE_BLUE_LIT],
					[2, 24, 5, 2, '#9cc4ff'],
				]),
		),
	),
	front: FALLING.map((fall) =>
		svgUrl(
			40,
			60,
			// Its near side, over whoever's in it: streaks, and drops.
			rectsMarkup(spray(0, 54, FRONT_DROP, 0.28, 8, fall)) +
				rectsMarkup([
					// Splashing off the road, at the path's near edge.
					[4, 54, 35, 3, 'rgba(170, 206, 255, 0.22)'],
					...[7, 12, 18, 24, 30, 35].flatMap((x, i): PixelRect[] => [
						[x, 52 - (i % 2), 1, 1, 'rgba(226, 240, 255, 0.6)'],
						[x + 2, 53 + (i % 2), 1, 1, 'rgba(226, 240, 255, 0.5)'],
					]),
				]),
		),
	),
	/** A frame every few ticks: the spray falling fast. */
	frameTicks: 6,
	width: 80,
	height: 120,
}

// --- The korv kiosk -----------------------------------------------------------

const KIOSK = '#2f4a40'
const KIOSK_LIT = '#3e5e51'
const KIOSK_SHADE = '#22362f'
/** Its hatch, open: lit, warm, inside. */
const GLOW = '#f2c06a'
const GLOW_SHADE = '#cf9a4c'

/** A korv kiosk, open late, its hatch lit. 50 by 44. */
export const korvKiosk = svgUrl(
	50,
	44,
	rectsMarkup([
		// Its sign, on the roof, lit up from inside, a halo round it.
		[4, 0, 42, 13, 'rgba(255, 200, 120, 0.10)'],
		[6, 1, 38, 10, '#b8382e'],
		[6, 1, 38, 1, '#d4523f'],
		[6, 10, 38, 1, '#8a2a24'],
		[12, 11, 2, 2, STEEL_DARK],
		[36, 11, 2, 2, STEEL_DARK],
		// Its roof, jutting out.
		[2, 13, 46, 3, '#3a3e48'],
		[2, 13, 46, 1, '#545a66'],
		// Its walls, painted green.
		[4, 16, 42, 28, KIOSK],
		[4, 16, 2, 28, KIOSK_LIT],
		[43, 16, 3, 28, KIOSK_SHADE],
		// Light from the hatch, on the wall round it.
		[7, 18, 36, 18, 'rgba(255, 200, 120, 0.12)'],
		// The hatch, open, lit: its shutter propped up over it.
		[9, 16, 32, 2, '#4a3a32'],
		[9, 16, 32, 1, '#6a5446'],
		[10, 19, 30, 13, GLOW],
		// Inside: a shelf of buns, the steam off the pot.
		[10, 19, 30, 1, '#fbe0a4'],
		[12, 22, 26, 1, GLOW_SHADE],
		...[13, 17, 31, 35].map((x): PixelRect => [x, 20, 3, 2, '#c07a3a']),
		[30, 26, 8, 4, '#7a7e88'],
		[30, 26, 8, 1, '#a4a8b0'],
		[32, 23, 1, 2, 'rgba(255, 255, 255, 0.7)'],
		[35, 22, 1, 2, 'rgba(255, 255, 255, 0.5)'],
		// The man in it, a white paper hat, handing one over.
		[18, 23, 4, 4, '#c98a64'],
		[18, 21, 4, 2, '#f4efe6'],
		[18, 24, 1, 1, INK],
		[16, 27, 8, 5, '#f4efe6'],
		[23, 27, 1, 5, '#d6cfc2'],
		[12, 28, 4, 2, '#f4efe6'],
		[10, 27, 3, 2, '#c98a64'],
		// A korv in a bun, held out.
		[9, 26, 4, 1, '#e2ac5c'],
		[9, 25, 4, 1, '#b84a2a'],
		// The counter's ledge, steel, ketchup and mustard on it.
		[8, 32, 34, 2, STEEL],
		[8, 32, 34, 1, STEEL_LIT],
		[34, 29, 2, 3, '#b8302a'],
		[37, 29, 2, 3, '#d0a222'],
		[34, 28, 1, 1, '#d0d4dc'],
		[37, 28, 1, 1, '#d0d4dc'],
		// What's on: a board, under the hatch.
		[10, 35, 30, 9, '#d8d0b8'],
		[10, 35, 30, 1, '#ece4cc'],
		// Its foot.
		[4, 43, 42, 1, KIOSK_SHADE],
	]) +
		pixelText(
			'KORV',
			25 - Math.ceil(pixelTextWidth('KORV', 1) / 2),
			2,
			1,
			'#ffe6b0',
		) +
		pixelText(
			'35 KR',
			25 - Math.ceil(pixelTextWidth('35 KR', 1) / 2),
			36,
			1,
			'#3a2a22',
		),
)

// --- The bananas ----------------------------------------------------------------

/** A hand of bananas, `x`, `y` its top left, 8 by 5: curved up, stalk to one end, ends dark. */
const bunch = (x: number, y: number, flip: boolean): PixelRect[] =>
	letters(
		['ee......', '.LL...LL', '.YYLLLYY', '..YYYYYS', '...SSSS.'].map((row) =>
			flip ? [...row].reverse().join('') : row,
		),
		{ e: BANANA_END, L: BANANA_LIT, Y: BANANA, S: BANANA_SHADE },
	).map(([dx, dy, w, h, c]) => [x + dx, y + dy, w, h, c])

/** The banana stand, bananas heaped on it, a BANANER sign. 56 by 40. */
export const bananaStand = svgUrl(
	56,
	40,
	rectsMarkup([
		// Its sign, on two posts.
		[4, 0, 2, 28, STEEL_DARK],
		[50, 0, 2, 28, STEEL_DARK],
		[3, 1, 50, 11, '#2a2f4a'],
		[3, 1, 50, 1, '#3a4062'],
		[3, 11, 50, 1, '#1d2136'],
		// The heap, hands on hands, one green, not ready yet.
		[8, 22, 40, 4, BANANA_SHADE],
		...[
			[6, 21],
			[13, 22],
			[20, 21],
			[27, 22],
			[34, 21],
			[41, 22],
			[10, 18],
			[17, 17],
			[24, 18],
			[31, 17],
			[38, 18],
			[14, 14],
			[22, 13],
			[30, 14],
		].flatMap(([x, y], i) => bunch(x, y, i % 2 === 1)),
		...letters(['.gg...gg', '..ggggg.'], { g: '#7e8e34' }).map(
			([dx, dy, w, h, c]): PixelRect => [38 + dx, 20 + dy, w, h, c],
		),
		// The table, a cloth over it in the race's blue, down to the road.
		[2, 26, 52, 2, RACE_BLUE_LIT],
		[2, 28, 52, 12, RACE_BLUE],
		[2, 38, 52, 2, RACE_BLUE_DARK],
		...[14, 28, 42].map((x): PixelRect => [x, 29, 1, 9, RACE_BLUE_DARK]),
	]) +
		pixelText(
			'BANANER',
			28 - Math.ceil(pixelTextWidth('BANANER', 1) / 2),
			3,
			1,
			'#ead25a',
		),
)

/** Someone in a banana suit, dancing (they hop, as scenery can). 14 by 30. */
export const dancingBanana = pixelArt(14, 30, [
	// Arms up, waving, out of the suit's sides.
	[1, 2, 2, 2, SKINS[3]],
	[1, 4, 1, 4, SKINS[3]],
	[2, 8, 1, 2, SKINS[3]],
	[3, 10, 1, 2, SKINS[3]],
	[11, 2, 2, 2, SKINS[3]],
	[12, 4, 1, 4, SKINS[3]],
	[11, 8, 1, 2, SKINS[3]],
	[10, 10, 1, 2, SKINS[3]],
	// The suit: a banana, standing up, curved, its stalk on top.
	...letters(
		[
			'.......ee.....',
			'.......ee.....',
			'......LYS.....',
			'......LYYS....',
			'.....LYYYS....',
			'.....LYYYYS...',
			'....LYYYYYS...',
			'....LffffYS...',
			'....LfifiYS...',
			'....LffffYS...',
			'....LfmmfYS...',
			'....LYYYYYS...',
			'....LYYYYYS...',
			'....LYYYYYS...',
			'....LYYYYYS...',
			'....LYYYYYS...',
			'....LYYYYYS...',
			'....LYYYYYS...',
			'.....LYYYYS...',
			'.....LYYYYS...',
			'.....LYYYS....',
			'......YYSS....',
			'.......ee.....',
		],
		{
			e: BANANA_END,
			L: BANANA_LIT,
			Y: BANANA,
			S: BANANA_SHADE,
			f: SKINS[3],
			i: INK,
			m: '#8a3a32',
		},
	),
	// Legs, in black tights, and running shoes.
	[5, 23, 2, 5, '#24242c'],
	[8, 23, 2, 5, '#24242c'],
	[4, 28, 3, 2, '#d6dae2'],
	[8, 28, 3, 2, '#d6dae2'],
	[4, 29, 3, 1, '#9aa0aa'],
	[8, 29, 3, 1, '#9aa0aa'],
])

// --- The crowd --------------------------------------------------------------------

/** What they're wearing: dark coats, a hoodie, dulled by the night. */
const COATS = [
	'#3a3f55',
	'#4e3a4a',
	'#2f4a48',
	'#55504a',
	'#3d4a66',
	'#5a3a36',
	'#44464e',
]

/**
 * Hornsgatan's crowd, behind the barriers, cheering: a strip of it, to line
 * the way, end to end with the next. Arms up, a phone held up here and
 * there, lit, and a HEJA banner on the barriers. 100 by 34.
 */
export const crowd = (() => {
	const random = seeded(2024)
	const pick = <T>(list: T[]) => list[Math.floor(random() * list.length)]
	const rects: PixelRect[] = []
	for (let i = 0; i < 11; i++) {
		const x = 1 + i * 9 + Math.round(random() * 2)
		if (x > 93) break
		const top = 8 + Math.round(random() * 3)
		const coat = pick(COATS)
		const skin = pick(SKINS)
		const hair = pick(HAIRS)
		const arms = random()
		// Their arms: both up, in a V, one up, or down at their sides.
		if (arms < 0.45) {
			rects.push(
				[x - 1, top + 2, 1, 4, coat],
				[x - 2, top - 3, 1, 5, coat],
				[x - 2, top - 4, 1, 1, skin],
				[x + 6, top + 2, 1, 4, coat],
				[x + 7, top - 3, 1, 5, coat],
				[x + 7, top - 4, 1, 1, skin],
			)
		} else if (arms < 0.8) {
			const phone = random() < 0.5
			rects.push(
				[x + 6, top + 1, 1, 5, coat],
				[x + 6, top - 4, 1, 5, coat],
				[x + 6, top - 5, 1, 1, skin],
			)
			if (phone) {
				// A phone, held up, filming: lit, a glow round it.
				rects.push([x + 4, top - 10, 5, 5, 'rgba(190, 220, 255, 0.14)'])
				rects.push([x + 6, top - 8, 1, 2, '#d8ecff'])
				rects.push([x + 6, top - 7, 1, 1, '#a8c8f0'])
			}
		}
		// Their body, behind the barrier.
		rects.push([x, top + 5, 6, 22 - top, coat])
		rects.push([x + 5, top + 5, 1, 22 - top, 'rgba(0, 0, 0, 0.18)'])
		// Their head, and hair, or a hat.
		rects.push([x + 1, top + 1, 4, 4, skin])
		if (random() < 0.25) {
			rects.push([
				x + 1,
				top - 1,
				4,
				2,
				pick(['#8a3a34', '#2f4f8a', '#9aa0ac']),
			])
			rects.push([x + 2, top - 2, 2, 1, '#b8bcc6'])
		} else {
			rects.push([x + 1, top, 4, 2, hair])
			if (random() < 0.4) rects.push([x + 4, top + 2, 1, 3, hair])
		}
		// A mouth, open, cheering.
		rects.push([x + 2, top + 3, 1, 1, '#3a1a1a'])
	}
	// The barriers: steel, a rail top and bottom, bars between, every 4 so
	// one strip runs into the next; a foot either end of each.
	rects.push([0, 22, 100, 2, STEEL])
	rects.push([0, 22, 100, 1, STEEL_LIT])
	rects.push([0, 31, 100, 2, STEEL])
	rects.push([0, 31, 100, 1, STEEL_LIT])
	for (let x = 1; x < 100; x += 4) rects.push([x, 24, 1, 7, STEEL_DARK])
	for (const x of [24, 74]) {
		rects.push([x, 21, 2, 12, STEEL_LIT])
		rects.push([x - 3, 33, 8, 1, STEEL_DARK])
	}
	// A banner on one of them, in the race's blue.
	rects.push([33, 24, 34, 7, RACE_BLUE])
	rects.push([33, 24, 34, 1, RACE_BLUE_LIT])
	return svgUrl(
		100,
		34,
		rectsMarkup(rects) +
			pixelText(
				'HEJA',
				50 - Math.ceil(pixelTextWidth('HEJA', 1) / 2),
				24,
				1,
				'#c4cce0',
			),
	)
})()

// --- On the road --------------------------------------------------------------------

/** A paper cup dropped on the road past the drinks station, jumped as a rock. In screen pixels. */
export const PAPER_CUP = {
	asset: pixelArt(
		7,
		8,
		letters(
			[
				'..L.LL.',
				'.LWLWWL',
				'.WdWWWS',
				'.WWWdS.',
				'.BBBBS.',
				'.WWWWS.',
				'..WWWS.',
				'wwwwwww',
			],
			{
				L: CUP_LIT,
				W: CUP,
				S: CUP_SHADE,
				d: CUP_SHADE,
				B: RACE_BLUE,
				w: 'rgba(150, 190, 245, 0.35)',
			},
		),
	),
	width: 14,
	height: 16,
}

/** A banana skin on the road, past the banana stand, jumped as a rock. In screen pixels. */
export const BANANA_SKIN = {
	asset: pixelArt(
		11,
		5,
		letters(
			[
				'....ee.....',
				'...LYYL....',
				'..LYYYYSL..',
				'.LpYSYSYpL.',
				'LppS...SppS',
			],
			{
				e: BANANA_END,
				L: BANANA_LIT,
				Y: BANANA,
				S: BANANA_SHADE,
				p: '#e2d6a2',
			},
		),
	),
	width: 22,
	height: 10,
}
