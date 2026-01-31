/**
 * Unit Tests for RadarChartTooltip Component
 *
 * Tests for the extracted tooltip component that displays element/quality
 * distribution details in radar charts. This component was extracted from
 * ChartDataView to prevent recreation on every parent render.
 *
 * @module src/test/components/charts/RadarChartTooltip.test
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

import { RadarChartTooltip, RadarChartTooltipProps } from '@/components/charts/RadarChartTooltip'
import type { ChartPoint } from '@/lib/astrology/chart-data'

// ============================================================================
// Test Fixtures
// ============================================================================

const mockChartPoints: ChartPoint[] = [
  {
    name: 'Sun',
    emoji: '☉',
    sign: 'Leo',
    position: 15.5,
    house: 'fifth_house',
    element: 'Fire',
    quality: 'Fixed',
  },
  {
    name: 'Mars',
    emoji: '♂',
    sign: 'Aries',
    position: 22.3,
    house: 'first_house',
    element: 'Fire',
    quality: 'Cardinal',
  },
]

const mockSecondaryPoints: ChartPoint[] = [
  {
    name: 'Moon',
    emoji: '☽',
    sign: 'Cancer',
    position: 8.2,
    house: 'fourth_house',
    element: 'Water',
    quality: 'Cardinal',
  },
]

const createMockPayload = (overrides: Record<string, unknown> = {}) => [
  {
    payload: {
      subject: 'Fire',
      percentage: 45,
      secondaryPercentage: 30,
      points: mockChartPoints,
      secondaryPoints: mockSecondaryPoints,
      ...overrides,
    },
  },
]

// ============================================================================
// React.memo Type Check Tests
// ============================================================================

describe('RadarChartTooltip', () => {
  describe('React.memo Optimization', () => {
    it('should be wrapped with React.memo', () => {
      expect(RadarChartTooltip).toBeDefined()
      expect((RadarChartTooltip as React.MemoExoticComponent<React.FC>).$$typeof?.toString()).toBe('Symbol(react.memo)')
    })

    it('should have correct displayName for debugging', () => {
      expect(RadarChartTooltip.displayName).toBe('RadarChartTooltip')
    })
  })

  describe('Rendering', () => {
    it('should return null when not active', () => {
      const { container } = render(
        <RadarChartTooltip
          active={false}
          payload={createMockPayload()}
          hasSecondaryData={false}
          primaryLabel="Primary"
          secondaryLabel="Secondary"
        />,
      )
      expect(container.firstChild).toBeNull()
    })

    it('should return null when payload is empty', () => {
      const { container } = render(
        <RadarChartTooltip
          active={true}
          payload={[]}
          hasSecondaryData={false}
          primaryLabel="Primary"
          secondaryLabel="Secondary"
        />,
      )
      expect(container.firstChild).toBeNull()
    })

    it('should return null when payload is undefined', () => {
      const { container } = render(
        <RadarChartTooltip
          active={true}
          payload={undefined}
          hasSecondaryData={false}
          primaryLabel="Primary"
          secondaryLabel="Secondary"
        />,
      )
      expect(container.firstChild).toBeNull()
    })

    it('should render primary data correctly when active', () => {
      render(
        <RadarChartTooltip
          active={true}
          payload={createMockPayload()}
          hasSecondaryData={false}
          primaryLabel="Primary"
          secondaryLabel="Secondary"
        />,
      )

      // Should show the subject (Fire element)
      expect(screen.getByText('Fire')).toBeInTheDocument()
      // Should show the percentage
      expect(screen.getByText('45%')).toBeInTheDocument()
      // Should show planet names
      expect(screen.getByText('Sun')).toBeInTheDocument()
      expect(screen.getByText('Mars')).toBeInTheDocument()
      // Should show emojis
      expect(screen.getByText('☉')).toBeInTheDocument()
      expect(screen.getByText('♂')).toBeInTheDocument()
    })

    it('should render secondary data when hasSecondaryData is true', () => {
      render(
        <RadarChartTooltip
          active={true}
          payload={createMockPayload()}
          hasSecondaryData={true}
          primaryLabel="Person A"
          secondaryLabel="Person B"
        />,
      )

      // Should show labels
      expect(screen.getByText('Person A')).toBeInTheDocument()
      expect(screen.getByText('Person B')).toBeInTheDocument()
      // Should show both percentages
      expect(screen.getByText('45%')).toBeInTheDocument()
      expect(screen.getByText('30%')).toBeInTheDocument()
      // Should show secondary points
      expect(screen.getByText('Moon')).toBeInTheDocument()
      expect(screen.getByText('☽')).toBeInTheDocument()
    })

    it('should not show labels when hasSecondaryData is false', () => {
      render(
        <RadarChartTooltip
          active={true}
          payload={createMockPayload()}
          hasSecondaryData={false}
          primaryLabel="Person A"
          secondaryLabel="Person B"
        />,
      )

      // Labels should NOT appear for single chart
      expect(screen.queryByText('Person A')).not.toBeInTheDocument()
      expect(screen.queryByText('Person B')).not.toBeInTheDocument()
    })

    it('should show "No points" when points array is empty', () => {
      render(
        <RadarChartTooltip
          active={true}
          payload={createMockPayload({ points: [], secondaryPoints: [] })}
          hasSecondaryData={true}
          primaryLabel="Primary"
          secondaryLabel="Secondary"
        />,
      )

      // Should show "No points" for both
      const noPointsElements = screen.getAllByText('No points')
      expect(noPointsElements).toHaveLength(2)
    })

    it('should handle planet names with underscores', () => {
      const pointsWithUnderscores: ChartPoint[] = [
        {
          name: 'True_North_Lunar_Node',
          emoji: '☊',
          sign: 'Taurus',
          position: 5.0,
        },
      ]

      render(
        <RadarChartTooltip
          active={true}
          payload={createMockPayload({ points: pointsWithUnderscores })}
          hasSecondaryData={false}
          primaryLabel="Primary"
          secondaryLabel="Secondary"
        />,
      )

      // Underscores should be replaced with spaces
      expect(screen.getByText('True North Lunar Node')).toBeInTheDocument()
    })

    it('should round percentages correctly', () => {
      render(
        <RadarChartTooltip
          active={true}
          payload={createMockPayload({ percentage: 33.7, secondaryPercentage: 66.3 })}
          hasSecondaryData={true}
          primaryLabel="Primary"
          secondaryLabel="Secondary"
        />,
      )

      expect(screen.getByText('34%')).toBeInTheDocument()
      expect(screen.getByText('66%')).toBeInTheDocument()
    })
  })

  describe('Re-render Prevention', () => {
    it('should accept the same props without error after multiple renders', () => {
      const props: RadarChartTooltipProps = {
        active: true,
        payload: createMockPayload(),
        hasSecondaryData: true,
        primaryLabel: 'Primary',
        secondaryLabel: 'Secondary',
      }

      const { rerender } = render(<RadarChartTooltip {...props} />)

      // Re-render multiple times with same props
      rerender(<RadarChartTooltip {...props} />)
      rerender(<RadarChartTooltip {...props} />)

      // Component should still render correctly
      // Using getAllByText because secondary data shows "Fire" twice (primary + secondary)
      expect(screen.getAllByText('Fire').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('45%')).toBeInTheDocument()
    })
  })
})
