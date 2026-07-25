import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

import { integrationTestFiles } from './vitest.test-files'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    include: integrationTestFiles,
    environment: 'jsdom',
    globals: true,
    fileParallelism: false,
    maxWorkers: 1,
    hookTimeout: 60_000,
    testTimeout: 30_000,
  },
})
