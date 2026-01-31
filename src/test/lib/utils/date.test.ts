/**
 * Unit Tests for Date Utilities
 *
 * Tests the date/time parsing and formatting functions used throughout
 * the application for handling astrological birth data.
 *
 * @module src/lib/utils/date
 */
import { describe, it, expect } from 'vitest'
import {
  parseBirthDateTime,
  formatDateTimeForForm,
  formatDisplayDate,
  formatDisplayTime,
  isValidPastDate,
  formatDateForInput,
  normalizeTimeValue,
  parseDateInput,
} from '@/lib/utils/date'

// ============================================================================
// parseBirthDateTime Tests
// ============================================================================

describe('parseBirthDateTime', () => {
  /**
   * Tests for the core birth date/time parsing function.
   * This function is critical for converting user input into UTC Date objects
   * for astrological calculations.
   */

  it('should parse a valid date and time to UTC Date', () => {
    // Standard case: date and time provided in expected format
    const result = parseBirthDateTime('1990-01-15', '14:30:00')

    expect(result).toBeInstanceOf(Date)
    expect(result.getUTCFullYear()).toBe(1990)
    expect(result.getUTCMonth()).toBe(0) // January is 0
    expect(result.getUTCDate()).toBe(15)
    expect(result.getUTCHours()).toBe(14)
    expect(result.getUTCMinutes()).toBe(30)
    expect(result.getUTCSeconds()).toBe(0)
  })

  it('should default to midnight when time is not provided', () => {
    // Many users don't know their exact birth time
    // Default to midnight UTC for chart calculations
    const result = parseBirthDateTime('2000-06-21')

    expect(result.getUTCHours()).toBe(0)
    expect(result.getUTCMinutes()).toBe(0)
    expect(result.getUTCSeconds()).toBe(0)
  })

  it('should extract date from full ISO string format', () => {
    // Handle case when date includes time component (from database)
    const result = parseBirthDateTime('1985-03-20T10:15:00.000Z', '10:15:00')

    expect(result.getUTCFullYear()).toBe(1985)
    expect(result.getUTCMonth()).toBe(2) // March is 2
    expect(result.getUTCDate()).toBe(20)
  })

  it('should throw error for empty date', () => {
    // Date is always required for astrological calculations
    expect(() => parseBirthDateTime('')).toThrow('Birth date is required')
  })

  it('should throw error for invalid date format', () => {
    // Reject non-standard date formats
    expect(() => parseBirthDateTime('15/01/1990')).toThrow('Date must be in YYYY-MM-DD format')
    expect(() => parseBirthDateTime('1990-1-15')).toThrow('Date must be in YYYY-MM-DD format')
  })

  it('should throw error for invalid time format', () => {
    // Time must be in HH:MM:SS format
    expect(() => parseBirthDateTime('1990-01-15', '14:30')).toThrow('Time must be in HH:MM:SS format')
    expect(() => parseBirthDateTime('1990-01-15', '2:30:00')).toThrow('Time must be in HH:MM:SS format')
  })

  it('should throw error for invalid time values', () => {
    // Validate that time components are within valid ranges
    expect(() => parseBirthDateTime('1990-01-15', '25:00:00')).toThrow('Invalid time values')
    expect(() => parseBirthDateTime('1990-01-15', '12:60:00')).toThrow('Invalid time values')
    expect(() => parseBirthDateTime('1990-01-15', '12:00:60')).toThrow('Invalid time values')
  })

  // Parameterized tests for valid date/time combinations
  it.each([
    [['2000-01-15', '14:30:00'], { year: 2000, month: 0, day: 15, hours: 14, minutes: 30, seconds: 0 }],
    [['2000-01-15'], { year: 2000, month: 0, day: 15, hours: 0, minutes: 0, seconds: 0 }],
    [['2000-02-29', '12:00:00'], { year: 2000, month: 1, day: 29, hours: 12, minutes: 0, seconds: 0 }],
  ] as const)('should correctly parse %j', (input, expected) => {
    const result = parseBirthDateTime(input[0], input[1])

    expect(result.getUTCFullYear()).toBe(expected.year)
    expect(result.getUTCMonth()).toBe(expected.month)
    expect(result.getUTCDate()).toBe(expected.day)
    expect(result.getUTCHours()).toBe(expected.hours)
    expect(result.getUTCMinutes()).toBe(expected.minutes)
    expect(result.getUTCSeconds()).toBe(expected.seconds)
  })

  // Parameterized tests for invalid date formats
  it.each([
    ['15-01-2000', 'Date must be in YYYY-MM-DD format'],
    ['01/15/2000', 'Date must be in YYYY-MM-DD format'],
    ['2000/01/15', 'Date must be in YYYY-MM-DD format'],
  ] as const)('should throw for invalid date format: %s', (invalidDate, expectedError) => {
    expect(() => parseBirthDateTime(invalidDate)).toThrow(expectedError)
  })

  // Parameterized tests for invalid time formats
  it.each([
    ['25:00:00', 'Invalid time values'],
    ['24:00:00', 'Invalid time values'],
    ['12:60:00', 'Invalid time values'],
    ['12:00:60', 'Invalid time values'],
  ] as const)('should throw for invalid time: %s', (invalidTime, expectedError) => {
    expect(() => parseBirthDateTime('2000-01-15', invalidTime)).toThrow(expectedError)
  })
})

