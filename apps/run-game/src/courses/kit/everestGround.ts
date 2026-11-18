import { tile } from './pixelArt'
import { seeded } from './seeded'

/**
 * Textures for Everest's ground, as patterns for the course's `groundDefs`
 * (`url(#id)` over a layer's colour): the wind-blown snow of the face, the
 * hard blue ice of the Lhotse Face, the Yellow Band's ochre rock, and the
 * worn paths, dirt and gravel on the trek and moraine, a boot-packed track
 * in the snow. Laid over the course's own colours, see-through, so they go
 * with them: a suggestion of texture, a few things at a time, and the
 * runners stay the busiest thing on screen.
 */

// --- Colours ---------------------------------------------------------------------

const SNOW_SHADOW = 'rgba(125,159,198,0.32)'
const SNOW_SHADOW_DEEP = 'rgba(125,159,198,0.42)'
const SNOW_LIT = 'rgba(255,255,255,0.9)'
const SNOW_GLINT = 'rgba(255,255,255,0.95)'
const ROCK_DARK = 'rgba(60,58,62,0.62)'
const ROCK_DARKER = 'rgba(60,58,62,0.7)'
const ROCK_LIT = 'rgba(150,146,150,0.6)'

const ICE_LENS = 'rgba(90,150,215,0.24)'
const ICE_LENS_DEEP = 'rgba(90,150,215,0.3)'
const ICE_CRACK = 'rgba(40,80,140,0.35)'
const ICE_GLINT = 'rgba(255,255,255,0.7)'

const OCHRE = 'rgba(201,162,79,0.72)'
const OCHRE_DARK = 'rgba(176,138,62,0.76)'
const OCHRE_SEAM = 'rgba(120,88,36,0.55)'
const OCHRE_LIT = 'rgba(232,201,121,0.85)'
const BAND_SNOW = 'rgba(255,255,255,0.9)'

const GRIT = 'rgba(40,30,20,0.18)'
const STONE_SHADE = 'rgba(40,30,20,0.26)'
const STONE_GLINT = 'rgba(255,255,255,0.2)'
const FLAGSTONE = 'rgba(40,30,20,0.12)'

const BOOT = 'rgba(90,120,170,0.2)'
const CRAMPON = 'rgba(90,120,170,0.24)'

/** A whole number of 2-px cells, nearest to `n`. */
const even = (n: number) => Math.round(n / 2) * 2

// --- Snow ------------------------------------------------------------------------

/**
 * The snow face, wind-blown, over its white: sastrugi, long low ripples
 * the wind has cut, each a streak of pale blue shadow with a lit row above
 * part of it; a few drift scallops, short curves of stepped shadow; single
 * glints; and half a dozen dark tips of rock poking through, each with a
 * lit edge and a cap of snow. Big, so it doesn't look tiled, and mostly
 * the snow's own colour.
 */
