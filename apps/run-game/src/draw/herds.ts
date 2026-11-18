import { createController } from 'scoopjs'
import { createSignal } from 'solid-js'
import type { Herd } from '../courses/types'
import { PATH_FRONT } from '../game/constants'
import { platformAt } from '../game/platforms'
import { sagOf } from '../game/ropeBridge'
import { inDeepWater } from '../game/swim'
import type { World } from '../game/world'

/**
 * Herds running alongside the path (see `CourseLook['herds']`), as
 * Huddinge's boars do (`boars.ts`): as whoever's racing in front gets to a
 * herd's `from`, it comes up from behind, off the left of the screen, at
 * its own steady pace, one after another in a line, and on past and away
 * ahead, or alongside a long while, whatever its pace is: over a bridge,
 * on it; out into Deep Water, swimming. Only to be seen:
 * nobody runs into them. Where they are goes by the tick from when they
 * came out, so it's the same on a Round's every screen.
 */

/** How far before a bridge they start up onto it, off the grass in front of the path. */
const ONTO_BRIDGE = 70
/** How far into the ridge they run, up on the skyline (see `Course['skyline']`). */
const SKYLINE_SINK = 2
/** How much of them is under the water, swimming. */
const SUNK = 0.45
/** How far back from `from` the first of them starts: off the left of the screen. */
const START_BEHIND = 560
/** How far off the right of the screen they're gone. */
const OFF_SCREEN = 20

export function createHerds(world: World) {
	return (world.course.look?.herds ?? []).flatMap((herd, h) =>
		createHerd(world, herd, h),
	)
}

function createHerd(world: World, herd: Herd, h: number) {
	const { groundY } = world.terrain
	let since: number | undefined
	let moved: number | undefined
	const state = herd.members.map(() => {
		const [x, setX] = createSignal(0)
		const [y, setY] = createSignal(0)
		return { x, setX, y, setY, frame: 0, shown: false }
	})

	/**
	 * Where one of them has its feet, its middle at `x`: on the path, or
	 * down the grass in front of it; by a diplodocus, on the ground beside
	 * it; coming onto a bridge over a Gap, up
	 * onto it, the only way across, and along it, as it sags; and in Deep
	 * Water, swimming along its surface, half under it, bobbing.
	 */
	function feetAt(x: number, member: Herd['members'][number], t: number) {
		const { deepWater } = world.course
		if (deepWater && inDeepWater(world, x))
			return (
				deepWater.surface +
				Math.round(member.height * SUNK) +
				Math.round(Math.sin(t / 9 + member.behind) * 2)
			)
		// Up on the skyline, running along it, against the sky with everyone.
		if (world.course.skyline?.some((s) => x >= s.from && x < s.to))
			return groundY(x) + SKYLINE_SINK
		const gap = world.terrain.gaps.find(
			(g) => x > g.from - ONTO_BRIDGE && x < g.to + ONTO_BRIDGE,
		)
		const bridge = gap && bridgeAt(x)
		const out = herd.over ? 0 : PATH_FRONT + member.down
		// Past a diplodocus, not up over it: along the forest floor beside
		// it, by its legs, level from where it's off the ground to where it's
		// back on.
		const diplodocus = world.course.look?.diplodocus?.floor
		if (diplodocus && x > diplodocus.from && x < diplodocus.to) {
			const along = (x - diplodocus.from) / (diplodocus.to - diplodocus.from)
			const from = groundY(diplodocus.from)
			return Math.round(from + (groundY(diplodocus.to) - from) * along) + out
		}
		if (!gap) return groundY(x) + out
		// Up onto the bridge, easing in from its end.
		const into = Math.min(
			x - (gap.from - ONTO_BRIDGE),
			gap.to + ONTO_BRIDGE - x,
		)
		const onto = Math.min(1, into / ONTO_BRIDGE)
		const deck = bridge ?? groundY(x)
		return Math.round(deck + out * (1 - onto))
	}

	/** The top of whatever bridge is over `x`, sagging, if there is one. */
	function bridgeAt(x: number) {
		const now = Math.max(0, world.ticks())
		for (const [index, platform] of world.platforms.entries()) {
			if (!platform.rope) continue
			const at = platformAt(world.terrain, platform, now)
			if (x >= at.left && x <= at.right)
				return at.top + sagOf(world.ropeBridges, index, x)
		}
		return undefined
	}

	/** Every one of them moved on a tick, once a tick, by whichever is first to it. */
	function step() {
		const now = world.ticks()
		if (now === moved) return
		moved = now
		if (since === undefined) {
			const ahead = world.racers.some((r) => !r.out && r.body.x >= herd.from)
			if (now < 0 || !ahead) return
			since = now
		}
		const t = now - since
		herd.members.forEach((member, i) => {
			const s = state[i]
			const x =
				herd.from - START_BEHIND - member.behind - member.width + t * herd.speed
			s.setX(x)
			s.frame =
				Math.floor((t * herd.speed) / member.stride) % member.frames.length
			const feet = feetAt(x + member.width / 2, member, t)
			s.setY(Math.round(feet - member.height))
			s.shown = x < world.camera() + world.viewWidth() + OFF_SCREEN
		})
	}

	return herd.members.map((member, i) =>
		createController({
			frames: member.frames,
			init: () => ({
				id: `herd-${h}-${i}`,
				// On the path, behind whoever's racing; or in front of everyone on it.
				type: herd.over ? 'pacer' : 'foreground',
				x: () => Math.round(state[i].x()),
				y: state[i].y,
				width: () => member.width,
				height: () => member.height,
			}),
			draw: ({ ctx, image }) => {
				const s = state[i]
				if (!s.shown) return
				const loaded = image(member.frames[s.frame])
				if (loaded)
					ctx.drawImage(loaded.image, 0, 0, member.width, member.height)
			},
			onEnterFrame: step,
		}),
	)
}
