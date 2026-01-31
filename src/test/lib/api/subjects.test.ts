/**
 * Unit Tests for lib/api/subjects
 *
 * Tests that all API functions correctly forward parameters to their
 * corresponding server actions and propagate errors appropriately.
 *
 * @module src/lib/api/subjects
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock @/actions/subjects before importing the module under test
vi.mock('@/actions/subjects', () => ({
  getSubjects: vi.fn(),
  createSubject: vi.fn(),
  updateSubject: vi.fn(),
  deleteSubject: vi.fn(),
  deleteSubjects: vi.fn(),
  importSubjects: vi.fn(),
}))

// Mock prisma to prevent any DB access (defensive)
vi.mock('@/lib/db/prisma', () => ({
  prisma: {},
  default: {},
}))

import {
  fetchRandomSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  deleteSubjects,
  importSubjects,
} from '@/lib/api/subjects'

import {
  getSubjects as getSubjectsAction,
  createSubject as createSubjectAction,
  updateSubject as updateSubjectAction,
  deleteSubject as deleteSubjectAction,
  deleteSubjects as deleteSubjectsAction,
  importSubjects as importSubjectsAction,
} from '@/actions/subjects'

import type { Subject, CreateSubjectInput, UpdateSubjectInput } from '@/types/subjects'

// Cast mocked functions
const mockedGetSubjects = getSubjectsAction as ReturnType<typeof vi.fn>
const mockedCreateSubject = createSubjectAction as ReturnType<typeof vi.fn>
const mockedUpdateSubject = updateSubjectAction as ReturnType<typeof vi.fn>
const mockedDeleteSubject = deleteSubjectAction as ReturnType<typeof vi.fn>
const mockedDeleteSubjects = deleteSubjectsAction as ReturnType<typeof vi.fn>
const mockedImportSubjects = importSubjectsAction as ReturnType<typeof vi.fn>

// Test fixtures
const mockSubject: Subject = {
  id: 'subj-123',
  name: 'Test Subject',
  birth_datetime: '1990-06-15T12:30:00.000Z',
  city: 'London',
  nation: 'GB',
  latitude: 51.5074,
  longitude: -0.1278,
  timezone: 'Europe/London',
  rodens_rating: 'AA',
  tags: ['test'],
  notes: 'Test notes',
}

const mockCreateInput: CreateSubjectInput = {
  name: 'New Subject',
  birthDate: '1990-06-15T00:00:00.000Z',
  birthTime: '12:30:00',
  city: 'Paris',
  nation: 'FR',
  latitude: 48.8566,
  longitude: 2.3522,
  timezone: 'Europe/Paris',
  rodens_rating: 'A',
  tags: ['new'],
  notes: 'New notes',
}

const mockUpdateInput: UpdateSubjectInput = {
  id: 'subj-123',
  name: 'Updated Subject',
  birthDate: '1990-06-15T00:00:00.000Z',
  birthTime: '14:00:00',
  city: 'Berlin',
  nation: 'DE',
  latitude: 52.52,
  longitude: 13.405,
  timezone: 'Europe/Berlin',
}

describe('lib/api/subjects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('fetchRandomSubjects', () => {
    it('should call getSubjects action and return subjects', async () => {
      const mockSubjects = [mockSubject]
      mockedGetSubjects.mockResolvedValue(mockSubjects)

      const result = await fetchRandomSubjects()

      expect(mockedGetSubjects).toHaveBeenCalledTimes(1)
      expect(result).toEqual(mockSubjects)
    })

    it('should accept optional count parameter (ignored)', async () => {
      mockedGetSubjects.mockResolvedValue([])

      await fetchRandomSubjects(100)

      expect(mockedGetSubjects).toHaveBeenCalledTimes(1)
    })

    it('should accept optional AbortSignal parameter (ignored)', async () => {
      mockedGetSubjects.mockResolvedValue([])
      const controller = new AbortController()

      await fetchRandomSubjects(50, controller.signal)

      expect(mockedGetSubjects).toHaveBeenCalledTimes(1)
    })

    it('should propagate errors from getSubjects', async () => {
      const error = new Error('Authentication required')
      mockedGetSubjects.mockRejectedValue(error)

      await expect(fetchRandomSubjects()).rejects.toThrow('Authentication required')
    })
  })

  describe('createSubject', () => {
    it('should forward data to createSubject action', async () => {
      mockedCreateSubject.mockResolvedValue(mockSubject)

      const result = await createSubject(mockCreateInput)

      expect(mockedCreateSubject).toHaveBeenCalledTimes(1)
      expect(mockedCreateSubject).toHaveBeenCalledWith(mockCreateInput)
      expect(result).toEqual(mockSubject)
    })

    it('should accept optional token parameter (ignored)', async () => {
      mockedCreateSubject.mockResolvedValue(mockSubject)

      await createSubject(mockCreateInput, 'some-token')

      expect(mockedCreateSubject).toHaveBeenCalledWith(mockCreateInput)
    })

    it('should propagate validation errors', async () => {
      const error = new Error('Invalid birth date')
      mockedCreateSubject.mockRejectedValue(error)

      await expect(createSubject(mockCreateInput)).rejects.toThrow('Invalid birth date')
    })

    it('should propagate limit errors', async () => {
      const error = new Error('Subject limit reached. Your plan allows 10 subjects.')
      mockedCreateSubject.mockRejectedValue(error)

      await expect(createSubject(mockCreateInput)).rejects.toThrow('Subject limit reached')
    })
  })

  describe('updateSubject', () => {
    it('should forward data to updateSubject action', async () => {
      const updatedSubject = { ...mockSubject, name: 'Updated Subject' }
      mockedUpdateSubject.mockResolvedValue(updatedSubject)

      const result = await updateSubject(mockUpdateInput)

      expect(mockedUpdateSubject).toHaveBeenCalledTimes(1)
      expect(mockedUpdateSubject).toHaveBeenCalledWith(mockUpdateInput)
      expect(result).toEqual(updatedSubject)
    })

    it('should accept optional token parameter (ignored)', async () => {
      mockedUpdateSubject.mockResolvedValue(mockSubject)

      await updateSubject(mockUpdateInput, 'some-token')

      expect(mockedUpdateSubject).toHaveBeenCalledWith(mockUpdateInput)
    })

    it('should propagate not found errors', async () => {
      const error = new Error('Subject not found or unauthorized')
      mockedUpdateSubject.mockRejectedValue(error)

      await expect(updateSubject(mockUpdateInput)).rejects.toThrow('Subject not found or unauthorized')
    })

    it('should propagate validation errors', async () => {
      const error = new Error('Invalid birth date/time format')
      mockedUpdateSubject.mockRejectedValue(error)

      await expect(updateSubject(mockUpdateInput)).rejects.toThrow('Invalid birth date/time format')
    })
  })

  describe('deleteSubject', () => {
    it('should forward id to deleteSubject action', async () => {
      mockedDeleteSubject.mockResolvedValue({ id: 'subj-123' })

      const result = await deleteSubject('subj-123')

      expect(mockedDeleteSubject).toHaveBeenCalledTimes(1)
      expect(mockedDeleteSubject).toHaveBeenCalledWith('subj-123')
      expect(result).toEqual({ id: 'subj-123' })
    })

    it('should accept optional token parameter (ignored)', async () => {
      mockedDeleteSubject.mockResolvedValue({ id: 'subj-123' })

      await deleteSubject('subj-123', 'some-token')

      expect(mockedDeleteSubject).toHaveBeenCalledWith('subj-123')
    })

    it('should propagate not found errors', async () => {
      const error = new Error('Subject not found or unauthorized')
      mockedDeleteSubject.mockRejectedValue(error)

      await expect(deleteSubject('subj-123')).rejects.toThrow('Subject not found or unauthorized')
    })
  })

  describe('deleteSubjects', () => {
    it('should forward ids array to deleteSubjects action', async () => {
      const ids = ['subj-1', 'subj-2', 'subj-3']
      mockedDeleteSubjects.mockResolvedValue({ count: 3 })

      const result = await deleteSubjects(ids)

      expect(mockedDeleteSubjects).toHaveBeenCalledTimes(1)
      expect(mockedDeleteSubjects).toHaveBeenCalledWith(ids)
      expect(result).toEqual({ count: 3 })
    })

    it('should handle empty array', async () => {
      mockedDeleteSubjects.mockResolvedValue({ count: 0 })

      const result = await deleteSubjects([])

      expect(mockedDeleteSubjects).toHaveBeenCalledWith([])
      expect(result).toEqual({ count: 0 })
    })

    it('should accept optional token parameter (ignored)', async () => {
      mockedDeleteSubjects.mockResolvedValue({ count: 1 })

      await deleteSubjects(['subj-1'], 'some-token')

      expect(mockedDeleteSubjects).toHaveBeenCalledWith(['subj-1'])
    })

    it('should propagate errors from action', async () => {
      const error = new Error('Database error')
      mockedDeleteSubjects.mockRejectedValue(error)

      await expect(deleteSubjects(['subj-1'])).rejects.toThrow('Database error')
    })
  })

  describe('importSubjects', () => {
    it('should forward subjects array to importSubjects action', async () => {
      const subjects = [mockCreateInput]
      const mockResult = { created: 1, skipped: 0, failed: 0, errors: [] }
      mockedImportSubjects.mockResolvedValue(mockResult)

      const result = await importSubjects(subjects)

      expect(mockedImportSubjects).toHaveBeenCalledTimes(1)
      expect(mockedImportSubjects).toHaveBeenCalledWith(subjects)
      expect(result).toEqual(mockResult)
    })

    it('should handle multiple subjects', async () => {
      const subjects = [
        mockCreateInput,
        { ...mockCreateInput, name: 'Second Subject' },
        { ...mockCreateInput, name: 'Third Subject' },
      ]
      const mockResult = { created: 2, skipped: 1, failed: 0, errors: [] }
      mockedImportSubjects.mockResolvedValue(mockResult)

      const result = await importSubjects(subjects)

      expect(mockedImportSubjects).toHaveBeenCalledWith(subjects)
      expect(result).toEqual(mockResult)
    })

    it('should handle empty array', async () => {
      const mockResult = { created: 0, skipped: 0, failed: 0, errors: [] }
      mockedImportSubjects.mockResolvedValue(mockResult)

      const result = await importSubjects([])

      expect(mockedImportSubjects).toHaveBeenCalledWith([])
      expect(result).toEqual(mockResult)
    })

    it('should accept optional token parameter (ignored)', async () => {
      mockedImportSubjects.mockResolvedValue({ created: 1, skipped: 0, failed: 0, errors: [] })

      await importSubjects([mockCreateInput], 'some-token')

      expect(mockedImportSubjects).toHaveBeenCalledWith([mockCreateInput])
    })

    it('should return failed count and errors', async () => {
      const subjects = [mockCreateInput]
      const mockResult = {
        created: 0,
        skipped: 0,
        failed: 1,
        errors: ['Invalid birth date for "New Subject"'],
      }
      mockedImportSubjects.mockResolvedValue(mockResult)

      const result = await importSubjects(subjects)

      expect(result.failed).toBe(1)
      expect(result.errors).toContain('Invalid birth date for "New Subject"')
    })

    it('should propagate authentication errors', async () => {
      const error = new Error('User not found')
      mockedImportSubjects.mockRejectedValue(error)

      await expect(importSubjects([mockCreateInput])).rejects.toThrow('User not found')
    })

    it('should handle skipped duplicates', async () => {
      const subjects = [mockCreateInput, mockCreateInput]
      const mockResult = { created: 1, skipped: 1, failed: 0, errors: [] }
      mockedImportSubjects.mockResolvedValue(mockResult)

      const result = await importSubjects(subjects)

      expect(result.created).toBe(1)
      expect(result.skipped).toBe(1)
    })
  })
})
