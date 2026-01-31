'use client'

import { useTheme } from '@/components/ThemeProvider'

export type ChartTheme = 'dark' | 'classic'

/**
 * Hook to get the chart theme based on the current application color theme.
 * Maps 'dark' resolved theme to 'dark' chart theme, and all others to 'classic'.
 *
 * @returns The chart theme to use for rendering astrological charts
 */
export function useChartTheme(): ChartTheme {
  const { resolvedTheme } = useTheme()
  return resolvedTheme === 'dark' ? 'dark' : 'classic'
}
