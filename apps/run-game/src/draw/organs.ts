import { createController } from 'scoopjs'
import { HEARTBEAT_DUB, beatAt } from '../game/body'
import type { World } from '../game/world'

/**
 * Organs, huge, hung behind everything in their chambers, inside someone:
 * the heart (see `CourseLook['heartbeat']`), swelling out, "lub", and a
 * little less, "dub", in time with its sound and its valves, and easing
 * back between; and the lungs (see `CourseLook['breathing']`), filling and
 * emptying, in time with the airways rising and sinking in front of them.
 */

/** How much bigger it swells on the "lub", and on the "dub". */
const LUB = 0.09
const DUB = 0.05
/** How long each swell takes, out and back. */
const SWELL = 18

/** How far out of its size it is, `beat` ticks into its beat: 0, resting. */
export function heartSwell(beat: number) {
	const out = (since: number) =>
		since >= 0 && since < SWELL ? Math.sin((since / SWELL) * Math.PI) : 0
	return out(beat) * LUB + out(beat - HEARTBEAT_DUB) * DUB
}

/** Every organ the course has hung up. */
export function createOrgans(world: World) {
	return [...createBeatingHeart(world), ...createBreathingLungs(world)]
}

function createBeatingHeart(world: World) {
	const heart = world.course.look?.heartbeat?.heart
	if (!heart) return []
	const { asset, width, height, x, y } = heart
	const reach = Math.ceil((Math.max(width, height) * LUB) / 2) + 2
	return [
		createController({
			frames: [asset],
			init: () => ({
				id: 'beating-heart',
				type: 'scenery',
				x: () => x - width / 2,
				y: () => y,
				width: () => width,
				height: () => height,
			}),
			// Swelling about its middle, wider a touch more than it's taller:
			// a squeeze. The tick's a signal: reading it keeps it beating.
			draw: ({ ctx, image }) => {
				const picture = image(asset)
				if (!picture) return
				const swell = heartSwell(beatAt(Math.max(0, world.ticks())))
				ctx.translate(width / 2, height * 0.55)
				ctx.scale(1 + swell * 1.1, 1 + swell * 0.9)
				ctx.translate(-width / 2, -height * 0.55)
				ctx.drawImage(picture.image, 0, 0, width, height)
			},
			drawReach: { left: reach, right: reach, top: reach, bottom: reach },
		}),
	]
}

/** How much bigger the lungs are, full, than empty. */
const BREATH_IN = 0.07

/**
 * How full the lungs are, `ticks` in, 0 to 1: full when what breathes with
 * them is at its highest, as a Moving Platform `ticks` long swings, from
 * the top of its swing, down, and back up (see `swingOut`).
 */
export const lungsFull = (ticks: number, every: number, phase = 0) =>
	(1 + Math.cos(2 * Math.PI * (ticks / every + phase))) / 2

function createBreathingLungs(world: World) {
	const lungs = world.course.look?.breathing
	if (!lungs) return []
	const { asset, width, height, x, y, ticks, phase } = lungs
	const reach = Math.ceil((width * BREATH_IN) / 2) + 2
	return [
		createController({
			frames: [asset],
			init: () => ({
				id: 'breathing-lungs',
				type: 'scenery',
				x: () => x - width / 2,
				y: () => y,
				width: () => width,
				height: () => height,
			}),
			// Filling out from where they hang, at the top of the windpipe:
			// wider, and down. The tick's a signal: reading it keeps them
			// breathing.
			draw: ({ ctx, image }) => {
				const picture = image(asset)
				if (!picture) return
				const full = lungsFull(Math.max(0, world.ticks()), ticks, phase)
				ctx.translate(width / 2, 0)
				ctx.scale(1 + full * BREATH_IN, 1 + full * BREATH_IN * 0.8)
				ctx.translate(-width / 2, 0)
				ctx.drawImage(picture.image, 0, 0, width, height)
			},
			drawReach: { left: reach, right: reach, bottom: reach * 2 },
		}),
	]
}
