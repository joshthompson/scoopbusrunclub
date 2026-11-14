/**
 * Draw every runner the volunteer poses they're missing: stood at a post
 * (scanner, marshal, photographer, run director, number checker), walking at
 * the back as tail walker, and sat down in their tail walker's vest. Any pose
 * a runner already has is left alone, so the hand-drawn ones stay as they are
 * and running this again only fills in what's still missing.
 *
 * Stood at a post, they face out of the screen, their right arm (on the
 * right as we look at them) doing the job. The poses are built in pieces:
 *
 * - The body. For anyone with a post of their own already, it's that: the
 *   arm and whatever it's holding cleared away (`STOOD`). For anyone without,
 *   it's `STOOD_BODY`, a body stood still in a hi-vis vest, in their running
 *   kit's colours, with their running head turned round to face the same way.
 * - The job (`POSTS`): the arm and what's in its hand, drawn from the
 *   shoulder (or, for the camera, the eye), in their arm's colours.
 *
 * The tail walker walks the way they run, so it's their running head on
 * `TAIL_WALK`, a walk in an orange vest in their colours. Sat down, it's
 * their sit sprite with the vest put on (`vest`).
 *
 * A runner's colours (`palette`) are what their run strip has most of where
 * the custom runner template has each placeholder colour, as in
 * `gen-run-inbetweens.ts`.
 *
 * The custom runner template (`custom/`) gets the same poses in placeholder
 * colours, with the head left off, for `createRunnerFrames` to colour in and
 * put a head on. Those are drawn afresh every time.
 *
 * Link, a dog, lies at his post as in his scanner pose, with each job's prop
 * beside him (`LINK_POSTS`). Halloween's skeletons get theirs too, though they
 * only come out when everyone's running (`SKELETON_STOOD`).
 *
 * Usage: npx tsx apps/web/scripts/gen-volunteer-poses.ts [outDir]
 * Output is committed art, so this isn't wired into dev/build. Afterwards,
 * regenerate the custom runner pixel data (`pnpm gen:custom-runner`).
 */

import fs from 'node:fs'
import path from 'node:path'
import { PNG } from 'pngjs'

const RUNNERS_DIR = path.resolve(import.meta.dirname, '../src/assets/runners')
/** Write somewhere else instead, to look at before adding to the art. */
const OUT_DIR = process.argv[2] ? path.resolve(process.argv[2]) : RUNNERS_DIR

type Rgb = [number, number, number]
type Rect = [x0: number, y0: number, x1: number, y1: number]

const hex = (s: string): Rgb => [
	Number.parseInt(s.slice(1, 3), 16),
	Number.parseInt(s.slice(3, 5), 16),
	Number.parseInt(s.slice(5, 7), 16),
]
const key = ([r, g, b]: Rgb) => `${r},${g},${b}`
const grid = (art: string) => art.replace(/^\n|\n\s*$/g, '').split('\n')

/** What each job's sprite is called. */
const FILES = {
	scanner: 'scanner.png',
	marshal: 'marshal.png',
	photographer: 'photographer.png',
	runDirector: 'run-director.png',
	numberChecker: 'number-checker.png',
} as const
type Post = keyof typeof FILES

/**
 * Colours that are the same on everyone: vests and what they're holding.
 * `createRunnerFrames` keeps these as they are on the custom runner template.
 */
const FIXED: Record<string, Rgb> = {
	v: hex('#f0e928'), // hi-vis vest
	s: hex('#b6b6b6'), // its reflective stripes
	o: hex('#ff791e'), // the tail walker's orange vest
	O: hex('#afadb1'), // its stripes, and the run director's
	B: hex('#0b51c2'), // the run director's blue vest, and their clipboard
	W: hex('#e4e3e3'), // paper
	P: hex('#000000'), // phone, camera, the arrow on the sign
	L: hex('#424242'), // camera lens
	Y: hex('#fdfe64'), // the marshal's sign
	G: hex('#aeaeae'), // its pole
	T: hex('#242424'), // the number checker's tablet
}

