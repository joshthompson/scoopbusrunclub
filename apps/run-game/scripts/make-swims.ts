/**
 * Makes everyone's swim poses from their run strips, and their dive poses
 * from their stand poses, for diving in and swimming under the
 * sea off Dino Island (see `src/game/swim.ts`): two frames each, a stroke
 * and a kick, their run's two widest strides turned over to lie along,
 * head first, face down, as a front crawl, facing left as the run strips
 * do. The members' go in `src/assets/swim/<member>-1.png` and `-2.png`; the
 * bonus runners', in `src/assets/runners/<who>/swim-1.png` and `-2.png`.
 * To touch up by hand: one already there is left alone, unless `--force`
 * is given. Link, a dog, already lies along: he doggy-paddles, his run as
 * it is.
 *
 * Usage: pnpm --filter @scoopbus/run-game make-swims [--force] [who…]
 */
import {
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { PNG } from 'pngjs'

const assets = path.resolve(import.meta.dirname, '../src/assets')
const members = path.resolve(
	import.meta.dirname,
	'../../web/src/assets/runners',
)
const args = process.argv.slice(2)
const force = args.includes('--force')
const only = args.filter((a) => !a.startsWith('--'))

/** How many frames someone's run strip has, if not 6. */
const RUN_FRAMES: Record<string, number> = { 'det-munch': 8, link: 2 }
/** Who's not turned over: already on all fours. */
const LYING = new Set(['link'])

const camel = (kebab: string) =>
	kebab.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())

/** Everyone with a run strip: where it is, and where their swim frames go. */
const everyone = [
	...readdirSync(members)
		// Not the custom runners' template: theirs are made from their looks.
		.filter((who) => who !== 'custom')
		.filter((who) => existsSync(path.join(members, who, 'run.png')))
		.map((who) => ({
			who,
			run: path.join(members, who, 'run.png'),
			out: (n: number) => path.join(assets, 'swim', `${camel(who)}-${n}.png`),
		})),
	...readdirSync(path.join(assets, 'runners'))
		.filter((who) => existsSync(path.join(assets, 'runners', who, 'run.png')))
		.map((who) => ({
			who,
			run: path.join(assets, 'runners', who, 'run.png'),
			out: (n: number) => path.join(assets, 'runners', who, `swim-${n}.png`),
		})),
]

/** Frame `i` of a strip `count` frames long, turned a quarter round anticlockwise, unless it's `lying`. */
function frame(strip: PNG, count: number, i: number, lying: boolean) {
	const w = strip.width / count
	const h = strip.height
	const out = new PNG({ width: lying ? w : h, height: lying ? h : w })
	for (let y = 0; y < h; y++)
		for (let x = 0; x < w; x++) {
			const from = (y * strip.width + i * w + x) * 4
			// Anticlockwise: its top to the left, its front (its left) down.
			const [tx, ty] = lying ? [x, y] : [y, w - 1 - x]
			const to = (ty * out.width + tx) * 4
			for (let c = 0; c < 4; c++) out.data[to + c] = strip.data[from + c]
		}
	return out
}

mkdirSync(path.join(assets, 'swim'), { recursive: true })
for (const { who, run, out } of everyone) {
	if (only.length && !only.includes(who)) continue
	if (existsSync(out(1)) && !force) {
		console.log(`${who}: already has a swim, left as it is`)
		continue
	}
	const strip = PNG.sync.read(readFileSync(run))
	const count = RUN_FRAMES[who] ?? 6
	const lying = LYING.has(who)
	// Their widest stride, arms out, and the other one, half a run on.
	const frames = [0, Math.floor(count / 2)]
	frames.forEach((i, n) =>
		writeFileSync(out(n + 1), PNG.sync.write(frame(strip, count, i, lying))),
	)
	console.log(`${who}: ${path.relative(assets, out(1))}`)
}

// --- Diving: stood tall, arms straight up over the head -----------------------------

/** How much taller than their stand pose a dive is: their arms, up over their head. */
const REACH = 8

/**
 * A dive pose from a stand pose: the same, stood tall, their arms up
 * straight over their head, either side of it, meeting over it, hands
 * together, in their skin's colour, `REACH` rows taller. Facing left, as
 * the stand pose does; the game turns it over, head first, and on down.
 */
