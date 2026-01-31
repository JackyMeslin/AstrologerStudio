/**
 * Unit Tests for Chart Data Utilities
 *
 * Tests the chart data processing functions for element/quality distribution
 * calculations and radar chart data preparation.
 *
 * @module src/lib/astrology/chart-data
 */
import { describe, it, expect } from 'vitest'
import {
  calculateElementDistFromPoints,
  calculateQualityDistFromPoints,
  computeElementDistribution,
  computeQualityDistribution,
  prepareElementsRadarData,
  prepareQualitiesRadarData,
  processChartData,
  getSortIndex,
  sortActivePoints,
  getPointsForCategory,
  isZeroElementDist,
  isZeroQualityDist,
  getChartColors,
  getLunarPhaseData,
  getSubjectPoint,
  type ChartPoint,
} from '@/lib/astrology/chart-data'
import type { ChartData, ChartResponse, ElementDistribution, QualityDistribution, PointKey } from '@/types/astrology'
import { isPointKey } from '@/types/astrology'

// ============================================================================
// MOCK DATA FACTORIES
// ============================================================================

/**
 * Creates a mock ChartPoint with defaults
 */
function createMockChartPoint(overrides: Partial<ChartPoint> = {}): ChartPoint {
  return {
    name: 'Sun',
    emoji: '',
    sign: 'Aries',
    position: 15.5,
    house: 'First_House',
    retrograde: false,
    element: 'Fire',
    quality: 'Cardinal',
    ...overrides,
  }
}

/**
 * Creates a mock subject with celestial points
 */
function createMockSubject(pointsConfig: Record<string, Partial<ChartPoint>> = {}) {
  const defaultPoints = {
    sun: { name: 'Sun', element: 'Fire', quality: 'Fixed', sign: 'Leo' },
    moon: { name: 'Moon', element: 'Water', quality: 'Cardinal', sign: 'Cancer' },
    mercury: { name: 'Mercury', element: 'Air', quality: 'Mutable', sign: 'Gemini' },
    venus: { name: 'Venus', element: 'Earth', quality: 'Fixed', sign: 'Taurus' },
    mars: { name: 'Mars', element: 'Fire', quality: 'Cardinal', sign: 'Aries' },
    jupiter: { name: 'Jupiter', element: 'Fire', quality: 'Mutable', sign: 'Sagittarius' },
    saturn: { name: 'Saturn', element: 'Earth', quality: 'Cardinal', sign: 'Capricorn' },
    uranus: { name: 'Uranus', element: 'Air', quality: 'Fixed', sign: 'Aquarius' },
    neptune: { name: 'Neptune', element: 'Water', quality: 'Mutable', sign: 'Pisces' },
    pluto: { name: 'Pluto', element: 'Water', quality: 'Fixed', sign: 'Scorpio' },
  }

  const subject: Record<string, ChartPoint> = {}

  for (const [key, defaults] of Object.entries(defaultPoints)) {
    subject[key] = createMockChartPoint({
      ...defaults,
      ...pointsConfig[key],
    })
  }

  return subject
}

/**
 * Creates mock element distribution with defaults
 */
function createMockElementDistribution(overrides: Partial<ElementDistribution> = {}): ElementDistribution {
  return {
    fire: 3,
    earth: 2,
    air: 2,
    water: 3,
    fire_percentage: 30,
    earth_percentage: 20,
    air_percentage: 20,
    water_percentage: 30,
    ...overrides,
  }
}

/**
 * Creates mock quality distribution with defaults
 */
function createMockQualityDistribution(overrides: Partial<QualityDistribution> = {}): QualityDistribution {
  return {
    cardinal: 3,
    fixed: 4,
    mutable: 3,
    cardinal_percentage: 30,
    fixed_percentage: 40,
    mutable_percentage: 30,
    ...overrides,
  }
}

/**
 * Creates mock ChartData with defaults
 */
function createMockChartData(overrides: Partial<ChartData> = {}): ChartData {
  const subject = createMockSubject()
  return {
    chart_type: 'Natal',
    subject: subject as unknown as ChartData['subject'],
    lunar_phase: {
      degrees_between_s_m: 90,
      moon_phase: 0.25,
      moon_emoji: '',
      moon_phase_name: 'First Quarter',
    },
    aspects: [],
    element_distribution: createMockElementDistribution(),
    quality_distribution: createMockQualityDistribution(),
    active_points: ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'],
    active_aspects: [],
    houses_names_list: [],
    ...overrides,
  } as ChartData
}

/**
 * Creates mock ChartResponse with defaults
 */
