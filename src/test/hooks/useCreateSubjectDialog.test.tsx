/**
 * Unit Tests for useCreateSubjectDialog Hook - Type Safety
 *
 * Tests that the hook properly uses typed form values with zodResolver,
 * ensuring full type safety between form values and validation.
 *
 * @module src/hooks/useCreateSubjectDialog
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as React from 'react'

// ============================================================================
// Mocks - Must be defined before importing the hook
// ============================================================================

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
}))

const mockCreateSubject = vi.fn()
vi.mock('@/lib/api/subjects', () => ({
  createSubject: (...args: unknown[]) => mockCreateSubject(...args),
}))

// Mock Prisma to prevent any DB access
vi.mock('@/lib/db/prisma', () => ({
  prisma: {},
  default: {},
}))

// Import the hook after mocks are set up
import { useCreateSubjectDialog } from '@/hooks/useCreateSubjectDialog'
import { useCreateSubjectDialogStore } from '@/stores/createSubjectDialog'
import { queryKeys } from '@/lib/query-keys'
import type { Subject, CreateSubjectFormInput } from '@/types/subjects'

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
    name: 'Existing Subject',
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
]

describe('useCreateSubjectDialog hook - Type Safety', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = createTestQueryClient()
    queryClient.setQueryData(queryKeys.subjects.list(), mockSubjects)
    // Reset store state
    useCreateSubjectDialogStore.getState().closeDialog()
  })

  afterEach(() => {
    queryClient.clear()
  })

  // ===========================================================================
  // Form Type Safety Tests
  // ===========================================================================

  describe('form type safety', () => {
    it('should initialize form with correctly typed default values', () => {
      const { result } = renderHook(() => useCreateSubjectDialog(), {
        wrapper: createWrapper(queryClient),
      })

      const formValues = result.current.form.getValues()

      // Verify all fields are present with correct initial types
      expect(formValues.name).toBe('')
      expect(formValues.city).toBe('')
      expect(formValues.nation).toBe('')
      expect(formValues.birthDate).toBe('')
      expect(formValues.birthTime).toBe('')
      expect(formValues.latitude).toBeUndefined()
      expect(formValues.longitude).toBeUndefined()
      expect(formValues.timezone).toBe('UTC')
      expect(formValues.rodens_rating).toBeNull()
      expect(formValues.tags).toBeNull()
    })

    it('should accept typed form input values matching CreateSubjectFormInput', () => {
      const { result } = renderHook(() => useCreateSubjectDialog(), {
        wrapper: createWrapper(queryClient),
      })

      // Type-safe form value assignment
      const formInput: CreateSubjectFormInput = {
        name: 'John Doe',
        city: 'Rome',
        nation: 'Italy',
        timezone: 'Europe/Rome',
        birthDate: '1990-05-15T00:00:00.000Z',
        birthTime: '12:30:00',
        latitude: 41.9028,
        longitude: 12.4964,
        rodens_rating: 'AA',
        tags: ['client', 'vip'],
      }

      act(() => {
        result.current.form.reset(formInput)
      })

      const values = result.current.form.getValues()
      expect(values.name).toBe('John Doe')
      expect(values.city).toBe('Rome')
      expect(values.birthDate).toBe('1990-05-15T00:00:00.000Z')
      expect(values.birthTime).toBe('12:30:00')
      expect(values.latitude).toBe(41.9028)
      expect(values.longitude).toBe(12.4964)
      expect(values.rodens_rating).toBe('AA')
      expect(values.tags).toEqual(['client', 'vip'])
    })

    it('should handle nullable fields correctly', () => {
      const { result } = renderHook(() => useCreateSubjectDialog(), {
        wrapper: createWrapper(queryClient),
      })

      act(() => {
        result.current.form.setValue('rodens_rating', null)
        result.current.form.setValue('tags', null)
      })

      expect(result.current.form.getValues('rodens_rating')).toBeNull()
      expect(result.current.form.getValues('tags')).toBeNull()
    })

    it('should handle optional coordinate fields', () => {
      const { result } = renderHook(() => useCreateSubjectDialog(), {
        wrapper: createWrapper(queryClient),
      })

      // Initially undefined
      expect(result.current.form.getValues('latitude')).toBeUndefined()
      expect(result.current.form.getValues('longitude')).toBeUndefined()

      // Set values
      act(() => {
        result.current.form.setValue('latitude', 41.9028)
        result.current.form.setValue('longitude', 12.4964)
      })

      expect(result.current.form.getValues('latitude')).toBe(41.9028)
      expect(result.current.form.getValues('longitude')).toBe(12.4964)
    })
  })

  // ===========================================================================
  // Mutation Type Safety Tests
  // ===========================================================================

  describe('mutation type safety', () => {
    it('should pass transformed validated data to mutation', async () => {
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

      const { result } = renderHook(() => useCreateSubjectDialog(), {
        wrapper: createWrapper(queryClient),
      })

      // Open dialog via store
      act(() => {
        useCreateSubjectDialogStore.getState().openDialog()
      })

      // Fill form with valid data
      act(() => {
        result.current.form.setValue('name', 'New Subject')
        result.current.form.setValue('city', 'Berlin')
        result.current.form.setValue('nation', 'DE')
        result.current.form.setValue('birthDate', '2000-01-01T00:00:00.000Z')
        result.current.form.setValue('birthTime', '00:00:00')
        result.current.form.setValue('latitude', 52.52)
        result.current.form.setValue('longitude', 13.405)
        result.current.form.setValue('timezone', 'Europe/Berlin')
      })

      await act(async () => {
        await result.current.onSubmit()
      })

      // Verify mutation was called with validated/transformed data
      await waitFor(() => {
        expect(mockCreateSubject).toHaveBeenCalledTimes(1)
      })

      const calledWith = mockCreateSubject.mock.calls[0]![0]
      expect(calledWith.name).toBe('New Subject')
      expect(calledWith.city).toBe('Berlin')
      expect(calledWith.nation).toBe('DE')
      expect(calledWith.timezone).toBe('Europe/Berlin')
      // birthDate should be transformed to ISO string by Zod
      expect(calledWith.birthDate).toBeDefined()
      expect(calledWith.birthTime).toBe('00:00:00')
    })

    it('should add new subject to cache on success', async () => {
      const newSubject: Subject = {
        id: 'subj-new',
        name: 'Cache Test Subject',
        birth_datetime: '1995-06-15T14:30:00.000Z',
        city: 'Paris',
        nation: 'FR',
        latitude: 48.8566,
        longitude: 2.3522,
        timezone: 'Europe/Paris',
        rodens_rating: 'A',
        tags: ['test'],
        notes: null,
      }
      mockCreateSubject.mockResolvedValue(newSubject)

      const { result } = renderHook(() => useCreateSubjectDialog(), {
        wrapper: createWrapper(queryClient),
      })

      // Fill and submit
      act(() => {
        result.current.form.setValue('name', 'Cache Test Subject')
        result.current.form.setValue('city', 'Paris')
        result.current.form.setValue('nation', 'FR')
        result.current.form.setValue('birthDate', '1995-06-15T00:00:00.000Z')
        result.current.form.setValue('birthTime', '14:30:00')
        result.current.form.setValue('latitude', 48.8566)
        result.current.form.setValue('longitude', 2.3522)
        result.current.form.setValue('timezone', 'Europe/Paris')
        result.current.form.setValue('rodens_rating', 'A')
        result.current.form.setValue('tags', ['test'])
      })

      await act(async () => {
        await result.current.onSubmit()
      })

      // Verify cache was updated
      await waitFor(() => {
        const cachedData = queryClient.getQueryData<Subject[]>(queryKeys.subjects.list())
        expect(cachedData).toHaveLength(2)
        expect(cachedData![0]!.id).toBe('subj-new') // New subject should be first
      })
    })

    it('should navigate to natal chart on success', async () => {
      const newSubject: Subject = {
        id: 'subj-nav',
        name: 'Navigation Test',
        birth_datetime: '2000-01-01T00:00:00.000Z',
        city: 'London',
        nation: 'GB',
        latitude: 51.5074,
        longitude: -0.1278,
        timezone: 'Europe/London',
        rodens_rating: null,
        tags: null,
        notes: null,
      }
      mockCreateSubject.mockResolvedValue(newSubject)

      const { result } = renderHook(() => useCreateSubjectDialog(), {
        wrapper: createWrapper(queryClient),
      })

      // Fill and submit
      act(() => {
        result.current.form.setValue('name', 'Navigation Test')
        result.current.form.setValue('city', 'London')
        result.current.form.setValue('nation', 'GB')
        result.current.form.setValue('birthDate', '2000-01-01T00:00:00.000Z')
        result.current.form.setValue('birthTime', '00:00:00')
        result.current.form.setValue('latitude', 51.5074)
        result.current.form.setValue('longitude', -0.1278)
        result.current.form.setValue('timezone', 'Europe/London')
      })

      await act(async () => {
        await result.current.onSubmit()
      })

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/subjects/subj-nav/natal')
      })
    })

    it('should set error on mutation failure', async () => {
      mockCreateSubject.mockRejectedValue(new Error('API Error: Creation failed'))

      const { result } = renderHook(() => useCreateSubjectDialog(), {
        wrapper: createWrapper(queryClient),
      })

      // Fill and submit
      act(() => {
        result.current.form.setValue('name', 'Error Test')
        result.current.form.setValue('city', 'London')
        result.current.form.setValue('nation', 'GB')
        result.current.form.setValue('birthDate', '2000-01-01T00:00:00.000Z')
        result.current.form.setValue('birthTime', '00:00:00')
        result.current.form.setValue('latitude', 51.5074)
        result.current.form.setValue('longitude', -0.1278)
        result.current.form.setValue('timezone', 'Europe/London')
      })

      await act(async () => {
        await result.current.onSubmit()
      })

      await waitFor(() => {
        expect(result.current.error).toBe('API Error: Creation failed')
      })
    })
  })

  // ===========================================================================
  // Dialog State Tests
  // ===========================================================================

  describe('dialog state management', () => {
    it('should reflect store open state', () => {
      const { result } = renderHook(() => useCreateSubjectDialog(), {
        wrapper: createWrapper(queryClient),
      })

      expect(result.current.open).toBe(false)

      act(() => {
        useCreateSubjectDialogStore.getState().openDialog()
      })

      expect(result.current.open).toBe(true)

      act(() => {
        useCreateSubjectDialogStore.getState().closeDialog()
      })

      expect(result.current.open).toBe(false)
    })

    it('should reset form when dialog closes', () => {
      const { result } = renderHook(() => useCreateSubjectDialog(), {
        wrapper: createWrapper(queryClient),
      })

      // Open and modify form
      act(() => {
        useCreateSubjectDialogStore.getState().openDialog()
        result.current.form.setValue('name', 'Modified Name')
      })

      expect(result.current.form.getValues('name')).toBe('Modified Name')

      // Close dialog through onOpenChange
      act(() => {
        result.current.onOpenChange(false)
      })

      // Form should be reset
      expect(result.current.form.getValues('name')).toBe('')
    })

    it('should clear error when dialog closes', () => {
      mockCreateSubject.mockRejectedValue(new Error('Test error'))

      const { result } = renderHook(() => useCreateSubjectDialog(), {
        wrapper: createWrapper(queryClient),
      })

      // Trigger error by submitting with required fields
      act(() => {
        result.current.form.setValue('name', 'Test')
        result.current.form.setValue('city', 'Test')
        result.current.form.setValue('nation', 'Test')
        result.current.form.setValue('timezone', 'UTC')
        result.current.form.setValue('birthDate', '2000-01-01T00:00:00.000Z')
        result.current.form.setValue('birthTime', '00:00:00')
        result.current.form.setValue('latitude', 0)
        result.current.form.setValue('longitude', 0)
      })

      // Close dialog
      act(() => {
        result.current.onOpenChange(false)
      })

      expect(result.current.error).toBeNull()
    })
  })
})
