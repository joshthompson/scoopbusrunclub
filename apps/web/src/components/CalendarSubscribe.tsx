import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { Modal } from '@/components/ui/Modal'
import { CALENDAR_FEED_URL } from '@/utils/api'
import { css } from '@style/css'
import { Show, createSignal } from 'solid-js'

/**
 * Everyone's parkrun attendance is most of the calendar by volume, and not
 * everybody wants a decade of it in the calendar they live out of, so the feed
 * leaves it out unless it's asked for.
 */
function feedUrl(withResults: boolean): string {
	return withResults ? `${CALENDAR_FEED_URL}?results=true` : CALENDAR_FEED_URL
}

/**
 * The same feed under the scheme that makes a calendar app offer to subscribe
 * rather than download a copy that never updates again.
 */
function webcalUrl(url: string): string {
	return url.replace(/^https?:/, 'webcal:')
}

/** Google has no handler for webcal:, so it takes the feed as a parameter. */
function googleCalendarUrl(url: string): string {
	return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(url)}`
}

/**
 * Subscribing, rather than exporting: the club's parkruns, races, milestones
 * and birthdays turn up in whatever calendar app someone already uses, and
 * keep up with the site on their own.
 */
export function CalendarSubscribe(props: { class?: string }) {
	const [open, setOpen] = createSignal(false)
	const [copied, setCopied] = createSignal(false)
	const [withResults, setWithResults] = createSignal(false)

	const url = () => feedUrl(withResults())

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(url())
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		} catch {
			// No clipboard permission — the URL is on screen to copy by hand.
		}
	}

	return (
		<>
			<Button class={props.class} onClick={() => setOpen(true)}>
				🗓️ Subscribe
			</Button>

			<Show when={open()}>
				<Modal title="Subscribe" onClose={() => setOpen(false)}>
					<div class={styles.body}>
						<p class={styles.intro}>
							Add the club's calendar to your phone or laptop and it'll keep
							itself up to date — new races, milestones and birthdays turn up on
							their own.
						</p>

						<div class={styles.choice}>
							<Checkbox
								label="Include everyone's parkrun results"
								variant="dirt"
								checked={withResults()}
								onChange={(event) =>
									setWithResults(event.currentTarget.checked)
								}
							/>
							<span class={styles.choiceDetail}>
								{withResults()
									? 'Every parkrun the club has run, going back years'
									: 'Just races, milestones, birthdays and Track and Food'}
							</span>
						</div>

						<a
							class={styles.option}
							href={webcalUrl(url())}
							onClick={() => setOpen(false)}
						>
							<span class={styles.optionTitle}>🍎 Apple Calendar</span>
							<span class={styles.optionDetail}>
								Also Outlook, Thunderbird and most others
							</span>
						</a>

						<a
							class={styles.option}
							href={googleCalendarUrl(url())}
							target="_blank"
							rel="noreferrer"
							onClick={() => setOpen(false)}
						>
							<span class={styles.optionTitle}>📆 Google Calendar</span>
							<span class={styles.optionDetail}>
								Opens Google's "add by URL" page
							</span>
						</a>

						<div class={styles.manual}>
							<span class={styles.manualLabel}>Or paste this in yourself</span>
							<code class={styles.url}>{url()}</code>
							<button type="button" class={styles.copy} onClick={copy}>
								{copied() ? '✓ Copied' : 'Copy link'}
							</button>
						</div>

						<p class={styles.note}>
							Calendar apps check back on their own schedule — usually a few
							hours, and up to a day for Google.
						</p>
					</div>
				</Modal>
			</Show>
		</>
	)
}

const styles = {
	body: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '0.75rem',
		padding: '0.25rem',
	}),
	intro: css({
		fontSize: '0.9rem',
		lineHeight: 1.4,
	}),
	choice: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '0.25rem',
		alignItems: 'flex-start',
		textAlign: 'left',
	}),
	choiceDetail: css({
		fontSize: '0.7rem',
		opacity: 0.8,
		paddingLeft: '1.75rem',
	}),
	option: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '0.15rem',
		padding: '0.6rem 0.75rem',
		border: '3px double currentColor',
		borderRadius: '4px',
		cornerShape: 'notch',
		textDecoration: 'none',
		color: 'inherit',
		cursor: 'pointer',
		_hover: {
			background: 'var(--overlay-white-10)',
		},
	}),
	optionTitle: css({
		fontWeight: 'bold',
	}),
	optionDetail: css({
		fontSize: '0.75rem',
		opacity: 0.8,
	}),
	manual: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '0.35rem',
		paddingTop: '0.25rem',
	}),
	manualLabel: css({
		fontSize: '0.75rem',
		textTransform: 'uppercase',
		opacity: 0.8,
	}),
	url: css({
		fontSize: '0.7rem',
		wordBreak: 'break-all',
		background: 'var(--overlay-black-60)',
		padding: '0.4rem 0.5rem',
		borderRadius: '4px',
	}),
	copy: css({
		alignSelf: 'flex-start',
		padding: '0.3rem 0.9rem',
		border: '3px double currentColor',
		background: 'transparent',
		color: 'inherit',
		cursor: 'pointer',
		fontSize: '0.8rem',
		borderRadius: '4px',
		cornerShape: 'notch',
		_hover: {
			background: 'var(--overlay-white-10)',
		},
	}),
	note: css({
		fontSize: '0.7rem',
		opacity: 0.75,
		lineHeight: 1.4,
	}),
}
