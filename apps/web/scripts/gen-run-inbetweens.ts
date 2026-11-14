/**
 * Put two in-between frames into every runner's run strip, turning a 4-frame
 * stride into a 6-frame one, for a smoother run in the header and the run game.
 *
 * The strips play left to right (`generateFrames` lists them reversed, and the
 * engine's background offsets turn that back round), one step to a loop, the
 * legs swapping over at the end:
 *
 *   1 reach · 2 land · 3 high knee · [new: passing] · 4 push off · [new: kick up]
 *
 * The two biggest jumps were 3 → 4, where the swinging leg goes from folded up
 * behind to planted out in front, and 4 → 1, where the back foot goes from the
 * ground to up by the hips. The new frames go in those gaps.
 *
 * Every runner's sprite is drawn on the same template, so one recipe does them
 * all. Each new frame is the frame before it from the hips up — arms, head and
 * all, so everything someone's wearing up there carries over — and new legs
 * from the hips down, drawn here once in the template's placeholder colours
 * (`LEGS`) and painted in each runner's own: the colour of each placeholder is
 * whatever that runner's existing frames have the most of where the template
 * has it. Anything that doesn't move from frame to frame out in front of them
 * stays put — August's pram.
 *
 * Lyra, a child in a dress, isn't on the template: her legs are drawn for her
 * (`LYRA_LEGS`). Link is a dog, and keeps his two frames.
 *
 * Usage: npx tsx apps/web/scripts/gen-run-inbetweens.ts
 * Output is committed art, so this isn't wired into dev/build. A strip that
 * already has its six frames is left alone, so running it again is harmless.
 * Afterwards, regenerate the zombie strips from the new run strips
 * (`gen-zombie-runners.ts`) and the custom runner pixel data (`pnpm gen:custom-runner`).
 */

import fs from 'node:fs'
import path from 'node:path'
import { PNG } from 'pngjs'

const RUNNERS_DIR = path.resolve(import.meta.dirname, '../src/assets/runners')
/** Write somewhere else instead, to look at before overwriting the art. */
const OUT_DIR = process.argv[2] ? path.resolve(process.argv[2]) : RUNNERS_DIR

type Rgb = [number, number, number]

const OLD_FRAMES = 4
/**
 * Each new frame: which old frame (0-based) it goes after, which old frame its
 * arms, head and body are from, and its legs. Pushing off, the arms swing back
 * up the way they came down: the landing frame's are halfway up.
 */
const INSERTS = [
	{ after: 2, body: 2, legs: 'passing' },
	{ after: 3, body: 1, legs: 'kickUp' },
] as const

/**
 * The template's placeholder leg colours (see `createRunnerFrames`): shorts,
 * the rest of the thigh, the knee, the sock and the shoe.
 */
const LEG_COLOURS: Record<string, Rgb> = {
	f: [0x00, 0xff, 0x00],
	i: [0x00, 0xcc, 0x00],
	j: [0x00, 0x99, 0x00],
	h: [0x00, 0x66, 0x00],
	g: [0x00, 0x33, 0x00],
}

/**
 * The new legs, from the hips (the template's row 9) to the ground, at a club
 * member's proportions: their feet on the ground on the last row. 23 wide,
 * facing left.
 */
const LEGS = {
	// The swinging leg coming through, knee forward, its foot hanging under
	// it; the other one behind, heel up, about to push off.
	passing: `
.......ffffff..........
......iffffffi.........
.....iiiifffiii........
....iiiii..iiii........
....jjii....iiij.......
.....jjj.....jjj.......
.......hh.....jj.......
........hgg....hh......
........ggg.....hh.....
................gg.....
...............ggg.....
..............gg.......
`,
	// Pushed off: the front foot leaving the ground for its reach, the back
	// heel coming up behind on its way up to the hips.
	kickUp: `
......fffffff..........
.....iffffffff.........
....iiiifffiiii........
....iiii...iiiii.......
....jji.....iiijj...g..
....jj........jjjhhggg.
....hj..............gg.
....hh.................
....hg.................
...ggg.................
..ggg..................
.......................
`,
}

