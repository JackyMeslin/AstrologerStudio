/**
 * Unit Tests for React Query Configuration
 *
 * Tests the centralized staleTime and gcTime constants used across
 * the application for consistent caching behavior.
 *
 * @module src/lib/config/query
 */
import { describe, it, expect } from 'vitest'
import {
  STALE_TIME_NONE,
  STALE_TIME_SHORT,
  STALE_TIME_MEDIUM,
  STALE_TIME_LONG,
  STALE_TIME_INFINITE,
  GC_TIME_DEFAULT,
  STALE_TIME,
  GC_TIME,
} from '@/lib/config/query'

// ============================================================================
// Individual Constant Tests
// ============================================================================

describe('Individual STALE_TIME constants', () => {
  it('STALE_TIME_NONE should be 0', () => {
    expect(STALE_TIME_NONE).toBe(0)
  })

  it('STALE_TIME_SHORT should be 1 minute (60000ms)', () => {
    expect(STALE_TIME_SHORT).toBe(1000 * 60)
    expect(STALE_TIME_SHORT).toBe(60000)
  })

  it('STALE_TIME_MEDIUM should be 5 minutes (300000ms)', () => {
    expect(STALE_TIME_MEDIUM).toBe(1000 * 60 * 5)
    expect(STALE_TIME_MEDIUM).toBe(300000)
  })

  it('STALE_TIME_LONG should be 30 minutes (1800000ms)', () => {
    expect(STALE_TIME_LONG).toBe(1000 * 60 * 30)
    expect(STALE_TIME_LONG).toBe(1800000)
  })

  it('STALE_TIME_INFINITE should be Infinity', () => {
    expect(STALE_TIME_INFINITE).toBe(Infinity)
  })

  it('GC_TIME_DEFAULT should be 10 minutes (600000ms)', () => {
    expect(GC_TIME_DEFAULT).toBe(1000 * 60 * 10)
    expect(GC_TIME_DEFAULT).toBe(600000)
  })
})

// ============================================================================
// Consolidated Object Tests
// ============================================================================

describe('STALE_TIME object', () => {
  it('should have NONE property equal to STALE_TIME_NONE', () => {
    expect(STALE_TIME.NONE).toBe(STALE_TIME_NONE)
    expect(STALE_TIME.NONE).toBe(0)
  })

  it('should have SHORT property equal to STALE_TIME_SHORT', () => {
    expect(STALE_TIME.SHORT).toBe(STALE_TIME_SHORT)
    expect(STALE_TIME.SHORT).toBe(60000)
  })

  it('should have MEDIUM property equal to STALE_TIME_MEDIUM', () => {
    expect(STALE_TIME.MEDIUM).toBe(STALE_TIME_MEDIUM)
    expect(STALE_TIME.MEDIUM).toBe(300000)
  })

  it('should have LONG property equal to STALE_TIME_LONG', () => {
    expect(STALE_TIME.LONG).toBe(STALE_TIME_LONG)
    expect(STALE_TIME.LONG).toBe(1800000)
  })

  it('should have INFINITE property equal to STALE_TIME_INFINITE', () => {
    expect(STALE_TIME.INFINITE).toBe(STALE_TIME_INFINITE)
    expect(STALE_TIME.INFINITE).toBe(Infinity)
  })

  it('should have all expected keys', () => {
    const keys = Object.keys(STALE_TIME)
    expect(keys).toContain('NONE')
    expect(keys).toContain('SHORT')
    expect(keys).toContain('MEDIUM')
    expect(keys).toContain('LONG')
    expect(keys).toContain('INFINITE')
    expect(keys.length).toBe(5)
  })
})

describe('GC_TIME object', () => {
  it('should have DEFAULT property equal to GC_TIME_DEFAULT', () => {
    expect(GC_TIME.DEFAULT).toBe(GC_TIME_DEFAULT)
    expect(GC_TIME.DEFAULT).toBe(600000)
  })

  it('should have all expected keys', () => {
    const keys = Object.keys(GC_TIME)
    expect(keys).toContain('DEFAULT')
    expect(keys.length).toBe(1)
  })
})

// ============================================================================
// Value Ordering Tests
// ============================================================================

describe('STALE_TIME value ordering', () => {
  it('should have values in ascending order (NONE < SHORT < MEDIUM < LONG)', () => {
    expect(STALE_TIME.NONE).toBeLessThan(STALE_TIME.SHORT)
    expect(STALE_TIME.SHORT).toBeLessThan(STALE_TIME.MEDIUM)
    expect(STALE_TIME.MEDIUM).toBeLessThan(STALE_TIME.LONG)
    expect(STALE_TIME.LONG).toBeLessThan(STALE_TIME.INFINITE)
  })

  it('gcTime should be greater than medium staleTime (proper cache lifecycle)', () => {
    // gcTime should be longer than staleTime to allow stale-while-revalidate
    expect(GC_TIME.DEFAULT).toBeGreaterThan(STALE_TIME.MEDIUM)
  })
})

// ============================================================================
// Type Safety Tests
// ============================================================================

describe('Type safety', () => {
  it('all staleTime values should be numbers', () => {
    expect(typeof STALE_TIME_NONE).toBe('number')
    expect(typeof STALE_TIME_SHORT).toBe('number')
    expect(typeof STALE_TIME_MEDIUM).toBe('number')
    expect(typeof STALE_TIME_LONG).toBe('number')
    expect(typeof STALE_TIME_INFINITE).toBe('number')
    expect(typeof GC_TIME_DEFAULT).toBe('number')
  })

  it('all staleTime values should be non-negative', () => {
    expect(STALE_TIME_NONE).toBeGreaterThanOrEqual(0)
    expect(STALE_TIME_SHORT).toBeGreaterThanOrEqual(0)
    expect(STALE_TIME_MEDIUM).toBeGreaterThanOrEqual(0)
    expect(STALE_TIME_LONG).toBeGreaterThanOrEqual(0)
    expect(STALE_TIME_INFINITE).toBeGreaterThanOrEqual(0)
    expect(GC_TIME_DEFAULT).toBeGreaterThanOrEqual(0)
  })

  it('STALE_TIME object should be read-only (const assertion)', () => {
    // TypeScript const assertion ensures this at compile time
    // At runtime, we verify the object structure is as expected
    expect(Object.isFrozen(STALE_TIME)).toBe(false) // Not runtime frozen, but TS const
    expect(STALE_TIME).toEqual({
      NONE: 0,
      SHORT: 60000,
      MEDIUM: 300000,
      LONG: 1800000,
      INFINITE: Infinity,
    })
  })
})
