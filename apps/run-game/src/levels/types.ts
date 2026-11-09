import type { RunnerName } from '@/data/runners'
import type { FikaItem } from '../game/fika'
import type { Terrain } from '../game/terrain'

/** Something on the course, at `x` along it. */
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
	/** Fika, for a speed boost, `height` off the ground: some you have to jump for. */
	| { kind: 'fika'; x: number; height: number; item: FikaItem }
	/** A club member out volunteering, cheering you on as you pass: another boost. */
	| { kind: 'cheer'; x: number; member: RunnerName }

/** The game's colours a level can change: the sky, the grass and the path. */
export type PaletteVar =
	| '--sky-blue-top'
	| '--sky-blue-bottom'
	| '--grass-green'
	| '--grass-dark-green'
	| '--grass-darker-green'
	| '--dirt-brown'
	| '--dirt-dark-brown'
	| '--dirt-darker-brown'

/** Something dotted about the backdrop: its art, drawn `scale` times its size, through `filter`. */
export interface BackdropPiece {
	asset: string
	/** Its height, before scaling: what peeks over the hills is placed by its top. */
	height: number
	scale?: number
	/** A CSS filter, to recolour it. */
	filter?: string
}

/** How a level looks, where it isn't Haga's own sky, grass and trees. */
export interface LevelLook {
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
}

export interface Level {
	id: string
	/** Its number, on the sign by the start: where it is in `LEVELS`. */
	number: number
	name: string
	/** A line about it, on the course select screen. */
	blurb: string
	/** Out of 3, on the course select screen. */
	difficulty: number
	look?: LevelLook
	terrain: Terrain
	obstacles: Obstacle[]
	/**
	 * Who can be run director, counting everyone down at the start: the first
	 * of them who isn't the one running.
	 */
	runDirectors: RunnerName[]
	/**
	 * Who's out volunteering. A cheerer who turns out to be the one running is
	 * swapped for the next of these instead (see `createWorld`).
	 */
	volunteers: RunnerName[]
	/** Scenery along the course: trees, shrubs and flowers. */
	scenery: Scenery[]
	/** Furbies, hopping about the path and onto whoever runs by. */
	furbies?: { x: number; asset: string }[]
	/** Where corgis sit, waiting for someone to hop on and ride them. */
	corgis?: number[]
}

/** A level as it's written: its number comes from where it is in `LEVELS`. */
export type LevelDefinition = Omit<Level, 'number'>
