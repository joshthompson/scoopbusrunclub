import { tile } from './pixelArt'
import { seeded } from './seeded'

/**
 * Textures for Dino Island's ground, as patterns for the course's
 * `groundDefs` (`url(#id)` over a layer's colour): the forest floor and the
 * land behind the path, the dirt trail with its dinosaur prints, the
 * volcano's ash and cracks of lava, the sea cliff's strata, and the sand of
 * the beach and the seabed. Laid over the course's own colours, see-through,
 * so they go with them: a suggestion of texture, a few things at a time,
 * and the runners stay the busiest thing on screen.
 */

type Rect = (x: number, y: number, w: number, h: number, fill: string) => void

const even = (n: number) => Math.round(n / 2) * 2

/** A pattern's marks, scattered from a seed: `at` is a spot in the tile. */
function scatter(seed: number, width: number, height: number) {
	const random = seeded(seed)
	return {
		random,
		/** A spot in whole cells, `crowd` above 1 packing them towards the top. */
		at(crowd = 1): [number, number] {
			return [even(random() * width), even(random() ** crowd * height)]
		},
	}
}

/** A fern tuft: fronds fanning out and up from a foot, shaded, tips lit. */
function fern(rect: Rect, x: number, y: number, dark: string, lit: string) {
	rect(x, y - 2, 2, 2, dark)
	// The middle frond, straight up, and one leaning out each side.
	rect(x, y - 6, 2, 4, dark)
	rect(x, y - 8, 2, 2, lit)
	rect(x - 2, y - 4, 2, 2, dark)
	rect(x - 4, y - 6, 2, 2, lit)
	rect(x + 2, y - 4, 2, 2, dark)
	rect(x + 4, y - 6, 2, 2, lit)
}

/** A few blades of grass, standing from a foot. */
function blades(rect: Rect, x: number, y: number, dark: string, lit: string) {
	rect(x, y - 4, 2, 4, dark)
	rect(x + 2, y - 6, 2, 4, dark)
	rect(x + 2, y - 8, 2, 2, lit)
	rect(x + 4, y - 2, 2, 2, dark)
}

/** A stone, a shadow under it and a glint along its top. */
function stone(
	rect: Rect,
	x: number,
	y: number,
	wide: number,
	shade: string,
	glint: string,
) {
	rect(x, y + 2, wide, 2, shade)
	rect(x + 2, y, wide - 4, 2, glint)
	rect(x, y, 2, 2, shade)
}

/** A fallen frond, slanting down along the ground in steps. */
function frond(rect: Rect, x: number, y: number, long: number, colour: string) {
	for (let n = 0; n < long; n++) rect(x + n * 2, y + (n >> 1) * 2, 2, 2, colour)
}

// --- The forest floor -----------------------------------------------------------

/**
 * Dino Island's forest floor, in front of and under the path, over its
 * greens: fern tufts and grass thick near the top, so it reads as
 * undergrowth, thinning towards the bottom; fallen fronds, a few stones, a
 * root or two, and dark soil showing between.
 */
export const DINO_FOREST_FLOOR = (() => {
	const width = 360
	const height = 160
	const floor = tile(width, height)
	const { rect } = floor
	const { random, at } = scatter(7100, width, height)
	// Soil showing, in patches.
	for (let n = 0; n < 16; n++) {
		const [x, y] = at(1.4)
		rect(x, y, 6 + even(random() * 8), 2, 'rgba(45, 28, 14, 0.3)')
		rect(x + 2, y + 2, 4 + even(random() * 6), 2, 'rgba(45, 28, 14, 0.22)')
	}
	// The undergrowth, grass first so the ferns stand over it.
	for (let n = 0; n < 46; n++) {
		const [x, y] = at(1.7)
		blades(rect, x, y + 8, 'rgba(25, 60, 20, 0.4)', 'rgba(170, 220, 110, 0.38)')
	}
	for (let n = 0; n < 26; n++) {
		const [x, y] = at(1.5)
		fern(rect, x, y + 8, 'rgba(20, 55, 18, 0.45)', 'rgba(150, 215, 100, 0.4)')
	}
	// Fallen fronds, browning.
	for (let n = 0; n < 14; n++) {
		const [x, y] = at(1.2)
		frond(
			rect,
			x,
			y,
			4 + 2 * Math.floor(random() * 3),
			'rgba(110, 85, 35, 0.4)',
		)
	}
	// Stones.
	for (let n = 0; n < 7; n++) {
		const [x, y] = at(1)
		stone(
			rect,
			x,
			y,
			random() < 0.5 ? 6 : 8,
			'rgba(30, 30, 25, 0.38)',
			'rgba(220, 225, 200, 0.34)',
		)
	}
	// A root or two, knobbly, crossing the tile.
	for (const [rx, ry] of [
		[40, 96],
		[236, 50],
	]) {
		let x = rx
		let y = ry
		for (let n = 0; n < 14; n++) {
			rect(x, y, 4, 2, 'rgba(60, 38, 18, 0.5)')
			if (n % 2 === 0) rect(x, y - 2, 4, 2, 'rgba(150, 110, 60, 0.3)')
			x += 4
			const step = random()
			if (step < 0.3) y -= 2
			else if (step > 0.7) y += 2
		}
	}
	return floor.pattern('dino-forest-floor')
})()