/** The custom runner template's placeholder colours (see `createRunnerFrames`). */
const PLACEHOLDERS: Record<string, Rgb> = {
	t: hex('#0000ff'), // top
	a: hex('#0000cc'), // upper arm
	b: hex('#000099'), // lower arm
	c: hex('#000066'), // hand
	f: hex('#00ff00'), // shorts
	i: hex('#00cc00'), // the rest of the thigh
	j: hex('#009900'), // knee and shin
	k: hex('#006600'), // sock
	g: hex('#003300'), // shoe
}
const NECK: Rgb = [255, 0, 0]

/**
 * Stood at a post, facing out of the screen: the template's run frames
 * start at a club member's row 7 (the neck), so this does too, as a club
 * member's row 8 down. The right arm is left off: each job draws it, from
 * `SHOULDER`. Vest open down the middle, the top showing.
 */
const STOOD_BODY = `
.........vvttvv........
........avvttvv........
........assttss........
........avvttvv........
........bvvvtvv........
........bvvvtvv........
........bvvvtvv........
........bvvvtvv........
........cvvffvv........
........c.ffff.........
..........fffff........
..........ii.ii........
..........ii.ii........
..........ii.ii........
.........jjj.jj........
.........jjj.jj........
.........jj..jj........
.........kk..kk........
.........kk..kk........
.........gg..gg........
.........gggggggg......
`
const STOOD_BODY_TOP = 8
/** Where the right arm hangs from on `STOOD_BODY`, and its face's eye. */
const SHOULDER = { x: 15, y: 9 }
const EYE = { x: 12, y: 5 }

/**
 * Each job: what the right arm does, drawn from the shoulder (`at` is where
 * the shoulder is in the art), in the runner's arm colours (a upper, b lower,
 * c hand) and the fixed ones. `pole` runs a marshal's sign down to the ground.
 */
const POSTS: Record<
	Exclude<Post, 'photographer'>,
	{ art: string; at: { x: number; y: number }; pole?: number }
> = {
	// Phone up, to scan a barcode.
	scanner: {
		art: `
..PP
..PP
a.PP
a.c.
a.b.
bb..
`,
		at: { x: 0, y: 2 },
	},
	// Holding up the sign that points the way.
	marshal: {
		art: `
YYYYYYY
YYPYYYY
YPPPPPY
YYPYYYY
YYYYYYY
a..G
a..G
ab.c
.bbG
`,
		at: { x: 0, y: 5 },
		pole: 3,
	},
	// Clipboard up.
	runDirector: {
		art: `
....W
.BBWW
WBBWW
WBBWW
.Bc.W
..b..
a.b..
a.a..
aaa..
`,
		at: { x: 0, y: 6 },
	},
	// Tablet held out in front, to check finish tokens against barcodes.
	numberChecker: {
		art: `
..TTT
a.TTT
a.TTc
a.TTT
a.b..
.b...
`,
		at: { x: 0, y: 1 },
	},
}

/**
 * The photographer has a camera up at their eye, held from the right: the
 * camera over the front of their face, the hand beside it, the forearm down
 * to the elbow and the upper arm back in to the shoulder.
 */
function photographer(
	put: (x: number, y: number, c: string) => void,
	shoulder: { x: number; y: number },
	eye: { x: number; y: number },
) {
	for (let x = eye.x + 1; x <= eye.x + 2; x++) put(x, eye.y - 1, 'P')
	for (let y = eye.y; y <= eye.y + 1; y++)
		for (let x = eye.x; x <= eye.x + 3; x++) put(x, y, 'P')
	put(eye.x + 3, eye.y, 'L')
	const elbow = eye.x + 4
	put(elbow, eye.y, 'c')
	for (let y = eye.y + 1; y < shoulder.y; y++) put(elbow, y, 'b')
	put(elbow, shoulder.y, 'a')
	put(shoulder.x, shoulder.y, 'a')
	put(shoulder.x, shoulder.y + 1, 'a')
}

/**
 * The tail walker's walk, from Josh's: a club member's rows 8 to 28 (the
 * template's 1 to 21), in an orange vest. One arm shows, swinging a little.
 */
