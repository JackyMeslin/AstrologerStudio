/**
 * @vitest-environment jsdom
 */
/**
 * Accessibility Tests for WCAG 1.4.1 - Color Alone
 *
 * Tests that information conveyed through color is also available
 * through other means (text, icons, patterns) for users with color blindness.
 *
 * @module src/test/components/color-alone-accessibility.test.tsx
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  getAspectNature,
  ASPECT_NATURE,
  ASPECT_NATURE_LABELS,
  ASPECT_NATURE_FULL_LABELS,
  type AspectNature,
} from '@/components/charts/AspectGrid'
import { EngagementMetrics } from '@/components/admin/EngagementMetrics'

// ===========================================================================
// AspectGrid Accessibility Tests
// ===========================================================================

describe('AspectGrid WCAG 1.4.1 - Color Alone', () => {
  describe('ASPECT_NATURE mapping', () => {
    /**
     * Test that all aspects have a defined nature category
     */
    it('should have nature defined for all major aspects', () => {
      const majorAspects = ['conjunction', 'opposition', 'square', 'trine', 'sextile']

      majorAspects.forEach((aspect) => {
        expect(ASPECT_NATURE[aspect]).toBeDefined()
        expect(['harmonious', 'challenging', 'neutral', 'creative']).toContain(ASPECT_NATURE[aspect])
      })
    })

    it('should have nature defined for all minor aspects', () => {
      const minorAspects = [
        'quincunx',
        'semi-sextile',
        'semi-square',
        'sesquiquadrate',
        'quintile',
        'bi-quintile',
        'biquintile',
      ]

      minorAspects.forEach((aspect) => {
        expect(ASPECT_NATURE[aspect]).toBeDefined()
        expect(['harmonious', 'challenging', 'neutral', 'creative']).toContain(ASPECT_NATURE[aspect])
      })
    })

    it('should categorize harmonious aspects correctly', () => {
      expect(ASPECT_NATURE['trine']).toBe('harmonious')
      expect(ASPECT_NATURE['sextile']).toBe('harmonious')
      expect(ASPECT_NATURE['semi-sextile']).toBe('harmonious')
    })

    it('should categorize challenging aspects correctly', () => {
      expect(ASPECT_NATURE['opposition']).toBe('challenging')
      expect(ASPECT_NATURE['square']).toBe('challenging')
      expect(ASPECT_NATURE['semi-square']).toBe('challenging')
      expect(ASPECT_NATURE['sesquiquadrate']).toBe('challenging')
      expect(ASPECT_NATURE['quincunx']).toBe('challenging')
    })

    it('should categorize neutral aspects correctly', () => {
      expect(ASPECT_NATURE['conjunction']).toBe('neutral')
    })

    it('should categorize creative aspects correctly', () => {
      expect(ASPECT_NATURE['quintile']).toBe('creative')
      expect(ASPECT_NATURE['bi-quintile']).toBe('creative')
      expect(ASPECT_NATURE['biquintile']).toBe('creative')
    })
  })

  describe('ASPECT_NATURE_LABELS', () => {
    /**
     * Test that all nature categories have short labels for visual display
     */
    it('should have labels for all nature types', () => {
      const natureTypes: AspectNature[] = ['harmonious', 'challenging', 'neutral', 'creative']

      natureTypes.forEach((nature) => {
        expect(ASPECT_NATURE_LABELS[nature]).toBeDefined()
        expect(typeof ASPECT_NATURE_LABELS[nature]).toBe('string')
        expect(ASPECT_NATURE_LABELS[nature].length).toBeGreaterThan(0)
        // Labels should be short (1-2 chars)
        expect(ASPECT_NATURE_LABELS[nature].length).toBeLessThanOrEqual(2)
      })
    })

    it('should have unique labels', () => {
      const labels = Object.values(ASPECT_NATURE_LABELS)
      const uniqueLabels = new Set(labels)
      expect(uniqueLabels.size).toBe(labels.length)
    })
  })

  describe('ASPECT_NATURE_FULL_LABELS', () => {
    /**
     * Test that all nature categories have full labels for screen readers
     */
    it('should have full labels for all nature types', () => {
      const natureTypes: AspectNature[] = ['harmonious', 'challenging', 'neutral', 'creative']

      natureTypes.forEach((nature) => {
        expect(ASPECT_NATURE_FULL_LABELS[nature]).toBeDefined()
        expect(typeof ASPECT_NATURE_FULL_LABELS[nature]).toBe('string')
        // Full labels should be descriptive
        expect(ASPECT_NATURE_FULL_LABELS[nature].length).toBeGreaterThan(3)
      })
    })

    it('should have human-readable full labels', () => {
      expect(ASPECT_NATURE_FULL_LABELS['harmonious']).toBe('Harmonious')
      expect(ASPECT_NATURE_FULL_LABELS['challenging']).toBe('Challenging')
      expect(ASPECT_NATURE_FULL_LABELS['neutral']).toBe('Neutral')
      expect(ASPECT_NATURE_FULL_LABELS['creative']).toBe('Creative')
    })
  })

  describe('getAspectNature function', () => {
    it('should return correct nature for known aspects', () => {
      expect(getAspectNature('trine')).toBe('harmonious')
      expect(getAspectNature('square')).toBe('challenging')
      expect(getAspectNature('conjunction')).toBe('neutral')
      expect(getAspectNature('quintile')).toBe('creative')
    })

    it('should be case-insensitive', () => {
      expect(getAspectNature('TRINE')).toBe('harmonious')
      expect(getAspectNature('Trine')).toBe('harmonious')
      expect(getAspectNature('SQUARE')).toBe('challenging')
    })

    it('should return neutral for unknown aspects', () => {
      expect(getAspectNature('unknown-aspect')).toBe('neutral')
      expect(getAspectNature('')).toBe('neutral')
    })
  })
})

