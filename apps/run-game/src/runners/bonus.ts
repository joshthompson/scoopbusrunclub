import skeletonFace from '@/assets/halloween/skeleton-face.png'
import skeletonSit from '@/assets/halloween/skeleton-sit.png'
import type { CharacterSpriteProps } from '@/utils/createRunnerFrames'
import bananaGirlDance from '../assets/runners/banana-girl/dance.png'
import bananaGirlFace from '../assets/runners/banana-girl/face.png'
import bananaGirlRun from '../assets/runners/banana-girl/run.png'
import bananaGirlSit from '../assets/runners/banana-girl/sit.png'
import bananaGirlSkiTuck from '../assets/runners/banana-girl/ski-tuck.png'
import bananaGirlSki from '../assets/runners/banana-girl/ski.png'
import bananaGirlSnowboard from '../assets/runners/banana-girl/snowboard.png'
import bananaGirlStand from '../assets/runners/banana-girl/stand.png'
import batPersonDance from '../assets/runners/bat-person/dance.png'
import batPersonFace from '../assets/runners/bat-person/face.png'
import batPersonRun from '../assets/runners/bat-person/run.png'
import batPersonSit from '../assets/runners/bat-person/sit.png'
import batPersonSkiTuck from '../assets/runners/bat-person/ski-tuck.png'
import batPersonSki from '../assets/runners/bat-person/ski.png'
import batPersonStand from '../assets/runners/bat-person/stand.png'
import bonnieBottleDance from '../assets/runners/bonnie-bottle/dance.png'
import bonnieBottleFace from '../assets/runners/bonnie-bottle/face.png'
import bonnieBottleRun from '../assets/runners/bonnie-bottle/run.png'
import bonnieBottleSit from '../assets/runners/bonnie-bottle/sit.png'
import bonnieBottleSkiTuck from '../assets/runners/bonnie-bottle/ski-tuck.png'
import bonnieBottleSki from '../assets/runners/bonnie-bottle/ski.png'
import bonnieBottleSnowboard from '../assets/runners/bonnie-bottle/snowboard.png'
import bonnieBottleStand from '../assets/runners/bonnie-bottle/stand.png'
import detMunchDance from '../assets/runners/det-munch/dance.png'
import detMunchFace from '../assets/runners/det-munch/face.png'
import detMunchRun from '../assets/runners/det-munch/run.png'
import detMunchSit from '../assets/runners/det-munch/sit.png'
import detMunchSkiTuck from '../assets/runners/det-munch/ski-tuck.png'
import detMunchSki from '../assets/runners/det-munch/ski.png'
import detMunchSnowboard from '../assets/runners/det-munch/snowboard.png'
import detMunchStand from '../assets/runners/det-munch/stand.png'
import furbyQueenDance from '../assets/runners/furby-queen/dance.png'
import furbyQueenFace from '../assets/runners/furby-queen/face.png'
import furbyQueenRun from '../assets/runners/furby-queen/run.png'
import furbyQueenSit from '../assets/runners/furby-queen/sit.png'
import furbyQueenSkiTuck from '../assets/runners/furby-queen/ski-tuck.png'
import furbyQueenSki from '../assets/runners/furby-queen/ski.png'
import furbyQueenSnowboard from '../assets/runners/furby-queen/snowboard.png'
import furbyQueenStand from '../assets/runners/furby-queen/stand.png'
import msCrocodileDance from '../assets/runners/ms-crocodile/dance.png'
import msCrocodileFace from '../assets/runners/ms-crocodile/face.png'
import msCrocodileRun from '../assets/runners/ms-crocodile/run.png'
import msCrocodileSit from '../assets/runners/ms-crocodile/sit.png'
import msCrocodileStand from '../assets/runners/ms-crocodile/stand.png'
import skeletonDance from '../assets/runners/skeleton/dance.png'
import skeletonSkiTuck from '../assets/runners/skeleton/ski-tuck.png'
import skeletonSki from '../assets/runners/skeleton/ski.png'
import skeletonSnowboard from '../assets/runners/skeleton/snowboard.png'
import skeletonStand from '../assets/runners/skeleton/stand.png'
import spiritOfJazzDance from '../assets/runners/spirit-of-jazz/dance.png'
import spiritOfJazzFace from '../assets/runners/spirit-of-jazz/face.png'
import spiritOfJazzRun from '../assets/runners/spirit-of-jazz/run.png'
import spiritOfJazzSit from '../assets/runners/spirit-of-jazz/sit.png'
import spiritOfJazzSkiTuck from '../assets/runners/spirit-of-jazz/ski-tuck.png'
import spiritOfJazzSki from '../assets/runners/spirit-of-jazz/ski.png'
import spiritOfJazzSnowboard from '../assets/runners/spirit-of-jazz/snowboard.png'
import spiritOfJazzStand from '../assets/runners/spirit-of-jazz/stand.png'
import theMinerDance from '../assets/runners/the-miner/dance.png'
import theMinerFace from '../assets/runners/the-miner/face.png'
import theMinerRun from '../assets/runners/the-miner/run.png'
import theMinerSit from '../assets/runners/the-miner/sit.png'
import theMinerSkiTuck from '../assets/runners/the-miner/ski-tuck.png'
import theMinerSki from '../assets/runners/the-miner/ski.png'
import theMinerSnowboard from '../assets/runners/the-miner/snowboard.png'
import theMinerStand from '../assets/runners/the-miner/stand.png'
import vikingDance from '../assets/runners/viking/dance.png'
import vikingFace from '../assets/runners/viking/face.png'
import vikingRun from '../assets/runners/viking/run.png'
import vikingSit from '../assets/runners/viking/sit.png'
import vikingSkiTuck from '../assets/runners/viking/ski-tuck.png'
import vikingSki from '../assets/runners/viking/ski.png'
import vikingSnowboard from '../assets/runners/viking/snowboard.png'
import vikingStand from '../assets/runners/viking/stand.png'
import yetiDance from '../assets/runners/yeti/dance.png'
import yetiFace from '../assets/runners/yeti/face.png'
import yetiRun from '../assets/runners/yeti/run.png'
import yetiSit from '../assets/runners/yeti/sit.png'
import yetiSkiTuck from '../assets/runners/yeti/ski-tuck.png'
import yetiSki from '../assets/runners/yeti/ski.png'
import yetiSnowboard from '../assets/runners/yeti/snowboard.png'
import yetiStand from '../assets/runners/yeti/stand.png'
import { DEERSTALKER, JAZZ_HAT } from '../draw/art/hats'
import { headShowsIn } from '../draw/heads'
import { RUNNER_SCALE } from '../game/constants'
import { runnerUnlocked } from '../saved/unlocked'
import { danceForKey } from './dance'
import { stripDance } from './dancing'
import { LOCKED_MEMBERS, type Playable, lookSprite } from './playable'
import { SKELETON_SPRITE } from './skeleton'

