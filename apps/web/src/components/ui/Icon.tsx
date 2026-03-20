import extLinkAsset from "@/assets/misc/ext-link.png"
import qrCodeAsset from "@/assets/misc/qr.png";
import { cva } from "@style/css";

export type IconName = "external" | "qr-code"

const assets: Record<IconName, string> = {
  "external": extLinkAsset,
  "qr-code": qrCodeAsset,
}

export function Icon(props: {
  name: IconName;
  size?: 'small' | 'medium' | 'large';
  class?: string;
  alt?: string;
}) {
  return <img
    src={assets[props.name]}
    alt={props.alt}
    class={styles.icon({ size: props.size })}
  />
}

const styles = {
  icon: cva({
    base: {
      width: 'var(--icon-size)',
      height: 'var(--icon-size)',
      display: 'inline-block',
      verticalAlign: 'middle',
    },
    variants: {
      size: {
        small: { '--icon-size': '12px' },
        medium: { '--icon-size': '16px' },
        large: { '--icon-size': '24px' },
      },
    },
    defaultVariants: {
      size: 'medium',
    },
  }),
}
