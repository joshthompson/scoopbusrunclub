/**
 * SkyService — dynamically updates CSS custom properties on <html> to reflect
 * a realistic sky based on the current time of day.
 *
 * Managed variables (set on document.documentElement):
 *   --sky-blue-top        gradient top colour
 *   --sky-blue-bottom     gradient bottom colour
 *   --sun-y               sun vertical position  0 = top of header, 1 = below horizon
 *   --moon-y              moon vertical position  0 = top, 1 = below horizon
 *   --moon-opacity         0 → 1
 *   --stars-opacity        0 → 1
 *   --cloud-opacity        0.1 (night) → 1 (day/sunrise/sunset)
 *   --light                0 (night) → 1 (midday) estimated light level
 *
 * Assumptions (hardcoded for now):
 *   SUNRISE  06:00 CET
 *   SUNSET   18:00 CET
 */

// ─── Configuration ───────────────────────────────────────────────

/** Sunrise hour in CET (Central European Time, UTC+1) */
const SUNRISE_CET = 6
/** Sunset hour in CET */
const SUNSET_CET = 18

// ─── Colour keyframes ───────────────────────────────────────────
// Each stop is [hourInCET, topHex, bottomHex]
// Interpolation is linear RGB between adjacent stops.

interface ColourStop {
  hour: number   // CET hour (0‑24, can exceed 24 for wrapping)
  top: [number, number, number]
  bottom: [number, number, number]
}

const COLOUR_STOPS: ColourStop[] = [
  // Deep night
  { hour: 0,    top: [10, 10, 35],      bottom: [5, 5, 20] },
  // Late night → pre-dawn
  { hour: 4.5,  top: [10, 10, 35],      bottom: [5, 5, 20] },
  // Dawn begins — deep indigo lifting
  { hour: 5,    top: [20, 15, 55],      bottom: [40, 20, 50] },
  // Early sunrise — fiery orange/yellow horizon
  { hour: 5.75, top: [60, 40, 80],      bottom: [255, 140, 20] },
  // Sunrise peak — blazing orange-gold
  { hour: 6,    top: [100, 130, 190],   bottom: [255, 170, 0] },
  // Golden hour — vivid warm yellow
  { hour: 6.5,  top: [150, 195, 235],   bottom: [255, 210, 60] },
  // Morning — warming into blue
  { hour: 7,    top: [170, 220, 245],   bottom: [140, 210, 245] },
  // Late morning
  { hour: 8,    top: [195, 240, 255],   bottom: [90, 220, 255] },
  // Midday — brightest
  { hour: 12,   top: [205, 250, 255],   bottom: [90, 226, 255] },
  // Early afternoon
  { hour: 15,   top: [200, 245, 255],   bottom: [85, 220, 255] },
  // Late afternoon — slightly warmer
  { hour: 16.5, top: [190, 230, 250],   bottom: [100, 200, 240] },
  // Pre-sunset — golden warmth flooding in
  { hour: 17,   top: [170, 190, 230],   bottom: [255, 200, 60] },
  // Sunset peak — blazing orange-gold
  { hour: 17.75,top: [130, 110, 180],   bottom: [255, 160, 0] },
  // Sunset — deep fiery orange/red
  { hour: 18,   top: [90, 60, 140],     bottom: [255, 100, 10] },
  // Post-sunset — ember glow fading to purple
  { hour: 18.5, top: [55, 40, 100],     bottom: [220, 80, 30] },
  // Twilight
  { hour: 19,   top: [30, 25, 70],      bottom: [60, 30, 60] },
  // Night
  { hour: 20,   top: [10, 10, 35],      bottom: [5, 5, 20] },
  // Wrap to midnight
  { hour: 24,   top: [10, 10, 35],      bottom: [5, 5, 20] },
]

// ─── Helpers ─────────────────────────────────────────────────────

