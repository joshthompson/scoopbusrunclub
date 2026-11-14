import {
	type SpritePixelData,
	marshalPixels,
	numberCheckerPixels,
	photographerPixels,
	runDirectorPixels,
	runPixels,
	scannerPixels,
	sitPixels,
	standPixels,
	tailSitPixels,
	tailWalkPixels,
	zombiePixels,
} from '@/assets/runners/custom/pixel-data.generated'
import { generateFrames } from '@/utils'
import type { RunnerData } from '../data/runners'

type HexColor = string
type SkinColor = 'light' | 'medium-light' | 'medium' | 'medium-dark' | 'dark'

export interface CharacterSpriteProps {
	topType: 'vest' | 'tshirt' | 'longsleeve'
	bottomType: 'short-shorts' | 'shorts' | 'trousers'
	skin: SkinColor
	topColor: HexColor
	bottomColor: HexColor
	showColor: HexColor
	sockColor?: HexColor
	shoeColor: HexColor
	head: {
		hair?:
			| 'long'
			| 'medium'
			| 'medium-short'
			| 'short'
			| 'ponytail'
			| 'bun'
			| 'curly'
		hairColor?: HexColor
		accessory?: 'cap' | 'headband' | 'glasses'
		accessoryColor?: HexColor
		facialHair?: 'beard' | 'stubble' | 'long' | 'moustache'
		facialHairColor?: HexColor
		topColorForNeck?: boolean
	}
}

/**
 * Frames to a stride in the run and zombie templates, as a club member's have
 * (`RUN_FRAME_COUNT` in `data/runners`, which imports this, so it can't be
 * imported from there).
 */
const RUN_FRAME_COUNT = 6
/** Frames to a stride in the tail walker's walk (`FRAME_COUNT` in `data/runners`). */
const WALK_FRAME_COUNT = 4
const RUNNER_SIZE = 2

export function createRunnerFrames(
	character: CharacterSpriteProps,
): Pick<
	RunnerData,
	'frames' | 'width' | 'height' | 'headPoint' | 'sitHeadPoint' | 'look'
> {
	const run = generateCustomSpriteFrames(character, runPixels, RUN_FRAME_COUNT)
	const sit = generateCustomSpriteFrames(character, sitPixels, 1)
	// Its first frame: stood, arms down (the other's a phone up). The strip
	// comes back last frame first, so that's the last of them.
	const stand = generateCustomSpriteFrames(character, standPixels, 2)
	const zombie = generateCustomSpriteFrames(
		character,
		zombiePixels,
		RUN_FRAME_COUNT,
	)
	const face = generateFaceFrame(character)
	// At a volunteer post they face out of the screen, looking right, as the
	// club's own do: the head, drawn looking left, is turned round.
	const post = (pixels: SpritePixelData | null) =>
		generateCustomSpriteFrames(character, pixels, 1, { mirrorHead: true })
			?.frames
	return {
		frames: {
			run: run?.frames,
			zombie: zombie?.frames,
			sit: sit?.frames,
			stand: stand?.frames.slice(-1),
			face,
			tailWalk: generateCustomSpriteFrames(
				character,
				tailWalkPixels,
				WALK_FRAME_COUNT,
			)?.frames,
			tailSit: generateCustomSpriteFrames(character, tailSitPixels, 1)?.frames,
			scanner: post(scannerPixels),
			photographer: post(photographerPixels),
			runDirector: post(runDirectorPixels),
			marshal: post(marshalPixels),
			volunteerGeneric: undefined,
			numberChecker: post(numberCheckerPixels),
		},
		// Their box is one of their run frames, head and all.
		width: run?.width ?? 23,
		height: run?.height ?? 28,
		headPoint: run?.headPoint,
		sitHeadPoint: sit?.headPoint,
		look: character,
	}
}

function decodePixels(sprite: SpritePixelData): ImageData {
	const binary = atob(sprite.pixels)
	const bytes = new Uint8ClampedArray(binary.length)
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i)
	}
	return new ImageData(bytes, sprite.width, sprite.height)
}