/** Lyra's legs, under her dress (her row 24 on), in her own colours. */
const LYRA_COLOURS: Record<string, Rgb> = {
	c: [0xa3, 0x77, 0xbc], // dress
	e: [0xdb, 0xd3, 0xdf], // tights
	d: [0xef, 0x98, 0xe8], // shoes
}
const LYRA_TOP = 24
const LYRA_LEGS = {
	passing: `
........ccccc..........
........cccce..........
.........e.e...........
........dd..d..........
...........dd..........
`,
	kickUp: `
.......cccccc..........
.......ecccce..........
.......e....ed.........
......dd.....dd........
......dd...............
`,
}

interface Sheet {
	folder: string
	frameWidth: number
	/** Where the template's frame sits in theirs: its row 9, the hips, is theirs `9 + dy`. */
	dx: number
	dy: number
	/** The template itself: its legs are its placeholder colours, and its shoes a row deeper. */
	template?: boolean
}

const ADULT = { frameWidth: 23, dx: 0, dy: 8 }
const SHEETS: Sheet[] = [
	...[
		'josh',
		'keith',
		'claire',
		'anna',
		'eline',
		'rick',
		'sophie',
		'alisa',
		'mikael',
		'other-josh',
	].map((folder) => ({ folder, ...ADULT })),
	{ folder: 'adam', ...ADULT, dy: 10 },
	{ folder: 'august', frameWidth: 50, dx: 24, dy: 9 },
	{ folder: 'custom', ...ADULT, dy: 0, template: true },
]

const HIPS = 9
const key = ([r, g, b]: Rgb) => `${r},${g},${b}`
const grid = (art: string) => art.trim().split('\n')

function strip(folder: string) {
	const file = path.join(RUNNERS_DIR, folder, 'run.png')
	return PNG.sync.read(fs.readFileSync(file))
}

/** The strip with the new frames put in, each drawn by `draw` over a copy of the frame before it. */
function withInbetweens(
	png: PNG,
	frameWidth: number,
	draw: (
		frame: PNG,
		legs: (typeof INSERTS)[number]['legs'],
		old: (n: number, x: number, y: number) => Rgb | null,
	) => void,
) {
	const { height } = png
	const old = (n: number, x: number, y: number): Rgb | null => {
		if (x < 0 || x >= frameWidth || y < 0 || y >= height) return null
		const i = (y * png.width + n * frameWidth + x) * 4
		return png.data[i + 3] < 30
			? null
			: [png.data[i], png.data[i + 1], png.data[i + 2]]
	}
	const order: { from: number; legs?: (typeof INSERTS)[number]['legs'] }[] = []
	for (let n = 0; n < OLD_FRAMES; n++) {
		order.push({ from: n })
		for (const insert of INSERTS)
			if (insert.after === n)
				order.push({ from: insert.body, legs: insert.legs })
	}
	const out = new PNG({ width: frameWidth * order.length, height })
	order.forEach(({ from, legs }, n) => {
		const frame = new PNG({ width: frameWidth, height })
		PNG.bitblt(png, frame, from * frameWidth, 0, frameWidth, height, 0, 0)
		if (legs) draw(frame, legs, old)
		PNG.bitblt(frame, out, 0, 0, frameWidth, height, n * frameWidth, 0)
	})
	return out
}

function set(png: PNG, x: number, y: number, rgb: Rgb | null) {
	if (x < 0 || y < 0 || x >= png.width || y >= png.height) return
	const i = (y * png.width + x) * 4
	if (!rgb) {
		png.data[i + 3] = 0
		return
	}
	png.data[i] = rgb[0]
	png.data[i + 1] = rgb[1]
	png.data[i + 2] = rgb[2]
	png.data[i + 3] = 255
}

function write(png: PNG, folder: string) {
	const dir = path.join(OUT_DIR, folder)
	fs.mkdirSync(dir, { recursive: true })
	fs.writeFileSync(path.join(dir, 'run.png'), PNG.sync.write(png))
	console.log(`✓ ${folder}/run.png`)
}