/** Convert current local time to a fractional CET hour (0‑24). */
function nowAsCETHour(): number {
  const now = new Date()
  // CET = UTC+1. getTimezoneOffset() returns minutes *behind* UTC,
  // so localMinutesFromMidnight + offset = UTC minutes, then +60 = CET.
  const utcMinutes =
    now.getUTCHours() * 60 + now.getUTCMinutes() + now.getUTCSeconds() / 60
  let cetMinutes = utcMinutes + 60 // UTC+1
  if (cetMinutes < 0) cetMinutes += 1440
  if (cetMinutes >= 1440) cetMinutes -= 1440
  return cetMinutes / 60
}

/** Linearly interpolate between a and b by t ∈ [0,1]. */
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/** Clamp a value between min and max. */
function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

/** Convert an [r,g,b] triple to a hex colour string. */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) =>
    Math.round(clamp(n, 0, 255))
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/** Interpolate sky colours for a given CET hour. */
function skyColoursAtHour(h: number): { top: string; bottom: string } {
  // Wrap h into [0, 24)
  h = ((h % 24) + 24) % 24

  // Find the surrounding stops
  for (let i = 0; i < COLOUR_STOPS.length - 1; i++) {
    const a = COLOUR_STOPS[i]
    const b = COLOUR_STOPS[i + 1]
    if (h >= a.hour && h <= b.hour) {
      const t = b.hour === a.hour ? 0 : (h - a.hour) / (b.hour - a.hour)
      return {
        top: rgbToHex(lerp(a.top[0], b.top[0], t), lerp(a.top[1], b.top[1], t), lerp(a.top[2], b.top[2], t)),
        bottom: rgbToHex(
          lerp(a.bottom[0], b.bottom[0], t),
          lerp(a.bottom[1], b.bottom[1], t),
          lerp(a.bottom[2], b.bottom[2], t),
        ),
      }
    }
  }

  // Fallback (should not reach)
  return { top: '#0a0a23', bottom: '#050514' }
}

/**
 * Compute sun vertical position for a given CET hour.
 *
 * 0 = top of the header area (zenith), 1 = below the horizon.
 * The sun follows a sine-like arc from sunrise to sunset.
 */
function sunPositionAtHour(h: number): number {
  h = ((h % 24) + 24) % 24

  const PRE_RISE = SUNRISE_CET - 0.5   // sun starts rising from below horizon
  const POST_SET = SUNSET_CET + 0.5    // sun finishes setting

  if (h < PRE_RISE || h > POST_SET) {
    // Below horizon
    return 1
  }

  if (h >= PRE_RISE && h < SUNRISE_CET) {
    // Rising from below horizon → horizon level
    const t = (h - PRE_RISE) / (SUNRISE_CET - PRE_RISE)
    return lerp(1, 0.85, t)
  }

  if (h >= SUNRISE_CET && h <= SUNSET_CET) {
    // Arc across the sky: horizon → zenith → horizon
    // Use a sine curve for a natural arc
    const t = (h - SUNRISE_CET) / (SUNSET_CET - SUNRISE_CET) // 0→1
    // sin(0)=0, sin(π)=0, sin(π/2)=1 — peak at solar noon
    const arc = Math.sin(t * Math.PI)
    // Map: 0 (horizon) → 0.85, 1 (zenith) → 0.1
    return lerp(0.85, 0.1, arc)
  }

  if (h > SUNSET_CET && h <= POST_SET) {
    // Setting from horizon → below
    const t = (h - SUNSET_CET) / (POST_SET - SUNSET_CET)
    return lerp(0.85, 1, t)
  }

  return 1
}

/**
 * Compute moon vertical position for a given CET hour.
 * Rises after sunset, arcs through the night, sets before sunrise.
 */
function moonPositionAtHour(h: number): number {
  h = ((h % 24) + 24) % 24

  const MOON_RISE = SUNSET_CET + 0.5   // 18:30
  const MOON_SET = SUNRISE_CET - 0.5   // 05:30
  // The moon is up from 18:30 → 05:30 (through midnight)
  // Total arc duration = 11 hours

  let nightProgress: number
  if (h >= MOON_RISE) {
    // Evening side: 18:30 → 24:00
    nightProgress = (h - MOON_RISE) / (24 - MOON_RISE + MOON_SET)
  } else if (h <= MOON_SET) {
    // Morning side: 00:00 → 05:30
    nightProgress = (24 - MOON_RISE + h) / (24 - MOON_RISE + MOON_SET)
  } else {
    // Moon is below the horizon during the day
    return 1
  }

  // Sine arc like the sun
  const arc = Math.sin(nightProgress * Math.PI)
  return lerp(0.85, 0.15, arc)
}

