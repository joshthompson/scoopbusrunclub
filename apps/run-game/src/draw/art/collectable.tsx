import { type JSX, Show } from 'solid-js'
import barcodeAsset from '../../assets/boosts/barcode.png'
import type { Collectable } from '../../game/collectables'
import type { FikaItem } from '../../game/fika'
import type { Hat, PickupHat } from '../../game/hats'
import { BloodCellArt } from './bloodCell'
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
	id.startsWith('hat:')

/** A collectable's picture, as it's seen on the course: its fika, its ride, sat waiting. */
export function CollectableArt(props: { id: Collectable }): JSX.Element {
	const { id } = props
	if (isFika(id)) return <FikaArt item={id.slice('fika:'.length) as FikaItem} />
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
				display: 'grid',
				'place-items': 'center',
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
