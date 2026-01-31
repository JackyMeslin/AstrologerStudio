/**
 * Unit Tests for AI Configuration
 *
 * Tests the centralized AI configuration constants,
 * including caching settings and model configuration.
 *
 * Note: Since config values are evaluated at module load time and vitest
 * doesn't support module resetting between tests, we test the configuration
 * module's behavior with the current environment.
 *
 * @module src/lib/ai/config
 */
import { describe, it, expect } from 'vitest'
import { AI_CACHE_ENABLED, AI_CACHE_TTL_MS, AI_MODEL } from '@/lib/ai/config'

// ============================================================================
// AI_MODEL Tests
// ============================================================================

describe('AI_MODEL', () => {
  it('should be a non-empty string', () => {
    expect(typeof AI_MODEL).toBe('string')
    expect(AI_MODEL.length).toBeGreaterThan(0)
  })

  it('should follow OpenRouter model format (provider/model)', () => {
    // OpenRouter models follow the format: provider/model-name
    expect(AI_MODEL).toMatch(/^[\w-]+\/[\w.-]+$/)
  })

  it('should be the default value when AI_MODEL is not set', () => {
    const envValue = process.env.AI_MODEL
    const expectedDefault = 'deepseek/deepseek-v3.2'

    if (!envValue) {
      expect(AI_MODEL).toBe(expectedDefault)
    } else {
      expect(AI_MODEL).toBe(envValue)
    }
  })

  it('should match the expected fallback behavior pattern', () => {
    // Test that the configuration follows the pattern:
    // process.env.AI_MODEL || 'deepseek/deepseek-v3.2'
    const envValue = process.env.AI_MODEL
    const defaultValue = 'deepseek/deepseek-v3.2'

    // This mimics the logic in the config file
    const expected = envValue || defaultValue
    expect(AI_MODEL).toBe(expected)
  })
})

// ============================================================================
// AI_CACHE_ENABLED Tests
// ============================================================================

describe('AI_CACHE_ENABLED', () => {
  it('should be a boolean', () => {
    expect(typeof AI_CACHE_ENABLED).toBe('boolean')
  })

  it('should follow expected fallback behavior pattern', () => {
    const rawCacheEnabled = process.env.AI_CACHE_ENABLED
    // Default is true if undefined, otherwise parse as boolean
    const expected = rawCacheEnabled === undefined ? true : rawCacheEnabled.toLowerCase() === 'true'

    expect(AI_CACHE_ENABLED).toBe(expected)
  })
})

// ============================================================================
// AI_CACHE_TTL_MS Tests
// ============================================================================

describe('AI_CACHE_TTL_MS', () => {
  it('should be a positive number', () => {
    expect(typeof AI_CACHE_TTL_MS).toBe('number')
    expect(AI_CACHE_TTL_MS).toBeGreaterThan(0)
    expect(Number.isFinite(AI_CACHE_TTL_MS)).toBe(true)
  })

  it('should default to 24 hours in milliseconds when not set', () => {
    const rawTtl = process.env.AI_CACHE_TTL_MS
    const defaultTtlMs = 24 * 60 * 60 * 1000 // 24 hours

    if (!rawTtl) {
      expect(AI_CACHE_TTL_MS).toBe(defaultTtlMs)
    }
  })

  it('should be a reasonable TTL value (at least 1 minute)', () => {
    const oneMinuteMs = 60 * 1000
    expect(AI_CACHE_TTL_MS).toBeGreaterThanOrEqual(oneMinuteMs)
  })
})
