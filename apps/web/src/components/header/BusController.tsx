import { createConnectedController, createController, Scene } from '@/engine'
import { createObjectSignal } from '@/engine'
import { createSignal, type JSX } from 'solid-js'

import busBackAsset from '@/assets/bus/bus-back.png'
import busAsset from '@/assets/bus/bus.png'
import wheel1Asset from '@/assets/bus/wheel1.png'
import wheel2Asset from '@/assets/bus/wheel2.png'
import wheel3Asset from '@/assets/bus/wheel3.png'
import wheel4Asset from '@/assets/bus/wheel4.png'
import scoopAsset from '@/assets/bus/scoop.png'
import windowAsset from '@/assets/bus/windows.png'
import shadowAsset from '@/assets/bus/shadow.png'
import { type RunnerController } from './RunnerController'

const BUS_SPEED = 10
const SCOOP_SPEED = 50
const SCOOP_DURATION = 125
const MIN_BUS_START_X = 1100
const MIN_BUS_OFFSCREEN_PX = 250

// --- Pixel art storm cloud (bus-width, cloud-shaped with bumps, animated) ---
const BUS_WIDTH = 247
const CX = 3 // cloud pixel size
const CLOUD_COLS = Math.ceil(BUS_WIDTH / CX) // 83 cols
const CLOUD_ROWS = 18

// Wisp patterns for the bottom of the cloud — cycles through these
const wispVariants: [number, number][][] = [
  [[8, 35], [40, 55], [60, 75]],
  [[10, 32], [38, 53], [62, 73]],
  [[6, 33], [42, 56], [58, 74]],
  [[12, 36], [39, 51], [61, 72]],
]
const wispVariants2: [number, number][][] = [
  [[12, 30], [45, 52], [63, 72]],
  [[14, 28], [43, 50], [65, 70]],
  [[11, 31], [46, 54], [61, 71]],
  [[13, 27], [44, 51], [64, 73]],
]

function StormCloud(props: { wispFrame: number }) {
  const c = CLOUD_COLS
  const dark = '#2a2a3a'
  const mid = '#353548'
  const highlight = '#3d3d55'

  const wf = () => props.wispFrame % wispVariants.length
  // Pixel grid: each row is an array of [xStart, xEnd] spans
  // Shape has bumpy top (3 lumps) and a flat-ish bottom
  const baseSpans: [number, [number, number][]][] = [
    // Top bumps: left bump, center bump, right bump
    [0,  [[14, 22], [36, 46], [58, 68]]],
    [1,  [[12, 24], [33, 49], [56, 70]]],
    [2,  [[10, 26], [30, 52], [54, 73]]],
    [3,  [[8, 28], [27, 55], [52, 75]]],
    [4,  [[6, 76]]],           // lumps merge
    [5,  [[4, 78]]],
    [6,  [[3, 80]]],
    [7,  [[2, 81]]],
    [8,  [[1, 82]]],
    [9,  [[0, c]]],            // widest
    [10, [[0, c]]],
    [11, [[0, c]]],
    [12, [[1, 82]]],
    [13, [[2, 81]]],
    [14, [[3, 80]]],
    [15, [[5, 78]]],
  ]

  const w = c * CX
  const h = CLOUD_ROWS * CX
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ 'image-rendering': 'pixelated', 'pointer-events': 'none' }}
    >
      {/* Main body */}
      {baseSpans.map(([y, segs]) =>
        segs.map(([x0, x1]) => (
          <rect
            x={x0 * CX}
            y={y * CX}
            width={(x1 - x0) * CX}
            height={CX}
            fill={y <= 1 ? highlight : y <= 3 ? mid : dark}
          />
        ))
      )}
      {/* Animated wisps — row 16 */}
      {wispVariants[wf()].map(([x0, x1]) => (
        <rect x={x0 * CX} y={16 * CX} width={(x1 - x0) * CX} height={CX} fill={dark} />
      ))}
      {/* Animated wisps — row 17 */}
      {wispVariants2[wf()].map(([x0, x1]) => (
        <rect x={x0 * CX} y={17 * CX} width={(x1 - x0) * CX} height={CX} fill={mid} />
      ))}
    </svg>
  ) as JSX.Element
}

// --- Pixel art lightning bolt (long, extending downward) ---
// Generates a jagged zigzag path from top to bottom
function generateBoltSegments(seed: number, totalHeight: number): [number, number][] {
  const segments: [number, number][] = []
  let x = 0
  let y = 0
  // Simple seeded pseudo-random
  let s = seed
  const rand = () => { s = (s * 16807 + 11) % 2147483647; return (s & 0xffff) / 0xffff }

  const segHeight = 4 // pixels per segment vertically
  while (y < totalHeight) {
    segments.push([x, y])
    y += segHeight
    x += Math.floor(rand() * 7) - 3 // drift left/right
  }
  segments.push([x, totalHeight])
  return segments
}

