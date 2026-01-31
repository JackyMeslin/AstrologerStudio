/**
 * Unit Tests for PDF Tracking Actions
 *
 * Tests the PDF tracking server actions including trackPdfExport and getUserPdfExportsTotal.
 * Verifies session handling, database operations, admin authorization, and error handling.
 *
 * @module src/actions/pdf-tracking
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { AdminSessionPayload } from '@/lib/security/admin-session'

// ============================================================================
// MOCKS
// ============================================================================

// Mock server-only package (Next.js specific)
vi.mock('server-only', () => ({}))

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

// Mock session for regular users
const mockGetSession = vi.fn()

vi.mock('@/lib/security/session', () => ({
  getSession: () => mockGetSession(),
}))

// Mock admin session for admin-only functions
const mockGetAdminSession = vi.fn()

vi.mock('@/lib/security/admin-session', () => ({
  getAdminSession: () => mockGetAdminSession(),
}))

// Mock prisma PDFExportUsage operations
const mockPrismaPDFExportUsage = {
  upsert: vi.fn(),
  aggregate: vi.fn(),
}

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    pDFExportUsage: {
      get upsert() {
        return mockPrismaPDFExportUsage.upsert
      },
      get aggregate() {
        return mockPrismaPDFExportUsage.aggregate
      },
    },
  },
}))

// ============================================================================
// TEST HELPERS
// ============================================================================

const mockSession = { userId: 'user-123', username: 'testuser' }

const createMockAdminSession = (overrides: Partial<AdminSessionPayload> = {}): AdminSessionPayload => ({
  adminId: 'admin-123',
  username: 'testadmin',
  role: 'admin',
  sessionId: 'session-456',
  expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
  ...overrides,
})

// ============================================================================
// TESTS
// ============================================================================

describe('PDF Tracking Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSession.mockResolvedValue(mockSession)
    mockGetAdminSession.mockResolvedValue(null) // Default to no admin session
  })

  // ==========================================================================
  // trackPdfExport TESTS
  // ==========================================================================

  describe('trackPdfExport', () => {
    it('should return { success: true } when session is null (unauthenticated user)', async () => {
      const { trackPdfExport } = await import('@/actions/pdf-tracking')
      mockGetSession.mockResolvedValue(null)

      const result = await trackPdfExport('natal')

      expect(result).toEqual({ success: true })
      expect(mockPrismaPDFExportUsage.upsert).not.toHaveBeenCalled()
    })

    it('should return { success: true } when session has no userId', async () => {
      const { trackPdfExport } = await import('@/actions/pdf-tracking')
      mockGetSession.mockResolvedValue({ username: 'testuser' })

      const result = await trackPdfExport('natal')

      expect(result).toEqual({ success: true })
      expect(mockPrismaPDFExportUsage.upsert).not.toHaveBeenCalled()
    })

    it('should call upsert with correct where clause for userId, date, and chartType', async () => {
      const { trackPdfExport } = await import('@/actions/pdf-tracking')
      mockPrismaPDFExportUsage.upsert.mockResolvedValue({})

      // Mock Date to have consistent test results
      const mockDate = new Date('2025-06-15T10:30:00.000Z')
      vi.setSystemTime(mockDate)

      await trackPdfExport('natal')

      expect(mockPrismaPDFExportUsage.upsert).toHaveBeenCalledWith({
        where: {
          userId_date_chartType: {
            userId: mockSession.userId,
            date: '2025-06-15',
            chartType: 'natal',
          },
        },
        update: {
          count: { increment: 1 },
        },
        create: {
          userId: mockSession.userId,
          date: '2025-06-15',
          chartType: 'natal',
          count: 1,
        },
      })

      vi.useRealTimers()
    })

    it('should handle all valid chart types', async () => {
      const { trackPdfExport } = await import('@/actions/pdf-tracking')
      mockPrismaPDFExportUsage.upsert.mockResolvedValue({})

      const chartTypes: Array<'natal' | 'synastry' | 'transit' | 'composite' | 'solar-return' | 'lunar-return'> = [
        'natal',
        'synastry',
        'transit',
        'composite',
        'solar-return',
        'lunar-return',
      ]

      for (const chartType of chartTypes) {
        vi.clearAllMocks()
        mockGetSession.mockResolvedValue(mockSession)

        const result = await trackPdfExport(chartType)

        expect(result).toEqual({ success: true })
        expect(mockPrismaPDFExportUsage.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              userId_date_chartType: expect.objectContaining({
                chartType,
              }),
            }),
          }),
        )
      }
    })

    it('should return { success: true } when upsert succeeds', async () => {
      const { trackPdfExport } = await import('@/actions/pdf-tracking')
      mockPrismaPDFExportUsage.upsert.mockResolvedValue({
        id: 'usage-123',
        userId: mockSession.userId,
        date: '2025-06-15',
        chartType: 'natal',
        count: 1,
      })

      const result = await trackPdfExport('natal')

      expect(result).toEqual({ success: true })
    })

    it('should return { success: true } when upsert throws (graceful failure)', async () => {
      const { trackPdfExport } = await import('@/actions/pdf-tracking')
      mockPrismaPDFExportUsage.upsert.mockRejectedValue(new Error('Database error'))

      const result = await trackPdfExport('natal')

      expect(result).toEqual({ success: true })
      expect(mockLogger.warn).toHaveBeenCalledWith('Failed to track PDF export', expect.any(Error))
    })

    it('should use correct date format (YYYY-MM-DD)', async () => {
      const { trackPdfExport } = await import('@/actions/pdf-tracking')
      mockPrismaPDFExportUsage.upsert.mockResolvedValue({})

      // Test with specific date
      const mockDate = new Date('2025-12-31T23:59:59.999Z')
      vi.setSystemTime(mockDate)

      await trackPdfExport('transit')

      expect(mockPrismaPDFExportUsage.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId_date_chartType: expect.objectContaining({
              date: '2025-12-31',
            }),
          }),
          create: expect.objectContaining({
            date: '2025-12-31',
          }),
        }),
      )

      vi.useRealTimers()
    })

    it('should increment count when record exists', async () => {
      const { trackPdfExport } = await import('@/actions/pdf-tracking')
      mockPrismaPDFExportUsage.upsert.mockResolvedValue({})

      await trackPdfExport('synastry')

      expect(mockPrismaPDFExportUsage.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: {
            count: { increment: 1 },
          },
        }),
      )
    })

    it('should create with count: 1 when record does not exist', async () => {
      const { trackPdfExport } = await import('@/actions/pdf-tracking')
      mockPrismaPDFExportUsage.upsert.mockResolvedValue({})

      await trackPdfExport('composite')

      expect(mockPrismaPDFExportUsage.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            count: 1,
          }),
        }),
      )
    })
  })

  // ==========================================================================
  // getUserPdfExportsTotal TESTS
  // ==========================================================================

  describe('getUserPdfExportsTotal', () => {
    it('should throw AdminUnauthorizedError when admin session is null', async () => {
      const { getUserPdfExportsTotal } = await import('@/actions/pdf-tracking')
      const { AdminUnauthorizedError } = await import('@/lib/security/admin-auth')
      mockGetAdminSession.mockResolvedValue(null)

      await expect(getUserPdfExportsTotal('user-456')).rejects.toThrow(AdminUnauthorizedError)
      expect(mockPrismaPDFExportUsage.aggregate).not.toHaveBeenCalled()
    })

    it('should throw AdminUnauthorizedError when admin session is undefined', async () => {
      const { getUserPdfExportsTotal } = await import('@/actions/pdf-tracking')
      const { AdminUnauthorizedError } = await import('@/lib/security/admin-auth')
      mockGetAdminSession.mockResolvedValue(undefined)

      await expect(getUserPdfExportsTotal('user-456')).rejects.toThrow(AdminUnauthorizedError)
      expect(mockPrismaPDFExportUsage.aggregate).not.toHaveBeenCalled()
    })

    it('should call aggregate with correct where clause for userId when admin authenticated', async () => {
      const { getUserPdfExportsTotal } = await import('@/actions/pdf-tracking')
      mockGetAdminSession.mockResolvedValue(createMockAdminSession())
      mockPrismaPDFExportUsage.aggregate.mockResolvedValue({
        _sum: { count: 10 },
      })

      await getUserPdfExportsTotal('user-456')

      expect(mockPrismaPDFExportUsage.aggregate).toHaveBeenCalledWith({
        where: { userId: 'user-456' },
        _sum: { count: true },
      })
    })

    it('should return the sum of counts when records exist', async () => {
      const { getUserPdfExportsTotal } = await import('@/actions/pdf-tracking')
      mockGetAdminSession.mockResolvedValue(createMockAdminSession())
      mockPrismaPDFExportUsage.aggregate.mockResolvedValue({
        _sum: { count: 42 },
      })

      const result = await getUserPdfExportsTotal('user-123')

      expect(result).toBe(42)
    })

    it('should return 0 when _sum.count is null (no records)', async () => {
      const { getUserPdfExportsTotal } = await import('@/actions/pdf-tracking')
      mockGetAdminSession.mockResolvedValue(createMockAdminSession())
      mockPrismaPDFExportUsage.aggregate.mockResolvedValue({
        _sum: { count: null },
      })

      const result = await getUserPdfExportsTotal('user-123')

      expect(result).toBe(0)
    })

    it('should return 0 when _sum is undefined', async () => {
      const { getUserPdfExportsTotal } = await import('@/actions/pdf-tracking')
      mockGetAdminSession.mockResolvedValue(createMockAdminSession())
      mockPrismaPDFExportUsage.aggregate.mockResolvedValue({
        _sum: {},
      })

      const result = await getUserPdfExportsTotal('user-123')

      expect(result).toBe(0)
    })

    it('should handle large totals correctly', async () => {
      const { getUserPdfExportsTotal } = await import('@/actions/pdf-tracking')
      mockGetAdminSession.mockResolvedValue(createMockAdminSession())
      mockPrismaPDFExportUsage.aggregate.mockResolvedValue({
        _sum: { count: 999999 },
      })

      const result = await getUserPdfExportsTotal('user-123')

      expect(result).toBe(999999)
    })

    it('should query with the provided userId parameter', async () => {
      const { getUserPdfExportsTotal } = await import('@/actions/pdf-tracking')
      mockGetAdminSession.mockResolvedValue(createMockAdminSession())
      mockPrismaPDFExportUsage.aggregate.mockResolvedValue({
        _sum: { count: 5 },
      })

      await getUserPdfExportsTotal('specific-user-id')

      expect(mockPrismaPDFExportUsage.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'specific-user-id' },
        }),
      )
    })

    it('should propagate database errors (not caught)', async () => {
      const { getUserPdfExportsTotal } = await import('@/actions/pdf-tracking')
      mockGetAdminSession.mockResolvedValue(createMockAdminSession())
      mockPrismaPDFExportUsage.aggregate.mockRejectedValue(new Error('Database connection failed'))

      await expect(getUserPdfExportsTotal('user-123')).rejects.toThrow('Database connection failed')
    })

    it('should allow superadmin access', async () => {
      const { getUserPdfExportsTotal } = await import('@/actions/pdf-tracking')
      mockGetAdminSession.mockResolvedValue(createMockAdminSession({ role: 'superadmin' }))
      mockPrismaPDFExportUsage.aggregate.mockResolvedValue({
        _sum: { count: 25 },
      })

      const result = await getUserPdfExportsTotal('user-123')

      expect(result).toBe(25)
    })
  })
})
