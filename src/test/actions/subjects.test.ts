/**
 * Unit Tests for Subject Actions
 *
 * Tests the subject server actions including CRUD operations,
 * import functionality, and plan limit enforcement.
 *
 * @module src/actions/subjects
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// ============================================================================
// MOCKS
// ============================================================================

// Mock prisma subject operations
const mockPrismaSubject = {
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
  count: vi.fn(),
}

// Mock prisma user operations
const mockPrismaUser = {
  findUnique: vi.fn(),
  update: vi.fn(),
}

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    subject: {
      get findMany() {
        return mockPrismaSubject.findMany
      },
      get findFirst() {
        return mockPrismaSubject.findFirst
      },
      get create() {
        return mockPrismaSubject.create
      },
      get update() {
        return mockPrismaSubject.update
      },
      get delete() {
        return mockPrismaSubject.delete
      },
      get deleteMany() {
        return mockPrismaSubject.deleteMany
      },
      get count() {
        return mockPrismaSubject.count
      },
    },
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

// Mock auth helper (withAuth)
const mockSession = { userId: 'user-123', username: 'testuser' }
const mockWithAuth = vi.fn()

// Custom error classes matching the original
class MockUnauthorizedError extends Error {
  constructor(message = 'Authentication required') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

class MockForbiddenError extends Error {
  constructor(message = 'Access denied') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

class MockNotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message)
    this.name = 'NotFoundError'
  }
}

class MockValidationError extends Error {
  public readonly errors: string[]
  constructor(message = 'Validation failed', errors: string[] = []) {
    super(message)
    this.name = 'ValidationError'
    this.errors = errors
  }
}

vi.mock('@/lib/security/auth', () => ({
  withAuth: (fn: (session: { userId: string; username: string }) => Promise<unknown>) => mockWithAuth(fn),
  UnauthorizedError: MockUnauthorizedError,
  ForbiddenError: MockForbiddenError,
  NotFoundError: MockNotFoundError,
  ValidationError: MockValidationError,
}))

// Mock plan limits
const mockCanCreateSubject = vi.fn()
const mockGetPlanLimits = vi.fn()

vi.mock('@/lib/subscription/plan-limits', () => ({
  canCreateSubject: (plan: string, count: number) => mockCanCreateSubject(plan, count),
  getPlanLimits: (plan: string) => mockGetPlanLimits(plan),
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

/**
 * Valid UUID for test subjects
 */
const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000'
const VALID_UUID_2 = '223e4567-e89b-12d3-a456-426614174001'
const VALID_UUID_3 = '323e4567-e89b-12d3-a456-426614174002'

/**
 * Base Prisma subject for tests
 */
