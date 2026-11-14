import { For, onCleanup, onMount } from 'solid-js'
import { KIT } from '../../runners/looks'
import { Pixels } from '../Pixels'
import { cubicBezier } from '../paint/animation'

/**
 * Children playing football on the track at Kristineberg: two or three of
 * them, facing each other, doing keepy-ups and passing the ball round. Each
 * kicks just as the ball comes to them, so the ball and their legs are one
 * animation. Jump the lot.
 */

const CELL = 2
/** A child's size, in cells: room in front of them for a kicking leg. */
const KID_COLUMNS = 13
const KID_ROWS = 18
const KID_WIDTH = KID_COLUMNS * CELL
/** How far apart they stand. */
const KID_SPACING = 30
/** How tall a group's drawn: a child. The ball goes up out of it. */
export const KIDS_HEIGHT = KID_ROWS * CELL
/** How tall they are, for running into. */
export const KIDS_REACH_UP = 34

/** How wide a group of `count` is. */
export const kidsWidth = (count: number) =>
	(count - 1) * KID_SPACING + KID_WIDTH + 10

const INK = '#0f1f29'
const SKINS = ['#ffdbac', '#f1c27d', '#c68642', '#8d5524']
const HAIRS = ['#111111', '#4a3222', '#a0522d', '#e8c76a']
const SHORTS = ['#222222', '#2255cc', '#f4f4f4']
/** Shirts from the kit colours, but not white: they'd vanish against the stand. */
const SHIRTS = KIT.filter((colour) => colour !== '#ffffff')

type Cells = [number, number, number, number, string][]

const pick = <T,>(from: T[]) => from[Math.floor(Math.random() * from.length)]

/** A child facing right, without the leg they kick with. */
function body(
	skin: string,
	hair: string,
	shirt: string,
	shorts: string,
): Cells {
	return [
		[4, 0, 5, 2, hair],
		[3, 1, 2, 3, hair],
		[4, 2, 5, 4, skin],
		[7, 3, 1, 1, INK],
		[3, 6, 6, 5, shirt],
		[2, 7, 1, 3, skin],
		[9, 7, 1, 3, skin],
		[3, 11, 6, 2, shorts],
		// The leg they stand on, and its shoe
		[4, 13, 2, 4, skin],
		[4, 17, 3, 1, INK],
	]
}

/** Their kicking leg, down: stood on both feet. */
const LEG_DOWN = (skin: string): Cells => [
	[7, 13, 2, 4, skin],
	[7, 17, 3, 1, INK],
]
/** And out in front, kicking. */
const LEG_UP = (skin: string): Cells => [
	[7, 13, 2, 2, skin],
	[9, 12, 2, 2, skin],
	[11, 11, 2, 3, INK],
]

const scaled = (cells: Cells): Cells =>
	cells.map(([x, y, w, h, c]) => [x * CELL, y * CELL, w * CELL, h * CELL, c])

const BALL: Cells = [
	[2, 0, 4, 8, '#f4f4f4'],
	[0, 2, 8, 4, '#f4f4f4'],
	[2, 2, 2, 2, '#1d1d1d'],
	[4, 4, 2, 2, '#1d1d1d'],
]
const BALL_SIZE = 8

/** How long the ball spends with each child: a keepy-up, then a pass. */
const TURN_SECONDS = 0.9
/** Of that turn, how much is the keepy-up. */
const KEEPY_SHARE = 0.4
/** How high a keepy-up goes, and a pass, over their foot. */
const KEEPY_HEIGHT = 22
const PASS_HEIGHT = 30
/** Where the ball is kicked from: about knee height. */
const FOOT_HEIGHT = 10
/** How long a kicking leg stays up, either side of the kick. */
const KICK_SECONDS = 0.09

/** A group of `count` children, each picked out at random, as they're drawn. */
function kidsOf(count: number) {
	return Array.from({ length: count }, (_, i) => {
		const skin = pick(SKINS)
		return {
			skin,
			body: scaled(body(skin, pick(HAIRS), pick(SHIRTS), pick(SHORTS))),
			down: scaled(LEG_DOWN(skin)),
			up: scaled(LEG_UP(skin)),
			left: 5 + i * KID_SPACING,
			// Every other one turned round, so they face each other.
			facing: i % 2 === 0 ? 1 : -1,
		}
	})
}

