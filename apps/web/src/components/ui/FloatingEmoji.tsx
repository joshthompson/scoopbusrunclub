import {  css, cva } from "@style/css"
import { createMemo } from "solid-js"
import MedalEmoji from '@/assets/emoji/medal.png'
import PartyEmoji from '@/assets/emoji/party.png'
import StarEmoji from '@/assets/emoji/star.png'
import CorgiEmoji from '@/assets/emoji/corgi.png'

const emojiMap: Record<string, string | undefined> = {
  "🏅": MedalEmoji,
  "🎉": PartyEmoji,
  "⭐": StarEmoji,
  "🇸🇪": undefined,
  "🚌": undefined,
  "🎂": undefined,
  "😱": undefined,
  "☃️": undefined,
  "❄️": undefined,
  "🎄": undefined,
  "🏃‍♂️": undefined,
  "🏃": undefined,
  "🏃‍♀️": undefined,
  "💯": undefined,
  "🪞": undefined,
  "🌳": undefined,
  "🎪": undefined,
  "💫": undefined,
  "🐶": CorgiEmoji,
}

export function FloatingEmoji(props: { emoji: string, shadow?: boolean, flipped?: boolean }) {
  const emojiSrc = createMemo(() => {
    const mappedEmoji = emojiMap[props.emoji]
    if (mappedEmoji) return mappedEmoji

    return createPixelEmojiDataUrl(props.emoji, 24, 3)
  })

  const emoji = emojiSrc() ? <img src={emojiSrc()} class={styles.image} /> : props.emoji
  
  return <div class={styles.emoji({ hasShadow: props.shadow })}>
    <div class={styles.float({ hasShadow: props.shadow, flipped: props.flipped })}>{emoji}</div>
  </div>
}

function createPixelEmojiDataUrl(emoji: string, fontSize: number, scale: number) {
  if (typeof document === 'undefined') return undefined

  const font = `${fontSize}px Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif`
  const padding = 2

  const measureCanvas = document.createElement('canvas')
  const measureContext = measureCanvas.getContext('2d')
  if (!measureContext) return undefined

  measureContext.font = font
  const metrics = measureContext.measureText(emoji)

  const left = Math.max(0, metrics.actualBoundingBoxLeft || 0)
  const right = Math.max(1, metrics.actualBoundingBoxRight || metrics.width || fontSize)
  const ascent = Math.max(1, metrics.actualBoundingBoxAscent || fontSize)
  const descent = Math.max(0, metrics.actualBoundingBoxDescent || fontSize * 0.2)

  const glyphWidth = Math.max(1, Math.ceil(left + right))
  const glyphHeight = Math.max(1, Math.ceil(ascent + descent))
  const baseSize = Math.max(glyphWidth, glyphHeight) + padding * 2

  const baseCanvas = document.createElement('canvas')
  baseCanvas.width = baseSize
  baseCanvas.height = baseSize

  const baseContext = baseCanvas.getContext('2d')
  if (!baseContext) return undefined

  baseContext.clearRect(0, 0, baseSize, baseSize)
  baseContext.font = font
  baseContext.textBaseline = 'alphabetic'

  const drawX = (baseSize - glyphWidth) / 2 + left
  const drawY = (baseSize - glyphHeight) / 2 + ascent
  baseContext.fillText(emoji, drawX, drawY)

  const scaledCanvas = document.createElement('canvas')
  scaledCanvas.width = baseSize * scale
  scaledCanvas.height = baseSize * scale

  const scaledContext = scaledCanvas.getContext('2d')
  if (!scaledContext) return undefined

  scaledContext.clearRect(0, 0, scaledCanvas.width, scaledCanvas.height)
  scaledContext.imageSmoothingEnabled = false
  scaledContext.drawImage(baseCanvas, 0, 0, scaledCanvas.width, scaledCanvas.height)

  return scaledCanvas.toDataURL()
}

const styles = {
  emoji: cva({
    base: {
      position: "relative",
      display: "inline-block",
    },
    variants: {
      hasShadow: {
        true: {
          _after: {
            content: "''",
            position: "absolute",
            height: '6px',
            borderRadius: '50%',
            background: 'black',
            transform: 'scale(1, 0.5)',
            translate: '0 0.3em',
            animation: "floatShadow 2s ease-in-out infinite",
            left: 0,
            right: 0,
            bottom: 0,
          },
        },
      },
    },
  }),
  image: css({
    width: 'auto',
    height: '1em',
    translate: '0 0.1em',
    imageRendering: 'pixelated',
  }),
  float: cva({
    base: {
      animation: "buldge 2s ease-in-out infinite",
    },
    variants: {
      hasShadow: {
        true: { animation: "float 2s ease-in-out infinite" },
      },
      flipped: {
        true: {
          scale: '-1 1',
        }
      }
    },
  }),
}
