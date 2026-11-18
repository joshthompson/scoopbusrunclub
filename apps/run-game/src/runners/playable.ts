import { type RunnerName, runners } from '@/data/runners'
import {
	type CharacterSpriteProps,
	createRunnerFrames,
} from '@/utils/createRunnerFrames'
import type { OwnHat } from '../draw/art/hats'
import { type CustomRunner, runnerName } from './customRunners'
import { danceForKey } from './dance'
import { type DanceSprite, lookDance, stripDance } from './dancing'
import { type SkiPoses, skiPosesFor } from './skiPoses'

/** Anyone you can run as: a club member, or a custom runner of your own. */
export interface Playable {
	/** `member:<key>`, `custom:<id>` or `bonus:<key>`. */
	id: string
	name: string
	/** The club member they are, if they're one: nobody volunteers while they're running. */
	member?: RunnerName
	/** Their custom runner, if they're one. */
	custom?: CustomRunner
	/** A bonus runner, found on a course and unlocked (see `BONUS_RUNNERS`). */
	bonus?: boolean
	/**
	 * Where they're found, if they're to unlock: "Found in Gamla Stan". On
	 * one line, and only roughly, as it's a hint while they're still a "?"
	 * on the select screen, then said when they're unlocked and under them
	 * from then on.
	 */
	unlock?: string
	/**
	 * A line about them, under their name once they're unlocked, on the
	 * select screen and when they're unlocked: "The best dog".
	 */
	tagline?: string
	/** The look they're made from, if they're made from one: a custom runner's, or a guest's. */
	look?: CharacterSpriteProps
	sprite: {
		/** Their run strip's frames, as the engine takes them. */
		run: string[]
		/** Their sit pose, which is how they duck. */
		sit?: string
		/** Stood still: before the start, and whenever they've stopped. */
		stand?: string
		/**
		 * Stood on skis: knees bent, leant into it, their hands forward on
		 * their poles, the poles back behind their heels. Their stand pose,
		 * with no poles, if they've not one.
		 */
		ski?: string
		/** Stood on a snowboard, knees bent, arms out for balance: their stand pose, if they've not one. */
		snowboard?: string
		/**
		 * Curled up on skis in the air, in a forward roll or a grab, poles
		 * under their arms: their sit pose, if they've not one.
		 */
		skiTuck?: string
		/**
		 * Swimming, lying along in the water, head first, face down: two
		 * frames, a stroke and a kick, each `width` by `height` of their own
		 * pixels, facing left as their run does. Their run, turned over, if
		 * they've none (see `scripts/make-swims.ts`).
		 */
		swim?: SwimSprite
		/**
		 * Diving in: stood tall, arms straight up over their head, hands
		 * together, facing left, turned over by the game, head first and on
		 * down (see `scripts/make-swims.ts`). Their swim, turned, if they've none.
		 */
		dive?: string
		/** Their face, as the website's celebrations show it. */
		face?: string
		/**
		 * Their dance: over the line, once they've stopped, and stood about
		 * on the Podium (see `runners/dance.ts`).
		 */
		dance?: DanceSprite
		/**
		 * How far over they're turned, lying along under a glider, in degrees:
		 * head first, as everyone is, if not said. Link, on all fours, hangs
		 * under it as he is.
		 */
		glideLean?: number
		/**
		 * Where their neck is, for a medal to hang round on the Podium: in
		 * their first run frame, in their own pixels, `x` across its middle
		 * and `y` its row, the last above their collar. In any other frame,
		 * it's as far from the top of their head as it is in that one. Hung
		 * a little way under the top of their head, if not said.
		 */
		neck?: Neck
		/**
		 * A hat of their own, part of how they look: on their head whenever
		 * they've no other on (see `OwnHat`). The Spirit of Jazz's top hat,
		 * on fire.
		 */
		ownHat?: OwnHat
		/** One frame's size, in the sprite's own pixels. */
		width: number
		height: number
	}
}

/**
 * Members' stand poses, `assets/stand/<member>.png`: drawn from their run
 * strips, to touch up by hand.
 */
const MEMBER_STANDS = Object.fromEntries(
	Object.entries(
		import.meta.glob<string>('../assets/stand/*.png', {
			eager: true,
			import: 'default',
		}),
	).map(([path, url]) => [path.replace(/^.*\/|\.png$/g, ''), url]),
) as Partial<Record<RunnerName, string>>

/** Pictures by member, from `assets/<folder>/<member>.png`. */
const byMember = (pictures: Record<string, string>) =>
	Object.fromEntries(
		Object.entries(pictures).map(([path, url]) => [
			path.replace(/^.*\/|\.png$/g, ''),
			url,
		]),
	) as Partial<Record<RunnerName, string>>

