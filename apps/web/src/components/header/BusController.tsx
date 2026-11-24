import { isChristmas } from '@/utils/christmas'
import { furbysOn } from '@/utils/furbys'
import {
	type Scene,
	createConnectedController,
	createController,
	createObjectSignal,
} from 'scoopjs'
import { type JSX, createSignal } from 'solid-js'

import busBackAsset from '@/assets/bus/bus-back.png'
import busAsset from '@/assets/bus/bus.png'
import scoopAsset from '@/assets/bus/scoop.png'
import shadowAsset from '@/assets/bus/shadow.png'
import wheel1Asset from '@/assets/bus/wheel1.png'
import wheel2Asset from '@/assets/bus/wheel2.png'
import wheel3Asset from '@/assets/bus/wheel3.png'
import wheel4Asset from '@/assets/bus/wheel4.png'
import windowAsset from '@/assets/bus/windows.png'
import sleighAsset from '@/assets/christmas/sleigh.png'
import type { RunnerController } from './RunnerController'

const BUS_SPEED = 10
const SCOOP_SPEED = 50
const SCOOP_DURATION = 125
const MIN_BUS_START_X = 1100
const MIN_BUS_OFFSCREEN_PX = 250
/** With the furbies out, how long the bus stays away between drives. */
const FURBY_BREAK_MS = 30_000

const BUS_WIDTH = 247

/**
 * At Christmas the bus is a sleigh: just the sleigh and the scoop, no back,
 * wheels, windows or shadow. It's wider and taller than the bus, so it's drawn
 * level with the front of the bus, 6px higher up, which puts the bottom of its
 * runners on the ground where the bus's wheels touch it.
 */
const SLEIGH_WIDTH = 312
const SLEIGH_HEIGHT = 148
const SLEIGH_Y = -6

/** Hidden at Christmas, the bus's parts that the sleigh doesn't have. */
const busPartStyle =
	(style: JSX.CSSProperties = {}) =>
	(): JSX.CSSProperties =>
		isChristmas() ? { display: 'none' } : style

