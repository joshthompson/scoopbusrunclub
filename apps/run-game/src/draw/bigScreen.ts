import { createController } from 'scoopjs'
import { glyphRows, pixelTextWidth } from '../courses/kit/pixelArt'
import { PATH_BACK, PX_PER_M, VERGE } from '../game/constants'
import { type Drone, REPLAY_SLOW, droneOf, replayTimes } from '../game/drone'
import { encoreTimes, interviewEnds, interviewOf } from '../game/interview'
import type { World } from '../game/world'

/**
 * Kristineberg's big screen (`CourseLook['bigScreen']`): a stadium screen
 * on steel legs behind the track, between the grandstands, before the
 * line. Till the race's nearly over, it shows the club's name. Then, as
 * whoever's leading gets to the long jump, a drone flies in and follows
 * them in, over the jump, over the line and dancing, and the screen shows
 * what it sees, live, as a broadcast: LIVE in its corner, a ticker along
 * its bottom, how far the long jump was, scanlines and all; and, a moment
 * after the long jump's landed, a slow-motion replay of it.
 *
 * What it sees is what's behind it: the scene's own pixels, a box of them
 * round the drone, copied off the canvas as it's painted, after everything
 * but the drone (`drone-camera`, just under `drone` in the draw order), and
 * shown on the screen the next time it's painted, a frame later. If the
 * drone's ever got the screen in its sights, the screen's on the screen.
 * Each screen keeps its own recording of what it's shown, coming up to the
 * long jump, for the replay: nothing's sent anywhere, and every screen
 * knows when the jump was (see `game/drone`).
 *
 * Knock the drone out of the sky (see `game/drone`: it takes coming down
 * on it, off someone's head) and it tumbles down, still filming, smashes
 * on the track and lies there smoking, and the screen's lost its signal,
 * static, then colour bars: please stand by.
 */

/** Everything's drawn a cell at a time: 2 px. */
const CELL = 2

// --- What the drone films ------------------------------------------------------

/** The box it films, 16 by 9, and the screen's picture the same: a pixel a pixel. */
const FEED_WIDTH = 224
const FEED_HEIGHT = 126
/**
 * How far below the drone its box's middle is, falling: looking down as it
 * goes. Flying, it's tilted to follow whoever it's following, up into the
 * air and all: its box's middle this far over their feet.
 */
const FEED_DROP = 92
const FEED_OVER_FEET = 28

// --- The drone ------------------------------------------------------------------

/** Its bob, hovering: how far, and how long one takes. */
const BOB = 2
const BOB_TICKS = 50

/** The drone, 16 cells by 9, its middle where it is (see `game/drone`). */
const DRONE_WIDTH = 16 * CELL
const DRONE_HEIGHT = 9 * CELL
const DRONE_WHITE = '#eef1f5'
const DRONE_SHADE = '#b3bcc9'
const DRONE_INK = '#2b2722'
const ROTOR = 'rgba(214, 222, 232, 0.75)'
const BLADE = '#c8d0da'
const LENS = '#5fb6ff'
const LED_RED = '#ff4a3d'
const LED_GREEN = '#5fe07a'
/** Its wreck: how big a box it's drawn in, smoke and all, and how long it smokes thick, sparks, and blinks. */
const WRECK_WIDTH = 48
const WRECK_HEIGHT = 72
const SMOKE_THICK = 600
const SPARK_TICKS = 40
const DYING_TICKS = 150

// --- The screen -----------------------------------------------------------------

/** Its casing round the picture, the plate under it, and its legs down to the grass. */
const RIM = 4 * CELL
const PLATE = 9 * CELL
const CASING_WIDTH = FEED_WIDTH + RIM * 2
const CASING_HEIGHT = FEED_HEIGHT + RIM * 2 + PLATE
const LEGS = 36 * CELL
const LEG_WIDTH = 4 * CELL
/** How far behind the track's back edge its feet are: on the grass, behind the railing. */
const STANDS_BACK = 10 * CELL
const BOX_HEIGHT = CASING_HEIGHT + LEGS

const CASING = '#2b2f3a'
const CASING_LIT = '#464d5d'
const CASING_SHADE = '#1b1e26'
const STEEL = '#8d96a6'
const STEEL_SHADE = '#626b7b'
const OFF = '#13213f'
const YELLOW = '#ffd23f'
const WHITE = '#fbf8f2'
const LIVE_RED = '#e3342b'
const TICKER = '#0f1a33'

/** The ticker: how tall its bar is, and how fast it goes along, px a tick. */
const TICKER_TALL = 10 * CELL
const TICKER_SPEED = 1
/** Between the ticker's items. */
const BULLET = ' • '
/** How long the long jump's caption takes to slide in. */
const CAPTION_IN = 12
/**
 * The long jump's replay (its timing's `replayTimes`): how near the board
 * the recording starts, and the most of it kept; and how long the wipe in
 * and out takes.
 */
