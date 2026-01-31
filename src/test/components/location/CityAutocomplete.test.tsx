/**
 * Unit Tests for CityAutocomplete Component
 *
 * Tests the CityAutocomplete component that provides city search with
 * autocomplete suggestions, loading state, and error handling.
 *
 * @module src/components/location/CityAutocomplete
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CityAutocomplete, type CitySuggestion } from '@/components/location/CityAutocomplete'

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
// Test Data
// ============================================================================

const mockSuggestions: CitySuggestion[] = [
  { label: 'Rome, Lazio (Italy)', value: 'Rome', countryCode: 'IT', latitude: 41.8919, longitude: 12.5113 },
  { label: 'Roma, Texas (United States)', value: 'Roma', countryCode: 'US', latitude: 26.4053, longitude: -99.0154 },
]

// ============================================================================
// Tests
// ============================================================================

describe('CityAutocomplete', () => {
  let onChange: (value: string) => void
  let onSelect: (suggestion: CitySuggestion) => void

  beforeEach(() => {
    vi.clearAllMocks()
    onChange = vi.fn()
    onSelect = vi.fn()
  })

  // ===========================================================================
  // Next.js Client Component Directive Tests
  // ===========================================================================

  describe('Next.js client component directive', () => {
    it('should have "use client" directive at the top of the file', () => {
      const filePath = resolve(__dirname, '../../../components/location/CityAutocomplete.tsx')
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
    it('should render with placeholder', () => {
      render(
        <CityAutocomplete
          id="city"
          value=""
          onChange={onChange}
          onSelect={onSelect}
          suggestions={[]}
          loading={false}
          error={null}
        />,
      )

      expect(screen.getByPlaceholderText('City')).toBeInTheDocument()
    })

    it('should render with value', () => {
      render(
        <CityAutocomplete
          id="city"
          value="Rome"
          onChange={onChange}
          onSelect={onSelect}
          suggestions={[]}
          loading={false}
          error={null}
        />,
      )

      expect(screen.getByDisplayValue('Rome')).toBeInTheDocument()
    })

    it('should render label', () => {
      render(
        <CityAutocomplete
          id="city"
          value=""
          onChange={onChange}
          onSelect={onSelect}
          suggestions={[]}
          loading={false}
          error={null}
        />,
      )

      expect(screen.getByText('City')).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Input Tests
  // ===========================================================================

  describe('input handling', () => {
    it('should call onChange when typing', async () => {
      const user = userEvent.setup()

      render(
        <CityAutocomplete
          id="city"
          value=""
          onChange={onChange}
          onSelect={onSelect}
          suggestions={[]}
          loading={false}
          error={null}
        />,
      )

      const input = screen.getByRole('textbox')
      await user.type(input, 'R')

      expect(onChange).toHaveBeenCalledWith('R')
    })

    it('should disable input when disabled prop is true', () => {
      render(
        <CityAutocomplete
          id="city"
          value=""
          onChange={onChange}
          onSelect={onSelect}
          suggestions={[]}
          loading={false}
          error={null}
          disabled
        />,
      )

      const input = screen.getByRole('textbox')
      expect(input).toBeDisabled()
    })
  })

  // ===========================================================================
  // Loading State Tests
  // ===========================================================================

  describe('loading state', () => {
    it('should show loading indicator when loading', () => {
      render(
        <CityAutocomplete
          id="city"
          value="Ro"
          onChange={onChange}
          onSelect={onSelect}
          suggestions={[]}
          loading={true}
          error={null}
        />,
      )

      expect(screen.getByText('Searching...')).toBeInTheDocument()
    })

    it('should not show loading indicator when not loading', () => {
      render(
        <CityAutocomplete
          id="city"
          value=""
          onChange={onChange}
          onSelect={onSelect}
          suggestions={[]}
          loading={false}
          error={null}
        />,
      )

      expect(screen.queryByText('Searching...')).not.toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Error State Tests
  // ===========================================================================

  describe('error state', () => {
    it('should show error message when error is provided', () => {
      render(
        <CityAutocomplete
          id="city"
          value="Ro"
          onChange={onChange}
          onSelect={onSelect}
          suggestions={[]}
          loading={false}
          error="Unable to search cities"
        />,
      )

      expect(screen.getByText('Unable to search cities')).toBeInTheDocument()
    })

    it('should show field error message when provided', () => {
      render(
        <CityAutocomplete
          id="city"
          value=""
          onChange={onChange}
          onSelect={onSelect}
          suggestions={[]}
          loading={false}
          error={null}
          errorMessage="City is required"
        />,
      )

      expect(screen.getByText('City is required')).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Suggestions Tests
  // ===========================================================================

  describe('suggestions', () => {
    it('should render suggestions when provided', () => {
      render(
        <CityAutocomplete
          id="city"
          value="Ro"
          onChange={onChange}
          onSelect={onSelect}
          suggestions={mockSuggestions}
          loading={false}
          error={null}
        />,
      )

      expect(screen.getByText('Rome, Lazio (Italy)')).toBeInTheDocument()
      expect(screen.getByText('Roma, Texas (United States)')).toBeInTheDocument()
    })

    it('should show coordinates in suggestions', () => {
      render(
        <CityAutocomplete
          id="city"
          value="Ro"
          onChange={onChange}
          onSelect={onSelect}
          suggestions={mockSuggestions}
          loading={false}
          error={null}
        />,
      )

      expect(screen.getByText('Lat 41.8919, Lng 12.5113')).toBeInTheDocument()
    })

    it('should call onSelect when clicking a suggestion', async () => {
      const user = userEvent.setup()

      render(
        <CityAutocomplete
          id="city"
          value="Ro"
          onChange={onChange}
          onSelect={onSelect}
          suggestions={mockSuggestions}
          loading={false}
          error={null}
        />,
      )

      await user.click(screen.getByText('Rome, Lazio (Italy)'))

      expect(onSelect).toHaveBeenCalledWith(mockSuggestions[0])
    })

    it('should not render dropdown when no suggestions and not loading', () => {
      const { container } = render(
        <CityAutocomplete
          id="city"
          value=""
          onChange={onChange}
          onSelect={onSelect}
          suggestions={[]}
          loading={false}
          error={null}
        />,
      )

      expect(container.querySelector('.absolute')).not.toBeInTheDocument()
    })
  })
})
