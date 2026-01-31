/**
 * Accessibility Tests for Form Input Label Associations
 *
 * Verifies that form inputs have proper label associations via:
 * - htmlFor/id pairing between label and input
 * - aria-label attribute on inputs without visible labels
 *
 * This ensures screen readers can announce what each input requires,
 * satisfying WCAG 2.1 success criterion 1.3.1 (Info and Relationships).
 *
 * @module src/test/components/form-label-associations
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

function readSource(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf-8')
}

describe('Form input label associations', () => {
  describe('SolarReturnNavigator', () => {
    it('step amount input has a label with htmlFor', () => {
      const source = readSource('src/components/ui/SolarReturnNavigator.tsx')
      expect(source).toContain('htmlFor="solar-return-step-amount"')
    })

    it('step amount input has an id', () => {
      const source = readSource('src/components/ui/SolarReturnNavigator.tsx')
      expect(source).toContain('id="solar-return-step-amount"')
    })

    it('step amount label has accessible text', () => {
      const source = readSource('src/components/ui/SolarReturnNavigator.tsx')
      expect(source).toContain('Step amount')
    })
  })

  describe('DateTimeLocationSelector', () => {
    it('step amount input has a label with htmlFor', () => {
      const source = readSource('src/components/ui/DateTimeLocationSelector.tsx')
      expect(source).toContain('htmlFor="dt-selector-step-amount"')
    })

    it('step amount input has an id', () => {
      const source = readSource('src/components/ui/DateTimeLocationSelector.tsx')
      expect(source).toContain('id="dt-selector-step-amount"')
    })

    it('step unit selector has a label with htmlFor', () => {
      const source = readSource('src/components/ui/DateTimeLocationSelector.tsx')
      expect(source).toContain('htmlFor="dt-selector-step-unit"')
    })

    it('date label has htmlFor pointing to date input', () => {
      const source = readSource('src/components/ui/DateTimeLocationSelector.tsx')
      expect(source).toContain('htmlFor="dt-selector-date"')
      expect(source).toContain('id="dt-selector-date"')
    })

    it('time label has htmlFor pointing to time input', () => {
      const source = readSource('src/components/ui/DateTimeLocationSelector.tsx')
      expect(source).toContain('htmlFor="dt-selector-time"')
      expect(source).toContain('id="dt-selector-time"')
    })
  })

  describe('LunarReturnNavigator', () => {
    it('year input has a label with htmlFor', () => {
      const source = readSource('src/components/ui/LunarReturnNavigator.tsx')
      expect(source).toContain('htmlFor="lunar-return-year"')
    })

    it('year input has an id', () => {
      const source = readSource('src/components/ui/LunarReturnNavigator.tsx')
      expect(source).toContain('id="lunar-return-year"')
    })

    it('year label has sr-only class for screen readers', () => {
      const source = readSource('src/components/ui/LunarReturnNavigator.tsx')
      expect(source).toContain('className="sr-only"')
      expect(source).toContain('Year')
    })
  })

  describe('OrbFilterInput', () => {
    it('uses a label element instead of a span for the orb prefix', () => {
      const source = readSource('src/components/charts/OrbFilterInput.tsx')
      expect(source).toContain('<label')
      expect(source).toContain('htmlFor="orb-filter-input"')
    })

    it('input has an id matching the label htmlFor', () => {
      const source = readSource('src/components/charts/OrbFilterInput.tsx')
      expect(source).toContain('id="orb-filter-input"')
    })

    it('does not use a span as a visual-only label', () => {
      const source = readSource('src/components/charts/OrbFilterInput.tsx')
      expect(source).not.toMatch(/<span[^>]*>Orb:<\/span>/)
    })
  })

  describe('SubjectLocationFields', () => {
    it('timezone label has htmlFor with dynamic idPrefix', () => {
      const source = readSource('src/components/SubjectLocationFields.tsx')
      expect(source).toContain('htmlFor={`${idPrefix}_timezone`}')
    })

    it('TimezoneCombobox receives id prop', () => {
      const source = readSource('src/components/SubjectLocationFields.tsx')
      expect(source).toContain('id={`${idPrefix}_timezone`}')
    })
  })

  describe('TimezoneCombobox', () => {
    it('accepts and passes id prop to the trigger button', () => {
      const source = readSource('src/components/TimezoneCombobox.tsx')
      expect(source).toContain('id?: string')
      expect(source).toContain('id={id}')
    })
  })

  describe('AppearanceSection', () => {
    it('theme label has htmlFor pointing to select trigger', () => {
      const source = readSource('src/components/settings/chart/AppearanceSection.tsx')
      expect(source).toContain('htmlFor="appearance-theme"')
      expect(source).toContain('id="appearance-theme"')
    })

    it('date format label has htmlFor pointing to select trigger', () => {
      const source = readSource('src/components/settings/chart/AppearanceSection.tsx')
      expect(source).toContain('htmlFor="appearance-date-format"')
      expect(source).toContain('id="appearance-date-format"')
    })

    it('time format label has htmlFor pointing to select trigger', () => {
      const source = readSource('src/components/settings/chart/AppearanceSection.tsx')
      expect(source).toContain('htmlFor="appearance-time-format"')
      expect(source).toContain('id="appearance-time-format"')
    })

    it('degree indicators switch has id matching label htmlFor', () => {
      const source = readSource('src/components/settings/chart/AppearanceSection.tsx')
      expect(source).toContain('htmlFor="appearance-degree-indicators"')
      expect(source).toContain('id="appearance-degree-indicators"')
    })

    it('aspect icons switch has id matching label htmlFor', () => {
      const source = readSource('src/components/settings/chart/AppearanceSection.tsx')
      expect(source).toContain('htmlFor="appearance-aspect-icons"')
      expect(source).toContain('id="appearance-aspect-icons"')
    })
  })

  describe('CalculationSection', () => {
    it('zodiac system label has htmlFor pointing to select trigger', () => {
      const source = readSource('src/components/settings/chart/CalculationSection.tsx')
      expect(source).toContain('htmlFor="calc-zodiac-system"')
      expect(source).toContain('id="calc-zodiac-system"')
    })

    it('sidereal mode label has htmlFor pointing to select trigger', () => {
      const source = readSource('src/components/settings/chart/CalculationSection.tsx')
      expect(source).toContain('htmlFor="calc-sidereal-mode"')
      expect(source).toContain('id="calc-sidereal-mode"')
    })

    it('rulership mode label has htmlFor pointing to select trigger', () => {
      const source = readSource('src/components/settings/chart/CalculationSection.tsx')
      expect(source).toContain('htmlFor="calc-rulership-mode"')
      expect(source).toContain('id="calc-rulership-mode"')
    })

    it('house system label has htmlFor pointing to select trigger', () => {
      const source = readSource('src/components/settings/chart/CalculationSection.tsx')
      expect(source).toContain('htmlFor="calc-house-system"')
      expect(source).toContain('id="calc-house-system"')
    })

    it('perspective type label has htmlFor pointing to select trigger', () => {
      const source = readSource('src/components/settings/chart/CalculationSection.tsx')
      expect(source).toContain('htmlFor="calc-perspective-type"')
      expect(source).toContain('id="calc-perspective-type"')
    })
  })

  describe('PointsAspectsSection', () => {
    it('distribution method label has htmlFor pointing to select trigger', () => {
      const source = readSource('src/components/settings/chart/PointsAspectsSection.tsx')
      expect(source).toContain('htmlFor="points-distribution-method"')
      expect(source).toContain('id="points-distribution-method"')
    })

    it('weight inputs have dynamic id matching label htmlFor', () => {
      const source = readSource('src/components/settings/chart/PointsAspectsSection.tsx')
      expect(source).toContain('htmlFor={`weight-${point}`}')
      expect(source).toContain('id={`weight-${point}`}')
    })
  })
})
