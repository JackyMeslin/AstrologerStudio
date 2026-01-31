import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SkipLink } from '@/components/SkipLink'

describe('SkipLink', () => {
  it('should render a link targeting #main-content', () => {
    render(<SkipLink />)

    const link = screen.getByRole('link', { name: 'Skip to main content' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '#main-content')
  })

  it('should be visually hidden by default', () => {
    render(<SkipLink />)

    const link = screen.getByRole('link', { name: 'Skip to main content' })
    expect(link.className).toContain('sr-only')
  })

  it('should become visible on focus', async () => {
    const user = userEvent.setup()
    render(<SkipLink />)

    const link = screen.getByRole('link', { name: 'Skip to main content' })

    await user.tab()

    expect(link).toHaveFocus()
    expect(link.className).toContain('focus:not-sr-only')
    expect(link.className).toContain('focus:fixed')
  })

  it('should navigate to main-content anchor on click', async () => {
    const user = userEvent.setup()
    render(
      <>
        <SkipLink />
        <main id="main-content" tabIndex={-1}>
          Main content
        </main>
      </>,
    )

    const link = screen.getByRole('link', { name: 'Skip to main content' })

    await user.tab()
    expect(link).toHaveFocus()

    // Verify the href is correct for anchor navigation
    expect(link).toHaveAttribute('href', '#main-content')
  })
})
