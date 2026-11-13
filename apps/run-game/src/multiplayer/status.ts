import { ordinal, pts } from './Medal'
import type { PadView } from './protocol'

/** How a Player's doing, in a few words, for their own screen. */
export function statusText(view: PadView) {
	const of = view.of ? ` of ${view.of}` : ''
	if (view.stage === 'podium')
		return view.place === 1
			? 'You won!'
			: view.place
				? `${ordinal(view.place)}${of}`
				: 'All done!'
	switch (view.status) {
		case 'picking':
			return !view.character
				? 'Pick a runner'
				: view.starter
					? view.stage === 'starting'
						? 'Get ready…'
						: 'You start it'
					: 'Not ready yet'
		case 'waiting':
			return 'In from the next Round'
		case 'ready':
			return view.stage === 'starting' ? 'Get ready…' : 'Ready!'
		case 'racing':
			return view.stage === 'results' ? pts(view.points) : 'Run!'
		case 'scooped':
			return view.place ? `Scooped! ${ordinal(view.place)}${of}` : 'Scooped!'
		case 'fallen':
			return view.place ? `Fell! ${ordinal(view.place)}${of}` : 'Fell!'
		case 'finished': {
			const word = view.gameMode === 'baby' ? 'Finished!' : 'Beat the bus!'
			return view.place ? `${word} ${ordinal(view.place)}${of}` : word
		}
		case 'won':
			return 'You won!'
	}
}
