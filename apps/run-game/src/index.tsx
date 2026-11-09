import { render } from 'solid-js/web'
import '../styled-system/styles.css'
import './styles.css'
import { App } from './App'
import { loadGuests } from './guests'

const root = document.getElementById('root')
if (root) render(() => <App />, root)
// In the background: they only join the pack once they're here.
void loadGuests()
