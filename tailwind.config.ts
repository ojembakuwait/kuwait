import type { Config } from 'tailwindcss';

/**
 * Design tokens measured from the reference sign-in screen
 * (investors.appfolioim.com/cardonecapital/investor/login), the only
 * visually-inspectable surface. Button #0275d8, link #2f75d1, input border
 * #ced4da, muted #6c757d, body text #212529 — AppFolio's Bootstrap-derived
 * palette. Brand navy is sampled from the Cardone Capital logo.
 * Investor-screen colors beyond these are provisional (unverified).
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#13294b',
          primary: '#0275d8',
          primaryHover: '#0267bf',
          link: '#2f75d1',
        },
        ink: '#212529',
        muted: '#6c757d',
        line: '#ced4da',
        surface: '#ffffff',
        canvas: '#f6f8fa',
        success: '#2e7d4f',
        warning: '#b26a00',
        danger: '#c0392b',
      },
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto',
          '"Helvetica Neue"', 'Arial', '"Noto Sans"', 'sans-serif',
        ],
      },
      borderRadius: { DEFAULT: '4px' },
      maxWidth: { card: '410px', shell: '1180px' },
      boxShadow: {
        card: '0 1px 3px rgba(16,24,40,0.08), 0 1px 2px rgba(16,24,40,0.06)',
      },
    },
  },
  plugins: [],
};

export default config;
