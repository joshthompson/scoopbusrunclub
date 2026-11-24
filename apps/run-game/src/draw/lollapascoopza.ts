import { createController, createObjectSignal } from 'scoopjs'
import type { JSX } from 'solid-js'
import { glyphRows } from '../courses/kit/pixelArt'
import { RUNNER_SCALE, VIEW_HEIGHT, VIEW_WIDTH } from '../game/constants'
import type { Racer, World } from '../game/world'
import { ARENA_LEFT } from '../minigames/arena'
import {
	DROPPED,
	GOOD_BY,
	GRADE_WORDS,
	HELD_ON,
	HOLDING,
	type Lane,
	MOST_MULTIPLIER,
	type NeckWear,
	OUTFITS,
	STREAK_STEP,
	isBad,
	isLong,
	multiplierOf,
	notesBetween,
	pointsOf,
	rockOf,
	stepAt,
	tickAt,
} from '../minigames/lollapascoopza'
import { createLollapascoopzaSong } from '../music/lollapascoopzaPlayer'
import { headTop } from './heads'
import { headFromFeetOf } from './sprites'

/**
 * Lollapascoopza, drawn: everyone's podium, its front an LED panel saying
 * how their last note went (and at the end, where they came), and over each, hung from the rig, their own
 * track of arrows scrolling down to its line (a long note's arrow with a
 * tail up behind it, to hold down till it's gone), edged in their colour,
 * their multiplier along its bottom, and their score over it; and, for the songs that have one, what's
 * slung round everyone's neck (see `OUTFITS`). The stage round it all is its set (see
 * `rockStage.ts`). The song's played from here too, in time with what's
 * drawn (see `lollapascoopzaPlayer.ts`).
 */

/** A pixel, as everything's drawn: 2 px. */
const CELL = 2

// --- The tracks ------------------------------------------------------------

/** Down the screen: the top of each track, its lanes, its line, its meter and its bottom. */
export const TRACK_TOP = 96
const LANES_TOP = TRACK_TOP + 4
const LINE_Y = 210
const METER_TOP = 230
const METER_TALL = 6
export const TRACK_BOTTOM = 242
/** How far ahead of the line the arrows come into sight, in steps of the song. */
const TRAVEL_STEPS = 8
const PX_PER_STEP = (LINE_Y - LANES_TOP + 8) / TRAVEL_STEPS

/** Each arrow's colours: base, lit, shade. Left, down, up, right. */
export const LANE_COLOURS: [string, string, string][] = [
	['#f04fd0', '#ff9cec', '#a8278e'],
	['#36c4f8', '#a0e8ff', '#1d78b8'],
	['#5cd858', '#b4f59c', '#2c903a'],
	['#ffa22c', '#ffd88c', '#c0660e'],
]
const PANEL = '#0e0a1e'
const PANEL_LANE = '#130e28'
const BEAT_LINE = '#2c2452'
const BAR_LINE = '#4a3c80'
const RECEPTOR_EDGE = '#8a84a8'
const RECEPTOR_INSIDE = '#262040'
const DUD: [string, string, string] = ['#4e4866', '#6c6688', '#3a3550']
const CABLE = '#2a2738'
/** The multiplier's bar: empty, and filling, by how many times over: one, two, three, and four, when it's all blue. */
const BAR_EMPTY = '#1e1830'
const BAR_FILLS = ['#c8c4dc', '#ffd23c', '#5cd858', '#4fb8ff']
/**
 * At the most it goes, four times over, their track all blue, glowing:
 * its arrows, its edge, its panel, and its glow.
 */
const STAR: [string, string, string] = ['#4fb8ff', '#c4ecff', '#1f6fc0']
const STAR_PANEL = '#0a1436'
/** Its notes, outlines: white along their lit edges, blue round the rest. */
const STAR_EDGE_LIT = '#ffffff'
const STAR_GLOW = '#6cc8ff'

/** Arrows, `size` cells square, for each lane: their cells, by what they're painted. */
type ArrowCells = {
	body: number[][]
	lit: number[][]
	shade: number[][]
	edge: number[][]
}
const arrowSets = new Map<number, ArrowCells[]>()

/**
 * Each lane's arrow, `size` cells square: a left arrow, its head to its
 * tip at the left and a shaft out right, turned each way; lit along its
 * top edges and shaded along its bottom ones, the same lit from above
 * whichever way it points.
 */
