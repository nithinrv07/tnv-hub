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
        }
      },
      fontFamily: {
        sans: [
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
      minHeight: { tap: '44px' },
      minWidth: { tap: '44px' }
    }
  },
  plugins: []
};
