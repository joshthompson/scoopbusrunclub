import moon from '@/assets/background/moon8.png'
import batAsset from '@/assets/halloween/bat.png'
import ghost1 from '@/assets/halloween/ghost1.png'
import ghost2 from '@/assets/halloween/ghost2.png'
import ghost3 from '@/assets/halloween/ghost3.png'
import ghost4 from '@/assets/halloween/ghost4.png'
import pumpkin2 from '@/assets/halloween/pumpkin2.png'
import skeletonSit from '@/assets/halloween/skeleton-sit.png'
import tombstone from '@/assets/halloween/tombstone.png'
import purpleSignHalloween from '@/assets/misc/purple-sign-halloween.png'
import shrub1 from '@/assets/misc/shrub1.png'
import tree1Halloween from '@/assets/misc/tree1-halloween.png'
import tree2Halloween from '@/assets/misc/tree2-halloween.png'
import type { RunnerName } from '@/data/runners'
import busHalloween from '../assets/bus/bus-halloween.png'
import scoopHalloween from '../assets/bus/scoop-halloween.png'
import windowsHalloween from '../assets/bus/windows-halloween.png'
import { START_X } from '../game/constants'
import { FIKA_ITEMS } from '../game/fika'
import { type Gap, createTerrain } from '../game/terrain'
import { seeded } from './kit/seeded'
import type {
	Boost,
	Course,
	CourseDefinition,
	Obstacle,
	SkyFlyer,
} from './types'

/**
 * Halloween Town: under a blood moon, through a graveyard. Open graves to
 * jump, tombstones with runners' names on, dead trees' branches, and
 * Zombies, club members risen from the grave, coming the wrong way, with
 * skeletons out running among everyone else. Pumpkins to wear, for speed, until you stumble.
 * The Spook Bus behind.
 */

const CHEERERS: RunnerName[] = [
	'august',
	'lyra',
	'keith',
	'anna',
	'josh',
	'rick',
	'eline',
]

const STEP_M = 10
const DISTANCE_M = 5000
/** Made up: low, rolling ground, a little lumpy. */
const heights = Array.from({ length: DISTANCE_M / STEP_M + 1 }, (_, i) => {
	const m = i * STEP_M
	return 5 + 4 * Math.sin(m / 380 - 1.2) + 1.5 * Math.sin(m / 120)
})

/** Open graves, every so often, wider further round. */
function digGraves(): Gap[] {
	const random = seeded(1031)
	const graves: Gap[] = []
	for (let x = START_X + 1800; x < START_X + DISTANCE_M * 4 - 1200; ) {
		const progress = (x - START_X) / (DISTANCE_M * 4)
		const width = Math.round(100 + progress * 50 + random() * 30)
		graves.push({ from: x, to: x + width })
		x += 1900 + random() * 1400
	}
	return graves
}

const graves = digGraves()
const terrain = createTerrain(heights, STEP_M, DISTANCE_M, { gaps: graves })

/** Room left clear either side of a grave, to jump it from and land past it. */
const GRAVE_ROOM = 240
const nearGrave = (x: number) =>
	graves.some((g) => x > g.from - GRAVE_ROOM && x < g.to + GRAVE_ROOM)

/**
 * The panel on a tombstone's face, under its RIP, where a name goes: as the
 * website's tombstone sign has it, in the stone's own pixels.
 */
const TOMBSTONE_PANEL: [number, number, number, number] = [9, 22, 22, 22]

/** Leaves and grass in the dark: grey, dead, and hardly lit. */
const DEAD = 'grayscale(0.7) sepia(0.35) brightness(0.45)'

