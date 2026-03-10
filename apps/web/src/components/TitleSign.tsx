import { css } from '@style/css'
import sign from '@/assets/misc/sign.png'

export function TitleSign(props: {
  title: string
}) {
  return (
    <div aria-role="heading" class={styles.sign} style={{ 'background-image': `url(${sign})` }}>
      <div class={styles.signInner}>{props.title}</div>
    </div>
  )
}

const styles = {
  sign: css({
    zIndex: 4,
    position: 'absolute',
    top: '-2.8rem',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '16px',
    lineHeight: '16px',
    height: '75px',
    backgroundSize: '36px 75px',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    fontFamily: '"Pixelify Sans", sans-serif',
    fontOpticalSizing: 'auto',
    fontWeight: 400,
    fontStyle: 'normal',
  }),
  signInner: css({
    background: '#bd9359',
    display: 'inline-block',
    padding: '0.1rem 0.75rem',
    mt: '12px',
    textAlign: 'center',
    py: '4px',
    width: 'max-content',
    cornerShape: 'notch',
    borderRadius: '4px',
    textTransform: 'uppercase',
    border: '2px solid rgba(0, 0, 0, 0.2)',
  }),
}