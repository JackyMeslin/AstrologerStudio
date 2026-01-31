'use client'

import { useCallback } from 'react'
import { getNatalChart } from '@/actions/astrology'
import { enrichedSubjectToSubject, generatePdfFilename } from '@/lib/pdf/utils'
import { ExportPDFDialogBase, type DialogOption, type PDFBranding } from './ExportPDFDialogBase'
import { NatalChartPDF } from './NatalChartPDF'
import type { ChartData, Aspect, ChartResponse } from '@/types/astrology'
import type { Subject } from '@/types/subjects'
import type { PDFExportOptions } from '@/stores/pdfBrandingStore'
import type { DateFormat, TimeFormat } from '@/lib/utils/date'

interface ExportPDFDialogProps {
  /** Chart data containing subject and calculations */
  chartData: ChartData
  /** Aspects array */
  aspects: Aspect[]
  /** Subject for regenerating chart with light theme (optional - will derive from chartData if not provided) */
  subject?: Subject
  /** Current chart wheel SVG HTML (fallback if regeneration fails) */
  chartWheelHtml?: string
  /** Interpretation notes */
  notes?: string
  /** Chart type for title customization */
  chartType?: string
  /** Trigger button variant */
  variant?: 'default' | 'outline' | 'ghost'
  /** Trigger button size */
  size?: 'default' | 'sm' | 'icon'
  /** Date format preference */
  dateFormat?: DateFormat
  /** Time format preference */
  timeFormat?: TimeFormat
}

/** Dialog options for natal chart export */
const NATAL_OPTIONS: DialogOption[] = [
  { id: 'include-chart', label: 'Chart Wheel', optionKey: 'includeChartWheel' },
  { id: 'include-planets', label: 'Planetary Positions', optionKey: 'includePlanets' },
  { id: 'include-houses', label: 'House Cusps', optionKey: 'includeHouses' },
  { id: 'include-aspects', label: 'Aspects', optionKey: 'includeAspects' },
  { id: 'include-interp', label: 'Interpretation Notes', optionKey: 'includeInterpretation' },
]

/**
 * ExportPDFDialog Component
 *
 * Dialog for configuring and triggering PDF export of natal charts.
 * Always regenerates chart with light theme for print-optimized output.
 */
export function ExportPDFDialog({
  chartData,
  aspects,
  subject,
  chartWheelHtml,
  notes,
  chartType,
  variant = 'outline',
  size = 'default',
  dateFormat = 'EU',
  timeFormat = '24h',
}: ExportPDFDialogProps) {
  const regenerateChart = useCallback(async (): Promise<string | null> => {
    const subjectForApi = subject || enrichedSubjectToSubject(chartData.subject)
    const lightChartResponse: ChartResponse = await getNatalChart(subjectForApi, {
      theme: 'classic',
    })
    return lightChartResponse.chart_wheel || null
  }, [chartData.subject, subject])

  const generateFilename = useCallback((): string => {
    return generatePdfFilename(chartData.subject.name, 'natal_chart')
  }, [chartData.subject.name])

  const renderPDF = useCallback(
    (
      chartWheelImage: string | null,
      branding: PDFBranding,
      exportOptions: PDFExportOptions,
      dateFormatProp: DateFormat,
      timeFormatProp: TimeFormat,
    ) => (
      <NatalChartPDF
        chartData={chartData}
        aspects={aspects}
        chartWheelImage={chartWheelImage}
        notes={exportOptions.includeInterpretation ? notes : undefined}
        branding={branding}
        options={exportOptions}
        chartType={chartType}
        dateFormat={dateFormatProp}
        timeFormat={timeFormatProp}
      />
    ),
    [chartData, aspects, notes, chartType],
  )

  return (
    <ExportPDFDialogBase
      title="Export as PDF"
      description="Configure what to include in your PDF report."
      chartType="natal"
      successMessage="PDF exported successfully!"
      options={NATAL_OPTIONS}
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
