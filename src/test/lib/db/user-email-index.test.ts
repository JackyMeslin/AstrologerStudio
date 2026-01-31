/**
 * Tests for User model email index in Prisma schema
 *
 * Validates that the User model has the @@index([email]) directive
 * for optimizing email lookup queries during authentication operations.
 *
 * @module src/test/lib/db/user-email-index.test.ts
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ============================================================================
// Schema Index Tests
// ============================================================================

describe('User model email index', () => {
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

  it('should have an index on the email field', () => {
    const userModel = getUserModelContent()

    // Check for @@index([email]) directive
    expect(userModel).toMatch(/@@index\(\[email\]\)/)
  })

  it('should have email field defined as optional unique', () => {
    const userModel = getUserModelContent()

    // Verify email field exists with @unique constraint
    expect(userModel).toMatch(/email\s+String\?\s+@unique/)
  })

  it('should have all required User model indexes', () => {
    const userModel = getUserModelContent()

    // Verify all expected indexes exist
    expect(userModel).toMatch(/@@index\(\[username\]\)/)
    expect(userModel).toMatch(/@@index\(\[customerId\]\)/)
    expect(userModel).toMatch(/@@index\(\[email\]\)/)
    expect(userModel).toMatch(/@@index\(\[subscriptionPlan\]\)/)
    expect(userModel).toMatch(/@@index\(\[lastActiveAt\]\)/)
  })

  it('should define email index after other field-level indexes', () => {
    const userModel = getUserModelContent()

    // Ensure proper ordering: username, customerId, then email indexes
    const usernameIndexPos = userModel.indexOf('@@index([username])')
    const customerIdIndexPos = userModel.indexOf('@@index([customerId])')
    const emailIndexPos = userModel.indexOf('@@index([email])')

    expect(usernameIndexPos).toBeGreaterThan(-1)
    expect(customerIdIndexPos).toBeGreaterThan(-1)
    expect(emailIndexPos).toBeGreaterThan(-1)

    // Email index should come after customerId index
    expect(emailIndexPos).toBeGreaterThan(customerIdIndexPos)
  })
})
