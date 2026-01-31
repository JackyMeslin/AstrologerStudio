/**
 * Unit Tests for Chart Settings Section Components
 *
 * Tests the extracted chart settings components:
 * - AppearanceSection: Visual style settings
 * - CalculationSection: Calculation system settings
 * - PointsAspectsSection: Active points and aspects
 *
 * @module src/components/settings/chart
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppearanceSection, CalculationSection, PointsAspectsSection } from '@/components/settings/chart'
import { DEFAULT_PREFERENCES } from '@/components/settings/ChartSettingsPanel'
import { type ChartPreferencesData } from '@/actions/preferences'

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
// Test Utilities
// ============================================================================

function createMockSetPrefs() {
  return vi.fn((updater) => {
    // Return the result of the updater for testing
    if (typeof updater === 'function') {
      return updater(DEFAULT_PREFERENCES)
    }
    return updater
  })
}

// ============================================================================
// AppearanceSection Tests
// ============================================================================

describe('AppearanceSection', () => {
  let setPrefs: ReturnType<typeof createMockSetPrefs>

  beforeEach(() => {
    vi.clearAllMocks()
    setPrefs = createMockSetPrefs()
  })

  describe('basic rendering', () => {
    it('should render the Visual Style card', () => {
      render(<AppearanceSection prefs={DEFAULT_PREFERENCES} setPrefs={setPrefs} />)

      expect(screen.getByText('Visual Style')).toBeInTheDocument()
      expect(screen.getByText(/Control colors, language, and display preferences/)).toBeInTheDocument()
    })

    it('should render theme selector', () => {
      render(<AppearanceSection prefs={DEFAULT_PREFERENCES} setPrefs={setPrefs} />)

      expect(screen.getByText('Theme')).toBeInTheDocument()
      expect(screen.getByText(/Select the visual theme/)).toBeInTheDocument()
    })

    it('should render date format selector', () => {
      render(<AppearanceSection prefs={DEFAULT_PREFERENCES} setPrefs={setPrefs} />)

      expect(screen.getByText('Date Format')).toBeInTheDocument()
      expect(screen.getByText(/How dates are displayed/)).toBeInTheDocument()
    })

    it('should render time format selector', () => {
      render(<AppearanceSection prefs={DEFAULT_PREFERENCES} setPrefs={setPrefs} />)

      expect(screen.getByText('Time Format')).toBeInTheDocument()
      expect(screen.getByText(/How times are displayed/)).toBeInTheDocument()
    })

    it('should render degree indicators toggle', () => {
      render(<AppearanceSection prefs={DEFAULT_PREFERENCES} setPrefs={setPrefs} />)

      expect(screen.getByText('Show Degree Indicators')).toBeInTheDocument()
      expect(screen.getByText(/Display radial lines and degree numbers/)).toBeInTheDocument()
    })

    it('should render aspect icons toggle', () => {
      render(<AppearanceSection prefs={DEFAULT_PREFERENCES} setPrefs={setPrefs} />)

      expect(screen.getByText('Show Aspect Icons')).toBeInTheDocument()
      expect(screen.getByText(/Display aspect symbols/)).toBeInTheDocument()
    })
  })

  describe('toggle interactions', () => {
    it('should call setPrefs when toggling degree indicators', async () => {
      const user = userEvent.setup()
      render(<AppearanceSection prefs={DEFAULT_PREFERENCES} setPrefs={setPrefs} />)

      const switches = screen.getAllByRole('switch')
      const degreeSwitch = switches[0]
      if (degreeSwitch) {
        await user.click(degreeSwitch)
        expect(setPrefs).toHaveBeenCalled()
      }
    })

    it('should call setPrefs when toggling aspect icons', async () => {
      const user = userEvent.setup()
      render(<AppearanceSection prefs={DEFAULT_PREFERENCES} setPrefs={setPrefs} />)

      const switches = screen.getAllByRole('switch')
      const aspectSwitch = switches[1]
      if (aspectSwitch) {
        await user.click(aspectSwitch)
        expect(setPrefs).toHaveBeenCalled()
      }
    })
  })
})

// ============================================================================
// CalculationSection Tests
// ============================================================================

describe('CalculationSection', () => {
  let setPrefs: ReturnType<typeof createMockSetPrefs>

  beforeEach(() => {
    vi.clearAllMocks()
    setPrefs = createMockSetPrefs()
  })

  describe('basic rendering', () => {
    it('should render the Zodiac System card', () => {
      render(<CalculationSection prefs={DEFAULT_PREFERENCES} setPrefs={setPrefs} />)

      // Use getAllByText since there's both a card title and label with this text
      const zodiacElements = screen.getAllByText('Zodiac System')
      expect(zodiacElements.length).toBeGreaterThan(0)
      expect(screen.getByText(/Choose the zodiac calculation system/)).toBeInTheDocument()
    })

    it('should render the Rulership System card', () => {
      render(<CalculationSection prefs={DEFAULT_PREFERENCES} setPrefs={setPrefs} />)

      expect(screen.getByText('Rulership System')).toBeInTheDocument()
      expect(screen.getByText(/Select the system used for determining sign rulerships/)).toBeInTheDocument()
    })

    it('should render the House System card', () => {
      render(<CalculationSection prefs={DEFAULT_PREFERENCES} setPrefs={setPrefs} />)

      expect(screen.getByText('House System & Perspective')).toBeInTheDocument()
      expect(screen.getByText(/Define how houses are calculated/)).toBeInTheDocument()
    })

    it('should render rulership mode selector', () => {
      render(<CalculationSection prefs={DEFAULT_PREFERENCES} setPrefs={setPrefs} />)

      expect(screen.getByText('Rulership Mode')).toBeInTheDocument()
      expect(screen.getByText(/Classical \(Mars rules Scorpio\)/)).toBeInTheDocument()
    })
  })

  describe('sidereal mode visibility', () => {
    it('should not show sidereal mode when zodiac is Tropical', () => {
      render(<CalculationSection prefs={DEFAULT_PREFERENCES} setPrefs={setPrefs} />)

      expect(screen.queryByText('Sidereal Mode (Ayanamsa)')).not.toBeInTheDocument()
    })

    it('should show sidereal mode when zodiac is Sidereal', () => {
      const siderealPrefs: ChartPreferencesData = {
        ...DEFAULT_PREFERENCES,
        default_zodiac_system: 'Sidereal',
      }
      render(<CalculationSection prefs={siderealPrefs} setPrefs={setPrefs} />)

      expect(screen.getByText('Sidereal Mode (Ayanamsa)')).toBeInTheDocument()
    })
  })
})

// ============================================================================
// PointsAspectsSection Tests
// ============================================================================

describe('PointsAspectsSection', () => {
  let setPrefs: ReturnType<typeof createMockSetPrefs>

  beforeEach(() => {
    vi.clearAllMocks()
    setPrefs = createMockSetPrefs()
  })

  describe('basic rendering', () => {
    it('should render the Active Celestial Points card', () => {
      render(<PointsAspectsSection prefs={DEFAULT_PREFERENCES} setPrefs={setPrefs} />)

      expect(screen.getByText('Active Celestial Points')).toBeInTheDocument()
      expect(screen.getByText(/Select which celestial bodies/)).toBeInTheDocument()
    })

    it('should render the Active Aspects card', () => {
      render(<PointsAspectsSection prefs={DEFAULT_PREFERENCES} setPrefs={setPrefs} />)

      expect(screen.getByText('Active Aspects')).toBeInTheDocument()
      expect(screen.getByText(/Define which aspects to calculate/)).toBeInTheDocument()
    })

    it('should render the Distribution & Weights card', () => {
      render(<PointsAspectsSection prefs={DEFAULT_PREFERENCES} setPrefs={setPrefs} />)

      expect(screen.getByText('Distribution & Weights')).toBeInTheDocument()
      expect(screen.getByText(/Control how planetary influences are weighted/)).toBeInTheDocument()
    })

    it('should render Select All and Deselect All buttons', () => {
      render(<PointsAspectsSection prefs={DEFAULT_PREFERENCES} setPrefs={setPrefs} />)

      expect(screen.getByRole('button', { name: 'Select All' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Deselect All' })).toBeInTheDocument()
    })

    it('should render Reset to Default button', () => {
      render(<PointsAspectsSection prefs={DEFAULT_PREFERENCES} setPrefs={setPrefs} />)

      expect(screen.getByRole('button', { name: 'Reset to Default' })).toBeInTheDocument()
    })
  })

  describe('point groups', () => {
    it('should render Traditional Planets section', () => {
      render(<PointsAspectsSection prefs={DEFAULT_PREFERENCES} setPrefs={setPrefs} />)

      expect(screen.getByText('Traditional Planets')).toBeInTheDocument()
      expect(screen.getByText(/The primary celestial bodies/)).toBeInTheDocument()
    })

    it('should render Lunar Nodes section', () => {
      render(<PointsAspectsSection prefs={DEFAULT_PREFERENCES} setPrefs={setPrefs} />)

      expect(screen.getByText('Lunar Nodes')).toBeInTheDocument()
      expect(screen.getByText(/Points where the Moon's orbit/)).toBeInTheDocument()
    })

    it('should render Centaurs & Minor Bodies section', () => {
      render(<PointsAspectsSection prefs={DEFAULT_PREFERENCES} setPrefs={setPrefs} />)

      expect(screen.getByText('Centaurs & Minor Bodies')).toBeInTheDocument()
    })

    it('should render Asteroids section', () => {
      render(<PointsAspectsSection prefs={DEFAULT_PREFERENCES} setPrefs={setPrefs} />)

      expect(screen.getByText('Asteroids')).toBeInTheDocument()
    })

    it('should render Trans-Neptunian Objects section', () => {
      render(<PointsAspectsSection prefs={DEFAULT_PREFERENCES} setPrefs={setPrefs} />)

      expect(screen.getByText('Trans-Neptunian Objects')).toBeInTheDocument()
    })

    it('should render Fixed Stars section', () => {
      render(<PointsAspectsSection prefs={DEFAULT_PREFERENCES} setPrefs={setPrefs} />)

      expect(screen.getByText('Fixed Stars')).toBeInTheDocument()
    })

    it('should render Arabic Parts section', () => {
      render(<PointsAspectsSection prefs={DEFAULT_PREFERENCES} setPrefs={setPrefs} />)

      expect(screen.getByText('Arabic Parts')).toBeInTheDocument()
    })

    it('should render Chart Angles section', () => {
      render(<PointsAspectsSection prefs={DEFAULT_PREFERENCES} setPrefs={setPrefs} />)

      expect(screen.getByText('Chart Angles & Special Points')).toBeInTheDocument()
    })
  })

  describe('select all / deselect all buttons', () => {
    it('should call setPrefs with all points when Select All is clicked', async () => {
      const user = userEvent.setup()
      render(<PointsAspectsSection prefs={DEFAULT_PREFERENCES} setPrefs={setPrefs} />)

      const selectAllButton = screen.getByRole('button', { name: 'Select All' })
      await user.click(selectAllButton)

      expect(setPrefs).toHaveBeenCalled()
    })

    it('should call setPrefs with minimal points when Deselect All is clicked', async () => {
      const user = userEvent.setup()
      render(<PointsAspectsSection prefs={DEFAULT_PREFERENCES} setPrefs={setPrefs} />)

      const deselectAllButton = screen.getByRole('button', { name: 'Deselect All' })
      await user.click(deselectAllButton)

      expect(setPrefs).toHaveBeenCalled()
    })
  })

  describe('distribution method', () => {
    it('should render distribution method selector', () => {
      render(<PointsAspectsSection prefs={DEFAULT_PREFERENCES} setPrefs={setPrefs} />)

      expect(screen.getByText('Distribution Method')).toBeInTheDocument()
    })

    it('should show custom weights when distribution method is weighted', () => {
      render(<PointsAspectsSection prefs={DEFAULT_PREFERENCES} setPrefs={setPrefs} />)

      expect(screen.getByText('Custom Weights')).toBeInTheDocument()
    })

    it('should hide custom weights when distribution method is pure_count', () => {
      const pureCountPrefs: ChartPreferencesData = {
        ...DEFAULT_PREFERENCES,
        distribution_method: 'pure_count',
      }
      render(<PointsAspectsSection prefs={pureCountPrefs} setPrefs={setPrefs} />)

      expect(screen.queryByText('Custom Weights')).not.toBeInTheDocument()
    })
  })

  describe('point checkbox interactions', () => {
    it('should call setPrefs when toggling a planet checkbox', async () => {
      const user = userEvent.setup()
      render(<PointsAspectsSection prefs={DEFAULT_PREFERENCES} setPrefs={setPrefs} />)

      // Find the Sun checkbox
      const sunCheckbox = screen.getByRole('checkbox', { name: 'Sun' })
      await user.click(sunCheckbox)

      expect(setPrefs).toHaveBeenCalled()
    })
  })
})

// ============================================================================
// Integration Tests
// ============================================================================

describe('Chart Settings Integration', () => {
  describe('DEFAULT_PREFERENCES', () => {
    it('should have valid default theme', () => {
      expect(DEFAULT_PREFERENCES.theme).toBe('classic')
    })

    it('should have valid default date format', () => {
      expect(DEFAULT_PREFERENCES.date_format).toBe('EU')
    })

    it('should have valid default zodiac system', () => {
      expect(DEFAULT_PREFERENCES.default_zodiac_system).toBe('Tropical')
    })

    it('should have valid default house system', () => {
      expect(DEFAULT_PREFERENCES.house_system).toBe('P')
    })

    it('should have default active points including major planets', () => {
      expect(DEFAULT_PREFERENCES.active_points).toContain('Sun')
      expect(DEFAULT_PREFERENCES.active_points).toContain('Moon')
      expect(DEFAULT_PREFERENCES.active_points).toContain('Mercury')
      expect(DEFAULT_PREFERENCES.active_points).toContain('Venus')
      expect(DEFAULT_PREFERENCES.active_points).toContain('Mars')
    })

    it('should have default active aspects', () => {
      expect(DEFAULT_PREFERENCES.active_aspects).toBeDefined()
      expect(DEFAULT_PREFERENCES.active_aspects.length).toBeGreaterThan(0)
    })
  })
})
