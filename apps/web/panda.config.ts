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
			/**
			 * The header's snowfall. Each of the three background layers is shifted
			 * by a whole number of 256px tiles — 1 across, and 2/3/4 down — so the
			 * end state is pixel-identical to the start and the loop has no seam.
			 * Sharing one duration is what creates the parallax: the near layer
			 * covers twice the distance of the far one in the same time.
			 *
			 * Order matches `background-image`: near, mid, far. Paired with
			 * `steps(256)`, every step moves each layer a whole number of pixels,
			 * which keeps the flakes crisp under the document-wide
			 * `image-rendering: pixelated`.
			 */
			snowfall: {
				from: { backgroundPosition: '0 0, 0 0, 0 0' },
				to: {
					backgroundPosition: '256px 1024px, 256px 768px, 256px 512px',
				},
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
