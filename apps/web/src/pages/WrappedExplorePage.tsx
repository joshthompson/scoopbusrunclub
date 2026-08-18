import {
	SpotlightMembers,
	buildWrappedSlides,
} from '@/components/wrapped/WrappedSlides'
import { computeWrappedStats } from '@/utils/wrapped'
import {
	PREVIEW_HASH,
	getLatestAvailableYear,
	isPreviewHash,
	parseWrappedYear,
} from '@/utils/wrappedYears'
import { useLocation, useNavigate, useParams } from '@solidjs/router'
import { css } from '@style/css'
import {
	For,
	Match,
	Show,
	Switch,
	createEffect,
	createMemo,
	createResource,
	createSignal,
	onCleanup,
} from 'solid-js'
import { Portal } from 'solid-js/web'
import { type WrappedPageProps, fetchClubSnapshots } from './WrappedPage'

/** How long each slide holds before advancing on its own. */
const SLIDE_MS = 4500

/**
 * Where the left/right tap zones meet, as a fraction of the width. Biased
 * forward the way stories apps are, since advancing is the common action.
 */
const BACK_ZONE = 0.33

/**
 * Wrapped's own preference, deliberately separate from the game's music: the two
 * are unrelated surfaces and shouldn't reach into each other's settings.
 *
 * Not under the `sbrc:` prefix either — `wipeAllCache` clears that whole
 * namespace on a cache-version bump, which would quietly un-mute the music.
 */
const MUSIC_MUTED_KEY = 'sbrc-wrapped-music-muted'

/** Background, not foreground — the story is the thing being watched. */
const MUSIC_VOLUME = 0.4

/** A year gets one of the two tracks, so consecutive years don't sound alike. */
function trackForYear(year: number): string {
	return year % 2 === 0 ? '/audio/JzzFpCOaCic.mp3' : '/audio/9waDB_HmNvs.mp3'
}

function readMuted(): boolean {
	try {
		return localStorage.getItem(MUSIC_MUTED_KEY) === '1'
	} catch {
		return false
	}
}

function storeMuted(muted: boolean) {
	try {
		localStorage.setItem(MUSIC_MUTED_KEY, muted ? '1' : '0')
	} catch {
		// Private mode or a full store — the preference just won't persist.
	}
}

/**
 * Ramp the track down and stop it.
 *
 * The last slide exits by navigating to the scrolling page, and music cutting
 * dead on that step is jarring. The element and timer are held by this closure
 * rather than the component, so the fade finishes after the story has gone.
 *
 * The ramp is best-effort: iOS reserves loudness for the hardware buttons and
 * ignores writes to `volume`, so the tick count — not the volume reaching zero
 * — is what ends the fade. Waiting on the volume meant looping forever against
 * a value stuck at 1, never reaching the `pause()`, and a looping track playing
 * on long after the story had gone.
 */
function fadeOutAndStop(element: HTMLAudioElement) {
	const FADE_MS = 600
	const TICK_MS = 50
	const ticks = Math.ceil(FADE_MS / TICK_MS)
	const step = element.volume / ticks
	let tick = 0
	const fade = setInterval(() => {
		tick += 1
		const next = element.volume - step
		if (tick >= ticks || next <= 0.01) {
			clearInterval(fade)
			element.pause()
			return
		}
		element.volume = next
	}, TICK_MS)
}

/**
 * Wrapped as an Instagram-style story: one slide at a time on a bright
 * gradient, auto-advancing, ending on the scrolling `/wrapped/:year` page.
 * Slides come from the same builder the scrolling page uses.
 */