function arrowsOf(size: number): ArrowCells[] {
	const found = arrowSets.get(size)
	if (found) return found
	const half = Math.floor(size / 2)
	const left = Array.from({ length: size }, (_, y) =>
		Array.from({ length: size }, (_, x) => {
			const fromMiddle = Math.abs(y - (size - 1) / 2)
			const head = x <= half && x >= Math.floor(fromMiddle)
			const shaft = x > half && fromMiddle < size * 0.22
			return head || shaft
		}),
	)
	const has = (lane: Lane, x: number, y: number) => {
		if (x < 0 || y < 0 || x >= size || y >= size) return false
		switch (lane) {
			case 0:
				return left[y][x]
			case 3:
				return left[y][size - 1 - x]
			case 2:
				return left[x][y]
			default:
				return left[x][size - 1 - y]
		}
	}
	const sets = ([0, 1, 2, 3] as Lane[]).map((lane) => {
		const cells: ArrowCells = { body: [], lit: [], shade: [], edge: [] }
		for (let y = 0; y < size; y++)
			for (let x = 0; x < size; x++) {
				if (!has(lane, x, y)) continue
				const open = (dx: number, dy: number) => !has(lane, x + dx, y + dy)
				if (open(0, -1)) cells.lit.push([x, y])
				else if (open(0, 1) || open(1, 0)) cells.shade.push([x, y])
				else cells.body.push([x, y])
				if (open(0, -1) || open(0, 1) || open(1, 0) || open(-1, 0))
					cells.edge.push([x, y])
			}
		return cells
	})
	arrowSets.set(size, sets)
	return sets
}

/** An arrow, `size` cells square, its middle at `cx`, `cy`. */
function paintArrow(
	ctx: CanvasRenderingContext2D,
	lane: Lane,
	size: number,
	cx: number,
	cy: number,
	[base, lit, shade]: [string, string, string],
) {
	const left = snap(cx - (size * CELL) / 2)
	const top = snap(cy - (size * CELL) / 2)
	const cells = arrowsOf(size)[lane]
	for (const [fill, list] of [
		[base, cells.body],
		[lit, cells.lit],
		[shade, cells.shade],
	] as const) {
		ctx.fillStyle = fill
		for (const [x, y] of list)
			ctx.fillRect(left + x * CELL, top + y * CELL, CELL, CELL)
	}
}

/**
 * An arrow as an outline, nothing inside: four times over, the notes
 * coming down. White along its top edges, as lit, blue round the rest.
 */
function paintArrowOutline(
	ctx: CanvasRenderingContext2D,
	lane: Lane,
	size: number,
	cx: number,
	cy: number,
) {
	const left = snap(cx - (size * CELL) / 2)
	const top = snap(cy - (size * CELL) / 2)
	const cells = arrowsOf(size)[lane]
	const lit = new Set(cells.lit.map(([x, y]) => `${x},${y}`))
	for (const [x, y] of cells.edge) {
		ctx.fillStyle = lit.has(`${x},${y}`) ? STAR_EDGE_LIT : STAR[0]
		ctx.fillRect(left + x * CELL, top + y * CELL, CELL, CELL)
	}
}

/** The line's empty arrow for `lane`: its edge, and dark inside; or lit up, pressed. */
function paintReceptor(
	ctx: CanvasRenderingContext2D,
	lane: Lane,
	size: number,
	cx: number,
	cy: number,
	edge: string,
	inside: string,
) {
	const left = snap(cx - (size * CELL) / 2)
	const top = snap(cy - (size * CELL) / 2)
	const cells = arrowsOf(size)[lane]
	ctx.fillStyle = inside
	for (const list of [cells.body, cells.lit, cells.shade])
		for (const [x, y] of list)
			ctx.fillRect(left + x * CELL, top + y * CELL, CELL, CELL)
	ctx.fillStyle = edge
	for (const [x, y] of cells.edge)
		ctx.fillRect(left + x * CELL, top + y * CELL, CELL, CELL)
}

/** Pixel letters, 5 cells by 7, `cell` px a cell, their top left at `x`, `y`. */
export function paintText(
	ctx: CanvasRenderingContext2D,
	text: string,
	x: number,
	y: number,
	cell: number,
	fill: string,
) {
	ctx.fillStyle = fill
	;[...text.toUpperCase()].forEach((char, i) => {
		glyphRows(char).forEach((row, r) => {
			let from = -1
			for (let c = 0; c <= row.length; c++) {
				const lit = row[c] === '#'
				if (lit && from < 0) from = c
				if (!lit && from >= 0) {
					ctx.fillRect(
						x + (i * 6 + from) * cell,
						y + r * cell,
						(c - from) * cell,
						cell,
					)
					from = -1
				}
			}
		})
	})
}
/** How wide pixel letters are. */
export const textWide = (text: string, cell: number) =>
	Math.max(0, [...text].length * 6 - 1) * cell

/** Where the song's got to, in beats: before "Go!", the menus' tempo, ticking over. */
export function beatOf(world: World) {
	const now = world.raceTicks()
	if (world.phase() === 'running' && now > 0)
		return stepAt(rockOf(world)?.song ?? 0, now) / 4
	return (world.ticks() * 128) / 3600
}

/** How far back, in steps, a long note's arrow can be and its tail still be to go past the line. */
const HOLD_BACK = 32

/** How long a multiplier lost is seen falling away. */
const LOST_TICKS = 30

/** Words too long for a narrow podium's panel, said shorter. */
const SHORT_WORDS: Record<string, string> = {
	Perfect: 'Super',
	'Let go': 'Drop',
}

