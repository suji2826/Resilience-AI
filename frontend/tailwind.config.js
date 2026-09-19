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
        // Theme foundation tokens
        tomato: {
          50: '#fff5f3',
          100: '#ffe8e4',
          200: '#ffd5cc',
          300: '#ffb3a4',
          400: '#ff8670',
          500: '#ff6347', // Primary Tomato Red
          600: '#e0482b',
          700: '#c5381d',
          800: '#9e2d17',
          900: '#7d2514',
          950: '#440f06',
        },
        navy: {
          800: '#112A4D',
          850: '#0F2442',
          900: '#0B1F3A', // Primary Dark Blue foundation
          950: '#071A33', // Deep Dark Blue foundation
          border: '#1E3A5F',
        },
        brand: {
          // Point brand to Tomato Red for consistent action styling
          50: '#fff5f3',
          100: '#ffe8e4',
          200: '#ffd5cc',
          300: '#ffb3a4',
          400: '#ff8670',
          500: '#ff6347',
          600: '#e0482b',
          700: '#c5381d',
          800: '#9e2d17',
          900: '#7d2514',
          950: '#440f06',
        },
        command: {
          bg: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E5E7EB',
          text: '#172033',
          muted: '#5B6475',
          darkBg: '#071A33',
          darkCard: '#0B1F3A',
          darkBorder: '#1E3A5F',
          darkText: '#FFFFFF',
          darkMuted: '#CBD5E1',
        },
        risk: {
          low: '#10B981',
          medium: '#F59E0B',
          high: '#F97316',
          critical: '#EF4444',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        'card': '16px',
        'subtle': '12px',
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
        'card': '0 4px 20px -2px rgb(0 0 0 / 0.05)',
        'elevated': '0 10px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        'glow-tomato': '0 0 20px -3px rgba(255, 99, 71, 0.35)',
        'glow-red': '0 0 20px -3px rgba(239, 68, 68, 0.4)',
      },
    },
  },
  plugins: [],
}
