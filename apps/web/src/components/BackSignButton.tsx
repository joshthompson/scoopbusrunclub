import backSignAsset from "@/assets/misc/back-sign.png"
import { useNavigate } from "@solidjs/router"
import { css, cx } from "@style/css"

export function BackSignButton(props: { to?: string, children?: string, class?: string }) {
  const navigate = useNavigate()

  return <button class={cx(styles.button, props.class)} onClick={() => navigate(props.to ?? "/")}>
    <img class={styles.image} src={backSignAsset} alt="Back to home" />
    <span class={styles.text}>{props.children ?? 'Back to homepage'}</span>

  </button>
}

const styles = {
  button: css({
    display: "inline-block",
    cursor: "pointer",
    height: '104px',
    alignSelf: 'center',
    position: 'relative',
  }),
  image: css({
    height: '104px',
  }),
  text: css({
    position: 'absolute',
    top: '0',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'max-content',
    p: '2px 10px',
    background: '#ddef64',
    fontFamily: '"Jersey 10", sans-serif',
    fontSize: '20px',
    textTransform: 'uppercase',
    lineHeight: '20px',
    color: 'black',
  }),
}