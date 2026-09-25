/**
 * Scoop Bay's listings: 75% Furbys, 15% running gear, 10% whatever else was
 * in the garage. Regenerated from the date, so the auctions change daily.
 */
import { CLUB_MEMBERS } from '@shared/members'
import { daySeed, seededRandom } from '../shared/random'

export type Category = 'furby' | 'gear' | 'misc'

export interface FurbyLook {
	name: string
	fur: string
	furDark: string
	belly: string
	ears: string
	eyes: string
	stripes?: string
}

export interface Bid {
	who: string
	amount: number
	when: number
}

export interface Listing {
	id: number
	title: string
	category: Category
	furby?: FurbyLook
	emoji?: string
	price: number
	startPrice: number
	bids: Bid[]
	startedAt: number
	endsAt: number
	seller: string
	feedback: number
	location: string
	description: string[]
	featured: boolean
}

export const FURBY_LOOKS: FurbyLook[] = [
	{
		name: 'Tiger',
		fur: '#f2a33a',
		furDark: '#c7791d',
		belly: '#fff1c9',
		ears: '#c7791d',
		eyes: '#3aa3d6',
		stripes: '#5b3410',
	},
	{
		name: 'Snowball',
		fur: '#f4f4f4',
		furDark: '#c9c9c9',
		belly: '#ffffff',
		ears: '#f0dbe2',
		eyes: '#6aa2e0',
	},
	{
		name: 'Peacock',
		fur: '#2f7fb8',
		furDark: '#1e5a86',
		belly: '#8ed7ec',
		ears: '#2f7fb8',
		eyes: '#2ec27e',
	},
	{
		name: 'Lava',
		fur: '#d8382b',
		furDark: '#9c2118',
		belly: '#ffd39a',
		ears: '#9c2118',
		eyes: '#ffcf3d',
	},
	{
		name: 'Kiwi',
		fur: '#7cb342',
		furDark: '#558b2f',
		belly: '#e6f4c8',
		ears: '#558b2f',
		eyes: '#8b5a2b',
	},
	{
		name: 'Grape',
		fur: '#8e5bbf',
		furDark: '#63398c',
		belly: '#e8d6f7',
		ears: '#63398c',
		eyes: '#f4c542',
	},
	{
		name: 'Cotton Candy',
		fur: '#f5a3c7',
		furDark: '#d4759f',
		belly: '#fff0f6',
		ears: '#f5a3c7',
		eyes: '#67c2e8',
	},
	{
		name: 'Midnight',
		fur: '#3a3a4a',
		furDark: '#1e1e2a',
		belly: '#b8b8c8',
		ears: '#1e1e2a',
		eyes: '#f4c542',
	},
	{
		name: 'Leopard',
		fur: '#e5c07b',
		furDark: '#b58b3a',
		belly: '#fff8e3',
		ears: '#b58b3a',
		eyes: '#4a9c5c',
		stripes: '#6b4a1a',
	},
	{
		name: 'Haga Green',
		fur: '#77a15d',
		furDark: '#4f7a3a',
		belly: '#d9e8c8',
		ears: '#4f7a3a',
		eyes: '#e0382f',
	},
]

const FURBY_PREFIX = [
	'1998 ORIGINAL',
	'RARE!!',
	'L@@K!!!',
	'VINTAGE',
	'MINT',
	'NR',
	'HAUNTED',
	'Gen 1',
	'Talking',
	'Furby Baby',
	'Tiger Electronics',
	'WOW',
	'Collectors',
	'HTF',
	'Boxed',
]

const FURBY_SUFFIX = [
	'WORKS!!!',
	'no reserve',
	'batteries incl.',
	'speaks Furbish + Swedish',
	'will not shut up',
	'NIB',
	'slightly cursed',
	'one owner (me)',
	'hates parkrun',
	'found in Haga finish funnel',
	'says "scoop bus" when shaken',
	'eyes open at night',
	'sings at 3am',
	'ran a 5k PB (unverified)',
	'smells of fika',
	'volunteered as tail walker',
	'partially chewed by corgi',
	'GREAT XMAS GIFT',
	'no low-ballers I know what I have',
]

const FURBY_DESC = [
	'Up for auction is my beloved Furby. Bought in 1998, loved ever since, but I need the money for new running shoes.',
	'He talks A LOT. Sometimes in Furbish, sometimes in Swedish, once in what I think was Latin.',
	'Fur is in good condition apart from a small bald patch where the corgi got him.',
	'Eyes open and close correctly. They also open when nobody is touching him, which the manual does not mention.',
	'Has been to every Haga parkrun since April. Not as a runner. As a spectator. He insists.',
	'Will ship anywhere in Sweden. Will ship anywhere else if you pay. Will not ship to Denmark, he had a bad experience.',
	'Comes with original box (slightly crushed, see photo which I have not uploaded because my scanner is broken).',
	'Batteries included but I would replace them, he has been on for about six years.',
	'NO RESERVE!!! Bid with confidence!!! Check my feedback!!!',
	'Please do not ask me if he is haunted. I do not know. He knows.',
	'Serious bidders only. This is a Furby, not a toy.',
	'I was told by a man at the finish line that this one is worth thousands. He was wearing a hi-vis so I believe him.',
]

