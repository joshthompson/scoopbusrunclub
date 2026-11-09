import { type RunnerName, runners } from '@/data/runners'
import {
	type CharacterSpriteProps,
	createRunnerFrames,
} from '@/utils/createRunnerFrames'
import type { CustomRunner } from './customRunners'

/** Anyone you can run as: a club member, or a custom runner of your own. */
export interface Playable {
	/** `member:<key>` or `custom:<id>`. */
	id: string
	name: string
	/** The club member they are, if they're one: nobody volunteers while they're running. */
	member?: RunnerName
	/** Their custom runner, if they're one. */
	custom?: CustomRunner
	sprite: {
		/** Their run strip's frames, as the engine takes them. */
		run: string[]
		/** Their sit pose, which is how they duck. */
		sit?: string
		/** One frame's size, in the sprite's own pixels. */
		width: number
		height: number
	}
}

/** Members who can play: everyone with a run and a duck (their sit sprite). */
export const MEMBERS: Playable[] = (Object.keys(runners) as RunnerName[])
	.filter((member) => {
		const { frames } = runners[member][0]()
		return frames.run?.length && frames.sit?.length
	})
	.map((member) => {
		const runner = runners[member][0]()
		return {
			id: `member:${member}`,
			name: runner.name,
			member,
			sprite: {
				run: runner.frames.run ?? [],
				sit: runner.frames.sit?.[0],
				width: runner.width,
				height: runner.height,
			},
		}
	})

/** Drawing a custom runner's sprites is canvas work, so each look is only drawn once. */
const drawn = new Map<string, ReturnType<typeof createRunnerFrames>>()

/** A look's sprites, the way a `Playable` has them. */
export function lookSprite(avatar: CharacterSpriteProps): Playable['sprite'] {
	const look = JSON.stringify(avatar)
	let frames = drawn.get(look)
	if (!frames) {
		frames = createRunnerFrames(avatar)
		drawn.set(look, frames)
	}
	return {
		run: frames.frames.run ?? [],
		sit: frames.frames.sit?.[0],
		width: frames.width,
		height: frames.height,
	}
}

export function customPlayable(runner: CustomRunner): Playable {
	return {
		id: `custom:${runner.id}`,
		name: runner.name,
		custom: runner,
		sprite: lookSprite(runner.avatar),
	}
}
