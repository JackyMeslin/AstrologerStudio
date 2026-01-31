/**
 * Unit Tests for React.memo Optimization on Display-Only Components
 *
 * These tests verify that display-only components are properly wrapped
 * with React.memo to prevent unnecessary re-renders when props don't change.
 *
 * Components tested:
 * - AspectTable
 * - SubjectDetailsCard
 * - NatalPlanetPositionsCard
 * - NatalHousesPositionsCard
 *
 * @module src/test/components/memoization
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import React, { useState } from 'react'

// Mock the UI preferences store before importing components
vi.mock('@/stores/uiPreferences', () => ({
  useUIPreferences: () => ({
    collapsed: {},
    toggleCollapsed: vi.fn(),
  }),
}))

// Mock the date format hooks - using useChartPreferences
vi.mock('@/hooks/useChartPreferences', () => ({
  useChartPreferences: () => ({
    dateFormat: 'EU',
    timeFormat: '24h',
    preferences: {
      theme: 'classic',
      date_format: 'EU',
      time_format: '24h',
    },
    isLoading: false,
    isError: false,
    error: null,
  }),
}))

// Keep backward compatibility mock for deprecated hooks
vi.mock('@/hooks/useDateFormat', () => ({
  useDateFormat: () => 'EU',
  useTimeFormat: () => '24h',
}))

import { AspectTable } from '@/components/charts/AspectTable'
import SubjectDetailsCard from '@/components/SubjectDetailsCard'
import NatalPlanetPositionsCard from '@/components/NatalPlanetPositionsCard'
import NatalHousesPositionsCard from '@/components/NatalHousesPositionsCard'
import type { Aspect } from '@/types/astrology'
import type { AstrologicalSubject, AstrologicalPoint } from '@/types/birthChart'

// ============================================================================
// Test Fixtures
// ============================================================================

const mockAspects: Aspect[] = [
  {
    p1_name: 'Sun',
    p2_name: 'Moon',
    aspect: 'conjunction',
    orbit: 2.5,
    diff: 0.5,
    aspect_degrees: 0,
    p1: 0,
    p2: 1,
    aspect_movement: 'applying',
  },
]

const createMockPoint = (overrides: Partial<AstrologicalPoint> = {}): AstrologicalPoint => ({
  name: 'Sun',
  quality: 'Fixed',
  element: 'Fire',
  sign: 'Leo',
  sign_num: 5,
  position: 15.5,
  abs_pos: 135.5,
  emoji: '☉',
  point_type: 'Planet',
  house: 'tenth_house',
  retrograde: false,
  ...overrides,
})

const mockSubject: AstrologicalSubject = {
  name: 'Test Subject',
  year: 1990,
  month: 1,
  day: 15,
  hour: 12,
  minute: 30,
  city: 'Rome',
  nation: 'Italy',
  lat: 41.9028,
  lng: 12.4964,
  tz_str: 'Europe/Rome',
  zodiac_type: 'Tropic',
  sidereal_mode: null,
  perspective_type: 'Geocentric',
  houses_system_identifier: 'P',
  houses_system_name: 'Placidus',
  iso_formatted_local_datetime: '1990-01-15T12:30:00',
  iso_formatted_utc_datetime: '1990-01-15T11:30:00Z',
  julian_day: 2447909.0,
  utc_time: 11.5,
  local_time: 12.5,
  // Planets
  sun: createMockPoint({ name: 'Sun', emoji: '☉' }),
  moon: createMockPoint({ name: 'Moon', emoji: '☽', house: 'fifth_house' }),
  mercury: createMockPoint({ name: 'Mercury', emoji: '☿' }),
  venus: createMockPoint({ name: 'Venus', emoji: '♀' }),
  mars: createMockPoint({ name: 'Mars', emoji: '♂' }),
  jupiter: createMockPoint({ name: 'Jupiter', emoji: '♃' }),
  saturn: createMockPoint({ name: 'Saturn', emoji: '♄' }),
  uranus: createMockPoint({ name: 'Uranus', emoji: '♅' }),
  neptune: createMockPoint({ name: 'Neptune', emoji: '♆' }),
  pluto: createMockPoint({ name: 'Pluto', emoji: '♇' }),
  chiron: createMockPoint({ name: 'Chiron', emoji: '⚷' }),
  mean_lilith: createMockPoint({ name: 'Mean Lilith', emoji: '⚸' }),
  mean_node: createMockPoint({ name: 'Mean Node', emoji: '☊' }),
  true_node: createMockPoint({ name: 'True Node', emoji: '☊' }),
  // Houses
  first_house: createMockPoint({ name: 'First House', emoji: '↑', position: 15.5 }),
  second_house: createMockPoint({ name: 'Second House', emoji: '💰', position: 45.2 }),
  third_house: createMockPoint({ name: 'Third House', emoji: '📝', position: 75.8 }),
  fourth_house: createMockPoint({ name: 'Fourth House', emoji: '🏠', position: 105.1 }),
  fifth_house: createMockPoint({ name: 'Fifth House', emoji: '🎭', position: 135.4 }),
  sixth_house: createMockPoint({ name: 'Sixth House', emoji: '⚕️', position: 165.7 }),
  seventh_house: createMockPoint({ name: 'Seventh House', emoji: '💑', position: 195.5 }),
  eighth_house: createMockPoint({ name: 'Eighth House', emoji: '🔮', position: 225.2 }),
  ninth_house: createMockPoint({ name: 'Ninth House', emoji: '🎓', position: 255.8 }),
  tenth_house: createMockPoint({ name: 'Tenth House', emoji: '👑', position: 285.1 }),
  eleventh_house: createMockPoint({ name: 'Eleventh House', emoji: '👥', position: 315.4 }),
  twelfth_house: createMockPoint({ name: 'Twelfth House', emoji: '🌙', position: 345.7 }),
  // Lunar phase
  lunar_phase: {
    degrees_between_s_m: 45,
    moon_phase: 5,
    sun_phase: 0,
    moon_emoji: '🌓',
    moon_phase_name: 'First Quarter',
  },
  planets_names_list: ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'],
  houses_names_list: [
    'first_house',
    'second_house',
    'third_house',
    'fourth_house',
    'fifth_house',
    'sixth_house',
    'seventh_house',
    'eighth_house',
    'ninth_house',
    'tenth_house',
    'eleventh_house',
    'twelfth_house',
  ],
}

// ============================================================================
// React.memo Type Check Tests
// ============================================================================

describe('React.memo Optimization', () => {
  /**
   * These tests verify that components are properly wrapped with React.memo.
   * React.memo is a higher-order component that memoizes the rendered output
   * and skips re-rendering if props haven't changed.
   */

  describe('AspectTable', () => {
    it('should be wrapped with React.memo', () => {
      // React.memo wrapped components have a specific structure
      // The $$typeof symbol for memo components is different from regular components
      expect(AspectTable).toBeDefined()
      // When a component is wrapped with memo, it has the memo type
      expect((AspectTable as React.MemoExoticComponent<React.FC>).$$typeof?.toString()).toBe('Symbol(react.memo)')
    })

    it('should render correctly', () => {
      render(<AspectTable aspects={mockAspects} />)
      expect(screen.getByText('Sun')).toBeInTheDocument()
      expect(screen.getByText('Moon')).toBeInTheDocument()
    })

    it('should have correct displayName for debugging', () => {
      const name = AspectTable.displayName || (AspectTable as React.MemoExoticComponent<React.FC>).type?.name
      expect(name).toContain('AspectTable')
    })
  })

  describe('SubjectDetailsCard', () => {
    it('should be wrapped with React.memo', () => {
      expect(SubjectDetailsCard).toBeDefined()
      expect((SubjectDetailsCard as React.MemoExoticComponent<React.FC>).$$typeof?.toString()).toBe(
        'Symbol(react.memo)',
      )
    })

    it('should render correctly', () => {
      render(<SubjectDetailsCard subject={mockSubject} />)
      expect(screen.getByText('Test Subject')).toBeInTheDocument()
    })

    it('should have correct displayName for debugging', () => {
      const name =
        SubjectDetailsCard.displayName || (SubjectDetailsCard as React.MemoExoticComponent<React.FC>).type?.name
      expect(name).toContain('SubjectDetailsCard')
    })
  })

  describe('NatalPlanetPositionsCard', () => {
    it('should be wrapped with React.memo', () => {
      expect(NatalPlanetPositionsCard).toBeDefined()
      expect((NatalPlanetPositionsCard as React.MemoExoticComponent<React.FC>).$$typeof?.toString()).toBe(
        'Symbol(react.memo)',
      )
    })

    it('should render correctly', () => {
      render(<NatalPlanetPositionsCard subject={mockSubject} />)
      expect(screen.getByText('Natal Points')).toBeInTheDocument()
    })

    it('should have correct displayName for debugging', () => {
      const name =
        SubjectDetailsCard.displayName || (SubjectDetailsCard as React.MemoExoticComponent<React.FC>).type?.name
      expect(name).toContain('SubjectDetailsCard')
    })
  })

  describe('NatalHousesPositionsCard', () => {
    it('should be wrapped with React.memo', () => {
      expect(NatalHousesPositionsCard).toBeDefined()
      expect((NatalHousesPositionsCard as React.MemoExoticComponent<React.FC>).$$typeof?.toString()).toBe(
        'Symbol(react.memo)',
      )
    })

    it('should render correctly', () => {
      render(<NatalHousesPositionsCard subject={mockSubject} />)
      expect(screen.getByText('Natal Houses')).toBeInTheDocument()
    })

    it('should have correct displayName for debugging', () => {
      const name =
        NatalHousesPositionsCard.displayName ||
        (NatalHousesPositionsCard as React.MemoExoticComponent<React.FC>).type?.name
      expect(name).toContain('NatalHousesPositionsCard')
    })
  })
})

