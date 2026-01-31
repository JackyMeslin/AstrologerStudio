import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * PDF Branding Type
 * - 'default': Uses AstrologerStudio branding
 * - 'text': Uses custom text branding
 * - 'logo': Uses uploaded logo image (currently disabled - UI not implemented)
 *
 * NOTE: Logo upload feature is temporarily disabled pending UI implementation.
 * The logoData field is preserved for future use but has no setter method.
 * To re-enable: add setLogoData action and corresponding UI in PDFBrandingSettings.
 */
export type BrandingType = 'default' | 'text' | 'logo'

/**
 * PDF Export Options
 */
export interface PDFExportOptions {
  includeChartWheel: boolean
  includeAspects: boolean
  includeInterpretation: boolean
  includeHouses: boolean
  includePlanets: boolean
  includeRelationshipScore: boolean
}

/**
 * PDF Branding Store State
 */
export interface PDFBrandingState {
  // Branding settings
  brandingType: BrandingType
  /** Base64 encoded logo image. Reserved for future logo upload feature. */
  logoData: string | null
  brandingText: string
  showFooter: boolean
  footerText: string

  // Export options
  exportOptions: PDFExportOptions

  // Actions
  setBrandingType: (type: BrandingType) => void
  setBrandingText: (text: string) => void
  setShowFooter: (show: boolean) => void
  setFooterText: (text: string) => void
  setExportOption: <K extends keyof PDFExportOptions>(key: K, value: PDFExportOptions[K]) => void
  resetToDefaults: () => void
}

const DEFAULT_EXPORT_OPTIONS: PDFExportOptions = {
  includeChartWheel: true,
  includeAspects: true,
  includeInterpretation: true,
  includeHouses: true,
  includePlanets: true,
  includeRelationshipScore: true,
}

const DEFAULT_STATE = {
  brandingType: 'default' as BrandingType,
  logoData: null,
  brandingText: '',
  showFooter: true,
  footerText: '',
  exportOptions: DEFAULT_EXPORT_OPTIONS,
}

/**
 * PDF Branding Store
 *
 * Manages PDF export branding preferences, stored in localStorage.
 *
 * @example
 * ```tsx
 * const { brandingType, setBrandingType } = usePDFBranding()
 *
 * // Set custom text branding
 * setBrandingType('text')
 * setBrandingText('My Astrology Practice')
 * ```
 */
export const usePDFBranding = create<PDFBrandingState>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,

      setBrandingType: (type) => set({ brandingType: type }),

      setBrandingText: (text) => set({ brandingText: text }),

      setShowFooter: (show) => set({ showFooter: show }),

      setFooterText: (text) => set({ footerText: text }),

      setExportOption: (key, value) =>
        set((state) => ({
          exportOptions: { ...state.exportOptions, [key]: value },
        })),

      resetToDefaults: () => set(DEFAULT_STATE),
    }),
    { name: 'pdf-branding' },
  ),
)
