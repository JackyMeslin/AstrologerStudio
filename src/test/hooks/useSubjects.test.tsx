/**
 * Unit Tests for useSubjects Hook - Optimistic Update Rollback
 *
 * Tests that optimistic updates are properly rolled back when mutations fail.
 *
 * @module src/hooks/useSubjects
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as React from 'react'

// ============================================================================
// Mocks - Must be defined before importing the hook
// ============================================================================

// Mock API functions
const mockDeleteSubject = vi.fn()
const mockUpdateSubject = vi.fn()
const mockCreateSubject = vi.fn()
const mockFetchRandomSubjects = vi.fn()
const mockImportSubjects = vi.fn()

vi.mock('@/lib/api/subjects', () => ({
  fetchRandomSubjects: (...args: unknown[]) => mockFetchRandomSubjects(...args),
  deleteSubject: (...args: unknown[]) => mockDeleteSubject(...args),
  updateSubject: (...args: unknown[]) => mockUpdateSubject(...args),
  createSubject: (...args: unknown[]) => mockCreateSubject(...args),
  importSubjects: (...args: unknown[]) => mockImportSubjects(...args),
}))

// Mock Prisma to prevent any DB access
vi.mock('@/lib/db/prisma', () => ({
  prisma: {},
  default: {},
}))

// Import the hook after mocks are set up
import { useSubjects } from '@/hooks/useSubjects'
import { queryKeys } from '@/lib/query-keys'
import type { Subject } from '@/types/subjects'

// ============================================================================
// Test Utilities
// ============================================================================

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

function createWrapper(queryClient: QueryClient) {
  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

// Test fixtures
const mockSubjects: Subject[] = [
  {
    id: 'subj-1',
    name: 'Subject One',
    birth_datetime: '1990-06-15T12:30:00.000Z',
    city: 'London',
    nation: 'GB',
    latitude: 51.5074,
    longitude: -0.1278,
    timezone: 'Europe/London',
    rodens_rating: 'AA',
    tags: ['test'],
    notes: 'Test notes',
  },
  {
    id: 'subj-2',
    name: 'Subject Two',
    birth_datetime: '1985-03-20T08:00:00.000Z',
    city: 'Paris',
    nation: 'FR',
    latitude: 48.8566,
    longitude: 2.3522,
    timezone: 'Europe/Paris',
    rodens_rating: 'A',
    tags: null,
    notes: null,
  },
]

describe('useSubjects hook - Optimistic Update Rollback', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = createTestQueryClient()
    // Pre-populate the cache with test subjects
    queryClient.setQueryData(queryKeys.subjects.list(), mockSubjects)
    mockFetchRandomSubjects.mockResolvedValue(mockSubjects)
  })

  afterEach(() => {
    queryClient.clear()
  })

  // ===========================================================================
  // Delete Mutation Rollback Tests
  // ===========================================================================

  describe('deleteMutation rollback', () => {
    it('should optimistically remove subject from cache immediately', async () => {
      mockDeleteSubject.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ id: 'subj-1' }), 100)),
      )

      const { result } = renderHook(() => useSubjects(), {
        wrapper: createWrapper(queryClient),
      })

      // Trigger delete
      act(() => {
        result.current.actions.openDeleteDialog(mockSubjects[0]!)
      })

      act(() => {
        result.current.deleteDialog.onConfirm()
      })

      // Cache should be updated optimistically (subject removed)
      await waitFor(() => {
        const cachedData = queryClient.getQueryData<Subject[]>(queryKeys.subjects.list())
        expect(cachedData).toHaveLength(1)
        expect(cachedData![0]!.id).toBe('subj-2')
      })
    })

    it('should rollback cache when delete mutation fails', async () => {
      const deleteError = new Error('Network error: Failed to delete')
      mockDeleteSubject.mockRejectedValue(deleteError)

      const { result } = renderHook(() => useSubjects(), {
        wrapper: createWrapper(queryClient),
      })

      // Verify initial state
      expect(queryClient.getQueryData<Subject[]>(queryKeys.subjects.list())).toHaveLength(2)

      // Trigger delete
      act(() => {
        result.current.actions.openDeleteDialog(mockSubjects[0]!)
      })

      act(() => {
        result.current.deleteDialog.onConfirm()
      })

      // Wait for mutation to fail and rollback
      await waitFor(() => {
        expect(result.current.deleteDialog.error).toBe('Network error: Failed to delete')
      })

      // Cache should be rolled back to original state
      const cachedData = queryClient.getQueryData<Subject[]>(queryKeys.subjects.list())
      expect(cachedData).toHaveLength(2)
      expect(cachedData?.find((s) => s.id === 'subj-1')).toBeDefined()
    })

    it('should cancel in-flight queries before optimistic update', async () => {
      const cancelQueriesSpy = vi.spyOn(queryClient, 'cancelQueries')
      mockDeleteSubject.mockResolvedValue({ id: 'subj-1' })

      const { result } = renderHook(() => useSubjects(), {
        wrapper: createWrapper(queryClient),
      })

      act(() => {
        result.current.actions.openDeleteDialog(mockSubjects[0]!)
      })

      act(() => {
        result.current.deleteDialog.onConfirm()
      })

      await waitFor(() => {
        expect(cancelQueriesSpy).toHaveBeenCalledWith({ queryKey: queryKeys.subjects.list() })
      })
    })
  })

  // ===========================================================================
  // Update Mutation Rollback Tests
  // ===========================================================================

  describe('updateMutation rollback', () => {
    it('should optimistically update subject in cache immediately', async () => {
      mockUpdateSubject.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ...mockSubjects[0],
                  name: 'Updated Name',
                }),
              100,
            ),
          ),
      )

      const { result } = renderHook(() => useSubjects(), {
        wrapper: createWrapper(queryClient),
      })

      // Open edit dialog
      act(() => {
        result.current.actions.openEditDialog(mockSubjects[0]!)
      })

      // Update form and submit
      act(() => {
        result.current.editDialog.form.setValue('name', 'Updated Name')
      })

      await act(async () => {
        await result.current.editDialog.onSubmit()
      })

      // Cache should be updated optimistically
      await waitFor(() => {
        const cachedData = queryClient.getQueryData<Subject[]>(queryKeys.subjects.list())
        const updatedSubject = cachedData?.find((s) => s.id === 'subj-1')
        expect(updatedSubject?.name).toBe('Updated Name')
      })
    })

    it('should rollback cache when update mutation fails', async () => {
      const updateError = new Error('Validation error: Invalid data')
      mockUpdateSubject.mockRejectedValue(updateError)

      const { result } = renderHook(() => useSubjects(), {
        wrapper: createWrapper(queryClient),
      })

      // Verify initial name
      const initialData = queryClient.getQueryData<Subject[]>(queryKeys.subjects.list())
      expect(initialData?.find((s) => s.id === 'subj-1')?.name).toBe('Subject One')

      // Open edit dialog
      act(() => {
        result.current.actions.openEditDialog(mockSubjects[0]!)
      })

      // Update form and submit
      act(() => {
        result.current.editDialog.form.setValue('name', 'This Will Fail')
      })

      await act(async () => {
        await result.current.editDialog.onSubmit()
      })

      // Wait for mutation to fail
      await waitFor(() => {
        expect(result.current.editDialog.error).toBe('Validation error: Invalid data')
      })

      // Cache should be rolled back to original state
      const cachedData = queryClient.getQueryData<Subject[]>(queryKeys.subjects.list())
      expect(cachedData?.find((s) => s.id === 'subj-1')?.name).toBe('Subject One')
    })

    it('should preserve other subjects when rolling back update', async () => {
      mockUpdateSubject.mockRejectedValue(new Error('Update failed'))

      const { result } = renderHook(() => useSubjects(), {
        wrapper: createWrapper(queryClient),
      })

      // Open edit dialog for first subject
      act(() => {
        result.current.actions.openEditDialog(mockSubjects[0]!)
      })

      act(() => {
        result.current.editDialog.form.setValue('name', 'Modified Name')
      })

      await act(async () => {
        await result.current.editDialog.onSubmit()
      })

      await waitFor(() => {
        expect(result.current.editDialog.error).toBeTruthy()
      })

      // Both subjects should still be present with original data
      const cachedData = queryClient.getQueryData<Subject[]>(queryKeys.subjects.list())
      expect(cachedData).toHaveLength(2)
      expect(cachedData?.find((s) => s.id === 'subj-1')?.name).toBe('Subject One')
      expect(cachedData?.find((s) => s.id === 'subj-2')?.name).toBe('Subject Two')
    })
  })

  // ===========================================================================
  // Create Mutation Tests (no rollback needed - update on success only)
  // ===========================================================================

  describe('createMutation', () => {
    it('should add new subject to cache on success', async () => {
      const newSubject: Subject = {
        id: 'subj-new',
        name: 'New Subject',
        birth_datetime: '2000-01-01T00:00:00.000Z',
        city: 'Berlin',
        nation: 'DE',
        latitude: 52.52,
        longitude: 13.405,
        timezone: 'Europe/Berlin',
        rodens_rating: null,
        tags: null,
        notes: null,
      }
      mockCreateSubject.mockResolvedValue(newSubject)

      const { result } = renderHook(() => useSubjects(), {
        wrapper: createWrapper(queryClient),
      })

      // Open create dialog
      act(() => {
        result.current.actions.openCreateDialog()
      })

      // Fill form
      act(() => {
        result.current.createDialog.form.setValue('name', 'New Subject')
        result.current.createDialog.form.setValue('city', 'Berlin')
        result.current.createDialog.form.setValue('nation', 'DE')
        result.current.createDialog.form.setValue('birthDate', '2000-01-01T00:00:00.000Z')
        result.current.createDialog.form.setValue('birthTime', '00:00:00')
        result.current.createDialog.form.setValue('latitude', 52.52)
        result.current.createDialog.form.setValue('longitude', 13.405)
        result.current.createDialog.form.setValue('timezone', 'Europe/Berlin')
      })

      await act(async () => {
        await result.current.createDialog.onSubmit()
      })

      // Wait for success
      await waitFor(() => {
        expect(result.current.createDialog.open).toBe(false)
      })

      // Cache should have the new subject
      const cachedData = queryClient.getQueryData<Subject[]>(queryKeys.subjects.list())
      expect(cachedData).toHaveLength(3)
      expect(cachedData![0]!.id).toBe('subj-new') // New subject should be first
    })

    it('should not modify cache when create mutation fails', async () => {
      mockCreateSubject.mockRejectedValue(new Error('Creation failed'))

      const { result } = renderHook(() => useSubjects(), {
        wrapper: createWrapper(queryClient),
      })

      // Verify initial state
      expect(queryClient.getQueryData<Subject[]>(queryKeys.subjects.list())).toHaveLength(2)

      // Open create dialog
      act(() => {
        result.current.actions.openCreateDialog()
      })

      // Fill minimal form data
      act(() => {
        result.current.createDialog.form.setValue('name', 'Failed Subject')
        result.current.createDialog.form.setValue('city', 'Rome')
        result.current.createDialog.form.setValue('nation', 'IT')
        result.current.createDialog.form.setValue('birthDate', '1990-01-01T00:00:00.000Z')
        result.current.createDialog.form.setValue('birthTime', '12:00:00')
        result.current.createDialog.form.setValue('latitude', 41.9028)
        result.current.createDialog.form.setValue('longitude', 12.4964)
        result.current.createDialog.form.setValue('timezone', 'Europe/Rome')
      })

      await act(async () => {
        await result.current.createDialog.onSubmit()
      })

      // Wait for error
      await waitFor(() => {
        expect(result.current.createDialog.error).toBe('Creation failed')
      })

      // Cache should remain unchanged
      const cachedData = queryClient.getQueryData<Subject[]>(queryKeys.subjects.list())
      expect(cachedData).toHaveLength(2)
    })
  })

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('edge cases', () => {
    it('should handle rollback when cache is initially empty', async () => {
      // Create a fresh query client without pre-populated cache
      const emptyQueryClient = createTestQueryClient()
      mockDeleteSubject.mockRejectedValue(new Error('Delete failed'))
      // Mock fetch to return empty array
      mockFetchRandomSubjects.mockResolvedValue([])

      const { result } = renderHook(() => useSubjects(), {
        wrapper: createWrapper(emptyQueryClient),
      })

      // Wait for query to settle
      await waitFor(() => {
        expect(result.current.query.isFetching).toBe(false)
      })

      // Try to delete (should not crash)
      act(() => {
        result.current.actions.openDeleteDialog(mockSubjects[0]!)
      })

      act(() => {
        result.current.deleteDialog.onConfirm()
      })

      await waitFor(() => {
        expect(result.current.deleteDialog.error).toBe('Delete failed')
      })

      // Should not crash, cache should be restored (empty array)
      const cachedData = emptyQueryClient.getQueryData<Subject[]>(queryKeys.subjects.list())
      expect(cachedData).toEqual([])
    })

    it('should handle multiple rapid delete attempts', async () => {
      mockDeleteSubject.mockRejectedValueOnce(new Error('First delete failed')).mockResolvedValueOnce({ id: 'subj-1' })

      const { result } = renderHook(() => useSubjects(), {
        wrapper: createWrapper(queryClient),
      })

      // First attempt - will fail
      act(() => {
        result.current.actions.openDeleteDialog(mockSubjects[0]!)
      })

      act(() => {
        result.current.deleteDialog.onConfirm()
      })

      await waitFor(() => {
        expect(result.current.deleteDialog.error).toBe('First delete failed')
      })

      // Cache should be rolled back
      expect(queryClient.getQueryData<Subject[]>(queryKeys.subjects.list())).toHaveLength(2)

      // Second attempt - will succeed
      act(() => {
        result.current.deleteDialog.onConfirm()
      })

      await waitFor(() => {
        expect(result.current.deleteDialog.open).toBe(false)
      })

      // Cache should now have only 1 subject
      expect(queryClient.getQueryData<Subject[]>(queryKeys.subjects.list())).toHaveLength(1)
    })
  })
})