function createMockChartResponse(overrides: Partial<ChartResponse> = {}): ChartResponse {
  return {
    status: 'OK',
    chart_data: createMockChartData(),
    ...overrides,
  }
}

// ============================================================================
// getSortIndex Tests
// ============================================================================

describe('getSortIndex', () => {
  it('should return correct index for Sun (first planet)', () => {
    expect(getSortIndex('Sun')).toBe(0)
  })

  it('should return correct index for Moon', () => {
    expect(getSortIndex('Moon')).toBe(1)
  })

  it('should handle underscore replacement in names', () => {
    expect(getSortIndex('True_North_Lunar_Node')).toBe(12)
  })

  it('should return 999 for unknown points', () => {
    expect(getSortIndex('UnknownPlanet')).toBe(999)
  })

  it('should return correct indices for all major planets', () => {
    expect(getSortIndex('Mercury')).toBe(2)
    expect(getSortIndex('Venus')).toBe(3)
    expect(getSortIndex('Mars')).toBe(4)
    expect(getSortIndex('Jupiter')).toBe(5)
    expect(getSortIndex('Saturn')).toBe(6)
  })
})

// ============================================================================
// sortActivePoints Tests
// ============================================================================

describe('sortActivePoints', () => {
  it('should sort points according to PLANET_ORDER', () => {
    const subject = createMockSubject()
    const unsorted = ['mars', 'sun', 'moon', 'mercury']

    const sorted = sortActivePoints(unsorted, subject)

    expect(sorted[0]).toBe('sun')
    expect(sorted[1]).toBe('moon')
    expect(sorted[2]).toBe('mercury')
    expect(sorted[3]).toBe('mars')
  })

  it('should handle empty array', () => {
    const subject = createMockSubject()
    const sorted = sortActivePoints([], subject)

    expect(sorted).toEqual([])
  })

  it('should not mutate original array', () => {
    const subject = createMockSubject()
    const original = ['mars', 'sun']
    const originalCopy = [...original]

    sortActivePoints(original, subject)

    expect(original).toEqual(originalCopy)
  })
})

// ============================================================================
// calculateElementDistFromPoints Tests
// ============================================================================

describe('calculateElementDistFromPoints', () => {
  it('should correctly count Fire elements', () => {
    const subject = createMockSubject({
      sun: { element: 'Fire' },
      moon: { element: 'Fire' },
      mercury: { element: 'Fire' },
    })
    const activePoints = ['sun', 'moon', 'mercury']

    const result = calculateElementDistFromPoints(subject, activePoints)

    expect(result.fire).toBe(3)
    expect(result.earth).toBe(0)
    expect(result.air).toBe(0)
    expect(result.water).toBe(0)
  })

  it('should correctly count Earth elements', () => {
    const subject = createMockSubject({
      sun: { element: 'Earth' },
      moon: { element: 'Earth' },
    })
    const activePoints = ['sun', 'moon']

    const result = calculateElementDistFromPoints(subject, activePoints)

    expect(result.earth).toBe(2)
  })

  it('should correctly count Air elements', () => {
    const subject = createMockSubject({
      sun: { element: 'Air' },
      moon: { element: 'Air' },
      mercury: { element: 'Air' },
      venus: { element: 'Air' },
    })
    const activePoints = ['sun', 'moon', 'mercury', 'venus']

    const result = calculateElementDistFromPoints(subject, activePoints)

    expect(result.air).toBe(4)
  })

  it('should correctly count Water elements', () => {
    const subject = createMockSubject({
      sun: { element: 'Water' },
      moon: { element: 'Water' },
    })
    const activePoints = ['sun', 'moon']

    const result = calculateElementDistFromPoints(subject, activePoints)

    expect(result.water).toBe(2)
  })

  it('should correctly count mixed elements', () => {
    const subject = createMockSubject()
    // Default subject: Fire(Sun, Mars, Jupiter=3), Earth(Venus, Saturn=2), Air(Mercury, Uranus=2), Water(Moon, Neptune, Pluto=3)
    const activePoints = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']

    const result = calculateElementDistFromPoints(subject, activePoints)

    expect(result.fire).toBe(3)
    expect(result.earth).toBe(2)
    expect(result.air).toBe(2)
    expect(result.water).toBe(3)
  })

  it('should handle empty active points', () => {
    const subject = createMockSubject()

    const result = calculateElementDistFromPoints(subject, [])

    expect(result.fire).toBe(0)
    expect(result.earth).toBe(0)
    expect(result.air).toBe(0)
    expect(result.water).toBe(0)
  })

  it('should handle points without element property', () => {
    const subject = {
      sun: createMockChartPoint({ element: undefined }),
    }
    const activePoints = ['sun']

    const result = calculateElementDistFromPoints(subject, activePoints)

    expect(result.fire).toBe(0)
    expect(result.earth).toBe(0)
    expect(result.air).toBe(0)
    expect(result.water).toBe(0)
  })
})