/** Where someone came, said short: 2nd, 3rd, 4th. */
const placeOf = (place: number) =>
	`${place}${['th', 'st', 'nd', 'rd'][place % 100 >= 11 && place % 100 <= 13 ? 0 : place % 10] ?? 'th'}`

/** Rounds to the grid. */
const snap = (n: number) => Math.round(n / CELL) * CELL

/** `hex`, `alpha` of it, see-through. */
const glow = (hex: string, alpha: number) =>
	`${hex}${Math.round(Math.max(0, Math.min(1, alpha)) * 255)
		.toString(16)
		.padStart(2, '0')}`

export function createLollapascoopza(world: World) {
	const show = rockOf(world)
	if (!show) return []
	const song = createLollapascoopzaSong(world, show)
	/** When each of their notes was played, by what's drawn, for its burst: by who and the step. */
	const hitAt = new Map<string, number>()
	/**
	 * Each of them's score and multiplier, as last drawn: when the score
	 * last went up, for its pop; and the multiplier they lost, and when,
	 * for it to fall away.
	 */
	const streaks = new Map<
		string,
		{ score: number; times: number; upAt: number; lost: number; lostAt: number }
	>()

	/** One picture over the whole arena: `type` says what it's in front of. */
	const layer = (
		id: string,
		type: string,
		paint: (ctx: CanvasRenderingContext2D) => void,
	) =>
		createController({
			init: () => ({
				id,
				type,
				...createObjectSignal(ARENA_LEFT, 'x'),
				...createObjectSignal(0, 'y'),
				...createObjectSignal({} as JSX.CSSProperties, 'style'),
				width: () => VIEW_WIDTH,
				height: () => VIEW_HEIGHT,
			}),
			draw({ ctx }) {
				// Read the tick, so it's painted again every one.
				world.ticks()
				paint(ctx)
			},
		})

	const podiums = layer('rock-podiums', 'boost', (ctx) => {
		const now = world.raceTicks()
		const beat = beatOf(world)
		const width = show.podiumWidth
		const decided = world.order()
		for (const racer of world.racers) {
			const r = show.rockers.get(racer.id)
			if (!r) continue
			const colour = racer.colour ?? '#ffffff'
			const star = multiplierOf(r.combo) === MOST_MULTIPLIER
			const left = snap(r.x - ARENA_LEFT - width / 2)
			const top = show.podiumTop
			const tall = show.ground - top
			// Its glow on the stage under it, their colour; blue, at the most.
			const under = star ? STAR_GLOW : colour
			ctx.fillStyle = glow(under, star ? 0.4 : 0.25)
			ctx.fillRect(left - 8, show.ground - 4, width + 16, 6)
			ctx.fillStyle = glow(under, star ? 0.25 : 0.15)
			ctx.fillRect(left - 16, show.ground - 2, width + 32, 4)
			// The riser: its body, the far side shaded, a steel cap lit on top.
			ctx.fillStyle = '#231a3c'
			ctx.fillRect(left, top, width, tall)
			ctx.fillStyle = '#18122c'
			ctx.fillRect(left + width - 4, top, 4, tall)
			ctx.fillStyle = '#8c92a8'
			ctx.fillRect(left - 2, top, width + 4, 4)
			ctx.fillStyle = '#c4c8d8'
			ctx.fillRect(left - 2, top, width + 4, 2)
			// Its feet.
			ctx.fillStyle = '#0c0818'
			ctx.fillRect(left + 4, show.ground - 4, 8, 4)
			ctx.fillRect(left + width - 12, show.ground - 4, 8, 4)
			// The LED panel on its front.
			const panelLeft = left + 4
			const panelTop = top + 8
			const panelWide = width - 8
			const panelTall = tall - 16
			ctx.fillStyle = '#07050f'
			ctx.fillRect(panelLeft, panelTop, panelWide, panelTall)
			const say = (words: string, fill: string) => {
				// Too long for a narrow podium: the short way of saying it.
				const text =
					textWide(words, CELL) <= panelWide - 4
						? words
						: (SHORT_WORDS[words] ?? words.slice(0, 5))
				const tx = snap(panelLeft + (panelWide - textWide(text, CELL)) / 2)
				const ty = snap(panelTop + (panelTall - 7 * CELL) / 2)
				paintText(ctx, text, tx, ty, CELL, fill)
			}
			if (decided) {
				// The winner, saying so; everyone else, where they came (their
				// scores are over their tracks).
				const place = decided.indexOf(racer)
				if (place === 0)
					say(
						'WINNER',
						Math.floor(world.ticks() / 8) % 2 ? '#ffd23c' : '#fff6c8',
					)
				else if (place > 0) say(placeOf(place + 1), colour)
				continue
			}
			const since = now - r.gradeAt
			// How their last note went, a moment; or, with nothing to say, a
			// meter. How many in a row's over their track.
			if (r.grade >= 0 && since >= 0 && since < 24) {
				const bad = isBad(r.grade)
				say(
					GRADE_WORDS[r.grade],
					since < 4 ? '#ffffff' : bad ? '#ff5a6a' : star ? STAR[1] : colour,
				)
			} else {
				// Nothing just now: their colour, a level meter bouncing to the beat.
				const pulse = 1 - (((beat % 1) + 1) % 1)
				for (let i = 0; i < Math.floor(panelWide / 6); i++) {
					const lit = Math.round(
						(0.3 + 0.7 * pulse) * (2 + 3 * Math.abs(Math.sin(i * 1.7 + beat))),
					)
					ctx.fillStyle = glow(star ? STAR[0] : colour, 0.67)
					ctx.fillRect(
						panelLeft + 2 + i * 6,
						panelTop + 16 - lit * 2,
						4,
						lit * 2,
					)
				}
			}
		}
	})

	const tracks = layer('rock-tracks', 'foreground', (ctx) => {
		song()
		const now = world.raceTicks()
		const running = world.phase() === 'running' && now > 0
		const step = running ? stepAt(show.song, now) : stepAt(show.song, 0)
		const beat = beatOf(world)
		const pulse = 1 - (((beat % 1) + 1) % 1)
		const ended = show.endedAt
		const width = show.trackWidth
		const laneWide = Math.floor((width - 8) / 4 / CELL) * CELL
		const size = Math.max(7, Math.min(14, Math.floor(laneWide / CELL) - 2))
		const yOf = (at: number) => LINE_Y - (at - step) * PX_PER_STEP
		// What's coming, and what's just gone; a long one's, as long as its
		// tail's still to go past.
		const coming = running
			? notesBetween(
					show.song,
					step - HOLD_BACK,
					step + TRAVEL_STEPS + 2,
				).filter(
					(note) =>
						note.step >= step - 6 || note.step + note.length >= step - 2,
				)
			: []
		const missed = (at: number) => now - tickAt(show.song, at) > GOOD_BY

		for (const racer of world.racers) {
			const r = show.rockers.get(racer.id)
			if (!r) continue
			const colour = racer.colour ?? '#ffffff'
			// Four times over: all blue, glowing.
			const star = multiplierOf(r.combo) === MOST_MULTIPLIER
			const coloursOf = (lane: number) => (star ? STAR : LANE_COLOURS[lane])
			const left = snap(r.x - ARENA_LEFT - width / 2)
			const right = left + width
			const lanesLeft = snap(left + (width - 4 * laneWide) / 2)
			const laneMiddle = (lane: number) =>
				lanesLeft + lane * laneWide + laneWide / 2

			// Hung from the rig: a cable up from each side of it.
			ctx.fillStyle = CABLE
			ctx.fillRect(left + 12, 30, CELL, TRACK_TOP - 30)
			ctx.fillRect(right - 14, 30, CELL, TRACK_TOP - 30)
			// A glow round it in their colour, pulsing on the beat; its edge; the
			// panel. Four times over, blue, and glowing out further, brighter.
			if (star)
				for (const [out, alpha] of [
					[14, 0.12],
					[8, 0.2],
				]) {
					ctx.fillStyle = glow(STAR_GLOW, alpha + 0.2 * pulse)
					ctx.fillRect(
						left - out,
						TRACK_TOP - out,
						width + out * 2,
						TRACK_BOTTOM - TRACK_TOP + out * 2,
					)
				}
			ctx.fillStyle = glow(star ? STAR_GLOW : colour, 0.1 + 0.25 * pulse)
			ctx.fillRect(
				left - 6,
				TRACK_TOP - 6,
				width + 12,
				TRACK_BOTTOM - TRACK_TOP + 12,
			)
			ctx.fillStyle = star ? STAR[0] : colour
			ctx.fillRect(
				left - 2,
				TRACK_TOP - 2,
				width + 4,
				TRACK_BOTTOM - TRACK_TOP + 4,
			)
			ctx.fillStyle = star ? STAR_PANEL : PANEL
			ctx.fillRect(left, TRACK_TOP, width, TRACK_BOTTOM - TRACK_TOP)
			for (let lane = 0; lane < 4; lane++) {
				ctx.fillStyle = PANEL_LANE
				ctx.fillRect(
					lanesLeft + lane * laneWide + CELL,
					LANES_TOP,
					laneWide - CELL * 2,
					METER_TOP - 4 - LANES_TOP,
				)
			}

			ctx.save()
			ctx.beginPath()
			ctx.rect(left, LANES_TOP, width, METER_TOP - 4 - LANES_TOP)
			ctx.clip()
			// A line across it on every beat, coming down with the arrows,
			// brighter on each bar's first.
			for (
				let at = Math.ceil((step - 4) / 4) * 4;
				at <= step + TRAVEL_STEPS + 4;
				at += 4
			) {
				ctx.fillStyle = at % 16 === 0 ? BAR_LINE : BEAT_LINE
				ctx.fillRect(
					lanesLeft,
					snap(yOf(at)),
					4 * laneWide,
					at % 16 === 0 ? 4 : 2,
				)
			}
			// The line: each arrow empty, lit up as they press it.
			const pressed = running && now - r.moveAt >= 0 && now - r.moveAt < 8
			for (let lane = 0 as Lane; lane < 4; lane = (lane + 1) as Lane) {
				const on = pressed && r.move === lane
				paintReceptor(
					ctx,
					lane,
					size,
					laneMiddle(lane),
					LINE_Y,
					on ? '#ffffff' : RECEPTOR_EDGE,
					on ? coloursOf(lane)[0] : RECEPTOR_INSIDE,
				)
			}
			// Long notes' tails, behind their arrows: up from the arrow to
			// its end. Held, it's on the line, lit, burning down; held all the
			// way, gone; let go too soon, or never pressed, greyed, falling on
			// past.
			for (const note of coming) {
				if (!isLong(note)) continue
				if (ended !== undefined && tickAt(show.song, note.step) > ended)
					continue
				const h = r.hold?.step === note.step ? r.hold : undefined
				if (h?.state === HELD_ON) continue
				const held = h?.state === HOLDING
				const from = held ? LINE_Y : yOf(note.step)
				const to = yOf(note.step + note.length)
				if (from <= to) continue
				const dead =
					h?.state === DROPPED ||
					(!h && (missed(note.step) || r.notesHit.has(note.step)))
				const [base, lit, shade] = dead ? DUD : coloursOf(note.lane)
				const wide = Math.max(CELL * 3, snap(laneWide * 0.36))
				const x = snap(laneMiddle(note.lane) - wide / 2)
				if (held) {
					ctx.fillStyle = glow(lit, 0.25 + 0.3 * pulse)
					ctx.fillRect(x - CELL * 2, snap(to), wide + CELL * 4, snap(from - to))
				}
				// Four times over, and not yet held: just its outline, white
				// down one side and over its end, blue down the other.
				const outline = star && !held && !dead
				if (!outline) {
					ctx.fillStyle = held ? lit : base
					ctx.fillRect(x, snap(to), wide, snap(from - to))
				}
				ctx.fillStyle = held || outline ? '#ffffff' : lit
				ctx.fillRect(x, snap(to), CELL, snap(from - to))
				ctx.fillStyle = outline ? STAR[0] : shade
				ctx.fillRect(x + wide - CELL, snap(to), CELL, snap(from - to))
				// Its end, rounded off.
				ctx.fillStyle = outline ? STAR_EDGE_LIT : held ? lit : base
				ctx.fillRect(x + CELL, snap(to) - CELL, wide - CELL * 2, CELL)
			}
			// Their arrows, coming down: gone once played, in a burst (a long
			// one's held on the line while it's held); let by, greyed, falling
			// on past.
			for (const note of coming) {
				if (ended !== undefined && tickAt(show.song, note.step) > ended)
					continue
				if (note.step < step - 6) continue
				if (r.notesHit.has(note.step)) {
					const key = `${racer.id}:${note.step}`
					if (!hitAt.has(key)) hitAt.set(key, now)
					if (r.hold?.step === note.step && r.hold.state === HOLDING) {
						paintArrow(ctx, note.lane, size, laneMiddle(note.lane), LINE_Y, [
							'#ffffff',
							'#ffffff',
							coloursOf(note.lane)[1],
						])
						// Sparks off it, held.
						ctx.fillStyle = coloursOf(note.lane)[1]
						for (let i = 0; i < 3; i++) {
							const t = (now + i * 5) % 12
							const way = i % 2 ? 1 : -1
							ctx.fillRect(
								snap(laneMiddle(note.lane) + way * (size + t * 1.5)),
								snap(LINE_Y - size / 2 - t * 2 + t * t * 0.15),
								CELL,
								CELL,
							)
						}
					}
					continue
				}
				// A double: both its arrows, a bar between them, white, to say
				// they go together.
				const lanes =
					note.pair === undefined ? [note.lane] : [note.lane, note.pair]
				const y = yOf(note.step)
				if (note.pair !== undefined) {
					const from = laneMiddle(Math.min(note.lane, note.pair))
					const to = laneMiddle(Math.max(note.lane, note.pair))
					ctx.fillStyle = missed(note.step) ? DUD[0] : '#ffffff'
					ctx.fillRect(snap(from), snap(y) - CELL, snap(to - from), CELL * 2)
				}
				for (const lane of lanes as Lane[])
					if (star && !missed(note.step))
						paintArrowOutline(ctx, lane, size, laneMiddle(lane), y)
					else
						paintArrow(
							ctx,
							lane,
							size,
							laneMiddle(lane),
							y,
							missed(note.step) ? DUD : coloursOf(lane),
						)
			}
			ctx.restore()

			// Bursts off the line, where they played a note: a ring flying
			// out, and sparks.
			for (const note of coming) {
				const when = hitAt.get(`${racer.id}:${note.step}`)
				if (when === undefined) continue
				const t = now - when
				if (t < 0 || t > 12) continue
				// A double: off both its arrows.
				for (const lane of (note.pair === undefined
					? [note.lane]
					: [note.lane, note.pair]) as Lane[]) {
					const [base, lit] = coloursOf(lane)
					const cx = laneMiddle(lane)
					const reach = size + t * 2
					ctx.fillStyle = t < 4 ? '#ffffff' : lit
					ctx.fillRect(snap(cx - reach), snap(LINE_Y - reach), reach * 2, CELL)
					ctx.fillRect(snap(cx - reach), snap(LINE_Y + reach), reach * 2, CELL)
					ctx.fillRect(snap(cx - reach), snap(LINE_Y - reach), CELL, reach * 2)
					ctx.fillRect(
						snap(cx + reach),
						snap(LINE_Y - reach),
						CELL,
						reach * 2 + CELL,
					)
					ctx.fillStyle = base
					for (let i = 0; i < 6; i++) {
						const angle = (i / 6) * Math.PI * 2 + note.step
						const far = size * 0.6 + t * 3
						ctx.fillRect(
							snap(cx + Math.cos(angle) * far),
							snap(LINE_Y + Math.sin(angle) * far),
							CELL * 2,
							CELL * 2,
						)
					}
				}
			}

			paintScore(ctx, racer.id, r, star ? STAR[1] : colour, left, width, now)

			// Their multiplier: a bar filling ten notes at a time to the next,
			// in its colour, and how many times over, at its end. Full and
			// blue, at the most.
			const times = multiplierOf(r.combo)
			const label = `X${times}`
			const labelWide = textWide(label, CELL)
			const barLeft = left + 6
			const barWide = width - 16 - labelWide
			ctx.fillStyle = BAR_EMPTY
			ctx.fillRect(barLeft, METER_TOP, barWide, METER_TALL)
			const share =
				times === MOST_MULTIPLIER ? 1 : (r.combo % STREAK_STEP) / STREAK_STEP
			ctx.fillStyle = BAR_FILLS[times - 1]
			ctx.fillRect(barLeft, METER_TOP, snap(barWide * share), METER_TALL)
			ctx.fillStyle = glow('#ffffff', 0.35)
			ctx.fillRect(barLeft, METER_TOP, snap(barWide * share), CELL)
			// Its notches, a note each.
			ctx.fillStyle = BAR_EMPTY
			for (let n = 1; n < STREAK_STEP; n++)
				ctx.fillRect(
					snap(barLeft + (barWide * n) / STREAK_STEP),
					METER_TOP,
					CELL,
					METER_TALL,
				)
			paintText(
				ctx,
				label,
				left + width - 4 - labelWide,
				METER_TOP - 4,
				CELL,
				times === 1 ? '#8a84a8' : BAR_FILLS[times - 1],
			)
		}
		// Forgetting bursts long done.
		for (const [key, when] of hitAt) if (now - when > 30) hitAt.delete(key)
	})

	/**
	 * Their score, big over their track, popping up white as it goes up;
	 * in their colour, or blue, glowing, four times over. Their multiplier
	 * lost, from two times over or more, its “x” shakes, red, and drops
	 * away beside it.
	 */
	function paintScore(
		ctx: CanvasRenderingContext2D,
		id: string,
		r: { score: number; combo: number },
		colour: string,
		left: number,
		width: number,
		now: number,
	) {
		let streak = streaks.get(id)
		if (!streak) {
			streak = { score: 0, times: 1, upAt: -99, lost: 1, lostAt: -99 }
			streaks.set(id, streak)
		}
		const points = pointsOf(r)
		const times = multiplierOf(r.combo)
		if (points > streak.score) streak.upAt = now
		if (times < streak.times && streak.times > 1) {
			streak.lost = streak.times
			streak.lostAt = now
		}
		streak.score = points
		streak.times = times
		const bottom = TRACK_TOP - 10
		/** Digits as big as fit over the track, their bottom at `y`, `dx` across. */
		const digits = (text: string, fill: string, y: number, dx = 0) => {
			const cell = textWide(text, CELL * 2) <= width - 8 ? CELL * 2 : CELL
			paintText(
				ctx,
				text,
				snap(left + (width - textWide(text, cell)) / 2 + dx),
				snap(y - 7 * cell),
				cell,
				fill,
			)
		}
		const popping = now - streak.upAt >= 0 && now - streak.upAt < 6
		digits(
			`${points}`,
			popping ? '#ffffff' : colour,
			bottom - (popping ? CELL : 0),
		)
		const lostFor = now - streak.lostAt
		if (lostFor >= 0 && lostFor < LOST_TICKS) {
			const shake = lostFor < 10 ? (lostFor % 2 ? CELL : -CELL) : 0
			const fall = Math.max(0, lostFor - 10) ** 2 * 0.15
			ctx.save()
			ctx.globalAlpha = 1 - Math.max(0, lostFor - 10) / (LOST_TICKS - 10)
			const text = `X${streak.lost}`
			paintText(
				ctx,
				text,
				snap(left + width - textWide(text, CELL) - 2 + shake),
				snap(bottom - 7 * CELL + fall),
				CELL,
				'#ff3d3d',
			)
			ctx.restore()
		}
	}

	// What's round their necks, for the song: in front of them.
	const necks = layer('rock-necks', 'furby', (ctx) => {
		const wear = OUTFITS[show.song]?.neck
		if (!wear) return
		for (const racer of world.racers) {
			const neck = neckOf(racer)
			if (neck)
				paintNeckWear(
					ctx,
					wear,
					neck.x - ARENA_LEFT,
					neck.y,
					racer,
					beatOf(world),
				)
		}
	})

	return [podiums, tracks, necks]
}

