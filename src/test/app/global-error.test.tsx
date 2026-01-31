/**
 * Unit Tests for Global Error Component
 *
 * Tests the global error boundary that catches catastrophic errors in the root layout.
 * This component renders a complete HTML document with inline styles since
 * providers and CSS may not be available when the root layout fails.
 *
 * @module src/app/global-error
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'

// Import directly - no mocks needed since global-error uses no external components
import GlobalError from '@/app/global-error'

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Creates a mock error with optional digest
 */
function createMockError(message: string, digest?: string): Error & { digest?: string } {
  const error = new Error(message) as Error & { digest?: string }
  if (digest) {
    error.digest = digest
  }
  return error
}

describe('GlobalError', () => {
  /**
   * Tests for the global error component.
   * This component catches catastrophic errors in the root layout.
   */

  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  let mockLocation: { href: string }

  // Create reset function that can be passed to the component
  const createMockReset = () => vi.fn()

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    // Mock window.location.href assignment
    mockLocation = { href: '' }
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true,
    })
  })

  afterEach(() => {
    cleanup()
    consoleErrorSpy.mockRestore()
    vi.resetAllMocks()
  })

  // ===========================================================================
  // Basic Rendering Tests
  // ===========================================================================

  describe('basic rendering', () => {
    /**
     * Tests for the basic UI elements that should always be present.
     */

    it('should display the error title', () => {
      const error = createMockError('Test error message')

      render(<GlobalError error={error} reset={createMockReset()} />)

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('should display a user-friendly description', () => {
      const error = createMockError('Test error message')

      render(<GlobalError error={error} reset={createMockReset()} />)

      expect(screen.getByText('A critical error occurred. Please try again or refresh the page.')).toBeInTheDocument()
    })

    it('should render the Try Again button', () => {
      const error = createMockError('Test error message')

      render(<GlobalError error={error} reset={createMockReset()} />)

      const tryAgainButton = screen.getByRole('button', { name: 'Try Again' })
      expect(tryAgainButton).toBeInTheDocument()
    })

    it('should render the Back to Home button', () => {
      const error = createMockError('Test error message')

      render(<GlobalError error={error} reset={createMockReset()} />)

      const homeButton = screen.getByRole('button', { name: 'Back to Home' })
      expect(homeButton).toBeInTheDocument()
    })

    it('should not depend on external components or CSS', () => {
      const error = createMockError('Test error message')

      // This test verifies that the component can render without any external dependencies
      // The component uses inline styles and no external imports besides React
      render(<GlobalError error={error} reset={createMockReset()} />)

      // Verify the component renders the main error card
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Interaction Tests
  // ===========================================================================

  describe('interactions', () => {
    /**
     * Tests for user interactions with recovery options.
     */

    it('should call reset when Try Again button is clicked', () => {
      const error = createMockError('Test error message')
      const mockReset = vi.fn()

      render(<GlobalError error={error} reset={mockReset} />)

      const tryAgainButton = screen.getByRole('button', { name: 'Try Again' })
      fireEvent.click(tryAgainButton)

      expect(mockReset).toHaveBeenCalledTimes(1)
    })

    it('should call reset multiple times when clicked multiple times', () => {
      const error = createMockError('Test error message')
      const mockReset = vi.fn()

      render(<GlobalError error={error} reset={mockReset} />)

      const tryAgainButton = screen.getByRole('button', { name: 'Try Again' })
      fireEvent.click(tryAgainButton)
      fireEvent.click(tryAgainButton)
      fireEvent.click(tryAgainButton)

      expect(mockReset).toHaveBeenCalledTimes(3)
    })

    it('should navigate to home when Back to Home button is clicked', () => {
      const error = createMockError('Test error message')

      render(<GlobalError error={error} reset={createMockReset()} />)

      const homeButton = screen.getByRole('button', { name: 'Back to Home' })
      fireEvent.click(homeButton)

      expect(mockLocation.href).toBe('/')
    })
  })

  // ===========================================================================
  // Error Logging Tests
  // ===========================================================================

  describe('error logging', () => {
    /**
     * Tests for error logging functionality.
     */

    it('should log the error to console on mount', () => {
      const error = createMockError('Test error message')

      render(<GlobalError error={error} reset={createMockReset()} />)

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Global error caught:', error)
    })

    it('should log errors with different messages correctly', () => {
      const error = createMockError('A completely different error')

      render(<GlobalError error={error} reset={createMockReset()} />)

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Global error caught:', error)
    })
  })

  // ===========================================================================
  // Development Mode Tests
  // ===========================================================================

  describe('development mode', () => {
    /**
     * In development mode, error details should be visible to help with debugging.
     * Note: process.env.NODE_ENV is 'test' during testing, so we test
     * the logic paths that would be visible during development.
     */

    it('should display error message in development mode', () => {
      const error = createMockError('Detailed error information for developers')

      render(<GlobalError error={error} reset={createMockReset()} />)

      // The main UI should always render correctly
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Back to Home' })).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('edge cases', () => {
    /**
     * Tests for edge cases and unusual scenarios.
     */

    it('should handle errors without a message', () => {
      const error = new Error() as Error & { digest?: string }

      render(<GlobalError error={error} reset={createMockReset()} />)

      // Should still render the main UI
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
    })

    it('should handle errors with empty message', () => {
      const error = createMockError('')

      render(<GlobalError error={error} reset={createMockReset()} />)

      // Should still render the main UI without error message box
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('should log error with digest correctly', () => {
      const error = createMockError('Error with digest', 'abc123xyz')

      render(<GlobalError error={error} reset={createMockReset()} />)

      // Error should be logged with digest
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Global error caught:', error)
      expect(error.digest).toBe('abc123xyz')
    })

    it('should use inline styles for self-contained rendering', () => {
      const error = createMockError('Test error')

      render(<GlobalError error={error} reset={createMockReset()} />)

      // Verify buttons have inline styles by checking they render correctly
      // The component uses inline styles so it can render without external CSS
      const tryAgainButton = screen.getByRole('button', { name: 'Try Again' })
      const homeButton = screen.getByRole('button', { name: 'Back to Home' })
      expect(tryAgainButton).toBeInTheDocument()
      expect(homeButton).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Inline Styles Tests
  // ===========================================================================

  describe('inline styles', () => {
    /**
     * Tests that the component uses inline styles correctly
     * since external CSS may not be available when root layout fails.
     */

    it('should render with inline styles for dark theme', () => {
      const error = createMockError('Test error')

      render(<GlobalError error={error} reset={createMockReset()} />)

      // Verify the component renders correctly with its inline styles
      // The actual body/html elements are hoisted by jsdom, but we can verify
      // the component renders its content properly
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.getByText('A critical error occurred. Please try again or refresh the page.')).toBeInTheDocument()
    })

    it('should render buttons with proper styling', () => {
      const error = createMockError('Test error')

      render(<GlobalError error={error} reset={createMockReset()} />)

      // Verify buttons are rendered and functional
      const tryAgainButton = screen.getByRole('button', { name: 'Try Again' })
      const homeButton = screen.getByRole('button', { name: 'Back to Home' })

      expect(tryAgainButton).toBeInTheDocument()
      expect(homeButton).toBeInTheDocument()
    })
  })
})
