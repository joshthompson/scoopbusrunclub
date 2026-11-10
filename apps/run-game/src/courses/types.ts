import type { RunnerName } from '@/data/runners'
import type { FikaItem } from '../game/fika'
import type { Terrain } from '../game/terrain'

/** Something in the way on the course, at `x` along it: jump it or duck it, or stumble. */
export type Obstacle =
	/** Jump it, or stumble. */
	| { kind: 'rock'; x: number }
	/** A low branch: duck under it, or stumble. */
	| { kind: 'branch'; x: number }
	/** Slows you right down while you're in it. Jump it. */
	| { kind: 'mud'; x: number; width: number }
	/** On a running track: jump it, or knock it over and stumble. */
	| { kind: 'hurdle'; x: number }
	/** A hole in the track, `width` across: jump it, or trip in it. */
	| { kind: 'pothole'; x: number; width: number }
	/** Children playing football on the track, `count` of them: jump the lot. */
	| { kind: 'kids'; x: number; count: number }
	/**
	 * Geese on the path, `count` of them: jump them, or run into them, stumble,
	 * and they fly off honking. They're gone for whoever comes after.
	 */
	| { kind: 'geese'; x: number; count: number }
	/** An air vent on a roof, in City Rooftop: jump it, or stumble. */
	| { kind: 'vent'; x: number }
	/** A tombstone, in Halloween Town: jump it, or stumble. */
	| { kind: 'tombstone'; x: number }
	/**
	 * A Zombie: a runner, a club member, `who` picking which, risen from the
	 * grave and walking the wrong way, towards you, from `x`. Now and then a
	 * skeleton. Jump it, or stumble. Into an open grave it walks, it's gone;
	 * the bus scoops any it reaches.
	 */
	| { kind: 'zombie'; x: number; who: number; skeleton?: boolean }
	/**
	 * A Steam Vent, a grate in the ground: now and then it puffs, and whoever's
	 * on it as it does is fired up into the air.
	 */
	| { kind: 'steam'; x: number }
	/** Tourists, `count` of them, stood about in the way: jump them, or stumble. */
	| { kind: 'tourists'; x: number; count: number }
	/**
	 * A cyclist, riding towards you from `x`: jump them, or stumble. Riding
	 * round `loop`, from its far end to its near one, over and over, if it has one.
	 */
	| { kind: 'cyclist'; x: number; loop?: [from: number, to: number] }

/** Something on the course, at `x` along it, that speeds you up. */
export type Boost =
	/** Fika, `height` off the ground: some you have to jump for. */
	| { kind: 'fika'; x: number; height: number; item: FikaItem }
	/** A club member, a cheerer, cheering you on as you pass. */
	| { kind: 'cheer'; x: number; member: RunnerName }
	/**
	 * A Pumpkin, `carving` 1 to 5: run into it and it sits on your head,
	 * keeping you faster until you next stumble. One at a time.
	 */
	| { kind: 'pumpkin'; x: number; carving: number }
	/**
	 * A parkrun barcode token, `height` off the ground, just before a parkrun's
	 * finish: one last big boost, as at a real parkrun, where it's scanned at the end.
	 */
	| { kind: 'barcode'; x: number; height: number }

/** The game's colours a course can change: the sky, the grass and the path. */
export type PaletteVar =
	| '--sky-blue-top'
	| '--sky-blue-bottom'
	| '--grass-green'
	| '--grass-dark-green'
	| '--grass-darker-green'
	| '--dirt-brown'
	| '--dirt-dark-brown'
	| '--dirt-darker-brown'
	/** The words over the race, if the sky's too dark for the usual ink. */
	| '--hud-ink'
	/** And an outline round them, to read against clouds as well. */
	| '--hud-shadow'

/** Something dotted about the backdrop: its art, drawn `scale` times its size, through `filter`. */
export interface BackdropPiece {
	asset: string
	/** Its height, before scaling: what peeks over the hills is placed by its top. */
	height: number
	scale?: number
	/** A CSS filter, to recolour it. */
	filter?: string
}

