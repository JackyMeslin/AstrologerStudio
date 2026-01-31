/**
 * Unit Tests for NotesViewer Component
 *
 * Tests the notes viewer component that displays notes content as
 * rendered markdown with optional alert banners.
 *
 * @module src/components/notes-panel/NotesViewer
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NotesViewer } from '@/components/notes-panel/NotesViewer'

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

describe('NotesViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ===========================================================================
  // Basic Rendering Tests
  // ===========================================================================

  describe('basic rendering', () => {
    it('should render notes content as markdown', () => {
      render(<NotesViewer notes="# Hello World" />)

      expect(screen.getByRole('heading', { name: 'Hello World' })).toBeInTheDocument()
    })

    it('should render markdown with bold text', () => {
      render(<NotesViewer notes="This is **bold** text" />)

      expect(screen.getByText('bold')).toBeInTheDocument()
    })

    it('should render markdown lists', () => {
      render(<NotesViewer notes={'- Item 1\n- Item 2\n- Item 3'} />)

      // Check that the list element is rendered
      const list = screen.getByRole('list')
      expect(list).toBeInTheDocument()
      // The markdown content should be within the component
      expect(list.textContent).toContain('Item')
    })

    it('should show empty state when no notes', () => {
      render(<NotesViewer notes="" />)

      expect(screen.getByText(/No notes yet\. Click Generate Interpretation or switch to Edit/)).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Stale Data Warning Tests
  // ===========================================================================

  describe('stale data warning', () => {
    it('should show stale data warning when data is stale', () => {
      render(<NotesViewer notes="Some notes" isDataStale={true} staleDataLabel="Dec 15, 2024" />)

      expect(screen.getByText(/This interpretation was generated for Dec 15, 2024/)).toBeInTheDocument()
    })

    it('should show default message when no stale data label provided', () => {
      render(<NotesViewer notes="Some notes" isDataStale={true} />)

      expect(screen.getByText(/This interpretation was generated for different data/)).toBeInTheDocument()
    })

    it('should not show warning when isWarningDismissed is true', () => {
      render(<NotesViewer notes="Some notes" isDataStale={true} isWarningDismissed={true} />)

      expect(screen.queryByText(/This interpretation was generated for/)).not.toBeInTheDocument()
    })

    it('should not show warning when there are no notes', () => {
      render(<NotesViewer notes="" isDataStale={true} />)

      expect(screen.queryByText(/This interpretation was generated for/)).not.toBeInTheDocument()
    })

    it('should call onWarningDismiss when dismiss button is clicked', async () => {
      const user = userEvent.setup()
      const onWarningDismiss = vi.fn()

      render(<NotesViewer notes="Some notes" isDataStale={true} onWarningDismiss={onWarningDismiss} />)

      const dismissButton = screen.getByRole('button', { name: 'Dismiss warning' })
      await user.click(dismissButton)

      expect(onWarningDismiss).toHaveBeenCalledTimes(1)
    })
  })

  // ===========================================================================
  // Cache Alert Tests
  // ===========================================================================

  describe('cache alert', () => {
    it('should show cache alert when notes are from local cache', () => {
      render(<NotesViewer notes="Some notes" isFromCache={true} />)

      expect(screen.getByText(/This interpretation is saved locally only/)).toBeInTheDocument()
    })

    it('should not show cache alert when isCacheAlertDismissed is true', () => {
      render(<NotesViewer notes="Some notes" isFromCache={true} isCacheAlertDismissed={true} />)

      expect(screen.queryByText(/This interpretation is saved locally only/)).not.toBeInTheDocument()
    })

    it('should not show cache alert when there are no notes', () => {
      render(<NotesViewer notes="" isFromCache={true} />)

      expect(screen.queryByText(/This interpretation is saved locally only/)).not.toBeInTheDocument()
    })

    it('should call onCacheAlertDismiss when dismiss button is clicked', async () => {
      const user = userEvent.setup()
      const onCacheAlertDismiss = vi.fn()

      render(<NotesViewer notes="Some notes" isFromCache={true} onCacheAlertDismiss={onCacheAlertDismiss} />)

      const dismissButton = screen.getByRole('button', { name: 'Dismiss alert' })
      await user.click(dismissButton)

      expect(onCacheAlertDismiss).toHaveBeenCalledTimes(1)
    })
  })

  // ===========================================================================
  // Combined Alerts Tests
  // ===========================================================================

  describe('combined alerts', () => {
    it('should show both alerts when data is stale and from cache', () => {
      render(<NotesViewer notes="Some notes" isDataStale={true} isFromCache={true} />)

      expect(screen.getByText(/This interpretation was generated for/)).toBeInTheDocument()
      expect(screen.getByText(/This interpretation is saved locally only/)).toBeInTheDocument()
    })
  })
})
