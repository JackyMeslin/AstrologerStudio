/**
 * Tests for AdminAuditLog model onDelete policy in Prisma schema
 *
 * Validates that the AdminAuditLog model has proper onDelete: SetNull policy
 * on the admin relation to preserve audit logs when an admin is deleted
 * (for compliance purposes).
 *
 * @module src/test/lib/db/admin-audit-log-ondelete.test.ts
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ============================================================================
// Schema Tests for AdminAuditLog onDelete Policy
// ============================================================================

describe('AdminAuditLog model onDelete policy', () => {
  /**
   * Read and parse the Prisma schema to verify onDelete configuration.
   * This is a static analysis test that doesn't require database connectivity.
   */
  const schemaPath = join(process.cwd(), 'prisma', 'schema.prisma')
  const schemaContent = readFileSync(schemaPath, 'utf-8')

  /**
   * Extract the AdminAuditLog model definition from the schema.
   * The regex captures everything between "model AdminAuditLog {" and the closing "}"
   */
  function getAdminAuditLogModelContent(): string {
    const modelMatch = schemaContent.match(/model AdminAuditLog \{[\s\S]*?^\}/m)
    if (!modelMatch) {
      throw new Error('AdminAuditLog model not found in schema')
    }
    return modelMatch[0]
  }

  describe('admin relation onDelete policy', () => {
    it('should have onDelete: SetNull on admin relation', () => {
      const model = getAdminAuditLogModelContent()

      // Check for onDelete: SetNull in the admin relation
      expect(model).toMatch(/onDelete:\s*SetNull/)
    })

    it('should have adminId as nullable (String?)', () => {
      const model = getAdminAuditLogModelContent()

      // Verify adminId is nullable to support SetNull policy
      expect(model).toMatch(/adminId\s+String\?/)
    })

    it('should have admin relation as optional (AdminUser?)', () => {
      const model = getAdminAuditLogModelContent()

      // Verify admin relation is optional
      expect(model).toMatch(/admin\s+AdminUser\?/)
    })

    it('should reference adminId in the relation fields', () => {
      const model = getAdminAuditLogModelContent()

      // Verify the relation uses fields: [adminId]
      expect(model).toMatch(/fields:\s*\[adminId\]/)
    })

    it('should reference AdminUser id in the relation', () => {
      const model = getAdminAuditLogModelContent()

      // Verify the relation references AdminUser id
      expect(model).toMatch(/references:\s*\[id\]/)
    })
  })

  describe('AdminAuditLog model structure', () => {
    it('should have all required fields', () => {
      const model = getAdminAuditLogModelContent()

      // Verify essential fields exist
      expect(model).toMatch(/id\s+String/)
      expect(model).toMatch(/adminId\s+String\?/)
      expect(model).toMatch(/action\s+String/)
      expect(model).toMatch(/ipAddress\s+String/)
      expect(model).toMatch(/createdAt\s+DateTime/)
    })

    it('should have index on adminId for query performance', () => {
      const model = getAdminAuditLogModelContent()

      // Verify index exists on adminId
      expect(model).toMatch(/@@index\(\[adminId\]\)/)
    })
  })

  describe('comparison with AdminSession model', () => {
    /**
     * AdminSession uses onDelete: Cascade because sessions are not needed
     * for compliance after admin deletion. AdminAuditLog uses SetNull to
     * preserve the audit trail.
     */
    it('should use different onDelete policy than AdminSession', () => {
      // Get AdminSession model
      const sessionMatch = schemaContent.match(/model AdminSession \{[\s\S]*?^\}/m)
      if (!sessionMatch) {
        throw new Error('AdminSession model not found in schema')
      }
      const sessionModel = sessionMatch[0]

      // AdminSession should use Cascade
      expect(sessionModel).toMatch(/onDelete:\s*Cascade/)

      // AdminAuditLog should use SetNull
      const auditModel = getAdminAuditLogModelContent()
      expect(auditModel).toMatch(/onDelete:\s*SetNull/)
    })
  })
})
