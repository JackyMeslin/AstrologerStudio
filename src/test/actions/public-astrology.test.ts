/**
 * Unit Tests for Public Astrology Actions
 *
 * Tests the public astrology server actions for unauthenticated users,
 * including rate limiting, IP extraction, and default preferences.
 *
 * @module src/actions/public-astrology
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// ============================================================================
// MOCKS
// ============================================================================

// Mock Prisma to prevent any DB access (safety measure for indirect dependencies)
vi.mock('@/lib/db/prisma', () => ({
  prisma: {},
}))

// Mock next/headers
const mockHeaders = vi.fn()

vi.mock('next/headers', () => ({
  headers: () => mockHeaders(),
}))

// Mock rate limiting
const mockCheckRateLimit = vi.fn()
const mockGetClientIp = vi.fn()

vi.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIp: (...args: unknown[]) => mockGetClientIp(...args),
  RATE_LIMITS: {
    publicChart: { limit: 60, windowSeconds: 60, prefix: 'public_chart' },
  },
}))

// Mock astrologer API
const mockAstrologerApi = {
  getNatalChart: vi.fn(),
  getNowChart: vi.fn(),
}

vi.mock('@/lib/api/astrologer', () => ({
  astrologerApi: {
    get getNatalChart() {
      return mockAstrologerApi.getNatalChart
    },
    get getNowChart() {
      return mockAstrologerApi.getNowChart
    },
  },
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
 * Create a mock Headers object
 */
function createMockHeaders(headersMap: Record<string, string> = {}): Headers {
  const headers = new Map(Object.entries(headersMap))
  return {
    get: (key: string) => headers.get(key.toLowerCase()) ?? null,
    has: (key: string) => headers.has(key.toLowerCase()),
    entries: () => headers.entries(),
  } as unknown as Headers
}

/**
 * Sample public birth data for tests
 */
const validBirthData = {
  name: 'Test User',
  year: 1990,
  month: 6,
  day: 15,
  hour: 10,
  minute: 30,
  city: 'Rome',
  nation: 'Italy',
  latitude: 41.9028,
  longitude: 12.4964,
  timezone: 'Europe/Rome',
}

/**
 * Mock chart response
 */
const mockChartResponse = {
  status: 'OK' as const,
  chart_data: {
    chart_type: 'Natal',
    subject: { name: 'Test User' },
    aspects: [],
    element_distribution: {
      fire: 3,
      earth: 2,
      air: 3,
      water: 2,
      fire_percentage: 30,
      earth_percentage: 20,
      air_percentage: 30,
      water_percentage: 20,
    },
    quality_distribution: {
      cardinal: 3,
      fixed: 4,
      mutable: 3,
      cardinal_percentage: 30,
      fixed_percentage: 40,
      mutable_percentage: 30,
    },
    active_points: ['Sun', 'Moon'],
    active_aspects: [],
    lunar_phase: {
      degrees_between_s_m: 90,
      moon_phase: 0.25,
      moon_emoji: '🌓',
      moon_phase_name: 'First Quarter',
    },
    houses_names_list: [],
  },
  chart_wheel: '<svg></svg>',
  chart_grid: '<svg></svg>',
}

/**
 * Mock now chart response
 */
const mockNowChartResponse = {
  ...mockChartResponse,
  chart_data: {
    ...mockChartResponse.chart_data,
    chart_type: 'Now',
    subject: { name: 'Now Chart' },
  },
}

/**
 * Setup successful rate limit mock
 */
function setupSuccessfulRateLimit() {
  mockCheckRateLimit.mockReturnValue({
    success: true,
    remaining: 59,
    resetTime: Date.now() + 60000,
  })
}

/**
 * Setup blocked rate limit mock
 */
function setupBlockedRateLimit() {
  mockCheckRateLimit.mockReturnValue({
    success: false,
    remaining: 0,
    resetTime: Date.now() + 60000,
  })
}