/** Where the ball is at each child's foot: in front of them. */
function footOf(kid: ReturnType<typeof kidsOf>[number]) {
	return kid.facing === 1
		? kid.left + 11 * CELL
		: kid.left + KID_WIDTH - 11 * CELL - BALL_SIZE
}

export function KidsArt(props: { count: number }) {
	const { count } = props
	const kids = kidsOf(count)
	const footX = (i: number) => footOf(kids[i])

	let ball: HTMLDivElement | undefined
	const legsUp: HTMLDivElement[] = []
	const legsDown: HTMLDivElement[] = []
	const animations: Animation[] = []

	onMount(() => {
		const duration = count * TURN_SECONDS * 1000
		const turn = 1 / count
		const at = (x: number, height: number) => `translate(${x}px, ${-height}px)`

		// The ball: up and down off each child's foot, then over to the next,
		// and from the last back to the first.
		const frames: Keyframe[] = []
		for (let i = 0; i < count; i++) {
			const start = i * turn
			const pass = start + turn * KEEPY_SHARE
			const x = footX(i)
			const next = footX((i + 1) % count)
			frames.push(
				{ offset: start, transform: at(x, FOOT_HEIGHT), easing: 'ease-out' },
				{
					offset: (start + pass) / 2,
					transform: at(x, FOOT_HEIGHT + KEEPY_HEIGHT),
					easing: 'ease-in',
				},
				{ offset: pass, transform: at(x, FOOT_HEIGHT), easing: 'ease-out' },
				{
					offset: (pass + start + turn) / 2,
					transform: at((x + next) / 2, FOOT_HEIGHT + PASS_HEIGHT),
					easing: 'ease-in',
				},
			)
		}
		frames.push({ offset: 1, transform: at(footX(0), FOOT_HEIGHT) })
		if (ball)
			animations.push(
				ball.animate(frames, {
					duration,
					iterations: Number.POSITIVE_INFINITY,
				}),
			)

		// Each child's leg: up for a moment around each of their two kicks.
		const window = (KICK_SECONDS * 1000) / duration
		for (let i = 0; i < count; i++) {
			const kicks = [i * turn, i * turn + turn * KEEPY_SHARE]
			const shown = (up: boolean): Keyframe[] => {
				const on = up ? 1 : 0
				const off = up ? 0 : 1
				const keys: Keyframe[] = [{ offset: 0, opacity: off }]
				for (const kick of kicks) {
					const from = Math.max(0, kick - window)
					const to = Math.min(1, kick + window)
					keys.push(
						{ offset: from, opacity: off },
						{ offset: from, opacity: on },
						{ offset: to, opacity: on },
						{ offset: to, opacity: off },
					)
				}
				// The first child's first kick is at the very start: its
				// lead-up is at the very end, before it comes round again.
				if (i === 0)
					keys.push(
						{ offset: 1 - window, opacity: off },
						{ offset: 1 - window, opacity: on },
						{ offset: 1, opacity: on },
					)
				else keys.push({ offset: 1, opacity: off })
				return keys
			}
			const options = { duration, iterations: Number.POSITIVE_INFINITY }
			const up = legsUp[i]
			const down = legsDown[i]
			if (up) animations.push(up.animate(shown(true), options))
			if (down) animations.push(down.animate(shown(false), options))
		}
	})
	onCleanup(() => {
		for (const animation of animations) animation.cancel()
	})

	const layer = (cells: Cells) => (
		<div style={{ position: 'absolute', inset: 0 }}>
			<Pixels width={KID_WIDTH} height={KIDS_HEIGHT} rects={cells} />
		</div>
	)

	return (
		<div
			style={{
				position: 'relative',
				width: `${kidsWidth(count)}px`,
				height: `${KIDS_HEIGHT}px`,
			}}
		>
			<For each={kids}>
				{(kid, i) => (
					<div
						style={{
							position: 'absolute',
							left: `${kid.left}px`,
							bottom: 0,
							width: `${KID_WIDTH}px`,
							height: `${KIDS_HEIGHT}px`,
							transform: kid.facing === 1 ? 'none' : 'scaleX(-1)',
						}}
					>
						{layer(kid.body)}
						<div
							ref={(el) => {
								legsDown[i()] = el
							}}
							style={{ position: 'absolute', inset: 0 }}
						>
							{layer(kid.down)}
						</div>
						<div
							ref={(el) => {
								legsUp[i()] = el
							}}
							style={{ position: 'absolute', inset: 0, opacity: 0 }}
						>
							{layer(kid.up)}
						</div>
					</div>
				)}
			</For>
			<div
				ref={(el) => {
					ball = el
				}}
				style={{ position: 'absolute', left: 0, bottom: 0 }}
			>
				<Pixels width={BALL_SIZE} height={BALL_SIZE} rects={BALL} />
			</div>
		</div>
	)
}

