import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    globals: true,
    exclude: ['node_modules', '.next', '.git', 'e2e', '.claude', 'brain', 'scratch', 'tests'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**'],
      exclude: [
        'src/lib/supabase/**',
        'src/lib/cities.json',
        // These files require a live Supabase SSR client → integration tests only
        'src/lib/subscription/**',
        'src/lib/auth/**',
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 75,
      },
    },
  },
})