/**
 * Members' ski poses, made from their stand poses, on the club's sprite
 * template, to touch up by hand: stood on skis, poles in hand,
 * `assets/ski/<member>.png`; curled up on skis, poles under their arms,
 * `assets/ski-tuck/<member>.png`; and stood on a snowboard, arms out,
 * `assets/board/<member>.png`.
 * Each faces left, as their run strip does. A new one, or a new member's,
 * is a picture put there by that name.
 */
const MEMBER_SKIS = byMember(
	import.meta.glob<string>('../assets/ski/*.png', {
		eager: true,
		import: 'default',
	}),
)
const MEMBER_SNOWBOARDS = byMember(
	import.meta.glob<string>('../assets/board/*.png', {
		eager: true,
		import: 'default',
	}),
)
const MEMBER_SKI_TUCKS = byMember(
	import.meta.glob<string>('../assets/ski-tuck/*.png', {
		eager: true,
		import: 'default',
	}),
)

/**
 * Members' dances, made from their stand poses by `scripts/make-dances.ts`,
 * to touch up by hand: `assets/dance/<member>.png`, a strip of frames, each
 * as wide as their stand pose and a little taller. Which dance is theirs is
 * `RUNNER_DANCES`'s say: a new one, or a new member's, is made with the
 * script.
 */
const MEMBER_DANCES = byMember(
	import.meta.glob<string>('../assets/dance/*.png', {
		eager: true,
		import: 'default',
	}),
)

/** Someone's swim frames: see `Playable['sprite']['swim']`. */
export interface SwimSprite {
	frames: [string, string]
	width: number
	height: number
}

/**
 * Swim frames, by whose they are, from pictures `<who>-1.png` and
 * `<who>-2.png` (or `swim-1.png` and `swim-2.png` in a folder of theirs):
 * each picture's own size, read once it's loaded.
 */
export function swimsFrom(
	pictures: Record<string, string>,
	whose: (path: string) => string,
	size: (who: string) => { width: number; height: number },
) {
	const swims: Record<string, SwimSprite> = {}
	for (const [path, url] of Object.entries(pictures)) {
		const who = whose(path)
		const n = /-(\d)\.png$/.exec(path)?.[1] === '2' ? 1 : 0
		swims[who] ??= { frames: [url, url], ...size(who) }
		swims[who].frames[n] = url
	}
	return swims
}

/**
 * Members' swim poses, made from their run strips by `scripts/make-swims.ts`,
 * to touch up by hand: `assets/swim/<member>-1.png` and `-2.png`, their run
 * turned over to lie along, so as tall as they're wide, and as wide as
 * they're tall. Link's isn't turned: he's on all fours already.
 */
const MEMBER_SWIMS = swimsFrom(
	import.meta.glob<string>('../assets/swim/*.png', {
		eager: true,
		import: 'default',
	}),
	(path) => path.replace(/^.*\/|-\d\.png$/g, ''),
	(who) => {
		const runner = runners[who as RunnerName]?.[0]()
		const width = runner?.width ?? 23
		const height = runner?.height ?? 29
		return who === 'link' ? { width, height } : { width: height, height: width }
	},
)

/** Members' dive poses, made from their stand poses by `scripts/make-swims.ts`: `assets/dive/<member>.png`. */
const MEMBER_DIVES = byMember(
	import.meta.glob<string>('../assets/dive/*.png', {
		eager: true,
		import: 'default',
	}),
)

/** Where a runner's neck is, in their first run frame (see `Playable['sprite']['neck']`). */
export interface Neck {
	x: number
	y: number
}

/**
 * Where each member's neck is, in their first run frame (see `neck`):
 * checked by eye, each of them. Most of the club's are at row 7; with a
 * collar a row higher, or a row shorter, at 6; Lyra's, shorter, further
 * down; and Link's, a corgi's, under his chin.
 */
const MEMBER_NECKS: Partial<Record<RunnerName, Neck>> = {
	josh: { x: 10.5, y: 7 },
	keith: { x: 10, y: 7 },
	claire: { x: 10, y: 7 },
	lyra: { x: 10, y: 15 },
	adam: { x: 10, y: 7 },
	anna: { x: 10, y: 7 },
	eline: { x: 11, y: 6 },
	rick: { x: 11, y: 7 },
	sophie: { x: 11, y: 6 },
	august: { x: 34.5, y: 7 },
	alisa: { x: 11, y: 6 },
	link: { x: 5, y: 23 },
	otherJosh: { x: 10, y: 7 },
	mikael: { x: 11, y: 7 },
	mia: { x: 11, y: 6 },
	david: { x: 11, y: 6 },
}

