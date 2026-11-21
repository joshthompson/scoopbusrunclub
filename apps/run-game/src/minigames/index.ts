import { beachVolleyball } from './beachVolleyball'
import { fruitKebab } from './fruitKebab'
import { hungryGoose } from './hungryGoose'
import { icebergBump } from './icebergBump'
import { jumpRope } from './jumpRope'
import { memoryDunk } from './memoryDunk'
import { paintbrush } from './paintbrush'
import { pogoSticks } from './pogoSticks'
import { potatoRain } from './potatoRain'
import { redLightGreenLight } from './redLightGreenLight'
import type { Minigame, MinigameId } from './types'

/** Every minigame there is, in the order they're shown. */
export const MINIGAMES: Minigame[] = [
	fruitKebab,
	potatoRain,
	jumpRope,
	pogoSticks,
	icebergBump,
	beachVolleyball,
	redLightGreenLight,
	memoryDunk,
	paintbrush,
	hungryGoose,
]

export const minigameById = (id: string | undefined) =>
	MINIGAMES.find((m) => m.id === id)

/** Whether `minigame` can be played by `players` at once: not too many for it. */
export const playableBy = (minigame: Minigame, players: number) =>
	players <= (minigame.maxPlayers ?? Number.POSITIVE_INFINITY)

export type { Minigame, MinigameId }

/** How many bots play a minigame with you, on your own: three, or as many as it's for. */
export const botsFor = (minigame: Minigame) =>
	Math.min(3, (minigame.maxPlayers ?? 8) - 1)
