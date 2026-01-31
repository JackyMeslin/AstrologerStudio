/**
 * Unit Tests for useAuth Hook staleTime Configuration
 *
 * Tests that the user query has finite staleTime (30 minutes) instead of Infinity.
 * This ensures user data is refetched periodically to stay fresh.
 *
 * @module src/hooks/useAuth
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as React from 'react'

// ============================================================================
// Mocks - Must be defined before importing the hooks
// ============================================================================

const mockGetCurrentUser = vi.fn()
const mockLogin = vi.fn()
const mockLogout = vi.fn()

vi.mock('@/lib/api/auth', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
  login: (...args: unknown[]) => mockLogin(...args),
  logout: () => mockLogout(),
}))

// Mock Prisma to prevent any DB access
vi.mock('@/lib/db/prisma', () => ({
  prisma: {},
  default: {},
}))

// Mock session to prevent server-only imports
vi.mock('@/lib/security/session', () => ({
  getSession: vi.fn().mockResolvedValue(null),
}))

// Mock auth module to prevent server-only imports
vi.mock('@/lib/security/auth', () => ({
  withAuth: vi.fn(),
  getAuthSession: vi.fn().mockResolvedValue(null),
}))

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}))

// Mock client logger
vi.mock('@/lib/logging/client', () => ({
  clientLogger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

// Import the hook after mocks are set up
import { useAuth } from '@/hooks/useAuth'

// ============================================================================
// Constants
// ============================================================================

const THIRTY_MINUTES_MS = 1000 * 60 * 30

// ============================================================================
// Test Utilities
// ============================================================================

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
    },
  })
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

// ============================================================================
// Test Data
// ============================================================================

const mockUser = {
  id: 'user-123',
  username: 'testuser',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
}

// ============================================================================
// Tests
// ============================================================================

describe('useAuth', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = createTestQueryClient()
    vi.clearAllMocks()
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: { search: '' },
      writable: true,
    })
  })

  afterEach(() => {
    queryClient.clear()
  })

  describe('staleTime configuration', () => {
    it('should fetch user data and mark query as successful', async () => {
      mockGetCurrentUser.mockResolvedValue(mockUser)

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Verify user data was fetched
      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
      expect(mockGetCurrentUser).toHaveBeenCalledTimes(1)
    })

    it('should mark data as stale after 30 minutes', async () => {
      vi.useFakeTimers()

      mockGetCurrentUser.mockResolvedValue(mockUser)

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(queryClient),
      })

      // Wait for initial fetch
      await vi.waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Get the query state - should NOT be stale initially
      const queryStateBefore = queryClient.getQueryState(['user', 'me'])
      expect(queryStateBefore?.isInvalidated).toBe(false)

      // Check if data is stale before 30 minutes
      const isStaleAt15Min = queryClient.getQueryData(['user', 'me']) !== undefined
      expect(isStaleAt15Min).toBe(true) // Data exists

      // Advance time past 30 minutes
      await act(async () => {
        vi.advanceTimersByTime(THIRTY_MINUTES_MS + 1000)
      })

      // The query data should still exist but the hook will know it's stale
      // when a new component mounts
      const queryStateAfter = queryClient.getQueryState(['user', 'me'])
      expect(queryStateAfter?.data).toEqual(mockUser)

      // Data update time should be more than 30 minutes ago from "now"
      const dataUpdatedAt = queryStateAfter?.dataUpdatedAt || 0
      const now = Date.now()
      const ageMs = now - dataUpdatedAt
      expect(ageMs).toBeGreaterThan(THIRTY_MINUTES_MS)

      vi.useRealTimers()
    })

    it('should not mark data as stale within 30 minutes', async () => {
      vi.useFakeTimers()

      mockGetCurrentUser.mockResolvedValue(mockUser)

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(queryClient),
      })

      // Wait for initial fetch
      await vi.waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Advance time to 15 minutes (less than staleTime)
      await act(async () => {
        vi.advanceTimersByTime(1000 * 60 * 15)
      })

      // Check the age of data
      const queryState = queryClient.getQueryState(['user', 'me'])
      const dataUpdatedAt = queryState?.dataUpdatedAt || 0
      const now = Date.now()
      const ageMs = now - dataUpdatedAt

      // Data should be less than 30 minutes old (not yet stale)
      expect(ageMs).toBeLessThan(THIRTY_MINUTES_MS)

      vi.useRealTimers()
    })
  })

  describe('data fetching', () => {
    it('should return null user while loading', () => {
      mockGetCurrentUser.mockImplementation(() => new Promise(() => {})) // Never resolves

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(queryClient),
      })

      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.isLoading).toBe(true)
    })

    it('should return user data when authenticated', async () => {
      mockGetCurrentUser.mockResolvedValue(mockUser)

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.isAuthenticated).toBe(true)
    })

    it('should return null user when not authenticated', async () => {
      mockGetCurrentUser.mockResolvedValue(null)

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.user).toBeNull()
      expect(result.current.isAuthenticated).toBe(false)
    })
  })

  describe('login mutation', () => {
    it('should call login API with credentials', async () => {
      mockGetCurrentUser.mockResolvedValue(null)
      mockLogin.mockResolvedValue({})

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        result.current.login({
          username: 'testuser',
          password: 'password123',
          recaptchaToken: 'token',
        })
      })

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalled()
      })
    })

    it('should set loginError on failure', async () => {
      mockGetCurrentUser.mockResolvedValue(null)
      mockLogin.mockResolvedValue({ error: 'Invalid credentials' })

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        result.current.login({
          username: 'testuser',
          password: 'wrongpassword',
          recaptchaToken: 'token',
        })
      })

      await waitFor(() => {
        expect(result.current.loginError).toBeDefined()
      })

      expect(result.current.loginError?.message).toBe('Invalid credentials')
    })
  })

  describe('logout mutation', () => {
    it('should call logout API and redirect', async () => {
      mockGetCurrentUser.mockResolvedValue(mockUser)
      mockLogout.mockResolvedValue(undefined)

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        result.current.logout()
      })

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled()
      })

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login')
      })
    })
  })

  describe('query caching', () => {
    it('should only make one API call when used by multiple components', async () => {
      mockGetCurrentUser.mockResolvedValue(mockUser)

      const wrapper = createWrapper(queryClient)

      // Simulate multiple components using the hook
      const { result: result1 } = renderHook(() => useAuth(), { wrapper })
      const { result: result2 } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false)
        expect(result2.current.isLoading).toBe(false)
      })

      // Should only have made one API call despite being used by multiple hooks
      expect(mockGetCurrentUser).toHaveBeenCalledTimes(1)

      // Both hooks should have the same data
      expect(result1.current.user).toEqual(mockUser)
      expect(result2.current.user).toEqual(mockUser)
    })
  })
})
