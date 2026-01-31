import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRef } from 'react'
import {
  clamp,
  getDistance,
  isInteractiveElement,
  zoomToPoint,
  calculatePanLimits,
  useWheelGesture,
  useMousePanGesture,
  useChartGestures,
  type TransformState,
  type GestureConfig,
  type GestureCallbacks,
  type GestureRefs,
} from '@/hooks/useChartGestures'

// Helper to create mock Touch objects
function createTouch(overrides: Partial<Touch> = {}): Touch {
  return {
    clientX: 100,
    clientY: 100,
    force: 0,
    identifier: 0,
    pageX: 100,
    pageY: 100,
    radiusX: 0,
    radiusY: 0,
    rotationAngle: 0,
    screenX: 100,
    screenY: 100,
    target: document.createElement('div'),
    ...overrides,
  }
}

// Helper to create mock container element
function createMockContainer(): HTMLDivElement {
  const container = document.createElement('div')
  vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    right: 500,
    bottom: 500,
    width: 500,
    height: 500,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  })
  return container
}

describe('useChartGestures utility functions', () => {
  describe('clamp', () => {
    it('returns value when within range', () => {
      expect(clamp(5, 0, 10)).toBe(5)
    })

    it('returns min when value is below min', () => {
      expect(clamp(-5, 0, 10)).toBe(0)
    })

    it('returns max when value is above max', () => {
      expect(clamp(15, 0, 10)).toBe(10)
    })

    it('handles edge cases where value equals min or max', () => {
      expect(clamp(0, 0, 10)).toBe(0)
      expect(clamp(10, 0, 10)).toBe(10)
    })

    it('handles negative ranges', () => {
      expect(clamp(-5, -10, -1)).toBe(-5)
      expect(clamp(-15, -10, -1)).toBe(-10)
      expect(clamp(0, -10, -1)).toBe(-1)
    })
  })

  describe('getDistance', () => {
    it('calculates distance between two touch points', () => {
      const touchA = createTouch({ clientX: 0, clientY: 0 })
      const touchB = createTouch({ clientX: 3, clientY: 4 })
      expect(getDistance(touchA, touchB)).toBe(5) // 3-4-5 triangle
    })

    it('returns 0 for same point', () => {
      const touchA = createTouch({ clientX: 100, clientY: 100 })
      const touchB = createTouch({ clientX: 100, clientY: 100 })
      expect(getDistance(touchA, touchB)).toBe(0)
    })

    it('handles negative coordinates', () => {
      const touchA = createTouch({ clientX: -10, clientY: -10 })
      const touchB = createTouch({ clientX: -7, clientY: -6 })
      expect(getDistance(touchA, touchB)).toBe(5) // 3-4-5 triangle
    })
  })

  describe('isInteractiveElement', () => {
    it('returns false for null target', () => {
      expect(isInteractiveElement(null)).toBe(false)
    })

    it('returns false for non-Element target', () => {
      expect(isInteractiveElement(document)).toBe(false)
    })

    it('returns true for button element', () => {
      const button = document.createElement('button')
      document.body.appendChild(button)
      expect(isInteractiveElement(button)).toBe(true)
      document.body.removeChild(button)
    })

    it('returns true for anchor element', () => {
      const anchor = document.createElement('a')
      document.body.appendChild(anchor)
      expect(isInteractiveElement(anchor)).toBe(true)
      document.body.removeChild(anchor)
    })

    it('returns true for element with role="button"', () => {
      const div = document.createElement('div')
      div.setAttribute('role', 'button')
      document.body.appendChild(div)
      expect(isInteractiveElement(div)).toBe(true)
      document.body.removeChild(div)
    })

    it('returns true for element with data-zoom-interactive attribute', () => {
      const div = document.createElement('div')
      div.setAttribute('data-zoom-interactive', '')
      document.body.appendChild(div)
      expect(isInteractiveElement(div)).toBe(true)
      document.body.removeChild(div)
    })

    it('returns true for child of interactive element', () => {
      const button = document.createElement('button')
      const span = document.createElement('span')
      button.appendChild(span)
      document.body.appendChild(button)
      expect(isInteractiveElement(span)).toBe(true)
      document.body.removeChild(button)
    })

    it('returns false for regular div', () => {
      const div = document.createElement('div')
      document.body.appendChild(div)
      expect(isInteractiveElement(div)).toBe(false)
      document.body.removeChild(div)
    })
  })

  describe('zoomToPoint', () => {
    it('zooms in centered on cursor position', () => {
      const container = createMockContainer()
      const initialTransform: TransformState = { scale: 1, x: 0, y: 0 }
      const config: GestureConfig = { minScale: 0.5, maxScale: 3 }

      const result = zoomToPoint(1.1, 250, 250, container, initialTransform, config)

      expect(result.scale).toBeCloseTo(1.1, 5)
      // When zooming in at center, translation should be negative to keep center centered
      expect(result.x).toBeLessThan(0)
      expect(result.y).toBeLessThan(0)
    })

    it('respects maxScale limit', () => {
      const container = createMockContainer()
      const initialTransform: TransformState = { scale: 2.9, x: 0, y: 0 }
      const config: GestureConfig = { minScale: 0.5, maxScale: 3 }

      const result = zoomToPoint(2, 250, 250, container, initialTransform, config)

      expect(result.scale).toBe(3) // Clamped to maxScale
    })

    it('respects minScale limit', () => {
      const container = createMockContainer()
      const initialTransform: TransformState = { scale: 0.6, x: 0, y: 0 }
      const config: GestureConfig = { minScale: 0.5, maxScale: 3 }

      const result = zoomToPoint(0.5, 250, 250, container, initialTransform, config)

      expect(result.scale).toBe(0.5) // Clamped to minScale
    })

    it('zooms at corner maintains corner position', () => {
      const container = createMockContainer()
      const initialTransform: TransformState = { scale: 1, x: 0, y: 0 }
      const config: GestureConfig = { minScale: 0.5, maxScale: 3 }

      // Zoom at top-left corner (0, 0)
      const result = zoomToPoint(2, 0, 0, container, initialTransform, config)

      expect(result.scale).toBe(2)
      // Top-left should stay at origin
      expect(result.x).toBeCloseTo(0, 5)
      expect(result.y).toBeCloseTo(0, 5)
    })
  })

  describe('calculatePanLimits', () => {
    it('calculates correct limits for scale > 1', () => {
      const containerRect = { width: 500, height: 400 } as DOMRect
      const scale = 2

      const limits = calculatePanLimits(containerRect, scale)

      // At scale 2, content is twice the size, so we can pan by -(container * (scale - 1))
      expect(limits.minX).toBe(-500) // 500 * (1 - 2) = -500
      expect(limits.maxX).toBe(0)
      expect(limits.minY).toBe(-400) // 400 * (1 - 2) = -400
      expect(limits.maxY).toBe(0)
    })

    it('calculates correct limits for scale = 1', () => {
      const containerRect = { width: 500, height: 400 } as DOMRect
      const scale = 1

      const limits = calculatePanLimits(containerRect, scale)

      // At scale 1, no panning should be allowed
      expect(limits.minX).toBe(0)
      expect(limits.maxX).toBe(0)
      expect(limits.minY).toBe(0)
      expect(limits.maxY).toBe(0)
    })

    it('calculates correct limits for scale < 1', () => {
      const containerRect = { width: 500, height: 400 } as DOMRect
      const scale = 0.5

      const limits = calculatePanLimits(containerRect, scale)

      // At scale 0.5, content is smaller, so limits are positive (though clamping should prevent panning)
      expect(limits.minX).toBe(250) // 500 * (1 - 0.5) = 250
      expect(limits.maxX).toBe(0)
      expect(limits.minY).toBe(200) // 400 * (1 - 0.5) = 200
      expect(limits.maxY).toBe(0)
    })
  })
})

