import { RUNNER_SIZE } from '@/data/runners'
import { type Scene, createController, createObjectSignal } from '@/engine'
import { halloweenAssetSize, isHalloween } from '@/utils/halloween'
import {
	type HeaderPumpkin,
	headerPumpkin,
	isCarvedPumpkin,
} from '@/utils/pumpkins'
import { css } from '@style/css'
import { type Accessor, Show } from 'solid-js'
import { PumpkinLight, createBlink } from '../PumpkinLight'
import { addBehindBus, addToPath } from './PathOrder'
import type { RunnerController } from './RunnerController'

/**
 * Pumpkins are drawn at their own pixel size, the same as the scenery and the
 * bus, rather than doubled up like the runners — which is what makes one a
 * comically big head instead of a whole second runner.
 */
const PUMPKIN_SCALE = 1

/**
 * How far below the middle of the head the bottom of the pumpkin sits, in
 * screen pixels: far enough to swallow the head and rest on the shoulders.
 */
const NECK_DROP = 9

/** Lying on the path, waiting to be picked up. */
export const LOOSE_PUMPKIN_TYPE = 'pumpkin-loose'

/** As many pumpkins as fit one per this many pixels, up to `MAX_PUMPKINS`. */
const PUMPKIN_SPACING = 150
const MAX_PUMPKINS = 5

/**
 * The band of the path where runners' feet land, nearest the hills to nearest
 * the viewer, which is where a pumpkin can lie.
 */
const PATH_FAR = 182
const PATH_NEAR = 208

/**
 * How close a runner has to come to pick a pumpkin up: across, between their
 * middle and its, and in depth, between where their feet and it touch the
 * path. Anyone running past further up or down the path misses it.
 */
const PICKUP_REACH = 12
const PICKUP_DEPTH = 10

/**
 * Falling off a scooped head: the same gravity the runner falls with, a little
 * sideways drift either way so it lands apart from them, and a spin.
 */
const GRAVITY = 3
const DRIFT = [1, 2.5]
const SPIN = 18
/** How far from where its wearer lands, in depth, it can come down. */
const SCATTER = 6

/**
 * How far round a pumpkin on the path the mouse still counts as on it, it
 * being so small a thing to point at.
 */
const HOVER_SLOP = 4

/** How far the bus's scoop sticks out in front of it (see `BusController`). */
const SCOOP_REACH = 22

/** The bits of a runner a pumpkin on their head needs. */
interface Wearer {
	id: string
	data: {
		head: Accessor<Vector | undefined>
		facingRight: Accessor<boolean>
		wornPumpkin: Accessor<string | undefined>
	}
}

/**
 * The pumpkin on a runner's head, attached to the runner so its position is
 * worked out inside their box: centred on their head, and resting on their
 * shoulders, in whichever pose they're drawn in. Shows whichever pumpkin
 * they've picked up, and nothing until they have.
 */
export function createPumpkinController(runner: Wearer) {
	const asset = runner.data.wornPumpkin
	const head = runner.data.head
	const size = () => {
		const worn = asset()
		return isHalloween() && worn ? halloweenAssetSize(worn) : undefined
	}
	const width = () => (size()?.width ?? 0) * PUMPKIN_SCALE
	const height = () => (size()?.height ?? 0) * PUMPKIN_SCALE
	const blinkedOn = createBlink()

	return createController({
		init: () => ({
			id: `${runner.id}-pumpkin`,
			type: 'pumpkin',
			frames: () => {
				const worn = asset()
				return worn ? [worn] : []
			},
			x: () => (head()?.x ?? 0) * RUNNER_SIZE - width() / 2,
			y: () => (head()?.y ?? 0) * RUNNER_SIZE + NECK_DROP - height(),
			width,
			height,
			// The pumpkins are drawn looking left, the way runners run, so turn
			// them round for anyone stood facing the other way.
			xScale: () => (runner.data.facingRight() ? -1 : 1),
			style: () => ({
				display: size() && head() ? 'block' : 'none',
			}),
			// A carved one still has its inside while it's worn.
			children: () => (
				<Show when={isCarvedPumpkin(asset() ?? '')}>
					<PumpkinLight lit={blinkedOn()} />
				</Show>
			),
		}),
	})
}

/**
 * Whether a runner can pick up a pumpkin: up and running along the path, with
 * nothing on their head already, and a head to put one on — which leaves the
 * skeletons out.
 */
function canPickUp(runner: RunnerController) {
	const { data } = runner
	return (
		!data.wornPumpkin() &&
		!!data.head() &&
		!data.scooped() &&
		data.sitting() <= 0 &&
		!data.seated() &&
		!data.facingRight()
	)
}