/**
 * Bonus runners: not club members, and not anyone's own, but found out on
 * the courses, and unlocked to run as by finding them. The Yeti, under
 * Everest, the first; Bat Person, up on the girders over City Rooftop; the
 * Viking, in the tavern under Gamla Stan.
 * The Skeleton isn't found, but earned: Halloween Town's special goal, over
 * the line in a pumpkin. Nor is Ms Crocodile: she's the Pyramids', across
 * the Nile on every crocodile. Nor is Deri: he's for finishing every course.
 * The Miner, two of them in the one cape, is found with the mine people,
 * deep under The Caves.
 * The Spirit of Jazz lives up at the top of Karolinska's lungs.
 * Bonnie Bottle is for getting through every course in one Endless run, and
 * Det. Munch for finding every collectable there is.
 *
 * Their pictures are PNGs in `assets/runners/<who>/`, a pixel a cell, facing
 * left, as the members' are: `run.png` a strip of frames side by side, and
 * a picture for each other pose they have.
 */

/** A run frame's size, in cells: the members', unless they're wider. */
const WIDTH = 23
const HEIGHT = 29

/**
 * Each frame of a run strip of `frames`, each `width` cells across: the
 * strip, slid along to it, as the engine takes it.
 */
const runFrames = (strip: string, frames: number, width = WIDTH) =>
	Array.from(
		{ length: frames },
		(_, n) =>
			`${strip}#${-width * RUNNER_SCALE * n},0,${width * frames},${HEIGHT}`,
	)

