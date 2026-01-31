import { describe, it, expect } from 'vitest'
import { getErrorMessage } from '@/lib/utils/error'

describe('getErrorMessage', () => {
  it('should return the message from an Error instance', () => {
    const error = new Error('Something went wrong')
    expect(getErrorMessage(error)).toBe('Something went wrong')
  })

  it('should return the message from a TypeError', () => {
    const error = new TypeError('Cannot read property')
    expect(getErrorMessage(error)).toBe('Cannot read property')
  })

  it('should return the string directly when a string is thrown', () => {
    expect(getErrorMessage('connection failed')).toBe('connection failed')
  })

  it('should return "Unknown error" for a number', () => {
    expect(getErrorMessage(42)).toBe('Unknown error')
  })

  it('should return "Unknown error" for null', () => {
    expect(getErrorMessage(null)).toBe('Unknown error')
  })

  it('should return "Unknown error" for undefined', () => {
    expect(getErrorMessage(undefined)).toBe('Unknown error')
  })

  it('should return "Unknown error" for a plain object', () => {
    expect(getErrorMessage({ code: 'ERR_NETWORK' })).toBe('Unknown error')
  })

  it('should return an empty string for an Error with empty message', () => {
    expect(getErrorMessage(new Error(''))).toBe('')
  })
})
