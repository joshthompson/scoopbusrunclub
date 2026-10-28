import eraserAsset from '@/assets/halloween/eraser.png'
import knifeAsset from '@/assets/halloween/knife.png'
import { BackSignButton } from '@/components/BackSignButton'
import { PumpkinLight } from '@/components/PumpkinLight'
import { DirtBlock } from '@/components/ui/DirtBlock'
import { Tooltip } from '@/components/ui/Tooltip'
import { track } from '@/utils/analytics'
import {
	MAX_PUMPKIN_NAME_LENGTH,
	PUMPKIN_HEIGHT,
	PUMPKIN_WIDTH,
	carvePumpkin,
	isCarvable,
	loadPumpkinBase,
	savePumpkin,
} from '@/utils/pumpkins'
import { useNavigate } from '@solidjs/router'
import { css } from '@style/css'
import {
	For,
	Show,
	createEffect,
	createMemo,
	createResource,
	createSignal,
} from 'solid-js'

/** The knife cuts pumpkin out; the eraser puts it back. */
type Tool = 'knife' | 'eraser'

/** Each drawn at twice its own pixels: the knife's 5 × 23, the eraser's 22 × 16. */
const TOOLS: {
	tool: Tool
	label: string
	icon: string
	width: number
	height: number
}[] = [
	{
		tool: 'knife',
		label: 'Knife: carve bits out',
		icon: knifeAsset,
		width: 10,
		height: 46,
	},
	{
		tool: 'eraser',
		label: 'Eraser: put bits back',
		icon: eraserAsset,
		width: 44,
		height: 32,
	},
]

/** One press's worth of carving or erasing, the pixels in the order it got to them. */
interface Stroke {
	tool: Tool
	pixels: number[]
}

