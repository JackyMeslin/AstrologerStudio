/**
 * Unit Tests for GeoNames Actions
 *
 * Tests the GeoNames server actions that proxy requests to the
 * server-side GeoNames library to protect credentials.
 *
 * @module src/actions/geonames
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// ============================================================================
// MOCKS
// ============================================================================

// Mock GeoNames library functions
const mockFetchCitySuggestions = vi.fn()
const mockFetchGeoNamesLocation = vi.fn()
const mockFetchTimezoneFromGeoNames = vi.fn()

vi.mock('@/lib/geo/geonames', () => ({
  fetchCitySuggestions: (...args: unknown[]) => mockFetchCitySuggestions(...args),
  fetchGeoNamesLocation: (...args: unknown[]) => mockFetchGeoNamesLocation(...args),
  fetchTimezoneFromGeoNames: (...args: unknown[]) => mockFetchTimezoneFromGeoNames(...args),
}))

// Mock logger
vi.mock('@/lib/logging/server', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Sample city suggestion for tests
 */
const sampleCitySuggestion = {
  name: 'Rome',
  adminName: 'Lazio',
  countryCode: 'IT',
  countryName: 'Italy',
  latitude: 41.9028,
  longitude: 12.4964,
}

/**
 * Sample location details for tests
 */
const sampleLocationDetails = {
  latitude: 41.9028,
  longitude: 12.4964,
  timezone: 'Europe/Rome',
}

// ============================================================================
// TESTS
// ============================================================================

