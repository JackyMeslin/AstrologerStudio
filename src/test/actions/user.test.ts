/**
 * Unit Tests for User Actions
 *
 * Tests the user server actions including getUserProfile and updateUserProfile.
 *
 * @module src/actions/user
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// ============================================================================
// MOCKS
// ============================================================================

// Mock prisma user operations
const mockPrismaUser = {
  findUnique: vi.fn(),
  update: vi.fn(),
}

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      get findUnique() {
        return mockPrismaUser.findUnique
      },
      get update() {
        return mockPrismaUser.update
      },
    },
  },
}))

// Mock auth helper (withAuth)
const mockWithAuth = vi.fn()
vi.mock('@/lib/security/auth', () => ({
  withAuth: (fn: (session: { userId: string; username: string }) => Promise<unknown>) => mockWithAuth(fn),
}))

// Mock next/cache
const mockRevalidatePath = vi.fn()
vi.mock('next/cache', () => ({
  revalidatePath: (path: string) => mockRevalidatePath(path),
}))

// Mock logger
vi.mock('@/lib/logging/server', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Mock session for authenticated tests
 */
const mockSession = { userId: 'user-123', username: 'testuser' }

/**
 * Base user object for tests
 */
const baseUser = {
  id: 'user-123',
  username: 'testuser',
  email: 'test@example.com',
  firstName: 'John',
  lastName: 'Doe',
  password: 'hashed_password',
  authProvider: 'credentials',
}

// ============================================================================
// TESTS
// ============================================================================

