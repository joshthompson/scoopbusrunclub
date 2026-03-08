import { Scene } from '../../engine'
import { Canvas } from '../../engine/components'
import { createBusController } from './BusController'
import bgAsset from '@/assets/misc/bg.png'
import { createRunnerController } from './RunnerController'
import { runners } from './data'
import { createSignal, onCleanup, onMount } from 'solid-js'
import { createShadowController } from './ShadowController'
// import { createSignController } from './SignController'

export function ScoopBusHeader() {

  const [mousePosition, setMousePosition] = createSignal({ x: 0, y: 0 })

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
      $scene.addController(...runnerControllers.map(runner => createShadowController(`shadow-${runner.data.id}`, runner)))

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
