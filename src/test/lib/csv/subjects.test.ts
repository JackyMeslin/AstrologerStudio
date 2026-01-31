/**
 * Unit Tests for CSV Subject Utilities
 *
 * Tests the CSV import/export utilities for Subject data including
 * tag parsing, time extraction, row validation, and signature generation.
 *
 * @module src/lib/csv/subjects
 */
import { describe, it, expect } from 'vitest'
import * as csvSubjects from '@/lib/csv/subjects'
import { parseTags, extractUTCTime, parseSubjectCSVRow, createSubjectSignature } from '@/lib/csv/subjects'

// ============================================================================
// parseTags Tests
// ============================================================================

describe('parseTags', () => {
  /**
   * Tests for parsing tags from CSV input.
   * Supports both JSON array format and comma-separated values.
   */

  it.each([
    ['["tag1","tag2"]', ['tag1', 'tag2']],
    ['tag1, tag2, tag3', ['tag1', 'tag2', 'tag3']],
    [undefined, null],
    ['', null],
  ] as const)('should parse %j to %j', (input, expected) => {
    expect(parseTags(input as string | undefined)).toEqual(expected)
  })

  it('should parse JSON array with extra whitespace', () => {
    const result = parseTags('  ["a", "b"]  ')
    expect(result).toEqual(['a', 'b'])
  })

  it('should parse comma-separated values with varying whitespace', () => {
    const result = parseTags('one,  two ,three')
    expect(result).toEqual(['one', 'two', 'three'])
  })

  it('should filter out empty tags', () => {
    const result = parseTags('tag1, , tag2')
    expect(result).toEqual(['tag1', 'tag2'])
  })

  it('should handle single tag', () => {
    const result = parseTags('single')
    expect(result).toEqual(['single'])
  })

  it('should handle whitespace-only string', () => {
    const result = parseTags('   ')
    expect(result).toBe(null)
  })

  it('should fallback to comma parsing for malformed JSON', () => {
    const result = parseTags('[invalid json')
    expect(result).toEqual(['[invalid json'])
  })
})

// ============================================================================
// extractUTCTime Tests
// ============================================================================

describe('extractUTCTime', () => {
  /**
   * Tests for extracting UTC time string from Date objects.
   * Output format is HH:MM:SS with zero-padding.
   */

  it('should extract time with zero-padding', () => {
    // Single-digit hours, minutes, and seconds should be padded
    const date = new Date('2025-03-05T09:05:03Z')
    const result = extractUTCTime(date)

    expect(result).toBe('09:05:03')
  })

  it('should format midnight as 00:00:00', () => {
    const date = new Date('2025-01-01T00:00:00Z')
    const result = extractUTCTime(date)

    expect(result).toBe('00:00:00')
  })

  it('should handle noon correctly', () => {
    const date = new Date('2025-01-01T12:00:00Z')
    const result = extractUTCTime(date)

    expect(result).toBe('12:00:00')
  })

  it('should handle end of day correctly', () => {
    const date = new Date('2025-01-01T23:59:59Z')
    const result = extractUTCTime(date)

    expect(result).toBe('23:59:59')
  })

  it('should extract time in UTC regardless of timezone', () => {
    // Create date and verify UTC extraction
    const date = new Date('2025-06-15T14:30:45Z')
    const result = extractUTCTime(date)

    expect(result).toBe('14:30:45')
  })
})

// ============================================================================
// parseSubjectCSVRow Tests
// ============================================================================

