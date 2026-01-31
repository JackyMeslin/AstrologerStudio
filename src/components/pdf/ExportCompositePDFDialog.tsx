'use client'

import { useCallback } from 'react'
import { getCompositeChart } from '@/actions/astrology'
import { enrichedSubjectToSubject, sanitizeFilename } from '@/lib/pdf/utils'
import { ExportPDFDialogBase, type DialogOption, type PDFBranding } from './ExportPDFDialogBase'
import type { ChartData, Aspect, ChartResponse } from '@/types/astrology'
import type { PDFExportOptions } from '@/stores/pdfBrandingStore'
import type { DateFormat, TimeFormat } from '@/lib/utils/date'

interface ExportCompositePDFDialogProps {
  /** Composite chart data */
  chartData: ChartData
  /** Aspects array */
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

/** Dialog options for composite chart export */
const COMPOSITE_OPTIONS: DialogOption[] = [
  { id: 'include-chart', label: 'Chart Wheel', optionKey: 'includeChartWheel' },
  { id: 'include-planets', label: 'Composite Positions', optionKey: 'includePlanets' },
  { id: 'include-houses', label: 'House Cusps', optionKey: 'includeHouses' },
  { id: 'include-aspects', label: 'Composite Aspects', optionKey: 'includeAspects' },
  { id: 'include-interp', label: 'Interpretation Notes', optionKey: 'includeInterpretation' },
]

/**
 * ExportCompositePDFDialog Component
 */
export function ExportCompositePDFDialog({
  chartData,
  aspects,
  chartWheelHtml,
  notes,
  variant = 'outline',
  size = 'default',
  dateFormat = 'EU',
  timeFormat = '24h',
}: ExportCompositePDFDialogProps) {
  const regenerateChart = useCallback(async (): Promise<string | null> => {
    if (!chartData.first_subject || !chartData.second_subject) {
      return null
    }
    const subject1 = enrichedSubjectToSubject(chartData.first_subject)
    const subject2 = enrichedSubjectToSubject(chartData.second_subject)
    const lightChartResponse: ChartResponse = await getCompositeChart(subject1, subject2, {
      theme: 'classic',
    })
    return lightChartResponse.chart_wheel || null
  }, [chartData.first_subject, chartData.second_subject])

  const generateFilename = useCallback((): string => {
    const name1 = sanitizeFilename(chartData.first_subject?.name || 'Person_A')
    const name2 = sanitizeFilename(chartData.second_subject?.name || 'Person_B')
    const dateStr = new Date().toISOString().split('T')[0]
    return `${name1}_${name2}_composite_${dateStr}.pdf`
  }, [chartData.first_subject, chartData.second_subject])

  const renderPDF = useCallback(
    async (
      chartWheelImage: string | null,
      branding: PDFBranding,
      exportOptions: PDFExportOptions,
      dateFormatProp: DateFormat,
      timeFormatProp: TimeFormat,
    ) => {
      const { CompositeChartPDF } = await import('./CompositeChartPDF')
      return (
        <CompositeChartPDF
          chartData={chartData}
          firstSubject={chartData.first_subject}
          secondSubject={chartData.second_subject}
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
    [chartData, aspects, notes],
  )

  return (
    <ExportPDFDialogBase
      title="Export Composite Chart as PDF"
      description="Configure what to include in your composite report."
      chartType="composite"
      successMessage="Composite PDF exported successfully!"
      options={COMPOSITE_OPTIONS}
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
