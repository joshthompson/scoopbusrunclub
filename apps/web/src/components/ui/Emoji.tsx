import CorgiEmoji from '@/assets/emoji/corgi.png'
import MedalEmoji from '@/assets/emoji/medal.png'
import PartyEmoji from '@/assets/emoji/party.png'
import PlayEmoji from '@/assets/emoji/play.png'
import RunDirectorEmoji from '@/assets/emoji/run-director.png'
import StarEmoji from '@/assets/emoji/star.png'
import TailWalkerEmoji from '@/assets/emoji/tail-walker.png'
import VolunteerEmoji from '@/assets/emoji/volunteer.png'
import AsteriskEmoji from '@assets/emoji/asterisk.png'
import BellEmoji from '@assets/emoji/bell.png'
import BusEmoji from '@assets/emoji/bus.png'
import CalendarEmoji from '@assets/emoji/calendar.png'
import FlagEmoji from '@assets/emoji/flag.png'
import GlobeEmoji from '@assets/emoji/globe.png'
import InfoEmoji from '@assets/emoji/info.png'
import JokerEmoji from '@assets/emoji/joker.png'
import PresentEmoji from '@assets/emoji/present.png'
import QuestionEmoji from '@assets/emoji/question.png'
import StopwatchEmoji from '@assets/emoji/stopwatch.png'
import TrophyEmoji from '@assets/emoji/trophy.png'
import WebEmoji from '@assets/emoji/web.png'
import { css, cva, cx } from '@style/css'
import { For, createMemo } from 'solid-js'

const emojiMap: Record<string, string | undefined> = {
	'🏅': MedalEmoji,
	'🎉': PartyEmoji,
	'▶': PlayEmoji,
	'⭐': StarEmoji,
	'🐶': CorgiEmoji,
	'🦺🟡': VolunteerEmoji,
	'🦺🟦': RunDirectorEmoji,
	'🦺🟠': TailWalkerEmoji,
	'🕸️': WebEmoji,
	'🌍': GlobeEmoji,
	'📅': CalendarEmoji,
	flag: FlagEmoji,
	'❓': QuestionEmoji,
	ℹ️: InfoEmoji,
	'🎁': PresentEmoji,
	'*': AsteriskEmoji,
	'🏆': TrophyEmoji,
	'🃏': JokerEmoji,
	'🚌': BusEmoji,
	'🔔': BellEmoji,
	stopwatch: StopwatchEmoji,
}

export interface EmojiProps {
	emoji: string | undefined
	shadow?: boolean
	flipped?: boolean
	animation?: 'default' | 'none' | 'wave'
	class?: string
}

export function Emoji(props: EmojiProps) {
	const emojiSrc = createMemo(() => {
		const mappedEmoji = emojiMap[props.emoji ?? '']
		if (mappedEmoji) return mappedEmoji

		return createPixelEmojiDataUrl(props.emoji, 24, 3)
	})

	const emoji = emojiSrc() ? (
		<img src={emojiSrc()} class={styles.image} alt={props.emoji} />
	) : (
		props.emoji
	)

	return (
		<div
			class={cx(
				styles.emoji({
					hasShadow: props.shadow,
					animation: props.animation ?? 'default',
				}),
				props.class,
			)}
		>
			<div
				class={styles.inner({
					hasShadow: props.shadow,
					flipped: props.flipped,
					animation: props.animation ?? 'default',
				})}
			>
				{emoji}
			</div>
		</div>
	)
}

function createPixelEmojiDataUrl(
	emoji: string | undefined,
	fontSize: number,
	scale: number,
) {
	if (typeof document === 'undefined' || !emoji) return undefined

	const font = `${fontSize}px Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif`
	const padding = 2

	const measureCanvas = document.createElement('canvas')
	const measureContext = measureCanvas.getContext('2d')
	if (!measureContext) return undefined

	measureContext.font = font
	const metrics = measureContext.measureText(emoji)

	const left = Math.max(0, metrics.actualBoundingBoxLeft || 0)
	const right = Math.max(
		1,
		metrics.actualBoundingBoxRight || metrics.width || fontSize,
	)
	const ascent = Math.max(1, metrics.actualBoundingBoxAscent || fontSize)
	const descent = Math.max(
		0,
		metrics.actualBoundingBoxDescent || fontSize * 0.2,
	)

	const glyphWidth = Math.max(1, Math.ceil(left + right))
	const glyphHeight = Math.max(1, Math.ceil(ascent + descent))
	const baseSize = Math.max(glyphWidth, glyphHeight) + padding * 2

	const baseCanvas = document.createElement('canvas')
	baseCanvas.width = baseSize
	baseCanvas.height = baseSize

	const baseContext = baseCanvas.getContext('2d')
	if (!baseContext) return undefined

	baseContext.clearRect(0, 0, baseSize, baseSize)
	baseContext.font = font
	baseContext.textBaseline = 'alphabetic'

	const drawX = (baseSize - glyphWidth) / 2 + left
	const drawY = (baseSize - glyphHeight) / 2 + ascent
	baseContext.fillText(emoji, drawX, drawY)

	const scaledCanvas = document.createElement('canvas')
	scaledCanvas.width = baseSize * scale
	scaledCanvas.height = baseSize * scale

	const scaledContext = scaledCanvas.getContext('2d')
	if (!scaledContext) return undefined

	scaledContext.clearRect(0, 0, scaledCanvas.width, scaledCanvas.height)
	scaledContext.imageSmoothingEnabled = false
	scaledContext.drawImage(
		baseCanvas,
		0,
		0,
		scaledCanvas.width,
		scaledCanvas.height,
	)

	return scaledCanvas.toDataURL()
}

