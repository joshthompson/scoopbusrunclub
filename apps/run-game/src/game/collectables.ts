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
	/** The Pyramids' rarer camel, with two humps, now and then. */
	| 'bactrian'
	/** On The Slopes, a snowboard, rather than skis, out of the rack. */
	| 'snowboard'

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
	'fika:candyfloss': 'Candyfloss',
	'fika:toffeeApple': 'Toffee apple',
	'fika:spiderCupcake': 'Spider cupcake',
	'fika:tinyFurby': 'Tiny furby',
	'fika:lollipop': 'Lollipop',
	'fika:rainbowCake': 'Rainbow cake',
	'fika:rubberDuck': 'Rubber duck',
	'fika:goldRing': 'Gold ring',
	'fika:oldCoin': 'Old coin',
	'fika:lostPhone': 'Lost phone',
	'fika:kladdkaka': 'Kladdkaka',
	'fika:lingondricka': 'Lingondricka',
	'fika:pickAndMix': 'Lösgodis',
	'fika:salmiakki': 'Salmiakki',
	'fika:karelianPie': 'Karjalanpiirakka',
	'fika:captainsHat': "Captain's hat",
	'fika:mintCake': 'Kendal Mint Cake',
	'fika:butterTea': 'Butter tea',
	'fika:waffle': 'Våffla',
	'fika:hotChocolate': 'Varm choklad',
	'fika:lussekatt': 'Lussekatt',
	'fika:pepparkaka': 'Pepparkaka',
	'fika:waffleTower': 'Våffeltorn',
	'fika:tomatoSoup': 'Tomatsoppa',
	'fika:energyDrink': 'Energy drink',
	'fika:sportsGel': 'Sports gel',
	'fika:banana': 'Banana',
	'ride:corgi': 'Corgi',
	'ride:llama': 'Llama',
	'ride:camel': 'Camel',
	'ride:bactrian': 'Bactrian camel',
	'ride:deer': 'Deer',
	'ride:unicorn': 'Unicorn',
	'ride:glider': 'Glider',
	'ride:goat': 'Mountain goat',
	'ride:skis': 'Skis',
	'ride:snowboard': 'Snowboard',
	'ride:goose': 'Goose',
	'ride:dragon': 'Dragon',
	'ride:condor': 'Condor',
	pumpkin: 'Pumpkin',
	barcode: 'parkrun barcode',
} satisfies Record<Collectable, string>

/**
 * What's said, picking each one up, popping up over whoever got it: its
 * own, for every one there is, so a new fika or ride won't build till it
 * has one. The same word for more than one is fine: most fika is "Fika!".
 */
export const PICKUP_WORD = {
	'fika:coffee': 'Fika!',
	'fika:kanelbulle': 'Fika!',
	'fika:kardemummabulle': 'Fika!',
	'fika:chokladboll': 'Fika!',
	'fika:prinsesstarta': 'Fika!',
	'fika:semla': 'Fika!',
	'fika:dammsugare': 'Fika!',
	'fika:incaCola': 'Inca Cola!',
	'fika:falafel': 'Falafel!',
	'fika:knafeh': 'Knafeh!',
	'fika:koshary': 'Koshary!',
	'fika:dumplings': 'Dumplings!',
	'fika:bubbleTea': 'Bubble tea!',
	'fika:mooncake': 'Mooncake!',
	'fika:candyfloss': 'Candyfloss!',
	'fika:toffeeApple': 'Toffee apple!',
	'fika:spiderCupcake': 'Spider cupcake!',
	'fika:tinyFurby': 'A tiny furby!',
	'fika:lollipop': 'Lollipop!',
	'fika:rainbowCake': 'Rainbow cake!',
	'fika:rubberDuck': 'Rubber duck!',
	'fika:goldRing': 'A gold ring!',
	'fika:oldCoin': 'An old coin!',
	'fika:lostPhone': 'A lost phone!',
	'fika:kladdkaka': 'Kladdkaka!',
	'fika:lingondricka': 'Lingondricka!',
	'fika:pickAndMix': 'Lösgodis!',
	'fika:salmiakki': 'Salmiakki!',
	'fika:karelianPie': 'Karjalanpiirakka!',
	'fika:captainsHat': 'Aye aye, Captain!',
	'fika:mintCake': 'Mint cake!',
	'fika:butterTea': 'Butter tea!',
	'fika:waffle': 'Våffla!',
	'fika:hotChocolate': 'Varm choklad!',
	'fika:lussekatt': 'Lussekatt!',
	'fika:pepparkaka': 'Pepparkaka!',
	'fika:waffleTower': 'Våffeltorn!',
	'fika:tomatoSoup': 'Tomatsoppa!',
	'fika:energyDrink': 'Energy!',
	'fika:sportsGel': 'Gel!',
	'fika:banana': 'Banana!',
	'ride:corgi': 'Giddy up!',
	'ride:llama': 'Giddy up!',
	'ride:camel': 'Giddy up!',
	'ride:bactrian': 'Two humps!',
	'ride:deer': 'Giddy up!',
	'ride:unicorn': 'Giddy up!',
	'ride:glider': 'Wheee!',
	'ride:goose': 'Honk honk!',
	'ride:dragon': 'Dragon ride!',
	'ride:condor': 'Caught by a condor!',
	'ride:goat': 'G.O.A.T.!',
	'ride:skis': 'Skis on!',
	'ride:snowboard': 'Shred!',
	pumpkin: 'This is halloween!',
	barcode: 'Scanned!',
} satisfies Record<Collectable, string>

/** Every one, in order. */
export const COLLECTABLES = Object.keys(COLLECTABLE_NAMES) as Collectable[]
