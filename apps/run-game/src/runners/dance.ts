/**
 * Everyone's dance: done over the line once they've stopped, and on the
 * Podium while they're stood about. Each is a strip of frames made from
 * their stand pose, the same width, with `DANCE_HEADROOM` rows more on top
 * for hopping up and arms in the air.
 *
 * The members' and the bonus runners' are made once by
 * `scripts/make-dances.ts` and kept as pictures (`assets/dance/<member>.png`,
 * `assets/runners/<who>/dance.png`), to touch up by hand. Anyone made from a
 * look, a custom runner or a guest, has theirs made as the game starts.
 *
 * Nothing here needs a browser: it's the same code either way.
 */

/** A picture's pixels, RGBA, row by row. */
export interface Pixels {
	width: number
	height: number
	data: Uint8ClampedArray | Uint8Array
}

/** Rows added on top of the stand pose, for hops and arms up. */
export const DANCE_HEADROOM = 4

type Colour = [number, number, number, number]
type Point = [number, number]

/**
 * Where an arm's elbow and hand are, from its shoulder: across, out away
 * from the body, and down. The same pose for either arm, mirrored.
 */
const ARMS = {
	down: [
		[0, 3],
		[0, 6],
	],
	up: [
		[1, -3],
		[2, -7],
	],
	out: [
		[3, 0],
		[6, -1],
	],
	pointUp: [
		[2, -2],
		[4, -6],
	],
	pointDown: [
		[2, 2],
		[4, 5],
	],
	hip: [
		[3, 2],
		[1, 5],
	],
	roofLow: [
		[3, 1],
		[3, -2],
	],
	roofHigh: [
		[3, -1],
		[3, -5],
	],
	flapIn: [
		[2, 2],
		[0, 3],
	],
	flapOut: [
		[4, 0],
		[1, 2],
	],
	robotUp: [
		[4, 0],
		[4, -4],
	],
	robotDown: [
		[4, 0],
		[4, 4],
	],
} satisfies Record<string, [elbow: Point, hand: Point]>

type Arm = keyof typeof ARMS

/** One frame of a dance, from their stand pose. */
interface Move {
	/** Their arms, near and far, if they've arms to move. */
	arms?: [near: Arm, far: Arm]
	/** Up off the ground, in pixels: no more than `DANCE_HEADROOM`. */
	lift?: number
	/** Knees bent, in rows: down that much. */
	bend?: number
	/** Leant over, their head this far across (back, positive), their middle half as far. */
	sway?: number
	/** Their hips pushed across, this far. */
	hips?: number
	/** Turned round. */
	flip?: boolean
	/** Side on, halfway round. */
	narrow?: boolean
}

interface Dance {
	moves: Move[]
	/** How long each frame shows, in milliseconds. */
	interval: number
}

/**
 * The dances. Those with arms moving need a figure on the club's template to
 * find the arms of (see `figureOf`); anyone else does the rest of the moves,
 * their arms as they are.
 */
