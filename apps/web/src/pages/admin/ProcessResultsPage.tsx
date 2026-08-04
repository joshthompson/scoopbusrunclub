import { AdminButton } from '@/components/admin/AdminButton'
import {
	EXTRACTED_DATA_ID,
	ExtractedData,
} from '@/components/admin/results/ExtractedData'
import { ScrapePanel } from '@/components/admin/results/ScrapePanel'
import { styles } from '@/components/admin/results/resultStyles'
import { createResultSlots } from '@/components/admin/results/useResultSlots'
import { DirtBlock } from '@/components/ui/DirtBlock'
import { type ManualSummary, uploadManualResults } from '@/utils/manualResults'
import {
	buildWorkList,
	cancelScrape,
	clearScrape,
	listenToScraper,
	pingScraper,
	resendScrapedFiles,
	resumeScrape,
	retryScrape,
	skipScrapeItem,
	startScrape,
} from '@/utils/scraperClient'
import type { RunState } from '@shared/scraper-protocol'
import { A } from '@solidjs/router'
import {
	type Component,
	Show,
	createResource,
	createSignal,
	onCleanup,
	onMount,
} from 'solid-js'

/**
 * Process Results — the normal way parkrun data gets into the database when the
 * cron scrapers are blocked.
 *
 * The results-scraper extension does the fetching, so this page is mostly a
 * window onto one run: start it, watch it, review what it found, upload. There's
 * no upload form here at all — that lives on the advanced page for the rare case
 * where the extension isn't an option.
 */
export const ProcessResultsPage: Component = () => {
	const slots = createResultSlots()

	const [extensionPresent, setExtensionPresent] = createSignal(false)
	const [runState, setRunState] = createSignal<RunState | null>(null)
	const [summary, setSummary] = createSignal<ManualSummary | null>(null)
	const [progress, setProgress] = createSignal<string | null>(null)
	const [uploaded, setUploaded] = createSignal<string | null>(null)
	/** Something the extension couldn't do, shown without pretending a run failed. */
	const [notice, setNotice] = createSignal<string | null>(null)

	/** A run is in play — started, mid-flight, or finished but not yet processed. */
	const hasRun = () => runState() !== null

	/**
	 * A state with no items isn't a run, whatever status it carries — the extension
	 * reports "nothing to scrape" and "nothing to resume" that way. Rendering it as
	 * a scrape would claim a failure that never happened, so it becomes a notice.
	 */
	const takeState = (state: RunState) => {
		if (state.status === 'idle') return
		if (state.items.length === 0) {
			setRunState(null)
			if (state.message) setNotice(state.message)
			return
		}
		setNotice(null)
		setRunState(state)
	}

	// --- Extension wiring ---

	onMount(() => {
		const stop = listenToScraper({
			onHello: (state) => {
				setExtensionPresent(true)
				// A run that was already going when the page loaded (or a reload
				// mid-scrape): show it, and ask for anything captured meanwhile.
				if (state.status !== 'idle' && state.items.length > 0) {
					takeState(state)
					resendScrapedFiles()
				}
			},
			onState: takeState,
			onFile: slots.acceptCapturedFile,
			onFinished: takeState,
		})
		onCleanup(stop)

		void pingScraper().then((state) => {
			if (!state) return
			setExtensionPresent(true)
			if (state.status !== 'idle' && state.items.length > 0) {
				takeState(state)
				resendScrapedFiles()
			}
		})
	})

	const handleScrape = () => {
		setSummary(null)
		setUploaded(null)
		setNotice(null)
		startScrape({
			items: buildWorkList({
				skipKeys: slots.skippedKeys(),
				eventNames: slots.existing().eventNames,
			}),
			knownCourseEventIds: [...slots.existing().courseEventIds],
		})
	}

	/**
	 * Pick an interrupted or partly-failed run back up.
	 *
	 * The extension owns this rather than the page starting a fresh run, so the
	 * pages already captured stay captured and only the outstanding ones are
	 * fetched again.
	 */
	const handleResume = () => {
		setSummary(null)
		setUploaded(null)
		resumeScrape()
	}

	/** Close the panel and land on the review step. */
	const handleProcess = () => {
		setRunState(null)
		setSummary(slots.buildSummary())
		requestAnimationFrame(() => {
			document
				.getElementById(EXTRACTED_DATA_ID)
				?.scrollIntoView({ behavior: 'smooth', block: 'start' })
		})
	}

	const handleDiscard = () => {
		setRunState(null)
		setSummary(null)
		slots.reset()
		clearScrape()
	}

	const handleUpload = async () => {
		const current = summary()
		if (!current) return

		setProgress('Uploading…')
		const result = await uploadManualResults(current, (done, total, label) => {
			setProgress(
				done >= total
					? 'Finishing up…'
					: `Uploading ${done + 1}/${total}: ${label}`,
			)
		})
		setProgress(null)

		if (result.errors.length > 0) {
			// Keep everything on screen so the failures can be retried.
			setSummary({ ...current })
			setUploaded(null)
			setProgress(`Upload finished with errors: ${result.errors.join('; ')}`)
			return
		}

		// It's in the database now — wipe the run so a reload starts clean.
		setUploaded(
			`${result.runResults} result(s), ${result.volunteers} volunteer record(s), ${result.courses} course(s) and ${result.clubs} club snapshot(s) uploaded.`,
		)
		setSummary(null)
		slots.reset()
		clearScrape()
	}

	return (
		<div class={styles.container}>
			<DirtBlock>
				<h2 class={styles.sectionTitle}>Process Results</h2>

				<Show when={notice()}>
					{(message) => (
						<div class={styles.outcome}>
							<p class={styles.outcomeTitle}>Couldn't start</p>
							<p class={styles.groupHint}>{message()}</p>
							<button
								type="button"
								class={styles.dismiss}
								onClick={() => setNotice(null)}
							>
								Dismiss
							</button>
						</div>
					)}
				</Show>

				<Show when={uploaded()}>
					{(message) => (
						<div class={styles.outcome}>
							<p class={styles.outcomeTitle}>Uploaded</p>
							<p class={styles.groupHint}>{message()}</p>
							<button
								type="button"
								class={styles.dismiss}
								onClick={() => setUploaded(null)}
							>
								Dismiss
							</button>
						</div>
					)}
				</Show>

				{/* --- A run in play owns the page --- */}

				<Show when={runState()}>
					{(state) => (
						<ScrapePanel
							state={state()}
							capturedCount={slots.parsedCount()}
							// There's no form on this page to tick Skip on, so readiness is
							// "the scrape brought something back", not "every field is filled".
							// Partial uploads are fine — every write is an upsert.
							canProcess={slots.parsedCount() > 0}
							onCancel={cancelScrape}
							onRetryCurrent={retryScrape}
							onSkipCurrent={skipScrapeItem}
							onResume={handleResume}
							onProcess={handleProcess}
							onDismiss={handleDiscard}
						/>
					)}
				</Show>

				{/* --- Nothing running: start one, or explain how to get set up --- */}

				<Show when={!hasRun()}>
					<Show when={extensionPresent()} fallback={<InstallExtension />}>
						<p class={styles.intro}>
							The scraper extension fetches every page we need — each runner's
							history, the event results for volunteer credits, the club league
							table, and any course maps we're missing — then shows you what it
							found before anything is uploaded.
						</p>
						<div class={styles.topBar}>
							<AdminButton
								size="large"
								disabled={slots.loading()}
								onClick={handleScrape}
							>
								{slots.loading() ? 'Loading current data…' : 'Start scrape'}
							</AdminButton>
							<p class={styles.topBarHint}>
								Opens a separate tab and works through the pages. If parkrun
								asks you to prove you're human, solve it there and it carries
								on.
							</p>
						</div>
						<p class={styles.advancedLink}>
							<A href="/admin/process-results/advanced">
								Upload pages by hand instead →
							</A>
						</p>
					</Show>
				</Show>
			</DirtBlock>

			<Show when={summary()}>
				{(current) => (
					<ExtractedData
						summary={current()}
						report={null}
						progress={progress()}
						disabled={!!progress()}
						onUpload={handleUpload}
					/>
				)}
			</Show>
		</div>
	)
}

