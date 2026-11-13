/**
 * A contact sheet of pixel art, blown up so it can be looked at: PNGs, and
 * art drawn in code with `pixelArt`/`paintedArt` (a module's export, the
 * `data:image/svg+xml` URL it made). Over a sky blue, as it's seen in the game.
 *
 * Run from apps/run-game:
 *   npx tsx .claude/skills/pixel-art/sheet.mts out.png 6 \
 *     src/assets/rides/corgi-sit.png src/courses/kit/everestFika.ts#butterTea
 *
 * The second argument is how many times bigger each pixel is drawn. Only
 * `<rect>`s are drawn from SVGs (all that pixel art drawn in code is); any
 * other element is counted and reported, not drawn.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { PNG } from 'pngjs'

interface Picture {
	name: string
	width: number
	height: number
	/** RGBA, a pixel each. */
	data: Uint8Array
}

const [out, scaleArg, ...sources] = process.argv.slice(2)
if (!out || !scaleArg || !sources.length) {
	console.error(
		'Usage: sheet.mts <out.png> <scale> <file.png | module.ts#export>...',
	)
	process.exit(1)
}
const scale = Number(scaleArg)

function colour(fill: string): [number, number, number, number] {
	const hex = fill.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i)
	if (hex) {
		const short = hex[1].length <= 4
		const h = (short ? [...hex[1]].map((c) => c + c).join('') : hex[1]).padEnd(
			8,
			'f',
		)
		return [0, 2, 4, 6].map((i) => Number.parseInt(h.slice(i, i + 2), 16)) as [
			number,
			number,
			number,
			number,
		]
	}
	const rgba = fill.match(/^rgba?\(([^)]+)\)$/)
	if (rgba) {
		const [r, g, b, a = 1] = rgba[1].split(',').map(Number)
		return [r, g, b, Math.round(a * 255)]
	}
	throw new Error(`A fill this can't read: ${fill}`)
}

function fromSvg(name: string, url: string): Picture {
	const svg = decodeURIComponent(url.replace(/^data:image\/svg\+xml,/, ''))
	const width = Number(svg.match(/width="([\d.]+)"/)?.[1])
	const height = Number(svg.match(/height="([\d.]+)"/)?.[1])
	const data = new Uint8Array(width * height * 4)
	const rects = [
		...svg.matchAll(
			/<rect x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)" fill="([^"]+)"\/>/g,
		),
	]
	for (const [, x, y, w, h, fill] of rects) {
		const [r, g, b, a] = colour(fill)
		for (let py = Math.max(0, +y); py < Math.min(height, +y + +h); py++)
			for (let px = Math.max(0, +x); px < Math.min(width, +x + +w); px++) {
				const i = (py * width + px) * 4
				const under = data[i + 3] / 255
				const over = a / 255
				const alpha = over + under * (1 - over)
				for (const [c, v] of [r, g, b].entries())
					data[i + c] = alpha
						? (v * over + data[i + c] * under * (1 - over)) / alpha
						: 0
				data[i + 3] = Math.round(alpha * 255)
			}
	}
	const others = (svg.match(/<(?!rect|svg|\/)[a-z]+/g) ?? []).length
	if (others) console.warn(`${name}: ${others} non-rect elements not drawn`)
	return { name, width, height, data }
}

async function load(source: string): Promise<Picture> {
	if (source.endsWith('.png')) {
		const png = PNG.sync.read(readFileSync(source))
		return {
			name: source,
			width: png.width,
			height: png.height,
			data: png.data,
		}
	}
	const [file, exported = 'default'] = source.split('#')
	const module = await import(path.resolve(file))
	const value = module[exported]
	const url = typeof value === 'string' ? value : (value?.src ?? value?.asset)
	if (typeof url !== 'string' || !url.startsWith('data:image/svg+xml'))
		throw new Error(
			`${source} isn't art drawn in code (a data:image/svg+xml URL, or { src })`,
		)
	return fromSvg(source, url)
}

const pictures = await Promise.all(sources.map(load))
const GAP = 8
const SKY = [200, 222, 236]
const sheetWidth = Math.max(
	...pictures.map((p) => p.width * scale),
	Math.min(
		1800,
		pictures.reduce((sum, p) => sum + p.width * scale + GAP, -GAP),
	),
)
let x = 0
let y = 0
let rowHeight = 0
const placed = pictures.map((p) => {
	const w = p.width * scale
	if (x && x + w > sheetWidth) {
		x = 0
		y += rowHeight + GAP
		rowHeight = 0
	}
	const at = { p, x, y }
	x += w + GAP
	rowHeight = Math.max(rowHeight, p.height * scale)
	return at
})
const sheet = new PNG({ width: sheetWidth, height: y + rowHeight })
for (let i = 0; i < sheet.width * sheet.height; i++)
	sheet.data.set([...SKY, 255], i * 4)
for (const { p, x: left, y: top } of placed) {
	for (let py = 0; py < p.height * scale; py++)
		for (let px = 0; px < p.width * scale; px++) {
			if (left + px >= sheet.width) continue
			const s = (Math.floor(py / scale) * p.width + Math.floor(px / scale)) * 4
			const a = p.data[s + 3] / 255
			if (!a) continue
			const d = ((top + py) * sheet.width + left + px) * 4
			for (let c = 0; c < 3; c++)
				sheet.data[d + c] = Math.round(
					p.data[s + c] * a + sheet.data[d + c] * (1 - a),
				)
		}
	console.log(`${p.name}: ${p.width}x${p.height}, at ${left},${top}`)
}
writeFileSync(out, PNG.sync.write(sheet))
console.log(`Wrote ${out}`)
