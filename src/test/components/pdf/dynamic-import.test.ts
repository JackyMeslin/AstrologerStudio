/**
 * Tests for PDF dialog dynamic import optimization
 *
 * These tests verify that @react-pdf/renderer and PDF document components
 * are dynamically imported on-demand rather than statically imported at the
 * top of each dialog file. This optimization reduces the initial bundle size
 * by ~500KB.
 *
 * Architecture:
 * - ExportPDFDialogBase.tsx handles the dynamic import of @react-pdf/renderer
 * - Individual dialog files (ExportPDFDialog.tsx, etc.) delegate to the base
 * - PDF document components are dynamically imported in the renderPDF callback
 *
 * @module src/components/pdf/Export*PDFDialog
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * List of PDF dialog files that delegate to ExportPDFDialogBase
 */
const PDF_DIALOG_FILES = [
  'ExportPDFDialog.tsx',
  'ExportTransitPDFDialog.tsx',
  'ExportSynastryPDFDialog.tsx',
  'ExportSolarReturnPDFDialog.tsx',
  'ExportLunarReturnPDFDialog.tsx',
  'ExportCompositePDFDialog.tsx',
]

/**
 * Dialog files that dynamically import their PDF component (all except ExportPDFDialog which uses static import for NatalChartPDF)
 */
const DIALOGS_WITH_DYNAMIC_PDF_IMPORT = [
  { file: 'ExportTransitPDFDialog.tsx', component: 'TransitChartPDF' },
  { file: 'ExportSynastryPDFDialog.tsx', component: 'SynastryChartPDF' },
  { file: 'ExportSolarReturnPDFDialog.tsx', component: 'SolarReturnPDF' },
  { file: 'ExportLunarReturnPDFDialog.tsx', component: 'LunarReturnPDF' },
  { file: 'ExportCompositePDFDialog.tsx', component: 'CompositeChartPDF' },
]

const PDF_COMPONENTS_DIR = resolve(__dirname, '../../../components/pdf')

