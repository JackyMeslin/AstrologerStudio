/**
 * Unit Tests for Subscription Config
 *
 * Tests the isDodoPaymentsEnabled function which checks
 * environment variables for Dodo Payments feature flag.
 *
 * @module src/lib/subscription/config
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('Subscription Config', () => {
  let originalEnv: string | undefined

  beforeEach(() => {
    originalEnv = process.env.NEXT_PUBLIC_ENABLE_DODO_PAYMENTS
    vi.resetModules()
  })

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.NEXT_PUBLIC_ENABLE_DODO_PAYMENTS = originalEnv
    } else {
      delete process.env.NEXT_PUBLIC_ENABLE_DODO_PAYMENTS
    }
  })

  describe('isDodoPaymentsEnabled', () => {
    it('should return true when NEXT_PUBLIC_ENABLE_DODO_PAYMENTS is "true"', async () => {
      process.env.NEXT_PUBLIC_ENABLE_DODO_PAYMENTS = 'true'
      vi.resetModules()

      const { isDodoPaymentsEnabled } = await import('@/lib/subscription/config')

      expect(isDodoPaymentsEnabled()).toBe(true)
    })

    it('should return false when NEXT_PUBLIC_ENABLE_DODO_PAYMENTS is "false"', async () => {
      process.env.NEXT_PUBLIC_ENABLE_DODO_PAYMENTS = 'false'
      vi.resetModules()

      const { isDodoPaymentsEnabled } = await import('@/lib/subscription/config')

      expect(isDodoPaymentsEnabled()).toBe(false)
    })

    it('should return false when NEXT_PUBLIC_ENABLE_DODO_PAYMENTS is undefined', async () => {
      delete process.env.NEXT_PUBLIC_ENABLE_DODO_PAYMENTS
      vi.resetModules()

      const { isDodoPaymentsEnabled } = await import('@/lib/subscription/config')

      expect(isDodoPaymentsEnabled()).toBe(false)
    })

    it('should return false when NEXT_PUBLIC_ENABLE_DODO_PAYMENTS is empty string', async () => {
      process.env.NEXT_PUBLIC_ENABLE_DODO_PAYMENTS = ''
      vi.resetModules()

      const { isDodoPaymentsEnabled } = await import('@/lib/subscription/config')

      expect(isDodoPaymentsEnabled()).toBe(false)
    })

    it('should return false when NEXT_PUBLIC_ENABLE_DODO_PAYMENTS is "TRUE" (case-sensitive)', async () => {
      process.env.NEXT_PUBLIC_ENABLE_DODO_PAYMENTS = 'TRUE'
      vi.resetModules()

      const { isDodoPaymentsEnabled } = await import('@/lib/subscription/config')

      expect(isDodoPaymentsEnabled()).toBe(false)
    })

    it('should return false when NEXT_PUBLIC_ENABLE_DODO_PAYMENTS is "1"', async () => {
      process.env.NEXT_PUBLIC_ENABLE_DODO_PAYMENTS = '1'
      vi.resetModules()

      const { isDodoPaymentsEnabled } = await import('@/lib/subscription/config')

      expect(isDodoPaymentsEnabled()).toBe(false)
    })
  })

  describe('SubscriptionPlan type', () => {
    it('should export SubscriptionPlan type', async () => {
      const _configModule = await import('@/lib/subscription/config')

      // Type check - this ensures the type is exported
      const plan: import('@/lib/subscription/config').SubscriptionPlan = 'free'
      expect(['free', 'trial', 'pro', 'lifetime']).toContain(plan)
    })
  })
})
