import { AdminButton } from '@/components/admin/AdminButton'
import { AdminInput } from '@/components/admin/AdminInput'
import { useAuth } from '@/components/admin/AuthGuard'
import { DirtBlock } from '@/components/ui/DirtBlock'
import { currentEndpoint } from '@/notifications/push'
import {
	type ScheduledNotification,
	type SentNotification,
	cancelNotification,
	createNotification,
	fetchNotifications,
	previewNotification,
} from '@/utils/adminApi'
import {
	CUSTOM_BODY_MAX,
	CUSTOM_TITLE_MAX,
} from '@shared/notifications/messages'
import { css } from '@style/css'
import {
	type Component,
	For,
	Show,
	createResource,
	createSignal,
} from 'solid-js'

/** How a notification kind reads in the history list. */
const KIND_LABELS: Record<string, string> = {
	results: 'New Results',
	milestone: 'Milestone',
	pb: 'PB',
	coursePb: 'Course PB',
	largestClub: 'Largest Club',
	journey: 'Journey',
	race: 'Race Day',
	wrapped: 'Wrapped',
	custom: 'Custom',
	test: 'Test',
}

function formatWhen(ms: number): string {
	return new Date(ms).toLocaleString('en-GB', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	})
}

/** A `datetime-local` value for now, rounded up to the next five minutes. */
function defaultScheduleValue(): string {
	const d = new Date(Date.now() + 60 * 60 * 1000)
	d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5, 0, 0)
	const pad = (n: number) => String(n).padStart(2, '0')
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const NotificationsPage: Component = () => {
	const auth = useAuth()

	const [data, { refetch }] = createResource(() => fetchNotifications())
	// Only needed for the preview button, and only if this browser is subscribed.
	const [endpoint] = createResource(currentEndpoint)

	const [title, setTitle] = createSignal('')
	const [body, setBody] = createSignal('')
	const [url, setUrl] = createSignal('')
	const [scheduled, setScheduled] = createSignal(false)
	const [sendAtValue, setSendAtValue] = createSignal(defaultScheduleValue())
	const [confirming, setConfirming] = createSignal(false)
	const [busy, setBusy] = createSignal(false)
	const [error, setError] = createSignal('')
	const [message, setMessage] = createSignal('')

	const canSend = () => title().trim() !== '' && body().trim() !== ''
	const reach = () => data()?.subscribers ?? 0

	const note = (text: string) => {
		setMessage(text)
		setError('')
	}
	const fail = (text: string) => {
		setError(text)
		setMessage('')
	}

	async function sendPreview() {
		const target = endpoint()
		if (!target) {
			fail(
				'This browser has notifications turned off — turn them on at /notifications first.',
			)
			return
		}
		setBusy(true)
		try {
			const result = await previewNotification({
				endpoint: target,
				title: title().trim(),
				body: body().trim(),
				url: url().trim(),
			})
			if (result.error) fail(result.error)
			else note('Sent to this device only.')
		} finally {
			setBusy(false)
		}
	}

	async function send() {
		setBusy(true)
		try {
			const sendAt = scheduled()
				? new Date(sendAtValue()).getTime()
				: Date.now()

			const result = await createNotification({
				title: title().trim(),
				body: body().trim(),
				url: url().trim() || undefined,
				sendAt,
			})

			if (result.error) {
				fail(result.error)
				return
			}

			note(
				scheduled()
					? `Scheduled for ${formatWhen(sendAt)}.`
					: `Sent to ${reach()} device${reach() === 1 ? '' : 's'}.`,
			)
			setTitle('')
			setBody('')
			setUrl('')
			setConfirming(false)
			// The send happens in the background, so the count lands a moment later.
			setTimeout(refetch, 1500)
		} finally {
			setBusy(false)
		}
	}

	async function cancel(item: ScheduledNotification) {
		setBusy(true)
		try {
			const result = await cancelNotification(item._id)
			if (result.error) fail(result.error)
			else {
				note(`Cancelled "${item.title}".`)
				await refetch()
			}
		} finally {
			setBusy(false)
		}
	}

	return (
		<div class={styles.page}>
			<Show when={auth.isSuperAdmin()}>
				<DirtBlock title="Send a Notification">
					<div class={styles.form}>
						<p class={styles.reach}>
							This goes to{' '}
							<strong>
								{reach()} device{reach() === 1 ? '' : 's'}
							</strong>{' '}
							and can't be taken back.
						</p>

						<AdminInput
							label="Title"
							fullWidth
							maxLength={CUSTOM_TITLE_MAX}
							value={title()}
							onInput={(e) => {
								setTitle(e.currentTarget.value)
								setConfirming(false)
							}}
						/>

						<label class={styles.field}>
							Message
							<textarea
								class={styles.textarea}
								rows={3}
								maxLength={CUSTOM_BODY_MAX}
								value={body()}
								onInput={(e) => {
									setBody(e.currentTarget.value)
									setConfirming(false)
								}}
							/>
							<span class={styles.counter}>
								{body().length} / {CUSTOM_BODY_MAX}
							</span>
						</label>

						<AdminInput
							label="Link (optional)"
							fullWidth
							placeholder="/calendar"
							value={url()}
							onInput={(e) => setUrl(e.currentTarget.value)}
						/>

						<label class={styles.checkboxRow}>
							<input
								type="checkbox"
								checked={scheduled()}
								onChange={(e) => {
									setScheduled(e.currentTarget.checked)
									setConfirming(false)
								}}
							/>
							Send later
						</label>

						<Show when={scheduled()}>
							<AdminInput
								label="Send at"
								type="datetime-local"
								fullWidth
								value={sendAtValue()}
								onInput={(e) => setSendAtValue(e.currentTarget.value)}
							/>
						</Show>

						{/* Preview first — the only way to see it on a lock screen
						    before the whole club does. */}
						<div class={styles.actions}>
							<AdminButton
								variant="secondary"
								disabled={!canSend() || busy()}
								onClick={sendPreview}
							>
								Send to me only
							</AdminButton>

							<Show
								when={confirming()}
								fallback={
									<AdminButton
										disabled={!canSend() || busy()}
										onClick={() => setConfirming(true)}
									>
										{scheduled() ? 'Schedule' : 'Send to everyone'}
									</AdminButton>
								}
							>
								<AdminButton variant="danger" disabled={busy()} onClick={send}>
									{busy()
										? 'Sending…'
										: scheduled()
											? 'Confirm schedule'
											: `Yes — send to ${reach()}`}
								</AdminButton>
								<AdminButton
									variant="secondary"
									disabled={busy()}
									onClick={() => setConfirming(false)}
								>
									Cancel
								</AdminButton>
							</Show>
						</div>

						<Show when={message()}>
							<p class={styles.ok}>{message()}</p>
						</Show>
						<Show when={error()}>
							<p class={styles.bad}>{error()}</p>
						</Show>
					</div>
				</DirtBlock>
			</Show>

			<Show when={(data()?.scheduled.length ?? 0) > 0}>
				<DirtBlock title="Scheduled">
					<div class={styles.list}>
						<For each={data()?.scheduled}>
							{(item) => (
								<div class={styles.row}>
									<div class={styles.rowMain}>
										<strong>{item.title}</strong>
										<span>{item.body}</span>
										<span class={styles.meta}>
											{formatWhen(item.sendAt)} · set by {item.createdBy}
										</span>
									</div>
									<Show when={auth.isSuperAdmin()}>
										<AdminButton
											variant="danger"
											size="small"
											disabled={busy()}
											onClick={() => cancel(item)}
										>
											Cancel
										</AdminButton>
									</Show>
								</div>
							)}
						</For>
					</div>
				</DirtBlock>
			</Show>

			<DirtBlock title="Sent">
				<Show
					when={(data()?.sent.length ?? 0) > 0}
					fallback={
						<p class={styles.empty}>
							{data.loading ? 'Loading…' : 'Nothing has been sent yet.'}
						</p>
					}
				>
					<div class={styles.list}>
						<For each={data()?.sent}>{(item) => <SentRow item={item} />}</For>
					</div>
					<Show when={data()?.hasMore}>
						<p class={styles.meta}>Older notifications not shown.</p>
					</Show>
				</Show>
			</DirtBlock>
		</div>
	)
}

