import type { CaveTiles } from '../types'
import {
	type PixelRect,
	paintedArt,
	pixelArt,
	pixelText,
	pixelTextWidth,
	svgUrl,
	tile,
} from './pixelArt'
import { seeded } from './seeded'

/**
 * The Caves' art, drawn in code: its rock, in layers, pebbled and seamed,
 * flecked with crystal; its back wall, dark and cracked; and what's about
 * in there: the mine's timbers holding its roof up, its lamps, glowing
 * toadstools, stalagmites, a miner's things left lying about, and the sign
 * over the way into the mine.
 */

export const ROCK = '#5a4639'
export const ROCK_DARK = '#4c3b30'
export const ROCK_DARKER = '#413228'
export const ROCK_LIT = '#674f40'
export const ROCK_LIGHTEST = '#8a6f5b'
export const SEAM = '#2f241e'
export const WALL = '#221a16'

/**
 * Rock, 96 by 72, to tile: strata running along it, a little wavy, pebbles
 * set in it, lit along their tops and shadowed under, cracks, and now and
 * then a fleck of crystal.
 */
function rockTile() {
	const width = 96
	const height = 72
	const t = tile(width, height)
	const random = seeded(31337)
	t.rect(0, 0, width, height, ROCK)
	// Strata, a band at a time, darker and lighter by turns.
	const bands: [number, number, string][] = [
		[4, 8, ROCK_DARK],
		[22, 6, ROCK_LIT],
		[36, 10, ROCK_DARK],
		[54, 5, ROCK_LIT],
		[64, 6, ROCK_DARKER],
	]
	for (const [y, h, fill] of bands)
		for (let x = 0; x < width; x += 8) {
			const wave = Math.round(Math.sin((x / width) * Math.PI * 2 + y) * 2) * 2
			t.rect(x, y + wave, 8, h, fill)
		}
	// Pebbles, lit on top, shadowed under.
	for (let i = 0; i < 16; i++) {
		const x = Math.floor(random() * (width / 2)) * 2
		const y = Math.floor(random() * (height / 2)) * 2
		const w = 4 + Math.floor(random() * 3) * 2
		const h = 2 + Math.floor(random() * 2) * 2
		t.rect(x, y, w, h, random() < 0.5 ? ROCK_LIT : ROCK_DARK)
		t.rect(x, y, w, 2, ROCK_LIGHTEST)
		t.rect(x, y + h, w, 2, SEAM)
	}
	// Cracks.
	for (let i = 0; i < 6; i++) {
		let x = Math.floor(random() * (width / 2)) * 2
		let y = Math.floor(random() * (height / 2)) * 2
		for (let step = 0; step < 5; step++) {
			t.rect(x, y, 4, 2, SEAM)
			x += 4
			y += random() < 0.5 ? 2 : -2
		}
	}
	// A fleck of crystal now and then.
	const flecks = ['#6fe3d4', '#e48ad8', '#9fd0ff']
	for (let i = 0; i < 3; i++) {
		const x = Math.floor(random() * (width / 2)) * 2
		const y = Math.floor(random() * (height / 2)) * 2
		t.rect(x, y, 2, 2, flecks[i % flecks.length])
	}
	return t.url()
}

/** The back wall, 64 by 64: dark, a few darker cracks and paler blotches, so it's rock, not a hole. */
function wallTile() {
	const width = 64
	const height = 64
	const t = tile(width, height)
	const random = seeded(4242)
	t.rect(0, 0, width, height, WALL)
	for (let i = 0; i < 10; i++) {
		const x = Math.floor(random() * 32) * 2
		const y = Math.floor(random() * 32) * 2
		t.rect(x, y, 6 + Math.floor(random() * 4) * 2, 4, '#2a201b')
	}
	for (let i = 0; i < 5; i++) {
		let x = Math.floor(random() * 32) * 2
		let y = Math.floor(random() * 32) * 2
		for (let step = 0; step < 4; step++) {
			t.rect(x, y, 4, 2, '#18120f')
			x += 4
			y += random() < 0.5 ? 2 : -2
		}
	}
	return t.url()
}

export const CAVE_TILES: CaveTiles = {
	rock: { asset: rockTile(), width: 96, height: 72 },
	wall: { asset: wallTile(), width: 64, height: 64 },
}

/** The same rock, as a CSS background, for its shelves' faces. */
export const ROCK_FACE = `url("${CAVE_TILES.rock.asset}")`

const TIMBER = '#8a5a32'
const TIMBER_DARK = '#5e3a1e'
const TIMBER_LIT = '#b07a44'
const IRON = '#3a3a3e'

/**
 * A pair of timber props and the beam across them, holding up the roof of
 * a tunnel: 30 by 50, iron brackets at its corners.
 */
