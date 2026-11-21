import { audioContext, wake } from '../../audio'
import {
	SPLASH_TICKS,
	SPLASH_UP,
	SPLASH_WIDTH,
	paintSplash,
} from '../../draw/art/splash'
import { TICK_MS } from '../../game/constants'
import { type SoundNotes, voiceNotes } from '../../sfx'

/** The scene: game pixels across and down, and where the sea's surface is. */
const W = 260
const H = 160
const SEA = 138

/**
 * The game's splash, going off over a little sea in `canvas` as each sound
 * plays, the way it does in the game: so what's heard has something to go
 * with.
 */
export function splashScene(canvas: HTMLCanvasElement) {
	canvas.width = W
	canvas.height = H
	const ctx = canvas.getContext('2d')
	let started = -1
	let frame = 0

	function sea() {
		if (!ctx) return
		ctx.globalAlpha = 1
		ctx.fillStyle = '#3b7ea8'
		ctx.fillRect(0, 0, W, SEA)
		ctx.fillStyle = '#1f5b84'
		ctx.fillRect(0, SEA, W, H - SEA)
		ctx.fillStyle = '#4f93bb'
		for (let i = 0; i * 16 < W; i++)
			ctx.fillRect(i * 16 + (i % 2) * 6, SEA + 8 + (i % 3) * 8, 8, 2)
		ctx.fillStyle = '#9fd3ee'
		ctx.fillRect(0, SEA, W, 2)
	}

	function draw(now: number) {
		sea()
		const age = started < 0 ? SPLASH_TICKS : (now - started) / TICK_MS
		if (ctx && age < SPLASH_TICKS) {
			ctx.save()
			ctx.translate(W / 2 - SPLASH_WIDTH / 2, SEA - SPLASH_UP)
			paintSplash(ctx, Math.floor(age))
			ctx.restore()
			frame = requestAnimationFrame(draw)
		} else frame = 0
	}
	draw(performance.now())

	return {
		/** `sound` played, through the game's own synth, and the splash with it. */
		play(sound: SoundNotes, volume = sound.volume) {
			const context = audioContext()
			wake(context)
			voiceNotes(context, context.destination, { ...sound, volume })
			started = performance.now()
			if (!frame) frame = requestAnimationFrame(draw)
		},
	}
}
