/**
 * Unit Tests for Admin Auth Utilities
 *
 * Comprehensive tests for admin authentication wrapper functions and utilities,
 * covering all authorization branches including session presence, role validation,
 * error handling, and exception propagation.
 *
 * @vitest-environment node
 * @module src/lib/security/admin-auth
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { AdminSessionPayload } from '@/lib/security/admin-session'

// Mock getAdminSession from admin-session module
const mockGetAdminSession = vi.fn()
vi.mock('@/lib/security/admin-session', () => ({
  getAdminSession: () => mockGetAdminSession(),
}))

// Mock prisma to ensure tests are 100% isolated from production DB
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    adminSession: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({}),
    },
    adminAuditLog: {
      create: vi.fn().mockResolvedValue({}),
    },
    adminUser: {
      update: vi.fn().mockResolvedValue({}),
    },
  },
}))

// Test fixtures
const createMockAdminSession = (overrides: Partial<AdminSessionPayload> = {}): AdminSessionPayload => ({
  adminId: 'admin-123',
  username: 'testadmin',
  role: 'admin',
  sessionId: 'session-456',
  expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
  ...overrides,
})

const createMockSuperAdminSession = (overrides: Partial<AdminSessionPayload> = {}): AdminSessionPayload => ({
  adminId: 'superadmin-789',
  username: 'superadmin',
  role: 'superadmin',
  sessionId: 'session-999',
  expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
  ...overrides,
})

describe('Admin Auth Utilities', () => {
  beforeEach(() => {
    vi.resetModules()
    mockGetAdminSession.mockReset()
  })

  describe('AdminUnauthorizedError', () => {
    /**
     * Tests for the AdminUnauthorizedError class.
     * This error is thrown when admin authentication is required but absent.
     */

    it('should create error with default message', async () => {
      const { AdminUnauthorizedError } = await import('@/lib/security/admin-auth')

      const error = new AdminUnauthorizedError()

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(AdminUnauthorizedError)
      expect(error.message).toBe('Admin authentication required')
      expect(error.name).toBe('AdminUnauthorizedError')
    })

    it('should create error with custom message', async () => {
      const { AdminUnauthorizedError } = await import('@/lib/security/admin-auth')

      const customMessage = 'Custom unauthorized message'
      const error = new AdminUnauthorizedError(customMessage)

      expect(error.message).toBe(customMessage)
      expect(error.name).toBe('AdminUnauthorizedError')
    })

    it('should be catchable as Error', async () => {
      const { AdminUnauthorizedError } = await import('@/lib/security/admin-auth')

      const error = new AdminUnauthorizedError()

      try {
        throw error
      } catch (e) {
        expect(e).toBeInstanceOf(Error)
        expect(e).toBeInstanceOf(AdminUnauthorizedError)
      }
    })
  })

  describe('AdminForbiddenError', () => {
    /**
     * Tests for the AdminForbiddenError class.
     * This error is thrown when admin doesn't have sufficient privileges.
     */

    it('should create error with default message', async () => {
      const { AdminForbiddenError } = await import('@/lib/security/admin-auth')

      const error = new AdminForbiddenError()

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(AdminForbiddenError)
      expect(error.message).toBe('Insufficient admin privileges')
      expect(error.name).toBe('AdminForbiddenError')
    })

    it('should create error with custom message', async () => {
      const { AdminForbiddenError } = await import('@/lib/security/admin-auth')

      const customMessage = 'You need higher privileges'
      const error = new AdminForbiddenError(customMessage)

      expect(error.message).toBe(customMessage)
      expect(error.name).toBe('AdminForbiddenError')
    })

    it('should be catchable as Error', async () => {
      const { AdminForbiddenError } = await import('@/lib/security/admin-auth')

      const error = new AdminForbiddenError()

      try {
        throw error
      } catch (e) {
        expect(e).toBeInstanceOf(Error)
        expect(e).toBeInstanceOf(AdminForbiddenError)
      }
    })
  })

  describe('withAdminAuth', () => {
    /**
     * Tests for the withAdminAuth wrapper function.
     * This function ensures admin authentication before executing the wrapped function.
     */

    it('should throw AdminUnauthorizedError when session is null', async () => {
      const { withAdminAuth, AdminUnauthorizedError } = await import('@/lib/security/admin-auth')
      mockGetAdminSession.mockResolvedValue(null)

      const wrappedFn = vi.fn().mockResolvedValue('result')

      await expect(withAdminAuth(wrappedFn)).rejects.toThrow(AdminUnauthorizedError)
      expect(wrappedFn).not.toHaveBeenCalled()
    })

    it('should throw AdminUnauthorizedError when session is undefined', async () => {
      const { withAdminAuth, AdminUnauthorizedError } = await import('@/lib/security/admin-auth')
      mockGetAdminSession.mockResolvedValue(undefined)

      const wrappedFn = vi.fn().mockResolvedValue('result')

      await expect(withAdminAuth(wrappedFn)).rejects.toThrow(AdminUnauthorizedError)
      expect(wrappedFn).not.toHaveBeenCalled()
    })

    it('should execute wrapped function for admin session', async () => {
      const { withAdminAuth } = await import('@/lib/security/admin-auth')
      const mockSession = createMockAdminSession()
      mockGetAdminSession.mockResolvedValue(mockSession)

      const wrappedFn = vi.fn().mockResolvedValue('admin-result')

      const result = await withAdminAuth(wrappedFn)

      expect(result).toBe('admin-result')
      expect(wrappedFn).toHaveBeenCalledTimes(1)
      expect(wrappedFn).toHaveBeenCalledWith(mockSession)
    })

    it('should execute wrapped function for superadmin session', async () => {
      const { withAdminAuth } = await import('@/lib/security/admin-auth')
      const mockSession = createMockSuperAdminSession()
      mockGetAdminSession.mockResolvedValue(mockSession)

      const wrappedFn = vi.fn().mockResolvedValue('superadmin-result')

      const result = await withAdminAuth(wrappedFn)

      expect(result).toBe('superadmin-result')
      expect(wrappedFn).toHaveBeenCalledTimes(1)
      expect(wrappedFn).toHaveBeenCalledWith(mockSession)
    })

    it('should propagate errors thrown by wrapped function', async () => {
      const { withAdminAuth } = await import('@/lib/security/admin-auth')
      mockGetAdminSession.mockResolvedValue(createMockAdminSession())

      const testError = new Error('Internal operation failed')
      const wrappedFn = vi.fn().mockRejectedValue(testError)

      await expect(withAdminAuth(wrappedFn)).rejects.toThrow('Internal operation failed')
      expect(wrappedFn).toHaveBeenCalledTimes(1)
    })

    it('should propagate custom error types thrown by wrapped function', async () => {
      const { withAdminAuth } = await import('@/lib/security/admin-auth')
      mockGetAdminSession.mockResolvedValue(createMockAdminSession())

      class CustomError extends Error {
        constructor() {
          super('Custom error')
          this.name = 'CustomError'
        }
      }
      const wrappedFn = vi.fn().mockRejectedValue(new CustomError())

      await expect(withAdminAuth(wrappedFn)).rejects.toThrow(CustomError)
    })

    it('should return complex result types correctly', async () => {
      const { withAdminAuth } = await import('@/lib/security/admin-auth')
      mockGetAdminSession.mockResolvedValue(createMockAdminSession())

      const complexResult = {
        users: [{ id: 1, name: 'John' }],
        pagination: { page: 1, total: 100 },
        metadata: { timestamp: new Date() },
      }
      const wrappedFn = vi.fn().mockResolvedValue(complexResult)

      const result = await withAdminAuth(wrappedFn)

      expect(result).toEqual(complexResult)
    })
  })

  describe('withSuperAdminAuth', () => {
    /**
     * Tests for the withSuperAdminAuth wrapper function.
     * This function ensures superadmin role before executing the wrapped function.
     */

    it('should throw AdminUnauthorizedError when session is null', async () => {
      const { withSuperAdminAuth, AdminUnauthorizedError } = await import('@/lib/security/admin-auth')
      mockGetAdminSession.mockResolvedValue(null)

      const wrappedFn = vi.fn().mockResolvedValue('result')

      await expect(withSuperAdminAuth(wrappedFn)).rejects.toThrow(AdminUnauthorizedError)
      expect(wrappedFn).not.toHaveBeenCalled()
    })

    it('should throw AdminUnauthorizedError when session is undefined', async () => {
      const { withSuperAdminAuth, AdminUnauthorizedError } = await import('@/lib/security/admin-auth')
      mockGetAdminSession.mockResolvedValue(undefined)

      const wrappedFn = vi.fn().mockResolvedValue('result')

      await expect(withSuperAdminAuth(wrappedFn)).rejects.toThrow(AdminUnauthorizedError)
      expect(wrappedFn).not.toHaveBeenCalled()
    })

    it('should throw AdminForbiddenError for admin role (not superadmin)', async () => {
      const { withSuperAdminAuth, AdminForbiddenError } = await import('@/lib/security/admin-auth')
      mockGetAdminSession.mockResolvedValue(createMockAdminSession({ role: 'admin' }))

      const wrappedFn = vi.fn().mockResolvedValue('result')

      await expect(withSuperAdminAuth(wrappedFn)).rejects.toThrow(AdminForbiddenError)
      await expect(withSuperAdminAuth(wrappedFn)).rejects.toThrow('Superadmin access required')
      expect(wrappedFn).not.toHaveBeenCalled()
    })

    it('should execute wrapped function for superadmin session', async () => {
      const { withSuperAdminAuth } = await import('@/lib/security/admin-auth')
      const mockSession = createMockSuperAdminSession()
      mockGetAdminSession.mockResolvedValue(mockSession)

      const wrappedFn = vi.fn().mockResolvedValue('superadmin-only-result')

      const result = await withSuperAdminAuth(wrappedFn)

      expect(result).toBe('superadmin-only-result')
      expect(wrappedFn).toHaveBeenCalledTimes(1)
      expect(wrappedFn).toHaveBeenCalledWith(mockSession)
    })

    it('should propagate errors thrown by wrapped function', async () => {
      const { withSuperAdminAuth } = await import('@/lib/security/admin-auth')
      mockGetAdminSession.mockResolvedValue(createMockSuperAdminSession())

      const testError = new Error('Database connection failed')
      const wrappedFn = vi.fn().mockRejectedValue(testError)

      await expect(withSuperAdminAuth(wrappedFn)).rejects.toThrow('Database connection failed')
      expect(wrappedFn).toHaveBeenCalledTimes(1)
    })

    it('should propagate custom error types thrown by wrapped function', async () => {
      const { withSuperAdminAuth } = await import('@/lib/security/admin-auth')
      mockGetAdminSession.mockResolvedValue(createMockSuperAdminSession())

      class DatabaseError extends Error {
        constructor() {
          super('DB Error')
          this.name = 'DatabaseError'
        }
      }
      const wrappedFn = vi.fn().mockRejectedValue(new DatabaseError())

      await expect(withSuperAdminAuth(wrappedFn)).rejects.toThrow(DatabaseError)
    })

    it('should return complex result types correctly', async () => {
      const { withSuperAdminAuth } = await import('@/lib/security/admin-auth')
      mockGetAdminSession.mockResolvedValue(createMockSuperAdminSession())

      const complexResult = {
        systemConfig: { featureFlags: { beta: true } },
        stats: { activeUsers: 5000 },
      }
      const wrappedFn = vi.fn().mockResolvedValue(complexResult)

      const result = await withSuperAdminAuth(wrappedFn)

      expect(result).toEqual(complexResult)
    })
  })

  describe('requireAdminAuth', () => {
    /**
     * Tests for the requireAdminAuth function.
     * This function returns the authenticated session or throws.
     */

    it('should throw AdminUnauthorizedError when session is null', async () => {
      const { requireAdminAuth, AdminUnauthorizedError } = await import('@/lib/security/admin-auth')
      mockGetAdminSession.mockResolvedValue(null)

      await expect(requireAdminAuth()).rejects.toThrow(AdminUnauthorizedError)
    })

    it('should throw AdminUnauthorizedError when session is undefined', async () => {
      const { requireAdminAuth, AdminUnauthorizedError } = await import('@/lib/security/admin-auth')
      mockGetAdminSession.mockResolvedValue(undefined)

      await expect(requireAdminAuth()).rejects.toThrow(AdminUnauthorizedError)
    })

    it('should return session for authenticated admin', async () => {
      const { requireAdminAuth } = await import('@/lib/security/admin-auth')
      const mockSession = createMockAdminSession()
      mockGetAdminSession.mockResolvedValue(mockSession)

      const result = await requireAdminAuth()

      expect(result).toEqual(mockSession)
      expect(result.adminId).toBe('admin-123')
      expect(result.username).toBe('testadmin')
      expect(result.role).toBe('admin')
    })

    it('should return session for authenticated superadmin', async () => {
      const { requireAdminAuth } = await import('@/lib/security/admin-auth')
      const mockSession = createMockSuperAdminSession()
      mockGetAdminSession.mockResolvedValue(mockSession)

      const result = await requireAdminAuth()

      expect(result).toEqual(mockSession)
      expect(result.adminId).toBe('superadmin-789')
      expect(result.username).toBe('superadmin')
      expect(result.role).toBe('superadmin')
    })

    it('should throw error with default message', async () => {
      const { requireAdminAuth } = await import('@/lib/security/admin-auth')
      mockGetAdminSession.mockResolvedValue(null)

      await expect(requireAdminAuth()).rejects.toThrow('Admin authentication required')
    })
  })

  describe('isSuperAdmin', () => {
    /**
     * Tests for the isSuperAdmin function.
     * This function checks if the current session belongs to a superadmin.
     */

    it('should return false when session is null', async () => {
      const { isSuperAdmin } = await import('@/lib/security/admin-auth')
      mockGetAdminSession.mockResolvedValue(null)

      const result = await isSuperAdmin()

      expect(result).toBe(false)
    })

    it('should return false when session is undefined', async () => {
      const { isSuperAdmin } = await import('@/lib/security/admin-auth')
      mockGetAdminSession.mockResolvedValue(undefined)

      const result = await isSuperAdmin()

      expect(result).toBe(false)
    })

    it('should return false for admin role', async () => {
      const { isSuperAdmin } = await import('@/lib/security/admin-auth')
      mockGetAdminSession.mockResolvedValue(createMockAdminSession({ role: 'admin' }))

      const result = await isSuperAdmin()

      expect(result).toBe(false)
    })

    it('should return true for superadmin role', async () => {
      const { isSuperAdmin } = await import('@/lib/security/admin-auth')
      mockGetAdminSession.mockResolvedValue(createMockSuperAdminSession())

      const result = await isSuperAdmin()

      expect(result).toBe(true)
    })
  })

  describe('Error handling edge cases', () => {
    /**
     * Tests for edge cases and error handling scenarios.
     */

    it('should handle getAdminSession throwing an error in withAdminAuth', async () => {
      const { withAdminAuth } = await import('@/lib/security/admin-auth')
      mockGetAdminSession.mockRejectedValue(new Error('Session service unavailable'))

      const wrappedFn = vi.fn().mockResolvedValue('result')

      await expect(withAdminAuth(wrappedFn)).rejects.toThrow('Session service unavailable')
      expect(wrappedFn).not.toHaveBeenCalled()
    })

    it('should handle getAdminSession throwing an error in withSuperAdminAuth', async () => {
      const { withSuperAdminAuth } = await import('@/lib/security/admin-auth')
      mockGetAdminSession.mockRejectedValue(new Error('Database connection lost'))

      const wrappedFn = vi.fn().mockResolvedValue('result')

      await expect(withSuperAdminAuth(wrappedFn)).rejects.toThrow('Database connection lost')
      expect(wrappedFn).not.toHaveBeenCalled()
    })

    it('should handle getAdminSession throwing an error in requireAdminAuth', async () => {
      const { requireAdminAuth } = await import('@/lib/security/admin-auth')
      mockGetAdminSession.mockRejectedValue(new Error('Cookie parsing failed'))

      await expect(requireAdminAuth()).rejects.toThrow('Cookie parsing failed')
    })

    it('should handle getAdminSession throwing an error in isSuperAdmin', async () => {
      const { isSuperAdmin } = await import('@/lib/security/admin-auth')
      mockGetAdminSession.mockRejectedValue(new Error('Unexpected error'))

      await expect(isSuperAdmin()).rejects.toThrow('Unexpected error')
    })

    it('should handle synchronous errors in wrapped function', async () => {
      const { withAdminAuth } = await import('@/lib/security/admin-auth')
      mockGetAdminSession.mockResolvedValue(createMockAdminSession())

      const wrappedFn = vi.fn().mockImplementation(() => {
        throw new Error('Sync error in wrapped function')
      })

      await expect(withAdminAuth(wrappedFn)).rejects.toThrow('Sync error in wrapped function')
    })
  })
})
