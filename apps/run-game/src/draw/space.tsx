import { type DrawReach, createController, createObjectSignal } from 'scoopjs'
import { type JSX, Show, createMemo } from 'solid-js'
import { CAGE_ART, CHAMBER_DOOR } from '../courses/kit/alienBaseScenery'
import { ALIEN_ART, BOSS } from '../courses/kit/alienCreatures'
import { ASTEROID_ART, satellite } from '../courses/kit/rocketLaunchScenery'
import { GEYSER } from '../courses/kit/rocketPlanetScenery'
import type { Obstacle } from '../courses/types'
import { VIEW_HEIGHT } from '../game/constants'
import {
	ALIEN,
	ALIEN_AIM,
	BOSS_FALL,
	BOSS_HURT,
	CAGE,
	SATELLITE,
	STOMP_WIND,
	alienCountdown,
	alienFeet,
	alienHeight,
	alienSees,
	asteroidHeight,
	asteroidRadius,
	asteroidTurn,
	boltRadius,
	cageAt,
	satelliteTilt,
} from '../game/space'
import { scoopFlight } from '../game/step'
import type { ObstacleState, World } from '../game/world'
import { paintPicture } from './paint/picture'

/**
 * Rocket Launch's goings-on, drawn (see `game/space.ts`): its aliens and
 * their plasma bolts, its asteroids, the cage and its prisoner, the boss
 * and its chamber's doors, the planet's geysers; and over it all, the
 * boss's health. Everything from the world's plain state and the tick, so
 * a frozen moment draws as it was, and a Remote Player sees the same.
 */

// --- Aliens ------------------------------------------------------------------

/** How a knocked-out alien lies: flat, wider than it stood. */
const OUT = { width: 46, height: 16 }

export function createAlien(
	world: World,
	state: ObstacleState,
	o: Extract<Obstacle, { kind: 'alien' }>,
	id: string,
) {
	const feet = alienFeet(world, o)
	const width = OUT.width
	const height = ALIEN.height
	const left = o.x - width / 2
	const top = feet - height
	return createController({
		frames: Object.values(ALIEN_ART),
		init: () => ({
			id,
			type: 'zombie',
			...createObjectSignal(left, 'x'),
			...createObjectSignal(top, 'y'),
			width: () => width,
			height: () => height,
			...createObjectSignal(1 as number, 'xScale'),
			...createObjectSignal(0, 'rotation'),
		}),
		drawReach: { left: 8, top: 8, right: 8, bottom: 0 } satisfies DrawReach,
		onEnterFrame({ $ }) {
			const now = world.ticks()
			if (state.scooped) {
				const flight = scoopFlight(state.scooped, now)
				$.setX(left + flight.x)
				$.setY(top + flight.y)
				$.setRotation(flight.spin)
				return
			}
			// The art faces left: turned round, facing right.
			if (!state.used) $.setXScale(-alienSees(world, state).facing)
		},
		draw({ ctx, image }) {
			const now = Math.max(0, world.ticks())
			if (state.used && !state.scooped) {
				// Knocked out, flat on its back, stars round its head.
				paintPicture(
					ctx,
					image,
					ALIEN_ART.out,
					(width - OUT.width) / 2,
					height - OUT.height,
					OUT.width,
					OUT.height,
				)
				paintDizzy(ctx, width / 2, height - OUT.height - 6, now)
				return
			}
			const tall = alienHeight(o)
			const aiming =
				alienCountdown(o.x, now) < ALIEN_AIM && alienSees(world, state).sees
			const art = o.kneeling
				? aiming
					? ALIEN_ART.kneelAim
					: ALIEN_ART.kneel
				: aiming
					? ALIEN_ART.aim
					: ALIEN_ART.stand
			// A waddle: a little bob, stood about.
			const bob = Math.floor((now + o.x) / 20) % 2
			const artWidth = ALIEN.width
			paintPicture(
				ctx,
				image,
				art,
				(width - artWidth) / 2,
				height - tall - (aiming ? 0 : bob),
				artWidth,
				tall,
			)
			if (aiming) {
				// Its gun glowing, charging up, at its muzzle: out in front (left).
				const gun = o.kneeling ? ALIEN.kneelingGun : ALIEN.gun
				const charge = 1 - alienCountdown(o.x, now) / ALIEN_AIM
				paintGlow(
					ctx,
					width / 2 - ALIEN.muzzle,
					height - gun,
					3 + charge * 5,
					0.4 + charge * 0.5,
				)
			}
		},
	})
}

