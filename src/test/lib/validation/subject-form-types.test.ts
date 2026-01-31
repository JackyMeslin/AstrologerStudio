/**
 * Tests for Subject Form Type Safety
 *
 * Validates that the Zod schemas correctly work with react-hook-form
 * using z.input (form fields) and z.infer (validated output) types.
 *
 * @module src/lib/validation/subject
 */
import { describe, it, expect, vi } from 'vitest'
import {
  createSubjectSchema,
  updateSubjectSchema,
  type CreateSubjectFormInput,
  type CreateSubjectInput,
  type UpdateSubjectFormInput,
  type UpdateSubjectInput,
} from '@/lib/validation/subject'

// Mock Prisma to prevent DB access
vi.mock('@/lib/db/prisma', () => ({
  prisma: {},
  default: {},
}))

// ============================================================================
// Type assertion tests - verify input/output type relationships
// ============================================================================

describe('subject form type safety', () => {
  describe('CreateSubjectFormInput vs CreateSubjectInput', () => {
    it('should have birthDate as string in input type (form value)', () => {
      // This verifies the form input type expects strings
      const formInput: CreateSubjectFormInput = {
        name: 'Test',
        city: 'Rome',
        nation: 'Italy',
        timezone: 'Europe/Rome',
        birthDate: '1990-05-15', // Always string in form
        birthTime: '12:00:00', // Always string in form
      }

      expect(typeof formInput.birthDate).toBe('string')
      expect(typeof formInput.birthTime).toBe('string')
    })

    it('should transform birthDate/birthTime from string to string|undefined in output', () => {
      // Empty strings should become undefined after Zod transformation
      const result = createSubjectSchema.safeParse({
        name: 'Test',
        city: 'Rome',
        nation: 'Italy',
        timezone: 'Europe/Rome',
        birthDate: '', // Empty string
        birthTime: '', // Empty string
      })

      expect(result.success).toBe(true)
      if (result.success) {
        const output: CreateSubjectInput = result.data
        expect(output.birthDate).toBeUndefined()
        expect(output.birthTime).toBeUndefined()
      }
    })

    it('should preserve date/time values when provided', () => {
      const result = createSubjectSchema.safeParse({
        name: 'Test',
        city: 'Rome',
        nation: 'Italy',
        timezone: 'Europe/Rome',
        birthDate: '1990-05-15',
        birthTime: '12:00:00',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        const output: CreateSubjectInput = result.data
        expect(output.birthDate).toBeDefined()
        expect(output.birthTime).toBe('12:00:00')
      }
    })
  })

  describe('UpdateSubjectFormInput vs UpdateSubjectInput', () => {
    it('should require id and have birthDate as string in input type', () => {
      const formInput: UpdateSubjectFormInput = {
        id: 'subject-123',
        name: 'Test',
        city: 'Rome',
        nation: 'Italy',
        timezone: 'Europe/Rome',
        birthDate: '1990-05-15',
        birthTime: '12:00:00',
      }

      expect(formInput.id).toBe('subject-123')
      expect(typeof formInput.birthDate).toBe('string')
    })

    it('should transform birthDate/birthTime in update schema same as create', () => {
      const result = updateSubjectSchema.safeParse({
        id: 'subject-123',
        name: 'Test',
        city: 'Rome',
        nation: 'Italy',
        timezone: 'Europe/Rome',
        birthDate: '',
        birthTime: '',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        const output: UpdateSubjectInput = result.data
        expect(output.id).toBe('subject-123')
        expect(output.birthDate).toBeUndefined()
        expect(output.birthTime).toBeUndefined()
      }
    })
  })

  describe('zodResolver compatibility', () => {
    it('should accept form input values and output validated types', () => {
      // This test verifies the pattern used with zodResolver:
      // useForm<FormInput, unknown, ValidatedOutput>

      // Form collects string values
      const formData: CreateSubjectFormInput = {
        name: 'John Doe',
        city: 'Rome',
        nation: 'Italy',
        timezone: 'Europe/Rome',
        birthDate: '1990-05-15T00:00:00.000Z',
        birthTime: '12:30:00',
        latitude: 41.9028,
        longitude: 12.4964,
        rodens_rating: 'AA',
        tags: ['client'],
      }

      // Zod parses and validates
      const result = createSubjectSchema.safeParse(formData)

      expect(result.success).toBe(true)
      if (result.success) {
        // Output has transformed types
        const validated: CreateSubjectInput = result.data
        expect(validated.name).toBe('John Doe')
        expect(validated.birthDate).toBeDefined()
        expect(validated.birthTime).toBe('12:30:00')
      }
    })

    it('should properly handle nullable fields in form input', () => {
      const formData: CreateSubjectFormInput = {
        name: 'Test Subject',
        city: 'Rome',
        nation: 'Italy',
        timezone: 'Europe/Rome',
        birthDate: '', // Empty string, not null
        birthTime: '', // Empty string, not null
        rodens_rating: null, // Explicitly null
        tags: null, // Explicitly null
      }

      const result = createSubjectSchema.safeParse(formData)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.birthDate).toBeUndefined()
        expect(result.data.birthTime).toBeUndefined()
        expect(result.data.rodens_rating).toBeNull()
        expect(result.data.tags).toBeNull()
      }
    })
  })
})
