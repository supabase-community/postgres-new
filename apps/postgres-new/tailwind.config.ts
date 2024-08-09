import type { Config } from 'tailwindcss'
const { fontFamily } = require('tailwindcss/defaultTheme')

export default {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive) / <alpha-value>)',
          foreground: 'hsl(var(--destructive-foreground) / <alpha-value>)',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        xl: 'calc(var(--radius) + 4px)',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', ...fontFamily.sans],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'caret-blink': {
          '0%,70%,100%': { opacity: '1' },
          '20%,50%': { opacity: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'caret-blink': 'caret-blink 1.25s ease-out infinite',
      },
      // @ts-expect-error
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            '--tw-prose-body': 'var(--foreground)',
            '--tw-prose-headings': 'var(--primary)',
            '--tw-prose-lead': 'var(--secondary-foreground)',
            '--tw-prose-links': 'var(--primary)',
            '--tw-prose-bold': 'var(--primary)',
            '--tw-prose-counters': 'var(--muted-foreground)',
            '--tw-prose-bullets': 'var(--accent-foreground)',
            '--tw-prose-hr': 'var(--border)',
            '--tw-prose-quotes': 'var(--primary)',
            '--tw-prose-quote-borders': 'var(--border)',
            '--tw-prose-captions': 'var(--secondary-foreground)',
            '--tw-prose-code': 'var(--primary)',
            '--tw-prose-pre-code': 'var(--input)',
            '--tw-prose-pre-bg': 'var(--primary)',
            '--tw-prose-th-borders': 'var(--border)',
            '--tw-prose-td-borders': 'var(--input)',
            '--tw-prose-invert-body': 'var(--muted)',
            '--tw-prose-invert-headings': 'var(--primary-foreground)',
            '--tw-prose-invert-lead': 'var(--secondary)',
            '--tw-prose-invert-links': 'var(--primary-foreground)',
            '--tw-prose-invert-bold': 'var(--primary-foreground)',
            '--tw-prose-invert-counters': 'var(--muted)',
            '--tw-prose-invert-bullets': 'var(--accent)',
            '--tw-prose-invert-hr': 'var(--border)',
            '--tw-prose-invert-quotes': 'var(--accent)',
            '--tw-prose-invert-quote-borders': 'var(--border)',
            '--tw-prose-invert-captions': 'var(--muted)',
            '--tw-prose-invert-code': 'var(--primary-foreground)',
            '--tw-prose-invert-pre-code': 'var(--secondary)',
            '--tw-prose-invert-pre-bg': 'rgba(0, 0, 0, 0.5)',
            '--tw-prose-invert-th-borders': 'var(--border)',
            '--tw-prose-invert-td-borders': 'var(--border)',
            ol: {
              paddingLeft: '1rem',
              counterReset: 'item',
              listStyleType: 'none',
              marginBottom: '3rem',
            },
            'ol>li': {
              display: 'block',
              position: 'relative',
              paddingLeft: '1rem',
            },
            'ol>li::before': {
              position: 'absolute',
              top: '0.25rem',
              left: '-1rem',
              height: '1.2rem',
              width: '1.2rem',
              borderRadius: '0.25rem',
              backgroundColor: 'hsl(var(--muted))',
              border: '1px solid hsl(var(--border))',
              content: 'counter(item) "  "',
              counterIncrement: 'item',
              fontSize: '12px',
              color: 'hsl(var(--muted-foreground))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            },
          },
        },
      }),
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
} satisfies Config
