import { Scene } from '@/engine'
import { Canvas } from '@/engine/components'
import type { JSX } from 'solid-js'
import { Backdrop, Ground, HorizonTrees } from './Backdrop'
import {
	HITBOX_HALF_WIDTH,
	START_X,
	TICK_MS,
	VIEW_HEIGHT,
	VIEW_WIDTH,
} from './constants'
import {
	createBanner,
	createBus,
	createCorgis,
	createFlyers,
	createFurbies,
	createGameController,
	createObstacle,
	createPack,
	createParkrunSign,
	createPlayer,
	createRunDirector,
	createScenery,
} from './sprites'
import type { World } from './world'

/**
 * The scene a race is drawn on, with everything on the course in it: the
 * same for single player and a Round, which only has more runners. `step`
 * moves it on a tick: the physics, or a Remote Player's frames from the Host.
 */
export function createRaceScene(world: World, step?: (world: World) => void) {
	const scene = new Scene('run-game', {
		width: VIEW_WIDTH,
		height: VIEW_HEIGHT,
		frameRate: TICK_MS,
		// Front to back.
		assetOrder: [
			// The near poles of the start and finish banners, which you run past.
			'banner-front',
			// Hurdles in the lanes nearer than the runner's.
			'hazard-front',
			// Over whoever they're carrying.
			'flyer',
			// In front of the runner: one sits on their head.
			'furby',
			'player',
			// Behind them: they sit on its back.
			'corgi',
			'pacer',
			'bus',
			'boost',
			'hazard',
			'cheerer',
			'banner',
			'sign',
			'mud',
			'scenery',
		],
		setup(scene) {
			scene.addController(
				createGameController(world, step),
				...createScenery(world),
				// Just ahead of the runner, so they toe the line rather than stand on it.
				...createBanner(world, START_X + HITBOX_HALF_WIDTH + 4, 'START'),
				createParkrunSign(world, START_X - 190),
				...createBanner(world, world.terrain.finishX, 'FINISH'),
				createRunDirector(world),
				...world.obstacles.flatMap((state, i) =>
					createObstacle(world, state, i),
				),
				...createCorgis(world),
				...createFurbies(world),
				createBus(world),
				...createPack(world),
				createFlyers(world),
				// The first racer last, so they're drawn over everyone else racing.
				...[...world.racers]
					.reverse()
					.map((racer) => createPlayer(world, racer)),
			)
		},
	})
	// The engine scrolls every sprite by the canvas's x.
	scene.canvas.get().setX(world.camera())
	scene.tickers.add(() => scene.canvas.get().setX(world.camera()))
	return scene
}

/**
 * The race on the screen, and `overlay` over it. Zoomed out (see the world's
 * `zoom`), the whole course shrinks towards the bottom left of the screen,
 * leaving more sky over it; the overlay stays the size it is.
 */
export function RaceCanvas(props: {
	world: World
	scene: Scene
	overlay?: JSX.Element
}) {
	const zoom = () => props.world.zoom()
	return (
		// The level's own colours, for the sky, the grass and the path.
		<div style={{ ...props.world.level.look?.palette, display: 'contents' }}>
			{/* Over the top of the course's own sky, once zoomed out. The top
			    of its gradient, so the join doesn't show. */}
			<div style={styles.sky} />
			<Canvas
				scene={props.scene}
				style={
					props.world.round
						? {
								width: `${VIEW_WIDTH * zoom()}px`,
								height: `${VIEW_HEIGHT}px`,
								transform: `scale(${1 / zoom()})`,
								'transform-origin': '0 100%',
								overflow: 'visible',
								background: 'transparent',
							}
						: undefined
				}
				underlay={
					<>
						<Backdrop world={props.world} />
						<HorizonTrees world={props.world} />
						<Ground world={props.world} />
					</>
				}
				overlay={props.world.round ? undefined : props.overlay}
				loading={() => (
					<div style={styles.loading}>Loading {props.world.level.name}…</div>
				)}
			/>
			{props.world.round ? props.overlay : undefined}
		</div>
	)
}

const styles = {
	sky: {
		position: 'absolute',
		inset: 0,
		background: 'var(--sky-blue-top)',
	},
	loading: {
		position: 'absolute',
		inset: 0,
		display: 'grid',
		'place-items': 'center',
		background: 'var(--ink)',
		color: 'white',
		'font-size': '32px',
	},
} satisfies Record<string, JSX.CSSProperties>
