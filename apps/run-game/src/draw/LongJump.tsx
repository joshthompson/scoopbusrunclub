import { createController } from 'scoopjs'
import { For } from 'solid-js'
import { type PixelRect, pixelText, svgUrl } from '../courses/kit/pixelArt'
import { seeded } from '../courses/kit/seeded'
import { LONG_JUMP_PX_PER_M, PIT_FROM, PIT_LENGTH } from '../game/longJump'
import type { World } from '../game/world'
import { ACROSS_SLANT } from './art/track'

/**
 * The long jump, across the track near the finish (see `game/longJump`): the
 * white take-off board, the plasticine just past it, and the sand pit, in
 * its rim, lying flat across the lanes, slanted as everything across the
 * track is; marker boards along its back, a metre apart; and in the sand,
 * the mark each of them left landing in it.
 */

/** The pit's back and front, as offsets from the line everyone runs along: across the lanes. */
const BACK = -14
const FRONT = 22
/** The marker boards' height, over the pit's back edge. */
const MARKERS = 26
/** Room either side of the board and the pit, in the picture, for the slant. */
const BEFORE = 100
const AFTER = 70

const SAND = '#e7cc8a'
const SAND_DARK = '#cfae68'
const SAND_LIGHT = '#f4e2b0'
/** Where someone landed: pressed into the sand, a lip of it thrown up in front. */
const DENT = '#b48f55'
const RIM = '#e9e6df'
const RIM_SHADE = '#b9b5ab'
const BOARD = '#fbfbf8'
const PLASTICINE = '#8a7a62'
const POST = '#5a6166'
const INK = '#0f1f29'

/** How far along a row is shifted, `o` from the line everyone runs along: further back, further along. */
const slant = (o: number) => Math.round(-o * ACROSS_SLANT)

const rectsMarkup = (rects: PixelRect[]) =>
	rects
		.map(
			([x, y, w, h, fill]) =>
				`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`,
		)
		.join('')

/** The pit, the board and the markers, as a picture, `board` at `BEFORE` along it. */
function pitArt() {
	const width = BEFORE + PIT_FROM + PIT_LENGTH + AFTER
	const height = MARKERS + FRONT - BACK
	const rows: PixelRect[] = []
	const random = seeded(8017)
	/** A row's top, in the picture, `o` from the line everyone runs along. */
	const top = (o: number) => MARKERS + o - BACK
	const sandFrom = BEFORE + PIT_FROM
	for (let o = BACK; o < FRONT; o += 2) {
		const s = slant(o + 1)
		const y = top(o)
		const edge = o === BACK || o + 2 >= FRONT
		// Its rim, round the sand, and the sand in it.
		rows.push([sandFrom - 4 + s, y, PIT_LENGTH + 8, 2, edge ? RIM : RIM_SHADE])
		if (!edge) {
			rows.push([sandFrom - 2 + s, y, 2, 2, RIM])
			rows.push([sandFrom + PIT_LENGTH + s, y, 2, 2, RIM])
			rows.push([sandFrom + s, y, PIT_LENGTH, 2, SAND])
			// Raked, roughly: speckles in it, darker and lighter.
			for (let i = 0; i < PIT_LENGTH / 14; i++) {
				const x = sandFrom + s + 2 + Math.floor(random() * (PIT_LENGTH - 6))
				rows.push([x, y, 2, 2, random() < 0.6 ? SAND_DARK : SAND_LIGHT])
			}
		}
		// The board, white, across the runway; the plasticine just past it.
		rows.push([BEFORE - 8 + s, y, 8, 2, BOARD])
		rows.push([BEFORE + s, y, 3, 2, PLASTICINE])
	}
	// Marker boards along the back, a metre apart, from 3 m to 10: a post
	// each, and its number on a white board.
	let text = ''
	for (let m = 3; m <= 10; m++) {
		const x = BEFORE + m * LONG_JUMP_PX_PER_M + slant(BACK)
		const label = String(m)
		const boardWidth = label.length * 6 * 2 + 4
		rows.push([x - 1, 12, 2, MARKERS - 12, POST])
		rows.push([x - boardWidth / 2, 0, boardWidth, 18, BOARD])
		rows.push([x - boardWidth / 2, 16, boardWidth, 2, RIM_SHADE])
		text += pixelText(label, x - boardWidth / 2 + 2, 2, 2, INK)
	}
	return { src: svgUrl(width, height, rectsMarkup(rows) + text), width, height }
}

export function createLongJump(world: World) {
	const jump = world.course.longJump
	if (!jump) return []
	const art = pitArt()
	const left = jump.board - BEFORE
	const ground = world.terrain.groundY(jump.board)
	const top = ground + BACK - MARKERS
	/** Where each landed in the sand: not a signal, so it's read with the tick. */
	const marks = () => {
		world.ticks()
		return world.racers
			.map((racer) => racer.body.longJumpMark)
			.filter((x): x is number => x !== undefined)
	}
	return [
		createController({
			init: () => ({
				id: 'long-jump',
				type: 'mud',
				x: () => left,
				y: () => top,
				width: () => art.width,
				height: () => art.height,
				children: () => (
					<div style={{ position: 'relative' }}>
						<img
							src={art.src}
							alt=""
							width={art.width}
							height={art.height}
							style={{ display: 'block' }}
						/>
						<For each={marks()}>
							{(x) => (
								<div
									style={{
										position: 'absolute',
										left: `${Math.round(x - left) - 7}px`,
										top: `${MARKERS - BACK - 2}px`,
										width: '14px',
										height: '4px',
										background: DENT,
										'box-shadow': `0 2px 0 ${SAND_LIGHT}`,
									}}
								/>
							)}
						</For>
					</div>
				),
			}),
		}),
	]
}