const RECORD_FROM = 600
const RECORD_MOST = 200
const WIPE_TICKS = 16
/** Recorded a pixel a cell: half the screen's own, every cell still there. */
const RECORD_WIDTH = FEED_WIDTH / CELL
const RECORD_HEIGHT = FEED_HEIGHT / CELL
const REPLAY_BLUE = '#1f5bd8'
/** How long the long jump's caption stays up after the replay. */
const CAPTION_AFTER = 160
/** Lost the signal: how long it's static, before the colour bars. */
const NO_SIGNAL_TICKS = 110
/** Colour bars, left to right; and the strip under them. */
const BARS = [
	'#c0c0c0',
	'#c0c000',
	'#00c0c0',
	'#00c000',
	'#c000c0',
	'#c00000',
	'#0000c0',
]
const UNDER_BARS = [
	'#0000c0',
	'#131313',
	'#c000c0',
	'#131313',
	'#00c0c0',
	'#131313',
	'#c0c0c0',
]

/** Letters the pixel font hasn't got: 5 cells by 7, `#` lit. */
const EXTRA_GLYPHS: Record<string, string[]> = {
	':': ['.....', '..#..', '..#..', '.....', '..#..', '..#..', '.....'],
	'•': ['.....', '.....', '.###.', '.###.', '.###.', '.....', '.....'],
}

/**
 * The long jump's replay, at tick `now`, if there's one to show (see
 * `replayTimes`): when it starts and ends, what it's showing (the tick
 * it's got to, played back slowly), and when, played back, the landing is.
 */
function replayAt(world: World, d: Drone, now: number) {
	if (!d.jump) return undefined
	const first = replayTimes(d.jump)
	// After the interview, now and then, again (see `encoreTimes`).
	const encore = encoreTimes(world)
	const { from, start, end, landing } =
		encore && now >= first.end ? encore : first
	return {
		start,
		end,
		landing,
		showing: from + Math.floor((now - start) / REPLAY_SLOW),
		playing: now >= start && now < end,
		/** Every cut to a replay and back, for the wipes. */
		cuts: encore
			? [first.start, first.end, encore.start, encore.end]
			: [first.start, first.end],
	}
}

/** Where the drone is, on the grid: bobbing, hovering; not, falling. */
const droneAt = (world: World, d: Drone) => ({
	x: Math.round(d.x / CELL) * CELL,
	y:
		Math.round(
			(d.y +
				(d.state === 'flying'
					? Math.sin((world.ticks() / BOB_TICKS) * Math.PI * 2) * BOB
					: 0)) /
				CELL,
		) * CELL,
})

