import { christmas } from './seasons'

/**
 * Whether the site's in Christmas mode: its dates, unless someone's said
 * otherwise. Its dates, and `setSeason()` to switch it by hand, are in
 * `seasons.ts`.
 */
export const isChristmas = christmas.isOn

/**
 * Every present in the Christmas assets, so another one goes under the tree
 * just by dropping `present6.png` next to the others.
 */
export const presentAssets = Object.entries(
	import.meta.glob('../assets/christmas/present[0-9]*.png', {
		eager: true,
		import: 'default',
	}) as Record<string, string>,
)
	.sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
	.map(([, url]) => url)
