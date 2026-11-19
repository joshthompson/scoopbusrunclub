import { TUNES } from './tunes'

/**
 * Every tune in the game, by name, for picking the menus' music in Options:
 * the theme first, then each course's in the order they're raced, a course
 * with versions (Midnattsloppet, Dino Island) one for each. Named so it's
 * plain where each is from, with the place beside it.
 */
export interface NamedTune {
	/** Its id in `TUNES`. */
	id: string
	name: string
	/** Where it plays. */
	from: string
}

export const PLAYLIST: NamedTune[] = [
	{ id: 'menu', name: 'Scoop Bus Run Theme', from: 'The menus' },
	{ id: 'haga', name: 'Haga Highs', from: 'Haga' },
	{ id: 'kristineberg', name: 'Track Tunes', from: 'Kristineberg' },
	{ id: 'gamla-stan', name: 'Old Town Lute', from: 'Gamla Stan' },
	{ id: 'huddinge', name: 'The Forests of Huddinge', from: 'Huddinge' },
	{ id: 'pyramids', name: 'Sands of the Pharaohs', from: 'Pyramids' },
	{ id: 'halloween-town', name: 'Graveyard Creep', from: 'Halloween Town' },
	{ id: 'scoop-line', name: 'Dansband on the Ferry', from: 'Scoop Cruises' },
	{ id: 'caves', name: 'Deep Down in the Caves', from: 'The Caves' },
	{ id: 'great-wall', name: 'Along the Great Wall', from: 'Great Wall' },
	{ id: 'furby-fields', name: 'Furby Bounce', from: 'Furby Fields' },
	{ id: 'machu-picchu', name: 'Pan Pipes of the Andes', from: 'Machu Picchu' },
	{ id: 'sewers', name: 'Sewer Whistle', from: 'The Sewers' },
	{ id: 'city-rooftop', name: 'Rooftop Funk', from: 'City Rooftop' },
	{ id: 'cliff', name: 'Over the Edge', from: 'The Cliff' },
	{ id: 'everest', name: 'Call of the Yeti', from: 'Everest' },
	{ id: 'slopes', name: 'Ski Lodge Singalong', from: 'The Slopes' },
	{ id: 'karolinska', name: 'Ding Dong Ward Round', from: 'The Hospital' },
	{
		id: 'midnattsloppet',
		name: 'Midnattsloppet: Street DJ',
		from: 'Midnattsloppet',
	},
	{
		id: 'midnattsloppet:rock',
		name: 'Midnattsloppet: Dockside Rock',
		from: 'Midnattsloppet',
	},
	{
		id: 'midnattsloppet:choir',
		name: 'Midnattsloppet: Sofiakyrkan Choir',
		from: 'Midnattsloppet',
	},
	{ id: 'dino-island', name: 'Jurassic Jungle', from: 'Dino Island' },
	{ id: 'dino-island:volcano', name: 'Volcano Rumble', from: 'Dino Island' },
	{ id: 'dino-island:sea', name: 'Deep Sea Dinos', from: 'Dino Island' },
]

/** The menus' music, picked in Options: a tune's id, or one at random each time. */
export const RANDOM_TUNE = 'random'

/** A tune's name, or Random's. */
export const tuneName = (id: string) =>
	id === RANDOM_TUNE
		? 'Random'
		: (PLAYLIST.find((t) => t.id === id)?.name ?? 'Scoop Bus Run Theme')

/** One at random, but not `not` (the one just on), if there's another. */
export function randomTune(not?: string) {
	const others = PLAYLIST.filter((t) => t.id !== not)
	return others[Math.floor(Math.random() * others.length)].id
}

// A new tune, or a version, with no name here: said, in development.
if (import.meta.env.DEV)
	for (const id of Object.keys(TUNES))
		if (!PLAYLIST.some((t) => t.id === id))
			console.warn(
				`Tune "${id}" has no name in the playlist (music/playlist.ts)`,
			)
