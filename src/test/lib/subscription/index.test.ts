/**
 * Unit Tests for Subscription Module Index
 *
 * Tests the main subscription functions: getSubscriptionStatus,
 * getSessionWithSubscription, and hasActiveSubscription.
 *
 * @module src/lib/subscription/index
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Prisma to prevent any real DB queries (safety guard)
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    subject: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    $transaction: vi.fn(),
    $disconnect: vi.fn(),
  },
}))

// Mock logger to prevent actual logging and verify log calls
vi.mock('@/lib/logging/server', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    getLevel: vi.fn(() => 'debug'),
  },
}))

// Mock getSession from session module
const mockGetSession = vi.fn()
vi.mock('@/lib/security/session', () => ({
  getSession: () => mockGetSession(),
}))

// Mutable flag to control isDodoPaymentsEnabled behavior
let mockDodoPaymentsEnabled = false

// Mock config module with controllable isDodoPaymentsEnabled
vi.mock('@/lib/subscription/config', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/subscription/config')>()
  return {
    ...original,
    isDodoPaymentsEnabled: () => mockDodoPaymentsEnabled,
  }
})

// Mock for dodo payments dynamic import - getUserSubscription
const mockGetUserSubscription = vi.fn()
// Mock for dodo payments dynamic import - getSessionWithSubscription
const mockDodoGetSessionWithSubscription = vi.fn()

// Track if dodo modules should fail to import
let mockDodoImportFails = false

// Mock dynamic imports for Dodo Payments modules
vi.mock('@/dodopayments/lib/subscription', () => {
  return {
    get getUserSubscription() {
      if (mockDodoImportFails) {
        throw new Error('Module not found')
      }
      return mockGetUserSubscription
    },
  }
})

vi.mock('@/dodopayments/lib/access', () => {
  return {
    get getSessionWithSubscription() {
      if (mockDodoImportFails) {
        throw new Error('Module not found')
      }
      return mockDodoGetSessionWithSubscription
    },
  }
})

// Import after mocking
import { getSubscriptionStatus, getSessionWithSubscription, hasActiveSubscription } from '@/lib/subscription/index'
import { logger } from '@/lib/logging/server'

describe('Subscription Module Index', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDodoPaymentsEnabled = false
    mockDodoImportFails = false
    mockGetSession.mockReset()
    mockGetUserSubscription.mockReset()
    mockDodoGetSessionWithSubscription.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getSubscriptionStatus', () => {
    const userId = 'test-user-123'

    describe('when Dodo Payments is disabled', () => {
      beforeEach(() => {
        mockDodoPaymentsEnabled = false
      })

      it('should return lifetime access for any user', async () => {
        const result = await getSubscriptionStatus(userId)

        expect(result).toEqual({
          plan: 'lifetime',
          isActive: true,
          trialDaysLeft: null,
          subscriptionEndsAt: null,
          isStale: false,
        })
      })

      it('should log that Dodo Payments is disabled', async () => {
        await getSubscriptionStatus(userId)

        expect(logger.info).toHaveBeenCalledWith(
          expect.stringContaining(`Dodo Payments disabled → returning lifetime access for user ${userId}`),
        )
      })

      it('should return lifetime access with forceSync option', async () => {
        const result = await getSubscriptionStatus(userId, { forceSync: true })

        expect(result).toEqual({
          plan: 'lifetime',
          isActive: true,
          trialDaysLeft: null,
          subscriptionEndsAt: null,
          isStale: false,
        })
      })
    })

    describe('when Dodo Payments is enabled', () => {
      beforeEach(() => {
        mockDodoPaymentsEnabled = true
        mockDodoImportFails = false
      })

      it('should return active subscription from Dodo module', async () => {
        const subscriptionEndDate = new Date('2026-12-31')
        mockGetUserSubscription.mockResolvedValue({
          plan: 'pro',
          isActive: true,
          trialDaysLeft: null,
          subscriptionEndsAt: subscriptionEndDate,
          isStale: false,
        })

        const result = await getSubscriptionStatus(userId)

        expect(result).toEqual({
          plan: 'pro',
          isActive: true,
          trialDaysLeft: null,
          subscriptionEndsAt: subscriptionEndDate,
          isStale: false,
        })
        expect(mockGetUserSubscription).toHaveBeenCalledWith(userId, {})
      })

      it('should return trial subscription with days left', async () => {
        mockGetUserSubscription.mockResolvedValue({
          plan: 'trial',
          isActive: true,
          trialDaysLeft: 5,
          subscriptionEndsAt: null,
          isStale: false,
        })

        const result = await getSubscriptionStatus(userId)

        expect(result).toEqual({
          plan: 'trial',
          isActive: true,
          trialDaysLeft: 5,
          subscriptionEndsAt: null,
          isStale: false,
        })
      })

      it('should return inactive/expired subscription', async () => {
        mockGetUserSubscription.mockResolvedValue({
          plan: 'pro',
          isActive: false,
          trialDaysLeft: null,
          subscriptionEndsAt: new Date('2025-01-01'),
          isStale: false,
        })

        const result = await getSubscriptionStatus(userId)

        expect(result).toEqual({
          plan: 'pro',
          isActive: false,
          trialDaysLeft: null,
          subscriptionEndsAt: new Date('2025-01-01'),
          isStale: false,
        })
      })

      it('should pass forceSync option to Dodo module', async () => {
        mockGetUserSubscription.mockResolvedValue({
          plan: 'pro',
          isActive: true,
          trialDaysLeft: null,
          subscriptionEndsAt: null,
        })

        await getSubscriptionStatus(userId, { forceSync: true })

        expect(mockGetUserSubscription).toHaveBeenCalledWith(userId, { forceSync: true })
      })

      it('should handle isStale being undefined from provider', async () => {
        mockGetUserSubscription.mockResolvedValue({
          plan: 'pro',
          isActive: true,
          trialDaysLeft: null,
          subscriptionEndsAt: null,
          // isStale is undefined
        })

        const result = await getSubscriptionStatus(userId)

        expect(result.isStale).toBe(false)
      })

      it('should handle isStale being true from provider', async () => {
        mockGetUserSubscription.mockResolvedValue({
          plan: 'pro',
          isActive: true,
          trialDaysLeft: null,
          subscriptionEndsAt: null,
          isStale: true,
        })

        const result = await getSubscriptionStatus(userId)

        expect(result.isStale).toBe(true)
      })

      it('should log subscription info on successful fetch', async () => {
        mockGetUserSubscription.mockResolvedValue({
          plan: 'pro',
          isActive: true,
          trialDaysLeft: null,
          subscriptionEndsAt: null,
        })

        await getSubscriptionStatus(userId)

        expect(logger.info).toHaveBeenCalledWith(
          expect.stringContaining(`User ${userId} subscription: plan=pro, isActive=true`),
        )
      })
    })

    describe('when Dodo Payments module import fails', () => {
      beforeEach(() => {
        mockDodoPaymentsEnabled = true
        mockDodoImportFails = true
      })

      it('should fallback to lifetime access', async () => {
        const result = await getSubscriptionStatus(userId)

        expect(result).toEqual({
          plan: 'lifetime',
          isActive: true,
          trialDaysLeft: null,
          subscriptionEndsAt: null,
          isStale: false,
        })
      })

      it('should log warning about import failure', async () => {
        await getSubscriptionStatus(userId)

        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Dodo Payments import failed, fallback to lifetime'),
          expect.any(Error),
        )
      })
    })

    describe('when Dodo Payments provider throws error', () => {
      beforeEach(() => {
        mockDodoPaymentsEnabled = true
        mockDodoImportFails = false
      })

      it('should fallback to lifetime access on provider error', async () => {
        mockGetUserSubscription.mockRejectedValue(new Error('Provider unavailable'))

        const result = await getSubscriptionStatus(userId)

        expect(result).toEqual({
          plan: 'lifetime',
          isActive: true,
          trialDaysLeft: null,
          subscriptionEndsAt: null,
          isStale: false,
        })
      })

      it('should log warning on provider error', async () => {
        const providerError = new Error('Provider unavailable')
        mockGetUserSubscription.mockRejectedValue(providerError)

        await getSubscriptionStatus(userId)

        expect(logger.warn).toHaveBeenCalledWith(
          expect.stringContaining('Dodo Payments import failed, fallback to lifetime'),
          expect.any(Error),
        )
      })
    })
  })

  describe('getSessionWithSubscription', () => {
    describe('when no session exists', () => {
      beforeEach(() => {
        mockGetSession.mockResolvedValue(null)
      })

      it('should return null', async () => {
        const result = await getSessionWithSubscription()

        expect(result).toBeNull()
      })

      it('should log debug message about no session', async () => {
        await getSessionWithSubscription()

        expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('getSessionWithSubscription: no session'))
      })
    })

    describe('when session exists and Dodo Payments is disabled', () => {
      beforeEach(() => {
        mockGetSession.mockResolvedValue({
          userId: 'user-123',
          username: 'testuser',
          expiresAt: new Date(),
        })
        mockDodoPaymentsEnabled = false
      })

      it('should return session with lifetime subscription', async () => {
        const result = await getSessionWithSubscription()

        expect(result).toEqual({
          userId: 'user-123',
          username: 'testuser',
          subscriptionPlan: 'lifetime',
          isSubscriptionActive: true,
          trialDaysLeft: null,
        })
      })

      it('should log info about lifetime access', async () => {
        await getSessionWithSubscription()

        expect(logger.info).toHaveBeenCalledWith(
          expect.stringContaining('Dodo Payments disabled → lifetime for testuser'),
        )
      })
    })

    describe('when session exists and Dodo Payments is enabled', () => {
      beforeEach(() => {
        mockGetSession.mockResolvedValue({
          userId: 'user-123',
          username: 'testuser',
          expiresAt: new Date(),
        })
        mockDodoPaymentsEnabled = true
        mockDodoImportFails = false
      })

      it('should return subscription data from Dodo module', async () => {
        mockDodoGetSessionWithSubscription.mockResolvedValue({
          userId: 'user-123',
          username: 'testuser',
          subscriptionPlan: 'pro',
          isSubscriptionActive: true,
          trialDaysLeft: null,
        })

        const result = await getSessionWithSubscription()

        expect(result).toEqual({
          userId: 'user-123',
          username: 'testuser',
          subscriptionPlan: 'pro',
          isSubscriptionActive: true,
          trialDaysLeft: null,
        })
      })

      it('should return trial subscription with trial days', async () => {
        mockDodoGetSessionWithSubscription.mockResolvedValue({
          userId: 'user-123',
          username: 'testuser',
          subscriptionPlan: 'trial',
          isSubscriptionActive: true,
          trialDaysLeft: 7,
        })

        const result = await getSessionWithSubscription()

        expect(result).toEqual({
          userId: 'user-123',
          username: 'testuser',
          subscriptionPlan: 'trial',
          isSubscriptionActive: true,
          trialDaysLeft: 7,
        })
      })

      it('should return inactive subscription', async () => {
        mockDodoGetSessionWithSubscription.mockResolvedValue({
          userId: 'user-123',
          username: 'testuser',
          subscriptionPlan: 'free',
          isSubscriptionActive: false,
          trialDaysLeft: null,
        })

        const result = await getSessionWithSubscription()

        expect(result).toEqual({
          userId: 'user-123',
          username: 'testuser',
          subscriptionPlan: 'free',
          isSubscriptionActive: false,
          trialDaysLeft: null,
        })
      })
    })

    describe('when Dodo module import fails', () => {
      beforeEach(() => {
        mockGetSession.mockResolvedValue({
          userId: 'user-123',
          username: 'testuser',
          expiresAt: new Date(),
        })
        mockDodoPaymentsEnabled = true
        mockDodoImportFails = true
      })

      it('should fallback to lifetime subscription', async () => {
        const result = await getSessionWithSubscription()

        expect(result).toEqual({
          userId: 'user-123',
          username: 'testuser',
          subscriptionPlan: 'lifetime',
          isSubscriptionActive: true,
          trialDaysLeft: null,
        })
      })
    })

    describe('when Dodo provider throws error', () => {
      beforeEach(() => {
        mockGetSession.mockResolvedValue({
          userId: 'user-123',
          username: 'testuser',
          expiresAt: new Date(),
        })
        mockDodoPaymentsEnabled = true
        mockDodoImportFails = false
      })

      it('should propagate provider error (not caught by current implementation)', async () => {
        // Note: Unlike getSubscriptionStatus, getSessionWithSubscription does not await
        // the dpGetSession() call, so provider errors propagate rather than being caught.
        // This tests the actual behavior of the code.
        mockDodoGetSessionWithSubscription.mockRejectedValue(new Error('Provider error'))

        await expect(getSessionWithSubscription()).rejects.toThrow('Provider error')
      })
    })
  })

  describe('hasActiveSubscription', () => {
    describe('when Dodo Payments is disabled', () => {
      beforeEach(() => {
        mockDodoPaymentsEnabled = false
      })

      it('should return true (lifetime has active subscription)', async () => {
        const result = await hasActiveSubscription('user-123')

        expect(result).toBe(true)
      })
    })

    describe('when Dodo Payments is enabled', () => {
      beforeEach(() => {
        mockDodoPaymentsEnabled = true
        mockDodoImportFails = false
      })

      it('should return true for active subscription', async () => {
        mockGetUserSubscription.mockResolvedValue({
          plan: 'pro',
          isActive: true,
          trialDaysLeft: null,
          subscriptionEndsAt: null,
        })

        const result = await hasActiveSubscription('user-123')

        expect(result).toBe(true)
      })

      it('should return false for expired subscription', async () => {
        mockGetUserSubscription.mockResolvedValue({
          plan: 'pro',
          isActive: false,
          trialDaysLeft: null,
          subscriptionEndsAt: new Date('2025-01-01'),
        })

        const result = await hasActiveSubscription('user-123')

        expect(result).toBe(false)
      })

      it('should return true for active trial', async () => {
        mockGetUserSubscription.mockResolvedValue({
          plan: 'trial',
          isActive: true,
          trialDaysLeft: 3,
          subscriptionEndsAt: null,
        })

        const result = await hasActiveSubscription('user-123')

        expect(result).toBe(true)
      })

      it('should return false for expired trial', async () => {
        mockGetUserSubscription.mockResolvedValue({
          plan: 'trial',
          isActive: false,
          trialDaysLeft: 0,
          subscriptionEndsAt: null,
        })

        const result = await hasActiveSubscription('user-123')

        expect(result).toBe(false)
      })

      it('should return true for free plan with active status', async () => {
        mockGetUserSubscription.mockResolvedValue({
          plan: 'free',
          isActive: true,
          trialDaysLeft: null,
          subscriptionEndsAt: null,
        })

        const result = await hasActiveSubscription('user-123')

        expect(result).toBe(true)
      })
    })

    describe('when Dodo module fails', () => {
      beforeEach(() => {
        mockDodoPaymentsEnabled = true
        mockDodoImportFails = true
      })

      it('should return true (fallback to lifetime)', async () => {
        const result = await hasActiveSubscription('user-123')

        expect(result).toBe(true)
      })
    })

    describe('when provider throws error', () => {
      beforeEach(() => {
        mockDodoPaymentsEnabled = true
        mockDodoImportFails = false
      })

      it('should return true on provider error (fallback to lifetime)', async () => {
        mockGetUserSubscription.mockRejectedValue(new Error('Provider error'))

        const result = await hasActiveSubscription('user-123')

        expect(result).toBe(true)
      })
    })
  })
})
