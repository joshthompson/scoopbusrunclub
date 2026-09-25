/**
 * A page that owns the whole viewport: no Scoop Bus header, no mobile nav,
 * its own background and scrolling. The sandbox's throwback pages use it so
 * they can look like somewhere else entirely.
 */
import { type JSX, onCleanup, onMount } from 'solid-js'
import styles from './BarePage.module.css'

export function BarePage(props: {
	title: string
	class?: string
	children: JSX.Element
}) {
	onMount(() => {
		const previous = document.title
		document.title = props.title
		onCleanup(() => {
			document.title = previous
		})
	})

	return (
		<div class={`${styles.bare} ${props.class ?? ''}`}>{props.children}</div>
	)
}
