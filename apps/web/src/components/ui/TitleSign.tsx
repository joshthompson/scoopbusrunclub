import { cva } from '@style/css'
import { createEffect, createSignal } from 'solid-js'
import woodenSign from '@/assets/misc/wooden-sign.png'
import purpleSign from '@/assets/misc/purple-sign.png'

export type SignType = 'wooden' | 'purple'

export function TitleSign(props: {
  title: string
  type?: SignType
}) {
  const type = () => props.type ?? 'wooden'
  const signImage = () => type() === 'wooden' ? woodenSign : purpleSign

  let innerRef!: HTMLDivElement
  const [fontSize, setFontSize] = createSignal<string | undefined>(undefined)

  createEffect(() => {
    // Re-run when title or type changes
    const _title = props.title
    const _type = type()
    setFontSize(undefined)

    if (_type !== 'purple') return

    // Wait for DOM to update
    requestAnimationFrame(() => {
      if (!innerRef) return
      const containerWidth = 105
      const containerHeight = 50
      let size = 1.2 // starting em size (matches the CSS default)

      // Temporarily apply the size so we can measure
      while (size > 0.5) {
        innerRef.style.fontSize = `${size}em`
        if (innerRef.scrollWidth <= containerWidth && innerRef.scrollHeight <= containerHeight) {
          break
        }
        size -= 0.05
      }

      setFontSize(`${size}em`)
    })
  })

  return (
    <div
      aria-role="heading"
      class={styles.sign({ type: type() })}
      style={{ 'background-image': `url(${signImage()})` }}
    >
      <div
        ref={innerRef}
        class={styles.signInner({ type: type() })}
        style={{ ...(fontSize() ? { 'font-size': fontSize() } : {}) }}
      >
        {props.title}
      </div>
    </div>
  )
}

const styles = {
  sign: cva({
    base: {
      zIndex: 4,
      position: 'absolute',
      top: '-2.8rem',
      left: '50%',
      transform: 'translateX(-50%)',
      fontSize: '20px',
      lineHeight: '16px',
      height: '75px',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      fontFamily: '"Jersey 10", sans-serif',
      fontOpticalSizing: 'auto',
      fontWeight: 400,
      fontStyle: 'normal',
    },
    variants: {
      type: {
        wooden: {
          backgroundSize: '36px 75px',
        },
        purple: {
          width: '140px',
          height: '70px',
          backgroundSize: 'cover',
        },
      },
    },
  }),
  signInner: cva({
    base: {
      display: 'inline-block',
      mt: '12px',
      textAlign: 'center',
      py: '4px',
      width: 'max-content',
      textTransform: 'uppercase',
    },
    variants: {
      type: {
        wooden: {
          cornerShape: 'notch',
          borderRadius: '4px',
          border: '2px solid rgba(0, 0, 0, 0.2)',
          padding: '0.1rem 0.75rem',
          background: '#bd9359',
        },
        purple: {
          color: '#f8b832',
          textAlign: 'center',
          width: '105px',
          height: '50px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mt: '10px',
          ml: '5px',
          fontSize: '1.2em',
          lineHeight: '1.1em',
        },
      },
    },
  }),
}