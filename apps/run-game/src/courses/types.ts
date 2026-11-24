import type { RunnerName } from '@/data/runners'
import type { FikaItem } from '../game/fika'
import type { PickupHat } from '../game/hats'
import type { Terrain } from '../game/terrain'
import type { Sound } from '../sfx'

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
	 * grave at `x`, stood there till anyone racing's near, and then walking
	 * the wrong way, towards you. Short of an open grave, or the end of its
	 * `range` if it has one, it turns round and walks back, to and fro.
	 * Jump it, or stumble. The bus scoops any it reaches.
	 */
	| {
			kind: 'zombie'
			x: number
			who: number
			range?: [from: number, to: number]
	  }
	/**
	 * A Steam Vent, a grate in the ground: occasionally it puffs, and whoever's
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
	 * A Swamp Man, in a pool of sludge at `x`: occasionally he rises out of
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
	 * A Storm Cloud, its middle `height` over the sea: occasionally lightning
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
	 * A whale, surfacing occasionally, and spouting `height` up into the
	 * air: through the spout as it blows, and you're soaked.
	 */
	| { kind: 'whale'; x: number; height: number }
	/**
	 * A snowman, on the piste: jump it, or ski into it and it bursts, a
	 * stumble for you and gone for whoever comes after.
	 */
	| { kind: 'snowman'; x: number }
	/**
	 * A traffic cone, stood in the way, `height` up on a platform, if it's
	 * not on the Ground: run into it and it's knocked over, flat, costing
	 * points and slowing you a little, by whoever gets to it first. In The
	 * Sewers, knocking every one over is its special goal all the same. A
	 * course can have something else in its place, knocked over the same
	 * (see `CourseLook.cone`): a wet floor sign, in a hospital.
	 */
	| { kind: 'cone'; x: number; height?: number }
	/**
	 * A Germ, a virus, floating in the body at `x`, bobbing up and down from
	 * `low` to `high` over the Ground (its bottom): under it, or over it, or
	 * into it, and you stumble. Land on top of it and it pops, a bounce off
	 * it, as off a head. Popping every one is Karolinska's special goal.
	 */
	| { kind: 'germ'; x: number; low: number; high: number }
	/**
	 * A heart valve in the floor at `x`: on every beat of the heart it flaps
	 * open, and whoever's stood on it is fired up into the air.
	 */
	| { kind: 'valve'; x: number }
	/**
	 * A crocodile in a River (see `River`), lying across the way at `x`,
	 * only its back, its eyes and its nostrils out of the water. Land on its
	 * back and it's a bounce off it, as off a head, and it dips under you;
	 * miss it and you're in the water, wading. Never in the way: you wade
	 * on past it. Bouncing on every one in turn, without touching down, is
	 * the Pyramids' special goal.
	 */
	| { kind: 'crocodile'; x: number }
	/**
	 * A stalactite in a Cave's high roof over `x`, The Caves': as anyone
	 * racing comes near, it shakes, cracks and falls, smashing on the floor
	 * (see `stalactites.ts`). Going flat out, you're past it before it's
	 * down; any slower and you're under it, a knock on the head and some
	 * speed lost, as with a traffic cone; slower still, and it's down before
	 * you get there, only rubble to run over.
	 */
	| { kind: 'stalactite'; x: number }
	/**
	 * A huge spider on a Cave's floor, The Caves', scuttling to and fro
	 * along its `range`, from the start (see `spiders.ts`). Into its legs
	 * or its face, and you stumble. Land on its head or its back, and it's
	 * a bounce off it, as off a head: it squashes down, and is none the
	 * worse for it.
	 */
	| { kind: 'spider'; x: number; range: [from: number, to: number] }
	/**
	 * A jellyfish, in Deep Water (see `DeepWater`), drifting slowly up and down
	 * from `low` to `high` over the seabed, its bell's bottom: swim round
	 * it, or into it and you're stung, a stumble. Its trailing tentacles
	 * sting too.
	 */
	| { kind: 'jellyfish'; x: number; low: number; high: number }
	/**
	 * A shark, in Deep Water, lurking `height` over the seabed at `x`: as
	 * anyone swims near, it's after whoever's nearest, faster than they
	 * swim. Swim clear of it, or it bites, a stumble; and it's off, done,
	 * biting nobody else (see `sharks.ts`).
	 */
	| { kind: 'shark'; x: number; height: number }
	/**
	 * An asteroid, tumbling through space on Rocket Launch (see `DeepWater`'s
	 * `space`), its middle drifting up and down from `low` to `high` over the
	 * Ground: swim round it, or into it and you're knocked, a stumble.
	 * `big` ones are twice the size.
	 */
	| {
			kind: 'asteroid'
			x: number
			low: number
			high: number
			big?: boolean
			/** A dead satellite, drifting the same, tilting: wider than it's tall. */
			satellite?: boolean
	  }
	/**
	 * An alien trooper, Rocket Launch's, stood `height` over the Ground at
	 * `x` (up on a Platform, if it's not on it), facing the way everyone's
	 * coming: as anyone comes near it fires slow plasma bolts at them, along
	 * at the height of its gun (see `space.ts`). Jump them, or duck under
	 * them; a `kneeling` one fires them low, to jump. Land on its head and
	 * it's knocked down and out, a bounce off it, as off a head. Into it,
	 * and you stumble.
	 */
	| { kind: 'alien'; x: number; height: number; kneeling?: boolean }

