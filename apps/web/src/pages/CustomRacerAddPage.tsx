import { BackSignButton } from '@/components/BackSignButton'
import { CharacterEditor } from '@/components/admin/CharacterEditor'
import { RacerCard } from '@/components/customRacer/RacerCard'
import { RacerSpeedSlider } from '@/components/customRacer/RacerSpeedSlider'
import { DirtBlock } from '@/components/ui/DirtBlock'
import { FieldBlock } from '@/components/ui/FieldBlock'
import type { CharacterSpriteProps } from '@/utils/createRunnerFrames'
import { createRunnerFrames } from '@/utils/createRunnerFrames'
import {
	MAX_ACTIVE_RACERS,
	MAX_RACERS_PER_WEEK,
	MAX_RACER_NAME_LENGTH,
	RACER_LIFETIME_DAYS,
	createCustomRacer,
	fetchMyRacers,
	getRacerSecretId,
} from '@/utils/customRacers'
import { A } from '@solidjs/router'
import { css } from '@style/css'
import {
	For,
	Show,
	createMemo,
	createResource,
	createSignal,
	onMount,
} from 'solid-js'

const DEFAULT_AVATAR: CharacterSpriteProps = {
	topType: 'tshirt',
	bottomType: 'shorts',
	skin: 'light',
	topColor: '#2255cc',
	bottomColor: '#222222',
	showColor: '#2255cc',
	shoeColor: '#333333',
	head: {
		hair: 'short',
		hairColor: '#4a3222',
		topColorForNeck: false,
	},
}

export function CustomRacerAddPage() {
	const [name, setName] = createSignal('')
	const [avatar, setAvatar] = createSignal<CharacterSpriteProps>(DEFAULT_AVATAR)
	const [speed, setSpeed] = createSignal(0.5)
	const [saving, setSaving] = createSignal(false)
	const [error, setError] = createSignal<string | undefined>()
	const [justSaved, setJustSaved] = createSignal(false)

	// Claim the browser's secret id as soon as they land, so the racers they make
	// in this visit are all attributed to the same browser even if storage was empty
	const [secretId, setSecretId] = createSignal('')
	onMount(() => setSecretId(getRacerSecretId()))

	const [mine, { refetch }] = createResource(
		() => secretId() || undefined,
		fetchMyRacers,
	)

	const remaining = () => mine()?.remaining ?? MAX_RACERS_PER_WEEK
	const atLimit = () => remaining() <= 0
	const headerFull = () => mine()?.headerFull ?? false

	const faceUrl = createMemo(() => {
		try {
			return createRunnerFrames(avatar()).frames.face?.[0]
		} catch {
			return undefined
		}
	})

	const handleSubmit = async (e: Event) => {
		e.preventDefault()
		const trimmed = name().trim()
		if (!trimmed || saving()) return

		setSaving(true)
		setError(undefined)
		setJustSaved(false)
		const result = await createCustomRacer({
			name: trimmed,
			avatar: avatar(),
			speed: speed(),
		})
		setSaving(false)

		if (!result.ok) {
			setError(result.error)
			return
		}

		setJustSaved(true)
		setName('')
		refetch()
	}

	return (
		<div class={styles.container}>
			<DirtBlock title="Add Racer" signType="purple">
				<div class={styles.intro}>
					<p>
						Add a runner to the header. They will then appear in the scoop bus
						header for {RACER_LIFETIME_DAYS} days!
					</p>
				</div>

				<Show when={headerFull()}>
					<p class={styles.notice}>
						The header is full — {MAX_ACTIVE_RACERS} racers are out there right
						now. Everyone gets their full week, so there'll be room again as
						soon as one of them finishes.
					</p>
				</Show>

				<form onSubmit={handleSubmit} class={styles.form}>
					<label class={styles.nameLabel}>
						Name
						<input
							type="text"
							class={styles.nameInput}
							value={name()}
							maxLength={MAX_RACER_NAME_LENGTH}
							onInput={(e) => setName(e.currentTarget.value)}
						/>
						<span class={styles.counter}>
							{name().length}/{MAX_RACER_NAME_LENGTH}
						</span>
					</label>

					<CharacterEditor value={avatar()} onChange={setAvatar} />

					<RacerSpeedSlider
						value={speed()}
						faceUrl={faceUrl()}
						onChange={setSpeed}
					/>

					<Show when={error()}>
						<p class={styles.error}>{error()}</p>
					</Show>

					<Show when={justSaved() && !error()}>
						<p class={styles.success}>
							Your racer is on the loose — look for them in the header!
						</p>
					</Show>

					<div class={styles.actions}>
						<button
							type="submit"
							class={styles.submit}
							disabled={!name().trim() || saving() || atLimit() || headerFull()}
						>
							{saving() ? 'Adding…' : 'Add Racer'}
						</button>
						<span class={styles.allowance}>
							<Show
								when={!headerFull()}
								fallback={`Header full — ${MAX_ACTIVE_RACERS} racers running`}
							>
								<Show
									when={!atLimit()}
									fallback={`That's all ${MAX_RACERS_PER_WEEK} of your racers for this week`}
								>
									{remaining()} of {MAX_RACERS_PER_WEEK} left this week
								</Show>
							</Show>
						</span>
					</div>
				</form>
			</DirtBlock>

			<Show when={(mine()?.racers.length ?? 0) > 0}>
				<FieldBlock title="Your Racers">
					<div class={styles.grid}>
						<For each={mine()?.racers}>
							{(racer) => <RacerCard racer={racer} showStatus />}
						</For>
					</div>
				</FieldBlock>
			</Show>

			<A href="/custom-racer" class={styles.seeAll}>
				See everyone's racers
			</A>

			<BackSignButton class={styles.backSign} />
		</div>
	)
}

