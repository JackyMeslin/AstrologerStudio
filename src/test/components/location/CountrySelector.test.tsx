/**
 * Unit Tests for CountrySelector Component
 *
 * Tests the CountrySelector component that provides country selection
 * with search functionality using a combobox pattern.
 *
 * @module src/components/location/CountrySelector
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CountrySelector } from '@/components/location/CountrySelector'

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

// Mock scrollIntoView since it's not available in JSDOM
Element.prototype.scrollIntoView = vi.fn()

// ============================================================================
// Tests
// ============================================================================

describe('CountrySelector', () => {
  let onChange: (value: string) => void

  beforeEach(() => {
    vi.clearAllMocks()
    onChange = vi.fn()
  })

  // ===========================================================================
  // Next.js Client Component Directive Tests
  // ===========================================================================

  describe('Next.js client component directive', () => {
    it('should have "use client" directive at the top of the file', () => {
      const filePath = resolve(__dirname, '../../../components/location/CountrySelector.tsx')
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
    it('should render with placeholder when no value', () => {
      render(<CountrySelector id="nation" value={undefined} onChange={onChange} />)

      expect(screen.getByText('Select nation')).toBeInTheDocument()
    })

    it('should render with selected country name and code', () => {
      render(<CountrySelector id="nation" value="IT" onChange={onChange} />)

      expect(screen.getByText('IT — Italy')).toBeInTheDocument()
    })

    it('should render label', () => {
      render(<CountrySelector id="nation" value={undefined} onChange={onChange} />)

      expect(screen.getByText('Nation')).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Disabled State Tests
  // ===========================================================================

  describe('disabled state', () => {
    it('should disable button when disabled prop is true', () => {
      render(<CountrySelector id="nation" value={undefined} onChange={onChange} disabled />)

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })
  })

  // ===========================================================================
  // Error State Tests
  // ===========================================================================

  describe('error state', () => {
    it('should show error message when provided', () => {
      render(<CountrySelector id="nation" value={undefined} onChange={onChange} errorMessage="Nation is required" />)

      expect(screen.getByText('Nation is required')).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Selection Tests
  // ===========================================================================

  describe('selection', () => {
    it('should open popover when clicking button', async () => {
      const user = userEvent.setup()

      render(<CountrySelector id="nation" value={undefined} onChange={onChange} />)

      await user.click(screen.getByRole('button'))

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search nation...')).toBeInTheDocument()
      })
    })

    it('should filter countries by search query', async () => {
      const user = userEvent.setup()

      render(<CountrySelector id="nation" value={undefined} onChange={onChange} />)

      await user.click(screen.getByRole('button'))

      const searchInput = await screen.findByPlaceholderText('Search nation...')
      await user.type(searchInput, 'IT')

      await waitFor(() => {
        expect(screen.getByRole('option', { name: /IT — Italy/i })).toBeInTheDocument()
      })
    })

    it('should call onChange when selecting a country', async () => {
      const user = userEvent.setup()

      render(<CountrySelector id="nation" value={undefined} onChange={onChange} />)

      await user.click(screen.getByRole('button'))

      const searchInput = await screen.findByPlaceholderText('Search nation...')
      await user.type(searchInput, 'IT')

      const italyOption = await screen.findByRole('option', { name: /IT — Italy/i })
      await user.click(italyOption)

      expect(onChange).toHaveBeenCalledWith('IT')
    })

    it('should show checkmark for selected country', async () => {
      const user = userEvent.setup()

      render(<CountrySelector id="nation" value="IT" onChange={onChange} />)

      await user.click(screen.getByRole('button'))

      await waitFor(() => {
        // The checkmark icon should be visible (opacity-100) for Italy
        const italyOption = screen.getByRole('option', { name: /IT — Italy/i })
        const checkIcon = italyOption.querySelector('svg')
        expect(checkIcon).toHaveClass('opacity-100')
      })
    })
  })

  // ===========================================================================
  // Search Tests
  // ===========================================================================

  describe('search functionality', () => {
    it('should search by country code', async () => {
      const user = userEvent.setup()

      render(<CountrySelector id="nation" value={undefined} onChange={onChange} />)

      await user.click(screen.getByRole('button'))

      const searchInput = await screen.findByPlaceholderText('Search nation...')
      await user.type(searchInput, 'US')

      await waitFor(() => {
        expect(screen.getByRole('option', { name: /US — United States/i })).toBeInTheDocument()
      })
    })

    it('should search by country name', async () => {
      const user = userEvent.setup()

      render(<CountrySelector id="nation" value={undefined} onChange={onChange} />)

      await user.click(screen.getByRole('button'))

      const searchInput = await screen.findByPlaceholderText('Search nation...')
      await user.type(searchInput, 'Germ')

      await waitFor(() => {
        expect(screen.getByRole('option', { name: /DE — Germany/i })).toBeInTheDocument()
      })
    })

    it('should show "No nation found" when no results', async () => {
      const user = userEvent.setup()

      render(<CountrySelector id="nation" value={undefined} onChange={onChange} />)

      await user.click(screen.getByRole('button'))

      const searchInput = await screen.findByPlaceholderText('Search nation...')
      await user.type(searchInput, 'xyznonexistent')

      await waitFor(() => {
        expect(screen.getByText('No nation found.')).toBeInTheDocument()
      })
    })
  })
})
