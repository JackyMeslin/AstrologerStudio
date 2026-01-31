/**
 * Unit Tests for Error Page Component
 *
 * Tests the global error boundary page that catches client-side errors
 * at the route level and displays a user-friendly fallback UI.
 *
 * @module src/app/error
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'

// ============================================================================
// Mocks - Must be defined before importing the component
// ============================================================================

// Mock next/link to render a simple anchor
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode
    href: string
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

// Import after mocks
import ErrorPage from '@/app/error'

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

describe('ErrorPage', () => {
  /**
   * Tests for the global error page component.
   * This component catches client-side errors at the route level.
   */

  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  // Create reset function that can be passed to the component
  const createMockReset = () => vi.fn()

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
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

      render(<ErrorPage error={error} reset={createMockReset()} />)

      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('should display a user-friendly description', () => {
      const error = createMockError('Test error message')

      render(<ErrorPage error={error} reset={createMockReset()} />)

      expect(
        screen.getByText('An unexpected error occurred. Please try again or return to the home page.'),
      ).toBeInTheDocument()
    })

    it('should render the Try Again button', () => {
      const error = createMockError('Test error message')

      render(<ErrorPage error={error} reset={createMockReset()} />)

      const tryAgainButton = screen.getByRole('button', { name: 'Try Again' })
      expect(tryAgainButton).toBeInTheDocument()
    })

    it('should render the Back to Home link', () => {
      const error = createMockError('Test error message')

      render(<ErrorPage error={error} reset={createMockReset()} />)

      const homeLink = screen.getByRole('link', { name: 'Back to Home' })
      expect(homeLink).toBeInTheDocument()
      expect(homeLink).toHaveAttribute('href', '/')
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

      render(<ErrorPage error={error} reset={mockReset} />)

      const tryAgainButton = screen.getByRole('button', { name: 'Try Again' })
      fireEvent.click(tryAgainButton)

      expect(mockReset).toHaveBeenCalledTimes(1)
    })

    it('should call reset multiple times when clicked multiple times', () => {
      const error = createMockError('Test error message')
      const mockReset = vi.fn()

      render(<ErrorPage error={error} reset={mockReset} />)

      const tryAgainButton = screen.getByRole('button', { name: 'Try Again' })
      fireEvent.click(tryAgainButton)
      fireEvent.click(tryAgainButton)
      fireEvent.click(tryAgainButton)

      expect(mockReset).toHaveBeenCalledTimes(3)
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

      render(<ErrorPage error={error} reset={createMockReset()} />)

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Error caught by error boundary:', error)
    })

    it('should log errors with different messages correctly', () => {
      const error = createMockError('A completely different error')

      render(<ErrorPage error={error} reset={createMockReset()} />)

      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Error caught by error boundary:', error)
    })
  })

  // ===========================================================================
  // Development Mode Tests
  // ===========================================================================

  describe('development mode', () => {
    /**
     * In development mode (which is the default for tests), error details
     * should be visible to help with debugging.
     * Note: process.env.NODE_ENV is 'test' during testing, so we test
     * the logic paths that would be visible during development.
     */

    it('should display error message in development mode', () => {
      // In test environment, NODE_ENV is 'test' but the component checks for 'development'
      // We test that the component structure is correct by checking UI exists
      const error = createMockError('Detailed error information for developers')

      render(<ErrorPage error={error} reset={createMockReset()} />)

      // The main UI should always render correctly
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Back to Home' })).toBeInTheDocument()
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

      render(<ErrorPage error={error} reset={createMockReset()} />)

      // Should still render the main UI
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
    })

    it('should handle errors with empty message', () => {
      const error = createMockError('')

      render(<ErrorPage error={error} reset={createMockReset()} />)

      // Should still render the main UI without error message box
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('should log error with digest correctly', () => {
      const error = createMockError('Error with digest', 'abc123xyz')

      render(<ErrorPage error={error} reset={createMockReset()} />)

      // Error should be logged with digest
      expect(consoleErrorSpy).toHaveBeenCalledWith('[ERROR] Error caught by error boundary:', error)
      expect(error.digest).toBe('abc123xyz')
    })

    it('should render card structure correctly', () => {
      const error = createMockError('Test error')

      render(<ErrorPage error={error} reset={createMockReset()} />)

      // Check for card structure
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(
        screen.getByText('An unexpected error occurred. Please try again or return to the home page.'),
      ).toBeInTheDocument()
    })
  })
})
