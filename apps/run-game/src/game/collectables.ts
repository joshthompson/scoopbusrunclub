import type { Course } from '../courses/types'
import { rideLook } from '../draw/rideLook'
import { BOARDS } from './boards'
import type { FikaItem } from './fika'
import { type Hat, WORN_FIKA } from './hats'
import type { PickupHat } from './hats'

/**
 * Everything that can be collected: each fika there is, each ride there is,
 * a Pumpkin, each hat, and a parkrun's barcode token. Counted each time it's had, and
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
	/** In The Caves, a mine cart, along its rails. */
	| 'minecart'

export type Collectable =
	| `fika:${FikaItem}`
	| `ride:${RideKind}`
	| 'pumpkin'
	| `hat:${PickupHat}`
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
	'fika:grapes': 'Grapes',
	'fika:oxygen': 'Oxygen',
	'fika:vitamin': 'Vitamins',
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
	'ride:mole': 'Mole',
	'ride:minecart': 'Mine cart',
	'ride:bloodCell': 'Red blood cell',
	pumpkin: 'Pumpkin',
	'hat:miner': "Miner's helmet",
	'hat:skiHelmet': 'Ski helmet',
	'hat:pharaoh': "Pharaoh's headdress",
	'hat:bambooHat': 'Bamboo hat',
	'hat:flowerCrown': 'Flower crown',
	'hat:sweatband': 'Sweatband',
	'hat:guardHelmet': "Royal Guard's helmet",
	'hat:antlers': 'Antlers',
	'hat:propeller': 'Propeller beanie',
	'hat:chullo': 'Chullo',
	'hat:tentacle': 'Tentacle hat',
	'hat:topHat': 'Top hat',
	'hat:flyingHelmet': 'Flying helmet',
	'hat:bobbleHat': 'Bobble hat',
	'hat:headMirror': 'Head mirror',
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
	'fika:grapes': 'Get well soon!',
	'fika:oxygen': 'Oxygen!',
	'fika:vitamin': 'Vitamins!',
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
	'ride:mole': 'Dig dig!',
	'ride:minecart': 'All aboard!',
	'ride:bloodCell': 'Go with the flow!',
	'ride:goat': 'G.O.A.T.!',
	'ride:skis': 'Skis on!',
	'ride:snowboard': 'Shred!',
	pumpkin: 'This is halloween!',
	'hat:miner': "A miner's helmet!",
	'hat:skiHelmet': 'Safety first!',
	'hat:pharaoh': 'Walk like an Egyptian!',
	'hat:bambooHat': 'Bamboo hat!',
	'hat:flowerCrown': 'Glad midsommar!',
	'hat:sweatband': 'Feel the burn!',
	'hat:guardHelmet': 'Attention!',
	'hat:antlers': 'Oh deer!',
	'hat:propeller': 'Wheee!',
	'hat:chullo': 'Toasty!',
	'hat:tentacle': 'Tentacle!',
	'hat:topHat': 'Chim chim cher-ee!',
	'hat:flyingHelmet': 'Chocks away!',
	'hat:bobbleHat': 'Toppluva!',
	'hat:headMirror': 'Say aah!',
	barcode: 'Scanned!',
} satisfies Record<Collectable, string>

/** Every one, in order. */
export const COLLECTABLES = Object.keys(COLLECTABLE_NAMES) as Collectable[]

/**
 * The collectables there are on a course, in the order they're shown: its
 * fika, hats, Pumpkins and barcode, its Rides (a rarer one too, if it has
 * one; skis and a snowboard, on a ski slope), the flyers over it, and a
 * condor, off a Leap, or a mine cart, in a mine.
 */
export function courseCollectables(course: Course): Collectable[] {
	const there = new Set<Collectable>()
	for (const b of course.boosts) {
		if (b.kind === 'fika') there.add(`fika:${b.item}`)
		else if (b.kind === 'pumpkin') there.add('pumpkin')
		else if (b.kind === 'hat') there.add(`hat:${b.hat}`)
		else if (b.kind === 'barcode') there.add('barcode')
	}
	const rides = course.corgis?.length ?? 0
	if (rides && course.ride === 'skis')
		for (const board of BOARDS.slice(0, rides)) there.add(`ride:${board.kind}`)
	else if (rides) {
		there.add(`ride:${course.ride ?? 'corgi'}`)
		const rare = rideLook(course).rare
		if (rare) there.add(`ride:${rare.kind}`)
	}
	if (course.flyovers?.length) there.add(`ride:${course.flyer ?? 'goose'}`)
	if (course.leap) there.add('ride:condor')
	if (course.mine) there.add('ride:minecart')
	return COLLECTABLES.filter((c) => there.has(c))
}

/**
 * A course's own hat, for its collectables goal: its hat to find, its
 * Pumpkin, or its captain's hat; none, if it's none.
 */
export function courseHat(course: Course): Hat | undefined {
	for (const b of course.boosts) {
		if (b.kind === 'hat') return { kind: b.hat }
		if (b.kind === 'pumpkin') return { kind: 'pumpkin', carving: 1 }
		if (b.kind === 'fika' && WORN_FIKA[b.item])
			return { kind: WORN_FIKA[b.item] as Hat['kind'] }
	}
	return undefined
}
