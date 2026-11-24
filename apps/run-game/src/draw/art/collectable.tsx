import { type JSX, Show, createSignal, onMount } from 'solid-js'
import barcodeAsset from '../../assets/boosts/barcode.png'
import {
	BOMB_HATS,
	type BombHat,
	type Collectable,
	isBombHat,
} from '../../game/collectables'
import type { FikaItem } from '../../game/fika'
import type { Hat, PickupHat } from '../../game/hats'
import { BloodCellArt } from './bloodCell'
import { BOMB_HEADS, FUSE_BENDS, fuseCells, paintCord } from './bombHeads'
import { BactrianArt, CamelArt } from './camel'
import { CondorArt } from './condor'
import { CorgiArt } from './corgi'
import { DeerArt } from './deer'
import { DragonArt } from './dragon'
import { FikaArt } from './fika'
import { GooseIcon } from './geese'
import { GliderArt } from './glider'
import { GoatArt } from './goat'
import { HatPicture, PUMPKINS, hatArt } from './hats'
import { HorseArt } from './horse'
import { LifeboatArt } from './lifeboat'
import { LlamaArt } from './llama'
import { MineCartArt } from './mineCart'
import { MoleArt } from './mole'
import { POGO_STICK, POGO_STICK_HEIGHT, POGO_STICK_WIDTH } from './pogoStick'
import { PterodactylArt } from './pterodactyl'
import { SkateboardArt } from './skateboard'
import { StoodBoardArt } from './skis'
import { SpaceBuddyArt } from './spaceBuddy'
import { UnicornArt } from './unicorn'

const isFika = (id: Collectable): id is `fika:${FikaItem}` =>
	id.startsWith('fika:')
const isHat = (id: Collectable): id is `hat:${PickupHat}` =>
	id.startsWith('hat:') && !isBombHat(id)

/** A collectable's picture, as it's seen on the course: its fika, its ride, sat waiting. */
export function CollectableArt(props: { id: Collectable }): JSX.Element {
	const { id } = props
	if (isFika(id)) return <FikaArt item={id.slice('fika:'.length) as FikaItem} />
	if (isBombHat(id))
		return (
			<BombHatIcon
				head={BOMB_HATS.indexOf(id.slice('hat:'.length) as BombHat)}
			/>
		)
	if (isHat(id)) return <HatIcon hat={id.slice('hat:'.length) as PickupHat} />
	switch (id) {
		case 'ride:corgi':
			return <CorgiArt pose="sit" />
		case 'ride:llama':
			return <LlamaArt pose="sit" />
		case 'ride:camel':
			return <CamelArt pose="sit" />
		case 'ride:bactrian':
			return <BactrianArt pose="sit" />
		case 'ride:deer':
			return <DeerArt pose="sit" />
		case 'ride:unicorn':
			return <UnicornArt pose="sit" />
		case 'ride:goat':
			return <GoatArt pose="sit" />
		case 'ride:horse':
			return <HorseArt pose="sit" />
		case 'ride:skis':
			// The rack's first pair, stood up in the snow; and its first snowboard.
			return <StoodBoardArt board={1} />
		case 'ride:snowboard':
			return <StoodBoardArt board={2} />
		case 'ride:glider':
			return (
				<div style={{ transform: 'scale(0.6)' }}>
					<GliderArt />
				</div>
			)
		case 'ride:goose':
			return <GooseIcon />
		case 'ride:dragon':
			return (
				<div style={{ width: '80px', height: '28px' }}>
					<div style={{ transform: 'scale(0.4)', 'transform-origin': '0 0' }}>
						<DragonArt now={0} />
					</div>
				</div>
			)
		case 'ride:condor':
			return (
				<div style={{ width: '74px', height: '48px', overflow: 'hidden' }}>
					<div style={{ transform: 'scale(0.4)', 'transform-origin': '0 0' }}>
						<CondorArt now={0} />
					</div>
				</div>
			)
		case 'ride:pterodactyl':
			return (
				<div style={{ width: '58px', height: '36px' }}>
					<PterodactylArt scale={0.6} />
				</div>
			)
		case 'ride:mole':
			return <MoleArt pose="sit" />
		case 'ride:minecart':
			return <MineCartArt />
		case 'ride:lifeboat':
			return (
				<div style={{ transform: 'scale(0.6)' }}>
					<LifeboatArt />
				</div>
			)
		case 'ride:bloodCell':
			return <BloodCellArt pose="sit" />
		case 'ride:skateboard':
			return <SkateboardArt pose="sit" />
		case 'ride:spaceBuddy':
			return <SpaceBuddyArt pose="sit" />
		case 'ride:pogoStick':
			return (
				<img
					src={POGO_STICK}
					alt=""
					class="pixelated"
					style={{
						display: 'block',
						width: `${POGO_STICK_WIDTH}px`,
						height: `${POGO_STICK_HEIGHT}px`,
					}}
				/>
			)
		case 'barcode':
			return (
				<img
					src={barcodeAsset}
					alt=""
					class="pixelated"
					style={{ display: 'block', width: '48px' }}
				/>
			)
		case 'pumpkin':
			return (
				<img
					src={PUMPKINS[0]}
					alt=""
					class="pixelated"
					style={{ display: 'block', width: '45px' }}
				/>
			)
	}
	// Every collectable has its picture: a new one won't build without it.
	return id satisfies never
}

