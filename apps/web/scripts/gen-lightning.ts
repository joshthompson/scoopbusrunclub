/**
 * Generate the lightning sprite sheet used by the header's
 * `data-weather=thunderstorm` layer.
 *
 * One horizontal strip of same-sized frames, so the CSS can step between them
 * with nothing but `background-position` (see the `lightning` keyframes). Frame
 * 0 is empty — the strike is over in about half a second and the sheet sits on
 * that blank frame for the rest of the cycle.
 *
 * Two bolts, each in a different part of the frame, so consecutive strikes
 * don't land in the same place. Each bolt gets four frames, in the order a
 * strike actually happens: the dim leader feeling its way down, the full
 * return stroke, and two fading tails to flicker back through.
 *
 * Every pixel is fully on or fully off at one of a few fixed alphas, so nothing
 * here is antialiased — `image-rendering: pixelated` is document-wide and soft
 * edges would look wrong next to the sprites.
 *
 * Usage: npx tsx apps/web/scripts/gen-lightning.ts
 * Output is committed art, so this isn't wired into dev/build — run it by hand
 * when you want to reroll or retune the bolts.
 */

import fs from 'node:fs'
import path from 'node:path'
import { PNG } from 'pngjs'

const OUT_DIR = path.resolve(import.meta.dirname, '../src/assets/background')

/**
 * One frame's box. Wide enough to hold both bolts far enough apart to read as
 * different parts of the sky, and tall enough to reach from the top of the
 * header down past the treeline without touching the ground.
 */
const FRAME_W = 320
const FRAME_H = 150

/** Bolt A on the left of the frame, bolt B on the right. */
const BOLT_X = [66, 236]

/**
 * How far the trunk may stray from where it started, and how far a branch may
 * stray from the trunk. Both well inside the gap between the two bolts, so
 * neither can wander into the other's half of the frame.
 */
const TRUNK_CORRIDOR = 18
const BRANCH_CORRIDOR = 26

/** Frames per bolt, plus the shared empty frame at index 0. */
const STAGES = ['leader', 'full', 'mid', 'faint'] as const
type Stage = (typeof STAGES)[number]

const FRAME_COUNT = 1 + BOLT_X.length * STAGES.length

type RGBA = [number, number, number, number]

/** White core, with two cooler halos stepping down in brightness around it. */
const CORE: RGBA = [255, 255, 255, 255]
const GLOW_INNER: RGBA = [206, 230, 255, 205]
const GLOW_OUTER: RGBA = [143, 186, 252, 110]

/** How each stage is drawn: core width, how much halo, and overall brightness. */
interface StageStyle {
	/** Half-width of the core in px; the core is `2 * halfWidth + 1` wide. */
	halfWidth: number
	/** Halo rings drawn around the core, outermost first. */
	glow: RGBA[]
	/** Multiplier on every alpha, so a stage can fade without changing shape. */
	alpha: number
	/** Fraction of the bolt's length drawn, measured from the top. */
	reach: number
	/** Whether the side branches are drawn at all. */
	branches: boolean
}

const STAGE_STYLES: Record<Stage, StageStyle> = {
	// The leader is the faint channel groping downwards before the strike — thin,
	// dim, no halo, and it hasn't reached the ground yet.
	leader: { halfWidth: 0, glow: [], alpha: 0.45, reach: 0.72, branches: false },
	full: {
		halfWidth: 1,
		glow: [GLOW_OUTER, GLOW_INNER],
		alpha: 1,
		reach: 1,
		branches: true,
	},
	mid: {
		halfWidth: 1,
		glow: [GLOW_INNER],
		alpha: 0.8,
		reach: 1,
		branches: true,
	},
	faint: {
		halfWidth: 0,
		glow: [GLOW_OUTER],
		alpha: 0.4,
		reach: 1,
		branches: false,
	},
}

/**
 * Seeded so a rerun reproduces the committed sheet, and so retuning one bolt
 * doesn't reshuffle the other. Mulberry32.
 */