/** How a course looks, where it isn't Haga's own sky, grass and trees. */
export interface CourseLook {
	palette?: Partial<Record<PaletteVar, string>>
	/**
	 * CSS filters over the backdrop's bands of hills, far to near. The near
	 * one runs down into the field behind the course, so it wants to match the
	 * grass.
	 */
	hills?: [far: string, middle: string, near: string]
	/** Over the sun. */
	sun?: string
	/** Over the trees and leaves on and over the course: the branches, the trees on the brow. */
	foliage?: string
	/** Over the mud. */
	mud?: string
	/** A stadium behind the course, in place of hills and scenery: see `StadiumBackdrop`. */
	stadium?: boolean
	/**
	 * The ground's layers, in place of Haga's path and grass: offsets from
	 * the line everyone runs along, each filled from there on down.
	 */
	ground?: [number, string][]
	/** What peeks over the far hills, in place of Haga's houses and pines. */
	far?: BackdropPiece[]
	/** What stands on the field behind the course, in place of Haga's trees. */
	near?: BackdropPiece[]
	/** How far apart those stand, from and to: closer for a forest. */
	nearGap?: [number, number]
	/** What a Gap's drop looks like: a CSS background, from the path down; `none` to see through it. */
	gap?: string
	/** In place of the sun, `scale` times its size, through the `sun` filter: a moon. */
	sunAsset?: string
	sunScale?: number
	/** Over the clouds. */
	clouds?: string
	/** Lightning, flashing now and then. */
	lightning?: boolean
	/** What flies about the sky: bats, ghosts. */
	skyFlyers?: SkyFlyer[]
	/**
	 * The trees over the brow, where the course runs high, in place of
	 * Haga's: or none, on a course with no trees.
	 */
	horizonTrees?: [string, string] | false
	/** The sign by the start, in place of the purple one, and its lettering's colour. */
	sign?: string
	signInk?: string
	/** The bus's own look, in place of the yellow one: see `BusLook`. */
	bus?: BusLook
	/** How a Platform looks: see `PlatformLook`. */
	platform?: PlatformLook
	/**
	 * What's on the horizon, in place of the hills and what's on them: two
	 * bands, far and near, each a picture repeated along it. A city's
	 * skyline, mountains, the pyramids.
	 */
	horizon?: {
		far: string
		near: string
		fill: string
		/** Spires and towers rising out of the far band's roofs, behind it: a strip as wide as you like. */
		spires?: string
	}
	/**
	 * A bridge the course ends on, from `from` on: over water, its underside
	 * this colour, the water in front of it and behind.
	 */
	bridge?: {
		from: number
		/** Where it ends, on land again. */
		to: number
		/** Its side, the top of its side catching the light, and its underbelly, in shadow. */
		underside: string
		highlight: string
		underbelly: string
		water: string
		rail: string
		/**
		 * The quay wall at its ends, where the water meets the land, facing
		 * the water: drawn as at the far end, and turned round at the near one.
		 */
		quay?: string
	}
	/** How buildings look, on a course over rooftops: see `BuildingLook`. */
	buildings?: BuildingLook
	/** Over the geese: pigeons, in a city. */
	geese?: string
	/**
	 * Battlements along the path, a wall's: merlons on the parapet behind it,
	 * and a parapet with its own in front, drawn in front of the runners.
	 */
	battlements?: { stone: string; shade: string; floor?: string }
	/**
	 * Pyramids the path goes up and over, each from foot to foot: their
	 * stepped faces drawn in front of it in courses of blocks, `block` with
	 * `mortar` between.
	 */
	pyramids?: { feet: [number, number][]; block: string; mortar: string }
	/** A Cave's rock: the rock itself, its underside's edge, the back wall inside, and the grass over it. */
	cave?: {
		rock: string
		seam: string
		edge: string
		wall: string
		grass: string
	}
}

/**
 * A Cave the course runs through, under a hill: rock over the Ground, its
 * underside the Ceiling. Where it comes down too low to stand, it's a
 * Tunnel: slide into it and you roll through.
 */
export interface Cave {
	/** The Ceiling at `x`: the underside of the rock, if there's rock over the Ground there. */
	ceiling: (x: number) => number | undefined
	/** The top of the hill it's under, at `x`: grass on it, and sky over it. */
	surface: (x: number) => number | undefined
	/** How far down the hill goes in front of the path, at `x`: the rock under it. */
	foot: (x: number) => number | undefined
	/** Where it starts and ends: its mouth, and the way out. */
	from: number
	to: number
}

/** Buildings' roofs, the parapet along their front edge, and their fronts, taken in turn. */
export interface BuildingLook {
	roof: string
	parapet: string
	/** CSS backgrounds, one building after another. */
	facades: string[]
	/** Each one's own colour, plain: for its side, in shade. */
	walls: string[]
}

/** The bus's pictures, facing right: its body, windows and scoop. */
export interface BusLook {
	body: string
	windows: string
	scoop: string
	/** A drill in place of the scoop, turning: its two frames, one after the other. */
	drill?: [string, string]
}

