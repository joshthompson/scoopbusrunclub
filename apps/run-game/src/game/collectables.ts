import type { Course } from '../courses/types'
import { rideLook } from '../draw/rideLook'
import { BOARDS } from './boards'
import type { FikaItem } from './fika'
import { HAT_RULES, type Hat, type HatKind, WORN_FIKA } from './hats'
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
	/** On Scoop Cruises, the lifeboat, out of the engine rooms. */
	| 'lifeboat'
	/** Pogo Sticks' pogo stick, in the minigame: everyone's on one. */
	| 'pogoStick'

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
	'fika:waterCup': 'Water',
	'fika:blueberrySoup': 'Blåbärssoppa',
	'fika:pizzaSlice': 'Pizza slice',
	'fika:ale': 'Ale',
	'fika:cakeInACan': 'Cake in a can',
	'fika:berries': 'Wild berries',
	'fika:mushroom': 'Kantareller',
	'fika:badMushroom': 'Bad mushroom',
	'fika:sandwich': 'Sandwich',
	'fika:coolRock': 'Cool rock',
	'fika:cavePickles': 'Cave pickles',
	'fika:popcorn': 'Popcorn',
	'fika:mojito': 'Mojito',
	'fika:dobryCola': 'Dobry Cola',
	'fika:flyingStrawberry': 'Flying strawberry',
	'fika:bubbleGum': 'Bubble gum',
	'fika:cloudberries': 'Hjortron',
	'fika:fossilPops': 'Fossil pops',
	'fika:lavaCake': 'Lava cake',
	'fika:coconut': 'Coconut',
	'fika:astronautIceCream': 'Astronaut ice cream',
	'fika:spaceTube': 'Space food tube',
	'fika:starfruit': 'Starfruit',
	'fika:alienJelly': 'Alien jelly',
	'ride:corgi': 'Corgi',
	'ride:llama': 'Llama',
	'ride:camel': 'Camel',
	'ride:bactrian': 'Bactrian camel',
	'ride:deer': 'Deer',
	'ride:unicorn': 'Unicorn',
	'ride:horse': 'Royal Guard horse',
	'ride:glider': 'Glider',
	'ride:goat': 'Mountain goat',
	'ride:skis': 'Skis',
	'ride:snowboard': 'Snowboard',
	'ride:goose': 'Goose',
	'ride:dragon': 'Dragon',
	'ride:condor': 'Condor',
	'ride:pterodactyl': 'Pterodactyl',
	'ride:mole': 'Mole',
	'ride:minecart': 'Mine cart',
	'ride:lifeboat': 'Lifeboat',
	'ride:bloodCell': 'Red blood cell',
	'ride:skateboard': 'Skateboard',
	'ride:spaceBuddy': 'Space buddy',
	'ride:pogoStick': 'Pogo stick',
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
	'hat:discoBall': 'Disco ball',
	'hat:jazzHat': 'Flaming top hat',
	'hat:snorkel': 'Snorkel mask',
	'hat:antennae': 'Alien antennae',
	'hat:swordHat': 'Sword hat',
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
	'fika:waterCup': 'Vatten!',
	'fika:blueberrySoup': 'Blåbär!',
	'fika:pizzaSlice': 'Pizza!',
	'fika:ale': 'Skål!',
	'fika:cakeInACan': 'Cake in a can!',
	'fika:berries': 'Berries!',
	'fika:mushroom': 'Kantareller!',
	'fika:badMushroom': 'Bad mushroom!',
	'fika:sandwich': 'Sandwich!',
	'fika:coolRock': 'Cool rock!',
	'fika:cavePickles': 'Pickles!',
	'fika:popcorn': 'Popcorn!',
	'fika:mojito': 'Mojito!',
	'fika:dobryCola': 'Dobry Cola!',
	'fika:flyingStrawberry': 'Flying strawberry!',
	'fika:bubbleGum': 'Bubble gum!',
	'fika:cloudberries': 'Hjortron!',
	'fika:fossilPops': 'Fossil pops!',
	'fika:lavaCake': 'Molten!',
	'fika:coconut': 'Coconut!',
	'fika:astronautIceCream': 'Freeze-dried!',
	'fika:spaceTube': 'Squeeze!',
	'fika:starfruit': 'Starfruit!',
	'fika:alienJelly': 'Wobble!',
	'ride:corgi': 'Giddy up!',
	'ride:llama': 'Giddy up!',
	'ride:camel': 'Giddy up!',
	'ride:bactrian': 'Two humps!',
	'ride:deer': 'Giddy up!',
	'ride:unicorn': 'Giddy up!',
	'ride:horse': 'Giddy up!',
	'ride:glider': 'Wheee!',
	'ride:goose': 'Honk honk!',
	'ride:dragon': 'Dragon ride!',
	'ride:condor': 'Caught by a condor!',
	'ride:pterodactyl': 'Pterodactyl ride!',
	'ride:mole': 'Dig dig!',
	'ride:minecart': 'All aboard!',
	'ride:lifeboat': 'Abandon ship!',
	'ride:bloodCell': 'Go with the flow!',
	'ride:skateboard': 'Skate!',
	'ride:spaceBuddy': 'Blast off!',
	'ride:pogoStick': 'Boing!',
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
	'hat:discoBall': 'Disco!',
	'hat:jazzHat': 'Hot hat!',
	'hat:snorkel': 'Snorkel!',
	'hat:antennae': 'Bzzt!',
	'hat:swordHat': 'En garde!',
	barcode: 'Scanned!',
} satisfies Record<Collectable, string>

