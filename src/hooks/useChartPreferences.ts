'use client'

import { useQuery } from '@tanstack/react-query'
import { getChartPreferences, type ChartPreferencesData } from '@/actions/preferences'
import { type DateFormat, type TimeFormat } from '@/lib/utils/date'
import { STALE_TIME } from '@/lib/config/query'

/**
 * Default chart preferences used when user preferences are not available
 */
export const DEFAULT_CHART_PREFERENCES: ChartPreferencesData = {
  theme: 'classic',
  date_format: 'EU',
  time_format: '24h',
  show_aspect_icons: true,
  show_degree_indicators: true,
  distribution_method: 'weighted',
  active_points: [],
  active_aspects: [],
  custom_distribution_weights: {},
  default_zodiac_system: 'Tropical',
  default_sidereal_mode: 'LAHIRI',
  house_system: 'P',
  perspective_type: 'Apparent Geocentric',
  rulership_mode: 'classical',
}

/**
 * Return type for useChartPreferences hook
 */
export interface UseChartPreferencesReturn {
  /** User's chart preferences with defaults applied */
  preferences: ChartPreferencesData
  /** Date format preference (US, EU, or ISO) */
  dateFormat: DateFormat
  /** Time format preference (12h or 24h) */
  timeFormat: TimeFormat
  /** Whether the preferences are currently loading */
  isLoading: boolean
  /** Whether the query is in error state */
  isError: boolean
  /** Error object if query failed */
  error: Error | null
}

/**
 * Hook to access the user's chart preferences
 *
 * Provides a single query for all chart preferences, avoiding duplicate requests.
 * Returns the full preferences object along with commonly used values.
 *
 * @returns Object containing preferences data and query state
 *
 * @example
 * ```tsx
 * // Access specific preferences via destructuring
 * const { dateFormat, timeFormat } = useChartPreferences()
 * const formatted = formatDisplayDate(date, dateFormat)
 *
 * // Or access the full preferences object
 * const { preferences } = useChartPreferences()
 * console.log(preferences.theme, preferences.house_system)
 * ```
 */
export function useChartPreferences(): UseChartPreferencesReturn {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['chartPreferences'],
    queryFn: getChartPreferences,
    staleTime: STALE_TIME.MEDIUM, // 5 minutes
  })

  const preferences = data ?? DEFAULT_CHART_PREFERENCES

  return {
    preferences,
    dateFormat: preferences.date_format,
    timeFormat: preferences.time_format,
    isLoading,
    isError,
    error,
  }
}
