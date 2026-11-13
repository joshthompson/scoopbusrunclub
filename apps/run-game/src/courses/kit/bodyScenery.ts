import type { CaveTiles } from '../types'
import { type PixelRect, paintedArt, pixelArt, svgUrl, tile } from './pixelArt'
import { seeded } from './seeded'

/**
 * Karolinska's art once you're shrunk, drawn in code: a lab bench, huge,
 * the lab towering out of focus behind it, and the face of the scientist
 * leaning over it; then the inside of them, their nose, their windpipe,
 * their lungs, their heart and their arteries, and what's about in there.
 * A cell to a pixel, drawn twice its size as scenery (`scale: 2`), unless
 * it says it's in world pixels (tiles, features, rocks).
 */

// --- Colours ---------------------------------------------------------------

/** Inside the nose: wet pink, its veins, and the light on the wet. */
const MUCOSA = '#d77f8b'
const MUCOSA_DARK = '#c26a78'
const MUCOSA_LIT = '#eba0aa'
const WET = '#f6c6cc'
const VEIN = '#a84458'
/** The flesh round it all, deeper in, and under the floor. */
const FLESH = '#c25c6c'
const FLESH_DARK = '#a84a5c'
const FLESH_LIT = '#d4707e'
const DEEP = '#a8485a'
const DEEP_DARK = '#8f3a4c'
/** The windpipe's rings of cartilage, and the softer pink between them. */
const CARTILAGE = '#f2d2cc'
const CARTILAGE_LIT = '#fbe6e0'
const CARTILAGE_SHADE = '#ddaaa8'
const TUBE = '#e3a0a8'
/** The lungs: spongy pink, air sacs all over. */
const LUNG = '#dc8a98'
const LUNG_DARK = '#c87686'
const SAC = '#e69ead'
const SAC_LIT = '#f2bcc6'
/** The heart: deep red muscle, its fibres. */
const MUSCLE = '#b23046'
const MUSCLE_DARK = '#962538'
const MUSCLE_LIT = '#c8485c'
/** An artery's wall, and the blood rushing by. */
const VESSEL = '#c6404f'
const VESSEL_DARK = '#a8303e'
const VESSEL_LIT = '#d85a68'
const BLOOD = '#d8323f'
const BLOOD_DARK = '#a8222f'
const BLOOD_LIT = '#f0606c'
/** A Germ: green, spiked, and nasty. */
const GERM = '#7ac143'
const GERM_DARK = '#4f8a2a'
const GERM_LIT = '#b2e070'
const GERM_SPIKE = '#c9e24a'
const INK = '#1d1d1d'

/** A whole number of 2-pixel cells. */
const two = (n: number) => Math.round(n / 2) * 2

/** A blob, on a tile: an ellipse round `cx`, `cy`, in rows of 2-pixel cells. */
function blob(
	t: ReturnType<typeof tile>,
	cx: number,
	cy: number,
	rx: number,
	ry: number,
	fill: string,
) {
	for (let y = two(cy - ry); y < cy + ry; y += 2) {
		const d = (y + 1 - cy) / ry
		if (Math.abs(d) >= 1) continue
		const half = rx * Math.sqrt(1 - d * d)
		const w = two(half * 2)
		if (w > 0) t.rect(two(cx - half), y, w, 2, fill)
	}
}

/** A wandering line, a vein, on a tile: from `x`, `y`, `steps` 4-pixel steps along. */
function vein(
	t: ReturnType<typeof tile>,
	random: () => number,
	x: number,
	y: number,
	steps: number,
	fill: string,
	across = true,
) {
	let at = [two(x), two(y)]
	for (let s = 0; s < steps; s++) {
		t.rect(at[0], at[1], across ? 4 : 2, across ? 2 : 4, fill)
		if (across) at = [at[0] + 4, at[1] + (random() < 0.5 ? 2 : -2)]
		else at = [at[0] + (random() < 0.5 ? 2 : -2), at[1] + 4]
		// Now and then, a branch off it.
		if (random() < 0.06) vein(t, random, at[0], at[1], 3, fill, !across)
	}
}

// --- Tiles, world pixels ---------------------------------------------------

/** The inside of the nose, its back wall: wet pink, a few veins, the light on the wet. 64 by 64. */
function noseWall() {
	const t = tile(64, 64)
	const random = seeded(8501)
	t.rect(0, 0, 64, 64, MUCOSA)
	for (let i = 0; i < 6; i++)
		blob(t, random() * 64, random() * 64, 8 + random() * 6, 4, MUCOSA_DARK)
	for (let i = 0; i < 2; i++)
		vein(t, random, random() * 64, random() * 64, 5, VEIN)
	// Wet: glints, a few drops.
	for (let i = 0; i < 7; i++) {
		const x = two(random() * 64)
		const y = two(random() * 64)
		t.rect(x, y, random() < 0.5 ? 2 : 6, 2, WET)
	}
	for (let i = 0; i < 2; i++) {
		const x = two(random() * 64)
		const y = two(random() * 64)
		t.rect(x, y, 4, 4, MUCOSA_LIT)
		t.rect(x, y, 2, 2, WET)
	}
	return { asset: t.url(), width: 64, height: 64 }
}