/**
 * Setup default mocks for successful requests
 */
function setupSuccessMocks() {
  const headersObj = createMockHeaders({ 'x-forwarded-for': '192.168.1.1' })
  mockHeaders.mockResolvedValue(headersObj)
  mockGetClientIp.mockReturnValue('192.168.1.1')
  setupSuccessfulRateLimit()
}

// ============================================================================
// TESTS
// ============================================================================

describe('Public Astrology Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupSuccessMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==========================================================================
  // getPublicNatalChart TESTS
  // ==========================================================================

  describe('getPublicNatalChart', () => {
    describe('Rate Limiting', () => {
      it('should allow request when rate limit is not exceeded', async () => {
        const { getPublicNatalChart } = await import('@/actions/public-astrology')
        mockAstrologerApi.getNatalChart.mockResolvedValue(mockChartResponse)

        const result = await getPublicNatalChart(validBirthData)

        expect(result).toEqual(mockChartResponse)
        expect(mockCheckRateLimit).toHaveBeenCalledWith(
          'public_chart:192.168.1.1',
          expect.objectContaining({ prefix: 'public_chart' }),
        )
      })

      it('should throw error when rate limit is exceeded', async () => {
        const { getPublicNatalChart } = await import('@/actions/public-astrology')
        setupBlockedRateLimit()

        await expect(getPublicNatalChart(validBirthData)).rejects.toThrow('Too many requests. Please try again later.')
        expect(mockAstrologerApi.getNatalChart).not.toHaveBeenCalled()
      })

      it('should use client IP for rate limit identifier', async () => {
        const { getPublicNatalChart } = await import('@/actions/public-astrology')
        mockAstrologerApi.getNatalChart.mockResolvedValue(mockChartResponse)
        mockGetClientIp.mockReturnValue('10.0.0.42')

        await getPublicNatalChart(validBirthData)

        expect(mockCheckRateLimit).toHaveBeenCalledWith('public_chart:10.0.0.42', expect.any(Object))
      })
    })

    describe('Headers and IP Parsing', () => {
      it('should call headers() to get request headers', async () => {
        const { getPublicNatalChart } = await import('@/actions/public-astrology')
        mockAstrologerApi.getNatalChart.mockResolvedValue(mockChartResponse)

        await getPublicNatalChart(validBirthData)

        expect(mockHeaders).toHaveBeenCalled()
      })

      it('should pass headers to getClientIp', async () => {
        const { getPublicNatalChart } = await import('@/actions/public-astrology')
        mockAstrologerApi.getNatalChart.mockResolvedValue(mockChartResponse)
        const headersObj = createMockHeaders({ 'x-real-ip': '203.0.113.45' })
        mockHeaders.mockResolvedValue(headersObj)

        await getPublicNatalChart(validBirthData)

        expect(mockGetClientIp).toHaveBeenCalledWith(headersObj)
      })

      it('should work with x-forwarded-for header', async () => {
        const { getPublicNatalChart } = await import('@/actions/public-astrology')
        mockAstrologerApi.getNatalChart.mockResolvedValue(mockChartResponse)
        const headersObj = createMockHeaders({ 'x-forwarded-for': '198.51.100.1, 203.0.113.1' })
        mockHeaders.mockResolvedValue(headersObj)
        mockGetClientIp.mockReturnValue('198.51.100.1')

        await getPublicNatalChart(validBirthData)

        expect(mockCheckRateLimit).toHaveBeenCalledWith('public_chart:198.51.100.1', expect.any(Object))
      })

      it('should handle unknown IP', async () => {
        const { getPublicNatalChart } = await import('@/actions/public-astrology')
        mockAstrologerApi.getNatalChart.mockResolvedValue(mockChartResponse)
        mockGetClientIp.mockReturnValue('unknown')

        await getPublicNatalChart(validBirthData)

        expect(mockCheckRateLimit).toHaveBeenCalledWith('public_chart:unknown', expect.any(Object))
      })
    })

    describe('Default Preferences Applied', () => {
      it('should apply default zodiac_type (Tropical)', async () => {
        const { getPublicNatalChart } = await import('@/actions/public-astrology')
        mockAstrologerApi.getNatalChart.mockResolvedValue(mockChartResponse)

        await getPublicNatalChart(validBirthData)

        const [subjectArg] = mockAstrologerApi.getNatalChart.mock.calls[0]!
        expect(subjectArg.zodiac_type).toBe('Tropical')
      })

      it('should apply default house_system (Placidus - P)', async () => {
        const { getPublicNatalChart } = await import('@/actions/public-astrology')
        mockAstrologerApi.getNatalChart.mockResolvedValue(mockChartResponse)

        await getPublicNatalChart(validBirthData)

        const [subjectArg] = mockAstrologerApi.getNatalChart.mock.calls[0]!
        expect(subjectArg.houses_system_identifier).toBe('P')
      })

      it('should apply default perspective_type (Apparent Geocentric)', async () => {
        const { getPublicNatalChart } = await import('@/actions/public-astrology')
        mockAstrologerApi.getNatalChart.mockResolvedValue(mockChartResponse)

        await getPublicNatalChart(validBirthData)

        const [subjectArg] = mockAstrologerApi.getNatalChart.mock.calls[0]!
        expect(subjectArg.perspective_type).toBe('Apparent Geocentric')
      })

      it('should apply default active_points', async () => {
        const { getPublicNatalChart } = await import('@/actions/public-astrology')
        mockAstrologerApi.getNatalChart.mockResolvedValue(mockChartResponse)

        await getPublicNatalChart(validBirthData)

        const [, optionsArg] = mockAstrologerApi.getNatalChart.mock.calls[0]!
        expect(optionsArg.active_points).toEqual([
          'Sun',
          'Moon',
          'Mercury',
          'Venus',
          'Mars',
          'Jupiter',
          'Saturn',
          'Uranus',
          'Neptune',
          'Pluto',
          'Mean_Node',
          'Chiron',
        ])
      })

      it('should apply default active_aspects with orbs', async () => {
        const { getPublicNatalChart } = await import('@/actions/public-astrology')
        mockAstrologerApi.getNatalChart.mockResolvedValue(mockChartResponse)

        await getPublicNatalChart(validBirthData)

        const [, optionsArg] = mockAstrologerApi.getNatalChart.mock.calls[0]!
        expect(optionsArg.active_aspects).toEqual([
          { name: 'conjunction', orb: 10 },
          { name: 'opposition', orb: 10 },
          { name: 'trine', orb: 8 },
          { name: 'square', orb: 8 },
          { name: 'sextile', orb: 6 },
        ])
      })

      it('should set split_chart to true', async () => {
        const { getPublicNatalChart } = await import('@/actions/public-astrology')
        mockAstrologerApi.getNatalChart.mockResolvedValue(mockChartResponse)

        await getPublicNatalChart(validBirthData)

        const [, optionsArg] = mockAstrologerApi.getNatalChart.mock.calls[0]!
        expect(optionsArg.split_chart).toBe(true)
      })

      it('should set transparent_background to true', async () => {
        const { getPublicNatalChart } = await import('@/actions/public-astrology')
        mockAstrologerApi.getNatalChart.mockResolvedValue(mockChartResponse)

        await getPublicNatalChart(validBirthData)

        const [, optionsArg] = mockAstrologerApi.getNatalChart.mock.calls[0]!
        expect(optionsArg.transparent_background).toBe(true)
      })

      it('should set language to EN', async () => {
        const { getPublicNatalChart } = await import('@/actions/public-astrology')
        mockAstrologerApi.getNatalChart.mockResolvedValue(mockChartResponse)

        await getPublicNatalChart(validBirthData)

        const [, optionsArg] = mockAstrologerApi.getNatalChart.mock.calls[0]!
        expect(optionsArg.language).toBe('EN')
      })
    })

    describe('Astrologer API Calls', () => {
      it('should call astrologerApi.getNatalChart with subject model', async () => {
        const { getPublicNatalChart } = await import('@/actions/public-astrology')
        mockAstrologerApi.getNatalChart.mockResolvedValue(mockChartResponse)

        await getPublicNatalChart(validBirthData)

        expect(mockAstrologerApi.getNatalChart).toHaveBeenCalledTimes(1)
        const [subjectArg] = mockAstrologerApi.getNatalChart.mock.calls[0]!

        expect(subjectArg).toMatchObject({
          name: 'Test User',
          year: 1990,
          month: 6,
          day: 15,
          hour: 10,
          minute: 30,
          second: 0,
          city: 'Rome',
          nation: 'Italy',
          latitude: 41.9028,
          longitude: 12.4964,
          timezone: 'Europe/Rome',
        })
      })

      it('should use classic theme by default', async () => {
        const { getPublicNatalChart } = await import('@/actions/public-astrology')
        mockAstrologerApi.getNatalChart.mockResolvedValue(mockChartResponse)

        await getPublicNatalChart(validBirthData)

        const [, optionsArg] = mockAstrologerApi.getNatalChart.mock.calls[0]!
        expect(optionsArg.theme).toBe('classic')
      })

      it('should allow dark theme override', async () => {
        const { getPublicNatalChart } = await import('@/actions/public-astrology')
        mockAstrologerApi.getNatalChart.mockResolvedValue(mockChartResponse)

        await getPublicNatalChart(validBirthData, 'dark')

        const [, optionsArg] = mockAstrologerApi.getNatalChart.mock.calls[0]!
        expect(optionsArg.theme).toBe('dark')
      })

      it('should return chart response from API', async () => {
        const { getPublicNatalChart } = await import('@/actions/public-astrology')
        mockAstrologerApi.getNatalChart.mockResolvedValue(mockChartResponse)

        const result = await getPublicNatalChart(validBirthData)

        expect(result).toEqual(mockChartResponse)
      })
    })

    describe('Error Handling', () => {
      it('should propagate API errors', async () => {
        const { getPublicNatalChart } = await import('@/actions/public-astrology')
        mockAstrologerApi.getNatalChart.mockRejectedValue(new Error('API connection failed'))

        await expect(getPublicNatalChart(validBirthData)).rejects.toThrow('API connection failed')
      })

      it('should propagate API error with custom message', async () => {
        const { getPublicNatalChart } = await import('@/actions/public-astrology')
        mockAstrologerApi.getNatalChart.mockRejectedValue(new Error('Invalid birth data'))

        await expect(getPublicNatalChart(validBirthData)).rejects.toThrow('Invalid birth data')
      })
    })
  })

  // ==========================================================================
  // getPublicNowChart TESTS
  // ==========================================================================

  describe('getPublicNowChart', () => {
    describe('Rate Limiting', () => {
      it('should allow request when rate limit is not exceeded', async () => {
        const { getPublicNowChart } = await import('@/actions/public-astrology')
        mockAstrologerApi.getNowChart.mockResolvedValue(mockNowChartResponse)

        const result = await getPublicNowChart()

        expect(result.chart_data.subject.name).toBe('Demo Chart')
        expect(mockCheckRateLimit).toHaveBeenCalledWith(
          'public_chart:192.168.1.1',
          expect.objectContaining({ prefix: 'public_chart' }),
        )
      })

      it('should throw error when rate limit is exceeded', async () => {
        const { getPublicNowChart } = await import('@/actions/public-astrology')
        setupBlockedRateLimit()

        await expect(getPublicNowChart()).rejects.toThrow('Too many requests. Please try again later.')
        expect(mockAstrologerApi.getNowChart).not.toHaveBeenCalled()
      })

      it('should use client IP for rate limit identifier', async () => {
        const { getPublicNowChart } = await import('@/actions/public-astrology')
        mockAstrologerApi.getNowChart.mockResolvedValue(mockNowChartResponse)
        mockGetClientIp.mockReturnValue('172.16.0.1')

        await getPublicNowChart()

        expect(mockCheckRateLimit).toHaveBeenCalledWith('public_chart:172.16.0.1', expect.any(Object))
      })
    })

    describe('Headers and IP Parsing', () => {
      it('should call headers() to get request headers', async () => {
        const { getPublicNowChart } = await import('@/actions/public-astrology')
        mockAstrologerApi.getNowChart.mockResolvedValue(mockNowChartResponse)

        await getPublicNowChart()

        expect(mockHeaders).toHaveBeenCalled()
      })

      it('should pass headers to getClientIp', async () => {
        const { getPublicNowChart } = await import('@/actions/public-astrology')
        mockAstrologerApi.getNowChart.mockResolvedValue(mockNowChartResponse)
        const headersObj = createMockHeaders({ 'x-real-ip': '203.0.113.50' })
        mockHeaders.mockResolvedValue(headersObj)

        await getPublicNowChart()

        expect(mockGetClientIp).toHaveBeenCalledWith(headersObj)
      })
    })

    describe('Default Preferences Applied', () => {
      it('should apply default active_points', async () => {
        const { getPublicNowChart } = await import('@/actions/public-astrology')
        mockAstrologerApi.getNowChart.mockResolvedValue(mockNowChartResponse)

        await getPublicNowChart()

        const [optionsArg] = mockAstrologerApi.getNowChart.mock.calls[0]!
        expect(optionsArg.active_points).toEqual([
          'Sun',
          'Moon',
          'Mercury',
          'Venus',
          'Mars',
          'Jupiter',
          'Saturn',
          'Uranus',
          'Neptune',
          'Pluto',
          'Mean_Node',
          'Chiron',
        ])
      })

      it('should apply default active_aspects', async () => {
        const { getPublicNowChart } = await import('@/actions/public-astrology')
        mockAstrologerApi.getNowChart.mockResolvedValue(mockNowChartResponse)

        await getPublicNowChart()

        const [optionsArg] = mockAstrologerApi.getNowChart.mock.calls[0]!
        expect(optionsArg.active_aspects).toEqual([
          { name: 'conjunction', orb: 10 },
          { name: 'opposition', orb: 10 },
          { name: 'trine', orb: 8 },
          { name: 'square', orb: 8 },
          { name: 'sextile', orb: 6 },
        ])
      })

      it('should set split_chart to true', async () => {
        const { getPublicNowChart } = await import('@/actions/public-astrology')
        mockAstrologerApi.getNowChart.mockResolvedValue(mockNowChartResponse)

        await getPublicNowChart()

        const [optionsArg] = mockAstrologerApi.getNowChart.mock.calls[0]!
        expect(optionsArg.split_chart).toBe(true)
      })

      it('should set transparent_background to true', async () => {
        const { getPublicNowChart } = await import('@/actions/public-astrology')
        mockAstrologerApi.getNowChart.mockResolvedValue(mockNowChartResponse)

        await getPublicNowChart()

        const [optionsArg] = mockAstrologerApi.getNowChart.mock.calls[0]!
        expect(optionsArg.transparent_background).toBe(true)
      })

      it('should set language to EN', async () => {
        const { getPublicNowChart } = await import('@/actions/public-astrology')
        mockAstrologerApi.getNowChart.mockResolvedValue(mockNowChartResponse)

        await getPublicNowChart()

        const [optionsArg] = mockAstrologerApi.getNowChart.mock.calls[0]!
        expect(optionsArg.language).toBe('EN')
      })
    })

    describe('Astrologer API Calls', () => {
      it('should call astrologerApi.getNowChart with options only (no subject)', async () => {
        const { getPublicNowChart } = await import('@/actions/public-astrology')
        mockAstrologerApi.getNowChart.mockResolvedValue(mockNowChartResponse)

        await getPublicNowChart()

        expect(mockAstrologerApi.getNowChart).toHaveBeenCalledTimes(1)
        const [optionsArg] = mockAstrologerApi.getNowChart.mock.calls[0]!

        // Should not have subject properties
        expect(optionsArg.name).toBeUndefined()
        expect(optionsArg.year).toBeUndefined()
      })

      it('should use classic theme by default', async () => {
        const { getPublicNowChart } = await import('@/actions/public-astrology')
        mockAstrologerApi.getNowChart.mockResolvedValue(mockNowChartResponse)

        await getPublicNowChart()

        const [optionsArg] = mockAstrologerApi.getNowChart.mock.calls[0]!
        expect(optionsArg.theme).toBe('classic')
      })

      it('should allow dark theme override', async () => {
        const { getPublicNowChart } = await import('@/actions/public-astrology')
        mockAstrologerApi.getNowChart.mockResolvedValue(mockNowChartResponse)

        await getPublicNowChart('dark')

        const [optionsArg] = mockAstrologerApi.getNowChart.mock.calls[0]!
        expect(optionsArg.theme).toBe('dark')
      })
    })

    describe('Demo Chart Name Override', () => {
      it('should rename subject to "Demo Chart"', async () => {
        const { getPublicNowChart } = await import('@/actions/public-astrology')
        mockAstrologerApi.getNowChart.mockResolvedValue(mockNowChartResponse)

        const result = await getPublicNowChart()

        expect(result.chart_data.subject.name).toBe('Demo Chart')
      })

      it('should override any name from API response', async () => {
        const { getPublicNowChart } = await import('@/actions/public-astrology')
        const responseWithDifferentName = {
          ...mockNowChartResponse,
          chart_data: {
            ...mockNowChartResponse.chart_data,
            subject: { name: 'API Default Name' },
          },
        }
        mockAstrologerApi.getNowChart.mockResolvedValue(responseWithDifferentName)

        const result = await getPublicNowChart()

        expect(result.chart_data.subject.name).toBe('Demo Chart')
      })

      it('should handle missing subject gracefully', async () => {
        const { getPublicNowChart } = await import('@/actions/public-astrology')
        const responseWithoutSubject = {
          ...mockNowChartResponse,
          chart_data: {
            ...mockNowChartResponse.chart_data,
            subject: undefined,
          },
        }
        mockAstrologerApi.getNowChart.mockResolvedValue(responseWithoutSubject)

        // Should not throw
        const result = await getPublicNowChart()
        expect(result.chart_data.subject).toBeUndefined()
      })
    })

    describe('Error Handling', () => {
      it('should propagate API errors', async () => {
        const { getPublicNowChart } = await import('@/actions/public-astrology')
        mockAstrologerApi.getNowChart.mockRejectedValue(new Error('API connection failed'))

        await expect(getPublicNowChart()).rejects.toThrow('API connection failed')
      })

      it('should propagate API timeout errors', async () => {
        const { getPublicNowChart } = await import('@/actions/public-astrology')
        mockAstrologerApi.getNowChart.mockRejectedValue(new Error('Request timeout'))

        await expect(getPublicNowChart()).rejects.toThrow('Request timeout')
      })
    })
  })

  // ==========================================================================
  // RATE_LIMITS Configuration Tests
  // ==========================================================================

  describe('RATE_LIMITS.publicChart configuration', () => {
    it('should use publicChart rate limit configuration', async () => {
      const { getPublicNatalChart } = await import('@/actions/public-astrology')
      mockAstrologerApi.getNatalChart.mockResolvedValue(mockChartResponse)

      await getPublicNatalChart(validBirthData)

      expect(mockCheckRateLimit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          limit: 60,
          windowSeconds: 60,
          prefix: 'public_chart',
        }),
      )
    })
  })
})
