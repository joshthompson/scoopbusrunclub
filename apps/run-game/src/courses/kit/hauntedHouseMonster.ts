import { paintedArt } from './pixelArt'

/**
 * Who's in the haunted house, in world pixels: the ghosts bobbing about
 * its rooms, and the monster up in its attic.
 */

// --- The ghosts -------------------------------------------------------------

const SHEET = '#f4f2ff'
const SHEET_SHADE = '#c9c3e6'
const SHEET_LIT = '#ffffff'
const GHOST_INK = '#2b2238'

/**
 * A sheet ghost, facing left, 16 by 20 cells: a round head, two dark eyes
 * and an "O" of a mouth, a little arm out in front, its hem trailing back
 * and wavy. `phase` moves the hem's waves along, so it flutters.
 */
function ghost(phase: number) {
	return paintedArt(16, 20, (x, y) => {
		// Its face, to the left: the eyes, then the "O".
		if (y > 4 && y < 8 && ((x > 3 && x < 5) || (x > 7 && x < 9))) {
			return GHOST_INK
		}
		if (x > 4 && x < 7 && y > 9 && y < 13) return GHOST_INK
		if (y > 10 && y < 12 && x > 3 && x < 8) return GHOST_INK
		// Its little arm, out in front.
		if (((x - 2.6) / 1.7) ** 2 + ((y - 11.5) / 1.6) ** 2 <= 1)
			return y > 11 ? SHEET_SHADE : SHEET
		// Its body: the head round, then straight down, trailing back a little.
		const middle = 8.5 + Math.max(0, y - 8) * 0.12
		const half = 6
		const hem = 17.6 + 1.4 * Math.sin(((x + phase) / 5) * 2 * Math.PI)
		const inHead = (x - 8.5) ** 2 + (y - 7) ** 2 <= 6.2 ** 2
		const inBody = y >= 7 && Math.abs(x - middle) <= half && y < hem
		if (!inHead && !inBody) return undefined
		// A glint on its head, the far side and the hem in shade.
		if (y > 1 && y < 3 && x > 4 && x < 7) return SHEET_LIT
		if (x > middle + half - 1.6 || (y >= 7 && y > hem - 1.6)) return SHEET_SHADE
		if (inHead && !inBody && x > 12.6) return SHEET_SHADE
		return SHEET
	})
}

/** Burst: a ring of pale puffs of mist, flying apart. */
function puff(x: number, y: number, px: number, py: number, r: number) {
	if (Math.hypot(x - px, y - py) >= r) return undefined
	if (y > py + r * 0.35) return SHEET_SHADE
	if (y < py - r * 0.35 && x < px) return SHEET_LIT
	return SHEET
}

/** A ghost, bobbing about the house in place of a Germ: two frames, and its burst. */
export const HOUSE_GHOST = {
	frames: [ghost(0), ghost(2.5)],
	popped: paintedArt(16, 16, (x, y) => {
		for (let i = 0; i < 6; i++) {
			const a = (i * Math.PI) / 3
			const out = puff(x, y, 8 + 5.8 * Math.cos(a), 8 + 5.8 * Math.sin(a), 1.9)
			if (out) return out
			const b = a + Math.PI / 6
			const near = puff(x, y, 8 + 3.2 * Math.cos(b), 8 + 3.2 * Math.sin(b), 1)
			if (near) return near === SHEET_LIT ? SHEET : SHEET_SHADE
		}
		return undefined
	}),
	width: 32,
	height: 40,
	word: 'Boo!',
}

// --- The monster ------------------------------------------------------------

/** Its shadowy fur, lit along its top edges; its far limbs darker still. */
const FUR = '#1c1424'
const FUR_LIT = '#3a2c48'
const FUR_FAR = '#120c18'
const FUR_FAR_LIT = '#2a2036'
/** Under its near arm, the shadow it throws on its chest. */
const FUR_SHADOW = '#0c0810'
const EYE = '#ffd56b'
const EYE_HOT = '#fff4c4'
const CLAW = '#d9cfbd'
const CLAW_FAR = '#8f8574'
const TOOTH = '#f4f0e0'
const MAW = '#4a1020'
const TONGUE = '#8a2a3a'
/** Painted with its near arm, so it can be lit and throw its shadow; ends up `FUR`. */
const NEAR = 'near'