/** Flesh, deeper in, over the ceiling: folds of it, lit along their tops. 96 by 64. */
function fleshTile(base: string, dark: string, lit: string, seed: number) {
	const t = tile(96, 64)
	const random = seeded(seed)
	t.rect(0, 0, 96, 64, base)
	for (const y of [8, 30, 50]) {
		for (let x = 0; x < 96; x += 8) {
			const wave = two(Math.sin((x / 96) * Math.PI * 4 + y) * 3)
			t.rect(x, y + wave, 8, 6, dark)
			t.rect(x, y + wave - 2, 8, 2, lit)
		}
	}
	for (let i = 0; i < 4; i++)
		blob(t, random() * 96, random() * 64, 4 + random() * 4, 3, dark)
	return { asset: t.url(), width: 96, height: 64 }
}

/** Under the floor: deep, dark flesh, blotched. 64 by 64. */
function deepTile(base: string, dark: string, seed: number) {
	const t = tile(64, 64)
	const random = seeded(seed)
	t.rect(0, 0, 64, 64, base)
	for (let i = 0; i < 4; i++)
		blob(t, random() * 64, random() * 64, 3 + random() * 4, 2, dark)
	return { asset: t.url(), width: 64, height: 64 }
}

/** The windpipe's wall: rings of pale cartilage, round it, the pink between them. 32 by 64. */
function tracheaWall() {
	const t = tile(32, 64)
	const random = seeded(9301)
	t.rect(0, 0, 32, 64, TUBE)
	t.rect(6, 0, 18, 64, CARTILAGE)
	t.rect(6, 0, 2, 64, CARTILAGE_LIT)
	t.rect(22, 0, 2, 64, CARTILAGE_SHADE)
	// A vein or two, between the rings, and the light on its middle.
	t.rect(26, two(random() * 64), 2, 10, VEIN)
	t.rect(12, 10, 2, 8, CARTILAGE_LIT)
	t.rect(14, 40, 2, 6, CARTILAGE_LIT)
	return { asset: t.url(), width: 32, height: 64 }
}

/** The lungs' wall: spongy, air sacs bubbled all over it, lit on top. 64 by 64. */
function lungWall() {
	const t = tile(64, 64)
	const random = seeded(10101)
	t.rect(0, 0, 64, 64, LUNG)
	const sacs: [number, number, number][] = []
	for (let i = 0; i < 5; i++)
		sacs.push([random() * 64, random() * 64, 5 + random() * 3])
	for (const [x, y, r] of sacs) blob(t, x, y + 2, r, r, LUNG_DARK)
	for (const [x, y, r] of sacs) blob(t, x, y, r, r, SAC)
	for (const [x, y, r] of sacs)
		t.rect(two(x - r / 2), two(y - r + 2), 2, 2, SAC_LIT)
	return { asset: t.url(), width: 64, height: 64 }
}

/** The heart's wall: muscle, its fibres running along it, sloping. 64 by 64. */
function heartWall() {
	const t = tile(64, 64)
	const random = seeded(11901)
	t.rect(0, 0, 64, 64, MUSCLE)
	for (let i = 0; i < 12; i++) {
		let x = two(random() * 64)
		let y = two(random() * 64)
		const fill = i % 3 === 0 ? MUSCLE_LIT : MUSCLE_DARK
		for (let s = 0; s < 6; s++) {
			t.rect(x, y, 6, 2, fill)
			x += 6
			y += 2
		}
	}
	return { asset: t.url(), width: 64, height: 64 }
}

/** An artery's wall, blood rushing along it: streaks, and cells swept by. 64 by 64. */
function arteryWall() {
	const t = tile(64, 64)
	const random = seeded(12901)
	t.rect(0, 0, 64, 64, VESSEL)
	for (let i = 0; i < 10; i++) {
		const x = two(random() * 64)
		const y = two(random() * 64)
		t.rect(x, y, 10 + two(random() * 14), 2, i % 2 ? VESSEL_LIT : VESSEL_DARK)
	}
	// A cell or two, swept along, faint.
	for (const [x, y] of [
		[10, 18],
		[44, 46],
	]) {
		t.rect(x, y, 8, 4, '#d24a5a')
		t.rect(x + 2, y - 2, 4, 2, '#d24a5a')
		t.rect(x + 2, y + 4, 4, 2, VESSEL_DARK)
	}
	return { asset: t.url(), width: 64, height: 64 }
}

const NOSE_ROCK = fleshTile(FLESH, FLESH_DARK, FLESH_LIT, 8502)
const NOSE_FRONT = deepTile(DEEP, DEEP_DARK, 8503)

/** Inside the nose, and the sinuses: pink, wet, veined. */
export const NOSE_TILES: CaveTiles = {
	rock: NOSE_ROCK,
	front: NOSE_FRONT,
	wall: noseWall(),
}
/** The windpipe: rings of cartilage. */
export const TRACHEA_TILES: CaveTiles = {
	rock: NOSE_ROCK,
	front: NOSE_FRONT,
	wall: tracheaWall(),
}
/** The lungs: spongy, air sacs all over. */
export const LUNG_TILES: CaveTiles = {
	rock: fleshTile('#d37685', '#bd6474', '#e08896', 10102),
	front: deepTile('#c26a76', '#a8566a', 10103),
	wall: lungWall(),
}
/** The heart: muscle, deep red, its fibres. */
export const HEART_TILES: CaveTiles = {
	rock: fleshTile('#8e2133', '#7a1a2b', '#a42a3e', 11902),
	front: deepTile('#6a1625', '#58101e', 11903),
	wall: heartWall(),
}
/** An artery: its wall, red, blood cells rushing past. */
export const ARTERY_TILES: CaveTiles = {
	rock: fleshTile('#a42a3a', '#8a2030', '#b83a4a', 12902),
	front: deepTile('#7a1a28', '#62121e', 12903),
	wall: arteryWall(),
}

