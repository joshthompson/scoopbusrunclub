/** The fika on the course, which speeds you up (drawn by `FikaArt`). */
export type FikaItem =
	| 'coffee'
	| 'kanelbulle'
	| 'chokladboll'
	| 'prinsesstarta'
	/** Gamla Stan's own, on top of the usual round of them. */
	| 'kardemummabulle'
	| 'semla'
	| 'dammsugare'
	/** Machu Picchu's, not in the usual round of them: a can of Inca Cola. */
	| 'incaCola'
	/** The Pyramids'. */
	| 'falafel'
	| 'knafeh'
	| 'koshary'
	/** The Great Wall's. */
	| 'dumplings'
	| 'bubbleTea'
	| 'mooncake'
	/** Halloween Town's. */
	| 'candyfloss'
	| 'toffeeApple'
	| 'spiderCupcake'
	/** Furby Fields': sweets, and a tiny furby, to keep. */
	| 'tinyFurby'
	| 'lollipop'
	| 'rainbowCake'
	/** The Sewers': not fika, but what's been lost down the drains. */
	| 'rubberDuck'
	| 'goldRing'
	| 'oldCoin'
	| 'lostPhone'
	/** Scoop Cruises': off the buffet, out of the tax-free, and in Turku, from its bakeries. */
	| 'kladdkaka'
	| 'lingondricka'
	| 'pickAndMix'
	| 'salmiakki'
	| 'karelianPie'
	/** Not fika at all: up on Scoop Cruises' roof, a captain's hat. */
	| 'captainsHat'
	/**
	 * Everest's: Kendal Mint Cake, as went up it on the first ascent, and
	 * a bowl of Sherpa butter tea.
	 */
	| 'mintCake'
	| 'butterTea'
	/**
	 * The Slopes': from the waffle hut halfway down, a waffle with cream and
	 * cloudberry jam, and a hot chocolate; a saffron bun and a gingerbread
	 * heart, it being winter.
	 */
	| 'waffle'
	| 'hotChocolate'
	| 'lussekatt'
	| 'pepparkaka'
	/**
	 * Hidden inside the waffle hut, only for whoever skis through it rather
	 * than over: a tower of waffles, cream between, cloudberries on top.
	 */
	| 'waffleTower'
	/** Up on the waffle hut's roof, for the first who gets up there: a bowl of tomato soup. */
	| 'tomatoSoup'
	/** Kristineberg's: not fika, but what's had at the side of a running track. */
	| 'energyDrink'
	| 'sportsGel'
	| 'banana'
	/**
	 * Karolinska's: grapes, as brought to anyone in hospital; and once
	 * you're shrunk and inside someone, bubbles of oxygen, and vitamins.
	 */
	| 'grapes'
	| 'oxygen'
	| 'vitamin'
	/**
	 * Midnattsloppet's: a paper cup of water and a cup of blueberry soup,
	 * from the drinks station, and a slice of pizza from a kiosk.
	 */
	| 'waterCup'
	| 'blueberrySoup'
	| 'pizzaSlice'
	/** Gamla Stan's, down in the tavern under it: a tankard of ale. */
	| 'ale'
	/**
	 * Huddinge's, a picnic in the forest: a cake in a can, wild berries and
	 * chanterelles; and one bad mushroom, that turns the screen funny.
	 */
	| 'cakeInACan'
	| 'berries'
	| 'mushroom'
	| 'badMushroom'
	/** The Caves': a miner's sandwich, a cool rock, and a jar of cave pickles. */
	| 'sandwich'
	| 'coolRock'
	| 'cavePickles'
	/** City Rooftop's, up on a roof at sunset: popcorn, a mojito, a Dobry Cola. */
	| 'popcorn'
	| 'mojito'
	| 'dobryCola'
	/** The Cliff's: a flying strawberry and bubble gum, up in the sky, and cloudberries. */
	| 'flyingStrawberry'
	| 'bubbleGum'
	| 'cloudberries'
	/** Dino Island's: fossil pops in the forest, a lava cake up the volcano, a coconut on the island. */
	| 'fossilPops'
	| 'lavaCake'
	| 'coconut'
	/**
	 * Rocket Launch's: astronaut ice cream and a tube of space food in
	 * space, a starfruit on the planet, an alien jelly in its base.
	 */
	| 'astronautIceCream'
	| 'spaceTube'
	| 'starfruit'
	| 'alienJelly'

export const FIKA_ITEMS: FikaItem[] = [
	'coffee',
	'kanelbulle',
	'chokladboll',
	'prinsesstarta',
]

/** Gamla Stan's, from its old cafés: the usual round, and more besides. */
export const GAMLA_STAN_FIKA: FikaItem[] = [
	'coffee',
	'semla',
	'kanelbulle',
	'dammsugare',
	'kardemummabulle',
	'chokladboll',
	'prinsesstarta',
]

