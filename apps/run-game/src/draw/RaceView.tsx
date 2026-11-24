import { CanvasRenderer, Scene } from 'scoopjs'
import { type JSX, Show, createMemo, lazy } from 'solid-js'
import { HEARTBEAT_DUB, beatAt } from '../game/body'
import {
	CAMERA_LEAD,
	HITBOX_HALF_WIDTH,
	START_X,
	TICK_MS,
	VIEW_HEIGHT,
	VIEW_WIDTH,
} from '../game/constants'
import { portalView } from '../game/portals'
import { bossShake } from '../game/space'
import { onScreen } from '../game/step'
import type { World } from '../game/world'
import { playVersion, tuneAlong } from '../music/music'
import { dressedIn, inRaceShirt } from '../runners/raceShirts'
import { FrameMeter, showFrameMeter } from './FrameMeter'
import { createLongJump } from './LongJump'
import { createArenaSet } from './arenaSets'
import {
	BEHIND_TYPES,
	OVER_TYPES,
	createBackdrop,
	createWeather,
} from './backdropControllers'
import { createBeachVolleyball } from './beachVolleyball'
import { createBigScreen } from './bigScreen'
import { createBoars } from './boars'
import { createBombHat } from './bombHat'
import { createCoaster } from './coaster'
import { debugMenuOpen } from './debugOpen'
import { createDeepWater } from './deepWater'
import { createDiplodocus } from './diplodocus'
import { createLifeboatRide } from './engineRoom'
import {
	EruptionSky,
	createEruptionBurst,
	createSmokeWall,
	eruptionShake,
	silhouetteFilter,
} from './eruption'
import { createFikaDefence } from './fikaDefence'
import { createFollowers } from './followers'
import { createFootballSprite } from './football'
import { createCaveCover, createSeaFront } from './frontControllers'
import { createFruitKebab } from './fruitKebab'
import { createGiantMouth } from './giantMouth'
import { createHarvester } from './harvester'
import { createHauntedHouse } from './hauntedHouse'
import { createHerds } from './herds'
import { createHungryGoose } from './hungryGoose'
import { createIcebergBump } from './icebergBump'
import { createInterview } from './interview'
import { createJughead } from './jughead'
import { createJumpRope } from './jumpRope'
import { createLava } from './lava'
import { createLollapascoopza } from './lollapascoopza'
import { createMemoryDunk } from './memoryDunk'
import { createMine, createMineCarts, createMoleTrails } from './mine'
import { createMrClaws } from './mrClaws'
import { createPyro, createSearchlights, createSmoke } from './nightRace'
import { createOrgans } from './organs'
import { createPaintbrush } from './paintbrush'
import { createPogoSticks } from './pogoSticks'
import { createPortalFx } from './portalFx'
import { createPotatoRain } from './potatoRain'
import { createRedLightGreenLight } from './redLightGreenLight'
import { createRiver, createRiverFront } from './river'
import { createRocket } from './rocketLaunch'
import { ScreenWashes, pictureStyle } from './screenFilters'
import { createSecret } from './secret'
import { createSkateJam } from './skateJam'
import { BossBar, createSpaceFx } from './space'
import {
	createBanner,
	createBoost,
	createBus,
	createBusBore,
	createBusDirt,
	createCorgis,
	createFlyers,
	createForeground,
	createFound,
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
import { createStairs } from './stairs'

/** The debug menu (see `DebugMenu`), on the dev server only: left out of a build altogether. */
const DebugMenu = import.meta.env.DEV
	? lazy(() => import('./DebugMenu').then((m) => ({ default: m.DebugMenu })))
	: undefined

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
	const shirt = world.course.raceShirt
	// Its T-shirt's recolouring started, if it has one: `prepareRace` waits
	// for it, and a race shown without (a Mirror's) follows once it's done.
	if (shirt) dressedIn(shirt)
	const scene = new Scene('run-game', {
		width: VIEW_WIDTH,
		height: VIEW_HEIGHT,
		frameRate: TICK_MS,
		// Front to back.
		assetOrder: [
			// Kristineberg's drone, over everything; and just under it, what it
			// films: everything but itself (see `bigScreen`).
			'drone',
			'drone-camera',
			// A haunted house's bats, bursting out of it at you, over its cover.
			'bats',
			// Snow and fog over everything.
			...OVER_TYPES,
			// Counting everyone down, at the front, always in sight.
			'run-director',
			// A night race's smoke, rolling over everyone on the road.
			'smoke',
			// Guard towers over a wall's walkway, and its parapet along the
			// near edge of the path.
			'tower',
			'foreground',
			// The near poles of the start and finish banners, which you run past.
			'banner-front',
			// Fireballs fired up on "Go!", off the start line's near end.
			'pyro',
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
			// Beach Volleyball's net leans across the sand, front left to back
			// right, so its left team and the ball on their side are behind it
			// and the right team in front.
			'net',
			'ball-behind-net',
			'player-behind-net',
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
			// Flights of stairs over the Ground, and their rails: over a ship's
			// hull, and whatever's down there under them.
			'stairs',
			// A ship's hull over its engine rooms, hiding them, and what's down
			// there with them (see `SecretLook['door']`): over the fika there.
			'secret-cover',
			// Behind whoever's kicking it, in front of the rocks it rolls past.
			'football',
			'boost',
			'hazard',
			'cheerer',
			// And off its far end, behind everyone on the road.
			'pyro-back',
			// Searchlights at the road's far edge, their beams sweeping the
			// sky, over the scenery.
			'searchlight',
			'banner',
			'sign',
			'mud',
			// A River's water behind the path, under its crocodiles.
			'river',
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
		// In a race's own T-shirt, everyone: the club's own, drawn by hand,
		// recoloured into it (see `runners/raceShirts.ts`).
		resolveAsset: shirt ? (url) => inRaceShirt(shirt, url) : undefined,
		setup(scene) {
			scene.addController(
				createGameController(world, step),
				...createScenery(world),
				// A harvester at work: after the scenery, over the trees round it.
				...createHarvester(world),
				// A big screen behind the track, and the drone filming for it.
				...createBigScreen(world),
				// Its reporter, interviewing the winner.
				...createInterview(world),
				// A giant's mouth, opening, over its face: after the scenery, over it.
				...createGiantMouth(world),
				// A heart beating, lungs breathing: behind everything in their chambers.
				...createOrgans(world),
				// A haunted house's bats, window, monster and grave.
				...createHauntedHouse(world),
				// A race's start and finish, and who's counting everyone down: not
				// in a minigame's arena, which is nothing but path.
				...(world.minigame
					? createMinigame(world)
					: [
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
						]),
				// Whoever's hiding on the course, waiting to be found.
				...createFound(world),
				...createPlatforms(world),
				...createRails(world),
				...createHut(world),
				...createBusBore(world),
				...createMine(world),
				...createSecret(world),
				// A lifeboat to ride, out of a ship's engine rooms, and its wave.
				...createLifeboatRide(world),
				...createStairs(world),
				...createCoaster(world),
				...createMoleTrails(world),
				...createRiver(world),
				...createMineCarts(world),
				...createFootballSprite(world),
				// Whoever's following anyone: a hatchling, out of its egg.
				...createFollowers(world),
				...world.obstacles.flatMap((state, i) =>
					createObstacle(world, state, i),
				),
				...world.boosts.flatMap((state, i) => createBoost(world, state, i)),
				...createCorgis(world),
				...createFurbies(world),
				createBus(world),
				// Black smoke rolling down a volcano, level with the bus.
				...createSmokeWall(world),
				createScoopArm(world),
				...createBusDirt(world),
				...createPack(world),
				createFlyers(world),
				...createSplashes(world),
				...createGiantFurby(world),
				...createHats(world),
				...createForeground(world),
				// Wild boar, running along in front of the path; and herds, dinosaurs.
				...createBoars(world),
				...createHerds(world),
				// A diplodocus, the path up over it.
				...createDiplodocus(world),
				// Lava down a crater, churning, behind its bridge.
				...createLava(world),
				// A volcano blowing: lava and smoke up out of its crater.
				...createEruptionBurst(world),
				...createTowers(world),
				// A Portal going off: the shrink ray's beam, the sneeze's spray.
				...createPortalFx(world),
				// Rocket Launch's plasma bolts, its cage, its boss and its doors.
				...createSpaceFx(world),
				// Its rocket: on its pad, taking off, and blowing up.
				...createRocket(world),
				// The first racer last, so they're drawn over everyone else racing.
				...[...world.racers]
					.reverse()
					.map((racer) => createPlayer(world, racer)),
				// The backdrop and the Ground, behind it all; a Cave's rock and the
				// sea's waves, over everyone in them; and snow and fog, over it all.
				...createBackdrop(world, scene),
				...createCaveCover(world, scene),
				...createSeaFront(world, scene),
				// The sea, swum through: its water, and over everyone in it.
				...createDeepWater(world, scene),
				...createRiverFront(world),
				...createWeather(world, scene),
				// A night race's show: fire, searchlights and smoke.
				...createPyro(world),
				...createSearchlights(world),
				...createSmoke(world),
			)
		},
	})
	// The camera follows the world's, to a whole pixel, as the ground and the
	// backdrop scroll: moved by a fraction of one, the sprites would be drawn
	// a pixel out from the ground under them. It goes up and down too, and
	// takes in more zoomed out: the canvas only paints what it sees.
	const scroll = () => syncCamera(world, scene)
	scroll()
	scene.tickers.add(scroll)
	// A course's tune in other versions along it (see `tunes`): whichever's
	// where the runner is, in the camera's view, in the menus, nothing.
	if (world.course.tunes)
		scene.tickers.add(() =>
			playVersion(
				tuneAlong(
					world.course,
					world.camera() + VIEW_WIDTH * world.zoom() * CAMERA_LEAD,
				),
			),
		)
	window.raceScene = scene
	return scene
}

/** A minigame's own goings-on, drawn: whichever it is. */
function createMinigame(world: World) {
	// Its set: what's round its arena, so it's somewhere.
	return [...createArenaSet(world), ...createMinigameItself(world)]
}

/** What's going on in a minigame, drawn: its cannons and fruit, its potatoes. */
function createMinigameItself(world: World) {
	switch (world.minigame?.id) {
		case 'fruit-kebab':
			return createFruitKebab(world)
		case 'potato-rain':
			return createPotatoRain(world)
		case 'jump-rope':
			return createJumpRope(world)
		case 'pogo-sticks':
			return createPogoSticks(world)
		case 'iceberg-bump':
			return createIcebergBump(world)
		case 'beach-volleyball':
			return createBeachVolleyball(world)
		case 'red-light-green-light':
			return createRedLightGreenLight(world)
		case 'memory-dunk':
			return createMemoryDunk(world)
		case 'paintbrush':
			return createPaintbrush(world)
		case 'hungry-goose':
			return createHungryGoose(world)
		case 'fika-defence':
			return createFikaDefence(world)
		case 'bomb-hat':
			return createBombHat(world)
		case 'lollapascoopza':
			return createLollapascoopza(world)
		case 'mr-claws':
			return createMrClaws(world)
		case 'skate-jam':
			return createSkateJam(world)
		case 'jughead':
			return createJughead(world)
		default:
			return []
	}
}

/** The scene's camera put where the world's is: see `createRaceScene`. */
export function syncCamera(world: World, scene: Scene) {
	const camera = scene.canvas.get()
	camera.setX(Math.round(world.camera()))
	camera.setWidth(VIEW_WIDTH * world.zoom())
	camera.setHeight(VIEW_HEIGHT * world.zoom())
	camera.setY(cameraTop(world))
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
		if (!view) return { position: 'relative', ...pictureStyle(props.world) }
		const at = onScreen(props.world, view.focus.x, view.focus.y)
		return {
			position: 'relative',
			// The Screen Filters' colours, but not their swaying: the Portal's zoom.
			...pictureStyle(props.world, true),
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
			{/* A volcano gone off: its burning sky, behind everything. */}
			<EruptionSky world={props.world} />
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
						transform: `translateX(${eruptionShake(props.world) + bossShake(props.world)}px) scale(${1 / zoom()})`,
						'transform-origin': '0 0',
						background: 'transparent',
						// Black against a burning sky, in its silhouetted stretch.
						filter: silhouetteFilter(props.world),
					}}
					loading={() => (
						<div style={styles.loading}>Loading {props.world.course.name}…</div>
					)}
				/>
			</div>
			{/* A heart beating: the screen thumping red with it. */}
			<Heartbeat world={props.world} />
			<ScreenWashes world={props.world} />
			<Show when={(portal()?.flash ?? 0) > 0}>
				<div style={{ ...styles.flash, opacity: portal()?.flash }} />
			</Show>
			{/* A boss's health, over the top of the screen. */}
			<BossBar world={props.world} />
			{/* Into the dark, a Portal's words in it, shaking: the sneeze. */}
			<Show when={(portal()?.dark ?? 0) > 0}>
				<div style={{ ...styles.dark, opacity: portal()?.dark }} />
			</Show>
			<Show when={portal()?.words}>
				{(words) => (
					<div
						style={{
							...styles.words,
							'font-size': `${words().size}px`,
							opacity: 1 - (words().fade ?? 0),
							transform: `translateX(${portal()?.shake ?? 0}px) scale(${1 + words().grow * 0.6}) rotate(${(portal()?.shake ?? 0) * 0.6}deg)`,
						}}
					>
						{words().text}
					</div>
				)}
			</Show>
			{/* Paused, or between Rounds: the whole screen shaded, not just the
			    canvas, which goes with the camera (see `styles.css`). */}
			<Show when={props.scene.modal.get() && !debugMenuOpen()}>
				<div style={styles.shade} />
			</Show>
			{props.overlay}
			<Show when={showFrameMeter()}>
				<FrameMeter />
			</Show>
			{/* On the dev server: Esc twice, quickly, for the debug menu. */}
			{DebugMenu && <DebugMenu world={props.world} scene={props.scene} />}
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
	dark: {
		position: 'absolute',
		inset: 0,
		background: '#000',
		'pointer-events': 'none',
	},
	words: {
		position: 'absolute',
		inset: 0,
		display: 'grid',
		'place-items': 'center',
		color: '#fff',
		'font-family': 'var(--font-pixel)',
		'letter-spacing': '0.04em',
		'text-shadow': '0 0 18px rgba(255, 120, 140, 0.8), 6px 6px 0 #6a1020',
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