// --- Shrunk, on the table --------------------------------------------------

/** The lab, out of focus, huge: pale, soft, low on contrast. */
const BLUR_GLASS = '#d4e2ea'
const BLUR_GLASS_LIT = '#e6eff4'
const BLUR_GLASS_SHADE = '#c2d2dc'
const BLUR_LIQUID = '#b8d8c8'
const BLUR_METAL = '#c4cbd0'
const BLUR_METAL_DARK = '#b0b8be'
const BLUR_MUG = '#e0c8c0'
const BLUR_MUG_DARK = '#cdb2a8'
const BLUR_RACK = '#c0cfe0'
const BENCH = '#e9edeb'

/**
 * The lab, out of focus, towering over the bench, 960 by 300, its things'
 * feet on the bench at 224: a conical flask, a green liquid in it; a
 * microscope, its arm and eyepiece up out of sight; a rack of pipette
 * tips; a coffee mug. In 4-pixel cells, it's that big.
 */
const giantLab = (() => {
	const W = 960
	const H = 300
	const FOOT = 224
	const rects: PixelRect[] = []
	const r = (x: number, y: number, w: number, h: number, c: string) =>
		rects.push([x, y, w, h, c])
	const four = (n: number) => Math.round(n / 4) * 4

	// A conical flask, wide at the foot, its neck narrow, a band of liquid.
	const flask = (cx: number) => {
		for (let y = 0; y < FOOT; y += 4) {
			const t = y / FOOT
			const half = t < 0.4 ? 28 : 28 + ((t - 0.4) / 0.6) * 92
			const fill = y > FOOT - 70 ? BLUR_LIQUID : BLUR_GLASS
			r(four(cx - half), y, four(half * 2), 4, fill)
			r(four(cx - half), y, 4, 4, BLUR_GLASS_LIT)
			r(four(cx + half) - 4, y, 4, 4, BLUR_GLASS_SHADE)
		}
		// Its rim, and its graduations.
		r(cx - 36, 0, 72, 8, BLUR_GLASS_SHADE)
		for (let y = FOOT - 120; y < FOOT - 20; y += 24)
			r(cx - 20, y, 24, 4, BLUR_GLASS_SHADE)
	}
	// A microscope's foot and arm, its stage, the eyepiece up out of sight.
	const microscope = (x: number) => {
		r(x, FOOT - 24, 200, 24, BLUR_METAL)
		r(x, FOOT - 24, 200, 4, BLUR_GLASS_LIT)
		r(x + 140, 0, 44, FOOT - 24, BLUR_METAL)
		r(x + 140, 0, 8, FOOT - 24, BLUR_GLASS_LIT)
		r(x + 30, FOOT - 100, 130, 16, BLUR_METAL_DARK)
		r(x + 60, 0, 40, FOOT - 132, BLUR_METAL_DARK)
		r(x + 70, FOOT - 132, 20, 20, BLUR_METAL)
		r(x + 150, 90, 24, 24, BLUR_METAL_DARK)
	}
	// A rack of pipette tips, in rows.
	const rack = (x: number) => {
		r(x, FOOT - 96, 150, 96, BLUR_RACK)
		r(x, FOOT - 96, 150, 4, BLUR_GLASS_LIT)
		for (let i = 0; i < 6; i++) {
			r(x + 8 + i * 24, FOOT - 156, 12, 60, '#ecdf9c')
			r(x + 12 + i * 24, FOOT - 170, 4, 14, '#ecdf9c')
		}
	}
	// A coffee mug, its handle.
	const mug = (x: number) => {
		r(x, FOOT - 140, 120, 140, BLUR_MUG)
		r(x, FOOT - 140, 120, 8, '#ecd8d0')
		r(x + 100, FOOT - 140, 20, 140, BLUR_MUG_DARK)
		r(x + 120, FOOT - 112, 28, 8, BLUR_MUG_DARK)
		r(x + 140, FOOT - 104, 8, 60, BLUR_MUG_DARK)
		r(x + 120, FOOT - 52, 28, 8, BLUR_MUG_DARK)
		r(x + 24, FOOT - 92, 48, 20, '#d4b0a6')
	}
	flask(130)
	microscope(300)
	rack(560)
	mug(780)
	// The bench, out under them all.
	r(0, FOOT, W, H - FOOT, BENCH)
	r(0, FOOT, W, 4, '#f6f8f7')
	return pixelArt(W, H, rects)
})()

/**
 * Under the bench, seen down off its edge: its far edge along the top, and
 * under it the dark of the cupboards below it, going on down, 960 by 160.
 */
const underBench = (() => {
	const rects: PixelRect[] = [
		[0, 24, 960, 18, BENCH],
		[0, 24, 960, 2, '#f6f8f7'],
		[0, 42, 960, 4, '#c8ced0'],
		[0, 46, 960, 40, '#b0babf'],
		[0, 86, 960, 40, '#a2acb2'],
		[0, 126, 960, 34, '#949ea4'],
	]
	// The cupboards' doors, and their handles.
	for (let x = 0; x < 960; x += 120) {
		rects.push([x, 50, 4, 110, '#98a2a8'])
		rects.push([x + 104, 70, 4, 16, '#d0d6d8'])
	}
	return pixelArt(960, 160, rects)
})()

