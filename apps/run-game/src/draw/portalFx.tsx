import { createController } from 'scoopjs'
import { For, type JSX, Show, createMemo } from 'solid-js'
import { portalTime } from '../game/portals'
import type { World } from '../game/world'

/**
 * What a Portal looks like going off (see `portals`): the shrink ray's beam,
 * down onto its plate, flickering brighter as it charges, sparks about
 * everyone in it; and the sneeze's spray, bursting out of the nose. Over
 * whoever's in it. The tick's a signal: reading it keeps it going.
 */

/** How wide the shrink ray's beam is, and how far up over the plate it comes from. */
const BEAM_WIDTH = 64
const BEAM_HEIGHT = 116
/** How long the sneeze's spray goes on for. */
const SPRAY_TICKS = 46

/** Sparks, about the plate: where, out of the beam's width and height, and when each twinkles. */
const SPARKS = Array.from({ length: 10 }, (_, i) => ({
	x: ((i * 37) % 100) / 100,
	y: ((i * 53) % 100) / 100,
	beat: (i * 7) % 12,
}))
/** The spray's droplets: which way each flies, and how fast. */
const DROPS = Array.from({ length: 14 }, (_, i) => ({
	angle: -0.7 + ((i * 41) % 100) / 70,
	speed: 2.2 + ((i * 29) % 10) / 4,
	size: 2 + (i % 3) * 2,
}))

export function createPortalFx(world: World) {
	const portals = world.course.portals ?? []
	if (!portals.length) return []
	const now = createMemo(() => portalTime(world))
	return [
		createController({
			init: () => ({
				id: 'portal-fx',
				type: 'flyer',
				x: () => {
					const t = now()
					return t ? t.portal.focus.x - BEAM_WIDTH / 2 : -10_000
				},
				y: () => {
					const t = now()
					return t ? t.portal.focus.y - BEAM_HEIGHT : 0
				},
				width: () => BEAM_WIDTH,
				height: () => BEAM_HEIGHT,
				children: () => (
					<Show when={now()}>
						{(t) => (
							<Show
								when={t().portal.kind === 'shrink'}
								fallback={<Spray since={t().since} />}
							>
								<Beam t={t().t} snap={t().snap} />
							</Show>
						)}
					</Show>
				),
			}),
			drawReach: SPRAY_REACH,
			// The same, on the canvas.
			draw({ ctx }) {
				const t = now()
				if (!t) return
				if (t.portal.kind === 'shrink') paintBeam(ctx, t.t, t.snap)
				else paintSpray(ctx, t.since)
			},
		}),
	]
}

/** How bright the beam is, `t` ticks after it went off: brighter as it charges, flickering. */
const beamStrength = (t: number) =>
	Math.min(1, t / 40) * (0.75 + 0.25 * Math.sin(t * 0.9))
/** Whether it's on, `t` ticks after it went off, till just after the flash at `snap`. */
const beamOn = (t: number, snap: number) => t >= 0 && t < snap + 4

/** A spark's opacity, twinkling on and off. */
const sparkOpacity = (t: number, beat: number) =>
	(t + beat) % 12 < 4 ? beamStrength(t) : 0

/** Where a drop of the spray is, `since` ticks after "CHOO!": out of the nose, and falling. */
const dropAt = (drop: (typeof DROPS)[number], since: number) => {
	const along = since * drop.speed
	return {
		x: Math.round(BEAM_WIDTH / 2 + Math.cos(drop.angle) * along),
		y: Math.round(
			BEAM_HEIGHT + Math.sin(drop.angle) * along + 0.04 * since ** 2,
		),
	}
}
const sprayOn = (since: number) => since >= 0 && since < SPRAY_TICKS

/**
 * How far the spray's drops fly out of the beam's box, all the while it
 * lasts: on out of the nose and down, worked out once, for `drawReach`.
 */
const SPRAY_REACH = (() => {
	const reach = { left: 0, top: 0, right: 0, bottom: 0 }
	for (let since = 0; since < SPRAY_TICKS; since++)
		for (const drop of DROPS) {
			const { x, y } = dropAt(drop, since)
			reach.left = Math.max(reach.left, -x)
			reach.top = Math.max(reach.top, -y)
			reach.right = Math.max(reach.right, x + drop.size - BEAM_WIDTH)
			reach.bottom = Math.max(reach.bottom, y + drop.size - BEAM_HEIGHT)
		}
	return reach
})()

