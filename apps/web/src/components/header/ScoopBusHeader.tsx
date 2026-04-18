import { Scene } from '../../engine'
import { Canvas } from '../../engine/components'
import { createBusController } from './BusController'
import bg1Asset from '@/assets/misc/bg1.png'
import bg2Asset from '@/assets/misc/bg2.png'
import bg3Asset from '@/assets/misc/bg3.png'
import sunAsset from '@/assets/misc/sun.png'
import starsAsset from '@/assets/misc/stars.png'
import house1Asset from '@/assets/misc/house1.png'
import house2Asset from '@/assets/misc/house2.png'
import pathAsset from '@/assets/misc/path.png'
import { createRunnerController, isStandingState, RUNNER_LABEL_RENDER_DISTANCE } from './RunnerController'
import type { RunnerController } from './RunnerController'
import { RunnerName, runners, type RunnerState } from '@/data/runners'
import { createSignal, onCleanup, onMount } from 'solid-js'
import { useNavigate } from '@solidjs/router'
import { createShadowController } from './ShadowController'
import { startSkyService } from './SkyService'
import { type RunResultItem, type VolunteerItem } from '@/utils/api'
import { parseTimeToSeconds } from '@/utils/misc'
import {
  createCloudController,
  createPlantController,
  createSignController,
  createTreeController,
} from './SceneryControllers'
import { css } from '@style/css'
import { moonAsset } from '@/utils/moonAsset'
import { RoleTranslations } from '@/data/volunteer-roles'

export const HEADER_HEIGHT = 240

function determineRunnerState(latestVol: VolunteerItem | undefined, latestSaturday: string | undefined): RunnerState {
  if (!latestVol || !latestSaturday) return 'run'
  // Only show volunteer state if they volunteered on the most recent Saturday with any results
  if (latestVol.date === latestSaturday) {
    if (latestVol.roles.includes('Streckkod scanning')) return 'scanner'
    if (latestVol.roles.includes('Sistagångare')) return 'tail-walker'
    if (latestVol.roles.includes('Fotograf')) return 'photographer'
    if (latestVol.roles.includes('Loppansvarig')) return 'run-director'
    if (latestVol.roles.includes('Funktionär')) return 'marshal'
  }
  return 'run'
}

