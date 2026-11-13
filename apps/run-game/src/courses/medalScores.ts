import type { CourseId } from './types'

/**
 * The points each course's medals take, its score goal: bronze, silver and
 * gold, by course id. Tweak them here. Every course has to be in this
 * table, or it won't compile: one set to `null` gets them worked out from
 * what there is to be had on it (see `medalScores`), till it's given its
 * own.
 */
export interface MedalPoints {
	bronze: number
	silver: number
	gold: number
}

export const MEDAL_SCORES: Record<CourseId, MedalPoints | null> = {
	haga: null, // { bronze: 5000, silver: 7250, gold: 9500 },
	kristineberg: { bronze: 5000, silver: 6750, gold: 8500 },
	'gamla-stan': { bronze: 5000, silver: 7250, gold: 9500 },
	huddinge: { bronze: 5000, silver: 7250, gold: 9250 },
	pyramids: { bronze: 5000, silver: 7250, gold: 9250 },
	'halloween-town': { bronze: 5000, silver: 7250, gold: 9000 },
	'scoop-line': { bronze: 5000, silver: 7500, gold: 9750 },
	caves: { bronze: 5000, silver: 7500, gold: 9750 },
	'great-wall': { bronze: 5000, silver: 7250, gold: 9000 },
	'furby-fields': { bronze: 5000, silver: 7500, gold: 9750 },
	'machu-picchu': { bronze: 5000, silver: 7500, gold: 9750 },
	sewers: { bronze: 5000, silver: 7250, gold: 9500 },
	'city-rooftop': { bronze: 5000, silver: 7250, gold: 9000 },
	cliff: { bronze: 5000, silver: 7750, gold: 10000 },
	everest: { bronze: 5000, silver: 7500, gold: 9750 },
	slopes: { bronze: 5000, silver: 8000, gold: 10750 },
	karolinska: null,
}
