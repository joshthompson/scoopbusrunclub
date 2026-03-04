import { ControllerBaseType } from './game'

export function blockBySolids(data: ControllerBaseType, prevX: number, prevY: number) {
  const x = data.x()
  const y = data.y()
  if (x === prevX && y === prevY) return

  const rects = data.scene?.getSolidControllerRects() ?? []

  let dx = x - prevX
  let dy = y - prevY

  // STEP 1 — attempt full move
  const { hit, t } = sweepSolids(prevX, prevY, dx, dy, rects)

  if (!hit) {
    // no collision → accept full move
    return
  }

  // Move up to the point of impact
  const safeT = Math.max(0, t - 0.0001)

  const midX = prevX + dx * safeT
  const midY = prevY + dy * safeT

  data.setX?.(midX)
  data.setY?.(midY)

  // STEP 2 — sliding:
  //
  // Determine which axis was blocked.
  // If collision normal mostly horizontal → block x, keep y.
  // If collision normal mostly vertical → block y, keep x.

  let remainX = dx * (1 - safeT)
  let remainY = dy * (1 - safeT)

  // Collision normal tells us which axis is blocked
  const nx = hit.normalX
  const ny = hit.normalY

  if (Math.abs(nx) > Math.abs(ny)) {
    // horizontal collision → cannot continue on X
    remainX = 0
  } else {
    // vertical collision → cannot continue on Y
    remainY = 0
  }

  // STEP 3 — attempt sliding move
  if (remainX !== 0 || remainY !== 0) {
    const { hit: hit2, t: t2 } = sweepSolids(midX, midY, remainX, remainY, rects)

    if (!hit2) {
      data.setX?.(midX + remainX)
      data.setY?.(midY + remainY)
    } else {
      const safeT2 = Math.max(0, t2 - 0.0001)
      data.setX?.(midX + remainX * safeT2)
      data.setY?.(midY + remainY * safeT2)
    }
  }
}

export function blockBySolidsRectPlayer(data: ControllerBaseType, prevX: number, prevY: number) {

  const player = {
    x: data.x(),
    y: data.y(),
    width: data.width?.() ?? 0,
    height: data.height?.() ?? data.width?.() ?? 0,
  }

  if (player.x === prevX && player.y === prevY) return

  const rects = data.scene?.getSolidControllerRects() ?? []
  const dx = player.x - prevX
  const dy = player.y - prevY

  if (dx === 0 && dy === 0) return

  // Expand obstacles
  const expandedRects = rects.map(r => ({
    x: r.x - player.width,
    y: r.y - player.height,
    width: r.width + player.width,
    height: r.height + player.height,
  }))

  let tMin = 1
  let hitNormalX = 0
  let hitNormalY = 0

  for (const rect of expandedRects) {
    const res = sweepPointAgainstRect(prevX, prevY, dx, dy, rect)
    if (res && res.t < tMin) {
      tMin = res.t
      hitNormalX = res.normalX
      hitNormalY = res.normalY
    }
  }

  const safeT = Math.max(0, tMin - 0.0001)

  // Move up to collision
  player.x = prevX + dx * safeT
  player.y = prevY + dy * safeT

  // Sliding
  let remainX = dx * (1 - safeT)
  let remainY = dy * (1 - safeT)

  if (Math.abs(hitNormalX) > Math.abs(hitNormalY)) {
    remainX = 0
  } else {
    remainY = 0
  }

  if (remainX !== 0 || remainY !== 0) {
    let tSlideMin = 1
    for (const rect of expandedRects) {
      const res = sweepPointAgainstRect(player.x, player.y, remainX, remainY, rect)
      if (res && res.t < tSlideMin) {
        tSlideMin = res.t
      }
    }
    const safeSlideT = Math.max(0, tSlideMin - 0.0001)
    data.setX?.(player.x + remainX * safeSlideT)
    data.setY?.(player.y + remainY * safeSlideT)
  }
}

function sweepSolids(px: number, py: number, dx: number, dy: number, rects: Rect[]) {
  let tMin = 1
  let hitRect = null
  let hitNormalX = 0
  let hitNormalY = 0

  for (const rect of rects) {
    const res = sweepPointAgainstRect(px, py, dx, dy, rect)
    if (res && res.t < tMin) {
      tMin = res.t
      hitRect  = rect
      hitNormalX = res.normalX
      hitNormalY = res.normalY
    }
  }

  return {
    hit: hitRect ? { rect: hitRect, normalX: hitNormalX, normalY: hitNormalY } : null,
    t: tMin
  }
}

function sweepPointAgainstRect(px: number, py: number, dx: number, dy: number, rect: Rect) {
  let tEntry = -Infinity
  let tExit  =  Infinity
  let nx = 0
  let ny = 0

  // X
  if (dx !== 0) {
    const tx1 = (rect.x - px) / dx
    const tx2 = (rect.x + rect.width - px) / dx
    const txEntry = Math.min(tx1, tx2)
    const txExit  = Math.max(tx1, tx2)

    if (txEntry > tEntry) {
      tEntry = txEntry
      nx = tx1 < tx2 ? -1 : 1 // normal direction
      ny = 0
    }

    tExit = Math.min(tExit, txExit)
  } else if (px < rect.x || px > rect.x + rect.width) {
    return null
  }

  // Y
  if (dy !== 0) {
    const ty1 = (rect.y - py) / dy
    const ty2 = (rect.y + rect.height - py) / dy
    const tyEntry = Math.min(ty1, ty2)
    const tyExit  = Math.max(ty1, ty2)

    if (tyEntry > tEntry) {
      tEntry = tyEntry
      nx = 0
      ny = ty1 < ty2 ? -1 : 1
    }

    tExit = Math.min(tExit, tyExit)
  } else if (py < rect.y || py > rect.y + rect.height) {
    return null
  }

  if (tEntry >= 0 && tEntry <= 1 && tEntry <= tExit) {
    return { t: tEntry, normalX: nx, normalY: ny }
  }

  return null
}
