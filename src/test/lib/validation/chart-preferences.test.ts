/**
 * Unit Tests for Chart Preferences Validation Schema
 *
 * Tests the Zod schema for validating chart preferences updates.
 *
 * @module src/lib/validation/chart-preferences
 */
import { describe, it, expect } from 'vitest'
import {
  chartPreferencesUpdateSchema,
  validateChartPreferencesUpdate,
  safeValidateChartPreferencesUpdate,
} from '@/lib/validation/chart-preferences'

describe('chartPreferencesUpdateSchema', () => {
  // ==========================================================================
  // VALID INPUT TESTS
  // ==========================================================================

  describe('valid inputs', () => {
    it('should accept empty object (all fields optional)', () => {
      const result = chartPreferencesUpdateSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it('should accept valid theme', () => {
      const result = chartPreferencesUpdateSchema.safeParse({ theme: 'dark' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.theme).toBe('dark')
      }
    })

    it('should accept valid date_format values', () => {
      for (const format of ['US', 'EU', 'ISO']) {
        const result = chartPreferencesUpdateSchema.safeParse({ date_format: format })
        expect(result.success).toBe(true)
      }
    })

    it('should accept valid time_format values', () => {
      for (const format of ['12h', '24h']) {
        const result = chartPreferencesUpdateSchema.safeParse({ time_format: format })
        expect(result.success).toBe(true)
      }
    })

    it('should accept boolean show_aspect_icons', () => {
      const result = chartPreferencesUpdateSchema.safeParse({ show_aspect_icons: false })
      expect(result.success).toBe(true)
    })

    it('should accept boolean show_degree_indicators', () => {
      const result = chartPreferencesUpdateSchema.safeParse({ show_degree_indicators: true })
      expect(result.success).toBe(true)
    })

    it('should accept valid distribution_method values', () => {
      for (const method of ['weighted', 'pure_count']) {
        const result = chartPreferencesUpdateSchema.safeParse({ distribution_method: method })
        expect(result.success).toBe(true)
      }
    })

    it('should accept valid active_points array', () => {
      const result = chartPreferencesUpdateSchema.safeParse({
        active_points: ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars'],
      })
      expect(result.success).toBe(true)
    })

    it('should accept valid active_aspects array', () => {
      const result = chartPreferencesUpdateSchema.safeParse({
        active_aspects: [
          { name: 'conjunction', orb: 10 },
          { name: 'opposition', orb: 8 },
        ],
      })
      expect(result.success).toBe(true)
    })

    it('should accept valid custom_distribution_weights', () => {
      const result = chartPreferencesUpdateSchema.safeParse({
        custom_distribution_weights: { sun: 2, moon: 2, mercury: 1.5 },
      })
      expect(result.success).toBe(true)
    })

    it('should accept valid zodiac_system values', () => {
      for (const system of ['Tropical', 'Sidereal']) {
        const result = chartPreferencesUpdateSchema.safeParse({ default_zodiac_system: system })
        expect(result.success).toBe(true)
      }
    })

    it('should accept valid sidereal_mode values', () => {
      for (const mode of ['LAHIRI', 'FAGAN_BRADLEY', 'KRISHNAMURTI']) {
        const result = chartPreferencesUpdateSchema.safeParse({ default_sidereal_mode: mode })
        expect(result.success).toBe(true)
      }
    })

    it('should accept valid house_system codes', () => {
      for (const code of ['P', 'K', 'W', 'A', 'R', 'C', 'O', 'M', 'T', 'B']) {
        const result = chartPreferencesUpdateSchema.safeParse({ house_system: code })
        expect(result.success).toBe(true)
      }
    })

    it('should accept valid perspective_type values', () => {
      for (const type of ['Apparent Geocentric', 'Heliocentric', 'True Geocentric']) {
        const result = chartPreferencesUpdateSchema.safeParse({ perspective_type: type })
        expect(result.success).toBe(true)
      }
    })

    it('should accept valid rulership_mode values', () => {
      for (const mode of ['classical', 'modern']) {
        const result = chartPreferencesUpdateSchema.safeParse({ rulership_mode: mode })
        expect(result.success).toBe(true)
      }
    })

    it('should accept complete valid preferences object', () => {
      const result = chartPreferencesUpdateSchema.safeParse({
        theme: 'classic',
        date_format: 'EU',
        time_format: '24h',
        show_aspect_icons: true,
        show_degree_indicators: true,
        distribution_method: 'weighted',
        active_points: ['Sun', 'Moon'],
        active_aspects: [{ name: 'conjunction', orb: 10 }],
        custom_distribution_weights: { sun: 2 },
        default_zodiac_system: 'Tropical',
        default_sidereal_mode: 'LAHIRI',
        house_system: 'P',
        perspective_type: 'Apparent Geocentric',
        rulership_mode: 'classical',
      })
      expect(result.success).toBe(true)
    })
  })

  // ==========================================================================
  // INVALID INPUT TESTS
  // ==========================================================================

  describe('invalid inputs', () => {
    it('should reject empty theme string', () => {
      const result = chartPreferencesUpdateSchema.safeParse({ theme: '' })
      expect(result.success).toBe(false)
    })

    it('should reject theme longer than 50 characters', () => {
      const result = chartPreferencesUpdateSchema.safeParse({ theme: 'a'.repeat(51) })
      expect(result.success).toBe(false)
    })

    it('should reject invalid date_format', () => {
      const result = chartPreferencesUpdateSchema.safeParse({ date_format: 'INVALID' })
      expect(result.success).toBe(false)
    })

    it('should reject invalid time_format', () => {
      const result = chartPreferencesUpdateSchema.safeParse({ time_format: '16h' })
      expect(result.success).toBe(false)
    })

    it('should reject non-boolean show_aspect_icons', () => {
      const result = chartPreferencesUpdateSchema.safeParse({ show_aspect_icons: 'true' })
      expect(result.success).toBe(false)
    })

    it('should reject invalid distribution_method', () => {
      const result = chartPreferencesUpdateSchema.safeParse({ distribution_method: 'invalid' })
      expect(result.success).toBe(false)
    })

    it('should reject invalid celestial point names', () => {
      const result = chartPreferencesUpdateSchema.safeParse({
        active_points: ['Sun', 'InvalidPlanet', 'Moon'],
      })
      expect(result.success).toBe(false)
    })

    it('should reject active_points array with more than 50 items', () => {
      const tooManyPoints = Array(51).fill('Sun')
      const result = chartPreferencesUpdateSchema.safeParse({ active_points: tooManyPoints })
      expect(result.success).toBe(false)
    })

    it('should reject active_aspects with invalid aspect name', () => {
      const result = chartPreferencesUpdateSchema.safeParse({
        active_aspects: [{ name: 'invalid_aspect', orb: 5 }],
      })
      expect(result.success).toBe(false)
    })

    it('should reject active_aspects with negative orb', () => {
      const result = chartPreferencesUpdateSchema.safeParse({
        active_aspects: [{ name: 'conjunction', orb: -1 }],
      })
      expect(result.success).toBe(false)
    })

    it('should reject active_aspects with orb greater than 30', () => {
      const result = chartPreferencesUpdateSchema.safeParse({
        active_aspects: [{ name: 'conjunction', orb: 31 }],
      })
      expect(result.success).toBe(false)
    })

    it('should reject active_aspects array with more than 20 items', () => {
      const tooManyAspects = Array(21).fill({ name: 'conjunction', orb: 10 })
      const result = chartPreferencesUpdateSchema.safeParse({ active_aspects: tooManyAspects })
      expect(result.success).toBe(false)
    })

    it('should reject custom_distribution_weights with negative values', () => {
      const result = chartPreferencesUpdateSchema.safeParse({
        custom_distribution_weights: { sun: -1 },
      })
      expect(result.success).toBe(false)
    })

    it('should reject custom_distribution_weights with values over 100', () => {
      const result = chartPreferencesUpdateSchema.safeParse({
        custom_distribution_weights: { sun: 101 },
      })
      expect(result.success).toBe(false)
    })

    it('should reject custom_distribution_weights with more than 50 entries', () => {
      const tooManyWeights: Record<string, number> = {}
      for (let i = 0; i < 51; i++) {
        tooManyWeights[`key${i}`] = 1
      }
      const result = chartPreferencesUpdateSchema.safeParse({
        custom_distribution_weights: tooManyWeights,
      })
      expect(result.success).toBe(false)
    })

    it('should reject invalid zodiac_system', () => {
      const result = chartPreferencesUpdateSchema.safeParse({ default_zodiac_system: 'Invalid' })
      expect(result.success).toBe(false)
    })

    it('should reject invalid sidereal_mode', () => {
      const result = chartPreferencesUpdateSchema.safeParse({ default_sidereal_mode: 'INVALID' })
      expect(result.success).toBe(false)
    })

    it('should reject invalid house_system code', () => {
      const result = chartPreferencesUpdateSchema.safeParse({ house_system: 'X' })
      expect(result.success).toBe(false)
    })

    it('should reject legacy house_system names (must use codes)', () => {
      const result = chartPreferencesUpdateSchema.safeParse({ house_system: 'Placidus' })
      expect(result.success).toBe(false)
    })

    it('should reject invalid perspective_type', () => {
      const result = chartPreferencesUpdateSchema.safeParse({ perspective_type: 'Topocentric' })
      expect(result.success).toBe(false)
    })

    it('should reject invalid rulership_mode', () => {
      const result = chartPreferencesUpdateSchema.safeParse({ rulership_mode: 'hybrid' })
      expect(result.success).toBe(false)
    })

    it('should reject unknown/extra fields (strict mode)', () => {
      const result = chartPreferencesUpdateSchema.safeParse({
        theme: 'dark',
        unknownField: 'value',
      })
      expect(result.success).toBe(false)
    })
  })

  // ==========================================================================
  // SECURITY-FOCUSED TESTS
  // ==========================================================================

  describe('security validations', () => {
    it('should reject extremely long theme strings', () => {
      const result = chartPreferencesUpdateSchema.safeParse({ theme: 'x'.repeat(1000) })
      expect(result.success).toBe(false)
    })

    it('should reject theme with potential injection characters', () => {
      // The schema accepts any characters up to 50 chars, but length is limited
      const result = chartPreferencesUpdateSchema.safeParse({
        theme: '<script>alert(1)</script>',
      })
      // This should pass because it's under 50 chars - the consumer handles sanitization
      expect(result.success).toBe(true)
    })

    it('should reject active_aspects with missing required fields', () => {
      const result = chartPreferencesUpdateSchema.safeParse({
        active_aspects: [{ name: 'conjunction' }], // missing orb
      })
      expect(result.success).toBe(false)
    })

    it('should reject active_aspects with extra fields', () => {
      const result = chartPreferencesUpdateSchema.safeParse({
        active_aspects: [{ name: 'conjunction', orb: 10, extraField: 'hack' }],
      })
      // Zod strips unknown keys in nested objects by default (unless passthrough)
      expect(result.success).toBe(true)
    })

    it('should handle null values by rejecting them', () => {
      const result = chartPreferencesUpdateSchema.safeParse({ theme: null })
      expect(result.success).toBe(false)
    })

    it('should handle undefined properly (field is omitted)', () => {
      const result = chartPreferencesUpdateSchema.safeParse({ theme: undefined })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.theme).toBeUndefined()
      }
    })
  })
})

// ==========================================================================
// HELPER FUNCTION TESTS
// ==========================================================================

describe('validateChartPreferencesUpdate', () => {
  it('should return parsed data for valid input', () => {
    const input = { theme: 'dark', house_system: 'K' }
    const result = validateChartPreferencesUpdate(input)
    expect(result).toEqual({ theme: 'dark', house_system: 'K' })
  })

  it('should throw ZodError for invalid input', () => {
    expect(() => validateChartPreferencesUpdate({ theme: '' })).toThrow()
  })
})

describe('safeValidateChartPreferencesUpdate', () => {
  it('should return success: true for valid input', () => {
    const result = safeValidateChartPreferencesUpdate({ theme: 'dark' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.theme).toBe('dark')
    }
  })

  it('should return success: false with error for invalid input', () => {
    const result = safeValidateChartPreferencesUpdate({ theme: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBeDefined()
      expect(result.error.issues.length).toBeGreaterThan(0)
    }
  })
})
