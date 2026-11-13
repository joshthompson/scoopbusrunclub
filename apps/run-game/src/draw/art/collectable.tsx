import pumpkinAsset from '@/assets/halloween/pumpkin1.png'
import type { JSX } from 'solid-js'
import barcodeAsset from '../../assets/boosts/barcode.png'
import type { Collectable } from '../../game/collectables'
import type { FikaItem } from '../../game/fika'
import type { Hat, PickupHat } from '../../game/hats'
import { BactrianArt, CamelArt } from './camel'
import { CondorArt } from './condor'
import { CorgiArt } from './corgi'
import { DeerArt } from './deer'
import { DragonArt } from './dragon'
import { FikaArt } from './fika'
import { GooseIcon } from './geese'
import { GliderArt } from './glider'
import { GoatArt } from './goat'
import { HatPicture, hatArt } from './hats'
import { LlamaArt } from './llama'
import { MineCartArt } from './mineCart'
import { MoleArt } from './mole'
import { StoodBoardArt } from './skis'
import { UnicornArt } from './unicorn'

/** A collectable's picture, as it's seen on the course: its fika, its ride, sat waiting. */
export function CollectableArt(props: { id: Collectable }): JSX.Element {
	const { id } = props
	if (id.startsWith('fika:'))
		return <FikaArt item={id.slice('fika:'.length) as FikaItem} />
	if (id.startsWith('hat:'))
		return <HatIcon hat={id.slice('hat:'.length) as PickupHat} />
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
		case 'ride:mole':
			return <MoleArt pose="sit" />
		case 'ride:minecart':
			return <MineCartArt />
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
					src={pumpkinAsset}
					alt=""
					class="pixelated"
					style={{ display: 'block', width: '44px' }}
				/>
			)
	}
}

/** A hat, on its own, at its size on a head, made a little bigger. */
function HatIcon(props: { hat: PickupHat }) {
	const hat = () => ({ kind: props.hat })
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
			<div style={{ transform: 'scale(1.4)', position: 'relative' }}>
				<HatSized hat={hat()} />
			</div>
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
