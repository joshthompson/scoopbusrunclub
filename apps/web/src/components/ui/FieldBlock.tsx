import { css, cx } from '@style/css'
import type { JSX } from 'solid-js/jsx-runtime'

import center from '@/assets/block/center.png'
import cornerNE from '@/assets/block/corner-ne.png'
import cornerNW from '@/assets/block/corner-nw.png'
import cornerSE from '@/assets/block/corner-se.png'
import cornerSW from '@/assets/block/corner-sw.png'
import edgeE from '@/assets/block/edge-e.png'
import edgeN from '@/assets/block/edge-n.png'
import edgeS from '@/assets/block/edge-s.png'
import edgeW from '@/assets/block/edge-w.png'
import { snowyAsset } from '@/utils/snow'
import { Show } from 'solid-js'
import { type SignType, TitleSign } from './TitleSign'

export function FieldBlock(props: {
	children: JSX.Element
	title?: string
	class?: string
	signType?: SignType
}) {
	return (
		<div class={cx(styles.fieldBlock, props.class)}>
			<Show when={props.title}>
				{/* biome-ignore lint/style/noNonNullAssertion: value guaranteed by surrounding logic */}
				<TitleSign title={props.title!} type={props.signType} />
			</Show>
			<div style={{ 'background-image': `url(${snowyAsset(cornerNW)})` }} />
			<div style={{ 'background-image': `url(${snowyAsset(edgeN)})` }} />
			<div style={{ 'background-image': `url(${snowyAsset(cornerNE)})` }} />
			<div style={{ 'background-image': `url(${snowyAsset(edgeW)})` }} />
			<div
				style={{ 'background-image': `url(${snowyAsset(center)})` }}
				class={cx(props.title && styles.center)}
			>
				{props.children}
			</div>
			<div style={{ 'background-image': `url(${snowyAsset(edgeE)})` }} />
			<div style={{ 'background-image': `url(${snowyAsset(cornerSW)})` }} />
			<div style={{ 'background-image': `url(${snowyAsset(edgeS)})` }} />
			<div style={{ 'background-image': `url(${snowyAsset(cornerSE)})` }} />
		</div>
	)
}

const styles = {
	// Panda classes
	fieldBlock: css({
		position: 'relative',
		display: 'grid',
		gridTemplateColumns: '22px 1fr 22px',
		gridTemplateRows: '22px 1fr 22px',
	}),
	center: css({
		pt: '15px',
	}),
}
