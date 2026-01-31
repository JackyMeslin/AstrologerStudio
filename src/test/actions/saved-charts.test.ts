/**
 * Unit Tests for Saved Charts Actions
 *
 * Tests the getSavedChartData function for all chart types:
 * - natal, transit, synastry, composite, solar-return, lunar-return
 *
 * @module src/actions/saved-charts
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

// ============================================================================
// MOCKS
// ============================================================================

// Mock prisma to prevent any database access
vi.mock('@/lib/db/prisma', () => ({
  prisma: {},
}))

// Mock getSubjectById from subjects action
const mockGetSubjectById = vi.fn()

vi.mock('@/actions/subjects', () => ({
  getSubjectById: (id: string) => mockGetSubjectById(id),
}))

// Mock astrology actions
const mockGetNatalChart = vi.fn()
const mockGetTransitChart = vi.fn()
const mockGetSynastryChart = vi.fn()
const mockGetCompositeChart = vi.fn()
const mockGetSolarReturnChart = vi.fn()
const mockGetLunarReturnChart = vi.fn()

vi.mock('@/actions/astrology', () => ({
  getNatalChart: (...args: unknown[]) => mockGetNatalChart(...args),
  getTransitChart: (...args: unknown[]) => mockGetTransitChart(...args),
  getSynastryChart: (...args: unknown[]) => mockGetSynastryChart(...args),
  getCompositeChart: (...args: unknown[]) => mockGetCompositeChart(...args),
  getSolarReturnChart: (...args: unknown[]) => mockGetSolarReturnChart(...args),
  getLunarReturnChart: (...args: unknown[]) => mockGetLunarReturnChart(...args),
}))

// Mock logger
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}

vi.mock('@/lib/logging/server', () => ({
  logger: mockLogger,
}))

// ============================================================================
// TEST HELPERS
// ============================================================================

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
  ownerId: 'user-123',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

/**
 * Second test subject for dual charts
 */
const testSubject2 = {
  id: 'subject-456',
  name: 'Second Subject',
  birth_datetime: '1988-03-20T14:00:00.000Z',
  city: 'Milan',
  nation: 'Italy',
  latitude: 45.4642,
  longitude: 9.19,
  timezone: 'Europe/Rome',
  ownerId: 'user-123',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
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
      moon_emoji: '',
      moon_phase_name: 'First Quarter',
    },
    houses_names_list: [],
  },
  chart_wheel: '<svg></svg>',
  chart_grid: '<svg></svg>',
}

/**
 * Mock dual chart response with first_subject and second_subject
 */
const mockDualChartResponse = {
  ...mockChartResponse,
  chart_data: {
    ...mockChartResponse.chart_data,
    first_subject: { name: 'First' },
    second_subject: { name: 'Second' },
  },
}

/**
 * Test transit location
 */
const testTransitLocation = {
  city: 'New York',
  nation: 'USA',
  latitude: 40.7128,
  longitude: -74.006,
  timezone: 'America/New_York',
}

// ============================================================================
// TESTS
// ============================================================================

