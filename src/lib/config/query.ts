/**
 * Centralized React Query staleTime configuration
 *
 * This module provides consistent caching strategies across the application.
 * Use these constants instead of hardcoding staleTime values in individual queries.
 *
 * @example
 * ```ts
 * import { STALE_TIME } from '@/lib/config/query'
 *
 * useQuery({
 *   queryKey: ['user'],
 *   queryFn: fetchUser,
 *   staleTime: STALE_TIME.LONG, // 30 minutes for user data
 * })
 * ```
 */

/**
 * No stale time - data is considered stale immediately.
 * Use for real-time data that should always be fresh (e.g., Now Chart, settings page data).
 */
export const STALE_TIME_NONE = 0

/**
 * Short stale time - 1 minute.
 * Use for data that changes frequently (e.g., subjects list).
 */
export const STALE_TIME_SHORT = 1000 * 60 // 1 minute

/**
 * Medium stale time - 5 minutes.
 * Use for most application data (e.g., subscription status, AI usage, chart preferences).
 * This is the default for React Query client configuration.
 */
export const STALE_TIME_MEDIUM = 1000 * 60 * 5 // 5 minutes

/**
 * Long stale time - 30 minutes.
 * Use for data that rarely changes (e.g., user authentication data).
 */
export const STALE_TIME_LONG = 1000 * 60 * 30 // 30 minutes

/**
 * Infinite stale time - data never becomes stale.
 * Use for static data that never changes during a session.
 */
export const STALE_TIME_INFINITE = Infinity

/**
 * Garbage collection time (gcTime) - 10 minutes.
 * This is how long inactive query data stays in cache before being garbage collected.
 */
export const GC_TIME_DEFAULT = 1000 * 60 * 10 // 10 minutes

/**
 * Consolidated STALE_TIME object for convenient imports.
 * Provides named constants for all stale time values.
 */
export const STALE_TIME = {
  /** No stale time - always fresh (0ms) */
  NONE: STALE_TIME_NONE,
  /** Short stale time (1 minute) */
  SHORT: STALE_TIME_SHORT,
  /** Medium stale time (5 minutes) - default */
  MEDIUM: STALE_TIME_MEDIUM,
  /** Long stale time (30 minutes) */
  LONG: STALE_TIME_LONG,
  /** Infinite stale time - never stale */
  INFINITE: STALE_TIME_INFINITE,
} as const

/**
 * Consolidated GC_TIME object for convenient imports.
 */
export const GC_TIME = {
  /** Default garbage collection time (10 minutes) */
  DEFAULT: GC_TIME_DEFAULT,
} as const
