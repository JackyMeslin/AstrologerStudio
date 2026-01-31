/**
 * Unit Tests for NotesEditor Component
 *
 * Tests the notes editor component that provides a textarea for editing
 * notes with markdown support and an optional save button.
 *
 * @module src/components/notes-panel/NotesEditor
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NotesEditor } from '@/components/notes-panel/NotesEditor'

// ============================================================================
// Mocks
// ============================================================================

// Mock Prisma to prevent any DB access
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), findMany: vi.fn() },
    subject: { findUnique: vi.fn(), findMany: vi.fn() },
  },
}))

// ============================================================================
// Tests
// ============================================================================

describe('NotesEditor', () => {
  let onNotesChange: ReturnType<typeof vi.fn<(notes: string) => void>>
  let onSave: ReturnType<typeof vi.fn<() => void>>

  beforeEach(() => {
    vi.clearAllMocks()
    onNotesChange = vi.fn()
    onSave = vi.fn()
  })

  // ===========================================================================
  // Basic Rendering Tests
  // ===========================================================================

  describe('basic rendering', () => {
    it('should render a textarea', () => {
      render(<NotesEditor notes="" onNotesChange={onNotesChange} />)

      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('should display the provided notes value', () => {
      render(<NotesEditor notes="Initial notes content" onNotesChange={onNotesChange} />)

      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveValue('Initial notes content')
    })

    it('should show the placeholder text', () => {
      render(<NotesEditor notes="" onNotesChange={onNotesChange} />)

      expect(screen.getByPlaceholderText(/Write your notes here/)).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Notes Change Tests
  // ===========================================================================

  describe('notes change', () => {
    it('should call onNotesChange when text is typed', async () => {
      const user = userEvent.setup()

      render(<NotesEditor notes="" onNotesChange={onNotesChange} />)

      const textarea = screen.getByRole('textbox')
      await user.type(textarea, 'New content')

      // Called for each character typed
      expect(onNotesChange).toHaveBeenCalled()
    })

    it('should call onNotesChange for each character typed', async () => {
      const user = userEvent.setup()

      render(<NotesEditor notes="" onNotesChange={onNotesChange} />)

      const textarea = screen.getByRole('textbox')
      await user.type(textarea, 'abc')

      // Called once per character
      expect(onNotesChange).toHaveBeenCalledTimes(3)
      // First call should be with 'a', second with 'ab', third with 'abc' (cumulative typing)
      // But since this is uncontrolled in the test, each call gets individual chars
      expect(onNotesChange).toHaveBeenCalledWith(expect.stringContaining('a'))
    })
  })

  // ===========================================================================
  // Save Button Tests
  // ===========================================================================

  describe('save button', () => {
    it('should not show save button by default', () => {
      render(<NotesEditor notes="" onNotesChange={onNotesChange} />)

      expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument()
    })

    it('should show save button when showSaveButton is true', () => {
      render(<NotesEditor notes="" onNotesChange={onNotesChange} showSaveButton={true} onSave={onSave} />)

      expect(screen.getByRole('button', { name: 'Save Notes' })).toBeInTheDocument()
    })

    it('should call onSave when save button is clicked', async () => {
      const user = userEvent.setup()

      render(<NotesEditor notes="" onNotesChange={onNotesChange} showSaveButton={true} onSave={onSave} />)

      const button = screen.getByRole('button', { name: 'Save Notes' })
      await user.click(button)

      expect(onSave).toHaveBeenCalledTimes(1)
    })

    it('should disable save button when isSaving is true', () => {
      render(<NotesEditor notes="" onNotesChange={onNotesChange} showSaveButton={true} isSaving={true} />)

      const button = screen.getByRole('button', { name: /saving/i })
      expect(button).toBeDisabled()
    })

    it('should show "Saving..." text when isSaving is true', () => {
      render(<NotesEditor notes="" onNotesChange={onNotesChange} showSaveButton={true} isSaving={true} />)

      expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument()
    })

    it('should show "Save Notes" text when not saving', () => {
      render(<NotesEditor notes="" onNotesChange={onNotesChange} showSaveButton={true} isSaving={false} />)

      expect(screen.getByRole('button', { name: 'Save Notes' })).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Styling Tests
  // ===========================================================================

  describe('styling', () => {
    it('should have monospace font on textarea', () => {
      render(<NotesEditor notes="" onNotesChange={onNotesChange} />)

      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveClass('font-mono')
    })

    it('should have minimum height for textarea', () => {
      render(<NotesEditor notes="" onNotesChange={onNotesChange} />)

      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveClass('min-h-[400px]')
    })
  })
})
