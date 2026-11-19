import {
	type DrawPainting,
	createController,
	createObjectSignal,
} from 'scoopjs'
import {
	ROCKET,
	rocketFin,
	rocketNozzle,
	rocketPanel,
} from '../courses/kit/rocketLaunchScenery'
import type { Portal } from '../courses/types'
import { LAUNCH, launchEnd, rocketFlight } from '../game/portals'
import type { World } from '../game/world'
import { headTop } from './heads'
import { paintPicture } from './paint/picture'

/**
 * Rocket Launch's rocket (see `LAUNCH` in `portals.ts`), on the course
 * itself, not cut away to: stood on its pad till everyone's aboard; then
 * the countdown, its engines lighting, smoke billowing off the pad, and up
 * it goes, the camera after it, turning over and heading on along the
 * course, out over space, everyone aboard at its windows looking out. Till
 * it shudders, smoking, and blows up, everyone thrown out into space, and
 * bits of it flying off every way.
 *
 * All from the tick since it went off, and when it blew up (`boomAt`), so
 * a frozen moment draws as it was, and every screen the same.
 */

/**
 * The rocket's windows, square, one in its capsule over its porthole and
 * one down its body, clear of its door: their middles, by its picture's
 * cells, and how big, across and down.
 */
const WINDOWS = [
	{ x: 32, y: 64, size: 22 },
	{ x: 40, y: 134, size: 22 },
]
/** A window's frame, how thick, in px, and how far below its top whoever's in it has the top of their head. */
const WINDOW_FRAME = 4
const HEAD_ROOM = 4
/**
 * How tall anyone is in it, head to toe, in px, if they were seen whole:
 * close to the glass, a grown-up's head and shoulders. Everyone's drawn to
 * it, so a little one (Lyra) fills it as much as anyone.
 */
const IN_WINDOW_TALL = 84
const FRAME = '#8a94a0'
const FRAME_LIT = '#c4ccd6'
const CABIN = '#f2c978'
const CABIN_DARK = '#d9a95a'
/** How long the bang lasts, and the bits of it fly on for. */
const BOOM_TICKS = 34
const DEBRIS_TICKS = 220

/** The bits of it, blown off: which, which way, how fast, and how fast they spin. */
const DEBRIS = [
	{ art: rocketFin, angle: -2.4, speed: 3.2, spin: 7 },
	{ art: rocketPanel, angle: -0.9, speed: 2.6, spin: -5 },
	{ art: rocketNozzle, angle: 0.4, speed: 3.6, spin: 9 },
	{ art: rocketFin, angle: 1.7, speed: 2.4, spin: -8 },
	{ art: rocketPanel, angle: 2.8, speed: 3, spin: 4 },
	{ art: rocketPanel, angle: -1.6, speed: 4.2, spin: -11 },
]

const ease = (t: number) => {
	const c = Math.max(0, Math.min(1, t))
	return c * c * (3 - 2 * c)
}
/** A fraction, the same every time, for `i` and `salt`. */
const hash = (i: number, salt: number) => {
	const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453
	return x - Math.floor(x)
}

export function createRocket(world: World) {
	const portals = world.course.portals ?? []
	const index = portals.findIndex((p) => p.kind === 'launch')
	const portal = portals[index]
	if (!portal) return []
	/** Ticks since everyone got aboard and it went off: undefined, not yet. */
	const since = () => {
		const run = world.portal
		if (run?.index !== index || run.zappedAt === undefined) return undefined
		return world.ticks() - run.zappedAt
	}
	/** Gone: blown up. */
	const gone = () => {
		const t = since()
		return (
			world.space.boomAt !== undefined || (t !== undefined && t >= LAUNCH.snap)
		)
	}
	return [
		createRocketSprite(world, portal, since, gone),
		createPadSmoke(world, portal, since),
		createBoom(world, portal),
	]
}

function createRocketSprite(
	world: World,
	portal: Portal,
	since: () => number | undefined,
	gone: () => boolean,
) {
	const { width, height } = ROCKET
	return createController({
		frames: [ROCKET.asset],
		init: () => ({
			id: 'rocket',
			type: 'scenery',
			...createObjectSignal(portal.focus.x - width / 2, 'x'),
			...createObjectSignal(portal.focus.y - height / 2, 'y'),
			width: () => width,
			height: () => height,
			...createObjectSignal(0, 'rotation'),
		}),
		// Its flame, out of its foot, and smoke and sparks, going wrong.
		drawReach: { left: 120, top: 40, right: 160, bottom: 260 },
		onEnterFrame({ $ }) {
			const at = rocketFlight(world, portal, since() ?? 0)
			$.setX(Math.round(at.x - width / 2))
			$.setY(Math.round(at.y - height / 2))
			$.setRotation(Math.round(at.angle))
		},
		draw(painting) {
			if (gone()) return
			const { ctx, image } = painting
			const t = since() ?? -1
			const now = Math.max(0, world.ticks())
			if (t >= LAUNCH.lift - 24) paintFlame(ctx, t, now, width, height)
			paintPicture(ctx, image, ROCKET.asset, 0, 0, width, height)
			// Everyone aboard, at its windows, once it's on its way.
			if (t >= LAUNCH.lift) paintFaces(painting, world)
			if (t >= LAUNCH.wobble) paintTrouble(ctx, t, width, height)
		},
	})
}