/** A dance, from its strip in `assets/runners/<who>/dance.png` (see `scripts/make-dances.ts`). */
const dance = (strip: string, who: string, width = WIDTH) =>
	stripDance(strip, danceForKey(who), width, HEIGHT)

/**
 * The Yeti: big, hunched and friendly, shaggy white fur, lavender down its
 * back and under its belly, a hump of shoulders behind its head, a pale
 * blue face under its fringe with one dark eye and a toothy grin, and big
 * flat feet. Its far arm and leg are in shadow, behind it. Six frames to
 * its run, as the members have: each foot down in front, under it, then
 * pushing off behind, its arms swinging against its legs.
 */
export const YETI: Playable = {
	id: 'bonus:yeti',
	name: 'Yuri the Yeti',
	bonus: true,
	unlock: 'Found on Everest',
	tagline: 'Just wants to be friends',
	sprite: {
		run: runFrames(yetiRun, 6),
		sit: yetiSit,
		stand: yetiStand,
		ski: yetiSki,
		skiTuck: yetiSkiTuck,
		snowboard: yetiSnowboard,
		face: yetiFace,
		dance: dance(yetiDance, 'yeti'),
		neck: { x: 8, y: 7 },
		width: WIDTH,
		height: HEIGHT,
	},
}

/**
 * Bat Person: a big man in a white vest stretched over his belly and red
 * shorts with white polka dots, a black bat hood pulled down over his eyes,
 * its ears up, and a pair of cheap bat wings tied on his back. His far arm
 * and leg are in shadow. Six frames to his run, as the members have, his
 * wings flapping once a stride. On a snowboard, he stands as he does still.
 */
export const BAT_PERSON: Playable = {
	id: 'bonus:bat-person',
	name: 'Bat Person',
	bonus: true,
	unlock: 'Found on City Rooftop',
	tagline: 'The hero no one deserves',
	sprite: {
		run: runFrames(batPersonRun, 6),
		sit: batPersonSit,
		stand: batPersonStand,
		ski: batPersonSki,
		skiTuck: batPersonSkiTuck,
		face: batPersonFace,
		dance: dance(batPersonDance, 'bat-person'),
		neck: { x: 10, y: 7 },
		width: WIDTH,
		height: HEIGHT,
	},
}

/**
 * The Viking: old, no helmet, his long white hair down his back under a
 * leather headband, a big white beard, braided at its end, over a blue
 * tunic, fur over his shoulders, and a round shield on his back, red and
 * white in quarters. His far arm and leg are in shadow. Six frames to his
 * run, the members' stride, his axe over his shoulder, its head up behind
 * him. Stood still, he leans on it; on skis, it's his other pole.
 */
export const VIKING: Playable = {
	id: 'bonus:viking',
	name: 'Sven',
	bonus: true,
	unlock: 'Found in Gamla Stan',
	tagline: 'Part time Viking, full time runner',
	sprite: {
		run: runFrames(vikingRun, 6),
		sit: vikingSit,
		stand: vikingStand,
		ski: vikingSki,
		skiTuck: vikingSkiTuck,
		snowboard: vikingSnowboard,
		face: vikingFace,
		dance: dance(vikingDance, 'viking'),
		neck: { x: 8, y: 7 },
		width: WIDTH,
		height: HEIGHT,
	},
}

