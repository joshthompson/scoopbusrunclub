/* @refresh reload */
import { render } from 'solid-js/web'
import 'solid-devtools'
import '../styled-system/styles.css'

import App from './App'
import { registerServiceWorker } from './notifications/push'

const root = document.getElementById('root')

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
	throw new Error(
		'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?',
	)
}

// biome-ignore lint/style/noNonNullAssertion: value guaranteed by surrounding logic
render(() => <App />, root!)

// Registered on every load, not just from the notifications page: a browser
// drops an unused worker after a while, and without one there's nothing for a
// push to be delivered to. Deliberately after render and unawaited — it has no
// bearing on the page drawing.
registerServiceWorker()
