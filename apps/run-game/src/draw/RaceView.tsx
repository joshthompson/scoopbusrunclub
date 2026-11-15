import { CanvasRenderer, Scene } from 'scoopjs'
import { type JSX, Show, createMemo } from 'solid-js'
import { HEARTBEAT_DUB, beatAt } from '../game/body'
import {
	HITBOX_HALF_WIDTH,
	START_X,
	TICK_MS,
	VIEW_HEIGHT,
	VIEW_WIDTH,
} from '../game/constants'
import { portalView } from '../game/portals'
import { onScreen } from '../game/step'
import type { World } from '../game/world'
import { FrameMeter, showFrameMeter } from './FrameMeter'
import { createLongJump } from './LongJump'
import {
	BEHIND_TYPES,
	OVER_TYPES,
	createBackdrop,
	createWeather,
} from './backdropControllers'
import { createFootballSprite } from './football'
import { createCaveCover, createSeaFront } from './frontControllers'
import { createGiantMouth } from './giantMouth'
import { createMine, createMineCarts, createMoleTrails } from './mine'
import { createPortalFx } from './portalFx'
import { createSecret } from './secret'
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
	createHut,
	createKmSigns,
	createObstacle,
	createPack,
	createParkrunSign,
	createPlatforms,
	createPlayer,
	createRails,
	createRoadblock,
	createRunDirector,
	createScenery,
	createScoopArm,
	createSplashes,
	createTowers,
	createWarnings,
} from './sprites'

declare global {
	interface Window {
		/** The race on the screen, for `raceScene.canvasIssues()` in the console. */
		raceScene?: Scene
	}
}

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
			// Snow and fog over everything.
			...OVER_TYPES,
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
			// In front of whoever's in one: sat down inside it.
			'cart',
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
			// Snow sprayed off the back of its sleigh's runners.
			'bus-spray',
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
			// Behind whoever's kicking it, in front of the rocks it rolls past.
			'football',
			'boost',
			'hazard',
			'cheerer',
			'banner',
			'sign',
			'mud',
			// The Caves' mine: its rails, trestles and secret gallery.
			'mine',
			// A Secret's cavern under the course: what's in it, then its hollow.
			'secret-prop',
			'secret',
			// The ways moles have dug through the rock, its shelves too.
			'mole-trail',
			// The hole the bus bores through a Cave's rock, its shelves too.
			'bus-bore',
			'platform',
			'scenery',
			// The Ground and the Backdrop behind it all.
			...BEHIND_TYPES,
		],
		setup(scene) {
			scene.addController(
				createGameController(world, step),
				...createScenery(world),
				// A giant's mouth, opening, over its face: after the scenery, over it.
				...createGiantMouth(world),
				// Just ahead of the runner, so they toe the line rather than stand on it.
				...createBanner(world, START_X + HITBOX_HALF_WIDTH + 4, 'START'),
				createParkrunSign(world, START_X - 190),
				// Across the way back, at the far left, for anyone going the wrong way.
				createRoadblock(world),
				...createKmSigns(world),
				...createWarnings(world),
				// A running track's long jump pit, near the finish.
				...createLongJump(world),
				...createBanner(world, world.terrain.finishX, 'FINISH'),
				createRunDirector(world),
				...createPlatforms(world),
				...createRails(world),
				...createHut(world),
				...createBusBore(world),
				...createMine(world),
				...createSecret(world),
				...createMoleTrails(world),
				...createMineCarts(world),
				...createFootballSprite(world),
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
				// A Portal going off: the shrink ray's beam, the sneeze's spray.
				...createPortalFx(world),
				// The first racer last, so they're drawn over everyone else racing.
				...[...world.racers]
					.reverse()
					.map((racer) => createPlayer(world, racer)),
				// The backdrop and the Ground, behind it all; a Cave's rock and the
				// sea's waves, over everyone in them; and snow and fog, over it all.
				...createBackdrop(world, scene),
				...createCaveCover(world, scene),
				...createSeaFront(world, scene),
				...createWeather(world, scene),
			)
		},
	})
	// The camera follows the world's, to a whole pixel, as the ground and the
	// backdrop scroll: moved by a fraction of one, the sprites would be drawn
	// a pixel out from the ground under them. It goes up and down too, and
	// takes in more zoomed out: the canvas only paints what it sees.
	const scroll = () => {
		const camera = scene.canvas.get()
		camera.setX(Math.round(world.camera()))
		camera.setWidth(VIEW_WIDTH * world.zoom())
		camera.setHeight(VIEW_HEIGHT * world.zoom())
		camera.setY(cameraTop(world))
	}
	scroll()
	scene.tickers.add(scroll)
	window.raceScene = scene
	return scene
}

