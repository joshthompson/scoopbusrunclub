/**
 * Generate the zombie run sheets used by the header in Halloween mode: a
 * `zombie.png` next to each runner's `run.png`, with the swinging arms taken
 * out and a pair of stiff arms reaching straight forward put in their place.
 * The header tints them green itself, so the colours here are the runner's own.
 *
 * Every runner's sprite is drawn on the same template, so one recipe does
 * them all. For each frame:
 *
 * 1. Find the torso: the widest block of columns that's solid all the way down
 *    from just under the shoulders to the waist. The arms swing either side of
 *    it in thin diagonal strokes, and only ever cross it for a row or two.
 * 2. Clear everything arm-coloured outside the torso between the shoulders and
 *    the waist — skin, sleeve and shirt colours only, so the long hair hanging
 *    down someone's back stays put.
 * 3. Paint over any skin or sleeve that was crossing in front of the torso,
 *    with whatever that row of the shirt is (a striped shirt changes by row).
 * 4. Draw both arms straight out in front at shoulder height, the far one a
 *    row lower, a pixel shorter and a shade darker, with the hands drooping.
 *    Sleeves are as long as the runner's own were.
 *
 * The generic runner template (`custom/run.png`) is drawn in placeholder
 * colours that `createRunnerFrames` swaps for each avatar's kit, so its arms
 * are drawn in those placeholder colours rather than shaded. Link is a dog: he
 * keeps his run and gets glowing eyes instead.
 *
 * Usage: npx tsx apps/web/scripts/gen-zombie-runners.ts
 * Output is committed art, so this isn't wired into dev/build. Running it again
 * overwrites every `zombie.png`, so hand edits to one are lost — leave that
 * runner out of `SHEETS` once you've touched it up by hand.
 */

import fs from 'node:fs'
import path from 'node:path'
import { PNG } from 'pngjs'

const RUNNERS_DIR = path.resolve(import.meta.dirname, '../src/assets/runners')

type Rgb = [number, number, number]

interface Sheet {
	folder: string
	/** Width of one frame in the sheet. */
	frameWidth: number
	/** The first and last rows of the shirt, from the shoulders to the waist. */
	top: number
	waist: number
	/** How far the arms reach out in front of the torso, hands included. */
	reach: number
	/**
	 * Where in the first frame to start looking for the leading hand, whose
	 * colour is taken as the skin. Only August needs it: his pram is further
	 * forward than his hands are.
	 */
	handFrom?: number
	/**
	 * For the generic template: the placeholder colours to draw the arms in,
	 * instead of the runner's own shaded ones.
	 */
	template?: { upperArm: Rgb; lowerArm: Rgb; hand: Rgb }
}

const ADULT = { frameWidth: 23, top: 8, waist: 15, reach: 7 }

const SHEETS: Sheet[] = [
	...[
		'josh',
		'keith',
		'claire',
		'anna',
		'eline',
		'rick',
		'sophie',
		'alisa',
		'mikael',
		'other-josh',
	].map((folder) => ({ folder, ...ADULT })),
	{ folder: 'adam', ...ADULT, waist: 16 },
	{ folder: 'lyra', frameWidth: 23, top: 17, waist: 23, reach: 5 },
	{
		folder: 'august',
		frameWidth: 50,
		top: 8,
		waist: 16,
		reach: 7,
		handFrom: 25,
	},
	{
		folder: 'custom',
		...ADULT,
		top: 1,
		waist: 8,
		template: {
			upperArm: [0, 0, 204],
			lowerArm: [0, 0, 153],
			hand: [0, 0, 102],
		},
	},
]

/** Link's eyes, in his own sheet, and what they glow. */
const LINK_EYES: Rgb = [39, 39, 38]
const LINK_EYE_GLOW: Rgb = [255, 48, 32]

/** How much darker the far arm is drawn. */
const FAR_SHADE = 0.78

const key = ([r, g, b]: Rgb) => `${r},${g},${b}`

function read(file: string) {
	return PNG.sync.read(fs.readFileSync(file))
}

/**
 * Whether a colour looks like skin: light, and red over green over blue without
 * being so far apart it's orange (Eline's shirt). Some sheets draw the arms in
 * a different tone of skin from the face, or from one frame to the next, so
 * every tone has to be recognised, not just one.
 */
function isSkinTone([r, g, b]: Rgb) {
	return r >= 200 && r > g && g > b && g >= r * 0.6 && b >= r * 0.4
}

