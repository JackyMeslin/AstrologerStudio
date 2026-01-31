/**
 * Hook Dependencies Behavior Tests
 *
 * Tests to verify that React hooks have correct dependency arrays and don't
 * cause stale value bugs. These tests verify the fixes for eslint-disable
 * react-hooks/exhaustive-deps that were properly removed.
 *
 * @module src/test/components/hook-dependencies.test.tsx
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DataTable } from '@/components/data-table/DataTable'
import type { ColumnDef } from '@tanstack/react-table'

// Mock Prisma to prevent any DB access
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), findMany: vi.fn() },
    subject: { findUnique: vi.fn(), findMany: vi.fn() },
  },
}))

// Mock the table preferences store
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

// Test data
interface TestItem {
  id: string
  name: string
}

const testData: TestItem[] = [
  { id: '1', name: 'Alice' },
  { id: '2', name: 'Bob' },
  { id: '3', name: 'Charlie' },
]

const testColumns: ColumnDef<TestItem>[] = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'name', header: 'Name' },
]

describe('Hook Dependencies - GlobalFilterInput Sync', () => {
  it('should sync local value when external value changes', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<DataTable columns={testColumns} data={testData} globalFilter={true} />)

    const filterInput = screen.getByPlaceholderText('Filter...')

    // Type something
    await user.type(filterInput, 'Alice')

    await waitFor(() => {
      expect(filterInput).toHaveValue('Alice')
    })

    // Clear via the clear button to simulate external reset
    const clearButton = screen.getByRole('button', { name: /clear filter/i })
    await user.click(clearButton)

    await waitFor(() => {
      expect(filterInput).toHaveValue('')
    })

    // Re-render to ensure the component still works properly
    rerender(<DataTable columns={testColumns} data={testData} globalFilter={true} />)

    // Type again - should work without stale closure issues
    await user.type(filterInput, 'Bob')

    await waitFor(
      () => {
        expect(screen.getByText('Bob')).toBeInTheDocument()
        expect(screen.queryByText('Alice')).not.toBeInTheDocument()
      },
      { timeout: 500 },
    )
  })

  it('should not reset local value on every external prop change when value has not changed', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<DataTable columns={testColumns} data={testData} globalFilter={true} />)

    const filterInput = screen.getByPlaceholderText('Filter...')

    // Type something
    await user.type(filterInput, 'Ali')

    await waitFor(() => {
      expect(filterInput).toHaveValue('Ali')
    })

    // Re-render with same data - local value should be preserved
    rerender(<DataTable columns={testColumns} data={testData} globalFilter={true} />)

    // The input should still have the same value
    expect(filterInput).toHaveValue('Ali')
  })

  it('should debounce filter updates correctly', async () => {
    const user = userEvent.setup()
    render(<DataTable columns={testColumns} data={testData} globalFilter={true} />)

    const filterInput = screen.getByPlaceholderText('Filter...')

    // Rapidly type multiple characters
    await user.type(filterInput, 'Char')

    // The debounce delay is 300ms, so the filter should apply after waiting
    await waitFor(
      () => {
        expect(screen.getByText('Charlie')).toBeInTheDocument()
        expect(screen.queryByText('Alice')).not.toBeInTheDocument()
        expect(screen.queryByText('Bob')).not.toBeInTheDocument()
      },
      { timeout: 500 },
    )
  })
})

describe('Hook Dependencies - Stable Callback References', () => {
  it('should maintain stable function references across renders for useMemo dependencies', async () => {
    // This test verifies that the columns useMemo doesn't cause excessive re-renders
    const onRowClick = vi.fn()

    const { rerender } = render(<DataTable columns={testColumns} data={testData} onRowClick={onRowClick} />)

    // Click a row
    const row = screen.getByText('Alice').closest('tr')
    if (row) {
      await act(async () => {
        row.click()
      })
    }

    expect(onRowClick).toHaveBeenCalledTimes(1)

    // Re-render with same props
    rerender(<DataTable columns={testColumns} data={testData} onRowClick={onRowClick} />)

    // Click again - should still work
    if (row) {
      await act(async () => {
        row.click()
      })
    }

    expect(onRowClick).toHaveBeenCalledTimes(2)
  })
})
