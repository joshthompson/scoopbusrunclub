import { AdminButton } from '@/components/admin/AdminButton'
import { GuestAvatar } from '@/components/admin/GuestAvatar'
import { DirtBlock } from '@/components/ui/DirtBlock'
import {
	type AdminCustomRacer,
	type CustomRacerStatus,
	deleteCustomRacer,
	fetchAdminCustomRacers,
	setCustomRacerApproval,
	updateCustomRacer,
} from '@/utils/adminApi'
import type { CharacterSpriteProps } from '@/utils/createRunnerFrames'
import { MAX_RACER_NAME_LENGTH } from '@/utils/customRacers'
import { css } from '@style/css'
import {
	type Component,
	For,
	Show,
	createMemo,
	createResource,
	createSignal,
} from 'solid-js'

const STATUS_LABELS: Record<CustomRacerStatus, string> = {
	active: 'Live',
	pending: 'Pending',
	hidden: 'Shadow banned',
}

function formatDate(ms: number): string {
	return new Date(ms).toLocaleString('sv-SE', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
	})
}

export const CustomRacersPage: Component = () => {
	const [data, { refetch }] = createResource(fetchAdminCustomRacers)
	const [editingId, setEditingId] = createSignal<string | null>(null)
	const [draftName, setDraftName] = createSignal('')

	const racers = () => data()?.racers ?? []

	/**
	 * How many racers share each secret id and each IP, so a wall of submissions
	 * from one person is obvious at a glance rather than needing to be spotted.
	 */
	const counts = createMemo(() => {
		const bySecret = new Map<string, number>()
		const byIp = new Map<string, number>()
		for (const racer of racers()) {
			bySecret.set(racer.secretId, (bySecret.get(racer.secretId) ?? 0) + 1)
			if (racer.ip) byIp.set(racer.ip, (byIp.get(racer.ip) ?? 0) + 1)
		}
		return { bySecret, byIp }
	})

	const startEdit = (racer: AdminCustomRacer) => {
		setEditingId(racer._id)
		setDraftName(racer.name)
	}

	const saveName = async (racer: AdminCustomRacer) => {
		const name = draftName().trim()
		if (name && name !== racer.name) {
			await updateCustomRacer(racer._id, { name })
		}
		setEditingId(null)
		refetch()
	}

	const setStatus = async (
		racer: AdminCustomRacer,
		status: CustomRacerStatus,
	) => {
		await updateCustomRacer(racer._id, { status })
		refetch()
	}

	const remove = async (racer: AdminCustomRacer) => {
		if (
			!confirm(`Delete custom racer "${racer.name}"? This can't be undone.`)
		) {
			return
		}
		await deleteCustomRacer(racer._id)
		refetch()
	}

	const toggleApproval = async () => {
		const next = !(data()?.approvalRequired ?? false)
		if (
			next &&
			!confirm(
				'Require approval for all new custom racers? Existing racers are unaffected.',
			)
		) {
			return
		}
		await setCustomRacerApproval(next)
		refetch()
	}

	return (
		<div class={styles.container}>
			<DirtBlock>
				<div class={styles.sectionHeader}>
					<h2 class={styles.sectionTitle}>Custom Racers</h2>
					<AdminButton
						variant={data()?.approvalRequired ? 'primary' : 'secondary'}
						onClick={toggleApproval}
					>
						{data()?.approvalRequired
							? 'Approval required — turn off'
							: 'Require approval for new racers'}
					</AdminButton>
				</div>

				<p class={styles.note}>
					Renaming a racer clears its auto-block flag and leaves it live. Shadow
					banning hides it from everyone except whoever made it.
				</p>

				<Show
					when={!data.loading}
					fallback={<p class={styles.loading}>Loading...</p>}
				>
					<Show
						when={racers().length > 0}
						fallback={<p class={styles.emptyState}>No custom racers yet.</p>}
					>
						<table class={styles.table}>
							<thead>
								<tr>
									<th />
									<th>Name</th>
									<th>Status</th>
									<th>Created</th>
									<th>Expires</th>
									<th>Browser</th>
									<th>IP</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								<For each={racers()}>
									{(racer) => {
										const expired = () => racer.expiresAt < Date.now()
										return (
											<tr class={expired() ? styles.expiredRow : undefined}>
												<td>
													<GuestAvatar
														name={racer.name}
														avatar={
															racer.avatar as unknown as CharacterSpriteProps
														}
														size="large"
													/>
												</td>
												<td>
													<Show
														when={editingId() === racer._id}
														fallback={
															<span class={styles.nameCell}>
																{racer.name}
																<Show when={racer.flagReason}>
																	<span class={styles.flag}>
																		{racer.flagReason}
																	</span>
																</Show>
															</span>
														}
													>
														<input
															type="text"
															class={styles.nameInput}
															value={draftName()}
															maxLength={MAX_RACER_NAME_LENGTH}
															onInput={(e) =>
																setDraftName(e.currentTarget.value)
															}
															onKeyDown={(e) => {
																if (e.key === 'Enter') saveName(racer)
																if (e.key === 'Escape') setEditingId(null)
															}}
														/>
													</Show>
												</td>
												<td>
													<span
														class={styles.status}
														data-status={racer.status}
													>
														{STATUS_LABELS[racer.status]}
													</span>
													<Show when={expired()}>
														<span class={styles.expiredTag}>expired</span>
													</Show>
												</td>
												<td class={styles.mono}>
													{formatDate(racer.createdAt)}
												</td>
												<td class={styles.mono}>
													{formatDate(racer.expiresAt)}
												</td>
												<td class={styles.mono} title={racer.secretId}>
													{racer.secretId.slice(0, 8)}
													<Show
														when={
															(counts().bySecret.get(racer.secretId) ?? 0) > 1
														}
													>
														<span class={styles.count}>
															×{counts().bySecret.get(racer.secretId)}
														</span>
													</Show>
												</td>
												<td class={styles.mono}>
													{racer.ip || '—'}
													<Show when={(counts().byIp.get(racer.ip) ?? 0) > 1}>
														<span class={styles.count}>
															×{counts().byIp.get(racer.ip)}
														</span>
													</Show>
												</td>
												<td class={styles.actions}>
													<Show
														when={editingId() === racer._id}
														fallback={
															<AdminButton
																size="small"
																variant="secondary"
																onClick={() => startEdit(racer)}
															>
																Rename
															</AdminButton>
														}
													>
														<AdminButton
															size="small"
															onClick={() => saveName(racer)}
														>
															Save
														</AdminButton>
													</Show>
													<Show
														when={racer.status !== 'active'}
														fallback={
															<AdminButton
																size="small"
																variant="secondary"
																onClick={() => setStatus(racer, 'hidden')}
															>
																Ban
															</AdminButton>
														}
													>
														<AdminButton
															size="small"
															variant="secondary"
															onClick={() => setStatus(racer, 'active')}
														>
															Approve
														</AdminButton>
													</Show>
													<AdminButton
														size="small"
														variant="danger"
														onClick={() => remove(racer)}
													>
														Delete
													</AdminButton>
												</td>
											</tr>
										)
									}}
								</For>
							</tbody>
						</table>
					</Show>
				</Show>
			</DirtBlock>
		</div>
	)
}

