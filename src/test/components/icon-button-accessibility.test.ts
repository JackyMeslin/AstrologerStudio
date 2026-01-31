/**
 * Accessibility Tests for Icon-Only Buttons
 *
 * Verifies that icon-only buttons use `aria-label` instead of `title`
 * for screen reader accessibility. The `title` attribute is not reliably
 * announced as an accessible name by screen readers, so `aria-label`
 * must be used on buttons that contain only an icon.
 *
 * @module src/test/components/icon-button-accessibility
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

/** Files that contain icon-only buttons */
const ICON_BUTTON_FILES = [
  'src/components/SavedCalculationsSidebar.tsx',
  'src/components/TimelineEventTable.tsx',
  'src/components/ui/SolarReturnNavigator.tsx',
  'src/components/ui/LunarReturnNavigator.tsx',
  'src/components/ui/DateTimeLocationSelector.tsx',
  'src/components/AppLayout.tsx',
]

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf-8')
}

/**
 * Finds icon-only button blocks (size="icon") that use title= instead of aria-label=.
 * Returns an array of { line, text } for each violation found.
 */
function findTitleOnIconButtons(source: string): { line: number; text: string }[] {
  const lines = source.split('\n')
  const violations: { line: number; text: string }[] = []

  // Track multi-line <Button ...> blocks
  let inButtonBlock = false
  let buttonStartLine = 0
  let buttonBlock = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!

    if (line.includes('<Button') && !line.includes('</Button')) {
      inButtonBlock = true
      buttonStartLine = i + 1
      buttonBlock = line
    } else if (inButtonBlock) {
      buttonBlock += '\n' + line
    }

    if (inButtonBlock && (line.includes('>') || line.includes('/>'))) {
      // Check if this is a size="icon" button with title= but no aria-label=
      if (buttonBlock.includes('size="icon"') && buttonBlock.includes('title=') && !buttonBlock.includes('aria-label')) {
        violations.push({ line: buttonStartLine, text: buttonBlock.trim() })
      }
      inButtonBlock = false
      buttonBlock = ''
    }
  }

  return violations
}

describe('Icon-only button accessibility', () => {
  it('should not use title= on size="icon" buttons (use aria-label instead)', () => {
    const allViolations: { file: string; line: number; text: string }[] = []

    for (const file of ICON_BUTTON_FILES) {
      const source = readSource(file)
      const violations = findTitleOnIconButtons(source)
      for (const v of violations) {
        allViolations.push({ file, ...v })
      }
    }

    if (allViolations.length > 0) {
      const details = allViolations
        .map((v) => `  ${v.file}:${v.line}`)
        .join('\n')
      expect.fail(
        `Found ${allViolations.length} icon-only button(s) using title= instead of aria-label=:\n${details}`,
      )
    }
  })

  describe('each file should have aria-label on icon-only buttons', () => {
    it('SavedCalculationsSidebar: delete button has aria-label', () => {
      const source = readSource('src/components/SavedCalculationsSidebar.tsx')
      // The delete button should have aria-label="Delete chart"
      expect(source).toContain('aria-label="Delete chart"')
    })

    it('TimelineEventTable: pagination buttons have aria-label', () => {
      const source = readSource('src/components/TimelineEventTable.tsx')
      expect(source).toContain('aria-label="Previous page"')
      expect(source).toContain('aria-label="Next page"')
    })

    it('SolarReturnNavigator: navigation buttons have aria-label', () => {
      const source = readSource('src/components/ui/SolarReturnNavigator.tsx')
      expect(source).toContain('aria-label="Previous Year"')
      expect(source).toContain('aria-label="Next Year"')
      // Expand/collapse uses dynamic aria-label
      expect(source).toMatch(/aria-label=\{isExpanded \? 'Collapse' : 'Expand'\}/)
    })

    it('LunarReturnNavigator: navigation buttons have aria-label', () => {
      const source = readSource('src/components/ui/LunarReturnNavigator.tsx')
      expect(source).toContain('aria-label="Previous Return"')
      expect(source).toContain('aria-label="Next Return"')
      expect(source).toContain('aria-label="Current Month"')
      expect(source).toMatch(/aria-label=\{isExpanded \? 'Collapse' : 'Expand'\}/)
    })

    it('DateTimeLocationSelector: step and control buttons have aria-label', () => {
      const source = readSource('src/components/ui/DateTimeLocationSelector.tsx')
      expect(source).toContain('aria-label="Step Backward"')
      expect(source).toContain('aria-label="Step Forward"')
      expect(source).toContain('aria-label="Go to now"')
      expect(source).toContain('aria-label="Reset to original"')
      expect(source).toMatch(/aria-label=\{isExpanded \? 'Collapse' : 'Expand'\}/)
    })

    it('AppLayout: logout button has aria-label', () => {
      const source = readSource('src/components/AppLayout.tsx')
      expect(source).toContain('aria-label="Logout"')
    })
  })
})
