/**
 * Environment Setup for Vitest
 *
 * This file runs BEFORE the test environment is set up and before
 * test modules are loaded. Used to set environment variables that
 * are needed during module initialization.
 */

// Required for session module which reads SESSION_SECRET at top level
process.env.SESSION_SECRET = 'test-secret-key-minimum-32-chars!!'

// Required for admin session module which reads ADMIN_SESSION_SECRET at top level
process.env.ADMIN_SESSION_SECRET = 'test-admin-secret-key-minimum-32-chars!!'

// Guard against accidental use of real databases during tests
// Always point DATABASE_URL to a non-routable/invalid value in test runs
process.env.DATABASE_URL = 'postgresql://invalid.invalid:5432/invalid'
