/**
 * Unit Tests for Planetary Return Validation Schemas
 *
 * Tests the Zod schemas for solar and lunar return inputs.
 *
 * @module src/lib/validation/planetary-return
 */
import { describe, it, expect } from 'vitest'
import { returnLocationSchema, solarReturnSchema, lunarReturnSchema } from '@/lib/validation/planetary-return'

describe('returnLocationSchema', () => {
  it('should validate a complete location', () => {
    const location = {
      city: 'Rome',
      nation: 'IT',
      longitude: 12.4964,
      latitude: 41.9028,
      timezone: 'Europe/Rome',
    }

    const result = returnLocationSchema.safeParse(location)
    expect(result.success).toBe(true)
  })

  it('should reject empty city', () => {
    const location = {
      city: '',
      nation: 'IT',
      longitude: 12.4964,
      latitude: 41.9028,
      timezone: 'Europe/Rome',
    }

    const result = returnLocationSchema.safeParse(location)
    expect(result.success).toBe(false)
  })

  it('should reject empty nation', () => {
    const location = {
      city: 'Rome',
      nation: '',
      longitude: 12.4964,
      latitude: 41.9028,
      timezone: 'Europe/Rome',
    }

    const result = returnLocationSchema.safeParse(location)
    expect(result.success).toBe(false)
  })

  it('should reject missing required fields', () => {
    const location = {
      city: 'Rome',
    }

    const result = returnLocationSchema.safeParse(location)
    expect(result.success).toBe(false)
  })
})

describe('solarReturnSchema', () => {
  it('should validate a minimal solar return input', () => {
    const input = {
      year: 2024,
    }

    const result = solarReturnSchema.safeParse(input)
    expect(result.success).toBe(true)
    expect(result.data?.wheel_type).toBe('dual') // default
  })

  it('should validate with optional day', () => {
    const input = {
      year: 2024,
      day: 15,
    }

    const result = solarReturnSchema.safeParse(input)
    expect(result.success).toBe(true)
    expect(result.data?.day).toBe(15)
  })

  it('should validate with return location', () => {
    const input = {
      year: 2024,
      return_location: {
        city: 'New York',
        nation: 'US',
        longitude: -74.006,
        latitude: 40.7128,
        timezone: 'America/New_York',
      },
    }

    const result = solarReturnSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should validate wheel_type options', () => {
    expect(solarReturnSchema.safeParse({ year: 2024, wheel_type: 'single' }).success).toBe(true)
    expect(solarReturnSchema.safeParse({ year: 2024, wheel_type: 'dual' }).success).toBe(true)
    expect(solarReturnSchema.safeParse({ year: 2024, wheel_type: 'invalid' }).success).toBe(false)
  })

  it('should reject year below 1900', () => {
    const result = solarReturnSchema.safeParse({ year: 1800 })
    expect(result.success).toBe(false)
  })

  it('should reject year above 2100', () => {
    const result = solarReturnSchema.safeParse({ year: 2200 })
    expect(result.success).toBe(false)
  })

  it('should reject invalid day values', () => {
    expect(solarReturnSchema.safeParse({ year: 2024, day: 0 }).success).toBe(false)
    expect(solarReturnSchema.safeParse({ year: 2024, day: 32 }).success).toBe(false)
  })

  it('should reject non-integer year', () => {
    const result = solarReturnSchema.safeParse({ year: 2024.5 })
    expect(result.success).toBe(false)
  })
})

describe('lunarReturnSchema', () => {
  it('should validate a minimal lunar return input', () => {
    const input = {
      year: 2024,
      month: 6,
    }

    const result = lunarReturnSchema.safeParse(input)
    expect(result.success).toBe(true)
    expect(result.data?.wheel_type).toBe('dual') // default
  })

  it('should validate with optional day', () => {
    const input = {
      year: 2024,
      month: 6,
      day: 15,
    }

    const result = lunarReturnSchema.safeParse(input)
    expect(result.success).toBe(true)
    expect(result.data?.day).toBe(15)
  })

  it('should validate with return location', () => {
    const input = {
      year: 2024,
      month: 3,
      return_location: {
        city: 'Tokyo',
        nation: 'JP',
        longitude: 139.6917,
        latitude: 35.6895,
        timezone: 'Asia/Tokyo',
      },
    }

    const result = lunarReturnSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('should require month field', () => {
    const result = lunarReturnSchema.safeParse({ year: 2024 })
    expect(result.success).toBe(false)
  })

  it('should reject month below 1', () => {
    const result = lunarReturnSchema.safeParse({ year: 2024, month: 0 })
    expect(result.success).toBe(false)
  })

  it('should reject month above 12', () => {
    const result = lunarReturnSchema.safeParse({ year: 2024, month: 13 })
    expect(result.success).toBe(false)
  })

  it('should validate all valid months', () => {
    for (let month = 1; month <= 12; month++) {
      const result = lunarReturnSchema.safeParse({ year: 2024, month })
      expect(result.success).toBe(true)
    }
  })

  it('should validate wheel_type options', () => {
    expect(lunarReturnSchema.safeParse({ year: 2024, month: 1, wheel_type: 'single' }).success).toBe(true)
    expect(lunarReturnSchema.safeParse({ year: 2024, month: 1, wheel_type: 'dual' }).success).toBe(true)
    expect(lunarReturnSchema.safeParse({ year: 2024, month: 1, wheel_type: 'triple' }).success).toBe(false)
  })
})