/** How tall a hat's icon can be: any taller, and it's drawn smaller to fit its card. */
const HAT_ICON_TALLEST = 44

/**
 * A hat, on its own, at its size on a head, made a little bigger; or a tall
 * one (the sword hat, its sword and all), half its size, to fit its card.
 */
function HatIcon(props: { hat: PickupHat }) {
	const hat = () => ({ kind: props.hat })
	const scale = () =>
		[1.4, 1, 0.5].find((by) => hatArt(hat()).height * by <= HAT_ICON_TALLEST) ??
		0.5
	return (
		<div
			style={{
				position: 'relative',
				width: '40px',
				height: '32px',
				// Centred, a hat wider than this (the Crab Hat, its claws out)
				// spilling over both sides evenly.
				display: 'flex',
				'align-items': 'center',
				'justify-content': 'center',
			}}
		>
			<Show
				when={scale() < 1.4}
				fallback={
					<div style={{ transform: 'scale(1.4)', position: 'relative' }}>
						<HatSized hat={hat()} />
					</div>
				}
			>
				{/* Shrunk to fit: its room in the card shrunk with it, as a
				    transform alone leaves it as tall as ever. */}
				<div
					style={{
						position: 'relative',
						width: `${hatArt(hat()).width * scale()}px`,
						height: `${hatArt(hat()).height * scale()}px`,
						// Its own size, wider than the icon or not: shrunk to fit
						// it, the picture inside would hang off its left edge.
						'flex-shrink': 0,
					}}
				>
					<div
						style={{
							position: 'absolute',
							transform: `scale(${scale()})`,
							'transform-origin': '0 0',
						}}
					>
						<HatSized hat={hat()} />
					</div>
				</div>
			</Show>
		</div>
	)
}

/** How much of the fuse the bomb hat's icon shows: a short curl up out of its collar. */
const BOMB_ICON_FUSE = fuseCells(FUSE_BENDS.slice(0, 3))
/** How far above the head the fuse reaches, in px, which the icon has room for. */
const BOMB_ICON_FUSE_TALL =
	-Math.min(...BOMB_ICON_FUSE.map(([, down]) => down)) * 2
/** How tall the bomb hat's icon is drawn, in px, its picture cropped to what's in it. */
const BOMB_ICON_TALL = 48

/**
 * One of Bomb Hat's bombs, its `head`'s place in `BOMB_HEADS`: its eyes
 * open, and its fuse unlit, cropped to what's drawn, the room round the
 * head left off.
 */
function BombHatIcon(props: { head: number }) {
	const head = BOMB_HEADS[props.head]
	const [box, setBox] = createSignal({ width: 1, height: 1 })
	let canvas: HTMLCanvasElement | undefined
	onMount(() => {
		const picture = new Image()
		picture.onload = () => {
			// All of it, then just what's drawn of it.
			const whole = document.createElement('canvas')
			whole.width = head.width
			whole.height = head.height + BOMB_ICON_FUSE_TALL
			const all = whole.getContext('2d')
			const ctx = canvas?.getContext('2d')
			if (!all || !canvas || !ctx) return
			// Its picture's a pixel a cell: drawn at the head's size, 2 px cells.
			all.imageSmoothingEnabled = false
			all.drawImage(picture, 0, BOMB_ICON_FUSE_TALL, head.width, head.height)
			paintCord(
				all,
				head.fuse.x,
				BOMB_ICON_FUSE_TALL + head.fuse.y,
				BOMB_ICON_FUSE,
			)
			const drawn = drawnBox(all)
			canvas.width = drawn.width
			canvas.height = drawn.height
			ctx.drawImage(
				whole,
				drawn.x,
				drawn.y,
				drawn.width,
				drawn.height,
				0,
				0,
				drawn.width,
				drawn.height,
			)
			setBox(drawn)
		}
		picture.src = head.open
	})
	return (
		<canvas
			ref={canvas}
			class="pixelated"
			style={{
				display: 'block',
				height: `${BOMB_ICON_TALL}px`,
				width: `${(BOMB_ICON_TALL * box().width) / box().height}px`,
			}}
		/>
	)
}

/** The box round everything drawn on `ctx`'s canvas: the whole of it, if nothing is. */
function drawnBox(ctx: CanvasRenderingContext2D) {
	const { width, height } = ctx.canvas
	let data: Uint8ClampedArray
	try {
		data = ctx.getImageData(0, 0, width, height).data
	} catch {
		// Not to be read: all of it, then.
		return { x: 0, y: 0, width, height }
	}
	let left = width
	let top = height
	let right = -1
	let bottom = -1
	for (let y = 0; y < height; y++)
		for (let x = 0; x < width; x++)
			if (data[(y * width + x) * 4 + 3]) {
				left = Math.min(left, x)
				right = Math.max(right, x)
				top = Math.min(top, y)
				bottom = Math.max(bottom, y)
			}
	return right < 0
		? { x: 0, y: 0, width, height }
		: { x: left, y: top, width: right - left + 1, height: bottom - top + 1 }
}

function HatSized(props: { hat: Hat }) {
	return (
		<div
			style={{
				position: 'relative',
				width: `${hatArt(props.hat).width}px`,
				height: `${hatArt(props.hat).height}px`,
			}}
		>
			<HatPicture hat={props.hat} still />
		</div>
	)
}
