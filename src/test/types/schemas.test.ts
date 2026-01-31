/**
 * Unit Tests for publicBirthDataSchema
 *
 * Tests the Zod validation schema for public birth data from URL parameters.
 * This schema validates base64-decoded chart data from shareable URLs to
 * protect against malformed or malicious input.
 *
 * @module src/types/schemas
 */
import { describe, it, expect } from 'vitest'
import { publicBirthDataSchema } from '@/types/schemas'

// ============================================================================
// Valid Input Tests
// ============================================================================

describe('publicBirthDataSchema', () => {
  /**
   * Tests for valid public birth data validation.
   */

  it('should validate a complete valid birth data object', () => {
    const validData = {
      name: 'John Doe',
      year: 1990,
      month: 6,
      day: 15,
      hour: 14,
      minute: 30,
      city: 'New York',
      nation: 'US',
      latitude: 40.7128,
      longitude: -74.006,
      timezone: 'America/New_York',
    }

    const result = publicBirthDataSchema.safeParse(validData)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('John Doe')
      expect(result.data.year).toBe(1990)
      expect(result.data.month).toBe(6)
      expect(result.data.latitude).toBe(40.7128)
    }
  })

  it('should accept boundary values for month (1-12)', () => {
    const baseData = {
      name: 'Test',
      year: 2000,
      day: 1,
      hour: 12,
      minute: 0,
      city: 'Test City',
      nation: 'US',
      latitude: 0,
      longitude: 0,
      timezone: 'UTC',
    }

    // Test month 1
    const result1 = publicBirthDataSchema.safeParse({ ...baseData, month: 1 })
    expect(result1.success).toBe(true)

    // Test month 12
    const result12 = publicBirthDataSchema.safeParse({ ...baseData, month: 12 })
    expect(result12.success).toBe(true)
  })

  it('should accept boundary values for day (1-31)', () => {
    const baseData = {
      name: 'Test',
      year: 2000,
      month: 1,
      hour: 12,
      minute: 0,
      city: 'Test City',
      nation: 'US',
      latitude: 0,
      longitude: 0,
      timezone: 'UTC',
    }

    const result1 = publicBirthDataSchema.safeParse({ ...baseData, day: 1 })
    expect(result1.success).toBe(true)

    const result31 = publicBirthDataSchema.safeParse({ ...baseData, day: 31 })
    expect(result31.success).toBe(true)
  })

  it('should accept boundary values for hour (0-23)', () => {
    const baseData = {
      name: 'Test',
      year: 2000,
      month: 1,
      day: 1,
      minute: 0,
      city: 'Test City',
      nation: 'US',
      latitude: 0,
      longitude: 0,
      timezone: 'UTC',
    }

    const result0 = publicBirthDataSchema.safeParse({ ...baseData, hour: 0 })
    expect(result0.success).toBe(true)

    const result23 = publicBirthDataSchema.safeParse({ ...baseData, hour: 23 })
    expect(result23.success).toBe(true)
  })

  it('should accept boundary values for minute (0-59)', () => {
    const baseData = {
      name: 'Test',
      year: 2000,
      month: 1,
      day: 1,
      hour: 12,
      city: 'Test City',
      nation: 'US',
      latitude: 0,
      longitude: 0,
      timezone: 'UTC',
    }

    const result0 = publicBirthDataSchema.safeParse({ ...baseData, minute: 0 })
    expect(result0.success).toBe(true)

    const result59 = publicBirthDataSchema.safeParse({ ...baseData, minute: 59 })
    expect(result59.success).toBe(true)
  })

  it('should accept boundary values for latitude (-90 to 90)', () => {
    const baseData = {
      name: 'Test',
      year: 2000,
      month: 1,
      day: 1,
      hour: 12,
      minute: 0,
      city: 'Test City',
      nation: 'US',
      longitude: 0,
      timezone: 'UTC',
    }

    const resultMin = publicBirthDataSchema.safeParse({ ...baseData, latitude: -90 })
    expect(resultMin.success).toBe(true)

    const resultMax = publicBirthDataSchema.safeParse({ ...baseData, latitude: 90 })
    expect(resultMax.success).toBe(true)
  })

  it('should accept boundary values for longitude (-180 to 180)', () => {
    const baseData = {
      name: 'Test',
      year: 2000,
      month: 1,
      day: 1,
      hour: 12,
      minute: 0,
      city: 'Test City',
      nation: 'US',
      latitude: 0,
      timezone: 'UTC',
    }

    const resultMin = publicBirthDataSchema.safeParse({ ...baseData, longitude: -180 })
    expect(resultMin.success).toBe(true)

    const resultMax = publicBirthDataSchema.safeParse({ ...baseData, longitude: 180 })
    expect(resultMax.success).toBe(true)
  })

  // ============================================================================
  // Invalid Input Tests
  // ============================================================================

  it('should reject month out of range', () => {
    const baseData = {
      name: 'Test',
      year: 2000,
      day: 1,
      hour: 12,
      minute: 0,
      city: 'Test City',
      nation: 'US',
      latitude: 0,
      longitude: 0,
      timezone: 'UTC',
    }

    const result0 = publicBirthDataSchema.safeParse({ ...baseData, month: 0 })
    expect(result0.success).toBe(false)

    const result13 = publicBirthDataSchema.safeParse({ ...baseData, month: 13 })
    expect(result13.success).toBe(false)
  })

  it('should reject day out of range', () => {
    const baseData = {
      name: 'Test',
      year: 2000,
      month: 1,
      hour: 12,
      minute: 0,
      city: 'Test City',
      nation: 'US',
      latitude: 0,
      longitude: 0,
      timezone: 'UTC',
    }

    const result0 = publicBirthDataSchema.safeParse({ ...baseData, day: 0 })
    expect(result0.success).toBe(false)

    const result32 = publicBirthDataSchema.safeParse({ ...baseData, day: 32 })
    expect(result32.success).toBe(false)
  })

  it('should reject hour out of range', () => {
    const baseData = {
      name: 'Test',
      year: 2000,
      month: 1,
      day: 1,
      minute: 0,
      city: 'Test City',
      nation: 'US',
      latitude: 0,
      longitude: 0,
      timezone: 'UTC',
    }

    const resultNeg = publicBirthDataSchema.safeParse({ ...baseData, hour: -1 })
    expect(resultNeg.success).toBe(false)

    const result24 = publicBirthDataSchema.safeParse({ ...baseData, hour: 24 })
    expect(result24.success).toBe(false)
  })

  it('should reject minute out of range', () => {
    const baseData = {
      name: 'Test',
      year: 2000,
      month: 1,
      day: 1,
      hour: 12,
      city: 'Test City',
      nation: 'US',
      latitude: 0,
      longitude: 0,
      timezone: 'UTC',
    }

    const resultNeg = publicBirthDataSchema.safeParse({ ...baseData, minute: -1 })
    expect(resultNeg.success).toBe(false)

    const result60 = publicBirthDataSchema.safeParse({ ...baseData, minute: 60 })
    expect(result60.success).toBe(false)
  })

  it('should reject latitude out of range', () => {
    const baseData = {
      name: 'Test',
      year: 2000,
      month: 1,
      day: 1,
      hour: 12,
      minute: 0,
      city: 'Test City',
      nation: 'US',
      longitude: 0,
      timezone: 'UTC',
    }

    const resultLow = publicBirthDataSchema.safeParse({ ...baseData, latitude: -91 })
    expect(resultLow.success).toBe(false)

    const resultHigh = publicBirthDataSchema.safeParse({ ...baseData, latitude: 91 })
    expect(resultHigh.success).toBe(false)
  })

  it('should reject longitude out of range', () => {
    const baseData = {
      name: 'Test',
      year: 2000,
      month: 1,
      day: 1,
      hour: 12,
      minute: 0,
      city: 'Test City',
      nation: 'US',
      latitude: 0,
      timezone: 'UTC',
    }

    const resultLow = publicBirthDataSchema.safeParse({ ...baseData, longitude: -181 })
    expect(resultLow.success).toBe(false)

    const resultHigh = publicBirthDataSchema.safeParse({ ...baseData, longitude: 181 })
    expect(resultHigh.success).toBe(false)
  })

  it('should reject missing required fields', () => {
    const incompleteData = {
      name: 'Test',
      year: 2000,
      // missing month, day, hour, minute, etc.
    }

    const result = publicBirthDataSchema.safeParse(incompleteData)
    expect(result.success).toBe(false)
  })

  it('should reject non-integer values for date/time fields', () => {
    const baseData = {
      name: 'Test',
      year: 2000,
      month: 1,
      day: 1,
      hour: 12,
      minute: 0,
      city: 'Test City',
      nation: 'US',
      latitude: 0,
      longitude: 0,
      timezone: 'UTC',
    }

    const resultFloat = publicBirthDataSchema.safeParse({ ...baseData, month: 1.5 })
    expect(resultFloat.success).toBe(false)
  })

  it('should reject wrong types', () => {
    const invalidData = {
      name: 'Test',
      year: '2000', // string instead of number
      month: 1,
      day: 1,
      hour: 12,
      minute: 0,
      city: 'Test City',
      nation: 'US',
      latitude: 0,
      longitude: 0,
      timezone: 'UTC',
    }

    const result = publicBirthDataSchema.safeParse(invalidData)
    expect(result.success).toBe(false)
  })

  it('should reject null or undefined', () => {
    const resultNull = publicBirthDataSchema.safeParse(null)
    expect(resultNull.success).toBe(false)

    const resultUndefined = publicBirthDataSchema.safeParse(undefined)
    expect(resultUndefined.success).toBe(false)
  })

  it('should reject malicious input with extra properties (strips them)', () => {
    const dataWithExtra = {
      name: 'Test',
      year: 2000,
      month: 1,
      day: 1,
      hour: 12,
      minute: 0,
      city: 'Test City',
      nation: 'US',
      latitude: 0,
      longitude: 0,
      timezone: 'UTC',
      maliciousField: '<script>alert("xss")</script>',
      __proto__: { admin: true },
    }

    const result = publicBirthDataSchema.safeParse(dataWithExtra)
    // Should succeed but extra fields are stripped by Zod
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('maliciousField')
      expect(result.data).not.toHaveProperty('__proto__')
    }
  })

  it('should reject year out of reasonable range', () => {
    const baseData = {
      name: 'Test',
      month: 1,
      day: 1,
      hour: 12,
      minute: 0,
      city: 'Test City',
      nation: 'US',
      latitude: 0,
      longitude: 0,
      timezone: 'UTC',
    }

    // Year 0 should be rejected (min is 1)
    const result0 = publicBirthDataSchema.safeParse({ ...baseData, year: 0 })
    expect(result0.success).toBe(false)

    // Year beyond 3000 should be rejected
    const resultFuture = publicBirthDataSchema.safeParse({ ...baseData, year: 3001 })
    expect(resultFuture.success).toBe(false)
  })
})