/**
 * The lab, huge, towering out of focus behind the table: a horizon (see
 * `CourseLook['horizon']`). Its things stand in `spires`, tall enough for
 * them; its far band's empty, so they show through; its near band's the
 * bench going on back under them, and down off its edge, the cupboards
 * under it, and the floor a long way down (`nearer`).
 */
export const GIANT_LAB = {
	sky: ['#eef3f5', '#dde6ea'] as [string, string],
	spires: giantLab,
	far: svgUrl(960, 160, ''),
	near: underBench,
	nearer: [
		{
			asset: pixelArt(960, 90, [
				[0, 0, 960, 90, '#8a949a'],
				[0, 60, 960, 30, '#7e888e'],
			]),
			height: 90,
			fill: '#747e84',
		},
	],
	fill: BENCH,
}

const SKIN = '#e8b48e'
const SKIN_SHADE = '#c98f6c'
const SKIN_LIT = '#f2c8a6'
const BLUSH = '#e09a82'
const LIP = '#c9706a'
const LIP_DARK = '#9a4a46'
const HAIR = '#2d211c'
const HAIR_LIT = '#4a3830'
const FRAME = '#1d1d1d'
const LENS = '#eec29e'
const GLINT = '#d6ecf6'
const SCRUBS = '#2f8f8a'
const LANYARD = '#c8302c'
const COAT = '#f4f6f8'
const COAT_SHADE = '#d6dde2'
const NOSTRIL = '#5a1f24'
const NOSTRIL_DEEP = '#3a1014'

/**
 * The scientist's face, close up, side on, facing left, leaning over the
 * bench: a big round nose, the nostril under its wing a dark way in,
 * leading back to the inside of it at the face's right edge, where it's
 * cut away; round glasses over a shut eye, peering; lips, chin, the
 * collar of a lab coat; dark hair. In 4-pixel cells: 95 by 250 of them,
 * 380 by 1000 in the world. Mostly nose: at this size, that's what's seen.
 */
const face = (() => {
	/** How far in from the left the face starts, `y` down, in world pixels: its profile. */
	const PROFILE: [number, number][] = [
		[0, 262],
		[300, 250],
		[350, 236],
		[392, 260],
		[424, 252],
		[446, 196],
		[472, 92],
		[500, 34],
		[526, 10],
		[550, 30],
		[568, 150],
		[584, 284],
		[604, 276],
		[632, 262],
		[650, 288],
		[668, 270],
		[700, 284],
		[740, 286],
		[790, 262],
		[820, 270],
		[860, 304],
		[900, 336],
		[1000, 336],
	]
	const profile = (y: number) => {
		for (let i = 1; i < PROFILE.length; i++) {
			const [y1, x1] = PROFILE[i]
			if (y > y1) continue
			const [y0, x0] = PROFILE[i - 1]
			return x0 + ((x1 - x0) * (y - y0)) / (y1 - y0)
		}
		return 336
	}
	const inEllipse = (
		x: number,
		y: number,
		cx: number,
		cy: number,
		rx: number,
		ry: number,
	) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1
	/** Its colour at `x`, `y`, in world pixels from its top left: none, in front of it. */
	const paint = (x: number, y: number): string | undefined => {
		const front = profile(y)
		// The nostril, a dark way in under the nose's wing, back to the inside.
		if (inEllipse(x, y, 320, 562, 64, 26) || (x > 320 && y > 536 && y < 590))
			return x > 344 || inEllipse(x, y, 336, 564, 30, 14)
				? NOSTRIL_DEEP
				: NOSTRIL
		if (x < front) return undefined
		// The lab coat's collar, the teal of scrubs under it, a lanyard.
		if (y > 940 || (x > 350 && y > 880)) {
			if (y > 940 && x - front > 8 && x - front < 36) return SCRUBS
			if (y > 940 && x - front >= 40 && x - front < 48) return LANYARD
			return x - front < 8 || (x > 356 && x < 364) ? COAT_SHADE : COAT
		}
		// A bun, at the back of the head.
		if (inEllipse(x, y, 352, 96, 40, 44))
			return (x + y) % 48 < 4 ? HAIR_LIT : HAIR
		// Hair: over the top of the head, its hairline curving down at the back.
		if (y < 150 + Math.max(0, x - 300) * 1.4 && x > front + 20)
			return (x + y) % 48 < 4 ? HAIR_LIT : HAIR
		// Glasses: their frame round, the arm back from them.
		const lens = inEllipse(x, y, 316, 404, 38, 34)
		const rim = inEllipse(x, y, 316, 404, 44, 40)
		if (rim && !lens) return FRAME
		if (y >= 396 && y < 404 && x > 358) return FRAME
		if (lens) {
			// Shut, peering: its lashes, and the glass catching the light.
			if (y >= 408 && y < 414 && x > 294 && x < 340) return INK
			if (y >= 414 && y < 418 && (x === 296 || x === 312 || x === 328))
				return INK
			if (x > 288 && x < 304 && y > 376 && y < 392) return GLINT
			return LENS
		}
		// An eyebrow over them, raised.
		if (y >= 342 && y < 354 && x > 276 && x < 352) return HAIR
		// The nose's wing, round over the nostril.
		if (
			inEllipse(x, y, 300, 540, 98, 52) &&
			!inEllipse(x, y, 300, 540, 90, 44) &&
			y < 556 &&
			x > 210
		)
			return SKIN_SHADE
		// Lips, and the line of the mouth between them.
		if (y >= 648 && y < 654) return x < front + 56 ? LIP_DARK : SKIN_SHADE
		if (y >= 600 && y < 648 && x < front + 44) return LIP
		if (y >= 654 && y < 694 && x < front + 40) return LIP
		// A blush on the cheek.
		if (inEllipse(x, y, 340, 470, 30, 18)) return BLUSH
		// The edge it's cut away at, into the inside.
		if (x >= 372) return MUCOSA_DARK
		// In shadow: under the nose, under the chin, at the back.
		if ((y > 548 && y < 596) || (y > 820 && y < 900) || x > 356)
			return SKIN_SHADE
		// Lit, along the top of the nose and the brow.
		if (x - front < 10 && y < 530) return SKIN_LIT
		if (inEllipse(x, y, 60, 500, 22, 12)) return SKIN_LIT
		return SKIN
	}
	return {
		profile,
		paint,
		art: paintedArt(95, 250, (cx, cy) => paint(cx * 4, cy * 4)),
	}
})()