/** Stars, going round, over something knocked out. */
function paintDizzy(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	now: number,
) {
	ctx.fillStyle = '#ffd23f'
	for (let i = 0; i < 3; i++) {
		const a = now / 12 + (i * Math.PI * 2) / 3
		const sx = Math.round(x + Math.cos(a) * 10)
		const sy = Math.round(y + Math.sin(a) * 3)
		ctx.fillRect(sx - 1, sy, 4, 2)
		ctx.fillRect(sx, sy - 1, 2, 4)
	}
}

/** A plasma glow: green, a bright core, round `x`, `y`. */
function paintGlow(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	radius: number,
	strength = 1,
) {
	const r = Math.round(radius / 2) * 2
	ctx.globalAlpha *= strength
	ctx.fillStyle = 'rgba(120, 255, 140, 0.35)'
	ctx.fillRect(x - r - 2, y - r + 2, r * 2 + 4, r * 2 - 4)
	ctx.fillRect(x - r + 2, y - r - 2, r * 2 - 4, r * 2 + 4)
	ctx.fillStyle = '#8dff8a'
	ctx.fillRect(x - r + 2, y - r + 2, r * 2 - 4, r * 2 - 4)
	ctx.fillStyle = '#f2fff0'
	ctx.fillRect(x - 2, y - 2, 4, 4)
	ctx.globalAlpha /= strength
}

// --- Asteroids -----------------------------------------------------------------

export function createAsteroid(
	world: World,
	o: Extract<Obstacle, { kind: 'asteroid' }>,
	id: string,
) {
	const ground = world.terrain.groundY(o.x)
	if (o.satellite) return createSatellite(world, o, id, ground)
	const r = asteroidRadius(o)
	const frames = o.big ? ASTEROID_ART.big : ASTEROID_ART.small
	return createController({
		frames,
		init: () => ({
			id,
			type: 'zombie',
			...createObjectSignal(o.x - r, 'x'),
			...createObjectSignal(ground - o.low - r, 'y'),
			width: () => r * 2,
			height: () => r * 2,
			...createObjectSignal(0 as number | undefined, 'frame'),
			...createObjectSignal('pause' as 'play' | 'pause', 'state'),
		}),
		onEnterFrame({ $ }) {
			const now = Math.max(0, world.ticks())
			$.setY(Math.round(ground - asteroidHeight(o, now) - r))
			$.setFrame(asteroidTurn(o, now))
		},
	})
}

/** A dead satellite, drifting up and down as an asteroid does, rocking slowly. */
function createSatellite(
	world: World,
	o: Extract<Obstacle, { kind: 'asteroid' }>,
	id: string,
	ground: number,
) {
	const { width, height } = SATELLITE
	return createController({
		frames: [satellite],
		init: () => ({
			id,
			type: 'zombie',
			...createObjectSignal(o.x - width / 2, 'x'),
			...createObjectSignal(ground - o.low - height / 2, 'y'),
			width: () => width,
			height: () => height,
			...createObjectSignal(0, 'rotation'),
		}),
		onEnterFrame({ $ }) {
			const now = Math.max(0, world.ticks())
			$.setY(Math.round(ground - asteroidHeight(o, now) - height / 2))
			$.setRotation(satelliteTilt(o, now))
		},
	})
}

// --- Geysers -------------------------------------------------------------------

/** How long a geyser's blast lasts, after it's fired someone up, and how high it goes. */
const BLAST_TICKS = 50
const BLAST_HIGH = 160

/** Whether the course's Steam Vent at `x` is a geyser. */
export const isGeyser = (world: World, x: number) => {
	const g = world.course.look?.geyser
	return !!g && x >= g.from && x < g.to
}

/** How far a geyser's paint reaches up out of its box: its blast. */
export const GEYSER_REACH: DrawReach = {
	left: 10,
	top: BLAST_HIGH + 20,
	right: 10,
	bottom: 0,
}

/**
 * A geyser: a crack in the crust, its rim crusted yellow, wisps of steam
 * curling up off it, and when it's fired someone up, a column of it,
 * blasting up, white, and thinning away.
 */
