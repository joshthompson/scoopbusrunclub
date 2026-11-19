import { type RunnerName, runners } from '@/data/runners'
import { createSignal } from 'solid-js'
import { BONUS_RUNNERS, BUSHY, MS_CROCODILE } from './bonus'
import type { Avatar } from './looks'
import { MEMBERS, type Playable, lookSprite } from './playable'

/**
 * Everyone in a race's own T-shirt, as at Midnattsloppet, where everyone
 * runs in the same one (see `Course['raceShirt']`).
 *
 * Anyone made from a look is drawn again in it (`inShirt`). The members
 * drawn by hand have their own T-shirt's colours swapped for it as they're
 * drawn: every picture they race in (their run, their duck, stood, on skis
 * or a board, and their dance) made again once, before the race, in its
 * colour, and shown instead through the Scene's `resolveAsset` (see
 * `dressedIn` and `inRaceShirt`), as are Ms Crocodile's and Bushy's. Who
 * isn't wearing a T-shirt (Link, a dog; the other bonus runners, in their
 * costumes) runs as they are.
 */

/** Someone's own T-shirt, as it's drawn. */
interface Shirt {
	/**
	 * Its colour, swapped for the race's: or, for a gradient (Other Josh's),
	 * every colour in it, top to bottom, all swapped for the race's, so it's
	 * one colour, as everyone else's is.
	 */
	colour: string | string[]
	/**
	 * Its colour shaded, lighter or darker (a sleeve, or a dancing arm):
	 * each swapped for the race's colour shaded as much, by how much lighter
	 * or darker it is than the first of `colour`.
	 */
	shades?: string[]
	/**
	 * Patches of its colours smaller than this, in pixels, are left as they
	 * are: something else drawn in the same colour. August's shoes are his
	 * T-shirt's navy, and Claire's headband her T-shirt's purple.
	 */
	least?: number
}

/**
 * The bonus runners in a T-shirt, by their runner id, and its colours.
 * The rest are in costume.
 */
const BONUS_SHIRTS: Partial<Record<string, Shirt>> = {
	// Her bandana's knot and her shoes' stripes are her T-shirt's orange, and stay.
	[MS_CROCODILE.id]: { colour: '#ff8a1e', least: 12 },
	// His parkrun T-shirt, its tree on his chest. His flag's apricot is its own, and stays.
	[BUSHY.id]: {
		colour: '#ffa52e',
		shades: ['#ffc45e', '#e2831a', '#b9620f'],
	},
}

/** Every member drawn by hand in a T-shirt, and its colours, from their pictures. */
const SHIRTS: Partial<Record<RunnerName, Shirt>> = {
	adam: { colour: '#e4e3e2', shades: ['#b6b6b5', '#ffffff'] },
	alisa: {
		colour: '#d3b0df',
		shades: ['#ba97c6', '#9e84a7', '#a98db2', '#f3caff'],
	},
	anna: {
		colour: '#1b5f56',
		shades: ['#134c45', '#144741', '#164c45', '#1f6d63'],
	},
	august: { colour: '#27336a', least: 12 },
	// Her headband's her T-shirt's purple, and stays.
	claire: {
		colour: '#9a54bf',
		shades: ['#70368f', '#7b4399', '#743f8f', '#b161dc'],
		least: 12,
	},
	eline: { colour: '#e16c04', shades: ['#b75d0c', '#b45603', '#ff7c05'] },
	josh: { colour: '#e0382f', shades: ['#b32d26', '#ff4036'] },
	keith: { colour: '#414443', shades: ['#313332', '#343636', '#4b4e4d'] },
	// A onesie.
	lyra: { colour: '#a377bc' },
	mikael: { colour: '#17296c', shades: ['#122156', '#1a2f7c'] },
	otherJosh: {
		colour: [
			'#985aac',
			'#9156a4',
			'#89519c',
			'#814b93',
			'#78448a',
			'#6e3e7f',
			'#643774',
		],
		shades: ['#7a488a', '#af67c6'],
	},
	rick: { colour: '#5a40a6', shades: ['#483385', '#674abf'] },
	// The pale mark on its chest too.
	sophie: {
		colour: ['#00aa47', '#cbdfd3'],
		shades: ['#008839', '#00943e', '#00c352'],
	},
}

/** `look`, in a race's T-shirt, `colour`. */
export const inShirt = (look: Avatar, colour: string): Avatar => ({
	...look,
	topType: 'tshirt',
	topColor: colour,
})

/**
 * The look `runner`'s made from, if they are (a member's own, if they're
 * one), in a race's T-shirt, `colour`.
 */
export function shirtLook(
	runner: Pick<Playable, 'look' | 'member'>,
	colour: string,
): Avatar | undefined {
	const look =
		runner.look ?? (runner.member && runners[runner.member][0]().look)
	return look ? inShirt(look, colour) : undefined
}

/**
 * `runner`, dressed for a race in its T-shirt, `colour`, if it has one:
 * drawn again from their look, if they're made from one. A member drawn by
 * hand is as they are, recoloured as they're drawn (see `inRaceShirt`).
 * Their own `look` stays theirs: their head, as a score's icon.
 */
