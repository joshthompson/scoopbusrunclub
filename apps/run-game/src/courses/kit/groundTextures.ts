import { PATH_BACK, PATH_FRONT, VERGE } from '../../game/constants'
import type { CourseLook } from '../types'
import { tile } from './pixelArt'
import { seeded } from './seeded'

/**
 * Textures for the Ground's layers, as patterns for a course's `groundDefs`
 * (`url(#id)` over a layer's colour): a meadow's grass in tufts, a forest's
 * floor, needles and moss and fallen leaves, a dirt trail's grit and
 * pebbles, and Furby Fields' sprinkles and sugar. Laid over the course's
 * own colours, see-through, so they go with its palette: a suggestion of
 * texture, a few things at a time, not a busy one.
 */

/**
 * Haga's path and grass, as everyone has them, textured: `grass` (a
 * pattern's id) over the grass behind the path and in front of it, and
 * `trail` over the path.
 */
export const texturedGround = (
	grass: string,
	trail: string,
): NonNullable<CourseLook['ground']> => [
	[-PATH_BACK - VERGE, 'var(--grass-green)'],
	[-PATH_BACK - VERGE, `url(#${grass})`],
	[-PATH_BACK, 'var(--dirt-dark-brown)'],
	[-PATH_BACK + 5, 'var(--dirt-brown)'],
	[-PATH_BACK + 5, `url(#${trail})`],
	[PATH_FRONT, 'var(--grass-dark-green)'],
	[PATH_FRONT + 2, 'var(--grass-green)'],
	[PATH_FRONT + 2, `url(#${grass})`],
]

const even = (n: number) => Math.round(n / 2) * 2

/**
 * Grass in tufts, over a tile `width` by `height`: `tufts` of them, each a
 * few blades, shaded at the foot and lit at the tip, and `flowers` dotted
 * among them, each one of `petals`' colours with a heart.
 */
function tufted(options: {
	seed: number
	width: number
	height: number
	tufts: number
	dark: string
	lit: string
	flowers?: number
	petals?: string[]
	heart?: string
}) {
	const { width, height, dark, lit } = options
	const random = seeded(options.seed)
	const grass = tile(width, height)
	const { rect } = grass
	for (let n = 0; n < options.tufts; n++) {
		const x = even(random() * width)
		const y = even(random() * height)
		const blades = 2 + Math.floor(random() * 3)
		for (let b = 0; b < blades; b++) {
			const bx = x + b * 2 - blades
			const tall = 2 + even(random() * 4)
			rect(bx, y - tall, 2, tall, dark)
			if (random() < 0.5) rect(bx, y - tall - 2, 2, 2, lit)
		}
	}
	const petals = options.petals ?? []
	for (let n = 0; n < (options.flowers ?? 0) && petals.length; n++) {
		const x = even(random() * width)
		const y = even(random() * height)
		const petal = petals[Math.floor(random() * petals.length)]
		rect(x, y, 2, 2, petal)
		rect(x - 2, y + 2, 2, 2, petal)
		rect(x + 2, y + 2, 2, 2, petal)
		rect(x, y + 4, 2, 2, petal)
		if (options.heart) rect(x, y + 2, 2, 2, options.heart)
	}
	return grass
}

/**
 * A trail's surface, over a tile `width` by `height`: grit, lighter and
 * darker, and here and there a pebble, lit on top; and, if it's a forest's,
 * `strewn`, pine needles, and a root across it now and then.
 */
function gritty(options: {
	seed: number
	width: number
	height: number
	grains: number
	pebbles: number
	light: string
	dark: string
	needles?: { count: number; colour: string }
	roots?: { count: number; colour: string; lit: string }
}) {
	const { width, height, light, dark } = options
	const random = seeded(options.seed)
	const trail = tile(width, height)
	const { rect } = trail
	for (let n = 0; n < options.grains; n++)
		rect(
			even(random() * width),
			even(random() * height),
			2,
			2,
			random() < 0.45 ? light : dark,
		)
	for (let n = 0; n < options.pebbles; n++) {
		const x = even(random() * width)
		const y = even(random() * (height - 4))
		const wide = random() < 0.5 ? 4 : 6
		rect(x, y + 2, wide, 2, dark)
		rect(x, y, wide - 2, 2, light)
	}
	if (options.needles)
		for (let n = 0; n < options.needles.count; n++) {
			const x = even(random() * width)
			const y = even(random() * height)
			// Lying every which way: along, or a step up or down.
			if (random() < 0.5) rect(x, y, 4, 2, options.needles.colour)
			else {
				rect(x, y, 2, 2, options.needles.colour)
				rect(x + 2, y + (random() < 0.5 ? 2 : -2), 2, 2, options.needles.colour)
			}
		}
	if (options.roots)
		for (let n = 0; n < options.roots.count; n++) {
			// A root across the trail, knobbly, wandering a little.
			let x = even(random() * width)
			let y = even(random() * (height - 8)) + 4
			const long = 24 + even(random() * 24)
			for (let along = 0; along < long; along += 4) {
				rect(x, y, 4, 2, options.roots.colour)
				if (along % 8 === 0) rect(x, y - 2, 4, 2, options.roots.lit)
				x += 4
				const step = random()
				if (step < 0.25) y -= 2
				else if (step > 0.75) y += 2
			}
		}
	return trail
}

