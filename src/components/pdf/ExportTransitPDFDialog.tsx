'use client'

import { useCallback } from 'react'
import { getTransitChart } from '@/actions/astrology'
import { enrichedSubjectToSubject, generatePdfFilename } from '@/lib/pdf/utils'
import { ExportPDFDialogBase, type DialogOption, type PDFBranding } from './ExportPDFDialogBase'
import type { ChartData, Aspect, ChartResponse } from '@/types/astrology'
import type { PDFExportOptions } from '@/stores/pdfBrandingStore'
import type { DateFormat, TimeFormat } from '@/lib/utils/date'

interface ExportTransitPDFDialogProps {
  /** Combined transit chart data */
  chartData: ChartData
  /** Natal chart data */
  natalChartData: ChartData
  /** Transit chart data */
  transitChartData: ChartData
  /** Aspects array (transit-to-natal) */
  aspects: Aspect[]
  /** Current chart wheel SVG HTML (fallback) */
  chartWheelHtml?: string
  /** Interpretation notes */
  notes?: string
  /** Trigger button variant */
  variant?: 'default' | 'outline' | 'ghost'
  /** Trigger button size */
  size?: 'default' | 'sm' | 'icon'
  /** Date format preference */
  dateFormat?: DateFormat
  /** Time format preference */
  timeFormat?: TimeFormat
}

/** Dialog options for transit chart export */
const TRANSIT_OPTIONS: DialogOption[] = [
  { id: 'include-chart', label: 'Chart Wheel', optionKey: 'includeChartWheel' },
  { id: 'include-planets', label: 'Planetary Positions', optionKey: 'includePlanets' },
  { id: 'include-houses', label: 'House Cusps & Overlays', optionKey: 'includeHouses' },
  { id: 'include-aspects', label: 'Transit-to-Natal Aspects', optionKey: 'includeAspects' },
  { id: 'include-interp', label: 'Interpretation Notes', optionKey: 'includeInterpretation' },
]

/**
 * ExportTransitPDFDialog Component
 *
 * Dialog for configuring and triggering PDF export of Transit charts.
 * Derives Subject objects from ChartData for light theme regeneration.
 */
export function ExportTransitPDFDialog({
  chartData,
  natalChartData,
  transitChartData,
  aspects,
  chartWheelHtml,
  notes,
  variant = 'outline',
  size = 'default',
  dateFormat = 'EU',
  timeFormat = '24h',
}: ExportTransitPDFDialogProps) {
  const regenerateChart = useCallback(async (): Promise<string | null> => {
    const natalSubject = enrichedSubjectToSubject(natalChartData.subject)
    const transitSubject = enrichedSubjectToSubject(transitChartData.subject)
    const lightChartResponse: ChartResponse = await getTransitChart(natalSubject, transitSubject, {
      theme: 'classic',
    })
    return lightChartResponse.chart_wheel || null
  }, [natalChartData.subject, transitChartData.subject])

  const generateFilename = useCallback((): string => {
    return generatePdfFilename(natalChartData.subject.name, 'transit_chart')
  }, [natalChartData.subject.name])

  const renderPDF = useCallback(
    async (
      chartWheelImage: string | null,
      branding: PDFBranding,
      exportOptions: PDFExportOptions,
      dateFormatProp: DateFormat,
      timeFormatProp: TimeFormat,
    ) => {
      const { TransitChartPDF } = await import('./TransitChartPDF')
      return (
        <TransitChartPDF
          chartData={chartData}
          natalChartData={natalChartData}
          transitChartData={transitChartData}
          aspects={aspects}
          chartWheelImage={chartWheelImage}
          notes={exportOptions.includeInterpretation ? notes : undefined}
          branding={branding}
          options={exportOptions}
          dateFormat={dateFormatProp}
          timeFormat={timeFormatProp}
        />
      )
    },
    [chartData, natalChartData, transitChartData, aspects, notes],
  )

  return (
    <ExportPDFDialogBase
      title="Export Transit Chart as PDF"
      description="Configure what to include in your transit report."
      chartType="transit"
      successMessage="Transit PDF exported successfully!"
      options={TRANSIT_OPTIONS}
      hasNotes={!!notes && notes.trim().length > 0}
      variant={variant}
      size={size}
      dateFormat={dateFormat}
      timeFormat={timeFormat}
      chartWheelHtml={chartWheelHtml}
      regenerateChart={regenerateChart}
      generateFilename={generateFilename}
      renderPDF={renderPDF}
    />
  )
}
