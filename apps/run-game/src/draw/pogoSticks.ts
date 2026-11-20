import { createController, createObjectSignal } from 'scoopjs'
import type { JSX } from 'solid-js'
import { RUNNER_SCALE, VIEW_HEIGHT, VIEW_WIDTH } from '../game/constants'
import type { World } from '../game/world'
import { ARENA_LEFT } from '../minigames/arena'
import { SPRING, pogoOf } from '../minigames/pogoSticks'

/** A pixel, as everything's drawn: 2 px. */
const CELL = 2
/** A pogo stick: a red tube, lit down one side; black grips and footrests; a steel spring; a rubber foot. */
const TUBE = '#d8342c'
const TUBE_LIT = '#f47a70'
const GRIP = '#2b2b2b'
const SPRING_LIT = '#c8d0d8'
const SPRING_SHADE = '#6a737d'
const FOOT = '#1d1d1d'
/** How far down them, from their middle, their hands are: the handlebar's there. */
const HANDS_DOWN = 0.08
/** How wide its handlebar and footrests are, either side, in px. */
const BAR_HALF = 9
const PEG_HALF = 7

/**
 * Pogo Sticks, drawn: each of them on their stick, in front of them, tipped
 * as they are, its spring squashing as they land; or lying on the ground
 * beside them, fallen off it. Nothing, if the world's not a game of it.
 */
export function createPogoSticks(world: World) {
	const show = pogoOf(world)
	if (!show) return []
	return [
		createController({
			init: () => ({
				id: 'pogo-sticks',
				type: 'furby',
				...createObjectSignal(ARENA_LEFT, 'x'),
				...createObjectSignal(0, 'y'),
				...createObjectSignal({} as JSX.CSSProperties, 'style'),
				width: () => VIEW_WIDTH,
				height: () => VIEW_HEIGHT,
			}),
			draw({ ctx }) {
				// Read the tick, so it's painted again every one.
				world.ticks()
				for (const racer of world.racers) {
					const p = show.pogos.get(racer.id)
					if (!p) continue
					const b = racer.body
					const tall = racer.runner.sprite.height * RUNNER_SCALE
					// About their middle, turned as they're drawn.
					const cx = b.x - ARENA_LEFT
					const cy = b.feetY - tall / 2
					const turn = ((b.tilt ?? 0) * Math.PI) / 180
					const cos = Math.cos(turn)
					const sin = Math.sin(turn)
					/** A cell `across` and `down` from their middle, turned with them. */
					const cell = (across: number, down: number, colour: string) => {
						ctx.fillStyle = colour
						const x = cx + across * cos - down * sin
						const y = cy + across * sin + down * cos
						ctx.fillRect(
							Math.round(x / CELL) * CELL,
							Math.round(y / CELL) * CELL,
							CELL,
							CELL,
						)
					}
					const hands = tall * HANDS_DOWN
					const feet = tall / 2
					const bottom = feet + SPRING - p.squash
					// The tube, from the handlebar down to the footrests.
					for (let down = hands; down <= feet; down += CELL / 2) {
						cell(-CELL, down, TUBE_LIT)
						cell(0, down, TUBE)
					}
					// Its handlebar, its grips black.
					for (let across = -BAR_HALF; across <= BAR_HALF; across += CELL / 2)
						cell(across, hands, Math.abs(across) > BAR_HALF - 4 ? GRIP : TUBE)
					// Its footrests, under their feet.
					for (let across = -PEG_HALF; across <= PEG_HALF; across += CELL / 2)
						cell(across, feet, GRIP)
					// The spring, coiled, squashed down as they land.
					const coils = Math.max(3, Math.round((bottom - feet - 4) / 4))
					for (let k = 0; k < coils; k++) {
						const down = feet + CELL + ((bottom - feet - 4) * k) / coils
						cell(-CELL * 2, down, k % 2 ? SPRING_SHADE : SPRING_LIT)
						cell(-CELL, down + 1, SPRING_LIT)
						cell(0, down + 1, SPRING_LIT)
						cell(CELL, down, k % 2 ? SPRING_LIT : SPRING_SHADE)
					}
					// Its rubber foot.
					for (let down = bottom - 4; down <= bottom; down += CELL / 2) {
						cell(-CELL, down, FOOT)
						cell(0, down, FOOT)
					}
				}
			},
		}),
	]
}