export function createBigScreen(world: World) {
	const own = world.course.look?.bigScreen
	if (!own) return []
	const { x: middle } = own
	const left = Math.round((middle - CASING_WIDTH / 2) / CELL) * CELL
	const feet = world.terrain.groundY(middle) - PATH_BACK - VERGE - STANDS_BACK
	const top = Math.round((feet - BOX_HEIGHT) / CELL) * CELL
	// Its course has one, so it's there.
	const drone = () => droneOf(world) as Drone
	const filming = (d: Drone) => d.state === 'flying' || d.state === 'falling'

	/** The last of what the drone saw, on this screen's canvas, at its pixels: and whether there's any yet. */
	const feed = document.createElement('canvas')
	const feedCtx = feed.getContext('2d')
	let filmed = false
	/** Static, a pixel a cell, made afresh each tick it's shown. */
	const noise = document.createElement('canvas')
	noise.width = FEED_WIDTH / CELL
	noise.height = FEED_HEIGHT / CELL
	const noiseCtx = noise.getContext('2d')
	let noiseAt = -1
	/** What it's shown, a tick at a time, coming up to the long jump and over it, for the replay: oldest first. */
	const recorded: { tick: number; frame: HTMLCanvasElement }[] = []
	const board = world.course.longJump?.board
	/** What it's showing now, recorded, if it's still recording: near the long jump, till the replay starts. */
	function record(d: Drone, now: number) {
		const leader = d.leader
		if (board === undefined || !leader) return
		if (leader.body.x < board - RECORD_FROM) return
		// Kept, as it was, once it's first replayed: for that, and again.
		if (d.jump && now >= replayTimes(d.jump).start) return
		if (recorded.at(-1)?.tick === now) return
		// The oldest's canvas, used again, once there are as many as are kept.
		const reused = recorded.length >= RECORD_MOST ? recorded.shift() : undefined
		const frame = reused?.frame ?? document.createElement('canvas')
		frame.width = RECORD_WIDTH
		frame.height = RECORD_HEIGHT
		const fctx = frame.getContext('2d')
		if (!fctx) return
		fctx.imageSmoothingEnabled = false
		fctx.drawImage(
			feed,
			0,
			0,
			feed.width,
			feed.height,
			0,
			0,
			RECORD_WIDTH,
			RECORD_HEIGHT,
		)
		recorded.push({ tick: now, frame })
	}
	/** What was recorded at `tick`, or the last before it. */
	function recordedAt(tick: number) {
		for (let i = recorded.length - 1; i >= 0; i--)
			if (recorded[i].tick <= tick) return recorded[i].frame
		return recorded[0]?.frame
	}

	const screen = createController({
		init: () => ({
			id: 'big-screen',
			// Behind the track, in front of the grandstands and the flats.
			type: 'scenery',
			x: () => left,
			y: () => top,
			width: () => CASING_WIDTH,
			height: () => BOX_HEIGHT,
			style: () => ({ 'image-rendering': 'pixelated' }),
		}),
		draw: ({ ctx }) => {
			const now = world.ticks()
			const d = drone()
			ctx.imageSmoothingEnabled = false
			paintStand(ctx)
			const px = RIM
			const py = RIM
			ctx.save()
			ctx.beginPath()
			ctx.rect(px, py, FEED_WIDTH, FEED_HEIGHT)
			ctx.clip()
			ctx.fillStyle = OFF
			ctx.fillRect(px, py, FEED_WIDTH, FEED_HEIGHT)
			const tickerY = py + FEED_HEIGHT - TICKER_TALL
			if (d.state === 'parked' || !filmed) paintIdle(ctx, px, py, now)
			else if (d.state === 'down') {
				// Lost the signal: static, then colour bars.
				if (now - d.downAt < NO_SIGNAL_TICKS) {
					if (noiseCtx && noiseAt !== now) {
						paintNoise(noiseCtx)
						noiseAt = now
					}
					ctx.drawImage(noise, px, py, FEED_WIDTH, FEED_HEIGHT)
					if (now % 30 < 22) paintCaption(ctx, 'NO SIGNAL', px, py)
				} else {
					paintBars(ctx, px, py)
					paintCaption(ctx, 'PLEASE STAND BY', px, py)
				}
				paintTicker(ctx, px, tickerY, now, tickerNews(world, d))
			} else {
				const replay = replayAt(world, d, now)
				const replayed = replay?.playing
					? recordedAt(replay.showing)
					: undefined
				if (replayed) ctx.drawImage(replayed, px, py, FEED_WIDTH, FEED_HEIGHT)
				else
					ctx.drawImage(
						feed,
						0,
						0,
						feed.width,
						feed.height,
						px,
						py,
						FEED_WIDTH,
						FEED_HEIGHT,
					)
				// Falling: the picture breaking up.
				if (d.state === 'falling') paintTearing(ctx, px, py)
				// The long jump's caption: live, as they land; in the replay,
				// as they land again, slowly; and on a while after.
				// The interview: its caption, over everything else's.
				const talk = interviewOf(world)
				const talkFrom = talk?.arrivedAt
				const talkEnds = talk && interviewEnds(talk)
				const talking =
					!replayed &&
					talk?.winner &&
					talkFrom !== undefined &&
					talkEnds !== undefined &&
					now >= talkFrom &&
					now < talkEnds + CAPTION_AFTER
				if (talking && talk?.winner)
					paintLowerThird(
						ctx,
						px,
						tickerY,
						now - (talkFrom as number),
						'WINNER',
						talk.winner.runner.name.toUpperCase().slice(0, 11),
					)
				const jump = d.jump
				if (jump && replay && !talking) {
					const since = replayed
						? now >= replay.landing
							? now - replay.landing
							: undefined
						: now < replay.start
							? now - jump.at
							: now < replay.end + CAPTION_AFTER
								? CAPTION_IN
								: undefined
					if (since !== undefined)
						paintLowerThird(
							ctx,
							px,
							tickerY,
							since,
							'LONG JUMP',
							`${jump.metres.toFixed(1)} M`,
						)
				}
				if (replayed) paintReplay(ctx, px, py)
				else paintLive(ctx, px, py, now)
				paintTicker(ctx, px, tickerY, now, tickerNews(world, d))
				// Wiped to the replay, and back.
				if (replay)
					for (const cut of replay.cuts)
						if (Math.abs(now - cut) < WIPE_TICKS / 2)
							paintWipe(ctx, px, py, (now - cut + WIPE_TICKS / 2) / WIPE_TICKS)
			}
			paintFeedLook(ctx, px, py, now)
			ctx.restore()
		},
	})

	const camera = createController({
		init: () => ({
			id: 'drone-camera',
			// Over everything but the drone: what it sees, without itself.
			type: 'drone-camera',
			x: () => Math.round(drone().x - FEED_WIDTH / 2),
			y: () => {
				const d = drone()
				const middle =
					d.state === 'flying' && d.leader
						? d.leader.body.feetY - FEED_OVER_FEET
						: d.y + FEED_DROP
				return Math.round(middle - FEED_HEIGHT / 2)
			},
			width: () => FEED_WIDTH,
			height: () => FEED_HEIGHT,
		}),
		draw: ({ ctx }) => {
			if (!filming(drone()) || !feedCtx) return
			// Its box, on the canvas, in the canvas's own pixels.
			const m = ctx.getTransform()
			const width = Math.max(1, Math.round(m.a * FEED_WIDTH))
			const height = Math.max(1, Math.round(m.d * FEED_HEIGHT))
			if (feed.width !== width) feed.width = width
			if (feed.height !== height) feed.height = height
			feedCtx.imageSmoothingEnabled = false
			feedCtx.clearRect(0, 0, width, height)
			feedCtx.drawImage(
				ctx.canvas,
				Math.round(m.e),
				Math.round(m.f),
				width,
				height,
				0,
				0,
				width,
				height,
			)
			filmed = true
			record(drone(), world.ticks())
		},
	})

	const flying = createController({
		init: () => ({
			id: 'drone',
			type: 'drone',
			x: () => droneAt(world, drone()).x - DRONE_WIDTH / 2,
			y: () => droneAt(world, drone()).y - DRONE_HEIGHT / 2,
			width: () => DRONE_WIDTH,
			height: () => DRONE_HEIGHT,
			style: () => ({ 'image-rendering': 'pixelated' }),
		}),
		draw: ({ ctx }) => {
			const d = drone()
			if (!filming(d)) return
			const now = world.ticks()
			if (d.state === 'flying') {
				paintDrone(ctx, now, d, false)
				return
			}
			// Tumbling over, its rotors stopped.
			ctx.translate(DRONE_WIDTH / 2, DRONE_HEIGHT / 2)
			ctx.rotate((d.spin * Math.PI) / 180)
			ctx.translate(-DRONE_WIDTH / 2, -DRONE_HEIGHT / 2)
			paintDrone(ctx, now, d, true)
		},
	})

	const wreck = createController({
		init: () => ({
			id: 'drone-wreck',
			// On the track: behind whoever runs past it.
			type: 'hazard',
			x: () => Math.round((drone().x - WRECK_WIDTH / 2) / CELL) * CELL,
			y: () =>
				Math.round((world.terrain.groundY(drone().x) - WRECK_HEIGHT) / CELL) *
				CELL,
			width: () => WRECK_WIDTH,
			height: () => WRECK_HEIGHT,
			style: () => ({ 'image-rendering': 'pixelated' }),
		}),
		draw: ({ ctx }) => {
			const d = drone()
			if (d.state !== 'down') return
			paintWreck(ctx, world.ticks() - d.downAt)
		},
	})

	return [screen, camera, flying, wreck]
}

