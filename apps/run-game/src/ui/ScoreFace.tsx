import { runners } from '@/data/runners'
import { Show } from 'solid-js'
import { lookSprite } from '../runners/playable'
import type { ScoreIcon } from '../saved/identity'

/** A score's icon's face, as the website's celebrations show it. */
export function faceOf(icon: ScoreIcon | undefined): string | undefined {
	if (!icon) return undefined
	if ('member' in icon) {
		const member = runners[icon.member as keyof typeof runners]
		return member?.[0]().frames.face?.[0]
	}
	try {
		return lookSprite(icon.look).face
	} catch {
		// A look this game can't draw: no face.
		return undefined
	}
}

/** The face by a high score: whoever's runner it went under. */
export function ScoreFace(props: {
	icon: ScoreIcon | undefined
	size?: number
}) {
	const size = () => `${props.size ?? 22}px`
	return (
		<Show
			when={faceOf(props.icon)}
			fallback={<span style={{ width: size(), height: size() }} />}
		>
			{(face) => (
				<img
					src={face()}
					alt=""
					class="pixelated"
					style={{
						width: size(),
						height: size(),
						'object-fit': 'contain',
						'flex-shrink': 0,
					}}
				/>
			)}
		</Show>
	)
}
