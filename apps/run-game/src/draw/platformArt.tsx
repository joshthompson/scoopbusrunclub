import type { Course, PlatformLook } from '../courses/types'

/** A Platform's colours, if its course doesn't say: a grassy ledge, in the course's own. */
const PLATFORM_LOOK: Required<PlatformLook> = {
	top: 'var(--grass-green)',
	face: 'var(--dirt-brown)',
	edge: 'var(--dirt-darker-brown)',
	depth: 18,
	cable: '',
}

/** How `course`'s Platforms look. */
export const platformLook = (course: Course): Required<PlatformLook> => ({
	...PLATFORM_LOOK,
	...course.look?.platform,
})

/** A Platform, filling whatever it's in: its top, its face, and the darker edge under it. */
export function PlatformArt(props: { look: Required<PlatformLook> }) {
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