describe('PDF Dialog Dynamic Import Optimization', () => {
  /**
   * Verify that ExportPDFDialogBase.tsx contains the dynamic import of @react-pdf/renderer.
   * This is where the centralized dynamic import logic lives.
   */
  describe('ExportPDFDialogBase centralized dynamic import', () => {
    it('ExportPDFDialogBase.tsx should dynamically import @react-pdf/renderer', () => {
      const filePath = resolve(PDF_COMPONENTS_DIR, 'ExportPDFDialogBase.tsx')
      const content = readFileSync(filePath, 'utf-8')

      // Check for dynamic import pattern
      const dynamicImportPatterns = [
        /await\s+import\s*\(\s*['"]@react-pdf\/renderer['"]\s*\)/,
        /import\s*\(\s*['"]@react-pdf\/renderer['"]\s*\)/,
      ]

      const hasImport = dynamicImportPatterns.some((pattern) => pattern.test(content))
      expect(hasImport).toBe(true)

      // Verify it's destructuring pdf from the import
      const pdfDestructurePatterns = [
        /const\s+\{\s*pdf\s*\}\s*=\s*await\s+import\s*\(\s*['"]@react-pdf\/renderer['"]\s*\)/,
      ]

      const hasValidPattern = pdfDestructurePatterns.some((pattern) => pattern.test(content))
      expect(hasValidPattern).toBe(true)
    })

    it('ExportPDFDialogBase.tsx should not have static import of @react-pdf/renderer', () => {
      const filePath = resolve(PDF_COMPONENTS_DIR, 'ExportPDFDialogBase.tsx')
      const content = readFileSync(filePath, 'utf-8')

      // Check for static import patterns at the top level
      const staticImportPatterns = [
        /^import\s+\{[^}]*\bpdf\b[^}]*\}\s+from\s+['"]@react-pdf\/renderer['"]/m,
        /^import\s+\*\s+as\s+\w+\s+from\s+['"]@react-pdf\/renderer['"]/m,
        /^import\s+pdf\s+from\s+['"]@react-pdf\/renderer['"]/m,
      ]

      for (const pattern of staticImportPatterns) {
        expect(content).not.toMatch(pattern)
      }
    })

    it('ExportPDFDialogBase.tsx should have a comment explaining the dynamic import', () => {
      const filePath = resolve(PDF_COMPONENTS_DIR, 'ExportPDFDialogBase.tsx')
      const content = readFileSync(filePath, 'utf-8')

      // Check for the explanatory comment
      const commentPattern = /\/\/\s*[Dd]ynamically\s+import.*@react-pdf\/renderer/

      expect(content).toMatch(commentPattern)
    })
  })

  /**
   * Verify that no PDF dialog file has a static import of @react-pdf/renderer
   * at the top level. This ensures the library is not bundled in the initial chunk.
   */
  describe('no static imports of @react-pdf/renderer in dialog files', () => {
    PDF_DIALOG_FILES.forEach((fileName) => {
      it(`${fileName} should not have static import of @react-pdf/renderer`, () => {
        const filePath = resolve(PDF_COMPONENTS_DIR, fileName)
        const content = readFileSync(filePath, 'utf-8')

        // Check for static import patterns at the top level
        const staticImportPatterns = [
          /^import\s+\{[^}]*\bpdf\b[^}]*\}\s+from\s+['"]@react-pdf\/renderer['"]/m,
          /^import\s+\*\s+as\s+\w+\s+from\s+['"]@react-pdf\/renderer['"]/m,
          /^import\s+pdf\s+from\s+['"]@react-pdf\/renderer['"]/m,
        ]

        for (const pattern of staticImportPatterns) {
          expect(content).not.toMatch(pattern)
        }
      })
    })
  })

  /**
   * Verify that all dialog files use ExportPDFDialogBase
   */
  describe('all dialogs use ExportPDFDialogBase', () => {
    PDF_DIALOG_FILES.forEach((fileName) => {
      it(`${fileName} should import and use ExportPDFDialogBase`, () => {
        const filePath = resolve(PDF_COMPONENTS_DIR, fileName)
        const content = readFileSync(filePath, 'utf-8')

        // Check for import of ExportPDFDialogBase
        expect(content).toMatch(/import\s+\{[^}]*ExportPDFDialogBase[^}]*\}\s+from\s+['"]\.\/ExportPDFDialogBase['"]/)

        // Check that it uses <ExportPDFDialogBase in JSX
        expect(content).toMatch(/<ExportPDFDialogBase/)
      })
    })
  })

  /**
   * Verify that dialog files (except ExportPDFDialog) dynamically import their PDF document components.
   * ExportPDFDialog uses static import for NatalChartPDF because it's rendered synchronously in the callback.
   */
  describe('dialogs with dynamic PDF component imports', () => {
    DIALOGS_WITH_DYNAMIC_PDF_IMPORT.forEach(({ file, component }) => {
      it(`${file} should dynamically import ${component}`, () => {
        const filePath = resolve(PDF_COMPONENTS_DIR, file)
        const content = readFileSync(filePath, 'utf-8')

        // Check for dynamic import of the PDF component
        const dynamicComponentPatterns = [
          new RegExp(`await\\s+import\\s*\\(\\s*['"]\\.\\.?\\/${component}['"]\\s*\\)`),
          new RegExp(`import\\s*\\(\\s*['"]\\.\\.?\\/${component}['"]\\s*\\)`),
        ]

        const hasImport = dynamicComponentPatterns.some((pattern) => pattern.test(content))
        expect(hasImport).toBe(true)

        // Also verify it's being destructured properly
        const destructurePattern = new RegExp(`\\{\\s*${component}\\s*\\}`)
        expect(content).toMatch(destructurePattern)
      })
    })
  })

  /**
   * Verify ExportPDFDialog uses NatalChartPDF (can be static since it's used in renderPDF callback)
   */
  describe('ExportPDFDialog uses NatalChartPDF', () => {
    it('ExportPDFDialog.tsx should use NatalChartPDF component', () => {
      const filePath = resolve(PDF_COMPONENTS_DIR, 'ExportPDFDialog.tsx')
      const content = readFileSync(filePath, 'utf-8')

      // Check that NatalChartPDF is imported (static is OK for this one since it's returned from callback)
      expect(content).toMatch(/NatalChartPDF/)

      // Check that it's used in JSX
      expect(content).toMatch(/<NatalChartPDF/)
    })
  })

  /**
   * Verify the shared utility functions are imported from the centralized location
   */
  describe('shared utilities are imported from @/lib/pdf/utils', () => {
    PDF_DIALOG_FILES.forEach((fileName) => {
      it(`${fileName} should import utilities from @/lib/pdf/utils`, () => {
        const filePath = resolve(PDF_COMPONENTS_DIR, fileName)
        const content = readFileSync(filePath, 'utf-8')

        // Check for import from @/lib/pdf/utils
        expect(content).toMatch(/from\s+['"]@\/lib\/pdf\/utils['"]/)
      })
    })
  })
})
