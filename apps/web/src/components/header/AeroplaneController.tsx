import aeroplaneAsset from '@/assets/misc/aeroplane.png'
import { generateFrames } from '@/utils'
import { type Scene, createController, createObjectSignal } from 'scoopjs'

// Sprite sheet: 518×117, two propeller-animation frames of 259×117 side by side.
// The plane's nose points left (it flies right-to-left) and the tow-line for a
// future banner trails off the top-right, behind it.
const SHEET_WIDTH = 518
const FRAME_HEIGHT = 117
const FRAME_WIDTH = 259
const SCALE = 0.3

const DISPLAY_WIDTH = FRAME_WIDTH * SCALE
const DISPLAY_HEIGHT = FRAME_HEIGHT * SCALE

const aeroplaneFrames = generateFrames(
	aeroplaneAsset,
	SHEET_WIDTH,
	FRAME_HEIGHT,
	DISPLAY_WIDTH,
	2,
)

const SPEED = 3 // px moved left each tick
const ALTITUDE = 18 // y position, high up among the clouds
const PASS_GAP = 600 // px of off-screen space before it flies past again

const AEROPLANE_TYPE = 'aeroplane'

/**
 * The banner it tows, trailing off its tail: white, with a notch cut into the
 * end of it, and its top a little above the plane's.
 */
const BANNER_FONT = '24px "Jersey 10", sans-serif'
/** The banner's line height: the page's `line-height: 1.5`, as it always had. */
const BANNER_LINE_HEIGHT = 24 * 1.5
const BANNER_PADDING = { top: 1, right: 36, bottom: 1, left: 12 }
const BANNER_NOTCH = 24
const BANNER_TOP = -8

/** Paints the banner, starting at the plane's tail. */
function paintBanner(
	ctx: CanvasRenderingContext2D,
	text: string,
	planeWidth: number,
) {
	ctx.font = BANNER_FONT
	const metrics = ctx.measureText(text)
	const ascent = metrics.fontBoundingBoxAscent
	// The text in the middle of its line, as CSS shares the extra out.
	const leading =
		(BANNER_LINE_HEIGHT - ascent - metrics.fontBoundingBoxDescent) / 2
	const width = BANNER_PADDING.left + metrics.width + BANNER_PADDING.right
	const height = BANNER_PADDING.top + BANNER_LINE_HEIGHT + BANNER_PADDING.bottom
	const left = planeWidth
	const right = left + width

	ctx.beginPath()
	ctx.moveTo(left, BANNER_TOP)
	ctx.lineTo(right, BANNER_TOP)
	ctx.lineTo(right - BANNER_NOTCH, BANNER_TOP + height / 2)
	ctx.lineTo(right, BANNER_TOP + height)
	ctx.lineTo(left, BANNER_TOP + height)
	ctx.closePath()
	ctx.fillStyle = '#FFF'
	ctx.fill()

	ctx.fillStyle = '#000'
	ctx.textBaseline = 'alphabetic'
	ctx.fillText(
		text,
		left + BANNER_PADDING.left,
		BANNER_TOP + BANNER_PADDING.top + leading + ascent,
	)
}

export function createAeroplaneController(
	id: string,
	sceneWidth: number,
	names: string[],
) {
	const startX = sceneWidth + DISPLAY_WIDTH
	const bannerText = `Happy Birthday ${names.join(' and ')}!`
	// Nothing else in the header asks for the font, so the canvas would paint
	// the banner in the fallback until something did.
	document.fonts?.load(BANNER_FONT)
	return createController({
		frames: aeroplaneFrames,
		init() {
			return {
				id,
				type: AEROPLANE_TYPE,
				width: () => DISPLAY_WIDTH,
				height: () => DISPLAY_HEIGHT,
				...createObjectSignal(startX, 'x'),
				...createObjectSignal(ALTITUDE, 'y'),
				state: () => 'play' as const, // spin the propeller
				frameInterval: () => 100,
			}
		},
		onEnterFrame({ $ }) {
			$.setX($.x() - SPEED)
			// Once fully off the left edge, loop back out beyond the right edge
			// so it flies past again after a gap.
			if ($.x() < -DISPLAY_WIDTH - 1000) {
				$.setX(startX + PASS_GAP)
			}
		},
		// The banner reaches well past the tail: generously, since it's only
		// measured once it's painted.
		drawReach: {
			top: -BANNER_TOP,
			right:
				bannerText.length * 16 + BANNER_PADDING.left + BANNER_PADDING.right,
		},
		draw({ ctx, drawDefault, $ }) {
			drawDefault()
			paintBanner(ctx, bannerText, $.width())
		},
	})
}

/**
 * Send the plane over for `names`, in place of any already flying, at the same
 * depth the header's own birthday plane gets: up in the sky, just in front of
 * the clouds and behind everything else. It comes in from the right straight
 * away.
 */
export function flyAeroplane(scene: Scene, names: string[]) {
	const aeroplane = createAeroplaneController(
		AEROPLANE_TYPE,
		scene.canvas.get().width(),
		names,
	)
	aeroplane.setGame(scene)
	const current = scene.controllers
		.get()
		.filter(({ controller }) => controller.type !== AEROPLANE_TYPE)
	const lastCloud = current.findLastIndex(
		({ controller }) => controller.type === 'cloud',
	)
	current.splice(lastCloud + 1, 0, { id: aeroplane.id, controller: aeroplane })
	scene.controllers.set(current)
}