/** The screen's casing, the plate under it with the ground's name on it, and its legs down to the grass. */
function paintStand(ctx: CanvasRenderingContext2D) {
	// Its legs, two steel posts, braced across.
	const legs = [CASING_WIDTH * 0.25, CASING_WIDTH * 0.75].map(
		(x) => Math.round((x - LEG_WIDTH / 2) / CELL) * CELL,
	)
	for (const x of legs) {
		ctx.fillStyle = STEEL
		ctx.fillRect(x, CASING_HEIGHT, LEG_WIDTH, LEGS)
		ctx.fillStyle = STEEL_SHADE
		ctx.fillRect(x + LEG_WIDTH - CELL, CASING_HEIGHT, CELL, LEGS)
		// Its foot, on the grass.
		ctx.fillRect(
			x - CELL,
			CASING_HEIGHT + LEGS - CELL,
			LEG_WIDTH + CELL * 2,
			CELL,
		)
	}
	ctx.fillStyle = STEEL_SHADE
	const brace = CASING_HEIGHT + Math.round(LEGS / 2 / CELL) * CELL
	ctx.fillRect(legs[0], brace, legs[1] - legs[0] + LEG_WIDTH, CELL * 2)
	// The casing: lit along its top, shaded along its bottom.
	ctx.fillStyle = CASING
	ctx.fillRect(0, 0, CASING_WIDTH, CASING_HEIGHT)
	ctx.fillStyle = CASING_LIT
	ctx.fillRect(0, 0, CASING_WIDTH, CELL)
	ctx.fillStyle = CASING_SHADE
	ctx.fillRect(0, CASING_HEIGHT - CELL, CASING_WIDTH, CELL)
	ctx.fillRect(RIM - CELL, RIM - CELL, FEED_WIDTH + CELL * 2, CELL)
	// The plate under the picture: the ground's name, in yellow.
	const name = 'KRISTINEBERGS IP'
	const nameY =
		FEED_HEIGHT +
		RIM * 2 +
		Math.round((PLATE - 7 * CELL) / 2 / CELL) * CELL -
		CELL
	paintText(
		ctx,
		name,
		Math.round((CASING_WIDTH - pixelTextWidth(name, CELL)) / 2 / CELL) * CELL,
		nameY,
		YELLOW,
	)
}

