import { type RunnerName, runners } from '@/data/runners'
import {
	type CharacterSpriteProps,
	createRunnerFrames,
} from '@/utils/createRunnerFrames'
import type { CustomRunner } from './customRunners'
import { type SkiPoses, skiPosesFor } from './skiPoses'

/** Anyone you can run as: a club member, or a custom runner of your own. */
export interface Playable {
	/** `member:<key>` or `custom:<id>`. */
	id: string
	name: string
	/** The club member they are, if they're one: nobody volunteers while they're running. */
	member?: RunnerName
	/** Their custom runner, if they're one. */
	custom?: CustomRunner
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
		/** Their face, as the website's celebrations show it. */
		face?: string
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
			sprite: {
				run: runner.frames.run ?? [],
				sit: runner.frames.sit?.[0],
				// Drawn for them, or made from their look, if they're made from one.
				stand: MEMBER_STANDS[member] ?? runner.frames.stand?.[0],
				ski: MEMBER_SKIS[member] ?? poses?.ski,
				skiTuck: MEMBER_SKI_TUCKS[member] ?? poses?.skiTuck,
				snowboard: MEMBER_SNOWBOARDS[member] ?? poses?.snowboard,
				face: runner.frames.face?.[0],
				width: runner.width,
				height: runner.height,
			},
		}
	})

/** Drawing a custom runner's sprites is canvas work, so each look is only drawn once. */
const drawn = new Map<string, ReturnType<typeof createRunnerFrames>>()
const posed = new Map<string, SkiPoses | undefined>()

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
	return {
		run: frames.frames.run ?? [],
		sit: frames.frames.sit?.[0],
		stand: frames.frames.stand?.[0],
		ski: poses?.ski,
		skiTuck: poses?.skiTuck,
		snowboard: poses?.snowboard,
		face: frames.frames.face?.[0],
		width: frames.width,
		height: frames.height,
	}
}

export function customPlayable(runner: CustomRunner): Playable {
	return {
		id: `custom:${runner.id}`,
		name: runner.name,
		custom: runner,
		look: runner.avatar,
		sprite: lookSprite(runner.avatar),
	}
}
