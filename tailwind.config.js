/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0F111A',
        surface: '#1E212D',
        primary: '#60A5FA',
        border: '#2A2D3D',
        muted: '#9CA3AF',
      }
    },
  },
  plugins: [],
}