// --- The land behind the path ---------------------------------------------------

/**
 * The land band behind the path, over its dark green: a darker, leafier
 * undergrowth, leaf shadows in heaps, and a hint of fern fronds.
 */
export const DINO_FOREST_LAND = (() => {
	const width = 300
	const height = 100
	const land = tile(width, height)
	const { rect } = land
	const { random, at } = scatter(7200, width, height)
	// Heaps of leaf, dark with a lit edge.
	for (let n = 0; n < 40; n++) {
		const [x, y] = at(1)
		const wide = 6 + even(random() * 6)
		rect(x, y + 2, wide, 2, 'rgba(10, 35, 12, 0.42)')
		rect(x + 2, y, wide - 2, 2, 'rgba(10, 35, 12, 0.3)')
		if (random() < 0.5) rect(x + 2, y - 2, 4, 2, 'rgba(120, 180, 80, 0.22)')
	}
	for (let n = 0; n < 40; n++) {
		const [x, y] = at(1)
		rect(x, y, 2, 2, 'rgba(110, 170, 70, 0.26)')
	}
	for (let n = 0; n < 9; n++) {
		const [x, y] = at(1)
		fern(rect, x, y + 8, 'rgba(8, 30, 10, 0.4)', 'rgba(110, 175, 75, 0.3)')
	}
	return land.pattern('dino-forest-land')
})()

// --- The trail --------------------------------------------------------------------

/**
 * Dino Island's dirt trail, over its tan: grit, lighter and darker, a
 * pebble here and there lit on top, and now and then a three-toed dinosaur
 * footprint pressed into it, shadowed along its top edge.
 */
export const DINO_TRAIL = (() => {
	const width = 420
	const height = 34
	const trail = tile(width, height)
	const { rect } = trail
	const { random, at } = scatter(7300, width, height)
	for (let n = 0; n < 90; n++) {
		const [x, y] = at(1)
		rect(
			x,
			y,
			2,
			2,
			random() < 0.45 ? 'rgba(255, 235, 195, 0.3)' : 'rgba(80, 50, 20, 0.24)',
		)
	}
	for (let n = 0; n < 12; n++) {
		const [x, y] = at(1)
		const wide = random() < 0.5 ? 4 : 6
		rect(x, y + 2, wide, 2, 'rgba(80, 50, 20, 0.34)')
		rect(x, y, wide - 2, 2, 'rgba(255, 235, 195, 0.36)')
	}
	// A print: three toes spread out front, a heel behind, dark in the dirt
	// with its far rim catching the light.
	for (const [px, py] of [
		[60, 10],
		[96, 18],
		[248, 8],
		[286, 16],
		[372, 12],
	]) {
		const dark = 'rgba(75, 45, 18, 0.5)'
		rect(px, py, 2, 4, dark)
		rect(px + 4, py - 2, 2, 4, dark)
		rect(px + 8, py, 2, 4, dark)
		rect(px + 2, py + 4, 6, 2, dark)
		rect(px + 2, py + 6, 2, 2, dark)
		rect(px + 4, py + 6, 2, 2, dark)
		rect(px + 4, py + 8, 2, 2, 'rgba(255, 235, 195, 0.25)')
	}
	return trail.pattern('dino-trail')
})()

// --- The volcano ------------------------------------------------------------------

/**
 * The volcano's ground, under the path, over its dark brown-greys: ash
 * grain, black rocks scattered and lit on top, strata lines running along,
 * and a few thin cracks glowing with lava, sparse, the only bright thing.
 */
export const DINO_ASH = (() => {
	const width = 360
	const height = 200
	const ash = tile(width, height)
	const { rect } = ash
	const { random, at } = scatter(7400, width, height)
	// Strata, long thin lines, some broken.
	for (const sy of [34, 76, 118, 162]) {
		let x = even(random() * width)
		for (let n = 0; n < 7; n++) {
			rect(
				x,
				sy + (n % 3 === 1 ? 2 : 0),
				14 + even(random() * 22),
				2,
				'rgba(0, 0, 0, 0.2)',
			)
			x += 40 + even(random() * 30)
		}
	}
	for (let n = 0; n < 150; n++) {
		const [x, y] = at(1)
		rect(
			x,
			y,
			2,
			2,
			random() < 0.5 ? 'rgba(180, 165, 150, 0.16)' : 'rgba(0, 0, 0, 0.22)',
		)
	}
	// Black rocks, lit on top.
	for (let n = 0; n < 18; n++) {
		const [x, y] = at(1)
		const wide = 6 + even(random() * 6)
		rect(x, y + 2, wide, 4, 'rgba(10, 8, 8, 0.6)')
		rect(x + 2, y, wide - 4, 2, 'rgba(10, 8, 8, 0.6)')
		rect(x + 2, y, wide - 4, 2, 'rgba(160, 145, 135, 0.4)')
	}
	// Lava cracks, jagged, a hot yellow heart in the glow.
	for (const [cx, cy, long] of [
		[40, 60, 6],
		[210, 120, 8],
		[300, 30, 5],
		[130, 170, 6],
	]) {
		let x = cx
		let y = cy
		for (let n = 0; n < long; n++) {
			rect(x, y, 4, 2, '#ff7a1a')
			if (n % 2 === 0) rect(x + 2, y, 2, 2, '#ffd23a')
			x += 4
			y += n % 3 === 0 ? 2 : n % 3 === 1 ? -2 : 0
		}
		rect(x - 4, y + 2, 2, 2, '#ff7a1a')
	}
	return ash.pattern('dino-ash')
})()

