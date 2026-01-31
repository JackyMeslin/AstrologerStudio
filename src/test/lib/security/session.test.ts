/**
 * Unit Tests for Session Management
 *
 * Tests the session management functions including JWT encryption/decryption
 * and cookie handling for authentication.
 *
 * @vitest-environment node
 * @module src/lib/security/session
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SignJWT, jwtVerify } from 'jose'

// Test constants
const TEST_SECRET = 'test-secret-key-minimum-32-chars!!'
const TEST_USER_ID = 'user-123'
const TEST_USERNAME = 'testuser'

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

// Helper to create a valid test JWT
async function createValidJwt(
  payload: { userId: string; username: string; expiresAt: Date },
  secret: string = TEST_SECRET,
): Promise<string> {
  const encodedKey = new TextEncoder().encode(secret)
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedKey)
}

// Helper to create an expired JWT
async function createExpiredJwt(
  payload: { userId: string; username: string; expiresAt: Date },
  secret: string = TEST_SECRET,
): Promise<string> {
  const encodedKey = new TextEncoder().encode(secret)
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('-1s') // Already expired
    .sign(encodedKey)
}

// Helper to create a JWT with an arbitrary payload (for malformed payload tests)
async function createJwtWithPayload(
  payload: Record<string, unknown>,
  secret: string = TEST_SECRET,
): Promise<string> {
  const encodedKey = new TextEncoder().encode(secret)
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodedKey)
}

describe('Session Management', () => {
  let originalEnv: string | undefined

  beforeEach(() => {
    // Save original value and set test secret BEFORE module import
    originalEnv = process.env.SESSION_SECRET
    process.env.SESSION_SECRET = TEST_SECRET

    // Reset modules to force re-evaluation of session.ts with new env var
    vi.resetModules()

    // Reset all mocks
    mockCookieGet.mockReset()
    mockCookieSet.mockReset()
    mockCookieDelete.mockReset()
  })

  afterEach(() => {
    // Restore original environment
    if (originalEnv !== undefined) {
      process.env.SESSION_SECRET = originalEnv
    } else {
      delete process.env.SESSION_SECRET
    }
    vi.unstubAllEnvs()
  })

  describe('encrypt', () => {
    /**
     * Tests for the encrypt function.
     * This function creates a signed JWT from session payload.
     */

    it('should return a non-empty string', async () => {
      const { encrypt } = await import('@/lib/security/session')
      const payload = {
        userId: TEST_USER_ID,
        username: TEST_USERNAME,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }

      const token = await encrypt(payload)

      expect(token).toBeTruthy()
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(0)
    })

    it('should return a JWT with 3 segments separated by dots', async () => {
      const { encrypt } = await import('@/lib/security/session')
      const payload = {
        userId: TEST_USER_ID,
        username: TEST_USERNAME,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }

      const token = await encrypt(payload)
      const segments = token.split('.')

      expect(segments).toHaveLength(3)
      // Each segment should be non-empty base64url strings
      segments.forEach((segment) => {
        expect(segment.length).toBeGreaterThan(0)
      })
    })

    it('should create a JWT that contains the original userId and username when decoded', async () => {
      const { encrypt } = await import('@/lib/security/session')
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      const payload = {
        userId: TEST_USER_ID,
        username: TEST_USERNAME,
        expiresAt,
      }

      const token = await encrypt(payload)

      // Verify the token with jose
      const encodedKey = new TextEncoder().encode(TEST_SECRET)
      const { payload: decoded } = await jwtVerify(token, encodedKey, {
        algorithms: ['HS256'],
      })

      expect(decoded.userId).toBe(TEST_USER_ID)
      expect(decoded.username).toBe(TEST_USERNAME)
    })
  })

  describe('decrypt', () => {
    /**
     * Tests for the decrypt function.
     * This function verifies and decodes JWT tokens.
     */

    it.each([
      {
        name: 'valid token',
        getToken: async () =>
          createValidJwt({
            userId: TEST_USER_ID,
            username: TEST_USERNAME,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          }),
        expectedResult: 'returns payload',
      },
      {
        name: 'invalid token',
        getToken: async () => 'invalid-token',
        expectedResult: 'returns null',
      },
      {
        name: 'empty string',
        getToken: async () => '',
        expectedResult: 'returns null',
      },
      {
        name: 'undefined',
        getToken: async () => undefined,
        expectedResult: 'returns null',
      },
      {
        name: 'expired token',
        getToken: async () =>
          createExpiredJwt({
            userId: TEST_USER_ID,
            username: TEST_USERNAME,
            expiresAt: new Date(Date.now() - 1000),
          }),
        expectedResult: 'returns null',
      },
    ])("'$name' - '$expectedResult'", async ({ getToken, expectedResult }) => {
      const { decrypt } = await import('@/lib/security/session')
      const token = await getToken()

      const result = await decrypt(token)

      if (expectedResult === 'returns payload') {
        expect(result).not.toBeNull()
        expect(result?.userId).toBe(TEST_USER_ID)
        expect(result?.username).toBe(TEST_USERNAME)
      } else {
        expect(result).toBeNull()
      }
    })
  })

  describe('createSession', () => {
    /**
     * Tests for the createSession function.
     * This function creates a new session cookie with an encrypted JWT.
     */

    it('should call cookies().set() with "session" as the first argument', async () => {
      const { createSession } = await import('@/lib/security/session')

      await createSession(TEST_USER_ID, TEST_USERNAME)

      expect(mockCookieSet).toHaveBeenCalledTimes(1)
      const firstCall = mockCookieSet.mock.calls[0]
      expect(firstCall).toBeDefined()
      expect(firstCall![0]).toBe('session')
    })

    it('should set cookie with httpOnly: true', async () => {
      const { createSession } = await import('@/lib/security/session')

      await createSession(TEST_USER_ID, TEST_USERNAME)

      const firstCall = mockCookieSet.mock.calls[0]
      expect(firstCall).toBeDefined()
      const cookieOptions = firstCall![2] as Record<string, unknown>
      expect(cookieOptions.httpOnly).toBe(true)
    })

    it('should set cookie with sameSite: "lax"', async () => {
      const { createSession } = await import('@/lib/security/session')

      await createSession(TEST_USER_ID, TEST_USERNAME)

      const firstCall = mockCookieSet.mock.calls[0]
      expect(firstCall).toBeDefined()
      const cookieOptions = firstCall![2] as Record<string, unknown>
      expect(cookieOptions.sameSite).toBe('lax')
    })

    it('should set cookie with path: "/"', async () => {
      const { createSession } = await import('@/lib/security/session')

      await createSession(TEST_USER_ID, TEST_USERNAME)

      const firstCall = mockCookieSet.mock.calls[0]
      expect(firstCall).toBeDefined()
      const cookieOptions = firstCall![2] as Record<string, unknown>
      expect(cookieOptions.path).toBe('/')
    })

    it('should set cookie expires within 7 days range', async () => {
      const { createSession } = await import('@/lib/security/session')

      const beforeCall = Date.now()
      await createSession(TEST_USER_ID, TEST_USERNAME)
      const afterCall = Date.now()

      const firstCall = mockCookieSet.mock.calls[0]
      expect(firstCall).toBeDefined()
      const cookieOptions = firstCall![2] as Record<string, unknown>
      const expiresTime = new Date(cookieOptions.expires as Date).getTime()

      // 6.9 days in milliseconds
      const minExpiry = beforeCall + 6.9 * 24 * 60 * 60 * 1000
      // 7.1 days in milliseconds
      const maxExpiry = afterCall + 7.1 * 24 * 60 * 60 * 1000

      expect(expiresTime).toBeGreaterThanOrEqual(minExpiry)
      expect(expiresTime).toBeLessThanOrEqual(maxExpiry)
    })

    it('should set the second argument as a valid JWT token', async () => {
      const { createSession } = await import('@/lib/security/session')

      await createSession(TEST_USER_ID, TEST_USERNAME)

      const firstCall = mockCookieSet.mock.calls[0]
      expect(firstCall).toBeDefined()
      const token = firstCall![1] as string
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3)
    })
  })

  describe('getSession', () => {
    /**
     * Tests for the getSession function.
     * This function retrieves and decrypts the session from cookies.
     */

    it('should return payload when valid session cookie exists', async () => {
      const { getSession } = await import('@/lib/security/session')
      const validJwt = await createValidJwt({
        userId: TEST_USER_ID,
        username: TEST_USERNAME,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })

      mockCookieGet.mockReturnValue({ value: validJwt })

      const result = await getSession()

      expect(result).not.toBeNull()
      expect(result?.userId).toBe(TEST_USER_ID)
      expect(result?.username).toBe(TEST_USERNAME)
    })

    it('should return null when session cookie does not exist', async () => {
      const { getSession } = await import('@/lib/security/session')

      mockCookieGet.mockReturnValue(undefined)

      const result = await getSession()

      expect(result).toBeNull()
    })

    it('should return null when session cookie has invalid token', async () => {
      const { getSession } = await import('@/lib/security/session')

      mockCookieGet.mockReturnValue({ value: 'invalid-token' })

      const result = await getSession()

      expect(result).toBeNull()
    })

    it('should call cookies().get() with "session"', async () => {
      const { getSession } = await import('@/lib/security/session')

      mockCookieGet.mockReturnValue(undefined)

      await getSession()

      expect(mockCookieGet).toHaveBeenCalledWith('session')
    })
  })

  describe('deleteSession', () => {
    /**
     * Tests for the deleteSession function.
     * This function removes the session cookie (logout).
     */

    it('should call cookies().delete() with "session"', async () => {
      const { deleteSession } = await import('@/lib/security/session')

      await deleteSession()

      expect(mockCookieDelete).toHaveBeenCalledTimes(1)
      expect(mockCookieDelete).toHaveBeenCalledWith('session')
    })
  })

  describe('updateSession', () => {
    /**
     * Tests for the updateSession function.
     * This function refreshes the session expiration time.
     */

    it('should not call set() if session does not exist', async () => {
      const { updateSession } = await import('@/lib/security/session')

      mockCookieGet.mockReturnValue(undefined)

      const result = await updateSession()

      expect(result).toBeNull()
      expect(mockCookieSet).not.toHaveBeenCalled()
    })

    it('should not call set() if session token is invalid', async () => {
      const { updateSession } = await import('@/lib/security/session')

      mockCookieGet.mockReturnValue({ value: 'invalid-token' })

      const result = await updateSession()

      expect(result).toBeNull()
      expect(mockCookieSet).not.toHaveBeenCalled()
    })

    it('should call set() with new JWT if valid session exists', async () => {
      const { updateSession } = await import('@/lib/security/session')
      const validJwt = await createValidJwt({
        userId: TEST_USER_ID,
        username: TEST_USERNAME,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })

      mockCookieGet.mockReturnValue({ value: validJwt })

      await updateSession()

      expect(mockCookieSet).toHaveBeenCalledTimes(1)
      const firstCall = mockCookieSet.mock.calls[0]
      expect(firstCall).toBeDefined()
      expect(firstCall![0]).toBe('session')
      // Token should be the same (updateSession reuses the same token)
      expect(firstCall![1]).toBe(validJwt)
    })

    it('should set cookie with updated expires time', async () => {
      const { updateSession } = await import('@/lib/security/session')
      const validJwt = await createValidJwt({
        userId: TEST_USER_ID,
        username: TEST_USERNAME,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })

      mockCookieGet.mockReturnValue({ value: validJwt })

      const beforeCall = Date.now()
      await updateSession()
      const afterCall = Date.now()

      const firstCall = mockCookieSet.mock.calls[0]
      expect(firstCall).toBeDefined()
      const cookieOptions = firstCall![2] as Record<string, unknown>
      const expiresTime = new Date(cookieOptions.expires as Date).getTime()

      // 6.9 days in milliseconds
      const minExpiry = beforeCall + 6.9 * 24 * 60 * 60 * 1000
      // 7.1 days in milliseconds
      const maxExpiry = afterCall + 7.1 * 24 * 60 * 60 * 1000

      expect(expiresTime).toBeGreaterThanOrEqual(minExpiry)
      expect(expiresTime).toBeLessThanOrEqual(maxExpiry)
    })

    it('should set cookie with correct options when updating', async () => {
      const { updateSession } = await import('@/lib/security/session')
      const validJwt = await createValidJwt({
        userId: TEST_USER_ID,
        username: TEST_USERNAME,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })

      mockCookieGet.mockReturnValue({ value: validJwt })

      await updateSession()

      const firstCall = mockCookieSet.mock.calls[0]
      expect(firstCall).toBeDefined()
      const cookieOptions = firstCall![2] as Record<string, unknown>
      expect(cookieOptions.httpOnly).toBe(true)
      expect(cookieOptions.sameSite).toBe('lax')
      expect(cookieOptions.path).toBe('/')
    })
  })

  describe('Payload Validation', () => {
    /**
     * Tests that decrypt rejects tokens with missing or incorrectly-typed fields.
     * The Zod schema validates the JWT payload structure after signature verification.
     */

    it('should return null when payload is missing userId', async () => {
      const { decrypt } = await import('@/lib/security/session')
      const token = await createJwtWithPayload({
        username: TEST_USERNAME,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })

      const result = await decrypt(token)

      expect(result).toBeNull()
    })

    it('should return null when payload is missing username', async () => {
      const { decrypt } = await import('@/lib/security/session')
      const token = await createJwtWithPayload({
        userId: TEST_USER_ID,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })

      const result = await decrypt(token)

      expect(result).toBeNull()
    })

    it('should return null when payload is missing expiresAt', async () => {
      const { decrypt } = await import('@/lib/security/session')
      const token = await createJwtWithPayload({
        userId: TEST_USER_ID,
        username: TEST_USERNAME,
      })

      const result = await decrypt(token)

      expect(result).toBeNull()
    })

    it('should return null when userId is not a string', async () => {
      const { decrypt } = await import('@/lib/security/session')
      const token = await createJwtWithPayload({
        userId: 12345,
        username: TEST_USERNAME,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })

      const result = await decrypt(token)

      expect(result).toBeNull()
    })

    it('should return null when username is not a string', async () => {
      const { decrypt } = await import('@/lib/security/session')
      const token = await createJwtWithPayload({
        userId: TEST_USER_ID,
        username: 42,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })

      const result = await decrypt(token)

      expect(result).toBeNull()
    })

    it('should return null when expiresAt is not coercible to a date', async () => {
      const { decrypt } = await import('@/lib/security/session')
      const token = await createJwtWithPayload({
        userId: TEST_USER_ID,
        username: TEST_USERNAME,
        expiresAt: 'not-a-date',
      })

      const result = await decrypt(token)

      expect(result).toBeNull()
    })

    it('should return null when payload is an empty object', async () => {
      const { decrypt } = await import('@/lib/security/session')
      const token = await createJwtWithPayload({})

      const result = await decrypt(token)

      expect(result).toBeNull()
    })

    it('should accept a valid payload with extra fields', async () => {
      const { decrypt } = await import('@/lib/security/session')
      const token = await createJwtWithPayload({
        userId: TEST_USER_ID,
        username: TEST_USERNAME,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        extraField: 'should be stripped',
      })

      const result = await decrypt(token)

      expect(result).not.toBeNull()
      expect(result?.userId).toBe(TEST_USER_ID)
      expect(result?.username).toBe(TEST_USERNAME)
      expect(result).not.toHaveProperty('extraField')
    })
  })

  describe('Environment Validation', () => {
    it('should warn when SESSION_SECRET is not set in development', async () => {
      vi.resetModules()
      delete process.env.SESSION_SECRET
      vi.stubEnv('NODE_ENV', 'development')

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Import triggers the warning
      await import('@/lib/security/session')

      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Using default SESSION_SECRET'))

      warnSpy.mockRestore()
    })

    it('should throw error in production when SESSION_SECRET is not set', async () => {
      vi.resetModules()
      delete process.env.SESSION_SECRET
      vi.stubEnv('NODE_ENV', 'production')

      await expect(import('@/lib/security/session')).rejects.toThrow(
        'SESSION_SECRET environment variable must be set in production',
      )
    })

    it('should throw error in production when SESSION_SECRET is too short', async () => {
      vi.resetModules()
      process.env.SESSION_SECRET = 'short' // Less than 32 characters
      vi.stubEnv('NODE_ENV', 'production')

      await expect(import('@/lib/security/session')).rejects.toThrow(
        'SESSION_SECRET must be at least 32 characters long',
      )
    })

    it('should not throw in production when SESSION_SECRET is valid', async () => {
      vi.resetModules()
      process.env.SESSION_SECRET = 'a-valid-session-secret-that-is-at-least-32-characters-long'
      vi.stubEnv('NODE_ENV', 'production')

      // Should not throw
      const module = await import('@/lib/security/session')
      expect(module.encrypt).toBeDefined()
    })
  })
})
