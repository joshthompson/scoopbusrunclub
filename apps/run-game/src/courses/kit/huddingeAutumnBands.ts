import { svgUrl } from './pixelArt'
import { seeded } from './seeded'

/**
 * Huddinge's horizon in October: two ridges of forest, a far one in the
 * haze and a nearer wall of it, the spruces and pines dark green and the
 * birches, aspens and rowans among them gone gold, orange and red, in
 * clumps. Each tiles (whatever runs off one edge carries on over the
 * other), in 2-px steps, hazier and warmer the further off.
 */

const rect = (x: number, y: number, w: number, h: number, fill: string) =>
	`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`
const even = (n: number) => Math.round(n / 2) * 2

/** Drawn at `x`, and again a band's `width` either side of it, so it tiles. */
const tiled = (width: number, x: number, draw: (x: number) => string) =>
	[-width, 0, width].map((shift) => draw(x + shift)).join('')

/** One tree's tones: body, lit (top left), shade (underside, right). */
interface Tones {
	base: string
	lit: string
	shade: string
}

/** `hex` mixed `share` of the way to `to`: further off, hazier. */
function mix(hex: string, to: string, share: number) {
	const parse = (h: string) =>
		[1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16))
	const a = parse(hex)
	const b = parse(to)
	return `#${a
		.map((v, i) =>
			Math.round(v + (b[i] - v) * share)
				.toString(16)
				.padStart(2, '0'),
		)
		.join('')}`
}

const hazed = (t: Tones, to: string, share: number): Tones => ({
	base: mix(t.base, to, share),
	lit: mix(t.lit, to, share),
	shade: mix(t.shade, to, share),
})

/** The autumn leaves, as the Bomb Hat forest has them. */
const GOLD: Tones = { base: '#eebc32', lit: '#fbdc5c', shade: '#d08e22' }
const ORANGE: Tones = { base: '#dd7a22', lit: '#f0a032', shade: '#b45a20' }
const RED: Tones = { base: '#c0302c', lit: '#e0502f', shade: '#96242a' }
const RUST: Tones = { base: '#b8662a', lit: '#d88a3a', shade: '#8e4a24' }
const LEAF_KINDS = [GOLD, GOLD, ORANGE, RED, RUST]
const SPRUCE: Tones = { base: '#2f5a3a', lit: '#437c4a', shade: '#20402c' }

/** Birch bark, for the white stubs of trunk under the golden crowns. */
const BIRCH = '#d9d2bd'
const BIRCH_MARK = '#5a5043'
const TRUNK = '#4a3526'

/** A spruce: tiers of boughs, lit on the left, in shadow on the right, a stub of trunk under. */
function spruce(x: number, base: number, tall: number, c: Tones) {
	let body = rect(x - 1, base - 4, 2, 4, c.shade)
	const tiers = Math.max(3, Math.round(tall / 10))
	const tierTall = (tall - 4) / tiers
	for (let t = 0; t < tiers; t++) {
		const bottom = base - 4 - t * tierTall
		const half = (tall / 4) * (1 - t / tiers) + 2
		for (let y = even(bottom - tierTall * 1.4); y < bottom; y += 2) {
			const w = even(
				(half * (y - (bottom - tierTall * 1.4))) / (tierTall * 1.4),
			)
			if (w <= 0) continue
			body += rect(x - w, y, w, 2, c.lit)
			body += rect(x, y, w, 2, c.base)
			body += rect(x + w - 2, y, 2, 2, c.shade)
		}
	}
	body += rect(x - 1, base - tall - 2, 2, 4, c.lit)
	return body
}

/**
 * A rounded crown of leaves, `wide` by `tall` px, its foot at `base`, on a
 * stub of trunk: lit across its top left, in shade down its right and
 * under. `birch` gives it a pale trunk with a dark fleck or two.
 */
function crown(
	x: number,
	base: number,
	wide: number,
	tall: number,
	c: Tones,
	trunk: string,
	birch: boolean,
	flecks: boolean,
) {
	const rx = wide / 2
	const trunkTall = even(Math.max(4, tall * 0.28))
	let body = rect(x - 1, base - trunkTall, 2, trunkTall, trunk)
	if (birch && trunkTall >= 6)
		body += rect(x - 1, base - trunkTall + 2, 2, 2, BIRCH_MARK)
	const crownTall = tall - trunkTall + 2
	const cy = base - trunkTall - crownTall / 2 + 2
	const ry = crownTall / 2
	for (let y = even(cy - ry); y < cy + ry; y += 2) {
		const dy = (y + 1 - cy) / ry
		const w = even(rx * Math.sqrt(Math.max(0, 1 - dy * dy)))
		if (w <= 0) continue
		const lowest = y + 2 >= cy + ry - 0.1
		body += rect(x - w, y, w * 2, 2, lowest ? c.shade : c.base)
		if (lowest) continue
		// Lit across the top left, shaded down the right.
		if (dy < 0.1) body += rect(x - w, y, Math.max(2, even(w * 1.05)), 2, c.lit)
		else if (dy < 0.5 && w >= 4) body += rect(x - w, y, 2, 2, c.lit)
		if (w >= 4) body += rect(x + w - 2, y, 2, 2, c.shade)
		if (dy > 0.3 && w >= 6) body += rect(x + w - 4, y, 2, 2, c.shade)
	}
	// A few darker leaf clusters, so a big crown isn't one flat blob.
	if (flecks && rx >= 8) {
		body += rect(x - 2, even(cy + ry * 0.2), 4, 2, c.shade)
		body += rect(x + 2, even(cy - ry * 0.35), 2, 2, c.lit)
	}
	return body
}

