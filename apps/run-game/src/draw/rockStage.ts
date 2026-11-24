import { createController, createObjectSignal } from 'scoopjs'
import type { JSX } from 'solid-js'
import { VIEW_HEIGHT, VIEW_WIDTH } from '../game/constants'
import type { World } from '../game/world'
import { ARENA_LEFT } from '../minigames/arena'
import {
	MAX_ROUNDS,
	NEWS_TICKS,
	introTicks,
	rockOf,
	roundStart,
	stepAt,
} from '../minigames/lollapascoopza'
import { SONGS } from '../music/lollapascoopza'
import { cachedArt } from './canvasArt'
import { LANE_COLOURS, beatOf, paintText, textWide } from './lollapascoopza'

/**
 * Lollapascoopza's set: a festival's main stage at night. Its lighting rig
 * across the top on a tower each side, speakers hung from it, amp stacks
 * on the stage, flame cannons on them; a huge LED wall at the back, a
 * Ferris wheel and a big top beyond it in the dark, and the crowd at the
 * front, heads and hands up. It all goes with the song: the lights sweep
 * and change colour each bar, the wall's level meters jump on the beat
 * and the festival's name comes up on it in the chorus, the crowd bounces,
 * and the flames go up on "Go!", at every cut and for the winner, sparks
 * pouring down off the rig.
 */

/** A pixel, as everything's drawn: 2 px. */
const CELL = 2
const snap = (n: number) => Math.round(n / CELL) * CELL

/** A number 0 to 1 from `n`, the same every time. */
const hash = (n: number) => {
	let x = Math.imul(n ^ 0x2545f491, 0x9e3779b1)
	x = Math.imul(x ^ (x >>> 15), 0x85ebca6b)
	return ((x ^ (x >>> 13)) >>> 0) / 4294967296
}
/** `hex` see-through, `alpha` of it. */
const glow = (hex: string, alpha: number) =>
	`${hex}${Math.round(Math.max(0, Math.min(1, alpha)) * 255)
		.toString(16)
		.padStart(2, '0')}`

// --- Its colours ----------------------------------------------------------

const SKY = ['#0a0620', '#0e0928', '#130c31', '#19103b', '#201445', '#28184f']
const STAR = '#d8d0ff'
const DISTANT = '#140c26'
const DISTANT_LIT = '#1c1232'
const WHEEL = '#2e2450'
const TENT = '#4a2238'
const TENT_STRIPE = '#5c4a5e'
const STEEL = '#5b5f70'
const STEEL_LIT = '#8a8fa2'
const STEEL_SHADE = '#3a3d4c'
const CANOPY = '#08060e'
const CABINET = '#1c1b24'
const CABINET_LIT = '#34333f'
const GRILLE = '#121118'
const AMP = '#1a1820'
const AMP_CLOTH = '#2c2834'
const AMP_WEAVE = '#24202c'
const AMP_CORNER = '#8a8a96'
const KNOB = '#d8b44a'
const WALL_FRAME = '#2a2838'
const SCREEN = '#06040c'
const DECK = '#2a2238'
const DECK_LIT = '#3e3452'
const STAGE_FRONT = '#0e0a18'
const CROWD = ['#2c1e4c', '#1e1438']
const CROWD_RIM = ['#5c4694', '#46347a']
const SKIN_DARK = '#2a1c40'

/** The lights' colours, one a bar, round and round. */
const LIGHTS = [
	'#ff4fd8',
	'#38c8ff',
	'#ffd23c',
	'#7dff5a',
	'#ff6a3c',
	'#a070ff',
]

// --- Where everything is, across the screen and down it --------------------

const TRUSS_TOP = 6
const TRUSS_BOTTOM = 28
const TOWERS = [8, VIEW_WIDTH - 34]
const TOWER_WIDE = 26
const ARRAYS = [46, VIEW_WIDTH - 90]
const ARRAY_WIDE = 44
const WALL = { left: 200, right: 760, top: 240, bottom: 440 }
const AMPS = [36, VIEW_WIDTH - 112]
const AMP_WIDE = 76
/** The moving lights under the rig, and the flame cannons on the amps. */
const MOVERS = [130, 214, 300, 660, 746, 830]
const FLAMES = [AMPS[0] + AMP_WIDE / 2, AMPS[1] + AMP_WIDE / 2]
const WHEEL_AT = { x: 150, y: 300, r: 84 }

