/**
 * Unit Tests for Astrology Actions
 *
 * Tests the astrology server actions including chart generation,
 * preference merging, and calculation tracking.
 *
 * @module src/actions/astrology
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// ============================================================================
// MOCKS
// ============================================================================

// Mock session
const mockGetSession = vi.fn()

vi.mock('@/lib/security/session', () => ({
  getSession: () => mockGetSession(),
}))

// Mock chart preferences
const mockGetChartPreferences = vi.fn()

vi.mock('@/actions/preferences', () => ({
  getChartPreferences: () => mockGetChartPreferences(),
}))

// Mock astrologer API
const mockAstrologerApi = {
  getNatalChart: vi.fn(),
  getTransitChart: vi.fn(),
  getSynastryChart: vi.fn(),
  getCompositeChart: vi.fn(),
  getNowChart: vi.fn(),
  getSolarReturnChart: vi.fn(),
  getLunarReturnChart: vi.fn(),
}

vi.mock('@/lib/api/astrologer', () => ({
  astrologerApi: {
    get getNatalChart() {
      return mockAstrologerApi.getNatalChart
    },
    get getTransitChart() {
      return mockAstrologerApi.getTransitChart
    },
    get getSynastryChart() {
      return mockAstrologerApi.getSynastryChart
    },
    get getCompositeChart() {
      return mockAstrologerApi.getCompositeChart
    },
    get getNowChart() {
      return mockAstrologerApi.getNowChart
    },
    get getSolarReturnChart() {
      return mockAstrologerApi.getSolarReturnChart
    },
    get getLunarReturnChart() {
      return mockAstrologerApi.getLunarReturnChart
    },
  },
}))

// Mock prisma for trackChartCalculation
const mockPrismaChartCalculationUsage = {
  upsert: vi.fn(),
}

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    chartCalculationUsage: {
      get upsert() {
        return mockPrismaChartCalculationUsage.upsert
      },
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

const mockSession = { userId: 'user-123', username: 'testuser' }

/**
 * Valid chart preferences for tests
 */
const validPreferences = {
  theme: 'classic',
  date_format: 'EU' as const,
  time_format: '24h' as const,
  show_aspect_icons: true,
  show_degree_indicators: true,
  distribution_method: 'weighted',
  active_points: ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars'],
  active_aspects: [
    { name: 'Conjunction', orb: 10 },
    { name: 'Opposition', orb: 10 },
    { name: 'Trine', orb: 8 },
  ],
  custom_distribution_weights: { sun: 2, moon: 2 },
  default_zodiac_system: 'Tropical',
  default_sidereal_mode: 'LAHIRI',
  house_system: 'P',
  perspective_type: 'Apparent Geocentric',
  rulership_mode: 'classical' as const,
}

/**
 * Test subject with all required fields
 */
const testSubject = {
  id: 'subject-123',
  name: 'Test Subject',
  birth_datetime: '1990-06-15T10:30:00.000Z',
  city: 'Rome',
  nation: 'Italy',
  latitude: 41.9028,
  longitude: 12.4964,
  timezone: 'Europe/Rome',
  rodens_rating: 'AA' as const,
  tags: ['test'],
  notes: null,
}

/**
 * Second test subject for dual charts
 */
const testSubjectB = {
  id: 'subject-456',
  name: 'Second Subject',
  birth_datetime: '1988-03-20T14:00:00.000Z',
  city: 'Milan',
  nation: 'Italy',
  latitude: 45.4642,
  longitude: 9.19,
  timezone: 'Europe/Rome',
  rodens_rating: 'A' as const,
  tags: null,
  notes: null,
}

/**
 * Mock chart response
 */
