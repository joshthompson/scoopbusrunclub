import { lazy } from 'solid-js'
import { render } from 'solid-js/web'
import '../styled-system/styles.css'
import './styles.css'
import { App } from './App'
import { loadGuests } from './guests'

const root = document.getElementById('root')
/** Opened from a Room's QR code: this phone's a controller, not the game. */
const pad = new URLSearchParams(location.search).has('pad')
const PadApp = lazy(() => import('./multiplayer/Pad'))
if (root) render(() => (pad ? <PadApp /> : <App />), root)
// In the background: they only join the pack once they're here.
void loadGuests()