export const timberFrame = pixelArt(30, 50, [
	// The beam.
	[0, 0, 30, 4, TIMBER],
	[0, 0, 30, 1, TIMBER_LIT],
	[0, 4, 30, 1, TIMBER_DARK],
	[6, 2, 2, 1, TIMBER_DARK],
	[19, 1, 3, 1, TIMBER_DARK],
	// The props.
	...[2, 25].flatMap((x): PixelRect[] => [
		[x, 5, 3, 45, TIMBER],
		[x, 5, 1, 45, TIMBER_LIT],
		[x + 2, 5, 1, 45, TIMBER_DARK],
		[x + 1, 18, 1, 3, TIMBER_DARK],
		[x + 1, 34, 1, 2, TIMBER_DARK],
	]),
	// Brackets, bolted on.
	[1, 4, 5, 3, IRON],
	[24, 4, 5, 3, IRON],
	[3, 5, 1, 1, '#9a9a9a'],
	[26, 5, 1, 1, '#9a9a9a'],
])

/** A glow of light: rings round `cx`, `cy`, fainter outwards. */
function glow(cx: number, cy: number, r: number, colour: string) {
	return (x: number, y: number) => {
		const d = Math.hypot(x - cx, y - cy) / r
		if (d > 1) return undefined
		return `${colour}${d > 0.66 ? '18' : d > 0.33 ? '30' : '48'}`
	}
}

/** A lamp on a post, lit, its glow round it: 20 by 40. */
export const lampPost = paintedArt(20, 40, (x, y) => {
	const lamp = x > 7 && x < 13 && y > 5 && y < 13
	if (lamp) {
		if (y < 7 || y > 11.5) return '#3a3a3a'
		return x > 8.5 && x < 11.5 ? '#ffe9a0' : '#f2b13c'
	}
	if (y < 5.5 && y > 4 && x > 8 && x < 12) return '#3a3a3a'
	if (x > 9 && x < 11 && y > 13) return y > 38 ? TIMBER_DARK : TIMBER
	return glow(10, 9, 10, '#ffd76a')(x, y)
})

/** Toadstools glowing in the dark, a clump of them: 16 by 10. */
export function glowShrooms(cap: string, spots: string) {
	return paintedArt(16, 10, (x, y) => {
		const caps: [number, number, number][] = [
			[4, 5, 3],
			[10, 3, 4],
			[13.5, 6.5, 2],
		]
		for (const [cx, cy, r] of caps) {
			// Its cap: a dome, spotted.
			if (
				y < cy &&
				y > cy - r &&
				Math.abs(x - cx) < r * (1 - (cy - y) / (r * 1.4))
			)
				return Math.round(x + y) % 3 === 0 && y < cy - 1 ? spots : cap
			// Its stem.
			if (y >= cy && Math.abs(x - cx) < 1 && y < 10) return '#e9e2cf'
		}
		return glow(9, 4, 8, cap.slice(0, 7))(x, y)
	})
}

/** Stalagmites up off the floor, a clump of them: 18 by 16. */
export const stalagmites = paintedArt(18, 16, (x, y) => {
	const spikes: [number, number, number][] = [
		[4, 6, 3],
		[9, 0, 4],
		[14, 7, 2.5],
	]
	for (const [cx, top, half] of spikes) {
		const across = half * ((y - top) / (16 - top))
		if (y >= top && Math.abs(x - cx) < across)
			return x < cx - across / 3
				? ROCK_LIT
				: x > cx + across / 2
					? ROCK_DARK
					: ROCK
	}
	return undefined
})

/** A miner's things, left lying about: a barrel, and a pickaxe leant on it. 24 by 16. */
export const minersKit = pixelArt(24, 16, [
	// The barrel, hooped.
	[2, 2, 10, 14, TIMBER],
	[1, 4, 12, 10, TIMBER],
	[3, 2, 1, 14, TIMBER_LIT],
	[2, 3, 10, 1, IRON],
	[1, 8, 12, 1, IRON],
	[2, 13, 10, 1, IRON],
	[10, 3, 1, 12, TIMBER_DARK],
	// The pickaxe: its handle, leant on it, and its head.
	...Array.from(
		{ length: 10 },
		(_, i): PixelRect => [13 + i, 15 - i, 1, 1, TIMBER],
	),
	[19, 3, 6, 2, '#8e939b'],
	[18, 2, 2, 2, '#8e939b'],
	[24, 5, 1, 1, '#c3c8cf'],
])

/** The sign over the way into the mine: a plank, its words burnt into it, on two posts. */
export const mineSign = (() => {
	const words = 'SCOOP MINE'
	const cell = 1
	const textWidth = pixelTextWidth(words, cell)
	const width = textWidth + 8
	const height = 30
	const body = [
		`<rect x="2" y="9" width="2" height="21" fill="${TIMBER_DARK}"/>`,
		`<rect x="${width - 4}" y="9" width="2" height="21" fill="${TIMBER_DARK}"/>`,
		`<rect x="0" y="0" width="${width}" height="11" fill="${TIMBER}"/>`,
		`<rect x="0" y="0" width="${width}" height="1" fill="${TIMBER_LIT}"/>`,
		`<rect x="0" y="10" width="${width}" height="1" fill="${TIMBER_DARK}"/>`,
		pixelText(words, 4, 2, cell, '#2a1a0e'),
	].join('')
	return { asset: svgUrl(width, height, body), width, height }
})()