/**
 * The face, painted, for a part of it drawn on its own (its jaw, dropping,
 * see `giantMouth`): its colour at `x`, `y` in world pixels from its top
 * left, and how far in from its left its profile is, `y` down.
 */
export const facePaint = face.paint
export const faceProfile = face.profile
/** The face's colours, for what's drawn to go with it. */
export const FACE_COLOURS = { SKIN, SKIN_SHADE, SKIN_LIT, LIP, LIP_DARK }

/**
 * The giant's face, side on, facing left, over the edge of the table:
 * world pixels; its nostril's middle, dark, leading in,
 * `nostril` across from its left and down from its top. Its right edge is
 * where the inside of them starts, its mouth open (see `giantMouth`).
 */
export const GIANT_FACE = {
	asset: face.art,
	width: 380,
	height: 1000,
	nostril: { x: 350, y: 560 },
	/** The line between its lips, down from its top: where its mouth opens. */
	mouth: 648,
}

/** A petri dish, side on: its glass, the agar in it, colonies growing on it. 60 by 14. */
export const petriDish = pixelArt(60, 14, [
	// Its lid, and the dish under it.
	[1, 0, 58, 2, '#e4f2f6'],
	[0, 2, 60, 1, '#f6fbfc'],
	[2, 3, 56, 9, '#d6eaf0'],
	// The agar, amber, and what's growing on it.
	[3, 6, 54, 6, '#e8c86a'],
	[3, 6, 54, 1, '#f2dc94'],
	[9, 4, 4, 2, '#f4f0e0'],
	[22, 5, 6, 1, '#f4f0e0'],
	[38, 4, 3, 2, '#e2a8c0'],
	[48, 5, 4, 1, '#f4f0e0'],
	// Its glass, catching the light, and its foot.
	[2, 3, 1, 9, '#ffffff'],
	[57, 3, 1, 9, '#b4ccd4'],
	[1, 12, 58, 2, '#b4ccd4'],
])

/** A pipette tip, standing on its wide end: yellow, see-through, its point up. 14 by 60. */
export const pipetteTip = paintedArt(14, 60, (x, y) => {
	const half = 1 + (y / 60) * 5.5
	if (Math.abs(x - 7) > half) return undefined
	if (y > 54) return Math.abs(x - 7) > half - 1 ? '#c8b24a' : '#e8d470'
	if (x < 7 - half + 1.2) return '#fff6c8'
	if (x > 7 + half - 1.2) return '#c8b24a'
	return y % 12 < 1 ? '#d8c460' : '#f2e494'
})

/**
 * A dust mite, a monster at this size: fat and pale, eight legs, bristles,
 * tiny black eyes, sat about on the bench. 34 by 20.
 */
export const dustMite = pixelArt(34, 20, [
	// Legs, four a side, jointed.
	...[4, 10, 18, 24].flatMap((x, i): PixelRect[] => [
		[x, 12, 2, 4, '#a89878'],
		[x + (i < 2 ? -2 : 2), 16, 2, 3, '#a89878'],
		[x + (i < 2 ? -3 : 3), 19, 3, 1, '#8a7a5e'],
	]),
	// Its body, fat, ridged.
	[6, 4, 20, 10, '#d8c8a8'],
	[4, 6, 24, 6, '#d8c8a8'],
	[8, 3, 16, 1, '#ece0c8'],
	[6, 4, 20, 1, '#ece0c8'],
	[4, 12, 24, 2, '#b8a888'],
	[11, 4, 1, 8, '#c4b494'],
	[16, 4, 1, 8, '#c4b494'],
	[21, 4, 1, 8, '#c4b494'],
	// Its head, out front, its jaws and eyes.
	[26, 6, 6, 6, '#c8b898'],
	[32, 8, 2, 3, '#a89878'],
	[28, 7, 1, 1, INK],
	[30, 7, 1, 1, INK],
	// Bristles.
	[9, 1, 1, 2, '#8a7a5e'],
	[14, 0, 1, 3, '#8a7a5e'],
	[20, 1, 1, 2, '#8a7a5e'],
	[2, 5, 2, 1, '#8a7a5e'],
])

/** A drop of water on the bench: a huge glassy dome, light caught in it, the bench seen through it. 40 by 26. */
export const waterDroplet = paintedArt(40, 26, (x, y) => {
	const d = ((x - 20) / 20) ** 2 + ((y - 26) / 26) ** 2
	if (d > 1) return undefined
	if (d > 0.86) return '#a8cce0'
	if (x > 8 && x < 14 && y > 6 && y < 10) return '#ffffff'
	if (x > 10 && x < 12 && y > 11 && y < 13) return '#ffffff'
	if (y > 20) return '#c4e2f0'
	return d < 0.5 ? '#dff2fa' : '#cfe8f4'
})