/** How long a burst of flame lasts, and how high it goes. */
const FLAME_TICKS = 34
const FLAME_TALL = 190

/** One picture over the whole arena, `type` saying what it's in front of. */
function layer(
	world: World,
	id: string,
	type: string,
	paint: (ctx: CanvasRenderingContext2D) => void,
) {
	return createController({
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
}

export function createRockStage(world: World) {
	const show = rockOf(world)
	if (!show) return []
	const ground = show.ground

	/** How the song's going: the beat, how hard it's just hit, the bar, and whether it's the chorus. */
	const moment = () => {
		const beat = beatOf(world)
		const now = world.raceTicks()
		const running = world.phase() === 'running' && now > 0
		const step = running ? stepAt(show?.song ?? 0, now) : -1
		const bar = Math.floor(beat / 4)
		return {
			beat,
			now,
			running,
			pulse: 1 - (((beat % 1) + 1) % 1),
			bar,
			chorus: running && step >= 0 && Math.floor(step / 16) % 16 >= 8,
			light: LIGHTS[((bar % LIGHTS.length) + LIGHTS.length) % LIGHTS.length],
			ended: show.endedAt,
		}
	}

	const back = layer(world, 'rock-stage', 'scenery', (ctx) => {
		const m = moment()
		ctx.drawImage(
			cachedArt(`rock-stage:${ground}`, VIEW_WIDTH, VIEW_HEIGHT, (c) =>
				paintBack(c, ground),
			),
			0,
			0,
			VIEW_WIDTH,
			VIEW_HEIGHT,
		)
		// The Ferris wheel's bulbs, round its rim, chasing.
		for (let i = 0; i < 24; i++) {
			const a = (i / 24) * Math.PI * 2 + world.ticks() / 400
			const on = (i + Math.floor(world.ticks() / 10)) % 3 === 0
			ctx.fillStyle = on ? '#ffe9a0' : '#7a5a3a'
			ctx.fillRect(
				snap(WHEEL_AT.x + Math.cos(a) * WHEEL_AT.r),
				snap(WHEEL_AT.y + Math.sin(a) * WHEEL_AT.r),
				CELL,
				CELL,
			)
		}
		paintWall(ctx, world, m)
		// The lamps along the front of the rig, flashing on alternate beats.
		for (let x = 60, i = 0; x < VIEW_WIDTH - 50; x += 44, i++) {
			const on = m.running ? (i + Math.floor(m.beat)) % 2 === 0 : i % 2 === 0
			const colour = LIGHTS[(i + Math.max(0, m.bar)) % LIGHTS.length]
			ctx.fillStyle = '#16141c'
			ctx.fillRect(x - 2, TRUSS_BOTTOM, 12, 10)
			ctx.fillStyle = on ? colour : '#3a3442'
			ctx.fillRect(x, TRUSS_BOTTOM + 6, 8, 4)
			if (on) {
				ctx.fillStyle = glow(colour, 0.25 * (0.4 + 0.6 * m.pulse))
				ctx.fillRect(x - 4, TRUSS_BOTTOM + 10, 16, 8)
			}
		}
		// The moving lights' beams, sweeping down across the stage, in the
		// bar's colour; wider and brighter in the chorus.
		const strength = m.running ? (m.chorus ? 0.16 : 0.11) : 0.07
		MOVERS.forEach((fx, i) => {
			const towardsMiddle = fx < VIEW_WIDTH / 2 ? 1 : -1
			const swing = m.running
				? Math.sin((m.beat * Math.PI) / 4 + i * 1.3)
				: Math.sin(world.ticks() / 90 + i)
			const angle = towardsMiddle * 0.25 + swing * 0.42
			const colour = m.chorus ? LIGHTS[(i + m.bar) % LIGHTS.length] : m.light
			const reach = Math.tan(angle)
			for (let y = TRUSS_BOTTOM + 14; y < ground; y += 4) {
				const down = y - TRUSS_BOTTOM - 10
				const cx = fx + 4 + reach * down
				const half = 3 + down * (m.chorus ? 0.1 : 0.075)
				ctx.fillStyle = glow(colour, strength * (1 - down / 900))
				ctx.fillRect(snap(cx - half), y, snap(half * 2), 4)
				ctx.fillStyle = glow('#ffffff', strength * 0.5)
				ctx.fillRect(snap(cx - half * 0.3), y, snap(half * 0.6) + CELL, 4)
			}
			// The light itself, under the rig, its lens lit.
			ctx.fillStyle = '#26242e'
			ctx.fillRect(fx - 2, TRUSS_BOTTOM, 12, 4)
			ctx.fillRect(fx, TRUSS_BOTTOM + 4, 8, 10)
			ctx.fillStyle = colour
			ctx.fillRect(snap(fx + 2 + reach * 4), TRUSS_BOTTOM + 10, 4, 4)
		})
		// The footlights along the stage's front edge.
		for (let x = 24, i = 0; x < VIEW_WIDTH; x += 32, i++) {
			ctx.fillStyle =
				(i + Math.floor(m.beat * 2)) % 4 === 0 && m.running
					? '#fff4c0'
					: '#8a6a2a'
			ctx.fillRect(x, ground + 14, 6, 2)
		}
	})

	// Haze, drifting low over the stage, lit faintly the bar's colour.
	const haze = layer(world, 'rock-haze', 'smoke', (ctx) => {
		const m = moment()
		const t = world.ticks()
		for (let i = 0; i < 9; i++) {
			const wide = 120 + 60 * hash(i * 3)
			const x = ((hash(i) * 1200 + t * (0.15 + 0.2 * hash(i + 9))) % 1200) - 120
			const y = ground - 18 + 10 * hash(i + 4)
			const rows = 8
			for (let row = 0; row < rows; row++) {
				const v = (row + 0.5) / rows - 0.5
				const half = (wide / 2) * Math.sqrt(1 - 4 * v * v)
				ctx.fillStyle = glow(row < 3 ? m.light : '#c8b8e8', 0.05)
				ctx.fillRect(
					snap(x - half),
					snap(y + row * CELL * 2),
					snap(half * 2),
					CELL * 2,
				)
			}
		}
	})

	const pyro = layer(world, 'rock-pyro', 'pyro', (ctx) => {
		const m = moment()
		const now = m.now
		const ended = m.ended
		const bursts: number[] = []
		const sparks: number[] = []
		if (m.running) {
			bursts.push(0)
			// Each time the band speeds up.
			for (let r = 1; r < MAX_ROUNDS; r++) {
				const at = roundStart(show?.song ?? 0, r)
				if (at > now || (ended !== undefined && at > ended)) break
				bursts.push(at)
				sparks.push(at)
			}
			if (ended !== undefined) {
				bursts.push(ended, ended + 40, ended + 80)
				sparks.push(ended)
			}
		}
		// Flames off the amps.
		for (const at of bursts) {
			const t = now - at
			if (t < 0 || t >= FLAME_TICKS) continue
			for (const fx of FLAMES) paintFlame(ctx, fx, ground - 112, t, at + fx)
		}
		// Sparks pouring down off the rig.
		for (const at of sparks) {
			const t = now - at
			if (t < 0 || t > 90) continue
			for (let x = 120; x <= VIEW_WIDTH - 120; x += 24)
				for (let k = 0; k < 6; k++) {
					const born = k * 9 + Math.floor(hash(x + k) * 8)
					const age = t - born
					if (age < 0 || age > 50 || t > 60 + born) continue
					const y = TRUSS_BOTTOM + 6 + age * 6 + age * age * 0.05
					if (y > ground) continue
					const sx = snap(x + (hash(x * 7 + k) - 0.5) * 10)
					// Fanning out as they fall, glittering, a short tail.
					const spread = snap(sx + (hash(x + k * 5) - 0.5) * age * 1.6)
					ctx.fillStyle = glow('#ffc860', 0.4)
					ctx.fillRect(spread, snap(y - 4), CELL, 4)
					ctx.fillStyle = hash(x + k * 3 + age) < 0.5 ? '#ffffff' : '#ffd23c'
					ctx.fillRect(spread, snap(y), CELL, CELL)
					if (hash(x * 3 + k + age) < 0.3) {
						ctx.fillRect(spread - CELL, snap(y), CELL, CELL)
						ctx.fillRect(spread + CELL, snap(y), CELL, CELL)
					}
				}
		}
		// Confetti for the winner, fluttering down over everything.
		if (ended !== undefined) {
			const t = now - ended
			const colours = [
				...LANE_COLOURS.map(([base]) => base),
				...world.racers.map((r) => r.colour ?? '#ffffff'),
			]
			for (let i = 0; i < 90; i++) {
				const fall = 1.2 + hash(i * 5) * 1.4
				// Thrown up over the rig at the start, some later than others, round again once down.
				const travel = t * fall * 2 - hash(i * 9) * 500
				if (travel < 0) continue
				const y = -20 + (travel % 600)
				const x = hash(i * 3) * VIEW_WIDTH + Math.sin(t / 12 + i) * 14
				const flat = Math.floor(t / 6 + i) % 2 === 0
				ctx.fillStyle = colours[i % colours.length]
				ctx.fillRect(snap(x), snap(y), flat ? 6 : 2, flat ? 2 : 6)
			}
		}
	})

	// The crowd at the front, heads and hands up, bouncing on the beat.
	const crowd = layer(world, 'rock-crowd', 'foreground', (ctx) => {
		const m = moment()
		const rows: [number, number, number][] = [
			// Their heads' tops, how far apart, and which row.
			[ground + 12, 22, 0],
			[ground + 28, 26, 1],
		]
		for (const [headTop, apart, row] of rows)
			for (
				let x = -10 + row * 11, i = row * 100;
				x < VIEW_WIDTH + 10;
				x += apart, i++
			) {
				const h = hash(i)
				const fill = CROWD[row]
				const rim = CROWD_RIM[row]
				// Bouncing on the beat, not all together.
				const bounce = m.running
					? Math.round((m.pulse ** 2 * (2 + 4 * h)) / CELL) *
						CELL *
						((i + Math.floor(m.beat)) % 2 ? 1 : 0.5)
					: 0
				const px = snap(x + (h - 0.5) * 6)
				const top = snap(headTop - bounce - (h < 0.15 ? 4 : 0))
				// Arms up: more of them in the chorus, pumping.
				const up = h < (m.chorus ? 0.7 : 0.35)
				if (up) {
					const reach = 18 + Math.round(m.pulse * 4) * CELL * (h < 0.2 ? 1 : 0)
					const both = h < 0.12
					const armTop = Math.max(ground - 2, top - reach)
					ctx.fillStyle = fill
					ctx.fillRect(px + 12, armTop + 4, 4, top + 16 - armTop)
					ctx.fillRect(px + 10, armTop, 8, 6)
					if (both) {
						ctx.fillRect(px - 6, armTop + 4, 4, top + 16 - armTop)
						ctx.fillRect(px - 8, armTop, 8, 6)
					}
					// A lighter held up, in the chorus.
					if (m.chorus && hash(i + 77) < 0.3) {
						const flicker = hash(i + world.ticks()) < 0.5 ? 0 : CELL
						ctx.fillStyle = glow('#ffb040', 0.25)
						ctx.fillRect(px + 8, armTop - 12, 16, 12)
						ctx.fillStyle = '#ff9a2a'
						ctx.fillRect(px + 14, armTop - 6 + flicker, 4, 6 - flicker)
						ctx.fillStyle = '#fff0a0'
						ctx.fillRect(px + 14, armTop - 4, 2, 4)
					}
				}
				// Head and shoulders, the rig's light along their tops.
				ctx.fillStyle = fill
				ctx.fillRect(px + 2, top, 8, 2)
				ctx.fillRect(px, top + 2, 12, 10)
				ctx.fillRect(px - 6, top + 12, 24, VIEW_HEIGHT - top - 12)
				ctx.fillStyle = rim
				ctx.fillRect(px + 2, top, 8, 2)
				ctx.fillRect(px - 4, top + 12, 6, 2)
				ctx.fillRect(px + 10, top + 12, 6, 2)
				// Someone up on someone's shoulders, the best view there is.
				if (row === 1 && i % 17 === 5) {
					const t2 = top - 26
					ctx.fillStyle = SKIN_DARK
					ctx.fillRect(px + 2, t2, 8, 2)
					ctx.fillRect(px, t2 + 2, 12, 10)
					ctx.fillRect(px - 4, t2 + 12, 20, 14)
					ctx.fillRect(px - 10, Math.max(ground - 6, t2 - 6), 4, 20)
					ctx.fillRect(px + 18, Math.max(ground - 6, t2 - 6), 4, 20)
					ctx.fillStyle = rim
					ctx.fillRect(px + 2, t2, 8, 2)
				}
			}
	})

	return [back, haze, pyro, crowd]
}

/** A burst of flame up out of a cannon at `x`, its nozzle at `y`, `t` ticks in. */
function paintFlame(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	t: number,
	seed: number,
) {
	const rise = Math.min(1, t / 5)
	const fade = t < 22 ? 1 : 1 - (t - 22) / (FLAME_TICKS - 22)
	const tall = FLAME_TALL * rise * (0.7 + 0.3 * fade)
	const lift = t < 22 ? 0 : (t - 22) * 6
	for (let up = 0; up < tall; up += 4) {
		const through = up / tall
		const flicker = hash(seed * 31 + t * 7 + up) - 0.5
		const wide =
			(10 + 26 * Math.sin(Math.PI * Math.min(1, through * 1.3))) * fade
		const cx = x + flicker * 8 * through
		const rowY = y - lift - up
		const colours: [number, string][] = [
			[1, through > 0.8 ? '#a8281e' : '#e8452a'],
			[0.7, '#ff8a1c'],
			[0.42, '#ffd23c'],
			[0.18, '#fff6d0'],
		]
		for (const [share, fill] of colours) {
			const half = (wide * share) / 2
			if (half < 1) continue
			ctx.fillStyle = fill
			ctx.fillRect(snap(cx - half), snap(rowY), snap(half * 2) + CELL, 4)
		}
	}
	// Its glow round it.
	ctx.fillStyle = glow('#ff8a1c', 0.12 * fade)
	ctx.fillRect(snap(x - 50), snap(y - lift - tall), 100, snap(tall))
}

/** The LED wall at the back, whatever it's showing just now. */
function paintWall(
	ctx: CanvasRenderingContext2D,
	world: World,
	m: {
		beat: number
		now: number
		running: boolean
		pulse: number
		bar: number
		chorus: boolean
		light: string
		ended?: number
	},
) {
	const wide = WALL.right - WALL.left
	const tall = WALL.bottom - WALL.top
	const show = rockOf(world)
	/** Words across it, as big as fit, at `y` down it. */
	const words = (text: string, fill: string, most = 8, y?: number) => {
		let cell = most
		while (cell > 2 && textWide(text, cell) > wide - 24) cell -= 2
		const top = y ?? WALL.top + (tall - 7 * cell) / 2
		paintText(
			ctx,
			text,
			snap(WALL.left + (wide - textWide(text, cell)) / 2),
			snap(top),
			cell,
			fill,
		)
	}
	// Level meters, jumping on the beat: blocks of 8, pink to gold up them.
	const meters = (strength: number) => {
		for (let i = 0; i < 35; i++) {
			const level =
				strength *
				(0.3 + 0.7 * m.pulse) *
				(0.3 + 0.7 * Math.abs(Math.sin(i * 0.9 + m.beat * 1.7 + i * i)))
			const blocks = Math.round((level * tall) / 8)
			for (let b = 0; b < blocks; b++) {
				const share = b / (tall / 8)
				ctx.fillStyle =
					share < 0.4 ? '#8a2456' : share < 0.75 ? '#9a5028' : '#a8902c'
				ctx.fillRect(WALL.left + i * 16, WALL.bottom - (b + 1) * 8, 14, 6)
			}
		}
	}
	const now = m.now
	const flash = Math.floor(now / 4) % 2 ? '#ff3d3d' : '#ffffff'
	/** The band just sped up. */
	let faster = false
	for (let r = 1; r < MAX_ROUNDS; r++)
		if (
			now >= roundStart(show?.song ?? 0, r) &&
			now - roundStart(show?.song ?? 0, r) < NEWS_TICKS
		)
			faster = true
	if (!m.running || now < introTicks(show?.song ?? 0)) {
		// Waiting to start, and through the intro: the festival's name,
		// twinkling, and what the band's playing.
		meters(0.25)
		words(
			'LOLLAPASCOOPZA',
			Math.floor(world.ticks() / 20) % 2 ? '#ff4fd8' : '#ffd23c',
			6,
			WALL.top + 40,
		)
		words('NOW PLAYING', '#8a80b0', 2, WALL.top + 104)
		words(SONGS[show?.song ?? 0]?.name ?? '', '#ffffff', 4, WALL.top + 124)
	} else if (m.ended !== undefined) {
		// It's over: whoever won.
		const order = world.order()
		const winner = order?.[0]
		meters(0.5)
		words(
			world.racers.length > 1 && winner ? `${winner.runner.name}` : 'ROCK ON!',
			Math.floor(world.ticks() / 6) % 2 ? '#ffd23c' : '#ffffff',
			8,
			WALL.top + 40,
		)
		if (world.racers.length > 1)
			words('ROCKS!', winner?.colour ?? '#ff4fd8', 6, WALL.top + 110)
	} else if (faster) {
		// The band's sped up.
		meters(0.4)
		words('FASTER!', flash, 8)
	} else if (m.chorus) {
		meters(0.55)
		const bounce = Math.round(m.pulse * 3) * CELL
		words(
			'LOLLAPASCOOPZA',
			LIGHTS[(Math.floor(m.beat) + 6) % LIGHTS.length],
			6,
			WALL.top + 76 - bounce,
		)
	} else meters(0.7)
	// Once it's under way, what the band's playing, along its top: but not
	// over who's won.
	if (
		m.running &&
		now >= introTicks(show?.song ?? 0) &&
		m.ended === undefined
	) {
		words('NOW PLAYING', '#8a80b0', 2, WALL.top + 8)
		words(SONGS[show?.song ?? 0]?.name ?? '', '#ffffff', 4, WALL.top + 26)
	}
	// Its panels' seams.
	ctx.fillStyle = '#000000'
	for (let x = WALL.left + 40; x < WALL.right; x += 40)
		ctx.fillRect(x, WALL.top, CELL, tall)
	for (let y = WALL.top + 40; y < WALL.bottom; y += 40)
		ctx.fillRect(WALL.left, y, wide, CELL)
}

/** Everything that doesn't move: the sky, what's beyond, the rig, speakers, amps and the stage. */
function paintBack(ctx: CanvasRenderingContext2D, ground: number) {
	// The night sky, in bands, darkest at the top, and stars.
	const band = Math.ceil(ground / SKY.length / CELL) * CELL
	SKY.forEach((fill, i) => {
		ctx.fillStyle = fill
		ctx.fillRect(0, i * band, VIEW_WIDTH, band)
	})
	ctx.fillStyle = STAR
	for (let i = 0; i < 46; i++)
		ctx.fillRect(
			snap(hash(i * 11) * VIEW_WIDTH),
			snap(40 + hash(i * 13) * 220),
			CELL,
			CELL,
		)

	// The Ferris wheel beyond, its rim, spokes and gondolas, dark.
	const { x: wx, y: wy, r: wr } = WHEEL_AT
	ctx.fillStyle = WHEEL
	for (let a = 0; a < 360; a += 3) {
		const rad = (a * Math.PI) / 180
		ctx.fillRect(
			snap(wx + Math.cos(rad) * wr),
			snap(wy + Math.sin(rad) * wr),
			CELL * 2,
			CELL * 2,
		)
	}
	for (let s = 0; s < 8; s++) {
		const rad = (s / 8) * Math.PI * 2
		for (let d = 0; d < wr; d += 2)
			ctx.fillRect(
				snap(wx + Math.cos(rad) * d),
				snap(wy + Math.sin(rad) * d),
				CELL,
				CELL,
			)
		ctx.fillRect(
			snap(wx + Math.cos(rad) * wr) - 4,
			snap(wy + Math.sin(rad) * wr) + 4,
			10,
			8,
		)
	}
	// Its legs.
	for (let d = 0; d < ground - wy; d += 2) {
		ctx.fillRect(snap(wx - d * 0.4), wy + d, 4, 2)
		ctx.fillRect(snap(wx + d * 0.4), wy + d, 4, 2)
	}
	// A big top beyond, on the right, striped, a pennant on its pole.
	const tentX = 840
	const tentTop = 330
	for (let y = tentTop; y < ground; y += 2) {
		const half = Math.min(80, (y - tentTop) * 1.1 + 4)
		for (let x = -half; x < half; x += 12) {
			ctx.fillStyle = Math.floor((x + 120) / 12) % 2 ? TENT : TENT_STRIPE
			ctx.fillRect(snap(tentX + x), y, Math.min(12, half - x), 2)
		}
	}
	ctx.fillStyle = TENT
	ctx.fillRect(tentX - 1, tentTop - 22, 2, 22)
	ctx.fillStyle = '#7a3a4a'
	ctx.fillRect(tentX + 1, tentTop - 22, 12, 6)
	// Trees all along the back, dark.
	for (let x = 0; x < VIEW_WIDTH; x += 2) {
		const top =
			400 +
			Math.round((Math.sin(x / 23) * 8 + Math.sin(x / 9) * 4) / CELL) * CELL
		ctx.fillStyle = DISTANT
		ctx.fillRect(x, top, 2, ground - top)
		ctx.fillStyle = DISTANT_LIT
		ctx.fillRect(x, top, 2, 2)
	}

	// The LED wall, on its scaffold.
	ctx.fillStyle = WALL_FRAME
	ctx.fillRect(
		WALL.left - 4,
		WALL.top - 4,
		WALL.right - WALL.left + 8,
		WALL.bottom - WALL.top + 8,
	)
	ctx.fillRect(WALL.left + 20, WALL.bottom, 6, ground - WALL.bottom)
	ctx.fillRect(WALL.right - 26, WALL.bottom, 6, ground - WALL.bottom)
	ctx.fillRect(
		(WALL.left + WALL.right) / 2 - 3,
		WALL.bottom,
		6,
		ground - WALL.bottom,
	)
	ctx.fillStyle = SCREEN
	ctx.fillRect(
		WALL.left,
		WALL.top,
		WALL.right - WALL.left,
		WALL.bottom - WALL.top,
	)

	// The rig: towers either side, a truss across the top under a canopy.
	ctx.fillStyle = CANOPY
	ctx.fillRect(0, 0, VIEW_WIDTH, TRUSS_TOP)
	for (const tx of TOWERS) {
		lattice(ctx, tx, TRUSS_TOP, TOWER_WIDE, ground - TRUSS_TOP, true)
		ctx.fillStyle = STEEL_SHADE
		ctx.fillRect(tx - 4, ground - 6, TOWER_WIDE + 8, 6)
	}
	lattice(ctx, 0, TRUSS_TOP, VIEW_WIDTH, TRUSS_BOTTOM - TRUSS_TOP, false)

	// The speakers hung from it, either side, curving in at the bottom.
	for (const ax of ARRAYS) {
		const inward = ax < VIEW_WIDTH / 2 ? 1 : -1
		ctx.fillStyle = STEEL_SHADE
		ctx.fillRect(ax + ARRAY_WIDE / 2 - 1, TRUSS_BOTTOM, 2, 6)
		for (let i = 0; i < 8; i++) {
			const x = ax + inward * [0, 0, 0, 0, 2, 4, 8, 12][i]
			const y = TRUSS_BOTTOM + 6 + i * 22
			ctx.fillStyle = CABINET
			ctx.fillRect(x, y, ARRAY_WIDE, 20)
			ctx.fillStyle = CABINET_LIT
			ctx.fillRect(x, y, ARRAY_WIDE, 2)
			ctx.fillStyle = GRILLE
			for (let g = y + 6; g < y + 18; g += 4)
				ctx.fillRect(x + 4, g, ARRAY_WIDE - 8, 2)
		}
	}

	// The stage's deck, and its front, dark, down to the crowd.
	ctx.fillStyle = DECK
	ctx.fillRect(0, ground, VIEW_WIDTH, 10)
	ctx.fillStyle = DECK_LIT
	ctx.fillRect(0, ground, VIEW_WIDTH, 2)
	ctx.fillStyle = STAGE_FRONT
	ctx.fillRect(0, ground + 10, VIEW_WIDTH, VIEW_HEIGHT - ground - 10)

	// Amp stacks on it, a head on two cabinets each side, a flame cannon on top.
	for (const ax of AMPS) {
		for (const [top, tall] of [
			[ground - 44, 44],
			[ground - 88, 44],
		]) {
			ctx.fillStyle = AMP
			ctx.fillRect(ax, top, AMP_WIDE, tall)
			ctx.fillStyle = AMP_CLOTH
			ctx.fillRect(ax + 4, top + 4, AMP_WIDE - 8, tall - 8)
			ctx.fillStyle = AMP_WEAVE
			for (let y = top + 6; y < top + tall - 4; y += 4)
				ctx.fillRect(ax + 4, y, AMP_WIDE - 8, 2)
			ctx.fillStyle = AMP_CORNER
			for (const [cx, cy] of [
				[ax, top],
				[ax + AMP_WIDE - 4, top],
				[ax, top + tall - 4],
				[ax + AMP_WIDE - 4, top + tall - 4],
			])
				ctx.fillRect(cx, cy, 4, 4)
		}
		const head = ground - 106
		ctx.fillStyle = AMP
		ctx.fillRect(ax, head, AMP_WIDE, 18)
		ctx.fillStyle = '#c8b48a'
		ctx.fillRect(ax + 4, head + 4, AMP_WIDE - 8, 10)
		ctx.fillStyle = KNOB
		for (let k = 0; k < 6; k++) ctx.fillRect(ax + 10 + k * 10, head + 8, 4, 4)
		ctx.fillStyle = '#e8402a'
		ctx.fillRect(ax + AMP_WIDE - 10, head + 8, 2, 2)
		// The cannon: a squat black box, its nozzle up.
		const cx = ax + AMP_WIDE / 2
		ctx.fillStyle = '#26242c'
		ctx.fillRect(cx - 10, head - 8, 20, 8)
		ctx.fillStyle = '#4a4852'
		ctx.fillRect(cx - 4, head - 12, 8, 4)
	}
}

/** A truss: two rails, `upright` up and down or across, braced in a zigzag. */
function lattice(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	wide: number,
	tall: number,
	upright: boolean,
) {
	const along = upright ? tall : wide
	const across = upright ? wide : tall
	const rect = (a: number, b: number, w: number, h: number, fill: string) => {
		ctx.fillStyle = fill
		if (upright) ctx.fillRect(x + b, y + a, h, w)
		else ctx.fillRect(x + a, y + b, w, h)
	}
	// The braces, zigzagging between the rails.
	for (let a = 0; a < along; a += 2) {
		const phase = (a % (across * 2)) / (across * 2)
		const b = phase < 0.5 ? phase * 2 * across : (1 - phase) * 2 * across
		rect(a, Math.min(across - 6, Math.max(4, snap(b))), 2, 2, STEEL_SHADE)
	}
	// The rails, lit along their tops.
	rect(0, 0, along, 4, STEEL)
	rect(0, across - 4, along, 4, STEEL)
	rect(0, 0, along, 2, STEEL_LIT)
	rect(0, across - 4, along, 2, STEEL_LIT)
}
