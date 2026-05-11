/**
 * Blocky Swan model.
 *
 * Low-poly box-based geometry matching the goose style.
 * All-white plumage, long curved neck, orange-black beak,
 * dark legs with webbed feet.
 *
 * Total height (ground → head top) ≈ 0.90 m standing.
 * Forward direction is +Z (beak faces +Z).
 */
import {
	type Scene,
	Vector3,
	MeshBuilder,
	StandardMaterial,
	Color3,
	TransformNode,
} from '@babylonjs/core'

// ── Swan colour palette ────────────────────────────────────

const WHITE = new Color3(0.96, 0.96, 0.95)
const WING_WHITE = new Color3(0.92, 0.92, 0.9)
const BEAK_ORANGE = new Color3(0.9, 0.55, 0.15)
const BEAK_TIP = new Color3(0.1, 0.1, 0.1)
const LEG_COLOR = new Color3(0.2, 0.2, 0.2)
const EYE_COLOR = new Color3(0.05, 0.05, 0.05)
const LORE_BLACK = new Color3(0.08, 0.08, 0.08) // black patch between eye and beak

// ── Dimensions (metres) ───────────────────────────────────

// Legs
const LEG_H = 0.1
const LEG_W = 0.03
const LEG_D = 0.03
const FOOT_W = 0.07
const FOOT_D = 0.09
const FOOT_H = 0.015

// Body (larger and rounder than goose)
const BODY_W = 0.26
const BODY_H = 0.22
const BODY_D = 0.4
const BODY_Y = LEG_H + BODY_H / 2

// Wings (thin slabs on sides, slightly larger than goose)
const WING_W = 0.03
const WING_H = 0.18
const WING_D = 0.36

// Neck (longer and more elegant than goose)
const NECK_W = 0.06
const NECK_H = 0.35
const NECK_D = 0.06
const NECK_BOTTOM = LEG_H + BODY_H * 0.6
const NECK_Y = NECK_BOTTOM + NECK_H / 2
const NECK_Z = BODY_D / 2 - 0.02

// Head (smaller relative to neck length)
const HEAD_W = 0.07
const HEAD_H = 0.06
const HEAD_D = 0.08
const HEAD_Y = NECK_H + HEAD_H / 2 - 0.01
const HEAD_Z = 0.01

// Beak (orange with black tip)
const BEAK_W = 0.035
const BEAK_H = 0.025
const BEAK_D = 0.055

// Tail (raised elegantly)
const TAIL_W = 0.12
const TAIL_H = 0.05
const TAIL_D = 0.1

// ───────────────────────────────────────────────────────────

export interface SwanModelResult {
	root: TransformNode
	leftLeg: TransformNode
	rightLeg: TransformNode
	neck: TransformNode
	leftWing: TransformNode
	rightWing: TransformNode
}

