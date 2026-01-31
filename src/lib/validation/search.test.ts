import { describe, it, expect } from 'vitest'
import { MIN_SEARCH_LENGTH } from './search'

describe('MIN_SEARCH_LENGTH', () => {
  it('exports a positive integer', () => {
    expect(MIN_SEARCH_LENGTH).toBeGreaterThan(0)
    expect(Number.isInteger(MIN_SEARCH_LENGTH)).toBe(true)
  })

  it('has expected default value of 2', () => {
    expect(MIN_SEARCH_LENGTH).toBe(2)
  })
})