// ============================================================================
// formatDateTimeForForm Tests
// ============================================================================

describe('formatDateTimeForForm', () => {
  /**
   * Tests for converting Date objects back to form input values.
   * Used when populating edit forms with existing subject data.
   */

  it('should format a Date to date and time strings', () => {
    const date = new Date('1990-01-15T14:30:45Z')
    const result = formatDateTimeForForm(date)

    expect(result.date).toBe('1990-01-15')
    expect(result.time).toBe('14:30:45')
  })

  it('should pad single-digit values with zeros', () => {
    // Ensure consistent format for HTML date inputs
    const date = new Date('2000-03-05T09:05:03Z')
    const result = formatDateTimeForForm(date)

    expect(result.date).toBe('2000-03-05')
    expect(result.time).toBe('09:05:03')
  })

  it('should return empty strings for invalid Date', () => {
    // Handle edge case of invalid date gracefully
    const result = formatDateTimeForForm(new Date('invalid'))

    expect(result.date).toBe('')
    expect(result.time).toBe('')
  })
})

// ============================================================================
// formatDisplayDate Tests
// ============================================================================

describe('formatDisplayDate', () => {
  /**
   * Tests for date display formatting according to user locale preferences.
   * Supports US (MM/DD/YYYY), EU (DD/MM/YYYY), and ISO (YYYY-MM-DD) formats.
   */

  it('should format date in EU format by default', () => {
    const date = new Date('2025-12-15T00:00:00Z')
    const result = formatDisplayDate(date)

    expect(result).toBe('15/12/2025')
  })

  it('should format date in US format (MM/DD/YYYY)', () => {
    const date = new Date('2025-12-15T00:00:00Z')
    const result = formatDisplayDate(date, 'US')

    expect(result).toBe('12/15/2025')
  })

  it('should format date in EU format (DD/MM/YYYY)', () => {
    const date = new Date('2025-12-15T00:00:00Z')
    const result = formatDisplayDate(date, 'EU')

    expect(result).toBe('15/12/2025')
  })

  it('should format date in ISO format (YYYY-MM-DD)', () => {
    const date = new Date('2025-12-15T00:00:00Z')
    const result = formatDisplayDate(date, 'ISO')

    expect(result).toBe('2025-12-15')
  })

  it('should include time when option is set', () => {
    const date = new Date('2025-12-15T14:30:00Z')
    const result = formatDisplayDate(date, 'EU', { includeTime: true, timeFormat: '24h' })

    expect(result).toBe('15/12/2025 14:30')
  })

  it('should include 12h time format when specified', () => {
    const date = new Date('2025-12-15T14:30:00Z')
    const result = formatDisplayDate(date, 'US', { includeTime: true, timeFormat: '12h' })

    expect(result).toBe('12/15/2025 2:30 PM')
  })

  it('should accept string dates', () => {
    // Support both Date objects and ISO strings
    const result = formatDisplayDate('2025-12-15T00:00:00Z', 'EU')

    expect(result).toBe('15/12/2025')
  })

  it('should return dash for invalid date', () => {
    // Return placeholder for invalid dates instead of crashing
    const result = formatDisplayDate(new Date('invalid'))

    expect(result).toBe('—')
  })

  // Verify format patterns with different dates
  it.each([
    ['US', '01/05/2025'],
    ['EU', '05/01/2025'],
    ['ISO', '2025-01-05'],
  ] as const)('should format correctly for %s format', (format, expected) => {
    const date = new Date('2025-01-05T00:00:00Z')
    expect(formatDisplayDate(date, format)).toBe(expected)
  })
})

