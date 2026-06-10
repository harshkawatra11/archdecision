/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: {
          950: '#070809',
          900: '#0b0d10',
          850: '#0f1216',
          800: '#14181d',
          700: '#1b2129',
          600: '#252d38',
          500: '#3a4756',
        },
        accent: {
          DEFAULT: '#5b8cff',
          soft: '#8fb0ff',
          glow: 'rgba(91,140,255,0.18)',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(91,140,255,0.18), 0 10px 40px -10px rgba(91,140,255,0.35)',
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
