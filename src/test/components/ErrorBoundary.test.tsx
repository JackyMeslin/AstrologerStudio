/**
 * Unit Tests for ErrorBoundary Component
 *
 * Tests the error boundary component that catches React errors
 * and displays a user-friendly fallback UI.
 *
 * @module src/components/ErrorBoundary
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from '@/components/ErrorBoundary'

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Component that throws an error for testing purposes.
 * This simulates a crash in a child component.
 */
function ThrowingComponent({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error message')
  }
  return <div>No error occurred</div>
}

/**
 * Component that renders normally for comparison tests.
 */
function NormalComponent() {
  return <div data-testid="normal-content">Normal content renders fine</div>
}

describe('ErrorBoundary', () => {
  /**
   * Tests for the ErrorBoundary class component.
   * Error boundaries are the only way to catch rendering errors in React.
   */

  // Suppress console.error during tests to keep output clean
  // ErrorBoundary logs errors which is expected behavior
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  // ===========================================================================
  // Normal Operation Tests
  // ===========================================================================

  describe('when no error occurs', () => {
    /**
     * When children render successfully, ErrorBoundary is transparent.
     */

    it('should render children normally', () => {
      render(
        <ErrorBoundary>
          <NormalComponent />
        </ErrorBoundary>,
      )

      expect(screen.getByTestId('normal-content')).toBeInTheDocument()
      expect(screen.getByText('Normal content renders fine')).toBeInTheDocument()
    })

    it('should render multiple children', () => {
      render(
        <ErrorBoundary>
          <div>Child 1</div>
          <div>Child 2</div>
          <div>Child 3</div>
        </ErrorBoundary>,
      )

      expect(screen.getByText('Child 1')).toBeInTheDocument()
      expect(screen.getByText('Child 2')).toBeInTheDocument()
      expect(screen.getByText('Child 3')).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================

  describe('when an error occurs', () => {
    /**
     * When a child component throws, ErrorBoundary catches it
     * and displays fallback UI instead of crashing the app.
     */

    it('should catch errors and display fallback UI', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>,
      )

      // Should display the error title
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('should display the error message', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>,
      )

      // Should show the actual error message for debugging
      expect(screen.getByText('Test error message')).toBeInTheDocument()
    })

    it('should provide a reload button', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>,
      )

      // User should be able to reload the page to recover
      const reloadButton = screen.getByRole('button', { name: 'Reload Page' })
      expect(reloadButton).toBeInTheDocument()
    })

    it('should log the error to console', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>,
      )

      // ErrorBoundary should call console.error when catching errors
      // React also logs errors internally, so we just verify it was called
      expect(consoleErrorSpy).toHaveBeenCalled()
    })
  })

  // ===========================================================================
  // Custom Fallback Tests
  // ===========================================================================

  describe('custom fallback', () => {
    /**
     * ErrorBoundary supports custom fallback UI for different contexts.
     */

    it('should render custom fallback when provided', () => {
      const customFallback = <div data-testid="custom-fallback">Custom error message</div>

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowingComponent />
        </ErrorBoundary>,
      )

      // Should use custom fallback instead of default
      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument()
      expect(screen.getByText('Custom error message')).toBeInTheDocument()

      // Default UI should not be present
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument()
    })

    it('should pass custom fallback element correctly', () => {
      const customFallback = (
        <div>
          <h1>Oops!</h1>
          <p>Something broke. Please try again.</p>
          <button>Retry</button>
        </div>
      )

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowingComponent />
        </ErrorBoundary>,
      )

      expect(screen.getByText('Oops!')).toBeInTheDocument()
      expect(screen.getByText('Something broke. Please try again.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    })
  })

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('edge cases', () => {
    /**
     * Test boundary conditions and unusual scenarios.
     */

    it('should handle errors without message gracefully', () => {
      // Some errors might not have a message property
      function ThrowsEmptyError(): React.ReactElement {
        throw new Error()
      }

      render(
        <ErrorBoundary>
          <ThrowsEmptyError />
        </ErrorBoundary>,
      )

      // Should still show the fallback UI
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('should isolate errors to the boundary', () => {
      // Errors in one boundary shouldn't affect siblings
      render(
        <div>
          <ErrorBoundary>
            <ThrowingComponent />
          </ErrorBoundary>
          <div data-testid="sibling">I should still render</div>
        </div>,
      )

      // The sibling should be unaffected
      expect(screen.getByTestId('sibling')).toBeInTheDocument()
      expect(screen.getByText('I should still render')).toBeInTheDocument()
    })
  })
})
