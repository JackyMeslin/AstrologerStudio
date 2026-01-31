'use client'

import { AlertTriangle, CloudOff, X } from 'lucide-react'
import { Card } from '@/components/ui/card'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { markdownComponents } from '@/components/ui/markdown-components'

export interface NotesViewerProps {
  /** The notes content to display */
  notes: string
  /** Whether the data is stale (chart changed since AI was generated) */
  isDataStale?: boolean
  /** Label for what the stale data was generated for */
  staleDataLabel?: string
  /** Whether the stale data warning has been dismissed */
  isWarningDismissed?: boolean
  /** Callback when stale data warning is dismissed */
  onWarningDismiss?: () => void
  /** Whether notes are only in local cache (not saved to DB) */
  isFromCache?: boolean
  /** Whether the cache alert has been dismissed */
  isCacheAlertDismissed?: boolean
  /** Callback when cache alert is dismissed */
  onCacheAlertDismiss?: () => void
}

/**
 * Notes viewer component.
 * Displays notes content as rendered markdown with optional alert banners
 * for stale data and local-only cache status.
 */
export function NotesViewer({
  notes,
  isDataStale = false,
  staleDataLabel,
  isWarningDismissed = false,
  onWarningDismiss,
  isFromCache = false,
  isCacheAlertDismissed = false,
  onCacheAlertDismiss,
}: NotesViewerProps) {
  return (
    <div className="space-y-4">
      {/* Stale data warning */}
      {isDataStale && notes && !isWarningDismissed && (
        <div className="not-prose flex items-center justify-between gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              This interpretation was generated for {staleDataLabel || 'different data'}. Consider regenerating.
            </span>
          </div>
          <button
            onClick={onWarningDismiss}
            className="p-1 hover:bg-amber-500/20 rounded transition-colors shrink-0"
            aria-label="Dismiss warning"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Local cache alert */}
      {isFromCache && notes && !isCacheAlertDismissed && (
        <div className="not-prose flex items-center justify-between gap-2 p-3 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-700 dark:text-blue-400 text-sm">
          <div className="flex items-center gap-2">
            <CloudOff className="h-4 w-4 shrink-0" />
            <span>
              This interpretation is saved locally only. Click the save icon in the top right to persist it to the
              database.
            </span>
          </div>
          <button
            onClick={onCacheAlertDismiss}
            className="p-1 hover:bg-blue-500/20 rounded transition-colors shrink-0"
            aria-label="Dismiss alert"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Notes content */}
      <Card className="p-4 min-h-[400px] prose prose-sm dark:prose-invert max-w-none">
        {notes ? (
          <div className="max-w-4xl mx-auto">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {notes}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="text-muted-foreground italic">
            No notes yet. Click Generate Interpretation or switch to Edit to add notes manually.
          </p>
        )}
      </Card>
    </div>
  )
}
