/**
 * Lossless WebP from a canvas, in every browser.
 *
 * WhatsApp sticker packs want WebP, and the Sticker Maker apps only count
 * WebP files as stickers. Chrome can encode WebP from a canvas but Safari
 * can't, and Chrome's is lossy, which smears pixel art. So the encoding goes
 * through a small WebAssembly build of libwebp instead, losslessly, which
 * works the same on a phone as on a desktop.
 */
import wasmUrl from '@jsquash/webp/codec/enc/webp_enc.wasm?url'
import wasmSimdUrl from '@jsquash/webp/codec/enc/webp_enc_simd.wasm?url'
import encode, { init } from '@jsquash/webp/encode'

let ready: Promise<unknown> | undefined

/** The encoder finds its wasm next to its own script, which a bundle moves. */
function ensureEncoder() {
	if (!ready) {
		ready = init({
			locateFile: (path: string) =>
				path.endsWith('_simd.wasm') ? wasmSimdUrl : wasmUrl,
		})
	}
	return ready
}

export async function canvasToWebp(
	canvas: HTMLCanvasElement,
): Promise<Uint8Array> {
	const ctx = canvas.getContext('2d')
	if (!ctx) throw new Error('No 2d context')
	await ensureEncoder()
	const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
	const buffer = await encode(image, { lossless: 1, quality: 100, exact: 1 })
	return new Uint8Array(buffer)
}
