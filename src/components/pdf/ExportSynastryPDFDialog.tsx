'use client'

import { useCallback } from 'react'
import { getSynastryChart } from '@/actions/astrology'
import { enrichedSubjectToSubject, sanitizeFilename } from '@/lib/pdf/utils'
import { ExportPDFDialogBase, type DialogOption, type PDFBranding } from './ExportPDFDialogBase'
import type { ChartData, Aspect, ChartResponse } from '@/types/astrology'
import type { PDFExportOptions } from '@/stores/pdfBrandingStore'
import type { DateFormat, TimeFormat } from '@/lib/utils/date'

interface ExportSynastryPDFDialogProps {
  /** Combined synastry chart data */
  chartData: ChartData
  /** Subject 1 chart data */
  subject1ChartData: ChartData
  /** Subject 2 chart data */
  subject2ChartData: ChartData
  /** Aspects array (inter-chart) */
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

/** Dialog options for synastry chart export */
const SYNASTRY_OPTIONS: DialogOption[] = [
  { id: 'include-chart', label: 'Chart Wheel', optionKey: 'includeChartWheel' },
  { id: 'include-planets', label: 'Planetary Positions (Both)', optionKey: 'includePlanets' },
  { id: 'include-houses', label: 'House Overlays', optionKey: 'includeHouses' },
  { id: 'include-aspects', label: 'Inter-Aspects', optionKey: 'includeAspects' },
  { id: 'include-rscore', label: 'Relationship Score', optionKey: 'includeRelationshipScore' },
  { id: 'include-interp', label: 'Interpretation Notes', optionKey: 'includeInterpretation' },
]

/**
 * ExportSynastryPDFDialog Component
 */
export function ExportSynastryPDFDialog({
  chartData,
  subject1ChartData,
  subject2ChartData,
  aspects,
  chartWheelHtml,
  notes,
  variant = 'outline',
  size = 'default',
  dateFormat = 'EU',
  timeFormat = '24h',
}: ExportSynastryPDFDialogProps) {
  const regenerateChart = useCallback(async (): Promise<string | null> => {
    const subject1 = enrichedSubjectToSubject(subject1ChartData.subject)
    const subject2 = enrichedSubjectToSubject(subject2ChartData.subject)
    const lightChartResponse: ChartResponse = await getSynastryChart(subject1, subject2, {
      theme: 'classic',
    })
    return lightChartResponse.chart_wheel || null
  }, [subject1ChartData.subject, subject2ChartData.subject])

  const generateFilename = useCallback((): string => {
    const name1 = sanitizeFilename(subject1ChartData.subject.name)
    const name2 = sanitizeFilename(subject2ChartData.subject.name)
    const dateStr = new Date().toISOString().split('T')[0]
    return `${name1}_${name2}_synastry_${dateStr}.pdf`
  }, [subject1ChartData.subject.name, subject2ChartData.subject.name])

  const renderPDF = useCallback(
    async (
      chartWheelImage: string | null,
      branding: PDFBranding,
      exportOptions: PDFExportOptions,
      dateFormatProp: DateFormat,
      timeFormatProp: TimeFormat,
    ) => {
      const { SynastryChartPDF } = await import('./SynastryChartPDF')
      return (
        <SynastryChartPDF
          chartData={chartData}
          subject1ChartData={subject1ChartData}
          subject2ChartData={subject2ChartData}
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
    [chartData, subject1ChartData, subject2ChartData, aspects, notes],
  )

  return (
    <ExportPDFDialogBase
      title="Export Synastry Chart as PDF"
      description="Configure what to include in your synastry report."
      chartType="synastry"
      successMessage="Synastry PDF exported successfully!"
      options={SYNASTRY_OPTIONS}
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