/** Somewhere in `[min, max]`. */
function between(min: number, max: number) {
	return min + Math.random() * (max - min)
}

/** Whether the bus, scoop and all, is over a stretch of the path. */
function busCovers(scene: Scene, x: number, width: number) {
	const [bus] = scene.getControllersByType('bus')
	if (!bus) return false
	const front = bus.data.x() - SCOOP_REACH
	const back = bus.data.x() + bus.data.width()
	return x + width > front && x < back
}

/**
 * Take a pumpkin out of the scene and put it back where it now belongs: just
 * behind the bus while the bus is over it, else among the runners at the depth
 * its `ground` gives it. Every runner is drawn in front of the bus, so there's
 * no one place that's both — but the bus only covers a stretch of the path at
 * a time, and anyone level with the pumpkin there is in front of the bus too.
 */
function reslot(
	scene: Scene,
	controller: Parameters<typeof addToPath>[1][number],
	behindBus: boolean,
) {
	scene.controllers.set(
		scene.controllers.get().filter(({ id }) => id !== controller.id),
	)
	if (behindBus) addBehindBus(scene, controller)
	else addToPath(scene, [controller])
}

/**
 * One of the pumpkins going round the runners. It lies on the path until
 * someone runs into it, then rides on their head — drawn by their own head
 * pumpkin, while this one hides — curing them if they're a zombie. If they're
 * scooped, it comes off at the top of their flight and falls back to the path
 * on a line of its own, for anyone else to pick up.
 *
 * `pumpkin` can change under it, when carved pumpkins arrive or someone carves
 * one, and then it's that pumpkin lying there instead. Whoever's already
 * wearing it keeps the one they picked up. A carved one says whose it is when
 * the mouse is on it.
 */
function createLoosePumpkinController(
	scene: Scene,
	id: string,
	pumpkin: Accessor<HeaderPumpkin>,
	x: number,
	ground: number,
	mousePosition: Accessor<Vector>,
) {
	const asset = () => pumpkin().image
	let state: 'ground' | 'worn' | 'flying' = 'ground'
	let wearer: RunnerController | undefined
	// Where it is in the draw order: behind the bus, or among the runners.
	let behindBus = false
	let vx = 0
	let vy = 0

	const size = () => halloweenAssetSize(asset())
	const width = () => (size()?.width ?? 0) * PUMPKIN_SCALE
	const height = () => (size()?.height ?? 0) * PUMPKIN_SCALE
	const hovered = () => pumpkinAt(scene, mousePosition())?.data.id === id
	const blinkedOn = createBlink()

	return createController({
		init() {
			// Where it rests, or will come to rest: its place in the draw order.
			const { ground: rest, setGround } = createObjectSignal(ground, 'ground')
			// The bottom of it, which is on the path unless it's in the air.
			const { bottom, setBottom } = createObjectSignal(ground, 'bottom')
			const { shown, setShown } = createObjectSignal(true, 'shown')
			return {
				id,
				type: LOOSE_PUMPKIN_TYPE,
				frames: () => [asset()],
				...createObjectSignal(x, 'x'),
				y: () => bottom() - height(),
				ground: rest,
				setGround,
				bottom,
				setBottom,
				shown,
				setShown,
				...createObjectSignal(0, 'rotation'),
				width,
				height,
				label: () => pumpkin().label,
				style: () => ({ display: shown() && size() ? 'block' : 'none' }),
				// Its inside, if it's a carved one, lit up while it's hovered and
				// now and then by itself, and its name, styled to match the
				// runners'.
				children: () => (
					<>
						<Show when={isCarvedPumpkin(asset())}>
							<PumpkinLight lit={hovered() || blinkedOn()} />
						</Show>
						<div
							class={styles.label}
							style={{
								display: hovered() ? 'block' : 'none',
							}}
						>
							{pumpkin().label}
						</div>
					</>
				),
			}
		},
		onEnterFrame({ $, $scene, $controller }) {
			if (!size()) return

			// The bus driving over it, or on past it: move it under the bus, or
			// back among the runners. Only when that changes, not every frame.
			if ($.shown()) {
				const covered = busCovers($scene, $.x(), width())
				if (covered !== behindBus) {
					behindBus = covered
					reslot($scene, $controller, behindBus)
				}
			}

			switch (state) {
				case 'ground': {
					const middle = $.x() + width() / 2
					const finder = $scene
						.getControllersByType<RunnerController>('runner')
						.find(
							(runner) =>
								canPickUp(runner) &&
								Math.abs(runner.data.x() + runner.data.width() / 2 - middle) <
									PICKUP_REACH &&
								Math.abs(runner.data.ground() - $.ground()) < PICKUP_DEPTH,
						)
					if (!finder) return
					state = 'worn'
					wearer = finder
					finder.data.setWornPumpkin(asset())
					finder.data.setZombie(false)
					$.setShown(false)
					return
				}

				case 'worn': {
					if (!wearer) return
					// Scooped, and at the top of their flight: off it comes.
					if (!wearer.data.scooped() || wearer.data.ySpeed() < 0) return
					const head = wearer.data.head()
					$.setX(wearer.data.x() + (head?.x ?? 0) * RUNNER_SIZE - width() / 2)
					$.setBottom(
						wearer.data.y() + (head?.y ?? 0) * RUNNER_SIZE + NECK_DROP,
					)
					$.setGround(
						Math.min(
							PATH_NEAR,
							Math.max(
								PATH_FAR,
								wearer.data.ground() + between(-SCATTER, SCATTER),
							),
						),
					)
					wearer.data.setWornPumpkin(undefined)
					wearer = undefined
					vx = between(DRIFT[0], DRIFT[1]) * (Math.random() < 0.5 ? -1 : 1)
					vy = 0
					state = 'flying'
					$.setShown(true)
					behindBus = busCovers($scene, $.x(), width())
					reslot($scene, $controller, behindBus)
					return
				}

				case 'flying': {
					vy += GRAVITY
					const sceneWidth = $scene.canvas.get().width()
					$.setX(Math.min(sceneWidth - width(), Math.max(0, $.x() + vx)))
					$.setBottom(Math.min($.ground(), $.bottom() + vy))
					$.setRotation($.rotation() + SPIN * Math.sign(vx))
					if ($.bottom() >= $.ground()) {
						$.setRotation(0)
						state = 'ground'
					}
					return
				}
			}
		},
	})
}

