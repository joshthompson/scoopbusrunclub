import busBackAsset from '@/assets/bus/bus-back.png'
import scoopAsset from '@/assets/bus/scoop.png'
import shadowAsset from '@/assets/bus/shadow.png'
import wheel1Asset from '@/assets/bus/wheel1.png'
import wheel2Asset from '@/assets/bus/wheel2.png'
import wheel3Asset from '@/assets/bus/wheel3.png'
import wheel4Asset from '@/assets/bus/wheel4.png'
import windowAsset from '@/assets/bus/windows.png'
import bg1Asset from '@/assets/misc/bg1.png'
import bg2Asset from '@/assets/misc/bg2.png'
import bg3Asset from '@/assets/misc/bg3.png'
import cloud1Asset from '@/assets/misc/cloud1.png'
import cloud2Asset from '@/assets/misc/cloud2.png'
import flower1Asset from '@/assets/misc/flower1.png'
import flower2Asset from '@/assets/misc/flower2.png'
import house1Asset from '@/assets/misc/house1.png'
import house2Asset from '@/assets/misc/house2.png'
import pathAsset from '@/assets/misc/path.png'
import shrub1Asset from '@/assets/misc/shrub1.png'
import sunAsset from '@/assets/misc/sun.png'
import tree1Asset from '@/assets/misc/tree1.png'
import tree2Asset from '@/assets/misc/tree2.png'
import { For, type JSX } from 'solid-js'
// The website's bus, with its lettering reversed so it reads right turned
// round (see scripts/turn-bus-lettering.ts).
import busAsset from '../assets/bus/bus-lettering-turned.png'
import { customRunners } from '../customRunners'
import { VIEW_HEIGHT } from '../game/constants'
import { guests } from '../guests'
import { MEMBERS, type Playable, customPlayable } from '../playable'
import { RunStrip } from './RunStrip'

/**
 * The menus' scene: Haga scrolling by, the header's scenery bands, houses and
 * trees at their own depths, and a few of the club running along the
 * header's path with the Scoop Bus right behind them. All CSS animation, so
 * it costs nothing to keep running behind the menus.
 */

/** Where the middle hills start: the far houses and pines peek over it. */
const HORIZON = 300
/** The top of the path the runners are on. */
const PATH_TOP = 462

/** A seeded random number generator, so the scene's the same every time. */
function seeded(seed: number) {
	let s = seed
	return () => {
		s = (s * 16807) % 2147483647
		return (s - 1) / 2147483646
	}
}

/**
 * A band of the header's scenery, scrolling left forever at `speed` px a
 * second: its image repeats, so moving it one image width loops seamlessly.
 */
function Band(props: {
	asset: string
	top: number
	height: number
	imageWidth: number
	speed: number
}) {
	return (
		<div
			class="pixelated"
			style={{
				position: 'absolute',
				left: 0,
				right: 0,
				top: `${props.top}px`,
				height: `${props.height}px`,
				'background-image': `url(${props.asset})`,
				'background-repeat': 'repeat-x',
				'--band': `${props.imageWidth}px`,
				animation: `band-scroll ${props.imageWidth / props.speed}s linear infinite`,
			}}
		/>
	)
}

/** Room for one loop of a strip: wider than the stage, so it never shows its seam. */
const STRIP_WIDTH = 1200

/**
 * Things dotted along the scene, scrolling left forever: laid out across one
 * strip's width, drawn twice side by side, and moved one strip's width per loop.
 */