/** Something on the course, at `x` along it, that speeds you up. */
export type Boost =
	/** Fika, `height` off the ground: some you have to jump for. */
	| {
			kind: 'fika'
			x: number
			height: number
			item: FikaItem
			/**
			 * There for everyone, once each, rather than had by whoever gets
			 * to it first: gone once they all have. The waffle hut's.
			 */
			everyone?: boolean
	  }
	/** A club member, a cheerer, cheering you on as you pass. */
	| { kind: 'cheer'; x: number; member: RunnerName }
	/**
	 * A Pumpkin, `carving` 1 to 5: run into it and it sits on your head,
	 * keeping you faster until you next stumble. One at a time.
	 */
	| { kind: 'pumpkin'; x: number; carving: number }
	/**
	 * A hat, its brim `height` off the ground: run into it and it's on your
	 * head, in place of whatever was (see `hats`). The first to it has it.
	 */
	| { kind: 'hat'; x: number; height: number; hat: PickupHat }
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
	/**
	 * A slalom gate across the piste, its flag `red` or `blue`: through it,
	 * on the ground or in the air, for a boost. There for everyone, once each.
	 */
	| { kind: 'gate'; x: number; colour: 'red' | 'blue' }

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
	/**
	 * The low branch's pictures, its tree and its limb, in place of the
	 * summer oak's: the same size, 190 by 260, the limb where the oak's is.
	 * Turned for autumn, at Huddinge.
	 */
	branch?: { tree: string; limb: string }
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
	rocks?: {
		asset: string
		width: number
		height: number
		/** Only from and to here along the course, if not all the way: an IV stand in a hospital, a crumb on a table. */
		from?: number
		to?: number
	}[]
	/**
	 * A cyclist's two frames, in place of the bike, `width` by `height`: a
	 * hospital bed, pushed by a porter. Still a cyclist, to jump.
	 */
	cyclist?: {
		frames: [string, string]
		width: number
		height: number
		/**
		 * Somewhere on it to stand, and be wheeled along on: from `from` to
		 * `to` across the picture, drawn riding left, its top `top` px down
		 * from the picture's. A bed's, on top of its patient. Run into it
		 * below that, and it's a cyclist all the same.
		 */
		deck?: { from: number; to: number; top: number }
	}
	/**
	 * A picture in place of the traffic cone, `width` by `height`, and what
	 * they're called, knocking them over: a wet floor sign, in a hospital.
	 * Still knocked over as a cone, slowing you a little. Or, with a
	 * `crumbled` picture, the same size, squashed down flat into it rather
	 * than tipped over: a sandcastle, on a beach. `word`, what pops up,
	 * rather than "Bonk!".
	 */
	cone?: {
		asset: string
		width: number
		height: number
		name: string
		crumbled?: string
		word?: string
	}
	/** What's in its Secret's cavern, if it has one (see `Secret`). */
	secret?: SecretLook
	/**
	 * A picture in place of the slalom gate, `width` by `height`, and what
	 * they're called, going through them: a shower over the road, at a
	 * night race, spraying runners as they go under it. Still a gate, for a
	 * boost, once each. `front`, the same size, over whoever's going
	 * through; `word`, what pops up, rather than "Gate!".
	 */
	gate?: {
		/** Its frames, shown in turn, every `frameTicks`: one, if it's still. */
		asset: string[]
		front?: string[]
		frameTicks?: number
		width: number
		height: number
		name: string
		word: string
	}
	/**
	 * Pyrotechnics, on a start line at each `x` (where its banner is): a
	 * cannon either side of the road, just off its edges, firing fireballs
	 * up into the air on "Go!", as at a big city race's start.
	 */
	pyro?: number[]
	/**
	 * Searchlights, each on a trailer at the road's far edge `at` each x,
	 * sweeping the sky, in turn each of `colours`: Midnattsloppet's.
	 */
	searchlights?: { at: number[]; colours: string[] }
	/**
	 * Smoke machines, at each `x`: smoke billowing out of them, low over the
	 * road, drifting back across it, and lit by whatever light's on it.
	 */
	smoke?: number[]
	/** A bouncer's picture, in place of the toadstool (see `bouncers`): an air sac in a lung. */
	bouncer?: { asset: string; width: number; height: number }
	/**
	 * Pictures in place of the Germ, bobbing, `width` by `height`, its
	 * bottom at the Germ's: a ghost, in a haunted house. Still popped, landed
	 * on, and still a stumble run into, with `word` popping up rather than
	 * "Atishoo!". `popped`, its burst.
	 */
	germ?: {
		frames: string[]
		popped: string
		width: number
		height: number
		word: string
	}
	/**
	 * A giant's mouth, in its face (a Cave feature, `GIANT_FACE`), opening
	 * as anyone racing gets within `opens` of it, its jaw dropping and its
	 * tongue rolling out over the edge of the bench, from `tip` to `inside`,
	 * the Ground everyone runs up into it; and shutting behind them as soon
	 * as they're all in. The face's top left at `face`.
	 */
	mouth?: {
		face: { x: number; y: number }
		tip: number
		inside: number
		opens: number
	}
	/**
	 * A heart beating, from `from` to `to` along the course: the screen
	 * thumping red with it, in time with its valves (see `HEARTBEAT`). And
	 * the heart itself, behind everything, `x` its middle and `y` its top,
	 * swelling on every beat.
	 */
	heartbeat?: {
		from: number
		to: number
		heart?: {
			asset: string
			width: number
			height: number
			x: number
			y: number
		}
	}
	/**
	 * Lungs, hung behind everything, `x` their middle and `y` their top:
	 * filling and emptying every `ticks`, `phase` of the way in at the start,
	 * as a Moving Platform that long swings, full at the top of its swing.
	 * In time with the airways in front of them.
	 */
	breathing?: {
		asset: string
		width: number
		height: number
		x: number
		y: number
		ticks: number
		phase?: number
	}
	/**
	 * A family of wild boar, a sow and her piglets, coming up from behind as
	 * whoever's racing in front gets to `from`, along the grass in front of
	 * the path, at a steady pace a touch quicker than anyone runs: slowly
	 * catching them up, alongside a while, and slowly away ahead. Only to be
	 * seen, not run into (see `draw/boars.ts`). Huddinge's.
	 */
	boars?: { from: number }
	/**
	 * Herds running alongside, as the boars do (see `boars`), each coming up
	 * from behind as whoever's racing in front gets to `from`: dinosaurs on
	 * Dino Island, overtaking at a gallop, or one keeping pace a long way.
	 * See `Herd`.
	 */
	herds?: Herd[]
	/**
	 * A picture in place of the huge spider, and where on it to land or not
	 * to run into (see `SpiderLook`): a triceratops, on Dino Island.
	 */
	spider?: SpiderLook
	/**
	 * A volcano erupting once everyone racing's crossed its crater, at `at`: the
	 * sky going red, smoke pouring up, ash falling; and from `silhouette.from`
	 * to `silhouette.to` along, everything on the course black against it,
	 * as in an old dinosaur game (see `draw/eruption.tsx`).
	 */
	eruption?: Eruption
	/** Deep Water's colours, swum through: see `DeepWater`. */
	deepWater?: DeepWaterLook
	/**
	 * A diplodocus the path runs up and over: its tail and back are the
	 * Ground, its head a Platform, `head` (by its index), that rises as
	 * someone's on it, its neck drawn from its shoulders, `shoulder`, up to
	 * it. Its body's picture, its top left at `body.x`, `body.y`.
	 */
	diplodocus?: {
		head: number
		shoulder: { x: number; y: number }
		body: { asset: string; x: number; y: number; width: number; height: number }
		/**
		 * The ground under it, `from` to `to`, its line at `y`: drawn as the
		 * Ground is either side, its `layers` as `ground`'s are (offsets from
		 * the line, each filled on down, a ragged top if it has an `edge`), as
		 * the Ground there's up on its back.
		 */
		floor: {
			from: number
			to: number
			y: number
			layers: [offset: number, fill: string, edge?: (x: number) => number][]
		}
	}
	/**
	 * A forest harvester at work behind the path, the tree it's felling
	 * standing at `x`, through its head: `tree`, drawn twice its size,
	 * through `filter`. As whoever's racing in front comes up to it, it saws
	 * the tree down, and feeds it through its head, cutting it into logs,
	 * onto its pile. Only to be seen (see `draw/harvester.ts`). Huddinge's.
	 */
	harvester?: { x: number; tree: string; filter?: string }
	/**
	 * A big stadium screen behind the track, its middle at `x`, showing a
	 * broadcast: once whoever's leading gets to `droneFrom`, a drone flies
	 * in and follows them in, over the line and dancing, and what's behind
	 * it is shown live on the screen. Only to be seen (see
	 * `draw/bigScreen.ts`). Kristineberg's.
	 */
	bigScreen?: { x: number; droneFrom: number }
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
	 * the line everyone runs along, each filled from there on down. Its
	 * top `smooth`ed, if deep under the path; and given an `edge`, how much
	 * further down it is at `x` along, its top ragged: bushes, say. Land
	 * set back behind the path can go on `acrossGaps`, behind the drop, its
	 * top straight across from one side to the other, down to the backs of
	 * their paths, where the drop starts: a crater's far side.
	 */
	ground?: [
		offset: number,
		fill: string,
		smooth?: boolean,
		edge?: (x: number) => number,
		acrossGaps?: boolean,
	][]
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
	/**
	 * More bands among the hills (Haga's, recoloured by `hills`): each
	 * after the far hills (`over: 'far'`, the far pieces peeking over them)
	 * or the middle ones (`over: 'middle'`), before the next. A forest's
	 * ridges of pines, one behind another.
	 */
	hillBands?: (BackdropBand & { over: 'far' | 'middle' })[]
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
	/** Autumn leaves coming down, over everything, `count` on the screen at once (see `draw/Leaves.ts`). */
	leaves?: { count: number }
	/** What a Gap's drop looks like: a CSS background, from the path down; `none` to see through it. */
	gap?: string
	/**
	 * What its Gaps look like inside, drawn over `gap`: ragged walls going
	 * down either side, darker and darker the deeper, so it's plain it's a
	 * drop. See `PitLook`.
	 */
	pit?: PitLook
	/**
	 * Lava down Gaps, each `from` to `to`, its surface at `level` (a y):
	 * churning, bubbling and spurting up (see `draw/lava.ts`). A volcano's
	 * crater, on Dino Island.
	 */
	lava?: { from: number; to: number; level: number }[]
	/** Its Gaps on fire: pits down into hell, flames licking up out of them, embers rising. */
	pitFire?: boolean
	/** In place of the sun, `scale` times its size, through the `sun` filter: a moon. */
	sunAsset?: string
	sunScale?: number
	/** Over the clouds. */
	clouds?: string
	/**
	 * Fog, settled in: mist drifting over everything, fading in along the
	 * course from `from`, as thick as it gets by `full`, and clearing again
	 * from `clear` to `gone`. And a bank of cloud lying across the course,
	 * `deck`: its top at `top`, `depth` deep, from `from` to `to`, drawn
	 * over everyone falling through it. Over `deep`, it goes on down under
	 * that as far as can be seen, a valley filled with it: zoomed out, no
	 * sky (and the horizon in it) under it.
	 */
	fog?: {
		from: number
		full: number
		clear: number
		gone: number
		deck?: {
			from: number
			to: number
			top: number
			depth: number
			deep?: { from: number; to: number }
		}
	}
	/** Lightning, flashing occasionally. */
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
	/**
	 * Where the bus flies, from `from` to `to` along the course: wings out
	 * either side, a fin up off its roof and a rocket booster under its
	 * back, roaring, its wheels tucked away; floating along over the floor,
	 * up over whatever's in the way, bobbing. Shrunk, inside someone.
	 */
	/**
	 * Where Steam Vents are geysers, from `from` to `to`: a hole in the
	 * crust, steaming, blasting whoever's over it up. Rocket Launch's planet.
	 */
	geyser?: { from: number; to: number }
	busJets?: {
		from: number
		to: number
		/**
		 * Under the sea, a turbine in place of the rocket booster, its
		 * propeller turning, bubbles streaming off it: Dino Island's.
		 */
		turbine?: boolean
	}
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
		 * More bands, further off than the far one, behind it: each `height`
		 * tall, its top at `top`, going by at `parallax` (the far band's is
		 * 0.08), back to front. Peaks on peaks, fading into the distance.
		 */
		farther?: BackdropBand[]
		/**
		 * The ground from the near band on down behind the path, textured: an
		 * image repeated over the grass's colour, going by slower than the path
		 * does, it being further off. Cobbles, rippled sand.
		 */
		field?: string
		/**
		 * More bands, nearer still, each lower down and going by faster than
		 * the last, `height` tall, and its colour on down below it: so the
		 * view's full right down to the course. Its `top` where it says,
		 * if it does: a forest stood right behind the path, high enough
		 * for its trees to be seen over it.
		 */
		nearer?: { asset: string; height: number; fill: string; top?: number }[]
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
	 * Bridges the path goes over, one after another along it, each over its
	 * own water: see `BridgeLook`. Gamla Stan's, over to Helgeandsholmen,
	 * off it, and out over Guldbron at the end.
	 */
	bridges?: BridgeLook[]
	/**
	 * A rainbow the path goes up and over, `from` to `to`: its bands under
	 * the path, nothing under it but the field, its ground `base` there.
	 */
	rainbow?: { from: number; to: number; base: (x: number) => number }
	/**
	 * Up on a ridge, high over the clouds: how far down the mountain goes
	 * under the path at `x`, a y, its underside; nothing under that but
	 * the sky and whatever's on the horizon. Undefined, it goes on down as
	 * usual. Lost in a bank of cloud (see `fog`), it's a mountain
	 * disappearing into it.
	 */
	ridge?: (x: number) => number | undefined
	/** Its Steam Vents as bouncy toadstools, rather than grates. */
	bouncers?: boolean
	/** How buildings look, on a course over rooftops: see `BuildingLook`. */
	buildings?: BuildingLook
	/** The sea's colours, and its island's sand, if it has a sea: see `Course['sea']`. */
	sea?: SeaLook
	/** A River's colours, if it has one: see `Course['river']`. */
	river?: RiverLook
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
	battlements?: {
		stone: string
		shade: string
		/**
		 * Brick, in place of plain stone: `fill`, a pattern of the Ground's,
		 * as `url(#id)`; `dim` over it on the battlements, so they stand out
		 * against the wall; and `shade` over it in shadow, a tower's side.
		 */
		brick?: { fill: string; dim: string; shade: string }
		/** Along the battlements' tops, catching the light. */
		cap?: string
		/** A tower's roof, walked on: its floor. */
		roof?: string
	}
	/**
	 * Pyramids the path goes up and over, each from foot to foot: their
	 * stepped faces drawn in front of it in courses of blocks, `block` with
	 * `mortar` between.
	 */
	pyramids?: { feet: [number, number][]; block: string; mortar: string }
	/**
	 * Stretches of the Ground that are a flight of stairs, drawn as one over
	 * it (see `draw/stairs.tsx`): treads, a stringer under them, and a rail
	 * along their near side. See `StairsLook`.
	 */
	stairs?: StairsLook[]
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
		 * Other tiles, each from `from` along the course till the next: a
		 * hospital's walls, then the inside of someone's nose, their lungs,
		 * their heart. Before the first, `tiles`.
		 */
		zones?: { from: number; tiles: CaveTiles }[]
		/** Stalactites hanging off its Ceiling, wherever there's room under it. */
		stalactites?: boolean
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
/**
 * A flight of stairs, `from` to `to` along, up or down the Ground there, as
 * it steps (see `CourseLook['stairs']`). `carpet`: indoors, wooden treads, a
 * carpet runner up the middle, brass nosings, and a banister, balusters and
 * newel posts; `deck`: out on deck, teak treads, yellow non-slip nosings, a
 * white steel stringer and a ship's rail. With `behind`, the stairs take
 * up only the front of the path, that colour (the wall) behind them. With
 * `under`, they're boxed in under, that colour, down to the floor at their
 * foot; without, they're open under, whatever's there showing (a passage
 * on along under them).
 */
