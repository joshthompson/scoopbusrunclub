import { Scene } from '@/engine'
import { Accessor } from 'solid-js'

export function isOverlapping(
  object1: HTMLElement | DOMRect | undefined,
  object2: HTMLElement | DOMRect | undefined,
) {
  if (!object1 || !object2) return false
  const rect1 = 'right' in object1 ? object1 : object1.getBoundingClientRect()
  const rect2 = 'right' in object2 ? object2 : object2.getBoundingClientRect()
  return !(
    rect1.right < rect2.left ||
    rect1.left > rect2.right ||
    rect1.bottom < rect2.top ||
    rect1.top > rect2.bottom
  )
}

export function playSound(
  url: string,
  options?: {
    volume?: number,
    loop?: boolean,
    play?: boolean,
    manage?: boolean,
    mute?: boolean
  },
) {
  const volume = options?.volume ?? 1
  const loop = options?.loop ?? false
  const play = options?.play ?? true
  const manage = options?.manage ?? true

  const audio = new Audio(url)
  audio.volume = options?.mute ? 0 : volume
  audio.loop = loop
  audio.setAttribute('data-game-volume', `${volume}`)
  audio.style.setProperty('display', 'none')
  document.body.appendChild(audio)
  if (play) audio.play()
  if (manage) audio.addEventListener('ended', () => audio.remove())
  return audio
}

export type SolidRectInner = boolean | Rect
export type SolidRect = SolidRectInner | Accessor<SolidRectInner>

export interface Dialog {
  messages: DialogMessage[],
  onComplete?: () => void,
  pauseGameplay?: boolean,
}

export interface DialogMessage {
  text: string
  speaker?: string
  image?: string
  after?: () => void,
  options?: {
    text: string;
    value: string,
    next?: number,
    end?: boolean
    onSelect?: (scene: Scene) => void,
  }[]
}

export function playTone(
  frequency = 440,
  duration = 0.5,
  volume = 1,
  type: OscillatorType = 'sine'
) {
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  oscillator.type = type;
  oscillator.frequency.value = frequency;

  const compensatedGain = 1 / Math.sqrt(frequency)
  gain.gain.setValueAtTime(volume * compensatedGain, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

  oscillator.connect(gain);
  gain.connect(audioCtx.destination);

  oscillator.start();
  oscillator.stop(audioCtx.currentTime + duration);
}

export function isMobileBrowser() {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  )
}