function rng(seed: number) {
	let a = seed
	return () => {
		a = (a + 0x6d2b79f5) | 0
		let t = Math.imul(a ^ (a >>> 15), 1 | a)
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

/** The x of the channel at each y, top to bottom — one entry per row. */
type Channel = number[]

/**
 * Walk a channel down the frame as a run of straight diagonal limbs, each
 * leaning the opposite way to the one before it.
 *
 * The alternation is what makes it read as lightning: a limb is a clean
 * diagonal, and every join between two limbs is a kink. Rerolling the direction
 * freely would let two limbs lean the same way and merge into one long slant,
 * or wander off sideways into a snake.
 *
 * `corridor` is how far the channel may stray from where it started before the
 * next limb is forced to lean back. Without it a run of same-signed rolls walks
 * the bolt clean out of its frame.
 */
function walk(
	random: () => number,
	startX: number,
	rows: number,
	corridor: number,
	bias = 0,
): Channel {
	const channel: Channel = []
	let x = startX
	let direction = random() < 0.5 ? 1 : -1
	let drift = 0
	let hold = 0

	for (let y = 0; y < rows; y++) {
		if (hold === 0) {
			const strayed = x - startX
			if (Math.abs(strayed) > corridor) {
				// Out of the corridor: the only way for the next limb to go is back.
				direction = strayed > 0 ? -1 : 1
			} else if (bias !== 0 && random() < 0.7) {
				// Branches lean away from the trunk rather than zigzagging around it.
				direction = bias
			} else {
				direction = -direction
			}
			// One or two pixels per row: shallower than that stops reading as a
			// diagonal at this scale, steeper looks more like a scribble.
			drift = direction * (1 + Math.floor(random() * 2))
			hold = 3 + Math.floor(random() * 7)
		}
		x += drift
		hold--
		channel.push(x)
	}

	return channel
}

/** Where a branch leaves the trunk, and the channel it follows from there. */
interface Branch {
	/** Row of the trunk the branch starts on. */
	startRow: number
	channel: Channel
}

interface Bolt {
	trunk: Channel
	branches: Branch[]
}

/**
 * A trunk from the top of the frame to the bottom, plus a couple of shorter
 * limbs peeling off it partway down.
 */
function buildBolt(seed: number, startX: number): Bolt {
	const random = rng(seed)
	const trunk = walk(random, startX, FRAME_H, TRUNK_CORRIDOR)

	const branches: Branch[] = []
	for (let i = 0; i < 2; i++) {
		// Spread over the middle of the trunk: a branch off the very top looks like
		// a second bolt, and one off the very bottom has no room to go anywhere.
		const startRow = Math.floor(FRAME_H * (0.28 + 0.3 * i + random() * 0.14))
		const rows = Math.floor(FRAME_H * (0.16 + random() * 0.14))
		// Away from the middle of the frame, so the two branches peel off opposite
		// sides of the trunk instead of both hugging it.
		const bias = i % 2 === 0 ? 1 : -1
		branches.push({
			startRow,
			channel: walk(random, trunk[startRow], rows, BRANCH_CORRIDOR, bias),
		})
	}

	return { trunk, branches }
}

function blend(
	png: PNG,
	frameX: number,
	x: number,
	y: number,
	[r, g, b, a]: RGBA,
) {
	// Clamped to the frame, not the sheet: a bolt that ran over the edge would
	// otherwise reappear in the neighbouring frame, which the CSS shows as a
	// stray fragment beside the bolt it was stepping to.
	if (x < 0 || x >= FRAME_W || y < 0 || y >= FRAME_H) return
	const i = (y * FRAME_W * FRAME_COUNT + frameX + x) * 4
	// The core is drawn over its own halo, so the brighter pixel simply wins —
	// no alpha compositing, which would leave part-transparent seams between the
	// rings and undo the hard pixel edges.
	if (png.data[i + 3] >= a) return
	png.data[i] = r
	png.data[i + 1] = g
	png.data[i + 2] = b
	png.data[i + 3] = a
}

/** Paint one row of a channel: a horizontal run centred on the channel's x. */
function paintRow(
	png: PNG,
	frameX: number,
	x: number,
	y: number,
	halfWidth: number,
	color: RGBA,
	alphaScale: number,
) {
	const scaled: RGBA = [
		color[0],
		color[1],
		color[2],
		Math.round(color[3] * alphaScale),
	]
	if (scaled[3] <= 0) return
	for (let dx = -halfWidth; dx <= halfWidth; dx++) {
		blend(png, frameX, x + dx, y, scaled)
	}
}

/**
 * Draw a channel with its halo rings, widest and dimmest ring first so the core
 * lands on top.
 *
 * The rings are drawn as wider runs of the same channel rather than a dilation
 * of the finished shape: it costs one pass each, and it keeps every edge on the
 * pixel grid.
 */
function drawChannel(
	png: PNG,
	frameX: number,
	channel: Channel,
	firstRow: number,
	style: StageStyle,
	rows: number,
	thin: boolean,
) {
	const halfWidth = thin ? Math.max(0, style.halfWidth - 1) : style.halfWidth

	for (const [ring, color] of style.glow.entries()) {
		// Outermost ring first, so each one is a little narrower than the last.
		const ringHalfWidth = halfWidth + style.glow.length - ring
		for (let row = 0; row < rows; row++) {
			paintRow(
				png,
				frameX,
				channel[row],
				firstRow + row,
				ringHalfWidth,
				color,
				style.alpha,
			)
		}
	}

	for (let row = 0; row < rows; row++) {
		paintRow(
			png,
			frameX,
			channel[row],
			firstRow + row,
			halfWidth,
			CORE,
			style.alpha,
		)
	}
}

function drawFrame(png: PNG, frameIndex: number, bolt: Bolt, stage: Stage) {
	const style = STAGE_STYLES[stage]
	const frameX = frameIndex * FRAME_W
	const rows = Math.floor(FRAME_H * style.reach)

	drawChannel(png, frameX, bolt.trunk, 0, style, rows, false)

	if (!style.branches) return
	for (const branch of bolt.branches) {
		if (branch.startRow >= rows) continue
		const visible = Math.min(branch.channel.length, rows - branch.startRow)
		// Branches are drawn a pixel thinner than the trunk they leave, which is
		// what makes the trunk read as the trunk.
		drawChannel(
			png,
			frameX,
			branch.channel,
			branch.startRow,
			style,
			visible,
			true,
		)
	}
}

const png = new PNG({ width: FRAME_W * FRAME_COUNT, height: FRAME_H })
png.data.fill(0) // Fully transparent; frame 0 stays that way.

const bolts = BOLT_X.map((x, i) => buildBolt(0x17b0 + i * 6151, x))

for (const [boltIndex, bolt] of bolts.entries()) {
	for (const [stageIndex, stage] of STAGES.entries()) {
		drawFrame(png, 1 + boltIndex * STAGES.length + stageIndex, bolt, stage)
	}
}

const file = path.join(OUT_DIR, 'lightning.png')
fs.writeFileSync(file, PNG.sync.write(png))
console.log(
	`${path.basename(file)}  ${FRAME_W * FRAME_COUNT}x${FRAME_H}  ` +
		`${FRAME_COUNT} frames of ${FRAME_W}x${FRAME_H}`,
)
