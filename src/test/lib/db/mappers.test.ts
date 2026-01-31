/**
 * Unit Tests for Database Mappers
 *
 * Tests the mapPrismaSubjectToSubject function that transforms
 * Prisma database records into application domain objects.
 *
 * @module src/lib/db/mappers
 */
import { describe, it, expect } from 'vitest'
import { mapPrismaSubjectToSubject } from '@/lib/db/mappers'
import type { Subject as PrismaSubject } from '@prisma/client'

// ============================================================================
// Helper Factory
// ============================================================================

/**
 * Creates a mock PrismaSubject with all required fields.
 * Override any field by passing partial data.
 */
function createMockPrismaSubject(overrides: Partial<PrismaSubject> = {}): PrismaSubject {
  return {
    id: 'test-uuid-123',
    name: 'Test Subject',
    birthDatetime: new Date('1990-06-15T14:30:00.000Z'),
    city: 'Rome',
    nation: 'Italy',
    latitude: 41.9028,
    longitude: 12.4964,
    timezone: 'Europe/Rome',
    rodensRating: 'AA',
    tags: '["family", "client"]',
    notes: 'Test notes',
    ownerId: 'owner-uuid-456',
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-15T12:00:00.000Z'),
    ...overrides,
  }
}

// ============================================================================
// Date to ISO String Conversion Tests
// ============================================================================

describe('mapPrismaSubjectToSubject - Date conversion', () => {
  /**
   * Tests that birthDatetime (Date object) is correctly converted
   * to birth_datetime (ISO string) for API compatibility.
   */

  it('should convert birthDatetime Date to birth_datetime ISO string', () => {
    const prismaSubject = createMockPrismaSubject({
      birthDatetime: new Date('1990-06-15T14:30:00.000Z'),
    })

    const result = mapPrismaSubjectToSubject(prismaSubject)

    expect(result.birth_datetime).toBe('1990-06-15T14:30:00.000Z')
    expect(typeof result.birth_datetime).toBe('string')
  })

  it('should preserve exact time in ISO string format', () => {
    const prismaSubject = createMockPrismaSubject({
      birthDatetime: new Date('2000-12-31T23:59:59.999Z'),
    })

    const result = mapPrismaSubjectToSubject(prismaSubject)

    expect(result.birth_datetime).toBe('2000-12-31T23:59:59.999Z')
  })

  it('should handle midnight correctly', () => {
    const prismaSubject = createMockPrismaSubject({
      birthDatetime: new Date('1985-03-20T00:00:00.000Z'),
    })

    const result = mapPrismaSubjectToSubject(prismaSubject)

    expect(result.birth_datetime).toBe('1985-03-20T00:00:00.000Z')
  })

  // Parameterized tests for various date formats
  it.each([
    [new Date('1950-01-01T00:00:00.000Z'), '1950-01-01T00:00:00.000Z'],
    [new Date('2023-07-04T12:00:00.000Z'), '2023-07-04T12:00:00.000Z'],
    [new Date('1999-12-31T23:59:59.000Z'), '1999-12-31T23:59:59.000Z'],
  ])('should convert %s to %s', (inputDate, expectedString) => {
    const prismaSubject = createMockPrismaSubject({ birthDatetime: inputDate })

    const result = mapPrismaSubjectToSubject(prismaSubject)

    expect(result.birth_datetime).toBe(expectedString)
  })
})

// ============================================================================
// Null Handling with Defaults Tests
// ============================================================================

