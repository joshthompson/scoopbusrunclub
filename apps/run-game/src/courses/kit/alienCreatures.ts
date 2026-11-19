import { type PixelRect, letterArt, paintedArt, pixelArt } from './pixelArt'

/**
 * Rocket Launch's aliens: its troopers, and the boss, the giant in its
 * chamber at the end. Their sizes are the game's (see `ALIEN` and the
 * course's `Boss` in `game/space.ts`): draw to them.
 */

// A trooper's colours: bare green skin with a paler belly, big black eyes,
// a leather harness to carry the pistol, and the pistol's greys.
const SKIN = '#6fae4a'
const SKIN_LIT = '#9ad868'
const SKIN_SHADE = '#437a35'
const BELLY = '#c4dc88'
const EYE = '#16121c'
const GLINT = '#9ad8ff'
const STRAP = '#7a5436'
const BUCKLE = '#d0a448'
const GUN = '#8a8a9c'
const GUN_SHADE = '#555566'
const MUZZLE = '#3a3a48'
const GLOW = '#8cf060'
const GLOW_LIT = '#d2ffa8'
const GLOW_SHADE = '#5aa840'

const trooperColours = {
	k: SKIN_LIT,
	K: SKIN,
	d: SKIN_SHADE,
	b: BELLY,
	E: EYE,
	e: GLINT,
	H: STRAP,
	h: BUCKLE,
	G: GUN,
	g: GUN_SHADE,
	m: MUZZLE,
}

/** Aiming: its pistol glowing green from the muzzle back. */
const aimColours = { ...trooperColours, m: GLOW_LIT, G: GLOW, g: GLOW_SHADE }

// Its head: a big bald bulb, tapering to a small chin, with two huge black
// eyes set towards the front.
const HEAD = [
	'.......kkkkk.....',
	'......kkKKKKKd...',
	'.....kEEKKEEKKKd.',
	'.....EEeKEEeKKKd.',
	'.....KEEKKEEKKKd.',
]

const STAND = [
	...HEAD,
	// Its pistol held out in front of its face, at the picture's left edge.
	'mGGGGGGGKKKKKKd..',
	'mggggggGKKKKKd...',
	'......KkKKKKd....',
	'......K.KKKd.....',
	// A wiry body, its belly pale, a strap across it and a belt.
	'.......KKKKKKd...',
	'......KKHbbbKd...',
	'......KKbHbbKd...',
	'.......KbbHbKd...',
	'.......kHHhHHd...',
	'.......KKKKKKd...',
	// Long thin legs, and long feet.
	'.......KK.KKd....',
	'.......Kd..Kd....',
	'.......Kd..Kd....',
	'.......Kd..Kd....',
	'.......Kd..Kd....',
	'....kKKKd.kKKKd..',
	'....dddd..dddd...',
]

const KNEEL = [
	...HEAD,
	'.....KKKKKKKKd...',
	'......KKKKKKKd...',
	'.......KkKKKd....',
	// Its pistol lowered.
	'mGGGGGGGKKKKKd...',
	'mggggggGKKbbKd...',
	'......KKHbbbKd...',
	'.......kHHhHHd...',
	// One long leg folded forward, the other knee down behind.
	'...KKKKKKd.KKd...',
	'...Kd....KKd.....',
	'...Kd....KKKd....',
	'kKKKd....kKKKKd..',
]

/** A trooper's art: letters, so the aiming one is the same drawing with its pistol lit. */
const trooper = (rows: string[], aim: boolean) =>
	letterArt(rows, aim ? aimColours : trooperColours)

