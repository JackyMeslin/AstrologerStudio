/**
 * Unit Tests for Email Actions
 *
 * Tests the email change server actions including requestEmailChange
 * and verifyEmailChange.
 *
 * @module src/actions/email
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Prisma } from '@prisma/client'

// ============================================================================
// MOCKS
// ============================================================================

// Mock prisma
const mockPrismaUser = {
  findUnique: vi.fn(),
  update: vi.fn(),
}
const mockPrismaVerificationToken = {
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
}
const mockPrismaTransaction = vi.fn()

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
    verificationToken: {
      get findUnique() {
        return mockPrismaVerificationToken.findUnique
      },
      get findFirst() {
        return mockPrismaVerificationToken.findFirst
      },
      get create() {
        return mockPrismaVerificationToken.create
      },
      get update() {
        return mockPrismaVerificationToken.update
      },
      get updateMany() {
        return mockPrismaVerificationToken.updateMany
      },
      get delete() {
        return mockPrismaVerificationToken.delete
      },
      get deleteMany() {
        return mockPrismaVerificationToken.deleteMany
      },
    },
    $transaction: (args: unknown) => mockPrismaTransaction(args),
  },
}))

// Mock mail
const mockSendEmailChangeVerification = vi.fn()
const mockIsEmailConfigured = vi.fn()
vi.mock('@/lib/mail/mail', () => ({
  sendEmailChangeVerification: (...args: unknown[]) => mockSendEmailChangeVerification(...args),
  isEmailConfigured: () => mockIsEmailConfigured(),
}))

// Mock auth helper (withAuth)
const mockWithAuth = vi.fn()
vi.mock('@/lib/security/auth', () => ({
  withAuth: (fn: (session: { userId: string; username: string }) => Promise<unknown>) => mockWithAuth(fn),
}))

// Mock logger
vi.mock('@/lib/logging/server', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// ============================================================================
// TEST HELPERS
// ============================================================================

const mockSession = { userId: 'user-123', username: 'testuser' }

const baseUser = {
  id: 'user-123',
  username: 'testuser',
  email: 'current@example.com',
}

const baseVerificationToken = {
  id: 'token-id-123',
  token: 'hashed-token',
  type: 'email_change',
  userId: 'user-123',
  payload: 'new@example.com',
  usedAt: null,
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
  createdAt: new Date(),
}

// ============================================================================
// TESTS
// ============================================================================

describe('Email Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset common mocks to defaults
    mockIsEmailConfigured.mockReturnValue(true)
    mockPrismaTransaction.mockResolvedValue([{}, {}])

    // Setup withAuth mock to execute the function with a session
    mockWithAuth.mockImplementation(async (fn: (session: { userId: string; username: string }) => Promise<unknown>) => {
      return fn(mockSession)
    })
  })

  // ==========================================================================
  // GET PENDING EMAIL CHANGE TESTS
  // ==========================================================================

  describe('getPendingEmailChange', () => {
    it('should return pending email when token exists', async () => {
      const { getPendingEmailChange } = await import('@/actions/email')

      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
      mockPrismaVerificationToken.findFirst.mockResolvedValue({
        payload: 'pending@example.com',
        expiresAt: futureDate,
      })

      const result = await getPendingEmailChange()

      expect(result).toEqual({
        pendingEmail: 'pending@example.com',
        expiresAt: futureDate,
      })
    })

    it('should return null when no pending token exists', async () => {
      const { getPendingEmailChange } = await import('@/actions/email')

      mockPrismaVerificationToken.findFirst.mockResolvedValue(null)

      const result = await getPendingEmailChange()

      expect(result).toBeNull()
    })

    it('should return null when token has no payload', async () => {
      const { getPendingEmailChange } = await import('@/actions/email')

      mockPrismaVerificationToken.findFirst.mockResolvedValue({
        payload: null,
        expiresAt: new Date(),
      })

      const result = await getPendingEmailChange()

      expect(result).toBeNull()
    })

    it('should return null when auth fails', async () => {
      const { getPendingEmailChange } = await import('@/actions/email')

      mockWithAuth.mockRejectedValue(new Error('Unauthorized'))

      const result = await getPendingEmailChange()

      expect(result).toBeNull()
    })
  })

  // ==========================================================================
  // CANCEL PENDING EMAIL CHANGE TESTS
  // ==========================================================================

  describe('cancelPendingEmailChange', () => {
    it('should mark pending tokens as used', async () => {
      const { cancelPendingEmailChange } = await import('@/actions/email')

      mockPrismaVerificationToken.updateMany.mockResolvedValue({ count: 1 })

      const result = await cancelPendingEmailChange()

      expect(result.success).toBe(true)
      expect(result.error).toBeUndefined()
      expect(mockPrismaVerificationToken.updateMany).toHaveBeenCalledWith({
        where: {
          userId: mockSession.userId,
          type: 'email_change',
          usedAt: null,
        },
        data: {
          usedAt: expect.any(Date),
        },
      })
    })

    it('should return error when database fails', async () => {
      const { cancelPendingEmailChange } = await import('@/actions/email')

      mockPrismaVerificationToken.updateMany.mockRejectedValue(new Error('Database error'))

      const result = await cancelPendingEmailChange()

      expect(result.error).toBe('An error occurred. Please try again.')
    })

    it('should return error when auth fails', async () => {
      const { cancelPendingEmailChange } = await import('@/actions/email')

      mockWithAuth.mockRejectedValue(new Error('Unauthorized'))

      const result = await cancelPendingEmailChange()

      expect(result.error).toBe('Unauthorized')
    })
  })

  // ==========================================================================
  // REQUEST EMAIL CHANGE TESTS
  // ==========================================================================

  describe('requestEmailChange', () => {
    describe('success case', () => {
      it('should create token and send email for valid new email', async () => {
        const { requestEmailChange } = await import('@/actions/email')

        // Email not in use
        mockPrismaUser.findUnique
          .mockResolvedValueOnce(null) // Check if email exists
          .mockResolvedValueOnce(baseUser) // Get current user

        mockPrismaVerificationToken.updateMany.mockResolvedValue({ count: 0 })
        mockPrismaVerificationToken.create.mockResolvedValue(baseVerificationToken)
        mockSendEmailChangeVerification.mockResolvedValue(true)

        const result = await requestEmailChange('new@example.com')

        expect(result.success).toBe(true)
        expect(result.error).toBeUndefined()
        expect(mockPrismaVerificationToken.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              type: 'email_change',
              userId: mockSession.userId,
              payload: 'new@example.com',
            }),
          }),
        )
        expect(mockSendEmailChangeVerification).toHaveBeenCalledWith(
          'new@example.com',
          expect.any(String),
          baseUser.username,
        )
      })

      it('should invalidate previous tokens by calling updateMany before create', async () => {
        const { requestEmailChange } = await import('@/actions/email')

        mockPrismaUser.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(baseUser)
        mockPrismaVerificationToken.updateMany.mockResolvedValue({ count: 1 })
        mockPrismaVerificationToken.create.mockResolvedValue(baseVerificationToken)
        mockSendEmailChangeVerification.mockResolvedValue(true)

        const callOrder: string[] = []
        mockPrismaVerificationToken.updateMany.mockImplementation(() => {
          callOrder.push('updateMany')
          return Promise.resolve({ count: 1 })
        })
        mockPrismaVerificationToken.create.mockImplementation(() => {
          callOrder.push('create')
          return Promise.resolve(baseVerificationToken)
        })

        await requestEmailChange('new@example.com')

        expect(callOrder).toEqual(['updateMany', 'create'])
        expect(mockPrismaVerificationToken.updateMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              userId: mockSession.userId,
              type: 'email_change',
              usedAt: null,
            },
            data: {
              usedAt: expect.any(Date),
            },
          }),
        )
      })
    })

    describe('failure cases', () => {
      it('should return error if email is already in use', async () => {
        const { requestEmailChange } = await import('@/actions/email')

        // Email is already in use by another user
        mockPrismaUser.findUnique.mockResolvedValueOnce({ id: 'other-user-456' })

        const result = await requestEmailChange('taken@example.com')

        expect(result.error).toBe('This email address is already in use.')
        expect(result.success).toBeUndefined()
        expect(mockPrismaVerificationToken.create).not.toHaveBeenCalled()
        expect(mockSendEmailChangeVerification).not.toHaveBeenCalled()
      })

      it('should return error if email service is not configured', async () => {
        const { requestEmailChange } = await import('@/actions/email')

        mockIsEmailConfigured.mockReturnValue(false)

        const result = await requestEmailChange('new@example.com')

        expect(result.error).toBe('Email service is not configured. Please contact support.')
        expect(result.success).toBeUndefined()
        expect(mockPrismaVerificationToken.create).not.toHaveBeenCalled()
        expect(mockSendEmailChangeVerification).not.toHaveBeenCalled()
      })

      it('should return error for invalid email format', async () => {
        const { requestEmailChange } = await import('@/actions/email')

        const result = await requestEmailChange('not-an-email')

        expect(result.error).toBe('Invalid email address.')
        expect(result.success).toBeUndefined()
      })

      it('should return error if trying to change to same email', async () => {
        const { requestEmailChange } = await import('@/actions/email')

        mockPrismaUser.findUnique
          .mockResolvedValueOnce(null) // Email not in use
          .mockResolvedValueOnce({ ...baseUser, email: 'same@example.com' }) // Current user with same email

        const result = await requestEmailChange('same@example.com')

        expect(result.error).toBe('This is already your current email address.')
      })

      it('should return error if email sending fails', async () => {
        const { requestEmailChange } = await import('@/actions/email')

        mockPrismaUser.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(baseUser)
        mockPrismaVerificationToken.updateMany.mockResolvedValue({ count: 0 })
        mockPrismaVerificationToken.create.mockResolvedValue(baseVerificationToken)
        mockSendEmailChangeVerification.mockResolvedValue(false)

        const result = await requestEmailChange('new@example.com')

        expect(result.error).toBe('Failed to send verification email. Please try again.')
      })

      it('should return error if user not found', async () => {
        const { requestEmailChange } = await import('@/actions/email')

        mockPrismaUser.findUnique
          .mockResolvedValueOnce(null) // Email not in use
          .mockResolvedValueOnce(null) // User not found

        const result = await requestEmailChange('new@example.com')

        expect(result.error).toBe('User not found.')
      })

      it('should return generic error on unexpected exception', async () => {
        const { requestEmailChange } = await import('@/actions/email')

        mockPrismaUser.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(baseUser)
        mockPrismaVerificationToken.updateMany.mockRejectedValue(new Error('Unexpected error'))

        const result = await requestEmailChange('new@example.com')

        expect(result.error).toBe('An error occurred. Please try again.')
      })

      it('should return error when auth fails', async () => {
        const { requestEmailChange } = await import('@/actions/email')

        mockWithAuth.mockRejectedValue(new Error('Unauthorized'))

        const result = await requestEmailChange('new@example.com')

        expect(result.error).toBe('Unauthorized')
      })
    })
  })

  // ==========================================================================
  // VERIFY EMAIL CHANGE TESTS
  // ==========================================================================

  describe('verifyEmailChange', () => {
    describe('success case', () => {
      it('should update user email and mark token as used', async () => {
        const { verifyEmailChange } = await import('@/actions/email')

        mockPrismaVerificationToken.findUnique.mockResolvedValue(baseVerificationToken)
        mockPrismaUser.findUnique.mockResolvedValue(null) // Email not taken
        mockPrismaTransaction.mockResolvedValue([{}, {}])

        const result = await verifyEmailChange('valid-plaintext-token')

        expect(result.success).toBe(true)
        expect(result.error).toBeUndefined()
        expect(mockPrismaTransaction).toHaveBeenCalledWith(expect.any(Array))
      })
    })

    describe('failure cases', () => {
      it('should return error for invalid token', async () => {
        const { verifyEmailChange } = await import('@/actions/email')

        mockPrismaVerificationToken.findUnique.mockResolvedValue(null)

        const result = await verifyEmailChange('invalid-token')

        expect(result.error).toBe('Invalid or expired verification link.')
        expect(result.success).toBeUndefined()
      })

      it('should return error for expired token', async () => {
        const { verifyEmailChange } = await import('@/actions/email')

        const expiredToken = {
          ...baseVerificationToken,
          expiresAt: new Date(Date.now() - 60000), // Expired 1 minute ago
        }
        mockPrismaVerificationToken.findUnique.mockResolvedValue(expiredToken)

        const result = await verifyEmailChange('expired-token')

        expect(result.error).toBe('This verification link has expired. Please request a new one.')
        expect(result.success).toBeUndefined()
      })

      it('should return error for already used token', async () => {
        const { verifyEmailChange } = await import('@/actions/email')

        const usedToken = {
          ...baseVerificationToken,
          usedAt: new Date(), // Already used
        }
        mockPrismaVerificationToken.findUnique.mockResolvedValue(usedToken)

        const result = await verifyEmailChange('used-token')

        expect(result.error).toBe('This verification link has already been used.')
        expect(result.success).toBeUndefined()
      })

      it('should return error for wrong token type', async () => {
        const { verifyEmailChange } = await import('@/actions/email')

        const wrongTypeToken = {
          ...baseVerificationToken,
          type: 'password_reset',
        }
        mockPrismaVerificationToken.findUnique.mockResolvedValue(wrongTypeToken)

        const result = await verifyEmailChange('wrong-type-token')

        expect(result.error).toBe('Invalid verification link.')
        expect(result.success).toBeUndefined()
      })

      it('should return error when token has no payload', async () => {
        const { verifyEmailChange } = await import('@/actions/email')

        const noPayloadToken = {
          ...baseVerificationToken,
          payload: null,
        }
        mockPrismaVerificationToken.findUnique.mockResolvedValue(noPayloadToken)

        const result = await verifyEmailChange('no-payload-token')

        expect(result.error).toBe('Invalid verification data.')
        expect(result.success).toBeUndefined()
      })

      it('should handle race condition P2002 error if email taken meanwhile', async () => {
        const { verifyEmailChange } = await import('@/actions/email')

        mockPrismaVerificationToken.findUnique.mockResolvedValue(baseVerificationToken)
        mockPrismaUser.findUnique.mockResolvedValue(null) // Email was available during check

        // Simulate P2002 unique constraint violation during transaction
        const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: '5.0.0',
        })
        mockPrismaTransaction.mockRejectedValue(prismaError)

        const result = await verifyEmailChange('valid-token')

        expect(result.error).toBe('This email address is no longer available.')
        expect(result.success).toBeUndefined()
      })

      it('should return error when email became unavailable before transaction', async () => {
        const { verifyEmailChange } = await import('@/actions/email')

        mockPrismaVerificationToken.findUnique.mockResolvedValue(baseVerificationToken)
        // Another user now has this email
        mockPrismaUser.findUnique.mockResolvedValue({ id: 'other-user-456' })

        const result = await verifyEmailChange('valid-token')

        expect(result.error).toBe('This email address is no longer available.')
        expect(result.success).toBeUndefined()
      })

      it('should return generic error for other exceptions', async () => {
        const { verifyEmailChange } = await import('@/actions/email')

        mockPrismaVerificationToken.findUnique.mockResolvedValue(baseVerificationToken)
        mockPrismaUser.findUnique.mockResolvedValue(null)
        mockPrismaTransaction.mockRejectedValue(new Error('Database connection failed'))

        const result = await verifyEmailChange('valid-token')

        expect(result.error).toBe('An error occurred. Please try again.')
        expect(result.success).toBeUndefined()
      })
    })
  })
})
