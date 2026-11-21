import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

/**
 * Dev pages: markdown docs, rendered, and HTML pages of our own, under
 * /run/dev on the dev server (and on `pnpm dev:phones`, across the network).
 * /run/dev lists them all. A markdown page re-renders as soon as its file's
 * saved, without reloading, over the dev server's HMR socket. An HTML page
 * goes through Vite like the game's index.html, so its scripts can import
 * the game's own code, and it reloads when it's saved.
 *
 * Dev only: `apply: 'serve'` keeps the plugin out of `vite build`, so none of
 * these pages exist in production, and `marked` is a dev dependency.
 *
 * To add one, add it here: it's served at /run/dev/<slug>.
 */
const PAGES = [
	{
		slug: 'checklist',
		title: 'Level checklist',
		description: 'What each level has, and what it still needs.',
		file: 'docs/level-checklist.md',
	},
	{
		slug: 'splash',
		title: 'Splash audition',
		description:
			'Every splash sound tried so far, named, with the splash animation.',
		file: 'src/dev/splash/audition.html',
	},
	{
		slug: 'splash-blind',
		title: 'Splash listening test',
		description:
			'The same sounds, numbered in a random order, with notes for a tester.',
		file: 'src/dev/splash/blind.html',
	},
].map((page) => ({ ...page, file: path.resolve(__dirname, page.file) }))

type Page = (typeof PAGES)[number]

/** /dev, /dev/<slug>, with or without the /run/ base, and `?fragment`. */
const ROUTE = /^\/(?:run\/)?dev(?:\/([\w-]+))?\/?(?:\?(.*))?$/
const UPDATED = 'dev-pages:updated'

async function render(page: Page) {
	const { marked } = await import('marked')
	return marked.parse(fs.readFileSync(page.file, 'utf8'))
}

/** Every page's link back to /run/dev, the list of them all. */
const back = (base: string) => `<nav><a href="${base}dev">← Dev pages</a></nav>`