export function createSwanModel(scene: Scene, id: number): SwanModelResult {
	const root = new TransformNode(`swan_${id}`, scene)

	// ── Materials ──
	const whiteMat = makeMat(`sWhite_${id}`, WHITE, scene)
	const wingMat = makeMat(`sWing_${id}`, WING_WHITE, scene)
	const beakMat = makeMat(`sBeak_${id}`, BEAK_ORANGE, scene)
	const beakTipMat = makeMat(`sBeakTip_${id}`, BEAK_TIP, scene)
	const legMat = makeMat(`sLeg_${id}`, LEG_COLOR, scene)
	const eyeMat = makeMat(`sEye_${id}`, EYE_COLOR, scene)
	const loreMat = makeMat(`sLore_${id}`, LORE_BLACK, scene)

	// ═══════════════════════════════════════
	//  Body
	// ═══════════════════════════════════════
	const body = MeshBuilder.CreateBox(
		`sBody_${id}`,
		{
			width: BODY_W,
			height: BODY_H,
			depth: BODY_D,
		},
		scene,
	)
	body.material = whiteMat
	body.position.y = BODY_Y
	body.parent = root

	// ═══════════════════════════════════════
	//  Wings (white slabs on each side, pivoted for animation)
	// ═══════════════════════════════════════
	const leftWingPivot = new TransformNode(`sLWingPiv_${id}`, scene)
	leftWingPivot.position = new Vector3(
		-(BODY_W / 2 - 0.005),
		BODY_Y + 0.01 + WING_H / 2,
		-0.01,
	)
	leftWingPivot.parent = root

	const leftWing = MeshBuilder.CreateBox(
		`sWingL_${id}`,
		{
			width: WING_W,
			height: WING_H,
			depth: WING_D,
		},
		scene,
	)
	leftWing.material = wingMat
	leftWing.position.set(-(WING_W / 2), -WING_H / 2, 0)
	leftWing.parent = leftWingPivot

	const rightWingPivot = new TransformNode(`sRWingPiv_${id}`, scene)
	rightWingPivot.position = new Vector3(
		BODY_W / 2 - 0.005,
		BODY_Y + 0.01 + WING_H / 2,
		-0.01,
	)
	rightWingPivot.parent = root

	const rightWing = MeshBuilder.CreateBox(
		`sWingR_${id}`,
		{
			width: WING_W,
			height: WING_H,
			depth: WING_D,
		},
		scene,
	)
	rightWing.material = wingMat
	rightWing.position.set(WING_W / 2, -WING_H / 2, 0)
	rightWing.parent = rightWingPivot

	// ═══════════════════════════════════════
	//  Tail (raised)
	// ═══════════════════════════════════════
	const tail = MeshBuilder.CreateBox(
		`sTail_${id}`,
		{
			width: TAIL_W,
			height: TAIL_H,
			depth: TAIL_D,
		},
		scene,
	)
	tail.material = whiteMat
	tail.position.set(
		0,
		BODY_Y + BODY_H / 2 - 0.01,
		-BODY_D / 2 - TAIL_D / 2 + 0.03,
	)
	tail.rotation.x = -0.4 // angled upward
	tail.parent = root

	// ═══════════════════════════════════════
	//  Neck (long white column with slight S-curve feel)
	// ═══════════════════════════════════════
	const neckPivot = new TransformNode(`sNeckPiv_${id}`, scene)
	neckPivot.position = new Vector3(0, NECK_BOTTOM, NECK_Z)
	neckPivot.parent = root

	const neck = MeshBuilder.CreateBox(
		`sNeck_${id}`,
		{
			width: NECK_W,
			height: NECK_H,
			depth: NECK_D,
		},
		scene,
	)
	neck.material = whiteMat
	neck.position.y = NECK_H / 2
	neck.parent = neckPivot

	// ═══════════════════════════════════════
	//  Head (white with black lore patch)
	// ═══════════════════════════════════════
	const head = MeshBuilder.CreateBox(
		`sHead_${id}`,
		{
			width: HEAD_W,
			height: HEAD_H,
			depth: HEAD_D,
		},
		scene,
	)
	head.material = whiteMat
	head.position.set(0, HEAD_Y, HEAD_Z)
	head.parent = neckPivot

	// Black lore patch (between eye and beak on each side)
	for (const side of [-1, 1]) {
		const lore = MeshBuilder.CreateBox(
			`sLore${side > 0 ? 'R' : 'L'}_${id}`,
			{
				width: 0.012,
				height: 0.03,
				depth: 0.04,
			},
			scene,
		)
		lore.material = loreMat
		lore.position.set(
			side * (HEAD_W / 2 + 0.001),
			HEAD_Y + 0.005,
			HEAD_Z + HEAD_D / 4,
		)
		lore.parent = neckPivot
	}

	// Eyes (small dark dots on head sides)
	const eyeSize = 0.016
	const eyeY = HEAD_Y + 0.012
	for (const side of [-1, 1]) {
		const eye = MeshBuilder.CreateBox(
			`sEye${side > 0 ? 'R' : 'L'}_${id}`,
			{
				width: 0.012,
				height: eyeSize,
				depth: eyeSize,
			},
			scene,
		)
		eye.material = eyeMat
		eye.position.set(side * (HEAD_W / 2 + 0.003), eyeY, HEAD_Z + HEAD_D / 4)
		eye.parent = neckPivot
	}

	// ═══════════════════════════════════════
	//  Beak (orange with black tip)
	// ═══════════════════════════════════════
	const beak = MeshBuilder.CreateBox(
		`sBeak_${id}`,
		{
			width: BEAK_W,
			height: BEAK_H,
			depth: BEAK_D * 0.7,
		},
		scene,
	)
	beak.material = beakMat
	beak.position.set(
		0,
		HEAD_Y - 0.01,
		HEAD_Z + HEAD_D / 2 + BEAK_D * 0.35 - 0.01,
	)
	beak.parent = neckPivot

	// Black beak tip
	const tip = MeshBuilder.CreateBox(
		`sBeakTip_${id}`,
		{
			width: BEAK_W - 0.005,
			height: BEAK_H - 0.005,
			depth: BEAK_D * 0.3,
		},
		scene,
	)
	tip.material = beakTipMat
	tip.position.set(0, HEAD_Y - 0.01, HEAD_Z + HEAD_D / 2 + BEAK_D * 0.7 - 0.01)
	tip.parent = neckPivot

	// ═══════════════════════════════════════
	//  Legs (with webbed feet)
	// ═══════════════════════════════════════
	const legX = 0.06
	const legZ = BODY_D * 0.1

	const leftLegPivot = new TransformNode(`sLLegPiv_${id}`, scene)
	leftLegPivot.position = new Vector3(-legX, LEG_H, legZ)
	leftLegPivot.parent = root

	const leftLeg = MeshBuilder.CreateBox(
		`sLLeg_${id}`,
		{
			width: LEG_W,
			height: LEG_H,
			depth: LEG_D,
		},
		scene,
	)
	leftLeg.material = legMat
	leftLeg.position.y = -LEG_H / 2
	leftLeg.parent = leftLegPivot

	const leftFoot = MeshBuilder.CreateBox(
		`sLFoot_${id}`,
		{
			width: FOOT_W,
			height: FOOT_H,
			depth: FOOT_D,
		},
		scene,
	)
	leftFoot.material = legMat
	leftFoot.position.set(0, -LEG_H + FOOT_H / 2, FOOT_D / 4)
	leftFoot.parent = leftLegPivot

	const rightLegPivot = new TransformNode(`sRLegPiv_${id}`, scene)
	rightLegPivot.position = new Vector3(legX, LEG_H, legZ)
	rightLegPivot.parent = root

	const rightLeg = MeshBuilder.CreateBox(
		`sRLeg_${id}`,
		{
			width: LEG_W,
			height: LEG_H,
			depth: LEG_D,
		},
		scene,
	)
	rightLeg.material = legMat
	rightLeg.position.y = -LEG_H / 2
	rightLeg.parent = rightLegPivot

	const rightFoot = MeshBuilder.CreateBox(
		`sRFoot_${id}`,
		{
			width: FOOT_W,
			height: FOOT_H,
			depth: FOOT_D,
		},
		scene,
	)
	rightFoot.material = legMat
	rightFoot.position.set(0, -LEG_H + FOOT_H / 2, FOOT_D / 4)
	rightFoot.parent = rightLegPivot

	return {
		root,
		leftLeg: leftLegPivot,
		rightLeg: rightLegPivot,
		neck: neckPivot,
		leftWing: leftWingPivot,
		rightWing: rightWingPivot,
	}
}