const GEAR_ITEMS: { title: string; emoji: string; desc: string[] }[] = [
	{
		title: 'Garmin Forerunner 205 (battery lasts approx 4km)',
		emoji: '⌚',
		desc: [
			'GPS acquires satellites within 20-45 minutes on a clear day.',
			'Records your run perfectly right up until the point where it dies.',
		],
	},
	{
		title: 'Nike Pegasus, only 3000km on them, LOADS of life left',
		emoji: '👟',
		desc: [
			'Soles are technically present.',
			'Have been through the Haga mud section 140 times, they know the way by themselves.',
		],
	},
	{
		title: 'parkrun barcode (laminated) — NOT MINE, found',
		emoji: '🏷️',
		desc: [
			'Found this at the finish. If it is yours, bid on it.',
			'Lamination is professional grade (kitchen).',
		],
	},
	{
		title: 'Marathon foil blanket, used once, still warm',
		emoji: '🥇',
		desc: [
			'Crinkly. Very crinkly.',
			'Smells faintly of achievement and energy gel.',
		],
	},
	{
		title: 'Energy gel, unopened, best before 2019',
		emoji: '🍯',
		desc: ['Flavour: "Tropical". Colour: worrying.', 'Sealed. Probably.'],
	},
	{
		title: 'Cowbell, LOUD, banned at three events',
		emoji: '🔔',
		desc: [
			'MORE COWBELL. Actually less cowbell, please, said the run director.',
			'Slight dent from an enthusiastic finish.',
		],
	},
	{
		title: 'Tail walker hi-vis vest XL, lightly reflective',
		emoji: '🦺',
		desc: [
			'Has the authority of a marshal built in.',
			'One pocket contains a finish token from event #112. Sorry.',
		],
	},
	{
		title: 'Race belt with 14 safety pins (13 work)',
		emoji: '📌',
		desc: ['One pin is decorative.'],
	},
	{
		title: 'Pair of running socks (matching!!)',
		emoji: '🧦',
		desc: ['Both socks. From the same pair. This does not happen often.'],
	},
	{
		title: 'Stopwatch, stopped',
		emoji: '⏱️',
		desc: ['Stopped at 24:59. I do not want to talk about it.'],
	},
]

const MISC_ITEMS: { title: string; emoji: string; desc: string[] }[] = [
	{
		title: 'Beanie Baby Princess bear RARE will be worth millions',
		emoji: '🧸',
		desc: ['Tag protector included. Tag protector protector not included.'],
	},
	{
		title: 'AOL 3.0 CD-ROM, 500 FREE HOURS',
		emoji: '💿',
		desc: ['Also makes a great coaster for your fika.'],
	},
	{
		title: 'Tamagotchi (alive as of this listing)',
		emoji: '🥚',
		desc: ['Needs feeding every 2 hours. Bidding ends before then, so hurry.'],
	},
	{
		title: 'Windows 98 SE, all 38 floppies, one is a bit sticky',
		emoji: '💾',
		desc: ['Disk 27 has a crisp in the sleeve.'],
	},
	{
		title: 'Slightly used traffic cone (parkrun route, do not ask)',
		emoji: '🚧',
		desc: [
			'Was on the course. Then it was not on the course. Now it is on Scoop Bay.',
		],
	},
	{
		title: 'Blank VHS tapes x3 (one has Gladiators on it)',
		emoji: '📼',
		desc: ['Recorded over an episode of something, sorry Mum.'],
	},
	{
		title: 'Haga Park pigeon (pigeon not included)',
		emoji: '🐦',
		desc: ['You are bidding on the concept of a pigeon.'],
	},
	{
		title: 'Scoop bus (the actual bus)',
		emoji: '🚌',
		desc: [
			'Runs. Well, it stands there while people run past it.',
			'Ice cream not included. Ice cream never included.',
		],
	},
	{
		title: 'Half a Curly Wurly from the finish line',
		emoji: '🍫',
		desc: ['The good half.'],
	},
	{
		title: 'Furby-shaped hole in my life',
		emoji: '🕳️',
		desc: ['Buyer collects.'],
	},
]

const LOCATIONS = [
	'Solna, Sweden',
	'Haga Park (the bit by the bus)',
	'Hagalund, Sweden',
	'Sundbyberg, Sweden',
	'Bromma, Sweden',
	'Södermalm, Sweden',
	'Vasastan, Sweden',
	'Somewhere on the Sunset loop',
]

const HANDLE_SUFFIX = [
	'_runs',
	'2000',
	'_parkrun',
	'_sthlm',
	'x',
	'_furbys',
	'1998',
	'_fast',
]

