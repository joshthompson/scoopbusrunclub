export function isTouchDevice() {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  )
}

export function randomItem<T>(array: T[] | readonly T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

export function generateFrames(
  image: string,
  imageWidth: number,
  imageHeight: number,
  displayWidth: number,
  frameCount: number,
  reverse = false,
): string[] {
  const frames = Array(frameCount).fill(null).map(
    (_, n) => `${image}#${displayWidth * n},0,${imageWidth},${imageHeight}`
  )
  return reverse ? frames.reverse() : frames
}