// ============================================================================
// calculateQualityDistFromPoints Tests
// ============================================================================

describe('calculateQualityDistFromPoints', () => {
  it('should correctly count Cardinal qualities', () => {
    const subject = createMockSubject({
      sun: { quality: 'Cardinal' },
      moon: { quality: 'Cardinal' },
      mercury: { quality: 'Cardinal' },
    })
    const activePoints = ['sun', 'moon', 'mercury']

    const result = calculateQualityDistFromPoints(subject, activePoints)

    expect(result.cardinal).toBe(3)
    expect(result.fixed).toBe(0)
    expect(result.mutable).toBe(0)
  })

  it('should correctly count Fixed qualities', () => {
    const subject = createMockSubject({
      sun: { quality: 'Fixed' },
      moon: { quality: 'Fixed' },
    })
    const activePoints = ['sun', 'moon']

    const result = calculateQualityDistFromPoints(subject, activePoints)

    expect(result.fixed).toBe(2)
  })

  it('should correctly count Mutable qualities', () => {
    const subject = createMockSubject({
      sun: { quality: 'Mutable' },
      moon: { quality: 'Mutable' },
      mercury: { quality: 'Mutable' },
      venus: { quality: 'Mutable' },
    })
    const activePoints = ['sun', 'moon', 'mercury', 'venus']

    const result = calculateQualityDistFromPoints(subject, activePoints)

    expect(result.mutable).toBe(4)
  })

  it('should correctly count mixed qualities', () => {
    const subject = createMockSubject()
    // Default subject: Cardinal(Moon, Mars, Saturn=3), Fixed(Sun, Venus, Uranus, Pluto=4), Mutable(Mercury, Jupiter, Neptune=3)
    const activePoints = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']

    const result = calculateQualityDistFromPoints(subject, activePoints)

    expect(result.cardinal).toBe(3)
    expect(result.fixed).toBe(4)
    expect(result.mutable).toBe(3)
  })

  it('should handle empty active points', () => {
    const subject = createMockSubject()

    const result = calculateQualityDistFromPoints(subject, [])

    expect(result.cardinal).toBe(0)
    expect(result.fixed).toBe(0)
    expect(result.mutable).toBe(0)
  })

  it('should handle points without quality property', () => {
    const subject = {
      sun: createMockChartPoint({ quality: undefined }),
    }
    const activePoints = ['sun']

    const result = calculateQualityDistFromPoints(subject, activePoints)

    expect(result.cardinal).toBe(0)
    expect(result.fixed).toBe(0)
    expect(result.mutable).toBe(0)
  })
})

// ============================================================================
// isZeroElementDist / isZeroQualityDist Tests
// ============================================================================

describe('isZeroElementDist', () => {
  it('should return true for undefined distribution', () => {
    expect(isZeroElementDist(undefined)).toBe(true)
  })

  it('should return true when all percentages are zero', () => {
    expect(isZeroElementDist({ fire_percentage: 0, earth_percentage: 0 })).toBe(true)
  })

  it('should return false when any percentage is non-zero', () => {
    expect(isZeroElementDist({ fire_percentage: 25, earth_percentage: 0 })).toBe(false)
  })
})

describe('isZeroQualityDist', () => {
  it('should return true for undefined distribution', () => {
    expect(isZeroQualityDist(undefined)).toBe(true)
  })

  it('should return true when all percentages are zero', () => {
    expect(isZeroQualityDist({ cardinal_percentage: 0, fixed_percentage: 0 })).toBe(true)
  })

  it('should return false when any percentage is non-zero', () => {
    expect(isZeroQualityDist({ cardinal_percentage: 33, fixed_percentage: 0 })).toBe(false)
  })
})

// ============================================================================
// computeElementDistribution Tests
// ============================================================================