export interface StairsLook {
	from: number
	to: number
	style: 'carpet' | 'deck'
	behind?: string
	under?: string
}

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
		/**
		 * Seen from outside: drawn on its cover, over everyone, and gone
		 * with it once someone's in. A hospital's front doors, a giant's
		 * face over its nostril. Keep it clear of the way in, so nobody
		 * outside is drawn behind it.
		 */
		outside?: boolean
	}[]
	/**
	 * Its parts, each `from` to `to`, covered till someone's in that one,
	 * rather than the whole of it opening up at once: a hospital, and
	 * someone's nose. Without them, it's all one.
	 */
	parts?: { from: number; to: number }[]
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

/**
 * Which of the bus's looks a course has, in place of the yellow one: its
 * pictures are the bus artwork picked in Options (see
 * `draw/art/busStyle.ts`), new or classic.
 */
export interface BusLook {
	/** Halloween's: the bus left out too long, haunted, SPOOK BUS along it. */
	spooky?: boolean
	/** A drill in place of the scoop, turning. */
	drill?: boolean
	/** Where the drill goes on, the scoop till then: from the start, if not said. */
	drillFrom?: number
	/**
	 * Legs in place of its wheels, crawling: four of them, a spider's, to
	 * climb a mountain on. Their metal, the joints' bolts, and their feet.
	 */
	legs?: { metal: string; shade: string; bolt: string; foot: string }
	/** A sleigh in place of the bus, down a ski slope, its body and wheels: only its scoop's the bus's. */
	sleigh?: boolean
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
	/**
	 * Rock, rather than a slab: its lip `lit`, tufts of `moss` along it,
	 * shaded darker down its face and at its ends; and a solid shelf of it,
	 * rock dripping off its underside, `drip`.
	 */
	rock?: { lit: string; moss: string; drip: string }
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
		/**
		 * A lift that waits: still, where it's written, till a Player's stood
		 * on it this many ticks (not just run across it), then out and back
		 * the once, and waiting again (see `setOffPlatforms`). No `phase`.
		 */
		waits?: number
		/** When a lift that `waits` was set off, if it's on its way: a race's own (see `racePlatforms`). */
		since?: number
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
	art?: {
		asset: string
		width: number
		height: number
		top: number
		/** Its near side, the same size, in front of whoever's on it: a rope bridge's handrail. */
		front?: string
	}
	/**
	 * A guard tower's roof (see `towerRoof`): drawn as the tower is, not as a
	 * Platform. Up on one, off a dragon, is the Great Wall's special goal.
	 */
	tower?: boolean
	/**
	 * How high its cable hangs from, if it's on one: a crane's jib. Up out
	 * of sight, if not said.
	 */
	hook?: number
	/**
	 * A rope bridge: it sags under whoever's on it, `give` px with one in its
	 * middle, and springs back, bouncing (see `ropeBridge`). Its `art`, and
	 * its `art.front`, are bent to it as it does. One that `breaks` snaps
	 * under a Player who's jumped on it that many times running: its two
	 * halves swing down to hang from the banks, the Player hanging on to the
	 * end of one (see `breakBridge`). Not in a Round.
	 */
	rope?: { give: number; breaks?: number }
	/**
	 * A rope bridge that's snapped, where, and when: a race's own (see
	 * `racePlatforms`). Anything else broken is gone, not drawn: a
	 * minigame's rotten plank, crumbled away (see `minigames/paintbrush`).
	 */
	broken?: { x: number; at: number }
}

