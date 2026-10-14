/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#7FB3E8', d: '#5E9BDC', l: '#A9CEF3' },
        secondary: '#A9CEF3',
        ink: '#1D1E22',
        muted: '#565B63',
        bg: '#E4E5E8',
        'bg-d': '#141518',
        surface: { DEFAULT: '#FFFFFF', d: '#1F2125' },
        warning: '#D97706',
      },
      fontFamily: { sans: ['var(--font)', 'system-ui', '-apple-system', 'sans-serif'] },
      boxShadow: {
        card: '0 1px 1px rgba(29,30,34,.03), 0 6px 14px -6px rgba(29,30,34,.08), 0 20px 40px -18px rgba(29,30,34,.16)',
        'card-d': '0 1px 0 rgba(255,255,255,.04) inset, 0 8px 18px -6px rgba(0,0,0,.5), 0 24px 48px -20px rgba(0,0,0,.6)',
        float: '0 2px 6px rgba(29,30,34,.06), 0 12px 28px -6px rgba(29,30,34,.18), 0 32px 64px -24px rgba(29,30,34,.28)',
        'float-d': '0 2px 6px rgba(0,0,0,.4), 0 14px 32px -6px rgba(0,0,0,.6), 0 36px 72px -24px rgba(0,0,0,.7)',
      },
      borderRadius: { '4xl': '2rem' },
    },
  },
  plugins: [],
};
