/**
 * A minigame, played headlessly in the real game's code: screenshots of it
 * under way, or whole games played out by bots, their results reported.
 *
 * Run from apps/run-game:
 *   npx tsx .claude/skills/minigame/play.mts shot <minigame-id> <scratchpad> [--players n] [--at ticks...] [--as name]
 *   npx tsx .claude/skills/minigame/play.mts sim <minigame-id> <scratchpad> [--players n...] [--games n] [--bot file.js]
 *
 * `shot` plays it `--at` so many ticks after "Go!" (default 300) with a
 * restless bot each, then renders it live a moment and screenshots it, to
 * `<scratchpad>/minigames/<id>/<name>/t<ticks>.png`.
 *
 * `sim` plays `--games` whole games (default 3) for each count of
 * `--players` (default 1 3 6), to the end, and prints each: how long it
 * went, and everyone's place and note. The bot's the restless one, or
 * `--bot`: a file whose body is a function body given `world`, `racer`,
 * `game` (the minigame's module, for its drawing state) and returning
 * controls, `{ left, right, up, down }`.
 *
 * It starts its own Vite dev server unless `PORT` names one already
 * running, and a muted headless Chrome (`CHROME` for another binary) with a
 * throwaway profile in the scratchpad; both are gone when it ends, however
 * it ends. Its own server's always fresh: one left running through edits
 * can serve a module twice over, and a second copy's state is empty.
 */
import { type ChildProcess, spawn } from 'node:child_process'
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const flag = (name: string, fallback: string[]) => {
	const at = args.indexOf(`--${name}`)
	if (at < 0) return fallback
	const values: string[] = []
	for (let i = at + 1; i < args.length && !args[i].startsWith('--'); i++)
		values.push(args[i])
	args.splice(at, values.length + 1)
	return values
}
const name = flag('as', ['shot'])[0]
const players = flag('players', []).map(Number)
const at = flag('at', ['300']).map(Number)
const games = Number(flag('games', ['3'])[0])
const botFile = flag('bot', [])[0]
const [mode, id, scratch] = args
if (!['shot', 'sim'].includes(mode) || !id || !scratch) {
	console.error(
		'Usage: play.mts shot|sim <minigame-id> <scratchpad> [--players n...] [--at ticks...] [--games n] [--bot file.js] [--as name]',
	)
	process.exit(1)
}
const app = path.resolve(
	path.dirname(new URL(import.meta.url).pathname),
	'../../..',
)
const out = path.join(path.resolve(scratch), 'minigames', id, name)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const VIEW = { width: 960, height: 540 }
const bot = botFile ? readFileSync(botFile, 'utf8') : ''

/** Set up in the page: the modules, a world of `n` bots, `ROUND` it through. */
const prelude = (n: number) => `
	const M = await import('/run/src/minigames/index.ts')
	const W = await import('/run/src/game/world.ts')
	const ST = await import('/run/src/game/step.ts')
	const P = await import('/run/src/runners/playable.ts')
	const minigame = M.MINIGAMES.find((m) => m.id === ${JSON.stringify(id)})
	if (!minigame) return { error: 'No minigame ' + ${JSON.stringify(id)} + '. Ids: ' + M.MINIGAMES.map((m) => m.id).join(', ') }
	const game = await import('/run/src/minigames/' + ${JSON.stringify(
		id.replace(/-(\w)/g, (_, c: string) => c.toUpperCase()),
	)} + '.ts').catch(() => ({}))
	const colours = ['#e8423f', '#3f7fe8', '#f2c230', '#3fb950', '#a35de8', '#f28c28', '#ef6fb4', '#2fc6c0']
	let world
	/** Restless: running about, now one way, now the other, and jumping now and then. */
	const restless = (i) => () => {
		const t = world.ticks() + i * 37
		return { left: t % 170 < 60, right: t % 170 > 100, up: t % 47 < 18, down: false }
	}
	const own = ${bot ? `(world, racer, game) => { ${bot} }` : 'undefined'}
	world = W.createWorld(
		minigame.course,
		Array.from({ length: ${n} }, (_, i) => ({
			id: 'p' + i,
			runner: P.CLUB[(i * 3) % P.CLUB.length],
			controls: own ? () => own(world, world.racers[i], game) : restless(i),
			colour: colours[i],
			number: i + 1,
		})),
		{ round: true, minigame },
	)
	while (world.phase() !== 'running') ST.stepWorld(world)
`

const shotScript = (ticks: number, n: number) => `
	${prelude(n)}
	for (let i = 0; i < ${ticks}; i++) ST.stepWorld(world)
	const RV = await import('/run/src/draw/RaceView.tsx')
	const idx = await (await fetch('/run/src/index.tsx')).text()
	const solidUrl = idx.match(/\\/run\\/node_modules\\/\\.vite\\/deps\\/solid-js_web\\.js\\?v=[a-z0-9]+/)?.[0]
	const { render, createComponent } = await import(solidUrl)
	document.body.innerHTML = '<div id="t" style="position:fixed;inset:0;width:960px;height:540px;overflow:hidden;background:#000"></div>'
	// Held still on the tick asked for: the scene's own loop doesn't step it on.
	const scene = RV.createRaceScene(world, () => {})
	render(() => createComponent(RV.RaceCanvas, { world, scene }), document.getElementById('t'))
	return { ticks: world.raceTicks() }
`

