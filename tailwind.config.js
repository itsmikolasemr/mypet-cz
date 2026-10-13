/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './ui/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2E7D6F',
        secondary: '#E8A87C',
        accent: '#C45C26',
      },
    },
  },
  plugins: [],
};
