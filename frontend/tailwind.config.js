/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Dark theme colors for Aquila
        aquila: {
          bg: '#0f172a',
          surface: '#1e293b',
          hover: '#334155',
          border: '#475569',
          cyan: '#06b6d4',
          'cyan-light': '#67e8f9',
          'cyan-dark': '#0891b2',
          text: '#f1f5f9',
          'text-muted': '#94a3b8',
          accent: '#0ea5e9',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
          'led-green': '#10b981',
          'led-amber': '#f59e0b',
          'led-red': '#ef4444',
          'led-blue': '#3b82f6'
        }
      },
      fontFamily: {
        'ui': ['Inter', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Menlo', 'monospace']
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'led-blink': 'ledBlink 1s ease-in-out infinite'
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(6, 182, 212, 0.5)' },
          '50%': { boxShadow: '0 0 20px rgba(6, 182, 212, 0.8)' }
        },
        ledBlink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' }
        }
      },
      gridTemplateColumns: {
        'aquila-main': '1fr 1fr 1fr',
        'aquila-sidebar': '300px 1fr'
      },
      gridTemplateRows: {
        'aquila-main': '1fr 1fr',
        'aquila-layout': '60px 1fr'
      },
      spacing: {
        'sidebar': '300px',
        'toolbar': '60px'
      }
    }
  },
  plugins: []
}