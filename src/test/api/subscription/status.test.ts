/**
 * Unit Tests for Subscription Status API Route
 *
 * Tests the GET handler for /api/subscription/status
 *
 * @module src/app/api/subscription/status/route
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ============================================================================
// MOCKS
// ============================================================================

// Mock logger - inline to avoid hoisting issues
vi.mock('@/lib/logging/server', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock session
const mockGetSession = vi.fn()

vi.mock('@/lib/security/session', () => ({
  getSession: () => mockGetSession(),
}))

// Mock subscription
const mockGetSubscriptionStatus = vi.fn()

vi.mock('@/lib/subscription', () => ({
  getSubscriptionStatus: (...args: unknown[]) => mockGetSubscriptionStatus(...args),
}))

// Mock cache control
vi.mock('@/lib/security/cache-control', () => ({
  CACHE_CONTROL: {
    noStore: 'no-store',
    userDataSemiStatic: 'semi-static',
  },
  cacheControlHeaders: (policy: string) => ({
    'Cache-Control': policy,
  }),
}))

// ============================================================================
// TESTS
// ============================================================================

// Import after mocking
import { GET } from '@/app/api/subscription/status/route'
import { logger } from '@/lib/logging/server'

describe('Subscription Status API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET handler', () => {
    describe('when user is not authenticated', () => {
      it('should return 401 Unauthorized', async () => {
        mockGetSession.mockResolvedValue(null)

        const request = new NextRequest('http://localhost:3000/api/subscription/status')
        const response = await GET(request)
        const json = await response.json()

        expect(response.status).toBe(401)
        expect(json).toEqual({ error: 'Unauthorized' })
      })

      it('should return 401 when userId is missing', async () => {
        mockGetSession.mockResolvedValue({ username: 'test' })

        const request = new NextRequest('http://localhost:3000/api/subscription/status')
        const response = await GET(request)
        const json = await response.json()

        expect(response.status).toBe(401)
        expect(json).toEqual({ error: 'Unauthorized' })
      })
    })

    describe('when user is authenticated', () => {
      beforeEach(() => {
        mockGetSession.mockResolvedValue({
          userId: 'user-123',
          username: 'testuser',
        })
      })

      it('should return subscription status successfully', async () => {
        const subscriptionEndDate = new Date('2026-12-31')
        mockGetSubscriptionStatus.mockResolvedValue({
          plan: 'pro',
          isActive: true,
          trialDaysLeft: null,
          subscriptionEndsAt: subscriptionEndDate,
          isStale: false,
        })

        const request = new NextRequest('http://localhost:3000/api/subscription/status')
        const response = await GET(request)
        const json = await response.json()

        expect(response.status).toBe(200)
        expect(json).toEqual({
          plan: 'pro',
          isActive: true,
          trialDaysLeft: null,
          subscriptionEndsAt: subscriptionEndDate.toISOString(),
          isStale: false,
        })
        expect(mockGetSubscriptionStatus).toHaveBeenCalledWith('user-123', { forceSync: false })
      })

      it('should pass forceSync=true when requested', async () => {
        mockGetSubscriptionStatus.mockResolvedValue({
          plan: 'pro',
          isActive: true,
          trialDaysLeft: null,
          subscriptionEndsAt: null,
          isStale: false,
        })

        const request = new NextRequest('http://localhost:3000/api/subscription/status?forceSync=true')
        const response = await GET(request)

        expect(response.status).toBe(200)
        expect(mockGetSubscriptionStatus).toHaveBeenCalledWith('user-123', { forceSync: true })
      })

      it('should handle null subscriptionEndsAt', async () => {
        mockGetSubscriptionStatus.mockResolvedValue({
          plan: 'trial',
          isActive: true,
          trialDaysLeft: 5,
          subscriptionEndsAt: null,
          isStale: false,
        })

        const request = new NextRequest('http://localhost:3000/api/subscription/status')
        const response = await GET(request)
        const json = await response.json()

        expect(response.status).toBe(200)
        expect(json.subscriptionEndsAt).toBeNull()
      })

      it('should handle undefined isStale as false', async () => {
        mockGetSubscriptionStatus.mockResolvedValue({
          plan: 'pro',
          isActive: true,
          trialDaysLeft: null,
          subscriptionEndsAt: null,
          // isStale is undefined
        })

        const request = new NextRequest('http://localhost:3000/api/subscription/status')
        const response = await GET(request)
        const json = await response.json()

        expect(response.status).toBe(200)
        expect(json.isStale).toBe(false)
      })
    })

    describe('error handling', () => {
      beforeEach(() => {
        mockGetSession.mockResolvedValue({
          userId: 'user-123',
          username: 'testuser',
        })
      })

      it('should return 500 and log error when getSubscriptionStatus throws', async () => {
        const testError = new Error('Database connection failed')
        mockGetSubscriptionStatus.mockRejectedValue(testError)

        const request = new NextRequest('http://localhost:3000/api/subscription/status')
        const response = await GET(request)
        const json = await response.json()

        expect(response.status).toBe(500)
        expect(json).toEqual({ error: 'Internal server error' })
        expect(logger.error).toHaveBeenCalledWith(
          '[Subscription/Status] Error fetching subscription status:',
          testError,
        )
      })

      it('should return 500 and log error when getSession throws', async () => {
        const testError = new Error('Session service unavailable')
        mockGetSession.mockRejectedValue(testError)

        const request = new NextRequest('http://localhost:3000/api/subscription/status')
        const response = await GET(request)
        const json = await response.json()

        expect(response.status).toBe(500)
        expect(json).toEqual({ error: 'Internal server error' })
        expect(logger.error).toHaveBeenCalledWith(
          '[Subscription/Status] Error fetching subscription status:',
          testError,
        )
      })

      it('should not expose error details in response', async () => {
        const sensitiveError = new Error('User password hash: abc123xyz')
        mockGetSubscriptionStatus.mockRejectedValue(sensitiveError)

        const request = new NextRequest('http://localhost:3000/api/subscription/status')
        const response = await GET(request)
        const json = await response.json()

        expect(response.status).toBe(500)
        expect(JSON.stringify(json)).not.toContain('password')
        expect(JSON.stringify(json)).not.toContain('abc123xyz')
        expect(json).toEqual({ error: 'Internal server error' })
      })
    })
  })
})
