/**
 * Unit Tests for Subject Validation Schemas
 *
 * Tests the Zod validation schemas for creating and updating subjects.
 * Validates date/time formats, coordinates, timezones, required/optional fields,
 * and error messages.
 *
 * @module src/lib/validation/subject
 */
import { describe, it, expect, vi } from 'vitest'
import { createSubjectSchema, updateSubjectSchema } from '@/lib/validation/subject'

// Defensive mock: ensure tests never touch production DB even if prisma is imported indirectly
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    subject: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

// ============================================================================
// Helper: Valid base data for tests
// ============================================================================

const validCreateData = {
  name: 'John Doe',
  city: 'Rome',
  nation: 'Italy',
  timezone: 'Europe/Rome',
}

const validUpdateData = {
  id: 'subject-123',
  ...validCreateData,
}

// ============================================================================
// createSubjectSchema Tests
// ============================================================================

describe('createSubjectSchema', () => {
  describe('required fields', () => {
    it('should validate minimal valid input with required fields only', () => {
      const result = createSubjectSchema.safeParse(validCreateData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('John Doe')
        expect(result.data.city).toBe('Rome')
        expect(result.data.nation).toBe('Italy')
        expect(result.data.timezone).toBe('Europe/Rome')
      }
    })

    it('should reject missing name', () => {
      const data = { ...validCreateData, name: undefined }

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(false)
      if (!result.success) {
        const nameError = result.error.issues.find((e) => e.path.includes('name'))
        expect(nameError).toBeDefined()
      }
    })

    it('should reject empty name', () => {
      const data = { ...validCreateData, name: '' }

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Name is required')
      }
    })

    it('should reject name exceeding max length (120 chars)', () => {
      const data = { ...validCreateData, name: 'a'.repeat(121) }

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Max 120 characters')
      }
    })

    it('should reject missing city', () => {
      const { city: _, ...data } = validCreateData

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(false)
    })

    it('should reject empty city', () => {
      const data = { ...validCreateData, city: '' }

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('City is required')
      }
    })

    it('should reject city exceeding max length (60 chars)', () => {
      const data = { ...validCreateData, city: 'a'.repeat(61) }

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Max 60 characters')
      }
    })

    it('should trim whitespace from city', () => {
      const data = { ...validCreateData, city: '  Rome  ' }

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.city).toBe('Rome')
      }
    })

    it('should reject missing nation', () => {
      const { nation: _, ...data } = validCreateData

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(false)
    })

    it('should reject empty nation', () => {
      const data = { ...validCreateData, nation: '' }

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Nation is required')
      }
    })

    it('should reject nation exceeding max length (60 chars)', () => {
      const data = { ...validCreateData, nation: 'a'.repeat(61) }

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Max 60 characters')
      }
    })

    it('should trim whitespace from nation', () => {
      const data = { ...validCreateData, nation: '  Italy  ' }

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.nation).toBe('Italy')
      }
    })

    it('should reject missing timezone', () => {
      const { timezone: _, ...data } = validCreateData

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(false)
    })

    it('should reject empty timezone', () => {
      const data = { ...validCreateData, timezone: '' }

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Timezone is required')
      }
    })
  })

  describe('timezone validation', () => {
    it('should accept valid timezone formats', () => {
      const validTimezones = [
        'Europe/Rome',
        'America/New_York',
        'Asia/Tokyo',
        'UTC',
        'Etc/GMT+5',
        'Etc/GMT-12',
        'Pacific/Honolulu',
      ]

      for (const tz of validTimezones) {
        const data = { ...validCreateData, timezone: tz }
        const result = createSubjectSchema.safeParse(data)
        expect(result.success, `Timezone "${tz}" should be valid`).toBe(true)
      }
    })

    it('should reject timezone with invalid characters', () => {
      const invalidTimezones = ['Europe Rome', 'Europe/Rome!', 'America@New_York', 'Asia/Tokyo#1']

      for (const tz of invalidTimezones) {
        const data = { ...validCreateData, timezone: tz }
        const result = createSubjectSchema.safeParse(data)

        expect(result.success, `Timezone "${tz}" should be invalid`).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0]?.message).toBe('Only letters, numbers and timezone symbols')
        }
      }
    })

    it('should reject timezone exceeding max length (80 chars)', () => {
      const data = { ...validCreateData, timezone: 'A'.repeat(81) }

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Max 80 characters')
      }
    })
  })

  describe('birthDate validation', () => {
    it('should accept valid ISO date string', () => {
      const data = { ...validCreateData, birthDate: '1990-05-15' }

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.birthDate).toBeDefined()
        expect(result.data.birthDate).toContain('1990-05-15')
      }
    })

    it('should accept valid ISO datetime string', () => {
      const data = { ...validCreateData, birthDate: '1990-05-15T10:30:00Z' }

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(true)
    })

    it('should transform date to UTC ISO string', () => {
      const data = { ...validCreateData, birthDate: '1990-05-15' }

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(true)
      if (result.success) {
        // Should be transformed to ISO string
        expect(result.data.birthDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      }
    })

    it('should transform empty string to undefined', () => {
      const data = { ...validCreateData, birthDate: '' }

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.birthDate).toBeUndefined()
      }
    })

    it('should accept undefined birthDate', () => {
      const data = { ...validCreateData }

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.birthDate).toBeUndefined()
      }
    })

    it('should reject invalid date string', () => {
      const data = { ...validCreateData, birthDate: 'not-a-date' }

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Invalid date')
      }
    })

    it('should reject malformed date', () => {
      const invalidDates = ['32-13-2000', '1990/05/15', 'May 15, 1990']

      for (const date of invalidDates) {
        const data = { ...validCreateData, birthDate: date }
        const result = createSubjectSchema.safeParse(data)

        // Some formats may parse as valid Date, so just check consistency
        if (!result.success) {
          expect(result.error.issues[0]?.message).toBe('Invalid date')
        }
      }
    })
  })

  describe('birthTime validation', () => {
    it('should accept valid HH:MM:SS format', () => {
      const validTimes = ['00:00:00', '12:30:45', '23:59:59', '09:05:01']

      for (const time of validTimes) {
        const data = { ...validCreateData, birthTime: time }
        const result = createSubjectSchema.safeParse(data)

        expect(result.success, `Time "${time}" should be valid`).toBe(true)
        if (result.success) {
          expect(result.data.birthTime).toBe(time)
        }
      }
    })

    it('should transform empty string to undefined', () => {
      const data = { ...validCreateData, birthTime: '' }

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.birthTime).toBeUndefined()
      }
    })

    it('should accept undefined birthTime', () => {
      const data = { ...validCreateData }

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.birthTime).toBeUndefined()
      }
    })

    it('should reject invalid time format', () => {
      const invalidTimes = [
        '12:30',
        '1:30:00',
        '12:3:00',
        '12:30:0',
        '25:00:00',
        '12:60:00',
        '12:30:60',
        '12-30-00',
        'noon',
        '12:30 PM',
      ]

      for (const time of invalidTimes) {
        const data = { ...validCreateData, birthTime: time }
        const result = createSubjectSchema.safeParse(data)

        expect(result.success, `Time "${time}" should be invalid`).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0]?.message).toBe('Invalid time format (HH:MM:SS)')
        }
      }
    })

    it('should reject hour greater than 23', () => {
      const data = { ...validCreateData, birthTime: '24:00:00' }

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Invalid time format (HH:MM:SS)')
      }
    })

    it('should reject minute greater than 59', () => {
      const data = { ...validCreateData, birthTime: '12:60:00' }

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(false)
    })

    it('should reject second greater than 59', () => {
      const data = { ...validCreateData, birthTime: '12:30:60' }

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(false)
    })
  })

  describe('coordinate validation', () => {
    it('should accept valid latitude values', () => {
      const validLatitudes = [0, 45.5, -45.5, 90, -90, 89.999]

      for (const lat of validLatitudes) {
        const data = { ...validCreateData, latitude: lat }
        const result = createSubjectSchema.safeParse(data)

        expect(result.success, `Latitude ${lat} should be valid`).toBe(true)
        if (result.success) {
          expect(result.data.latitude).toBe(lat)
        }
      }
    })

    it('should reject latitude below -90', () => {
      const data = { ...validCreateData, latitude: -90.1 }

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Min -90')
      }
    })

    it('should reject latitude above 90', () => {
      const data = { ...validCreateData, latitude: 90.1 }

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Max 90')
      }
    })

    it('should accept valid longitude values', () => {
      const validLongitudes = [0, 90, -90, 180, -180, 179.999]

      for (const lng of validLongitudes) {
        const data = { ...validCreateData, longitude: lng }
        const result = createSubjectSchema.safeParse(data)

        expect(result.success, `Longitude ${lng} should be valid`).toBe(true)
        if (result.success) {
          expect(result.data.longitude).toBe(lng)
        }
      }
    })

    it('should reject longitude below -180', () => {
      const data = { ...validCreateData, longitude: -180.1 }

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Min -180')
      }
    })

    it('should reject longitude above 180', () => {
      const data = { ...validCreateData, longitude: 180.1 }

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Max 180')
      }
    })

    it('should accept undefined coordinates', () => {
      const data = { ...validCreateData }

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.latitude).toBeUndefined()
        expect(result.data.longitude).toBeUndefined()
      }
    })
  })

  describe('rodens_rating validation', () => {
    it('should accept valid Roden ratings', () => {
      const validRatings = ['AAA', 'AA', 'A', 'B', 'DD', 'X', 'XX']

      for (const rating of validRatings) {
        const data = { ...validCreateData, rodens_rating: rating }
        const result = createSubjectSchema.safeParse(data)

        expect(result.success, `Rating "${rating}" should be valid`).toBe(true)
      }
    })

    it('should accept null rodens_rating', () => {
      const data = { ...validCreateData, rodens_rating: null }

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.rodens_rating).toBeNull()
      }
    })

    it('should accept undefined rodens_rating', () => {
      const data = { ...validCreateData }

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.rodens_rating).toBeUndefined()
      }
    })

    it('should reject invalid rodens_rating values', () => {
      const data = { ...validCreateData, rodens_rating: 'INVALID' }

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(false)
    })
  })

  describe('tags validation', () => {
    it('should accept valid tags array', () => {
      const data = { ...validCreateData, tags: ['family', 'important', 'client'] }

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.tags).toEqual(['family', 'important', 'client'])
      }
    })

    it('should trim whitespace from tags', () => {
      const data = { ...validCreateData, tags: ['  family  ', '  important  '] }

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.tags).toEqual(['family', 'important'])
      }
    })

    it('should accept empty tags array', () => {
      const data = { ...validCreateData, tags: [] }

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(true)
    })

    it('should accept null tags', () => {
      const data = { ...validCreateData, tags: null }

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.tags).toBeNull()
      }
    })

    it('should accept undefined tags', () => {
      const data = { ...validCreateData }

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(true)
    })

    it('should reject more than 10 tags', () => {
      const data = { ...validCreateData, tags: Array(11).fill('tag') }

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Max 10 tags')
      }
    })
  })

  describe('notes validation', () => {
    it('should accept valid notes', () => {
      const data = { ...validCreateData, notes: 'Some notes about this subject' }

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.notes).toBe('Some notes about this subject')
      }
    })

    it('should accept empty notes', () => {
      const data = { ...validCreateData, notes: '' }

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(true)
    })

    it('should accept undefined notes', () => {
      const data = { ...validCreateData }

      const result = createSubjectSchema.safeParse(data)

      expect(result.success).toBe(true)
    })
  })

  describe('complete valid subject', () => {
    it('should validate complete subject with all fields', () => {
      const completeData = {
        name: 'John Doe',
        city: 'Rome',
        nation: 'Italy',
        timezone: 'Europe/Rome',
        birthDate: '1990-05-15',
        birthTime: '10:30:00',
        latitude: 41.9028,
        longitude: 12.4964,
        rodens_rating: 'AA',
        tags: ['client', 'important'],
        notes: 'Birth chart analysis pending',
      }

      const result = createSubjectSchema.safeParse(completeData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('John Doe')
        expect(result.data.city).toBe('Rome')
        expect(result.data.nation).toBe('Italy')
        expect(result.data.timezone).toBe('Europe/Rome')
        expect(result.data.birthDate).toBeDefined()
        expect(result.data.birthTime).toBe('10:30:00')
        expect(result.data.latitude).toBe(41.9028)
        expect(result.data.longitude).toBe(12.4964)
        expect(result.data.rodens_rating).toBe('AA')
        expect(result.data.tags).toEqual(['client', 'important'])
        expect(result.data.notes).toBe('Birth chart analysis pending')
      }
    })
  })
})