/** Scenery along the course: a tree, a shrub, a flower, or a furby. */
/**
 * A bridge, from `from` to `to`: over water, its underside this colour,
 * the water in front of it and behind.
 */
export interface BridgeLook {
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
	/**
	 * Where the quay's stone under the path past it stops, if it does: at
	 * the next bridge, off an island. It goes on to the end if not.
	 */
	stoneUntil?: number
}

export interface Scenery {
	x: number
	asset: string
	/** Drawn this many times its pixel size. */
	scale?: number
	/** A CSS filter, to recolour it. */
	filter?: string
	/** Hops on the spot occasionally. */
	hops?: boolean
	/**
	 * Animated: these pictures in turn, each for `frameTicks`, by the race's
	 * tick, so the same on every screen; `asset` its first, and its size.
	 * A band playing.
	 */
	frames?: string[]
	frameTicks?: number
	/**
	 * Animated from a strip: `asset` is `count` frames side by side, each
	 * shown in turn every `frameTicks`, starting `from` frames in, so a row
	 * of them aren't all in step. A runner's dance, danced by the roadside.
	 */
	strip?: { count: number; from?: number }
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
	 * With `onFloor`, stood upright rather than leant with the slope, its
	 * foot sunk in at its uphill end: coral growing up a reef.
	 */
	upright?: boolean
	/** In front of whoever's on the path, rather than behind them: a gateway's near side. */
	front?: boolean
	/** Stood over a Gap all the same, as nothing else is: a crumbled wall's breach. */
	overGap?: boolean
	/**
	 * Something wide on a hill, stood on its top, the verge's edge, with
	 * grass made up under it down to wherever the ground falls away under
	 * its ends: the Copper Tents. Its `setBack` is the verge, unless given.
	 */
	footing?: boolean
	/**
	 * A name carved on it, a runner's, on its panel: `x`, `y`, `width` and
	 * `height` in its own pixels. A tombstone's.
	 */
	carved?: [x: number, y: number, width: number, height: number]
}

/**
 * Every course's id. A new course goes here too, and then wants its medals
 * in `MEDAL_SCORES`, which won't compile without them.
 */
export type CourseId =
	| 'haga'
	| 'kristineberg'
	| 'gamla-stan'
	| 'huddinge'
	| 'pyramids'
	| 'halloween-town'
	| 'scoop-line'
	| 'caves'
	| 'great-wall'
	| 'furby-fields'
	| 'machu-picchu'
	| 'sewers'
	| 'city-rooftop'
	| 'cliff'
	| 'everest'
	| 'slopes'
	| 'karolinska'
	| 'midnattsloppet'
	| 'dino-island'
	| 'rocket-launch'
	/** Not a course: a minigame's arena, raced on in no Round (see `minigames`). */
	| 'fruit-kebab'
	| 'potato-rain'
	| 'jump-rope'
	| 'pogo-sticks'
	| 'iceberg-bump'
	| 'beach-volleyball'
	| 'red-light-green-light'
	| 'memory-dunk'
	| 'paintbrush'
	| 'hungry-goose'
	| 'bomb-hat'
	| 'lollapascoopza'
	| 'mr-claws'
	| 'fika-defence'
	| 'skate-jam'
	| 'jughead'

/**
 * A Portal: a machine that shrinks everyone down, or a sneeze that blows
 * them back up to size. Whoever gets to `in` is held there, in it, till
 * everyone still racing is; then the lot of them are shrunk (or grown),
 * the camera diving in with them (or out), and let out at `out` in the
 * order they got in, as far apart, each going as fast as they went in. The
 * bus too, as far behind as it was. See `portals`.
 */
export interface Portal {
	/**
	 * `launch`: a rocket, Rocket Launch's. Everyone climbs aboard at `in`,
	 * and once they all have, it takes off, the camera following it up into
	 * space, till it blows up, and they're thrown out into space at `out`
	 * (see `rocketLaunch.ts` in `draw`).
	 */
	kind: 'shrink' | 'grow' | 'launch'
	in: number
	out: number
	/**
	 * Where the camera dives in to, shrinking: the shrink ray's plate, a y
	 * over the Ground at `in`. Growing, where they're sneezed out from: the
	 * nose, at `x`, a y.
	 */
	focus: { x: number; y: number }
}

