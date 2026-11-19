import { createController } from 'scoopjs'
import type { StairsLook } from '../courses/types'
import { PATH_BACK, PATH_FRONT } from '../game/constants'
import type { World } from '../game/world'
import { cachedArt } from './canvasArt'
import { rectFiller } from './paint/snappedRect'

/**
 * Flights of stairs (see `CourseLook['stairs']`), drawn over the Ground
 * where it steps up or down: each tread, its runner and nosing, the
 * stringer under them, straight along its underside, and a rail along
 * their near side, a newel post at either end. Painted once, and kept.
 */

/**
 * How much of the back of the path is left behind the treads, with
 * `behind`: a fifth of it, to a whole cell, the treads taking the rest.
 */
const BEHIND = 8
/** How deep the stringer is, under the treads' nosings, and how tall the rail is over them. */
const STRINGER_DEEP = 16
const RAIL_UP = 40
/** How wide a column's painted at a time. */
const COLUMN = 2

const LOOKS = {
	carpet: {
		tread: '#8a6440',
		treadLit: '#a87c52',
		treadShade: '#5e432a',
		runner: '#34558e',
		runnerLit: '#4a6fae',
		runnerShade: '#26406c',
		nosing: '#c9a24a',
		nosingLit: '#e8c66a',
		stringer: '#6b4a2e',
		stringerLit: '#8a6440',
		stringerShade: '#4e341f',
		rail: '#6b4a2e',
		railLit: '#9a6e44',
		baluster: '#efe6d2',
		balusterShade: '#c9bfa8',
		newel: '#5e3f25',
		newelCap: '#c9a24a',
	},
	deck: {
		tread: '#c49660',
		treadLit: '#d8ac74',
		treadShade: '#9a7044',
		runner: undefined,
		runnerLit: undefined,
		runnerShade: undefined,
		nosing: '#e8c25a',
		nosingLit: '#f4d97a',
		stringer: '#e8ecef',
		stringerLit: '#ffffff',
		stringerShade: '#b9c0c6',
		rail: '#e8ecef',
		railLit: '#ffffff',
		baluster: '#d3d8dc',
		balusterShade: '#a9b0b6',
		newel: '#c9ced0',
		newelCap: '#ffffff',
	},
}

export function createStairs(world: World) {
	const flights = world.course.look?.stairs ?? []
	return flights.map((flight, i) => createFlight(world, flight, i))
}

