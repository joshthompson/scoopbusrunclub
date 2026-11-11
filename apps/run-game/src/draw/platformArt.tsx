import { For } from 'solid-js'
import type { Course, PlatformLook } from '../courses/types'

/** A Platform's colours, if its course doesn't say: a grassy ledge, in the course's own. */
const PLATFORM_LOOK: Required<PlatformLook> = {
	top: 'var(--grass-green)',
	face: 'var(--dirt-brown)',
	edge: 'var(--dirt-darker-brown)',
	depth: 18,
	cable: '',
	cloud: false,
}

/** How `course`'s Platforms look. */
export const platformLook = (course: Course): Required<PlatformLook> => ({
	...PLATFORM_LOOK,
	...course.look?.platform,
})

/** Puffs along a cloud's top, each its left and size, as shares of its width and px. */
const PUFFS: [number, number][] = [
	[0.04, 18],
	[0.22, 26],
	[0.46, 22],
	[0.66, 28],
	[0.86, 18],
]

/**
 * A Platform, filling whatever it's in: its top, its face, and the darker
 * edge under it; or a candyfloss cloud, puffs along its top, its ends
 * rounded.
 */
export function PlatformArt(props: { look: Required<PlatformLook> }) {
	if (props.look.cloud)
		return (
			<div style={{ position: 'absolute', inset: 0 }}>
				<For each={PUFFS}>
					{([left, size]) => (
						<div
							style={{
								position: 'absolute',
								left: `calc(${left * 100}% - ${size / 2}px)`,
								top: `${-size / 2 + 4}px`,
								width: `${size}px`,
								height: `${size}px`,
								background: props.look.top,
								'border-radius': '50%',
							}}
						/>
					)}
				</For>
				<div
					style={{
						position: 'absolute',
						inset: 0,
						background: props.look.face,
						'border-top': `6px solid ${props.look.top}`,
						'border-bottom': `4px solid ${props.look.edge}`,
						'border-radius': '10px',
						'box-sizing': 'border-box',
					}}
				/>
			</div>
		)
	return (
		<div
			style={{
				position: 'absolute',
				inset: 0,
				background: props.look.face,
				'border-top': `6px solid ${props.look.top}`,
				'border-bottom': `4px solid ${props.look.edge}`,
				'box-sizing': 'border-box',
			}}
		/>
	)
}