/**
 * Compute moon opacity. Fades in after sunset, fades out before sunrise.
 */
function moonOpacityAtHour(h: number): number {
  h = ((h % 24) + 24) % 24

  const FADE_IN_START = SUNSET_CET         // 18:00
  const FADE_IN_END = SUNSET_CET + 1       // 19:00
  const FADE_OUT_START = SUNRISE_CET - 1   // 05:00
  const FADE_OUT_END = SUNRISE_CET         // 06:00

  // Full visibility at night
  if (h >= FADE_IN_END || h <= FADE_OUT_START) {
    // Check it's actually night-time
    if (h >= FADE_IN_END || h <= FADE_OUT_START) return 1
  }

  if (h >= FADE_IN_START && h < FADE_IN_END) {
    return (h - FADE_IN_START) / (FADE_IN_END - FADE_IN_START)
  }

  if (h > FADE_OUT_START && h <= FADE_OUT_END) {
    return 1 - (h - FADE_OUT_START) / (FADE_OUT_END - FADE_OUT_START)
  }

  return 0
}

/**
 * Compute stars opacity. Similar to moon but fades in/out slightly faster.
 */
function starsOpacityAtHour(h: number): number {
  h = ((h % 24) + 24) % 24

  const FADE_IN_START = SUNSET_CET + 1
  const FADE_IN_END = SUNSET_CET + 2
  const FADE_OUT_START = SUNRISE_CET - 2
  const FADE_OUT_END = SUNRISE_CET - 1

  if (h >= FADE_IN_END || h <= FADE_OUT_START) {
    if (h >= FADE_IN_END || h <= FADE_OUT_START) return 1
  }

  if (h >= FADE_IN_START && h < FADE_IN_END) {
    return (h - FADE_IN_START) / (FADE_IN_END - FADE_IN_START)
  }

  if (h > FADE_OUT_START && h <= FADE_OUT_END) {
    return 1 - (h - FADE_OUT_START) / (FADE_OUT_END - FADE_OUT_START)
  }

  return 0
}

/**
 * Compute cloud opacity for a given CET hour.
 * Night: 0.1, fades up to 1.0 during sunrise/sunset and stays 1.0 during the day.
 */
function cloudOpacityAtHour(h: number): number {
  h = ((h % 24) + 24) % 24

  const NIGHT_OPACITY = 0.1

  // Morning fade-in: 05:00 → 06:00
  const MORNING_START = SUNRISE_CET - 1  // 05:00
  const MORNING_END = SUNRISE_CET        // 06:00

  // Evening fade-out: 17:00 → 18:00
  const EVENING_START = SUNSET_CET - 1   // 17:00
  const EVENING_END = SUNSET_CET         // 18:00

  // Full daytime
  if (h >= MORNING_END && h <= EVENING_START) return 1

  // Morning fade-in
  if (h >= MORNING_START && h < MORNING_END) {
    const t = (h - MORNING_START) / (MORNING_END - MORNING_START)
    return lerp(NIGHT_OPACITY, 1, t)
  }

  // Evening fade-out
  if (h > EVENING_START && h <= EVENING_END) {
    const t = (h - EVENING_START) / (EVENING_END - EVENING_START)
    return lerp(1, NIGHT_OPACITY, t)
  }

  // Night
  return NIGHT_OPACITY
}

/**
 * Estimate ambient light level for a given CET hour.
 *
 * 0 = full darkness, 1 = peak midday brightness.
 *
 * sunset-end → sunrise-start : 0
 * sunrise-start → sunrise-end : 0 → 0.8
 * sunrise-end → midday        : 0.8 → 1
 * midday → sunset-start       : 1 → 0.8
 * sunset-start → sunset-end   : 0.8 → 0
 */
