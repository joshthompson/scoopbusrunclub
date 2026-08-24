/**
 * Name auto-blocking for visitor-created racers.
 *
 * A match doesn't reject the submission — it shadow bans it (`status: 'hidden'`),
 * so the creator still sees their racer and gets no signal to go and try a
 * cleverer spelling. The list is deliberately partial; it catches the lazy cases
 * and the admin page catches the rest.
 */

/** Terms blocked anywhere in the name, including inside a longer word. */
const BLOCKED_SUBSTRINGS = [
	// English
	'arsehole',
	'asshole',
	'bastard',
	'bellend',
	'bitch',
	'blowjob',
	'bollock',
	'boner',
	'buttplug',
	'clitoris',
	'cocksuck',
	'cunt',
	'dickhead',
	'dildo',
	'faggot',
	'fellatio',
	'fuck',
	'handjob',
	'jizz',
	'kunt',
	'motherfuck',
	'nigga',
	'nigger',
	'paedo',
	'pedophile',
	'phuck',
	'pussy',
	'retard',
	'scrotum',
	'shite',
	'testicle',
	'twat',
	'vagina',
	'wanker',
	'whore',
	// Swedish
	'fitta',
	'knulla',
	'kuk',
	'kukar',
	'pucko',
	'runka',
	'snorunge',
	'subba',
	// Hate / extremism
	'hitler',
	'nazi',
	'kkk',
	// Slurs and self-harm
	'tranny',
	'killyourself',
]

/** Terms blocked only as a standalone word, to spare "Scunthorpe"-style names. */
const BLOCKED_WORDS = [
	'anus',
	'ass',
	'arse',
	'balls',
	'cock',
	'crap',
	'cum',
	'dick',
	'fag',
	'knob',
	'minge',
	'piss',
	'porn',
	'prick',
	'rape',
	'rapist',
	'sex',
	'slut',
	'shit',
	'tit',
	'tits',
	'turd',
	'wank',
	'willy',
	'kys',
	// Swedish
	'bajs',
	'hora',
	'jävla',
	'javla',
	'kuk',
	'pitt',
	'skit',
]

/**
 * Innocent words that happen to contain a blocked term. Removed before matching,
 * since a false positive here silently hides a perfectly good racer.
 */
const EXEMPT_WORDS = ['scunthorpe', 'shiitake', 'penistone']

const LEET: Record<string, string> = {
	'0': 'o',
	'1': 'i',
	'3': 'e',
	'4': 'a',
	'5': 's',
	'6': 'g',
	'7': 't',
	'8': 'b',
	'9': 'g',
	'@': 'a',
	$: 's',
	'!': 'i',
	'|': 'i',
	'+': 't',
	'£': 'e',
}

/**
 * Fold a name down to something the lists can be matched against: lowercase,
 * accents stripped, leetspeak substituted, and runs of a repeated letter
 * collapsed so "fuuuuck" lands on "fuck".
 */
function normalise(name: string): string {
	const lowered = name
		.toLowerCase()
		.normalize('NFD')
		// biome-ignore lint/suspicious/noMisleadingCharacterClass: stripping the combining marks NFD just split off is the point
		.replace(/[\u0300-\u036f]/g, '')

	let out = ''
	for (const char of lowered) {
		const mapped = LEET[char] ?? char
		// Collapse a letter repeated three or more times down to two
		if (
			out.length >= 2 &&
			out[out.length - 1] === mapped &&
			out[out.length - 2] === mapped
		) {
			continue
		}
		out += mapped
	}
	return out
}

/** The normalised name with every non-letter removed, to defeat "f-u-c-k". */
function compact(normalised: string): string {
	return normalised.replace(/[^a-z]/g, '')
}

/**
 * Returns the term that got the name blocked, or null if it looks fine.
 * Callers use the term as the admin-facing flag reason.
 */
export function findBlockedTerm(name: string): string | null {
	const normalised = normalise(name)
	let squashed = compact(normalised)
	for (const word of EXEMPT_WORDS) squashed = squashed.split(word).join('')
	// "fuuuck" collapses to "fuuck", so also try a full de-duplication pass
	const deduped = squashed.replace(/(.)\1+/g, '$1')

	for (const term of BLOCKED_SUBSTRINGS) {
		if (squashed.includes(term) || deduped.includes(term)) return term
	}

	const words = normalised.split(/[^a-z]+/).filter(Boolean)
	for (const word of words) {
		const singular = word.replace(/(.)\1+/g, '$1')
		for (const term of BLOCKED_WORDS) {
			if (word === term || singular === term) return term
		}
	}

	return null
}
