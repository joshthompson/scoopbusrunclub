/**
 * A tour of a course, start to finish: a frame every 250 m (or at the `x`s
 * given), each a frozen moment with a runner stood there, swimming where
 * it's Deep Water, ticks still running so animated art moves. Written as
 * PNGs, then laid out on contact sheets, 10 frames a sheet, to look over.
 *
 * Run from apps/run-game:
 *   npx tsx .claude/skills/course-art-pass/tour.mts <course-id> <scratchpad> [--as <name>] [x...]
 *
 * Frames go to `<scratchpad>/art-pass/<course-id>/<name>/` (`--as`
 * defaults to `tour`), named by their `x`, and sheets by their first and
 * last frame's. It starts its own Vite dev
 * server unless `PORT` names one already running, and a muted headless
 * Chrome (`CHROME` for another binary) with a throwaway profile in the
 * scratchpad; both are gone when it ends, however it ends.
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
import { PNG } from 'pngjs'

const args = process.argv.slice(2)
const asAt = args.indexOf('--as')
const name = asAt >= 0 ? args.splice(asAt, 2)[1] : 'tour'
const [courseId, scratch, ...xArgs] = args
if (!courseId || !scratch) {
	console.error('Usage: tour.mts <course-id> <scratchpad> [--as <name>] [x...]')
	process.exit(1)
}
const app = path.resolve(
	path.dirname(new URL(import.meta.url).pathname),
	'../../..',
)
const out = path.join(path.resolve(scratch), 'art-pass', courseId, name)
mkdirSync(out, { recursive: true })
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
/** Frames, at the screen's size, and how many a sheet. */
const VIEW = { width: 960, height: 540 }
const PER_SHEET = 10

/** What's set up in the page for each frame, `X` along. */
const frameScript = (x: number) => `
	const C = await import('/run/src/courses/index.ts')
	const W = await import('/run/src/game/world.ts')
	const ST = await import('/run/src/game/step.ts')
	const P = await import('/run/src/runners/playable.ts')
	const K = await import('/run/src/game/constants.ts')
	const RV = await import('/run/src/draw/RaceView.tsx')
	const idx = await (await fetch('/run/src/index.tsx')).text()
	const solidUrl = idx.match(/\\/run\\/node_modules\\/\\.vite\\/deps\\/solid-js_web\\.js\\?v=[a-z0-9]+/)?.[0]
	const { render, createComponent } = await import(solidUrl)
	const course = C.COURSES.find((c) => c.id === ${JSON.stringify(courseId)})
	if (!course) return { error: 'No course ' + ${JSON.stringify(courseId)} + '. Ids: ' + C.COURSES.map((c) => c.id).join(', ') }
	const ctl = { right: false, left: false, up: false, down: false }
	const world = W.createWorld(course, [{ id: 'p', runner: P.MEMBERS[0], controls: () => ctl }])
	const b = world.body
	while (world.phase() !== 'running') ST.stepWorld(world)
	const { groundY, finishX } = world.terrain
	let x = ${x === -1 ? 'finishX + 100' : x}
	// Not down a Gap: on along to the far side of it.
	for (let i = 0; i < 40 && groundY(x) > K.VIEW_HEIGHT + 600; i++) x += 20
	const dw = course.deepWater
	const ground = groundY(x)
	const swimY = dw && x >= dw.from && x <= dw.to && ground > dw.surface + 80
		? dw.surface + Math.min(260, (ground - dw.surface) / 2) : 0
	// Stood there long enough for the camera to settle on them.
	for (let i = 0; i < 160; i++) {
		b.x = x; b.vx = 0
		if (swimY) { b.swimming = true; b.grounded = false; b.feetY = swimY; b.vy = 0 }
		else { b.feetY = ground; b.floor = ground; b.grounded = true; b.on = undefined }
		ST.stepWorld(world)
		world.bus.frontX = x - 900
	}
	document.body.innerHTML = '<div id="t" style="position:fixed;inset:0;width:960px;height:540px;overflow:hidden;background:#000"></div>'
	const scene = RV.createRaceScene(world, (w) => w.setTicks(w.ticks() + 1))
	render(() => createComponent(RV.RaceCanvas, { world, scene }), document.getElementById('t'))
	return { x, metres: Math.round((x - K.START_X) / K.PX_PER_M), finishX }
`

