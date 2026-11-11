import { lazy } from 'solid-js'
import { render } from 'solid-js/web'
import '../styled-system/styles.css'
import './styles.css'
import { App } from './App'
import { ON_COMPUTER } from './multiplayer/onComputer'
import { loadGuests } from './runners/guests'
// `unlockAll()` and the like, in the console.
import './debug'

const root = document.getElementById('root')
/**
 * Opened from a Room's link: on a phone, it's a controller, not the game; on
 * a computer, the game, joining that Room.
 */
const join = new URLSearchParams(location.search).get('pad') ?? undefined
const PadApp = lazy(() => import('./multiplayer/Pad'))
if (root)
	render(
		() =>
			join !== undefined && !ON_COMPUTER ? <PadApp /> : <App join={join} />,
		root,
	)
// In the background: they only join the pack once they're here.
void loadGuests()