/**
 * The Skeleton: the website's Halloween skeleton, as Halloween Town's pack
 * has it, with its sit pose to duck in and its face. For finishing Halloween
 * Town in a pumpkin (its special goal). Its other poses are drawn for it
 * here, bone by bone in the website's white, in `assets/runners/skeleton/`:
 * stood still, arms at its sides; on skis, crouched over its poles; curled
 * up in the air, its poles under its arms; and on a snowboard, arms out.
 */
export const SKELETON: Playable = {
	id: 'bonus:skeleton',
	name: 'Skeleton',
	bonus: true,
	unlock: 'Found in Halloween Town',
	tagline: "Death couldn't slow him down",
	sprite: {
		...SKELETON_SPRITE,
		neck: { x: 10.5, y: 7 },
		sit: skeletonSit,
		stand: skeletonStand,
		ski: skeletonSki,
		skiTuck: skeletonSkiTuck,
		snowboard: skeletonSnowboard,
		face: skeletonFace,
		dance: dance(skeletonDance, 'skeleton'),
	},
}

/**
 * Ms Crocodile: a crocodile from the Nile who loves to run, up on her back
 * legs as anyone does, in an orange crop top, purple running shorts, white
 * socks and orange trainers, a purple headband with an orange bow on it,
 * her tail swishing behind her. Drawn on the members' run (the custom
 * runner template's), so six frames to her stride as theirs. For bouncing
 * across the Nile on its crocodiles, the Pyramids' special goal. On skis or
 * a snowboard, she stands as she does still.
 */
export const MS_CROCODILE: Playable = {
	id: 'bonus:ms-crocodile',
	name: 'Ms Crocodile',
	bonus: true,
	unlock: 'Found at the Pyramids',
	tagline: 'Da Nile is a river',
	sprite: {
		run: runFrames(msCrocodileRun, 6),
		sit: msCrocodileSit,
		stand: msCrocodileStand,
		face: msCrocodileFace,
		dance: dance(msCrocodileDance, 'ms-crocodile'),
		neck: { x: 9.5, y: 7 },
		width: WIDTH,
		height: HEIGHT,
	},
}

/**
 * Banana Girl: one of the banana stand's supporters at Midnattsloppet, in
 * a whole-body banana suit, its stalk on top, its peel coming away down
 * her back, a blue sticker on her front, her face out of a hole in it
 * under an auburn fringe, bare legs and pink trainers. Her run is on
 * the members' stride, the suit over it. Her dance, a dancing banana's, is
 * also what the supporters by the stand are doing (see `midnattsloppet`).
 * For picking up every banana on Midnattsloppet in one go.
 */
export const BANANA_GIRL: Playable = {
	id: 'bonus:banana-girl',
	name: 'Banana Girl',
	bonus: true,
	unlock: 'Found at Midnattsloppet',
	tagline: 'Stina works for Fairtrade',
	sprite: {
		run: runFrames(bananaGirlRun, 6),
		sit: bananaGirlSit,
		stand: bananaGirlStand,
		ski: bananaGirlSki,
		skiTuck: bananaGirlSkiTuck,
		snowboard: bananaGirlSnowboard,
		face: bananaGirlFace,
		dance: dance(bananaGirlDance, 'banana-girl'),
		neck: { x: 9, y: 11 },
		width: WIDTH,
		height: HEIGHT,
	},
}

/**
 * The Furby Queen: someone in a giant Furby costume, its head pink tinsel,
 * two big eyes with long lashes and a yellow beak, its ears up either side
 * of her gold crown; an orange tinsel body to her thighs, and pink glitter
 * boots up over her knees. A red royal cloak down her back, an ermine trim
 * along its hem, flying out behind her as she runs. Her run is on the
 * members' stride, the costume over it. Her dance, a queen's: swaying, her
 * cloak swinging, waving one hand up and then the other. Found on her
 * throne in her palace, floating over Furby Fields.
 */
