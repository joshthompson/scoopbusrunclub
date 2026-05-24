import {
	AbstractMesh,
	Color3,
	type Mesh,
	MeshBuilder,
	type Scene,
	SceneLoader,
	StandardMaterial,
	TransformNode,
	Vector3,
} from '@babylonjs/core'
import '@babylonjs/loaders/glTF'
import type { RunnerAppearance } from '../characters'
import {
	HAIR_COLOR_HEX,
	SKIN_TONE_HEX,
	hexToColor3,
	resolveColor,
} from '../characters'
import type { PreviewRunnerRole } from '../systems/previewRunners'

import runnerModelUrl from '../../assets/models/runner.glb?url'

// ═══════════════════════════════════════
// GLB-based runner model
// ═══════════════════════════════════════

/** Target height for the "standart" (standard) model variant in metres. */
const TARGET_HEIGHT = 1.7

/**
 * Cached containers per scene. We load once per scene and instantiate clones
 * so that createRunnerModel can remain synchronous after preloading.
 */
const containerCache = new WeakMap<
	Scene,
	Awaited<ReturnType<typeof SceneLoader.LoadAssetContainerAsync>>
>()

/**
 * Preload the runner GLB. Call once during scene setup before any
 * createRunnerModel calls. Safe to call multiple times (no-ops after first).
 */
export async function preloadRunnerModel(scene: Scene): Promise<void> {
	if (containerCache.has(scene)) return
	const container = await SceneLoader.LoadAssetContainerAsync(
		'',
		runnerModelUrl,
		scene,
	)
	containerCache.set(scene, container)
}

export interface RunnerModelResult {
	/** Root node – position/rotate this to move the runner */
	root: TransformNode
	/** Pivot nodes for animation */
	leftArm: TransformNode
	rightArm: TransformNode
	leftLeg: TransformNode
	rightLeg: TransformNode
	leftShoe: Mesh
	rightShoe: Mesh
}

/**
 * Create a runner from the preloaded runner.glb model.
 *
 * Conditionally renders body variant, hair, facial hair, cap, and applies
 * colours based on RunnerAppearance.
 *
 * Call `preloadRunnerModel(scene)` once before using this function.
 */