export function WrappedExplorePage(props: WrappedPageProps) {
	const params = useParams<{ year: string }>()
	const navigate = useNavigate()
	const location = useLocation()

	const [clubSnapshots] = createResource(fetchClubSnapshots)
	const [index, setIndex] = createSignal(0)

	const preview = createMemo(() => isPreviewHash(location.hash))
	const previewSuffix = createMemo(() => (preview() ? PREVIEW_HASH : ''))
	const parsedYear = createMemo(() => parseWrappedYear(params.year, preview()))
	const year = createMemo(
		() => parsedYear() ?? getLatestAvailableYear(preview()),
	)

	const stats = createMemo(() =>
		computeWrappedStats({
			year: year(),
			results: props.results,
			runners: props.runners,
			volunteers: props.volunteers,
			races: props.races,
			guests: props.guests,
			guestResults: props.guestResults,
			clubSnapshots: clubSnapshots() ?? [],
		}),
	)

	const slides = createMemo(() => buildWrappedSlides(stats(), year()))
	const current = createMemo(() => slides()[index()])

	/**
	 * The outgoing slide's gradient, held underneath the incoming one. Without it
	 * the keyed remount leaves a moment with nothing painted, and the page behind
	 * shows through mid-transition.
	 */
	const [baseGradient, setBaseGradient] = createSignal<string | undefined>()
	createEffect(() => {
		const gradient = current()?.gradient
		if (!gradient) return
		// Promoted to the base layer when this slide is replaced.
		onCleanup(() => setBaseGradient(gradient))
	})

	/** The story always ends on the scrolling page for the same year. */
	const exit = () => navigate(`/wrapped/${year()}${previewSuffix()}`)

	const forward = () => {
		if (index() >= slides().length - 1) exit()
		else setIndex((i) => i + 1)
	}
	const back = () => setIndex((i) => Math.max(0, i - 1))

	// Nothing to play — an unviewable year, or a year with no data at all.
	createEffect(() => {
		if (!parsedYear()) {
			navigate(
				`/wrapped/${getLatestAvailableYear(preview())}${previewSuffix()}`,
				{ replace: true },
			)
			return
		}
		if (stats().hasData && slides().length === 0) exit()
	})

	// Auto-advance. Re-runs on every slide change, which restarts the countdown.
	createEffect(() => {
		const at = index()
		const total = slides().length
		if (total === 0) return
		const timer = setTimeout(() => {
			if (at >= total - 1) exit()
			else setIndex(at + 1)
		}, SLIDE_MS)
		onCleanup(() => clearTimeout(timer))
	})

	// --- Background music ---

	const [muted, setMuted] = createSignal(readMuted())
	/** True when the browser refused to autoplay, so the button can invite a tap. */
	const [autoplayBlocked, setAutoplayBlocked] = createSignal(false)
	const [audio, setAudio] = createSignal<HTMLAudioElement>()

	// The element, rebuilt only when the year changes — so pressing mute doesn't
	// restart the track from the top.
	createEffect(() => {
		const element = new Audio(trackForYear(year()))
		// A story can outlast a track, and silence halfway through reads as broken.
		element.loop = true
		element.volume = MUSIC_VOLUME
		setAudio(element)
		onCleanup(() => {
			setAudio(undefined)
			fadeOutAndStop(element)
		})
	})

	// Playback follows the mute preference. Autoplay with sound is only allowed
	// once the user has interacted with the site — normally true, since a story is
	// reached by tapping a link, but not when the URL is opened cold.
	createEffect(() => {
		const element = audio()
		if (!element) return
		if (muted()) {
			element.pause()
			return
		}
		element
			.play()
			.then(() => setAutoplayBlocked(false))
			.catch(() => setAutoplayBlocked(true))
	})

	// Leaving the app should silence it. Installed to the home screen there's no
	// browser chrome to pause from, and iOS freezes the page's timers while
	// keeping its media playing — so nothing was left running to stop the track,
	// and the story sang on from the app switcher until it was reopened.
	createEffect(() => {
		const element = audio()
		if (!element) return
		const onVisibility = () => {
			if (document.hidden) element.pause()
			else if (!muted()) element.play().catch(() => {})
		}
		const onHide = () => element.pause()
		document.addEventListener('visibilitychange', onVisibility)
		window.addEventListener('pagehide', onHide)
		onCleanup(() => {
			document.removeEventListener('visibilitychange', onVisibility)
			window.removeEventListener('pagehide', onHide)
		})
	})

	/** No sound is coming out, whether that's the preference or the browser. */
	const silent = () => muted() || autoplayBlocked()

	const toggleMusic = () => {
		// Blocked rather than muted: this tap is the gesture the browser wanted, so
		// take it as "start the music" instead of flipping the preference to off.
		if (autoplayBlocked() && !muted()) {
			audio()
				?.play()
				.then(() => setAutoplayBlocked(false))
				.catch(() => {})
			return
		}
		const next = !muted()
		setMuted(next)
		storeMuted(next)
	}

	// Keyboard control, so the story is navigable off a touchscreen too.
	createEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.key === 'ArrowRight' || event.key === ' ') forward()
			else if (event.key === 'ArrowLeft') back()
			else if (event.key === 'Escape') exit()
			else return
			event.preventDefault()
		}
		window.addEventListener('keydown', onKey)
		onCleanup(() => window.removeEventListener('keydown', onKey))
	})

	return (
		// Portalled to <body>: the page's <main> is a z-index 101 stacking context,
		// so an overlay rendered inside it can never paint above the mobile nav.
		<Portal>
			<div class={styles.overlay}>
				{/* Holds the previous slide's colour so the crossfade never reveals
				    the page underneath. */}
				<div
					class={styles.backdropBase}
					style={{ background: baseGradient() ?? current()?.gradient }}
				/>

				{/* Re-mounted per slide (keyed), which replays the entrance animations. */}
				<Show when={current()} keyed>
					{(slide) => (
						<>
							<div
								class={styles.backdrop}
								style={{ background: slide.gradient }}
							/>
							<div class={styles.content}>
								<Switch>
									<Match when={slide.kind === 'spotlight' ? slide : null}>
										{(spotlightSlide) => (
											<div class={styles.spotlight}>
												<div class={styles.spotlightTitle}>
													{spotlightSlide().spotlight.title}
												</div>
												<div class={styles.spotlightSubtitle}>
													{spotlightSlide().spotlight.subtitle}
												</div>
												<SpotlightMembers
													members={spotlightSlide().spotlight.members}
													compact
												/>
											</div>
										)}
									</Match>
									<Match when={slide.kind === 'card' ? slide : null}>
										{(cardSlide) => (
											<>
												<div class={styles.emoji}>{cardSlide().emoji}</div>
												<div class={styles.body}>{cardSlide().body()}</div>
											</>
										)}
									</Match>
								</Switch>
							</div>
						</>
					)}
				</Show>

				{/* Progress — one segment per slide, filling as each one plays. */}
				<div class={styles.progress}>
					<For each={slides()}>
						{(_slide, i) => (
							<div class={styles.progressTrack}>
								<Show when={i() < index()}>
									<div class={styles.progressDone} />
								</Show>
								<Show when={i() === index()} keyed>
									<div class={styles.progressFill} />
								</Show>
							</div>
						)}
					</For>
				</div>

				<button
					type="button"
					class={styles.music}
					onClick={toggleMusic}
					aria-label={silent() ? 'Play music' : 'Mute music'}
				>
					{silent() ? '🔇' : '🔊'}
				</button>

				<button
					type="button"
					class={styles.close}
					onClick={exit}
					aria-label="Close"
				>
					✕
				</button>

				{/* Tap zones sit above the content, so every tap pages the story. */}
				<button
					type="button"
					class={styles.tapBack}
					onClick={back}
					aria-label="Previous slide"
				/>
				<button
					type="button"
					class={styles.tapForward}
					onClick={forward}
					aria-label="Next slide"
				/>
			</div>
		</Portal>
	)
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const TAP_ZONE = {
	position: 'absolute',
	top: 0,
	bottom: 0,
	appearance: 'none',
	border: 'none',
	background: 'transparent',
	cursor: 'pointer',
	padding: 0,
} as const

