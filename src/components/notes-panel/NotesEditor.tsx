'use client'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'

export interface NotesEditorProps {
  /** The notes content to edit */
  notes: string
  /** Callback when notes change */
  onNotesChange: (notes: string) => void
  /** Whether the save button should be shown */
  showSaveButton?: boolean
  /** Whether saving is in progress */
  isSaving?: boolean
  /** Callback when save is requested */
  onSave?: () => void
}

/**
 * Notes editor component.
 * Provides a textarea for editing notes with markdown support
 * and an optional save button.
 */
export function NotesEditor({
  notes,
  onNotesChange,
  showSaveButton = false,
  isSaving = false,
  onSave,
}: NotesEditorProps) {
  return (
    <div className="flex flex-col gap-4">
      <Textarea
        value={notes}
        onChange={(e) => onNotesChange(e.target.value)}
        placeholder="Write your notes here... (Markdown supported)"
        className="min-h-[400px] font-mono text-sm"
      />
      {showSaveButton && (
        <div className="flex justify-end">
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Notes'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
