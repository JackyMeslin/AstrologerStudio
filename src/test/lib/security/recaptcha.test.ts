/**
 * Unit Tests for reCAPTCHA Verification
 *
 * Tests the verifyRecaptcha function that verifies reCAPTCHA tokens
 * with Google's API.
 *
 * @module src/lib/security/recaptcha
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock logger
const mockLogger = {
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}

vi.mock('@/lib/logging/server', () => ({
  logger: mockLogger,
}))

describe('verifyRecaptcha', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
    // Set required secret key for most tests
    process.env.RECAPTCHA_SECRET_KEY = 'test-secret-key'
    // Ensure reCAPTCHA is enabled by default
    process.env.NEXT_PUBLIC_DISABLE_RECAPTCHA = 'false'
    // Clear logger mocks
    mockLogger.warn.mockClear()
    mockLogger.error.mockClear()
    mockLogger.info.mockClear()
    mockLogger.debug.mockClear()
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  describe('API response handling', () => {
    it.each([
      [{ success: true }, true],
      [{ success: false }, false],
      [{ success: true, score: 0.9 }, true],
    ] as const)('should return %s for API response %o', async (responseBody, expectedResult) => {
      // Reset modules to get fresh import with current env
      vi.resetModules()
      const { verifyRecaptcha } = await import('@/lib/security/recaptcha')

      const fetchSpy = vi.spyOn(global, 'fetch')
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(responseBody),
      } as Response)

      const result = await verifyRecaptcha('valid-token')

      expect(result).toBe(expectedResult)
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://www.google.com/recaptcha/api/siteverify',
        expect.objectContaining({
          method: 'POST',
        }),
      )
    })
  })

  describe('error handling', () => {
    it('should return false when fetch throws an error', async () => {
      vi.resetModules()
      const { verifyRecaptcha } = await import('@/lib/security/recaptcha')

      const fetchSpy = vi.spyOn(global, 'fetch')
      fetchSpy.mockRejectedValue(new Error('Network'))

      const result = await verifyRecaptcha('valid-token')

      expect(result).toBe(false)
    })
  })

  describe('empty token handling', () => {
    it('should return false for empty token string without calling fetch', async () => {
      vi.resetModules()
      const { verifyRecaptcha } = await import('@/lib/security/recaptcha')

      const fetchSpy = vi.spyOn(global, 'fetch')

      const result = await verifyRecaptcha('')

      expect(result).toBe(false)
      expect(fetchSpy).not.toHaveBeenCalled()
    })
  })

  describe('disabled reCAPTCHA', () => {
    it('should return true immediately when NEXT_PUBLIC_DISABLE_RECAPTCHA is true without calling fetch', async () => {
      process.env.NEXT_PUBLIC_DISABLE_RECAPTCHA = 'true'
      vi.resetModules()
      const { verifyRecaptcha } = await import('@/lib/security/recaptcha')

      const fetchSpy = vi.spyOn(global, 'fetch')

      const result = await verifyRecaptcha('any-token')

      expect(result).toBe(true)
      expect(fetchSpy).not.toHaveBeenCalled()
    })
  })

  describe('missing secret key', () => {
    it('should throw error when RECAPTCHA_SECRET_KEY is not set', async () => {
      delete process.env.RECAPTCHA_SECRET_KEY
      process.env.NEXT_PUBLIC_DISABLE_RECAPTCHA = 'false'
      vi.resetModules()
      const { verifyRecaptcha } = await import('@/lib/security/recaptcha')

      await expect(verifyRecaptcha('valid-token')).rejects.toThrow('RECAPTCHA_SECRET_KEY is not configured')
    })
  })

  describe('HTTP error handling', () => {
    it('should return false when HTTP response is not ok', async () => {
      vi.resetModules()
      const { verifyRecaptcha } = await import('@/lib/security/recaptcha')

      const fetchSpy = vi.spyOn(global, 'fetch')
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      } as Response)

      const result = await verifyRecaptcha('valid-token')

      expect(result).toBe(false)
    })

    it('should log error when HTTP response is not ok', async () => {
      vi.resetModules()
      const { verifyRecaptcha } = await import('@/lib/security/recaptcha')

      const fetchSpy = vi.spyOn(global, 'fetch')
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      } as Response)

      await verifyRecaptcha('valid-token')

      expect(mockLogger.error).toHaveBeenCalledWith('reCAPTCHA verification request failed', 500)
    })
  })

  describe('logging behavior', () => {
    it('should log warning when no token is provided', async () => {
      vi.resetModules()
      const { verifyRecaptcha } = await import('@/lib/security/recaptcha')

      await verifyRecaptcha('')

      expect(mockLogger.warn).toHaveBeenCalledWith('No reCAPTCHA token provided')
    })

    it('should log warning when verification fails with error codes', async () => {
      vi.resetModules()
      const { verifyRecaptcha } = await import('@/lib/security/recaptcha')

      const fetchSpy = vi.spyOn(global, 'fetch')
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: false, 'error-codes': ['invalid-input-response'] }),
      } as Response)

      await verifyRecaptcha('invalid-token')

      expect(mockLogger.warn).toHaveBeenCalledWith('reCAPTCHA verification failed', ['invalid-input-response'])
    })

    it('should log error when fetch throws an exception', async () => {
      vi.resetModules()
      const { verifyRecaptcha } = await import('@/lib/security/recaptcha')

      const networkError = new Error('Network error')
      const fetchSpy = vi.spyOn(global, 'fetch')
      fetchSpy.mockRejectedValue(networkError)

      await verifyRecaptcha('valid-token')

      expect(mockLogger.error).toHaveBeenCalledWith('reCAPTCHA verification error', networkError)
    })
  })
})
