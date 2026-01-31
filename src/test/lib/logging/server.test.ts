/**
 * Unit Tests for Server-Side Logger
 *
 * Tests the logger utility that provides level-based logging
 * for server environments with automatic sensitive data redaction.
 *
 * @module src/lib/logging/server
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the redaction module
vi.mock('@/lib/logging/redaction', () => ({
  redactSensitive: vi.fn((arg) => {
    // Simple mock that marks passwords as redacted
    if (typeof arg === 'object' && arg !== null && 'password' in arg) {
      return { ...arg, password: '[REDACTED]' }
    }
    return arg
  }),
}))

// Mock the notifier module
vi.mock('@/lib/logging/notifier', () => ({
  notify: vi.fn(),
}))

describe('logger', () => {
  // Console/stdout spies
  let stdoutWriteSpy: ReturnType<typeof vi.spyOn>
  let warnSpy: ReturnType<typeof vi.spyOn>
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // Reset module cache to get fresh logger with updated env
    vi.resetModules()

    // Setup spies
    stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    // Restore environment
    vi.unstubAllEnvs()

    // Restore spies
    stdoutWriteSpy.mockRestore()
    warnSpy.mockRestore()
    errorSpy.mockRestore()
  })

  describe('log level filtering in development', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development')
    })

    it('should log debug messages when level is debug', async () => {
      vi.stubEnv('NEXT_PUBLIC_LOG_LEVEL', 'debug')
      const { logger } = await import('@/lib/logging/server')

      logger.debug('debug message')
      expect(stdoutWriteSpy).toHaveBeenCalledWith(expect.stringContaining('[DEBUG] debug message'))
    })

    it('should log info messages when level is info', async () => {
      vi.stubEnv('NEXT_PUBLIC_LOG_LEVEL', 'info')
      const { logger } = await import('@/lib/logging/server')

      logger.info('info message')
      expect(stdoutWriteSpy).toHaveBeenCalledWith(expect.stringContaining('[INFO] info message'))
    })

    it('should log warn messages when level is warn', async () => {
      vi.stubEnv('NEXT_PUBLIC_LOG_LEVEL', 'warn')
      const { logger } = await import('@/lib/logging/server')

      logger.warn('warn message')
      expect(warnSpy).toHaveBeenCalledWith('[WARN] warn message')
    })

    it('should log error messages when level is error', async () => {
      vi.stubEnv('NEXT_PUBLIC_LOG_LEVEL', 'error')
      const { logger } = await import('@/lib/logging/server')

      logger.error('error message')
      expect(errorSpy).toHaveBeenCalledWith('[ERROR] error message')
    })
  })

  describe('log level hierarchy', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development')
    })

    it('should not log debug when level is info', async () => {
      vi.stubEnv('NEXT_PUBLIC_LOG_LEVEL', 'info')
      const { logger } = await import('@/lib/logging/server')

      logger.debug('should not appear')
      expect(stdoutWriteSpy).not.toHaveBeenCalled()
    })

    it('should not log debug or info when level is warn', async () => {
      vi.stubEnv('NEXT_PUBLIC_LOG_LEVEL', 'warn')
      const { logger } = await import('@/lib/logging/server')

      logger.debug('should not appear')
      logger.info('should not appear')

      expect(stdoutWriteSpy).not.toHaveBeenCalled()
    })

    it('should not log anything when level is silent', async () => {
      vi.stubEnv('NEXT_PUBLIC_LOG_LEVEL', 'silent')
      const { logger } = await import('@/lib/logging/server')

      logger.debug('silent')
      logger.info('silent')
      logger.warn('silent')
      logger.error('silent')

      expect(stdoutWriteSpy).not.toHaveBeenCalled()
      expect(warnSpy).not.toHaveBeenCalled()
      expect(errorSpy).not.toHaveBeenCalled()
    })
  })

  describe('production defaults', () => {
    it('should default to warn level in production', async () => {
      vi.stubEnv('NODE_ENV', 'production')
      const { logger } = await import('@/lib/logging/server')

      // Debug and info should not appear
      logger.debug('debug')
      logger.info('info')
      expect(stdoutWriteSpy).not.toHaveBeenCalled()

      // Warn should appear
      logger.warn('warn')
      expect(warnSpy).toHaveBeenCalledWith('[WARN] warn')
    })

    it('should use LOG_LEVEL env var in production', async () => {
      vi.stubEnv('NODE_ENV', 'production')
      vi.stubEnv('LOG_LEVEL', 'debug')
      const { logger } = await import('@/lib/logging/server')

      logger.debug('debug in production')
      expect(stdoutWriteSpy).toHaveBeenCalledWith(expect.stringContaining('[DEBUG] debug in production'))
    })
  })

  describe('sensitive data redaction', () => {
    it('should redact sensitive fields in logged objects', async () => {
      vi.stubEnv('NODE_ENV', 'development')
      vi.stubEnv('NEXT_PUBLIC_LOG_LEVEL', 'debug')
      const { logger } = await import('@/lib/logging/server')

      logger.debug('user data', { password: 'secret123', username: 'john' })

      // Verify that the output contains [REDACTED] for password
      expect(stdoutWriteSpy).toHaveBeenCalledWith(expect.stringContaining('[REDACTED]'))
    })
  })

  describe('getLevel', () => {
    it('should return the current log level', async () => {
      vi.stubEnv('NODE_ENV', 'development')
      vi.stubEnv('NEXT_PUBLIC_LOG_LEVEL', 'info')
      const { logger } = await import('@/lib/logging/server')

      expect(logger.getLevel()).toBe('info')
    })
  })
})
