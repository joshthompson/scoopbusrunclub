import type { JSX } from 'solid-js'
import { svgUrl } from '../courses/kit/pixelArt'
import { seeded } from '../courses/kit/seeded'
import type { World } from '../game/world'

/**
 * Snow falling, over the whole screen, up a mountain: two layers of flakes,
 * the near one bigger and quicker, blown along by the wind, going by as the
 * course does. Fading in along the course, from where it starts to snow.
 * Moved on by the game's ticks, so it stops when the game does.
 */

/** A tile of flakes, `size` square, `count` of them, each `flake` px. */
function flakes(size: number, count: number, flake: number, seed: number) {
	const random = seeded(seed)
	let body = ''
	for (let i = 0; i < count; i++) {
		const x = Math.round((random() * (size - flake)) / 2) * 2
		const y = Math.round((random() * (size - flake)) / 2) * 2
		const alpha = (0.55 + random() * 0.45).toFixed(2)
		body += `<rect x="${x}" y="${y}" width="${flake}" height="${flake}" fill="rgba(255,255,255,${alpha})"/>`
	}
	return svgUrl(size, size, body)
}

/** Far to near: their tile, its size, how fast they fall and blow, a tick, and how much they go by with the course. */
const LAYERS = [
	{ tile: flakes(240, 22, 2, 5), size: 240, fall: 1.1, blow: -0.7, along: 0.5 },
	{ tile: flakes(320, 12, 4, 9), size: 320, fall: 2.2, blow: -1.6, along: 0.9 },
]

export function Snow(props: { world: World }) {
	const snow = props.world.course.look?.snow
	if (!snow) return null
	/** How thick it is, where the camera is: none till `from`, all of it by `full`. */
	const thickness = () =>
		Math.max(
			0,
			Math.min(1, (props.world.camera() - snow.from) / (snow.full - snow.from)),
		)
	const layer = (i: number): JSX.CSSProperties => {
		const { tile, size, fall, blow, along } = LAYERS[i]
		const t = Math.max(0, props.world.ticks())
		const x = Math.round(t * blow - props.world.camera() * along) % size
		const y = Math.round(t * fall + props.world.cameraY() * along) % size
		return {
			position: 'absolute',
			inset: 0,
			'pointer-events': 'none',
			'background-image': `url("${tile}")`,
			'background-position': `${x}px ${y}px`,
			opacity: thickness(),
			visibility: thickness() > 0 ? 'visible' : 'hidden',
		}
	}
	return (
		<>
			<div style={layer(0)} />
			<div style={layer(1)} />
		</>
	)
}