const TAIL_WALK = [
	`
........otoso..........
.......ootosoo.........
.......OOtOOao.........
.......ootooao.........
.......ootoobo.........
.......ootoobo.........
.......ootoobo.........
.......ootoboo.........
.......offfcf..........
........ffcff..........
........ffffff.........
.......iiiiiii.........
.......iii.iii.........
.......jjj..jj.........
.......jj...jj.........
.......jj...jj.........
.......jj....jj........
.......kk....kk........
.......kk.....kkg......
......ggg......gg......
.....gggg.....ggg......
`,
	`
........otoso..........
.......ootosoo.........
.......OOtOOao.........
.......ootooao.........
.......ootoobo.........
.......ootoboo.........
.......ootoboo.........
.......ootbooo.........
.......offcoo..........
........fcfff..........
........fffff..........
........iiiiii.........
........iiiiii.........
........jjiij..........
........jj.jj..........
........jj.jj..........
........jj.jj..........
........kk.kkk.........
........kk..kkg........
.......ggg..ggg........
......gggg.gggg........
`,
	`
........otoso..........
.......ootosoo.........
.......OOtOOao.........
.......ootooao.........
.......ootoobo.........
.......ootoobo.........
.......ootoobo.........
.......ootoboo.........
.......offfcf..........
........ffcff..........
........fffff..........
.........iii...........
.........iii...........
.........iii...........
.........jjj...........
........jjjj...........
........jjjj...........
........kkkkk..........
.........kkgkg.........
.........ggggg.........
........gggggg.........
`,
	`
........otoso..........
.......ootosoo.........
.......OOtOOao.........
.......ootooao.........
.......ootoobo.........
.......ootoobo.........
.......ootoobo.........
.......ootoboo.........
.......offfc...........
........ffcf...........
........fffff..........
.......iiiiii..........
.......iii.ii..........
.......iii.jj..........
........jj.jj..........
........jj.jj..........
........jj.jj..........
........kk.kkk.........
........kk..kkg........
.......ggg..ggg........
......gggg.gggg........
`,
]
const TAIL_WALK_FRAMES = 4
/** Where the template's run frames have their neck point, which the tail walk keeps. */
const TEMPLATE_NECK = { x: 10, y: 1 }

interface Runner {
	folder: string
	/** Their run strip's frame width, and where the template's frame sits in it. */
	frameWidth: number
	dx: number
	dy: number
	/** Their post, if they've one, with where its shoulder and eye are and what to clear away. */
	stood?: {
		from: Post
		shoulder: { x: number; y: number }
		eye: { x: number; y: number }
		/** Their arm and what's in its hand, and the sign if it's a marshal's. */
		clear: Rect[]
	}
	/** For a face turned round from their running one, where the eye ends up. */
	eye?: { x: number; y: number }
	/** Their arms' colours, if the template can't tell them. */
	arms?: Partial<Record<'a' | 'b' | 'c', Rgb>>
	/** No hi-vis: August volunteers in what he runs in. */
	noVest?: boolean
	/** A pram out in front: the tail walk keeps their own top half, arms on the handle. */
	pram?: boolean
}