export interface Course {
	id: CourseId
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
	/**
	 * Everyone in the race's own T-shirt, this colour, as at Midnattsloppet,
	 * where everyone runs in the same one: the Players and the pack. Anyone
	 * made from a look is drawn in it; the club's own, drawn by hand, have
	 * their T-shirt's colours swapped for it (see `runners/raceShirts.ts`).
	 */
	raceShirt?: string
	/**
	 * How many Pacers are out at once, `x` along, if not the usual
	 * (`PACK_SIZE`): a big city race's crowd, thick at the start. As many
	 * line up at the start.
	 */
	crowd?: (x: number) => number
	/**
	 * Its tune in other versions, the same tune played on other
	 * instruments, each from `from` along (where the runner is, in the
	 * camera's view) till the next: a rock band's, past a rock band, and a
	 * choir's, up to a church. Each fades into the next mid-tune, in step,
	 * as the bars go by. Before the first, the course's own (see `TUNES`).
	 */
	tunes?: { from: number; tune: string }[]
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
	/**
	 * Stretches where the camera looks up, as far as it can and still keep
	 * whoever's running in view, to have `top` (a y) at the top of the
	 * screen: something tall there, Sofiakyrkan, the whole of it in view.
	 */
	lookUp?: { from: number; to: number; top: number }[]
	/**
	 * Stretches where whoever's running is kept low on the screen, the sky
	 * filling it over them, up on the skyline: Dino Island's run down its
	 * volcano, blown, everyone black against the burning sky.
	 */
	skyline?: { from: number; to: number }[]
	/** Platforms over the Ground, in order along the course. */
	platforms?: PlatformDefinition[]
	/** A Cave it runs through, under a hill. */
	cave?: Cave
	/** Furbies, hopping about the path and onto whoever runs by. */
	furbies?: { x: number; asset: string }[]
	/** Where corgis sit, waiting for someone to hop on and ride them. */
	corgis?: number[]
	/**
	 * How high over the Ground each of those sits waiting, if not on it: up
	 * on a ledge, to get to first. The Caves' mole.
	 */
	corgisUp?: number[]
	/**
	 * What those are: corgis (at Kristineberg), or on Machu Picchu, llamas,
	 * at the Pyramids, camels, in Huddinge's forest, deer, in Furby Fields,
	 * unicorns, on The Cliff, gliders, parked along its top, up Everest,
	 * mountain goats, or in Gamla Stan, the Royal Guard's horses.
	 */
	ride?:
		| 'corgi'
		| 'llama'
		| 'camel'
		| 'deer'
		| 'glider'
		| 'unicorn'
		| 'goat'
		| 'horse'
		/**
		 * In The Caves, moles: hopping along with you on their back, over and
		 * over, and digging on through whatever rock's in the way, leaving
		 * their way through it behind them (see `moles`).
		 */
		| 'mole'
		/**
		 * On The Slopes, skis and snowboards, stood up in the snow at the
		 * top: run into a pair and they're yours, the whole way down (see
		 * `skis`).
		 */
		| 'skis'
		/**
		 * In Karolinska, red blood cells, in the bloodstream: bobbing along
		 * with the flow, faster than running, over everything in the way.
		 */
		| 'bloodCell'
		/**
		 * At Midnattsloppet, skateboards, lying on the road: step on at a
		 * run and ride it, stood up, faster than running. Jump, and it
		 * kickflips under you.
		 */
		| 'skateboard'
		/**
		 * On Rocket Launch's planet, space buddies: little round aliens,
		 * bounding along in the low gravity with you on their back.
		 */
		| 'spaceBuddy'
	/** Its Portals, a shrink and then a grow, in order along it: see `Portal`. */
	portals?: Portal[]
	/**
	 * Slides, each `from` to `to` along it: anyone on the Ground there is
	 * sat down sliding, as if ducking, whatever's held, gathering speed
	 * downhill; they can still jump. Down a chute of snot into the
	 * sneeze, in Karolinska.
	 */
	slides?: { from: number; to: number }[]
	/**
	 * Where a km sign stands, by its km, if not at it: Karolinska's 2 km,
	 * which would be up on the giant's tongue, on the bench just short of
	 * it instead. A little out, but on the ground.
	 */
	kmSignsAt?: Partial<Record<1 | 2 | 3 | 4, number>>
	/**
	 * Rails to grind along on skis, each `from` to `to`, `height` over the
	 * Ground all along it, following it down: a rail, a box, or a log.
	 */
	rails?: Rail[]
	/** A hut the course runs through, to ski through, or over the roof of. */
	hut?: Hut
	/**
	 * A ski jump: its takeoff's lip at `takeoff`, and how far down the
	 * landing hill counts as a good one, its K-point, `k` past it. Off it,
	 * how far they flew is measured.
	 */
	skiJump?: { takeoff: number; k: number }
	/**
	 * A long jump pit across the track, near the finish: its take-off
	 * `board`, and the sand just past it (see `longJump`). Jumped off the
	 * board, how far is measured, for points; run through, the sand slows
	 * you down.
	 */
	longJump?: { board: number }
	/**
	 * How much faster the bus goes down a slope, for its steepness: on skis
	 * too, it picks up speed downhill, as everyone does.
	 */
	busDownhill?: number
	/**
	 * No lower top speed in a multiplayer Round (see `topSpeed`): The Slopes'
	 * ski jumps need everything a tuck gives to clear them.
	 */
	fullSpeedInRounds?: boolean
	/**
	 * How far ahead down the hill the camera looks, down a mountain, so
	 * what's coming is in view, not off the bottom of the screen.
	 */
	lookDown?: number
	/**
	 * The sea, from the foot of a cliff, `from`, to an island's shore, `to`:
	 * a Gap, the Ground's line across it at its surface, `level`. Down into
	 * it is Fallen, there and then; the bus floats across it, at `busSpeed`
	 * at least, under full steam. A glider comes down on the island, past it.
	 */
	sea?: { from: number; to: number; level: number; busSpeed: number }
	/** A River across the course, to wade or cross on its crocodiles: see `River`. */
	river?: River
	/** Deep Water, to dive into and swim through, under it: see `DeepWater`. */
	deepWater?: DeepWater
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
	/**
	 * What those are: geese, or on the Great Wall, a dragon; off Machu
	 * Picchu, condors; over Dino Island, pterodactyls.
	 */
	flyer?: 'goose' | 'dragon' | 'condor' | 'pterodactyl'
	/**
	 * A Leap: the Ground drops away sheer at `edge`, a long way down to a
	 * valley floor, and there's no way on but off it. Whoever goes over
	 * falls, blind, till they're `catchAt` down: a condor swoops in and
	 * catches them there, everyone, Pacers too, and carries them down onto
	 * the valley floor, letting go at `land` along. The bus too: a giant
	 * one carries it down, `busFloor` its way down.
	 */
	leap?: { edge: number; catchAt: number; land: number }
	/** A Secret: a way down one of its Gaps into a cavern under it. See `Secret`. */
	secret?: Secret
	/**
	 * Low gravity, from `from` to `to`, `scale` of the usual: jumps rise as
	 * high as `lift` times the usual, and take far longer about it. Rocket
	 * Launch's planet.
	 */
	lowGravity?: { from: number; to: number; scale: number; lift: number }
	/**
	 * Where the bus goes slower than its own pace, `pace` of it: in Rocket
	 * Launch's alien base, so there's time to climb about and stomp aliens.
	 */
	busSlow?: { from: number; to: number; pace: number }[]
	/** A boss to beat in its own room: see `Boss`. */
	boss?: Boss
	/**
	 * A cage hanging high over the course at `x`, its top at `top` (a y),
	 * the course's `found` runner in it: land on it and it falls, smashing
	 * open on the floor at `floor` (a y), and they're free. Rocket Launch's
	 * alien prisoner.
	 */
	cage?: { x: number; top: number; floor: number; says: string }
	/**
	 * A bonus runner, stood somewhere hard to get to, waiting to be found:
	 * get to them, and the first time, they're yours to run as (see
	 * `BONUS_RUNNERS`). Bat Person, up on the girders over City Rooftop.
	 * By their runner id, at `x`, their feet at `y`; and what they say,
	 * found: Bat Person's theme. With `over`, passing over them that high
	 * counts too (in a room, jumping by). Or, `waiting`, sat down till
	 * anyone comes near, and up to say hello (see `FoundWaiting`). And
	 * `toSelf`, what they say instead to anyone running as them: Bat
	 * Person's "Greetings bat brother", the Furby Queen's "Imposter!".
	 * With a `hat`, their own, it's there to steal off their head, by
	 * anyone getting to them once they've already been unlocked: the
	 * Spirit of Jazz's, and `robbed`, what they say as it goes.
	 */
	found?: {
		runner: string
		x: number
		y: number
		says?: string
		over?: number
		waiting?: FoundWaiting
		toSelf?: string
		hat?: PickupHat
		robbed?: string
	}
	/**
	 * A fika to hunt down: pick up every one of `item` on the course in one
	 * go, and the first time, the bonus runner `runner` is yours to run as
	 * (see `BONUS_RUNNERS`). Midnattsloppet's ten bananas, for Banana Girl.
	 */
	hunt?: { item: FikaItem; runner: string }
	/** A mine, with mine carts to ride: see `Mine`. */
	mine?: Mine
	/**
	 * A wild boar, bursting out of the trees behind the path at `x` as
	 * whoever's in front comes up to it, and trotting along the path till
	 * it bolts off it past `leaves`. Run into it and you trip; land on it,
	 * and everything stops for a cut scene: in a puff of smoke it's
	 * ManBearPig, roaring at you. Then it's after you, faster than the bus,
	 * never off the screen. Outrun it over the finish line, and it's yours
	 * to run as.
	 * Huddinge's (see `game/manBearPig.ts`).
	 */
	manBearPig?: { x: number; leaves: number }
	/**
	 * A football, lying on the path at `x`: run into it and you kick it on
	 * ahead (see `Football`).
	 */
	football?: number
	/**
	 * An egg, in its nest on the path at `x`: run into it and you kick it on
	 * ahead, as a football, and it cracks a little more every time. Kicked
	 * on as far as `hatchFrom`, on the Ground there, it cracks open, hatched: legs out, it's a Follower, `follower` by kind, running on
	 * after whoever kicked it (see `followers.ts`). Bring it over the finish
	 * line with you, and that's Dino Island's special goal. Not in a Round.
	 */
	egg?: { x: number; hatchFrom: number; follower: FollowerKind }
	/** Its special goal, its own: see `SpecialGoal`. */
	special?: SpecialGoal
	/**
	 * Where the bus digs its own way, its wheels on this rather than the
	 * Ground: down through the street after whoever's dropped down a
	 * manhole, and back up out of it. The Ground, where it's undefined.
	 */
	busFloor?: (x: number) => number | undefined
	/** A haunted house on the course, to run through: see `HauntedHouse`. */
	/** Icy stretches, `from` to `to` along: slippery, underfoot (see `game/ice`). */
	ice?: { from: number; to: number }[]
	haunted?: HauntedHouse
}

