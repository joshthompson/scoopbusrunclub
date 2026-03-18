import { Scene } from '../../engine'
import { Canvas } from '../../engine/components'
import { createBusController } from './BusController'
import bg1Asset from '@/assets/misc/bg1.png'
import bg2Asset from '@/assets/misc/bg2.png'
import bg3Asset from '@/assets/misc/bg3.png'
import sunAsset from '@/assets/misc/sun.png'
import house1Asset from '@/assets/misc/house1.png'
import house2Asset from '@/assets/misc/house2.png'
import pathAsset from '@/assets/misc/path.png'
import { createRunnerController } from './RunnerController'
import { RunnerName, runners } from '@/data/runners'
import { createEffect, createSignal, onCleanup, onMount } from 'solid-js'
import { createShadowController } from './ShadowController'
import { type RunResultItem } from '@/utils/api'
import { parseTimeToSeconds } from '@/utils/misc'
import {
  createCloudController,
  createPlantController,
  createSignController,
  createTreeController,
} from './SceneryControllers'

function updateRunnerSpeedsAndConnections(results: RunResultItem[]) {
  // Find the latest result for each parkrunId
  const latestByParkrunId = new Map<string, RunResultItem>()
  for (const result of results) {
    const existing = latestByParkrunId.get(result.parkrunId)
    if (!existing || result.date > existing.date) {
      latestByParkrunId.set(result.parkrunId, result)
    }
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
    const time = latestResult.time

    // Frame interval proportional to speed:
    // speed 4 → 62, speed 2 → 124
    let frameInterval = 186 - 31 * speed

    // Lyra and Link have halved frameInterval (sprites move differently)
    if (key === 'lyra' || key === 'link') {
      frameInterval /= 2
    }

    // Clear dynamic connections (keep only static ones like link→alisa)
    const connectedTo = key === 'link' ? 'alisa' : undefined

    setter({ ...runnerData, speed, time, frameInterval, connectedTo, latestTime: latestResult.time })
  }

  // --- Update dynamic connections ---
  // For each runner (except "link"), find the next-fastest runner at the same event
  // and connect to them if within 30 seconds.
  // Build a map: runner key → their latest result
  const runnerLatest = new Map<string, { key: string; result: RunResultItem; timeSeconds: number }>()
  for (const [key, [getter]] of Object.entries(runners)) {
    if (key === 'link') continue // link is always connected to alisa
    const runnerData = getter()
    const result = latestByParkrunId.get(runnerData.id)
    if (!result) continue
    const timeSeconds = parseTimeToSeconds(result.time)
    runnerLatest.set(key, { key, result, timeSeconds })
  }

  // For each runner, find others at the same event and pick the next-fastest
  for (const [key, current] of runnerLatest) {
    const eventKey = `${current.result.event}:${current.result.eventNumber}`

    // Find all other runners at the same event
    const sameEvent: { key: string; timeSeconds: number; position: number }[] = []
    for (const [otherKey, other] of runnerLatest) {
      if (otherKey === key) continue
      const otherEventKey = `${other.result.event}:${other.result.eventNumber}`
      if (otherEventKey === eventKey) {
        sameEvent.push({ key: otherKey, timeSeconds: other.timeSeconds, position: other.result.position })
      }
    }

    if (sameEvent.length === 0) continue

    // Next fastest = the runner who finished just ahead of the current runner.
    // "Ahead" means faster time, or same time but better (lower) position.
    const faster = sameEvent
      .filter(r => r.timeSeconds < current.timeSeconds
        || (r.timeSeconds === current.timeSeconds && r.position < current.result.position))
      .sort((a, b) => {
        // Sort descending by time (closest slower first), then descending by position (closest position first)
        if (a.timeSeconds !== b.timeSeconds) return b.timeSeconds - a.timeSeconds
        return b.position - a.position
      })

    const nextFastest = faster[0]
    if (nextFastest && current.timeSeconds - nextFastest.timeSeconds <= 30) {
      const [getter, setter] = runners[key as RunnerName]
      setter({ ...getter(), connectedTo: nextFastest.key })
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
    height: 240,
    images: [],
    setup($scene) {
      // Create Runners
      const runnerIds = Object.keys(runners) as (keyof typeof runners)[]
      const runnerControllers = Array(runnerIds.length * 1).fill(0).map((_, i) =>
        createRunnerController(
          `runner${i}`,
          runnerIds[i % runnerIds.length],
          Math.ceil(Math.random() * 30),
          $scene,
          mousePosition,
        ),
      ).sort((a, b) => a.data.y() - b.data.y()) // Sort by y position so they render in the correct order

      // Add clouds
      const CLOUD_DIST = 360
      const CLOUD_COUNT = 10
      for (let i = 0; i < CLOUD_COUNT; i++) {
        $scene.addController(createCloudController(`cloud${i}`, 150 + i * CLOUD_DIST, CLOUD_DIST * CLOUD_COUNT))
      }

      // Add trees
      const trees = Array(40).fill(0)
        .map((_, i) => createTreeController(`tree${i}`, 150 + i * 180))
        .sort((a, b) => (a.data.y() + a.data.height()) - (b.data.y() + b.data.height()))
      $scene.addController(...trees)

      // Add flowers
      const flowers = Array(100).fill(0)
        .map((_, i) => createPlantController(`flower${i}`, 20 + i * 25))
        .sort((a, b) => (a.data.y() + a.data.height()) - (b.data.y() + b.data.height()))
      $scene.addController(...flowers)
      
      // Add sign
      $scene.addController(createSignController('sign'))

      // Add runner shadows
      $scene.addController(...runnerControllers.map(runner =>
        createShadowController(`shadow-${runner.data.id}`, runner)),
      )

      // Add bus
      $scene.addController(createBusController('bus', $scene))

      // Add runners
      $scene.addController(...runnerControllers)
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
    <div aria-role="heading" aria-label="Welcome to the Scoop Bus Run Club!">
      <div aria-hidden="true">
        <Canvas scene={scene} style={{
          background: `
            url(${pathAsset}) repeat-x 0px 158px,
            url(${bg1Asset}) repeat-x bottom,
            url(${bg2Asset}) repeat-x 0px 90px,
            url(${house2Asset}) no-repeat calc(40% + 70px) 65px,
            url(${house1Asset}) no-repeat 30% 65px,
            url(${bg3Asset}) repeat-x 0px 70px,
            url(${sunAsset}) no-repeat 70% 40px,
            linear-gradient(to bottom, var(--sky-blue-top), var(--sky-blue-bottom))
          `,
        }}/>
      </div>
    </div>
  )
}
