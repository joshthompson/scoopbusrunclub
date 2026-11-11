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
	/**
	 * On a running track: jump it, or knock it over and stumble. A `tall`
	 * one, slide under.
	 */
	| { kind: 'hurdle'; x: number; tall?: boolean }
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
	| {
			kind: 'steam'
			x: number
			/**
			 * A Giant Vent: a sewer's way out, firing whoever's on it up and on,
			 * out of the ground and back up onto the street.
			 */
			giant?: boolean
	  }
	/**
	 * A Mummy, in a tomb, shuffling to and fro `pace` either side of `x`,
	 * arms out: jump it, or stumble. The bus scoops any it reaches.
	 */
	| { kind: 'mummy'; x: number; pace: number }
	/** Tourists, `count` of them, stood about in the way: jump them, or stumble. */
	| { kind: 'tourists'; x: number; count: number }
	/**
	 * A cyclist, riding towards you from `x`: jump them, or stumble. Riding
	 * round `loop`, from its far end to its near one, over and over, if it has one.
	 */
	| {
			kind: 'cyclist'
			x: number
			loop?: [from: number, to: number]
			/** Or riding back and forth between these, turning round at each. */
			shuttle?: [from: number, to: number]
	  }
	/**
	 * A Swamp Man, in a pool of sludge at `x`: now and then he rises out of
	 * it, and grabs whoever's in reach, holding them still till he sinks
	 * back. Jump him.
	 */
	| { kind: 'swampman'; x: number }
	/**
	 * A Sewage Drain, a grate in the Ceiling at `x`, under the street: in
	 * waves, everything washed down off the street pours out of it. Through
	 * it while it's pouring, and you're splattered.
	 */
	| { kind: 'sewage'; x: number }
	/**
	 * Hands under a graveyard, at `x`: only their fingertips showing, till
	 * someone steps on them, and they burst up and grab their ankles, holding
	 * them still a moment. Jump them.
	 */
	| { kind: 'hands'; x: number }
	/**
	 * Gulls, `count` of them, wheeling about over the sea, `height` over it:
	 * fly round them, or into them and stumble, scattering them for whoever
	 * comes after.
	 */
	| { kind: 'gulls'; x: number; height: number; count: number }
	/**
	 * A hot-air balloon over the sea, its middle drifting slowly up and down
	 * between `low` and `high` over it: over it or under it, or bump into it.
	 */
	| { kind: 'balloon'; x: number; low: number; high: number }
	/**
	 * A Storm Cloud, its middle `height` over the sea: now and then lightning
	 * strikes down out of it into the sea. Into the cloud, or under it as
	 * it strikes, and you're zapped.
	 */
	| { kind: 'storm'; x: number; height: number }
	/**
	 * A wind turbine out at sea, its hub `height` over it, its blades
	 * turning: between them, or over the lot. Into a blade, or its tower,
	 * and you stumble.
	 */
	| { kind: 'turbine'; x: number; height: number }
	/**
	 * A whale, surfacing now and then, and spouting `height` up into the
	 * air: through the spout as it blows, and you're soaked.
	 */
	| { kind: 'whale'; x: number; height: number }

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
	/**
	 * A Ring in the sky, its middle `height` over the sea: glide through it
	 * for a boost. There for everyone, once each.
	 */
	| { kind: 'ring'; x: number; height: number }

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
	/** A Pothole's colours: a road's, in place of a running track's. */
	pothole?: PotholeLook
	/** Over the mud. */
	mud?: string
	/** What's said, stepping in it, in place of "Squelch!": a spilt drink's. */
	mudWord?: string
	/** Over the rocks, recoloured: the Pyramids' sandstone. */
	rock?: string
	/**
	 * Pictures in place of the rock, taken in turn along the course, each
	 * drawn `width` by `height`: luggage on a ferry. Still jumped as a rock.
	 */
	rocks?: { asset: string; width: number; height: number }[]
	/**
	 * Colours that change along the course, for the Ground's layers to fill
	 * with, as `url(#id)`: each stop a colour from `x` on, till the next.
	 * A ferry's carpet indoors, its decking out on deck, a quay's granite.
	 */
	strips?: {
		id: string
		stops: [x: number, colour: string][]
		/** Blended from each colour to the next, rather than changing at once: grass to rock to snow. */
		blend?: boolean
	}[]
	/** A stadium behind the course, in place of hills and scenery: see `StadiumBackdrop`. */
	stadium?: boolean
	/**
	 * The ground's layers, in place of Haga's path and grass: offsets from
	 * the line everyone runs along, each filled from there on down.
	 */
	ground?: [offset: number, fill: string, smooth?: boolean][]
	/**
	 * Its Ledges, the steps up it a jump high, drawn as rock: a buttress of
	 * it, its strata, snow on top, and a fixed rope down it, or a ladder up
	 * it if it's a big one.
	 */
	ledgeRock?: {
		rock: string
		shade: string
		lit: string
		snow: string
		rope: string
		ladder: string
	}
	/** What peeks over the far hills, in place of Haga's houses and pines. */
	far?: BackdropPiece[]
	/** What stands on the field behind the course, in place of Haga's trees. */
	near?: BackdropPiece[]
	/** How far apart those stand, from and to: closer for a forest. */
	nearGap?: [number, number]
	/**
	 * SVG `<defs>` of the course's own, for the Ground's layers to fill with
	 * as `url(#id)`: patterns, a mountain's rock and snow.
	 */
	groundDefs?: string
	/**
	 * Snow falling, over everything, fading in from `from` along the course
	 * to as thick as it gets by `full`.
	 */
	snow?: { from: number; full: number }
	/** What a Gap's drop looks like: a CSS background, from the path down; `none` to see through it. */
	gap?: string
	/**
	 * What its Gaps look like inside, drawn over `gap`: ragged walls going
	 * down either side, darker and darker the deeper, so it's plain it's a
	 * drop. See `PitLook`.
	 */
	pit?: PitLook
	/** Its Gaps on fire: pits down into hell, flames licking up out of them, embers rising. */
	pitFire?: boolean
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
		/**
		 * More bands, nearer still, each lower down and going by faster than
		 * the last, `height` tall, and its colour on down below it: so the
		 * view's full right down to the course.
		 */
		nearer?: { asset: string; height: number; fill: string }[]
		/**
		 * Its own sky, top to bottom, in place of the course's: deeper blue
		 * the higher up a mountain it is. On up over the top of the screen,
		 * as the backdrop sinks away under a climb.
		 */
		sky?: [top: string, bottom: string]
	}
	/**
	 * How much the backdrop goes with the camera looking up or down, in
	 * place of the usual little: below 0, it rises as the camera does, as
	 * the horizon at sea stays level with your eye. High up on a ferry's
	 * sun deck, the sea's still there over its rail.
	 */
	horizonLift?: number
	/**
	 * Up a mountain: the horizon rises with the camera looking up, rather
	 * than sinking, up to this much and no more, so it's still over the
	 * path, not behind the mountain, however high it climbs.
	 */
	horizonRise?: number
	/**
	 * More horizons, one after another along the course, each fading in
	 * over the last as the camera gets to `from`: what goes by on a voyage,
	 * from one city out through the islands and over the sea to the next.
	 */
	voyage?: { from: number; horizon: NonNullable<CourseLook['horizon']> }[]
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
		/**
		 * Open water, out to the horizon, all along the course, under
		 * whatever's across it: no quay along its far side.
		 */
		open?: boolean
		/** The quay's stone under the path before it too, not only past it: a quay at either end. */
		stoneBefore?: boolean
	}
	/**
	 * A rainbow the path goes up and over, `from` to `to`: its bands under
	 * the path, nothing under it but the field, its ground `base` there.
	 */
	rainbow?: { from: number; to: number; base: (x: number) => number }
	/** Its Steam Vents as bouncy toadstools, rather than grates. */
	bouncers?: boolean
	/** How buildings look, on a course over rooftops: see `BuildingLook`. */
	buildings?: BuildingLook
	/** The sea's colours, and its island's sand, if it has a sea: see `Course['sea']`. */
	sea?: SeaLook
	/**
	 * How much nearer than the path's middle Tourists stand, down the
	 * screen: in front of what's on a ferry's floor, a lorry, a shelf,
	 * rather than stood on the same line as its foot.
	 */
	touristsNearer?: number
	/**
	 * Where the course select's preview of it starts, along it, if not a
	 * third of the way round: at a ferry's stern, to see inside it.
	 */
	previewFrom?: number
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
		/**
		 * In place of the grass, bands down from its top, each `height` deep,
		 * one under another: a street's pavement and road, over a sewer.
		 */
		road?: [height: number, colour: string][]
		/**
		 * Laid in brick, rather than rock: `rock` the bricks, `seam` the
		 * mortar, `edge` their lit top edges; its back wall too, in `wall`.
		 */
		bricks?: boolean
		/**
		 * Pictures tiled over it, in place of rock or brick (see
		 * `CaveTiles`): a ship's plated side, its hull under the decks, its
		 * bulkheads inside.
		 */
		tiles?: CaveTiles
		/**
		 * No hole bored behind the bus: it fits through, all the way, as on a
		 * ferry's decks, and what's on its back wall stays there.
		 */
		bore?: false
	}
}