const RUN_FRAMES = 6
const ADULT = { frameWidth: 23, dx: 0, dy: 8 }
const RUNNERS: Runner[] = [
	{
		folder: 'josh',
		...ADULT,
		stood: {
			from: 'scanner',
			shoulder: { x: 15, y: 9 },
			eye: { x: 12, y: 5 },
			clear: [
				[16, 0, 22, 28],
				[15, 3, 15, 16],
			],
		},
	},
	{
		folder: 'alisa',
		...ADULT,
		stood: {
			from: 'scanner',
			shoulder: { x: 15, y: 9 },
			eye: { x: 12, y: 5 },
			clear: [
				[15, 0, 22, 16],
				[17, 17, 22, 28],
			],
		},
	},
	{
		folder: 'claire',
		...ADULT,
		stood: {
			from: 'scanner',
			shoulder: { x: 15, y: 9 },
			eye: { x: 12, y: 6 },
			clear: [
				[15, 0, 22, 16],
				[18, 17, 22, 28],
			],
		},
	},
	{
		folder: 'eline',
		...ADULT,
		// She runs in an orange top, and stands at her post in a navy jacket.
		arms: { a: hex('#171e4b'), b: hex('#171e4b'), c: hex('#eeb388') },
		stood: {
			from: 'scanner',
			shoulder: { x: 15, y: 9 },
			eye: { x: 12, y: 5 },
			clear: [
				[15, 0, 22, 16],
				[18, 17, 22, 28],
			],
		},
	},
	{
		folder: 'other-josh',
		...ADULT,
		stood: {
			from: 'scanner',
			shoulder: { x: 15, y: 9 },
			eye: { x: 12, y: 5 },
			clear: [
				[15, 0, 22, 16],
				[17, 17, 22, 28],
			],
		},
	},
	{
		folder: 'rick',
		...ADULT,
		stood: {
			from: 'scanner',
			shoulder: { x: 15, y: 9 },
			eye: { x: 12, y: 6 },
			clear: [
				[15, 0, 22, 16],
				[17, 17, 22, 28],
			],
		},
	},
	{
		folder: 'adam',
		...ADULT,
		dy: 10,
		stood: {
			from: 'runDirector',
			shoulder: { x: 15, y: 9 },
			eye: { x: 12, y: 6 },
			clear: [
				[15, 0, 22, 16],
				[18, 17, 22, 28],
			],
		},
	},
	{
		folder: 'anna',
		...ADULT,
		stood: {
			from: 'marshal',
			shoulder: { x: 16, y: 9 },
			eye: { x: 13, y: 6 },
			clear: [
				[17, 0, 22, 2],
				[16, 3, 22, 20],
				[18, 21, 22, 28],
			],
		},
	},
	{
		folder: 'august',
		frameWidth: 50,
		dx: 24,
		dy: 9,
		noVest: true,
		pram: true,
		stood: {
			from: 'scanner',
			shoulder: { x: 39, y: 10 },
			eye: { x: 37, y: 5 },
			clear: [
				[40, 0, 49, 10],
				[39, 11, 49, 16],
			],
		},
	},
	{
		folder: 'lyra',
		...ADULT,
		// A dress over long sleeves: not the template's.
		arms: { a: hex('#915fae'), b: hex('#915fae'), c: hex('#e8a475') },
		stood: {
			from: 'marshal',
			shoulder: { x: 16, y: 18 },
			eye: { x: 13, y: 14 },
			clear: [
				[15, 0, 22, 10],
				[16, 11, 22, 28],
			],
		},
	},
	// No post of their own yet.
	{ folder: 'keith', ...ADULT, eye: { x: 13, y: 4 } },
	{ folder: 'mikael', ...ADULT, eye: { x: 11, y: 6 } },
	{ folder: 'sophie', ...ADULT, eye: { x: 11, y: 5 } },
]

// --- pixels --------------------------------------------------------------

function read(folder: string, file: string) {
	const p = path.join(RUNNERS_DIR, folder, file)
	return fs.existsSync(p) ? PNG.sync.read(fs.readFileSync(p)) : undefined
}

function has(folder: string, file: string) {
	return fs.existsSync(path.join(RUNNERS_DIR, folder, file))
}

function write(png: PNG, folder: string, file: string) {
	const dir = path.join(OUT_DIR, folder)
	fs.mkdirSync(dir, { recursive: true })
	fs.writeFileSync(path.join(dir, file), PNG.sync.write(png))
	console.log(`✓ ${folder}/${file}`)
}

function get(png: PNG, x: number, y: number): Rgb | null {
	if (x < 0 || y < 0 || x >= png.width || y >= png.height) return null
	const i = (y * png.width + x) * 4
	return png.data[i + 3] < 30
		? null
		: [png.data[i], png.data[i + 1], png.data[i + 2]]
}

function set(png: PNG, x: number, y: number, rgb: Rgb | null) {
	if (x < 0 || y < 0 || x >= png.width || y >= png.height) return
	const i = (y * png.width + x) * 4
	if (!rgb) {
		png.data.fill(0, i, i + 4)
		return
	}
	png.data[i] = rgb[0]
	png.data[i + 1] = rgb[1]
	png.data[i + 2] = rgb[2]
	png.data[i + 3] = 255
}

function blank(width: number, height: number) {
	const png = new PNG({ width, height })
	png.data.fill(0)
	return png
}

function copy(png: PNG) {
	const out = blank(png.width, png.height)
	png.data.copy(out.data)
	return out
}

