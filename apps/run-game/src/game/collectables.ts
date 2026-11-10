import type { Course } from '../courses/types'
import type { FikaItem } from './fika'

/**
 * Everything that can be collected: each fika there is, each ride there is,
 * a Pumpkin, and a parkrun's barcode token. Counted each time it's had, and
 * kept (see `saved/collected`).
 */
export type RideKind =
	| NonNullable<Course['ride']>
	| NonNullable<Course['flyer']>
	| 'corgi'
	| 'goose'

export type Collectable =
	| `fika:${FikaItem}`
	| `ride:${RideKind}`
	| 'pumpkin'
	| 'barcode'

/**
 * Each one's name, in the order they're shown. A `Record` of
 * them all, so a new fika or a new ride won't build until it's named here.
 */
export const COLLECTABLE_NAMES = {
	'fika:coffee': 'Kaffe',
	'fika:kanelbulle': 'Kanelbulle',
	'fika:kardemummabulle': 'Kardemummabulle',
	'fika:chokladboll': 'Chokladboll',
	'fika:prinsesstarta': 'Prinsesstårta',
	'fika:semla': 'Semla',
	'fika:dammsugare': 'Dammsugare',
	'fika:incaCola': 'Inca Kola',
	'fika:falafel': 'Falafel',
	'fika:knafeh': 'Knafeh',
	'fika:koshary': 'Koshary cup',
	'fika:dumplings': 'Dumplings',
	'fika:bubbleTea': 'Bubble tea',
	'fika:mooncake': 'Mooncake',
	'fika:candyCorn': 'Candy corn',
	'fika:toffeeApple': 'Toffee apple',
	'fika:spiderCupcake': 'Spider cupcake',
	'ride:corgi': 'Corgi',
	'ride:llama': 'Llama',
	'ride:goose': 'Goose',
	'ride:dragon': 'Dragon',
	pumpkin: 'Pumpkin',
	barcode: 'parkrun barcode',
} satisfies Record<Collectable, string>

/** Every one, in order. */
export const COLLECTABLES = Object.keys(COLLECTABLE_NAMES) as Collectable[]