export function paintGeyser(
	ctx: CanvasRenderingContext2D,
	now: number,
	flown: number | undefined,
	salt: number,
) {
	const { width, height } = GEYSER
	// The crust round it, and the hole.
	ctx.fillStyle = '#d8c25a'
	ctx.fillRect(4, height - 8, width - 8, 6)
	ctx.fillStyle = '#a8923a'
	ctx.fillRect(8, height - 6, width - 16, 4)
	ctx.fillStyle = '#2a1838'
	ctx.fillRect(14, height - 6, width - 28, 4)
	// Wisps, curling up off it.
	for (let i = 0; i < 3; i++) {
		const t = ((now + salt + i * 23) % 70) / 70
		const x = width / 2 - 6 + i * 6 + Math.round(Math.sin(t * 6 + i) * 3) * 2
		const y = height - 10 - Math.round(t * 30)
		ctx.fillStyle = `rgba(255, 255, 255, ${0.6 * (1 - t)})`
		ctx.fillRect(x, y, 4, 4)
	}
	if (flown === undefined) return
	const since = now - flown
	if (since < 0 || since > BLAST_TICKS) return
	// The blast: a column of steam up out of it, thinning as it goes.
	const fade = 1 - since / BLAST_TICKS
	const high = Math.min(BLAST_HIGH, since * 12)
	for (let y = 0; y < high; y += 6) {
		const spread = 6 + Math.round((y / BLAST_HIGH) * 10)
		const wobble = Math.round(Math.sin((y + now * 3) / 14) * 2) * 2
		ctx.fillStyle = `rgba(255, 255, 255, ${0.85 * fade * (1 - y / (BLAST_HIGH * 1.4))})`
		ctx.fillRect(width / 2 - spread + wobble, height - 8 - y - 6, spread * 2, 6)
	}
}

// --- Bolts, the cage, the boss, its doors ----------------------------------------

/** How much more there is, over and under the camera's view, to paint bolts in. */
const BOLT_ROOM = 600

export function createSpaceFx(world: World) {
	const { boss, cage } = world.course
	const hasAliens = world.course.obstacles.some((o) => o.kind === 'alien')
	if (!boss && !cage && !hasAliens) return []
	const controllers = []

	// Every plasma bolt in flight, painted over the view.
	controllers.push(
		createController({
			init: () => ({
				id: 'bolts',
				type: 'flyer',
				...createObjectSignal(0, 'x'),
				...createObjectSignal(0, 'y'),
				width: () => world.viewWidth(),
				height: () => VIEW_HEIGHT * world.zoom() + BOLT_ROOM * 2,
			}),
			onEnterFrame({ $ }) {
				$.setX(Math.round(world.camera()))
				$.setY(Math.round(world.cameraY()) - BOLT_ROOM)
			},
			draw({ ctx }) {
				const left = Math.round(world.camera())
				const top = Math.round(world.cameraY()) - BOLT_ROOM
				const now = Math.max(0, world.ticks())
				for (const bolt of world.space.bolts) {
					const r = boltRadius(bolt)
					const x = Math.round(bolt.x - left)
					const y = Math.round(bolt.y - top)
					// A trail behind it, and it, flickering.
					ctx.fillStyle = 'rgba(120, 255, 140, 0.25)'
					ctx.fillRect(
						bolt.vx > 0 ? x - r * 3 : x,
						y - Math.round(r / 2),
						r * 3,
						r,
					)
					paintGlow(ctx, x, y, r + ((now + bolt.id) % 6 < 3 ? 0 : 2))
				}
			},
		}),
	)

	if (cage) {
		const width = CAGE.width
		const height = CAGE.height
		controllers.push(
			createController({
				frames: [CAGE_ART.hanging, CAGE_ART.smashed],
				init: () => ({
					id: 'cage',
					type: 'hazard-front',
					x: () => cage.x - width / 2,
					...createObjectSignal(cage.top, 'y'),
					width: () => width,
					height: () => height,
				}),
				// Its chain, up to the roof.
				drawReach: { left: 0, top: 400, right: 0, bottom: 0 },
				onEnterFrame({ $ }) {
					const at = cageAt(world, Math.max(0, world.ticks()))
					if (at) $.setY(Math.round(at.top))
				},
				draw({ ctx, image }) {
					const now = Math.max(0, world.ticks())
					const at = cageAt(world, now)
					if (!at) return
					if (!at.open && !at.falling) {
						// Its chain, up out of sight into the glass.
						const roof = world.course.cave?.ceiling(cage.x) ?? cage.top - 400
						ctx.fillStyle = '#5c6072'
						for (let y = -4; y > roof - at.top; y -= 6)
							ctx.fillRect(width / 2 - 2, y, 4, 4)
					}
					paintPicture(
						ctx,
						image,
						at.open ? CAGE_ART.smashed : CAGE_ART.hanging,
						0,
						0,
						width,
						height,
					)
				},
			}),
		)
	}

	if (boss) {
		const run = () => world.space.boss
		const floor = world.terrain.groundY(boss.x)
		const width = BOSS.width
		const height = BOSS.height
		const left = boss.x - width / 2
		controllers.push(
			createController({
				frames: [BOSS.asleep, BOSS.awake, BOSS.hurt, BOSS.stomp, BOSS.beaten],
				init: () => ({
					id: 'boss',
					type: 'scenery',
					x: () => left,
					...createObjectSignal(floor - height, 'y'),
					width: () => width,
					height: () => height,
					...createObjectSignal(0, 'rotation'),
					...createObjectSignal(1, 'opacity'),
				}),
				onEnterFrame({ $ }) {
					const r = run()
					const now = world.ticks()
					if (r?.downAt === undefined) {
						$.setY(floor - height)
						$.setRotation(0)
						return
					}
					// Beaten: toppling back, and sinking down.
					const t = Math.min(1, (now - r.downAt) / BOSS_FALL)
					$.setRotation(Math.round(t * t * 16))
					$.setY(Math.round(floor - height + t * t * height * 0.55))
				},
				draw({ ctx, image }) {
					const r = run()
					const now = world.ticks()
					let art = BOSS.asleep
					if (r?.downAt !== undefined) art = BOSS.beaten
					else if (r?.awake !== undefined) {
						art = BOSS.awake
						if (r.hurtAt !== undefined && now - r.hurtAt < BOSS_HURT)
							art = BOSS.hurt
						if (
							r.stompAt !== undefined &&
							now >= r.stompAt - STOMP_WIND &&
							now < r.stompAt + 8
						)
							art = BOSS.stomp
					}
					paintPicture(ctx, image, art, 0, 0, width, height)
				},
			}),
		)
		// Its chamber's doors: the way in shut once it's woken, the way out
		// open once it's down.
		for (const [x, open] of [
			[
				boss.room.from,
				() => run()?.awake === undefined || run()?.downAt !== undefined,
			],
			[
				boss.room.to,
				() => {
					const down = run()?.downAt
					return down !== undefined && world.ticks() >= down + BOSS_FALL / 2
				},
			],
		] as const)
			controllers.push(
				createController({
					frames: [CHAMBER_DOOR.shut, CHAMBER_DOOR.open],
					init: () => ({
						id: `chamber-door-${x}`,
						type: 'hazard-front',
						x: () => x - CHAMBER_DOOR.width / 2,
						y: () => world.terrain.groundY(x) - CHAMBER_DOOR.height + 4,
						width: () => CHAMBER_DOOR.width,
						height: () => CHAMBER_DOOR.height,
					}),
					draw({ ctx, image }) {
						paintPicture(
							ctx,
							image,
							open() ? CHAMBER_DOOR.open : CHAMBER_DOOR.shut,
							0,
							0,
							CHAMBER_DOOR.width,
							CHAMBER_DOOR.height,
						)
					},
				}),
			)
	}
	return controllers
}

