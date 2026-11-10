import chokladboll from '../../assets/boosts/chokladboll.png'
import coffee from '../../assets/boosts/coffee.png'
import dammsugare from '../../assets/boosts/dammsugare.png'
import incaCola from '../../assets/boosts/inca-cola.png'
import kanelbulle from '../../assets/boosts/kanelbulle.png'
import kardemummabulle from '../../assets/boosts/kardemummabulle.png'
import prinsesstarta from '../../assets/boosts/prinsesstarta.png'
import semla from '../../assets/boosts/semla.png'
import { FIKA_SIZE, type FikaItem } from '../../game/fika'
import { PixelArt } from '../PixelArt'

const ART: Record<FikaItem, string> = {
	coffee,
	kanelbulle,
	chokladboll,
	prinsesstarta,
	kardemummabulle,
	semla,
	dammsugare,
	incaCola,
}

/** A fika item, at its size. */
export function FikaArt(props: { item: FikaItem }) {
	return (
		<PixelArt
			src={ART[props.item]}
			width={FIKA_SIZE[props.item].width}
			height={FIKA_SIZE[props.item].height}
		/>
	)
}
