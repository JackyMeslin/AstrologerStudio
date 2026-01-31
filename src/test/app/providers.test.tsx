/**
 * Unit Tests for Providers - Global React Query Error Handlers
 *
 * Tests that global error handlers are properly configured for React Query
 * mutations and queries.
 *
 * @module src/app/providers
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useQuery, useMutation } from '@tanstack/react-query'
import * as React from 'react'

// ============================================================================
// Mocks - Must be defined before importing the providers
// ============================================================================

// Mock clientLogger - inline to avoid hoisting issues
vi.mock('@/lib/logging/client', () => ({
  clientLogger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    getLevel: vi.fn().mockReturnValue('debug'),
  },
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    getLevel: vi.fn().mockReturnValue('debug'),
  },
}))

// Mock ErrorBoundary to avoid complexity
vi.mock('@/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock ThemeProvider to avoid complexity
vi.mock('@/components/ThemeProvider', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock Toaster to avoid complexity
vi.mock('@/components/ui/sonner', () => ({
  Toaster: () => null,
}))

// Mock ReactQueryDevtools to avoid complexity
vi.mock('@tanstack/react-query-devtools', () => ({
  ReactQueryDevtools: () => null,
}))

// Import after mocks are set up
import { Providers, handleMutationError, handleQueryError } from '@/app/providers'
import { clientLogger } from '@/lib/logging/client'

// ============================================================================
// Unit Tests for Error Handler Functions
// ============================================================================

describe('handleMutationError', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should log mutation errors with clientLogger.error', () => {
    const testError = new Error('Test mutation error')
    testError.name = 'MutationError'

    handleMutationError(testError)

    expect(clientLogger.error).toHaveBeenCalledTimes(1)
    expect(clientLogger.error).toHaveBeenCalledWith('[React Query] Mutation error:', {
      message: 'Test mutation error',
      name: 'MutationError',
      stack: expect.any(String),
    })
  })

  it('should handle errors without stack trace', () => {
    const testError = new Error('Error without stack')
    testError.stack = undefined

    handleMutationError(testError)

    expect(clientLogger.error).toHaveBeenCalledWith('[React Query] Mutation error:', {
      message: 'Error without stack',
      name: 'Error',
      stack: undefined,
    })
  })
})

describe('handleQueryError', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should log query errors with clientLogger.error', () => {
    const testError = new Error('Test query error')
    testError.name = 'QueryError'

    handleQueryError(testError)

    expect(clientLogger.error).toHaveBeenCalledTimes(1)
    expect(clientLogger.error).toHaveBeenCalledWith('[React Query] Query error:', {
      message: 'Test query error',
      name: 'QueryError',
      stack: expect.any(String),
    })
  })

  it('should handle errors without stack trace', () => {
    const testError = new Error('Error without stack')
    testError.stack = undefined

    handleQueryError(testError)

    expect(clientLogger.error).toHaveBeenCalledWith('[React Query] Query error:', {
      message: 'Error without stack',
      name: 'Error',
      stack: undefined,
    })
  })
})

// ============================================================================
// Integration Tests for Error Handlers in QueryClient
// ============================================================================

describe('Providers - Global Error Handling Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should log query errors globally when a query fails', async () => {
    const queryError = new Error('Network request failed')

    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['test-failing-query'],
          queryFn: () => Promise.reject(queryError),
          retry: false,
        }),
      {
        wrapper: ({ children }) => <Providers>{children}</Providers>,
      },
    )

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(clientLogger.error).toHaveBeenCalledWith('[React Query] Query error:', {
      message: 'Network request failed',
      name: 'Error',
      stack: expect.any(String),
    })
  })

  it('should log mutation errors globally when a mutation fails', async () => {
    const mutationError = new Error('Failed to save data')

    const { result } = renderHook(
      () =>
        useMutation({
          mutationFn: () => Promise.reject(mutationError),
        }),
      {
        wrapper: ({ children }) => <Providers>{children}</Providers>,
      },
    )

    await act(async () => {
      try {
        await result.current.mutateAsync()
      } catch {
        // Expected to throw
      }
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    expect(clientLogger.error).toHaveBeenCalledWith('[React Query] Mutation error:', {
      message: 'Failed to save data',
      name: 'Error',
      stack: expect.any(String),
    })
  })

  it('should still call local onError handler when global handler is present', async () => {
    const mutationError = new Error('Mutation failed')
    const localOnError = vi.fn()

    const { result } = renderHook(
      () =>
        useMutation({
          mutationFn: (_data: void) => Promise.reject(mutationError),
          onError: localOnError,
        }),
      {
        wrapper: ({ children }) => <Providers>{children}</Providers>,
      },
    )

    await act(async () => {
      try {
        await result.current.mutateAsync()
      } catch {
        // Expected to throw
      }
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })

    // Both global and local handlers should be called
    expect(clientLogger.error).toHaveBeenCalled()
    expect(localOnError).toHaveBeenCalledWith(
      mutationError,
      undefined,
      undefined,
      expect.objectContaining({ client: expect.anything() }),
    )
  })
})
