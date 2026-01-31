/**
 * Unit Tests for TimelineEventTable helper functions
 *
 * Tests the groupDatesIntoMonths utility function that groups
 * consecutive dates by month for efficient rendering.
 *
 * @module src/test/components/TimelineEventTable
 */
import { describe, it, expect } from 'vitest'

import { groupDatesIntoMonths } from '@/components/TimelineEventTable'

describe('groupDatesIntoMonths', () => {
  it('should return empty array for empty dates', () => {
    const result = groupDatesIntoMonths([])
    expect(result).toEqual([])
  })

  it('should group a single date into one month', () => {
    const dates = ['2025-01-15']
    const result = groupDatesIntoMonths(dates)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      key: '2025-01',
      label: 'January 2025',
      count: 1,
    })
  })

  it('should group consecutive dates in the same month', () => {
    const dates = ['2025-01-15', '2025-01-16', '2025-01-17']
    const result = groupDatesIntoMonths(dates)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      key: '2025-01',
      label: 'January 2025',
      count: 3,
    })
  })

  it('should create separate groups for different months', () => {
    const dates = ['2025-01-30', '2025-01-31', '2025-02-01', '2025-02-02']
    const result = groupDatesIntoMonths(dates)

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      key: '2025-01',
      label: 'January 2025',
      count: 2,
    })
    expect(result[1]).toEqual({
      key: '2025-02',
      label: 'February 2025',
      count: 2,
    })
  })

  it('should handle dates spanning multiple months', () => {
    const dates = [
      '2025-01-28',
      '2025-01-29',
      '2025-01-30',
      '2025-01-31',
      '2025-02-01',
      '2025-02-02',
      '2025-02-03',
      '2025-03-01',
      '2025-03-02',
    ]
    const result = groupDatesIntoMonths(dates)

    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({
      key: '2025-01',
      label: 'January 2025',
      count: 4,
    })
    expect(result[1]).toEqual({
      key: '2025-02',
      label: 'February 2025',
      count: 3,
    })
    expect(result[2]).toEqual({
      key: '2025-03',
      label: 'March 2025',
      count: 2,
    })
  })

  it('should handle dates spanning different years', () => {
    const dates = ['2024-12-30', '2024-12-31', '2025-01-01', '2025-01-02']
    const result = groupDatesIntoMonths(dates)

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      key: '2024-12',
      label: 'December 2024',
      count: 2,
    })
    expect(result[1]).toEqual({
      key: '2025-01',
      label: 'January 2025',
      count: 2,
    })
  })

  it('should return consistent results for same input (pure function)', () => {
    const dates = ['2025-06-15', '2025-06-16', '2025-07-01']
    const result1 = groupDatesIntoMonths(dates)
    const result2 = groupDatesIntoMonths(dates)

    expect(result1).toEqual(result2)
  })

  it('should handle a single day per month', () => {
    const dates = ['2025-01-15', '2025-02-20', '2025-03-25']
    const result = groupDatesIntoMonths(dates)

    expect(result).toHaveLength(3)
    expect(result.every((m) => m.count === 1)).toBe(true)
  })
})
