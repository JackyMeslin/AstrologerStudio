/**
 * Unit Tests for Account Deletion Actions
 *
 * Tests the account deletion server actions including requestAccountDeletion
 * and verifyAccountDeletion.
 *
 * @module src/actions/account-deletion
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// ============================================================================
// MOCKS
// ============================================================================

// Mock prisma
const mockPrismaUser = {
  findUnique: vi.fn(),
  delete: vi.fn(),
}
const mockPrismaVerificationToken = {
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  deleteMany: vi.fn(),
}
const mockPrismaTransaction = vi.fn()

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      get findUnique() {
        return mockPrismaUser.findUnique
      },
      get delete() {
        return mockPrismaUser.delete
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
      get deleteMany() {
        return mockPrismaVerificationToken.deleteMany
      },
    },
    $transaction: (args: unknown) => mockPrismaTransaction(args),
  },
}))

// Mock session
const mockDeleteSession = vi.fn()

vi.mock('@/lib/security/session', () => ({
  deleteSession: () => mockDeleteSession(),
}))

// Mock auth helper (withAuth)
const mockWithAuth = vi.fn()
vi.mock('@/lib/security/auth', () => ({
  withAuth: (fn: (session: { userId: string; username: string }) => Promise<unknown>) => mockWithAuth(fn),
}))

// Mock mail
const mockSendAccountDeletionConfirmation = vi.fn()
const mockIsEmailConfigured = vi.fn()

vi.mock('@/lib/mail/mail', () => ({
  sendAccountDeletionConfirmation: (...args: unknown[]) => mockSendAccountDeletionConfirmation(...args),
  isEmailConfigured: () => mockIsEmailConfigured(),
}))

// Mock logger
vi.mock('@/lib/logging/server', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock cancelSubscription from Dodo Payments
const mockCancelSubscription = vi.fn()
vi.mock('@/dodopayments/lib/server', () => ({
  cancelSubscription: (...args: unknown[]) => mockCancelSubscription(...args),
}))

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Base user object for tests
 */
const baseUser = {
  id: 'user-123',
  username: 'testuser',
  email: 'test@example.com',
  subscriptionId: null,
  subscriptionPlan: 'free',
}

/**
 * Mock session for authenticated tests
 */
const mockSession = { userId: 'user-123', username: 'testuser' }

// ============================================================================
// TESTS
// ============================================================================