function dive(stand: PNG) {
	const { width, height } = stand
	const out = new PNG({ width, height: height + REACH })
	const at = (x: number, y: number) => (y * width + x) * 4
	const solid = (x: number, y: number) =>
		x >= 0 &&
		x < width &&
		y >= 0 &&
		y < height &&
		stand.data[at(x, y) + 3] > 128
	for (let y = 0; y < height; y++)
		for (let x = 0; x < width; x++) {
			const from = at(x, y)
			const to = ((y + REACH) * width + x) * 4
			for (let c = 0; c < 4; c++) out.data[to + c] = stand.data[from + c]
		}
	// Their head: its top row, and how wide it is a little way down.
	let top = 0
	while (top < height && ![...Array(width).keys()].some((x) => solid(x, top)))
		top++
	const row = top + 3
	const xs = [...Array(width).keys()].filter((x) => solid(x, row))
	const left = Math.min(...xs)
	const right = Math.max(...xs)
	// Their skin: of the colours on their head, the one there's most of
	// on the rest of them too, their hands and legs, not their hair.
	const key = (x: number, y: number) => {
		const i = at(x, y)
		return [0, 1, 2].map((c) => stand.data[i + c]).join(',')
	}
	const onHead = new Set<string>()
	for (let y = top + 2; y < top + 8; y++)
		for (let x = left; x <= right; x++) if (solid(x, y)) onHead.add(key(x, y))
	const counts = new Map<string, number>()
	for (let y = top + 10; y < height; y++)
		for (let x = 0; x < width; x++)
			if (solid(x, y) && onHead.has(key(x, y)))
				counts.set(key(x, y), (counts.get(key(x, y)) ?? 0) + 1)
	const skin = (
		[...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
		[...onHead][0] ??
		'242,192,154'
	)
		.split(',')
		.map(Number)
	const paint = (x: number, y: number) => {
		if (x < 0 || x >= width || y < 0 || y >= height + REACH) return
		const i = (y * width + x) * 4
		out.data[i] = skin[0]
		out.data[i + 1] = skin[1]
		out.data[i + 2] = skin[2]
		out.data[i + 3] = 255
	}
	// Up from their shoulders, either side of their head, two wide, and in
	// over it to meet, their hands together on top.
	const shoulders = top + REACH + 7
	const middle = Math.round((left + right) / 2)
	for (const [side, x0] of [
		[-1, left - 2],
		[1, right + 1],
	] as const) {
		for (let y = shoulders; y >= top + REACH; y--) {
			paint(x0, y)
			paint(x0 + 1, y)
		}
		for (let k = 0; k < REACH - 1; k++) {
			const y = top + REACH - 1 - k
			const x = Math.round(x0 + ((middle - 1 - x0) * (k + 1)) / REACH)
			paint(x, y)
			paint(x + 1, y)
			paint(x - side, y)
		}
	}
	for (const [dx, dy] of [
		[-1, 0],
		[0, 0],
		[1, 0],
		[-1, 1],
		[0, 1],
		[1, 1],
	])
		paint(middle + dx, top + dy)
	return out
}

/** Everyone with a stand pose: where it is, and where their dive goes. */
const standing = [
	...readdirSync(path.join(assets, 'stand'))
		.filter((file) => file.endsWith('.png'))
		.map((file) => ({
			who: file.replace(/\.png$/, ''),
			stand: path.join(assets, 'stand', file),
			out: path.join(assets, 'dive', file),
		})),
	...readdirSync(path.join(assets, 'runners'))
		.filter((who) => existsSync(path.join(assets, 'runners', who, 'stand.png')))
		.map((who) => ({
			who,
			stand: path.join(assets, 'runners', who, 'stand.png'),
			out: path.join(assets, 'runners', who, 'dive.png'),
		})),
]

mkdirSync(path.join(assets, 'dive'), { recursive: true })
for (const { who, stand, out } of standing) {
	if (only.length && !only.includes(who)) continue
	// Link's a dog: he belly-flops, as he swims.
	if (who === 'link') continue
	if (existsSync(out) && !force) {
		console.log(`${who}: already has a dive, left as it is`)
		continue
	}
	writeFileSync(out, PNG.sync.write(dive(PNG.sync.read(readFileSync(stand)))))
	console.log(`${who}: ${path.relative(assets, out)}`)
}
