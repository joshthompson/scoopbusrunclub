import { createEffect, createSignal, onCleanup, onMount, type JSX } from "solid-js"
import { css } from "@style/css"

/**
 * Custom masonry layout component.
 *
 * Renders children into a single container with absolute positioning.
 * Items are placed in order into the leftmost shortest column.
 * Re-layouts on container width changes via ResizeObserver.
 */
export function Masonry(props: {
  minColumnWidth?: number
  gap?: number | [number, number]
  children: JSX.Element
}) {
  const minColW = () => props.minColumnWidth ?? 300
  const gapX = () => {
    const g = props.gap ?? 24
    return Array.isArray(g) ? g[0] : g
  }
  const gapY = () => {
    const g = props.gap ?? 24
    return Array.isArray(g) ? g[1] : g
  }

  let outerRef!: HTMLDivElement
  let innerRef!: HTMLDivElement

  const [height, setHeight] = createSignal(0)
  const [ready, setReady] = createSignal(false)

  function layout() {
    if (!outerRef || !innerRef) return

    const containerW = outerRef.clientWidth
    if (containerW === 0) return

    const gx = gapX()
    const gy = gapY()
    const cols = Math.max(1, Math.floor((containerW + gx) / (minColW() + gx)))
    const colWidth = (containerW - gx * (cols - 1)) / cols

    const items = Array.from(innerRef.children) as HTMLElement[]
    if (items.length === 0) return

    // Phase 1: Set all items to single-column width so we can measure natural heights.
    // Position them at top-left, hidden, so they can layout at the correct width.
    for (const el of items) {
      el.style.position = "absolute"
      el.style.top = "0"
      el.style.left = "0"
      el.style.width = `${colWidth}px`
      el.style.transform = ""
      el.style.visibility = "hidden"
    }

    // Force reflow
    void innerRef.offsetHeight

    // Phase 2: Measure heights
    const heights = items.map((el) => el.offsetHeight)

    // Phase 3: Assign to columns — leftmost shortest column
    const colHeights = new Array(cols).fill(0) as number[]

    for (let i = 0; i < items.length; i++) {
      let minCol = 0
      for (let c = 1; c < cols; c++) {
        if (colHeights[c] < colHeights[minCol]) minCol = c
      }

      const x = minCol * (colWidth + gx)
      const y = colHeights[minCol]

      items[i].style.transform = `translate(${x}px, ${y}px)`
      items[i].style.visibility = "visible"

      colHeights[minCol] += heights[i] + gy
    }

    const maxH = Math.max(...colHeights) - gy
    setHeight(Math.max(0, maxH))
    setReady(true)
  }

  // Layout after mount
  onMount(() => {
    requestAnimationFrame(layout)
  })

  // Re-layout on container width change
  let lastWidth = 0
  createEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width
        if (Math.abs(w - lastWidth) > 0.5) {
          lastWidth = w
          requestAnimationFrame(layout)
        }
      }
    })
    observer.observe(outerRef)
    onCleanup(() => observer.disconnect())
  })

  // Re-layout when children in the DOM change (items added/removed)
  createEffect(() => {
    const observer = new MutationObserver(() => {
      requestAnimationFrame(layout)
    })
    observer.observe(innerRef, { childList: true })
    onCleanup(() => observer.disconnect())
  })

  return (
    <div ref={outerRef} class={masonryStyles.container}>
      <div
        ref={innerRef}
        class={masonryStyles.inner}
        style={{
          height: ready() ? `${height()}px` : undefined,
        }}
      >
        {props.children}
      </div>
    </div>
  )
}

const masonryStyles = {
  container: css({
    position: "relative",
    width: "100%",
  }),
  inner: css({
    position: "relative",
    width: "100%",
  }),
}
