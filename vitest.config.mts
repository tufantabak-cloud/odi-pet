import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import dotenv from 'dotenv'

import {
  fixtureDependentTestFiles,
  integrationTestFiles,
} from './vitest.test-files'

dotenv.config({ path: '.env.local' })

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    globals: true,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://soautcxgiqhxiaxrubxv.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    },
    exclude: [
      '**/node_modules/**',
      '**/.next/**',
      '**/.git/**',
      'e2e',
      '.claude',
      'brain',
      'scratch',
      'tests',
      ...integrationTestFiles,
      ...fixtureDependentTestFiles,
    ],
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