export const DANCES = {
	/** Pointing up, then down, hip to hip. */
	disco: {
		interval: 170,
		moves: [
			{ arms: ['pointUp', 'hip'], sway: -1 },
			{ arms: ['pointUp', 'hip'], sway: -1, bend: 1 },
			{ arms: ['pointDown', 'pointUp'], sway: 1 },
			{ arms: ['pointDown', 'pointUp'], sway: 1, bend: 1 },
		],
	},
	/** Raising the roof, bobbing along. */
	roof: {
		interval: 150,
		moves: [
			{ arms: ['roofLow', 'roofLow'], bend: 1 },
			{ arms: ['roofHigh', 'roofHigh'] },
			{ arms: ['roofLow', 'roofLow'], bend: 1 },
			{ arms: ['roofHigh', 'roofHigh'], lift: 1 },
		],
	},
	/** Arms up, swaying side to side. */
	wave: {
		interval: 120,
		moves: [
			{ arms: ['up', 'up'], sway: -2, hips: 1 },
			{ arms: ['up', 'up'], sway: -1 },
			{ arms: ['up', 'up'] },
			{ arms: ['up', 'up'], sway: 1 },
			{ arms: ['up', 'up'], sway: 2, hips: -1 },
			{ arms: ['up', 'up'], sway: 1 },
			{ arms: ['up', 'up'] },
			{ arms: ['up', 'up'], sway: -1 },
		],
	},
	/** Star jumps. */
	star: {
		interval: 110,
		moves: [
			{ arms: ['down', 'down'], bend: 2 },
			{ arms: ['out', 'out'], lift: 2 },
			{ arms: ['up', 'up'], lift: 4 },
			{ arms: ['out', 'out'], lift: 2 },
			{ arms: ['down', 'down'], bend: 1 },
		],
	},
	/** Turning round on the spot, arms out. */
	spin: {
		interval: 140,
		moves: [
			{ arms: ['out', 'out'] },
			{ arms: ['down', 'down'], narrow: true, lift: 1 },
			{ arms: ['out', 'out'], flip: true },
			{ arms: ['down', 'down'], narrow: true, flip: true, lift: 1 },
		],
	},
	/** Hands on hips, hips side to side. */
	twist: {
		interval: 130,
		moves: [
			{ arms: ['hip', 'hip'], hips: 1, bend: 1 },
			{ arms: ['hip', 'hip'] },
			{ arms: ['hip', 'hip'], hips: -1, bend: 1 },
			{ arms: ['hip', 'hip'] },
		],
	},
	/** Stiff arms, right angles, held. */
	robot: {
		interval: 140,
		moves: [
			{ arms: ['robotUp', 'robotDown'] },
			{ arms: ['robotUp', 'robotDown'] },
			{ arms: ['out', 'out'], bend: 1 },
			{ arms: ['robotDown', 'robotUp'] },
			{ arms: ['robotDown', 'robotUp'] },
			{ arms: ['out', 'out'], bend: 1 },
		],
	},
	/** Elbows flapping, knees going. */
	chicken: {
		interval: 120,
		moves: [
			{ arms: ['flapIn', 'flapIn'], bend: 1, hips: 1 },
			{ arms: ['flapOut', 'flapOut'] },
			{ arms: ['flapIn', 'flapIn'], bend: 1, hips: -1 },
			{ arms: ['flapOut', 'flapOut'], lift: 1 },
		],
	},
	/** Bobbing up and down, side to side: arms as they are. */
	bounce: {
		interval: 150,
		moves: [
			{ sway: -1 },
			{ bend: 1, sway: -1 },
			{ bend: 2 },
			{ bend: 1, sway: 1 },
			{ sway: 1 },
			{ lift: 1 },
		],
	},
	/** Rocking side to side, hips the other way. */
	wiggle: {
		interval: 160,
		moves: [{ sway: -1, hips: 1 }, {}, { sway: 1, hips: -1 }, {}],
	},
	/** A dancing banana: arms up, waving one out and back, swaying and bouncing. */
	banana: {
		interval: 125,
		moves: [
			{ arms: ['up', 'up'], sway: -2, hips: 1, bend: 1 },
			{ arms: ['up', 'out'], sway: -1, lift: 1 },
			{ arms: ['up', 'up'], bend: 1 },
			{ arms: ['out', 'up'], sway: 1, lift: 1 },
			{ arms: ['up', 'up'], sway: 2, hips: -1, bend: 1 },
			{ arms: ['out', 'up'], sway: 1, lift: 1 },
			{ arms: ['up', 'up'], bend: 1 },
			{ arms: ['up', 'out'], sway: -1, lift: 1 },
		],
	},
	/** Round and round, hopping, chasing its tail. */
	zoomies: {
		interval: 110,
		moves: [
			{},
			{ narrow: true, lift: 1 },
			{ flip: true, lift: 3 },
			{ flip: true, lift: 1 },
			{ flip: true, narrow: true, lift: 1 },
			{ lift: 3 },
		],
	},
} satisfies Record<string, Dance>

export type DanceName = keyof typeof DANCES

/** The dances that move arms, for anyone made from a look: one each. */
const LOOK_DANCES: DanceName[] = [
	'disco',
	'roof',
	'wave',
	'star',
	'spin',
	'twist',
	'robot',
	'chicken',
]

/**
 * Who does which, by member, or by bonus runner's folder name. Anyone not
 * here, made from a look, gets one of `LOOK_DANCES` (see `danceForKey`).
 */
export const RUNNER_DANCES: Record<string, DanceName> = {
	josh: 'disco',
	otherJosh: 'robot',
	keith: 'roof',
	claire: 'wave',
	lyra: 'star',
	adam: 'chicken',
	anna: 'twist',
	eline: 'spin',
	rick: 'robot',
	sophie: 'wave',
	alisa: 'disco',
	mikael: 'roof',
	// Pushing a pram: rocking it.
	august: 'wiggle',
	// A dog.
	link: 'zoomies',
	yeti: 'star',
	'bat-person': 'chicken',
	// Leant on his axe.
	viking: 'bounce',
	skeleton: 'spin',
	'ms-crocodile': 'twist',
	'banana-girl': 'banana',
}

