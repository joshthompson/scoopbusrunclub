import { createController } from 'scoopjs'
import beastPoses from '../assets/manbearpig/poses.png'
import beastRun from '../assets/manbearpig/run.png'
import {
	SOW_FRAMES,
	SOW_HEIGHT,
	SOW_WIDTH,
} from '../courses/kit/huddingeScenery'
import {
	CUTSCENE_ROAR_TICKS,
	POOF_CHANGE,
	POOF_SHAKE,
	POOF_TICKS,
	beastStride,
	boarStride,
} from '../game/manBearPig'
import type { World } from '../game/world'

/**
 * Huddinge's wild boar, and ManBearPig (see `game/manBearPig.ts`), drawn
 * from where it is: the sow's run, out on the path (`SOW_FRAMES`); and
 * ManBearPig's own frames, a cell two pixels as everyone's, facing right,
 * the way it chases: a strip of its four-frame run, and one of its poses,
 * roaring, its fists up to smash, brought down, and dazed.
 *
 * Its cut scene, jumped on: the boar trembling, then smoke billowing up
 * round it, ManBearPig in it as it clears; then roaring, shaking with rage,
 * an anger mark flashing over its head and steam snorted out of its snout.
 * Stars round its head, dazed; spinning off, scooped by the bus.
 */

/** One of its frames, in cells; drawn two pixels a cell. */
const FRAME_WIDTH = 36
const FRAME_HEIGHT = 46
const CELL = 2
/** How far up its frames its feet are: a couple of clear rows under them. */
const FEET_UP = 2
/** Its poses' strip, in order. */
const ROAR = 0
const SMASH_UP = 1
const SMASH_DOWN = 2
const DAZED = 3
/** How long into a smash its fists are up. */
const FISTS_UP = 10

/** Its box: room round it for the smoke and the stars, its feet `FLOOR` down it. */
const BOX_WIDTH = 160
const BOX_HEIGHT = 170
const FLOOR = 156
const MIDDLE = BOX_WIDTH / 2

/** The smoke: white, shaded underneath. */
const SMOKE = '#f4f1ea'
const SMOKE_SHADE = '#cdc6ba'
/** Where each puff of it is, from its middle, and how big it grows. */
const PUFFS: [number, number, number][] = [
	[0, -40, 1],
	[-24, -30, 0.85],
	[24, -32, 0.9],
	[-14, -62, 0.8],
	[16, -64, 0.85],
	[-30, -8, 0.75],
	[28, -10, 0.75],
	[0, -10, 0.95],
	[0, -84, 0.65],
]
/** When the smoke starts billowing: as the boar's trembling ends. */
const SMOKE_FROM = POOF_SHAKE - 4
/** Its stars, dazed: yellow, going round over its head. */
const STAR = '#ffe14d'
const STAR_GLINT = '#fff8c9'
/** The anger mark over its head: red, four corners of a cross, popping. */
const ANGER = '#e8231e'
const ANGER_DARK = '#9c0f15'
const ANGER_RIM = '#ffffff'
/** Where its head and its snout are, from its middle and its feet. */
const HEAD: [number, number] = [14, -94]
const SNOUT: [number, number] = [36, -66]
/** Steam snorted out of its snout, roaring: a puff every so often, drifting off and thinning. */
const SNORT_EVERY = 12
const SNORT_TICKS = 18

/** Onto the two-pixel grid. */
const snap = (n: number) => Math.round(n / CELL) * CELL

/** A stepped circle, two pixels a cell. */
function puff(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
	r: number,
	shaded = true,
) {
	for (let y = -r; y <= r; y += CELL)
		for (let x = -r; x <= r; x += CELL)
			if (x * x + y * y <= r * r) {
				if (shaded) ctx.fillStyle = y > r * 0.35 ? SMOKE_SHADE : SMOKE
				ctx.fillRect(snap(cx + x), snap(cy + y), CELL, CELL)
			}
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number) {
	const sx = snap(x)
	const sy = snap(y)
	ctx.fillStyle = STAR
	ctx.fillRect(sx - CELL, sy, CELL * 3, CELL)
	ctx.fillRect(sx, sy - CELL, CELL, CELL * 3)
	ctx.fillStyle = STAR_GLINT
	ctx.fillRect(sx, sy, CELL, CELL)
}

/**
 * An anger mark, popping: four thick corners round a gap, each bent in
 * towards the middle, a vein about to burst. Big, then small, then big.
 * `R` its red, `r` shaded.
 */
const ANGER_BIG = [
	'..RR...RR..',
	'..RR...RR..',
	'RRRR...RRRR',
	'RRRr...rRRR',
	'...........',
	'...........',
	'...........',
	'RRRr...rRRR',
	'rrrr...rrrr',
	'..rr...rr..',
	'..rr...rr..',
]
const ANGER_SMALL = [
	'..R...R..',
	'..R...R..',
	'RRR...RRR',
	'.........',
	'.........',
	'.........',
	'rrr...rrr',
	'..r...r..',
	'..r...r..',
]

/** An anger mark, centred on `x`, `y`. */
function angerMark(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	big: boolean,
) {
	const rows = big ? ANGER_BIG : ANGER_SMALL
	const left = snap(x - (rows[0].length * CELL) / 2)
	const top = snap(y - (rows.length * CELL) / 2)
	// A white rim round it first, so it shows against anything, red
	// leaves too, as a popup does.
	ctx.fillStyle = ANGER_RIM
	rows.forEach((row, ry) => {
		for (let rx = 0; rx < row.length; rx++)
			if (row[rx] !== '.')
				ctx.fillRect(
					left + (rx - 1) * CELL,
					top + (ry - 1) * CELL,
					CELL * 3,
					CELL * 3,
				)
	})
	rows.forEach((row, ry) => {
		for (let rx = 0; rx < row.length; rx++) {
			if (row[rx] === '.') continue
			ctx.fillStyle = row[rx] === 'R' ? ANGER : ANGER_DARK
			ctx.fillRect(left + rx * CELL, top + ry * CELL, CELL, CELL)
		}
	})
}

