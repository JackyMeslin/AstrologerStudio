/**
 * Cache-Control Header Utilities
 *
 * Provides standardized Cache-Control header configurations for API routes.
 * All user-specific data should use 'private' to prevent CDN/shared caching.
 *
 * @module src/lib/security/cache-control
 *
 * @example
 * ```ts
 * import { CACHE_CONTROL, cacheControlHeaders } from '@/lib/security/cache-control'
 *
 * return NextResponse.json(data, {
 *   headers: cacheControlHeaders(CACHE_CONTROL.userDataShort),
 * })
 * ```
 */

/**
 * Predefined Cache-Control policies for different API route types.
 *
 * @remarks
 * - `private`: Prevents CDN/proxy caching, only browser can cache
 * - `no-cache`: Browser must revalidate before using cached response
 * - `no-store`: Response must never be cached
 * - `max-age`: Maximum time (seconds) response is considered fresh
 * - `stale-while-revalidate`: Time (seconds) to serve stale while fetching fresh
 */
export const CACHE_CONTROL = {
  /**
   * User-specific data that changes infrequently (e.g., subscription status).
   * Cache for 60s, serve stale for up to 2 more minutes while revalidating.
   */
  userDataSemiStatic: 'private, max-age=60, stale-while-revalidate=120',

  /**
   * User-specific data that may change (e.g., saved charts list, notes).
   * Short cache with quick revalidation for responsive updates.
   */
  userDataShort: 'private, max-age=30, stale-while-revalidate=60',

  /**
   * Frequently changing user data (e.g., AI usage counters).
   * Always revalidate but allow conditional caching (ETag/Last-Modified).
   */
  userDataDynamic: 'private, no-cache',

  /**
   * Data that must never be cached (mutations, one-time URLs, sensitive operations).
   * Use for POST/PATCH/DELETE responses and security-sensitive endpoints.
   */
  noStore: 'private, no-store',
} as const

/**
 * Type for cache control policy keys
 */
export type CacheControlPolicy = keyof typeof CACHE_CONTROL

/**
 * Creates a headers object with the specified Cache-Control value.
 *
 * @param policy - Cache-Control header value from CACHE_CONTROL constants
 * @returns Headers object suitable for NextResponse
 *
 * @example
 * ```ts
 * return NextResponse.json(data, {
 *   headers: cacheControlHeaders(CACHE_CONTROL.userDataShort),
 * })
 * ```
 */
export function cacheControlHeaders(policy: string): Record<string, string> {
  return {
    'Cache-Control': policy,
  }
}

/**
 * Merges cache control headers with existing headers.
 *
 * @param existingHeaders - Existing headers (HeadersInit compatible)
 * @param policy - Cache-Control header value
 * @returns Merged headers object
 *
 * @example
 * ```ts
 * const headers = rateLimitHeaders(result, limit)
 * return NextResponse.json(data, {
 *   headers: mergeCacheControlHeaders(headers, CACHE_CONTROL.userDataShort),
 * })
 * ```
 */
export function mergeCacheControlHeaders(existingHeaders: HeadersInit, policy: string): HeadersInit {
  // HeadersInit can be: Headers | string[][] | Record<string, string>
  // We convert to a plain object for merging
  if (existingHeaders instanceof Headers) {
    const result: Record<string, string> = {}
    existingHeaders.forEach((value, key) => {
      result[key] = value
    })
    result['Cache-Control'] = policy
    return result
  }

  if (Array.isArray(existingHeaders)) {
    return [...existingHeaders, ['Cache-Control', policy]]
  }

  // Record<string, string>
  return {
    ...existingHeaders,
    'Cache-Control': policy,
  }
}
