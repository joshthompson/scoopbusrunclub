import { For, Show } from 'solid-js'
import { svgUrl } from '../courses/kit/pixelArt'
import { seeded } from '../courses/kit/seeded'
import {
	PATH_BACK,
	PATH_FRONT,
	VERGE,
	VIEW_HEIGHT,
	VIEW_WIDTH,
} from '../game/constants'
import type { View } from './Backdrop'

/**
 * A course's sea, out from the foot of its cliff: its water, the island out
 * in it, sand and a path over its top, and the surf where they meet. Drawn
 * in with the Ground, in its own coordinates (`from` its left edge, world
 * y), over the Ground's own layers, which run on over the island; and its
 * waves in front of everyone (`SeaFront`), so what's in it is in it.
 */

const STEP = 4
/** How far out from the island's shore its beach starts coming up out of the sea. */
const SHORE = 96
/** How far down in front of the path its waves in front of everything start. */
const FRONT_WAVES = PATH_FRONT - 4

/**
 * Columns `STEP` wide from `from` to `to` along, from `span`'s top to its
 * bottom in each, as one path, in the drawing's own x from `left`.
 */
function columns(
	left: number,
	from: number,
	to: number,
	span: (x: number) => [number, number] | undefined,
) {
	let d = ''
	for (let x = from; x < to; x += STEP) {
		const range = span(x + STEP / 2)
		if (!range || range[1] <= range[0]) continue
		const top = Math.round(range[0] / 2) * 2
		const bottom = Math.round(range[1] / 2) * 2
		d += ` M${x - left},${top} H${x - left + STEP} V${bottom} H${x - left} Z`
	}
	return d
}

/** The sea, and the island in it, with the Ground. */
export function SeaGround(props: { world: View; left: number; right: number }) {
	const { sea } = props.world.course
	const look = props.world.course.look?.sea
	if (!sea || !look) return null
	const { groundY } = props.world.terrain
	const { level } = sea
	const { left, right } = props
	/** How high the beach is coming up out of the sea, at `x` before the shore. */
	const beach = (x: number) => {
		const t = (x - (sea.to - SHORE)) / SHORE
		const top = groundY(sea.to + 1) - PATH_BACK - VERGE
		return level - (level - top) * Math.max(0, Math.min(1, t)) ** 0.7
	}
	const island = (x: number) => x >= sea.to
	const parts = {
		// Out from the cliff's foot, behind and in front of the line across
		// it; in front of the island, from its shore down.
		water: columns(left, sea.from, right, (x) => [
			x < sea.to - SHORE ? level - PATH_BACK - 4 : level + 2,
			VIEW_HEIGHT,
		]),
		// The beach, coming up out of the sea, and the island's sand.
		sand: columns(left, sea.to - SHORE, right, (x) =>
			island(x)
				? [groundY(x) - PATH_BACK - VERGE, level + 2]
				: [beach(x), level + 2],
		),
		path: columns(left, sea.to, right, (x) => [
			groundY(x) - PATH_BACK,
			groundY(x) + PATH_FRONT,
		]),
		edge: columns(left, sea.to, right, (x) => [
			groundY(x) + PATH_FRONT,
			groundY(x) + PATH_FRONT + 2,
		]),
		wet: columns(left, sea.to - SHORE, right, (x) => [level - 4, level + 2]),
		// Surf at the cliff's foot, and along the shore.
		foam: [
			columns(left, sea.from, sea.from + 12, () => [
				level - PATH_BACK - 6,
				level + PATH_FRONT + 6,
			]),
			columns(left, sea.to - SHORE, right, (x) =>
				Math.floor(x / STEP) % 5 ? [level + 1, level + 4] : [level, level + 5],
			),
		].join(''),
	}
	return (
		<>
			<defs>
				<SeaPattern id="sea-ripples" water={look.water} light={look.light} />
				<linearGradient id="sea-deep" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stop-color={look.deep} stop-opacity="0" />
					<stop offset="1" stop-color={look.deep} stop-opacity="0.7" />
				</linearGradient>
				<CliffRock id="cliff-rock" />
				{/* Patches of shade, over the rock, on a beat of their own, so
				    the rock's doesn't show. */}
				<CliffMottle id="cliff-mottle" />
				{/* Darker, down the cliff, away from the light. */}
				<linearGradient id="cliff-shade" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stop-color="#2a2118" stop-opacity="0" />
					<stop offset="1" stop-color="#2a2118" stop-opacity="0.35" />
				</linearGradient>
			</defs>
			<Crag world={props.world} left={left} />
			<path d={parts.water} fill="url(#sea-ripples)" />
			<path d={parts.water} fill="url(#sea-deep)" />
			<path d={parts.sand} fill={look.sand} />
			<path d={parts.path} fill={look.path} />
			<path d={parts.edge} fill={look.wet} />
			<path d={parts.wet} fill={look.wet} />
			<path d={parts.foam} fill={look.foam} />
		</>
	)
}