/** Members turned some other way on a glider, lying under it (see `glideLean`). */
const MEMBER_GLIDE_LEANS: Partial<Record<RunnerName, number>> = {
	// A dog: already lying along, on all fours.
	link: 0,
}

/**
 * Members locked at first, as bonus runners are, until something unlocks
 * them: what does, said when it does. Still out on the courses with the
 * pack, locked or not; just not yours to run as yet.
 */
const MEMBER_UNLOCKS: Partial<
	Record<RunnerName, Pick<Playable, 'unlock' | 'tagline'>>
> = {
	// A dog: yours once you've ridden one.
	link: {
		unlock: 'Found at Kristineberg',
		tagline: 'The best dog',
	},
}

/** Link's runner id: unlocked by riding a corgi (see `MEMBER_UNLOCKS`). */
export const LINK_ID = 'member:link'

/** Members who can play: everyone with a run and a duck (their sit sprite). */
export const MEMBERS: Playable[] = (Object.keys(runners) as RunnerName[])
	.filter((member) => {
		const { frames } = runners[member][0]()
		return frames.run?.length && frames.sit?.length
	})
	.map((member) => {
		const runner = runners[member][0]()
		// Made from a look, rather than drawn by hand: ski poses made from it,
		// as anyone's from a look are, unless they've their own.
		const poses = runner.look ? skiPosesFor(runner.look) : undefined
		return {
			id: `member:${member}`,
			name: runner.name,
			member,
			...MEMBER_UNLOCKS[member],
			sprite: {
				run: runner.frames.run ?? [],
				sit: runner.frames.sit?.[0],
				// Drawn for them, or made from their look, if they're made from one.
				stand: MEMBER_STANDS[member] ?? runner.frames.stand?.[0],
				ski: MEMBER_SKIS[member] ?? poses?.ski,
				skiTuck: MEMBER_SKI_TUCKS[member] ?? poses?.skiTuck,
				snowboard: MEMBER_SNOWBOARDS[member] ?? poses?.snowboard,
				swim: MEMBER_SWIMS[member],
				dive: MEMBER_DIVES[member],
				face: runner.frames.face?.[0],
				// Made for them, or from their look, if they're made from one.
				dance: MEMBER_DANCES[member]
					? stripDance(
							MEMBER_DANCES[member],
							danceForKey(member),
							runner.width,
							runner.height,
						)
					: runner.look && lookDance(runner.look, member),
				glideLean: MEMBER_GLIDE_LEANS[member],
				neck: MEMBER_NECKS[member],
				width: runner.width,
				height: runner.height,
			},
		}
	})

/** The club, by name: every member but those to unlock, everyone's to run as. */
export const CLUB = MEMBERS.filter((m) => !m.unlock).sort((a, b) =>
	a.name.localeCompare(b.name),
)

/** The members to unlock (see `MEMBER_UNLOCKS`), with the bonus runners. */
export const LOCKED_MEMBERS = MEMBERS.filter((m) => m.unlock)

/** Drawing a custom runner's sprites is canvas work, so each look is only drawn once. */
const drawn = new Map<string, ReturnType<typeof createRunnerFrames>>()
const posed = new Map<string, SkiPoses | undefined>()
const danced = new Map<string, DanceSprite | undefined>()

/** A look's sprites, the way a `Playable` has them. */
export function lookSprite(avatar: CharacterSpriteProps): Playable['sprite'] {
	const look = JSON.stringify(avatar)
	let frames = drawn.get(look)
	if (!frames) {
		frames = createRunnerFrames(avatar)
		drawn.set(look, frames)
	}
	// Ski poses, made from their stand pose, as the members' are: once each.
	if (!posed.has(look)) posed.set(look, skiPosesFor(avatar))
	const poses = posed.get(look)
	// A dance, made from it the same way: which, picked by the look.
	if (!danced.has(look)) danced.set(look, lookDance(avatar, look))
	return {
		run: frames.frames.run ?? [],
		sit: frames.frames.sit?.[0],
		stand: frames.frames.stand?.[0],
		ski: poses?.ski,
		skiTuck: poses?.skiTuck,
		snowboard: poses?.snowboard,
		face: frames.frames.face?.[0],
		dance: danced.get(look),
		width: frames.width,
		height: frames.height,
	}
}

export function customPlayable(runner: CustomRunner): Playable {
	return {
		id: `custom:${runner.id}`,
		// Cut down, as one from a phone in a Room may have been named before.
		name: runnerName(runner.name),
		custom: runner,
		look: runner.avatar,
		sprite: lookSprite(runner.avatar),
	}
}
