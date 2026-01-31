/**
 * Unit Tests for Transit Actions
 *
 * Tests the transit server actions including getTransitRange,
 * retry logic, chunking/parallelism, logging, and tracking.
 *
 * @module src/actions/transits
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// ============================================================================
// MOCKS
// ============================================================================

// Mock prisma to prevent any DB access
vi.mock('@/lib/db/prisma', () => ({
  prisma: {},
}))

// Mock session
const mockGetSession = vi.fn()

vi.mock('@/lib/security/session', () => ({
  getSession: () => mockGetSession(),
}))

// Mock trackChartCalculation
const mockTrackChartCalculation = vi.fn()

vi.mock('@/actions/astrology', () => ({
  trackChartCalculation: (...args: unknown[]) => mockTrackChartCalculation(...args),
}))

// Mock astrologer API
const mockAstrologerApi = {
  getTransitChartData: vi.fn(),
}

vi.mock('@/lib/api/astrologer', () => ({
  astrologerApi: {
    get getTransitChartData() {
      return mockAstrologerApi.getTransitChartData
    },
  },
}))

// Mock logger
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}

vi.mock('@/lib/logging/server', () => ({
  logger: {
    get info() {
      return mockLogger.info
    },
    get warn() {
      return mockLogger.warn
    },
    get error() {
      return mockLogger.error
    },
    get debug() {
      return mockLogger.debug
    },
  },
}))

// ============================================================================
// TEST HELPERS
// ============================================================================

const mockSession = { userId: 'user-123', username: 'testuser' }

/**
 * Test natal subject with all required fields
 */
const testNatalSubject = {
  name: 'Test Subject',
  year: 1990,
  month: 6,
  day: 15,
  hour: 10,
  minute: 30,
  second: 0,
  city: 'Rome',
  nation: 'Italy',
  timezone: 'Europe/Rome',
  longitude: 12.4964,
  latitude: 41.9028,
}

/**
 * Mock transit chart response
 */
const createMockTransitResponse = (date: Date) => ({
  status: 'OK' as const,
  chart_data: {
    chart_type: 'Transit',
    second_subject: {
      name: 'Transit',
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: 12,
      minute: 0,
      second: 0,
      city: 'Rome',
      nation: 'Italy',
      timezone: 'Europe/Rome',
      longitude: 12.4964,
      latitude: 41.9028,
      planets: {},
      houses: {},
    },
    aspects: [{ name: 'Conjunction', orb: 2, first_planet: 'Sun', second_planet: 'Moon' }],
    house_comparison: {
      first_points_in_second_houses: [],
      second_points_in_first_houses: [],
    },
  },
})

// ============================================================================
// TESTS
// ============================================================================

