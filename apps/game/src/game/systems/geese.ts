/**
 * Goose AI system.
 *
 * Handles spawning, herding, wandering, fleeing, and scooping of geese.
 *
 * Behaviour:
 *   - Solo geese wander: pick a random point within 10m, walk there, sit 0–45s.
 *   - Geese within 2m form a herd and share a target destination.
 *   - If bus or runner comes within 3m, geese flee away (ignoring herd).
 *   - Herds within 2m of each other merge.
 *   - Geese avoid water and solid obstacles.
 *   - Scoopable: bus impact launches them like runners but they ragdoll (no riding).
 */
import { type Scene, Vector3, MeshBuilder, Mesh } from '@babylonjs/core'
import {
	createGooseModel,
	poseGooseWalking,
	poseGooseIdle,
	poseGooseSitting,
	poseGooseFleeing,
	poseGooseSwimming,
} from '../objects/GooseModel'
import type { GooseModelResult } from '../objects/GooseModel'
import type {
	Goose,
	SolidObstacle,
	BuildingCollider,
	WaterZone,
} from '../types'
import { resolvePositionAgainstBuildings } from './buildings'
import { isInWaterZone, getWaterSurfaceYAt } from './terrain'
import {
	GOOSE_HERD_RADIUS,
	GOOSE_FLEE_RADIUS,
	GOOSE_WANDER_RADIUS,
	GOOSE_WALK_SPEED,
	GOOSE_FLEE_SPEED,
	GOOSE_IDLE_MAX,
	GOOSE_MIN_SEPARATION,
	GOOSE_SCOOP_DISTANCE,
	GOOSE_HERD_MERGE_RADIUS,
	GOOSE_LANDED_DURATION,
	GRAVITY,
	SCOOP_UP_FACTOR,
	SCOOP_MIN_UP,
	SCOOP_FORWARD_FACTOR,
} from '../constants'

// ── Seeded RNG (same as terrain.ts) ──

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

export interface GooseSpawnPoint {
	x: number
	z: number
	rotation: number // radians
}

export function spawnGeese(
	scene: Scene,
	spawnPoints: GooseSpawnPoint[],
	getGroundY: (x: number, z: number) => number,
): Goose[] {
	const geese: Goose[] = []
	const rand = mulberry32(54321)

	for (let i = 0; i < spawnPoints.length; i++) {
		const sp = spawnPoints[i]
		const model = createGooseModel(scene, i)
		model.root.scaling.setAll(2)
		const groundY = getGroundY(sp.x, sp.z)
		model.root.position = new Vector3(sp.x, groundY, sp.z)

		const anchor = MeshBuilder.CreateBox(
			`gooseAnchor_${i}`,
			{ width: 0.01, height: 0.01, depth: 0.01 },
			scene,
		)
		anchor.isVisible = false
		anchor.position = model.root.position.clone()
		model.root.parent = anchor
		model.root.position = Vector3.Zero()

		geese.push({
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
			idleTimer: rand() * GOOSE_IDLE_MAX,
			herdId: -1,
			landedTimer: 0,
		})
	}

	return geese
}

// ── Update context ──

export interface GooseUpdateContext {
	scene: Scene
	geese: Goose[]
	getGroundY: (x: number, z: number) => number
	busPos: Vector3
	busYaw: number
	busSpeed: number
	localPlayerRole: 'bus' | 'runner'
	solidObstacles: SolidObstacle[]
	buildingColliders: BuildingCollider[]
	waterZones: WaterZone[]
}

export interface GooseUpdateResult {
	scoopCount: number
}

// ── Herd management ──

let nextHerdId = 0

function resetHerds(geese: Goose[]) {
	for (const g of geese) {
		if (g.state === 'launched' || g.state === 'landed') continue
		g.herdId = -1
	}
	nextHerdId = 0
}

function updateHerds(geese: Goose[]) {
	// Reset all herd IDs
	resetHerds(geese)

	const active = geese.filter(
		(g) => g.state !== 'launched' && g.state !== 'landed',
	)

	// Build herds by proximity
	for (let i = 0; i < active.length; i++) {
		for (let j = i + 1; j < active.length; j++) {
			const a = active[i]
			const b = active[j]
			const dx = a.x - b.x
			const dz = a.z - b.z
			const dist = Math.sqrt(dx * dx + dz * dz)

			if (dist < GOOSE_HERD_MERGE_RADIUS) {
				if (a.herdId === -1 && b.herdId === -1) {
					// Both solo — create new herd
					const id = nextHerdId++
					a.herdId = id
					b.herdId = id
				} else if (a.herdId !== -1 && b.herdId === -1) {
					b.herdId = a.herdId
				} else if (a.herdId === -1 && b.herdId !== -1) {
					a.herdId = b.herdId
				} else if (a.herdId !== b.herdId) {
					// Merge: reassign all of b's herd to a's herd
					const oldId = b.herdId
					const newId = a.herdId
					for (const g of active) {
						if (g.herdId === oldId) g.herdId = newId
					}
				}
			}
		}
	}
}

