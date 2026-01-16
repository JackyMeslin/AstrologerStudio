/**
 * Unit Tests for Button Component
 *
 * Tests the Button component from the Shadcn UI library.
 * The Button is a fundamental UI primitive used throughout the application.
 *
 * @module src/components/ui/button
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@/components/ui/button'

describe('Button', () => {
  /**
   * Core rendering and interaction tests for the Button component.
   * Tests cover variants, sizes, states, and event handling.
   */

  // ===========================================================================
  // Basic Rendering
  // ===========================================================================

  it('should render children correctly', () => {
    // Basic rendering: button should display its text content
    render(<Button>Click me</Button>)

    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('should apply default variant and size classes', () => {
    // Default button should have primary styling
    render(<Button>Default Button</Button>)

    const button = screen.getByRole('button')

    // Check for data-slot attribute used by Shadcn
    expect(button).toHaveAttribute('data-slot', 'button')
  })

  // ===========================================================================
  // Variant Tests
  // ===========================================================================

  describe('variants', () => {
    /**
     * Test each button variant renders correctly.
     * Variants control the visual style (colors, borders, etc.)
     */

    it('should render default variant', () => {
      render(<Button variant="default">Default</Button>)

      const button = screen.getByRole('button')
      // Default variant uses primary colors
      expect(button.className).toContain('bg-primary')
    })

    it('should render destructive variant', () => {
      // Destructive buttons are used for dangerous actions like delete
      render(<Button variant="destructive">Delete</Button>)

      const button = screen.getByRole('button')
      expect(button.className).toContain('bg-destructive')
    })

    it('should render outline variant', () => {
      // Outline buttons have a border but no background
      render(<Button variant="outline">Outline</Button>)

      const button = screen.getByRole('button')
      expect(button.className).toContain('border')
    })

    it('should render ghost variant', () => {
      // Ghost buttons are invisible until hovered
      render(<Button variant="ghost">Ghost</Button>)

      const button = screen.getByRole('button')
      expect(button.className).toContain('hover:bg-accent')
    })

    it('should render link variant', () => {
      // Link variant looks like a text link
      render(<Button variant="link">Link</Button>)

      const button = screen.getByRole('button')
      expect(button.className).toContain('underline-offset')
    })
  })

  // ===========================================================================
  // Size Tests
  // ===========================================================================

  describe('sizes', () => {
    /**
     * Test each button size renders correctly.
     * Sizes control padding and font size.
     */

    it('should render default size', () => {
      render(<Button size="default">Default Size</Button>)

      const button = screen.getByRole('button')
      expect(button.className).toContain('h-9')
    })

    it('should render small size', () => {
      render(<Button size="sm">Small</Button>)

      const button = screen.getByRole('button')
      expect(button.className).toContain('h-8')
    })

    it('should render large size', () => {
      render(<Button size="lg">Large</Button>)

      const button = screen.getByRole('button')
      expect(button.className).toContain('h-10')
    })

    it('should render icon size', () => {
      // Icon buttons are square for icon-only content
      render(<Button size="icon">🔍</Button>)

      const button = screen.getByRole('button')
      expect(button.className).toContain('size-9')
    })
  })

  // ===========================================================================
  // Interaction Tests
  // ===========================================================================

  describe('interactions', () => {
    /**
     * Test button click handling and disabled state.
     */

    it('should call onClick handler when clicked', () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>Click me</Button>)

      fireEvent.click(screen.getByRole('button'))

      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should not call onClick when disabled', () => {
      const handleClick = vi.fn()
      render(
        <Button onClick={handleClick} disabled>
          Disabled
        </Button>,
      )

      const button = screen.getByRole('button')

      // Disabled buttons should have the disabled attribute
      expect(button).toBeDisabled()

      // Click should not trigger the handler
      fireEvent.click(button)
      expect(handleClick).not.toHaveBeenCalled()
    })

    it('should apply disabled styles', () => {
      render(<Button disabled>Disabled</Button>)

      const button = screen.getByRole('button')

      // Check for disabled opacity class
      expect(button.className).toContain('disabled:opacity-50')
    })
  })

  // ===========================================================================
  // Custom Props
  // ===========================================================================

  describe('custom props', () => {
    /**
     * Test that Button properly forwards HTML attributes.
     */

    it('should accept custom className', () => {
      render(<Button className="custom-class">Custom</Button>)

      const button = screen.getByRole('button')
      expect(button.className).toContain('custom-class')
    })

    it('should accept type attribute', () => {
      render(<Button type="submit">Submit</Button>)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('type', 'submit')
    })

    it('should accept aria attributes', () => {
      // Accessibility attributes should be forwarded
      render(<Button aria-label="Close dialog">×</Button>)

      expect(screen.getByLabelText('Close dialog')).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // asChild Pattern
  // ===========================================================================

  describe('asChild', () => {
    /**
     * Test the Radix UI Slot pattern for rendering as different elements.
     * This allows Button styles to be applied to links, etc.
     */

    it('should render as child element when asChild is true', () => {
      render(
        <Button asChild>
          <a href="/home">Home Link</a>
        </Button>,
      )

      // Should render as an anchor, not a button
      const link = screen.getByRole('link', { name: 'Home Link' })
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href', '/home')

      // Button should not exist
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })
  })
})