const easeIn = cubicBezier(0.42, 0, 1, 1)
const easeOut = cubicBezier(0, 0, 0.58, 1)

/**
 * `KidsArt`, painted in a Draw Hook: a group of `count`, picked out once,
 * as the painter's made. Painted from (0, 0) of `ctx`, `seconds` into
 * their game: where `KidsArt`'s animations are then, the ball on its way
 * round and each child's leg up as they kick it.
 */
export function kidsPainter(count: number) {
	const kids = kidsOf(count)
	const duration = count * TURN_SECONDS
	const turn = 1 / count
	const window = KICK_SECONDS / duration
	/** The ball's keyframes, as `KidsArt` has them: where it is, how high, and how it goes on from there. */
	const frames: [
		at: number,
		x: number,
		height: number,
		timing: (t: number) => number,
	][] = []
	for (let i = 0; i < count; i++) {
		const start = i * turn
		const pass = start + turn * KEEPY_SHARE
		const x = footOf(kids[i])
		const next = footOf(kids[(i + 1) % count])
		frames.push(
			[start, x, FOOT_HEIGHT, easeOut],
			[(start + pass) / 2, x, FOOT_HEIGHT + KEEPY_HEIGHT, easeIn],
			[pass, x, FOOT_HEIGHT, easeOut],
			[
				(pass + start + turn) / 2,
				(x + next) / 2,
				FOOT_HEIGHT + PASS_HEIGHT,
				easeIn,
			],
		)
	}
	frames.push([1, footOf(kids[0]), FOOT_HEIGHT, easeIn])
	/** Whether child `i`'s leg is up, `progress` through the go round. */
	const kicking = (i: number, progress: number) => {
		const kicks = [i * turn, i * turn + turn * KEEPY_SHARE]
		// The first child's first kick is at the very start: its lead-up is
		// at the very end, before it comes round again.
		if (i === 0 && progress >= 1 - window) return true
		return kicks.some(
			(kick) => progress >= kick - window && progress < kick + window,
		)
	}
	const fill = (ctx: CanvasRenderingContext2D, cells: Cells) => {
		for (const [x, y, w, h, colour] of cells) {
			ctx.fillStyle = colour
			ctx.fillRect(x, y, w, h)
		}
	}
	return (ctx: CanvasRenderingContext2D, seconds: number) => {
		const progress = (seconds % duration) / duration
		kids.forEach((kid, i) => {
			ctx.save()
			ctx.translate(kid.left, 0)
			if (kid.facing === -1) {
				ctx.translate(KID_WIDTH, 0)
				ctx.scale(-1, 1)
			}
			fill(ctx, kid.body)
			fill(ctx, kicking(i, progress) ? kid.up : kid.down)
			ctx.restore()
		})
		// The keyframe it's gone on from, eased as that one says, to the next.
		const next = Math.max(
			1,
			frames.findIndex(([at]) => at > progress),
		)
		const [from, x0, y0, timing] = frames[next - 1]
		const [to, x1, y1] = frames[next]
		const t = timing((progress - from) / (to - from))
		ctx.save()
		ctx.translate(
			x0 + (x1 - x0) * t,
			KIDS_HEIGHT - BALL_SIZE - (y0 + (y1 - y0) * t),
		)
		fill(ctx, BALL)
		ctx.restore()
	}
}
