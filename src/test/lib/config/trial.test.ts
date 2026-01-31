/**
 * Unit Tests for Trial Configuration
 *
 * Tests the trial period configuration functions used for managing
 * the PRO trial system for new users.
 *
 * @module src/lib/config/trial
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  getTrialDurationDays,
  getTrialDurationMs,
  calculateTrialEndDate,
  calculateTrialDaysLeft,
  isTrialExpired,
  TRIAL_CONFIG,
} from '@/lib/config/trial'

// ============================================================================
// getTrialDurationDays Tests
// ============================================================================

describe('getTrialDurationDays', () => {
  const originalEnv = process.env.TRIAL_DURATION_DAYS

  afterEach(() => {
    // Restore original env value
    if (originalEnv === undefined) {
      delete process.env.TRIAL_DURATION_DAYS
    } else {
      process.env.TRIAL_DURATION_DAYS = originalEnv
    }
  })

  it('should return default value of 15 when env var is not set', () => {
    delete process.env.TRIAL_DURATION_DAYS

    const result = getTrialDurationDays()

    expect(result).toBe(15)
  })

  it('should read trial duration from TRIAL_DURATION_DAYS env var', () => {
    process.env.TRIAL_DURATION_DAYS = '14'

    const result = getTrialDurationDays()

    expect(result).toBe(14)
  })

  it('should read custom trial duration from env var', () => {
    process.env.TRIAL_DURATION_DAYS = '30'

    const result = getTrialDurationDays()

    expect(result).toBe(30)
  })

  it('should return default when env var is invalid string', () => {
    process.env.TRIAL_DURATION_DAYS = 'invalid'

    const result = getTrialDurationDays()

    expect(result).toBe(15)
  })

  it('should return default when env var is zero', () => {
    process.env.TRIAL_DURATION_DAYS = '0'

    const result = getTrialDurationDays()

    expect(result).toBe(15)
  })

  it('should return default when env var is negative', () => {
    process.env.TRIAL_DURATION_DAYS = '-5'

    const result = getTrialDurationDays()

    expect(result).toBe(15)
  })

  it('should return default when env var is empty string', () => {
    process.env.TRIAL_DURATION_DAYS = ''

    const result = getTrialDurationDays()

    expect(result).toBe(15)
  })
})

// ============================================================================
// getTrialDurationMs Tests
// ============================================================================

describe('getTrialDurationMs', () => {
  const originalEnv = process.env.TRIAL_DURATION_DAYS

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.TRIAL_DURATION_DAYS
    } else {
      process.env.TRIAL_DURATION_DAYS = originalEnv
    }
  })

  it('should return trial duration in milliseconds', () => {
    delete process.env.TRIAL_DURATION_DAYS

    const result = getTrialDurationMs()

    // 15 days * 24 hours * 60 minutes * 60 seconds * 1000 milliseconds
    const expectedMs = 15 * 24 * 60 * 60 * 1000
    expect(result).toBe(expectedMs)
  })

  it('should calculate correctly based on env var', () => {
    process.env.TRIAL_DURATION_DAYS = '7'

    const result = getTrialDurationMs()

    const expectedMs = 7 * 24 * 60 * 60 * 1000
    expect(result).toBe(expectedMs)
  })
})

// ============================================================================
// calculateTrialEndDate Tests
// ============================================================================

describe('calculateTrialEndDate', () => {
  const originalEnv = process.env.TRIAL_DURATION_DAYS

  beforeEach(() => {
    vi.useFakeTimers()
    delete process.env.TRIAL_DURATION_DAYS
  })

  afterEach(() => {
    vi.useRealTimers()
    if (originalEnv === undefined) {
      delete process.env.TRIAL_DURATION_DAYS
    } else {
      process.env.TRIAL_DURATION_DAYS = originalEnv
    }
  })

  it('should add trial days to provided start date', () => {
    const startDate = new Date('2025-01-01T00:00:00.000Z')

    const result = calculateTrialEndDate(startDate)

    // 15 days after start date
    expect(result.toISOString()).toBe('2025-01-16T00:00:00.000Z')
  })

  it('should use current date when no start date provided', () => {
    const mockNow = new Date('2025-01-15T12:00:00.000Z')
    vi.setSystemTime(mockNow)

    const result = calculateTrialEndDate()

    // 15 days after mock current date
    expect(result.toISOString()).toBe('2025-01-30T12:00:00.000Z')
  })

  it('should respect custom trial duration from env', () => {
    process.env.TRIAL_DURATION_DAYS = '7'
    const startDate = new Date('2025-01-01T00:00:00.000Z')

    const result = calculateTrialEndDate(startDate)

    // 7 days after start date
    expect(result.toISOString()).toBe('2025-01-08T00:00:00.000Z')
  })

  it('should preserve time component of start date', () => {
    const startDate = new Date('2025-01-01T14:30:45.123Z')

    const result = calculateTrialEndDate(startDate)

    // Should add exactly 15 days, preserving time
    expect(result.toISOString()).toBe('2025-01-16T14:30:45.123Z')
  })
})

// ============================================================================
// calculateTrialDaysLeft Tests
// ============================================================================

describe('calculateTrialDaysLeft', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return positive number for active trial', () => {
    const mockNow = new Date('2025-01-15T12:00:00.000Z')
    vi.setSystemTime(mockNow)

    // Trial ends in 10 days
    const trialEndDate = new Date('2025-01-25T12:00:00.000Z')

    const result = calculateTrialDaysLeft(trialEndDate)

    expect(result).toBe(10)
  })

  it('should return zero for expired trial', () => {
    const mockNow = new Date('2025-01-15T12:00:00.000Z')
    vi.setSystemTime(mockNow)

    // Trial ended 5 days ago
    const trialEndDate = new Date('2025-01-10T12:00:00.000Z')

    const result = calculateTrialDaysLeft(trialEndDate)

    expect(result).toBe(0)
  })

  it('should return null for null input', () => {
    const result = calculateTrialDaysLeft(null)

    expect(result).toBeNull()
  })

  it('should return null for undefined input', () => {
    const result = calculateTrialDaysLeft(undefined)

    expect(result).toBeNull()
  })

  it('should round up partial days', () => {
    const mockNow = new Date('2025-01-15T12:00:00.000Z')
    vi.setSystemTime(mockNow)

    // Trial ends in 2.5 days (should round up to 3)
    const trialEndDate = new Date('2025-01-18T00:00:00.000Z')

    const result = calculateTrialDaysLeft(trialEndDate)

    expect(result).toBe(3)
  })

  it('should return 1 for trial expiring within 24 hours', () => {
    const mockNow = new Date('2025-01-15T12:00:00.000Z')
    vi.setSystemTime(mockNow)

    // Trial ends in 12 hours
    const trialEndDate = new Date('2025-01-16T00:00:00.000Z')

    const result = calculateTrialDaysLeft(trialEndDate)

    expect(result).toBe(1)
  })

  it('should return 0 when trial just expired', () => {
    const mockNow = new Date('2025-01-15T12:00:00.000Z')
    vi.setSystemTime(mockNow)

    // Trial ended 1 hour ago
    const trialEndDate = new Date('2025-01-15T11:00:00.000Z')

    const result = calculateTrialDaysLeft(trialEndDate)

    expect(result).toBe(0)
  })
})

// ============================================================================
// isTrialExpired Tests
// ============================================================================

describe('isTrialExpired', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should return false for active trial', () => {
    const mockNow = new Date('2025-01-15T12:00:00.000Z')
    vi.setSystemTime(mockNow)

    // Trial ends in the future
    const trialEndDate = new Date('2025-01-25T12:00:00.000Z')

    const result = isTrialExpired(trialEndDate)

    expect(result).toBe(false)
  })

  it('should return true for expired trial', () => {
    const mockNow = new Date('2025-01-15T12:00:00.000Z')
    vi.setSystemTime(mockNow)

    // Trial ended in the past
    const trialEndDate = new Date('2025-01-10T12:00:00.000Z')

    const result = isTrialExpired(trialEndDate)

    expect(result).toBe(true)
  })

  it('should return true for null input', () => {
    const result = isTrialExpired(null)

    expect(result).toBe(true)
  })

  it('should return true for undefined input', () => {
    const result = isTrialExpired(undefined)

    expect(result).toBe(true)
  })

  it('should return true when trial just expired', () => {
    const mockNow = new Date('2025-01-15T12:00:00.000Z')
    vi.setSystemTime(mockNow)

    // Trial ended 1 second ago
    const trialEndDate = new Date('2025-01-15T11:59:59.000Z')

    const result = isTrialExpired(trialEndDate)

    expect(result).toBe(true)
  })

  it('should return false when trial expires in 1 second', () => {
    const mockNow = new Date('2025-01-15T12:00:00.000Z')
    vi.setSystemTime(mockNow)

    // Trial ends in 1 second
    const trialEndDate = new Date('2025-01-15T12:00:01.000Z')

    const result = isTrialExpired(trialEndDate)

    expect(result).toBe(false)
  })
})

// ============================================================================
// TRIAL_CONFIG Tests
// ============================================================================

describe('TRIAL_CONFIG', () => {
  const originalEnv = process.env.TRIAL_DURATION_DAYS

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.TRIAL_DURATION_DAYS
    } else {
      process.env.TRIAL_DURATION_DAYS = originalEnv
    }
  })

  it('should expose durationDays getter that returns trial duration', () => {
    delete process.env.TRIAL_DURATION_DAYS

    expect(TRIAL_CONFIG.durationDays).toBe(15)
  })

  it('should expose durationMs getter that returns trial duration in milliseconds', () => {
    delete process.env.TRIAL_DURATION_DAYS

    expect(TRIAL_CONFIG.durationMs).toBe(15 * 24 * 60 * 60 * 1000)
  })

  it('should reflect env var changes via getter', () => {
    process.env.TRIAL_DURATION_DAYS = '7'

    expect(TRIAL_CONFIG.durationDays).toBe(7)
    expect(TRIAL_CONFIG.durationMs).toBe(7 * 24 * 60 * 60 * 1000)
  })
})