describe('computeElementDistribution', () => {
  it('should return existing distribution when valid', () => {
    const chartData = createMockChartData({
      element_distribution: createMockElementDistribution({
        fire: 5,
        fire_percentage: 50,
      }),
    })

    const result = computeElementDistribution(chartData)

    expect(result?.fire).toBe(5)
    expect(result?.fire_percentage).toBe(50)
  })

  it('should calculate distribution from points when all percentages are zero', () => {
    const subject = createMockSubject({
      sun: { element: 'Fire' },
      moon: { element: 'Fire' },
      mercury: { element: 'Earth' },
      venus: { element: 'Air' },
    })
    const chartData = createMockChartData({
      subject: subject as unknown as ChartData['subject'],
      active_points: ['sun', 'moon', 'mercury', 'venus'],
      element_distribution: createMockElementDistribution({
        fire_percentage: 0,
        earth_percentage: 0,
        air_percentage: 0,
        water_percentage: 0,
      }),
    })

    const result = computeElementDistribution(chartData)

    expect(result?.fire).toBe(2)
    expect(result?.earth).toBe(1)
    expect(result?.air).toBe(1)
    expect(result?.water).toBe(0)
    expect(result?.fire_percentage).toBe(50)
    expect(result?.earth_percentage).toBe(25)
    expect(result?.air_percentage).toBe(25)
    expect(result?.water_percentage).toBe(0)
  })
})

// ============================================================================
// computeQualityDistribution Tests
// ============================================================================

describe('computeQualityDistribution', () => {
  it('should return existing distribution when valid', () => {
    const chartData = createMockChartData({
      quality_distribution: createMockQualityDistribution({
        cardinal: 5,
        cardinal_percentage: 50,
      }),
    })

    const result = computeQualityDistribution(chartData)

    expect(result?.cardinal).toBe(5)
    expect(result?.cardinal_percentage).toBe(50)
  })

  it('should calculate distribution from points when all percentages are zero', () => {
    const subject = createMockSubject({
      sun: { quality: 'Cardinal' },
      moon: { quality: 'Cardinal' },
      mercury: { quality: 'Fixed' },
      venus: { quality: 'Mutable' },
    })
    const chartData = createMockChartData({
      subject: subject as unknown as ChartData['subject'],
      active_points: ['sun', 'moon', 'mercury', 'venus'],
      quality_distribution: createMockQualityDistribution({
        cardinal_percentage: 0,
        fixed_percentage: 0,
        mutable_percentage: 0,
      }),
    })

    const result = computeQualityDistribution(chartData)

    expect(result?.cardinal).toBe(2)
    expect(result?.fixed).toBe(1)
    expect(result?.mutable).toBe(1)
    expect(result?.cardinal_percentage).toBe(50)
    expect(result?.fixed_percentage).toBe(25)
    expect(result?.mutable_percentage).toBe(25)
  })
})

// ============================================================================
// getPointsForCategory Tests
// ============================================================================

describe('getPointsForCategory', () => {
  it('should filter points by element', () => {
    const subject = createMockSubject({
      sun: { name: 'Sun', element: 'Fire' },
      moon: { name: 'Moon', element: 'Water' },
      mars: { name: 'Mars', element: 'Fire' },
    })

    const result = getPointsForCategory('element', 'Fire', ['sun', 'moon', 'mars'], subject)

    expect(result).toHaveLength(2)
    expect(result[0]!.name).toBe('Sun')
    expect(result[1]!.name).toBe('Mars')
  })

  it('should filter points by quality', () => {
    const subject = createMockSubject({
      sun: { name: 'Sun', quality: 'Fixed' },
      moon: { name: 'Moon', quality: 'Cardinal' },
      venus: { name: 'Venus', quality: 'Fixed' },
    })

    const result = getPointsForCategory('quality', 'Fixed', ['sun', 'moon', 'venus'], subject)

    expect(result).toHaveLength(2)
    expect(result[0]!.name).toBe('Sun')
    expect(result[1]!.name).toBe('Venus')
  })

  it('should return sorted points by canonical order', () => {
    const subject = createMockSubject({
      mars: { name: 'Mars', element: 'Fire' },
      sun: { name: 'Sun', element: 'Fire' },
    })

    const result = getPointsForCategory('element', 'Fire', ['mars', 'sun'], subject)

    // Sun should come before Mars in canonical order
    expect(result[0]!.name).toBe('Sun')
    expect(result[1]!.name).toBe('Mars')
  })
})

// ============================================================================
// prepareElementsRadarData Tests
// ============================================================================

