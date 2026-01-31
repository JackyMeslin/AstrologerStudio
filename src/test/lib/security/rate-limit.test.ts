/**
 * Unit Tests for Rate Limiting and Account Lockout
 *
 * Tests rate limiting functions, account lockout protection,
 * and IP extraction utilities.
 *
 * @module src/lib/security/rate-limit
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  checkRateLimit,
  checkAccountLockout,
  recordFailedLogin,
  clearFailedLogins,
  getClientIp,
  rateLimitHeaders,
  rateLimitExceededResponse,
  RATE_LIMITS,
  stopCleanup,
  _getCleanupState,
  _clearRateLimitStore,
} from '@/lib/security/rate-limit'

describe('Rate Limiting', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('checkRateLimit', () => {
    const config = { limit: 5, windowSeconds: 60 }

    it.each([
      ['prima richiesta', 1, { success: true, remaining: 4 }],
      ['quinta richiesta', 5, { success: true, remaining: 0 }],
      ['sesta richiesta', 6, { success: false, remaining: 0 }],
    ] as const)('%s (request %d) should return success=%s, remaining=%d', (_, requestCount, expected) => {
      // Use unique identifier for each test case
      const identifier = `test-user-${requestCount}-${Date.now()}`

      let result = { success: false, remaining: 0, resetTime: 0 }
      for (let i = 0; i < requestCount; i++) {
        result = checkRateLimit(identifier, config)
      }

      expect(result.success).toBe(expected.success)
      expect(result.remaining).toBe(expected.remaining)
    })

    it('should allow requests again after window expires', () => {
      const identifier = `test-window-reset-${Date.now()}`

      // Make 6 requests (exceeds limit of 5)
      for (let i = 0; i < 6; i++) {
        checkRateLimit(identifier, config)
      }

      // Verify 6th request was blocked
      const blockedResult = checkRateLimit(identifier, config)
      expect(blockedResult.success).toBe(false)

      // Advance time past the window (60 seconds + 100ms buffer)
      vi.advanceTimersByTime(60 * 1000 + 100)

      // Next request should succeed
      const newResult = checkRateLimit(identifier, config)
      expect(newResult.success).toBe(true)
      expect(newResult.remaining).toBe(4)
    })

    it('should maintain separate counters for different identifiers', () => {
      const user1 = `user1-${Date.now()}`
      const user2 = `user2-${Date.now()}`

      // User 1 makes 5 requests (reaches limit)
      for (let i = 0; i < 5; i++) {
        checkRateLimit(user1, config)
      }

      // User 1 should be at limit
      const user1Result = checkRateLimit(user1, config)
      expect(user1Result.success).toBe(false)
      expect(user1Result.remaining).toBe(0)

      // User 2 should have full quota
      const user2Result = checkRateLimit(user2, config)
      expect(user2Result.success).toBe(true)
      expect(user2Result.remaining).toBe(4)
    })
  })

  describe('RATE_LIMITS', () => {
    it('should have standard preset', () => {
      expect(RATE_LIMITS.standard).toEqual({
        limit: 100,
        windowSeconds: 60,
        prefix: 'api',
      })
    })

    it('should have strict preset', () => {
      expect(RATE_LIMITS.strict).toEqual({
        limit: 20,
        windowSeconds: 60,
        prefix: 'strict',
      })
    })

    it('should have auth preset', () => {
      expect(RATE_LIMITS.auth).toEqual({
        limit: 10,
        windowSeconds: 60,
        prefix: 'auth',
      })
    })
  })

  describe('checkAccountLockout', () => {
    it('should return locked: false for new user', () => {
      const result = checkAccountLockout(`newuser-${Date.now()}`)
      expect(result).toEqual({ locked: false })
    })

    it('should return locked: false after 4 failed login attempts', () => {
      const username = `locktest-4-${Date.now()}`

      // Record 4 failed attempts
      for (let i = 0; i < 4; i++) {
        recordFailedLogin(username)
      }

      const result = checkAccountLockout(username)
      expect(result.locked).toBe(false)
    })

    it('should return locked: true with remainingSeconds between 890-910 after 5 failed attempts', () => {
      const username = `locktest-5-${Date.now()}`

      // Record 5 failed attempts
      for (let i = 0; i < 5; i++) {
        recordFailedLogin(username)
      }

      const result = checkAccountLockout(username)
      expect(result.locked).toBe(true)
      expect(result.remainingSeconds).toBeDefined()
      expect(result.remainingSeconds).toBeGreaterThanOrEqual(890)
      expect(result.remainingSeconds).toBeLessThanOrEqual(910)
    })

    it('should unlock after lockout duration expires (15 minutes)', () => {
      const username = `locktest-unlock-${Date.now()}`

      // Record 5 failed attempts to trigger lockout
      for (let i = 0; i < 5; i++) {
        recordFailedLogin(username)
      }

      // Verify locked
      const lockedResult = checkAccountLockout(username)
      expect(lockedResult.locked).toBe(true)

      // Advance time past lockout duration (15 minutes + 100ms buffer)
      vi.advanceTimersByTime(15 * 60 * 1000 + 100)

      // Should be unlocked now
      const unlockedResult = checkAccountLockout(username)
      expect(unlockedResult.locked).toBe(false)
    })

    it('should reset immediately when clearFailedLogins is called', () => {
      const username = `locktest-clear-${Date.now()}`

      // Record 5 failed attempts to trigger lockout
      for (let i = 0; i < 5; i++) {
        recordFailedLogin(username)
      }

      // Verify locked
      const lockedResult = checkAccountLockout(username)
      expect(lockedResult.locked).toBe(true)

      // Clear failed logins
      clearFailedLogins(username)

      // Should be unlocked immediately
      const clearedResult = checkAccountLockout(username)
      expect(clearedResult.locked).toBe(false)
    })
  })

  describe('getClientIp', () => {
    it.each([
      [new Headers({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }), '1.2.3.4'],
      [new Headers({ 'x-real-ip': '10.0.0.1' }), '10.0.0.1'],
      [new Headers({}), 'unknown'],
    ] as const)('should extract correct IP from headers', (headers, expectedIp) => {
      const result = getClientIp(headers)
      expect(result).toBe(expectedIp)
    })

    it('should prefer x-forwarded-for over x-real-ip', () => {
      const headers = new Headers({
        'x-forwarded-for': '1.1.1.1',
        'x-real-ip': '2.2.2.2',
      })

      const result = getClientIp(headers)
      expect(result).toBe('1.1.1.1')
    })

    it('should trim whitespace from IP addresses', () => {
      const headers = new Headers({
        'x-forwarded-for': '  3.3.3.3  , 4.4.4.4',
      })

      const result = getClientIp(headers)
      expect(result).toBe('3.3.3.3')
    })

    it('should return "unknown" when x-forwarded-for first IP is empty', () => {
      const headers = new Headers({
        'x-forwarded-for': ', 5.6.7.8',
      })

      const result = getClientIp(headers)
      expect(result).toBe('unknown')
    })

    it('should trim whitespace from x-real-ip header', () => {
      const headers = new Headers({
        'x-real-ip': '  10.0.0.1  ',
      })

      const result = getClientIp(headers)
      expect(result).toBe('10.0.0.1')
    })
  })

  describe('checkRateLimit with prefix (key derivation)', () => {
    it('should maintain separate counters for different prefixes with same identifier', () => {
      const identifier = `user-prefix-test-${Date.now()}`

      // Make 5 requests with prefix 'api'
      for (let i = 0; i < 5; i++) {
        checkRateLimit(identifier, { limit: 5, windowSeconds: 60, prefix: 'api' })
      }

      // User with 'api' prefix should be at limit
      const apiResult = checkRateLimit(identifier, { limit: 5, windowSeconds: 60, prefix: 'api' })
      expect(apiResult.success).toBe(false)

      // Same user with 'ai' prefix should have full quota
      const aiResult = checkRateLimit(identifier, { limit: 5, windowSeconds: 60, prefix: 'ai' })
      expect(aiResult.success).toBe(true)
      expect(aiResult.remaining).toBe(4)
    })

    it('should use default prefix when not provided', () => {
      const identifier = `user-default-prefix-${Date.now()}`

      // Calls without prefix should work
      const result1 = checkRateLimit(identifier, { limit: 5, windowSeconds: 60 })
      expect(result1.success).toBe(true)

      // Another call without prefix should share the same counter
      const result2 = checkRateLimit(identifier, { limit: 5, windowSeconds: 60 })
      expect(result2.remaining).toBe(3) // 5 - 2 = 3
    })
  })

  describe('rateLimitHeaders', () => {
    it('should return correct rate limit headers', () => {
      const result = {
        success: true,
        remaining: 95,
        resetTime: 1700000060000, // mock timestamp
      }
      const limit = 100

      const headers = rateLimitHeaders(result, limit)

      expect(headers).toEqual({
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '95',
        'X-RateLimit-Reset': '1700000060',
      })
    })

    it('should handle zero remaining correctly', () => {
      const result = {
        success: false,
        remaining: 0,
        resetTime: 1700000120000,
      }
      const limit = 10

      const headers = rateLimitHeaders(result, limit)

      expect(headers).toEqual({
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': '1700000120',
      })
    })
  })

  describe('rateLimitExceededResponse', () => {
    it('should return a 429 response with correct headers and body', async () => {
      const now = Date.now()
      const result = {
        success: false,
        remaining: 0,
        resetTime: now + 30000, // 30 seconds from now
      }
      const limit = 10

      const response = rateLimitExceededResponse(result, limit)

      expect(response.status).toBe(429)
      expect(response.headers.get('X-RateLimit-Limit')).toBe('10')
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')

      const body = await response.json()
      expect(body.error).toBe('Too many requests')
      expect(body.message).toBe('Rate limit exceeded. Please try again later.')
      expect(body.retryAfter).toBeGreaterThanOrEqual(29)
      expect(body.retryAfter).toBeLessThanOrEqual(31)
    })
  })

  describe('recordFailedLogin with window expiration', () => {
    it('should start a new tracking window when previous window expired', () => {
      const username = `failed-window-reset-${Date.now()}`

      // Record 3 failed attempts
      recordFailedLogin(username)
      recordFailedLogin(username)
      recordFailedLogin(username)

      // Advance time past the attempt window (15 minutes + buffer)
      vi.advanceTimersByTime(15 * 60 * 1000 + 100)

      // Record a new failed login - should start fresh
      recordFailedLogin(username)

      // Should not be locked (only 1 failed attempt in new window)
      const result = checkAccountLockout(username)
      expect(result.locked).toBe(false)
    })
  })

  describe('checkAccountLockout with attempt window expiration', () => {
    it('should reset and return unlocked when attempt window has passed', () => {
      const username = `lockout-window-expire-${Date.now()}`

      // Record 4 failed attempts (not enough to trigger lockout)
      for (let i = 0; i < 4; i++) {
        recordFailedLogin(username)
      }

      // Verify not locked yet
      let result = checkAccountLockout(username)
      expect(result.locked).toBe(false)

      // Advance time past the attempt window (15 minutes + buffer)
      vi.advanceTimersByTime(15 * 60 * 1000 + 100)

      // Check lockout - should reset and return unlocked
      result = checkAccountLockout(username)
      expect(result.locked).toBe(false)

      // Now record new attempts - should start fresh
      recordFailedLogin(username)
      result = checkAccountLockout(username)
      expect(result.locked).toBe(false)
    })

    it('should handle lockout that expires and then attempt window expires', () => {
      const username = `lockout-then-window-${Date.now()}`

      // Trigger lockout with 5 failed attempts
      for (let i = 0; i < 5; i++) {
        recordFailedLogin(username)
      }
      checkAccountLockout(username) // This sets lockedUntil

      // Verify locked
      let result = checkAccountLockout(username)
      expect(result.locked).toBe(true)

      // Advance time past lockout (15 min) but still within attempt window
      // Since both are 15 min, advance past both
      vi.advanceTimersByTime(15 * 60 * 1000 + 100)

      // Should be unlocked (lockout expired)
      result = checkAccountLockout(username)
      expect(result.locked).toBe(false)
    })
  })

  describe('in-memory store cleanup', () => {
    it('should cleanup expired entries after cleanup interval (60s)', () => {
      const identifier = `cleanup-test-${Date.now()}`
      const config = { limit: 5, windowSeconds: 10, prefix: 'cleanup' }

      // Create an entry with a 10-second window
      checkRateLimit(identifier, config)

      // Advance time past the window (entry should be expired)
      vi.advanceTimersByTime(10 * 1000 + 100)

      // Advance time to trigger cleanup interval (60 seconds total)
      vi.advanceTimersByTime(60 * 1000)

      // After cleanup, requesting again should give a fresh count
      const result = checkRateLimit(identifier, config)
      expect(result.success).toBe(true)
      expect(result.remaining).toBe(4) // Fresh entry
    })

    it('should execute cleanup callback and delete expired entries from store', () => {
      // Use _clearRateLimitStore to get clean state
      _clearRateLimitStore()

      const identifier = `cleanup-callback-test-${Date.now()}`
      const config = { limit: 5, windowSeconds: 5, prefix: 'callback-test' }

      // Create an entry with short expiration
      checkRateLimit(identifier, config)

      // Make the entry expire
      vi.advanceTimersByTime(5 * 1000 + 100)

      // Advance past cleanup interval (60s) to trigger the cleanup callback
      vi.advanceTimersByTime(60 * 1000)

      // After cleanup, new request should be fresh (count reset)
      const result = checkRateLimit(identifier, config)
      expect(result.success).toBe(true)
      expect(result.remaining).toBe(4) // Fresh entry, limit-1
    })

    it('should not delete entries that have not expired yet', () => {
      _clearRateLimitStore()

      const identifier = `cleanup-keep-test-${Date.now()}`
      const config = { limit: 5, windowSeconds: 120, prefix: 'keep-test' } // 2 minute window

      // Create an entry and use 3 of the limit
      checkRateLimit(identifier, config)
      checkRateLimit(identifier, config)
      checkRateLimit(identifier, config)

      // Advance past cleanup interval but NOT past the entry's window
      vi.advanceTimersByTime(60 * 1000)

      // Entry should still exist with its count
      const result = checkRateLimit(identifier, config)
      expect(result.success).toBe(true)
      expect(result.remaining).toBe(1) // 5 - 4 = 1 (3 + 1 new = 4 requests)
    })
  })

  describe('lazy cleanup lifecycle', () => {
    beforeEach(() => {
      // Clear the store and stop cleanup before each test
      _clearRateLimitStore()
    })

    afterEach(() => {
      // Ensure cleanup is stopped after each test
      stopCleanup()
    })

    it('should not start cleanup timer until first rate limit entry is created', () => {
      // Initially, no timer should be running
      const initialState = _getCleanupState()
      expect(initialState.timerActive).toBe(false)
      expect(initialState.storeSize).toBe(0)
    })

    it('should start cleanup timer lazily on first checkRateLimit call', () => {
      // Verify timer is not active initially
      expect(_getCleanupState().timerActive).toBe(false)

      // Make a rate limit check
      const identifier = `lazy-start-${Date.now()}`
      checkRateLimit(identifier, { limit: 5, windowSeconds: 60 })

      // Timer should now be active
      const stateAfter = _getCleanupState()
      expect(stateAfter.timerActive).toBe(true)
      expect(stateAfter.storeSize).toBe(1)
    })

    it('should stop cleanup timer when store becomes empty after cleanup', () => {
      const identifier = `auto-stop-${Date.now()}`
      const config = { limit: 5, windowSeconds: 5, prefix: 'auto-stop' }

      // Create an entry with short window
      checkRateLimit(identifier, config)
      expect(_getCleanupState().timerActive).toBe(true)

      // Advance time past the window so entry expires
      vi.advanceTimersByTime(5 * 1000 + 100)

      // Trigger cleanup interval
      vi.advanceTimersByTime(60 * 1000)

      // Timer should have stopped because store is empty
      expect(_getCleanupState().timerActive).toBe(false)
      expect(_getCleanupState().storeSize).toBe(0)
    })

    it('should restart timer when new entry is added after auto-stop', () => {
      const identifier1 = `restart-test-1-${Date.now()}`
      const identifier2 = `restart-test-2-${Date.now()}`
      const config = { limit: 5, windowSeconds: 5, prefix: 'restart' }

      // Create first entry
      checkRateLimit(identifier1, config)
      expect(_getCleanupState().timerActive).toBe(true)

      // Let it expire and trigger cleanup
      vi.advanceTimersByTime(5 * 1000 + 100)
      vi.advanceTimersByTime(60 * 1000)

      // Timer should have stopped
      expect(_getCleanupState().timerActive).toBe(false)

      // Add a new entry - timer should restart
      checkRateLimit(identifier2, config)
      expect(_getCleanupState().timerActive).toBe(true)
      expect(_getCleanupState().storeSize).toBe(1)
    })

    it('should allow explicit stopCleanup() call', () => {
      const identifier = `explicit-stop-${Date.now()}`
      checkRateLimit(identifier, { limit: 5, windowSeconds: 60 })

      expect(_getCleanupState().timerActive).toBe(true)

      // Explicitly stop cleanup
      stopCleanup()

      expect(_getCleanupState().timerActive).toBe(false)
      // Store should still have the entry
      expect(_getCleanupState().storeSize).toBe(1)
    })

    it('should handle _clearRateLimitStore() correctly', () => {
      const identifier = `clear-store-${Date.now()}`
      checkRateLimit(identifier, { limit: 5, windowSeconds: 60 })

      expect(_getCleanupState().storeSize).toBe(1)
      expect(_getCleanupState().timerActive).toBe(true)

      // Clear store
      _clearRateLimitStore()

      expect(_getCleanupState().storeSize).toBe(0)
      expect(_getCleanupState().timerActive).toBe(false)
    })

    it('should not start multiple timers for multiple entries', () => {
      const config = { limit: 5, windowSeconds: 60 }

      // Add multiple entries
      checkRateLimit(`multi-1-${Date.now()}`, config)
      checkRateLimit(`multi-2-${Date.now()}`, config)
      checkRateLimit(`multi-3-${Date.now()}`, config)

      // Should only have one timer active
      expect(_getCleanupState().timerActive).toBe(true)
      expect(_getCleanupState().storeSize).toBe(3)
    })
  })
})