describe('User Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default withAuth implementation - execute the function with mock session
    mockWithAuth.mockImplementation(async (fn: (session: { userId: string; username: string }) => Promise<unknown>) => {
      return fn(mockSession)
    })
  })

  // ==========================================================================
  // getUserProfile TESTS
  // ==========================================================================

  describe('getUserProfile', () => {
    describe('authentication', () => {
      it('should return null when user is not authenticated', async () => {
        mockWithAuth.mockRejectedValue(new Error('Unauthorized'))

        const { getUserProfile } = await import('@/actions/user')
        const result = await getUserProfile()

        expect(result).toBeNull()
        expect(mockPrismaUser.findUnique).not.toHaveBeenCalled()
      })
    })

    describe('success case', () => {
      it('should return user profile when authenticated and user exists', async () => {
        mockPrismaUser.findUnique.mockResolvedValue(baseUser)

        const { getUserProfile } = await import('@/actions/user')
        const result = await getUserProfile()

        expect(result).toEqual({
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          hasPassword: true,
          authProvider: 'credentials',
        })

        expect(mockPrismaUser.findUnique).toHaveBeenCalledWith({
          where: { id: mockSession.userId },
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
            password: true,
            authProvider: true,
          },
        })
      })

      it('should return hasPassword as false when user has no password', async () => {
        mockPrismaUser.findUnique.mockResolvedValue({
          ...baseUser,
          password: null,
        })

        const { getUserProfile } = await import('@/actions/user')
        const result = await getUserProfile()

        expect(result?.hasPassword).toBe(false)
      })

      it('should return null email when user has no email', async () => {
        mockPrismaUser.findUnique.mockResolvedValue({
          ...baseUser,
          email: null,
        })

        const { getUserProfile } = await import('@/actions/user')
        const result = await getUserProfile()

        expect(result?.email).toBeNull()
      })

      it('should return null firstName/lastName when not set', async () => {
        mockPrismaUser.findUnique.mockResolvedValue({
          ...baseUser,
          firstName: null,
          lastName: null,
        })

        const { getUserProfile } = await import('@/actions/user')
        const result = await getUserProfile()

        expect(result?.firstName).toBeNull()
        expect(result?.lastName).toBeNull()
      })
    })

    describe('user not found', () => {
      it('should return null when user is not found', async () => {
        mockPrismaUser.findUnique.mockResolvedValue(null)

        const { getUserProfile } = await import('@/actions/user')
        const result = await getUserProfile()

        expect(result).toBeNull()
      })
    })

    describe('error handling', () => {
      it('should return null when database throws an error', async () => {
        mockPrismaUser.findUnique.mockRejectedValue(new Error('Database error'))

        const { getUserProfile } = await import('@/actions/user')
        const result = await getUserProfile()

        expect(result).toBeNull()
      })
    })
  })

  // ==========================================================================
  // updateUserProfile TESTS
  // ==========================================================================

  describe('updateUserProfile', () => {
    describe('authentication', () => {
      it('should return error when user is not authenticated', async () => {
        mockWithAuth.mockRejectedValue(new Error('Unauthorized'))

        const { updateUserProfile } = await import('@/actions/user')
        const result = await updateUserProfile({ firstName: 'Jane' })

        expect(result).toEqual({ success: false, error: 'Unauthorized' })
        expect(mockPrismaUser.update).not.toHaveBeenCalled()
      })
    })

    describe('zod validation', () => {
      it('should return error when firstName exceeds max length', async () => {
        const { updateUserProfile } = await import('@/actions/user')
        const longName = 'a'.repeat(51)
        const result = await updateUserProfile({ firstName: longName })

        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
        expect(mockPrismaUser.update).not.toHaveBeenCalled()
      })

      it('should return error when lastName exceeds max length', async () => {
        const { updateUserProfile } = await import('@/actions/user')
        const longName = 'a'.repeat(51)
        const result = await updateUserProfile({ lastName: longName })

        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
        expect(mockPrismaUser.update).not.toHaveBeenCalled()
      })

      it('should accept empty object (no updates)', async () => {
        mockPrismaUser.update.mockResolvedValue(baseUser)

        const { updateUserProfile } = await import('@/actions/user')
        const result = await updateUserProfile({})

        expect(result.success).toBe(true)
        expect(mockPrismaUser.update).toHaveBeenCalled()
      })

      it('should accept valid firstName within max length', async () => {
        mockPrismaUser.update.mockResolvedValue(baseUser)

        const { updateUserProfile } = await import('@/actions/user')
        const result = await updateUserProfile({ firstName: 'a'.repeat(50) })

        expect(result.success).toBe(true)
        expect(mockPrismaUser.update).toHaveBeenCalled()
      })

      it('should accept valid lastName within max length', async () => {
        mockPrismaUser.update.mockResolvedValue(baseUser)

        const { updateUserProfile } = await import('@/actions/user')
        const result = await updateUserProfile({ lastName: 'a'.repeat(50) })

        expect(result.success).toBe(true)
        expect(mockPrismaUser.update).toHaveBeenCalled()
      })
    })

    describe('valid update', () => {
      it('should update firstName successfully', async () => {
        mockPrismaUser.update.mockResolvedValue({ ...baseUser, firstName: 'Jane' })

        const { updateUserProfile } = await import('@/actions/user')
        const result = await updateUserProfile({ firstName: 'Jane' })

        expect(result).toEqual({ success: true })
        expect(mockPrismaUser.update).toHaveBeenCalledWith({
          where: { id: mockSession.userId },
          data: {
            firstName: 'Jane',
            lastName: null,
          },
        })
      })

      it('should update lastName successfully', async () => {
        mockPrismaUser.update.mockResolvedValue({ ...baseUser, lastName: 'Smith' })

        const { updateUserProfile } = await import('@/actions/user')
        const result = await updateUserProfile({ lastName: 'Smith' })

        expect(result).toEqual({ success: true })
        expect(mockPrismaUser.update).toHaveBeenCalledWith({
          where: { id: mockSession.userId },
          data: {
            firstName: null,
            lastName: 'Smith',
          },
        })
      })

      it('should update both firstName and lastName successfully', async () => {
        mockPrismaUser.update.mockResolvedValue({
          ...baseUser,
          firstName: 'Jane',
          lastName: 'Smith',
        })

        const { updateUserProfile } = await import('@/actions/user')
        const result = await updateUserProfile({ firstName: 'Jane', lastName: 'Smith' })

        expect(result).toEqual({ success: true })
        expect(mockPrismaUser.update).toHaveBeenCalledWith({
          where: { id: mockSession.userId },
          data: {
            firstName: 'Jane',
            lastName: 'Smith',
          },
        })
      })

      it('should set empty string values to null', async () => {
        mockPrismaUser.update.mockResolvedValue({ ...baseUser, firstName: null })

        const { updateUserProfile } = await import('@/actions/user')
        const result = await updateUserProfile({ firstName: '' })

        expect(result).toEqual({ success: true })
        expect(mockPrismaUser.update).toHaveBeenCalledWith({
          where: { id: mockSession.userId },
          data: {
            firstName: null,
            lastName: null,
          },
        })
      })
    })

    describe('revalidatePath', () => {
      it('should call revalidatePath with /settings after successful update', async () => {
        mockPrismaUser.update.mockResolvedValue(baseUser)

        const { updateUserProfile } = await import('@/actions/user')
        await updateUserProfile({ firstName: 'Jane' })

        expect(mockRevalidatePath).toHaveBeenCalledWith('/settings')
      })

      it('should not call revalidatePath when validation fails', async () => {
        const { updateUserProfile } = await import('@/actions/user')
        await updateUserProfile({ firstName: 'a'.repeat(51) })

        expect(mockRevalidatePath).not.toHaveBeenCalled()
      })

      it('should not call revalidatePath when database update fails', async () => {
        mockPrismaUser.update.mockRejectedValue(new Error('Database error'))

        const { updateUserProfile } = await import('@/actions/user')
        await updateUserProfile({ firstName: 'Jane' })

        expect(mockRevalidatePath).not.toHaveBeenCalled()
      })
    })

    describe('error handling', () => {
      it('should return error when database update fails', async () => {
        mockPrismaUser.update.mockRejectedValue(new Error('Database error'))

        const { updateUserProfile } = await import('@/actions/user')
        const result = await updateUserProfile({ firstName: 'Jane' })

        expect(result).toEqual({ success: false, error: 'Failed to update profile' })
      })

      it('should handle Prisma unique constraint errors', async () => {
        const prismaError = new Error('Unique constraint failed')
        mockPrismaUser.update.mockRejectedValue(prismaError)

        const { updateUserProfile } = await import('@/actions/user')
        const result = await updateUserProfile({ firstName: 'Jane' })

        expect(result).toEqual({ success: false, error: 'Failed to update profile' })
      })
    })
  })
})
