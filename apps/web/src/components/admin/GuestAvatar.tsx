import { AdminAvatar } from '@/components/admin/AdminAvatar'
import type { CharacterSpriteProps } from '@/utils/createRunnerFrames'
import { createRunnerFrames } from '@/utils/createRunnerFrames'
import { cva } from '@style/css'
import { Show } from 'solid-js'

/**
 * Avatar for a guest runner. Renders their generated face sprite when they have
 * a character, otherwise falls back to an initial chip.
 */
export function GuestAvatar(props: {
	name: string
	avatar?: CharacterSpriteProps
	size?: 'small' | 'medium' | 'large' | 'huge'
	title?: string
}) {
	const faceUrl = () => {
		const av = props.avatar
		if (!av?.head) return undefined
		try {
			return createRunnerFrames(av).frames.face?.[0]
		} catch {
			return undefined
		}
	}

	return (
		<Show
			when={faceUrl()}
			fallback={
				<AdminAvatar
					user={props.name}
					size={props.size}
					title={props.title ?? props.name}
				/>
			}
		>
			<img
				src={faceUrl()}
				alt=""
				title={props.title ?? props.name}
				class={styles.face({ size: props.size })}
			/>
		</Show>
	)
}

const styles = {
	face: cva({
		base: {
			width: 'auto',
			height: 'var(--avatar-size)',
			imageRendering: 'pixelated',
			marginRight: '0.5rem',
			verticalAlign: 'middle',
		},
		variants: {
			size: {
				small: { '--avatar-size': '1em' },
				medium: { '--avatar-size': '1.5em' },
				large: { '--avatar-size': '2em' },
				huge: { '--avatar-size': '6em' },
			},
		},
		defaultVariants: {
			size: 'medium',
		},
	}),
}