function hexToRgb(hex: string): [number, number, number] {
	const r = Number.parseInt(hex.slice(1, 3), 16)
	const g = Number.parseInt(hex.slice(3, 5), 16)
	const b = Number.parseInt(hex.slice(5, 7), 16)
	return [r, g, b]
}

function colorsMatch(
	r: number,
	g: number,
	b: number,
	a: number,
	target: [number, number, number],
): boolean {
	return a === 255 && r === target[0] && g === target[1] && b === target[2]
}

function findRedPixel(
	data: ImageData,
	offsetX = 0,
	width?: number,
): { x: number; y: number } | null {
	const red: [number, number, number] = [255, 0, 0]
	const scanWidth = width ?? data.width
	for (let y = 0; y < data.height; y++) {
		for (let x = offsetX; x < offsetX + scanWidth; x++) {
			const i = (y * data.width + x) * 4
			if (
				colorsMatch(
					data.data[i],
					data.data[i + 1],
					data.data[i + 2],
					data.data[i + 3],
					red,
				)
			) {
				return { x: x - offsetX, y }
			}
		}
	}
	return null
}

// Body colors (blue channel)
const BODY_TORSO: [number, number, number] = [0x00, 0x00, 0xff] // #0000FF
const BODY_UPPER_ARM: [number, number, number] = [0x00, 0x00, 0xcc] // #0000CC
const BODY_LOWER_ARM: [number, number, number] = [0x00, 0x00, 0x99] // #000099
const BODY_HANDS: [number, number, number] = [0x00, 0x00, 0x66] // #000066

// Leg colors (green channel)
const LEG_UPPER_SHORT: [number, number, number] = [0x00, 0xff, 0x00] // #00FF00
const LEG_LOWER_SHORTS: [number, number, number] = [0x00, 0xcc, 0x00] // #00CC00
const LEG_UPPER_LOWER: [number, number, number] = [0x00, 0x99, 0x00] // #009900
const LEG_SOCK_AREA: [number, number, number] = [0x00, 0x66, 0x00] // #006600
const LEG_SHOE: [number, number, number] = [0x00, 0x33, 0x00] // #003300

// Neck point
const NECK_RED: [number, number, number] = [0xff, 0x00, 0x00] // #FF0000

/**
 * Colours that are the same on everyone, kept as they are: the volunteer
 * poses' vests and what they're holding (see `scripts/gen-volunteer-poses.ts`).
 */
const FIXED_COLORS = new Set(
	[
		'#f0e928', // hi-vis vest
		'#b6b6b6', // its reflective stripes
		'#ff791e', // the tail walker's orange vest
		'#afadb1', // its stripes, and the run director's
		'#0b51c2', // the run director's blue vest, and their clipboard
		'#e4e3e3', // paper
		'#000000', // phone, camera, the arrow on the sign
		'#424242', // camera lens
		'#fdfe64', // the marshal's sign
		'#aeaeae', // its pole
		'#242424', // the number checker's tablet
	].map((hex) => hexToRgb(hex).join()),
)