// --- The sea cliff ----------------------------------------------------------------

/**
 * The sea cliff's face, under the cliff top, over its grey: strata in
 * horizontal bands, light and dark, cracks running down between, and a few
 * ledges with a tuft of grass growing from each.
 */
export const DINO_CLIFF = (() => {
	const width = 240
	const height = 240
	const cliff = tile(width, height)
	const { rect } = cliff
	const { random } = scatter(7500, width, height)
	// Bands, each a lit top edge over a shaded foot.
	let y = 6
	while (y < height - 12) {
		const band = 14 + even(random() * 14)
		rect(0, y, width, 2, 'rgba(255, 250, 235, 0.14)')
		rect(0, y + band - 2, width, 2, 'rgba(40, 35, 30, 0.2)')
		// Where the rock changes, a patch of it a shade off.
		const patch = even(random() * (width - 60))
		rect(
			patch,
			y + 2,
			20 + even(random() * 40),
			band - 4,
			'rgba(60, 50, 40, 0.1)',
		)
		y += band + 2
	}
	// Cracks, wandering down a little way.
	for (let n = 0; n < 9; n++) {
		let x = even(random() * width)
		let cy = even(random() * (height - 40))
		for (let k = 0; k < 4 + Math.floor(random() * 4); k++) {
			rect(x, cy, 2, 4, 'rgba(30, 26, 22, 0.42)')
			cy += 4
			x += random() < 0.5 ? 0 : random() < 0.5 ? -2 : 2
		}
	}
	// Ledges, a dark lip under each and a tuft of grass on top.
	for (const [lx, ly] of [
		[30, 50],
		[150, 104],
		[84, 178],
		[196, 216],
	]) {
		rect(lx, ly, 14, 2, 'rgba(255, 250, 235, 0.22)')
		rect(lx, ly + 2, 14, 2, 'rgba(30, 26, 22, 0.4)')
		rect(lx + 2, ly - 2, 10, 2, 'rgba(80, 130, 50, 0.5)')
		rect(lx + 4, ly - 4, 2, 2, 'rgba(110, 165, 70, 0.55)')
		rect(lx + 8, ly - 6, 2, 4, 'rgba(110, 165, 70, 0.55)')
	}
	return cliff.pattern('dino-cliff')
})()

// --- Sand -------------------------------------------------------------------------

/**
 * The sand of the beach and the seabed, over its two yellows: gentle
 * ripples in dashes, a few shells, spiralled and ribbed, and pebbles with a
 * shadow under each.
 */
export const DINO_SAND = (() => {
	const width = 320
	const height = 120
	const sand = tile(width, height)
	const { rect } = sand
	const { random, at } = scatter(7600, width, height)
	// Ripples: a lit dash with a shaded one under it, in rows.
	for (let row = 0; row < 8; row++) {
		let x = even(random() * 40)
		const y = 6 + row * 14
		while (x < width) {
			const long = 10 + even(random() * 14)
			rect(x, y, long, 2, 'rgba(255, 248, 215, 0.3)')
			rect(x + 2, y + 2, long - 2, 2, 'rgba(120, 90, 40, 0.16)')
			x += long + 12 + even(random() * 24)
		}
	}
	for (let n = 0; n < 40; n++) {
		const [x, y] = at(1)
		rect(x, y, 2, 2, 'rgba(120, 90, 40, 0.2)')
	}
	// Shells, little fans, pale with a ribbed shadow.
	for (let n = 0; n < 6; n++) {
		const [x, y] = at(1)
		rect(x, y, 6, 2, 'rgba(255, 245, 235, 0.65)')
		rect(x + 2, y - 2, 2, 2, 'rgba(255, 245, 235, 0.65)')
		rect(x + 2, y + 2, 2, 2, 'rgba(190, 120, 90, 0.5)')
	}
	for (let n = 0; n < 10; n++) {
		const [x, y] = at(1)
		const wide = random() < 0.5 ? 4 : 6
		rect(x, y + 2, wide, 2, 'rgba(90, 70, 40, 0.35)')
		rect(x, y, wide - 2, 2, 'rgba(255, 245, 220, 0.4)')
	}
	return sand.pattern('dino-sand')
})()
