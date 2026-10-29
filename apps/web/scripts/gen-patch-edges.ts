/**
 * Generate the ragged edges of the pumpkin patch's ground (`DirtBlock` with
 * `ground="patch"`), so the tilled soil peters out into the grass rather than
 * stopping in a straight line.
 *
 * They're masks, not art: opaque wherever there's soil, see-through wherever
 * the grass shows. The soil itself is one `pumpkin-patch.png` tiled across the
 * whole block, and these cut its outline, so its furrows run right up to the
 * edge without a seam. Strips run along each side (repeated), with the odd
 * blade of grass poking in, mostly along the bottom; the corners are rounded
 * off, a little lumpily.
 *
 * Every pixel is fully on or fully off, so nothing's antialiased — the same as
 * the rest of the pixel art.
 *
 * Usage: npx tsx apps/web/scripts/gen-patch-edges.ts
 * Output is committed art, so this isn't wired into dev/build — run it by hand
 * to reroll the edges, or draw over the PNGs.
 */

import fs from 'node:fs'
import path from 'node:path'
import { PNG } from 'pngjs'

const OUT_DIR = path.resolve(
	import.meta.dirname,
	'../src/assets/halloween/patch',
)

/**
 * How deep each side strip is, in px: as far into the block as the edge can
 * wander. Matches `PATCH_EDGE` in `PatchGround.tsx`.
 */
const EDGE = 8

/**
 * How long a strip runs before it repeats. Not a multiple of the soil's 40px,
 * so the edge doesn't wobble in step with the furrows.
 */
const STRIP = 97

/** Each corner's size, and so its radius. Matches `PATCH_CORNER`. */
const CORNER = 24

/** Seeded so a rerun reproduces the committed edges. Mulberry32. */
function rng(seed: number) {
	let a = seed
	return () => {
		a = (a + 0x6d2b79f5) | 0
		let t = Math.imul(a ^ (a >>> 15), 1 | a)
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

/**
 * How far in from the outside the soil starts, at each step along a strip:
 * a slow wander plus a little roughness, smoothed round the end so the strip
 * repeats without a step. Between 1 and `EDGE - 2`, leaving room for grass.
 */
function edgeDepths(random: () => number, length: number) {
	const rough = Array.from({ length }, () => random())
	// Two slow waves that both fit the strip a whole number of times.
	const phase = [random(), random()].map((p) => p * Math.PI * 2)
	return rough.map((_, x) => {
		const around = (i: number) => rough[(i + length) % length]
		const smooth = (around(x - 1) + around(x) * 2 + around(x + 1)) / 4
		const wave =
			Math.sin((x / length) * Math.PI * 2 * 2 + phase[0]) * 0.5 +
			Math.sin((x / length) * Math.PI * 2 * 5 + phase[1]) * 0.25
		const depth = (EDGE - 3) / 2 + wave * 2 + (smooth - 0.5) * 2.5
		return Math.max(1, Math.min(EDGE - 2, Math.round(depth)))
	})
}

/**
 * Blades of grass poking into the soil past the edge: how much further in each
 * one reaches, or 0 for none, at roughly one column in `every`.
 */
function blades(random: () => number, length: number, every: number) {
	return Array.from({ length }, () =>
		random() < 1 / every ? 1 + Math.floor(random() * 3) : 0,
	)
}

/** A blank mask, `width` by `height`, to cut into. */
function mask(width: number, height: number) {
	const png = new PNG({ width, height })
	png.data.fill(0)
	return png
}

function setSoil(png: PNG, x: number, y: number) {
	const i = (y * png.width + x) * 4
	png.data[i + 3] = 255
}

/**
 * A strip along one side: soil from `depth` in from the outside, less any
 * blades. `outside` is which way the grass is.
 */
function strip(
	seed: number,
	outside: 'top' | 'bottom' | 'left' | 'right',
	bladesEvery: number,
) {
	const random = rng(seed)
	const depths = edgeDepths(random, STRIP)
	const grass = blades(random, STRIP, bladesEvery)
	const across = outside === 'top' || outside === 'bottom'
	const png = across ? mask(STRIP, EDGE) : mask(EDGE, STRIP)
	for (let along = 0; along < STRIP; along++) {
		const reach = depths[along] + grass[along]
		for (let into = reach; into < EDGE; into++) {
			// `into` counts in from the grass; turn it into where it is.
			const flipped = outside === 'bottom' || outside === 'right'
			const depth = flipped ? EDGE - 1 - into : into
			if (across) setSoil(png, along, depth)
			else setSoil(png, depth, along)
		}
	}
	return png
}

/**
 * A corner: soil within a lumpy quarter circle centred on the corner's inner
 * point, rounding off where the two strips meet. The lumps fade out towards
 * both strips, so it joins them without a step; the strips do the rest of the
 * raggedness, since they run under the corners too.
 */
function corner(
	seed: number,
	horizontal: 'left' | 'right',
	vertical: 'top' | 'bottom',
) {
	const random = rng(seed)
	const bumps = Array.from({ length: 6 }, () => random())
	const png = mask(CORNER, CORNER)
	for (let y = 0; y < CORNER; y++) {
		for (let x = 0; x < CORNER; x++) {
			// From the inner point, out towards the corner.
			const dx = horizontal === 'left' ? CORNER - (x + 0.5) : x + 0.5
			const dy = vertical === 'top' ? CORNER - (y + 0.5) : y + 0.5
			const angle = Math.atan2(dy, dx)
			// 0 along either strip, most at 45°.
			const taper = Math.sin(angle * 2)
			const bump =
				bumps[
					Math.min(
						bumps.length - 1,
						Math.floor((angle / (Math.PI / 2)) * bumps.length),
					)
				]
			const radius = CORNER - taper * (1 + bump * 2.5)
			if (Math.hypot(dx, dy) <= radius) setSoil(png, x, y)
		}
	}
	return png
}

const PIECES: [string, PNG][] = [
	['top.png', strip(1, 'top', 14)],
	['bottom.png', strip(2, 'bottom', 5)],
	['left.png', strip(3, 'left', 12)],
	['right.png', strip(4, 'right', 12)],
	['corner-nw.png', corner(5, 'left', 'top')],
	['corner-ne.png', corner(6, 'right', 'top')],
	['corner-sw.png', corner(7, 'left', 'bottom')],
	['corner-se.png', corner(8, 'right', 'bottom')],
]

fs.mkdirSync(OUT_DIR, { recursive: true })
for (const [name, png] of PIECES) {
	fs.writeFileSync(path.join(OUT_DIR, name), PNG.sync.write(png))
	console.log(`wrote ${name} (${png.width}×${png.height})`)
}
