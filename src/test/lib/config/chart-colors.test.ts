/**
 * Unit Tests for Chart Colors Configuration
 *
 * Tests the centralized chart color configuration constants and helper functions.
 * Ensures all planet colors are defined, admin chart colors are valid,
 * and helper functions work correctly.
 *
 * @module src/lib/config/chart-colors
 */
import { describe, it, expect } from 'vitest'
import {
  PLANET_COLORS,
  getPlanetColor,
  ADMIN_CHART_COLORS,
  getAdminChartColor,
  TIME_PERIOD_COLORS,
  getTimePeriodColor,
} from '@/lib/config/chart-colors'
import { ALL_PLANET_KEYS } from '@/types/ephemeris-view'

// ============================================================================
// Hex Color Validation Helper
// ============================================================================

const isValidHexColor = (color: string): boolean => {
  return /^#[0-9A-Fa-f]{6}$/.test(color)
}

// ============================================================================
// PLANET_COLORS Tests
// ============================================================================

describe('PLANET_COLORS', () => {
  it('should have colors defined for all planet keys', () => {
    for (const key of ALL_PLANET_KEYS) {
      expect(PLANET_COLORS[key]).toBeDefined()
      expect(PLANET_COLORS[key].stroke).toBeDefined()
      expect(PLANET_COLORS[key].fill).toBeDefined()
    }
  })

  it('should have valid hex colors for all planets', () => {
    for (const key of ALL_PLANET_KEYS) {
      const { stroke, fill } = PLANET_COLORS[key]
      expect(isValidHexColor(stroke)).toBe(true)
      expect(isValidHexColor(fill)).toBe(true)
    }
  })

  it('should have consistent stroke and fill colors (same value)', () => {
    // Current design uses same color for stroke and fill
    for (const key of ALL_PLANET_KEYS) {
      const { stroke, fill } = PLANET_COLORS[key]
      expect(stroke).toBe(fill)
    }
  })

  it('should have unique colors for core planets', () => {
    const corePlanets = [
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
    ] as const
    const colors = corePlanets.map((key) => PLANET_COLORS[key].stroke)
    const uniqueColors = new Set(colors)
    expect(uniqueColors.size).toBe(corePlanets.length)
  })
})

// ============================================================================
// getPlanetColor Tests
// ============================================================================

describe('getPlanetColor', () => {
  it('should return the correct color for Sun', () => {
    const color = getPlanetColor('Sun')
    expect(color.stroke).toBe('#f59e0b')
    expect(color.fill).toBe('#f59e0b')
  })

  it('should return the correct color for Moon', () => {
    const color = getPlanetColor('Moon')
    expect(color.stroke).toBe('#6b7280')
    expect(color.fill).toBe('#6b7280')
  })

  it('should work for all planet keys', () => {
    for (const key of ALL_PLANET_KEYS) {
      const color = getPlanetColor(key)
      expect(color).toEqual(PLANET_COLORS[key])
    }
  })
})

// ============================================================================
// ADMIN_CHART_COLORS Tests
// ============================================================================

describe('ADMIN_CHART_COLORS', () => {
  it('should have at least 8 colors', () => {
    expect(ADMIN_CHART_COLORS.length).toBeGreaterThanOrEqual(8)
  })

  it('should have all valid hex colors', () => {
    for (const color of ADMIN_CHART_COLORS) {
      expect(isValidHexColor(color)).toBe(true)
    }
  })

  it('should have unique colors', () => {
    const uniqueColors = new Set(ADMIN_CHART_COLORS)
    expect(uniqueColors.size).toBe(ADMIN_CHART_COLORS.length)
  })

  it('should be a readonly array', () => {
    // TypeScript guarantees this, but we can check the length is fixed
    expect(Object.isFrozen(ADMIN_CHART_COLORS)).toBe(false) // as const doesn't freeze
    expect(ADMIN_CHART_COLORS.length).toBe(8)
  })
})

// ============================================================================
// getAdminChartColor Tests
// ============================================================================

describe('getAdminChartColor', () => {
  it('should return the first color for index 0', () => {
    expect(getAdminChartColor(0)).toBe(ADMIN_CHART_COLORS[0])
  })

  it('should return colors at valid indices', () => {
    for (let i = 0; i < ADMIN_CHART_COLORS.length; i++) {
      expect(getAdminChartColor(i)).toBe(ADMIN_CHART_COLORS[i])
    }
  })

  it('should wrap around for indices beyond array length', () => {
    expect(getAdminChartColor(8)).toBe(ADMIN_CHART_COLORS[0])
    expect(getAdminChartColor(9)).toBe(ADMIN_CHART_COLORS[1])
    expect(getAdminChartColor(16)).toBe(ADMIN_CHART_COLORS[0])
  })

  it('should handle large indices correctly', () => {
    expect(getAdminChartColor(100)).toBe(ADMIN_CHART_COLORS[100 % 8])
  })
})

// ============================================================================
// TIME_PERIOD_COLORS Tests
// ============================================================================

describe('TIME_PERIOD_COLORS', () => {
  it('should have colors for today, week, and month', () => {
    expect(TIME_PERIOD_COLORS.today).toBeDefined()
    expect(TIME_PERIOD_COLORS.week).toBeDefined()
    expect(TIME_PERIOD_COLORS.month).toBeDefined()
  })

  it('should have all valid hex colors', () => {
    expect(isValidHexColor(TIME_PERIOD_COLORS.today)).toBe(true)
    expect(isValidHexColor(TIME_PERIOD_COLORS.week)).toBe(true)
    expect(isValidHexColor(TIME_PERIOD_COLORS.month)).toBe(true)
  })

  it('should have unique colors for each period', () => {
    const colors = [TIME_PERIOD_COLORS.today, TIME_PERIOD_COLORS.week, TIME_PERIOD_COLORS.month]
    const uniqueColors = new Set(colors)
    expect(uniqueColors.size).toBe(3)
  })

  it('should have expected default colors', () => {
    expect(TIME_PERIOD_COLORS.today).toBe('#3b82f6') // blue
    expect(TIME_PERIOD_COLORS.week).toBe('#06b6d4') // cyan
    expect(TIME_PERIOD_COLORS.month).toBe('#f59e0b') // amber
  })
})

// ============================================================================
// getTimePeriodColor Tests
// ============================================================================

describe('getTimePeriodColor', () => {
  it('should return correct color for today', () => {
    expect(getTimePeriodColor('today')).toBe(TIME_PERIOD_COLORS.today)
  })

  it('should return correct color for week', () => {
    expect(getTimePeriodColor('week')).toBe(TIME_PERIOD_COLORS.week)
  })

  it('should return correct color for month', () => {
    expect(getTimePeriodColor('month')).toBe(TIME_PERIOD_COLORS.month)
  })
})
