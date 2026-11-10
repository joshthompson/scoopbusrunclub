import bubbleTea from '../../assets/boosts/bubble-tea.png'
import candyCorn from '../../assets/boosts/candy-corn.png'
import chokladboll from '../../assets/boosts/chokladboll.png'
import coffee from '../../assets/boosts/coffee.png'
import dammsugare from '../../assets/boosts/dammsugare.png'
import dumplings from '../../assets/boosts/dumplings.png'
import falafel from '../../assets/boosts/falafel.png'
import incaCola from '../../assets/boosts/inca-cola.png'
import kanelbulle from '../../assets/boosts/kanelbulle.png'
import kardemummabulle from '../../assets/boosts/kardemummabulle.png'
import knafeh from '../../assets/boosts/knafeh.png'
import koshary from '../../assets/boosts/koshary.png'
import mooncake from '../../assets/boosts/mooncake.png'
import prinsesstarta from '../../assets/boosts/prinsesstarta.png'
import semla from '../../assets/boosts/semla.png'
import spiderCupcake from '../../assets/boosts/spider-cupcake.png'
import toffeeApple from '../../assets/boosts/toffee-apple.png'
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
	falafel,
	knafeh,
	koshary,
	dumplings,
	bubbleTea,
	mooncake,
	candyCorn,
	toffeeApple,
	spiderCupcake,
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