/** Paint `art` onto `png` with its top left at (x, y), each letter in `colours`. */
function paint(
	png: PNG,
	art: string,
	x0: number,
	y0: number,
	colours: Record<string, Rgb>,
) {
	grid(art).forEach((row, y) => {
		for (let x = 0; x < row.length; x++) {
			const rgb = colours[row[x]]
			if (rgb) set(png, x0 + x, y0 + y, rgb)
		}
	})
}

// --- colours -------------------------------------------------------------

const template = read('custom', 'run.png') as PNG
const templateWidth = template.width / RUN_FRAMES

/** What a runner's run strip has most of where the template has each placeholder. */
function palette(runner: Runner) {
	const png = read(runner.folder, 'run.png') as PNG
	const placeholderAt = new Map(
		Object.entries(PLACEHOLDERS).map(([c, rgb]) => [key(rgb), c]),
	)
	const votes = new Map<string, Map<string, { rgb: Rgb; n: number }>>()
	for (let n = 0; n < RUN_FRAMES; n++) {
		for (let y = 0; y < template.height; y++) {
			for (let x = 0; x < templateWidth; x++) {
				const t = get(template, n * templateWidth + x, y)
				const c = t && placeholderAt.get(key(t))
				if (!c) continue
				// Their legs are where `dx` and `dy` put the template's (see
				// `gen-run-inbetweens`), the rest of them a row higher.
				const legs = 'fijkg'.includes(c)
				const rgb = get(
					png,
					n * runner.frameWidth + x + runner.dx,
					y + runner.dy - (legs ? 0 : 1),
				)
				if (!rgb) continue
				const tally = votes.get(c) ?? new Map()
				const entry = tally.get(key(rgb)) ?? { rgb, n: 0 }
				entry.n++
				tally.set(key(rgb), entry)
				votes.set(c, tally)
			}
		}
	}
	const colours: Record<string, Rgb> = { ...FIXED }
	const tops: Rgb[] = []
	for (const [c, tally] of votes) {
		const counts = [...tally.values()].sort((a, b) => b.n - a.n)
		colours[c] = counts[0].rgb
		// A top shaded in a few colours: each one that's a good part of it.
		if (c === 't') {
			const total = counts.reduce((sum, { n }) => sum + n, 0)
			for (const { rgb, n } of counts) if (n >= total * 0.05) tops.push(rgb)
		}
	}
	// Not where it meets their shorts, or their neck.
	const others = [colours.f, colours.c].filter(Boolean)
	const top = tops.filter(
		(rgb, n) => n === 0 || !others.some((other) => key(other) === key(rgb)),
	)
	if (process.env.DEBUG) console.log(runner.folder, top.map(key).join(' | '))
	return { colours: { ...colours, ...runner.arms }, tops: top }
}

/** Close enough to be the same, for a top shaded in a few colours. */
const near = (a: Rgb, b: Rgb) =>
	Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 24

const yellowish = ([r, g, b]: Rgb) => r > 200 && g > 190 && b < 140

/** A vest's colours swapped for another's, over the body below the shoulder. */
function recolourVest(
	png: PNG,
	shoulder: { x: number; y: number },
	swap: (rgb: Rgb) => Rgb | undefined,
) {
	for (let y = shoulder.y - 2; y <= shoulder.y + 9; y++) {
		for (let x = shoulder.x - 8; x < shoulder.x; x++) {
			const rgb = get(png, x, y)
			const to = rgb && swap(rgb)
			if (to) set(png, x, y, to)
		}
	}
}

/**
 * The tail walker's vest put on over a top: on every row of `isTop` pixels
 * (in `rows`), open down the middle with the top showing, a stripe either
 * side, orange out to the edges.
 */
function vest(
	png: PNG,
	rows: [number, number],
	cols: [number, number],
	isTop: (rgb: Rgb) => boolean,
	stripe: Rgb = FIXED.O,
	body: Rgb = FIXED.o,
) {
	for (let y = rows[0]; y <= rows[1]; y++) {
		let x = cols[0]
		while (x <= cols[1]) {
			const here = get(png, x, y)
			if (!here || !isTop(here)) {
				x++
				continue
			}
			let end = x
			while (end + 1 <= cols[1]) {
				const next = get(png, end + 1, y)
				if (!next || !isTop(next)) break
				end++
			}
			const width = end - x + 1
			const left = x + Math.floor((width - 1) / 2)
			const right = x + Math.ceil((width - 1) / 2)
			for (let col = x; col <= end; col++) {
				if (width < 3) set(png, col, y, body)
				else if (col >= left && col <= right) continue
				else if (col === left - 1 || col === right + 1) set(png, col, y, stripe)
				else set(png, col, y, body)
			}
			x = end + 1
		}
	}
}

