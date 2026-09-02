import qrIconAsset from '@/assets/misc/qr.png'
import { AdminAvatar } from '@/components/admin/AdminAvatar'
import { AdminButton } from '@/components/admin/AdminButton'
import { AdminInput } from '@/components/admin/AdminInput'
import { AdminSelect } from '@/components/admin/AdminSelect'
import { GuestAvatar } from '@/components/admin/GuestAvatar'
import { Checkbox } from '@/components/ui/Checkbox'
import { Modal } from '@/components/ui/Modal'
import { type RunnerName, runners } from '@/data/runners'
import type { Guest, Race, RaceAttendee, RaceGuest } from '@/utils/adminApi'
import type { CharacterSpriteProps } from '@/utils/createRunnerFrames'
import {
	PARKRUN_EVENT_URL_EXAMPLE,
	PARKRUN_TRIP_TYPE,
	isParkrunEventUrl,
} from '@shared/calendar/parkrun-trips'
import { css } from '@style/css'
import { type Component, For, Show, createMemo, createSignal } from 'solid-js'
import { EVENT_TYPES } from './EventsPage'

/** Validate time string: accepts h:mm:ss, hh:mm:ss, m:ss, mm:ss */
const TIME_RE = /^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})$/

function isValidTime(v: string): boolean {
	return v === '' || TIME_RE.test(v)
}

/** The per-row result inputs, held as strings so typing never loses focus */
interface FieldStrings {
	position: string
	time: string
	distance: string
	laps: string
}

const emptyFields = (): FieldStrings => ({
	position: '',
	time: '',
	distance: '',
	laps: '',
})

const fieldsFrom = (r: {
	position?: number
	time?: string
	distance?: number
	laps?: number
}): FieldStrings => ({
	position: r.position != null ? String(r.position) : '',
	time: r.time ?? '',
	distance: r.distance != null ? String(r.distance) : '',
	laps: r.laps != null ? String(r.laps) : '',
})

/** Parse a row's inputs onto `entry`, returns false if any value is invalid */
function applyFields(
	entry: { position?: number; time?: string; distance?: number; laps?: number },
	s: FieldStrings,
): boolean {
	// Position: integer
	if (s.position !== '') {
		const n = Number(s.position)
		if (!Number.isFinite(n) || n < 0) return false
		entry.position = Math.round(n)
	}

	// Time: string in hh:mm:ss / mm:ss format
	if (s.time !== '') {
		if (!isValidTime(s.time)) return false
		entry.time = s.time
	}

	// Distance: decimal number
	if (s.distance !== '') {
		const n = Number(s.distance)
		if (!Number.isFinite(n) || n < 0) return false
		entry.distance = n
	}

	// Laps: integer
	if (s.laps !== '') {
		const n = Number(s.laps)
		if (!Number.isFinite(n) || n < 0) return false
		entry.laps = Math.round(n)
	}

	return true
}

interface EventModalProps {
	race: Race | null
	/** When true, treat as a new event even if race data is provided (for duplication) */
	isNew?: boolean
	/** All guest runners available to add to the event */
	guests: Guest[]
	onSave: (data: {
		date: string
		name: string
		website?: string
		type?: string
		attendees: RaceAttendee[]
		guests: RaceGuest[]
		majorEvent?: boolean
		public: boolean
	}) => void
	onClose: () => void
}

const allRunnerKeys = Object.keys(runners) as RunnerName[]