export function createRunnerModel(
	scene: Scene,
	id: number,
	_tshirtColor: Color3,
	appearance?: RunnerAppearance,
): RunnerModelResult {
	const root = new TransformNode(`runner_${id}`, scene)

	const cachedContainer = containerCache.get(scene)
	if (cachedContainer) {
		// Instantiate a clone from the cached container
		const instance = cachedContainer.instantiateModelsToScene(
			(name) => `${name}_${id}`,
		)

		// Wrapper node that ALL instantiated content goes under.
		// This ensures scale/position affects everything regardless of GLB structure.
		const glbWrapper = new TransformNode(`glbWrap_${id}`, scene)
		glbWrapper.parent = root

		// Parent ALL instance root nodes under the wrapper
		for (const node of instance.rootNodes) {
			node.parent = glbWrapper
		}

		// Find the __root__ node (parent of all variants)
		let glbRoot: TransformNode | undefined
		for (const child of glbWrapper.getChildren()) {
			if (child instanceof TransformNode) {
				glbRoot = child
				break
			}
		}

		if (glbRoot) {
			// Determine which body variant to show
			const modelVariant = appearance?.model ?? 'standard'
			const bodyName = modelVariant === 'kid' ? 'kid' : 'standart'

			// Body variant prefix for sub-mesh lookups
			// Meshes are named: standart_primitive0, standart_primitive1, ... standart_primitive7
			const bodyMeshPrefix = `${bodyName}_primitive`

			// All top-level children that are togglable parts
			const allVariants = ['high', 'kid', 'standart']
			const allHair = ['short', 'medium', 'long ', 'ponytail']
			const allFacialHair = ['beard', 'long_beard', 'moustache', 'stubble']
			const allAccessories = ['cap', 'color']

			// Hide everything first, then selectively show
			for (const child of glbRoot.getChildren()) {
				if (child instanceof TransformNode) {
					setNodeEnabled(child, false)
				}
			}

			// --- Show body variant ---
			const bodyNode = findDirectChild(glbRoot, bodyName, id)
			if (bodyNode) {
				setNodeEnabled(bodyNode, true)

				// Apply top colour based on top style
				// primitive0 = head/neck/hands (always skin)
				// primitive1 = upper arm (varies by top style)
				// primitive2 = torso (always top colour)
				// primitive3 = lower arm/wrist
				if (appearance) {
					const topColor = hexToColor3(resolveColor(appearance.topColor))
					const skinColor = hexToColor3(SKIN_TONE_HEX[appearance.skin])

					// primitive0 is always skin (head, neck, hands)
					applyColorToMeshByName(
						bodyNode,
						`${bodyMeshPrefix}0`,
						skinColor,
						scene,
						id,
					)
					// primitive2 is always top colour (torso)
					applyColorToMeshByName(
						bodyNode,
						`${bodyMeshPrefix}2`,
						topColor,
						scene,
						id,
					)

					if (appearance.top === 'vest') {
						// Vest: primitive1 and primitive3 are skin (bare arms)
						applyColorToMeshByName(
							bodyNode,
							`${bodyMeshPrefix}1`,
							skinColor,
							scene,
							id,
						)
						applyColorToMeshByName(
							bodyNode,
							`${bodyMeshPrefix}3`,
							skinColor,
							scene,
							id,
						)
					} else if (appearance.top === 'tshirt') {
						// T-shirt: primitive1 is top colour (upper arm), primitive3 is skin (lower arm)
						applyColorToMeshByName(
							bodyNode,
							`${bodyMeshPrefix}1`,
							topColor,
							scene,
							id,
						)
						applyColorToMeshByName(
							bodyNode,
							`${bodyMeshPrefix}3`,
							skinColor,
							scene,
							id,
						)
					} else {
						// Long sleeve: all top colour
						applyColorToMeshByName(
							bodyNode,
							`${bodyMeshPrefix}1`,
							topColor,
							scene,
							id,
						)
						applyColorToMeshByName(
							bodyNode,
							`${bodyMeshPrefix}3`,
							topColor,
							scene,
							id,
						)
					}
				}

				// Apply bottom colour based on bottom style
				if (appearance) {
					const bottomColor = hexToColor3(resolveColor(appearance.bottomColor))
					const skinColor = hexToColor3(SKIN_TONE_HEX[appearance.skin])

					// primitive4 is always bottom colour
					applyColorToMeshByName(
						bodyNode,
						`${bodyMeshPrefix}4`,
						bottomColor,
						scene,
						id,
					)

					if (appearance.bottom === 'shorts') {
						// Shorts: primitive5 is skin (bare leg), primitive6 is skin or sock colour
						applyColorToMeshByName(
							bodyNode,
							`${bodyMeshPrefix}5`,
							skinColor,
							scene,
							id,
						)
						if (appearance.socks) {
							const sockColor = hexToColor3(resolveColor(appearance.socks))
							applyColorToMeshByName(
								bodyNode,
								`${bodyMeshPrefix}6`,
								sockColor,
								scene,
								id,
							)
						} else {
							applyColorToMeshByName(
								bodyNode,
								`${bodyMeshPrefix}6`,
								skinColor,
								scene,
								id,
							)
						}
					} else {
						// Trousers: all bottom colour
						applyColorToMeshByName(
							bodyNode,
							`${bodyMeshPrefix}5`,
							bottomColor,
							scene,
							id,
						)
						if (appearance.socks) {
							const sockColor = hexToColor3(resolveColor(appearance.socks))
							applyColorToMeshByName(
								bodyNode,
								`${bodyMeshPrefix}6`,
								sockColor,
								scene,
								id,
							)
						} else {
							applyColorToMeshByName(
								bodyNode,
								`${bodyMeshPrefix}6`,
								bottomColor,
								scene,
								id,
							)
						}
					}
				}
			}

			// --- Hair ---
			const hairStyle = appearance?.hair ?? 'short'
			if (hairStyle !== 'bald') {
				// Map HairStyle to GLB node name
				const hairNodeName = hairStyle === 'long' ? 'long ' : hairStyle
				const hairNode = findDirectChild(glbRoot, hairNodeName, id)
				if (hairNode) {
					setNodeEnabled(hairNode, true)
					if (appearance) {
						const hairColor = hexToColor3(HAIR_COLOR_HEX[appearance.hairColor])
						applyColorToAllMeshes(hairNode, hairColor, scene, id)
					}
					// For kid model, offset hair to align with the smaller head
					if (modelVariant === 'kid' && bodyNode) {
						const headOffset = getKidHeadOffset(bodyNode, hairNode, id)
						if (headOffset !== 0) {
							hairNode.position.y += headOffset
						}
					}
				}
			}

			// --- Ponytail scrunchie colour (matches top colour) ---
			if (hairStyle === 'ponytail' && appearance) {
				const topColor = hexToColor3(resolveColor(appearance.topColor))
				// ponytail_primitive1 is the scrunchie mesh
				const scrunchie = findMeshByName(glbRoot, 'ponytail_primitive1', id)
				if (scrunchie) {
					const mat = new StandardMaterial(`rScrunchie_${id}`, scene)
					mat.diffuseColor = topColor
					mat.specularColor = Color3.Black()
					scrunchie.material = mat
				}
			}

			// --- Facial hair ---
			if (appearance?.facialHair) {
				const fhMap: Record<string, string> = {
					moustache: 'moustache',
					stubble: 'stubble',
					beard: 'beard',
					longBeard: 'long_beard',
				}
				const fhNodeName = fhMap[appearance.facialHair]
				if (fhNodeName) {
					const fhNode = findDirectChild(glbRoot, fhNodeName, id)
					if (fhNode) {
						setNodeEnabled(fhNode, true)
						const hairColor = hexToColor3(HAIR_COLOR_HEX[appearance.hairColor])
						applyColorToAllMeshes(fhNode, hairColor, scene, id)
						// For kid model, offset facial hair to align with the smaller head
						if (modelVariant === 'kid' && bodyNode) {
							const headOffset = getKidHeadOffset(bodyNode, fhNode, id)
							if (headOffset !== 0) {
								fhNode.position.y += headOffset
							}
						}
					}
				}
			}

			// --- Cap (hat) ---
			if (appearance?.hat) {
				const capNode = findDirectChild(glbRoot, 'cap', id)
				if (capNode) {
					setNodeEnabled(capNode, true)
					const hatColor = hexToColor3(resolveColor(appearance.hat))
					applyColorToAllMeshes(capNode, hatColor, scene, id)
					// For kid model, offset cap to align with the smaller head
					if (modelVariant === 'kid' && bodyNode) {
						const headOffset = getKidHeadOffset(bodyNode, capNode, id)
						if (headOffset !== 0) {
							capNode.position.y += headOffset
						}
					}
				}
			}

			// --- Shoe colour (primitive7 of the body variant) ---
			if (bodyNode) {
				const shoeHex = appearance?.shoeColor
					? resolveColor(appearance.shoeColor)
					: '#EEEEEE'
				const shoeColor = hexToColor3(shoeHex)
				applyColorToMeshByName(
					bodyNode,
					`${bodyMeshPrefix}7`,
					shoeColor,
					scene,
					id,
				)
			}

			// --- Scale and position ---
			// Measure body meshes using world-space bounds for accurate extents
			const heightScale = appearance?.heightScale ?? 1
			const targetH = TARGET_HEIGHT * heightScale

			let minY = Number.POSITIVE_INFINITY
			let maxY = Number.NEGATIVE_INFINITY

			// Only measure body variant meshes (not hair/accessories) for positioning
			const measureNode = bodyNode ?? glbRoot
			glbWrapper.computeWorldMatrix(true)
			for (const mesh of measureNode.getChildMeshes(false)) {
				if (!mesh.isEnabled()) continue
				mesh.computeWorldMatrix(true)
				const bounds = mesh.getBoundingInfo().boundingBox
				if (bounds.minimumWorld.y < minY) minY = bounds.minimumWorld.y
				if (bounds.maximumWorld.y > maxY) maxY = bounds.maximumWorld.y
			}
			// Also measure the body node itself if it's a mesh (single-primitive case)
			if (measureNode instanceof AbstractMesh) {
				measureNode.computeWorldMatrix(true)
				const bounds = measureNode.getBoundingInfo().boundingBox
				if (bounds.minimumWorld.y < minY) minY = bounds.minimumWorld.y
				if (bounds.maximumWorld.y > maxY) maxY = bounds.maximumWorld.y
			}

			if (minY === Number.POSITIVE_INFINITY) {
				minY = 0
				maxY = 1
			}

			const rawHeight = maxY - minY || 1
			const scale = targetH / rawHeight

			glbWrapper.scaling.setAll(scale)
			// Position so feet are at y=0
			glbWrapper.position.y = -minY * scale
		}
	}

	// Arm/leg pivots – the GLB is a static mesh so these are inert transform
	// nodes for now. They maintain API compatibility with the pose system.
	const leftArmPivot = new TransformNode(`rLArmPiv_${id}`, scene)
	leftArmPivot.parent = root
	const rightArmPivot = new TransformNode(`rRArmPiv_${id}`, scene)
	rightArmPivot.parent = root
	const leftLegPivot = new TransformNode(`rLLegPiv_${id}`, scene)
	leftLegPivot.parent = root
	const rightLegPivot = new TransformNode(`rRLegPiv_${id}`, scene)
	rightLegPivot.parent = root

	// Placeholder shoe meshes (hidden) for API compatibility
	const leftShoe = MeshBuilder.CreateBox(
		`rLShoe_${id}`,
		{ width: 0.01, height: 0.01, depth: 0.01 },
		scene,
	)
	leftShoe.parent = leftLegPivot
	leftShoe.setEnabled(false)

	const rightShoe = MeshBuilder.CreateBox(
		`rRShoe_${id}`,
		{ width: 0.01, height: 0.01, depth: 0.01 },
		scene,
	)
	rightShoe.parent = rightLegPivot
	rightShoe.setEnabled(false)

	return {
		root,
		leftArm: leftArmPivot,
		rightArm: rightArmPivot,
		leftLeg: leftLegPivot,
		rightLeg: rightLegPivot,
		leftShoe,
		rightShoe,
	}
}