export const FURBY_QUEEN: Playable = {
	id: 'bonus:furby-queen',
	name: 'Queen Furby',
	bonus: true,
	unlock: 'Found in Furby Fields',
	tagline: 'Long may she run',
	sprite: {
		run: runFrames(furbyQueenRun, 6),
		sit: furbyQueenSit,
		stand: furbyQueenStand,
		ski: furbyQueenSki,
		skiTuck: furbyQueenSkiTuck,
		snowboard: furbyQueenSnowboard,
		face: furbyQueenFace,
		dance: dance(furbyQueenDance, 'furby-queen'),
		neck: { x: 10, y: 12 },
		width: WIDTH,
		height: HEIGHT,
	},
}

/** Her head's out of the banana, under her fringe: a hat goes on that, not the stalk. */
const BANANA_GIRL_FRINGE = '#8a3f1c'
headShowsIn(
	[
		bananaGirlRun,
		bananaGirlSit,
		bananaGirlStand,
		bananaGirlSki,
		bananaGirlSkiTuck,
		bananaGirlSnowboard,
		bananaGirlDance,
	],
	[BANANA_GIRL_FRINGE],
)

/**
 * His dance throws his hands up over his head: his head's found from his
 * dreadlocks, for his hat to stay on it, not on his hands.
 */
const SPIRIT_OF_JAZZ_LOCKS = ['#2b1d16', '#4e3628']
headShowsIn([spiritOfJazzDance], SPIRIT_OF_JAZZ_LOCKS)

/** The Miner's frames: two of them abreast, one behind the other, so wider than anyone's. */
const MINER_WIDTH = 36

/**
 * The Miner: two of the mine people, conjoined, in one stiff orange cape.
 * Side on, one behind the other, two heads in orange hard hats, fair hair
 * under them, an eye each, the one in front with light stubble; the cape
 * sticking straight out from the shoulders of the one in front to the
 * shoulders of the one behind, dipped between their necks where it's
 * stretched across, and hanging down to their thighs like a box. No arms
 * at all. Four legs under it, in dark trousers and blue-grey trainers with
 * white soles. Six frames to their run, the members' stride, the one behind
 * a frame out of step, the cape rocking with them. Ducked, they're down
 * inside it, its collar up over their chins; on skis or a snowboard, with
 * no arms for poles, they lean into it. Their dance, a bounce, the two
 * swaying opposite ways, hats knocking together.
 */
export const MINER: Playable = {
	id: 'bonus:the-miner',
	name: 'Miner Twins',
	bonus: true,
	unlock: 'Found in The Caves',
	tagline: 'Two heads, no arms',
	sprite: {
		run: runFrames(theMinerRun, 6, MINER_WIDTH),
		sit: theMinerSit,
		stand: theMinerStand,
		ski: theMinerSki,
		skiTuck: theMinerSkiTuck,
		snowboard: theMinerSnowboard,
		face: theMinerFace,
		dance: dance(theMinerDance, 'the-miner', MINER_WIDTH),
		neck: { x: 10.5, y: 10 },
		width: MINER_WIDTH,
		height: HEIGHT,
	},
}

/**
 * A hat goes on the one in front: their hard hat's drawn a hair off the one
 * behind's, to be found by.
 */
const MINER_LEADING_HAT = ['#f6774f', '#df4a27', '#a8331b']
headShowsIn(
	[
		theMinerRun,
		theMinerSit,
		theMinerStand,
		theMinerSki,
		theMinerSkiTuck,
		theMinerSnowboard,
		theMinerDance,
	],
	MINER_LEADING_HAT,
)

/**
 * The Spirit of Jazz: tall and thin, in a white pinstriped suit over a
 * black shirt, black gloves, his face painted as a skull, turned three
 * quarters to us: two red eyes a pixel apart, each in a black socket, a
 * black nose, his mouth stitched; his dreadlocks down past his shoulders.
 * And on his head his own top hat, white, and on fire (`JAZZ_HAT`), drawn
 * for his head: until he puts any other hat on, which goes on in place of
 * it. Drawn on the members' run (the custom runner template's), so six
 * frames to his stride as theirs. His dance is his own, drawn by hand:
 * jazz hands, and a spin (`jazz`). Found up at the top of Karolinska's
 * lungs, on an airway only got to off the highest one at the top of its
 * breath.
 */