// --- stood at a post -----------------------------------------------------

/** Their head from their first run frame, turned round to face out to the right. */
function turnedHead(runner: Runner, into: PNG) {
	const run = read(runner.folder, 'run.png') as PNG
	for (let y = 0; y < runner.dy; y++) {
		for (let x = 5; x <= 15; x++) {
			const rgb = get(run, x, y)
			if (rgb) set(into, 21 - x, y, rgb)
		}
	}
}

function stoodBody(runner: Runner, colours: Record<string, Rgb>) {
	const png = blank(23, runner.dy + 21)
	turnedHead(runner, png)
	paint(png, STOOD_BODY, 0, STOOD_BODY_TOP + runner.dy - 8, colours)
	return png
}

/** Their body with their arm and what it was holding cleared away, in a yellow vest. */
function stoodFromPost(
	runner: Runner & { stood: NonNullable<Runner['stood']> },
) {
	const png = copy(read(runner.folder, FILES[runner.stood.from]) as PNG)
	for (const [x0, y0, x1, y1] of runner.stood.clear)
		for (let y = y0; y <= y1; y++)
			for (let x = x0; x <= x1; x++) set(png, x, y, null)
	if (runner.stood.from === 'runDirector')
		recolourVest(png, runner.stood.shoulder, (rgb) =>
			key(rgb) === key(FIXED.B) ? FIXED.v : undefined,
		)
	return png
}

/** Someone stood at `post`: `base`, their body, with the job drawn on. */
function drawPost(
	post: Post,
	base: PNG,
	colours: Record<string, Rgb>,
	shoulder: { x: number; y: number },
	eye: { x: number; y: number },
	vestless = false,
) {
	const png = copy(base)
	const put = (x: number, y: number, c: string) => set(png, x, y, colours[c])
	if (post === 'photographer') photographer(put, shoulder, eye)
	else {
		const { art, at, pole } = POSTS[post]
		const x0 = shoulder.x - at.x
		const y0 = shoulder.y - at.y
		if (pole !== undefined)
			for (let y = y0; y < png.height; y++) put(x0 + pole, y, 'G')
		paint(png, art, x0, y0, colours)
	}
	if (post === 'runDirector' && !vestless)
		recolourVest(png, shoulder, (rgb) => {
			if (key(rgb) === key(colours.v) || yellowish(rgb)) return FIXED.B
			if (key(rgb) === key(colours.s)) return FIXED.O
		})
	return png
}

// --- tail walker ---------------------------------------------------------

function tailWalk(
	runner: Runner,
	colours: Record<string, Rgb>,
	isTop: (rgb: Rgb) => boolean,
) {
	const run = read(runner.folder, 'run.png') as PNG
	// The walk's on the ground, as their run is: its top row is this far down.
	const top = run.height - grid(TAIL_WALK[0]).length
	const hips = top + 8
	const out = blank(runner.frameWidth * TAIL_WALK_FRAMES, run.height)
	TAIL_WALK.forEach((art, n) => {
		const frame = blank(runner.frameWidth, run.height)
		if (runner.pram) {
			// Their own first run frame, pram and all, their top in the vest;
			// the walk's legs under it.
			PNG.bitblt(run, frame, 0, 0, runner.frameWidth, run.height, 0, 0)
			for (let y = hips; y < run.height; y++)
				for (let x = runner.dx + 1; x < runner.frameWidth; x++)
					set(frame, x, y, null)
			vest(frame, [hips - 9, hips - 1], [runner.dx + 5, runner.dx + 15], isTop)
			const legs = grid(art).slice(8).join('\n')
			paint(frame, legs, runner.dx, hips, colours)
		} else {
			for (let y = 0; y < top; y++)
				for (let x = runner.dx + 5; x <= runner.dx + 15; x++)
					set(frame, x, y, get(run, x, y))
			paint(frame, art, runner.dx, top, colours)
		}
		PNG.bitblt(
			frame,
			out,
			0,
			0,
			runner.frameWidth,
			run.height,
			n * runner.frameWidth,
			0,
		)
	})
	write(out, runner.folder, 'tail-walk.png')
}