const basePrismaSubject = {
  id: VALID_UUID,
  name: 'Test Subject',
  birthDatetime: new Date('1990-06-15T10:30:00.000Z'),
  city: 'Rome',
  nation: 'Italy',
  latitude: 41.9028,
  longitude: 12.4964,
  timezone: 'Europe/Rome',
  rodensRating: 'AA',
  tags: '["test","astrology"]',
  notes: 'Test notes',
  ownerId: 'user-123',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

/**
 * Valid CreateSubjectInput for tests
 */
const validCreateInput = {
  name: 'New Subject',
  birthDate: '1990-06-15',
  birthTime: '10:30:00',
  city: 'Rome',
  nation: 'Italy',
  latitude: 41.9028,
  longitude: 12.4964,
  timezone: 'Europe/Rome',
  rodens_rating: 'AA' as const,
  tags: ['test'],
  notes: 'Test notes',
}

/**
 * Setup withAuth mock to execute the function with a session
 */
function setupWithAuthMock() {
  mockWithAuth.mockImplementation(async (fn: (session: { userId: string; username: string }) => Promise<unknown>) => {
    return fn(mockSession)
  })
}

/**
 * Setup user mock for plan limit checks
 */
function setupUserMockWithPlan(plan: string = 'free', subjectCount: number = 0) {
  mockPrismaUser.findUnique.mockResolvedValue({
    id: mockSession.userId,
    subscriptionPlan: plan,
    _count: { subjects: subjectCount },
  })
}

// ============================================================================
// TESTS
// ============================================================================

describe('Subject Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupWithAuthMock()
    mockCanCreateSubject.mockReturnValue(true)
    mockGetPlanLimits.mockReturnValue({ maxSubjects: 5 })
  })

  // ==========================================================================
  // getSubjects TESTS
  // ==========================================================================

  describe('getSubjects', () => {
    it('should query with where: { ownerId: session.userId }', async () => {
      const { getSubjects } = await import('@/actions/subjects')
      mockPrismaSubject.findMany.mockResolvedValue([basePrismaSubject])

      await getSubjects()

      expect(mockPrismaSubject.findMany).toHaveBeenCalledWith({
        where: { ownerId: mockSession.userId },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('should return array of mapped subjects', async () => {
      const { getSubjects } = await import('@/actions/subjects')
      mockPrismaSubject.findMany.mockResolvedValue([basePrismaSubject])

      const result = await getSubjects()

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: VALID_UUID,
        name: 'Test Subject',
        birth_datetime: '1990-06-15T10:30:00.000Z',
        city: 'Rome',
        nation: 'Italy',
        latitude: 41.9028,
        longitude: 12.4964,
        timezone: 'Europe/Rome',
        rodens_rating: 'AA',
        tags: ['test', 'astrology'],
      })
    })

    it('should return empty array when no subjects exist', async () => {
      const { getSubjects } = await import('@/actions/subjects')
      mockPrismaSubject.findMany.mockResolvedValue([])

      const result = await getSubjects()

      expect(result).toEqual([])
    })

    it('should map Prisma fields correctly using mapPrismaSubjectToSubject', async () => {
      const { getSubjects } = await import('@/actions/subjects')
      const prismaSubject = {
        ...basePrismaSubject,
        city: null,
        nation: null,
        latitude: null,
        longitude: null,
        timezone: null,
        rodensRating: null,
        tags: null,
      }
      mockPrismaSubject.findMany.mockResolvedValue([prismaSubject])

      const result = await getSubjects()

      expect(result[0]).toMatchObject({
        city: '',
        nation: '',
        latitude: 0,
        longitude: 0,
        timezone: 'UTC',
        rodens_rating: null,
        tags: null,
      })
    })
  })

  // ==========================================================================
  // getSubjectById TESTS
  // ==========================================================================

  describe('getSubjectById', () => {
    it('should return Subject for valid id owned by user', async () => {
      const { getSubjectById } = await import('@/actions/subjects')
      mockPrismaSubject.findFirst.mockResolvedValue(basePrismaSubject)

      const result = await getSubjectById(VALID_UUID)

      expect(result).toMatchObject({
        id: VALID_UUID,
        name: 'Test Subject',
        birth_datetime: '1990-06-15T10:30:00.000Z',
      })
      expect(mockPrismaSubject.findFirst).toHaveBeenCalledWith({
        where: {
          id: VALID_UUID,
          ownerId: mockSession.userId,
        },
      })
    })

    it('should return null for non-existent id', async () => {
      const { getSubjectById } = await import('@/actions/subjects')
      mockPrismaSubject.findFirst.mockResolvedValue(null)

      const result = await getSubjectById('non-existent-id')

      expect(result).toBeNull()
    })

    it('should return null for subject owned by another user', async () => {
      const { getSubjectById } = await import('@/actions/subjects')
      // findFirst returns null because ownerId doesn't match
      mockPrismaSubject.findFirst.mockResolvedValue(null)

      const result = await getSubjectById('other-user-subject')

      expect(result).toBeNull()
      expect(mockPrismaSubject.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'other-user-subject',
          ownerId: mockSession.userId,
        },
      })
    })
  })

  // ==========================================================================
  // createSubject TESTS
  // ==========================================================================

  describe('createSubject', () => {
    beforeEach(() => {
      setupUserMockWithPlan('free', 0)
      mockCanCreateSubject.mockReturnValue(true)
    })

    it('should create subject with valid data', async () => {
      const { createSubject } = await import('@/actions/subjects')
      mockPrismaSubject.create.mockResolvedValue({
        ...basePrismaSubject,
        name: validCreateInput.name,
      })

      const result = await createSubject(validCreateInput)

      expect(result).toMatchObject({
        name: validCreateInput.name,
      })
      expect(mockPrismaSubject.create).toHaveBeenCalled()
      expect(mockRevalidatePath).toHaveBeenCalledWith('/subjects')
    })

    it('should parse birthDate/birthTime with parseBirthDateTime', async () => {
      const { createSubject } = await import('@/actions/subjects')
      mockPrismaSubject.create.mockResolvedValue(basePrismaSubject)

      await createSubject({
        ...validCreateInput,
        birthDate: '1990-06-15',
        birthTime: '10:30:00',
      })

      // Verify birthDatetime was parsed correctly
      expect(mockPrismaSubject.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            birthDatetime: new Date('1990-06-15T10:30:00.000Z'),
          }),
        }),
      )
    })

    it('should set ownerId from session', async () => {
      const { createSubject } = await import('@/actions/subjects')
      mockPrismaSubject.create.mockResolvedValue(basePrismaSubject)

      await createSubject(validCreateInput)

      expect(mockPrismaSubject.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ownerId: mockSession.userId,
          }),
        }),
      )
    })

    it('should throw ForbiddenError when canCreateSubject returns false', async () => {
      const { createSubject } = await import('@/actions/subjects')
      const { ForbiddenError } = await import('@/lib/security/auth')

      mockCanCreateSubject.mockReturnValue(false)
      mockGetPlanLimits.mockReturnValue({ maxSubjects: 5 })

      await expect(createSubject(validCreateInput)).rejects.toThrow(ForbiddenError)
      expect(mockPrismaSubject.create).not.toHaveBeenCalled()
    })

    it('should throw ValidationError for invalid birth date', async () => {
      const { createSubject } = await import('@/actions/subjects')
      const { ValidationError } = await import('@/lib/security/auth')

      await expect(
        createSubject({
          ...validCreateInput,
          birthDate: 'invalid-date',
        }),
      ).rejects.toThrow(ValidationError)
    })

    it('should throw error when user not found', async () => {
      const { createSubject } = await import('@/actions/subjects')
      mockPrismaUser.findUnique.mockResolvedValue(null)

      await expect(createSubject(validCreateInput)).rejects.toThrow('User not found')
    })

    it('should stringify tags as JSON', async () => {
      const { createSubject } = await import('@/actions/subjects')
      mockPrismaSubject.create.mockResolvedValue(basePrismaSubject)

      await createSubject({
        ...validCreateInput,
        tags: ['tag1', 'tag2'],
      })

      expect(mockPrismaSubject.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tags: '["tag1","tag2"]',
          }),
        }),
      )
    })
  })

  // ==========================================================================
  // findOrCreateSubject TESTS
  // ==========================================================================

  describe('findOrCreateSubject', () => {
    beforeEach(() => {
      setupUserMockWithPlan('free', 0)
      mockCanCreateSubject.mockReturnValue(true)
    })

    it('should return existing subject if match found on name + birthDatetime', async () => {
      const { findOrCreateSubject } = await import('@/actions/subjects')
      mockPrismaSubject.findFirst.mockResolvedValue(basePrismaSubject)

      const result = await findOrCreateSubject({
        ...validCreateInput,
        name: 'Test Subject',
        birthDate: '1990-06-15',
        birthTime: '10:30:00',
      })

      expect(result.id).toBe(VALID_UUID)
      expect(mockPrismaSubject.create).not.toHaveBeenCalled()
      // Verify the query includes name and birthDatetime
      expect(mockPrismaSubject.findFirst).toHaveBeenCalledWith({
        where: {
          ownerId: mockSession.userId,
          name: 'Test Subject',
          birthDatetime: new Date('1990-06-15T10:30:00.000Z'),
        },
      })
    })

    it('should create new subject if no match found', async () => {
      const { findOrCreateSubject } = await import('@/actions/subjects')
      mockPrismaSubject.findFirst.mockResolvedValue(null)
      mockPrismaSubject.create.mockResolvedValue({
        ...basePrismaSubject,
        id: 'new-subject-id',
        name: 'New Subject',
      })

      const result = await findOrCreateSubject(validCreateInput)

      expect(result.id).toBe('new-subject-id')
      expect(mockPrismaSubject.create).toHaveBeenCalled()
    })

    it('should throw ForbiddenError when plan limit reached and creating new', async () => {
      const { findOrCreateSubject } = await import('@/actions/subjects')
      const { ForbiddenError } = await import('@/lib/security/auth')

      mockPrismaSubject.findFirst.mockResolvedValue(null)
      mockCanCreateSubject.mockReturnValue(false)
      mockGetPlanLimits.mockReturnValue({ maxSubjects: 5 })

      await expect(findOrCreateSubject(validCreateInput)).rejects.toThrow(ForbiddenError)
    })
  })

  // ==========================================================================
  // updateSubject TESTS
  // ==========================================================================

  describe('updateSubject', () => {
    it('should update subject with valid data', async () => {
      const { updateSubject } = await import('@/actions/subjects')
      mockPrismaSubject.findFirst.mockResolvedValue({ id: VALID_UUID })
      mockPrismaSubject.update.mockResolvedValue({
        ...basePrismaSubject,
        name: 'Updated Name',
      })

      const result = await updateSubject({
        id: VALID_UUID,
        name: 'Updated Name',
        city: 'Rome',
        nation: 'Italy',
        timezone: 'Europe/Rome',
        birthDate: '',
        birthTime: '',
      })

      expect(result.name).toBe('Updated Name')
      expect(mockRevalidatePath).toHaveBeenCalledWith('/subjects')
    })

    it('should verify ownership before updating', async () => {
      const { updateSubject } = await import('@/actions/subjects')
      mockPrismaSubject.findFirst.mockResolvedValue({ id: VALID_UUID })
      mockPrismaSubject.update.mockResolvedValue(basePrismaSubject)

      await updateSubject({
        id: VALID_UUID,
        name: 'Updated Name',
        city: 'Rome',
        nation: 'Italy',
        timezone: 'Europe/Rome',
        birthDate: '',
        birthTime: '',
      })

      expect(mockPrismaSubject.findFirst).toHaveBeenCalledWith({
        where: {
          id: VALID_UUID,
          ownerId: mockSession.userId,
        },
        select: { id: true },
      })
    })

    it('should throw NotFoundError for non-existent subject', async () => {
      const { updateSubject } = await import('@/actions/subjects')
      const { NotFoundError } = await import('@/lib/security/auth')

      mockPrismaSubject.findFirst.mockResolvedValue(null)

      await expect(
        updateSubject({
          id: VALID_UUID,
          name: 'Name',
          city: 'City',
          nation: 'Nation',
          timezone: 'UTC',
          birthDate: '',
          birthTime: '',
        }),
      ).rejects.toThrow(NotFoundError)
    })

    it('should parse birthDate/birthTime when provided', async () => {
      const { updateSubject } = await import('@/actions/subjects')
      mockPrismaSubject.findFirst.mockResolvedValue({ id: VALID_UUID })
      mockPrismaSubject.update.mockResolvedValue(basePrismaSubject)

      await updateSubject({
        id: VALID_UUID,
        name: 'Name',
        city: 'City',
        nation: 'Nation',
        timezone: 'UTC',
        birthDate: '1991-01-01',
        birthTime: '12:00:00',
      })

      expect(mockPrismaSubject.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            birthDatetime: new Date('1991-01-01T12:00:00.000Z'),
          }),
        }),
      )
    })
  })

  // ==========================================================================
  // deleteSubject TESTS
  // ==========================================================================

  describe('deleteSubject', () => {
    it('should delete subject owned by user', async () => {
      const { deleteSubject } = await import('@/actions/subjects')
      mockPrismaSubject.deleteMany.mockResolvedValue({ count: 1 })

      const result = await deleteSubject(VALID_UUID)

      expect(result).toEqual({ id: VALID_UUID })
      expect(mockPrismaSubject.deleteMany).toHaveBeenCalledWith({
        where: {
          id: VALID_UUID,
          ownerId: mockSession.userId,
        },
      })
      expect(mockRevalidatePath).toHaveBeenCalledWith('/subjects')
    })

    it('should throw NotFoundError when subject not found or not owned', async () => {
      const { deleteSubject } = await import('@/actions/subjects')
      const { NotFoundError } = await import('@/lib/security/auth')

      mockPrismaSubject.deleteMany.mockResolvedValue({ count: 0 })

      // Use a valid UUID that doesn't exist in the database
      await expect(deleteSubject('999e4567-e89b-12d3-a456-426614174999')).rejects.toThrow(NotFoundError)
    })
  })

  // ==========================================================================
  // deleteSubjects TESTS
  // ==========================================================================

  describe('deleteSubjects', () => {
    it('should delete multiple subjects with where: { id: { in: ids }, ownerId: session.userId }', async () => {
      const { deleteSubjects } = await import('@/actions/subjects')
      const ids = [VALID_UUID, VALID_UUID_2, VALID_UUID_3]
      mockPrismaSubject.deleteMany.mockResolvedValue({ count: 3 })

      const result = await deleteSubjects(ids)

      expect(result).toEqual({ count: 3 })
      expect(mockPrismaSubject.deleteMany).toHaveBeenCalledWith({
        where: {
          id: { in: ids },
          ownerId: mockSession.userId,
        },
      })
      expect(mockRevalidatePath).toHaveBeenCalledWith('/subjects')
    })

    it('should return count of actually deleted subjects', async () => {
      const { deleteSubjects } = await import('@/actions/subjects')
      const ids = [VALID_UUID, VALID_UUID_2, VALID_UUID_3]
      mockPrismaSubject.deleteMany.mockResolvedValue({ count: 2 })

      const result = await deleteSubjects(ids)

      expect(result).toEqual({ count: 2 })
    })
  })

  // ==========================================================================
  // importSubjects TESTS
  // ==========================================================================

  describe('importSubjects', () => {
    beforeEach(() => {
      mockPrismaUser.findUnique.mockResolvedValue({
        id: mockSession.userId,
        subscriptionPlan: 'pro',
      })
      mockGetPlanLimits.mockReturnValue({ maxSubjects: Infinity })
      mockPrismaSubject.findMany.mockResolvedValue([])
    })

    it('should import valid subjects', async () => {
      const { importSubjects } = await import('@/actions/subjects')
      mockPrismaSubject.create.mockResolvedValue(basePrismaSubject)

      const result = await importSubjects([validCreateInput])

      expect(result.created).toBe(1)
      expect(result.skipped).toBe(0)
      expect(result.failed).toBe(0)
      expect(result.errors).toEqual([])
      expect(mockRevalidatePath).toHaveBeenCalledWith('/subjects')
    })

    it('should skip duplicates based on createSubjectSignature (name + birthDatetime)', async () => {
      const { importSubjects } = await import('@/actions/subjects')

      // Existing subject with same name + birthDatetime
      mockPrismaSubject.findMany.mockResolvedValue([
        {
          name: 'New Subject',
          birthDatetime: new Date('1990-06-15T10:30:00.000Z'),
        },
      ])

      const result = await importSubjects([validCreateInput])

      expect(result.created).toBe(0)
      expect(result.skipped).toBe(1)
      expect(mockPrismaSubject.create).not.toHaveBeenCalled()
    })

    it('should respect plan limits', async () => {
      const { importSubjects } = await import('@/actions/subjects')

      // User at limit (5 subjects, max 5)
      mockPrismaSubject.findMany.mockResolvedValue(
        Array(5)
          .fill(null)
          .map((_, i) => ({
            name: `Subject ${i}`,
            birthDatetime: new Date(`199${i}-01-01T00:00:00Z`),
          })),
      )
      mockGetPlanLimits.mockReturnValue({ maxSubjects: 5 })

      const result = await importSubjects([validCreateInput])

      expect(result.created).toBe(0)
      expect(result.failed).toBe(1)
      expect(result.errors).toContain('Subject limit reached. Upgrade to import more subjects.')
    })

    it('should handle mixed valid, duplicate, and failed imports', async () => {
      const { importSubjects } = await import('@/actions/subjects')

      // One existing subject
      mockPrismaSubject.findMany.mockResolvedValue([
        {
          name: 'Existing Subject',
          birthDatetime: new Date('1985-01-01T00:00:00.000Z'),
        },
      ])
      mockPrismaSubject.create.mockResolvedValue(basePrismaSubject)

      const subjects = [
        validCreateInput, // Will be created
        {
          ...validCreateInput,
          name: 'Existing Subject',
          birthDate: '1985-01-01',
          birthTime: '00:00:00',
        }, // Will be skipped (duplicate)
        { ...validCreateInput, birthDate: 'invalid-date' }, // Will fail
      ]

      const result = await importSubjects(subjects)

      expect(result.created).toBe(1)
      expect(result.skipped).toBe(1)
      expect(result.failed).toBe(1)
    })

    it('should prevent duplicates within the same batch', async () => {
      const { importSubjects } = await import('@/actions/subjects')
      mockPrismaSubject.create.mockResolvedValue(basePrismaSubject)

      // Same subject twice in one batch
      const result = await importSubjects([validCreateInput, validCreateInput])

      expect(result.created).toBe(1)
      expect(result.skipped).toBe(1)
      expect(mockPrismaSubject.create).toHaveBeenCalledTimes(1)
    })

    it('should not revalidate path if no subjects created', async () => {
      const { importSubjects } = await import('@/actions/subjects')

      // All duplicates
      mockPrismaSubject.findMany.mockResolvedValue([
        {
          name: validCreateInput.name,
          birthDatetime: new Date('1990-06-15T10:30:00.000Z'),
        },
      ])

      await importSubjects([validCreateInput])

      expect(mockRevalidatePath).not.toHaveBeenCalled()
    })

    it('should throw error when user not found', async () => {
      const { importSubjects } = await import('@/actions/subjects')
      mockPrismaUser.findUnique.mockResolvedValue(null)

      await expect(importSubjects([validCreateInput])).rejects.toThrow('User not found')
    })

    it('should handle invalid date/time format for imported subject', async () => {
      const { importSubjects } = await import('@/actions/subjects')
      mockPrismaSubject.create.mockResolvedValue(basePrismaSubject)

      const result = await importSubjects([
        {
          ...validCreateInput,
          birthDate: '1990-06-15',
          birthTime: 'invalid-time-format',
        },
      ])

      expect(result.failed).toBe(1)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0]).toContain('Invalid')
    })
  })

  // ==========================================================================
  // updateSubject ERROR HANDLING TESTS
  // ==========================================================================

  describe('updateSubject error handling', () => {
    it('should throw ValidationError for invalid birth date/time format', async () => {
      const { updateSubject } = await import('@/actions/subjects')
      const { ValidationError } = await import('@/lib/security/auth')
      mockPrismaSubject.findFirst.mockResolvedValue({ id: VALID_UUID })

      await expect(
        updateSubject({
          id: VALID_UUID,
          name: 'Test',
          city: 'City',
          nation: 'Nation',
          timezone: 'UTC',
          birthDate: 'invalid-date',
          birthTime: '10:00:00',
        }),
      ).rejects.toThrow(ValidationError)
    })
  })

  // ==========================================================================
  // findOrCreateSubject ERROR HANDLING TESTS
  // ==========================================================================

  describe('findOrCreateSubject error handling', () => {
    it('should throw error when user not found', async () => {
      const { findOrCreateSubject } = await import('@/actions/subjects')
      mockPrismaSubject.findFirst.mockResolvedValue(null)
      mockPrismaUser.findUnique.mockResolvedValue(null)

      await expect(findOrCreateSubject(validCreateInput)).rejects.toThrow('User not found')
    })
  })

  // ==========================================================================
  // RUNTIME VALIDATION TESTS
  // ==========================================================================

  describe('runtime input validation', () => {
    beforeEach(() => {
      setupUserMockWithPlan('free', 0)
      mockCanCreateSubject.mockReturnValue(true)
    })

    describe('createSubject validation', () => {
      it('should throw ValidationError for missing required fields', async () => {
        const { createSubject } = await import('@/actions/subjects')
        const { ValidationError } = await import('@/lib/security/auth')

        const invalidInput = {
          name: '',
          city: 'Rome',
          nation: 'Italy',
          timezone: 'Europe/Rome',
        }

        await expect(createSubject(invalidInput as never)).rejects.toThrow(ValidationError)
      })

      it('should throw ValidationError for invalid timezone format', async () => {
        const { createSubject } = await import('@/actions/subjects')
        const { ValidationError } = await import('@/lib/security/auth')

        const invalidInput = {
          ...validCreateInput,
          timezone: 'Invalid!Timezone@',
        }

        await expect(createSubject(invalidInput as never)).rejects.toThrow(ValidationError)
      })

      it('should throw ValidationError for latitude out of range', async () => {
        const { createSubject } = await import('@/actions/subjects')
        const { ValidationError } = await import('@/lib/security/auth')

        const invalidInput = {
          ...validCreateInput,
          latitude: 100, // Out of range
        }

        await expect(createSubject(invalidInput as never)).rejects.toThrow(ValidationError)
      })

      it('should throw ValidationError for longitude out of range', async () => {
        const { createSubject } = await import('@/actions/subjects')
        const { ValidationError } = await import('@/lib/security/auth')

        const invalidInput = {
          ...validCreateInput,
          longitude: 200, // Out of range
        }

        await expect(createSubject(invalidInput as never)).rejects.toThrow(ValidationError)
      })

      it('should throw ValidationError for name exceeding max length', async () => {
        const { createSubject } = await import('@/actions/subjects')
        const { ValidationError } = await import('@/lib/security/auth')

        const invalidInput = {
          ...validCreateInput,
          name: 'a'.repeat(121), // Exceeds 120 char limit
        }

        await expect(createSubject(invalidInput as never)).rejects.toThrow(ValidationError)
      })
    })

    describe('updateSubject validation', () => {
      it('should throw ValidationError for empty id', async () => {
        const { updateSubject } = await import('@/actions/subjects')
        const { ValidationError } = await import('@/lib/security/auth')

        const invalidInput = {
          id: '',
          name: 'Test',
          city: 'Rome',
          nation: 'Italy',
          timezone: 'Europe/Rome',
        }

        await expect(updateSubject(invalidInput as never)).rejects.toThrow(ValidationError)
      })

      it('should throw ValidationError for invalid rodens_rating', async () => {
        const { updateSubject } = await import('@/actions/subjects')
        const { ValidationError } = await import('@/lib/security/auth')

        const invalidInput = {
          id: VALID_UUID,
          name: 'Test',
          city: 'Rome',
          nation: 'Italy',
          timezone: 'Europe/Rome',
          rodens_rating: 'INVALID_RATING',
        }

        await expect(updateSubject(invalidInput as never)).rejects.toThrow(ValidationError)
      })

      it('should throw ValidationError for too many tags', async () => {
        const { updateSubject } = await import('@/actions/subjects')
        const { ValidationError } = await import('@/lib/security/auth')

        const invalidInput = {
          id: VALID_UUID,
          name: 'Test',
          city: 'Rome',
          nation: 'Italy',
          timezone: 'Europe/Rome',
          tags: Array(11).fill('tag'), // Exceeds 10 tag limit
        }

        await expect(updateSubject(invalidInput as never)).rejects.toThrow(ValidationError)
      })
    })

    describe('deleteSubject validation', () => {
      it('should throw ValidationError for invalid UUID', async () => {
        const { deleteSubject } = await import('@/actions/subjects')
        const { ValidationError } = await import('@/lib/security/auth')

        await expect(deleteSubject('not-a-uuid')).rejects.toThrow(ValidationError)
      })

      it('should accept valid UUID', async () => {
        const { deleteSubject } = await import('@/actions/subjects')
        mockPrismaSubject.deleteMany.mockResolvedValue({ count: 1 })

        const validUUID = '123e4567-e89b-12d3-a456-426614174000'
        const result = await deleteSubject(validUUID)

        expect(result).toEqual({ id: validUUID })
      })
    })

    describe('deleteSubjects validation', () => {
      it('should throw ValidationError for empty array', async () => {
        const { deleteSubjects } = await import('@/actions/subjects')
        const { ValidationError } = await import('@/lib/security/auth')

        await expect(deleteSubjects([])).rejects.toThrow(ValidationError)
      })

      it('should throw ValidationError for array with invalid UUIDs', async () => {
        const { deleteSubjects } = await import('@/actions/subjects')
        const { ValidationError } = await import('@/lib/security/auth')

        await expect(deleteSubjects(['not-a-uuid', 'also-not-valid'])).rejects.toThrow(ValidationError)
      })

      it('should accept valid UUID array', async () => {
        const { deleteSubjects } = await import('@/actions/subjects')
        mockPrismaSubject.deleteMany.mockResolvedValue({ count: 2 })

        const validUUIDs = ['123e4567-e89b-12d3-a456-426614174000', '223e4567-e89b-12d3-a456-426614174001']
        const result = await deleteSubjects(validUUIDs)

        expect(result).toEqual({ count: 2 })
      })
    })

    describe('importSubjects validation', () => {
      beforeEach(() => {
        mockPrismaUser.findUnique.mockResolvedValue({
          id: mockSession.userId,
          subscriptionPlan: 'pro',
        })
        mockGetPlanLimits.mockReturnValue({ maxSubjects: Infinity })
        mockPrismaSubject.findMany.mockResolvedValue([])
      })

      it('should throw ValidationError for non-array input', async () => {
        const { importSubjects } = await import('@/actions/subjects')
        const { ValidationError } = await import('@/lib/security/auth')

        await expect(importSubjects('not-an-array' as never)).rejects.toThrow(ValidationError)
      })

      it('should validate each subject in array and report errors', async () => {
        const { importSubjects } = await import('@/actions/subjects')
        mockPrismaSubject.create.mockResolvedValue({
          ...validCreateInput,
          id: 'new-id',
          birthDatetime: new Date('1990-06-15T10:30:00Z'),
          ownerId: mockSession.userId,
        })

        const subjects = [
          validCreateInput,
          {
            ...validCreateInput,
            name: '', // Invalid - empty name
          },
        ]

        const result = await importSubjects(subjects)

        expect(result.created).toBe(1)
        expect(result.failed).toBe(1)
        expect(result.errors.length).toBeGreaterThan(0)
        expect(result.errors[0]).toContain('Subject #2')
      })

      it('should continue processing after validation failure for individual subjects', async () => {
        const { importSubjects } = await import('@/actions/subjects')
        mockPrismaSubject.create.mockResolvedValue({
          ...validCreateInput,
          id: 'new-id',
          birthDatetime: new Date('1990-06-15T10:30:00Z'),
          ownerId: mockSession.userId,
        })

        const subjects = [
          {
            ...validCreateInput,
            latitude: 999, // Invalid - out of range
          },
          validCreateInput, // Valid
        ]

        const result = await importSubjects(subjects)

        expect(result.created).toBe(1)
        expect(result.failed).toBe(1)
      })
    })
  })
})