/**
 * What each one is, for the Collectables screen once it's been had: a line
 * of flavour. What it does is kept apart (see `collectableBehaviour`). A
 * `Record`, so a new one won't build till it's described.
 */
export const COLLECTABLE_ABOUT = {
	'fika:coffee': 'A cup of black coffee: half of any fika.',
	'fika:kanelbulle': 'A cinnamon bun: the king of Swedish fika.',
	'fika:kardemummabulle': 'A knotted cardamom bun, from an old café.',
	'fika:chokladboll': 'A chocolate oat ball, rolled in coconut.',
	'fika:prinsesstarta':
		'A slice of green princess cake: sponge, cream and marzipan.',
	'fika:semla': 'A cream bun filled with almond paste.',
	'fika:dammsugare': 'A "vacuum cleaner": a punsch roll in green marzipan.',
	'fika:incaCola':
		"A can of Peru's golden fizzy drink. It tastes of bubblegum.",
	'fika:falafel': 'Egyptian falafel, hot from a street stall.',
	'fika:knafeh': 'A cheese pastry soaked in syrup, from a Cairo sweet shop.',
	'fika:koshary': "Egypt's street food: rice, lentils and pasta, in a cup.",
	'fika:dumplings': 'A basket of steamed dim sum.',
	'fika:bubbleTea': 'Milk tea with chewy tapioca pearls at the bottom.',
	'fika:mooncake': 'A rich pastry, for the Mid-Autumn Festival.',
	'fika:candyfloss': 'Spun sugar on a stick.',
	'fika:toffeeApple': 'An apple in a hard red toffee shell.',
	'fika:spiderCupcake':
		'A chocolate cupcake with a spider on top. Edible, hopefully.',
	'fika:tinyFurby': 'A tiny furby, of your very own. It talks. A lot.',
	'fika:lollipop': 'A big swirly lollipop.',
	'fika:rainbowCake':
		'Layer upon layer of sponge, every colour of the rainbow.',
	'fika:rubberDuck':
		'Lost down the drains, and found again, a bit worse for it.',
	'fika:goldRing': 'Dropped down a drain. Someone will be looking for that.',
	'fika:oldCoin': 'A coin so old the king on it is long gone.',
	'fika:lostPhone': 'Dropped down a drain. Still on 3% battery.',
	'fika:kladdkaka': 'Sticky Swedish chocolate cake, off the ferry buffet.',
	'fika:lingondricka': 'Lingonberry squash, off the ferry buffet.',
	'fika:pickAndMix': 'A bag of pick-and-mix, from the tax-free shop.',
	'fika:salmiakki': 'Finnish salty liquorice. An acquired taste.',
	'fika:karelianPie':
		'A rye crust filled with rice porridge, from a Turku bakery.',
	'fika:captainsHat':
		"Up on the ferry's roof. Put it on: you're the captain now.",
	'fika:mintCake': 'Kendal Mint Cake, as went up Everest on the first ascent.',
	'fika:butterTea':
		'Sherpa tea, with salt and yak butter. Warming, at altitude.',
	'fika:waffle': 'A waffle with cream and cloudberry jam, from the waffle hut.',
	'fika:hotChocolate': 'A hot chocolate from the waffle hut, for the cold.',
	'fika:lussekatt': 'A saffron bun, for Lucia.',
	'fika:pepparkaka': 'A gingerbread heart.',
	'fika:waffleTower':
		'Hidden inside the waffle hut, for whoever skis through it.',
	'fika:tomatoSoup': "On the waffle hut's roof, for the first one up there.",
	'fika:energyDrink': 'A can of energy drink, from the side of the track.',
	'fika:sportsGel': 'A sachet of sports gel. Best had with water.',
	'fika:banana': "A runner's favourite. Potassium!",
	'fika:grapes': 'Grapes, as brought to anyone in hospital.',
	'fika:oxygen': 'A bubble of oxygen, in the bloodstream.',
	'fika:vitamin': 'Vitamins, inside someone. Good for them.',
	'fika:waterCup':
		'A paper cup of water, from the drinks station. Drink it on the run.',
	'fika:blueberrySoup': 'Warm blueberry soup, as every Swedish race hands out.',
	'fika:pizzaSlice':
		'A slice of pizza, from a kiosk on Södermalm, still open at midnight.',
	'fika:ale':
		'A tankard of ale, in a tavern under the old town. Mind the manholes.',
	'fika:cakeInACan': 'A whole cake, in a tin: a picnic for deep in the forest.',
	'fika:berries':
		'Blueberries and a lingonberry, picked off the bushes along the path.',
	'fika:mushroom':
		"Chanterelles: the forest's gold, for whoever knows where to look.",
	'fika:badMushroom': 'A fly agaric. Red with white spots means no. Too late.',
	'fika:sandwich': "A miner's packed lunch: ham, cheese and lettuce.",
	'fika:coolRock': 'A geode, cracked open, crystals inside. Very cool.',
	'fika:cavePickles': 'A jar of pickles, left to pickle in the dark. Crunchy.',
	'fika:popcorn':
		'A striped box of popcorn, for watching the sunset from the roofs.',
	'fika:mojito': 'Lime, mint and ice, at a rooftop bar.',
	'fika:dobryCola': 'A bottle of Dobry Cola, ice cold.',
	'fika:flyingStrawberry':
		'A strawberry with wings, out over the sea. Catch it if you can.',
	'fika:bubbleGum': 'A piece of bubble gum, blowing about in the sky.',
	'fika:cloudberries':
		'Cloudberries: golden, rare, and the best berry there is.',
	'fika:fossilPops':
		'Fossil pops: lollipops curled up like ammonites. Only found on Dino Island.',
	'fika:lavaCake':
		'A lava cake, on the way up the volcano. Molten in the middle.',
	'fika:coconut': 'A coconut, a straw in it, on the island’s beach.',
	'fika:astronautIceCream':
		'Freeze-dried ice cream, in its foil packet: what astronauts take into space.',
	'fika:spaceTube': 'Dinner in a tube, squeezed out in zero gravity.',
	'fika:starfruit':
		'A starfruit, growing wild on an alien planet. Probably safe.',
	'fika:alienJelly':
		'A jelly, glowing green, from the aliens’ canteen. It wobbles on its own.',
	'ride:corgi': 'A corgi, sat on the track, barking for a rider.',
	'ride:llama': 'A llama, humming for a rider.',
	'ride:camel': 'A camel, grumbling for a rider.',
	'ride:bactrian': 'A rare two-humped camel: one race in ten.',
	'ride:deer': 'A deer, barking for a rider. They really do.',
	'ride:unicorn': 'A unicorn, sparkling.',
	'ride:horse':
		"A horse of the Royal Guard's, saddled, waiting in the old town's streets.",
	'ride:glider': 'A hang glider, parked along the top of the cliff.',
	'ride:goat': 'A mountain goat, sure-footed, for the climb.',
	'ride:skis': 'A pair of skis, stood up in the snow at the top.',
	'ride:snowboard':
		'Now and then, a snowboard, out of the same rack as the skis.',
	'ride:goose': 'A goose, flying over, honking.',
	'ride:dragon': 'A dragon, rippling along the Wall.',
	'ride:condor': 'A giant condor, patrolling the skies around Machu Picchu.',
	'ride:pterodactyl': 'A pterodactyl, soaring over the forests of Dino Island.',
	'ride:mole': 'A mole, squeaking for a rider.',
	'ride:minecart': 'A mine cart, heaped with ore, waiting on the rails.',
	'ride:lifeboat': 'A lifeboat, bobbing under the engine rooms.',
	'ride:bloodCell': 'A red blood cell, bobbing in the bloodstream.',
	'ride:skateboard': 'A skateboard, left on the road on Södermalm.',
	'ride:spaceBuddy':
		'A space buddy, a little round alien, bounding about its low-gravity planet.',
	pumpkin: 'A carved pumpkin, worn on your head.',
	'ride:pogoStick':
		'A red pogo stick, in an empty car park. Harder to stay on than it looks.',
	'hat:miner': 'Its lamp lit, in a secret gallery reached by mine cart.',
	'hat:skiHelmet': 'Safety first, on the slopes.',
	'hat:pharaoh': 'From the tomb under the Sphinx.',
	'hat:bambooHat': 'A conical straw hat, along the Wall.',
	'hat:flowerCrown':
		'A midsummer crown of flowers, high up: get there on a goose.',
	'hat:sweatband': 'Over a hurdle, for a jump timed just right.',
	'hat:guardHelmet': "A Royal Guard's plumed helmet, high over a steam vent.",
	'hat:antlers': 'Up on a ledge by the second deer.',
	'hat:propeller': 'Over the highest platform.',
	'hat:chullo': 'An Andean knitted hat, with ear flaps, over the top terrace.',
	'hat:tentacle': 'A purple tentacle, high on a shelf in the sewers.',
	'hat:topHat': "A chimney sweep's top hat, high over a vent.",
	'hat:flyingHelmet': 'A leather flying helmet, high in the sky off the cliff.',
	'hat:bobbleHat': 'Up the mountain: get to it on a goat.',
	'hat:headMirror': "A doctor's head mirror, high in the lungs.",
	'hat:discoBall':
		'A disco ball, over your whole head, up on the rock band’s speakers.',
	'hat:jazzHat':
		'The Spirit of Jazz’s own top hat, on fire. Find him again, once he’s yours, and take it.',
	'hat:snorkel':
		'A snorkel mask, lost on the seabed off Dino Island. Dive deep for it.',
	'hat:antennae':
		'Alien antennae, on a headband, high up in the aliens’ base. Climb for them.',
	'hat:swordHat':
		'A skullcap with a long sword sticking straight up out of it. Mind the ceiling.',
	barcode: "Floating just before every parkrun's finish. Don't forget it!",
} satisfies Record<Collectable, string>

