/**
 * Unit Tests for Auth Wrappers
 *
 * Tests the authentication wrapper functions including withAuth,
 * withAdminAuth, and withSuperAdminAuth.
 *
 * @module src/lib/security/auth
 * @module src/lib/security/admin-auth
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock getSession from session module
const mockGetSession = vi.fn()
vi.mock('@/lib/security/session', () => ({
  getSession: mockGetSession,
}))

// Mock getAdminSession from admin-session module
const mockGetAdminSession = vi.fn()
vi.mock('@/lib/security/admin-session', () => ({
  getAdminSession: mockGetAdminSession,
}))

// Mock prisma to prevent DB calls during tests
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      update: vi.fn().mockResolvedValue({}),
    },
  },
}))

describe('Auth Wrappers', () => {
  beforeEach(() => {
    vi.resetModules()
    mockGetSession.mockReset()
    mockGetAdminSession.mockReset()
  })

  describe('Error Classes', () => {
    it('should create UnauthorizedError with default message', async () => {
      const { UnauthorizedError } = await import('@/lib/security/auth')
      const error = new UnauthorizedError()

      expect(error.message).toBe('Authentication required')
      expect(error.name).toBe('UnauthorizedError')
      expect(error).toBeInstanceOf(Error)
    })

    it('should create UnauthorizedError with custom message', async () => {
      const { UnauthorizedError } = await import('@/lib/security/auth')
      const error = new UnauthorizedError('Custom auth message')

      expect(error.message).toBe('Custom auth message')
      expect(error.name).toBe('UnauthorizedError')
    })

    it('should create ForbiddenError with default message', async () => {
      const { ForbiddenError } = await import('@/lib/security/auth')
      const error = new ForbiddenError()

      expect(error.message).toBe('Access denied')
      expect(error.name).toBe('ForbiddenError')
      expect(error).toBeInstanceOf(Error)
    })

    it('should create ForbiddenError with custom message', async () => {
      const { ForbiddenError } = await import('@/lib/security/auth')
      const error = new ForbiddenError('Custom forbidden message')

      expect(error.message).toBe('Custom forbidden message')
      expect(error.name).toBe('ForbiddenError')
    })

    it('should create NotFoundError with default message', async () => {
      const { NotFoundError } = await import('@/lib/security/auth')
      const error = new NotFoundError()

      expect(error.message).toBe('Resource not found')
      expect(error.name).toBe('NotFoundError')
      expect(error).toBeInstanceOf(Error)
    })

    it('should create NotFoundError with custom message', async () => {
      const { NotFoundError } = await import('@/lib/security/auth')
      const error = new NotFoundError('User not found')

      expect(error.message).toBe('User not found')
      expect(error.name).toBe('NotFoundError')
    })
  })

  describe('requireAuth', () => {
    it('should return session when authenticated', async () => {
      const { requireAuth } = await import('@/lib/security/auth')
      const mockSession = { userId: 'user-123', username: 'testuser' }
      mockGetSession.mockResolvedValue(mockSession)

      const result = await requireAuth()

      expect(result).toEqual({
        userId: 'user-123',
        username: 'testuser',
      })
    })

    it('should throw UnauthorizedError when not authenticated', async () => {
      const { requireAuth, UnauthorizedError } = await import('@/lib/security/auth')
      mockGetSession.mockResolvedValue(null)

      await expect(requireAuth()).rejects.toThrow(UnauthorizedError)
    })

    it('should throw UnauthorizedError with correct message', async () => {
      const { requireAuth } = await import('@/lib/security/auth')
      mockGetSession.mockResolvedValue(null)

      await expect(requireAuth()).rejects.toThrow('Authentication required')
    })
  })

  describe('withAuth', () => {
    /**
     * Tests for the withAuth function.
     * This function wraps other functions requiring authentication.
     */

    it('should execute the wrapped function with session when authenticated', async () => {
      const { withAuth } = await import('@/lib/security/auth')
      const mockSession = { userId: '1', username: 'test' }
      mockGetSession.mockResolvedValue(mockSession)

      const testFn = vi.fn().mockResolvedValue('result')

      const result = await withAuth(testFn)

      expect(result).toBe('result')
      expect(testFn).toHaveBeenCalledTimes(1)
      expect(testFn).toHaveBeenCalledWith({
        userId: '1',
        username: 'test',
      })
    })

    it('should throw UnauthorizedError when getSession returns null', async () => {
      const { withAuth, UnauthorizedError } = await import('@/lib/security/auth')
      mockGetSession.mockResolvedValue(null)

      const testFn = vi.fn().mockResolvedValue('result')

      await expect(withAuth(testFn)).rejects.toThrow(UnauthorizedError)
      expect(testFn).not.toHaveBeenCalled()
    })

    it('should pass the correct session data to the wrapped function', async () => {
      const { withAuth } = await import('@/lib/security/auth')
      const mockSession = { userId: 'user-456', username: 'testuser' }
      mockGetSession.mockResolvedValue(mockSession)

      const testFn = vi.fn().mockResolvedValue('data')

      await withAuth(testFn)

      expect(testFn).toHaveBeenCalledWith({
        userId: 'user-456',
        username: 'testuser',
      })
    })

    it('should propagate errors from the wrapped function', async () => {
      const { withAuth } = await import('@/lib/security/auth')
      const mockSession = { userId: '1', username: 'test' }
      mockGetSession.mockResolvedValue(mockSession)

      const testError = new Error('Test error')
      const testFn = vi.fn().mockRejectedValue(testError)

      await expect(withAuth(testFn)).rejects.toThrow('Test error')
    })

    it('should return the correct result type from wrapped function', async () => {
      const { withAuth } = await import('@/lib/security/auth')
      const mockSession = { userId: '1', username: 'test' }
      mockGetSession.mockResolvedValue(mockSession)

      const complexResult = { items: [1, 2, 3], total: 3 }
      const testFn = vi.fn().mockResolvedValue(complexResult)

      const result = await withAuth(testFn)

      expect(result).toEqual(complexResult)
    })
  })

  describe('withAdminAuth', () => {
    /**
     * Tests for the withAdminAuth function.
     * This function wraps Server Actions that require admin authentication.
     */

    it('should execute for admin role', async () => {
      const { withAdminAuth } = await import('@/lib/security/admin-auth')
      const mockSession = {
        adminId: 'admin-1',
        username: 'admin',
        role: 'admin' as const,
        sessionId: 'session-1',
      }
      mockGetAdminSession.mockResolvedValue(mockSession)

      const testFn = vi.fn().mockResolvedValue('admin-result')

      const result = await withAdminAuth(testFn)

      expect(result).toBe('admin-result')
      expect(testFn).toHaveBeenCalledTimes(1)
      expect(testFn).toHaveBeenCalledWith(mockSession)
    })

    it('should execute for superadmin role', async () => {
      const { withAdminAuth } = await import('@/lib/security/admin-auth')
      const mockSession = {
        adminId: 'admin-2',
        username: 'superadmin',
        role: 'superadmin' as const,
        sessionId: 'session-2',
      }
      mockGetAdminSession.mockResolvedValue(mockSession)

      const testFn = vi.fn().mockResolvedValue('superadmin-result')

      const result = await withAdminAuth(testFn)

      expect(result).toBe('superadmin-result')
      expect(testFn).toHaveBeenCalledTimes(1)
      expect(testFn).toHaveBeenCalledWith(mockSession)
    })

    it('should throw AdminUnauthorizedError when not authenticated', async () => {
      const { withAdminAuth, AdminUnauthorizedError } = await import('@/lib/security/admin-auth')
      mockGetAdminSession.mockResolvedValue(null)

      const testFn = vi.fn().mockResolvedValue('result')

      await expect(withAdminAuth(testFn)).rejects.toThrow(AdminUnauthorizedError)
      expect(testFn).not.toHaveBeenCalled()
    })
  })

  describe('withSuperAdminAuth', () => {
    /**
     * Tests for the withSuperAdminAuth function.
     * This function wraps Server Actions that require superadmin role.
     */

    it('should execute for superadmin role', async () => {
      const { withSuperAdminAuth } = await import('@/lib/security/admin-auth')
      const mockSession = {
        adminId: 'admin-1',
        username: 'superadmin',
        role: 'superadmin' as const,
        sessionId: 'session-1',
      }
      mockGetAdminSession.mockResolvedValue(mockSession)

      const testFn = vi.fn().mockResolvedValue('superadmin-result')

      const result = await withSuperAdminAuth(testFn)

      expect(result).toBe('superadmin-result')
      expect(testFn).toHaveBeenCalledTimes(1)
      expect(testFn).toHaveBeenCalledWith(mockSession)
    })

    it('should throw AdminForbiddenError for admin role', async () => {
      const { withSuperAdminAuth, AdminForbiddenError } = await import('@/lib/security/admin-auth')
      const mockSession = {
        adminId: 'admin-2',
        username: 'admin',
        role: 'admin' as const,
        sessionId: 'session-2',
      }
      mockGetAdminSession.mockResolvedValue(mockSession)

      const testFn = vi.fn().mockResolvedValue('result')

      await expect(withSuperAdminAuth(testFn)).rejects.toThrow(AdminForbiddenError)
      expect(testFn).not.toHaveBeenCalled()
    })

    it('should throw AdminUnauthorizedError when not authenticated', async () => {
      const { withSuperAdminAuth, AdminUnauthorizedError } = await import('@/lib/security/admin-auth')
      mockGetAdminSession.mockResolvedValue(null)

      const testFn = vi.fn().mockResolvedValue('result')

      await expect(withSuperAdminAuth(testFn)).rejects.toThrow(AdminUnauthorizedError)
      expect(testFn).not.toHaveBeenCalled()
    })

    it('should pass the correct session to the wrapped function', async () => {
      const { withSuperAdminAuth } = await import('@/lib/security/admin-auth')
      const mockSession = {
        adminId: 'super-123',
        username: 'thesuperadmin',
        role: 'superadmin' as const,
        sessionId: 'sess-abc',
      }
      mockGetAdminSession.mockResolvedValue(mockSession)

      const testFn = vi.fn().mockResolvedValue('data')

      await withSuperAdminAuth(testFn)

      expect(testFn).toHaveBeenCalledWith(mockSession)
    })
  })
})