export const EVEREST_SNOW = (() => {
	const random = seeded(8101)
	const width = 480
	const height = 360
	const snow = tile(width, height)
	const x = () => even(random() * width)
	const y = () => even(random() * height)

	// Sastrugi.
	for (let i = 0; i < 46; i++) {
		const px = x()
		const py = y()
		const long = even(12 + random() * 36)
		snow.rect(px, py, long, 2, random() < 0.3 ? SNOW_SHADOW_DEEP : SNOW_SHADOW)
		if (random() < 0.7) {
			const from = even(random() * long * 0.4)
			snow.rect(
				px + from,
				py - 2,
				even(Math.max(4, (long - from) * (0.4 + random() * 0.4))),
				2,
				SNOW_LIT,
			)
		}
		// A shorter, broken tail further along the same ripple.
		if (long > 28 && random() < 0.5)
			snow.rect(px + long + 4, py, 6, 2, SNOW_SHADOW)
	}

	// Drift scallops: a curve of stepped shadow, a lit row over its crest.
	for (let i = 0; i < 9; i++) {
		const px = x()
		const py = y()
		const steps = 2 + Math.floor(random() * 2)
		for (let s = 0; s < steps; s++) {
			snow.rect(px + s * 4, py + s * 2, 4, 2, SNOW_SHADOW_DEEP)
			snow.rect(px + s * 4, py + s * 2 - 2, 4, 2, SNOW_LIT)
		}
		for (let s = 0; s < steps; s++)
			snow.rect(
				px + (steps + s) * 4,
				py + (steps - 1 - s) * 2,
				4,
				2,
				SNOW_SHADOW_DEEP,
			)
	}

	// Glints.
	for (let i = 0; i < 44; i++) snow.rect(x(), y(), 2, 2, SNOW_GLINT)

	// Rock tips: stepped triangles, a lit edge on the left, snow on top.
	for (let i = 0; i < 7; i++) {
		const px = x()
		const py = y()
		const rows = 2 + Math.floor(random() * 3)
		const lean = even(random() * 2)
		for (let r = 0; r < rows; r++) {
			const w = 4 + r * 4
			const left = px - r * 2 + (r === 0 ? lean : 0)
			snow.rect(left, py + r * 2, w, 2, r % 2 ? ROCK_DARKER : ROCK_DARK)
			if (r > 0) snow.rect(left, py + r * 2, 2, 2, ROCK_LIT)
		}
		// The snow cap on the tip, and a shadow in the snow beside the foot.
		snow.rect(px + lean, py - 2, 4, 2, SNOW_LIT)
		snow.rect(px + 4 + rows * 2, py + rows * 2, 8, 2, SNOW_SHADOW_DEEP)
	}
	return snow.pattern('everest-snow')
})()

// --- Blue ice --------------------------------------------------------------------

/**
 * The Lhotse Face's hard blue ice, over the snow face on its steepest
 * stretch: stepped lenses of see-through blue, wider than they are tall,
 * with a white glint along some tops and the odd dark crack across them.
 * Restrained: the snow shows between.
 */
export const EVEREST_BLUE_ICE = (() => {
	const random = seeded(8207)
	const width = 320
	const height = 240
	const ice = tile(width, height)
	const x = () => even(random() * width)
	const y = () => even(random() * height)

	for (let i = 0; i < 16; i++) {
		const px = x()
		const py = y()
		const wide = even(28 + random() * 60)
		const rows = 2 + Math.floor(random() * 2)
		let left = 0
		let right = 0
		for (let r = 0; r < rows; r++) {
			const w = Math.max(8, wide - left - right)
			// Narrow at the top and foot, fullest in the middle.
			const trim = r === 0 || r === rows - 1 ? 6 : 0
			ice.rect(
				px + left + trim,
				py + r * 2,
				Math.max(4, w - trim * 2),
				2,
				r === 1 ? ICE_LENS_DEEP : ICE_LENS,
			)
			left += even(random() * 4)
			right += even(random() * 4)
		}
		if (random() < 0.65)
			ice.rect(
				px + 8,
				py - 2,
				even(Math.max(4, wide * (0.2 + random() * 0.3))),
				2,
				ICE_GLINT,
			)
		// A crack, stepping down through the lens.
		if (random() < 0.45) {
			const cx = px + even(wide * (0.2 + random() * 0.6))
			ice.rect(cx, py, 2, 2, ICE_CRACK)
			ice.rect(cx + 2, py + 2, 4, 2, ICE_CRACK)
		}
	}
	// A few lone glints.
	for (let i = 0; i < 14; i++) ice.rect(x(), y(), 2, 2, ICE_GLINT)
	return ice.pattern('everest-blue-ice')
})()

// --- Yellow band -----------------------------------------------------------------

/**
 * The Yellow Band, a layer of ochre marble and sandstone across the face
 * high on Everest. Only in a band about 130 px tall in the tile, clear
 * above and below, so on screen it reads as bands of rock running across
 * the snow: horizontal ledges, a lit row along each top, darker seams
 * between, ragged ends, and snow lying on the ledges.
 */
