/**
 * Milestone balloons as sticker artwork: the digits of the milestone tied in
 * a bunch to a weight, laid out the way `MilestoneBalloons.tsx` hangs them on
 * a results card, using the same balloon art and colours.
 */
import weightAsset from '@/assets/balloons/weight.png'
import { MILESTONE_BALLOONS } from '@/data/balloons'
import { loadImage } from '../shared/sprites'

/** Drawn this many times larger than the art, so the sticker is crisp. */
const SCALE = 4
/** In art pixels: the card's 10px gap and 90px float at its scale of 3. */
const GAP = 3
const FLOAT_HEIGHT = 30
const MARGIN = 8
/** The card's small per-balloon tilts and rises, and the art's own lean. */
const TILTS = [-3, 2.5, -1.5]
const RISES = [0, 2, -1]
const ART_LEAN = 14
/** The weight's art is 9×6, with its tie loop a pixel below the top middle. */
const WEIGHT = { width: 9, height: 6, tieDepth: 1 }

/** Every milestone the site flies balloons for, lowest first. */
export const BALLOON_MILESTONES = Object.keys(MILESTONE_BALLOONS)
	.map(Number)
	.sort((a, b) => a - b)

export async function renderMilestoneBunch(
	milestone: number,
): Promise<HTMLCanvasElement> {
	const digits = MILESTONE_BALLOONS[milestone] ?? []
	const rowWidth = digits.reduce(
		(total, d, i) => total + d.width + (i ? GAP : 0),
		0,
	)
	const tallest = Math.max(...digits.map((d) => d.height))
	const reach = FLOAT_HEIGHT + Math.max(...RISES) + tallest

	const width = (rowWidth + MARGIN * 2) * SCALE
	const height = (reach + WEIGHT.height - WEIGHT.tieDepth + MARGIN * 2) * SCALE
	const canvas = document.createElement('canvas')
	canvas.width = width
	canvas.height = height
	const ctx = canvas.getContext('2d')
	if (!ctx) throw new Error('No 2d context')
	ctx.imageSmoothingEnabled = false

	// The knot: under the middle of the row, with the weight hanging below.
	const knotX = width / 2
	const knotY = (MARGIN + reach) * SCALE

	// Where each balloon floats, relative to the knot.
	let alongRow = 0
	const spots = digits.map((d, i) => {
		const x = alongRow + d.width / 2 - rowWidth / 2
		alongRow += d.width + GAP
		return { x, y: FLOAT_HEIGHT + RISES[i % RISES.length] }
	})

	// Strings first, so the balloons and the weight cover their ends.
	ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)'
	ctx.lineWidth = 0.7 * SCALE
	ctx.lineCap = 'round'
	for (const spot of spots) {
		ctx.beginPath()
		ctx.moveTo(knotX, knotY)
		ctx.lineTo(knotX + spot.x * SCALE, knotY - spot.y * SCALE)
		ctx.stroke()
	}

	// Each balloon stands on the end of its string, turned upright out of the
	// lean it was drawn with, with only its own small tilt left.
	for (const [i, d] of digits.entries()) {
		const img = await loadImage(d.src)
		const spot = spots[i]
		const tilt = TILTS[i % TILTS.length] - ART_LEAN
		ctx.save()
		ctx.translate(knotX + spot.x * SCALE, knotY - spot.y * SCALE)
		ctx.rotate((tilt * Math.PI) / 180)
		ctx.drawImage(
			img,
			(-d.width / 2) * SCALE,
			-d.height * SCALE,
			d.width * SCALE,
			d.height * SCALE,
		)
		ctx.restore()
	}

	const weight = await loadImage(weightAsset)
	ctx.drawImage(
		weight,
		knotX - (WEIGHT.width / 2) * SCALE,
		knotY - WEIGHT.tieDepth * SCALE,
		WEIGHT.width * SCALE,
		WEIGHT.height * SCALE,
	)
	return canvas
}