// ── Animation poses (same signatures as GooseModel) ─────────

/** Walking animation — legs swing, neck bobs. */
export function poseSwanWalking(model: SwanModelResult, phase: number) {
	const swing = Math.sin(phase) * 0.5
	model.leftLeg.rotation.x = swing
	model.rightLeg.rotation.x = -swing
	model.neck.rotation.x = Math.sin(phase * 2) * 0.06
	model.leftWing.rotation.z = 0
	model.rightWing.rotation.z = 0
}

/** Idle/standing pose — legs straight, neck slightly curved. */
export function poseSwanIdle(model: SwanModelResult) {
	model.leftLeg.rotation.x = 0
	model.rightLeg.rotation.x = 0
	model.neck.rotation.x = -0.15 // slight S-curve
	model.leftWing.rotation.z = 0
	model.rightWing.rotation.z = 0
}

/** Sitting pose — legs tucked, neck upright. */
export function poseSwanSitting(model: SwanModelResult) {
	model.leftLeg.rotation.x = -1.2
	model.rightLeg.rotation.x = -1.2
	model.neck.rotation.x = -0.1
	model.leftWing.rotation.z = 0
	model.rightWing.rotation.z = 0
}

/** Fleeing pose — fast leg swing, neck stretched forward, wings raised. */
export function poseSwanFleeing(model: SwanModelResult, phase: number) {
	const swing = Math.sin(phase) * 0.7
	model.leftLeg.rotation.x = swing
	model.rightLeg.rotation.x = -swing
	model.neck.rotation.x = 0.35
	const flap = Math.sin(phase * 2) * 0.2
	model.leftWing.rotation.z = 0.7 + flap
	model.rightWing.rotation.z = -(0.7 + flap)
}

/** Swimming pose — legs tucked (hidden under water), gentle neck sway. */
export function poseSwanSwimming(model: SwanModelResult, phase: number) {
	model.leftLeg.rotation.x = -1.2
	model.rightLeg.rotation.x = -1.2
	model.neck.rotation.x = -0.12 + Math.sin(phase * 1.5) * 0.04
	model.leftWing.rotation.z = 0
	model.rightWing.rotation.z = 0
}

// ── Helper ──

function makeMat(name: string, color: Color3, scene: Scene): StandardMaterial {
	const mat = new StandardMaterial(name, scene)
	mat.diffuseColor = color
	mat.specularColor = Color3.Black()
	return mat
}