/** The Pyramids', from Cairo's street food and sweet shops, and a coffee and a bun. */
export const PYRAMIDS_FIKA: FikaItem[] = [
	'falafel',
	'coffee',
	'knafeh',
	'koshary',
	'kanelbulle',
]

/** The Great Wall's: dim sum, tea and mooncakes, and a coffee and a bun. */
export const GREAT_WALL_FIKA: FikaItem[] = [
	'dumplings',
	'bubbleTea',
	'coffee',
	'mooncake',
	'kanelbulle',
]

/** Halloween Town's: sweets, a toffee apple, and a chokladboll and a coffee. */
export const HALLOWEEN_FIKA: FikaItem[] = [
	'candyfloss',
	'toffeeApple',
	'coffee',
	'spiderCupcake',
	'chokladboll',
]

/** Furby Fields': a tiny furby of your own, and sweets, candyfloss among them. */
export const FURBY_FIKA: FikaItem[] = [
	'tinyFurby',
	'lollipop',
	'candyfloss',
	'rainbowCake',
]

/**
 * The Sewers': no fika down there, but what's been lost down the drains,
 * found, and just as good for a bit of speed.
 */
export const SEWER_FINDS: FikaItem[] = [
	'rubberDuck',
	'goldRing',
	'oldCoin',
	'lostPhone',
]

/** On the ferry: the buffet's, the tax-free shop's, and a coffee and a bun. */
export const FERRY_FIKA: FikaItem[] = [
	'kladdkaka',
	'pickAndMix',
	'coffee',
	'lingondricka',
	'salmiakki',
	'kanelbulle',
]

/** Up Everest: mint cake and butter tea, and a coffee and a bun from base camp. */
export const EVEREST_FIKA: FikaItem[] = [
	'mintCake',
	'butterTea',
	'coffee',
	'mintCake',
	'kanelbulle',
]

/** Down The Slopes: the waffle hut's, and a winter's saffron buns and gingerbread. */
export const SLOPES_FIKA: FikaItem[] = [
	'waffle',
	'hotChocolate',
	'lussekatt',
	'pepparkaka',
	'kanelbulle',
	'coffee',
]

/** Kristineberg's, at the side of the track: energy drinks, sports gels and bananas. */
export const KRISTINEBERG_FIKA: FikaItem[] = [
	'energyDrink',
	'banana',
	'sportsGel',
	'banana',
]

/** In Karolinska's corridors: grapes, for the patients, a coffee and a bun. */
export const HOSPITAL_FIKA: FikaItem[] = [
	'grapes',
	'coffee',
	'kanelbulle',
	'grapes',
]

/** Inside someone: bubbles of oxygen, and vitamins. */
export const BODY_FIKA: FikaItem[] = ['oxygen', 'vitamin', 'oxygen']

/**
 * Midnattsloppet's, down Södermalm at night: water and blueberry soup off
 * the drinks station's tables, and a slice of pizza from a kiosk.
 */
export const MIDNATTSLOPPET_FIKA: FikaItem[] = [
	'waterCup',
	'pizzaSlice',
	'blueberrySoup',
	'waterCup',
]

/**
 * Huddinge's, picked and packed for a day in the forest. Its one bad
 * mushroom isn't among them: it's placed on its own (see `huddinge`).
 */
export const HUDDINGE_FIKA: FikaItem[] = ['berries', 'cakeInACan', 'mushroom']

/** The Caves': a sandwich, a cool rock, cave pickles. */
export const CAVES_FIKA: FikaItem[] = ['sandwich', 'coolRock', 'cavePickles']

/** City Rooftop's: popcorn, a mojito, a Dobry Cola. */
export const ROOFTOP_FIKA: FikaItem[] = ['popcorn', 'mojito', 'dobryCola']

/** The Cliff's, up in the sky: a flying strawberry, bubble gum, cloudberries. */
export const CLIFF_FIKA: FikaItem[] = [
	'flyingStrawberry',
	'bubbleGum',
	'cloudberries',
]

/** Dino Island's: fossil pops, a lava cake, a coconut. */
export const DINO_FIKA: FikaItem[] = ['fossilPops', 'lavaCake', 'coconut']

/** Rocket Launch's: astronaut ice cream, a tube of space food, a starfruit, an alien jelly. */
export const ROCKET_FIKA: FikaItem[] = [
	'astronautIceCream',
	'spaceTube',
	'starfruit',
	'alienJelly',
]

/** In Turku: a Karelian pie, a coffee, salmiakki. */
export const TURKU_FIKA: FikaItem[] = ['karelianPie', 'coffee', 'salmiakki']

/** A cell's size, in screen pixels. */
const CELL = 2