function createFlight(world: World, flight: StairsLook, i: number) {
	const { groundY } = world.terrain
	const look = LOOKS[flight.style]
	const { from, to } = flight
	const startY = groundY(from)
	const endY = groundY(to - 1)
	/** Along a straight line from its foot to its head, where its nosings are, for the stringer's underside and the rail. */
	const line = (x: number) =>
		startY + ((endY - startY) * (x - from)) / (to - from)
	/** The floor at its foot, as low as it goes. */
	const foot = Math.max(startY, endY)
	const top = Math.min(startY, endY) - PATH_BACK - RAIL_UP - 12
	const bottom = foot + PATH_FRONT + 4
	const left = from - 8
	const width = to - from + 16
	const height = bottom - top

	const paint = (ctx: CanvasRenderingContext2D) => {
		ctx.translate(-left, -top)
		const fill = rectFiller(ctx)
		const rect = (
			x: number,
			y: number,
			w: number,
			h: number,
			colour: string,
		) => {
			ctx.fillStyle = colour
			fill(x, y, w, h)
		}
		const back = BEHIND
		const stepAt = (x: number) => Math.round(groundY(x + COLUMN / 2) / 2) * 2
		// Boxed in under them, down to the floor at their foot.
		if (flight.under)
			for (let x = from; x < to; x += COLUMN) {
				const y = stepAt(x) + PATH_FRONT
				rect(x, y, COLUMN, bottom - 4 - y, flight.under)
			}
		for (let x = from; x < to; x += COLUMN) {
			const g = stepAt(x)
			const nose = g + PATH_FRONT
			// Behind them, the wall, over the back of the path.
			if (flight.behind) rect(x, g - PATH_BACK, COLUMN, back, flight.behind)
			// The tread.
			const treadTop = g - PATH_BACK + (flight.behind ? back : 0)
			rect(x, treadTop, COLUMN, nose - treadTop, look.tread)
			rect(x, treadTop, COLUMN, 2, look.treadLit)
			// The runner, up the middle of it.
			if (look.runner && look.runnerLit && look.runnerShade) {
				rect(x, g - 6, COLUMN, 16, look.runner)
				rect(x, g - 6, COLUMN, 2, look.runnerLit)
				rect(x, g + 8, COLUMN, 2, look.runnerShade)
			}
			// Its nosing, along its front.
			rect(x, nose - 4, COLUMN, 4, look.nosing)
			rect(x, nose - 4, COLUMN, 1, look.nosingLit)
			// The stringer, under it, straight along its underside.
			const under = Math.min(
				Math.round((line(x) + PATH_FRONT + STRINGER_DEEP) / 2) * 2,
				bottom - 4,
			)
			if (under > nose) {
				rect(x, nose, COLUMN, under - nose, look.stringer)
				rect(x, under - 2, COLUMN, 2, look.stringerShade)
			}
		}
		// Each step's riser, in shadow, where the next one up starts; and the
		// stringer lit along the top, step by step.
		for (let x = from + COLUMN; x < to; x += COLUMN) {
			const was = stepAt(x - COLUMN)
			const now = stepAt(x)
			if (now === was) continue
			const lower = Math.max(was, now)
			const edge = now < was ? x - COLUMN : x
			rect(
				edge,
				lower - PATH_BACK + back,
				COLUMN,
				PATH_BACK + PATH_FRONT - back,
				look.treadShade,
			)
		}
		for (let x = from; x < to; x += COLUMN)
			rect(x, stepAt(x) + PATH_FRONT, COLUMN, 2, look.stringerLit)
		// The rail along its near side: a baluster on every step, the rail
		// over them, straight up the flight; and a newel post at either end.
		const rail = (x: number) =>
			Math.round((line(x) + PATH_FRONT - RAIL_UP) / 2) * 2
		let last = Number.NEGATIVE_INFINITY
		for (let x = from + 8; x < to - 8; x += COLUMN) {
			const g = stepAt(x)
			if (stepAt(x - COLUMN) === g || x - last < 14) continue
			last = x
			const middle = x + 8
			const y = rail(middle)
			rect(middle, y, 2, g + PATH_FRONT - 4 - y, look.baluster)
			rect(middle + 1, y, 1, g + PATH_FRONT - 4 - y, look.balusterShade)
		}
		for (let x = from; x < to; x += COLUMN) {
			rect(x, rail(x) - 4, COLUMN, 4, look.rail)
			rect(x, rail(x) - 4, COLUMN, 1, look.railLit)
		}
		for (const [x, g] of [
			[from, startY],
			[to - 8, endY],
		]) {
			const y = rail(x) - 10
			const floorAt = Math.round(g / 2) * 2 + PATH_FRONT
			rect(x, y, 8, floorAt - y, look.newel)
			rect(x, y, 2, floorAt - y, look.newelCap)
			rect(x - 2, y - 4, 12, 4, look.newelCap)
		}
	}

	return createController({
		init: () => ({
			id: `stairs-${i}`,
			type: 'stairs',
			x: () => left,
			y: () => top,
			width: () => width,
			height: () => height,
		}),
		draw: ({ ctx }) => {
			ctx.imageSmoothingEnabled = false
			const art = cachedArt(
				`stairs-${world.course.id}-${i}`,
				width,
				height,
				paint,
			)
			ctx.drawImage(art, 0, 0, width, height)
		},
	})
}