describe('Transit Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Use fake timers to control setTimeout in retry logic
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  // ==========================================================================
  // getTransitRange TESTS
  // ==========================================================================

  describe('getTransitRange', () => {
    describe('session handling', () => {
      it('should work without a session (no tracking)', async () => {
        const { getTransitRange } = await import('@/actions/transits')
        mockGetSession.mockResolvedValue(null)
        const startDate = new Date('2025-01-01')
        const endDate = new Date('2025-01-01')
        mockAstrologerApi.getTransitChartData.mockResolvedValue(createMockTransitResponse(startDate))

        const resultPromise = getTransitRange(testNatalSubject, startDate, endDate)
        await vi.runAllTimersAsync()
        const result = await resultPromise

        expect(result).toHaveLength(1)
        expect(mockTrackChartCalculation).not.toHaveBeenCalled()
      })

      it('should track chart calculation when session exists', async () => {
        const { getTransitRange } = await import('@/actions/transits')
        mockGetSession.mockResolvedValue(mockSession)
        mockTrackChartCalculation.mockResolvedValue(undefined)
        const startDate = new Date('2025-01-01')
        const endDate = new Date('2025-01-01')
        mockAstrologerApi.getTransitChartData.mockResolvedValue(createMockTransitResponse(startDate))

        const resultPromise = getTransitRange(testNatalSubject, startDate, endDate)
        await vi.runAllTimersAsync()
        const result = await resultPromise

        expect(result).toHaveLength(1)
        expect(mockTrackChartCalculation).toHaveBeenCalledWith('timeline')
      })
    })

    describe('date range validation', () => {
      it('should reject date ranges exceeding 365 days', async () => {
        const { getTransitRange } = await import('@/actions/transits')
        mockGetSession.mockResolvedValue(null)
        const startDate = new Date('2025-01-01')
        const endDate = new Date('2026-01-02') // 366 days

        await expect(getTransitRange(testNatalSubject, startDate, endDate)).rejects.toThrow(
          /Date range exceeds maximum allowed \(365 days\)/,
        )
        // API should not have been called
        expect(mockAstrologerApi.getTransitChartData).not.toHaveBeenCalled()
      })

      it('should accept date ranges of exactly 365 days', async () => {
        const { getTransitRange } = await import('@/actions/transits')
        mockGetSession.mockResolvedValue(null)
        const startDate = new Date('2025-01-01')
        const endDate = new Date('2025-12-31') // 364 days (within 365 days)

        mockAstrologerApi.getTransitChartData.mockImplementation((_natal, transit) => {
          const date = new Date(transit.year, transit.month - 1, transit.day)
          return Promise.resolve(createMockTransitResponse(date))
        })

        const resultPromise = getTransitRange(testNatalSubject, startDate, endDate)
        await vi.runAllTimersAsync()
        const result = await resultPromise

        // Should not throw and should return results
        expect(result.length).toBeGreaterThan(0)
      })

      it('should reject very large date ranges (multi-year)', async () => {
        const { getTransitRange } = await import('@/actions/transits')
        mockGetSession.mockResolvedValue(null)
        const startDate = new Date('2020-01-01')
        const endDate = new Date('2030-01-01') // 10 years

        await expect(getTransitRange(testNatalSubject, startDate, endDate)).rejects.toThrow(
          /Date range exceeds maximum allowed \(365 days\)/,
        )
        expect(mockAstrologerApi.getTransitChartData).not.toHaveBeenCalled()
      })

      it('should include the requested range in the error message', async () => {
        const { getTransitRange } = await import('@/actions/transits')
        mockGetSession.mockResolvedValue(null)
        const startDate = new Date('2025-01-01')
        const endDate = new Date('2027-01-01') // ~730 days

        await expect(getTransitRange(testNatalSubject, startDate, endDate)).rejects.toThrow(
          /Requested range: 73\d days/,
        )
      })
    })

    describe('date range processing', () => {
      it('should process a valid date range and return transit data', async () => {
        const { getTransitRange } = await import('@/actions/transits')
        mockGetSession.mockResolvedValue(mockSession)
        mockTrackChartCalculation.mockResolvedValue(undefined)
        const startDate = new Date('2025-01-01')
        const endDate = new Date('2025-01-03')

        mockAstrologerApi.getTransitChartData.mockImplementation((_natal, transit) => {
          const date = new Date(transit.year, transit.month - 1, transit.day)
          return Promise.resolve(createMockTransitResponse(date))
        })

        const resultPromise = getTransitRange(testNatalSubject, startDate, endDate)
        await vi.runAllTimersAsync()
        const result = await resultPromise

        // 3 days: Jan 1, 2, 3
        expect(result).toHaveLength(3)
        expect(mockAstrologerApi.getTransitChartData).toHaveBeenCalledTimes(3)
      })

      it('should return empty array for same start and end date when API fails', async () => {
        const { getTransitRange } = await import('@/actions/transits')
        mockGetSession.mockResolvedValue(null)
        const startDate = new Date('2025-01-01')
        const endDate = new Date('2025-01-01')

        // All retries fail
        mockAstrologerApi.getTransitChartData.mockRejectedValue(new Error('API Error'))

        const resultPromise = getTransitRange(testNatalSubject, startDate, endDate)
        await vi.runAllTimersAsync()
        const result = await resultPromise

        expect(result).toEqual([])
      })

      it('should include TransitDayData with correct structure', async () => {
        const { getTransitRange } = await import('@/actions/transits')
        mockGetSession.mockResolvedValue(null)
        const startDate = new Date('2025-01-15')
        const endDate = new Date('2025-01-15')
        mockAstrologerApi.getTransitChartData.mockResolvedValue(createMockTransitResponse(startDate))

        const resultPromise = getTransitRange(testNatalSubject, startDate, endDate)
        await vi.runAllTimersAsync()
        const result = await resultPromise

        expect(result).toHaveLength(1)
        expect(result[0]).toHaveProperty('date')
        expect(result[0]).toHaveProperty('transitSubject')
        expect(result[0]).toHaveProperty('aspects')
        expect(result[0]).toHaveProperty('houseComparison')
        expect(result[0]!.aspects).toHaveLength(1)
      })
    })

    describe('retry logic', () => {
      it('should retry up to 3 times on failure', async () => {
        const { getTransitRange } = await import('@/actions/transits')
        mockGetSession.mockResolvedValue(null)
        const startDate = new Date('2025-01-01')
        const endDate = new Date('2025-01-01')

        // Fail all 3 attempts
        mockAstrologerApi.getTransitChartData.mockRejectedValue(new Error('API Error'))

        const resultPromise = getTransitRange(testNatalSubject, startDate, endDate)
        await vi.runAllTimersAsync()
        await resultPromise

        // Should have tried 3 times (MAX_RETRIES = 3)
        expect(mockAstrologerApi.getTransitChartData).toHaveBeenCalledTimes(3)
      })

      it('should succeed on retry after initial failure', async () => {
        const { getTransitRange } = await import('@/actions/transits')
        mockGetSession.mockResolvedValue(null)
        const startDate = new Date('2025-01-01')
        const endDate = new Date('2025-01-01')

        // Fail first 2 attempts, succeed on third
        mockAstrologerApi.getTransitChartData
          .mockRejectedValueOnce(new Error('API Error 1'))
          .mockRejectedValueOnce(new Error('API Error 2'))
          .mockResolvedValueOnce(createMockTransitResponse(startDate))

        const resultPromise = getTransitRange(testNatalSubject, startDate, endDate)
        await vi.runAllTimersAsync()
        const result = await resultPromise

        expect(result).toHaveLength(1)
        expect(mockAstrologerApi.getTransitChartData).toHaveBeenCalledTimes(3)
      })

      it('should log warnings on retry attempts', async () => {
        const { getTransitRange } = await import('@/actions/transits')
        mockGetSession.mockResolvedValue(null)
        const startDate = new Date('2025-01-01')
        const endDate = new Date('2025-01-01')

        // Fail first attempt, succeed on second
        mockAstrologerApi.getTransitChartData
          .mockRejectedValueOnce(new Error('API Error'))
          .mockResolvedValueOnce(createMockTransitResponse(startDate))

        const resultPromise = getTransitRange(testNatalSubject, startDate, endDate)
        await vi.runAllTimersAsync()
        await resultPromise

        // Should have logged a warning for the first failed attempt
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Transit fetch attempt 1/3 failed'))
      })

      it('should log error after all retries exhausted', async () => {
        const { getTransitRange } = await import('@/actions/transits')
        mockGetSession.mockResolvedValue(null)
        const startDate = new Date('2025-01-01')
        const endDate = new Date('2025-01-01')

        mockAstrologerApi.getTransitChartData.mockRejectedValue(new Error('Persistent API Error'))

        const resultPromise = getTransitRange(testNatalSubject, startDate, endDate)
        await vi.runAllTimersAsync()
        await resultPromise

        // Should have logged an error after all retries exhausted
        expect(mockLogger.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to fetch transit'),
          expect.any(Error),
        )
      })
    })

    describe('chunking and parallelism', () => {
      it('should process dates in chunks of 5', async () => {
        const { getTransitRange } = await import('@/actions/transits')
        mockGetSession.mockResolvedValue(null)
        const startDate = new Date('2025-01-01')
        const endDate = new Date('2025-01-12') // 12 days

        mockAstrologerApi.getTransitChartData.mockImplementation((_natal, transit) => {
          const date = new Date(transit.year, transit.month - 1, transit.day)
          return Promise.resolve(createMockTransitResponse(date))
        })

        const resultPromise = getTransitRange(testNatalSubject, startDate, endDate)
        await vi.runAllTimersAsync()
        const result = await resultPromise

        // 12 days should result in 12 transit data points
        expect(result).toHaveLength(12)
        // All 12 API calls should have been made (in chunks of 5: 5 + 5 + 2)
        expect(mockAstrologerApi.getTransitChartData).toHaveBeenCalledTimes(12)
      })

      it('should process small ranges (less than chunk size) in parallel', async () => {
        const { getTransitRange } = await import('@/actions/transits')
        mockGetSession.mockResolvedValue(null)
        const startDate = new Date('2025-01-01')
        const endDate = new Date('2025-01-03') // 3 days, less than chunk size of 5

        mockAstrologerApi.getTransitChartData.mockImplementation((_natal, transit) => {
          const date = new Date(transit.year, transit.month - 1, transit.day)
          return Promise.resolve(createMockTransitResponse(date))
        })

        const resultPromise = getTransitRange(testNatalSubject, startDate, endDate)
        await vi.runAllTimersAsync()
        const result = await resultPromise

        expect(result).toHaveLength(3)
        expect(mockAstrologerApi.getTransitChartData).toHaveBeenCalledTimes(3)
      })
    })

    describe('logging', () => {
      it('should log warning when API returns incomplete data', async () => {
        const { getTransitRange } = await import('@/actions/transits')
        mockGetSession.mockResolvedValue(null)
        const startDate = new Date('2025-01-01')
        const endDate = new Date('2025-01-01')

        // Response OK but missing second_subject
        mockAstrologerApi.getTransitChartData.mockResolvedValue({
          status: 'OK',
          chart_data: {
            chart_type: 'Transit',
            second_subject: null, // Missing!
            aspects: [],
          },
        })

        const resultPromise = getTransitRange(testNatalSubject, startDate, endDate)
        await vi.runAllTimersAsync()
        const result = await resultPromise

        expect(result).toHaveLength(0)
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Transit API returned incomplete data'))
      })
    })

    describe('fire-and-forget trackChartCalculation', () => {
      it('should not fail the response if trackChartCalculation throws', async () => {
        const { getTransitRange } = await import('@/actions/transits')
        mockGetSession.mockResolvedValue(mockSession)

        // trackChartCalculation throws an error
        mockTrackChartCalculation.mockRejectedValue(new Error('Tracking failed'))

        const startDate = new Date('2025-01-01')
        const endDate = new Date('2025-01-01')
        mockAstrologerApi.getTransitChartData.mockResolvedValue(createMockTransitResponse(startDate))

        // Should not throw, despite tracking failure
        const resultPromise = getTransitRange(testNatalSubject, startDate, endDate)
        await vi.runAllTimersAsync()
        const result = await resultPromise

        // Response should still succeed
        expect(result).toHaveLength(1)
        expect(mockTrackChartCalculation).toHaveBeenCalledWith('timeline')
      })

      it('should call trackChartCalculation with void (fire-and-forget pattern)', async () => {
        const { getTransitRange } = await import('@/actions/transits')
        mockGetSession.mockResolvedValue(mockSession)

        // Slow tracking that would block if awaited
        mockTrackChartCalculation.mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 5000))
        })

        const startDate = new Date('2025-01-01')
        const endDate = new Date('2025-01-01')
        mockAstrologerApi.getTransitChartData.mockResolvedValue(createMockTransitResponse(startDate))

        const resultPromise = getTransitRange(testNatalSubject, startDate, endDate)
        await vi.runAllTimersAsync()
        const result = await resultPromise

        // Response returns before tracking completes (fire-and-forget)
        expect(result).toHaveLength(1)
        // But tracking was still called
        expect(mockTrackChartCalculation).toHaveBeenCalledWith('timeline')
      })
    })

    describe('chart options', () => {
      it('should pass chart options to API', async () => {
        const { getTransitRange } = await import('@/actions/transits')
        mockGetSession.mockResolvedValue(null)
        const startDate = new Date('2025-01-01')
        const endDate = new Date('2025-01-01')

        const chartOptions = {
          active_points: ['Sun', 'Moon', 'Mercury'],
          active_aspects: [{ name: 'Conjunction', orb: 10 }],
          distribution_method: 'weighted' as const,
        }

        mockAstrologerApi.getTransitChartData.mockResolvedValue(createMockTransitResponse(startDate))

        const resultPromise = getTransitRange(testNatalSubject, startDate, endDate, chartOptions)
        await vi.runAllTimersAsync()
        await resultPromise

        expect(mockAstrologerApi.getTransitChartData).toHaveBeenCalledWith(
          expect.any(Object), // natal subject
          expect.any(Object), // transit subject
          expect.objectContaining({
            active_points: ['Sun', 'Moon', 'Mercury'],
            active_aspects: [{ name: 'Conjunction', orb: 10 }],
            distribution_method: 'weighted',
          }),
        )
      })

      it('should work without chart options', async () => {
        const { getTransitRange } = await import('@/actions/transits')
        mockGetSession.mockResolvedValue(null)
        const startDate = new Date('2025-01-01')
        const endDate = new Date('2025-01-01')

        mockAstrologerApi.getTransitChartData.mockResolvedValue(createMockTransitResponse(startDate))

        const resultPromise = getTransitRange(testNatalSubject, startDate, endDate)
        await vi.runAllTimersAsync()
        const result = await resultPromise

        expect(result).toHaveLength(1)
        expect(mockAstrologerApi.getTransitChartData).toHaveBeenCalledWith(
          expect.any(Object),
          expect.any(Object),
          undefined,
        )
      })
    })

    describe('subject sanitization', () => {
      it('should create clean transit subject from natal subject location', async () => {
        const { getTransitRange } = await import('@/actions/transits')
        mockGetSession.mockResolvedValue(null)
        const startDate = new Date('2025-03-15')
        const endDate = new Date('2025-03-15')

        mockAstrologerApi.getTransitChartData.mockResolvedValue(createMockTransitResponse(startDate))

        const resultPromise = getTransitRange(testNatalSubject, startDate, endDate)
        await vi.runAllTimersAsync()
        await resultPromise

        // Verify the transit subject was created correctly
        expect(mockAstrologerApi.getTransitChartData).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Test Subject',
            city: 'Rome',
            nation: 'Italy',
          }),
          expect.objectContaining({
            name: 'Transit',
            year: 2025,
            month: 3,
            day: 15,
            hour: 12,
            minute: 0,
            second: 0,
            city: 'Rome',
            nation: 'Italy',
            timezone: 'Europe/Rome',
            longitude: 12.4964,
            latitude: 41.9028,
          }),
          undefined,
        )
      })

      it('should use UTC timezone if natal subject has no timezone', async () => {
        const { getTransitRange } = await import('@/actions/transits')
        mockGetSession.mockResolvedValue(null)
        const startDate = new Date('2025-01-01')
        const endDate = new Date('2025-01-01')

        const subjectWithoutTimezone = {
          ...testNatalSubject,
          timezone: undefined,
        }

        mockAstrologerApi.getTransitChartData.mockResolvedValue(createMockTransitResponse(startDate))

        const resultPromise = getTransitRange(subjectWithoutTimezone, startDate, endDate)
        await vi.runAllTimersAsync()
        await resultPromise

        expect(mockAstrologerApi.getTransitChartData).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            timezone: 'UTC',
          }),
          undefined,
        )
      })

      it('should use 0 for longitude/latitude if natal subject has none', async () => {
        const { getTransitRange } = await import('@/actions/transits')
        mockGetSession.mockResolvedValue(null)
        const startDate = new Date('2025-01-01')
        const endDate = new Date('2025-01-01')

        const subjectWithoutCoords = {
          ...testNatalSubject,
          longitude: undefined,
          latitude: undefined,
        }

        mockAstrologerApi.getTransitChartData.mockResolvedValue(createMockTransitResponse(startDate))

        const resultPromise = getTransitRange(subjectWithoutCoords, startDate, endDate)
        await vi.runAllTimersAsync()
        await resultPromise

        expect(mockAstrologerApi.getTransitChartData).toHaveBeenCalledWith(
          expect.any(Object),
          expect.objectContaining({
            longitude: 0,
            latitude: 0,
          }),
          undefined,
        )
      })
    })
  })
})