const escape = (text: string) =>
	text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`)

const index = (base: string) => `
<h1>Dev pages</h1>
<p>Only on the dev server: none of these exist in production.</p>
<ul class="pages">
${PAGES.map(
	(page) => `<li>
	<a href="${base}dev/${page.slug}">${escape(page.title)}</a>
	<span>${escape(page.description)}</span>
	<code>${escape(path.relative(__dirname, page.file))}</code>
</li>`,
).join('\n')}
</ul>`

const STYLE = `
	:root {
		color-scheme: light dark;
		--bg: #fff; --fg: #1d1d1f; --muted: #6e6e73; --link: #0066cc;
		--line: #d8d8dc; --stripe: #f5f5f7; --head: #ececf0; --code: #f0f0f3;
	}
	@media (prefers-color-scheme: dark) {
		:root {
			--bg: #141416; --fg: #ececf0; --muted: #9a9aa2; --link: #4da3ff;
			--line: #34343a; --stripe: #1b1b1f; --head: #232328; --code: #26262c;
		}
	}
	* { box-sizing: border-box; }
	body {
		margin: 0; padding: 16px 16px 64px;
		background: var(--bg); color: var(--fg);
		font: 15px/1.5 system-ui, -apple-system, sans-serif;
	}
	a { color: var(--link); }
	nav, main { max-width: 1600px; margin: 0 auto; }
	nav { margin-bottom: 16px; font-size: 14px; }
	h1 { margin-top: 0; }
	h2 { margin-top: 2em; }
	code { background: var(--code); padding: 0.1em 0.35em; border-radius: 4px; font-size: 0.9em; }
	.pages { list-style: none; padding: 0; display: grid; gap: 12px; }
	.pages li {
		display: grid; gap: 2px; padding: 12px 14px;
		border: 1px solid var(--line); border-radius: 8px;
	}
	.pages a { font-weight: 600; font-size: 17px; }
	.pages span { color: var(--muted); }
	.pages code { justify-self: start; }
	.table { overflow-x: auto; }
	table { border-collapse: collapse; width: 100%; font-size: 14px; }
	th, td { border: 1px solid var(--line); padding: 6px 8px; text-align: left; vertical-align: top; }
	th { background: var(--head); position: sticky; top: 0; }
	td:last-child { white-space: nowrap; }
	tbody tr:nth-child(even) { background: var(--stripe); }
	#status {
		position: fixed; right: 12px; bottom: 12px;
		font-size: 12px; color: var(--muted);
		background: var(--head); padding: 4px 8px; border-radius: 6px;
	}
	.flash { animation: flash 0.8s ease-out; }
	@keyframes flash { from { box-shadow: inset 0 0 0 3px #34c759; } }
`

/** Re-renders the page when its file's saved. */
const live = (page: Page, base: string) => `
<div id="status">Live</div>
<script type="module">
	import { createHotContext } from '${base}@vite/client'
	const main = document.querySelector('main')
	const status = document.getElementById('status')
	const wrapTables = () => {
		for (const table of main.querySelectorAll('table')) {
			if (table.parentElement.classList.contains('table')) continue
			const div = document.createElement('div')
			div.className = 'table'
			table.replaceWith(div)
			div.append(table)
		}
	}
	wrapTables()
	createHotContext('/dev/${page.slug}').on('${UPDATED}', async ({ slug }) => {
		if (slug !== '${page.slug}') return
		const res = await fetch(location.pathname + '?fragment')
		main.innerHTML = await res.text()
		wrapTables()
		main.classList.remove('flash')
		void main.offsetWidth
		main.classList.add('flash')
		status.textContent = 'Updated ' + new Date().toLocaleTimeString()
	})
</script>`

const document = (title: string, body: string, extra = '') => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title>
<style>${STYLE}</style>
</head>
<body>
${body}
${extra}
</body>
</html>`

export const devPages: Plugin = {
	name: 'dev-pages',
	apply: 'serve',
	configureServer(server) {
		for (const page of PAGES) server.watcher.add(page.file)
		server.middlewares.use(async (req, res, next) => {
			const match = req.url?.match(ROUTE)
			if (!match) return next()
			const [, slug, query] = match
			const base = server.config.base
			const send = (html: string) => {
				res.setHeader('Content-Type', 'text/html; charset=utf-8')
				res.setHeader('Cache-Control', 'no-store')
				res.end(html)
			}
			if (!slug)
				return send(document('Dev pages', `<main>${index(base)}</main>`))
			const page = PAGES.find((p) => p.slug === slug)
			if (!page) {
				res.statusCode = 404
				return send(
					document(
						'Dev pages',
						`<main><p>No dev page called <code>${escape(slug)}</code>.</p>${index(base)}</main>`,
					),
				)
			}
			try {
				// An HTML page's a page of its own, with its own scripts, run
				// through Vite like the game's index.html, and the link back
				// put in for it: the first thing in its <main>, or its <body>.
				if (page.file.endsWith('.html')) {
					const html = fs.readFileSync(page.file, 'utf8')
					const at = /<main[^>]*>/.exec(html) ?? /<body[^>]*>/.exec(html)
					const end = at ? at.index + at[0].length : 0
					return send(
						await server.transformIndexHtml(
							`/${path.relative(server.config.root, page.file)}`,
							`${html.slice(0, end)}\n${back(base)}${html.slice(end)}`,
							req.originalUrl,
						),
					)
				}
				const body = await render(page)
				if (query === 'fragment') return send(body)
				send(
					document(
						page.title,
						`${back(base)}\n<main>${body}</main>`,
						live(page, base),
					),
				)
			} catch (error) {
				next(error)
			}
		})
	},
	hotUpdate({ file }) {
		const page = PAGES.find((p) => p.file === path.resolve(file))
		if (!page) return
		if (page.file.endsWith('.html')) {
			this.environment.hot.send({ type: 'full-reload' })
			return []
		}
		this.environment.hot.send({
			type: 'custom',
			event: UPDATED,
			data: { slug: page.slug },
		})
		return []
	},
}
