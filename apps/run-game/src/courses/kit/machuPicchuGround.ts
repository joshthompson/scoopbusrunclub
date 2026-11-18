import { tile } from './pixelArt'
import { seeded } from './seeded'

/**
 * Textures for Machu Picchu's ground, as patterns for the course's
 * `groundDefs` (`url(#id)` over the `machu-face` strip's green): the cloud
 * forest dropping away under the Inca Trail, and the citadel's famous
 * agricultural terraces. Laid over the course's own colours, see-through,
 * so they go with them: a suggestion of texture, a few things at a time,
 * and the runners stay the busiest thing on screen.
 */

type Rect = (x: number, y: number, w: number, h: number, fill: string) => void

const snap = (n: number, to: number) => Math.round(n / to) * to

// --- The cloud forest -----------------------------------------------------------

const CANOPY_LIT = 'rgba(170,225,120,0.32)'
const CANOPY_MID = 'rgba(40,90,40,0.1)'
const CANOPY_SHADE = 'rgba(10,40,20,0.28)'
const FERN_SPIKE = 'rgba(8,36,22,0.34)'
const FERN_TIP = 'rgba(150,215,110,0.28)'
const BROMELIAD = 'rgba(226,84,52,0.8)'
const BROMELIAD_HEART = 'rgba(250,170,70,0.85)'
const OUTCROP = 'rgba(150,146,130,0.4)'
const OUTCROP_LIT = 'rgba(214,208,188,0.42)'
const OUTCROP_SHADE = 'rgba(30,40,30,0.3)'
const MIST = 'rgba(255,255,255,0.18)'

/** A clump of treetops: a stepped dome, lit on top, in shadow below. */
function treetops(rect: Rect, cx: number, cy: number, r: number) {
	for (let y = -r; y < r; y += 4) {
		const mid = y + 2
		const half = snap(Math.sqrt(Math.max(0, r * r - mid * mid)), 4)
		if (half <= 0) continue
		const fill =
			y < -r + 4 ? CANOPY_LIT : y >= r - 8 ? CANOPY_SHADE : CANOPY_MID
		rect(cx - half, cy + y, half * 2, 4, fill)
		// Lit cells along the dome's top-left shoulder, a leaf cluster each.
		if (y >= -r + 4 && y < 0) rect(cx - half, cy + y, 4, 2, CANOPY_LIT)
		// Its far, right-hand side a touch darker.
		if (y >= 0 && y < r - 8) rect(cx + half - 4, cy + y, 4, 4, CANOPY_SHADE)
	}
}

/** A tree-fern crown: fronds arching out from a heart, drooping, their tips lit. */
function treeFern(rect: Rect, x: number, y: number) {
	rect(x - 2, y - 2, 4, 4, FERN_SPIKE)
	// Each frond: how far it goes along and up per cell, then it droops.
	const fronds: [number, number][] = [
		[0, -3],
		[-2, -3],
		[2, -3],
		[-3, -1],
		[3, -1],
		[-3, 0],
		[3, 0],
	]
	for (const [dx, dy] of fronds) {
		for (let n = 1; n <= 5; n++) {
			const fx = x + snap((dx * n * 2) / 1.5, 2) - 1
			const fy = y + snap((dy * n * 2) / 1.5 + (n * n) / 3, 2) - 1
			rect(fx, fy, 2, 2, n === 5 ? FERN_TIP : FERN_SPIKE)
		}
	}
}

/** A bromeliad: a tuft of red leaves round an orange heart, on a branch. */
function bromeliad(rect: Rect, x: number, y: number) {
	rect(x, y + 2, 4, 2, BROMELIAD)
	rect(x - 2, y, 2, 2, BROMELIAD)
	rect(x + 4, y, 2, 2, BROMELIAD)
	rect(x + 1, y, 2, 2, BROMELIAD_HEART)
}

/** A granite outcrop: stepped ledges, the top of each lit, shadow under. */
function outcrop(rect: Rect, x: number, y: number, wide: number, high: number) {
	for (let row = 0; row < high; row += 4) {
		const inset = row === 0 ? 8 : row < 8 ? 4 : 0
		const w = wide - inset * 2
		rect(x + inset, y + row, w, 4, OUTCROP)
		rect(x + inset, y + row, w, 2, OUTCROP_LIT)
	}
	rect(x, y + high, wide, 2, OUTCROP_SHADE)
}

/** A wisp of mist: a long lens, stepped, thickest in the middle. */
function mist(rect: Rect, x: number, y: number, wide: number) {
	for (let row = 0; row < 3; row++) {
		const w = row === 1 ? wide : wide - 24
		rect(x + (wide - w) / 2, y + row * 4, w, 4, MIST)
	}
}

/**
 * The Inca Trail's face: the cloud forest dropping away below the path.
 * Clumps of treetops, lit on top and dark underneath, tree ferns bursting
 * through them, a bromeliad or two with a dab of red, grey granite
 * outcrops, and a wisp of mist drifting across. About three times the
 * presence of `MACHU_FACE`, and still quieter than a runner. 640 by 480.
 */
