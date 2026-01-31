/**
 * Unit Tests for AI Usage Response Schema Validation
 *
 * Tests the Zod validation schema used for validating the /api/ai/usage
 * response. This ensures that invalid API responses are caught early
 * at the fetch point rather than causing errors in consuming components.
 *
 * @module src/hooks/useAIUsage
 */
import { describe, it, expect } from 'vitest'
import { AIUsageResponseSchema } from '@/types/schemas'

describe('AIUsageResponseSchema', () => {
  /**
   * Tests for AI usage response validation.
   * The API returns usage, limit, remaining, and optionally plan.
   */

  it('should validate a complete valid response', () => {
    const validResponse = {
      usage: 5,
      limit: 20,
      remaining: 15,
      plan: 'pro',
    }

    const result = AIUsageResponseSchema.safeParse(validResponse)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.usage).toBe(5)
      expect(result.data.limit).toBe(20)
      expect(result.data.remaining).toBe(15)
      expect(result.data.plan).toBe('pro')
    }
  })

  it('should validate response without optional plan field', () => {
    const responseWithoutPlan = {
      usage: 3,
      limit: 5,
      remaining: 2,
    }

    const result = AIUsageResponseSchema.safeParse(responseWithoutPlan)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.usage).toBe(3)
      expect(result.data.limit).toBe(5)
      expect(result.data.remaining).toBe(2)
      expect(result.data.plan).toBeUndefined()
    }
  })

  it('should validate response with zero values', () => {
    const zeroValues = {
      usage: 0,
      limit: 0,
      remaining: 0,
    }

    const result = AIUsageResponseSchema.safeParse(zeroValues)

    expect(result.success).toBe(true)
  })

  it('should reject response missing usage field', () => {
    const missingUsage = {
      limit: 20,
      remaining: 15,
    }

    const result = AIUsageResponseSchema.safeParse(missingUsage)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain('usage')
    }
  })

  it('should reject response missing limit field', () => {
    const missingLimit = {
      usage: 5,
      remaining: 15,
    }

    const result = AIUsageResponseSchema.safeParse(missingLimit)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain('limit')
    }
  })

  it('should reject response missing remaining field', () => {
    const missingRemaining = {
      usage: 5,
      limit: 20,
    }

    const result = AIUsageResponseSchema.safeParse(missingRemaining)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain('remaining')
    }
  })

  it('should reject non-numeric usage value', () => {
    const invalidUsage = {
      usage: 'five',
      limit: 20,
      remaining: 15,
    }

    const result = AIUsageResponseSchema.safeParse(invalidUsage)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain('usage')
    }
  })

  it('should reject non-numeric limit value', () => {
    const invalidLimit = {
      usage: 5,
      limit: 'twenty',
      remaining: 15,
    }

    const result = AIUsageResponseSchema.safeParse(invalidLimit)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain('limit')
    }
  })

  it('should reject non-numeric remaining value', () => {
    const invalidRemaining = {
      usage: 5,
      limit: 20,
      remaining: 'fifteen',
    }

    const result = AIUsageResponseSchema.safeParse(invalidRemaining)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain('remaining')
    }
  })

  it('should reject null as a response', () => {
    const result = AIUsageResponseSchema.safeParse(null)

    expect(result.success).toBe(false)
  })

  it('should reject empty object', () => {
    const result = AIUsageResponseSchema.safeParse({})

    expect(result.success).toBe(false)
  })

  it('should accept response with extra fields (passthrough behavior)', () => {
    // Zod by default strips extra fields but doesn't reject them
    const responseWithExtra = {
      usage: 5,
      limit: 20,
      remaining: 15,
      extraField: 'ignored',
    }

    const result = AIUsageResponseSchema.safeParse(responseWithExtra)

    expect(result.success).toBe(true)
  })
})
