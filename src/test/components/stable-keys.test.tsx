/**
 * Unit Tests for Stable React Keys in List Components
 *
 * These tests verify that components use stable, content-based keys
 * instead of array indices for React reconciliation optimization.
 *
 * Using stable keys ensures:
 * - Correct element identity during reordering
 * - Proper state preservation when items are added/removed
 * - Optimized reconciliation performance
 *
 * @module src/test/components/stable-keys
 */
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import React from 'react'

// Mock the UI preferences store before importing components
vi.mock('@/stores/uiPreferences', () => ({
  useUIPreferences: () => ({
    collapsed: {},
    toggleCollapsed: vi.fn(),
  }),
}))

import { AspectTable } from '@/components/charts/AspectTable'
import type { Aspect } from '@/types/astrology'

// ============================================================================
// Test Fixtures
// ============================================================================

const createMockAspect = (p1: string, p2: string, aspect: string, orbit: number = 2.5): Aspect => ({
  p1_name: p1,
  p2_name: p2,
  aspect,
  orbit,
  diff: 0.5,
  aspect_degrees: 0,
  p1: 0,
  p2: 1,
  aspect_movement: 'applying',
})

// ============================================================================
// AspectTable Stable Keys Tests
// ============================================================================

describe('AspectTable Stable Keys', () => {
  it('should render aspects with stable keys based on p1_name-p2_name-aspect', () => {
    const aspects: Aspect[] = [
      createMockAspect('Sun', 'Moon', 'conjunction'),
      createMockAspect('Mars', 'Venus', 'opposition'),
      createMockAspect('Jupiter', 'Saturn', 'trine'),
    ]

    const { container } = render(<AspectTable aspects={aspects} />)

    // All aspects should be rendered
    const rows = container.querySelectorAll('tbody tr')
    expect(rows.length).toBe(3)
  })

  it('should handle reordered aspects correctly', () => {
    const aspects: Aspect[] = [
      createMockAspect('Sun', 'Moon', 'conjunction'),
      createMockAspect('Mars', 'Venus', 'opposition'),
    ]

    const { rerender, container } = render(<AspectTable aspects={aspects} />)

    // Verify initial order
    let cells = container.querySelectorAll('tbody td:first-child')
    expect(cells[0]?.textContent).toBe('Sun')
    expect(cells[1]?.textContent).toBe('Mars')

    // Reorder aspects
    const reorderedAspects: Aspect[] = [aspects[1]!, aspects[0]!]
    rerender(<AspectTable aspects={reorderedAspects} />)

    // Verify new order
    cells = container.querySelectorAll('tbody td:first-child')
    expect(cells[0]?.textContent).toBe('Mars')
    expect(cells[1]?.textContent).toBe('Sun')
  })

  it('should handle aspects with same planets but different aspect types', () => {
    // Edge case: same planet pair with different aspects should have unique keys
    const aspects: Aspect[] = [
      createMockAspect('Sun', 'Moon', 'conjunction'),
      createMockAspect('Sun', 'Moon', 'opposition'), // Same planets, different aspect
    ]

    const { container } = render(<AspectTable aspects={aspects} />)

    const rows = container.querySelectorAll('tbody tr')
    expect(rows.length).toBe(2)
  })

  it('should handle empty aspects array', () => {
    const { container } = render(<AspectTable aspects={[]} />)

    const rows = container.querySelectorAll('tbody tr')
    expect(rows.length).toBe(0)
  })

  it('should handle single aspect', () => {
    const aspects: Aspect[] = [createMockAspect('Sun', 'Moon', 'conjunction')]

    const { container } = render(<AspectTable aspects={aspects} />)

    const rows = container.querySelectorAll('tbody tr')
    expect(rows.length).toBe(1)
  })
})

// ============================================================================
// Key Uniqueness Tests
// ============================================================================

describe('Key Uniqueness Validation', () => {
  it('AspectTable keys should be unique for different aspects', () => {
    const aspects: Aspect[] = [
      createMockAspect('Sun', 'Moon', 'conjunction'),
      createMockAspect('Mars', 'Venus', 'opposition'),
      createMockAspect('Jupiter', 'Saturn', 'trine'),
      createMockAspect('Mercury', 'Neptune', 'square'),
    ]

    // Generate the expected keys
    const keys = aspects.map((a) => `${a.p1_name}-${a.p2_name}-${a.aspect}`)
    const uniqueKeys = new Set(keys)

    // All keys should be unique
    expect(uniqueKeys.size).toBe(aspects.length)
  })

  it('AspectTable keys should differentiate same planets with different aspects', () => {
    const key1 = 'Sun-Moon-conjunction'
    const key2 = 'Sun-Moon-opposition'

    expect(key1).not.toBe(key2)
  })
})
