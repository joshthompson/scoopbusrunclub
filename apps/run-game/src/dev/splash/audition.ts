import { splashScene } from './scene'
import { GROUPS, VARIANTS, type Variant } from './variants'

/** The splash audition, /run/dev/splash: every splash sound, named, to compare by ear. */

const list = document.getElementById('list') as HTMLElement
const other = document.getElementById('other') as HTMLInputElement
const playing = document.getElementById('playing') as HTMLElement
const scene = splashScene(document.getElementById('scene') as HTMLCanvasElement)

function play(variant: Variant) {
	scene.play(variant, variant.volume * (other.checked ? 0.5 : 1))
	playing.textContent = variant.name
}

const keys = new Map<string, Variant>()
let n = 0
for (const [group, title] of Object.entries(GROUPS)) {
	const heading = document.createElement('h2')
	heading.textContent = title
	list.append(heading)
	for (const variant of VARIANTS.filter((v) => v.group === group)) {
		n++
		const key = n <= 9 ? String(n) : n === 10 ? '0' : undefined
		if (key) keys.set(key, variant)
		const card = document.createElement('article')
		card.className = 'card'
		const button = document.createElement('button')
		button.className = 'play'
		button.type = 'button'
		button.textContent = '▶'
		button.title = `Play ${variant.name}`
		button.onclick = () => play(variant)
		const body = document.createElement('div')
		body.className = 'body'
		const name = document.createElement('div')
		name.className = 'name'
		if (key) {
			const kbd = document.createElement('kbd')
			kbd.textContent = key
			name.append(kbd)
		}
		name.append(variant.name)
		if (group !== 'earlier' && group !== 'alternative') {
			const tag = document.createElement('span')
			tag.className = 'tag'
			tag.textContent = group === 'now' ? 'current' : 'new'
			name.append(tag)
		}
		const about = document.createElement('div')
		about.className = 'about'
		about.textContent = variant.about
		const details = document.createElement('details')
		const summary = document.createElement('summary')
		summary.textContent = `Notes (volume ${variant.volume})`
		const pre = document.createElement('pre')
		pre.textContent = variant.notes
			.map((note) => JSON.stringify(note).replaceAll('"', "'"))
			.join(',\n')
		details.append(summary, pre)
		body.append(name, about, details)
		card.append(button, body)
		list.append(card)
	}
}

addEventListener('keydown', (e) => {
	if (e.metaKey || e.ctrlKey || e.altKey) return
	const variant = keys.get(e.key)
	if (variant) play(variant)
})