// --- Round their necks ------------------------------------------------------

/** How far under the top of their head someone's neck is, in their own pixels, if their sprite doesn't say. */
const NECK_ROWS = 7

/**
 * Where `racer`'s neck is, as they're drawn just now: as far under the top
 * of their head as it is in their first run frame (see
 * `Playable['sprite']['neck']`), as a medal's hung on the Podium; turned
 * round with them. Undefined till they've been drawn.
 */
function neckOf(racer: Racer) {
	const b = racer.body
	const head = headFromFeetOf(b)
	if (!head) return undefined
	const sprite = racer.runner.sprite
	const first = sprite.run[0]
	let dx = 0
	let dy = NECK_ROWS * RUNNER_SCALE
	const found =
		sprite.neck && first
			? headTop(
					first,
					sprite.width * RUNNER_SCALE,
					sprite.height * RUNNER_SCALE,
				)
			: undefined
	if (sprite.neck && found) {
		dx = sprite.neck.x * RUNNER_SCALE - found.x
		dy = sprite.neck.y * RUNNER_SCALE - found.y
	}
	// Their picture faces left: facing right, it's turned round.
	if (b.facing === 1) dx = -dx
	return { x: b.x + head.x + dx, y: b.feetY + head.y + dy }
}

/** Fika Metal's guitar: a red Flying V, its neck rosewood, its headstock black, its strings and pickups. */
const V_RED = '#d8342c'
const V_LIT = '#f47a70'
const V_SHADE = '#9c1f1a'
const FRETBOARD = '#5a3418'
const HEADSTOCK = '#1d1a24'
const PICKUP = '#2b2433'
const CHROME = '#e8ecf2'
const STRAP = '#16121e'
/** The saxophone: brass, lit and shaded, the inside of its bell, its keys, its mouthpiece. */
const BRASS = '#e8b52c'
const BRASS_LIT = '#ffe27a'
const BRASS_SHADE = '#a87a14'
const BELL_INSIDE = '#5a3a08'
const SAX_KEY = '#fff4c8'
const MOUTHPIECE = '#1d1a24'

