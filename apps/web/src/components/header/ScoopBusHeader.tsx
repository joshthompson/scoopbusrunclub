import { Scene } from '../../engine'
import { Canvas } from '../../engine/components'
import { createBusController } from './BusController'
import bgAsset from '@/assets/misc/bg.png'
import { createRunnerController } from './RunnerController'
import { runners } from './data'
import { onCleanup, onMount } from 'solid-js'
import { createShadowController } from './ShadowController'

export function ScoopBusHeader() {
  const sceneWidth = window.innerWidth
  const scene = new Scene('header', {
    width: sceneWidth,
    height: 230,
    images: [],
    setup($scene) {
      // Create Runners
      const runnerIds = Object.keys(runners) as (keyof typeof runners)[]
      const runnerControllers = Array(runnerIds.length * 1).fill(0).map((_, i) =>
        createRunnerController(`runner${i}`, runnerIds[i % runnerIds.length], Math.ceil(Math.random() * 10) * 3),
      ).sort((a, b) => a.data.y() - b.data.y()) // Sort by y position so they render in the correct order

      // Add runner shadows
      $scene.addController(...runnerControllers.map(runner => createShadowController(`shadow-${runner.data.id}`, runner)))

      // Add bus
      $scene.addController(createBusController('bus', $scene))

      // Add runners
      $scene.addController(...runnerControllers)
    }
  })

  const windowResizeHandler = () => {
    scene.setWidth(window.innerWidth)
  }

  onMount(() => {
    window.addEventListener('resize', windowResizeHandler)
  })

  onCleanup(() => {
    window.removeEventListener('resize', windowResizeHandler)
  })

  return (
    <Canvas scene={scene} style={{
      background: `
        url(${bgAsset}) repeat-x bottom,
        linear-gradient(to bottom, #cdfbff, #5ae2ff)
      `,
    }}/>
  )
}
