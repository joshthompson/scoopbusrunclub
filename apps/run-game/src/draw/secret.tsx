import { createController, createObjectSignal } from 'scoopjs'
import { seeded } from '../courses/kit/seeded'
import { secretRoof } from '../game/secret'
import type { World } from '../game/world'
import { rectFiller } from './paint/snappedRect'

/**
 * A Secret (see `Secret`), drawn: the shaft down from its Gap, and the
 * cavern under the course, hollowed out of the mountain, in front of its
 * rock and behind everyone in it. And what's in it: on Everest, the Yetis'
 * den, their sofas, tellies and lamps, and the Yeti at its far end, waiting
 * to throw you back up out of it.
 */

/** Ice: the den's walls, lit, in shadow, and its seams. */
const ICE = '#3d6699'
const ICE_DARK = '#2b4c7a'
const ICE_LIT = '#5f86b8'
const SEAM = '#24406a'
const ICICLE = '#cfe4f7'
const ICICLE_SHADE = '#9cbde0'
/** Its floor: packed snow. */
const SNOW = '#e8f0f8'
const SNOW_SHADE = '#c5d6ea'
/**
 * The shaft down to it, as dark as any crevasse is at the bottom, so it
 * looks no different from the path; warmer in steps the nearer the den's
 * light.
 */
const SHAFT = '#090f1b'
const SHAFT_WARM = ['#0f1626', '#161f33', '#1f2a42']
/** The mountain's face under the den's floor, as deep down it as that: over the crevasse's pit, which goes on down. */
const FACE = '#c7cdd6'
/** Rugs, on the floor in front of the sofas. */
const RUGS = [
	['#c2453a', '#e07a4a'],
	['#3f7f6a', '#e8c25a'],
]
/** Fairy lights, strung along under the roof. */
const BULBS = ['#ffd76a', '#ff8a7a', '#9ad7ff', '#b6f08a']

/** A part of its drawing, from its top left: a block of colour, or a light's glow. */
type Part =
	| { x: number; y: number; width: number; height: number; fill: string }
	| { glow: [number, number]; reach: number; colour: string }

/** How far down under its floor it's drawn: off the bottom of the screen, looking at the den. */
const DEEP = 400

/** How far back from the path, up the floor, its things stand: against the back wall. */
const SET_BACK = 6

