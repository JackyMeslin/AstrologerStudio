/**
 * Unit Tests for useChartSubject Hook
 *
 * Tests the hook that fetches subject data for chart views.
 * Provides consistent subject fetching across all chart view components.
 *
 * @module src/hooks/useChartSubject
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as React from 'react'

// Mock the getSubjectById action
const mockGetSubjectById = vi.fn()
vi.mock('@/actions/subjects', () => ({
  getSubjectById: (...args: unknown[]) => mockGetSubjectById(...args),
}))

// Import hook after mocks are set up
import { useChartSubject } from '@/hooks/useChartSubject'

// Test wrapper with React Query provider
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useChartSubject', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ===========================================================================
  // Successful Fetching
  // ===========================================================================

  describe('successful fetching', () => {
    it('should fetch subject data by ID', async () => {
      const mockSubject = {
        id: 'test-123',
        name: 'John Doe',
        birth_datetime: '1990-01-15T12:30:00Z',
        city: 'Rome',
        nation: 'Italy',
        latitude: 41.9028,
        longitude: 12.4964,
        timezone: 'Europe/Rome',
      }
      mockGetSubjectById.mockResolvedValueOnce(mockSubject)

      const { result } = renderHook(() => useChartSubject('test-123'), {
        wrapper: createWrapper(),
      })

      // Initially loading
      expect(result.current.isLoading).toBe(true)

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Verify data
      expect(result.current.data).toEqual(mockSubject)
      expect(mockGetSubjectById).toHaveBeenCalledWith('test-123')
    })

    it('should use correct query key for caching', async () => {
      const mockSubject = {
        id: 'test-456',
        name: 'Jane Doe',
        birth_datetime: '1985-05-20T08:00:00Z',
        city: 'Paris',
        nation: 'France',
        latitude: 48.8566,
        longitude: 2.3522,
        timezone: 'Europe/Paris',
      }
      mockGetSubjectById.mockResolvedValueOnce(mockSubject)

      const { result } = renderHook(() => useChartSubject('test-456'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // API should only be called once (result is cached)
      expect(mockGetSubjectById).toHaveBeenCalledTimes(1)
    })
  })

  // ===========================================================================
  // Loading States
  // ===========================================================================

  describe('loading states', () => {
    it('should set isLoading to true while fetching', async () => {
      // Delay the response to test loading state
      mockGetSubjectById.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ id: 'test' }), 100)),
      )

      const { result } = renderHook(() => useChartSubject('test-loading'), {
        wrapper: createWrapper(),
      })

      // Should be loading initially
      expect(result.current.isLoading).toBe(true)
      expect(result.current.data).toBeUndefined()

      // Wait for completion
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })
  })

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe('error handling', () => {
    it('should handle errors when subject is not found', async () => {
      const error = new Error('Subject not found')
      mockGetSubjectById.mockRejectedValueOnce(error)

      const { result } = renderHook(() => useChartSubject('non-existent'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.error).toBeTruthy()
      expect(result.current.data).toBeUndefined()
    })

    it('should handle null response', async () => {
      mockGetSubjectById.mockResolvedValueOnce(null)

      const { result } = renderHook(() => useChartSubject('null-subject'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.data).toBeNull()
    })
  })
})