/** A crumb, on the bench: golden crust, its inside porous. World pixels. */
export const CRUMB = {
	asset: pixelArt(20, 12, [
		[3, 1, 12, 2, '#c8924a'],
		[1, 3, 18, 7, '#ecd4a0'],
		[2, 10, 17, 2, '#b07a3a'],
		[1, 3, 2, 7, '#c8924a'],
		[17, 2, 3, 8, '#b07a3a'],
		[3, 1, 6, 1, '#dcaa62'],
		[5, 5, 2, 2, '#d0b07a'],
		[10, 4, 3, 2, '#d0b07a'],
		[13, 7, 2, 2, '#d0b07a'],
		[7, 8, 2, 1, '#d0b07a'],
	]),
	width: 40,
	height: 24,
}

/** Nose hairs, a clump of them, thick and dark, out of the floor. World pixels. */
export const NOSE_HAIR = {
	asset: pixelArt(20, 22, [
		// Their roots, a bump of skin.
		[2, 19, 16, 3, MUCOSA_DARK],
		[4, 18, 12, 1, MUCOSA],
		// Three hairs, curving.
		[5, 6, 2, 13, HAIR],
		[4, 2, 2, 5, HAIR],
		[3, 0, 2, 3, HAIR],
		[9, 4, 2, 15, HAIR],
		[10, 1, 2, 4, HAIR],
		[14, 9, 2, 10, HAIR],
		[15, 6, 2, 4, HAIR],
		[16, 4, 2, 3, HAIR],
		// The light along them.
		[5, 8, 1, 6, HAIR_LIT],
		[9, 6, 1, 8, HAIR_LIT],
		[14, 11, 1, 5, HAIR_LIT],
	]),
	width: 40,
	height: 44,
}

/** A clot, in an artery: a tangle of fibres, red cells caught in it. World pixels. */
export const CLOT = {
	asset: pixelArt(20, 12, [
		[2, 3, 16, 8, '#7a1424'],
		[4, 1, 11, 2, '#8a1a2c'],
		[1, 6, 18, 4, '#7a1424'],
		[2, 11, 16, 1, '#5a0c18'],
		// Cells caught in it.
		[4, 4, 4, 3, BLOOD],
		[11, 6, 4, 3, BLOOD],
		[8, 2, 3, 2, BLOOD_LIT],
		// Fibres over them.
		[3, 5, 14, 1, '#e8c0a8'],
		[6, 3, 1, 6, '#e8c0a8'],
		[13, 4, 1, 6, '#e8c0a8'],
	]),
	width: 40,
	height: 24,
}

// --- Inside ----------------------------------------------------------------

/** Cilia, a row of them up off the floor, waving: tiny hairs, huge now, swaying. 30 by 24. */
export const cilia = paintedArt(30, 24, (x, y) => {
	if (y >= 21) return y < 22 ? MUCOSA_LIT : MUCOSA_DARK
	for (let i = 0; i < 6; i++) {
		const root = 3 + i * 4.8
		// Each sways over to one side, higher up, more.
		const sway = (i % 2 ? 1 : -1) * ((21 - y) / 21) ** 2 * 4
		const top = 2 + (i % 3) * 2
		if (y < top) continue
		const d = x - (root + sway)
		if (Math.abs(d) < 0.9) return d < 0 ? '#fbd8da' : '#f0aab0'
	}
	return undefined
})

/** Air sacs, a bunch of them, like grapes, veined with capillaries. 40 by 40. */
export const alveoli = paintedArt(40, 40, (x, y) => {
	const sacs: [number, number, number][] = [
		[12, 12, 8],
		[26, 10, 8],
		[20, 22, 9],
		[9, 27, 7],
		[31, 25, 7],
		[20, 33, 6],
	]
	// The stalk they're on, an airway.
	if (Math.abs(x - 20) < 2.5 && y > 34) return '#e08896'
	for (const [cx, cy, r] of sacs) {
		const d = Math.hypot(x - cx, y - cy)
		if (d > r) continue
		if (d > r - 1.2) return y > cy ? '#c86a7c' : '#e8909e'
		if (y < cy - r * 0.35 && x < cx - 1) return SAC_LIT
		if (y > cy + r * 0.45) return '#eba2b0'
		return SAC
	}
	return undefined
})

/** An airway, branching in two, its rings round it. 60 by 50. */
export const bronchus = paintedArt(60, 50, (x, y) => {
	const tube = (x0: number, y0: number, x1: number, y1: number, r: number) => {
		const dx = x1 - x0
		const dy = y1 - y0
		const t = Math.max(
			0,
			Math.min(1, ((x - x0) * dx + (y - y0) * dy) / (dx * dx + dy * dy)),
		)
		return { d: Math.hypot(x - x0 - dx * t, y - y0 - dy * t), r, t }
	}
	for (const part of [
		tube(30, 50, 30, 28, 9),
		tube(30, 30, 10, 6, 7),
		tube(30, 30, 50, 8, 7),
	]) {
		if (part.d > part.r) continue
		if (part.d > part.r - 1.2) return '#c86a7c'
		// A ring round it, now and then.
		if (Math.round(part.t * 8) % 2 === 0 && part.d < part.r - 2)
			return '#f6d0d4'
		return '#e9a0aa'
	}
	return undefined
})

