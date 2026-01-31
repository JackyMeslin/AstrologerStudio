/**
 * Unit Tests for Registration Actions
 *
 * Tests the user registration server actions including registerUser,
 * verifyAccount, and resendVerificationEmail.
 *
 * @module src/actions/registration
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// ============================================================================
// MOCKS
// ============================================================================

// Mock prisma
const mockPrismaUser = {
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  delete: vi.fn(),
  update: vi.fn(),
}
const mockPrismaVerificationToken = {
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
}
const mockPrismaTransaction = vi.fn()

/**
 * Creates a transaction client that delegates to the mock functions.
 * Used for interactive transactions (callback style).
 */
const createMockTransactionClient = () => ({
  user: {
    create: mockPrismaUser.create,
    findFirst: mockPrismaUser.findFirst,
    findUnique: mockPrismaUser.findUnique,
    delete: mockPrismaUser.delete,
    update: mockPrismaUser.update,
  },
  verificationToken: {
    create: mockPrismaVerificationToken.create,
    findFirst: mockPrismaVerificationToken.findFirst,
    findUnique: mockPrismaVerificationToken.findUnique,
    delete: mockPrismaVerificationToken.delete,
    deleteMany: mockPrismaVerificationToken.deleteMany,
    update: mockPrismaVerificationToken.update,
    updateMany: mockPrismaVerificationToken.updateMany,
  },
})

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      get findFirst() {
        return mockPrismaUser.findFirst
      },
      get findUnique() {
        return mockPrismaUser.findUnique
      },
      get create() {
        return mockPrismaUser.create
      },
      get delete() {
        return mockPrismaUser.delete
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
      get delete() {
        return mockPrismaVerificationToken.delete
      },
      get deleteMany() {
        return mockPrismaVerificationToken.deleteMany
      },
      get update() {
        return mockPrismaVerificationToken.update
      },
      get updateMany() {
        return mockPrismaVerificationToken.updateMany
      },
    },
    $transaction: async (args: unknown) => {
      // Handle both array transactions and interactive (callback) transactions
      if (typeof args === 'function') {
        // Interactive transaction: call the callback with mock tx client
        const txClient = createMockTransactionClient()
        return args(txClient)
      }
      // Array transaction: delegate to mockPrismaTransaction
      return mockPrismaTransaction(args)
    },
  },
}))

// Mock recaptcha
const mockVerifyRecaptcha = vi.fn()
vi.mock('@/lib/security/recaptcha', () => ({
  verifyRecaptcha: (token: string) => mockVerifyRecaptcha(token),
}))

// Mock rate limiting
const mockCheckRateLimit = vi.fn()
const mockGetClientIp = vi.fn()

vi.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
  getClientIp: (headers: unknown) => mockGetClientIp(headers),
  RATE_LIMITS: {
    ip: { windowMs: 60000, max: 10 },
    user: { windowMs: 60000, max: 5 },
  },
}))

// Mock bcryptjs
const mockBcryptHash = vi.fn()

vi.mock('bcryptjs', () => ({
  default: {
    hash: (...args: unknown[]) => mockBcryptHash(...args),
  },
  hash: (...args: unknown[]) => mockBcryptHash(...args),
}))

// Mock next/headers
const mockHeaders = vi.fn()
vi.mock('next/headers', () => ({
  headers: () => mockHeaders(),
}))

// Mock mail
const mockSendAccountVerificationEmail = vi.fn()
const mockIsEmailConfigured = vi.fn()
const mockSendNewUserEmailNotification = vi.fn()

vi.mock('@/lib/mail/mail', () => ({
  sendAccountVerificationEmail: (...args: unknown[]) => mockSendAccountVerificationEmail(...args),
  isEmailConfigured: () => mockIsEmailConfigured(),
  sendNewUserEmailNotification: (...args: unknown[]) => mockSendNewUserEmailNotification(...args),
}))