export const SPIRIT_OF_JAZZ: Playable = {
	id: 'bonus:spirit-of-jazz',
	name: 'Spirit of Jazz',
	bonus: true,
	unlock: 'Found in The Hospital',
	tagline: 'Lives in a lung',
	sprite: {
		run: runFrames(spiritOfJazzRun, 6),
		sit: spiritOfJazzSit,
		stand: spiritOfJazzStand,
		ski: spiritOfJazzSki,
		skiTuck: spiritOfJazzSkiTuck,
		snowboard: spiritOfJazzSnowboard,
		face: spiritOfJazzFace,
		dance: dance(spiritOfJazzDance, 'spirit-of-jazz'),
		neck: { x: 10.5, y: 7 },
		ownHat: JAZZ_HAT,
		width: WIDTH,
		height: HEIGHT,
	},
}

/**
 * Deri: the Prince of Parkrun, a guest of the club's, in his look from the
 * website (kept here, so he's there without the backend). Theirs to run as
 * once they've finished every course.
 */
const DERI_LOOK: CharacterSpriteProps = {
	skin: 'light',
	head: {
		hair: 'short',
		hairColor: '#370b00',
		facialHair: 'stubble',
		facialHairColor: '#9d8059',
		accessory: 'cap',
		accessoryColor: '#fecb3e',
		topColorForNeck: false,
	},
	topType: 'longsleeve',
	topColor: '#110100',
	bottomType: 'shorts',
	bottomColor: '#474747',
	showColor: '#2255cc',
	shoeColor: '#d9ec37',
}

export const DERI: Playable = {
	id: 'bonus:deri',
	name: 'Deri',
	bonus: true,
	unlock: 'For finishing every course',
	tagline: 'The Prince of Parkrun',
	look: DERI_LOOK,
	sprite: { ...lookSprite(DERI_LOOK), neck: { x: 11, y: 6 } },
}

/**
 * Bonnie Bottle: an ultra runner who's a bottle of blue sports drink, side
 * on: her head its orange cap, a pink sweatband round it, her eye and a
 * smile on it, the white pull nozzle on top; the bottle clear at its neck,
 * the drink in it sloshing as she goes, a white label round her middle, an
 * orange stripe and a yellow bolt on it, and a grip pinched in under it.
 * Out of it, strong arms and legs, pink wristbands, pink calf sleeves and
 * green trail shoes. Six frames to her run, the members' stride, her arms
 * pumping. Too stiff to crouch much, she squats right down to duck. Her
 * dance is her own, square on, drawn by hand: flexing (`flex`). For getting
 * through every course in one run of Endless (its special goal, see
 * `courses/endless`).
 */
export const BONNIE_BOTTLE: Playable = {
	id: 'bonus:bonnie-bottle',
	name: 'Bonnie Bottle',
	bonus: true,
	unlock: 'For every course in one Endless run',
	tagline: 'Electrolytes for 100 miles',
	sprite: {
		run: runFrames(bonnieBottleRun, 6),
		sit: bonnieBottleSit,
		stand: bonnieBottleStand,
		ski: bonnieBottleSki,
		skiTuck: bonnieBottleSkiTuck,
		snowboard: bonnieBottleSnowboard,
		face: bonnieBottleFace,
		dance: dance(bonnieBottleDance, 'bonnie-bottle'),
		neck: { x: 11, y: 7 },
		width: WIDTH,
		height: HEIGHT,
	},
}

/**
 * A hat goes on her cap, not on the nozzle on top of it, nor her fists when
 * they're up over it: her head's found from her cap's colours.
 */
