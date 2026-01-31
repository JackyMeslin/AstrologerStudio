/**
 * Unit Tests for Google OAuth Functions
 *
 * Tests the OAuth functions including checking enabled status,
 * generating auth URLs, exchanging codes for tokens, and fetching user info.
 *
 * @module src/lib/security/oauth
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock cookies from next/headers - must be hoisted
const mockCookieGet = vi.fn()
const mockCookieSet = vi.fn()
const mockCookieDelete = vi.fn()

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: mockCookieGet,
    set: mockCookieSet,
    delete: mockCookieDelete,
  })),
}))

// Store original env vars
let originalEnv: NodeJS.ProcessEnv

describe('Google OAuth Functions', () => {
  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env }

    // Reset modules to force re-evaluation with new env vars
    vi.resetModules()

    // Reset all mocks
    mockCookieGet.mockReset()
    mockCookieSet.mockReset()
    mockCookieDelete.mockReset()

    // Reset fetch mock
    vi.restoreAllMocks()
  })

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv
  })

  describe('isGoogleOAuthEnabled', () => {
    /**
     * Tests for the isGoogleOAuthEnabled function.
     * This function checks if Google OAuth is enabled via NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH.
     */

    it.each([
      [{ NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH: 'true' }, true],
      [{ NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH: 'false' }, false],
      [{ NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH: '' }, false],
      [{}, false],
    ])('with env %j should return %s', async (envVars: Record<string, string>, expected: boolean) => {
      // Clear relevant env vars
      delete process.env.NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH

      // Set the provided env vars
      Object.assign(process.env, envVars)

      const { isGoogleOAuthEnabled } = await import('@/lib/security/oauth')

      expect(isGoogleOAuthEnabled()).toBe(expected)
    })
  })

  describe('getGoogleAuthUrl', () => {
    /**
     * Tests for the getGoogleAuthUrl function.
     * This function generates a Google OAuth consent URL with CSRF state.
     */

    beforeEach(() => {
      // Set required env vars for getGoogleAuthUrl
      process.env.GOOGLE_CLIENT_ID = 'test-client-id'
      process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
      process.env.NEXT_PUBLIC_APP_URL = 'https://example.com'
    })

    it('should return URL starting with https://accounts.google.com/o/oauth2/v2/auth', async () => {
      const { getGoogleAuthUrl } = await import('@/lib/security/oauth')

      const result = await getGoogleAuthUrl()

      expect(result.startsWith('https://accounts.google.com/o/oauth2/v2/auth')).toBe(true)
    })

    it('should include correct client_id in URL params', async () => {
      const { getGoogleAuthUrl } = await import('@/lib/security/oauth')

      const result = await getGoogleAuthUrl()
      const url = new URL(result)

      expect(url.searchParams.get('client_id')).toBe('test-client-id')
    })

    it('should include email and profile in scope', async () => {
      const { getGoogleAuthUrl } = await import('@/lib/security/oauth')

      const result = await getGoogleAuthUrl()
      const url = new URL(result)
      const scope = url.searchParams.get('scope')

      expect(scope).toContain('email')
      expect(scope).toContain('profile')
    })

    it('should have response_type set to code', async () => {
      const { getGoogleAuthUrl } = await import('@/lib/security/oauth')

      const result = await getGoogleAuthUrl()
      const url = new URL(result)

      expect(url.searchParams.get('response_type')).toBe('code')
    })

    it('should call cookies().set() for oauth_state', async () => {
      const { getGoogleAuthUrl } = await import('@/lib/security/oauth')

      await getGoogleAuthUrl()

      expect(mockCookieSet).toHaveBeenCalledTimes(1)
      const firstCall = mockCookieSet.mock.calls[0]
      expect(firstCall).toBeDefined()
      expect(firstCall![0]).toBe('oauth_state')
    })

    it('should set oauth_state cookie with httpOnly: true', async () => {
      const { getGoogleAuthUrl } = await import('@/lib/security/oauth')

      await getGoogleAuthUrl()

      const firstCall = mockCookieSet.mock.calls[0]
      expect(firstCall).toBeDefined()
      const cookieOptions = firstCall![2] as Record<string, unknown>
      expect(cookieOptions.httpOnly).toBe(true)
    })

    it('should set oauth_state cookie with maxAge: 600', async () => {
      const { getGoogleAuthUrl } = await import('@/lib/security/oauth')

      await getGoogleAuthUrl()

      const firstCall = mockCookieSet.mock.calls[0]
      expect(firstCall).toBeDefined()
      const cookieOptions = firstCall![2] as Record<string, unknown>
      expect(cookieOptions.maxAge).toBe(600)
    })

    it('should include state parameter in URL that matches cookie value', async () => {
      const { getGoogleAuthUrl } = await import('@/lib/security/oauth')

      const result = await getGoogleAuthUrl()
      const url = new URL(result)
      const stateParam = url.searchParams.get('state')

      const firstCall = mockCookieSet.mock.calls[0]
      const cookieValue = firstCall![1] as string

      expect(stateParam).toBe(cookieValue)
    })

    it('should throw error if GOOGLE_CLIENT_ID is not configured', async () => {
      delete process.env.GOOGLE_CLIENT_ID
      vi.resetModules()

      const { getGoogleAuthUrl } = await import('@/lib/security/oauth')

      await expect(getGoogleAuthUrl()).rejects.toThrow('Google OAuth credentials not configured')
    })

    it('should throw error if GOOGLE_CLIENT_SECRET is not configured', async () => {
      delete process.env.GOOGLE_CLIENT_SECRET
      vi.resetModules()

      const { getGoogleAuthUrl } = await import('@/lib/security/oauth')

      await expect(getGoogleAuthUrl()).rejects.toThrow('Google OAuth credentials not configured')
    })
  })

  describe('exchangeCodeForTokens', () => {
    /**
     * Tests for the exchangeCodeForTokens function.
     * This function exchanges an authorization code for OAuth tokens.
     */

    const mockTokenResponse = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      id_token: 'mock-id-token',
      expires_in: 3600,
      token_type: 'Bearer',
    }

    beforeEach(() => {
      // Set required env vars
      process.env.GOOGLE_CLIENT_ID = 'test-client-id'
      process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
      process.env.NEXT_PUBLIC_APP_URL = 'https://example.com'
    })

    it('should make POST request to Google token URL', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      })
      global.fetch = mockFetch

      const { exchangeCodeForTokens } = await import('@/lib/security/oauth')

      await exchangeCodeForTokens('test-auth-code')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          method: 'POST',
        }),
      )
    })

    it('should include grant_type=authorization_code in request body', async () => {
      let capturedBody: string | undefined
      const mockFetch = vi.fn().mockImplementation((_url, options) => {
        capturedBody = options?.body?.toString()
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTokenResponse),
        })
      })
      global.fetch = mockFetch

      const { exchangeCodeForTokens } = await import('@/lib/security/oauth')

      await exchangeCodeForTokens('test-auth-code')

      expect(capturedBody).toContain('grant_type=authorization_code')
    })

    it('should include the authorization code in request body', async () => {
      let capturedBody: string | undefined
      const mockFetch = vi.fn().mockImplementation((_url, options) => {
        capturedBody = options?.body?.toString()
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTokenResponse),
        })
      })
      global.fetch = mockFetch

      const { exchangeCodeForTokens } = await import('@/lib/security/oauth')

      await exchangeCodeForTokens('my-test-code')

      expect(capturedBody).toContain('code=my-test-code')
    })

    it('should return tokens from successful response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      })
      global.fetch = mockFetch

      const { exchangeCodeForTokens } = await import('@/lib/security/oauth')

      const result = await exchangeCodeForTokens('test-auth-code')

      expect(result.access_token).toBe('mock-access-token')
      expect(result.refresh_token).toBe('mock-refresh-token')
      expect(result.id_token).toBe('mock-id-token')
    })

    it('should throw error for failed response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        text: () => Promise.resolve('invalid_grant'),
      })
      global.fetch = mockFetch

      const { exchangeCodeForTokens } = await import('@/lib/security/oauth')

      await expect(exchangeCodeForTokens('invalid-code')).rejects.toThrow('Failed to exchange code for tokens')
    })

    it('should include Content-Type header as application/x-www-form-urlencoded', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      })
      global.fetch = mockFetch

      const { exchangeCodeForTokens } = await import('@/lib/security/oauth')

      await exchangeCodeForTokens('test-auth-code')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }),
      )
    })
  })

  describe('getGoogleUserInfo', () => {
    /**
     * Tests for the getGoogleUserInfo function.
     * This function fetches user profile from Google using access token.
     */

    const mockUserInfo = {
      id: 'google-user-123',
      email: 'test@example.com',
      verified_email: true,
      name: 'Test User',
      given_name: 'Test',
      family_name: 'User',
      picture: 'https://example.com/photo.jpg',
    }

    it('should make GET request to Google userinfo URL', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockUserInfo),
      })
      global.fetch = mockFetch

      const { getGoogleUserInfo } = await import('@/lib/security/oauth')

      await getGoogleUserInfo('test-access-token')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith('https://www.googleapis.com/oauth2/v2/userinfo', expect.any(Object))
    })

    it('should include Authorization header with Bearer token', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockUserInfo),
      })
      global.fetch = mockFetch

      const { getGoogleUserInfo } = await import('@/lib/security/oauth')

      await getGoogleUserInfo('my-access-token')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer my-access-token',
          },
        }),
      )
    })

    it('should return user info from successful response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockUserInfo),
      })
      global.fetch = mockFetch

      const { getGoogleUserInfo } = await import('@/lib/security/oauth')

      const result = await getGoogleUserInfo('test-access-token')

      expect(result.id).toBe('google-user-123')
      expect(result.email).toBe('test@example.com')
      expect(result.name).toBe('Test User')
      expect(result.picture).toBe('https://example.com/photo.jpg')
      expect(result.verified_email).toBe(true)
    })

    it('should throw error for failed response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        text: () => Promise.resolve('Invalid token'),
      })
      global.fetch = mockFetch

      const { getGoogleUserInfo } = await import('@/lib/security/oauth')

      await expect(getGoogleUserInfo('invalid-token')).rejects.toThrow('Failed to fetch Google user info')
    })
  })
})