// ── Helpers ──

/**
 * Compute the Y offset needed to align an accessory node (hair/cap/facial hair)
 * with the kid body's head. The accessories are positioned in the GLB for the
 * 'standart' body, so for the 'kid' body we need to shift them down to match.
 */
function getKidHeadOffset(
	bodyNode: TransformNode,
	accessoryNode: TransformNode,
	id: number,
): number {
	// Find the head/skin mesh (primitive0) of the kid body to get head top Y
	let bodyHeadMaxY = Number.NEGATIVE_INFINITY
	const headMeshName = `kid_primitive0_${id}`
	for (const mesh of bodyNode.getChildMeshes(false)) {
		if (mesh.name === headMeshName || mesh.name.startsWith('kid_primitive0')) {
			mesh.computeWorldMatrix(true)
			const bounds = mesh.getBoundingInfo().boundingBox
			if (bounds.maximumWorld.y > bodyHeadMaxY) {
				bodyHeadMaxY = bounds.maximumWorld.y
			}
		}
	}

	if (bodyHeadMaxY === Number.NEGATIVE_INFINITY) return 0

	// Find the bottom Y of the accessory (hair/cap) to see where it starts
	let accessoryMinY = Number.POSITIVE_INFINITY
	for (const mesh of accessoryNode.getChildMeshes(false)) {
		mesh.computeWorldMatrix(true)
		const bounds = mesh.getBoundingInfo().boundingBox
		if (bounds.minimumWorld.y < accessoryMinY) {
			accessoryMinY = bounds.minimumWorld.y
		}
	}
	// Single-mesh node case
	if (accessoryNode instanceof AbstractMesh) {
		accessoryNode.computeWorldMatrix(true)
		const bounds = accessoryNode.getBoundingInfo().boundingBox
		if (bounds.minimumWorld.y < accessoryMinY) {
			accessoryMinY = bounds.minimumWorld.y
		}
	}

	if (accessoryMinY === Number.POSITIVE_INFINITY) return 0

	// If the accessory is floating above the head, offset it down
	const gap = accessoryMinY - bodyHeadMaxY
	if (gap > 0.001) {
		return -gap
	}
	return 0
}