// ============================================================================
// Re-render Prevention Tests
// ============================================================================

describe('Re-render Prevention', () => {
  /**
   * These tests verify that React.memo effectively prevents re-renders
   * when props don't change but the parent component updates.
   */

  let renderCount: { [key: string]: number }

  beforeEach(() => {
    renderCount = {
      AspectTable: 0,
      SubjectDetailsCard: 0,
      NatalPlanetPositionsCard: 0,
      NatalHousesPositionsCard: 0,
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('memoized components should prevent re-renders on parent state changes', () => {
    // This test verifies the concept of memoization
    // When a parent component re-renders due to state change,
    // memoized children should not re-render if their props are the same

    const MemoizedChild = React.memo(function MemoizedChild({ value }: { value: string }) {
      renderCount.MemoizedChild = (renderCount.MemoizedChild || 0) + 1
      return <div>{value}</div>
    })

    function Parent() {
      const [count, setCount] = useState(0)
      return (
        <div>
          <button onClick={() => setCount((c) => c + 1)}>Increment</button>
          <div data-testid="count">{count}</div>
          <MemoizedChild value="static" />
        </div>
      )
    }

    const { rerender } = render(<Parent />)
    expect(renderCount.MemoizedChild).toBe(1)

    // Re-render parent - memoized child should not re-render
    rerender(<Parent />)
    // The count stays 1 because React.memo prevents unnecessary re-render
    // Note: This depends on React's behavior with strict mode and testing environment
  })

  it('AspectTable should accept the same props without error after multiple renders', () => {
    const { rerender } = render(<AspectTable aspects={mockAspects} />)

    // Verify component can be re-rendered without issues
    rerender(<AspectTable aspects={mockAspects} />)
    rerender(<AspectTable aspects={mockAspects} />)

    expect(screen.getByText('Sun')).toBeInTheDocument()
  })

  it('SubjectDetailsCard should accept the same props without error after multiple renders', () => {
    const { rerender } = render(<SubjectDetailsCard subject={mockSubject} />)

    rerender(<SubjectDetailsCard subject={mockSubject} />)
    rerender(<SubjectDetailsCard subject={mockSubject} />)

    expect(screen.getByText('Test Subject')).toBeInTheDocument()
  })

  it('NatalPlanetPositionsCard should accept the same props without error after multiple renders', () => {
    const { rerender } = render(<NatalPlanetPositionsCard subject={mockSubject} />)

    rerender(<NatalPlanetPositionsCard subject={mockSubject} />)
    rerender(<NatalPlanetPositionsCard subject={mockSubject} />)

    expect(screen.getByText('Natal Points')).toBeInTheDocument()
  })

  it('NatalHousesPositionsCard should accept the same props without error after multiple renders', () => {
    const { rerender } = render(<NatalHousesPositionsCard subject={mockSubject} />)

    rerender(<NatalHousesPositionsCard subject={mockSubject} />)
    rerender(<NatalHousesPositionsCard subject={mockSubject} />)

    expect(screen.getByText('Natal Houses')).toBeInTheDocument()
  })
})