function getHerdTarget(
	geese: Goose[],
	herdId: number,
): { tx: number; tz: number } | null {
	// Find the first goose in this herd that has a walking target
	for (const g of geese) {
		if (g.herdId === herdId && g.state === 'walking') {
			return { tx: g.targetX, tz: g.targetZ }
		}
	}
	return null
}

// ── Pick a valid wander target ──

function pickWanderTarget(
	goose: Goose,
	getGroundY: (x: number, z: number) => number,
	waterZones: WaterZone[],
	solidObstacles: SolidObstacle[],
	rand: () => number,
): { tx: number; tz: number } {
	// Try up to 10 random positions
	for (let attempt = 0; attempt < 10; attempt++) {
		const angle = rand() * Math.PI * 2
		const dist = 2 + rand() * (GOOSE_WANDER_RADIUS - 2)
		const tx = goose.x + Math.cos(angle) * dist
		const tz = goose.z + Math.sin(angle) * dist

		// Geese can go on water — no water rejection

		// Reject if inside solid obstacle
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

	// Fallback: stay near current position
	return { tx: goose.x, tz: goose.z }
}

// ── Main update ──

const _rand = mulberry32(99999)

export function updateGeeseSystem(
	ctx: GooseUpdateContext,
	dt: number,
): GooseUpdateResult {
	const result: GooseUpdateResult = { scoopCount: 0 }

	// Update herds
	updateHerds(ctx.geese)

	for (const goose of ctx.geese) {
		const pos = goose.mesh.position

		switch (goose.state) {
			case 'idle': {
				goose.idleTimer -= dt

				// Keep Y synced — float on water or sit on ground
				const idleWaterY = getWaterSurfaceYAt(pos.x, pos.z, ctx.waterZones)
				if (idleWaterY !== null) {
					pos.y = idleWaterY
					poseGooseSwimming(goose.model, goose.animPhase)
					goose.animPhase += dt * 0.5
				} else {
					pos.y = ctx.getGroundY(pos.x, pos.z)
					poseGooseSitting(goose.model)
				}
				goose.mesh.rotation.y = goose.yaw

				// Check for flee trigger
				if (shouldFlee(goose, ctx)) {
					startFleeing(goose, ctx)
					break
				}

				// Check for scoop
				if (checkScoop(goose, ctx, result)) break

				if (goose.idleTimer <= 0) {
					// Time to wander
					let target: { tx: number; tz: number }

					// If in a herd, share target with herd
					if (goose.herdId !== -1) {
						const herdTarget = getHerdTarget(ctx.geese, goose.herdId)
						if (herdTarget) {
							target = herdTarget
						} else {
							target = pickWanderTarget(
								goose,
								ctx.getGroundY,
								ctx.waterZones,
								ctx.solidObstacles,
								_rand,
							)
						}
					} else {
						target = pickWanderTarget(
							goose,
							ctx.getGroundY,
							ctx.waterZones,
							ctx.solidObstacles,
							_rand,
						)
					}

					goose.targetX = target.tx
					goose.targetZ = target.tz
					goose.state = 'walking'
				}
				break
			}

			case 'walking': {
				// Check for flee trigger first
				if (shouldFlee(goose, ctx)) {
					startFleeing(goose, ctx)
					break
				}

				// Check for scoop
				if (checkScoop(goose, ctx, result)) break

				const dx = goose.targetX - goose.x
				const dz = goose.targetZ - goose.z
				const dist = Math.sqrt(dx * dx + dz * dz)

				if (dist < 0.5) {
					// Reached target — go idle
					goose.state = 'idle'
					goose.idleTimer = _rand() * GOOSE_IDLE_MAX
					poseGooseIdle(goose.model)
					break
				}

				// Move toward target
				const speed = GOOSE_WALK_SPEED
				const moveX = (dx / dist) * speed * dt
				const moveZ = (dz / dist) * speed * dt

				let newX = goose.x + moveX
				let newZ = goose.z + moveZ

				// Geese can walk into water — no water avoidance

				// Avoid solid obstacles
				for (const obs of ctx.solidObstacles) {
					const odx = newX - obs.x
					const odz = newZ - obs.z
					const oDist = Math.sqrt(odx * odx + odz * odz)
					if (oDist < obs.radius + 0.3) {
						// Push out
						const nx = odx / oDist
						const nz = odz / oDist
						newX = obs.x + nx * (obs.radius + 0.3)
						newZ = obs.z + nz * (obs.radius + 0.3)
					}
				}

				// Herd separation — don't walk into other geese
				for (const other of ctx.geese) {
					if (other === goose) continue
					if (other.state === 'launched' || other.state === 'landed') continue
					const sdx = newX - other.x
					const sdz = newZ - other.z
					const sDist = Math.sqrt(sdx * sdx + sdz * sdz)
					if (sDist < GOOSE_MIN_SEPARATION && sDist > 0.001) {
						const snx = sdx / sDist
						const snz = sdz / sDist
						newX += snx * (GOOSE_MIN_SEPARATION - sDist)
						newZ += snz * (GOOSE_MIN_SEPARATION - sDist)
					}
				}

				goose.x = newX
				goose.z = newZ
				goose.yaw = Math.atan2(dx, dz)

				pos.x = goose.x
				pos.z = goose.z
				goose.mesh.rotation.y = goose.yaw

				// Float on water or walk on ground
				const walkWaterY = getWaterSurfaceYAt(goose.x, goose.z, ctx.waterZones)
				if (walkWaterY !== null) {
					pos.y = walkWaterY
					goose.animPhase += dt * speed * 2
					poseGooseSwimming(goose.model, goose.animPhase)
				} else {
					pos.y = ctx.getGroundY(goose.x, goose.z)
					goose.animPhase += dt * speed * 4
					poseGooseWalking(goose.model, goose.animPhase)
				}
				break
			}

			case 'fleeing': {
				// Check for scoop
				if (checkScoop(goose, ctx, result)) break

				const dx = goose.targetX - goose.x
				const dz = goose.targetZ - goose.z
				const dist = Math.sqrt(dx * dx + dz * dz)

				if (dist < 0.5 || !shouldFlee(goose, ctx)) {
					// Escaped or target reached — go idle
					goose.state = 'idle'
					goose.idleTimer = _rand() * GOOSE_IDLE_MAX * 0.5
					break
				}

				const speed = GOOSE_FLEE_SPEED
				let newX = goose.x + (dx / dist) * speed * dt
				let newZ = goose.z + (dz / dist) * speed * dt

				// Geese can flee into water — no water avoidance

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

				goose.x = newX
				goose.z = newZ
				goose.yaw = Math.atan2(dx, dz)

				pos.x = goose.x
				pos.z = goose.z
				goose.mesh.rotation.y = goose.yaw

				// Float on water or run on ground
				const fleeWaterY = getWaterSurfaceYAt(goose.x, goose.z, ctx.waterZones)
				if (fleeWaterY !== null) {
					pos.y = fleeWaterY
					goose.animPhase += dt * speed * 3
					poseGooseSwimming(goose.model, goose.animPhase)
				} else {
					pos.y = ctx.getGroundY(goose.x, goose.z)
					goose.animPhase += dt * speed * 5
					poseGooseFleeing(goose.model, goose.animPhase)
				}
				break
			}

			case 'launched': {
				// Physics ragdoll — same as runner launched state
				goose.velY -= GRAVITY * dt
				pos.x += goose.velX * dt
				pos.y += goose.velY * dt
				pos.z += goose.velZ * dt

				// Tumble rotation
				goose.mesh.rotation.x += 8 * dt
				goose.mesh.rotation.z += 5 * dt

				goose.animPhase += dt * 12
				poseGooseFleeing(goose.model, goose.animPhase)

				// Bounce off obstacles
				for (const obs of ctx.solidObstacles) {
					const odx = obs.x - pos.x
					const odz = obs.z - pos.z
					const oDist = Math.sqrt(odx * odx + odz * odz)
					const minDist = obs.radius + 0.3
					if (oDist < minDist && oDist > 0.001) {
						const nx = odx / oDist
						const nz = odz / oDist
						goose.velX = -nx * 8
						goose.velZ = -nz * 8
						pos.x += -nx * (minDist - oDist)
						pos.z += -nz * (minDist - oDist)
					}
				}

				// Bounce off buildings
				if (resolvePositionAgainstBuildings(pos, 0.3, ctx.buildingColliders)) {
					const speed = Math.sqrt(
						goose.velX * goose.velX + goose.velZ * goose.velZ,
					)
					if (speed > 0.001) {
						goose.velX *= -6 / speed
						goose.velZ *= -6 / speed
					}
				}

				// Land on ground or water
				const groundY = ctx.getGroundY(pos.x, pos.z)
				const launchWaterY = getWaterSurfaceYAt(pos.x, pos.z, ctx.waterZones)
				const landY =
					launchWaterY !== null ? Math.max(groundY, launchWaterY) : groundY
				if (pos.y <= landY && goose.velY < 0) {
					pos.y = landY
					goose.state = 'landed'
					goose.landedTimer = GOOSE_LANDED_DURATION
					goose.mesh.rotation.x = 0
					goose.mesh.rotation.z = 0
					goose.x = pos.x
					goose.z = pos.z
					if (launchWaterY !== null) {
						poseGooseSwimming(goose.model, goose.animPhase)
					} else {
						poseGooseSitting(goose.model)
					}
				}
				break
			}

			case 'landed': {
				// Can be re-scooped once landed (but not while launched/flying)
				if (checkScoop(goose, ctx, result)) break

				goose.landedTimer -= dt
				const landedWaterY = getWaterSurfaceYAt(pos.x, pos.z, ctx.waterZones)
				if (landedWaterY !== null) {
					pos.y = landedWaterY
					poseGooseSwimming(goose.model, goose.animPhase)
					goose.animPhase += dt * 0.5
				} else {
					pos.y = ctx.getGroundY(pos.x, pos.z)
					poseGooseSitting(goose.model)
				}

				if (goose.landedTimer <= 0) {
					// Get back up and return to idle
					goose.state = 'idle'
					goose.idleTimer = _rand() * GOOSE_IDLE_MAX * 0.3
					goose.mesh.rotation.x = 0
					goose.mesh.rotation.z = 0
				}
				break
			}
		}
	}

	return result
}

// ── Helpers ──

function shouldFlee(goose: Goose, ctx: GooseUpdateContext): boolean {
	const bdx = ctx.busPos.x - goose.x
	const bdz = ctx.busPos.z - goose.z
	const busDist = Math.sqrt(bdx * bdx + bdz * bdz)
	return busDist < GOOSE_FLEE_RADIUS
}

function startFleeing(goose: Goose, ctx: GooseUpdateContext) {
	// Flee away from bus
	const bdx = goose.x - ctx.busPos.x
	const bdz = goose.z - ctx.busPos.z
	const bDist = Math.sqrt(bdx * bdx + bdz * bdz) || 1

	// Set target in the opposite direction of the bus
	const fleeDistance = GOOSE_FLEE_RADIUS * 3
	goose.targetX = goose.x + (bdx / bDist) * fleeDistance
	goose.targetZ = goose.z + (bdz / bDist) * fleeDistance
	goose.state = 'fleeing'
	goose.herdId = -1 // break from herd when fleeing
}

function checkScoop(
	goose: Goose,
	ctx: GooseUpdateContext,
	result: GooseUpdateResult,
): boolean {
	if (ctx.localPlayerRole !== 'bus') return false
	if (Math.abs(ctx.busSpeed) < 0.5) return false

	const bdx = ctx.busPos.x - goose.x
	const bdz = ctx.busPos.z - goose.z
	const busDist = Math.sqrt(bdx * bdx + bdz * bdz)

	if (busDist < GOOSE_SCOOP_DISTANCE) {
		// Launch!
		const absSpeed = Math.abs(ctx.busSpeed)
		const fwdX = Math.sin(ctx.busYaw)
		const fwdZ = Math.cos(ctx.busYaw)

		goose.state = 'launched'
		goose.velX =
			fwdX * ctx.busSpeed * SCOOP_FORWARD_FACTOR + (_rand() - 0.5) * 3
		goose.velY =
			Math.max(SCOOP_MIN_UP, absSpeed * SCOOP_UP_FACTOR) + _rand() * 3
		goose.velZ =
			fwdZ * ctx.busSpeed * SCOOP_FORWARD_FACTOR + (_rand() - 0.5) * 3
		goose.herdId = -1

		result.scoopCount++
		return true
	}

	return false
}
