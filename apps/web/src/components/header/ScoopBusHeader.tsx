import { Scene } from '../../engine'
import { Canvas } from '../../engine/components'
import { createBusController } from './BusController'
import bgAsset from '@/assets/misc/bg.png'
import { createRunnerController } from './RunnerController'
import { runners } from './runners'
import { createEffect, createSignal, onCleanup, onMount } from 'solid-js'
import { createShadowController } from './ShadowController'
import { type RunResultItem } from '@/utils/api'
import { parseTimeToSeconds } from '@/utils/misc'
// import { createSignController } from './SignController'

function updateRunnerSpeedsAndConnections(results: RunResultItem[]) {
  // Find the latest result for each parkrunId
  const latestByParkrunId = new Map<string, RunResultItem>()
  for (const result of results) {
    const existing = latestByParkrunId.get(result.parkrunId)
    if (!existing || result.date > existing.date) {
      latestByParkrunId.set(result.parkrunId, result)
    }
  }

  // Helper to get a runner's latest time in seconds (or null if no result)
  const getTime = (key: string): number | null => {
    const [getter] = runners[key]
    const result = latestByParkrunId.get(getter().id)
    return result ? parseTimeToSeconds(result.time) : null
  }

  // --- Update speeds ---
  for (const [key, [getter, setter]] of Object.entries(runners)) {
    const runnerData = getter()
    const latestResult = latestByParkrunId.get(runnerData.id)
    if (!latestResult) continue

    // Speed inversely proportional to time:
    // 18:00 (1080s) → 4, 36:00 (2160s) → 2, 59:16 (3556s) → ~1.2
    const timeInSeconds = parseTimeToSeconds(latestResult.time)
    const speed = Math.max(0.5, 4320 / timeInSeconds)

    // Frame interval proportional to speed:
    // speed 4 → 62, speed 2 → 124
    let frameInterval = 186 - 31 * speed

    // Lyra and Link have halved frameInterval (sprites move differently)
    if (key === 'lyra' || key === 'link') {
      frameInterval /= 2
    }

    // Clear dynamic connections (keep only static ones like link→alisa)
    const connectedTo = key === 'link' ? 'alisa' : undefined

    console.log(
      'name', runnerData.name,
      'time', latestResult.time,
      'speed', speed.toFixed(2),
      'frameInterval', frameInterval.toFixed(0),
    )

    setter({ ...runnerData, speed, frameInterval, connectedTo, latestTime: latestResult.time })
  }

  // --- Update dynamic connections ---
  const lyraTime = getTime('lyra')
  const annaTime = getTime('anna')
  const augustTime = getTime('august')
  const claireTime = getTime('claire')

  // Anna/August/Lyra pairing
  if (lyraTime != null && annaTime != null && augustTime != null) {
    const allWithin30 =
      Math.abs(lyraTime - annaTime) <= 30 &&
      Math.abs(lyraTime - augustTime) <= 30 &&
      Math.abs(annaTime - augustTime) <= 30

    if (allWithin30) {
      // Chain: anna ← lyra ← august
      const [lyraGet, lyraSet] = runners['lyra']
      lyraSet({ ...lyraGet(), connectedTo: 'anna' })
      const [augGet, augSet] = runners['august']
      augSet({ ...augGet(), connectedTo: 'lyra' })
    } else {
      // Whichever of anna/august is closest to lyra connects to her
      const annaDiff = Math.abs(lyraTime - annaTime)
      const augustDiff = Math.abs(lyraTime - augustTime)
      const closerKey = annaDiff <= augustDiff ? 'anna' : 'august'
      const [closerGet, closerSet] = runners[closerKey]
      closerSet({ ...closerGet(), connectedTo: 'lyra' })
    }
  } else if (lyraTime != null) {
    // Only one of anna/august has results — connect whichever does
    if (annaTime != null) {
      const [annaGet, annaSet] = runners['anna']
      annaSet({ ...annaGet(), connectedTo: 'lyra' })
    } else if (augustTime != null) {
      const [augGet, augSet] = runners['august']
      augSet({ ...augGet(), connectedTo: 'lyra' })
    }
  }

  // Claire/Anna pairing: if within 30s, slower connectedTo faster
  if (claireTime != null && annaTime != null && Math.abs(claireTime - annaTime) <= 30) {
    if (claireTime > annaTime) {
      // Claire is slower, connect to anna
      const [claireGet, claireSet] = runners['claire']
      claireSet({ ...claireGet(), connectedTo: 'anna' })
    } else {
      // Anna is slower (or equal), connect to claire
      const [annaGet, annaSet] = runners['anna']
      annaSet({ ...annaGet(), connectedTo: 'claire' })
    }
  }
}

interface ScoopBusHeaderProps {
  results: RunResultItem[]
}

export function ScoopBusHeader(props: ScoopBusHeaderProps) {

  const [mousePosition, setMousePosition] = createSignal({ x: 0, y: 0 })
  const [updatedSpeeds, setUpdatedSpeeds] = createSignal(false)
  createEffect(() => {
    if (props.results.length > 0 && !updatedSpeeds()) {
      console.log('Updating runner speeds based on latest results...')
      updateRunnerSpeedsAndConnections(props.results)
      setUpdatedSpeeds(true)
    }
  })

  const sceneWidth = window.innerWidth
  const scene = new Scene('header', {
    width: sceneWidth,
    height: 230,
    images: [],
    setup($scene) {
      // Create Runners
      const runnerIds = Object.keys(runners) as (keyof typeof runners)[]
      const runnerControllers = Array(runnerIds.length * 1).fill(0).map((_, i) =>
        createRunnerController(
          `runner${i}`,
          runnerIds[i % runnerIds.length],
          Math.ceil(Math.random() * 10) * 3,
          mousePosition,
        ),
      ).sort((a, b) => a.data.y() - b.data.y()) // Sort by y position so they render in the correct order

      // Add runner shadows
      $scene.addController(...runnerControllers.map(runner =>
        createShadowController(`shadow-${runner.data.id}`, runner)),
      )

      // Add bus
      $scene.addController(createBusController('bus', $scene))

      // Add runners
      $scene.addController(...runnerControllers)

      // Add sign
      // $scene.addController(createSignController('sign'))
    }
  })

  const windowResizeHandler = () => {
    scene.setWidth(window.innerWidth)
  }

  const windowMouseMoveHandler = (e: MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY })
  }


  onMount(() => {
    window.addEventListener('resize', windowResizeHandler)
    window.addEventListener('mousemove', windowMouseMoveHandler)
  })

  onCleanup(() => {
    window.removeEventListener('resize', windowResizeHandler)
    window.removeEventListener('mousemove', windowMouseMoveHandler)
  })

  return (
    <Canvas scene={scene} style={{
      background: `
        url(${bgAsset}) repeat-x bottom,
        linear-gradient(to bottom, var(--sky-blue-top), var(--sky-blue-bottom))
      `,
    }}/>
  )
}