function LightningBolt(props: { seed: number; revealHeight: number; totalHeight: number }) {
  const PX = 2
  const segs = generateBoltSegments(props.seed, Math.ceil(props.totalHeight / PX))
  const boltColor = '#ffe566'
  const glowColor = '#fff8b0'
  const w = 30 * PX
  const h = props.totalHeight

  // Build pixel rects for each segment's line
  const pixels: JSX.Element[] = []
  for (let i = 0; i < segs.length - 1; i++) {
    const [x0, y0] = segs[i]
    const [x1, y1] = segs[i + 1]
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
    for (let t = 0; t <= steps; t++) {
      const px = Math.round(x0 + (x1 - x0) * t / steps) + 15 // center offset
      const py = Math.round(y0 + (y1 - y0) * t / steps)
      // Main bolt pixel
      pixels.push(<rect x={px * PX} y={py * PX} width={PX} height={PX} fill={boltColor} />)
      // Glow pixel (slightly wider)
      pixels.push(<rect x={(px - 1) * PX} y={py * PX} width={PX * 3} height={PX} fill={glowColor} opacity={0.3} />)
    }
  }

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{
        'image-rendering': 'pixelated',
        filter: `drop-shadow(0 0 6px ${boltColor})`,
        'pointer-events': 'none',
        overflow: 'hidden',
      }}
    >
      <defs>
        <clipPath id={`bolt-clip-${props.seed}`}>
          <rect x={0} y={0} width={w} height={props.revealHeight} />
        </clipPath>
      </defs>
      <g clip-path={`url(#bolt-clip-${props.seed})`}>
        {pixels}
      </g>
    </svg>
  ) as JSX.Element
}