export const EVEREST_YELLOW_BAND = (() => {
	const random = seeded(8311)
	const width = 384
	const height = 480
	const band = tile(width, height)
	const top = 170
	const depth = 130

	let y = top
	let row = 0
	while (y < top + depth) {
		const h = Math.min(8 + Math.floor(random() * 3) * 2, top + depth - y)
		// One tone a stratum, so it reads as a layer of rock, not boards.
		const fill = row % 2 ? OCHRE_DARK : OCHRE
		// Each stratum broken into outcrops, snow lying between them.
		let x = even(random() * width)
		let across = 0
		while (across < width) {
			const long = even(30 + random() * 90)
			const gap = even(16 + random() * 60)
			const at = x % width
			band.rect(at, y, long, h, fill)
			// Stepped out at its foot at either end, weathered back at its top.
			band.rect((at - 2 + width) % width, y + 4, 2, h - 4, fill)
			band.rect((at + long) % width, y + 4, 2, h - 4, fill)
			band.rect(at + 2, y, Math.max(4, long - 4), 2, OCHRE_LIT)
			band.rect(at, y + h - 2, long, 2, OCHRE_SEAM)
			// Snow lying on its ledge.
			if (random() < 0.7)
				band.rect(
					at + even(random() * (long / 2)),
					y - 2,
					even(long * 0.3 + random() * long * 0.4),
					4,
					BAND_SNOW,
				)
			x += long + gap
			across += long + gap
		}
		y += h + (random() < 0.4 ? 2 : 0)
		row++
	}
	// Cracks down through the strata.
	for (let i = 0; i < 8; i++) {
		const cx = even(random() * width)
		const cy = top + even(random() * (depth - 20))
		band.rect(cx, cy, 2, 6 + even(random() * 6), OCHRE_SEAM)
	}
	return band.pattern('everest-yellow-band')
})()

// --- Trail -----------------------------------------------------------------------

/**
 * The worn trail on the trek and moraine, over the path's dirt and then its
 * gravel: grit, single dark cells; small stones, a shadow under each and a
 * glint on top; and a flagstone now and then, set flat in the ground.
 * Sparse.
 */
export const EVEREST_TRAIL = (() => {
	const random = seeded(8419)
	const width = 192
	const height = 48
	const trail = tile(width, height)
	const x = () => even(random() * width)
	const y = () => even(random() * height)

	for (let i = 0; i < 34; i++) trail.rect(x(), y(), 2, 2, GRIT)
	for (let i = 0; i < 7; i++) {
		const px = x()
		const py = y()
		if (random() < 0.5) {
			// 4 by 2: shadow under, glint on top.
			trail.rect(px, py + 2, 4, 2, STONE_SHADE)
			trail.rect(px, py, 4, 2, STONE_GLINT)
		} else {
			// 6 by 4.
			trail.rect(px, py + 2, 6, 2, STONE_SHADE)
			trail.rect(px + 2, py, 4, 2, STONE_GLINT)
			trail.rect(px, py, 2, 2, STONE_SHADE)
		}
	}
	for (let i = 0; i < 2; i++) {
		const px = x()
		const py = y()
		trail.rect(px, py, 14, 6, FLAGSTONE)
		trail.rect(px + 2, py, 10, 2, STONE_GLINT)
	}
	return trail.pattern('everest-trail')
})()

// --- Track -----------------------------------------------------------------------

/**
 * The boot-packed track through the snow, over the path: pairs of boot
 * prints, small pale blue shadows, staggered left and right like footsteps
 * along it, and the odd scratch from a crampon. Sparse.
 */
export const EVEREST_TRACK = (() => {
	const random = seeded(8527)
	const width = 160
	const height = 40
	const track = tile(width, height)

	// Footsteps: a print every 20 px, left foot high, right foot low.
	for (let step = 0; step < 8; step++) {
		const px = step * 20 + even(random() * 4)
		const py = step % 2 ? 24 : 10
		track.rect(px, py + even(random() * 4), 4, 2, BOOT)
		track.rect(px + 6, py + 2 + even(random() * 4), 4, 2, BOOT)
	}
	// Crampon scratches.
	for (let i = 0; i < 5; i++) {
		const px = even(random() * width)
		const py = even(random() * height)
		track.rect(px, py, 6, 2, CRAMPON)
		track.rect(px + 6, py + 2, 2, 2, CRAMPON)
	}
	return track.pattern('everest-track')
})()
