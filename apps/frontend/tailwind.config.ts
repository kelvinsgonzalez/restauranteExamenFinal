import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#b45309',
          dark: '#92400e',
          light: '#f97316'
        }
      }
    }
  },
  plugins: []
} satisfies Config;
