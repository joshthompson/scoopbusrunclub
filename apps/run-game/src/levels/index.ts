import { furbyFields } from './furbyFields'
import { haga } from './haga'
import { kristineberg } from './kristineberg'
import type { Level } from './types'

/**
 * Every course, in the order they're played: a level's number is where it is
 * here, so moving one is moving it in this list.
 */
export const LEVELS: Level[] = [haga, furbyFields, kristineberg].map(
	(level, i) => ({
		...level,
		number: i + 1,
	}),
)