const styles = {
	container: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '1.5rem',
	}),
	sectionTitle: css({
		fontSize: '1.25rem',
		fontWeight: 'bold',
		textTransform: 'uppercase',
		letterSpacing: '0.05em',
		m: 0,
	}),
	sectionHeader: css({
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: '1rem',
		marginBottom: '0.5rem',
		flexWrap: 'wrap',
	}),
	note: css({
		fontSize: '0.8rem',
		opacity: 0.75,
		marginBottom: '1rem',
	}),
	loading: css({ opacity: 0.7 }),
	emptyState: css({ opacity: 0.7 }),
	table: css({
		width: '100%',
		borderCollapse: 'collapse',
		fontSize: '0.85rem',
		'& th, & td': {
			padding: '0.5rem 0.75rem',
			textAlign: 'left',
			borderBottom: '1px solid var(--overlay-black-20)',
			verticalAlign: 'middle',
		},
		'& th': {
			fontSize: '0.7rem',
			textTransform: 'uppercase',
			letterSpacing: '0.05em',
			opacity: 0.8,
		},
	}),
	expiredRow: css({ opacity: 0.5 }),
	nameCell: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '0.15rem',
		fontWeight: 'bold',
	}),
	flag: css({
		fontSize: '0.65rem',
		fontWeight: 'normal',
		opacity: 0.8,
	}),
	nameInput: css({
		border: '2px solid var(--dirt-darker-brown)',
		borderRadius: '4px',
		cornerShape: 'notch',
		background: 'var(--overlay-black-30)',
		color: 'var(--color-white)',
		fontSize: '0.85rem',
		padding: '0.25rem 0.5rem',
		outline: 'none',
	}),
	status: css({
		fontWeight: 'bold',
		fontSize: '0.7rem',
		textTransform: 'uppercase',
		letterSpacing: '0.05em',
		'&[data-status=hidden]': { color: 'var(--error-red)' },
		'&[data-status=pending]': { color: '#ffe08a' },
	}),
	expiredTag: css({
		display: 'block',
		fontSize: '0.65rem',
		opacity: 0.7,
	}),
	mono: css({
		fontFamily: 'monospace',
		fontSize: '0.75rem',
		whiteSpace: 'nowrap',
	}),
	count: css({
		marginLeft: '0.35rem',
		fontWeight: 'bold',
		color: '#ffe08a',
	}),
	actions: css({
		display: 'flex',
		gap: '0.35rem',
		flexWrap: 'wrap',
	}),
}