describe('prepareElementsRadarData', () => {
  it('should prepare radar data for all four elements', () => {
    const elementDist = createMockElementDistribution({
      fire_percentage: 30,
      earth_percentage: 20,
      air_percentage: 25,
      water_percentage: 25,
    })
    const subject = createMockSubject()

    const result = prepareElementsRadarData(elementDist, undefined, ['sun', 'moon'], subject)

    expect(result).toHaveLength(4)
    expect(result[0]!.subject).toBe('Fire')
    expect(result[1]!.subject).toBe('Earth')
    expect(result[2]!.subject).toBe('Air')
    expect(result[3]!.subject).toBe('Water')
  })

  it('should include primary percentages', () => {
    const elementDist = createMockElementDistribution({
      fire_percentage: 40,
      earth_percentage: 20,
      air_percentage: 20,
      water_percentage: 20,
    })
    const subject = createMockSubject()

    const result = prepareElementsRadarData(elementDist, undefined, [], subject)

    expect(result[0]!.primary).toBe(40)
    expect(result[0]!.percentage).toBe(40)
  })

  it('should include secondary percentages when provided', () => {
    const primaryDist = createMockElementDistribution({ fire_percentage: 30 })
    const secondaryDist = createMockElementDistribution({ fire_percentage: 50 })
    const subject = createMockSubject()

    const result = prepareElementsRadarData(primaryDist, secondaryDist, [], subject, [], subject)

    expect(result[0]!.primary).toBe(30)
    expect(result[0]!.secondary).toBe(50)
    expect(result[0]!.secondaryPercentage).toBe(50)
  })

  it('should set fullMark to 100 for all elements', () => {
    const elementDist = createMockElementDistribution()
    const subject = createMockSubject()

    const result = prepareElementsRadarData(elementDist, undefined, [], subject)

    result.forEach((dataPoint) => {
      expect(dataPoint.fullMark).toBe(100)
    })
  })
})

// ============================================================================
// prepareQualitiesRadarData Tests
// ============================================================================

describe('prepareQualitiesRadarData', () => {
  it('should prepare radar data for all three qualities', () => {
    const qualityDist = createMockQualityDistribution({
      cardinal_percentage: 33,
      fixed_percentage: 34,
      mutable_percentage: 33,
    })
    const subject = createMockSubject()

    const result = prepareQualitiesRadarData(qualityDist, undefined, ['sun', 'moon'], subject)

    expect(result).toHaveLength(3)
    expect(result[0]!.subject).toBe('Cardinal')
    expect(result[1]!.subject).toBe('Fixed')
    expect(result[2]!.subject).toBe('Mutable')
  })

  it('should include primary percentages', () => {
    const qualityDist = createMockQualityDistribution({
      cardinal_percentage: 50,
      fixed_percentage: 25,
      mutable_percentage: 25,
    })
    const subject = createMockSubject()

    const result = prepareQualitiesRadarData(qualityDist, undefined, [], subject)

    expect(result[0]!.primary).toBe(50)
    expect(result[0]!.percentage).toBe(50)
  })

  it('should include secondary percentages when provided', () => {
    const primaryDist = createMockQualityDistribution({ cardinal_percentage: 30 })
    const secondaryDist = createMockQualityDistribution({ cardinal_percentage: 60 })
    const subject = createMockSubject()

    const result = prepareQualitiesRadarData(primaryDist, secondaryDist, [], subject, [], subject)

    expect(result[0]!.primary).toBe(30)
    expect(result[0]!.secondary).toBe(60)
    expect(result[0]!.secondaryPercentage).toBe(60)
  })

  it('should set fullMark to 100 for all qualities', () => {
    const qualityDist = createMockQualityDistribution()
    const subject = createMockSubject()

    const result = prepareQualitiesRadarData(qualityDist, undefined, [], subject)

    result.forEach((dataPoint) => {
      expect(dataPoint.fullMark).toBe(100)
    })
  })
})

// ============================================================================
// getChartColors Tests
// ============================================================================

describe('getChartColors', () => {
  it('should return light theme colors when isDark is false', () => {
    const colors = getChartColors(false)

    expect(colors.text).toBe('#64748b')
    expect(colors.grid).toBe('#e2e8f0')
  })

  it('should return dark theme colors when isDark is true', () => {
    const colors = getChartColors(true)

    expect(colors.text).toBe('#e2e8f0')
    expect(colors.grid).toBe('#475569')
  })

  it('should return consistent stroke and fill colors', () => {
    const lightColors = getChartColors(false)
    const darkColors = getChartColors(true)

    expect(lightColors.stroke).toBe('#8884d8')
    expect(lightColors.fill).toBe('#8884d8')
    expect(darkColors.stroke).toBe('#8884d8')
    expect(darkColors.fill).toBe('#8884d8')
  })
})

// ============================================================================
// getLunarPhaseData Tests
// ============================================================================

