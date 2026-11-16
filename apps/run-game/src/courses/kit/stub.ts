import { svgUrl } from './pixelArt'

/**
 * A placeholder for art not drawn yet: a box `width` by `height` cells, its
 * `label` on it, so a course plays and screenshots before its art's done.
 * Nothing should be left using it.
 */
export function stub(width: number, height: number, label: string) {
	return svgUrl(
		width,
		height,
		`<rect width="${width}" height="${height}" fill="#ff3fd0" fill-opacity="0.55"/><rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" fill="none" stroke="#ffffff" stroke-width="1"/><text x="${width / 2}" y="${height / 2}" font-size="${Math.max(3, Math.min(8, width / Math.max(4, label.length)))}" font-family="monospace" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">${label}</text>`,
	)
}
