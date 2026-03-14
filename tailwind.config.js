/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#090909',
        surface: '#121212',
        'surface-hover': '#1C1C1C',
        'primary': '#FF6A13', // Postman Orange
        'primary-hover': '#F55E00',
        border: '#212121',
        muted: '#6B6B6B',
        'method-get': '#0CBB52',
        'method-post': '#FFB400',
        'method-put': '#097BED',
        'method-delete': '#EB2013',
        'method-patch': '#6B5AE0',
      }
    },
  },
  plugins: [],
}
