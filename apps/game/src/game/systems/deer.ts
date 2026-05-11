/**
 * Deer AI system.
 *
 * Like geese but much faster with a much larger herd radius (10× geese).
 * Scoopable by the bus.
 *
 * Behaviour:
 *   - Solo deer wander: pick a random point, walk there, stand idle.
 *   - Deer within DEER_HERD_RADIUS form a herd and share a target.
 *   - If bus/runner comes within flee radius, deer flee (fast!).
 *   - Scoopable: bus impact launches them ragdoll.
 *   - Has a 'running' state for moderate-speed movement (between walk and flee).
 */
import { type Scene, Vector3, MeshBuilder, Mesh } from '@babylonjs/core'
import {
	createDeerModel,
	poseDeerWalking,
	poseDeerIdle,
	poseDeerSitting,
	poseDeerFleeing,
	poseDeerRunning,
} from '../objects/DeerModel'
import type { DeerModelResult } from '../objects/DeerModel'
import type { Deer, SolidObstacle, BuildingCollider, WaterZone } from '../types'
import { resolvePositionAgainstBuildings } from './buildings'
import { isInWaterZone } from './terrain'
import {
	DEER_HERD_RADIUS,
	DEER_FLEE_RADIUS,
	DEER_WANDER_RADIUS,
	DEER_WALK_SPEED,
	DEER_RUN_SPEED,
	DEER_FLEE_SPEED,
	DEER_IDLE_MAX,
	DEER_MIN_SEPARATION,
	DEER_SCOOP_DISTANCE,
	DEER_HERD_MERGE_RADIUS,
	DEER_LANDED_DURATION,
	DEER_RUN_TRIGGER_RADIUS,
	GRAVITY,
	SCOOP_UP_FACTOR,
	SCOOP_MIN_UP,
	SCOOP_FORWARD_FACTOR,
} from '../constants'

// ── Seeded RNG ──