/**
 * Put the pumpkins out on the path in Halloween mode — as many as there's room
 * for, spread across it at random depths — or clear them all away again,
 * including off anyone's head. Safe to call whenever: it only puts them out if
 * there are none.
 *
 * They're pumpkins people have carved on `/pumpkins/carve` where there are enough to
 * go round, and the drawn ones where there aren't.
 */
export function syncPumpkins(
	scene: Scene,
	on: boolean,
	mousePosition: Accessor<Vector>,
) {
	const out = scene.getControllersByType(LOOSE_PUMPKIN_TYPE).map(({ id }) => id)

	if (!on) {
		if (!out.length) return
		const leaving = new Set(out)
		scene.controllers.set(
			scene.controllers.get().filter(({ id }) => !leaving.has(id)),
		)
		for (const runner of scene.getControllersByType<RunnerController>(
			'runner',
		)) {
			runner.data.setWornPumpkin(undefined)
		}
		return
	}

	if (out.length) return
	const width = scene.canvas.get().width()
	const count = Math.min(MAX_PUMPKINS, Math.floor(width / PUMPKIN_SPACING))
	const share = width / Math.max(1, count)
	const pumpkins = Array.from({ length: count }, (_, i) =>
		createLoosePumpkinController(
			scene,
			`pumpkin-loose-${i}`,
			() => headerPumpkin(i),
			Math.max(0, share * i + between(share * 0.2, share * 0.7)),
			Math.round(between(PATH_FAR, PATH_NEAR)),
			mousePosition,
		),
	)
	addToPath(scene, pumpkins)
}

type LoosePumpkinController = ReturnType<typeof createLoosePumpkinController>

/**
 * The carved pumpkin lying on the path at `point`, if there is one: what the
 * mouse being on names, and a click on takes you to the patch for. Not one in
 * the air or on someone's head, nor a drawn one, which has no name to give.
 */
export function pumpkinAt(scene: Scene, point: Vector) {
	return scene
		.getControllersByType<LoosePumpkinController>(LOOSE_PUMPKIN_TYPE)
		.find(
			({ data }) =>
				data.label() &&
				data.shown() &&
				data.bottom() >= data.ground() &&
				point.x >= data.x() - HOVER_SLOP &&
				point.x <= data.x() + data.width() + HOVER_SLOP &&
				point.y >= data.y() - HOVER_SLOP &&
				point.y <= data.bottom() + HOVER_SLOP,
		)
}

const styles = {
	label: css({
		position: 'absolute',
		left: '50%',
		bottom: '100%',
		translate: '-50% -4px',
		background: 'var(--color-black)',
		color: 'var(--color-white)',
		fontFamily: '"Jersey 10", sans-serif',
		fontSize: '12px',
		p: '0px 8px',
		width: 'max-content',
		borderRadius: '3px',
		cornerShape: 'notch',
	}),
}