/** Each item's size on the screen: its art, in cells twice the size of a screen pixel. */
export const FIKA_SIZE: Record<FikaItem, { width: number; height: number }> = {
	coffee: { width: 12 * CELL, height: 11 * CELL },
	kanelbulle: { width: 12 * CELL, height: 9 * CELL },
	chokladboll: { width: 9 * CELL, height: 9 * CELL },
	prinsesstarta: { width: 12 * CELL, height: 11 * CELL },
	kardemummabulle: { width: 12 * CELL, height: 9 * CELL },
	semla: { width: 12 * CELL, height: 11 * CELL },
	dammsugare: { width: 14 * CELL, height: 7 * CELL },
	incaCola: { width: 8 * CELL, height: 13 * CELL },
	falafel: { width: 12 * CELL, height: 10 * CELL },
	knafeh: { width: 12 * CELL, height: 9 * CELL },
	koshary: { width: 10 * CELL, height: 11 * CELL },
	dumplings: { width: 13 * CELL, height: 9 * CELL },
	bubbleTea: { width: 9 * CELL, height: 12 * CELL },
	mooncake: { width: 11 * CELL, height: 9 * CELL },
	candyfloss: { width: 10 * CELL, height: 14 * CELL },
	toffeeApple: { width: 10 * CELL, height: 10 * CELL },
	spiderCupcake: { width: 12 * CELL, height: 10 * CELL },
	tinyFurby: { width: 9 * CELL, height: 10 * CELL },
	lollipop: { width: 8 * CELL, height: 14 * CELL },
	rainbowCake: { width: 11 * CELL, height: 10 * CELL },
	rubberDuck: { width: 11 * CELL, height: 10 * CELL },
	goldRing: { width: 9 * CELL, height: 9 * CELL },
	oldCoin: { width: 9 * CELL, height: 9 * CELL },
	lostPhone: { width: 7 * CELL, height: 12 * CELL },
	kladdkaka: { width: 12 * CELL, height: 8 * CELL },
	lingondricka: { width: 8 * CELL, height: 12 * CELL },
	pickAndMix: { width: 9 * CELL, height: 12 * CELL },
	salmiakki: { width: 10 * CELL, height: 9 * CELL },
	karelianPie: { width: 12 * CELL, height: 7 * CELL },
	captainsHat: { width: 12 * CELL, height: 8 * CELL },
	mintCake: { width: 12 * CELL, height: 8 * CELL },
	butterTea: { width: 11 * CELL, height: 11 * CELL },
	waffle: { width: 13 * CELL, height: 9 * CELL },
	hotChocolate: { width: 10 * CELL, height: 12 * CELL },
	lussekatt: { width: 12 * CELL, height: 10 * CELL },
	pepparkaka: { width: 11 * CELL, height: 10 * CELL },
	waffleTower: { width: 14 * CELL, height: 18 * CELL },
	tomatoSoup: { width: 13 * CELL, height: 11 * CELL },
	energyDrink: { width: 8 * CELL, height: 13 * CELL },
	sportsGel: { width: 7 * CELL, height: 12 * CELL },
	banana: { width: 12 * CELL, height: 9 * CELL },
	grapes: { width: 12 * CELL, height: 12 * CELL },
	oxygen: { width: 11 * CELL, height: 11 * CELL },
	vitamin: { width: 12 * CELL, height: 7 * CELL },
	waterCup: { width: 8 * CELL, height: 10 * CELL },
	blueberrySoup: { width: 8 * CELL, height: 10 * CELL },
	pizzaSlice: { width: 12 * CELL, height: 12 * CELL },
	ale: { width: 11 * CELL, height: 12 * CELL },
	cakeInACan: { width: 10 * CELL, height: 12 * CELL },
	berries: { width: 12 * CELL, height: 10 * CELL },
	mushroom: { width: 10 * CELL, height: 9 * CELL },
	badMushroom: { width: 10 * CELL, height: 11 * CELL },
	sandwich: { width: 12 * CELL, height: 9 * CELL },
	coolRock: { width: 10 * CELL, height: 9 * CELL },
	cavePickles: { width: 9 * CELL, height: 12 * CELL },
	popcorn: { width: 10 * CELL, height: 12 * CELL },
	mojito: { width: 9 * CELL, height: 13 * CELL },
	dobryCola: { width: 7 * CELL, height: 14 * CELL },
	flyingStrawberry: { width: 12 * CELL, height: 8 * CELL },
	fossilPops: { width: 15 * CELL, height: 13 * CELL },
	lavaCake: { width: 12 * CELL, height: 9 * CELL },
	coconut: { width: 11 * CELL, height: 12 * CELL },
	bubbleGum: { width: 12 * CELL, height: 6 * CELL },
	cloudberries: { width: 9 * CELL, height: 9 * CELL },
	astronautIceCream: { width: 12 * CELL, height: 12 * CELL },
	spaceTube: { width: 8 * CELL, height: 14 * CELL },
	starfruit: { width: 12 * CELL, height: 12 * CELL },
	alienJelly: { width: 12 * CELL, height: 11 * CELL },
}
