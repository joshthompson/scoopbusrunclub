import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig, type Plugin } from 'vite'
import solidPlugin from 'vite-plugin-solid'
import { devPages } from './vite-dev-pages'

/**
 * The game runs on ScoopJS (the `scoopjs` package) and on the website's runner
 * sprites, imported straight from the web app. Those files import each other
 * through `@/`, so `@/` here means the web app's `src`, and this app's own
 * files import each other relatively.
 */
const web = path.resolve(__dirname, '../web/src')

/**
 * `pnpm dev:phones`: served over HTTPS on the local network, so phones can
 * join a Room as controllers. Multiplayer needs a secure page (trystero
 * hashes room names with `crypto.subtle`), and the certificate's
 * self-signed, so each phone has to accept the warning once.
 */
const phones = process.env.PHONES === '1'
const PORT = 3011

/**
 * This computer's address on the local network, for phones to reach it: a
 * home or office network's, before any VPN's or container's.
 */
function networkAddress() {
	const addresses = Object.values(os.networkInterfaces())
		.flat()
		.filter((a) => a && a.family === 'IPv4' && !a.internal)
		.map((a) => a?.address ?? '')
	return (
		addresses.find((a) => a.startsWith('192.168.')) ??
		addresses.find((a) => a.startsWith('10.')) ??
		addresses.find((a) => /^172\.(1[6-9]|2\d|3[01])\./.test(a)) ??
		addresses[0]
	)
}
const network = phones ? networkAddress() : undefined

/**
 * The website's icons, for the dev server. Built, the game sits at /run/ on the
 * website, so index.html's root-relative icon links find the website's own
 * files. In dev nothing's at the root, so this serves them from its `public`,
 * under /run/ too: the dev server puts the base in front of index.html's links.
 */
const webPublic = path.resolve(__dirname, '../web/public')
const ICON = /^\/(?:run\/)?(favicon[\w-]*\.(?:ico|png)|apple-touch-icon\.png)$/
const websiteIcons: Plugin = {
	name: 'website-icons',
	apply: 'serve',
	configureServer(server) {
		server.middlewares.use((req, res, next) => {
			const file = req.url?.split('?')[0].match(ICON)?.[1]
			const full = file && path.join(webPublic, file)
			if (!full || !fs.existsSync(full)) return next()
			res.setHeader(
				'Content-Type',
				file.endsWith('.ico') ? 'image/x-icon' : 'image/png',
			)
			fs.createReadStream(full).pipe(res)
		})
	},
}

export default defineConfig({
	base: '/run/',
	// The website's env, for the same backend: the guests come from it.
	envDir: path.resolve(__dirname, '../web'),
	plugins: [
		solidPlugin(),
		websiteIcons,
		devPages,
		...(phones ? [basicSsl()] : []),
	],
	// The Room's QR code points phones here, even with the Host on localhost.
	define: network
		? {
				'import.meta.env.VITE_PHONE_ORIGIN': JSON.stringify(
					`https://${network}:${PORT}`,
				),
			}
		: {},
	server: {
		port: PORT,
		host: phones,
		// The QR code's link has the port in it: no quietly moving to another.
		strictPort: phones,
	},
	build: {
		target: 'esnext',
	},
	resolve: {
		// One Solid for the game and ScoopJS both, even with ScoopJS linked in
		// from its own repo: two would each have their own signals, and the
		// game's would silently stop updating ScoopJS's sprites.
		dedupe: ['solid-js'],
		alias: [
			{ find: /^@\//, replacement: `${web}/` },
			{
				find: /^@shared\//,
				replacement: `${path.resolve(__dirname, '../../libs/shared')}/`,
			},
		],
	},
})