type Point = [number, number]

/**
 * A picture being painted cell by cell, in shapes, before it's art: blobs,
 * tapering limbs, polygons and rects, later ones over earlier ones.
 */
function sketch(width: number, height: number) {
	const cells: (string | undefined)[] = new Array(width * height)
	const at = (x: number, y: number) =>
		x >= 0 && x < width && y >= 0 && y < height
			? cells[y * width + x]
			: undefined
	const set = (x: number, y: number, fill: string | undefined) => {
		if (x >= 0 && x < width && y >= 0 && y < height) cells[y * width + x] = fill
	}
	const each = (inside: (x: number, y: number) => boolean, fill: string) => {
		for (let y = 0; y < height; y++)
			for (let x = 0; x < width; x++)
				if (inside(x + 0.5, y + 0.5)) set(x, y, fill)
	}
	return {
		at,
		set,
		rect(x: number, y: number, w: number, h: number, fill: string) {
			for (let dy = 0; dy < h; dy++)
				for (let dx = 0; dx < w; dx++) set(x + dx, y + dy, fill)
		},
		blob(cx: number, cy: number, rx: number, ry: number, fill: string) {
			each((x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1, fill)
		},
		/** A limb through `points`, each `[x, y, thickness]`, tapering between them. */
		limb(points: [number, number, number][], fill: string) {
			for (let i = 1; i < points.length; i++) {
				const [x0, y0, r0] = points[i - 1]
				const [x1, y1, r1] = points[i]
				const length = Math.hypot(x1 - x0, y1 - y0) || 1
				each((x, y) => {
					const t = Math.max(
						0,
						Math.min(
							1,
							((x - x0) * (x1 - x0) + (y - y0) * (y1 - y0)) / length ** 2,
						),
					)
					const d = Math.hypot(
						x - (x0 + t * (x1 - x0)),
						y - (y0 + t * (y1 - y0)),
					)
					return d <= r0 + t * (r1 - r0)
				}, fill)
			}
		},
		polygon(points: Point[], fill: string) {
			each((x, y) => {
				let inside = false
				for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
					const [xi, yi] = points[i]
					const [xj, yj] = points[j]
					if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
						inside = !inside
				}
				return inside
			}, fill)
		},
		/**
		 * Lit from above: fur with nothing over it (or nothing in front of it,
		 * to the left) gets a lit rim. The near arm is lit the same, and
		 * throws a shadow on the fur under and behind it.
		 */
		light() {
			const was = [...cells]
			const before = (x: number, y: number) =>
				x >= 0 && x < width && y >= 0 && y < height
					? was[y * width + x]
					: undefined
			for (let y = 0; y < height; y++)
				for (let x = 0; x < width; x++) {
					const here = before(x, y)
					const open = !before(x, y - 1) || !before(x - 1, y)
					if (here === FUR_FAR && open) set(x, y, FUR_FAR_LIT)
					if (here === FUR && open) set(x, y, FUR_LIT)
					if (here === NEAR) set(x, y, open ? FUR_LIT : FUR)
					if (
						here === FUR &&
						(before(x, y - 1) === NEAR || before(x - 1, y) === NEAR)
					)
						set(x, y, FUR_SHADOW)
				}
		},
		art: () =>
			paintedArt(width, height, (x, y) => at(Math.floor(x), Math.floor(y))),
	}
}

type Sketch = ReturnType<typeof sketch>

/**
 * Claws, fanned out from a hand at `x`, `y`: one for each angle, in degrees
 * (0 is right, 90 down), each hooked `hook` degrees at its tip.
 */
function claws(
	s: Sketch,
	x: number,
	y: number,
	angles: number[],
	length: number,
	hook: number,
	fill: string,
) {
	for (const a of angles) {
		const r = (a * Math.PI) / 180
		const tip = ((a + hook) * Math.PI) / 180
		const mx = x + length * 0.65 * Math.cos(r)
		const my = y + length * 0.65 * Math.sin(r)
		s.limb(
			[
				[x + 2 * Math.cos(r), y + 2 * Math.sin(r), 0.95],
				[mx, my, 0.7],
				[
					mx + length * 0.4 * Math.cos(tip),
					my + length * 0.4 * Math.sin(tip),
					0.5,
				],
			],
			fill,
		)
	}
}

