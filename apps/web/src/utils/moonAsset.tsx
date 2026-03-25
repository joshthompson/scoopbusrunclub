import SunCalc from 'suncalc'

import moon0Asset from '@/assets/background/moon0.png'
import moon1Asset from '@/assets/background/moon1.png'
import moon2Asset from '@/assets/background/moon2.png'
import moon3Asset from '@/assets/background/moon3.png'
import moon4Asset from '@/assets/background/moon4.png'
import moon5Asset from '@/assets/background/moon5.png'
import moon6Asset from '@/assets/background/moon6.png'
import moon7Asset from '@/assets/background/moon7.png'
import moon8Asset from '@/assets/background/moon8.png'
import moon9Asset from '@/assets/background/moon9.png'
import moon10Asset from '@/assets/background/moon10.png'
import moon11Asset from '@/assets/background/moon11.png'
import moon12Asset from '@/assets/background/moon12.png'
import moon13Asset from '@/assets/background/moon13.png'
import moon14Asset from '@/assets/background/moon14.png'
import moon15Asset from '@/assets/background/moon15.png'
import { css } from '@style/css'

const moons = [
  moon15Asset, // Empty
  moon0Asset,
  moon1Asset,
  moon2Asset,
  moon3Asset,
  moon4Asset,
  moon5Asset,
  moon6Asset,
  moon7Asset, // Full
  moon8Asset,
  moon9Asset,
  moon10Asset,
  moon11Asset,
  moon12Asset,
  moon13Asset,
  moon14Asset,
]

const moon = SunCalc.getMoonIllumination(new Date())
export const moonAsset = moons[Math.floor(moon.phase * moons.length) % moons.length]

// --- SVG moon phase rendering ---
// Renders the lit portion of the moon as an SVG path.
// The shape is formed by two arcs:
//   1. The limb — always a semicircle on the lit edge
//   2. The terminator — an elliptical arc whose x-radius varies with phase
const SIZE = 100
const R = SIZE / 2
const C = SIZE / 2 // center x & y (square viewBox)

function moonPhasePath(phase: number): string {
  // phase: 0 = new moon, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter, 1 = new
  if (phase < 0.001 || phase > 0.999) return '' // new moon — nothing lit

  if (Math.abs(phase - 0.5) < 0.001) {
    // full moon — entire circle lit
    return `M ${C},${C - R} A ${R},${R} 0 1,1 ${C},${C + R} A ${R},${R} 0 1,1 ${C},${C - R} Z`
  }

  // How wide the terminator ellipse is (0 at quarters, R at new/full)
  const tRx = Math.abs(Math.cos(phase * 2 * Math.PI)) * R

  if (phase < 0.5) {
    // Waxing — right limb is the lit edge
    // Right semicircle: top→bottom clockwise
    // Terminator: bottom→top; clockwise for crescent (<0.25), counter-clockwise for gibbous (>0.25)
    const sw = phase < 0.25 ? 1 : 0
    return `M ${C},${C - R} A ${R},${R} 0 0,1 ${C},${C + R} A ${tRx},${R} 0 0,${sw} ${C},${C - R} Z`
  } else {
    // Waning — left limb is the lit edge
    // Left semicircle: top→bottom counter-clockwise
    const sw = phase > 0.75 ? 0 : 1
    return `M ${C},${C - R} A ${R},${R} 0 0,0 ${C},${C + R} A ${tRx},${R} 0 0,${sw} ${C},${C - R} Z`
  }
}

// const litPath = moonPhasePath(moon.phase)
// // Rotate the whole moon so the bright limb faces the sun
// const angleDeg = (moon.angle * 180) / Math.PI

// export const moonDiv = (
//   <div
//     class={css({
//       width: `${SIZE}px`,
//       height: `${SIZE}px`,
//       position: 'fixed',
//       left: '200px',
//       zIndex: 100000,
//       // Soft glow around the moon
//       filter: 'drop-shadow(0 0 12px rgba(254, 247, 202, 0.45))',
//     })}
//   >
//     <svg
//       width={SIZE}
//       height={SIZE}
//       viewBox={`0 0 ${SIZE} ${SIZE}`}
//       style={{ transform: `rotate(${angleDeg}deg)` }}
//     >
//       {/* Unlit moon body */}
//       <circle cx={C} cy={C} r={R} fill="#222" />
//       {/* Lit portion */}
//       {litPath && <path d={litPath} fill="#FEF7CA" />}
//     </svg>
//   </div>
// )