/** Find a direct child of parent whose name starts with `prefix` (with _id suffix from instantiation). */
function findDirectChild(
	parent: TransformNode,
	prefix: string,
	id: number,
): TransformNode | null {
	const target = `${prefix}_${id}`
	for (const child of parent.getChildren()) {
		if (child instanceof TransformNode && child.name === target) {
			return child
		}
	}
	// Fallback: partial match (in case naming varies)
	for (const child of parent.getChildren()) {
		if (child instanceof TransformNode && child.name.startsWith(prefix)) {
			return child
		}
	}
	return null
}

/** Find a mesh by name anywhere in the hierarchy. */
function findMeshByName(
	parent: TransformNode,
	prefix: string,
	id: number,
): Mesh | null {
	const target = `${prefix}_${id}`
	for (const mesh of parent.getChildMeshes(false)) {
		if (mesh.name === target || mesh.name.startsWith(prefix)) {
			return mesh as Mesh
		}
	}
	return null
}

/** Apply a diffuse colour to a mesh found by name within a parent node. */
function applyColorToMeshByName(
	parent: TransformNode,
	meshName: string,
	color: Color3,
	scene: Scene,
	id: number,
): void {
	// Instantiation renames "standart_primitive0" → "standart_primitive0_${id}"
	const target = `${meshName}_${id}`
	for (const mesh of parent.getChildMeshes(false)) {
		if (mesh.name === target) {
			const mat = new StandardMaterial(`mat_${meshName}_${id}`, scene)
			mat.diffuseColor = color
			mat.specularColor = Color3.Black()
			mesh.material = mat
			return
		}
	}
}