/**
 * How far out the cliff's face juts, `down` px below its top: not at all at
 * the top, where the path ends at its edge, and more and more, unevenly,
 * the further down, in crags and ledges, to its foot in the sea.
 */
function jut(down: number, drop: number) {
	const t = Math.max(0, Math.min(1, down / drop))
	const rough =
		Math.sin(down * 0.11) * 7 +
		Math.sin(down * 0.043 + 1.7) * 10 +
		Math.sin(down * 0.27) * 3
	return Math.max(
		0,
		Math.round((t ** 0.9 * 70 + rough * Math.min(1, t * 4)) / 4) * 4,
	)
}

/**
 * The cliff's edge, side on: its face jutting out unevenly further down, in
 * crags, each ledge's top catching the light, its outer edge in shadow;
 * grass hanging over its top, and darker, all down it, the lower it goes.
 */
function Crag(props: { world: View; left: number }) {
	const { sea } = props.world.course
	if (!sea) return null
	const x0 = sea.from - props.left
	const top = Math.round(props.world.terrain.groundY(sea.from - 1)) + PATH_FRONT
	const drop = sea.level + PATH_FRONT - top
	const ROW = 8
	let face = ''
	let shadow = ''
	let lit = ''
	let last = 0
	for (let down = 0; down < drop; down += ROW) {
		const out = jut(down, drop)
		const y = top + down
		if (out > 0) {
			face += ` M${x0},${y} H${x0 + out} V${y + ROW} H${x0} Z`
			shadow += ` M${x0 + out - 8},${y} H${x0 + out} V${y + ROW} H${x0 + out - 8} Z`
		}
		// A ledge, where it juts further out than above: its top in the light.
		if (out > last)
			lit += ` M${x0 + last},${y} H${x0 + out} V${y + 4} H${x0 + last} Z`
		last = out
	}
	// The face behind the field's path, the field's own rock: shaded down it too.
	const shade = `M${x0 - 4000},${top + 12} H${x0} V${sea.level + PATH_FRONT} H${x0 - 4000} Z ${face}`
	// Grass and earth hanging over its top edge, and crumbling off it.
	const lip = [
		[0, -2, 6, 4, '#4e9a36'],
		[0, 2, 4, 6, '#7a5a35'],
		[-14, 12, 10, 4, '#7a5a35'],
		[2, 8, 2, 4, '#4e9a36'],
	] as const
	return (
		<>
			<path d={face} fill="url(#cliff-rock)" />
			<path d={shade} fill="url(#cliff-mottle)" />
			<path d={shade} fill="url(#cliff-shade)" />
			<path d={shadow} fill="rgba(30, 22, 14, 0.45)" />
			<path d={lit} fill="#cfc1a6" />
			<For each={lip}>
				{([dx, dy, w, h, fill]) => (
					<rect x={x0 + dx} y={top + dy} width={w} height={h} fill={fill} />
				)}
			</For>
		</>
	)
}

/** The cliff's rock's pixels: this big, and how many to a tile, across and down. */
const ROCK_CELL = 4
const ROCK_ACROSS = 24
const ROCK_DOWN = 18
const ROCK_SHADES = ['#867560', '#9a896f', '#ab9a7f', '#bcab8f']
const ROCK_DARK = '#5f5141'
const ROCK_LIT = '#d2c4a8'

/**
 * How light the rock is at each cell, 0 to 1: random lumps of it, lighter
 * and darker, smoothed into one another, wrapping round a tile's edges so
 * the tiles meet unseen, and nothing lined up.
 */