export function createSecret(world: World) {
	const secret = world.course.secret
	const art = world.course.look?.secret
	if (!secret || !art) return []
	const { furnishings } = art
	const { groundY } = world.terrain
	const { gap } = secret
	const random = seeded(2911)
	const roof = secretRoof(world)
	const floor = secret.floor
	const left = secret.from - 20
	const right = secret.to + 20
	const top = Math.round(groundY(gap.from)) + 100
	const bottom = floor + DEEP
	const at = (x: number) => Math.round(x - left)
	const y = (value: number) => Math.round(value - top)

	const parts: Part[] = []
	const rect = (x: number, yy: number, w: number, h: number, fill: string) =>
		parts.push({
			x: at(x),
			y: y(yy),
			width: Math.round(w),
			height: Math.round(h),
			fill,
		})

	// The shaft: on down from the crevasse, dark, its sides ragged ice,
	// warmer at the bottom, where the den's light comes up it.
	for (let yy = top; yy < roof + 4; yy += 4) {
		const warmth = Math.floor((yy - (roof - 90)) / 30)
		rect(
			gap.from + 2,
			yy,
			gap.to - gap.from - 4,
			4,
			warmth < 0 ? SHAFT : SHAFT_WARM[Math.min(2, warmth)],
		)
		const inLeft = 2 + Math.round(random() * 2) * 2
		const inRight = 2 + Math.round(random() * 2) * 2
		rect(gap.from, yy, inLeft, 4, ICE_DARK)
		rect(gap.to - inRight, yy, inRight, 4, ICE_DARK)
	}

	// The den: hollowed out of the ice, its roof ragged, its ends rounded
	// off, seams across its back wall, and icicles hanging from its roof.
	const end = 60
	for (let x = secret.from; x < secret.to; x += 4) {
		const fromEnd = Math.min(x - secret.from, secret.to - x)
		const round = fromEnd < end ? ((end - fromEnd) / end) ** 2 * 90 : 0
		const under = gap.from < x + 4 && x < gap.to
		const ragged = Math.round(random() * 3) * 2
		const ceiling = under ? roof : roof + ragged + round
		rect(x, ceiling, 4, floor - ceiling, ICE)
		if (!under) rect(x, ceiling, 4, 2, ICE_DARK)
		// Lit low down, off the lamps and the snow.
		rect(x, floor - 26, 4, 26, ICE_LIT)
	}
	for (let i = 0; i < (secret.to - secret.from) / 70; i++) {
		const x = secret.from + 40 + random() * (secret.to - secret.from - 80)
		const yy = roof + 30 + random() * (secret.room - 90)
		rect(x, yy, 10 + Math.round(random() * 4) * 4, 2, SEAM)
	}
	for (let x = secret.from + 30; x < secret.to - 30; x += 18 + random() * 40) {
		if (x > gap.from - 10 && x < gap.to + 10) continue
		const long = 4 + Math.round(random() * 4) * 2
		const ceiling = roof + 4
		rect(x, ceiling, 4, long, ICICLE)
		rect(x + 2, ceiling, 2, long, ICICLE_SHADE)
		rect(x + 1, ceiling + long, 2, 2, ICICLE)
	}
	// Fairy lights, swagged along under the roof between the icicles.
	for (let x = secret.from + 50; x < secret.to - 50; x += 12) {
		if (x > gap.from - 20 && x < gap.to + 20) continue
		const swag =
			Math.round(Math.sin(((x - secret.from) / 96) * Math.PI) ** 2 * 5) * 2
		const yy = roof + 14 + swag
		rect(x, yy, 4, 2, '#2b2b2b')
		if ((x - secret.from) % 24 === 2) {
			const bulb = BULBS[Math.floor((x - secret.from) / 24) % BULBS.length]
			rect(x, yy + 2, 4, 4, bulb)
			parts.push({ glow: [at(x + 2), y(yy + 4)], reach: 10, colour: bulb })
		}
	}

	// Under the shaft, the floor's the mountain again, all the way down,
	// not the crevasse's pit going on under it.
	rect(gap.from - 4, floor, gap.to - gap.from + 8, DEEP, FACE)
	// Its floor: packed snow, a rug in front of each sofa.
	rect(secret.from, floor, secret.to - secret.from, 2, SNOW)
	rect(secret.from, floor + 2, secret.to - secret.from, 10, SNOW_SHADE)
	let rug = 0
	for (const thing of furnishings) {
		if (thing.kind !== 'sofa') continue
		const [base, stripe] = RUGS[rug++ % RUGS.length]
		const w = art.sofas[thing.which ?? 0].width + 40
		rect(thing.x - w / 2, floor + 2, w, 6, base)
		rect(thing.x - w / 2 + 4, floor + 4, w - 8, 2, stripe)
	}
	// The lamps' warm light, and the tellies' blue.
	for (const thing of furnishings) {
		if (thing.kind === 'lamp')
			parts.push({
				glow: [at(thing.x), y(floor - art.lamp.height + 8)],
				reach: 60,
				colour: '#ffd76a',
			})
		if (thing.kind === 'telly')
			parts.push({
				glow: [at(thing.x + 6), y(floor - art.telly.height + 12)],
				reach: 46,
				colour: '#9ad7ff',
			})
	}

	const hollow = createController({
		init: () => ({
			id: 'secret',
			type: 'secret',
			x: () => left,
			y: () => top,
			width: () => right - left,
			height: () => bottom - top,
		}),
		draw: ({ ctx, $scene }) => {
			const view = $scene.canvas.get()
			paint(ctx, parts, view.x() - left, view.x() - left + view.width())
		},
	})

	const standing = (
		id: string,
		x: number,
		width: number,
		height: number,
		frames: string[],
	) =>
		createController({
			frames,
			init: () => ({
				id,
				type: 'secret-prop',
				x: () => Math.round(x - width / 2),
				y: () => floor - SET_BACK - height,
				width: () => width,
				height: () => height,
				// A telly's screen flickering; anything else, as it is.
				...createObjectSignal(
					(frames.length > 1 ? 'play' : 'pause') as 'play' | 'pause',
					'state',
				),
				...createObjectSignal(180, 'frameInterval'),
			}),
		})

	const things = furnishings.map((thing, i) => {
		if (thing.kind === 'sofa') {
			const sofa = art.sofas[thing.which ?? 0]
			return standing(`secret-sofa-${i}`, thing.x, sofa.width, sofa.height, [
				sofa.asset,
			])
		}
		if (thing.kind === 'telly')
			return standing(
				`secret-telly-${i}`,
				thing.x,
				art.telly.width,
				art.telly.height,
				art.telly.frames,
			)
		return standing(
			`secret-lamp-${i}`,
			thing.x,
			art.lamp.width,
			art.lamp.height,
			[art.lamp.asset],
		)
	})

	// The Yeti, at its far end: down on one knee, his hands cupped low for
	// you to run into, right where you're thrown from; and up on his feet,
	// arms up, while whoever he's thrown is on their way up out of it.
	const { launcher } = art
	const launcherX = secret.launch - launcher.hands.x
	const flying = () =>
		world.racers.some(
			(r) =>
				r.body.x > secret.launch - 30 &&
				r.body.x < secret.land + 200 &&
				r.body.feetY < floor - 40 &&
				r.body.feetY > groundY(r.body.x) - 900,
		)
	const yeti = createController({
		frames: [launcher.kneel, launcher.thrown],
		init: () => ({
			id: 'secret-yeti',
			type: 'secret-prop',
			x: () => launcherX,
			...createObjectSignal(floor - launcher.kneelHeight, 'y'),
			width: () => launcher.width,
			...createObjectSignal(launcher.kneelHeight, 'height'),
			...createObjectSignal(0, 'frame'),
			...createObjectSignal('pause' as 'play' | 'pause', 'state'),
		}),
		onEnterFrame({ $ }) {
			const up = flying()
			const height = up ? launcher.thrownHeight : launcher.kneelHeight
			$.setFrame(up ? 1 : 0)
			$.setHeight(height)
			$.setY(floor - height)
		},
	})

	return [hollow, ...things, yeti]
}

/** The Secret, painted from `left` to `right` along it. */
function paint(
	ctx: CanvasRenderingContext2D,
	parts: Part[],
	left: number,
	right: number,
) {
	const fillRect = rectFiller(ctx)
	for (const part of parts) {
		if ('fill' in part) {
			if (part.x > right || part.x + part.width < left) continue
			ctx.fillStyle = part.fill
			fillRect(part.x, part.y, part.width, part.height)
			continue
		}
		const [cx, cy] = part.glow
		if (cx - part.reach > right || cx + part.reach < left) continue
		const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, part.reach)
		glow.addColorStop(0, `${part.colour}66`)
		glow.addColorStop(1, `${part.colour}00`)
		ctx.fillStyle = glow
		ctx.beginPath()
		ctx.arc(cx, cy, part.reach, 0, Math.PI * 2)
		ctx.fill()
	}
}