// Mock logger
vi.mock('@/lib/logging/server', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock Slack notifications
vi.mock('@/lib/logging/slack', () => ({
  sendNewUserNotification: vi.fn().mockResolvedValue(undefined),
}))

// Mock trial config
vi.mock('@/lib/config/trial', () => ({
  calculateTrialEndDate: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
}))

// Mock legal config
vi.mock('@/lib/config/legal', () => ({
  LEGAL_VERSIONS: {
    terms: '2024-01-01',
    privacy: '2024-01-01',
  },
}))

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Valid registration data for tests
 */
const validRegistrationData = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'TestPass123!',
  recaptchaToken: 'valid-token',
}

/**
 * Base user object for tests
 */
const baseCreatedUser = {
  id: 'user-123',
  username: 'testuser',
  email: 'test@example.com',
  password: 'hashed-password',
  emailVerified: null,
}

/**
 * Sets up common success path mocks for registration
 */
function setupSuccessfulRegistrationMocks() {
  mockHeaders.mockResolvedValue(new Headers())
  mockGetClientIp.mockReturnValue('127.0.0.1')
  mockCheckRateLimit.mockReturnValue({ success: true })
  mockVerifyRecaptcha.mockResolvedValue(true)
  mockIsEmailConfigured.mockReturnValue(true)
  mockPrismaUser.findFirst.mockResolvedValue(null) // No existing user
  mockBcryptHash.mockResolvedValue('hashed-password')
  mockPrismaUser.create.mockResolvedValue(baseCreatedUser)
  mockPrismaVerificationToken.create.mockResolvedValue({})
  mockSendAccountVerificationEmail.mockResolvedValue(true)
}

// ============================================================================
// TESTS
// ============================================================================