function recolorSprite(data: ImageData, character: CharacterSpriteProps): void {
	const skinCol = skinColor(character.skin)
	const topRgb = hexToRgb(character.topColor)
	const skinRgb = hexToRgb(skinCol)
	const bottomRgb = hexToRgb(character.bottomColor)
	const shoeRgb = hexToRgb(character.shoeColor)
	const sockRgb = character.sockColor ? hexToRgb(character.sockColor) : null

	for (let i = 0; i < data.data.length; i += 4) {
		const r = data.data[i]
		const g = data.data[i + 1]
		const b = data.data[i + 2]
		const a = data.data[i + 3]

		if (a === 0) continue

		let rgb: [number, number, number] | null = null

		// Body colors
		if (colorsMatch(r, g, b, a, BODY_TORSO)) {
			rgb = topRgb
		} else if (colorsMatch(r, g, b, a, BODY_UPPER_ARM)) {
			rgb = character.topType === 'vest' ? skinRgb : topRgb
		} else if (colorsMatch(r, g, b, a, BODY_LOWER_ARM)) {
			rgb =
				character.topType === 'vest' || character.topType === 'tshirt'
					? skinRgb
					: topRgb
		} else if (colorsMatch(r, g, b, a, BODY_HANDS)) {
			rgb = skinRgb
		}
		// Leg colors
		else if (colorsMatch(r, g, b, a, LEG_UPPER_SHORT)) {
			rgb = bottomRgb
		} else if (colorsMatch(r, g, b, a, LEG_LOWER_SHORTS)) {
			// Short shorts stop above it: it's thigh.
			rgb = character.bottomType === 'short-shorts' ? skinRgb : bottomRgb
		} else if (colorsMatch(r, g, b, a, LEG_UPPER_LOWER)) {
			rgb = character.bottomType === 'trousers' ? bottomRgb : skinRgb
		} else if (colorsMatch(r, g, b, a, LEG_SOCK_AREA)) {
			if (sockRgb) {
				rgb = sockRgb
			} else if (character.bottomType === 'trousers') {
				rgb = bottomRgb
			} else {
				rgb = skinRgb
			}
		} else if (colorsMatch(r, g, b, a, LEG_SHOE)) {
			rgb = shoeRgb
		}
		// Neck point — keep for alignment
		else if (colorsMatch(r, g, b, a, NECK_RED)) {
			continue
		}
		// The same on everyone
		else if (a === 255 && FIXED_COLORS.has(`${r},${g},${b}`)) {
			continue
		}
		// Unknown color — make transparent
		else {
			data.data[i + 3] = 0
			continue
		}

		if (rgb) {
			data.data[i] = rgb[0]
			data.data[i + 1] = rgb[1]
			data.data[i + 2] = rgb[2]
		}
	}
}

function parseTemplate(template: string): string[][] {
	return template
		.trim()
		.split('\n')
		.map((line) => line.trim().split(''))
}

function compositeLayer(base: string[][], overlay: string[][]): void {
	for (let y = 0; y < base.length; y++) {
		for (let x = 0; x < base[y].length; x++) {
			const char = overlay[y]?.[x]
			if (char && char !== '.') {
				base[y][x] = char
			}
		}
	}
}

function generateHeadImageData(character: CharacterSpriteProps): ImageData {
	const grid = parseTemplate(HEAD.base)

	if (character.head.hair) {
		compositeLayer(grid, parseTemplate(HEAD.hair[character.head.hair]))
	}
	if (character.head.facialHair) {
		compositeLayer(
			grid,
			parseTemplate(HEAD.facialHair[character.head.facialHair]),
		)
	}
	if (character.head.accessory) {
		compositeLayer(grid, parseTemplate(HEAD.extra[character.head.accessory]))
	}

	const height = grid.length
	const width = grid[0].length
	const data = new ImageData(width, height)

	const skinRgb = hexToRgb(skinColor(character.skin))
	const hairRgb: [number, number, number] = character.head.hairColor
		? hexToRgb(character.head.hairColor)
		: [0, 0, 0]
	const facialHairRgb: [number, number, number] = character.head.facialHairColor
		? hexToRgb(character.head.facialHairColor)
		: hairRgb
	const accessoryRgb: [number, number, number] = character.head.accessoryColor
		? hexToRgb(character.head.accessoryColor)
		: [0, 0, 0]
	const neckRgb = character.head.topColorForNeck
		? hexToRgb(character.topColor)
		: skinRgb

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const i = (y * width + x) * 4
			const char = grid[y][x]

			let rgb: [number, number, number] | null = null
			switch (char) {
				case 'F':
					rgb = skinRgb
					break
				case 'H':
					rgb = hairRgb
					break
				case 'M':
					rgb = [0, 0, 0]
					break
				case 'N':
					rgb = neckRgb
					break
				case 'A':
					rgb = accessoryRgb
					break
				case 'B':
					rgb = facialHairRgb
					break
				case 'x':
					rgb = [255, 0, 0]
					break
			}

			if (rgb) {
				data.data[i] = rgb[0]
				data.data[i + 1] = rgb[1]
				data.data[i + 2] = rgb[2]
				data.data[i + 3] = 255
			}
		}
	}

	return data
}