const ROCK_LIGHT = (() => {
	const random = seeded(2024)
	let grid = Array.from({ length: ROCK_DOWN }, () =>
		Array.from({ length: ROCK_ACROSS }, () => random()),
	)
	const at = (i: number, j: number) =>
		grid[(j + ROCK_DOWN) % ROCK_DOWN][(i + ROCK_ACROSS) % ROCK_ACROSS]
	for (let pass = 0; pass < 2; pass++)
		grid = grid.map((row, j) =>
			row.map((_, i) => {
				let sum = 0
				for (let dj = -1; dj <= 1; dj++)
					for (let di = -1; di <= 1; di++) sum += at(i + di, j + dj)
				return sum / 9
			}),
		)
	const all = grid.flat()
	const lo = Math.min(...all)
	const hi = Math.max(...all)
	return grid.map((row) => row.map((v) => (v - lo) / (hi - lo)))
})()
const rockLight = (i: number, j: number) =>
	ROCK_LIGHT[(j + ROCK_DOWN) % ROCK_DOWN][(i + ROCK_ACROSS) % ROCK_ACROSS]

/**
 * Rock, in pixels: lumps of it lighter and darker, the light catching their
 * tops, and cracks stepping down through it. No layers across it: lined
 * up, tile after tile, they look like bricks.
 */
function CliffRock(props: { id: string }) {
	const cells: [number, number, string][] = []
	for (let j = 0; j < ROCK_DOWN; j++)
		for (let i = 0; i < ROCK_ACROSS; i++) {
			const light = rockLight(i, j)
			const shade = Math.min(
				ROCK_SHADES.length - 1,
				Math.floor(light * ROCK_SHADES.length),
			)
			cells.push([i, j, ROCK_SHADES[shade]])
		}
	// The light catching the tops of its lumps: a lighter cell over a darker.
	for (let j = 1; j < ROCK_DOWN; j++)
		for (let i = 0; i < ROCK_ACROSS; i++)
			if (rockLight(i, j - 1) > 0.78 && rockLight(i, j) < 0.62)
				cells.push([i, j - 1, ROCK_LIT])
	// Cracks, stepping down through it.
	for (const [i, j, steps] of [
		[8, 6, 4],
		[18, 0, 4],
		[3, 12, 3],
		[21, 12, 4],
	])
		for (let k = 0; k < steps; k++)
			cells.push([(i + Math.floor(k / 2)) % ROCK_ACROSS, j + k, ROCK_DARK])
	return (
		<pattern
			id={props.id}
			patternUnits="userSpaceOnUse"
			width={ROCK_ACROSS * ROCK_CELL}
			height={ROCK_DOWN * ROCK_CELL}
		>
			<For each={cells}>
				{([i, j, fill]) => (
					<rect
						x={i * ROCK_CELL}
						y={j * ROCK_CELL}
						width={ROCK_CELL}
						height={ROCK_CELL}
						fill={fill}
					/>
				)}
			</For>
		</pattern>
	)
}

/** Blocks of shade, in the rock's own pixels, on a beat of their own. */
function CliffMottle(props: { id: string }) {
	const random = seeded(311)
	const blocks = Array.from({ length: 9 }, () => ({
		x: Math.floor(random() * 34) * ROCK_CELL,
		y: Math.floor(random() * 24) * ROCK_CELL,
		w: (2 + Math.floor(random() * 5)) * ROCK_CELL,
		h: (1 + Math.floor(random() * 3)) * ROCK_CELL,
		fill: random() < 0.6 ? 'rgba(40,30,20,0.16)' : 'rgba(255,245,225,0.12)',
	}))
	return (
		<pattern
			id={props.id}
			patternUnits="userSpaceOnUse"
			width={148}
			height={108}
		>
			<For each={blocks}>
				{(b) => <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={b.fill} />}
			</For>
		</pattern>
	)
}

/** Ripples on the water, light and dark. */
function SeaPattern(props: { id: string; water: string; light: string }) {
	return (
		<pattern id={props.id} patternUnits="userSpaceOnUse" width={64} height={18}>
			<rect width={64} height={18} fill={props.water} />
			<rect x={4} y={3} width={14} height={2} fill={props.light} />
			<rect x={34} y={9} width={10} height={2} fill={props.light} />
			<rect x={22} y={14} width={18} height={2} fill="rgba(0,20,40,0.2)" />
			<rect x={50} y={5} width={8} height={2} fill="rgba(0,20,40,0.15)" />
		</pattern>
	)
}

/**
 * Streaks of wind across the sky, where the headwind blows (see `windAt`):
 * more of them, and plainer, the higher up, where it's strongest. Across
 * the screen, wherever the camera is, and as wide as it gets zoomed out.
 */
