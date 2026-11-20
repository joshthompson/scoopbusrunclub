// The classic bus: the website's, turned round to chase to the right.
import classicBackAsset from '../../assets/bus/bus-back.png'
import classicSpookyAsset from '../../assets/bus/bus-halloween.png'
import classicBodyAsset from '../../assets/bus/bus.png'
import classicSpookyScoopAsset from '../../assets/bus/scoop-halloween.png'
import classicScoopAsset from '../../assets/bus/scoop.png'
import classicSleighAsset from '../../assets/bus/sleigh.png'
import wheel1Asset from '../../assets/bus/wheel1.png'
import wheel2Asset from '../../assets/bus/wheel2.png'
import wheel3Asset from '../../assets/bus/wheel3.png'
import wheel4Asset from '../../assets/bus/wheel4.png'
import classicSpookyWindowsAsset from '../../assets/bus/windows-halloween.png'
import classicWindowsAsset from '../../assets/bus/windows.png'
import { type BusArtwork, busArtwork } from '../../saved/settings'
import {
	BUS_GROUND,
	BUS_HEIGHT,
	BUS_ROOF,
	BUS_SCOOP_AT,
	BUS_SCOOP_HEIGHT,
	BUS_SCOOP_TIP,
	BUS_SCOOP_WIDTH,
	BUS_WHEEL_HEIGHT,
	BUS_WHEEL_WIDTH,
	BUS_WIDTH,
	type BusArt,
	SCOOP_BUS,
	SCOOP_FRONT,
	SLEIGH,
	SLEIGH_TAIL,
	SPOOK_BUS,
	WHEEL_BOTTOM,
} from './bus'
import { type BusJets, NEW_BUS_JETS } from './busJets'
import { CLASSIC_LEGS, type LegsFit, NEW_LEGS } from './busLegs'
import { CLASSIC_BUS_JETS } from './classicBusJets'
import { type BusDrill, classicBusDrill, newBusDrill } from './drill'

type Vector = { x: number; y: number }

/** A picture on the bus, and where it goes on its picture. */
export interface BusPart extends Vector {
	asset: string
	width: number
	height: number
}

/** One of a bus's looks: its body, its scoop, its wheels, and (on the classic bus) its windows, see-through, over its back. */
export interface BusLooks {
	body: string
	/**
	 * Its body with its wheel arches skirted over, for when its wheels are
	 * away (on its jets or its legs), so no empty wells show; the classic
	 * bus's wheels are behind it, so it has none.
	 */
	closed?: string
	scoop: string
	wheels: BusPart[]
	windows?: BusPart
}

/**
 * A bus's artwork, and how everything fits it: picked in Options, the new
 * bus (`draw/art/bus.ts`) or the classic one. All in its own pixels, from
 * its top left.
 */
export interface BusStyle {
	width: number
	height: number
	/** From its top to the line everyone runs along: where it's put on the Ground. */
	wheelBottom: number
	/** Its scoop's front, from its back: where it scoops. */
	scoopFront: number
	/** On the menus, where its top is from the path's: its near wheels on its near edge. */
	menuTop: number
	/** Its back, seen through its windows; none, if they're painted on. */
	back?: string
	/** Whether its wheels are drawn over its body, in its arches, or behind it. */
	wheelsOver: boolean
	/** Where its glider's struts' feet go, and its condor's talons grip: on its roof. */
	glider: Vector
	condor: Vector
	/** Its scoop's size and place, and where it scoops from (its tip) and its Scoop Arm goes up, in its own picture. */
	scoop: {
		width: number
		height: number
		at: Vector
		tip: Vector
		armX: number
	}
	sleigh: BusPart
	/** Where the snow sprays off its sleigh's runners. */
	spray: Vector
	drill: () => BusDrill
	legs: LegsFit
	jets: BusJets
	plain: BusLooks
	spooky: BusLooks
}

