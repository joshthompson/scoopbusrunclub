import { BackSignButton } from '@/components/BackSignButton'
import { LitPumpkin } from '@/components/PumpkinLight'
import { DirtBlock } from '@/components/ui/DirtBlock'
import {
	PUMPKIN_HEIGHT,
	PUMPKIN_WIDTH,
	fetchPumpkinPatch,
	pumpkinPatch,
} from '@/utils/pumpkins'
import { scatter, seededRandom } from '@/utils/scatter'
import { A } from '@solidjs/router'
import { css } from '@style/css'
import {
	For,
	Show,
	createEffect,
	createResource,
	createSignal,
	on,
	onCleanup,
} from 'solid-js'

/**
 * How big each pumpkin's grown: whole numbers, so `image-rendering: pixelated`
 * keeps every pixel the same size, and mostly the middle one.
 */
const PUMPKIN_SCALES = [3, 4, 4, 5]

/** The narrowest a pumpkin's patch gets, so a long name has room to wrap. */
const MIN_PLOT_WIDTH = 116

/**
 * Room kept round a pumpkin for its lean, which tips its corners out past its
 * box by a few pixels at the most.
 */
const LEAN_ROOM = 6

/** The least ground left between one pumpkin's patch and the next. */
const PLOT_GAP = 12

/**
 * How a pumpkin's grown: how big, and which way it's leaning and facing. Its
 * patch is it and its name, as wide as the wider of the two.
 */
function grow() {
	const scale =
		PUMPKIN_SCALES[Math.floor(Math.random() * PUMPKIN_SCALES.length)]
	return {
		scale,
		tilt: (Math.random() * 8 - 4).toFixed(1),
		flip: Math.random() < 0.5,
		plotWidth: Math.max(MIN_PLOT_WIDTH, PUMPKIN_WIDTH * scale + LEAN_ROOM * 2),
	}
}

/** Every pumpkin anyone's carved, with its name and whoever carved it. */
export function PumpkinPatchPage() {
	const [fetched] = createResource(fetchPumpkinPatch)
	const pumpkins = () => pumpkinPatch(fetched() ?? [])

	// Where each pumpkin's come up, scattered across the patch once they've
	// been drawn and can be measured, and again whenever it changes width. Off
	// the one seed each time, so a resize only shuffles them to fit.
	const seed = Math.floor(Math.random() * 2 ** 32)
	const [layout, setLayout] = createSignal<ReturnType<typeof scatter>>()
	let list: HTMLUListElement | undefined
	let laidOutWidth = 0

	const layOut = () => {
		if (!list) return
		laidOutWidth = list.clientWidth
		const sizes = [...list.children].map((el) => ({
			width: (el as HTMLElement).offsetWidth,
			height: (el as HTMLElement).offsetHeight,
		}))
		setLayout(scatter(sizes, laidOutWidth, PLOT_GAP, seededRandom(seed)))
	}

	// Once they're drawn, and again once the font's in, which can change how
	// tall a name wraps.
	createEffect(on(pumpkins, () => requestAnimationFrame(layOut)))
	document.fonts.ready.then(layOut)

	const resized = new ResizeObserver(() => {
		if (list && list.clientWidth !== laidOutWidth) layOut()
	})
	onCleanup(() => resized.disconnect())

	return (
		<div class={styles.container}>
			<DirtBlock title="Pumpkin Patch" signType="purple" ground="patch">
				<A href="/pumpkins/carve" class={styles.carve}>
					Carve a pumpkin!
				</A>

				<Show when={fetched.error}>
					<p class={styles.message}>
						Couldn't dig up the pumpkin patch — try again in a bit.
					</p>
				</Show>

				<Show
					when={pumpkins().length || fetched.state !== 'ready'}
					fallback={
						<p class={styles.message}>
							Nobody's carved a pumpkin yet — be the first!
						</p>
					}
				>
					<Show when={fetched.loading && !pumpkins().length}>
						<p class={styles.message}>Loading…</p>
					</Show>
					<ul
						ref={(el) => {
							list = el
							resized.observe(el)
						}}
						class={styles.patch}
						style={{ height: `${layout()?.height ?? 0}px` }}
					>
						<For each={pumpkins()}>
							{(pumpkin, i) => {
								const plot = grow()
								const spot = () => layout()?.spots[i()]
								return (
									<li
										class={styles.pumpkin}
										style={{
											width: `${plot.plotWidth}px`,
											left: `${spot()?.x ?? 0}px`,
											top: `${spot()?.y ?? 0}px`,
											// Hidden until it's been given somewhere to go.
											visibility: spot() ? 'visible' : 'hidden',
										}}
									>
										<LitPumpkin
											src={pumpkin.image}
											blinking
											class={styles.grown}
											width={PUMPKIN_WIDTH * plot.scale}
											height={PUMPKIN_HEIGHT * plot.scale}
											style={{
												rotate: `${plot.tilt}deg`,
												scale: plot.flip ? '-1 1' : undefined,
											}}
										/>
										<span class={styles.name}>{pumpkin.name}</span>
										<span class={styles.carver}>
											carved by {pumpkin.carver}
										</span>
									</li>
								)
							}}
						</For>
					</ul>
				</Show>
			</DirtBlock>

			<BackSignButton class={styles.backSign} />
		</div>
	)
}

const styles = {
	container: css({
		width: 'calc(100% - 2rem)',
		maxWidth: '1000px',
		margin: '1rem auto',
		display: 'flex',
		flexDirection: 'column',
		gap: '2rem',
	}),
	carve: css({
		display: 'block',
		width: 'fit-content',
		margin: '0 auto 1.5rem',
		padding: '0.5rem 1.5rem',
		border: '3px double currentColor',
		color: 'inherit',
		fontWeight: 'bold',
		fontSize: '1rem',
		textTransform: 'uppercase',
		textDecoration: 'none',
		cornerShape: 'notch',
		borderRadius: '4px',
		_hover: { background: 'var(--overlay-white-10)' },
	}),
	message: css({
		fontWeight: 'bold',
		margin: 0,
	}),
	patch: css({
		listStyle: 'none',
		margin: 0,
		padding: 0,
		position: 'relative',
	}),
	// A pumpkin's patch, sized by `grow` and placed by `scatter`, with its name
	// underneath.
	pumpkin: css({
		position: 'absolute',
		display: 'flex',
		alignItems: 'center',
		flexDirection: 'column',
		textAlign: 'center',
		overflowWrap: 'anywhere',
	}),
	grown: css({
		// Clear of its name, however it's leaning.
		marginBottom: '0.5rem',
	}),
	name: css({
		fontWeight: 'bold',
	}),
	carver: css({
		fontSize: '0.8rem',
		opacity: 0.8,
	}),
	backSign: css({
		margin: '0 auto',
		display: 'block',
	}),
}
