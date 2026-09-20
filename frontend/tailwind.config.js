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
        brand: {
          dark: '#0F172A',
          card: '#1E293B',
          border: '#334155',
          primary: '#0284C7',
          primaryHover: '#0369A1',
        },
        security: {
          green: '#10B981',
          greenLight: 'rgba(16, 185, 129, 0.15)',
          yellow: '#F59E0B',
          yellowLight: 'rgba(245, 158, 11, 0.15)',
          red: '#EF4444',
          redLight: 'rgba(239, 68, 68, 0.15)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
}