/** Capillaries, up the wall: a vessel off the floor, branching, and branching again. 40 by 30. */
export const capillaries = pixelArt(40, 30, [
	// The vessel, up off the floor.
	[18, 16, 3, 12, BLOOD_DARK],
	[18, 16, 1, 12, BLOOD],
	// Its two branches, and theirs.
	...(
		[
			[[17, 16], [-1, -1], 8],
			[[20, 16], [1, -1], 8],
			[[10, 9], [-1, -1], 5],
			[[10, 9], [0, -1], 7],
			[[27, 9], [1, -1], 6],
			[[27, 9], [0, -1], 6],
			[[13, 12], [-1, 0], 8],
			[[24, 12], [1, 0], 9],
		] as [[number, number], [number, number], number][]
	).flatMap(([[x, y], [dx, dy], n]): PixelRect[] =>
		Array.from(
			{ length: n },
			(_, k): PixelRect => [
				x + dx * k,
				y + dy * k,
				2,
				2,
				k % 3 ? BLOOD : '#e05a6a',
			],
		),
	),
	[12, 28, 16, 2, MUSCLE_DARK],
])

/** A red blood cell, side on, as it drifts: for scenery. */
function cell(x: number, y: number): PixelRect[] {
	return [
		[x, y + 1, 10, 4, BLOOD],
		[x + 1, y, 3, 1, BLOOD_LIT],
		[x + 6, y, 3, 1, BLOOD_LIT],
		[x + 4, y + 1, 2, 1, BLOOD_DARK],
		[x + 1, y + 5, 8, 1, BLOOD_DARK],
	]
}

/** Red blood cells, drifting by, the blood carrying them. 40 by 20. */
export const floatingCells = pixelArt(40, 20, [
	...cell(2, 12),
	...cell(16, 4),
	...cell(28, 13),
	[0, 18, 40, 2, VESSEL_DARK],
])

/**
 * A white blood cell, on patrol for Germs: a white blob, its nucleus in
 * lobes, purple, and two eyes, looking. 28 by 28.
 */
export const whiteCell = paintedArt(28, 28, (x, y) => {
	const r = 12 + Math.sin(Math.atan2(y - 15, x - 14) * 5) * 1.4
	const d = Math.hypot(x - 14, y - 15)
	if (d > r) return undefined
	if (d > r - 1.2) return y > 15 ? '#d8d0c4' : '#fbfaf6'
	// Its eyes, looking ahead.
	if ((Math.abs(x - 18) < 1 || Math.abs(x - 22) < 1) && Math.abs(y - 10) < 1.2)
		return INK
	// Its nucleus, in three lobes.
	for (const [cx, cy] of [
		[10, 17],
		[15, 21],
		[19, 16],
	])
		if (Math.hypot(x - cx, y - cy) < 3.4) return '#8a5ab8'
	return '#f4f0e8'
})

/**
 * An air sac, in place of a bouncy toadstool (see `bouncers`): round,
 * plump, glistening, on its little airway, to bounce off. World pixels.
 */
export const ALVEOLUS = {
	asset: paintedArt(22, 16, (x, y) => {
		if (Math.abs(x - 11) < 2 && y > 12) return '#d27a89'
		const d = ((x - 11) / 10.5) ** 2 + ((y - 7.5) / 7) ** 2
		if (d > 1) return undefined
		if (d > 0.78) return y > 7.5 ? '#c86a7c' : '#ef9eac'
		if (x > 4 && x < 8 && y > 2 && y < 4) return '#ffffff'
		if (y < 6 && x < 10) return SAC_LIT
		return y > 10 ? '#eba2b0' : SAC
	}),
	width: 44,
	height: 32,
}

/** A Germ, a virus: round and green, its spikes out all round, glaring. */
function germ(wiggle: number) {
	return paintedArt(16, 16, (x, y) => {
		const dx = x - 8
		const dy = y - 8
		const d = Math.hypot(dx, dy)
		// Its spikes, eight of them, knobbed, wiggling.
		const a = Math.atan2(dy, dx) + wiggle
		const spike = Math.abs(Math.sin(a * 4)) > 0.86
		if (spike && d > 4.8 && d < 7.2) return GERM_DARK
		if (spike && d >= 7.2 && d < 8.2) return GERM_SPIKE
		if (d > 5.4) return undefined
		// Its face: angry eyes, and a grin.
		if (
			Math.abs(dy + 1.2) < 0.7 &&
			(Math.abs(dx + 2) < 0.7 || Math.abs(dx - 2) < 0.7)
		)
			return INK
		if (Math.abs(dy + 2.5) < 0.6 && Math.abs(dx) > 1 && Math.abs(dx) < 3.2)
			return GERM_DARK
		if (Math.abs(dy - 2) < 0.6 && Math.abs(dx) < 2.2) return '#ffffff'
		if (d > 4.4) return GERM_DARK
		if (dy < -2 && dx < 0) return GERM_LIT
		return GERM
	})
}

/**
 * A Germ: two frames, bobbing, and burst; `GERM_SIZE` across (see
 * `germ`), in world pixels.
 */
export const GERM_FRAMES: [string, string] = [germ(0), germ(Math.PI / 8)]
/** Burst: a ring of green splats, flying apart. */
export const GERM_POPPED = paintedArt(16, 16, (x, y) => {
	const d = Math.hypot(x - 8, y - 8)
	const a = Math.atan2(y - 8, x - 8)
	if (d > 5.5 && d < 7.8 && Math.abs(Math.sin(a * 4)) > 0.7) return GERM
	if (d > 2.5 && d < 4 && Math.abs(Math.cos(a * 4)) > 0.8) return GERM_LIT
	return undefined
})