function mulberry32(seed: number) {
	let s = seed
	return () => {
		s |= 0
		s = (s + 0x6d2b79f5) | 0
		let t = Math.imul(s ^ (s >>> 15), 1 | s)
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

// ── Spawn ──

export interface DeerSpawnPoint {
	x: number
	z: number
	rotation: number
}

export function spawnDeer(
	scene: Scene,
	spawnPoints: DeerSpawnPoint[],
	getGroundY: (x: number, z: number) => number,
): Deer[] {
	const deer: Deer[] = []
	const rand = mulberry32(77777)

	for (let i = 0; i < spawnPoints.length; i++) {
		const sp = spawnPoints[i]
		const model = createDeerModel(scene, i)
		model.root.scaling.setAll(2)
		const groundY = getGroundY(sp.x, sp.z)
		model.root.position = new Vector3(sp.x, groundY, sp.z)

		const anchor = MeshBuilder.CreateBox(
			`deerAnchor_${i}`,
			{ width: 0.01, height: 0.01, depth: 0.01 },
			scene,
		)
		anchor.isVisible = false
		anchor.position = model.root.position.clone()
		model.root.parent = anchor
		model.root.position = Vector3.Zero()

		deer.push({
			model,
			mesh: anchor,
			x: sp.x,
			z: sp.z,
			yaw: sp.rotation,
			state: 'idle',
			velX: 0,
			velY: 0,
			velZ: 0,
			animPhase: rand() * Math.PI * 2,
			targetX: sp.x,
			targetZ: sp.z,
			idleTimer: rand() * DEER_IDLE_MAX,
			herdId: -1,
			landedTimer: 0,
		})
	}

	return deer
}

// ── Update context ──

export interface DeerUpdateContext {
	scene: Scene
	deer: Deer[]
	getGroundY: (x: number, z: number) => number
	busPos: Vector3
	busYaw: number
	busSpeed: number
	localPlayerRole: 'bus' | 'runner'
	solidObstacles: SolidObstacle[]
	buildingColliders: BuildingCollider[]
	waterZones: WaterZone[]
}

export interface DeerUpdateResult {
	scoopCount: number
}

// ── Herd management ──

let nextHerdId = 0

function resetHerds(deer: Deer[]) {
	for (const d of deer) {
		if (d.state === 'launched' || d.state === 'landed') continue
		d.herdId = -1
	}
	nextHerdId = 0
}

function updateHerds(deer: Deer[]) {
	resetHerds(deer)

	const active = deer.filter(
		(d) => d.state !== 'launched' && d.state !== 'landed',
	)

	for (let i = 0; i < active.length; i++) {
		for (let j = i + 1; j < active.length; j++) {
			const a = active[i]
			const b = active[j]
			const dx = a.x - b.x
			const dz = a.z - b.z
			const dist = Math.sqrt(dx * dx + dz * dz)

			if (dist < DEER_HERD_MERGE_RADIUS) {
				if (a.herdId === -1 && b.herdId === -1) {
					const id = nextHerdId++
					a.herdId = id
					b.herdId = id
				} else if (a.herdId !== -1 && b.herdId === -1) {
					b.herdId = a.herdId
				} else if (a.herdId === -1 && b.herdId !== -1) {
					a.herdId = b.herdId
				} else if (a.herdId !== b.herdId) {
					const oldId = b.herdId
					const newId = a.herdId
					for (const d of active) {
						if (d.herdId === oldId) d.herdId = newId
					}
				}
			}
		}
	}
}

function getHerdTarget(
	deer: Deer[],
	herdId: number,
): { tx: number; tz: number } | null {
	for (const d of deer) {
		if (
			d.herdId === herdId &&
			(d.state === 'walking' || d.state === 'running')
		) {
			return { tx: d.targetX, tz: d.targetZ }
		}
	}
	return null
}

// ── Pick a valid wander target ──

function pickWanderTarget(
	deer: Deer,
	getGroundY: (x: number, z: number) => number,
	waterZones: WaterZone[],
	solidObstacles: SolidObstacle[],
	rand: () => number,
): { tx: number; tz: number } {
	for (let attempt = 0; attempt < 10; attempt++) {
		const angle = rand() * Math.PI * 2
		const dist = 2 + rand() * (DEER_WANDER_RADIUS - 2)
		const tx = deer.x + Math.cos(angle) * dist
		const tz = deer.z + Math.sin(angle) * dist

		if (isInWaterZone(tx, tz, waterZones)) continue

		let blocked = false
		for (const obs of solidObstacles) {
			const odx = tx - obs.x
			const odz = tz - obs.z
			if (odx * odx + odz * odz < obs.radius * obs.radius) {
				blocked = true
				break
			}
		}
		if (blocked) continue

		return { tx, tz }
	}

	return { tx: deer.x, tz: deer.z }
}

// ── Main update ──

const _rand = mulberry32(88888)

export function updateDeerSystem(
	ctx: DeerUpdateContext,
	dt: number,
): DeerUpdateResult {
	const result: DeerUpdateResult = { scoopCount: 0 }

	updateHerds(ctx.deer)

	for (const deer of ctx.deer) {
		const pos = deer.mesh.position

		switch (deer.state) {
			case 'idle': {
				deer.idleTimer -= dt
				poseDeerSitting(deer.model)

				pos.y = ctx.getGroundY(pos.x, pos.z)
				deer.mesh.rotation.y = deer.yaw

				if (shouldFlee(deer, ctx)) {
					startFleeing(deer, ctx)
					break
				}
				if (shouldRun(deer, ctx)) {
					startRunning(deer, ctx)
					break
				}

				if (checkScoop(deer, ctx, result)) break

				if (deer.idleTimer <= 0) {
					let target: { tx: number; tz: number }

					if (deer.herdId !== -1) {
						const herdTarget = getHerdTarget(ctx.deer, deer.herdId)
						if (herdTarget) {
							target = herdTarget
						} else {
							target = pickWanderTarget(
								deer,
								ctx.getGroundY,
								ctx.waterZones,
								ctx.solidObstacles,
								_rand,
							)
						}
					} else {
						target = pickWanderTarget(
							deer,
							ctx.getGroundY,
							ctx.waterZones,
							ctx.solidObstacles,
							_rand,
						)
					}

					deer.targetX = target.tx
					deer.targetZ = target.tz
					deer.state = 'walking'
				}
				break
			}

			case 'walking': {
				if (shouldFlee(deer, ctx)) {
					startFleeing(deer, ctx)
					break
				}
				if (shouldRun(deer, ctx)) {
					startRunning(deer, ctx)
					break
				}

				if (checkScoop(deer, ctx, result)) break

				const dx = deer.targetX - deer.x
				const dz = deer.targetZ - deer.z
				const dist = Math.sqrt(dx * dx + dz * dz)

				if (dist < 0.5) {
					deer.state = 'idle'
					deer.idleTimer = _rand() * DEER_IDLE_MAX
					poseDeerIdle(deer.model)
					break
				}

				const speed = DEER_WALK_SPEED
				const moveX = (dx / dist) * speed * dt
				const moveZ = (dz / dist) * speed * dt

				let newX = deer.x + moveX
				let newZ = deer.z + moveZ

				if (isInWaterZone(newX, newZ, ctx.waterZones)) {
					deer.state = 'idle'
					deer.idleTimer = _rand() * DEER_IDLE_MAX * 0.3
					break
				}

				// Avoid solid obstacles
				for (const obs of ctx.solidObstacles) {
					const odx = newX - obs.x
					const odz = newZ - obs.z
					const oDist = Math.sqrt(odx * odx + odz * odz)
					if (oDist < obs.radius + 0.5) {
						const nx = odx / oDist
						const nz = odz / oDist
						newX = obs.x + nx * (obs.radius + 0.5)
						newZ = obs.z + nz * (obs.radius + 0.5)
					}
				}

				// Herd separation
				for (const other of ctx.deer) {
					if (other === deer) continue
					if (other.state === 'launched' || other.state === 'landed') continue
					const sdx = newX - other.x
					const sdz = newZ - other.z
					const sDist = Math.sqrt(sdx * sdx + sdz * sdz)
					if (sDist < DEER_MIN_SEPARATION && sDist > 0.001) {
						const snx = sdx / sDist
						const snz = sdz / sDist
						newX += snx * (DEER_MIN_SEPARATION - sDist)
						newZ += snz * (DEER_MIN_SEPARATION - sDist)
					}
				}

				deer.x = newX
				deer.z = newZ
				deer.yaw = Math.atan2(dx, dz)

				pos.x = deer.x
				pos.z = deer.z
				pos.y = ctx.getGroundY(deer.x, deer.z)
				deer.mesh.rotation.y = deer.yaw

				deer.animPhase += dt * speed * 4
				poseDeerWalking(deer.model, deer.animPhase)
				break
			}

			case 'running': {
				if (shouldFlee(deer, ctx)) {
					startFleeing(deer, ctx)
					break
				}

				if (checkScoop(deer, ctx, result)) break

				const dx = deer.targetX - deer.x
				const dz = deer.targetZ - deer.z
				const dist = Math.sqrt(dx * dx + dz * dz)

				if (dist < 0.5 || !shouldRun(deer, ctx)) {
					deer.state = 'idle'
					deer.idleTimer = _rand() * DEER_IDLE_MAX * 0.5
					break
				}

				const speed = DEER_RUN_SPEED
				let newX = deer.x + (dx / dist) * speed * dt
				let newZ = deer.z + (dz / dist) * speed * dt

				if (isInWaterZone(newX, newZ, ctx.waterZones)) {
					// Retarget along perpendicular to avoid water
					const perpX = -dz / dist
					const perpZ = dx / dist
					const alt1X = deer.x + perpX * speed * dt
					const alt1Z = deer.z + perpZ * speed * dt
					if (!isInWaterZone(alt1X, alt1Z, ctx.waterZones)) {
						newX = alt1X
						newZ = alt1Z
						// Retarget so deer keeps running along water edge
						const runDistance = DEER_RUN_TRIGGER_RADIUS * 2
						deer.targetX = deer.x + perpX * runDistance
						deer.targetZ = deer.z + perpZ * runDistance
					} else {
						const alt2X = deer.x - perpX * speed * dt
						const alt2Z = deer.z - perpZ * speed * dt
						if (!isInWaterZone(alt2X, alt2Z, ctx.waterZones)) {
							newX = alt2X
							newZ = alt2Z
							deer.targetX = deer.x - perpX * DEER_RUN_TRIGGER_RADIUS * 2
							deer.targetZ = deer.z - perpZ * DEER_RUN_TRIGGER_RADIUS * 2
						} else {
							// Both sides blocked — stay put
							newX = deer.x
							newZ = deer.z
						}
					}
				}

				for (const obs of ctx.solidObstacles) {
					const odx = newX - obs.x
					const odz = newZ - obs.z
					const oDist = Math.sqrt(odx * odx + odz * odz)
					if (oDist < obs.radius + 0.5) {
						const nx = odx / oDist
						const nz = odz / oDist
						newX = obs.x + nx * (obs.radius + 0.5)
						newZ = obs.z + nz * (obs.radius + 0.5)
					}
				}

				deer.x = newX
				deer.z = newZ
				deer.yaw = Math.atan2(dx, dz)

				pos.x = deer.x
				pos.z = deer.z
				pos.y = ctx.getGroundY(deer.x, deer.z)
				deer.mesh.rotation.y = deer.yaw

				deer.animPhase += dt * speed * 5
				poseDeerRunning(deer.model, deer.animPhase)
				break
			}

			case 'fleeing': {
				if (checkScoop(deer, ctx, result)) break

				const dx = deer.targetX - deer.x
				const dz = deer.targetZ - deer.z
				const dist = Math.sqrt(dx * dx + dz * dz)

				if (dist < 0.5 || !shouldFlee(deer, ctx)) {
					deer.state = 'idle'
					deer.idleTimer = _rand() * DEER_IDLE_MAX * 0.5
					break
				}

				const speed = DEER_FLEE_SPEED
				let newX = deer.x + (dx / dist) * speed * dt
				let newZ = deer.z + (dz / dist) * speed * dt

				if (isInWaterZone(newX, newZ, ctx.waterZones)) {
					// Retarget along perpendicular to avoid water
					const perpX = -dz / dist
					const perpZ = dx / dist
					const alt1X = deer.x + perpX * speed * dt
					const alt1Z = deer.z + perpZ * speed * dt
					if (!isInWaterZone(alt1X, alt1Z, ctx.waterZones)) {
						newX = alt1X
						newZ = alt1Z
						// Retarget so deer keeps fleeing along water edge
						const fleeDistance = DEER_FLEE_RADIUS * 3
						deer.targetX = deer.x + perpX * fleeDistance
						deer.targetZ = deer.z + perpZ * fleeDistance
					} else {
						const alt2X = deer.x - perpX * speed * dt
						const alt2Z = deer.z - perpZ * speed * dt
						if (!isInWaterZone(alt2X, alt2Z, ctx.waterZones)) {
							newX = alt2X
							newZ = alt2Z
							deer.targetX = deer.x - perpX * DEER_FLEE_RADIUS * 3
							deer.targetZ = deer.z - perpZ * DEER_FLEE_RADIUS * 3
						} else {
							// Both sides blocked — stay put
							newX = deer.x
							newZ = deer.z
						}
					}
				}

				for (const obs of ctx.solidObstacles) {
					const odx = newX - obs.x
					const odz = newZ - obs.z
					const oDist = Math.sqrt(odx * odx + odz * odz)
					if (oDist < obs.radius + 0.5) {
						const nx = odx / oDist
						const nz = odz / oDist
						newX = obs.x + nx * (obs.radius + 0.5)
						newZ = obs.z + nz * (obs.radius + 0.5)
					}
				}

				deer.x = newX
				deer.z = newZ
				deer.yaw = Math.atan2(dx, dz)

				pos.x = deer.x
				pos.z = deer.z
				pos.y = ctx.getGroundY(deer.x, deer.z)
				deer.mesh.rotation.y = deer.yaw

				deer.animPhase += dt * speed * 5
				poseDeerFleeing(deer.model, deer.animPhase)
				break
			}

			case 'launched': {
				deer.velY -= GRAVITY * dt
				pos.x += deer.velX * dt
				pos.y += deer.velY * dt
				pos.z += deer.velZ * dt

				deer.mesh.rotation.x += 6 * dt
				deer.mesh.rotation.z += 4 * dt

				deer.animPhase += dt * 12
				poseDeerFleeing(deer.model, deer.animPhase)

				for (const obs of ctx.solidObstacles) {
					const odx = obs.x - pos.x
					const odz = obs.z - pos.z
					const oDist = Math.sqrt(odx * odx + odz * odz)
					const minDist = obs.radius + 0.5
					if (oDist < minDist && oDist > 0.001) {
						const nx = odx / oDist
						const nz = odz / oDist
						deer.velX = -nx * 8
						deer.velZ = -nz * 8
						pos.x += -nx * (minDist - oDist)
						pos.z += -nz * (minDist - oDist)
					}
				}

				if (resolvePositionAgainstBuildings(pos, 0.5, ctx.buildingColliders)) {
					const speed = Math.sqrt(deer.velX * deer.velX + deer.velZ * deer.velZ)
					if (speed > 0.001) {
						deer.velX *= -6 / speed
						deer.velZ *= -6 / speed
					}
				}

				const groundY = ctx.getGroundY(pos.x, pos.z)
				if (pos.y <= groundY && deer.velY < 0) {
					pos.y = groundY
					deer.state = 'landed'
					deer.landedTimer = DEER_LANDED_DURATION
					deer.mesh.rotation.x = 0
					deer.mesh.rotation.z = 0
					deer.x = pos.x
					deer.z = pos.z
					poseDeerSitting(deer.model)
				}
				break
			}

			case 'landed': {
				if (checkScoop(deer, ctx, result)) break

				deer.landedTimer -= dt
				pos.y = ctx.getGroundY(pos.x, pos.z)
				poseDeerSitting(deer.model)

				if (deer.landedTimer <= 0) {
					deer.state = 'idle'
					deer.idleTimer = _rand() * DEER_IDLE_MAX * 0.3
					deer.mesh.rotation.x = 0
					deer.mesh.rotation.z = 0
				}
				break
			}
		}
	}

	return result
}

// ── Helpers ──

function shouldFlee(deer: Deer, ctx: DeerUpdateContext): boolean {
	const bdx = ctx.busPos.x - deer.x
	const bdz = ctx.busPos.z - deer.z
	const busDist = Math.sqrt(bdx * bdx + bdz * bdz)
	return busDist < DEER_FLEE_RADIUS
}

/** Intermediate alert — bus is close-ish, deer runs (not full flee). */
function shouldRun(deer: Deer, ctx: DeerUpdateContext): boolean {
	const bdx = ctx.busPos.x - deer.x
	const bdz = ctx.busPos.z - deer.z
	const busDist = Math.sqrt(bdx * bdx + bdz * bdz)
	return busDist < DEER_RUN_TRIGGER_RADIUS && busDist >= DEER_FLEE_RADIUS
}

function startFleeing(deer: Deer, ctx: DeerUpdateContext) {
	const bdx = deer.x - ctx.busPos.x
	const bdz = deer.z - ctx.busPos.z
	const bDist = Math.sqrt(bdx * bdx + bdz * bdz) || 1

	const fleeDistance = DEER_FLEE_RADIUS * 3
	deer.targetX = deer.x + (bdx / bDist) * fleeDistance
	deer.targetZ = deer.z + (bdz / bDist) * fleeDistance
	deer.state = 'fleeing'
	deer.herdId = -1
}

function startRunning(deer: Deer, ctx: DeerUpdateContext) {
	const bdx = deer.x - ctx.busPos.x
	const bdz = deer.z - ctx.busPos.z
	const bDist = Math.sqrt(bdx * bdx + bdz * bdz) || 1

	const runDistance = DEER_RUN_TRIGGER_RADIUS * 2
	deer.targetX = deer.x + (bdx / bDist) * runDistance
	deer.targetZ = deer.z + (bdz / bDist) * runDistance
	deer.state = 'running'
	deer.herdId = -1
}

function checkScoop(
	deer: Deer,
	ctx: DeerUpdateContext,
	result: DeerUpdateResult,
): boolean {
	if (ctx.localPlayerRole !== 'bus') return false
	if (Math.abs(ctx.busSpeed) < 0.5) return false

	const bdx = ctx.busPos.x - deer.x
	const bdz = ctx.busPos.z - deer.z
	const busDist = Math.sqrt(bdx * bdx + bdz * bdz)

	if (busDist < DEER_SCOOP_DISTANCE) {
		const absSpeed = Math.abs(ctx.busSpeed)
		const fwdX = Math.sin(ctx.busYaw)
		const fwdZ = Math.cos(ctx.busYaw)

		deer.state = 'launched'
		deer.velX = fwdX * ctx.busSpeed * SCOOP_FORWARD_FACTOR + (_rand() - 0.5) * 3
		deer.velY = Math.max(SCOOP_MIN_UP, absSpeed * SCOOP_UP_FACTOR) + _rand() * 3
		deer.velZ = fwdZ * ctx.busSpeed * SCOOP_FORWARD_FACTOR + (_rand() - 0.5) * 3
		deer.herdId = -1

		result.scoopCount++
		return true
	}

	return false
}
