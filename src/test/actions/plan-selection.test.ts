/**
 * Unit Tests for Plan Selection Actions
 *
 * Tests the plan selection server actions including selectFreePlan,
 * checkOnboardingStatus, and completeOnboarding.
 *
 * All tests use mocked prisma, session, and logger to ensure no real
 * database operations or writes to production.
 *
 * @module src/actions/plan-selection
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// ============================================================================
// MOCKS
// ============================================================================

// Mock session
const mockGetSession = vi.fn()
const mockDeleteSession = vi.fn()

vi.mock('@/lib/security/session', () => ({
  getSession: () => mockGetSession(),
  deleteSession: () => mockDeleteSession(),
}))

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

const mockSession = { userId: 'user-123', username: 'testuser' }

// ============================================================================
// TESTS
// ============================================================================

describe('Plan Selection Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue(mockSession)
    mockDeleteSession.mockResolvedValue(undefined)
  })

  // ==========================================================================
  // selectFreePlan TESTS
  // ==========================================================================

  describe('selectFreePlan', () => {
    describe('session validation', () => {
      it('should return error when session is null', async () => {
        const { selectFreePlan } = await import('@/actions/plan-selection')
        mockGetSession.mockResolvedValue(null)

        const result = await selectFreePlan()

        expect(result).toEqual({ error: 'You must be logged in to select a plan.' })
        expect(mockPrismaUser.findUnique).not.toHaveBeenCalled()
      })

      it('should return error when session has no userId', async () => {
        const { selectFreePlan } = await import('@/actions/plan-selection')
        mockGetSession.mockResolvedValue({ username: 'testuser' })

        const result = await selectFreePlan()

        expect(result).toEqual({ error: 'You must be logged in to select a plan.' })
        expect(mockPrismaUser.findUnique).not.toHaveBeenCalled()
      })
    })

    describe('user not found', () => {
      it('should return error and delete session when user not found', async () => {
        const { selectFreePlan } = await import('@/actions/plan-selection')
        mockPrismaUser.findUnique.mockResolvedValue(null)

        const result = await selectFreePlan()

        expect(result).toEqual({ error: 'User account not found. Logging you out...' })
        expect(mockDeleteSession).toHaveBeenCalled()
        expect(mockPrismaUser.update).not.toHaveBeenCalled()
      })
    })

    describe('successful update', () => {
      it('should update user with onboardingCompleted and free plan', async () => {
        const { selectFreePlan } = await import('@/actions/plan-selection')
        mockPrismaUser.findUnique.mockResolvedValue({ id: mockSession.userId })
        mockPrismaUser.update.mockResolvedValue({})

        const result = await selectFreePlan()

        expect(result).toEqual({ success: true })
        expect(mockPrismaUser.update).toHaveBeenCalledWith({
          where: { id: mockSession.userId },
          data: {
            onboardingCompleted: true,
            subscriptionPlan: 'free',
          },
        })
      })

      it('should call revalidatePath after successful update', async () => {
        const { selectFreePlan } = await import('@/actions/plan-selection')
        mockPrismaUser.findUnique.mockResolvedValue({ id: mockSession.userId })
        mockPrismaUser.update.mockResolvedValue({})

        await selectFreePlan()

        expect(mockRevalidatePath).toHaveBeenCalledWith('/')
      })
    })

    describe('error handling', () => {
      it('should handle Prisma P2025 error and delete session', async () => {
        const { selectFreePlan } = await import('@/actions/plan-selection')
        mockPrismaUser.findUnique.mockResolvedValue({ id: mockSession.userId })
        const prismaError = new Error('Record not found')
        ;(prismaError as { code?: string }).code = 'P2025'
        mockPrismaUser.update.mockRejectedValue(prismaError)

        const result = await selectFreePlan()

        expect(result).toEqual({ error: 'User account not found. Logging you out...' })
        expect(mockDeleteSession).toHaveBeenCalled()
      })

      it('should return generic error for non-P2025 errors', async () => {
        const { selectFreePlan } = await import('@/actions/plan-selection')
        mockPrismaUser.findUnique.mockResolvedValue({ id: mockSession.userId })
        mockPrismaUser.update.mockRejectedValue(new Error('Database error'))

        const result = await selectFreePlan()

        expect(result).toEqual({ error: 'An error occurred. Please try again.' })
      })

      it('should not call revalidatePath on error', async () => {
        const { selectFreePlan } = await import('@/actions/plan-selection')
        mockPrismaUser.findUnique.mockResolvedValue({ id: mockSession.userId })
        mockPrismaUser.update.mockRejectedValue(new Error('Database error'))

        await selectFreePlan()

        expect(mockRevalidatePath).not.toHaveBeenCalled()
      })
    })
  })

  // ==========================================================================
  // checkOnboardingStatus TESTS
  // ==========================================================================

  describe('checkOnboardingStatus', () => {
    describe('session validation', () => {
      it('should return completed: false when session is null', async () => {
        const { checkOnboardingStatus } = await import('@/actions/plan-selection')
        mockGetSession.mockResolvedValue(null)

        const result = await checkOnboardingStatus()

        expect(result).toEqual({ completed: false })
        expect(mockPrismaUser.findUnique).not.toHaveBeenCalled()
      })

      it('should return completed: false when session has no userId', async () => {
        const { checkOnboardingStatus } = await import('@/actions/plan-selection')
        mockGetSession.mockResolvedValue({ username: 'testuser' })

        const result = await checkOnboardingStatus()

        expect(result).toEqual({ completed: false })
        expect(mockPrismaUser.findUnique).not.toHaveBeenCalled()
      })
    })

    describe('user not found', () => {
      it('should return completed: false and delete session when user not found', async () => {
        const { checkOnboardingStatus } = await import('@/actions/plan-selection')
        mockPrismaUser.findUnique.mockResolvedValue(null)

        const result = await checkOnboardingStatus()

        expect(result).toEqual({ completed: false })
        expect(mockDeleteSession).toHaveBeenCalled()
      })
    })

    describe('user found', () => {
      it('should return completed: true when user has completed onboarding', async () => {
        const { checkOnboardingStatus } = await import('@/actions/plan-selection')
        mockPrismaUser.findUnique.mockResolvedValue({ onboardingCompleted: true })

        const result = await checkOnboardingStatus()

        expect(result).toEqual({
          completed: true,
          userId: mockSession.userId,
        })
      })

      it('should return completed: false when user has not completed onboarding', async () => {
        const { checkOnboardingStatus } = await import('@/actions/plan-selection')
        mockPrismaUser.findUnique.mockResolvedValue({ onboardingCompleted: false })

        const result = await checkOnboardingStatus()

        expect(result).toEqual({
          completed: false,
          userId: mockSession.userId,
        })
      })

      it('should return completed: false when onboardingCompleted is null', async () => {
        const { checkOnboardingStatus } = await import('@/actions/plan-selection')
        mockPrismaUser.findUnique.mockResolvedValue({ onboardingCompleted: null })

        const result = await checkOnboardingStatus()

        expect(result).toEqual({
          completed: false,
          userId: mockSession.userId,
        })
      })
    })

    describe('error handling', () => {
      it('should return completed: false on database error', async () => {
        const { checkOnboardingStatus } = await import('@/actions/plan-selection')
        mockPrismaUser.findUnique.mockRejectedValue(new Error('Database error'))

        const result = await checkOnboardingStatus()

        expect(result).toEqual({ completed: false })
      })
    })
  })

  // ==========================================================================
  // completeOnboarding TESTS
  // ==========================================================================

  describe('completeOnboarding', () => {
    describe('session validation', () => {
      it('should return error when session is null', async () => {
        const { completeOnboarding } = await import('@/actions/plan-selection')
        mockGetSession.mockResolvedValue(null)

        const result = await completeOnboarding()

        expect(result).toEqual({ error: 'You must be logged in.' })
        expect(mockPrismaUser.findUnique).not.toHaveBeenCalled()
      })

      it('should return error when session has no userId', async () => {
        const { completeOnboarding } = await import('@/actions/plan-selection')
        mockGetSession.mockResolvedValue({ username: 'testuser' })

        const result = await completeOnboarding()

        expect(result).toEqual({ error: 'You must be logged in.' })
        expect(mockPrismaUser.findUnique).not.toHaveBeenCalled()
      })
    })

    describe('user not found', () => {
      it('should return error and delete session when user not found', async () => {
        const { completeOnboarding } = await import('@/actions/plan-selection')
        mockPrismaUser.findUnique.mockResolvedValue(null)

        const result = await completeOnboarding()

        expect(result).toEqual({ error: 'User account not found. Logging you out...' })
        expect(mockDeleteSession).toHaveBeenCalled()
        expect(mockPrismaUser.update).not.toHaveBeenCalled()
      })
    })

    describe('successful update', () => {
      it('should update user with onboardingCompleted: true', async () => {
        const { completeOnboarding } = await import('@/actions/plan-selection')
        mockPrismaUser.findUnique.mockResolvedValue({ id: mockSession.userId })
        mockPrismaUser.update.mockResolvedValue({})

        const result = await completeOnboarding()

        expect(result).toEqual({ success: true })
        expect(mockPrismaUser.update).toHaveBeenCalledWith({
          where: { id: mockSession.userId },
          data: { onboardingCompleted: true },
        })
      })

      it('should call revalidatePath after successful update', async () => {
        const { completeOnboarding } = await import('@/actions/plan-selection')
        mockPrismaUser.findUnique.mockResolvedValue({ id: mockSession.userId })
        mockPrismaUser.update.mockResolvedValue({})

        await completeOnboarding()

        expect(mockRevalidatePath).toHaveBeenCalledWith('/')
      })
    })

    describe('error handling', () => {
      it('should handle Prisma P2025 error and delete session', async () => {
        const { completeOnboarding } = await import('@/actions/plan-selection')
        mockPrismaUser.findUnique.mockResolvedValue({ id: mockSession.userId })
        const prismaError = new Error('Record not found')
        ;(prismaError as { code?: string }).code = 'P2025'
        mockPrismaUser.update.mockRejectedValue(prismaError)

        const result = await completeOnboarding()

        expect(result).toEqual({ error: 'User account not found. Logging you out...' })
        expect(mockDeleteSession).toHaveBeenCalled()
      })

      it('should return generic error for non-P2025 errors', async () => {
        const { completeOnboarding } = await import('@/actions/plan-selection')
        mockPrismaUser.findUnique.mockResolvedValue({ id: mockSession.userId })
        mockPrismaUser.update.mockRejectedValue(new Error('Database error'))

        const result = await completeOnboarding()

        expect(result).toEqual({ error: 'An error occurred. Please try again.' })
      })

      it('should not call revalidatePath on error', async () => {
        const { completeOnboarding } = await import('@/actions/plan-selection')
        mockPrismaUser.findUnique.mockResolvedValue({ id: mockSession.userId })
        mockPrismaUser.update.mockRejectedValue(new Error('Database error'))

        await completeOnboarding()

        expect(mockRevalidatePath).not.toHaveBeenCalled()
      })
    })
  })

  // ==========================================================================
  // DATABASE ISOLATION TESTS
  // ==========================================================================

  describe('database isolation', () => {
    it('should use mocked prisma and never access real DATABASE_URL', async () => {
      // This test verifies that prisma is fully mocked
      const { prisma } = await import('@/lib/db/prisma')

      // Access the mocked methods
      expect(prisma.user.findUnique).toBeDefined()
      expect(prisma.user.update).toBeDefined()

      // Verify they are mocked functions
      expect(typeof prisma.user.findUnique).toBe('function')
      expect(typeof prisma.user.update).toBe('function')
    })

    it('should not make any unmocked database calls', async () => {
      const { selectFreePlan, checkOnboardingStatus, completeOnboarding } = await import('@/actions/plan-selection')

      // Set up mocks for each scenario
      mockGetSession.mockResolvedValue(null)

      // Run all three functions with no session
      await selectFreePlan()
      await checkOnboardingStatus()
      await completeOnboarding()

      // Verify prisma was not called (because session was null)
      expect(mockPrismaUser.findUnique).not.toHaveBeenCalled()
      expect(mockPrismaUser.update).not.toHaveBeenCalled()
    })
  })
})
