/**
 * Accessibility Tests for Form Label Associations
 *
 * Tests that form inputs have proper label associations for screen readers.
 * This ensures WCAG 2.1 compliance for form accessibility.
 *
 * @module src/test/components/form-label-associations
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OrbFilterInput } from '@/components/charts/OrbFilterInput'
import {
  AppearanceSection,
  CalculationSection,
  PointsAspectsSection,
  DEFAULT_PREFERENCES,
} from '@/components/settings/ChartSettingsPanel'

// ============================================================================
// Mocks
// ============================================================================

// Mock Prisma to prevent any DB access
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), findMany: vi.fn() },
    subject: { findUnique: vi.fn(), findMany: vi.fn() },
  },
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// ============================================================================
// OrbFilterInput Label Association Tests
// ============================================================================

describe('OrbFilterInput Accessibility', () => {
  const mockOnChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should have a visible label associated with the input', () => {
    render(<OrbFilterInput value={5} onChange={mockOnChange} />)

    const input = screen.getByRole('spinbutton')
    expect(input).toHaveAttribute('id', 'orb-filter-input')

    // Check that there's a label with htmlFor pointing to the input
    const label = screen.getByText('Orb:')
    expect(label).toHaveAttribute('for', 'orb-filter-input')
  })

  it('should be accessible via label text', () => {
    render(<OrbFilterInput value={5} onChange={mockOnChange} />)

    // The input should be findable by its label text
    const input = screen.getByLabelText('Orb:')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('type', 'number')
  })
})

// ============================================================================
// AppearanceSection Label Association Tests
// ============================================================================

describe('AppearanceSection Accessibility', () => {
  const mockSetPrefs = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should have accessible theme selector', () => {
    render(<AppearanceSection prefs={DEFAULT_PREFERENCES} setPrefs={mockSetPrefs} />)

    // Check label has htmlFor
    const themeLabel = screen.getByText('Theme')
    expect(themeLabel).toHaveAttribute('for', 'appearance-theme')
  })

  it('should have accessible date format selector', () => {
    render(<AppearanceSection prefs={DEFAULT_PREFERENCES} setPrefs={mockSetPrefs} />)

    const dateFormatLabel = screen.getByText('Date Format')
    expect(dateFormatLabel).toHaveAttribute('for', 'appearance-date-format')
  })

  it('should have accessible time format selector', () => {
    render(<AppearanceSection prefs={DEFAULT_PREFERENCES} setPrefs={mockSetPrefs} />)

    const timeFormatLabel = screen.getByText('Time Format')
    expect(timeFormatLabel).toHaveAttribute('for', 'appearance-time-format')
  })

  it('should have accessible degree indicators toggle', () => {
    render(<AppearanceSection prefs={DEFAULT_PREFERENCES} setPrefs={mockSetPrefs} />)

    const degreeLabel = screen.getByText('Show Degree Indicators')
    expect(degreeLabel).toHaveAttribute('for', 'appearance-degree-indicators')
  })

  it('should have accessible aspect icons toggle', () => {
    render(<AppearanceSection prefs={DEFAULT_PREFERENCES} setPrefs={mockSetPrefs} />)

    const aspectLabel = screen.getByText('Show Aspect Icons')
    expect(aspectLabel).toHaveAttribute('for', 'appearance-aspect-icons')
  })
})

// ============================================================================
// CalculationSection Label Association Tests
// ============================================================================

describe('CalculationSection Accessibility', () => {
  const mockSetPrefs = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should have accessible zodiac system selector', () => {
    render(<CalculationSection prefs={DEFAULT_PREFERENCES} setPrefs={mockSetPrefs} />)

    // Find the label for zodiac system (not the card title)
    const labels = screen.getAllByText('Zodiac System')
    const zodiacLabel = labels.find((el) => el.tagName.toLowerCase() === 'label')
    expect(zodiacLabel).toHaveAttribute('for', 'calc-zodiac-system')
  })

  it('should have accessible rulership mode selector', () => {
    render(<CalculationSection prefs={DEFAULT_PREFERENCES} setPrefs={mockSetPrefs} />)

    const ruleshipLabel = screen.getByText('Rulership Mode')
    expect(ruleshipLabel).toHaveAttribute('for', 'calc-rulership-mode')
  })

  it('should have accessible house system selector', () => {
    render(<CalculationSection prefs={DEFAULT_PREFERENCES} setPrefs={mockSetPrefs} />)

    const houseLabel = screen.getByText('House System')
    expect(houseLabel).toHaveAttribute('for', 'calc-house-system')
  })

  it('should have accessible perspective type selector', () => {
    render(<CalculationSection prefs={DEFAULT_PREFERENCES} setPrefs={mockSetPrefs} />)

    const perspectiveLabel = screen.getByText('Perspective Type')
    expect(perspectiveLabel).toHaveAttribute('for', 'calc-perspective-type')
  })
})

// ============================================================================
// PointsAspectsSection Label Association Tests
// ============================================================================

describe('PointsAspectsSection Accessibility', () => {
  const mockSetPrefs = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should have accessible distribution method selector', () => {
    render(<PointsAspectsSection prefs={DEFAULT_PREFERENCES} setPrefs={mockSetPrefs} />)

    const distributionLabel = screen.getByText('Distribution Method')
    expect(distributionLabel).toHaveAttribute('for', 'points-distribution-method')
  })

  it('should have accessible point checkboxes with labels', () => {
    render(<PointsAspectsSection prefs={DEFAULT_PREFERENCES} setPrefs={mockSetPrefs} />)

    // Check that Sun checkbox has a label
    const sunCheckbox = screen.getByRole('checkbox', { name: 'Sun' })
    expect(sunCheckbox).toHaveAttribute('id', 'point-Sun')

    // The label for point-Sun should exist and point to it
    const sunLabels = screen.getAllByText('Sun')
    const pointLabel = sunLabels.find((el) => {
      const labelEl = el.closest('label')
      return labelEl?.getAttribute('for') === 'point-Sun'
    })
    expect(pointLabel).toBeDefined()
  })

  it('should have accessible aspect checkboxes with labels', () => {
    render(<PointsAspectsSection prefs={DEFAULT_PREFERENCES} setPrefs={mockSetPrefs} />)

    // Check that conjunction aspect checkbox has a label
    const conjunctionCheckbox = screen.getByRole('checkbox', { name: 'conjunction' })
    expect(conjunctionCheckbox).toHaveAttribute('id', 'aspect-conjunction')
  })
})

// ============================================================================
// General WCAG Compliance Tests
// ============================================================================

describe('WCAG 2.1 Form Accessibility Compliance', () => {
  const mockSetPrefs = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('all switches in AppearanceSection should have accessible names', () => {
    render(<AppearanceSection prefs={DEFAULT_PREFERENCES} setPrefs={mockSetPrefs} />)

    // All switches should have an accessible name
    const switches = screen.getAllByRole('switch')
    expect(switches.length).toBeGreaterThan(0)

    switches.forEach((switchEl) => {
      expect(switchEl).toHaveAccessibleName()
    })
  })

  it('all comboboxes in CalculationSection should have accessible names', () => {
    render(<CalculationSection prefs={DEFAULT_PREFERENCES} setPrefs={mockSetPrefs} />)

    // All comboboxes (select triggers) should have accessible names
    const comboboxes = screen.getAllByRole('combobox')
    expect(comboboxes.length).toBeGreaterThan(0)

    comboboxes.forEach((combobox) => {
      expect(combobox).toHaveAccessibleName()
    })
  })

  it('all checkboxes in PointsAspectsSection should have accessible names', () => {
    render(<PointsAspectsSection prefs={DEFAULT_PREFERENCES} setPrefs={mockSetPrefs} />)

    // All checkboxes should have accessible names
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes.length).toBeGreaterThan(0)

    checkboxes.forEach((checkbox) => {
      expect(checkbox).toHaveAccessibleName()
    })
  })
})
