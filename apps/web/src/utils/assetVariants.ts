/**
 * Every PNG under `src/assets`, mapped to the exact URL a static `import` of
 * that file yields — hashed in a build, or an inlined data URI when the file is
 * small enough. Eager so the lookups built from it stay synchronous, and keyed
 * by module path so we can pair files up by name.
 */
const assetUrls = import.meta.glob('../assets/**/*.png', {
	eager: true,
	import: 'default',
}) as Record<string, string>

/**
 * `normal URL -> variant URL`, built from a naming convention: an asset gets a
 * variant just by dropping `foo-<suffix>.png` next to `foo.png`, no wiring
 * required. `-snow` and `-halloween` are the two in use.
 *
 * Assets are matched by their built URL rather than their filename, so this
 * works for inlined assets too. The one caveat is that two byte-identical PNGs
 * share a data URI, so a variant of one would apply to both.
 */
export function assetVariants(suffix: string): Map<string, string> {
	const variants = new Map<string, string>()
	const ending = `-${suffix}.png`

	for (const path of Object.keys(assetUrls)) {
		if (!path.endsWith(ending)) continue

		const normal = assetUrls[path.replace(ending, '.png')]
		if (normal) variants.set(normal, assetUrls[path])
	}

	return variants
}
