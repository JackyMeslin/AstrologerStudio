/**
 * Unit Tests for useChartTheme Hook
 *
 * Tests the hook that maps the application color theme to chart theme.
 * Ensures consistent chart theming based on the user's theme preference.
 *
 * @module src/hooks/useChartTheme
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'

// Mock the ThemeProvider's useTheme hook
const mockUseTheme = vi.fn()
vi.mock('@/components/ThemeProvider', () => ({
  useTheme: () => mockUseTheme(),
}))

// Import hook after mocks are set up
import { useChartTheme } from '@/hooks/useChartTheme'

describe('useChartTheme', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ===========================================================================
  // Theme Mapping
  // ===========================================================================

  describe('theme mapping', () => {
    it('should return "dark" when resolvedTheme is "dark"', () => {
      mockUseTheme.mockReturnValue({ resolvedTheme: 'dark' })

      const { result } = renderHook(() => useChartTheme())

      expect(result.current).toBe('dark')
    })

    it('should return "classic" when resolvedTheme is "light"', () => {
      mockUseTheme.mockReturnValue({ resolvedTheme: 'light' })

      const { result } = renderHook(() => useChartTheme())

      expect(result.current).toBe('classic')
    })

    it('should return "classic" when resolvedTheme is "system" with light mode', () => {
      mockUseTheme.mockReturnValue({ resolvedTheme: 'light' })

      const { result } = renderHook(() => useChartTheme())

      expect(result.current).toBe('classic')
    })

    it('should return "classic" when resolvedTheme is undefined', () => {
      mockUseTheme.mockReturnValue({ resolvedTheme: undefined })

      const { result } = renderHook(() => useChartTheme())

      expect(result.current).toBe('classic')
    })

    it('should return "classic" for any non-dark theme', () => {
      // Test with various theme values
      const nonDarkThemes = ['light', 'system', 'sepia', 'high-contrast', '']

      nonDarkThemes.forEach((theme) => {
        mockUseTheme.mockReturnValue({ resolvedTheme: theme })

        const { result } = renderHook(() => useChartTheme())

        expect(result.current).toBe('classic')
      })
    })
  })

  // ===========================================================================
  // Return Type
  // ===========================================================================

  describe('return type', () => {
    it('should only return valid ChartTheme values', () => {
      mockUseTheme.mockReturnValue({ resolvedTheme: 'dark' })
      const { result: darkResult } = renderHook(() => useChartTheme())
      expect(['dark', 'classic']).toContain(darkResult.current)

      mockUseTheme.mockReturnValue({ resolvedTheme: 'light' })
      const { result: lightResult } = renderHook(() => useChartTheme())
      expect(['dark', 'classic']).toContain(lightResult.current)
    })
  })
})
