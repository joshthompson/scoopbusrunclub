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
		}),
	]
}

/** The shrink ray's beam, `t` ticks after it went off, till the flash at `snap`. */
function Beam(props: { t: number; snap: number }) {
	const on = () => props.t >= 0 && props.t < props.snap + 4
	const strength = () =>
		Math.min(1, props.t / 40) * (0.75 + 0.25 * Math.sin(props.t * 0.9))
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
							opacity: (props.t + spark.beat) % 12 < 4 ? strength() : 0,
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
		<Show when={props.since >= 0 && props.since < SPRAY_TICKS}>
			<For each={DROPS}>
				{(drop) => {
					const along = () => props.since * drop.speed
					return (
						<div
							style={{
								position: 'absolute',
								left: `${Math.round(BEAM_WIDTH / 2 + Math.cos(drop.angle) * along())}px`,
								top: `${Math.round(BEAM_HEIGHT + Math.sin(drop.angle) * along() + 0.04 * props.since ** 2)}px`,
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
