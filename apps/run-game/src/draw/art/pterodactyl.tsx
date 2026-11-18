import { paintedArt } from '../../courses/kit/pixelArt'

/**
 * A pterodactyl, flying over Dino Island (see `Course['flyer']`): side on,
 * flying right, its long beak out ahead and its crest swept back off the
 * back of its head, its leathery wings out wide, beating: up, then down.
 * Jump into one and it carries you, hanging on to its feet. Rust brown, lit
 * along its top, its wings' thin skin paler, with the bones of its fingers
 * along their leading edges. In cells of 2, as the runners are.
 */

const CELL = 2
const COLUMNS = 48
const ROWS = 30

export const PTERODACTYL_WIDTH = COLUMNS * CELL
export const PTERODACTYL_HEIGHT = ROWS * CELL

const BODY = '#a85a33'
const BODY_LIT = '#cf7c4a'
const BODY_SHADE = '#7c3f22'
const SKIN = '#d9a273'
const SKIN_SHADE = '#b37c52'
const BONE = '#7c3f22'
const CREST = '#c8402c'
const BEAK = '#e2c07a'
const BEAK_SHADE = '#b8945a'
const EYE = '#1d1d1d'
const FOOT = '#5a2f1a'

type Point = [number, number]

/** Whether `(x, y)` is inside the polygon `points`. */
function inside(points: Point[], x: number, y: number) {
	let hit = false
	for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
		const [xi, yi] = points[i]
		const [xj, yj] = points[j]
		if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
			hit = !hit
	}
	return hit
}

/** Its body: a stubby, rounded torso, low in the middle of the picture. */
const BODY_SHAPE: Point[] = [
	[14, 17],
	[19, 15],
	[29, 15],
	[33, 17],
	[30, 21],
	[20, 22],
	[15, 20],
]
/** Its neck and head, out ahead, and the crest swept back off it. */
const HEAD: Point[] = [
	[30, 16],
	[34, 13],
	[38, 12],
	[40, 13],
	[39, 16],
	[34, 18],
]
const CREST_SHAPE: Point[] = [
	[35, 13],
	[31, 8],
	[33, 8],
	[39, 12],
]
const BEAK_SHAPE: Point[] = [
	[39, 13],
	[47, 15],
	[39, 16],
]
/** Its tail, a short spike out behind. */
const TAIL: Point[] = [
	[15, 17],
	[8, 18],
	[15, 20],
]

/**
 * Its wings, up: a broad membrane from its shoulders, its leading edge
 * swept up and back to a tip, its trailing edge back down to its hips.
 * The far one, behind, a little further on.
 */
const WINGS_UP: Point[] = [
	[29, 16],
	[25, 5],
	[13, 0],
	[18, 9],
	[18, 17],
]
const FAR_WING_UP: Point[] = [
	[32, 15],
	[29, 5],
	[20, 2],
	[24, 9],
	[24, 15],
]
/** And down: swept down and back under it, to a tip below. */
const WINGS_DOWN: Point[] = [
	[29, 18],
	[25, 25],
	[13, 29],
	[18, 22],
	[18, 18],
]
const FAR_WING_DOWN: Point[] = [
	[32, 18],
	[29, 25],
	[21, 28],
	[24, 22],
	[24, 18],
]
/**
 * Its legs, straight down from under its middle, and its talons curled at
 * their ends: what whoever it's carrying hangs from, gripping their head.
 * Under the middle of the picture, so they're over the middle of them.
 */
const LEGS: Point[] = [
	[22, 21],
	[26, 21],
	[26, 26],
	[22, 26],
]
/** Its talons, curled in, along the bottom of its legs: the cells, `[x, y]`. */
const TALONS: [number, number][] = [
	[21, 26],
	[22, 27],
	[24, 26],
	[25, 27],
	[26, 26],
	[21, 27],
	[26, 27],
]
/** How far up from the picture's bottom its talons' tips are, in screen px. */
export const PTERODACTYL_TALONS = (ROWS - 28) * CELL

/** Its picture, its wings `up` or down: lit along its top, shaded underneath, the far wing darker. */
function pterodactyl(up: boolean) {
	const near = up ? WINGS_UP : WINGS_DOWN
	const far = up ? FAR_WING_UP : FAR_WING_DOWN
	/** The leading edge of a wing, its finger bone along it: nearest its front. */
	const edge = (wing: Point[], x: number, y: number) =>
		inside(wing, x, y) && !inside(wing, x + 1, y)
	return paintedArt(COLUMNS, ROWS, (x, y) => {
		const px = x
		const py = y
		if (inside(BEAK_SHAPE, px, py))
			return inside(BEAK_SHAPE, px, py - 1) ? BEAK_SHADE : BEAK
		if (x === 37.5 && y === 13.5) return EYE
		if (inside(CREST_SHAPE, px, py)) return CREST
		if (inside(HEAD, px, py)) return !inside(HEAD, px, py - 1) ? BODY_LIT : BODY
		if (inside(near, px, py))
			return edge(near, px, py) ? BONE : y % 4 === 0 ? SKIN_SHADE : SKIN
		if (inside(BODY_SHAPE, px, py) || inside(TAIL, px, py)) {
			if (!inside(BODY_SHAPE, px, py - 1) && !inside(TAIL, px, py - 1))
				return BODY_LIT
			if (!inside(BODY_SHAPE, px, py + 2) && !inside(TAIL, px, py + 2))
				return BODY_SHADE
			return BODY
		}
		// `paintedArt` hands over each cell's middle.
		if (TALONS.some(([tx, ty]) => tx + 0.5 === x && ty + 0.5 === y))
			return '#1d1d1d'
		if (inside(LEGS, px, py)) return x === 22.5 ? BODY_SHADE : FOOT
		if (inside(far, px, py)) return edge(far, px, py) ? BONE : SKIN_SHADE
		return undefined
	})
}

/** Its two frames: wings up, wings down. */
export const PTERODACTYL_FRAMES = [pterodactyl(true), pterodactyl(false)]
/** How long each beat of its wings is held, in ticks: a slow, heavy flap. */
const BEAT = 14

/** Its picture `now` ticks in: beating its wings; gliding, carrying someone, wings out. */
export const pterodactylPicture = (now: number, carrying: boolean) =>
	PTERODACTYL_FRAMES[carrying ? 0 : Math.floor(Math.max(0, now) / BEAT) % 2]

/** Its picture on its own, for the collectables screen. */
export function PterodactylArt(props: { scale?: number }) {
	const scale = () => props.scale ?? 1
	return (
		<img
			src={PTERODACTYL_FRAMES[0]}
			alt=""
			class="pixelated"
			width={PTERODACTYL_WIDTH * scale()}
			height={PTERODACTYL_HEIGHT * scale()}
			style={{ display: 'block', 'max-width': 'none' }}
		/>
	)
}