/**
 * A haunted house (a Cave, see `cave`), in Halloween Town. Bats burst out
 * of its `door` at whoever gets within `bats` of it. Its way out is a
 * window on its upper floor, at `window.x`, its floor `window.floor` (a
 * y): through it, the glass smashes. Up in its attic, its floor at
 * `monster.floor`, a monster waits at `monster.x`: anyone up there within
 * its `reach` is caught, and killed, and comes back up out of a grave at
 * `grave`, past the house, as a ghost, for the rest of the race (see
 * `haunted.ts`).
 */
export interface HauntedHouse {
	door: number
	bats: number
	window: { x: number; floor: number }
	monster: { x: number; floor: number; reach: number }
	grave: number
}

/**
 * A mine, in The Caves: rails along the Ground, `from` to their buffers at
 * `to`, and mine carts waiting on them at `carts`. Run into one and you're
 * in it, riding it down the line, faster than you'd run, to the buffers,
 * where you're out and on your way. Jump, and the cart jumps, you in it,
 * coming down on whatever rail's under it: up onto a line of its own,
 * `secret`, where it starts, up on its trestles over the line along the
 * floor, that's the way onto it; and on up it to a gallery high in the
 * rock that there's no getting to any other way, a hat waiting in it, and
 * back down to the rest.
 */
/**
 * A Secret: one Gap, `gap`, that's a way in, not a fall. Whoever goes down
 * it isn't out: they drop on down its shaft, a screen and more, into a
 * cavern under the course, from `from` to `to` along, its floor at the
 * height `floor` (a y on the screen, level all along it) and its roof
 * `room` over that. At its far end, at `launch`, someone's waiting in the
 * way to throw them back up onto the course: up `peak` over it, and down
 * again about `land` along. Thrown out, they've unlocked the bonus runner
 * `unlocks`, by their runner id, if it has one (see `BONUS_RUNNERS`).
 *
 * Or, with `manhole`, its way in's no Gap at all but an open manhole in
 * the street, over `gap`, a ladder poking up out of it: run onto it slowly
 * and down they go, feet first; jump it, or run straight on over it, and
 * they don't (Gamla Stan's tavern). And with `duct`, nobody throws them:
 * it's an air duct at `launch` that blows them straight up it, out of a
 * grate in the street, and on over to `land`.
 *
 * With `greets`, whoever's waiting calls out to anyone coming at them,
 * within `near` of `launch`, the first time: their `sound`, and one of
 * `says` in a bubble over them (the Yeti's growl).
 *
 * With `bridged`, its Gap has a rope bridge over it (a Platform, not
 * solid): run on over it, or duck on it, and down through it you go (The
 * Caves' mine). With `coaster`, there's a ride through it: see `Coaster`.
 *
 * With `stairs`, its way in's no Gap at all but a flight of stairs, over
 * `gap`, up from a floor that carries on along under them, level, at
 * `floor`: duck on them, and down through them you drop, as if you'd run on
 * past them. Its roof is then the underside of whatever's over it, all
 * along it (the stairs, a deck), not `room`: a passage under the stairs,
 * low under a deck, tall under a higher one. Scoop Cruises' engine rooms.
 * With `lifeboat`, its way out: see `SecretLifeboat`.
 */
export interface Secret {
	gap: { from: number; to: number }
	from: number
	to: number
	floor: number
	room: number
	launch: number
	peak: number
	land: number
	unlocks?: string
	stairs?: boolean
	lifeboat?: SecretLifeboat
	manhole?: boolean
	duct?: boolean
	bridged?: boolean
	greets?: {
		near: number
		sound: Sound
		says: readonly string[]
		/** What they say instead to anyone running as who it `unlocks`: the Miner Twins' "One of us!". */
		toSelf?: string
	}
	coaster?: Coaster
}

