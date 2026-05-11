/**
 * Blocky Deer model.
 *
 * Low-poly box-based geometry matching the corgi/goose style.
 * Brown body, white belly, short tail, antlers (on some).
 *
 * Total height (ground → antler top) ≈ 1.4 m standing.
 * Forward direction is +Z (nose faces +Z).
 */
import {
	type Scene,
	Vector3,
	MeshBuilder,
	StandardMaterial,
	Color3,
	TransformNode,
} from '@babylonjs/core'

// ── Deer colour palette ────────────────────────────────────

const BODY_BROWN = new Color3(0.55, 0.35, 0.18)
const BELLY_TAN = new Color3(0.82, 0.72, 0.55)
const LEG_BROWN = new Color3(0.45, 0.28, 0.14)
const HEAD_BROWN = new Color3(0.5, 0.32, 0.16)
const NOSE_DARK = new Color3(0.15, 0.1, 0.08)
const EYE_COLOR = new Color3(0.06, 0.06, 0.06)
const EYE_RING = new Color3(0.85, 0.78, 0.6)
const ANTLER_COLOR = new Color3(0.6, 0.45, 0.25)
const TAIL_COLOR = new Color3(0.8, 0.7, 0.5)
const EAR_INNER = new Color3(0.75, 0.55, 0.4)
const RUMP_WHITE = new Color3(0.95, 0.93, 0.88)

// ── Dimensions (metres) ───────────────────────────────────

// Legs
const LEG_H = 0.4
const LEG_W = 0.06
const LEG_D = 0.06
const HOOF_W = 0.07
const HOOF_D = 0.08
const HOOF_H = 0.03

// Body
const BODY_W = 0.28
const BODY_H = 0.3
const BODY_D = 0.55
const BODY_Y = LEG_H + BODY_H / 2

// Belly patch
const BELLY_H = 0.12
const BELLY_D = 0.4

// Neck
const NECK_W = 0.14
const NECK_H = 0.3
const NECK_D = 0.12
const NECK_BOTTOM = LEG_H + BODY_H * 0.6
const NECK_Y = NECK_BOTTOM + NECK_H / 2
const NECK_Z = BODY_D / 2 - 0.04

// Head
const HEAD_W = 0.14
const HEAD_H = 0.12
const HEAD_D = 0.18
const HEAD_Y = NECK_H + HEAD_H / 2 - 0.02
const HEAD_Z = 0.02

// Nose
const NOSE_W = 0.08
const NOSE_H = 0.06
const NOSE_D = 0.04

// Ears
const EAR_W = 0.04
const EAR_H = 0.08
const EAR_D = 0.03

// Antlers
const ANTLER_W = 0.02
const ANTLER_H = 0.14
const ANTLER_D = 0.02
const ANTLER_BRANCH_W = 0.08
const ANTLER_BRANCH_H = 0.02
const ANTLER_BRANCH_D = 0.02

// Tail
const TAIL_W = 0.06
const TAIL_H = 0.08
const TAIL_D = 0.04

// ───────────────────────────────────────────────────────────

export interface DeerModelResult {
	root: TransformNode
	frontLeftLeg: TransformNode
	frontRightLeg: TransformNode
	rearLeftLeg: TransformNode
	rearRightLeg: TransformNode
	neck: TransformNode
}