/** Before the drone's up: the club's name, and the race, on the dark screen, a light chasing round its edge. */
function paintIdle(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	now: number,
) {
	const lines: [string, string][] = [
		['SCOOP BUS', YELLOW],
		['RUN CLUB', YELLOW],
		['KRISTINEBERG 5K', WHITE],
	]
	lines.forEach(([text, colour], i) => {
		const width = pixelTextWidth(text, CELL)
		paintText(
			ctx,
			text,
			x + Math.round((FEED_WIDTH - width) / 2 / CELL) * CELL,
			y + 26 + i * 24 + (i === 2 ? 8 : 0),
			colour,
		)
	})
	// A light going round its edge.
	const round = (FEED_WIDTH + FEED_HEIGHT) * 2
	const at = (now * 4) % round
	const [lx, ly] =
		at < FEED_WIDTH
			? [at, 0]
			: at < FEED_WIDTH + FEED_HEIGHT
				? [FEED_WIDTH - CELL * 2, at - FEED_WIDTH]
				: at < FEED_WIDTH * 2 + FEED_HEIGHT
					? [FEED_WIDTH * 2 + FEED_HEIGHT - at, FEED_HEIGHT - CELL * 2]
					: [0, round - at]
	ctx.fillStyle = YELLOW
	ctx.fillRect(
		x + Math.round(lx / CELL) * CELL,
		y + Math.round(ly / CELL) * CELL,
		CELL * 2,
		CELL * 2,
	)
}

/** LIVE, in its top left corner: in a red box, a white dot blinking in front of it. */
function paintLive(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	now: number,
) {
	const text = 'LIVE'
	// Room either side: before the dot, between it and the word, and after.
	const width = CELL * 12 + pixelTextWidth(text, CELL)
	ctx.fillStyle = LIVE_RED
	ctx.fillRect(x + CELL * 3, y + CELL * 3, width, CELL * 11)
	if (now % 60 < 40) {
		ctx.fillStyle = WHITE
		ctx.fillRect(x + CELL * 6, y + CELL * 7, CELL * 3, CELL * 3)
	}
	paintText(ctx, text, x + CELL * 12, y + CELL * 5, WHITE)
}

/** REPLAY, in its top left corner, in blue, where LIVE is. */
function paintReplay(ctx: CanvasRenderingContext2D, x: number, y: number) {
	const text = 'REPLAY'
	ctx.fillStyle = REPLAY_BLUE
	ctx.fillRect(
		x + CELL * 3,
		y + CELL * 3,
		CELL * 6 + pixelTextWidth(text, CELL),
		CELL * 11,
	)
	paintText(ctx, text, x + CELL * 6, y + CELL * 5, WHITE)
}

/**
 * The wipe to the replay and back, `share` of the way through: a slanted
 * yellow band, a blue one behind it, sweeping across, the picture changing
 * under it as it passes the middle.
 */
function paintWipe(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	share: number,
) {
	const band = 20 * CELL
	const lean = 24 * CELL
	const at = x - band - lean + share * (FEED_WIDTH + band * 2 + lean)
	for (let row = 0; row < FEED_HEIGHT; row += CELL * 2) {
		const shift =
			Math.round((lean * (FEED_HEIGHT - row)) / FEED_HEIGHT / CELL) * CELL
		const left = Math.round((at + shift) / CELL) * CELL
		ctx.fillStyle = REPLAY_BLUE
		ctx.fillRect(left - CELL * 6, y + row, CELL * 6, CELL * 2)
		ctx.fillStyle = YELLOW
		ctx.fillRect(left, y + row, band, CELL * 2)
		ctx.fillStyle = WHITE
		ctx.fillRect(left + band, y + row, CELL * 2, CELL * 2)
	}
}

/** The ticker along its bottom: a tag, and the news going by after it. */
function paintTicker(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	now: number,
	news: string,
) {
	ctx.fillStyle = TICKER
	ctx.fillRect(x, y, FEED_WIDTH, TICKER_TALL)
	ctx.fillStyle = YELLOW
	ctx.fillRect(x, y, FEED_WIDTH, CELL)
	// The news, round and round, from under the tag.
	const tag = '5K'
	const tagWidth = pixelTextWidth(tag, CELL) + CELL * 6
	const width = pixelTextWidth(news, CELL) + CELL * 6
	const along = Math.round(((now * TICKER_SPEED) % width) / CELL) * CELL
	ctx.save()
	ctx.beginPath()
	ctx.rect(x + tagWidth, y, FEED_WIDTH - tagWidth, TICKER_TALL)
	ctx.clip()
	for (let at = x + tagWidth - along; at < x + FEED_WIDTH; at += width)
		paintText(ctx, news, at, y + CELL * 2, WHITE)
	ctx.restore()
	ctx.fillStyle = YELLOW
	ctx.fillRect(x, y, tagWidth, TICKER_TALL)
	paintText(ctx, tag, x + CELL * 3, y + CELL * 2, TICKER)
}

