'use client'

import { type DateFormat, type TimeFormat } from '@/lib/utils/date'
import { useChartPreferences } from './useChartPreferences'

/**
 * Hook to access the user's date format preference
 *
 * @returns The date format preference (US, EU, or ISO) with EU as default
 *
 * @deprecated Use `useChartPreferences()` instead for better performance.
 * This hook is kept for backward compatibility.
 *
 * @example
 * ```tsx
 * // Old way (deprecated)
 * const dateFormat = useDateFormat()
 *
 * // New way (recommended)
 * const { dateFormat } = useChartPreferences()
 * ```
 */
export function useDateFormat(): DateFormat {
  const { dateFormat } = useChartPreferences()
  return dateFormat
}

/**
 * Hook to access the user's time format preference
 *
 * @returns The time format preference (12h or 24h) with 24h as default
 *
 * @deprecated Use `useChartPreferences()` instead for better performance.
 * This hook is kept for backward compatibility.
 *
 * @example
 * ```tsx
 * // Old way (deprecated)
 * const timeFormat = useTimeFormat()
 *
 * // New way (recommended)
 * const { timeFormat } = useChartPreferences()
 * ```
 */
export function useTimeFormat(): TimeFormat {
  const { timeFormat } = useChartPreferences()
  return timeFormat
}
