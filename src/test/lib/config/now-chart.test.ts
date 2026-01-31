/**
 * Unit Tests for Now Chart Configuration
 *
 * Tests the default location configuration for the Now Chart feature.
 *
 * @module src/lib/config/now-chart
 */
import { describe, it, expect } from 'vitest'
import { DEFAULT_NOW_CHART_LOCATION, getNowChartDefaultLocation } from '@/lib/config/now-chart'

// ============================================================================
// DEFAULT_NOW_CHART_LOCATION Tests
// ============================================================================

describe('DEFAULT_NOW_CHART_LOCATION', () => {
  it('should have Greenwich as the default city', () => {
    expect(DEFAULT_NOW_CHART_LOCATION.city).toBe('Greenwich')
  })

  it('should have GB as the default nation', () => {
    expect(DEFAULT_NOW_CHART_LOCATION.nation).toBe('GB')
  })

  it('should have correct Greenwich Observatory latitude', () => {
    expect(DEFAULT_NOW_CHART_LOCATION.latitude).toBe(51.477928)
  })

  it('should have correct Greenwich Observatory longitude', () => {
    expect(DEFAULT_NOW_CHART_LOCATION.longitude).toBe(-0.001545)
  })

  it('should have Etc/UTC as the default timezone', () => {
    expect(DEFAULT_NOW_CHART_LOCATION.timezone).toBe('Etc/UTC')
  })

  it('should have all required location properties defined', () => {
    expect(DEFAULT_NOW_CHART_LOCATION.city).toBeDefined()
    expect(DEFAULT_NOW_CHART_LOCATION.nation).toBeDefined()
    expect(DEFAULT_NOW_CHART_LOCATION.latitude).toBeDefined()
    expect(DEFAULT_NOW_CHART_LOCATION.longitude).toBeDefined()
    expect(DEFAULT_NOW_CHART_LOCATION.timezone).toBeDefined()
  })
})

// ============================================================================
// getNowChartDefaultLocation Tests
// ============================================================================

describe('getNowChartDefaultLocation', () => {
  it('should return a copy of the default location', () => {
    const location = getNowChartDefaultLocation()

    expect(location.city).toBe('Greenwich')
    expect(location.nation).toBe('GB')
    expect(location.latitude).toBe(51.477928)
    expect(location.longitude).toBe(-0.001545)
    expect(location.timezone).toBe('Etc/UTC')
  })

  it('should return a new object each time (not the same reference)', () => {
    const location1 = getNowChartDefaultLocation()
    const location2 = getNowChartDefaultLocation()

    expect(location1).not.toBe(location2)
    expect(location1).toEqual(location2)
  })

  it('should return an object that can be mutated without affecting the original', () => {
    const location = getNowChartDefaultLocation()
    location.city = 'London'

    expect(location.city).toBe('London')
    expect(DEFAULT_NOW_CHART_LOCATION.city).toBe('Greenwich')
  })
})
