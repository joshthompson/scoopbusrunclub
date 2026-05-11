/**
 * Swan AI system.
 *
 * Identical behaviour to geese but uses SwanModel instead of GooseModel.
 * Swans wander, herd, flee, get scooped, and float on water just like geese.
 */
import { Vector3, MeshBuilder } from '@babylonjs/core'
import type { Scene } from '@babylonjs/core'
import {
	createSwanModel,
	poseSwanWalking,
	poseSwanIdle,
	poseSwanSitting,
	poseSwanFleeing,
	poseSwanSwimming,
} from '../objects/SwanModel'
import type { Swan, SolidObstacle, BuildingCollider, WaterZone } from '../types'
import { resolvePositionAgainstBuildings } from './buildings'
import { getWaterSurfaceYAt } from './terrain'
import {
	SWAN_FLEE_RADIUS,
	SWAN_WANDER_RADIUS,
	SWAN_WALK_SPEED,
	SWAN_FLEE_SPEED,
	SWAN_IDLE_MAX,
	SWAN_MIN_SEPARATION,
	SWAN_SCOOP_DISTANCE,
	SWAN_HERD_MERGE_RADIUS,
	SWAN_LANDED_DURATION,
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

export interface SwanSpawnPoint {
	x: number
	z: number
	rotation: number
}

export function spawnSwans(
	scene: Scene,
	spawnPoints: SwanSpawnPoint[],
	getGroundY: (x: number, z: number) => number,
): Swan[] {
	const swans: Swan[] = []
	const rand = mulberry32(77777)

	for (let i = 0; i < spawnPoints.length; i++) {
		const sp = spawnPoints[i]
		const model = createSwanModel(scene, i)
		model.root.scaling.setAll(3)
		const groundY = getGroundY(sp.x, sp.z)
		model.root.position = new Vector3(sp.x, groundY, sp.z)

		const anchor = MeshBuilder.CreateBox(
			`swanAnchor_${i}`,
			{ width: 0.01, height: 0.01, depth: 0.01 },
			scene,
		)
		anchor.isVisible = false
		anchor.position = model.root.position.clone()
		model.root.parent = anchor
		model.root.position = Vector3.Zero()

		swans.push({
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
			idleTimer: rand() * SWAN_IDLE_MAX,
			herdId: -1,
			landedTimer: 0,
		})
	}

	return swans
}

// ── Update context ──

export interface SwanUpdateContext {
	scene: Scene
	swans: Swan[]
	getGroundY: (x: number, z: number) => number
	busPos: Vector3
	busYaw: number
	busSpeed: number
	localPlayerRole: 'bus' | 'runner'
	solidObstacles: SolidObstacle[]
	buildingColliders: BuildingCollider[]
	waterZones: WaterZone[]
}

export interface SwanUpdateResult {
	scoopCount: number
}

// ── Herd management ──

let nextHerdId = 0

function resetHerds(swans: Swan[]) {
	for (const s of swans) {
		if (s.state === 'launched' || s.state === 'landed') continue
		s.herdId = -1
	}
	nextHerdId = 0
}

function updateHerds(swans: Swan[]) {
	resetHerds(swans)

	const active = swans.filter(
		(s) => s.state !== 'launched' && s.state !== 'landed',
	)

	for (let i = 0; i < active.length; i++) {
		for (let j = i + 1; j < active.length; j++) {
			const a = active[i]
			const b = active[j]
			const dx = a.x - b.x
			const dz = a.z - b.z
			const dist = Math.sqrt(dx * dx + dz * dz)

			if (dist < SWAN_HERD_MERGE_RADIUS) {
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
					for (const s of active) {
						if (s.herdId === oldId) s.herdId = newId
					}
				}
			}
		}
	}
}

function getHerdTarget(
	swans: Swan[],
	herdId: number,
): { tx: number; tz: number } | null {
	for (const s of swans) {
		if (s.herdId === herdId && s.state === 'walking') {
			return { tx: s.targetX, tz: s.targetZ }
		}
	}
	return null
}

