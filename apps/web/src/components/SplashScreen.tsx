import { createSignal, onMount, onCleanup, Show } from "solid-js"
import { css } from "@style/css"
import { runners as runnerSignals, type RunnerName, RUNNER_SIZE } from "@/data/runners"
import { randomItem } from "@/utils"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Minimum time (ms) the splash screen stays visible, even if data loads faster */
const MIN_DISPLAY_MS = 1500

/** Set to true to always show the loader (for testing without clearing cache) */
export const ALWAYS_SHOW_LOADER = false

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface SplashScreenProps {
  /** true while data is still loading */
  loading: boolean
}

export function SplashScreen(props: SplashScreenProps) {
  const [visible, setVisible] = createSignal(true)
  const [progress, setProgress] = createSignal(0)
  const [fading, setFading] = createSignal(false)

  // Pick a random runner (excluding "link" the dog)
  const runnerKeys = Object.keys(runnerSignals).filter((k) => k !== "link") as RunnerName[]
  const chosenKey = randomItem(runnerKeys)
  const [runnerSig] = runnerSignals[chosenKey]
  const runner = runnerSig()
  const frames = [...runner.frames.run].reverse()

  // Sprite animation
  const [frameIndex, setFrameIndex] = createSignal(0)

  let startTime = Date.now()
  let animFrame: number | undefined
  let spriteInterval: ReturnType<typeof setInterval> | undefined

  onMount(() => {
    startTime = Date.now()

    // Animate sprite frames
    spriteInterval = setInterval(() => {
      setFrameIndex((i) => (i + 1) % frames.length)
    }, runner.frameInterval)

    // Progress simulation
    const tick = () => {
      const elapsed = Date.now() - startTime
      const minProgress = Math.min(elapsed / MIN_DISPLAY_MS, 1)

      if (props.loading) {
        // Simulate progress: fast to 70%, then slow crawl
        const fakeProgress = Math.min(0.7 * minProgress + 0.2 * Math.random() * 0.1, 0.9)
        setProgress(fakeProgress)
        animFrame = requestAnimationFrame(tick)
      } else {
        // Data loaded — fill to 100% but respect minimum display time
        if (elapsed < MIN_DISPLAY_MS) {
          setProgress(Math.max(progress(), minProgress))
          animFrame = requestAnimationFrame(tick)
        } else {
          setProgress(1)
          // Start fade-out
          setTimeout(() => {
            setFading(true)
            setTimeout(() => setVisible(false), 400) // match CSS transition
          }, 150)
        }
      }
    }

    animFrame = requestAnimationFrame(tick)
  })

  onCleanup(() => {
    if (animFrame) cancelAnimationFrame(animFrame)
    if (spriteInterval) clearInterval(spriteInterval)
  })

  // The display scale applied to the sprite in the splash screen
  const SPLASH_SCALE = 3

  // Extract the image URL from any frame (they all share the same spritesheet)
  const spriteUrl = (() => {
    const f = frames[0]
    const hashIdx = f.indexOf("#")
    return hashIdx === -1 ? f : f.slice(0, hashIdx)
  })()

  // The raw pixel width of one frame in the spritesheet
  const rawFrameW = runner.width  // e.g. 22 (not multiplied by RUNNER_SIZE)
  const rawFrameH = runner.height // e.g. 28

  // Total number of frames (from the frames array — may be reversed but count is the same)
  const numFrames = frames.length

  // Parse frame index from each frame string's offset
  // Format: "url#offsetX,0,sheetWidth,sheetHeight"
  // offsetX is in display-scaled units (rawFrameW * RUNNER_SIZE * n)
  function getFrameIdx(frame: string): number {
    const hashIdx = frame.indexOf("#")
    if (hashIdx === -1) return 0
    const ox = Number(frame.slice(hashIdx + 1).split(",")[0])
    const displayFrameW = rawFrameW * RUNNER_SIZE
    return displayFrameW > 0 ? Math.round(ox / displayFrameW) : 0
  }

  // Pre-compute the ordered frame indices (handles reversed frames)
  const frameOrder = frames.map(getFrameIdx)

  // Rendered size of one frame on screen
  const displayW = rawFrameW * SPLASH_SCALE
  const displayH = rawFrameH * SPLASH_SCALE

  // Spritesheet scaled to SPLASH_SCALE
  const bgW = rawFrameW * numFrames * SPLASH_SCALE
  const bgH = rawFrameH * SPLASH_SCALE

  function getSpriteStyle(idx: number): Record<string, string> {
    const fi = frameOrder[idx] ?? 0
    const bgX = fi * displayW

    return {
      "background-image": `url(${spriteUrl})`,
      "background-size": `${bgW}px ${bgH}px`,
      "background-position": `-${bgX}px 0px`,
      "background-repeat": "no-repeat",
      width: `${displayW}px`,
      height: `${displayH}px`,
    }
  }

  return (
    <Show when={visible()}>
      <div class={styles.overlay} classList={{ [styles.fadeOut]: fading() }}>
        <div class={styles.content}>
          {/* Runner sprite */}
          <div class={styles.runnerTrack}>
            <div
              class={styles.runnerSprite}
              style={{
                ...getSpriteStyle(frameIndex()),
                left: `${progress() * 100}%`,
                transform: "translateX(-50%) scaleX(-1)",
              }}
            />
          </div>

          {/* Progress bar */}
          <div class={styles.barContainer}>
            <div class={styles.barTrack}>
              <div
                class={styles.barFill}
                style={{ width: `${progress() * 100}%` }}
              />
            </div>
          </div>

          {/* Loading text */}
          <div class={styles.text}>Loading...</div>
        </div>
      </div>
    </Show>
  )
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = {
  overlay: css({
    position: "fixed",
    inset: 0,
    zIndex: 10000,
    backgroundColor: "var(--grass-green)",
    backgroundImage: "url('/bg.png')",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "opacity 0.4s ease",
    opacity: 1,
  }),
  fadeOut: css({
    opacity: "0 !important",
    pointerEvents: "none",
  }),
  content: css({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "1rem",
    width: "calc(100% - 4rem)",
    maxWidth: "400px",
  }),
  runnerTrack: css({
    position: "relative",
    width: "100%",
    height: "100px",
  }),
  runnerSprite: css({
    position: "absolute",
    bottom: "0",
    imageRendering: "pixelated",
    transition: "left 0.1s linear",
  }),
  barContainer: css({
    width: "100%",
  }),
  barTrack: css({
    height: "32px",
    background: "rgba(0,0,0,0.2)",
    borderRadius: "4px",
    cornerShape: "notch",
    overflow: "hidden",
    border: "4px solid black",
  }),
  barFill: css({
    height: "100%",
    background: "#6abf4b",
    borderRadius: "2px",
    transition: "width 0.15s linear",
  }),
  text: css({
    fontSize: "32px",
    opacity: 0.7,
    fontFamily: '"Jersey 10", sans-serif',
    textTransform: "uppercase",
  }),
}