/** Its engines' flame, out of its foot, flickering, longer as it gets going. */
function paintFlame(
	ctx: CanvasRenderingContext2D,
	t: number,
	now: number,
	width: number,
	height: number,
) {
	const burn = ease((t - LAUNCH.lift + 24) / 24)
	const long = Math.round((70 + (now % 6) * 8) * burn)
	const mid = width / 2
	for (const [w, extra, colour] of [
		[44, 30, '#ff7a1a'],
		[30, 10, '#ffd23f'],
		[14, -long / 2, '#ffffff'],
	] as const) {
		ctx.fillStyle = colour
		ctx.fillRect(mid - w / 2, height - 4, w, Math.max(4, long + extra))
	}
	// Licks off its edges, flickering.
	ctx.fillStyle = '#ffb02e'
	for (let i = 0; i < 4; i++) {
		const side = i % 2 ? 1 : -1
		const out = 18 + ((now + i * 3) % 4) * 4
		ctx.fillRect(mid + side * out - 2, height + 10 + i * 10, 4, 8 * burn)
	}
}

/**
 * Everyone aboard, at its windows, a few of them if there are lots: stood
 * behind them, in the lit cabin, seen from the shoulders up, leaning as it
 * does. Each lined up by the top of their own head, so the short are as
 * much in view as the tall.
 */
function paintFaces({ ctx, image }: DrawPainting, world: World) {
	const aboard = world.racers.filter((r) => r.out !== 'scooped')
	WINDOWS.forEach((w, i) => {
		const runner = aboard[i]?.runner
		if (!runner) return
		const size = w.size * ROCKET.scale
		const left = w.x * ROCKET.scale - size / 2
		const top = w.y * ROCKET.scale - size / 2
		// Its frame, lit along its top.
		ctx.fillStyle = FRAME
		ctx.fillRect(
			left - WINDOW_FRAME,
			top - WINDOW_FRAME,
			size + WINDOW_FRAME * 2,
			size + WINDOW_FRAME * 2,
		)
		ctx.fillStyle = FRAME_LIT
		ctx.fillRect(
			left - WINDOW_FRAME,
			top - WINDOW_FRAME,
			size + WINDOW_FRAME * 2,
			2,
		)
		// The cabin behind, lit.
		ctx.fillStyle = CABIN
		ctx.fillRect(left, top, size, size)
		ctx.fillStyle = CABIN_DARK
		ctx.fillRect(left, top + size - 8, size, 8)
		// Them, stood behind it, at their own size.
		const src = runner.sprite.stand ?? runner.sprite.run[0]
		const picture = src ? image(src) : undefined
		if (src && picture) {
			// How tall they are, from the top of their head to their feet.
			const own = headTop(src, runner.sprite.width, runner.sprite.height)
			const tall = runner.sprite.height - (own?.y ?? 0)
			const zoom = IN_WINDOW_TALL / tall
			const width = runner.sprite.width * zoom
			const height = runner.sprite.height * zoom
			const head = own && {
				x: own.x * zoom,
				y: own.y * zoom,
			}
			ctx.save()
			ctx.beginPath()
			ctx.rect(left, top, size, size)
			ctx.clip()
			ctx.imageSmoothingEnabled = false
			ctx.drawImage(
				picture.image,
				Math.round(left + size / 2 - (head?.x ?? width / 2)),
				Math.round(top + HEAD_ROOM - (head?.y ?? 2)),
				width,
				height,
			)
			ctx.restore()
		}
		// Light off its glass.
		ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'
		ctx.fillRect(left + 2, top + 2, 6, 2)
		ctx.fillRect(left + 2, top + 4, 2, 4)
		ctx.fillStyle = 'rgba(190, 225, 255, 0.18)'
		ctx.fillRect(left, top, size, size)
	})
}

