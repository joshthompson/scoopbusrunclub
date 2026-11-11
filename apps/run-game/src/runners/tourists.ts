import { standPixels } from '@/assets/runners/custom/pixel-data.generated'
import { generateCustomSpriteFrames } from '@/utils/createRunnerFrames'
import { seeded } from '../courses/kit/seeded'
import { type Avatar, DEFAULT_AVATAR, HAIR, KIT } from './looks'

/**
 * Tourists: made up as custom runners are, from the editor's options, but
 * stood still, and dressed for sightseeing, not running: always in long
 * trousers, never a vest. Who someone is comes from their `seed`, so the
 * same tourist's the same on every screen.
 */

/** Trousers for walking round the old town in: denim, chinos, black, grey, brown. */
const TROUSERS = [
	'#3a5a8c',
	'#2b3a55',
	'#c2a878',
	'#222222',
	'#6b6b6b',
	'#5a4632',
]
const SKINS: Avatar['skin'][] = [
	'light',
	'medium-light',
	'medium',
	'medium-dark',
	'dark',
]
const HAIRS = ['', 'short', 'short', 'medium', 'long'] as const
const BEARDS = ['stubble', 'beard', 'moustache'] as const

/** Someone on holiday: the look the `seed` gives. */
export function touristLook(seed: number): Avatar {
	const random = seeded(seed)
	const pick = <T>(list: readonly T[]) =>
		list[Math.floor(random() * list.length)]
	const hair = pick(HAIRS)
	const hairColor = pick(HAIR)
	const accessory =
		random() < 0.35 ? pick(['cap', 'glasses'] as const) : undefined
	return {
		...DEFAULT_AVATAR,
		skin: pick(SKINS),
		topType: random() < 0.6 ? 'tshirt' : 'longsleeve',
		topColor: pick(KIT),
		bottomType: 'trousers',
		bottomColor: pick(TROUSERS),
		shoeColor: pick(['#222222', '#5a4632', '#ffffff', '#9a9a9a']),
		head: {
			hair: hair || undefined,
			hairColor,
			topColorForNeck: false,
			facialHair: random() < 0.25 ? pick(BEARDS) : undefined,
			facialHairColor: hairColor,
			accessory,
			accessoryColor: pick(KIT),
		},
	}
}

/** The stand template's frames: stood, and with an arm up, a phone to their face. */
export const TOURIST_FRAMES = 2
/** Tourists already drawn, by seed: drawing one's canvas work. */
const drawn = new Map<number, ReturnType<typeof draw>>()

function draw(seed: number) {
	const sprite = generateCustomSpriteFrames(
		touristLook(seed),
		standPixels,
		TOURIST_FRAMES,
	)
	if (!sprite) return undefined
	return sprite
}

/** The tourist the `seed` gives, stood and with a phone up, as frames the engine takes. */
export function touristSprite(seed: number) {
	if (!drawn.has(seed)) drawn.set(seed, draw(seed))
	return drawn.get(seed)
}