describe('Account Deletion Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset common mocks to defaults
    mockIsEmailConfigured.mockReturnValue(true)
    mockPrismaTransaction.mockResolvedValue([{}, {}, {}])
    mockDeleteSession.mockResolvedValue(undefined)

    // Default withAuth implementation - execute the function with mock session
    mockWithAuth.mockImplementation(async (fn: (session: { userId: string; username: string }) => Promise<unknown>) => {
      return fn(mockSession)
    })
  })

  // ==========================================================================
  // REQUEST ACCOUNT DELETION TESTS
  // ==========================================================================

  describe('requestAccountDeletion', () => {
    describe('success case', () => {
      it('should create token with 1-hour expiry and send email', async () => {
        mockPrismaUser.findUnique.mockResolvedValue(baseUser)
        mockPrismaVerificationToken.updateMany.mockResolvedValue({})
        mockPrismaVerificationToken.create.mockResolvedValue({})
        mockSendAccountDeletionConfirmation.mockResolvedValue(true)

        const { requestAccountDeletion } = await import('@/actions/account-deletion')
        const result = await requestAccountDeletion()

        expect(result.success).toBe(true)

        // Verify token creation with 1 hour expiry
        expect(mockPrismaVerificationToken.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              type: 'account_deletion',
              userId: mockSession.userId,
              expiresAt: expect.any(Date),
            }),
          }),
        )

        // Verify expiry is approximately 1 hour from now
        const createCall = mockPrismaVerificationToken.create.mock.calls[0]?.[0] as {
          data: { expiresAt: Date }
        }
        expect(createCall).toBeDefined()
        const expiryTime = createCall.data.expiresAt.getTime()
        const expectedExpiry = Date.now() + 60 * 60 * 1000
        // Allow 5 second tolerance for test execution time
        expect(Math.abs(expiryTime - expectedExpiry)).toBeLessThan(5000)

        // Verify email was sent
        expect(mockSendAccountDeletionConfirmation).toHaveBeenCalledWith(
          'test@example.com',
          expect.any(String), // token
          'testuser',
        )
      })
    })

    describe('user without email', () => {
      it('should return error when user has no email', async () => {
        mockPrismaUser.findUnique.mockResolvedValue({
          ...baseUser,
          email: null,
        })

        const { requestAccountDeletion } = await import('@/actions/account-deletion')
        const result = await requestAccountDeletion()

        expect(result.error).toBe('No email address associated with your account. Please add an email first.')
        expect(mockPrismaVerificationToken.create).not.toHaveBeenCalled()
        expect(mockSendAccountDeletionConfirmation).not.toHaveBeenCalled()
      })
    })

    describe('invalidation of previous tokens', () => {
      it('should invalidate previous deletion tokens before creating new one', async () => {
        mockPrismaUser.findUnique.mockResolvedValue(baseUser)
        mockPrismaVerificationToken.updateMany.mockResolvedValue({})
        mockPrismaVerificationToken.create.mockResolvedValue({})
        mockSendAccountDeletionConfirmation.mockResolvedValue(true)

        const { requestAccountDeletion } = await import('@/actions/account-deletion')
        await requestAccountDeletion()

        // Verify previous tokens are invalidated
        expect(mockPrismaVerificationToken.updateMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              userId: mockSession.userId,
              type: 'account_deletion',
              usedAt: null,
            },
            data: {
              usedAt: expect.any(Date),
            },
          }),
        )

        // Verify updateMany is called before create
        const updateManyOrder = mockPrismaVerificationToken.updateMany.mock.invocationCallOrder[0]
        const createOrder = mockPrismaVerificationToken.create.mock.invocationCallOrder[0]
        expect(updateManyOrder).toBeDefined()
        expect(createOrder).toBeDefined()
        expect(updateManyOrder!).toBeLessThan(createOrder!)
      })
    })

    describe('user not found', () => {
      it('should return error when user is not found', async () => {
        mockPrismaUser.findUnique.mockResolvedValue(null)

        const { requestAccountDeletion } = await import('@/actions/account-deletion')
        const result = await requestAccountDeletion()

        expect(result.error).toBe('User not found.')
      })
    })

    describe('email not configured', () => {
      it('should return error when email service is not configured', async () => {
        mockIsEmailConfigured.mockReturnValue(false)

        const { requestAccountDeletion } = await import('@/actions/account-deletion')
        const result = await requestAccountDeletion()

        expect(result.error).toBe('Email service is not configured. Please contact support.')
      })
    })

    describe('email sending failure', () => {
      it('should return error when email sending fails', async () => {
        mockPrismaUser.findUnique.mockResolvedValue(baseUser)
        mockPrismaVerificationToken.updateMany.mockResolvedValue({})
        mockPrismaVerificationToken.create.mockResolvedValue({})
        mockSendAccountDeletionConfirmation.mockResolvedValue(false)

        const { requestAccountDeletion } = await import('@/actions/account-deletion')
        const result = await requestAccountDeletion()

        expect(result.error).toBe('Failed to send confirmation email. Please try again.')
      })
    })

    describe('unauthorized', () => {
      it('should return error when user is not authenticated', async () => {
        mockWithAuth.mockRejectedValue(new Error('Unauthorized'))

        const { requestAccountDeletion } = await import('@/actions/account-deletion')
        const result = await requestAccountDeletion()

        expect(result.error).toBe('Unauthorized')
      })
    })
  })

  // ==========================================================================
  // VERIFY ACCOUNT DELETION TESTS
  // ==========================================================================

  describe('verifyAccountDeletion', () => {
    const validToken = {
      id: 'token-123',
      token: 'hashed-token', // This should match the hash of the input token
      type: 'account_deletion',
      userId: 'user-123',
      usedAt: null,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour in future
    }

    describe('successful deletion', () => {
      it('should delete user and all related data (cascade)', async () => {
        mockPrismaVerificationToken.findUnique.mockResolvedValue(validToken)
        mockPrismaUser.findUnique.mockResolvedValue({
          ...baseUser,
          subscriptionId: null,
          subscriptionPlan: 'free',
        })
        mockPrismaTransaction.mockResolvedValue([{}, {}, {}])
        mockDeleteSession.mockResolvedValue(undefined)

        const { verifyAccountDeletion } = await import('@/actions/account-deletion')
        const result = await verifyAccountDeletion('valid-token')

        expect(result.success).toBe(true)

        // Verify transaction contains: mark token used, delete tokens, delete user
        expect(mockPrismaTransaction).toHaveBeenCalledWith(expect.any(Array))

        // Verify session is invalidated
        expect(mockDeleteSession).toHaveBeenCalled()
      })
    })

    describe('subscription cancellation with Dodo Payments', () => {
      it('should attempt to cancel Dodo subscription if active', async () => {
        mockPrismaVerificationToken.findUnique.mockResolvedValue(validToken)
        mockPrismaUser.findUnique.mockResolvedValue({
          ...baseUser,
          subscriptionId: 'sub_123456',
          subscriptionPlan: 'pro', // Not free or lifetime
        })
        mockCancelSubscription.mockResolvedValue({ success: true })
        mockPrismaTransaction.mockResolvedValue([{}, {}, {}])
        mockDeleteSession.mockResolvedValue(undefined)

        const { verifyAccountDeletion } = await import('@/actions/account-deletion')
        const result = await verifyAccountDeletion('valid-token')

        expect(result.success).toBe(true)
        expect(mockCancelSubscription).toHaveBeenCalledWith('sub_123456')
      })

      it('should continue deletion even if Dodo subscription cancellation fails', async () => {
        mockPrismaVerificationToken.findUnique.mockResolvedValue(validToken)
        mockPrismaUser.findUnique.mockResolvedValue({
          ...baseUser,
          subscriptionId: 'sub_123456',
          subscriptionPlan: 'pro',
        })
        mockCancelSubscription.mockResolvedValue({
          success: false,
          error: 'Subscription not found',
        })
        mockPrismaTransaction.mockResolvedValue([{}, {}, {}])
        mockDeleteSession.mockResolvedValue(undefined)

        const { verifyAccountDeletion } = await import('@/actions/account-deletion')
        const result = await verifyAccountDeletion('valid-token')

        // Deletion should still succeed
        expect(result.success).toBe(true)
        expect(mockPrismaTransaction).toHaveBeenCalled()
        expect(mockDeleteSession).toHaveBeenCalled()
      })

      it('should continue deletion even if Dodo module throws an error', async () => {
        mockPrismaVerificationToken.findUnique.mockResolvedValue(validToken)
        mockPrismaUser.findUnique.mockResolvedValue({
          ...baseUser,
          subscriptionId: 'sub_123456',
          subscriptionPlan: 'pro',
        })
        mockCancelSubscription.mockRejectedValue(new Error('Module not available'))
        mockPrismaTransaction.mockResolvedValue([{}, {}, {}])
        mockDeleteSession.mockResolvedValue(undefined)

        const { verifyAccountDeletion } = await import('@/actions/account-deletion')
        const result = await verifyAccountDeletion('valid-token')

        // Deletion should still succeed
        expect(result.success).toBe(true)
        expect(mockPrismaTransaction).toHaveBeenCalled()
      })

      it('should not attempt to cancel subscription for free plan', async () => {
        mockPrismaVerificationToken.findUnique.mockResolvedValue(validToken)
        mockPrismaUser.findUnique.mockResolvedValue({
          ...baseUser,
          subscriptionId: 'sub_123456',
          subscriptionPlan: 'free',
        })
        mockPrismaTransaction.mockResolvedValue([{}, {}, {}])
        mockDeleteSession.mockResolvedValue(undefined)

        const { verifyAccountDeletion } = await import('@/actions/account-deletion')
        await verifyAccountDeletion('valid-token')

        expect(mockCancelSubscription).not.toHaveBeenCalled()
      })

      it('should not attempt to cancel subscription for lifetime plan', async () => {
        mockPrismaVerificationToken.findUnique.mockResolvedValue(validToken)
        mockPrismaUser.findUnique.mockResolvedValue({
          ...baseUser,
          subscriptionId: 'sub_123456',
          subscriptionPlan: 'lifetime',
        })
        mockPrismaTransaction.mockResolvedValue([{}, {}, {}])
        mockDeleteSession.mockResolvedValue(undefined)

        const { verifyAccountDeletion } = await import('@/actions/account-deletion')
        await verifyAccountDeletion('valid-token')

        expect(mockCancelSubscription).not.toHaveBeenCalled()
      })
    })

    describe('expired token', () => {
      it('should reject expired token', async () => {
        const expiredToken = {
          ...validToken,
          expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour in past
        }
        mockPrismaVerificationToken.findUnique.mockResolvedValue(expiredToken)

        const { verifyAccountDeletion } = await import('@/actions/account-deletion')
        const result = await verifyAccountDeletion('expired-token')

        expect(result.error).toBe('This confirmation link has expired. Please request a new one.')
        expect(mockPrismaUser.delete).not.toHaveBeenCalled()
        expect(mockPrismaTransaction).not.toHaveBeenCalled()
      })
    })

    describe('invalid token', () => {
      it('should reject non-existent token', async () => {
        mockPrismaVerificationToken.findUnique.mockResolvedValue(null)

        const { verifyAccountDeletion } = await import('@/actions/account-deletion')
        const result = await verifyAccountDeletion('invalid-token')

        expect(result.error).toBe('Invalid or expired confirmation link.')
      })
    })

    describe('wrong token type', () => {
      it('should reject token with wrong type', async () => {
        const wrongTypeToken = {
          ...validToken,
          type: 'password_reset',
        }
        mockPrismaVerificationToken.findUnique.mockResolvedValue(wrongTypeToken)

        const { verifyAccountDeletion } = await import('@/actions/account-deletion')
        const result = await verifyAccountDeletion('wrong-type-token')

        expect(result.error).toBe('Invalid confirmation link.')
      })
    })

    describe('already used token', () => {
      it('should reject already used token', async () => {
        const usedToken = {
          ...validToken,
          usedAt: new Date(),
        }
        mockPrismaVerificationToken.findUnique.mockResolvedValue(usedToken)

        const { verifyAccountDeletion } = await import('@/actions/account-deletion')
        const result = await verifyAccountDeletion('used-token')

        expect(result.error).toBe('This confirmation link has already been used.')
      })
    })

    describe('user not found', () => {
      it('should return error when user is not found', async () => {
        mockPrismaVerificationToken.findUnique.mockResolvedValue(validToken)
        mockPrismaUser.findUnique.mockResolvedValue(null)

        const { verifyAccountDeletion } = await import('@/actions/account-deletion')
        const result = await verifyAccountDeletion('valid-token')

        expect(result.error).toBe('User not found.')
      })
    })

    describe('error handling', () => {
      it('should return error when transaction fails', async () => {
        mockPrismaVerificationToken.findUnique.mockResolvedValue(validToken)
        mockPrismaUser.findUnique.mockResolvedValue({
          ...baseUser,
          subscriptionId: null,
          subscriptionPlan: 'free',
        })
        mockPrismaTransaction.mockRejectedValue(new Error('Database transaction failed'))

        const { verifyAccountDeletion } = await import('@/actions/account-deletion')
        const result = await verifyAccountDeletion('valid-token')

        expect(result.error).toBe('An error occurred. Please try again.')
        expect(mockDeleteSession).not.toHaveBeenCalled()
      })
    })
  })

  // ==========================================================================
  // GET PENDING ACCOUNT DELETION TESTS
  // ==========================================================================

  describe('getPendingAccountDeletion', () => {
    describe('success case', () => {
      it('should return expiration date when pending token exists', async () => {
        const futureDate = new Date(Date.now() + 60 * 60 * 1000)
        mockPrismaVerificationToken.findFirst.mockResolvedValue({
          expiresAt: futureDate,
        })

        const { getPendingAccountDeletion } = await import('@/actions/account-deletion')
        const result = await getPendingAccountDeletion()

        expect(result).toEqual({ expiresAt: futureDate })
        expect(mockPrismaVerificationToken.findFirst).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              userId: mockSession.userId,
              type: 'account_deletion',
              usedAt: null,
              expiresAt: { gt: expect.any(Date) },
            },
          }),
        )
      })
    })

    describe('no pending token', () => {
      it('should return null when no pending token exists', async () => {
        mockPrismaVerificationToken.findFirst.mockResolvedValue(null)

        const { getPendingAccountDeletion } = await import('@/actions/account-deletion')
        const result = await getPendingAccountDeletion()

        expect(result).toBeNull()
      })
    })

    describe('unauthorized', () => {
      it('should return null when user is not authenticated', async () => {
        mockWithAuth.mockRejectedValue(new Error('Unauthorized'))

        const { getPendingAccountDeletion } = await import('@/actions/account-deletion')
        const result = await getPendingAccountDeletion()

        expect(result).toBeNull()
      })
    })
  })

  // ==========================================================================
  // CANCEL ACCOUNT DELETION TESTS
  // ==========================================================================

  describe('cancelAccountDeletion', () => {
    describe('success case', () => {
      it('should mark all pending tokens as used', async () => {
        mockPrismaVerificationToken.updateMany.mockResolvedValue({ count: 1 })

        const { cancelAccountDeletion } = await import('@/actions/account-deletion')
        const result = await cancelAccountDeletion()

        expect(result.success).toBe(true)
        expect(mockPrismaVerificationToken.updateMany).toHaveBeenCalledWith({
          where: {
            userId: mockSession.userId,
            type: 'account_deletion',
            usedAt: null,
          },
          data: {
            usedAt: expect.any(Date),
          },
        })
      })

      it('should return success even with no pending tokens', async () => {
        mockPrismaVerificationToken.updateMany.mockResolvedValue({ count: 0 })

        const { cancelAccountDeletion } = await import('@/actions/account-deletion')
        const result = await cancelAccountDeletion()

        expect(result.success).toBe(true)
      })
    })

    describe('unauthorized', () => {
      it('should return Unauthorized when not authenticated', async () => {
        mockWithAuth.mockRejectedValue(new Error('Unauthorized'))

        const { cancelAccountDeletion } = await import('@/actions/account-deletion')
        const result = await cancelAccountDeletion()

        expect(result.error).toBe('Unauthorized')
        expect(result.success).toBe(false)
      })
    })

    describe('error handling', () => {
      it('should return error when database fails', async () => {
        mockPrismaVerificationToken.updateMany.mockRejectedValue(new Error('Database error'))

        const { cancelAccountDeletion } = await import('@/actions/account-deletion')
        const result = await cancelAccountDeletion()

        expect(result.error).toBe('An error occurred. Please try again.')
      })
    })
  })

  // ==========================================================================
  // VALIDATE DELETION TOKEN TESTS
  // ==========================================================================

  describe('validateDeletionToken', () => {
    const validToken = {
      id: 'token-123',
      token: 'hashed-token',
      type: 'account_deletion',
      userId: 'user-123',
      usedAt: null,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    }

    describe('valid token', () => {
      it('should return valid:true and username for valid token', async () => {
        mockPrismaVerificationToken.findUnique.mockResolvedValue(validToken)
        mockPrismaUser.findUnique.mockResolvedValue({ username: 'testuser' })

        const { validateDeletionToken } = await import('@/actions/account-deletion')
        const result = await validateDeletionToken('valid-token')

        expect(result.valid).toBe(true)
        expect(result.username).toBe('testuser')
        expect(result.error).toBeUndefined()
      })

      it('should return valid:true with undefined username if user not found', async () => {
        mockPrismaVerificationToken.findUnique.mockResolvedValue(validToken)
        mockPrismaUser.findUnique.mockResolvedValue(null)

        const { validateDeletionToken } = await import('@/actions/account-deletion')
        const result = await validateDeletionToken('valid-token')

        expect(result.valid).toBe(true)
        expect(result.username).toBeUndefined()
      })
    })

    describe('invalid token', () => {
      it('should return valid:false for non-existent token', async () => {
        mockPrismaVerificationToken.findUnique.mockResolvedValue(null)

        const { validateDeletionToken } = await import('@/actions/account-deletion')
        const result = await validateDeletionToken('invalid-token')

        expect(result.valid).toBe(false)
        expect(result.error).toBe('Invalid or expired confirmation link.')
      })

      it('should return valid:false for wrong token type', async () => {
        mockPrismaVerificationToken.findUnique.mockResolvedValue({
          ...validToken,
          type: 'password_reset',
        })

        const { validateDeletionToken } = await import('@/actions/account-deletion')
        const result = await validateDeletionToken('wrong-type-token')

        expect(result.valid).toBe(false)
        expect(result.error).toBe('Invalid confirmation link.')
      })

      it('should return valid:false for used token', async () => {
        mockPrismaVerificationToken.findUnique.mockResolvedValue({
          ...validToken,
          usedAt: new Date(),
        })

        const { validateDeletionToken } = await import('@/actions/account-deletion')
        const result = await validateDeletionToken('used-token')

        expect(result.valid).toBe(false)
        expect(result.error).toBe('This confirmation link has already been used.')
      })

      it('should return valid:false for expired token', async () => {
        mockPrismaVerificationToken.findUnique.mockResolvedValue({
          ...validToken,
          expiresAt: new Date(Date.now() - 60 * 60 * 1000),
        })

        const { validateDeletionToken } = await import('@/actions/account-deletion')
        const result = await validateDeletionToken('expired-token')

        expect(result.valid).toBe(false)
        expect(result.error).toBe('This confirmation link has expired. Please request a new one.')
      })
    })

    describe('error handling', () => {
      it('should return error on database failure', async () => {
        mockPrismaVerificationToken.findUnique.mockRejectedValue(new Error('Database error'))

        const { validateDeletionToken } = await import('@/actions/account-deletion')
        const result = await validateDeletionToken('any-token')

        expect(result.valid).toBe(false)
        expect(result.error).toBe('An error occurred. Please try again.')
      })
    })
  })

  // ==========================================================================
  // REQUEST ACCOUNT DELETION ERROR HANDLING
  // ==========================================================================

  describe('requestAccountDeletion error handling', () => {
    it('should return error when prisma throws during user lookup', async () => {
      mockPrismaUser.findUnique.mockRejectedValue(new Error('Database connection failed'))

      const { requestAccountDeletion } = await import('@/actions/account-deletion')
      const result = await requestAccountDeletion()

      expect(result.error).toBe('An error occurred. Please try again.')
    })

    it('should return error when prisma throws during token creation', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(baseUser)
      mockPrismaVerificationToken.updateMany.mockResolvedValue({})
      mockPrismaVerificationToken.create.mockRejectedValue(new Error('Unique constraint violation'))

      const { requestAccountDeletion } = await import('@/actions/account-deletion')
      const result = await requestAccountDeletion()

      expect(result.error).toBe('An error occurred. Please try again.')
    })
  })
})