/**
 * A heart valve in the floor, shut and open: a raised rim of muscle, its
 * two leaflets, pale, meeting in the middle; open, flapped up, the dark
 * under it. And chevrons over it, pointing up, lit on the beat: stand here.
 * Cells of 2, 48 by 9: world pixels, `VALVE` across and tall.
 */
const VALVE_RIM = '#e0566c'
const VALVE_RIM_LIT = '#f58a9a'
const VALVE_RIM_DARK = '#86192b'
const LEAFLET = '#f6dcd4'
const LEAFLET_LIT = '#fff3ee'
const LEAFLET_SHADE = '#d8a8a4'
const VALVE_DEEP = '#1e0408'
export const VALVE = {
	shut: pixelArt(48, 9, [
		// The rim, raised, lit along its top.
		[2, 0, 44, 9, VALVE_RIM],
		[0, 2, 48, 7, VALVE_RIM],
		[2, 0, 44, 1, VALVE_RIM_LIT],
		[0, 8, 48, 1, VALVE_RIM_DARK],
		// The leaflets, meeting in the middle.
		[3, 2, 20, 4, LEAFLET],
		[25, 2, 20, 4, LEAFLET],
		[3, 2, 20, 1, LEAFLET_LIT],
		[25, 2, 20, 1, LEAFLET_LIT],
		[3, 5, 42, 1, LEAFLET_SHADE],
		[23, 2, 2, 5, VALVE_RIM_DARK],
	]),
	open: pixelArt(48, 9, [
		[2, 0, 44, 9, VALVE_RIM],
		[0, 2, 48, 7, VALVE_RIM],
		[2, 0, 44, 1, VALVE_RIM_LIT],
		[0, 8, 48, 1, VALVE_RIM_DARK],
		// The dark under it, the leaflets flapped up either end.
		[4, 2, 40, 6, '#3a0810'],
		[6, 3, 36, 5, VALVE_DEEP],
		[2, 0, 4, 3, LEAFLET],
		[42, 0, 4, 3, LEAFLET],
		[2, 0, 4, 1, LEAFLET_LIT],
		[42, 0, 4, 1, LEAFLET_LIT],
	]),
	/** Over it, two chevrons pointing up: 12 by 10 cells, drawn as the valve is. */
	arrows: pixelArt(12, 10, [
		[5, 0, 2, 1, '#ffffff'],
		[3, 1, 6, 1, '#ffffff'],
		[1, 2, 3, 1, '#ffffff'],
		[8, 2, 3, 1, '#ffffff'],
		[0, 3, 2, 1, '#ffffff'],
		[10, 3, 2, 1, '#ffffff'],
		[5, 5, 2, 1, '#ffffff'],
		[3, 6, 6, 1, '#ffffff'],
		[1, 7, 3, 1, '#ffffff'],
		[8, 7, 3, 1, '#ffffff'],
		[0, 8, 2, 1, '#ffffff'],
		[10, 8, 2, 1, '#ffffff'],
	]),
	width: 96,
	height: 18,
}

/**
 * A ridge of muscle between the heart's chambers, too high to jump (see
 * `RIDGES` in `karolinska`): a column of it, its fibres running up it,
 * bulging, lit down its left, in shadow down its right, its top a rounded
 * cap to stand on, and flaring out into the floor at its foot, cords of
 * tendon strung off it. `width` by `height` world pixels, in cells of 2.
 */
export function heartPillar(width: number, height: number) {
	const columns = width / 2
	const rows = Math.ceil(height / 2)
	/** How far in from either side its column is, `y` cells down: bulging, and flaring at its foot. */
	const inset = (y: number) => {
		const bulge = Math.round(Math.sin((y / rows) * Math.PI * 3) * 1.5)
		const flare = Math.max(0, 8 - (rows - y)) * 1.2
		return Math.max(0, 5 + bulge - flare)
	}
	return paintedArt(columns, rows, (x, y) => {
		const cx = Math.floor(x)
		const cy = Math.floor(y)
		// Its cap: rounded over, lit, the top of it what's stood on.
		if (cy < 22) {
			const round = cy < 3 ? 3 - cy : 0
			if (cx < round || cx >= columns - round) return undefined
			if (cy < 3) return MUSCLE_LIT
			if (cy < 6) return cx % 7 === 3 ? MUSCLE_LIT : '#d85a6c'
			if (cy > 18) return MUSCLE_DARK
			return cx < 3 ? MUSCLE_LIT : cx > columns - 4 ? MUSCLE_DARK : MUSCLE
		}
		const side = inset(cy)
		if (cx < side || cx >= columns - side) {
			// Cords of tendon, strung off it, pale.
			const along = cy - 26
			if (along > 0 && along < 30 && Math.abs(cx - (side - along / 3)) < 0.6)
				return '#f2d0c8'
			if (
				along > 6 &&
				along < 36 &&
				Math.abs(cx - (columns - side + (along - 6) / 3)) < 0.6
			)
				return '#f2d0c8'
			return undefined
		}
		// Its fibres, running up it, wavering.
		const wave = Math.round(Math.sin(cy / 5) * 1)
		const fibre = (cx + wave - side) % 6 === 0
		if (cx - side < 2) return MUSCLE_LIT
		if (columns - side - cx <= 3) return MUSCLE_DARK
		if (fibre) return MUSCLE_DARK
		// A shadow under its cap.
		if (cy < 26) return MUSCLE_DARK
		return MUSCLE
	})
}
