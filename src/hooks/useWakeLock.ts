'use client'

import { useRef, useCallback, useEffect } from 'react'
import { clientLogger } from '@/lib/logging/client'

/**
 * Hook to manage Screen Wake Lock API to prevent screen from sleeping
 * during AI generation or other long-running operations.
 *
 * @example
 * const { request, release, isSupported } = useWakeLock()
 *
 * // Start generation
 * await request()
 * try {
 *   await generateAI()
 * } finally {
 *   release()
 * }
 */
export function useWakeLock() {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const releaseHandlerRef = useRef<(() => void) | null>(null)

  const isSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator

  // Cleanup function to remove event listener and release lock
  const cleanup = useCallback(() => {
    if (wakeLockRef.current && releaseHandlerRef.current) {
      wakeLockRef.current.removeEventListener('release', releaseHandlerRef.current)
      releaseHandlerRef.current = null
    }
  }, [])

  const request = useCallback(async () => {
    if (!isSupported) {
      clientLogger.debug('Wake Lock API not supported')
      return false
    }

    try {
      // Clean up any existing listener before releasing old lock
      cleanup()

      // Release any existing lock first
      if (wakeLockRef.current) {
        await wakeLockRef.current.release()
        wakeLockRef.current = null
      }

      wakeLockRef.current = await navigator.wakeLock.request('screen')
      clientLogger.debug('Wake lock acquired')

      // Create and store the release handler
      const handleRelease = () => {
        clientLogger.debug('Wake lock released')
        releaseHandlerRef.current = null
        wakeLockRef.current = null
      }
      releaseHandlerRef.current = handleRelease

      // Handle visibility change - re-acquire lock when tab becomes visible again
      wakeLockRef.current.addEventListener('release', handleRelease)

      return true
    } catch (error) {
      clientLogger.error('Failed to acquire wake lock:', error)
      return false
    }
  }, [isSupported, cleanup])

  const release = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        // Clean up the event listener before releasing
        cleanup()
        await wakeLockRef.current.release()
        wakeLockRef.current = null
        clientLogger.debug('Wake lock released manually')
      } catch (error) {
        clientLogger.error('Failed to release wake lock:', error)
      }
    }
  }, [cleanup])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup()
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {
          // Ignore errors during unmount cleanup
        })
        wakeLockRef.current = null
      }
    }
  }, [cleanup])

  return {
    request,
    release,
    isSupported,
  }
}
