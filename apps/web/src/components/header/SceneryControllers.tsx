import { createController, createObjectSignal } from '@/engine'

import cloud1Asset from '@/assets/misc/cloud1.png'
import cloud2Asset from '@/assets/misc/cloud2.png'
import flower1Asset from '@/assets/misc/flower1.png'
import flower2Asset from '@/assets/misc/flower2.png'
import flower3Asset from '@/assets/misc/flower3.png'
import flower4Asset from '@/assets/misc/flower4.png'
import signAsset from '@/assets/misc/pr-sign.png'
import snowmanAsset from '@/assets/misc/snowman.png'
import shrub1Asset from '@/assets/misc/shrub1.png'
import tree1Asset from '@/assets/misc/tree1.png'
import tree2Asset from '@/assets/misc/tree2.png'
import { isSnowy } from '@/utils/snow'
import { css } from '@style/css'

const trees = [
	{ asset: tree1Asset, w: 87, h: 120 },
	{ asset: tree2Asset, w: 56, h: 110 },
]
export function createTreeController(id: string, x: number) {
	const size = Math.random() * 0.25 + 1
	const tree = trees[Math.floor(Math.random() * trees.length)]
	// Rolled once here rather than inside the accessors: `x` and `y` are read on
	// every render and by the snowman's placement check, and a fresh
	// `Math.random()` per read would give a different answer each time.
	const jitterX = Math.random() * 150 - 75
	const jitterY = Math.random() * 5
	return createController({
		frames: [tree.asset],
		init() {
			return {
				id,
				type: 'tree',
				width: () => tree.w * size,
				height: () => 120 * size,
				x: () => x + jitterX,
				y: () => 10 + jitterY,
				frameInterval: () => Number.POSITIVE_INFINITY,
			}
		},
	})
}

const plants = [
	{ asset: flower1Asset, w: 12, h: 14 },
	{ asset: flower2Asset, w: 11, h: 11 },
	{ asset: flower3Asset, w: 12, h: 12 },
	{ asset: flower4Asset, w: 11, h: 9 },
	{ asset: shrub1Asset, w: 24, h: 14 },
]
export function createPlantController(id: string, x: number) {
	const size = Math.random() * 1 + 1
	const plant = plants[Math.floor(Math.random() * plants.length)]
	const xScale = Math.random() < 0.5 ? -1 : 1
	return createController({
		frames: [plant.asset],
		init() {
			return {
				id,
				type: 'plant',
				width: () => plant.w * size,
				height: () => plant.h * size,
				x: () => x + Math.random() * 100 - 50,
				y: () => 130 + Math.random() * 11,
				xScale: () => xScale,
				frameInterval: () => Number.POSITIVE_INFINITY,
			}
		},
	})
}

const clouds = [
	{ asset: cloud1Asset, w: 74, h: 26 },
	{ asset: cloud2Asset, w: 74, h: 26 },
]
export function createCloudController(id: string, x: number, startX: number) {
	const size = Math.random() * 0.5 + 1
	const cloud = clouds[Math.floor(Math.random() * clouds.length)]
	const xScale = Math.random() < 0.5 ? -1 : 1
	return createController({
		frames: [cloud.asset],
		init() {
			return {
				id,
				type: 'cloud',
				width: () => cloud.w * size,
				height: () => cloud.h * size,
				xScale: () => xScale,
				...createObjectSignal(x + Math.random() * 200 - 100, 'x'),
				...createObjectSignal(Math.random() * 20 + 5, 'y'),
				frameInterval: () => Number.POSITIVE_INFINITY,
				class: () => css({ opacity: 'var(--cloud-opacity)' }),
			}
		},
		onEnterFrame({ $, $age }) {
			if ($age % 3 === 0) $.setX($.x() - 1)

			if ($.x() < -100) {
				$.setX(startX)
				$.setY(Math.random() * 40 + 5)
			}
		},
	})
}

const SIGN_SCALE = 1
export function createSignController(id: string) {
	return createController({
		frames: [signAsset],
		randomStartFrame: true,
		init() {
			return {
				id,
				type: 'sign',
				x: () => 50,
				y: () => 160 - 35 * SIGN_SCALE, // 34 is the height of the sign asset
				width: () => 70 * SIGN_SCALE,
				height: () => 35 * SIGN_SCALE,
				frameInterval: () => Number.POSITIVE_INFINITY,
			}
		},
	})
}

/**
 * Top of the path, matching the underlay's `backgroundPosition: '0px 158px'`.
 * The snowman stands on the grass just above it — behind the runners, who run
 * on the path itself.
 */
const PATH_TOP_Y = 158

/**
 * `snowman.png` drawn 1:1. The scale has to stay a whole number — at 0.75 the
 * document-wide `image-rendering: pixelated` dropped every fourth row and column,
 * which broke the twig arms into loose specks and left the buttons different
 * sizes. The next valid step up, 2, would be taller than the trees.
 */
const SNOWMAN_WIDTH = 32
const SNOWMAN_HEIGHT = 64

/** Clear of a tree by this much, so they never quite touch. */
const SNOWMAN_TREE_GAP = 8

/** Only the horizontal extent matters — everything here stands on the same ground. */
interface Span {
	x: () => number
	width: () => number
}

/**
 * A random x for the snowman that doesn't land on a tree.
 *
 * Sampled rather than solved: the trees are jittered, so which gaps exist isn't
 * known until they've been built. Falls back to the middle of the widest gap if
 * every sample happens to hit one, so this always returns somewhere valid.
 */
function pickClearX(trees: Span[], sceneWidth: number): number {
	const blocked = trees
		.map(
			(tree) =>
				[
					tree.x() - SNOWMAN_TREE_GAP - SNOWMAN_WIDTH,
					tree.x() + tree.width() + SNOWMAN_TREE_GAP,
				] as const,
		)
		.sort((a, b) => a[0] - b[0])

	const maxX = Math.max(0, sceneWidth - SNOWMAN_WIDTH)
	const clear = (x: number) => !blocked.some(([from, to]) => x > from && x < to)

	for (let attempt = 0; attempt < 200; attempt++) {
		const x = Math.random() * maxX
		if (clear(x)) return x
	}

	let best = 0
	let bestWidth = -1
	let cursor = 0
	for (const [from, to] of [...blocked, [maxX, maxX] as const]) {
		const width = from - cursor
		if (width > bestWidth) {
			bestWidth = width
			best = cursor + width / 2
		}
		cursor = Math.max(cursor, to)
	}
	return Math.min(Math.max(best, 0), maxX)
}

/**
 * A snowman on the grass, in a gap between the trees.
 *
 * Hidden reactively rather than left out of the scene: the scene is built once
 * on mount, before the weather has loaded, so a snow check at construction time
 * would almost always come back false — and `setSnow()` from the console would
 * never bring it back.
 */
const snowmanHidden = css({ display: 'none' })
export function createSnowmanController(
	id: string,
	trees: Span[],
	sceneWidth: number,
) {
	const x = pickClearX(trees, sceneWidth)
	return createController({
		frames: [snowmanAsset],
		init() {
			return {
				id,
				type: 'snowman',
				width: () => SNOWMAN_WIDTH,
				height: () => SNOWMAN_HEIGHT,
				x: () => x,
				y: () => PATH_TOP_Y - SNOWMAN_HEIGHT - 30,
				frameInterval: () => Number.POSITIVE_INFINITY,
				class: () => (isSnowy() ? '' : snowmanHidden),
			}
		},
	})
}