function makeZombie(sheet: Sheet) {
	const png = read(path.join(RUNNERS_DIR, sheet.folder, 'run.png'))
	const { width, height, data } = png

	const at = (x: number, y: number): Rgb | null => {
		if (x < 0 || y < 0 || x >= width || y >= height) return null
		const i = (y * width + x) * 4
		return data[i + 3] < 30 ? null : [data[i], data[i + 1], data[i + 2]]
	}
	const set = (x: number, y: number, rgb: Rgb | null) => {
		if (x < 0 || y < 0 || x >= width || y >= height) return
		const i = (y * width + x) * 4
		if (!rgb) {
			data[i + 3] = 0
			return
		}
		data[i] = rgb[0]
		data[i + 1] = rgb[1]
		data[i + 2] = rgb[2]
		data[i + 3] = 255
	}

	const frameCount = Math.round(width / sheet.frameWidth)
	const { top, waist, reach } = sheet
	const frames = Array.from({ length: frameCount }, (_, frame) => {
		const x0 = frame * sheet.frameWidth
		return { x0, x1: Math.min(width, x0 + sheet.frameWidth) }
	})

	// 1. Each frame's torso: the longest run of columns solid all the way down
	// its middle. A forearm crossing it still counts towards it being solid; an
	// arm hanging straight down beside it is a run of its own, and shorter.
	const solid = (x: number) => {
		let count = 0
		for (let y = top + 2; y <= waist; y++) if (at(x, y)) count++
		return count >= (waist - top - 1) * 0.75
	}
	const torsos = frames.map(({ x0, x1 }, frame) => {
		let best = { left: -1, right: -2 }
		for (let x = x0; x < x1; x++) {
			if (!solid(x)) continue
			let right = x
			while (right + 1 < x1 && solid(right + 1)) right++
			if (right - x > best.right - best.left) best = { left: x, right }
			x = right
		}
		if (best.left < 0)
			throw new Error(`${sheet.folder} frame ${frame}: no torso`)
		return best
	})

	// Where the arms can be, either side of a frame's torso: in front, from a
	// couple of rows above the shoulders (a hand swung up) to the waist; behind,
	// from the shoulders down, which keeps clear of hair hanging down a back.
	const armZone = (frame: number, visit: (x: number, y: number) => void) => {
		const { x0, x1 } = frames[frame]
		const { left, right } = torsos[frame]
		for (let y = Math.max(0, top - 2); y <= waist; y++) {
			for (let x = Math.max(x0, left - reach - 1); x < left; x++) visit(x, y)
		}
		for (let y = top; y <= waist; y++) {
			for (let x = right + 1; x < Math.min(x1, right + reach + 2); x++)
				visit(x, y)
		}
	}

	// The skin, for drawing the arms: whatever the leading hand is drawn in, in
	// the first frame — the front-most pixel from just above the shoulders to
	// halfway down. Every tone of skin in any arm, for clearing them away.
	let skin: Rgb | null = null
	findHand: for (let x = sheet.handFrom ?? 0; x < sheet.frameWidth; x++) {
		for (let y = top - 2; y <= top + 4; y++) {
			const pixel = at(x, y)
			if (pixel) {
				skin = pixel
				break findHand
			}
		}
	}
	if (!skin) throw new Error(`${sheet.folder}: no leading hand found`)
	// Never the shirt, though: whatever most of a torso is drawn in.
	const torsoMajority = new Set<string>()
	for (const { left, right } of torsos) {
		const counts = new Map<string, number>()
		for (let y = top; y <= waist; y++) {
			for (let x = left; x <= right; x++) {
				const pixel = at(x, y)
				if (pixel) counts.set(key(pixel), (counts.get(key(pixel)) ?? 0) + 1)
			}
		}
		const [most] = [...counts].sort((a, b) => b[1] - a[1])
		if (most) torsoMajority.add(most[0])
	}
	const skinKeys = new Set([key(skin)])
	for (let frame = 0; frame < frameCount; frame++) {
		armZone(frame, (x, y) => {
			const pixel = at(x, y)
			if (pixel && isSkinTone(pixel) && !torsoMajority.has(key(pixel)))
				skinKeys.add(key(pixel))
		})
	}

	// The sleeves, from the first frame's front arm: the colour of whatever of
	// it isn't skin, and how much of the arm that covers. Read once and used for
	// every frame, so the sleeves don't change length as they run.
	let sleeve: Rgb | null = null
	let sleevePixels = 0
	let armPixels = 0
	{
		const { left } = torsos[0]
		for (let y = top - 2; y <= top + 4; y++) {
			for (let x = Math.max(0, left - reach); x < left; x++) {
				const pixel = at(x, y)
				if (!pixel) continue
				armPixels++
				if (skinKeys.has(key(pixel))) continue
				sleevePixels++
				sleeve ??= pixel
			}
		}
	}
	const sleeveLength = sleeve
		? Math.round((sleevePixels / Math.max(1, armPixels)) * (reach - 1))
		: 0

	const armColour = (along: number): Rgb => {
		if (sheet.template) {
			if (along === reach - 1) return sheet.template.hand
			return along < 2 ? sheet.template.upperArm : sheet.template.lowerArm
		}
		// biome-ignore lint/style/noNonNullAssertion: found above or thrown
		if (along === reach - 1 || !sleeve) return skin!
		// biome-ignore lint/style/noNonNullAssertion: found above or thrown
		return along < sleeveLength ? sleeve : skin!
	}
	const shade = (rgb: Rgb): Rgb =>
		sheet.template
			? rgb
			: [
					Math.round(rgb[0] * FAR_SHADE),
					Math.round(rgb[1] * FAR_SHADE),
					Math.round(rgb[2] * FAR_SHADE),
				]

	for (let frame = 0; frame < frameCount; frame++) {
		const { left, right } = torsos[frame]

		// What each row of the shirt is, for painting over a forearm that was
		// crossing it. A striped shirt changes from one row to the next.
		const shirt = new Map<number, Rgb>()
		const shirtKeys = new Set<string>()
		for (let y = top; y <= waist; y++) {
			const counts = new Map<string, { rgb: Rgb; n: number }>()
			for (let x = left; x <= right; x++) {
				const pixel = at(x, y)
				if (!pixel || skinKeys.has(key(pixel))) continue
				const entry = counts.get(key(pixel)) ?? { rgb: pixel, n: 0 }
				entry.n++
				counts.set(key(pixel), entry)
			}
			const most = [...counts.values()].sort((a, b) => b.n - a.n)[0]
			const fill = most?.rgb ?? shirt.get(y - 1)
			if (fill) {
				shirt.set(y, fill)
				shirtKeys.add(key(fill))
			}
		}

		// Arm colours: skin, sleeve and shirt (an arm can be the shirt's own
		// colour), and for the template its placeholder arm colours.
		const armKeys = new Set([...skinKeys, ...shirtKeys])
		if (sleeve) armKeys.add(key(sleeve))
		if (sheet.template) {
			armKeys.add(key(sheet.template.upperArm))
			armKeys.add(key(sheet.template.lowerArm))
			armKeys.add(key(sheet.template.hand))
		}

		// 2. Clear the arms either side of the torso.
		armZone(frame, (x, y) => {
			const pixel = at(x, y)
			if (pixel && armKeys.has(key(pixel))) set(x, y, null)
		})

		// 3. Paint the shirt back over any skin or sleeve crossing the torso.
		for (let y = top; y <= waist; y++) {
			for (let x = left; x <= right; x++) {
				const pixel = at(x, y)
				if (!pixel || shirtKeys.has(key(pixel))) continue
				if (armKeys.has(key(pixel))) set(x, y, shirt.get(y) ?? null)
			}
		}

		// 4. The arms, straight out in front from the shoulder: one along a row,
		// its hand hanging limp off the end of it.
		const drawArm = (row: number, length: number, tone: (rgb: Rgb) => Rgb) => {
			for (let along = 0; along < length; along++) {
				const isHand = along === length - 1
				set(left - 1 - along, row, tone(armColour(isHand ? reach - 1 : along)))
			}
			set(left - length, row + 1, tone(armColour(reach - 1)))
		}
		// The far arm first, so the near one is drawn over it.
		drawArm(top + 3, reach - 1, shade)
		drawArm(top + 1, reach, (rgb) => rgb)
	}

	fs.writeFileSync(
		path.join(RUNNERS_DIR, sheet.folder, 'zombie.png'),
		PNG.sync.write(png),
	)
	console.log(`✓ ${sheet.folder}/zombie.png`)
}

function makeZombieLink() {
	const png = read(path.join(RUNNERS_DIR, 'link', 'run.png'))
	const { data } = png
	const isDark = (i: number) =>
		data[i + 3] >= 30 &&
		key([data[i], data[i + 1], data[i + 2]]) === key(LINK_EYES)

	// His eyes and his nose are the same dark colour; the eyes are the topmost
	// row of it, the nose a couple of rows further down.
	let eyeRow = -1
	for (let y = 0; y < png.height && eyeRow < 0; y++) {
		for (let x = 0; x < png.width; x++) {
			if (isDark((y * png.width + x) * 4)) {
				eyeRow = y
				break
			}
		}
	}
	for (let x = 0; x < png.width; x++) {
		const i = (eyeRow * png.width + x) * 4
		if (!isDark(i)) continue
		data[i] = LINK_EYE_GLOW[0]
		data[i + 1] = LINK_EYE_GLOW[1]
		data[i + 2] = LINK_EYE_GLOW[2]
	}
	fs.writeFileSync(
		path.join(RUNNERS_DIR, 'link', 'zombie.png'),
		PNG.sync.write(png),
	)
	console.log('✓ link/zombie.png')
}

for (const sheet of SHEETS) makeZombie(sheet)
makeZombieLink()