/** A dance for anyone not in `RUNNER_DANCES`, from something about them that stays the same. */
export function danceForKey(key: string): DanceName {
	const known = RUNNER_DANCES[key]
	if (known) return known
	let hash = 0
	for (const c of key) hash = (hash * 31 + c.charCodeAt(0)) | 0
	return LOOK_DANCES[Math.abs(hash) % LOOK_DANCES.length]
}

/** How many frames a dance has. */
export const danceLength = (name: DanceName) => DANCES[name].moves.length

/**
 * Where everything is on a stand pose on the club's template: its head, down
 * to its neck, its shirt, its shorts and its legs, by row; its body's middle
 * across; its shirt's width; and its shirt's and skin's colours. Found from
 * the picture, so as not to care how tall anyone is.
 */
interface Figure {
	top: number
	neck: number
	shortsTop: number
	legsTop: number
	bottom: number
	middle: number
	/** The shirt's columns, without the arms. */
	left: number
	right: number
	shirt?: Colour
	skin?: Colour
	/** Whether arms were found to move: if not, they stay as they are. */
	arms: boolean
}

const distance = (a: Colour, b: Colour) =>
	Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2])
const keyOf = (c: Colour) => `${c[0]},${c[1]},${c[2]}`
const shade = (c: Colour, by: number): Colour => [
	Math.min(255, Math.round(c[0] * by)),
	Math.min(255, Math.round(c[1] * by)),
	Math.min(255, Math.round(c[2] * by)),
	255,
]
/** Near enough the skin's colour to be skin: shaded, or a hand a touch lighter than the face. */
const SKIN_NEAR = 60

function reader(p: Pixels) {
	const at = (x: number, y: number): Colour | undefined => {
		if (x < 0 || y < 0 || x >= p.width || y >= p.height) return undefined
		const i = (y * p.width + x) * 4
		return p.data[i + 3] > 128
			? [p.data[i], p.data[i + 1], p.data[i + 2], 255]
			: undefined
	}
	/** Each row's runs of pixels, left to right. */
	const runs = (y: number) => {
		const found: [number, number][] = []
		for (let x = 0; x < p.width; x++) {
			if (!at(x, y)) continue
			const from = x
			while (x + 1 < p.width && at(x + 1, y)) x++
			found.push([from, x])
		}
		return found
	}
	/** The commonest colour in a box, leaving out any `skip` says to. */
	const majority = (
		x0: number,
		x1: number,
		y0: number,
		y1: number,
		skip?: (c: Colour) => boolean,
	) => {
		const counts = new Map<string, [Colour, number]>()
		for (let y = y0; y <= y1; y++)
			for (let x = x0; x <= x1; x++) {
				const c = at(x, y)
				if (!c || skip?.(c)) continue
				counts.set(keyOf(c), [c, (counts.get(keyOf(c))?.[1] ?? 0) + 1])
			}
		return [...counts.values()].sort((a, b) => b[1] - a[1])[0]?.[0]
	}
	return { at, runs, majority }
}

