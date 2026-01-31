/**
 * Unit Tests for useChartLayout Hook
 *
 * Tests the shared chart layout hook that centralizes DnD state management,
 * layout initialization, and drag event handlers.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Mock the uiPreferences store
const mockUpdateLayout = vi.fn()
const mockMoveItem = vi.fn()
let mockLayout: Record<string, string[]> = {}

vi.mock('@/stores/uiPreferences', () => ({
  useUIPreferences: () => ({
    layout: mockLayout,
    updateLayout: mockUpdateLayout,
    moveItem: mockMoveItem,
  }),
}))

import { useChartLayout, type ChartLayoutConfig } from '@/hooks/useChartLayout'

// ============================================================================
// Test Fixtures
// ============================================================================

const DEFAULT_CONFIG: ChartLayoutConfig = {
  leftColumnId: 'test-left-column',
  rightColumnId: 'test-right-column',
  defaultLeftItems: ['card-a', 'card-b'],
  defaultRightItems: ['card-c', 'card-d'],
}

// ============================================================================
// Tests
// ============================================================================

describe('useChartLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLayout = {}
  })

  describe('initialization', () => {
    it('returns default items when layout is empty', () => {
      const { result } = renderHook(() => useChartLayout(DEFAULT_CONFIG))

      expect(result.current.leftItems).toEqual(['card-a', 'card-b'])
      expect(result.current.rightItems).toEqual(['card-c', 'card-d'])
    })

    it('calls updateLayout for missing column keys on mount', () => {
      renderHook(() => useChartLayout(DEFAULT_CONFIG))

      expect(mockUpdateLayout).toHaveBeenCalledWith('test-left-column', ['card-a', 'card-b'])
      expect(mockUpdateLayout).toHaveBeenCalledWith('test-right-column', ['card-c', 'card-d'])
    })

    it('does not call updateLayout if keys already exist', () => {
      mockLayout = {
        'test-left-column': ['card-b', 'card-a'],
        'test-right-column': ['card-d'],
      }

      renderHook(() => useChartLayout(DEFAULT_CONFIG))

      expect(mockUpdateLayout).not.toHaveBeenCalled()
    })

    it('returns stored layout items when available', () => {
      mockLayout = {
        'test-left-column': ['card-b', 'card-a'],
        'test-right-column': ['card-d'],
      }

      const { result } = renderHook(() => useChartLayout(DEFAULT_CONFIG))

      expect(result.current.leftItems).toEqual(['card-b', 'card-a'])
      expect(result.current.rightItems).toEqual(['card-d'])
    })

    it('allows empty columns (all cards dragged to one side)', () => {
      mockLayout = {
        'test-left-column': [],
        'test-right-column': ['card-a', 'card-b', 'card-c', 'card-d'],
      }

      const { result } = renderHook(() => useChartLayout(DEFAULT_CONFIG))

      expect(result.current.leftItems).toEqual([])
      expect(result.current.rightItems).toEqual(['card-a', 'card-b', 'card-c', 'card-d'])
    })
  })

  describe('returns correct structure', () => {
    it('returns activeId initially null', () => {
      const { result } = renderHook(() => useChartLayout(DEFAULT_CONFIG))
      expect(result.current.activeId).toBeNull()
    })

    it('returns a dndContextId string', () => {
      const { result } = renderHook(() => useChartLayout(DEFAULT_CONFIG))
      expect(typeof result.current.dndContextId).toBe('string')
      expect(result.current.dndContextId.length).toBeGreaterThan(0)
    })

    it('returns handler functions', () => {
      const { result } = renderHook(() => useChartLayout(DEFAULT_CONFIG))
      expect(typeof result.current.handleDragStart).toBe('function')
      expect(typeof result.current.handleDragEnd).toBe('function')
    })
  })

  describe('handleDragStart', () => {
    it('sets activeId from drag event', () => {
      const { result } = renderHook(() => useChartLayout(DEFAULT_CONFIG))

      act(() => {
        result.current.handleDragStart({
          active: { id: 'card-a' },
        } as any)
      })

      expect(result.current.activeId).toBe('card-a')
    })
  })

  describe('handleDragEnd', () => {
    it('clears activeId when dropping on null', () => {
      const { result } = renderHook(() => useChartLayout(DEFAULT_CONFIG))

      // First set activeId
      act(() => {
        result.current.handleDragStart({
          active: { id: 'card-a' },
        } as any)
      })

      // Then drop on nothing
      act(() => {
        result.current.handleDragEnd({
          active: { id: 'card-a' },
          over: null,
        } as any)
      })

      expect(result.current.activeId).toBeNull()
      expect(mockMoveItem).not.toHaveBeenCalled()
    })

    it('calls moveItem when dropping on a valid target within same column', () => {
      mockLayout = {
        'test-left-column': ['card-a', 'card-b'],
        'test-right-column': ['card-c', 'card-d'],
      }

      const { result } = renderHook(() => useChartLayout(DEFAULT_CONFIG))

      act(() => {
        result.current.handleDragEnd({
          active: { id: 'card-a' },
          over: { id: 'card-b' },
        } as any)
      })

      expect(mockMoveItem).toHaveBeenCalledWith('card-a', 'card-b', 'test-left-column', 'test-left-column')
      expect(result.current.activeId).toBeNull()
    })

    it('calls moveItem when dropping on a card in the other column', () => {
      mockLayout = {
        'test-left-column': ['card-a', 'card-b'],
        'test-right-column': ['card-c', 'card-d'],
      }

      const { result } = renderHook(() => useChartLayout(DEFAULT_CONFIG))

      act(() => {
        result.current.handleDragEnd({
          active: { id: 'card-a' },
          over: { id: 'card-c' },
        } as any)
      })

      expect(mockMoveItem).toHaveBeenCalledWith('card-a', 'card-c', 'test-left-column', 'test-right-column')
    })

    it('calls moveItem when dropping directly on a column container', () => {
      mockLayout = {
        'test-left-column': ['card-a', 'card-b'],
        'test-right-column': ['card-c', 'card-d'],
      }

      const { result } = renderHook(() => useChartLayout(DEFAULT_CONFIG))

      act(() => {
        result.current.handleDragEnd({
          active: { id: 'card-a' },
          over: { id: 'test-right-column' },
        } as any)
      })

      expect(mockMoveItem).toHaveBeenCalledWith(
        'card-a',
        'test-right-column',
        'test-left-column',
        'test-right-column',
      )
    })

    it('does not call moveItem when active item is not in any container', () => {
      mockLayout = {
        'test-left-column': ['card-a', 'card-b'],
        'test-right-column': ['card-c', 'card-d'],
      }

      const { result } = renderHook(() => useChartLayout(DEFAULT_CONFIG))

      act(() => {
        result.current.handleDragEnd({
          active: { id: 'unknown-card' },
          over: { id: 'card-a' },
        } as any)
      })

      expect(mockMoveItem).not.toHaveBeenCalled()
    })

    it('does not call moveItem when over target resolves to no container', () => {
      mockLayout = {
        'test-left-column': ['card-a', 'card-b'],
        'test-right-column': ['card-c', 'card-d'],
      }

      const { result } = renderHook(() => useChartLayout(DEFAULT_CONFIG))

      act(() => {
        result.current.handleDragEnd({
          active: { id: 'card-a' },
          over: { id: 'some-random-element' },
        } as any)
      })

      expect(mockMoveItem).not.toHaveBeenCalled()
    })
  })

  describe('different chart configurations', () => {
    it('works with natal chart column IDs', () => {
      const natalConfig: ChartLayoutConfig = {
        leftColumnId: 'natal-chart-left-column',
        rightColumnId: 'natal-chart-right-column',
        defaultLeftItems: ['subject-details-card', 'natal-planets-card'],
        defaultRightItems: ['natal-houses-card', 'aspects-card'],
      }

      const { result } = renderHook(() => useChartLayout(natalConfig))

      expect(result.current.leftItems).toEqual(['subject-details-card', 'natal-planets-card'])
      expect(result.current.rightItems).toEqual(['natal-houses-card', 'aspects-card'])
    })

    it('works with synastry chart column IDs', () => {
      const synastryConfig: ChartLayoutConfig = {
        leftColumnId: 'synastry-left-column',
        rightColumnId: 'synastry-right-column',
        defaultLeftItems: ['subject1-details-card', 'subject1-planets-card'],
        defaultRightItems: ['subject2-details-card', 'subject2-planets-card', 'synastry-aspects-card'],
      }

      const { result } = renderHook(() => useChartLayout(synastryConfig))

      expect(result.current.leftItems).toEqual(['subject1-details-card', 'subject1-planets-card'])
      expect(result.current.rightItems).toEqual([
        'subject2-details-card',
        'subject2-planets-card',
        'synastry-aspects-card',
      ])
    })
  })
})
