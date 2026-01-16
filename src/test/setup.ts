/**
 * Test Setup File
 *
 * This file is loaded before each test file runs (configured in vitest.config.ts).
 * It sets up the testing environment with necessary extensions and mocks.
 */

// Extend Vitest's expect with custom DOM matchers from jest-dom
// This adds matchers like toBeInTheDocument(), toHaveTextContent(), etc.
import '@testing-library/jest-dom/vitest'

// Mock window.matchMedia for components that use media queries
// This is needed because jsdom doesn't implement matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

// Mock ResizeObserver which is not available in jsdom
// Required by some UI components that observe element size changes
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