describe('mapPrismaSubjectToSubject - Null handling with defaults', () => {
  /**
   * Tests that null values from the database are converted to sensible defaults.
   * This ensures the application always has valid data to work with.
   */

  it('should default city to empty string when null', () => {
    const prismaSubject = createMockPrismaSubject({ city: null })

    const result = mapPrismaSubjectToSubject(prismaSubject)

    expect(result.city).toBe('')
  })

  it('should default nation to empty string when null', () => {
    const prismaSubject = createMockPrismaSubject({ nation: null })

    const result = mapPrismaSubjectToSubject(prismaSubject)

    expect(result.nation).toBe('')
  })

  it('should default latitude to 0 when null', () => {
    const prismaSubject = createMockPrismaSubject({ latitude: null })

    const result = mapPrismaSubjectToSubject(prismaSubject)

    expect(result.latitude).toBe(0)
  })

  it('should default longitude to 0 when null', () => {
    const prismaSubject = createMockPrismaSubject({ longitude: null })

    const result = mapPrismaSubjectToSubject(prismaSubject)

    expect(result.longitude).toBe(0)
  })

  it('should default timezone to UTC when null', () => {
    const prismaSubject = createMockPrismaSubject({ timezone: null })

    const result = mapPrismaSubjectToSubject(prismaSubject)

    expect(result.timezone).toBe('UTC')
  })

  it('should handle all null location fields at once', () => {
    const prismaSubject = createMockPrismaSubject({
      city: null,
      nation: null,
      latitude: null,
      longitude: null,
      timezone: null,
    })

    const result = mapPrismaSubjectToSubject(prismaSubject)

    expect(result.city).toBe('')
    expect(result.nation).toBe('')
    expect(result.latitude).toBe(0)
    expect(result.longitude).toBe(0)
    expect(result.timezone).toBe('UTC')
  })

  it('should preserve non-null values unchanged', () => {
    const prismaSubject = createMockPrismaSubject({
      city: 'London',
      nation: 'UK',
      latitude: 51.5074,
      longitude: -0.1278,
      timezone: 'Europe/London',
    })

    const result = mapPrismaSubjectToSubject(prismaSubject)

    expect(result.city).toBe('London')
    expect(result.nation).toBe('UK')
    expect(result.latitude).toBe(51.5074)
    expect(result.longitude).toBe(-0.1278)
    expect(result.timezone).toBe('Europe/London')
  })
})

// ============================================================================
// JSON Tags Parsing Tests
// ============================================================================

describe('mapPrismaSubjectToSubject - JSON tags parsing', () => {
  /**
   * Tests that the tags field (stored as JSON string in DB)
   * is correctly parsed back into an array.
   */

  it('should parse valid JSON tags array', () => {
    const prismaSubject = createMockPrismaSubject({
      tags: '["family", "celebrity", "client"]',
    })

    const result = mapPrismaSubjectToSubject(prismaSubject)

    expect(result.tags).toEqual(['family', 'celebrity', 'client'])
    expect(Array.isArray(result.tags)).toBe(true)
  })

  it('should parse empty JSON array', () => {
    const prismaSubject = createMockPrismaSubject({
      tags: '[]',
    })

    const result = mapPrismaSubjectToSubject(prismaSubject)

    expect(result.tags).toEqual([])
  })

  it('should parse single-element array', () => {
    const prismaSubject = createMockPrismaSubject({
      tags: '["vip"]',
    })

    const result = mapPrismaSubjectToSubject(prismaSubject)

    expect(result.tags).toEqual(['vip'])
  })

  it('should return null when tags is null', () => {
    const prismaSubject = createMockPrismaSubject({
      tags: null,
    })

    const result = mapPrismaSubjectToSubject(prismaSubject)

    expect(result.tags).toBeNull()
  })

  it('should handle tags with special characters', () => {
    const prismaSubject = createMockPrismaSubject({
      tags: '["tag-with-dash", "tag_with_underscore", "tag with space"]',
    })

    const result = mapPrismaSubjectToSubject(prismaSubject)

    expect(result.tags).toEqual(['tag-with-dash', 'tag_with_underscore', 'tag with space'])
  })

  // Parameterized tests for various tag configurations
  it.each([
    ['["a"]', ['a']],
    ['["a", "b"]', ['a', 'b']],
    ['["family", "friend", "coworker"]', ['family', 'friend', 'coworker']],
  ])('should parse %s to %j', (jsonString, expectedArray) => {
    const prismaSubject = createMockPrismaSubject({ tags: jsonString })

    const result = mapPrismaSubjectToSubject(prismaSubject)

    expect(result.tags).toEqual(expectedArray)
  })
})

