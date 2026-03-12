import {  css, cva } from "@style/css"
import MedalEmoji from '@/assets/emoji/medal.png'
import PartyEmoji from '@/assets/emoji/party.png'
import StarEmoji from '@/assets/emoji/star.png'

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
}

export function FloatingEmoji(props: { emoji: string, shadow?: boolean, flipped?: boolean }) {
  const emoji = emojiMap[props.emoji] ? <img src={emojiMap[props.emoji]} class={styles.image} />: props.emoji
  
  return <div class={styles.emoji({ hasShadow: props.shadow })}>
    <div class={styles.float({ hasShadow: props.shadow, flipped: props.flipped })}>{emoji}</div>
  </div>
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
    width: '1em',
    height: '1em',
    translate: '0 0.1em',
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
