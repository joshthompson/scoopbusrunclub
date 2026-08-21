/**
 * The state of a scrape, from first page to finished.
 *
 * This is the whole page while a run is live, and it stays up afterwards until
 * the data has been processed or the run dismissed — a half-finished scrape
 * should never be something you have to go looking for.
 */
import { AdminButton } from '@/components/admin/AdminButton'
import type { ItemStatus, RunState } from '@shared/scraper-protocol'
import { For, Show } from 'solid-js'
import { styles } from './resultStyles'

export function ScrapePanel(props: {
	state: RunState
	/** Files delivered and parsed so far. */
	capturedCount: number
	/** There's something worth reviewing — enables Process once the run ends. */
	canProcess: boolean
	onCancel: () => void
	onRetryCurrent: () => void
	onSkipCurrent: () => void
	onResume: () => void
	onProcess: () => void
	onDismiss: () => void
}) {
	const items = () => props.state.items
	const settled = () => items().filter((item) => isSettled(item.status)).length
	const current = () =>
		items().find((item) => item.key === props.state.currentKey)
	const blocked = () => current()?.status === 'blocked'
	const running = () => props.state.status === 'running'
	const failed = () => items().filter((item) => item.status === 'failed')

	/**
	 * Pages still owed: never fetched, fetched and failed, or in flight when the
	 * run stopped. Skipped ones were a deliberate choice, so they stay skipped.
	 */
	const outstanding = () =>
		items().filter(
			(item) => item.status !== 'captured' && item.status !== 'skipped',
		)

	/** Stopped early rather than reaching the end of the queue. */
	const interrupted = () =>
		!running() &&
		outstanding().length > 0 &&
		failed().length < outstanding().length

	const title = () => {
		if (running()) return blocked() ? 'Waiting for you' : 'Scraping parkrun'
		if (props.state.status === 'done') return 'Scrape finished'
		if (props.state.status === 'cancelled') return 'Scrape cancelled'
		return 'Scrape failed'
	}

	const hint = () => {
		if (running()) {
			return 'Pages are being fetched in a separate tab. Leave this tab open — results land here as they arrive.'
		}
		if (outstanding().length > 0) {
			return `${props.capturedCount} page(s) captured, ${outstanding().length} still needed. Continuing picks up where it stopped — nothing already captured is fetched again.`
		}
		if (!props.canProcess) {
			return 'Nothing was captured. Use the advanced page to upload pages by hand.'
		}
		return `${props.capturedCount} page(s) captured. Process them to review what will be uploaded.`
	}

	// A run with no pages isn't a run. Callers filter these out, but rendering
	// "0 of 0 pages · Scrape failed" would be worse than rendering nothing.
	if (items().length === 0) return null

	return (
		<div class={styles.runPanel}>
			<h3 class={styles.groupTitle}>{title()}</h3>
			<p class={styles.groupHint}>{hint()}</p>

			<div class={styles.runBar}>
				<i
					class={styles.runBarFill}
					style={{
						width: `${items().length ? Math.round((settled() / items().length) * 100) : 0}%`,
					}}
				/>
			</div>
			<p class={styles.runCount}>
				{settled()} of {items().length} pages
				{/* The interruption notice below carries the message in that case, so
				    don't say it twice. */}
				<Show when={props.state.message && !interrupted()}>
					{' · '}
					{props.state.message}
				</Show>
			</p>

			<Show when={blocked()}>
				<p class={styles.runBlocked}>
					{current()?.awaitUser
						? 'parkrun wants to check you are human. Switch to the scrape tab and solve it — the run carries on by itself, and nothing will reload while you work.'
						: "Waiting on parkrun. Retrying automatically; if it won't clear, skip the page and grab it by hand later."}
				</p>
			</Show>

			<Show when={interrupted()}>
				<p class={styles.runBlocked}>
					{props.state.message
						? `Stopped before finishing — ${props.state.message} `
						: 'Stopped before finishing. '}
					Everything captured so far is kept.
				</p>
			</Show>

			<ul class={styles.runList}>
				<For each={items()}>
					{(item) => (
						<li class={styles.runItem}>
							<span class={styles.runIcon}>{iconFor(item.status)}</span>
							<span class={styles.runLabel}>{item.label}</span>
							<span
								class={
									item.status === 'failed'
										? styles.runDetailBad
										: styles.runDetail
								}
							>
								{item.detail ?? ''}
							</span>
						</li>
					)}
				</For>
			</ul>

			<div class={styles.actions}>
				<div class={styles.actionButtons}>
					<Show when={running()}>
						{/* Retry is withheld mid-captcha: reloading would discard the
						    user's progress through it. */}
						<Show when={blocked() && !current()?.awaitUser}>
							<AdminButton variant="secondary" onClick={props.onRetryCurrent}>
								Retry now
							</AdminButton>
						</Show>
						<Show when={blocked()}>
							<AdminButton variant="secondary" onClick={props.onSkipCurrent}>
								Skip this page
							</AdminButton>
						</Show>
						<AdminButton variant="danger" onClick={props.onCancel}>
							Cancel scrape
						</AdminButton>
					</Show>

					<Show when={!running()}>
						<Show when={outstanding().length > 0}>
							<AdminButton onClick={props.onResume}>
								{failed().length === outstanding().length
									? `Retry ${failed().length} failed page${failed().length === 1 ? '' : 's'}`
									: `Continue scrape — ${outstanding().length} left`}
							</AdminButton>
						</Show>
						<Show when={props.canProcess}>
							<AdminButton
								size={outstanding().length > 0 ? 'medium' : 'large'}
								variant={outstanding().length > 0 ? 'secondary' : 'primary'}
								onClick={props.onProcess}
							>
								{outstanding().length > 0 ? 'Process anyway' : 'Process'}
							</AdminButton>
						</Show>
						{/* Always "discard" rather than "cancel" once the run has stopped:
						    "Cancel" reads as aborting the scrape, which has already
						    happened. This throws the captured pages away. */}
						<AdminButton variant="secondary" onClick={props.onDismiss}>
							Discard scrape
						</AdminButton>
					</Show>
				</div>
			</div>
		</div>
	)
}

function isSettled(status: ItemStatus): boolean {
	return status === 'captured' || status === 'failed' || status === 'skipped'
}

function iconFor(status: ItemStatus): string {
	switch (status) {
		case 'captured':
			return '✓'
		case 'failed':
			return '✗'
		case 'blocked':
			return '⏸'
		case 'active':
			return '⟳'
		case 'skipped':
			return '–'
		default:
			return '·'
	}
}