// ============================================================================
// rodensRating Type Coercion Tests
// ============================================================================

describe('mapPrismaSubjectToSubject - rodensRating coercion', () => {
  /**
   * Tests that rodensRating is correctly coerced to the Subject type.
   * The Prisma type is string | null, but Subject expects a specific union type.
   */

  it('should coerce valid rodensRating to correct type', () => {
    const prismaSubject = createMockPrismaSubject({
      rodensRating: 'AA',
    })

    const result = mapPrismaSubjectToSubject(prismaSubject)

    expect(result.rodens_rating).toBe('AA')
  })

  it('should handle null rodensRating', () => {
    const prismaSubject = createMockPrismaSubject({
      rodensRating: null,
    })

    const result = mapPrismaSubjectToSubject(prismaSubject)

    expect(result.rodens_rating).toBeNull()
  })

  // Test all valid Roden Rating values
  it.each([
    'AAA',
    'AA',
    'A',
    'AAX',
    'AN',
    'AX',
    'B',
    'CQ',
    'CR',
    'CU',
    'DD',
    'DDT',
    'TA',
    'TC',
    'TD',
    'TH',
    'X',
    'XR',
    'XX',
  ])('should coerce "%s" rating to correct type', (rating) => {
    const prismaSubject = createMockPrismaSubject({ rodensRating: rating })

    const result = mapPrismaSubjectToSubject(prismaSubject)

    expect(result.rodens_rating).toBe(rating)
  })

  it('should preserve rodensRating field name as rodens_rating in output', () => {
    const prismaSubject = createMockPrismaSubject({ rodensRating: 'A' })

    const result = mapPrismaSubjectToSubject(prismaSubject)

    // Verify the field is renamed from camelCase to snake_case
    expect('rodens_rating' in result).toBe(true)
    expect(result.rodens_rating).toBe('A')
  })
})

// ============================================================================
// Complete Mapping Tests
// ============================================================================

describe('mapPrismaSubjectToSubject - Complete mapping', () => {
  /**
   * Tests that the full subject mapping works correctly,
   * including all field transformations together.
   */

  it('should map all fields correctly for a complete subject', () => {
    const prismaSubject = createMockPrismaSubject()

    const result = mapPrismaSubjectToSubject(prismaSubject)

    expect(result).toMatchObject({
      id: 'test-uuid-123',
      name: 'Test Subject',
      birth_datetime: '1990-06-15T14:30:00.000Z',
      city: 'Rome',
      nation: 'Italy',
      latitude: 41.9028,
      longitude: 12.4964,
      timezone: 'Europe/Rome',
      rodens_rating: 'AA',
      tags: ['family', 'client'],
      notes: 'Test notes',
      ownerId: 'owner-uuid-456',
    })
  })

  it('should spread remaining Prisma fields unchanged', () => {
    const prismaSubject = createMockPrismaSubject({
      id: 'custom-id',
      name: 'Custom Name',
      notes: 'Custom notes',
      ownerId: 'custom-owner',
    })

    const result = mapPrismaSubjectToSubject(prismaSubject)

    expect(result.id).toBe('custom-id')
    expect(result.name).toBe('Custom Name')
    expect(result.notes).toBe('Custom notes')
    expect(result.ownerId).toBe('custom-owner')
  })

  it('should handle minimal subject with all nullable fields as null', () => {
    const prismaSubject = createMockPrismaSubject({
      city: null,
      nation: null,
      latitude: null,
      longitude: null,
      timezone: null,
      rodensRating: null,
      tags: null,
      notes: null,
    })

    const result = mapPrismaSubjectToSubject(prismaSubject)

    expect(result.city).toBe('')
    expect(result.nation).toBe('')
    expect(result.latitude).toBe(0)
    expect(result.longitude).toBe(0)
    expect(result.timezone).toBe('UTC')
    expect(result.rodens_rating).toBeNull()
    expect(result.tags).toBeNull()
    expect(result.notes).toBeNull()
  })
})
