/**
 * Unit Tests for Protected Route Loading Component
 *
 * Tests the loading placeholder displayed during navigation between protected pages.
 * This component provides a minimal placeholder while page content loads.
 *
 * @module src/app/(protected)/loading
 */
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

import Loading from '@/app/(protected)/loading'

describe('Protected Loading Component', () => {
  /**
   * Tests for the loading placeholder component used in protected routes.
   */

  afterEach(() => {
    cleanup()
  })

  // ===========================================================================
  // Basic Rendering Tests
  // ===========================================================================

  describe('basic rendering', () => {
    /**
     * Tests for the basic UI structure and elements.
     */

    it('should render the loading container', () => {
      render(<Loading />)

      const container = screen.getByTestId('protected-loading')
      expect(container).toBeInTheDocument()
    })

    it('should have full width and height classes', () => {
      render(<Loading />)

      const container = screen.getByTestId('protected-loading')
      expect(container).toHaveClass('h-full')
      expect(container).toHaveClass('w-full')
    })

    it('should render as an empty placeholder', () => {
      render(<Loading />)

      const container = screen.getByTestId('protected-loading')
      expect(container).toBeEmptyDOMElement()
    })
  })

  // ===========================================================================
  // Accessibility Tests
  // ===========================================================================

  describe('accessibility', () => {
    /**
     * Tests for accessibility considerations.
     */

    it('should have a testable container for automation', () => {
      render(<Loading />)

      // The main container should be easily identifiable for testing
      expect(screen.getByTestId('protected-loading')).toBeInTheDocument()
    })
  })
})