/** Apply a colour to all meshes under a node (handles single-mesh GLB nodes). */
function applyColorToAllMeshes(
	node: TransformNode,
	color: Color3,
	scene: Scene,
	id: number,
): void {
	const mat = new StandardMaterial(`mat_${node.name}_${id}`, scene)
	mat.diffuseColor = color
	mat.specularColor = Color3.Black()
	const childMeshes = node.getChildMeshes(false)
	if (childMeshes.length > 0) {
		for (const mesh of childMeshes) {
			mesh.material = mat
		}
	} else if (node instanceof AbstractMesh) {
		// Single-material GLB node: the node IS the mesh (no children)
		node.material = mat
	}
}

/** Enable/disable a node and all its child meshes. */
function setNodeEnabled(node: TransformNode, enabled: boolean): void {
	node.setEnabled(enabled)
}

function findNodeByName(
	node: TransformNode,
	name: string,
): TransformNode | null {
	if (node.name.toLowerCase().includes(name.toLowerCase())) return node
	for (const child of node.getChildren()) {
		if (child instanceof TransformNode) {
			const found = findNodeByName(child, name)
			if (found) return found
		}
	}
	return null
}

function hideNode(node: TransformNode, keep?: TransformNode): void {
	if (node === keep) return
	for (const mesh of node.getChildMeshes(false)) {
		if (keep && mesh.isDescendantOf(keep)) continue
		mesh.setEnabled(false)
	}
}

// ── Pose helpers (call each frame) ──

/** Swing arms and legs in a running motion. `phase` advances with time × speed. */
export function poseRunning(model: RunnerModelResult, phase: number): void {
	model.root.rotation.x = 0
	const swing = Math.sin(phase) * 0.7
	model.leftArm.rotation.x = swing
	model.rightArm.rotation.x = -swing
	model.leftLeg.rotation.x = -swing
	model.rightLeg.rotation.x = swing
	model.leftArm.rotation.z = 0
	model.rightArm.rotation.z = 0
	model.leftLeg.rotation.z = 0
	model.rightLeg.rotation.z = 0
}

