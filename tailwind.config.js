/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        grama: {
          50: '#EEF6EE',
          100: '#D6EAD8',
          400: '#4C9A63',
          500: '#2E7D4F',
          600: '#1F5E3E',
          700: '#164A31',
          900: '#0D2E1E',
        },
        giz: '#F7F5EF',
        barro: '#C96A3C',
        carvao: '#1B1B18',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
}