export function createDeerModel(scene: Scene, id: number): DeerModelResult {
	const root = new TransformNode(`deer_${id}`, scene)

	// ── Materials ──
	const bodyMat = makeMat(`dBody_${id}`, BODY_BROWN, scene)
	const bellyMat = makeMat(`dBelly_${id}`, BELLY_TAN, scene)
	const legMat = makeMat(`dLeg_${id}`, LEG_BROWN, scene)
	const headMat = makeMat(`dHead_${id}`, HEAD_BROWN, scene)
	const noseMat = makeMat(`dNose_${id}`, NOSE_DARK, scene)
	const eyeMat = makeMat(`dEye_${id}`, EYE_COLOR, scene)
	const eyeRingMat = makeMat(`dEyeR_${id}`, EYE_RING, scene)
	const antlerMat = makeMat(`dAntler_${id}`, ANTLER_COLOR, scene)
	const tailMat = makeMat(`dTail_${id}`, TAIL_COLOR, scene)
	const earInnerMat = makeMat(`dEarIn_${id}`, EAR_INNER, scene)
	const rumpMat = makeMat(`dRump_${id}`, RUMP_WHITE, scene)

	// ═══════════════════════════════════════
	//  Body
	// ═══════════════════════════════════════
	const body = MeshBuilder.CreateBox(
		`dBody_${id}`,
		{
			width: BODY_W,
			height: BODY_H,
			depth: BODY_D,
		},
		scene,
	)
	body.material = bodyMat
	body.position.y = BODY_Y
	body.parent = root

	// Belly (lighter underside)
	const belly = MeshBuilder.CreateBox(
		`dBelly_${id}`,
		{
			width: BODY_W - 0.04,
			height: BELLY_H,
			depth: BELLY_D,
		},
		scene,
	)
	belly.material = bellyMat
	belly.position.set(0, LEG_H + BELLY_H / 2 + 0.01, 0)
	belly.parent = root

	// ═══════════════════════════════════════
	//  Tail
	// ═══════════════════════════════════════
	const tail = MeshBuilder.CreateBox(
		`dTail_${id}`,
		{
			width: TAIL_W,
			height: TAIL_H,
			depth: TAIL_D,
		},
		scene,
	)
	tail.material = tailMat
	tail.position.set(0, BODY_Y + BODY_H / 4, -BODY_D / 2 - TAIL_D / 2 + 0.02)
	tail.rotation.x = -0.3
	tail.parent = root

	// White rump patch (roe deer heart-shaped marking)
	const rump = MeshBuilder.CreateBox(
		`dRump_${id}`,
		{
			width: BODY_W - 0.02,
			height: BODY_H * 0.6,
			depth: 0.02,
		},
		scene,
	)
	rump.material = rumpMat
	rump.position.set(0, BODY_Y + BODY_H * 0.05, -BODY_D / 2 - 0.005)
	rump.parent = root

	// ═══════════════════════════════════════
	//  Neck
	// ═══════════════════════════════════════
	const neckPivot = new TransformNode(`dNeckPiv_${id}`, scene)
	neckPivot.position = new Vector3(0, NECK_BOTTOM, NECK_Z)
	neckPivot.parent = root

	const neck = MeshBuilder.CreateBox(
		`dNeck_${id}`,
		{
			width: NECK_W,
			height: NECK_H,
			depth: NECK_D,
		},
		scene,
	)
	neck.material = bodyMat
	neck.position.y = NECK_H / 2
	neck.parent = neckPivot

	// ═══════════════════════════════════════
	//  Head
	// ═══════════════════════════════════════
	const head = MeshBuilder.CreateBox(
		`dHead_${id}`,
		{
			width: HEAD_W,
			height: HEAD_H,
			depth: HEAD_D,
		},
		scene,
	)
	head.material = headMat
	head.position.set(0, HEAD_Y, HEAD_Z)
	head.parent = neckPivot

	// Nose
	const nose = MeshBuilder.CreateBox(
		`dNose_${id}`,
		{
			width: NOSE_W,
			height: NOSE_H,
			depth: NOSE_D,
		},
		scene,
	)
	nose.material = noseMat
	nose.position.set(0, HEAD_Y - 0.02, HEAD_Z + HEAD_D / 2 + NOSE_D / 2 - 0.01)
	nose.parent = neckPivot

	// Eyes
	const eyeSize = 0.022
	const eyeY = HEAD_Y + 0.02
	for (const side of [-1, 1]) {
		const ring = MeshBuilder.CreateBox(
			`dEyeR${side > 0 ? 'R' : 'L'}_${id}`,
			{
				width: 0.01,
				height: eyeSize + 0.008,
				depth: eyeSize + 0.008,
			},
			scene,
		)
		ring.material = eyeRingMat
		ring.position.set(side * (HEAD_W / 2 + 0.001), eyeY, HEAD_Z + HEAD_D / 4)
		ring.parent = neckPivot

		const eye = MeshBuilder.CreateBox(
			`dEye${side > 0 ? 'R' : 'L'}_${id}`,
			{
				width: 0.012,
				height: eyeSize,
				depth: eyeSize,
			},
			scene,
		)
		eye.material = eyeMat
		eye.position.set(side * (HEAD_W / 2 + 0.002), eyeY, HEAD_Z + HEAD_D / 4)
		eye.parent = neckPivot
	}

	// Ears
	for (const side of [-1, 1]) {
		const ear = MeshBuilder.CreateBox(
			`dEar${side > 0 ? 'R' : 'L'}_${id}`,
			{
				width: EAR_W,
				height: EAR_H,
				depth: EAR_D,
			},
			scene,
		)
		ear.material = earInnerMat
		ear.position.set(
			side * (HEAD_W / 2 - 0.01),
			HEAD_Y + HEAD_H / 2 + EAR_H / 2 - 0.01,
			HEAD_Z - 0.02,
		)
		ear.rotation.z = side * 0.3
		ear.parent = neckPivot
	}

	// Antlers (every other deer gets antlers for variety)
	if (id % 2 === 0) {
		for (const side of [-1, 1]) {
			// Main antler shaft
			const shaft = MeshBuilder.CreateBox(
				`dAntler${side > 0 ? 'R' : 'L'}_${id}`,
				{
					width: ANTLER_W,
					height: ANTLER_H,
					depth: ANTLER_D,
				},
				scene,
			)
			shaft.material = antlerMat
			shaft.position.set(
				side * (HEAD_W / 2 - 0.02),
				HEAD_Y + HEAD_H / 2 + ANTLER_H / 2,
				HEAD_Z - 0.02,
			)
			shaft.rotation.z = side * -0.2
			shaft.parent = neckPivot

			// Branch
			const branch = MeshBuilder.CreateBox(
				`dAntlerBr${side > 0 ? 'R' : 'L'}_${id}`,
				{
					width: ANTLER_BRANCH_W,
					height: ANTLER_BRANCH_H,
					depth: ANTLER_BRANCH_D,
				},
				scene,
			)
			branch.material = antlerMat
			branch.position.set(
				side * (HEAD_W / 2 - 0.02 + (side * ANTLER_BRANCH_W) / 3),
				HEAD_Y + HEAD_H / 2 + ANTLER_H * 0.7,
				HEAD_Z - 0.02,
			)
			branch.parent = neckPivot
		}
	}

	// ═══════════════════════════════════════
	//  Legs (4 legs with hooves)
	// ═══════════════════════════════════════
	const frontLegZ = BODY_D * 0.3
	const rearLegZ = -BODY_D * 0.3
	const legX = 0.08

	// Front left
	const flPivot = new TransformNode(`dFLLegPiv_${id}`, scene)
	flPivot.position = new Vector3(-legX, LEG_H, frontLegZ)
	flPivot.parent = root
	buildLeg(`dFL_${id}`, flPivot, legMat, scene)

	// Front right
	const frPivot = new TransformNode(`dFRLegPiv_${id}`, scene)
	frPivot.position = new Vector3(legX, LEG_H, frontLegZ)
	frPivot.parent = root
	buildLeg(`dFR_${id}`, frPivot, legMat, scene)

	// Rear left
	const rlPivot = new TransformNode(`dRLLegPiv_${id}`, scene)
	rlPivot.position = new Vector3(-legX, LEG_H, rearLegZ)
	rlPivot.parent = root
	buildLeg(`dRL_${id}`, rlPivot, legMat, scene)

	// Rear right
	const rrPivot = new TransformNode(`dRRLegPiv_${id}`, scene)
	rrPivot.position = new Vector3(legX, LEG_H, rearLegZ)
	rrPivot.parent = root
	buildLeg(`dRR_${id}`, rrPivot, legMat, scene)

	return {
		root,
		frontLeftLeg: flPivot,
		frontRightLeg: frPivot,
		rearLeftLeg: rlPivot,
		rearRightLeg: rrPivot,
		neck: neckPivot,
	}
}

