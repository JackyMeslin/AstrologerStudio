/**
 * Unit Tests for DataTable Component
 *
 * Tests the generic DataTable component that provides sorting, filtering,
 * pagination, column visibility, and row selection functionality.
 *
 * @module src/components/data-table/DataTable
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DataTable } from '@/components/data-table/DataTable'
import type { ColumnDef } from '@tanstack/react-table'

// ============================================================================
// Mocks
// ============================================================================

// Mock Prisma to prevent any DB access
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), findMany: vi.fn() },
    subject: { findUnique: vi.fn(), findMany: vi.fn() },
  },
}))

// Mock the table preferences store
const mockSetColumnVisibility = vi.fn()
const mockResetTable = vi.fn()
const mockPersistedVisibility = vi.fn<() => Record<string, boolean> | undefined>(() => undefined)

vi.mock('@/stores/tablePreferences', () => ({
  useTablePreferences: (
    selector: (state: {
      columnVisibility: Record<string, Record<string, boolean>>
      setColumnVisibility: typeof mockSetColumnVisibility
      resetTable: typeof mockResetTable
    }) => unknown,
  ) => {
    const state = {
      columnVisibility: { 'test-table': mockPersistedVisibility() || {} },
      setColumnVisibility: mockSetColumnVisibility,
      resetTable: mockResetTable,
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
  email: string
  status: 'active' | 'inactive'
}

const testData: TestItem[] = [
  { id: '1', name: 'Alice Smith', email: 'alice@example.com', status: 'active' },
  { id: '2', name: 'Bob Johnson', email: 'bob@example.com', status: 'inactive' },
  { id: '3', name: 'Charlie Brown', email: 'charlie@example.com', status: 'active' },
  { id: '4', name: 'Diana Prince', email: 'diana@example.com', status: 'active' },
  { id: '5', name: 'Edward Norton', email: 'edward@example.com', status: 'inactive' },
]

const testColumns: ColumnDef<TestItem>[] = [
  {
    accessorKey: 'id',
    header: 'ID',
  },
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'status',
    header: 'Status',
  },
]

// ============================================================================
// Tests
// ============================================================================

describe('DataTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPersistedVisibility.mockReturnValue(undefined)
  })

  // ===========================================================================
  // Next.js Client Component Directive Tests
  // ===========================================================================

  describe('Next.js client component directive', () => {
    it('should have "use client" directive at the top of the file', () => {
      const filePath = resolve(__dirname, '../../components/data-table/DataTable.tsx')
      const fileContent = readFileSync(filePath, 'utf-8')
      const lines = fileContent.split('\n')
      const firstLine = lines[0] ?? ''

      expect(firstLine.trim()).toBe("'use client'")
    })
  })

  // ===========================================================================
  // Basic Rendering Tests
  // ===========================================================================

  describe('basic rendering', () => {
    it('should render table with data', () => {
      render(<DataTable columns={testColumns} data={testData} />)

      // Check headers are rendered
      expect(screen.getByText('ID')).toBeInTheDocument()
      expect(screen.getByText('Name')).toBeInTheDocument()
      expect(screen.getByText('Email')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()

      // Check data is rendered
      expect(screen.getByText('Alice Smith')).toBeInTheDocument()
      expect(screen.getByText('bob@example.com')).toBeInTheDocument()
    })

    it('should display "No results" when data is empty', () => {
      render(<DataTable columns={testColumns} data={[]} />)

      expect(screen.getByText('No results.')).toBeInTheDocument()
    })

    it('should display loading state', () => {
      render(<DataTable columns={testColumns} data={[]} isLoading={true} />)

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })

    it('should render footer when provided', () => {
      render(
        <DataTable
          columns={testColumns}
          data={testData}
          footer={<div data-testid="custom-footer">Custom Footer</div>}
        />,
      )

      expect(screen.getByTestId('custom-footer')).toBeInTheDocument()
    })

    it('should display row count', () => {
      render(<DataTable columns={testColumns} data={testData} />)

      expect(screen.getByText('5 rows')).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Pagination Tests
  // ===========================================================================

  describe('pagination', () => {
    it('should render pagination controls', () => {
      render(<DataTable columns={testColumns} data={testData} />)

      expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
    })

    it('should display current page', () => {
      render(<DataTable columns={testColumns} data={testData} />)

      expect(screen.getByText(/page 1/i)).toBeInTheDocument()
    })

    it('should disable previous button on first page', () => {
      render(<DataTable columns={testColumns} data={testData} />)

      const prevButton = screen.getByRole('button', { name: /previous/i })
      expect(prevButton).toBeDisabled()
    })

    it('should enable next button when there are more pages', () => {
      // Create enough data to have multiple pages (default page size is 10)
      const manyItems = Array.from({ length: 25 }, (_, i) => ({
        id: String(i + 1),
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
        status: 'active' as const,
      }))

      render(<DataTable columns={testColumns} data={manyItems} />)

      const nextButton = screen.getByRole('button', { name: /next/i })
      expect(nextButton).not.toBeDisabled()
    })

    it('should navigate to next page when clicking next', async () => {
      const manyItems = Array.from({ length: 25 }, (_, i) => ({
        id: String(i + 1),
        name: `User ${i + 1}`,
        email: `user${i + 1}@example.com`,
        status: 'active' as const,
      }))

      render(<DataTable columns={testColumns} data={manyItems} />)

      const nextButton = screen.getByRole('button', { name: /next/i })
      fireEvent.click(nextButton)

      await waitFor(() => {
        expect(screen.getByText(/page 2/i)).toBeInTheDocument()
      })
    })
  })

  // ===========================================================================
  // Global Filter Tests
  // ===========================================================================

  describe('global filter', () => {
    it('should not render filter input when globalFilter is false', () => {
      render(<DataTable columns={testColumns} data={testData} globalFilter={false} />)

      expect(screen.queryByPlaceholderText('Filter...')).not.toBeInTheDocument()
    })

    it('should render filter input when globalFilter is true', () => {
      render(<DataTable columns={testColumns} data={testData} globalFilter={true} />)

      expect(screen.getByPlaceholderText('Filter...')).toBeInTheDocument()
    })

    it('should use custom filter placeholder', () => {
      render(
        <DataTable columns={testColumns} data={testData} globalFilter={true} filterPlaceholder="Search users..." />,
      )

      expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument()
    })

    it('should filter data when typing in filter input', async () => {
      const user = userEvent.setup()

      render(<DataTable columns={testColumns} data={testData} globalFilter={true} />)

      const filterInput = screen.getByPlaceholderText('Filter...')
      await user.type(filterInput, 'Alice')

      // Debounce delay is 300ms
      await waitFor(
        () => {
          expect(screen.getByText('Alice Smith')).toBeInTheDocument()
          expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument()
        },
        { timeout: 500 },
      )
    })

    it('should show clear button when filter has value', async () => {
      const user = userEvent.setup()

      render(<DataTable columns={testColumns} data={testData} globalFilter={true} />)

      const filterInput = screen.getByPlaceholderText('Filter...')
      await user.type(filterInput, 'test')

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /clear filter/i })).toBeInTheDocument()
      })
    })

    it('should clear filter when clicking clear button', async () => {
      const user = userEvent.setup()

      render(<DataTable columns={testColumns} data={testData} globalFilter={true} />)

      const filterInput = screen.getByPlaceholderText('Filter...')
      await user.type(filterInput, 'Alice')

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /clear filter/i })).toBeInTheDocument()
      })

      const clearButton = screen.getByRole('button', { name: /clear filter/i })
      await user.click(clearButton)

      await waitFor(() => {
        expect(filterInput).toHaveValue('')
      })
    })

    it('should update row count when filtered', async () => {
      const user = userEvent.setup()

      render(<DataTable columns={testColumns} data={testData} globalFilter={true} />)

      const filterInput = screen.getByPlaceholderText('Filter...')
      await user.type(filterInput, 'Alice')

      await waitFor(
        () => {
          // Should show "1 / 5 rows" (1 user matching "Alice" out of 5)
          expect(screen.getByText('1 / 5 rows')).toBeInTheDocument()
        },
        { timeout: 500 },
      )
    })
  })

  // ===========================================================================
  // Column Visibility Tests
  // ===========================================================================

  describe('column visibility', () => {
    it('should render View button for column visibility', () => {
      render(<DataTable columns={testColumns} data={testData} />)

      expect(screen.getByRole('button', { name: /view/i })).toBeInTheDocument()
    })

    it('should show column visibility dropdown when clicking View', async () => {
      const user = userEvent.setup()

      render(<DataTable columns={testColumns} data={testData} tableId="test-table" />)

      const viewButton = screen.getByRole('button', { name: /view/i })
      await user.click(viewButton)

      // Should show column names in dropdown
      await waitFor(() => {
        const dropdown = document.querySelector('[data-radix-menu-content]')
        expect(dropdown).toBeInTheDocument()
      })
    })

    it('should show reset button when tableId is provided', async () => {
      const user = userEvent.setup()

      render(<DataTable columns={testColumns} data={testData} tableId="test-table" />)

      const viewButton = screen.getByRole('button', { name: /view/i })
      await user.click(viewButton)

      await waitFor(() => {
        expect(screen.getByTitle('Reset columns')).toBeInTheDocument()
      })
    })

    it('should use custom settings menu when provided', () => {
      const customSettingsMenu = vi.fn().mockReturnValue(<button data-testid="custom-settings">Custom</button>)

      render(<DataTable columns={testColumns} data={testData} settingsMenu={customSettingsMenu} />)

      expect(screen.getByTestId('custom-settings')).toBeInTheDocument()
      // Default View button should not be present
      expect(screen.queryByRole('button', { name: /view/i })).not.toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Row Selection Tests
  // ===========================================================================

  describe('row selection', () => {
    const columnsWithSelection: ColumnDef<TestItem>[] = [
      {
        id: 'select',
        header: 'Select',
        cell: ({ row }) => (
          <button
            role="checkbox"
            aria-checked={row.getIsSelected()}
            onClick={() => row.toggleSelected()}
            data-testid={`select-${row.original.id}`}
          >
            {row.getIsSelected() ? 'Selected' : 'Unselected'}
          </button>
        ),
      },
      ...testColumns,
    ]

    it('should render bulk actions when rows are selected', async () => {
      const user = userEvent.setup()
      const bulkActions = vi.fn().mockReturnValue(<button data-testid="bulk-action">Delete Selected</button>)

      render(<DataTable columns={columnsWithSelection} data={testData} bulkActions={bulkActions} />)

      // Select a row
      const selectButton = screen.getByTestId('select-1')
      await user.click(selectButton)

      await waitFor(() => {
        expect(screen.getByTestId('bulk-action')).toBeInTheDocument()
      })
    })

    it('should render context actions when rows are selected', async () => {
      const user = userEvent.setup()
      const contextActions = vi.fn().mockReturnValue(<button data-testid="context-action">Edit</button>)

      render(<DataTable columns={columnsWithSelection} data={testData} contextActions={contextActions} />)

      // Select a row
      const selectButton = screen.getByTestId('select-1')
      await user.click(selectButton)

      await waitFor(() => {
        expect(screen.getByTestId('context-action')).toBeInTheDocument()
      })
    })

    it('should pass selected rows to bulk actions', async () => {
      const user = userEvent.setup()
      const bulkActions = vi.fn().mockReturnValue(null)

      render(<DataTable columns={columnsWithSelection} data={testData} bulkActions={bulkActions} />)

      // Select first row
      const selectButton = screen.getByTestId('select-1')
      await user.click(selectButton)

      await waitFor(() => {
        expect(bulkActions).toHaveBeenCalledWith([expect.objectContaining({ id: '1', name: 'Alice Smith' })])
      })
    })
  })

  // ===========================================================================
  // Row Click Tests
  // ===========================================================================

  describe('row click', () => {
    it('should call onRowClick when row is clicked', async () => {
      const user = userEvent.setup()
      const onRowClick = vi.fn()

      render(<DataTable columns={testColumns} data={testData} onRowClick={onRowClick} />)

      // Find and click a row
      const aliceRow = screen.getByText('Alice Smith').closest('tr')
      if (aliceRow) {
        await user.click(aliceRow)
      }

      expect(onRowClick).toHaveBeenCalledWith(expect.objectContaining({ id: '1', name: 'Alice Smith' }))
    })

    it('should apply cursor-pointer class when onRowClick is provided', () => {
      const onRowClick = vi.fn()

      render(<DataTable columns={testColumns} data={testData} onRowClick={onRowClick} />)

      const row = screen.getByText('Alice Smith').closest('tr')
      expect(row).toHaveClass('cursor-pointer')
    })

    it('should not apply cursor-pointer when onRowClick is not provided', () => {
      render(<DataTable columns={testColumns} data={testData} />)

      const row = screen.getByText('Alice Smith').closest('tr')
      expect(row).not.toHaveClass('cursor-pointer')
    })
  })

  // ===========================================================================
  // Toolbar Actions Tests
  // ===========================================================================

  describe('toolbar actions', () => {
    it('should render toolbar actions', () => {
      render(
        <DataTable
          columns={testColumns}
          data={testData}
          toolbarActions={<button data-testid="add-button">Add New</button>}
        />,
      )

      expect(screen.getByTestId('add-button')).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Large Rows Tests
  // ===========================================================================

  describe('large rows', () => {
    it('should apply larger padding when largeRows is true', () => {
      render(<DataTable columns={testColumns} data={testData} largeRows={true} />)

      // Find a table cell and check for py-4 class
      const cell = screen.getByText('Alice Smith').closest('td')
      expect(cell).toHaveClass('py-4')
    })
  })

  // ===========================================================================
  // Custom Row ID Tests
  // ===========================================================================

  describe('custom row id', () => {
    it('should use custom getRowId function', () => {
      const getRowId = vi.fn((row: TestItem) => `custom-${row.id}`)

      render(<DataTable columns={testColumns} data={testData} getRowId={getRowId} />)

      // getRowId should be called for each row
      expect(getRowId).toHaveBeenCalledTimes(testData.length)
    })
  })

  // ===========================================================================
  // Sorting Tests
  // ===========================================================================

  describe('sorting', () => {
    const sortableColumns: ColumnDef<TestItem>[] = [
      {
        accessorKey: 'name',
        header: 'Name',
        enableSorting: true,
      },
      {
        accessorKey: 'email',
        header: 'Email',
        enableSorting: true,
      },
    ]

    it('should render sortable headers', () => {
      render(<DataTable columns={sortableColumns} data={testData} />)

      expect(screen.getByText('Name')).toBeInTheDocument()
      expect(screen.getByText('Email')).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Default Column Visibility Tests
  // ===========================================================================

  describe('default column visibility', () => {
    it('should hide id column by default for subjects-table', () => {
      render(<DataTable columns={testColumns} data={testData} tableId="subjects-table" />)

      // ID column should be hidden
      const headers = screen.getAllByRole('columnheader')
      const headerTexts = headers.map((h) => h.textContent)
      expect(headerTexts).not.toContain('ID')
    })
  })
})
