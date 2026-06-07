/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        display: ['Bricolage Grotesque', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#EEEDFE',
          100: '#CECBF6',
          200: '#AFA9EC',
          300: '#9F97E5',
          400: '#8B85FF',
          500: '#6C63FF',
          600: '#534AB7',
          700: '#3C3489',
          800: '#26215C',
          900: '#141030',
        },
        surface: {
          0:   'var(--surface-0)',
          1:   'var(--surface-1)',
          2:   'var(--surface-2)',
          3:   'var(--surface-3)',
          4:   'var(--surface-4)',
        },
      },
      borderRadius: {
        'xl2': '1rem',
        'xl3': '1.25rem',
      },
      animation: {
        'slide-in': 'slideIn 0.25s cubic-bezier(0.4,0,0.2,1)',
        'fade-up': 'fadeUp 0.3s cubic-bezier(0.4,0,0.2,1)',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.4,0,0.2,1)',
      },
      keyframes: {
        slideIn: {
          from: { opacity: '0', transform: 'translateX(-8px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