function updateRunnerSpeedsAndConnections(results: RunResultItem[], volunteers: VolunteerItem[]) {
  // Find the latest result for each parkrunId
  const latestByParkrunId = new Map<string, RunResultItem>()
  for (const result of results) {
    const existing = latestByParkrunId.get(result.parkrunId)
    if (!existing || result.date > existing.date) {
      latestByParkrunId.set(result.parkrunId, result)
    }
  }

  // Find the latest volunteer entry for each parkrunId
  const latestVolByParkrunId = new Map<string, VolunteerItem>()
  for (const vol of volunteers) {
    const existing = latestVolByParkrunId.get(vol.parkrunId)
    if (!existing || vol.date > existing.date) {
      latestVolByParkrunId.set(vol.parkrunId, vol)
    }
  }

  // Find the latest Saturday across all results and volunteer entries
  let latestSaturday: string | undefined
  for (const result of results) {
    if (!latestSaturday || result.date > latestSaturday) {
      latestSaturday = result.date
    }
  }
  for (const vol of volunteers) {
    if (!latestSaturday || vol.date > latestSaturday) {
      latestSaturday = vol.date
    }
  }

  // --- Update speeds ---
  for (const [key, [getter, setter]] of Object.entries(runners)) {
    const runnerData = getter()
    const latestResult = latestByParkrunId.get(runnerData.id)

    // Link stays connected to Alisa unless Alisa has a standing volunteer role
    if (!latestResult) {
      if (key === 'link') {
        const alisaVol = latestVolByParkrunId.get(runners.alisa[0]().id)
        const alisaState = determineRunnerState(alisaVol, latestSaturday)
        const connectedTo = isStandingState(alisaState) ? undefined : 'alisa'
        setter({ ...runnerData, connectedTo })
      }
      continue
    }

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

    // Link inherits Alisa's volunteer state
    const volData = key === 'link'
      ? latestVolByParkrunId.get(runners.alisa[0]().id)
      : latestVolByParkrunId.get(runnerData.id)

    // Link stays connected to Alisa unless Alisa has a standing volunteer role
    const connectedTo = key === 'link'
      ? (isStandingState(determineRunnerState(volData, latestSaturday)) ? undefined : 'alisa')
      : undefined

    const translations = RoleTranslations as Record<string, string>
    const volunteerRoles = volData && latestSaturday && volData.date === latestSaturday
      ? volData.roles.map(r => translations[r] ?? r)
      : undefined

    // Only hide the time if the runner volunteered on the latest Saturday but didn't run it
    const volunteeredLatest = volunteerRoles && volunteerRoles.length > 0
    const ranLatest = latestResult.date === latestSaturday
    const latestTime = (volunteeredLatest && !ranLatest) ? undefined : latestResult.time

    setter({ ...runnerData, speed, time, frameInterval, connectedTo, latestTime, volunteerRoles, runnerState: determineRunnerState(volData, latestSaturday) })
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
    // Skip runners with standing volunteer roles — they don't move, so they shouldn't follow anyone
    const currentState = runners[key as RunnerName][0]().runnerState ?? 'run'
    if (isStandingState(currentState)) continue

    const eventKey = `${current.result.event}:${current.result.eventNumber}`

    // Find all other runners at the same event
    // Exclude runners with standing volunteer roles — they don't move, so connecting to them
    // would leave the follower stuck in place
    const sameEvent: { key: string; timeSeconds: number; position: number }[] = []
    for (const [otherKey, other] of runnerLatest) {
      if (otherKey === key) continue
      const otherState = runners[otherKey as RunnerName][0]().runnerState ?? 'run'
      if (isStandingState(otherState)) continue
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
  volunteers: VolunteerItem[]
}

export function ScoopBusHeader(props: ScoopBusHeaderProps) {
  const navigate = useNavigate()
  const [mousePosition, setMousePosition] = createSignal({ x: 0, y: 0 })

  // Must run before scene setup so runnerState is available for render ordering
  updateRunnerSpeedsAndConnections(props.results, props.volunteers)

  const sceneWidth = window.innerWidth
  const scene = new Scene('header', {
    width: sceneWidth,
    height: HEADER_HEIGHT,
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

      // Split runners into standing (render behind bus) and moving (render in front)
      const standingRunners = runnerControllers.filter(r => {
        const [runner] = runners[r.data.runnerId as keyof typeof runners]
        return isStandingState(runner().runnerState ?? 'run')
      })
      const movingRunners = runnerControllers.filter(r => {
        const [runner] = runners[r.data.runnerId as keyof typeof runners]
        return !isStandingState(runner().runnerState ?? 'run')
      })

      // Add standing runners (behind bus, no shadows)
      $scene.addController(...standingRunners)

      // Add moving runner shadows
      $scene.addController(...movingRunners.map(runner =>
        createShadowController(`shadow-${runner.data.id}`, runner)),
      )

      // Add bus
      $scene.addController(createBusController('bus', $scene))

      // Add moving runners (in front of bus)
      $scene.addController(...movingRunners)
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

    const stopSkyService = startSkyService()
    onCleanup(() => {
      stopSkyService()
    })
  })

  onCleanup(() => {
    window.removeEventListener('resize', windowResizeHandler)
    window.removeEventListener('mousemove', windowMouseMoveHandler)
  })

  return (
    <div aria-role="heading" aria-label="Welcome to the Scoop Bus Run Club!">
      <div aria-hidden="true">
        <div class={styles.underlay}>
          <div class={styles.path} style={{ '--image': `url(${pathAsset})` }} />
          <div class={styles.bg1} style={{ '--image': `url(${bg1Asset})` }} />
          <div class={styles.bg2} style={{ '--image': `url(${bg2Asset})` }} />
          <div class={styles.house2} style={{ '--image': `url(${house2Asset})` }} />
          <div class={styles.house1} style={{ '--image': `url(${house1Asset})` }} />
          <div class={styles.bg3} style={{ '--image': `url(${bg3Asset})` }} />
          <div class={styles.sun} style={{ '--image': `url(${sunAsset})` }} />
          <div class={styles.moon} style={{ '--image': `url(${moonAsset})` }} />
          <div class={styles.stars} style={{ '--image': `url(${starsAsset})` }} />
          <div class={styles.sky} style={{ '--image': 'linear-gradient(to bottom, var(--sky-blue-top), var(--sky-blue-bottom) 35%)' }} />
        </div>
        <div class={styles.canvas}>
          <Canvas
            scene={scene}
            style={{ cursor: 'pointer', background: 'transparent' }}
            onClick={({ x, y }) => {
              const closest = scene.getControllersByType<RunnerController>('runner')
                .map(c => ({
                  runnerId: c.data.runnerId,
                  dist: Math.hypot(
                    c.data.x() + c.data.width() / 2 - x,
                    c.data.y() + c.data.height() / 2 - y
                  )
                }))
                .filter(({ dist }) => dist < RUNNER_LABEL_RENDER_DISTANCE)
                .sort((a, b) => a.dist - b.dist)[0]

              if (closest) {
                navigate(`/member/${closest.runnerId}`)
              } else {
                navigate('/')
              }
            }}
          />
        </div>
      </div>
    </div>
  )
}

const styles = {
  canvas: css({
    position: 'relative',
    zIndex: 100,
  }),
  underlay: css({
    height: '240px',
    mb: '-240px',
    width: '100%',
    position: 'relative',
    '& > div': {
      position: 'absolute',
      inset: 0,
      backgroundImage: 'var(--image)',
    },
  }),
  sky: css({
    zIndex: 1,
    backgroundRepeat: 'repeat',
  }),
  stars: css({
    zIndex: 2,
    backgroundRepeat: 'x-repeat',
    backgroundPosition: '0px 0px',
    opacity: 'var(--stars-opacity)',
    backgroundSize: '600px',
  }),
  moon: css({
    zIndex: 3,
    backgroundSize: '100%',
    height: '30px',
    width: '30px',
    inset: 'calc(-25px + var(--moon-y) * 160px) auto auto 30% !important',
    opacity: 'var(--moon-opacity)',
    transform: 'rotate(var(--moon-angle, 0rad))',
    filter: 'blur(1.5px)',
  }),
  sun: css({
    zIndex: 4,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: `
      70%
      calc(-40px + var(--sun-y) * 120px)
    `,
  }),
  bg3: css({
    zIndex: 5,
    backgroundRepeat: 'repeat-x',
    backgroundPosition: '0px 70px',
  }),
  house1: css({
    zIndex: 6,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: '30% 65px',
  }),
  house2: css({
    zIndex: 7,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'calc(40% + 70px) 65px',
  }),
  bg2: css({
    zIndex: 8,
    backgroundRepeat: 'repeat-x',
    backgroundPosition: '0px 90px',
  }),
  bg1: css({
    zIndex: 9,
    backgroundRepeat: 'repeat-x',
    backgroundPosition: 'bottom',
  }),
  path: css({
    zIndex: 10,
    backgroundRepeat: 'repeat-x',
    backgroundPosition: '0px 158px',
  }),
}

/*
// Test filter for making page darker
  filter: `
    saturate(calc(0.7 + 0.3 * var(--light)))
    brightness(calc(0.5 + 0.5 * var(--light)))
    hue-rotate(calc(30deg * (1 - var(--light))))
  `,
 */