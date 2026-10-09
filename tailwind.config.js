/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'sans-serif'],
        serif: ['var(--font-serif)', 'Playfair Display', 'Georgia', 'serif']
      },
      colors: {
        brand: {
          DEFAULT: '#003A8F',
          dark: '#002C6B',
          accent: '#F6BE00'
        }
      },
      backgroundImage: {
        explore: 'var(--gradient-explore)'
      },
      boxShadow: {
        soft: '0 1px 2px rgb(15 23 42 / 0.05)',
        card: '0 10px 24px rgb(15 23 42 / 0.06)',
        portal: '0 12px 30px rgb(15 23 42 / 0.08)',
        'portal-lg': '0 18px 32px rgb(15 23 42 / 0.12)'
      },
      keyframes: {
        'auth-book-turn-forward': {
          '0%': {
            opacity: '1',
            transform: 'translateY(0) scale(1)'
          },
          '56%': {
            opacity: '0.88',
            transform: 'translateY(-0.12rem) scale(0.992)'
          },
          '100%': {
            opacity: '0.7',
            transform: 'translateY(-0.2rem) scale(0.984)'
          }
        },
        'auth-book-turn-back': {
          '0%': {
            opacity: '1',
            transform: 'translateY(0) scale(1)'
          },
          '56%': {
            opacity: '0.88',
            transform: 'translateY(-0.12rem) scale(0.992)'
          },
          '100%': {
            opacity: '0.7',
            transform: 'translateY(-0.2rem) scale(0.984)'
          }
        },
        'auth-book-enter-forward': {
          '0%': {
            opacity: '0.78',
            transform: 'translateY(0.18rem) scale(0.986)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0) scale(1)'
          }
        },
        'auth-book-enter-back': {
          '0%': {
            opacity: '0.78',
            transform: 'translateY(0.18rem) scale(0.986)'
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0) scale(1)'
          }
        },
        'auth-open-book-overlay-exit': {
          '0%': {
            opacity: '0'
          },
          '14%': {
            opacity: '1'
          },
          '100%': {
            opacity: '1',
          }
        },
        'auth-open-book-overlay-entry': {
          '0%': {
            opacity: '1'
          },
          '72%': {
            opacity: '0.92'
          },
          '100%': {
            opacity: '0'
          }
        },
        'auth-open-book-cover-forward': {
          '0%': {
            opacity: '1',
            transform: 'rotateY(0deg) translateZ(8px)'
          },
          '52%': {
            opacity: '0.94',
            transform: 'rotateY(-66deg) translateZ(8px)'
          },
          '100%': {
            opacity: '0.82',
            transform: 'rotateY(-118deg) translateZ(8px)'
          }
        },
        'auth-open-book-cover-back': {
          '0%': {
            opacity: '1',
            transform: 'rotateY(0deg) translateZ(8px)'
          },
          '52%': {
            opacity: '0.94',
            transform: 'rotateY(66deg) translateZ(8px)'
          },
          '100%': {
            opacity: '0.82',
            transform: 'rotateY(118deg) translateZ(8px)'
          }
        },
        'auth-open-book-entry-left': {
          '0%': {
            opacity: '0.86',
            transform: 'rotateY(72deg) translateZ(4px)'
          },
          '62%': {
            opacity: '0.98',
            transform: 'rotateY(8deg) translateZ(4px)'
          },
          '100%': {
            opacity: '1',
            transform: 'rotateY(0deg) translateZ(4px)'
          }
        },
        'auth-open-book-entry-right': {
          '0%': {
            opacity: '0.86',
            transform: 'rotateY(-72deg) translateZ(4px)'
          },
          '62%': {
            opacity: '0.98',
            transform: 'rotateY(-8deg) translateZ(4px)'
          },
          '100%': {
            opacity: '1',
            transform: 'rotateY(0deg) translateZ(4px)'
          }
        }
      },
      animation: {
        'auth-book-turn-forward': 'auth-book-turn-forward 620ms cubic-bezier(0.45, 0, 0.2, 1) both',
        'auth-book-turn-back': 'auth-book-turn-back 620ms cubic-bezier(0.45, 0, 0.2, 1) both',
        'auth-book-enter-forward': 'auth-book-enter-forward 680ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'auth-book-enter-back': 'auth-book-enter-back 680ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
        'auth-open-book-overlay-exit': 'auth-open-book-overlay-exit 620ms linear both',
        'auth-open-book-overlay-entry': 'auth-open-book-overlay-entry 760ms linear both',
        'auth-open-book-cover-forward': 'auth-open-book-cover-forward 620ms cubic-bezier(0.45, 0, 0.2, 1) both',
        'auth-open-book-cover-back': 'auth-open-book-cover-back 620ms cubic-bezier(0.45, 0, 0.2, 1) both',
        'auth-open-book-entry-left': 'auth-open-book-entry-left 760ms cubic-bezier(0.2, 0.85, 0.18, 1) both',
        'auth-open-book-entry-right': 'auth-open-book-entry-right 760ms cubic-bezier(0.2, 0.85, 0.18, 1) both'
      }
    }
  },
  plugins: []
};
