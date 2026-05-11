/**
 * Gamepad input system using the Gamepad API.
 * Supports two controllers for local multiplayer.
 *
 * PS Controller mapping (standard gamepad layout):
 *   R2 (axis 5 / button 7) = Accelerate
 *   L2 (axis 4 / button 6) = Reverse
 *   Left analog (axes 0,1) or D-pad (buttons 12-15) = Steer
 *   Right analog (axes 2,3) = Camera orbit (independent of player facing)
 *   X (button 0) = Action (jump for runner, scoop for bus)
 *   O (button 1) = Item use (runner power-up)
 *   Triangle (button 3) = Rear camera toggle
 */

export interface GamepadInputState {
	/** Acceleration input 0..1 (R2 trigger) */
	accel: number
	/** Reverse input 0..1 (L2 trigger) */
	reverse: number
	/** Steering -1 (left) to 1 (right), from left stick or d-pad */
	steerX: number
	/** Forward/back on left stick -1 (forward push) to 1 (pull back) */
	steerY: number
	/** Right analog X: -1 (left) to 1 (right) for camera orbit */
	cameraX: number
	/** Right analog Y: -1 (up) to 1 (down) — reserved for future use */
	cameraY: number
	/** X button pressed this frame (rising edge) */
	actionPressed: boolean
	/** X button held */
	actionHeld: boolean
	/** O button pressed this frame (rising edge) */
	itemPressed: boolean
	/** O button held */
	itemHeld: boolean
	/** Triangle button pressed this frame (rising edge) */
	rearCameraPressed: boolean
	/** Triangle button held */
	rearCameraHeld: boolean
	/** Whether a gamepad is actually connected for this slot */
	connected: boolean
}

const DEAD_ZONE = 0.15

function applyDeadZone(value: number): number {
	if (Math.abs(value) < DEAD_ZONE) return 0
	// Remap so that just outside dead zone starts at 0
	const sign = Math.sign(value)
	return (sign * (Math.abs(value) - DEAD_ZONE)) / (1 - DEAD_ZONE)
}

/**
 * Manages up to 2 gamepads for local multiplayer.
 * Call `poll()` every frame to read latest input state.
 */
export class GamepadManager {
	private prevButtonStates: [boolean[], boolean[]] = [[], []]
	private states: [GamepadInputState, GamepadInputState]

	constructor() {
		const empty = (): GamepadInputState => ({
			accel: 0,
			reverse: 0,
			steerX: 0,
			steerY: 0,
			cameraX: 0,
			cameraY: 0,
			actionPressed: false,
			actionHeld: false,
			itemPressed: false,
			itemHeld: false,
			rearCameraPressed: false,
			rearCameraHeld: false,
			connected: false,
		})
		this.states = [empty(), empty()]
	}

	/** Poll gamepads and update state. Call once per frame. */
	poll(): void {
		const gamepads = navigator.getGamepads()
		// Find up to 2 connected gamepads in index order
		const connected: Gamepad[] = []
		for (let i = 0; i < gamepads.length && connected.length < 2; i++) {
			const gp = gamepads[i]
			if (gp && gp.connected) connected.push(gp)
		}

		for (let slot = 0; slot < 2; slot++) {
			const gp = connected[slot] ?? null
			const state = this.states[slot]

			if (!gp) {
				state.connected = false
				state.accel = 0
				state.reverse = 0
				state.steerX = 0
				state.steerY = 0
				state.cameraX = 0
				state.cameraY = 0
				state.actionPressed = false
				state.actionHeld = false
				state.itemPressed = false
				state.itemHeld = false
				state.rearCameraPressed = false
				state.rearCameraHeld = false
				this.prevButtonStates[slot] = []
				continue
			}

			state.connected = true

			// --- Triggers ---
			// Standard mapping: L2 = button 6, R2 = button 7
			// Some browsers also expose triggers as axes 2 (L2) and 5 (R2) — range 0..1 or -1..1
			// We'll use button values (0..1) which is more reliable in standard mapping
			const r2Value = gp.buttons[7]?.value ?? 0
			const l2Value = gp.buttons[6]?.value ?? 0
			state.accel = r2Value
			state.reverse = l2Value

			// --- Left stick (steering) + D-pad ---
			const leftX = applyDeadZone(gp.axes[0] ?? 0)
			const leftY = applyDeadZone(gp.axes[1] ?? 0)

			// D-pad: buttons 12=up, 13=down, 14=left, 15=right
			let dpadX = 0
			let dpadY = 0
			if (gp.buttons[14]?.pressed) dpadX -= 1
			if (gp.buttons[15]?.pressed) dpadX += 1
			if (gp.buttons[12]?.pressed) dpadY -= 1
			if (gp.buttons[13]?.pressed) dpadY += 1

			// Combine stick + dpad, clamp
			state.steerX = Math.max(-1, Math.min(1, leftX + dpadX))
			state.steerY = Math.max(-1, Math.min(1, leftY + dpadY))

			// --- Right stick (camera orbit) ---
			state.cameraX = applyDeadZone(gp.axes[2] ?? 0)
			state.cameraY = applyDeadZone(gp.axes[3] ?? 0)

			// --- Buttons (with rising-edge detection) ---
			const prevButtons = this.prevButtonStates[slot]

			// X = button 0
			const xHeld = gp.buttons[0]?.pressed ?? false
			state.actionHeld = xHeld
			state.actionPressed = xHeld && !prevButtons[0]

			// O = button 1
			const oHeld = gp.buttons[1]?.pressed ?? false
			state.itemHeld = oHeld
			state.itemPressed = oHeld && !prevButtons[1]

			// Triangle = button 3
			const triHeld = gp.buttons[3]?.pressed ?? false
			state.rearCameraHeld = triHeld
			state.rearCameraPressed = triHeld && !prevButtons[3]

			// Store current button states for next frame edge detection
			this.prevButtonStates[slot] = gp.buttons.map((b) => b.pressed)
		}
	}

	/** Get input state for player slot (0 = P1, 1 = P2) */
	getState(playerIndex: 0 | 1): GamepadInputState {
		return this.states[playerIndex]
	}

	/** Whether any gamepad is connected */
	get anyConnected(): boolean {
		return this.states[0].connected || this.states[1].connected
	}
}