describe('useWheelGesture', () => {
  let container: HTMLDivElement
  let content: HTMLDivElement
  let mockCallbacks: GestureCallbacks
  let liveTransformRef: React.MutableRefObject<TransformState>

  beforeEach(() => {
    container = createMockContainer()
    content = document.createElement('div')
    document.body.appendChild(container)
    container.appendChild(content)

    mockCallbacks = {
      onTransformChange: vi.fn(),
      onTransformEnd: vi.fn(),
      applyTransform: vi.fn(),
    }
  })

  afterEach(() => {
    document.body.removeChild(container)
    vi.clearAllMocks()
  })

  it('zooms in on wheel up (negative deltaY)', () => {
    const { result } = renderHook(() => {
      const containerRef = useRef<HTMLDivElement>(container)
      liveTransformRef = useRef<TransformState>({ scale: 1, x: 0, y: 0 })
      const refs: GestureRefs = { containerRef, liveTransformRef }
      const config: GestureConfig = { minScale: 0.5, maxScale: 3 }
      useWheelGesture(refs, config, mockCallbacks)
      return { containerRef, liveTransformRef }
    })

    const wheelEvent = new WheelEvent('wheel', {
      deltaY: -100, // Scroll up = zoom in
      clientX: 250,
      clientY: 250,
      bubbles: true,
    })

    act(() => {
      container.dispatchEvent(wheelEvent)
    })

    expect(mockCallbacks.applyTransform).toHaveBeenCalled()
    expect(mockCallbacks.onTransformEnd).toHaveBeenCalled()
    expect(result.current.liveTransformRef.current.scale).toBeGreaterThan(1)
  })

  it('zooms out on wheel down (positive deltaY)', () => {
    const { result } = renderHook(() => {
      const containerRef = useRef<HTMLDivElement>(container)
      liveTransformRef = useRef<TransformState>({ scale: 1.5, x: 0, y: 0 })
      const refs: GestureRefs = { containerRef, liveTransformRef }
      const config: GestureConfig = { minScale: 0.5, maxScale: 3 }
      useWheelGesture(refs, config, mockCallbacks)
      return { containerRef, liveTransformRef }
    })

    const wheelEvent = new WheelEvent('wheel', {
      deltaY: 100, // Scroll down = zoom out
      clientX: 250,
      clientY: 250,
      bubbles: true,
    })

    act(() => {
      container.dispatchEvent(wheelEvent)
    })

    expect(result.current.liveTransformRef.current.scale).toBeLessThan(1.5)
  })

  it('prevents default on wheel events', () => {
    renderHook(() => {
      const containerRef = useRef<HTMLDivElement>(container)
      liveTransformRef = useRef<TransformState>({ scale: 1, x: 0, y: 0 })
      const refs: GestureRefs = { containerRef, liveTransformRef }
      const config: GestureConfig = { minScale: 0.5, maxScale: 3 }
      useWheelGesture(refs, config, mockCallbacks)
    })

    const wheelEvent = new WheelEvent('wheel', {
      deltaY: -100,
      clientX: 250,
      clientY: 250,
      bubbles: true,
      cancelable: true,
    })

    const preventDefaultSpy = vi.spyOn(wheelEvent, 'preventDefault')

    act(() => {
      container.dispatchEvent(wheelEvent)
    })

    expect(preventDefaultSpy).toHaveBeenCalled()
  })
})