/** Position / time / distance / laps inputs for one row */
const ResultFields: Component<{
	values: FieldStrings
	onChange: (field: keyof FieldStrings, value: string) => void
}> = (props) => (
	<div class={styles.attendeeFields}>
		<AdminInput
			type="number"
			placeholder="Pos"
			value={props.values.position}
			onInput={(e) => props.onChange('position', e.currentTarget.value)}
			size="small"
			width="60px"
		/>
		<AdminInput
			type="text"
			placeholder="hh:mm:ss"
			value={props.values.time}
			onInput={(e) => props.onChange('time', e.currentTarget.value)}
			size="small"
			width="80px"
		/>
		<AdminInput
			type="text"
			placeholder="Distance"
			value={props.values.distance}
			onInput={(e) => props.onChange('distance', e.currentTarget.value)}
			size="small"
			width="70px"
		/>
		<AdminInput
			type="number"
			placeholder="Laps"
			value={props.values.laps}
			onInput={(e) => props.onChange('laps', e.currentTarget.value)}
			size="small"
			width="60px"
		/>
	</div>
)

export const EventModal: Component<EventModalProps> = (props) => {
	const race = props.race

	const [date, setDate] = createSignal(race?.date ?? '')
	const [name, setName] = createSignal(race?.name ?? '')
	const [website, setWebsite] = createSignal(race?.website ?? '')
	const [type, setType] = createSignal(race?.type ?? '')
	const [isMajorEvent, setIsMajorEvent] = createSignal(
		race?.majorEvent ?? false,
	)
	const [isPublic, setIsPublic] = createSignal(race?.public ?? true)
	const [attendees, setAttendees] = createSignal<RaceAttendee[]>(
		race?.attendees ?? [],
	)
	const [raceGuests, setRaceGuests] = createSignal<RaceGuest[]>(
		race?.guests ?? [],
	)
	const [saving, setSaving] = createSignal(false)

	// Local string state for each attendee's numeric/text inputs to avoid losing focus
	const [fieldStrings, setFieldStrings] = createSignal<FieldStrings[]>(
		(race?.attendees ?? []).map(fieldsFrom),
	)
	const [guestFieldStrings, setGuestFieldStrings] = createSignal<
		FieldStrings[]
	>((race?.guests ?? []).map(fieldsFrom))

	const availableRunners = createMemo(() => {
		const used = new Set(attendees().map((a) => a.runnerId))
		return allRunnerKeys.filter((k) => !used.has(k))
	})

	const availableGuests = createMemo(() => {
		const used = new Set(raceGuests().map((g) => g.guestId))
		return props.guests.filter((g) => !used.has(g._id))
	})

	const addAttendee = (runnerId: string) => {
		if (!runnerId) return
		setAttendees((prev) => [...prev, { runnerId }])
		setFieldStrings((prev) => [...prev, emptyFields()])
	}

	const removeAttendee = (index: number) => {
		const att = attendees()[index]
		const displayName = runnerDisplayName(att?.runnerId ?? '')
		if (!confirm(`Remove ${displayName} from this event?`)) return
		setAttendees((prev) => prev.filter((_, i) => i !== index))
		setFieldStrings((prev) => prev.filter((_, i) => i !== index))
	}

	const addGuest = (guestId: string) => {
		if (!guestId) return
		setRaceGuests((prev) => [...prev, { guestId }])
		setGuestFieldStrings((prev) => [...prev, emptyFields()])
	}

	const removeGuest = (index: number) => {
		const g = raceGuests()[index]
		if (
			!confirm(`Remove ${guestDisplayName(g?.guestId ?? '')} from this event?`)
		)
			return
		setRaceGuests((prev) => prev.filter((_, i) => i !== index))
		setGuestFieldStrings((prev) => prev.filter((_, i) => i !== index))
	}

	const updateFieldString = (
		index: number,
		field: keyof FieldStrings,
		value: string,
	) => {
		setFieldStrings((prev) =>
			prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
		)
	}

	const updateGuestFieldString = (
		index: number,
		field: keyof FieldStrings,
		value: string,
	) => {
		setGuestFieldStrings((prev) =>
			prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
		)
	}

	const runnerDisplayName = (runnerId: string): string => {
		const r = runners[runnerId as RunnerName]
		if (r) return r[0]().name
		return runnerId
	}

	const guestRecord = (guestId: string): Guest | undefined =>
		props.guests.find((g) => g._id === guestId)

	const guestDisplayName = (guestId: string): string =>
		guestRecord(guestId)?.name ?? 'Unknown guest'

	/** Build attendees array from local string state, returns null if validation fails */
	const buildAttendees = (): RaceAttendee[] | null => {
		const strings = fieldStrings()
		const atts = attendees()
		const result: RaceAttendee[] = []

		for (let i = 0; i < atts.length; i++) {
			const entry: RaceAttendee = { runnerId: atts[i].runnerId }

			// Preserve scanned flag
			if (atts[i].scanned) entry.scanned = true

			if (!applyFields(entry, strings[i] ?? emptyFields())) return null

			result.push(entry)
		}
		return result
	}

	/** Build guests array from local string state, returns null if validation fails */
	const buildGuests = (): RaceGuest[] | null => {
		const strings = guestFieldStrings()
		const gs = raceGuests()
		const result: RaceGuest[] = []

		for (let i = 0; i < gs.length; i++) {
			const entry: RaceGuest = { guestId: gs[i].guestId }
			if (!applyFields(entry, strings[i] ?? emptyFields())) return null
			result.push(entry)
		}
		return result
	}

	/**
	 * A parkrun trip is identified by the event it's going to, so its website has
	 * to be that parkrun's event page — there's no trip without one.
	 */
	const isTrip = () => type() === PARKRUN_TRIP_TYPE
	const tripUrlOk = () => !isTrip() || isParkrunEventUrl(website())

	const isFormValid = createMemo(() => {
		if (!date() || !name()) return false
		if (!tripUrlOk()) return false
		return buildAttendees() !== null && buildGuests() !== null
	})

	const handleSubmit = async (e: Event) => {
		e.preventDefault()
		const builtAttendees = buildAttendees()
		const builtGuests = buildGuests()
		if (!date() || !name() || !builtAttendees || !builtGuests) return
		if (!tripUrlOk()) return
		setSaving(true)
		try {
			props.onSave({
				date: date(),
				name: name(),
				website: website() || undefined,
				type: type() || undefined,
				attendees: builtAttendees,
				guests: builtGuests,
				majorEvent: isMajorEvent() || undefined,
				public: isPublic(),
			})
		} finally {
			setSaving(false)
		}
	}

	return (
		<Modal
			title={race && !props.isNew ? 'Edit Event' : 'New Event'}
			onClose={props.onClose}
			maxWidth="580px"
		>
			<form onSubmit={handleSubmit} class={styles.form}>
				<div class={styles.row2}>
					<AdminInput
						label="Name"
						type="text"
						value={name()}
						onInput={(e) => setName(e.currentTarget.value)}
						placeholder="e.g. Rome Marathon"
						required
					/>
					<AdminInput
						label="Date"
						type="date"
						value={date()}
						onInput={(e) => setDate(e.currentTarget.value)}
						required
					/>
				</div>

				<div class={styles.row2}>
					<AdminInput
						label={isTrip() ? 'parkrun event page' : 'Website'}
						type="url"
						value={website()}
						onInput={(e) => setWebsite(e.currentTarget.value)}
						placeholder={isTrip() ? PARKRUN_EVENT_URL_EXAMPLE : 'https://...'}
						required={isTrip()}
					/>
					<AdminSelect
						label="Type"
						value={type()}
						onChange={(e) => setType(e.currentTarget.value)}
					>
						<option value="">— None —</option>
						<For each={EVENT_TYPES}>
							{(group) => (
								<optgroup label={group.groupName}>
									<For each={group.types}>
										{(type) => <option value={type}>{type}</option>}
									</For>
								</optgroup>
							)}
						</For>
					</AdminSelect>
				</div>

				<Show when={!tripUrlOk()}>
					<span class={styles.error}>
						A parkrun trip needs the parkrun's event page as its website, e.g.{' '}
						{PARKRUN_EVENT_URL_EXAMPLE} or https://parkrun.org.uk/cheltenham/
					</span>
				</Show>

				<Checkbox
					label="Public (visible on the site)"
					checked={isPublic()}
					onChange={(e) => setIsPublic(e.currentTarget.checked)}
				/>

				<Checkbox
					label="Race Calendar (tick this for major events)"
					checked={isMajorEvent()}
					onChange={(e) => setIsMajorEvent(e.currentTarget.checked)}
				/>

				{/* Attendees */}
				<div class={styles.section}>
					<div class={styles.sectionHeader}>
						<span>Attendees ({attendees().length})</span>
						<Show when={availableRunners().length > 0}>
							<AdminSelect
								onChange={(e) => {
									addAttendee(e.currentTarget.value)
									e.currentTarget.value = ''
								}}
							>
								<option value="">+ Add runner…</option>
								<For each={availableRunners()}>
									{(key) => (
										<option value={key}>{runnerDisplayName(key)}</option>
									)}
								</For>
							</AdminSelect>
						</Show>
					</div>

					<Show when={attendees().length > 0}>
						<div class={styles.attendeeList}>
							<For each={attendees()}>
								{(att, idx) => (
									<div class={styles.attendeeRow}>
										<AdminAvatar user={att.runnerId} size="medium" />
										<span class={styles.attendeeName}>
											{runnerDisplayName(att.runnerId)}
											<Show when={att.scanned}>
												<span
													class={styles.scannedIcon}
													title="Scanned via barcode"
												>
													<img
														src={qrIconAsset}
														alt="Scanned via barcode"
														width={12}
														height={12}
													/>
												</span>
											</Show>
										</span>
										<ResultFields
											values={fieldStrings()[idx()] ?? emptyFields()}
											onChange={(field, value) =>
												updateFieldString(idx(), field, value)
											}
										/>
										<button
											type="button"
											class={styles.removeBtn}
											onClick={() => removeAttendee(idx())}
										>
											✕
										</button>
									</div>
								)}
							</For>
						</div>
					</Show>
				</div>

				{/* Guests */}
				<div class={styles.section}>
					<div class={styles.sectionHeader}>
						<span>Guests ({raceGuests().length})</span>
						<Show when={availableGuests().length > 0}>
							<AdminSelect
								onChange={(e) => {
									addGuest(e.currentTarget.value)
									e.currentTarget.value = ''
								}}
							>
								<option value="">+ Add guest…</option>
								<For each={availableGuests()}>
									{(guest) => (
										<option value={guest._id}>
											{guest.name}
											{guest.extra ? ` (${guest.extra})` : ''}
										</option>
									)}
								</For>
							</AdminSelect>
						</Show>
					</div>

					<Show
						when={raceGuests().length > 0}
						fallback={
							<Show when={props.guests.length === 0}>
								<span class={styles.hint}>
									No guests exist yet — add them on the Runners page.
								</span>
							</Show>
						}
					>
						<div class={styles.attendeeList}>
							<For each={raceGuests()}>
								{(guest, idx) => (
									<div class={styles.attendeeRow}>
										<GuestAvatar
											name={guestDisplayName(guest.guestId)}
											avatar={
												guestRecord(guest.guestId)?.avatar as
													| CharacterSpriteProps
													| undefined
											}
											size="medium"
										/>
										<span class={styles.attendeeName}>
											{guestDisplayName(guest.guestId)}
										</span>
										<ResultFields
											values={guestFieldStrings()[idx()] ?? emptyFields()}
											onChange={(field, value) =>
												updateGuestFieldString(idx(), field, value)
											}
										/>
										<button
											type="button"
											class={styles.removeBtn}
											onClick={() => removeGuest(idx())}
										>
											✕
										</button>
									</div>
								)}
							</For>
						</div>
					</Show>
				</div>

				<div class={styles.actions}>
					<AdminButton onClick={props.onClose} variant="secondary">
						Cancel
					</AdminButton>
					<AdminButton type="submit" disabled={saving() || !isFormValid()}>
						{saving() ? 'Saving…' : race && !props.isNew ? 'Update' : 'Create'}
					</AdminButton>
				</div>
			</form>
		</Modal>
	)
}

