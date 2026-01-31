'use client'

import { useState, useCallback, type ReactElement } from 'react'
import { Printer, Loader2, Settings2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { usePDFBranding, type PDFExportOptions } from '@/stores/pdfBrandingStore'
import { trackPdfExport, type PDFChartType } from '@/actions/pdf-tracking'
import { svgToDataUrl, triggerDownload } from '@/lib/pdf/utils'
import { clientLogger } from '@/lib/logging/client'
import type { DateFormat, TimeFormat } from '@/lib/utils/date'

/**
 * Configuration for a dialog option toggle
 */
export interface DialogOption {
  id: string
  label: string
  optionKey: keyof PDFExportOptions
  disabled?: boolean
}

/**
 * Branding configuration for PDF export
 */
export interface PDFBranding {
  type: 'default' | 'text' | 'logo'
  logoData: string | null
  text: string
  showFooter: boolean
  footerText: string
}

/**
 * Base props for all PDF export dialogs
 */
export interface ExportPDFDialogBaseProps {
  /** Dialog title */
  title: string
  /** Dialog description */
  description: string
  /** Chart type for tracking (e.g., 'natal', 'transit', 'synastry') */
  chartType: PDFChartType
  /** Success message to show after export */
  successMessage: string
  /** Dialog option toggles to display */
  options: DialogOption[]
  /** Whether interpretation notes are available */
  hasNotes?: boolean
  /** Trigger button variant */
  variant?: 'default' | 'outline' | 'ghost'
  /** Trigger button size */
  size?: 'default' | 'sm' | 'icon'
  /** Date format preference */
  dateFormat?: DateFormat
  /** Time format preference */
  timeFormat?: TimeFormat
  /** Fallback chart wheel HTML (used if regeneration fails) */
  chartWheelHtml?: string
  /**
   * Function to regenerate chart with light theme for PDF export.
   * Should return the chart wheel HTML or null if regeneration fails.
   */
  regenerateChart: () => Promise<string | null>
  /**
   * Function to generate the filename for the PDF
   */
  generateFilename: () => string
  /**
   * Function to render the PDF document.
   * Receives the chart wheel image and export options.
   */
  renderPDF: (
    chartWheelImage: string | null,
    branding: PDFBranding,
    exportOptions: PDFExportOptions,
    dateFormat: DateFormat,
    timeFormat: TimeFormat,
  ) => ReactElement | Promise<ReactElement>
}

/**
 * ExportPDFDialogBase Component
 *
 * A reusable base component for PDF export dialogs that handles common UI and logic.
 * Chart-specific dialogs should use this component and provide their own configuration.
 */
export function ExportPDFDialogBase({
  title,
  description,
  chartType,
  successMessage,
  options,
  hasNotes = false,
  variant = 'outline',
  size = 'default',
  dateFormat = 'EU',
  timeFormat = '24h',
  chartWheelHtml,
  regenerateChart,
  generateFilename,
  renderPDF,
}: ExportPDFDialogBaseProps) {
  const [open, setOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  // Get branding settings from store
  const { brandingType, logoData, brandingText, showFooter, footerText, exportOptions, setExportOption } =
    usePDFBranding()

  const handleExport = useCallback(async () => {
    setIsGenerating(true)

    try {
      let chartWheelImage: string | null = null

      // Generate chart wheel image for PDF - ALWAYS with light theme
      if (exportOptions.includeChartWheel) {
        try {
          const regeneratedChartHtml = await regenerateChart()
          if (regeneratedChartHtml) {
            chartWheelImage = await svgToDataUrl(regeneratedChartHtml)
          }
        } catch (err) {
          clientLogger.warn('Failed to regenerate chart with light theme:', err)
        }

        // Fallback to original chart SVG if regeneration failed
        if (!chartWheelImage && chartWheelHtml) {
          clientLogger.warn('Using fallback SVG...')
          chartWheelImage = await svgToDataUrl(chartWheelHtml)
        }
      }

      // Create branding config
      const branding: PDFBranding = {
        type: brandingType,
        logoData,
        text: brandingText,
        showFooter,
        footerText,
      }

      // Dynamically import @react-pdf/renderer to avoid including it in the initial bundle
      const { pdf } = await import('@react-pdf/renderer')

      // Render the PDF document
      const doc = await renderPDF(chartWheelImage, branding, exportOptions, dateFormat, timeFormat)

      // Generate blob (cast doc to expected type - renderPDF returns a valid PDF Document component)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const blob = await pdf(doc as any).toBlob()

      // Trigger download
      const filename = generateFilename()
      triggerDownload(blob, filename)

      // Track PDF export (fire and forget - don't block the user)
      trackPdfExport(chartType).catch(() => {})

      toast.success(successMessage)
      setOpen(false)
    } catch (error) {
      clientLogger.error('PDF export failed:', error)
      toast.error('Failed to export PDF. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }, [
    chartType,
    successMessage,
    chartWheelHtml,
    regenerateChart,
    generateFilename,
    renderPDF,
    brandingType,
    logoData,
    brandingText,
    showFooter,
    footerText,
    exportOptions,
    dateFormat,
    timeFormat,
  ])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} title="Export PDF">
          <Printer className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Content Options */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Include in PDF</h4>

            {options.map((option) => (
              <div key={option.id} className="flex items-center justify-between">
                <Label htmlFor={option.id} className="cursor-pointer">
                  {option.label}
                </Label>
                <Switch
                  id={option.id}
                  checked={exportOptions[option.optionKey] as boolean}
                  onCheckedChange={(checked) => setExportOption(option.optionKey, checked)}
                  disabled={option.optionKey === 'includeInterpretation' && !hasNotes ? true : option.disabled}
                />
              </div>
            ))}
          </div>

          <Separator />

          {/* Branding Info */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Branding:{' '}
              {brandingType === 'logo' ? 'Custom Logo' : brandingType === 'text' ? 'Custom Text' : 'AstrologerStudio'}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => {
                setOpen(false)
                // Navigate to settings
                window.location.href = '/settings#pdf-branding'
              }}
            >
              <Settings2 className="h-4 w-4 mr-1" />
              Configure
            </Button>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Printer className="h-4 w-4 mr-2" />
                Download PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
