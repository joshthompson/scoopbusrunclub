import { render } from 'solid-js/web'
import '../styled-system/styles.css'
import './styles.css'
import { App } from './App'

const root = document.getElementById('root')
if (root) render(() => <App />, root)