/** The round controls in the top corner, above the tap zones so they're pressable. */
const OVERLAY_BUTTON = {
	position: 'absolute',
	top: 'max(1.5rem, calc(env(safe-area-inset-top) + 0.75rem))',
	zIndex: 2,
	appearance: 'none',
	border: 'none',
	background: 'rgba(0,0,0,0.25)',
	color: 'var(--color-white)',
	fontSize: '1.1rem',
	lineHeight: 1,
	width: '2rem',
	height: '2rem',
	borderRadius: '50%',
	cursor: 'pointer',
	display: 'grid',
	placeItems: 'center',
} as const

const styles = {
	overlay: css({
		position: 'fixed',
		inset: 0,
		// Above the mobile navigation, which tops out at 300.
		zIndex: 400,
		// Opaque in its own right, so the page behind is never visible even before
		// the first slide's gradient is painted.
		background: '#101828',
		overflow: 'hidden',
		overscrollBehavior: 'contain',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		color: 'var(--color-white)',
		textAlign: 'center',
	}),
	backdropBase: css({
		position: 'absolute',
		inset: 0,
	}),
	backdrop: css({
		position: 'absolute',
		inset: 0,
		animation: 'storyBackdropIn 400ms ease-out',
	}),
	content: css({
		position: 'relative',
		width: 'calc(100% - 3rem)',
		maxWidth: '640px',
		// Without this a flex item's automatic minimum size lets wide content
		// stretch it past the viewport, which pushes slide text off-screen.
		minWidth: 0,
		maxHeight: 'calc(100% - 8rem)',
		overflowY: 'auto',
		overflowX: 'hidden',
		// Taps belong to the zones below, not to links inside the slide.
		pointerEvents: 'none',
		animation: 'storySlideIn 450ms cubic-bezier(0.22, 1, 0.36, 1)',
		textShadow: '0 2px 12px rgba(0,0,0,0.35)',
	}),
	emoji: css({
		fontSize: '4.5rem',
		lineHeight: 1,
		marginBottom: '1.25rem',
		filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))',
	}),
	body: css({
		fontSize: '1.6rem',
		fontWeight: 500,
		lineHeight: 1.35,
		// `pretty` over `balance`: balance evens out line lengths, which is for
		// headings, and it strands short trailing fragments. `pretty` specifically
		// avoids orphans, which is what leaves punctuation alone on a line.
		textWrap: 'pretty',
		'& strong': {
			fontSize: '2rem',
			fontWeight: 800,
			// Deliberately NOT inline-block. An atomic inline creates a soft-wrap
			// opportunity on both sides, so the full stop in "…<strong>68 times
			// </strong>. Thank you…" would break onto the next line on its own.
		},
		md: {
			fontSize: '1.9rem',
			'& strong': { fontSize: '2.4rem' },
		},
	}),
	spotlight: css({
		display: 'flex',
		flexDirection: 'column',
		// Stretch, not center — a centered column item sizes to its content and
		// will happily overflow the slide on a narrow screen.
		alignItems: 'stretch',
	}),
	spotlightTitle: css({
		fontSize: '1.6rem',
		fontWeight: 800,
		marginBottom: '0.4rem',
		textWrap: 'balance',
		md: { fontSize: '2rem' },
	}),
	spotlightSubtitle: css({
		fontSize: '1rem',
		opacity: 0.9,
		textWrap: 'balance',
	}),
	progress: css({
		position: 'absolute',
		top: 'max(0.75rem, env(safe-area-inset-top))',
		left: '0.75rem',
		right: '0.75rem',
		display: 'flex',
		// The 2px spacing between sections.
		gap: '2px',
		height: '3px',
	}),
	progressTrack: css({
		position: 'relative',
		flex: 1,
		borderRadius: '2px',
		overflow: 'hidden',
		background: 'rgba(255,255,255,0.5)',
	}),
	progressDone: css({
		position: 'absolute',
		inset: 0,
		background: 'var(--color-white)',
	}),
	progressFill: css({
		position: 'absolute',
		inset: 0,
		background: 'var(--color-white)',
		transformOrigin: 'left center',
		animation: `storyProgress ${SLIDE_MS}ms linear forwards`,
	}),
	close: css({
		...OVERLAY_BUTTON,
		right: '0.9rem',
	}),
	music: css({
		...OVERLAY_BUTTON,
		// Sits just inside the close button, which keeps the corner.
		right: '3.4rem',
		fontSize: '1rem',
	}),
	tapBack: css({
		...TAP_ZONE,
		left: 0,
		width: `${BACK_ZONE * 100}%`,
	}),
	tapForward: css({
		...TAP_ZONE,
		right: 0,
		width: `${(1 - BACK_ZONE) * 100}%`,
	}),
}