/** Cells, `[x, y, colour]`, from the neck, drawn facing left as the runners are: `-x` is in front of them. */
type WearCell = [number, number, string]

/**
 * A Flying V, slung round their neck on its strap: its body at their
 * waist, its point back behind them, its neck up and out in front, its
 * headstock at the end.
 */
const GUITAR: WearCell[] = (() => {
	const c: WearCell[] = []
	// The strap, from their neck down and back to its body.
	for (const [x, y] of [
		[1, 1],
		[1, 2],
		[2, 3],
		[2, 4],
	])
		c.push([x, y, STRAP])
	// Its body: two wings back from the join, up and down.
	for (let i = 0; i < 7; i++) {
		c.push([i, 8 - Math.floor(i / 2), V_RED], [i, 9 - Math.floor(i / 2), V_LIT])
		c.push(
			[i, 10 + Math.floor(i / 2), V_RED],
			[i, 11 + Math.floor(i / 2), V_SHADE],
		)
	}
	c.push([-1, 9, V_RED], [-1, 10, V_SHADE], [0, 9, V_RED], [0, 10, V_RED])
	// Its pickups, and its strings over them.
	c.push([1, 9, PICKUP], [1, 10, PICKUP], [3, 9, PICKUP], [3, 10, PICKUP])
	// Its neck, up and out in front, and its headstock.
	for (let i = 1; i <= 9; i++)
		c.push([-1 - i, 9 - Math.round(i * 0.6), FRETBOARD])
	for (let i = 1; i <= 9; i += 3)
		c.push([-1 - i, 9 - Math.round(i * 0.6), CHROME])
	c.push(
		[-11, 3, HEADSTOCK],
		[-12, 3, HEADSTOCK],
		[-12, 2, HEADSTOCK],
		[-11, 2, CHROME],
	)
	// Slung at the waist: all but the strap up a little.
	return c.map(
		([x, y, fill]): WearCell =>
			fill === STRAP ? [x, y, fill] : [x, y - 3, fill],
	)
})()

