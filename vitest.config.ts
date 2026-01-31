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

    // Setup files - env-setup must come first to set env vars before module loading
    setupFiles: ['./src/test/env-setup.ts', './src/test/setup.ts'],

    // Note: For tests requiring node environment (e.g., jose JWT tests),
    // use the @vitest-environment node comment in the test file header.
    // See: src/test/lib/security/session.test.ts for an example.

    // Include test files matching these patterns
    include: ['src/**/*.{test,spec}.{ts,tsx}'],

    // Exclude node_modules and build artifacts
    exclude: ['node_modules', '.next', 'dist'],

    // Enable global test utilities (describe, it, expect)
    globals: true,

    // Isolate test environments to ensure env vars are fresh per test
    isolate: true,

    // Environment variables available during test runtime
    env: {
      SESSION_SECRET: 'test-secret-key-minimum-32-chars!!',
      ADMIN_SESSION_SECRET: 'test-admin-secret-key-minimum-32-chars!!',
    },

    // Coverage configuration (optional, run with --coverage flag)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/lib/**/*.ts', 'src/actions/**/*.ts'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        // External services - should be tested with integration tests
        'src/lib/logging/**/*.ts',
        'src/lib/mail/**/*.ts',
        'src/lib/ai/**/*.ts',
        'src/lib/db/prisma.ts',
        // Heavy API integration file - tested via e2e
        'src/lib/api/transits.ts',
        // Pure configuration files - no logic to test
        'src/lib/config/pricing.ts',
        'src/lib/config/legal.ts',
        'src/lib/geo/countries.ts',
        // React hooks requiring complex mocking
        'src/lib/subscription/hooks.ts',
        // File system operations - requires fs mocking
        'src/lib/manual.ts',
        // Simple API wrapper - tested via action tests
        'src/lib/api/auth.ts',
      ],
    },
  },

  // Path aliases matching tsconfig.json
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      // Mock Next.js server-only package for testing
      'server-only': resolve(__dirname, './src/test/__mocks__/server-only.ts'),
    },
  },
})
