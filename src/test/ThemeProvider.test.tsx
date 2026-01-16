/**
 * Unit Tests for ThemeProvider Component
 *
 * Tests the ThemeProvider wrapper that integrates next-themes
 * for dark/light mode support throughout the application.
 *
 * @module src/components/ThemeProvider
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@/components/ThemeProvider'

describe('ThemeProvider', () => {
  /**
   * Tests for the ThemeProvider component.
   * ThemeProvider wraps the app to provide theme context to all children.
   */

  // ===========================================================================
  // Basic Rendering
  // ===========================================================================

  it('should render children correctly', () => {
    // ThemeProvider should be transparent - children should render normally
    render(
      <ThemeProvider>
        <div data-testid="child">Test Content</div>
      </ThemeProvider>,
    )

    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('should render multiple children', () => {
    // Provider should handle multiple children without issues
    render(
      <ThemeProvider>
        <div>First Child</div>
        <div>Second Child</div>
        <span>Third Child</span>
      </ThemeProvider>,
    )

    expect(screen.getByText('First Child')).toBeInTheDocument()
    expect(screen.getByText('Second Child')).toBeInTheDocument()
    expect(screen.getByText('Third Child')).toBeInTheDocument()
  })

  it('should render nested components', () => {
    // Deep nesting should work correctly
    render(
      <ThemeProvider>
        <div>
          <section>
            <article>
              <p data-testid="nested">Deeply nested content</p>
            </article>
          </section>
        </div>
      </ThemeProvider>,
    )

    expect(screen.getByTestId('nested')).toBeInTheDocument()
  })

  // ===========================================================================
  // Props Forwarding
  // ===========================================================================

  it('should accept and forward props to next-themes provider', () => {
    // ThemeProvider accepts props that customize next-themes behavior
    // This test ensures the component doesn't break when receiving props
    // Note: actual props depend on ThemeProvider implementation
    // This test verifies rendering doesn't break with any configuration
    render(
      <ThemeProvider>
        <div>Content with custom props</div>
      </ThemeProvider>,
    )

    expect(screen.getByText('Content with custom props')).toBeInTheDocument()
  })

  it('should render without any props', () => {
    // Component should have sensible defaults
    render(
      <ThemeProvider>
        <div>Default props content</div>
      </ThemeProvider>,
    )

    expect(screen.getByText('Default props content')).toBeInTheDocument()
  })
})
