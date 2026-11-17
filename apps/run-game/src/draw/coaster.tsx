import { createController } from 'scoopjs'
import { inAir, trackAt, trackLength } from '../game/coaster'
import type { World } from '../game/world'
import { cachedArt } from './canvasArt'

/**
 * A Secret's mine cart ride, drawn (see `Coaster`): its rail, along the
 * track and round its loop, on sleepers, and the timber trestles under it,
 * down to the mine's floor; nothing where it jumps; and its buffers at its
 * end. Its carts are the mine's (`createMineCarts`), turned with it.
 */

const STEEL = '#9aa0a8'
const STEEL_LIT = '#c3c8ce'
const STEEL_DARK = '#5d636b'
const SLEEPER = '#5b3b22'
const TIMBER = '#8a5a32'
const TIMBER_DARK = '#5e3a1e'
const TIMBER_LIT = '#a8743f'
const BUFFER = '#c2372d'
const BUFFER_STRIPE = '#f2ede4'

/** How far apart it's drawn along, its sleepers, and its trestles. */
const STEP = 2
const SLEEPERS = 12
const TRESTLES = 36
/** How thick its rail is, and how far its sleepers go on under it. */
const RAIL = 4
const SLEEPER_DEEP = 6
/** Steeper than this, a trestle doesn't hold it up: up its loop, it holds itself. */
const STEEPEST = 40

type Part = [x: number, y: number, w: number, h: number, fill: string]

export function createCoaster(world: World) {
	const secret = world.course.secret
	const coaster = secret?.coaster
	if (!secret || !coaster) return []
	const length = trackLength(coaster)
	const { floor } = secret
	const xs = coaster.track.map(([x]) => x)
	const ys = coaster.track.map(([, y]) => y)
	const left = Math.floor(Math.min(...xs)) - 20
	const right = Math.ceil(Math.max(...xs)) + 40
	const top = Math.floor(Math.min(...ys)) - 20
	const bottom = floor + 4

	const parts: Part[] = []
	/** A cell, snapped to the grid, from the top left of the drawing. */
	const cell = (x: number, y: number, w: number, h: number, fill: string) =>
		parts.push([
			Math.round((x - left) / 2) * 2,
			Math.round((y - top) / 2) * 2,
			w,
			h,
			fill,
		])
	const trestles: Part[] = []
	const sleepers: Part[] = []
	const rails: Part[] = []
	let lastTrestle = Number.NEGATIVE_INFINITY
	for (let s = 0; s <= length; s += STEP) {
		if (inAir(coaster, s)) continue
		const { x, y, heading } = trackAt(coaster, s)
		const turned = (heading * Math.PI) / 180
		// Away from the seat: under the rail, on its outside round the loop.
		const out = { x: -Math.sin(turned), y: Math.cos(turned) }
		const along = { x: Math.cos(turned), y: Math.sin(turned) }
		// The rail, lit along its top (or its inside, round the loop).
		for (let k = 0; k < RAIL; k++)
			cell(
				x + out.x * k,
				y + out.y * k,
				2,
				2,
				k === 0 ? STEEL_LIT : k === RAIL - 1 ? STEEL_DARK : STEEL,
			)
		// A sleeper under it every so often.
		if (Math.round(s) % SLEEPERS < STEP)
			for (let k = RAIL; k < RAIL + SLEEPER_DEEP; k++)
				for (const d of [-2, 0, 2])
					cell(
						x + out.x * k + along.x * d,
						y + out.y * k + along.y * d,
						2,
						2,
						SLEEPER,
					)
		// A trestle under it, where it's level enough and up off the floor.
		const level = Math.abs(heading) < STEEPEST
		const high = floor - y > RAIL + SLEEPER_DEEP + 4
		if (level && high && x - lastTrestle >= TRESTLES) {
			lastTrestle = x
			const from = y + RAIL + SLEEPER_DEEP
			trestles.push([
				Math.round((x - 3 - left) / 2) * 2,
				Math.round((from - top) / 2) * 2,
				6,
				Math.round((floor - from) / 2) * 2,
				TIMBER,
			])
			trestles.push([
				Math.round((x - 3 - left) / 2) * 2,
				Math.round((from - top) / 2) * 2,
				2,
				Math.round((floor - from) / 2) * 2,
				TIMBER_LIT,
			])
			trestles.push([
				Math.round((x + 1 - left) / 2) * 2,
				Math.round((from - top) / 2) * 2,
				2,
				Math.round((floor - from) / 2) * 2,
				TIMBER_DARK,
			])
		}
	}
	// Its rail and sleepers, so far, all in the one list: in front of the trestles.
	sleepers.push(...parts.splice(0))
	// Its buffers, at its end: a timber block, a red and white board on it.
	const [endX] = coaster.track[coaster.track.length - 1]
	cell(endX + 4, floor - 18, 10, 18, TIMBER)
	cell(endX + 4, floor - 18, 10, 2, TIMBER_LIT)
	cell(endX + 2, floor - 16, 4, 10, BUFFER)
	cell(endX + 2, floor - 12, 4, 2, BUFFER_STRIPE)
	rails.push(...parts.splice(0))
	const drawn = [...trestles, ...sleepers, ...rails]

	return [
		createController({
			init: () => ({
				id: 'coaster',
				type: 'mine',
				x: () => left,
				y: () => top,
				width: () => right - left,
				height: () => bottom - top,
			}),
			// Thousands of little blocks, the same every time: painted once,
			// and drawn from there.
			draw: ({ ctx }) => {
				const width = right - left
				const height = bottom - top
				const art = cachedArt(
					`coaster-${world.course.id}`,
					width,
					height,
					(paint) => {
						for (const [x, y, w, h, colour] of drawn) {
							paint.fillStyle = colour
							paint.fillRect(x, y, w, h)
						}
					},
				)
				ctx.imageSmoothingEnabled = false
				ctx.drawImage(art, 0, 0, width, height)
			},
		}),
	]
}