/**
 * What's going by on the ticker: who's leading, how far they've to go or
 * that they've won, and their long jump; or, the drone down, that it's
 * technical difficulties.
 */
function tickerNews(world: World, d: Drone) {
	const leader = d.leader
	const name = (leader?.runner.name ?? '').toUpperCase()
	const landed = d.jump && d.jump.racer === leader?.id ? d.jump : undefined
	const jump = landed
		? `${name} LONG JUMP ${landed.metres.toFixed(1)} M`
		: 'LONG JUMP AT THE FINISH'
	const items =
		d.state === 'down'
			? ['TECHNICAL DIFFICULTIES', 'PLEASE STAND BY', jump]
			: ['LIVE FROM KRISTINEBERGS IP']
	if (d.state !== 'down') {
		if (leader?.out === 'finished')
			items.push(`${name} WINS!`, `${name} TALKS TO SCOOP TV`, 'WHAT A RUN')
		else if (leader) {
			const left = Math.max(
				0,
				(world.terrain.finishX - leader.body.x) / PX_PER_M / 1000,
			)
			items.push(`LEADER: ${name}`, `${left.toFixed(2)} KM TO GO`)
		}
		items.push(jump)
	}
	items.push('SCOOP BUS RUN CLUB')
	return items.join(BULLET) + BULLET
}

/**
 * A caption over the ticker, sliding in from the left: `tag` on yellow,
 * `said` after it. LONG JUMP and how far; WINNER, and who.
 */
function paintLowerThird(
	ctx: CanvasRenderingContext2D,
	x: number,
	tickerY: number,
	since: number,
	tag: string,
	said: string,
) {
	const tagWidth = pixelTextWidth(tag, CELL) + CELL * 6
	const width = tagWidth + pixelTextWidth(said, CELL) + CELL * 6
	const tall = CELL * 11
	const y = tickerY - tall - CELL * 2
	const slid =
		Math.round(((1 - Math.min(1, since / CAPTION_IN)) * (width + 8)) / CELL) *
		CELL
	const left = x + CELL * 3 - slid
	ctx.fillStyle = YELLOW
	ctx.fillRect(left, y, tagWidth, tall)
	paintText(ctx, tag, left + CELL * 3, y + CELL * 2, TICKER)
	ctx.fillStyle = TICKER
	ctx.fillRect(left + tagWidth, y, width - tagWidth, tall)
	paintText(ctx, said, left + tagWidth + CELL * 3, y + CELL * 2, WHITE)
}

/** Words across the middle of the picture, in a dark box: NO SIGNAL, PLEASE STAND BY. */
function paintCaption(
	ctx: CanvasRenderingContext2D,
	text: string,
	x: number,
	y: number,
) {
	const width = pixelTextWidth(text, CELL) + CELL * 8
	const tall = CELL * 13
	const left = x + Math.round((FEED_WIDTH - width) / 2 / CELL) * CELL
	const top =
		y + Math.round((FEED_HEIGHT - TICKER_TALL - tall) / 2 / CELL) * CELL
	ctx.fillStyle = TICKER
	ctx.fillRect(left, top, width, tall)
	ctx.fillStyle = WHITE
	ctx.fillRect(left, top, width, CELL)
	ctx.fillRect(left, top + tall - CELL, width, CELL)
	paintText(ctx, text, left + CELL * 4, top + CELL * 3, WHITE)
}

/** Static: every cell a grey at random, black to white. */
function paintNoise(ctx: CanvasRenderingContext2D) {
	const { width, height } = ctx.canvas
	const pixels = ctx.createImageData(width, height)
	for (let i = 0; i < pixels.data.length; i += 4) {
		const grey = Math.floor(Math.random() * 256)
		pixels.data[i] = grey
		pixels.data[i + 1] = grey
		pixels.data[i + 2] = grey
		pixels.data[i + 3] = 255
	}
	ctx.putImageData(pixels, 0, 0)
}

/** Colour bars: seven, a strip of them backwards under, and black and white blocks along the bottom. */
function paintBars(ctx: CanvasRenderingContext2D, x: number, y: number) {
	const bar = FEED_WIDTH / BARS.length
	const tall = Math.round((FEED_HEIGHT * 0.62) / CELL) * CELL
	const strip = CELL * 5
	BARS.forEach((colour, i) => {
		const from = x + Math.round((i * bar) / CELL) * CELL
		const to = x + Math.round(((i + 1) * bar) / CELL) * CELL
		ctx.fillStyle = colour
		ctx.fillRect(from, y, to - from, tall)
		ctx.fillStyle = UNDER_BARS[i]
		ctx.fillRect(from, y + tall, to - from, strip)
	})
	const blocks = ['#00214c', WHITE, '#32006a', '#131313', '#131313']
	const block = FEED_WIDTH / blocks.length
	blocks.forEach((colour, i) => {
		const from = x + Math.round((i * block) / CELL) * CELL
		const to = x + Math.round(((i + 1) * block) / CELL) * CELL
		ctx.fillStyle = colour
		ctx.fillRect(from, y + tall + strip, to - from, FEED_HEIGHT - tall - strip)
	})
}

