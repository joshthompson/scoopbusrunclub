/**
 * The club's artwork, cut up for the sandbox pages.
 *
 * Every page here draws members from the same sprite sheets the header uses
 * (`data/runners`), so nothing is redrawn — a member gets a scoopmoji, a
 * dance spot or a badger slot the moment they have header art.
 */
import { type RunnerData, type RunnerName, runners } from '@/data/runners'

export interface SpriteMember {
	key: RunnerName
	data: RunnerData
	/** The running sprite sheet, frames side by side. */
	runSheet: string
	frameCount: number
	/** Their head on its own, a handful of pixels across. */
	face: string | undefined
	sit: string | undefined
}

/** Every member with running artwork, in the order `data/runners` lists them. */
export function spriteMembers(): SpriteMember[] {
	const out: SpriteMember[] = []
	for (const [key, [accessor]] of Object.entries(runners)) {
		const data = accessor()
		const run = data.frames.run
		if (!run || run.length === 0) continue
		out.push({
			key: key as RunnerName,
			data,
			runSheet: run[0].split('#')[0],
			frameCount: run.length,
			face: data.frames.face?.[0],
			sit: data.frames.sit?.[0],
		})
	}
	return out
}

const imageCache = new Map<string, Promise<HTMLImageElement>>()

export function loadImage(url: string): Promise<HTMLImageElement> {
	let pending = imageCache.get(url)
	if (!pending) {
		pending = new Promise((resolve, reject) => {
			const img = new Image()
			img.onload = () => resolve(img)
			img.onerror = () => reject(new Error(`Could not load ${url}`))
			img.src = url
		})
		imageCache.set(url, pending)
	}
	return pending
}

/** The natural size of one running frame, once the sheet has loaded. */
export async function frameSize(member: SpriteMember) {
	const img = await loadImage(member.runSheet)
	return {
		width: img.naturalWidth / member.frameCount,
		height: img.naturalHeight,
		sheetWidth: img.naturalWidth,
	}
}

/**
 * One frame of a sheet, or a whole single-frame image, drawn crisp at an
 * integer scale onto a fresh canvas.
 */
export function drawFrame(
	img: HTMLImageElement,
	frameIndex: number,
	frameCount: number,
	scale: number,
): HTMLCanvasElement {
	const fw = Math.round(img.naturalWidth / frameCount)
	const fh = img.naturalHeight
	const canvas = document.createElement('canvas')
	canvas.width = fw * scale
	canvas.height = fh * scale
	const ctx = canvas.getContext('2d')
	if (!ctx) throw new Error('No 2d context')
	ctx.imageSmoothingEnabled = false
	ctx.drawImage(img, frameIndex * fw, 0, fw, fh, 0, 0, fw * scale, fh * scale)
	return canvas
}

/**
 * A sticker: the artwork centred on a square transparent canvas with a white
 * outline, the way chat stickers are drawn so they read on any background.
 * Outlining happens at the art's own resolution so it stays one crisp pixel.
 */
export function drawSticker(
	img: HTMLImageElement,
	frameIndex: number,
	frameCount: number,
	size: number,
	options: { outline?: boolean; padding?: number } = {},
): HTMLCanvasElement {
	const fw = Math.round(img.naturalWidth / frameCount)
	const fh = img.naturalHeight
	const outline = options.outline ?? true
	const pad = outline ? 1 : 0

	// Native-resolution pass: the frame plus a one-pixel white halo.
	const small = document.createElement('canvas')
	small.width = fw + pad * 2
	small.height = fh + pad * 2
	const sctx = small.getContext('2d')
	if (!sctx) throw new Error('No 2d context')
	sctx.imageSmoothingEnabled = false
	if (outline) {
		const tint = document.createElement('canvas')
		tint.width = fw
		tint.height = fh
		const tctx = tint.getContext('2d')
		if (!tctx) throw new Error('No 2d context')
		tctx.imageSmoothingEnabled = false
		tctx.drawImage(img, frameIndex * fw, 0, fw, fh, 0, 0, fw, fh)
		tctx.globalCompositeOperation = 'source-in'
		tctx.fillStyle = '#ffffff'
		tctx.fillRect(0, 0, fw, fh)
		for (const [dx, dy] of [
			[-1, 0],
			[1, 0],
			[0, -1],
			[0, 1],
			[-1, -1],
			[1, -1],
			[-1, 1],
			[1, 1],
		]) {
			sctx.drawImage(tint, pad + dx, pad + dy)
		}
	}
	sctx.drawImage(img, frameIndex * fw, 0, fw, fh, pad, pad, fw, fh)

	// Upscale by the largest integer that fits inside the padded square.
	const padding = options.padding ?? 0.08
	const inner = size * (1 - padding * 2)
	const scale = Math.max(
		1,
		Math.floor(inner / Math.max(small.width, small.height)),
	)
	const canvas = document.createElement('canvas')
	canvas.width = size
	canvas.height = size
	const ctx = canvas.getContext('2d')
	if (!ctx) throw new Error('No 2d context')
	ctx.imageSmoothingEnabled = false
	const w = small.width * scale
	const h = small.height * scale
	ctx.drawImage(
		small,
		Math.round((size - w) / 2),
		Math.round((size - h) / 2),
		w,
		h,
	)
	return canvas
}

export function canvasToBlob(
	canvas: HTMLCanvasElement,
	type: string,
): Promise<Blob> {
	return new Promise((resolve, reject) => {
		canvas.toBlob((blob) => {
			if (blob) resolve(blob)
			else reject(new Error('toBlob failed'))
		}, type)
	})
}

export function downloadBlob(blob: Blob, filename: string) {
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = filename
	document.body.appendChild(a)
	a.click()
	a.remove()
	setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
