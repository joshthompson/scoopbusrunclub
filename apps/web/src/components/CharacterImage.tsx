import { css } from "@style/css"
import { RunnerData, runners } from "./header/runners"
import shadowAsset from "@/assets/runners/shadow.png"

export function CharacterImage(props: { runner: RunnerData, pose: "sitting" | "running" }) {

  const runner = () => props.runner
  
  return <div class={styles.characterImage} role="img" aria-label={`Image of ${runner().name}`}>
    <img src={runner().sitFrames[0]} class={styles.sitting} />
    <img src={shadowAsset} class={styles.shadow} />
    {runner().name === 'Alisa' && <>
      <img src={runners.link[0]().sitFrames[0]} alt={`${runner().name} sitting`} class={styles.linkSitting} />
      <img src={shadowAsset} class={styles.linkShadow} />
    </>}
  </div>
}

const styles = {
  characterImage: css({
    display: 'inline-block',
    position: "relative",
    height: '100px',
    mb: '-20px',
  }),
  shadow: css({
    width: '100%',
    height: '20%',
    position: 'relative',
    zIndex: 1,
    mt: '-10px',
  }),
  sitting: css({
    zIndex: 2,
    position: 'relative',
    m: '-30px auto 0',
    height: '100%',
  }),
  linkSitting: css({
    zIndex: 3,
    position: 'absolute',
    bottom: '20%',
    left: '50%',
    height: '100%',
  }),
  linkShadow: css({
    zIndex: 1,
    position: 'absolute',
    bottom: '10%',
    left: '50%',
    height: '20%',
    width: '100%',
  }),
}