export function dressed(runner: Playable, colour: string | undefined) {
	const look = colour && shirtLook(runner, colour)
	return look ? { ...runner, sprite: lookSprite(look) } : runner
}

type Rgb = [number, number, number]

const rgb = (hex: string): Rgb => {
	const n = Number.parseInt(hex.slice(1), 16)
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const brightness = ([r, g, b]: Rgb) => 0.299 * r + 0.587 * g + 0.114 * b
const key = ([r, g, b]: Rgb) => (r << 16) | (g << 8) | b

/** What each of `shirt`'s colours is swapped for, in the race's `colour`. */
function swapsFor(shirt: Shirt, colour: string) {
	const race = rgb(colour)
	const own = [shirt.colour].flat().map(rgb)
	const swaps = new Map<number, Rgb>(own.map((c) => [key(c), race]))
	const base = brightness(own[0])
	for (const shade of shirt.shades ?? []) {
		const c = rgb(shade)
		const by = brightness(c) / base
		swaps.set(
			key(c),
			race.map((channel) => Math.min(255, Math.round(channel * by))) as Rgb,
		)
	}
	return swaps
}

/**
 * Swaps `swaps`' colours in `pixels`, in place, but for patches of them,
 * touching (corners too), smaller than `least`.
 */
function swapColours(pixels: ImageData, swaps: Map<number, Rgb>, least = 0) {
	const { data, width, height } = pixels
	const at = (i: number) =>
		data[i * 4 + 3] === 255
			? swaps.get(key([data[i * 4], data[i * 4 + 1], data[i * 4 + 2]]))
			: undefined
	const seen = new Uint8Array(width * height)
	for (let start = 0; start < width * height; start++) {
		if (seen[start] || !at(start)) continue
		// The patch it's in.
		const patch = [start]
		seen[start] = 1
		for (let k = 0; k < patch.length; k++) {
			const x = patch[k] % width
			const y = Math.floor(patch[k] / width)
			for (let dy = -1; dy <= 1; dy++)
				for (let dx = -1; dx <= 1; dx++) {
					const nx = x + dx
					const ny = y + dy
					if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
					const n = ny * width + nx
					if (seen[n] || !at(n)) continue
					seen[n] = 1
					patch.push(n)
				}
		}
		if (patch.length < least) continue
		for (const i of patch) {
			const swap = at(i)
			if (!swap) continue
			data.set(swap, i * 4)
		}
	}
}

/** A picture, recoloured by `swaps`, as a data URL. */
async function recoloured(url: string, swaps: Map<number, Rgb>, least = 0) {
	const image = new Image()
	image.src = url
	await image.decode()
	const canvas = document.createElement('canvas')
	canvas.width = image.naturalWidth
	canvas.height = image.naturalHeight
	const ctx = canvas.getContext('2d', { willReadFrequently: true })
	if (!ctx) return url
	ctx.drawImage(image, 0, 0)
	const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
	swapColours(pixels, swaps, least)
	ctx.putImageData(pixels, 0, 0)
	return canvas.toDataURL('image/png')
}

/** Every picture a member races in, as the Scene loads it: a strip's, not each frame's. */
function racingPictures({ sprite }: Playable) {
	const frames = [
		...sprite.run,
		sprite.sit,
		sprite.stand,
		sprite.ski,
		sprite.skiTuck,
		sprite.snowboard,
		...(sprite.dance?.frames ?? []),
	]
	return [
		...new Set(
			frames.filter((f): f is string => !!f).map((f) => f.split('#')[0]),
		),
	]
}

/** Each picture recoloured, by its URL, in each race's colour, once made. */
const [made, setMade] = createSignal(new Map<string, Map<string, string>>())
/** Making them, once a colour. */
const making = new Map<string, Promise<void>>()

/**
 * Every hand-drawn member's racing pictures, and every bonus runner's in a
 * T-shirt, made again in a race's T-shirt, `colour`: once, whichever race
 * asks first. Done when they all are; one that can't be made is shown as
 * it is.
 */
export function dressedIn(colour: string) {
	let done = making.get(colour)
	if (!done) {
		done = Promise.all(
			[...MEMBERS, ...BONUS_RUNNERS].flatMap((runner) => {
				const shirt = runner.member
					? SHIRTS[runner.member]
					: BONUS_SHIRTS[runner.id]
				if (!shirt) return []
				const swaps = swapsFor(shirt, colour)
				return racingPictures(runner).map(async (url) => {
					const made = await recoloured(url, swaps, shirt.least).catch(
						() => url,
					)
					return [url, made] as const
				})
			}),
		).then((pictures) => {
			setMade((all) => new Map(all).set(colour, new Map(pictures)))
		})
		making.set(colour, done)
	}
	return done
}

/**
 * The picture to show for `url`, in a race's T-shirt, `colour`: a
 * hand-drawn member's, recoloured, once it's made (see `dressedIn`). For
 * the Scene's `resolveAsset`: it's a signal, so sprites follow.
 */
export const inRaceShirt = (colour: string, url: string) =>
	made().get(colour)?.get(url) ?? url
