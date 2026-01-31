/**
 * Tests for aria-live regions on dynamic content
 *
 * Verifies that loading states and progress indicators include
 * role="status" and aria-live="polite" so screen readers announce
 * dynamic content changes.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DataTable } from '@/components/data-table/DataTable'
import { AIGenerationSection } from '@/components/notes-panel/AIGenerationSection'
import type { ColumnDef } from '@tanstack/react-table'

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), findMany: vi.fn() },
    subject: { findUnique: vi.fn(), findMany: vi.fn() },
  },
}))

vi.mock('@/stores/tablePreferences', () => ({
  useTablePreferences: (
    selector: (state: {
      columnVisibility: Record<string, Record<string, boolean>>
      setColumnVisibility: () => void
      resetTable: () => void
    }) => unknown,
  ) => {
    const state = {
      columnVisibility: {},
      setColumnVisibility: vi.fn(),
      resetTable: vi.fn(),
    }
    return selector(state)
  },
}))

// ============================================================================
// Test Data
// ============================================================================

interface TestItem {
  id: string
  name: string
}

const testColumns: ColumnDef<TestItem>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'name', header: 'Name' },
]

const testData: TestItem[] = [
  { id: '1', name: 'Alice' },
  { id: '2', name: 'Bob' },
]

// ============================================================================
// DataTable aria-live tests
// ============================================================================

describe('DataTable aria-live regions', () => {
  it('should have role="status" and aria-live="polite" on loading state', () => {
    render(<DataTable columns={testColumns} data={[]} isLoading={true} />)

    const loadingCell = screen.getByText('Loading...')
    expect(loadingCell).toHaveAttribute('role', 'status')
    expect(loadingCell).toHaveAttribute('aria-live', 'polite')
  })

  it('should not have aria-live attributes on normal data rows', () => {
    render(<DataTable columns={testColumns} data={testData} isLoading={false} />)

    const dataCell = screen.getByText('Alice')
    expect(dataCell).not.toHaveAttribute('role', 'status')
    expect(dataCell).not.toHaveAttribute('aria-live')
  })
})

// ============================================================================
// AIGenerationSection aria-live tests
// ============================================================================

describe('AIGenerationSection aria-live regions', () => {
  const defaultProps = {
    selectedSchool: 'modern',
    isGenerating: false,
    relationshipType: 'generic',
    onRelationshipTypeChange: vi.fn(),
    onGenerate: vi.fn(),
    onStop: vi.fn(),
  }

  it('should show aria-live status when generating', () => {
    render(<AIGenerationSection {...defaultProps} isGenerating={true} />)

    const statusElement = screen.getByText('Generating AI interpretation...')
    expect(statusElement).toHaveAttribute('role', 'status')
    expect(statusElement).toHaveAttribute('aria-live', 'polite')
  })

  it('should not show generating status when not generating', () => {
    render(<AIGenerationSection {...defaultProps} isGenerating={false} />)

    expect(screen.queryByText('Generating AI interpretation...')).not.toBeInTheDocument()
  })

  it('should render the generating status as sr-only', () => {
    render(<AIGenerationSection {...defaultProps} isGenerating={true} />)

    const statusElement = screen.getByText('Generating AI interpretation...')
    expect(statusElement).toHaveClass('sr-only')
  })
})
