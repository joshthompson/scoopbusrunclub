import { createController } from 'scoopjs'
import { createSignal } from 'solid-js'
import {
	PIGLET_FRAMES,
	PIGLET_HEIGHT,
	PIGLET_WIDTH,
	SOW_FRAMES,
	SOW_HEIGHT,
	SOW_WIDTH,
} from '../courses/kit/huddingeScenery'
import { PATH_FRONT, RUN_TOP_SPEED } from '../game/constants'
import type { World } from '../game/world'

/**
 * A family of wild boar (see `CourseLook['boars']`): as whoever's racing
 * in front gets to `from`, from behind, off the left of the screen, a sow
 * and her piglets come trotting along the grass in front of the path, the
 * piglets in a line behind her, at a steady pace a touch quicker than
 * anyone runs (`SPEED`): slowly catching up, a good while alongside, and
 * slowly drawing away ahead. Only to be seen: nobody runs into them. Where
 * they are goes by the tick from when they came out, so it's the same on
 * a Round's every screen.
 */

/** Each of the family: its frames, its size, how far behind the sow, and how far down the grass in front of the path. */
const FAMILY = [
	{
		frames: SOW_FRAMES,
		width: SOW_WIDTH,
		height: SOW_HEIGHT,
		behind: 0,
		down: 34,
	},
	...[
		[44, 22],
		[70, 42],
		[96, 26],
		[120, 44],
	].map(([behind, down]) => ({
		frames: PIGLET_FRAMES,
		width: PIGLET_WIDTH,
		height: PIGLET_HEIGHT,
		behind,
		down,
	})),
]

/**
 * How fast they run, a tick, all the way: steady, a touch faster than anyone
 * runs flat out (`RUN_TOP_SPEED`), so they come up from behind slowly, run
 * along beside whoever's at full tilt a good while, and slowly draw away;
 * faster, past anyone slowed down, up a hill or in the mud.
 */
const SPEED = RUN_TOP_SPEED + 0.5
/**
 * How far back from `from` the sow starts: off the left of the screen, as
 * whoever's there is at `from`. Or further, if the screen's zoomed out
 * that far (a Round, everyone in view): always off its left edge, by
 * `OFF_LEFT`, never popping up in plain sight.
 */
const START_BEHIND = 500
const OFF_LEFT = 20
/** How far a stride takes the sow, and a piglet, a frame of its run each. */
const SOW_STRIDE = 9
const PIGLET_STRIDE = 6
/** How far off the right of the screen they're gone, once they're out of sight. */
const OFF_SCREEN = 20

export function createBoars(world: World) {
	const boars = world.course.look?.boars
	if (!boars) return []
	// Taken out, for `step`, which is hoisted out of reach of the check.
	const { from } = boars
	const { groundY } = world.terrain
	/** When they came out, by the tick, once they have; and where the sow started. */
	let since: number | undefined
	let start = from - START_BEHIND
	/** The tick they were last moved on. */
	let moved: number | undefined
	const family = FAMILY.map((member) => {
		const [x, setX] = createSignal(0)
		const [y, setY] = createSignal(0)
		const [frame, setFrame] = createSignal(0)
		const [shown, setShown] = createSignal(false)
		return {
			...member,
			x,
			setX,
			y,
			setY,
			frame,
			setFrame,
			shown,
			setShown,
		}
	})

	/** Every one of them moved on a tick, once a tick, by whichever of them is first to it. */
	function step() {
		const now = world.ticks()
		if (now === moved) return
		moved = now
		if (since === undefined) {
			const ahead = world.racers.some((r) => !r.out && r.body.x >= from)
			if (now < 0 || !ahead) return
			since = now
			start = Math.min(start, world.camera() - OFF_LEFT)
		}
		const t = now - since
		for (const boar of family) {
			// Steady, from just off the left of the screen, in a line.
			const x = start - boar.behind - boar.width + t * SPEED
			boar.setX(x)
			const stride = boar.frames === SOW_FRAMES ? SOW_STRIDE : PIGLET_STRIDE
			boar.setFrame(Math.floor((t * SPEED) / stride) % boar.frames.length)
			boar.setY(
				Math.round(
					groundY(x + boar.width / 2) + PATH_FRONT + boar.down - boar.height,
				),
			)
			// Till they've run off the right of the screen, wherever that is:
			// past the finish, still running, not gone in plain sight.
			boar.setShown(x < world.camera() + world.viewWidth() + OFF_SCREEN)
		}
	}

	return family.map((boar, i) =>
		createController({
			frames: boar.frames,
			init: () => ({
				id: `boar-${i}`,
				// In front of everyone on the path.
				type: 'foreground',
				x: () => Math.round(boar.x()),
				y: boar.y,
				width: () => boar.width,
				height: () => boar.height,
				style: () => ({
					'image-rendering': 'pixelated',
					visibility: boar.shown() ? 'visible' : 'hidden',
				}),
			}),
			draw: ({ ctx, image }) => {
				const loaded = image(boar.frames[boar.frame()])
				if (loaded) ctx.drawImage(loaded.image, 0, 0, boar.width, boar.height)
			},
			onEnterFrame: step,
		}),
	)
}
