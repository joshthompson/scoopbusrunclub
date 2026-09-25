/**
 * The whole bus, assembled from the same layers and offsets the header's
 * `BusController` uses, so it looks like the one people know. Drawn at its
 * native 269×151 pixels and scaled with a transform from the bottom left.
 */
import busBackAsset from '@/assets/bus/bus-back.png'
import busAsset from '@/assets/bus/bus.png'
import scoopAsset from '@/assets/bus/scoop.png'
import shadowAsset from '@/assets/bus/shadow.png'
import wheel1Asset from '@/assets/bus/wheel1.png'
import wheel2Asset from '@/assets/bus/wheel2.png'
import wheel3Asset from '@/assets/bus/wheel3.png'
import wheel4Asset from '@/assets/bus/wheel4.png'
import windowAsset from '@/assets/bus/windows.png'
import { For } from 'solid-js'
import styles from './ScoopBus.module.css'
import { loadImage } from './sprites'

/** The scoop sticks out 22px to the left of the body. */
const SCOOP_OVERHANG = 22
export const BUS_WIDTH = 247 + SCOOP_OVERHANG
export const BUS_HEIGHT = 151

interface Layer {
	src: string
	x: number
	y: number
	w: number
	h: number
	opacity?: number
	wheel?: number
}

const LAYERS: Layer[] = [
	{ src: busBackAsset, x: 0, y: 0, w: 247, h: 127 },
	{ src: shadowAsset, x: -20, y: 107, w: 270, h: 50, opacity: 0.1 },
	{ src: wheel1Asset, x: 73, y: 105, w: 34, h: 38, wheel: 0 },
	{ src: wheel2Asset, x: 5, y: 103, w: 34, h: 38, wheel: 1 },
	{ src: wheel3Asset, x: 160, y: 105, w: 19, h: 23, wheel: 2 },
	{ src: wheel4Asset, x: 197, y: 102, w: 26, h: 30, wheel: 3 },
	{ src: windowAsset, x: 26, y: 26, w: 212, h: 40, opacity: 0.75 },
	{ src: busAsset, x: 0, y: 0, w: 247, h: 127 },
	{ src: scoopAsset, x: -22, y: 94, w: 88, h: 57 },
]

/**
 * The same bus flattened onto a canvas at native pixels, for anywhere that
 * needs an image rather than a DOM tree (stickers). The shadow is left out;
 * a sticker has no ground to cast it on.
 */
export async function renderBusCanvas(): Promise<HTMLCanvasElement> {
	const canvas = document.createElement('canvas')
	canvas.width = BUS_WIDTH
	canvas.height = BUS_HEIGHT
	const ctx = canvas.getContext('2d')
	if (!ctx) throw new Error('No 2d context')
	ctx.imageSmoothingEnabled = false
	for (const layer of LAYERS) {
		if (layer.src === shadowAsset) continue
		const img = await loadImage(layer.src)
		ctx.globalAlpha = layer.opacity ?? 1
		ctx.drawImage(img, layer.x + SCOOP_OVERHANG, layer.y, layer.w, layer.h)
	}
	ctx.globalAlpha = 1
	return canvas
}

export function ScoopBus(props: {
	/** Multiplier on the native size. */
	scale: number
	/** Wheels bounce along, as they do in the header. */
	rolling?: boolean
	/** Mirror it: the artwork faces left, as the header's bus drives. */
	flip?: boolean
	class?: string
	classList?: Record<string, boolean | undefined>
	style?: Record<string, string>
}) {
	return (
		<div
			class={`${styles.bus} ${props.class ?? ''}`}
			classList={props.classList}
			style={{
				width: `${BUS_WIDTH * props.scale}px`,
				height: `${BUS_HEIGHT * props.scale}px`,
				transform: props.flip ? 'scaleX(-1)' : undefined,
				...props.style,
			}}
		>
			<div class={styles.native} style={{ transform: `scale(${props.scale})` }}>
				<For each={LAYERS}>
					{(layer) => (
						<img
							src={layer.src}
							alt=""
							class={styles.layer}
							classList={{
								[styles.wheel]: props.rolling && layer.wheel !== undefined,
							}}
							style={{
								left: `${layer.x + SCOOP_OVERHANG}px`,
								top: `${layer.y}px`,
								width: `${layer.w}px`,
								height: `${layer.h}px`,
								opacity: layer.opacity,
								'animation-delay': `${(layer.wheel ?? 0) * -0.11}s`,
							}}
						/>
					)}
				</For>
			</div>
		</div>
	)
}