/** The picture breaking up, the drone falling: bright bands across it, and flecks of static. */
function paintTearing(ctx: CanvasRenderingContext2D, x: number, y: number) {
	for (let i = 0; i < 4; i++) {
		const band = Math.round((Math.random() * FEED_HEIGHT) / CELL) * CELL
		const tall = CELL * (1 + Math.floor(Math.random() * 4))
		const from = Math.round((Math.random() * FEED_WIDTH * 0.5) / CELL) * CELL
		ctx.fillStyle = `rgba(255, 255, 255, ${0.15 + Math.random() * 0.25})`
		ctx.fillRect(x + from, y + band, FEED_WIDTH - from, tall)
	}
	ctx.fillStyle = 'rgba(0, 0, 0, 0.35)'
	for (let i = 0; i < 30; i++)
		ctx.fillRect(
			x + Math.round((Math.random() * FEED_WIDTH) / CELL) * CELL,
			y + Math.round((Math.random() * FEED_HEIGHT) / CELL) * CELL,
			CELL,
			CELL,
		)
}

/**
 * Over everything on the screen, so it looks a camera's picture on a big
 * screen: a dark scanline every other row, a brighter band rolling slowly
 * down it, its edges darker, and a glare across the glass.
 */
function paintFeedLook(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	now: number,
) {
	ctx.fillStyle = 'rgba(0, 0, 0, 0.16)'
	for (let row = CELL; row < FEED_HEIGHT; row += CELL * 2)
		ctx.fillRect(x, y + row, FEED_WIDTH, CELL)
	// A band rolling down.
	const band = 12 * CELL
	const at =
		Math.round(((now * 0.5) % (FEED_HEIGHT + band)) / CELL) * CELL - band
	ctx.fillStyle = 'rgba(255, 255, 255, 0.06)'
	ctx.fillRect(x, y + at, FEED_WIDTH, band)
	// Darker round its edges, darkest at them.
	;[0.3, 0.18, 0.09].forEach((dark, i) => {
		const o = i * CELL
		ctx.fillStyle = `rgba(0, 0, 0, ${dark})`
		ctx.fillRect(x + o, y + o, FEED_WIDTH - o * 2, CELL)
		ctx.fillRect(x + o, y + FEED_HEIGHT - o - CELL, FEED_WIDTH - o * 2, CELL)
		ctx.fillRect(x + o, y + o + CELL, CELL, FEED_HEIGHT - o * 2 - CELL * 2)
		ctx.fillRect(
			x + FEED_WIDTH - o - CELL,
			y + o + CELL,
			CELL,
			FEED_HEIGHT - o * 2 - CELL * 2,
		)
	})
	// A glare across the glass, from its top, down to the left.
	ctx.fillStyle = 'rgba(255, 255, 255, 0.07)'
	for (let k = 0; k * CELL * 2 < FEED_HEIGHT * 0.6; k++)
		ctx.fillRect(x + 120 - k * CELL * 2, y + k * CELL * 2, CELL * 10, CELL * 2)
}

/**
 * The drone: white, its arms out either side, its camera hung under,
 * lights blinking, and on top its rotors, spinning, a blur; or, knocked
 * out, stopped, its lights out.
 */
function paintDrone(
	ctx: CanvasRenderingContext2D,
	now: number,
	d: Drone,
	broken: boolean,
) {
	const c = CELL
	if (broken) {
		ctx.fillStyle = BLADE
		ctx.fillRect(c, 0, 4 * c, c)
		ctx.fillRect(11 * c, 0, 4 * c, c)
	} else {
		// Rotors, a blur, long and short in turn.
		const spin = Math.floor(now / 2) % 2
		ctx.fillStyle = ROTOR
		for (const at of [1, 11])
			ctx.fillRect((at - spin) * c, 0, (4 + spin * 2) * c, c)
	}
	// Rotor masts.
	ctx.fillStyle = DRONE_INK
	ctx.fillRect(3 * c, c, c, c)
	ctx.fillRect(12 * c, c, c, c)
	// Arms, out to either side.
	ctx.fillStyle = DRONE_SHADE
	ctx.fillRect(2 * c, 2 * c, 12 * c, c)
	// Body: lit on top, shaded under.
	ctx.fillStyle = DRONE_WHITE
	ctx.fillRect(5 * c, 2 * c, 6 * c, 3 * c)
	ctx.fillRect(6 * c, c, 4 * c, c)
	ctx.fillStyle = DRONE_SHADE
	ctx.fillRect(5 * c, 4 * c, 6 * c, c)
	// Legs.
	ctx.fillStyle = DRONE_INK
	ctx.fillRect(5 * c, 5 * c, c, 2 * c)
	ctx.fillRect(10 * c, 5 * c, c, 2 * c)
	ctx.fillRect(4 * c, 7 * c, 2 * c, c)
	ctx.fillRect(10 * c, 7 * c, 2 * c, c)
	// Its camera, hung underneath, looking the way the leader's going.
	const facing = d.leader?.body.facing ?? 1
	ctx.fillStyle = DRONE_INK
	ctx.fillRect(7 * c, 5 * c, 2 * c, 2 * c)
	ctx.fillStyle = LENS
	ctx.fillRect((facing > 0 ? 8 : 7) * c, 6 * c, c, c)
	if (broken) return
	// Lights: red, recording, blinking; green steady.
	if (now % 40 < 24) {
		ctx.fillStyle = LED_RED
		ctx.fillRect(2 * c, 2 * c, c, c)
	}
	ctx.fillStyle = LED_GREEN
	ctx.fillRect(13 * c, 2 * c, c, c)
}

