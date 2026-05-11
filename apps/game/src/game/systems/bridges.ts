import {
	type Scene,
	MeshBuilder,
	StandardMaterial,
	Color3,
	TransformNode,
	Mesh,
	type Vector3,
	VertexData,
} from '@babylonjs/core'
import type { BridgeCollider } from '../types'
import { BUS_HALF_WIDTH } from './busCollision'

/** Bridge width = bus full width * 1.2 */
const BRIDGE_WIDTH = BUS_HALF_WIDTH * 2 * 1.2
const BRIDGE_HALF_WIDTH = BRIDGE_WIDTH / 2

/** Height of the side railings */
const RAILING_HEIGHT = 1.2
/** Thickness of the railing posts */
const RAILING_POST_THICKNESS = 0.08
/** Number of railing posts per side per 10m of bridge length */
const POSTS_PER_10M = 8
/** Thickness of the bridge deck */
const DECK_THICKNESS = 0.35
/** Height of the kerb/edge strip on each side */
const KERB_HEIGHT = 0.12
const KERB_WIDTH = 0.15

export interface BridgeMeshEntry {
	root: TransformNode
	x: number
	z: number
}

export interface BuildBridgesResult {
	colliders: BridgeCollider[]
	meshEntries: BridgeMeshEntry[]
}

/**
 * Build 3D meshes for all bridge definitions.
 * Each bridge is defined by two GPS endpoints converted to world-space.
 */
export function buildBridgeMeshes(
	scene: Scene,
	bridges: { start: [number, number]; end: [number, number] }[],
	getGroundY: (x: number, z: number) => number,
): BuildBridgesResult {
	const colliders: BridgeCollider[] = []
	const meshEntries: BridgeMeshEntry[] = []
	if (bridges.length === 0) return { colliders, meshEntries }

	// Materials
	const deckMat = new StandardMaterial('bridgeDeckMat', scene)
	deckMat.diffuseColor = new Color3(0.55, 0.55, 0.55) // grey asphalt
	deckMat.specularColor = Color3.Black()

	const kerbMat = new StandardMaterial('bridgeKerbMat', scene)
	kerbMat.diffuseColor = new Color3(0.7, 0.7, 0.72)
	kerbMat.specularColor = Color3.Black()

	const railingMat = new StandardMaterial('bridgeRailingMat', scene)
	railingMat.diffuseColor = new Color3(0.35, 0.38, 0.4) // dark metal
	railingMat.specularColor = new Color3(0.15, 0.15, 0.15)

	for (let i = 0; i < bridges.length; i++) {
		const bridge = bridges[i]
		const [sx, sz] = bridge.start
		const [ex, ez] = bridge.end

		const cx = (sx + ex) / 2
		const cz = (sz + ez) / 2
		const dx = ex - sx
		const dz = ez - sz
		const length = Math.sqrt(dx * dx + dz * dz)
		if (length < 0.5) continue

		const yaw = Math.atan2(dx, dz)
		const halfLength = length / 2

		// Bridge deck sits slightly above the water level at its center
		const groundY = getGroundY(cx, cz)
		const deckY = groundY + DECK_THICKNESS / 2 + 0.15 // slightly elevated above ground/water

		const root = new TransformNode(`bridge_${i}`, scene)
		root.position.set(cx, deckY, cz)
		root.rotation.y = -yaw

		// --- Deck (flat box) ---
		const deck = MeshBuilder.CreateBox(
			`bridge_deck_${i}`,
			{
				width: BRIDGE_WIDTH,
				height: DECK_THICKNESS,
				depth: length,
			},
			scene,
		)
		deck.material = deckMat
		deck.parent = root
		deck.position.set(0, 0, 0)

		// --- Kerbs (raised edge strips) ---
		for (const side of [-1, 1]) {
			const kerb = MeshBuilder.CreateBox(
				`bridge_kerb_${i}_${side}`,
				{
					width: KERB_WIDTH,
					height: KERB_HEIGHT,
					depth: length,
				},
				scene,
			)
			kerb.material = kerbMat
			kerb.parent = root
			kerb.position.set(
				side * (BRIDGE_HALF_WIDTH - KERB_WIDTH / 2),
				DECK_THICKNESS / 2 + KERB_HEIGHT / 2,
				0,
			)
		}

		// --- Railings ---
		const numPosts = Math.max(2, Math.round((length / 10) * POSTS_PER_10M))
		const postSpacing = length / (numPosts - 1)

		for (const side of [-1, 1]) {
			const railX = side * (BRIDGE_HALF_WIDTH - KERB_WIDTH / 2)

			// Top rail (horizontal bar)
			const topRail = MeshBuilder.CreateBox(
				`bridge_rail_${i}_${side}`,
				{
					width: RAILING_POST_THICKNESS,
					height: RAILING_POST_THICKNESS,
					depth: length,
				},
				scene,
			)
			topRail.material = railingMat
			topRail.parent = root
			topRail.position.set(railX, DECK_THICKNESS / 2 + RAILING_HEIGHT, 0)

			// Mid rail
			const midRail = MeshBuilder.CreateBox(
				`bridge_midrail_${i}_${side}`,
				{
					width: RAILING_POST_THICKNESS,
					height: RAILING_POST_THICKNESS,
					depth: length,
				},
				scene,
			)
			midRail.material = railingMat
			midRail.parent = root
			midRail.position.set(railX, DECK_THICKNESS / 2 + RAILING_HEIGHT * 0.5, 0)

			// Vertical posts
			for (let p = 0; p < numPosts; p++) {
				const postZ = -halfLength + p * postSpacing
				const post = MeshBuilder.CreateBox(
					`bridge_post_${i}_${side}_${p}`,
					{
						width: RAILING_POST_THICKNESS,
						height: RAILING_HEIGHT,
						depth: RAILING_POST_THICKNESS,
					},
					scene,
				)
				post.material = railingMat
				post.parent = root
				post.position.set(railX, DECK_THICKNESS / 2 + RAILING_HEIGHT / 2, postZ)
			}
		}

		colliders.push({
			x: cx,
			z: cz,
			yaw,
			halfWidth: BRIDGE_HALF_WIDTH,
			halfLength,
		})

		meshEntries.push({ root, x: cx, z: cz })
	}

	return { colliders, meshEntries }
}