/**
 * Inside a Gap: its walls, either side, lit on the far side and in shadow
 * on the near; seams across them; and what's at its rims, and down it.
 */
export interface PitLook {
	wall: string
	shade: string
	/** Lines across the walls: bricks' mortar, cracks in ice. */
	seams?: string
	/** A crevasse's: snow over its lips, icicles hanging off them. */
	ice?: { snow: string; icicle: string }
	/** A sewer's: slime running down its walls, and sludge glinting far down it. */
	slime?: { drip: string; sludge: string; shine: string }
}

/**
 * Pictures tiled over a Cave, each `width` by `height`, lined up with the
 * world from its top left, so a band in one is always at the same height:
 * its rock, over it and as seen from outside; its front, under the path;
 * and its back wall.
 */
export interface CaveTiles {
	rock: CaveTile
	front?: CaveTile
	wall?: CaveTile
}
export interface CaveTile {
	asset: string
	width: number
	height: number
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
	/** How much of its way in shows from outside it, if not the usual. */
	mouth?: number
	/**
	 * Pictures on it, each its middle at `x`, `sink` down into what it's on:
	 * on the hill's top (the Sphinx's head), just behind the path, or just
	 * in front of it (its paws, either side of its way in).
	 */
	features?: {
		asset: string
		x: number
		width: number
		height: number
		sink?: number
		on?: 'surface' | 'behind' | 'in front' | 'path'
	}[]
	/**
	 * Where it's dug down under the sand, rather than through a hill: the
	 * sand's top, `x` along. Under it, it's sand, drawn as the ground; over
	 * it, it's rock.
	 */
	sand?: (x: number) => number | undefined
	/**
	 * Over each Tunnel's way in, `from` to `to`: yellow and black stripes
	 * along the edge of the rock over it, so it's plain there's no standing
	 * up in it. Along the Ceiling; or level at `roof` (a y), under a shelf of
	 * solid rock, drawn over its face.
	 */
	warnings?: { from: number; to: number; roof?: number }[]
	/**
	 * A ship's hull: its front drawn on down under the path wherever it has
	 * a `foot`, Ceiling or not, under its open decks too. Anyone aboard,
	 * up on its roof too, has it opened up.
	 */
	hull?: boolean
}