function lightLevelAtHour(h: number): number {
  h = ((h % 24) + 24) % 24

  const SUNRISE_START = SUNRISE_CET - 0.5
  const SUNRISE_END = SUNRISE_CET + 1
  const MIDDAY = (SUNRISE_CET + SUNSET_CET) / 2
  const SUNSET_START = SUNSET_CET - 0.5
  const SUNSET_END = SUNSET_CET + 1

  // Night
  if (h >= SUNSET_END || h <= SUNRISE_START) return 0

  // Sunrise: 0 → 0.8
  if (h > SUNRISE_START && h <= SUNRISE_END) {
    const t = (h - SUNRISE_START) / (SUNRISE_END - SUNRISE_START)
    return lerp(0, 0.8, t)
  }

  // Morning: 0.8 → 1
  if (h > SUNRISE_END && h <= MIDDAY) {
    const t = (h - SUNRISE_END) / (MIDDAY - SUNRISE_END)
    return lerp(0.8, 1, t)
  }

  // Afternoon: 1 → 0.8
  if (h > MIDDAY && h <= SUNSET_START) {
    const t = (h - MIDDAY) / (SUNSET_START - MIDDAY)
    return lerp(1, 0.8, t)
  }

  // Sunset: 0.8 → 0
  if (h > SUNSET_START && h < SUNSET_END) {
    const t = (h - SUNSET_START) / (SUNSET_END - SUNSET_START)
    return lerp(0.8, 0, t)
  }

  return 0
}

// ─── Apply ───────────────────────────────────────────────────────

function applySkyCSSVariablesForHour(h: number): void {
  const el = document.documentElement

  const { top, bottom } = skyColoursAtHour(h)
  el.style.setProperty('--sky-blue-top', top)
  el.style.setProperty('--sky-blue-bottom', bottom)

  el.style.setProperty('--sun-y', sunPositionAtHour(h).toFixed(4))
  el.style.setProperty('--moon-y', moonPositionAtHour(h).toFixed(4))
  el.style.setProperty('--moon-opacity', moonOpacityAtHour(h).toFixed(4))
  el.style.setProperty('--stars-opacity', starsOpacityAtHour(h).toFixed(4))
  el.style.setProperty('--cloud-opacity', cloudOpacityAtHour(h).toFixed(4))
  el.style.setProperty('--light', lightLevelAtHour(h).toFixed(4))
}

function applySkyCSSVariables(): void {
  applySkyCSSVariablesForHour(nowAsCETHour())
}

// ─── Public API ──────────────────────────────────────────────────

let pauseSkyService = false

function testSkyTime(time: string): void {
  pauseSkyService = true
  const [hh, mm] = time.split(':').map(Number)
  const h = hh + (mm || 0) / 60
  console.log(`Applying sky for CET ${time} (${h.toFixed(2)}h)`)
  applySkyCSSVariablesForHour(h)
}

async function testDay(): Promise<void> {
  pauseSkyService = true
  for (let i = 0; i < 24 * 60; i++) {
    const h = i / 60
    testSkyTime(`${Math.floor(h).toString().padStart(2, '0')}:${Math.round((h % 1) * 60).toString().padStart(2, '0')}`)
    // 100ms per step → 2.4 minutes in 24 hours
    await new Promise(resolve => setTimeout(resolve, 5))
  }
  pauseSkyService = false
}

// Expose on window for console access
;(window as any).testSkyTime = testSkyTime
;(window as any).testDay = testDay
;(window as any).pauseSkyService = () => { pauseSkyService = true }
;(window as any).resumeSkyService = () => { pauseSkyService = false }

/**
 * Start the sky service. Immediately applies current sky state and
 * then updates every 30 seconds (twice per minute).
 *
 * @returns A cleanup function that stops the interval — call it in `onCleanup`.
 */
export function startSkyService(): () => void {
  // Apply immediately
  applySkyCSSVariables()

  // Update twice per minute
  const intervalId = setInterval(() => {
    if (!pauseSkyService) {
      applySkyCSSVariables()
    }
  }, 30_000)

  return () => {
    clearInterval(intervalId)
  }
}
