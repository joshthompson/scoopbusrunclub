import { createSignal } from 'solid-js'
import { getMuted, toggleMute } from './music'

export function MuteButton(props: { focused: boolean }) {
	const [muted, setMuted] = createSignal(getMuted())

	function handleToggle() {
		const nowMuted = toggleMute()
		setMuted(nowMuted)
	}

	return (
		<button
			type="button"
			class="mute-btn"
			classList={{ 'menu-focused': props.focused }}
			onClick={handleToggle}
			title={muted() ? 'Unmute music' : 'Mute music'}
		>
			{muted() ? '🔇' : '🔊'}
		</button>
	)
}