/** How each Ride goes, once you're on: see `collectableBehaviour`. */
const RIDE_BEHAVIOUR = {
	corgi:
		'Jump on to ride it over everything. Jump again to leap; duck to get off.',
	llama:
		'Jump on to ride it over everything. Jump again to leap; duck to get off.',
	camel:
		'Jump on to ride it over everything. Jump again to leap; duck to get off.',
	bactrian:
		'Jump on to ride it over everything. Jump again to leap; duck to get off.',
	deer: 'Jump on to ride it over everything. Jump again to leap; duck to get off.',
	unicorn:
		'Jump on to ride it over everything. Jump again to leap; duck to get off.',
	goat: 'Jump on to ride it over everything. Jump again to leap; duck to get off.',
	horse:
		'Jump on to ride it over everything. Jump again to leap; duck to get off.',
	glider:
		"Run into it to fly out to sea. Steer up and down; don't touch the water.",
	skis: 'Yours all the way down. Tuck to speed up, do tricks off kickers, grind rails.',
	snowboard: 'Ridden just like skis, tricks and all.',
	goose: 'Jump into it to be carried over everything for a while.',
	dragon: 'Jump onto its neck to fly over everything for a while.',
	condor: 'Catches you when you fall off the Leap.',
	pterodactyl: 'Jump into it to be carried over everything for a while.',
	mole: 'Run into it. It hops along by itself, digging through rock.',
	minecart: 'Run into it and hold on to the end of the line.',
	lifeboat: 'Drop into it through the hole and hold on. Jump to hop the waves.',
	bloodCell:
		'Jump on and go with the flow, faster than running. Duck to get off.',
	skateboard:
		'Run onto it and roll, faster than running. Jump to kickflip; duck to get off.',
	spaceBuddy:
		'Jump on to bound over everything in low gravity. Jump again to leap; duck to get off.',
	pogoStick:
		'Bounces by itself. Lean the other way as you tip to stay on; hold jump as you land to go high.',
} satisfies Record<RideKind, string>

