/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Figtree', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Bricolage Grotesque"', 'Figtree', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          50: '#F3F6FC',
          100: '#E4EAF6',
          200: '#C9D3E8',
          300: '#9DAACB',
          400: '#6F7FA6',
          500: '#4E5D84',
          600: '#3A4769',
          700: '#2B3653',
          800: '#1C2540',
          900: '#141B31',
          950: '#0D1224',
        },
        caneta: {
          400: '#6E8DF5',
          500: '#3D66EE',
          600: '#2F55D4',
          700: '#2645AD',
        },
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'sheet-up': {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'stamp': {
          '0%': { transform: 'scale(1.6)', opacity: '0' },
          '60%': { transform: 'scale(0.92)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'sheet-up': 'sheet-up 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        'stamp': 'stamp 320ms cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
