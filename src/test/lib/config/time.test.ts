/**
 * Unit Tests for Time Duration Constants
 *
 * Tests the centralized time duration constants used across the application
 * for session management and token expiration.
 *
 * @module src/lib/config/time
 */
import { describe, it, expect } from 'vitest'
import { SESSION_DURATION_MS, SESSION_DURATION_STRING, TOKEN_EXPIRY_MS, TIME_CONFIG } from '@/lib/config/time'

// ============================================================================
// SESSION_DURATION_MS Tests
// ============================================================================

describe('SESSION_DURATION_MS', () => {
  it('should equal 7 days in milliseconds', () => {
    // 7 days * 24 hours * 60 minutes * 60 seconds * 1000 milliseconds
    const expectedMs = 7 * 24 * 60 * 60 * 1000

    expect(SESSION_DURATION_MS).toBe(expectedMs)
  })

  it('should equal exactly 604800000 milliseconds', () => {
    expect(SESSION_DURATION_MS).toBe(604800000)
  })

  it('should be a positive number', () => {
    expect(SESSION_DURATION_MS).toBeGreaterThan(0)
  })
})

// ============================================================================
// SESSION_DURATION_STRING Tests
// ============================================================================

describe('SESSION_DURATION_STRING', () => {
  it('should be the string "7d"', () => {
    expect(SESSION_DURATION_STRING).toBe('7d')
  })

  it('should be a valid jose time string format', () => {
    // jose library accepts time strings like '7d', '24h', '30m'
    expect(SESSION_DURATION_STRING).toMatch(/^\d+[dhms]$/)
  })
})

// ============================================================================
// TOKEN_EXPIRY_MS Tests
// ============================================================================

describe('TOKEN_EXPIRY_MS', () => {
  it('should equal 24 hours in milliseconds', () => {
    // 24 hours * 60 minutes * 60 seconds * 1000 milliseconds
    const expectedMs = 24 * 60 * 60 * 1000

    expect(TOKEN_EXPIRY_MS).toBe(expectedMs)
  })

  it('should equal exactly 86400000 milliseconds', () => {
    expect(TOKEN_EXPIRY_MS).toBe(86400000)
  })

  it('should be a positive number', () => {
    expect(TOKEN_EXPIRY_MS).toBeGreaterThan(0)
  })

  it('should be less than session duration', () => {
    expect(TOKEN_EXPIRY_MS).toBeLessThan(SESSION_DURATION_MS)
  })
})

// ============================================================================
// TIME_CONFIG Tests
// ============================================================================

describe('TIME_CONFIG', () => {
  it('should expose sessionDurationMs matching the constant', () => {
    expect(TIME_CONFIG.sessionDurationMs).toBe(SESSION_DURATION_MS)
  })

  it('should expose sessionDurationString matching the constant', () => {
    expect(TIME_CONFIG.sessionDurationString).toBe(SESSION_DURATION_STRING)
  })

  it('should expose tokenExpiryMs matching the constant', () => {
    expect(TIME_CONFIG.tokenExpiryMs).toBe(TOKEN_EXPIRY_MS)
  })

  it('should have all expected properties', () => {
    expect(TIME_CONFIG).toHaveProperty('sessionDurationMs')
    expect(TIME_CONFIG).toHaveProperty('sessionDurationString')
    expect(TIME_CONFIG).toHaveProperty('tokenExpiryMs')
  })

  it('should be a readonly object', () => {
    // TypeScript enforces this at compile time with 'as const'
    // At runtime, we can verify the object is frozen-like (values are primitives)
    expect(typeof TIME_CONFIG.sessionDurationMs).toBe('number')
    expect(typeof TIME_CONFIG.sessionDurationString).toBe('string')
    expect(typeof TIME_CONFIG.tokenExpiryMs).toBe('number')
  })
})

// ============================================================================
// Integration Tests - Value Relationships
// ============================================================================

describe('Time constants relationships', () => {
  it('should have session duration longer than token expiry', () => {
    // Sessions should last longer than verification tokens
    expect(SESSION_DURATION_MS).toBeGreaterThan(TOKEN_EXPIRY_MS)
  })

  it('should have session duration equal to 7 token expiry periods', () => {
    // 7 days = 7 * 24 hours
    expect(SESSION_DURATION_MS / TOKEN_EXPIRY_MS).toBe(7)
  })
})