const mockChartResponse = {
  status: 'OK' as const,
  chart_data: {
    chart_type: 'Natal',
    subject: {},
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
 * Setup mocks for a successful chart request
 */
function setupSuccessMocks() {
  mockGetSession.mockResolvedValue(mockSession)
  mockGetChartPreferences.mockResolvedValue(validPreferences)
  mockPrismaChartCalculationUsage.upsert.mockResolvedValue({})
}

// ============================================================================
// TESTS
// ============================================================================

describe('Astrology Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupSuccessMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==========================================================================
  // getNatalChart TESTS
  // ==========================================================================

  describe('getNatalChart', () => {
    it('should call astrologerApi.getNatalChart with subject and merged options', async () => {
      const { getNatalChart } = await import('@/actions/astrology')
      mockAstrologerApi.getNatalChart.mockResolvedValue(mockChartResponse)

      await getNatalChart(testSubject)

      expect(mockAstrologerApi.getNatalChart).toHaveBeenCalledTimes(1)
      const [subjectArg, optionsArg] = mockAstrologerApi.getNatalChart.mock.calls[0]!

      // Verify subject model is created correctly
      expect(subjectArg).toMatchObject({
        name: 'Test Subject',
        year: 1990,
        month: 6,
        day: 15,
        hour: 10,
        minute: 30,
        city: 'Rome',
        nation: 'Italy',
        zodiac_type: 'Tropical',
        houses_system_identifier: 'P',
        perspective_type: 'Apparent Geocentric',
      })

      // Verify merged options include preferences
      expect(optionsArg).toMatchObject({
        theme: 'classic',
        active_points: validPreferences.active_points,
        active_aspects: validPreferences.active_aspects,
        distribution_method: 'weighted',
        show_aspect_icons: true,
        show_degree_indicators: true,
        custom_distribution_weights: { sun: 2, moon: 2 },
      })
    })

    it('should throw error when session is null', async () => {
      const { getNatalChart } = await import('@/actions/astrology')
      mockGetSession.mockResolvedValue(null)

      await expect(getNatalChart(testSubject)).rejects.toThrow('Unauthorized')
      expect(mockAstrologerApi.getNatalChart).not.toHaveBeenCalled()
    })

    it('should throw error when preferences are null', async () => {
      const { getNatalChart } = await import('@/actions/astrology')
      mockGetChartPreferences.mockResolvedValue(null)

      await expect(getNatalChart(testSubject)).rejects.toThrow('User preferences not found')
    })

    it('should throw error when active_aspects is empty', async () => {
      const { getNatalChart } = await import('@/actions/astrology')
      mockGetChartPreferences.mockResolvedValue({
        ...validPreferences,
        active_aspects: [],
      })

      await expect(getNatalChart(testSubject)).rejects.toThrow('Missing required preference: active_aspects')
    })

    it('should throw error when default_zodiac_system is missing', async () => {
      const { getNatalChart } = await import('@/actions/astrology')
      mockGetChartPreferences.mockResolvedValue({
        ...validPreferences,
        default_zodiac_system: null,
      })

      await expect(getNatalChart(testSubject)).rejects.toThrow('Missing required preference: default_zodiac_system')
    })

    it('should throw error when house_system is missing', async () => {
      const { getNatalChart } = await import('@/actions/astrology')
      mockGetChartPreferences.mockResolvedValue({
        ...validPreferences,
        house_system: null,
      })

      await expect(getNatalChart(testSubject)).rejects.toThrow('Missing required preference: house_system')
    })

    it('should throw error when perspective_type is missing', async () => {
      const { getNatalChart } = await import('@/actions/astrology')
      mockGetChartPreferences.mockResolvedValue({
        ...validPreferences,
        perspective_type: null,
      })

      await expect(getNatalChart(testSubject)).rejects.toThrow('Missing required preference: perspective_type')
    })

    it('should allow overriding options', async () => {
      const { getNatalChart } = await import('@/actions/astrology')
      mockAstrologerApi.getNatalChart.mockResolvedValue(mockChartResponse)

      await getNatalChart(testSubject, { theme: 'dark' })

      const [, optionsArg] = mockAstrologerApi.getNatalChart.mock.calls[0]!
      expect(optionsArg.theme).toBe('dark')
    })
  })

  // ==========================================================================
  // getTransitChart TESTS
  // ==========================================================================

  describe('getTransitChart', () => {
    it('should call astrologerApi.getTransitChart with natal and transit subjects', async () => {
      const { getTransitChart } = await import('@/actions/astrology')
      mockAstrologerApi.getTransitChart.mockResolvedValue(mockChartResponse)

      await getTransitChart(testSubject, testSubjectB)

      expect(mockAstrologerApi.getTransitChart).toHaveBeenCalledTimes(1)
      const [natalArg, transitArg, optionsArg] = mockAstrologerApi.getTransitChart.mock.calls[0]!

      // Natal subject should have config (zodiac_type, house_system, perspective_type)
      expect(natalArg).toMatchObject({
        name: 'Test Subject',
        zodiac_type: 'Tropical',
        houses_system_identifier: 'P',
        perspective_type: 'Apparent Geocentric',
      })

      // Transit subject should be basic (no config)
      expect(transitArg).toMatchObject({
        name: 'Second Subject',
        year: 1988,
        month: 3,
        day: 20,
      })
      expect(transitArg.zodiac_type).toBeUndefined()
      expect(transitArg.houses_system_identifier).toBeUndefined()

      // Options should have merged preferences
      expect(optionsArg).toMatchObject({
        theme: 'classic',
        active_aspects: validPreferences.active_aspects,
      })
    })

    it('should throw error when session is null', async () => {
      const { getTransitChart } = await import('@/actions/astrology')
      mockGetSession.mockResolvedValue(null)

      await expect(getTransitChart(testSubject, testSubjectB)).rejects.toThrow('Unauthorized')
    })

    it('should throw error when preferences are incomplete', async () => {
      const { getTransitChart } = await import('@/actions/astrology')
      mockGetChartPreferences.mockResolvedValue({
        ...validPreferences,
        active_aspects: [],
      })

      await expect(getTransitChart(testSubject, testSubjectB)).rejects.toThrow(
        'Missing required preference: active_aspects',
      )
    })
  })

  // ==========================================================================
  // getSynastryChart TESTS
  // ==========================================================================

  describe('getSynastryChart', () => {
    it('should call astrologerApi.getSynastryChart with both subjects', async () => {
      const { getSynastryChart } = await import('@/actions/astrology')
      mockAstrologerApi.getSynastryChart.mockResolvedValue(mockChartResponse)

      await getSynastryChart(testSubject, testSubjectB)

      expect(mockAstrologerApi.getSynastryChart).toHaveBeenCalledTimes(1)
      const [subjectA, subjectB, optionsArg] = mockAstrologerApi.getSynastryChart.mock.calls[0]!

      // First subject should have config
      expect(subjectA).toMatchObject({
        name: 'Test Subject',
        zodiac_type: 'Tropical',
        houses_system_identifier: 'P',
      })

      // Second subject should be basic
      expect(subjectB).toMatchObject({
        name: 'Second Subject',
      })
      expect(subjectB.zodiac_type).toBeUndefined()

      // Options should have merged preferences
      expect(optionsArg).toMatchObject({
        theme: 'classic',
        active_aspects: validPreferences.active_aspects,
      })
    })

    it('should throw error when preferences are incomplete', async () => {
      const { getSynastryChart } = await import('@/actions/astrology')
      mockGetChartPreferences.mockResolvedValue({
        ...validPreferences,
        house_system: null,
      })

      await expect(getSynastryChart(testSubject, testSubjectB)).rejects.toThrow(
        'Missing required preference: house_system',
      )
    })
  })

  // ==========================================================================
  // getCompositeChart TESTS
  // ==========================================================================

  describe('getCompositeChart', () => {
    it('should call astrologerApi.getCompositeChart with both subjects', async () => {
      const { getCompositeChart } = await import('@/actions/astrology')
      mockAstrologerApi.getCompositeChart.mockResolvedValue(mockChartResponse)

      await getCompositeChart(testSubject, testSubjectB)

      expect(mockAstrologerApi.getCompositeChart).toHaveBeenCalledTimes(1)
      const [subjectA, subjectB, optionsArg] = mockAstrologerApi.getCompositeChart.mock.calls[0]!

      // First subject should have config
      expect(subjectA).toMatchObject({
        name: 'Test Subject',
        zodiac_type: 'Tropical',
      })

      // Second subject should be basic
      expect(subjectB.zodiac_type).toBeUndefined()

      // Options should have merged preferences
      expect(optionsArg).toMatchObject({
        active_aspects: validPreferences.active_aspects,
      })
    })

    it('should ensure first_subject and second_subject are present in response', async () => {
      const { getCompositeChart } = await import('@/actions/astrology')
      const responseWithoutSubjects = {
        ...mockChartResponse,
        chart_data: {
          ...mockChartResponse.chart_data,
          first_subject: undefined,
          second_subject: undefined,
        },
      }
      mockAstrologerApi.getCompositeChart.mockResolvedValue(responseWithoutSubjects)

      const result = await getCompositeChart(testSubject, testSubjectB)

      // Should have added first_subject and second_subject
      expect(result.chart_data.first_subject).toBeDefined()
      expect(result.chart_data.second_subject).toBeDefined()
    })

    it('should throw error when preferences are incomplete', async () => {
      const { getCompositeChart } = await import('@/actions/astrology')
      mockGetChartPreferences.mockResolvedValue({
        ...validPreferences,
        perspective_type: null,
      })

      await expect(getCompositeChart(testSubject, testSubjectB)).rejects.toThrow(
        'Missing required preference: perspective_type',
      )
    })
  })

  // ==========================================================================
  // getNowChart TESTS
  // ==========================================================================

  describe('getNowChart', () => {
    it('should call astrologerApi.getNowChart with merged options', async () => {
      const { getNowChart } = await import('@/actions/astrology')
      mockAstrologerApi.getNowChart.mockResolvedValue(mockChartResponse)

      await getNowChart()

      expect(mockAstrologerApi.getNowChart).toHaveBeenCalledTimes(1)
      const [optionsArg] = mockAstrologerApi.getNowChart.mock.calls[0]!

      // Options should have merged preferences
      expect(optionsArg).toMatchObject({
        theme: 'classic',
        active_points: validPreferences.active_points,
        active_aspects: validPreferences.active_aspects,
      })
    })

    it('should use current date/time from API (no subject needed)', async () => {
      const { getNowChart } = await import('@/actions/astrology')
      mockAstrologerApi.getNowChart.mockResolvedValue(mockChartResponse)

      await getNowChart()

      // getNowChart should not pass any subject - the API uses current time
      expect(mockAstrologerApi.getNowChart).toHaveBeenCalledWith(expect.any(Object))
      const [optionsArg] = mockAstrologerApi.getNowChart.mock.calls[0]!

      // Should only pass options, no subject
      expect(optionsArg.name).toBeUndefined()
      expect(optionsArg.year).toBeUndefined()
    })

    it('should throw error when session is null', async () => {
      const { getNowChart } = await import('@/actions/astrology')
      mockGetSession.mockResolvedValue(null)

      await expect(getNowChart()).rejects.toThrow('Unauthorized')
    })

    it('should throw error when preferences are incomplete', async () => {
      const { getNowChart } = await import('@/actions/astrology')
      mockGetChartPreferences.mockResolvedValue({
        ...validPreferences,
        active_aspects: [],
      })

      await expect(getNowChart()).rejects.toThrow('Missing required preference: active_aspects')
    })
  })

  // ==========================================================================
  // getSolarReturnChart TESTS
  // ==========================================================================

  describe('getSolarReturnChart', () => {
    it('should call astrologerApi.getSolarReturnChart with subject and options', async () => {
      const { getSolarReturnChart } = await import('@/actions/astrology')
      mockAstrologerApi.getSolarReturnChart.mockResolvedValue(mockChartResponse)

      await getSolarReturnChart(testSubject, { year: 2025 })

      expect(mockAstrologerApi.getSolarReturnChart).toHaveBeenCalledTimes(1)
      const [subjectArg, optionsArg] = mockAstrologerApi.getSolarReturnChart.mock.calls[0]!

      // Subject should have config
      expect(subjectArg).toMatchObject({
        name: 'Test Subject',
        zodiac_type: 'Tropical',
        houses_system_identifier: 'P',
      })

      // Options should include year
      expect(optionsArg.year).toBe(2025)
    })

    it('should pass year correctly from options', async () => {
      const { getSolarReturnChart } = await import('@/actions/astrology')
      mockAstrologerApi.getSolarReturnChart.mockResolvedValue(mockChartResponse)

      await getSolarReturnChart(testSubject, { year: 2030, month: 6 })

      const [, optionsArg] = mockAstrologerApi.getSolarReturnChart.mock.calls[0]!
      expect(optionsArg.year).toBe(2030)
      expect(optionsArg.month).toBe(6)
    })

    it('should pass return_location correctly', async () => {
      const { getSolarReturnChart } = await import('@/actions/astrology')
      mockAstrologerApi.getSolarReturnChart.mockResolvedValue(mockChartResponse)

      const returnLocation = {
        city: 'New York',
        nation: 'USA',
        longitude: -74.006,
        latitude: 40.7128,
        timezone: 'America/New_York',
      }

      await getSolarReturnChart(testSubject, { year: 2025, return_location: returnLocation })

      const [, optionsArg] = mockAstrologerApi.getSolarReturnChart.mock.calls[0]!
      expect(optionsArg.return_location).toEqual(returnLocation)
    })

    it('should pass wheel_type correctly', async () => {
      const { getSolarReturnChart } = await import('@/actions/astrology')
      mockAstrologerApi.getSolarReturnChart.mockResolvedValue(mockChartResponse)

      await getSolarReturnChart(testSubject, { year: 2025, wheel_type: 'dual' })

      const [, optionsArg] = mockAstrologerApi.getSolarReturnChart.mock.calls[0]!
      expect(optionsArg.wheel_type).toBe('dual')
    })

    it('should throw error when preferences are incomplete', async () => {
      const { getSolarReturnChart } = await import('@/actions/astrology')
      mockGetChartPreferences.mockResolvedValue({
        ...validPreferences,
        default_zodiac_system: null,
      })

      await expect(getSolarReturnChart(testSubject, { year: 2025 })).rejects.toThrow(
        'Missing required preference: default_zodiac_system',
      )
    })
  })

  // ==========================================================================
  // getLunarReturnChart TESTS
  // ==========================================================================

  describe('getLunarReturnChart', () => {
    it('should call astrologerApi.getLunarReturnChart with subject and options', async () => {
      const { getLunarReturnChart } = await import('@/actions/astrology')
      mockAstrologerApi.getLunarReturnChart.mockResolvedValue(mockChartResponse)

      await getLunarReturnChart(testSubject, { year: 2025, month: 3 })

      expect(mockAstrologerApi.getLunarReturnChart).toHaveBeenCalledTimes(1)
      const [subjectArg, optionsArg] = mockAstrologerApi.getLunarReturnChart.mock.calls[0]!

      // Subject should have config
      expect(subjectArg).toMatchObject({
        name: 'Test Subject',
        zodiac_type: 'Tropical',
      })

      // Options should include year and month
      expect(optionsArg.year).toBe(2025)
      expect(optionsArg.month).toBe(3)
    })

    it('should pass iso_datetime correctly', async () => {
      const { getLunarReturnChart } = await import('@/actions/astrology')
      mockAstrologerApi.getLunarReturnChart.mockResolvedValue(mockChartResponse)

      const isoDatetime = '2025-03-15T10:30:00.000Z'
      await getLunarReturnChart(testSubject, { iso_datetime: isoDatetime })

      const [, optionsArg] = mockAstrologerApi.getLunarReturnChart.mock.calls[0]!
      expect(optionsArg.iso_datetime).toBe(isoDatetime)
    })

    it('should throw error when preferences are incomplete', async () => {
      const { getLunarReturnChart } = await import('@/actions/astrology')
      mockGetChartPreferences.mockResolvedValue({
        ...validPreferences,
        active_aspects: [],
      })

      await expect(getLunarReturnChart(testSubject, { year: 2025 })).rejects.toThrow(
        'Missing required preference: active_aspects',
      )
    })
  })

  // ==========================================================================
  // trackChartCalculation TESTS
  // ==========================================================================

  async function getTrackChartCalculation() {
    const { trackChartCalculation } = await import('@/actions/astrology')
    return trackChartCalculation as unknown as (chartType: string) => Promise<void>
  }

  describe('trackChartCalculation', () => {
    it('should create record with userId from session and chartType', async () => {
      const trackChartCalculation = await getTrackChartCalculation()
      mockPrismaChartCalculationUsage.upsert.mockResolvedValue({})
      mockGetSession.mockResolvedValue(mockSession)

      await trackChartCalculation('natal')

      expect(mockPrismaChartCalculationUsage.upsert).toHaveBeenCalledTimes(1)
      const callArgs = mockPrismaChartCalculationUsage.upsert.mock.calls[0]![0]

      expect(callArgs.where.userId_date_chartType.userId).toBe('user-123')
      expect(callArgs.where.userId_date_chartType.chartType).toBe('natal')
      expect(callArgs.create.userId).toBe('user-123')
      expect(callArgs.create.chartType).toBe('natal')
      expect(callArgs.create.count).toBe(1)
      expect(callArgs.update.count).toEqual({ increment: 1 })
    })

    it('should use current date for tracking', async () => {
      const trackChartCalculation = await getTrackChartCalculation()
      mockPrismaChartCalculationUsage.upsert.mockResolvedValue({})
      mockGetSession.mockResolvedValue(mockSession)

      const today = new Date().toISOString().split('T')[0]
      await trackChartCalculation('transit')

      const callArgs = mockPrismaChartCalculationUsage.upsert.mock.calls[0]![0]
      expect(callArgs.where.userId_date_chartType.date).toBe(today)
      expect(callArgs.create.date).toBe(today)
    })

    it('should not throw error when upsert fails (fire-and-forget)', async () => {
      const trackChartCalculation = await getTrackChartCalculation()
      mockPrismaChartCalculationUsage.upsert.mockRejectedValue(new Error('Database error'))
      mockGetSession.mockResolvedValue(mockSession)

      await expect(trackChartCalculation('synastry')).resolves.toBeUndefined()
    })

    it('should log error with structured logger when tracking fails', async () => {
      const { logger } = await import('@/lib/logging/server')
      const trackChartCalculation = await getTrackChartCalculation()
      const dbError = new Error('Database connection failed')
      mockPrismaChartCalculationUsage.upsert.mockRejectedValue(dbError)
      mockGetSession.mockResolvedValue(mockSession)

      await trackChartCalculation('natal')

      expect(logger.error).toHaveBeenCalledTimes(1)
      expect(logger.error).toHaveBeenCalledWith('Failed to track chart calculation:', dbError)
    })

    it('should handle different chart types', async () => {
      const trackChartCalculation = await getTrackChartCalculation()
      mockPrismaChartCalculationUsage.upsert.mockResolvedValue({})
      mockGetSession.mockResolvedValue(mockSession)

      const chartTypes = ['natal', 'transit', 'synastry', 'composite', 'now', 'solar-return', 'lunar-return']

      for (const chartType of chartTypes) {
        vi.clearAllMocks()
        mockGetSession.mockResolvedValue(mockSession)
        await trackChartCalculation(chartType)

        const callArgs = mockPrismaChartCalculationUsage.upsert.mock.calls[0]![0]
        expect(callArgs.where.userId_date_chartType.chartType).toBe(chartType)
      }
    })

    it('should skip tracking when session is not authenticated', async () => {
      const trackChartCalculation = await getTrackChartCalculation()
      mockGetSession.mockResolvedValue(null)

      await trackChartCalculation('natal')

      expect(mockPrismaChartCalculationUsage.upsert).not.toHaveBeenCalled()
    })

    it('should skip tracking when session has no userId', async () => {
      const trackChartCalculation = await getTrackChartCalculation()
      mockGetSession.mockResolvedValue({ username: 'testuser' })

      await trackChartCalculation('natal')

      expect(mockPrismaChartCalculationUsage.upsert).not.toHaveBeenCalled()
    })

    // IDOR Protection Tests
    describe('IDOR protection', () => {
      it('should always use session userId regardless of any external input', async () => {
        // This test documents that trackChartCalculation only accepts chartType
        // and derives userId exclusively from the authenticated session,
        // preventing IDOR (Insecure Direct Object Reference) attacks
        const trackChartCalculation = await getTrackChartCalculation()
        mockPrismaChartCalculationUsage.upsert.mockResolvedValue({})

        // Session belongs to user-123
        mockGetSession.mockResolvedValue({ userId: 'user-123', username: 'realuser' })

        // The function signature only accepts chartType - no userId parameter
        await trackChartCalculation('natal')

        // Verify the tracking is recorded for the session's user (user-123)
        const callArgs = mockPrismaChartCalculationUsage.upsert.mock.calls[0]![0]
        expect(callArgs.where.userId_date_chartType.userId).toBe('user-123')
        expect(callArgs.create.userId).toBe('user-123')
      })

      it('should not track for different user even if session changes between calls', async () => {
        // Ensures each call uses the current session, not cached values
        const trackChartCalculation = await getTrackChartCalculation()
        mockPrismaChartCalculationUsage.upsert.mockResolvedValue({})

        // First call as user-123
        mockGetSession.mockResolvedValue({ userId: 'user-123', username: 'user1' })
        await trackChartCalculation('natal')

        expect(mockPrismaChartCalculationUsage.upsert.mock.calls[0]![0].create.userId).toBe('user-123')

        // Second call as user-456 (different session)
        mockGetSession.mockResolvedValue({ userId: 'user-456', username: 'user2' })
        await trackChartCalculation('transit')

        expect(mockPrismaChartCalculationUsage.upsert.mock.calls[1]![0].create.userId).toBe('user-456')
      })

      it('should derive userId from session on every call (no parameter injection possible)', async () => {
        // Verify the function only accepts chartType as parameter
        // TypeScript enforces this at compile time, but this test documents the security design
        const trackChartCalculation = await getTrackChartCalculation()

        // TypeScript signature: (chartType: string) => Promise<void>
        // This ensures no userId parameter can be passed externally
        expect(trackChartCalculation.length).toBe(1) // Only accepts 1 parameter (chartType)
      })
    })
  })

  // ==========================================================================
  // mergeOptionsWithPreferences TESTS (via getNatalChart)
  // ==========================================================================

  describe('mergeOptionsWithPreferences', () => {
    it('should apply default_zodiac_system from preferences', async () => {
      const { getNatalChart } = await import('@/actions/astrology')
      mockAstrologerApi.getNatalChart.mockResolvedValue(mockChartResponse)
      mockGetChartPreferences.mockResolvedValue({
        ...validPreferences,
        default_zodiac_system: 'Sidereal',
        default_sidereal_mode: 'LAHIRI',
      })

      await getNatalChart(testSubject)

      const [subjectArg] = mockAstrologerApi.getNatalChart.mock.calls[0]!
      expect(subjectArg.zodiac_type).toBe('Sidereal')
      expect(subjectArg.sidereal_mode).toBe('LAHIRI')
    })

    it('should apply house_system from preferences', async () => {
      const { getNatalChart } = await import('@/actions/astrology')
      mockAstrologerApi.getNatalChart.mockResolvedValue(mockChartResponse)
      mockGetChartPreferences.mockResolvedValue({
        ...validPreferences,
        house_system: 'K', // Koch
      })

      await getNatalChart(testSubject)

      const [subjectArg] = mockAstrologerApi.getNatalChart.mock.calls[0]!
      expect(subjectArg.houses_system_identifier).toBe('K')
    })

    it('should apply perspective_type from preferences', async () => {
      const { getNatalChart } = await import('@/actions/astrology')
      mockAstrologerApi.getNatalChart.mockResolvedValue(mockChartResponse)
      mockGetChartPreferences.mockResolvedValue({
        ...validPreferences,
        perspective_type: 'True Geocentric',
      })

      await getNatalChart(testSubject)

      const [subjectArg] = mockAstrologerApi.getNatalChart.mock.calls[0]!
      expect(subjectArg.perspective_type).toBe('True Geocentric')
    })

    it('should apply active_aspects from preferences', async () => {
      const { getNatalChart } = await import('@/actions/astrology')
      mockAstrologerApi.getNatalChart.mockResolvedValue(mockChartResponse)
      const customAspects = [
        { name: 'Conjunction', orb: 8 },
        { name: 'Trine', orb: 6 },
      ]
      mockGetChartPreferences.mockResolvedValue({
        ...validPreferences,
        active_aspects: customAspects,
      })

      await getNatalChart(testSubject)

      const [, optionsArg] = mockAstrologerApi.getNatalChart.mock.calls[0]!
      expect(optionsArg.active_aspects).toEqual(customAspects)
    })

    it('should not include custom_distribution_weights when empty', async () => {
      const { getNatalChart } = await import('@/actions/astrology')
      mockAstrologerApi.getNatalChart.mockResolvedValue(mockChartResponse)
      mockGetChartPreferences.mockResolvedValue({
        ...validPreferences,
        custom_distribution_weights: {},
      })

      await getNatalChart(testSubject)

      const [, optionsArg] = mockAstrologerApi.getNatalChart.mock.calls[0]!
      expect(optionsArg.custom_distribution_weights).toBeUndefined()
    })

    it('should set sidereal_mode to null when zodiac is Tropical', async () => {
      const { getNatalChart } = await import('@/actions/astrology')
      mockAstrologerApi.getNatalChart.mockResolvedValue(mockChartResponse)
      mockGetChartPreferences.mockResolvedValue({
        ...validPreferences,
        default_zodiac_system: 'Tropical',
        default_sidereal_mode: 'LAHIRI',
      })

      await getNatalChart(testSubject)

      const [subjectArg] = mockAstrologerApi.getNatalChart.mock.calls[0]!
      expect(subjectArg.zodiac_type).toBe('Tropical')
      expect(subjectArg.sidereal_mode).toBeNull()
    })
  })

  // ==========================================================================
  // createChartAction shared boilerplate TESTS
  // ==========================================================================

  describe('createChartAction shared boilerplate', () => {
    it('should enforce session check consistently across all chart types', async () => {
      const {
        getNatalChart,
        getTransitChart,
        getSynastryChart,
        getCompositeChart,
        getNowChart,
        getSolarReturnChart,
        getLunarReturnChart,
      } = await import('@/actions/astrology')

      mockGetSession.mockResolvedValue(null)

      await expect(getNatalChart(testSubject)).rejects.toThrow('Unauthorized')
      await expect(getTransitChart(testSubject, testSubjectB)).rejects.toThrow('Unauthorized')
      await expect(getSynastryChart(testSubject, testSubjectB)).rejects.toThrow('Unauthorized')
      await expect(getCompositeChart(testSubject, testSubjectB)).rejects.toThrow('Unauthorized')
      await expect(getNowChart()).rejects.toThrow('Unauthorized')
      await expect(getSolarReturnChart(testSubject, { year: 2025 })).rejects.toThrow('Unauthorized')
      await expect(getLunarReturnChart(testSubject, { year: 2025 })).rejects.toThrow('Unauthorized')
    })

    it('should enforce preferences check consistently across all chart types', async () => {
      const {
        getNatalChart,
        getTransitChart,
        getSynastryChart,
        getCompositeChart,
        getNowChart,
        getSolarReturnChart,
        getLunarReturnChart,
      } = await import('@/actions/astrology')

      mockGetChartPreferences.mockResolvedValue(null)

      await expect(getNatalChart(testSubject)).rejects.toThrow('User preferences not found')
      await expect(getTransitChart(testSubject, testSubjectB)).rejects.toThrow('User preferences not found')
      await expect(getSynastryChart(testSubject, testSubjectB)).rejects.toThrow('User preferences not found')
      await expect(getCompositeChart(testSubject, testSubjectB)).rejects.toThrow('User preferences not found')
      await expect(getNowChart()).rejects.toThrow('User preferences not found')
      await expect(getSolarReturnChart(testSubject, { year: 2025 })).rejects.toThrow('User preferences not found')
      await expect(getLunarReturnChart(testSubject, { year: 2025 })).rejects.toThrow('User preferences not found')
    })

    it('should fire trackChartCalculation with correct chart type for each action', async () => {
      const {
        getNatalChart,
        getTransitChart,
        getSynastryChart,
        getCompositeChart,
        getNowChart,
        getSolarReturnChart,
        getLunarReturnChart,
      } = await import('@/actions/astrology')

      mockAstrologerApi.getNatalChart.mockResolvedValue(mockChartResponse)
      mockAstrologerApi.getTransitChart.mockResolvedValue(mockChartResponse)
      mockAstrologerApi.getSynastryChart.mockResolvedValue(mockChartResponse)
      mockAstrologerApi.getCompositeChart.mockResolvedValue(mockChartResponse)
      mockAstrologerApi.getNowChart.mockResolvedValue(mockChartResponse)
      mockAstrologerApi.getSolarReturnChart.mockResolvedValue(mockChartResponse)
      mockAstrologerApi.getLunarReturnChart.mockResolvedValue(mockChartResponse)

      // Each action should call trackChartCalculation, which calls getSession + prisma.upsert
      // We verify by checking prisma.upsert calls with the correct chartType

      await getNatalChart(testSubject)
      // Wait for non-blocking tracking
      await vi.waitFor(() => {
        expect(mockPrismaChartCalculationUsage.upsert).toHaveBeenCalled()
      })
      expect(mockPrismaChartCalculationUsage.upsert.mock.calls[0]![0].create.chartType).toBe('natal')
      vi.clearAllMocks()
      setupSuccessMocks()

      await getTransitChart(testSubject, testSubjectB)
      await vi.waitFor(() => {
        expect(mockPrismaChartCalculationUsage.upsert).toHaveBeenCalled()
      })
      expect(mockPrismaChartCalculationUsage.upsert.mock.calls[0]![0].create.chartType).toBe('transit')
      vi.clearAllMocks()
      setupSuccessMocks()

      await getSynastryChart(testSubject, testSubjectB)
      await vi.waitFor(() => {
        expect(mockPrismaChartCalculationUsage.upsert).toHaveBeenCalled()
      })
      expect(mockPrismaChartCalculationUsage.upsert.mock.calls[0]![0].create.chartType).toBe('synastry')
      vi.clearAllMocks()
      setupSuccessMocks()

      await getCompositeChart(testSubject, testSubjectB)
      await vi.waitFor(() => {
        expect(mockPrismaChartCalculationUsage.upsert).toHaveBeenCalled()
      })
      expect(mockPrismaChartCalculationUsage.upsert.mock.calls[0]![0].create.chartType).toBe('composite')
      vi.clearAllMocks()
      setupSuccessMocks()

      await getNowChart()
      await vi.waitFor(() => {
        expect(mockPrismaChartCalculationUsage.upsert).toHaveBeenCalled()
      })
      expect(mockPrismaChartCalculationUsage.upsert.mock.calls[0]![0].create.chartType).toBe('now')
      vi.clearAllMocks()
      setupSuccessMocks()

      await getSolarReturnChart(testSubject, { year: 2025 })
      await vi.waitFor(() => {
        expect(mockPrismaChartCalculationUsage.upsert).toHaveBeenCalled()
      })
      expect(mockPrismaChartCalculationUsage.upsert.mock.calls[0]![0].create.chartType).toBe('solar-return')
      vi.clearAllMocks()
      setupSuccessMocks()

      await getLunarReturnChart(testSubject, { year: 2025, month: 3 })
      await vi.waitFor(() => {
        expect(mockPrismaChartCalculationUsage.upsert).toHaveBeenCalled()
      })
      expect(mockPrismaChartCalculationUsage.upsert.mock.calls[0]![0].create.chartType).toBe('lunar-return')
    })

    it('should not block on tracking failure', async () => {
      const { getNatalChart } = await import('@/actions/astrology')
      mockAstrologerApi.getNatalChart.mockResolvedValue(mockChartResponse)
      mockPrismaChartCalculationUsage.upsert.mockRejectedValue(new Error('DB down'))

      // Should still return the chart response despite tracking failure
      const result = await getNatalChart(testSubject)
      expect(result).toEqual(mockChartResponse)
    })

    it('should merge options with preferences for all chart types', async () => {
      const { getNatalChart, getNowChart } = await import('@/actions/astrology')
      mockAstrologerApi.getNatalChart.mockResolvedValue(mockChartResponse)
      mockAstrologerApi.getNowChart.mockResolvedValue(mockChartResponse)

      // Test that options are merged for single-subject chart
      await getNatalChart(testSubject, { theme: 'dark' })
      const [, natalOptions] = mockAstrologerApi.getNatalChart.mock.calls[0]!
      expect(natalOptions.theme).toBe('dark')
      expect(natalOptions.active_aspects).toEqual(validPreferences.active_aspects)

      // Test that options are merged for no-subject chart
      await getNowChart({ theme: 'light' })
      const [nowOptions] = mockAstrologerApi.getNowChart.mock.calls[0]!
      expect(nowOptions.theme).toBe('light')
      expect(nowOptions.active_aspects).toEqual(validPreferences.active_aspects)
    })
  })
})