/** Their sit sprite in the vest, over the top where the template's is. */
function tailSit(runner: Runner, isTop: (rgb: Rgb) => boolean) {
	const sit = copy(read(runner.folder, 'sit.png') as PNG)
	const dy = sit.height - 28
	vest(sit, [16 + dy, 23 + dy], [runner.dx + 7, runner.dx + 16], isTop)
	write(sit, runner.folder, 'tail-sit.png')
}

// --- the custom runner template -------------------------------------------

/**
 * The template's poses, in its placeholder colours with the neck point on, and
 * no head: `createRunnerFrames` puts one on. Stood at a post they face out to
 * the right, so it turns the head round for those.
 */
function makeTemplate() {
	const colours = { ...FIXED, ...PLACEHOLDERS }
	const custom = { folder: 'custom', ...ADULT }
	const base = blank(23, 29)
	paint(base, STOOD_BODY, 0, STOOD_BODY_TOP, colours)
	set(base, 11, STOOD_BODY_TOP, NECK)
	// The head the template's given faces left: turned round, its eye ends up here.
	const eye = { x: 11, y: 5 }
	for (const post of Object.keys(FILES) as Post[])
		write(drawPost(post, base, colours, SHOULDER, eye), 'custom', FILES[post])

	// The run template's rows: a member's from 7 down.
	const walk = blank(23 * TAIL_WALK_FRAMES, template.height)
	TAIL_WALK.forEach((art, n) => {
		paint(walk, art, n * 23, TEMPLATE_NECK.y, colours)
		set(walk, n * 23 + TEMPLATE_NECK.x, TEMPLATE_NECK.y, NECK)
	})
	write(walk, 'custom', 'tail-walk.png')

	const sit = copy(read('custom', 'sit.png') as PNG)
	vest(sit, [16, 23], [7, 16], (rgb) => key(rgb) === key(PLACEHOLDERS.t))
	write(sit, 'custom', 'tail-sit.png')
}

// --- Link ----------------------------------------------------------------

/**
 * Link lies down at his post in a vest, as in his scanner pose, with what he's
 * working with beside him or up in front of his face. Drawn wider than his
 * scanner pose, to fit it in on the right.
 */
const LINK_WIDTH = 24
const LINK_POSTS: Record<
	Exclude<Post, 'scanner'>,
	{ art: string; x: number; y: number; pole?: number }
> = {
	marshal: {
		art: `
YYYYYYY
YYPYYYY
YPPPPPY
YYPYYYY
YYYYYYY
`,
		x: 16,
		y: 11,
		pole: 3,
	},
	photographer: {
		art: `
.PPP.
PPLPP
PPLPP
`,
		x: 13,
		y: 19,
	},
	runDirector: {
		art: `
....W
.BBWW
WBBWW
WBBWW
.B..W
`,
		x: 19,
		y: 21,
	},
	numberChecker: {
		art: `
TTT
TTT
TTT
TTT
`,
		x: 19,
		y: 23,
	},
}

function makeLink() {
	const scanner = read('link', FILES.scanner) as PNG
	for (const [post, { art, x, y, pole }] of Object.entries(LINK_POSTS)) {
		const file = FILES[post as Post]
		if (has('link', file)) continue
		const png = blank(LINK_WIDTH, scanner.height)
		PNG.bitblt(scanner, png, 0, 0, scanner.width, scanner.height, 0, 0)
		// The run director's vest is blue.
		if (post === 'runDirector')
			for (let py = 0; py < png.height; py++)
				for (let px = 0; px < scanner.width; px++) {
					const rgb = get(png, px, py)
					if (rgb && yellowish(rgb)) set(png, px, py, FIXED.B)
					else if (rgb && key(rgb) === key(FIXED.s)) set(png, px, py, FIXED.O)
				}
		if (pole !== undefined)
			for (let py = y + 5; py < png.height; py++)
				set(png, x + pole, py, FIXED.G)
		paint(png, art, x, y, FIXED)
		write(png, 'link', file)
	}
}

