import { createController } from 'scoopjs'
import {
	EXHAUST_AT,
	HARVESTER_FEEDING,
	HARVESTER_HEAD,
	HARVESTER_HEIGHT,
	HARVESTER_SAWING,
	HARVESTER_WIDTH,
	HEAD_AT,
	PILE,
	PILE_AT,
	TREE_AT,
	harvester,
	log,
	stump,
} from '../courses/kit/huddingeScenery'
import { PATH_BACK, SCENERY_SET_BACK } from '../game/constants'
import {
	HARVESTER_DONE,
	HARVESTER_FALL_TICKS,
	HARVESTER_FEEDING_FROM,
	HARVESTER_LOGS,
	HARVESTER_LOG_TICKS,
	HARVESTER_SAW_TICKS,
} from '../game/harvester'
import type { World } from '../game/world'

/**
 * A forest harvester at work behind the path (see `CourseLook['harvester']`),
 * its head gripping a pine at the foot of its trunk. As whoever's racing in
 * front comes up to it, it saws through the trunk, chips flying; the pine
 * topples over, away along the forest floor; and the harvester feeds it
 * back through its head, cutting it into logs, one, two, three, onto the
 * pile under its crane, till only its stump's left. Smoke puffing out of
 * its exhaust all the while, harder as it works. Only to be seen. What it
 * does goes by the tick, from when it started (`harvesterAt`, set and
 * heard by `stepHarvester`), so it's the same on a Round's every screen.
 */

/** Its cells: 4 px, as something this big is drawn, and the pine with it. */
const CELL = 4
const TREE_SCALE = 2
/** The pine's size, drawn: `tree`'s own, twice over. */
const TREE_WIDTH = 56 * TREE_SCALE
const TREE_HEIGHT = 110 * TREE_SCALE
/** The box it's all drawn in: the harvester, and room for the pine standing, or lying along past it. */
const MACHINE_WIDTH = HARVESTER_WIDTH * CELL
const MACHINE_HEIGHT = HARVESTER_HEIGHT * CELL
const BASE = TREE_AT * CELL
const BOX_WIDTH = BASE + TREE_HEIGHT + 40
const BOX_HEIGHT = TREE_HEIGHT + 20

/** How long each part takes, in ticks: see `game/harvester.ts`. */
const SAWING = HARVESTER_SAW_TICKS
const FALLING = HARVESTER_FALL_TICKS
const LOG_EVERY = HARVESTER_LOG_TICKS
const LOGS = HARVESTER_LOGS
/** How long a log takes to drop from its head onto the pile. */
const LOG_DROP = 14
/** How long the pine bounces, landing, and the dust hangs. */
const LANDING = 20
const FEEDING_FROM = HARVESTER_FEEDING_FROM
const DONE = HARVESTER_DONE

const CHIPS = '#e8c48a'