/** Going wrong: smoke pouring off its side, and sparks. */
function paintTrouble(
	ctx: CanvasRenderingContext2D,
	t: number,
	width: number,
	height: number,
) {
	const wrong = ease((t - LAUNCH.wobble) / 40)
	for (let i = 0; i < 9; i++) {
		const age = (t * 2 + i * 13) % 50
		const size = 10 + Math.round(age / 5) * 2
		ctx.fillStyle = `rgba(70, 70, 76, ${0.75 * (1 - age / 50) * wrong})`
		ctx.fillRect(
			width - 20 + Math.round(age * 1.2),
			height * 0.45 + age * 1.5,
			size,
			size,
		)
	}
	if (t % 6 < 3) {
		ctx.fillStyle = '#ffd23f'
		ctx.fillRect(
			width - 22 + hash(t, 1) * 12,
			height * 0.42 + hash(t, 2) * 20,
			4,
			4,
		)
		ctx.fillStyle = '#ffffff'
		ctx.fillRect(width - 16 + hash(t, 3) * 10, height * 0.48, 2, 2)
	}
}

/** The pad's smoke: billowing out across it as the engines light, then drifting off. */
function createPadSmoke(
	world: World,
	portal: Portal,
	since: () => number | undefined,
) {
	const ground = world.terrain.groundY(portal.focus.x)
	const width = 900
	const height = 260
	return createController({
		init: () => ({
			id: 'pad-smoke',
			type: 'flyer',
			x: () => portal.focus.x - width / 2,
			y: () => ground - height + 30,
			width: () => width,
			height: () => height,
		}),
		draw({ ctx }) {
			const t = since()
			if (t === undefined) return
			const age = t - (LAUNCH.lift - 24)
			if (age < 0) return
			const fade = age > 200 ? Math.max(0, 1 - (age - 200) / 120) : 1
			if (fade <= 0) return
			for (let i = 0; i < 26; i++) {
				const side = i % 2 ? 1 : -1
				// Out across the pad either way, and up, slowing.
				const out = Math.min(1, age / 90) * (60 + hash(i, 1) * 360)
				const up = Math.min(age, 160) * 0.25 * hash(i, 2)
				const size =
					Math.round((20 + hash(i, 3) * 46 + Math.min(age, 120) * 0.25) / 4) * 4
				const x = Math.round((width / 2 + side * out - size / 2) / 2) * 2
				const y = Math.round((height - 34 - up - size * 0.6) / 2) * 2
				ctx.fillStyle = `rgba(240, 238, 232, ${0.9 * fade})`
				ctx.fillRect(x, y, size, Math.round(size * 0.7))
				ctx.fillStyle = `rgba(200, 198, 194, ${0.7 * fade})`
				ctx.fillRect(
					x,
					y + Math.round(size * 0.5),
					size,
					Math.round(size * 0.2),
				)
			}
		},
	})
}

/** The bang: a fireball, and bits of the rocket flying off every way, drifting on through space. */
function createBoom(world: World, portal: Portal) {
	const end = launchEnd(world, portal)
	const reach = 700
	return createController({
		frames: [rocketFin, rocketPanel, rocketNozzle],
		init: () => ({
			id: 'rocket-boom',
			type: 'flyer',
			x: () => end.x - reach,
			y: () => end.y - reach,
			width: () => reach * 2,
			height: () => reach * 2,
		}),
		draw({ ctx, image }) {
			const at = world.space.boomAt
			if (at === undefined) return
			const t = world.ticks() - at
			if (t < 0 || t > DEBRIS_TICKS) return
			const cx = reach
			const cy = reach
			// The fireball: rings of it, white to yellow to orange to smoke.
			if (t < BOOM_TICKS) {
				const u = t / BOOM_TICKS
				for (const [grow, colour] of [
					[1, `rgba(90, 80, 80, ${0.6 * (1 - u)})`],
					[0.8, `rgba(255, 122, 26, ${1 - u})`],
					[0.55, `rgba(255, 210, 63, ${1 - u})`],
					[0.3, `rgba(255, 255, 255, ${Math.max(0, 1 - u * 1.4)})`],
				] as const) {
					const r = Math.round(((40 + 170 * ease(u * 1.6)) * grow) / 4) * 4
					for (let y = -r; y < r; y += 4) {
						const half = Math.round(Math.sqrt(r * r - (y + 2) ** 2) / 4) * 4
						ctx.fillStyle = colour
						ctx.fillRect(cx - half, cy + y, half * 2, 4)
					}
				}
			}
			// The bits, tumbling away.
			const fade = t > DEBRIS_TICKS - 40 ? (DEBRIS_TICKS - t) / 40 : 1
			for (const bit of DEBRIS) {
				const loaded = image(bit.art)
				if (!loaded) continue
				const w = loaded.width * 2
				const h = loaded.height * 2
				const d = bit.speed * t
				ctx.save()
				ctx.globalAlpha *= fade
				ctx.translate(
					Math.round(cx + Math.cos(bit.angle) * d),
					Math.round(cy + Math.sin(bit.angle) * d),
				)
				ctx.rotate((Math.round((bit.spin * t) / 15) * 15 * Math.PI) / 180)
				ctx.imageSmoothingEnabled = false
				ctx.drawImage(loaded.image, -w / 2, -h / 2, w, h)
				ctx.restore()
			}
		},
	})
}
