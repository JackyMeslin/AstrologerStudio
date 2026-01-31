/**
 * Unit Tests for Cache-Control Header Utilities
 *
 * Tests cache control header generation and merging functions.
 *
 * @module src/lib/security/cache-control
 */
import { describe, it, expect } from 'vitest'
import { CACHE_CONTROL, cacheControlHeaders, mergeCacheControlHeaders } from '@/lib/security/cache-control'

describe('Cache-Control Utilities', () => {
  describe('CACHE_CONTROL presets', () => {
    it('should have userDataSemiStatic preset for infrequently changing data', () => {
      expect(CACHE_CONTROL.userDataSemiStatic).toBe('private, max-age=60, stale-while-revalidate=120')
    })

    it('should have userDataShort preset for moderately changing data', () => {
      expect(CACHE_CONTROL.userDataShort).toBe('private, max-age=30, stale-while-revalidate=60')
    })

    it('should have userDataDynamic preset for frequently changing data', () => {
      expect(CACHE_CONTROL.userDataDynamic).toBe('private, no-cache')
    })

    it('should have noStore preset for data that must never be cached', () => {
      expect(CACHE_CONTROL.noStore).toBe('private, no-store')
    })

    it('should include private directive in all presets to prevent CDN caching', () => {
      expect(CACHE_CONTROL.userDataSemiStatic).toContain('private')
      expect(CACHE_CONTROL.userDataShort).toContain('private')
      expect(CACHE_CONTROL.userDataDynamic).toContain('private')
      expect(CACHE_CONTROL.noStore).toContain('private')
    })
  })

  describe('cacheControlHeaders', () => {
    it('should return headers object with Cache-Control key', () => {
      const headers = cacheControlHeaders(CACHE_CONTROL.userDataShort)

      expect(headers).toEqual({
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
      })
    })

    it('should accept custom policy strings', () => {
      const customPolicy = 'public, max-age=3600'
      const headers = cacheControlHeaders(customPolicy)

      expect(headers).toEqual({
        'Cache-Control': 'public, max-age=3600',
      })
    })

    it('should work with noStore preset', () => {
      const headers = cacheControlHeaders(CACHE_CONTROL.noStore)

      expect(headers).toEqual({
        'Cache-Control': 'private, no-store',
      })
    })
  })

  describe('mergeCacheControlHeaders', () => {
    describe('with Record<string, string> input', () => {
      it('should merge cache control with existing headers', () => {
        const existingHeaders = {
          'X-Custom-Header': 'value',
          'X-Another': 'test',
        }

        const merged = mergeCacheControlHeaders(existingHeaders, CACHE_CONTROL.userDataShort)

        expect(merged).toEqual({
          'X-Custom-Header': 'value',
          'X-Another': 'test',
          'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
        })
      })

      it('should override existing Cache-Control header', () => {
        const existingHeaders = {
          'Cache-Control': 'public, max-age=3600',
          'X-Custom': 'value',
        }

        const merged = mergeCacheControlHeaders(existingHeaders, CACHE_CONTROL.noStore)

        expect(merged).toEqual({
          'Cache-Control': 'private, no-store',
          'X-Custom': 'value',
        })
      })
    })

    describe('with Headers instance input', () => {
      it('should merge cache control with Headers instance', () => {
        const existingHeaders = new Headers({
          'X-Custom-Header': 'value',
          'Content-Type': 'application/json',
        })

        const merged = mergeCacheControlHeaders(existingHeaders, CACHE_CONTROL.userDataDynamic)

        expect(merged).toEqual({
          'x-custom-header': 'value',
          'content-type': 'application/json',
          'Cache-Control': 'private, no-cache',
        })
      })

      it('should handle empty Headers instance', () => {
        const existingHeaders = new Headers()

        const merged = mergeCacheControlHeaders(existingHeaders, CACHE_CONTROL.noStore)

        expect(merged).toEqual({
          'Cache-Control': 'private, no-store',
        })
      })
    })

    describe('with string[][] (tuple array) input', () => {
      it('should append cache control to tuple array', () => {
        const existingHeaders: [string, string][] = [
          ['X-Custom-Header', 'value'],
          ['Content-Type', 'application/json'],
        ]

        const merged = mergeCacheControlHeaders(existingHeaders, CACHE_CONTROL.userDataSemiStatic)

        expect(merged).toEqual([
          ['X-Custom-Header', 'value'],
          ['Content-Type', 'application/json'],
          ['Cache-Control', 'private, max-age=60, stale-while-revalidate=120'],
        ])
      })

      it('should handle empty tuple array', () => {
        const existingHeaders: [string, string][] = []

        const merged = mergeCacheControlHeaders(existingHeaders, CACHE_CONTROL.noStore)

        expect(merged).toEqual([['Cache-Control', 'private, no-store']])
      })
    })
  })

  describe('integration with rate limit headers', () => {
    it('should correctly merge rate limit headers with cache control', () => {
      // Simulate rate limit headers structure
      const rateLimitHeaders = {
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '95',
        'X-RateLimit-Reset': '1700000060',
      }

      const merged = mergeCacheControlHeaders(rateLimitHeaders, CACHE_CONTROL.userDataShort)

      expect(merged).toEqual({
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '95',
        'X-RateLimit-Reset': '1700000060',
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60',
      })
    })
  })
})