// --- Haga: a park, grass and a dirt path through it -------------------------------

/** Haga's grass, either side of the path: tufts, and a daisy or a buttercup. */
export const HAGA_GRASS = tufted({
	seed: 5100,
	width: 360,
	height: 110,
	tufts: 70,
	dark: 'rgba(40, 80, 25, 0.32)',
	lit: 'rgba(205, 240, 150, 0.4)',
	flowers: 4,
	petals: ['rgba(255, 255, 255, 0.85)', 'rgba(255, 224, 90, 0.85)'],
	heart: 'rgba(240, 190, 60, 0.9)',
}).pattern('haga-grass')

/** Haga's path: grit, and pebbles. */
export const HAGA_TRAIL = gritty({
	seed: 5101,
	width: 180,
	height: 32,
	grains: 40,
	pebbles: 5,
	light: 'rgba(255, 238, 205, 0.34)',
	dark: 'rgba(95, 60, 25, 0.26)',
}).pattern('haga-trail')

// --- Huddinge: deep in the forest -------------------------------------------------

/**
 * Huddinge's forest floor: moss in tufts, pine needles, and fallen leaves,
 * no flowers.
 */
export const HUDDINGE_FLOOR = (() => {
	const floor = tufted({
		seed: 5200,
		width: 360,
		height: 110,
		tufts: 52,
		dark: 'rgba(20, 45, 15, 0.38)',
		lit: 'rgba(150, 200, 90, 0.34)',
		flowers: 10,
		// Fallen leaves, brown and gold, in place of flowers.
		petals: ['rgba(150, 95, 40, 0.6)', 'rgba(190, 140, 50, 0.55)'],
	})
	const random = seeded(5201)
	for (let n = 0; n < 80; n++)
		floor.rect(
			even(random() * 360),
			even(random() * 110),
			random() < 0.5 ? 4 : 2,
			2,
			'rgba(120, 80, 40, 0.3)',
		)
	return floor.pattern('huddinge-floor')
})()

/** Huddinge's trail: grit, pebbles, pine needles, and roots across it. */
export const HUDDINGE_TRAIL = gritty({
	seed: 5202,
	width: 220,
	height: 32,
	grains: 34,
	pebbles: 3,
	light: 'rgba(240, 215, 175, 0.26)',
	dark: 'rgba(60, 38, 18, 0.3)',
	needles: { count: 26, colour: 'rgba(95, 60, 25, 0.42)' },
	roots: {
		count: 1,
		colour: 'rgba(70, 42, 20, 0.6)',
		lit: 'rgba(170, 120, 70, 0.4)',
	},
}).pattern('huddinge-trail')

// --- Furby Fields: a land made of sweets ------------------------------------------

/** Sprinkles on the mint field, in every colour, every which way, and sugar glinting. */
export const FURBY_SPRINKLES = (() => {
	const random = seeded(5300)
	const width = 180
	const height = 60
	const sprinkles = tile(width, height)
	const colours = [
		'#ff6fa8',
		'#ffe66b',
		'#6bc4ff',
		'#b48bff',
		'#ffffff',
		'#ffb86b',
	]
	for (let n = 0; n < 10; n++) {
		const x = even(random() * width)
		const y = even(random() * height)
		const colour = colours[Math.floor(random() * colours.length)]
		if (random() < 0.5) sprinkles.rect(x, y, 4, 2, colour)
		else sprinkles.rect(x, y, 2, 4, colour)
	}
	// Sugar, glinting: a pale cell here and there, and the grass darker in tufts.
	for (let n = 0; n < 18; n++)
		sprinkles.rect(
			even(random() * width),
			even(random() * height),
			2,
			2,
			random() < 0.5 ? 'rgba(255, 255, 255, 0.55)' : 'rgba(40, 130, 100, 0.22)',
		)
	return sprinkles
})()
export const FURBY_FIELD = FURBY_SPRINKLES.pattern('furby-sprinkles')
/** The same, as a CSS background, for the field behind the path. */
export const FURBY_FIELD_FAR = FURBY_SPRINKLES.url()

/** The path, pink sugar: grains, lighter and darker, and now and then a heart sweet. */
export const FURBY_SUGAR = (() => {
	const random = seeded(5301)
	const width = 160
	const height = 32
	const sugar = tile(width, height)
	for (let n = 0; n < 40; n++)
		sugar.rect(
			even(random() * width),
			even(random() * height),
			2,
			2,
			random() < 0.55 ? 'rgba(255, 255, 255, 0.5)' : 'rgba(170, 70, 140, 0.2)',
		)
	for (let n = 0; n < 2; n++) {
		const x = even(random() * (width - 8))
		const y = even(random() * (height - 6))
		const c = n ? '#ff6fa8' : '#b48bff'
		sugar.rect(x, y, 2, 2, c)
		sugar.rect(x + 4, y, 2, 2, c)
		sugar.rect(x, y + 2, 6, 2, c)
		sugar.rect(x + 2, y + 4, 2, 2, c)
		sugar.rect(x, y, 2, 2, '#ffd6ea')
	}
	return sugar.pattern('furby-sugar')
})()
