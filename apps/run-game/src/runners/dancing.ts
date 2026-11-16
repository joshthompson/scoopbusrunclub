import { standPixels } from '@/assets/runners/custom/pixel-data.generated'
import {
	type CharacterSpriteProps,
	drawCustomSprite,
} from '@/utils/createRunnerFrames'
import { RUNNER_SCALE } from '../game/constants'
import {
	DANCES,
	DANCE_HEADROOM,
	type DanceName,
	danceForKey,
	danceLength,
	danceStrip,
} from './dance'

/** Someone's dance, as their sprite has it (see `dance.ts`). */
export interface DanceSprite {
	/** Its frames, as the engine takes them. */
	frames: string[]
	/** How long each shows, in milliseconds. */
	interval: number
	/** One frame's size, in the sprite's own pixels: their stand pose's, and `DANCE_HEADROOM` taller. */
	width: number
	height: number
}

/**
 * A dance from a strip of its frames, `width` by `height` the stand pose it
 * was made from (the strip's `DANCE_HEADROOM` taller).
 */
export function stripDance(
	strip: string,
	name: DanceName,
	width: number,
	height: number,
): DanceSprite {
	const count = danceLength(name)
	const tall = height + DANCE_HEADROOM
	return {
		frames: Array.from(
			{ length: count },
			(_, n) =>
				`${strip}#${-width * RUNNER_SCALE * n},0,${width * count},${tall}`,
		),
		interval: DANCES[name].interval,
		width,
		height: tall,
	}
}

/**
 * A look's dance, made from its stand pose, as the members' are made from
 * theirs: which dance, picked by `key`. None if it can't be drawn here.
 */
export function lookDance(
	look: CharacterSpriteProps,
	key: string,
): DanceSprite | undefined {
	try {
		const drawn = drawCustomSprite(look, standPixels, 2)
		const context = drawn?.canvas.getContext('2d')
		if (!drawn || !context) return undefined
		// Its first frame: stood, arms down.
		const width = drawn.canvas.width / 2
		const stand = context.getImageData(0, 0, width, drawn.totalHeight)
		const name = danceForKey(key)
		const strip = danceStrip(stand, name)
		const canvas = document.createElement('canvas')
		canvas.width = strip.width
		canvas.height = strip.height
		const out = canvas.getContext('2d')
		if (!out) return undefined
		out.putImageData(
			new ImageData(
				new Uint8ClampedArray(strip.data),
				strip.width,
				strip.height,
			),
			0,
			0,
		)
		return stripDance(canvas.toDataURL(), name, width, drawn.totalHeight)
	} catch {
		return undefined
	}
}
