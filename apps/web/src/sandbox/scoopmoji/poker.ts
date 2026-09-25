/**
 * Poker cards as sticker artwork, drawn the way `PokerCards.tsx` lays them
 * out: a white face bordered in the suit's colour, the runner mid-stride in
 * the middle, their name underneath. No time and no position — this deck is
 * just people. Half the deck is red, half black.
 */
import cardBack from '@/assets/misc/card.png'
import { type SpriteMember, loadImage } from '../shared/sprites'

/** The card as the page draws it, in CSS pixels. */
const CARD_WIDTH = 72
const CARD_HEIGHT = 104
const BORDER = 3
const SPRITE_BOX_HEIGHT = 58
const SPRITE_BOX_TOP = 10
const NAME_FONT = 14
const RED = '#d93025'
const BLACK = '#000000'

/** Drawn this many times larger than on the page, so the sticker is crisp. */
export const CARD_SCALE = 4

export type CardColor = 'red' | 'black'

function cardCanvas() {
	const canvas = document.createElement('canvas')
	canvas.width = CARD_WIDTH * CARD_SCALE
	canvas.height = CARD_HEIGHT * CARD_SCALE
	const ctx = canvas.getContext('2d')
	if (!ctx) throw new Error('No 2d context')
	ctx.imageSmoothingEnabled = false
	return { canvas, ctx }
}

/**
 * The notch at each corner, a touch smaller than the page's 6px so the card
 * back's frame (chamfered just inside a 4px corner mark) is left intact.
 */
const NOTCH = 4

/**
 * A rectangle with a square notch cut out of each corner, which is what the
 * browser draws for `corner-shape: notch`. Ready to fill or clip.
 */
function notchedPath(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	n: number,
) {
	ctx.beginPath()
	ctx.moveTo(x + n, y)
	ctx.lineTo(x + w - n, y)
	ctx.lineTo(x + w - n, y + n)
	ctx.lineTo(x + w, y + n)
	ctx.lineTo(x + w, y + h - n)
	ctx.lineTo(x + w - n, y + h - n)
	ctx.lineTo(x + w - n, y + h)
	ctx.lineTo(x + n, y + h)
	ctx.lineTo(x + n, y + h - n)
	ctx.lineTo(x, y + h - n)
	ctx.lineTo(x, y + n)
	ctx.lineTo(x + n, y + n)
	ctx.closePath()
}

/**
 * The face inside the border, for filling white or clipping artwork to. Its
 * notch is the same size as the outer one, so the border runs around each
 * notch as an L at full thickness, as the browser draws it.
 */
function innerPath(ctx: CanvasRenderingContext2D) {
	const s = CARD_SCALE
	const b = BORDER * s
	notchedPath(
		ctx,
		b,
		b,
		CARD_WIDTH * s - 2 * b,
		CARD_HEIGHT * s - 2 * b,
		NOTCH * s,
	)
}

/**
 * The card's frame: a white face with a coloured border and notched corners.
 */
function drawFrame(ctx: CanvasRenderingContext2D, color: string) {
	const s = CARD_SCALE
	ctx.fillStyle = color
	notchedPath(ctx, 0, 0, CARD_WIDTH * s, CARD_HEIGHT * s, NOTCH * s)
	ctx.fill()
	ctx.fillStyle = '#ffffff'
	innerPath(ctx)
	ctx.fill()
}

async function ensureFont() {
	const spec = `${NAME_FONT * CARD_SCALE}px "Jersey 10"`
	for (let attempt = 0; attempt < 20; attempt++) {
		try {
			await document.fonts.ready
			await document.fonts.load(spec)
		} catch {}
		const loaded = [...document.fonts].some(
			(f) =>
				f.family.replace(/"/g, '') === 'Jersey 10' && f.status === 'loaded',
		)
		if (loaded && document.fonts.check(spec)) return
		await new Promise((r) => setTimeout(r, 150))
	}
}

export async function renderCardFace(
	member: SpriteMember,
	color: CardColor,
): Promise<HTMLCanvasElement> {
	await ensureFont()
	const { canvas, ctx } = cardCanvas()
	const s = CARD_SCALE
	const ink = color === 'red' ? RED : BLACK
	drawFrame(ctx, ink)

	// The runner, at twice their size on the page, first frame of the sheet.
	const sheet = await loadImage(member.runSheet)
	const fw = Math.round(sheet.naturalWidth / member.frameCount)
	const fh = sheet.naturalHeight
	const innerW = (CARD_WIDTH - 2 * BORDER) * s
	// A pram or a dog makes for a wide sprite: keep it inside the card.
	const spriteScale = Math.min(2 * s, Math.floor(innerW / fw))
	const boxTop = (BORDER + SPRITE_BOX_TOP) * s
	const boxH = SPRITE_BOX_HEIGHT * s
	const dw = fw * spriteScale
	const dh = fh * spriteScale
	ctx.drawImage(
		sheet,
		0,
		0,
		fw,
		fh,
		Math.round((canvas.width - dw) / 2),
		Math.round(boxTop + (boxH - dh) / 2),
		dw,
		dh,
	)

	// Their name, in the page's pixel font.
	ctx.fillStyle = ink
	ctx.font = `${NAME_FONT * s}px "Jersey 10", sans-serif`
	ctx.textAlign = 'center'
	ctx.textBaseline = 'top'
	ctx.fillText(
		member.data.name,
		canvas.width / 2,
		boxTop + boxH + 4 * s,
		innerW - 8 * s,
	)
	return canvas
}

/** The back: `card.png` inside a red border, as on the page. */
export async function renderCardBack(): Promise<HTMLCanvasElement> {
	const { canvas, ctx } = cardCanvas()
	const s = CARD_SCALE
	drawFrame(ctx, RED)
	const back = await loadImage(cardBack)
	const b = BORDER * s
	// Clipped to the face, so the art's square corners follow the notches.
	ctx.save()
	innerPath(ctx)
	ctx.clip()
	ctx.drawImage(back, b, b, canvas.width - 2 * b, canvas.height - 2 * b)
	ctx.restore()
	return canvas
}