const styles = {
	form: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '0.875rem',
		textAlign: 'left',
	}),
	row2: css({
		display: 'flex',
		gap: '0.75rem',
		flexWrap: 'wrap',
		maxWidth: '100%',
		overflow: 'hidden',
		'& > *': { flex: '1 1 200px' },
	}),
	section: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '0.5rem',
	}),
	sectionHeader: css({
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		color: 'var(--color-white)',
		fontSize: '0.8rem',
		fontWeight: 'bold',
		textTransform: 'uppercase',
		letterSpacing: '0.05em',
	}),
	hint: css({
		color: 'var(--overlay-white-70)',
		fontSize: '0.75rem',
	}),
	error: css({
		color: 'var(--pink-rose)',
		fontSize: '0.75rem',
		fontWeight: 'bold',
	}),
	attendeeList: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '0.375rem',
	}),
	attendeeRow: css({
		display: 'flex',
		alignItems: 'center',
		gap: '4px',
		background: 'var(--overlay-black-15)',
		borderRadius: '4px',
		padding: '0.25rem 28px 0.25rem 0.5rem',
		position: 'relative',
		flexWrap: 'wrap',
	}),
	attendeeName: css({
		color: 'var(--color-white)',
		fontSize: '0.8rem',
		fontWeight: 'bold',
		minWidth: '80px',
		flexShrink: 0,
		display: 'flex',
		alignItems: 'center',
		gap: '0.25rem',
	}),
	attendeeFields: css({
		display: 'flex',
		alignItems: 'center',
		gap: '0.375rem',
		flexWrap: 'wrap',
		flex: '1 1 auto',
	}),
	scannedIcon: css({
		fontSize: '0.7rem',
		filter: 'invert(100%) sepia(100%) grayscale(100%) brightness(150%)',
		ml: '0.25rem',
	}),
	smallInput: css({
		width: '55px',
		padding: '0.25rem 0.375rem',
		border: '1px solid var(--overlay-white-20)',
		borderRadius: '3px',
		background: 'var(--overlay-black-30)',
		color: 'var(--color-white)',
		fontSize: '0.75rem',
		outline: 'none',
		textAlign: 'center',
	}),
	removeBtn: css({
		position: 'absolute',
		top: '4px',
		right: '4px',
		background: 'transparent',
		border: 'none',
		color: 'var(--color-black)',
		fontWeight: 'bold',
		cursor: 'pointer',
		fontSize: '1rem',
		padding: '0.125rem 0.375rem',
		borderRadius: '3px',
		flexShrink: 0,
		_hover: { background: 'var(--overlay-black-20)' },
	}),
	actions: css({
		display: 'flex',
		justifyContent: 'flex-end',
		gap: '0.75rem',
		marginTop: '0.5rem',
	}),
	cancelBtn: css({
		padding: '0.5rem 1.25rem',
		border: '2px solid var(--overlay-white-30)',
		background: 'transparent',
		color: 'var(--color-white)',
		cursor: 'pointer',
		fontWeight: 'bold',
		fontSize: '0.8rem',
		textTransform: 'uppercase',
		borderRadius: '4px',
		_hover: { background: 'var(--overlay-white-10)' },
	}),
	saveBtn: css({
		padding: '0.5rem 1.25rem',
		border: '3px double var(--color-white)',
		background: 'var(--overlay-white-15)',
		color: 'var(--color-white)',
		cursor: 'pointer',
		fontWeight: 'bold',
		fontSize: '0.8rem',
		textTransform: 'uppercase',
		borderRadius: '4px',
		_hover: { background: 'var(--overlay-white-25)' },
		_disabled: { opacity: 0.5, cursor: 'default' },
	}),
}
