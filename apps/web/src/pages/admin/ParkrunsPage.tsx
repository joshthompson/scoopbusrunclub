import {
	type Component,
	createSignal,
	createResource,
	For,
	Show,
	createMemo,
} from 'solid-js'
import { css } from '@style/css'
import { DirtBlock } from '@/components/ui/DirtBlock'
import { AdminButton } from '@/components/admin/AdminButton'
import { Modal } from '@/components/ui/Modal'
import {
	fetchAdminParkruns,
	fetchAdminGuests,
	addGuestResult,
	deleteGuestResult,
	type ParkrunEventItem,
	type Guest,
} from '@/utils/adminApi'

const TIME_RE = /^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})$/

export const ParkrunsPage: Component = () => {
	const [page, setPage] = createSignal(1)
	const [parkruns, { refetch }] = createResource(page, (p) =>
		fetchAdminParkruns(p),
	)
	const [editingParkrun, setEditingParkrun] =
		createSignal<ParkrunEventItem | null>(null)

	const handleCloseModal = () => {
		setEditingParkrun(null)
		refetch()
	}

	return (
		<div class={styles.container}>
			<DirtBlock>
				<h2 class={styles.sectionTitle}>Parkruns</h2>
				<Show
					when={!parkruns.loading}
					fallback={<p class={styles.loading}>Loading...</p>}
				>
					<table class={styles.table}>
						<thead>
							<tr>
								<th>Date</th>
								<th>Event</th>
								<th>#</th>
								<th>Members</th>
								<th>Guests</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
							<For each={parkruns()?.items ?? []}>
								{(item) => (
									<tr>
										<td>{item.date}</td>
										<td>{item.eventName}</td>
										<td>{item.eventNumber}</td>
										<td>{item.resultCount}</td>
										<td>{item.guestResults.length}</td>
										<td>
											<AdminButton
												size="small"
												onClick={() => setEditingParkrun(item)}
											>
												Edit
											</AdminButton>
										</td>
									</tr>
								)}
							</For>
						</tbody>
					</table>

					<div class={styles.pagination}>
						<AdminButton
							size="small"
							variant="secondary"
							disabled={page() <= 1}
							onClick={() => setPage((p) => Math.max(1, p - 1))}
						>
							← Previous
						</AdminButton>
						<span class={styles.pageInfo}>
							Page {parkruns()?.page ?? 1} of {parkruns()?.totalPages ?? 1} (
							{parkruns()?.total ?? 0} total)
						</span>
						<AdminButton
							size="small"
							variant="secondary"
							disabled={page() >= (parkruns()?.totalPages ?? 1)}
							onClick={() => setPage((p) => p + 1)}
						>
							Next →
						</AdminButton>
					</div>
				</Show>
			</DirtBlock>

			<Show when={editingParkrun()}>
				{(parkrun) => (
					<ParkrunModal parkrun={parkrun()} onClose={handleCloseModal} />
				)}
			</Show>
		</div>
	)
}

