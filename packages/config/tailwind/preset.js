/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#014c8f',
          50: '#e6eef8',
          100: '#ccddf1',
          200: '#99bbe3',
          300: '#6699d5',
          400: '#3377c7',
          500: '#014c8f',
          600: '#013d72',
          700: '#012e56',
          800: '#011e39',
          900: '#000f1d',
        },
        accent: {
          DEFAULT: '#ffa426',
          50: '#fff7e6',
          100: '#ffeece',
          200: '#ffd99c',
          300: '#ffc46a',
          400: '#ffb044',
          500: '#ffa426',
          600: '#cc831f',
          700: '#996217',
          800: '#66420f',
          900: '#332108',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
};
