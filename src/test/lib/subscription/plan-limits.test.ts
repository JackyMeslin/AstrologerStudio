/**
 * Unit Tests for Plan Limits
 *
 * Tests subscription plan limits configuration and helper functions.
 *
 * @module src/lib/subscription/plan-limits
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PlanLimits } from '@/lib/subscription/plan-limits'

// Mock Prisma to prevent any real DB queries (safety guard)
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    subject: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    $transaction: vi.fn(),
    $disconnect: vi.fn(),
  },
}))

// Mutable flag to control isDodoPaymentsEnabled behavior
let mockDodoPaymentsEnabled = true

// Mock isDodoPaymentsEnabled with mutable return value
vi.mock('@/lib/subscription/config', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/subscription/config')>()
  return {
    ...original,
    isDodoPaymentsEnabled: () => mockDodoPaymentsEnabled,
  }
})

// Import after mocking
import {
  getPlanLimits,
  canAccessChartType,
  canCreateSubject,
  canGenerateAI,
  getRemainingSubjects,
  getRemainingAIGenerations,
  ALL_CHART_TYPES,
} from '@/lib/subscription/plan-limits'

describe('Plan Limits', () => {
  // Define expected limits for clarity
  const freeLimits: PlanLimits = {
    maxSubjects: 5,
    allowedChartTypes: ['natal'],
    maxAIGenerations: 5,
  }

  const expandedLimits: PlanLimits = {
    maxSubjects: Infinity,
    allowedChartTypes: 'all',
    maxAIGenerations: 20,
  }

  const highLimits: PlanLimits = {
    maxSubjects: Infinity,
    allowedChartTypes: 'all',
    maxAIGenerations: 20,
  }

  const lifetimeLimits: PlanLimits = {
    maxSubjects: Infinity,
    allowedChartTypes: 'all',
    maxAIGenerations: 20,
  }

  describe('with Dodo Payments enabled', () => {
    beforeEach(() => {
      mockDodoPaymentsEnabled = true
    })

    describe('getPlanLimits', () => {
      it.each([
        ['free', freeLimits],
        ['trial', expandedLimits],
        ['pro', highLimits],
        ['lifetime', lifetimeLimits],
        [null, freeLimits],
      ] as const)('should return correct limits for plan "%s"', (plan, expectedLimits) => {
        const result = getPlanLimits(plan)
        expect(result).toEqual(expectedLimits)
      })

      it('should return free limits for undefined plan', () => {
        const result = getPlanLimits(undefined)
        expect(result).toEqual(freeLimits)
      })

      it('should return free limits for invalid plan string', () => {
        const result = getPlanLimits('invalid-plan')
        expect(result).toEqual(freeLimits)
      })
    })

    describe('canAccessChartType', () => {
      describe('free plan', () => {
        it('should allow natal chart', () => {
          expect(canAccessChartType('free', 'natal')).toBe(true)
        })

        it('should not allow synastry chart', () => {
          expect(canAccessChartType('free', 'synastry')).toBe(false)
        })

        it('should not allow composite chart', () => {
          expect(canAccessChartType('free', 'composite')).toBe(false)
        })

        it('should not allow transits chart', () => {
          expect(canAccessChartType('free', 'transits')).toBe(false)
        })

        it('should not allow solar-return chart', () => {
          expect(canAccessChartType('free', 'solar-return')).toBe(false)
        })

        it('should not allow lunar-return chart', () => {
          expect(canAccessChartType('free', 'lunar-return')).toBe(false)
        })

        it('should not allow timeline chart', () => {
          expect(canAccessChartType('free', 'timeline')).toBe(false)
        })
      })

      describe('pro plan', () => {
        it.each(ALL_CHART_TYPES)('should allow %s chart', (chartType) => {
          expect(canAccessChartType('pro', chartType)).toBe(true)
        })
      })

      describe('trial plan', () => {
        it.each(ALL_CHART_TYPES)('should allow %s chart', (chartType) => {
          expect(canAccessChartType('trial', chartType)).toBe(true)
        })
      })

      describe('lifetime plan', () => {
        it.each(ALL_CHART_TYPES)('should allow %s chart', (chartType) => {
          expect(canAccessChartType('lifetime', chartType)).toBe(true)
        })
      })

      describe('null/undefined plan', () => {
        it('should allow natal chart', () => {
          expect(canAccessChartType(null, 'natal')).toBe(true)
        })

        it('should not allow synastry chart', () => {
          expect(canAccessChartType(null, 'synastry')).toBe(false)
        })
      })
    })

    describe('canCreateSubject', () => {
      describe('free plan', () => {
        it('should allow creation when count is zero', () => {
          expect(canCreateSubject('free', 0)).toBe(true)
        })

        it('should allow creation when count is less than 5', () => {
          expect(canCreateSubject('free', 1)).toBe(true)
          expect(canCreateSubject('free', 4)).toBe(true)
        })

        it('should not allow creation when count is 5 or more', () => {
          expect(canCreateSubject('free', 5)).toBe(false)
          expect(canCreateSubject('free', 10)).toBe(false)
          expect(canCreateSubject('free', 100)).toBe(false)
        })
      })

      describe('pro plan', () => {
        it('should always allow creation', () => {
          expect(canCreateSubject('pro', 0)).toBe(true)
          expect(canCreateSubject('pro', 5)).toBe(true)
          expect(canCreateSubject('pro', 100)).toBe(true)
          expect(canCreateSubject('pro', 1000)).toBe(true)
        })
      })

      describe('trial plan', () => {
        it('should always allow creation', () => {
          expect(canCreateSubject('trial', 0)).toBe(true)
          expect(canCreateSubject('trial', 100)).toBe(true)
        })
      })

      describe('lifetime plan', () => {
        it('should always allow creation', () => {
          expect(canCreateSubject('lifetime', 0)).toBe(true)
          expect(canCreateSubject('lifetime', 1000)).toBe(true)
        })
      })

      describe('null plan', () => {
        it('should use free limits', () => {
          expect(canCreateSubject(null, 4)).toBe(true)
          expect(canCreateSubject(null, 5)).toBe(false)
        })
      })
    })

    describe('canGenerateAI', () => {
      describe('free plan', () => {
        it('should allow generation when count is zero', () => {
          expect(canGenerateAI('free', 0)).toBe(true)
        })

        it('should allow generation when count is less than 5', () => {
          expect(canGenerateAI('free', 4)).toBe(true)
        })

        it('should not allow generation when count is 5 or more', () => {
          expect(canGenerateAI('free', 5)).toBe(false)
          expect(canGenerateAI('free', 10)).toBe(false)
        })
      })

      describe('pro plan', () => {
        it('should allow generation when count is zero', () => {
          expect(canGenerateAI('pro', 0)).toBe(true)
        })

        it('should allow generation when count is less than 20', () => {
          expect(canGenerateAI('pro', 19)).toBe(true)
        })

        it('should not allow generation when count is 20 or more', () => {
          expect(canGenerateAI('pro', 20)).toBe(false)
          expect(canGenerateAI('pro', 100)).toBe(false)
        })
      })

      describe('trial plan', () => {
        it('should allow generation when count is less than 20', () => {
          expect(canGenerateAI('trial', 0)).toBe(true)
          expect(canGenerateAI('trial', 19)).toBe(true)
        })

        it('should not allow generation when count is 20 or more', () => {
          expect(canGenerateAI('trial', 20)).toBe(false)
        })
      })

      describe('lifetime plan', () => {
        it('should allow generation when count is less than 20', () => {
          expect(canGenerateAI('lifetime', 0)).toBe(true)
          expect(canGenerateAI('lifetime', 19)).toBe(true)
        })

        it('should not allow generation when count is 20 or more', () => {
          expect(canGenerateAI('lifetime', 20)).toBe(false)
        })
      })

      describe('null plan', () => {
        it('should use free limits', () => {
          expect(canGenerateAI(null, 4)).toBe(true)
          expect(canGenerateAI(null, 5)).toBe(false)
        })
      })
    })

    describe('getRemainingSubjects', () => {
      describe('free plan', () => {
        it('should return max subjects when count is zero', () => {
          expect(getRemainingSubjects('free', 0)).toBe(5)
        })

        it('should return correct remaining when count is below limit', () => {
          expect(getRemainingSubjects('free', 1)).toBe(4)
          expect(getRemainingSubjects('free', 3)).toBe(2)
          expect(getRemainingSubjects('free', 4)).toBe(1)
        })

        it('should return zero when at limit', () => {
          expect(getRemainingSubjects('free', 5)).toBe(0)
        })

        it('should return zero when over limit', () => {
          expect(getRemainingSubjects('free', 10)).toBe(0)
          expect(getRemainingSubjects('free', 100)).toBe(0)
        })
      })

      describe('pro plan', () => {
        it('should return Infinity regardless of count', () => {
          expect(getRemainingSubjects('pro', 0)).toBe(Infinity)
          expect(getRemainingSubjects('pro', 100)).toBe(Infinity)
          expect(getRemainingSubjects('pro', 1000)).toBe(Infinity)
        })
      })

      describe('trial plan', () => {
        it('should return Infinity regardless of count', () => {
          expect(getRemainingSubjects('trial', 0)).toBe(Infinity)
          expect(getRemainingSubjects('trial', 100)).toBe(Infinity)
        })
      })

      describe('lifetime plan', () => {
        it('should return Infinity regardless of count', () => {
          expect(getRemainingSubjects('lifetime', 0)).toBe(Infinity)
          expect(getRemainingSubjects('lifetime', 1000)).toBe(Infinity)
        })
      })

      describe('null/undefined plan', () => {
        it('should use free limits', () => {
          expect(getRemainingSubjects(null, 0)).toBe(5)
          expect(getRemainingSubjects(null, 3)).toBe(2)
          expect(getRemainingSubjects(null, 5)).toBe(0)
          expect(getRemainingSubjects(undefined, 4)).toBe(1)
        })
      })
    })

    describe('getRemainingAIGenerations', () => {
      describe('free plan', () => {
        it('should return max generations when count is zero', () => {
          expect(getRemainingAIGenerations('free', 0)).toBe(5)
        })

        it('should return correct remaining when count is below limit', () => {
          expect(getRemainingAIGenerations('free', 1)).toBe(4)
          expect(getRemainingAIGenerations('free', 3)).toBe(2)
          expect(getRemainingAIGenerations('free', 4)).toBe(1)
        })

        it('should return zero when at limit', () => {
          expect(getRemainingAIGenerations('free', 5)).toBe(0)
        })

        it('should return zero when over limit', () => {
          expect(getRemainingAIGenerations('free', 10)).toBe(0)
          expect(getRemainingAIGenerations('free', 100)).toBe(0)
        })
      })

      describe('pro plan', () => {
        it('should return max generations when count is zero', () => {
          expect(getRemainingAIGenerations('pro', 0)).toBe(20)
        })

        it('should return correct remaining when count is below limit', () => {
          expect(getRemainingAIGenerations('pro', 5)).toBe(15)
          expect(getRemainingAIGenerations('pro', 10)).toBe(10)
          expect(getRemainingAIGenerations('pro', 19)).toBe(1)
        })

        it('should return zero when at limit', () => {
          expect(getRemainingAIGenerations('pro', 20)).toBe(0)
        })

        it('should return zero when over limit', () => {
          expect(getRemainingAIGenerations('pro', 25)).toBe(0)
          expect(getRemainingAIGenerations('pro', 100)).toBe(0)
        })
      })

      describe('trial plan', () => {
        it('should return correct remaining based on 20 limit', () => {
          expect(getRemainingAIGenerations('trial', 0)).toBe(20)
          expect(getRemainingAIGenerations('trial', 10)).toBe(10)
          expect(getRemainingAIGenerations('trial', 20)).toBe(0)
        })
      })

      describe('lifetime plan', () => {
        it('should return correct remaining based on 20 limit', () => {
          expect(getRemainingAIGenerations('lifetime', 0)).toBe(20)
          expect(getRemainingAIGenerations('lifetime', 15)).toBe(5)
          expect(getRemainingAIGenerations('lifetime', 20)).toBe(0)
        })
      })

      describe('null/undefined plan', () => {
        it('should use free limits', () => {
          expect(getRemainingAIGenerations(null, 0)).toBe(5)
          expect(getRemainingAIGenerations(null, 3)).toBe(2)
          expect(getRemainingAIGenerations(null, 5)).toBe(0)
          expect(getRemainingAIGenerations(undefined, 2)).toBe(3)
        })
      })
    })
  })

  describe('with Dodo Payments disabled', () => {
    beforeEach(() => {
      mockDodoPaymentsEnabled = false
    })

    describe('getPlanLimits', () => {
      it('should return lifetime limits for free plan when Dodo Payments disabled', () => {
        const result = getPlanLimits('free')
        expect(result).toEqual(lifetimeLimits)
      })

      it('should return lifetime limits for null plan when Dodo Payments disabled', () => {
        const result = getPlanLimits(null)
        expect(result).toEqual(lifetimeLimits)
      })

      it('should return lifetime limits for undefined plan when Dodo Payments disabled', () => {
        const result = getPlanLimits(undefined)
        expect(result).toEqual(lifetimeLimits)
      })

      it('should return lifetime limits for invalid plan when Dodo Payments disabled', () => {
        const result = getPlanLimits('invalid-plan')
        expect(result).toEqual(lifetimeLimits)
      })

      it('should return lifetime limits for pro plan when Dodo Payments disabled', () => {
        const result = getPlanLimits('pro')
        expect(result).toEqual(lifetimeLimits)
      })
    })

    describe('canAccessChartType', () => {
      it('should allow all chart types for free plan when Dodo Payments disabled', () => {
        ALL_CHART_TYPES.forEach((chartType) => {
          expect(canAccessChartType('free', chartType)).toBe(true)
        })
      })

      it('should allow all chart types for null plan when Dodo Payments disabled', () => {
        ALL_CHART_TYPES.forEach((chartType) => {
          expect(canAccessChartType(null, chartType)).toBe(true)
        })
      })

      it('should allow synastry for free plan when Dodo Payments disabled', () => {
        expect(canAccessChartType('free', 'synastry')).toBe(true)
      })

      it('should allow composite for free plan when Dodo Payments disabled', () => {
        expect(canAccessChartType('free', 'composite')).toBe(true)
      })
    })

    describe('canCreateSubject', () => {
      it('should always allow subject creation for free plan when Dodo Payments disabled', () => {
        expect(canCreateSubject('free', 0)).toBe(true)
        expect(canCreateSubject('free', 5)).toBe(true)
        expect(canCreateSubject('free', 100)).toBe(true)
        expect(canCreateSubject('free', 1000)).toBe(true)
      })

      it('should always allow subject creation for null plan when Dodo Payments disabled', () => {
        expect(canCreateSubject(null, 100)).toBe(true)
      })
    })

    describe('canGenerateAI', () => {
      it('should use lifetime limits for free plan when Dodo Payments disabled', () => {
        expect(canGenerateAI('free', 0)).toBe(true)
        expect(canGenerateAI('free', 19)).toBe(true)
        expect(canGenerateAI('free', 20)).toBe(false)
      })

      it('should use lifetime limits for null plan when Dodo Payments disabled', () => {
        expect(canGenerateAI(null, 0)).toBe(true)
        expect(canGenerateAI(null, 19)).toBe(true)
        expect(canGenerateAI(null, 20)).toBe(false)
      })
    })

    describe('getRemainingSubjects', () => {
      it('should return Infinity for free plan when Dodo Payments disabled', () => {
        expect(getRemainingSubjects('free', 0)).toBe(Infinity)
        expect(getRemainingSubjects('free', 100)).toBe(Infinity)
      })

      it('should return Infinity for null plan when Dodo Payments disabled', () => {
        expect(getRemainingSubjects(null, 50)).toBe(Infinity)
      })
    })

    describe('getRemainingAIGenerations', () => {
      it('should use lifetime limits for free plan when Dodo Payments disabled', () => {
        expect(getRemainingAIGenerations('free', 0)).toBe(20)
        expect(getRemainingAIGenerations('free', 10)).toBe(10)
        expect(getRemainingAIGenerations('free', 20)).toBe(0)
      })

      it('should use lifetime limits for null plan when Dodo Payments disabled', () => {
        expect(getRemainingAIGenerations(null, 5)).toBe(15)
      })
    })
  })
})