/**
 * A Secret's way out by sea, under Scoop Cruises' engine rooms: a `hole`
 * blown in its floor, from and to along, out through the ship's side to
 * the sea, its surface at `water` (a y), and a lifeboat waiting on it
 * under the hole. Drop down through the hole into the lifeboat and it's
 * yours: off along the water, faster than running, jumping the waves as you
 * like, to a plastic trick ramp, its lip at the Secret's `launch`, that throws you up out of
 * it, back up onto the course, over it by its `peak`, down onto it at its
 * `land` (see `lifeboat.ts`). There's only the one: anyone down the hole
 * after it's gone drops into the sea, and is out; in Baby Mode, floated
 * back up onto the deck over it.
 */
export interface SecretLifeboat {
	hole: { from: number; to: number }
	water: number
}

/**
 * A mine cart ride through a Secret's cavern, under The Caves: carts
 * waiting at the start of its `track`, `carts` of them, one for each
 * Player there might be, all in the one spot, so there's always one there
 * till they're all gone. Run into one and you're in it, as a mine's (see
 * `Mine`), and off along the track: up, down and round its loop, slowed
 * going up and sped up coming down, to its end, where you're thrown out
 * of it, on your way (see `coaster.ts`). `track` is points along its
 * rail, in order, `[x, y]` (a y on the screen), a few pixels apart, its
 * start and end on the cavern's floor; and `air`, stretches of it with no
 * rail, `[from, to]` how far along it: a jump, the cart flying over.
 */
export interface Coaster {
	track: [x: number, y: number][]
	carts: number
	air?: [from: number, to: number][]
	/**
	 * Its leap, over the first of `air`: a gap in the rails over a pit in
	 * the cavern's floor, `pit`, from and to along the course. Jump on its
	 * run-up, from `runUp` along the track (the foot of its ramp) to the end
	 * of the rail, and the cart's across; don't, and it runs off the end,
	 * and down the pit, and whoever's in it with it: out, as down any Gap.
	 */
	leap?: { runUp: number; pit: [from: number, to: number] }
}

/**
 * What's in a Secret's cavern, drawn. Its `walls`: what it's hollowed out
 * of, Everest's ice (the Yetis' den), or the brick vaults of an old cellar
 * (the tavern under Gamla Stan). Its `furnishings` stand against its back
 * wall, `x` along the course their middles, or hang on it, `hung` up over
 * its floor. And whoever's at its far end, to throw you out, its
 * `launcher`: facing left, the way you come, `kneel`ing, waiting, `hands`
 * where you run into, from the picture's top left; and `thrown`, while
 * you're on your way up (or a duct: still, then blowing). All in world
 * pixels. Or `mine`: an old mine's workings, deep under The Caves. Or
 * `engine`: below decks on a ship, a passage on along under its stairs, and
 * its engine rooms, steel and pipes; with no launcher, nobody there to
 * throw you, but a lifeboat (see `SecretLifeboat`).
 */
export interface SecretLook {
	walls: 'ice' | 'vaults' | 'mine' | 'engine'
	/**
	 * A door across it at `x`, `shut`, and what's past it hidden behind the
	 * Cave's front, as the rest of the hull is, till anyone down there gets
	 * to it: then it's `open`, and stays open, all that's past it in view
	 * from then on. The door into Scoop Cruises' engine rooms.
	 */
	door?: { x: number; shut: SecretPicture; open: SecretPicture }
	launcher?: {
		kneel: string
		thrown: string
		width: number
		kneelHeight: number
		thrownHeight: number
		hands: { x: number; y: number }
	}
	furnishings: { x: number; prop: SecretProp }[]
	/**
	 * Which of its furnishings says hello to whoever's coming (see
	 * `Secret['greets']`), by its index, if not whoever's at its far end:
	 * The Miner, beside the mine's lift.
	 */
	greeter?: number
	/**
	 * Its manhole, if that's its way in (see `Secret`): the open `hole`,
	 * lying flat in the street, and the top of the `ladder` down it, poking
	 * up out of it, its left rail `ladderAt` in from the hole's left. Its
	 * shaft's walls, `brick` and `mortar`, the dark down it, and the
	 * ladder's iron.
	 */
	manhole?: {
		hole: SecretPicture
		ladder: SecretPicture
		ladderAt: number
		shaft: { brick: string; mortar: string; dark: string; rung: string }
	}
	/**
	 * Its duct, if that's its way out (see `Secret`): the `grate` in the
	 * street over it, and the duct's colours, for its shaft up through the
	 * rock to it, `width` wide.
	 */
	duct?: {
		grate: SecretPicture
		width: number
		steel: string
		lit: string
		shade: string
		seam: string
		air: string
		/**
		 * A lift's cage round whoever's blown up it, if it's a mine's
		 * shaft: its `back`, behind them, and its bars, `asset`, in front.
		 */
		cage?: SecretPicture & { back: string }
	}
}

/** A picture in or over a Secret: its image, and its size in world pixels. */
export interface SecretPicture {
	asset: string
	width: number
	height: number
}

/**
 * A course's hidden bonus runner (see `Course['found']`), sat waiting: on
 * their `seat`, in their sit pose, sunk `sink` into it, till anyone comes
 * within `near` of them along, on their level (`over`, in a room). Then
 * they're up on their feet, in `up` (a picture of theirs, their stand
 * pose's size), and saying one of `says` in a bubble over them, till
 * everyone's gone by: the Viking, up off his keg in the tavern under Gamla
 * Stan, raising his ale.
 */
export interface FoundWaiting {
	seat: SecretPicture
	sink: number
	up: string
	near: number
	says: readonly string[]
}

/**
 * A thing in a Secret's cavern: its picture, or pictures, flickering
 * between them (a telly's screen, a candle's flame). Lit, with `glow`: a
 * light round it, `x` from its middle and `y` up from the floor. With a
 * `rug` in front of it, on the floor. Hung on the wall, `hung` up off the
 * floor.
 */
export interface SecretProp {
	frames: string[]
	width: number
	height: number
	/** How long each of its frames is up, in ms, if not 180: fire, flickering fast. */
	frameMs?: number
	/** Its light; with `flicker`, flickering, as firelight does, drawn live rather than painted in. */
	glow?: {
		x: number
		y: number
		reach: number
		colour: string
		flicker?: boolean
	}
	rug?: boolean
	hung?: number
}

export interface Mine {
	from: number
	to: number
	carts: number[]
	secret: {
		/** Where it starts, up on its trestles, its stop, to jump up onto; and where it's back on the line along the Ground. */
		from: number
		to: number
		/** How high over the Ground its rail is, `x` along, between the two. */
		height: (x: number) => number
		/**
		 * The gallery it runs along, hollowed out of the rock, `from` to
		 * `to`: its floor's height over the Ground, and how high it is.
		 */
		gallery: { from: number; to: number; floor: number; room: number }
	}
}

/** A rail on a ski slope, to grind along: see `Course['rails']`. */
export interface Rail {
	from: number
	to: number
	height: number
	/**
	 * What it is: a rail, a box or a log, to grind; or a roof, to ski along
	 * the top of, no grinding about it, drawn as whatever it's the roof of.
	 */
	look: 'rail' | 'box' | 'log' | 'roof'
	/** A roof's thickness: under it, a ceiling, to bump a head on. */
	thick?: number
}