/** Arms and legs flail randomly while airborne. */
export function poseFlailing(model: RunnerModelResult, phase: number): void {
	model.leftArm.rotation.x = Math.sin(phase * 3.7) * 1.5
	model.leftArm.rotation.z = Math.sin(phase * 2.3) * 0.8 - 0.4
	model.rightArm.rotation.x = Math.sin(phase * 4.1 + 1) * 1.5
	model.rightArm.rotation.z = -Math.sin(phase * 2.7 + 0.5) * 0.8 + 0.4
	model.leftLeg.rotation.x = Math.sin(phase * 3.2 + 2) * 1.0
	model.leftLeg.rotation.z = Math.sin(phase * 1.9) * 0.3
	model.rightLeg.rotation.x = Math.sin(phase * 3.6 + 0.7) * 1.0
	model.rightLeg.rotation.z = -Math.sin(phase * 2.1 + 1.3) * 0.3
}

/** Jump pose: arms raised, legs slightly tucked, no frantic flailing. */
export function poseJump(
	model: RunnerModelResult,
	lift = 1,
	lateralLean = 0,
): void {
	const heightT = Math.max(0, Math.min(1, lift))
	const lean = Math.max(-1, Math.min(1, lateralLean))

	const armRaiseX = -0.45 + heightT * -1.75
	const armSpreadZ = 0.08 + heightT * 0.2
	const legLiftX = 0.1 + heightT * 0.55
	const legSplayZ = 0.03 + heightT * 0.12

	model.leftArm.rotation.x = armRaiseX
	model.rightArm.rotation.x = armRaiseX
	model.leftArm.rotation.z = -armSpreadZ + lean * 0.2
	model.rightArm.rotation.z = armSpreadZ + lean * 0.2

	model.leftLeg.rotation.x = legLiftX
	model.rightLeg.rotation.x = legLiftX
	model.leftLeg.rotation.z = -legSplayZ - lean * 0.12
	model.rightLeg.rotation.z = legSplayZ - lean * 0.12
}

/** Tucked pose for somersault: arms hugged to chest, legs pulled up forward. */
export function poseTuck(model: RunnerModelResult): void {
	model.leftArm.rotation.x = -1.8
	model.leftArm.rotation.z = 0.4
	model.rightArm.rotation.x = -1.8
	model.rightArm.rotation.z = -0.4
	model.leftLeg.rotation.x = -1.4
	model.leftLeg.rotation.z = -0.05
	model.rightLeg.rotation.x = -1.4
	model.rightLeg.rotation.z = 0.05
}

/** Sitting pose: legs forward and flat, arms resting at sides. */
export function poseSitting(model: RunnerModelResult): void {
	model.leftLeg.rotation.x = -Math.PI / 2
	model.leftLeg.rotation.z = -0.1
	model.rightLeg.rotation.x = -Math.PI / 2
	model.rightLeg.rotation.z = 0.1
	model.leftArm.rotation.x = 0.2
	model.leftArm.rotation.z = -0.15
	model.rightArm.rotation.x = 0.2
	model.rightArm.rotation.z = 0.15
}

/**
 * Animated sitting pose: legs stay put, but one arm occasionally
 * raises up and waves.
 */
export function poseSittingAnimated(
	model: RunnerModelResult,
	phase: number,
): void {
	model.leftLeg.rotation.x = -Math.PI / 2
	model.leftLeg.rotation.z = -0.1
	model.rightLeg.rotation.x = -Math.PI / 2
	model.rightLeg.rotation.z = 0.1

	const cycleDuration = 10
	const waveDuration = 2.5
	const cycle = ((phase % cycleDuration) + cycleDuration) % cycleDuration
	const cycleIndex = Math.floor(
		(phase < 0 ? phase + 1e6 : phase) / cycleDuration,
	)
	const useLeft = cycleIndex % 2 === 0

	const wavingArm = useLeft ? model.leftArm : model.rightArm
	const restingArm = useLeft ? model.rightArm : model.leftArm
	const sideSign = useLeft ? -1 : 1

	restingArm.rotation.x = 0.2
	restingArm.rotation.z = sideSign * -0.15

	if (cycle < waveDuration) {
		const t = cycle
		const rampUp = 0.4
		const rampDown = 0.4
		let raise: number
		if (t < rampUp) {
			raise = t / rampUp
		} else if (t > waveDuration - rampDown) {
			raise = (waveDuration - t) / rampDown
		} else {
			raise = 1
		}

		const waveOsc = Math.sin(phase * 8) * 0.25
		wavingArm.rotation.x = 0.2 * (1 - raise) + -2.8 * raise
		wavingArm.rotation.z =
			sideSign * (0.15 * (1 - raise) + (0.5 + waveOsc) * raise)
	} else {
		wavingArm.rotation.x = 0.2
		wavingArm.rotation.z = sideSign * 0.15
	}
}

