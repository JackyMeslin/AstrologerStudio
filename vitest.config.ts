/**
 * Vitest Configuration for Astrologer Studio
 *
 * This configuration sets up Vitest for both backend utility testing
 * and frontend React component testing with jsdom environment.
 */
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    // Use jsdom for React component testing
    environment: 'jsdom',

    // Setup file extends matchers with @testing-library/jest-dom
    setupFiles: ['./src/test/setup.ts'],

    // Include test files matching these patterns
    include: ['src/**/*.{test,spec}.{ts,tsx}'],

    // Exclude node_modules and build artifacts
    exclude: ['node_modules', '.next', 'dist'],

    // Enable global test utilities (describe, it, expect)
    globals: true,

    // Coverage configuration (optional, run with --coverage flag)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/lib/**/*.ts', 'src/components/**/*.tsx'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/**/*.spec.{ts,tsx}'],
    },
  },

  // Path aliases matching tsconfig.json
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})