/**
 * Something crossing the sky, right to left, `count` of them, each taking
 * `seconds` to get across: a sheet of `frames` side by side, flapping.
 */
export interface SkyFlyer {
	asset: string
	width: number
	height: number
	frames?: number
	scale?: number
	count: number
	seconds: number
	/** How far it bobs up and down as it goes. */
	bob?: number
	/** From and to, how far down the sky. */
	band: [number, number]
	opacity?: number
}

/** A Platform's colours: its top, its face, and the darker edge under it. */
export interface PlatformLook {
	top: string
	face: string
	edge: string
	/** How deep its face is drawn, under its top. */
	depth?: number
	/** A Moving Platform hangs from a crane, on a cable this colour. */
	cable?: string
}

/**
 * A Platform: something raised to land on, `width` across from `x`, its
 * top `height` above the Ground's line at `x`. Runners jump up through it
 * from below, and drop off it by running off the end, or ducking.
 */
export interface PlatformDefinition {
	x: number
	width: number
	height: number
	/**
	 * A Moving Platform: it swings `x` along and `y` up (either can be
	 * negative) and back, and round again, every `ticks`.
	 */
	move?: {
		x?: number
		y?: number
		ticks: number
		/** How far through its swing it is at tick 0, out of 1. */
		phase?: number
	}
	/** How deep it's drawn, if not its course's Platforms' depth: a terrace, down to the ground. */
	depth?: number
	/**
	 * Solid all through, this deep: a shelf of rock, with its underside a
	 * Ceiling over whoever's under it. No jumping up through it.
	 */
	solid?: number
}

/** Scenery along the course: a tree, a shrub, a flower, or a furby. */
export interface Scenery {
	x: number
	asset: string
	/** Drawn this many times its pixel size. */
	scale?: number
	/** A CSS filter, to recolour it. */
	filter?: string
	/** Hops on the spot now and then. */
	hops?: boolean
	/**
	 * How far back from the path it stands, up the field behind it, if not
	 * the usual: a crystal on a Cave's floor, with no field, stands right
	 * on the path's back edge.
	 */
	setBack?: number
	/**
	 * Stood on the floor where its middle is, up and down with it, rather
	 * than on the highest of it under it, clear of a slope: a crystal.
	 */
	onFloor?: boolean
	/**
	 * A name carved on it, a runner's, on its panel: `x`, `y`, `width` and
	 * `height` in its own pixels. A tombstone's.
	 */
	carved?: [x: number, y: number, width: number, height: number]
}

export interface Course {
	id: string
	/** Its number, on the sign by the start: where it is in `COURSES`. */
	number: number
	name: string
	/** A line about it, on the course select screen. */
	blurb: string
	/** A real parkrun, with its own hills: raced as "Haga parkrun", not just "Haga". */
	parkrun?: boolean
	look?: CourseLook
	terrain: Terrain
	obstacles: Obstacle[]
	boosts: Boost[]
	/**
	 * Who can be run director, counting everyone down at the start: the first
	 * of them who isn't the one running.
	 */
	runDirectors: RunnerName[]
	/**
	 * Who's out cheering. A cheer by whoever turns out to be the one running is
	 * by the next of these instead (see `createWorld`).
	 */
	cheerers: RunnerName[]
	/** Scenery along the course: trees, shrubs and flowers. */
	scenery: Scenery[]
	/** How many of the Pacers are skeletons, out of 1: on Halloween Town. */
	skeletons?: number
	/** Guard towers over the walkway, where they stand: see `createTower`. */
	towers?: number[]
	/** Platforms over the Ground, in order along the course. */
	platforms?: PlatformDefinition[]
	/** A Cave it runs through, under a hill. */
	cave?: Cave
	/** Furbies, hopping about the path and onto whoever runs by. */
	furbies?: { x: number; asset: string }[]
	/** Where corgis sit, waiting for someone to hop on and ride them. */
	corgis?: number[]
	/** What those are: corgis, or on Machu Picchu, llamas. */
	ride?: 'corgi' | 'llama'
	/**
	 * Geese flying over, from behind, `count` of them, as whoever's in front
	 * gets to `x`. Jump into one and it carries you.
	 */
	flyovers?: { x: number; count: number }[]
	/** What those are: geese, or on the Great Wall, a dragon. */
	flyer?: 'goose' | 'dragon'
}

/** A course as it's written: its number comes from where it is in `COURSES`. */
export type CourseDefinition = Omit<Course, 'number'>