// ============================================================================
// formatDisplayTime Tests
// ============================================================================

describe('formatDisplayTime', () => {
  /**
   * Tests for time display formatting.
   * Supports 24-hour and 12-hour (AM/PM) formats.
   */

  it('should format time in 24-hour format by default', () => {
    const date = new Date('2025-12-15T14:30:00Z')
    const result = formatDisplayTime(date)

    expect(result).toBe('14:30')
  })

  it('should format time in 12-hour format with PM', () => {
    const date = new Date('2025-12-15T14:30:00Z')
    const result = formatDisplayTime(date, '12h')

    expect(result).toBe('2:30 PM')
  })

  it('should format time in 12-hour format with AM', () => {
    const date = new Date('2025-12-15T09:15:00Z')
    const result = formatDisplayTime(date, '12h')

    expect(result).toBe('9:15 AM')
  })

  it('should handle midnight correctly in 12-hour format', () => {
    // Midnight is 12:00 AM, not 0:00 AM
    const date = new Date('2025-12-15T00:00:00Z')
    const result = formatDisplayTime(date, '12h')

    expect(result).toBe('12:00 AM')
  })

  it('should handle midnight correctly in 24-hour format', () => {
    // Midnight is 00:00 in 24-hour format
    const date = new Date('2025-12-15T00:00:00Z')
    const result = formatDisplayTime(date, '24h')

    expect(result).toBe('00:00')
  })

  it('should handle noon correctly in 12-hour format', () => {
    // Noon is 12:00 PM
    const date = new Date('2025-12-15T12:00:00Z')
    const result = formatDisplayTime(date, '12h')

    expect(result).toBe('12:00 PM')
  })

  it('should return dash for invalid date', () => {
    const result = formatDisplayTime(new Date('invalid'))

    expect(result).toBe('—')
  })

  // Verify 12h format shows AM/PM
  it('should show AM/PM suffix in 12-hour format', () => {
    const morningDate = new Date('2025-12-15T08:00:00Z')
    const eveningDate = new Date('2025-12-15T20:00:00Z')

    expect(formatDisplayTime(morningDate, '12h')).toMatch(/AM$/)
    expect(formatDisplayTime(eveningDate, '12h')).toMatch(/PM$/)
  })

  // Verify 24h format uses 0-23 hours range
  it('should use 0-23 hours range in 24-hour format', () => {
    const earlyMorning = new Date('2025-12-15T01:00:00Z')
    const lateEvening = new Date('2025-12-15T23:00:00Z')

    expect(formatDisplayTime(earlyMorning, '24h')).toBe('01:00')
    expect(formatDisplayTime(lateEvening, '24h')).toBe('23:00')
  })
})

// ============================================================================
// isValidPastDate Tests
// ============================================================================