const SentRow: Component<{ item: SentNotification }> = (props) => (
	<div class={styles.row}>
		<div class={styles.rowMain}>
			{/* Everything sent from now on carries its wording. Anything without it
			    predates that, so the dedupe key is all there is to show. */}
			<strong>{props.item.title ?? props.item.dedupeKey}</strong>
			<Show when={props.item.body}>
				<span>{props.item.body}</span>
			</Show>
			<span class={styles.meta}>
				{KIND_LABELS[props.item.kind] ?? props.item.kind} ·{' '}
				{formatWhen(props.item.sentAt)}
			</span>
		</div>
		<span class={styles.count}>
			{props.item.sentCount === null
				? '—'
				: `${props.item.sentCount} device${props.item.sentCount === 1 ? '' : 's'}`}
		</span>
	</div>
)

const styles = {
	page: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '1.5rem',
		maxWidth: '820px',
		margin: '0 auto',
		width: '100%',
	}),
	form: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '0.75rem',
		textAlign: 'left',
	}),
	reach: css({
		fontSize: '0.85rem',
		opacity: 0.9,
	}),
	field: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '0.25rem',
		fontSize: '0.8rem',
		fontWeight: 'bold',
		textTransform: 'uppercase',
		letterSpacing: '0.03em',
	}),
	textarea: css({
		width: '100%',
		padding: '0.5rem',
		border: '3px double var(--color-black)',
		background: 'var(--overlay-black-15)',
		color: 'var(--color-white)',
		borderRadius: '4px',
		cornerShape: 'notch',
		fontFamily: 'inherit',
		fontSize: '0.9rem',
		fontWeight: 'normal',
		textTransform: 'none',
		letterSpacing: 'normal',
		resize: 'vertical',
	}),
	counter: css({
		fontSize: '0.7rem',
		fontWeight: 'normal',
		opacity: 0.7,
		textTransform: 'none',
	}),
	checkboxRow: css({
		display: 'flex',
		alignItems: 'center',
		gap: '0.5rem',
		fontSize: '0.85rem',
		cursor: 'pointer',
	}),
	actions: css({
		display: 'flex',
		flexWrap: 'wrap',
		gap: '0.5rem',
		marginTop: '0.25rem',
	}),
	list: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '0.5rem',
		textAlign: 'left',
	}),
	row: css({
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: '1rem',
		padding: '0.6rem 0.75rem',
		background: 'var(--overlay-black-15)',
		border: '2px solid var(--overlay-black-25)',
		borderRadius: '4px',
		cornerShape: 'notch',
	}),
	rowMain: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '0.15rem',
		minWidth: 0,
	}),
	meta: css({
		fontSize: '0.72rem',
		opacity: 0.7,
	}),
	count: css({
		fontSize: '0.75rem',
		fontWeight: 'bold',
		whiteSpace: 'nowrap',
		opacity: 0.85,
	}),
	empty: css({
		fontSize: '0.85rem',
		opacity: 0.8,
	}),
	ok: css({
		fontSize: '0.85rem',
		fontWeight: 'bold',
		color: 'var(--color-black)',
	}),
	bad: css({
		fontSize: '0.85rem',
		fontWeight: 'bold',
		color: 'var(--error-red)',
	}),
}
