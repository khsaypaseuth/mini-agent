import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#014c8f',
          50: '#e6eef8',
          500: '#014c8f',
          600: '#013d72',
          700: '#012e56',
        },
        accent: {
          DEFAULT: '#ffa426',
          500: '#ffa426',
          600: '#cc831f',
        },
      },
    },
  },
  plugins: [],
};

export default config;
