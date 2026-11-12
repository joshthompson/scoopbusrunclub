import { standPixels } from '@/assets/runners/custom/pixel-data.generated'
import {
	type CharacterSpriteProps,
	drawCustomSprite,
} from '@/utils/createRunnerFrames'

/**
 * Ski poses for anyone drawn from a look, a custom runner's, a guest's or
 * anyone in the pack's: made from their stand pose, as the members' are
 * made from theirs (`assets/ski` and `assets/ski-tuck`), so they ski the
 * same way. Stood on skis, knees bent, leant into it, hands forward on
 * their poles, the poles back behind their heels; and curled up in the air,
 * in a forward roll or a grab, back flat, head up, arms forward, their
 * poles under their arms.
 *
 * The stand pose is the custom runner template's (see `standPixels`): 23 by
 * 28, facing left, its head rows 0-6, its shirt 7-15, an arm hanging down at
 * its front, its shorts 16-19, its legs 20-25, and its shoes 26-27.
 */

/** The template's size, and where its parts are. */
const WIDTH = 23
const HEIGHT = 28
const HEAD = { top: 0, bottom: 6, left: 4, right: 16 }
const SHIRT = { top: 7, bottom: 15, left: 8, right: 13 }
/** Where its feet are, near and far: the left of each leg, two columns wide. */
const FEET = { near: 8, far: 11 }

/** How much wider than the stand pose a ski pose is, all of it on its left: leant forward into it. */
const OUT = 30
const IN = 6

/** The seat of the ski stance, row by row from its top: from and to, along from its front. */
const STANCE_SEAT: [from: number, to: number][] = [
	[0, 5],
	[0, 6],
	[0, 6],
	[1, 5],
]

/** The seat of a tuck, row by row from its top: from and to, along from its front. */
const SEAT: [from: number, to: number][] = [
	[1, 4],
	[0, 5],
	[0, 6],
	[0, 7],
	[0, 7],
	[1, 6],
	[3, 5],
]

const POLE: Colour = [0x9a, 0xa3, 0xad, 255]
const POLE_FAR: Colour = [0x6c, 0x74, 0x7e, 255]
const GRIP: Colour = [0x1d, 0x1d, 0x1d, 255]
const BASKET: Colour = [0x3a, 0x3f, 0x46, 255]

type Colour = [number, number, number, number]
type Point = [number, number]

export interface SkiPoses {
	ski: string
	skiTuck: string
	snowboard: string
}

/** A look's ski poses, or none if its stand pose isn't on the template, or can't be drawn here. */
export function skiPosesFor(look: CharacterSpriteProps): SkiPoses | undefined {
	try {
		const drawn = drawCustomSprite(look, standPixels, 2)
		if (!drawn || drawn.totalHeight !== HEIGHT) return undefined
		const context = drawn.canvas.getContext('2d')
		// Its first frame: stood, arms down.
		const stand = context?.getImageData(0, 0, WIDTH, HEIGHT)
		return stand ? skiPoses(stand) : undefined
	} catch {
		return undefined
	}
}

