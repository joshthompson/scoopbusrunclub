import type { PickupHat } from '../../game/hats'
import type { Boost, Obstacle } from '../types'

/**
 * A course's laid-out obstacles and boosts with a hat among them, `height`
 * over the Ground at `x`, wherever `at` finds for it once the rest are laid
 * out: somewhere it takes doing to get to. Nothing else within `clear` of
 * it, so it's not lost among them; 0 leaves what's there (a hurdle to jump
 * for it over).
 */
export function withHat<T extends { obstacles: Obstacle[]; boosts: Boost[] }>(
	layout: T,
	hat: PickupHat,
	at: (layout: T) => { x: number; height: number },
	clear = 160,
): T {
	const { x, height } = at(layout)
	const away = (o: { x: number }) => !clear || Math.abs(o.x - x) > clear
	return {
		...layout,
		obstacles: layout.obstacles.filter(away),
		boosts: [
			...layout.boosts.filter(away),
			{ kind: 'hat', x: Math.round(x), height, hat } as const,
		].sort((a, b) => a.x - b.x),
	}
}
