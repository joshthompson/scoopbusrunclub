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
      floatShadow: {
        '0%, 100%': { transform: 'scaleX(1)', opacity: 0.1 },
        '50%': { transform: 'scaleX(1.3)', opacity: 0.06 },
      },
    },
  },

  // The output directory for your css system
  outdir: 'styled-system',
})
