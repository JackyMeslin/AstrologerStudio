/**
 * Unit Tests for Admin Actions
 *
 * Tests admin authentication, user management, and statistics.
 * All database calls are mocked to prevent real DB queries.
 *
 * @module src/actions/admin
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// ============================================================================
// MOCKS - MUST BE DEFINED BEFORE IMPORTS
// ============================================================================

// Mock prisma - CRITICAL: This prevents any real database queries
const mockPrismaAdminUser = {
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}
const mockPrismaAdminAuditLog = {
  create: vi.fn(),
}
const mockPrismaAdminSession = {
  create: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
}
const mockPrismaUser = {
  count: vi.fn(),
  findMany: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  groupBy: vi.fn(),
  aggregate: vi.fn(),
}
const mockPrismaUserAIUsage = {
  findUnique: vi.fn(),
  groupBy: vi.fn(),
  aggregate: vi.fn(),
}
const mockPrismaSavedChart = {
  groupBy: vi.fn(),
}
const mockPrismaChartCalculationUsage = {
  groupBy: vi.fn(),
  aggregate: vi.fn(),
  deleteMany: vi.fn(),
}
const mockPrismaPDFExportUsage = {
  groupBy: vi.fn(),
  aggregate: vi.fn(),
}

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    adminUser: {
      get findUnique() {
        return mockPrismaAdminUser.findUnique
      },
      get create() {
        return mockPrismaAdminUser.create
      },
      get update() {
        return mockPrismaAdminUser.update
      },
    },
    adminAuditLog: {
      get create() {
        return mockPrismaAdminAuditLog.create
      },
    },
    adminSession: {
      get create() {
        return mockPrismaAdminSession.create
      },
      get findUnique() {
        return mockPrismaAdminSession.findUnique
      },
      get update() {
        return mockPrismaAdminSession.update
      },
      get updateMany() {
        return mockPrismaAdminSession.updateMany
      },
    },
    user: {
      get count() {
        return mockPrismaUser.count
      },
      get findMany() {
        return mockPrismaUser.findMany
      },
      get findUnique() {
        return mockPrismaUser.findUnique
      },
      get update() {
        return mockPrismaUser.update
      },
      get delete() {
        return mockPrismaUser.delete
      },
      get groupBy() {
        return mockPrismaUser.groupBy
      },
      get aggregate() {
        return mockPrismaUser.aggregate
      },
    },
    userAIUsage: {
      get findUnique() {
        return mockPrismaUserAIUsage.findUnique
      },
      get groupBy() {
        return mockPrismaUserAIUsage.groupBy
      },
      get aggregate() {
        return mockPrismaUserAIUsage.aggregate
      },
    },
    savedChart: {
      get groupBy() {
        return mockPrismaSavedChart.groupBy
      },
    },
    chartCalculationUsage: {
      get groupBy() {
        return mockPrismaChartCalculationUsage.groupBy
      },
      get aggregate() {
        return mockPrismaChartCalculationUsage.aggregate
      },
      get deleteMany() {
        return mockPrismaChartCalculationUsage.deleteMany
      },
    },
    pDFExportUsage: {
      get groupBy() {
        return mockPrismaPDFExportUsage.groupBy
      },
      get aggregate() {
        return mockPrismaPDFExportUsage.aggregate
      },
    },
  },
}))

// Mock recaptcha
const mockVerifyRecaptcha = vi.fn()
vi.mock('@/lib/security/recaptcha', () => ({
  verifyRecaptcha: (token: string) => mockVerifyRecaptcha(token),
}))

// Mock bcryptjs
const mockBcryptCompare = vi.fn()
const mockBcryptHash = vi.fn()
vi.mock('bcryptjs', () => ({
  default: {
    compare: (...args: unknown[]) => mockBcryptCompare(...args),
    hash: (...args: unknown[]) => mockBcryptHash(...args),
  },
  compare: (...args: unknown[]) => mockBcryptCompare(...args),
  hash: (...args: unknown[]) => mockBcryptHash(...args),
}))

// Mock admin session functions
const mockCreateAdminSession = vi.fn()
const mockDeleteAdminSession = vi.fn()
const mockGetAdminSession = vi.fn()
const mockGetClientIp = vi.fn()

vi.mock('@/lib/security/admin-session', () => ({
  createAdminSession: (...args: unknown[]) => mockCreateAdminSession(...args),
  deleteAdminSession: () => mockDeleteAdminSession(),
  getAdminSession: () => mockGetAdminSession(),
  getClientIp: () => mockGetClientIp(),
}))

// Mock admin auth wrappers
const mockWithAdminAuth = vi.fn()
const mockWithSuperAdminAuth = vi.fn()

vi.mock('@/lib/security/admin-auth', () => ({
  withAdminAuth: (fn: (session: { adminId: string; username: string; role: string }) => Promise<unknown>) =>
    mockWithAdminAuth(fn),
  withSuperAdminAuth: (fn: (session: { adminId: string; username: string; role: string }) => Promise<unknown>) =>
    mockWithSuperAdminAuth(fn),
  AdminUnauthorizedError: class AdminUnauthorizedError extends Error {
    constructor(message = 'Admin authentication required') {
      super(message)
      this.name = 'AdminUnauthorizedError'
    }
  },
  AdminForbiddenError: class AdminForbiddenError extends Error {
    constructor(message = 'Insufficient admin privileges') {
      super(message)
      this.name = 'AdminForbiddenError'
    }
  },
}))

// Mock logger
vi.mock('@/lib/logging/server', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock rate-limit functions for brute-force protection
const mockCheckAccountLockout = vi.fn()
const mockRecordFailedLogin = vi.fn()
const mockClearFailedLogins = vi.fn()

vi.mock('@/lib/security/rate-limit', () => ({
  checkAccountLockout: (username: string) => mockCheckAccountLockout(username),
  recordFailedLogin: (username: string) => mockRecordFailedLogin(username),
  clearFailedLogins: (username: string) => mockClearFailedLogins(username),
}))

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Creates a FormData object for admin login tests
 */
