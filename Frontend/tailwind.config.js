/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        cream: '#FFFAF3',
        berry: {
          50: '#FFF1F4', 100: '#FFE0E8', 200: '#FFC2D2', 300: '#FF94B1', 400: '#F95E8A',
          500: '#E8386B', 600: '#CC2457', 700: '#A91A47', 800: '#8B1840', 900: '#751839',
        },
        caramel: {
          50: '#FFF8EB', 100: '#FDEBC8', 200: '#FAD78D', 300: '#F6BC4F', 400: '#F2A327',
          500: '#E6860F', 600: '#C96609',
        },
        cocoa: {
          50: '#FAF5F2', 100: '#F1E6E0', 200: '#E2CDC2', 300: '#CDAC9B', 400: '#B38670',
          500: '#96654F', 600: '#7A4E3D', 700: '#5F3B2E', 800: '#44291F', 900: '#2E1B14',
        },
      },
      boxShadow: {
        soft: '0 10px 40px -12px rgba(94, 49, 30, 0.18)',
        card: '0 2px 12px -2px rgba(94, 49, 30, 0.10)',
      },
      keyframes: {
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        rise: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'none' } },
        slide: { from: { transform: 'translateX(100%)' }, to: { transform: 'none' } },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        rise: 'rise .5s ease-out both',
        slide: 'slide .25s ease-out both',
      },
    },
  },
  plugins: [],
}
