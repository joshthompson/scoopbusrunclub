import { defineConfig } from '@pandacss/dev'
import web from '../web/panda.config'

/**
 * The website's Panda config, for the website files the game uses that are
 * styled with it: the engine. The game's own styles are plain CSS
 * (`src/styles.css`).
 */
export default defineConfig({
	...web,
	include: ['../web/src/engine/**/*.{ts,tsx}'],
	outdir: 'styled-system',
})
