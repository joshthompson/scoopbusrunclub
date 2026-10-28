import batAsset from '@/assets/halloween/bat.png'
import { createController, createObjectSignal } from '@/engine'
import { isHalloween } from '@/utils/halloween'
import type { Accessor } from 'solid-js'

/**
 * Bats are drawn at double their pixel size, like the runners. It has to stay
 * a whole number, or `image-rendering: pixelated` drops rows and columns.
 */
const BAT_SCALE = 2
/** One frame of `bat.png`, which has two side by side: wings up, then out. */
const BAT_WIDTH = 13 * BAT_SCALE
const BAT_HEIGHT = 9 * BAT_SCALE
/** Where its feet are across the wings-up frame, which it hangs by. */
const FEET_X = 6.5 * BAT_SCALE

/**
 * The wingbeat, stepped through with negative offsets like the skeletons' run,
 * so it doesn't matter if the sheet is saved a pixel wider or narrower.
 */
const frames = [0, 1].map(
	(n) => `${batAsset}#${-BAT_WIDTH * n},0,${BAT_WIDTH * 2},${BAT_HEIGHT}`,
)

/** One bat for every this many pixels across, but always a few, and never more than ten. */
const BAT_SPACING = 130
const MIN_BATS = 3
const MAX_BATS = 10
/** Picked from at random: mostly on their own, sometimes two or three together. */
const PACK_SIZES = [1, 1, 1, 2, 2, 3]

/**
 * The sky they flit about in, by the top of a bat, down to just over the
 * grass. They never leave the screen, so a bat is always kept inside it.
 */
const SKY_TOP = 8
const SKY_BOTTOM = 125
/** The lowest a bat comes, by its top: just above the path. */
const LOWEST = 150 - BAT_HEIGHT
/**
 * And this far in from the edges, so the tip of a wing tilted into a turn
 * isn't cut off by them.
 */
const EDGE = 4

/** Speeds, in pixels a tick. */
const FLY_SPEED = 4
const FLEE_SPEED = 7
/** How quickly a bat turns towards where it's heading: much sharper than a ghost. */
const STEER = 0.18
/** Inside this distance of its branch a bat slows down and stops jinking, to land. */
const ARRIVE_DISTANCE = 40
/** A bat never flies straight: the chance each tick of a sudden jink, and how hard. */
const JINK_CHANCE = 0.15
const JINK = 3
/** How far a bat strays from the spot its pack is making for. */
const SPREAD = { x: 50, y: 25 }
/** The pack's next spot is a short dart from its last, after a moth. */
const DART = 200
const RETARGET = [12, 45]
/** How far it tips into a turn, in degrees. */
const MAX_TILT = 20
/** Milliseconds a wingbeat frame, a little different for every bat. */
const FLAP_INTERVAL = [60, 85]

/** Hanging: a slow sway from its feet, and now and then a stretch of the wings. */
const SWAY = 4
const SWAY_SPEED = 0.06
const STRETCH_CHANCE = 1 / 400
const STRETCH = 6

/** Taking off: let go, drop a little, then turn over and flap. */
const DROP_GRAVITY = 1.4
const DROP_TICKS = 5
/** How long after the first of a pack lets go each of the others does. */
const LET_GO = [2, 12]

/** A mouse this close to the middle of a hanging bat sends its pack off. */
const SCARE_DISTANCE = 26
/**
 * Where a frightened pack makes for: at least this far from the mouse, across
 * the screen, and how long it keeps racing about before it calms down.
 */
const FLEE_DISTANCE = 250
const FLEE = [50, 100]

/** In ticks (the scene ticks every 40ms). */
const ROOST = [500, 1500]
const FLIGHT = [250, 600]
/** How likely a pack is to start out in a tree when Halloween comes on. */
const START_ROOSTING = 0.6

/** The bits of a tree a bat needs. */
interface Tree {
	x: Accessor<number>
	width: Accessor<number>
	roosts: Accessor<Vector[]>
}

type PackMode = 'roosting' | 'flying'
type BatState = 'hanging' | 'falling' | 'flying' | 'hidden'

interface Bat {
	state: BatState
	x: number
	y: number
	vx: number
	vy: number
	/** Which of its tree's roosts it hangs from. */
	roost: number
	/** Ticks until it lets go of the branch, once its pack's moving on. */
	letGo: number
	/** Ticks left of a drop, or a stretch. */
	timer: number
	/** Where it keeps to around the pack's spot. */
	offset: Vector
}

