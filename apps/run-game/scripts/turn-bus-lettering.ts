/**
 * Makes the game's bus body from the website's: the same picture, with its
 * lettering reversed in place.
 *
 * The website's bus drives left. The game turns it round to chase right, which
 * mirrors everything on it, the "Scoop Bus Run Club" and "SBRC" lettering
 * too. Reversing each block of lettering here first means it reads the right
 * way once the game turns the bus round, and nothing else about how the bus
 * is drawn has to change.
 *
 * Each block's letters (their red, and the dark red drips under them) are
 * lifted off, the bus behind them is filled back in from what's around them,
 * and the letters go back down flipped about the middle of their block.
 *
 * Usage: pnpm --filter @scoopbus/run-game turn-bus-lettering
 */
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { PNG } from 'pngjs'

const SOURCE = path.resolve(
	import.meta.dirname,
	'../../web/src/assets/bus/bus.png',
)
const OUTPUT = path.resolve(
	import.meta.dirname,
	'../src/assets/bus/bus-lettering-turned.png',
)

/** The lettering's colours: the letters, and the drips running off them. */
const LETTERING = ['c92128', '8a1015']

/**
 * Each block of lettering, in the source's pixels. A block is flipped as a
 * whole, so a line of words stays in order: "Run Club" flipped word by word
 * would read "Club Run". "Scoop" and "Bus" are one block, joined by a drip.
 * The two lights either side of "SBRC" are the same red, and are left out.
 */
const BLOCKS = [
	{ name: 'SBRC', x0: 40, x1: 70, y0: 11, y1: 26 },
	{ name: 'Scoop Bus', x0: 117, x1: 192, y0: 8, y1: 66 },
	{ name: 'Run Club', x0: 104, x1: 241, y0: 67, y1: 99 },
]

/** How far to look along a row or column for the bus behind a letter. */
const REACH = 16

const png = PNG.sync.read(readFileSync(SOURCE))
const { width, height, data } = png

const at = (x: number, y: number) => (y * width + x) * 4
const colourAt = (x: number, y: number) => {
	const i = at(x, y)
	return data[i + 3] < 128
		? 'clear'
		: [data[i], data[i + 1], data[i + 2]]
				.map((v) => v.toString(16).padStart(2, '0'))
				.join('')
}
const pixelAt = (x: number, y: number) => {
	const i = at(x, y)
	return [data[i], data[i + 1], data[i + 2], data[i + 3]]
}

for (const block of BLOCKS) {
	const inBlock = (x: number, y: number) =>
		x >= block.x0 && x <= block.x1 && y >= block.y0 && y <= block.y1
	const isLetter = (x: number, y: number) =>
		inBlock(x, y) && LETTERING.includes(colourAt(x, y))

	// Lift the letters off.
	const letters: { x: number; y: number; pixel: number[] }[] = []
	for (let y = block.y0; y <= block.y1; y++)
		for (let x = block.x0; x <= block.x1; x++)
			if (isLetter(x, y)) letters.push({ x, y, pixel: pixelAt(x, y) })

	// Fill in the bus behind them: the nearest bus either side along the row,
	// where both sides agree (the yellow, the stripes, a window's crossbar),
	// else above and below (a window's upright), else whichever's nearest.
	const fills = letters.map(({ x, y }) => {
		const look = (dx: number, dy: number) => {
			for (let step = 1; step <= REACH; step++) {
				const nx = x + dx * step
				const ny = y + dy * step
				if (nx < 0 || ny < 0 || nx >= width || ny >= height) return undefined
				if (!isLetter(nx, ny)) return { step, pixel: pixelAt(nx, ny) }
			}
			return undefined
		}
		const same = (
			a: { pixel: number[] } | undefined,
			b: { pixel: number[] } | undefined,
		) => a && b && a.pixel.join() === b.pixel.join()
		const left = look(-1, 0)
		const right = look(1, 0)
		const up = look(0, -1)
		const down = look(0, 1)
		if (left && same(left, right)) return left.pixel
		if (up && same(up, down)) return up.pixel
		const nearest = [left, right, up, down]
			.filter((found) => found !== undefined)
			.sort((a, b) => a.step - b.step)[0]
		return nearest?.pixel ?? [0, 0, 0, 0]
	})
	letters.forEach(({ x, y }, n) => data.set(fills[n], at(x, y)))

	// And put the letters back down, reversed about the middle of the block.
	for (const { x, y, pixel } of letters)
		data.set(pixel, at(block.x0 + block.x1 - x, y))

	console.log(`${block.name}: ${letters.length} pixels of lettering turned`)
}

writeFileSync(OUTPUT, PNG.sync.write(png))
console.log(`→ ${path.relative(process.cwd(), OUTPUT)}`)