function layOut(): Pick<Course, 'obstacles' | 'boosts' | 'scenery'> {
	const random = seeded(3110)
	const obstacles: Obstacle[] = []
	const boosts: Boost[] = []
	let fika = 0
	let x = START_X + 700
	while (x < terrain.finishX - 500) {
		const roll = random()
		if (nearGrave(x)) {
			// Nothing on the edge of a grave: on past it.
		} else if (roll < 0.28) obstacles.push({ kind: 'tombstone', x })
		else if (roll < 0.42) obstacles.push({ kind: 'branch', x })
		else if (roll < 0.74)
			boosts.push({ kind: 'pumpkin', x, carving: 1 + Math.floor(random() * 5) })
		else if (roll < 0.86)
			boosts.push({
				kind: 'fika',
				x,
				height: random() < 0.5 ? 26 : 95,
				item: FIKA_ITEMS[fika++ % FIKA_ITEMS.length],
			})
		else
			boosts.push({
				kind: 'cheer',
				x,
				member: CHEERERS[Math.floor(random() * CHEERERS.length)],
			})
		const progress = (x - START_X) / terrain.length
		x += 380 + random() * (520 - progress * 260)
	}

	// Zombies, a steady stream of them, more the further round: their own
	// random numbers, so the rest stays where it is. Where they rise: they
	// walk towards you once you're near (see `zombieAt`), and any just past
	// a grave walk into it.
	const shamble = seeded(1313)
	for (let at = START_X + 1500; at < terrain.finishX; ) {
		if (!nearGrave(at))
			obstacles.push({
				kind: 'zombie',
				x: Math.round(at),
				// Some club member, risen: now and then just a skeleton.
				who: Math.floor(shamble() * 1000),
				skeleton: shamble() < 0.2,
			})
		const progress = (at - START_X) / terrain.length
		at += 900 + shamble() * (600 - progress * 300)
	}
	obstacles.sort((a, b) => a.x - b.x)

	// A graveyard along the path: dead trees, headstones, a pumpkin patch,
	// and now and then a skeleton sat down for a rest.
	const scenery: Course['scenery'] = []
	const pieces = [
		{ asset: tree1Halloween, filter: 'brightness(0.7)' },
		{ asset: tree2Halloween, filter: 'brightness(0.6)' },
		{ asset: tree2Halloween, filter: 'brightness(0.7)' },
		// Twice the size of the ones on the path, with someone's name on.
		{
			asset: tombstone,
			scale: 2,
			carved: TOMBSTONE_PANEL,
			filter: 'brightness(0.8)',
		},
		{
			asset: tombstone,
			scale: 2,
			carved: TOMBSTONE_PANEL,
			filter: 'brightness(0.68)',
		},
		{ asset: shrub1, filter: DEAD },
		{ asset: skeletonSit, scale: 2 },
		{ asset: pumpkin2, filter: 'brightness(0.8)' },
	]
	for (let at = -400; at < terrain.finishX + 900; at += 70 + random() * 200) {
		const piece = pieces[Math.floor(random() * pieces.length)]
		scenery.push({ x: Math.round(at), ...piece })
	}
	return { obstacles, boosts, scenery }
}

const ghost = (asset: string): SkyFlyer => ({
	asset,
	width: 32,
	height: 50,
	count: 1,
	seconds: 34,
	bob: 18,
	band: [70, 190],
	opacity: 0.7,
})

export const halloweenTown: CourseDefinition = {
	id: 'halloween-town',
	name: 'Halloween Town',
	blurb:
		'Under a blood moon: open graves, Zombies coming at you, and Pumpkins to wear.',
	terrain,
	runDirectors: ['august', 'keith'],
	cheerers: CHEERERS,
	// Skeletons, out for a run with everyone else.
	skeletons: 0.3,
	look: {
		palette: {
			'--sky-blue-top': '#0a0617',
			'--sky-blue-bottom': '#41122d',
			'--grass-green': '#2c3427',
			'--grass-dark-green': '#20271c',
			'--grass-darker-green': '#12170f',
			'--dirt-brown': '#5e4938',
			'--dirt-dark-brown': '#413126',
			'--dirt-darker-brown': '#231a12',
			'--hud-ink': '#f3e9ff',
			'--hud-shadow':
				'2px 0 #1b1530, -2px 0 #1b1530, 0 2px #1b1530, 0 -2px #1b1530',
		},
		hills: [
			'brightness(0.28) saturate(0.6) hue-rotate(230deg)',
			'brightness(0.24) saturate(0.6) hue-rotate(260deg)',
			'brightness(0.42) saturate(0.45)',
		],
		// A blood moon, glowing.
		sunAsset: moon,
		sunScale: 2,
		sun: 'brightness(0.62) sepia(1) saturate(9) hue-rotate(-42deg) drop-shadow(0 0 10px #ff2a12)',
		clouds: 'brightness(0.3) saturate(0.5)',
		lightning: true,
		skyFlyers: [
			{
				asset: batAsset,
				width: 13,
				height: 9,
				frames: 2,
				scale: 2,
				count: 8,
				seconds: 11,
				bob: 14,
				band: [60, 230],
			},
			ghost(ghost1),
			ghost(ghost2),
			ghost(ghost3),
			ghost(ghost4),
		],
		foliage: DEAD,
		gap: 'linear-gradient(to bottom, #2a1d12, #050302 70px)',
		far: [
			{ asset: tree2Halloween, height: 110, filter: 'brightness(0.3)' },
			{ asset: tree1Halloween, height: 120, filter: 'brightness(0.3)' },
			{ asset: tree2Halloween, height: 110, filter: 'brightness(0.25)' },
		],
		near: [
			{ asset: tree1Halloween, height: 120, filter: 'brightness(0.5)' },
			{ asset: tree2Halloween, height: 110, filter: 'brightness(0.5)' },
			{ asset: tombstone, height: 67, filter: 'brightness(0.45)' },
		],
		horizonTrees: [tree1Halloween, tree2Halloween],
		sign: purpleSignHalloween,
		// Gold doesn't show on its orange: black, as on the website.
		signInk: '#1a1208',
		bus: {
			body: busHalloween,
			windows: windowsHalloween,
			scoop: scoopHalloween,
		},
	},
	...layOut(),
}