describe('Saved Charts Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ==========================================================================
  // NATAL CHART TESTS
  // ==========================================================================

  describe('getSavedChartData - natal', () => {
    it('should return natal chart data for valid subject', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockResolvedValue(testSubject)
      mockGetNatalChart.mockResolvedValue(mockChartResponse)

      const result = await getSavedChartData({ type: 'natal', subjectId: 'subject-123' })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.chartType).toBe('natal')
        expect(result.data).toEqual(mockChartResponse)
      }
      expect(mockGetSubjectById).toHaveBeenCalledWith('subject-123')
      expect(mockGetNatalChart).toHaveBeenCalledWith(testSubject, undefined)
    })

    it('should pass theme option when provided', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockResolvedValue(testSubject)
      mockGetNatalChart.mockResolvedValue(mockChartResponse)

      await getSavedChartData({ type: 'natal', subjectId: 'subject-123' }, 'dark')

      expect(mockGetNatalChart).toHaveBeenCalledWith(testSubject, { theme: 'dark' })
    })

    it('should return error when subject not found', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockResolvedValue(null)

      const result = await getSavedChartData({ type: 'natal', subjectId: 'non-existent' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Subject not found. It may have been deleted.')
      }
      expect(mockGetNatalChart).not.toHaveBeenCalled()
    })

    it('should return error when getNatalChart throws', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockResolvedValue(testSubject)
      mockGetNatalChart.mockRejectedValue(new Error('API Error'))

      const result = await getSavedChartData({ type: 'natal', subjectId: 'subject-123' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('API Error')
      }
      expect(mockLogger.error).toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // TRANSIT CHART TESTS
  // ==========================================================================

  describe('getSavedChartData - transit', () => {
    const transitParams = {
      type: 'transit' as const,
      subjectId: 'subject-123',
      transitDate: '2025-01-15T12:00:00.000Z',
      transitLocation: testTransitLocation,
    }

    it('should return transit chart data with natal and transit data', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockResolvedValue(testSubject)
      mockGetTransitChart.mockResolvedValue(mockChartResponse)
      mockGetNatalChart.mockResolvedValue(mockChartResponse)

      const result = await getSavedChartData(transitParams)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.chartType).toBe('transit')
        expect(result.data).toEqual(mockChartResponse)
        expect(result.natalData).toEqual(mockChartResponse)
        expect(result.transitData).toEqual(mockChartResponse)
      }
    })

    it('should construct transit subject from params', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockResolvedValue(testSubject)
      mockGetTransitChart.mockResolvedValue(mockChartResponse)
      mockGetNatalChart.mockResolvedValue(mockChartResponse)

      await getSavedChartData(transitParams)

      // Verify getTransitChart was called with natal subject and transit subject
      expect(mockGetTransitChart).toHaveBeenCalledWith(
        testSubject,
        expect.objectContaining({
          id: 'transit',
          name: 'Transit',
          birth_datetime: transitParams.transitDate,
          city: testTransitLocation.city,
          nation: testTransitLocation.nation,
          latitude: testTransitLocation.latitude,
          longitude: testTransitLocation.longitude,
          timezone: testTransitLocation.timezone,
          ownerId: testSubject.ownerId,
        }),
        undefined,
      )
    })

    it('should return error when subject not found', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockResolvedValue(null)

      const result = await getSavedChartData(transitParams)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Subject not found. It may have been deleted.')
      }
    })

    it('should return error when getTransitChart throws', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockResolvedValue(testSubject)
      mockGetTransitChart.mockRejectedValue(new Error('Transit API Error'))

      const result = await getSavedChartData(transitParams)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Transit API Error')
      }
    })

    it('should pass theme to all chart calls', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockResolvedValue(testSubject)
      mockGetTransitChart.mockResolvedValue(mockChartResponse)
      mockGetNatalChart.mockResolvedValue(mockChartResponse)

      await getSavedChartData(transitParams, 'classic')

      expect(mockGetTransitChart).toHaveBeenCalledWith(expect.anything(), expect.anything(), { theme: 'classic' })
      // getNatalChart is called twice (for natal and transit data)
      expect(mockGetNatalChart).toHaveBeenCalledTimes(2)
      expect(mockGetNatalChart).toHaveBeenNthCalledWith(1, testSubject, { theme: 'classic' })
    })
  })

  // ==========================================================================
  // SYNASTRY CHART TESTS
  // ==========================================================================

  describe('getSavedChartData - synastry', () => {
    const synastryParams = {
      type: 'synastry' as const,
      subject1Id: 'subject-123',
      subject2Id: 'subject-456',
    }

    it('should return synastry chart data with both subject data', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockImplementation((id: string) => {
        if (id === 'subject-123') return Promise.resolve(testSubject)
        if (id === 'subject-456') return Promise.resolve(testSubject2)
        return Promise.resolve(null)
      })
      mockGetSynastryChart.mockResolvedValue(mockChartResponse)
      mockGetNatalChart.mockResolvedValue(mockChartResponse)

      const result = await getSavedChartData(synastryParams)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.chartType).toBe('synastry')
        expect(result.data).toEqual(mockChartResponse)
        expect(result.subject1Data).toEqual(mockChartResponse)
        expect(result.subject2Data).toEqual(mockChartResponse)
      }
    })

    it('should fetch both subjects in parallel', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockImplementation((id: string) => {
        if (id === 'subject-123') return Promise.resolve(testSubject)
        if (id === 'subject-456') return Promise.resolve(testSubject2)
        return Promise.resolve(null)
      })
      mockGetSynastryChart.mockResolvedValue(mockChartResponse)
      mockGetNatalChart.mockResolvedValue(mockChartResponse)

      await getSavedChartData(synastryParams)

      expect(mockGetSubjectById).toHaveBeenCalledWith('subject-123')
      expect(mockGetSubjectById).toHaveBeenCalledWith('subject-456')
      expect(mockGetSubjectById).toHaveBeenCalledTimes(2)
    })

    it('should return error when subject1 not found', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockImplementation((id: string) => {
        if (id === 'subject-456') return Promise.resolve(testSubject2)
        return Promise.resolve(null)
      })

      const result = await getSavedChartData(synastryParams)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('One or both subjects not found. They may have been deleted.')
      }
    })

    it('should return error when subject2 not found', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockImplementation((id: string) => {
        if (id === 'subject-123') return Promise.resolve(testSubject)
        return Promise.resolve(null)
      })

      const result = await getSavedChartData(synastryParams)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('One or both subjects not found. They may have been deleted.')
      }
    })

    it('should return error when both subjects not found', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockResolvedValue(null)

      const result = await getSavedChartData(synastryParams)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('One or both subjects not found. They may have been deleted.')
      }
    })

    it('should return error when getSynastryChart throws', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockImplementation((id: string) => {
        if (id === 'subject-123') return Promise.resolve(testSubject)
        if (id === 'subject-456') return Promise.resolve(testSubject2)
        return Promise.resolve(null)
      })
      mockGetSynastryChart.mockRejectedValue(new Error('Synastry API Error'))

      const result = await getSavedChartData(synastryParams)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Synastry API Error')
      }
    })
  })

  // ==========================================================================
  // COMPOSITE CHART TESTS
  // ==========================================================================

  describe('getSavedChartData - composite', () => {
    const compositeParams = {
      type: 'composite' as const,
      subject1Id: 'subject-123',
      subject2Id: 'subject-456',
    }

    it('should return composite chart data', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockImplementation((id: string) => {
        if (id === 'subject-123') return Promise.resolve(testSubject)
        if (id === 'subject-456') return Promise.resolve(testSubject2)
        return Promise.resolve(null)
      })
      mockGetCompositeChart.mockResolvedValue(mockChartResponse)

      const result = await getSavedChartData(compositeParams)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.chartType).toBe('composite')
        expect(result.data).toEqual(mockChartResponse)
      }
    })

    it('should call getCompositeChart with both subjects', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockImplementation((id: string) => {
        if (id === 'subject-123') return Promise.resolve(testSubject)
        if (id === 'subject-456') return Promise.resolve(testSubject2)
        return Promise.resolve(null)
      })
      mockGetCompositeChart.mockResolvedValue(mockChartResponse)

      await getSavedChartData(compositeParams)

      expect(mockGetCompositeChart).toHaveBeenCalledWith(testSubject, testSubject2, undefined)
    })

    it('should return error when subject1 not found', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockImplementation((id: string) => {
        if (id === 'subject-456') return Promise.resolve(testSubject2)
        return Promise.resolve(null)
      })

      const result = await getSavedChartData(compositeParams)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('One or both subjects not found. They may have been deleted.')
      }
    })

    it('should return error when subject2 not found', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockImplementation((id: string) => {
        if (id === 'subject-123') return Promise.resolve(testSubject)
        return Promise.resolve(null)
      })

      const result = await getSavedChartData(compositeParams)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('One or both subjects not found. They may have been deleted.')
      }
    })

    it('should return error when getCompositeChart throws', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockImplementation((id: string) => {
        if (id === 'subject-123') return Promise.resolve(testSubject)
        if (id === 'subject-456') return Promise.resolve(testSubject2)
        return Promise.resolve(null)
      })
      mockGetCompositeChart.mockRejectedValue(new Error('Composite API Error'))

      const result = await getSavedChartData(compositeParams)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Composite API Error')
      }
    })

    it('should pass theme option', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockImplementation((id: string) => {
        if (id === 'subject-123') return Promise.resolve(testSubject)
        if (id === 'subject-456') return Promise.resolve(testSubject2)
        return Promise.resolve(null)
      })
      mockGetCompositeChart.mockResolvedValue(mockChartResponse)

      await getSavedChartData(compositeParams, 'dark')

      expect(mockGetCompositeChart).toHaveBeenCalledWith(testSubject, testSubject2, { theme: 'dark' })
    })
  })

  // ==========================================================================
  // SOLAR RETURN CHART TESTS
  // ==========================================================================

  describe('getSavedChartData - solar-return', () => {
    const solarReturnParams = {
      type: 'solar-return' as const,
      subjectId: 'subject-123',
      year: 2025,
      wheelType: 'single' as const,
    }

    it('should return solar return chart data', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockResolvedValue(testSubject)
      mockGetSolarReturnChart.mockResolvedValue(mockChartResponse)

      const result = await getSavedChartData(solarReturnParams)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.chartType).toBe('solar-return')
        expect(result.data).toEqual(mockChartResponse)
      }
    })

    it('should call getSolarReturnChart with correct options', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockResolvedValue(testSubject)
      mockGetSolarReturnChart.mockResolvedValue(mockChartResponse)

      await getSavedChartData(solarReturnParams)

      expect(mockGetSolarReturnChart).toHaveBeenCalledWith(testSubject, {
        year: 2025,
        wheel_type: 'single',
        return_location: {
          city: testSubject.city,
          nation: testSubject.nation,
          latitude: testSubject.latitude,
          longitude: testSubject.longitude,
          timezone: testSubject.timezone,
        },
      })
    })

    it('should use returnLocation from params when provided', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockResolvedValue(testSubject)
      mockGetSolarReturnChart.mockResolvedValue(mockChartResponse)

      const paramsWithLocation = {
        ...solarReturnParams,
        returnLocation: testTransitLocation,
      }

      await getSavedChartData(paramsWithLocation)

      expect(mockGetSolarReturnChart).toHaveBeenCalledWith(
        testSubject,
        expect.objectContaining({
          return_location: testTransitLocation,
        }),
      )
    })

    it('should return subject1Data for dual wheel type', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockResolvedValue(testSubject)
      mockGetSolarReturnChart.mockResolvedValue(mockDualChartResponse)
      mockGetNatalChart.mockResolvedValue(mockChartResponse)

      const dualParams = {
        ...solarReturnParams,
        wheelType: 'dual' as const,
      }

      const result = await getSavedChartData(dualParams)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.chartType).toBe('solar-return')
        expect(result.subject1Data).toEqual(mockChartResponse)
      }
      expect(mockGetNatalChart).toHaveBeenCalledWith(testSubject, undefined)
    })

    it('should not return subject1Data for single wheel type', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockResolvedValue(testSubject)
      mockGetSolarReturnChart.mockResolvedValue(mockChartResponse)

      const result = await getSavedChartData(solarReturnParams)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.subject1Data).toBeUndefined()
      }
      expect(mockGetNatalChart).not.toHaveBeenCalled()
    })

    it('should return error when subject not found', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockResolvedValue(null)

      const result = await getSavedChartData(solarReturnParams)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Subject not found. It may have been deleted.')
      }
    })

    it('should return error when getSolarReturnChart throws', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockResolvedValue(testSubject)
      mockGetSolarReturnChart.mockRejectedValue(new Error('Solar Return API Error'))

      const result = await getSavedChartData(solarReturnParams)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Solar Return API Error')
      }
    })

    it('should merge theme with other options', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockResolvedValue(testSubject)
      mockGetSolarReturnChart.mockResolvedValue(mockChartResponse)

      await getSavedChartData(solarReturnParams, 'classic')

      expect(mockGetSolarReturnChart).toHaveBeenCalledWith(
        testSubject,
        expect.objectContaining({
          theme: 'classic',
          year: 2025,
          wheel_type: 'single',
        }),
      )
    })
  })

  // ==========================================================================
  // LUNAR RETURN CHART TESTS
  // ==========================================================================

  describe('getSavedChartData - lunar-return', () => {
    const lunarReturnParams = {
      type: 'lunar-return' as const,
      subjectId: 'subject-123',
      returnDatetime: '2025-02-15T10:30:00.000Z',
      wheelType: 'single' as const,
    }

    it('should return lunar return chart data', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockResolvedValue(testSubject)
      mockGetLunarReturnChart.mockResolvedValue(mockChartResponse)

      const result = await getSavedChartData(lunarReturnParams)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.chartType).toBe('lunar-return')
        expect(result.data).toEqual(mockChartResponse)
      }
    })

    it('should call getLunarReturnChart with correct options', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockResolvedValue(testSubject)
      mockGetLunarReturnChart.mockResolvedValue(mockChartResponse)

      await getSavedChartData(lunarReturnParams)

      expect(mockGetLunarReturnChart).toHaveBeenCalledWith(testSubject, {
        iso_datetime: lunarReturnParams.returnDatetime,
        wheel_type: 'single',
        return_location: {
          city: testSubject.city,
          nation: testSubject.nation,
          latitude: testSubject.latitude,
          longitude: testSubject.longitude,
          timezone: testSubject.timezone,
        },
      })
    })

    it('should use returnLocation from params when provided', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockResolvedValue(testSubject)
      mockGetLunarReturnChart.mockResolvedValue(mockChartResponse)

      const paramsWithLocation = {
        ...lunarReturnParams,
        returnLocation: testTransitLocation,
      }

      await getSavedChartData(paramsWithLocation)

      expect(mockGetLunarReturnChart).toHaveBeenCalledWith(
        testSubject,
        expect.objectContaining({
          return_location: testTransitLocation,
        }),
      )
    })

    it('should return subject1Data for dual wheel type', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockResolvedValue(testSubject)
      mockGetLunarReturnChart.mockResolvedValue(mockDualChartResponse)
      mockGetNatalChart.mockResolvedValue(mockChartResponse)

      const dualParams = {
        ...lunarReturnParams,
        wheelType: 'dual' as const,
      }

      const result = await getSavedChartData(dualParams)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.chartType).toBe('lunar-return')
        expect(result.subject1Data).toEqual(mockChartResponse)
      }
      expect(mockGetNatalChart).toHaveBeenCalledWith(testSubject, undefined)
    })

    it('should not return subject1Data for single wheel type', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockResolvedValue(testSubject)
      mockGetLunarReturnChart.mockResolvedValue(mockChartResponse)

      const result = await getSavedChartData(lunarReturnParams)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.subject1Data).toBeUndefined()
      }
      expect(mockGetNatalChart).not.toHaveBeenCalled()
    })

    it('should return error when subject not found', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockResolvedValue(null)

      const result = await getSavedChartData(lunarReturnParams)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Subject not found. It may have been deleted.')
      }
    })

    it('should return error when getLunarReturnChart throws', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockResolvedValue(testSubject)
      mockGetLunarReturnChart.mockRejectedValue(new Error('Lunar Return API Error'))

      const result = await getSavedChartData(lunarReturnParams)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Lunar Return API Error')
      }
    })

    it('should merge theme with other options', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockResolvedValue(testSubject)
      mockGetLunarReturnChart.mockResolvedValue(mockChartResponse)

      await getSavedChartData(lunarReturnParams, 'dark')

      expect(mockGetLunarReturnChart).toHaveBeenCalledWith(
        testSubject,
        expect.objectContaining({
          theme: 'dark',
          iso_datetime: lunarReturnParams.returnDatetime,
          wheel_type: 'single',
        }),
      )
    })
  })

  // ==========================================================================
  // UNKNOWN CHART TYPE TESTS
  // ==========================================================================

  describe('getSavedChartData - unknown type', () => {
    it('should return error for unknown chart type', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')

      // @ts-expect-error Testing invalid type
      const result = await getSavedChartData({ type: 'unknown-type', subjectId: 'subject-123' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Unknown chart type')
      }
    })
  })

  // ==========================================================================
  // ERROR HANDLING TESTS
  // ==========================================================================

  describe('getSavedChartData - error handling', () => {
    it('should log error when exception occurs', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockResolvedValue(testSubject)
      mockGetNatalChart.mockRejectedValue(new Error('Test Error'))

      await getSavedChartData({ type: 'natal', subjectId: 'subject-123' })

      expect(mockLogger.error).toHaveBeenCalledWith('Error fetching saved chart data:', expect.any(Error))
    })

    it('should return generic error message for non-Error exceptions', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockResolvedValue(testSubject)
      mockGetNatalChart.mockRejectedValue('String error')

      const result = await getSavedChartData({ type: 'natal', subjectId: 'subject-123' })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Failed to load chart data')
      }
    })

    it('should handle undefined theme option', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockResolvedValue(testSubject)
      mockGetNatalChart.mockResolvedValue(mockChartResponse)

      await getSavedChartData({ type: 'natal', subjectId: 'subject-123' }, undefined)

      expect(mockGetNatalChart).toHaveBeenCalledWith(testSubject, undefined)
    })
  })

  // ==========================================================================
  // SWITCH ROUTING TESTS
  // ==========================================================================

  describe('getSavedChartData - switch routing', () => {
    it('should route natal type correctly', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockResolvedValue(testSubject)
      mockGetNatalChart.mockResolvedValue(mockChartResponse)

      const result = await getSavedChartData({ type: 'natal', subjectId: 'subject-123' })

      expect(result.success).toBe(true)
      expect(mockGetNatalChart).toHaveBeenCalled()
      expect(mockGetTransitChart).not.toHaveBeenCalled()
      expect(mockGetSynastryChart).not.toHaveBeenCalled()
      expect(mockGetCompositeChart).not.toHaveBeenCalled()
      expect(mockGetSolarReturnChart).not.toHaveBeenCalled()
      expect(mockGetLunarReturnChart).not.toHaveBeenCalled()
    })

    it('should route transit type correctly', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockResolvedValue(testSubject)
      mockGetTransitChart.mockResolvedValue(mockChartResponse)
      mockGetNatalChart.mockResolvedValue(mockChartResponse)

      const result = await getSavedChartData({
        type: 'transit',
        subjectId: 'subject-123',
        transitDate: '2025-01-15T12:00:00.000Z',
        transitLocation: testTransitLocation,
      })

      expect(result.success).toBe(true)
      expect(mockGetTransitChart).toHaveBeenCalled()
      expect(mockGetSynastryChart).not.toHaveBeenCalled()
      expect(mockGetCompositeChart).not.toHaveBeenCalled()
      expect(mockGetSolarReturnChart).not.toHaveBeenCalled()
      expect(mockGetLunarReturnChart).not.toHaveBeenCalled()
    })

    it('should route synastry type correctly', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockImplementation((id: string) => {
        if (id === 'subject-123') return Promise.resolve(testSubject)
        if (id === 'subject-456') return Promise.resolve(testSubject2)
        return Promise.resolve(null)
      })
      mockGetSynastryChart.mockResolvedValue(mockChartResponse)
      mockGetNatalChart.mockResolvedValue(mockChartResponse)

      const result = await getSavedChartData({
        type: 'synastry',
        subject1Id: 'subject-123',
        subject2Id: 'subject-456',
      })

      expect(result.success).toBe(true)
      expect(mockGetSynastryChart).toHaveBeenCalled()
      expect(mockGetTransitChart).not.toHaveBeenCalled()
      expect(mockGetCompositeChart).not.toHaveBeenCalled()
      expect(mockGetSolarReturnChart).not.toHaveBeenCalled()
      expect(mockGetLunarReturnChart).not.toHaveBeenCalled()
    })

    it('should route composite type correctly', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockImplementation((id: string) => {
        if (id === 'subject-123') return Promise.resolve(testSubject)
        if (id === 'subject-456') return Promise.resolve(testSubject2)
        return Promise.resolve(null)
      })
      mockGetCompositeChart.mockResolvedValue(mockChartResponse)

      const result = await getSavedChartData({
        type: 'composite',
        subject1Id: 'subject-123',
        subject2Id: 'subject-456',
      })

      expect(result.success).toBe(true)
      expect(mockGetCompositeChart).toHaveBeenCalled()
      expect(mockGetTransitChart).not.toHaveBeenCalled()
      expect(mockGetSynastryChart).not.toHaveBeenCalled()
      expect(mockGetSolarReturnChart).not.toHaveBeenCalled()
      expect(mockGetLunarReturnChart).not.toHaveBeenCalled()
    })

    it('should route solar-return type correctly', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockResolvedValue(testSubject)
      mockGetSolarReturnChart.mockResolvedValue(mockChartResponse)

      const result = await getSavedChartData({
        type: 'solar-return',
        subjectId: 'subject-123',
        year: 2025,
        wheelType: 'single',
      })

      expect(result.success).toBe(true)
      expect(mockGetSolarReturnChart).toHaveBeenCalled()
      expect(mockGetTransitChart).not.toHaveBeenCalled()
      expect(mockGetSynastryChart).not.toHaveBeenCalled()
      expect(mockGetCompositeChart).not.toHaveBeenCalled()
      expect(mockGetLunarReturnChart).not.toHaveBeenCalled()
    })

    it('should route lunar-return type correctly', async () => {
      const { getSavedChartData } = await import('@/actions/saved-charts')
      mockGetSubjectById.mockResolvedValue(testSubject)
      mockGetLunarReturnChart.mockResolvedValue(mockChartResponse)

      const result = await getSavedChartData({
        type: 'lunar-return',
        subjectId: 'subject-123',
        returnDatetime: '2025-02-15T10:30:00.000Z',
        wheelType: 'single',
      })

      expect(result.success).toBe(true)
      expect(mockGetLunarReturnChart).toHaveBeenCalled()
      expect(mockGetTransitChart).not.toHaveBeenCalled()
      expect(mockGetSynastryChart).not.toHaveBeenCalled()
      expect(mockGetCompositeChart).not.toHaveBeenCalled()
      expect(mockGetSolarReturnChart).not.toHaveBeenCalled()
    })
  })
})