// ===========================================================================
// EngagementMetrics Accessibility Tests
// ===========================================================================

describe('EngagementMetrics WCAG 1.4.1 - Color Alone', () => {
  const defaultProps = {
    activeUsersToday: 10,
    activeUsersThisWeek: 50,
    activeUsersThisMonth: 100,
    retentionRate7d: 25,
    avgLoginsPerUser: 3,
    usersWithSubjects: 80,
    usersWithSavedCharts: 60,
    usersWithAIUsage: 40,
    inactiveUsers30d: 20,
    totalUsers: 100,
  }

  describe('Retention Rate Status Indicator', () => {
    it('should show status text for good retention (>=30%)', () => {
      render(<EngagementMetrics {...defaultProps} retentionRate7d={35} />)

      expect(screen.getByText('(Good)')).toBeInTheDocument()
    })

    it('should show status text for fair retention (15-29%)', () => {
      render(<EngagementMetrics {...defaultProps} retentionRate7d={20} />)

      expect(screen.getByText('(Fair)')).toBeInTheDocument()
    })

    it('should show status text for low retention (<15%)', () => {
      render(<EngagementMetrics {...defaultProps} retentionRate7d={10} />)

      expect(screen.getByText('(Low)')).toBeInTheDocument()
    })

    it('should include icons in retention status (visual indicator beyond color)', () => {
      const { container } = render(<EngagementMetrics {...defaultProps} retentionRate7d={35} />)

      // Check for SVG icons in StatusIndicator components (aria-hidden="true")
      const statusIndicatorIcons = container.querySelectorAll('[aria-hidden="true"]')
      expect(statusIndicatorIcons.length).toBeGreaterThan(0)
    })
  })

  describe('Churn Risk Status Indicator', () => {
    it('should show status text for high churn risk (>=50%)', () => {
      render(<EngagementMetrics {...defaultProps} inactiveUsers30d={60} totalUsers={100} />)

      expect(screen.getByText('(High Risk)')).toBeInTheDocument()
    })

    it('should show status text for moderate churn risk (30-49%)', () => {
      render(<EngagementMetrics {...defaultProps} inactiveUsers30d={35} totalUsers={100} />)

      expect(screen.getByText('(Moderate Risk)')).toBeInTheDocument()
    })

    it('should show status text for low churn risk (<30%)', () => {
      render(<EngagementMetrics {...defaultProps} inactiveUsers30d={20} totalUsers={100} />)

      expect(screen.getByText('(Low Risk)')).toBeInTheDocument()
    })

    it('should include icons in churn status (visual indicator beyond color)', () => {
      const { container } = render(<EngagementMetrics {...defaultProps} />)

      // Check for SVG icons throughout the component
      const svgIcons = container.querySelectorAll('svg')
      // Should have multiple icons (header icons + status icons)
      expect(svgIcons.length).toBeGreaterThan(4)
    })
  })

  describe('Accessibility compliance', () => {
    it('should not rely solely on color for status information', () => {
      const { container } = render(
        <EngagementMetrics {...defaultProps} retentionRate7d={10} inactiveUsers30d={60} totalUsers={100} />,
      )

      // Verify text labels are present for all status indicators
      expect(screen.getByText('(Low)')).toBeInTheDocument()
      expect(screen.getByText('(High Risk)')).toBeInTheDocument()

      // Verify icons are present (aria-hidden for decoration)
      const hiddenIcons = container.querySelectorAll('[aria-hidden="true"]')
      expect(hiddenIcons.length).toBeGreaterThan(0)
    })
  })
})
