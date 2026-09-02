/** "josh cassidy-smith" → "Josh Cassidy-Smith" */
export function formatName(name: string) {
	return name
		.toLowerCase()
		.replace(/(?<=^|[\s-])\w/g, (char) => char.toUpperCase())
}

/**
 * 8134 → "8,134". Written out rather than left to `toLocaleString`, so the
 * distances read the same whether they're rendered in a browser or baked into
 * the calendar feed on the backend.
 */
export function groupThousands(value: number): string {
	return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
