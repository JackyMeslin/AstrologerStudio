/**
 * Unit Tests for Sensitive Data Redaction
 *
 * Tests the redactSensitive function that automatically redacts
 * sensitive fields from objects before logging.
 *
 * @module src/lib/logging/redaction
 */
import { describe, it, expect } from 'vitest'
import { redactSensitive } from '@/lib/logging/redaction'

describe('redactSensitive', () => {
  describe('sensitive fields redaction with test.each', () => {
    it.each([
      ['password', { password: 'secret123' }, { password: '[REDACTED]' }],
      ['token', { token: 'abc123' }, { token: '[REDACTED]' }],
      ['secret', { secret: 'mysecret' }, { secret: '[REDACTED]' }],
      ['apikey', { apikey: 'key-12345' }, { apikey: '[REDACTED]' }],
      ['authorization', { authorization: 'Bearer xyz' }, { authorization: '[REDACTED]' }],
    ] as const)('should redact field containing "%s"', (_, input, expected) => {
      const result = redactSensitive(input)
      expect(result).toEqual(expected)
    })

    it.each([
      ['userPassword', { userPassword: 'pass' }],
      ['authToken', { authToken: 'token123' }],
      ['clientSecret', { clientSecret: 'secret' }],
      ['myApikey', { myApikey: 'key' }],
      ['authorizationHeader', { authorizationHeader: 'Bearer token' }],
    ] as const)('should redact field with pattern "%s" (case-insensitive includes)', (fieldName, input) => {
      const result = redactSensitive(input) as Record<string, unknown>
      expect(result[fieldName]).toBe('[REDACTED]')
    })
  })

  describe('nested objects traversal', () => {
    it('should redact sensitive fields in nested objects', () => {
      const input = {
        user: {
          name: 'John',
          password: 'secret123',
        },
      }

      const result = redactSensitive(input)

      expect(result).toEqual({
        user: {
          name: 'John',
          password: '[REDACTED]',
        },
      })
    })

    it('should handle deeply nested objects', () => {
      const input = {
        level1: {
          level2: {
            level3: {
              token: 'deep-token',
              data: 'visible',
            },
          },
        },
      }

      const result = redactSensitive(input)

      expect(result).toEqual({
        level1: {
          level2: {
            level3: {
              token: '[REDACTED]',
              data: 'visible',
            },
          },
        },
      })
    })

    it('should redact multiple sensitive fields at different nesting levels', () => {
      const input = {
        password: 'root-pass',
        config: {
          apikey: 'config-key',
          nested: {
            secret: 'nested-secret',
          },
        },
      }

      const result = redactSensitive(input)

      expect(result).toEqual({
        password: '[REDACTED]',
        config: {
          apikey: '[REDACTED]',
          nested: {
            secret: '[REDACTED]',
          },
        },
      })
    })
  })

  describe('array handling', () => {
    it('should handle arrays of objects with sensitive fields', () => {
      const input = [
        { name: 'User1', password: 'pass1' },
        { name: 'User2', password: 'pass2' },
      ]

      const result = redactSensitive(input)

      expect(result).toEqual([
        { name: 'User1', password: '[REDACTED]' },
        { name: 'User2', password: '[REDACTED]' },
      ])
    })

    it('should handle arrays nested in objects', () => {
      const input = {
        users: [{ token: 'token1' }, { token: 'token2' }],
      }

      const result = redactSensitive(input)

      expect(result).toEqual({
        users: [{ token: '[REDACTED]' }, { token: '[REDACTED]' }],
      })
    })

    it('should handle arrays of primitives', () => {
      const input = {
        tags: ['tag1', 'tag2', 'tag3'],
        numbers: [1, 2, 3],
      }

      const result = redactSensitive(input)

      expect(result).toEqual({
        tags: ['tag1', 'tag2', 'tag3'],
        numbers: [1, 2, 3],
      })
    })

    it('should handle mixed arrays', () => {
      const input = ['string', 123, { secret: 'hidden' }, null]

      const result = redactSensitive(input)

      expect(result).toEqual(['string', 123, { secret: '[REDACTED]' }, null])
    })
  })

  describe('non-sensitive fields preservation', () => {
    it('should preserve non-sensitive fields unchanged', () => {
      const input = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        active: true,
      }

      const result = redactSensitive(input)

      expect(result).toEqual(input)
    })

    it('should preserve non-sensitive fields while redacting sensitive ones', () => {
      const input = {
        username: 'johndoe',
        password: 'secret',
        email: 'john@example.com',
        token: 'abc123',
        role: 'admin',
      }

      const result = redactSensitive(input)

      expect(result).toEqual({
        username: 'johndoe',
        password: '[REDACTED]',
        email: 'john@example.com',
        token: '[REDACTED]',
        role: 'admin',
      })
    })
  })

  describe('primitive handling', () => {
    it.each([
      ['string', 'hello world'],
      ['number', 42],
      ['boolean true', true],
      ['boolean false', false],
      ['null', null],
      ['undefined', undefined],
    ] as const)('should pass %s unchanged', (_, value) => {
      const result = redactSensitive(value)
      expect(result).toBe(value)
    })

    it('should handle empty object', () => {
      const result = redactSensitive({})
      expect(result).toEqual({})
    })

    it('should handle empty array', () => {
      const result = redactSensitive([])
      expect(result).toEqual([])
    })
  })
})
