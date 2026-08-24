import { AdminSelect } from '@/components/admin/AdminSelect'
import type { CharacterSpriteProps } from '@/utils/createRunnerFrames'
import { createRunnerFrames } from '@/utils/createRunnerFrames'
import { css } from '@style/css'
import {
	type Component,
	Show,
	createEffect,
	createSignal,
	onCleanup,
} from 'solid-js'

const DEFAULTS: CharacterSpriteProps = {
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

export const CharacterEditor: Component<{
	value?: CharacterSpriteProps
	onChange: (value: CharacterSpriteProps) => void
}> = (props) => {
	const initial = props.value?.head ? props.value : DEFAULTS
	const [character, setCharacter] = createSignal<CharacterSpriteProps>(initial)
	const [spriteInfo, setSpriteInfo] = createSignal<{
		url: string
		frameWidth: number
		totalWidth: number
		height: number
		frameCount: number
	} | null>(null)
	const [currentFrame, setCurrentFrame] = createSignal(0)

	const update = <K extends keyof CharacterSpriteProps>(
		key: K,
		value: CharacterSpriteProps[K],
	) => {
		const next = { ...character(), [key]: value }
		setCharacter(next)
		props.onChange(next)
	}

	const updateHead = (
		key: keyof CharacterSpriteProps['head'],
		value: string | boolean | undefined,
	) => {
		const next = { ...character(), head: { ...character().head, [key]: value } }
		setCharacter(next)
		props.onChange(next)
	}

	createEffect(() => {
		const c = character()
		try {
			const result = createRunnerFrames(c)
			const frames = result.frames.run
			if (frames && frames.length > 0) {
				// Parse first frame to get sprite sheet info
				const [url, meta] = frames[0].split('#')
				const [, , totalWidth, height] = meta.split(',').map(Number)
				const frameWidth = totalWidth / frames.length
				setSpriteInfo({
					url,
					frameWidth,
					totalWidth,
					height,
					frameCount: frames.length,
				})
			}
		} catch {
			setSpriteInfo(null)
		}
	})

	// Animate frames
	let interval: ReturnType<typeof setInterval> | undefined
	createEffect(() => {
		const info = spriteInfo()
		if (interval) clearInterval(interval)
		if (info && info.frameCount > 1) {
			interval = setInterval(() => {
				setCurrentFrame((f) => (f + 1) % info.frameCount)
			}, 200)
		}
	})
	onCleanup(() => {
		if (interval) clearInterval(interval)
	})

	const previewStyle = () => {
		const info = spriteInfo()
		if (!info) return {}
		const scale = 300 / info.height
		const offsetX = -(currentFrame() * info.frameWidth * scale)
		return {
			'background-image': `url(${info.url})`,
			'background-position': `${offsetX}px 0px`,
			'background-size': `${info.totalWidth * scale}px ${info.height * scale}px`,
			'background-repeat': 'no-repeat',
			width: `${info.frameWidth * scale}px`,
			height: `${info.height * scale}px`,
			'max-width': '100%',
			'image-rendering': 'pixelated' as const,
		}
	}

	return (
		<div class={styles.container}>
			<div class={styles.layout}>
				<div class={styles.preview}>
					<Show
						when={spriteInfo()}
						fallback={<div class={styles.placeholder}>No preview</div>}
					>
						<div style={previewStyle()} />
					</Show>
				</div>

				<div class={styles.controls}>
					{/* Skin */}
					<div class={styles.row}>
						<AdminSelect
							label="Skin"
							value={character().skin}
							onChange={(e) =>
								update(
									'skin',
									e.currentTarget.value as CharacterSpriteProps['skin'],
								)
							}
						>
							<option value="light">Light</option>
							<option value="medium">Medium</option>
							<option value="dark">Dark</option>
						</AdminSelect>
					</div>

					{/* Hair | Facial Hair */}
					<div class={styles.row}>
						<div class={styles.field}>
							<AdminSelect
								label="Hair"
								value={character().head.hair ?? ''}
								onChange={(e) =>
									updateHead('hair', e.currentTarget.value || undefined)
								}
							>
								<option value="">Bald</option>
								<option value="short">Short</option>
								<option value="medium">Medium</option>
								<option value="long">Long</option>
							</AdminSelect>
							<Show when={character().head.hair}>
								<ColorPicker
									label="Colour"
									value={character().head.hairColor ?? '#4a3222'}
									onChange={(v) => updateHead('hairColor', v)}
								/>
							</Show>
						</div>
						<div class={styles.field}>
							<AdminSelect
								label="Facial Hair"
								value={character().head.facialHair ?? ''}
								onChange={(e) =>
									updateHead('facialHair', e.currentTarget.value || undefined)
								}
							>
								<option value="">None</option>
								<option value="stubble">Stubble</option>
								<option value="beard">Beard</option>
								<option value="long">Long</option>
							</AdminSelect>
							<Show when={character().head.facialHair}>
								<ColorPicker
									label="Colour"
									value={
										character().head.facialHairColor ??
										character().head.hairColor ??
										'#4a3222'
									}
									onChange={(v) => updateHead('facialHairColor', v)}
								/>
							</Show>
						</div>
					</div>

					{/* Accessory | Neck */}
					<div class={styles.row}>
						<div class={styles.field}>
							<AdminSelect
								label="Accessory"
								value={character().head.accessory ?? ''}
								onChange={(e) =>
									updateHead('accessory', e.currentTarget.value || undefined)
								}
							>
								<option value="">None</option>
								<option value="cap">Cap</option>
								<option value="headband">Headband</option>
								<option value="glasses">Glasses</option>
							</AdminSelect>
							<Show when={character().head.accessory}>
								<ColorPicker
									label="Colour"
									value={character().head.accessoryColor ?? '#cc2222'}
									onChange={(v) => updateHead('accessoryColor', v)}
								/>
							</Show>
						</div>
						<div class={styles.field}>
							<AdminSelect
								label="Neck"
								value={character().head.topColorForNeck ? 'top' : 'skin'}
								onChange={(e) =>
									updateHead(
										'topColorForNeck',
										e.currentTarget.value === 'top',
									)
								}
							>
								<option value="skin">Skin colour</option>
								<option value="top">Top colour</option>
							</AdminSelect>
						</div>
					</div>

					{/* Top | Bottom */}
					<div class={styles.row}>
						<div class={styles.field}>
							<AdminSelect
								label="Top"
								value={character().topType}
								onChange={(e) =>
									update(
										'topType',
										e.currentTarget
											.value as CharacterSpriteProps['topType'],
									)
								}
							>
								<option value="vest">Vest</option>
								<option value="tshirt">T-Shirt</option>
								<option value="longsleeve">Long Sleeve</option>
							</AdminSelect>
							<ColorPicker
								label="Colour"
								value={character().topColor}
								onChange={(v) => update('topColor', v)}
							/>
						</div>
						<div class={styles.field}>
							<AdminSelect
								label="Bottom"
								value={character().bottomType}
								onChange={(e) =>
									update(
										'bottomType',
										e.currentTarget
											.value as CharacterSpriteProps['bottomType'],
									)
								}
							>
								<option value="short-shorts">Short Shorts</option>
								<option value="shorts">Shorts</option>
								<option value="trousers">Trousers</option>
							</AdminSelect>
							<ColorPicker
								label="Colour"
								value={character().bottomColor}
								onChange={(v) => update('bottomColor', v)}
							/>
						</div>
					</div>

					{/* Socks | Shoes */}
					<div class={styles.row}>
						<Show when={character().bottomType !== 'trousers'}>
							<div class={styles.field}>
								<label class={styles.checkLabel}>
									<input
										type="checkbox"
										checked={!!character().sockColor}
										onChange={(e) =>
											update(
												'sockColor',
												e.currentTarget.checked
													? '#ffffff'
													: undefined,
											)
										}
									/>
									Socks
								</label>
								<Show when={character().sockColor}>
									<ColorPicker
										label="Colour"
										value={character().sockColor ?? '#ffffff'}
										onChange={(v) => update('sockColor', v)}
									/>
								</Show>
							</div>
						</Show>
						<div class={styles.field}>
							<ColorPicker
								label="Shoe Colour"
								value={character().shoeColor}
								onChange={(v) => update('shoeColor', v)}
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}

function ColorPicker(props: {
	label: string
	value: string
	onChange: (value: string) => void
}) {
	return (
		<label class={styles.colorLabel}>
			{props.label}
			<input
				type="color"
				value={props.value}
				onInput={(e) => props.onChange(e.currentTarget.value)}
				class={styles.colorInput}
			/>
		</label>
	)
}

const styles = {
	container: css({
		padding: '0.5rem 0',
	}),
	layout: css({
		display: 'flex',
		gap: '1.5rem',
		alignItems: 'flex-start',
	}),
	preview: css({
		flexShrink: 0,
		width: '300px',
		maxWidth: '100%',
		aspectRatio: '1',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		border: '2px solid var(--overlay-black-15)',
		borderRadius: '4px',
		background: 'var(--overlay-black-7)',
		overflow: 'hidden',
	}),
	placeholder: css({
		fontSize: '0.7rem',
		opacity: 0.5,
		textTransform: 'uppercase',
	}),
	controls: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '0.75rem',
		flex: 1,
	}),
	row: css({
		display: 'flex',
		gap: '1rem',
		alignItems: 'flex-end',
		flexWrap: 'wrap',
	}),
	field: css({
		display: 'flex',
		gap: '0.5rem',
		alignItems: 'flex-end',
	}),
	// Matches AdminSelect's own label, so a colour sits level with the dropdown
	// it belongs to rather than floating below it.
	colorLabel: css({
		display: 'flex',
		flexDirection: 'column',
		gap: '0.25rem',
		fontSize: '0.8rem',
		fontWeight: 'bold',
		textTransform: 'uppercase',
		letterSpacing: '0.05em',
	}),
	/**
	 * Wears the same chrome as AdminSelect — notched dirt-brown frame, dark fill,
	 * the medium size's 41px height — with the swatch stripped of its own border
	 * so the chosen colour fills the frame instead of sitting in a browser chip.
	 */
	colorInput: css({
		appearance: 'none',
		width: '46px',
		height: '41px',
		padding: '4px',
		border: '2px solid var(--dirt-darker-brown)',
		cornerShape: 'notch',
		borderRadius: '4px',
		background: 'var(--overlay-black-30)',
		cursor: 'pointer',
		outline: 'none',
		_focus: { background: 'var(--dirt-dark-brown)' },
		'&::-webkit-color-swatch-wrapper': { padding: 0 },
		'&::-webkit-color-swatch': { border: 'none', borderRadius: '2px' },
		'&::-moz-color-swatch': { border: 'none', borderRadius: '2px' },
	}),
	checkLabel: css({
		display: 'flex',
		alignItems: 'center',
		gap: '0.4rem',
		fontSize: '0.75rem',
		fontWeight: 'bold',
		textTransform: 'uppercase',
		cursor: 'pointer',
	}),
}