export function createBusController(id: string, scene: Scene, lightning = false) {

  const startX = Math.max(scene.canvas.get().width() + 22, MIN_BUS_START_X) // 22 is the width of the scoop, which is the leftmost part of the bus
  const endX = -247 // 247 is the width of the bus, which is the rightmost part of the bus

  const baseY = 58
  const bus = createController({
    frames: [busBackAsset],
    init() {
      return {
        id,
        type: 'bus',
        width: () => 247,
        height: () => 127,
        ...createObjectSignal(startX, 'x'),
        ...createObjectSignal(baseY, 'y'),
        ...createObjectSignal(0, 'rotation'),
        ...createObjectSignal(false, 'scooping'),
      }
    },
    onEnterFrame({ $, $age, $scene }) {
      const float = Math.cos(10 + $age) * 1
      $.setY(baseY + float)
      $.setX($.x() - BUS_SPEED)
      $.setRotation(Math.random() * 1 - 0.5)

      // Reset
      if ($.x() < endX) {
        $.setX(Math.max($scene.canvas.get().width() + 22 + MIN_BUS_OFFSCREEN_PX, MIN_BUS_START_X))
      }

      // Scoop the runners
      const bodyController = $scene.getControllersByType('bus-bus-body')?.[0]
      if (bodyController && !$.scooping()) {
        const scoopXStart = $.x()
        const scoopXEnd = scoopXStart + 88

        $scene.getControllersByType<RunnerController>('runner').forEach(controller => {
          const x = controller.data.x() + controller.data.width()
          if (!controller.data.scooped() && x >= scoopXStart && x <= scoopXEnd) {
            controller.data.setScooped(true)
            controller.data.setYSpeed(SCOOP_SPEED * -1 * (1 + Math.random() * 0.6))
            $.setScooping(true)
            setTimeout(() => $.setScooping(false), SCOOP_DURATION)
          }
        })
      }
    }
  })

  // Attach items
  bus.attach(createConnectedController({
    type: 'bus-shadow',
    base: bus,
    frames: [shadowAsset],
    width: () => 270,
    height: () => 50,
    offset: { x: -20, y: 107 },
    style: () => ({ opacity: 0.1 }),
  }))
  bus.attach(createConnectedController({
    type: 'bus-wheel1',
    base: bus,
    frames: [wheel1Asset],
    width: () => 34,
    height: () => 38,
    offset: { x: 73, y: 105 },
    y: (_, $age) => Math.cos(10 + $age) * -1,
  }))
  bus.attach(createConnectedController({
    type: 'bus-wheel2',
    base: bus,
    frames: [wheel2Asset],
    width: () => 34,
    height: () => 38,
    offset: { x: 5, y: 103 },
    y: (_, $age) => Math.cos(10 + $age + 5) * -1,
  }))
  bus.attach(createConnectedController({
    type: 'bus-wheel3',
    base: bus,
    frames: [wheel3Asset],
    width: () => 19,
    height: () => 23,
    offset: { x: 160, y: 105 },
    y: (_, $age) => Math.cos(10 + $age + 10) * -1,
  }))
  bus.attach(createConnectedController({
    type: 'bus-wheel4',
    base: bus,
    frames: [wheel4Asset],
    width: () => 26,
    height: () => 30,
    offset: { x: 197, y: 102 },
    y: (_, $age) => Math.cos(10 + $age + 15) * -1,
  }))
  bus.attach(createConnectedController({
    type: 'bus-window',
    base: bus,
    frames: [windowAsset],
    width: () => 212,
    height: () => 40,
    offset: { x: 26, y: 26 },
    style: () => ({ opacity: 0.75 }),
  }))
  bus.attach(createConnectedController({
    type: 'bus-body',
    base: bus,
    frames: [busAsset],
    width: () => 247,
    height: () => 127,
    offset: { x: 0, y: 0 },
  }))
  bus.attach(createConnectedController({
    type: 'bus-scoop',
    base: bus,
    frames: [scoopAsset],
    width: () => 88,
    height: () => 57,
    offset: { x: -22, y: 94 },
    style: ($) => ({
      transition: `transform ${SCOOP_DURATION / 2}ms linear`,
      transform: $.scooping() ? 'translateY(-45px) rotate(10deg)' : 'translateY(0px) rotate(0deg)',
    }),
  }))

  // --- Storm cloud & lightning (only when enabled) ---
  if (lightning) {
  // --- Dark storm cloud above the bus ---
  const cloudW = CLOUD_COLS * CX
  const cloudH = CLOUD_ROWS * CX
  const [wispFrame, setWispFrame] = createSignal(0)
  bus.attach(createConnectedController({
    type: 'storm-cloud',
    base: bus,
    width: () => cloudW,
    height: () => cloudH,
    offset: { x: 0, y: -55 },
    y: (_, $age) => Math.sin($age * 0.15) * 2,
    init: () => ({
      children: () => <StormCloud wispFrame={wispFrame()} />,
    } as any),
    style: () => ({
      'pointer-events': 'none',
      'z-index': '5',
    }),
    onEnterFrame: ({ $age }) => {
      // Advance wisps every 5 frames
      if ($age % 5 === 0) setWispFrame(f => f + 1)
    },
  }))

  // --- Evil lightning bolts — each fires independently ---
  const BOLT_HEIGHT_MIN = 120
  const BOLT_HEIGHT_MAX = 150 // 25% longer
  const BOLT_ANIM_FRAMES = 3
  const BOLT_HOLD_FRAMES = 2
  const BOLT_FADE_FRAMES = 1
  const BOLT_COOLDOWN_MIN = 6
  const BOLT_COOLDOWN_VARY = 18

  const boltPositions = [
    { x: -5, flip: false },
    { x: 25, flip: true },
    { x: 55, flip: false },
    { x: 85, flip: true },
    { x: 115, flip: false },
    { x: 145, flip: true },
    { x: 175, flip: false },
    { x: 205, flip: true },
  ]

  boltPositions.forEach((pos, i) => {
    // Each bolt has its own independent animation state
    const [phase, setPhase] = createSignal<'idle' | 'reveal' | 'hold' | 'fade'>('idle')
    const [frame, setFrame] = createSignal(0)
    const [seed, setSeed] = createSignal(i * 12345)
    const [boltHeight, setBoltHeight] = createSignal(BOLT_HEIGHT_MIN)
    let boltCooldown = BOLT_COOLDOWN_MIN + Math.floor(Math.random() * BOLT_COOLDOWN_VARY) + i * 3

    bus.attach(createConnectedController({
      type: `lightning-bolt-${i}`,
      base: bus,
      width: () => 60,
      height: () => boltHeight(),
      offset: { x: pos.x, y: -30 },
      init: () => ({
        children: () => {
          const p = phase()
          if (p === 'idle') return null
          const h = boltHeight()

          let revealFraction = 1
          if (p === 'reveal') revealFraction = frame() / BOLT_ANIM_FRAMES
          if (p === 'fade') revealFraction = 1

          const opacity = p === 'fade' ? Math.max(0, 1 - frame() / BOLT_FADE_FRAMES) : 1

          return (
            <div style={{ opacity: String(opacity), transform: pos.flip ? 'scaleX(-1)' : undefined }}>
              <LightningBolt
                seed={seed()}
                revealHeight={revealFraction * h}
                totalHeight={h}
              />
            </div>
          )
        },
      } as any),
      style: () => ({
        'pointer-events': 'none',
        'z-index': '4',
        overflow: 'visible',
      }),
      onEnterFrame: () => {
        const p = phase()
        const f = frame()

        if (p === 'idle') {
          boltCooldown--
          if (boltCooldown <= 0) {
            setPhase('reveal')
            setFrame(0)
            setSeed(Math.floor(Math.random() * 100000))
            setBoltHeight(BOLT_HEIGHT_MIN + Math.floor(Math.random() * (BOLT_HEIGHT_MAX - BOLT_HEIGHT_MIN)))
          }
        } else if (p === 'reveal') {
          if (f >= BOLT_ANIM_FRAMES) {
            setPhase('hold')
            setFrame(0)
          } else {
            setFrame(f + 1)
          }
        } else if (p === 'hold') {
          if (f >= BOLT_HOLD_FRAMES) {
            setPhase('fade')
            setFrame(0)
          } else {
            setFrame(f + 1)
          }
        } else if (p === 'fade') {
          if (f >= BOLT_FADE_FRAMES) {
            setPhase('idle')
            setFrame(0)
            boltCooldown = BOLT_COOLDOWN_MIN + Math.floor(Math.random() * BOLT_COOLDOWN_VARY)
          } else {
            setFrame(f + 1)
          }
        }
      },
    }))
  })
  } // end if (lightning)

  return bus
}