/** The new bus's looks, its wheels each their size. */
const looks = (art: BusArt): BusLooks => ({
	body: art.body,
	closed: art.closed,
	scoop: art.scoop,
	wheels: art.wheels.map((w) => ({
		...w,
		width: BUS_WHEEL_WIDTH,
		height: BUS_WHEEL_HEIGHT,
	})),
})

const NEW_BUS: BusStyle = {
	width: BUS_WIDTH,
	height: BUS_HEIGHT,
	wheelBottom: WHEEL_BOTTOM,
	scoopFront: SCOOP_FRONT,
	menuTop: 52 - BUS_GROUND,
	wheelsOver: true,
	glider: { x: BUS_ROOF.x, y: BUS_ROOF.y + 2 },
	condor: { x: BUS_ROOF.x, y: BUS_ROOF.y + 6 },
	scoop: {
		width: BUS_SCOOP_WIDTH,
		height: BUS_SCOOP_HEIGHT,
		at: BUS_SCOOP_AT,
		tip: BUS_SCOOP_TIP,
		armX: BUS_SCOOP_TIP.x - 18,
	},
	sleigh: { asset: SLEIGH, x: 0, y: 0, width: BUS_WIDTH, height: BUS_HEIGHT },
	spray: { x: SLEIGH_TAIL.x, y: SLEIGH_TAIL.y - 10 },
	drill: newBusDrill,
	legs: NEW_LEGS,
	jets: NEW_BUS_JETS,
	plain: looks(SCOOP_BUS),
	spooky: looks(SPOOK_BUS),
}

/** The classic bus's wheels: near and far, front and back, each its own picture. */
const CLASSIC_WHEELS: BusPart[] = [
	{ asset: wheel1Asset, x: 140, y: 105, width: 34, height: 38 },
	{ asset: wheel2Asset, x: 208, y: 103, width: 34, height: 38 },
	{ asset: wheel3Asset, x: 68, y: 105, width: 19, height: 23 },
	{ asset: wheel4Asset, x: 24, y: 102, width: 26, height: 30 },
]
const CLASSIC_WIDTH = 247

const CLASSIC_BUS: BusStyle = {
	width: CLASSIC_WIDTH,
	height: 127,
	wheelBottom: 141,
	scoopFront: CLASSIC_WIDTH + 22,
	menuTop: 46 - 143,
	back: classicBackAsset,
	wheelsOver: false,
	glider: { x: CLASSIC_WIDTH / 2 + 10, y: 10 },
	condor: { x: CLASSIC_WIDTH / 2, y: 16 },
	scoop: {
		width: 88,
		height: 57,
		at: { x: 181, y: 94 },
		tip: { x: 80, y: 44 },
		armX: 44,
	},
	// Wider and taller than the bus, level with its front, and a little
	// higher, its runners where its wheels touch.
	sleigh: {
		asset: classicSleighAsset,
		x: CLASSIC_WIDTH - 312,
		y: -6,
		width: 312,
		height: 148,
	},
	spray: { x: CLASSIC_WIDTH - 312 + 14, y: 141 - 10 },
	drill: classicBusDrill,
	legs: CLASSIC_LEGS,
	jets: CLASSIC_BUS_JETS,
	plain: {
		body: classicBodyAsset,
		scoop: classicScoopAsset,
		wheels: CLASSIC_WHEELS,
		windows: {
			asset: classicWindowsAsset,
			x: 9,
			y: 26,
			width: 212,
			height: 40,
		},
	},
	spooky: {
		body: classicSpookyAsset,
		scoop: classicSpookyScoopAsset,
		wheels: CLASSIC_WHEELS,
		windows: {
			asset: classicSpookyWindowsAsset,
			x: 9,
			y: 26,
			width: 212,
			height: 40,
		},
	},
}

const STYLES: Record<BusArtwork, BusStyle> = {
	new: NEW_BUS,
	classic: CLASSIC_BUS,
}

/** The bus's artwork, as picked in Options. Read when a race starts, and on the menus as it's changed. */
export const busStyle = () => STYLES[busArtwork()]
