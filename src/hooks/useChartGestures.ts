'use client'

import { useCallback, useEffect, useRef } from 'react'

// Semantic constants for zoom thresholds
const WHEEL_ZOOM_FACTOR = 1.1
const PAN_ENABLED_SCALE_THRESHOLD = 1.05

/**
 * Keep a numeric value within the provided range.
 */
export const clamp = (value: number, min: number, max: number): number => {
  if (value < min) return min
  if (value > max) return max
  return value
}

/**
 * Calculate the distance between two touch points for pinch detection.
 */
export const getDistance = (touchA: Touch, touchB: Touch): number => {
  const deltaX = touchA.clientX - touchB.clientX
  const deltaY = touchA.clientY - touchB.clientY
  return Math.hypot(deltaX, deltaY)
}

/**
 * Check if event target is an interactive element (buttons, links, etc.)
 */
export const isInteractiveElement = (target: EventTarget | null): boolean => {
  return target instanceof Element && !!target.closest('[data-zoom-interactive], button, a, [role="button"]')
}

/**
 * Shared transform state used by all gesture hooks.
 */
export type TransformState = {
  scale: number
  x: number
  y: number
}

/**
 * Configuration for gesture hooks.
 */
export type GestureConfig = {
  minScale: number
  maxScale: number
}

/**
 * Callback types for gesture hooks.
 */
export type GestureCallbacks = {
  onTransformChange: (transform: TransformState) => void
  onTransformEnd: (transform: TransformState) => void
  applyTransform: () => void
}

/**
 * Refs needed by gesture hooks.
 */
export type GestureRefs = {
  containerRef: React.RefObject<HTMLDivElement | null>
  liveTransformRef: React.MutableRefObject<TransformState>
}

/**
 * Zoom to a specific point, keeping that point under the cursor/finger.
 */
export function zoomToPoint(
  scaleFactor: number,
  clientX: number,
  clientY: number,
  container: HTMLElement,
  liveTransform: TransformState,
  config: GestureConfig,
): TransformState {
  const { scale: currentScale, x: currentX, y: currentY } = liveTransform

  const newScale = clamp(currentScale * scaleFactor, config.minScale, config.maxScale)

  // Get container-relative coordinates
  const containerRect = container.getBoundingClientRect()
  const cursorX = clientX - containerRect.left
  const cursorY = clientY - containerRect.top

  // Point in chart coordinates (unscaled)
  const pointX = (cursorX - currentX) / currentScale
  const pointY = (cursorY - currentY) / currentScale

  const newX = cursorX - pointX * newScale
  const newY = cursorY - pointY * newScale

  return { scale: newScale, x: newX, y: newY }
}

/**
 * Calculate pan translation limits based on container and scale.
 */
export function calculatePanLimits(
  containerRect: DOMRect,
  scale: number,
): { minX: number; maxX: number; minY: number; maxY: number } {
  const minX = containerRect.width * (1 - scale)
  const maxX = 0
  const minY = containerRect.height * (1 - scale)
  const maxY = 0
  return { minX, maxX, minY, maxY }
}

/**
 * Hook for handling wheel-based zooming.
 */
export function useWheelGesture(refs: GestureRefs, config: GestureConfig, callbacks: GestureCallbacks): void {
  const { containerRef, liveTransformRef } = refs
  const { onTransformEnd, applyTransform } = callbacks

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      const scaleFactor = event.deltaY < 0 ? WHEEL_ZOOM_FACTOR : 1 / WHEEL_ZOOM_FACTOR

      const newTransform = zoomToPoint(
        scaleFactor,
        event.clientX,
        event.clientY,
        container,
        liveTransformRef.current,
        config,
      )

      liveTransformRef.current = newTransform
      applyTransform()

      // Update touch-action for gesture handling
      container.style.touchAction = newTransform.scale > PAN_ENABLED_SCALE_THRESHOLD ? 'none' : 'manipulation'

      // Wheel is a discrete event, so sync state immediately
      onTransformEnd(newTransform)
    }

    container.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      container.removeEventListener('wheel', handleWheel)
    }
  }, [containerRef, liveTransformRef, config, applyTransform, onTransformEnd])
}

/**
 * State for pinch gesture tracking.
 */
type PinchState = {
  lastDistance: number | null
  isActive: boolean
}

/**
 * Hook for handling pinch-to-zoom touch gestures.
 */