/** Rags of fur hanging off its belly: from `x`, every two cells, down from `top` by `lengths`. */
function rags(s: Sketch, x: number, top: number, lengths: number[]) {
	lengths.forEach((length, i) => s.rect(x + i * 2, top, 2, length, FUR))
}

/** A few strands in its fur, only where there's fur to show them on. */
function strands(s: Sketch, at: Point[]) {
	for (const [x, y] of at)
		for (let dy = 0; dy < 3; dy++)
			if (s.at(x, y + dy) === FUR) s.set(x, y + dy, FUR_FAR_LIT)
}

/** Its feet, the same in both frames: three-toed, clawed, flat on the attic floor. */
function feet(s: Sketch, near: boolean) {
	if (!near) {
		s.blob(37, 59.6, 5.5, 2.6, FUR_FAR)
		s.rect(30, 60, 2, 1, CLAW_FAR)
		s.rect(31, 58, 1, 1, CLAW_FAR)
		return
	}
	s.blob(21, 59.6, 6, 2.6, FUR)
	s.rect(13, 60, 2, 1, CLAW)
	s.rect(14, 61, 2, 1, CLAW)
	s.rect(14, 58, 1, 1, CLAW)
}

/**
 * The monster in the attic: a great hunched thing of shadow and shaggy fur,
 * facing left, 56 by 62 cells, its feet at the bottom. Glowing yellow eyes,
 * pointed ears laid back, long arms hanging down to claws that scrape the
 * floor; rearing up, it throws them out at whoever's come up the stairs and
 * opens a mouth full of teeth.
 */
