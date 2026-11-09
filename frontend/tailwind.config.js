/** @type {import('tailwindcss').Config} */
import forms from '@tailwindcss/forms'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#15263b',
        muted: '#66758a',
        canvas: '#f5f7fb',
        brand: {
          50: '#eef7f5',
          100: '#d9eeea',
          200: '#b8ddd5',
          400: '#51a895',
          500: '#258574',
          600: '#1e7062',
          700: '#185c51',
          900: '#143f3a',
        },
      },
      boxShadow: {
        card: '0 10px 32px rgba(21, 38, 59, 0.06)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [forms],
}
