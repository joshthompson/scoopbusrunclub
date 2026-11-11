import { Scene } from '@/engine'
import { Canvas } from '@/engine/components'
import { type JSX, Show } from 'solid-js'
import {
	HITBOX_HALF_WIDTH,
	START_X,
	TICK_MS,
	VIEW_HEIGHT,
	VIEW_WIDTH,
} from '../game/constants'
import type { World } from '../game/world'
import {
	Backdrop,
	CaveCover,
	DRAWN_FROM,
	Ground,
	HorizonTrees,
} from './Backdrop'
import { SeaFront } from './Sea'
import {
	createBanner,
	createBoost,
	createBus,
	createBusBore,
	createBusDirt,
	createCorgis,
	createFlyers,
	createForeground,
	createFurbies,
	createGameController,
	createGiantFurby,
	createHats,
	createKmSigns,
	createObstacle,
	createPack,
	createParkrunSign,
	createPlatforms,
	createPlayer,
	createRunDirector,
	createScenery,
	createScoopArm,
	createSplashes,
	createTowers,
	createWarnings,
} from './sprites'

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
			// Counting everyone down, at the front, always in sight.
			'run-director',
			// Guard towers over a wall's walkway, and its parapet along the
			// near edge of the path.
			'tower',
			'foreground',
			// The near poles of the start and finish banners, which you run past.
			'banner-front',
			// Hurdles in the lanes nearer than the runner's.
			'hazard-front',
			// Over whoever they're carrying.
			'flyer',
			// In front of the runner: one sits on their head.
			'furby',
			// On their heads.
			'hat',
			'player',
			// Behind them: they sit on its back.
			'corgi',
			'pacer',
			'zombie',
			// Rock off the bus's drill, boring through a Cave, over it all.
			'bus-dirt',
			// Out of the front of the bus, over it.
			'bus-arm',
			// The bus's own parts, front to back, then the back of it: in
			// order, so a guard tower's front is drawn over the lot.
			'bus-scoop',
			'bus-body',
			'bus-window',
			'bus-wheel4',
			'bus-wheel3',
			'bus-wheel2',
			'bus-wheel1',
			// The bus's glider: its struts' feet behind its roof.
			'bus-glider',
			'bus',
			// The back of a guard tower: behind whoever's coming out of it.
			'tower-back',
			'boost',
			'hazard',
			'cheerer',
			'banner',
			'sign',
			'mud',
			// The hole the bus bores through a Cave's rock, its shelves too.
			'bus-bore',
			'platform',
			'scenery',
		],
		setup(scene) {
			scene.addController(
				createGameController(world, step),
				...createScenery(world),
				// Just ahead of the runner, so they toe the line rather than stand on it.
				...createBanner(world, START_X + HITBOX_HALF_WIDTH + 4, 'START'),
				createParkrunSign(world, START_X - 190),
				...createKmSigns(world),
				...createWarnings(world),
				...createBanner(world, world.terrain.finishX, 'FINISH'),
				createRunDirector(world),
				...createPlatforms(world),
				...createBusBore(world),
				...world.obstacles.flatMap((state, i) =>
					createObstacle(world, state, i),
				),
				...world.boosts.flatMap((state, i) => createBoost(world, state, i)),
				...createCorgis(world),
				...createFurbies(world),
				createBus(world),
				createScoopArm(world),
				...createBusDirt(world),
				...createPack(world),
				createFlyers(world),
				...createSplashes(world),
				...createGiantFurby(world),
				...createHats(world),
				...createForeground(world),
				...createTowers(world),
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
		// The course's own colours, for the sky, the grass and the path.
		<div style={{ ...props.world.course.look?.palette, display: 'contents' }}>
			{/* Over the top of the course's own sky, once zoomed out. The top
			    of its gradient, so the join doesn't show. */}
			<div style={styles.sky} />
			<Canvas
				scene={props.scene}
				// Zoomed out to fit a Round's Players in, and looking up (or down)
				// at them: everything on it goes, the backdrop putting itself back.
				style={{
					width: `${VIEW_WIDTH * zoom()}px`,
					height: `${VIEW_HEIGHT}px`,
					transform: `scale(${1 / zoom()}) translateY(${Math.round(-props.world.cameraY())}px)`,
					'transform-origin': '0 100%',
					overflow: 'visible',
					background: 'transparent',
				}}
				underlay={
					<>
						<Backdrop world={props.world} />
						<HorizonTrees world={props.world} />
						<Ground world={props.world} />
					</>
				}
				// A Cave's rock over everyone in it, till someone racing goes in;
				// the sea's waves over everyone in it.
				overlay={
					<>
						<CaveCover world={props.world} />
						<SeaFront
							world={props.world}
							from={DRAWN_FROM}
							to={props.world.terrain.finishX + 1600}
						/>
					</>
				}
				loading={() => (
					<div style={styles.loading}>Loading {props.world.course.name}…</div>
				)}
			/>
			{/* Paused, or between Rounds: the whole screen shaded, not just the
			    canvas, which goes with the camera (see `styles.css`). */}
			<Show when={props.scene.modal.get()}>
				<div style={styles.shade} />
			</Show>
			{props.overlay}
		</div>
	)
}

const styles = {
	sky: {
		position: 'absolute',
		inset: 0,
		background: 'var(--sky-blue-top)',
	},
	shade: {
		position: 'absolute',
		inset: 0,
		background: 'var(--overlay-black-50)',
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
