/**
 * Generate the seamless snowfall tiles used by the header's `data-weather=snow`
 * layers.
 *
 * Three tiles, one per depth layer, all the same size so the CSS can shift each
 * one by a whole number of tiles (see the `snowfall` keyframes). Depth is baked
 * into the art rather than the CSS: near flakes are bigger and fully opaque,
 * distant ones are single dim pixels. Every pixel is fully on or fully off at a
 * single alpha, so nothing here is antialiased — `image-rendering: pixelated` is
 * document-wide and soft edges would look wrong next to the sprites.
 *
 * Usage: npx tsx apps/web/scripts/gen-snow-tiles.ts
 * Output is committed art, so this isn't wired into dev/build — run it by hand
 * when you want to reroll or retune the flakes.
 */

import fs from 'node:fs'
import path from 'node:path'
import { PNG } from 'pngjs'

const OUT_DIR = path.resolve(import.meta.dirname, '../src/assets/background')

/**
 * Tile edge, in px. Shared by all three layers so one `background-size` and one
 * set of keyframes covers them. Big enough that the repeat isn't a legible grid
 * across a header's width — the flake count per tile is what sets density.
 */
const TILE = 256

interface Layer {
	name: string
	/** Flakes per tile. Density is count / TILE², so this is the dial to turn. */
	count: number
	/** 1 = single pixel, 2 = 2x2 block, 3 = a 5px plus. */
	size: 1 | 2 | 3
	alpha: number
}

const LAYERS: Layer[] = [
	{ name: 'far', count: 20, size: 1, alpha: 140 },
	{ name: 'mid', count: 14, size: 2, alpha: 195 },
	{ name: 'near', count: 10, size: 3, alpha: 255 },
]

/**
 * Seeded so a rerun reproduces the committed tiles, and so retuning one layer
 * doesn't reshuffle the others. Mulberry32.
 */
function rng(seed: number) {
	let a = seed
	return () => {
		a = (a + 0x6d2b79f5) | 0
		let t = Math.imul(a ^ (a >>> 15), 1 | a)
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

/** Distance on a torus — the tile wraps, so the short way round can be the edge. */
function wrappedDistSq(ax: number, ay: number, bx: number, by: number): number {
	let dx = Math.abs(ax - bx)
	let dy = Math.abs(ay - by)
	if (dx > TILE / 2) dx = TILE - dx
	if (dy > TILE / 2) dy = TILE - dy
	return dx * dx + dy * dy
}

/**
 * Scatter flake centres with a minimum spacing, measured wrapped so the seam
 * doesn't end up denser or emptier than the middle of the tile. Uniform random
 * alone clumps, and clumps read as a repeating blob once the tile is laid out.
 */
function scatter(layer: Layer, seed: number): [number, number][] {
	const random = rng(seed)
	const minDistSq = (0.62 * Math.sqrt((TILE * TILE) / layer.count)) ** 2
	const points: [number, number][] = []

	// Bounded rather than while(true): a spacing that can't be satisfied should
	// give slightly fewer flakes, not hang the script.
	for (let attempt = 0; attempt < 20000 && points.length < layer.count; attempt++) {
		const x = Math.floor(random() * TILE)
		const y = Math.floor(random() * TILE)
		if (points.every((p) => wrappedDistSq(p[0], p[1], x, y) >= minDistSq)) {
			points.push([x, y])
		}
	}
	return points
}

/** Offsets making up one flake, relative to its centre. */
function flakePixels(size: 1 | 2 | 3): [number, number][] {
	if (size === 1) return [[0, 0]]
	if (size === 2) return [[0, 0], [1, 0], [0, 1], [1, 1]]
	// A plus, not a 3x3 block — it reads as a flake instead of a fat dot.
	return [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]
}

for (const [index, layer] of LAYERS.entries()) {
	const png = new PNG({ width: TILE, height: TILE })
	png.data.fill(0) // Fully transparent; flakes are painted on.

	const offsets = flakePixels(layer.size)
	for (const [cx, cy] of scatter(layer, 0x5b4c + index * 977)) {
		for (const [ox, oy] of offsets) {
			// Wrapped, so a flake straddling an edge continues on the far side and
			// the tile stays seamless.
			const x = (cx + ox + TILE) % TILE
			const y = (cy + oy + TILE) % TILE
			const i = (y * TILE + x) * 4
			png.data[i] = 255
			png.data[i + 1] = 255
			png.data[i + 2] = 255
			png.data[i + 3] = layer.alpha
		}
	}

	const file = path.join(OUT_DIR, `snow-tile-${layer.name}.png`)
	fs.writeFileSync(file, PNG.sync.write(png))
	console.log(`${path.basename(file)}  ${TILE}x${TILE}  ${layer.count} flakes`)
}