// --- Halloween's skeletons -----------------------------------------------

const HALLOWEEN = '../halloween'

/**
 * A skeleton stood at a post, facing out of the screen, its skull turned round
 * from its run's. In a vest like everyone's, open down the front over its spine.
 */
const SKELETON_STOOD = `
...........AA..........
..........AAAA.........
..........APAP.........
..........AAAA.........
..........AAPA.........
...........AA..........
...........A...........
...........A...........
.........vvAvvv........
........avvAvvv........
........assAsss........
........avvAvvv........
........bvvAvvv........
........bvvAvvv........
........bvvAvvv........
........b.vAvv.........
........c.AAAA.........
........c.A..A.........
..........A..A.........
..........A..A.........
..........A..A.........
..........A..A.........
..........A..A.........
..........A..A.........
..........A..A.........
..........A..A.........
..........A..A.........
..........A..A.........
.........AA..AA........
`

function makeSkeleton() {
	const bone: Rgb = [255, 255, 255]
	const colours = { ...FIXED, A: bone, a: bone, b: bone, c: bone }
	const file = (name: string) => `skeleton-${name}`
	const missing = (name: string) => !has(HALLOWEEN, file(name))
	const run = read(HALLOWEEN, file('run.png')) as PNG

	if (missing('face.png')) {
		// Its skull, from its run.
		const face = blank(4, 6)
		PNG.bitblt(run, face, 8, 0, 4, 6, 0, 0)
		write(face, HALLOWEEN, file('face.png'))
	}

	const base = blank(23, 29)
	paint(base, SKELETON_STOOD, 0, 0, colours)
	for (const post of Object.keys(FILES) as Post[]) {
		if (!missing(FILES[post])) continue
		write(
			drawPost(post, base, colours, SHOULDER, { x: 11, y: 2 }),
			HALLOWEEN,
			file(FILES[post]),
		)
	}

	// Its run, at a walk, in the orange vest over its ribs, open over the spine.
	if (missing('tail-walk.png')) {
		const walk = copy(run)
		for (let n = 0; n < TAIL_WALK_FRAMES; n++)
			for (let y = 9; y <= 14; y++)
				for (let x = 8; x <= 13; x++)
					if (x !== 10) set(walk, n * 23 + x, y, y === 10 ? FIXED.O : FIXED.o)
		write(walk, HALLOWEEN, file('tail-walk.png'))
	}

	// Sat down, the vest over its ribs, leaning back as it is.
	if (missing('tail-sit.png')) {
		const sit = copy(read(HALLOWEEN, file('sit.png')) as PNG)
		const ribs: [number, number, number][] = [
			[18, 11, 14],
			[19, 11, 14],
			[20, 11, 15],
			[21, 12, 15],
		]
		for (const [y, x0, x1] of ribs)
			for (let x = x0; x <= x1; x++)
				set(sit, x, y, y === 19 ? FIXED.O : FIXED.o)
		write(sit, HALLOWEEN, file('tail-sit.png'))
	}
}

// --- everyone ------------------------------------------------------------

for (const runner of RUNNERS) {
	const { colours, tops } = palette(runner)
	const isTop = (rgb: Rgb) => tops.some((top) => near(rgb, top))
	const missing = (Object.keys(FILES) as Post[]).filter(
		(post) => !has(runner.folder, FILES[post]),
	)
	if (missing.length) {
		const { stood } = runner
		const base = stood
			? stoodFromPost({ ...runner, stood })
			: stoodBody(runner, colours)
		const shoulder = stood?.shoulder ?? {
			x: SHOULDER.x,
			y: SHOULDER.y + runner.dy - 8,
		}
		const eye = stood?.eye ?? runner.eye ?? EYE
		for (const post of missing)
			write(
				drawPost(post, base, colours, shoulder, eye, runner.noVest),
				runner.folder,
				FILES[post],
			)
	}
	if (!has(runner.folder, 'tail-walk.png')) tailWalk(runner, colours, isTop)
	if (!has(runner.folder, 'tail-sit.png')) tailSit(runner, isTop)
}
makeTemplate()
makeLink()
makeSkeleton()