/** Neutral standing pose. */
export function poseStanding(model: RunnerModelResult): void {
	model.root.rotation.x = 0
	model.leftArm.rotation.x = 0
	model.leftArm.rotation.z = 0
	model.rightArm.rotation.x = 0
	model.rightArm.rotation.z = 0
	model.leftLeg.rotation.x = 0
	model.leftLeg.rotation.z = 0
	model.rightLeg.rotation.x = 0
	model.rightLeg.rotation.z = 0
}

/** Front crawl swimming pose. */
export function poseSwimming(model: RunnerModelResult, phase: number): void {
	model.leftArm.rotation.x = phase % (Math.PI * 2)
	model.rightArm.rotation.x = (phase + Math.PI) % (Math.PI * 2)
	model.leftArm.rotation.z = 0
	model.rightArm.rotation.z = 0

	const kick = Math.sin(phase * 3) * 0.25
	model.leftLeg.rotation.x = kick
	model.rightLeg.rotation.x = -kick
	model.leftLeg.rotation.z = 0
	model.rightLeg.rotation.z = 0
}

/**
 * Running + one arm raised waving.
 */
export function poseWaving(
	model: RunnerModelResult,
	runPhase: number,
	t: number,
	side: number,
): void {
	const legSwing = Math.sin(runPhase) * 0.7
	model.leftLeg.rotation.x = -legSwing
	model.leftLeg.rotation.z = 0
	model.rightLeg.rotation.x = legSwing
	model.rightLeg.rotation.z = 0

	let envelope: number
	if (t < 0.2) envelope = t / 0.2
	else if (t > 0.8) envelope = (1 - t) / 0.2
	else envelope = 1

	const wavingArm = side >= 0 ? model.rightArm : model.leftArm
	const freeArm = side >= 0 ? model.leftArm : model.rightArm

	const armSwing = Math.sin(runPhase) * 0.7
	freeArm.rotation.x = side >= 0 ? armSwing : -armSwing
	freeArm.rotation.z = 0

	const raiseX = -2.6 * envelope
	const waveOsc = Math.sin(runPhase * 2.5) * 0.3 * envelope
	const splayZ = (side >= 0 ? 1 : -1) * (0.4 + waveOsc) * envelope

	wavingArm.rotation.x =
		raiseX + (1 - envelope) * (side >= 0 ? -armSwing : armSwing)
	wavingArm.rotation.z = splayZ
}

/**
 * High-five pose: one arm punches forward to meet the other runner's hand.
 */
export function poseHighFive(
	model: RunnerModelResult,
	t: number,
	side: number,
): void {
	const legBend = 0.15
	model.leftLeg.rotation.x = legBend
	model.leftLeg.rotation.z = 0
	model.rightLeg.rotation.x = legBend
	model.rightLeg.rotation.z = 0

	let envelope: number
	if (t < 0.3) envelope = t / 0.3
	else if (t > 0.7) envelope = (1 - t) / 0.3
	else envelope = 1

	const activeArm = side >= 0 ? model.rightArm : model.leftArm
	const passiveArm = side >= 0 ? model.leftArm : model.rightArm

	activeArm.rotation.x = -1.5 * envelope
	activeArm.rotation.z = (side >= 0 ? 1 : -1) * 0.3 * envelope

	passiveArm.rotation.x = 0.1
	passiveArm.rotation.z = 0
}

/**
 * Cheering pose: arms raise periodically, bounce only while arms are up.
 */
