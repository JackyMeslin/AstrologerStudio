/**
 * Tests verifying removal of unused LoadingStates components.
 *
 * The file src/components/LoadingStates.tsx exported four skeleton components
 * (TableSkeleton, ChartSkeleton, CardSkeleton, PageSkeleton) that were never
 * imported anywhere in the codebase. This test ensures the dead code stays removed.
 *
 * @module src/components/LoadingStates
 */
import { describe, it, expect } from 'vitest'
import { existsSync } from 'fs'
import { resolve } from 'path'
import { execSync } from 'child_process'

describe('LoadingStates removal', () => {
  const projectRoot = resolve(__dirname, '../../..')
  const removedFile = resolve(projectRoot, 'src/components/LoadingStates.tsx')

  it('should not have the LoadingStates.tsx file', () => {
    expect(existsSync(removedFile)).toBe(false)
  })

  it('should not have any imports of LoadingStates in the codebase', () => {
    // Search for any import referencing LoadingStates in src/, excluding this test
    const result = execSync(
      `grep -r "from.*LoadingStates" src/ --include="*.ts" --include="*.tsx" --exclude="*removal.test*" || true`,
      { cwd: projectRoot, encoding: 'utf-8' },
    )
    expect(result.trim()).toBe('')
  })

  it('should not reference removed component names as imports in source files', () => {
    const componentNames = [
      'TableSkeleton',
      'ChartSkeleton',
      'CardSkeleton',
      'PageSkeleton',
    ]

    for (const name of componentNames) {
      // Only search for import statements to avoid false positives from test files or docs
      const result = execSync(
        `grep -r "import.*${name}.*from" src/ --include="*.ts" --include="*.tsx" || true`,
        { cwd: projectRoot, encoding: 'utf-8' },
      )
      expect(result.trim(), `Found unexpected import of ${name}`).toBe('')
    }
  })
})
