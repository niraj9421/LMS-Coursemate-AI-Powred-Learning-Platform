/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        // Primary brand — Professional blue
        primary: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        // Semantic colors
        surface: '#ffffff',
        'surface-secondary': '#f8fafc',
        'surface-tertiary': '#f1f5f9',
        border: '#e2e8f0',
        'border-strong': '#cbd5e1',
        // Text
        text: '#0f172a',
        'text-secondary': '#334155',
        'text-muted': '#64748b',
        'text-subtle': '#94a3b8',
        // Feedback
        success: '#22c55e',
        'success-bg': '#f0fdf4',
        warning: '#f59e0b',
        'warning-bg': '#fffbeb',
        danger: '#ef4444',
        'danger-bg': '#fef2f2',
        info: '#3b82f6',
        'info-bg': '#eff6ff',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
        'gradient-hero':    'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 50%, #faf5ff 100%)',
        'gradient-card':    'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        'gradient-dark':    'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
      },
      boxShadow: {
        'xs':    '0 1px 2px 0 rgba(0,0,0,0.05)',
        'sm':    '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
        'md':    '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
        'lg':    '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
        'xl':    '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
        '2xl':   '0 25px 50px -12px rgba(0,0,0,0.25)',
        'card':  '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)',
        'blue':  '0 4px 14px 0 rgba(37, 99, 235, 0.35)',
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'inner': 'inset 0 2px 4px 0 rgba(0,0,0,0.05)',
      },
      borderRadius: {
        'sm': '0.375rem',
        'md': '0.5rem',
        'lg': '0.75rem',
        'xl': '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      animation: {
        'float':       'float 6s ease-in-out infinite',
        'shimmer':     'shimmer 2s linear infinite',
        'slide-in':    'slideIn 0.3s ease-out',
        'fade-in':     'fadeIn 0.4s ease-out',
        'slide-up':    'slideUp 0.4s ease-out',
        'bounce-soft': 'bounceSoft 0.6s ease-out',
        'pulse-soft':  'pulseSoft 2s ease-in-out infinite',
        'spin-slow':   'spin 3s linear infinite',
        'count-up':    'countUp 1s ease-out forwards',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':       { transform: 'translateY(-16px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        slideIn: {
          '0%':   { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)',    opacity: '1' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',     opacity: '1' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%':       { transform: 'translateY(-8px)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%':       { opacity: '0.7' },
        },
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
}