export function PumpkinPage() {
	const navigate = useNavigate()
	const [base] = createResource(loadPumpkinBase)
	const [tool, setTool] = createSignal<Tool>('knife')
	// Each stroke is the pixels carved or put back in one press, so undo takes
	// back a whole drag at a time rather than a pixel at a time.
	const [strokes, setStrokes] = createSignal<Stroke[]>([])
	const [name, setName] = createSignal('')
	const [carver, setCarver] = createSignal('')
	const [saving, setSaving] = createSignal(false)
	const [error, setError] = createSignal<string | undefined>()

	/** What's carved out once every stroke so far has had its go, in order. */
	const carved = createMemo(() => {
		const out = new Set<number>()
		for (const stroke of strokes()) {
			for (const pixel of stroke.pixels) {
				if (stroke.tool === 'knife') out.add(pixel)
				else out.delete(pixel)
			}
		}
		return out
	})

	let canvas: HTMLCanvasElement | undefined
	/** Whether a press is carving the last stroke. */
	let pressing = false

	createEffect(() => {
		const pixels = base()
		if (!pixels || !canvas) return
		canvas.getContext('2d')?.putImageData(carvePumpkin(pixels, carved()), 0, 0)
	})

	/**
	 * Carve whichever pixel is under the pointer, if there's pumpkin there, or
	 * with the eraser put it back, if it's been carved.
	 */
	const carveAt = (e: PointerEvent) => {
		const pixels = base()
		if (!pixels || !canvas || !pressing) return
		const box = canvas.getBoundingClientRect()
		const x = Math.floor(((e.clientX - box.left) / box.width) * PUMPKIN_WIDTH)
		const y = Math.floor(((e.clientY - box.top) / box.height) * PUMPKIN_HEIGHT)
		if (x < 0 || y < 0 || x >= PUMPKIN_WIDTH || y >= PUMPKIN_HEIGHT) return
		const index = y * PUMPKIN_WIDTH + x
		const stroke = strokes().at(-1)
		if (!stroke) return
		const changes =
			stroke.tool === 'knife'
				? isCarvable(pixels, index) && !carved().has(index)
				: carved().has(index)
		if (!changes) return
		setStrokes((all) => [
			...all.slice(0, -1),
			{ ...stroke, pixels: [...stroke.pixels, index] },
		])
	}

	/** Done with the stroke, which is let go of if it didn't change anything. */
	const endStroke = () => {
		if (!pressing) return
		pressing = false
		setStrokes((all) => (all.at(-1)?.pixels.length ? all : all.slice(0, -1)))
	}

	const handleSubmit = async (e: Event) => {
		e.preventDefault()
		const pumpkinName = name().trim()
		const carverName = carver().trim()
		const pixels = [...carved()]
		if (!pumpkinName || !carverName || !pixels.length || saving()) return

		setSaving(true)
		setError(undefined)
		const result = await savePumpkin({
			name: pumpkinName,
			carver: carverName,
			carved: pixels,
		})
		setSaving(false)

		if (!result.ok) {
			setError(result.error)
			return
		}

		// Track a pumpkin being carved in Mixpanel (not its names, which are free text)
		track('pumpkin_carved', { carved_pixel_count: pixels.length })
		// Off to the patch, where it's out at the front.
		navigate('/pumpkins')
	}

	return (
		<div class={styles.container}>
			<DirtBlock title="Carve a Pumpkin" signType="purple">
				<p class={styles.intro}>
					Click or drag over the pumpkin to carve bits out of it (the eraser
					puts them back), then give it a name and send it out into the header
					for Halloween.
				</p>

				<form onSubmit={handleSubmit} class={styles.form}>
					<div class={styles.pumpkin}>
						<PumpkinLight />
						<canvas
							ref={canvas}
							width={PUMPKIN_WIDTH}
							height={PUMPKIN_HEIGHT}
							class={styles.canvas}
							style={{ cursor: tool() === 'knife' ? 'crosshair' : 'cell' }}
							role="img"
							aria-label="The pumpkin you're carving"
							onPointerDown={(e) => {
								e.preventDefault()
								e.currentTarget.setPointerCapture(e.pointerId)
								pressing = true
								setStrokes((all) => [...all, { tool: tool(), pixels: [] }])
								carveAt(e)
							}}
							onPointerMove={carveAt}
							onPointerUp={endStroke}
							onPointerCancel={endStroke}
						/>
						<fieldset class={styles.tools} aria-label="Tool">
							<For each={TOOLS}>
								{(option) => (
									<Tooltip content={option.label}>
										<button
											type="button"
											class={styles.tool}
											aria-label={option.label}
											aria-pressed={tool() === option.tool}
											onClick={() => setTool(option.tool)}
										>
											<img
												src={option.icon}
												alt=""
												width={option.width}
												height={option.height}
												class={styles.icon}
											/>
										</button>
									</Tooltip>
								)}
							</For>
						</fieldset>
					</div>

					<button
						type="button"
						class={styles.button}
						disabled={!strokes().length}
						onClick={() => setStrokes((all) => all.slice(0, -1))}
					>
						Undo
					</button>

					<label class={styles.label}>
						Pumpkin's Name
						<input
							type="text"
							class={styles.input}
							value={name()}
							maxLength={MAX_PUMPKIN_NAME_LENGTH}
							onInput={(e) => setName(e.currentTarget.value)}
						/>
					</label>

					<label class={styles.label}>
						Your Name
						<input
							type="text"
							class={styles.input}
							value={carver()}
							maxLength={MAX_PUMPKIN_NAME_LENGTH}
							onInput={(e) => setCarver(e.currentTarget.value)}
						/>
					</label>

					<Show when={error()}>
						<p class={styles.error}>{error()}</p>
					</Show>

					<button
						type="submit"
						class={styles.button}
						disabled={
							!name().trim() || !carver().trim() || !carved().size || saving()
						}
					>
						{saving() ? 'Saving…' : 'Submit'}
					</button>
				</form>
			</DirtBlock>

			<BackSignButton class={styles.backSign} to="/pumpkins">
				Back to Pumpkin Patch
			</BackSignButton>
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
		alignItems: 'center',
		gap: '1.25rem',
	}),
	// The pumpkin, with its inside behind it to show through what's carved.
	pumpkin: css({
		position: 'relative',
		isolation: 'isolate',
		// 16 screen pixels to each of the pumpkin's 29 × 23, as big as fits. Written
		// out because Panda can't work out `PUMPKIN_WIDTH * 16` at build time.
		width: '464px',
		maxWidth: '100%',
		aspectRatio: '29 / 23',
	}),
	canvas: css({
		display: 'block',
		width: '100%',
		height: '100%',
		imageRendering: 'pixelated',
		// Dragging carves rather than scrolling the page.
		touchAction: 'none',
	}),
	// In the pumpkin's top right corner, which is clear of it bar the stem.
	// Nudged up into the gap above, so they're clear of it on a phone too,
	// where the corner's only 45px tall.
	tools: css({
		position: 'absolute',
		top: '-8px',
		right: 0,
		display: 'flex',
		gap: '0.25rem',
		border: 'none',
		margin: 0,
		padding: 0,
	}),
	tool: css({
		width: '52px',
		height: '52px',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 0,
		border: '3px double currentColor',
		background: 'transparent',
		color: 'inherit',
		cursor: 'pointer',
		cornerShape: 'notch',
		borderRadius: '4px',
		_hover: { background: 'var(--overlay-white-10)' },
		// The tool in hand, which stays that way under the mouse too.
		'&[aria-pressed=true], &[aria-pressed=true]:hover': {
			background: 'var(--overlay-black-30)',
		},
	}),
	icon: css({
		display: 'block',
		imageRendering: 'pixelated',
	}),
	label: css({
		width: '100%',
		maxWidth: '320px',
		display: 'flex',
		flexDirection: 'column',
		gap: '0.25rem',
		fontSize: '0.8rem',
		fontWeight: 'bold',
		textTransform: 'uppercase',
		letterSpacing: '0.05em',
		textAlign: 'left',
	}),
	input: css({
		width: '100%',
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
	button: css({
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
	error: css({
		color: 'var(--error-red)',
		fontWeight: 'bold',
		margin: 0,
	}),
	backSign: css({
		margin: '0 auto',
		display: 'block',
	}),
}
