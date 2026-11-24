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
 * `strewn`, pine needles, and a root across it occasionally.
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

// --- Huddinge: deep in the forest, in autumn --------------------------------------

/** Fallen leaves, as they lie: rust, orange, gold, crimson, and brown gone over. */
const AUTUMN_LEAVES = [
	{ leaf: 'rgba(196, 92, 32, 0.8)', lit: 'rgba(238, 150, 66, 0.75)' },
	{ leaf: 'rgba(216, 160, 44, 0.8)', lit: 'rgba(246, 212, 96, 0.75)' },
	{ leaf: 'rgba(168, 46, 36, 0.75)', lit: 'rgba(214, 86, 56, 0.7)' },
	{ leaf: 'rgba(128, 80, 40, 0.65)', lit: 'rgba(170, 118, 64, 0.6)' },
]

/**
 * `count` fallen leaves scattered over `tile`, `width` by `height`: each a
 * few cells, lying every which way, lit along its top, from `seed`'s
 * numbers.
 */
function strewLeaves(
	ground: ReturnType<typeof tile>,
	options: { seed: number; width: number; height: number; count: number },
) {
	const random = seeded(options.seed)
	for (let n = 0; n < options.count; n++) {
		const x = even(random() * options.width)
		const y = even(random() * options.height)
		const { leaf, lit } =
			AUTUMN_LEAVES[Math.floor(random() * AUTUMN_LEAVES.length)]
		if (random() < 0.5) {
			// Lying along: a long oval, lit at its top left.
			ground.rect(x, y + 2, 6, 2, leaf)
			ground.rect(x + 2, y, 2, 2, lit)
		} else {
			// Lying across: a diamond, lit at its top.
			ground.rect(x, y, 2, 2, lit)
			ground.rect(x - 2, y + 2, 6, 2, leaf)
			ground.rect(x, y + 4, 2, 2, leaf)
		}
	}
}

/**
 * Huddinge's forest floor in autumn: tufts of grass gone dry and tan,
 * moss still green in patches, needles, and fallen leaves everywhere,
 * rust and gold and red, more of them than anything.
 */
export const HUDDINGE_FLOOR = (() => {
	const floor = tufted({
		seed: 5200,
		width: 360,
		height: 110,
		tufts: 40,
		dark: 'rgba(70, 52, 20, 0.34)',
		lit: 'rgba(222, 196, 120, 0.4)',
	})
	const random = seeded(5201)
	// Moss, low and still green, a cushion here and there.
	for (let n = 0; n < 7; n++) {
		const x = even(random() * 360)
		const y = even(random() * 110)
		floor.rect(x, y, 8, 2, 'rgba(78, 112, 40, 0.42)')
		floor.rect(x + 2, y - 2, 4, 2, 'rgba(118, 150, 62, 0.4)')
	}
	// Needles, brown, lying about.
	for (let n = 0; n < 50; n++)
		floor.rect(
			even(random() * 360),
			even(random() * 110),
			random() < 0.5 ? 4 : 2,
			2,
			'rgba(90, 58, 26, 0.3)',
		)
	strewLeaves(floor, { seed: 5203, width: 360, height: 110, count: 46 })
	return floor.pattern('huddinge-floor')
})()

/** Huddinge's trail: grit, pebbles, pine needles, roots across it, and leaves trodden into it. */
export const HUDDINGE_TRAIL = (() => {
	const trail = gritty({
		seed: 5202,
		width: 220,
		height: 32,
		grains: 34,
		pebbles: 3,
		light: 'rgba(240, 215, 175, 0.26)',
		dark: 'rgba(60, 38, 18, 0.3)',
		needles: { count: 22, colour: 'rgba(95, 60, 25, 0.42)' },
		roots: {
			count: 1,
			colour: 'rgba(70, 42, 20, 0.6)',
			lit: 'rgba(170, 120, 70, 0.4)',
		},
	})
	strewLeaves(trail, { seed: 5204, width: 220, height: 28, count: 7 })
	return trail.pattern('huddinge-trail')
})()

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

/** The path, pink sugar: grains, lighter and darker, and occasionally a heart sweet. */
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