/**
 * An alto saxophone, hung on its strap in front of them: its mouthpiece up
 * by their mouth, its body down, keys up it, round a bend at the bottom
 * and up into its bell, out in front, open.
 */
const SAX: WearCell[] = (() => {
	const c: WearCell[] = []
	// Its mouthpiece and crook, up in front to their mouth.
	c.push([-3, -3, MOUTHPIECE], [-2, -2, BRASS], [-1, -1, BRASS], [-1, 0, BRASS])
	// Its body, down, lit in front, shaded behind, keys up it.
	for (let y = 1; y <= 10; y++) {
		const wide = y > 6 ? 2 : 1
		for (let x = 0; x < wide + 1; x++)
			c.push([
				-1 + x,
				y,
				x === 0 ? BRASS_LIT : x === wide ? BRASS_SHADE : BRASS,
			])
	}
	for (const y of [3, 5, 7, 9]) c.push([-1, y, SAX_KEY])
	// The bend at the bottom, and up into its bell, out in front.
	c.push(
		[-1, 11, BRASS_SHADE],
		[0, 11, BRASS_SHADE],
		[-2, 11, BRASS],
		[-3, 11, BRASS],
	)
	c.push(
		[-4, 10, BRASS],
		[-3, 10, BRASS_LIT],
		[-4, 9, BRASS_LIT],
		[-5, 9, BRASS],
	)
	c.push([-5, 8, BRASS_LIT], [-6, 8, BRASS], [-4, 8, BRASS], [-6, 7, BRASS_LIT])
	c.push(
		[-7, 7, BRASS],
		[-5, 7, BRASS_SHADE],
		[-7, 6, BRASS_LIT],
		[-6, 6, BELL_INSIDE],
	)
	c.push([-5, 6, BRASS], [-4, 7, BRASS_SHADE])
	return c
})()