function generateFaceFrame(character: CharacterSpriteProps): string[] {
	const grid = parseTemplate(HEAD.base)

	if (character.head.hair) {
		compositeLayer(grid, parseTemplate(HEAD.hair[character.head.hair]))
	}
	if (character.head.facialHair) {
		compositeLayer(
			grid,
			parseTemplate(HEAD.facialHair[character.head.facialHair]),
		)
	}
	if (character.head.accessory) {
		compositeLayer(grid, parseTemplate(HEAD.extra[character.head.accessory]))
	}

	// Find the last row that isn't all neck/connection/transparent
	let lastVisibleRow = 0
	for (let y = 0; y < grid.length; y++) {
		for (let x = 0; x < grid[y].length; x++) {
			const char = grid[y][x]
			if (char !== '.' && char !== 'N' && char !== 'x') {
				lastVisibleRow = y
			}
		}
	}
	const height = lastVisibleRow + 1
	const width = grid[0].length

	const canvas = document.createElement('canvas')
	canvas.width = width
	canvas.height = height
	const ctx = canvas.getContext('2d')
	if (!ctx) throw new Error('Failed to get 2d context')

	const data = new ImageData(width, height)
	const skinRgb = hexToRgb(skinColor(character.skin))
	const hairRgb: [number, number, number] = character.head.hairColor
		? hexToRgb(character.head.hairColor)
		: [0, 0, 0]
	const facialHairRgb: [number, number, number] = character.head.facialHairColor
		? hexToRgb(character.head.facialHairColor)
		: hairRgb
	const accessoryRgb: [number, number, number] = character.head.accessoryColor
		? hexToRgb(character.head.accessoryColor)
		: [0, 0, 0]

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const i = (y * width + x) * 4
			const char = grid[y][x]

			let rgb: [number, number, number] | null = null
			switch (char) {
				case 'F':
					rgb = skinRgb
					break
				case 'H':
					rgb = hairRgb
					break
				case 'M':
					rgb = [0, 0, 0]
					break
				case 'A':
					rgb = accessoryRgb
					break
				case 'B':
					rgb = facialHairRgb
					break
			}

			if (rgb) {
				data.data[i] = rgb[0]
				data.data[i + 1] = rgb[1]
				data.data[i + 2] = rgb[2]
				data.data[i + 3] = 255
			}
		}
	}

	ctx.putImageData(data, 0, 0)
	const imageUrl = canvas.toDataURL('image/png')
	return [imageUrl]
}

interface SpriteOptions {
	/** Turn the head round to look right, for a body facing out of the screen. */
	mirrorHead?: boolean
}

/** Flip an image left to right, in place. */
function flipImageData(image: ImageData) {
	const { data, width, height } = image
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < Math.floor(width / 2); x++) {
			const a = (y * width + x) * 4
			const b = (y * width + width - 1 - x) * 4
			for (let c = 0; c < 4; c++) {
				const t = data[a + c]
				data[a + c] = data[b + c]
				data[b + c] = t
			}
		}
	}
}

/**
 * The middle of the face in `HEAD.base`, which is where anything worn on the
 * head is centred.
 */
const HEAD_FACE_CENTRE: Vector = { x: 4, y: 3 }

/**
 * A sprite from one of the custom runner templates, as `generateCustomSpriteFrames`
 * makes it, drawn on a canvas, frames side by side: for reading its pixels,
 * as the run game does to make its ski poses from a stand pose.
 */
