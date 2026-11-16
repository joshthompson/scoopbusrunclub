import skeletonFace from '@/assets/halloween/skeleton-face.png'
import skeletonSit from '@/assets/halloween/skeleton-sit.png'
import type { CharacterSpriteProps } from '@/utils/createRunnerFrames'
import batPersonFace from '../assets/runners/bat-person/face.png'
import batPersonRun from '../assets/runners/bat-person/run.png'
import batPersonSit from '../assets/runners/bat-person/sit.png'
import batPersonSkiTuck from '../assets/runners/bat-person/ski-tuck.png'
import batPersonSki from '../assets/runners/bat-person/ski.png'
import batPersonStand from '../assets/runners/bat-person/stand.png'
import skeletonSkiTuck from '../assets/runners/skeleton/ski-tuck.png'
import skeletonSki from '../assets/runners/skeleton/ski.png'
import skeletonSnowboard from '../assets/runners/skeleton/snowboard.png'
import skeletonStand from '../assets/runners/skeleton/stand.png'
import vikingFace from '../assets/runners/viking/face.png'
import vikingRun from '../assets/runners/viking/run.png'
import vikingSit from '../assets/runners/viking/sit.png'
import vikingSkiTuck from '../assets/runners/viking/ski-tuck.png'
import vikingSki from '../assets/runners/viking/ski.png'
import vikingSnowboard from '../assets/runners/viking/snowboard.png'
import vikingStand from '../assets/runners/viking/stand.png'
import yetiFace from '../assets/runners/yeti/face.png'
import yetiRun from '../assets/runners/yeti/run.png'
import yetiSit from '../assets/runners/yeti/sit.png'
import yetiSkiTuck from '../assets/runners/yeti/ski-tuck.png'
import yetiSki from '../assets/runners/yeti/ski.png'
import yetiSnowboard from '../assets/runners/yeti/snowboard.png'
import yetiStand from '../assets/runners/yeti/stand.png'
import { RUNNER_SCALE } from '../game/constants'
import { runnerUnlocked } from '../saved/unlocked'
import { LOCKED_MEMBERS, type Playable, lookSprite } from './playable'
import { SKELETON_SPRITE } from './skeleton'

/**
 * Bonus runners: not club members, and not anyone's own, but found out on
 * the courses, and unlocked to run as by finding them. The Yeti, under
 * Everest, the first; Bat Person, up on the girders over City Rooftop; the
 * Viking, in the tavern under Gamla Stan.
 * The Skeleton isn't found, but earned: Halloween Town's special goal, over
 * the line in a pumpkin. Nor is Deri: he's for finishing every course.
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
	unlockedBy: 'Found in his den under Everest',
	sprite: {
		run: runFrames(yetiRun, 6),
		sit: yetiSit,
		stand: yetiStand,
		ski: yetiSki,
		skiTuck: yetiSkiTuck,
		snowboard: yetiSnowboard,
		face: yetiFace,
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
	unlockedBy: 'Found on the girders over City Rooftop',
	sprite: {
		run: runFrames(batPersonRun, 6),
		sit: batPersonSit,
		stand: batPersonStand,
		ski: batPersonSki,
		skiTuck: batPersonSkiTuck,
		face: batPersonFace,
		width: WIDTH,
		height: HEIGHT,
	},
}

/**
 * The Viking: old, no helmet, his long white hair down his back under a
 * leather headband, a big white beard, braided at its end, over a blue
 * tunic, fur over his shoulders, and a round shield on his back, red and
 * white in quarters. His far arm and leg are in shadow. Six frames to his
 * run, as the members have, his axe in his near hand, swinging with it.
 * Stood still, he leans on it; on skis, it's his other pole.
 */
export const VIKING: Playable = {
	id: 'bonus:viking',
	name: 'Viking',
	bonus: true,
	unlockedBy: 'Found in the tavern under Gamla Stan',
	sprite: {
		run: runFrames(vikingRun, 6),
		sit: vikingSit,
		stand: vikingStand,
		ski: vikingSki,
		skiTuck: vikingSkiTuck,
		snowboard: vikingSnowboard,
		face: vikingFace,
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
	unlockedBy: 'Finished Halloween Town in a pumpkin',
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
	unlockedBy: 'Finished every course',
	look: DERI_LOOK,
	sprite: lookSprite(DERI_LOOK),
}

export const BONUS_RUNNERS: Playable[] = [
	YETI,
	BAT_PERSON,
	VIKING,
	SKELETON,
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
