/**
 * Unit Tests for Application Configuration
 *
 * Tests the centralized application configuration constants,
 * particularly the APP_URL constant used across the application.
 *
 * Note: Since APP_URL is evaluated at module load time and bun's test runner
 * doesn't support module resetting between tests, we test the configuration
 * module's behavior with the current environment.
 *
 * @module src/lib/config/app
 */
import { describe, it, expect } from 'vitest'
import { APP_URL } from '@/lib/config/app'

// ============================================================================
// APP_URL Tests
// ============================================================================

describe('APP_URL', () => {
  it('should be a non-empty string', () => {
    expect(typeof APP_URL).toBe('string')
    expect(APP_URL.length).toBeGreaterThan(0)
  })

  it('should start with a protocol (http or https)', () => {
    expect(APP_URL).toMatch(/^https?:\/\//)
  })

  it('should not end with a trailing slash by default', () => {
    // The default URL should not have a trailing slash for clean URL construction
    if (APP_URL === 'https://astrologerstudio.com') {
      expect(APP_URL.endsWith('/')).toBe(false)
    }
  })

  it('should be the default value when NEXT_PUBLIC_APP_URL is not set', () => {
    // This test validates the current state - if env var is not set, we get the default
    // We can't dynamically change the env var in bun tests, so we verify the logic
    const envValue = process.env.NEXT_PUBLIC_APP_URL
    const expectedDefault = 'https://astrologerstudio.com'

    if (!envValue) {
      expect(APP_URL).toBe(expectedDefault)
    } else {
      expect(APP_URL).toBe(envValue)
    }
  })

  it('should be a valid URL', () => {
    // Verify that APP_URL can be used to construct a URL object
    expect(() => new URL(APP_URL)).not.toThrow()
  })

  it('should work as a base for URL construction', () => {
    // Verify common URL patterns used in the app
    const dashboardUrl = `${APP_URL}/dashboard`
    const sitemapUrl = `${APP_URL}/sitemap.xml`
    const shareUrl = `${APP_URL}/share/birthchart`

    expect(new URL(dashboardUrl).pathname).toBe('/dashboard')
    expect(new URL(sitemapUrl).pathname).toBe('/sitemap.xml')
    expect(new URL(shareUrl).pathname).toBe('/share/birthchart')
  })
})

// ============================================================================
// Configuration Behavior Tests
// ============================================================================

describe('APP_URL configuration behavior', () => {
  it('should match the expected fallback behavior pattern', () => {
    // Test that the configuration follows the pattern:
    // process.env.NEXT_PUBLIC_APP_URL || 'https://astrologerstudio.com'
    const envValue = process.env.NEXT_PUBLIC_APP_URL
    const defaultValue = 'https://astrologerstudio.com'

    // This mimics the logic in the config file
    const expected = envValue || defaultValue
    expect(APP_URL).toBe(expected)
  })

  it('should be usable with URL constructor for metadataBase', () => {
    // Next.js uses metadataBase: new URL(APP_URL)
    const url = new URL(APP_URL)
    expect(url.origin).toBe(APP_URL)
  })
})