/** Knocked flat on its back, dazed: swirly eyes, knees in the air, its pistol dropped. */
const out = (): PixelRect[] => [
	// Its head, lying on its back, its dome to the left.
	[1, 2, 8, 6, SKIN],
	[2, 1, 6, 1, SKIN],
	[3, 0, 4, 1, SKIN_LIT],
	[1, 2, 7, 1, SKIN_LIT],
	[1, 7, 8, 1, SKIN_SHADE],
	// Its eyes, with a swirl in each.
	[1, 3, 3, 3, EYE],
	[5, 3, 3, 3, EYE],
	[2, 4, 1, 1, GLINT],
	[6, 4, 1, 1, GLINT],
	[3, 6, 3, 1, SKIN_SHADE],
	// Its neck, and thin chest, belly up.
	[9, 5, 2, 3, SKIN],
	[10, 3, 6, 4, SKIN],
	[10, 3, 6, 1, SKIN_LIT],
	[11, 4, 4, 2, BELLY],
	[12, 3, 1, 4, STRAP],
	// Its legs, knees up.
	[16, 3, 2, 4, SKIN],
	[17, 1, 2, 3, SKIN],
	[17, 0, 3, 1, SKIN_LIT],
	[19, 4, 2, 3, SKIN],
	[20, 2, 2, 3, SKIN],
	[20, 1, 3, 1, SKIN_LIT],
	[16, 6, 2, 1, SKIN_SHADE],
	// Its pistol, dropped.
	[10, 7, 8, 1, GUN],
	[10, 7, 1, 1, MUZZLE],
	[16, 7, 2, 1, GUN_SHADE],
]

/**
 * An alien trooper, facing left: stood, taking aim (its gun glowing),
 * kneeling, kneeling and taking aim, and knocked out flat. Drawn at a cell
 * a pixel, 17 by 23 (kneeling, 17 by 16; flat, 23 by 8).
 */
export const ALIEN_ART = {
	stand: trooper(STAND, false),
	aim: trooper(STAND, true),
	kneel: trooper(KNEEL, false),
	kneelAim: trooper(KNEEL, true),
	out: pixelArt(23, 8, out()),
}

// The boss's colours: a bloated olive-khaki hide, mottled and veined, fleshy
// underneath, with the glow of its sacs the only bright thing on it.
const HIDE = '#8a8458'
const HIDE_LIT = '#b2ac7a'
const HIDE_SHADE = '#5f5a3e'
const HIDE_DEEP = '#403c2a'
const MOTTLE = '#767048'
const MOTTLE_LIT = '#9c9664'
const WET = '#dcd8ae'
const VEIN = '#8a5a50'
const FLESH = '#bca486'
const FLESH_SHADE = '#947a62'
const FOLD = '#4c4832'
const BONE = '#cfc6a0'
const BOSS_EYE = '#1a1612'
const AMBER = '#e8a830'
const GLAZE = '#8a8a78'
const MAW = '#43242c'
const TOOTH = '#d8cfa8'
const TONGUE = '#9a4a52'
const SAC = '#5a7a40'
const SAC_SHADE = '#3c5430'
const SAC_GLOW = '#8cf060'
const SAC_CORE = '#d2ffa8'
const SAC_DEAD = '#6a6a50'

type Paint = (x: number, y: number) => string | undefined