const WIND = (() => {
	const random = seeded(77)
	return Array.from({ length: 26 }, () => {
		const up = Math.sqrt(random())
		return {
			x: Math.round(random() * VIEW_WIDTH * 1.5),
			height: Math.round(260 + up * 360),
			width: Math.round(30 + random() * 60),
			opacity: (0.15 + up * 0.45).toFixed(2),
			seconds: (0.5 + random() * 0.4).toFixed(2),
			delay: (-random()).toFixed(2),
		}
	})
})()

/** A tile of the waves' crests: this wide and tall, and how far into it the water's up to. */
const CREST_WIDTH = 64
const CREST_HEIGHT = 16
const CREST_SINK = 6

/**
 * The waves' crests, in pixels: rolling up and down along, foam along their
 * tops, the light under it, and the water on down to the tile's foot.
 */
const crests = (look: { water: string; light: string; foam: string }) => {
	const cells: string[] = []
	for (let x = 0; x < CREST_WIDTH; x += 4) {
		const wave = Math.sin((x / CREST_WIDTH) * Math.PI * 2)
		const top = 6 + Math.round(wave * 2) * 2
		cells.push(
			`<rect x="${x}" y="${top + 2}" width="4" height="${CREST_HEIGHT - top - 2}" fill="${look.water}"/>`,
		)
		// Foam on the crest's front, where it's breaking; the light under it.
		if (wave < 0.4)
			cells.push(
				`<rect x="${x}" y="${top}" width="4" height="2" fill="${look.foam}"/>`,
			)
		else
			cells.push(
				`<rect x="${x}" y="${top}" width="4" height="2" fill="${look.water}"/>`,
			)
		if (wave > -0.6 && wave < 0.6)
			cells.push(
				`<rect x="${x}" y="${top + 4}" width="4" height="2" fill="${look.light}"/>`,
			)
	}
	return svgUrl(CREST_WIDTH, CREST_HEIGHT, cells.join(''))
}

/**
 * The sea's waves in front of everyone in it: the bus's wheels, afloat, a
 * whale, under, and anyone who's fallen in, gone under. Moved with the
 * camera, as the Ground is.
 */
export function SeaFront(props: { world: View; from: number; to: number }) {
	const { sea } = props.world.course
	const look = props.world.course.look?.sea
	if (!sea || !look) return null
	const width = props.to - props.from
	const top = sea.level + FRONT_WAVES
	const left = sea.from - props.from
	return (
		<div
			style={{
				position: 'absolute',
				top: 0,
				left: 0,
				width: `${width}px`,
				height: `${VIEW_HEIGHT}px`,
				transform: `translateX(${Math.round(props.from - props.world.camera())}px)`,
				'will-change': 'transform',
				'pointer-events': 'none',
			}}
		>
			{/* The headwind up high, streaking by: there to be seen over the sea. */}
			<Show
				when={
					props.world.camera() + VIEW_WIDTH > sea.from &&
					props.world.camera() < sea.to
				}
			>
				<div
					style={{
						position: 'absolute',
						top: 0,
						left: `${Math.round(props.world.camera() - props.from)}px`,
					}}
				>
					<For each={WIND}>
						{(streak) => (
							<div
								style={{
									position: 'absolute',
									left: `${streak.x}px`,
									top: `${sea.level - streak.height}px`,
									width: `${streak.width}px`,
									height: '2px',
									background: 'white',
									opacity: 0,
									'--wind': streak.opacity,
									animation: `wind-streak ${streak.seconds}s linear ${streak.delay}s infinite`,
								}}
							/>
						)}
					</For>
				</div>
			</Show>
			<Show when={left < width}>
				{/* Its crests, rolling in, and the water on down under them. */}
				<div
					style={{
						position: 'absolute',
						left: `${left}px`,
						right: 0,
						top: `${top - CREST_HEIGHT + CREST_SINK}px`,
						height: `${CREST_HEIGHT}px`,
						'background-image': `url("${crests(look)}")`,
						'background-repeat': 'repeat-x',
						animation: 'wave-roll 3s steps(16) infinite',
						opacity: 0.92,
					}}
				/>
				<div
					style={{
						position: 'absolute',
						left: `${left}px`,
						right: 0,
						top: `${top + CREST_SINK}px`,
						// On down past the bottom, for the camera looking down.
						height: `${VIEW_HEIGHT - top + 200}px`,
						background: `linear-gradient(to bottom, ${look.water}, ${look.deep} 120px)`,
						opacity: 0.92,
					}}
				/>
			</Show>
		</div>
	)
}
