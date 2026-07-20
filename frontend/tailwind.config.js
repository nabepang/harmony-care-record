/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          light: '#eef2ff',
          DEFAULT: '#6366f1',
          dark: '#4f46e5',
        },
        slate: {
          850: '#1e293b',
          950: '#0f172a',
        }
      }
    },
  },
  plugins: [],
}
