import { css } from '@style/css'
import type { Scene } from 'scoopjs'
import { type Accessor, For, Show } from 'solid-js'
import {
	FURBY_LABEL,
	FURBY_LINK,
	FURBY_TYPE,
	type FurbyController,
} from './FurbyController'
import type { RunnerController } from './RunnerController'

/**
 * What the header puts over its sprites as page elements rather than painting
 * them on its canvas: the name of whoever the mouse is on, and the
 * furbies' links. A label is HTML text with the site's own styling, and a link
 * has to be a real `<a>` to be one, neither of which a canvas can be.
 *
 * Each follows its sprite's box, without its turn or its squash.
 */
export function HeaderOverlay(props: {
	scene: Scene
	/** The id of the runner whose name is showing (see `labelledRunnerAt`). */
	labelledRunner: Accessor<string | undefined>
	/** The id of the carved pumpkin the mouse is on (see `pumpkinAt`). */
	hoveredPumpkin: Accessor<string | undefined>
}) {
	const runner = () => {
		const id = props.labelledRunner()
		return id
			? props.scene.getControllerById<RunnerController>(id)?.data
			: undefined
	}
	const pumpkin = () => {
		const id = props.hoveredPumpkin()
		return id
			? props.scene.getControllerById<{
					data: {
						x(): number
						y(): number
						width(): number
						label(): string | undefined
					}
				}>(id)?.data
			: undefined
	}
	const furbies = () =>
		props.scene.controllers
			.get()
			.map(({ controller }) => controller)
			.filter(
				(controller): controller is FurbyController =>
					controller.type === FURBY_TYPE,
			)

	return (
		<>
			<Show when={runner()}>
				{(data) => (
					// Above their head, or level with it for the little ones.
					<div
						class={styles.label}
						style={{
							left: `${data().x() + data().width() / 2}px`,
							top: `${data().y()}px`,
							transform: `translate(-50%, ${-data().labelRaise() * 100}%)`,
						}}
					>
						{data().label()}
					</div>
				)}
			</Show>
			<Show when={pumpkin()}>
				{(data) => (
					// Just above the pumpkin.
					<div
						class={styles.label}
						style={{
							left: `${data().x() + data().width() / 2}px`,
							top: `${data().y()}px`,
							transform: 'translate(-50%, calc(-100% - 4px))',
						}}
					>
						{data().label()}
					</div>
				)}
			</Show>
			<For each={furbies()}>
				{(furby) => (
					<a
						href={FURBY_LINK}
						target="_blank"
						rel="noopener noreferrer"
						tabIndex={-1}
						class={styles.furbyLink}
						style={{
							left: `${furby.data.x()}px`,
							top: `${furby.data.y()}px`,
							width: `${furby.data.width()}px`,
							height: `${furby.data.height()}px`,
						}}
						onMouseEnter={() => furby.data.setHovered(true)}
						onMouseLeave={() => furby.data.setHovered(false)}
						// The header navigates home on any click or touch that
						// reaches it, so keep this one to ourselves.
						onClick={(e) => e.stopPropagation()}
						onTouchStart={(e) => e.stopPropagation()}
						onTouchEnd={(e) => e.stopPropagation()}
					>
						<span class={styles.furbyLabel}>{FURBY_LABEL}</span>
					</a>
				)}
			</For>
		</>
	)
}

const styles = {
	label: css({
		position: 'absolute',
		pointerEvents: 'none',
		background: 'var(--color-black)',
		color: 'var(--color-white)',
		fontFamily: '"Jersey 10", sans-serif',
		fontSize: '12px',
		p: '0px 8px',
		width: 'max-content',
		borderRadius: '3px',
		cornerShape: 'notch',
	}),
	furbyLink: css({
		position: 'absolute',
		cursor: 'pointer',
	}),
	// The same as `label`, but part of its link, so hovering it still counts.
	furbyLabel: css({
		display: 'none',
		position: 'absolute',
		background: 'var(--color-black)',
		color: 'var(--color-white)',
		fontFamily: '"Jersey 10", sans-serif',
		fontSize: '12px',
		p: '0px 8px',
		width: 'max-content',
		borderRadius: '3px',
		cornerShape: 'notch',
		left: '50%',
		top: 0,
		transform: 'translate(-50%, -120%)',
		'a:hover > &': {
			display: 'block',
		},
	}),
}
