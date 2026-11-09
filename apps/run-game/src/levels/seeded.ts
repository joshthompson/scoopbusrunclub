/** A seeded random number generator, so a course is laid out the same every time. */
export function seeded(seed: number) {
	let s = seed
	return () => {
		s = (s * 16807) % 2147483647
		return (s - 1) / 2147483646
	}
}
