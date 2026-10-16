/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ark: {
 50: '#f5f5f5',
  100: '#e7e7e7',
  200: '#d4d4d4',
  300: '#bcbcbc',
  400: '#a3a3a3',
  500: '#737373',
  600: '#525252',
  700: '#404040',
  800: '#303030',
  900: '#1c1c1c',
  950: '#0e0e0e',
        },
        sand: {
          50: '#faf8f1',
          100: '#f2eddb',
          200: '#e5d9b5',
          300: '#d4bf88',
          400: '#c5a563',
          500: '#b89049',
          600: '#a1763d',
          700: '#855b34',
          800: '#6e4b30',
          900: '#5c3f2c',
          950: '#342016',
        },
        volcanic: {
          50: 'rgb(var(--v-50) / <alpha-value>)',
          100: 'rgb(var(--v-100) / <alpha-value>)',
          200: 'rgb(var(--v-200) / <alpha-value>)',
          300: 'rgb(var(--v-300) / <alpha-value>)',
          400: 'rgb(var(--v-400) / <alpha-value>)',
          500: 'rgb(var(--v-500) / <alpha-value>)',
          600: 'rgb(var(--v-600) / <alpha-value>)',
          700: 'rgb(var(--v-700) / <alpha-value>)',
          800: 'rgb(var(--v-800) / <alpha-value>)',
          900: 'rgb(var(--v-900) / <alpha-value>)',
          950: 'rgb(var(--v-950) / <alpha-value>)',
        },
        heading: 'rgb(var(--heading) / <alpha-value>)',
      },
      fontFamily: {
        display: ['"Segoe UI"', 'Roboto', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(6, 182, 212, 0.15)',
        'glow': '0 0 20px rgba(6, 182, 212, 0.2), 0 0 60px rgba(6, 182, 212, 0.05)',
        'glow-lg': '0 0 30px rgba(6, 182, 212, 0.25), 0 0 80px rgba(6, 182, 212, 0.08)',
        'inner-glow': 'inset 0 1px 0 0 rgba(255,255,255,0.05)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'fade-in-down': 'fadeInDown 0.3s ease-out',
        'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-out-right': 'slideOutRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 3s infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'border-glow': 'borderGlow 3s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'gradient-x': 'gradientX 3s ease infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideOutRight: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(100%)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        },
        borderGlow: {
          '0%, 100%': { borderColor: 'rgba(6, 182, 212, 0.15)' },
          '50%': { borderColor: 'rgba(6, 182, 212, 0.4)' },
        },
        gradientX: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
    },
  },
  plugins: [],
};
