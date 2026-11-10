import pumpkinAsset from '@/assets/halloween/pumpkin1.png'
import type { JSX } from 'solid-js'
import barcodeAsset from '../../assets/boosts/barcode.png'
import type { Collectable } from '../../game/collectables'
import type { FikaItem } from '../../game/fika'
import { CorgiArt } from './corgi'
import { DragonArt } from './dragon'
import { FikaArt } from './fika'
import { GooseIcon } from './geese'
import { LlamaArt } from './llama'

/** A collectable's picture, as it's seen on the course: its fika, its ride, sat waiting. */
export function CollectableArt(props: { id: Collectable }): JSX.Element {
	const { id } = props
	if (id.startsWith('fika:'))
		return <FikaArt item={id.slice('fika:'.length) as FikaItem} />
	switch (id) {
		case 'ride:corgi':
			return <CorgiArt pose="sit" />
		case 'ride:llama':
			return <LlamaArt pose="sit" />
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
