import type { Hat, HatKind } from './hats'

/**
 * Teams, for the minigames played in them (Beach Volleyball, Hungry Hungry
 * Goose): each one's colour, and the hat everyone on it wears so it's plain
 * at a glance who's on which. The red team in red top hats, the blue team
 * in tall blue bowlers.
 *
 * A game with more teams than there are here needs a new colour and a new
 * hat for each one: its hat drawn (see `teamHatArt` in `draw/art/hats`), a
 * shape of its own, not just another colour, and named as a collectable.
 */
export const TEAM_COLOURS = ['#d23a3a', '#3a62d2'] as const

/** Each team's hat, in the order of their colours. */
export const TEAM_HATS = [
	'redTeamHat',
	'blueTeamHat',
] as const satisfies readonly HatKind[]

/** The hat team `team` wears. */
export const teamHat = (team: number): Hat => ({
	kind: TEAM_HATS[team] ?? TEAM_HATS[0],
})