function buildLeg(
	prefix: string,
	pivot: TransformNode,
	mat: StandardMaterial,
	scene: Scene,
) {
	const leg = MeshBuilder.CreateBox(
		`${prefix}Leg`,
		{
			width: LEG_W,
			height: LEG_H,
			depth: LEG_D,
		},
		scene,
	)
	leg.material = mat
	leg.position.y = -LEG_H / 2
	leg.parent = pivot

	const hoof = MeshBuilder.CreateBox(
		`${prefix}Hoof`,
		{
			width: HOOF_W,
			height: HOOF_H,
			depth: HOOF_D,
		},
		scene,
	)
	hoof.material = mat
	hoof.position.set(0, -LEG_H + HOOF_H / 2, HOOF_D / 6)
	hoof.parent = pivot
}

// ── Animation poses ─────────────────────────────────────────

/** Walking animation — 4-legged gait, subtle neck bob. */
export function poseDeerWalking(model: DeerModelResult, phase: number) {
	const swing = Math.sin(phase) * 0.4
	model.frontLeftLeg.rotation.x = swing
	model.frontRightLeg.rotation.x = -swing
	model.rearLeftLeg.rotation.x = -swing
	model.rearRightLeg.rotation.x = swing
	model.neck.rotation.x = Math.sin(phase * 2) * 0.06
}