/** The giant clock: its gold, lit and shaded; its face; its marks and hands. */
const GOLD = '#f2c230'
const GOLD_LIT = '#fff0a0'
const GOLD_SHADE = '#b0821a'
const CLOCK_FACE = '#f6f2e4'
const CLOCK_INK = '#1d1a24'
/** How big round it is, in cells from its middle; and how far under their neck its middle hangs. */
const CLOCK_R = 4.5
const CLOCK_DOWN = 9

/**
 * A giant clock on a thick gold chain, round their neck, on their chest:
 * the chain down from either side of their neck, a ring of gold lit along
 * its top left, a white face, its marks at twelve, three, six and nine.
 * Its hands are drawn as it goes (see `paintClockHands`).
 */
const CLOCK: WearCell[] = (() => {
	const c: WearCell[] = []
	// The chain, in links, down to its top.
	const links = [
		[-3, 0],
		[-3, 1],
		[-2, 2],
		[-2, 3],
		[-1, 4],
		[2, 0],
		[2, 1],
		[1, 2],
		[1, 3],
		[0, 4],
	]
	links.forEach(([x, y], i) => c.push([x, y, i % 2 ? GOLD_SHADE : GOLD]))
	for (let y = -5; y <= 5; y++)
		for (let x = -5; x <= 4; x++) {
			const d = Math.hypot(x + 0.5, y)
			if (d > CLOCK_R + 0.4) continue
			const rim = d > CLOCK_R - 1
			const lit = x + y < -2
			c.push([
				x,
				CLOCK_DOWN + y,
				rim ? (lit ? GOLD_LIT : x + y > 2 ? GOLD_SHADE : GOLD) : CLOCK_FACE,
			])
		}
	// Its marks.
	for (const [x, y] of [
		[-1, -3],
		[0, -3],
		[2, 0],
		[-1, 3],
		[0, 3],
		[-3, 0],
	])
		c.push([x, CLOCK_DOWN + y, CLOCK_INK])
	return c
})()

