import { COURSES } from '../courses'
import type { Course } from '../courses/types'
import { Backdrop, Ground, HorizonTrees, type View } from '../draw/Backdrop'
import { START_X } from '../game/constants'
import { withGaps } from '../game/terrain'

/**
 * Where the Podium stands: the line along the middle of Haga's path, down
 * the screen. High enough for what's under it, along the grass in front.
 */
export const PODIUM_GROUND = 432

/** Haga, dead flat where the Podium's put up, so it stands level. */
const terrain = withGaps({
	length: 2000,
	finishX: START_X + 2000,
	groundY: () => PODIUM_GROUND,
	slope: () => 0,
})
/** Where along it: past the start, among the trees. */
const CAMERA = START_X + 500

/**
 * Haga, the home course, as the Podium's put up on it: its sky and far
 * hills, the red houses and the trees, and its path, its grass in front.
 * Still: everyone running about on it is what moves.
 */
export function PodiumScene() {
	const haga = COURSES.find((c) => c.id === 'haga') as Course
	const view: View = {
		course: { ...haga, terrain },
		terrain,
		camera: () => CAMERA,
	}
	return (
		<div
			style={{
				position: 'absolute',
				inset: 0,
				overflow: 'hidden',
				...haga.look?.palette,
			}}
			aria-hidden="true"
		>
			<Backdrop world={view} />
			<HorizonTrees world={view} />
			<Ground world={view} />
		</div>
	)
}