describe('isValidPastDate', () => {
  /**
   * Tests for birth date validation.
   * Birth dates must be in the past (with small tolerance for clock sync).
   */

  it('should return true for past dates', () => {
    const pastDate = new Date('1990-01-15T00:00:00Z')

    expect(isValidPastDate(pastDate)).toBe(true)
  })

  it('should return false for future dates', () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24) // Tomorrow

    expect(isValidPastDate(futureDate)).toBe(false)
  })

  it('should allow dates within tolerance window', () => {
    // Account for slight time differences between client and server
    const almostNow = new Date(Date.now() + 1000) // 1 second in future

    expect(isValidPastDate(almostNow, 2000)).toBe(true) // 2 second tolerance
  })

  it('should use default tolerance of 2000ms', () => {
    // Date 1.5 seconds in the future should be valid with default tolerance
    const slightlyFuture = new Date(Date.now() + 1500)

    expect(isValidPastDate(slightlyFuture)).toBe(true)
  })

  it('should reject dates beyond tolerance', () => {
    // Date 3 seconds in the future should be invalid with default 2s tolerance
    const beyondTolerance = new Date(Date.now() + 3000)

    expect(isValidPastDate(beyondTolerance)).toBe(false)
  })

  it('should accept custom tolerance parameter', () => {
    const futureDate = new Date(Date.now() + 5000) // 5 seconds in future

    // Should fail with default tolerance
    expect(isValidPastDate(futureDate)).toBe(false)

    // Should pass with larger tolerance
    expect(isValidPastDate(futureDate, 10000)).toBe(true)
  })

  it('should accept zero tolerance', () => {
    const futureDate = new Date(Date.now() + 100) // 100ms in future

    expect(isValidPastDate(futureDate, 0)).toBe(false)
  })
})

// ============================================================================
// Form Input Helpers Tests
// ============================================================================

describe('formatDateForInput', () => {
  /**
   * Tests for converting database dates to HTML date input format.
   */

  it('should format ISO string to YYYY-MM-DD', () => {
    const result = formatDateForInput('2024-01-15T10:30:00.000Z')

    expect(result).toBe('2024-01-15')
  })

  it('should return empty string for undefined', () => {
    const result = formatDateForInput(undefined)

    expect(result).toBe('')
  })

  it('should return empty string for invalid date', () => {
    const result = formatDateForInput('not-a-date')

    expect(result).toBe('')
  })
})

describe('normalizeTimeValue', () => {
  /**
   * Tests for normalizing time input values to HH:MM:SS format.
   * HTML time inputs may return only HH:MM, but we need seconds for consistency.
   */

  it('should add seconds to HH:MM format', () => {
    const result = normalizeTimeValue('14:30')

    expect(result).toBe('14:30:00')
  })

  it('should preserve HH:MM:SS format', () => {
    const result = normalizeTimeValue('14:30:45')

    expect(result).toBe('14:30:45')
  })

  it('should return empty string for empty input', () => {
    const result = normalizeTimeValue('')

    expect(result).toBe('')
  })

  // Parameterized tests for normalizeTimeValue
  it.each([
    ['14:30', '14:30:00'],
    ['9:5', '9:5:00'],
    ['14:30:45', '14:30:45'],
    ['00:00', '00:00:00'],
    ['23:59', '23:59:00'],
    ['12:00:30', '12:00:30'],
  ] as const)('should normalize "%s" to "%s"', (input, expected) => {
    expect(normalizeTimeValue(input)).toBe(expected)
  })

  it('should handle single-digit hour input', () => {
    const result = normalizeTimeValue('9:30')
    expect(result).toBe('9:30:00')
  })

  it('should handle time with only hour', () => {
    const result = normalizeTimeValue('14')
    expect(result).toBe('14:00:00')
  })
})

// ============================================================================
// parseDateInput Tests
// ============================================================================

describe('parseDateInput', () => {
  it('should return empty string for empty input', () => {
    const result = parseDateInput('')
    expect(result).toBe('')
  })

  it('should convert valid date to ISO string', () => {
    const result = parseDateInput('2024-01-15')
    expect(result).toContain('2024-01-15')
    expect(result).toContain('T')
  })
})

// ============================================================================
// parseBirthDateTime edge cases Tests
// ============================================================================

describe('parseBirthDateTime edge cases', () => {
  it('should throw error for date string with T but no date part', () => {
    expect(() => parseBirthDateTime('T14:30:00')).toThrow('Invalid date format')
  })
})
