import { type Component, For, type JSX, Show } from 'solid-js'
import { TRIP_TICKS } from '../game/constants'
import { onSlide } from '../game/step'
import type { World } from '../game/world'

/**
 * Screen Filters: whole-screen effects over a race, each on as strongly as
 * its `strength` says, all of them together: a bad mushroom's trip; the
 * rush down a Slide. Each
 * can do either or both of:
 *
 * - `picture`: CSS on the race's picture, the canvas: a filter, and a
 *   transform (the trip's swaying);
 * - `wash`: something laid over the picture (the trip's swirl of colour).
 *
 * A new one goes in `SCREEN_FILTERS`.
 */
export interface ScreenFilter {
	/** How strongly it's on now, 0 to 1: off at 0. The tick's a signal: reading it keeps this up to date. */
	strength: (world: World) => number
	/** CSS on the race's picture. */
	picture?: (world: World, strength: number) => PictureStyle
	/** Laid over the race's picture. */
	wash?: Component<{ world: World; strength: number }>
}

interface PictureStyle {
	filter?: string
	transform?: string
	'transform-origin'?: string
}

// --- A bad mushroom's trip -------------------------------------------------

/**
 * How far into a trip off a bad mushroom the screen is (see `trippedAt`),
 * and how strongly, fading in and out: none, if it isn't.
 */
function tripAt(world: World) {
	const at = world.trippedAt
	// The tick's a signal: reading it first keeps this up to date.
	const t = world.ticks() - (at ?? Number.NEGATIVE_INFINITY)
	if (at === undefined || t < 0 || t >= TRIP_TICKS) return undefined
	return { t, strength: Math.min(1, t / 20, (TRIP_TICKS - t) / 50) }
}

/**
 * A bad mushroom eaten: the whole screen's colours cycling round the
 * rainbow, oversaturated, the picture swaying and wobbling, and a wash of
 * colour swirling round over it, for three seconds (`TRIP_TICKS`).
 */
const TRIP: ScreenFilter = {
	strength: (world) => tripAt(world)?.strength ?? 0,
	picture: (world, s) => {
		const t = tripAt(world)?.t ?? 0
		return {
			filter: `hue-rotate(${Math.round(t * 7 * s)}deg) saturate(${1 + 2 * s}) contrast(${1 + 0.25 * s})`,
			// Zoomed in a little as it sways, so its edges never show what's behind it.
			transform: `skewX(${(Math.sin(t / 10) * 7 * s).toFixed(2)}deg) scale(${(1 + (0.1 + Math.sin(t / 14) * 0.04) * s).toFixed(3)}, ${(1 + (0.1 + Math.cos(t / 12) * 0.05) * s).toFixed(3)})`,
			'transform-origin': '50% 70%',
		}
	},
	wash: (props) => (
		<div
			style={{
				...styles.wash,
				'mix-blend-mode': 'overlay',
				opacity: props.strength * 0.55,
				background: `conic-gradient(from ${(tripAt(props.world)?.t ?? 0) * 4.5}deg at 50% 50%, #ff3d7f, #ffd93d, #3dff8b, #3dc8ff, #b13dff, #ff3d7f)`,
			}}
		/>
	),
}

// --- Down a Slide ----------------------------------------------------------

/** From how fast, and up to how fast, sliding feels a rush. */
const RUSH_FROM = 6
const RUSH_FULL = 11

/** How fast the fastest is going down a Slide, if anyone is, 0 to 1. */
function rushOf(world: World) {
	if (!world.course.slides) return 0
	world.ticks()
	const fastest = Math.max(
		0,
		...world.racers
			.filter((r) => !r.out && onSlide(world, r.body.x))
			.map((r) => r.body.vx),
	)
	return Math.max(
		0,
		Math.min(1, (fastest - RUSH_FROM) / (RUSH_FULL - RUSH_FROM)),
	)
}

/**
 * Down a Slide, fast: the picture pushed in a little, harder, and streaks
 * of light rushing back past, more of them the faster it goes.
 */
const RUSH: ScreenFilter = {
	strength: rushOf,
	picture: (_, s) => ({
		filter: `contrast(${1 + 0.15 * s}) saturate(${1 + 0.3 * s})`,
		transform: `scale(${(1 + 0.05 * s).toFixed(3)})`,
		'transform-origin': '40% 60%',
	}),
	wash: (props) => (
		<div
			style={{
				...styles.wash,
				opacity: props.strength * 0.8,
				'background-image': STREAKS,
				'background-size': `${STREAK_TILE.width}px 100%`,
				'background-position': `${-((props.world.ticks() * 46) % STREAK_TILE.width)}px 0`,
				'mask-image':
					'radial-gradient(ellipse at 40% 55%, transparent 30%, black 75%)',
			}}
		/>
	),
}
/**
 * Streaks of light, rushing past: a tile of dashes, each its own length,
 * here and there up and down it, to repeat along and slide back.
 */
const STREAK_TILE = { width: 960, height: 540 }
const STREAKS = (() => {
	let seed = 7
	const random = () => {
		seed = (seed * 16807) % 2147483647
		return seed / 2147483647
	}
	const dashes = Array.from({ length: 22 }, () => {
		const y = Math.round(random() * STREAK_TILE.height)
		const x = Math.round(random() * STREAK_TILE.width)
		const length = 80 + Math.round(random() * 260)
		const alpha = (0.25 + random() * 0.45).toFixed(2)
		return `<rect x="${x}" y="${y}" width="${length}" height="2" fill="white" fill-opacity="${alpha}"/>`
	}).join('')
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${STREAK_TILE.width}" height="${STREAK_TILE.height}">${dashes}</svg>`
	return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
})()

/** Every Screen Filter, in the order they're put on. */
export const SCREEN_FILTERS: ScreenFilter[] = [TRIP, RUSH]

/** Those on now, and how strongly. */
const onNow = (world: World) =>
	SCREEN_FILTERS.map((filter) => ({
		filter,
		strength: filter.strength(world),
	})).filter(({ strength }) => strength > 0)

/**
 * Every filter on now's CSS for the race's picture, all together: their
 * filters one after another, their transforms too (unless `still`, as for
 * a Portal, whose own zoom it's showing).
 */
export function pictureStyle(world: World, still = false): JSX.CSSProperties {
	const styles = onNow(world).flatMap(({ filter, strength }) =>
		filter.picture ? [filter.picture(world, strength)] : [],
	)
	const filters = styles.flatMap((s) => (s.filter ? [s.filter] : []))
	const transforms = still
		? []
		: styles.flatMap((s) => (s.transform ? [s.transform] : []))
	return {
		...(filters.length && { filter: filters.join(' ') }),
		...(transforms.length && {
			transform: transforms.join(' '),
			'transform-origin': styles.find((s) => s['transform-origin'])?.[
				'transform-origin'
			],
		}),
	}
}

/** Every filter on now's wash, over the race's picture. */
export function ScreenWashes(props: { world: World }) {
	return (
		<For each={onNow(props.world)}>
			{({ filter, strength }) => (
				<Show when={filter.wash}>
					{(Wash) => {
						const Over = Wash()
						return <Over world={props.world} strength={strength} />
					}}
				</Show>
			)}
		</For>
	)
}

const styles = {
	wash: {
		position: 'absolute',
		inset: 0,
		'pointer-events': 'none',
	},
} satisfies Record<string, JSX.CSSProperties>