export function usePinchGesture(refs: GestureRefs, config: GestureConfig, callbacks: GestureCallbacks): void {
  const { containerRef, liveTransformRef } = refs
  const { onTransformChange, onTransformEnd, applyTransform } = callbacks

  // Track pinch state
  const pinchStateRef = useRef<PinchState>({ lastDistance: null, isActive: false })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleTouchStart = (event: TouchEvent) => {
      if (isInteractiveElement(event.target)) return

      if (event.touches.length === 2) {
        const touch0 = event.touches[0]
        const touch1 = event.touches[1]
        if (!touch0 || !touch1) return

        pinchStateRef.current.lastDistance = getDistance(touch0, touch1)
        pinchStateRef.current.isActive = true
        event.preventDefault()
        event.stopPropagation()
      }
    }

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 2 || pinchStateRef.current.lastDistance === null) return

      event.preventDefault()
      event.stopPropagation()

      const touch0 = event.touches[0]
      const touch1 = event.touches[1]
      if (!touch0 || !touch1) return

      const currentDistance = getDistance(touch0, touch1)
      if (currentDistance === 0) return

      const distanceRatio = currentDistance / pinchStateRef.current.lastDistance
      pinchStateRef.current.lastDistance = currentDistance

      // Calculate midpoint for zoom origin
      const midpointX = (touch0.clientX + touch1.clientX) / 2
      const midpointY = (touch0.clientY + touch1.clientY) / 2

      const newTransform = zoomToPoint(distanceRatio, midpointX, midpointY, container, liveTransformRef.current, config)

      liveTransformRef.current = newTransform
      applyTransform()

      // Update touch-action
      container.style.touchAction = newTransform.scale > PAN_ENABLED_SCALE_THRESHOLD ? 'none' : 'manipulation'

      onTransformChange(newTransform)
    }

    const handleTouchEnd = (event: TouchEvent) => {
      // Transition from 2 fingers to 1 - just reset pinch state
      if (event.touches.length === 1 && pinchStateRef.current.lastDistance !== null) {
        pinchStateRef.current.lastDistance = null
        return
      }

      if (event.touches.length === 0 && pinchStateRef.current.isActive) {
        pinchStateRef.current.lastDistance = null
        pinchStateRef.current.isActive = false

        // Sync final state
        const transform = liveTransformRef.current
        container.style.touchAction = transform.scale > PAN_ENABLED_SCALE_THRESHOLD ? 'none' : 'manipulation'
        onTransformEnd(transform)
      }
    }

    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd)
    container.addEventListener('touchcancel', handleTouchEnd)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
      container.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [containerRef, liveTransformRef, config, applyTransform, onTransformChange, onTransformEnd])
}

/**
 * State for pan gesture tracking (both touch and mouse).
 */
type PanState = {
  startX: number
  startY: number
  translationX: number
  translationY: number
} | null

/**
 * Hook for handling touch pan gestures (single finger drag when zoomed).
 */
export function useTouchPanGesture(refs: GestureRefs, callbacks: GestureCallbacks): void {
  const { containerRef, liveTransformRef } = refs
  const { onTransformEnd, applyTransform } = callbacks

  const panStateRef = useRef<PanState>(null)
  const isActiveRef = useRef(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleTouchStart = (event: TouchEvent) => {
      if (isInteractiveElement(event.target)) return

      // Only handle single touch for panning
      if (event.touches.length !== 1) return

      const currentScale = liveTransformRef.current.scale
      if (currentScale <= PAN_ENABLED_SCALE_THRESHOLD) return

      const touch = event.touches[0]
      if (!touch) return

      panStateRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        translationX: liveTransformRef.current.x,
        translationY: liveTransformRef.current.y,
      }
      isActiveRef.current = true
      container.style.touchAction = 'none'
      event.preventDefault()
    }

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1 || !panStateRef.current) return

      event.preventDefault()

      const touch = event.touches[0]
      if (!touch) return

      const deltaX = touch.clientX - panStateRef.current.startX
      const deltaY = touch.clientY - panStateRef.current.startY

      const newX = panStateRef.current.translationX + deltaX
      const newY = panStateRef.current.translationY + deltaY

      const containerRect = container.getBoundingClientRect()
      const limits = calculatePanLimits(containerRect, liveTransformRef.current.scale)

      liveTransformRef.current.x = clamp(newX, limits.minX, limits.maxX)
      liveTransformRef.current.y = clamp(newY, limits.minY, limits.maxY)
      applyTransform()
    }

    const handleTouchEnd = (event: TouchEvent) => {
      // When transitioning from pinch (2 fingers) to pan (1 finger)
      if (event.touches.length === 1 && panStateRef.current === null) {
        const currentScale = liveTransformRef.current.scale
        if (currentScale > PAN_ENABLED_SCALE_THRESHOLD) {
          const touch = event.touches[0]
          if (touch) {
            panStateRef.current = {
              startX: touch.clientX,
              startY: touch.clientY,
              translationX: liveTransformRef.current.x,
              translationY: liveTransformRef.current.y,
            }
            isActiveRef.current = true
          }
        }
        return
      }

      if (event.touches.length === 0 && isActiveRef.current) {
        panStateRef.current = null
        isActiveRef.current = false

        const transform = liveTransformRef.current
        container.style.touchAction = transform.scale > PAN_ENABLED_SCALE_THRESHOLD ? 'none' : 'manipulation'
        onTransformEnd(transform)
      }
    }

    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd)
    container.addEventListener('touchcancel', handleTouchEnd)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
      container.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [containerRef, liveTransformRef, applyTransform, onTransformEnd])
}