export function createBusController(id: string, scene: Scene) {
	const startX = Math.max(scene.canvas.get().width() + 22, MIN_BUS_START_X) // 22 is the width of the scoop, which is the leftmost part of the bus

	const baseY = 58
	/** Ticks left parked off the edge, giving the furbies the path. */
	let parked = 0
	const bus = createController({
		frames: [busBackAsset],
		init() {
			return {
				id,
				type: 'bus',
				width: () => (isChristmas() ? SLEIGH_WIDTH : BUS_WIDTH),
				height: () => 127,
				// The back of the bus, seen through its windows.
				frames: () => (isChristmas() ? [] : [busBackAsset]),
				...createObjectSignal(startX, 'x'),
				...createObjectSignal(baseY, 'y'),
				...createObjectSignal(0, 'rotation'),
				...createObjectSignal(false, 'scooping'),
			}
		},
		onEnterFrame({ $, $age, $scene }) {
			// Waiting off the edge while the furbies have the path to stomp about
			// on. Putting them away sends it straight back out.
			if (parked > 0 && furbysOn()) {
				parked--
				return
			}
			parked = 0

			const float = Math.cos(10 + $age) * 1
			$.setY(baseY + float)
			$.setX($.x() - BUS_SPEED)
			$.setRotation(Math.random() * 1 - 0.5)

			// Reset, once all of it's off the left edge
			if ($.x() < -$.width()) {
				$.setX(
					Math.max(
						$scene.canvas.get().width() + 22 + MIN_BUS_OFFSCREEN_PX,
						MIN_BUS_START_X,
					),
				)
				if (furbysOn())
					parked = FURBY_BREAK_MS / ($scene.options.frameRate ?? 40)
			}

			// Scoop the runners
			const bodyController = $scene.getControllersByType('bus-bus-body')?.[0]
			if (bodyController && !$.scooping()) {
				const scoopXStart = $.x()
				const scoopXEnd = scoopXStart + 88

				// Furbies get scooped too, and carry everything this needs.
				for (const controller of [
					...$scene.getControllersByType<RunnerController>('runner'),
					...$scene.getControllersByType<RunnerController>('furby'),
				]) {
					const x = controller.data.x() + controller.data.width()
					if (
						!controller.data.scooped() &&
						// Only what's down at the bus's height, not a furby still up
						// above the screen or raining down past it.
						controller.data.y() + controller.data.height() > $.y() &&
						x >= scoopXStart &&
						x <= scoopXEnd
					) {
						controller.data.setScooped(true)
						controller.data.setYSpeed(
							SCOOP_SPEED * -1 * (1 + Math.random() * 0.6),
						)
						$.setScooping(true)
						setTimeout(() => $.setScooping(false), SCOOP_DURATION)
					}
				}
			}
		},
	})

	// Attach items
	bus.attach(
		createConnectedController({
			type: 'bus-shadow',
			base: bus,
			frames: [shadowAsset],
			width: () => 270,
			height: () => 50,
			offset: { x: -20, y: 107 },
			style: busPartStyle({ opacity: 0.1 }),
		}),
	)
	bus.attach(
		createConnectedController({
			type: 'bus-wheel1',
			base: bus,
			frames: [wheel1Asset],
			width: () => 34,
			height: () => 38,
			offset: { x: 73, y: 105 },
			y: (_, $age) => Math.cos(10 + $age) * -1,
			style: busPartStyle(),
		}),
	)
	bus.attach(
		createConnectedController({
			type: 'bus-wheel2',
			base: bus,
			frames: [wheel2Asset],
			width: () => 34,
			height: () => 38,
			offset: { x: 5, y: 103 },
			y: (_, $age) => Math.cos(10 + $age + 5) * -1,
			style: busPartStyle(),
		}),
	)
	bus.attach(
		createConnectedController({
			type: 'bus-wheel3',
			base: bus,
			frames: [wheel3Asset],
			width: () => 19,
			height: () => 23,
			offset: { x: 160, y: 105 },
			y: (_, $age) => Math.cos(10 + $age + 10) * -1,
			style: busPartStyle(),
		}),
	)
	bus.attach(
		createConnectedController({
			type: 'bus-wheel4',
			base: bus,
			frames: [wheel4Asset],
			width: () => 26,
			height: () => 30,
			offset: { x: 197, y: 102 },
			y: (_, $age) => Math.cos(10 + $age + 15) * -1,
			style: busPartStyle(),
		}),
	)
	bus.attach(
		createConnectedController({
			type: 'bus-window',
			base: bus,
			frames: [windowAsset],
			width: () => 212,
			height: () => 40,
			offset: { x: 26, y: 26 },
			style: busPartStyle({ opacity: 0.75 }),
		}),
	)
	bus.attach(
		createConnectedController({
			type: 'bus-body',
			base: bus,
			frames: [busAsset],
			width: () => (isChristmas() ? SLEIGH_WIDTH : BUS_WIDTH),
			height: () => (isChristmas() ? SLEIGH_HEIGHT : 127),
			offset: { x: 0, y: 0 },
			y: () => (isChristmas() ? SLEIGH_Y : 0),
			init: () => ({
				frames: () => (isChristmas() ? [sleighAsset] : [busAsset]),
			}),
		}),
	)
	// How far the scoop has swung up, from 0 to 1: stepped each tick, as
	// the canvas can't run a CSS transition.
	const [scoopLift, setScoopLift] = createSignal(0)
	bus.attach(
		createConnectedController({
			type: 'bus-scoop',
			base: bus,
			frames: [scoopAsset],
			width: () => 88,
			height: () => 57,
			offset: { x: -22, y: 94 },
			onEnterFrame: ({ $scene }) => {
				// Up or down in half the scoop's time.
				const step = ($scene.options.frameRate ?? 40) / (SCOOP_DURATION / 2)
				const target = bus.data.scooping() ? 1 : 0
				setScoopLift((lift) =>
					lift < target
						? Math.min(target, lift + step)
						: Math.max(target, lift - step),
				)
			},
			style: () => ({
				transform: `translateY(${-45 * scoopLift()}px) rotate(${10 * scoopLift()}deg)`,
			}),
		}),
	)

	return bus
}