/** A stand pose's figure, found as well as it can be: see `Figure`. */
function figureOf(stand: Pixels, armsWanted: boolean): Figure {
	const { at, runs, majority } = reader(stand)
	let top = 0
	while (top < stand.height - 1 && !runs(top).length) top++
	let bottom = stand.height - 1
	while (bottom > top && !runs(bottom).length) bottom--
	const tall = bottom - top
	// Nothing found but its size: a body's rough parts, by height.
	const rough: Figure = {
		top,
		neck: top + Math.round(tall * 0.25),
		shortsTop: top + Math.round(tall * 0.55),
		legsTop: top + Math.round(tall * 0.7),
		bottom,
		middle: Math.floor(stand.width / 2),
		left: 0,
		right: stand.width - 1,
		arms: false,
	}
	// Legs: two of them, apart, up from the feet: the shoes may be touching.
	let feet = bottom
	while (feet > bottom - 2 && runs(feet - 1).length < 2) feet--
	let legsTop = feet
	while (legsTop > top && runs(legsTop - 1).length >= 2) legsTop--
	if (bottom - legsTop < 3) return rough
	// Shorts: above the legs, all one colour, all the way across.
	const hips = runs(legsTop - 1)
	if (hips.length !== 1) return rough
	const [hipLeft, hipRight] = hips[0]
	const middle = Math.round((hipLeft + hipRight) / 2)
	rough.middle = middle
	rough.legsTop = legsTop
	const shorts = majority(hipLeft, hipRight, legsTop - 1, legsTop - 1)
	let shortsTop = legsTop - 1
	while (
		shortsTop > top &&
		legsTop - shortsTop < 6 &&
		shorts &&
		majority(middle - 1, middle + 1, shortsTop - 1, shortsTop - 1) &&
		keyOf(
			majority(middle - 1, middle + 1, shortsTop - 1, shortsTop - 1) ?? shorts,
		) === keyOf(shorts)
	)
		shortsTop--
	rough.shortsTop = shortsTop
	// The neck: up from the shorts, the first row the body's no more than
	// three pixels wide through its middle.
	const widthAt = (y: number) => {
		const run = runs(y).find(([a, b]) => a <= middle + 1 && b >= middle - 1)
		return run ? run[1] - run[0] + 1 : 0
	}
	let neck = shortsTop - 1
	while (neck > top && (widthAt(neck) > 3 || widthAt(neck) === 0)) neck--
	const shirtRows = shortsTop - 1 - neck
	if (neck - top < 4 || shirtRows < 4 || shirtRows > 12) return rough
	rough.neck = neck
	if (!armsWanted) return rough
	// The skin: a colour of the neck and the chin over it (not the face,
	// which may be mostly beard) that's on their legs as well; or, with their
	// legs covered, the commonest there. The shirt: the commonest under the
	// neck that isn't skin.
	const legs = majority(0, stand.width - 1, legsTop, feet - 1)
	const neckSkin = majority(middle - 2, middle + 2, neck - 2, neck)
	/** Near enough the legs' colour, and not as dark as an eye or a beard. */
	const likeLegs = (c: Colour) =>
		!!legs && distance(c, legs) < 30 && Math.max(c[0], c[1], c[2]) > 70
	let bareCount = 0
	for (let y = neck - 2; y <= neck; y++)
		for (let x = middle - 2; x <= middle + 2; x++) {
			const c = at(x, y)
			if (c && likeLegs(c)) bareCount++
		}
	const bare =
		bareCount >= 2
			? majority(middle - 2, middle + 2, neck - 2, neck, (c) => !likeLegs(c))
			: undefined
	const skin = bare ?? neckSkin
	if (!skin) return rough
	const isSkin = (c: Colour) => distance(c, skin) < SKIN_NEAR
	const shirt = majority(middle - 2, middle + 2, neck + 1, neck + 4, isSkin)
	if (!shirt || isSkin(shirt)) return rough
	// The shirt's width, across its top, the arms left off its ends.
	const row = neck + 2
	const run = runs(row).find(([a, b]) => a <= middle && b >= middle)
	if (!run) return rough
	let [left, right] = run
	while (left < right && isSkin(at(left, row) ?? shirt)) left++
	while (right > left && isSkin(at(right, row) ?? shirt)) right--
	if (right - left < 2) return rough
	return { ...rough, left, right, shirt, skin, arms: true }
}

/**
 * The stand pose with its arms taken off, for arms to be drawn on in other
 * places: skin over the shirt painted over in it, and the arms either side
 * of it taken away. Hair hanging down behind, or anything else that isn't
 * shirt or skin, is left be.
 */
function armless(stand: Pixels, figure: Figure): Pixels {
	const { at } = reader(stand)
	const data = new Uint8ClampedArray(stand.data)
	const { shirt, skin } = figure
	if (!shirt || !skin) return stand
	for (let y = figure.neck + 1; y < figure.shortsTop; y++)
		for (let x = 0; x < stand.width; x++) {
			const c = at(x, y)
			const i = (y * stand.width + x) * 4
			// A gap between the body and an arm hanging down by it: shirt.
			if (!c) {
				if (x >= figure.left && x <= figure.right) data.set(shirt, i)
				continue
			}
			const skinny = distance(c, skin) < SKIN_NEAR
			const shirty = distance(c, shirt) < 40
			if (x >= figure.left && x <= figure.right) {
				if (skinny) data.set(shirt, i)
			} else if (skinny || shirty) data.fill(0, i, i + 4)
		}
	return { width: stand.width, height: stand.height, data }
}

/** The arm's colour, from its shoulder to its hand: the sleeve, then skin. */
const SLEEVE = 2

