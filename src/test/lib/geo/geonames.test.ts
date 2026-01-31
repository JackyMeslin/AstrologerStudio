/**
 * Unit Tests for GeoNames Library
 *
 * Tests for fetchCoordinatesFromGeoNames, fetchTimezoneFromGeoNames,
 * fetchGeoNamesLocation, and fetchCitySuggestions functions.
 *
 * Covers: missing GEONAMES_USERNAME, valid responses, empty responses,
 * HTTP errors, network errors, and robust parsing.
 *
 * @module src/lib/geo/geonames
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// ============================================================================
// MOCKS
// ============================================================================

// Mock the logger before importing the module under test
vi.mock('@/lib/logging/server', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock prisma to prevent DB access (defensive, in case future imports add prisma)
vi.mock('@/lib/db/prisma', () => ({
  prisma: {},
  default: {},
}))

// ============================================================================
// TEST SETUP
// ============================================================================

describe('GeoNames Library', () => {
  const originalEnv = process.env
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.resetModules()
    process.env = {
      ...originalEnv,
      GEONAMES_USERNAME: 'test_user',
    }

    // Create mock fetch
    mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  // Helper to create successful response
  const createSuccessResponse = (data: unknown) => ({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(data),
  })

  // Helper to create error response
  const createErrorResponse = (status: number) => ({
    ok: false,
    status,
    json: vi.fn().mockRejectedValue(new Error('Not JSON')),
  })

  // Helper to dynamically import the module with fresh env
  async function importGeoNames() {
    return await import('@/lib/geo/geonames')
  }

  // ==========================================================================
  // fetchCoordinatesFromGeoNames TESTS
  // ==========================================================================

  describe('fetchCoordinatesFromGeoNames', () => {
    describe('GEONAMES_USERNAME missing', () => {
      it('should throw error when GEONAMES_USERNAME is not set', async () => {
        delete process.env.GEONAMES_USERNAME

        const { fetchCoordinatesFromGeoNames } = await importGeoNames()

        await expect(fetchCoordinatesFromGeoNames({ city: 'Rome', nation: 'IT' })).rejects.toThrow(
          'GeoNames username not configured. Set GEONAMES_USERNAME environment variable.',
        )
        expect(mockFetch).not.toHaveBeenCalled()
      })
    })

    describe('200 with valid payload', () => {
      it('should return coordinates when API returns valid data', async () => {
        mockFetch.mockResolvedValueOnce(
          createSuccessResponse({
            geonames: [
              {
                lat: '41.9028',
                lng: '12.4964',
                name: 'Rome',
              },
            ],
          }),
        )

        const { fetchCoordinatesFromGeoNames } = await importGeoNames()
        const result = await fetchCoordinatesFromGeoNames({ city: 'Rome', nation: 'IT' })

        expect(result).toEqual({
          latitude: 41.9028,
          longitude: 12.4964,
        })
      })

      it('should construct correct URL with query parameters', async () => {
        mockFetch.mockResolvedValueOnce(
          createSuccessResponse({
            geonames: [{ lat: '41.9028', lng: '12.4964' }],
          }),
        )

        const { fetchCoordinatesFromGeoNames } = await importGeoNames()
        await fetchCoordinatesFromGeoNames({ city: 'Rome', nation: 'IT' })

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('https://secure.geonames.org/searchJSON?'),
          expect.any(Object),
        )
        const url = mockFetch.mock.calls[0]?.[0] as string
        expect(url).toContain('q=Rome%2C+IT')
        expect(url).toContain('maxRows=1')
        expect(url).toContain('username=test_user')
        expect(url).toContain('featureClass=P')
        expect(url).toContain('type=json')
      })

      it('should handle city-only queries', async () => {
        mockFetch.mockResolvedValueOnce(
          createSuccessResponse({
            geonames: [{ lat: '48.8566', lng: '2.3522' }],
          }),
        )

        const { fetchCoordinatesFromGeoNames } = await importGeoNames()
        const result = await fetchCoordinatesFromGeoNames({ city: 'Paris' })

        expect(result).toEqual({
          latitude: 48.8566,
          longitude: 2.3522,
        })
        const url = mockFetch.mock.calls[0]?.[0] as string
        expect(url).toContain('q=Paris')
        expect(url).not.toContain('%2C')
      })

      it('should pass signal for abort controller', async () => {
        mockFetch.mockResolvedValueOnce(
          createSuccessResponse({
            geonames: [{ lat: '41.9028', lng: '12.4964' }],
          }),
        )

        const controller = new AbortController()
        const { fetchCoordinatesFromGeoNames } = await importGeoNames()
        await fetchCoordinatesFromGeoNames({ city: 'Rome', signal: controller.signal })

        expect(mockFetch).toHaveBeenCalledWith(expect.any(String), { signal: controller.signal })
      })
    })

    describe('200 with empty payload', () => {
      it('should throw error when no results found', async () => {
        mockFetch.mockResolvedValueOnce(
          createSuccessResponse({
            geonames: [],
          }),
        )

        const { fetchCoordinatesFromGeoNames } = await importGeoNames()

        await expect(fetchCoordinatesFromGeoNames({ city: 'NonExistentCity12345' })).rejects.toThrow(
          'No matching location found',
        )
      })

      it('should throw error when geonames is undefined', async () => {
        mockFetch.mockResolvedValueOnce(createSuccessResponse({}))

        const { fetchCoordinatesFromGeoNames } = await importGeoNames()

        await expect(fetchCoordinatesFromGeoNames({ city: 'Rome' })).rejects.toThrow('No matching location found')
      })

      it('should throw error when response is null', async () => {
        mockFetch.mockResolvedValueOnce(createSuccessResponse(null))

        const { fetchCoordinatesFromGeoNames } = await importGeoNames()

        await expect(fetchCoordinatesFromGeoNames({ city: 'Rome' })).rejects.toThrow('No matching location found')
      })
    })

    describe('HTTP errors', () => {
      it('should throw error for 404 status', async () => {
        mockFetch.mockResolvedValueOnce(createErrorResponse(404))

        const { fetchCoordinatesFromGeoNames } = await importGeoNames()

        await expect(fetchCoordinatesFromGeoNames({ city: 'Rome' })).rejects.toThrow('GeoNames search failed: 404')
      })

      it('should throw error for 500 status', async () => {
        mockFetch.mockResolvedValueOnce(createErrorResponse(500))

        const { fetchCoordinatesFromGeoNames } = await importGeoNames()

        await expect(fetchCoordinatesFromGeoNames({ city: 'Rome' })).rejects.toThrow('GeoNames search failed: 500')
      })

      it('should throw error for 401 unauthorized', async () => {
        mockFetch.mockResolvedValueOnce(createErrorResponse(401))

        const { fetchCoordinatesFromGeoNames } = await importGeoNames()

        await expect(fetchCoordinatesFromGeoNames({ city: 'Rome' })).rejects.toThrow('GeoNames search failed: 401')
      })

      it('should throw error for 429 rate limit', async () => {
        mockFetch.mockResolvedValueOnce(createErrorResponse(429))

        const { fetchCoordinatesFromGeoNames } = await importGeoNames()

        await expect(fetchCoordinatesFromGeoNames({ city: 'Rome' })).rejects.toThrow('GeoNames search failed: 429')
      })
    })

    describe('Network errors', () => {
      it('should propagate network errors', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network failure'))

        const { fetchCoordinatesFromGeoNames } = await importGeoNames()

        await expect(fetchCoordinatesFromGeoNames({ city: 'Rome' })).rejects.toThrow('Network failure')
      })

      it('should handle AbortError', async () => {
        const abortError = new Error('Aborted')
        abortError.name = 'AbortError'
        mockFetch.mockRejectedValueOnce(abortError)

        const { fetchCoordinatesFromGeoNames } = await importGeoNames()

        await expect(fetchCoordinatesFromGeoNames({ city: 'Rome' })).rejects.toThrow('Aborted')
      })

      it('should handle DNS resolution errors', async () => {
        mockFetch.mockRejectedValueOnce(new Error('getaddrinfo ENOTFOUND secure.geonames.org'))

        const { fetchCoordinatesFromGeoNames } = await importGeoNames()

        await expect(fetchCoordinatesFromGeoNames({ city: 'Rome' })).rejects.toThrow(
          'getaddrinfo ENOTFOUND secure.geonames.org',
        )
      })
    })

    describe('Robust parsing', () => {
      it('should throw error for invalid latitude', async () => {
        mockFetch.mockResolvedValueOnce(
          createSuccessResponse({
            geonames: [{ lat: 'invalid', lng: '12.4964' }],
          }),
        )

        const { fetchCoordinatesFromGeoNames } = await importGeoNames()

        await expect(fetchCoordinatesFromGeoNames({ city: 'Rome' })).rejects.toThrow(
          'GeoNames returned invalid coordinates',
        )
      })

      it('should throw error for invalid longitude', async () => {
        mockFetch.mockResolvedValueOnce(
          createSuccessResponse({
            geonames: [{ lat: '41.9028', lng: 'invalid' }],
          }),
        )

        const { fetchCoordinatesFromGeoNames } = await importGeoNames()

        await expect(fetchCoordinatesFromGeoNames({ city: 'Rome' })).rejects.toThrow(
          'GeoNames returned invalid coordinates',
        )
      })

      it('should throw error for missing coordinates', async () => {
        mockFetch.mockResolvedValueOnce(
          createSuccessResponse({
            geonames: [{ name: 'Rome' }],
          }),
        )

        const { fetchCoordinatesFromGeoNames } = await importGeoNames()

        await expect(fetchCoordinatesFromGeoNames({ city: 'Rome' })).rejects.toThrow(
          'GeoNames returned invalid coordinates',
        )
      })

      it('should throw error when city is empty', async () => {
        const { fetchCoordinatesFromGeoNames } = await importGeoNames()

        await expect(fetchCoordinatesFromGeoNames({ city: '' })).rejects.toThrow(
          'City is required to search coordinates',
        )
        expect(mockFetch).not.toHaveBeenCalled()
      })

      it('should throw error when city is only whitespace', async () => {
        const { fetchCoordinatesFromGeoNames } = await importGeoNames()

        await expect(fetchCoordinatesFromGeoNames({ city: '   ' })).rejects.toThrow(
          'City is required to search coordinates',
        )
        expect(mockFetch).not.toHaveBeenCalled()
      })
    })
  })

  // ==========================================================================
  // fetchTimezoneFromGeoNames TESTS
  // ==========================================================================

  describe('fetchTimezoneFromGeoNames', () => {
    describe('GEONAMES_USERNAME missing', () => {
      it('should throw error when GEONAMES_USERNAME is not set', async () => {
        delete process.env.GEONAMES_USERNAME

        const { fetchTimezoneFromGeoNames } = await importGeoNames()

        await expect(fetchTimezoneFromGeoNames({ latitude: 41.9028, longitude: 12.4964 })).rejects.toThrow(
          'GeoNames username not configured. Set GEONAMES_USERNAME environment variable.',
        )
        expect(mockFetch).not.toHaveBeenCalled()
      })
    })

    describe('200 with valid payload', () => {
      it('should return timezone when API returns timezoneId', async () => {
        mockFetch.mockResolvedValueOnce(
          createSuccessResponse({
            timezoneId: 'Europe/Rome',
          }),
        )

        const { fetchTimezoneFromGeoNames } = await importGeoNames()
        const result = await fetchTimezoneFromGeoNames({ latitude: 41.9028, longitude: 12.4964 })

        expect(result).toBe('Europe/Rome')
      })

      it('should return timezone when API returns timezone field', async () => {
        mockFetch.mockResolvedValueOnce(
          createSuccessResponse({
            timezone: 'America/New_York',
          }),
        )

        const { fetchTimezoneFromGeoNames } = await importGeoNames()
        const result = await fetchTimezoneFromGeoNames({ latitude: 40.7128, longitude: -74.006 })

        expect(result).toBe('America/New_York')
      })

      it('should return timezone when API returns tzId field', async () => {
        mockFetch.mockResolvedValueOnce(
          createSuccessResponse({
            tzId: 'Asia/Tokyo',
          }),
        )

        const { fetchTimezoneFromGeoNames } = await importGeoNames()
        const result = await fetchTimezoneFromGeoNames({ latitude: 35.6762, longitude: 139.6503 })

        expect(result).toBe('Asia/Tokyo')
      })

      it('should construct correct URL with query parameters', async () => {
        mockFetch.mockResolvedValueOnce(
          createSuccessResponse({
            timezoneId: 'Europe/Rome',
          }),
        )

        const { fetchTimezoneFromGeoNames } = await importGeoNames()
        await fetchTimezoneFromGeoNames({ latitude: 41.9028, longitude: 12.4964 })

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('https://secure.geonames.org/timezoneJSON?'),
          expect.any(Object),
        )
        const url = mockFetch.mock.calls[0]?.[0] as string
        expect(url).toContain('lat=41.9028')
        expect(url).toContain('lng=12.4964')
        expect(url).toContain('username=test_user')
      })

      it('should pass signal for abort controller', async () => {
        mockFetch.mockResolvedValueOnce(
          createSuccessResponse({
            timezoneId: 'Europe/Rome',
          }),
        )

        const controller = new AbortController()
        const { fetchTimezoneFromGeoNames } = await importGeoNames()
        await fetchTimezoneFromGeoNames({
          latitude: 41.9028,
          longitude: 12.4964,
          signal: controller.signal,
        })

        expect(mockFetch).toHaveBeenCalledWith(expect.any(String), { signal: controller.signal })
      })
    })

    describe('200 with empty/invalid payload', () => {
      it('should throw error when no timezone found', async () => {
        mockFetch.mockResolvedValueOnce(createSuccessResponse({}))

        const { fetchTimezoneFromGeoNames } = await importGeoNames()

        await expect(fetchTimezoneFromGeoNames({ latitude: 41.9028, longitude: 12.4964 })).rejects.toThrow(
          'No timezone found for these coordinates',
        )
      })

      it('should throw error when timezone is empty string', async () => {
        mockFetch.mockResolvedValueOnce(
          createSuccessResponse({
            timezoneId: '',
          }),
        )

        const { fetchTimezoneFromGeoNames } = await importGeoNames()

        await expect(fetchTimezoneFromGeoNames({ latitude: 41.9028, longitude: 12.4964 })).rejects.toThrow(
          'No timezone found for these coordinates',
        )
      })

      it('should throw error when timezone is not a string', async () => {
        mockFetch.mockResolvedValueOnce(
          createSuccessResponse({
            timezoneId: 12345,
          }),
        )

        const { fetchTimezoneFromGeoNames } = await importGeoNames()

        await expect(fetchTimezoneFromGeoNames({ latitude: 41.9028, longitude: 12.4964 })).rejects.toThrow(
          'No timezone found for these coordinates',
        )
      })

      it('should throw error when response is null', async () => {
        mockFetch.mockResolvedValueOnce(createSuccessResponse(null))

        const { fetchTimezoneFromGeoNames } = await importGeoNames()

        await expect(fetchTimezoneFromGeoNames({ latitude: 41.9028, longitude: 12.4964 })).rejects.toThrow(
          'No timezone found for these coordinates',
        )
      })
    })

    describe('HTTP errors', () => {
      it('should throw error for 404 status', async () => {
        mockFetch.mockResolvedValueOnce(createErrorResponse(404))

        const { fetchTimezoneFromGeoNames } = await importGeoNames()

        await expect(fetchTimezoneFromGeoNames({ latitude: 41.9028, longitude: 12.4964 })).rejects.toThrow(
          'GeoNames timezone lookup failed: 404',
        )
      })

      it('should throw error for 500 status', async () => {
        mockFetch.mockResolvedValueOnce(createErrorResponse(500))

        const { fetchTimezoneFromGeoNames } = await importGeoNames()

        await expect(fetchTimezoneFromGeoNames({ latitude: 41.9028, longitude: 12.4964 })).rejects.toThrow(
          'GeoNames timezone lookup failed: 500',
        )
      })

      it('should throw error for 401 unauthorized', async () => {
        mockFetch.mockResolvedValueOnce(createErrorResponse(401))

        const { fetchTimezoneFromGeoNames } = await importGeoNames()

        await expect(fetchTimezoneFromGeoNames({ latitude: 41.9028, longitude: 12.4964 })).rejects.toThrow(
          'GeoNames timezone lookup failed: 401',
        )
      })
    })

    describe('Network errors', () => {
      it('should propagate network errors', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network failure'))

        const { fetchTimezoneFromGeoNames } = await importGeoNames()

        await expect(fetchTimezoneFromGeoNames({ latitude: 41.9028, longitude: 12.4964 })).rejects.toThrow(
          'Network failure',
        )
      })

      it('should handle connection timeout', async () => {
        mockFetch.mockRejectedValueOnce(new Error('ETIMEDOUT'))

        const { fetchTimezoneFromGeoNames } = await importGeoNames()

        await expect(fetchTimezoneFromGeoNames({ latitude: 41.9028, longitude: 12.4964 })).rejects.toThrow('ETIMEDOUT')
      })
    })
  })

  // ==========================================================================
  // fetchGeoNamesLocation TESTS
  // ==========================================================================

  describe('fetchGeoNamesLocation', () => {
    describe('successful chaining', () => {
      it('should return coordinates and timezone when both succeed', async () => {
        // First call for coordinates
        mockFetch.mockResolvedValueOnce(
          createSuccessResponse({
            geonames: [{ lat: '41.9028', lng: '12.4964' }],
          }),
        )
        // Second call for timezone
        mockFetch.mockResolvedValueOnce(
          createSuccessResponse({
            timezoneId: 'Europe/Rome',
          }),
        )

        const { fetchGeoNamesLocation } = await importGeoNames()
        const result = await fetchGeoNamesLocation({ city: 'Rome', nation: 'IT' })

        expect(result).toEqual({
          latitude: 41.9028,
          longitude: 12.4964,
          timezone: 'Europe/Rome',
        })
        expect(mockFetch).toHaveBeenCalledTimes(2)
      })

      it('should pass signal to both requests', async () => {
        mockFetch.mockResolvedValueOnce(
          createSuccessResponse({
            geonames: [{ lat: '41.9028', lng: '12.4964' }],
          }),
        )
        mockFetch.mockResolvedValueOnce(
          createSuccessResponse({
            timezoneId: 'Europe/Rome',
          }),
        )

        const controller = new AbortController()
        const { fetchGeoNamesLocation } = await importGeoNames()
        await fetchGeoNamesLocation({ city: 'Rome', signal: controller.signal })

        expect(mockFetch).toHaveBeenNthCalledWith(1, expect.any(String), { signal: controller.signal })
        expect(mockFetch).toHaveBeenNthCalledWith(2, expect.any(String), { signal: controller.signal })
      })
    })

    describe('error propagation', () => {
      it('should throw error when coordinates lookup fails', async () => {
        mockFetch.mockResolvedValueOnce(createErrorResponse(500))

        const { fetchGeoNamesLocation } = await importGeoNames()

        await expect(fetchGeoNamesLocation({ city: 'Rome' })).rejects.toThrow('GeoNames search failed: 500')
      })

      it('should throw error when timezone lookup fails', async () => {
        mockFetch.mockResolvedValueOnce(
          createSuccessResponse({
            geonames: [{ lat: '41.9028', lng: '12.4964' }],
          }),
        )
        mockFetch.mockResolvedValueOnce(createErrorResponse(500))

        const { fetchGeoNamesLocation } = await importGeoNames()

        await expect(fetchGeoNamesLocation({ city: 'Rome' })).rejects.toThrow('GeoNames timezone lookup failed: 500')
      })

      it('should throw error when no location found', async () => {
        mockFetch.mockResolvedValueOnce(
          createSuccessResponse({
            geonames: [],
          }),
        )

        const { fetchGeoNamesLocation } = await importGeoNames()

        await expect(fetchGeoNamesLocation({ city: 'NonExistentPlace' })).rejects.toThrow('No matching location found')
      })
    })
  })

  // ==========================================================================
  // fetchCitySuggestions TESTS
  // ==========================================================================

  describe('fetchCitySuggestions', () => {
    describe('short input handling', () => {
      it('should return empty array for single character input', async () => {
        const { fetchCitySuggestions } = await importGeoNames()
        const result = await fetchCitySuggestions('R')

        expect(result).toEqual([])
        expect(mockFetch).not.toHaveBeenCalled()
      })

      it('should return empty array for empty string', async () => {
        const { fetchCitySuggestions } = await importGeoNames()
        const result = await fetchCitySuggestions('')

        expect(result).toEqual([])
        expect(mockFetch).not.toHaveBeenCalled()
      })

      it('should return empty array for whitespace-only input', async () => {
        const { fetchCitySuggestions } = await importGeoNames()
        const result = await fetchCitySuggestions('   ')

        expect(result).toEqual([])
        expect(mockFetch).not.toHaveBeenCalled()
      })

      it('should search when trimmed input has 2+ characters', async () => {
        mockFetch.mockResolvedValueOnce(
          createSuccessResponse({
            geonames: [{ lat: '41.9028', lng: '12.4964', name: 'Rome' }],
          }),
        )

        const { fetchCitySuggestions } = await importGeoNames()
        const result = await fetchCitySuggestions('Ro')

        expect(result).toHaveLength(1)
        expect(mockFetch).toHaveBeenCalled()
      })
    })

    describe('200 with valid payload', () => {
      it('should return array of suggestions', async () => {
        mockFetch.mockResolvedValueOnce(
          createSuccessResponse({
            geonames: [
              {
                lat: '41.9028',
                lng: '12.4964',
                name: 'Rome',
                adminName1: 'Lazio',
                countryCode: 'IT',
                countryName: 'Italy',
              },
              {
                lat: '44.4258',
                lng: '26.1025',
                name: 'Bucharest',
                adminName1: 'Bucharest',
                countryCode: 'RO',
                countryName: 'Romania',
              },
            ],
          }),
        )

        const { fetchCitySuggestions } = await importGeoNames()
        const result = await fetchCitySuggestions('Rome')

        expect(result).toHaveLength(2)
        expect(result[0]).toEqual({
          name: 'Rome',
          adminName: 'Lazio',
          countryCode: 'IT',
          countryName: 'Italy',
          latitude: 41.9028,
          longitude: 12.4964,
        })
      })

      it('should construct correct URL with maxRows=6', async () => {
        mockFetch.mockResolvedValueOnce(
          createSuccessResponse({
            geonames: [],
          }),
        )

        const { fetchCitySuggestions } = await importGeoNames()
        await fetchCitySuggestions('Rome')

        const url = mockFetch.mock.calls[0]?.[0] as string
        expect(url).toContain('maxRows=6')
        expect(url).toContain('featureClass=P')
        expect(url).toContain('q=Rome')
      })

      it('should include country filter when nation provided', async () => {
        mockFetch.mockResolvedValueOnce(
          createSuccessResponse({
            geonames: [],
          }),
        )

        const { fetchCitySuggestions } = await importGeoNames()
        await fetchCitySuggestions('Rome', 'IT')

        const url = mockFetch.mock.calls[0]?.[0] as string
        expect(url).toContain('country=IT')
      })

      it('should pass signal for abort controller', async () => {
        mockFetch.mockResolvedValueOnce(
          createSuccessResponse({
            geonames: [],
          }),
        )

        const controller = new AbortController()
        const { fetchCitySuggestions } = await importGeoNames()
        await fetchCitySuggestions('Rome', null, controller.signal)

        expect(mockFetch).toHaveBeenCalledWith(expect.any(String), { signal: controller.signal })
      })
    })

    describe('200 with empty payload', () => {
      it('should return empty array when no results', async () => {
        mockFetch.mockResolvedValueOnce(
          createSuccessResponse({
            geonames: [],
          }),
        )

        const { fetchCitySuggestions } = await importGeoNames()
        const result = await fetchCitySuggestions('NonExistentCity12345')

        expect(result).toEqual([])
      })

      it('should return empty array when geonames is undefined', async () => {
        mockFetch.mockResolvedValueOnce(createSuccessResponse({}))

        const { fetchCitySuggestions } = await importGeoNames()
        const result = await fetchCitySuggestions('Rome')

        expect(result).toEqual([])
      })

      it('should return empty array when geonames is not an array', async () => {
        mockFetch.mockResolvedValueOnce(
          createSuccessResponse({
            geonames: 'not an array',
          }),
        )

        const { fetchCitySuggestions } = await importGeoNames()
        const result = await fetchCitySuggestions('Rome')

        expect(result).toEqual([])
      })
    })

    describe('Filtering invalid coordinates', () => {
      it('should filter out items with invalid latitude', async () => {
        mockFetch.mockResolvedValueOnce(
          createSuccessResponse({
            geonames: [
              { lat: 'invalid', lng: '12.4964', name: 'Bad' },
              { lat: '41.9028', lng: '12.4964', name: 'Good' },
            ],
          }),
        )

        const { fetchCitySuggestions } = await importGeoNames()
        const result = await fetchCitySuggestions('Rome')

        expect(result).toHaveLength(1)
        expect(result[0]?.name).toBe('Good')
      })

      it('should filter out items with invalid longitude', async () => {
        mockFetch.mockResolvedValueOnce(
          createSuccessResponse({
            geonames: [
              { lat: '41.9028', lng: 'invalid', name: 'Bad' },
              { lat: '41.9028', lng: '12.4964', name: 'Good' },
            ],
          }),
        )

        const { fetchCitySuggestions } = await importGeoNames()
        const result = await fetchCitySuggestions('Rome')

        expect(result).toHaveLength(1)
        expect(result[0]?.name).toBe('Good')
      })

      it('should filter out items with missing coordinates', async () => {
        mockFetch.mockResolvedValueOnce(
          createSuccessResponse({
            geonames: [{ name: 'Bad' }, { lat: '41.9028', lng: '12.4964', name: 'Good' }],
          }),
        )

        const { fetchCitySuggestions } = await importGeoNames()
        const result = await fetchCitySuggestions('Rome')

        expect(result).toHaveLength(1)
        expect(result[0]?.name).toBe('Good')
      })

      it('should return empty array when all items have invalid coordinates', async () => {
        mockFetch.mockResolvedValueOnce(
          createSuccessResponse({
            geonames: [{ lat: 'invalid', lng: 'invalid', name: 'Bad1' }, { name: 'Bad2' }],
          }),
        )

        const { fetchCitySuggestions } = await importGeoNames()
        const result = await fetchCitySuggestions('Rome')

        expect(result).toEqual([])
      })
    })

    describe('HTTP errors', () => {
      it('should throw error for 404 status', async () => {
        mockFetch.mockResolvedValueOnce(createErrorResponse(404))

        const { fetchCitySuggestions } = await importGeoNames()

        await expect(fetchCitySuggestions('Rome')).rejects.toThrow('GeoNames city lookup failed: 404')
      })

      it('should throw error for 500 status', async () => {
        mockFetch.mockResolvedValueOnce(createErrorResponse(500))

        const { fetchCitySuggestions } = await importGeoNames()

        await expect(fetchCitySuggestions('Rome')).rejects.toThrow('GeoNames city lookup failed: 500')
      })
    })

    describe('Network errors', () => {
      it('should propagate network errors', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network failure'))

        const { fetchCitySuggestions } = await importGeoNames()

        await expect(fetchCitySuggestions('Rome')).rejects.toThrow('Network failure')
      })
    })

    describe('GEONAMES_USERNAME missing', () => {
      it('should throw error when GEONAMES_USERNAME is not set', async () => {
        delete process.env.GEONAMES_USERNAME

        const { fetchCitySuggestions } = await importGeoNames()

        await expect(fetchCitySuggestions('Rome')).rejects.toThrow(
          'GeoNames username not configured. Set GEONAMES_USERNAME environment variable.',
        )
        expect(mockFetch).not.toHaveBeenCalled()
      })
    })
  })
})