function Strip(props: {
	speed: number
	seed: number
	gap: [number, number]
	pieces: { asset: string; bottom: (random: () => number) => number }[]
	clipBelow?: number
}) {
	const random = seeded(props.seed)
	const items: { asset: string; x: number; bottom: number }[] = []
	for (
		let x = 0;
		x < STRIP_WIDTH - props.gap[0];
		x += props.gap[0] + random() * (props.gap[1] - props.gap[0])
	) {
		const piece = props.pieces[Math.floor(random() * props.pieces.length)]
		items.push({
			asset: piece.asset,
			x: Math.round(x),
			bottom: piece.bottom(random),
		})
	}
	return (
		<div
			style={{
				position: 'absolute',
				inset: 0,
				overflow: 'hidden',
				...(props.clipBelow === undefined
					? {}
					: { bottom: `${VIEW_HEIGHT - props.clipBelow}px` }),
			}}
		>
			<div
				class="pixelated"
				style={{
					position: 'absolute',
					left: 0,
					top: 0,
					width: `${STRIP_WIDTH * 2}px`,
					height: `${VIEW_HEIGHT}px`,
					'--strip-width': `${STRIP_WIDTH}px`,
					animation: `strip-scroll ${STRIP_WIDTH / props.speed}s linear infinite`,
				}}
			>
				<For each={[0, STRIP_WIDTH]}>
					{(offset) => (
						<For each={items}>
							{(item) => (
								<img
									src={item.asset}
									alt=""
									style={{
										position: 'absolute',
										left: `${item.x + offset}px`,
										bottom: `${VIEW_HEIGHT - item.bottom}px`,
									}}
								/>
							)}
						</For>
					)}
				</For>
			</div>
		</div>
	)
}

/** Peeking `min`–`max` px over the middle hills, however tall it is. */
const peeking = (asset: string, height: number, min: number, max: number) => ({
	asset,
	bottom: (random: () => number) =>
		Math.round(HORIZON - (min + random() * (max - min)) + height),
})
const standing = (asset: string, ground: number, jitter: number) => ({
	asset,
	bottom: (random: () => number) => Math.round(ground - random() * jitter),
})

/** How many are out running behind the menus. */
const PACK_SIZE = 5

/**
 * Five runners at random: club members, guests, and anyone's own runners too. Only
 * those narrow enough to run in the gaps between each other.
 */
function pickPack(): Playable[] {
	const everyone = [
		...MEMBERS,
		...guests(),
		...customRunners().map(customPlayable),
	].filter((runner) => runner.sprite.width <= 30)
	const shuffled = everyone
		.map((runner) => ({ runner, order: Math.random() }))
		.sort((a, b) => a.order - b.order)
		.map(({ runner }) => runner)
	// Never fewer than five: round again if there aren't enough.
	return Array.from(
		{ length: PACK_SIZE },
		(_, i) => shuffled[i % shuffled.length],
	)
}

/** The header's bus, turned round to chase to the right, built from its parts. */
function Bus(props: { style?: JSX.CSSProperties }) {
	const part = (
		asset: string,
		x: number,
		y: number,
		extra: JSX.CSSProperties = {},
	) => (
		<img
			src={asset}
			alt=""
			style={{ position: 'absolute', left: `${x}px`, top: `${y}px`, ...extra }}
		/>
	)
	const wheel = (asset: string, x: number, y: number, delay: number) =>
		part(asset, x, y, {
			animation: `wheel-bob 0.24s ${delay}s steps(2) infinite`,
		})
	return (
		<div
			class="pixelated"
			style={{
				position: 'absolute',
				width: '247px',
				height: '127px',
				transform: 'scaleX(-1)',
				...props.style,
			}}
		>
			<div style={{ animation: 'bus-bob 0.48s steps(2) infinite' }}>
				{part(shadowAsset, -20, 107, { width: '270px', opacity: 0.1 })}
				{part(busBackAsset, 0, 0)}
				{wheel(wheel1Asset, 73, 105, 0)}
				{wheel(wheel2Asset, 5, 103, 0.06)}
				{wheel(wheel3Asset, 160, 105, 0.12)}
				{wheel(wheel4Asset, 197, 102, 0.18)}
				{part(windowAsset, 26, 26, { opacity: 0.75 })}
				{part(busAsset, 0, 0)}
				{part(scoopAsset, -22, 94, {
					'transform-origin': '80% 80%',
					animation: 'scoop-flick 3.2s ease-in-out infinite',
				})}
			</div>
		</div>
	)
}

