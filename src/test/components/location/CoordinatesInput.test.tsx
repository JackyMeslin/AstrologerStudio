/**
 * Unit Tests for CoordinatesInput Component
 *
 * Tests the CoordinatesInput component that provides latitude and longitude
 * input fields with validation.
 *
 * @module src/components/location/CoordinatesInput
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CoordinatesInput } from '@/components/location/CoordinatesInput'

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

describe('CoordinatesInput', () => {
  let onLatitudeChange: (value: number | undefined) => void
  let onLongitudeChange: (value: number | undefined) => void

  beforeEach(() => {
    vi.clearAllMocks()
    onLatitudeChange = vi.fn()
    onLongitudeChange = vi.fn()
  })

  // ===========================================================================
  // Next.js Client Component Directive Tests
  // ===========================================================================

  describe('Next.js client component directive', () => {
    it('should have "use client" directive at the top of the file', () => {
      const filePath = resolve(__dirname, '../../../components/location/CoordinatesInput.tsx')
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
    it('should render latitude and longitude labels', () => {
      render(
        <CoordinatesInput
          idPrefix="coords"
          latitude={undefined}
          longitude={undefined}
          onLatitudeChange={onLatitudeChange}
          onLongitudeChange={onLongitudeChange}
        />,
      )

      expect(screen.getByText('Latitude')).toBeInTheDocument()
      expect(screen.getByText('Longitude')).toBeInTheDocument()
    })

    it('should render with placeholder values', () => {
      render(
        <CoordinatesInput
          idPrefix="coords"
          latitude={undefined}
          longitude={undefined}
          onLatitudeChange={onLatitudeChange}
          onLongitudeChange={onLongitudeChange}
        />,
      )

      expect(screen.getByPlaceholderText('-90 a 90')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('-180 a 180')).toBeInTheDocument()
    })

    it('should render with provided values', () => {
      render(
        <CoordinatesInput
          idPrefix="coords"
          latitude={41.8919}
          longitude={12.5113}
          onLatitudeChange={onLatitudeChange}
          onLongitudeChange={onLongitudeChange}
        />,
      )

      expect(screen.getByDisplayValue('41.8919')).toBeInTheDocument()
      expect(screen.getByDisplayValue('12.5113')).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Input Tests
  // ===========================================================================

  describe('input handling', () => {
    it('should call onLatitudeChange when typing in latitude field', async () => {
      const user = userEvent.setup()

      render(
        <CoordinatesInput
          idPrefix="coords"
          latitude={undefined}
          longitude={undefined}
          onLatitudeChange={onLatitudeChange}
          onLongitudeChange={onLongitudeChange}
        />,
      )

      const latInput = screen.getByPlaceholderText('-90 a 90')
      await user.type(latInput, '45')

      expect(onLatitudeChange).toHaveBeenCalled()
    })

    it('should call onLongitudeChange when typing in longitude field', async () => {
      const user = userEvent.setup()

      render(
        <CoordinatesInput
          idPrefix="coords"
          latitude={undefined}
          longitude={undefined}
          onLatitudeChange={onLatitudeChange}
          onLongitudeChange={onLongitudeChange}
        />,
      )

      const lngInput = screen.getByPlaceholderText('-180 a 180')
      await user.type(lngInput, '90')

      expect(onLongitudeChange).toHaveBeenCalled()
    })

    it('should call with undefined when clearing latitude', async () => {
      const user = userEvent.setup()

      render(
        <CoordinatesInput
          idPrefix="coords"
          latitude={45}
          longitude={undefined}
          onLatitudeChange={onLatitudeChange}
          onLongitudeChange={onLongitudeChange}
        />,
      )

      const latInput = screen.getByDisplayValue('45')
      await user.clear(latInput)

      expect(onLatitudeChange).toHaveBeenCalledWith(undefined)
    })

    it('should call with undefined when clearing longitude', async () => {
      const user = userEvent.setup()

      render(
        <CoordinatesInput
          idPrefix="coords"
          latitude={undefined}
          longitude={90}
          onLatitudeChange={onLatitudeChange}
          onLongitudeChange={onLongitudeChange}
        />,
      )

      const lngInput = screen.getByDisplayValue('90')
      await user.clear(lngInput)

      expect(onLongitudeChange).toHaveBeenCalledWith(undefined)
    })
  })

  // ===========================================================================
  // Disabled State Tests
  // ===========================================================================

  describe('disabled state', () => {
    it('should disable both inputs when disabled prop is true', () => {
      render(
        <CoordinatesInput
          idPrefix="coords"
          latitude={undefined}
          longitude={undefined}
          onLatitudeChange={onLatitudeChange}
          onLongitudeChange={onLongitudeChange}
          disabled
        />,
      )

      const latInput = screen.getByPlaceholderText('-90 a 90')
      const lngInput = screen.getByPlaceholderText('-180 a 180')

      expect(latInput).toBeDisabled()
      expect(lngInput).toBeDisabled()
    })
  })

  // ===========================================================================
  // Error State Tests
  // ===========================================================================

  describe('error state', () => {
    it('should show latitude error message when provided', () => {
      render(
        <CoordinatesInput
          idPrefix="coords"
          latitude={undefined}
          longitude={undefined}
          onLatitudeChange={onLatitudeChange}
          onLongitudeChange={onLongitudeChange}
          latitudeError="Latitude is required"
        />,
      )

      expect(screen.getByText('Latitude is required')).toBeInTheDocument()
    })

    it('should show longitude error message when provided', () => {
      render(
        <CoordinatesInput
          idPrefix="coords"
          latitude={undefined}
          longitude={undefined}
          onLatitudeChange={onLatitudeChange}
          onLongitudeChange={onLongitudeChange}
          longitudeError="Longitude is required"
        />,
      )

      expect(screen.getByText('Longitude is required')).toBeInTheDocument()
    })

    it('should show both error messages when both provided', () => {
      render(
        <CoordinatesInput
          idPrefix="coords"
          latitude={undefined}
          longitude={undefined}
          onLatitudeChange={onLatitudeChange}
          onLongitudeChange={onLongitudeChange}
          latitudeError="Latitude is required"
          longitudeError="Longitude is required"
        />,
      )

      expect(screen.getByText('Latitude is required')).toBeInTheDocument()
      expect(screen.getByText('Longitude is required')).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Input Attributes Tests
  // ===========================================================================

  describe('input attributes', () => {
    it('should have correct min/max for latitude', () => {
      render(
        <CoordinatesInput
          idPrefix="coords"
          latitude={undefined}
          longitude={undefined}
          onLatitudeChange={onLatitudeChange}
          onLongitudeChange={onLongitudeChange}
        />,
      )

      const latInput = screen.getByPlaceholderText('-90 a 90')
      expect(latInput).toHaveAttribute('min', '-90')
      expect(latInput).toHaveAttribute('max', '90')
    })

    it('should have correct min/max for longitude', () => {
      render(
        <CoordinatesInput
          idPrefix="coords"
          latitude={undefined}
          longitude={undefined}
          onLatitudeChange={onLatitudeChange}
          onLongitudeChange={onLongitudeChange}
        />,
      )

      const lngInput = screen.getByPlaceholderText('-180 a 180')
      expect(lngInput).toHaveAttribute('min', '-180')
      expect(lngInput).toHaveAttribute('max', '180')
    })

    it('should have correct step value', () => {
      render(
        <CoordinatesInput
          idPrefix="coords"
          latitude={undefined}
          longitude={undefined}
          onLatitudeChange={onLatitudeChange}
          onLongitudeChange={onLongitudeChange}
        />,
      )

      const latInput = screen.getByPlaceholderText('-90 a 90')
      const lngInput = screen.getByPlaceholderText('-180 a 180')

      expect(latInput).toHaveAttribute('step', '0.0001')
      expect(lngInput).toHaveAttribute('step', '0.0001')
    })

    it('should have correct id attributes based on idPrefix', () => {
      render(
        <CoordinatesInput
          idPrefix="myform"
          latitude={undefined}
          longitude={undefined}
          onLatitudeChange={onLatitudeChange}
          onLongitudeChange={onLongitudeChange}
        />,
      )

      expect(screen.getByPlaceholderText('-90 a 90')).toHaveAttribute('id', 'myform_latitude')
      expect(screen.getByPlaceholderText('-180 a 180')).toHaveAttribute('id', 'myform_longitude')
    })
  })
})
