import {
	type Component,
	createSignal,
	createResource,
	For,
	Show,
} from 'solid-js'
import { css } from '@style/css'
import { DirtBlock } from '@/components/ui/DirtBlock'
import { runners, type RunnerName } from '@/data/runners'
import { AdminAvatar } from '@/components/admin/AdminAvatar'
import { AdminButton } from '@/components/admin/AdminButton'
import { AdminInput } from '@/components/admin/AdminInput'
import { Modal } from '@/components/ui/Modal'
import {
	fetchAdminGuests,
	createGuest,
	updateGuest,
	deleteGuest,
	type Guest,
} from '@/utils/adminApi'

const allRunnerKeys = Object.keys(runners) as RunnerName[]

export const RunnersPage: Component = () => {
	const [guests, { refetch }] = createResource(fetchAdminGuests)
	const [modalOpen, setModalOpen] = createSignal(false)
	const [editingGuest, setEditingGuest] = createSignal<Guest | null>(null)

	const openNewGuest = () => {
		setEditingGuest(null)
		setModalOpen(true)
	}

	const openEditGuest = (guest: Guest) => {
		setEditingGuest(guest)
		setModalOpen(true)
	}

	const handleDeleteGuest = async (guest: Guest) => {
		if (
			!confirm(
				`Delete guest "${guest.name}"? This will also remove all their results.`,
			)
		)
			return
		await deleteGuest(guest._id)
		refetch()
	}

	const handleSaveGuest = async (data: {
		name: string
		extra?: string
		parkrunId?: string
	}) => {
		const existing = editingGuest()
		if (existing) {
			await updateGuest(existing._id, data)
		} else {
			await createGuest(data)
		}
		setModalOpen(false)
		refetch()
	}

	return (
		<div class={styles.container}>
			<DirtBlock>
				<h2 class={styles.sectionTitle}>Club Members</h2>
				<div class={styles.avatarGrid}>
					<For each={allRunnerKeys}>
						{(key) => {
							const data = runners[key][0]()
							return (
								<div class={styles.avatarCell} title={data.name}>
									<AdminAvatar user={key} size="huge" />
									<span class={styles.avatarName}>{data.name}</span>
								</div>
							)
						}}
					</For>
				</div>
			</DirtBlock>

			<DirtBlock>
				<div class={styles.sectionHeader}>
					<h2 class={styles.sectionTitle}>Guests</h2>
					<AdminButton onClick={openNewGuest}>+ Add Guest</AdminButton>
				</div>
				<Show
					when={!guests.loading}
					fallback={<p class={styles.loading}>Loading...</p>}
				>
					<Show
						when={(guests() ?? []).length > 0}
						fallback={<p class={styles.emptyState}>No guests yet.</p>}
					>
						<table class={styles.table}>
							<thead>
								<tr>
									<th>Name</th>
									<th>Extra</th>
									<th>Parkrun ID</th>
									<th>Actions</th>
								</tr>
							</thead>
							<tbody>
								<For each={guests()}>
									{(guest) => (
										<tr>
											<td>{guest.name}</td>
											<td>{guest.extra ?? '—'}</td>
											<td>
												<Show when={guest.parkrunId} fallback="—">
													<a
														href={`https://www.parkrun.org.uk/parkrunner/${guest.parkrunId}/all/`}
														target="_blank"
														rel="noreferrer"
													>
														{guest.parkrunId}
													</a>
												</Show>
											</td>
											<td class={styles.actions}>
												<AdminButton
													size="small"
													onClick={() => openEditGuest(guest)}
												>
													Edit
												</AdminButton>
												<AdminButton
													size="small"
													variant="danger"
													onClick={() => handleDeleteGuest(guest)}
												>
													Delete
												</AdminButton>
											</td>
										</tr>
									)}
								</For>
							</tbody>
						</table>
					</Show>
				</Show>
			</DirtBlock>

			<Show when={modalOpen()}>
				<GuestModal
					guest={editingGuest()}
					onSave={handleSaveGuest}
					onClose={() => setModalOpen(false)}
				/>
			</Show>
		</div>
	)
}

function GuestModal(props: {
	guest: Guest | null
	onSave: (data: { name: string; extra?: string; parkrunId?: string }) => void
	onClose: () => void
}) {
	const [name, setName] = createSignal(props.guest?.name ?? '')
	const [extra, setExtra] = createSignal(props.guest?.extra ?? '')
	const [parkrunId, setParkrunId] = createSignal(props.guest?.parkrunId ?? '')
	const [saving, setSaving] = createSignal(false)

	const handleSubmit = async (e: Event) => {
		e.preventDefault()
		if (!name()) return
		setSaving(true)
		try {
			props.onSave({
				name: name(),
				extra: extra() || undefined,
				parkrunId: parkrunId() || undefined,
			})
		} finally {
			setSaving(false)
		}
	}

	return (
		<Modal
			title={props.guest ? 'Edit Guest' : 'New Guest'}
			onClose={props.onClose}
			maxWidth="420px"
		>
			<form onSubmit={handleSubmit} class={styles.form}>
				<AdminInput
					label="Name"
					type="text"
					value={name()}
					onInput={(e) => setName(e.currentTarget.value)}
					placeholder='e.g. "Tony"'
					required
				/>
				<AdminInput
					label="Extra"
					type="text"
					value={extra()}
					onInput={(e) => setExtra(e.currentTarget.value)}
					placeholder={`e.g. "Rick's dad"`}
				/>
				<AdminInput
					label="Parkrun ID"
					type="text"
					value={parkrunId()}
					onInput={(e) => setParkrunId(e.currentTarget.value)}
					placeholder="e.g. 12345678"
				/>
				<div class={styles.formActions}>
					<AdminButton type="submit" disabled={!name() || saving()}>
						{saving() ? 'Saving...' : props.guest ? 'Update' : 'Create'}
					</AdminButton>
					<AdminButton
						type="button"
						variant="secondary"
						onClick={props.onClose}
					>
						Cancel
					</AdminButton>
				</div>
			</form>
		</Modal>
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
		marginBottom: '1rem',
	}),
	avatarGrid: css({
		display: 'flex',
		flexWrap: 'wrap',
		gap: '1rem',
		justifyContent: 'center',
		marginTop: '1rem',
	}),
	avatarCell: css({
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'center',
		gap: '0.25rem',
	}),
	avatarName: css({
		fontSize: '0.75rem',
		fontWeight: 'bold',
		textAlign: 'center',
	}),
	table: css({
		width: '100%',
		borderCollapse: 'collapse',
		'& th, & td': {
			padding: '0.5rem 0.75rem',
			textAlign: 'left',
			borderBottom: '1px solid var(--overlay-black-12)',
		},
		'& th': {
			fontWeight: 'bold',
			fontSize: '0.75rem',
			textTransform: 'uppercase',
			letterSpacing: '0.05em',
		},
		'& a': {
			color: 'inherit',
		},
	}),
	actions: css({
		display: 'flex',
		gap: '0.5rem',
	}),
	loading: css({
		textAlign: 'center',
		padding: '1rem',
	}),
	emptyState: css({
		textAlign: 'center',
		padding: '1rem',
		opacity: 0.6,
	}),
	form: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '0.75rem',
	}),
	formActions: css({
		display: 'flex',
		gap: '0.5rem',
		justifyContent: 'flex-end',
		marginTop: '0.5rem',
	}),
}
