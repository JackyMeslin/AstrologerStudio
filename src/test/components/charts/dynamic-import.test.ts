/**
 * Tests for recharts dynamic import optimization
 *
 * These tests verify that recharts components are dynamically imported
 * using next/dynamic with { ssr: false } rather than statically imported.
 * This optimization reduces the initial bundle size by ~400KB.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

/**
 * List of files that should NOT have static imports from 'recharts'
 * These files use next/dynamic to load recharts on demand
 */
const DYNAMIC_CHART_FILES = [
  { path: 'app/(protected)/_components/EphemerisView.tsx', dir: 'src' },
  { path: 'components/charts/ChartDataView.tsx', dir: 'src' },
  { path: 'components/admin/CalculationsPageContent.tsx', dir: 'src' },
  { path: 'components/admin/CalculationStats.tsx', dir: 'src' },
  { path: 'components/admin/ChartTypeBreakdown.tsx', dir: 'src' },
  { path: 'components/admin/UsersByPlanChart.tsx', dir: 'src' },
  { path: 'components/admin/AIUsageChart.tsx', dir: 'src' },
]

/**
 * List of files that contain the actual recharts implementations
 * These ARE allowed to have static imports from 'recharts'
 */
const CHART_CONTENT_FILES = [
  { path: 'components/ephemeris/EphemerisChartContent.tsx', dir: 'src' },
  { path: 'components/charts/RadarChartContent.tsx', dir: 'src' },
  { path: 'components/admin/AdminChartContent.tsx', dir: 'src' },
]

const SRC_DIR = resolve(__dirname, '../../..')

describe('Recharts Dynamic Import Optimization', () => {
  /**
   * Verify that consumer files do NOT have static imports of recharts
   * These files should use next/dynamic to load chart components
   */
  describe('no static imports of recharts in consumer files', () => {
    DYNAMIC_CHART_FILES.forEach(({ path: filePath }) => {
      it(`${filePath} should not have static import of recharts`, () => {
        const fullPath = resolve(SRC_DIR, filePath)
        const content = readFileSync(fullPath, 'utf-8')

        // Check for static import patterns from 'recharts'
        const staticImportPattern = /^import\s+\{[^}]*\}\s+from\s+['"]recharts['"]/m

        expect(content).not.toMatch(staticImportPattern)
      })
    })
  })

  /**
   * Verify that consumer files use next/dynamic for loading charts
   */
  describe('uses next/dynamic for chart components', () => {
    DYNAMIC_CHART_FILES.forEach(({ path: filePath }) => {
      it(`${filePath} should use next/dynamic`, () => {
        const fullPath = resolve(SRC_DIR, filePath)
        const content = readFileSync(fullPath, 'utf-8')

        // Check for dynamic import from next/dynamic
        const dynamicImportPattern = /import\s+dynamic\s+from\s+['"]next\/dynamic['"]/

        expect(content).toMatch(dynamicImportPattern)
      })

      it(`${filePath} should use ssr: false option`, () => {
        const fullPath = resolve(SRC_DIR, filePath)
        const content = readFileSync(fullPath, 'utf-8')

        // Check for ssr: false option in dynamic imports
        const ssrFalsePattern = /ssr:\s*false/

        expect(content).toMatch(ssrFalsePattern)
      })
    })
  })

  /**
   * Verify that chart content files (the actual implementations) DO have recharts imports
   */
  describe('chart content files have recharts imports', () => {
    CHART_CONTENT_FILES.forEach(({ path: filePath }) => {
      it(`${filePath} should import from recharts`, () => {
        const fullPath = resolve(SRC_DIR, filePath)
        const content = readFileSync(fullPath, 'utf-8')

        // These files SHOULD have recharts imports
        const rechartsImportPattern = /from\s+['"]recharts['"]/

        expect(content).toMatch(rechartsImportPattern)
      })
    })
  })

  /**
   * Verify that loading skeleton is used for chart loading states
   */
  describe('uses ChartLoadingSkeleton for loading state', () => {
    DYNAMIC_CHART_FILES.forEach(({ path: filePath }) => {
      it(`${filePath} should import ChartLoadingSkeleton`, () => {
        const fullPath = resolve(SRC_DIR, filePath)
        const content = readFileSync(fullPath, 'utf-8')

        // Check for ChartLoadingSkeleton import
        const skeletonImportPattern = /ChartLoadingSkeleton/

        expect(content).toMatch(skeletonImportPattern)
      })
    })
  })
})