export function createHarvester(world: World) {
	const own = world.course.look?.harvester
	if (!own) return []
	const { groundY } = world.terrain
	const left = own.x - BASE
	// Stood on the highest of the path's back edge under it, as scenery is.
	const ground =
		Math.min(
			...[0, 0.25, 0.5, 0.75, 1].map((k) => groundY(left + k * MACHINE_WIDTH)),
		) -
		PATH_BACK -
		SCENERY_SET_BACK

	return [
		createController({
			// Every picture it paints, so they're all loaded before it's seen.
			frames: [
				harvester,
				own.tree,
				stump,
				log,
				HARVESTER_HEAD,
				...HARVESTER_SAWING,
				...HARVESTER_FEEDING,
			],
			init: () => ({
				id: 'harvester',
				// Behind the path, over the trees around it.
				type: 'scenery',
				x: () => left,
				y: () => Math.round(ground - BOX_HEIGHT),
				width: () => BOX_WIDTH,
				height: () => BOX_HEIGHT,
				style: () => ({ 'image-rendering': 'pixelated' }),
			}),
			draw: ({ ctx, image }) => {
				// The tick: reading it keeps this painting.
				const now = world.ticks()
				const since = world.harvesterAt
				const t = since === undefined ? -1 : now - since
				ctx.save()
				ctx.imageSmoothingEnabled = false
				const machineTop = BOX_HEIGHT - MACHINE_HEIGHT
				const tree = image(own.tree)
				const at = (asset: string) => image(asset)?.image

				// The pine: standing, falling, lying, or fed away through its head.
				if (tree && t < DONE) {
					const fall = Math.min(1, Math.max(0, (t - SAWING) / FALLING))
					const landed = t - FEEDING_FROM
					const bounce =
						landed >= 0 && landed < LANDING
							? Math.sin((landed / LANDING) * Math.PI) * 0.06
							: 0
					const angle = (Math.PI / 2) * fall * fall - bounce
					// Lying, it's on its side, its crown resting on the ground.
					const lift = Math.sin(angle) * TREE_WIDTH * 0.42
					const fed =
						landed > 0 ? (landed / (LOGS * LOG_EVERY)) * TREE_HEIGHT : 0
					ctx.save()
					if (fed > 0) {
						ctx.beginPath()
						ctx.rect(BASE, 0, BOX_WIDTH - BASE, BOX_HEIGHT)
						ctx.clip()
					}
					if (own.filter) ctx.filter = own.filter
					ctx.translate(BASE - fed, BOX_HEIGHT - lift)
					ctx.rotate(angle)
					ctx.drawImage(
						tree.image,
						-TREE_WIDTH / 2,
						-TREE_HEIGHT,
						TREE_WIDTH,
						TREE_HEIGHT,
					)
					ctx.restore()
				}
				// Its stump, once it's down.
				const cut = at(stump)
				if (cut && t >= SAWING)
					ctx.drawImage(
						cut,
						BASE - 3 * CELL,
						BOX_HEIGHT - 3 * CELL,
						6 * CELL,
						3 * CELL,
					)

				// The harvester.
				const body = at(harvester)
				if (body)
					ctx.drawImage(body, 0, machineTop, MACHINE_WIDTH, MACHINE_HEIGHT)

				// Its pile of logs, and the one dropping onto it.
				const wood = at(log)
				if (wood)
					PILE.forEach((spot, i) => {
						const lands = FEEDING_FROM + (i + 1) * LOG_EVERY
						const x = (PILE_AT + spot.x) * CELL
						const y = BOX_HEIGHT - spot.y * CELL
						if (t >= lands) ctx.drawImage(wood, x, y, 12 * CELL, 4 * CELL)
						else if (t >= lands - LOG_DROP) {
							// From its head, over and down onto the pile.
							const k = 1 - (lands - t) / LOG_DROP
							const fromX = (HEAD_AT.x - 2) * CELL
							const fromY = (HEAD_AT.y + 8) * CELL + machineTop
							const hop = Math.sin(k * Math.PI) * 6 * CELL
							ctx.drawImage(
								wood,
								Math.round(fromX + (x - fromX) * k),
								Math.round(fromY + (y - fromY) * k - hop),
								12 * CELL,
								4 * CELL,
							)
						}
					})

				// Its head: gripping, sawing, then feeding the trunk through.
				const sawing = t >= 0 && t < SAWING
				const feeding = t >= FEEDING_FROM && t < DONE
				const head = at(
					sawing
						? HARVESTER_SAWING[Math.floor(t / 3) % 2]
						: feeding
							? HARVESTER_FEEDING[Math.floor(t / 4) % 2]
							: HARVESTER_HEAD,
				)
				if (head)
					ctx.drawImage(
						head,
						HEAD_AT.x * CELL,
						machineTop + HEAD_AT.y * CELL,
						10 * CELL,
						10 * CELL,
					)

				// Chips flying off its saw, either side of the trunk.
				if (sawing || feeding) {
					ctx.fillStyle = CHIPS
					for (let i = 0; i < 8; i++) {
						const k = ((now + i * 5) % 14) / 14
						const side = i % 2 ? 1 : -1
						const x = BASE + side * (6 + k * (12 + (i % 3) * 6)) * CELL * 0.5
						const y =
							(sawing
								? BOX_HEIGHT - 4 * CELL
								: machineTop + (HEAD_AT.y + 9) * CELL) -
							k * 14 +
							k * k * 26
						ctx.fillRect(Math.round(x), Math.round(y), CELL, CELL)
					}
				}
				// Dust, where the pine's come down.
				const landed = t - FEEDING_FROM
				if (landed >= 0 && landed < LANDING * 2) {
					const fade = 1 - landed / (LANDING * 2)
					ctx.fillStyle = `rgba(214, 200, 170, ${(0.6 * fade).toFixed(2)})`
					for (let i = 0; i < 6; i++) {
						const x = BASE + 20 + i * 34 + landed * (i % 2 ? 0.6 : -0.3)
						const size = (5 + (i % 3) * 2 + landed * 0.2) * CELL
						ctx.fillRect(
							Math.round(x),
							Math.round(BOX_HEIGHT - size),
							Math.round(size * 1.6),
							Math.round(size),
						)
					}
				}

				// Smoke out of its exhaust, puffing harder while it's working.
				const working = t >= 0 && t < DONE
				const every = working ? 30 : 70
				for (let k = 0; k < 3; k++) {
					const a = ((Math.max(0, now) + (k * every) / 3) % every) / every
					const size = Math.round((2 + a * 4) * CELL)
					ctx.fillStyle = `rgba(110, 110, 110, ${(0.55 * (1 - a)).toFixed(2)})`
					ctx.fillRect(
						Math.round(EXHAUST_AT.x * CELL + a * 6 * CELL - size / 2 + CELL),
						Math.round(machineTop + EXHAUST_AT.y * CELL - a * 16 * CELL - size),
						size,
						size,
					)
				}
				ctx.restore()
			},
		}),
	]
}
