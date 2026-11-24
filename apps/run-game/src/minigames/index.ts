import { beachVolleyball } from './beachVolleyball'
import { bombHat } from './bombHat'
import { fikaDefence } from './fikaDefence'
import { fruitKebab } from './fruitKebab'
import { hungryGoose } from './hungryGoose'
import { icebergBump } from './icebergBump'
import { jughead } from './jughead'
import { jumpRope } from './jumpRope'
import { lollapascoopza } from './lollapascoopza'
import { memoryDunk } from './memoryDunk'
import { mrClaws } from './mrClaws'
import { paintbrush } from './paintbrush'
import { pogoSticks } from './pogoSticks'
import { potatoRain } from './potatoRain'
import { redLightGreenLight } from './redLightGreenLight'
import { skateJam } from './skateJam'
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
	fikaDefence,
	bombHat,
	lollapascoopza,
	mrClaws,
	skateJam,
	jughead,
]

export const minigameById = (id: string | undefined) =>
	MINIGAMES.find((m) => m.id === id)

/** Whether `minigame` can be played by `players` at once: not too many for it. */
export const playableBy = (minigame: Minigame, players: number) =>
	players <= (minigame.maxPlayers ?? Number.POSITIVE_INFINITY)

export type { Minigame, MinigameId }

/** The fewest and most bots that can play a minigame with you, on your own. */
export const FEWEST_BOTS = 2
export const MOST_BOTS = 7

/**
 * How many bots play a minigame with you, on your own: as many as
 * `wanted`, between the fewest and most, and no more than it's for; and,
 * played in even teams, one more if that's what evens them, and enough to
 * make up the fewest it's played by.
 */
export function botsFor(minigame: Minigame, wanted: number) {
	let bots = Math.min(
		Math.max(FEWEST_BOTS, Math.min(MOST_BOTS, wanted)),
		(minigame.maxPlayers ?? MOST_BOTS + 1) - 1,
	)
	if (minigame.evenTeamsOf !== undefined) {
		bots = Math.max(bots, minigame.evenTeamsOf - 1)
		if ((bots + 1) % 2) bots++
	}
	return bots
}