const styles = {
	container: css({
		width: 'calc(100% - 2rem)',
		maxWidth: '760px',
		margin: '1rem auto',
		display: 'flex',
		flexDirection: 'column',
		gap: '2rem',
	}),
	intro: css({
		textAlign: 'left',
		marginBottom: '1rem',
	}),
	form: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '1.25rem',
		textAlign: 'left',
	}),
	nameLabel: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '0.25rem',
		fontSize: '0.8rem',
		fontWeight: 'bold',
		textTransform: 'uppercase',
		letterSpacing: '0.05em',
		alignItems: 'flex-start',
	}),
	nameInput: css({
		width: '100%',
		maxWidth: '320px',
		border: '2px solid var(--dirt-darker-brown)',
		cornerShape: 'notch',
		borderRadius: '4px',
		background: 'var(--overlay-black-30)',
		color: 'var(--color-white)',
		fontSize: '1rem',
		padding: '0.5rem 0.75rem',
		outline: 'none',
		_focus: { background: 'var(--dirt-dark-brown)' },
	}),
	counter: css({
		fontSize: '0.7rem',
		opacity: 0.7,
	}),
	actions: css({
		display: 'flex',
		alignItems: 'center',
		gap: '1rem',
		flexWrap: 'wrap',
	}),
	submit: css({
		padding: '0.5rem 1.5rem',
		border: '3px double currentColor',
		background: 'transparent',
		color: 'inherit',
		cursor: 'pointer',
		fontWeight: 'bold',
		fontSize: '1rem',
		textTransform: 'uppercase',
		cornerShape: 'notch',
		borderRadius: '4px',
		_hover: { background: 'var(--overlay-white-10)' },
		_disabled: { opacity: 0.5, cursor: 'not-allowed' },
	}),
	allowance: css({
		fontSize: '0.75rem',
		textTransform: 'uppercase',
		letterSpacing: '0.05em',
		opacity: 0.75,
	}),
	notice: css({
		fontWeight: 'bold',
		margin: '0 0 1rem',
		textAlign: 'left',
	}),
	error: css({
		color: 'var(--error-red)',
		fontWeight: 'bold',
		margin: 0,
	}),
	success: css({
		fontWeight: 'bold',
		margin: 0,
	}),
	grid: css({
		display: 'flex',
		flexWrap: 'wrap',
		gap: '1rem',
		justifyContent: 'center',
	}),
	seeAll: css({
		alignSelf: 'center',
		fontWeight: 'bold',
		textTransform: 'uppercase',
		fontSize: '0.8rem',
		letterSpacing: '0.05em',
	}),
	backSign: css({
		margin: '0 auto',
		display: 'block',
	}),
}