function monster(lunge: boolean) {
	const s = sketch(56, 62)
	// Behind it all: the far leg and the far arm, in deeper shadow.
	feet(s, false)
	if (lunge) {
		s.limb(
			[
				[37, 44, 4],
				[37, 57, 3.5],
			],
			FUR_FAR,
		)
		// The far arm, low, reaching out under the near one.
		s.limb(
			[
				[30, 36, 4],
				[21, 45, 3.5],
				[13, 44, 3],
			],
			FUR_FAR,
		)
		s.blob(11, 44, 3.2, 3, FUR_FAR)
		claws(s, 10, 44, [150, 180, 210], 7, -20, CLAW_FAR)
	} else {
		s.limb(
			[
				[36, 48, 4],
				[37, 57, 3.5],
			],
			FUR_FAR,
		)
		s.limb(
			[
				[42, 30, 4],
				[46, 42, 3.5],
				[44, 53, 3],
			],
			FUR_FAR,
		)
		s.blob(43.5, 55, 3.4, 3, FUR_FAR)
		claws(s, 43, 55, [118, 95, 72], 6, 20, CLAW_FAR)
	}

	// Its body: a hulking hunch of fur, rags hanging off it.
	if (lunge) {
		s.blob(31, 31, 14, 15, FUR)
		s.blob(35, 22, 11, 10, FUR)
		s.blob(24, 23, 8, 8, FUR)
		rags(s, 19, 40, [7, 10, 8, 11, 9, 12, 8, 10, 7, 9, 6, 8, 5])
		// Fur standing up along its back.
		s.polygon(
			[
				[29, 14],
				[33, 8],
				[35, 13],
			],
			FUR,
		)
		s.polygon(
			[
				[37, 13],
				[42, 9],
				[42, 15],
			],
			FUR,
		)
		s.polygon(
			[
				[43, 18],
				[49, 16],
				[46, 23],
			],
			FUR,
		)
		s.polygon(
			[
				[45, 28],
				[50, 29],
				[45, 33],
			],
			FUR,
		)
		s.limb(
			[
				[24, 44, 4.5],
				[22, 57, 4],
			],
			FUR,
		)
	} else {
		s.blob(32, 36, 17, 16, FUR)
		s.blob(36, 26, 13, 11, FUR)
		s.blob(24, 30, 10, 9, FUR)
		rags(s, 17, 46, [6, 8, 5, 9, 7, 10, 6, 8, 9, 6, 8, 5, 7, 6, 4])
		s.polygon(
			[
				[29, 17],
				[32, 11],
				[34, 16],
			],
			FUR,
		)
		s.polygon(
			[
				[37, 15],
				[42, 11],
				[42, 17],
			],
			FUR,
		)
		s.polygon(
			[
				[44, 19],
				[50, 17],
				[47, 24],
			],
			FUR,
		)
		s.polygon(
			[
				[48, 30],
				[53, 32],
				[48, 36],
			],
			FUR,
		)
		s.limb(
			[
				[24, 48, 4.5],
				[23, 57, 4],
			],
			FUR,
		)
	}
	feet(s, true)

	// Its head, low and forward on its hunch; reared up, higher and its jaw dropped.
	const head: Point = lunge ? [16, 13] : [16, 30]
	const [hx, hy] = head
	s.blob(hx, hy, 9, 8, FUR)
	s.blob(hx - 2, hy + (lunge ? 9 : 6), 7, lunge ? 4.5 : 4, FUR)
	// Pointed ears, laid back.
	s.polygon(
		[
			[hx + 2, hy - 6],
			[hx + 10, hy - 13],
			[hx + 8, hy - 3],
		],
		FUR,
	)
	s.polygon(
		[
			[hx - 4, hy - 6],
			[hx - 2, hy - 12],
			[hx + 1, hy - 6],
		],
		FUR,
	)

	// The near arm: hanging down to the floor, or thrown out at the runners.
	if (lunge) {
		s.limb(
			[
				[26, 28, 4.5],
				[19, 34, 4],
				[12, 31, 3.5],
			],
			NEAR,
		)
		s.blob(10, 31, 3.4, 3.2, NEAR)
	} else {
		s.limb(
			[
				[23, 33, 4.5],
				[15, 44, 4],
				[10, 52, 3.5],
			],
			NEAR,
		)
		s.blob(9, 54, 4, 3.4, NEAR)
	}
	s.light()
	strands(
		s,
		lunge
			? [
					[30, 22],
					[38, 18],
					[34, 30],
					[41, 28],
					[29, 38],
					[38, 38],
				]
			: [
					[31, 24],
					[40, 21],
					[35, 33],
					[44, 30],
					[28, 42],
					[40, 42],
				],
	)

	// Claws: spread wide, or curled down to scrape the floor.
	if (lunge) claws(s, 9, 31, [145, 175, 205, 235], 8, -20, CLAW)
	else claws(s, 9, 55, [128, 102, 76], 6.5, 25, CLAW)

	// The eyes, glowing, slanted in a glare, a hot spot in each.
	const ey = hy - 2
	for (const ex of [hx - 7, hx - 1]) {
		s.rect(ex, ey, 3, 2, EYE)
		s.rect(ex + 1, ey + 1, 1, 1, EYE_HOT)
	}
	// Their inner top corners cut away, for the glare.
	s.set(hx - 5, ey, FUR)
	s.set(hx - 1, ey, FUR)

	if (lunge) {
		// The mouth, wide open: a dark-red maw, a tongue, teeth all round it.
		s.blob(hx - 3, hy + 6.5, 6.5, 4, MAW)
		s.blob(hx - 4, hy + 9, 3.5, 1.5, TONGUE)
		for (let x = 0; x < 56; x++)
			for (let y = 1; y < 61; y++) {
				if (s.at(x, y) !== MAW && s.at(x, y) !== TONGUE) continue
				const top = s.at(x, y - 1)
				const under = s.at(x, y + 1)
				if (top !== MAW && top !== TONGUE && top !== TOOTH && x % 2 === 0) {
					s.set(x, y, TOOTH)
					if (x % 4 === 0) s.set(x, y + 1, TOOTH)
				}
				if (
					under !== MAW &&
					under !== TONGUE &&
					under !== TOOTH &&
					x % 2 === 1
				) {
					s.set(x, y, TOOTH)
					if (x % 4 === 1) s.set(x, y - 1, TOOTH)
				}
			}
	} else {
		// The mouth shut, a grim line, two fangs hanging over it.
		s.rect(hx - 8, hy + 4, 10, 1, FUR_SHADOW)
		s.rect(hx - 7, hy + 4, 1, 2, TOOTH)
		s.rect(hx - 2, hy + 4, 1, 2, TOOTH)
	}
	return s.art()
}

/** The monster in the attic, facing left, waiting, and lunging. */
export const MONSTER = {
	idle: monster(false),
	lunge: monster(true),
	width: 112,
	height: 124,
}