function createAdminLoginFormData(
  username: string = 'admin',
  password: string = 'AdminPass123!',
  recaptchaToken: string = 'valid-token',
): FormData {
  const fd = new FormData()
  fd.append('username', username)
  fd.append('password', password)
  fd.append('recaptchaToken', recaptchaToken)
  return fd
}

/**
 * Base admin user object for tests
 */
const baseAdmin = {
  id: 'admin-123',
  username: 'admin',
  email: 'admin@example.com',
  password: 'hashed-password',
  role: 'admin' as const,
  createdAt: new Date(),
  lastLoginAt: null,
  lastLoginIp: null,
}

/**
 * Mock admin session for authenticated tests
 */
const mockAdminSession = {
  adminId: 'admin-123',
  username: 'admin',
  role: 'admin' as const,
  sessionId: 'session-123',
  expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
}

/**
 * Mock superadmin session for protected operations
 */
const mockSuperadminSession = {
  adminId: 'superadmin-123',
  username: 'superadmin',
  role: 'superadmin' as const,
  sessionId: 'session-456',
  expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
}

/**
 * Base user object for user management tests
 */
const baseUser = {
  id: 'user-123',
  username: 'testuser',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  authProvider: 'credentials',
  subscriptionPlan: 'free',
  subscriptionId: null,
  trialEndsAt: null,
  subscriptionEndsAt: null,
  aiGenerationsTotal: 10,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastLoginAt: new Date(),
  loginCount: 5,
  lastActiveAt: new Date(),
  _count: {
    subjects: 3,
    savedCharts: 2,
  },
}

/**
 * Sets up withAdminAuth mock to execute the callback
 */
function setupAdminAuth(session = mockAdminSession) {
  mockWithAdminAuth.mockImplementation(
    async (fn: (session: { adminId: string; username: string; role: string }) => Promise<unknown>) => {
      return fn(session)
    },
  )
}

/**
 * Sets up withSuperAdminAuth mock to execute the callback
 */
function setupSuperAdminAuth(session = mockSuperadminSession) {
  mockWithSuperAdminAuth.mockImplementation(
    async (fn: (session: { adminId: string; username: string; role: string }) => Promise<unknown>) => {
      return fn(session)
    },
  )
}

// ============================================================================
// TESTS
// ============================================================================

