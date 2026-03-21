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

const moon = SunCalc.getMoonIllumination(new Date())
export const moonAsset = [
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
  moon15Asset, // Empty
][Math.floor(moon.phase * 16) % 16]