const WEAR: Record<NeckWear, WearCell[]> = {
	guitar: GUITAR,
	sax: SAX,
	clock: CLOCK,
}

/** What's round `racer`'s neck, `x`, `y` on the screen its neck, turned round with them. */
function paintNeckWear(
	ctx: CanvasRenderingContext2D,
	wear: NeckWear,
	x: number,
	y: number,
	racer: Racer,
	beat: number,
) {
	// The clock hangs straight down their front, whichever way they face.
	const turned = wear !== 'clock' && racer.body.facing === 1
	const left = snap(x)
	const top = snap(y)
	for (const [cx, cy, fill] of WEAR[wear]) {
		ctx.fillStyle = fill
		ctx.fillRect(
			left + (turned ? -cx - 1 : cx) * CELL,
			top + cy * CELL,
			CELL,
			CELL,
		)
	}
	if (wear !== 'clock') return
	// Its hands: the little one at ten, the big one ticking round a
	// twelfth each beat.
	const cx = left
	const cy = top + CLOCK_DOWN * CELL + CELL / 2
	ctx.fillStyle = CLOCK_INK
	for (const [turn, long] of [
		[10 / 12, 2],
		[Math.floor(beat) / 12, 3.5],
	]) {
		const angle = turn * Math.PI * 2
		for (let d = 0; d <= long; d += 0.5)
			ctx.fillRect(
				snap(cx + Math.sin(angle) * d * CELL - CELL / 2),
				snap(cy - Math.cos(angle) * d * CELL - CELL / 2),
				CELL,
				CELL,
			)
	}
	ctx.fillStyle = GOLD_SHADE
	ctx.fillRect(snap(cx - CELL / 2), snap(cy - CELL / 2), CELL, CELL)
}
