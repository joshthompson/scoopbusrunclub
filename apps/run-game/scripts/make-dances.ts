/**
 * Makes the members' and the bonus runners' dances from their stand poses
 * (see `src/runners/dance.ts`): `src/assets/dance/<member>.png` and
 * `src/assets/runners/<who>/dance.png`, each a strip of frames, to touch up
 * by hand. One already there is left alone, touched up or not, unless
 * `--force` is given.
 *
 * Usage: pnpm --filter @scoopbus/run-game make-dances [--force] [who…]
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { PNG } from 'pngjs'
import { danceForKey, danceStrip } from '../src/runners/dance'

const assets = path.resolve(import.meta.dirname, '../src/assets')
const args = process.argv.slice(2)
const force = args.includes('--force')
const only = args.filter((a) => !a.startsWith('--'))

/** Who to make one for: their stand pose, and where their dance goes. */
const everyone = [
	...readdirSync(path.join(assets, 'stand'))
		.filter((file) => file.endsWith('.png'))
		.map((file) => {
			const who = file.replace(/\.png$/, '')
			return {
				who,
				stand: path.join(assets, 'stand', file),
				dance: path.join(assets, 'dance', file),
			}
		}),
	...readdirSync(path.join(assets, 'runners'))
		.filter((who) => existsSync(path.join(assets, 'runners', who, 'stand.png')))
		.map((who) => ({
			who,
			stand: path.join(assets, 'runners', who, 'stand.png'),
			dance: path.join(assets, 'runners', who, 'dance.png'),
		})),
]

for (const { who, stand, dance } of everyone) {
	if (only.length && !only.includes(who)) continue
	if (existsSync(dance) && !force) {
		console.log(`${who}: already has a dance, left as it is`)
		continue
	}
	const picture = PNG.sync.read(readFileSync(stand))
	const name = danceForKey(who)
	const strip = danceStrip(picture, name)
	const png = new PNG({ width: strip.width, height: strip.height })
	png.data = Buffer.from(strip.data)
	writeFileSync(dance, PNG.sync.write(png))
	console.log(`${who}: ${name}, ${path.relative(assets, dance)}`)
}