export function MenuBackdrop() {
	/** Five of them out running, picked afresh each time the menus come up. */
	const pack = pickPack()
	return (
		<div aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
			<div
				style={{
					position: 'absolute',
					inset: 0,
					background:
						'linear-gradient(to bottom, var(--sky-blue-top), var(--sky-blue-bottom))',
				}}
			/>
			<img
				src={sunAsset}
				alt=""
				class="pixelated"
				style={{
					position: 'absolute',
					top: '150px',
					right: '90px',
					animation: 'sun-pulse 6s ease-in-out infinite',
				}}
			/>
			<For
				each={[
					{ asset: cloud1Asset, y: 170, duration: 70, delay: 0 },
					{ asset: cloud2Asset, y: 220, duration: 95, delay: -40 },
					{ asset: cloud1Asset, y: 250, duration: 120, delay: -90 },
				]}
			>
				{(cloud) => (
					<img
						src={cloud.asset}
						alt=""
						class="pixelated"
						style={{
							position: 'absolute',
							top: `${cloud.y}px`,
							left: 0,
							animation: `cloud-drift ${cloud.duration}s ${cloud.delay}s linear infinite`,
						}}
					/>
				)}
			</For>
			<Band
				asset={bg3Asset}
				top={HORIZON - 20}
				height={43}
				imageWidth={357}
				speed={6}
			/>
			<Strip
				speed={9}
				seed={11}
				gap={[50, 170]}
				clipBelow={HORIZON + 30}
				pieces={[
					peeking(house1Asset, 60, 20, 28),
					peeking(house2Asset, 80, 20, 28),
					peeking(tree2Asset, 110, 30, 50),
				]}
			/>
			<Band
				asset={bg2Asset}
				top={HORIZON}
				height={46}
				imageWidth={482}
				speed={12}
			/>
			<Band
				asset={bg1Asset}
				top={HORIZON}
				height={150}
				imageWidth={1200}
				speed={24}
			/>
			<div
				style={{
					position: 'absolute',
					left: 0,
					right: 0,
					top: `${HORIZON + 149}px`,
					bottom: 0,
					background: 'var(--grass-green)',
				}}
			/>
			<Strip
				speed={40}
				seed={23}
				gap={[110, 300]}
				pieces={[
					standing(tree1Asset, 410, 30),
					standing(tree2Asset, 410, 30),
					standing(shrub1Asset, 430, 6),
				]}
			/>
			<Band
				asset={pathAsset}
				top={PATH_TOP}
				height={67}
				imageWidth={637}
				speed={90}
			/>
			<Strip
				speed={90}
				seed={5}
				gap={[60, 200]}
				pieces={[
					standing(flower1Asset, PATH_TOP + 8, 3),
					standing(flower2Asset, PATH_TOP + 8, 3),
				]}
			/>
			<Bus style={{ left: '40px', top: `${PATH_TOP + 46 - 143}px` }} />
			<For each={pack}>
				{(runner, i) => (
					<div
						style={{
							position: 'absolute',
							// Bunched up to the right, ahead of the bus, clear of the
							// title menu so all five are seen.
							left: `${680 + i() * 55}px`,
							top: `${PATH_TOP + 22 + (i() % 2) * 8 - runner.sprite.height * 2}px`,
							animation: `jostle ${3 + (i() % 3) * 0.7}s ${-i() * 0.9}s ease-in-out infinite`,
						}}
					>
						<RunStrip
							frame={runner.sprite.run[0] ?? ''}
							width={runner.sprite.width}
							height={runner.sprite.height}
							stride={0.36 + (i() % 2) * 0.06}
						/>
					</div>
				)}
			</For>
			{/* A little depth haze over everything, so the menus stand out. */}
			<div
				style={{
					position: 'absolute',
					inset: 0,
					background:
						'linear-gradient(to bottom, rgba(15, 31, 41, 0.15), transparent 40%)',
				}}
			/>
		</div>
	)
}
