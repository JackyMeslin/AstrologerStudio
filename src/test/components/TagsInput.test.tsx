/**
 * Unit Tests for TagsInput Component
 *
 * Tests the TagsInput component that provides tag entry with comma-separated
 * values, backspace deletion, and keyboard navigation.
 *
 * @module src/components/TagsInput
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TagsInput } from '@/components/TagsInput'

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

describe('TagsInput', () => {
  let onChange: (next: string[] | null) => void

  beforeEach(() => {
    vi.clearAllMocks()
    onChange = vi.fn()
  })

  // ===========================================================================
  // Next.js Client Component Directive Tests
  // ===========================================================================

  describe('Next.js client component directive', () => {
    it('should have "use client" directive at the top of the file', () => {
      const filePath = resolve(__dirname, '../../components/TagsInput.tsx')
      const fileContent = readFileSync(filePath, 'utf-8')
      const lines = fileContent.split('\n')
      const firstLine = lines[0] ?? ''

      expect(firstLine.trim()).toBe("'use client'")
    })
  })

  // ===========================================================================
  // Basic Rendering Tests
  // ===========================================================================

  describe('basic rendering', () => {
    it('should render with placeholder when no tags', () => {
      render(<TagsInput value={[]} onChange={onChange} />)

      expect(screen.getByPlaceholderText('e.g. musician, actor')).toBeInTheDocument()
    })

    it('should render custom placeholder', () => {
      render(<TagsInput value={[]} onChange={onChange} placeholder="Add tags..." />)

      expect(screen.getByPlaceholderText('Add tags...')).toBeInTheDocument()
    })

    it('should render existing tags as badges', () => {
      render(<TagsInput value={['musician', 'actor']} onChange={onChange} />)

      expect(screen.getByText('musician')).toBeInTheDocument()
      expect(screen.getByText('actor')).toBeInTheDocument()
    })

    it('should not show placeholder when tags exist', () => {
      render(<TagsInput value={['tag1']} onChange={onChange} />)

      const input = screen.getByRole('textbox')
      expect(input).not.toHaveAttribute('placeholder', 'e.g. musician, actor')
      expect(input).toHaveAttribute('placeholder', '')
    })

    it('should handle null value', () => {
      render(<TagsInput value={null} onChange={onChange} />)

      expect(screen.getByPlaceholderText('e.g. musician, actor')).toBeInTheDocument()
    })

    it('should handle undefined value', () => {
      render(<TagsInput value={undefined} onChange={onChange} />)

      expect(screen.getByPlaceholderText('e.g. musician, actor')).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Tag Addition Tests
  // ===========================================================================

  describe('tag addition', () => {
    it('should add tag on Enter key', async () => {
      const user = userEvent.setup()

      render(<TagsInput value={[]} onChange={onChange} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'musician{Enter}')

      expect(onChange).toHaveBeenCalledWith(['musician'])
    })

    it('should add tag on comma', async () => {
      const user = userEvent.setup()

      render(<TagsInput value={[]} onChange={onChange} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'musician,')

      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(['musician'])
      })
    })

    it('should add tag on blur', async () => {
      const user = userEvent.setup()

      render(<TagsInput value={[]} onChange={onChange} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'musician')
      await user.tab() // blur

      expect(onChange).toHaveBeenCalledWith(['musician'])
    })

    it('should add tag on Tab key', async () => {
      const user = userEvent.setup()

      render(<TagsInput value={[]} onChange={onChange} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'musician')
      await user.keyboard('{Tab}')

      expect(onChange).toHaveBeenCalledWith(['musician'])
    })

    it('should trim whitespace from tags', async () => {
      const user = userEvent.setup()

      render(<TagsInput value={[]} onChange={onChange} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '  musician  {Enter}')

      expect(onChange).toHaveBeenCalledWith(['musician'])
    })

    it('should not add empty tags', async () => {
      const user = userEvent.setup()

      render(<TagsInput value={[]} onChange={onChange} />)

      const input = screen.getByRole('textbox')
      await user.type(input, '   {Enter}')

      expect(onChange).not.toHaveBeenCalled()
    })

    it('should not add duplicate tags', async () => {
      const user = userEvent.setup()

      render(<TagsInput value={['musician']} onChange={onChange} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'musician{Enter}')

      expect(onChange).not.toHaveBeenCalled()
    })

    it('should add to existing tags', async () => {
      const user = userEvent.setup()

      render(<TagsInput value={['musician']} onChange={onChange} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'actor{Enter}')

      expect(onChange).toHaveBeenCalledWith(['musician', 'actor'])
    })
  })

  // ===========================================================================
  // Tag Removal Tests
  // ===========================================================================

  describe('tag removal', () => {
    it('should remove tag when clicking remove button', async () => {
      const user = userEvent.setup()

      render(<TagsInput value={['musician', 'actor']} onChange={onChange} />)

      const removeButton = screen.getByRole('button', { name: 'Remove musician' })
      await user.click(removeButton)

      expect(onChange).toHaveBeenCalledWith(['actor'])
    })

    it('should remove last tag on Backspace when input is empty', async () => {
      const user = userEvent.setup()

      render(<TagsInput value={['musician', 'actor']} onChange={onChange} />)

      const input = screen.getByRole('textbox')
      await user.click(input)
      await user.keyboard('{Backspace}')

      expect(onChange).toHaveBeenCalledWith(['musician'])
    })

    it('should not remove tag on Backspace when input has text', async () => {
      const user = userEvent.setup()

      render(<TagsInput value={['musician']} onChange={onChange} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'a')
      await user.keyboard('{Backspace}')

      expect(onChange).not.toHaveBeenCalled()
    })

    it('should return null when last tag is removed', async () => {
      const user = userEvent.setup()

      render(<TagsInput value={['musician']} onChange={onChange} />)

      const removeButton = screen.getByRole('button', { name: 'Remove musician' })
      await user.click(removeButton)

      expect(onChange).toHaveBeenCalledWith(null)
    })
  })

  // ===========================================================================
  // Max Tags Tests
  // ===========================================================================

  describe('max tags limit', () => {
    it('should respect maxTags limit', async () => {
      const user = userEvent.setup()

      render(<TagsInput value={['tag1', 'tag2']} onChange={onChange} maxTags={3} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'tag3{Enter}')

      expect(onChange).toHaveBeenCalledWith(['tag1', 'tag2', 'tag3'])
    })

    it('should not add more tags when at maxTags limit', async () => {
      const user = userEvent.setup()

      render(<TagsInput value={['tag1', 'tag2', 'tag3']} onChange={onChange} maxTags={3} />)

      const input = screen.getByRole('textbox')
      await user.type(input, 'tag4{Enter}')

      expect(onChange).not.toHaveBeenCalled()
    })

    it('should disable input when at maxTags limit', () => {
      render(<TagsInput value={['tag1', 'tag2', 'tag3']} onChange={onChange} maxTags={3} />)

      const input = screen.getByRole('textbox')
      expect(input).toBeDisabled()
    })
  })

  // ===========================================================================
  // Disabled State Tests
  // ===========================================================================

  describe('disabled state', () => {
    it('should disable input when disabled prop is true', () => {
      render(<TagsInput value={['tag1']} onChange={onChange} disabled />)

      const input = screen.getByRole('textbox')
      expect(input).toBeDisabled()
    })

    it('should disable remove buttons when disabled', () => {
      render(<TagsInput value={['musician']} onChange={onChange} disabled />)

      const removeButton = screen.getByRole('button', { name: 'Remove musician' })
      expect(removeButton).toBeDisabled()
    })

    it('should apply opacity class when disabled', () => {
      const { container } = render(<TagsInput value={[]} onChange={onChange} disabled />)

      const wrapper = container.firstChild
      expect(wrapper).toHaveClass('opacity-60')
    })
  })

  // ===========================================================================
  // Custom className Tests
  // ===========================================================================

  describe('custom className', () => {
    it('should apply custom className', () => {
      const { container } = render(<TagsInput value={[]} onChange={onChange} className="custom-class" />)

      const wrapper = container.firstChild
      expect(wrapper).toHaveClass('custom-class')
    })
  })
})
