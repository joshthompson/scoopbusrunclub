import { TEAM_HATS } from '../game/teams'
import type { Racer, World } from '../game/world'
import { collect } from '../saved/collected'

/**
 * Each team's hat, kept as a collectable by whoever played on that team:
 * the teams with a Player on them, rather than only bots. Playing on your
 * own, yours; in a Round, every team someone played on. Not in a preview.
 */
export function collectTeamHats(
	world: World,
	teamOf: (racer: Racer) => number,
	bots: (racer: Racer) => boolean,
) {
	if (world.preview) return
	const played = new Set(
		world.racers.filter((racer) => !bots(racer)).map(teamOf),
	)
	for (const team of played) {
		const kind = TEAM_HATS[team]
		if (kind) collect(`hat:${kind}`)
	}
}

/** Whether `racer` is a bot: playing on your own, everyone but you; or a team's extra. */
export const isBot = (racer: Racer, teamBot: string) =>
	racer.id === teamBot || racer.id.startsWith('bot-')
