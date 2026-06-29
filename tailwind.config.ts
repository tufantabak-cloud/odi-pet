import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: '#4726AF',
          'purple-dark': '#3E1EA2',
          'purple-light': '#6B4ECC',
          green: '#29B906',
          gold: '#FFD76F',
          orange: '#FFC734',
          yellow: '#F7E27C',
        },
        'cat-vaccine': '#3B9FE8',
        'cat-parasite': '#34C97A', 
        'cat-care': '#F06292',
        'cat-nutrition': '#F59E0B',
        'cat-hygiene': '#38BDF8',
        'cat-activity': '#F97316',
        'cat-health': '#EF4444',
        'cat-vet': '#4F46E5',
        'primary-soft': '#F2EEFF',
        'surface-tint': '#6244ce',
      }
    }
  },
  plugins: [],
};

export default config;
