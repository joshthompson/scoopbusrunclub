import bubbleTea from '../../assets/boosts/bubble-tea.png'
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
import {
	captainsHat,
	karelianPie,
	kladdkaka,
	lingondricka,
	pickAndMix,
	salmiakki,
} from '../../courses/kit/ferryFika'
import { type PixelRect, pixelArt } from '../../courses/kit/pixelArt'
import {
	goldRing,
	lostPhone,
	oldCoin,
	rubberDuck,
} from '../../courses/kit/sewerFinds'
import { FIKA_SIZE, type FikaItem } from '../../game/fika'
import { PixelArt } from '../PixelArt'

const PINK = '#f7a8c8'
const PINK_LIGHT = '#fcd6e6'
const PINK_DARK = '#e27aa8'

/** Candyfloss on its stick: a pink cloud of it, lit on top, 10 by 14. */
const candyfloss = pixelArt(10, 14, [
	...(
		[
			[3, 0, 4],
			[2, 1, 6],
			[1, 2, 8],
			[0, 3, 10],
			[0, 4, 10],
			[0, 5, 10],
			[1, 6, 8],
			[2, 7, 6],
			[3, 8, 4],
		] as const
	).map(([x, y, w]): PixelRect => [x, y, w, 1, PINK]),
	[3, 1, 2, 1, PINK_LIGHT],
	[2, 2, 2, 1, PINK_LIGHT],
	[1, 3, 2, 1, PINK_LIGHT],
	[5, 3, 1, 1, PINK_LIGHT],
	[8, 4, 2, 2, PINK_DARK],
	[7, 6, 1, 1, PINK_DARK],
	[6, 7, 1, 1, PINK_DARK],
	[4, 5, 1, 1, PINK_DARK],
	[6, 2, 1, 1, PINK_DARK],
	// Its stick, down out of it.
	[4, 9, 2, 5, '#f3ead8'],
	[5, 9, 1, 5, '#c9bfa8'],
])

/** A tiny furby, all your own: purple, its ears up, big eyes, its beak, 9 by 10. */
const tinyFurby = pixelArt(9, 10, [
	// Its ears, tufted.
	[1, 0, 1, 2, '#7b3fb5'],
	[7, 0, 1, 2, '#7b3fb5'],
	[0, 0, 1, 1, '#ff8fc2'],
	[8, 0, 1, 1, '#ff8fc2'],
	// Its round body.
	[2, 2, 5, 1, '#a36ad9'],
	[1, 3, 7, 6, '#a36ad9'],
	[2, 9, 5, 1, '#a36ad9'],
	[1, 6, 7, 3, '#8b52c4'],
	// Its tummy.
	[3, 7, 3, 2, '#ffd8ec'],
	// Its eyes, white, with their pupils, and its beak.
	[2, 3, 2, 2, '#ffffff'],
	[5, 3, 2, 2, '#ffffff'],
	[3, 4, 1, 1, '#1d1d1d'],
	[5, 4, 1, 1, '#1d1d1d'],
	[4, 5, 1, 2, '#f2a33a'],
	// Its feet.
	[2, 9, 2, 1, '#f2a33a'],
	[5, 9, 2, 1, '#f2a33a'],
])

/** A swirled lollipop on its stick, 8 by 14. */
const lollipop = pixelArt(8, 14, [
	[2, 0, 4, 1, '#ff6fa8'],
	[1, 1, 6, 1, '#ff6fa8'],
	[0, 2, 8, 4, '#ff6fa8'],
	[1, 6, 6, 1, '#ff6fa8'],
	[2, 7, 4, 1, '#ff6fa8'],
	// Its swirl.
	[2, 2, 3, 1, '#fff6fb'],
	[5, 3, 1, 2, '#fff6fb'],
	[2, 5, 3, 1, '#fff6fb'],
	[1, 3, 1, 2, '#fff6fb'],
	[3, 3, 1, 1, '#6bc4ff'],
	[3, 4, 1, 1, '#ffe66b'],
	// Its stick.
	[3, 8, 2, 6, '#f3ead8'],
	[4, 8, 1, 6, '#c9bfa8'],
])

/** A slice of rainbow cake, its layers each a colour, icing on top, 11 by 10. */
const rainbowCake = pixelArt(11, 10, [
	// Its icing, and sprinkles on it.
	[0, 1, 11, 2, '#fff6fb'],
	[2, 0, 7, 1, '#fff6fb'],
	[2, 1, 1, 1, '#ff6fa8'],
	[5, 0, 1, 1, '#6bc4ff'],
	[8, 1, 1, 1, '#7be0a0'],
	// Its layers.
	...['#ff6fa8', '#ffb86b', '#ffe66b', '#7be0a0', '#6bc4ff', '#b48bff'].map(
		(colour, i): PixelRect => [0, 3 + i, 11, 1, colour],
	),
	// Its plate.
	[0, 9, 11, 1, '#dacdea'],
])

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
	candyfloss,
	toffeeApple,
	spiderCupcake,
	tinyFurby,
	lollipop,
	rainbowCake,
	rubberDuck,
	goldRing,
	oldCoin,
	lostPhone,
	kladdkaka,
	lingondricka,
	pickAndMix,
	salmiakki,
	karelianPie,
	captainsHat,
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