/**
 * The sea: its water, the light on it and its depths, and the foam along
 * its edges; and the island's sand, its path through it, and its wet edge
 * where the sea meets it.
 */
export interface SeaLook {
	water: string
	light: string
	deep: string
	foam: string
	sand: string
	path: string
	wet: string
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
	/** Where the drill goes on, the scoop till then: from the start, if not said. */
	drillFrom?: number
	/**
	 * Legs in place of its wheels, crawling: four of them, a spider's, to
	 * climb a mountain on. Their metal, the joints' bolts, and their feet.
	 */
	legs?: { metal: string; shade: string; bolt: string; foot: string }
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

/** A Pothole's colours: its broken rim, the hole, its shadowed far wall, and rain lying in it. */
export interface PotholeLook {
	rim?: string
	hole?: string
	deep?: string
	/** Rain in its bottom, and the light on it. None on a running track. */
	water?: string
	shine?: string
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
	/** Candyfloss clouds, puffy, not slabs. */
	cloud?: boolean
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
	/**
	 * A picture in place of the slab, `width` by `height`, its top `top` px
	 * down from the picture's: a little ferry, its deck to stand on.
	 */
	art?: { asset: string; width: number; height: number; top: number }
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
	 * on the path's back edge. Below 0, it's on the path itself, that far in
	 * from its back edge: a chimney on a roof.
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
	/**
	 * How much hills slow the bus going up them, out of how much they
	 * usually do: less, up a mountain, on legs, gripping, so it gains on
	 * you up the steepest of it.
	 */
	busHillPull?: number
	/**
	 * How far ahead up the hill the camera looks, up a mountain, so what's
	 * coming is in view, not off the top of the screen.
	 */
	lookAhead?: number
	/** Platforms over the Ground, in order along the course. */
	platforms?: PlatformDefinition[]
	/** A Cave it runs through, under a hill. */
	cave?: Cave
	/** Furbies, hopping about the path and onto whoever runs by. */
	furbies?: { x: number; asset: string }[]
	/** Where corgis sit, waiting for someone to hop on and ride them. */
	corgis?: number[]
	/**
	 * What those are: corgis, or on Machu Picchu, llamas, at the Pyramids,
	 * camels, in Huddinge's forest, deer, in Furby Fields, unicorns, on
	 * The Cliff, gliders, parked along its top, or up Everest, mountain goats.
	 */
	ride?: 'corgi' | 'llama' | 'camel' | 'deer' | 'glider' | 'unicorn' | 'goat'
	/**
	 * The sea, from the foot of a cliff, `from`, to an island's shore, `to`:
	 * a Gap, the Ground's line across it at its surface, `level`. Down into
	 * it is Fallen, there and then; the bus floats across it, at `busSpeed`
	 * at least, under full steam. A glider comes down on the island, past it.
	 */
	sea?: { from: number; to: number; level: number; busSpeed: number }
	/** How high a glider can go, at most: a y, its rider's feet. */
	sky?: number
	/**
	 * A Giant Furby, its head a Cave (see `cave`), its mouth the way in at
	 * `x`, and out the back at `to`: its face on the front, looking at
	 * whoever's coming, its beak swung open as they get near.
	 */
	giantFurby?: { x: number; to: number }
	/**
	 * Geese flying over, from behind, `count` of them, as whoever's in front
	 * gets to `x`. Jump into one and it carries you.
	 */
	flyovers?: { x: number; count: number }[]
	/** What those are: geese, or on the Great Wall, a dragon. */
	flyer?: 'goose' | 'dragon'
	/**
	 * Where the bus digs its own way, its wheels on this rather than the
	 * Ground: down through the street after whoever's dropped down a
	 * manhole, and back up out of it. The Ground, where it's undefined.
	 */
	busFloor?: (x: number) => number | undefined
}

/** A course as it's written: its number comes from where it is in `COURSES`. */
export type CourseDefinition = Omit<Course, 'number'>
