// TNV design tokens (Frontend Spec section 1).
// The palette is provisional: replace these values here, and only here,
// when the exact TNV colours are supplied.
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#1B6B3A',
          'green-dark': '#124D29',
          'green-tint': '#E8F3EC',
          yellow: '#F2B705',
          'yellow-tint': '#FFF6D6'
        },
        neutral: {
          white: '#FFFFFF',
          bg: '#F7F9F7',
          ink: '#222222',
          muted: '#555555'
        },
        status: {
          pending: '#F2B705',
          approved: '#1B6B3A',
          'no-answer': '#C62828',
          scheduled: '#E08A00'
        },
        // Phase 2 Task State Tokens (Section A Design System)
        // Contrast of text on tint background strictly exceeds WCAG 2.1 AA (>= 4.5:1)
        task: {
          'not-started': {
            DEFAULT: '#374151',
            text: '#374151',
            tint: '#F3F4F6',
            bg: '#F3F4F6',
            border: '#D1D5DB'
          },
          'in-progress': {
            DEFAULT: '#1D4ED8',
            text: '#1D4ED8',
            tint: '#DBEAFE',
            bg: '#DBEAFE',
            border: '#BFDBFE'
          },
          'submitted-review': {
            DEFAULT: '#6D28D9',
            text: '#6D28D9',
            tint: '#EDE9FE',
            bg: '#EDE9FE',
            border: '#DDD6FE'
          },
          completed: {
            DEFAULT: '#1B6B3A',
            text: '#1B6B3A',
            tint: '#E8F3EC',
            bg: '#E8F3EC',
            border: '#C6E3D0'
          },
          rework: {
            DEFAULT: '#B45309',
            text: '#B45309',
            tint: '#FEF3C7',
            bg: '#FEF3C7',
            border: '#FDE68A'
          },
          overdue: {
            DEFAULT: '#B91C1C',
            text: '#B91C1C',
            tint: '#FEE2E2',
            bg: '#FEE2E2',
            border: '#FECACA'
          }
        }
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)'
      },
      borderRadius: {
        card: '12px'
      },
      fontFamily: {
        // Headlines only; covers Tamil and Latin, so the motto and English share one voice
        display: ['"Anek Tamil"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        sans: [
          '"Plus Jakarta Sans"',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Noto Sans',
          'Noto Sans Tamil',
          'sans-serif'
        ]
      },
      fontSize: {
        base: ['16px', '1.6']
      },
      keyframes: {
        // The ticker track holds two copies of the list, so -50% loops seamlessly
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } }
      },
      animation: {
        marquee: 'marquee var(--marquee-duration, 40s) linear infinite'
      },
      minHeight: { tap: '44px' },
      minWidth: { tap: '44px' }
    }
  },
  plugins: []
};