function ParkrunModal(props: {
	parkrun: ParkrunEventItem
	onClose: () => void
}) {
	const [guests] = createResource(fetchAdminGuests)
	const [guestResults, setGuestResults] = createSignal(
		props.parkrun.guestResults.map((gr) => ({
			...gr,
			_dirty: false,
		})),
	)
	const [saving, setSaving] = createSignal(false)

	// Form for adding a new guest result
	const [selectedGuestId, setSelectedGuestId] = createSignal('')
	const [newPosition, setNewPosition] = createSignal('')
	const [newTime, setNewTime] = createSignal('')

	const usedGuestIds = createMemo(
		() => new Set(guestResults().map((gr) => gr.guestId)),
	)

	const availableGuests = createMemo(() => {
		const used = usedGuestIds()
		return (guests() ?? []).filter((g) => !used.has(g._id))
	})

	const handleAddGuest = async () => {
		const guestId = selectedGuestId()
		const position = Number(newPosition())
		const time = newTime()

		if (!guestId || !position || !time || !TIME_RE.test(time)) return

		setSaving(true)
		const result = await addGuestResult({
			guestId,
			event: props.parkrun.event,
			eventNumber: props.parkrun.eventNumber,
			position,
			time,
			date: props.parkrun.date,
		})
		setSaving(false)

		if (result.ok) {
			const guest = (guests() ?? []).find((g) => g._id === guestId)
			const updatedResults = [
				...guestResults(),
				{
					guestId,
					guestName: guest?.name ?? 'Unknown',
					guestExtra: guest?.extra,
					event: props.parkrun.event,
					eventNumber: props.parkrun.eventNumber,
					position,
					time,
					date: props.parkrun.date,
					_dirty: false,
				},
			]
			setGuestResults(updatedResults)
			const nowUsed = new Set(updatedResults.map((gr) => gr.guestId))
			const nextGuest = (guests() ?? []).find((g) => !nowUsed.has(g._id))
			setSelectedGuestId(nextGuest?._id ?? '')
			setNewPosition('')
			setNewTime('')
		}
	}

	const handleRemoveGuestResult = async (index: number) => {
		const gr = guestResults()[index]
		if (!confirm(`Remove ${gr.guestName}'s result from this parkrun?`)) return

		// Find the result ID - we need to look it up from original data
		const original = props.parkrun.guestResults.find(
			(r) => r.guestId === gr.guestId,
		)

		if (original && '_id' in original) {
			await deleteGuestResult((original as { _id: string })._id)
		}

		setGuestResults((prev) => prev.filter((_, i) => i !== index))
	}

	return (
		<Modal
			title={`${props.parkrun.eventName} #${props.parkrun.eventNumber}`}
			onClose={props.onClose}
			maxWidth="580px"
		>
			<div class={styles.modalContent}>
				<p class={styles.modalSubtitle}>
					{props.parkrun.date} · {props.parkrun.resultCount} member results
				</p>

				<h3 class={styles.modalSectionTitle}>Guest Results</h3>

				<Show
					when={guestResults().length > 0}
					fallback={
						<p class={styles.emptyState}>
							No guest results for this parkrun yet.
						</p>
					}
				>
					<table class={styles.guestTable}>
						<thead>
							<tr>
								<th>Guest</th>
								<th>Position</th>
								<th>Time</th>
								<th />
							</tr>
						</thead>
						<tbody>
							<For each={guestResults()}>
								{(gr, index) => (
									<tr>
										<td>
											{gr.guestName}
											<Show when={gr.guestExtra}>
												<span class={styles.guestExtra}>
													{' '}
													({gr.guestExtra})
												</span>
											</Show>
										</td>
										<td>{gr.position}</td>
										<td>{gr.time}</td>
										<td>
											<AdminButton
												size="small"
												variant="danger"
												onClick={() => handleRemoveGuestResult(index())}
											>
												×
											</AdminButton>
										</td>
									</tr>
								)}
							</For>
						</tbody>
					</table>
				</Show>

				<Show
					when={(guests() ?? []).length === 0 && !guests.loading}
				>
					<p class={styles.emptyState}>
						No guests created yet. Add guests in the Runners section first.
					</p>
				</Show>
				<Show when={(guests() ?? []).length > 0 || guests.loading}>
					<div class={styles.addGuestForm}>
						<select
							class={styles.inlineSelect}
							value={selectedGuestId()}
							disabled={availableGuests().length === 0}
							onChange={(e) => setSelectedGuestId(e.currentTarget.value)}
						>
							<option value="">
								{availableGuests().length === 0
									? 'All guests added'
									: 'Guest...'}
							</option>
							<For each={availableGuests()}>
								{(g) => (
									<option value={g._id}>
										{g.name}
										{g.extra ? ` (${g.extra})` : ''}
									</option>
								)}
							</For>
						</select>
						<input
							class={styles.inlineInput}
							type="number"
							value={newPosition()}
							disabled={availableGuests().length === 0}
							onInput={(e) => setNewPosition(e.currentTarget.value)}
							placeholder="Pos"
						/>
						<input
							class={styles.inlineInput}
							type="text"
							value={newTime()}
							disabled={availableGuests().length === 0}
							onInput={(e) => setNewTime(e.currentTarget.value)}
							placeholder="mm:ss"
						/>
						<button
							type="button"
							class={styles.addBtn}
							onClick={handleAddGuest}
							disabled={
								saving() ||
								availableGuests().length === 0 ||
								!selectedGuestId() ||
								!newPosition() ||
								!newTime() ||
								!TIME_RE.test(newTime())
							}
						>
							{saving() ? '...' : '+ Add'}
						</button>
					</div>
				</Show>
			</div>
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
		marginBottom: '1rem',
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
	}),
	pagination: css({
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		gap: '1rem',
		marginTop: '1rem',
	}),
	pageInfo: css({
		fontSize: '0.85rem',
		fontWeight: 'bold',
	}),
	loading: css({
		textAlign: 'center',
		padding: '1rem',
	}),
	emptyState: css({
		textAlign: 'center',
		padding: '0.5rem',
		opacity: 0.6,
		fontSize: '0.85rem',
	}),
	modalContent: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '0.75rem',
	}),
	modalSubtitle: css({
		fontSize: '0.85rem',
		opacity: 0.7,
		m: 0,
	}),
	modalSectionTitle: css({
		fontSize: '1rem',
		fontWeight: 'bold',
		textTransform: 'uppercase',
		m: 0,
		marginTop: '0.5rem',
	}),
	guestTable: css({
		width: '100%',
		borderCollapse: 'collapse',
		'& th, & td': {
			padding: '0.375rem 0.5rem',
			textAlign: 'left',
			borderBottom: '1px solid var(--overlay-black-12)',
		},
		'& th': {
			fontWeight: 'bold',
			fontSize: '0.7rem',
			textTransform: 'uppercase',
		},
	}),
	guestExtra: css({
		fontSize: '0.8rem',
		opacity: 0.6,
	}),
	addGuestForm: css({
		display: 'flex',
		flexDirection: 'row',
		gap: '0.375rem',
		alignItems: 'center',
		marginTop: '0.25rem',
	}),
	inlineSelect: css({
		flex: '1 1 auto',
		minWidth: 0,
		height: '28px',
		padding: '0 0.375rem',
		background: 'var(--overlay-black-15)',
		color: 'var(--color-white)',
		border: '1px solid var(--overlay-white-20)',
		borderRadius: '3px',
		fontSize: '0.75rem',
		'& option': { background: '#222', color: 'var(--color-white)' },
	}),
	inlineInput: css({
		width: '60px',
		flexShrink: 0,
		height: '28px',
		padding: '0 0.375rem',
		background: 'var(--overlay-black-15)',
		color: 'var(--color-white)',
		border: '1px solid var(--overlay-white-20)',
		borderRadius: '3px',
		fontSize: '0.75rem',
	}),
	addBtn: css({
		flexShrink: 0,
		height: '28px',
		padding: '0 0.6rem',
		background: 'var(--overlay-black-15)',
		color: 'var(--color-white)',
		border: '2px double var(--color-black)',
		borderRadius: '3px',
		fontSize: '0.7rem',
		fontWeight: 'bold',
		textTransform: 'uppercase',
		cursor: 'pointer',
		_hover: { background: 'var(--overlay-black-25)' },
		_disabled: { opacity: 0.4, cursor: 'default', pointerEvents: 'none' },
	}),
}
