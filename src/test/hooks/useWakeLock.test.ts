import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWakeLock } from '@/hooks/useWakeLock'

// Mock the client logger
vi.mock('@/lib/logging/client', () => ({
  clientLogger: {
    debug: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock WakeLockSentinel interface
interface MockWakeLockSentinel {
  released: boolean
  type: 'screen'
  release: ReturnType<typeof vi.fn>
  addEventListener: ReturnType<typeof vi.fn>
  removeEventListener: ReturnType<typeof vi.fn>
  onrelease: null | (() => void)
}

function createMockWakeLockSentinel(): MockWakeLockSentinel {
  return {
    released: false,
    type: 'screen',
    release: vi.fn().mockResolvedValue(undefined),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    onrelease: null,
  }
}

describe('useWakeLock', () => {
  const originalNavigator = global.navigator
  let mockWakeLock: { request: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    mockWakeLock = {
      request: vi.fn(),
    }

    // Mock navigator.wakeLock
    Object.defineProperty(global, 'navigator', {
      value: {
        ...originalNavigator,
        wakeLock: mockWakeLock,
      },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    })
    vi.clearAllMocks()
  })

  it('returns isSupported as true when Wake Lock API is available', () => {
    const { result } = renderHook(() => useWakeLock())
    expect(result.current.isSupported).toBe(true)
  })

  it('returns isSupported as false when Wake Lock API is not available', () => {
    Object.defineProperty(global, 'navigator', {
      value: {},
      writable: true,
      configurable: true,
    })

    const { result } = renderHook(() => useWakeLock())
    expect(result.current.isSupported).toBe(false)
  })

  it('returns false when requesting wake lock on unsupported browser', async () => {
    Object.defineProperty(global, 'navigator', {
      value: {},
      writable: true,
      configurable: true,
    })

    const { result } = renderHook(() => useWakeLock())

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.request()
    })

    expect(success).toBe(false)
  })

  it('acquires wake lock and adds event listener on request', async () => {
    const mockSentinel = createMockWakeLockSentinel()
    mockWakeLock.request.mockResolvedValue(mockSentinel)

    const { result } = renderHook(() => useWakeLock())

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.request()
    })

    expect(success).toBe(true)
    expect(mockWakeLock.request).toHaveBeenCalledWith('screen')
    expect(mockSentinel.addEventListener).toHaveBeenCalledWith('release', expect.any(Function))
  })

  it('removes old event listener when requesting a new wake lock', async () => {
    const mockSentinel1 = createMockWakeLockSentinel()
    const mockSentinel2 = createMockWakeLockSentinel()

    mockWakeLock.request.mockResolvedValueOnce(mockSentinel1).mockResolvedValueOnce(mockSentinel2)

    const { result } = renderHook(() => useWakeLock())

    // First request
    await act(async () => {
      await result.current.request()
    })

    expect(mockSentinel1.addEventListener).toHaveBeenCalledTimes(1)
    const firstHandler = mockSentinel1.addEventListener.mock.calls[0]?.[1]
    expect(firstHandler).toBeDefined()

    // Second request - should clean up the first listener
    await act(async () => {
      await result.current.request()
    })

    expect(mockSentinel1.removeEventListener).toHaveBeenCalledWith('release', firstHandler)
    expect(mockSentinel1.release).toHaveBeenCalled()
    expect(mockSentinel2.addEventListener).toHaveBeenCalledTimes(1)
  })

  it('removes event listener on manual release', async () => {
    const mockSentinel = createMockWakeLockSentinel()
    mockWakeLock.request.mockResolvedValue(mockSentinel)

    const { result } = renderHook(() => useWakeLock())

    await act(async () => {
      await result.current.request()
    })

    const handler = mockSentinel.addEventListener.mock.calls[0]?.[1]
    expect(handler).toBeDefined()

    await act(async () => {
      await result.current.release()
    })

    expect(mockSentinel.removeEventListener).toHaveBeenCalledWith('release', handler)
    expect(mockSentinel.release).toHaveBeenCalled()
  })

  it('cleans up on unmount', async () => {
    const mockSentinel = createMockWakeLockSentinel()
    mockWakeLock.request.mockResolvedValue(mockSentinel)

    const { result, unmount } = renderHook(() => useWakeLock())

    await act(async () => {
      await result.current.request()
    })

    const handler = mockSentinel.addEventListener.mock.calls[0]?.[1]
    expect(handler).toBeDefined()

    unmount()

    expect(mockSentinel.removeEventListener).toHaveBeenCalledWith('release', handler)
    expect(mockSentinel.release).toHaveBeenCalled()
  })

  it('handles wake lock request failure gracefully', async () => {
    mockWakeLock.request.mockRejectedValue(new Error('Permission denied'))

    const { result } = renderHook(() => useWakeLock())

    let success: boolean | undefined
    await act(async () => {
      success = await result.current.request()
    })

    expect(success).toBe(false)
  })

  it('handles release failure gracefully', async () => {
    const mockSentinel = createMockWakeLockSentinel()
    mockSentinel.release.mockRejectedValue(new Error('Already released'))
    mockWakeLock.request.mockResolvedValue(mockSentinel)

    const { result } = renderHook(() => useWakeLock())

    await act(async () => {
      await result.current.request()
    })

    // Should not throw
    await act(async () => {
      await result.current.release()
    })
  })

  it('does nothing when release is called without active lock', async () => {
    const { result } = renderHook(() => useWakeLock())

    // Should not throw
    await act(async () => {
      await result.current.release()
    })

    expect(mockWakeLock.request).not.toHaveBeenCalled()
  })

  it('does not accumulate listeners on multiple requests', async () => {
    const sentinels = [createMockWakeLockSentinel(), createMockWakeLockSentinel(), createMockWakeLockSentinel()]

    mockWakeLock.request
      .mockResolvedValueOnce(sentinels[0])
      .mockResolvedValueOnce(sentinels[1])
      .mockResolvedValueOnce(sentinels[2])

    const { result } = renderHook(() => useWakeLock())

    // Make 3 consecutive requests
    await act(async () => {
      await result.current.request()
    })
    await act(async () => {
      await result.current.request()
    })
    await act(async () => {
      await result.current.request()
    })

    // Each sentinel should have exactly one addEventListener call
    expect(sentinels[0]!.addEventListener).toHaveBeenCalledTimes(1)
    expect(sentinels[1]!.addEventListener).toHaveBeenCalledTimes(1)
    expect(sentinels[2]!.addEventListener).toHaveBeenCalledTimes(1)

    // First two sentinels should have their listeners removed
    expect(sentinels[0]!.removeEventListener).toHaveBeenCalledTimes(1)
    expect(sentinels[1]!.removeEventListener).toHaveBeenCalledTimes(1)
    // Last sentinel still has its listener (not removed yet)
    expect(sentinels[2]!.removeEventListener).toHaveBeenCalledTimes(0)
  })
})