/**
 * One emoji, as it appears in a string: the flag's two halves, the keycap's
 * box, the skin tone and the joins that make a single picture — all kept
 * together, because apart they're either nonsense or a different emoji.
 */
const EMOJI_PATTERN = [
	// A flag is two regional indicators, and means nothing split up.
	'[\\u{1F1E6}-\\u{1F1FF}]{2}',
	// A keycap: the character, its variation selector, and the enclosing box.
	'[#*0-9]\\uFE0F?\\u20E3',
	// Anything else pictographic, with whatever belongs to it — a variation
	// selector, a skin tone, a tag sequence, or another picture joined on.
	[
		'\\p{Extended_Pictographic}',
		'(?:',
		'\\uFE0F',
		'|[\\u{1F3FB}-\\u{1F3FF}]',
		'|[\\u{E0020}-\\u{E007F}]',
		'|\\u200D(?:\\p{Extended_Pictographic}|[\\u{1F1E6}-\\u{1F1FF}]{2})',
		')*',
	].join(''),
].join('|')

/** Sticky, so it can be asked "is there an emoji right here?". */
const EMOJI_AT = new RegExp(EMOJI_PATTERN, 'uy')
const EMOJI_ONLY = new RegExp(`^(?:${EMOJI_PATTERN})$`, 'u')

/**
 * The keys that are made of more than one emoji — `🦺🟡` and the rest — longest
 * first, so the pair is spotted before its first half is. The map's written-out
 * keys (`flag`, `stopwatch`) are deliberately left out: those are names to ask
 * for artwork by, not something to go looking for in a sentence.
 */
const COMPOUND_KEYS = Object.keys(emojiMap)
	.filter((key) => !EMOJI_ONLY.test(key) && !/^[a-z*]+$/.test(key))
	.sort((a, b) => b.length - a.length)

type EmojiStringPart = { text: string } | { emoji: string }

/** A string cut into its runs of text and the emoji between them. */
export function splitEmojiText(text: string): EmojiStringPart[] {
	const parts: EmojiStringPart[] = []
	let plain = ''

	const flush = () => {
		if (plain) parts.push({ text: plain })
		plain = ''
	}

	let index = 0
	while (index < text.length) {
		const compound = COMPOUND_KEYS.find((key) => text.startsWith(key, index))
		if (compound) {
			flush()
			parts.push({ emoji: compound })
			index += compound.length
			continue
		}

		EMOJI_AT.lastIndex = index
		const match = EMOJI_AT.exec(text)
		if (match) {
			flush()
			parts.push({ emoji: match[0] })
			index += match[0].length
			continue
		}

		// Not an emoji, so take the whole character — astral ones are two units.
		const codePoint = text.codePointAt(index)
		const width = codePoint !== undefined && codePoint > 0xffff ? 2 : 1
		plain += text.slice(index, index + width)
		index += width
	}

	flush()
	return parts
}

export interface EmojiStringProps {
	text: string
	/**
	 * How each emoji behaves. Defaults to `none`: a string is there to be read,
	 * and a sentence of bulging emoji is hard work.
	 */
	animation?: EmojiProps['animation']
	shadow?: boolean
}

/**
 * A line of text with its emoji drawn as artwork — `<EmojiString text="Hello 🚌
 * test" />` reads the same, but the bus is ours rather than the platform's.
 *
 * Emoji we have artwork for use it; the rest are pixelated from the font the
 * way a lone {@link Emoji} is, so a string doesn't end up half one thing and
 * half the other. Anything that isn't an emoji is left exactly as it was.
 */
export function EmojiString(props: EmojiStringProps) {
	const parts = createMemo(() => splitEmojiText(props.text))

	return (
		<For each={parts()}>
			{(part) =>
				'emoji' in part ? (
					<Emoji
						emoji={part.emoji}
						animation={props.animation ?? 'none'}
						shadow={props.shadow}
					/>
				) : (
					part.text
				)
			}
		</For>
	)
}

const styles = {
	emoji: cva({
		base: {
			position: 'relative',
			display: 'inline-block',
		},
		variants: {
			hasShadow: {
				true: {
					_after: {
						content: "''",
						position: 'absolute',
						height: '6px',
						borderRadius: '50%',
						background: 'var(--color-black)',
						transform: 'scale(1, 0.5)',
						translate: '0 0.3em',
						animation: 'floatShadow 2s ease-in-out infinite',
						left: 0,
						right: 0,
						bottom: 0,
					},
				},
			},
			animation: {
				default: {},
				wave: {},
				none: {
					_after: {
						animation: 'none !important',
					},
				},
			},
		},
	}),
	image: css({
		width: 'auto',
		height: '1em',
		translate: '0 0.1em',
		imageRendering: 'pixelated',
	}),
	inner: cva({
		base: {
			animation: 'buldge 2s ease-in-out infinite',
		},
		variants: {
			hasShadow: {
				true: { animation: 'float 2s ease-in-out infinite' },
			},
			flipped: {
				true: {
					scale: '-1 1',
				},
			},
			animation: {
				default: {},
				wave: {
					animation: 'wave 2s ease-in-out infinite',
					transformOrigin: 'center bottom',
				},
				none: {
					animation: 'none !important',
				},
			},
		},
	}),
}