export function drawCustomSprite(
	character: CharacterSpriteProps,
	spritePixels: SpritePixelData | null,
	frameCount: number,
	{ mirrorHead = false }: SpriteOptions = {},
) {
	if (!spritePixels) return undefined

	const spriteData = decodePixels(spritePixels)
	const headData = generateHeadImageData(character)
	if (mirrorHead) flipImageData(headData)
	const frameWidth = spriteData.width / frameCount

	// Recolor the sprite
	recolorSprite(spriteData, character)

	// Find red pixel in head for alignment
	const headRedPixel = findRedPixel(headData)
	if (!headRedPixel) {
		throw new Error(
			'head.png must contain a #FF0000 pixel as neck connection point',
		)
	}

	// Find red pixel in each frame of sprite
	const spriteRedPixels: { x: number; y: number }[] = []
	for (let frame = 0; frame < frameCount; frame++) {
		const redPixel = findRedPixel(spriteData, frame * frameWidth, frameWidth)
		spriteRedPixels.push(redPixel ?? { x: Math.floor(frameWidth / 2), y: 0 })
	}

	// Calculate head extension above sprite
	const spriteRedY = spriteRedPixels[0].y
	const headExtensionAboveSprite = Math.max(0, headRedPixel.y - spriteRedY)

	// Final dimensions
	const totalHeight = headExtensionAboveSprite + spriteData.height
	const totalWidth = spriteData.width

	// Create composite canvas
	const finalCanvas = document.createElement('canvas')
	finalCanvas.width = totalWidth
	finalCanvas.height = totalHeight
	const finalCtx = finalCanvas.getContext('2d')
	if (!finalCtx) throw new Error('Failed to get 2d context')

	const topRgb = hexToRgb(character.topColor)

	for (let frame = 0; frame < frameCount; frame++) {
		const frameX = frame * frameWidth
		const spriteRed = spriteRedPixels[frame]

		// Position head so its red pixel aligns with sprite's red pixel
		const headX = frameX + spriteRed.x - headRedPixel.x
		const headY = headExtensionAboveSprite + spriteRed.y - headRedPixel.y

		// Draw head — replace red with topColor
		const headFrameData = new ImageData(
			new Uint8ClampedArray(headData.data),
			headData.width,
			headData.height,
		)
		for (let i = 0; i < headFrameData.data.length; i += 4) {
			if (
				colorsMatch(
					headFrameData.data[i],
					headFrameData.data[i + 1],
					headFrameData.data[i + 2],
					headFrameData.data[i + 3],
					NECK_RED,
				)
			) {
				headFrameData.data[i] = topRgb[0]
				headFrameData.data[i + 1] = topRgb[1]
				headFrameData.data[i + 2] = topRgb[2]
			}
		}
		const headCanvas = document.createElement('canvas')
		headCanvas.width = headData.width
		headCanvas.height = headData.height
		const headCtx = headCanvas.getContext('2d')
		if (!headCtx) throw new Error('Failed to get 2d context')
		headCtx.putImageData(headFrameData, 0, 0)
		finalCtx.drawImage(headCanvas, headX, headY)

		// Draw sprite frame — replace red neck pixels with topColor
		const frameData = new ImageData(frameWidth, spriteData.height)
		for (let y = 0; y < spriteData.height; y++) {
			for (let x = 0; x < frameWidth; x++) {
				const srcI = (y * spriteData.width + (frameX + x)) * 4
				const dstI = (y * frameWidth + x) * 4
				frameData.data[dstI] = spriteData.data[srcI]
				frameData.data[dstI + 1] = spriteData.data[srcI + 1]
				frameData.data[dstI + 2] = spriteData.data[srcI + 2]
				frameData.data[dstI + 3] = spriteData.data[srcI + 3]
				if (
					colorsMatch(
						spriteData.data[srcI],
						spriteData.data[srcI + 1],
						spriteData.data[srcI + 2],
						spriteData.data[srcI + 3],
						NECK_RED,
					)
				) {
					frameData.data[dstI] = topRgb[0]
					frameData.data[dstI + 1] = topRgb[1]
					frameData.data[dstI + 2] = topRgb[2]
				}
			}
		}
		const frameCanvas = document.createElement('canvas')
		frameCanvas.width = frameWidth
		frameCanvas.height = spriteData.height
		const frameCtx = frameCanvas.getContext('2d')
		if (!frameCtx) throw new Error('Failed to get 2d context')
		frameCtx.putImageData(frameData, 0, 0)
		finalCtx.drawImage(frameCanvas, frameX, headExtensionAboveSprite)
	}

	return {
		canvas: finalCanvas,
		totalWidth,
		totalHeight,
		spriteRedPixels,
		headRedPixel,
		headExtensionAboveSprite,
	}
}

/**
 * A sprite from one of the custom runner templates (`spritePixels`, of
 * `frameCount` frames side by side), in `character`'s colours, with their
 * head on: what the run game's tourists are made from, too.
 */
