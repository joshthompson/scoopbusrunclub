/**
 * Builds the results-scraper extension into dist/results-scraper.
 *
 * Uses vite's programmatic build in library mode, once per entry point. Three
 * separate builds rather than one multi-entry build because content scripts are
 * plain scripts, not ES modules — each has to come out as a single
 * self-contained IIFE with no imports, while the service worker wants ESM.
 *
 * Vite is already a root devDependency, so the extension adds nothing to
 * install.
 *
 * Usage:
 *   pnpm scraper:build
 *   pnpm scraper:watch
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { type InlineConfig, build } from 'vite'
import {
	GOOGLE_MAPS_HOST_PATTERNS,
	PARKRUN_HOST_PATTERNS,
} from '../../libs/shared/parkrun-urls'
import { createZip } from './zip'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, '../..')
const outDir = resolve(repoRoot, 'dist/results-scraper')

const watch = process.argv.includes('--watch')

/** `--pack` only adds the zip step; the bundles it archives are the same ones. */
const pack = process.argv.includes('--pack')

/** Where the packed archive lands, to be served by the web app. */
const zipPath = resolve(repoRoot, 'apps/web/public/results-scraper.zip')

/** Favicon sizes the web app ships, reused as the extension's icons. */
const ICON_SIZES = [16, 32, 96, 192, 512]

/**
 * Where the admin page lives. The bridge content script is injected *only* on
 * these origins — it's the one script that takes commands from a web page, so
 * its reach is kept as small as possible.
 */
const DEV_ADMIN_ORIGINS = ['http://localhost:3005/*', 'http://127.0.0.1:3005/*']

const PROD_ADMIN_ORIGINS = [
	'https://scoopbus.run/*',
	'https://*.scoopbus.run/*',
]

/**
 * One build, both origins.
 *
 * There used to be a dev channel (localhost only) and a packed channel
 * (scoopbus.run only), so that a machine with both installed couldn't run two
 * scrapes off one page — but it made the repo build useless against the live
 * site, which is the common case even while developing. Now a single build
 * answers on both and the toolbar icon follows whichever admin page it last
 * heard from (see src/openAdmin.ts).
 *
 * The flip side: don't keep the downloaded copy installed alongside a repo
 * build, or both will react to the same page.
 */
const ADMIN_HOST_PATTERNS = [...PROD_ADMIN_ORIGINS, ...DEV_ADMIN_ORIGINS]

/**
 * Extra origins to treat as scrapeable, comma-separated:
 *
 *   SCRAPER_EXTRA_ORIGINS='http://localhost:8099/*' pnpm scraper:build
 *
 * For pointing the extension at locally served fixtures instead of parkrun, and
 * for running the admin app somewhere other than :3005.
 */
const EXTRA_ORIGINS = (process.env.SCRAPER_EXTRA_ORIGINS ?? '')
	.split(',')
	.map((pattern) => pattern.trim())
	.filter(Boolean)

// --- manifest ---

const manifest = {
	manifest_version: 3,
	name: 'Scoop Bus Results Scraper',
	description: 'Collects results the Scoop Bus Run Club website.',
	version: '1.0.0',
	permissions: ['tabs', 'debugger', 'storage', 'unlimitedStorage', 'alarms'],
	host_permissions: [
		...PARKRUN_HOST_PATTERNS,
		...GOOGLE_MAPS_HOST_PATTERNS,
		...ADMIN_HOST_PATTERNS,
		...EXTRA_ORIGINS,
	],
	background: {
		service_worker: 'background.js',
		type: 'module',
	},
	content_scripts: [
		{
			// Talks to the admin page. Admin origins only.
			matches: [...ADMIN_HOST_PATTERNS, ...EXTRA_ORIGINS],
			js: ['bridge.js'],
			run_at: 'document_idle',
		},
		{
			// The floating progress panel on pages being scraped.
			matches: [
				...PARKRUN_HOST_PATTERNS,
				...GOOGLE_MAPS_HOST_PATTERNS,
				...EXTRA_ORIGINS,
			],
			js: ['overlay.js'],
			run_at: 'document_idle',
			all_frames: false,
		},
	],
	icons: ICON_SIZES.reduce<Record<string, string>>((icons, size) => {
		icons[String(size)] = `icons/icon-${size}.png`
		return icons
	}, {}),
	// No default_popup: clicking the icon opens the Process Results page instead.
	action: {
		default_title: 'Open Scoop Bus Process Results',
		default_icon: {
			'16': 'icons/icon-16.png',
			'32': 'icons/icon-32.png',
		},
	},
}

/**
 * Copied out of the web app's public folder rather than duplicated here, so the
 * extension and the site can't drift apart. These are the sizes that already
 * exist; Chrome scales from the nearest for anything else it needs.
 */
function copyIcons(): void {
	const iconDir = resolve(outDir, 'icons')
	mkdirSync(iconDir, { recursive: true })
	for (const size of ICON_SIZES) {
		copyFileSync(
			resolve(repoRoot, `apps/web/public/favicon-${size}x${size}.png`),
			resolve(iconDir, `icon-${size}.png`),
		)
	}
}

// --- bundles ---

interface Entry {
	name: string
	format: 'es' | 'iife'
}

const entries: Entry[] = [
	{ name: 'background', format: 'es' },
	{ name: 'bridge', format: 'iife' },
	{ name: 'overlay', format: 'iife' },
]

function configFor({ name, format }: Entry): InlineConfig {
	return {
		configFile: false,
		root: here,
		resolve: { alias: { '@shared': resolve(repoRoot, 'libs/shared') } },
		build: {
			outDir,
			// Each entry is built separately, so they mustn't wipe each other.
			emptyOutDir: false,
			target: 'chrome120',
			// Readable output matters more than bytes for a local dev tool, and it
			// makes the service worker debuggable in chrome://extensions.
			minify: false,
			sourcemap: 'inline',
			watch: watch ? {} : null,
			lib: {
				entry: resolve(here, `src/${name}.ts`),
				formats: [format],
				name: `scoopbus_${name}`,
				fileName: () => `${name}.js`,
			},
		},
		logLevel: 'warn',
	}
}

mkdirSync(outDir, { recursive: true })
writeFileSync(
	resolve(outDir, 'manifest.json'),
	`${JSON.stringify(manifest, null, 2)}\n`,
)
copyIcons()

for (const entry of entries) {
	await build(configFor(entry))
	console.log(`  ✓ ${entry.name}.js (${entry.format})`)
}

if (pack) {
	// Flat, so "Load unpacked" on the unzipped folder works with no nesting to
	// navigate into.
	const files = [
		'manifest.json',
		...entries.map((entry) => `${entry.name}.js`),
		...ICON_SIZES.map((size) => `icons/icon-${size}.png`),
	]
	const archive = createZip(
		files.map((name) => ({
			name,
			// Uint8Array, not Buffer — see the note in zip.ts.
			contents: new Uint8Array(readFileSync(resolve(outDir, name))),
		})),
	)
	mkdirSync(dirname(zipPath), { recursive: true })
	writeFileSync(zipPath, archive)
	console.log(
		`\npacked ${files.length} files → ${zipPath} (${Math.round(archive.length / 1024)} KB)`,
	)
}

console.log(`\nmanifest.json + ${entries.length} bundles → ${outDir}`)
if (watch) {
	console.log('Watching for changes. Reload the extension in Chrome to apply.')
} else {
	console.log('Answers on scoopbus.run and localhost:3005.')
	console.log(
		'Load via chrome://extensions → Developer mode → Load unpacked → this folder.',
	)
}