/** Where the packed extension is served from, when the site has one. */
const EXTENSION_ZIP = '/results-scraper.zip'

/**
 * Chrome cannot install an unlisted extension from a web page: inline installs
 * were removed in 2018, and a CRX that didn't come from the Web Store gets
 * disabled on Windows and macOS. Self-hosting still helps though — the download
 * removes the need for a repo checkout, Node and pnpm, leaving just unzip and
 * Load unpacked. So offer the file and be straight about the manual step.
 */
function InstallExtension() {
	// The archive only exists once the site has been built with the pack step, so
	// don't offer a link that 404s.
	const [zipAvailable] = createResource(async () => {
		try {
			const response = await fetch(EXTENSION_ZIP, { method: 'HEAD' })
			return response.ok
		} catch {
			return false
		}
	})

	return (
		<>
			<p class={styles.intro}>
				This page needs the <strong>results-scraper</strong> extension, which
				fetches the parkrun pages for you. It isn't on the Chrome Web Store, so
				Chrome won't install it from a link — but it's a one-minute job.
			</p>

			<Show when={zipAvailable()}>
				<div class={styles.topBar}>
					<a
						href={EXTENSION_ZIP}
						class={styles.advancedButton}
						download="results-scraper.zip"
					>
						Download the extension
					</a>
					<p class={styles.topBarHint}>
						Then unzip it and load the folder, as below. Chrome can't install it
						for you — extensions outside the Web Store have to be added by hand.
					</p>
				</div>
			</Show>

			<ol class={styles.steps}>
				<li>
					<Show
						when={zipAvailable()}
						fallback={
							<>
								Build it: <code>pnpm scraper:build</code>
							</>
						}
					>
						Download the zip above and unzip it
					</Show>
				</li>
				<li>
					Open <code>chrome://extensions</code> and turn on{' '}
					<strong>Developer mode</strong> (top right)
				</li>
				<li>
					Click <strong>Load unpacked</strong> and pick the{' '}
					<Show
						when={zipAvailable()}
						fallback={<code>dist/results-scraper</code>}
					>
						unzipped folder
					</Show>
				</li>
				<li>Reload this page</li>
			</ol>

			<p class={styles.topBarHint}>
				Already installed? Reload this page - the extension announces itself on
				load.
			</p>

			<div class={styles.topBar}>
				<A href="/admin/process-results/advanced" class={styles.advancedButton}>
					Upload pages by hand instead
				</A>
			</div>
		</>
	)
}