describe('Admin Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset common mocks to defaults
    mockVerifyRecaptcha.mockResolvedValue(true)
    mockGetClientIp.mockResolvedValue('127.0.0.1')
    mockPrismaAdminAuditLog.create.mockResolvedValue({})

    // Reset brute-force protection mocks to defaults
    mockCheckAccountLockout.mockReturnValue({ locked: false })
    mockRecordFailedLogin.mockReturnValue(undefined)
    mockClearFailedLogins.mockReturnValue(undefined)
  })

  // ==========================================================================
  // ADMIN LOGIN TESTS
  // ==========================================================================

  describe('adminLogin', () => {
    describe('validation', () => {
      it('should return error when username is empty', async () => {
        const { adminLogin } = await import('@/actions/admin')
        const fd = createAdminLoginFormData('', 'password', 'token')

        const result = await adminLogin(fd)

        expect(result.success).toBe(false)
        expect(result).toHaveProperty('error')
        if (!result.success) {
          expect(result.error).toBe('Username is required')
        }
      })

      it('should return error when password is empty', async () => {
        const { adminLogin } = await import('@/actions/admin')
        const fd = createAdminLoginFormData('admin', '', 'token')

        const result = await adminLogin(fd)

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error).toBe('Password is required')
        }
      })

      it('should return error when recaptchaToken is empty', async () => {
        const { adminLogin } = await import('@/actions/admin')
        const fd = createAdminLoginFormData('admin', 'pass', '')

        const result = await adminLogin(fd)

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error).toBe('reCAPTCHA verification required')
        }
      })
    })

    describe('recaptcha verification', () => {
      it('should return error when recaptcha verification fails', async () => {
        const { adminLogin } = await import('@/actions/admin')
        mockVerifyRecaptcha.mockResolvedValue(false)
        const fd = createAdminLoginFormData('admin', 'pass', 'invalid-token')

        const result = await adminLogin(fd)

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error).toContain('reCAPTCHA verification failed')
        }
        expect(mockVerifyRecaptcha).toHaveBeenCalledWith('invalid-token')
      })

      it('should proceed when recaptcha verification passes', async () => {
        const { adminLogin } = await import('@/actions/admin')
        mockVerifyRecaptcha.mockResolvedValue(true)
        mockPrismaAdminUser.findUnique.mockResolvedValue(null)
        const fd = createAdminLoginFormData('admin', 'pass', 'valid-token')

        const result = await adminLogin(fd)

        // Should proceed past recaptcha (fails at user lookup)
        expect(mockVerifyRecaptcha).toHaveBeenCalledWith('valid-token')
        expect(mockPrismaAdminUser.findUnique).toHaveBeenCalled()
        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error).toBe('Invalid credentials')
        }
      })
    })

    describe('user authentication', () => {
      it('should return error when admin user not found', async () => {
        const { adminLogin } = await import('@/actions/admin')
        mockPrismaAdminUser.findUnique.mockResolvedValue(null)
        const fd = createAdminLoginFormData('nonexistent', 'pass', 'token')

        const result = await adminLogin(fd)

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error).toBe('Invalid credentials')
        }
      })

      it('should return error when password is incorrect and log failed attempt', async () => {
        const { adminLogin } = await import('@/actions/admin')
        mockPrismaAdminUser.findUnique.mockResolvedValue(baseAdmin)
        mockBcryptCompare.mockResolvedValue(false)
        const fd = createAdminLoginFormData('admin', 'wrongpass', 'token')

        const result = await adminLogin(fd)

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error).toBe('Invalid credentials')
        }
        // Should log failed attempt
        expect(mockPrismaAdminAuditLog.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            adminId: baseAdmin.id,
            action: 'login_failed',
            details: expect.stringContaining('invalid_password'),
          }),
        })
      })

      it('should compare password with bcrypt', async () => {
        const { adminLogin } = await import('@/actions/admin')
        mockPrismaAdminUser.findUnique.mockResolvedValue(baseAdmin)
        mockBcryptCompare.mockResolvedValue(false)
        const fd = createAdminLoginFormData('admin', 'testpass', 'token')

        await adminLogin(fd)

        expect(mockBcryptCompare).toHaveBeenCalledWith('testpass', baseAdmin.password)
      })
    })

    describe('successful login', () => {
      it('should create admin session and return success', async () => {
        const { adminLogin } = await import('@/actions/admin')
        mockPrismaAdminUser.findUnique.mockResolvedValue(baseAdmin)
        mockBcryptCompare.mockResolvedValue(true)
        mockCreateAdminSession.mockResolvedValue(undefined)
        const fd = createAdminLoginFormData('admin', 'correctpass', 'token')

        const result = await adminLogin(fd)

        expect(result.success).toBe(true)
        expect(mockCreateAdminSession).toHaveBeenCalledWith(baseAdmin.id, baseAdmin.username, baseAdmin.role)
      })

      it('should work with superadmin role', async () => {
        const { adminLogin } = await import('@/actions/admin')
        const superAdmin = { ...baseAdmin, role: 'superadmin' as const }
        mockPrismaAdminUser.findUnique.mockResolvedValue(superAdmin)
        mockBcryptCompare.mockResolvedValue(true)
        mockCreateAdminSession.mockResolvedValue(undefined)
        const fd = createAdminLoginFormData('superadmin', 'correctpass', 'token')

        const result = await adminLogin(fd)

        expect(result.success).toBe(true)
        expect(mockCreateAdminSession).toHaveBeenCalledWith(superAdmin.id, superAdmin.username, 'superadmin')
      })

      it('should clear failed login attempts on successful login', async () => {
        const { adminLogin } = await import('@/actions/admin')
        mockPrismaAdminUser.findUnique.mockResolvedValue(baseAdmin)
        mockBcryptCompare.mockResolvedValue(true)
        mockCreateAdminSession.mockResolvedValue(undefined)
        const fd = createAdminLoginFormData('admin', 'correctpass', 'token')

        await adminLogin(fd)

        expect(mockClearFailedLogins).toHaveBeenCalledWith('admin')
      })
    })

    describe('brute-force protection', () => {
      it('should check account lockout before attempting login', async () => {
        const { adminLogin } = await import('@/actions/admin')
        mockCheckAccountLockout.mockReturnValue({ locked: false })
        mockPrismaAdminUser.findUnique.mockResolvedValue(null)
        const fd = createAdminLoginFormData('admin', 'pass', 'token')

        await adminLogin(fd)

        expect(mockCheckAccountLockout).toHaveBeenCalledWith('admin')
      })

      it('should return error when account is locked', async () => {
        const { adminLogin } = await import('@/actions/admin')
        mockCheckAccountLockout.mockReturnValue({ locked: true, remainingSeconds: 600 })
        const fd = createAdminLoginFormData('admin', 'pass', 'token')

        const result = await adminLogin(fd)

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error).toContain('Account temporarily locked')
          expect(result.error).toContain('10 minutes')
        }
        // Should not attempt to find user when locked
        expect(mockPrismaAdminUser.findUnique).not.toHaveBeenCalled()
      })

      it('should record failed login attempt when user not found', async () => {
        const { adminLogin } = await import('@/actions/admin')
        mockPrismaAdminUser.findUnique.mockResolvedValue(null)
        const fd = createAdminLoginFormData('nonexistent', 'pass', 'token')

        await adminLogin(fd)

        expect(mockRecordFailedLogin).toHaveBeenCalledWith('nonexistent')
      })

      it('should record failed login attempt when password is incorrect', async () => {
        const { adminLogin } = await import('@/actions/admin')
        mockPrismaAdminUser.findUnique.mockResolvedValue(baseAdmin)
        mockBcryptCompare.mockResolvedValue(false)
        const fd = createAdminLoginFormData('admin', 'wrongpass', 'token')

        await adminLogin(fd)

        expect(mockRecordFailedLogin).toHaveBeenCalledWith('admin')
      })

      it('should not record failed login when recaptcha fails', async () => {
        const { adminLogin } = await import('@/actions/admin')
        mockVerifyRecaptcha.mockResolvedValue(false)
        const fd = createAdminLoginFormData('admin', 'pass', 'invalid-token')

        await adminLogin(fd)

        expect(mockRecordFailedLogin).not.toHaveBeenCalled()
      })

      it('should not record failed login when account is locked', async () => {
        const { adminLogin } = await import('@/actions/admin')
        mockCheckAccountLockout.mockReturnValue({ locked: true, remainingSeconds: 300 })
        const fd = createAdminLoginFormData('admin', 'pass', 'token')

        await adminLogin(fd)

        expect(mockRecordFailedLogin).not.toHaveBeenCalled()
      })

      it('should calculate minutes correctly for lockout message (rounds up)', async () => {
        const { adminLogin } = await import('@/actions/admin')
        mockCheckAccountLockout.mockReturnValue({ locked: true, remainingSeconds: 65 })
        const fd = createAdminLoginFormData('admin', 'pass', 'token')

        const result = await adminLogin(fd)

        expect(result.success).toBe(false)
        if (!result.success) {
          // 65 seconds = 2 minutes (rounded up)
          expect(result.error).toContain('2 minutes')
        }
      })
    })
  })

  // ==========================================================================
  // ADMIN LOGOUT TESTS
  // ==========================================================================

  describe('adminLogout', () => {
    it('should call deleteAdminSession and return success', async () => {
      const { adminLogout } = await import('@/actions/admin')
      mockDeleteAdminSession.mockResolvedValue(undefined)

      const result = await adminLogout()

      expect(result.success).toBe(true)
      expect(mockDeleteAdminSession).toHaveBeenCalledTimes(1)
    })
  })

  // ==========================================================================
  // GET ADMIN SESSION INFO TESTS
  // ==========================================================================

  describe('getAdminSessionInfo', () => {
    it('should return session info when session exists', async () => {
      const { getAdminSessionInfo } = await import('@/actions/admin')
      mockGetAdminSession.mockResolvedValue(mockAdminSession)

      const result = await getAdminSessionInfo()

      expect(result).toEqual({
        username: mockAdminSession.username,
        role: mockAdminSession.role,
      })
    })

    it('should return null when no session exists', async () => {
      const { getAdminSessionInfo } = await import('@/actions/admin')
      mockGetAdminSession.mockResolvedValue(null)

      const result = await getAdminSessionInfo()

      expect(result).toBeNull()
    })

    it('should return superadmin role correctly', async () => {
      const { getAdminSessionInfo } = await import('@/actions/admin')
      mockGetAdminSession.mockResolvedValue(mockSuperadminSession)

      const result = await getAdminSessionInfo()

      expect(result).toEqual({
        username: 'superadmin',
        role: 'superadmin',
      })
    })
  })

  // ==========================================================================
  // GET USERS TESTS
  // ==========================================================================

  describe('getUsers', () => {
    beforeEach(() => {
      setupAdminAuth()
      mockPrismaUser.findMany.mockResolvedValue([baseUser])
      mockPrismaUser.count.mockResolvedValue(1)
      mockPrismaChartCalculationUsage.groupBy.mockResolvedValue([])
      mockPrismaPDFExportUsage.groupBy.mockResolvedValue([])
    })

    it('should return paginated user list', async () => {
      const { getUsers } = await import('@/actions/admin')

      const result = await getUsers()

      expect(result.success).toBe(true)
      if (result.success && result.data) {
        expect(result.data.users).toHaveLength(1)
        expect(result.data.total).toBe(1)
        expect(result.data.page).toBe(1)
        expect(result.data.pageSize).toBe(20)
      }
    })

    it('should log the action', async () => {
      const { getUsers } = await import('@/actions/admin')

      await getUsers(1, 20, 'search', 'free')

      expect(mockPrismaAdminAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          adminId: mockAdminSession.adminId,
          action: 'view_users',
          details: expect.stringContaining('search'),
        }),
      })
    })

    it('should handle search filter', async () => {
      const { getUsers } = await import('@/actions/admin')

      await getUsers(1, 20, 'test')

      expect(mockPrismaUser.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { username: { contains: 'test', mode: 'insensitive' } },
              { email: { contains: 'test', mode: 'insensitive' } },
            ]),
          }),
        }),
      )
    })

    it('should handle plan filter', async () => {
      const { getUsers } = await import('@/actions/admin')

      await getUsers(1, 20, undefined, 'pro')

      expect(mockPrismaUser.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            subscriptionPlan: 'pro',
          }),
        }),
      )
    })

    it('should include calculation counts by type', async () => {
      const { getUsers } = await import('@/actions/admin')
      mockPrismaChartCalculationUsage.groupBy.mockResolvedValue([
        { userId: 'user-123', chartType: 'natal', _sum: { count: 5 } },
        { userId: 'user-123', chartType: 'transit', _sum: { count: 3 } },
      ])

      const result = await getUsers()

      expect(result.success).toBe(true)
      if (result.success && result.data) {
        const firstUser = result.data.users[0]
        expect(firstUser).toBeDefined()
        expect(firstUser!.calculationsTotal).toBe(8)
        expect(firstUser!.calculationsByType.natal).toBe(5)
        expect(firstUser!.calculationsByType.transit).toBe(3)
      }
    })
  })

  // ==========================================================================
  // GET USER DETAILS TESTS
  // ==========================================================================

  describe('getUserDetails', () => {
    beforeEach(() => {
      setupAdminAuth()
      mockPrismaUserAIUsage.findUnique.mockResolvedValue({ count: 5 })
      mockPrismaPDFExportUsage.aggregate.mockResolvedValue({ _sum: { count: 10 } })
    })

    it('should return user details when user exists', async () => {
      const { getUserDetails } = await import('@/actions/admin')
      mockPrismaUser.findUnique.mockResolvedValue(baseUser)

      const result = await getUserDetails('user-123')

      expect(result.success).toBe(true)
      if (result.success && result.data) {
        expect(result.data.id).toBe('user-123')
        expect(result.data.username).toBe('testuser')
        expect(result.data.todayAIUsage).toBe(5)
        expect(result.data.pdfExportsTotal).toBe(10)
      }
    })

    it('should return error when user not found', async () => {
      const { getUserDetails } = await import('@/actions/admin')
      mockPrismaUser.findUnique.mockResolvedValue(null)

      const result = await getUserDetails('nonexistent')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('User not found')
      }
    })

    it('should log the action', async () => {
      const { getUserDetails } = await import('@/actions/admin')
      mockPrismaUser.findUnique.mockResolvedValue(baseUser)

      await getUserDetails('user-123')

      expect(mockPrismaAdminAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'view_user_details',
          details: expect.stringContaining('user-123'),
        }),
      })
    })
  })

  // ==========================================================================
  // UPDATE USER PLAN TESTS
  // ==========================================================================

  describe('updateUserPlan', () => {
    beforeEach(() => {
      setupAdminAuth()
    })

    it('should update user plan successfully', async () => {
      const { updateUserPlan } = await import('@/actions/admin')
      mockPrismaUser.findUnique.mockResolvedValue(baseUser)
      mockPrismaUser.update.mockResolvedValue({ ...baseUser, subscriptionPlan: 'pro' })

      const result = await updateUserPlan('user-123', 'pro')

      expect(result.success).toBe(true)
      expect(mockPrismaUser.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { subscriptionPlan: 'pro' },
      })
    })

    it('should return error when user not found', async () => {
      const { updateUserPlan } = await import('@/actions/admin')
      mockPrismaUser.findUnique.mockResolvedValue(null)

      const result = await updateUserPlan('nonexistent', 'pro')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('User not found')
      }
    })

    it('should log the action with old and new plan', async () => {
      const { updateUserPlan } = await import('@/actions/admin')
      mockPrismaUser.findUnique.mockResolvedValue(baseUser)
      mockPrismaUser.update.mockResolvedValue({ ...baseUser, subscriptionPlan: 'pro' })

      await updateUserPlan('user-123', 'pro')

      expect(mockPrismaAdminAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'update_user_plan',
          details: expect.stringContaining('free'),
        }),
      })
    })
  })

  // ==========================================================================
  // DELETE USER TESTS (SUPERADMIN ONLY)
  // ==========================================================================

  describe('deleteUser', () => {
    beforeEach(() => {
      setupSuperAdminAuth()
    })

    it('should delete user successfully as superadmin', async () => {
      const { deleteUser } = await import('@/actions/admin')
      mockPrismaUser.findUnique.mockResolvedValue(baseUser)
      mockPrismaUser.delete.mockResolvedValue(baseUser)

      const result = await deleteUser('user-123')

      expect(result.success).toBe(true)
      expect(mockPrismaUser.delete).toHaveBeenCalledWith({ where: { id: 'user-123' } })
    })

    it('should return error when user not found', async () => {
      const { deleteUser } = await import('@/actions/admin')
      mockPrismaUser.findUnique.mockResolvedValue(null)

      const result = await deleteUser('nonexistent')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('User not found')
      }
    })

    it('should log the action with user details', async () => {
      const { deleteUser } = await import('@/actions/admin')
      mockPrismaUser.findUnique.mockResolvedValue(baseUser)
      mockPrismaUser.delete.mockResolvedValue(baseUser)

      await deleteUser('user-123')

      expect(mockPrismaAdminAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          adminId: mockSuperadminSession.adminId,
          action: 'delete_user',
          details: expect.stringContaining('testuser'),
        }),
      })
    })

    it('should require superadmin role via withSuperAdminAuth', async () => {
      const { deleteUser } = await import('@/actions/admin')
      mockPrismaUser.findUnique.mockResolvedValue(baseUser)
      mockPrismaUser.delete.mockResolvedValue(baseUser)

      await deleteUser('user-123')

      expect(mockWithSuperAdminAuth).toHaveBeenCalled()
      expect(mockWithAdminAuth).not.toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // CREATE ADMIN USER TESTS (SUPERADMIN ONLY)
  // ==========================================================================

  describe('createAdminUser', () => {
    beforeEach(() => {
      setupSuperAdminAuth()
    })

    it('should create admin user successfully', async () => {
      const { createAdminUser } = await import('@/actions/admin')
      mockPrismaAdminUser.findUnique.mockResolvedValue(null) // Username doesn't exist
      mockBcryptHash.mockResolvedValue('hashed-new-password')
      mockPrismaAdminUser.create.mockResolvedValue({ id: 'new-admin-123' })

      const result = await createAdminUser('newadmin', 'AdminPass123!', 'newadmin@test.com', 'admin')

      expect(result.success).toBe(true)
      if (result.success && result.data) {
        expect(result.data.id).toBe('new-admin-123')
      }
    })

    it('should hash password with bcrypt', async () => {
      const { createAdminUser } = await import('@/actions/admin')
      mockPrismaAdminUser.findUnique.mockResolvedValue(null)
      mockBcryptHash.mockResolvedValue('hashed-password')
      mockPrismaAdminUser.create.mockResolvedValue({ id: 'new-admin-123' })

      await createAdminUser('newadmin', 'MyPassword123!', null, 'admin')

      expect(mockBcryptHash).toHaveBeenCalledWith('MyPassword123!', 12)
    })

    it('should return error when username already exists', async () => {
      const { createAdminUser } = await import('@/actions/admin')
      mockPrismaAdminUser.findUnique.mockResolvedValue(baseAdmin)

      const result = await createAdminUser('admin', 'pass', null, 'admin')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Username already exists')
      }
    })

    it('should log the action', async () => {
      const { createAdminUser } = await import('@/actions/admin')
      mockPrismaAdminUser.findUnique.mockResolvedValue(null)
      mockBcryptHash.mockResolvedValue('hashed-password')
      mockPrismaAdminUser.create.mockResolvedValue({ id: 'new-admin-123' })

      await createAdminUser('newadmin', 'pass', 'email@test.com', 'superadmin')

      expect(mockPrismaAdminAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'create_admin',
          details: expect.stringContaining('superadmin'),
        }),
      })
    })

    it('should require superadmin role via withSuperAdminAuth', async () => {
      const { createAdminUser } = await import('@/actions/admin')
      mockPrismaAdminUser.findUnique.mockResolvedValue(null)
      mockBcryptHash.mockResolvedValue('hashed-password')
      mockPrismaAdminUser.create.mockResolvedValue({ id: 'new-admin-123' })

      await createAdminUser('newadmin', 'pass', null, 'admin')

      expect(mockWithSuperAdminAuth).toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // DASHBOARD STATISTICS TESTS
  // ==========================================================================

  describe('getDashboardStats', () => {
    beforeEach(() => {
      setupAdminAuth()

      // Setup default mock responses for all stats queries
      mockPrismaUser.count.mockResolvedValue(100)
      mockPrismaUser.groupBy.mockResolvedValue([
        { subscriptionPlan: 'free', _count: 80 },
        { subscriptionPlan: 'pro', _count: 20 },
      ])
      mockPrismaUser.aggregate.mockResolvedValue({
        _sum: { aiGenerationsTotal: 500 },
        _avg: { loginCount: 3.5 },
      })
      mockPrismaUserAIUsage.aggregate.mockResolvedValue({ _sum: { count: 25 } })
      mockPrismaSavedChart.groupBy.mockResolvedValue([
        { type: 'natal', _count: 50 },
        { type: 'transit', _count: 30 },
      ])
      mockPrismaChartCalculationUsage.groupBy.mockResolvedValue([])
      mockPrismaChartCalculationUsage.aggregate.mockResolvedValue({ _sum: { count: 1000 } })
    })

    it('should return dashboard statistics', async () => {
      const { getDashboardStats } = await import('@/actions/admin')

      const result = await getDashboardStats()

      expect(result.success).toBe(true)
      if (result.success && result.data) {
        expect(result.data.totalUsers).toBe(100)
        expect(result.data.usersByPlan).toHaveLength(2)
      }
    })

    it('should log the action', async () => {
      const { getDashboardStats } = await import('@/actions/admin')

      await getDashboardStats()

      expect(mockPrismaAdminAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'view_dashboard',
        }),
      })
    })
  })

  // ==========================================================================
  // AI USAGE STATISTICS TESTS
  // ==========================================================================

  describe('getAIUsageStats', () => {
    beforeEach(() => {
      setupAdminAuth()
      mockPrismaUserAIUsage.groupBy.mockResolvedValue([])
      mockPrismaUser.findMany.mockResolvedValue([])
      mockPrismaUser.groupBy.mockResolvedValue([])
    })

    it('should return AI usage statistics', async () => {
      const { getAIUsageStats } = await import('@/actions/admin')

      const result = await getAIUsageStats(30)

      expect(result.success).toBe(true)
      if (result.success && result.data) {
        expect(result.data).toHaveProperty('dailyUsage')
        expect(result.data).toHaveProperty('topUsers')
        expect(result.data).toHaveProperty('usageByPlan')
      }
    })

    it('should log the action with days parameter', async () => {
      const { getAIUsageStats } = await import('@/actions/admin')

      await getAIUsageStats(7)

      expect(mockPrismaAdminAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'view_ai_usage',
          details: expect.stringContaining('7'),
        }),
      })
    })
  })

  // ==========================================================================
  // CLEAR CALCULATION HISTORY TESTS (SUPERADMIN ONLY)
  // ==========================================================================

  describe('clearCalculationHistory', () => {
    beforeEach(() => {
      setupSuperAdminAuth()
      mockPrismaChartCalculationUsage.deleteMany.mockResolvedValue({ count: 10 })
    })

    it('should clear today records', async () => {
      const { clearCalculationHistory } = await import('@/actions/admin')

      const result = await clearCalculationHistory('day')

      expect(result.success).toBe(true)
      if (result.success && result.data) {
        expect(result.data.deletedCount).toBe(10)
      }
      expect(mockPrismaChartCalculationUsage.deleteMany).toHaveBeenCalled()
    })

    it('should clear week records', async () => {
      const { clearCalculationHistory } = await import('@/actions/admin')

      const result = await clearCalculationHistory('week')

      expect(result.success).toBe(true)
    })

    it('should clear all records', async () => {
      const { clearCalculationHistory } = await import('@/actions/admin')

      const result = await clearCalculationHistory('all')

      expect(result.success).toBe(true)
      expect(mockPrismaChartCalculationUsage.deleteMany).toHaveBeenCalledWith({})
    })

    it('should log the action', async () => {
      const { clearCalculationHistory } = await import('@/actions/admin')

      await clearCalculationHistory('month')

      expect(mockPrismaAdminAuditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'clear_calculation_history',
          details: expect.stringContaining('month'),
        }),
      })
    })

    it('should require superadmin role', async () => {
      const { clearCalculationHistory } = await import('@/actions/admin')

      await clearCalculationHistory('day')

      expect(mockWithSuperAdminAuth).toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // SEARCH USERS TESTS
  // ==========================================================================

  describe('searchUsers', () => {
    beforeEach(() => {
      setupAdminAuth()
    })

    it('should return empty array for short query', async () => {
      const { searchUsers } = await import('@/actions/admin')

      const result = await searchUsers('a')

      expect(result.success).toBe(true)
      if (result.success && result.data) {
        expect(result.data).toEqual([])
      }
    })

    it('should search users by username or email', async () => {
      const { searchUsers } = await import('@/actions/admin')
      mockPrismaUser.findMany.mockResolvedValue([{ id: 'user-1', username: 'testuser', email: 'test@example.com' }])

      const result = await searchUsers('test')

      expect(result.success).toBe(true)
      if (result.success && result.data) {
        expect(result.data).toHaveLength(1)
      }
      expect(mockPrismaUser.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { username: { contains: 'test', mode: 'insensitive' } },
              { email: { contains: 'test', mode: 'insensitive' } },
            ],
          },
          take: 20,
        }),
      )
    })
  })

  // ==========================================================================
  // ERROR HANDLING TESTS
  // ==========================================================================

  describe('error handling', () => {
    it('should handle database errors in adminLogin gracefully', async () => {
      const { adminLogin } = await import('@/actions/admin')
      mockPrismaAdminUser.findUnique.mockRejectedValue(new Error('Database connection failed'))
      const fd = createAdminLoginFormData('admin', 'pass', 'token')

      await expect(adminLogin(fd)).rejects.toThrow('Database connection failed')
    })

    it('should handle database errors in user operations', async () => {
      setupAdminAuth()
      const { getUserDetails } = await import('@/actions/admin')
      mockPrismaUser.findUnique.mockRejectedValue(new Error('Query failed'))

      await expect(getUserDetails('user-123')).rejects.toThrow('Query failed')
    })
  })

  // ==========================================================================
  // GET TOP USERS BY CALCULATIONS TESTS
  // ==========================================================================

  describe('getTopUsersByCalculations', () => {
    beforeEach(() => {
      setupAdminAuth()
    })

    it('should return top users with calculation counts', async () => {
      const { getTopUsersByCalculations } = await import('@/actions/admin')

      // Mock all-time totals
      mockPrismaChartCalculationUsage.groupBy
        .mockResolvedValueOnce([
          { userId: 'user-1', _sum: { count: 100 } },
          { userId: 'user-2', _sum: { count: 50 } },
        ])
        // Today counts
        .mockResolvedValueOnce([{ userId: 'user-1', _sum: { count: 10 } }])
        // Week counts
        .mockResolvedValueOnce([
          { userId: 'user-1', _sum: { count: 30 } },
          { userId: 'user-2', _sum: { count: 15 } },
        ])
        // Month counts
        .mockResolvedValueOnce([
          { userId: 'user-1', _sum: { count: 60 } },
          { userId: 'user-2', _sum: { count: 40 } },
        ])

      mockPrismaUser.findMany.mockResolvedValue([
        { id: 'user-1', username: 'topuser', email: 'top@test.com', subscriptionPlan: 'pro' },
        { id: 'user-2', username: 'seconduser', email: 'second@test.com', subscriptionPlan: 'free' },
      ])

      const result = await getTopUsersByCalculations(10)

      expect(result.success).toBe(true)
      if (result.success && result.data) {
        expect(result.data).toHaveLength(2)
        expect(result.data[0]!.userId).toBe('user-1')
        expect(result.data[0]!.calculationsTotal).toBe(100)
        expect(result.data[0]!.calculationsToday).toBe(10)
        expect(result.data[0]!.calculationsThisWeek).toBe(30)
        expect(result.data[0]!.calculationsThisMonth).toBe(60)
        expect(result.data[1]!.userId).toBe('user-2')
        expect(result.data[1]!.calculationsTotal).toBe(50)
      }
    })

    it('should return empty array when no data exists', async () => {
      const { getTopUsersByCalculations } = await import('@/actions/admin')
      mockPrismaChartCalculationUsage.groupBy.mockResolvedValue([])

      const result = await getTopUsersByCalculations()

      expect(result.success).toBe(true)
      if (result.success && result.data) {
        expect(result.data).toEqual([])
      }
    })

    it('should respect limit parameter', async () => {
      const { getTopUsersByCalculations } = await import('@/actions/admin')
      mockPrismaChartCalculationUsage.groupBy.mockResolvedValue([])

      await getTopUsersByCalculations(5)

      expect(mockPrismaChartCalculationUsage.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        }),
      )
    })

    it('should use default limit of 20', async () => {
      const { getTopUsersByCalculations } = await import('@/actions/admin')
      mockPrismaChartCalculationUsage.groupBy.mockResolvedValue([])

      await getTopUsersByCalculations()

      expect(mockPrismaChartCalculationUsage.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
        }),
      )
    })

    it('should filter out users that no longer exist', async () => {
      const { getTopUsersByCalculations } = await import('@/actions/admin')

      mockPrismaChartCalculationUsage.groupBy
        .mockResolvedValueOnce([
          { userId: 'user-1', _sum: { count: 100 } },
          { userId: 'deleted-user', _sum: { count: 50 } },
        ])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])

      // Only return one user - the other was deleted
      mockPrismaUser.findMany.mockResolvedValue([
        { id: 'user-1', username: 'topuser', email: 'top@test.com', subscriptionPlan: 'pro' },
      ])

      const result = await getTopUsersByCalculations()

      expect(result.success).toBe(true)
      if (result.success && result.data) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0]!.userId).toBe('user-1')
      }
    })
  })

  // ==========================================================================
  // GET CALCULATION STATS TESTS
  // ==========================================================================

  describe('getCalculationStats', () => {
    beforeEach(() => {
      setupAdminAuth()
    })

    it('should return global stats when no userId provided', async () => {
      const { getCalculationStats } = await import('@/actions/admin')

      mockPrismaChartCalculationUsage.aggregate
        .mockResolvedValueOnce({ _sum: { count: 1000 } }) // total
        .mockResolvedValueOnce({ _sum: { count: 50 } }) // today
        .mockResolvedValueOnce({ _sum: { count: 200 } }) // week
        .mockResolvedValueOnce({ _sum: { count: 500 } }) // month

      mockPrismaChartCalculationUsage.groupBy
        .mockResolvedValueOnce([
          { chartType: 'natal', _sum: { count: 400 } },
          { chartType: 'transit', _sum: { count: 300 } },
          { chartType: 'synastry', _sum: { count: 200 } },
        ])
        .mockResolvedValueOnce([{ chartType: 'natal', _sum: { count: 20 } }])
        .mockResolvedValueOnce([
          { chartType: 'natal', _sum: { count: 80 } },
          { chartType: 'transit', _sum: { count: 60 } },
        ])
        .mockResolvedValueOnce([
          { chartType: 'natal', _sum: { count: 200 } },
          { chartType: 'transit', _sum: { count: 150 } },
        ])

      const result = await getCalculationStats()

      expect(result.success).toBe(true)
      if (result.success && result.data) {
        expect(result.data.totalCalculations).toBe(1000)
        expect(result.data.calculationsToday).toBe(50)
        expect(result.data.calculationsThisWeek).toBe(200)
        expect(result.data.calculationsThisMonth).toBe(500)
        expect(result.data.calculationsByType).toHaveLength(3)
        expect(result.data.calculationsByType[0]).toEqual({ type: 'natal', count: 400 })
      }
    })

    it('should filter stats by userId when provided', async () => {
      const { getCalculationStats } = await import('@/actions/admin')

      mockPrismaChartCalculationUsage.aggregate.mockResolvedValue({ _sum: { count: 100 } })
      mockPrismaChartCalculationUsage.groupBy.mockResolvedValue([])

      await getCalculationStats('user-123')

      // Check that first aggregate call includes userId filter
      expect(mockPrismaChartCalculationUsage.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-123',
          }),
        }),
      )
    })

    it('should return zero counts when database is empty', async () => {
      const { getCalculationStats } = await import('@/actions/admin')

      mockPrismaChartCalculationUsage.aggregate.mockResolvedValue({ _sum: { count: null } })
      mockPrismaChartCalculationUsage.groupBy.mockResolvedValue([])

      const result = await getCalculationStats()

      expect(result.success).toBe(true)
      if (result.success && result.data) {
        expect(result.data.totalCalculations).toBe(0)
        expect(result.data.calculationsToday).toBe(0)
        expect(result.data.calculationsThisWeek).toBe(0)
        expect(result.data.calculationsThisMonth).toBe(0)
        expect(result.data.calculationsByType).toEqual([])
      }
    })

    it('should return stats for all time periods', async () => {
      const { getCalculationStats } = await import('@/actions/admin')

      mockPrismaChartCalculationUsage.aggregate
        .mockResolvedValueOnce({ _sum: { count: 1000 } })
        .mockResolvedValueOnce({ _sum: { count: 10 } })
        .mockResolvedValueOnce({ _sum: { count: 100 } })
        .mockResolvedValueOnce({ _sum: { count: 300 } })

      mockPrismaChartCalculationUsage.groupBy.mockResolvedValue([])

      const result = await getCalculationStats()

      expect(result.success).toBe(true)
      if (result.success && result.data) {
        expect(result.data.totalCalculations).toBe(1000)
        expect(result.data.calculationsToday).toBe(10)
        expect(result.data.calculationsThisWeek).toBe(100)
        expect(result.data.calculationsThisMonth).toBe(300)
      }
    })
  })

  // ==========================================================================
  // MOCK ISOLATION VERIFICATION
  // ==========================================================================

  describe('mock isolation', () => {
    it('should never call real prisma - verify mock is in place', async () => {
      // This test verifies that our prisma mock is properly preventing real DB calls
      const { prisma } = await import('@/lib/db/prisma')

      // The prisma object should be our mock
      expect(prisma.adminUser.findUnique).toBe(mockPrismaAdminUser.findUnique)
      expect(prisma.user.findUnique).toBe(mockPrismaUser.findUnique)
      expect(prisma.adminAuditLog.create).toBe(mockPrismaAdminAuditLog.create)
    })

    it('should never call real bcrypt - verify mock is in place', async () => {
      const bcrypt = await import('bcryptjs')

      // The bcrypt compare should be our mock
      bcrypt.default.compare('test', 'hash')
      expect(mockBcryptCompare).toHaveBeenCalled()
    })

    it('should never call real recaptcha verification - verify mock is in place', async () => {
      const { verifyRecaptcha } = await import('@/lib/security/recaptcha')

      await verifyRecaptcha('test-token')
      expect(mockVerifyRecaptcha).toHaveBeenCalledWith('test-token')
    })
  })
})