// ── Pick a valid wander target ──

function pickWanderTarget(
	swan: Swan,
	getGroundY: (x: number, z: number) => number,
	waterZones: WaterZone[],
	solidObstacles: SolidObstacle[],
	rand: () => number,
): { tx: number; tz: number } {
	for (let attempt = 0; attempt < 10; attempt++) {
		const angle = rand() * Math.PI * 2
		const dist = 2 + rand() * (SWAN_WANDER_RADIUS - 2)
		const tx = swan.x + Math.cos(angle) * dist
		const tz = swan.z + Math.sin(angle) * dist

		// Swans can go on water — no water rejection

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

	return { tx: swan.x, tz: swan.z }
}

// ── Main update ──

const _rand = mulberry32(88888)

export function updateSwansSystem(
	ctx: SwanUpdateContext,
	dt: number,
): SwanUpdateResult {
	const result: SwanUpdateResult = { scoopCount: 0 }

	updateHerds(ctx.swans)

	for (const swan of ctx.swans) {
		const pos = swan.mesh.position

		switch (swan.state) {
			case 'idle': {
				swan.idleTimer -= dt

				const idleWaterY = getWaterSurfaceYAt(pos.x, pos.z, ctx.waterZones)
				if (idleWaterY !== null) {
					pos.y = idleWaterY
					poseSwanSwimming(swan.model, swan.animPhase)
					swan.animPhase += dt * 0.5
				} else {
					pos.y = ctx.getGroundY(pos.x, pos.z)
					poseSwanSitting(swan.model)
				}
				swan.mesh.rotation.y = swan.yaw

				if (shouldFlee(swan, ctx)) {
					startFleeing(swan, ctx)
					break
				}

				if (checkScoop(swan, ctx, result)) break

				if (swan.idleTimer <= 0) {
					let target: { tx: number; tz: number }

					if (swan.herdId !== -1) {
						const herdTarget = getHerdTarget(ctx.swans, swan.herdId)
						if (herdTarget) {
							target = herdTarget
						} else {
							target = pickWanderTarget(
								swan,
								ctx.getGroundY,
								ctx.waterZones,
								ctx.solidObstacles,
								_rand,
							)
						}
					} else {
						target = pickWanderTarget(
							swan,
							ctx.getGroundY,
							ctx.waterZones,
							ctx.solidObstacles,
							_rand,
						)
					}

					swan.targetX = target.tx
					swan.targetZ = target.tz
					swan.state = 'walking'
				}
				break
			}

			case 'walking': {
				if (shouldFlee(swan, ctx)) {
					startFleeing(swan, ctx)
					break
				}

				if (checkScoop(swan, ctx, result)) break

				const dx = swan.targetX - swan.x
				const dz = swan.targetZ - swan.z
				const dist = Math.sqrt(dx * dx + dz * dz)

				if (dist < 0.5) {
					swan.state = 'idle'
					swan.idleTimer = _rand() * SWAN_IDLE_MAX
					poseSwanIdle(swan.model)
					break
				}

				const speed = SWAN_WALK_SPEED
				const moveX = (dx / dist) * speed * dt
				const moveZ = (dz / dist) * speed * dt

				let newX = swan.x + moveX
				let newZ = swan.z + moveZ

				// Avoid solid obstacles
				for (const obs of ctx.solidObstacles) {
					const odx = newX - obs.x
					const odz = newZ - obs.z
					const oDist = Math.sqrt(odx * odx + odz * odz)
					if (oDist < obs.radius + 0.3) {
						const nx = odx / oDist
						const nz = odz / oDist
						newX = obs.x + nx * (obs.radius + 0.3)
						newZ = obs.z + nz * (obs.radius + 0.3)
					}
				}

				// Herd separation
				for (const other of ctx.swans) {
					if (other === swan) continue
					if (other.state === 'launched' || other.state === 'landed') continue
					const sdx = newX - other.x
					const sdz = newZ - other.z
					const sDist = Math.sqrt(sdx * sdx + sdz * sdz)
					if (sDist < SWAN_MIN_SEPARATION && sDist > 0.001) {
						const snx = sdx / sDist
						const snz = sdz / sDist
						newX += snx * (SWAN_MIN_SEPARATION - sDist)
						newZ += snz * (SWAN_MIN_SEPARATION - sDist)
					}
				}

				swan.x = newX
				swan.z = newZ
				swan.yaw = Math.atan2(dx, dz)

				pos.x = swan.x
				pos.z = swan.z
				swan.mesh.rotation.y = swan.yaw

				const walkWaterY = getWaterSurfaceYAt(swan.x, swan.z, ctx.waterZones)
				if (walkWaterY !== null) {
					pos.y = walkWaterY
					swan.animPhase += dt * speed * 2
					poseSwanSwimming(swan.model, swan.animPhase)
				} else {
					pos.y = ctx.getGroundY(swan.x, swan.z)
					swan.animPhase += dt * speed * 4
					poseSwanWalking(swan.model, swan.animPhase)
				}
				break
			}

			case 'fleeing': {
				if (checkScoop(swan, ctx, result)) break

				const dx = swan.targetX - swan.x
				const dz = swan.targetZ - swan.z
				const dist = Math.sqrt(dx * dx + dz * dz)

				if (dist < 0.5 || !shouldFlee(swan, ctx)) {
					swan.state = 'idle'
					swan.idleTimer = _rand() * SWAN_IDLE_MAX * 0.5
					break
				}

				const speed = SWAN_FLEE_SPEED
				let newX = swan.x + (dx / dist) * speed * dt
				let newZ = swan.z + (dz / dist) * speed * dt

				// Avoid solid obstacles
				for (const obs of ctx.solidObstacles) {
					const odx = newX - obs.x
					const odz = newZ - obs.z
					const oDist = Math.sqrt(odx * odx + odz * odz)
					if (oDist < obs.radius + 0.3) {
						const nx = odx / oDist
						const nz = odz / oDist
						newX = obs.x + nx * (obs.radius + 0.3)
						newZ = obs.z + nz * (obs.radius + 0.3)
					}
				}

				swan.x = newX
				swan.z = newZ
				swan.yaw = Math.atan2(dx, dz)

				pos.x = swan.x
				pos.z = swan.z
				swan.mesh.rotation.y = swan.yaw

				const fleeWaterY = getWaterSurfaceYAt(swan.x, swan.z, ctx.waterZones)
				if (fleeWaterY !== null) {
					pos.y = fleeWaterY
					swan.animPhase += dt * speed * 3
					poseSwanSwimming(swan.model, swan.animPhase)
				} else {
					pos.y = ctx.getGroundY(swan.x, swan.z)
					swan.animPhase += dt * speed * 5
					poseSwanFleeing(swan.model, swan.animPhase)
				}
				break
			}

			case 'launched': {
				swan.velY -= GRAVITY * dt
				pos.x += swan.velX * dt
				pos.y += swan.velY * dt
				pos.z += swan.velZ * dt

				swan.mesh.rotation.x += 8 * dt
				swan.mesh.rotation.z += 5 * dt

				swan.animPhase += dt * 12
				poseSwanFleeing(swan.model, swan.animPhase)

				// Bounce off obstacles
				for (const obs of ctx.solidObstacles) {
					const odx = obs.x - pos.x
					const odz = obs.z - pos.z
					const oDist = Math.sqrt(odx * odx + odz * odz)
					const minDist = obs.radius + 0.3
					if (oDist < minDist && oDist > 0.001) {
						const nx = odx / oDist
						const nz = odz / oDist
						swan.velX = -nx * 8
						swan.velZ = -nz * 8
						pos.x += -nx * (minDist - oDist)
						pos.z += -nz * (minDist - oDist)
					}
				}

				// Bounce off buildings
				if (resolvePositionAgainstBuildings(pos, 0.3, ctx.buildingColliders)) {
					const speed = Math.sqrt(swan.velX * swan.velX + swan.velZ * swan.velZ)
					if (speed > 0.001) {
						swan.velX *= -6 / speed
						swan.velZ *= -6 / speed
					}
				}

				// Land on ground or water
				const groundY = ctx.getGroundY(pos.x, pos.z)
				const launchWaterY = getWaterSurfaceYAt(pos.x, pos.z, ctx.waterZones)
				const landY =
					launchWaterY !== null ? Math.max(groundY, launchWaterY) : groundY
				if (pos.y <= landY && swan.velY < 0) {
					pos.y = landY
					swan.state = 'landed'
					swan.landedTimer = SWAN_LANDED_DURATION
					swan.mesh.rotation.x = 0
					swan.mesh.rotation.z = 0
					swan.x = pos.x
					swan.z = pos.z
					if (launchWaterY !== null) {
						poseSwanSwimming(swan.model, swan.animPhase)
					} else {
						poseSwanSitting(swan.model)
					}
				}
				break
			}

			case 'landed': {
				if (checkScoop(swan, ctx, result)) break

				swan.landedTimer -= dt
				const landedWaterY = getWaterSurfaceYAt(pos.x, pos.z, ctx.waterZones)
				if (landedWaterY !== null) {
					pos.y = landedWaterY
					poseSwanSwimming(swan.model, swan.animPhase)
					swan.animPhase += dt * 0.5
				} else {
					pos.y = ctx.getGroundY(pos.x, pos.z)
					poseSwanSitting(swan.model)
				}

				if (swan.landedTimer <= 0) {
					swan.state = 'idle'
					swan.idleTimer = _rand() * SWAN_IDLE_MAX * 0.3
					swan.mesh.rotation.x = 0
					swan.mesh.rotation.z = 0
				}
				break
			}
		}
	}

	return result
}

// ── Helpers ──

function shouldFlee(swan: Swan, ctx: SwanUpdateContext): boolean {
	const bdx = ctx.busPos.x - swan.x
	const bdz = ctx.busPos.z - swan.z
	const busDist = Math.sqrt(bdx * bdx + bdz * bdz)
	return busDist < SWAN_FLEE_RADIUS
}

function startFleeing(swan: Swan, ctx: SwanUpdateContext) {
	const bdx = swan.x - ctx.busPos.x
	const bdz = swan.z - ctx.busPos.z
	const bDist = Math.sqrt(bdx * bdx + bdz * bdz) || 1

	const fleeDistance = SWAN_FLEE_RADIUS * 3
	swan.targetX = swan.x + (bdx / bDist) * fleeDistance
	swan.targetZ = swan.z + (bdz / bDist) * fleeDistance
	swan.state = 'fleeing'
	swan.herdId = -1
}

function checkScoop(
	swan: Swan,
	ctx: SwanUpdateContext,
	result: SwanUpdateResult,
): boolean {
	if (ctx.localPlayerRole !== 'bus') return false
	if (Math.abs(ctx.busSpeed) < 0.5) return false

	const bdx = ctx.busPos.x - swan.x
	const bdz = ctx.busPos.z - swan.z
	const busDist = Math.sqrt(bdx * bdx + bdz * bdz)

	if (busDist < SWAN_SCOOP_DISTANCE) {
		const absSpeed = Math.abs(ctx.busSpeed)
		const fwdX = Math.sin(ctx.busYaw)
		const fwdZ = Math.cos(ctx.busYaw)

		swan.state = 'launched'
		swan.velX = fwdX * ctx.busSpeed * SCOOP_FORWARD_FACTOR + (_rand() - 0.5) * 3
		swan.velY = Math.max(SCOOP_MIN_UP, absSpeed * SCOOP_UP_FACTOR) + _rand() * 3
		swan.velZ = fwdZ * ctx.busSpeed * SCOOP_FORWARD_FACTOR + (_rand() - 0.5) * 3
		swan.herdId = -1

		result.scoopCount++
		return true
	}

	return false
}