/** Where the course's caged runner stands: in the cage, if it's hanging or falling. */
export function cagedFeet(world: World) {
	const at = cageAt(world, Math.max(0, world.ticks()))
	if (!at || at.open) return undefined
	return at.top + CAGE.height - 4
}

// --- The boss's health -----------------------------------------------------------

/** How long its bar stays up after it's beaten, emptied. */
const BAR_AFTER = 90

/**
 * The boss's health, over the top of the screen, once it's woken: its name,
 * and a bar, red, going down with every hit.
 */
export function BossBar(props: { world: World }) {
	const boss = props.world.course.boss
	if (!boss) return null
	const shown = createMemo(() => {
		const now = props.world.ticks()
		const run = props.world.space.boss
		if (!run || run.awake === undefined) return undefined
		if (run.downAt !== undefined && now - run.downAt > BAR_AFTER)
			return undefined
		return { hp: run.hp, max: run.max }
	})
	return (
		<Show when={shown()}>
			{(bar) => (
				<div style={styles.bar}>
					<div style={styles.name}>Gloop the Enormous</div>
					<div style={styles.track}>
						<div
							style={{
								...styles.fill,
								width: `${(100 * bar().hp) / bar().max}%`,
							}}
						/>
					</div>
				</div>
			)}
		</Show>
	)
}

const styles = {
	bar: {
		position: 'absolute',
		top: '64px',
		left: '50%',
		transform: 'translateX(-50%)',
		width: '420px',
		display: 'grid',
		gap: '4px',
		'pointer-events': 'none',
		'text-align': 'center',
	},
	name: {
		color: '#f4f8ff',
		'font-family': 'var(--font-pixel)',
		'font-size': '18px',
		'text-shadow':
			'2px 0 #14102a, -2px 0 #14102a, 0 2px #14102a, 0 -2px #14102a',
	},
	track: {
		height: '16px',
		background: '#14102a',
		border: '3px solid #14102a',
		'box-shadow': '0 0 0 2px #f4f8ff',
	},
	fill: {
		height: '100%',
		background: 'linear-gradient(#ff7a6a, #d02a3a)',
		transition: 'width 120ms steps(3)',
	},
} satisfies Record<string, JSX.CSSProperties>