function skiPoses(stand: ImageData): SkiPoses {
	const get = (x: number, y: number): Colour | undefined => {
		if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return undefined
		const i = (y * WIDTH + x) * 4
		const c = stand.data
		return c[i + 3] > 128 ? [c[i], c[i + 1], c[i + 2], 255] : undefined
	}
	const key = (c: Colour) => c.slice(0, 3).join(',')
	/** The commonest colour from `x0` to `x1`, `y0` to `y1`. */
	const majority = (x0: number, x1: number, y0: number, y1: number) => {
		const counts = new Map<string, [Colour, number]>()
		for (let y = y0; y <= y1; y++)
			for (let x = x0; x <= x1; x++) {
				const c = get(x, y)
				if (c) counts.set(key(c), [c, (counts.get(key(c))?.[1] ?? 0) + 1])
			}
		return [...counts.values()].sort((a, b) => b[1] - a[1])[0]?.[0]
	}
	const skin = majority(9, 11, 3, 5) ?? [242, 192, 154, 255]
	const shirt = majority(9, 12, 8, 14) ?? skin
	const sleeve = majority(7, 7, 12, 14) ?? skin
	const shorts = majority(8, 12, 16, 19) ?? shirt
	const leg = majority(8, 9, 20, 24) ?? skin
	const shoe = majority(7, 12, 26, 27) ?? leg
	const shade = (c: Colour, by: number): Colour => [
		Math.min(255, Math.round(c[0] * by)),
		Math.min(255, Math.round(c[1] * by)),
		Math.min(255, Math.round(c[2] * by)),
		255,
	]
	/** The shirt at `x`, `y` of the stand pose, its arm painted out. */
	const shirtAt = (x: number, y: number) => {
		if (x < SHIRT.left || x > SHIRT.right) return undefined
		const c = get(x, y)
		return !c || key(c) === key(skin) ? shirt : c
	}

	function pose(draw: (pen: Pen) => void) {
		const canvas = document.createElement('canvas')
		canvas.width = OUT
		canvas.height = HEIGHT
		const context = canvas.getContext('2d')
		if (!context) throw new Error('No canvas to draw on')
		const image = context.createImageData(OUT, HEIGHT)
		const put = (x: number, y: number, c: Colour | undefined) => {
			if (!c || x < 0 || y < 0 || x >= OUT || y >= HEIGHT) return
			image.data.set(c, (y * OUT + x) * 4)
		}
		const line = ([x0, y0]: Point, [x1, y1]: Point, c: Colour, thick = 1) => {
			const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
			for (let i = 0; i <= steps; i++) {
				const x = Math.round(x0 + ((x1 - x0) * i) / steps)
				const y = Math.round(y0 + ((y1 - y0) * i) / steps)
				for (let d = 0; d < thick; d++) put(x + d, y, c)
			}
		}
		draw({ put, line })
		context.putImageData(image, 0, 0)
		return canvas.toDataURL('image/png')
	}
	interface Pen {
		put: (x: number, y: number, c: Colour | undefined) => void
		line: (from: Point, to: Point, c: Colour, thick?: number) => void
	}
	/** A leg, its boot at `foot`, up to its knee, back up to its hip. */
	const legFrom = (
		pen: Pen,
		foot: Point,
		knee: Point,
		hip: Point,
		c: Colour,
	) => {
		pen.line(knee, hip, c, 2)
		pen.line([foot[0], foot[1] - 2], knee, c, 2)
		for (const y of [foot[1] - 1, foot[1]])
			for (let x = foot[0] - 1; x <= foot[0] + 2; x++) pen.put(x, y, shoe)
	}
	/** A pole: its grip in the hand at `from`, its shaft to its tip at `to`, its basket near the tip. */
	const pole = (pen: Pen, from: Point, to: Point, c: Colour) => {
		pen.line(from, to, c)
		pen.put(from[0], from[1], GRIP)
		pen.put(from[0], from[1] - 1, GRIP)
		const bx = Math.round(from[0] + (to[0] - from[0]) * 0.85)
		const by = Math.round(from[1] + (to[1] - from[1]) * 0.85)
		pen.put(bx, by - 1, BASKET)
		pen.put(bx, by + 1, BASKET)
	}
	/** The head, stood pose's, at `dx` along, its bottom row on `bottom`. */
	const head = (pen: Pen, dx: number, bottom: number) => {
		const dy = bottom - HEAD.bottom
		for (let y = HEAD.top; y <= HEAD.bottom; y++)
			for (let x = HEAD.left; x <= HEAD.right; x++)
				pen.put(x + IN + dx, y + dy, get(x, y))
	}
	const B = HEIGHT - 1

	/**
	 * Stood on skis, or a snowboard: knees bent forward, hips back, leant
	 * into it. On skis, hands forward on the poles; on a snowboard, no poles,
	 * the near arm out forward and the far one back, for balance.
	 */
	const stance = (skis: boolean) =>
		pose((pen) => {
			const far = shade(leg, 0.85)
			const hipY = B - 7
			const shortsTop = hipY - 3
			const shirtBottom = shortsTop - 1
			const shirtTop = shirtBottom - (SHIRT.bottom - SHIRT.top)
			const by = skis ? 0.5 : 0.35
			const lean = (y: number) => -Math.round((shirtBottom - y) * by)
			const shoulder: Point = [
				SHIRT.left + IN + 1 + lean(shirtTop + 1),
				shirtTop + 1,
			]
			const hand: Point = [shoulder[0] - 4, shoulder[1] + 5]
			const farHand: Point = [hand[0] + 2, hand[1] + 1]
			// The far pole, behind them, and the far leg.
			if (skis) pole(pen, farHand, [25, B - 1], POLE_FAR)
			legFrom(
				pen,
				[FEET.far + IN, B],
				[FEET.far + IN - 2, B - 4],
				[FEET.far + IN, hipY],
				far,
			)
			legFrom(
				pen,
				[FEET.near + IN, B],
				[FEET.near + IN - 2, B - 4],
				[FEET.near + IN + 1, hipY],
				leg,
			)
			// Shorts, the seat rounded out behind, not a box, shaded round its
			// back and underneath.
			STANCE_SEAT.forEach(([from, to], row) => {
				for (let dx = from; dx <= to; dx++) {
					const edge = dx === to || row === STANCE_SEAT.length - 1
					pen.put(
						8 + IN + dx,
						shortsTop + row,
						edge ? shade(shorts, 0.78) : shorts,
					)
				}
			})
			for (let y = SHIRT.top; y <= SHIRT.bottom; y++) {
				const out = shirtTop + (y - SHIRT.top)
				for (let x = SHIRT.left; x <= SHIRT.right; x++)
					pen.put(x + IN + 1 + lean(out), out, shirtAt(x, y))
			}
			head(pen, 1 + lean(shirtTop), shirtTop - 1)
			if (!skis) {
				// The far arm, out back from behind the shoulders; the near one
				// out forward.
				const back: Point = [shoulder[0] + 7, shoulder[1] + 1]
				pen.line([shoulder[0] + 5, shoulder[1] + 1], back, shade(sleeve, 0.75))
				pen.line(back, [back[0] + 2, back[1] + 3], shade(sleeve, 0.75))
				pen.put(back[0] + 2, back[1] + 4, shade(skin, 0.8))
				const front: Point = [shoulder[0] - 5, shoulder[1] + 3]
				pen.line(shoulder, [shoulder[0] - 2, shoulder[1] + 2], sleeve)
				pen.line(
					[shoulder[0] - 2, shoulder[1] + 2],
					[front[0] + 1, front[1]],
					sleeve,
				)
				pen.put(front[0], front[1], skin)
				return
			}
			// Arms: the far one out from behind the body, the near one over it.
			pen.line([shoulder[0] - 1, shoulder[1] + 3], farHand, shade(sleeve, 0.75))
			pen.put(farHand[0], farHand[1], shade(skin, 0.8))
			pen.line(shoulder, [shoulder[0] - 1, shoulder[1] + 3], sleeve)
			pen.line(
				[shoulder[0] - 1, shoulder[1] + 3],
				[hand[0] + 1, hand[1]],
				sleeve,
			)
			pen.put(hand[0], hand[1], skin)
			// The near pole, in front, its tip trailing just behind the heels.
			pole(pen, hand, [22, B - 1], POLE)
		})

	/** Curled up: crouched right down, back flat, head up, arms forward over the knees, poles under them. */
	const skiTuck = pose((pen) => {
		const far = shade(leg, 0.85)
		const hip: Point = [12 + IN, B - 9]
		const shoulder: Point = [IN + 2, B - 13]
		const hand: Point = [shoulder[0] - 3, B - 9]
		const farHand: Point = [hand[0] + 2, hand[1] + 1]
		pole(pen, farHand, [29, B - 16], POLE_FAR)
		legFrom(
			pen,
			[FEET.far + IN, B],
			[FEET.far + IN - 4, B - 6],
			[FEET.far + IN + 2, B - 7],
			far,
		)
		legFrom(
			pen,
			[FEET.near + IN, B],
			[FEET.near + IN - 4, B - 6],
			[FEET.near + IN + 2, B - 7],
			leg,
		)
		// Shorts, round the hips: a rounded seat, not a box, shaded round
		// its back and underneath.
		SEAT.forEach(([from, to], row) => {
			for (let dx = from; dx <= to; dx++) {
				const edge = dx === to || row === SEAT.length - 1
				pen.put(10 + IN + dx, B - 10 + row, edge ? shade(shorts, 0.78) : shorts)
			}
		})
		// The back, near enough flat, from the hips to the shoulders.
		for (let i = 0; i <= 14; i++) {
			const t = i / 14
			const x = Math.round(hip[0] + (shoulder[0] - hip[0]) * t)
			const y = Math.round(hip[1] + (shoulder[1] - hip[1]) * t)
			for (let d = -2; d <= 2; d++)
				pen.put(x, y + d, d === -2 ? shade(shirt, 1.15) : shirt)
		}
		head(pen, shoulder[0] - (SHIRT.left + IN) - 2, shoulder[1] - 1)
		pen.line([shoulder[0] + 1, shoulder[1] + 2], farHand, shade(sleeve, 0.75))
		pen.put(farHand[0], farHand[1], shade(skin, 0.8))
		pen.line([shoulder[0], shoulder[1] + 1], [hand[0] + 1, hand[1]], sleeve)
		pen.put(hand[0], hand[1], skin)
		pole(pen, hand, [28, B - 15], POLE)
	})

	return { ski: stance(true), skiTuck, snowboard: stance(false) }
}