export function poseCheering(
	model: RunnerModelResult,
	phase: number,
	cycleLength: number,
): void {
	const armCycle = cycleLength
	const armRaiseDuration = 1.2
	const cyclePos = ((phase % armCycle) + armCycle) % armCycle
	let armRaise = 0
	if (cyclePos < armRaiseDuration) {
		const t = cyclePos / armRaiseDuration
		armRaise = Math.sin(t * Math.PI)
	}

	const legBend = armRaise * 0.15
	model.leftLeg.rotation.x = legBend
	model.rightLeg.rotation.x = legBend
	model.leftLeg.rotation.z = -0.05
	model.rightLeg.rotation.z = 0.05

	const restX = 0.1
	const raisedX = -2.8
	const restZ = 0.2
	const raisedZ = 0.3

	model.leftArm.rotation.x = restX + (raisedX - restX) * armRaise
	model.rightArm.rotation.x = restX + (raisedX - restX) * armRaise
	model.leftArm.rotation.z = -(restZ + (raisedZ - restZ) * armRaise)
	model.rightArm.rotation.z = restZ + (raisedZ - restZ) * armRaise
}

// ── Volunteer vest overlay ──

/** Hi-vis blue for parkwalkers */
const PARKWALKER_BLUE = new Color3(0.0, 0.45, 0.9)
/** Hi-vis orange for tailwalkers */
const TAILWALKER_ORANGE = new Color3(1.0, 0.5, 0.0)

/**
 * Apply a volunteer vest to an existing runner model by recolouring the torso
 * primitive to fluorescent orange/blue and adding a thin silver stripe mesh
 * at the correct position based on the torso's actual bounds.
 */
export function applyVolunteerVest(
	scene: Scene,
	model: RunnerModelResult,
	role: PreviewRunnerRole,
	id: number,
): void {
	const vestColor = role === 'parkwalker' ? PARKWALKER_BLUE : TAILWALKER_ORANGE
	const emissive =
		role === 'parkwalker'
			? new Color3(0.0, 0.12, 0.25)
			: new Color3(0.3, 0.15, 0.0)

	// Find the torso mesh (primitive2) within the model hierarchy
	let torsoMesh: AbstractMesh | null = null
	for (const mesh of model.root.getChildMeshes(false)) {
		if (
			mesh.name.includes('_primitive2_') ||
			mesh.name.includes('_primitive2')
		) {
			torsoMesh = mesh
			break
		}
	}

	if (!torsoMesh) return

	// Apply vest colour directly to the torso
	const vestMat = new StandardMaterial(`rVestMat_${id}`, scene)
	vestMat.diffuseColor = vestColor
	vestMat.specularColor = Color3.Black()
	vestMat.emissiveColor = emissive
	torsoMesh.material = vestMat

	// Measure torso bounds to position the silver stripe correctly
	torsoMesh.computeWorldMatrix(true)
	const bounds = torsoMesh.getBoundingInfo().boundingBox
	const minWorld = bounds.minimumWorld
	const maxWorld = bounds.maximumWorld

	const torsoWidth = maxWorld.x - minWorld.x
	const torsoDepth = maxWorld.z - minWorld.z
	const torsoMidY = (minWorld.y + maxWorld.y) / 2

	// Create a thin silver stripe at the middle of the torso
	const stripeH = (maxWorld.y - minWorld.y) * 0.1
	const stripe = MeshBuilder.CreateBox(
		`rVStripe_${id}`,
		{
			width: torsoWidth + 0.01,
			height: stripeH,
			depth: torsoDepth + 0.01,
		},
		scene,
	)
	const stripeMat = new StandardMaterial(`rVStripeMat_${id}`, scene)
	stripeMat.diffuseColor = new Color3(0.82, 0.82, 0.82)
	stripeMat.specularColor = new Color3(0.3, 0.3, 0.3)
	stripeMat.emissiveColor = new Color3(0.2, 0.2, 0.2)
	stripe.material = stripeMat
	stripe.position.x = (minWorld.x + maxWorld.x) / 2
	stripe.position.y = torsoMidY
	stripe.position.z = (minWorld.z + maxWorld.z) / 2
	stripe.parent = model.root
}

// ── Helper ──

function makeMat(name: string, color: Color3, scene: Scene): StandardMaterial {
	const mat = new StandardMaterial(name, scene)
	mat.diffuseColor = color
	mat.specularColor = Color3.Black()
	return mat
}