describe('getLunarPhaseData', () => {
  it('should return primary lunar phase for natal charts', () => {
    const chartData = createMockChartData({
      lunar_phase: {
        degrees_between_s_m: 45,
        moon_phase: 0.125,
        moon_emoji: '',
        moon_phase_name: 'Waxing Crescent',
      },
    })

    const result = getLunarPhaseData(chartData, 'natal')

    expect(result.lunarPhase?.moon_phase_name).toBe('Waxing Crescent')
  })

  it('should return second_subject lunar phase for return charts', () => {
    const chartData = createMockChartData({
      lunar_phase: {
        degrees_between_s_m: 45,
        moon_phase: 0.125,
        moon_emoji: '',
        moon_phase_name: 'Waxing Crescent',
      },
      second_subject: {
        lunar_phase: {
          degrees_between_s_m: 180,
          moon_phase: 0.5,
          moon_emoji: '',
          moon_phase_name: 'Full Moon',
        },
      } as unknown as ChartData['second_subject'],
    })

    const result = getLunarPhaseData(chartData, 'solar return')

    expect(result.lunarPhase?.moon_phase_name).toBe('Full Moon')
  })
})

// ============================================================================
// processChartData Tests
// ============================================================================

describe('processChartData', () => {
  it('should return ProcessedChartData with all required properties', () => {
    const response = createMockChartResponse()

    const result = processChartData(response, undefined, 'Natal', false)

    // Check all required properties exist
    expect(result).toHaveProperty('effectiveChartType')
    expect(result).toHaveProperty('primarySubject')
    expect(result).toHaveProperty('sortedActivePoints')
    expect(result).toHaveProperty('sortedSecondaryActivePoints')
    expect(result).toHaveProperty('elementsData')
    expect(result).toHaveProperty('qualitiesData')
    expect(result).toHaveProperty('chartColors')
    expect(result).toHaveProperty('radarColors')
  })

  it('should use provided chartType over chart_data.chart_type', () => {
    const response = createMockChartResponse()

    const result = processChartData(response, undefined, 'Transit', false)

    expect(result.effectiveChartType).toBe('Transit')
  })

  it('should fallback to chart_data.chart_type when chartType is undefined', () => {
    const response = createMockChartResponse({
      chart_data: createMockChartData({ chart_type: 'Synastry' }),
    })

    const result = processChartData(response, undefined, undefined, false)

    expect(result.effectiveChartType).toBe('Synastry')
  })

  it('should fallback to Natal when no chartType is available', () => {
    const chartData = createMockChartData()
    // @ts-expect-error - Intentionally removing chart_type for test
    delete chartData.chart_type
    const response = createMockChartResponse({ chart_data: chartData })

    const result = processChartData(response, undefined, undefined, false)

    expect(result.effectiveChartType).toBe('Natal')
  })

  it('should include sorted active points', () => {
    const response = createMockChartResponse()

    const result = processChartData(response, undefined, 'Natal', false)

    expect(result.sortedActivePoints).toBeDefined()
    expect(Array.isArray(result.sortedActivePoints)).toBe(true)
  })

  it('should process secondary chart data when provided', () => {
    const primaryResponse = createMockChartResponse()
    const secondaryResponse = createMockChartResponse()

    const result = processChartData(primaryResponse, secondaryResponse, 'Synastry', false)

    expect(result.secondaryChartData).toBeDefined()
    expect(result.secondaryElementDist).toBeDefined()
    expect(result.secondaryQualityDist).toBeDefined()
    expect(result.sortedSecondaryActivePoints.length).toBeGreaterThan(0)
  })

  it('should generate elements radar data with four elements', () => {
    const response = createMockChartResponse()

    const result = processChartData(response, undefined, 'Natal', false)

    expect(result.elementsData).toHaveLength(4)
    expect(result.elementsData.map((d) => d.subject)).toEqual(['Fire', 'Earth', 'Air', 'Water'])
  })

  it('should generate qualities radar data with three qualities', () => {
    const response = createMockChartResponse()

    const result = processChartData(response, undefined, 'Natal', false)

    expect(result.qualitiesData).toHaveLength(3)
    expect(result.qualitiesData.map((d) => d.subject)).toEqual(['Cardinal', 'Fixed', 'Mutable'])
  })

  it('should apply dark theme colors when isDark is true', () => {
    const response = createMockChartResponse()

    const result = processChartData(response, undefined, 'Natal', true)

    expect(result.chartColors.text).toBe('#e2e8f0')
    expect(result.chartColors.grid).toBe('#475569')
  })

  it('should apply light theme colors when isDark is false', () => {
    const response = createMockChartResponse()

    const result = processChartData(response, undefined, 'Natal', false)

    expect(result.chartColors.text).toBe('#64748b')
    expect(result.chartColors.grid).toBe('#e2e8f0')
  })

  it('should include radar colors in result', () => {
    const response = createMockChartResponse()

    const result = processChartData(response, undefined, 'Natal', false)

    expect(result.radarColors).toBeDefined()
    expect(result.radarColors).toHaveProperty('primaryFill')
    expect(result.radarColors).toHaveProperty('primaryStroke')
    expect(result.radarColors).toHaveProperty('secondaryFill')
    expect(result.radarColors).toHaveProperty('secondaryStroke')
  })

  it('should extract primarySubject from subject field', () => {
    const subject = createMockSubject()
    const response = createMockChartResponse({
      chart_data: createMockChartData({
        subject: subject as unknown as ChartData['subject'],
      }),
    })

    const result = processChartData(response, undefined, 'Natal', false)

    expect(result.primarySubject).toBeDefined()
  })

  it('should extract secondarySubject when available', () => {
    const secondSubject = createMockSubject()
    const response = createMockChartResponse({
      chart_data: createMockChartData({
        second_subject: secondSubject as unknown as ChartData['second_subject'],
      }),
    })

    const result = processChartData(response, undefined, 'Synastry', false)

    expect(result.secondarySubject).toBeDefined()
  })
})