interface RidgeOptions {
	seed: number
	width: number
	height: number
	/** Where the hillside's crest runs, down the band. */
	line: number
	tall: [number, number]
	gap: [number, number]
	ground: string
	/** Conifer tones, and the haze (if any) over every tree. */
	spruce: Tones
	haze?: { to: string; share: number }
	/** How wide a crown is, against its height. */
	crownWide: number
	/** How many clumps of broadleaves along the ridge, and how wide each is. */
	clumps: number
	clumpWide: [number, number]
	/** Leaf colours for the clumps. */
	leaves: Tones[]
	flecks: boolean
}

/**
 * A ridge of forest along a band, packed in over the hillside it stands on:
 * conifers everywhere, and clumps of broadleaves in autumn colours, each
 * clump one colour more or less, here and there a stray one in the spruces.
 */
function autumnRidge(o: RidgeOptions) {
	const { width, height, line, tall, gap } = o
	const random = seeded(o.seed)
	const phases = [random(), random()].map((p) => p * Math.PI * 2)
	const top = (x: number) =>
		even(
			line +
				8 * Math.sin((Math.PI * 2 * 2 * x) / width + phases[0]) +
				4 * Math.sin((Math.PI * 2 * 5 * x) / width + phases[1]),
		)
	const haze = (t: Tones) => (o.haze ? hazed(t, o.haze.to, o.haze.share) : t)
	let ground = ''
	for (let x = 0; x < width; x += 2)
		ground += rect(x, top(x), 2, height - top(x), o.ground)

	// The clumps: where along the ridge, how wide, which colour.
	const clumps: { at: number; wide: number; tones: Tones }[] = []
	for (let i = 0; i < o.clumps; i++) {
		clumps.push({
			at: ((i + 0.2 + random() * 0.6) * width) / o.clumps,
			wide: o.clumpWide[0] + random() * (o.clumpWide[1] - o.clumpWide[0]),
			tones: o.leaves[Math.floor(random() * o.leaves.length)],
		})
	}
	const inClump = (x: number) =>
		clumps.find((c) => {
			const d = Math.abs(((x - c.at + width * 1.5) % width) - width / 2)
			return d < c.wide / 2
		})

	const trees: { x: number; base: number; markup: (x: number) => string }[] = []
	for (let x = 0; x < width; x += even(gap[0] + random() * (gap[1] - gap[0]))) {
		const t = even(tall[0] + random() * (tall[1] - tall[0]))
		const base = top(x) + 4 + even(random() * 6)
		const clump = inClump(x)
		const roll = random()
		const tonesRoll = random()
		const leafy = clump ? roll < 0.55 : roll < 0.03
		if (leafy) {
			const tones = haze(
				clump && tonesRoll < 0.85
					? clump.tones
					: o.leaves[Math.floor(tonesRoll * o.leaves.length)],
			)
			const h = even(t * 0.8)
			const w = even(h * o.crownWide + random() * 4)
			const birch = tones.base === haze(GOLD).base && !o.haze
			trees.push({
				x,
				base,
				markup: (px) =>
					crown(
						px,
						base,
						w,
						h,
						tones,
						birch ? BIRCH : o.haze ? tones.shade : TRUNK,
						birch,
						o.flecks,
					),
			})
		} else {
			trees.push({
				x,
				base,
				markup: (px) => spruce(px, base, t, haze(o.spruce)),
			})
		}
	}
	// The ones further up the slope first, the nearer over them.
	trees.sort((a, b) => a.base - b.base)
	let body = ''
	for (const t of trees) body += tiled(width, t.x, t.markup)
	return svgUrl(width, height, ground + body)
}

/**
 * A far forested ridge in the haze, over Huddinge's far hills: small
 * packed trees on the hillside, mostly blue-green spires, with clumps of
 * rounded gold, rust and ochre birch and aspen among them. 960 by 100.
 */
export const autumnRidgeFar = autumnRidge({
	seed: 6410,
	width: 960,
	height: 100,
	line: 62,
	tall: [16, 30],
	gap: [5, 9],
	ground: '#8c8160',
	spruce: { base: '#6e8c80', lit: '#84a094', shade: '#5b7a6e' },
	haze: { to: '#d9d0b4', share: 0.42 },
	crownWide: 0.8,
	clumps: 9,
	clumpWide: [50, 100],
	leaves: [GOLD, GOLD, ORANGE, RUST, RED],
	flecks: false,
})

/**
 * The nearer wall of forest, over the middle hills: dark spruces packed
 * close, and golden birches, orange and red aspens and rowans standing
 * among them in clumps, their crowns round and lit top left. 960 by 120.
 */
export const autumnRidgeNear = autumnRidge({
	seed: 6411,
	width: 960,
	height: 120,
	line: 76,
	tall: [34, 62],
	gap: [7, 13],
	ground: '#4b4424',
	spruce: SPRUCE,
	crownWide: 0.85,
	clumps: 9,
	clumpWide: [60, 110],
	leaves: LEAF_KINDS,
	flecks: true,
})
