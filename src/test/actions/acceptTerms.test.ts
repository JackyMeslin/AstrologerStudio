/**
 * Unit Tests for acceptTerms Action
 *
 * Tests the server action that records user's acceptance
 * of Terms of Service and Privacy Policy.
 *
 * @module src/actions/acceptTerms
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// ============================================================================
// MOCKS
// ============================================================================

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

// Mock prisma
const mockPrismaUser = {
  update: vi.fn(),
}

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      get update() {
        return mockPrismaUser.update
      },
    },
  },
}))

// Mock session
const mockGetSession = vi.fn()

vi.mock('@/lib/security/session', () => ({
  getSession: () => mockGetSession(),
}))

// Mock LEGAL_VERSIONS
const mockLegalVersions = {
  terms: '2026-01-15',
  privacy: '2026-01-14',
}

vi.mock('@/lib/config/legal', () => ({
  LEGAL_VERSIONS: mockLegalVersions,
}))

// Mock revalidatePath
const mockRevalidatePath = vi.fn()

vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}))

// ============================================================================
// TESTS
// ============================================================================

describe('acceptTerms Action', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ==========================================================================
  // SESSION TESTS
  // ==========================================================================

  describe('session handling', () => {
    it('should return error when session is null', async () => {
      const { acceptTerms } = await import('@/actions/acceptTerms')
      mockGetSession.mockResolvedValue(null)

      const result = await acceptTerms()

      expect(result).toEqual({ success: false, error: 'Not authenticated' })
      expect(mockPrismaUser.update).not.toHaveBeenCalled()
      expect(mockRevalidatePath).not.toHaveBeenCalled()
    })

    it('should return error when session has no userId', async () => {
      const { acceptTerms } = await import('@/actions/acceptTerms')
      mockGetSession.mockResolvedValue({ username: 'testuser' })

      const result = await acceptTerms()

      expect(result).toEqual({ success: false, error: 'Not authenticated' })
      expect(mockPrismaUser.update).not.toHaveBeenCalled()
      expect(mockRevalidatePath).not.toHaveBeenCalled()
    })

    it('should return error when session.userId is undefined', async () => {
      const { acceptTerms } = await import('@/actions/acceptTerms')
      mockGetSession.mockResolvedValue({ userId: undefined, username: 'testuser' })

      const result = await acceptTerms()

      expect(result).toEqual({ success: false, error: 'Not authenticated' })
      expect(mockPrismaUser.update).not.toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // SUCCESS CASE TESTS
  // ==========================================================================

  describe('successful acceptance', () => {
    const mockSession = { userId: 'user-123', username: 'testuser' }

    beforeEach(() => {
      mockGetSession.mockResolvedValue(mockSession)
      mockPrismaUser.update.mockResolvedValue({
        id: 'user-123',
        termsAcceptedVersion: mockLegalVersions.terms,
        privacyAcceptedVersion: mockLegalVersions.privacy,
      })
    })

    it('should return success when terms are accepted', async () => {
      const { acceptTerms } = await import('@/actions/acceptTerms')

      const result = await acceptTerms()

      expect(result).toEqual({ success: true })
    })

    it('should update user with correct terms version', async () => {
      const { acceptTerms } = await import('@/actions/acceptTerms')

      await acceptTerms()

      expect(mockPrismaUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-123' },
          data: expect.objectContaining({
            termsAcceptedVersion: mockLegalVersions.terms,
          }),
        }),
      )
    })

    it('should update user with correct privacy version', async () => {
      const { acceptTerms } = await import('@/actions/acceptTerms')

      await acceptTerms()

      expect(mockPrismaUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-123' },
          data: expect.objectContaining({
            privacyAcceptedVersion: mockLegalVersions.privacy,
          }),
        }),
      )
    })

    it('should update user with acceptance timestamps', async () => {
      const { acceptTerms } = await import('@/actions/acceptTerms')

      await acceptTerms()

      expect(mockPrismaUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-123' },
          data: expect.objectContaining({
            termsAcceptedAt: expect.any(Date),
            privacyAcceptedAt: expect.any(Date),
          }),
        }),
      )
    })

    it('should use the same timestamp for both terms and privacy acceptance', async () => {
      const { acceptTerms } = await import('@/actions/acceptTerms')

      await acceptTerms()

      const updateCall = mockPrismaUser.update.mock.calls[0]?.[0] as {
        data: { termsAcceptedAt: Date; privacyAcceptedAt: Date }
      }
      expect(updateCall.data.termsAcceptedAt).toEqual(updateCall.data.privacyAcceptedAt)
    })

    it('should call revalidatePath with correct arguments', async () => {
      const { acceptTerms } = await import('@/actions/acceptTerms')

      await acceptTerms()

      expect(mockRevalidatePath).toHaveBeenCalledWith('/(protected)', 'layout')
    })

    it('should call revalidatePath after successful update', async () => {
      const { acceptTerms } = await import('@/actions/acceptTerms')
      const callOrder: string[] = []

      mockPrismaUser.update.mockImplementation(() => {
        callOrder.push('prisma.update')
        return Promise.resolve({})
      })
      mockRevalidatePath.mockImplementation(() => {
        callOrder.push('revalidatePath')
      })

      await acceptTerms()

      expect(callOrder).toEqual(['prisma.update', 'revalidatePath'])
    })
  })

  // ==========================================================================
  // ERROR HANDLING TESTS
  // ==========================================================================

  describe('error handling', () => {
    const mockSession = { userId: 'user-123', username: 'testuser' }

    beforeEach(() => {
      mockGetSession.mockResolvedValue(mockSession)
    })

    it('should return error when prisma update fails', async () => {
      const { acceptTerms } = await import('@/actions/acceptTerms')
      mockPrismaUser.update.mockRejectedValue(new Error('Database connection failed'))

      const result = await acceptTerms()

      expect(result).toEqual({ success: false, error: 'Failed to save acceptance' })
    })

    it('should return error when prisma throws Prisma-specific error', async () => {
      const { acceptTerms } = await import('@/actions/acceptTerms')
      const prismaError = new Error('Record not found')
      prismaError.name = 'PrismaClientKnownRequestError'
      mockPrismaUser.update.mockRejectedValue(prismaError)

      const result = await acceptTerms()

      expect(result).toEqual({ success: false, error: 'Failed to save acceptance' })
    })

    it('should not call revalidatePath when prisma update fails', async () => {
      const { acceptTerms } = await import('@/actions/acceptTerms')
      mockPrismaUser.update.mockRejectedValue(new Error('Database error'))

      await acceptTerms()

      expect(mockRevalidatePath).not.toHaveBeenCalled()
    })

    it('should log error when prisma update fails', async () => {
      const { acceptTerms } = await import('@/actions/acceptTerms')
      const error = new Error('Database error')
      mockPrismaUser.update.mockRejectedValue(error)

      await acceptTerms()

      expect(mockLogger.error).toHaveBeenCalledWith('Error accepting terms', error)
    })
  })
})
