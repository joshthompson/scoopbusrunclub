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
	build: {
		target: 'esnext',
	},
	resolve: {
		alias: {
			'@': path.resolve(__dirname, 'src'),
			'@style': path.resolve(__dirname, 'styled-system'),
			'@assets': path.resolve(__dirname, 'src/assets'),
			'@shared': path.resolve(__dirname, '../../libs/shared'),
		},
	},
})
