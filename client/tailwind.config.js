/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Raycast theme — dark charcoal + orange gradient
        primary: {
          50:  '#fff4f0',
          100: '#ffe4d6',
          200: '#ffc4a8',
          300: '#ff9f7a',
          400: 'var(--tp-accent, #FF6363)',
          500: 'var(--tp-accent, #FF6363)',
          600: 'var(--tp-accent, #e84d4d)',
          700: '#c73535',
          800: '#a02020',
          900: '#7a1010',
          950: '#4a0505',
        },
        orange: {
          400: '#FF9F43',
          500: '#FF8C00',
        },
        surface: {
          50:  'var(--tp-text, #f5f5f7)',
          100: '#e8e8ed',
          200: '#d1d1d6',
          300: '#aeaeb2',
          400: 'var(--tp-muted, #8e8e93)',
          500: '#636366',
          600: '#48484a',
          700: '#3a3a3c',
          800: 'var(--tp-card, #2c2c2e)',
          850: '#242426',
          900: 'var(--tp-bg, #1c1c1e)',
          950: '#111113',
        },
        accent: {
          orange: '#FF9F43',
          green:  '#30d158',
          blue:   '#0a84ff',
          purple: '#bf5af2',
          red:    '#ff453a',
          yellow: '#ffd60a',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      backdropBlur: {
        xs:   '2px',
        '2xl':'40px',
        '3xl':'64px',
      },
      boxShadow: {
        glow:  '0 0 20px var(--tp-glow, rgba(255, 99, 99, 0.2))',
        glass: '0 8px 32px rgba(0, 0, 0, 0.4)',
        card:  '0 2px 8px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255,255,255,0.06)',
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.1)',
      },
      backgroundImage: {
        'gradient-radial':  'radial-gradient(var(--tw-gradient-stops))',
        'gradient-primary': 'var(--tp-gradient, linear-gradient(135deg, #FF6363, #FF9F43))',
        'gradient-subtle':  'linear-gradient(135deg, var(--tp-selection, rgba(255,99,99,0.15)), rgba(255,159,67,0.15))',
      },
      animation: {
        'fade-in':    'fadeIn 0.25s ease-out',
        'slide-up':   'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in':   'scaleIn 0.2s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'shimmer':    'shimmer 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp:   { '0%': { opacity: '0', transform: 'translateY(12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideDown: { '0%': { opacity: '0', transform: 'translateY(-12px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        scaleIn:   { '0%': { opacity: '0', transform: 'scale(0.95)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        pulseGlow: { '0%, 100%': { boxShadow: '0 0 8px rgba(255,99,99,0.3)' }, '50%': { boxShadow: '0 0 20px rgba(255,99,99,0.6)' } },
        shimmer:   { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
    },
  },
  plugins: [],
};