/**
 * A hut the course runs through, `from` to `to`: its roof a Rail to ski
 * over (see `Rail`), `height` over the Ground. Its inside, `back`, is drawn
 * behind whoever's in it, and its front, `front`, over them, till someone
 * racing goes in, and it's lifted away to see them in there. Both pictures
 * from its left, from its roof's top down to the path's near edge, drawn at
 * twice their size.
 */
export interface Hut {
	from: number
	to: number
	height: number
	/** How far over its roof's top its pictures start: room for its chimney. */
	above: number
	back: string
	front: string
}

/**
 * A course's special goal, its own, beside its score and collectables
 * goals: `goal`, what's to be done, said as such; done, by a go at it
 * that `done` says did it.
 */
export interface SpecialGoal {
	goal: string
	done: (run: SpecialRun) => boolean
	/** A bonus runner it unlocks, by runner id, the first time it's done (see `BONUS_RUNNERS`). */
	unlocks?: string
}

/** What a go at a course did, for its special goal to be judged by. */
export interface SpecialRun {
	/** Got round it. */
	finished: boolean
	/** How many of each bonus they had: `corgis` its rides, `fika`, `heads`. */
	counts: Partial<Record<string, number>>
	/** The hat on their head at the end, by its kind, if any. */
	hat?: string
	/** How far their long jump was measured, in metres, if they had one that landed in the sand. */
	longJump?: number
	/** The hats they had on getting onto a Ride, by kind: one each time. */
	rodeWearing?: string[]
	/** Stood on top of a guard tower, at some point. */
	toppedTower?: boolean
	/** How many Germs they popped, landing on them. */
	germsPopped?: number
	/** Dropped the cage a prisoner was in, setting them free (see `Course['cage']`). */
	freedPrisoner?: boolean
	/** Been down the course's Secret, and back out of it. */
	foundSecret?: boolean
	/** Got to the course's hidden bonus runner (see `Course['found']`). */
	metFound?: boolean
	/** Jumped on a rope bridge till it broke under them. */
	brokeBridge?: boolean
	/** Killed by a haunted house's monster, and come back as a ghost. */
	ghost?: boolean
	/** The most of a River's crocodiles they bounced on in turn, from the first, without touching down. */
	crocodiles?: number
	/** Brought their Follower over the finish line with them, still with them. */
	followerHome?: boolean
}

/**
 * A River across the course, the Nile on the Pyramids, from bank to bank,
 * `from` to `to`, its surface level at `level` (a y). The Ground's its bed,
 * `depth` under the surface, sloping down off each bank: whoever's on it is
 * wading, the water over their shins, slowed down (and so is the bus).
 * Its crocodiles are Obstacles (`kind: 'crocodile'`), to cross on.
 */
export interface River {
	from: number
	to: number
	level: number
	depth: number
	/**
	 * A pond, rather than a river flowing away across the field: its far
	 * edge rounded off, a mud bank all round it, and only as deep as it is
	 * in front (see `draw/river.tsx`). Dino Island's, under the diplodocus.
	 */
	pond?: boolean
}

/**
 * A River's colours: its `water` at the surface, darkening to `deep`, the
 * `shine` of the light on its ripples, the `bank` at its edges, and the
 * `wet` sand where it meets the water.
 */
export interface RiverLook {
	water: string
	deep: string
	shine: string
	bank: string
	wet: string
}

/**
 * A herd running alongside the path (see `CourseLook['herds']`): each of
 * them its `frames`, `width` by `height`, `behind` the first, `down` the
 * grass in front of the path, a run frame every `stride` px; at `speed` px a
 * tick. `over` the path, rather than in front of it: right on it, beside
 * whoever's running.
 */
export interface Herd {
	from: number
	speed: number
	over?: boolean
	members: {
		frames: string[]
		width: number
		height: number
		behind: number
		down: number
		stride: number
	}[]
}

/**
 * A huge spider's picture, or whatever's in its place (see
 * `CourseLook['spider']`): its walk's `frames` and its `squashed` one, all
 * `width` by `height`, facing left; `head` and `body`, the tops to land on,
 * from and to across it from its left, `top` up from its feet; and `bite`,
 * what knocks you down running into it, up to `top`. `word`, said as it
 * does.
 */
export interface SpiderLook {
	frames: string[]
	squashed: string
	width: number
	height: number
	head: { from: number; to: number; top: number }
	body: { from: number; to: number; top: number }
	bite: { from: number; to: number; top: number }
	word?: string
}

/**
 * A volcano's eruption (see `CourseLook['eruption']`): its crater's middle
 * `crater`, a y its lip; set off once everyone racing is past `at` (or,
 * all of them caught, the bus is). And where
 * everything's drawn as a silhouette, black against the burning sky.
 */
export interface Eruption {
	at: number
	crater: { x: number; y: number }
	silhouette: { from: number; to: number }
	/** Where the smoke's cleared, and the sky's its own again, by: over the sea. */
	clear: number
}

/**
 * Deep Water, swum through, not fallen into as the Sea (see `sea`) is:
 * Dino Island's sea, off its cliff. From where the course goes into it, `from`, to
 * where it comes up out of it, `to`, its surface at `surface` (a y). The
 * Ground under it is the seabed. Into it, off the land, and you're
 * swimming, up and down as you steer, through what's in it, and up out of
 * it onto the shore the far side, as soon as it's shallow enough to stand.
 * The bus goes through it at `busPace` of its own pace, at most.
 */
export interface DeepWater {
	from: number
	to: number
	surface: number
	busPace: number
	/**
	 * Not water at all, but space: nothing floats you up, there's no
	 * surface to splash into, nor seabed to bonk; its top is as high as
	 * anyone can swim, its Ground as low. Out of it, the far side, you fall,
	 * down onto whatever's there. Rocket Launch's.
	 */
	space?: boolean
	/**
	 * As low as anyone can swim, if not the Ground: space's floor, over a
	 * planet's curved edge, drawn on down off the bottom of the screen.
	 */
	floor?: number
}

/** The sea's colours, swum through: its `water` near the surface, darkening to `deep`; the `light` playing down through it, and its `surface`'s shine. */
export interface DeepWaterLook {
	water: string
	deep: string
	light: string
	surface: string
}

/**
 * A band of the backdrop: a picture repeated along it, `height` tall from
 * `top` down the screen, going by at `parallax` of the path's pace, the
 * further off the slower.
 */
export interface BackdropBand {
	asset: string
	top: number
	height: number
	parallax: number
}

/**
 * What can follow someone along (see `followers.ts`): Dino Island's
 * hatchling, out of its egg on its own two legs.
 */
export type FollowerKind = 'hatchling'

/**
 * A boss, in its own room from `room.from` to `room.to`, stood in the middle
 * of it at `x`, `width` across and `height` tall: once everyone still racing
 * is in, its door shuts behind them, the bus waits outside, and it wakes,
 * firing plasma about the room. Land on its head `hp` times (a few more for
 * each Player after the first, in a Round) and it's beaten, the door out the far side
 * opening. Every `stompEvery` of those, it stomps, shaking everyone off
 * whatever they're up on, down to the floor. Rocket Launch's giant alien.
 */
export interface Boss {
	room: { from: number; to: number }
	x: number
	width: number
	height: number
	/** How wide its head is, to land on, across its top. */
	head: number
	hp: number
	stompEvery: number
}

/** A course as it's written: its number comes from where it is in `COURSES`. */
export type CourseDefinition = Omit<Course, 'number'>