describe('GeoNames Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ==========================================================================
  // SEARCH CITIES ACTION TESTS
  // ==========================================================================

  describe('searchCitiesAction', () => {
    it('should return array of GeoNamesCitySuggestion', async () => {
      const { searchCitiesAction } = await import('@/actions/geonames')
      mockFetchCitySuggestions.mockResolvedValue([sampleCitySuggestion])

      const result = await searchCitiesAction('Rome')

      expect(result).toEqual([sampleCitySuggestion])
      expect(Array.isArray(result)).toBe(true)
      expect(result[0]).toHaveProperty('name', 'Rome')
      expect(result[0]).toHaveProperty('latitude')
      expect(result[0]).toHaveProperty('longitude')
    })

    it('should pass nation to fetchCitySuggestions when provided', async () => {
      const { searchCitiesAction } = await import('@/actions/geonames')
      mockFetchCitySuggestions.mockResolvedValue([sampleCitySuggestion])

      await searchCitiesAction('Rome', 'IT')

      expect(mockFetchCitySuggestions).toHaveBeenCalledWith('Rome', 'IT')
    })

    it('should call fetchCitySuggestions without nation when not provided', async () => {
      const { searchCitiesAction } = await import('@/actions/geonames')
      mockFetchCitySuggestions.mockResolvedValue([sampleCitySuggestion])

      await searchCitiesAction('Paris')

      expect(mockFetchCitySuggestions).toHaveBeenCalledWith('Paris', undefined)
    })

    it('should call fetchCitySuggestions with null nation when passed null', async () => {
      const { searchCitiesAction } = await import('@/actions/geonames')
      mockFetchCitySuggestions.mockResolvedValue([sampleCitySuggestion])

      await searchCitiesAction('London', null)

      expect(mockFetchCitySuggestions).toHaveBeenCalledWith('London', null)
    })

    it('should return empty array when no results found', async () => {
      const { searchCitiesAction } = await import('@/actions/geonames')
      mockFetchCitySuggestions.mockResolvedValue([])

      const result = await searchCitiesAction('ValidCityName')

      expect(result).toEqual([])
      expect(result.length).toBe(0)
    })

    it('should throw generic error without exposing internal details', async () => {
      const { searchCitiesAction } = await import('@/actions/geonames')
      mockFetchCitySuggestions.mockRejectedValue(new Error('GeoNames API key expired at secret-key-12345'))

      await expect(searchCitiesAction('Rome')).rejects.toThrow('Failed to search cities')
    })

    it('should not expose sensitive error details in thrown error', async () => {
      const { searchCitiesAction } = await import('@/actions/geonames')
      const sensitiveError = new Error('Connection failed to internal.geonames.org:3306 with password xyz123')
      mockFetchCitySuggestions.mockRejectedValue(sensitiveError)

      try {
        await searchCitiesAction('Rome')
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).toBe('Failed to search cities')
        expect((error as Error).message).not.toContain('internal.geonames.org')
        expect((error as Error).message).not.toContain('password')
        expect((error as Error).message).not.toContain('xyz123')
      }
    })

    // ========================================================================
    // INPUT SANITIZATION TESTS
    // ========================================================================

    describe('input sanitization', () => {
      it('should accept valid city names with special characters', async () => {
        const { searchCitiesAction } = await import('@/actions/geonames')
        mockFetchCitySuggestions.mockResolvedValue([sampleCitySuggestion])

        // Test various valid city names with special characters
        await searchCitiesAction('Saint-Étienne')
        expect(mockFetchCitySuggestions).toHaveBeenCalledWith('Saint-Étienne', undefined)

        await searchCitiesAction('São Paulo', 'BR')
        expect(mockFetchCitySuggestions).toHaveBeenCalledWith('São Paulo', 'BR')

        await searchCitiesAction("O'Brien")
        expect(mockFetchCitySuggestions).toHaveBeenCalledWith("O'Brien", undefined)
      })

      it('should trim whitespace from city input', async () => {
        const { searchCitiesAction } = await import('@/actions/geonames')
        mockFetchCitySuggestions.mockResolvedValue([sampleCitySuggestion])

        await searchCitiesAction('  Rome  ')

        expect(mockFetchCitySuggestions).toHaveBeenCalledWith('Rome', undefined)
      })

      it('should trim whitespace from nation input', async () => {
        const { searchCitiesAction } = await import('@/actions/geonames')
        mockFetchCitySuggestions.mockResolvedValue([sampleCitySuggestion])

        await searchCitiesAction('Rome', '  IT  ')

        expect(mockFetchCitySuggestions).toHaveBeenCalledWith('Rome', 'IT')
      })

      it('should reject empty city input', async () => {
        const { searchCitiesAction } = await import('@/actions/geonames')
        mockFetchCitySuggestions.mockResolvedValue([sampleCitySuggestion])

        await expect(searchCitiesAction('')).rejects.toThrow('Failed to search cities')
        expect(mockFetchCitySuggestions).not.toHaveBeenCalled()
      })

      it('should reject city input with only whitespace', async () => {
        const { searchCitiesAction } = await import('@/actions/geonames')
        mockFetchCitySuggestions.mockResolvedValue([sampleCitySuggestion])

        await expect(searchCitiesAction('   ')).rejects.toThrow('Failed to search cities')
        expect(mockFetchCitySuggestions).not.toHaveBeenCalled()
      })

      it('should reject city input exceeding max length', async () => {
        const { searchCitiesAction } = await import('@/actions/geonames')
        mockFetchCitySuggestions.mockResolvedValue([sampleCitySuggestion])

        const longCity = 'A'.repeat(101) // Max is 100
        await expect(searchCitiesAction(longCity)).rejects.toThrow('Failed to search cities')
        expect(mockFetchCitySuggestions).not.toHaveBeenCalled()
      })

      it('should reject nation input exceeding max length', async () => {
        const { searchCitiesAction } = await import('@/actions/geonames')
        mockFetchCitySuggestions.mockResolvedValue([sampleCitySuggestion])

        const longNation = 'A'.repeat(61) // Max is 60
        await expect(searchCitiesAction('Rome', longNation)).rejects.toThrow('Failed to search cities')
        expect(mockFetchCitySuggestions).not.toHaveBeenCalled()
      })

      it('should reject city input with invalid characters (potential injection)', async () => {
        const { searchCitiesAction } = await import('@/actions/geonames')
        mockFetchCitySuggestions.mockResolvedValue([sampleCitySuggestion])

        // SQL injection attempt
        await expect(searchCitiesAction("Rome'; DROP TABLE cities;--")).rejects.toThrow('Failed to search cities')
        expect(mockFetchCitySuggestions).not.toHaveBeenCalled()
      })

      it('should reject nation input with invalid characters (potential injection)', async () => {
        const { searchCitiesAction } = await import('@/actions/geonames')
        mockFetchCitySuggestions.mockResolvedValue([sampleCitySuggestion])

        // Script injection attempt
        await expect(searchCitiesAction('Rome', '<script>alert(1)</script>')).rejects.toThrow('Failed to search cities')
        expect(mockFetchCitySuggestions).not.toHaveBeenCalled()
      })

      it('should reject city with control characters', async () => {
        const { searchCitiesAction } = await import('@/actions/geonames')
        mockFetchCitySuggestions.mockResolvedValue([sampleCitySuggestion])

        await expect(searchCitiesAction('Rome\x00')).rejects.toThrow('Failed to search cities')
        expect(mockFetchCitySuggestions).not.toHaveBeenCalled()
      })

      it('should reject city with newline injection', async () => {
        const { searchCitiesAction } = await import('@/actions/geonames')
        mockFetchCitySuggestions.mockResolvedValue([sampleCitySuggestion])

        await expect(searchCitiesAction('Rome\nX-Injected-Header: value')).rejects.toThrow('Failed to search cities')
        expect(mockFetchCitySuggestions).not.toHaveBeenCalled()
      })
    })
  })

  // ==========================================================================
  // GET LOCATION DETAILS ACTION TESTS
  // ==========================================================================

  describe('getLocationDetailsAction', () => {
    it('should return latitude, longitude, and timezone', async () => {
      const { getLocationDetailsAction } = await import('@/actions/geonames')
      mockFetchGeoNamesLocation.mockResolvedValue(sampleLocationDetails)

      const result = await getLocationDetailsAction('Rome', 'IT')

      expect(result).toEqual(sampleLocationDetails)
      expect(result).toHaveProperty('latitude', 41.9028)
      expect(result).toHaveProperty('longitude', 12.4964)
      expect(result).toHaveProperty('timezone', 'Europe/Rome')
    })

    it('should pass city and nation to fetchGeoNamesLocation', async () => {
      const { getLocationDetailsAction } = await import('@/actions/geonames')
      mockFetchGeoNamesLocation.mockResolvedValue(sampleLocationDetails)

      await getLocationDetailsAction('Paris', 'FR')

      expect(mockFetchGeoNamesLocation).toHaveBeenCalledWith({ city: 'Paris', nation: 'FR' })
    })

    it('should handle optional city parameter', async () => {
      const { getLocationDetailsAction } = await import('@/actions/geonames')
      mockFetchGeoNamesLocation.mockResolvedValue(sampleLocationDetails)

      await getLocationDetailsAction(undefined, 'IT')

      expect(mockFetchGeoNamesLocation).toHaveBeenCalledWith({ city: undefined, nation: 'IT' })
    })

    it('should handle optional nation parameter', async () => {
      const { getLocationDetailsAction } = await import('@/actions/geonames')
      mockFetchGeoNamesLocation.mockResolvedValue(sampleLocationDetails)

      await getLocationDetailsAction('Rome', undefined)

      expect(mockFetchGeoNamesLocation).toHaveBeenCalledWith({ city: 'Rome', nation: undefined })
    })

    it('should handle null parameters', async () => {
      const { getLocationDetailsAction } = await import('@/actions/geonames')
      mockFetchGeoNamesLocation.mockResolvedValue(sampleLocationDetails)

      await getLocationDetailsAction(null, null)

      expect(mockFetchGeoNamesLocation).toHaveBeenCalledWith({ city: null, nation: null })
    })

    it('should throw generic error without exposing internal details', async () => {
      const { getLocationDetailsAction } = await import('@/actions/geonames')
      mockFetchGeoNamesLocation.mockRejectedValue(new Error('Database connection failed'))

      await expect(getLocationDetailsAction('Rome', 'IT')).rejects.toThrow('Failed to fetch location details')
    })

    it('should not expose sensitive error details', async () => {
      const { getLocationDetailsAction } = await import('@/actions/geonames')
      mockFetchGeoNamesLocation.mockRejectedValue(new Error('Auth failed for user admin with token abc123'))

      try {
        await getLocationDetailsAction('Rome')
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).toBe('Failed to fetch location details')
        expect((error as Error).message).not.toContain('admin')
        expect((error as Error).message).not.toContain('abc123')
      }
    })

    // ========================================================================
    // INPUT SANITIZATION TESTS
    // ========================================================================

    describe('input sanitization', () => {
      it('should trim whitespace from city and nation', async () => {
        const { getLocationDetailsAction } = await import('@/actions/geonames')
        mockFetchGeoNamesLocation.mockResolvedValue(sampleLocationDetails)

        await getLocationDetailsAction('  Paris  ', '  FR  ')

        expect(mockFetchGeoNamesLocation).toHaveBeenCalledWith({ city: 'Paris', nation: 'FR' })
      })

      it('should reject city with injection characters', async () => {
        const { getLocationDetailsAction } = await import('@/actions/geonames')
        mockFetchGeoNamesLocation.mockResolvedValue(sampleLocationDetails)

        await expect(getLocationDetailsAction('Paris${PATH}', 'FR')).rejects.toThrow('Failed to fetch location details')
        expect(mockFetchGeoNamesLocation).not.toHaveBeenCalled()
      })

      it('should reject nation with script tags', async () => {
        const { getLocationDetailsAction } = await import('@/actions/geonames')
        mockFetchGeoNamesLocation.mockResolvedValue(sampleLocationDetails)

        await expect(getLocationDetailsAction('Paris', '<img onerror=alert(1)>')).rejects.toThrow(
          'Failed to fetch location details',
        )
        expect(mockFetchGeoNamesLocation).not.toHaveBeenCalled()
      })
    })
  })

  // ==========================================================================
  // GET TIMEZONE ACTION TESTS
  // ==========================================================================

  describe('getTimezoneAction', () => {
    it('should return timezone string', async () => {
      const { getTimezoneAction } = await import('@/actions/geonames')
      mockFetchTimezoneFromGeoNames.mockResolvedValue('Europe/Rome')

      const result = await getTimezoneAction(41.9028, 12.4964)

      expect(result).toBe('Europe/Rome')
      expect(typeof result).toBe('string')
    })

    it('should pass latitude and longitude to fetchTimezoneFromGeoNames', async () => {
      const { getTimezoneAction } = await import('@/actions/geonames')
      mockFetchTimezoneFromGeoNames.mockResolvedValue('America/New_York')

      await getTimezoneAction(40.7128, -74.006)

      expect(mockFetchTimezoneFromGeoNames).toHaveBeenCalledWith({
        latitude: 40.7128,
        longitude: -74.006,
      })
    })

    it('should handle various timezone formats', async () => {
      const { getTimezoneAction } = await import('@/actions/geonames')
      mockFetchTimezoneFromGeoNames.mockResolvedValue('Asia/Tokyo')

      const result = await getTimezoneAction(35.6762, 139.6503)

      expect(result).toBe('Asia/Tokyo')
    })

    it('should throw generic error without exposing internal details', async () => {
      const { getTimezoneAction } = await import('@/actions/geonames')
      mockFetchTimezoneFromGeoNames.mockRejectedValue(new Error('API quota exceeded'))

      await expect(getTimezoneAction(41.9028, 12.4964)).rejects.toThrow('Failed to fetch timezone')
    })

    it('should not expose sensitive error details', async () => {
      const { getTimezoneAction } = await import('@/actions/geonames')
      mockFetchTimezoneFromGeoNames.mockRejectedValue(
        new Error('Request to api.internal.com failed with secret key exposed'),
      )

      try {
        await getTimezoneAction(41.9028, 12.4964)
        expect.fail('Should have thrown an error')
      } catch (error) {
        expect((error as Error).message).toBe('Failed to fetch timezone')
        expect((error as Error).message).not.toContain('api.internal.com')
        expect((error as Error).message).not.toContain('secret')
      }
    })

    // ========================================================================
    // INPUT VALIDATION TESTS
    // ========================================================================

    describe('input validation', () => {
      it('should reject latitude below -90', async () => {
        const { getTimezoneAction } = await import('@/actions/geonames')
        mockFetchTimezoneFromGeoNames.mockResolvedValue('Europe/Rome')

        await expect(getTimezoneAction(-91, 12.4964)).rejects.toThrow('Failed to fetch timezone')
        expect(mockFetchTimezoneFromGeoNames).not.toHaveBeenCalled()
      })

      it('should reject latitude above 90', async () => {
        const { getTimezoneAction } = await import('@/actions/geonames')
        mockFetchTimezoneFromGeoNames.mockResolvedValue('Europe/Rome')

        await expect(getTimezoneAction(91, 12.4964)).rejects.toThrow('Failed to fetch timezone')
        expect(mockFetchTimezoneFromGeoNames).not.toHaveBeenCalled()
      })

      it('should reject longitude below -180', async () => {
        const { getTimezoneAction } = await import('@/actions/geonames')
        mockFetchTimezoneFromGeoNames.mockResolvedValue('Europe/Rome')

        await expect(getTimezoneAction(41.9028, -181)).rejects.toThrow('Failed to fetch timezone')
        expect(mockFetchTimezoneFromGeoNames).not.toHaveBeenCalled()
      })

      it('should reject longitude above 180', async () => {
        const { getTimezoneAction } = await import('@/actions/geonames')
        mockFetchTimezoneFromGeoNames.mockResolvedValue('Europe/Rome')

        await expect(getTimezoneAction(41.9028, 181)).rejects.toThrow('Failed to fetch timezone')
        expect(mockFetchTimezoneFromGeoNames).not.toHaveBeenCalled()
      })

      it('should accept valid edge case coordinates', async () => {
        const { getTimezoneAction } = await import('@/actions/geonames')
        mockFetchTimezoneFromGeoNames.mockResolvedValue('Etc/GMT')

        // Test edge cases: exact boundaries should be valid
        await getTimezoneAction(90, 180)
        expect(mockFetchTimezoneFromGeoNames).toHaveBeenCalledWith({ latitude: 90, longitude: 180 })

        mockFetchTimezoneFromGeoNames.mockClear()
        await getTimezoneAction(-90, -180)
        expect(mockFetchTimezoneFromGeoNames).toHaveBeenCalledWith({ latitude: -90, longitude: -180 })
      })
    })
  })
})