export function generateCustomSpriteFrames(
	character: CharacterSpriteProps,
	spritePixels: SpritePixelData | null,
	frameCount: number,
	options?: SpriteOptions,
):
	| { frames: string[]; width: number; height: number; headPoint: Vector }
	| undefined {
	const drawn = drawCustomSprite(character, spritePixels, frameCount, options)
	if (!drawn) return undefined
	const {
		canvas: finalCanvas,
		totalWidth,
		totalHeight,
		spriteRedPixels,
		headRedPixel,
		headExtensionAboveSprite,
	} = drawn

	// toDataURL is synchronous
	const imageUrl = finalCanvas.toDataURL('image/png')
	const spriteWidth = totalWidth / frameCount

	return {
		// A single frame is just the image, the same as a club runner's sit
		// sprite, so it's drawn at its own size rather than as a strip of one.
		frames:
			frameCount === 1
				? [imageUrl]
				: generateFrames(
						imageUrl,
						spriteWidth * frameCount,
						totalHeight,
						spriteWidth * RUNNER_SIZE,
						frameCount,
						true,
					),
		width: spriteWidth,
		height: totalHeight,
		// Where the head went in the first frame. The body templates keep the
		// neck in the same place from frame to frame, so it holds for all of them.
		headPoint: {
			x: spriteRedPixels[0].x - headRedPixel.x + HEAD_FACE_CENTRE.x,
			y:
				headExtensionAboveSprite +
				spriteRedPixels[0].y -
				headRedPixel.y +
				HEAD_FACE_CENTRE.y,
		},
	}
}

function skinColor(skin: SkinColor): HexColor {
	switch (skin) {
		case 'light':
			return '#F2C09A'
		// Halfway between light and medium.
		case 'medium-light':
			return '#C49971'
		case 'medium':
			return '#957147'
		// Halfway between medium and dark.
		case 'medium-dark':
			return '#825B37'
		case 'dark':
			return '#6E4426'
	}
}

/** Key
 * F - Face
 * H - Hair
 * M - Mouth
 * N - Neck
 * A - ACCESSORY (e.g. hat)
 * B - Beard
 * x - Neck connection point
 */

const HEAD = {
	base: `
    ...FF....
    ..FFFF...
    ..FFFF...
    ..FFFF...
    ..FMFF...
    ...FF....
    ...NN....
    ...x.....
  `,
	hair: {
		long: `
      ...HH....
      ..HHHH.H.
      .....HHH.
      ......HHH
      .......HH
      ........H
      ........H
      .........
    `,
		medium: `
      ...HHH...
      ..HHHHH..
      .....HH..
      .....HH..
      .....HHH.
      ......H..
      .........
      .........
    `,
		'medium-short': `
      ...HHH...
      ..HHHHH..
      .....HH..
      .....HH..
      .........
      .........
      .........
      .........
    `,
		short: `
      ...HH....
      ..HHHH...
      .....H...
      .........
      .........
      .........
      .........
      .........
    `,
		ponytail: `
      ...HHH...
      ..HHHHHH.
      .....H.HH
      .......HH
      ........H
      .........
      .........
      .........
    `,
		bun: `
      ...HH.HH.
      ..HHHHHH.
      .....H...
      .........
      .........
      .........
      .........
      .........
    `,
		curly: `
      ..HHHHH..
      .HHHHHHH.
      .....HHH.
      .....HHH.
      .....HH..
      .........
      .........
      .........
    `,
	},
	facialHair: {
		stubble: `
      .........
      .........
      .........
      .....B...
      ..B.BB...
      ...BB....
      .........
      .........
    `,
		moustache: `
      .........
      .........
      .........
      ..BBB....
      .........
      .........
      .........
      .........
    `,
		beard: `
      .........
      .........
      .....B...
      ..BBBB...
      ..B.BB...
      ...BB....
      .........
      .........
    `,
		long: `
      .........
      .........
      .....B...
      .....B...
      ..B.BB...
      ..BBB....
      ..BBB....
      .........
    `,
	},
	extra: {
		cap: `
      ...AA....
      AAAAAA...
      .........
      .........
      .........
      .........
      .........
      .........
    `,
		headband: `
      .........
      ..AAA....
      ....AAA..
      .........
      .........
      .........
      .........
      .........
    `,
		glasses: `
      .........
      .........
      ..AAA....
      .........
      .........
      .........
      .........
      .........
    `,
	},
}