export function createManBearPig(world: World) {
	const beast = world.beast
	if (!beast) return []
	const shown = () =>
		beast.state !== 'waiting' &&
		beast.x > world.camera() - BOX_WIDTH &&
		beast.x < world.camera() + world.viewWidth() + BOX_WIDTH
	return [
		createController({
			frames: [...SOW_FRAMES, beastRun, beastPoses],
			init: () => ({
				id: 'man-bear-pig',
				// Behind the runners, as a Ride is: it's after them, not over them.
				type: 'corgi',
				x: () => Math.round(beast.x - MIDDLE),
				y: () => Math.round(beast.feetY + beast.depth - FLOOR),
				width: () => BOX_WIDTH,
				height: () => BOX_HEIGHT,
				style: () => ({
					'image-rendering': 'pixelated',
					visibility: shown() ? 'visible' : 'hidden',
				}),
			}),
			draw: ({ ctx, image }) => {
				if (!shown()) return
				const t = world.ticks() - beast.since
				const poof = beast.state === 'poof'
				const raging = beast.cutscene && beast.state === 'roar'
				// Trembling, about to change; shaking with rage, roaring.
				const shake =
					(poof && t < POOF_CHANGE) || raging
						? (t % 4 < 2 ? 1 : -1) *
							CELL *
							(raging ? 1 : t < POOF_SHAKE ? 1 : 0)
						: 0
				const boar =
					beast.state === 'boar' ||
					beast.state === 'fled' ||
					(poof && t < POOF_CHANGE)
				if (boar) {
					// Stood still, trembling, once it's jumped on.
					const frame = image(
						SOW_FRAMES[poof ? 0 : boarStride(beast) % SOW_FRAMES.length],
					)
					if (frame)
						ctx.drawImage(
							frame.image,
							MIDDLE - SOW_WIDTH / 2 + shake,
							FLOOR - SOW_HEIGHT,
							SOW_WIDTH,
							SOW_HEIGHT,
						)
				} else {
					const running = beast.state === 'chase'
					const strip = image(running ? beastRun : beastPoses)
					const index = running
						? beastStride(beast) % 4
						: beast.state === 'smash'
							? t < FISTS_UP
								? SMASH_UP
								: SMASH_DOWN
							: beast.state === 'dazed' || beast.state === 'scooped'
								? DAZED
								: ROAR
					if (strip) {
						const width = FRAME_WIDTH * CELL
						const height = FRAME_HEIGHT * CELL
						const top = FLOOR - height + FEET_UP * CELL
						ctx.save()
						if (beast.state === 'scooped') {
							// Spinning off, about its middle.
							ctx.translate(MIDDLE, top + height / 2)
							ctx.rotate((beast.spin * Math.PI) / 180)
							ctx.translate(-MIDDLE, -(top + height / 2))
						}
						ctx.drawImage(
							strip.image,
							index * FRAME_WIDTH,
							0,
							FRAME_WIDTH,
							FRAME_HEIGHT,
							MIDDLE - width / 2 + shake,
							top,
							width,
							height,
						)
						ctx.restore()
					}
					// Seeing stars, going round over its head.
					if (beast.state === 'dazed')
						for (let i = 0; i < 3; i++) {
							const turn = t * 0.16 + (i * Math.PI * 2) / 3
							star(
								ctx,
								MIDDLE + HEAD[0] + Math.cos(turn) * 18,
								FLOOR + HEAD[1] + 2 + Math.sin(turn) * 5,
							)
						}
				}
				// Roaring at whoever woke it: steam snorted out of its snout,
				// and an anger mark popping over its head, bigger and smaller.
				if (raging) {
					for (let at = 0; at <= t; at += SNORT_EVERY) {
						const age = t - at
						if (age >= SNORT_TICKS) continue
						// Thinning out as it drifts off.
						ctx.fillStyle = `rgba(255, 255, 255, ${(0.85 * (1 - age / SNORT_TICKS)).toFixed(2)})`
						for (const [dx, dy] of [
							[0, 0],
							[5, -4],
						])
							puff(
								ctx,
								MIDDLE + SNOUT[0] + dx + age * 1.5,
								FLOOR + SNOUT[1] + dy - age * 0.7,
								Math.round(2 + age * 0.3),
								false,
							)
					}
					if (t < CUTSCENE_ROAR_TICKS - 6)
						angerMark(
							ctx,
							MIDDLE + HEAD[0] + 26,
							FLOOR + HEAD[1] - 8,
							Math.floor(t / 8) % 2 === 0,
						)
				}
				// The puff of smoke it changes in: billowing out, and thinning away.
				if (poof && t >= SMOKE_FROM) {
					const into = t - SMOKE_FROM
					const span = POOF_TICKS - SMOKE_FROM
					const grown = Math.min(1, into / 10)
					// Thick till it's changed in there; clearing after.
					const clear = Math.max(
						0,
						(t - POOF_CHANGE) / (POOF_TICKS - POOF_CHANGE),
					)
					ctx.save()
					ctx.globalAlpha = 1 - clear * 0.9
					for (const [dx, dy, size] of PUFFS)
						puff(
							ctx,
							MIDDLE + dx * (0.6 + grown * 0.5),
							FLOOR + dy - into * 0.35,
							Math.round((6 + grown * 14 + (into / span) * 6) * size),
						)
					ctx.restore()
				}
			},
		}),
	]
}
