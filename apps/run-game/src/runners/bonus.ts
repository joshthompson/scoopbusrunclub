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
 *
 * Their pictures are PNGs in `assets/runners/<who>/`, a pixel a cell, facing
 * left, as the members' are: `run.png` a strip of frames side by side, and
 * a picture for each other pose they have.
 */

/** A run frame's size, in cells. */
const WIDTH = 23
const HEIGHT = 29

/**
 * Each frame of a run strip of `frames`: the strip, slid along to it, as the
 * engine takes it.
 */
const runFrames = (strip: string, frames: number) =>
	Array.from(
		{ length: frames },
		(_, n) =>
			`${strip}#${-WIDTH * RUNNER_SCALE * n},0,${WIDTH * frames},${HEIGHT}`,
	)

/** A dance, from its strip in `assets/runners/<who>/dance.png` (see `scripts/make-dances.ts`). */
const dance = (strip: string, who: string) =>
	stripDance(strip, danceForKey(who), WIDTH, HEIGHT)

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
	name: 'Yeti',
	bonus: true,
	unlockedBy: 'Found under Everest',
	toUnlock: 'Look under Everest',
	sprite: {
		run: runFrames(yetiRun, 6),
		sit: yetiSit,
		stand: yetiStand,
		ski: yetiSki,
		skiTuck: yetiSkiTuck,
		snowboard: yetiSnowboard,
		face: yetiFace,
		dance: dance(yetiDance, 'yeti'),
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
	unlockedBy: 'Found on City Rooftop',
	toUnlock: 'Look around City Rooftop',
	sprite: {
		run: runFrames(batPersonRun, 6),
		sit: batPersonSit,
		stand: batPersonStand,
		ski: batPersonSki,
		skiTuck: batPersonSkiTuck,
		face: batPersonFace,
		dance: dance(batPersonDance, 'bat-person'),
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
	name: 'Viking',
	bonus: true,
	unlockedBy: 'Found in Gamla Stan',
	toUnlock: 'Look around Gamla Stan',
	sprite: {
		run: runFrames(vikingRun, 6),
		sit: vikingSit,
		stand: vikingStand,
		ski: vikingSki,
		skiTuck: vikingSkiTuck,
		snowboard: vikingSnowboard,
		face: vikingFace,
		dance: dance(vikingDance, 'viking'),
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
	unlockedBy: 'Unlocked by becoming a ghost in Halloween Town',
	toUnlock: 'Become a ghost in Halloween Town',
	// White bones: out at night, not on a white card.
	darkCard: true,
	sprite: {
		...SKELETON_SPRITE,
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
	unlockedBy: "Unlocked by bouncing across the Pyramids' crocodiles",
	toUnlock: "Bounce across the Pyramids' crocodiles",
	sprite: {
		run: runFrames(msCrocodileRun, 6),
		sit: msCrocodileSit,
		stand: msCrocodileStand,
		face: msCrocodileFace,
		dance: dance(msCrocodileDance, 'ms-crocodile'),
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
	unlockedBy: 'Unlocked by collecting all 10 bananas at Midnattsloppet',
	toUnlock: 'Collect all 10 bananas at Midnattsloppet',
	sprite: {
		run: runFrames(bananaGirlRun, 6),
		sit: bananaGirlSit,
		stand: bananaGirlStand,
		ski: bananaGirlSki,
		skiTuck: bananaGirlSkiTuck,
		snowboard: bananaGirlSnowboard,
		face: bananaGirlFace,
		dance: dance(bananaGirlDance, 'banana-girl'),
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
	unlockedBy: 'Unlocked by completing all courses',
	toUnlock: 'Complete all courses',
	look: DERI_LOOK,
	sprite: lookSprite(DERI_LOOK),
}

export const BONUS_RUNNERS: Playable[] = [
	YETI,
	BAT_PERSON,
	VIKING,
	SKELETON,
	MS_CROCODILE,
	BANANA_GIRL,
	DERI,
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

/** Everyone unlocked in this browser: who's to pick from, with the club. */
export const unlockedRunners = () =>
	UNLOCKABLES.filter((runner) => runnerUnlocked(runner.id))
