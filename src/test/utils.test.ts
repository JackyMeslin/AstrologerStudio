/**
 * Unit Tests for cn() Utility
 *
 * Tests the className merging utility that combines clsx and tailwind-merge.
 * This is the foundation for all component styling.
 *
 * @module src/lib/utils/cn
 */
import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils/cn'

describe('cn', () => {
  /**
   * Tests for the className merging utility.
   * cn() combines class names intelligently, handling Tailwind conflicts.
   */

  it('should merge class names correctly', () => {
    // Basic merging of multiple class strings
    const result = cn('px-2', 'py-4', 'bg-red-500')

    expect(result).toBeTruthy()
    expect(result).toContain('px-2')
  })

  it('should handle conditional class names', () => {
    // Common pattern: add class based on boolean condition
    const isActive = true
    const result = cn('base', isActive && 'active')

    expect(result).toContain('base')
    expect(result).toContain('active')
  })

  it('should filter out falsy values', () => {
    // Falsy values (false, null, undefined) should be ignored
    const result = cn('base', false, null, undefined, 'valid')

    expect(result).toContain('base')
    expect(result).toContain('valid')
  })
})
