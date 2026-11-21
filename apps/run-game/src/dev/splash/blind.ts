import { splashScene } from './scene'
import { BLIND_ORDER } from './variants'

/**
 * The splash listening test, /run/dev/splash-blind: the splash sounds,
 * numbered in `BLIND_ORDER`, with nothing to say which is which until a
 * tester reveals one, and a box for their notes on each. Notes are kept in
 * the tester's browser and copied out to send.
 */

const DRAFT = 'splash-test-draft'
type Notes = { notes: Record<number, string>; revealed: number[] }

function readDraft(): Notes {
	try {
		const saved = JSON.parse(localStorage.getItem(DRAFT) ?? 'null')
		if (saved)
			return {
				notes: saved.notes ?? {},
				revealed: (saved.revealed ?? []).filter(
					(n: unknown) =>
						typeof n === 'number' && n >= 1 && n <= BLIND_ORDER.length,
				),
			}
	} catch {
		// Nothing kept, or no storage here: start empty.
	}
	return { notes: {}, revealed: [] }
}
const state = readDraft()
function writeDraft() {
	try {
		localStorage.setItem(DRAFT, JSON.stringify(state))
	} catch {
		// No storage: the notes last as long as the page.
	}
}

const list = document.getElementById('list') as HTMLElement
const playing = document.getElementById('playing') as HTMLElement
const status = document.getElementById('status') as HTMLElement
const scene = splashScene(document.getElementById('scene') as HTMLCanvasElement)

function play(n: number) {
	scene.play(BLIND_ORDER[n - 1])
	playing.textContent = `Sound ${n}`
}

/** Each sound's reveal button and name: one showing, the other hidden. */
const names: { reveal: HTMLButtonElement; name: HTMLElement }[] = []
const revealAll = document.getElementById('revealAll') as HTMLButtonElement

/** Every name shown if it's been revealed, and the Reveal all button to match. */
function showNames() {
	names.forEach(({ reveal, name }, i) => {
		const shown = state.revealed.includes(i + 1)
		reveal.hidden = shown
		name.hidden = !shown
	})
	revealAll.textContent =
		state.revealed.length === names.length
			? 'Hide all names'
			: 'Reveal all names'
}

revealAll.onclick = () => {
	state.revealed =
		state.revealed.length === names.length ? [] : names.map((_, i) => i + 1)
	writeDraft()
	showNames()
}

BLIND_ORDER.forEach((variant, i) => {
	const n = i + 1
	const card = document.createElement('article')
	card.className = 'card'

	const side = document.createElement('div')
	side.className = 'side'
	const label = document.createElement('span')
	label.className = 'label'
	label.textContent = 'Sound'
	const button = document.createElement('button')
	button.className = 'play'
	button.type = 'button'
	button.textContent = String(n)
	button.setAttribute('aria-label', `Play sound ${n}`)
	button.onclick = () => play(n)
	side.append(label, button)

	const body = document.createElement('div')
	body.className = 'body'
	const notesLabel = document.createElement('label')
	notesLabel.className = 'label'
	notesLabel.htmlFor = `note-${n}`
	notesLabel.textContent = `Your notes on sound ${n}`
	const notes = document.createElement('textarea')
	notes.id = `note-${n}`
	notes.placeholder = 'What does it sound like? Good, bad, too much?'
	notes.value = state.notes[n] ?? ''
	notes.oninput = () => {
		state.notes[n] = notes.value
		writeDraft()
	}
	const reveal = document.createElement('button')
	reveal.className = 'reveal'
	reveal.type = 'button'
	reveal.textContent = 'Reveal its name'
	const name = document.createElement('span')
	name.className = 'revealed'
	name.textContent = variant.name
	reveal.onclick = () => {
		if (!state.revealed.includes(n)) state.revealed.push(n)
		writeDraft()
		showNames()
	}
	names.push({ reveal, name })
	body.append(notesLabel, notes, reveal, name)

	card.append(side, body)
	list.append(card)
})
showNames()

addEventListener('keydown', (e) => {
	if (e.metaKey || e.ctrlKey || e.altKey) return
	if ((e.target as Element | null)?.closest?.('textarea, input')) return
	const n = Number(e.key)
	if (n >= 1 && n <= Math.min(9, BLIND_ORDER.length)) play(n)
})

function setStatus(text: string, kind: 'ok' | 'warn') {
	status.textContent = text
	status.className = `status ${kind}`
}

const copy = document.getElementById('copy') as HTMLButtonElement
copy.onclick = async () => {
	const lines = ['Splash listening test notes', '']
	BLIND_ORDER.forEach((variant, i) => {
		const n = i + 1
		const label = state.revealed.includes(n)
			? `Sound ${n} (${variant.name})`
			: `Sound ${n}`
		lines.push(`${label}: ${state.notes[n]?.trim() || '(no notes)'}`)
	})
	try {
		await navigator.clipboard.writeText(lines.join('\n'))
		setStatus('Copied. Paste your notes into a message to send them.', 'ok')
	} catch {
		setStatus(
			'Couldn’t copy here. Select your notes and copy them by hand.',
			'warn',
		)
	}
}
