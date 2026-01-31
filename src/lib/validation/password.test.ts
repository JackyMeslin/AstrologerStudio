import { describe, it, expect } from 'vitest'
import { MIN_PASSWORD_LENGTH, PASSWORD_REGEX, PASSWORD_ERROR_MESSAGE, validatePassword } from './password'

describe('MIN_PASSWORD_LENGTH', () => {
  it('exports a positive integer', () => {
    expect(MIN_PASSWORD_LENGTH).toBeGreaterThan(0)
    expect(Number.isInteger(MIN_PASSWORD_LENGTH)).toBe(true)
  })

  it('has expected default value of 8', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8)
  })
})

describe('PASSWORD_REGEX', () => {
  it('matches a valid password with all requirements', () => {
    expect(PASSWORD_REGEX.test('Abcdef1!')).toBe(true)
  })

  it('rejects password shorter than 8 characters', () => {
    expect(PASSWORD_REGEX.test('Ab1!')).toBe(false)
  })

  it('rejects password without uppercase', () => {
    expect(PASSWORD_REGEX.test('abcdef1!')).toBe(false)
  })

  it('rejects password without lowercase', () => {
    expect(PASSWORD_REGEX.test('ABCDEF1!')).toBe(false)
  })

  it('rejects password without digit', () => {
    expect(PASSWORD_REGEX.test('Abcdefg!')).toBe(false)
  })

  it('rejects password without special character', () => {
    expect(PASSWORD_REGEX.test('Abcdefg1')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(PASSWORD_REGEX.test('')).toBe(false)
  })
})

describe('validatePassword', () => {
  it('returns valid for a strong password', () => {
    expect(validatePassword('StrongP@ss1')).toEqual({ valid: true })
  })

  it('returns error for a weak password', () => {
    const result = validatePassword('weak')
    expect(result.valid).toBe(false)
    expect(result.error).toBe(PASSWORD_ERROR_MESSAGE)
  })

  it('returns error for password missing special character', () => {
    const result = validatePassword('Abcdefg1')
    expect(result.valid).toBe(false)
    expect(result.error).toBe(PASSWORD_ERROR_MESSAGE)
  })
})
