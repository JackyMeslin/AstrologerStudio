/**
 * Accessibility Tests for Heading Hierarchy
 *
 * Verifies correct heading hierarchy across pages:
 * - Each page should have exactly one <h1>
 * - Headings must be sequential (h1 > h2 > h3, no skipping levels)
 * - Sidebar/navigation headings should not use <h1> (reserved for page content)
 *
 * @see https://www.w3.org/WAI/tutorials/page-structure/headings/
 * @module src/test/components/heading-hierarchy
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf-8')
}

/**
 * Extracts all HTML heading tags from source code, capturing multi-line content.
 * Returns array of { level, line, text } for each heading found.
 * `text` contains the full content between the opening and closing tags.
 */
function findHeadings(source: string): { level: number; line: number; text: string }[] {
  const lines = source.split('\n')
  const headings: { level: number; line: number; text: string }[] = []

  let inHeading = false
  let currentLevel = 0
  let startLine = 0
  let blockContent = ''

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!

    if (!inHeading) {
      const openMatch = line.match(/<h([1-6])[\s>]/)
      if (openMatch) {
        currentLevel = parseInt(openMatch[1]!, 10)
        startLine = i + 1
        blockContent = line
        inHeading = true

        // Check if closing tag is on the same line
        if (line.includes(`</h${currentLevel}>`)) {
          headings.push({ level: currentLevel, line: startLine, text: blockContent.trim() })
          inHeading = false
        }
      }
    } else {
      blockContent += '\n' + line
      if (line.includes(`</h${currentLevel}>`)) {
        headings.push({ level: currentLevel, line: startLine, text: blockContent.trim() })
        inHeading = false
      }
    }
  }

  return headings
}

describe('Heading Hierarchy', () => {
  describe('AdminSidebar', () => {
    const source = readSource('src/components/admin/AdminSidebar.tsx')
    const headings = findHeadings(source)

    it('should not contain an <h1> tag (page h1 is in page content)', () => {
      const h1Tags = headings.filter((h) => h.level === 1)
      expect(h1Tags).toHaveLength(0)
    })

    it('should use <h2> for sidebar title', () => {
      const h2Tags = headings.filter((h) => h.level === 2)
      expect(h2Tags.length).toBeGreaterThanOrEqual(1)
      expect(h2Tags.some((h) => h.text.includes('Admin Panel'))).toBe(true)
    })
  })

  describe('CalculationsPageContent', () => {
    const source = readSource('src/components/admin/CalculationsPageContent.tsx')
    const headings = findHeadings(source)

    it('should have exactly one <h1> for the page title', () => {
      const h1Tags = headings.filter((h) => h.level === 1)
      expect(h1Tags).toHaveLength(1)
      expect(h1Tags[0]!.text).toContain('Chart Calculations')
    })

    it('should use <h2> for section headings (not <h3>)', () => {
      const h3Tags = headings.filter((h) => h.level === 3)
      expect(h3Tags).toHaveLength(0)
    })

    it('should have section headings as <h2>', () => {
      const h2Tags = headings.filter((h) => h.level === 2)
      expect(h2Tags.length).toBeGreaterThanOrEqual(1)

      const expectedSections = [
        'Usage by Chart Type',
        'Distribution',
        'Period Comparison',
        'Usage Comparison by Type',
        'Detailed Breakdown',
        'Top Users by Calculations',
      ]

      for (const section of expectedSections) {
        expect(h2Tags.some((h) => h.text.includes(section))).toBe(true)
      }
    })

    it('should not skip heading levels (no h3 without h2, no h4 without h3)', () => {
      let maxLevel = 0
      for (const heading of headings) {
        // Each heading level should be at most one more than the previous max
        if (heading.level > maxLevel + 1 && maxLevel > 0) {
          expect.fail(
            `Heading level skipped: found <h${heading.level}> at line ${heading.line} ` +
              `but previous max level was <h${maxLevel}>. Content: ${heading.text}`,
          )
        }
        if (heading.level > maxLevel) {
          maxLevel = heading.level
        }
      }
    })
  })

  describe('Pricing Page', () => {
    const source = readSource('src/app/(legal)/pricing/page.tsx')
    const headings = findHeadings(source)

    it('should use "Pricing" as the consistent <h1> text', () => {
      const h1Tags = headings.filter((h) => h.level === 1)
      for (const h1 of h1Tags) {
        expect(h1.text).toContain('Pricing')
      }
    })

    it('should use <h2> for sub-headings like "Your Subscription" and "Choose Your Plan"', () => {
      const h2Tags = headings.filter((h) => h.level === 2)
      const subHeadings = ['Your Subscription', 'Choose Your Plan', 'Configuration Error']

      for (const subHeading of subHeadings) {
        expect(h2Tags.some((h) => h.text.includes(subHeading))).toBe(true)
      }
    })

    it('should not use <h1> for sub-headings', () => {
      const h1Tags = headings.filter((h) => h.level === 1)
      const forbiddenH1Texts = ['Your Subscription', 'Choose Your Plan', 'Configuration Error']

      for (const h1 of h1Tags) {
        for (const forbidden of forbiddenH1Texts) {
          expect(h1.text).not.toContain(forbidden)
        }
      }
    })

    it('should not skip heading levels', () => {
      // Within each return branch, headings should be sequential
      // Since each branch is independent, we verify no h3+ without h2 in the whole file
      const hasH2 = headings.some((h) => h.level === 2)
      const hasH3 = headings.some((h) => h.level === 3)
      if (hasH3) {
        expect(hasH2).toBe(true)
      }
    })
  })
})
