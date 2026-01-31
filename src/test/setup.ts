/**
 * Test Setup File
 *
 * This file is loaded before each test file runs (configured in vitest.config.ts).
 * It sets up the testing environment with necessary extensions and mocks.
 */

// Set up environment variables required for testing before any imports
process.env.SESSION_SECRET = 'test-secret-key-minimum-32-chars!!'

// Extend Vitest's expect with custom DOM matchers from jest-dom
// This adds matchers like toBeInTheDocument(), toHaveTextContent(), etc.
import '@testing-library/jest-dom/vitest'

// Only set up browser mocks if window is defined (jsdom environment)
if (typeof window !== 'undefined') {
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

  // Ensure localStorage is properly available for Zustand persist stores
  // jsdom provides localStorage but it may not be fully functional in all cases
  if (!window.localStorage || typeof window.localStorage.setItem !== 'function') {
    const localStorageMock = (() => {
      let store: Record<string, string> = {}
      return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
          store[key] = value
        },
        removeItem: (key: string) => {
          delete store[key]
        },
        clear: () => {
          store = {}
        },
        key: (index: number) => Object.keys(store)[index] || null,
        get length() {
          return Object.keys(store).length
        },
      }
    })()
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    })
  }
}

// Mock ResizeObserver which is not available in jsdom
// Required by some UI components that observe element size changes
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
