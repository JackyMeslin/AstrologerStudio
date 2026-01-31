/**
 * Unit Tests for pdfBrandingStore
 *
 * Tests the PDF branding Zustand store that manages export preferences.
 *
 * Note: The setLogoData method was removed as the logo upload feature is
 * temporarily disabled. The logoData field remains for future use.
 *
 * @module src/stores/pdfBrandingStore
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { usePDFBranding, type PDFBrandingState } from '@/stores/pdfBrandingStore'

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Reset store to default state before each test
 */
function resetStore() {
  // Clear localStorage first
  if (typeof localStorage !== 'undefined') {
    localStorage.clear()
  }
  // Reset state using the store's resetToDefaults action
  usePDFBranding.getState().resetToDefaults()
}

// ============================================================================
// Tests
// ============================================================================

describe('pdfBrandingStore', () => {
  beforeEach(() => {
    resetStore()
  })

  describe('initial state', () => {
    it('should have default branding type', () => {
      const state = usePDFBranding.getState()
      expect(state.brandingType).toBe('default')
    })

    it('should have null logoData (reserved for future use)', () => {
      const state = usePDFBranding.getState()
      expect(state.logoData).toBeNull()
    })

    it('should have empty branding text', () => {
      const state = usePDFBranding.getState()
      expect(state.brandingText).toBe('')
    })

    it('should have footer enabled by default', () => {
      const state = usePDFBranding.getState()
      expect(state.showFooter).toBe(true)
    })

    it('should have empty footer text', () => {
      const state = usePDFBranding.getState()
      expect(state.footerText).toBe('')
    })

    it('should have default export options', () => {
      const state = usePDFBranding.getState()
      expect(state.exportOptions).toEqual({
        includeChartWheel: true,
        includeAspects: true,
        includeInterpretation: true,
        includeHouses: true,
        includePlanets: true,
        includeRelationshipScore: true,
      })
    })
  })

  describe('setBrandingType', () => {
    it('should update branding type to text', () => {
      const { setBrandingType } = usePDFBranding.getState()
      setBrandingType('text')
      expect(usePDFBranding.getState().brandingType).toBe('text')
    })

    it('should update branding type to logo', () => {
      const { setBrandingType } = usePDFBranding.getState()
      setBrandingType('logo')
      expect(usePDFBranding.getState().brandingType).toBe('logo')
    })

    it('should update branding type back to default', () => {
      const { setBrandingType } = usePDFBranding.getState()
      setBrandingType('text')
      setBrandingType('default')
      expect(usePDFBranding.getState().brandingType).toBe('default')
    })
  })

  describe('setBrandingText', () => {
    it('should update branding text', () => {
      const { setBrandingText } = usePDFBranding.getState()
      setBrandingText('My Astrology Practice')
      expect(usePDFBranding.getState().brandingText).toBe('My Astrology Practice')
    })

    it('should allow empty branding text', () => {
      const { setBrandingText } = usePDFBranding.getState()
      setBrandingText('Some text')
      setBrandingText('')
      expect(usePDFBranding.getState().brandingText).toBe('')
    })
  })

  describe('setShowFooter', () => {
    it('should disable footer', () => {
      const { setShowFooter } = usePDFBranding.getState()
      setShowFooter(false)
      expect(usePDFBranding.getState().showFooter).toBe(false)
    })

    it('should re-enable footer', () => {
      const { setShowFooter } = usePDFBranding.getState()
      setShowFooter(false)
      setShowFooter(true)
      expect(usePDFBranding.getState().showFooter).toBe(true)
    })
  })

  describe('setFooterText', () => {
    it('should update footer text', () => {
      const { setFooterText } = usePDFBranding.getState()
      setFooterText('Custom Footer Text')
      expect(usePDFBranding.getState().footerText).toBe('Custom Footer Text')
    })
  })

  describe('setExportOption', () => {
    it('should update includeChartWheel', () => {
      const { setExportOption } = usePDFBranding.getState()
      setExportOption('includeChartWheel', false)
      expect(usePDFBranding.getState().exportOptions.includeChartWheel).toBe(false)
    })

    it('should update includeAspects', () => {
      const { setExportOption } = usePDFBranding.getState()
      setExportOption('includeAspects', false)
      expect(usePDFBranding.getState().exportOptions.includeAspects).toBe(false)
    })

    it('should update includeInterpretation', () => {
      const { setExportOption } = usePDFBranding.getState()
      setExportOption('includeInterpretation', false)
      expect(usePDFBranding.getState().exportOptions.includeInterpretation).toBe(false)
    })

    it('should preserve other options when updating one', () => {
      const { setExportOption } = usePDFBranding.getState()
      setExportOption('includeChartWheel', false)
      const options = usePDFBranding.getState().exportOptions
      expect(options.includeChartWheel).toBe(false)
      expect(options.includeAspects).toBe(true)
      expect(options.includeInterpretation).toBe(true)
      expect(options.includeHouses).toBe(true)
      expect(options.includePlanets).toBe(true)
      expect(options.includeRelationshipScore).toBe(true)
    })
  })

  describe('resetToDefaults', () => {
    it('should reset all settings to defaults', () => {
      const store = usePDFBranding.getState()

      // Modify all settings
      store.setBrandingType('text')
      store.setBrandingText('Custom Text')
      store.setShowFooter(false)
      store.setFooterText('Custom Footer')
      store.setExportOption('includeChartWheel', false)

      // Reset to defaults
      store.resetToDefaults()

      const state = usePDFBranding.getState()
      expect(state.brandingType).toBe('default')
      expect(state.brandingText).toBe('')
      expect(state.showFooter).toBe(true)
      expect(state.footerText).toBe('')
      expect(state.logoData).toBeNull()
      expect(state.exportOptions.includeChartWheel).toBe(true)
    })
  })

  describe('logoData field (reserved for future)', () => {
    it('should not have setLogoData method exposed', () => {
      const state = usePDFBranding.getState() as PDFBrandingState & { setLogoData?: unknown }
      // setLogoData was intentionally removed when logo upload feature was disabled
      expect(state.setLogoData).toBeUndefined()
    })

    it('should have logoData field that defaults to null', () => {
      const state = usePDFBranding.getState()
      expect(state.logoData).toBeNull()
    })

    it('should reset logoData to null when resetToDefaults is called', () => {
      const store = usePDFBranding.getState()
      store.resetToDefaults()
      expect(usePDFBranding.getState().logoData).toBeNull()
    })
  })
})
