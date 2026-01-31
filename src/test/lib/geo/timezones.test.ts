/**
 * Unit Tests for Timezone Utilities
 *
 * Tests the getAllTimezones function that returns IANA timezone identifiers.
 *
 * @module src/lib/geo/timezones
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getAllTimezones } from '@/lib/geo/timezones'

describe('getAllTimezones', () => {
  describe('when Intl.supportedValuesOf is available', () => {
    let originalSupportedValuesOf: typeof Intl.supportedValuesOf | undefined

    beforeEach(() => {
      originalSupportedValuesOf = (Intl as Record<string, unknown>).supportedValuesOf as
        | typeof Intl.supportedValuesOf
        | undefined
      ;(Intl as Record<string, unknown>).supportedValuesOf = vi
        .fn()
        .mockReturnValue(['Europe/Rome', 'America/New_York', 'Asia/Tokyo'])
    })

    afterEach(() => {
      if (originalSupportedValuesOf) {
        ;(Intl as Record<string, unknown>).supportedValuesOf = originalSupportedValuesOf
      } else {
        delete (Intl as Record<string, unknown>).supportedValuesOf
      }
    })

    it('should return timezones from Intl.supportedValuesOf when available', () => {
      const result = getAllTimezones()

      // Should return an array
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)

      // Should contain mocked timezones
      expect(result).toContain('Europe/Rome')
      expect(result).toContain('America/New_York')
    })
  })

  describe('when Intl.supportedValuesOf is not available', () => {
    let originalSupportedValuesOf: typeof Intl.supportedValuesOf | undefined

    beforeEach(() => {
      // Store original
      originalSupportedValuesOf = (Intl as Record<string, unknown>).supportedValuesOf as
        | typeof Intl.supportedValuesOf
        | undefined

      // Remove supportedValuesOf
      delete (Intl as Record<string, unknown>).supportedValuesOf
    })

    afterEach(() => {
      // Restore original
      if (originalSupportedValuesOf) {
        ;(Intl as Record<string, unknown>).supportedValuesOf = originalSupportedValuesOf
      }
    })

    it('should return fallback timezones when Intl.supportedValuesOf is not available', () => {
      const result = getAllTimezones()

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)

      // Should contain the fallback list
      expect(result).toContain('UTC')
      expect(result).toContain('Europe/Rome')
      expect(result).toContain('Europe/Paris')
      expect(result).toContain('America/New_York')
      expect(result).toContain('Asia/Tokyo')
      expect(result).toContain('Australia/Sydney')
    })
  })

  describe('when Intl.supportedValuesOf throws', () => {
    let originalSupportedValuesOf: typeof Intl.supportedValuesOf | undefined

    beforeEach(() => {
      originalSupportedValuesOf = (Intl as Record<string, unknown>).supportedValuesOf as
        | typeof Intl.supportedValuesOf
        | undefined
      ;(Intl as Record<string, unknown>).supportedValuesOf = vi.fn().mockImplementation(() => {
        throw new Error('Not supported')
      })
    })

    afterEach(() => {
      if (originalSupportedValuesOf) {
        ;(Intl as Record<string, unknown>).supportedValuesOf = originalSupportedValuesOf
      } else {
        delete (Intl as Record<string, unknown>).supportedValuesOf
      }
    })

    it('should return fallback timezones when Intl.supportedValuesOf throws', () => {
      const result = getAllTimezones()

      expect(Array.isArray(result)).toBe(true)
      expect(result).toContain('UTC')
      expect(result).toContain('Europe/Rome')
    })
  })

  describe('when Intl.supportedValuesOf returns empty array', () => {
    let originalSupportedValuesOf: typeof Intl.supportedValuesOf | undefined

    beforeEach(() => {
      originalSupportedValuesOf = (Intl as Record<string, unknown>).supportedValuesOf as
        | typeof Intl.supportedValuesOf
        | undefined
      ;(Intl as Record<string, unknown>).supportedValuesOf = vi.fn().mockReturnValue([])
    })

    afterEach(() => {
      if (originalSupportedValuesOf) {
        ;(Intl as Record<string, unknown>).supportedValuesOf = originalSupportedValuesOf
      } else {
        delete (Intl as Record<string, unknown>).supportedValuesOf
      }
    })

    it('should return fallback timezones when Intl returns empty array', () => {
      const result = getAllTimezones()

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      expect(result).toContain('UTC')
    })
  })
})