/**
 * The top of what the camera sees, in the scene: up and down with the
 * world's camera, and more above it zoomed out, the ground staying put at
 * the bottom of the screen.
 */
function cameraTop(world: World) {
	return Math.round(world.cameraY()) + VIEW_HEIGHT * (1 - world.zoom())
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
	/**
	 * A Portal going off (see `portals`): diving in after everyone as they
	 * shrink, or pulling back from the nose they're sneezed out of, zoomed
	 * in on that point; the screen shaking, "Ah... Ah..."; and a flash.
	 * The tick's a signal: reading it keeps this up to date.
	 */
	const portal = createMemo(() =>
		props.world.ticks() >= 0 ? portalView(props.world) : undefined,
	)
	const portalStyle = (): JSX.CSSProperties => {
		const view = portal()
		if (!view) return { position: 'relative' }
		const at = onScreen(props.world, view.focus.x, view.focus.y)
		return {
			position: 'relative',
			transform: `translateX(${view.shake}px) scale(${view.zoom})`,
			'transform-origin': `${at.x}px ${at.y}px`,
		}
	}
	return (
		// The course's own colours, for the sky, the grass and the path.
		<div style={{ ...props.world.course.look?.palette, display: 'contents' }}>
			{/* Over the top of the course's own sky, once zoomed out. The top
			    of its gradient, so the join doesn't show. */}
			<div style={styles.sky} />
			<div style={portalStyle()}>
				<CanvasRenderer
					scene={props.scene}
					// Every sprite's `image-rendering: pixelated`.
					pixelated
					// Looking up a mountain, the canvas goes right down off the
					// screen, its scene still showing over the top of it.
					runOffScreen
					style={{
						// Its size is the camera's, which takes in more zoomed out
						// (to fit a Round's Players in): shrunk back to fill the screen.
						transform: `scale(${1 / zoom()})`,
						'transform-origin': '0 0',
						background: 'transparent',
					}}
					loading={() => (
						<div style={styles.loading}>Loading {props.world.course.name}…</div>
					)}
				/>
			</div>
			{/* A heart beating: the screen thumping red with it. */}
			<Heartbeat world={props.world} />
			<Show when={(portal()?.flash ?? 0) > 0}>
				<div style={{ ...styles.flash, opacity: portal()?.flash }} />
			</Show>
			{/* Paused, or between Rounds: the whole screen shaded, not just the
			    canvas, which goes with the camera (see `styles.css`). */}
			<Show when={props.scene.modal.get()}>
				<div style={styles.shade} />
			</Show>
			{props.overlay}
			<Show when={showFrameMeter}>
				<FrameMeter />
			</Show>
		</div>
	)
}

/**
 * A heart beating, in view: the screen's edges thumping red, "lub", and a
 * little less, "dub", in time with its valves (see `HEARTBEAT`).
 */
function Heartbeat(props: { world: World }) {
	const heart = props.world.course.look?.heartbeat
	if (!heart) return null
	const strength = () => {
		const middle = props.world.camera() + props.world.viewWidth() / 2
		if (middle < heart.from || middle > heart.to) return 0
		const beat = beatAt(Math.max(0, props.world.ticks()))
		const lub = Math.max(0, 1 - beat / 16)
		const dub =
			beat >= HEARTBEAT_DUB
				? Math.max(0, 1 - (beat - HEARTBEAT_DUB) / 14) * 0.7
				: 0
		return Math.max(lub, dub)
	}
	return (
		<Show when={strength() > 0}>
			<div style={{ ...styles.heartbeat, opacity: strength() * 0.85 }} />
		</Show>
	)
}

const styles = {
	flash: {
		position: 'absolute',
		inset: 0,
		background: 'white',
		'pointer-events': 'none',
	},
	heartbeat: {
		position: 'absolute',
		inset: 0,
		'pointer-events': 'none',
		background:
			'radial-gradient(ellipse at center, transparent 55%, rgba(170, 20, 40, 0.55) 100%)',
	},
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
