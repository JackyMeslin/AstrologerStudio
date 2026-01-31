/**
 * Tests for User model admin analytics indexes in Prisma schema
 *
 * Validates that the User model has @@index([subscriptionPlan]) and
 * @@index([lastActiveAt]) directives for optimizing admin dashboard
 * queries (groupBy on subscription plans, orderBy/filters on lastActiveAt).
 *
 * @module src/test/lib/db/user-admin-indexes.test.ts
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ============================================================================
// Schema Index Tests for Admin Analytics
// ============================================================================

describe('User model admin analytics indexes', () => {
  /**
   * Read and parse the Prisma schema to verify index configuration.
   * This is a static analysis test that doesn't require database connectivity.
   */
  const schemaPath = join(process.cwd(), 'prisma', 'schema.prisma')
  const schemaContent = readFileSync(schemaPath, 'utf-8')

  /**
   * Extract the User model definition from the schema.
   * The regex captures everything between "model User {" and the closing "}"
   */
  function getUserModelContent(): string {
    const modelMatch = schemaContent.match(/model User \{[\s\S]*?^\}/m)
    if (!modelMatch) {
      throw new Error('User model not found in schema')
    }
    return modelMatch[0]
  }

  describe('subscriptionPlan index', () => {
    it('should have an index on the subscriptionPlan field', () => {
      const userModel = getUserModelContent()

      // Check for @@index([subscriptionPlan]) directive
      expect(userModel).toMatch(/@@index\(\[subscriptionPlan\]\)/)
    })

    it('should have subscriptionPlan field defined with default value', () => {
      const userModel = getUserModelContent()

      // Verify subscriptionPlan field exists with default value
      expect(userModel).toMatch(/subscriptionPlan\s+String\s+@default\("free"\)/)
    })
  })

  describe('lastActiveAt index', () => {
    it('should have an index on the lastActiveAt field', () => {
      const userModel = getUserModelContent()

      // Check for @@index([lastActiveAt]) directive
      expect(userModel).toMatch(/@@index\(\[lastActiveAt\]\)/)
    })

    it('should have lastActiveAt field defined as optional DateTime', () => {
      const userModel = getUserModelContent()

      // Verify lastActiveAt field exists as optional DateTime
      expect(userModel).toMatch(/lastActiveAt\s+DateTime\?/)
    })
  })

  describe('all User model indexes', () => {
    it('should have all required User model indexes for admin queries', () => {
      const userModel = getUserModelContent()

      // Verify all expected indexes exist, including admin analytics indexes
      expect(userModel).toMatch(/@@index\(\[username\]\)/)
      expect(userModel).toMatch(/@@index\(\[customerId\]\)/)
      expect(userModel).toMatch(/@@index\(\[email\]\)/)
      expect(userModel).toMatch(/@@index\(\[subscriptionPlan\]\)/)
      expect(userModel).toMatch(/@@index\(\[lastActiveAt\]\)/)
    })

    it('should define admin indexes after core field indexes', () => {
      const userModel = getUserModelContent()

      // Ensure proper ordering: core indexes, then admin analytics indexes
      const emailIndexPos = userModel.indexOf('@@index([email])')
      const subscriptionPlanIndexPos = userModel.indexOf('@@index([subscriptionPlan])')
      const lastActiveAtIndexPos = userModel.indexOf('@@index([lastActiveAt])')

      expect(emailIndexPos).toBeGreaterThan(-1)
      expect(subscriptionPlanIndexPos).toBeGreaterThan(-1)
      expect(lastActiveAtIndexPos).toBeGreaterThan(-1)

      // Admin indexes should come after email index
      expect(subscriptionPlanIndexPos).toBeGreaterThan(emailIndexPos)
      expect(lastActiveAtIndexPos).toBeGreaterThan(subscriptionPlanIndexPos)
    })
  })
})
