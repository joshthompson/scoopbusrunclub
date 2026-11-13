import { PUMPKIN_SPEED } from './constants'
import type { FikaItem } from './fika'

/**
 * Hats: worn on your head once you've run into one, each course's own.
 * Some do something while they're on; some fall off.
 *
 * - `pumpkin`: Halloween Town's, carved: faster while it's on, and it takes
 *   the next knock for you, smashed off doing it
 * - `miner`: a miner's helmet, its lamp lit, from the secret gallery in The
 *   Caves, only got to in a mine cart
 * - `captain`: a captain's hat, off the roof of a Scoop Cruises ferry
 * - `skiHelmet`: a ski helmet, on The Slopes: it takes the next knock for
 *   you, and comes off doing it
 * - `pharaoh`: a pharaoh's headdress, from the tomb under the Sphinx
 * - `bambooHat`: a bamboo hat (dǒulì), the conical straw hat, on the Great Wall
 * - `flowerCrown`: a midsummer crown of flowers, high over Haga, got to on
 *   a goose
 * - `sweatband`: over a hurdle at Kristineberg, for a jump timed just right
 * - `guardHelmet`: a Royal Guard's plumed helmet, high over a steam vent in
 *   Gamla Stan
 * - `antlers`: up on a ledge by Huddinge's second deer, worn down onto it
 * - `propeller`: a propeller beanie, over Furby Fields' highest platform:
 *   holding jump on the way down, it floats you
 * - `chullo`: an Andean knitted hat, over Machu Picchu's top terrace
 * - `tentacle`: a purple tentacle, high on a shelf in the sewers: sewage
 *   slides off it, and it takes the next knock for you, coming off doing it
 * - `topHat`: a chimney sweep's top hat, high over a vent on City Rooftop
 * - `flyingHelmet`: a leather flying helmet, high in the sky off The Cliff
 * - `bobbleHat`: a bobble hat, up Everest, got to on a goat
 * - `headMirror`: a doctor's head mirror, high in Karolinska's lungs: Germs
 *   bounce right off it
 */
export type HatKind =
	| 'pumpkin'
	| 'miner'
	| 'captain'
	| 'skiHelmet'
	| 'pharaoh'
	| 'bambooHat'
	| 'flowerCrown'
	| 'sweatband'
	| 'guardHelmet'
	| 'antlers'
	| 'propeller'
	| 'chullo'
	| 'tentacle'
	| 'topHat'
	| 'flyingHelmet'
	| 'bobbleHat'
	| 'headMirror'

/** A hat someone's wearing: a Pumpkin by its carving, 1 to 5. */
export interface Hat {
	kind: HatKind
	carving?: number
}

/** The hats that are a Boost of their own, to run into: not a Pumpkin, nor fika. */
export type PickupHat = Exclude<HatKind, 'pumpkin' | 'captain'>

export interface HatRules {
	/** How much faster than top speed it keeps you, while it's on. */
	speed: number
	/** Knocked off by a stumble. */
	fallsOff: boolean
	/** Takes a knock for you, coming off instead of you stumbling. */
	shield: boolean
	/** What's said as it does. */
	saved?: string
	/** Holding jump on the way down, floats you down slowly. */
	floats?: boolean
	/** Sewage pouring down onto it bounces off it, rather than splattering you. */
	splatProof?: boolean
	/** Germs bounce off it, rather than giving you a stumble. */
	germProof?: boolean
}

/** A hat that does nothing but look good. */
const PLAIN: HatRules = { speed: 0, fallsOff: false, shield: false }

export const HAT_RULES: Record<HatKind, HatRules> = {
	pumpkin: {
		speed: PUMPKIN_SPEED,
		fallsOff: true,
		shield: true,
		saved: 'Pumpkin saved you!',
	},
	miner: PLAIN,
	captain: PLAIN,
	skiHelmet: {
		speed: 0,
		fallsOff: true,
		shield: true,
		saved: 'Helmet saved you!',
	},
	pharaoh: PLAIN,
	bambooHat: PLAIN,
	flowerCrown: PLAIN,
	sweatband: PLAIN,
	guardHelmet: PLAIN,
	antlers: PLAIN,
	propeller: { ...PLAIN, floats: true },
	chullo: PLAIN,
	tentacle: {
		speed: 0,
		fallsOff: true,
		shield: true,
		saved: 'Tentacle saved you!',
		splatProof: true,
	},
	topHat: PLAIN,
	flyingHelmet: PLAIN,
	bobbleHat: PLAIN,
	headMirror: { ...PLAIN, germProof: true },
}

/** Fika that's a hat too, put on as it's had: the captain's hat, off the ferry's roof. */
export const WORN_FIKA: Partial<Record<FikaItem, HatKind>> = {
	captainsHat: 'captain',
}

/** Whether two hats are the same kind: one Pumpkin's as good as another. */
export const sameHat = (a: Hat | undefined, b: Hat) => a?.kind === b.kind

/** The kinds, after the Pumpkin's carvings, in the order they're numbered. */
const CODED: HatKind[] = [
	'miner',
	'captain',
	'skiHelmet',
	'pharaoh',
	'bambooHat',
	// New ones only ever on the end, so each keeps its number.
	'flowerCrown',
	'sweatband',
	'guardHelmet',
	'antlers',
	'propeller',
	'chullo',
	'tentacle',
	'topHat',
	'flyingHelmet',
	'bobbleHat',
	'headMirror',
]
/** How many carvings a Pumpkin can have: its codes. */
const CARVINGS = 5

/**
 * A hat as a number, to send to Remote Players: 0 for none, a Pumpkin by
 * its carving, 1 to 5, and the rest after it.
 */
export function hatCode(hat: Hat | undefined) {
	if (!hat) return 0
	if (hat.kind === 'pumpkin') return hat.carving ?? 1
	return CARVINGS + 1 + CODED.indexOf(hat.kind)
}

/** And back again. */
export function hatFromCode(code: number): Hat | undefined {
	if (code <= 0) return undefined
	if (code <= CARVINGS) return { kind: 'pumpkin', carving: code }
	const kind = CODED[code - CARVINGS - 1]
	return kind ? { kind } : undefined
}