/** A filled ellipse of colour. */
const ellipse =
	(cx: number, cy: number, rx: number, ry: number, colour: string): Paint =>
	(x, y) =>
		((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 ? colour : undefined

/** A rect of colour. */
const block =
	(x0: number, y0: number, w: number, h: number, colour: string): Paint =>
	(x, y) =>
		x >= x0 && x < x0 + w && y >= y0 && y < y0 + h ? colour : undefined

/** A pattern of cells (`#`), from a corner. */
const stamp =
	(x0: number, y0: number, rows: string[], colour: string): Paint =>
	(x, y) =>
		rows[Math.floor(y) - y0]?.[Math.floor(x) - x0] === '#' ? colour : undefined

/** A line of one-cell dots through points: a vein. */
function line(points: [number, number][], colour: string): Paint {
	const cells = new Set<string>()
	for (let i = 1; i < points.length; i++) {
		const [x0, y0] = points[i - 1]
		const [x1, y1] = points[i]
		const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
		for (let s = 0; s <= steps; s++)
			cells.add(
				`${Math.round(x0 + ((x1 - x0) * s) / steps)},${Math.round(y0 + ((y1 - y0) * s) / steps)}`,
			)
	}
	return (x, y) =>
		cells.has(`${Math.floor(x)},${Math.floor(y)}`) ? colour : undefined
}

const Z = ['####', '..#.', '.#..', '####']
const BIG_Z = ['#####', '...#.', '..#..', '.#...', '#####']

interface BossPose {
	/** Where its bloated body sits, and its size (rx 32.5 is the 260 px of it). */
	cy: number
	ry: number
	rx: number
	eyes: 'shut' | 'open' | 'squint' | 'dead'
	mouth: 'shut' | 'open' | 'wide' | 'slack'
	/** How its flank sacs look: resting, charged to fire, or dead. */
	sacs: 'dim' | 'hot' | 'dead'
	/** Its left leg, lifted this many cells off the floor. */
	lift: number
	/** Its sleeping zzz. */
	zzz: boolean
}

/** One frame of the boss: layers of shapes, later ones over earlier ones. */
function boss({ cy, ry, rx, eyes, mouth, sacs, lift, zzz }: BossPose) {
	const cx = 37.5
	const inBody = (x: number, y: number) =>
		((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1
	const onBody =
		(paint: Paint): Paint =>
		(x, y) =>
			inBody(x, y) ? paint(x, y) : undefined

	// Its hide: lit from above left, shadowed under and to the right, mottled
	// in blotches, fleshy on its underside.
	const skin: Paint = (x, y) => {
		const dx = (x - cx) / rx
		const dy = (y - cy) / ry
		const d = dx * dx + dy * dy
		if (d > 1) return undefined
		const s = dx * 0.4 + dy
		if (dy > 0.25 && d < 0.85) return s > 0.7 ? FLESH_SHADE : FLESH
		if (d > 0.8) return s < -0.45 ? HIDE_LIT : s > 0.35 ? HIDE_DEEP : HIDE
		const blotch =
			Math.sin(x * 0.45) + Math.sin(y * 0.6 + x * 0.2) + Math.sin((x + y) * 0.3)
		if (blotch > 1.15) return s > 0.55 ? HIDE_DEEP : MOTTLE
		if (blotch < -1.2) return MOTTLE_LIT
		return s > 0.55 ? HIDE_SHADE : HIDE
	}
	// Folds of fat across its belly: a dark crease with a lit lip under it.
	const folds: Paint[] = [58, 66, 74].flatMap((fy) => [
		onBody((x, y) => {
			const t = ((x - cx) / rx) ** 2
			const line = fy + 4 * t
			return y >= line && y < line + 1
				? FOLD
				: y >= line + 1 && y < line + 2 && t < 0.7
					? FLESH
					: undefined
		}),
	])
	// Veins over its back, and a few wet highlights.
	const veins: Paint[] = [
		line(
			[
				[cx - 4, cy - ry + 3],
				[cx - 2, cy - ry + 9],
				[cx + 4, cy - ry + 14],
				[cx + 12, cy - ry + 17],
			],
			VEIN,
		),
		line(
			[
				[cx + 4, cy - ry + 14],
				[cx + 6, cy - ry + 22],
				[cx + 4, cy - ry + 28],
			],
			VEIN,
		),
		line(
			[
				[cx + 12, cy - ry + 17],
				[cx + 20, cy - ry + 18],
				[cx + 25, cy - ry + 24],
			],
			VEIN,
		),
		line(
			[
				[cx - 14, cy - ry + 10],
				[cx - 8, cy - ry + 14],
				[cx - 6, cy - ry + 20],
			],
			VEIN,
		),
	].map(onBody)
	const wet: Paint[] = [
		block(cx - 18, cy - ry + 4, 9, 1, WET),
		block(cx - 22, cy - ry + 6, 3, 1, WET),
		block(cx + 8, cy - ry + 3, 4, 1, WET),
		block(cx + 22, cy - 16, 1, 3, WET),
	].map(onBody)

	// A leg is a thick pillar, wrinkled, its foot flaring out with three
	// pale toenails along its front.
	const leg = (lx: number, up: number): Paint[] => [
		block(lx - 9, 74 - up, 18, 22, HIDE),
		block(lx - 9, 74 - up, 3, 22, HIDE_LIT),
		block(lx + 4, 74 - up, 5, 22, HIDE_SHADE),
		block(lx - 9, 80 - up, 18, 1, FOLD),
		block(lx - 9, 86 - up, 18, 1, FOLD),
		block(lx - 6, 81 - up, 10, 1, HIDE_LIT),
		ellipse(lx - 1, 96 - up, 12, 4.5, HIDE),
		block(lx - 13, 96 - up, 26, 4, HIDE_SHADE),
		block(lx + 6, 96 - up, 7, 4, HIDE_DEEP),
		block(lx - 12, 97 - up, 4, 3, BONE),
		block(lx - 6, 98 - up, 4, 2, BONE),
		block(lx, 98 - up, 4, 2, BONE),
	]

	// A flank sac, out of each side: where the plasma comes from.
	const glow = sacs === 'hot' ? SAC_GLOW : sacs === 'dim' ? SAC : SAC_DEAD
	const sac = (sx: number): Paint[] => [
		ellipse(sx, cy + 1, 6.5, 7.5, HIDE_DEEP),
		ellipse(sx, cy + 1, 5, 6, sacs === 'dead' ? SAC_DEAD : SAC_SHADE),
		ellipse(sx, cy + 1, 4, 5, glow),
		...(sacs === 'hot'
			? [ellipse(sx, cy + 1, 2.2, 3, SAC_CORE)]
			: [block(sx - 2, cy - 2, 2, 2, WET)]),
		// Veins running into it.
		line(
			[
				[sx > cx ? sx - 6 : sx + 6, cy - 8],
				[sx > cx ? sx - 5 : sx + 5, cy - 3],
			],
			VEIN,
		),
		line(
			[
				[sx > cx ? sx - 6 : sx + 6, cy + 10],
				[sx > cx ? sx - 5 : sx + 5, cy + 5],
			],
			VEIN,
		),
	]

	// Its head, a heavy lump merging into the body on the left, with a cluster
	// of eyes and a wide mouth, low.
	const eye = (ex: number, ey: number, r: number): Paint[] => {
		if (eyes === 'shut')
			return [
				ellipse(ex, ey, r, r * 0.8, HIDE_SHADE),
				block(ex - r, ey, 2 * r, 1, HIDE_DEEP),
			]
		if (eyes === 'squint')
			return [
				ellipse(ex, ey, r, r * 0.8, HIDE_SHADE),
				block(ex - r + 1, ey - 1, 2 * r - 2, 2, HIDE_DEEP),
				block(ex - 1, ey - 1, 2, 1, AMBER),
				block(ex - r, ey - r + 1, 2 * r, 1, HIDE_DEEP),
			]
		if (eyes === 'dead')
			return [
				ellipse(ex, ey, r, r, GLAZE),
				block(ex - 1, ey - 1, 1, 1, BOSS_EYE),
				block(ex, ey, 1, 1, BOSS_EYE),
				block(ex - 1, ey + 1, 1, 1, BOSS_EYE),
				block(ex, ey - 1, 1, 1, BOSS_EYE),
			]
		return [
			ellipse(ex, ey, r, r, BOSS_EYE),
			ellipse(ex - 0.5, ey, r - 1, r - 1, AMBER),
			block(ex - 1, ey - r + 1, 1, 2 * r - 2, BOSS_EYE),
			block(ex - r + 1, ey - r + 1, 1, 1, WET),
		]
	}
	const head: Paint[] = [
		// Its brow ridge and snout shadow.
		ellipse(15, 50, 14, 16, HIDE_SHADE),
		ellipse(16, 48, 13, 15, HIDE),
		ellipse(15, 46, 11, 12, MOTTLE_LIT),
		block(7, 36, 14, 1, HIDE_LIT),
		block(5, 36, 20, 1, HIDE_LIT),
		...eye(11, 41, 4),
		...eye(20, 35, 5.5),
		...eye(28, 42, 3.5),
		...eye(17, 49, 2.5),
		...eye(27, 30, 2.5),
	]
	const my = 59
	const jaw: Paint[] = []
	if (mouth === 'shut') {
		jaw.push(block(4, my + 2, 26, 2, MAW), block(3, my, 2, 3, HIDE_DEEP))
		if (zzz)
			jaw.push(block(10, my + 4, 1, 4, WET), block(10, my + 7, 2, 2, WET))
	} else {
		const tall = mouth === 'wide' ? 8 : mouth === 'slack' ? 5 : 6
		jaw.push(ellipse(17, my + 3, 14, tall, MAW))
		for (let t = 5; t <= 26; t += 4) {
			jaw.push(block(t, my + 3 - tall + 1, 2, 3, TOOTH))
			if (mouth !== 'slack')
				jaw.push(block(t + 2, my + 3 + tall - 3, 2, 3, TOOTH))
		}
		jaw.push(ellipse(18, my + 3 + tall - 3, 8, 2, TONGUE))
		if (mouth === 'slack')
			jaw.push(
				block(14, my + 6, 8, 6, TONGUE),
				block(17, my + 6, 1, 6, '#6a2f38'),
			)
	}

	const layers: Paint[] = [
		...leg(24, 0),
		...leg(54, 0),
		skin,
		...folds,
		...veins,
		...wet,
		...head.map(onBody),
		...jaw.map(onBody),
		...sac(cx - rx + 2),
		...sac(cx + rx - 2),
		// A lifted leg, in front of its belly.
		...(lift ? leg(16, lift) : []),
	]
	if (zzz)
		layers.push(stamp(11, 10, Z, HIDE_LIT), stamp(1, 0, BIG_Z, '#e8e4c4'))
	return paintedArt(75, 100, (x, y) => {
		let colour: string | undefined
		for (const layer of layers) colour = layer(x, y) ?? colour
		return colour
	})
}

const BOSS_STAND = {
	cy: 44,
	ry: 39,
	rx: 32.5,
	lift: 0,
	zzz: false,
	sacs: 'dim' as const,
}

/**
 * The boss: a giant alien, many times anyone's size, facing left: a bloated,
 * mottled hulk on thick legs, a cluster of eyes on its heavy head, glowing
 * sacs down its flanks. Asleep, awake, hurt (hit on the head), winding up to
 * stomp (a leg up), and beaten. Drawn in cells of 4, 75 by 100, so 300 by
 * 400 on the screen.
 */
export const BOSS = {
	asleep: boss({ ...BOSS_STAND, eyes: 'shut', mouth: 'shut', zzz: true }),
	awake: boss({ ...BOSS_STAND, eyes: 'open', mouth: 'open', sacs: 'hot' }),
	hurt: boss({
		...BOSS_STAND,
		cy: 50,
		ry: 34,
		rx: 34.5,
		eyes: 'squint',
		mouth: 'wide',
		sacs: 'hot',
	}),
	stomp: boss({
		...BOSS_STAND,
		eyes: 'open',
		mouth: 'wide',
		sacs: 'hot',
		lift: 14,
	}),
	beaten: boss({
		...BOSS_STAND,
		cy: 58,
		ry: 28,
		rx: 35,
		eyes: 'dead',
		mouth: 'slack',
		sacs: 'dead',
	}),
	width: 300,
	height: 400,
	/** How wide its head is to land on, across its top. */
	head: 140,
}
