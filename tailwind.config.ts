import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // OPOS Renk Sistemi v1.0 (Resmi Tek Kural Değerleri)
        brand: {
          purple: '#9C26AF',
          'purple-dark': '#6A189A',
          'purple-hover': '#B239C4',
          'purple-soft': '#F2E8FA',
          'accent-purple': '#6A189A',
          green: '#22C55E',
          gold: '#FFD76F',
          orange: '#F59E0B',
          yellow: '#F7E27C',
        },
        // OPOS 04_color-tokens.md → "Pet Care Domain Soft Tint Triples"
        'cat-vaccine': '#3B82F6',
        'cat-parasite': '#22C55E',
        'cat-care': '#EC4899',
        'cat-nutrition': '#F59E0B',
        'cat-hygiene': '#0D9488',
        'cat-activity': '#9C26AF',
        'cat-health': '#EF4444',
        'cat-vet': '#4F46E5',
        'primary-soft': '#F2E8FA',
        'surface-tint': '#9C26AF',
      }
    }
  },
  plugins: [],
};

export default config;