describe('parseSubjectCSVRow', () => {
  /**
   * Tests for parsing and validating CSV rows into CreateSubjectInput.
   * Validates required fields, coordinate bounds, and date parsing.
   */

  it('should parse a valid row successfully', () => {
    const row = {
      name: 'Mario Rossi',
      birthDatetime: '1990-01-15T14:30:00Z',
      city: 'Rome',
      nation: 'Italy',
      latitude: '41.9028',
      longitude: '12.4964',
      timezone: 'Europe/Rome',
      rodensRating: 'AA',
      tags: 'family, friends',
      notes: 'Test subject',
    }

    const result = parseSubjectCSVRow(row, 1)

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data?.name).toBe('Mario Rossi')
    expect(result.data?.birthDate).toBe('1990-01-15T14:30:00.000Z')
    expect(result.data?.birthTime).toBe('14:30:00')
    expect(result.data?.city).toBe('Rome')
    expect(result.data?.nation).toBe('Italy')
    expect(result.data?.latitude).toBe(41.9028)
    expect(result.data?.longitude).toBe(12.4964)
    expect(result.data?.timezone).toBe('Europe/Rome')
    expect(result.data?.rodens_rating).toBe('AA')
    expect(result.data?.tags).toEqual(['family', 'friends'])
    expect(result.data?.notes).toBe('Test subject')
  })

  it('should return error for missing name', () => {
    const row = {
      name: '',
      birthDatetime: '1990-01-15T14:30:00Z',
    }

    const result = parseSubjectCSVRow(row, 3)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Missing name')
  })

  it('should return error for whitespace-only name', () => {
    const row = {
      name: '   ',
      birthDatetime: '1990-01-15T14:30:00Z',
    }

    const result = parseSubjectCSVRow(row, 2)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Missing name')
  })

  it('should return error for missing birthDatetime', () => {
    const row = {
      name: 'Test',
      birthDatetime: '',
    }

    const result = parseSubjectCSVRow(row, 5)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Missing birthDatetime')
  })

  it('should return error for invalid date format', () => {
    const row = {
      name: 'Test',
      birthDatetime: 'not-a-valid-date',
    }

    const result = parseSubjectCSVRow(row, 7)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Invalid date format')
  })

  it('should return error for latitude below -90', () => {
    const row = {
      name: 'Test',
      birthDatetime: '1990-01-15T14:30:00Z',
      latitude: '-91',
    }

    const result = parseSubjectCSVRow(row, 4)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Invalid latitude')
  })

  it('should return error for latitude above 90', () => {
    const row = {
      name: 'Test',
      birthDatetime: '1990-01-15T14:30:00Z',
      latitude: '91',
    }

    const result = parseSubjectCSVRow(row, 5)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Invalid latitude')
  })

  it('should return error for longitude below -180', () => {
    const row = {
      name: 'Test',
      birthDatetime: '1990-01-15T14:30:00Z',
      longitude: '-181',
    }

    const result = parseSubjectCSVRow(row, 6)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Invalid longitude')
  })

  it('should return error for longitude above 180', () => {
    const row = {
      name: 'Test',
      birthDatetime: '1990-01-15T14:30:00Z',
      longitude: '181',
    }

    const result = parseSubjectCSVRow(row, 7)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Invalid longitude')
  })

  it('should include rowIndex in error message', () => {
    const row = {
      name: '',
      birthDatetime: '1990-01-15T14:30:00Z',
    }

    const result = parseSubjectCSVRow(row, 42)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Row 42')
  })

  it('should accept boundary latitude values (-90 and 90)', () => {
    const row1 = {
      name: 'South Pole',
      birthDatetime: '1990-01-15T14:30:00Z',
      latitude: '-90',
    }
    const row2 = {
      name: 'North Pole',
      birthDatetime: '1990-01-15T14:30:00Z',
      latitude: '90',
    }

    expect(parseSubjectCSVRow(row1, 1).success).toBe(true)
    expect(parseSubjectCSVRow(row2, 2).success).toBe(true)
  })

  it('should accept boundary longitude values (-180 and 180)', () => {
    const row1 = {
      name: 'West',
      birthDatetime: '1990-01-15T14:30:00Z',
      longitude: '-180',
    }
    const row2 = {
      name: 'East',
      birthDatetime: '1990-01-15T14:30:00Z',
      longitude: '180',
    }

    expect(parseSubjectCSVRow(row1, 1).success).toBe(true)
    expect(parseSubjectCSVRow(row2, 2).success).toBe(true)
  })

  it('should handle minimal valid row', () => {
    const row = {
      name: 'Test',
      birthDatetime: '2000-01-01T00:00:00Z',
    }

    const result = parseSubjectCSVRow(row, 1)

    expect(result.success).toBe(true)
    expect(result.data?.name).toBe('Test')
    expect(result.data?.timezone).toBe('UTC')
  })
})

// ============================================================================
// createSubjectSignature Tests
// ============================================================================

describe('createSubjectSignature', () => {
  /**
   * Tests for subject signature generation used in deduplication.
   * Signature combines lowercase name with ISO datetime.
   */

  it('should create consistent signature for same inputs', () => {
    const sig1 = createSubjectSignature('John Doe', '1990-01-15T14:30:00Z')
    const sig2 = createSubjectSignature('John Doe', '1990-01-15T14:30:00Z')

    expect(sig1).toBe(sig2)
  })

  it('should be case-insensitive for name', () => {
    const sig1 = createSubjectSignature('John Doe', '1990-01-15T14:30:00Z')
    const sig2 = createSubjectSignature('JOHN DOE', '1990-01-15T14:30:00Z')
    const sig3 = createSubjectSignature('john doe', '1990-01-15T14:30:00Z')

    expect(sig1).toBe(sig2)
    expect(sig2).toBe(sig3)
  })

  it('should produce different signatures for different names', () => {
    const sig1 = createSubjectSignature('John Doe', '1990-01-15T14:30:00Z')
    const sig2 = createSubjectSignature('Jane Doe', '1990-01-15T14:30:00Z')

    expect(sig1).not.toBe(sig2)
  })

  it('should produce different signatures for different dates', () => {
    const sig1 = createSubjectSignature('John Doe', '1990-01-15T14:30:00Z')
    const sig2 = createSubjectSignature('John Doe', '1990-01-16T14:30:00Z')

    expect(sig1).not.toBe(sig2)
  })

  it('should accept Date object as birthDatetime', () => {
    const date = new Date('1990-01-15T14:30:00Z')
    const sig1 = createSubjectSignature('John Doe', date)
    const sig2 = createSubjectSignature('John Doe', '1990-01-15T14:30:00.000Z')

    expect(sig1).toBe(sig2)
  })

  it('should trim whitespace from name', () => {
    const sig1 = createSubjectSignature('  John Doe  ', '1990-01-15T14:30:00Z')
    const sig2 = createSubjectSignature('John Doe', '1990-01-15T14:30:00Z')

    expect(sig1).toBe(sig2)
  })

  it('should include pipe separator in signature format', () => {
    const sig = createSubjectSignature('Test', '2000-01-01T00:00:00Z')

    expect(sig).toContain('|')
    expect(sig).toMatch(/^test\|/)
  })
})

// ============================================================================
// Removed unused constants Tests
// ============================================================================

describe('removed unused constants', () => {
  it('should not export SUBJECT_CSV_HEADERS', () => {
    expect('SUBJECT_CSV_HEADERS' in csvSubjects).toBe(false)
  })

  it('should still export parseTags', () => {
    expect(csvSubjects.parseTags).toBeDefined()
    expect(typeof csvSubjects.parseTags).toBe('function')
  })

  it('should still export parseSubjectCSVRow', () => {
    expect(csvSubjects.parseSubjectCSVRow).toBeDefined()
    expect(typeof csvSubjects.parseSubjectCSVRow).toBe('function')
  })
})
