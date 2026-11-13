/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0B0F14',
          secondary: '#111827',
          deep: '#07090D',
        },
        accent: {
          DEFAULT: '#F59E0B',
          hover: '#D97706',
          light: '#FBBF24',
          glow: 'rgba(245, 158, 11, 0.25)',
        },
        glass: {
          surface: 'rgba(255, 255, 255, 0.08)',
          'surface-hover': 'rgba(255, 255, 255, 0.12)',
          'surface-active': 'rgba(255, 255, 255, 0.16)',
          border: 'rgba(255, 255, 255, 0.14)',
          'border-hover': 'rgba(255, 255, 255, 0.24)',
          'border-active': 'rgba(245, 158, 11, 0.5)',
          nav: 'rgba(15, 23, 42, 0.65)',
        },
        text: {
          primary: '#F8FAFC',
          secondary: '#94A3B8',
          muted: '#64748B',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
        glass: '24px',
        heavy: '36px',
      },
      boxShadow: {
        'glass-sm': '0 4px 16px 0 rgba(0, 0, 0, 0.37), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
        'glass-md': '0 8px 32px 0 rgba(0, 0, 0, 0.45), inset 0 1px 0 0 rgba(255, 255, 255, 0.15)',
        'glass-lg': '0 16px 48px 0 rgba(0, 0, 0, 0.6), inset 0 1px 1px 0 rgba(255, 255, 255, 0.2)',
        'accent-glow': '0 0 25px rgba(245, 158, 11, 0.4)',
        'accent-pill': '0 0 15px rgba(245, 158, 11, 0.35)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 4s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        }
      }
    },
  },
  plugins: [],
}

