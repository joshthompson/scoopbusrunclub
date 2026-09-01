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

			/**
			 * The header's lightning, stepping through the frames of
			 * `lightning.png` (see `scripts/gen-lightning.ts`). Frame 0 is empty and
			 * the sheet rests on it for all but the first half-second of each half
			 * of the cycle, which is what makes the strike an event rather than a
			 * loop you can watch.
			 *
			 * One strike per half: bolt A's four frames from 0%, bolt B's from 50%,
			 * so no two strikes running are in the same place. Each runs the frames
			 * down to a fade, blinks out, then flickers back through them — a real
			 * strike is several return strokes down the same channel, and it's the
			 * blink that sells it.
			 *
			 * Paired with `animation-timing-function: step-end`, so each frame is
			 * held until the next keyframe rather than the position sliding between
			 * them, which would scroll the neighbouring bolts through shot.
			 */
			lightning: {
				// --- Bolt A: leader, strike, fade, blink, strike, fade out ---
				'0%': { backgroundPosition: '-320px 0' },
				'0.5%': { backgroundPosition: '-640px 0' },
				'1.2%': { backgroundPosition: '-960px 0' },
				'1.7%': { backgroundPosition: '0 0' },
				'2.3%': { backgroundPosition: '-640px 0' },
				'3%': { backgroundPosition: '-960px 0' },
				'3.8%': { backgroundPosition: '-1280px 0' },
				'4.6%': { backgroundPosition: '0 0' },
				// --- Bolt B, half a cycle later ---
				'50%': { backgroundPosition: '-1600px 0' },
				'50.5%': { backgroundPosition: '-1920px 0' },
				'51.2%': { backgroundPosition: '-2240px 0' },
				'51.7%': { backgroundPosition: '0 0' },
				'52.3%': { backgroundPosition: '-1920px 0' },
				'53%': { backgroundPosition: '-2240px 0' },
				'53.8%': { backgroundPosition: '-2560px 0' },
				'54.6%, 100%': { backgroundPosition: '0 0' },
			},

			/**
			 * The white the sky goes when a bolt lands, on the same cycle as
			 * `lightning` and stopped at the same percentages.
			 *
			 * Unlike the bolt this one interpolates: a strike is a hard rise and a
			 * slower decay, so the flash arrives with the frame that draws the bolt
			 * and is still draining away after it has gone.
			 */
			skyFlash: {
				'0%': { opacity: 0 },
				'0.5%': { opacity: 0.62 },
				'1.7%': { opacity: 0.08 },
				'2.3%': { opacity: 0.45 },
				'4.6%': { opacity: 0 },
				'50%': { opacity: 0 },
				'50.5%': { opacity: 0.62 },
				'51.7%': { opacity: 0.08 },
				'52.3%': { opacity: 0.45 },
				'54.6%, 100%': { opacity: 0 },
			},

			// --- Milestone balloons on a results card ---
			/**
			 * The bunch swaying about the knot it's tied to. Each strand sets its own
			 * `--angle` to hang at and `--sway` to swing through, so a bunch never
			 * moves as one piece.
			 */
			balloonSway: {
				'0%, 100%': { rotate: 'calc(var(--angle) - var(--sway))' },
				'50%': { rotate: 'calc(var(--angle) + var(--sway))' },
			},
			/**
			 * The helium bob. Lengthening the strand rather than moving the balloon
			 * keeps the string tied at both ends — it's the string that gives.
			 */
			balloonBob: {
				'0%, 100%': { height: 'var(--length)' },
				'50%': { height: 'calc(var(--length) + 7px)' },
			},

			/**
			 * The little balloons in a celebration pill. Only a nudge — they sit in a
			 * line of text, so anything more would push the line around.
			 */
			balloonNudge: {
				'0%, 100%': { translate: '0 0' },
				'50%': { translate: '0 -0.14em' },
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
