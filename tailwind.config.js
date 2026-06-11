/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
      colors: {
        // Override Tailwind's cool-blue slate with GitHub's neutral grays (no navy cast).
        slate: {
          100: '#f0f6fc',
          200: '#e6edf3',
          300: '#c9d1d9',
          400: '#9da7b3',
          500: '#7d8590',
          600: '#5b626c',
          700: '#3d434c',
          800: '#272b33',
          900: '#1a1d24',
        },
        // GitHub dark palette: 950 = header black, 900 = canvas, 850 = subtle, 600 = border.
        ink: {
          950: '#000000',
          900: '#000000',
          850: '#0d1117',
          800: '#131920',
          700: '#1a2030',
          600: '#252d38',
          500: '#374151',
        },
        accent: {
          DEFAULT: '#238636',
          soft: '#2ea043',
          glow: 'rgba(46,160,67,0.12)',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(46,160,67,0.18), 0 10px 40px -10px rgba(46,160,67,0.35)',
        card: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 20px 50px -25px rgba(0,0,0,0.8)',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
};