describe('Registration Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset common mocks to defaults
    mockHeaders.mockResolvedValue(new Headers())
    mockGetClientIp.mockReturnValue('127.0.0.1')
    mockCheckRateLimit.mockReturnValue({ success: true })
    mockVerifyRecaptcha.mockResolvedValue(true)
    mockIsEmailConfigured.mockReturnValue(true)
    mockPrismaTransaction.mockResolvedValue([{}, {}])
  })

  // ==========================================================================
  // REGISTER USER TESTS
  // ==========================================================================

  describe('registerUser', () => {
    describe('password hashing', () => {
      it('should create user with password hashed using bcrypt', async () => {
        process.env.NEXT_PUBLIC_ENABLE_EMAIL_REGISTRATION = 'true'
        setupSuccessfulRegistrationMocks()

        const { registerUser } = await import('@/actions/registration')
        await registerUser(validRegistrationData)

        expect(mockBcryptHash).toHaveBeenCalledWith('TestPass123!', 12)
        expect(mockPrismaUser.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              password: 'hashed-password',
            }),
          }),
        )
      })
    })

    describe('token creation and email sending', () => {
      it('should create verification token and send email on successful registration', async () => {
        setupSuccessfulRegistrationMocks()

        const { registerUser } = await import('@/actions/registration')
        const result = await registerUser(validRegistrationData)

        expect(result.success).toBe(true)
        expect(mockPrismaVerificationToken.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              type: 'account_verification',
              userId: 'user-123',
            }),
          }),
        )
        expect(mockSendAccountVerificationEmail).toHaveBeenCalledWith(
          'test@example.com',
          expect.any(String),
          'testuser',
        )
      })
    })

    describe('duplicate username', () => {
      it('should return error when username already exists', async () => {
        setupSuccessfulRegistrationMocks()
        mockPrismaUser.findFirst.mockResolvedValue({
          username: 'testuser',
          email: 'other@example.com',
        })

        const { registerUser } = await import('@/actions/registration')
        const result = await registerUser(validRegistrationData)

        expect(result.error).toBe('This username is already taken.')
        expect(mockPrismaUser.create).not.toHaveBeenCalled()
      })
    })

    describe('duplicate email', () => {
      it('should return error when email already exists', async () => {
        setupSuccessfulRegistrationMocks()
        mockPrismaUser.findFirst.mockResolvedValue({
          username: 'otheruser',
          email: 'test@example.com',
        })

        const { registerUser } = await import('@/actions/registration')
        const result = await registerUser(validRegistrationData)

        expect(result.error).toBe('This email is already registered.')
        expect(mockPrismaUser.create).not.toHaveBeenCalled()
      })
    })

    describe('email registration disabled', () => {
      it('should return error when email registration is disabled', async () => {
        // Override isEmailRegistrationEnabled by setting env
        const originalEnv = process.env.NEXT_PUBLIC_ENABLE_EMAIL_REGISTRATION
        process.env.NEXT_PUBLIC_ENABLE_EMAIL_REGISTRATION = 'false'

        setupSuccessfulRegistrationMocks()

        const { registerUser } = await import('@/actions/registration')
        const result = await registerUser(validRegistrationData)

        expect(result.error).toBe('Email registration is currently disabled.')
        expect(mockPrismaUser.create).not.toHaveBeenCalled()

        // Restore env
        process.env.NEXT_PUBLIC_ENABLE_EMAIL_REGISTRATION = originalEnv
      })
    })

    describe('rate limit exceeded', () => {
      it('should return error when rate limit is exceeded', async () => {
        process.env.NEXT_PUBLIC_ENABLE_EMAIL_REGISTRATION = 'true'
        setupSuccessfulRegistrationMocks()
        mockCheckRateLimit.mockReturnValue({ success: false })

        const { registerUser } = await import('@/actions/registration')
        const result = await registerUser(validRegistrationData)

        expect(result.error).toBe('Too many registration attempts from this IP. Please try again later.')
        expect(mockPrismaUser.create).not.toHaveBeenCalled()
      })
    })

    describe('email sending failure rollback', () => {
      it('should delete user if email sending fails', async () => {
        process.env.NEXT_PUBLIC_ENABLE_EMAIL_REGISTRATION = 'true'
        setupSuccessfulRegistrationMocks()
        mockSendAccountVerificationEmail.mockResolvedValue(false)

        const { registerUser } = await import('@/actions/registration')
        const result = await registerUser(validRegistrationData)

        expect(result.error).toBe('Failed to send verification email. Please try again.')
        expect(mockPrismaUser.delete).toHaveBeenCalledWith({ where: { id: 'user-123' } })
      })
    })

    describe('atomic transaction for user and token creation', () => {
      it('should create user and token atomically in a transaction', async () => {
        process.env.NEXT_PUBLIC_ENABLE_EMAIL_REGISTRATION = 'true'
        setupSuccessfulRegistrationMocks()

        const { registerUser } = await import('@/actions/registration')
        const result = await registerUser(validRegistrationData)

        expect(result.success).toBe(true)
        // Both user and token should be created via the transaction
        expect(mockPrismaUser.create).toHaveBeenCalled()
        expect(mockPrismaVerificationToken.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              type: 'account_verification',
              userId: 'user-123',
            }),
          }),
        )
      })

      it('should rollback user creation if token creation fails inside transaction', async () => {
        process.env.NEXT_PUBLIC_ENABLE_EMAIL_REGISTRATION = 'true'
        setupSuccessfulRegistrationMocks()
        // Simulate token creation failure inside transaction
        mockPrismaVerificationToken.create.mockRejectedValue(new Error('Token creation failed'))

        const { registerUser } = await import('@/actions/registration')
        const result = await registerUser(validRegistrationData)

        // Should return error and NOT have successfully created user (transaction rolled back)
        expect(result.error).toBe('An error occurred during registration. Please try again.')
        // Email should NOT be sent since transaction failed
        expect(mockSendAccountVerificationEmail).not.toHaveBeenCalled()
      })
    })

    describe('validation', () => {
      it('should return error for invalid email', async () => {
        process.env.NEXT_PUBLIC_ENABLE_EMAIL_REGISTRATION = 'true'
        setupSuccessfulRegistrationMocks()

        const { registerUser } = await import('@/actions/registration')
        const result = await registerUser({
          ...validRegistrationData,
          email: 'invalid-email',
        })

        expect(result.error).toBe('Invalid email address')
      })

      it('should return error for short username', async () => {
        process.env.NEXT_PUBLIC_ENABLE_EMAIL_REGISTRATION = 'true'
        setupSuccessfulRegistrationMocks()

        const { registerUser } = await import('@/actions/registration')
        const result = await registerUser({
          ...validRegistrationData,
          username: 'ab',
        })

        expect(result.error).toBe('Username must be at least 3 characters')
      })

      it('should return error for weak password', async () => {
        process.env.NEXT_PUBLIC_ENABLE_EMAIL_REGISTRATION = 'true'
        setupSuccessfulRegistrationMocks()

        const { registerUser } = await import('@/actions/registration')
        const result = await registerUser({
          ...validRegistrationData,
          password: 'weak',
        })

        expect(result.error).toContain('Password must be at least 8 characters')
      })

      it('should return error when recaptcha fails', async () => {
        process.env.NEXT_PUBLIC_ENABLE_EMAIL_REGISTRATION = 'true'
        setupSuccessfulRegistrationMocks()
        mockVerifyRecaptcha.mockResolvedValue(false)

        const { registerUser } = await import('@/actions/registration')
        const result = await registerUser(validRegistrationData)

        expect(result.error).toBe('reCAPTCHA verification failed. Please try again.')
      })

      it('should return error when email service is not configured', async () => {
        process.env.NEXT_PUBLIC_ENABLE_EMAIL_REGISTRATION = 'true'
        setupSuccessfulRegistrationMocks()
        mockIsEmailConfigured.mockReturnValue(false)

        const { registerUser } = await import('@/actions/registration')
        const result = await registerUser(validRegistrationData)

        expect(result.error).toBe('Email service is not configured. Please contact support.')
      })
    })
  })

  // ==========================================================================
  // VERIFY ACCOUNT TESTS
  // ==========================================================================

  describe('verifyAccount', () => {
    describe('successful verification', () => {
      it('should set emailVerified to true and delete token', async () => {
        const futureDate = new Date(Date.now() + 60000)
        mockPrismaVerificationToken.findUnique.mockResolvedValue({
          id: 'token-123',
          token: 'hashed-token',
          type: 'account_verification',
          userId: 'user-123',
          usedAt: null,
          expiresAt: futureDate,
        })

        const { verifyAccount } = await import('@/actions/registration')
        const result = await verifyAccount('valid-token')

        expect(result.success).toBe(true)
        expect(mockPrismaTransaction).toHaveBeenCalledWith(expect.any(Array))
      })
    })

    describe('expired token', () => {
      it('should return error for expired token', async () => {
        const pastDate = new Date(Date.now() - 60000)
        mockPrismaVerificationToken.findUnique.mockResolvedValue({
          id: 'token-123',
          token: 'hashed-token',
          type: 'account_verification',
          userId: 'user-123',
          usedAt: null,
          expiresAt: pastDate,
        })

        const { verifyAccount } = await import('@/actions/registration')
        const result = await verifyAccount('expired-token')

        expect(result.error).toContain('expired')
      })
    })

    describe('wrong token type', () => {
      it('should return error for token with different type', async () => {
        const futureDate = new Date(Date.now() + 60000)
        mockPrismaVerificationToken.findUnique.mockResolvedValue({
          id: 'token-123',
          token: 'hashed-token',
          type: 'password_reset',
          userId: 'user-123',
          usedAt: null,
          expiresAt: futureDate,
        })

        const { verifyAccount } = await import('@/actions/registration')
        const result = await verifyAccount('wrong-type-token')

        expect(result.error).toBe('Invalid verification link.')
      })
    })

    describe('invalid token', () => {
      it('should return error for non-existent token', async () => {
        mockPrismaVerificationToken.findUnique.mockResolvedValue(null)

        const { verifyAccount } = await import('@/actions/registration')
        const result = await verifyAccount('invalid-token')

        expect(result.error).toBe('Invalid or expired verification link.')
      })
    })

    describe('already used token', () => {
      it('should return error for already used token', async () => {
        const futureDate = new Date(Date.now() + 60000)
        mockPrismaVerificationToken.findUnique.mockResolvedValue({
          id: 'token-123',
          token: 'hashed-token',
          type: 'account_verification',
          userId: 'user-123',
          usedAt: new Date(),
          expiresAt: futureDate,
        })

        const { verifyAccount } = await import('@/actions/registration')
        const result = await verifyAccount('used-token')

        expect(result.error).toBe('This verification link has already been used.')
      })
    })
  })

  // ==========================================================================
  // RESEND VERIFICATION EMAIL TESTS
  // ==========================================================================

  describe('resendVerificationEmail', () => {
    describe('anti-enumeration', () => {
      it('should return success for non-existent user (anti-enumeration)', async () => {
        mockPrismaUser.findUnique.mockResolvedValue(null)

        const { resendVerificationEmail } = await import('@/actions/registration')
        const result = await resendVerificationEmail('nonexistent@example.com', 'valid-token')

        expect(result.success).toBe(true)
        expect(mockSendAccountVerificationEmail).not.toHaveBeenCalled()
      })

      it('should return success for already verified user (anti-enumeration)', async () => {
        mockPrismaUser.findUnique.mockResolvedValue({
          id: 'user-123',
          username: 'testuser',
        })
        // No pending verification token means user is already verified
        mockPrismaVerificationToken.findFirst.mockResolvedValue(null)

        const { resendVerificationEmail } = await import('@/actions/registration')
        const result = await resendVerificationEmail('verified@example.com', 'valid-token')

        expect(result.success).toBe(true)
        // Should not create new token for already verified user
        expect(mockPrismaVerificationToken.create).not.toHaveBeenCalled()
      })
    })

    describe('successful resend', () => {
      it('should invalidate old tokens and create new one', async () => {
        mockPrismaUser.findUnique.mockResolvedValue({
          id: 'user-123',
          username: 'testuser',
        })
        mockPrismaVerificationToken.findFirst.mockResolvedValue({
          id: 'old-token',
          userId: 'user-123',
        })
        mockPrismaVerificationToken.updateMany.mockResolvedValue({})
        mockPrismaVerificationToken.create.mockResolvedValue({})
        mockSendAccountVerificationEmail.mockResolvedValue(true)

        const { resendVerificationEmail } = await import('@/actions/registration')
        const result = await resendVerificationEmail('test@example.com', 'valid-token')

        expect(result.success).toBe(true)
        expect(mockPrismaVerificationToken.updateMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: {
              userId: 'user-123',
              type: 'account_verification',
              usedAt: null,
            },
          }),
        )
        expect(mockPrismaVerificationToken.create).toHaveBeenCalled()
        expect(mockSendAccountVerificationEmail).toHaveBeenCalled()
      })
    })

    describe('validation', () => {
      it('should return error when recaptcha fails', async () => {
        mockVerifyRecaptcha.mockResolvedValue(false)

        const { resendVerificationEmail } = await import('@/actions/registration')
        const result = await resendVerificationEmail('test@example.com', 'invalid-token')

        expect(result.error).toBe('reCAPTCHA verification failed. Please try again.')
      })

      it('should return error when email service is not configured', async () => {
        mockIsEmailConfigured.mockReturnValue(false)

        const { resendVerificationEmail } = await import('@/actions/registration')
        const result = await resendVerificationEmail('test@example.com', 'valid-token')

        expect(result.error).toBe('Email service is not configured.')
      })

      it('should return error when database operation fails', async () => {
        mockPrismaUser.findUnique.mockResolvedValue({
          id: 'user-123',
          username: 'testuser',
        })
        mockPrismaVerificationToken.findFirst.mockResolvedValue({
          id: 'old-token',
          userId: 'user-123',
        })
        mockPrismaVerificationToken.updateMany.mockRejectedValue(new Error('Database error'))

        const { resendVerificationEmail } = await import('@/actions/registration')
        const result = await resendVerificationEmail('test@example.com', 'valid-token')

        expect(result.error).toBe('An error occurred. Please try again.')
      })
    })
  })

  // ==========================================================================
  // VERIFY ACCOUNT ERROR HANDLING TESTS
  // ==========================================================================

  describe('verifyAccount error handling', () => {
    it('should return error when database transaction fails', async () => {
      const futureDate = new Date(Date.now() + 60000)
      mockPrismaVerificationToken.findUnique.mockResolvedValue({
        id: 'token-123',
        token: 'hashed-token',
        type: 'account_verification',
        userId: 'user-123',
        usedAt: null,
        expiresAt: futureDate,
      })
      mockPrismaTransaction.mockRejectedValue(new Error('Database transaction failed'))

      const { verifyAccount } = await import('@/actions/registration')
      const result = await verifyAccount('valid-token')

      expect(result.error).toBe('An error occurred. Please try again.')
    })
  })
})