describe('useMousePanGesture', () => {
  let container: HTMLDivElement
  let mockCallbacks: GestureCallbacks
  let liveTransformRef: React.MutableRefObject<TransformState>

  beforeEach(() => {
    container = createMockContainer()
    document.body.appendChild(container)

    mockCallbacks = {
      onTransformChange: vi.fn(),
      onTransformEnd: vi.fn(),
      applyTransform: vi.fn(),
    }
  })

  afterEach(() => {
    document.body.removeChild(container)
    vi.clearAllMocks()
  })

  it('does not pan when scale is at default (1.0)', () => {
    renderHook(() => {
      const containerRef = useRef<HTMLDivElement>(container)
      liveTransformRef = useRef<TransformState>({ scale: 1, x: 0, y: 0 })
      const refs: GestureRefs = { containerRef, liveTransformRef }
      useMousePanGesture(refs, mockCallbacks)
    })

    const mousedownEvent = new MouseEvent('mousedown', {
      button: 0,
      clientX: 100,
      clientY: 100,
      bubbles: true,
    })

    act(() => {
      container.dispatchEvent(mousedownEvent)
    })

    const mousemoveEvent = new MouseEvent('mousemove', {
      clientX: 150,
      clientY: 150,
      bubbles: true,
    })

    act(() => {
      window.dispatchEvent(mousemoveEvent)
    })

    // Should not have panned because scale is 1.0 (below threshold)
    expect(mockCallbacks.applyTransform).not.toHaveBeenCalled()
  })

  it('pans when scale is above threshold', () => {
    renderHook(() => {
      const containerRef = useRef<HTMLDivElement>(container)
      liveTransformRef = useRef<TransformState>({ scale: 2, x: 0, y: 0 })
      const refs: GestureRefs = { containerRef, liveTransformRef }
      useMousePanGesture(refs, mockCallbacks)
      return { containerRef, liveTransformRef }
    })

    const mousedownEvent = new MouseEvent('mousedown', {
      button: 0,
      clientX: 100,
      clientY: 100,
      bubbles: true,
    })

    act(() => {
      container.dispatchEvent(mousedownEvent)
    })

    const mousemoveEvent = new MouseEvent('mousemove', {
      clientX: 150,
      clientY: 150,
      bubbles: true,
    })

    act(() => {
      window.dispatchEvent(mousemoveEvent)
    })

    expect(mockCallbacks.applyTransform).toHaveBeenCalled()
    // Translation should have changed (clamped, but changed)
    // Note: actual values depend on clamping logic
  })

  it('ignores right-click (button !== 0)', () => {
    renderHook(() => {
      const containerRef = useRef<HTMLDivElement>(container)
      liveTransformRef = useRef<TransformState>({ scale: 2, x: 0, y: 0 })
      const refs: GestureRefs = { containerRef, liveTransformRef }
      useMousePanGesture(refs, mockCallbacks)
    })

    const rightClickEvent = new MouseEvent('mousedown', {
      button: 2, // Right click
      clientX: 100,
      clientY: 100,
      bubbles: true,
    })

    act(() => {
      container.dispatchEvent(rightClickEvent)
    })

    const mousemoveEvent = new MouseEvent('mousemove', {
      clientX: 150,
      clientY: 150,
      bubbles: true,
    })

    act(() => {
      window.dispatchEvent(mousemoveEvent)
    })

    expect(mockCallbacks.applyTransform).not.toHaveBeenCalled()
  })

  it('calls onTransformEnd on mouseup', () => {
    renderHook(() => {
      const containerRef = useRef<HTMLDivElement>(container)
      liveTransformRef = useRef<TransformState>({ scale: 2, x: 0, y: 0 })
      const refs: GestureRefs = { containerRef, liveTransformRef }
      useMousePanGesture(refs, mockCallbacks)
    })

    // Start pan
    act(() => {
      container.dispatchEvent(
        new MouseEvent('mousedown', {
          button: 0,
          clientX: 100,
          clientY: 100,
          bubbles: true,
        }),
      )
    })

    // Move
    act(() => {
      window.dispatchEvent(
        new MouseEvent('mousemove', {
          clientX: 150,
          clientY: 150,
          bubbles: true,
        }),
      )
    })

    // Release
    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    })

    expect(mockCallbacks.onTransformEnd).toHaveBeenCalled()
  })
})

