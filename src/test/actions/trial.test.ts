/**
 * Unit Tests for Trial Actions
 *
 * Tests the trial server actions including activateBonusTrial and downgradeToFree.
 *
 * @module src/actions/trial
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// ============================================================================
// MOCKS
// ============================================================================

// Mock session
const mockGetSession = vi.fn()

vi.mock('@/lib/security/session', () => ({
  getSession: () => mockGetSession(),
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
  revalidatePath: (path: string, type?: string) => mockRevalidatePath(path, type),
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

// Mock trial config
const mockTrialEndDate = new Date('2026-02-15T00:00:00.000Z')
vi.mock('@/lib/config/trial', () => ({
  calculateTrialEndDate: () => mockTrialEndDate,
}))

// ============================================================================
// TEST HELPERS
// ============================================================================

const mockSession = { userId: 'user-123', username: 'testuser' }

// ============================================================================
// TESTS
// ============================================================================

describe('Trial Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue(mockSession)
  })

  // ==========================================================================
  // activateBonusTrial TESTS
  // ==========================================================================

  describe('activateBonusTrial', () => {
    it('should return error when session is null', async () => {
      const { activateBonusTrial } = await import('@/actions/trial')
      mockGetSession.mockResolvedValue(null)

      const result = await activateBonusTrial()

      expect(result).toEqual({ error: 'Not authenticated' })
      expect(mockPrismaUser.findUnique).not.toHaveBeenCalled()
    })

    it('should return error when session has no userId', async () => {
      const { activateBonusTrial } = await import('@/actions/trial')
      mockGetSession.mockResolvedValue({ username: 'testuser' })

      const result = await activateBonusTrial()

      expect(result).toEqual({ error: 'Not authenticated' })
    })

    it('should return error when user not found', async () => {
      const { activateBonusTrial } = await import('@/actions/trial')
      mockPrismaUser.findUnique.mockResolvedValue(null)

      const result = await activateBonusTrial()

      expect(result).toEqual({ error: 'User not found' })
    })

    // Rejection cases using test.each
    it.each([
      ['already on trial', { subscriptionPlan: 'trial' }, 'Bonus trial is only available for free plan users'],
      ['already pro', { subscriptionPlan: 'pro' }, 'Bonus trial is only available for free plan users'],
      ['already lifetime', { subscriptionPlan: 'lifetime' }, 'Bonus trial is only available for free plan users'],
      [
        'bonus already used',
        { subscriptionPlan: 'free', existingUserTrialActivatedAt: new Date() },
        'Bonus trial has already been activated',
      ],
    ])('should return error when %s', async (_description, userData, expectedError) => {
      const { activateBonusTrial } = await import('@/actions/trial')
      mockPrismaUser.findUnique.mockResolvedValue(userData)

      const result = await activateBonusTrial()

      expect(result).toEqual({ error: expectedError })
      expect(mockPrismaUser.update).not.toHaveBeenCalled()
    })

    it('should activate trial for free user without previous bonus', async () => {
      const { activateBonusTrial } = await import('@/actions/trial')
      mockPrismaUser.findUnique.mockResolvedValue({
        subscriptionPlan: 'free',
        existingUserTrialActivatedAt: null,
        trialEndsAt: null,
      })
      mockPrismaUser.update.mockResolvedValue({})

      const result = await activateBonusTrial()

      expect(result).toEqual({ success: true })
      expect(mockPrismaUser.update).toHaveBeenCalledWith({
        where: { id: mockSession.userId },
        data: expect.objectContaining({
          subscriptionPlan: 'trial',
          trialEndsAt: mockTrialEndDate,
          existingUserTrialActivatedAt: expect.any(Date),
          trialWelcomeShownAt: expect.any(Date),
        }),
      })
      expect(mockRevalidatePath).toHaveBeenCalledWith('/', 'layout')
    })

    it('should return error when database update fails', async () => {
      const { activateBonusTrial } = await import('@/actions/trial')
      mockPrismaUser.findUnique.mockResolvedValue({
        subscriptionPlan: 'free',
        existingUserTrialActivatedAt: null,
        trialEndsAt: null,
      })
      mockPrismaUser.update.mockRejectedValue(new Error('Database error'))

      const result = await activateBonusTrial()

      expect(result).toEqual({ error: 'Failed to activate bonus trial' })
    })
  })

  // ==========================================================================
  // downgradeToFree TESTS
  // ==========================================================================

  describe('downgradeToFree', () => {
    it('should return error when session is null', async () => {
      const { downgradeToFree } = await import('@/actions/trial')
      mockGetSession.mockResolvedValue(null)

      const result = await downgradeToFree()

      expect(result).toEqual({ error: 'Not authenticated' })
      expect(mockPrismaUser.update).not.toHaveBeenCalled()
    })

    it('should return error when session has no userId', async () => {
      const { downgradeToFree } = await import('@/actions/trial')
      mockGetSession.mockResolvedValue({ username: 'testuser' })

      const result = await downgradeToFree()

      expect(result).toEqual({ error: 'Not authenticated' })
    })

    it('should set plan to free (keeping trialEndsAt for history)', async () => {
      const { downgradeToFree } = await import('@/actions/trial')
      mockPrismaUser.update.mockResolvedValue({})

      const result = await downgradeToFree()

      expect(result).toEqual({ success: true })
      expect(mockPrismaUser.update).toHaveBeenCalledWith({
        where: { id: mockSession.userId },
        data: {
          subscriptionPlan: 'free',
        },
      })
      expect(mockRevalidatePath).toHaveBeenCalledWith('/', 'layout')
    })

    it('should return error when database update fails', async () => {
      const { downgradeToFree } = await import('@/actions/trial')
      mockPrismaUser.update.mockRejectedValue(new Error('Database error'))

      const result = await downgradeToFree()

      expect(result).toEqual({ error: 'Failed to downgrade to free plan' })
    })
  })

  // ==========================================================================
  // dismissTrialWelcome TESTS
  // ==========================================================================

  describe('dismissTrialWelcome', () => {
    it('should return error when session is null', async () => {
      const { dismissTrialWelcome } = await import('@/actions/trial')
      mockGetSession.mockResolvedValue(null)

      const result = await dismissTrialWelcome()

      expect(result).toEqual({ error: 'Not authenticated' })
      expect(mockPrismaUser.update).not.toHaveBeenCalled()
    })

    it('should return error when session has no userId', async () => {
      const { dismissTrialWelcome } = await import('@/actions/trial')
      mockGetSession.mockResolvedValue({ username: 'testuser' })

      const result = await dismissTrialWelcome()

      expect(result).toEqual({ error: 'Not authenticated' })
    })

    it('should update trialWelcomeShownAt on success', async () => {
      const { dismissTrialWelcome } = await import('@/actions/trial')
      mockPrismaUser.update.mockResolvedValue({})

      const result = await dismissTrialWelcome()

      expect(result).toEqual({ success: true })
      expect(mockPrismaUser.update).toHaveBeenCalledWith({
        where: { id: mockSession.userId },
        data: {
          trialWelcomeShownAt: expect.any(Date),
        },
      })
      expect(mockRevalidatePath).toHaveBeenCalledWith('/', 'layout')
    })

    it('should return error when database update fails', async () => {
      const { dismissTrialWelcome } = await import('@/actions/trial')
      mockPrismaUser.update.mockRejectedValue(new Error('Database error'))

      const result = await dismissTrialWelcome()

      expect(result).toEqual({ error: 'Failed to dismiss welcome' })
    })
  })
})