export const MACHU_CLOUD_FOREST = (() => {
	const width = 640
	const height = 480
	const face = tile(width, height)
	const random = seeded(311)
	const placed: [number, number, number][] = []
	/** A spot clear of what's already down, in whole 4-px cells. */
	const spot = (radius: number): [number, number] => {
		for (let tries = 0; tries < 60; tries++) {
			const x = snap(random() * width, 4)
			const y = snap(random() * height, 4)
			if (
				placed.every(
					([px, py, pr]) => Math.hypot(px - x, py - y) > pr + radius + 6,
				)
			) {
				placed.push([x, y, radius])
				return [x, y]
			}
		}
		const x = snap(random() * width, 4)
		const y = snap(random() * height, 4)
		placed.push([x, y, radius])
		return [x, y]
	}

	// Room kept for the mist, which goes down last.
	placed.push([152, 46, 56], [476, 338, 68])

	// Granite showing through, 8 of them.
	for (let i = 0; i < 8; i++) {
		const wide = snap(24 + random() * 20, 4)
		const high = snap(8 + random() * 8, 4)
		const [x, y] = spot(wide / 2)
		outcrop(face.rect, x - wide / 2, y, wide, high)
	}
	// Clumps of treetops, three or four domes each, overlapping.
	for (let i = 0; i < 16; i++) {
		const [x, y] = spot(34)
		for (let d = 0; d < 3 + Math.floor(random() * 2); d++) {
			const r = snap(8 + random() * 14, 4)
			treetops(
				face.rect,
				x + snap((random() - 0.5) * 48, 4),
				y + snap((random() - 0.5) * 20, 4),
				r,
			)
		}
	}
	// Tree ferns, bromeliads.
	for (let i = 0; i < 10; i++) {
		const [x, y] = spot(18)
		treeFern(face.rect, x, y)
	}
	for (let i = 0; i < 9; i++) {
		const [x, y] = spot(6)
		bromeliad(face.rect, x, y)
	}
	// Mist, over the lot.
	mist(face.rect, 96, 40, 112)
	mist(face.rect, 408, 332, 136)
	return face.pattern('machu-cloud-forest')
})()

// --- The terraces ---------------------------------------------------------------

const TERRACE_GRASS_LIT = 'rgba(190,230,140,0.35)'
const TERRACE_GRASS_DARK = 'rgba(40,90,36,0.4)'
const WALL_STONE = 'rgba(170,164,146,0.85)'
const WALL_JOINT = 'rgba(110,104,90,0.85)'
const WALL_LIT = 'rgba(220,214,196,0.85)'
const WALL_SHADOW = 'rgba(20,40,20,0.25)'
const STAIR_TREAD = 'rgba(232,226,208,0.9)'

/**
 * The citadel's agricultural terraces, stepping down its slopes: a band of
 * grass with its top edge lit, then a dry-stone Inca retaining wall, its
 * stones laid in courses and staggered, with a shadow under it. A stair of
 * stones is cut into a wall here and there, and a tuft of grass hangs over
 * another. One terrace every 48 px, three to the tile, and the walls run
 * right across it, so it joins side to side. 480 by 144.
 */
export const MACHU_TERRACES = (() => {
	const width = 480
	const height = 144
	const step = 48
	const wallTop = 30
	const wallHigh = 14
	const terraces = tile(width, height)
	const random = seeded(2911)

	for (let k = 0; k < height / step; k++) {
		const y0 = k * step
		const wall = y0 + wallTop

		// The grass: its top edge lit, and a few darker blades in it.
		terraces.rect(0, y0, width, 2, TERRACE_GRASS_LIT)
		for (let i = 0; i < 6; i++) {
			const x = snap(random() * width, 2)
			const y = y0 + 6 + snap(random() * 16, 2)
			terraces.rect(x, y, 2, 4, TERRACE_GRASS_DARK)
			terraces.rect(x + 2, y + 2, 2, 2, TERRACE_GRASS_DARK)
		}

		// The wall: joints first, then the stones laid over them in courses.
		terraces.rect(0, wall, width, wallHigh, WALL_JOINT)
		terraces.rect(0, wall, width, 2, WALL_LIT)
		for (let course = 0; course < 2; course++) {
			const y = wall + 2 + course * 6
			// Staggered: each course starts part-way along a stone.
			let x = course === 0 ? 0 : -(6 + k * 4)
			while (x < width) {
				const long = 12 + snap(random() * 12, 2)
				const x0 = Math.max(0, x)
				const x1 = Math.min(width, x + long)
				if (x1 - x0 > 2) terraces.rect(x0, y, x1 - x0 - 2, 4, WALL_STONE)
				x += long
			}
			// Close the row up so it meets itself at the tile's edge.
			terraces.rect(width - 2, y, 2, 4, WALL_JOINT)
			terraces.rect(0, y, 2, 4, WALL_JOINT)
		}
		terraces.rect(0, wall + wallHigh, width, 2, WALL_SHADOW)

		// A stair of stones cut into the wall: three treads going down.
		if (k !== 1) {
			const sx = 120 + k * 150 + snap(random() * 40, 2)
			for (let j = 0; j < 3; j++) {
				const top = wall + 2 + j * 4
				terraces.rect(sx + j * 8, top, 8, wall + wallHigh - top, WALL_STONE)
				terraces.rect(sx + j * 8, top, 8, 2, STAIR_TREAD)
				terraces.rect(
					sx + j * 8,
					top + 2,
					2,
					wall + wallHigh - top - 2,
					WALL_JOINT,
				)
			}
			terraces.rect(sx + 24, wall + 10, 6, 4, WALL_JOINT)
		}

		// A tuft of grass hanging over the wall.
		const tx = snap(40 + random() * (width - 80), 2)
		terraces.rect(tx, wall - 2, 8, 2, TERRACE_GRASS_DARK)
		terraces.rect(tx + 2, wall, 2, 6, TERRACE_GRASS_DARK)
		terraces.rect(tx + 4, wall, 2, 4, TERRACE_GRASS_DARK)
		terraces.rect(tx + 2, wall + 6, 2, 2, TERRACE_GRASS_LIT)
	}
	return terraces.pattern('machu-terraces')
})()
