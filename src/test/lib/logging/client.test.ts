/**
 * Unit Tests for Client-Side Logger
 *
 * Tests the clientLogger utility that provides level-based logging
 * for browser environments with log level filtering.
 *
 * @module src/lib/logging/client
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('clientLogger', () => {
  // Console spies
  let warnSpy: ReturnType<typeof vi.spyOn>
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Reset module cache to get fresh logger with updated env
    vi.resetModules()

    // Setup console spies
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    // Restore environment
    vi.unstubAllEnvs()

    // Restore console
    warnSpy.mockRestore()
    errorSpy.mockRestore()
  })

  describe('log level filtering in development', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development')
    })

    it('should log debug messages when level is debug', async () => {
      vi.stubEnv('NEXT_PUBLIC_LOG_LEVEL', 'debug')
      const { clientLogger } = await import('@/lib/logging/client')

      clientLogger.debug('debug message')
      expect(warnSpy).toHaveBeenCalledWith('[DEBUG] debug message')
    })

    it('should log info messages when level is info', async () => {
      vi.stubEnv('NEXT_PUBLIC_LOG_LEVEL', 'info')
      const { clientLogger } = await import('@/lib/logging/client')

      clientLogger.info('info message')
      expect(warnSpy).toHaveBeenCalledWith('[INFO] info message')
    })

    it('should log warn messages when level is warn', async () => {
      vi.stubEnv('NEXT_PUBLIC_LOG_LEVEL', 'warn')
      const { clientLogger } = await import('@/lib/logging/client')

      clientLogger.warn('warn message')
      expect(warnSpy).toHaveBeenCalledWith('[WARN] warn message')
    })

    it('should log error messages when level is error', async () => {
      vi.stubEnv('NEXT_PUBLIC_LOG_LEVEL', 'error')
      const { clientLogger } = await import('@/lib/logging/client')

      clientLogger.error('error message')
      expect(errorSpy).toHaveBeenCalledWith('[ERROR] error message')
    })
  })

  describe('log level hierarchy', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development')
    })

    it('should not log debug when level is info', async () => {
      vi.stubEnv('NEXT_PUBLIC_LOG_LEVEL', 'info')
      const { clientLogger } = await import('@/lib/logging/client')

      clientLogger.debug('should not appear')
      expect(warnSpy).not.toHaveBeenCalled()
    })

    it('should not log debug or info when level is warn', async () => {
      vi.stubEnv('NEXT_PUBLIC_LOG_LEVEL', 'warn')
      const { clientLogger } = await import('@/lib/logging/client')

      clientLogger.debug('should not appear')
      clientLogger.info('should not appear')

      // Only 0 calls for debug/info (warn spy not called by them)
      expect(warnSpy).not.toHaveBeenCalled()
    })

    it('should not log anything when level is silent', async () => {
      vi.stubEnv('NEXT_PUBLIC_LOG_LEVEL', 'silent')
      const { clientLogger } = await import('@/lib/logging/client')

      clientLogger.debug('silent')
      clientLogger.info('silent')
      clientLogger.warn('silent')
      clientLogger.error('silent')

      expect(warnSpy).not.toHaveBeenCalled()
      expect(errorSpy).not.toHaveBeenCalled()
    })
  })

  describe('production defaults', () => {
    it('should default to warn level in production', async () => {
      vi.stubEnv('NODE_ENV', 'production')
      const { clientLogger } = await import('@/lib/logging/client')

      // Debug and info should not appear
      clientLogger.debug('debug')
      clientLogger.info('info')

      // Warn and error should appear
      clientLogger.warn('warn')
      expect(warnSpy).toHaveBeenCalledWith('[WARN] warn')
    })
  })

  describe('additional arguments', () => {
    it('should pass additional arguments to console', async () => {
      vi.stubEnv('NODE_ENV', 'development')
      vi.stubEnv('NEXT_PUBLIC_LOG_LEVEL', 'debug')
      const { clientLogger } = await import('@/lib/logging/client')

      const extraArg = { key: 'value' }
      clientLogger.debug('message with args', extraArg)
      expect(warnSpy).toHaveBeenCalledWith('[DEBUG] message with args', extraArg)
    })
  })

  describe('getLevel', () => {
    it('should return the current log level', async () => {
      vi.stubEnv('NODE_ENV', 'development')
      vi.stubEnv('NEXT_PUBLIC_LOG_LEVEL', 'warn')
      const { clientLogger } = await import('@/lib/logging/client')

      expect(clientLogger.getLevel()).toBe('warn')
    })
  })
})
