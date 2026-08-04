/**
 * One field of the advanced upload form.
 *
 * Only used by the advanced page now that the extension handles the normal case,
 * but it's the same slot underneath, so a hand-picked file gets the same parsing,
 * the same wrong-file guards and the same status line.
 */
import { Checkbox } from '@/components/ui/Checkbox'
import { For, Show } from 'solid-js'
import { styles } from './resultStyles'
import { type Slot, emptySlot } from './useResultSlots'

/**
 * Keep the end of a filename, which is the part that differs — parkrun's saved
 * pages all start with the same long "view-source_https___www.parkrun…" prefix.
 */
function truncateStart(name: string, max = 34): string {
	return name.length <= max ? name : `…${name.slice(-(max - 1))}`
}

export function UploadRow<T extends { warnings: string[] }>(props: {
	label: string
	sublabel?: string
	/** The parkrun page this field's file comes from, opened in a new tab. */
	href?: string
	accept: string
	slot: Slot<T> | undefined
	onFile: (file: File | undefined) => void
	onSkip: (skip: boolean) => void
	/** One-line description of what was parsed out of the file. */
	status: (parsed: T) => string
}) {
	const slot = () => props.slot ?? emptySlot<T>()

	return (
		<div class={styles.row}>
			<div class={styles.rowHead}>
				<Show
					when={props.href}
					fallback={<span class={styles.rowLabel}>{props.label}</span>}
				>
					{(href) => (
						<a
							class={styles.rowLabelLink}
							href={href()}
							target="_blank"
							rel="noreferrer"
							title={`Open ${href()}`}
						>
							{props.label}
							<span class={styles.externalIcon}>↗</span>
						</a>
					)}
				</Show>
				<Show when={props.sublabel}>
					<span class={styles.rowSublabel}>{props.sublabel}</span>
				</Show>
			</div>
			<div class={styles.rowControls}>
				{/* The native file input is unstyleable, so it stays visually hidden
				    (but focusable) inside a label that acts as the button. */}
				<label class={styles.fileButton({ disabled: slot().skip })}>
					<input
						class={styles.hiddenFileInput}
						type="file"
						accept={props.accept}
						disabled={slot().skip}
						onChange={(e) => props.onFile(e.currentTarget.files?.[0])}
					/>
					{slot().fileName ? 'Change file' : 'Choose file'}
				</label>
				<span
					class={styles.fileName({ empty: !slot().fileName })}
					title={slot().fileName || undefined}
				>
					{slot().skip
						? 'Skipped'
						: slot().fileName
							? truncateStart(slot().fileName)
							: 'No file chosen'}
				</span>
				<Checkbox
					label="Skip"
					checked={slot().skip}
					onChange={(e) => props.onSkip(e.currentTarget.checked)}
				/>
			</div>
			<Show when={slot().parsing}>
				<p class={styles.rowStatus}>Parsing…</p>
			</Show>
			<Show when={slot().error}>
				<p class={styles.rowError}>✗ {slot().error}</p>
			</Show>
			<Show when={slot().parsed}>
				{(parsed) => (
					<>
						<p class={styles.rowStatus}>✓ {props.status(parsed())}</p>
						<For each={parsed().warnings}>
							{(warning) => <p class={styles.rowWarning}>⚠ {warning}</p>}
						</For>
					</>
				)}
			</Show>
		</div>
	)
}
