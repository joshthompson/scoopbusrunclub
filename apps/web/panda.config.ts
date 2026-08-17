import { defineConfig } from '@pandacss/dev'

export default defineConfig({
	// Whether to use css reset
	preflight: true,

	// Where to look for your css declarations
	include: ['./src/**/*.{js,jsx,ts,tsx}'],

	// Files to exclude
	exclude: [],

	// Useful for theme customisation
	theme: {
		tokens: {
			fonts: {
				main: {
					value: '"Mona Sans", sans-serif',
				},
			},
			colors: {
				primary: { value: '#0F1F29' },
			},
			spacing: {
				'spacing-4': { value: '4px' },
				'spacing-8': { value: '8px' },
				'spacing-16': { value: '16px' },
				'spacing-24': { value: '24px' },
				'spacing-32': { value: '32px' },
				'spacing-64': { value: '64px' },
			},
		},
		textStyles: {
			title: {
				description: 'Page titles',
				value: {
					fontSize: '32px',
					fontWeight: '700',
					lineHeight: '45px',
				},
			},
		},
		breakpoints: {
			sm: '400px',
			md: '600px',
			lg: '800px',
		},
		keyframes: {
			float: {
				'0%, 100%': { transform: 'translateY(-0.25em) scale(1)' },
				'50%': { transform: 'translateY(-0.5em) scale(1.3)' },
			},
			buldge: {
				'0%, 100%': { transform: 'scale(1)' },
				'50%': { transform: 'scale(1.3)' },
			},
			wave: {
				'0%, 100%': { transform: 'scale(1)', rotate: '-10deg' },
				'25%, 75%': { rotate: '10deg' },
				'50%': { transform: 'scale(1.3)', rotate: '-10deg' },
			},
			floatShadow: {
				'0%, 100%': { transform: 'scaleX(1)', opacity: 0.1 },
				'50%': { transform: 'scaleX(1.3)', opacity: 0.06 },
			},
			// --- Wrapped "explore" stories ---
			/** The progress bar segment filling across while a slide is showing. */
			storyProgress: {
				from: { transform: 'scaleX(0)' },
				to: { transform: 'scaleX(1)' },
			},
			/** Each slide's content rising into place as it becomes active. */
			storySlideIn: {
				from: { opacity: 0, transform: 'translateY(24px) scale(0.97)' },
				to: { opacity: 1, transform: 'translateY(0) scale(1)' },
			},
			/** The gradient behind the slide, fading up under the content. */
			storyBackdropIn: {
				from: { opacity: 0 },
				to: { opacity: 1 },
			},
		},
	},

	// The output directory for your css system
	outdir: 'styled-system',
})