function makeSheet(sheet: Sheet) {
	const png = strip(sheet.folder)
	if (png.width !== sheet.frameWidth * OLD_FRAMES) {
		console.log(`- ${sheet.folder}: already done`)
		return
	}
	const template = strip('custom')
	const placeholder = (n: number, x: number, y: number) => {
		if (x < 0 || x >= 23 || y < 0 || y >= template.height) return undefined
		const i = (y * template.width + n * 23 + x) * 4
		if (template.data[i + 3] < 30) return undefined
		const rgb: Rgb = [
			template.data[i],
			template.data[i + 1],
			template.data[i + 2],
		]
		return Object.keys(LEG_COLOURS).find(
			(c) => key(LEG_COLOURS[c]) === key(rgb),
		)
	}

	// Their colour for each placeholder: what they've most of where the template has it.
	const palette = new Map<string, Rgb>()
	if (sheet.template) {
		for (const [c, rgb] of Object.entries(LEG_COLOURS)) palette.set(c, rgb)
	} else {
		const votes = new Map<string, Map<string, { rgb: Rgb; n: number }>>()
		for (let n = 0; n < OLD_FRAMES; n++) {
			for (let y = HIPS; y < template.height; y++) {
				for (let x = 0; x < 23; x++) {
					const c = placeholder(n, x, y)
					if (!c) continue
					const i =
						((y + sheet.dy) * png.width + n * sheet.frameWidth + x + sheet.dx) *
						4
					if (y + sheet.dy >= png.height || png.data[i + 3] < 30) continue
					const rgb: Rgb = [png.data[i], png.data[i + 1], png.data[i + 2]]
					const tally = votes.get(c) ?? new Map()
					const entry = tally.get(key(rgb)) ?? { rgb, n: 0 }
					entry.n++
					tally.set(key(rgb), entry)
					votes.set(c, tally)
				}
			}
		}
		for (const [c, tally] of votes) {
			const [most] = [...tally.values()].sort((a, b) => b.n - a.n)
			palette.set(c, most.rgb)
		}
	}

	const out = withInbetweens(png, sheet.frameWidth, (frame, legs, old) => {
		const hips = HIPS + sheet.dy
		// Clear their legs, keeping whatever's out in front of them that never
		// moves (August's pram).
		for (let y = hips; y < frame.height; y++) {
			for (let x = 0; x < frame.width; x++) {
				const here = old(0, x, y)
				const still =
					x < sheet.dx + 2 &&
					here &&
					[1, 2, 3].every((n) => {
						const there = old(n, x, y)
						return there && key(there) === key(here)
					})
				if (!still) set(frame, x, y, null)
			}
		}
		const rows = grid(LEGS[legs])
		rows.forEach((row, r) => {
			for (let x = 0; x < row.length; x++) {
				const rgb = palette.get(row[x])
				if (!rgb) continue
				set(frame, x + sheet.dx, hips + r, rgb)
				// The template's shoes are a row deeper than a member's.
				if (sheet.template && r === rows.length - 1)
					set(frame, x + sheet.dx, hips + r + 1, rgb)
			}
		})
	})
	write(out, sheet.folder)
}

function makeLyra() {
	const png = strip('lyra')
	if (png.width !== 23 * OLD_FRAMES) {
		console.log('- lyra: already done')
		return
	}
	const out = withInbetweens(png, 23, (frame, legs) => {
		for (let y = LYRA_TOP; y < frame.height; y++)
			for (let x = 0; x < frame.width; x++) set(frame, x, y, null)
		grid(LYRA_LEGS[legs]).forEach((row, r) => {
			for (let x = 0; x < row.length; x++) {
				const rgb = LYRA_COLOURS[row[x]]
				if (rgb) set(frame, x, LYRA_TOP + r, rgb)
			}
		})
	})
	write(out, 'lyra')
}

for (const sheet of SHEETS) makeSheet(sheet)
makeLyra()
