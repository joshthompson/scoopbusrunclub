import goat from '../../assets/finish/gavle-goat.png?inline'
import { pixelCircle, svgUrl } from './pixelArt'
import { seeded } from './seeded'

/**
 * The Slopes' finish: the Gävle goat, the great straw goat bound in red
 * ribbon that Gävle puts up every Advent, and that so often goes up in
 * flames. The goat's `apps/web/src/assets/misc/gävle.png`, at its own pixel
 * size (`assets/finish/gavle-goat.png`), facing left, back up the piste.
 * Caught along its back, its tail and the top of its horn, the straw
 * charred round them, smoke rising and embers flying, flickering, and a
 * glow round it in the dusk; still plain what it is. All of it in cells, as
 * the goat is.
 */

const COLUMNS = 124
/** As tall as the goat and the fire over it: its hooves on the bottom, on the snow. */
const ROWS = 136
/** The goat's size, and where its top left is. */
const GOAT_WIDTH = 90
const GOAT_HEIGHT = 121
const LEFT = 15
const TOP = 15

/**
 * The top of the straw, in the goat's own pixels, where it's burning: each
 * from and to, and the row its top is on there. Along its back, behind its
 * neck to its rump; its tail's tuft; and the top of its horn.
 */
const BACK: [from: number, to: number, top: number][] = [
	[44, 56, 58],
	[56, 64, 59],
	[64, 71, 58],
	[71, 72, 57],
	[72, 76, 56],
]
const TAIL: [from: number, to: number, top: number][] = [
	[77, 78, 45],
	[78, 79, 44],
	[79, 82, 45],
	[82, 83, 46],
	[83, 84, 45],
	[84, 86, 46],
]
const HORN: [from: number, to: number, top: number][] = [
	[36, 43, 1],
	[43, 49, 0],
]

/** Each fire: the straw it's on, and how high it burns at most. */
const FIRES = [
	{ straw: BACK, high: 22 },
	{ straw: TAIL, high: 12 },
	{ straw: HORN, high: 8 },
]

/** Root to tip: white-hot, yellow, orange, red, and dark red at the very tip. */
const BANDS: [until: number, colour: string][] = [
	[0.18, '#fff6c4'],
	[0.42, '#ffd23f'],
	[0.68, '#ff8a1c'],
	[0.86, '#e63c1c'],
	[1, '#a3201a'],
]

/** A cell, `x`, `y` in the goat's own pixels, in `colour`. */
const cell = (x: number, y: number, colour: string) =>
	`<rect x="${LEFT + x}" y="${TOP + y}" width="1" height="1" fill="${colour}"/>`

/**
 * Flames, one frame of three, a cell at a time: tongues up off the straw,
 * each its own height, rooted ragged down into it, glowing; white-hot at
 * their roots, then yellow, orange and red to their tips, flickering frame
 * to frame.
 */
function flames(frame: number) {
	const random = seeded(910 + frame)
	let out = ''
	for (const { straw, high } of FIRES) {
		const from = straw[0][0]
		const to = straw[straw.length - 1][1]
		let tongue = 0
		for (const [left, right, top] of straw)
			for (let x = left; x < right; x++) {
				// A new tongue every two or three columns, each its own height.
				if (x === from || random() < 0.4) tongue = 0.45 + random() * 0.7
				const along = (x - from + 0.5) / (to - from)
				const h = Math.round(
					high * (0.25 + 0.75 * Math.sin(along * Math.PI)) * tongue,
				)
				// Its roots, glowing, down into the straw, ragged.
				const roots = 1 + Math.floor(random() * 3)
				for (let i = 0; i < roots; i++)
					out += cell(x, top + i, i === roots - 1 ? '#c8541c' : '#ffb02e')
				let below = 0
				for (const [until, colour] of BANDS) {
					const up = Math.round(h * until)
					for (let i = below; i < up; i++)
						// Ragged at their tips, a cell here and there gone.
						if (until < 0.8 || random() < 0.6)
							out += cell(x, top - i - 1, colour)
					below = Math.max(below, up)
				}
			}
	}
	return out
}

/**
 * The straw charred round the fires, a cell at a time: blackest at the
 * top, where it's caught, patchier further down, an ember glowing in it
 * here and there. Kept to the goat by its shape (see `burningGoat`).
 */
function charred() {
	const random = seeded(4512)
	let out = ''
	for (const { straw } of FIRES)
		for (const [left, right, top] of straw)
			for (let x = left - 1; x <= right; x++)
				for (let depth = 0; depth < 7; depth++) {
					if (random() > 0.95 - depth * 0.16) continue
					const roll = random()
					out += cell(
						x,
						top + depth,
						roll < 0.08 ? '#ff7a1c' : roll < 0.6 ? '#2b1712' : '#5a2a16',
					)
				}
	return out
}

