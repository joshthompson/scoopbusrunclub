import { tile } from './pixelArt'
import { seeded } from './seeded'

/**
 * The Pyramids' sand: ripples blown into it by the wind, each a lit crest
 * with its shadow under it, wavering along, and grains of it lighter and
 * darker; the path trodden flat through it, only grains and the odd pebble;
 * and the sand behind the path, its ripples smaller and fainter, further off.
 * Laid over the sand's colours, mostly see-through.
 */

/**
 * Ripples and grains over a tile `width` by `height`: `ripples` of them,
 * each `from` to `to` long, lit along its crest and shaded under.
 */
function rippled(options: {
	seed: number
	width: number
	height: number
	ripples: number
	from: number
	to: number
	grains: number
	crest: string
	trough: string
	light: string
	dark: string
}) {
	const { width, height, crest, trough, light, dark } = options
	const random = seeded(options.seed)
	const sand = tile(width, height)
	const { rect } = sand
	const even = (n: number) => Math.round(n / 2) * 2
	for (let n = 0; n < options.ripples; n++) {
		let x = even(random() * width)
		let y = even(random() * height)
		const length = options.from + random() * (options.to - options.from)
		const end = x + length
		// Wavering along: up a step, along, down a step, as the wind left it.
		while (x < end) {
			const w = 6 + even(random() * 8)
			rect(x, y, w, 2, crest)
			rect(x, y + 2, w, 2, trough)
			x += w
			const step = random()
			if (step < 0.3) y -= 2
			else if (step > 0.7) y += 2
			y = Math.max(0, Math.min(height - 4, y))
		}
	}
	for (let n = 0; n < options.grains; n++)
		rect(
			even(random() * width),
			even(random() * height),
			2,
			2,
			random() < 0.5 ? light : dark,
		)
	return sand
}

/** The sand either side of the path: ripples, and grains. */
export const SAND_RIPPLES = rippled({
	seed: 3100,
	width: 240,
	height: 60,
	ripples: 9,
	from: 24,
	to: 60,
	grains: 40,
	crest: 'rgba(255, 244, 210, 0.42)',
	trough: 'rgba(150, 100, 40, 0.26)',
	light: 'rgba(255, 244, 210, 0.4)',
	dark: 'rgba(150, 100, 40, 0.22)',
}).pattern('sand-ripples')

/** Behind the path, further off: smaller, fainter ripples, as a CSS background. */
export const SAND_FAR_RIPPLES = rippled({
	seed: 3101,
	width: 200,
	height: 48,
	ripples: 10,
	from: 14,
	to: 34,
	grains: 24,
	crest: 'rgba(255, 244, 210, 0.3)',
	trough: 'rgba(150, 100, 40, 0.12)',
	light: 'rgba(255, 244, 210, 0.28)',
	dark: 'rgba(150, 100, 40, 0.14)',
}).url()

/**
 * The path, trodden flat through the sand: no ripples, only grains,
 * lighter and darker, and here and there a pebble, lit on top.
 */
export const SAND_TRACK = (() => {
	const random = seeded(3102)
	const width = 160
	const height = 36
	const track = tile(width, height)
	const { rect } = track
	const even = (n: number) => Math.round(n / 2) * 2
	for (let n = 0; n < 46; n++)
		rect(
			even(random() * width),
			even(random() * height),
			2,
			2,
			random() < 0.45 ? 'rgba(255, 240, 200, 0.32)' : 'rgba(110, 72, 30, 0.22)',
		)
	for (let n = 0; n < 4; n++) {
		const x = even(random() * width)
		const y = even(random() * (height - 4))
		rect(x, y, 4, 4, 'rgba(110, 72, 30, 0.45)')
		rect(x, y, 2, 2, 'rgba(255, 240, 200, 0.4)')
	}
	return track.pattern('sand-track')
})()
