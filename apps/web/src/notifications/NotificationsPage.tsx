import { BackSignButton } from '@/components/BackSignButton'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/Checkbox'
import { DirtBlock } from '@/components/ui/DirtBlock'
import { css } from '@style/css'
import { Match, Show, Switch, createResource, createSignal } from 'solid-js'
import { disable, enable, isEnabled, pushSupport, sendTest } from './push'

/**
 * Turning notifications on, and checking they work.
 *
 * The whole page is one question and one button, which is the point — nobody
 * came here to configure anything. The only complication is iOS, where push
 * only reaches a web app that's been added to the Home Screen, so a visitor in
 * a Safari tab is shown how to install it rather than a toggle that would ask
 * for a permission the browser won't grant.
 */
export function NotificationsPage() {
	const support = pushSupport()

	// What the server currently believes, which is what the checkbox starts as.
	const [saved, { refetch }] = createResource(async () =>
		support.kind === 'supported' ? await isEnabled() : false,
	)

	const [wanted, setWanted] = createSignal<boolean | null>(null)
	const [busy, setBusy] = createSignal(false)
	const [error, setError] = createSignal('')
	const [message, setMessage] = createSignal('')

	/** The checkbox: what's been ticked, or what's saved until it's touched. */
	const checked = () => wanted() ?? saved() ?? false
	const dirty = () => wanted() !== null && wanted() !== saved()

	async function save() {
		setBusy(true)
		setError('')
		setMessage('')
		try {
			if (checked()) await enable()
			else await disable()
			setWanted(null)
			await refetch()
			setMessage(checked() ? 'Notifications are on!' : 'Notifications are off')
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Something went wrong')
			setWanted(null)
		} finally {
			setBusy(false)
		}
	}

	async function test() {
		setBusy(true)
		setError('')
		setMessage('')
		try {
			await sendTest()
			setMessage('Sent! It should arrive in a moment.')
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Could not send')
		} finally {
			setBusy(false)
		}
	}

	return (
		<div class={styles.container}>
			<DirtBlock title="Notifications">
				<div class={styles.body}>
					<Switch>
						{/* iOS in a browser tab — installable, but not yet installed */}
						<Match when={support.kind === 'needsInstall'}>
							<p>
								On an iPhone or iPad, notifications only work once Scoop Bus Run
								Club has been added to your Home Screen.
							</p>
							<Show
								when={
									support.kind === 'needsInstall' &&
									support.browser === 'safari'
								}
								fallback={
									<ol class={styles.steps}>
										<li>Open scoopbus.run in Safari</li>
										<li>
											Tap the <strong>Share</strong> button
										</li>
										<li>
											Choose <strong>Add to Home Screen</strong>
										</li>
										<li>
											Open Scoop Bus from your Home Screen and come back here
										</li>
									</ol>
								}
							>
								<ol class={styles.steps}>
									<li>
										Tap the <strong>Share</strong> button at the bottom of
										Safari
									</li>
									<li>
										Choose <strong>Add to Home Screen</strong>
									</li>
									<li>
										Open Scoop Bus from your Home Screen and come back to this
										page
									</li>
								</ol>
							</Show>
						</Match>

						{/* No push at all */}
						<Match when={support.kind === 'unsupported'}>
							<p>
								This browser can't show notifications. Try Chrome, Firefox or
								Edge on a computer or Android phone, or add Scoop Bus Run Club
								to your Home Screen on an iPhone.
							</p>
						</Match>

						{/* The ordinary case */}
						<Match when={support.kind === 'supported'}>
							<p>
								Would you like Scoop Bus Run Club to be able to send
								notifications to your device?
							</p>

							<Checkbox
								label="Yes please!"
								checked={checked()}
								disabled={busy() || saved.loading}
								onChange={(event) => setWanted(event.currentTarget.checked)}
							/>

							<Button onClick={save}>
								{busy() ? 'Saving…' : 'Save changes'}
							</Button>

							<Show when={dirty() && !busy()}>
								<p class={styles.hint}>
									{checked()
										? 'Your browser will ask permission when you save.'
										: 'You can turn these back on any time.'}
								</p>
							</Show>

							<Show when={message()}>
								<p class={styles.message}>{message()}</p>
							</Show>
							<Show when={error()}>
								<p class={styles.error}>{error()}</p>
							</Show>

							{/* Only worth offering once there's somewhere to send it */}
							<Show when={saved()}>
								<hr class={styles.divider} />
								<Button onClick={test}>
									{busy() ? 'Sending…' : 'Test Notification'}
								</Button>
							</Show>
						</Match>
					</Switch>
				</div>
			</DirtBlock>
			<BackSignButton class={styles.backSign} />
		</div>
	)
}

const styles = {
	container: css({
		width: 'calc(100% - 2rem)',
		maxWidth: '700px',
		margin: '1rem auto',
		display: 'flex',
		flexDirection: 'column',
		gap: '2rem',
	}),
	body: css({
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		gap: '1rem',
		textAlign: 'center',
		// Centred children size to their content, which lets a long line run off
		// the side of the block rather than wrapping inside it.
		'& > *': { maxWidth: '100%' },
	}),
	steps: css({
		textAlign: 'left',
		display: 'flex',
		flexDirection: 'column',
		gap: '0.5rem',
		paddingLeft: '1.25rem',
		listStyle: 'decimal',
	}),
	hint: css({
		fontSize: '0.8rem',
		opacity: 0.8,
	}),
	message: css({
		fontWeight: 'bold',
		color: 'var(--green-brand)',
	}),
	error: css({
		fontWeight: 'bold',
		color: 'var(--red-600)',
	}),
	divider: css({
		width: '100%',
		border: 'none',
		borderTop: '3px solid var(--overlay-black-25)',
		margin: '0.5rem 0',
	}),
	backSign: css({
		margin: '0 auto',
		display: 'block',
	}),
}
