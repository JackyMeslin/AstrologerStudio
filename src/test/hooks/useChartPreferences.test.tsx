/**
 * Unit Tests for useChartPreferences Hook
 *
 * Tests the consolidated chart preferences hook that provides a single query
 * for all chart preferences, avoiding duplicate requests.
 *
 * @module src/hooks/useChartPreferences
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as React from 'react'

// ============================================================================
// Mocks - Must be defined before importing the hooks
// ============================================================================

// Mock server-only to prevent "server-only" package resolution error
vi.mock('server-only', () => ({}))

const mockGetChartPreferences = vi.fn()

vi.mock('@/actions/preferences', () => ({
  getChartPreferences: (...args: unknown[]) => mockGetChartPreferences(...args),
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

// Import the hook after mocks are set up
import { useChartPreferences, DEFAULT_CHART_PREFERENCES } from '@/hooks/useChartPreferences'

// ============================================================================
// Test Utilities
// ============================================================================

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
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

const mockPreferencesData = {
  theme: 'dark' as const,
  date_format: 'US' as const,
  time_format: '12h' as const,
  show_aspect_icons: false,
  show_degree_indicators: false,
  distribution_method: 'weighted' as const,
  active_points: ['Sun', 'Moon'],
  active_aspects: ['conjunction', 'opposition'],
  custom_distribution_weights: {},
  default_zodiac_system: 'Tropical' as const,
  default_sidereal_mode: 'LAHIRI' as const,
  house_system: 'P' as const,
  perspective_type: 'Apparent Geocentric' as const,
  rulership_mode: 'classical' as const,
}

// ============================================================================
// Tests
// ============================================================================

describe('useChartPreferences', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = createTestQueryClient()
    vi.clearAllMocks()
  })

  afterEach(() => {
    queryClient.clear()
  })

  describe('data fetching', () => {
    it('should return default preferences while loading', () => {
      mockGetChartPreferences.mockImplementation(() => new Promise(() => {})) // Never resolves

      const { result } = renderHook(() => useChartPreferences(), {
        wrapper: createWrapper(queryClient),
      })

      expect(result.current.preferences).toEqual(DEFAULT_CHART_PREFERENCES)
      expect(result.current.dateFormat).toBe('EU')
      expect(result.current.timeFormat).toBe('24h')
      expect(result.current.isLoading).toBe(true)
    })

    it('should return fetched preferences when query succeeds', async () => {
      mockGetChartPreferences.mockResolvedValue(mockPreferencesData)

      const { result } = renderHook(() => useChartPreferences(), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.preferences).toEqual(mockPreferencesData)
      expect(result.current.dateFormat).toBe('US')
      expect(result.current.timeFormat).toBe('12h')
      expect(result.current.isError).toBe(false)
    })

    it('should return default preferences when query fails', async () => {
      mockGetChartPreferences.mockRejectedValue(new Error('Failed to fetch'))

      const { result } = renderHook(() => useChartPreferences(), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // Should fall back to defaults when query fails
      expect(result.current.preferences).toEqual(DEFAULT_CHART_PREFERENCES)
      expect(result.current.dateFormat).toBe('EU')
      expect(result.current.timeFormat).toBe('24h')
      expect(result.current.isError).toBe(true)
    })
  })

  describe('query caching', () => {
    it('should only make one API call when used by multiple components', async () => {
      mockGetChartPreferences.mockResolvedValue(mockPreferencesData)

      // Simulate multiple components using the hook
      const { result: result1 } = renderHook(() => useChartPreferences(), {
        wrapper: createWrapper(queryClient),
      })
      const { result: result2 } = renderHook(() => useChartPreferences(), {
        wrapper: createWrapper(queryClient),
      })
      const { result: result3 } = renderHook(() => useChartPreferences(), {
        wrapper: createWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false)
        expect(result2.current.isLoading).toBe(false)
        expect(result3.current.isLoading).toBe(false)
      })

      // Should only have made one API call despite being used by multiple hooks
      expect(mockGetChartPreferences).toHaveBeenCalledTimes(1)

      // All hooks should have the same data
      expect(result1.current.preferences).toEqual(mockPreferencesData)
      expect(result2.current.preferences).toEqual(mockPreferencesData)
      expect(result3.current.preferences).toEqual(mockPreferencesData)
    })

    it('should use same query key for consistent caching', async () => {
      mockGetChartPreferences.mockResolvedValue(mockPreferencesData)

      const wrapper = createWrapper(queryClient)

      // First render
      const { result: result1, unmount } = renderHook(() => useChartPreferences(), { wrapper })

      await waitFor(() => {
        expect(result1.current.isLoading).toBe(false)
      })

      unmount()

      // Second render after unmount - should use cached data
      const { result: result2 } = renderHook(() => useChartPreferences(), { wrapper })

      // Should not make another API call due to staleTime
      expect(mockGetChartPreferences).toHaveBeenCalledTimes(1)
      expect(result2.current.preferences).toEqual(mockPreferencesData)
    })
  })

  describe('destructuring convenience', () => {
    it('should allow destructuring only dateFormat', async () => {
      mockGetChartPreferences.mockResolvedValue(mockPreferencesData)

      const { result } = renderHook(
        () => {
          const { dateFormat } = useChartPreferences()
          return { dateFormat }
        },
        {
          wrapper: createWrapper(queryClient),
        },
      )

      await waitFor(() => {
        expect(result.current.dateFormat).toBe('US')
      })
    })

    it('should allow destructuring only timeFormat', async () => {
      mockGetChartPreferences.mockResolvedValue(mockPreferencesData)

      const { result } = renderHook(
        () => {
          const { timeFormat } = useChartPreferences()
          return { timeFormat }
        },
        {
          wrapper: createWrapper(queryClient),
        },
      )

      await waitFor(() => {
        expect(result.current.timeFormat).toBe('12h')
      })
    })

    it('should allow destructuring multiple values at once', async () => {
      mockGetChartPreferences.mockResolvedValue(mockPreferencesData)

      const { result } = renderHook(
        () => {
          const { dateFormat, timeFormat, preferences, isLoading } = useChartPreferences()
          return { dateFormat, timeFormat, preferences, isLoading }
        },
        {
          wrapper: createWrapper(queryClient),
        },
      )

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.dateFormat).toBe('US')
      expect(result.current.timeFormat).toBe('12h')
      expect(result.current.preferences.theme).toBe('dark')
    })
  })

  describe('default values', () => {
    it('should have EU as default date format', () => {
      expect(DEFAULT_CHART_PREFERENCES.date_format).toBe('EU')
    })

    it('should have 24h as default time format', () => {
      expect(DEFAULT_CHART_PREFERENCES.time_format).toBe('24h')
    })

    it('should have classic as default theme', () => {
      expect(DEFAULT_CHART_PREFERENCES.theme).toBe('classic')
    })

    it('should have Placidus (P) as default house system', () => {
      expect(DEFAULT_CHART_PREFERENCES.house_system).toBe('P')
    })
  })
})
