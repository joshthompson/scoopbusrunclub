import { createSignal } from 'solid-js'

/**
 * Snow depth (cm) at which the site switches to its snowy look: `-snow` asset
 * variants everywhere they exist, plus a `snow` class on `<body>`.
 *
 * `0` keeps the snowy look on permanently (handy while we're building it out,
 * since it applies before the weather has even loaded) — set it to `1` for the
 * real "there's actually snow on the ground" behaviour.
 */
export const SNOW_THRESHOLD_CM = 2

const [snowDepth, setSnowDepth] = createSignal(0)

/** Current snow depth in cm. */
export { snowDepth }

/** Whether there's enough snow lying around for the snowy look. */
export const isSnowy = () => snowDepth() >= SNOW_THRESHOLD_CM

/** Set from the console, and then left alone by the weather. */
let overridden = false

/** Report the real snow depth from the weather. */
export function reportSnowDepth(cm: number) {
	if (!overridden) setSnowDepth(cm)
}

declare global {
	interface Window {
		setSnow: (cm: number) => string
	}
}

/**
 * `setSnow(5)` from the browser console to pretend there's 5cm of snow lying
 * around; everything swaps live. Sticks until reload, so the weather won't
 * quietly undo it. Any `-snow` variant too big for Vite to inline is fetched at
 * that point rather than up front, so it may pop in a frame late.
 */
if (typeof window !== 'undefined') {
	window.setSnow = (cm: number) => {
		overridden = true
		setSnowDepth(cm)
		return `snowDepth: ${cm}cm — ${isSnowy() ? 'snowy' : `not snowy (needs ${SNOW_THRESHOLD_CM}cm)`}`
	}
}

/**
 * Every PNG under `src/assets`, mapped to the exact URL a static `import` of
 * that file yields — hashed in a build, or an inlined data URI when the file is
 * small enough. Eager so the lookup below stays synchronous, and keyed by
 * module path so we can pair files up by name.
 */
const assetUrls = import.meta.glob('../assets/**/*.png', {
	eager: true,
	import: 'default',
}) as Record<string, string>

/**
 * `normal URL -> snowy URL`, built from the `-snow` naming convention: an asset
 * gets a snowy variant just by dropping `foo-snow.png` next to `foo.png`, no
 * wiring required.
 *
 * Assets are matched by their built URL rather than their filename, so this
 * works for inlined assets too. The one caveat is that two byte-identical PNGs
 * share a data URI, so a snowy variant of one would apply to both.
 */
const snowVariants = new Map<string, string>()

for (const path of Object.keys(assetUrls)) {
	if (!path.endsWith('-snow.png')) continue

	const normal = assetUrls[path.replace('-snow.png', '.png')]
	if (normal) snowVariants.set(normal, assetUrls[path])
}

/**
 * Swap an imported asset URL for its `-snow` variant while it's snowy. Assets
 * without a variant are returned untouched, so this is safe to use anywhere.
 *
 * Reads a signal, so call it inside a reactive context (JSX, a memo, an
 * accessor) rather than at module scope.
 */
export function snowyAsset(url: string): string {
	if (!isSnowy()) return url
	return snowVariants.get(url) ?? url
}
