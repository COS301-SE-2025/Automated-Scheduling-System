/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        'custom-background': '#ededed',
        'custom-primary': '#243966',    // Primary
        'custom-secondary': '#00bac8', // Secondary
        'custom-third': '#0078a6',     // Third
        'custom-fourth': '#e3feff',    // Fourth
        'custom-accent': '#e0f2fe',
        'custom-accent-hover': '#f0f0f0',
        'custom-text': '#1f2937',
        
        // Dark mode colors
        'dark': {
          'background': '#1c1f21',
          'div': '#141617',
          'input': '#3b3b3b',
          'primary': '#9dbee0',       
          'secondary': '#56d5e3',     
          'third': '#3df9ff',         
          'signin': '#18284a',        
          'account-text': '#57d5ff',  
          'signup': '#3df9ff',
          'accent': '#0c4a6e',
          'accent-hover': '#2a2d2f',
          'text': '#e5e7eb',
          'green': '#34D399', 
          'purple': '#A78BFA',
          'brown': '#A16207', 
          'red': '#F87171',        
        }
      },
      fontFamily: {
        'sans': ['"Source Sans Pro"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}