// ============================================================================
// getSubjectPoint Tests
// ============================================================================

describe('getSubjectPoint', () => {
  it('should return a Point for a valid key', () => {
    const subject = createMockSubject()
    const chartSubject = subject as unknown as ChartData['subject']

    const point = getSubjectPoint(chartSubject, 'sun')

    expect(point).toBeDefined()
    expect(point!.name).toBe('Sun')
    expect(point!.sign).toBe('Leo')
  })

  it('should return undefined for a non-existent key', () => {
    const subject = createMockSubject()
    const chartSubject = subject as unknown as ChartData['subject']

    const point = getSubjectPoint(chartSubject, 'nonexistent')

    expect(point).toBeUndefined()
  })

  it('should access all core planets', () => {
    const subject = createMockSubject()
    const chartSubject = subject as unknown as ChartData['subject']

    const coreKeys = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']
    for (const key of coreKeys) {
      const point = getSubjectPoint(chartSubject, key)
      expect(point).toBeDefined()
      expect(point!.sign).toBeTruthy()
    }
  })

  it('should return a value with Point-compatible properties', () => {
    const subject = createMockSubject({
      moon: {
        name: 'Moon',
        sign: 'Cancer',
        element: 'Water',
        quality: 'Cardinal',
      },
    })
    const chartSubject = subject as unknown as ChartData['subject']

    const point = getSubjectPoint(chartSubject, 'moon')

    expect(point).toBeDefined()
    expect(point!.name).toBe('Moon')
    expect(point!.sign).toBe('Cancer')
    expect(typeof point!.position).toBe('number')
    expect(typeof point!.emoji).toBe('string')
  })

  it('should work with lowercased point keys from active_points', () => {
    const subject = createMockSubject()
    const chartSubject = subject as unknown as ChartData['subject']

    // Simulating the pattern used in ChartDataView.tsx
    const pointKey = 'Sun'
    const key = pointKey.toLowerCase().replace(/_/g, '_')
    const point = getSubjectPoint(chartSubject, key)

    expect(point).toBeDefined()
    expect(point!.name).toBe('Sun')
  })
})

// ============================================================================
// isPointKey Tests
// ============================================================================

describe('isPointKey', () => {
  it('should return true for core planet keys', () => {
    const coreKeys = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto']
    for (const key of coreKeys) {
      expect(isPointKey(key)).toBe(true)
    }
  })

  it('should return true for optional point keys', () => {
    const optionalKeys = [
      'chiron', 'mean_lilith', 'true_north_lunar_node', 'ascendant',
      'medium_coeli', 'vertex', 'pars_fortunae', 'ceres', 'sedna',
    ]
    for (const key of optionalKeys) {
      expect(isPointKey(key)).toBe(true)
    }
  })

  it('should return true for house keys', () => {
    const houseKeys = [
      'first_house', 'second_house', 'third_house', 'fourth_house',
      'fifth_house', 'sixth_house', 'seventh_house', 'eighth_house',
      'ninth_house', 'tenth_house', 'eleventh_house', 'twelfth_house',
    ]
    for (const key of houseKeys) {
      expect(isPointKey(key)).toBe(true)
    }
  })

  it('should return false for non-point keys', () => {
    expect(isPointKey('nonexistent')).toBe(false)
    expect(isPointKey('name')).toBe(false)
    expect(isPointKey('year')).toBe(false)
    expect(isPointKey('city')).toBe(false)
    expect(isPointKey('lunar_phase')).toBe(false)
  })

  it('should return false for empty string', () => {
    expect(isPointKey('')).toBe(false)
  })

  it('should return false for keys with wrong casing', () => {
    expect(isPointKey('Sun')).toBe(false)
    expect(isPointKey('MOON')).toBe(false)
    expect(isPointKey('Mercury')).toBe(false)
  })
})