interface Pack {
	started: boolean
	mode: PackMode
	/** Ticks left in this mode, and until the pack darts somewhere new. */
	timer: number
	retarget: number
	/** Ticks left of racing away from a fright. */
	fleeing: number
	target: Vector
	tree: Tree | undefined
	bats: Bat[]
}

/** A whole number of ticks somewhere in `[min, max]`. */
function between([min, max]: number[]) {
	return Math.round(min + Math.random() * (max - min))
}

function pick<T>(items: T[]) {
	return items[Math.floor(Math.random() * items.length)]
}

function shuffle<T>(items: T[]) {
	return items
		.map((item) => ({ item, order: Math.random() }))
		.sort((a, b) => a.order - b.order)
		.map(({ item }) => item)
}

function clamp(value: number, min: number, max: number) {
	return Math.max(min, Math.min(max, value))
}

function spread(): Vector {
	return {
		x: (Math.random() - 0.5) * 2 * SPREAD.x,
		y: (Math.random() - 0.5) * 2 * SPREAD.y,
	}
}

function skyY() {
	return SKY_TOP + Math.random() * (SKY_BOTTOM - SKY_TOP)
}

/** Where a bat's box goes to hang from its roost: feet on the branch. */
function roostSpot(pack: Pack, bat: Bat): Vector | undefined {
	const roost = pack.tree?.roosts()[bat.roost]
	return roost && { x: roost.x - FEET_X, y: roost.y }
}

/**
 * Halloween's bats, flitting about the sky in ones, twos and threes, and every
 * so often hanging upside down in one of the spooky trees. Wave the mouse at
 * one that's hanging and its whole pack takes fright and races off across the
 * sky, to settle somewhere else once it's calmed down. They never leave the
 * screen.
 *
 * Each pack keeps to a tree of its own. The pack's first bat moves the pack on
 * each tick, and the others follow along: making for the same spot in the sky,
 * give or take, or for their own branch of the same tree.
 */
