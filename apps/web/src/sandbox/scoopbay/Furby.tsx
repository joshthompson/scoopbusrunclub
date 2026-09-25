/** A Furby, drawn from a palette. Scoop Bay's photos never did upload. */
import { For, Show } from 'solid-js'
import type { FurbyLook } from './listings'

export function Furby(props: {
	look: FurbyLook
	size: number
	class?: string
}) {
	const l = () => props.look
	return (
		<svg
			viewBox="0 0 100 100"
			width={props.size}
			height={props.size}
			class={props.class}
			role="img"
			aria-label={`${props.look.name} Furby`}
			style={{ 'image-rendering': 'auto' }}
		>
			{/* ears */}
			<ellipse
				cx="22"
				cy="22"
				rx="9"
				ry="15"
				fill={l().ears}
				transform="rotate(-25 22 22)"
			/>
			<ellipse
				cx="78"
				cy="22"
				rx="9"
				ry="15"
				fill={l().ears}
				transform="rotate(25 78 22)"
			/>
			<ellipse
				cx="22"
				cy="24"
				rx="4"
				ry="9"
				fill={l().belly}
				transform="rotate(-25 22 24)"
			/>
			<ellipse
				cx="78"
				cy="24"
				rx="4"
				ry="9"
				fill={l().belly}
				transform="rotate(25 78 24)"
			/>
			{/* tuft */}
			<path
				d="M50 20 C 46 8, 40 10, 42 4"
				stroke={l().furDark}
				stroke-width="2"
				fill="none"
				stroke-linecap="round"
			/>
			<path
				d="M50 20 C 50 8, 50 8, 51 2"
				stroke={l().furDark}
				stroke-width="2"
				fill="none"
				stroke-linecap="round"
			/>
			<path
				d="M50 20 C 54 8, 60 10, 58 4"
				stroke={l().furDark}
				stroke-width="2"
				fill="none"
				stroke-linecap="round"
			/>
			{/* body */}
			<ellipse cx="50" cy="58" rx="37" ry="40" fill={l().fur} />
			{/* fuzz */}
			<For each={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]}>
				{(i) => {
					const a = (i / 12) * Math.PI * 2
					const x = 50 + Math.cos(a) * 37
					const y = 58 + Math.sin(a) * 40
					return (
						<path
							d={`M${x} ${y} l${Math.cos(a) * 4} ${Math.sin(a) * 4}`}
							stroke={l().furDark}
							stroke-width="2"
							stroke-linecap="round"
						/>
					)
				}}
			</For>
			<Show when={l().stripes}>
				<For each={[-14, 0, 14]}>
					{(dx) => (
						<path
							d={`M${50 + dx - 8} 30 q 6 12 -2 26`}
							stroke={l().stripes}
							stroke-width="3"
							fill="none"
							stroke-linecap="round"
							opacity="0.75"
						/>
					)}
				</For>
			</Show>
			{/* belly */}
			<ellipse cx="50" cy="72" rx="22" ry="22" fill={l().belly} />
			{/* eyes */}
			<ellipse
				cx="37"
				cy="45"
				rx="11"
				ry="12"
				fill="#fff"
				stroke="#222"
				stroke-width="1.5"
			/>
			<ellipse
				cx="63"
				cy="45"
				rx="11"
				ry="12"
				fill="#fff"
				stroke="#222"
				stroke-width="1.5"
			/>
			<circle cx="38" cy="47" r="6.5" fill={l().eyes} />
			<circle cx="62" cy="47" r="6.5" fill={l().eyes} />
			<circle cx="38.5" cy="47.5" r="3.2" fill="#111" />
			<circle cx="62.5" cy="47.5" r="3.2" fill="#111" />
			<circle cx="36" cy="44" r="1.6" fill="#fff" />
			<circle cx="60" cy="44" r="1.6" fill="#fff" />
			{/* eyelids */}
			<path
				d="M26 40 q 11 -9 22 0"
				stroke={l().furDark}
				stroke-width="2.5"
				fill="none"
			/>
			<path
				d="M52 40 q 11 -9 22 0"
				stroke={l().furDark}
				stroke-width="2.5"
				fill="none"
			/>
			{/* beak */}
			<path
				d="M42 56 L58 56 L50 68 Z"
				fill="#f4a300"
				stroke="#b56f00"
				stroke-width="1.5"
				stroke-linejoin="round"
			/>
			{/* feet */}
			<rect
				x="30"
				y="92"
				width="16"
				height="7"
				rx="3.5"
				fill="#f4a300"
				stroke="#b56f00"
				stroke-width="1.2"
			/>
			<rect
				x="54"
				y="92"
				width="16"
				height="7"
				rx="3.5"
				fill="#f4a300"
				stroke="#b56f00"
				stroke-width="1.2"
			/>
		</svg>
	)
}
