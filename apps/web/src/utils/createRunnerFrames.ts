import { generateFrames } from '@/utils'
import type { RunnerData } from '../data/runners'
import {
	type SpritePixelData,
	runPixels,
	sitPixels,
} from '@/assets/runners/custom/pixel-data.generated'

type HexColor = string
type SkinColor = 'light' | 'medium' | 'dark'

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
		hair?: 'long' | 'medium' | 'short'
		hairColor?: HexColor
		accessory?: 'cap' | 'headband' | 'glasses'
		accessoryColor?: HexColor
		facialHair?: 'beard' | 'stubble' | 'long'
		facialHairColor?: HexColor
		topColorForNeck?: boolean
	}
}

const FRAME_COUNT = 4
const RUNNER_SIZE = 2

export function createRunnerFrames(
	character: CharacterSpriteProps,
): Pick<RunnerData, 'frames' | 'width' | 'height'> {
	const run = generateCustomSpriteFrames(character, runPixels, FRAME_COUNT)
	const sit = generateCustomSpriteFrames(character, sitPixels, 1)
	const face = generateFaceFrame(character)
	return {
		frames: {
			run,
			sit,
			face,
			tailWalk: undefined,
			tailSit: undefined,
			scanner: undefined,
			photographer: undefined,
			runDirector: undefined,
			marshal: undefined,
			volunteerGeneric: undefined,
		},
		width: 21,
		height: 28,
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
			rgb = bottomRgb
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

function generateCustomSpriteFrames(
	character: CharacterSpriteProps,
	spritePixels: SpritePixelData | null,
	frameCount: number,
): string[] | undefined {
	if (!spritePixels) return undefined

	const spriteData = decodePixels(spritePixels)
	const headData = generateHeadImageData(character)
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

	// toDataURL is synchronous
	const imageUrl = finalCanvas.toDataURL('image/png')
	const spriteWidth = totalWidth / frameCount

	return generateFrames(
		imageUrl,
		spriteWidth * frameCount,
		totalHeight,
		spriteWidth * RUNNER_SIZE,
		frameCount,
		true,
	)
}

function skinColor(skin: SkinColor): HexColor {
	switch (skin) {
		case 'light':
			return '#F2C09A'
		case 'medium':
			return '#957147'
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
    .........
    ...FF....
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
      .........
      ..AAA....
      ....AAA..
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
