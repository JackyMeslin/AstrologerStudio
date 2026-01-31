/**
 * Now Chart Configuration
 *
 * Centralized configuration for the Now Chart feature.
 * Defines the default location (Greenwich Observatory) used when
 * displaying charts for the current moment.
 *
 * @module lib/config/now-chart
 */

import type { LocationFormValues } from '@/components/SubjectLocationFields'

/**
 * Greenwich Observatory - default location for Now Chart
 *
 * Using the Royal Observatory Greenwich as the reference point,
 * which is the historical home of the Prime Meridian.
 *
 * Type uses Required to ensure all location properties are defined,
 * which is necessary for fallback values.
 */
export const DEFAULT_NOW_CHART_LOCATION: Required<LocationFormValues> = {
  city: 'Greenwich',
  nation: 'GB',
  latitude: 51.477928,
  longitude: -0.001545,
  timezone: 'Etc/UTC',
}

/**
 * Get the default location for Now Chart
 *
 * Returns a fresh copy of the default location to prevent
 * accidental mutations.
 */
export function getNowChartDefaultLocation(): Required<LocationFormValues> {
  return { ...DEFAULT_NOW_CHART_LOCATION }
}