function sellerHandle(name: string, suffix: string) {
	return `${name.toLowerCase().replace(/\s+/g, '')}${suffix}`
}

export function generateListings(): Listing[] {
	const rng = seededRandom(daySeed())
	const members = Object.values(CLUB_MEMBERS).map((m) => m.name)
	const now = Date.now()
	const listings: Listing[] = []
	const gearPool = [...GEAR_ITEMS]
	const miscPool = [...MISC_ITEMS]

	// Exactly 30 Furbys, 6 bits of running gear and 4 other things, dealt out
	// in a daily order.
	const categories: Category[] = [
		...Array<Category>(30).fill('furby'),
		...Array<Category>(6).fill('gear'),
		...Array<Category>(4).fill('misc'),
	]
	for (let i = categories.length - 1; i > 0; i--) {
		const j = rng.int(0, i)
		;[categories[i], categories[j]] = [categories[j], categories[i]]
	}

	for (let i = 0; i < categories.length; i++) {
		const category = categories[i]
		const seller = sellerHandle(rng.pick(members), rng.pick(HANDLE_SUFFIX))
		const feedback = rng.int(3, 1250)
		const id = 1_000_000 + rng.int(100_000, 999_999) * 3 + i
		const startedAt = now - rng.int(1, 6) * 86_400_000 - rng.int(0, 86_400_000)
		const endsAt =
			now + rng.int(0, 5) * 86_400_000 + rng.int(60_000, 86_400_000)
		const bidCount = rng.chance(0.25) ? 0 : rng.int(1, 27)

		let title: string
		let furby: FurbyLook | undefined
		let emoji: string | undefined
		let startPrice: number
		let description: string[]

		if (category === 'furby') {
			furby = rng.pick(FURBY_LOOKS)
			title = `${rng.pick(FURBY_PREFIX)} FURBY ${furby.name} ${rng.pick(FURBY_SUFFIX)}`
			startPrice = rng.pick([0.99, 4.99, 9.99, 19.99, 49.99, 99.0])
			const descs = new Set<string>()
			while (descs.size < 3) descs.add(rng.pick(FURBY_DESC))
			description = [...descs]
		} else {
			const pool = category === 'gear' ? gearPool : miscPool
			const item =
				pool.length > 0
					? pool.splice(rng.int(0, pool.length - 1), 1)[0]
					: rng.pick(category === 'gear' ? GEAR_ITEMS : MISC_ITEMS)
			title = item.title
			emoji = item.emoji
			startPrice = rng.pick([0.5, 0.99, 2.5, 5.0, 12.0])
			description = item.desc
		}

		const bids: Bid[] = []
		let price = startPrice
		for (let b = 0; b < bidCount; b++) {
			price =
				Math.round((price + Math.max(0.5, price * rng.next() * 0.35)) * 100) /
				100
			bids.push({
				who: sellerHandle(rng.pick(members), rng.pick(HANDLE_SUFFIX)),
				amount: price,
				when: startedAt + ((endsAt - startedAt) * (b + 1)) / (bidCount + 1),
			})
		}

		listings.push({
			id,
			title,
			category,
			furby,
			emoji,
			price,
			startPrice,
			bids,
			startedAt,
			endsAt,
			seller,
			feedback,
			location: rng.pick(LOCATIONS),
			description,
			featured: false,
		})
	}

	// Three featured items, Furbys first because it is 1999 and they sell.
	const furbys = listings.filter((l) => l.category === 'furby')
	for (const l of [
		furbys[0],
		furbys[1],
		listings.find((l) => l.category !== 'furby'),
	]) {
		if (l) l.featured = true
	}

	return listings.sort((a, b) => a.endsAt - b.endsAt)
}

export function timeLeft(endsAt: number, now: number): string {
	const ms = endsAt - now
	if (ms <= 0) return 'Ended'
	const mins = Math.floor(ms / 60_000)
	const days = Math.floor(mins / 1440)
	const hours = Math.floor((mins % 1440) / 60)
	const m = mins % 60
	if (days > 0)
		return `${days}d ${String(hours).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`
	if (hours > 0) return `${hours}h ${String(m).padStart(2, '0')}m`
	return `${m}m`
}

export function money(n: number) {
	return `$${n.toFixed(2)}`
}

export function nineties(ts: number) {
	const d = new Date(ts)
	const months = [
		'Jan',
		'Feb',
		'Mar',
		'Apr',
		'May',
		'Jun',
		'Jul',
		'Aug',
		'Sep',
		'Oct',
		'Nov',
		'Dec',
	]
	const hh = String(d.getHours()).padStart(2, '0')
	const mm = String(d.getMinutes()).padStart(2, '0')
	return `${months[d.getMonth()]}-${String(d.getDate()).padStart(2, '0')}-99 ${hh}:${mm}:00 PDT`
}
