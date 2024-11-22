/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#40b4c7',  // Light blue/teal for light theme
          dark: '#63248d',     // Original purple for dark theme
        },
        secondary: {
          DEFAULT: '#189571',
          dark: '#189571',
        },
        accent: {
          DEFAULT: '#9de9c7',  // Updated to requested color
          dark: '#bceee7',
        },
      },
      fontFamily: {
        sans: ['Montserrat', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