describe('useChartGestures (composed hook)', () => {
  let container: HTMLDivElement
  let content: HTMLDivElement
  let setScaleMock: ReturnType<typeof vi.fn>
  let setTranslationMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    container = createMockContainer()
    content = document.createElement('div')
    document.body.appendChild(container)
    container.appendChild(content)
    setScaleMock = vi.fn()
    setTranslationMock = vi.fn()
  })

  afterEach(() => {
    document.body.removeChild(container)
    vi.clearAllMocks()
  })

  it('composes all gesture behaviors', () => {
    renderHook(() => {
      const containerRef = useRef<HTMLDivElement>(container)
      const contentRef = useRef<HTMLDivElement>(content)
      const liveTransformRef = useRef<TransformState>({ scale: 1, x: 0, y: 0 })
      const config: GestureConfig = { minScale: 0.5, maxScale: 3 }
      useChartGestures(
        containerRef,
        contentRef,
        liveTransformRef,
        config,
        setScaleMock as (scale: number) => void,
        setTranslationMock as (translation: { x: number; y: number }) => void,
      )
    })

    // Test wheel gesture
    const wheelEvent = new WheelEvent('wheel', {
      deltaY: -100,
      clientX: 250,
      clientY: 250,
      bubbles: true,
    })

    act(() => {
      container.dispatchEvent(wheelEvent)
    })

    expect(setScaleMock).toHaveBeenCalled()
    expect(setTranslationMock).toHaveBeenCalled()
  })

  it('syncs state on gesture end', () => {
    renderHook(() => {
      const containerRef = useRef<HTMLDivElement>(container)
      const contentRef = useRef<HTMLDivElement>(content)
      const liveTransformRef = useRef<TransformState>({ scale: 2, x: 0, y: 0 })
      const config: GestureConfig = { minScale: 0.5, maxScale: 3 }
      useChartGestures(
        containerRef,
        contentRef,
        liveTransformRef,
        config,
        setScaleMock as (scale: number) => void,
        setTranslationMock as (translation: { x: number; y: number }) => void,
      )
    })

    // Start and complete a mouse drag
    act(() => {
      container.dispatchEvent(
        new MouseEvent('mousedown', {
          button: 0,
          clientX: 100,
          clientY: 100,
          bubbles: true,
        }),
      )
    })

    act(() => {
      window.dispatchEvent(
        new MouseEvent('mousemove', {
          clientX: 150,
          clientY: 150,
          bubbles: true,
        }),
      )
    })

    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    })

    expect(setScaleMock).toHaveBeenCalled()
    expect(setTranslationMock).toHaveBeenCalled()
  })
})