/** One frame of `dance`, from `stand` (its arms off, if they move) and its figure. */
function frame(stand: Pixels, figure: Figure, move: Move): Pixels {
	const { width } = stand
	const height = stand.height + DANCE_HEADROOM
	const { at } = reader(stand)
	const out = new Uint8ClampedArray(width * height * 4)
	const bend = Math.max(
		0,
		Math.min(move.bend ?? 0, figure.bottom - figure.legsTop - 2),
	)
	const lift = Math.min(DANCE_HEADROOM, move.lift ?? 0)
	const sway = move.sway ?? 0
	const hips = move.hips ?? 0
	/** Knees bent: the rows taken out of the legs, just under the shorts. */
	const knees = figure.legsTop + 1
	/** How far across, and down, a row of the stand pose goes. */
	const across = (y: number) =>
		y <= figure.neck
			? sway
			: y < figure.shortsTop
				? Math.round(sway / 2)
				: y < figure.legsTop
					? hips
					: y < knees + bend + 2
						? Math.round(hips / 2)
						: 0
	const down = (y: number) =>
		(y < knees + bend ? bend : 0) - lift + DANCE_HEADROOM
	const put = (x: number, y: number, c: Colour, under = false) => {
		if (x < 0 || y < 0 || x >= width || y >= height) return
		const i = (y * width + x) * 4
		if (under && out[i + 3]) return
		out.set(c, i)
	}
	for (let y = 0; y < stand.height; y++) {
		// Bent knees: these rows go.
		if (y >= knees && y < knees + bend) continue
		for (let x = 0; x < width; x++) {
			const c = at(x, y)
			if (c) put(x + across(y), y + down(y), c)
		}
	}
	// Arms, from the shirt's shoulders: the far one behind the body.
	if (move.arms && figure.arms && figure.shirt && figure.skin) {
		const shoulderY = figure.neck + 2
		const y = shoulderY + down(shoulderY)
		const dx = across(shoulderY)
		const arm = (
			pose: Arm,
			from: Point,
			outward: number,
			sleeve: Colour,
			skin: Colour,
			under: boolean,
		) => {
			const [elbow, hand] = ARMS[pose]
			const points: Point[] = [
				from,
				[from[0] + elbow[0] * outward, from[1] + elbow[1]],
				[from[0] + hand[0] * outward, from[1] + hand[1]],
			]
			let drawn = 0
			for (let i = 0; i + 1 < points.length; i++)
				line(points[i], points[i + 1], i > 0, (px, py) => {
					put(px, py, drawn++ < SLEEVE ? sleeve : skin, under)
				})
		}
		const far = shade(figure.shirt, 0.8)
		arm(
			move.arms[1],
			[figure.right + 1 + dx, y],
			1,
			far,
			shade(figure.skin, 0.85),
			true,
		)
		arm(
			move.arms[0],
			[figure.left - 1 + dx, y],
			-1,
			figure.shirt,
			figure.skin,
			false,
		)
	}
	const done: Pixels = { width, height, data: out }
	if (!move.flip && !move.narrow) return done
	// Turned: round the middle of their feet, so they stay where they're stood.
	const turned = new Uint8ClampedArray(out.length)
	const middle = figure.middle
	for (let y = 0; y < height; y++)
		for (let x = 0; x < width; x++) {
			const i = (y * width + x) * 4
			if (!out[i + 3]) continue
			let to = move.flip ? 2 * middle - x : x
			if (move.narrow) to = middle + Math.round((to - middle) * 0.55)
			if (to < 0 || to >= width) continue
			turned.set(out.subarray(i, i + 4), (y * width + to) * 4)
		}
	return { width, height, data: turned }
}

/** Each pixel on a line from `a` to `b`, `a` left off if `skipFirst`. */
function line(
	a: Point,
	b: Point,
	skipFirst: boolean,
	each: (x: number, y: number) => void,
) {
	const steps = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]))
	for (let i = skipFirst ? 1 : 0; i <= steps; i++) {
		const t = steps ? i / steps : 0
		each(
			Math.round(a[0] + (b[0] - a[0]) * t),
			Math.round(a[1] + (b[1] - a[1]) * t),
		)
	}
}

/**
 * `name`, danced from `stand`: its frames side by side, each as wide as the
 * stand pose and `DANCE_HEADROOM` taller, their feet on the bottom row.
 * `arms: false` leaves the arms as they are, for anyone holding something.
 */
export function danceStrip(
	stand: Pixels,
	name: DanceName,
	{ arms = true }: { arms?: boolean } = {},
): Pixels {
	const { moves } = DANCES[name]
	const wantsArms = arms && moves.some((m) => 'arms' in m)
	const figure = figureOf(stand, wantsArms)
	const body = figure.arms ? armless(stand, figure) : stand
	const frames = moves.map((move: Move) =>
		frame(body, figure, figure.arms ? move : { ...move, arms: undefined }),
	)
	const width = stand.width * frames.length
	const height = stand.height + DANCE_HEADROOM
	const data = new Uint8ClampedArray(width * height * 4)
	frames.forEach((f, n) => {
		for (let y = 0; y < height; y++)
			data.set(
				f.data.subarray(y * f.width * 4, (y + 1) * f.width * 4),
				(y * width + n * f.width) * 4,
			)
	})
	return { width, height, data }
}
