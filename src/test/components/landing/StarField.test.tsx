/**
 * Unit Tests for StarField Component
 *
 * Tests the recursive setTimeout cleanup behavior to prevent memory leaks.
 *
 * @module src/test/components/landing/StarField.test
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, cleanup, act } from '@testing-library/react'
import { StarField } from '@/components/landing/StarField'

describe('StarField Component', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('Rendering', () => {
    it('should render the star field container', () => {
      const { container } = render(<StarField />)
      expect(container.querySelector('.star-field')).toBeInTheDocument()
    })

    it('should generate static stars on mount', () => {
      const { container } = render(<StarField />)
      const stars = container.querySelectorAll('.star')
      expect(stars.length).toBe(60)
    })

    it('should render stars with correct size classes', () => {
      const { container } = render(<StarField />)
      const smStars = container.querySelectorAll('.star-sm')
      const mdStars = container.querySelectorAll('.star-md')
      const lgStars = container.querySelectorAll('.star-lg')

      // Stars should be randomly distributed across sizes
      expect(smStars.length + mdStars.length + lgStars.length).toBe(60)
    })
  })

  describe('setTimeout Cleanup on Unmount', () => {
    it('should clear all pending timeouts when component unmounts', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

      const { unmount } = render(<StarField />)

      // The initial timeout is scheduled with 500ms delay
      // Verify component mounted and scheduled the initial timeout
      expect(clearTimeoutSpy).not.toHaveBeenCalled()

      // Unmount the component
      unmount()

      // The cleanup function should have called clearTimeout
      expect(clearTimeoutSpy).toHaveBeenCalled()
    })

    it('should not call setState after unmount when timers fire', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { unmount } = render(<StarField />)

      // Schedule the initial batch (500ms)
      vi.advanceTimersByTime(500)

      // Unmount before any more timers can fire
      unmount()

      // Advance timers past when the cleanup timeout (5000ms) would fire
      // If cleanup wasn't working, this would cause "setState on unmounted component"
      vi.advanceTimersByTime(6000)

      // No React warnings about setState on unmounted component should appear
      // (In React 18+, this is a warning, not an error, but we check for safety)
      const reactWarnings = consoleErrorSpy.mock.calls.filter((call) =>
        call.some((arg) => typeof arg === 'string' && arg.includes('unmounted')),
      )
      expect(reactWarnings).toHaveLength(0)

      consoleErrorSpy.mockRestore()
    })

    it('should clear multiple pending timeouts on unmount', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

      const { unmount } = render(<StarField />)

      // Advance to trigger the first batch (500ms initial delay)
      act(() => {
        vi.advanceTimersByTime(500)
      })

      // Now there should be a cleanup timeout (5000ms) and a next batch timeout
      // scheduled by the recursive call

      // Unmount the component
      unmount()

      // Multiple clearTimeout calls should have been made (at least 2)
      // - One for the cleanup timeout (5000ms)
      // - One for the next scheduled batch timeout
      expect(clearTimeoutSpy).toHaveBeenCalled()

      // Verify at least 2 timeouts were cleared
      expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThanOrEqual(2)
    })

    it('should handle rapid mount/unmount cycles without memory leaks', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

      // Mount and unmount multiple times rapidly
      for (let i = 0; i < 5; i++) {
        const { unmount } = render(<StarField />)
        unmount()
      }

      // Each mount/unmount should clean up its timeout
      expect(clearTimeoutSpy).toHaveBeenCalled()
    })

    it('should clean up timeouts after shooting stars are triggered', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

      const { unmount, container } = render(<StarField />)

      // Advance past initial delay (500ms) to trigger first batch of shooting stars
      act(() => {
        vi.advanceTimersByTime(500)
      })

      // Check that shooting stars were added
      const shootingStars = container.querySelectorAll('.shooting-star')
      expect(shootingStars.length).toBeGreaterThanOrEqual(2) // 2-3 stars per batch

      // Unmount before cleanup timeout (5000ms) fires
      unmount()

      // Cleanup should have cancelled all pending timeouts
      expect(clearTimeoutSpy).toHaveBeenCalled()

      // Advance time - no errors should occur
      vi.advanceTimersByTime(20000)
    })
  })

  describe('Shooting Stars Behavior', () => {
    it('should add shooting stars after initial delay', () => {
      const { container } = render(<StarField />)

      // Initially no shooting stars
      expect(container.querySelectorAll('.shooting-star').length).toBe(0)

      // Advance past initial delay (500ms)
      act(() => {
        vi.advanceTimersByTime(500)
      })

      // Should have 2-3 shooting stars
      const shootingStars = container.querySelectorAll('.shooting-star')
      expect(shootingStars.length).toBeGreaterThanOrEqual(2)
      expect(shootingStars.length).toBeLessThanOrEqual(3)
    })

    it('should remove shooting stars after animation completes', () => {
      const { container } = render(<StarField />)

      // Trigger first batch of shooting stars
      act(() => {
        vi.advanceTimersByTime(500)
      })

      const initialCount = container.querySelectorAll('.shooting-star').length
      expect(initialCount).toBeGreaterThan(0)

      // Wait for cleanup timeout (5000ms from when stars were added)
      act(() => {
        vi.advanceTimersByTime(5000)
      })

      // Shooting stars should be removed
      const afterCleanup = container.querySelectorAll('.shooting-star').length
      expect(afterCleanup).toBeLessThan(initialCount)
    })
  })
})