/** What a hat does while it's on, from its rules: nothing, if it just looks good. */
function hatPowers(kind: HatKind): string[] {
	const rules = HAT_RULES[kind]
	const powers: string[] = []
	if (rules.speed > 0) powers.push("Keeps you faster while it's on.")
	if (rules.shield)
		powers.push('Takes the next knock for you, coming off doing it.')
	else if (rules.fallsOff) powers.push('Knocked off by a stumble.')
	if (rules.floats)
		powers.push('Hold jump on the way down to float (only in Furby Fields)')
	if (rules.splatProof) powers.push('Sewage slides right off it.')
	if (rules.germProof) powers.push('Germs bounce right off it.')
	return powers.length ? powers : ['Just for looks.']
}

/**
 * What having `id` does for you, as opposed to what it is (its
 * `COLLECTABLE_ABOUT`): fika's speed, a hat's powers, how a Ride goes.
 */
export function collectableBehaviour(id: Collectable): string[] {
	if (id.startsWith('ride:'))
		return [RIDE_BEHAVIOUR[id.slice('ride:'.length) as RideKind]]
	if (id.startsWith('fika:')) {
		const worn = WORN_FIKA[id.slice('fika:'.length) as FikaItem]
		return worn
			? ['A burst of speed.', ...hatPowers(worn)]
			: ['A burst of speed.']
	}
	if (id === 'hat:swordHat') return ['Catch fruit on its point.']
	if (id.startsWith('hat:'))
		return hatPowers(id.slice('hat:'.length) as HatKind)
	if (id === 'pumpkin') return hatPowers('pumpkin')
	if (id === 'barcode') return ['The biggest burst of speed there is.']
	return []
}

/** What kind of thing `id` is. */
export const collectableKind = (id: Collectable) =>
	id.startsWith('fika:')
		? 'Fika'
		: id.startsWith('ride:')
			? 'Ride'
			: id === 'barcode'
				? 'Token'
				: 'Hat'

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
	// A hidden bonus runner's own hat, to steal off them.
	if (course.found?.hat) there.add(`hat:${course.found.hat}`)
	if (course.flyovers?.length) there.add(`ride:${course.flyer ?? 'goose'}`)
	if (course.leap) there.add('ride:condor')
	if (course.mine) there.add('ride:minecart')
	if (course.secret?.lifeboat) there.add('ride:lifeboat')
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
