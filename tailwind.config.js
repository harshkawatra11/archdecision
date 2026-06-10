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
        // GitHub dark palette: 950 = header black, 900 = canvas, 850 = subtle, 600 = border.
        ink: {
          950: '#010409',
          900: '#0d1117',
          850: '#161b22',
          800: '#1c2128',
          700: '#262c36',
          600: '#30363d',
          500: '#444c56',
        },
        accent: {
          DEFAULT: '#4493f8',
          soft: '#79b8ff',
          glow: 'rgba(68,147,248,0.15)',
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
