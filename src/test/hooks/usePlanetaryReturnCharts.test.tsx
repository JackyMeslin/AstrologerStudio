/**
 * Unit Tests for usePlanetaryReturnChart Hook
 *
 * Tests query key stability, correct API dispatch for solar/lunar types,
 * and caching behavior.
 *
 * @module src/hooks/usePlanetaryReturnChart
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as React from 'react'

// ============================================================================
// Mocks - Must be defined before importing the hook
// ============================================================================

vi.mock('server-only', () => ({}))

const mockGetSolarReturnChart = vi.fn()
const mockGetLunarReturnChart = vi.fn()

vi.mock('@/actions/astrology', () => ({
  getSolarReturnChart: (...args: unknown[]) => mockGetSolarReturnChart(...args),
  getLunarReturnChart: (...args: unknown[]) => mockGetLunarReturnChart(...args),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {},
  default: {},
}))

vi.mock('@/lib/security/session', () => ({
  getSession: vi.fn().mockResolvedValue(null),
}))

// Import the hook after mocks are set up
import { usePlanetaryReturnChart } from '@/hooks/usePlanetaryReturnChart'
import type { Subject } from '@/types/subjects'
import type { PlanetaryReturnRequestOptions } from '@/types/astrology'

// ============================================================================
// Test Utilities
// ============================================================================

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  })
}

function createWrapper(queryClient: QueryClient) {
  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

const mockSubject: Subject = {
  id: 'subj-1',
  name: 'Test Subject',
  birth_datetime: '1990-06-15T12:30:00.000Z',
  city: 'London',
  nation: 'GB',
  latitude: 51.5074,
  longitude: -0.1278,
  timezone: 'Europe/London',
  rodens_rating: 'AA',
  tags: ['test'],
  notes: 'Test notes',
}

const mockChartResponse = {
  chart_type: 'DualReturnChart',
  first_subject: { name: 'Natal' },
  second_subject: { name: 'Return' },
  aspects: [],
  element_distribution: {},
  quality_distribution: {},
  active_points: [],
  active_aspects: [],
}

// ============================================================================
// API Dispatch Tests
// ============================================================================

describe('usePlanetaryReturnChart - API dispatch', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = createTestQueryClient()
    mockGetSolarReturnChart.mockResolvedValue(mockChartResponse)
    mockGetLunarReturnChart.mockResolvedValue(mockChartResponse)
  })

  afterEach(() => {
    queryClient.clear()
  })

  it('should call getSolarReturnChart when type is solar', async () => {
    const options: PlanetaryReturnRequestOptions = { year: 2024 }

    renderHook(() => usePlanetaryReturnChart('solar', mockSubject, options), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(mockGetSolarReturnChart).toHaveBeenCalledTimes(1)
    })
    expect(mockGetSolarReturnChart).toHaveBeenCalledWith(mockSubject, options)
    expect(mockGetLunarReturnChart).not.toHaveBeenCalled()
  })

  it('should call getLunarReturnChart when type is lunar', async () => {
    const options: PlanetaryReturnRequestOptions = { year: 2024, month: 3 }

    renderHook(() => usePlanetaryReturnChart('lunar', mockSubject, options), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(mockGetLunarReturnChart).toHaveBeenCalledTimes(1)
    })
    expect(mockGetLunarReturnChart).toHaveBeenCalledWith(mockSubject, options)
    expect(mockGetSolarReturnChart).not.toHaveBeenCalled()
  })
})

// ============================================================================
// Solar Return - Query Key Stability Tests
// ============================================================================

describe('usePlanetaryReturnChart (solar) - Query Key Stability', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = createTestQueryClient()
    mockGetSolarReturnChart.mockResolvedValue(mockChartResponse)
  })

  afterEach(() => {
    queryClient.clear()
  })

  it('should not refetch when options object is recreated with same values', async () => {
    const options1: PlanetaryReturnRequestOptions = { year: 2024, theme: 'dark' }
    const options2: PlanetaryReturnRequestOptions = { year: 2024, theme: 'dark' }

    expect(options1).not.toBe(options2)

    const { rerender } = renderHook(
      ({ subject, options }: { subject: Subject | null; options: PlanetaryReturnRequestOptions }) =>
        usePlanetaryReturnChart('solar', subject, options),
      {
        wrapper: createWrapper(queryClient),
        initialProps: { subject: mockSubject, options: options1 },
      },
    )

    await waitFor(() => {
      expect(mockGetSolarReturnChart).toHaveBeenCalledTimes(1)
    })

    rerender({ subject: mockSubject, options: options2 })

    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(mockGetSolarReturnChart).toHaveBeenCalledTimes(1)
  })

  it('should refetch when options values actually change', async () => {
    const options1: PlanetaryReturnRequestOptions = { year: 2024 }
    const options2: PlanetaryReturnRequestOptions = { year: 2025 }

    const { rerender } = renderHook(
      ({ subject, options }: { subject: Subject | null; options: PlanetaryReturnRequestOptions }) =>
        usePlanetaryReturnChart('solar', subject, options),
      {
        wrapper: createWrapper(queryClient),
        initialProps: { subject: mockSubject, options: options1 },
      },
    )

    await waitFor(() => {
      expect(mockGetSolarReturnChart).toHaveBeenCalledTimes(1)
    })

    rerender({ subject: mockSubject, options: options2 })

    await waitFor(() => {
      expect(mockGetSolarReturnChart).toHaveBeenCalledTimes(2)
    })
  })

  it('should handle undefined options without refetching', async () => {
    const { rerender, result } = renderHook(
      ({ subject, options }: { subject: Subject | null; options?: PlanetaryReturnRequestOptions }) =>
        usePlanetaryReturnChart('solar', subject, options),
      {
        wrapper: createWrapper(queryClient),
        initialProps: { subject: mockSubject, options: undefined },
      },
    )

    expect(result.current.isLoading).toBe(false)
    expect(mockGetSolarReturnChart).not.toHaveBeenCalled()

    rerender({ subject: mockSubject, options: undefined })

    expect(mockGetSolarReturnChart).not.toHaveBeenCalled()
  })

  it('should use serialized options in query key for consistent caching', async () => {
    const options: PlanetaryReturnRequestOptions = { year: 2024, month: 6, theme: 'classic' }

    renderHook(() => usePlanetaryReturnChart('solar', mockSubject, options), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(mockGetSolarReturnChart).toHaveBeenCalledTimes(1)
    })

    const cacheEntries = queryClient.getQueryCache().getAll()
    const solarReturnEntry = cacheEntries.find(
      (entry) => entry.queryKey[0] === 'solar-return-chart' && entry.queryKey[1] === mockSubject.id,
    )

    expect(solarReturnEntry).toBeDefined()
    expect(solarReturnEntry?.queryKey[2]).toBe(JSON.stringify(options))
  })
})

// ============================================================================
// Lunar Return - Query Key Stability Tests
// ============================================================================

describe('usePlanetaryReturnChart (lunar) - Query Key Stability', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = createTestQueryClient()
    mockGetLunarReturnChart.mockResolvedValue(mockChartResponse)
  })

  afterEach(() => {
    queryClient.clear()
  })

  it('should not refetch when options object is recreated with same values', async () => {
    const options1: PlanetaryReturnRequestOptions = { year: 2024, month: 3 }
    const options2: PlanetaryReturnRequestOptions = { year: 2024, month: 3 }

    expect(options1).not.toBe(options2)

    const { rerender } = renderHook(
      ({ subject, options }: { subject: Subject | null; options: PlanetaryReturnRequestOptions }) =>
        usePlanetaryReturnChart('lunar', subject, options),
      {
        wrapper: createWrapper(queryClient),
        initialProps: { subject: mockSubject, options: options1 },
      },
    )

    await waitFor(() => {
      expect(mockGetLunarReturnChart).toHaveBeenCalledTimes(1)
    })

    rerender({ subject: mockSubject, options: options2 })

    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(mockGetLunarReturnChart).toHaveBeenCalledTimes(1)
  })

  it('should refetch when options values actually change', async () => {
    const options1: PlanetaryReturnRequestOptions = { year: 2024, month: 3 }
    const options2: PlanetaryReturnRequestOptions = { year: 2024, month: 4 }

    const { rerender } = renderHook(
      ({ subject, options }: { subject: Subject | null; options: PlanetaryReturnRequestOptions }) =>
        usePlanetaryReturnChart('lunar', subject, options),
      {
        wrapper: createWrapper(queryClient),
        initialProps: { subject: mockSubject, options: options1 },
      },
    )

    await waitFor(() => {
      expect(mockGetLunarReturnChart).toHaveBeenCalledTimes(1)
    })

    rerender({ subject: mockSubject, options: options2 })

    await waitFor(() => {
      expect(mockGetLunarReturnChart).toHaveBeenCalledTimes(2)
    })
  })

  it('should use serialized options in query key for consistent caching', async () => {
    const options: PlanetaryReturnRequestOptions = { year: 2024, month: 6, theme: 'light' }

    renderHook(() => usePlanetaryReturnChart('lunar', mockSubject, options), {
      wrapper: createWrapper(queryClient),
    })

    await waitFor(() => {
      expect(mockGetLunarReturnChart).toHaveBeenCalledTimes(1)
    })

    const cacheEntries = queryClient.getQueryCache().getAll()
    const lunarReturnEntry = cacheEntries.find(
      (entry) => entry.queryKey[0] === 'lunar-return-chart' && entry.queryKey[1] === mockSubject.id,
    )

    expect(lunarReturnEntry).toBeDefined()
    expect(lunarReturnEntry?.queryKey[2]).toBe(JSON.stringify(options))
  })

  it('should handle complex nested options objects', async () => {
    const options1: PlanetaryReturnRequestOptions = {
      year: 2024,
      month: 6,
      return_location: {
        city: 'Rome',
        nation: 'IT',
        longitude: 12.4964,
        latitude: 41.9028,
        timezone: 'Europe/Rome',
      },
    }
    const options2: PlanetaryReturnRequestOptions = {
      year: 2024,
      month: 6,
      return_location: {
        city: 'Rome',
        nation: 'IT',
        longitude: 12.4964,
        latitude: 41.9028,
        timezone: 'Europe/Rome',
      },
    }

    expect(options1).not.toBe(options2)
    expect(options1.return_location).not.toBe(options2.return_location)

    const { rerender } = renderHook(
      ({ subject, options }: { subject: Subject | null; options: PlanetaryReturnRequestOptions }) =>
        usePlanetaryReturnChart('lunar', subject, options),
      {
        wrapper: createWrapper(queryClient),
        initialProps: { subject: mockSubject, options: options1 },
      },
    )

    await waitFor(() => {
      expect(mockGetLunarReturnChart).toHaveBeenCalledTimes(1)
    })

    rerender({ subject: mockSubject, options: options2 })

    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(mockGetLunarReturnChart).toHaveBeenCalledTimes(1)
  })
})
