import aeroplaneAsset from '@/assets/misc/aeroplane.png'
import { createController, createObjectSignal } from '@/engine'
import { generateFrames } from '@/utils'
import { css } from '@style/css'

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

export function createAeroplaneController(
	id: string,
	sceneWidth: number,
	names: string[],
) {
	const startX = sceneWidth + DISPLAY_WIDTH
	return createController({
		frames: aeroplaneFrames,
		init() {
			return {
				id,
				type: 'aeroplane',
				width: () => DISPLAY_WIDTH,
				height: () => DISPLAY_HEIGHT,
				...createObjectSignal(startX, 'x'),
				...createObjectSignal(ALTITUDE, 'y'),
				state: () => 'play' as const, // spin the propeller
				frameInterval: () => 100,
				children: () => {
					return (
						<div
							class={css({
								background: '#FFF',
								width: 'max-content',
								padding: '1px 6px',
								fontFamily: '"Jersey 10"',
								position: 'absolute',
								right: '0',
								translate: '100% -8px',
								fontSize: '24px',
							})}
						>
							Happy Birthday {names.join(' and ')}!
						</div>
					)
				},
			}
		},
		onEnterFrame({ $ }) {
			$.setX($.x() - SPEED)
			// Once fully off the left edge, loop back out beyond the right edge
			// so it flies past again after a gap.
			if ($.x() < -DISPLAY_WIDTH) {
				$.setX(startX + PASS_GAP)
			}
		},
	})
}
