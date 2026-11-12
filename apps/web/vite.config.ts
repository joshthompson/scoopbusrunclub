import path from 'node:path'
import devtools from 'solid-devtools/vite'
import { defineConfig } from 'vite'
import solidPlugin from 'vite-plugin-solid'

export default defineConfig({
	base: '/',
	plugins: [devtools(), solidPlugin()],
	server: {
		port: 3005,
	},
	// The WebP encoder loads its wasm relative to its own module URL, which
	// dev pre-bundling would break.
	optimizeDeps: {
		exclude: ['@jsquash/webp'],
	},
	build: {
		target: 'esnext',
	},
	resolve: {
		// One Solid for the site and ScoopJS (the header's engine) both, even with
		// ScoopJS linked in from its own repo: two would each have their own
		// signals, and the header would silently stop moving.
		dedupe: ['solid-js'],
		alias: {
			'@': path.resolve(__dirname, 'src'),
			'@style': path.resolve(__dirname, 'styled-system'),
			'@assets': path.resolve(__dirname, 'src/assets'),
			'@shared': path.resolve(__dirname, '../../libs/shared'),
		},
	},
})
