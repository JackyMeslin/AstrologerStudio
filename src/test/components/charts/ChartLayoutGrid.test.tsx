/**
 * Unit Tests for ChartLayoutGrid Component
 *
 * Tests the shared chart layout grid component that renders the 3-column
 * DnD layout (left cards, center chart, right cards).
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import * as React from 'react'

// Mock dnd-kit modules
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div data-testid="dnd-context">{children}</div>,
  DragOverlay: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="drag-overlay">{children}</div>
  ),
  closestCenter: vi.fn(),
}))

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  verticalListSortingStrategy: {},
}))

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => null,
    },
  },
}))

// Mock ZoomableChart
vi.mock('@/components/ZoomableChart', () => ({
  default: ({ html }: { html: string }) => <div data-testid="zoomable-chart">{html}</div>,
}))

// Mock DnD components
vi.mock('@/components/dnd/DraggableColumn', () => ({
  DraggableColumn: ({
    id,
    children,
    className,
  }: {
    id: string
    items: string[]
    children: React.ReactNode
    className?: string
  }) => (
    <div data-testid={`draggable-column-${id}`} className={className}>
      {children}
    </div>
  ),
}))

vi.mock('@/components/dnd/SortableCard', () => ({
  SortableCard: ({ id, children }: { id: string; children: React.ReactNode }) => (
    <div data-testid={`sortable-card-${id}`}>{children}</div>
  ),
}))

// Mock createPortal to render inline for testing
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom')
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  }
})

import { ChartLayoutGrid, type ChartLayoutGridProps } from '@/components/charts/ChartLayoutGrid'
import type { ChartLayoutResult } from '@/hooks/useChartLayout'

// ============================================================================
// Test Fixtures
// ============================================================================

const mockLayout: ChartLayoutResult = {
  activeId: null,
  dndContextId: 'test-dnd-id',
  leftItems: ['card-a', 'card-b'],
  rightItems: ['card-c', 'card-d'],
  handleDragStart: vi.fn(),
  handleDragEnd: vi.fn(),
}

const mockRenderCard = vi.fn((id: string) => <div data-testid={`card-content-${id}`}>Card {id}</div>)

const defaultProps: ChartLayoutGridProps = {
  layout: mockLayout,
  leftColumnId: 'test-left-column',
  rightColumnId: 'test-right-column',
  mainChart: '<svg>chart</svg>',
  renderCard: mockRenderCard,
}

// ============================================================================
// Tests
// ============================================================================

describe('ChartLayoutGrid', () => {
  describe('rendering', () => {
    it('renders the DndContext wrapper', () => {
      render(<ChartLayoutGrid {...defaultProps} />)
      expect(screen.getByTestId('dnd-context')).toBeDefined()
    })

    it('renders left column with correct items', () => {
      render(<ChartLayoutGrid {...defaultProps} />)

      const leftColumn = screen.getByTestId('draggable-column-test-left-column')
      expect(leftColumn).toBeDefined()
      expect(screen.getByTestId('sortable-card-card-a')).toBeDefined()
      expect(screen.getByTestId('sortable-card-card-b')).toBeDefined()
    })

    it('renders right column with correct items', () => {
      render(<ChartLayoutGrid {...defaultProps} />)

      const rightColumn = screen.getByTestId('draggable-column-test-right-column')
      expect(rightColumn).toBeDefined()
      expect(screen.getByTestId('sortable-card-card-c')).toBeDefined()
      expect(screen.getByTestId('sortable-card-card-d')).toBeDefined()
    })

    it('renders chart in mobile and desktop sections', () => {
      render(<ChartLayoutGrid {...defaultProps} />)

      const charts = screen.getAllByTestId('zoomable-chart')
      // Mobile + Desktop = 2 chart instances
      expect(charts.length).toBe(2)
    })

    it('does not render chart sections when mainChart is null', () => {
      render(<ChartLayoutGrid {...defaultProps} mainChart={null} />)

      expect(screen.queryByTestId('zoomable-chart')).toBeNull()
    })

    it('calls renderCard for each item in both columns', () => {
      mockRenderCard.mockClear()
      render(<ChartLayoutGrid {...defaultProps} />)

      // Each card rendered once per column
      expect(mockRenderCard).toHaveBeenCalledWith('card-a')
      expect(mockRenderCard).toHaveBeenCalledWith('card-b')
      expect(mockRenderCard).toHaveBeenCalledWith('card-c')
      expect(mockRenderCard).toHaveBeenCalledWith('card-d')
    })
  })

  describe('empty columns', () => {
    it('renders empty left column without errors', () => {
      const emptyLeftLayout: ChartLayoutResult = {
        ...mockLayout,
        leftItems: [],
      }

      render(<ChartLayoutGrid {...defaultProps} layout={emptyLeftLayout} />)

      const leftColumn = screen.getByTestId('draggable-column-test-left-column')
      expect(leftColumn).toBeDefined()
      // No sortable cards in left column
      expect(screen.queryByTestId('sortable-card-card-a')).toBeNull()
    })

    it('renders empty right column without errors', () => {
      const emptyRightLayout: ChartLayoutResult = {
        ...mockLayout,
        rightItems: [],
      }

      render(<ChartLayoutGrid {...defaultProps} layout={emptyRightLayout} />)

      const rightColumn = screen.getByTestId('draggable-column-test-right-column')
      expect(rightColumn).toBeDefined()
      expect(screen.queryByTestId('sortable-card-card-c')).toBeNull()
    })
  })

  describe('drag overlay', () => {
    it('renders drag overlay with active card content', () => {
      const activeLayout: ChartLayoutResult = {
        ...mockLayout,
        activeId: 'card-a',
      }

      mockRenderCard.mockClear()
      render(<ChartLayoutGrid {...defaultProps} layout={activeLayout} />)

      // renderCard should be called for the activeId in the overlay
      const calls = mockRenderCard.mock.calls.map((c) => c[0])
      expect(calls).toContain('card-a')
    })

    it('does not render overlay content when no active drag', () => {
      render(<ChartLayoutGrid {...defaultProps} />)

      const overlay = screen.getByTestId('drag-overlay')
      // Overlay exists but should be empty (no activeId)
      expect(overlay.children.length).toBe(0)
    })
  })
})
