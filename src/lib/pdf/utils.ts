import type { EnrichedSubjectModel } from '@/types/astrology'
import type { Subject } from '@/types/subjects'
import { clientLogger } from '@/lib/logging/client'

/**
 * Partial type for EnrichedSubjectModel that allows partial data.
 * The conversion function handles missing fields gracefully.
 */
export type PartialEnrichedSubject = Partial<EnrichedSubjectModel>

/**
 * Convert EnrichedSubjectModel to Subject for API calls
 *
 * This function transforms the enriched subject model returned from chart data
 * into the Subject type required for regenerating charts with the API.
 * It handles missing fields gracefully with sensible defaults.
 */
export function enrichedSubjectToSubject(enriched: PartialEnrichedSubject): Subject {
  const isoDate = enriched.iso_formatted_utc_datetime || enriched.iso_formatted_local_datetime
  const birthDatetime = isoDate
    ? new Date(isoDate)
    : new Date(
        enriched.year ?? new Date().getFullYear(),
        (enriched.month ?? 1) - 1,
        enriched.day ?? 1,
        enriched.hour ?? 0,
        enriched.minute ?? 0,
        0,
      )

  return {
    id: 'pdf-export-temp',
    name: enriched.name || 'Chart',
    birth_datetime: birthDatetime.toISOString(),
    city: enriched.city || '',
    nation: enriched.nation || '',
    latitude: enriched.lat ?? enriched.latitude ?? 0,
    longitude: enriched.lng ?? enriched.longitude ?? 0,
    timezone: enriched.tz_str || enriched.timezone || 'UTC',
    ownerId: 'system',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

/**
 * Convert SVG HTML string to a data URL for PDF embedding with WHITE BACKGROUND for print
 *
 * This function takes an SVG chart wheel HTML string and converts it to a PNG
 * data URL that can be embedded in PDF documents. It renders the SVG onto a canvas
 * with a white background for print-optimized output at 2x resolution.
 *
 * @param svgHtml - The SVG HTML string to convert
 * @returns A promise that resolves to the PNG data URL, or null if conversion fails
 */
export async function svgToDataUrl(svgHtml: string): Promise<string | null> {
  try {
    // Create a temporary container to parse the SVG
    const container = document.createElement('div')
    container.innerHTML = svgHtml.trim()
    const svgElement = container.querySelector('svg')

    if (!svgElement) {
      clientLogger.warn('No SVG element found in chart HTML')
      return null
    }

    // Ensure the SVG has explicit dimensions
    const width = parseInt(svgElement.getAttribute('width') || '500', 10)
    const height = parseInt(svgElement.getAttribute('height') || '500', 10)

    // Create canvas
    const canvas = document.createElement('canvas')
    canvas.width = width * 2 // 2x for higher resolution
    canvas.height = height * 2
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      clientLogger.warn('Could not get canvas context')
      return null
    }

    // Scale for higher resolution
    ctx.scale(2, 2)

    // Draw white background for print
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)

    // Convert SVG to data URL
    const svgData = new XMLSerializer().serializeToString(svgElement)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const svgUrl = URL.createObjectURL(svgBlob)

    // Load image
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        // Draw image on canvas
        ctx.drawImage(img, 0, 0, width, height)

        // Convert to PNG data URL
        const dataUrl = canvas.toDataURL('image/png', 1.0)
        URL.revokeObjectURL(svgUrl)
        resolve(dataUrl)
      }
      img.onerror = () => {
        URL.revokeObjectURL(svgUrl)
        resolve(null)
      }
      img.src = svgUrl
    })
  } catch (error) {
    clientLogger.error('Failed to convert SVG to image:', error)
    return null
  }
}

/**
 * Trigger a file download in the browser
 *
 * @param blob - The blob to download
 * @param filename - The filename for the download
 */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Sanitize a name for use in filenames
 *
 * @param name - The name to sanitize
 * @returns The sanitized name with non-alphanumeric characters replaced by underscores
 */
export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '_')
}

/**
 * Generate a PDF filename with date suffix
 *
 * @param baseName - The base name for the file
 * @param chartType - The type of chart (e.g., 'natal', 'transit', 'synastry')
 * @param dateSuffix - Optional custom date suffix (defaults to today's date)
 * @returns The generated filename
 */
export function generatePdfFilename(baseName: string, chartType: string, dateSuffix?: string): string {
  const sanitizedName = sanitizeFilename(baseName)
  const dateStr = dateSuffix || new Date().toISOString().split('T')[0]
  return `${sanitizedName}_${chartType}_${dateStr}.pdf`
}
