/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#E8553A', d: '#C9432C', l: '#FF9A5A' },
        secondary: '#FF9A5A',
        ink: '#3B2A24',
        muted: '#8A746A',
        bg: '#FFF8F0',
        'bg-d': '#17110E',
        surface: { DEFAULT: '#FFFFFF', d: '#241B17' },
        warning: '#D97706',
      },
      fontFamily: { sans: ['var(--font)', 'system-ui', '-apple-system', 'sans-serif'] },
      boxShadow: { card: '0 1px 2px rgba(59,42,36,.04), 0 4px 16px -6px rgba(59,42,36,.08)' },
    },
  },
  plugins: [],
};