const simScript = (n: number) => `
	const results = []
	for (let g = 0; g < ${games}; g++) {
		${prelude(n).replace('const minigame', 'var minigame').replace('const game', 'var game')}
		let t = 0
		while (!ST.roundOver(world) && t < 20000) { ST.stepWorld(world); t++ }
		results.push({
			seconds: Math.round(world.raceTicks() / 6) / 10,
			over: ST.roundOver(world),
			order: (world.order() ?? world.racers).map((r) => r.id + ' ' + world.minigame.note(r)),
		})
	}
	return { results }
`

let vite: ChildProcess | undefined
let chrome: ChildProcess | undefined
mkdirSync(path.resolve(scratch), { recursive: true })
const profile = mkdtempSync(path.join(path.resolve(scratch), 'chrome-'))
try {
	let port = Number(process.env.PORT ?? 0)
	if (!port) {
		port = 3400 + Math.floor(Math.random() * 500)
		vite = spawn(
			'npx',
			['vite', '--port', String(port), '--strictPort', '--force'],
			{
				cwd: app,
				stdio: 'ignore',
				detached: true,
			},
		)
	}
	const base = `http://localhost:${port}/run/`
	for (let i = 0; ; i++) {
		if (i > 160) throw new Error(`No dev server at ${base}`)
		try {
			if ((await fetch(base)).ok) break
		} catch {}
		await sleep(250)
	}
	const debug = 9300 + Math.floor(Math.random() * 500)
	chrome = spawn(
		process.env.CHROME ??
			'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
		[
			'--headless=new',
			'--mute-audio',
			'--hide-scrollbars',
			`--remote-debugging-port=${debug}`,
			`--user-data-dir=${profile}`,
			`--window-size=${VIEW.width},${VIEW.height}`,
			'about:blank',
		],
		{ stdio: 'ignore' },
	)
	let ws: string | undefined
	for (let i = 0; i < 50 && !ws; i++) {
		await sleep(200)
		try {
			const targets = await (
				await fetch(`http://127.0.0.1:${debug}/json/list`)
			).json()
			ws = targets.find(
				(t: { type: string }) => t.type === 'page',
			)?.webSocketDebuggerUrl
		} catch {}
	}
	if (!ws) throw new Error('Chrome never came up')
	const sock = new WebSocket(ws)
	await new Promise((r) => {
		sock.onopen = r
	})
	type Reply = {
		result?: {
			data?: string
			result?: { value?: Record<string, unknown> & { error?: string } }
			exceptionDetails?: { exception?: { description?: string }; text?: string }
		}
	}
	let next = 0
	const pending = new Map<number, (v: Reply) => void>()
	sock.onmessage = (e) => {
		const m = JSON.parse(String(e.data))
		if (m.id && pending.has(m.id)) {
			pending.get(m.id)?.(m)
			pending.delete(m.id)
		}
		if (m.method === 'Runtime.exceptionThrown')
			console.error('page:', m.params.exceptionDetails?.exception?.description)
	}
	const send = (method: string, params: object = {}) =>
		new Promise<Reply>((r) => {
			const i = ++next
			pending.set(i, r)
			sock.send(JSON.stringify({ id: i, method, params }))
		})
	await send('Page.enable')
	await send('Runtime.enable')
	await send('Network.setCacheDisabled', { cacheDisabled: true })
	await send('Emulation.setDeviceMetricsOverride', {
		...VIEW,
		deviceScaleFactor: 1,
		mobile: false,
	})
	/** `script` evaluated in a freshly loaded page: twice, if Vite reloads it bundling something new. */
	async function run(script: string) {
		for (let attempt = 0; attempt < 2; attempt++) {
			await send('Page.navigate', { url: base })
			await sleep(attempt ? 4000 : 1500)
			const res = await send('Runtime.evaluate', {
				expression: `(async () => { ${script} })()`,
				awaitPromise: true,
				returnByValue: true,
			})
			const thrown = res.result?.exceptionDetails
			if (thrown) {
				if (attempt)
					throw new Error(thrown.exception?.description ?? thrown.text)
				continue
			}
			const value = res.result?.result?.value
			if (value?.error) throw new Error(value.error)
			if (value) return value
		}
		throw new Error('Nothing came back from the page')
	}

	if (mode === 'shot') {
		mkdirSync(out, { recursive: true })
		for (const ticks of at) {
			await run(shotScript(ticks, players[0] ?? 3))
			// Settling: the sprites' images, and a moment of it moving.
			await sleep(2500)
			const pic = await send('Page.captureScreenshot', { format: 'png' })
			const file = path.join(out, `t${ticks}.png`)
			writeFileSync(file, Buffer.from(pic.result?.data ?? '', 'base64'))
			console.log(file)
		}
	} else
		for (const n of players.length ? players : [1, 3, 6]) {
			const { results } = (await run(simScript(n))) as {
				results: { seconds: number; over: boolean; order: string[] }[]
			}
			console.log(`${n} player${n === 1 ? '' : 's'}:`)
			for (const r of results)
				console.log(
					`  ${r.seconds}s${r.over ? '' : ' (not over!)'}: ${r.order.join(' | ')}`,
				)
		}
	sock.close()
} finally {
	chrome?.kill()
	if (vite?.pid) {
		try {
			process.kill(-vite.pid)
		} catch {}
	}
	await sleep(300)
	rmSync(profile, { recursive: true, force: true })
}
