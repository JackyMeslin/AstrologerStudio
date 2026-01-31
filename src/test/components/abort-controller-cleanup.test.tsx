/**
 * Tests for AbortController Cleanup in Components
 *
 * Tests that fetch requests are properly cancelled via AbortController
 * when components unmount, preventing state updates on unmounted components.
 *
 * Components tested:
 * - SubjectNotesPanel
 * - SavedCalculationsTable
 * - SavedCalculationsSidebar
 * - CheckoutSuccessHandler
 *
 * @module src/test/components/abort-controller-cleanup.test
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup, waitFor } from '@testing-library/react'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// ============================================================================
// Mocks - Must be defined before importing components
// ============================================================================

// Mock next/navigation
const mockPush = vi.fn()
const mockReplace = vi.fn()
const mockSearchParams = new URLSearchParams()
const mockGetSearchParam = vi.fn((key: string) => mockSearchParams.get(key))
const mockPathname = '/dashboard'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => ({
    get: mockGetSearchParam,
    toString: () => mockSearchParams.toString(),
    [Symbol.iterator]: () => mockSearchParams[Symbol.iterator](),
  }),
  usePathname: () => mockPathname,
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

// Mock client logger
vi.mock('@/lib/logging/client', () => ({
  clientLogger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

// Mock useAIInterpretation store
vi.mock('@/stores/aiInterpretationSettings', () => ({
  useAIInterpretation: () => ({ selectedSchool: 'traditional' }),
}))

// Mock useAIUsage hook
vi.mock('@/hooks/useAIUsage', () => ({
  useAIUsage: () => ({ data: { usage: 0, remaining: 10, limit: 10 } }),
}))

// Mock useWakeLock hook
vi.mock('@/hooks/useWakeLock', () => ({
  useWakeLock: () => ({
    request: vi.fn(),
    release: vi.fn(),
  }),
}))

// Mock interpretations cache
vi.mock('@/lib/cache/interpretations', () => ({
  getInterpretation: vi.fn().mockResolvedValue(null),
  saveInterpretationChunk: vi.fn(),
  deleteInterpretation: vi.fn(),
}))

// Mock date-fns format
vi.mock('date-fns', () => ({
  format: vi.fn(() => 'Jan 1, 2024'),
}))

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch as unknown as typeof fetch

// Import components after mocks are set up
import { SubjectNotesPanel } from '@/components/SubjectNotesPanel'
import { SavedCalculationsTable } from '@/components/SavedCalculationsTable'
import { SavedCalculationsSidebar } from '@/components/SavedCalculationsSidebar'
import { CheckoutSuccessHandler } from '@/components/CheckoutSuccessHandler'

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

function TestWrapper({ children, queryClient }: { children: React.ReactNode; queryClient: QueryClient }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('AbortController Cleanup Tests', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = createTestQueryClient()
    mockSearchParams.delete('checkout')
    mockFetch.mockImplementation((_url: string, _options?: RequestInit) => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ notes: 'Test notes' }),
      })
    })
  })

  afterEach(() => {
    cleanup()
    queryClient.clear()
  })

  // ===========================================================================
  // SubjectNotesPanel Tests
  // ===========================================================================

  describe('SubjectNotesPanel - AbortController cleanup', () => {
    it('should pass AbortSignal to fetch when loading notes', async () => {
      render(
        <TestWrapper queryClient={queryClient}>
          <SubjectNotesPanel subjectId="test-subject-123" />
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/subjects/test-subject-123/notes',
          expect.objectContaining({ signal: expect.any(AbortSignal) }),
        )
      })
    })

    it('should abort fetch request on unmount', async () => {
      // Create a delayed fetch to ensure the request is in-flight when we unmount
      let capturedSignal: AbortSignal | null = null
      mockFetch.mockImplementation((_url: string, options?: RequestInit) => {
        capturedSignal = options?.signal || null
        return new Promise((resolve) => {
          setTimeout(() => resolve({ ok: true, json: () => Promise.resolve({ notes: '' }) }), 100)
        })
      })

      const { unmount } = render(
        <TestWrapper queryClient={queryClient}>
          <SubjectNotesPanel subjectId="test-subject-123" />
        </TestWrapper>,
      )

      // Wait for fetch to be initiated
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })

      // Unmount the component
      unmount()

      // The signal should have been aborted
      expect(capturedSignal).not.toBeNull()
      expect(capturedSignal!.aborted).toBe(true)
    })

    it('should not show error toast when fetch is aborted', async () => {
      const { toast } = await import('sonner')
      const mockToastError = vi.mocked(toast.error)

      // Create a fetch that rejects with AbortError
      mockFetch.mockImplementation((_url: string, options?: RequestInit) => {
        if (options?.signal) {
          options.signal.addEventListener('abort', () => {})
        }
        return new Promise((_, reject) => {
          setTimeout(() => {
            const error = new Error('The operation was aborted')
            error.name = 'AbortError'
            reject(error)
          }, 50)
        })
      })

      const { unmount } = render(
        <TestWrapper queryClient={queryClient}>
          <SubjectNotesPanel subjectId="test-subject-123" />
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })

      unmount()

      // Wait a bit to ensure any error handling would have occurred
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Should not show error toast for abort
      expect(mockToastError).not.toHaveBeenCalled()
    })
  })

  // ===========================================================================
  // SavedCalculationsTable Tests
  // ===========================================================================

  describe('SavedCalculationsTable - AbortController cleanup', () => {
    it('should pass AbortSignal to fetch when loading saved charts', async () => {
      mockFetch.mockImplementation((_url: string, _options?: RequestInit) => {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        })
      })

      render(
        <TestWrapper queryClient={queryClient}>
          <SavedCalculationsTable />
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/saved-charts',
          expect.objectContaining({ signal: expect.any(AbortSignal) }),
        )
      })
    })

    it('should abort fetch request on unmount', async () => {
      let capturedSignal: AbortSignal | null = null
      mockFetch.mockImplementation((_url: string, options?: RequestInit) => {
        capturedSignal = options?.signal || null
        return new Promise((resolve) => {
          setTimeout(() => resolve({ ok: true, json: () => Promise.resolve([]) }), 100)
        })
      })

      const { unmount } = render(
        <TestWrapper queryClient={queryClient}>
          <SavedCalculationsTable />
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })

      unmount()

      expect(capturedSignal).not.toBeNull()
      expect(capturedSignal!.aborted).toBe(true)
    })
  })

  // ===========================================================================
  // SavedCalculationsSidebar Tests
  // ===========================================================================

  describe('SavedCalculationsSidebar - AbortController cleanup', () => {
    it('should pass AbortSignal to fetch when loading saved charts', async () => {
      mockFetch.mockImplementation((_url: string, _options?: RequestInit) => {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        })
      })

      render(
        <TestWrapper queryClient={queryClient}>
          <SavedCalculationsSidebar />
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/saved-charts',
          expect.objectContaining({ signal: expect.any(AbortSignal) }),
        )
      })
    })

    it('should abort fetch request on unmount', async () => {
      let capturedSignal: AbortSignal | null = null
      mockFetch.mockImplementation((_url: string, options?: RequestInit) => {
        capturedSignal = options?.signal || null
        return new Promise((resolve) => {
          setTimeout(() => resolve({ ok: true, json: () => Promise.resolve([]) }), 100)
        })
      })

      const { unmount } = render(
        <TestWrapper queryClient={queryClient}>
          <SavedCalculationsSidebar />
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })

      unmount()

      expect(capturedSignal).not.toBeNull()
      expect(capturedSignal!.aborted).toBe(true)
    })
  })

  // ===========================================================================
  // CheckoutSuccessHandler Tests
  // ===========================================================================

  describe('CheckoutSuccessHandler - AbortController cleanup', () => {
    beforeEach(() => {
      mockGetSearchParam.mockReturnValue('success')
    })

    it('should pass AbortSignal to fetch when syncing subscription', async () => {
      render(
        <TestWrapper queryClient={queryClient}>
          <CheckoutSuccessHandler />
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/subscription/status?forceSync=true',
          expect.objectContaining({ signal: expect.any(AbortSignal) }),
        )
      })
    })

    it('should abort fetch request on unmount during checkout processing', async () => {
      let capturedSignal: AbortSignal | null = null
      mockFetch.mockImplementation((_url: string, options?: RequestInit) => {
        capturedSignal = options?.signal || null
        return new Promise((resolve) => {
          setTimeout(() => resolve({ ok: true, json: () => Promise.resolve({}) }), 100)
        })
      })

      const { unmount } = render(
        <TestWrapper queryClient={queryClient}>
          <CheckoutSuccessHandler />
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })

      unmount()

      expect(capturedSignal).not.toBeNull()
      expect(capturedSignal!.aborted).toBe(true)
    })

    it('should not show error toast when fetch is aborted', async () => {
      const { toast } = await import('sonner')
      const mockToastError = vi.mocked(toast.error)

      mockFetch.mockImplementation((_url: string, options?: RequestInit) => {
        if (options?.signal) {
          options.signal.addEventListener('abort', () => {})
        }
        return new Promise((_, reject) => {
          setTimeout(() => {
            const error = new Error('The operation was aborted')
            error.name = 'AbortError'
            reject(error)
          }, 50)
        })
      })

      const { unmount } = render(
        <TestWrapper queryClient={queryClient}>
          <CheckoutSuccessHandler />
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })

      unmount()

      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(mockToastError).not.toHaveBeenCalled()
    })
  })

  // ===========================================================================
  // General AbortController Pattern Tests
  // ===========================================================================

  describe('AbortController pattern verification', () => {
    it('fetch with AbortSignal should throw AbortError when aborted', async () => {
      const controller = new AbortController()

      const fetchPromise = new Promise((_, reject) => {
        controller.signal.addEventListener('abort', () => {
          const error = new Error('The operation was aborted')
          error.name = 'AbortError'
          reject(error)
        })
      })

      controller.abort()

      await expect(fetchPromise).rejects.toThrow('The operation was aborted')
    })

    it('AbortError should be identifiable by name property', () => {
      const error = new Error('The operation was aborted')
      error.name = 'AbortError'

      expect(error instanceof Error).toBe(true)
      expect(error.name).toBe('AbortError')
    })
  })
})