let vite: ChildProcess | undefined
let chrome: ChildProcess | undefined
const profile = mkdtempSync(path.join(path.resolve(scratch), 'chrome-'))
try {
	// A dev server: the one named, or our own.
	let port = Number(process.env.PORT ?? 0)
	if (!port) {
		port = 3400 + Math.floor(Math.random() * 500)
		vite = spawn('npx', ['vite', '--port', String(port), '--strictPort'], {
			cwd: app,
			stdio: 'ignore',
			detached: true,
		})
	}
	const base = `http://localhost:${port}/run/`
	for (let i = 0; ; i++) {
		if (i > 120) throw new Error(`No dev server at ${base}`)
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
	/** A reply from Chrome: the fields read here. */
	type Reply = {
		result?: {
			data?: string
			result?: { value?: { x?: number; metres: number; error?: string } }
		}
	}
	let id = 0
	const pending = new Map<number, (v: Reply) => void>()
	sock.onmessage = (e) => {
		const m = JSON.parse(String(e.data))
		if (m.id && pending.has(m.id)) {
			pending.get(m.id)?.(m)
			pending.delete(m.id)
		}
	}
	const send = (method: string, params: object = {}) =>
		new Promise<Reply>((r) => {
			const i = ++id
			pending.set(i, r)
			sock.send(JSON.stringify({ id: i, method, params }))
		})
	await send('Page.enable')
	await send('Network.setCacheDisabled', { cacheDisabled: true })
	await send('Emulation.setDeviceMetricsOverride', {
		...VIEW,
		deviceScaleFactor: 1,
		mobile: false,
	})

	// Where to stand: as given, or every 250 m from the start, and the finish.
	const xs = xArgs.length
		? xArgs.map(Number)
		: [...Array.from({ length: 20 }, (_, k) => 500 + k * 1000), -1]
	const frames: { file: string; x: number; metres: number }[] = []
	for (const want of xs) {
		let done: { x: number; metres: number } | undefined
		// Twice, if need be: Vite reloads the page the first time it bundles something new.
		for (let attempt = 0; attempt < 2 && !done; attempt++) {
			await send('Page.navigate', { url: base })
			await sleep(attempt ? 4000 : 1500)
			const res = await send('Runtime.evaluate', {
				expression: `(async () => { ${frameScript(want)} })()`,
				awaitPromise: true,
				returnByValue: true,
			})
			const value = res.result?.result?.value
			if (value?.error) throw new Error(value.error)
			if (value?.x !== undefined) done = { x: value.x, metres: value.metres }
		}
		if (!done) throw new Error(`Couldn't render x=${want}`)
		// Settling: the bus's ride, the sprites' images.
		await sleep(2500)
		const pic = await send('Page.captureScreenshot', { format: 'png' })
		const file = path.join(out, `x${done.x}.png`)
		writeFileSync(file, Buffer.from(pic.result?.data ?? '', 'base64'))
		frames.push({ file, ...done })
		console.log(`x${done.x}  ${(done.metres / 1000).toFixed(2)} km`)
	}
	sock.close()

	// Contact sheets: two across, at half size, in order along the course.
	const half = { width: VIEW.width / 2, height: VIEW.height / 2 }
	for (let s = 0; s * PER_SHEET < frames.length; s++) {
		const some = frames.slice(s * PER_SHEET, (s + 1) * PER_SHEET)
		const rows = Math.ceil(some.length / 2)
		const sheet = new PNG({
			width: half.width * 2 + 4,
			height: rows * (half.height + 4),
		})
		some.forEach((frame, k) => {
			const im = PNG.sync.read(readFileSync(frame.file))
			const ox = (k % 2) * (half.width + 4)
			const oy = Math.floor(k / 2) * (half.height + 4)
			for (let y = 0; y < half.height; y++)
				for (let x = 0; x < half.width; x++) {
					const from = (y * 2 * im.width + x * 2) * 4
					const to = ((oy + y) * sheet.width + ox + x) * 4
					for (let c = 0; c < 4; c++) sheet.data[to + c] = im.data[from + c]
				}
		})
		// Named by its frames, so another tour into the same folder adds to it.
		const file = path.join(
			out,
			`sheet-x${some[0].x}-x${some[some.length - 1].x}.png`,
		)
		writeFileSync(file, PNG.sync.write(sheet))
		console.log(
			`${file}: ${some.map((f) => `x${f.x}`).join(', ')} (left to right, top to bottom)`,
		)
	}
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