// ============================================================================
// getSubjectPoint type safety Tests
// ============================================================================

describe('getSubjectPoint type safety', () => {
  it('should return undefined for SubjectModel property keys', () => {
    const subject = createMockSubject()
    const chartSubject = subject as unknown as ChartData['subject']

    // 'name', 'year', etc. are SubjectModel keys, not Point keys
    expect(getSubjectPoint(chartSubject, 'name')).toBeUndefined()
    expect(getSubjectPoint(chartSubject, 'year')).toBeUndefined()
    expect(getSubjectPoint(chartSubject, 'city')).toBeUndefined()
  })

  it('should return undefined for lunar_phase key', () => {
    const subject = createMockSubject()
    const chartSubject = subject as unknown as ChartData['subject']

    expect(getSubjectPoint(chartSubject, 'lunar_phase')).toBeUndefined()
  })

  it('should return undefined for arbitrary invalid keys', () => {
    const subject = createMockSubject()
    const chartSubject = subject as unknown as ChartData['subject']

    expect(getSubjectPoint(chartSubject, '__proto__')).toBeUndefined()
    expect(getSubjectPoint(chartSubject, 'constructor')).toBeUndefined()
    expect(getSubjectPoint(chartSubject, 'toString')).toBeUndefined()
  })

  it('should accept all valid PointKey values', () => {
    // Compile-time check: PointKey can be assigned to string
    const key: PointKey = 'sun'
    expect(isPointKey(key)).toBe(true)
  })
})

// ============================================================================
// ChartSubject Type Tests
// ============================================================================

describe('ChartSubject Type', () => {
  it('should accept Record<string, ChartPoint> for testing', () => {
    const mockSubject: Record<string, ChartPoint> = {
      sun: createMockChartPoint({ name: 'Sun', element: 'Fire', quality: 'Fixed' }),
      moon: createMockChartPoint({ name: 'Moon', element: 'Water', quality: 'Cardinal' }),
    }

    const result = sortActivePoints(['moon', 'sun'], mockSubject)

    expect(result[0]).toBe('sun')
    expect(result[1]).toBe('moon')
  })

  it('should correctly filter points with typed ChartSubject', () => {
    const mockSubject: Record<string, ChartPoint> = {
      sun: createMockChartPoint({ name: 'Sun', element: 'Fire', quality: 'Fixed' }),
      moon: createMockChartPoint({ name: 'Moon', element: 'Water', quality: 'Cardinal' }),
      mars: createMockChartPoint({ name: 'Mars', element: 'Fire', quality: 'Cardinal' }),
    }

    const firePoints = getPointsForCategory('element', 'Fire', ['sun', 'moon', 'mars'], mockSubject)

    expect(firePoints).toHaveLength(2)
    expect(firePoints.map((p) => p.name)).toContain('Sun')
    expect(firePoints.map((p) => p.name)).toContain('Mars')
  })

  it('should calculate element distribution with typed ChartSubject', () => {
    const mockSubject: Record<string, ChartPoint> = {
      sun: createMockChartPoint({ element: 'Fire' }),
      moon: createMockChartPoint({ element: 'Water' }),
      venus: createMockChartPoint({ element: 'Earth' }),
    }

    const result = calculateElementDistFromPoints(mockSubject, ['sun', 'moon', 'venus'])

    expect(result.fire).toBe(1)
    expect(result.water).toBe(1)
    expect(result.earth).toBe(1)
    expect(result.air).toBe(0)
  })

  it('should calculate quality distribution with typed ChartSubject', () => {
    const mockSubject: Record<string, ChartPoint> = {
      sun: createMockChartPoint({ quality: 'Fixed' }),
      moon: createMockChartPoint({ quality: 'Cardinal' }),
      mercury: createMockChartPoint({ quality: 'Mutable' }),
    }

    const result = calculateQualityDistFromPoints(mockSubject, ['sun', 'moon', 'mercury'])

    expect(result.cardinal).toBe(1)
    expect(result.fixed).toBe(1)
    expect(result.mutable).toBe(1)
  })
})
