/**
 * Unit Tests for chart helper functions
 *
 * Tests getSubChartData which constructs minimal ChartResponse objects
 * for SynastryChart sub-components in planetary return views.
 *
 * @module src/lib/chart/helpers
 */
import { describe, it, expect } from 'vitest'
import { getSubChartData } from '@/lib/chart/helpers'
import type { EnrichedSubjectModel } from '@/types/astrology'

// Minimal mock for EnrichedSubjectModel - only the fields getSubChartData uses
const mockPoint = {
  name: 'Sun',
  quality: 'fixed',
  element: 'fire',
  sign: 'Leo',
  sign_num: 5,
  position: 15.5,
  abs_pos: 135.5,
  emoji: '♌',
  is_retrograde: false,
  house: 'First_House',
}

const baseSubject: EnrichedSubjectModel = {
  name: 'Test Subject',
  year: 1990,
  month: 6,
  day: 15,
  hour: 12,
  minute: 30,
  city: 'London',
  nation: 'GB',
  sun: mockPoint,
  moon: { ...mockPoint, name: 'Moon', sign: 'Cancer', element: 'water' },
  mercury: { ...mockPoint, name: 'Mercury' },
  venus: { ...mockPoint, name: 'Venus' },
  mars: { ...mockPoint, name: 'Mars' },
  jupiter: { ...mockPoint, name: 'Jupiter' },
  saturn: { ...mockPoint, name: 'Saturn' },
  uranus: { ...mockPoint, name: 'Uranus' },
  neptune: { ...mockPoint, name: 'Neptune' },
  pluto: { ...mockPoint, name: 'Pluto' },
  first_house: mockPoint,
  second_house: mockPoint,
  third_house: mockPoint,
  fourth_house: mockPoint,
  fifth_house: mockPoint,
  sixth_house: mockPoint,
  seventh_house: mockPoint,
  eighth_house: mockPoint,
  ninth_house: mockPoint,
  tenth_house: mockPoint,
  eleventh_house: mockPoint,
  twelfth_house: mockPoint,
} as EnrichedSubjectModel

describe('getSubChartData', () => {
  it('should return a ChartResponse with status OK', () => {
    const result = getSubChartData(baseSubject)
    expect(result.status).toBe('OK')
  })

  it('should set the subject on chart_data', () => {
    const result = getSubChartData(baseSubject)
    expect(result.chart_data.subject).toBe(baseSubject)
  })

  it('should set chart_type to Natal', () => {
    const result = getSubChartData(baseSubject)
    expect(result.chart_data.chart_type).toBe('Natal')
  })

  it('should set empty aspects array', () => {
    const result = getSubChartData(baseSubject)
    expect(result.chart_data.aspects).toEqual([])
  })

  it('should set zeroed element_distribution', () => {
    const result = getSubChartData(baseSubject)
    expect(result.chart_data.element_distribution).toEqual({
      fire: 0,
      earth: 0,
      air: 0,
      water: 0,
      fire_percentage: 0,
      earth_percentage: 0,
      air_percentage: 0,
      water_percentage: 0,
    })
  })

  it('should set zeroed quality_distribution', () => {
    const result = getSubChartData(baseSubject)
    expect(result.chart_data.quality_distribution).toEqual({
      cardinal: 0,
      fixed: 0,
      mutable: 0,
      cardinal_percentage: 0,
      fixed_percentage: 0,
      mutable_percentage: 0,
    })
  })

  it('should use provided activePoints', () => {
    const activePoints = ['Sun', 'Moon', 'Mercury']
    const result = getSubChartData(baseSubject, activePoints)
    expect(result.chart_data.active_points).toEqual(activePoints)
  })

  it('should default active_points to empty array when not provided', () => {
    const result = getSubChartData(baseSubject)
    expect(result.chart_data.active_points).toEqual([])
  })

  it('should default active_points to empty array when undefined', () => {
    const result = getSubChartData(baseSubject, undefined)
    expect(result.chart_data.active_points).toEqual([])
  })

  it('should use lunar_phase from subject when available', () => {
    const lunarPhase = {
      degrees_between_s_m: 45.5,
      moon_phase: 3,
      moon_emoji: '🌓',
      moon_phase_name: 'First Quarter',
    }
    const subjectWithLunarPhase = { ...baseSubject, lunar_phase: lunarPhase }
    const result = getSubChartData(subjectWithLunarPhase)
    expect(result.chart_data.lunar_phase).toEqual(lunarPhase)
  })

  it('should use default lunar_phase when subject has none', () => {
    const subjectWithoutLunarPhase = { ...baseSubject }
    delete (subjectWithoutLunarPhase as Partial<typeof subjectWithoutLunarPhase>).lunar_phase
    const result = getSubChartData(subjectWithoutLunarPhase as EnrichedSubjectModel)
    expect(result.chart_data.lunar_phase).toEqual({
      degrees_between_s_m: 0,
      moon_phase: 0,
      moon_emoji: '',
      moon_phase_name: '',
    })
  })

  it('should set empty arrays for active_aspects and houses_names_list', () => {
    const result = getSubChartData(baseSubject)
    expect(result.chart_data.active_aspects).toEqual([])
    expect(result.chart_data.houses_names_list).toEqual([])
  })
})