/** The beam's colours, across it: clear at its edges, brightest down its middle. */
const BEAM_STOPS: [number, string][] = [
	// Clear in its own colour, not black, as CSS fades to `transparent`.
	[0, 'rgba(150, 255, 190, 0)'],
	[0.25, 'rgba(150, 255, 190, 0.35)'],
	[0.5, 'rgba(220, 255, 230, 0.75)'],
	[0.75, 'rgba(150, 255, 190, 0.35)'],
	[1, 'rgba(150, 255, 190, 0)'],
]

function paintBeam(ctx: CanvasRenderingContext2D, t: number, snap: number) {
	if (!beamOn(t, snap)) return
	const alpha = ctx.globalAlpha
	const strength = Math.max(0, Math.min(1, beamStrength(t)))
	const gradient = ctx.createLinearGradient(0, 0, BEAM_WIDTH, 0)
	for (const [at, colour] of BEAM_STOPS) gradient.addColorStop(at, colour)
	ctx.globalAlpha = alpha * strength
	ctx.fillStyle = gradient
	ctx.fillRect(0, 0, BEAM_WIDTH, BEAM_HEIGHT)
	ctx.fillStyle = '#f4fff6'
	for (const spark of SPARKS) {
		const opacity = sparkOpacity(t, spark.beat)
		if (opacity <= 0) continue
		ctx.globalAlpha = alpha * Math.min(1, opacity)
		ctx.fillRect(
			Math.round(spark.x * (BEAM_WIDTH - 4)),
			Math.round(spark.y * (BEAM_HEIGHT - 4)),
			4,
			4,
		)
	}
}

function paintSpray(ctx: CanvasRenderingContext2D, since: number) {
	if (!sprayOn(since)) return
	ctx.globalAlpha *= 1 - since / SPRAY_TICKS
	ctx.fillStyle = 'rgba(214, 240, 255, 0.85)'
	for (const drop of DROPS) {
		const { x, y } = dropAt(drop, since)
		ctx.fillRect(x, y, drop.size, drop.size)
	}
}

/** The shrink ray's beam, `t` ticks after it went off, till the flash at `snap`. */
function Beam(props: { t: number; snap: number }) {
	const on = () => beamOn(props.t, props.snap)
	const strength = () => beamStrength(props.t)
	const style = (): JSX.CSSProperties => ({
		position: 'absolute',
		inset: 0,
		opacity: strength(),
		background:
			'linear-gradient(to right, transparent, rgba(150, 255, 190, 0.35) 25%, rgba(220, 255, 230, 0.75) 50%, rgba(150, 255, 190, 0.35) 75%, transparent)',
		'pointer-events': 'none',
	})
	return (
		<Show when={on()}>
			<div style={style()} />
			<For each={SPARKS}>
				{(spark) => (
					<div
						style={{
							position: 'absolute',
							left: `${Math.round(spark.x * (BEAM_WIDTH - 4))}px`,
							top: `${Math.round(spark.y * (BEAM_HEIGHT - 4))}px`,
							width: '4px',
							height: '4px',
							background: '#f4fff6',
							opacity: sparkOpacity(props.t, spark.beat),
						}}
					/>
				)}
			</For>
		</Show>
	)
}

/** The sneeze's spray, `since` ticks after "CHOO!", out of the nose at the beam's bottom middle. */
function Spray(props: { since: number }) {
	return (
		<Show when={sprayOn(props.since)}>
			<For each={DROPS}>
				{(drop) => {
					const at = () => dropAt(drop, props.since)
					return (
						<div
							style={{
								position: 'absolute',
								left: `${at().x}px`,
								top: `${at().y}px`,
								width: `${drop.size}px`,
								height: `${drop.size}px`,
								background: 'rgba(214, 240, 255, 0.85)',
								opacity: 1 - props.since / SPRAY_TICKS,
							}}
						/>
					)
				}}
			</For>
		</Show>
	)
}