/**
 * What's left of the drone, `since` ticks after it hit the track: its body
 * on its side, an arm snapped off, bits of rotor and its camera scattered;
 * sparks, at first; its red light blinking, dying; and smoke going up off
 * it, thick, then thinning.
 */
function paintWreck(ctx: CanvasRenderingContext2D, since: number) {
	const c = CELL
	const floor = WRECK_HEIGHT
	const bx = 12
	// A snapped-off arm, a rotor's blade, and another, flung further.
	ctx.fillStyle = DRONE_SHADE
	ctx.fillRect(bx - 4 * c, floor - c, 4 * c, c)
	ctx.fillStyle = BLADE
	ctx.fillRect(bx + 13 * c, floor - c, 3 * c, c)
	ctx.fillRect(bx - 6 * c, floor - c, 2 * c, c)
	// The body, on its side, the other arm sticking up off it.
	ctx.fillStyle = DRONE_WHITE
	ctx.fillRect(bx + 3 * c, floor - 4 * c, 6 * c, 3 * c)
	ctx.fillStyle = DRONE_SHADE
	ctx.fillRect(bx + 3 * c, floor - 2 * c, 6 * c, c)
	ctx.fillRect(bx + 9 * c, floor - 5 * c, c, 2 * c)
	ctx.fillRect(bx + 10 * c, floor - 6 * c, c, c)
	ctx.fillStyle = DRONE_INK
	ctx.fillRect(bx + 3 * c, floor - c, 6 * c, c)
	ctx.fillRect(bx + 10 * c, floor - 7 * c, c, c)
	// Its camera, come off, its lens cracked.
	ctx.fillRect(bx, floor - 2 * c, 2 * c, 2 * c)
	ctx.fillStyle = LENS
	ctx.fillRect(bx, floor - 2 * c, c, c)
	// Its red light, dying.
	if (since < DYING_TICKS && since % 24 < 8) {
		ctx.fillStyle = LED_RED
		ctx.fillRect(bx + 4 * c, floor - 4 * c, c, c)
	}
	// Sparks, flying off it at first.
	if (since < SPARK_TICKS)
		for (let i = 0; i < 6; i++) {
			const t = (since + i * 7) % 14
			const side = i % 2 ? 1 : -1
			ctx.fillStyle = i % 3 ? '#ffd23f' : '#fff3a0'
			ctx.fillRect(
				Math.round((bx + 6 * c + side * t * (1 + (i % 3))) / CELL) * CELL,
				Math.round((floor - 4 * c - t * 1.6 + t * t * 0.12) / CELL) * CELL,
				c,
				c,
			)
		}
	// Smoke, puffs going up off it and fading, thinner as it goes on.
	const thick = Math.max(0.25, 1 - since / SMOKE_THICK)
	for (let i = 0; i < 4; i++) {
		const age = (since + i * 20) % 80
		const share = age / 80
		const size = Math.round((3 + share * 4) / 1) * c
		const px = Math.round((bx + 6 * c + age * 0.15 - size / 2) / CELL) * CELL
		const py = Math.round((floor - 6 * c - age * 0.6 - size / 2) / CELL) * CELL
		ctx.fillStyle = `rgba(88, 88, 96, ${(1 - share) * 0.55 * thick})`
		ctx.fillRect(px, py, size, size)
		ctx.fillRect(px + c, py - c, size - c * 2, c)
	}
}

/** Pixel lettering on a canvas, a cell 2 px, its top left at `x`, `y`. */
function paintText(
	ctx: CanvasRenderingContext2D,
	text: string,
	x: number,
	y: number,
	fill: string,
) {
	ctx.fillStyle = fill
	;[...text].forEach((char, i) => {
		const rows = EXTRA_GLYPHS[char] ?? glyphRows(char)
		rows.forEach((row, r) => {
			for (let col = 0; col < row.length; col++)
				if (row[col] === '#')
					ctx.fillRect(x + (i * 6 + col) * CELL, y + r * CELL, CELL, CELL)
		})
	})
}