/**
 * Resolve collision against a bridge.
 * The bridge is passable if the entity enters along its length axis (from the ends).
 * It is solid if approached from the sides (like a wall).
 *
 * Returns a new position if pushed out, or null if no collision.
 */
export function resolveBridgeCollision(
	x: number,
	z: number,
	radius: number,
	collider: BridgeCollider,
): { x: number; z: number } | null {
	const sinYaw = Math.sin(collider.yaw)
	const cosYaw = Math.cos(collider.yaw)
	const relX = x - collider.x
	const relZ = z - collider.z

	// Transform to bridge local space (localRight = perpendicular to bridge, localFwd = along bridge)
	const localRight = relX * cosYaw - relZ * sinYaw
	const localFwd = relX * sinYaw + relZ * cosYaw

	// Check if the entity is within the bridge bounds along forward axis (with entry zone)
	const insideFwd = Math.abs(localFwd) < collider.halfLength + radius
	const insideRight = Math.abs(localRight) < collider.halfWidth + radius

	if (!insideFwd || !insideRight) return null // not touching bridge at all

	// Entity is within the bridge's forward extent — check if on the deck (passable)
	// If the entity center is within the deck area (between the kerbs), it's on the bridge path
	if (Math.abs(localRight) <= collider.halfWidth - KERB_WIDTH) {
		// On the bridge deck — passable, no collision
		return null
	}

	// Entity is hitting the side (railing/kerb area) — push it out sideways
	const overlapRight = collider.halfWidth + radius - Math.abs(localRight)
	if (overlapRight <= 0) return null

	const resolvedRight =
		(localRight >= 0 ? 1 : -1) * (collider.halfWidth + radius)
	const resolvedFwd = localFwd

	return {
		x: collider.x + resolvedRight * cosYaw + resolvedFwd * sinYaw,
		z: collider.z - resolvedRight * sinYaw + resolvedFwd * cosYaw,
	}
}

/**
 * Resolve position against all bridge colliders.
 * Returns true if any collision occurred.
 */
export function resolvePositionAgainstBridges(
	pos: Vector3,
	radius: number,
	colliders: BridgeCollider[],
): boolean {
	if (colliders.length === 0) return false

	let collided = false
	for (let pass = 0; pass < 3; pass++) {
		let movedThisPass = false
		for (const collider of colliders) {
			const resolved = resolveBridgeCollision(pos.x, pos.z, radius, collider)
			if (!resolved) continue
			pos.x = resolved.x
			pos.z = resolved.z
			collided = true
			movedThisPass = true
		}
		if (!movedThisPass) break
	}

	return collided
}

/**
 * Check if a world position is on a bridge deck (used for ground height override).
 * Returns the bridge deck Y if on a bridge, or null otherwise.
 */
export function getBridgeDeckY(
	x: number,
	z: number,
	colliders: BridgeCollider[],
	getGroundY: (x: number, z: number) => number,
): number | null {
	for (const collider of colliders) {
		const sinYaw = Math.sin(collider.yaw)
		const cosYaw = Math.cos(collider.yaw)
		const relX = x - collider.x
		const relZ = z - collider.z

		const localRight = relX * cosYaw - relZ * sinYaw
		const localFwd = relX * sinYaw + relZ * cosYaw

		if (
			Math.abs(localFwd) <= collider.halfLength &&
			Math.abs(localRight) <= collider.halfWidth
		) {
			// On the bridge — return elevated Y
			const groundY = getGroundY(collider.x, collider.z)
			return groundY + DECK_THICKNESS + 0.15
		}
	}
	return null
}