/**
 * Hook for handling mouse pan gestures (drag when zoomed).
 */
export function useMousePanGesture(refs: GestureRefs, callbacks: GestureCallbacks): void {
  const { containerRef, liveTransformRef } = refs
  const { onTransformEnd, applyTransform } = callbacks

  const panStateRef = useRef<PanState>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleMouseDown = (event: MouseEvent) => {
      // Only left click
      if (event.button !== 0) return
      if (isInteractiveElement(event.target)) return

      const currentScale = liveTransformRef.current.scale
      if (currentScale <= PAN_ENABLED_SCALE_THRESHOLD) return

      panStateRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        translationX: liveTransformRef.current.x,
        translationY: liveTransformRef.current.y,
      }
      container.style.cursor = 'grabbing'
      event.preventDefault()
    }

    const handleMouseMove = (event: MouseEvent) => {
      if (!panStateRef.current) return
      event.preventDefault()

      const deltaX = event.clientX - panStateRef.current.startX
      const deltaY = event.clientY - panStateRef.current.startY

      const newX = panStateRef.current.translationX + deltaX
      const newY = panStateRef.current.translationY + deltaY

      const containerRect = container.getBoundingClientRect()
      const limits = calculatePanLimits(containerRect, liveTransformRef.current.scale)

      liveTransformRef.current.x = clamp(newX, limits.minX, limits.maxX)
      liveTransformRef.current.y = clamp(newY, limits.minY, limits.maxY)
      applyTransform()
    }

    const handleMouseUp = () => {
      if (panStateRef.current) {
        panStateRef.current = null
        container.style.cursor = ''
        onTransformEnd(liveTransformRef.current)
      }
    }

    container.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      container.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [containerRef, liveTransformRef, applyTransform, onTransformEnd])
}

/**
 * Combined hook that composes all gesture behaviors.
 * This is the main hook to use for chart gesture handling.
 */
export function useChartGestures(
  containerRef: React.RefObject<HTMLDivElement | null>,
  contentRef: React.RefObject<HTMLDivElement | null>,
  liveTransformRef: React.MutableRefObject<TransformState>,
  config: GestureConfig,
  setScale: (scale: number) => void,
  setTranslation: (translation: { x: number; y: number }) => void,
): void {
  const refs: GestureRefs = { containerRef, liveTransformRef }

  // Apply transform directly to DOM for smooth 60fps
  const applyTransform = useCallback(() => {
    const content = contentRef.current
    if (!content) return
    const { scale: s, x, y } = liveTransformRef.current
    content.style.transform = `translate(${x}px, ${y}px) scale(${s})`
  }, [contentRef, liveTransformRef])

  // For continuous gestures (pinch), we don't sync state on every frame
  const onTransformChange = useCallback((_transform: TransformState) => {
    // Could be used for live feedback if needed
  }, [])

  // When gesture ends, sync React state
  const onTransformEnd = useCallback(
    (transform: TransformState) => {
      setScale(transform.scale)
      setTranslation({ x: transform.x, y: transform.y })
    },
    [setScale, setTranslation],
  )

  const callbacks: GestureCallbacks = {
    onTransformChange,
    onTransformEnd,
    applyTransform,
  }

  // Compose all gesture behaviors
  useWheelGesture(refs, config, callbacks)
  usePinchGesture(refs, config, callbacks)
  useTouchPanGesture(refs, callbacks)
  useMousePanGesture(refs, callbacks)
}