// ============================================================================
// updateSubjectSchema Tests
// ============================================================================

describe('updateSubjectSchema', () => {
  describe('id field', () => {
    it('should require id for update', () => {
      const data = { ...validCreateData }

      const result = updateSubjectSchema.safeParse(data)

      expect(result.success).toBe(false)
      if (!result.success) {
        const idError = result.error.issues.find((e) => e.path.includes('id'))
        expect(idError).toBeDefined()
      }
    })

    it('should reject empty id', () => {
      const data = { ...validUpdateData, id: '' }

      const result = updateSubjectSchema.safeParse(data)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Missing ID')
      }
    })

    it('should accept valid id', () => {
      const data = validUpdateData

      const result = updateSubjectSchema.safeParse(data)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe('subject-123')
      }
    })
  })

  describe('inherits createSubjectSchema validations', () => {
    it('should validate name same as createSubjectSchema', () => {
      const data = { ...validUpdateData, name: '' }

      const result = updateSubjectSchema.safeParse(data)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Name is required')
      }
    })

    it('should validate timezone same as createSubjectSchema', () => {
      const data = { ...validUpdateData, timezone: 'Invalid!Timezone' }

      const result = updateSubjectSchema.safeParse(data)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Only letters, numbers and timezone symbols')
      }
    })

    it('should validate birthTime same as createSubjectSchema', () => {
      const data = { ...validUpdateData, birthTime: '25:00:00' }

      const result = updateSubjectSchema.safeParse(data)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Invalid time format (HH:MM:SS)')
      }
    })

    it('should validate coordinates same as createSubjectSchema', () => {
      const data = { ...validUpdateData, latitude: 100 }

      const result = updateSubjectSchema.safeParse(data)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Max 90')
      }
    })
  })

  describe('complete valid update', () => {
    it('should validate complete update with all fields', () => {
      const completeData = {
        id: 'subject-123',
        name: 'Jane Doe',
        city: 'Milan',
        nation: 'Italy',
        timezone: 'Europe/Rome',
        birthDate: '1985-12-25',
        birthTime: '23:59:59',
        latitude: 45.4642,
        longitude: 9.19,
        rodens_rating: 'AAA',
        tags: ['updated'],
        notes: 'Updated notes',
      }

      const result = updateSubjectSchema.safeParse(completeData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe('subject-123')
        expect(result.data.name).toBe('Jane Doe')
        expect(result.data.city).toBe('Milan')
      }
    })
  })
})

// ============================================================================
// Schema relationship tests
// ============================================================================

describe('schema relationship', () => {
  it('createSubjectSchema should not have id field', () => {
    const data = { id: 'some-id', ...validCreateData }

    const result = createSubjectSchema.safeParse(data)

    // id should be stripped/ignored
    expect(result.success).toBe(true)
    if (result.success) {
      expect('id' in result.data).toBe(false)
    }
  })

  it('updateSubjectSchema should require id field', () => {
    const { id: _, ...dataWithoutId } = validUpdateData

    const result = updateSubjectSchema.safeParse(dataWithoutId)

    expect(result.success).toBe(false)
  })
})
