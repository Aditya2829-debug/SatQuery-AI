/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0A2463',
          light: '#1E3A8A',
          dark: '#06173D',
        },
        secondary: {
          DEFAULT: '#3E92CC',
          light: '#62A9D8',
          dark: '#2A6F9E',
        },
      },
    },
  },
  plugins: [],
};
