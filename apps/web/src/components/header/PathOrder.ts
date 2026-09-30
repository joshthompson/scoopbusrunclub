import type { Controller, ControllerBaseType, Scene } from '@/engine'
import type { Accessor } from 'solid-js'

/** What stands on the path, drawn in order of where its feet touch it. */
const ON_PATH = new Set(['runner', 'furby'])

type OnPath = Controller<ControllerBaseType & { ground: Accessor<number> }>

/**
 * Add runners or furbies to the scene at the depth their feet put them, so
 * someone further up the path is never drawn over someone nearer: slotted in
 * among whoever's in front of the bus rather than appended on top. Their
 * shadows go in with the runners', just under the bus, beneath everyone.
 *
 * Where their feet touch the path never changes, even mid-hop or mid-scoop,
 * so this only needs doing as they're added.
 */
export function addToPath(
	scene: Scene,
	walkers: OnPath[],
	// biome-ignore lint/suspicious/noExplicitAny: necessary for dynamic/WebGL API
	shadows: Controller<any>[] = [],
) {
	// biome-ignore lint/suspicious/noExplicitAny: necessary for dynamic/WebGL API
	const entry = (controller: Controller<any>) => {
		controller.setGame(scene)
		return { id: controller.id, controller }
	}
	const current = [...scene.controllers.get()]
	const busIndex = () =>
		current.findIndex(({ controller }) => controller.type === 'bus')

	const bus = busIndex()
	current.splice(bus === -1 ? current.length : bus, 0, ...shadows.map(entry))

	// Standing volunteers are behind the bus, and keep their own order.
	const start = busIndex() + 1
	for (const walker of walkers) {
		const ground = walker.data.ground()
		const inFront = current.findIndex(
			({ controller }, i) =>
				i >= start &&
				ON_PATH.has(controller.type) &&
				controller.data.ground() > ground,
		)
		current.splice(inFront === -1 ? current.length : inFront, 0, entry(walker))
	}

	scene.controllers.set(current)
}