/** A glow round it, in the dusk: rings of light, fainter the further out, in cells, flickering. */
function glow() {
	const rings: [r: number, colour: string][] = [
		[48, 'rgba(255,150,60,0.08)'],
		[38, 'rgba(255,160,70,0.09)'],
		[28, 'rgba(255,180,90,0.1)'],
	]
	const discs = rings
		.map(([r, colour]) => pixelCircle(LEFT + 60, TOP + 52, r, colour))
		.join('')
	return `<g>${discs}<animate attributeName="opacity" values="0.8;1;0.85;1;0.8" dur="1.1s" repeatCount="indefinite"/></g>`
}

/** One of three frames, shown in turn, a third of the time each. */
const frameOf = (markup: string, frame: number) => {
	const values = [0, 1, 2]
		.map((i) => (i === frame ? 'visible' : 'hidden'))
		.join(';')
	return `<g visibility="${frame === 0 ? 'visible' : 'hidden'}">${markup}<animate attributeName="visibility" values="${values}" calcMode="discrete" dur="0.36s" repeatCount="indefinite"/></g>`
}

/**
 * `steps` whole-cell stops from `from` to `to`, for an animation to jump
 * between, a cell at a time, rather than slide between: pixel art.
 */
function stops(from: number, to: number, steps: number) {
	return Array.from({ length: steps + 1 }, (_, i) =>
		Math.round(from + ((to - from) * i) / steps),
	)
}

/** Smoke rising off its back, puffs drifting up and away, and embers flying up: a cell at a time. */
function smoke() {
	let out = ''
	const puffs = [
		{ x: 52, size: 8, delay: 0 },
		{ x: 62, size: 10, delay: 1.4 },
		{ x: 70, size: 7, delay: 2.7 },
	]
	for (const puff of puffs) {
		const s = puff.size
		const blob = [
			[0, s / 3, s, s / 3],
			[s / 4, 0, s / 2, s],
			[s / 8, s / 6, (s * 3) / 4, (s * 2) / 3],
		]
			.map(
				([x, y, w, h]) =>
					`<rect x="${Math.round(x)}" y="${Math.round(y)}" width="${Math.round(w)}" height="${Math.round(h)}" fill="#4a4250"/>`,
			)
			.join('')
		// Drifting left, off its back, as it faces: up the piste.
		const xs = stops(puff.x, puff.x - 12, 22)
		const ys = stops(TOP + 40, TOP - 4, 22)
		const moves = xs.map((x, i) => `${x} ${ys[i]}`).join(';')
		out += `<g opacity="0">${blob}<animateTransform attributeName="transform" type="translate" calcMode="discrete" values="${moves}" dur="4s" begin="${puff.delay}s" repeatCount="indefinite"/><animate attributeName="opacity" calcMode="discrete" values="0;0.2;0.35;0.4;0.35;0.25;0.15;0" dur="4s" begin="${puff.delay}s" repeatCount="indefinite"/></g>`
	}
	const random = seeded(77)
	for (let i = 0; i < 12; i++) {
		const x = LEFT + 40 + Math.round(random() * 48)
		const from = TOP + 42 + Math.round(random() * 14)
		const dur = (1.4 + random() * 1.4).toFixed(2)
		const begin = (random() * 2).toFixed(2)
		const ys = stops(from, from - 36, 18).join(';')
		const xs = stops(x, x + (i % 3) * 4 - 4, 18).join(';')
		out += `<rect x="${x}" y="${from}" width="1" height="1" fill="${i % 2 ? '#ffd23f' : '#ff7a1c'}" opacity="0"><animate attributeName="y" calcMode="discrete" values="${ys}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/><animate attributeName="x" calcMode="discrete" values="${xs}" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/><animate attributeName="opacity" calcMode="discrete" values="1;1;1;0" dur="${dur}s" begin="${begin}s" repeatCount="indefinite"/></rect>`
	}
	return out
}

/** The Gävle goat, burning, a picture of its own, animated: 124 by 136 cells. */
export const burningGoat = (() => {
	const image = `<image href="${goat}" x="${LEFT}" y="${TOP}" width="${GOAT_WIDTH}" height="${GOAT_HEIGHT}" style="image-rendering:pixelated"/>`
	// Its shape, to char only the straw, not the air round it.
	const shape = `<defs><mask id="goat-shape" style="mask-type:alpha">${image}</mask></defs>`
	const scorch = `<g mask="url(#goat-shape)">${charred()}</g>`
	const fire = [0, 1, 2].map((frame) => frameOf(flames(frame), frame)).join('')
	return svgUrl(
		COLUMNS,
		ROWS,
		`${shape}${glow()}${smoke()}${image}${scorch}${fire}`,
	)
})()
