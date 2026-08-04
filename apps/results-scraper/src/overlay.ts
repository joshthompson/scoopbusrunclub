/**
 * The floating progress panel, injected into every page being scraped.
 *
 * You'll be looking at the scrape tab when a bot check appears, so progress and
 * a way out have to be there, not only back on the admin page.
 *
 * Rendered into a shadow root so parkrun's stylesheets can't reach it and ours
 * can't leak out.
 */
import type { ExtensionMessage, RunState } from '@shared/scraper-protocol'

const HOST_ID = 'scoopbus-results-scraper-overlay'

let root: ShadowRoot | null = null

function ensureRoot(): ShadowRoot {
	if (root) return root

	const host = document.createElement('div')
	host.id = HOST_ID
	host.style.cssText =
		'position:fixed;top:16px;right:16px;z-index:2147483647;width:320px;'
	document.documentElement.appendChild(host)

	root = host.attachShadow({ mode: 'open' })
	root.innerHTML = `
		<style>
			:host { all: initial; }
			.panel {
				font: 13px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
				background: #2b2118;
				color: #f4ece1;
				border: 2px solid #8a6f52;
				border-radius: 8px;
				box-shadow: 0 8px 28px rgba(0,0,0,.45);
				overflow: hidden;
			}
			.head {
				display: flex; align-items: center; gap: 8px;
				padding: 9px 12px;
				background: #3b2c20;
				font-weight: 700; font-size: 12px;
				text-transform: uppercase; letter-spacing: .06em;
			}
			.head .dot {
				width: 8px; height: 8px; border-radius: 50%;
				background: #8fbf6a; flex: 0 0 auto;
			}
			.head .dot.blocked { background: #e2b23c; }
			.head .dot.error { background: #d9534f; }
			.head .dot.done { background: #6aa9bf; }
			.body { padding: 10px 12px 12px; }
			.count { font-size: 12px; opacity: .75; margin-bottom: 8px; }
			.bar {
				height: 6px; border-radius: 3px; background: rgba(255,255,255,.14);
				overflow: hidden; margin-bottom: 10px;
			}
			.bar > i { display: block; height: 100%; background: #8fbf6a; transition: width .25s; }
			.current { font-weight: 700; margin-bottom: 2px; }
			.detail { font-size: 12px; opacity: .8; }
			.detail.blocked { color: #f0c860; }
			.notice {
				margin-top: 10px; padding: 8px 10px;
				background: rgba(226,178,60,.14);
				border: 1px solid rgba(226,178,60,.5);
				border-radius: 5px; font-size: 12px;
			}
			.actions { margin-top: 12px; display: flex; gap: 8px; }
			button {
				font: inherit; font-size: 12px; font-weight: 700;
				padding: 5px 12px; border-radius: 5px; cursor: pointer;
				background: rgba(255,255,255,.1); color: #f4ece1;
				border: 1px solid rgba(255,255,255,.28);
			}
			button:hover { background: rgba(255,255,255,.18); }
			.hidden { display: none; }
		</style>
		<div class="panel">
			<div class="head"><span class="dot"></span><span class="title">Scraping parkrun</span></div>
			<div class="body">
				<div class="count"></div>
				<div class="bar"><i style="width:0%"></i></div>
				<div class="current"></div>
				<div class="detail"></div>
				<div class="notice hidden"></div>
				<div class="actions">
					<button class="retry hidden">Retry</button>
					<button class="skip hidden">Skip</button>
					<button class="cancel">Cancel</button>
				</div>
			</div>
		</div>
	`

	for (const action of ['cancel', 'retry', 'skip'] as const) {
		root.querySelector(`.${action}`)?.addEventListener('click', () => {
			// Always handle the rejection: an unanswered sendMessage otherwise shows
			// up as "Unchecked runtime.lastError" in the console.
			void chrome.runtime.sendMessage({ type: action }).catch(() => undefined)
		})
	}

	return root
}

function render(state: RunState): void {
	// Nothing to show unless a run is live; don't litter pages otherwise.
	if (state.status === 'idle' || state.items.length === 0) {
		document.getElementById(HOST_ID)?.remove()
		root = null
		return
	}

	const shadow = ensureRoot()
	const done = state.items.filter(
		(i) =>
			i.status === 'captured' ||
			i.status === 'failed' ||
			i.status === 'skipped',
	).length
	const current = state.items.find((i) => i.key === state.currentKey)
	const blocked = current?.status === 'blocked'

	const dot = shadow.querySelector('.dot') as HTMLElement
	dot.className = `dot${
		state.status === 'error'
			? ' error'
			: state.status === 'done'
				? ' done'
				: blocked
					? ' blocked'
					: ''
	}`

	setText(shadow, '.title', titleFor(state, blocked))
	setText(shadow, '.count', `${done} of ${state.items.length} pages`)
	setText(shadow, '.current', current?.label ?? '')
	const detail = shadow.querySelector('.detail') as HTMLElement
	detail.textContent = current?.detail ?? ''
	detail.className = `detail${blocked ? ' blocked' : ''}`

	const bar = shadow.querySelector('.bar > i') as HTMLElement
	bar.style.width = `${Math.round((done / state.items.length) * 100)}%`

	const notice = shadow.querySelector('.notice') as HTMLElement
	if (blocked) {
		notice.textContent = current?.awaitUser
			? 'Solve the check on this page and the scrape carries on by itself. Nothing will reload while you work — take as long as you need.'
			: 'Waiting on parkrun. Retrying automatically.'
		notice.classList.remove('hidden')
	} else if (state.message && state.status !== 'running') {
		notice.textContent = state.message
		notice.classList.remove('hidden')
	} else {
		notice.classList.add('hidden')
	}

	const running = state.status === 'running'
	toggle(shadow, '.cancel', !running)
	// Only offered when stuck. Retry is hidden mid-captcha — reloading would throw
	// away whatever the user has already clicked through.
	toggle(shadow, '.retry', !blocked || !!current?.awaitUser)
	toggle(shadow, '.skip', !blocked)
}

function titleFor(state: RunState, blocked: boolean): string {
	if (state.status === 'done') return 'Scrape complete'
	if (state.status === 'cancelled') return 'Scrape cancelled'
	if (state.status === 'error') return 'Scrape failed'
	return blocked ? 'Waiting for you' : 'Scraping parkrun'
}

function toggle(shadow: ShadowRoot, selector: string, hidden: boolean): void {
	shadow.querySelector(selector)?.classList.toggle('hidden', hidden)
}

function setText(shadow: ShadowRoot, selector: string, text: string): void {
	const node = shadow.querySelector(selector)
	if (node) node.textContent = text
}

// --- Wiring ---

chrome.runtime.onMessage.addListener((message) => {
	const typed = message as ExtensionMessage
	if (typed.type === 'state' || typed.type === 'finished') render(typed.state)
	return undefined
})

// A fresh navigation means a fresh content script, so ask for current state.
void (async () => {
	try {
		const reply = await chrome.runtime.sendMessage<
			{ type: string },
			ExtensionMessage
		>({ type: 'state?' })
		if (reply?.type === 'state') render(reply.state)
	} catch {
		// Extension reloading — nothing to draw.
	}
})()