/** Idle/standing pose — legs straight, head up. */
export function poseDeerIdle(model: DeerModelResult) {
	model.frontLeftLeg.rotation.x = 0
	model.frontRightLeg.rotation.x = 0
	model.rearLeftLeg.rotation.x = 0
	model.rearRightLeg.rotation.x = 0
	model.neck.rotation.x = 0
}

/** Resting pose — legs tucked. */
export function poseDeerSitting(model: DeerModelResult) {
	model.frontLeftLeg.rotation.x = -0.8
	model.frontRightLeg.rotation.x = -0.8
	model.rearLeftLeg.rotation.x = -1.0
	model.rearRightLeg.rotation.x = -1.0
	model.neck.rotation.x = -0.1
}

/** Fleeing/running pose — fast gallop with stretched neck. */
export function poseDeerFleeing(model: DeerModelResult, phase: number) {
	// Galloping gait — front legs together, rear legs together
	const frontSwing = Math.sin(phase) * 0.8
	const rearSwing = Math.sin(phase + 1.2) * 0.8
	model.frontLeftLeg.rotation.x = frontSwing
	model.frontRightLeg.rotation.x = frontSwing * 0.9 // slight offset
	model.rearLeftLeg.rotation.x = rearSwing
	model.rearRightLeg.rotation.x = rearSwing * 0.9
	// Neck stretched forward for running
	model.neck.rotation.x = 0.3
}

/** Running animation — distinct from walking, used for the run state. */
export function poseDeerRunning(model: DeerModelResult, phase: number) {
	// Trotting gait — diagonal pairs
	const swing = Math.sin(phase) * 0.6
	model.frontLeftLeg.rotation.x = swing
	model.frontRightLeg.rotation.x = -swing
	model.rearLeftLeg.rotation.x = -swing * 0.8
	model.rearRightLeg.rotation.x = swing * 0.8
	// Head slightly forward and bobbing
	model.neck.rotation.x = 0.15 + Math.sin(phase * 2) * 0.08
}

// ── Helper ──

function makeMat(name: string, color: Color3, scene: Scene): StandardMaterial {
	const mat = new StandardMaterial(name, scene)
	mat.diffuseColor = color
	mat.specularColor = Color3.Black()
	return mat
}