const BONNIE_CAP = ['#f0662a', '#ff9461', '#c24a1c', '#ff3d8b', '#c92a6a']
headShowsIn(
	[
		bonnieBottleRun,
		bonnieBottleSit,
		bonnieBottleStand,
		bonnieBottleSki,
		bonnieBottleSkiTuck,
		bonnieBottleSnowboard,
		bonnieBottleDance,
	],
	BONNIE_CAP,
)

/** Det. Munch's frames: a big hippo, wider than anyone on the club's template. */
const MUNCH_WIDTH = 27

/**
 * Det. Munch: a large hippo, up on her hind legs and dressed as Sherlock
 * Holmes. Her head side on, a big slate-blue muzzle out front, her mouth a
 * long line along it, a tooth showing, her eye up high and a little ear at
 * the back; a curved pipe in the front of her mouth. A khaki Inverness coat
 * down to her knees, round over her belly, and its cape over her shoulders,
 * lighter, flying out behind as she runs. Stubby blue-grey legs in brogues.
 * And on her head, her own deerstalker (`DEERSTALKER`), drawn for it: until
 * she puts any other hat on, which goes on in place of it. Six frames to her
 * run, short steps, her head kept level through all of them for a hat to
 * sit still on: as she comes down, her belly does, the cape stretching to
 * meet it. Stood, her magnifying glass up. Her dance is her own, drawn by
 * hand (`sleuth`): peering through her glass one way and then the other, a
 * puff on her pipe, a shimmy, and her glass up for "Eureka!". For finding
 * every collectable there is.
 */
export const DET_MUNCH: Playable = {
	id: 'bonus:det-munch',
	name: 'Det. Munch',
	bonus: true,
	unlock: 'For finding every collectable',
	tagline: 'Elementary, my dear runner',
	sprite: {
		run: runFrames(detMunchRun, 6, MUNCH_WIDTH),
		sit: detMunchSit,
		stand: detMunchStand,
		ski: detMunchSki,
		skiTuck: detMunchSkiTuck,
		snowboard: detMunchSnowboard,
		face: detMunchFace,
		dance: dance(detMunchDance, 'det-munch', MUNCH_WIDTH),
		neck: { x: 13, y: 9 },
		ownHat: DEERSTALKER,
		width: MUNCH_WIDTH,
		height: HEIGHT,
	},
}

/**
 * A hat goes on her skull, not on her pipe's smoke or her glass held up:
 * her head's found from a hippo's colours.
 */
const MUNCH_HEAD = ['#7f99ae', '#a3b8c8', '#475d73']
headShowsIn(
	[
		detMunchRun,
		detMunchSit,
		detMunchStand,
		detMunchSki,
		detMunchSkiTuck,
		detMunchSnowboard,
		detMunchDance,
	],
	MUNCH_HEAD,
)

export const BONUS_RUNNERS: Playable[] = [
	YETI,
	BAT_PERSON,
	VIKING,
	SKELETON,
	MS_CROCODILE,
	BANANA_GIRL,
	FURBY_QUEEN,
	MINER,
	SPIRIT_OF_JAZZ,
	DERI,
	BONNIE_BOTTLE,
	DET_MUNCH,
]

/** A bonus runner, by their runner id: unlocked here or not, to show anyone who's running as them. */
export const bonusRunner = (id: string) =>
	BONUS_RUNNERS.find((r) => r.id === id)

/**
 * Everyone there is to unlock, in the order they're shown: Link, for riding
 * a corgi, then the bonus runners.
 */
export const UNLOCKABLES: Playable[] = [...LOCKED_MEMBERS, ...BONUS_RUNNERS]

/** Anyone to unlock, by runner id: to show off when they are. */
export const unlockable = (id: string) => UNLOCKABLES.find((r) => r.id === id)

/**
 * Everyone unlocked in this browser: who's to pick from, with the club. And,
 * in a Room, anyone unlocked on the big screen too (`also`, by runner id).
 */
export const unlockedRunners = (also: readonly string[] = []) =>
	UNLOCKABLES.filter(
		(runner) => runnerUnlocked(runner.id) || also.includes(runner.id),
	)