export function createBatControllers(
	trees: Tree[],
	sceneWidth: number,
	mousePosition: Accessor<Vector>,
) {
	const count = Math.max(
		MIN_BATS,
		Math.min(MAX_BATS, Math.round(sceneWidth / BAT_SPACING)),
	)
	/** Trees with a pack in, so no two packs pick the same one. */
	const taken = new Set<Tree>()

	const packs: Pack[] = []
	for (let left = count; left > 0; ) {
		const size = Math.min(left, pick(PACK_SIZES))
		left -= size
		packs.push({
			started: false,
			mode: 'flying',
			timer: 0,
			retarget: 0,
			fleeing: 0,
			target: { x: 0, y: 0 },
			tree: undefined,
			bats: Array.from({ length: size }, () => ({
				state: 'hidden',
				x: 0,
				y: 0,
				vx: 0,
				vy: 0,
				roost: 0,
				letGo: 0,
				timer: 0,
				offset: spread(),
			})),
		})
	}

	const release = (pack: Pack) => {
		if (pack.tree) taken.delete(pack.tree)
		pack.tree = undefined
	}

	/**
	 * Off to a free tree on screen with room for the whole pack, if there is
	 * one, each bat to a different branch.
	 */
	const roost = (pack: Pack, width: number) => {
		const free = trees.filter(
			(tree) =>
				!taken.has(tree) &&
				tree.x() >= 0 &&
				tree.x() + tree.width() <= width &&
				tree.roosts().length >= pack.bats.length,
		)
		if (!free.length) return false
		pack.tree = pick(free)
		taken.add(pack.tree)
		const roosts = shuffle(pack.tree.roosts().map((_, i) => i))
		pack.bats.forEach((bat, i) => {
			bat.roost = roosts[i]
		})
		pack.mode = 'roosting'
		pack.timer = between(ROOST)
		return true
	}

	/** A short dart from wherever the pack was making for, within the sky. */
	const dart = (pack: Pack, width: number) => {
		pack.target = {
			x: clamp(
				pack.target.x + (Math.random() - 0.5) * 2 * DART,
				0,
				width - BAT_WIDTH,
			),
			y: skyY(),
		}
		pack.retarget = between(RETARGET)
		for (const bat of pack.bats) bat.offset = spread()
	}

	/**
	 * Out of the tree and flitting about again, the bats letting go one after
	 * another. `first` lets go straight away: the one that was disturbed.
	 */
	const takeOff = (pack: Pack, first = pack.bats[0]) => {
		release(pack)
		let letGo = 0
		for (const bat of shuffle(pack.bats)) {
			if (bat === first) {
				bat.letGo = 0
				continue
			}
			letGo += between(LET_GO)
			bat.letGo = letGo
		}
		pack.mode = 'flying'
		pack.timer = between(FLIGHT)
		pack.retarget = between(RETARGET)
		pack.target = { x: first.x, y: skyY() }
	}

	/**
	 * Frightened out of the tree by the mouse at `mouseX`, in the scene: off
	 * across the screen away from it, as far as there's room for, and high up.
	 */
	const flee = (pack: Pack, bat: Bat, mouseX: number, width: number) => {
		takeOff(pack, bat)
		const right = clamp(mouseX + FLEE_DISTANCE, 0, width - BAT_WIDTH)
		const left = clamp(mouseX - FLEE_DISTANCE, 0, width - BAT_WIDTH)
		// Whichever way it's further to go, so a bat by the edge doesn't
		// just bump into it.
		const far =
			right - mouseX > mouseX - left
				? right + Math.random() * (width - BAT_WIDTH - right)
				: left * Math.random()
		pack.target = { x: far, y: SKY_TOP + Math.random() * 30 }
		pack.fleeing = between(FLEE)
		pack.retarget = pack.fleeing
	}

	/** Already hanging in a tree when Halloween comes on, or out flying. */
	const start = (pack: Pack, width: number) => {
		pack.started = true
		if (Math.random() < START_ROOSTING && roost(pack, width)) {
			for (const bat of pack.bats) {
				// biome-ignore lint/style/noNonNullAssertion: just given a tree
				const spot = roostSpot(pack, bat)!
				bat.state = 'hanging'
				bat.x = spot.x
				bat.y = spot.y
			}
			return
		}
		pack.mode = 'flying'
		pack.timer = between(FLIGHT)
		pack.target = { x: Math.random() * (width - BAT_WIDTH), y: skyY() }
		dart(pack, width)
		for (const bat of pack.bats) {
			bat.state = 'flying'
			bat.x = clamp(pack.target.x + bat.offset.x, 0, width - BAT_WIDTH)
			bat.y = clamp(pack.target.y + bat.offset.y, 0, LOWEST)
		}
	}

	const stop = (pack: Pack) => {
		pack.started = false
		release(pack)
		for (const bat of pack.bats) bat.state = 'hidden'
	}

	/** Moves the pack on: run by its first bat, before it moves itself. */
	const updatePack = (pack: Pack, width: number) => {
		if (pack.fleeing > 0) pack.fleeing--
		if (pack.mode === 'roosting') {
			if (--pack.timer <= 0) takeOff(pack)
			return
		}
		if (--pack.retarget <= 0) dart(pack, width)
		// Off to a tree, or round again if there isn't one free.
		if (--pack.timer <= 0 && !roost(pack, width)) pack.timer = between(FLIGHT)
	}

	return packs.flatMap((pack, p) =>
		pack.bats.map((bat, i) => {
			const flapInterval = between(FLAP_INTERVAL)
			// Each bat sways out of step with the others.
			const phase = Math.random() * Math.PI * 2
			let ref: HTMLDivElement | undefined
			let lastMouse: Vector | undefined

			/**
			 * The mouse, in the scene, if it's just come over this bat. Only
			 * looked at when the mouse has moved, so a still mouse doesn't cost a
			 * layout a tick. Measured on screen, so it doesn't matter where the
			 * page is scrolled. Not until it's been drawn, though: hidden, its box
			 * is all zeros, right where the mouse is said to be before it's moved
			 * at all.
			 */
			const disturbed = () => {
				const mouse = mousePosition()
				if (mouse === lastMouse || !ref) return undefined
				const box = ref.getBoundingClientRect()
				if (!box.width) return undefined
				lastMouse = mouse
				const middle = box.left + box.width / 2
				if (
					Math.hypot(mouse.x - middle, mouse.y - (box.top + box.height / 2)) >=
					SCARE_DISTANCE
				)
					return undefined
				return bat.x + BAT_WIDTH / 2 + (mouse.x - middle)
			}

			return createController({
				frames,
				init() {
					const { shown, setShown } = createObjectSignal(false, 'shown')
					const { hanging, setHanging } = createObjectSignal(false, 'hanging')
					const { sway, setSway } = createObjectSignal(0, 'sway')
					return {
						id: `bat${p}-${i}`,
						type: 'bat',
						...createObjectSignal(0, 'x'),
						...createObjectSignal(0, 'y'),
						...createObjectSignal(0, 'rotation'),
						...createObjectSignal(undefined as number | undefined, 'frame'),
						shown,
						setShown,
						hanging,
						setHanging,
						sway,
						setSway,
						width: () => BAT_WIDTH,
						height: () => BAT_HEIGHT,
						// Upside down, feet uppermost, from a branch.
						yScale: () => (hanging() ? -1 : 1),
						state: (): 'play' | 'pause' => (hanging() ? 'pause' : 'play'),
						frameInterval: () => flapInterval,
						// Swaying from its feet, which are at the bottom of the art
						// until it's turned over.
						inner: {
							rotation: sway,
							origin: () => ({ x: FEET_X, y: BAT_HEIGHT }),
						},
						style: () => ({ display: shown() ? 'block' : 'none' }),
					}
				},
				onMount({ $ref }) {
					ref = $ref
				},
				onEnterFrame({ $, $scene, $age }) {
					if (!isHalloween()) {
						if (i === 0 && pack.started) stop(pack)
						$.setShown(false)
						return
					}
					const width = $scene.canvas.get().width()
					if (i === 0) {
						if (!pack.started) start(pack, width)
						updatePack(pack, width)
					}

					switch (bat.state) {
						case 'hanging': {
							if (pack.mode === 'roosting') {
								const mouseX = disturbed()
								if (mouseX !== undefined) flee(pack, bat, mouseX, width)
							}
							if (pack.mode !== 'roosting' && --bat.letGo < 0) {
								bat.state = 'falling'
								bat.timer = DROP_TICKS
								bat.vx = 0
								bat.vy = 0
								break
							}
							// Stays put on its branch, the tree being where it was.
							const spot = roostSpot(pack, bat)
							if (spot) {
								bat.x = spot.x
								bat.y = spot.y
							}
							if (bat.timer > 0) bat.timer--
							else if (Math.random() < STRETCH_CHANCE) bat.timer = STRETCH
							break
						}

						case 'falling': {
							bat.vy += DROP_GRAVITY
							bat.y += bat.vy
							if (--bat.timer <= 0) {
								// Over the right way up, and away.
								bat.state = 'flying'
								bat.vx = (Math.random() - 0.5) * FLY_SPEED
							}
							break
						}

						case 'flying': {
							const spot = pack.mode === 'roosting' && roostSpot(pack, bat)
							const goal = spot || {
								x: clamp(
									pack.target.x + bat.offset.x,
									EDGE,
									width - BAT_WIDTH - EDGE,
								),
								y: clamp(pack.target.y + bat.offset.y, EDGE, LOWEST),
							}
							const dx = goal.x - bat.x
							const dy = goal.y - bat.y
							const distance = Math.hypot(dx, dy) || 1

							if (spot && distance < 2) {
								bat.state = 'hanging'
								bat.x = spot.x
								bat.y = spot.y
								bat.vx = 0
								bat.vy = 0
								bat.letGo = 0
								bat.timer = 0
								break
							}

							const top = pack.fleeing > 0 ? FLEE_SPEED : FLY_SPEED
							const speed = spot
								? top * Math.min(1, distance / ARRIVE_DISTANCE)
								: top
							bat.vx += ((dx / distance) * speed - bat.vx) * STEER
							bat.vy += ((dy / distance) * speed - bat.vy) * STEER
							if (
								!(spot && distance < ARRIVE_DISTANCE) &&
								Math.random() < JINK_CHANCE
							) {
								bat.vx += (Math.random() - 0.5) * 2 * JINK
								bat.vy += (Math.random() - 0.5) * 2 * JINK
							}
							bat.x += bat.vx
							bat.y += bat.vy
							break
						}
					}

					// Kept on screen, turning back off an edge it's flown into.
					if (bat.state === 'flying' || bat.state === 'falling') {
						const x = clamp(bat.x, EDGE, width - BAT_WIDTH - EDGE)
						const y = clamp(bat.y, EDGE, LOWEST)
						if (x !== bat.x) bat.vx = -bat.vx
						if (y !== bat.y) bat.vy = -bat.vy
						bat.x = x
						bat.y = y
					}

					const hanging = bat.state === 'hanging' || bat.state === 'falling'
					$.setShown(bat.state !== 'hidden')
					$.setHanging(hanging)
					$.setX(bat.x)
					$.setY(bat.y)
					$.setFrame(
						hanging
							? bat.state === 'hanging' && bat.timer > 0
								? 1
								: 0
							: undefined,
					)
					$.setSway(
						bat.state === 'hanging'
							? Math.sin($age * SWAY_SPEED + phase) * SWAY
							: 0,
					)
					$.setRotation(
						bat.state === 'flying'
							? Math.max(
									-MAX_TILT,
									Math.min(MAX_TILT, (bat.vx / FLY_SPEED) * MAX_TILT),
								)
							: 0,
					)
				},
			})
		}),
	)
}
