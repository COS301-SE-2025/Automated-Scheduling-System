/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'custom-background': '#ededed',
        'custom-primary': '#243966',    // Primary
        'custom-secondary': '#00bac8', // Secondary
        'custom-third': '#0078a6',     // Third
        'custom-fourth': '#e3feff',    // Fourth
      },
      fontFamily: {
        'sans': ['"Source Sans Pro"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}